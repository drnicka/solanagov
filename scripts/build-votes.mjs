#!/usr/bin/env node
// Bakes data/votes.json: for each of the three live SGP proposals on the validator
// governance program, the validator votes (tick/cross/abstain) and the staker
// overrides (with dissent flagged where a staker voted against their validator).
//
// One RPC caller (this script / the Action) so visitors read a static same-origin
// file. Name resolution happens here — off the public page — so the Helius key
// never ships. Run locally with SIGNERS_RPC_URL or HELIUS_RPC_URL; the Action
// supplies its own endpoint. Zero dependencies.
//
// On-chain model (program govYkyQ3ePtGULAtY6V75qjWE8UH4vCUVQ1W4HdCAZU):
//   Vote  PDA ["vote", proposal, vote_account]         — validator.field = NODE IDENTITY
//   VoteOverride PDA ["vote_override", proposal, stake, votePda] — .validator = VOTE ACCOUNT
// Direction is basis points (10000 = 100%) across for/against/abstain.

import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const RPC = process.env.SIGNERS_RPC_URL || process.env.HELIUS_RPC_URL || (() => {
  try {
    const env = Object.fromEntries(readFileSync(new URL("../../.env", import.meta.url), "utf8")
      .split("\n").filter(l => l && !l.startsWith("#") && l.includes("="))
      .map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
    return env.HELIUS_RPC_URL;
  } catch { return "https://api.mainnet-beta.solana.com"; }
})();

const PROGRAM = "govYkyQ3ePtGULAtY6V75qjWE8UH4vCUVQ1W4HdCAZU";
const CONFIG_PROGRAM = "Config1111111111111111111111111111111111111111"; // validator-info lives here
const OUT = new URL("../data/votes.json", import.meta.url);

// Ballot order + display codes. On-chain title for SGP-0002 is bare "Double Disinflation".
const PROPOSALS = [
  { code: "SGP-1", pubkey: "4aFA8K65zYZjmx16qaXhMLW9QY7URRvwyk4KQo2zLz8k", name: "The Solana Constitution" },
  { code: "SGP-2", pubkey: "7QJD8MzheHWJLHS39NkoAbFCGFKg5d9QbVviRqD4YExP", name: "Double Disinflation" },
  { code: "SGP-3", pubkey: "AGHDQ6gjRFJPoyEcHuc4X7sbxJwyJfeKTb3UrGFzFNZD", name: "Resource & Inclusion Fee" },
];

const disc = n => createHash("sha256").update("account:" + n).digest().slice(0, 8);
const ALPHA = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function b58(bytes) { let n = 0n; for (const b of bytes) n = n * 256n + BigInt(b); let s = ""; while (n > 0n) { s = ALPHA[Number(n % 58n)] + s; n /= 58n; } for (const b of bytes) { if (b === 0) s = "1" + s; else break; } return s; }

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function rpc(method, params) {
  let lastErr;
  for (let a = 0; a < 6; a++) {
    try {
      const r = await fetch(RPC, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
      if (r.status === 429) throw new Error("Too many requests (429)");
      const j = await r.json();
      if (j.error) throw new Error(j.error.message || JSON.stringify(j.error));
      return j.result;
    } catch (e) {
      lastErr = e;
      // The public RPC rate-limits getProgramAccounts hard — back off longer on 429.
      const rateLimited = /too many|429|rate limit/i.test(e.message || "");
      await sleep((rateLimited ? 3500 : 900) * (a + 1));
    }
  }
  throw lastErr;
}
// getProgramAccounts is the rate-limited call — serialize with a min gap between
// calls so a burst of six (2 per proposal) never trips the per-method limit.
let lastGpaAt = 0;
async function gpa(filters) {
  const GAP = 1100, since = Date.now() - lastGpaAt;
  if (since < GAP) await sleep(GAP - since);
  const res = await rpc("getProgramAccounts", [PROGRAM, { encoding: "base64", filters }]);
  lastGpaAt = Date.now();
  return res;
}
const buf64 = a => Uint8Array.from(Buffer.from(a.account.data[0], "base64"));
const u64 = (dv, o) => Number(dv.getBigUint64(o, true));

function direction(f, a, ab) {
  const m = Math.max(f, a, ab);
  if (m === 0) return "none";
  const nz = (f ? 1 : 0) + (a ? 1 : 0) + (ab ? 1 : 0);
  if (nz > 1) return "split";
  return f === m ? "for" : a === m ? "against" : "abstain";
}

// ---- validator names, keyed by BOTH node identity and vote account ---------
// Resolved offline in the bake (never on the public page). RPCs block scanning
// the Config program (native validator-info), so we use the public Stakewiz
// registry, which pairs identity <-> vote_identity <-> name. Falls back to null
// names (the page then shows the short pubkey, like the support ledger does).
async function loadNames() {
  const byIdentity = {}, byVote = {};
  try {
    const r = await fetch("https://api.stakewiz.com/validators", { headers: { accept: "application/json" } });
    const list = await r.json();
    for (const v of list) {
      if (!v.name) continue;
      const name = String(v.name).slice(0, 48);
      if (v.identity) byIdentity[v.identity] = name;
      if (v.vote_identity) byVote[v.vote_identity] = name;
    }
  } catch (e) { console.error("name registry load failed (names will be sparse):", e.message); }
  return { byIdentity, byVote };
}

async function main() {
  const [names, voteAccounts, epochInfo] = await Promise.all([
    loadNames(),
    rpc("getVoteAccounts", [{ commitment: "confirmed" }]),
    rpc("getEpochInfo", []),
  ]);
  // vote-account <-> node-identity, live activated stake, and total network stake
  // (the quorum denominator: quorum = 1/3 of network stake, per Constitution IV.3).
  const voteToNode = {}, nodeToVote = {}, stakeByVote = {};
  let networkStakeLamports = 0;
  for (const v of [...voteAccounts.current, ...voteAccounts.delinquent]) {
    voteToNode[v.votePubkey] = v.nodePubkey;
    nodeToVote[v.nodePubkey] = v.votePubkey;
    stakeByVote[v.votePubkey] = v.activatedStake / 1e9;
    networkStakeLamports += v.activatedStake;
  }
  // vote account -> name: try vote key directly, else via its node identity
  const nameForVote = va => names.byVote[va] || names.byIdentity[voteToNode[va]] || null;
  // node identity -> name: try identity directly, else via its vote account
  const nameForNode = id => names.byIdentity[id] || names.byVote[nodeToVote[id]] || null;

  const VOTE_DISC = b58(disc("Vote")), OVR_DISC = b58(disc("VoteOverride")), PROP_DISC = b58(disc("Proposal"));
  const proposals = [];

  for (const P of PROPOSALS) {
    // Sequential (not Promise.all) so gpa()'s min-gap serialization actually holds.
    const propAcct = await rpc("getAccountInfo", [P.pubkey, { encoding: "base64" }]);
    const votes = await gpa([{ memcmp: { offset: 0, bytes: VOTE_DISC } }, { memcmp: { offset: 40, bytes: P.pubkey } }]);
    const overrides = await gpa([{ memcmp: { offset: 0, bytes: OVR_DISC } }, { memcmp: { offset: 104, bytes: P.pubkey } }]);

    // proposal tallies + state
    const pb = Uint8Array.from(Buffer.from(propAcct.value.data[0], "base64"));
    const pdv = new DataView(pb.buffer, pb.byteOffset, pb.byteLength);
    let o = 8 + 32; const tLen = pdv.getUint32(o, true); o += 4 + tLen;
    const dLen = pdv.getUint32(o, true); o += 4 + dLen;
    const creationEpoch = u64(pdv, o); o += 8;
    const startEpoch = u64(pdv, o); o += 8;
    const endEpoch = u64(pdv, o); o += 8;
    o += 8; // proposer_bp
    const supportLamports = u64(pdv, o); o += 8;
    const forL = u64(pdv, o); o += 8; const againstL = u64(pdv, o); o += 8; const abstainL = u64(pdv, o); o += 8;
    const voting = pb[o] === 1, finalized = pb[o + 1] === 1;

    // validators (Vote.validator = node identity)
    const validators = votes.map(a => {
      const b = buf64(a), dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
      const identity = b58(b.slice(8, 40));
      const fbp = u64(dv, 72), abp = u64(dv, 80), abbp = u64(dv, 88);
      const voteAccount = nodeToVote[identity] || null;
      return {
        identity, voteAccount, name: nameForNode(identity),
        dir: direction(fbp, abp, abbp),
        stake: Math.round(u64(dv, 120) / 1e9),
        override: Math.round(u64(dv, 128) / 1e9),
        ts: Number(dv.getBigInt64(136, true)),
      };
    }).sort((x, y) => y.stake - x.stake);

    // map vote-account -> validator direction, to flag override dissent
    const dirByVoteAccount = {};
    for (const v of validators) if (v.voteAccount) dirByVoteAccount[v.voteAccount] = v.dir;

    // overrides (VoteOverride.validator = vote account)
    const overridesOut = overrides.map(a => {
      const b = buf64(a), dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
      const delegator = b58(b.slice(8, 40));
      const stakeAccount = b58(b.slice(40, 72));
      const voteAccount = b58(b.slice(72, 104));
      const fbp = u64(dv, 168), abp = u64(dv, 176), abbp = u64(dv, 184);
      const dir = direction(fbp, abp, abbp);
      const valDir = dirByVoteAccount[voteAccount] || null;
      return {
        delegator, stakeAccount, voteAccount,
        validatorName: nameForVote(voteAccount),
        dir, amount: Math.round(u64(dv, 216) / 1e9 * 100) / 100,
        validatorDir: valDir,
        dissent: valDir != null && dir !== valDir && dir !== "none",
        ts: Number(dv.getBigInt64(224, true)),
      };
    }).sort((x, y) => y.amount - x.amount);

    const counts = { for: 0, against: 0, abstain: 0, split: 0 };
    for (const v of validators) counts[v.dir] = (counts[v.dir] || 0) + 1;

    proposals.push({
      code: P.code, name: P.name, pubkey: P.pubkey,
      voting, finalized, startEpoch, endEpoch,
      forLamports: forL, againstLamports: againstL, abstainLamports: abstainL,
      supportLamports,
      counts, overrideCount: overridesOut.length, dissentCount: overridesOut.filter(o => o.dissent).length,
      validators, overrides: overridesOut,
    });
  }

  // Vote window closes at the start of SGP-1's end_epoch (cast_vote requires
  // current_epoch < end_epoch). Estimate the deadline from epoch progress so the
  // page can count down live; ~420ms/slot gives ~2.09-day epochs.
  const lead = proposals.find(p => p.code === "SGP-1") || proposals[0];
  const SLOT_MS = 420;
  const slotsToClose = (lead.endEpoch - epochInfo.epoch) * epochInfo.slotsInEpoch - epochInfo.slotIndex;
  const voteClosesTs = new Date(Date.now() + Math.max(0, slotsToClose) * SLOT_MS).toISOString();

  const out = {
    generatedAt: new Date().toISOString(),
    program: PROGRAM,
    epoch: epochInfo.epoch,
    networkStakeLamports,       // total active stake — quorum denominator
    quorumFraction: 1 / 3,      // Constitution IV.3: quorum = 1/3 of network stake
    voteClosesTs,               // estimated vote-window close (start of SGP-1 end_epoch)
    voteCloseEpoch: lead.endEpoch,
    proposals,
  };
  writeFileSync(OUT, JSON.stringify(out));
  console.log(`votes.json written · epoch ${epochInfo.epoch} · name registry: ${Object.keys(names.byIdentity).length} identities / ${Object.keys(names.byVote).length} vote accts`);
  for (const p of proposals) {
    const named = p.validators.filter(v => v.name).length;
    console.log(`  ${p.code} ${p.name}: ${p.validators.length} validators (${named} named) — for ${p.counts.for||0}/against ${p.counts.against||0}/abstain ${p.counts.abstain||0}; ${p.overrideCount} overrides, ${p.dissentCount} dissenting`);
  }
}
main().catch(e => { console.error("build-votes failed:", e.message); process.exit(1); });

#!/usr/bin/env node
// Bakes data/votedata.json: live turnout toward the 10% quorum plus per-proposal
// Yes/No/Abstain for the three JitoSOL signalling-vote proposals. One RPC caller
// (this Action) so visitors read a static same-origin file. Zero dependencies.
//
// Realm: jitosol-sgp-council-2026-08 (one realm, one token, three proposals).
// Turnout = community tokens deposited into the realm holding vault. Per-proposal
// tallies = sum of un-relinquished VoteRecordV2 voter_weights by vote type.

import { readFileSync, writeFileSync } from "node:fs";

const cfg = JSON.parse(readFileSync(new URL("../data/config.json", import.meta.url), "utf8"));
const RPCS = [
  ...(process.env.SIGNERS_RPC_URL ? [process.env.SIGNERS_RPC_URL] : []),
  ...(cfg.rpcs || ["https://api.mainnet-beta.solana.com"]),
];
const OUT = new URL("../data/votedata.json", import.meta.url);

const GOV = "GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw"; // SPL Governance program
const MINT = "JvouX2KHLX8rLHBmmxDUiUqiJDEBaUK5zia1BAGJquM";  // voting token
const VAULT = "E6qoikdqnHkhZJXkn9iBn7CipW9yxc8sEqav51mnDro1"; // realm community-token holding PDA
const QUORUM_FRACTION = 0.10;
const VOTE_RECORD_V2 = 12;   // GovernanceAccountType::VoteRecordV2
// Immutable proposal accounts under the realm, in ballot order.
const PROPOSALS = [
  { id: "SGP-0001", name: "The Solana Constitution",   pubkey: "8jiLhXiouXrnfz2rToNDpFnzUiMUYZ7CLP4uPn85sBAS" },
  { id: "SGP-0002", name: "Double Disinflation",       pubkey: "Bzv25EnLw6Jb1BTSeHHhJqz6JYJYFDNsRJEpTkVTyZ5z" },
  { id: "SGP-0003", name: "Resource & Inclusion Fee",  pubkey: "LFgGM6m45R1ZLwHaLFmsyCYT18NfAYJgjPzE8BfFaBX" },
];

async function rpc(method, params) {
  let lastErr;
  for (const url of RPCS) {
    for (let a = 0; a < 4; a++) {
      try {
        const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
        const j = await r.json();
        if (j.error) throw new Error(j.error.message);
        return j.result;
      } catch (e) { lastErr = e; await new Promise(x => setTimeout(x, 1200 * (a + 1))); }
    }
  }
  throw lastErr;
}

// Sum un-relinquished VoteRecordV2 voter_weights for a proposal, split by vote type.
async function tally(proposal) {
  const accts = await rpc("getProgramAccounts",
    [GOV, { encoding: "base64", filters: [{ memcmp: { offset: 1, bytes: proposal } }] }]) || [];
  let yes = 0n, no = 0n, abstain = 0n, veto = 0n, voters = 0;
  for (const a of accts) {
    const buf = Uint8Array.from(Buffer.from(a.account.data[0], "base64"));
    if (buf[0] !== VOTE_RECORD_V2) continue;
    if (buf[65] === 1) continue; // is_relinquished
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    const w = dv.getBigUint64(66, true);   // voter_weight (u64 LE)
    const disc = buf[74];                    // Vote: 0 Approve, 1 Deny, 2 Abstain, 3 Veto
    voters++;
    if (disc === 0) yes += w; else if (disc === 1) no += w; else if (disc === 2) abstain += w; else if (disc === 3) veto += w;
  }
  const tok = n => Math.round(Number(n) / 1e9);
  return { yes: tok(yes), no: tok(no), abstain: tok(abstain), veto: tok(veto), voters };
}

async function main() {
  const [supplyRes, vaultRes, ...tallies] = await Promise.all([
    rpc("getTokenSupply", [MINT]),
    rpc("getTokenAccountBalance", [VAULT]),
    ...PROPOSALS.map(p => tally(p.pubkey)),
  ]);
  const supply = Math.round(supplyRes.value.uiAmount);
  const turnout = Math.round(vaultRes.value.uiAmount);
  const out = {
    generatedAt: new Date().toISOString(),
    realm: "jitosol-sgp-council-2026-08",
    supply,
    quorum: Math.round(supply * QUORUM_FRACTION),
    turnout,
    proposals: PROPOSALS.map((p, i) => ({ id: p.id, name: p.name, ...tallies[i] })),
  };
  writeFileSync(OUT, JSON.stringify(out));
  const pct = (turnout / supply * 100).toFixed(2);
  console.log(`votedata.json: turnout ${turnout.toLocaleString()} / ${out.quorum.toLocaleString()} (${pct}% of TVL, quorum ${QUORUM_FRACTION * 100}%)`);
  for (const p of out.proposals) console.log(`  ${p.id}: Y ${p.yes.toLocaleString()} / N ${p.no.toLocaleString()} / A ${p.abstain.toLocaleString()} (${p.voters} voters)`);
}
main().catch(e => { console.error("build-votedata failed:", e.message); process.exit(1); });

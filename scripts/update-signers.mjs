#!/usr/bin/env node
// Refreshes data/signers.json from the chain: proposal supporters (in on-chain
// signing order), stake, and validator names from on-chain validator-info.
// Zero dependencies. Usage: node scripts/update-signers.mjs [proposalId]

import { readFileSync, writeFileSync } from "node:fs";

const cfg = JSON.parse(readFileSync(new URL("../data/config.json", import.meta.url), "utf8"));
const PROPOSAL_ID = process.argv[2] || cfg.proposalId;
const RPCS = cfg.rpcs || ["https://api.mainnet-beta.solana.com"];
const OUT = new URL("../data/signers.json", import.meta.url);

const PROPOSAL_DISC = [26, 94, 189, 187, 116, 136, 53, 33]; // sha256("account:Proposal")[0..8]
const ALPHA = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function b58(bytes) {
  let n = 0n;
  for (const b of bytes) n = n * 256n + BigInt(b);
  let s = "";
  while (n > 0n) { s = ALPHA[Number(n % 58n)] + s; n /= 58n; }
  for (const b of bytes) { if (b === 0) s = "1" + s; else break; }
  return s;
}

async function rpc(method, params) {
  let lastErr;
  for (const url of RPCS) {
    try {
      const r = await fetch(url, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      });
      const j = await r.json();
      if (j.error) throw new Error(`${method}: ${JSON.stringify(j.error)}`);
      return j.result;
    } catch (e) { lastErr = e; }
  }
  throw lastErr;
}

function parseProposal(buf) {
  for (let i = 0; i < 8; i++) if (buf[i] !== PROPOSAL_DISC[i]) throw new Error("not a Proposal account");
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let o = 8 + 32;
  const tLen = dv.getUint32(o, true); o += 4;
  const title = new TextDecoder().decode(buf.slice(o, o + tLen)); o += tLen;
  const dLen = dv.getUint32(o, true); o += 4 + dLen;
  o += 8 * 4;
  const supportLamports = dv.getBigUint64(o, true); o += 8;
  o += 8 * 3;
  const voting = buf[o] === 1, finalized = buf[o + 1] === 1;
  o += 3 + 8 + 4 + 4;
  o += 1 + (buf[o] === 1 ? 32 : 0);
  o += 8 + 8 + 32;
  const num = dv.getUint32(o, true);
  const start = buf.length - num * 32;
  const supporters = [];
  for (let i = 0; i < num; i++) supporters.push(b58(buf.slice(start + i * 32, start + i * 32 + 32)));
  return { title, supportLamports, voting, finalized, supporters };
}

async function main() {
  const out = { proposalId: PROPOSAL_ID || null, updatedAt: new Date().toISOString(), phase: "awaiting", signers: [] };

  if (PROPOSAL_ID) {
    const acct = await rpc("getAccountInfo", [PROPOSAL_ID, { encoding: "base64" }]);
    if (acct && acct.value) {
      const raw = Uint8Array.from(Buffer.from(acct.value.data[0], "base64"));
      const p = parseProposal(raw);

      const votes = await rpc("getVoteAccounts", [{ commitment: "confirmed" }]);
      const byVote = {}; let totalStake = 0;
      for (const v of [...votes.current, ...votes.delinquent]) {
        byVote[v.votePubkey] = v; totalStake += v.activatedStake;
      }

      // On-chain validator names: Config program validator-info records.
      const names = {};
      try {
        const cfgAccts = await rpc("getProgramAccounts",
          ["Config1111111111111111111111111111111111111", { encoding: "jsonParsed" }]);
        for (const a of cfgAccts) {
          const d = a.account.data;
          if (d && !Array.isArray(d) && d.parsed?.type === "validatorInfo") {
            const ident = d.parsed.info.keys.find(k => k.signer)?.pubkey;
            const nm = d.parsed.info.configData?.name;
            if (ident && nm) names[ident] = String(nm).slice(0, 64);
          }
        }
      } catch (e) { console.error("validator-info lookup failed (continuing):", e.message); }

      out.title = p.title;
      out.phase = p.finalized ? "finalized" : p.voting ? "sponsored" : "gathering";
      out.supportLamports = p.supportLamports.toString();
      out.totalStakeLamports = String(totalStake);
      out.signers = p.supporters.map((vote, i) => {
        const v = byVote[vote];
        return {
          rank: i + 1,
          vote,
          identity: v?.nodePubkey || null,
          name: (v && names[v.nodePubkey]) || null,
          stakeSol: v ? Math.round(v.activatedStake / 1e9) : null,
        };
      });
    }
  }

  writeFileSync(OUT, JSON.stringify(out, null, 1) + "\n");
  console.log(`wrote ${out.signers.length} signers, phase=${out.phase}${out.signers.length ? `, named=${out.signers.filter(s => s.name).length}` : ""}`);
}

main().catch(e => { console.error(e); process.exit(1); });

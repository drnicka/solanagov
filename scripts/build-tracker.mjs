#!/usr/bin/env node
// Bakes data/tracker.json: Double Disinflation sponsors cross-referenced against
// SGP-1, ranked by stake, with names/stake from on-chain validator-info.
// Single RPC caller (this Action), so visitors read a static same-origin file
// instead of each hitting the rate-limited public RPC. Zero dependencies.

import { readFileSync, writeFileSync } from "node:fs";

const cfg = JSON.parse(readFileSync(new URL("../data/config.json", import.meta.url), "utf8"));
const SGP1 = cfg.proposalId;
const DISINFLATION = "7QJD8MzheHWJLHS39NkoAbFCGFKg5d9QbVviRqD4YExP";
const RPCS = [
  ...(process.env.SIGNERS_RPC_URL ? [process.env.SIGNERS_RPC_URL] : []),
  ...(cfg.rpcs || ["https://api.mainnet-beta.solana.com"]),
];
const OUT = new URL("../data/tracker.json", import.meta.url);
const PROPOSAL_DISC = [26, 94, 189, 187, 116, 136, 53, 33];
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
function parseSupporters(buf) {
  for (let i = 0; i < 8; i++) if (buf[i] !== PROPOSAL_DISC[i]) throw new Error("not Proposal");
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let o = 8 + 32; const tl = dv.getUint32(o, true); o += 4 + tl;
  const dl = dv.getUint32(o, true); o += 4 + dl;
  o += 8 * 4; const support = dv.getBigUint64(o, true); o += 8; o += 8 * 3;
  o += 3 + 8 + 4 + 4; o += 1 + (buf[o] === 1 ? 32 : 0); o += 8 + 8 + 32;
  const num = dv.getUint32(o, true); const start = buf.length - num * 32; const s = [];
  for (let i = 0; i < num; i++) s.push(b58(buf.slice(start + i * 32, start + i * 32 + 32)));
  return { support, supporters: s };
}
async function getSupporters(id) {
  const a = await rpc("getAccountInfo", [id, { encoding: "base64" }]);
  return parseSupporters(Uint8Array.from(Buffer.from(a.value.data[0], "base64")));
}

async function main() {
  const [s1, s2, votes, cfgAccts] = await Promise.all([
    getSupporters(SGP1), getSupporters(DISINFLATION),
    rpc("getVoteAccounts", [{ commitment: "confirmed" }]),
    rpc("getProgramAccounts", ["Config1111111111111111111111111111111111111", { encoding: "jsonParsed" }]),
  ]);
  const byVote = {}; let total = 0;
  const delinq = new Set(votes.delinquent.map(v => v.votePubkey));
  for (const v of [...votes.current, ...votes.delinquent]) { byVote[v.votePubkey] = v; total += v.activatedStake; }
  const names = {};
  for (const a of cfgAccts) {
    const d = a.account.data;
    if (d && !Array.isArray(d) && d.parsed?.type === "validatorInfo") {
      const info = d.parsed.info; const id = info.keys.find(k => k.signer)?.pubkey; const c = info.configData || {};
      if (id) names[id] = { name: c.name || null, website: c.website || null, keybase: c.keybaseUsername || null };
    }
  }
  const enrich = vote => {
    const v = byVote[vote] || {}; const id = v.nodePubkey; const m = (id && names[id]) || {};
    return { vote, name: m.name || null, stakeSol: v.activatedStake != null ? Math.round(v.activatedStake / 1e9) : 0,
      delinquent: delinq.has(vote), website: m.website || null, keybase: m.keybase || null,
      _lam: v.activatedStake || 0 };
  };
  const set1 = new Set(s1.supporters), set2 = new Set(s2.supporters);
  const byStake = (a, b) => b._lam - a._lam;
  const signedBoth = s2.supporters.filter(v => set1.has(v)).map(enrich).sort(byStake);
  const outstanding = s2.supporters.filter(v => !set1.has(v)).map(enrich).sort(byStake);
  const sgp1Only = s1.supporters.filter(v => !set2.has(v)).map(enrich).sort(byStake);
  const strip = a => a.map(({ _lam, ...r }) => r);
  const sumSol = a => Math.round(a.reduce((s, x) => s + x._lam, 0) / 1e9);
  const pct = sol => +(sol * 1e9 / total * 100).toFixed(2);

  const out = {
    generatedAt: new Date().toISOString(), totalActiveStakeSol: Math.round(total / 1e9),
    sgp1: { support: +(Number(s1.support) / total * 100).toFixed(2), supportSol: Math.round(Number(s1.support) / 1e9), count: s1.supporters.length },
    disinflation: { support: +(Number(s2.support) / total * 100).toFixed(2), supportSol: Math.round(Number(s2.support) / 1e9), count: s2.supporters.length },
    summary: {
      signedBoth: signedBoth.length, signedBothSol: sumSol(signedBoth),
      outstanding: outstanding.length, outstandingSol: sumSol(outstanding), outstandingPct: pct(sumSol(outstanding)),
      sgp1Only: sgp1Only.length, sgp1OnlySol: sumSol(sgp1Only),
    },
    signedBoth: strip(signedBoth), outstanding: strip(outstanding), sgp1Only: strip(sgp1Only),
  };
  writeFileSync(OUT, JSON.stringify(out));
  console.log(`tracker.json: sgp1 ${out.sgp1.count} (${out.sgp1.support}%), outstanding ${out.summary.outstanding} (${out.summary.outstandingPct}%), both ${out.summary.signedBoth}, net-new ${out.summary.sgp1Only}`);
}
main().catch(e => { console.error("build-tracker failed:", e.message); process.exit(1); });

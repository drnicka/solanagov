# BAM Subsidy Mechanism Simulator

Interactive, single-file simulation of the proposed BAM subsidy restructure (re-tiered effective-stake curve, pool-share ceiling, delegation interaction, and wind-down schedule) from the JitoSOL + Subsidy Memo.

## Run locally

Open `index.html` directly in a browser, or serve it:

```bash
python3 -m http.server 8901 --directory "Simulator"
```

No dependencies, no build step — pure HTML/JS/SVG, ready to embed on a website as-is.

## What you can tune

- **Mechanism curve:** full-rate (1.0×) band, mid-band rate, inflection threshold, top-tranche rate
- **Concentration cap:** pool-share ceiling vs effective-stake cap vs none
- **Pool & interaction:** monthly pool size (revenue), % of JitoSOL delegation moved, Option C sub-50K carve-out
- **Wind-down:** full-rate quarters, decay half-life, decay duration

**Core strategy presets:** Flat per-SOL, JIP-31 (current), Memo proposal.
**Explore presets:** Small-validator max, Whale-gentle, Carry-over stake cap, Option C package, Slow taper, Fast exit.
Selecting any preset shows a full explanation of its settings and trade-offs in the "Selected strategy" banner; moving any slider switches to "Custom settings".

**Delegation rollout animation:** hit ▶ Play to watch the move phase in at 7.5%/cycle, with a triple x-axis (steward cycles / Solana epochs / calendar dates), the 15% ceiling-clear line, live yield, and a scrub bar. Move slider runs 0–30% with 15% and 25% tick-marked.

See `DEMO_SCRIPT.md` for the full presenter walkthrough with narration and slider prompts.

## What it shows

- Effective-stake curve vs the current JIP-31 curve, with the validator set overlaid
- Pool share, bracket totals, median checks, and $/1,000 SOL by bracket (Δ vs current formula)
- Whale spotlight (Binance / iZADA / OKX / Kraken) with ceiling status
- Combined income (subsidy + delegation) per Steward cycle as the move phases in — check the memo's −9% to −11% target band
- Wind-down rate curve and cumulative programme cost

## Data provenance

The 357-validator set is **synthetic**: generated deterministically (seeded) and calibrated to the memo's bracket aggregates — validator counts, total stake per bracket (back-solved from bracket totals ÷ $-per-1,000-SOL), delegation totals and holder counts, and the four named whales (exact stakes). Delegation income uses the memo's ~$72k/mo per 25% move (~$31.4 per 1,000 SOL/mo).

For the website deployment, replace `buildValidators()` in `index.html` with a live StakeNet/on-chain feed; everything downstream is data-agnostic.

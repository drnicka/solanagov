# Demo Script — BAM Subsidy Mechanism Simulator

Presenter walkthrough for the screen recording / live handoff. Plain-read narration in normal text; **[DO: …]** blocks are your on-screen actions. Estimated runtime: 12–15 minutes.

---

## 0. Opening (30s)

> "This is a live simulator of the proposed JitoSOL delegation move and BAM subsidy restructure. Everything you'll see is calibrated to the shared memo — same validator brackets, same whale stakes, same revenue run-rate. The point of this tool is that none of these numbers have to be taken on trust: every parameter in the proposal is a slider, and you can watch what each one does to every validator bracket in real time. At the end I'll hand it over and you can break it yourselves."

**[DO: Start on the Memo proposal preset — it loads by default. Scroll slowly down the full page once so viewers see the layout: strategy banner, stat cards, charts, tables, rollout, wind-down.]**

---

## 1. The problem in one number (1 min)

> "JitoSOL yields 5.13%. The best any competitor can ever do is about 5.2% — the '0/0 ceiling' — because even zero-fee validators keep block rewards. A Jito-operated validator that passes block rewards through to holders breaks that ceiling. That's the delegation move. But the stake for it comes from the 290 validators who hold it today — and the subsidy is how we make them whole. This tool is about tuning that compensation."

---

## 2. The strategy banner and presets (2 min)

> "Top-left are the three core strategies. Every time you select one, the banner at the top-right explains exactly what it sets and what the trade-off is."

**[DO: Click `Flat per-SOL`.]**
> "First, the do-nothing-clever baseline: every SOL pays the same. Look at the whale share stat — the top 24 validators take even more than today. Binance's check roughly triples. Without a curve, this is a whale-payment programme. That's why a curve exists at all."

**[DO: Click `JIP-31 (current)`.]**
> "This is the live formula today. It looks progressive — full rate up to 1.5M, half above — but in practice it's near-flat per SOL, so forty percent of the pool lands with 24 validators. And note: 20 of those whales hold zero JitoSOL — they lose nothing from the delegation move but get paid the most."

**[DO: Click `Memo proposal`. Point at the stat cards.]**
> "And this is the proposal. Watch the four numbers that matter: small validator medians up around fifty percent, the pivotal 100–250K bracket up about thirty, whale share of the pool down from forty to about thirty, and Binance at minus nineteen — not minus forty-six. Hold those numbers; every slider we touch from here moves them."

---

## 3. The mechanism curve sliders (3 min)

> "The curve converts raw stake into 'effective stake', and your share of the pool is your effective stake over everyone's. Four dials."

**[DO: Drag `Full-rate band` from 100K up to 1.5M slowly. Watch the pool-share bar chart.]**
> "The full-rate band is the amount of stake that earns full credit. Today it's 1.5M — so it's a rate big validators enjoy across their whole stake. Shrink it to 100K and it becomes a flat floor that every validator gets equally — the smaller you are, the more of your stake earns full credit. Watch the small brackets rise as I pull it down."

**[DO: Return band to 100K. Drag `Mid-band rate` from 0.6 up to 1.0 and back.]**
> "The mid-band prices the 100K-to-1.5M range — where most eligible stake actually sits. This is the main funding source *inside* the sub-1.5M group. At 1.0 nothing is redistributed; at 0.6 about six points of the pool move down to the sub-250K brackets."

**[DO: Drag `Top-tranche rate` from 0.1 up to 0.5 and back, pointing at the whale share stat.]**
> "The top rate is the single biggest lever. This is the JIP-31 setting, 0.5 — whale share forty percent. Take it to 0.1 and nearly five points of pool move down the curve. Take it to zero and you've zeroed the whales — remember they hold over forty percent of the top-end BAM stake, so free money this is not."

**[DO: Leave everything on the memo settings before moving on — click `Memo proposal` to be safe.]**

---

## 4. The cap: the Binance question (2 min)

> "Now the most politically loaded parameter in the design. Today there's a cap on effective stake at 3M. Sounds neutral. It isn't."

**[DO: Click `Carry-over stake cap` preset. Point at the whale spotlight table.]**
> "Keep the old cap with the new curve and look at the whale table: Binance minus forty-six percent while its peers take minus thirty. Only one validator in the ecosystem is above the line where this cap binds — it's a single-name rule aimed at the one validator that brings more BAM stake than the next three whales combined."

**[DO: Click `Memo proposal` again. Point at Binance's 'at ceiling' flag.]**
> "The proposal replaces it with a two-percent pool-share ceiling — capping the thing we actually care about, concentration of the subsidy. Binance lands at minus nineteen, proportionate with peers, and the rule needs no re-tuning as stake grows."

**[DO: Drag the `Pool-share ceiling` slider from 2% up to 5% and down to 1%.]**
> "And if the top end pushes back in the forum, this is the dial we'd turn — watch Binance's check move while the small brackets barely notice."

---

## 5. The delegation rollout — hit play (2.5 min)

**[DO: Scroll to the Delegation Rollout chart. Confirm the move slider reads 25%.]**
> "Now the other half of the deal: the stake move itself. The Steward can move at most 7.5% of the pool per cycle, one cycle is ten Solana epochs — about three weeks — so a 25% move takes four cycles, roughly twelve weeks, all inside Q4. The x-axis shows all three clocks at once: steward cycles, Solana epochs, and calendar dates."

**[DO: Press ▶ Play. Narrate as it animates.]**
> "Blue line is stake moved, green is JitoSOL yield. Cycle one — 7.5% moved, yield rising. Cycle two — 15% moved, and there — *the orange line* — we clear the 0/0 ceiling at 5.22%. From this point JitoSOL out-yields anything a competitor can build. Cycles three and four take us to 25% and 5.28% — the target — completing just before the new year."

**[DO: Drag the `JitoSOL delegation moved` slider from 25% down to 15%, then up to 30%. Replay briefly.]**
> "The slider goes up to thirty. At fifteen you clear the ceiling and stop — cheaper for validators, no yield headroom. At thirty you buy three extra basis points of margin for one more cycle of validator income. Twenty-five is the memo's chosen balance. Notice the Combined Income table below updates as I slide — that's the real validator P&L."

---

## 6. Combined income — the fairness check (1.5 min)

**[DO: Scroll to the Combined Income table. Set move back to 25%, Memo preset.]**
> "This table is the single most important fairness check in the design. It's subsidy plus delegation income, per median validator, cycle by cycle. Two things to see. First, the sequencing trick: new subsidy rates start at cycle one, but delegation losses ramp over four — so the smallest brackets are actually *up* for the first six weeks, exactly when backlash would peak. Second, the landing zone: at completion, everyone below 1.5M sits in a tight minus-nine to minus-eleven percent band. Nobody is singled out. The only bracket outside the band is the whales, at minus twenty-four — and for them, the check was never material."

**[DO: Drag `Monthly pool` down to ~$170k to demonstrate the revenue-float risk, then back to $338k.]**
> "One honest risk, and you can see it live: checks float with revenue but delegation losses don't. Halve revenue and every check halves while the stake loss stays fixed. This is exactly why the proposal runs Q4 at the full rate — and it's what Draft Option D's floor would insure against."

---

## 7. The wind-down — how it ends (1.5 min)

**[DO: Scroll to the wind-down charts.]**
> "Finally, the exit. One formula: the rate halves every ten epochs from the first epoch of Q1. No cliff, no mid-course review, no 'shall we extend it' vote next June. Three-quarters of total spend lands in Q4, alongside the move, when retention risk peaks — total programme cost about 1.37 million, and it's effectively over by the end of Q1."

**[DO: Click `Slow taper`, point at Programme Total; then `Fast exit`; then back to `Memo proposal`.]**
> "The alternatives: a slow taper roughly doubles the tail cost for friendlier optics. A fast exit saves over a million — but strips the cushion out of the exact quarter the move lands. The memo's shape is a deliberate middle."

---

## 8. The remaining presets + handoff (1.5 min)

**[DO: Click `Small-validator max`.]**
> "For completeness, the edges of the space. Maximum redistribution: small validators gain the most possible, whales near-zeroed — looks generous, but it's a hostile signal to the operators holding forty-two percent of top-end BAM stake."

**[DO: Click `Whale-gentle`.]**
> "And the opposite concession: whale cuts shrink to single digits, but every point conceded comes straight out of the pivotal 100–250K bracket — the 178 validators with the highest incentive to switch schedulers."

**[DO: Click `Option C package`.]**
> "And Option C from the draft set: the memo design plus a one-and-a-half percent carve-out for the twenty-one validators below the eligibility floor — the only cohort the base design leaves uncompensated. Look at the note under the bracket table: covered, with headroom, for a rounding error."

**[DO: Click `Memo proposal` one final time.]**
> "That's the tool. Every number in the proposal is a slider here; every preset is a documented strategy with its trade-off written next to it. It runs in any browser from a single file, and it'll go up on the site alongside the JIP so delegates can pressure-test the design themselves before voting. Over to you."

---

## Quick-reference: trade-off demonstrations

| To demonstrate… | Do this |
| :---- | :---- |
| Why a curve exists at all | `Flat per-SOL` → point at whale share ~50%+ |
| Where today's formula fails | `JIP-31 (current)` → 40% of pool to 24 validators |
| Floor-vs-rate insight | Drag full-rate band 1.5M → 100K, watch small brackets |
| The biggest funding lever | Top rate 0.5 → 0.1 |
| The Binance question | `Carry-over stake cap` vs `Memo proposal`, whale table |
| Whale negotiation dial | Ceiling 2% → 4% |
| Ceiling-clear moment | Play rollout, pause at cycle 2 |
| 15 vs 25 vs 30 choice | Move slider, watch yield target + combined income |
| Sequencing protection | Combined income table, cycle 1 column (+4%) |
| Revenue-float risk (Option D's case) | Pool slider $338k → $170k |
| Sub-50K blind spot (Option C's case) | Carve-out 0% → 1.5%, read the note |
| Cost of a softer landing | `Slow taper` vs `Fast exit`, programme total |

## Notes for the recording

- Default revenue is the memo run-rate: **$338,231/mo** (July 2026 actual was ~$362k — mention if asked).
- The validator set is **synthetic but calibrated** — say this once, early: "same bracket totals, counts, and whale stakes as the memo; individual small validators are simulated."
- If asked about exact epochs: E₀ ≈ 1086, Q4 = epochs 1042–1085, published on the forum at execution per JIP-31 precedent.
- Sanity anchors to quote from the memo preset: +50% / +29% / −19% Binance / ~$1.37M total.

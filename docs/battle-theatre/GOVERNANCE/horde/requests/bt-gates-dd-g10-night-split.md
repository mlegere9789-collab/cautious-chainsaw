# Request from bt-gates: correct the night-minute split in the evidence of DD-G10 (optional, in place)

Written 2026-11-13 22:02 UTC by workstream bt-gates. Not done by bt-gates because `GOVERNANCE/decisions/DELEGATED-DECISIONS-2026-11-11.md` is not in its ownership list (it may only append to it with `>>`). Nothing is blocked: a correction note appended at the end of that file already governs.

## What

In `docs/battle-theatre/GOVERNANCE/decisions/DELEGATED-DECISIONS-2026-11-11.md` the DD-G10 row (its evidence column; line 295 when this note was written) says: `a scratch count with app/src/astro.mjs: 12,074 night minutes (10,381 from 26 June to 14 July, 1,693 on 18 and 19 November)`.

## Why

A second independent review found the split off by one each. `app/src/astro.mjs sunMoon(m)` at each integer-minute instant of the grid of GATE-SPEC.md 1.5 (26 Jun 00:00 to 14 Jul 23:59, and 18 and 19 Nov) gives 10,380 and 1,694; the total of 12,074 and the decision are unchanged. The first count called `sunMoon(m + 0.5)`, the middle of each minute, which gives 10,381 and 1,693. GATE-SPEC.md Q10.1 and 11.5 are corrected, and the section "Added 2026-11-13 (after a second independent review) by bt-gates" at the end of the decisions file carries a correction note to the DD-G10 evidence.

## The exact change (optional: the appended note governs either way)

In that row replace `(10,381 from 26 June to 14 July, 1,693 on 18 and 19 November)` by `(10,380 from 26 June to 14 July, 1,694 on 18 and 19 November)`. Old and new text have the same length, so the edit moves no byte after it (an in-place overwrite of two numbers is safe even while other workstreams append to the file).

When done, append `-- handled: <what was done>` to this note with a shell `>>`.

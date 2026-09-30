# Sign-off states for times, anchors and content decisions (draft)

> **Status: DRAFT. Nothing here is approved by the owner or a historian, and nothing here ships until they approve it.** These are the mechanics chapter 04 (WP-TIME-04) proposes; the owner and the reviewer confirm or change them. As of today **every one of the 33 anchors is `proposed`** and no decision has been recorded.

## 1. States

| state | meaning | who moves an item here | what the site shows | needs |
|---|---|---|---|---|
| `open` | on the queue, no proposal yet | the queue builder | nothing public | a fact row or a defect |
| `proposed` | the specialist's or developer's proposal | the AI toolchain or developer | "about h:mm" and the pill "Unreviewed reconstruction"; never "reviewed" | the evidence rows |
| `reviewed` | the named historian has decided | the reviewer, via a `decisions.jsonl` line | still "about" (the second reader has not confirmed) | a citation: work, edition, page, kind |
| `confirmed` | the second reader agrees on the sampled items | the second reader | still "about" | agreement on the 30% sample, kappa >= 0.6 for the batch |
| `signed` | reviewer and second reader sign the data release | reviewer and owner | the pill clears; an exact time may print **only if sigma is under 10 minutes**, otherwise "about" stays | a signed release and all of the above |
| `contested` | the sources cannot be reconciled | the reviewer | a range ("between about 5:10 and 7:00 PM") and a "Sources differ" link | the disagreement recorded |
| `deferred` | not decided yet; reason recorded | the reviewer | same as `proposed` | a reason |
| `withdrawn` | the claim is dropped | reviewer and owner | the item is removed or replaced | a reason |

Only `signed` clears the pill. A tick's clock is signed only when **both** anchors bounding it are signed; a tick between a signed and a proposed anchor is still "about". The model implements this (`Clock.signed`, `Clock.approx`, tests in `tests/time/model.test.mjs`).

## 2. Transitions

```
open -> proposed -> reviewed -> confirmed -> signed
                 \-> contested   (range shown; may still be signed as a range)
                 \-> deferred    -> proposed | reviewed
                 \-> withdrawn
signed -> proposed   (any later change to an anchor time, sigma or the evidence: dv bumps and the row is re-reviewed)
```

- Only the reviewer sets `reviewed`, `contested`, `deferred` (with the owner for `withdrawn`); only the second reader sets `confirmed`; the owner signs the release and the three design anchors and the conventions.
- **The AI toolchain never sets `reviewed`, `confirmed` or `signed`.** `tools/time` refuses a `signed` anchor without a `decision` id (TM-V1) and CI fails copy that says "reviewed" or "accurate to the minute" without a signed decision on file (TM-V18).
- Changing any anchor time or sigma bumps `version` and `dv` (the calibration stamp), regenerates the golden table and needs the reviewer's decision id on the change. Bookmarks and links keep meaning "that frame"; a re-ticked moment is followed only by links that carry its moment id.

## 3. What each anchor kind needs to reach `signed`

| kind | count | reviewer | owner |
|---|---|---|---|
| status R (t75, t90, t248, t275, t538) | 5 | decides the time, range and wording | approves the wording |
| status S or M (excluding t5) | 24 (9 carry an evidence flag: t1, t28, t36, t53, t302, t326, t500, t515, t556) | spot-checks; decides where the flag says the evidence is weak | approves |
| status D (t100, t226, t675) | 3 | none (no historical event) | signs the convention and the solar times |
| circular t5 | 1 | none | drops it or keeps it as design-class sigma 30 |

## 4. The decision record: `decisions.jsonl`

One JSON object per line, committed by the owner. Fields: `id` (`D-####`), `subject` (`anchor t538`, `fact R108`, `moment first-shot`, `content t360`, `text V-022`), `decision` (chosen option or time), `display` (`about h:mm` or `between about h:mm and h:mm`), `range` (`["14:00","15:00"]`), `citations` (`[{work, edition, page, kind}]` with kind `primary`, `scholarship` or `compilation`), `reviewer`, `second_reader`, `at` (date), `state`.

```json
{"id":"D-0001","subject":"anchor t538","decision":"option C 15:00","display":"about 3:00 PM","range":["14:30","15:00"],"citations":[{"work":"(reviewer fills)","edition":"","page":"","kind":"scholarship"}],"reviewer":"(name)","second_reader":"","at":"","state":"reviewed"}
```

(The line above is a shape, not a decision: no decision exists yet.) The developer then sets the anchor's `state` and `decision` in `data-src/time/time_anchors.json`, runs `node tools/time/build.mjs`, reviews the golden diff, and commits.

## 5. How the states appear in the interface

| where | `proposed` / `deferred` | `contested` | `signed` and sigma under 10 |
|---|---|---|---|
| clock chip and toolbar | "about 3:00 PM" | "between about 5:10 and 7:00 PM" with a "Sources differ" link | "3:07 PM" |
| clock popover | "Unreviewed reconstruction. Times are approximate. Sources disagree by 15 to 30 minutes, and the map plays as a time-lapse." (D-CLOCK wording, owner approves) | the disagreement and the sources | the citation and the reviewer's credit |
| event card footer | pill "Unreviewed reconstruction" | pill and range | none |
| Historian answers | "about", pill | range and sources | exact, cited |
| Sources & Times page | row shown with range, evidence class, source keys | plus the disagreement | plus reviewer credit |

## 6. CI rules that enforce the states

- TM-V1: `signed` needs a decision id; the slope, order and evidence rules hold.
- TM-V17: every printed time carries "about" while sigma is at least the threshold or the anchors are unsigned.
- TM-V18: no "reviewed" or "accurate to the minute" copy without a signed decision (mutation-tested in `tests/time/validators.test.mjs`).
- The data release is signed by the reviewer and the second reader; an unsigned release ships with the labelled fallback.

## 7. Open choices for the owner

The "about" threshold (register default sigma at least 10; 20 cuts the noise, since with derived sigmas almost every tick is at least 10); whether unsampled `reviewed` items may be `signed` before the kappa check completes; whether `confirmed` is required for anchors outside the five R anchors.

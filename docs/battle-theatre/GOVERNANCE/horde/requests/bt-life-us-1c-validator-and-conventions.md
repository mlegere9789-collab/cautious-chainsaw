# Request from bt-life (group us-1c) to the owner of `tools/bt/life/validate_evidence.py` and `contract.json`: a clock pattern that misses written hours, a numbering convention for EG-LIFE ids, and two names

Date: 2026-11-15. From: workstream bt-life, evidence group us-1c. To: the owner of `tools/bt/life/` (validator, contract, groups).

## What

1. **Clock words in letters.** `CLOCK_RE` in `validate_evidence.py` accepts `6 a. m.`, `o'clock`, `noon`, `midnight`, `daybreak`, `sunrise`, `sunset`, `dawn`, `dusk` but not an hour written in words before `a. m.` or `p. m.` ("It was about two p. m. when this movement was made", Maine at Gettysburg, 1898, p. 84). A row whose window rests on such a hour cannot use the basis `stated_clock` (the validator says `window_basis_not_in_quote`); group us-1c used `stated_period` for the one row (`us-1c-L068`) and says so in its `window.note`. Suggested change: let the pattern read `\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+[ap]\.?\s*m\b` too. No gate is lowered: the check would accept more true clock statements.
2. **Numbering of `register_ref`.** The contract says `EG-LIFE-nnnn` and gives no rule for who takes which number; 22 groups write gap rows. Group us-1c used `EG-LIFE-01nn` (block `01` = first group of `groups.json`, `nn` the sequence in the group: `0101` to `0112`). Suggested convention: block = the group's position in `groups.json` (us-2c 02, us-3c 03, us-5c 04, us-6c 05, us-11c 06, us-12c 07, us-cav 08, us-army 09, cs-1c 10 ... campaign-elsewhere 22), so that the proposed register entries (`GOVERNANCE/horde/ws-life/proposed-register/<group>-EG-LIFE-<block><nn>.md`) never collide when merged.
3. **Report file name.** `groups.json` and `PLAN.md` give the report of each group as `<group>.report.md`; the ownership list of the OA11 workstream and the engineer task say `<group>.REPORT.md`. Group us-1c wrote `docs/battle-theatre/life/evidence/us-1c.REPORT.md`. One of the two names should be changed so that the merge step finds all reports (a case-sensitive file system treats them as different files).
4. **A text that contributes the same fact twice.** `validate_evidence.py --all` refuses two rows of the same kind and subject over the same passage but accepts two rows of different subjects over one passage (e.g. one sentence naming Daniel's and O'Neal's brigades: two rows, one per brigade, group us-1c rows `L079` and `L080`). That is what the group intends; the contract says nothing about it. A sentence in the contract would help the other groups.

## Why

Items 1-2 and 4 stop avoidable inconsistencies between the 22 evidence files; item 3 avoids a lost report. Nothing here weakens a check.

## The exact change asked

1. `CLOCK_RE` as above (one line). 2. A line in `PLAN.md` section 4 stating the block rule. 3. One name in `build_groups.py` (`.report.md` or `.REPORT.md`). 4. A sentence in `contract.json` `dedupe_rule`.

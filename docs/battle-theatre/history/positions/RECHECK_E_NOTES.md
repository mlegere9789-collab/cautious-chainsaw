# Ledger E (state regimental volumes): repair after the independent fidelity audit, notes

Trigger: `FIDELITY_AUDIT_E.jsonl` and `FIDELITY_AUDIT_E_SUMMARY.md` (48 claims audited; documented sample 22 of 30 faithful; three material claims). Frozen copy of the ledger and of the summary as they stood before this pass: `_orig_E_audit/positions_E.jsonl`, `_orig_E_audit/POSITIONS_E_SUMMARY.md`.

Repairs are applied by `tools/bt/positions_E_recheck.py` (idempotent; every decision and its reason is in that file; quotes it adds or replaces are verified by code inside the cited section by `positions_E_lib.verify_quote` and are under 15 words). The ledger summary was regenerated (`tools/bt/positions_E_summary.py`, tier-rule line updated). The before/after of every changed field, computed from the frozen copy, is below.

## What was read

Passages were re-read by me against 1,000 to 2,500 characters of the raw volume text (`tmp/library/misc/`, located through the `statevol_index.py` offsets) on each side of the anchor, and the section was searched (`statevol_find.py`) where a claim reached beyond the window: every documented `arrival_road` (9) and `march` (11) claim; every documented claim whose `when.printed` or `place.printed` carries a time-of-day or compass word that a code check could not find in the surrounding text; all claims named by the audit; and the Hunt, Sharpe, Moore, Kidd, Cooper, Nachtigall and Heermance passages for the author check. Claims re-read and left unchanged carry `recheck_E: "passage re-read at the repair pass, no change"`; changed claims carry `recheck_E: "changed"`, `fidelity_check: corrected` and `claim_support_verified: true`; claims not re-read in this pass keep the `passed_full_read` that the builders set after reading the full section. Time-of-day words (forenoon, afternoon, evening) in the parenthesised `when.printed` of inferred claims were checked by code against the WHOLE cited section; 15 are not printed anywhere in it and were removed mechanically (recorded in `when.description` as the compiler's reading).

## Counts

| | claims | documented | inferred |
|---|---|---|---|
| before | 199 | 90 | 109 |
| after | 200 | 61 | 139 |

Claims changed: 70 of 199 (fidelity_check corrected); one new claim (POS-E-US-11C-2D-COSTER-73PA-010). Tier lowered documented -> inferred: 29. fidelity_check after: {'corrected': 70, 'passed_full_read': 130}.

Documented claims after, by author:

- 12: the regimental committee of the 45th New York (narrative following the dedication address; vol. 1 p. 378)
- 8: Lieutenant-Colonel John W. Phillips (18th Pennsylvania Cavalry; dedication address)
- 6: General James H. Kidd (captain, 6th Michigan Cavalry, at Gettysburg; dedication address)
- 4: Col. Daniel B. Allen (commanded the 154th New York at Gettysburg; dedication address)
- 4: monument inscription
- 4: Brevet Lieutenant-Colonel Theo. W. Bean (17th Pennsylvania Cavalry; dedication address)
- 3: Lieut. Col. Wilber G. Bentley (9th New York Cavalry; dedication address)
- 3: monument inscription (as printed by the commission)
- 2: Col. Theodore A. Dodge (119th New York; dedication address)
- 2: Colonel William Moore (73rd Pennsylvania; dedication address)
- 2: Col. W. L. Heermance (6th New York Cavalry; dedication address with appended memoranda)
- 2: Col. William L. Markell (commanded the 8th New York Cavalry at Gettysburg; dedication address)
- 2: Captain Thomas E. Merchant (84th Pennsylvania; dedication address)
- 1: monument inscription (bronze tablet text as printed by the commission)
- 1: monument inscription and the commission's location caption
- 1: Gen. James Wood (colonel of the 136th New York at Gettysburg; dedication address)
- 1: monument inscription and commission caption
- 1: Col. James C. Carmichael (157th New York; dedication address)
- 1: monument inscription (as printed by the commission); Devin's official report, reprinted in Heermance's address
- 1: Col. Thomas C. Devin, official report reprinted in the address

## Patterns found

1. **Unprinted glosses** (audit pattern 1): time-of-day words in `when.printed` (forenoon, afternoon, evening, early morning, night) and compass words in place text that the passage does not print, in documented claims 45NY-002/-005, 119NY-002/-003, 73PA-004/-007, 75PA-002/-004/-005, 17PA-003/-004, 18PA-002/-004, 5MI-004, 6MI-005, 26PA-003, 154NY-002, 157NY-003, and in 17 inferred claims (15 by the whole-section code check, plus the two audit-named 11C-3D-001 and 11C-2D-001). Where a printed hour or sequence exists it replaces the gloss; otherwise the word is removed and recorded as the compiler's reading.
2. **Road named where the passage prints only a place** (audit pattern 2): `direction_or_road` cleared (and the gazetteer link taken from a place name cleared where it pointed at a road the passage does not name) in 73PA-003, 26PA-001/-002, 45NY-002, 119NY-002, COSTER-006, 6NY-001/-004, 8NY-001, FARNSWORTH-002/-003, 18PA-003; the reading is kept in the note as the compiler's. Roads that the passage does print (Emmitsburg pike for the 5th/6th Michigan, Carlisle road for the 75th PA, Mummasburg road, Harrisburg pike, Cashtown road, road to Abbottstown, Baltimore pike at Two Taverns, Chambersburg road for the 73rd PA) were kept.
3. **Two passages fused, or a suggestion turned into an event** (audit pattern 3): 120NY-001, 84PA-003, 73PA-004 (Moore's words joined to Bates'), 5MI-003 (anchor sentence plus the p. 138 march), 6NY-002 (address plus inscription). Reworded, split, or given a supporting quote.
4. **Tier drift** (audit pattern 4): 29 documented claims lowered to inferred under the author rule (reason per claim below); their `tier_before` is recorded in the claim.

## Items kept documented that the owner may want to rule on (no scope reduction made; listed so none is concealed)

- **Monument inscriptions** (authorship of the text not shown; the audit called 73NY-002, 6NY-003 and 157NY-002 doubtful on this ground). Kept documented as the regiment's own monument text printed by the commission: 11C-3D-KRZYZANOWSKI-58NY-001, 11C-3D-SCHIMMELFENNIG-157NY-002, 11C-3D-SCHIMMELFENNIG-45NY-013, 3C-2D-BREWSTER-70NY-001, 3C-2D-BREWSTER-72NY-001, 3C-2D-BREWSTER-72NY-002, 3C-2D-BREWSTER-73NY-002, 3C-2D-BREWSTER-74NY-001, 3C-2D-BREWSTER-74NY-002, CAV-1D-DEVIN-6NY-003, CAV-1D-DEVIN-6NY-004.
- **45th New York regimental committee sketch** (the committee is not named in the section; officer status not shown): 11C-3D-SCHIMMELFENNIG-45NY-001, 11C-3D-SCHIMMELFENNIG-45NY-002, 11C-3D-SCHIMMELFENNIG-45NY-003, 11C-3D-SCHIMMELFENNIG-45NY-004, 11C-3D-SCHIMMELFENNIG-45NY-005, 11C-3D-SCHIMMELFENNIG-45NY-006, 11C-3D-SCHIMMELFENNIG-45NY-007, 11C-3D-SCHIMMELFENNIG-45NY-008, 11C-3D-SCHIMMELFENNIG-45NY-009, 11C-3D-SCHIMMELFENNIG-45NY-010, 11C-3D-SCHIMMELFENNIG-45NY-011, 11C-3D-SCHIMMELFENNIG-45NY-012.
- **Brigade-level claims by an officer of one regiment of that brigade**, kept documented because the audit did not flag them: FARNSWORTH-002/-003/-004 (Phillips, 18th PA), CUSTER-003 (Kidd, 6th MI), COSTER-005/-006 (Allen, 154th NY). The division-level claims CAV-1D-001, CAV-1D-002 and CAV-3D-003 were lowered for consistency with the audit's CAV-3D-003 finding.
- **Inferred claims** with parenthesised compass words in place text (for example 11C-2D-SMITH-001, 11C-ART-1NYI-007, POS-E-CS-2C-JOHNSON-002) were not edited: outside the brief (documented claims) and not shown to be unprinted.
- **26PA-006 date**: `when.date` follows the printed words ("upon the third day" = 1863-07-03) as the brief directs; in the sentence those words attach to Pickett's charge, and the surrounding narrative (the Peach Orchard attack) is July 2. Both readings are carried (`date_reading`); no default chosen.
- **Quotation limit**: the supporting quotes of 6NY-002, 6NY-004 and 5MI-003 each come from a different passage than the anchor (monument inscription; Devin's report; page 138 versus page 139).

Re-read and left unchanged (10): 11C-2D-COSTER-154NY-001, 11C-2D-SMITH-136NY-006, 11C-3D-SCHIMMELFENNIG-45NY-001, 11C-3D-SCHIMMELFENNIG-45NY-003, 11C-3D-SCHIMMELFENNIG-45NY-013, CAV-1D-DEVIN-9NY-001, CAV-1D-DEVIN-9NY-002, CAV-3D-CUSTER-003, CAV-3D-CUSTER-6MI-001, CAV-3D-CUSTER-6MI-002.

## Every change (claim id, before, after, reason)

### POS-E-US-11C-3D-001
- kind arrival_road; tier inferred; fidelity_check passed_full_read -> corrected. **Reason:** Audit minor: "forenoon" fits the 45th New York (arrival 11:15) but is not printed for the corps narrative; removed.
- when.printed
  - before: (July 1, forenoon)
  - after: (July 1)
- when.description
  - before: null
  - after: compiler's reading removed at the repair pass (not printed for the divisions): forenoon

### POS-E-US-11C-2D-001
- kind arrival_road; tier inferred; fidelity_check passed_full_read -> corrected. **Reason:** Audit minor: "forenoon" fits the 45th New York (arrival 11:15) but not Steinwehr's division (about 2 p. m. elsewhere); not printed; removed.
- when.printed
  - before: (July 1, forenoon)
  - after: (July 1)
- when.description
  - before: null
  - after: compiler's reading removed at the repair pass (not printed for the divisions): forenoon

### POS-E-US-11C-3D-SCHIMMELFENNIG-45NY-002
- kind arrival_road; tier documented; fidelity_check passed_full_read -> corrected. **Reason:** Audit pattern 1: "forenoon" gloss not printed; removed. direction_or_road held the printed phrase "a shorter route" plus a compiler's remark; the passage prints no road, field cleared, phrase kept in place.printed.
- when.printed
  - before: (July 1, forenoon)
  - after: (July 1)
- place.printed
  - before: At or near Horner's Mills
  - after: At or near Horner's Mills; directed by a shorter route to the town of Gettysburg
- place.direction_or_road
  - before: from Horner's Mills by 'a shorter route' to the town (road not named)
  - after: null
- note: rewritten (full text in the ledger)

### POS-E-US-11C-3D-SCHIMMELFENNIG-45NY-005
- kind engagement; tier documented; fidelity_check passed_full_read -> corrected. **Reason:** "forenoon to about 1 o'clock" was a compiler's span; replaced by the printed times (the 11:15 a. m. arrival before the order, and the 1 o'clock estimate that the passage gives for other regiments).
- when.printed
  - before: (forenoon to about 1 o’clock, July 1)
  - after: (July 1, after the 11:15 a. m. arrival; other regiments came into line "say about 1 o’clock")

### POS-E-US-11C-ART-1OHI-001
- kind position; tier inferred; fidelity_check passed_full_read -> corrected. **Reason:** Pattern 1 (audit): the time-of-day word(s)  in the parenthesised time are not printed anywhere in the cited section; removed from when.printed and recorded in when.description as the compiler's reading.
- when.printed
  - before: (forenoon, July 1)
  - after: (July 1)
- when.description
  - before: null
  - after: compiler's reading removed at the repair pass (not printed anywhere in the cited section): forenoon; compiler's reading removed at the repair pass (not printed anywhere in the cited section): ; compiler's reading removed at the repair pass (not printed anywhere in the cited section): ; compiler's reading removed at the repair pass (not printed anywhere in the cited section): 

### POS-E-US-11C-3D-KRZYZANOWSKI-119NY-002
- kind movement; tier documented; fidelity_check passed_full_read -> corrected. **Reason:** Audit minor: "(north of the town)" added to the activity and "afternoon" to the time; neither is printed. direction_or_road "(street not named)" cleared.
- when.printed
  - before: (July 1, afternoon)
  - after: (July 1)
- place.direction_or_road
  - before: through the town to the front (street not named)
  - after: null
- activity
  - before: The 119th New York marched through the town out to the front with about 300 men under the colors, filed out into the orchard, rested a few minutes, then fell into line and advanced across the fields and fences to the monument spot (north of the town).
  - after: The 119th New York marched through the town out to the front with about 300 men under the colors, filed out into the orchard, rested a few minutes, then fell into line and advanced across the fields and fences to the spot where the monument stands.
- note: rewritten (full text in the ledger)

### POS-E-US-11C-3D-KRZYZANOWSKI-119NY-003
- kind engagement; tier documented; fidelity_check passed_full_read -> corrected. **Reason:** Compass gloss "north of the town" is not in the address; marked as the compiler's with its source.
- place.printed
  - before: this spot (the monument, north of the town)
  - after: this spot (the monument) [compiler's gloss, not in this address: north of the town, from the commission's caption list]

### POS-E-US-3C-2D-BREWSTER-120NY-001
- kind position; tier documented -> inferred; fidelity_check passed_full_read -> corrected. **Reason:** Audit SHIFTED: the claim joined the second-position paragraph (before 4 o'clock) to de Trobriand's later description of the line after the change of front. Dated to the passage's own time (after the angle broke, about 6 p.m.); tier lowered because Sharpe quotes another officer and was on staff.
- when.printed
  - before: (July 2, before 4 o’clock)
  - after: the angle of the Peach Orchard was broken towards 6 o’clock (Hunt, quoted); the change of front followed
- when.description
  - before: null
  - after: time in a different sentence: "towards 6 o'clock" is General Hunt's time (quoted in the same paragraph) for the breaking of the angle of the Peach Orchard; the line described by de Trobriand is the one after Graham was dislodged and the change of front made, read as about 6 p.m. onward (compiler's reading)
- place.printed
  - before: the Third Corps second position, thrown out in advance of the general line, with an angle at the Peach Orchard; the 120th on the left of Humphreys' division
  - after: Humphreys' division line after the change of front: right held on to the Emmitsburg Road (Carr's Brigade), left extending towards Round Top; the 120th Regiment was that left
- place.direction_or_road
  - before: null
  - after: the Emmitsburg Road (right of the line)
- activity
  - before: The 120th New York stood in the Third Corps second position (the line thrown forward from Cemetery Ridge toward the Emmitsburg Road, angle at the Peach Orchard), the left of Humphreys' division line, Carr's brigade on its right holding the Emmitsburg Road.
  - after: De Trobriand, as quoted by Sharpe: after Graham had been dislodged from the Peach Orchard Humphreys effected a change of front; his right held on to the Emmitsburg Road (Carr's Brigade) and his left extended towards Round Top, in the direction where Birney wished to form a new line, and this left was the 120th New York Regiment.
- note: rewritten (tier-lowered prefix added) (full text in the ledger)

### POS-E-US-3C-2D-BREWSTER-120NY-002
- kind engagement; tier documented -> inferred; fidelity_check passed_full_read -> corrected. **Reason:** Author is Gen. George H. Sharpe, first colonel of the 120th New York but on Meade's staff at the battle, writing second-hand (the address follows a paper by Colonel Westbrook): not the regiment's officer stating what he saw; author rule gives inferred.
- note: rewritten (tier-lowered prefix added) (full text in the ledger)

### POS-E-US-3C-2D-BREWSTER-120NY-003
- kind engagement; tier documented -> inferred; fidelity_check passed_full_read -> corrected. **Reason:** Author is Gen. George H. Sharpe, first colonel of the 120th New York but on Meade's staff at the battle, writing second-hand (the address follows a paper by Colonel Westbrook): not the regiment's officer stating what he saw; author rule gives inferred.
- note: rewritten (tier-lowered prefix added) (full text in the ledger)

### POS-E-US-11C-2D-COSTER-002
- kind movement; tier inferred; fidelity_check passed_full_read -> corrected. **Reason:** Pattern 1 (audit): the time-of-day word(s)  in the parenthesised time are not printed anywhere in the cited section; removed from when.printed and recorded in when.description as the compiler's reading.
- when.printed
  - before: (afternoon, July 1)
  - after: (July 1)
- when.description
  - before: null
  - after: compiler's reading removed at the repair pass (not printed anywhere in the cited section): afternoon; compiler's reading removed at the repair pass (not printed anywhere in the cited section): ; compiler's reading removed at the repair pass (not printed anywhere in the cited section): ; compiler's reading removed at the repair pass (not printed anywhere in the cited section): 

### POS-E-US-11C-2D-COSTER-73PA-001
- kind position; tier inferred; fidelity_check passed_full_read -> corrected. **Reason:** Pattern 1 (audit): the time-of-day word(s)  in the parenthesised time are not printed anywhere in the cited section; removed from when.printed and recorded in when.description as the compiler's reading.
- when.printed
  - before: (afternoon, July 1)
  - after: (July 1)
- when.description
  - before: null
  - after: compiler's reading removed at the repair pass (not printed anywhere in the cited section): afternoon; compiler's reading removed at the repair pass (not printed anywhere in the cited section): ; compiler's reading removed at the repair pass (not printed anywhere in the cited section): ; compiler's reading removed at the repair pass (not printed anywhere in the cited section): 

### POS-E-US-11C-ART-1OHK-001
- kind position; tier inferred; fidelity_check passed_full_read -> corrected. **Reason:** Pattern 1 (audit): the time-of-day word(s)  in the parenthesised time are not printed anywhere in the cited section; removed from when.printed and recorded in when.description as the compiler's reading.
- when.printed
  - before: (afternoon, July 1)
  - after: (July 1)
- when.description
  - before: null
  - after: compiler's reading removed at the repair pass (not printed anywhere in the cited section): afternoon; compiler's reading removed at the repair pass (not printed anywhere in the cited section): ; compiler's reading removed at the repair pass (not printed anywhere in the cited section): ; compiler's reading removed at the repair pass (not printed anywhere in the cited section): 

### POS-E-US-11C-2D-COSTER-134NY-002
- kind engagement; tier inferred; fidelity_check passed_full_read -> corrected. **Reason:** Pattern 1 (audit): the time-of-day word(s)  in the parenthesised time are not printed anywhere in the cited section; removed from when.printed and recorded in when.description as the compiler's reading.
- when.printed
  - before: (afternoon, July 1; a few minutes after deploying)
  - after: (July 1; a few minutes after deploying)
- when.description
  - before: null
  - after: compiler's reading removed at the repair pass (not printed anywhere in the cited section): afternoon; compiler's reading removed at the repair pass (not printed anywhere in the cited section): ; compiler's reading removed at the repair pass (not printed anywhere in the cited section): ; compiler's reading removed at the repair pass (not printed anywhere in the cited section): 

### POS-E-US-11C-2D-COSTER-004
- kind movement; tier inferred; fidelity_check passed_full_read -> corrected. **Reason:** Pattern 1 (audit): the time-of-day word(s)  in the parenthesised time are not printed anywhere in the cited section; removed from when.printed and recorded in when.description as the compiler's reading.
- when.printed
  - before: (afternoon, July 1)
  - after: (July 1)
- when.description
  - before: null
  - after: compiler's reading removed at the repair pass (not printed anywhere in the cited section): afternoon; compiler's reading removed at the repair pass (not printed anywhere in the cited section): ; compiler's reading removed at the repair pass (not printed anywhere in the cited section): ; compiler's reading removed at the repair pass (not printed anywhere in the cited section): 

### POS-E-US-11C-2D-COSTER-005
- kind march; tier documented; fidelity_check passed_full_read -> corrected. **Reason:** Note carried a compass reading "(west)" as if printed; marked as the compiler's. Passage re-read, activity unchanged.
- note: rewritten (full text in the ledger)

### POS-E-US-11C-2D-COSTER-73PA-002
- kind position; tier inferred; fidelity_check passed_full_read -> corrected. **Reason:** Pattern 1 (audit): the time-of-day word(s)  in the parenthesised time are not printed anywhere in the cited section; removed from when.printed and recorded in when.description as the compiler's reading.
- when.printed
  - before: (afternoon, July 1)
  - after: (July 1)
- when.description
  - before: null
  - after: compiler's reading removed at the repair pass (not printed anywhere in the cited section): afternoon; compiler's reading removed at the repair pass (not printed anywhere in the cited section): ; compiler's reading removed at the repair pass (not printed anywhere in the cited section): ; compiler's reading removed at the repair pass (not printed anywhere in the cited section): 

### POS-E-US-11C-2D-COSTER-006
- kind movement; tier documented; fidelity_check passed_full_read -> corrected. **Reason:** direction_or_road carried two compiler's remarks ("streets not named by Allen; the sketch names the Harrisburg Road") and no printed road; cleared, remark moved to the note as the compiler's reading.
- place.direction_or_road
  - before: the principal street, then the street running parallel (streets not named by Allen; the sketch names the Harrisburg Road)
  - after: null
- note: rewritten (full text in the ledger)

### POS-E-US-11C-2D-COSTER-154NY-002
- kind engagement; tier documented; fidelity_check passed_full_read -> corrected. **Reason:** Compass gloss "north of the town" is not printed in the passage; marked as the compiler's.
- place.printed
  - before: the brigade line north of the town; retreat impeded by village lots and board fences in rear
  - after: the brigade line; retreat impeded by village lots and board fences in rear [compiler's gloss, not printed: north of the town]

### POS-E-US-11C-2D-004
- kind arrival_road; tier inferred; fidelity_check passed_full_read -> corrected. **Reason:** Pattern 1 (audit): the time-of-day word(s)  in the parenthesised time are not printed anywhere in the cited section; removed from when.printed and recorded in when.description as the compiler's reading.
- when.printed
  - before: (July 1, afternoon)
  - after: (July 1)
- when.description
  - before: null
  - after: compiler's reading removed at the repair pass (not printed anywhere in the cited section): afternoon; compiler's reading removed at the repair pass (not printed anywhere in the cited section): ; compiler's reading removed at the repair pass (not printed anywhere in the cited section): ; compiler's reading removed at the repair pass (not printed anywhere in the cited section): 

### POS-E-US-11C-3D-SCHIMMELFENNIG-157NY-003
- kind engagement; tier documented; fidelity_check passed_full_read -> corrected. **Reason:** "north of the town" is printed only in the section's monument caption, not in Carmichael's address; attribution made explicit.
- place.printed
  - before: this field (north of the town), marching forward through the pouring rain storm
  - after: this field [monument caption of the section: north of the town], marching forward through the pouring rain storm

### POS-E-US-11C-2D-COSTER-27PA-004
- kind engagement; tier inferred; fidelity_check passed_full_read -> corrected. **Reason:** Pattern 1 (audit): the time-of-day word(s)  in the parenthesised time are not printed anywhere in the cited section; removed from when.printed and recorded in when.description as the compiler's reading.
- when.printed
  - before: (evening, July 2)
  - after: (July 2)
- when.description
  - before: null
  - after: compiler's reading removed at the repair pass (not printed anywhere in the cited section): evening; compiler's reading removed at the repair pass (not printed anywhere in the cited section): ; compiler's reading removed at the repair pass (not printed anywhere in the cited section): ; compiler's reading removed at the repair pass (not printed anywhere in the cited section): 

### POS-E-US-11C-2D-COSTER-73PA-003
- kind arrival_road; tier documented; fidelity_check passed_full_read -> corrected. **Reason:** Audit minor: road of approach "the Emmitsburg road" was inferred from the junction name; the passage never says the corps marched on it. direction_or_road cleared, reading moved to the note.
- place.direction_or_road
  - before: the Emmitsburg road (the corps followed the First Corps "on the road"); halt at the junction with the Taneytown road
  - after: null
- note: rewritten (full text in the ledger)

### POS-E-US-11C-2D-COSTER-73PA-004
- kind position; tier documented; fidelity_check passed_full_read -> corrected. **Reason:** Audit tier check: the claim embedded a compiler's (Bates) sentence in a documented claim; Bates' clause moved to its own inferred claim -010. Time-of-day gloss "afternoon" removed.
- when.printed
  - before: (afternoon, July 1)
  - after: (July 1, after arriving shortly after noon and the order to retire to this side of the town)
- activity
  - before: When the corps was ordered to retire to the south side of the town and Steinwehr's batteries opened, the 73rd was deployed across the Emmitsburg and Baltimore roads facing north; Bates: it charged through the orchard just below the cemetery, checking the pursuit, and occupied the houses on either side of the Baltimore pike.
  - after: When the corps was ordered to retire to this side of the town and the division's batteries, by command of General von Steinwehr, opened fire, the 73rd Pennsylvania was deployed across the Emmitsburg and Baltimore roads, facing north, protecting the corps in its retreat through the town.
- note: rewritten (full text in the ledger)

### POS-E-US-11C-2D-COSTER-73PA-005
- kind movement; tier documented -> inferred; fidelity_check passed_full_read -> corrected. **Reason:** The text lies after the words "Bates' history says of this service" in Colonel Moore's address and no end of that quotation is printed (a second "Bates' history says" opens the third-day text): it is Bates' account quoted by Moore, not Moore's own statement; author rule gives inferred.
- author
  - before: Colonel William Moore (73rd Pennsylvania; dedication address)
  - after: Bates' History of Pennsylvania Volunteers, as quoted in Colonel Moore's address
- note: rewritten (tier-lowered prefix added) (full text in the ledger)

### POS-E-US-11C-2D-COSTER-73PA-006
- kind position; tier documented -> inferred; fidelity_check passed_full_read -> corrected. **Reason:** The text lies after the words "Bates' history says of this service" in Colonel Moore's address and no end of that quotation is printed (a second "Bates' history says" opens the third-day text): it is Bates' account quoted by Moore, not Moore's own statement; author rule gives inferred.
- author
  - before: Colonel William Moore (73rd Pennsylvania; dedication address)
  - after: Colonel William Moore (73rd Pennsylvania; dedication address), or Bates' History as quoted in it (the text follows "Bates' history says of this service" with no end of quotation printed)
- note: rewritten (tier-lowered prefix added) (full text in the ledger)

### POS-E-US-11C-2D-COSTER-73PA-007
- kind night_position; tier documented -> inferred; fidelity_check passed_full_read -> corrected. **Reason:** "night of July 2" was not printed (the passage prints the charge "near dusk" and "until the morning of the 3d"); replaced by the printed words. The text lies after the words "Bates' history says of this service" in Colonel Moore's address and no end of that quotation is printed (a second "Bates' history says" opens the third-day text): it is Bates' account quoted by Moore, not Moore's own statement; author rule gives inferred.
- author
  - before: Colonel William Moore (73rd Pennsylvania; dedication address)
  - after: Colonel William Moore (73rd Pennsylvania; dedication address), or Bates' History as quoted in it (the text follows "Bates' history says of this service" with no end of quotation printed)
- when.printed
  - before: after the repulse (night of July 2) until the morning of the 3d
  - after: after the repulse (near dusk, July 2) until the morning of the 3d
- note: rewritten (tier-lowered prefix added) (full text in the ledger)

### POS-E-US-11C-2D-COSTER-73PA-009
- kind movement; tier documented -> inferred; fidelity_check passed_full_read -> corrected. **Reason:** This text is inside the Bates quotation that opens "Bates' history says of the Seventy-third's third day" (the sister claim -008, same quotation, is already inferred). The text lies after the words "Bates' history says of this service" in Colonel Moore's address and no end of that quotation is printed (a second "Bates' history says" opens the third-day text): it is Bates' account quoted by Moore, not Moore's own statement; author rule gives inferred.
- author
  - before: Colonel William Moore (73rd Pennsylvania; dedication address)
  - after: Bates' History of Pennsylvania Volunteers, as quoted in Colonel Moore's address
- note: rewritten (tier-lowered prefix added) (full text in the ledger)

### POS-E-US-11C-3D-KRZYZANOWSKI-75PA-001
- kind departure; tier documented -> inferred; fidelity_check passed_full_read -> corrected. **Reason:** Author is First Sergeant H. Nachtigall, a non-commissioned member and not an officer: author rule gives inferred.
- note: rewritten (tier-lowered prefix added) (full text in the ledger)

### POS-E-US-11C-3D-KRZYZANOWSKI-75PA-002
- kind march; tier documented -> inferred; fidelity_check passed_full_read -> corrected. **Reason:** "forenoon" is not printed (broke camp "early on the morning of July 1"; orders received within five miles of Gettysburg; no hour); removed. Author is First Sergeant H. Nachtigall, a non-commissioned member and not an officer: author rule gives inferred.
- when.printed
  - before: (forenoon, July 1)
  - after: (July 1)
- note: rewritten (tier-lowered prefix added) (full text in the ledger)

### POS-E-US-11C-3D-KRZYZANOWSKI-75PA-003
- kind arrival_road; tier documented -> inferred; fidelity_check passed_full_read -> corrected. **Reason:** Author is First Sergeant H. Nachtigall, a non-commissioned member and not an officer: author rule gives inferred.
- note: rewritten (tier-lowered prefix added) (full text in the ledger)

### POS-E-US-11C-3D-KRZYZANOWSKI-75PA-004
- kind engagement; tier documented -> inferred; fidelity_check passed_full_read -> corrected. **Reason:** "afternoon" is not printed (about half-past one o'clock is); replaced by the printed hour. Author is First Sergeant H. Nachtigall, a non-commissioned member and not an officer: author rule gives inferred.
- when.printed
  - before: for several hours (afternoon, July 1)
  - after: for several hours (from about half-past one o’clock, July 1)
- note: rewritten (tier-lowered prefix added) (full text in the ledger)

### POS-E-US-11C-3D-KRZYZANOWSKI-75PA-005
- kind position; tier documented -> inferred; fidelity_check passed_full_read -> corrected. **Reason:** "evening of July 1" is not printed; replaced by the printed sequence (after passing through the town). Author is First Sergeant H. Nachtigall, a non-commissioned member and not an officer: author rule gives inferred.
- when.printed
  - before: (evening of July 1) where it remained during the course of the battle
  - after: (July 1, after the retreat through the town) where it remained during the course of the battle
- note: rewritten (tier-lowered prefix added) (full text in the ledger)

### POS-E-US-CAV-1D-DEVIN-6NY-001
- kind arrival_road; tier documented; fidelity_check passed_full_read -> corrected. **Reason:** direction_or_road "from Emmitsburg to Gettysburg (the Emmitsburg road by the places named)" named a road the passage does not print (the itinerary is a list of places); cleared, the places stay in place.printed.
- place.direction_or_road
  - before: from Emmitsburg to Gettysburg (the Emmitsburg road by the places named; road not named)
  - after: null

### POS-E-US-CAV-1D-DEVIN-6NY-002
- kind position; tier documented; fidelity_check passed_full_read -> corrected. **Reason:** Audit UNSUPPORTED_HERE (no error): the rest of the claim is in the inscription of the same section; supporting quotes added.
- source.supporting_quotes
  - before: null
  - after: [NY3-S019 p.1131~1132] right of the York Road, then RETIRED TO CeMETERY HiLL, ONE SQUADRON BEING AMONG
- note: rewritten (full text in the ledger)

### POS-E-US-CAV-1D-DEVIN-6NY-004
- kind departure; tier documented; fidelity_check passed_full_read -> corrected. **Reason:** Anchor was Devin's report quoted in Heermance's address (a brigade commander quoted in an address, author rule); the inscription of the same section states the same movement for the regiment and is now the anchor, Devin's text is a supporting quote. Road gloss cleared, and the Taneytown Road gazetteer link (taken from the town name) cleared with it.
- author
  - before: Col. W. L. Heermance (6th New York Cavalry; dedication address with appended memoranda) quoting Devin's official report
  - after: monument inscription (as printed by the commission); Devin's official report, reprinted in Heermance's address, corroborates
- place.direction_or_road
  - before: to Taneytown (the Taneytown Road by inference; not named)
  - after: null
- place.gazetteer_ref
  - before: GZ-042
  - after: null
- activity
  - before: Inscription and Devin's report (reprinted): after relief by the Third Corps on July 2 the brigade marched to Taneytown and bivouacked, and on July 3 to Westminster, whence it moved with Buford's division in pursuit.
  - after: Inscription: after relief by troops of the 3d Corps on the morning of July 2 the regiment moved to Taneytown and on the third to Westminister, from which place it moved with Buford's division in pursuit. Devin's official report (reprinted in the address) says the brigade was ordered to march to Taneytown, bivouacked, and marched the next morning, July 3, to Westminster.
- source.quote
  - before: we were ordered to march to Taneytown where we bivouacked, and marched the next
  - after: ThEN MOVED TO TaNEYTOWN and on the third to Westminister
- source.supporting_quotes
  - before: null
  - after: [NY3-S019 p.1135~1136] we were ordered to march to Taneytown where we bivouacked, and marched the next
- note: rewritten (full text in the ledger)

### POS-E-US-CAV-1D-GAMBLE-8NY-001
- kind arrival_road; tier documented; fidelity_check passed_full_read -> corrected. **Reason:** direction_or_road "through the town to the Cashtown Pike (the road into the town not named)" is not a road of approach printed by the passage; cleared (the Cashtown Pike stays in place.printed as the bivouac location).
- place.direction_or_road
  - before: through the town to the Cashtown Pike (the road into the town not named)
  - after: null

### POS-E-US-CAV-1D-001
- kind position; tier documented -> inferred; fidelity_check passed_full_read -> corrected. **Reason:** Division-level statement (Buford's division formed line along Seminary Ridge) by Lieut. Col. Bentley of the 9th New York Cavalry: not the division's own officer; same pattern as the audit's CAV-3D-003. Author rule gives inferred.
- note: rewritten (tier-lowered prefix added) (full text in the ledger)

### POS-E-US-CAV-1D-002
- kind night_position; tier documented -> inferred; fidelity_check passed_full_read -> corrected. **Reason:** Division-level statement (the right of Buford's cavalry line on the night of June 30) by Brevet Lieut. Col. Bean of the 17th Pennsylvania Cavalry: not the division's own officer; same pattern as the audit's CAV-3D-003. Author rule gives inferred.
- note: rewritten (tier-lowered prefix added) (full text in the ledger)

### POS-E-US-CAV-1D-DEVIN-17PA-003
- kind movement; tier documented; fidelity_check passed_full_read -> corrected. **Reason:** "afternoon" is not printed; removed (the passage ties the movement to the Eleventh Corps yielding).
- when.printed
  - before: (afternoon, July 1, when the Eleventh Corps yielded)
  - after: (July 1, when the Eleventh Corps yielded)

### POS-E-US-CAV-1D-DEVIN-17PA-004
- kind night_position; tier documented; fidelity_check passed_full_read -> corrected. **Reason:** "evening" is not printed (the passage says the sun set after this); replaced by the printed sequence.
- when.printed
  - before: (evening, July 1)
  - after: (July 1, the retirement from the first to the second position)

### POS-E-US-CAV-3D-FARNSWORTH-18PA-002
- kind engagement; tier documented; fidelity_check passed_full_read -> corrected. **Reason:** Audit minor: "forenoon" for the Hanover fight is not printed (the passage gives the date, "left Littlestown early in the morning", and 2 p. m. for leaving Hanover, no hour for the fight); removed.
- when.printed
  - before: (forenoon, June 30)
  - after: (June 30)

### POS-E-US-CAV-3D-FARNSWORTH-002
- kind march; tier documented; fidelity_check passed_full_read -> corrected. **Reason:** direction_or_road "through Abbottstown to Berlin (outside the loaded ground)" is a list of places, not a printed road; cleared (places stay in place.printed).
- place.direction_or_road
  - before: through Abbottstown to Berlin (outside the loaded ground)
  - after: null

### POS-E-US-CAV-3D-FARNSWORTH-18PA-003
- kind march; tier documented; fidelity_check passed_full_read -> corrected. **Reason:** direction_or_road "through Abbottstown and New Oxford to Hunterstown (outside the loaded ground)" is a list of places, not a printed road; cleared.
- place.direction_or_road
  - before: through Abbottstown and New Oxford to Hunterstown (outside the loaded ground)
  - after: null

### POS-E-US-CAV-3D-FARNSWORTH-003
- kind march; tier documented; fidelity_check passed_full_read -> corrected. **Reason:** direction_or_road named the Baltimore pike as the road of approach; the passage prints it only as the place of a short rest. Cleared, reading moved to the note as the compiler's.
- place.direction_or_road
  - before: the Baltimore pike (at its Rock Creek crossing), then to the left of the line past Little and Big Round Top
  - after: null
- note: rewritten (full text in the ledger)

### POS-E-US-CAV-3D-FARNSWORTH-18PA-004
- kind position; tier documented; fidelity_check passed_full_read -> corrected. **Reason:** Compass gloss "(south of Big Round Top)" is not printed; marked as the compiler's.
- place.printed
  - before: the woods to the rear of the monument (south of Big Round Top), with Elder's battery; skirmish line to the left, at one time almost reaching the Emmitsburg road
  - after: the woods to the rear of the monument [compiler's gloss, not printed: south of Big Round Top], with Elder's battery; skirmish line to the left, at one time almost reaching the Emmitsburg road

### POS-E-US-CAV-3D-CUSTER-5MI-001
- kind march; tier documented -> inferred; fidelity_check passed_full_read -> corrected. **Reason:** Author is Kidd, a captain of the 6th Michigan, speaking of another regiment (or of the division): not that unit's own officer; author rule gives inferred.
- note: rewritten (tier-lowered prefix added) (full text in the ledger)

### POS-E-US-CAV-3D-CUSTER-7MI-001
- kind march; tier documented -> inferred; fidelity_check passed_full_read -> corrected. **Reason:** Author is Kidd, a captain of the 6th Michigan, speaking of another regiment (or of the division): not that unit's own officer; author rule gives inferred.
- note: rewritten (tier-lowered prefix added) (full text in the ledger)

### POS-E-US-CAV-3D-CUSTER-5MI-002
- kind arrival_road; tier documented -> inferred; fidelity_check passed_full_read -> corrected. **Reason:** Author is Kidd, a captain of the 6th Michigan, speaking of another regiment (or of the division): not that unit's own officer; author rule gives inferred.
- note: rewritten (tier-lowered prefix added) (full text in the ledger)

### POS-E-US-CAV-3D-CUSTER-5MI-003
- kind departure; tier documented -> inferred; fidelity_check passed_full_read -> corrected. **Reason:** Audit UNSUPPORTED_HERE: the Littlestown night march is on p. 138 of the same section; cited as a supporting quote. Compiler's gloss "after returning there from Gettysburg" removed. Author is Kidd, a captain of the 6th Michigan, speaking of another regiment (or of the division): not that unit's own officer; author rule gives inferred.
- place.printed
  - before: from Emmitsburg (after returning there from Gettysburg); all-night march to Littlestown
  - after: from Emmitsburg; an all-night march to Littlestown, arriving at daylight (p. 138)
- place.gazetteer_ref
  - before: GZ-072
  - after: null
- source.supporting_quotes
  - before: null
  - after: [MI-S011 p.138] The Fifth and Sixth Michigan, after an all-night’s march, also arrived at Littlestown at
- note: rewritten (tier-lowered prefix added) (full text in the ledger)

### POS-E-US-CAV-3D-CUSTER-1MI-001
- kind position; tier documented -> inferred; fidelity_check passed_full_read -> corrected. **Reason:** Author is Kidd, a captain of the 6th Michigan, speaking of another regiment (or of the division): not that unit's own officer; author rule gives inferred.
- note: rewritten (tier-lowered prefix added) (full text in the ledger)

### POS-E-US-CAV-3D-CUSTER-7MI-002
- kind position; tier documented -> inferred; fidelity_check passed_full_read -> corrected. **Reason:** Author is Kidd, a captain of the 6th Michigan, speaking of another regiment (or of the division): not that unit's own officer; author rule gives inferred.
- note: rewritten (tier-lowered prefix added) (full text in the ledger)

### POS-E-CS-CAV-FLEE-001
- kind position; tier inferred; fidelity_check passed_full_read -> corrected. **Reason:** Pattern 1 (audit): the time-of-day word(s)  in the parenthesised time are not printed anywhere in the cited section; removed from when.printed and recorded in when.description as the compiler's reading.
- when.printed
  - before: (forenoon, June 30)
  - after: (June 30)
- when.description
  - before: null
  - after: compiler's reading removed at the repair pass (not printed anywhere in the cited section): forenoon; compiler's reading removed at the repair pass (not printed anywhere in the cited section): ; compiler's reading removed at the repair pass (not printed anywhere in the cited section): ; compiler's reading removed at the repair pass (not printed anywhere in the cited section): 

### POS-E-US-CAV-3D-003
- kind arrival_road; tier documented -> inferred; fidelity_check passed_full_read -> corrected. **Reason:** direction_or_road "(toward Hunterstown)" was a gloss on the road named in the passage ("the road to Abbottstown"); removed. Author is Kidd, a captain of the 6th Michigan, speaking of another regiment (or of the division): not that unit's own officer; author rule gives inferred.
- place.direction_or_road
  - before: the road to Abbottstown (toward Hunterstown)
  - after: the road to Abbottstown
- note: rewritten (tier-lowered prefix added) (full text in the ledger)

### POS-E-US-CAV-3D-CUSTER-6MI-005
- kind engagement; tier documented; fidelity_check passed_full_read -> corrected. **Reason:** "evening" is not printed; replaced by the printed hour that precedes the order to move out (about five o'clock in the afternoon).
- when.printed
  - before: (evening, July 2)
  - after: (July 2, after about five o’clock in the afternoon)

### POS-E-US-CAV-3D-CUSTER-5MI-004
- kind engagement; tier documented -> inferred; fidelity_check passed_full_read -> corrected. **Reason:** "afternoon" is not printed at this event (the cannonade is put between 1 and 2 p. m., "not long thereafter" Custer ordered the advance); replaced by the printed sequence. Author is Kidd, a captain of the 6th Michigan, speaking of another regiment (or of the division): not that unit's own officer; author rule gives inferred.
- when.printed
  - before: (afternoon, July 3)
  - after: (July 3, not long after the cannonade of "between 1 and 2 p. m.")
- note: rewritten (tier-lowered prefix added) (full text in the ledger)

### POS-E-CS-CAV-DIV-002
- kind march; tier inferred; fidelity_check passed_full_read -> corrected. **Reason:** Pattern 1 (audit): the time-of-day word(s)  in the parenthesised time are not printed anywhere in the cited section; removed from when.printed and recorded in when.description as the compiler's reading.
- when.printed
  - before: (forenoon, July 3)
  - after: (July 3)
- when.description
  - before: null
  - after: compiler's reading removed at the repair pass (not printed anywhere in the cited section): forenoon; compiler's reading removed at the repair pass (not printed anywhere in the cited section): ; compiler's reading removed at the repair pass (not printed anywhere in the cited section): ; compiler's reading removed at the repair pass (not printed anywhere in the cited section): 

### POS-E-CS-CAV-JENKINS-001
- kind position; tier inferred; fidelity_check passed_full_read -> corrected. **Reason:** Pattern 1 (audit): the time-of-day word(s)  in the parenthesised time are not printed anywhere in the cited section; removed from when.printed and recorded in when.description as the compiler's reading.
- when.printed
  - before: (forenoon, July 3)
  - after: (July 3)
- when.description
  - before: null
  - after: compiler's reading removed at the repair pass (not printed anywhere in the cited section): forenoon; compiler's reading removed at the repair pass (not printed anywhere in the cited section): ; compiler's reading removed at the repair pass (not printed anywhere in the cited section): ; compiler's reading removed at the repair pass (not printed anywhere in the cited section): 

### POS-E-CS-CAV-CHAMBLISS-001
- kind position; tier inferred; fidelity_check passed_full_read -> corrected. **Reason:** Pattern 1 (audit): the time-of-day word(s)  in the parenthesised time are not printed anywhere in the cited section; removed from when.printed and recorded in when.description as the compiler's reading.
- when.printed
  - before: (forenoon, July 3)
  - after: (July 3)
- when.description
  - before: null
  - after: compiler's reading removed at the repair pass (not printed anywhere in the cited section): forenoon; compiler's reading removed at the repair pass (not printed anywhere in the cited section): ; compiler's reading removed at the repair pass (not printed anywhere in the cited section): ; compiler's reading removed at the repair pass (not printed anywhere in the cited section): 

### POS-E-US-3C-2D-CARR-26PA-001
- kind march; tier documented -> inferred; fidelity_check passed_full_read -> corrected. **Reason:** Road field "via Emmitsburg" named a place, not a road the passage prints; cleared, and the Emmitsburg Road gazetteer link (taken from the town name) cleared with it. Author is Private Thomas V. Cooper, a private and not a regimental officer: author rule (documented only where the regiment's own officer states the fact) gives inferred.
- place.direction_or_road
  - before: via Emmitsburg
  - after: null
- place.gazetteer_ref
  - before: GZ-041
  - after: null
- note: rewritten (tier-lowered prefix added) (full text in the ledger)

### POS-E-US-3C-2D-CARR-26PA-002
- kind arrival_road; tier documented -> inferred; fidelity_check passed_full_read -> corrected. **Reason:** Audit minor: "the road passing the Black Horse Tavern" and "strayed onto the Black Horse Tavern road" went beyond the passage (the tavern is a place; no road is named). direction_or_road cleared, gloss moved to the note as the compiler's reading; the Black Horse Tavern Road gazetteer link (GZ-051, a road the passage does not name) cleared. Author is Private Thomas V. Cooper, a private and not a regimental officer: author rule (documented only where the regiment's own officer states the fact) gives inferred.
- place.direction_or_road
  - before: the road passing the Black Horse Tavern, then back to the right road to Gettysburg
  - after: null
- place.gazetteer_ref
  - before: GZ-051
  - after: null
- note: rewritten (tier-lowered prefix added) (full text in the ledger)

### POS-E-US-3C-2D-CARR-26PA-003
- kind position; tier documented -> inferred; fidelity_check passed_full_read -> corrected. **Reason:** "early morning" is not printed (the passage gives the midnight arrival, a nap, then the awakening); gloss replaced by the printed sequence. Author is Private Thomas V. Cooper, a private and not a regimental officer: author rule (documented only where the regiment's own officer states the fact) gives inferred.
- when.printed
  - before: (early morning, July 2)
  - after: (July 2, after the arrival at midnight and what proved but a nap)
- note: rewritten (tier-lowered prefix added) (full text in the ledger)

### POS-E-US-3C-2D-CARR-26PA-004
- kind position; tier documented -> inferred; fidelity_check passed_full_read -> corrected. **Reason:** Author is Private Thomas V. Cooper, a private and not a regimental officer: author rule (documented only where the regiment's own officer states the fact) gives inferred.
- note: rewritten (tier-lowered prefix added) (full text in the ledger)

### POS-E-US-3C-2D-CARR-26PA-005
- kind engagement; tier documented -> inferred; fidelity_check passed_full_read -> corrected. **Reason:** Author is Private Thomas V. Cooper, a private and not a regimental officer: author rule (documented only where the regiment's own officer states the fact) gives inferred.
- note: rewritten (tier-lowered prefix added) (full text in the ledger)

### POS-E-US-3C-2D-CARR-26PA-006
- kind engagement; tier documented -> inferred; fidelity_check passed_full_read -> corrected. **Reason:** Audit SHIFTED: date field 1863-07-02 departed from the printed 'third day'; and the loss ranking was implied here, stated only in the address opening. Date field now follows the printed words, the other reading is carried; activity reworded. Author is Private Thomas V. Cooper, a private and not a regimental officer: author rule (documented only where the regiment's own officer states the fact) gives inferred.
- when.date
  - before: 1863-07-02
  - after: 1863-07-03
- when.date_reading
  - before: null
  - after: 1863-07-02
- place.printed
  - before: the right of the line of Humphreys' division (third day, as stated)
  - after: the right of the line of Humphreys' division (the sentence is dated 'upon the third day')
- activity
  - before: The speaker says the shock that fell on Humphreys' division, particularly on Carr's First Brigade and on the 26th Pennsylvania which held the right of the line, exceeded any on Pickett's front, Little Round Top, Culp's Hill or Buford's front; the regiment led all Pennsylvania regiments in killed and wounded.
  - after: The speaker says the shock hurled against Humphreys' Division of the Third Corps, especially against Carr's First Brigade and more particularly the 26th Pennsylvania, which held the right of the line, was greater than that at Pickett's front (the stone angle), Little Round Top, Culp's Hill or Buford's dismounted men. He names five Second Corps regiments (124th, 140th and 72nd Pennsylvania; 111th and 126th New York) as approaching the 26th Pennsylvania's losses and says the First Corps regiments he names lost less in killed and wounded in proportion to the number engaged; the opening of the address (pp. 195-196) says the 26th excelled all other Pennsylvania regiments in its losses in killed and wounded in proportion to the number engaged.
- note: rewritten (tier-lowered prefix added) (full text in the ledger)

### POS-E-US-3C-2D-CARR-84PA-001
- kind night_position; tier documented; fidelity_check passed_full_read -> corrected. **Reason:** Author field named the speaker only as "the dedication statement"; the address heading prints Captain Thomas E. Merchant (a regimental officer), recorded so the tier rests on a stated author.
- author
  - before: the 84th Pennsylvania's dedication statement (speaker's own first-person text)
  - after: Captain Thomas E. Merchant (84th Pennsylvania; dedication address)

### POS-E-US-3C-2D-CARR-84PA-002
- kind march; tier documented; fidelity_check passed_full_read -> corrected. **Reason:** Author field completed (address heading: Captain Thomas E. Merchant, a regimental officer). Passage re-read: road to Emmitsburg is printed, tier stands.
- author
  - before: the 84th Pennsylvania's dedication statement (speaker's own first-person text)
  - after: Captain Thomas E. Merchant (84th Pennsylvania; dedication address)

### POS-E-US-3C-2D-CARR-84PA-003
- kind position; tier documented -> inferred; fidelity_check passed_full_read -> corrected. **Reason:** Audit OVERSTATED: the letter only suggests the monument be erected near his headquarters; reworded to the suggestion. Tier lowered: a brigade commander quoted in an address (author rule). Emmitsburg Road gazetteer link cleared: the train was between two towns, no road feature.
- place.printed
  - before: guarding the supply train located between Emmitsburg and Gettysburg (per Carr); with the train until relieved on July 6, when it reported to Carr at Williamsport
  - after: the supply train then located between Emmitsburg and Gettysburg; with the train until relieved on the 6th of July, when it reported to Carr at Williamsport
- place.gazetteer_ref
  - before: GZ-041
  - after: null
- activity
  - before: Carr's letter: on the morning of July 1 the regiment was detailed by an order from headquarters to guard the supply train then located between Emmitsburg and Gettysburg and remained on duty with the train until relieved by another regiment on July 6, when it reported to him at Williamsport; the monument was placed near Carr's headquarters before the second day's engagement, near the Emmitsburg road directly in front of the Rogers house.
  - after: Carr's letter, printed in the 84th Pennsylvania's address: on the morning of July 1 the regiment was detailed by an order from headquarters to guard the supply train then located between Emmitsburg and Gettysburg; it remained on duty with the train until relieved by another regiment on July 6, when it reported to Carr for duty at Williamsport. Carr adds that he would suggest the monument be erected near where his headquarters had been before the second day's engagement, near the Emmitsburg road directly in front of the Roger's House (a suggestion for the monument's site, not a statement that the regiment or its monument stood there).
- note: rewritten (tier-lowered prefix added) (full text in the ledger)

### POS-E-CS-1C-MCLAWS-SEMMES-001
- kind position; tier inferred; fidelity_check passed_full_read -> corrected. **Reason:** Pattern 1 (audit): the time-of-day word(s)  in the parenthesised time are not printed anywhere in the cited section; removed from when.printed and recorded in when.description as the compiler's reading.
- when.printed
  - before: (July 2, afternoon, in the advance on the Federal left)
  - after: (July 2, in the advance on the Federal left)
- when.description
  - before: null
  - after: compiler's reading removed at the repair pass (not printed anywhere in the cited section): afternoon; compiler's reading removed at the repair pass (not printed anywhere in the cited section): ; compiler's reading removed at the repair pass (not printed anywhere in the cited section): ; compiler's reading removed at the repair pass (not printed anywhere in the cited section): 

### POS-E-CS-1C-MCLAWS-WOFFORD-16GA-001
- kind position; tier inferred; fidelity_check passed_full_read -> corrected. **Reason:** Pattern 1 (audit): the time-of-day word(s)  in the parenthesised time are not printed anywhere in the cited section; removed from when.printed and recorded in when.description as the compiler's reading.
- when.printed
  - before: (July 2, afternoon)
  - after: (July 2)
- when.description
  - before: null
  - after: compiler's reading removed at the repair pass (not printed anywhere in the cited section): afternoon; compiler's reading removed at the repair pass (not printed anywhere in the cited section): ; compiler's reading removed at the repair pass (not printed anywhere in the cited section): ; compiler's reading removed at the repair pass (not printed anywhere in the cited section): 

### POS-E-US-11C-2D-COSTER-73PA-010 (NEW)
- kind movement, tier inferred. Note: Split at the repair pass from claim -004, where this Bates clause had been joined to Moore's own statement. Bates' text is quoted inside Moore's address ("Bates' history says of this service"). OCR "Sevonty-tha-d" in the printed line.
- activity: Bates (history of the regiment, quoted by Colonel Moore): as the rear of the Union force was retiring from the town, closely followed by the enemy, the 73rd Pennsylvania was ordered forward, charged through the orchard just below the cemetery, checking the pursuit, and occupied the houses on either side of the Baltimore pike.
- when.printed: (July 1, as the rear of the Union force was retiring from the town); place.printed: the orchard just below the cemetery; the houses on either side of the Baltimore pike; quote: charged through the orchard just below the cemetery (PA1B-S021, p. 424)


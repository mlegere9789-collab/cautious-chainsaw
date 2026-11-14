# Request from bt-timeline (shard tl-03 close-out), 2026-11-14

Files I do not own and what I would like changed in them. Nothing below was edited by me. Detail: GOVERNANCE/horde/tl-03/REPORT.md and GOVERNANCE/timeline_corrections/tl-03.jsonl.

## 1. tools/bt/merge_horde.py (and the files it writes)
- Read GOVERNANCE/timeline_corrections/*.jsonl and overlay, per row id, `corrected_claim.tier`, `verdict`, `tier_change` and `remains_unsupported` on timeline_verified.jsonl (new fields, do not overwrite `status_effective`), as already requested for tl-02.
- New citation shapes in tl-03: `source_id: "COMPUTED"` (the sky rows T1-158 and T1-171: `what`, `value`, `method`, no quote and no offset); `scan` and `report_heading` on every Official Records citation; `image_check` on citations whose digits were read on a page image; `page_running_head_model` where the running-head page differs from the scan-leaf page. Treat the library quotes (`source_id` other than OR27) as citations, not as Official Records quotes.
- The shard's results.jsonl keeps the status words verified, partially_verified, gap, inferred: a row is `verified` only when all its sub-claims are supported and its central one rests on an Official Records citation (5 rows).

## 2. GOVERNANCE/register/ (existing entry)
- EG-TL-T1-116: proposed update in horde/tl-03/proposed-register/tl-03-CO-T1-116.md (title "proposed update of EG-TL-T1-116"): the Official Records give the day-level positions (Kilpatrick Hanover - Abbottstown - Berlin, Merritt near Mechanicstown, Gregg at Hanover Junction and Manchester, Cavalry Corps headquarters at Taneytown); the hours of the marches, Pleasonton's own position and the date of the Hunterstown fight (Jul 1 in a list of Custer's report, Jul 2 at sundown in Kilpatrick's) stay open.
- The 51 proposed entries tl-03-CO-<row>.md replace in substance the nine of 2026-11-04 (tl-03-EG-01..09), which are kept; the integrator decides.

## 3. GOVERNANCE/conflict_register.json and conflicts_structured.json (new conflicts, no default recorded)
Carried as selectable scenarios, no default:
1. T1-121: the hour at which the Fourth Georgia was put in line (about noon, Willis, OR vol. 27 pt. 2 p.584, page image; the OCR text prints 13) against about 1 p. m. (Doles, p.581).
2. T1-147: the loss of the 24th Michigan, 363 (revised return of the First Corps, pt. 1 p.173, page image) against about 399 (316 killed and wounded plus about 80 men and 3 officers missing, Morrow p.269, a sum made by the close-out).
3. T1-164: the arrival of Slocum, between 5 and 6 (Hancock p.368) against about 7 p. m. (Howard p.704, Meade p.115).
4. T1-129 (not a conflict between sources): the printed columns of the Iverson row of the Confederate casualty return (p.342) do not add up; nothing corrected.
Existing defaults applied unchanged: C-038 (T1-140), C-039 (T1-143, T1-163), C-041 (T1-126), C-042 (T1-124), C-043 (T1-151, T1-156).

## 4. Product notes (app data owners)
- Earthworks (rule: none pre-placed, built on screen in the sourced window): on Jul 1 the per-gun works on Cemetery Hill are dated "at dusk" (Wainwright p.357, Hunt p.232); the 107th Pennsylvania threw up breastworks on the left of the hill after the engagement (Roath p.305) and Whittier's battery had temporary earthworks thrown up "during the night" (p.361); no dimensions are printed, none may be shown as documented; nothing begins at 14:00 (T1-127).
- Names: "Herr's Ridge" and "Barlow's Knoll" are later names (Bachelder 1873; the Ohio volume of 1887); the National Park Service has Blocher Knoll, later Barlow Knoll; the reports of 1863 use neither. Do not present them as names used in 1863 (T1-119, T1-128, T1-144).
- Strengths for one-to-one instancing from the page images: 151st Pennsylvania 21 officers and 446 men (McFarland p.328); 24th Michigan 496 (3 field officers, 1 staff, 24 line officers, 468 non-commissioned officers and privates; Morrow p.269, the OCR digits are damaged). Revised-return losses: 151st Pennsylvania 337, 24th Michigan 363 (see item 3).
- Gordon's brigade advanced slowly to within about 300 yards of the line before the charge (T1-144; the first pass had 200); the 26th Georgia was detached to the artillery under Lt. Col. Jones.
- The seed row T1-169 (Cavalry Corps hospital in the Presbyterian Church, Jul 1 evening) is corrected: afternoon, after noon, the 8th Illinois Cavalry's surgeons (Hard 1868) and three surgeons (Beck, Rulison, Vosburg) left with the wounded; no capture stated.
- T1-121: the Fourth Georgia in line at noon, the brigade about 1 p. m.; T1-122: Baxter's interval to the Eleventh Corps was at least 400 yards (Baxter, Doubleday p.248).

## 5. tools/bt/or27_pages.py and or27_find.py (page model of the Official Records)
- The same finding as for tl-02 (request bt-timeline-tl-02-corrections.md, section 5): for the 471 Official Records citations of tl-03 the running-head model differs from the scan leaf in 16 (interpolated "~" pages and tabular pages: the organization of the Eleventh Corps is on p.164, model ~167; the revised casualty return p.173 and p.174, model ~171 and ~172; Willis p.584, model ~582; Doles p.582, model 581). Every cited leaf header was read on the page image; the list is in horde/tl-03/closeout/audit/viewed_leaves.json.
- Library pages: an item's page index can be one leaf out of step, and a running head damaged by the OCR ("Getty shurg", "I30", "80" for 30) makes a regex page rule pick the previous page: Pennsylvania at Gettysburg vol. 1 (leaf alignment fails for its first leaves; decided by hand), Fremantle p.254 (not 253), Meade's Life and Letters p.56 (not 55), New York at Gettysburg vol. 1 p.21 (not 58). Decisions with their reasons: horde/tl-03/library_pages.json.

## 6. Owner-only steps
- The HMDB markers 17936 and 17939 cited by the seed (T1-135, T1-169) could not be read (the host did not serve the page): the owner may read them in a browser and send the text.

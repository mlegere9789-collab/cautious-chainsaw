# Request from bt-timeline (shard tl-02 close-out), 2026-11-13, updated 2026-11-14 after the page audit and the review pass

Files I do not own and what I would like changed in them. Nothing below was edited by me.

## 1. tools/bt/merge_horde.py (and the files it writes)
- Read GOVERNANCE/timeline_corrections/*.jsonl and overlay, per row id, `corrected_claim.tier`, `verdict` and `remains_unsupported` on timeline_verified.jsonl (new fields, do not overwrite `status_effective`). The tl-02 lines carry `tier_change` (seed, shard_effective, corrected) so a promotion can be seen and gated.
- Treat `library_passages` (verbatim quotes from non-OR texts) as citations: they are stored under the key `verbatim` on purpose so that horde/OR-RECHECK/or_recheck.py does not try to find them in the Official Records.
- Expected effect on status_effective for tl-02: rows T1-058..T1-115 keep status `verified` only where the corrected claim is documented; partially supported rows are stored as `inferred`.

## 2. GOVERNANCE/register/ (existing entries)
Proposed updates are in horde/tl-02/proposed-register/ (titles start with "proposed update of EG-TL-T1-0xx"):
- EG-TL-T1-066: close at corps level (III Corps Bridgeport, V Corps Union Mills, II Corps Uniontown); brigade level stays open (tl-02-CO-T1-066).
- EG-TL-T1-067: picket posts and camp layout now documented; fires, cooking and civilians stay open (tl-02-CO-T1-067).
- EG-TL-T1-071: picket posts documented at unit and post level (Beveridge 1891; Cheney 1901); coordinates and the advance-post holder stay open (tl-02-CO-T1-071).
- EG-TL-T1-073: morning civilian activity documented from about breakfast; dawn stays open (tl-02-CO-T1-073).
- EG-TL-T1-104: unchanged, still no location of aid posts (tl-02-CO-T1-104).
The older proposed entries tl-02-EG-007, -008 and -012 are marked "proposed closed" by the close-out evidence (Biddle 1880; the 76th New York address in New York vol. 2; U.S. Cavalry Tactics 1841/1855; the carbine statement of EG-012 is from a 1910 study of the Chancellorsville campaign that is bound into the New York vol. 2 item, not from that volume); the integrator decides.

## 3. GOVERNANCE/conflict_register.json and conflicts_structured.json (new conflicts found, no default recorded)
Carry as selectable scenarios, none has a recorded delegated default:
1. First contact hour on Jul 1 (T1-082): 05:30 / 07:30 / about 08:00 / about 08:30 / 08:00-09:00 / 09:30 (sources in timeline_corrections/tl-02.jsonl, row T1-082).
2. First shot (T1-083): Lt. Jones 8th Illinois 7:30 (Illinois Monuments 1892) / 9th New York corporal about 5:30 (Cheney 1901, Hall 1908) / Roder's first Union gun (Calef).
3. Pipe Creek circular written late Jun 30 (Meade 1913) or dated Jul 1 (OR heading and Meade report) (T1-061).
4. Reynolds' message to Meade: left about 10:00 (Weld diary; Meade 1913) against 09:00-09:30 (row) (T1-091).
5. Hall's retirement about 11:10 on his own clock against 10:45 in the row, and one or two pieces left (Hall, Calef) (T1-106).
6. Sky and ground on the morning of Jul 1: clear (Beveridge) / muggy, roads very bad (Weld) / very cloudy (Jacobs, via a secondary summary not found in his 1864 text) (T1-075, T1-080).
7. John Burns: about noon (Eustice, Huidekoper) against 10:15-10:30 (row) (T1-100).
8. 147th New York losses 207 (Cutler) against 301 counting missing (Fox) (T1-103).
9. The regiment beside which Reynolds fell (T1-099): the 2nd Wisconsin, leading regiment of the charge (Bates 1875) against the 19th Indiana (New York at Gettysburg vol. 1, 1900); wound: head (Bachelder, Meade 1913), brain with sharp-shooters named (Bates), neck (Weld diary and letter), a shell (Heth).
10. Hour at which Howard took command of the field (T1-112): about 11:30 (Howard OR p.702; Biddle 1880) against 10:30 (Slocum's communication in the OR, p.768).
11. Arrival of Rodes's division and Carter's battalion on Oak Hill (T1-115): about noon to 1 p.m. (Daniel, Doles, Owens) against about 2:30 p.m. engaged (Lee, OR vol. 27 pt. 2, p.317).
12. Head of the Eleventh Corps through the town (T1-102): about 12:30 (Howard OR p.702) / 12:45 (Pierce 1914) against the before-noon window of the row.
13. Position of the XI Corps on the night of Jun 30 (T1-067): Emmitsburg (Howard, OR vol. 27 pt. 1 p.701, and the Army itinerary p.144; Beveridge 1891) against the right bank of Marsh Creek, 4 miles south-west of Gettysburg (Jacobs 1864). The I Corps is near Marsh Run in both.
14. Hour at which Reynolds' attack began (T1-098): about 10.15 (Doubleday p.245, Wadsworth p.266) against about 10.45 (Howard's dispatch of 5 p.m., p.696); neither is the hour of the Iron Brigade's charge.
Existing conflict C-041 (Rodes' attack start, default 14:00 inside 13:30-14:30) is for the infantry attack and was not applied to T1-115 (arrival and first fire of Carter's battalion, noon to 14:30 scenarios).
Existing conflict C-040 (Reynolds' death) was applied unchanged; new scenario values were added for the hour (about 10:00 Beveridge; the 10:15 of the New York narrative), the cause (rifle volley, sharp-shooter, shell) and the regiment (item 9).

## 4. Product notes (app data owners)
- The row T1-099 text "Show a rifle round; do not show a shell" is a scenario, not a finding: Heth (OR p.637) says a shell.
- Calef's sections: Newman commanded the LEFT section and Pergel the CENTRE section (Calef's own report), not the other way round; it was Pergel's section that was withdrawn because the woods came within 200 yards.
- Archer's brigade has five units (13th Alabama, 5th Alabama Battalion, 1st, 7th, 14th Tennessee).
- T1-110: the 11th Pennsylvania (Coulter) and the 97th New York (Wheelock) belong to Baxter's Second Brigade of Robinson's division (Baxter p.307; Coulter p.292), not to a "Coulter's brigade"; both put the brigade at the front at about 11 a.m. Doubleday gives no hour for the arrival of the two divisions, so "afternoon" is not his statement.
- T1-097: "Hall replaces Calef" is supported (Calef p.1031: Hall took the position held by Roder's section; New York vol. 1: Hall relieves Calef's guns), but the OR also has the reverse later (Calef's left and centre sections reoccupy the ground Hall abandoned: Calef; Hunt p.229; Doubleday p.246).
- T1-098: the Iron Brigade enveloping Archer's right is carried by Bachelder (1873), Meade (1913), Beveridge (1891) and Morrow (OR p.267); no report uses the word outflank.
- T1-063: Devin's brigade lay north of the railroad and Gamble's south of it (Maine 1898); Devin's exact camp site stays open.
- "Grey Eagle", "Herbst Woods", the 7-mile cavalry front and the 15-foot cut depth are in no text read; do not show them as documented.

## 5. tools/bt/or27_pages.py and or27_find.py (page model of the Official Records), found in the audit of 2026-11-13/14
- The printed page that `or27_find.verify()` and the search hits report comes from the running heads of the OCR text and is interpolated ("~") where the heads are lost. For the 222 Official Records citations of tl-02 it differs from the printed page of the scan leaf for 30 citations, by up to 5 pages on tabular pages (Heth's division in the organization of the Army of Northern Virginia: model "~284-285", scan leaf and page image 289; Pegram's battalion 290 not "~285"; Cutler's report 281-282 not 280; the Cavalry Corps organization 166 not "~168"; Ewell p.444, Devin p.938, Pleasonton p.914 and Buford p.930 lose their "~"). Pages were read on the page image for every leaf cited (PDF page = leaf + 1 of tmp/kit-plan/or27-pdf/<identifier>.pdf; the list is in tmp/tl-02/audit/viewed_leaves.json).
- Request: let or27_find report the page of tools/bt/kit_or27_leafmap.py (docs/battle-theatre/kit/evidence/or27_leaf_pages.json) where that map has the leaf and a printed page, and keep the running-head page only as a fallback, so that every shard's citations carry the printed page of the scan. Other shards that cite pages from or27_find should be re-checked against the map (tl-02 stores both values: `printed_page` and, when they differ, `page_running_head_model`; citations also carry `scan` with the archive.org identifier, leaf and PDF page).
- The same audit found that the page index of three archive.org items is out of step by one leaf (Alexander 1907, Pennsylvania at Gettysburg 1914 vol. 2, Fox 1889) and that the index of New York at Gettysburg vol. 2 counts plate leaves; any shard that takes library pages from an item's page index should check the printed head at the top of the leaf (method and decisions: horde/tl-02/library_pages.json and tmp/tl-02/audit/libpages_final.py).

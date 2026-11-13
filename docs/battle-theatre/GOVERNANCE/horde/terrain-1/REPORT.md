# Shard terrain-1 report: R13.0000 and R13.G-01..G-16 (17 items), close-out 2026-11-13

The first 17 R13 ids are R13.0000 and gun emplacements G-01..G-16 (PDF B.7.5). All 17 rows of `results.jsonl` were re-checked against the local texts and rewritten in `GOVERNANCE/evidence_corrections/terrain-1.jsonl`. The earlier text of this report (2026-11-04) is kept at the end as superseded; `results.jsonl` is unchanged.

## Result

Verdicts: confirmed 4, corrected 6, partially_supported 6, unsupported 0, gap 1 (17 rows). Sub-claims 129: tier documented 105, inferred 15, open_gap 9; support supported 64, partial 23, conflict 29, contradicted 5, unsupported 8. Citations 419: 307 Official Records (258 also found in at least one of four other archive.org scans of the same volumes), 41 National Park Service documents and pages, 71 books of the library. Every citation carries the verbatim quote, the character offset in the local file, the file's sha256 and, for the Official Records, the report id and the printed page read from the running heads; for library books a printed page appears only where it was read by hand from the text layer (otherwise a marked heuristic page hint).

| row | verdict | sub-claims (documented / inferred / open gap) | headline |
|---|---|---|---|
| R13.0000 | gap | 3 (2 / 0 / 1) | cannot pass: none of the 16 gun rows is closed (4 confirmed, 6 corrected, 6 partially supported, all open_gaps); no gate run |
| R13.G-01 | corrected | 12 (10 / 1 / 1) | centre (Pergel), not left, section withdrawn; 'hollow' unsupported; relief clocks 10:00 / 10:15 / 10:45; the First Shot marker is the Wisler Farm marker |
| R13.G-02 | corrected | 7 (6 / 1 / 0) | guns not behind the rail work (Breck's behind a stone wall on the crest, the others in the open); 22 guns (Hunt) vs 12 (Wainwright); withdrawal 16:00-17:00 |
| R13.G-03 | confirmed | 10 (8 / 1 / 1) | the 2026-11-04 'conflict' is withdrawn: per-gun works at dusk 1 Jul, finished the morning of 2 Jul, called lunettes in the state books; dimensions open |
| R13.G-04 | partially_supported | 8 (6 / 1 / 1) | 14 + 2 guns (Andrews) vs 20 (New York 1900); four left; the 37 Union guns unsupported; the PDF's five battery names are in the OR's organization table; 'Benner's Hill' found in the library |
| R13.G-05 | partially_supported | 9 (8 / 1 / 0) | arrival 09:00 (1888 address) and 4 + 2 layout documented; the 18:00 section shift unsupported; capture attribution a conflict (Smith himself supposed the Twelfth Corps) |
| R13.G-06 | corrected | 7 (6 / 1 / 0) | first fire on arrival about 16:30, not 17:45; hauling differs among four retrospective books |
| R13.G-07 | partially_supported | 8 (6 / 1 / 1) | 4 p.m. / 4:30 clocks documented; no source clock for the canister; 'Wheatfield Road' and Knox's gun unsupported; position conflict |
| R13.G-08 | confirmed | 6 (5 / 1 / 0) | 36 guns found in Alexander 1907 (18 + 18); the OR gives guns only for Taylor and (3 Jul) Moody; Alexander, not Huger, was to control the other battalions |
| R13.G-09 | confirmed | 8 (7 / 0 / 1) | 16 guns in four batteries of four; pre-existing fences at the 2 Jul position; the brick house stays unplaced |
| R13.G-10 | corrected | 10 (8 / 2 / 0) | second position = Trostle wall corner (Milton, NPS, three books); hand-to-hand fighting and the 21st Mississippi documented by Hunt in B&L; 65 horses is in Hunt (B&L, one scan) and Fox, Milton's own figure is 60; 18:30 unsupported |
| R13.G-11 | corrected | 8 (7 / 1 / 0) | split confirmed: 2 Jul improvised (Hunt in B&L: 'some twentyfive guns'), 3 Jul prepared (39 guns, slight earthwork); '6 to 23' unsupported |
| R13.G-12 | corrected | 9 (7 / 1 / 1) | in place the morning of 2 Jul; one gun serviceable at 14:45; no earthwork; double canister at 100 yd unsupported |
| R13.G-13 | partially_supported | 6 (5 / 0 / 1) | Union counts 75/80/77/108/166-220; Hancock's order documented in Hart and Hunt (B&L); 120 and 34 unsupported |
| R13.G-14 | partially_supported | 6 (5 / 1 / 0) | Confederate counts nearly 150 to 172; 179 not found; 'over two miles' is the NPS length of Seminary and Warfield Ridges, not of the guns; Poague's and Reilly's lunettes (NPS) |
| R13.G-15 | confirmed | 5 (4 / 1 / 0) | ten rifles either side of the cut confirmed; Alexander has 20; Oak Hill = NPS name |
| R13.G-16 | partially_supported | 7 (5 / 1 / 1) | two Whitworths on Oak Hill documented (the park's tablet and original Whitworths, 1906); signal by Miller's two guns (four witnesses); the 3-inch pair and a Whitworth signal unsupported |

Every row keeps status `open_gaps` (something stays unsupported, conflicting or unplaced and is registered); none is closed, none passes. Verdict meaning used here: confirmed = every printed claim is supported (additions allowed); corrected = at least one printed claim is contradicted or replaced; partially_supported = some printed claim is unsupported and none is contradicted; gap = cannot be decided or cannot pass. Register entries: `proposed-register/terrain-1-EG-01..17.md` (rewritten under the same file names; each names the existing register id EG-0149..EG-0165 of its row).

## What this close-out changed against the 2026-11-04 shard

- G-03 was called a conflict with the seed ('lunettes by 16:00 Jul 2' contradicted by the OR). The library shows otherwise: the OR says a small earthwork in front of each gun at dusk 1 Jul (Wainwright p.357, Hunt p.232, Whittier p.361, Breck p.363); Pennsylvania at Gettysburg (1914) says Cooper's men finished four lunettes on the morning of 2 Jul and the New York books call the works lunettes or redans. Verdict now confirmed with additions (builder named where the report names one; dimensions open).
- G-08's 36 guns (called a Wikipedia figure) are Alexander's 1907 memoir: 36 guns in action against the Peach Orchard about 3:45 p.m., 18 of Cabell's and 18 of his own. G-09: Cabell's four batteries have four guns each in their own reports (16, not the memoir's 18). G-04: Andrews' report counts 14 guns on the hill plus two 20-pounder Parrotts; the 'about 20' of the PDF is New York at Gettysburg (1900); the PDF's five battery names are in the OR's organization table.
- G-10: the 'second position behind an existing wall near Trostle's house' is documented (Milton: a position near which two stone walls met at an obtuse angle; the NPS Cultural Landscapes Inventory ties them to the Trostle farm; Hunt in Battles and Leaders, Meade and Toombs place the stand near the Trostle house). Hunt in Battles and Leaders III p.310 also documents what the PDF calls hand-to-hand fighting and the 21st Mississippi, and reads '65 out of 88 horses killed or wounded' (one scan; the digits could not be checked in a second scan). Milton's own figure is 45 + 15 = 60; Fox (1889) prints Milton as 50 + 15 = 65 and Hunt in the Century as 80 of 88: the PDF's '65 vs 80 of 88' are Fox's two figures. The earlier claim that '65' is only Fox's misreading is withdrawn.
- G-11: besides the documented split (2 Jul evening improvised, 3 Jul morning a slight earthwork, 39 guns), Hunt in Battles and Leaders p.310 gives 'some twentyfive guns' for the Plum Run line when it was formed on 2 Jul: a retrospective value next to the PDF's unsupported '6 to 23'.
- G-12: Cushing's battery was in place on the morning of 2 Jul (Hunt, Webb 6.30 a.m.), not the late afternoon; Webb has all guns but one silenced by 14:45, not four of six; no earthwork or gun pit is named anywhere.
- G-13: the Hancock-Hunt dispute is documented by Hart's report and Hunt's own Battles and Leaders article; the 120 and 34 figures are in no source read. G-14: 179 is not in Alexander's memoir (172 is); the NPS lists Poague's and Reilly's lunettes as battle-origin works, so 'open positions' holds only for the OR's description.
- G-16: the two Whitworths on 3 Jul are documented by McIntosh, the NPS Cultural Landscape Report (the highest position on Oak Hill; the park's tablet and two original Whitworths were completed in 1906) and Alexander; Eshleman, Furlong, the NPS handbook and Alexander (B&L) all have two guns of the Washington Artillery as the signal; nothing supports a Whitworth signal or two 3-inch rifles at the marker.
- Pages: the 2026-11-04 rows gave interpolated page ranges for some passages; two are now read from the running heads (Hazard p.478 for '~479', Hall p.437 for '~438'; Brown's '456-458' resolves to 456). All 66 original quotes are verbatim in the local Official Records with the same report ids, and 66 of 66 page claims agree with or contain the found page; the OR-RECHECK lines of this shard (66) were all 'yes'.

## The second reading of the supported sub-claims

After the first build every sub-claim marked supported was read again against its own quotes. The first build had let a number of sub-claims carry details that their quotes did not contain. 46 sub-claims were corrected by adding the missing exact quote or by cutting the claim back to what the quotes say, and 3 sub-claims were added (G-10.j, G-11.g, G-11.h). Changes of substance: Latimer 'mortally wounded' became 'received the wound of which he died' (Ewell, Brown, Andrews); the first canister of Hart's battery has no source clock (the earlier '5-5:45 window' was not documented); in G-08 it is Alexander who was ordered to control the other battalions, not Huger; 'the four guns hauled off by the 6th Maine and Seeley's' became McGilvery's actual sentences (a detail from the 6th Maine and Seeley's for Battery I; Dow to procure an infantry detail for Bigelow's four guns); the infantry gaining the woods at about a quarter to six began McGilvery's retirement and is not the overrun at the second position; Smith's own supposition (1863) and statement (1888) on who took his guns were added to the capture selector; 'all guns retaken' (G-03) was removed because Ricketts says only that part of the Second Corps drove the enemy back; Hunt's B&L page 310 was found to document the hand-to-hand fighting and to carry the figures '25 guns' and '65 of 88 horses'. R13.0000 still said that every gun row was 'corrected' and was rewritten to the final verdict counts.

## Method, what was run, what passed

- `scripts/build.py` (python3 -I): re-matches every citation quote verbatim (whitespace-normalised, case-sensitive, hyphenation joined) inside the named Official Records report (tools/bt/or27_find views), library text or NPS text and records offset, sha256 of the local file, report, printed page (running head, else the garbled head read in the text) and, for OR quotes, whether four other archive.org scans of the volumes contain it. Result: 419 citations, 0 failures.
- `scripts/verify.py` (independent of the build): cuts every citation's offsets from the raw file and compares the squashed text with the squashed quote (one running-head insertion allowed), checks the file hashes and the id list. Result: 17 rows, 419 citations, 0 problems.
- Heuristic triage of the supported sub-claims (words, numbers and strong terms of the claim that no quote contains): run before and after the corrections; the remainder are unit numerals against spelled-out ordinals, words of headings and arithmetic sums, each read by hand.
- `scripts/gen_register.py`, `scripts/gen_report.py`: write the register entries and this report from the corrections file. `scripts/s.py`, `rd.py`, `chk.py`, `h2t.py`: search, read and quote-check helpers. `web_lookups.json` lists the network lookups.
- Official Records reports cited (report ids of tools/bt/or27_find, vol. 27, 307 passages in 48 reports): Part 1: R028, R036, R071, R073, R074, R075, R076, R098, R104, R106, R109, R132, R184, R217, R221, R264, R265, R315, R318, R320, R321, R328, R374; Part 2: R424, R428, R430, R435, R436, R437, R438, R440, R442, R452, R454, R458, R462, R463, R464, R465, R466, R467, R468, R472, R481, R505, R531, R562, R563.
- Library and NPS sources cited (number of citations):
  - NPS-HARMON-FARM: K. G. Harrison, The Significance of the Harmon Farm and the Springs Hotel Woods (1991) (1)
  - NPS-HB9-1954: NPS Historical Handbook no. 9, Gettysburg (1954) (5)
  - NPS-HB9-1962: NPS Historical Handbook no. 9, Gettysburg (1962) (1)
  - NPS-CLR-1STDAY~raw: NPS Cultural Landscape Report, First Day - Union 1st Corps Battlefield (content-stream text) (9)
  - NPS-CLI-1STDAY: NPS Cultural Landscapes Inventory 2021, First Day - Union 1st Corps Battlefield (3)
  - NPS-TPG-COMMEM: NPS Treatment Philosophy and Guidelines for the Battlefield Commemorative Area (2)
  - PA-GB-1914-v2: Pennsylvania at Gettysburg, vol. II (1914) (4)
  - NY-GB-1902-v3: New York at Gettysburg, vol. III (1902) (19)
  - NY-GB-1900: New York at Gettysburg (1900) (5)
  - NPS-CLR-ROT-V1: NPS Cultural Landscape Report for Gettysburg NMP, Record of Treatment, vol. I (6)
  - BACH-WHATTOSEE-1889: Bachelder, Gettysburg: What to See, and How to See It (1889) (2)
  - ALEXANDER-1907: E. P. Alexander, Military Memoirs of a Confederate (1907) (19)
  - ME-GB-1898: Maine at Gettysburg (1898) (3)
  - NPS-SLAUGHTER-PEN: K. R. Georg, 'Our Principal Loss Was in This Place': the Slaughter Pen and the south end of Houck's Ridge (1984) (1)
  - NPS-CLI-LRT: NPS Cultural Landscapes Inventory 2020, Little Round Top (2)
  - NPS-CLI-ERR: NPS Cultural Landscapes Inventory 2024, Emmitsburg Road Ridge Battlefield (6)
  - BL-3: Battles and Leaders of the Civil War, vol. III (Hunt, 'The Second Day at Gettysburg' and 'The Third Day at Gettysburg'; Alexander, 'The Great Charge and Artillery Fighting at Gettysburg') (14)
  - MEADE-LL-v2: The Life and Letters of George Gordon Meade, vol. II (2)
  - NJ-TOOMBS-1888: Toombs, New Jersey Troops in the Gettysburg Campaign (1888) (1)
  - FOX-1889: Fox, Regimental Losses in the American Civil War (1889) (2)
  - NPS-COMMON-PRIDE-2: K. R. Georg, 'A Common Pride and Fame', part II (1981) (2)
  - NPS-COMMON-PRIDE-1: K. R. Georg, 'A Common Pride and Fame', part I (1981) (1)
  - NPSGOV-CONFED-LINE: nps.gov page 'Confederate Line (July 2 & 3)' (fetched 2026-11-13) (1)
  - NPS-CLI-PCB: NPS Cultural Landscapes Inventory 2024, Pickett's Charge Battlefield (1)
- Not run: no gate (Q03, Q07, Q08, Q09, Q26 are the gates of R13.0000 in requirements.json), no `passes` flag touched, no browser, no image check of any printed page (page numbers are read from the text layers; the printed page of the Fox passages is not shown in the text layer, hint 403; library pages other than those read by hand are heuristic hints), no change to a product file. Nothing was committed or deployed.
- Failed: the check of the digits '65 out of 88 horses' (Hunt, B&L III p.310, R13.G-10.g) against a second scan: archive.org answered the search (HTTP 200), but the data nodes (dn*.archive.org) to which two downloads of volume III were redirected answered 403 to CONNECT through the egress proxy, and HEAD requests to the data nodes of six more scans of volume III got no answer; recorded in `web_lookups.json` (W7), not retried, not worked around.

## blocked_host: pages the rows rest on that could not be read (never asserted)

| row | PDF keys | URL | what has to be read there |
|---|---|---|---|
| R13.G-01 | SS-7820 / CWT-Calef | not printed in the PDF source list | PDF keys 'SS-7820' (Stone Sentinels, Calef) and 'CWT-Calef' (CivilWarTalk, Calef at Gettysburg, a forum): URLs are not printed in the PDF's source list for these keys (the PDF prints https://gettysburg.stonesentinels.com/?p=203 only for the farms page); gettysburg.stonesentinels.com was refused here (HTTP 403, fence-2 probe 2026-11-13) and a forum is not an acceptable source. Read at the Stone Sentinels Calef page whether it says 'hollow' and which sections moved 600 yd. |
| R13.G-02 | Wiki-D1 / HN-Pender | not printed in the PDF source list | Wikipedia 'Battle of Gettysburg, first day' and HistoryNet 'Dorsey Pender's July 1 attack': the PDF prints no URL for these keys in its source list; historynet.com was refused here (fence-1 probe); Wikipedia is not an acceptable source for a 'documented' tier. Nothing in this row now depends on them. |
| R13.G-03 | Wiki-ECH / GD-Housch | not printed in the PDF source list | Wikipedia 'Battle of East Cemetery Hill' and Gettysburg Daily 'Housch, East Cemetery Hill': the PDF prints no URL for these keys; gettysburgdaily.com was refused here (fence-2 probe, 403); Wikipedia is not an acceptable source for a documented tier. Nothing in this row depends on them now; read the Gettysburg Daily page only to see whether it gives the PDF's 'builder unknown' and '19:30' wording. |
| R13.G-04 | ECW-Benner / Wiki-ECH | not printed in the PDF source list | Emerging Civil War 'Benner's Hill' and Wikipedia 'Battle of East Cemetery Hill': the PDF prints no URL for these keys; emergingcivilwar.com is not on the reachable list. Read the ECW page only for the PDF's 37-gun figure and the per-battery counts. |
| R13.G-05 | SS-NY1958 / GD-Smith | not printed in the PDF source list | Stone Sentinels 'NY artillery' (key SS-NY1958) and Gettysburg Daily 'Smith's battery' (key GD-Smith): the PDF prints no URL; gettysburg.stonesentinels.com and gettysburgdaily.com were refused here (403, fence-2 probes 2026-11-13). Read them only for the '18:00 one section shifted right' claim. |
| R13.G-06 | NPS-Hazlett / SS-8009 | not printed in the PDF source list | PDF keys 'NPS-Hazlett' (NPS, Hazlett's Battery) and 'SS-8009' (Stone Sentinels, Hazlett): the PDF prints no URL for either. nps.gov is reachable but the NPS page is not identified by the PDF and no nps.gov search is allowed beyond the page lists already saved; gettysburg.stonesentinels.com was refused (403). Read the NPS Hazlett's Battery page for any 'first fire' hour and the hauling wording. |
| R13.G-07 | Wiki-15NY | not printed in the PDF source list | Wikipedia '15th New York Battery': the PDF prints no URL; Wikipedia is not an acceptable source for a documented tier. Nothing in this row now depends on it; the Knox statement stays unsupported until a non-lead source is read. |
| R13.G-08 | Wiki-D2 | not printed in the PDF source list | Wikipedia 'Battle of Gettysburg, second day': the PDF prints no URL; Wikipedia is not an acceptable source. The 36-gun figure it repeats is now found in Alexander (1907), a non-lead source. |
| R13.G-10 | CWE-9Mass / CWN-2025 | not printed in the PDF source list | PDF keys 'CWE-9Mass' (Civil War in the East, 9th Mass.) and 'CWN-2025' (Civil War News, 'The work of the very devil himself'): the PDF prints no URL for these keys; civilwarnews.com was not probed here. Read them only for the origin of '65 horses (narrative)' and '80 of 88': both figures are now found in Fox (1889) and in Hunt's Battles and Leaders text (65 of 88; one scan). |
| R13.G-11 | CWN-2025 | not printed in the PDF source list | PDF key 'CWN-2025' (Civil War News, 'The work of the very devil himself'): no URL printed in the PDF; read it only for the '6 to 23 guns' wording; not probed here. |
| R13.G-12 | WHN-Cushing / Iron-9699 / SS-7888 | not printed in the PDF source list | PDF keys 'WHN-Cushing' (Warfare History Network, Cushing), 'Iron-9699' (Iron Brigader, Hazard's report) and 'SS-7888' (Stone Sentinels, Cushing monument): the PDF prints no URLs for these keys; gettysburg.stonesentinels.com was refused here (403). Hazard's report itself is read in the Official Records (R132). Read the Warfare History Network page only for 'double canister at about 100 yd'. |
| R13.G-13 | Wiki-PC / ABT-Art / Wiki-CR | not printed in the PDF source list | Wikipedia 'Pickett's Charge' and 'Cemetery Ridge', and the American Battlefield Trust article on artillery placements on 3 Jul (ABT-ART): the PDF prints no URL for these keys; battlefields.org was not probed here; Wikipedia is not an acceptable source for a documented tier. Read the ABT article only for 'up to 120' and the '34 disabled' figure. |
| R13.G-14 | Wiki-PC / SP-Guns | not printed in the PDF source list | Wikipedia 'Pickett's Charge' and StrategyPage 'guns' (key SP-Guns): no URLs printed in the PDF for these keys; strategypage.com was not probed here. Read StrategyPage for the 138-179 and 142-155 figures and for Alexander's 179. |
| R13.G-16 | CWT-Whit / HN-Thunder / HMDB (Oak Hill marker) | https://civilwartalk.com/threads/whitworths-at-gettysburg.129286/ | PDF keys 'CWT-Whit' (CivilWarTalk, Whitworths) and 'HN-Thunder' (HistoryNet, Explore Thunder at Gettysburg): the URL given here is the one the PDF prints for the key CWTalk-Whitworth (same title; the PDF does not print one for 'CWT-Whit' itself) and no URL is printed for 'HN-Thunder'; civilwartalk.com was not probed here (a forum is not an acceptable source for a documented tier); historynet.com was refused here (fence-1 probe). The PDF's 'marker' wording ('two Whitworths plus two 3-inch rifles') is not in any source read; the marker meant is presumably the park's Hardaway Alabama Artillery tablet on Oak Hill (NPS Cultural Landscape Report: two original Whitworths and the tablet completed in 1906), whose text may be transcribed at the Historical Marker Database (hmdb.org: refused with HTTP 403 by the egress proxy when probed once on 2026-11-13). Read that transcription for the gun list. |

The PDF's list of source keys prints no URL for 13 of the 14 groups of keys above. gettysburg.stonesentinels.com, historynet.com and gettysburgdaily.com answered 403 in the probes of other shards of this campaign (fence-1, fence-2) and were not probed again here; hmdb.org was probed once here and refused with HTTP 403 by the egress proxy; emergingcivilwar.com, strategypage.com, battlefields.org, civilwarnews.com and civilwartalk.com were not probed here; Wikipedia and forum pages are not accepted by the Law as support for a documented tier, so no row depends on them.

## Delegated decisions

DD-TERRAIN1-01..12 (appended to `decisions/DELEGATED-DECISIONS-2026-11-11.md`) with two correction lines appended after them (DD-TERRAIN1-08 Fox page hint and Meade page; DD-TERRAIN1-05, -06 and -08 after the second reading): defaults follow the best-supported primary evidence, every other value stays selectable and the PDF values stay marked. DD-TERRAIN1-03 refines and DD-TERRAIN1-09 confirms the existing DD-04 (G-03, G-12); DD-TERRAIN1-08 relies on DD-F2-04 (G-10); G-06 relies on the existing DD-FENCE1-07 and G-11 on the split of DD-04; G-15's default is the PDF's own value (ten guns, confirmed by Carter) with Alexander's 20 selectable, and no separate row was written. The conflict-register rows C-020 (East Cemetery Hill assault clock) and C-029 (cannonade end) are not decided by these rows: the rows carry the OR clocks as conflicts and the PDF's recommendations stay PENDING OWNER. Nothing was written to decision_log.md.

## Owner-only acts

None needed. No account, licence, payment, third-party contact or deployment.

## Files

- `GOVERNANCE/evidence_corrections/terrain-1.jsonl` (17 rows; schema as fence-1.jsonl: id, verdict, corrected_claim, sub_claims with tier and citations (source id, part, report id, printed page, quote, offset, sha256), stays_unsupported, conflicts_carried, register_refs, blocked_host, product_consequence, recheck, lookups)
- `horde/terrain-1/proposed-register/terrain-1-EG-01..17.md`
- `horde/requests/bt-evidence-terrain-1-world-content.md` (the product changes, for the world-content workstream)
- `horde/terrain-1/scripts/` (build, verify, generators, helpers), `horde/terrain-1/web_lookups.json`, `tmp/terrain-1/` (scratch: dumps, searches, the two nps.gov pages, the archive.org scans used as second witnesses)


---

## Earlier report (2026-11-04 and audit pass), superseded by the close-out above

### Shard terrain-1 report (earlier text): R13.0000 and R13.G-01..G-16 (17 items)

The first 17 R13 ids are R13.0000 and gun emplacements G-01..G-16. All 17 done; none remain.

Method: OR vol. 27 read with tools/bt/or27_find.py; every quote verified verbatim. Three web lookups (web_lookups.json): one photo lead, one empty, one HTTP 404.

Counts: supported 3 (G-05, 09, 15); partially_supported 7; conflict 3 (G-10, 14, 16); conflict_with_seed 3 (G-03, 11, 12); R13.0000 not satisfied. Status: verified 14, gap 3. Proposed register entries: terrain-1-EG-01..17.

Key findings needing owner decision:
1. G-03: OR (Hunt p.232, Wainwright p.357) records a small earthwork in front of each gun at dusk Jul 1, not lunettes by 16:00 Jul 2.
2. G-11: McGilvery's Jul 3 line had a slight earthwork; the PDF says improvised only. Split G-11 into a and b?
3. G-12: no OR source for any earthwork at Cushing's battery; engine rule "built on screen" lacks a basis. Guns run to the fence: Webb three, Hall one, PDF two.
4. G-16: Eshleman documents Miller's battery as the signal guns; no OR support for the Whitworth signal. Both stay scenarios.
5. Kit gaps (Hall, Stevens, Stewart, Wiedrich) can be filled from the OR (EG-17); not patched here.

Gaps: Confederate per-battery gun counts (Pendleton table unreadable), "Benner's Hill" absent from OR, photographs, Bachelder and NPS HSR sources not reached. No shared file edited; not committed.

### Audit pass 2026-11-04

Slice check: expected R13.0000 and G-01..G-16 (17); found exactly these. Counts unchanged (verified 14, gap 3). Register entries terrain-1-EG-01..17, each row links to one. No fixes needed.

own_checks:
- G-03 Hunt, OR27-1-R028 p.232, "Each of the guns in these batteries had a small earthwork thrown up in its front": found in library/timeline_audit_T2.jsonl (same report and page).
- G-06 Hunt, OR27-1-R028 p.236, "About 4.30 p. m. Hazlett's battery was moved to the extreme left": found in timeline_audit_T2.jsonl.
- G-12 Gibbon, OR27-1-R098 p.416, Webb's brigade "partially behind a low stone wall": found in tests/historian/fixtures/golden-or27.json with page 416.
Also 30 of 66 quotes reappear locally. Verification limits of this audit (2026-11-04): the raw OR Ser. I vol. 27 OCR (tmp/library/or27) is NOT present in this checkout, so tools/bt/or27_find.py could not be re-run. The web proxy returned 403 for loc.gov, archive.org, gutenberg.org, ehistory.osu.edu and nps.gov, so no web re-fetch was possible; those lookups are recorded as failed for this pass, none circumvented. Spot checks therefore use independent local extractions of the same OR passages (docs/battle-theatre/library/timeline_audit_T1-T3.jsonl, library/or27_claim_checks.json, history/positions/positions_A.jsonl and positions_B.jsonl, tests/historian/fixtures/golden-or27.json), matched on quote text, report id and printed page. These are second local witnesses made by earlier sessions, not the raw scan.


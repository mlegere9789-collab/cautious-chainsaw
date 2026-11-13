# ws10 photo-match (Q16) report, second pass 2026-11-13 (first pass 2026-11-11)

Scope read: CLAUDE.md; gates.json Q16; requirements.json (Q16 is linked from R12.001 to R12.045 and the R12 top-level item; every one has passes false); the PDF plan B.9.2 step 7 (photo-match tests: a known or recoverable camera position, a matching lens, ridgelines, rock positions, wall lines and tree trunks compared, pass criterion and failures recorded per photograph; staged photographs for terrain and rocks only) and Table 4 rows 32 to 38; register EG-0144; the first-pass report; the saved National Park Service texts of the nps-landscape task. Nothing was committed, pushed or deployed.

## Result in one paragraph

Gate Q16 is **not passing** and `passes` is set nowhere. The Library of Congress images are now readable and all 127 catalogued photographs were looked at; 70 camera-position statements were found in LOC records, NPS reports and the NPS Then-And-Now pages, and **not one is a coordinate, a lens or a surveyed station**, so there are 0 documented camera positions. 16 poses are registered (2 inferred, 14 assumption); after looking at the review sheets the verdicts are 0 matches, 5 roughly, 4 does not, 7 cannot judge. The other 113 photographs are cannot judge with a reason each. What would settle it is in `verdicts.json` (gate_q16) and in PHOTOMATCH.md: station coordinates from the park (an owner step), the lens, a 1863 near-field model, landmark coordinates good to a few metres, a pass criterion set in advance.

## What was run (and what came of it)

- `fetch_loc.py` (hardened: it now compares the received size with the size the record declares and decodes every pixel): 430 LOC JPEG derivatives, 1 request per second, no retry on a refusal; it found two files that the earlier run had saved cut short (32,768 of 138,801 bytes and 51,967 of 184,609 bytes) and re-fetched them. All 430 files re-verified (size, sha256, full decode).
- `catalogue_additions.py`: the first catalogue run had dropped 18 July-1863-subject records whose LOC date is only "between 1861 and 1865" (among them ppmsca-32840, which the NPS cites as a July 1863 Brady photograph); added with their images; 47 other dropped search results listed with the reason each stays out. One of the 18 (2012647845) is, by image match with an NPS picture, the staged Weaver photograph of 11 November 1863 and was taken out of the July test.
- `build_statements.py`: 70 statements, each quote found in the saved text of a LOC record, an NPS report (53 reports and 20 pages of the nps-landscape task, the Then-And-Now pages) or marked read-from-image (2); evidence lines for R12.032 to R12.035 and one timeline line (T3-064) written.
- `match_nps_then.py`: SIFT, ratio test and RANSAC of the 23 NPS Then-And-Now images against 228 LOC images (about 9 minutes of machine time in the lock queue): 18 tied to catalogued records (291 to 1667 inliers; the Seminary 49 and the gatehouse 59 for cropped images, confirmed by looking), the rest are 1913 pictures or not in the catalogue.
- `run.mjs` under `tools/horde/bench.sh`: 16 poses, three renders each (registered field, 30 and 50 degrees), software GL, about 0.4 s a render; `compose.py` review sheets; the sheets of the 14 new or changed poses were opened and looked at (P04 and P05 are unchanged from the first pass).
- `build_registry.py` and `make_doc.py`: `photograph_registry.json` (one verdict per record) and PHOTOMATCH.md are generated from the data.
- `node --test docs/battle-theatre/app/tests/photomatch-q16.test.mjs`: see the end of this report for the count.

## Verdicts

| Pose | Record | Verdict | Independent | Short reason |
|---|---|---|---|---|
| P01 | 2018666303 | roughly | yes | Far field at the registered pose (Warren statue summit, heading 7.8 deg, 40 deg field): the model horizon sits at 0.51 of the frame height, the photog... |
| P03 | 2018670702 | cannot judge | no | The 2023 gatehouse outline (25.8 m wide, default one storey, lodge and pavilion merged) is placed in front of the facade with its distance read from t... |
| P04 | Met item | does not | yes | Standpoint on Seminary Ridge looking at the borough is contradicted by the photograph itself: a large cupola building and the town appear at distance... |
| P05 | Met item | does not | yes | Same assumed pose as P04 although the two photographs have different standpoints (P05 has a brick house in the near middle ground). One pose cannot be... |
| P06 | 2014646001 | does not | yes | At the registered pose (East Cemetery Hill, Wiedrich monument plus 25 m east, looking to the borough) the model puts every building in a narrow band a... |
| P07 | 2018671576 | does not | yes | The same assumed cemetery pose as P06 and the same result: the frame is a stereo sibling of P06 (road at the left, tents at the right, the town across... |
| P08 | 2012647712 | cannot judge | yes | The title names the place (about the right gun of Wiedrich's Battery, at the monument) but no direction. At the placeholder heading of 45 degrees the... |
| P09 | 2018666302 | roughly | yes | Silhouette of Big Round Top from the assumed spot on the south slope of Little Round Top (statue point, 35 m south, heading 202 deg toward the gazette... |
| P11 | 2018670708 | roughly | yes | Same assumed spot and heading as P09, a different exposure: the photograph's Big Round Top has its summit at 0.44 of the frame width and 0.29 of its h... |
| P12 | 2012647707 | cannot judge | yes | The title says Big Round Top is in the background, but in the photograph the hill is not visible: trees and haze fill the upper third behind a breastw... |
| P17 | 2018666297 | cannot judge | no | The Thompson house footprint (2023 outline, default one storey) is placed south-south-west of the house with its distance read from the photograph (fi... |
| P18 | 2018666296 | roughly | no | Leister house at the end of the Taneytown Road: the footprint sits where the house is (centred by construction, distance fitted), and two items that w... |
| P19 | 2018666298 | cannot judge | no | The Bryan house footprint (6.0 by 7.6 m, 1.5 storeys, 2023 outline) is placed east-south-east of the house with the distance read from the photograph... |
| P20 | 2018670707 | cannot judge | no | The Schmucker Hall footprint (47.9 by 44.3 m, the 2023 outline) is placed 190 m west with the distance read from the photograph (fitted); it shows as... |
| P24 | 2013645105 | roughly | no | Trostle farm: the house footprint is placed south-west of the pair with its distance read from the photograph (fitted); the barn footprint, which was... |
| P26 | 2018666300 | cannot judge | no | Same as P03 for the other gatehouse view (Brady, about two weeks after the battle): the 2023 outline is placed in front of the facade with its distanc... |

Counts over all 127 records: posed 14; cannot judge without a pose 113 (near field only 28; camera place not fixed 55; staged 15; not July battlefield views 15).

## Findings worth another workstream's attention

- Little Round Top from the summit: the NPS plate of landmark labels (Common Pride vol. 3, printed p. 453) cannot be mapped to the photograph, and the repository stand-ins disagree with it in spacing (EG-11); at a 40-degree field the model spreads Ziegler's Grove to Cemetery Hill about 1.8 times too narrow.
- The Trostle summer-kitchen footprint lies on the other side of the house from the photograph (EG-12).
- Big Round Top: in both photographs that show it the summit sits about 15 percent of the frame height higher than in the render from the assumed spot on the south slope of Little Round Top.
- The first pass had flagged staged photographs by title only: 2012647849 shares a negative number with the staged sharpshooter record and 2012647845 is the Weaver photograph of 11 November 1863; both are now flagged (EG-05).
- The old test tests/photomatch.test.mjs fails on the new ledger and schema (request note bt-web-photomatch-old-test.md).

## Tests

- `node --test docs/battle-theatre/app/tests/photomatch-q16.test.mjs`: 10 pass, 0 fail, 1 skipped (render determinism: queued for the machine lock from 2026-11-13 20:06 to 21:28 and never granted a slot; the waiter was stopped; run PHOTOMATCH_RENDER=1 through tools/horde/bench.sh to do it).
- `node --test tests/photomatch.test.mjs` (not owned by this task): 2 pass, 3 fail: it asserts archive.org-only ledger urls, gazetteer-only anchors and the first-run verdicts.json shape; see the request note bt-web-photomatch-old-test.md.
- Full node suite: not run.

## Not run, owed

- The render of pose P13 (the Valley of Death view, record 2012647708) and its review sheet: the render job waited from 19:57 to 21:28 and the determinism test from 20:06 to 21:28 in the machine lock queue (two slots, 15 to 20 waiters) and were never granted a slot; the waiters were stopped. To finish: tools/horde/bench.sh node tools/bt/photomatch/run.mjs P13, compose.py P13, look at the sheet, write the verdict, move the entry from deferred_poses back into poses.
- The full node suite (`node --test docs/battle-theatre/app/tests/*.test.mjs`) was not run by this task; only the photomatch test file was.
- No real-GPU rendering: every render is software GL. Nothing here is a timing or a real-GPU visual result.
- No master TIFF beyond the two Cemetery Hill views; no full-resolution matching.
- The NARA Prologue blog on the Devil's Den sharpshooter (the PDF's source for the staged flag) and any LOC record outside the cwp collection (LC-DIG-ppmsca-18947, negative LC-B815-273) were not read.
- Gardner's Sketch Book plate descriptions: the archive.org text layer holds none (0 occurrences of Gettysburg); the plate images were not fetched (150 MB each).

## Owner steps (acts only the owner may do)

- Ask the Gettysburg National Military Park museum or GIS office (a third party: an owner act) for the station coordinates and the camera and lens of its Then-And-Now pictures, and for the prints of the Brady views it holds (McPherson farm; Little Round Top: GNMP SF-2B-2087, SF-2B-2090, SF-2B-2095, SF-28-2083, 2B2001).
- Decide whether to buy or borrow Frassanito's Early Photography at Gettysburg (billing is an owner act) or to ask the publisher in writing for the right to use its camera positions; until then no camera position that rests on it is used.
- Confirm or change the pass criterion proposed above (delegated default: angular error of named ridge lines and landmarks at a documented position, in degrees, set before the match).

## Governance note

Nothing was added to requirements.json, gates.json or register/ (proposals ws10-EG-01 to ws10-EG-12 only). `check_governance.py` was not run for a milestone claim: no milestone is claimed. Delegated decisions DD-PM-01 to DD-PM-05 were appended to decisions/DELEGATED-DECISIONS-2026-11-11.md (section H).

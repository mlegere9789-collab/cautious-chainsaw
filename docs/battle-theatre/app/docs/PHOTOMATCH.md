# Photo-match (gate Q16)

**Q16 text (gates.json):** "Photo-match tests at known camera positions of period photographs (staged-photograph flags respected)." Linked from R12 sub-requirements (terrain source catalogue items). **Status: not passing.** No camera position is documented in any source read, so no test at a *known* position exists yet; the machinery below is ready for when positions are sourced. `passes` is not set.

## Machinery (tools/bt/photomatch/)

| File | What |
|---|---|
| `catalogue.py` -> `catalogue.json` | 109 LOC Civil War Photographs records (catalogued 1863, Gettysburg), fields copied from loc.gov JSON (id, creator, date as catalogued, title/caption, reproduction numbers, rights, loc.gov URL, licence basis "LOC: no known restrictions"). 92 flagged in scope for terrain; 13 flagged staged by title (basis in the record). |
| `fetch_images.py` -> `images_ledger.json` | sha256 ledger. Image hosts tile.loc.gov, cdn.loc.gov and archive.org data nodes are refused by the container proxy (not circumvented). Readable: archive.org `/cors/` copies: 3 Gardner LOC scans (Public Domain Mark item) and 6 Met-programme items. 433 MB of originals under gitignored `tmp/photomatch/img/`. |
| `poses.json` | 8 registered camera-pose assumptions (position anchor, snap rule, heading, 40 deg horizontal FOV, 1.6 m height), each with basis and tier (plausible-procedural / inferred) and a `no_pose` list with reasons. `resolved_poses.json` holds the computed coordinates. |
| `render.html`, `run.mjs` | Headless render (Chrome, SwiftShader, one browser, run under `nice -n 10`) of the DEM (render/prototype/data, modern bare ground) with the 1863 base-map fences, building footprints and roads (structures3d.json). Also renders FOV 30 and 50 variants. Deterministic (same sha256 on re-render). |
| `compose.py` | photo / render / edge-overlay triptychs (`reports/*.jpg`), `metrics.json` (horizon row only). |
| `verdicts.json` | the person-written verdicts. Test: `node --test tests/photomatch.test.mjs`. |

Run: `python tools/bt/photomatch/catalogue.py && python tools/bt/photomatch/fetch_images.py && nice -n 10 node tools/bt/photomatch/run.mjs && python tools/bt/photomatch/compose.py`.

## Per-photo verdicts (composites were opened and looked at where an image was readable)

| Pose | Photograph | Verdict | Why |
|---|---|---|---|
| P01 | LOC 2018666303, centre of the Federal position viewed from Little Round Top (Gardner) | does not | horizon 0.51 vs 0.40; near field is boulders and a tree the DEM lacks; distant trees unmatched; terrain error not separable from pose error |
| P03 | LOC 2018670702, cemetery gatehouse (Gardner) | does not | render shows no gatehouse from the guessed spot; photo is a close frontal view |
| P04 | Met 268204, Gettysburg from the West | does not | the photograph itself contradicts the assumed Seminary Ridge standpoint; horizon 0.50 vs 0.38 |
| P05 | Met 268205, Gettysburg from the West | does not | same assumed pose as P04 yet a different view; caption gives no position |
| P06 to P09 | LOC 2014646001, 2018671576, 2012647712, 2018666302 | cannot judge | image bytes unreachable; render only |

Counts: 0 matches, 0 roughly, 4 does not, 4 cannot judge. A "does not" here means the assumed pose and modern DEM do not reproduce the photograph; it is not a finding that the 1863 terrain is wrong.

## Limits (all registered: GOVERNANCE/horde/ws10-photomatch/proposed-register/)

Camera positions are assumptions (EG-02); focal length unknown (EG-04); terrain is modern ground without 1863 trees, rocks or crop state, and the DEM ends about 3 km out (EG-03); loc.gov image bytes unreachable (EG-01); staged flags are title-derived (EG-05); LOC dates partly rest on Frassanito, whose text and images were not used (EG-06). Staged photographs are never used as ground truth for a body or niche position.

#!/usr/bin/env python3
"""Write docs/battle-theatre/app/docs/PHOTOMATCH.md from the registry data so that the document and the data cannot drift apart.
Inputs: poses.json, verdicts.json, photograph_registry.json, position_statements.json, catalogue*.json, images_ledger.json, nps_then_to_loc.json.
This file ships with the app: no remark on how it was produced (copy audit). Usage: python3 -I tools/bt/photomatch/make_doc.py"""
import json, os
from collections import Counter
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
def J(n): return json.load(open(os.path.join(HERE, n)))
poses = J('poses.json')['poses']; ver = J('verdicts.json'); reg = J('photograph_registry.json')['photographs']; st = J('position_statements.json')['statements']; led = J('images_ledger.json')['images']
ident = J('nps_then_to_loc.json')['queries']
pv = {v['pose']: v for v in ver['pose_verdicts']}; G = ver['gate_q16']
n_loc = sum(1 for v in led.values() if v.get('status') == 'ok' and v.get('derivative') in ('medium', 'large')); tier = Counter(p['position']['tier'] for p in poses); vc = Counter(v['verdict'] for v in ver['pose_verdicts'])
cls = Counter(r['class'] for r in reg if not r['pose_ids']); staged = sum(1 for r in reg if r['staged_flag']); out_scope = sum(1 for r in reg if not r['scope_july_1863_terrain'])
nstat = Counter(s['tier'] for s in st); acc = sum(1 for q in ident.values() if q.get('accepted'))
L = []
A = L.append
A('# Photo-match (gate Q16)\n')
A('**Q16 text (gates.json):** "Photo-match tests at known camera positions of period photographs (staged-photograph flags respected)." Linked from the R12 terrain source items. **Status: not passing** (reviewed 2026-11-13). `passes` is not set on the gate or on any linked item.\n')
A('## Where things stand\n')
A(f'- **Photographs:** {len(reg)} catalogued Library of Congress records (109 from the first catalogue run and 18 added because LOC dates them only as between 1861 and 1865); {n_loc} Library of Congress JPEG derivatives saved (each checked: size equals what the record declares, decodes to the last pixel, sha256 in the ledger) plus 2 master scans, 3 archive.org scans and 6 Metropolitan Museum items of the first run. The primary image of every record was looked at on a contact sheet.')
A(f'- **Camera positions:** 0 are documented. None of the {len(set(s["src"] for s in st))} sources read (Library of Congress catalogue records, National Park Service reports and web pages) gives a coordinate, a lens, a plate size or a surveyed station. They give {len(st)} statements in words (place, viewing direction, reference object); {nstat.get("documented", 0)} are documented statements (a source says it, quote found in the saved text), {nstat.get("inferred", 0)} were read from page images because the text layer is unusable, {nstat.get("lead", 0)} rests on a book that may not be used and is a lead only.')
A(f'- **Poses registered:** {len(poses)} (position tier: {tier.get("inferred", 0)} inferred, {tier.get("plausible-procedural", 0)} assumption). **Verdicts on the poses:** {vc.get("matches", 0)} matches, {vc.get("roughly", 0)} roughly, {vc.get("does not", 0)} does not, {vc.get("cannot judge", 0)} cannot judge.')
A(f'- **The other {len(reg) - sum(1 for r in reg if r["pose_ids"])} photographs** have no pose and the verdict cannot judge, each with its reason: {cls.get("NEAR", 0)} show only near ground that the model does not contain, {cls.get("POS", 0)} have a camera place that no source fixes closely enough, {cls.get("STG", 0)} are staged or flagged, {cls.get("OUT", 0)} are not July 1863 battlefield views. {staged} records carry a staged-photograph flag; none has a pose.\n')
A('## Why the gate cannot pass\n')
for t in G['reason']: A(f'- {t}')
A('\n## What would be needed\n')
for t in G['what_is_needed']: A(f'- {t}')
A('\n## Owner steps (not done here)\n')
for t in G['owner_steps']: A(f'- {t}')
A('\n## The poses and the verdicts\n')
A('A verdict is conditional on the registered pose: it is never a finding about the 1863 landscape alone. matches / roughly / does not / cannot judge. "Independent" says whether the pose was fixed without the photograph; a pose whose distance was read from the photograph (fitted) cannot give a match.\n')
A('| Pose | Record | Position tier (sigma) | Independent | Verdict | Why |\n|---|---|---|---|---|---|')
for p in poses:
    v = pv[p['id']]; sg = p['position'].get('sigma_m')
    A(f"| {p['id']} | {p.get('loc_id') or 'Met item'} | {p['position']['tier']} ({sg if sg else '?'} m) | {'yes' if v.get('independent_test') else 'no'} | **{v['verdict']}** | {v['why']} |")
A('\n## Camera-position statements that matter most\n')
A('Page numbers are the pdf page markers of the saved texts (the printed page differs).\n')
A('| Statement | Record | What the source literally fixes | Source |\n|---|---|---|---|')
keep = ['PS-NPS-CLRLRT-405', 'PS-NPS-CP3-29', 'PS-TN-LRT1-DIR', 'PS-TN-LRT2-DIR', 'PS-TN-RW1-PLACE', 'PS-TN-RW3-DIR', 'PS-NPS-CLR1D-124', 'PS-NPS-CLR1D-01', 'PS-NPS-CLR1D-146', 'PS-NPS-CLR1D-151', 'PS-NPS-BRIEN-9', 'PS-NPS-CLRROTV2-149', 'PS-NPS-SPEN-5', 'PS-NPS-VISTA-10', 'PS-LOC-2012647712-T', 'PS-LOC-2014646001-N']
for s in st:
    if s['id'] in keep: A(f"| {s['id']} | {', '.join(s.get('loc') or s.get('cand') or ['-'])} | {s['says']} | {s['source']['id'] if 'source' in s else s['src']}, {('p. ' + str(s['page'])) if s['page'] not in ('record', 'page') else s['page']} |")
A(f'\nThe full list ({len(st)} statements, each with its verbatim quote, page and the sha256 of the saved text) is `tools/bt/photomatch/position_statements.json`; the same sub-claims are written as evidence lines to `GOVERNANCE/evidence_corrections/web-photomatch.jsonl`.\n')
A('## Which Library of Congress image is which National Park Service picture\n')
A(f'The NPS Then-And-Now pages credit "Library of Congress" without an id. {acc} of the 23 NPS "then" images were tied to a catalogued record by feature matching (SIFT, ratio test, RANSAC homography; 291 to 1667 inliers, 49 and 59 for two cropped images; `nps_then_to_loc.json`); the rest are 1913 pictures, other collections or photographs that are not in the catalogue. The page states that each modern picture was taken from the same location as the original, in words only.\n')
A('## Machinery (tools/bt/photomatch/)\n')
A('| File | What |\n|---|---|')
for f, t in [('catalogue.py, catalogue_additions.py', 'LOC records (open JSON, 1 request per second); the additions are records the first date filter dropped, each with its reason'), ('fetch_loc.py, fetch_master.py, fetch_images.py, webget.py', 'polite fetchers (cdn.loc.gov and tile.loc.gov only, archive.org /cors/, the official NPS hosts); sizes are compared with what the record declares and every file is decoded'),
             ('images_ledger.json', 'sha256, bytes, pixel size, urls and licence basis per saved file; the files are under gitignored tmp/photomatch/'), ('statements_data.py, build_statements.py -> position_statements.json', 'the camera-position statements; the builder refuses a quote it cannot find in the saved text'),
             ('match_nps_then.py -> nps_then_to_loc.json', 'which LOC image each NPS picture is'), ('poses.json (schema 2)', 'the registered poses with tier, sigma, basis, statements, landmarks and the photograph print area'),
             ('run.mjs, render.html', 'deterministic software-GL render of the DEM with the 1863 base-map layers from each pose (main, 30 and 50 degree fields); landmark projection'), ('compose.py -> reports/<pose>.jpg, metrics.json', 'review sheets: photograph, render, edge overlay with landmark ticks, field variants'),
             ('verdicts.json, registry_data.py, build_registry.py -> photograph_registry.json', 'the verdicts and the per-photograph registry (one entry for each of the 127 records)'), ('crops.py, sheets.py', 'print areas and contact sheets')]: A(f'| `{f}` | {t} |')
A('\nRun: `python3 tools/bt/photomatch/build_statements.py && tools/horde/bench.sh node tools/bt/photomatch/run.mjs && python3 tools/bt/photomatch/compose.py && python3 tools/bt/photomatch/build_registry.py && python3 tools/bt/photomatch/make_doc.py`. Test: `node --test docs/battle-theatre/app/tests/photomatch-q16.test.mjs`.\n')
A('## Limits (registered as gaps: GOVERNANCE/horde/ws10-photomatch/proposed-register/)\n')
A('- The terrain is modern bare ground with the repository\'s 2023 building outlines at a default one-storey height: no 1863 trees, rocks, crops or fences in the near field, so only far ridge lines, hills, roads and mapped footprints can be compared (EG-03).')
A('- The focal length and plate of every exposure are unknown; 40 degrees horizontal is a generic assumption and renders at 30 and 50 degrees accompany every pose (EG-04). The landmark spacing of P01 suggests a longer lens; that is an observation, not a value.')
A('- Frassanito\'s camera positions are copyrighted and were not read; LOC text that cites him is a lead only (EG-06). Staged photographs are used for terrain and rocks only, never for the position of a body or prop (EG-05).')
A('- Positions named in words but not in the model (the McPherson quarry, De Trobriand Avenue and the Rose Woods edge, Seminary Lane, the Wheatfield Road and Crawford Avenue crossing) could be placed only as assumptions, or not at all (EG-10).')
A('- The NPS plate that labels the landmarks of the view north from Little Round Top is a photocopy and could not be mapped to the photograph (EG-11); the Trostle summer-kitchen footprint lies on the other side of the house from the photograph (EG-12).\n')
open(os.path.join(ROOT, 'docs', 'battle-theatre', 'app', 'docs', 'PHOTOMATCH.md'), 'w').write('\n'.join(L) + '\n')
print('written', len(L), 'lines')

# ---------------------------------------------------------------------------------------------------------------- the workstream report (not shipped: GOVERNANCE/horde/ws10-photomatch/REPORT.md)
def report():
    R = []
    B = R.append
    posed = [r for r in reg if r['pose_ids']]
    B('# ws10 photo-match (Q16) report, second pass 2026-11-13 (first pass 2026-11-11)\n')
    B('Scope read: CLAUDE.md; gates.json Q16; requirements.json (Q16 is linked from R12.001 to R12.045 and the R12 top-level item; every one has passes false); the PDF plan B.9.2 step 7 (photo-match tests: a known or recoverable camera position, a matching lens, ridgelines, rock positions, wall lines and tree trunks compared, pass criterion and failures recorded per photograph; staged photographs for terrain and rocks only) and Table 4 rows 32 to 38; register EG-0144; the first-pass report; the saved National Park Service texts of the nps-landscape task. Nothing was committed, pushed or deployed.\n')
    B('## Result in one paragraph\n')
    B(f'Gate Q16 is **not passing** and `passes` is set nowhere. The Library of Congress images are now readable and all {len(reg)} catalogued photographs were looked at; {len(st)} camera-position statements were found in LOC records, NPS reports and the NPS Then-And-Now pages, and **not one is a coordinate, a lens or a surveyed station**, so there are 0 documented camera positions. {len(poses)} poses are registered ({tier.get("inferred", 0)} inferred, {tier.get("plausible-procedural", 0)} assumption); after looking at the review sheets the verdicts are {vc.get("matches", 0)} matches, {vc.get("roughly", 0)} roughly, {vc.get("does not", 0)} does not, {vc.get("cannot judge", 0)} cannot judge. The other {len(reg) - len(posed)} photographs are cannot judge with a reason each. What would settle it is in `verdicts.json` (gate_q16) and in PHOTOMATCH.md: station coordinates from the park (an owner step), the lens, a 1863 near-field model, landmark coordinates good to a few metres, a pass criterion set in advance.\n')
    B('## What was run (and what came of it)\n')
    for t in ['`fetch_loc.py` (hardened: it now compares the received size with the size the record declares and decodes every pixel): 430 LOC JPEG derivatives, 1 request per second, no retry on a refusal; it found two files that the earlier run had saved cut short (32,768 of 138,801 bytes and 51,967 of 184,609 bytes) and re-fetched them. All 430 files re-verified (size, sha256, full decode).',
              '`catalogue_additions.py`: the first catalogue run had dropped 18 July-1863-subject records whose LOC date is only "between 1861 and 1865" (among them ppmsca-32840, which the NPS cites as a July 1863 Brady photograph); added with their images; 47 other dropped search results listed with the reason each stays out. One of the 18 (2012647845) is, by image match with an NPS picture, the staged Weaver photograph of 11 November 1863 and was taken out of the July test.',
              f'`build_statements.py`: {len(st)} statements, each quote found in the saved text of a LOC record, an NPS report (53 reports and 20 pages of the nps-landscape task, the Then-And-Now pages) or marked read-from-image (2); evidence lines for R12.032 to R12.035 and one timeline line (T3-064) written.',
              f'`match_nps_then.py`: SIFT, ratio test and RANSAC of the 23 NPS Then-And-Now images against 228 LOC images (about 9 minutes of machine time in the lock queue): {acc} tied to catalogued records (291 to 1667 inliers; the Seminary 49 and the gatehouse 59 for cropped images, confirmed by looking), the rest are 1913 pictures or not in the catalogue.',
              f'`run.mjs` under `tools/horde/bench.sh`: {len(poses)} poses, three renders each (registered field, 30 and 50 degrees), software GL, about 0.4 s a render; `compose.py` review sheets; the sheets of the {len([p for p in poses if p["id"] not in ("P04", "P05")])} new or changed poses were opened and looked at (P04 and P05 are unchanged from the first pass).',
              '`build_registry.py` and `make_doc.py`: `photograph_registry.json` (one verdict per record) and PHOTOMATCH.md are generated from the data.',
              '`node --test docs/battle-theatre/app/tests/photomatch-q16.test.mjs`: see the end of this report for the count.']: B('- ' + t)
    B('\n## Verdicts\n')
    B('| Pose | Record | Verdict | Independent | Short reason |\n|---|---|---|---|---|')
    for p in poses:
        v = pv[p['id']]; B(f"| {p['id']} | {p.get('loc_id') or 'Met item'} | {v['verdict']} | {'yes' if v.get('independent_test') else 'no'} | {v['why'][:150].rstrip()}... |")
    B(f'\nCounts over all {len(reg)} records: posed {len(posed)}; cannot judge without a pose {len(reg) - len(posed)} (near field only {cls.get("NEAR", 0)}; camera place not fixed {cls.get("POS", 0)}; staged {cls.get("STG", 0)}; not July battlefield views {cls.get("OUT", 0)}).\n')
    B('## Findings worth another workstream\'s attention\n')
    for t in ['Little Round Top from the summit: the NPS plate of landmark labels (Common Pride vol. 3, printed p. 453) cannot be mapped to the photograph, and the repository stand-ins disagree with it in spacing (EG-11); at a 40-degree field the model spreads Ziegler\'s Grove to Cemetery Hill about 1.8 times too narrow.',
              'The Trostle summer-kitchen footprint lies on the other side of the house from the photograph (EG-12).',
              'Big Round Top: in both photographs that show it the summit sits about 15 percent of the frame height higher than in the render from the assumed spot on the south slope of Little Round Top.',
              'The first pass had flagged staged photographs by title only: 2012647849 shares a negative number with the staged sharpshooter record and 2012647845 is the Weaver photograph of 11 November 1863; both are now flagged (EG-05).',
              'The old test tests/photomatch.test.mjs fails on the new ledger and schema (request note bt-web-photomatch-old-test.md).']: B('- ' + t)
    B('\n## Not run, owed\n')
    for t in ['The full node suite (`node --test docs/battle-theatre/app/tests/*.test.mjs`) was not run; only the photomatch test file was.',
              'No real-GPU rendering: every render is software GL. Nothing here is a timing or a real-GPU visual result.',
              'No master TIFF beyond the two Cemetery Hill views; no full-resolution matching.',
              'The NARA Prologue blog on the Devil\'s Den sharpshooter (the PDF\'s source for the staged flag) and any LOC record outside the cwp collection (LC-DIG-ppmsca-18947, negative LC-B815-273) were not read.',
              'Gardner\'s Sketch Book plate descriptions: the archive.org text layer holds none (0 occurrences of Gettysburg); the plate images were not fetched (150 MB each).']: B('- ' + t)
    B('\n## Owner steps (acts only the owner may do)\n')
    for t in G['owner_steps']: B('- ' + t)
    B('\n## Governance note\n')
    B('Nothing was added to requirements.json, gates.json or register/ (proposals ws10-EG-01 to ws10-EG-12 only). `check_governance.py` was not run for a milestone claim: no milestone is claimed. Delegated decisions DD-PM-01 to DD-PM-05 were appended to decisions/DELEGATED-DECISIONS-2026-11-11.md (section H).')
    open(os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'horde', 'ws10-photomatch', 'REPORT.md'), 'w').write('\n'.join(R) + '\n')
report()

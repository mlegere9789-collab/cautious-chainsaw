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
n_img = sum(1 for v in led.values() if v.get('status') == 'ok'); tier = Counter(p['position']['tier'] for p in poses); vc = Counter(v['verdict'] for v in ver['pose_verdicts'])
cls = Counter(r['class'] for r in reg if not r['pose_ids']); staged = sum(1 for r in reg if r['staged_flag']); out_scope = sum(1 for r in reg if not r['scope_july_1863_terrain'])
nstat = Counter(s['tier'] for s in st); acc = sum(1 for q in ident.values() if q.get('accepted'))
L = []
A = L.append
A('# Photo-match (gate Q16)\n')
A('**Q16 text (gates.json):** "Photo-match tests at known camera positions of period photographs (staged-photograph flags respected)." Linked from the R12 terrain source items. **Status: not passing** (reviewed 2026-11-13). `passes` is not set on the gate or on any linked item.\n')
A('## Where things stand\n')
A(f'- **Photographs:** {len(reg)} catalogued Library of Congress records (109 from the first catalogue run and 18 added because LOC dates them only as between 1861 and 1865); {n_img} image files saved with sha256 (medium and large JPEG derivatives, 2 master scans). Every image was looked at on a contact sheet.')
A(f'- **Camera positions:** 0 are documented. No source read (LOC records, {len(set(s["src"] for s in st))} sources: National Park Service reports and pages, Library of Congress captions) gives a coordinate, a lens, a plate size or a surveyed station. They give {len(st)} statements in words (place, viewing direction, reference object); {nstat.get("documented", 0)} are documented statements, {nstat.get("inferred", 0)} are read from page images, {nstat.get("lead", 0)} come from a book that may not be used and are leads only.')
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

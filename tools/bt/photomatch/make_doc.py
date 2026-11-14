#!/usr/bin/env python3
"""Write docs/battle-theatre/app/docs/PHOTOMATCH.md (shipped with the app) and GOVERNANCE/horde/ws10-photomatch/REPORT.md (workstream report, not shipped) from the registry data so that the documents and the data cannot drift apart.
Inputs: poses.json, verdicts.json, photograph_registry.json, position_statements.json, catalogue*.json, images_ledger.json, wide_images_ledger.json, nps_then_to_loc.json, nps_figures.json (+ nps_figures_confirmed.json, nps_figures_to_loc.json),
criteria.json, criteria_measurements.json, skyline_results.json, wide_to_catalogue.json, test_status.json.
PHOTOMATCH.md ships with the app: no remark on how it was produced (copy audit). Usage: python3 -I tools/bt/photomatch/make_doc.py"""
import json, os
from collections import Counter
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
def J(n, default=None):
    p = os.path.join(HERE, n)
    return json.load(open(p)) if os.path.exists(p) else default
PJ = J('poses.json'); poses = PJ['poses']; deferred = PJ.get('deferred_poses', []); ver = J('verdicts.json'); reg = J('photograph_registry.json')['photographs']; st = J('position_statements.json')['statements']; led = J('images_ledger.json')['images']; wled = J('wide_images_ledger.json')['images']
ident = J('nps_then_to_loc.json')['queries']; crit = {c['id']: c for c in J('criteria.json')['criteria']}; meas = (J('criteria_measurements.json') or {}).get('measurements', {}); sky = (J('skyline_results.json') or {}).get('cases', {})
figs = J('nps_figures.json')['figures']; conf = (J('nps_figures_confirmed.json') or {}).get('ties', {}); fig_match = (J('nps_figures_to_loc.json') or {}).get('results', {}); wide = J('catalogue_wide_items.json')['photographs']; wide_match = (J('wide_to_catalogue.json') or {}).get('results', {})
n_cat = len(J('catalogue.json')['photographs']); n_add = len(J('catalogue_additions.json')['photographs'])
pv = {v['pose']: v for v in ver['pose_verdicts']}; G = ver['gate_q16']; live = [p for p in poses if not p.get('superseded_by')]
n_loc = sum(1 for v in led.values() if v.get('status') == 'ok' and v.get('derivative') in ('medium', 'large')); n_wide_img = sum(1 for v in wled.values() if v.get('status') == 'ok'); n_wide_nd = sum(1 for v in wled.values() if v.get('status') == 'not_offered')
tier = Counter(p['position']['tier'] for p in poses); vc = Counter(v['verdict'] for v in ver['pose_verdicts'])
cls = Counter(r['class'] for r in reg if not r['pose_ids']); staged = sum(1 for r in reg if r['staged_flag']); nstat = Counter(s['tier'] for s in st); acc = sum(1 for q in ident.values() if q.get('accepted'))
places = [p['id'] for p in poses if p['position'].get('place_documented')]; wide_cls = Counter(w_['class'] for w_ in reg if w_['catalogue'] == 'wide search (third pass)')
def fmt(x): return '-' if x is None else str(x)
def verdict_rows(ps):
    out = []
    for p in ps:
        v = pv[p['id']]; sg = p['position'].get('sigma_m')
        out.append(f"| {p['id']} | {p.get('loc_id') or ('Met item' if p['id'] in ('P04', 'P05') else 'NPS figure')} | {p['position']['tier']}{' (place documented)' if p['position'].get('place_documented') else ''} ({sg if sg else '?'} m) | {'yes' if v.get('independent_test') else 'no'} | **{v['verdict']}** | {v['why']} |")
    return out
def meas_table():
    rows = ['| Pose (heading word) | Field | T1 pike in the left 55 percent | T2 horizon within 0.10 of 0.47 | T3 town band in 0.05 to 0.60 | numbers |', '|---|---|---|---|---|---|']
    for k in ('P27_main', 'P27_fov30', 'P27_fov50', 'P28_main', 'P28_fov30', 'P28_fov50'):
        m = meas.get(k)
        if not m: continue
        word = 'north' if k.startswith('P27') else 'northwest'
        rows.append(f"| {m['pose']} ({word}, {m['heading_deg']} deg) | {m['field_h_deg']} deg | {fmt(m['T1_pass'])} | {fmt(m['T2_pass'])} | {fmt(m['T3_pass'])} | horizon {m['T2_horizon_frac']}; pike x {fmt(m['T1_min_x_frac'])} to {fmt(m['T1_max_x_frac'])} ({m['T1_visible_road_vertices']} visible vertices); town band centre {fmt(m['T3_building_pixel_extent_centre_frac'])}, GZ-072 at {fmt(m['T3_gz072_x_frac'])} |")
    return rows
def sky_table():
    rows = ['| Case | Sector | S1 RMS (deg) | S1 class | best heading / field | controls min, quartile 1, median, max | station rank of 25 | S2 discriminated | RMS at 5 m and 11 m |', '|---|---|---|---|---|---|---|---|---|']
    for cid, c in sky.items():
        for k, s in c['summary'].items():
            rows.append(f"| {cid} ({c['criterion']}) | {k} | {s['S1_rms_deg']} | {s['S1_class']} | {s['best_heading_deg']} / {s['best_field_deg']} | {s['controls_min']}, {s['controls_q1']}, {s['controls_median']}, {s['controls_max']} | {s['rank_of_station_among_25']} | {s['S2_discriminated']} | {s['agl_sensitivity_rms_deg'].get('5.0')} and {s['agl_sensitivity_rms_deg'].get('11.0')} |")
    return rows
def _fig_loc(f):
    cap = f['caption'].rstrip('. ')
    t = conf.get(f['id'], {})
    if t.get('loc'): return t['loc']
    for s_ in st:
        q = s_['quote'].rstrip('. ')
        if s_['src'] == f['source'] and (cap == q or cap in q): return s_.get('loc') or []
    return []
tied = [f for f in figs if _fig_loc(f)]; untied = [f for f in figs if not _fig_loc(f)]
L = []; A = L.append
A('# Photo-match (gate Q16)\n')
A('**Q16 text (gates.json):** "Photo-match tests at known camera positions of period photographs (staged-photograph flags respected)." Linked from the R12 terrain source items. **Status: not passing** (reviewed 2026-11-14). `passes` is not set on the gate or on any linked item.\n')
A('## Where things stand\n')
A(f'- **Photographs:** {len(reg)} catalogued Library of Congress records: {n_cat} from the first catalogue run, {n_add} added (18 because LOC dates them only as between 1861 and 1865, 2 because they lie outside the Civil War Photographs collection that the first run read) and {len(wide)} of the wide search of the whole Civil War group. {n_loc + n_wide_img} JPEG derivatives are saved (each checked: size equals what the record declares or the file decodes to the last pixel; sha256 in the ledgers) plus 2 master scans, 3 archive.org scans and 6 Metropolitan Museum items of the first run; {n_wide_nd} records of the wide search are not digitized by the Library. The image of every record that has one was looked at on a contact sheet.')
A(f'- **Camera positions:** 0 are documented. A documented camera position is a coordinate, a lens and a plate that a source other than a lead gives (decision DD-PM-01): none of the {len(set(s["src"] for s in st))} sources read (Library of Congress catalogue records, National Park Service reports and web pages) gives one. They give {len(st)} statements in words (place, viewing direction, reference object); {nstat.get("documented", 0)} are documented statements (a source says it, quote found in the saved text), {nstat.get("inferred", 0)} were read from page images because the text layer is unusable, {nstat.get("lead", 0)} rest on a book that may not be used and are leads only.')
A(f'- **Camera places named by a source** (the first class below a documented position, decision DD-PM-06): {len(places)} registered poses ({", ".join(places)}) stand at a building of known outline that the National Park Service names as the place of the camera (the roof of the Evergreen Cemetery lodge for the view north, the gatehouse for the view east), with a cardinal word for the direction. Their camera height, lens and exact heading are not documented, so their position tier stays inferred.')
A(f'- **Poses registered:** {len(poses)} ({len(live)} current, {len(poses) - len(live)} superseded by a better-sourced pose; position tier: {tier.get("inferred", 0)} inferred, {tier.get("plausible-procedural", 0)} assumption). **Verdicts on the poses:** {vc.get("matches", 0)} matches, {vc.get("roughly", 0)} roughly, {vc.get("does not", 0)} does not, {vc.get("cannot judge", 0)} cannot judge.')
if deferred: A('- **Deferred:** ' + ', '.join(f"{q['id']} (record {q['loc_id']})" for q in deferred) + ': registered with its basis but not rendered.')
A(f'- **The other {len(reg) - sum(1 for r in reg if r["pose_ids"])} photographs** have no pose and the verdict cannot judge, each with its reason: {cls.get("NEAR", 0)} show only near ground that the model does not contain, {cls.get("POS", 0)} have a camera place that no source fixes closely enough, {cls.get("STG", 0)} are staged or flagged, {cls.get("OUT", 0)} are not July 1863 battlefield views. {staged} records carry a staged-photograph flag; none has a pose.\n')
A('## Why the gate cannot pass\n')
for t in G['reason']: A(f'- {t}')
A('\n## What would be needed\n')
for t in G['what_is_needed']: A(f'- {t}')
A('\n## Owner steps (not done here)\n')
for t in G['owner_steps']: A(f'- {t}')
A('\n## The first tests at a documented camera place\n')
A('The National Park Service names the place of the camera for two exposures of the catalogue: the view of Gettysburg from the Evergreen Cemetery lodge (the Cultural Landscape Report for Gettysburg National Cemetery, Figure 1.26: "looking north from the roof of the Evergreen Cemetery lodge shortly after the battle, July 1863", Library of Congress LC-B815-273, which is record 2018671576; two other reports call the same picture, as ppmsca 35051, a view northwest from Cemetery Hill) and the view east from the same building (Record of Treatment, volume I, Figure 213, the park\'s print OS2B-2037, which is record 2012647704 by image match). The words north and northwest differ by 45 degrees: both are carried, as two poses (P27 and P28) of one place. The earlier poses of the same records, set at an assumed spot on Cemetery Hill (P06, P07), are kept with their verdicts and marked superseded.\n')
A('The pass criteria were written **before** the renders existed and are never changed after a render was looked at (`criteria.json`, with the time each was written and the check that no render of the poses existed then):\n')
for cid in ('C-P27-P28-1', 'C-P27-P28-2', 'C-P29-1'):
    c = crit.get(cid)
    if c: A(f"- **{cid}** ({c['written_utc']}, poses {', '.join(c['poses'])}): " + '; '.join(f"{t['id']}: {t['what']}" for t in c['tests']) + f" Verdict rule: {c['verdict_rule']}")
A('\nResults of the three binary tests at the registered headings (`criteria_measurements.json`, computed by `measure_c1.py` from the renders; the definitions of the measures were written before the renders):\n')
for r in meas_table(): A(r)
A('\nThe three tests are necessary conditions, not a sufficient test of a match: the same measurement passes all three for poses P06 and P07, whose verdict is "does not". Skyline test (`skyline_results.json`, `skyline_test.py`): the heading is free inside the sector of the NPS word, the lens and a vertical shift are free, the station is compared with 24 control stations 100, 200 and 300 m away:\n')
for r in sky_table(): A(r)
A('\nThe sheets are `tools/bt/photomatch/reports/P27.jpg`, `P28.jpg`, `P29.jpg` (photograph, render at the registered pose, edge overlay, renders at 30 and 50 degrees) and `<pose>_lines.jpg` (the road, building and fence lines of the render laid on the photograph).\n')
A('## The poses and the verdicts\n')
A('A verdict is conditional on the registered pose: it is never a finding about the 1863 landscape alone. matches / roughly / does not / cannot judge. "Independent" says whether the pose was fixed without the photograph; a pose whose distance was read from the photograph (fitted) cannot give a match.\n')
A('| Pose | Record | Position tier (sigma) | Independent | Verdict | Why |\n|---|---|---|---|---|---|')
for r in verdict_rows(poses): A(r)
A('\n## Camera-position statements that matter most\n')
A('Page numbers are the pdf page markers of the saved texts (the printed page differs).\n')
A('| Statement | Record | What the source literally fixes | Source |\n|---|---|---|---|')
keep = ['PS-NPS-CLRCEM-126', 'PS-NPS-ROTV1-75', 'PS-NPS-ROTV1-F213', 'PS-NPS-CLRLRT-405', 'PS-NPS-CP3-29', 'PS-TN-LRT1-DIR', 'PS-TN-LRT2-DIR', 'PS-TN-RW1-PLACE', 'PS-TN-RW3-DIR', 'PS-NPS-CLR1D-124', 'PS-NPS-CLR1D-01', 'PS-NPS-CLR1D-146', 'PS-NPS-CLR1D-151', 'PS-NPS-BRIEN-9', 'PS-NPS-CLRROTV2-149', 'PS-NPS-SPEN-5', 'PS-NPS-VISTA-10', 'PS-LOC-2012647712-T', 'PS-LOC-2014646001-N']
for s in st:
    if s['id'] in keep: A(f"| {s['id']} | {', '.join(s.get('loc') or s.get('cand') or ['-'])} | {s['says']} | {s['source']['id'] if 'source' in s else s['src']}, {('p. ' + str(s['page'])) if s['page'] not in ('record', 'page') else s['page']} |")
A(f'\nThe full list ({len(st)} statements, each with its verbatim quote, page and the sha256 of the saved text) is `tools/bt/photomatch/position_statements.json`; the same sub-claims are written as evidence lines to `GOVERNANCE/evidence_corrections/web-photomatch.jsonl`.\n')
A('## The figures of the Record of Treatment: which picture is which\n')
A(f'The National Park Service Cultural Landscape Report for Gettysburg National Military Park, Record of Treatment (volumes I and II, 2018) prints {len(figs) } captioned 1863 photographs (plus a few modern and later ones) with a direction of view and, for some, a place, and names them by the park\'s collection number (GETT 41135, 2B-2063 and so on) or by a Library of Congress Digital ID. A park number says nothing about a Library of Congress record, so a figure is tied to a record only where the caption holds the Digital ID or where the figure image (extracted from the PDF) matched a catalogued image by feature matching (SIFT, ratio test, RANSAC homography; at least 45 inliers and either 100 or 1.3 times the best other record) **and** both images were looked at (`nps_figures_confirmed.json`). {len(tied)} of the {len(figs)} figures are tied to a catalogued record ({sum(1 for f in tied if conf.get(f['id'], {}).get('loc'))} by confirmed image match, the others by the Digital ID in the caption); the other {len(untied)} are prints of the park, of the Tipton, Boardman or Army Heritage collections, or are not in the catalogue.\n')
A('| Figure | Caption words | Park or collection number | Tied to LOC record | Basis (inliers) |\n|---|---|---|---|---|')
def fig_stmt(f):
    cap = f['caption'].rstrip('. ')
    for s_ in st:
        q = s_['quote'].rstrip('. ')
        if s_['src'] == f['source'] and (cap == q or cap in q): return s_
    return None
for f in figs:
    t = conf.get(f['id'], {}); s_ = fig_stmt(f); locs = t.get('loc') or (s_ or {}).get('loc') or []; basis = ('image match (%s inliers)' % t['inliers']) if t.get('loc') else ('Digital ID in the caption' if locs else '-')
    A(f"| {f['source'][-2:]} {f['figure']}, p. {f['pdf_page']} | view {f['direction_word']}{(' from ' + f['place_named']) if f['place_named'] else ''}{', detail' if f['is_detail'] else ''} | {fmt(f['park_or_collection_number'])} ({f['credit_kind']}) | {', '.join(locs) or '-'} | {basis} |")
A(f'\nThe captions and the images are `tools/bt/photomatch/nps_figures.json`; the statements built from them (source ids PS-NPS-ROTV1-F and PS-NPS-ROTV2-F) are in `position_statements.json`.\n')
A('## The wide search of the Library of Congress Civil War group\n')
A(f'The first catalogue run read only the Civil War Photographs collection (cwp). The National Park Service cites two records outside it by Digital ID (ppmsca-12565 and ppmsca-18947), so the search was widened to the whole Civil War group (open JSON search, 950 results): {len(wide)} further photographs of 1863 that name Gettysburg were read and classified (`wide_data.py`): {wide_cls.get("POS", 0)} with a camera place named only loosely or not at all, {wide_cls.get("NEAR", 0)} near-field views, {wide_cls.get("STG", 0)} staged or flagged, {wide_cls.get("OUT", 0)} not July 1863 battlefield views (portraits, later photographs, hospital, dedication, not digitized). Most are second prints, stereo cards or Sketch Book plates of exposures already in the catalogue; where both images were looked at the tie is recorded in `same_exposure_as` of the registry entry.\n')
A('## Which Library of Congress image is which National Park Service picture\n')
A(f'The NPS Then-And-Now pages credit "Library of Congress" without an id. {acc} of the 23 NPS "then" images were tied to a catalogued record by feature matching (291 to 1667 inliers, 49 and 59 for two cropped images; `nps_then_to_loc.json`); the rest are 1913 pictures, other collections or photographs that are not in the catalogue. The page states that each modern picture was taken from the same location as the original, in words only.\n')
A('## Machinery (tools/bt/photomatch/)\n')
A('| File | What |\n|---|---|')
for f, t in [('catalogue.py, catalogue_additions.py, wide_search.py, catalogue_wide_items.py, wide_data.py', 'LOC records (open JSON, 1 request per second); the additions are records the first date filter dropped or that lie outside the cwp collection; the wide search reads the whole Civil War group; each with its reason'),
             ('fetch_loc.py, fetch_master.py, fetch_images.py, webget.py', 'polite fetchers (cdn.loc.gov and tile.loc.gov only, archive.org /cors/, the official NPS hosts); sizes are compared with what the record declares and every file is decoded'),
             ('images_ledger.json, wide_images_ledger.json', 'sha256, bytes, pixel size, urls and licence basis per saved file; the files are under gitignored tmp/photomatch/'), ('statements_data.py, build_statements.py -> position_statements.json', 'the camera-position statements; the builder refuses a quote it cannot find in the saved text'),
             ('scan_nps_photos.py -> nps_photo_scan.json', 'one fixed rule over every saved NPS text (118 texts) for passages that give a place or direction of view of a photograph; a list of places to read, not statements'),
             ('nps_figures.py -> nps_figures.json', 'the captions of the 1863 photographs printed in the Record of Treatment, cut verbatim from the saved text, with the extracted images'),
             ('match_nps_then.py, match_third_pass.py -> nps_then_to_loc.json, nps_figures_to_loc.json, wide_to_catalogue.json, met_to_catalogue.json', 'which catalogued LOC image each NPS picture, each wide-search image and each Metropolitan Museum item is (feature matching; a lead until both images were looked at)'),
             ('poses.json (schema 2)', 'the registered poses with tier, sigma, basis, statements, landmarks and the photograph print area'),
             ('run.mjs, render.html', 'deterministic software-GL render of the DEM with the 1863 base-map layers from each pose (main, 30 and 50 degree fields); landmark projection'), ('compose.py -> reports/<pose>.jpg, metrics.json; overlay_lines.py -> reports/<pose>_lines.jpg', 'review sheets: photograph, render, edge overlay with landmark ticks, field variants; the model\'s road, building and fence lines on the photograph'),
             ('criteria.json, measure_c1.py -> criteria_measurements.json, skyline_test.py -> skyline_results.json', 'the pass criteria written before the renders, the measurement of the binary tests, the skyline test with its 24 control stations'),
             ('verdicts.json, registry_data.py, build_registry.py -> photograph_registry.json', f'the verdicts and the per-photograph registry (one entry for each of the {len(reg)} records)'), ('crops.py, sheets.py', 'print areas and contact sheets')]: A(f'| `{f}` | {t} |')
A('\nRun: `python3 tools/bt/photomatch/build_statements.py && tools/horde/bench.sh node tools/bt/photomatch/run.mjs && python3 tools/bt/photomatch/compose.py && python3 tools/bt/photomatch/measure_c1.py && tools/horde/bench.sh python3 tools/bt/photomatch/skyline_test.py && python3 tools/bt/photomatch/catalogue_wide_items.py && python3 tools/bt/photomatch/build_registry.py && python3 tools/bt/photomatch/make_doc.py`. Test: `node --test docs/battle-theatre/app/tests/photomatch-q16.test.mjs`.\n')
A('## Limits (registered as gaps: GOVERNANCE/horde/ws10-photomatch/proposed-register/)\n')
A('- The terrain is modern bare ground with the repository\'s 2023 building outlines at a default one-storey height: no 1863 trees, rocks, crops or fences in the near field, so only far ridge lines, hills, roads and mapped footprints can be compared (EG-03).')
A('- The focal length and plate of every exposure are unknown; 40 degrees horizontal is a generic assumption and renders at 30 and 50 degrees accompany every pose (EG-04).')
A('- Frassanito\'s camera positions are copyrighted and were not read; LOC text that cites him is a lead only (EG-06). Staged photographs are used for terrain and rocks only, never for the position of a body or prop (EG-05).')
A('- Positions named in words but not in the model (the McPherson quarry, De Trobriand Avenue and the Rose Woods edge, Seminary Lane, the Wheatfield Road and Crawford Avenue crossing) could be placed only as assumptions, or not at all (EG-10).')
A('- The NPS plate that labels the landmarks of the view north from Little Round Top is a photocopy and could not be mapped to the photograph (EG-11); the Trostle summer-kitchen footprint lies on the other side of the house from the photograph (EG-12).')
A('- The height of the camera on the gatehouse and the 1863 form of the building are not documented (EG-13); the two NPS words for the direction of the lodge-roof view differ by 45 degrees (EG-14).\n')
open(os.path.join(ROOT, 'docs', 'battle-theatre', 'app', 'docs', 'PHOTOMATCH.md'), 'w').write('\n'.join(L) + '\n')
print('PHOTOMATCH.md written', len(L), 'lines')

# ---------------------------------------------------------------------------------------------------------------- the workstream report (not shipped)
def report():
    R = []; B = R.append; ts = J('test_status.json') or {}
    B('# ws10 photo-match (Q16) report, third pass 2026-11-14 (second pass 2026-11-13, first pass 2026-11-11)\n')
    B(ts.get('scope_read', 'Scope read: CLAUDE.md; gates.json Q16; GATE-SPEC Q16; the PDF plan B.9.2 step 7 and Table 4; the second-pass report. Nothing was committed, pushed or deployed.') + '\n')
    B('## Result in one paragraph\n')
    B(ts.get('result_paragraph', '(to be written)') + '\n')
    B('## What was run (and what came of it)\n')
    for t in ts.get('what_was_run', []): B('- ' + t)
    B('\n## Verdicts of the poses that are new or changed in this pass\n')
    B('| Pose | Record | Verdict | Independent | Short reason |\n|---|---|---|---|---|')
    for p in poses:
        if p['id'] not in ts.get('new_or_changed', []): continue
        v = pv[p['id']]; B(f"| {p['id']} | {p.get('loc_id') or 'NPS figure'} | {v['verdict']} | {'yes' if v.get('independent_test') else 'no'} | {v['why'][:200].rstrip()}... |")
    B(f'\nAll poses: {vc.get("matches", 0)} matches, {vc.get("roughly", 0)} roughly, {vc.get("does not", 0)} does not, {vc.get("cannot judge", 0)} cannot judge over {len(poses)} poses; by record: posed {sum(1 for r in reg if r["pose_ids"])} of {len(reg)}, cannot judge without a pose {len(reg) - sum(1 for r in reg if r["pose_ids"])} (near field only {cls.get("NEAR", 0)}; camera place not fixed {cls.get("POS", 0)}; staged {cls.get("STG", 0)}; not July battlefield views {cls.get("OUT", 0)}).\n')
    B('## Findings worth another workstream\'s attention\n')
    for t in ts.get('findings', []): B('- ' + t)
    B('\n## Tests\n')
    for t in ts.get('tests', []): B('- ' + t)
    B('\n## Not run, owed\n')
    for t in ts.get('owed', []): B('- ' + t)
    B('\n## Owner steps (acts only the owner may do)\n')
    for t in G['owner_steps']: B('- ' + t)
    B('\n## Governance note\n')
    B(ts.get('governance_note', ''))
    open(os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'horde', 'ws10-photomatch', 'REPORT.md'), 'w').write('\n'.join(R) + '\n'); print('REPORT.md written', len(R), 'lines')
report()

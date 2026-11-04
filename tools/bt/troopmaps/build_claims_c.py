"""build_claims_c.py : labels_c.py (hand-read labels, Bachelder 1876 sheet 3 = Third day's battle) -> georeferenced raw label table + claim ledger.
Outputs: terrain/troopmaps/labels_sheet3_raw.json ; history/positions/troopmap_jul3_b1876.jsonl
Sigma model (metres, 1 sigma): transform = sqrt(16.5^2 + 2.4^2) (Warren leave-one-out absolute error, Bachelder-to-Warren relative CV); reading+placement from pixels:
  anchored: sqrt(15^2 + (aw/sqrt3)^2) px ; label-only: sqrt(15^2 + (100/sqrt3)^2) px (the label stands within about a label length of its line); converted to metres with the local scale of the chain."""
import json, math, sys, os, collections
import numpy as np
from pyproj import Transformer
from common_tm import *
import labels_c
S = SheetTransform('c'); tr = Transformer.from_crs('EPSG:32618', 'EPSG:4326', always_xy=True)
units = {u['id']: u for u in json.load(open(os.path.join(ROOT, 'docs/battle-theatre/history/units.json'), encoding='utf8'))['units']}
def mpp(p):
    p = np.array(p, float); a = S.scan_to_en(p + [50, 0])[0] - S.scan_to_en(p - [50, 0])[0]; b = S.scan_to_en(p + [0, 50])[0] - S.scan_to_en(p - [0, 50])[0]
    return float((np.linalg.norm(a) + np.linalg.norm(b)) / 200)
SIG_T = math.hypot(16.5, 2.4)
raw = []; claims = []
for i, L in enumerate(labels_c.L, 1):
    anchored = L['ax'] is not None
    px = (L['ax'], L['ay']) if anchored else (L['lx'], L['ly'])
    aw = L['aw'] if anchored else 100
    sig_px = math.hypot(15, aw / math.sqrt(3))
    m = mpp(px); en = S.scan_to_en(px)[0]; lng, lat = tr.transform(*en)
    lab_en = S.scan_to_en((L['lx'], L['ly']))[0]; llng, llat = tr.transform(*lab_en)
    sig_m = math.hypot(SIG_T, sig_px * m)
    r = dict(label_id=f'TM3-{i:03d}', **L, position_basis='line_symbol_centroid' if anchored else 'label_centre', pos_px=list(px), pos_en=[round(float(en[0]), 1), round(float(en[1]), 1)],
             lng=round(lng, 6), lat=round(lat, 6), label_lng=round(llng, 6), label_lat=round(llat, 6), sigma_m=round(sig_m, 1), sigma_px=round(sig_px, 1), m_per_px=round(m, 3))
    raw.append(r)
json.dump(dict(sheet='bachelder-1876-sheet3', scan='cw0325000c.jp2', loc_item='https://www.loc.gov/item/99447491/', transform='docs/basemap1863/maps/transforms/bachelder-1876-sheet3.json',
               sigma_transform_m=round(SIG_T, 2), labels=raw), open(os.path.join(OUT, 'labels_sheet3_raw.json'), 'w'), indent=1)
bad = [r for r in raw if r['unit_id'] and r['unit_id'] not in units]
assert not bad, bad
with open(os.path.join(ROOT, 'docs/battle-theatre/history/positions/troopmap_jul3_b1876.jsonl'), 'w', encoding='utf8') as f:
    n = 0
    for r in raw:
        if not r['unit_id']: continue
        n += 1; u = units[r['unit_id']]
        import re
        toks = set()
        for cm in (u.get('commanders_printed') or []) + [u.get('name') or '']:
            for part in re.split(r'[;/]', re.sub(r'\([^)]*\)', '', cm)):
                w = part.replace('.', ' ').split()
                if w: toks.add(w[-1].upper().replace("’S", '').replace("'S", ''))
        txt = r['text'].upper().replace("’", "'")
        import difflib
        toks = {t.replace("’", "").replace("'", "") for t in toks}
        words = [w.replace("'", "") for w in re.findall(r"[A-Z][A-Z'’]+", txt)]
        name_match = r['kind'] in ('headquarters',) or any(len(t) >= 3 and (t in txt.replace("'", "") or any(difflib.SequenceMatcher(None, t, w).ratio() >= 0.85 for w in words)) for t in toks)
        r['name_match'] = name_match
        clock = r['clock']
        when_printed = "Third day's battle (sheet title)" + ('; printed with the label: "%s"' % clock if clock else '')
        c = dict(claim_id=f'TM3-{n:03d}', unit_id=r['unit_id'], kind='position' if r['kind'] != 'arrow' else 'movement',
                 when=dict(printed=when_printed, date='1863-07-03', t_iso=None, approx=True,
                           description="the sheet is titled THIRD DAY'S BATTLE and prints no clock for most lines; line state (first position / intermediate / evening / all day per the legend) was not resolved; no time of day is claimed" + ('; the printed words "%s" stand near this label and are carried verbatim, their exact attachment is not proven' % clock if clock else '')),
                 place=dict(printed=r['text'], gazetteer_ref=None, direction_or_road=None),
                 geo=dict(lng=r['lng'], lat=r['lat'], sigma_m=r['sigma_m'], crs='EPSG:4326', basis=r['position_basis'], scan_px=r['pos_px'], label_px=[r['lx'], r['ly']], scan='cw0325000c.jp2 (LOC 99447491, sheet 3)', transform='docs/basemap1863/maps/transforms/bachelder-1876-sheet3.json (TPS scan->Warren px, Warren affine)'),
                 activity=f"The map prints the label \"{r['text']}\" for this {'brigade (movement arrow)' if r['kind'] == 'arrow' else r['kind']} at this place" + ('; ' + r['note'] if r['note'] else ''),
                 source=dict(report_id='BACHELDER-1876-S3', report_no=None, author='J. B. Bachelder (positions compiled for the War Department from official reports, private letters and consultations; topography Warren survey); Boston 1876; LOC 99447491', printed_page=None, interpolated=False, quote=r['text'], crop=r['crop'], crop_spec='tools/bt/troopmaps/crops_c.json'),
                 tier='documented' if name_match else 'inferred', render_flag=0, weak_source=False, flag_single_source=True,
                 claim_support_verified=True, ocr_uncertain=False, conflicts_with=[],
                 note=("Single source. Compiled map, tier 2 (contemporary map) per PDF E.1 but compiled 13 years after the battle from the OR and testimony, so not independent of the OR. "
                       + ("Unit assignment: the printed label is the commander surname/ordinal; mapping to units.json by commander name (name matches the commander recorded in units.json). " if name_match else "Unit assignment is INFERRED: the printed name does not match a commander recorded in units.json for this unit; assigned through the commander chain/ordinal (see activity note), so tier is inferred. ")
                       + "Position is a map symbol, accurate to the stated sigma (metres, 1 sigma) only if the Warren georeference holds."),
                 placement_refs=[], fidelity_check='read_by_eye_in_ink_layer_crop')
        f.write(json.dumps(c, ensure_ascii=False) + '\n')
print('labels', len(raw), 'claims', n)
lvl = collections.Counter(); seen = set()
for r in raw:
    if r['unit_id'] and r['unit_id'] not in seen: seen.add(r['unit_id']); lvl[(units[r['unit_id']]['army'], units[r['unit_id']]['level'])] += 1
print(sorted(lvl.items()))
sg = [r['sigma_m'] for r in raw]; print('sigma min/med/max', min(sg), float(np.median(sg)), max(sg))

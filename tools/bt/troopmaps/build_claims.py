"""build_claims.py <b|c> : hand-read labels (labels_b.py = Second day's battle, labels_c.py = Third day's battle of Bachelder 1876, LOC 99447491)
-> terrain/troopmaps/labels_sheet{2,3}_raw.json and history/positions/troopmap_jul{2,3}_b1876.jsonl.
Sigma (metres, 1 sigma): transform sqrt(16.5^2 + rel_cv^2) (Warren leave-one-out, Bachelder-to-Warren relative CV of that sheet) combined with
reading/placement in pixels: anchored sqrt(15^2 + (aw/sqrt3)^2) ; label-only sqrt(15^2 + (100/sqrt3)^2), converted with the local scale of the chain.
Line state: nearest legend swatch of the same sheet and colour (linestate2.py), strict margin, else null. Printed clocks: label field `clock`;
t_iso only when the clock parses completely (H[.MM] A.M./P.M.) and is a single clock; attachment recorded."""
import json, math, sys, os, re, difflib, collections
import numpy as np, cv2
os.environ['OPENCV_IO_MAX_IMAGE_PIXELS'] = str(2**40)
from pyproj import Transformer
from common_tm import *
import linestate2 as LS

sheet = sys.argv[1]
N = {'b': 2, 'c': 3}[sheet]
DATE = {'b': '1863-07-02', 'c': '1863-07-03'}[sheet]
TITLE = {'b': "Second day's battle", 'c': "Third day's battle"}[sheet]
labels = __import__('labels_' + sheet).L
S = SheetTransform(sheet)
tr = Transformer.from_crs('EPSG:32618', 'EPSG:4326', always_xy=True)
units = {u['id']: u for u in json.load(open(os.path.join(ROOT, 'docs/battle-theatre/history/units.json'), encoding='utf8'))['units']}
im = cv2.imread(os.path.join(TMP, 'full_%s.png' % sheet))
REF = {sd: LS.refs(im, sheet, sd) for sd in ('US', 'CS')}
rel = S.T['accuracy']['relative_cv_rmse_m']
SIG_T = math.hypot(16.5, rel)


def mpp(p):
    p = np.array(p, float)
    a = S.scan_to_en(p + [50, 0])[0] - S.scan_to_en(p - [50, 0])[0]
    b = S.scan_to_en(p + [0, 50])[0] - S.scan_to_en(p - [0, 50])[0]
    return float((np.linalg.norm(a) + np.linalg.norm(b)) / 200)


CLK = re.compile(r'(?<![\d.])(\d{1,2})(?:[.:](\d{2}))?\s*([AP])\.?\s?M\.?')


def parse_clock(c):
    if not c:
        return None
    ms = CLK.findall(c)
    if len(ms) != 1:
        return None
    h, mi, ap = int(ms[0][0]), int(ms[0][1] or 0), ms[0][2]
    if h > 12 or mi > 59:
        return None
    if ap == 'P' and h < 12:
        h += 12
    if ap == 'A' and h == 12:
        h = 0
    return '%02d:%02d' % (h, mi)


raw = []
for i, L in enumerate(labels, 1):
    anchored = L['ax'] is not None
    px = (L['ax'], L['ay']) if anchored else (L['lx'], L['ly'])
    aw = L['aw'] if anchored else 100
    sig_px = math.hypot(15, aw / math.sqrt(3))
    m = mpp(px)
    en = S.scan_to_en(px)[0]
    lng, lat = tr.transform(*en)
    lab_en = S.scan_to_en((L['lx'], L['ly']))[0]
    llng, llat = tr.transform(*lab_en)
    st, mets = (None, {})
    if anchored and L['unit_id'] and L['side'] in REF:
        st, mets = LS.classify(im, REF[L['side']], L['ax'], L['ay'], L['aw'], L['side'])
    raw.append(dict(label_id='TM%d-%03d' % (N, i), **L, position_basis='line_symbol_centroid' if anchored else 'label_centre', pos_px=list(px),
                    pos_en=[round(float(en[0]), 1), round(float(en[1]), 1)], lng=round(lng, 6), lat=round(lat, 6), label_lng=round(llng, 6), label_lat=round(llat, 6),
                    sigma_m=round(math.hypot(SIG_T, sig_px * m), 1), sigma_px=round(sig_px, 1), m_per_px=round(m, 3), line_state_auto_rejected=st, line_state_metrics=mets))

json.dump(dict(sheet='bachelder-1876-sheet%d' % N, scan='cw0325000%s.jp2' % sheet, loc_item='https://www.loc.gov/item/99447491/',
               transform='docs/basemap1863/maps/transforms/bachelder-1876-sheet%d.json' % N, sigma_transform_m=round(SIG_T, 2), labels=raw),
          open(os.path.join(OUT, 'labels_sheet%d_raw.json' % N), 'w'), indent=1)
bad = [r for r in raw if r['unit_id'] and r['unit_id'] not in units]
assert not bad, [b['text'] for b in bad]
out = os.path.join(ROOT, 'docs/battle-theatre/history/positions', 'troopmap_jul%d_b1876.jsonl' % N)
n = 0
with open(out, 'w', encoding='utf8') as f:
    for r in raw:
        if not r['unit_id']:
            continue
        n += 1
        u = units[r['unit_id']]
        toks = set()
        for cm in (u.get('commanders_printed') or []) + [u.get('name') or '']:
            for part in re.split(r'[;/]', re.sub(r'\([^)]*\)', '', cm)):
                w = part.replace('.', ' ').split()
                if w:
                    toks.add(w[-1].upper().replace('’S', '').replace("'S", '').replace('’', '').replace("'", ''))
        txt = r['text'].upper().replace('’', "'")
        words = [w.replace("'", '') for w in re.findall(r"[A-Z][A-Z'’]+", txt)]
        name_match = r['kind'] == 'headquarters' or any(len(t) >= 3 and (t in txt.replace("'", '') or any(difflib.SequenceMatcher(None, t, w).ratio() >= 0.85 for w in words)) for t in toks)
        clock = r['clock']
        t = parse_clock(clock)
        span_end = bool(clock and re.search(r'\b(till|to|then moved)\b', clock))
        tiso = ('%sT%s' % (DATE, t)) if (t and not span_end) else None
        t_end = ('%sT%s' % (DATE, t)) if (t and span_end) else None
        attach = None
        if clock and re.search(r'\d', clock):
            nt = r['note'].lower()
            attach = 'arrow' if re.search(r'clock[^;]*arrow|head of (two )?dashed|arrow bearing|movement arrow', nt) and 'same run' not in nt else ('same_run' if ('same run' in nt or 'beside' in nt or 'printed' in nt) else 'adjacent')
            if 'not proven' in nt or 'natural reading' in nt:
                attach = 'adjacent_unproven'
        c = dict(claim_id='TM%d-%03d' % (N, n), unit_id=r['unit_id'], kind='position' if r['kind'] != 'arrow' else 'movement',
                 when=dict(printed=TITLE + ' (sheet title)' + ('; printed near the label: "%s"' % clock if clock else ''), date=DATE, t_iso=tiso, t_end_iso=t_end, approx=True,
                           line_state=None,
                           line_state_basis=('not read: the automatic legend-swatch classifier (tools/bt/troopmaps/linestate2.py) was run on every anchored symbol and its 20 positive readings failed the visual check (solid bars read as first position or intermediate), so none is recorded; the hand read of each symbol texture is a pending step (TROOP-MAPS-NOTES.md section 7)' if r['position_basis'] == 'line_symbol_centroid' else 'no line symbol identified for this label'),
                           clock_attachment=attach,
                           description="the sheet is titled %s; most lines print no clock; the legend's line state (first position / intermediate / evening / all day) is given in line_state where the symbol could be classified" % TITLE.upper()
                           + ('; the printed clock "%s" stands next to this label (attachment: %s); t_iso is set only when it parses as a single complete clock that is not the end of a stated span (a span end goes to t_end_iso)' % (clock, attach) if clock else '')),
                 place=dict(printed=r['text'], gazetteer_ref=None, direction_or_road=None),
                 geo=dict(lng=r['lng'], lat=r['lat'], sigma_m=r['sigma_m'], crs='EPSG:4326', basis=r['position_basis'], scan_px=r['pos_px'], label_px=[r['lx'], r['ly']],
                          scan='cw0325000%s.jp2 (LOC 99447491, sheet %d)' % (sheet, N), transform='docs/basemap1863/maps/transforms/bachelder-1876-sheet%d.json (TPS scan->Warren px, Warren affine)' % N),
                 activity='The map prints the label "%s" for this %s at this place' % (r['text'], 'brigade (movement arrow)' if r['kind'] == 'arrow' else r['kind']) + ('; ' + r['note'] if r['note'] else ''),
                 source=dict(report_id='BACHELDER-1876-S%d' % N, report_no=None, author='J. B. Bachelder (positions compiled for the War Department from official reports, private letters and consultations; topography Warren survey); Boston 1876; LOC 99447491',
                             printed_page=None, interpolated=False, quote=r['text'], crop=r['crop'], crop_spec='tools/bt/troopmaps/crops_%s.json' % sheet),
                 tier='documented' if name_match else 'inferred', render_flag=0, weak_source=False, flag_single_source=True, claim_support_verified=True,
                 ocr_uncertain=bool(re.search(r'\[|\.\.\.|\?', r['text'] + r['note'])), conflicts_with=[],
                 note=('Single source. Compiled map, tier 2 (contemporary map) per PDF E.1 but compiled 13 years after the battle from the OR and testimony, so not independent of the OR. Day-level position (DEC-010). '
                       + ('Unit assignment: name matches the commander recorded in units.json. ' if name_match else 'Unit assignment is INFERRED: the printed name does not match a commander recorded in units.json for this unit; assigned through the commander chain/ordinal (see activity note). ')
                       + 'Position is a map symbol, accurate to the stated sigma (metres, 1 sigma) only if the Warren georeference holds.'),
                 placement_refs=[], fidelity_check='read_by_eye_in_ink_layer_crop')
        f.write(json.dumps(c, ensure_ascii=False) + '\n')

cov = collections.defaultdict(list)
for r in raw:
    if r['unit_id']:
        cov[r['unit_id']].append(r)
br = {k: u for k, u in units.items() if u['level'] == 'brigade'}
print('labels', len(raw), 'claims', n, 'brigades', sum(k in cov for k in br), 'of', len(br), 'US', sum(k in cov for k in br if br[k]['army'] == 'US'), 'CS', sum(k in cov for k in br if br[k]['army'] == 'CS'))
print('auto line_state (rejected)', collections.Counter(r['line_state_auto_rejected'] for r in raw if r['position_basis'] == 'line_symbol_centroid' and r['unit_id']))
print('clocks with t_iso', sum(1 for r in raw if r['unit_id'] and parse_clock(r['clock'])), 'clocks printed', sum(1 for r in raw if r['unit_id'] and r['clock']))

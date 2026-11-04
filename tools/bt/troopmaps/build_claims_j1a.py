"""build_claims_j1a.py : labels_j1a.py (hand-read, Bachelder 1876 sheet 1 = First day's battle) -> georeferenced label table + claim ledger.
Outputs: terrain/troopmaps/labels_sheet1_raw.json ; history/positions/troopmap_jul1_b1876.jsonl
Transform: roads-task registration (fieldmodel_a.py). Sigma (1 sigma, metres) = sqrt(T^2 + (reading+placement)^2), T = 30 m inside the validated region (scan y >= 1900 and x >= 1500), 50 m outside it.
reading+placement px: anchored sqrt(15^2+(aw/sqrt3)^2); label-only sqrt(15^2+(100/sqrt3)^2); times local m/px."""
import json, math, os, collections
import numpy as np
from pyproj import Transformer
from common_tm import *
import fieldmodel_a as FM, labels_j1a
tr = Transformer.from_crs('EPSG:32618', 'EPSG:4326', always_xy=True)
units = {u['id']: u for u in json.load(open(os.path.join(ROOT, 'docs/battle-theatre/history/units.json'), encoding='utf8'))['units']}
D, I = 'doc', 'inf'
MAP = {  # label index -> list of (unit_id, tier)
 0: [('cs-3c-pender-thomas', D)], 14: [('cs-3c-pender-thomas', D)], 1: [('cs-3c-pender-poague', D)], 2: [], 3: [('cs-3c-pender-scales', D)], 8: [('cs-3c-pender-scales', D)], 32: [('cs-3c-pender-scales', D)],
 4: [('cs-3c-pender', D)], 5: [('cs-3c-pender-mcgowan', D)], 13: [('cs-3c-pender-mcgowan', D)], 58: [('cs-3c-pender-mcgowan', D)], 6: [('cs-3c-pender-lane', D)], 62: [('cs-3c-pender-lane', D)], 116: [('cs-3c-pender-lane', D)],
 7: [('cs-3c-heth-garnett', D)], 9: [('cs-3c-heth-pettigrew', D)], 54: [('cs-3c-heth-pettigrew', D)], 117: [('cs-3c-heth-pettigrew', D)], 10: [('cs-3c-heth-brockenbrough', D)], 21: [('cs-3c-heth-brockenbrough', D)],
 11: [], 12: [], 15: [], 16: [('cs-3c-heth-davis', D)], 19: [('cs-3c-heth-davis', D)], 34: [('cs-3c-heth-davis', D)], 35: [('cs-3c-heth-davis', D)], 36: [('cs-3c-heth-davis', D)],
 17: [('cs-3c-heth-archer', D)], 119: [('cs-3c-heth-archer', D)], 18: [('cs-3c-heth', D)], 20: [('cs-3c-res-art-mcintosh', D)], 22: [('cs-3c', D)],
 23: [('us-1c-1d-cutler', D)], 24: [('us-1c-1d-cutler', D)], 39: [('us-1c-1d-cutler', D)], 44: [('us-1c-1d-cutler', D)], 25: [], 26: [('us-1c-art-2me', D)], 27: [('us-1c-3d', I)],
 28: [('us-1c-3d-stone', D)], 33: [('us-1c-3d-stone', D)], 29: [('us-cav-1d', D)], 63: [('us-cav-1d', D)], 30: [('us-cav-1d-gamble', D)], 61: [('us-cav-1d-gamble', D)], 31: [('us-1c-art-1nyl', I)],
 37: [('cs-2c-rodes-daniel', D)], 69: [('cs-2c-rodes-daniel', D)], 120: [('cs-2c-rodes-daniel', D)], 38: [('us-1c-1d', D)], 53: [('us-1c-1d', D)], 40: [('cs-2c-rodes-ramseur', D)], 65: [('cs-2c-rodes-ramseur', D)], 122: [('cs-2c-rodes-ramseur', D)],
 41: [('us-1c-2d-baxter', D)], 48: [('us-1c-2d-baxter', D)], 42: [('us-1c-2d-paul', D)], 60: [('us-1c-2d-paul', D)], 43: [('us-1c-2d', D)], 50: [('us-1c-2d', D)], 45: [('us-1c-art', D)], 47: [('us-1c-art', D)], 46: [('us-1c', D)],
 49: [('us-1c-art-5me', D)], 51: [('us-1c-1d-meredith', D)], 52: [('us-1c-1d-meredith', D)], 55: [('us-1c-art-1pab', D)], 56: [('us-1c-3d-biddle', D)], 57: [('us-1c-3d-biddle', D)], 59: [('us-1c-3d-biddle', D)],
 64: [('cs-2c-rodes', D)], 99: [('cs-2c-rodes', D)], 66: [('cs-2c-rodes-oneal', D)], 97: [('cs-2c-rodes-oneal', D)], 90: [('cs-2c-rodes-oneal', D)], 67: [('cs-2c-rodes-iverson', D)], 101: [('cs-2c-rodes-iverson', D)],
 68: [('us-cav-1d-devin', D)], 75: [('us-cav-1d-devin', D)], 115: [('us-cav-1d-devin', D)], 70: [], 71: [('cs-2c-rodes-doles', D)], 72: [('cs-2c-rodes-doles', D)], 89: [('cs-2c-rodes-doles', D)], 95: [('cs-2c-rodes-doles', D)],
 73: [('us-11c-3d-schimmelfennig', D)], 74: [('us-11c-3d-schimmelfennig', D)], 78: [('us-11c-3d-schimmelfennig', D)], 76: [], 77: [('us-11c-art-13ny', D)], 79: [('us-11c-art-1ohi', D)], 80: [('us-11c-3d', D)], 81: [('us-11c-3d', D)],
 82: [('us-11c', D)], 83: [('us-11c-art', D)], 84: [('us-11c-1d', I), ('us-11c-3d', I)], 85: [('us-11c-3d-krzyzanowski', D)], 86: [('us-11c-1d-ames', D)], 94: [('us-11c-1d-ames', D)], 87: [('cs-2c-early-hays', D)], 103: [('cs-2c-early-hays', D)], 107: [('cs-2c-early-hays', D)],
 88: [('cs-2c-early-gordon', D)], 102: [('cs-2c-early-gordon', D)], 91: [('us-11c-1d', D)], 92: [('us-11c-art-4usg', D)], 93: [('us-11c-1d-gilsa', D)], 96: [('cs-2c', D)], 98: [], 100: [('cs-2c-rodes-carter', D)], 121: [('cs-2c-rodes-carter', D)],
 104: [('cs-2c-early', D)], 105: [('cs-2c-early-jones', D)], 106: [('cs-2c-early-hoke', D)], 108: [('cs-2c-early-hoke', D)], 109: [('us-11c-2d-coster', D)], 110: [('us-11c-art-1ohk', D)], 111: [('us-11c-2d-smith', D)],
 112: [('us-11c', D)], 113: [('us-11c-2d', D)], 114: [('us-11c-art-1nyi', D)], 118: [],
}
KIND_OVERRIDE = {90: 'movement'}
ADJ = {23, 39, 37, 56, 72}   # clocks printed beside, not in, the label text (attachment natural but not proven)
import re
def clk(c):
    """-> (t_iso_time, t_start, t_end, kind). Handles H, H.MM, H'P.M. (prime), 3 1/2, spans 'a-b P.M.'; None when no A.M./P.M. is printed."""
    if not c: return None
    x = c.replace("'", '').replace('3 1/2', '3.30')
    def hm(h, m, ap):
        h = int(h); m = int(m or 0)
        if ap == 'P' and h < 12: h += 12
        if ap == 'A' and h == 12: h = 0
        return '%02d:%02d' % (h, m)
    sp = re.search(r'(\d{1,2})\s*-\s*(\d{1,2})\s*([AP])\.?\s?M', x)
    if sp: return (None, hm(sp.group(1), 0, sp.group(3)), hm(sp.group(2), 0, sp.group(3)), 'span')
    ms = re.findall(r'(?<![\d.])(\d{1,2})(?:[.:](\d{2}))?\s*([AP])\.?\s?M', x)
    if len(ms) == 1: return (hm(*ms[0]), None, None, 'single')
    return None
def mpp(p):
    a = FM.scan_to_en(p[0] + 50, p[1]) - FM.scan_to_en(p[0] - 50, p[1]); b = FM.scan_to_en(p[0], p[1] + 50) - FM.scan_to_en(p[0], p[1] - 50)
    return float((np.linalg.norm(a) + np.linalg.norm(b)) / 200)
raw = []; claims = []; n = 0
SRC = "J. B. Bachelder (positions compiled for the War Department from official reports, private letters and consultations; topography Warren survey); Boston 1876; LOC 99447491, sheet 1 (First day's battle)"
for i, L in enumerate(labels_j1a.L):
    anchored = L['ax'] is not None; px = (L['ax'], L['ay']) if anchored else (L['lx'], L['ly']); aw = L['aw'] if anchored else 100
    sig_px = math.hypot(15, aw / math.sqrt(3)); m = mpp(px); en = FM.scan_to_en(*px); lng, lat = tr.transform(*en)
    T = 30.0 if (px[1] >= 1900 and px[0] >= 1500) else 50.0
    sig = math.hypot(T, sig_px * m); lab_en = FM.scan_to_en(L['lx'], L['ly']); llng, llat = tr.transform(*lab_en)
    r = dict(label_idx=i, text=L['text'], side=L['side'], kind=L['kind'], lx=L['lx'], ly=L['ly'], ax=L['ax'], ay=L['ay'], aw=L['aw'], clock=L['clock'], state=L['state'], note=L['note'], crop=L['crop'],
             position_basis='line_symbol_centroid' if anchored else 'label_centre', pos_px=list(px), lng=round(lng, 6), lat=round(lat, 6), label_lng=round(llng, 6), label_lat=round(llat, 6), sigma_m=round(sig, 1), sigma_transform_m=T, m_per_px=round(m, 3),
             unit_ids=[u for u, t in MAP.get(i, [])])
    raw.append(r)
    for uid, tier in MAP.get(i, []):
        assert uid in units, uid
        n += 1; clock = L['clock']; state = L['state']
        printed = "First day's battle (sheet title)" + ('; printed with the label: "%s"' % clock if clock else '')
        sdesc = {'first_position': "first position (the legend's outlined bar with a dark wedge)", 'evening': "evening (the legend's solid bar)"}.get(state)
        ck = clk(clock); attach = None
        if clock: attach = 'adjacent_unproven' if i in ADJ else ('same_run' if ck else 'no_ampm_printed' if re.search(r'\d', clock) else 'word_only')
        c = dict(claim_id=f'TMJ1-{n:03d}', unit_id=uid, kind=KIND_OVERRIDE.get(i, 'position'),
                 when=dict(printed=printed, date='1863-07-01', t_iso=('1863-07-01T' + ck[0]) if ck and ck[3] == 'single' else None, t_start_iso=('1863-07-01T' + ck[1]) if ck and ck[3] == 'span' else None, t_end_iso=('1863-07-01T' + ck[2]) if ck and ck[3] == 'span' else None, approx=True, line_state=state, line_state_legend=sdesc, clock_attachment=attach,
                           description="the sheet is titled FIRST DAY'S BATTLE; most lines print no clock (day-level, DEC-010); line state per the legend is given only where the bar style matches one legend swatch (line_state), otherwise none is claimed"
                                       + ('; the printed clock "%s" stands with this label (attachment: %s); t_iso is set only for a single complete clock with A.M./P.M. printed, a span "a-b P.M." goes to t_start_iso/t_end_iso, and a clock without A.M./P.M. or a time word gives no t_iso (same convention as troopmap_jul2/3)' % (clock, attach) if clock else '')),
                 place=dict(printed=L['text'], gazetteer_ref=None, direction_or_road=None),
                 geo=dict(lng=r['lng'], lat=r['lat'], sigma_m=r['sigma_m'], crs='EPSG:4326', basis=r['position_basis'], scan_px=r['pos_px'], label_px=[L['lx'], L['ly']], scan='cw0325000a.jp2 (LOC 99447491, sheet 1)',
                          transform='docs/basemap1863/features/roads-rail-water/registration_sheet_a.json (base affine + displacement field), re-validated in terrain/troopmaps/transform_bachelder1876_sheet1_j1.json', sigma_transform_m=T),
                 activity=f"The map prints the label \"{L['text']}\" for this {L['kind'].replace('_', ' ')} at this place" + ('; ' + L['note'] if L['note'] else ''),
                 source=dict(report_id='BACHELDER-1876-S1', report_no=None, author=SRC, printed_page=None, interpolated=False, quote=L['text'], crop=L['crop'], crop_spec='tools/bt/troopmaps/crops_j1.json (docs/battle-theatre/terrain/troopmaps/crops_j1/)'),
                 tier='documented' if tier == D else 'inferred', render_flag=0, weak_source=False, flag_single_source=True, claim_support_verified=True, ocr_uncertain=False, conflicts_with=[],
                 note=("Single source. Compiled map (1876), tier 2 contemporary map per PDF E.1, compiled 13 years after the battle from the OR and testimony, so not independent of the OR. "
                       + ("Unit assignment by the commander/designation printed (matches the commander or designation recorded in units.json). " if tier == D else "Unit assignment is INFERRED (the printed name or designation does not identify exactly this units.json unit; see activity). ")
                       + "Day-level position (DEC-010). Position is a map symbol, accurate to the stated sigma only if the registration holds; the transform bound is stated in terrain/troopmaps/ACCURACY.md."),
                 placement_refs=[], fidelity_check='read_by_eye_in_plain_crop')
        claims.append(c)
json.dump(dict(sheet='bachelder-1876-sheet1', scan='cw0325000a.jp2', loc_item='https://www.loc.gov/item/99447491/', labels=raw), open(os.path.join(OUT, 'labels_sheet1_raw.json'), 'w'), indent=1)
with open(os.path.join(ROOT, 'docs/battle-theatre/history/positions/troopmap_jul1_b1876.jsonl'), 'w', encoding='utf8') as f:
    for c in claims: f.write(json.dumps(c, ensure_ascii=False) + '\n')
print('labels', len(raw), 'claims', len(claims), 'unmatched labels', [r['text'] for r in raw if not r['unit_ids']])
lvl = collections.Counter(); seen = set()
for c in claims:
    if c['unit_id'] not in seen: seen.add(c['unit_id']); lvl[(units[c['unit_id']]['army'], units[c['unit_id']]['level'])] += 1
print(sorted(lvl.items())); sg = [c['geo']['sigma_m'] for c in claims if units[c['unit_id']]['level'] == 'brigade']; print('brigade sigma min/med/max', min(sg), float(np.median(sg)), max(sg))
print(collections.Counter(c['tier'] for c in claims))

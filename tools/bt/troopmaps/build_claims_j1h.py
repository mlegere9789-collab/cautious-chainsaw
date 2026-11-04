"""build_claims_j1h.py : labels_j1h.py (LOC 99447494, July 1, 2 to 3.30 P.M.) -> terrain/troopmaps/labels_loc99447494_raw.json + history/positions/troopmap_jul1_hour_loc99447494.jsonl
Transform: transform_loc99447494_july1_v2.json (affine px -> UTM18N from 12 hand controls, LOO 37.7 m). Sigma = sqrt(T^2 + (px term x m/px)^2); T = 40 m inside the control region (x 1700-3300, y 790-3730), 60 m outside; px term: anchored sqrt(8^2+(aw/sqrt3)^2), label-only sqrt(8^2+(60/sqrt3)^2)."""
import json, math, os, collections
import numpy as np
from pyproj import Transformer
from common_tm import *
import labels_j1h
T2 = json.load(open(os.path.join(OUT, 'transform_loc99447494_july1_v2.json'))); co = T2['coef']
m = georef.Model('affine'); m.coef = np.array(co['A']); m.c = np.array(co['c']); m.s = co['s']; m.dc = np.array(co['dc']); m.ds = co['ds']; m.kind = 'affine'; m.deg = 1
tr = Transformer.from_crs('EPSG:32618', 'EPSG:4326', always_xy=True)
units = {u['id']: u for u in json.load(open(os.path.join(ROOT, 'docs/battle-theatre/history/units.json'), encoding='utf8'))['units']}
MAP = ["cs-3c", "cs-3c-pender", "cs-3c-heth", "us-1c-1d-meredith", "us-1c-3d-biddle", "us-1c-3d-stone", "cs-2c-rodes", "us-1c-2d-baxter", "us-1c-2d-paul", "us-1c-1d-cutler", "us-1c",
       "us-11c-3d-schimmelfennig", "us-11c-3d-krzyzanowski", "us-11c", "us-11c-1d-ames", "us-11c-1d-gilsa", "cs-2c-early-gordon", "cs-2c-early", "cs-2c-early-hays", "cs-2c-early-hoke",
       "us-11c-2d-coster", "us-cav-1d-devin", "us-11c-2d-smith", "us-11c-2d", "us-cav-1d-gamble", "cs-2c"]
assert len(MAP) == len(labels_j1h.L), (len(MAP), len(labels_j1h.L))
def mpp(p):
    a = m(np.array([p]) + [50, 0]) - m(np.array([p]) - [50, 0]); b = m(np.array([p]) + [0, 50]) - m(np.array([p]) - [0, 50]); return float((np.linalg.norm(a) + np.linalg.norm(b)) / 200)
SRC = "LOC 99447494, 'Battle of Gettysburg, July 1, 1863. First day. General position of troops, 2 to 3.30 P.M.', plate II, scale 1950 ft to the inch, contours 20 ft; author and date not stated by the Library of Congress (author 'unknown', date '19??'); topography drawn from the Warren survey; Commons copy of the LOC scan"
PROV = ("PROVENANCE NOT ESTABLISHED: the Library of Congress record gives no author and no date ('19??'); the drawing is Warren-derived and its plate number II suggests a series, but the series, its compiler and its date of publication are unverified, "
        "so its public-domain status rests only on the LOC/Commons marking and the claim cannot be 'documented'")
raw = []; claims = []
for i, (L, uid) in enumerate(zip(labels_j1h.L, MAP)):
    anchored = L['ax'] is not None; px = (L['ax'], L['ay']) if anchored else (L['lx'], L['ly']); aw = L['aw'] if anchored else 60
    sig_px = math.hypot(8, aw / math.sqrt(3)); mp = mpp(px); en = m(np.array([px], float))[0]; lng, lat = tr.transform(*en)
    T = 40.0 if (1700 <= px[0] <= 3300 and 790 <= px[1] <= 3730) else 60.0
    sig = math.hypot(T, sig_px * mp); lab = m(np.array([[L['lx'], L['ly']]], float))[0]; llng, llat = tr.transform(*lab)
    r = dict(label_idx=i, text=L['text'], side=L['side'], kind=L['kind'], lx=L['lx'], ly=L['ly'], ax=L['ax'], ay=L['ay'], aw=L['aw'], note=L['note'], crop=L['crop'], position_basis='line_symbol_centroid' if anchored else 'label_centre',
             pos_px=list(px), lng=round(lng, 6), lat=round(lat, 6), label_lng=round(llng, 6), label_lat=round(llat, 6), sigma_m=round(sig, 1), sigma_transform_m=T, m_per_px=round(mp, 3), unit_id=uid)
    raw.append(r); assert uid in units, uid
    c = dict(claim_id=f'TMJ1H-{i + 1:03d}', unit_id=uid, kind='position',
             when=dict(printed="2 to 3.30 P.M. (printed in the sheet title: GENERAL POSITION OF TROOPS, 2 TO 3.30 P.M.)", date='1863-07-01', t_iso=None, t_start_iso='1863-07-01T14:00', t_end_iso='1863-07-01T15:30', approx=False,
                       description="the sheet prints a time WINDOW (2 to 3.30 P.M.), not a single clock: t_iso is null and the two printed clocks are given as t_start_iso and t_end_iso; the position is the sheet's general position of this unit within that window, not a position at a minute"),
             place=dict(printed=L['text'], gazetteer_ref=None, direction_or_road=None),
             geo=dict(lng=r['lng'], lat=r['lat'], sigma_m=r['sigma_m'], crs='EPSG:4326', basis=r['position_basis'], scan_px=r['pos_px'], label_px=[L['lx'], L['ly']], scan='commons_LOC99447494_july1_2to330pm.jpg (LOC 99447494)',
                      transform='docs/battle-theatre/terrain/troopmaps/transform_loc99447494_july1_v2.json (affine, 12 hand controls, leave-one-out 37.7 m)', sigma_transform_m=T),
             activity=f"The sheet prints the label \"{L['text']}\" for this {L['kind']} at this place" + ('; ' + L['note'] if L['note'] else ''),
             source=dict(report_id='LOC-99447494', report_no=None, author=SRC, printed_page=None, interpolated=False, quote=L['text'], crop=L['crop'], crop_spec='tools/bt/troopmaps/crops_j1.json (docs/battle-theatre/terrain/troopmaps/crops_j1/)'),
             tier='inferred', render_flag=0, weak_source=True, flag_single_source=True, claim_support_verified=True, ocr_uncertain=False, conflicts_with=[],
             note=(PROV + ". The sheet itself prints this unit label at this place and its own time label (the window above), but tier is 'inferred' because the sheet's author, date and publication cannot be established. "
                   "Unit assignment by the commander surname or formation name printed (matches units.json). Single source; Warren-derived topography; position is a map symbol accurate to the stated sigma only if the 12-control affine holds (sheet scale 1950 ft to the inch, about 1.93 m per px)."),
             placement_refs=[], fidelity_check='read_by_eye_in_plain_crop')
    claims.append(c)
json.dump(dict(sheet='loc-99447494-july1-2to330pm', scan='commons_LOC99447494_july1_2to330pm.jpg', loc_item='https://www.loc.gov/item/99447494/', transform='terrain/troopmaps/transform_loc99447494_july1_v2.json', labels=raw), open(os.path.join(OUT, 'labels_loc99447494_raw.json'), 'w'), indent=1)
with open(os.path.join(ROOT, 'docs/battle-theatre/history/positions/troopmap_jul1_hour_loc99447494.jsonl'), 'w', encoding='utf8') as f:
    for c in claims: f.write(json.dumps(c, ensure_ascii=False) + '\n')
lvl = collections.Counter((units[c['unit_id']]['army'], units[c['unit_id']]['level']) for c in claims)
print('claims', len(claims), sorted(lvl.items())); sg = [c['geo']['sigma_m'] for c in claims if units[c['unit_id']]['level'] == 'brigade']; print('brigade sigma', min(sg), float(np.median(sg)), max(sg))

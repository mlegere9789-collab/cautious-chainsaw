"""Score the EXISTING site placements (docs/pitch/anim/prototype/data/dataset.json, 478 units, 1,687 keyframes, legacy frame) against Pass A
for the pilot hour. Ticks are converted to LMT with the adjudicated anchors (docs/time/evidence/anchors-final.json) by linear interpolation.
The site is compared twice: raw (its own frame) and translated so that its Little Round Top place mark (legacy LOC-003) coincides with the measured summit (best case for the site).
usage: python score_site.py   -> results/site-vs-A.json"""
import json, math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); BASE = os.path.abspath(os.path.join(HERE, '..')); ROOT = os.path.abspath(os.path.join(BASE, '..', '..', '..'))
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(BASE, 'pilot'))
import pilot_lib as L
from geo import to_xy, dist_m

ds = json.load(open(os.path.join(ROOT, 'docs/pitch/anim/prototype/data/dataset.json'), encoding='utf-8'))
fin = json.load(open(os.path.join(ROOT, 'docs/time/evidence/anchors-final.json'), encoding='utf-8'))['anchors']
anch = sorted((int(k), L.hm(v['t'])) for k, v in fin.items())            # (tick, minute of day on the day's own date; day 2 anchors only are used here)
anch = [(t, m) for t, m in anch if 226 <= t <= 340]
def tick_to_min(tk):
    for (t0, m0), (t1, m1) in zip(anch, anch[1:]):
        if t0 <= tk <= t1:
            return m0 + (m1 - m0) * (tk - t0) / (t1 - t0)
    return None
def min_to_tick(m):
    for (t0, m0), (t1, m1) in zip(anch, anch[1:]):
        if m0 <= m <= m1:
            return t0 + (t1 - t0) * (m - m0) / (m1 - m0)
    return None

# site LRT mark (legacy frame) vs measured summit: the translation that gives the site its best case
leg = json.load(open(os.path.join(ROOT, 'legacy/dist/data/terrain.json'), encoding='utf-8'))
lrt_leg = next(x for x in leg['key_locations'] if x['location_id'] == 'LOC-003')
LRT_MEAS = (-77.236623, 39.792059)
dx0, dy0 = to_xy(LRT_MEAS[0], LRT_MEAS[1])[0] - to_xy(lrt_leg['lng'], lrt_leg['lat'])[0], to_xy(LRT_MEAS[0], LRT_MEAS[1])[1] - to_xy(lrt_leg['lng'], lrt_leg['lat'])[1]

DISP = ['Skirmish Line', 'Charging Line', 'Line of March', 'Line of Battle', 'Reserve', 'Bivouac', 'Chaotic Retreat', 'Mounted Cavalry', 'Limbered Artillery', 'Deployed Artillery', 'Dismounted Cavalry']
# site disposition -> (formation class, set of activity classes it is compatible with)
DMAP = {0: ('skirmish', {'engaged', 'moving'}), 1: ('line', {'engaged', 'moving'}), 2: ('column', {'moving'}), 3: ('line', {'static', 'engaged', 'forming'}), 4: ('column', {'static'}),
        5: ('column', {'static'}), 6: ('line', {'moving', 'engaged'}), 8: ('bat_limbered', {'moving', 'static'}), 9: ('bat_action', {'engaged', 'static', 'forming'})}

def site_state(u, m):
    tk = min_to_tick(m)
    kfs = u['kf']
    if tk is None or tk < kfs[0][0]:
        return None
    if tk >= kfs[-1][0]:
        k = kfs[-1]; return dict(lat=k[1], lng=k[2], bearing=k[4], disp=k[5])
    for a, b in zip(kfs, kfs[1:]):
        if a[0] <= tk <= b[0]:
            f = (tk - a[0]) / max(1e-9, (b[0] - a[0]))
            return dict(lat=a[1] + (b[1] - a[1]) * f, lng=a[2] + (b[2] - a[2]) * f, bearing=L.lerp_ang(a[4], b[4], f), disp=a[5])
    return None

U = {u['id']: u for u in ds['units']}
rows = [json.loads(l) for l in open(os.path.join(BASE, 'pilot', 'unit-minutes.A.jsonl'), encoding='utf-8')]
rows = [r for r in rows if r['minute'] < L.T0 + 60]
res = {'by_unit': {}, 'frame_translation_m': [round(dx0, 1), round(dy0, 1)]}
tot = {tier: {'raw': 0, 'moved': 0} for tier in L.TIERS}; n_all = 0; n_present = 0; env_in = {'raw': 0, 'moved': 0}
for r in rows:
    uid = r['unit']; n_all += 1
    su = U.get(uid)
    st = site_state(su, r['minute']) if su else None
    d = res['by_unit'].setdefault(uid, dict(minutes=0, present=0, tier_raw={t: 0 for t in L.TIERS}, tier_moved={t: 0 for t in L.TIERS}, err_raw_m=[], err_moved_m=[]))
    d['minutes'] += 1
    if not st: continue
    n_present += 1; d['present'] += 1
    rx, ry = to_xy(r['lon'], r['lat']); sx, sy = to_xy(st['lng'], st['lat'])
    e_raw = math.hypot(sx - rx, sy - ry); e_mv = math.hypot(sx + dx0 - rx, sy + dy0 - ry)
    d['err_raw_m'].append(e_raw); d['err_moved_m'].append(e_mv)
    fcls, acts = DMAP.get(st['disp'], ('line', {'static'}))
    cls_ok = (fcls == r['formation_class'] and r['activity_class'] in acts)
    df = L.angdiff(st['bearing'], r['facing'])
    for tier, (tp, tf) in L.TIERS.items():
        if cls_ok and df <= tf and e_raw <= tp: d['tier_raw'][tier] += 1; tot[tier]['raw'] += 1
        if cls_ok and df <= tf and e_mv <= tp: d['tier_moved'][tier] += 1; tot[tier]['moved'] += 1
    if e_raw <= r['envelope']['radius_m']: env_in['raw'] += 1
    if e_mv <= r['envelope']['radius_m']: env_in['moved'] += 1
for uid, d in res['by_unit'].items():
    for k in ('err_raw_m', 'err_moved_m'):
        v = sorted(d[k]); d[k] = dict(n=len(v), median=round(v[len(v) // 2]) if v else None, p90=round(v[int(.9 * len(v))]) if v else None)
res['all'] = dict(unit_minutes=n_all, site_has_the_unit_at_that_minute=n_present, share_present=round(n_present / n_all, 4),
                  match_raw={t: round(tot[t]['raw'] / n_all, 4) for t in L.TIERS}, match_after_translation={t: round(tot[t]['moved'] / n_all, 4) for t in L.TIERS},
                  inside_envelope_radius_raw=round(env_in['raw'] / n_all, 4), inside_envelope_radius_translated=round(env_in['moved'] / n_all, 4))
res['site_keyframes_for_pilot_units'] = {u: len(U[u]['kf']) if u in U else 0 for u in sorted({r['unit'] for r in rows})}
res['units_absent_from_site_data'] = [u for u in sorted({r['unit'] for r in rows}) if u not in U]
json.dump(res, open(os.path.join(BASE, 'results', 'site-vs-A.json'), 'w'), indent=1)
print(json.dumps(res['all'], indent=1)); print(res['units_absent_from_site_data'], res['site_keyframes_for_pilot_units'])
for u, d in res['by_unit'].items(): print(u, d['present'], d['err_raw_m'], d['err_moved_m'], d['tier_moved'])

"""Agreement of the blind Pass B (19 sampled cells, 190 unit-minutes) with Pass A. usage: python score_passB.py -> results/passB-vs-A.json
Also verifies that the Pass A files are unchanged since the draw (sha256 in pilot/passB.sample.json)."""
import hashlib, json, math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); BASE = os.path.abspath(os.path.join(HERE, '..'))
sys.path.insert(0, HERE)
import pilot_lib as L
from geo import to_xy, dist_m

smp = json.load(open(os.path.join(BASE, 'pilot', 'passB.sample.json')))
ok = {f: hashlib.sha256(open(os.path.join(BASE, f), 'rb').read()).hexdigest() == h for f, h in smp['frozen_sha256'].items()}
B = json.load(open(os.path.join(BASE, 'pilot', 'passB.derived.json')))['cells']
A = {}
for l in open(os.path.join(BASE, 'pilot', 'unit-minutes.A.jsonl'), encoding='utf-8'):
    r = json.loads(l); A[(r['unit'], r['minute'])] = r

def b_state(knots, m):
    ks = [dict(T=L.hm(k[0]), X=to_xy(k[1], k[2])[0], Y=to_xy(k[1], k[2])[1], facing=k[3], formation=k[4], activity=k[5], wid=str(i)) for i, k in enumerate(knots)]
    x, y, fc, i, _ = L.state_at(ks, m, 'T')
    return x, y, fc, ks[i]['formation'], ks[i]['activity']

rows = []; byc = {}
for key, knots in B.items():
    unit, b0 = key.split('|'); m0 = L.hm(b0)
    for m in range(m0, m0 + 10):
        x, y, fc, form, act = b_state(knots, m)
        a = A[(unit, m)]
        ax, ay = to_xy(a['lon'], a['lat'])
        dp = math.hypot(x - ax, y - ay); df = L.angdiff(fc, a['facing'])
        cls = (L.ACT_CLASS[act] == a['activity_class']); frm = (L.FORM_CLASS[form] == a['formation_class'])
        # slack: B matches A if A had that state within +-3 minutes
        best = None
        for o in [k * 0.5 for k in range(-6, 7)]:
            aa = A.get((unit, int(round(m + o))))
            if not aa: continue
            axx, ayy = to_xy(aa['lon'], aa['lat'])
            if L.ACT_CLASS[act] == aa['activity_class'] and L.FORM_CLASS[form] == aa['formation_class']:
                d2 = math.hypot(x - axx, y - ayy); f2 = L.angdiff(fc, aa['facing'])
                if best is None or d2 < best[0]: best = (d2, f2)
        r = dict(unit=unit, t=L.fmt(m), pos_diff_m=round(dp), facing_diff=round(df), activity_class_equal=cls, formation_class_equal=frm, fine_activity_equal=(act == a['activity']),
                 within_A_envelope=(dp <= a['envelope']['radius_m']), slack3_pos_m=round(best[0]) if best else None, slack3_face=round(best[1]) if best else None)
        for tier, (tp, tf) in L.TIERS.items():
            r[tier] = bool(dp <= tp and df <= tf and cls and frm)
            r[tier + '_slack3'] = bool(best and best[0] <= tp and best[1] <= tf)
        rows.append(r); byc.setdefault(key, []).append(r)

n = len(rows)
def share(f): return sum(1 for r in rows if f(r)) / n
res = dict(frozen_files_unchanged=ok, cells=len(B), unit_minutes=n)
for tier in L.TIERS:
    k = sum(r[tier] for r in rows); lo, hi = L.wilson(k, n)
    k3 = sum(r[tier + '_slack3'] for r in rows); lo3, hi3 = L.wilson(k3, n)
    res[tier] = dict(agree=round(k / n, 4), wilson95=[round(lo, 3), round(hi, 3)], agree_slack3=round(k3 / n, 4), wilson95_slack3=[round(lo3, 3), round(hi3, 3)])
res['activity_class_agree'] = round(share(lambda r: r['activity_class_equal']), 4)
res['formation_class_agree'] = round(share(lambda r: r['formation_class_equal']), 4)
res['fine_activity_agree'] = round(share(lambda r: r['fine_activity_equal']), 4)
res['B_inside_A_envelope'] = round(share(lambda r: r['within_A_envelope']), 4)
d = sorted(r['pos_diff_m'] for r in rows)
res['pos_diff_m'] = dict(median=d[n // 2], p90=d[int(.9 * n)], max=d[-1])
res['by_cell'] = {k: dict(standard=round(sum(r['standard'] for r in v) / len(v), 2), standard_slack3=round(sum(r['standard_slack3'] for r in v) / len(v), 2), median_pos_diff=sorted(r['pos_diff_m'] for r in v)[5]) for k, v in byc.items()}
# causes of disagreement at the standard tier
causes = {'position_only': 0, 'facing_only': 0, 'class_or_formation': 0, 'several': 0}
for r in rows:
    if r['standard']: continue
    bad = [not (r['pos_diff_m'] <= 100), not (r['facing_diff'] <= 30), not (r['activity_class_equal'] and r['formation_class_equal'])]
    if sum(bad) > 1: causes['several'] += 1
    elif bad[0]: causes['position_only'] += 1
    elif bad[1]: causes['facing_only'] += 1
    else: causes['class_or_formation'] += 1
res['standard_disagreement_causes'] = causes
json.dump(res, open(os.path.join(BASE, 'results', 'passB-vs-A.json'), 'w'), indent=1)
json.dump(rows, open(os.path.join(BASE, 'pilot', 'passB-vs-A.rows.json'), 'w'))
print(json.dumps({k: v for k, v in res.items() if k != 'by_cell'}, indent=1)); print(json.dumps(res['by_cell']))

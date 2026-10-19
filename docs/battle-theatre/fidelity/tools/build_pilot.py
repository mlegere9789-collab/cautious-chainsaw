"""Build the Pass A unit-state timeline of the Little Round Top pilot (16:00-17:00 LMT, 2 July 1863) from pilot/defs_passA.py and score it.

usage: python build_pilot.py [--defs defs_passA] [--tag A] [--k 600]
writes: pilot/unit-minutes.<tag>.jsonl, pilot/unit-minutes.<tag>.csv, results/pilot-<tag>.json
Run at below-normal priority on this machine (no heavy work: about 20 s)."""
import argparse, csv, importlib, json, math, os, sys, time
HERE = os.path.dirname(os.path.abspath(__file__)); BASE = os.path.abspath(os.path.join(HERE, '..'))
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(BASE, 'pilot'))
import pilot_lib as L
from geo import dist_m, to_xy

ap = argparse.ArgumentParser(); ap.add_argument('--defs', default='defs_passA'); ap.add_argument('--tag', default='A'); ap.add_argument('--k', type=int, default=600)
a = ap.parse_args()
D = importlib.import_module(a.defs)
t_start = time.time()

all_rows = []; per_unit = {}; kin = {}; errs = []; rw_by = {}
for uid in D.ORDER:
    rw, rows, e = L.build_rows(uid, D.UNITS[uid], D.WP[uid])
    errs += [f'{uid}: {x}' for x in e]
    all_rows += rows; rw_by[uid] = rw
    kin[uid] = L.kinematic_check(rw)

# Monte Carlo expected fidelity (two priors) -------------------------------------------------------------------------------------------
mc = {}
for uid in D.ORDER:
    mc[uid] = {mode: L.mc_expected(rw_by[uid], mode, K=a.k, seed=11) for mode in ('P1', 'P2')}

# clock-aligned ladder: common clock error removed, unit-group offset sd 4 min, time slack 0 / 3 / 5 minutes (Modelled constants; sensitivity below)
al = {}
for slack in (0, 3, 5):
    al[slack] = {uid: L.mc_aligned(rw_by[uid], sd_group=4.0, slack=slack, K=a.k, seed=21) for uid in D.ORDER}
sens = {}
for name, kw in {'group0_slack3': dict(sd_group=0.0, slack=3), 'group8_slack3': dict(sd_group=8.0, slack=3), 'kappa0.1_slack3': dict(sd_group=4.0, slack=3, kappa=0.10),
                 'kappa0.4_slack3': dict(sd_group=4.0, slack=3, kappa=0.40), 'onset0_slack3': dict(sd_group=4.0, slack=3, onset_sd=0.0)}.items():
    sens[name] = {uid: L.mc_aligned(rw_by[uid], K=max(150, a.k // 2), seed=31, **kw) for uid in D.ORDER}

# the scored set is the 60 minutes 16:00..16:59 (the 17:00 row is the boundary state, written but not scored)
SC = [m for m in L.MINUTES if m < L.T0 + 60]
def mean(xs):
    xs = list(xs); return sum(xs) / len(xs) if xs else float('nan')

summary = {'unit_minutes': len(D.ORDER) * len(SC), 'units': len(D.ORDER)}
for tier in L.TIERS:
    d_all = [r['determined'][tier] for r in all_rows if r['minute'] in SC]
    summary[f'determined_{tier}'] = sum(d_all) / len(d_all)
    lo, hi = L.wilson(sum(d_all), len(d_all)); summary[f'determined_{tier}_wilson95'] = [round(lo, 4), round(hi, 4)]
    for mode in ('P1', 'P2'):
        ef = [mc[u][mode][tier][m] for u in D.ORDER for m in SC]
        summary[f'EF_{mode}_{tier}'] = mean(ef)
        summary[f'EF_{mode}_{tier}_by_side'] = {s: mean(mc[u][mode][tier][m] for u in D.ORDER if D.UNITS[u]['side'] == s for m in SC) for s in 'UC'}
        summary[f'EF_{mode}_{tier}_by_unit'] = {u: round(mean(mc[u][mode][tier][m] for m in SC), 3) for u in D.ORDER}
        # by 10-minute block
        summary[f'EF_{mode}_{tier}_by_block'] = {L.fmt(b): round(mean(mc[u][mode][tier][m] for u in D.ORDER for m in SC if b <= m < b + 10), 3) for b in range(L.T0, L.T0 + 60, 10)}
summary['aligned'] = {}
for slack in (0, 3, 5):
    summary['aligned'][f'slack{slack}'] = {tier: round(mean(al[slack][u][tier][m] for u in D.ORDER for m in SC), 4) for tier in L.TIERS}
    summary['aligned'][f'slack{slack}_standard_by_side'] = {s_: round(mean(al[slack][u]['standard'][m] for u in D.ORDER if D.UNITS[u]['side'] == s_ for m in SC), 4) for s_ in 'UC'}
    summary['aligned'][f'slack{slack}_standard_by_unit'] = {u: round(mean(al[slack][u]['standard'][m] for m in SC), 3) for u in D.ORDER}
summary['aligned_sensitivity_standard'] = {n: round(mean(sens[n][u]['standard'][m] for u in D.ORDER for m in SC), 4) for n in sens}
# share of unit-minutes with expected match >= 0.97 (the target as a per-minute probability), aligned slack 3, standard tier
summary['share_minutes_ge97_aligned_slack3_standard'] = round(mean(al[3][u]['standard'][m] >= 0.97 for u in D.ORDER for m in SC), 4)
summary['share_minutes_ge97_abs_P1_standard'] = round(mean(mc[u]['P1']['standard'][m] >= 0.97 for u in D.ORDER for m in SC), 4)
# determined by unit and side
summary['determined_standard_by_unit'] = {u: round(mean(r['determined']['standard'] for r in all_rows if r['unit'] == u and r['minute'] in SC), 3) for u in D.ORDER}
summary['determined_standard_by_side'] = {s: round(mean(r['determined']['standard'] for r in all_rows if D.UNITS[r['unit']]['side'] == s and r['minute'] in SC), 3) for s in 'UC'}
# envelope radius distribution
rad = sorted(r['envelope']['radius_m'] for r in all_rows if r['minute'] in SC)
summary['envelope_radius_m'] = {'p10': rad[int(.1 * len(rad))], 'p50': rad[len(rad) // 2], 'p90': rad[int(.9 * len(rad))], 'max': rad[-1]}
# evidence label census over the scored unit-minutes (time label of the governing waypoint)
lab = {}
for r in all_rows:
    if r['minute'] in SC:
        for ch in ('time', 'pos', 'facing', 'activity'):
            lab.setdefault(ch, {}); lab[ch][r['ev'][ch]] = lab[ch].get(r['ev'][ch], 0) + 1
summary['label_census_unit_minutes'] = lab

# interaction gate G-INT: an 'engaged' unit-minute needs an opposing pilot unit within 300 m, OR the unit is a battery/skirmish detachment whose enemy is outside the pilot set
byk = {(r['unit'], r['minute']): r for r in all_rows}
xy = {k: to_xy(r['lon'], r['lat']) for k, r in byk.items()}
gint = {'engaged_unit_minutes': 0, 'with_enemy_within_300m': 0, 'by_side_engaged_without_enemy': {'U': 0, 'C': 0}}
for (u, m), r in byk.items():
    if m not in SC or r['activity_class'] != 'engaged': continue
    gint['engaged_unit_minutes'] += 1
    enemies = [e for e in D.ORDER if D.UNITS[e]['side'] != D.UNITS[u]['side']]
    dmin = min(math.hypot(xy[(u, m)][0] - xy[(e, m)][0], xy[(u, m)][1] - xy[(e, m)][1]) for e in enemies)
    if dmin <= 300: gint['with_enemy_within_300m'] += 1
    else: gint['by_side_engaged_without_enemy'][D.UNITS[u]['side']] += 1
summary['G_INT_engaged_needs_enemy_near'] = gint

# kinematic gate G-KIN
nleg = sum(len(v) for v in kin.values())
bad_best = [(u, k['leg']) for u, v in kin.items() for k in v if not k['feasible_at_best'] and k['best_dt_min'] > 0]
bad_win = [(u, k['leg']) for u, v in kin.items() for k in v if not k['feasible_in_window']]
summary['G_KIN'] = {'legs_over_30m': nleg, 'infeasible_at_best_times': len(bad_best), 'infeasible_even_in_window': len(bad_win), 'infeasible_at_best_list': bad_best[:40]}

summary['errors'] = errs
summary['seconds'] = round(time.time() - t_start, 1)
summary['K'] = a.k

# write -----------------------------------------------------------------------------------------------------------------------------------
os.makedirs(os.path.join(BASE, 'results'), exist_ok=True)
with open(os.path.join(BASE, 'pilot', f'unit-minutes.{a.tag}.jsonl'), 'w', encoding='utf-8') as f:
    for r in all_rows:
        r = dict(r)
        r['expected_match'] = {mode: {tier: round(mc[r['unit']][mode][tier][r['minute']], 3) for tier in L.TIERS} for mode in ('P1', 'P2')}
        r['expected_match']['aligned_slack3'] = {tier: round(al[3][r['unit']][tier][r['minute']], 3) for tier in L.TIERS}
        f.write(json.dumps(r, ensure_ascii=False) + '\n')
with open(os.path.join(BASE, 'pilot', f'unit-minutes.{a.tag}.csv'), 'w', newline='', encoding='utf-8') as f:
    w = csv.writer(f)
    w.writerow(['unit', 't', 'lon', 'lat', 'z_m', 'slope_deg', 'facing', 'formation', 'activity', 'strength', 'front_m', 'depth_m', 'env_radius_m', 'env_facing_hw', 'env_activity_classes',
                'determined_standard', 'EF_P1_standard', 'EF_P2_standard', 'from_wp', 'srcs', 'time_label', 'pos_label'])
    for r in all_rows:
        w.writerow([r['unit'], r['t'], r['lon'], r['lat'], r['ground'].get('z'), r['ground'].get('slope_deg'), int(r['facing']), r['formation'], r['activity'], r['strength'], r['front_m'], r['depth_m'],
                    r['envelope']['radius_m'], r['envelope']['facing_hw'], '|'.join(r['envelope']['activity_classes']), int(r['determined']['standard']),
                    round(mc[r['unit']]['P1']['standard'][r['minute']], 3), round(mc[r['unit']]['P2']['standard'][r['minute']], 3), r['wp_from'], ';'.join(r['srcs']), r['ev']['time'], r['ev']['pos']])
out = dict(summary=summary, kinematics=kin)
with open(os.path.join(BASE, 'results', f'pilot-{a.tag}.json'), 'w', encoding='utf-8') as f:
    json.dump(out, f, indent=1)
print(json.dumps({k: v for k, v in summary.items() if not k.endswith('by_unit') and not k.endswith('by_block') and k != 'G_KIN'}, indent=1)[:3500])
print('G_KIN', {k: v for k, v in summary['G_KIN'].items() if k != 'infeasible_at_best_list'}, summary['G_KIN']['infeasible_at_best_list'][:12])
if errs: print('ERRORS', errs); sys.exit(1)

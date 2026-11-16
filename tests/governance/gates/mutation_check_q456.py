"""Mutation check of the Q04, Q05 and Q06 runners (GATE-SPEC U-25, K11: a gate must be able to fail).

    python3 tests/governance/gates/mutation_check_q456.py [label prefix]

Each mutation disables or inverts one check in a COPY of tools/bt/gates; the unit tests of the gate (the synthetic classes, which feed the runner a dump of the real shape) must go red. A test that stays green would not
catch the defect. The end-to-end classes (the real node child on the real product) are left out here: they run against the unmutated python and are run by the test files themselves.
"""
import os
import shutil
import subprocess
import sys
import tempfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
SRC = os.path.join(ROOT, 'tools', 'bt', 'gates')

MUT = [
    # ---- Q04
    ('q04_arrival.py', 'test_q04', "if lo_abs is not None and s0 < lo_abs - EPS:", "if False:", 'Q04.1 absolute bound ignored'),
    ('q04_arrival.py', 'test_q04', "if e_s is not None and s0 < e_s - EPS:", "if False:", 'Q04.2 scenario window ignored'),
    ('q04_arrival.py', 'test_q04', "                if a is None:\n                    f_scn.append(", "                if False:\n                    f_scn.append(", 'Q04.2 presence with no arrival record ignored'),
    ('q04_arrival.py', 'test_q04', "                if fx.get('events_before'):", "                if False:", 'Q04.7 animation events before the window ignored'),
    ('q04_arrival.py', 'test_q04', "if fx.get('first_segment_s') is not None and lo_abs is not None and fx['first_segment_s'] / 60.0 < lo_abs - EPS:", "if False:", 'Q04.7 animation timeline before the bound ignored'),
    ('q04_arrival.py', 'test_q04', "if ca and ca.get('first_fall_s') is not None and e_s is not None and ca['first_fall_s'] / 60.0 < e_s - EPS:", "if False:", 'Q04.7 fall before the window ignored'),
    ('q04_arrival.py', 'test_q04', "            if evs.get('before_earliest'):", "            if False:", 'Q04.2 layer events before the window ignored'),
    ('q04_arrival.py', 'test_q04', "            if evs.get('state_before_enter'):", "            if False:", 'Q04.7 casualty events before the entry ignored'),
    ('q04_arrival.py', 'test_q04', "            if R.get('n_refused'):", "            if False:", 'Q04.2 refused events ignored'),
    ('q04_arrival.py', 'test_q04', "            if (R.get('hidden_flag') or {}).get('mismatch_samples'):", "            if False:", 'Q04.1 renderer table mismatch ignored'),
    ('q04_arrival.py', 'test_q04', "            if is_nof and cls and any(run_start(c) is not None for c in cls.values()):", "            if False and is_nof and cls and any(run_start(c) is not None for c in cls.values()):", 'Q04.6 never-on-field unit present ignored'),
    ('q04_arrival.py', 'test_q04', "            if not (abs(fs['x']) > W or abs(fs['z']) > H):", "            if False:", 'Q04.3 first presence inside the ground ignored'),
    ('q04_arrival.py', 'test_q04', "        if not layout_ok:\n            fe.append(", "        if False:\n            fe.append(", 'Q04.3 layout line ignored'),
    ('q04_arrival.py', 'test_q04', "            if r.get('enter_in_box'):", "            if False:", 'Q04.3 enter inside the box ignored'),
    ('q04_arrival.py', 'test_q04', "            if a.get('entry') is None:\n                fe.append(", "            if False:\n                fe.append(", 'Q04.3 unresolved entry ignored'),
    ('q04_arrival.py', 'test_q04', "                if d > 1.0:", "                if False:", 'Q04.3 first leg away from the entry ignored'),
    ('q04_arrival.py', 'test_q04', "                if f['t'] < en['t'] - EPS:", "                if False:", 'Q04.3 formation before entry ignored'),
    ('q04_arrival.py', 'test_q04', "            if len(runs) > 1:", "            if False:", 'Q04.4 pop in and out ignored'),
    ('q04_arrival.py', 'test_q04', "                    if end < battle['to'] - EPS:", "                    if False:", 'Q04.4 vanishing without a leave ignored'),
    ('q04_arrival.py', 'test_q04', "                    if lv.get('last_path_end') is None:", "                    if False:", 'Q04.4 leave with no march ignored'),
    ('q04_arrival.py', 'test_q04', "                    elif lv.get('last_path_end_in_box'):", "                    elif False:", 'Q04.4 march ending inside the ground ignored'),
    ('q04_arrival.py', 'test_q04', "                    if end > lv['t'] + EPS or end < lv['t'] - SEC - 1e-6:", "                    if False:", 'Q04.4 leave time against last presence ignored'),
    ('q04_arrival.py', 'test_q04', "TIER_DOCUMENTED not in tiers, 'tiers %s' % tiers)", "True, 'tiers %s' % tiers)", 'Q04.5 documented tier on an unknown arrival ignored'),
    ('q04_arrival.py', 'test_q04', "cond('an open register entry records the gap', rs['open']", "cond('an open register entry records the gap', True", 'Q04.5 missing open register entry ignored'),
    ('q04_arrival.py', 'test_q04', "cond('the unit is not present before the floor event of its gate', not (b.get('abs_min') is not None and firsts and min(firsts) < b['abs_min'] - EPS)", "cond('the unit is not present before the floor event of its gate', True", 'Q04.5 presence before the floor event ignored'),
    ('q04_arrival.py', 'test_q04', "                    if s0 is not None and s0 < fm - EPS:", "                    if False:", 'Q04.6 named default floor ignored'),
    ('q04_arrival.py', 'test_q04', "        failing = sorted({uid for u in us", "        failing = [] and sorted({uid for u in us", 'Q04.6 failing units of a case ignored'),
    ('q04_arrival.py', 'test_q04', "cond('the case has at least one drawn unit (the scan says something about it)', bool(drawn_us)", "cond('the case has at least one drawn unit (the scan says something about it)', True", 'Q04.6 case with no drawn unit ignored'),
    ('q04_arrival.py', 'test_q04', "    if bad_f:\n        rec.item('Q04/S*/factorisation', 'FAIL'", "    if False:\n        rec.item('Q04/S*/factorisation', 'FAIL'", 'Q04.S* factorisation violation ignored'),
    ('q04_arrival.py', 'test_q04', "    if rc.get('checked') and not rc.get('n_differences'):", "    if rc.get('checked'):", 'Q04.S* restriction difference ignored'),
    ('q04_arrival.py', 'test_q04', "cond('the men lying (Stage._detail) equal the fall table at every sample', not cs.get('down_mismatch_samples')", "cond('the men lying (Stage._detail) equal the fall table at every sample', True", 'Q04.scan fall table mismatch ignored'),
    ('q04_arrival.py', 'test_q04', "cond('no event of the layer was refused by the sim cache (outside the presence window, Q04)', not sc.get('refused_total')", "cond('no event of the layer was refused by the sim cache (outside the presence window, Q04)', True", 'Q04.scan refused events ignored'),
    ('q04_arrival.py', 'test_q04', "        elif not grid_ok:\n            rec.item('Q04/scan/%s' % sid, 'NOT-RUN'", "        elif False:\n            rec.item('Q04/scan/%s' % sid, 'NOT-RUN'", 'Q04.scan coarse grid passes'),
    ('q04_arrival.py', 'test_q04', "    if R is None:\n                rec.item(iid, 'BLOCKED-INPUT'", "    if False:\n                rec.item(iid, 'BLOCKED-INPUT'", 'Q04 missing scan record passes'),
    ('q04_arrival.py', 'test_q04', "    if not ss.get('complete'):\n        rec.incomplete(", "    if False:\n        rec.incomplete(", 'Q04 incomplete S* ignored'),
    # ---- Q05
    ('q05_speed.py', 'test_q05', "if l['max_seg_ms'] is not None and l['max_seg_ms'] > upper:", "if False:", 'Q05.1 segment above the bound ignored'),
    ('q05_speed.py', 'test_q05', "elif l['mean_ms'] is not None and not (rg[0] * (2 - FACTOR) <= l['mean_ms'] <= rg[1] * FACTOR):", "elif False:", 'Q05.1 declared gait range ignored'),
    ('q05_speed.py', 'test_q05', "                    if rg is None:\n                        f1.append(", "                    if False:\n                        f1.append(", 'Q05.1 missing declared gait ignored'),
    ('q05_speed.py', 'test_q05', "                if l['zero_time_moves']:", "                if False:", 'Q05.1 jump inside a path ignored'),
    ('q05_speed.py', 'test_q05', "                    if mx > doc['team']['upper'] * FACTOR:", "                    if False:", 'Q05.1 teams above the documented gallop ignored'),
    ('q05_speed.py', 'test_q05', "        upper = (doc['cavalry']['upper'] if cav else doc['foot']['upper']) * FACTOR", "        upper = doc['foot']['upper'] * FACTOR if True else 0", 'Q05.1 cavalry bound taken as the foot bound'),
    ('q05_speed.py', 'test_q05', "            if step['n_over']:", "            if False:", 'Q05.2 displacement above the bound ignored'),
    ('q05_speed.py', 'test_q05', "            if gs_ and gs_['n_over']:", "            if False:", 'Q05.2 gun piece jump ignored'),
    ('q05_speed.py', 'test_q05', "            if step['pairs'] == 0 and legs:", "            if False:", 'Q05.2 no consecutive samples ignored'),
    ('q05_speed.py', 'test_q05', "                if j['d_m'] is not None and j['d_m'] > JOIN_M:", "                if False:", 'Q05.3 broken join ignored'),
    ('q05_speed.py', 'test_q05', "                if j['gap_s'] is not None and j['gap_s'] < -1e-3:", "                if False:", 'Q05.3 overlapping legs ignored'),
    ('q05_speed.py', 'test_q05', "                if t['edge_peak_ms'] > upper:", "                if False:", 'Q05.3 far end of a turn ignored'),
    ('q05_speed.py', 'test_q05', "                if not kept:\n                    rec.item(iid4, 'FAIL'", "                if False:\n                    rec.item(iid4, 'FAIL'", 'Q05.4 speed used to meet the time ignored'),
    ('q05_speed.py', 'test_q05', "                elif ok:\n                    rec.item(iid4, 'COVERED'", "                elif True:\n                    rec.item(iid4, 'COVERED'", 'Q05.4 always covered'),
    ('q05_speed.py', 'test_q05', "        if over:\n            rec.item(iid, 'FAIL'", "        if False:\n            rec.item(iid, 'FAIL'", 'Q05.5 class above the conservative bound ignored'),
    ('q05_speed.py', 'test_q05', "        elif ok:\n            rec.item(iid, 'COVERED'", "        elif True:\n            rec.item(iid, 'COVERED'", 'Q05.5 always covered'),
    ('q05_speed.py', 'test_q05', "    if bad_f:\n        rec.item('Q05/S*/factorisation', 'FAIL'", "    if False:\n        rec.item('Q05/S*/factorisation', 'FAIL'", 'Q05.S* factorisation violation ignored'),
    ('q05_speed.py', 'test_q05', "        elif not ok_grid:\n            rec.item('Q05/scan/%s' % sc['scenario'], 'NOT-RUN'", "        elif False:\n            rec.item('Q05/scan/%s' % sc['scenario'], 'NOT-RUN'", 'Q05.scan coarse grid passes'),
    ('q05_speed.py', 'test_q05', "    if mism:\n        rec.item('Q05/bounds', 'FAIL'", "    if False:\n        rec.item('Q05/bounds', 'FAIL'", 'Q05 bounds of the node child and the judge not compared'),
    ('q05_speed.py', 'test_q05', "            if R is None:\n                for chk in ('Q05.1', 'Q05.2', 'Q05.3'):", "            if False:\n                for chk in ('Q05.1', 'Q05.2', 'Q05.3'):", 'Q05 missing scan record passes'),
    ('q05_speed.py', 'test_q05', "    if doc is None:\n        for u in units:", "    if False:\n        for u in units:", 'Q05 missing documented table passes'),
    # ---- Q06
    ('q06_path.py', 'test_q06', "            if not legs:\n                f1.append(", "            if False:\n                f1.append(", 'Q06.1 drawn unit with no leg ignored'),
    ('q06_path.py', 'test_q06', "                if j['d_m'] is not None and j['d_m'] > JOIN_M:", "                if False:", 'Q06.1 broken join ignored'),
    ('q06_path.py', 'test_q06', "                if j['gap_s'] is not None and j['gap_s'] < -1e-3:", "                if False:", 'Q06.1 overlapping legs ignored'),
    ('q06_path.py', 'test_q06', "                if d_end > JOIN_M:", "                if False:", 'Q06.1 chain end against the fighting position ignored'),
    ('q06_path.py', 'test_q06', "            if legs and slot is None:", "            if False:", 'Q06.1 no fighting position ignored'),
    ('q06_path.py', 'test_q06', "                if TIER_RANK.get(l.get('tier'), -1) < 1:", "                if False:", 'Q06.1 leg tier ignored'),
    ('q06_path.py', 'test_q06', "                if not l.get('sources'):", "                if False:", 'Q06.1 leg sources ignored'),
    ('q06_path.py', 'test_q06', "                if l.get('mean_ms') is None or l['mean_ms'] <= 0:", "                if False:", 'Q06.1 leg rate ignored'),
    ('q06_path.py', 'test_q06', "                elif upper is not None and (l.get('max_seg_ms') or 0) > upper:", "                elif False:", 'Q06.1 rate above the bound ignored'),
    ('q06_path.py', 'test_q06', "            if ap is None:\n                f1.append(", "            if False:\n                f1.append(", 'Q06.1 no road of approach ignored'),
    ('q06_path.py', 'test_q06', "            elif TIER_RANK.get(ap.get('tier'), -1) < 1:", "            elif False:", 'Q06.1 road tier ignored'),
    ('q06_path.py', 'test_q06', "            elif not (ap.get('has_sources') or ap.get('modelled')):", "            elif False:", 'Q06.1 road with no source ignored'),
    ('q06_path.py', 'test_q06', "            if (plan.get('n_stops', 0) + plan.get('n_days_feasible', 0)) < 1 and legs:", "            if False:", 'Q06.1 no clause behind the fighting position ignored'),
    ('q06_path.py', 'test_q06', "            if lay.get('kind') not in ('col', 'cav'):", "            if False:", 'Q06.2 deployed on appearance ignored'),
    ('q06_path.py', 'test_q06', "                if ft0 is not None and fe['t'] < ft0 - 1e-9:", "                if False:", 'Q06.2 formation before the entry ignored'),
    ('q06_path.py', 'test_q06', "                elif not any(l['t1'] <= fe['t'] + 1e-6 for l in legs):", "                elif False:", 'Q06.2 formation before any march ignored'),
    ('q06_path.py', 'test_q06', "                if fe.get('duration_s') != DEPLOY_S:", "                if False:", 'Q06.2 deployment duration ignored'),
    ('q06_path.py', 'test_q06', "                if TIER_RANK.get(fe.get('tier'), -1) > TIER_RANK['plausible-procedural']:", "                if False:", 'Q06.2 tier better than the duration ignored'),
    ('q06_path.py', 'test_q06', "            elif reg_needed and not ok_reg:", "            elif False:", 'Q06.2 missing register entry passes'),
    ('q06_path.py', 'test_q06', "            rec.item('Q06/Q06.3/%s' % uid, 'FAIL', why +", "            rec.item('Q06/Q06.3/%s' % uid, 'PASS', why +", 'Q06.3 unit with no path passes'),
    ('q06_path.py', 'test_q06', "            if f is None:\n                rec.item('Q06/Q06.3/%s' % uid, 'BLOCKED-INPUT'", "            if False:\n                rec.item('Q06/Q06.3/%s' % uid, 'BLOCKED-INPUT'", 'Q06.3 missing scan record passes'),
    ('q06_path.py', 'test_q06', "                if mb is None:\n                    f4.append(", "                if False:\n                    f4.append(", 'Q06.4 leave with no march ignored'),
    ('q06_path.py', 'test_q06', "                    if mb.get('end_in_box'):", "                    if False:", 'Q06.4 march ending inside the ground ignored'),
    ('q06_path.py', 'test_q06', "                    if lv['t'] < mb['t1'] - 1e-9:", "                    if False:", 'Q06.4 leave before the march ends ignored'),
    ('q06_path.py', 'test_q06', "                    if dep and dep[0]['d_m'] is not None and dep[0]['d_m'] > JOIN_M:", "                    if False:", 'Q06.4 march out away from the last stand ignored'),
    ('q06_path.py', 'test_q06', "                if not entry.get('outside_box') or not entry.get('outside_ground'):", "                if False:", 'Q06.5 entry inside the ground ignored'),
    ('q06_path.py', 'test_q06', "                elif entry['d_road_m'] > JOIN_M:", "                elif False:", 'Q06.5 entry off the road ignored'),
    ('q06_path.py', 'test_q06', "                if entry.get('crossing_s') is None:", "                if False:", 'Q06.5 road not crossing the edge ignored'),
    ('q06_path.py', 'test_q06', "                if not es.startswith('resolved'):", "                if False:", 'Q06.5 unresolved entry ignored'),
    ('q06_path.py', 'test_q06', "            f5 = []\n            if entry is None:", "            f5 = []\n            if False:", 'Q06.5 no enter event ignored'),
    ('q06_path.py', 'test_q06', "    if bad_f:\n        rec.item('Q06/S*/factorisation', 'FAIL'", "    if False:\n        rec.item('Q06/S*/factorisation', 'FAIL'", 'Q06.S* factorisation violation ignored'),
    ('q06_path.py', 'test_q06', "            if R is None:\n                for chk_ in ('Q06.1', 'Q06.2', 'Q06.5'):", "            if False:\n                for chk_ in ('Q06.1', 'Q06.2', 'Q06.5'):", 'Q06 missing scan record passes'),
]
CLASSES = {
    'test_q04': ['CleanFixture', 'Absolute', 'ScenarioLocal', 'Effects', 'Entry', 'Departure', 'Unknown', 'NamedCases', 'ScenarioSet'],
    'test_q05': ['CleanFixture', 'Speed', 'NoTeleport', 'Continuity', 'TimeAgainstRate', 'MissingRanges', 'ScenarioSet', 'MissingInputs'],
    'test_q06': ['CleanFixture', 'Chain', 'NotDeployed', 'EveryUnit', 'Departure', 'OutsideTheMap', 'ScenarioSet'],
}


def main():
    only = sys.argv[1] if len(sys.argv) > 1 else None
    res = []
    for fn, tm, old, new, label in MUT:
        if only and not label.startswith(only):
            continue
        d = tempfile.mkdtemp(prefix='gate-mutation-')
        shutil.copytree(SRC, d, dirs_exist_ok=True, ignore=shutil.ignore_patterns('__pycache__'))
        p = os.path.join(d, fn)
        s = open(p, encoding='utf-8').read()
        if old not in s:
            res.append((label, 'MUTATION NOT APPLICABLE (text not found)'))
            shutil.rmtree(d, ignore_errors=True)
            continue
        open(p, 'w', encoding='utf-8').write(s.replace(old, new, 1))
        env = dict(os.environ, BT_GATES_DIR=d, PYTHONDONTWRITEBYTECODE='1', PYTHONWARNINGS='ignore')
        names = [tm + '.' + c for c in CLASSES[tm]]
        r = subprocess.run([sys.executable, '-W', 'ignore', '-m', 'unittest'] + names, capture_output=True, text=True, env=env, cwd=os.path.join(ROOT, 'tests', 'governance', 'gates'))
        tail = (r.stderr.strip().splitlines() or [''])[-1]
        res.append((label, ('CAUGHT (red: %s)' % tail) if r.returncode != 0 else 'NOT CAUGHT (tests stayed green)'))
        shutil.rmtree(d, ignore_errors=True)
    w = max(len(l) for l, _ in res) if res else 0
    for l, r in res:
        print(l.ljust(w), '|', r)
    n_ok = sum(1 for _, r in res if r.startswith('CAUGHT'))
    print('caught', n_ok, 'of', len(res))
    sys.exit(0 if n_ok == len(res) else 1)


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""Write test_status.json: the narrative parts of the workstream report (REPORT.md, written by make_doc.py) and what was run and what came of it.
Counts and results are read from the data files at run time; what the test runs and the lock jobs returned is read from third_pass_inputs.json, which is written by hand after each run (nothing here is a result that was not seen).
Usage: python3 -I tools/bt/photomatch/write_test_status.py"""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
def J(n, d=None):
    p = os.path.join(HERE, n)
    return json.load(open(p)) if os.path.exists(p) else d
I = J('third_pass_inputs.json'); V = J('verdicts.json'); reg = J('photograph_registry.json')['photographs']; st = J('position_statements.json')['statements']; poses = J('poses.json')['poses']; figs = J('nps_figures.json')['figures']; conf = J('nps_figures_confirmed.json')['ties']
sky = J('skyline_results.json')['cases']; meas = J('criteria_measurements.json')['measurements']; wide = J('catalogue_wide_items.json')['photographs']; pv = {v['pose']: v for v in V['pose_verdicts']}
nw_tied = sum(1 for w in wide if w.get('same_exposure_as')); n_fig_stmts = sum(1 for s in st if s['id'].startswith('PS-NPS-ROTV') and '-F' in s['id']); from collections import Counter; vc = Counter(v['verdict'] for v in V['pose_verdicts'])
def _fig_loc(f):
    cap = f['caption'].rstrip('. '); t = conf.get(f['id'], {})
    if t.get('loc'): return t['loc']
    for s_ in st:
        q = s_['quote'].rstrip('. ')
        if s_['src'] == f['source'] and (cap == q or cap in q): return s_.get('loc') or []
    return []
n_tied_all = sum(1 for f in figs if _fig_loc(f))
def s1(case, key): return sky[case]['summary'][key]
a27 = s1('P28', 'P27 north (337.5 to 22.5)'); a28 = s1('P28', 'P28 northwest (292.5 to 337.5)'); a29 = s1('P29', 'P29 east (67.5 to 112.5)')
def sk_line(name, s): return f"{name}: RMS {s['S1_rms_deg']} degrees ({s['S1_class']}) at heading {s['best_heading_deg']}, field {s['best_field_deg']}; rank {s['rank_of_station_among_25']} of 25 against 24 controls (quartile {s['controls_q1']}, median {s['controls_median']}); discriminated {s['S2_discriminated']}"
out = {
 '_doc': 'What was run on 2026-11-14 (third pass) and what came of it; read by make_doc.py for REPORT.md. Counts are computed from the data files; run results are copied from third_pass_inputs.json.',
 'scope_read': 'Scope read: CLAUDE.md; gates.json Q16; GATE-SPEC Q16 (state of 13 November 21:00 UTC); requirements.json (Q16 is linked from R12.001 to R12.045 and the R12 item; every one has passes false); the PDF plan B.9.2 step 7 and Table 4 rows 32 to 38; register EG-0144; the second-pass report; the state left by the interrupted run of this pass (poses P27 and P28 and the criterion C-P27-P28-1 written before the container restart of 00:05 UTC, no render of them, the wide-search script and 28 of its images, a P13 sheet without a verdict). Nothing was committed, pushed or deployed.',
 'result_paragraph': I['result_paragraph'].format(n_records=len(reg), n_statements=len(st), n_poses=len(poses), n_ties=len(conf), n_tied_all=n_tied_all, n_figs=len(figs), n_wide=len(wide), n_wide_tied=nw_tied, v27=pv['P27']['verdict'], v28=pv['P28']['verdict'], v29=pv['P29']['verdict'], v13=pv['P13']['verdict'],
                                                  sky27=sk_line('P27 (north sector)', a27), sky28=sk_line('P28 (northwest sector)', a28), sky29=sk_line('P29 (east sector)', a29), roughly=vc['roughly'], dnot=vc['does not'], cj=vc['cannot judge'], matches=vc['matches']),
 'what_was_run': [t.format(n_fig_stmts=n_fig_stmts, n_records=len(reg), n_statements=len(st), n_poses=len(poses), n_ties=len(conf), n_tied_all=n_tied_all, n_figs=len(figs), n_wide=len(wide), n_wide_tied=nw_tied) for t in I['what_was_run']],
 'new_or_changed': ['P13', 'P27', 'P28', 'P29'],
 'findings': I['findings'], 'tests': I['tests'], 'owed': I['owed'],
 'governance_note': I['governance_note'],
 'photomatch_q16_test': I['photomatch_q16_test'], 'old_test': I['old_test'], 'full_node_suite': I['full_node_suite'],
}
json.dump(out, open(os.path.join(HERE, 'test_status.json'), 'w'), indent=1, ensure_ascii=False); print('test_status.json written')

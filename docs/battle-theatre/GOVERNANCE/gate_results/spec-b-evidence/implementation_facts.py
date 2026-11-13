#!/usr/bin/env python3
"""The implementation-side facts that GATE-SPEC-B.md section 4 states, recomputed from the files: code constants, thresholds, data counts, per-file test counts, existence of cited data files.
Read-only; writes nothing. Prints one JSON object.   Run: python3 -I docs/battle-theatre/GOVERNANCE/gate_results/spec-b-evidence/implementation_facts.py"""
import json, os, re, glob, collections
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), *(['..'] * 5)))
BT = os.path.join(ROOT, 'docs', 'battle-theatre'); C = collections.Counter
J = lambda p: json.load(open(os.path.join(BT, p), encoding='utf-8'))
def grep(path, pat, base=BT, n=3):
    t = open(os.path.join(base, path), encoding='utf-8').read().splitlines()
    return [l.strip()[:200] for l in t if re.search(pat, l)][:n]
out = {}
# ---- constants and thresholds quoted in the gate sections
out['Q05 SPEED (app/src/history/real.mjs)'] = grep('app/src/history/real.mjs', r'^export const SPEED')
out['Q12 CODE_VERSION (sim/cache.mjs)'] = grep('sim/cache.mjs', r'^export const CODE_VERSION')
out['Q12 SIM_CODE and SEED (app/src/config.mjs)'] = grep('app/src/config.mjs', r'^export const (SIM_CODE|SEED)')
out['Q13 speedOfSound (audio3d/physics.mjs)'] = grep('app/src/audio3d/physics.mjs', r'^export const speedOfSound')
out['Q13 DEFAULT_TEMP_C (audio3d/atmosphere.mjs)'] = grep('app/src/audio3d/atmosphere.mjs', r'^export const DEFAULT_TEMP_C')
out['Q10 DEFAULTS.nightFloor (app/src/config.mjs)'] = grep('app/src/config.mjs', r'^export const DEFAULTS')
out['Q11 tolerances (tools/bt/check_environment.py)'] = grep('tools/bt/check_environment.py', r'^TOL_', base=ROOT)
t = json.load(open(os.path.join(ROOT, 'tools', 'accept', 'thresholds.json'), encoding='utf-8'))
out['Q15 frames (tools/accept/thresholds.json)'] = t.get('frames'); out['Q24 regression (tools/accept/thresholds.json)'] = t.get('regression')
# ---- history layer
u = J('history/units.json')['units']; a = J('history/arrivals.json')
out['Q01 units'] = {'n': len(u), 'status': dict(C(x['status'] for x in u)), 'with_printed_strength': sum(1 for x in u if x.get('strength'))}
out['Q04 arrivals'] = {'gates': len(a['gates']), 'subunit_gates': len(a['subunit_gates']), 'rows': len(a['rows'])}
out['Q19 position ledger lines'] = {os.path.basename(f): sum(1 for l in open(f, encoding='utf-8') if l.strip()) for f in sorted(glob.glob(os.path.join(BT, 'history/positions/positions_?.jsonl')))}
out['Q19 troop-map claim lines'] = sum(sum(1 for l in open(f, encoding='utf-8') if l.strip()) for f in glob.glob(os.path.join(BT, 'history/positions/troopmap_*.jsonl')))
st = J('history/undrawn/status.json'); out['Q06 undrawn/status.json'] = {'counts': st['counts'], 'figures_drawn': st['figures_drawn'], 'units': len(st['units'])}
rg = J('history/undrawn/roster-gaps.json'); out['Q01 roster-gaps'] = {'entries': len(rg['entries']), 'counts': rg['counts'], 'tables': {k: v[:12] for k, v in rg['tables'].items()}}
# ---- structures and kit
s = J('structures/structures.json')['structures']; ids = [r['id'] for r in s]
out['Q07-09 structures records'] = {'n': len(s), 'by_prefix': dict(C(i.split('-')[0] for i in ids))}
ss = J('structures/state_schedule.json')['rows']; out['Q07-09 state_schedule'] = {'rows': len(ss), 'parse_status': dict(C(r.get('parse_status') for r in ss))}
out['Q26 hospitals'] = len(J('structures/hospitals.json')['hospitals'])
d3 = J('app/data/structures3d.json'); out['Q07-09 structures3d lists'] = {k: len(v) for k, v in d3.items() if isinstance(v, list)}
k = J('kit/kit_specs.json'); out['Q03 kit'] = {'units': len(k['units']), 'items': len(k['items']), 'artillery_units': len(J('kit/artillery_batteries.json')['units']), 'cavalry_units': len(J('kit/cavalry_units.json')['units'])}
out['Q20 cavalry-horses undrawn units'] = len(J('app/data/cavalry-horses.json')['undrawn_cavalry_units'])
cat = json.load(open(os.path.join(ROOT, 'tools/bt/photomatch/catalogue.json'), encoding='utf-8')); out['Q16 catalogue'] = {'records': len(cat['photographs']), 'staged_flag': sum(1 for p in cat['photographs'] if p.get('staged_flag'))}
for f in ('status', 'status_2'):
    d = J('GOVERNANCE/library/%s.json' % f); src = d.get('sources', d)
    if isinstance(src, dict): src = [dict(v, id=kk) for kk, v in src.items() if isinstance(v, dict)]
    out['Q25 library/%s.json' % f] = {'n': len(src), 'status': dict(C(x.get('status') for x in src))}
# ---- test counts per file (top-level test() calls; loops over renderers add instances)
def ntests(p): return len(re.findall(r'^\s*(?:test|it)(?:\.\w+)?\(\s*[\'"`]', open(p, encoding='utf-8').read(), re.M))
files = sorted(glob.glob(os.path.join(BT, 'app/tests/*.test.mjs')) + glob.glob(os.path.join(BT, 'app/tests/*.spec.mjs')) + glob.glob(os.path.join(BT, 'sim/test/*.mjs')) + [os.path.join(ROOT, 'tests/photomatch.test.mjs')] + glob.glob(os.path.join(ROOT, 'tests/governance/*.mjs')))
out['test files: top-level test() calls'] = {os.path.basename(f): ntests(f) for f in files}
out['test files: sum'] = sum(out['test files: top-level test() calls'].values())
# ---- data files the gate sections cite
cited = ['app/data/engagements.json', 'app/data/casualty-sources.json', 'app/data/fx3d/fires.json', 'app/data/battery-guns.json', 'app/data/artillery-train.json', 'app/data/cavalry-horses.json', 'app/data/placement.json', 'app/data/placement-claims.json',
         'app/data/sibling-approach.json', 'app/data/daypositions.json', 'app/data/gazetteer.json', 'app/data/kit-crosswalk.json', 'app/data/audio3d/woods-mask.json', 'app/data/anim3d/gait-sources.json', 'app/data/anim3d/drill-timing.json',
         'environment/weather_timeline.json', 'environment/ephemeris_1863.json', 'environment/ephemeris_agreement.json', 'environment/check_environment_results.json', 'budget_placeholder']
out['cited data files missing'] = [f for f in cited if f != 'budget_placeholder' and not os.path.exists(os.path.join(BT, f))]
print(json.dumps(out, indent=1, ensure_ascii=False))

#!/usr/bin/env python
"""Gates Q11 and Q22 of tools/bt/check_environment.py, run in memory.
Why not the command: main() rewrites environment/check_environment_results.json (a file of another workstream), and the system python has no astropy.
This script imports the module, calls gate_q11(True), gate_q11(False), pdf_figure_checks() and gate_q22(), never main(), and checks that no file of
docs/battle-theatre/environment changed. gate_q22 reads the plan text from tmp/pdf/plan-clean.txt (absent in this container); it is pointed at the committed
copy BIBLE/plan-clean.txt by assigning check_environment.PDF_TXT.
Needs astropy and pyerfa: run it with the scratch venv (tmp/bt-gates/venv-astropy, astropy 8.0.2 and pyerfa 2.0.1.5 installed from PyPI; the system python is untouched):
    tools/horde/bench.sh tmp/bt-gates/venv-astropy/bin/python docs/battle-theatre/GOVERNANCE/gate_results/spec-b-evidence/q11_q22_inmemory.py
The recomputation needs about 30 s of CPU: run it under the machine lock."""
import os, sys, json, time, hashlib, collections
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, *(['..'] * 5)))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'bt'))
ENVDIR = os.path.join(ROOT, 'docs', 'battle-theatre', 'environment')
def snap():
    return {f: hashlib.sha256(open(os.path.join(ENVDIR, f), 'rb').read()).hexdigest()[:16] for f in sorted(os.listdir(ENVDIR)) if os.path.isfile(os.path.join(ENVDIR, f))}
before = snap()
import astropy, erfa
import check_environment as ce
ce.PDF_TXT = os.path.join(ROOT, 'docs', 'battle-theatre', 'BIBLE', 'plan-clean.txt')
res = {'python': sys.version.split()[0], 'astropy': astropy.__version__, 'pyerfa': erfa.__version__, 'plan_text': os.path.relpath(ce.PDF_TXT, ROOT)}
def summ(d):
    ck = d['checks']; bad = [c['check'] for c in ck if not c['ok']]
    return {'checks': len(ck), 'ok': len(ck) - len(bad), 'failed': bad, 'computation_passes': d['computation_passes'], 'source': d.get('source')}
t = time.time(); q = ce.gate_q11(True); res['gate_q11_recompute'] = dict(summ(q), seconds=round(time.time() - t, 1))
p = q['pooled_A_minus_B']; ev = q['events_A_minus_B_min']
res['largest_A_minus_B'] = {'sun_alt_deg': p['sun_alt_deg']['max_abs'], 'sun_az_deg': p['sun_az_deg']['max_abs'], 'moon_alt_deg': p['moon_alt_deg']['max_abs'], 'moon_az_deg': p['moon_az_deg']['max_abs'],
                            'events_min': {k: ev[k]['max_abs_min'] for k in ('sunrise', 'sunset', 'moonrise', 'moonset', 'ALL')}}
res['tolerances_in_code'] = {'sun_deg': ce.TOL_SUN_DEG, 'rise_set_min': ce.TOL_RISESET_MIN, 'moon_deg': ce.TOL_MOON_DEG}
t = time.time(); res['gate_q11_saved_agreement'] = dict(summ(ce.gate_q11(False)), seconds=round(time.time() - t, 1))
t = time.time(); rows = ce.pdf_figure_checks(); res['pdf_figure_checks'] = {'rows': len(rows), 'status': dict(collections.Counter(r['status'] for r in rows)), 'seconds': round(time.time() - t, 1)}
res['pdf_findings'] = [{'label': r['label'], 'printed': r['printed'], 'computed': r['computed'], 'diff': r['diff'], 'unit': r['unit']} for r in rows if r['status'] == 'FINDING']
t = time.time(); res['gate_q22'] = dict(summ(ce.gate_q22()), seconds=round(time.time() - t, 1))
after = snap()
res['environment_files_changed'] = [f for f in after if before.get(f) != after[f]] + [f for f in before if f not in after]
print(json.dumps(res, indent=1, ensure_ascii=False))
sys.exit(0 if not res['environment_files_changed'] else 3)

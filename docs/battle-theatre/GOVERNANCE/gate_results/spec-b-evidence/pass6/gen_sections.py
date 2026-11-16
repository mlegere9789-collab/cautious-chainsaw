#!/usr/bin/env python3
"""Write the generated sections of the sixth pass (section_30.md, section_31.md, section_32.md, section_33.md, section_78.md, section_8x.md) from the run files of this folder, the stored gate
records and the static texts below.  Read-only except for those six files.   python3 -I gen_sections.py"""
import os, re, json, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, *(['..'] * 6)))
GR = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'gate_results')
SCR = os.path.join(ROOT, 'tmp', 'bt-gates', 'pass6')
sys.argv = [sys.argv[0], '--dry']          # import the helpers of build_doc without writing the document
src = open(os.path.join(HERE, 'build_doc.py'), encoding='utf-8').read().split('# ------------------------------------------------------------------ the document')[0]
exec(compile(src, 'build_doc_helpers', 'exec'))

def stored(g):
    p = os.path.join(GR, g + '.json')
    return json.load(open(p, encoding='utf-8')) if os.path.exists(p) else None

def cnt(c):
    return ', '.join('%s %s' % (k, format(c[k], ',')) for k in ('PASS', 'COVERED', 'FAIL', 'NOT-RUN', 'BLOCKED-INPUT', 'N/A') if c.get(k))

def testsline(name, label=None):
    c = tap_counts(name)
    if c is None or name not in RUNS:
        return None
    return c

W = lambda name, s: open(os.path.join(HERE, name), 'w', encoding='utf-8').write(s.rstrip('\n') + '\n')
STATIC = __import__('gen_static')
GROUP = {'Q01': 'Q01, Q14, Q20', 'Q14': 'Q01, Q14, Q20', 'Q20': 'Q01, Q14, Q20', 'Q02': 'Q02, Q19, Q23, Q25', 'Q19': 'Q02, Q19, Q23, Q25', 'Q23': 'Q02, Q19, Q23, Q25', 'Q25': 'Q02, Q19, Q23, Q25', 'Q03': 'Q03',
         'Q04': 'Q04, Q05, Q06', 'Q05': 'Q04, Q05, Q06', 'Q06': 'Q04, Q05, Q06', 'Q07': 'Q07, Q08, Q09, Q21, Q22, Q26', 'Q08': 'Q07, Q08, Q09, Q21, Q22, Q26', 'Q09': 'Q07, Q08, Q09, Q21, Q22, Q26',
         'Q21': 'Q07, Q08, Q09, Q21, Q22, Q26', 'Q22': 'Q07, Q08, Q09, Q21, Q22, Q26', 'Q26': 'Q07, Q08, Q09, Q21, Q22, Q26', 'Q11': 'Q11, Q13', 'Q13': 'Q11, Q13', 'Q17': 'Q17, Q18, Q28',
         'Q18': 'Q17, Q18, Q28', 'Q28': 'Q17, Q18, Q28', 'Q10': 'Q10, Q12, Q24', 'Q12': 'Q10, Q12, Q24', 'Q24': 'Q10, Q12, Q24', 'Q15': 'Q15, Q16, Q27', 'Q16': 'Q15, Q16, Q27', 'Q27': 'Q15, Q16, Q27'}
RUNNER = {'Q01': ('q01_oob.py', 'test_q01', 'gates_test_q01'), 'Q02': ('q02_provenance.py', 'test_q02 + test_extracts', 'gates_test_q02'), 'Q03': ('q03_anachronism.py', 'test_q03 + test_q03_scene', 'gates_test_q03_scene'),
          'Q04': ('q04_arrival.py', 'test_q04', 'gates_test_q04'), 'Q05': ('q05_speed.py', 'test_q05', 'gates_test_q05'), 'Q06': ('q06_path.py', 'test_q06', 'gates_test_q06'),
          'Q14': ('q14_ordnance.py', 'test_q14', 'gates_test_q14'), 'Q19': ('q19_claims.py', 'test_q19', 'gates_test_q19'), 'Q20': ('q20_cavalry.py', 'test_q20', 'gates_test_q20'),
          'Q23': ('q23_marking.py', 'test_q23 + test_q23_app', 'gates_test_q23'), 'Q25': ('q25_library.py', 'test_q25', 'gates_test_q25')}

# ------------------------------------------------------------ 3.0
rows = []
for n in range(1, 29):
    g = 'Q%02d' % n
    st = stored(g)
    if g in RUNNER:
        py, tests, key = RUNNER[g]
        c = tap_counts(key)
        if g == 'Q03':
            tt = '117 + 6 tests pass (`test_q03.py` run alone, niced: 490 s wall, 128 s of CPU; `test_q03_scene.py` %s)' % (('%s of %s pass' % (c.get('pass'), c['tests'])) if c else 'not run when this was written')
        elif g in ('Q02', 'Q23'):
            extra = {'Q02': ('gates_test_extracts', 15), 'Q23': ('gates_test_q23_app', 12)}[g]
            c2 = tap_counts(extra[0])
            tt = '%s + %s tests: %s' % (c['tests'] if c else '?', c2['tests'] if c2 else extra[1], 'all pass' if c and c2 and c.get('fail') == 0 and c2.get('fail') == 0 else 'see 7.8')
        else:
            tt = ('%d tests: %s' % (c['tests'], 'all pass' if c.get('fail') == 0 else '%d fail' % c['fail'])) if c else 'not run when this was written'
        if st:
            rec = '%s; %s items (%s)' % (st['verdict'], format(len(st['items']), ','), cnt(st['counts']))
        else:
            cur = None
            for d in ('results-c',):
                p = os.path.join(SCR, d, g + '.json')
                if os.path.exists(p):
                    cur = json.load(open(p, encoding='utf-8'))
            rec = ('none stored; scratch run at pass 6: %s, %s items (%s)' % (cur['verdict'], format(len(cur['items']), ','), cnt(cur['counts']))) if cur else ('none stored' if g == 'Q03' else 'none stored; the dense run never started')
        child = {'Q01': 'node child `q01_layer.mjs`', 'Q02': 'node children `q02_layer.mjs` and `q23_app.mjs`', 'Q03': 'node child `q03_scene.mjs`', 'Q04': 'node child `q04_arrival.mjs`', 'Q05': 'node child `q05_speed.mjs`', 'Q06': 'node child `q06_path.mjs`',
                 'Q14': 'node child `q14_layer.mjs`', 'Q19': 'the scan of Q02 and its node children', 'Q20': 'node child `q20_layer.mjs`', 'Q23': 'node child `q23_app.mjs`', 'Q25': 'python only'}[g]
        rows.append('| %s | `%s` (%s) | %s | %s | %s | %s |' % (g, py, child, tt, rec, STATIC.RUNS[g], STATIC.BLOCKED[g]))
    else:
        rows.append('| %s | none (group %s) | none | none | %s | %s |' % (g, GROUP[g], STATIC.RUNS[g], STATIC.BLOCKED[g]))
sec30 = """### 3.0 The gate runners at the sixth pass

One row per gate. "Runner" is the file under `tools/bt/gates/` (its node child in brackets); "Unit tests" the python tests of `tests/governance/gates/` as run at this pass; "Stored record" the verdict and item counts of `GOVERNANCE/gate_results/Qnn.json` (the record is FAIL for every gate that has one; its failing items name an input that does not exist or a datum that lacks a field); "Where it runs" uses the marks of section 0; the last column is what the record's `owed` list, its failing items and the sections of 4 say, not a pass rule. A gate with no runner names the group of the workflow `bt-gate-engine.mjs` that builds it.

| Gate | Runner | Unit tests | Stored record | Where it runs | Blocked on or owed |
|---|---|---|---|---|---|
""" + '\n'.join(rows)
W('section_30.md', sec30)

# ------------------------------------------------------------ 3.1
W('section_31.md', STATIC.S31)

# ------------------------------------------------------------ 3.2.1
cost = []
def cst(name):
    r = RUNS.get(name)
    return ('%s s of CPU, %s s of wall time' % (fmt(r['cpu']), fmt(r['wall']))) if r else 'not run when this was written'
for g, cmd, name, lock in (
    ('Q01', '`python3 tools/bt/gates/q01_oob.py [--out DIR]` (sample of 7 scenarios)', 'run_q01', 'no'),
    ('Q02', '`python3 tools/bt/gates/q02_provenance.py [--out DIR]`', 'run_q02', 'no (its docstring says heavy: 13 s of CPU measured)'),
    ('Q03', '`python3 tools/bt/gates/q03_anachronism.py [--out DIR]`', 'run_q03_full', 'yes (docstring: about 300 s of CPU)'),
    ('Q04', '`python3 tools/bt/gates/q04_arrival.py --scenarios default --grid dense [--out DIR]` (the probe; S* is the full run)', 'run_q04_default', 'yes'),
    ('Q05', '`python3 tools/bt/gates/q05_speed.py --scenarios default --grid dense [--out DIR]`', 'run_q05_default', 'yes'),
    ('Q06', '`python3 tools/bt/gates/q06_path.py --scenarios default [--out DIR]`', 'run_q06_default', 'yes'),
    ('Q14', '`python3 tools/bt/gates/q14_ordnance.py [--out DIR]`', 'run_q14', 'no'),
    ('Q19', '`python3 tools/bt/gates/q19_claims.py [--out DIR]` (as a script, not under `-I`)', 'run_q19', 'no'),
    ('Q20', '`python3 tools/bt/gates/q20_cavalry.py [--out DIR]`', 'run_q20', 'no'),
    ('Q23', '`python3 tools/bt/gates/q23_marking.py [--out DIR]` (as a script, not under `-I`)', 'run_q23', 'no'),
    ('Q25', '`python3 tools/bt/gates/q25_library.py [--out DIR]`', 'run_q25', 'no')):
    cost.append('| %s | %s | %s | %s |' % (g, cmd, cst(name), lock))
tcost = []
for key, label in (('gates_test_extracts', 'test_extracts.py'), ('gates_test_q25', 'test_q25.py'), ('gates_test_q19', 'test_q19.py'), ('gates_test_q02', 'test_q02.py'), ('gates_test_q23', 'test_q23.py'), ('gates_test_q23_app', 'test_q23_app.py'),
                   ('gates_test_q03_scene', 'test_q03_scene.py'), ('gates_test_q01', 'test_q01.py'), ('gates_test_q14', 'test_q14.py'), ('gates_test_q20', 'test_q20.py'), ('gates_test_q05', 'test_q05.py'), ('gates_test_q06', 'test_q06.py'), ('gates_test_q04', 'test_q04.py')):
    c = tap_counts(key)
    tcost.append('| `%s` | %s | %s | %s |' % (label, ('%d, %s' % (c['tests'], 'all pass' if c.get('fail') == 0 else '%s fail' % c.get('fail'))) if c else 'not run', cst(key), 'yes (over 30 s of CPU)' if (RUNS.get(key) and RUNS[key]['cpu'] > 30) else 'no'))
tcost.append('| `test_q03.py` | 117, all pass | 128 s of CPU, 490 s of wall time (run alone, niced, at 02:41 UTC) | yes (over 30 s of CPU: started directly to measure it, a deviation recorded in 7.8) |')
sec32 = """### 3.2.1 Runner entry points at the sixth pass, with the cost measured at this pass

CPU seconds are user plus system on a loaded machine (load average 22 to 31), so they are upper bounds; "lock" says whether the job needs more than about 30 s of CPU or a browser and so belongs under `tools/horde/bench.sh`. Every runner writes only into `--out` (`Qnn.json`, `Qnn.prev.json`, `evidence/Qnn/`); the runs below used a scratch folder under `tmp/bt-gates/pass6/` and wrote nothing into `GOVERNANCE/gate_results`. An exit code of 1 is a FAIL verdict, not an error (0 PASS, 1 FAIL, 2 INCOMPLETE, 3 runner error).

| Gate | Command | Cost at pass 6 | Lock |
|---|---|---|---|
""" + '\n'.join(cost) + """

The unit tests of the runners (`python3 -m unittest discover -s tests/governance/gates -p test_qNN.py`; `pytest` is not installed):

| File | Tests | Cost at pass 6 | Lock |
|---|---|---|---|
""" + '\n'.join(tcost)
W('section_32.md', sec32)

# ------------------------------------------------------------ 3.3.1
W('section_33.md', STATIC.S33)
# ------------------------------------------------------------ 7.8 and 8.x
W('section_78.md', STATIC.make_78(RUNS, tap_counts, run_phrase, fmt, hm, stored, cnt, SCR, GR, HERE, LIGHT, LIGHT2, HEA, HEC))
W('section_8x.md', STATIC.S8X)
print('written: section_30, 31, 32, 33, 78, 8x')

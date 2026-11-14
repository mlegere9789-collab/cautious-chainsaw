#!/usr/bin/env python3
"""Structure and identifier checks of GATE-SPEC.md (the reconciliation of GATE-SPEC-A.md and GATE-SPEC-B.md).
Reads files only; writes nothing. Usage: python3 -I check_gs_structure.py [path-to-spec]   (default: ../GATE-SPEC.md)
Checks: (1) every markdown table row has as many cells as its header; (2) the 28 gate sections each carry the parts the task asks for
(text, definition, numbered checks, item and per-item pass rule, runner with command and output file, runs, gates, state);
(3) the numbered checks Qnn.k are contiguous per gate and equal the set of GATE-SPEC-A.md; (4) U-nn, A-nn, X-nn, K-n, RC items, T-ids:
each defined once and contiguous; (5) every cross-reference id that the text uses is defined; (6) DD-G ids cited exist in the decisions file
(DD-G16 to DD-G19 are appended with the file, so they are required there too); (7) no placeholder, no emoji, no unresolved marker."""
import re, sys, os, json, collections
HERE = os.path.dirname(os.path.abspath(__file__))
GR = os.path.abspath(os.path.join(HERE, '..'))
GOV = os.path.abspath(os.path.join(GR, '..'))
doc = sys.argv[1] if len(sys.argv) > 1 else os.path.join(GR, 'GATE-SPEC.md')
text = open(doc, encoding='utf-8').read()
lines = text.split('\n')
problems, notes = [], []
def bad(msg): problems.append(msg)

# (1) tables
def cells(row):
    r = re.sub(r'`[^`]*`', lambda m: m.group(0).replace('|', '\x00'), row)      # pipes inside code spans are not separators
    r = r.replace('\\|', '\x00')
    parts = r.strip().split('|')
    return parts[1:-1] if r.strip().startswith('|') and r.strip().endswith('|') else parts
tables = rows_total = 0
i = 0
while i < len(lines):
    if lines[i].startswith('|') and i + 1 < len(lines) and re.match(r'^\|[\s:|-]+\|$', lines[i + 1].strip()):
        n = len(cells(lines[i])); tables += 1; j = i + 2
        if len(cells(lines[i + 1])) != n: bad(f'table at line {i+1}: separator has {len(cells(lines[i+1]))} cells, header {n}')
        while j < len(lines) and lines[j].startswith('|'):
            rows_total += 1
            if len(cells(lines[j])) != n: bad(f'line {j+1}: {len(cells(lines[j]))} cells, header has {n}: {lines[j][:70]}')
            j += 1
        i = j
    else: i += 1
notes.append(f'{tables} tables, {rows_total} body rows')

# (2) gate sections
gate_heads = {m.group(1): n for n, l in enumerate(lines) for m in [re.match(r'^### (Q\d\d) ', l)] if m}
if sorted(gate_heads) != [f'Q{k:02d}' for k in range(1, 29)]: bad('gate sections are not exactly Q01..Q28: ' + str(sorted(gate_heads)))
order = sorted(gate_heads.items(), key=lambda kv: kv[1])
parts_req = [('Text', r'^\*\*Text \(p\. 136'), ('Definition', r'^\*\*Definition\.\*\*'), ('Item rule', r'^\*\*Item and per-item pass rule\.\*\*'),
             ('Runner', r'^\*\*Runner\.\*\*'), ('Runs', r'^\*\*Runs\.\*\*'), ('Gates', r'^\*\*Gates\.\*\*'), ('State', r'^\*\*State')]
checks_in_doc = {}
for idx, (g, start) in enumerate(order):
    end = order[idx + 1][1] if idx + 1 < len(order) else next((n for n in range(start + 1, len(lines)) if lines[n].startswith('## ')), len(lines))
    sec = lines[start:end]
    for name, pat in parts_req:
        if not any(re.match(pat, l) for l in sec): bad(f'{g}: missing part {name}')
    body = '\n'.join(sec)
    ks = sorted({int(m.group(1)) for m in re.finditer(r'\*\*' + g + r'\.(\d+)[ :.*]', body)})
    checks_in_doc[g] = ks
    if ks != list(range(1, len(ks) + 1)): bad(f'{g}: numbered checks not contiguous: {ks}')
    rl = next((l for l in sec if l.startswith('**Runner.**')), '')
    if f'GOVERNANCE/gate_results/{g}.json' not in rl: bad(f'{g}: the runner part does not name the output file GOVERNANCE/gate_results/{g}.json')
    if f'run_gate.py {g}' not in rl: bad(f'{g}: the runner part does not name its command run_gate.py {g}')
    if not any(k in '\n'.join(l for l in sec if l.startswith('**Runs.**')) for k in ('python', 'node', 'swgl', 'GPU', 'gpu')): bad(f'{g}: Runs part names no renderer class')
total_checks = sum(len(v) for v in checks_in_doc.values())
notes.append(f'{len(gate_heads)} gate sections, {total_checks} numbered checks')

# (3) equal to Spec A
specA = os.path.join(GR, 'GATE-SPEC-A.md')
if os.path.exists(specA):
    ta = open(specA, encoding='utf-8').read()
    ka = collections.defaultdict(set)
    for m in re.finditer(r'\*\*(Q\d\d)\.(\d+)[ :.*]', ta): ka[m.group(1)].add(int(m.group(2)))
    for g in sorted(set(ka) | set(checks_in_doc)):
        if sorted(ka.get(g, [])) != checks_in_doc.get(g, []): bad(f'{g}: numbered checks differ from Spec A: this {checks_in_doc.get(g)} vs A {sorted(ka.get(g, []))}')
    notes.append(f'numbered checks equal to GATE-SPEC-A.md: {sum(len(v) for v in ka.values())} in A')

# (4) ids defined once and contiguous
def defined(pat):
    return [m.group(1) for l in lines for m in [re.match(pat, l)] if m]
U = defined(r'^- \*\*(U-\d\d) '); A = defined(r'^\| (A-\d\d) \|'); X = defined(r'^\| (X-\d\d) \|'); K = defined(r'^\d+\. \*\*(K\d+) ')
for name, ids, n in (('U', U, 28), ('A', A, 57), ('X', X, 56), ('K', K, 13)):
    want = [f'{name}-{k:02d}' if name != 'K' else f'K{k}' for k in range(1, n + 1)]
    if ids != want: bad(f'{name} ids: expected {want[0]}..{want[-1]} in order, found {len(ids)}: missing {sorted(set(want)-set(ids))[:6]}, extra {sorted(set(ids)-set(want))[:6]}, duplicates {[k for k,c in collections.Counter(ids).items() if c>1][:6]}')
notes.append(f'U {len(U)}, A {len(A)}, X {len(X)}, K {len(K)} defined')
RC = [m.group(1) for m in re.finditer(r'(RC-R\d\d\.\d+) ', '\n'.join(l for l in lines if re.match(r'^\| R\d\d\.0000 \|', l)))]
if len(RC) != 71 or len(set(RC)) != 71: bad(f'requirement-level check items: {len(RC)} found ({len(set(RC))} distinct), expected 71')
notes.append(f'{len(set(RC))} requirement-level check items in 7.1')
T = defined(r'^\| (T-[A-Za-z0-9]+-\d+)')
if len(T) != len(set(T)): bad('threshold ids defined twice')
notes.append(f'{len(T)} thresholds in 10.1')

# (5) cross references
body = text
refs = {
 'A': set(re.findall(r'\b(A-\d\d)\b', body)), 'X': set(re.findall(r'\b(X-\d\d)\b', body)), 'U': set(re.findall(r'\b(U-\d\d)\b', body)),
 'T': set(re.findall(r'\b(T-Q\d\d-\d+|T-OA\d\d-\d+|T-SS-\d+)\b', body)), 'RC': set(re.findall(r'\b(RC-R\d\d\.\d+)\b', body))}
for k, s in (('A', set(A)), ('X', set(X)), ('U', set(U))):
    miss = sorted(refs[k] - s)
    if miss: bad(f'{k} ids used and not defined: {miss}')
tdef = set(T) | {'T-SS-1'}
miss = sorted(x for x in refs['T'] if x not in tdef)
if miss: bad(f'threshold ids used and not defined: {miss}')
miss = sorted(refs['RC'] - set(RC))
if miss and not all(re.match(r'RC-R\d\d\.\d+$', x) for x in miss): bad(f'RC ids used and not defined: {miss}')
elif miss: notes.append('RC ids used and not in the 7.1 table (counted as a family): ' + ', '.join(miss))
qk = set(re.findall(r'\b(Q\d\d\.\d+)\b', body))
allchecks = {f'{g}.{k}' if False else f'{g}.{k}' for g, ks in checks_in_doc.items() for k in ks}
miss = sorted(x for x in qk if x not in allchecks)
if miss: bad(f'check ids used and not defined: {miss[:10]}')
for pre, rng in (('TL', 12), ('SS', 11), ('WK', 6), ('GE', 5), ('PE', 4), ('CT', 5), ('CF', 8), ('EP', 5), ('TOP', 5)):
    used = set(re.findall(r'\b(' + pre + r'-\d+)\b', body))
    miss = sorted(u for u in used if int(u.split('-')[1]) > rng or int(u.split('-')[1]) < 1)
    if miss: bad(f'class rule ids out of range: {miss}')
Vs = set(re.findall(r'\bV(\d+)\b', '\n'.join(l for l in lines if 'V' in l and re.search(r'\bV\d{1,2}\b', l))))
for l in lines:
    for m in re.finditer(r'\*\*V(\d+) ', l):
        pass
vdef = sorted({int(m.group(1)) for l in lines for m in re.finditer(r'^- \*\*V(\d+) ', l)})
if vdef != list(range(1, 12)): bad(f'validity conditions V1..V11 not all defined once in 6.4: {vdef}')
# section numbers cited as "(4.9 TOP-5)" style must name an existing heading
heads = {m.group(1) for l in lines for m in [re.match(r'^#{2,3} ((?:\d+(?:\.\d+)?))[. ]', l)] if m}
for m in re.finditer(r'\((?:see )?(\d+\.\d+)(?: [A-Z]{2,3}-\d+)?[,)]', body):
    s = m.group(1)
    ctx = body[max(0, m.start() - 45):m.start()]
    if re.search(r'(Spec [AB]|SPEC-[AB]|GATE-SPEC-[AB]\.md|README|harness)[^()]*$', ctx): continue      # a section of another file
    if s.startswith('0.'): continue                                      # a number such as 0.34, not a section
    if s not in heads: bad(f'section {s} cited but there is no such heading')

# (6) decisions
dd = os.path.join(GOV, 'decisions', 'DELEGATED-DECISIONS-2026-11-11.md')
if os.path.exists(dd):
    dt = open(dd, encoding='utf-8').read()
    have = set(re.findall(r'^\| (DD-G\d\d) \|', dt, re.M))
    used = {x for x in re.findall(r'\b(DD-G\d\d)\b', body)}
    miss = sorted(used - have)
    if miss: bad(f'DD-G ids cited here and not a row of the decisions file: {miss}')
    notes.append(f'DD-G rows in the decisions file: {len(have)}; cited here: {len(used)}')

# (7) hygiene
if re.search(r'\[\[|\]\]|TODO|FIXME|XXX', body): bad('placeholder or marker left in the text')
if re.search(r'[\U0001F300-\U0001FAFF☀-➿]', body): bad('emoji in the text')
if re.search(r'\bDECIDED\b(?! BY OWNER)', body) and not re.search(r'DECIDED is not written|word DECIDED', body): bad('the word DECIDED is used outside the statement that it is never written')
print(json.dumps({'file': os.path.basename(doc), 'problems': len(problems), 'notes': notes}, indent=1))
for p in problems: print('PROBLEM:', p)
sys.exit(1 if problems else 0)

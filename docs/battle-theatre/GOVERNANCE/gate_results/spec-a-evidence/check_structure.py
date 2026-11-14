#!/usr/bin/env python3
"""Structure checks of GATE-SPEC-A.md: (1) every markdown table row has as many cells as its header; (2) every cross-reference
(A-nn, U-nn, T-xxx, DD-Gnn, TL-n, SS-n, WK-n, GE-n, PE-n, CT-n, CF-n, EP-n, TOP-n, OA-Gnn, Qnn.k, RC-Rnn.k, K-nn, X-nn) is defined where the spec defines it;
(3) the 28 'Text (p. 136).' lines equal gates.json (and the plan's gate table) word for word; (4) all 28 gate sections exist, in order, each with the parts the spec promises.
Reads files only. Usage: python3 -I check_structure.py [path-to-spec]"""
import re, sys, json, os
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from plan_lib import load_pages, fold, joined, GOV, SPEC

doc = sys.argv[1] if len(sys.argv) > 1 else SPEC
text = open(doc, encoding='utf-8').read()
lines = text.split('\n')
res = {}

# 1. tables
bad_rows = []; tables = 0; rows = 0
i = 0; fence = False
while i < len(lines):
    ln = lines[i]
    if ln.strip().startswith('```'): fence = not fence
    if (not fence) and ln.startswith('|') and i + 1 < len(lines) and re.match(r'^\|[\s:|-]+\|\s*$', lines[i + 1]):
        def cells(s):
            s = re.sub(r'`[^`]*`', lambda m: m.group(0).replace('|', '│'), s)
            s = s.replace('\\|', '│')
            return len(s.strip().strip('|').split('|'))
        hn = cells(ln); tables += 1; j = i + 2
        while j < len(lines) and lines[j].startswith('|'):
            rows += 1
            if cells(lines[j]) != hn: bad_rows.append((j + 1, hn, cells(lines[j])))
            j += 1
        i = j; continue
    i += 1
res['tables'] = tables; res['table_body_rows'] = rows; res['rows_with_wrong_cell_count'] = bad_rows[:20]

# 2. cross references
body = re.sub(r'```.*?```', '', text, flags=re.S)
defined = set()
for m in re.finditer(r'(?m)^(?:- )?\*\*((?:U|TL|SS|WK|GE|PE|CT|CF|EP|TOP|Q\d\d\.\d+|K\d+)[-.]?\d*)', body): defined.add(m.group(1))
for m in re.finditer(r'(?m)^\| (A-\d\d|X-\d\d|T-[A-Z0-9-]+|T-SS-1|DD-G\d\d|OA\d\d|Z\.\d|OA-G\d\d) ', body): defined.add(m.group(1))
for m in re.finditer(r'(?m)^\| [A-Za-z0-9.-]+ \(([A-Za-z0-9-]+)\) \|', body): defined.add(m.group(1))   # first cell with an alias in brackets: `OA01 (OA-G01)`, `T-Q07-1 (T-SS-1)`
for m in re.finditer(r'(?m)^- \*\*(DD-G\d\d)', body): defined.add(m.group(1))
for m in re.finditer(r'(?m)^\| (RC-R\d\d\.\d+|R\d\d\.0000) ', body): defined.add(m.group(1))
for m in re.finditer(r'RC-R\d\d\.\d+', body): pass
used = {}
pats = [r'\bA-\d\d\b', r'\bU-\d\d\b', r'\bX-\d\d\b', r'\bT-Q\d\d-\d+\b', r'\bT-SS-1\b', r'\bT-OA\d\d-\d+\b', r'\bDD-G\d\d\b', r'\bOA-G\d\d\b',
        r'\b(?:TL|SS|WK|GE|PE|CT|CF|EP|TOP)-\d+\b', r'\bQ\d\d\.\d+\b']
for p in pats:
    for m in re.finditer(p, body): used.setdefault(m.group(0), 0); used[m.group(0)] += 1
undefined = sorted(k for k in used if k not in defined)
res['cross_refs_used'] = len(used); res['cross_refs_not_defined_by_a_heading_or_row'] = undefined

# 3. gate texts
gates = json.load(open(os.path.join(GOV, 'gates.json'), encoding='utf-8'))
pages = load_pages(); p136 = fold(joined(pages, 136, 136))
text_bad = []; found = 0; heads = []
for m in re.finditer(r'(?m)^### (Q\d\d) ', text): heads.append(m.group(1))
for g in sorted(gates):
    if not g.startswith('Q'): continue
    mm = re.search(r'(?ms)^### ' + g + r' .*?\*\*Text \(p\. 136\)\.\*\* "(.*?)"(?: `gates\.json`.*?)?\n', text)
    if not mm: text_bad.append((g, 'no Text line')); continue
    t = mm.group(1)
    gt = gates[g]
    tidy = lambda x: re.sub(r'\s+([,.;:])', r'\1', re.sub(r'\s+', ' ', fold(x))).strip()   # gates.json prints some words with a space before a comma and curly apostrophes
    a = tidy(t); b = tidy(gt)
    if not (b.startswith(a) or a == b or a in b or b in a): text_bad.append((g, 'differs from gates.json', t[:80]))
    elif tidy(t).replace('"', '') not in re.sub(r'\s+([,.;:])', r'\1', p136).replace('"', ''): text_bad.append((g, 'not on p. 136 verbatim', t[:80]))
    else: found += 1
res['gate_sections'] = heads; res['gate_texts_verbatim_on_p136_and_in_gates_json'] = found; res['gate_text_problems'] = text_bad
res['gates_in_gates_json'] = [g for g in gates if g.startswith('Q')]
print(json.dumps(res, indent=1))

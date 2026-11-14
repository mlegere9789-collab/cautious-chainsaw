#!/usr/bin/env python3
"""Check that each of the 28 gate sections of GATE-SPEC-A.md carries the parts the task asks for:
the exact property (a Text line and numbered checks Qnn.k), its inputs, what a per-item result is (Item and Result),
when it can pass, and what must be registered instead; plus Judges and Runs. Reads files only.
Usage: python3 -I check_gate_parts.py [path-to-spec]"""
import re, sys, json
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from plan_lib import SPEC
doc = sys.argv[1] if len(sys.argv) > 1 else SPEC
t = open(doc, encoding='utf-8').read()
secs = re.split(r'(?m)^### (?=Q\d\d )', t)[1:]
need = {'text': r'\*\*Text \(p\. 136\)\.\*\*', 'checks': r'\*\*Checks\.\*\*', 'inputs': r'\*\*Inputs\.\*\*', 'item': r'\*\*Item(?: and result)?\.\*\*',
        'result': r'\*\*Result\.\*\*|\*\*Item and result\.\*\*', 'can_pass': r'\*\*Can pass when\*\*', 'registered_instead': r'\*\*Registered instead\.\*\*',
        'judges': r'\*\*Judges\.\*\*', 'runs': r'\*\*Runs\.\*\*'}
bad = {}; out = {}
for s in secs:
    g = s[:3]
    # section ends at the next '## ' heading
    body = re.split(r'(?m)^## ', s)[0]
    miss = [k for k, p in need.items() if not re.search(p, body)]
    nchk = len(set(re.findall(r'\*\*' + g + r'\.(\d+)\b', body)))
    out[g] = {'checks': nchk}
    if miss: bad[g] = miss
    if nchk == 0: bad.setdefault(g, []).append('no numbered checks')
print(json.dumps({'gate_sections': len(secs), 'with_problems': bad, 'numbered_checks_per_gate': {g: v['checks'] for g, v in out.items()}}))

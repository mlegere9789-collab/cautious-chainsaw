#!/usr/bin/env python3
"""Recompute the object-kind distribution of the 88 schedule rows that GATE-SPEC-B.md states in 2.4 item 5 (fourth pass, 2026-11-14). Read-only.
    python3 -I docs/battle-theatre/GOVERNANCE/gate_results/spec-b-evidence/pass4/schedule_kinds.py"""
import json, os, collections
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), *(['..'] * 6)))
rows = json.load(open(os.path.join(ROOT, 'docs/battle-theatre/structures/state_schedule.json'), encoding='utf-8'))['rows']
PREFIX = (('bld-', 'building/hospital'), ('H-', 'building/hospital'), ('FEN-', 'fence/wall'), ('P-', 'fence/wall'), ('E-', 'work'), ('G-', 'gun emplacement'),
          ('WS-', 'epilogue state'), ('ENV-', 'ENV'), ('GROUP-', 'GROUP'), ('PERSON-', 'PERSON'), ('RD-', 'RD'))
def kind(i):
    for p, k in PREFIX:
        if i.startswith(p): return k
    return 'OTHER:' + i[:6]
cnt = collections.Counter(tuple(sorted({kind(i) for i in r['object_ids']})) for r in rows)
print('rows', len(rows))
for k, v in sorted(cnt.items(), key=lambda x: (-x[1], x[0])): print(v, ' + '.join(k))
print('out_of_battle_scope', sum(1 for r in rows if r.get('out_of_battle_scope')))

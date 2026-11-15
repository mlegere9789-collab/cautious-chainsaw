#!/usr/bin/env python3
"""Insert (or replace) the "Updated at pass 5" bullet of every gate section of GATE-SPEC-B.md from pass5/gate_bullets.txt.
Idempotent: a section that already has a line starting "- **Updated at pass 5.**" has that line replaced, otherwise the bullet is inserted just before the
section's "- **Runs.**" line.  Refuses to write when a gate section is missing, has not exactly one Runs line, or has several pass-5 bullets.

    python3 -I docs/battle-theatre/GOVERNANCE/gate_results/spec-b-evidence/pass5/apply_gate_bullets.py [--dry]
"""
import os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
DOC = os.path.abspath(os.path.join(HERE, '..', '..', 'GATE-SPEC-B.md'))
SRC = os.path.join(HERE, 'gate_bullets.txt')
MARK = '- **Updated at pass 5.** '
RUNS = '- **Runs.**'

bullets = {}
cur = None
for line in open(SRC, encoding='utf-8').read().split('\n'):
    m = re.match(r'^@@(Q\d\d)$', line)
    if m:
        cur = m.group(1); bullets[cur] = []
    elif cur is not None and line.strip():
        bullets[cur].append(line.strip())
bullets = {k: ' '.join(v) for k, v in bullets.items()}
assert sorted(bullets) == ['Q%02d' % i for i in range(1, 29)], 'gate_bullets.txt must hold Q01..Q28 exactly once each: %s' % sorted(bullets)

text = open(DOC, encoding='utf-8').read()
lines = text.split('\n')
out, i, n_ins, n_rep = [], 0, 0, 0
sections = {}
# locate every "### Qnn" section inside "## 4. The gates"
starts = [(k, ln) for k, ln in enumerate(lines) if re.match(r'^### Q\d\d$', ln)]
assert len(starts) == 28, 'expected 28 gate sections, found %d' % len(starts)
ends = []
for idx, (k, ln) in enumerate(starts):
    j = k + 1
    while j < len(lines) and not lines[j].startswith('## ') and not lines[j].startswith('### '):
        j += 1
    ends.append(j)
plan = {}
for (k, ln), e in zip(starts, ends):
    g = ln[4:]
    idxs_runs = [x for x in range(k, e) if lines[x].startswith(RUNS)]
    idxs_mark = [x for x in range(k, e) if lines[x].startswith(MARK)]
    assert len(idxs_runs) == 1, '%s: %d Runs lines' % (g, len(idxs_runs))
    assert len(idxs_mark) <= 1, '%s: %d pass-5 bullets' % (g, len(idxs_mark))
    plan[g] = (idxs_runs[0], idxs_mark[0] if idxs_mark else None)
# apply from the bottom so that indexes stay valid
for g in sorted(plan, reverse=True):
    runs_i, mark_i = plan[g]
    new = MARK + bullets[g]
    if mark_i is not None:
        lines[mark_i] = new; n_rep += 1
    else:
        lines.insert(runs_i, new); n_ins += 1
if '--dry' in sys.argv:
    print('dry run: would insert %d and replace %d bullets' % (n_ins, n_rep)); sys.exit(0)
open(DOC, 'w', encoding='utf-8').write('\n'.join(lines))
print('inserted %d, replaced %d pass-5 bullets' % (n_ins, n_rep))

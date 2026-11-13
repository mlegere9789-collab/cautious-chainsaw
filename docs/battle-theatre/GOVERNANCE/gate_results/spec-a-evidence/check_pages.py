#!/usr/bin/env python3
"""Check the page citations of GATE-SPEC-A.md that carry a section label.
Forms recognised:  (p. 136, Q08)  (pp. 62-63, B.2.5)  (p. 134, E.6)  (p. 126, D.4.3 stage 11)  (App. B, p. 139)  B.8.7 (p. 102)  Q08 (p. 136).
Part E (pages 132 to 138): a one-letter section label X or X.n must lie on a page of section X (from the section's heading page to the page of
the next section's heading); Qnn must be on p. 136; Appendix X on its own pages. Parts B, C, D (pages 1 to 131): the label (for example B.8.7) must
occur as text on a page within two pages of the cited one, and, when it occurs as a line-start heading anywhere, the cited page must not be
before the first heading page of its section by more than one page. Reads files only. Usage: python3 -I check_pages.py [path-to-spec]"""
import re, sys, json
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from plan_lib import load_pages, SPEC

doc = sys.argv[1] if len(sys.argv) > 1 else SPEC
pages = load_pages()
# Part E section letter -> (first page, last page)
E = {}
order = []
for n in range(132, 139):
    for m in re.finditer(r'(?m)^([A-Z])\. (?=[A-Z])', pages[n]):
        L = m.group(1)
        if L not in E and (L == 'A' or order and ord(L) == ord(order[-1]) + 1) and not (n == 132 and L != 'A'):
            order.append(L); E[L] = [n, n]
for k, L in enumerate(order):
    nxt = E[order[k + 1]][0] if k + 1 < len(order) else 138
    E[L][1] = nxt
E['Z'][1] = 138
APP = {}
for n in range(138, 145):
    for m in re.finditer(r'(?m)^Appendix ([A-F])\.', pages[n]): APP.setdefault(m.group(1), []).append(n)

def part_ok(label, p):
    """Return (ok, why)"""
    m = re.match(r'^Q(\d\d)$', label)
    if m: return (p == 136 or p in (142, 143)), 'gate rows are on p. 136 and App. E pp. 142-143'
    m = re.match(r'^([A-Z])(?:\.\d+)*$', label)
    if m and 132 <= p <= 138:
        L = m.group(1)
        if L in E: return (E[L][0] <= p <= E[L][1]), f'section {L} spans pp. {E[L][0]}-{E[L][1]}'
    if m and p <= 131:
        base = label
        txt = ''.join(pages[x] for x in range(max(1, p - 2), min(131, p + 2) + 1))
        return (re.search(r'(?<![\w.])' + re.escape(base) + r'(?![\d])', txt) is not None), f'label {base} not on pp. {max(1,p-2)}-{min(131,p+2)}'
    return True, 'not checked'

pairs = []
fence = False
for i, line in enumerate(open(doc, encoding='utf-8').read().split('\n'), 1):
    if line.strip().startswith('```'): fence = not fence; continue
    if fence: continue
    for m in re.finditer(r'\bpp?\.\s*(\d{1,3})(?:\s*(?:-|–)\s*(\d{1,3}))?\s*,\s*((?:Q\d\d|[A-Z](?:\.\d+)*))(?![\w])', line):
        a = int(m.group(1)); b = int(m.group(2) or a)
        pairs.append((i, a, b, m.group(3), m.group(0)))
    for m in re.finditer(r'(?<![\w.])((?:Q\d\d|[A-D](?:\.\d+)+))\s*\(\s*pp?\.\s*(\d{1,3})(?:\s*(?:-|–)\s*(\d{1,3}))?\s*\)', line):
        a = int(m.group(2)); b = int(m.group(3) or a)
        pairs.append((i, a, b, m.group(1), m.group(0)))
    for m in re.finditer(r'App\.\s*([A-F])\s*,\s*pp?\.\s*(\d{1,3})(?:\s*(?:-|–)\s*(\d{1,3}))?', line):
        a = int(m.group(2)); b = int(m.group(3) or a)
        if APP.get(m.group(1)) and not any(a <= x <= b for x in APP[m.group(1)] + [APP[m.group(1)][-1] + 1]):
            pairs.append((i, a, b, 'App.' + m.group(1), m.group(0) + ' (appendix heading pages ' + str(APP[m.group(1)]) + ')'))
print(json.dumps({'part_E_sections': E, 'appendix_heading_pages': APP, 'pairs_checked': len(pairs)}))
bad = 0
for i, a, b, label, txt in pairs:
    if label.startswith('App.'):
        print(f'APPENDIX line {i}: {txt}'); bad += 1; continue
    oks = [part_ok(label, p) for p in range(a, b + 1)]
    if not any(ok for ok, _ in oks):
        print(f'PAGE-LABEL line {i}: {txt} -> {oks[0][1]}'); bad += 1
print(json.dumps({'mismatches': bad}))

"""Uncited clock times in selected Official Records reports (second reader). python3 -I tmp/tl-02/ver2/hours_or.py PART RECORD_REGEX [--w 110]"""
import os, re, sys, json
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'bt'))
import or27_find
part = int(sys.argv[1]); rec_rx = re.compile(sys.argv[2]); W = 110
if '--w' in sys.argv: W = int(sys.argv[sys.argv.index('--w') + 1])
rows = [json.loads(l) for l in open(os.path.join(ROOT, 'docs/battle-theatre/GOVERNANCE/timeline_corrections/tl-02.jsonl'), encoding='utf-8')]
cov = [(c['text_offset'], c['text_offset_end']) for r in rows for c in r['citations'] if c.get('part') == part]
P = or27_find.get_part(part)
HR = re.compile(r"(?<![\d.,])(\d{1,2}[.:]\d{2}|\d{1,2}) ?(?:[AaPp]\.? ?[Mm]\b|o'clock)|\bnoon\b|\b12 m\b\.?|\bdaybreak\b")
seen = set(); n = 0
for m in HR.finditer(P.ntext):
    a, b = P.orig_span(m.start(), m.end())
    c = P.cite(a, b)
    if not rec_rx.search(str(c['record'] or '')): continue
    if any(x - 300 <= a <= y + 300 for x, y in cov): continue
    ctx = P.ntext[max(0, m.start() - W):m.end() + W]
    k = (c['record'], ctx[:50])
    if k in seen: continue
    seen.add(k); n += 1
    print('[%s p.%s @%d] ...%s<<%s>>%s...' % (c['record'], c['page'], a, P.ntext[max(0, m.start() - W):m.start()], m.group(0), P.ntext[m.end():m.end() + W]))
print('#### %d uncited hour statements' % n)

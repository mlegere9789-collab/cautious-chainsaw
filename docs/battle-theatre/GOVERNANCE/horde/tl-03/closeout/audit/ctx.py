"""Context of stored citations: python3 -I tmp/tl-03/audit/ctx.py T1-116 g_1155 [more keys] [--before 300] [--after 600]
Reads the raw text file of the citation at its stored offset and prints the quote with text around it (whitespace collapsed)."""
import os, sys, json, re
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
G = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE')
args = sys.argv[1:]
B, A = 300, 600
for flag, name in (('--before', 'B'), ('--after', 'A')):
    if flag in args:
        i = args.index(flag); v = int(args[i + 1]); del args[i:i + 2]
        if name == 'B': B = v
        else: A = v
rid = args[0]
rows = {json.loads(l)['id']: json.loads(l) for l in open(os.path.join(G, 'timeline_corrections', 'tl-03.jsonl'), encoding='utf-8')}
r = rows[rid]
cites = {c['key']: c for c in r['citations']}
_raw = {}
def collapse(s): return re.sub(r'\s+', ' ', s)
for k in (args[1:] or list(cites)):
    c = cites[k]
    p = os.path.join(ROOT, c['source_file'])
    if p not in _raw: _raw[p] = open(p, encoding='utf-8', newline='').read()
    t = _raw[p]
    a, b = c['text_offset'], c['text_offset_end']
    print('=== %s %s %s p.%s @%d-%d' % (rid, k, c['source_id'], c.get('printed_page'), a, b))
    print('BEFORE: ...' + collapse(t[max(0, a - B):a]))
    print('QUOTE : [[' + collapse(t[a:b]) + ']]')
    print('AFTER : ' + collapse(t[b:b + A]) + '...')

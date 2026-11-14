"""Show the raw source text around a citation of the corrections file.
usage: python3 -I ctx.py T1-001 c3 [before=300] [after=300]
       python3 -I ctx.py T1-001 all [before=200] [after=200]      (all citations of the row)
Prints the raw slice with the quote marked >>> <<< ; newlines shown as spaces."""
import json, sys, re, os
ROOT = '/home/user/cautious-chainsaw'
G = ROOT + '/docs/battle-theatre/GOVERNANCE'
corr = {}
for l in open(G + '/timeline_corrections/tl-01.jsonl', encoding='utf-8'):
    r = json.loads(l); corr[r['id']] = r
_cache = {}
def raw(path):
    if path not in _cache:
        _cache[path] = open(os.path.join(ROOT, path), encoding='utf-8', newline='').read()
    return _cache[path]
def show(rid, key, before, after):
    r = corr[rid]
    c = [x for x in r['citations'] if x['key'] == key][0]
    t = raw(c['source_file'])
    a, b = c['text_offset'], c['text_offset_end']
    s = t[max(0, a - before):a] + ' >>> ' + t[a:b] + ' <<< ' + t[b:b + after]
    s = re.sub(r'\s+', ' ', s)
    print('--- %s %s [%s %s p.%s off %d-%d]' % (rid, key, c['source_id'], c.get('report_id') or '', c.get('printed_page'), a, b))
    print(s)
if __name__ == '__main__':
    rid = sys.argv[1]; key = sys.argv[2]
    before = int(sys.argv[3]) if len(sys.argv) > 3 else 300
    after = int(sys.argv[4]) if len(sys.argv) > 4 else 300
    keys = [c['key'] for c in corr[rid]['citations']] if key == 'all' else [key]
    for k in keys:
        show(rid, k, before, after)

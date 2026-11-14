"""Print sentences of given OR records matching a regex.  python3 -I rec.py PART RECID[,RECID] REGEX [width]"""
import sys, re, json
sys.path.insert(0, '/home/user/cautious-chainsaw/tmp/fence-3/scripts')
import lib
part = int(sys.argv[1]); rids = sys.argv[2].split(','); rx = re.compile(sys.argv[3], re.I); w = int(sys.argv[4]) if len(sys.argv) > 4 else 260
idx = {r['id']: r for r in json.load(open('/home/user/cautious-chainsaw/docs/battle-theatre/library/or27_index.json'))['records']}
t = lib.raw_or(part)
P = lib.OF.get_part(part)
for rid in rids:
    r = idx[rid]
    s0, e0 = r['start_offset'], r['end_offset']
    seg = t[s0:e0]
    print('==', rid, r.get('rank'), r.get('author'), '|', (r.get('unit_scope') or '')[:50], '| pages', r['start_page'], '-', r['end_page'])
    for m in rx.finditer(seg):
        a = max(0, m.start() - w); b = min(len(seg), m.end() + w)
        off = s0 + m.start()
        pg = P.pm.page_at(off)
        print('  [p.%s off %d] ...%s<<%s>>%s...' % (pg['page'], off, ' '.join(seg[a:m.start()].split()), ' '.join(m.group(0).split()), ' '.join(seg[m.end():b].split())))

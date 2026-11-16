"""Generate extended verbatim quotes for citations of timeline_corrections/tl-03.jsonl, cut from the SAME normalised view the builder matches
against (tools/bt/or27_lib.build_nview: line-break hyphenation joined, running heads blanked for the Official Records), so every generated
quote is a substring of that view by construction.
SPEC rows: (row, key, before_start, after_end); NEW rows: (row, new_key, base, start phrase, end phrase), base = (row, key) of an existing
citation near the passage, or ('RAW', path, raw offset).
Writes tmp/tl-03/rev/ext_out.json and prints a report.   python3 -I mkext.py"""
import json, re, sys, os, bisect
ROOT = '/home/user/cautious-chainsaw/'
G = ROOT + 'docs/battle-theatre/GOVERNANCE/'
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT + 'tools/bt')
import or27_find as F
import kit_or27_leafmap as KL
from or27_lib import build_nview, norm_query
rows = {}
for l in open(G + 'timeline_corrections/tl-03.jsonl'):
    o = json.loads(l); rows[o['id']] = o
exec(open(os.path.join(HERE, 'spec_ext.py')).read())   # SPEC, NEW
PARTS = {'cu31924077699761': 1, 'cu31924077728255': 2, 'cu31924077700262': 3}
_lib = {}
def view(c):
    """(ntext, nmap) of the text a citation lives in, as the builder sees it"""
    if c['source_id'] == 'OR27':
        P = F.get_part(c['part']); return P.ntext, P.nmap
    p = ROOT + c['source_file']
    if p not in _lib:
        raw = open(p, encoding='utf-8', newline='').read()
        _lib[p] = build_nview(raw)
    return _lib[p]
def locate(c, nt, nm):
    q = norm_query(c['quote'])
    i = nt.find(q); best = None
    while i >= 0:
        if nm[i] == c['text_offset']: return i, i + len(q)
        if best is None: best = (i, i + len(q))
        i = nt.find(q, i + 1)
    if best is None: raise SystemExit('old quote of %s not found in the normalised view' % c['key'])
    return best
out = {}; bad = 0
for rid, key, bs, ae in SPEC:
    c = [x for x in rows[rid]['citations'] if x['key'] == key][0]
    nt, nm = view(c)
    a, b = locate(c, nt, nm)
    ns, ne = a, b
    if bs:
        i = nt.rfind(bs, max(0, a - 3000), a + len(bs))
        if i < 0 or i > a: print('!! %s %s: before_start %r not found before the quote' % (rid, key, bs)); bad += 1; continue
        ns = i
    if ae:
        i = nt.find(ae, a, b + 3000)
        if i < 0: print('!! %s %s: after_end %r not found after the quote start' % (rid, key, ae)); bad += 1; continue
        ne = max(ne, i + len(ae))
    newq = nt[ns:ne]
    out.setdefault(rid, {})[key] = newq
    print('== %s %s  (%d -> %d chars)\n   OLD: %s\n   NEW: %s' % (rid, key, b - a, len(newq), nt[a:b][:140], newq))
newout = []
for rid, nkey, base, sp, ep in NEW:
    if base[0] == 'FIND':      # a whole library text: the start phrase must occur exactly once
        c = dict(source_file=base[1], source_id=base[2], part=None, report_id=None, quote='', key='find', text_offset=0)
        nt, nm = view(c)
        ca = nt.find(sp)
        if ca < 0 or nt.count(sp) != 1: print('!! NEW %s %s: start phrase occurs %d times' % (rid, nkey, nt.count(sp))); bad += 1; continue
    elif base[0] == 'RAW':
        c = dict(source_file=base[1], text_offset=base[2], source_id='OR27', part=PARTS[os.path.basename(base[1]).split('_')[0]], report_id=None, quote='', key='raw')
        nt, nm = view(c)
        ca = bisect.bisect_left(list(nm), base[2])
    else:
        c = [x for x in rows[base[0]]['citations'] if x['key'] == base[1]][0]
        nt, nm = view(c)
        a, b = locate(c, nt, nm); ca = a
    cands = [m.start() for m in re.finditer(re.escape(sp), nt) if abs(m.start() - ca) < 4000 or base[0] == 'FIND']
    if not cands: print('!! NEW %s %s: start phrase not found near the base' % (rid, nkey)); bad += 1; continue
    i = min(cands, key=lambda x: abs(x - ca))
    j = nt.find(ep, i)
    if j < 0 or j - i > 3000: print('!! NEW %s %s: end phrase not found' % (rid, nkey)); bad += 1; continue
    q = nt[i:j + len(ep)]
    raw_a = int(nm[i]); raw_b = int(nm[j + len(ep) - 1]) + 1
    page = None
    if c['source_id'] == 'OR27':
        lm = KL.load(c['part']); la = lm.at(raw_a); lb = lm.at(raw_b - 1)
        page = str(la['page']) if la['page'] == lb['page'] else '%s-%s' % (la['page'], lb['page'])
    print('== NEW %s %s (base %s) src=%s page=%s raw %d-%d\n   %s' % (rid, nkey, base[:2], c['source_id'], page, raw_a, raw_b, q))
    newout.append(dict(row=rid, key=nkey, base=[str(x) for x in base], source_id=c['source_id'], report_id=c.get('report_id'), part=c.get('part'), page=page, quote=q))
out['NEW'] = newout
json.dump(out, open(os.path.join(HERE, 'ext_out.json'), 'w'), indent=1, ensure_ascii=False)
print('bad', bad, 'ext', len(SPEC), 'new', len(NEW))

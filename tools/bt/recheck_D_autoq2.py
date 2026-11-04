"""Add a short verified extract carrying the printed time phrase for claims whose when.printed is not inside their quotes.
python -I tools/bt/recheck_D_autoq2.py [--apply]   (prints one line per claim; --apply merges q2 into positions_D_recheck.json)"""
import os, sys, re, json, glob, bisect, collections, importlib.util
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import positions_build as B
from or27_lib import ROOT, norm_query
cl = [json.loads(l) for l in open(os.path.join(B.OUTDIR, 'positions_D.jsonl'), encoding='utf-8')]
mods = sorted(glob.glob(os.path.join(ROOT, 'tools', 'bt', 'positions_D', '*.py')))
perunit = collections.Counter(); ANCH = {}
for m in mods:
    spec = importlib.util.spec_from_file_location('pa_' + os.path.basename(m)[:-3], m)
    mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
    for c in mod.CLAIMS:
        perunit[c['u']] += 1
        ANCH['PD-%s-%02d' % (c['u'].replace('cs-', ''), perunit[c['u']])] = c
def n(s): return re.sub(r'\s+', ' ', (s or '')).lower()
rk = json.load(open(os.path.join(ROOT, 'tools', 'bt', 'positions_D_recheck.json'), encoding='utf-8'))
out = {}
for c in cl:
    p = c['when'].get('printed')
    if not p or c['tier'] != 'documented': continue
    ex = ' '.join([c['source'].get('quote') or ''] + c['source'].get('additional_quotes', []))
    if n(p) in n(ex): continue
    a = ANCH.get(c['claim_id'])
    rec = c['source']['report_id']
    if not a:  # split claims are not in ANCH under that id
        print('NOANCH', c['claim_id']); continue
    snip = a['a'] or a['q']
    got = B.find_in_record(rec, snip, a['nth'])
    P, os_, oe, cite, cnt, ns_, ne_, ra, rb = got
    seg = P.ntext[max(ra, ns_ - 900):min(rb, ne_ + 900)]
    base = max(ra, ns_ - 900)
    i = seg.lower().find(p.lower())
    if i < 0:
        print('NOTFOUND', c['claim_id'], repr(p)); continue
    pos = base + i
    dist = pos - ns_ if pos < ns_ else (pos - ne_ if pos > ne_ else 0)
    # window of <= 14 words around the phrase
    words = []
    full = P.ntext
    s0 = pos
    while s0 > 0 and len(full[s0 - 1:pos].split()) < 5: s0 -= 1
    # move to a word boundary
    while s0 > 0 and full[s0 - 1] != ' ': s0 -= 1
    e0 = pos + len(p)
    while e0 < len(full) and len(full[s0:e0].split()) < 13: e0 += 1
    while e0 < len(full) and full[e0] != ' ': e0 += 1
    win = full[s0:e0].strip()
    while len(win.split()) > 14: win = ' '.join(win.split()[:-1])
    if n(p) not in n(win): win = p
    ok = bool(B.find_in_record(rec, win)) and B.F.verify(win, (B.IDX[rec]['part'],))
    out[c['claim_id']] = (win, ok, dist, p)
    print('%-34s dist=%5d ok=%s | %r | %r' % (c['claim_id'], dist, ok, p, win))
if '--apply' in sys.argv:
    p_ = os.path.join(ROOT, 'tools', 'bt', 'positions_D_recheck.json')
    for cid, (win, ok, dist, p) in out.items():
        if not ok: continue
        d = rk.setdefault(cid, {})
        q2 = d.get('q2', [])
        if win not in q2: q2.append(win)
        d['q2'] = q2
    json.dump(rk, open(p_, 'w', encoding='utf-8', newline='\n'), ensure_ascii=False, indent=1)
    print('applied', sum(1 for v in out.values() if v[1]))

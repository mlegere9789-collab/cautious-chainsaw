"""Reading aid for the scope D full-passage re-check (not a verifier).
python -I tools/bt/recheck_D_view.py PD-id [PD-id ...] [--r 1200]   prints each claim and the normalised OR text 1200+ chars before/after its anchor
(running heads removed, hyphenation joined; windows of claims in one record are merged; the anchor is marked with  <<cid ... >>)."""
import os, sys, json, glob, importlib.util, collections, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import positions_build as B
from or27_lib import ROOT
R = 1200
args = [a for a in sys.argv[1:]]
if '--r' in args:
    i = args.index('--r'); R = int(args[i + 1]); del args[i:i + 2]
mods = sorted(glob.glob(os.path.join(ROOT, 'tools', 'bt', 'positions_D', '*.py')))
perunit = collections.Counter(); ANCH = {}
for m in mods:
    spec = importlib.util.spec_from_file_location('pv_' + os.path.basename(m)[:-3], m)
    mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
    for c in mod.CLAIMS:
        perunit[c['u']] += 1
        ANCH['PD-%s-%02d' % (c['u'].replace('cs-', ''), perunit[c['u']])] = c
CL = {}
for l in open(os.path.join(B.OUTDIR, 'positions_D.jsonl'), encoding='utf-8'):
    o = json.loads(l); CL[o['claim_id']] = o
byrec = collections.OrderedDict()
for cid in args:
    c = CL[cid]
    byrec.setdefault(c['source'].get('report_id'), []).append(cid)
for rec, cids in byrec.items():
    print('=' * 100); print('RECORD', rec, (B.IDX.get(rec) or {}).get('title') if rec else '')
    spans = []
    for cid in cids:
        c = CL[cid]; a = ANCH[cid]; s = c['source']; w = c['when']; p = c['place']
        print('-' * 80)
        print(cid, c['kind'], c['unit_id'], c['tier'], 'ocr_unc=%s' % c['ocr_uncertain'], 'pg', s.get('printed_page'), 'cf=%s' % c.get('conflicts_with'))
        print(' WHEN printed=%r desc=%r date=%s t=%s approx=%s basis=%s' % (w.get('printed'), w.get('description'), w.get('date'), w.get('t_iso'), w.get('approx'), 'PRINTED_BASIS' if w.get('printed_basis') else ''))
        print(' PLACE printed=%r desc=%r road=%r' % (p.get('printed'), p.get('description'), p.get('direction_or_road')))
        print(' ACT', c['activity'])
        print(' QUOTE', s.get('quote'), '| ADD', s.get('additional_quotes'))
        if c.get('note'): print(' NOTE', c['note'])
        if c['tier'] != 'documented': print(' INFER', c.get('inference'), c.get('searches_tried'))
        if c['tier'] == 'open gap' or not rec: continue
        snip = a['a'] or a['q']
        got = B.find_in_record(rec, snip, a['nth'])
        P, os_, oe, cite, cnt, ns_, ne_, ra, rb = got
        spans.append((max(ra, ns_ - R), min(rb, ne_ + R), ns_, ne_, cid, P))
    spans.sort()
    merged = []
    for sp in spans:
        if merged and sp[0] <= merged[-1][1]:
            m = merged[-1]; merged[-1] = [m[0], max(m[1], sp[1]), m[2] + [(sp[2], sp[3], sp[4])], sp[5]]
        else:
            merged.append([sp[0], sp[1], [(sp[2], sp[3], sp[4])], sp[5]])
    for lo, hi, anc, P in merged:
        txt = P.ntext[lo:hi]
        ins = []
        for s_, e_, cid in anc:
            ins.append((s_ - lo, '<<%s: ' % cid)); ins.append((e_ - lo, ' >>'))
        for pos, t in sorted(ins, key=lambda x: -x[0]):
            txt = txt[:pos] + t + txt[pos:]
        print('~' * 30, 'TEXT', lo, hi); print(txt)

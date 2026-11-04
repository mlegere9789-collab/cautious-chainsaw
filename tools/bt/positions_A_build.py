"""Rebuild docs/battle-theatre/history/positions/positions_A.jsonl (scope A, Official Records vol. 27) from the draft batches in
docs/battle-theatre/history/positions/draft_A/. Every quote is re-verified against the OR text with tools/bt/or27_find.verify inside the
named report record; an unverifiable claim is dropped and reported. Run: python -I tools/bt/positions_A_build.py"""
"""Build positions_A.jsonl from batch draft files (batches/*.py). Verifies quotes with or27_find.verify; fills page from the hit."""
import sys, os, re, json, glob, importlib.util
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'bt'))
import or27_find
from or27_find import verify, search
OUT = os.path.join(ROOT, 'docs', 'battle-theatre', 'history', 'positions', 'positions_A.jsonl')
SP = os.path.join(ROOT, 'docs', 'battle-theatre', 'history', 'positions', 'draft_A'); sys.path.insert(0, SP)
idx = {r['id']: r for r in json.load(open(os.path.join(ROOT, 'docs', 'battle-theatre', 'library', 'or27_index.json'), encoding='utf-8'))['records']}
units = {u['id'] for u in json.load(open(os.path.join(ROOT, 'docs', 'battle-theatre', 'history', 'units.json'), encoding='utf-8'))['units']}
gz = {p['id'] for p in json.load(open(os.path.join(ROOT, 'docs', 'battle-theatre', 'app', 'data', 'gazetteer.json'), encoding='utf-8'))['places']}
KINDS = {'arrival_road','march','position','engagement','movement','night_position','departure','strength_note'}
def pages_from(cite):
    pg = cite.split(', p. ', 1)[1] if ', p. ' in cite else ''
    interp = '~' in pg
    nums = [int(x) for x in re.findall(r'\d+', pg)]
    if not nums: return None, True
    if interp:
        lohi = re.findall(r'\((\d+)-(\d+)\)', pg)
        lo = min(int(a) for a, b in lohi); hi = max(int(b) for a, b in lohi)
        return ('%d-%d' % (lo, hi) if lo != hi else str(lo)), True
    a, b = min(nums), max(nums)
    return (str(a) if a == b else '%d-%d' % (a, b)), False
RC = os.path.join(SP, 'recheck')
def load_recheck():
    """Full-passage fidelity re-check decisions (draft_A/recheck/*.json): list of {id, fidelity, why, patch{short keys}, add[claim dicts]}."""
    dec = {}
    for f in sorted(glob.glob(RC + '/*.json')):
        for e in json.load(open(f, encoding='utf-8')):
            if e['id'] in dec: raise SystemExit('duplicate recheck decision ' + e['id'])
            dec[e['id']] = e
    return dec
def hit_in(rid, hits):
    return [h for h in hits if h['record'] == rid]
def main():
    # usage: positions_A_build.py [--out PATH] [--tag T1,T2]   (--tag: print only errors of those batches; --out: write elsewhere, e.g. to validate a recheck file)
    argv = sys.argv[1:]; outp = OUT; tagf = None
    if '--out' in argv: outp = argv[argv.index('--out') + 1]
    if '--tag' in argv: tagf = set(argv[argv.index('--tag') + 1].split(','))
    out = []; labels = {}; errs = []; seenq = {}
    dec = load_recheck(); used = set()
    for f in sorted(glob.glob(SP + '/b*.py')):
        spec = importlib.util.spec_from_file_location('b', f); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
        work = []
        for i, c in enumerate(m.CLAIMS, 1):
            cid = 'POS-A-%s-%03d' % (m.TAG, i)
            work.append((cid, '%s#%d' % (os.path.basename(f), i), c, dec.get(cid)))
            if cid in dec: used.add(cid)
            for k, ac in enumerate((dec.get(cid) or {}).get('add', []), 2):
                work.append(('%s-s%d' % (cid, k), '%s#%d(split %d)' % (os.path.basename(f), i, k), dict(ac), {'fidelity': 'corrected', 'why': 'split from %s: one claim per report' % cid, 'split': True}))
        for cid, where, c, dc in work:
            where = '[%s] %s' % (m.TAG, where)
            try:
                if dc and not dc.get('split'):
                    c = dict(c)
                    for k, v in (dc.get('patch') or {}).items():
                        if k == 'note_add': c['note'] = (c.get('note', '') + ' ' + v).strip()
                        else: c[k] = v
                    if c.get('tier', 'documented') != 'documented': c['csv'] = False
                    if dc['fidelity'] in ('corrected', 'downgraded') and dc.get('why'):
                        c['note'] = (c.get('note', '') + ' RECHECK (%s): %s' % (dc['fidelity'], dc['why'])).strip()
                elif dc and dc.get('split'):
                    c['note'] = (c.get('note', '') + ' RECHECK (corrected): ' + dc['why']).strip()
                if c.get('cr'): c['close_reading'] = True
                if c.get('tier', 'documented') == 'documented' and c.get('close_reading') and not c.get('q'): c['csv'] = True
                if c['u'] not in units: raise ValueError('unit id unknown ' + c['u'])
                if c['k'] not in KINDS: raise ValueError('kind ' + c['k'])
                if c.get('gz') and c['gz'] not in gz: raise ValueError('gz ' + c['gz'])
                if c.get('tier') == 'open gap':
                    out.append({'claim_id': cid, 'unit_id': c['u'], 'kind': c['k'], 'when': {'printed': None, 'date': c.get('d'), 't_iso': None, 'approx': False},
                        'place': {'printed': None, 'gazetteer_ref': None, 'direction_or_road': None}, 'activity': c['act'],
                        'source': {'report_id': None, 'author': None, 'printed_page': None, 'interpolated': None, 'quote': None, 'cite': None, 'work': 'OR Ser. I vol. 27'},
                        'tier': 'open gap', 'render_flag': None, 'weak_source': False, 'claim_support_verified': False, 'ocr_uncertain': False,
                        'conflicts_with': [], 'note': c.get('note', ''), '_cf_labels': [],
                        'fidelity_check': 'not_rechecked',
                        'fidelity_note': 'open gap, no cited passage to read; reader re-ran the recorded searches: ' + ((dc or {}).get('why') or 'not re-run')})
                    continue
                rid = 'OR27-%s-%s' % (('3' if c['r'].startswith('D') else ('2' if c['r'][0] == 'S' else '1')), c['r']) if not c['r'].startswith('OR27') else c['r']
                if rid not in idx: raise ValueError('record ' + rid)
                rec = idx[rid]
                q = c.get('q'); anchor = c.get('anchor')
                pg = None; interp = True; cite = None
                if q:
                    if len(q.split()) >= 15: raise ValueError('quote >= 15 words: ' + q[:60])
                    hs = hit_in(rid, verify(q, (rec['part'],)))
                    if not hs: raise ValueError('quote NOT FOUND in %s: %r' % (rid, q))
                    pg, interp = pages_from(hs[0]['cite']); cite = hs[0]['cite']
                    if q in seenq and seenq[q] != cid: errs.append('%s quote reused (also %s)' % (where, seenq[q]))
                    seenq[q] = cid
                elif anchor:
                    if len(anchor.split()) >= 15: raise ValueError('anchor >= 15 words: ' + anchor[:50])
                    hs = hit_in(rid, verify(anchor, (rec['part'],)))
                    if not hs: raise ValueError('anchor NOT FOUND ' + anchor)
                    pg, interp = pages_from(hs[0]['cite']); cite = hs[0]['cite']
                else:
                    a, b = rec['start_page'], rec['end_page']
                    pg = str(a) if a == b else '%d-%d' % (a, b); interp = True
                    cite = 'whole record pp. %s' % pg
                tier = c.get('tier', 'documented')
                if tier == 'documented' and not q and not c.get('close_reading'): raise ValueError('documented without quote or close_reading')
                t_iso = c.get('t')
                if t_iso and not re.fullmatch(r'1863-0[67]-\d\dT\d\d:\d\d', t_iso): raise ValueError('t_iso format ' + t_iso)
                d = {
                    'claim_id': cid, 'unit_id': c['u'], 'kind': c['k'],
                    'when': {'printed': c.get('w'), 'date': c.get('d', '1863-07-01'), 't_iso': t_iso, 'approx': bool(c.get('ap', False))},
                    'place': {'printed': c.get('pp'), 'gazetteer_ref': c.get('gz'), 'direction_or_road': c.get('rd')},
                    'activity': c['act'],
                    'source': {'report_id': rid, 'author': ('%s %s' % (rec.get('rank') or '', rec.get('author') or '')).strip(),
                               'printed_page': pg, 'interpolated': interp, 'quote': q, 'cite': cite, 'work': 'OR Ser. I vol. 27 pt. %d' % rec['part']},
                    'tier': tier, 'render_flag': {'documented': 0, 'inferred': 1}.get(tier),
                    'weak_source': False, 'claim_support_verified': bool(c.get('csv', bool(q))),
                    'ocr_uncertain': bool(c.get('ocr', False)),
                    'conflicts_with': list(c.get('cf', [])), 'note': c.get('note', ''),
                }
                d['source']['record_id'] = rid
                d['source']['extract'] = anchor if (anchor and not q) else None
                d['flag_single_source'] = (tier == 'documented')
                if tier == 'inferred': d['reasoning'] = c.get('why', '')
                if c.get('lbl'): labels[c['lbl']] = cid
                d['_cf_labels'] = list(c.get('cf', []))
                if c.get('wd'): d['when']['description'] = c['wd']
                fid = (dc or {}).get('fidelity')
                if fid is None: errs.append('%s: NO recheck decision (fidelity_check not_rechecked)' % where); fid = 'not_rechecked'
                if fid not in ('passed_full_read', 'corrected', 'downgraded', 'not_rechecked'): raise ValueError('fidelity value ' + str(fid))
                if fid == 'passed_full_read' and tier != 'documented': raise ValueError('passed_full_read on a non-documented claim')
                if fid == 'downgraded' and tier == 'documented' and not dc.get('keep_documented'): raise ValueError('downgraded but still documented')
                d['fidelity_check'] = fid
                d['fidelity_note'] = (dc or {}).get('why') or ''
                d['claim_support_verified'] = fid in ('passed_full_read', 'corrected')
                out.append(d)
            except Exception as e:
                errs.append('%s: %s' % (where, e))
    for x in dec:
        if x not in used: errs.append('recheck decision for unknown claim id ' + x)
    for d in out:
        d['conflicts_with'] = [labels.get(x, x) for x in d.pop('_cf_labels')]
        bad = [x for x in d['conflicts_with'] if not (x.startswith('POS-') or re.match(r'C-\d+', x))]
        if bad: errs.append('%s unresolved conflict labels %s' % (d['claim_id'], bad))
    byid = {d['claim_id']: d for d in out}
    for d in out:
        for x in d['conflicts_with']:
            if x in byid and d['claim_id'] not in byid[x]['conflicts_with']: byid[x]['conflicts_with'].append(d['claim_id'])
    if tagf: errs = [e for e in errs if (re.match(r'\[(\w+)\]', e) and re.match(r'\[(\w+)\]', e).group(1) in tagf) or (re.search(r'POS-A-(\w+?)-\d', e) and re.search(r'POS-A-(\w+?)-\d', e).group(1) in tagf)]
    if errs:
        print(chr(10).join(errs)); print('ERRORS: %d (claims with a bad quote/field are NOT written; missing-decision and label errors still write)' % len(errs))
    with open(outp, 'w', encoding='utf-8', newline='\n') as f:
        for d in out: f.write(json.dumps(d, ensure_ascii=False) + '\n')
    print('wrote %d claims' % len(out))
if __name__ == '__main__': main()

"""Build docs/battle-theatre/history/positions/positions_C.jsonl from the claim specs in tools/bt/pos_C/specs_*.py.

SCOPE C = Union V Corps, VI Corps, Artillery Reserve, army headquarters and staff. Official Records Ser. I vol. 27 only.
Every spec names an index record and a verbatim anchor phrase `q` (< 15 words, copied from the normalized OR text). The build
locates the anchor BY CODE inside that record (so a wrong citation aborts the build), computes the printed page (or the interpolated
range) and verifies the quote with or27_find.verify(). Nothing is typed from memory: the anchor IS the quote.
Spec fields: see C() below. Run:  PYTHONIOENCODING=utf-8 python -I tools/bt/positions_C_build.py
"""
import os, re, sys, json, bisect, glob, importlib.util
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import or27_find as F
from or27_lib import ROOT, INDEX_PATH, utf8_stdout
utf8_stdout()
OUT = os.path.join(ROOT, 'docs', 'battle-theatre', 'history', 'positions', 'positions_C.jsonl')
SPECDIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pos_C')
RECS = {r['id']: r for r in json.load(open(INDEX_PATH, encoding='utf-8'))['records']}
UNITS = {u['id']: u for u in json.load(open(os.path.join(ROOT, 'docs', 'battle-theatre', 'history', 'units.json'), encoding='utf-8'))['units']}
KINDS = {'arrival_road', 'march', 'position', 'engagement', 'movement', 'night_position', 'departure', 'strength_note'}
errors = []


def rid(short):
    return short if short.startswith('OR27-') else 'OR27-1-' + short


def C(unit, kind, rec, q, printed, date, t=None, approx=False, place=None, gz=None, road=None, act='', tier='documented',
      key=None, conflicts=(), ocr=False, note='', reasoning=None, auth=None, quote=True):
    """One claim. printed = time phrase as printed; t = 'HH:MM' only if a clock time is printed; place = verbatim place phrase."""
    return dict(unit=unit, kind=kind, rec=rid(rec), q=q, printed=printed, date=date, t=t, approx=approx, place=place, gz=gz, road=road,
                act=act, tier=tier, key=key, conflicts=list(conflicts), ocr=ocr, note=note, reasoning=reasoning, auth=auth, quote=quote, gap=None)


def GAP(unit, kind, what, searches, note='', key=None, conflicts=()):
    """Open gap: the OR passage that would answer was not found. `searches` = list of targeted searches tried."""
    return dict(unit=unit, kind=kind, rec=None, q=None, gap=dict(what=what, searches=list(searches)), tier='open gap', printed=None, date=None,
                t=None, approx=False, place=None, gz=None, road=None, act=what, key=key, conflicts=list(conflicts), ocr=False, note=note,
                reasoning=None, auth=None, quote=False)


def locate(recid, q):
    r = RECS[recid]
    P = F.get_part(r['part'])
    a = bisect.bisect_left(P.nmap, r['start_offset'])
    b = bisect.bisect_left(P.nmap, r['end_offset'])
    nq = re.sub(r'\s+', ' ', q.strip())
    i = P.ntext.find(nq, a, b)
    if i < 0:
        return None
    s, e = i, i + len(nq)
    os_, oe = P.orig_span(s, e)
    return P, P.cite(os_, oe), nq, os_, oe


AUTHOR = {}
_ap = os.path.join(SPECDIR, 'authors.json')
if os.path.exists(_ap):
    AUTHOR = json.load(open(_ap, encoding='utf-8'))
_fp = os.path.join(SPECDIR, 'authors_fix.json')
if os.path.exists(_fp):
    AUTHOR.update(json.load(open(_fp, encoding='utf-8')))


def build():
    specs = []
    for fn in sorted(glob.glob(os.path.join(SPECDIR, 'specs_*.py'))):
        spec = importlib.util.spec_from_file_location(os.path.basename(fn)[:-3], fn)
        m = importlib.util.module_from_spec(spec)
        m.C, m.GAP = C, GAP
        spec.loader.exec_module(m)
        for s in (getattr(m, 'SPECS', None) or m.S):
            s['_file'] = os.path.basename(fn)
            specs.append(s)
    # fidelity re-check (2026-10-20): pos_C/fid/fid_*.py each define OK (claim ids read in full and faithful, whitespace separated string),
    # FIX {claim_id: {'check': 'corrected'|'downgraded'|'passed_full_read', 'note': what changed, 'set': {'activity': .., 'when.printed': ..}}}
    # and EXTRA (new claims made by splitting; appended after all specs so existing claim ids stay stable).
    FID = {}
    STRIP = set()
    PATCH = {}
    for fn in sorted(glob.glob(os.path.join(SPECDIR, 'fid', 'fid_*.py'))):
        spec = importlib.util.spec_from_file_location(os.path.basename(fn)[:-3], fn)
        m = importlib.util.module_from_spec(spec)
        m.C, m.GAP = C, GAP
        spec.loader.exec_module(m)
        nid = lambda x: 'POS-C-%04d' % int(x) if re.match(r'^\d{1,4}$', str(x)) else x
        for cid in map(nid, getattr(m, 'OK', '').split()):
            if cid in FID:
                errors.append('fid: claim checked twice: ' + cid)
            FID[cid] = {'check': 'passed_full_read', 'note': '', 'set': {}}
        for cid, f in ((nid(k), v) for k, v in getattr(m, 'FIX', {}).items()):
            if cid in FID:
                errors.append('fid: claim checked twice: ' + cid)
            FID[cid] = dict(f, set=f.get('set', {}))
        for s in getattr(m, 'EXTRA', []):
            s['_file'] = os.path.basename(fn)
            specs.append(s)
        for cid in map(nid, getattr(m, 'STRIP_TISO', '').split()):
            STRIP.add(cid)
        for cid, pt in ((nid(k), v) for k, v in getattr(m, 'PATCH', {}).items()):
            PATCH[cid] = pt
        for cid, why in ((nid(k), v) for k, v in getattr(m, 'SKIPPED', {}).items()):
            FID[cid] = {'check': 'not_rechecked', 'note': why, 'set': {}}
    for cid, pt in PATCH.items():
        if cid not in FID:
            errors.append('fid: PATCH for an unchecked claim ' + cid)
            continue
        f0 = FID[cid]
        if f0['check'] == 'passed_full_read':
            f0['check'] = 'corrected'
        f0['note'] = (f0['note'] + ' ' if f0['note'] else '') + pt['note']
        f0['set'] = dict(f0['set'], **pt['set'])
    keys = {}
    claims = []
    for n, s in enumerate(specs, 1):
        cid = 'POS-C-%04d' % n
        if s['key']:
            if s['key'] in keys:
                errors.append('duplicate key ' + s['key'])
            keys[s['key']] = cid
        s['_cid'] = cid
    EXTRA_IDS = {s['_cid'] for s in specs if s['_file'].startswith('fid_')}
    for s in specs:
        cid = s['_cid']
        u = s['unit']
        if u not in UNITS:
            errors.append('%s: unknown unit %s' % (cid, u))
        if s['kind'] not in KINDS:
            errors.append('%s: bad kind %s' % (cid, s['kind']))
        conf = [keys.get(k, k) for k in s['conflicts']]
        for k in s['conflicts']:
            if k not in keys and not re.match(r'C-\d+', k):
                errors.append('%s: unknown conflict key %s' % (cid, k))
        d = {'claim_id': cid, 'unit_id': u, 'unit_name': UNITS.get(u, {}).get('name'), 'kind': s['kind']}
        if s['tier'] == 'open gap':
            d.update({'when': {'printed': None, 'date': None, 't_iso': None, 'approx': False},
                      'place': {'printed': None, 'gazetteer_ref': None, 'direction_or_road': None},
                      'activity': s['act'], 'source': {'report_id': None, 'author': None, 'printed_page': None, 'interpolated': False, 'quote': None},
                      'tier': 'open gap', 'render_flag': 2, 'weak_source': False, 'claim_support_verified': False, 'ocr_uncertain': False,
                      'conflicts_with': conf, 'gap': s['gap'], 'note': s['note']})
            claims.append(d)
            continue
        got = locate(s['rec'], s['q'])
        if got is None:
            errors.append('%s: ANCHOR NOT FOUND in %s: %r' % (cid, s['rec'], s['q'][:80]))
            continue
        P, c, nq, os_, oe = got
        words = len(nq.split())
        quote = None
        if s['quote']:
            if words >= 15:
                errors.append('%s: QUOTE TOO LONG (%d words): %s' % (cid, words, nq[:60]))
            v = F.verify(nq, (P.part,))
            if not any(h['start'] <= os_ and h['end'] >= oe - 1 for h in v):
                errors.append('%s: QUOTE NOT VERIFIED: %s' % (cid, nq[:60]))
            quote = nq
        rec = RECS[s['rec']]
        page = c['page']
        interp = '~' in page
        ocr_grade = rec['ocr']['grade']
        t_iso = '%sT%s' % (s['date'], s['t']) if s['t'] else None
        author = s['auth'] or AUTHOR.get(s['rec'].split('-')[-1]) or ((rec.get('rank') or '') + ' ' + (rec.get('author') or '')).strip()
        tier = s['tier']
        d.update({
            'when': {'printed': s['printed'], 'date': s['date'], 't_iso': t_iso, 'approx': bool(s['approx'])},
            'place': {'printed': s['place'], 'gazetteer_ref': s['gz'], 'direction_or_road': s['road']},
            'activity': s['act'],
            'source': {'report_id': s['rec'], 'author': author, 'printed_page': page, 'interpolated': interp, 'quote': quote},
            'tier': tier, 'render_flag': {'documented': 0, 'inferred': 1}.get(tier, 2),
            'weak_source': False, 'flag_single_source': True,
            'claim_support_verified': bool(quote) and tier == 'documented',
            'ocr_uncertain': bool(s['ocr']) or ocr_grade == 'poor',
            'conflicts_with': conf, 'note': s['note'] + (' [record OCR grade: poor]' if ocr_grade == 'poor' else ''),
        })
        if s['reasoning']:
            d['reasoning'] = s['reasoning']
        if tier == 'inferred' and not s['reasoning']:
            errors.append('%s: inferred without reasoning' % cid)
        if tier == 'documented' and not quote:
            errors.append('%s: documented without quote' % cid)
        claims.append(d)
    for c in claims:
        f = FID.get(c['claim_id'])
        if f is None:
            if c['tier'] == 'open gap':
                c['fidelity_check'] = 'not_rechecked'
                c['fidelity_note'] = 'open gap: no cited passage to re-read; the gap text and its search list are unchanged'
                continue
            if c['claim_id'] in EXTRA_IDS:
                f = {'check': 'corrected', 'note': 'new claim made by splitting a merged claim; own quote verified by code', 'set': {}}
            else:
                f = {'check': 'not_rechecked', 'note': 'not reached in the re-check', 'set': {}}
        for path, val in f['set'].items():
            tgt = c
            parts = path.split('.')
            for p_ in parts[:-1]:
                tgt = tgt[p_]
            tgt[parts[-1]] = val
        if f['set'].get('tier') in ('inferred', 'open gap'):
            c['render_flag'] = {'inferred': 1, 'open gap': 2}[c['tier']]
            if c['tier'] == 'inferred' and not c.get('reasoning'):
                errors.append('%s: downgraded to inferred without reasoning' % c['claim_id'])
        if c['claim_id'] in STRIP:
            # date digit OCR-damaged or not printed in the passage: the hour stays in when.printed, no t_iso is asserted
            c['when']['t_iso'] = None
            c['ocr_uncertain'] = True
            d0 = c['when'].get('description') or ''
            if not d0.startswith('OCR glyph only'):
                c['when']['description'] = 'OCR glyph only (date digit damaged or not printed in these sentences, so no t_iso is asserted): ' + d0
        c['fidelity_check'] = f['check']
        c['claim_support_verified'] = f['check'] in ('passed_full_read', 'corrected')
        if f.get('note'):
            c['fidelity_note'] = f['note']
    unknown = [k for k in FID if k not in {c['claim_id'] for c in claims}]
    if unknown:
        errors.append('fid: unknown claim ids %s' % unknown[:5])
    # conflicts are symmetric: both claims list each other (never resolved here)
    byid = {c['claim_id']: c for c in claims}
    for c in claims:
        for o in list(c['conflicts_with']):
            if o in byid and c['claim_id'] not in byid[o]['conflicts_with']:
                byid[o]['conflicts_with'].append(c['claim_id'])
    return claims


def main():
    claims = build()
    if errors:
        print('BUILD ERRORS (%d):' % len(errors))
        for e in errors:
            print('  ', e)
        if '--force' not in sys.argv:
            sys.exit(1)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
        for d in claims:
            f.write(json.dumps(d, ensure_ascii=False) + '\n')
    print('wrote %d claims -> %s' % (len(claims), OUT))


if __name__ == '__main__':
    main()

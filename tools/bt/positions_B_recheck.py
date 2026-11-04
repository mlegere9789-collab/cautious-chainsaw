"""Full-passage fidelity re-check of scope B (corps II, III, XII): decision applier and standalone validator.

Decisions live in tools/bt/positions_B_recheck_<CORPS>.json (dict claim_id -> decision; merged by positions_claims.py after the build and the
overrides), so a rebuild reproduces positions_B.jsonl. Readers write list files in docs/battle-theatre/history/positions/draft_B/recheck/*.json
(list of decisions with an "id" key); the lead merges them.

Decision keys (all optional except fc):
  fc      'passed_full_read' | 'corrected' | 'downgraded'
  why     short evidence line (passed: stored as fidelity_note; corrected/downgraded: appended to note as 'Re-check: ...')
  act     new activity text
  q       replacement verbatim quote (< 15 words, normalised OR text, found in the cited record; verified by code)
  q2      list of additional verbatim extracts (< 15 words each) from the same record (e.g. one holding the time phrase)
  wp      when.printed (null or a phrase that occurs inside the quote/extracts; if it lies in the passage but outside them an extract is added by code)
  wdesc   when.description ('time in a different sentence: "..." (where)', 'OCR glyph only: ...', 'compiler reading from order of events: ...', ...)
  date    'YYYY-MM-DD'; dbasis  when.date_basis (e.g. 'report context ...')
  t       'HH:MM' (24 h) or null (removes t_iso);  ap  approx bool;  mer  true = meridian inferred by the compiler
  pp      place.printed (words printed in the passage; '; ' separates several phrases; each must occur in the record near the anchor); null clears
  ppd     place.description (compiler description, not printed);  rd  direction_or_road (as printed, or null);  gz  gazetteer_ref or null
  ocr     ocr_uncertain bool
  tier    'inferred' with reasoning in 'reasoning' (documented -> inferred downgrade; the claim keeps its quote as the nearest text)
  add     list of new claims split off for a SECOND report: {k, rec, q, act, wp, wdesc, date, t, ap, pp, rd, gz, ocr, note, tier, reasoning, u (unit, default parent's)}
"""
import os, re, sys, json, copy, bisect

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import positions_lib as L
from positions_lib import BuildError, RECS, _norm, rec_slice, F
import positions_claims as PC

FC_ALL = ('passed_full_read', 'corrected', 'downgraded')
FC_OK = ('passed_full_read', 'corrected')
KINDS = PC.KINDS


def _norm_text(rec, text):
    """locate a phrase in the normalised record text; return (P, s, e) of the first match, or None"""
    P, a, b = rec_slice(rec)
    i = P.ntext.find(text, a, b)
    return (P, i, i + len(text)) if i >= 0 else None


def _verified_extract(rec, text, what):
    if len(text.split()) >= 15:
        raise BuildError('%s: extract of 15 or more words: %r' % (what, text[:60]))
    return PC._source_for(rec, re.escape(text), 0, True, None, None, None)


def _phrase_near(rec, phrase, anchor):
    """is the phrase (normalised, case-insensitive) in the record within 700 chars around the anchor text?"""
    P, a, b = rec_slice(rec)
    i = P.ntext.find(anchor, a, b)
    if i < 0:
        return False
    return _norm(phrase) in _norm(P.ntext[max(a, i - 700):min(b, i + len(anchor) + 700)])


def _extract_around(rec, anchor, phrase):
    """a <= 14-word extract of the record, near the anchor, that contains the phrase (case-sensitive text as printed)"""
    P, a, b = rec_slice(rec)
    i = P.ntext.find(anchor, a, b)
    lo, hi = max(a, i - 700), min(b, i + len(anchor) + 700)
    seg = P.ntext[lo:hi]
    j = seg.find(phrase)
    if j < 0:
        j = _norm(seg).find(_norm(phrase))
        if j < 0:
            return None
        return None
    toks = [(m.start(), m.end()) for m in re.finditer(r'\S+', seg)]
    ps, pe = j, j + len(phrase)
    first = next(k for k, (s, e) in enumerate(toks) if e > ps)
    last = max(k for k, (s, e) in enumerate(toks) if s < pe)
    n = last - first + 1
    if n > 14:
        return None
    room = 14 - n
    left = min(room // 2, first)
    f2 = first - left
    l2 = min(len(toks) - 1, last + (room - left))
    return seg[toks[f2][0]:toks[l2][1]]


def _extracts(o):
    s = o['source']
    return [s.get('quote') or ''] + list(s.get('additional_quotes') or [])


def _norm_cmp(x):
    return _norm(x)


def apply_one(o, r, errors):
    cid = o['claim_id']
    fc = r.get('fc')
    rec = o['source'].get('report_id')
    if o['tier'] == 'open gap':
        # open gaps have no cited passage: the searches are re-run and the result is recorded; fidelity_check stays not_rechecked
        if fc != 'not_rechecked' or not (r.get('why') or '').strip():
            errors.append('%s: an open gap takes fc not_rechecked and a why (result of the re-run searches)' % cid)
            return
        o['fidelity_check'] = 'not_rechecked'
        o['claim_support_verified'] = False
        o['fidelity_note'] = 'open gap: no cited passage; the recorded searches were re-run at the re-check'
        o['note'] = (o['note'] + ' | ' if o['note'] else '') + 'Re-check: ' + r['why'].strip()
        return
    if fc not in FC_ALL:
        errors.append('%s: bad fc %r' % (cid, fc))
        return
    if 'q' in r:
        try:
            src = PC._source_for(rec, re.escape(r['q']), 0, True, None, None, None)
            o['source'].update({'quote': src['quote'], 'printed_page': src['printed_page'], 'interpolated': src['interpolated']})
        except BuildError as ex:
            errors.append('%s: recheck quote bad: %s' % (cid, ex))
    for q2 in r.get('q2') or []:
        try:
            src = _verified_extract(rec, q2, cid)
            lst = o['source'].setdefault('additional_quotes', [])
            if q2 not in lst:
                lst.append(q2)
        except BuildError as ex:
            errors.append('%s: recheck extra quote bad: %s' % (cid, ex))
    if 'act' in r:
        o['activity'] = r['act']
    w = o['when']
    if 'date' in r:
        if not re.fullmatch(r'1863-0[67]-\d\d', r['date'] or ''):
            errors.append('%s: bad date %r' % (cid, r['date']))
        else:
            w['date'] = r['date']
    if 'wp' in r:
        wp = r['wp']
        if wp is not None:
            ex = _extracts(o)
            if not any(wp in x for x in ex):
                anchor = o['source'].get('quote') or ''
                if not _phrase_near(rec, wp, anchor):
                    errors.append('%s: recheck wp %r not found within 700 chars of the quote' % (cid, wp))
                else:
                    e = _extract_around(rec, anchor, wp)
                    if not e:
                        errors.append('%s: recheck wp %r found near the quote but not as exact text (case/spacing) or too long: give q2' % (cid, wp))
                    else:
                        try:
                            _verified_extract(rec, e, cid)
                            o['source'].setdefault('additional_quotes', []).append(e)
                        except BuildError as ex2:
                            errors.append('%s: auto extract for wp failed: %s' % (cid, ex2))
        w['printed'] = wp
    if 'wdesc' in r:
        if r['wdesc'] is None:
            w.pop('description', None)
        else:
            w['description'] = r['wdesc']
    if 'dbasis' in r:
        w['date_basis'] = r['dbasis']
    if 'ap' in r:
        w['approx'] = bool(r['ap'])
    if 'mer' in r:
        w['meridian_inferred'] = bool(r['mer'])
    if 't' in r:
        if r['t'] is None:
            w['t_iso'] = None
        elif not re.fullmatch(r'\d\d:\d\d', r['t']):
            errors.append('%s: bad t %r' % (cid, r['t']))
        else:
            w['t_iso'] = '%sT%s' % (w['date'], r['t'])
    p = o['place']
    if 'pp' in r:
        if r['pp']:
            anchor = o['source'].get('quote') or ''
            for ph in [x for x in r['pp'].split('; ') if x]:
                if not any(ph in x for x in _extracts(o)) and not _phrase_near(rec, ph, anchor):
                    errors.append('%s: recheck place phrase %r not within 700 chars of the quote' % (cid, ph))
        p['printed'] = r['pp']
    if 'ppd' in r:
        p['description'] = r['ppd']
    if 'rd' in r:
        if r['rd']:
            anchor = o['source'].get('quote') or ''
            if not any(r['rd'] in x for x in _extracts(o)) and not _phrase_near(rec, r['rd'], anchor) and not r['rd'].startswith('['):
                errors.append('%s: recheck road %r not within 700 chars of the quote (bracket a gloss with [..])' % (cid, r['rd']))
        p['direction_or_road'] = r['rd']
    if 'gz' in r:
        p['gazetteer_ref'] = r['gz']
    if 'ocr' in r:
        o['ocr_uncertain'] = bool(r['ocr'])
    if r.get('tier') == 'inferred':
        if not r.get('reasoning'):
            errors.append('%s: tier inferred needs reasoning' % cid)
        o['tier'] = 'inferred'
        o['reasoning'] = r['reasoning']
        o['render_flag'] = 1
    elif 'tier' in r:
        errors.append('%s: bad tier %r' % (cid, r['tier']))
    if fc == 'downgraded' and o['tier'] != 'inferred':
        errors.append('%s: downgraded claim must have tier inferred' % cid)
    if fc != 'downgraded' and o['tier'] == 'inferred' and o.get('_was_documented'):
        errors.append('%s: claim became inferred but fc is %s' % (cid, fc))
    why = (r.get('why') or '').strip()
    if not why:
        errors.append('%s: missing why' % cid)
    if fc == 'passed_full_read':
        o['fidelity_note'] = why
        changed = [k for k in r if k not in ('id', 'fc', 'why', 'add')]
        if any(k in changed for k in ('act', 'wp', 't', 'date', 'pp', 'rd', 'q', 'tier')):
            errors.append('%s: passed_full_read must not change act/wp/t/date/pp/rd/q/tier (use corrected)' % cid)
    else:
        o['note'] = (o['note'] + ' | ' if o['note'] else '') + 'Re-check: ' + why
    o['fidelity_check'] = fc
    o['claim_support_verified'] = fc in FC_OK
    # consistency of the time fields
    d = str(w.get('description') or '')
    if d.startswith('OCR glyph only') and (w.get('t_iso') or not o['ocr_uncertain']):
        errors.append('%s: OCR glyph only needs t null and ocr true' % cid)
    if d.startswith('time in a different sentence') and w.get('t_iso'):
        errors.append('%s: time in a different sentence needs t null' % cid)
    if w.get('t_iso') and not re.search(r'\d|noon|midnight', w.get('printed') or '', re.I):
        errors.append('%s: t set without a printed clock phrase' % cid)


def apply_add(parent, a, errors, seqs, out_new):
    cid = parent['claim_id']
    unit = a.get('u') or parent['unit_id']
    for need in ('k', 'rec', 'q', 'act', 'date'):
        if not a.get(need):
            errors.append('%s: add needs %s' % (cid, need))
            return
    if a['k'] not in KINDS:
        errors.append('%s: add bad kind' % cid)
        return
    seq = seqs.get(unit, 0) + 1
    seqs[unit] = seq
    try:
        src = PC._source_for(a['rec'], re.escape(a['q']), 0, True, None, None, None)
    except BuildError as ex:
        errors.append('%s: add quote bad: %s' % (cid, ex))
        return
    tier = a.get('tier', 'documented')
    o = {
        'claim_id': 'POS-B-%s-%02d' % (unit, seq), 'unit_id': unit, 'kind': a['k'],
        'when': {'printed': a.get('wp'), 'date': a['date'], 't_iso': ('%sT%s' % (a['date'], a['t'])) if a.get('t') else None, 'approx': bool(a.get('ap'))},
        'place': {'printed': a.get('pp'), 'gazetteer_ref': a.get('gz'), 'direction_or_road': a.get('rd')},
        'activity': a['act'], 'source': src, 'tier': tier, 'render_flag': 0 if tier == 'documented' else 1, 'weak_source': False,
        'claim_support_verified': tier == 'documented', 'ocr_uncertain': bool(a.get('ocr')), 'conflicts_with': [],
        'note': ('Split at the re-check from %s: %s' % (cid, a.get('note', ''))).strip(),
    }
    if a.get('wdesc'):
        o['when']['description'] = a['wdesc']
    if tier == 'inferred':
        o['reasoning'] = a.get('reasoning') or ''
        if not o['reasoning']:
            errors.append('%s: add inferred needs reasoning' % cid)
    pr = PC.placement_refs(unit)
    if pr:
        o['placement_refs'] = pr
    # same checks as for patched claims
    chk = {'fc': 'corrected', 'why': 'new claim split off from %s' % cid}
    tmp_err = []
    if a.get('wp') and not any(a['wp'] in x for x in _extracts(o)):
        if not _phrase_near(a['rec'], a['wp'], src['quote']):
            tmp_err.append('%s: add wp %r not near the quote' % (o['claim_id'], a['wp']))
        else:
            e = _extract_around(a['rec'], src['quote'], a['wp'])
            if e:
                try:
                    _verified_extract(a['rec'], e, cid)
                    o['source'].setdefault('additional_quotes', []).append(e)
                except BuildError as ex:
                    tmp_err.append(str(ex))
            else:
                tmp_err.append('%s: add wp %r near the quote but not as extract' % (o['claim_id'], a['wp']))
    for ph in [x for x in (a.get('pp') or '').split('; ') if x]:
        if not any(ph in x for x in _extracts(o)) and not _phrase_near(a['rec'], ph, src['quote']):
            tmp_err.append('%s: add place phrase %r not near the quote' % (o['claim_id'], ph))
    errors.extend(tmp_err)
    o['fidelity_check'] = 'corrected'
    o['claim_support_verified'] = tier == 'documented'
    if tier == 'inferred':
        o['fidelity_check'] = 'corrected'
        o['claim_support_verified'] = True
    w = o['when']
    d = str(w.get('description') or '')
    if d.startswith('OCR glyph only') and (w.get('t_iso') or not o['ocr_uncertain']):
        errors.append('%s: OCR glyph only needs t null and ocr true' % o['claim_id'])
    out_new.append(o)


def apply_all(built, decisions, restrict=None):
    """built: list of claim dicts (modified in place); decisions: dict id -> decision. Returns (new_claims, errors)."""
    errors = []
    by = {d['claim_id']: d for d in built}
    for cid in decisions:
        if cid not in by:
            errors.append('recheck key %s is not a claim id' % cid)
    seqs = {}
    for d in built:
        u = d['unit_id']
        n = int(d['claim_id'].rsplit('-', 1)[1])
        seqs[u] = max(seqs.get(u, 0), n)
    new = []
    for cid in sorted(decisions, key=lambda c: list(by).index(c) if c in by else 10 ** 9):
        if cid not in by:
            continue
        o = by[cid]
        r = decisions[cid]
        o['_was_documented'] = o['tier'] == 'documented'
        apply_one(o, r, errors)
        for a in r.get('add') or []:
            apply_add(o, a, errors, seqs, new)
    for d in built:
        d.pop('_was_documented', None)
    return new, errors


def load_decisions(paths):
    dec = {}
    for p in paths:
        with open(p, encoding='utf-8') as f:
            j = json.load(f)
        if isinstance(j, list):
            j = {x['id']: {k: v for k, v in x.items() if k != 'id'} for x in j}
        for k, v in j.items():
            if k.startswith('_'):
                continue
            if k in dec:
                raise BuildError('duplicate decision for ' + k)
            dec[k] = v
    return dec


if __name__ == '__main__':
    # standalone validation of reader draft files against the frozen pre-recheck ledger (never writes a ledger)
    # python -I tools/bt/positions_B_recheck.py check <draft.json> [--batch II-01]
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument('cmd'); ap.add_argument('files', nargs='+'); ap.add_argument('--batch')
    a = ap.parse_args()
    root = os.path.abspath(os.path.join(HERE, '..', '..'))
    P = os.path.join(root, 'docs', 'battle-theatre', 'history', 'positions')
    frozen = [json.loads(l) for l in open(os.path.join(P, '_orig_B', 'positions_B.before_recheck.jsonl'), encoding='utf-8')]
    dec = load_decisions(a.files)
    built = copy.deepcopy(frozen)
    # apply the overrides already in the frozen ledger (they are baked in), then the decisions
    sel = [d for d in built if d['claim_id'] in dec]
    new, errs = apply_all(built, dec)
    missing = []
    if a.batch:
        ids = [x.strip() for x in open(os.path.join(P, 'draft_B', 'batches', a.batch + '.txt')) if x.strip()]
        missing = [i for i in ids if i not in dec]
        extra = [i for i in dec if i not in ids]
        if extra:
            errs.append('decisions outside the batch: %s' % extra[:5])
    for m in missing:
        print('NO recheck decision:', m)
    for e in errs:
        print('ERROR', e)
    import collections
    print('decisions', len(dec), dict(collections.Counter(v['fc'] for v in dec.values())), 'new split claims', len(new), 'missing', len(missing), 'errors', len(errs))
    sys.exit(1 if errs or missing else 0)

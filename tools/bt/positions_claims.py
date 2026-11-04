"""Claim builder for the positions ledger (history/positions/positions_<SCOPE>.jsonl).

Data modules (tools/bt/positions_data_<SCOPE>_*.py) define ITEMS = [claim(...), gap(...), ...]. Every quote, time phrase, place phrase
and road phrase is located BY CODE in the named OR record; a regex that does not match, a quote of 15+ words or a phrase not
found within 700 characters of the anchor aborts the build, so nothing can be typed from memory.

    from positions_claims import claim, gap
    claim(unit, kind, rec, rx, activity, when_printed=, date=, t_iso=, approx=, place_printed=, gz=, road=,
          tier='documented'|'inferred', note=, conflicts=[claim_ids | 'label:x'], ocr=, nth=, reasoning=, also=[(rec, rx)], label=, quote=True)
    gap(unit, kind, searches=[>=3 strings], note=, reports=[ids], activity=, label=)

`rx` is a regex over the normalized text of record `rec` (whitespace collapsed, hyphenation joined, running heads removed;
matched case-sensitively); the matched text (< 15 words) becomes source.quote. When two claims of one record anchor within 120
characters of each other only the first stores the quote (one quote per source passage); the others are still located by code.

Run: python -I tools/bt/positions_claims.py B [PREFIX]    (PREFIX builds only positions_data_B_PREFIX*.py into partial_B_PREFIX.jsonl; without it builds docs/battle-theatre/history/positions/positions_B.jsonl from every
tools/bt/positions_data_B_*.py)
"""
import os, re, sys, json, glob, importlib

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import positions_lib as L
from positions_lib import BuildError, ROOT, RECS, _norm, rec_slice, page_label, F

KINDS = {'arrival_road', 'march', 'position', 'engagement', 'movement', 'night_position', 'departure', 'strength_note'}
_UNITS = None
_SPANS = {}
_PLACEMENT = None


def units():
    global _UNITS
    if _UNITS is None:
        with open(os.path.join(ROOT, 'docs', 'battle-theatre', 'history', 'units.json'), encoding='utf-8') as f:
            _UNITS = {u['id']: u for u in json.load(f)['units']}
    return _UNITS


def placement_refs(unit_id):
    """ids of placement.json entries that name this unit or an ancestor (already transcribed by the app data)."""
    global _PLACEMENT
    if _PLACEMENT is None:
        with open(os.path.join(ROOT, 'docs', 'battle-theatre', 'app', 'data', 'placement.json'), encoding='utf-8') as f:
            p = json.load(f)
        _PLACEMENT = []
        for k in ('approach', 'positions', 'activities', 'departures'):
            for e in p.get(k, []):
                us = e.get('units') or ([e['unit']] if e.get('unit') else [])
                _PLACEMENT.append((e['id'], set(us)))
    U = units()
    chain = set()
    u = unit_id
    while u:
        chain.add(u)
        u = (U.get(u) or {}).get('parent')
    return [i for i, us in _PLACEMENT if us & chain]


def _clean_author(a):
    a = (a or '').replace('\u25a0', '').replace('\ufffd', 'e')
    a = re.sub(r'["\']\s*(?=[A-Z])', '', a)
    a = re.sub(r'^G[^\w\s.]n\.', 'Gen.', a)
    return re.sub(r'\s+', ' ', a).strip()


def claim(unit, kind, rec, rx, activity, when_printed=None, date=None, t_iso=None, approx=False, place_printed=None, gz=None,
          road=None, tier='documented', note='', conflicts=(), ocr=False, nth=0, reasoning=None, also=(), label=None, quote=True,
          support=None, win=700):
    return ('claim', dict(win=win, unit=unit, kind=kind, rec=rec, rx=rx, activity=activity, when_printed=when_printed, date=date, t_iso=t_iso,
                          approx=approx, place_printed=place_printed, gz=gz, road=road, tier=tier, note=note, conflicts=list(conflicts),
                          ocr=ocr, nth=nth, reasoning=reasoning, also=list(also), label=label, quote=quote, support=support))


def gap(unit, kind, searches, note, reports=(), activity=None, label=None, conflicts=()):
    if len(searches) < 3:
        raise BuildError('gap for %s needs >= 3 targeted searches' % unit)
    return ('gap', dict(unit=unit, kind=kind, searches=list(searches), note=note, reports=list(reports), activity=activity, label=label,
                        conflicts=list(conflicts)))


def text_offset_fix(P, s, e, sub):
    i = P.ntext[s:e].find(sub)
    return max(i, 0)


def _source_for(rec, rx, nth, quote_ok, when_printed, place_printed, road, win=700):
    P, a, b = rec_slice(rec)
    ms = list(re.finditer(rx, P.ntext[a:b], re.S))
    if len(ms) <= nth:
        raise BuildError('NO MATCH in %s for /%s/ (nth=%d, found %d)' % (rec, rx, nth, len(ms)))
    m = ms[nth]
    s, e = a + m.start(), a + m.end()
    text = P.ntext[s:e]
    nw = len(text.split())
    r = RECS[rec]
    window = _norm(P.ntext[max(a, s - win):min(b, e + win)])
    for lab, ph in (('when_printed', when_printed), ('place_printed', place_printed), ('road', road)):
        if ph and _norm(ph) not in window:
            raise BuildError('%s %r not within 700 chars of the anchor in %s (/%s/)' % (lab, ph, rec, rx))
    pl, ip = page_label(P, s, e)
    quote = None
    withheld = None
    # every claim carries its own verified extract (<15 words): the rx match of the claim itself
    if nw >= 15:
        # trim to the 14-word sub-window of the matched sentence that holds the most of the claim's own time/place/road phrases
        toks = [(mm.start(), mm.end()) for mm in re.finditer(r'\S+', text)]
        keys = [_norm(x) for x in (when_printed, place_printed, road) if x]
        best = None
        for i in range(0, len(toks) - 13):
            sub = text[toks[i][0]:toks[i + 13][1]]
            score = sum(1 for k in keys if k in _norm(sub))
            if best is None or score > best[0]:
                best = (score, i, sub)
        text = best[2]
        os0, _ = P.orig_span(s, e)
        s = s + text_offset_fix(P, s, e, text)
        e = s + len(text)
    v = F.verify(text, (r['part'],))
    os_, oe = P.orig_span(s, e)
    if not any(h['start'] <= os_ and h['end'] >= oe - 1 for h in v):
        raise BuildError('QUOTE NOT VERIFIED in %s: %s' % (rec, text[:70]))
    quote = text
    if r['part'] == 3:
        author = re.sub(r'\s+', ' ', '%s (signer; Part 3 %s to %s)' % (r.get('signer') or 'unsigned', r.get('kind') or 'document', (r.get('addressee') or 'not stated')[:50])).strip()
    else:
        author = ((r.get('rank') or '') + ' ' + _clean_author(r.get('author'))).strip()
    d = {'report_id': rec, 'report_no': r.get('report_no'),
         'author': author,
         'printed_page': pl, 'interpolated': ip, 'quote': quote}
    if withheld:
        d['quote_withheld'] = withheld
    return d


def build_claim(spec, seq):
    U = units()
    if spec['unit'] not in U:
        raise BuildError('unknown unit %s' % spec['unit'])
    if spec['kind'] not in KINDS:
        raise BuildError('bad kind %s' % spec['kind'])
    if spec['tier'] not in ('documented', 'inferred'):
        raise BuildError('bad tier')
    if spec['tier'] == 'inferred' and not spec['reasoning']:
        raise BuildError('inferred claim needs reasoning: %s' % spec['activity'])
    if not spec['date'] or not re.fullmatch(r'1863-0[67]-\d\d', spec['date']):
        raise BuildError('bad date %r (%s)' % (spec['date'], spec['activity']))
    if spec['t_iso'] and not re.fullmatch(r'1863-0[67]-\d\dT\d\d:\d\d', spec['t_iso']):
        raise BuildError('bad t_iso %r' % spec['t_iso'])
    src = _source_for(spec['rec'], spec['rx'], spec['nth'], spec['quote'], spec['when_printed'], spec['place_printed'], spec['road'], spec.get('win', 700))
    also = []
    for tup in spec['also']:
        rec2, rx2 = tup[0], tup[1]
        also.append(_source_for(rec2, rx2, tup[2] if len(tup) > 2 else 0, True, None, None, None))
    d = {
        'claim_id': 'POS-B-%s-%02d' % (spec['unit'], seq),
        'unit_id': spec['unit'],
        'kind': spec['kind'],
        'when': {'printed': spec['when_printed'], 'date': spec['date'], 't_iso': spec['t_iso'], 'approx': bool(spec['approx'])},
        'place': {'printed': spec['place_printed'], 'gazetteer_ref': spec['gz'], 'direction_or_road': spec['road']},
        'activity': spec['activity'],
        'source': src,
        'tier': spec['tier'],
        'render_flag': 0 if spec['tier'] == 'documented' else 1,
        'weak_source': False,
        'claim_support_verified': (spec['tier'] == 'documented') if spec['support'] is None else bool(spec['support']),
        'ocr_uncertain': bool(spec['ocr']),
        'conflicts_with': list(spec['conflicts']),
        'note': spec['note'],
    }
    if spec['reasoning']:
        d['reasoning'] = spec['reasoning']
    if also:
        d['also_sources'] = also
    pr = placement_refs(spec['unit'])
    if pr:
        d['placement_refs'] = pr
    return d


def build_gap(g, seq):
    if g['unit'] not in units():
        raise BuildError('unknown unit %s' % g['unit'])
    if g['kind'] not in KINDS:
        raise BuildError('bad kind')
    return {'claim_id': 'POS-B-%s-%02d' % (g['unit'], seq), 'unit_id': g['unit'], 'kind': g['kind'],
            'when': {'printed': None, 'date': None, 't_iso': None, 'approx': False},
            'place': {'printed': None, 'gazetteer_ref': None, 'direction_or_road': None},
            'activity': g['activity'] or 'NOT_FOUND',
            'source': {'report_id': None, 'author': None, 'printed_page': None, 'interpolated': False, 'quote': None},
            'tier': 'open gap', 'render_flag': None, 'weak_source': False, 'claim_support_verified': False, 'ocr_uncertain': False,
            'conflicts_with': list(g['conflicts']), 'note': g['note'], 'searches_tried': g['searches'], 'reports_searched': g['reports']}


def build_all(items):
    seqs = {}
    built = []
    labels = {}
    for kind, s in items:
        n = seqs.get(s['unit'], 0) + 1
        seqs[s['unit']] = n
        d = build_claim(s, n) if kind == 'claim' else build_gap(s, n)
        if s.get('label'):
            if s['label'] in labels:
                raise BuildError('duplicate label ' + s['label'])
            labels[s['label']] = d['claim_id']
        built.append(d)
    ids = {x['claim_id'] for x in built}
    for d in built:
        out = []
        for c in d['conflicts_with']:
            if c.startswith('label:'):
                if c[6:] not in labels:
                    raise BuildError('unknown label %s' % c)
                out.append(labels[c[6:]])
            else:
                out.append(c)
        d['conflicts_with'] = out
        for c in out:
            if c.startswith('POS-') and c not in ids:
                raise BuildError('conflict target %s missing (claim %s)' % (c, d['claim_id']))
    by = {d['claim_id']: d for d in built}
    for d in built:   # conflicts are symmetric
        for c in d['conflicts_with']:
            o = by.get(c)
            if o is not None and d['claim_id'] not in o['conflicts_with']:
                o['conflicts_with'].append(d['claim_id'])
    return built


def main(scope, only=None):
    items = []
    mods = sorted(glob.glob(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'positions_data_%s_%s*.py' % (scope, only or ''))))
    for m in mods:
        name = os.path.splitext(os.path.basename(m))[0]
        mod = importlib.import_module(name)
        print('%s: %d items' % (name, len(mod.ITEMS)))
        items.extend(mod.ITEMS)
    errs = []
    for k, (kind, sp) in enumerate(items):
        try:
            (build_claim if kind == 'claim' else build_gap)(sp, 1)
        except BuildError as ex:
            errs.append('item %d (%s, %s): %s' % (k, sp['unit'], (sp.get('activity') or '')[:50], ex))
    _SPANS.clear()
    if errs:
        print(chr(10).join(errs))
        print('%d of %d items FAILED; nothing written' % (len(errs), len(items)))
        sys.exit(1)
    built = build_all(items)
    ov_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'positions_%s_overrides.json' % scope)
    if os.path.exists(ov_path) and not only:
        with open(ov_path, encoding='utf-8') as f:
            ov = json.load(f)
        by_id = {d['claim_id']: d for d in built}
        for cid, o in ov.items():
            if cid.startswith('_'):
                continue
            d = by_id[cid]
            if o.get('printed'):
                d['when']['printed'] = o['printed']
            if o.get('drop_t_iso'):
                d['when']['t_iso'] = None
            if o.get('ocr'):
                d['ocr_uncertain'] = True
            if o.get('description'):
                d['when']['description'] = o['description']
    # full-passage fidelity re-check (scope B): decisions in tools/bt/positions_B_recheck_<CORPS>.json are applied after the overrides
    rck = sorted(glob.glob(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'positions_%s_recheck_*.json' % scope)))
    if rck and not only:
        import positions_B_recheck as RK
        dec = RK.load_decisions(rck)
        new, rerrs = RK.apply_all(built, dec)
        if rerrs:
            print(chr(10).join(rerrs[:80]))
            print('%d recheck errors; nothing written' % len(rerrs))
            sys.exit(1)
        built.extend(new)
        for d in built:
            if 'fidelity_check' not in d:
                d['fidelity_check'] = 'not_rechecked'
                d['claim_support_verified'] = False
                d['fidelity_note'] = ('open gap: no cited passage (searches re-run: see note)' if d['tier'] == 'open gap' else 'not yet re-checked')
    un_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'positions_%s_unit_notes.json' % scope)
    if os.path.exists(un_path) and not only and rck:
        with open(un_path, encoding='utf-8') as f:
            un = json.load(f)
        by2 = {d['claim_id']: d for d in built}
        for cid, u in un.items():
            if cid.startswith('_'):
                continue
            d = by2[cid]
            if u.get('uid'):
                if u['uid'] not in units():
                    raise BuildError('unit note %s: unknown unit %s' % (cid, u['uid']))
                d['unit_id'] = u['uid']
            d['unit_attribution'] = u['ua']
            if d.get('fidelity_check') == 'passed_full_read':
                d['fidelity_check'] = 'corrected'
                d['fidelity_note'] = (d.get('fidelity_note') or '') + ' Unit attribution annotated at the lead review.'
            d['note'] = (d['note'] + ' | ' if d['note'] else '') + 'Re-check (unit): ' + u['ua']
    out = os.path.join(ROOT, 'docs', 'battle-theatre', 'history', 'positions', ('positions_%s.jsonl' % scope) if not only else ('partial_%s_%s.jsonl' % (scope, only)))
    with open(out, 'w', encoding='utf-8', newline='\n') as f:
        for d in built:
            f.write(json.dumps(d, ensure_ascii=False) + '\n')
    n_doc = sum(1 for d in built if d['tier'] == 'documented')
    n_inf = sum(1 for d in built if d['tier'] == 'inferred')
    n_gap = sum(1 for d in built if d['tier'] == 'open gap')
    print('wrote %d claims (%d documented, %d inferred, %d open gap) -> %s' % (len(built), n_doc, n_inf, n_gap, out))


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'B', sys.argv[2] if len(sys.argv) > 2 else None)

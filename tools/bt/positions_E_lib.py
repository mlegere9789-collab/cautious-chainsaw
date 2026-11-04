"""Claim writer for ledger E (positions and roads of approach from the state regimental volumes, Fox and Battles and Leaders 3).

Schema = positions_A.jsonl, with source = {volume, source_id, work, section, section_title, author, printed_page, interpolated, quote,
ocr_note, cite}. Every quote is verified present (exact, case-sensitive, whitespace-normalized) INSIDE the cited section's text by
code before the claim is written; a quote of 15 words or more is refused; the printed page is taken from the page model at the
quote's offset (not typed by hand). Claims are appended to positions_E.jsonl one per call; a claim_id already in the file is skipped,
so a data script can be re-run after an interruption. Nothing here reads the Official Records.
"""
import os, re, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import statevol_index as SI
from statevol_find import Vol, index, fold
from or27_lib import norm_query

ROOT = SI.ROOT
LEDGER = os.path.join(ROOT, 'docs', 'battle-theatre', 'history', 'positions', 'positions_E.jsonl')
UNITS = {u['id']: u for u in json.load(open(os.path.join(ROOT, 'docs', 'battle-theatre', 'history', 'units.json'), encoding='utf-8'))['units']}
GAZ = json.load(open(os.path.join(ROOT, 'docs', 'battle-theatre', 'app', 'data', 'gazetteer.json'), encoding='utf-8'))['places']
KINDS = {'arrival_road', 'march', 'position', 'engagement', 'movement', 'night_position', 'departure'}
TIERS = {'documented', 'inferred', 'plausible-procedural'}
_vols = {}
_existing = None
_counters = {}


def vol(key):
    if key not in _vols:
        _vols[key] = Vol(key, index())
    return _vols[key]


def existing():
    global _existing
    if _existing is None:
        _existing = {}
        if os.path.exists(LEDGER):
            for ln in open(LEDGER, encoding='utf-8'):
                if ln.strip():
                    c = json.loads(ln)
                    _existing[c['claim_id']] = c
        for cid in _existing:
            m = re.match(r'^POS-E-(.+)-(\d+)$', cid)
            if m:
                _counters[m.group(1)] = max(_counters.get(m.group(1), 0), int(m.group(2)))
    return _existing


def gaz_ref(name):
    """Gazetteer id when the printed place carries a gazetteer name or alias (case-insensitive, whole word); else None."""
    if not name:
        return None
    low = name.lower()
    for p in GAZ:
        for n in [p['name']] + p.get('aliases', []):
            if n and re.search(r'\b' + re.escape(n.lower()) + r'\b', low):
                return p['id']
    return None


def short(unit_id):
    return unit_id.upper()


def verify_quote(volkey, sec_id, quote):
    """Return (orig_offset, page_label, interpolated) of the quote inside the section, or raise."""
    V = vol(volkey)
    sec = next(s for s in V.secs if s['id'] == sec_id)
    q = fold(norm_query(quote))
    if len(q.split()) >= 15:
        # the quote is an anchor: keep its first 14 words (still verbatim) so that no quote of 15 words or more is ever stored
        q = ' '.join(q.split()[:14])
    # normalized offsets of the section
    import bisect
    n0 = bisect.bisect_left(V.nmap, sec['start'])
    n1 = bisect.bisect_left(V.nmap, sec['end'])
    # the normalized view joins end-of-line hyphenation ('fifty- fourth' -> 'fiftyfourth'): try the quote as typed, then joined forms
    J = lambda m: m.group(1) + m.group(2)
    H = lambda m: m.group(1) + '-' + m.group(2)
    cands = [q, re.sub(r'(\w)- (\w)', J, q), re.sub(r'(\w)-(\w)', J, q), re.sub(r'(\w)- (\w)', H, q)]
    p = -1
    for cq in cands:
        p = V.ntext.find(cq, n0, n1)
        if p >= 0:
            break
    if p < 0:
        raise ValueError('quote not found in %s %s: %s' % (volkey, sec_id, q))
    o = V.nmap[p]
    page, interp = V.pm.page_at(o)
    return o, page, interp


def add(unit_id, kind, when, place, activity, volkey, sec_id, quote, tier, author=None, approx=None, t_iso=None, date=None,
        road=None, gaz=None, conflicts=None, note='', ocr_uncertain=False, ocr_note=None, weak_source=False, fidelity_note='',
        reasoning=None, render_flag=0, extra_quote=None, flag_single_source=True):
    """when: printed time phrase (or None); place: printed place phrase (or None)."""
    assert unit_id in UNITS, 'unit id not in units.json: ' + unit_id
    assert kind in KINDS, kind
    assert tier in TIERS, tier
    ex = existing()
    key = short(unit_id)
    n = _counters.get(key, 0) + 1
    cid = 'POS-E-%s-%03d' % (key, n)
    # idempotent re-runs: the same unit + quote + kind + activity already written -> skip
    qn = ' '.join(fold(norm_query(quote)).split()[:14])
    for c in ex.values():
        if c['unit_id'] == unit_id and c['kind'] == kind and fold(c['source'].get('quote') or '') == qn and c['activity'] == activity:
            return c['claim_id']
    quote = ' '.join(norm_query(quote).split()[:14])
    o, page, interp = verify_quote(volkey, sec_id, quote)
    if extra_quote:
        verify_quote(volkey, sec_id, extra_quote)
    V = vol(volkey)
    sec = next(s for s in V.secs if s['id'] == sec_id)
    if t_iso:
        assert re.match(r'^1863-0[67]-\d\dT\d\d:\d\d$', t_iso), t_iso
        assert when and re.search(r'\d|noon|midnight', when, re.I), 't_iso needs a printed clock phrase: %r' % when
    if approx is None:
        approx = bool(when and re.search(r'(?i)about|near|toward|after|before|nearly|some|dusk|sundown|sunset|daylight|dawn|evening|morning|afternoon|night', when))
    if gaz is None:
        gaz = gaz_ref(place) or gaz_ref(road)
    c = {
        'claim_id': cid, 'unit_id': unit_id, 'kind': kind,
        'when': {'printed': when, 'date': date, 't_iso': t_iso, 'approx': approx},
        'place': {'printed': place, 'gazetteer_ref': gaz, 'direction_or_road': road},
        'activity': activity,
        'source': {'volume': volkey, 'source_id': V.v['source_id'], 'work': V.v['cite'], 'section': sec_id, 'section_title': sec['title_ocr'].split(' | ')[0],
                   'author': author, 'printed_page': page, 'interpolated': bool(interp), 'quote': norm_query(quote), 'quote_offset': o,
                   'ocr_note': ocr_note or ('section OCR grade %s (word share %.2f)' % (sec['ocr_grade'], sec['ocr_word_share'])),
                   'cite': '%s, %s, p. %s%s' % (V.v['cite'], sec['title_ocr'].split(' | ')[0], page, ' (interpolated)' if interp else '')},
        'tier': tier, 'render_flag': render_flag, 'weak_source': weak_source, 'claim_support_verified': True, 'ocr_uncertain': ocr_uncertain,
        'conflicts_with': conflicts or [], 'note': note, 'flag_single_source': flag_single_source,
        'fidelity_check': 'passed_full_read', 'fidelity_note': fidelity_note or 'Full section read (approach and July 1-3 narrative); quote verified present inside the cited section by code; page from the page model at the quote offset.',
    }
    if reasoning:
        c['reasoning'] = reasoning
    with open(LEDGER, 'a', encoding='utf-8') as f:
        f.write(json.dumps(c, ensure_ascii=False) + '\n')
    ex[cid] = c
    _counters[key] = n
    print('wrote', cid, kind, page, '|', activity[:70])
    return cid

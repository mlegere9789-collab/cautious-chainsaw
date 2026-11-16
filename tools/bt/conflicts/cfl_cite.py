"""The citation checker of the conflict-resolution validator.

One citation of a position is the shape of the other evidence files (docs/battle-theatre/town/evidence, life/evidence):
    source (ledger id), source_class, part, page, page_basis, text_offset, quote, quote_mode (+ raw, ocr_note, page_image_viewed), printed_page, page_note
plus the facts the weighing rubric needs: witness, written {date, kind}, vantage, knew_by, clock, hedge, group, and `states` (what the quote states:
times, numbers, dates, phrases).

Engine choice (PLAN.md section 4): the quote, the offset, the page of a `markers` or `none` text, the OR27 record, the ledger and the hash are checked by
`check_cite` of tools/bt/town/validate_evidence.py (imported, not edited); it resolves every source family of the local library through the ledger
(OR27 parts by record id, books and papers, PDF texts with page markers, the weeklies and newspaper pages as families of parts). What neither existing
validator does, this module adds: the printed page of an Official Records quote by the scan-leaf map (DD-TL02-04 item 4, DD-LIFE-05), the check that what a
citation says it states (a clock time, a number, a day, a name) stands in the quote, and the rubric fields.
"""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cfl_lib as L
import cfl_parse as P

WRITTEN_KINDS = ('order_or_dispatch', 'official_report', 'private_letter_or_diary', 'newspaper_1863', 'early_narrative', 'postwar_narrative',
                 'later_history', 'proceedings_or_tablet', 'reference_table', 'institutional', 'lead')
VANTAGES = ('commander_present', 'present', 'staff_present', 'elsewhere', 'not_stated', 'not_applicable')
KNEW_BY = ('eyewitness', 'own_orders', 'relayed_report', 'computed', 'not_stated', 'not_applicable')
CLOCKS = ('union', 'confederate', 'unspecified', 'not_applicable')
HEDGES = ('exact', 'about', 'upper', 'lower', 'soon_after', 'window')
PAGE_BASES = ('scan_leaf', 'running_head', 'interpolated', 'pdf_marker', 'as_read', 'none')
CITE_KEYS = {'id', 'source', 'source_class', 'part', 'page', 'page_basis', 'text_offset', 'quote', 'quote_mode', 'raw', 'ocr_note', 'page_image_viewed', 'printed_page',
             'page_note', 'witness', 'written', 'vantage', 'knew_by', 'clock', 'clock_note', 'hedge', 'group', 'states', 'exact', 'note'}
TOWN_KEYS = ('source', 'part', 'page', 'quote', 'text_offset', 'quote_mode', 'raw', 'ocr_note', 'page_image_viewed', 'printed_page', 'page_note')
STATE_KEYS = {'times', 'numbers', 'dates', 'phrases'}
OR_PARTS = {'OR27-1': 1, 'OR27-2': 2, 'OR27-3': 3}
ISO_DATE = re.compile(r'^\d{4}(-\d{2}(-\d{2})?)?$')

# the codes the self-test and the reviewers rely on
_TOWN_CODES = [
    (r'quote not found', 'quote_not_found'),
    (r'text_offset', 'offset_mismatch'),
    (r'citation lacks', 'cite_missing_field'),
    (r'is not in SOURCES\.md|source must be a string', 'source_unknown'),
    (r'has class', 'source_class'),
    (r'sha256', 'text_changed'),
    (r'page is |page %|is outside the printed pages|no page marker|page is empty|is not a printed page|not an OR27 record|not inside record|inside record|OR27 record', 'page_mismatch'),
    (r'at least \d+ are needed|letters and digits', 'quote_too_short'),
    (r'longer than', 'quote_too_long'),
    (r'family of texts|part %r is not a plain|part must|has no local text|does not exist|leaves the repository', 'text_unavailable'),
    (r'quote_mode|raw excerpt|ocr_note|OCR confusions|digit', 'ocr_rules'),
]


def code_of(msg):
    for rx, code in _TOWN_CODES:
        if re.search(rx, msg):
            return code
    return 'cite_error'


_leaf = {}


def _leafmap(part):
    if part not in _leaf:
        try:
            sys.path.insert(0, os.path.join(L.ROOT, 'tools', 'bt'))
            import kit_or27_leafmap as K
            _leaf[part] = K.load(int(part))
        except Exception:
            _leaf[part] = None
    return _leaf[part]


_pm = {}


def _pagemodel(part):
    if part not in _pm:
        try:
            sys.path.insert(0, os.path.join(L.ROOT, 'tools', 'bt'))
            import or27_find as F
            _pm[part] = F.get_part(int(part))
        except Exception:
            _pm[part] = None
    return _pm[part]


def or27_pages(part, start, end):
    """{'scan_leaf': [pages at start and end], 'running_head': [(page, conf, lo, hi) ...]} for an Official Records part and a character span."""
    out = {'scan_leaf': [], 'running_head': []}
    lm = _leafmap(part)
    if lm is not None:
        for off in (start, max(start, end - 1)):
            r = lm.at(off)
            out['scan_leaf'].append(r['page'] if r else None)
    pm = _pagemodel(part)
    if pm is not None:
        for off in (start, max(start, end - 1)):
            p = pm.pm.page_at(off)
            out['running_head'].append((p.get('page'), str(p.get('conf', '')), p.get('lo'), p.get('hi')))
    return out


def _isint(x):
    return isinstance(x, int) and not isinstance(x, bool)


def check_citation(ctx, c, where, errs, warns, event_date=None):
    """Check one citation object. Appends (code, message) pairs to errs and warns. Returns a dict with what the caller needs:
    {'ok': bool (the quote was found at the offset), 'class': ledger class, 'lead': bool, 'quote': str, 'span': (start, end) or None, 'group': str}."""
    info = {'ok': False, 'class': None, 'lead': False, 'quote': c.get('quote') if isinstance(c, dict) else None, 'span': None, 'group': None, 'source': None}
    if not isinstance(c, dict):
        errs.append(('cite_shape', '%s: a citation is an object' % where))
        return info
    for k in c:
        if k not in CITE_KEYS and not str(k).startswith('x_'):
            errs.append(('unknown_key', '%s: unknown key %r in a citation (own keys start with x_)' % (where, k)))
    for k in ('source', 'source_class', 'page_basis', 'text_offset', 'quote', 'written', 'vantage', 'knew_by', 'clock', 'group'):
        if c.get(k) in (None, '') and k not in ('page_basis',):
            errs.append(('cite_missing_field', '%s: citation lacks %s' % (where, k)))
    sid = c.get('source')
    led = ctx.ledger().get(sid) if isinstance(sid, str) else None
    info['source'] = sid
    if led is None:
        errs.append(('source_unknown', '%s: source %r is not in SOURCES.md (add it with tools/bt/conflicts/add_source.py)' % (where, sid)))
        return info
    cls = led.get('class')
    info['class'] = cls
    info['lead'] = cls == 'lead'
    if c.get('source_class') != cls:
        errs.append(('source_class', '%s: source_class %r differs from the ledger class %r of %s' % (where, c.get('source_class'), cls, sid)))
    # enumerations of the weighing block
    for k, enum in (('vantage', VANTAGES), ('knew_by', KNEW_BY), ('clock', CLOCKS)):
        if c.get(k) is not None and c.get(k) not in enum:
            errs.append(('enum', '%s: %s %r is not one of %s' % (where, k, c.get(k), ', '.join(enum))))
    h = c.get('hedge')
    if h is not None and h not in HEDGES:
        errs.append(('enum', '%s: hedge %r is not one of %s' % (where, h, ', '.join(HEDGES))))
    w = c.get('written')
    if not isinstance(w, dict) or w.get('kind') not in WRITTEN_KINDS:
        errs.append(('enum', '%s: written is {"date": ISO date or year, "kind": one of %s}' % (where, ', '.join(WRITTEN_KINDS))))
    else:
        if not (isinstance(w.get('date'), str) and ISO_DATE.match(w['date'])):
            errs.append(('written_date', '%s: written.date is an ISO date YYYY-MM-DD, or YYYY-MM or YYYY when only that is known' % where))
        elif event_date and re.match(r'^\d{4}-\d{2}-\d{2}$', w['date']):
            import datetime
            try:
                gap = (datetime.date.fromisoformat(w['date']) - datetime.date.fromisoformat(event_date)).days
                if gap < -1:
                    errs.append(('written_date', '%s: written.date %s is before the event date %s' % (where, w['date'], event_date)))
                k = w['kind']
                if k == 'order_or_dispatch' and gap > 7:
                    warns.append(('rubric', '%s: an order or dispatch written %d days after the event: it is an official report or a later account' % (where, gap)))
                if k == 'postwar_narrative' and gap < 180:
                    warns.append(('rubric', '%s: kind postwar_narrative but written %d days after the event: is it an official report, a letter or an early narrative?' % (where, gap)))
                if k == 'private_letter_or_diary' and gap > 400:
                    warns.append(('rubric', '%s: a letter or diary written %d days after the event: a later memoir must be postwar_narrative' % (where, gap)))
            except ValueError:
                errs.append(('written_date', '%s: written.date %r is not a calendar date' % (where, w['date'])))
    wit = c.get('witness')
    if not (isinstance(wit, dict) and isinstance(wit.get('name'), str) and wit['name'].strip()):
        errs.append(('witness', '%s: witness is {"name": who wrote it, "role": rank/office/unit, "side": union|confederate|civilian|other}' % where))
    elif wit.get('side') not in ('union', 'confederate', 'civilian', 'other', 'institution'):
        errs.append(('enum', '%s: witness.side is union, confederate, civilian, other or institution' % where))
    if isinstance(c.get('group'), str) and not c['group'].strip():
        errs.append(('cite_missing_field', '%s: group is empty (the line of knowledge: the witness, or the report this passage relays)' % where))
    info['group'] = (c.get('group') or '').strip().lower()
    if c.get('exact') is not None and not isinstance(c.get('exact'), bool):
        errs.append(('enum', '%s: exact is true or false' % where))
    # page basis against the ledger page model
    pb = c.get('page_basis')
    model = (led.get('pages') or 'none').strip().lower()
    if pb is not None and pb not in PAGE_BASES:
        errs.append(('enum', '%s: page_basis %r is not one of %s' % (where, pb, ', '.join(PAGE_BASES))))
    want_pb = {'or27': ('scan_leaf', 'running_head', 'interpolated'), 'markers': ('pdf_marker',), 'none': ('as_read', 'none')}.get(model, ('as_read', 'none'))
    if pb is not None and pb in PAGE_BASES and pb not in want_pb:
        errs.append(('page_basis', '%s: page_basis %r does not fit the page model %r of %s (use %s)' % (where, pb, model, sid, ' or '.join(want_pb))))
    if pb is None:
        errs.append(('cite_missing_field', '%s: citation lacks page_basis (use %s for %s)' % (where, ' or '.join(want_pb), sid)))
    # the engine: quote, offset, page of markers/none, OR27 record, hash
    town_c = {k: c.get(k) for k in TOWN_KEYS if k in c}
    if 'page' in town_c and town_c['page'] is not None:
        town_c['page'] = str(town_c['page'])
    if model == 'markers' and 'page' in town_c:
        town_c['page'] = str(town_c['page'])
    e2, w2 = [], []
    T = L.town()
    ok = False
    if isinstance(c.get('quote'), str) and c.get('text_offset') is not None:
        town_err_before = len(e2)
        try:
            ok = bool(T.check_cite(ctx, town_c, where, e2, w2, need_class_not_lead=False, numbers_in=None))
        except Exception as ex:   # an unreadable text must not hide the other defects
            e2.append('%s: the engine failed on %s (%s)' % (where, sid, str(ex)[:80]))
    for m in e2:
        errs.append((code_of(m), m))
    for m in w2:
        warns.append(('engine', m))
    info['ok'] = ok and not e2
    # the quote's span (for the page check of Official Records quotes)
    quote = c.get('quote') if isinstance(c.get('quote'), str) else ''
    if ok and not e2 and model == 'or27':
        part = OR_PARTS.get(sid)
        off = c.get('text_offset')
        if part and _isint(off):
            span_end = off + max(1, len(quote))
            pages = or27_pages(part, off, span_end)
            want = c.get('page')
            try:
                wn = int(str(want).strip().split('-')[0].lstrip('~'))
            except (TypeError, ValueError):
                wn = None
                errs.append(('page_mismatch', '%s: page %r is not a printed page number of the Official Records' % (where, want)))
            if wn is not None and pb == 'scan_leaf':
                got = pages['scan_leaf']
                if all(g is None for g in got):
                    errs.append(('page_leafmap', '%s: no scan-leaf page for offset %d (the leaf map does not cover it): use page_basis running_head or interpolated' % (where, off)))
                elif wn not in got:
                    errs.append(('page_mismatch', '%s: page %s but the scan-leaf map gives %s at offsets %d-%d' % (where, want, got, off, span_end)))
            elif wn is not None and pb in ('running_head', 'interpolated'):
                good = False
                for pg, conf, lo, hi in pages['running_head']:
                    if pg is None:
                        continue
                    if conf.startswith(('head', 'front')):
                        good = good or wn == pg
                    else:
                        good = good or (lo is not None and hi is not None and lo <= wn <= hi)
                if not good:
                    errs.append(('page_mismatch', '%s: page %s does not match the running-head page model at offset %d: %s' % (where, want, off, pages['running_head'])))
            info['span'] = (off, span_end)
    elif ok and not e2:
        off = c.get('text_offset')
        if _isint(off):
            info['span'] = (off, off + max(1, len(quote)))
        if model == 'none' and ok:
            pg = c.get('page')
            if pg not in (None, '') and re.fullmatch(r'\d{1,4}', str(pg).strip()):
                try:
                    raw = ctx.text(L.town().resolve_text(ctx, sid, c.get('part'))[0])[0]
                    a = max(0, off - 6000)
                    seg = raw[a:off + len(quote) + 6000]
                    if not re.search(r'(?m)(^|\s)%s(\s|$)' % re.escape(str(pg).strip()), seg):
                        warns.append(('page_hint', '%s: the printed page %s does not appear as a number within 6000 characters of the quote (read it on the page image and say so in page_note)' % (where, pg)))
                except Exception:
                    pass
    # what the citation says it states stands in the quote
    st = c.get('states')
    qtext = quote
    if c.get('quote_mode') == 'ocr':
        qtext = quote            # the corrected reading is what the researcher states
    if st is not None:
        if not isinstance(st, dict) or set(st) - STATE_KEYS:
            errs.append(('states_shape', '%s: states is {"times": ["HH:MM"], "numbers": [n], "dates": ["MM-DD"], "phrases": [text]}' % where))
        else:
            for t in st.get('times') or []:
                if not (isinstance(t, str) and re.fullmatch(r'\d{2}:\d{2}', t)):
                    errs.append(('states_shape', '%s: states.times holds 24-hour HH:MM strings (got %r)' % (where, t)))
                elif not P.clock_in(t, qtext):
                    errs.append(('state_not_in_quote', '%s: the time %s is not among the clock readings of the quote %s' % (where, t, sorted(P.clock_set(qtext)))))
            for n in st.get('numbers') or []:
                if isinstance(n, bool) or not isinstance(n, (int, float)):
                    errs.append(('states_shape', '%s: states.numbers holds numbers (got %r)' % (where, n)))
                elif not P.number_in(n, qtext):
                    errs.append(('state_not_in_quote', '%s: the number %s is not stated in the quote (numbers found: %s)' % (where, n, sorted(P.numbers_in(qtext))[:14])))
            for d in st.get('dates') or []:
                if not (isinstance(d, str) and re.fullmatch(r'(\d{4}-)?\d{2}-\d{2}', d)):
                    errs.append(('states_shape', '%s: states.dates holds MM-DD or YYYY-MM-DD strings (got %r)' % (where, d)))
                elif not P.date_in(d, qtext):
                    errs.append(('state_not_in_quote', '%s: the day of %s is not stated in the quote (days found: %s)' % (where, d, sorted(P.days_in(qtext)[0]))))
            for ph in st.get('phrases') or []:
                if not (isinstance(ph, str) and ph.strip()):
                    errs.append(('states_shape', '%s: states.phrases holds words as the quote prints them' % where))
                elif not P.phrase_in(ph, qtext):
                    errs.append(('state_not_in_quote', '%s: the phrase %r is not in the quote' % (where, ph)))
    if h in ('about', 'upper', 'lower', 'soon_after', 'window') and quote and not P.hedge_in(h, quote):
        warns.append(('rubric', '%s: hedge %r is claimed but the quote has no word that carries it' % (where, h)))
    if c.get('quote_mode') == 'ocr' and not c.get('page_image_viewed') and isinstance(st, dict) and (st.get('times') or st.get('numbers')):
        warns.append(('rubric', '%s: a time or a number is stated from an OCR-corrected quote: look at the page image and set page_image_viewed' % where))
    return info

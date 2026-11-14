"""Validate the OA11 evidence files docs/battle-theatre/life/evidence/<group>.jsonl against the evidence contract.

    python3 -I tools/bt/life/validate_evidence.py <group>        one group's file
    python3 -I tools/bt/life/validate_evidence.py --all          every group file, plus the cross-file checks (unique ids, duplicates, references)
    python3 -I tools/bt/life/validate_evidence.py --self-test    the validator tests itself (synthetic texts always; the real Official Records when present)
    options: --strict (a quote that needed the OCR or edit-distance fold is an error), --json, --file PATH, --max-errors N, --no-text (skip text checks)

Every row is checked for: shape and enumerations (contract.json); the unit id in history/units.json; the work id; the clip id in the app's clips.json;
the pose id in poses.json; the window inside the theatre clock (minutes since 1863-06-01 00:00 local mean time); the tier against the source class
(a manual is never evidence of a unit's act, documented needs a non-lead local text, a gap carries no quote and a list of failed lookups); and the
quote: found in the named local text (whitespace-, hyphenation-, typography-tolerant; an OCR fold or a small edit distance only with declared
ocr_repairs), at the stated character offsets, inside the stated record (Official Records), on the stated printed page, with every stated number
present in the quote.  Exit status 1 on any error.  Nothing here reads the network.
"""
import os, re, sys, json, collections, tempfile, shutil, argparse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from life_lib import *
import life_lib as LL

utf8_stdout()
_contract = None


def contract():
    global _contract
    if _contract is None:
        _contract = load_json(CONTRACT_PATH)
    return _contract


GROUP_RE = re.compile(r'^[a-z0-9][a-z0-9-]*$')
CLOCK_RE = re.compile(r"\b[0-9GgIlOo]{1,2}\s*(?:[:.]\s*[0-9]{2})?\s*[ap]\.?\s*m\b|o'?\s*clock|\bnoon\b|\bmidnight\b|\bdaybreak\b|\bsunrise\b|\bsunset\b|\bdawn\b|\bdusk\b|\bday-?light\b|\bsun\s?down\b", re.I)
PERIOD_RE = re.compile(r'morning|forenoon|afternoon|evening|night|noon|dusk|dawn|daybreak|sunset|sunrise|dark|twilight|day|next|early|late|before|after|until|while|when|then', re.I)
DATE_RE = re.compile(r'\b(?:june|july|jan|feb|mar|apr|may|aug|sept?|oct|nov|dec)\b|\b\d{1,2}(?:st|nd|rd|th|d)\b|\binst\b|\bultimo\b|\binstant\b|\bnext\b|\byesterday\b|\bto-day\b|\bday\b', re.I)


class Result:
    def __init__(self):
        self.items = []

    def add(self, level, code, row_id, msg, line=None):
        self.items.append({'level': level, 'code': code, 'row': row_id, 'line': line, 'msg': msg})

    @property
    def errors(self):
        return [i for i in self.items if i['level'] == 'error']

    @property
    def warnings(self):
        return [i for i in self.items if i['level'] == 'warn']

    def codes(self, row_id=None):
        return {i['code'] for i in self.items if row_id is None or i['row'] == row_id}


def _isint(x):
    return isinstance(x, int) and not isinstance(x, bool)


def _span_overlap(a1, b1, a2, b2):
    return max(0, min(b1, b2) - max(a1, a2))


def _check_quote(res, rid, line, st, quote, os_, oe_, label, row, opts, mode_out):
    """quote found in the text at/near the stated offsets; returns match dict"""
    lo, hi = contract()['quote_chars']
    if not isinstance(quote, str) or not (lo <= len(quote) <= hi):
        res.add('error', 'quote_length', rid, '%s must be a string of %d to %d characters (found %s)' % (label, lo, hi, len(quote) if isinstance(quote, str) else type(quote).__name__), line)
        return None
    if not (_isint(os_) and _isint(oe_) and 0 <= os_ < oe_):
        res.add('error', 'offset_invalid', rid, '%s offsets must be integers with 0 <= start < end' % label, line)
        return None
    if opts.get('no_text'):
        return {'mode': 'skipped', 'spans': []}
    m = match_quote(st, quote)
    mode_out[label] = m['mode']
    if m['mode'] == 'none':
        res.add('error', 'quote_not_found', rid, '%s not found in %s (whitespace, hyphenation, typography and OCR folds tried): %r' % (label, st.id, quote[:70]), line)
        return None
    rowspan = oe_ - os_
    best = 0
    for a, b, d in m['spans']:
        best = max(best, _span_overlap(os_, oe_, a, b) / float(max(1, min(rowspan, b - a))))
    if best < 0.5:
        near = ', '.join('%d-%d' % (a, b) for a, b, d in m['spans'][:4])
        res.add('error', 'offset_mismatch', rid, '%s is in the text but not at offsets %d-%d (found at %s)' % (label, os_, oe_, near), line)
    if m['mode'] in ('ocr', 'edit'):
        rep = row.get('ocr_repairs')
        if not (isinstance(rep, list) and rep and all(isinstance(x, dict) and x.get('ocr') and x.get('reads') and x.get('basis') in ('second_witness', 'page_image', 'context') for x in rep)):
            res.add('error', 'ocr_unexplained', rid, '%s matches only after the %s fold: declare ocr_repairs [{ocr, reads, basis}] or quote the text as printed' % (label, m['mode']), line)
        elif opts.get('strict'):
            res.add('error', 'ocr_strict', rid, '%s needed the %s fold (--strict)' % (label, m['mode']), line)
        else:
            res.add('warn', 'ocr_fold', rid, '%s matched by the %s fold with declared repairs' % (label, m['mode']), line)
    return m


def _page_check(res, rid, line, st, row, os_, oe_):
    pb = row.get('page_basis')
    pp = row.get('printed_page')
    if st.page_model == 'or27':
        if pp in (None, ''):
            res.add('error', 'page_required', rid, 'Official Records rows carry the printed page', line)
            return
        try:
            want = int(str(pp).strip().split('-')[0].lstrip('~'))
        except ValueError:
            res.add('error', 'page_invalid', rid, 'printed_page %r is not a page number' % (pp,), line)
            return
        if pb == 'scan_leaf':
            part = st.meta.get('part')
            got = [leaf_page(part, os_), leaf_page(part, max(os_, oe_ - 1))]
            if all(g is None for g in got):
                res.add('error', 'page_leafmap', rid, 'no scan-leaf page for offset %d (leaf map not built or the leaf has no printed page): use running_head or interpolated' % os_, line)
            elif want not in got:
                res.add('error', 'page_mismatch', rid, 'printed_page %s but the scan-leaf map gives %s at offsets %d-%d' % (pp, got, os_, oe_), line)
            return
        if pb not in ('running_head', 'interpolated'):
            res.add('error', 'page_basis', rid, 'Official Records page_basis is scan_leaf, running_head or interpolated', line)
            return
        rng = st.page_range(os_, oe_)
        ok = False
        for pg in rng or ():
            if pg.get('page') is None:
                continue
            if str(pg.get('conf', '')).startswith(('head', 'front')):
                ok = ok or want == pg['page']
            else:
                lo, hi = pg.get('lo'), pg.get('hi')
                ok = ok or (lo is not None and hi is not None and lo <= want <= hi)
        if not ok:
            res.add('error', 'page_mismatch', rid, 'printed_page %s does not match the page model at offset %d: %s' % (pp, os_, [(p.get('page'), p.get('conf'), p.get('lo'), p.get('hi')) for p in (rng or ())]), line)
    elif st.page_model == 'pdf_markers':
        raw = st.raw
        marks = [(m.start(), int(m.group(1))) for m in re.finditer(r'=== PAGE (\d+) ===', raw)]
        pdf = None
        for pos, n in marks:
            if pos <= os_:
                pdf = n
            else:
                break
        if row.get('pdf_page') != pdf:
            res.add('error', 'pdf_page_mismatch', rid, 'pdf_page %r but the marker before offset %d is %r' % (row.get('pdf_page'), os_, pdf), line)
    else:
        if pb not in ('none', 'section_anchor', 'running_head', 'interpolated'):
            res.add('error', 'page_basis', rid, 'page_basis %r not allowed' % pb, line)


def _record_check(res, rid, line, st, row, os_, oe_):
    sid = row.get('source_id')
    rep = row.get('report_id')
    if st.page_model == 'or27':
        if row.get('part') != st.meta.get('part'):
            res.add('error', 'part_mismatch', rid, 'part %r but %s is part %r' % (row.get('part'), sid, st.meta.get('part')), line)
        rec = st.record_at(os_) if hasattr(st, 'record_at') else None
        if rec is None and st.records:
            import bisect
            starts = [r['start_offset'] for r in st.records]
            i = bisect.bisect_right(starts, os_) - 1
            rec = st.records[i] if i >= 0 and os_ < st.records[i]['end_offset'] else None
        if not rep:
            res.add('error', 'report_required', rid, 'Official Records rows carry report_id', line)
        elif rec is None or rec['id'] != rep:
            res.add('error', 'report_mismatch', rid, 'offset %d lies in %s, not in %s' % (os_, rec['id'] if rec else 'no record', rep), line)


def _statevol_check(res, rid, line, row, os_, oe_):
    vol, secs = statevol(row.get('source_id'))
    if vol is None:
        return
    rep = row.get('report_id')
    if rep:
        sec = secs.get(rep)
        if sec is None:
            res.add('error', 'report_mismatch', rid, 'report_id %r is not a section of %s' % (rep, row.get('source_id')), line)
        elif not (sec['start'] <= os_ < sec['end']):
            res.add('error', 'report_mismatch', rid, 'offset %d is outside section %s (%d-%d)' % (os_, rep, sec['start'], sec['end']), line)
    pp = row.get('printed_page')
    if pp not in (None, '') and row.get('page_basis') in ('section_anchor', 'running_head', 'interpolated', 'scan_leaf'):
        pg = statevol_page(vol, os_)
        try:
            want = int(str(pp).strip().split('-')[0].lstrip('~'))
        except ValueError:
            res.add('error', 'page_invalid', rid, 'printed_page %r is not a page number' % (pp,), line)
            return
        if pg is not None and abs(want - pg) > 1:
            res.add('error', 'page_mismatch', rid, 'printed_page %s but the page anchors of %s put offset %d on page %s' % (pp, row.get('source_id'), os_, pg), line)


def check_row(row, line, group, res, opts, seen_ids, rows_ctx):
    C = contract()
    rid = row.get('id') if isinstance(row, dict) else None
    if not isinstance(row, dict):
        res.add('error', 'row_not_object', None, 'row is not a JSON object', line)
        return
    allowed = set(C['required']) | set(C['optional'])
    for k in row:
        if k not in allowed and not k.startswith('x_'):
            res.add('error', 'unknown_key', rid, 'unknown key %r (own fields start with x_)' % k, line)
    for k in C['required']:
        if k not in row:
            res.add('error', 'missing_key', rid, 'missing %r' % k, line)
    if rid is None:
        return
    # id
    if not isinstance(rid, str) or not re.match(r'^' + re.escape(group) + r'-[LR]\d{3,5}$', rid):
        res.add('error', 'id_prefix', rid, 'id must match %s-[LR]nnn' % group, line)
    elif rid in seen_ids:
        res.add('error', 'id_duplicate', rid, 'duplicate id (first on line %d)' % seen_ids[rid], line)
    seen_ids.setdefault(rid, line)
    if row.get('group') != group:
        res.add('error', 'group_mismatch', rid, 'group %r is not %r' % (row.get('group'), group), line)
    kind, sub = row.get('kind'), row.get('subkind')
    if kind not in ('labour', 'routine'):
        res.add('error', 'kind_invalid', rid, 'kind must be labour or routine', line)
    elif sub not in C['subkinds'][kind]:
        res.add('error', 'subkind_invalid', rid, 'subkind %r not in the %s list' % (sub, kind), line)
    elif isinstance(rid, str) and re.search(r'-([LR])\d', rid) and re.search(r'-([LR])\d', rid).group(1) != kind[0].upper():
        res.add('error', 'id_kind', rid, 'id letter must be L for labour and R for routine', line)
    # subject
    uid, wid = row.get('unit_id'), row.get('work_id')
    if uid is not None and uid not in units():
        res.add('error', 'unit_unknown', rid, 'unit_id %r is not in history/units.json' % uid, line)
    if wid is not None and wid not in rows_ctx['works']:
        res.add('error', 'work_unknown', rid, 'work_id %r is not in works_stages.json or life/inventory/works.json' % wid, line)
    generic = row.get('generic') is True
    if uid is None and wid is None and not generic:
        res.add('error', 'subject_missing', rid, 'a row names a unit_id, a work_id, or is generic: true', line)
    if row.get('builder_unknown') is True and (uid is not None or wid is None):
        res.add('error', 'builder_unknown_misuse', rid, 'builder_unknown needs work_id and no unit_id', line)
    if kind == 'labour' and uid is None and wid is None and not generic:
        res.add('error', 'labour_subject', rid, 'a labour row needs a unit_id or a work_id', line)
    if uid in units() and units()[uid].get('status') in ('never_on_field', 'never_main_field') and (row.get('place') or {}).get('map_scope') == 'battlefield':
        res.add('warn', 'unit_status', rid, 'unit %s is %s in units.json but the row places it on the battlefield' % (uid, units()[uid]['status']), line)
    # window
    w = row.get('window')
    if not isinstance(w, dict):
        res.add('error', 'window_shape', rid, 'window must be an object {start_min, end_min, basis}', line)
        w = {}
    s_, e_ = w.get('start_min'), w.get('end_min')
    if not (_isint(s_) and _isint(e_)):
        res.add('error', 'window_numbers', rid, 'window start_min and end_min are integers (page-clock minutes)', line)
    else:
        if s_ > e_:
            res.add('error', 'window_order', rid, 'window start %d is after end %d' % (s_, e_), line)
        if not (in_theatre(s_) and in_theatre(e_)):
            res.add('error', 'window_outside_theatre', rid, 'window %s .. %s is outside the theatre clock (26 Jun - 14 Jul, 18-19 Nov 1863)' % (fmt_min(s_), fmt_min(e_)), line)
        if e_ - s_ > C['window_max_days'] * 1440:
            res.add('error', 'window_too_long', rid, 'window longer than %d days' % C['window_max_days'], line)
    wb = w.get('basis')
    if wb not in C['window_bases']:
        res.add('error', 'window_basis', rid, 'window.basis %r not in window_bases' % (wb,), line)
    elif wb == 'other_row':
        df = w.get('derived_from')
        if not (isinstance(df, list) and df):
            res.add('error', 'window_derived', rid, 'window.basis other_row needs derived_from [row ids]', line)
        else:
            rows_ctx['refs'].append((rid, df, line, 'derived_from'))
    elif wb == 'sun_event' and not w.get('derived_from'):
        res.add('error', 'window_derived', rid, 'window.basis sun_event needs derived_from naming the ephemeris call', line)
    # place
    pl = row.get('place')
    if not isinstance(pl, dict) or not (isinstance(pl.get('text'), str) and pl['text'].strip()):
        res.add('error', 'place_shape', rid, 'place must be {text, map_scope} with a non-empty text', line)
        pl = pl if isinstance(pl, dict) else {}
    if pl.get('map_scope') not in C['map_scopes']:
        res.add('error', 'map_scope', rid, 'place.map_scope %r not in map_scopes' % (pl.get('map_scope'),), line)
    pe = pl.get('preexisting_ref')
    if pe is not None and pe not in C['preexisting']:
        res.add('error', 'preexisting_unknown', rid, 'place.preexisting_ref %r is not a P-nn of PDF B.7.3' % (pe,), line)
    if (pe is not None or (wid in C['preexisting'])) and sub in C['construction_subkinds']:
        res.add('error', 'construction_of_preexisting', rid, 'subkind %s would build a pre-existing feature (PDF B.7.3): use wall_improved' % sub, line)
    if sub == 'wall_improved' and pe is None:
        res.add('error', 'wall_improved_ref', rid, 'wall_improved needs place.preexisting_ref', line)
    # activity / pose
    act, pose = row.get('activity'), row.get('pose_needed')
    tier = row.get('tier')
    if act is not None and act not in clip_ids():
        res.add('error', 'clip_unknown', rid, 'activity %r is not a clip id of anim3d/clips.json' % (act,), line)
    if pose is not None and pose not in rows_ctx['poses']:
        res.add('error', 'pose_unknown', rid, 'pose_needed %r is not in poses.json' % (pose,), line)
    if (act is not None or pose is not None) and row.get('activity_basis') not in C['activity_bases']:
        res.add('error', 'activity_basis', rid, 'activity_basis must be one of %s when an activity or pose is given' % C['activity_bases'], line)
    if act is None and pose is None and tier != 'open gap':
        res.add('error', 'activity_missing', rid, 'give an existing clip (activity) or the missing pose (pose_needed)', line)
    hint = C['subkind_activity_hint'].get(sub)
    if act and hint and act not in hint and pose is None and not str(act).startswith(('march', 'stand')):
        res.add('warn', 'activity_hint', rid, 'clip %s is not among the usual clips for %s %s' % (act, sub, hint), line)
    # tools and men
    quote_all = ' '.join(x for x in (row.get('quote'), row.get('context_quote')) if isinstance(x, str))
    nums = numbers_in(quote_all)
    tp = row.get('tools_props')
    if not isinstance(tp, list):
        res.add('error', 'tools_shape', rid, 'tools_props must be a list (empty when none)', line)
        tp = []
    for t in tp:
        if not isinstance(t, dict) or not isinstance(t.get('item'), str) or t.get('role') not in C['tool_roles'] or t.get('basis') not in C['item_bases']:
            res.add('error', 'tools_item', rid, 'tools_props item needs item, role (%s) and basis (%s)' % (C['tool_roles'], C['item_bases']), line)
            continue
        cnt = t.get('count')
        if cnt is not None:
            if not (isinstance(cnt, list) and len(cnt) == 2 and all(_isint(x) and x >= 0 for x in cnt) and cnt[0] <= cnt[1]):
                res.add('error', 'tools_count', rid, 'count is null or [lo, hi] with 0 <= lo <= hi', line)
            elif t['basis'] == 'stated' and not ({cnt[0], cnt[1]} <= nums):
                res.add('error', 'number_not_in_quote', rid, 'tool count %s (stated) does not stand in the quote (numbers found: %s)' % (cnt, sorted(nums)[:12]), line)
    m = row.get('men')
    if not isinstance(m, dict) or m.get('basis') not in C['men_bases']:
        res.add('error', 'men_shape', rid, 'men must be {lo, hi, basis} with a basis from men_bases', line)
    else:
        lo_, hi_ = m.get('lo'), m.get('hi')
        if m['basis'] == 'unknown':
            if lo_ is not None or hi_ is not None:
                res.add('error', 'men_unknown', rid, 'men basis unknown means lo and hi are null', line)
        else:
            if not (_isint(lo_) and _isint(hi_) and 0 <= lo_ <= hi_ <= 100000):
                res.add('error', 'men_range', rid, 'men lo/hi must be integers with 0 <= lo <= hi', line)
            elif m['basis'] in ('stated_number', 'detail_stated') and not ({lo_, hi_} <= nums):
                res.add('error', 'number_not_in_quote', rid, 'men %s-%s (%s) do not stand in the quote (numbers found: %s)' % (lo_, hi_, m['basis'], sorted(nums)[:12]), line)
            elif m['basis'] in ('unit_strength', 'stated_fraction') and uid is None:
                res.add('error', 'men_unit', rid, 'men basis %s needs unit_id' % m['basis'], line)
    # tier
    if tier not in C['tiers']:
        res.add('error', 'tier_invalid', rid, 'tier %r not in %s' % (tier, C['tiers']), line)
        return
    tb = row.get('tier_basis')
    cls = None
    sid = row.get('source_id')
    if tier == 'open gap':
        if row.get('quote') is not None or sid is not None or row.get('offset_start') is not None:
            res.add('error', 'gap_has_quote', rid, 'an open gap has quote, source_id and offsets null', line)
        sr = row.get('searched')
        if not (isinstance(sr, list) and sr and all(isinstance(x, dict) and x.get('source_id') in rows_ctx['sources'] and x.get('pattern') and x.get('result') in C['searched_results'] for x in sr)):
            res.add('error', 'gap_searched_required', rid, 'an open gap lists searched [{source_id, pattern, result}] (a failed lookup is recorded as failed)', line)
        if not (isinstance(row.get('register_ref'), str) and re.match(r'^EG-LIFE-\d{4}$', row['register_ref'])):
            res.add('error', 'gap_register', rid, 'an open gap names register_ref EG-LIFE-nnnn', line)
        if not (isinstance(tb, str) and len(tb) >= 20):
            res.add('error', 'tier_basis_required', rid, 'say in tier_basis what is missing and where it was looked for (20+ characters)', line)
        return
    if sid not in rows_ctx['sources']:
        res.add('error', 'source_unknown', rid, 'source_id %r is not in life/evidence/sources.json (Wikipedia, forums, blogs and memory are never sources)' % (sid,), line)
        return
    meta = rows_ctx['sources'][sid]
    cls = meta['class']
    if tier not in C['source_classes'][cls]['tiers']:
        res.add('error', 'tier_class_forbidden', rid, 'a %s source (%s) cannot carry tier %s (allowed: %s)' % (cls, sid, tier, C['source_classes'][cls]['tiers']), line)
    if tier == 'documented' and generic:
        res.add('error', 'generic_documented', rid, 'a generic row is plausible-procedural, never documented', line)
    if tier == 'plausible-procedural':
        if not generic:
            res.add('error', 'generic_required', rid, 'plausible-procedural rows are generic: true (period practice, not the unit\'s act)', line)
        if not (isinstance(tb, str) and len(tb) >= 20):
            res.add('error', 'tier_basis_required', rid, 'say which practice the manual prints and how the scene uses it (20+ characters)', line)
    if tier == 'inferred' and not (isinstance(tb, str) and len(tb) >= 20):
        res.add('error', 'tier_basis_required', rid, 'inferred rows show the reasoning in tier_basis (20+ characters)', line)
    if cls == 'period_manual' and not generic:
        res.add('error', 'manual_not_generic', rid, 'a manual is generic: true', line)
    # conflicts
    cf = row.get('conflicts', [])
    if not isinstance(cf, list):
        res.add('error', 'conflicts_shape', rid, 'conflicts must be a list', line)
        cf = []
    for c in cf:
        if not (isinstance(c, dict) and c.get('id') and c.get('kind') in C['conflict_kinds'] and isinstance(c.get('other_rows'), list) and c.get('note') and c.get('scenario_key')):
            res.add('error', 'conflict_shape', rid, 'a conflict is {id, kind (%s), other_rows [], note, scenario_key}' % C['conflict_kinds'], line)
        else:
            rows_ctx['refs'].append((rid, c['other_rows'], line, 'conflict ' + str(c['id'])))
    # text checks
    if sid and (not row.get('page_basis') or row.get('page_basis') not in C['page_bases']):
        res.add('error', 'page_basis', rid, 'page_basis must be one of %s' % C['page_bases'], line)
    if row.get('text_sha256') and row['text_sha256'] != meta['sha256']:
        res.add('error', 'text_changed', rid, 'text_sha256 differs from the registry (the text changed)', line)
    if opts.get('no_text'):
        _check_quote(res, rid, line, None, row.get('quote'), row.get('offset_start'), row.get('offset_end'), 'quote', row, opts, {})
        return
    try:
        st = source_text(sid)
    except Exception as e:
        res.add('error', 'source_text', rid, 'cannot load %s: %s' % (sid, e), line)
        return
    modes = {}
    mq = _check_quote(res, rid, line, st, row.get('quote'), row.get('offset_start'), row.get('offset_end'), 'quote', row, opts, modes)
    if mq is None:
        return
    if row.get('context_quote') is not None:
        _check_quote(res, rid, line, st, row.get('context_quote'), row.get('context_offset_start'), row.get('context_offset_end'), 'context_quote', row, opts, modes)
    _record_check(res, rid, line, st, row, row['offset_start'], row['offset_end'])
    _statevol_check(res, rid, line, row, row['offset_start'], row['offset_end'])
    _page_check(res, rid, line, st, row, row['offset_start'], row['offset_end'])
    # window basis versus the quote
    if wb == 'stated_clock' and not CLOCK_RE.search(quote_all):
        res.add('error', 'window_basis_not_in_quote', rid, 'window.basis stated_clock but no hour, noon, daybreak or sunset stands in the quote or context_quote', line)
    if wb == 'stated_date' and not DATE_RE.search(quote_all):
        res.add('warn', 'window_date_not_in_quote', rid, 'window.basis stated_date but no date word stands in the quote; add context_quote with the date', line)
    rows_ctx['spans'].append((rid, line, sid, row.get('kind'), uid or wid, row['offset_start'], row['offset_end'], act))


def load_ctx(group_ids=None):
    C = contract()
    works = set(work_ids())
    wpath = os.path.join(LIFE, 'inventory', 'works.json')
    if os.path.exists(wpath):
        try:
            works |= {w['id'] for w in load_json(wpath)['works']}
        except Exception:
            pass
    poses = set()
    if os.path.exists(POSES_PATH):
        try:
            poses = {p['id'] for p in load_json(POSES_PATH)['missing_poses']}
        except Exception:
            pass
    srcs = sources()
    return {'works': works, 'poses': poses, 'sources': srcs, 'refs': [], 'spans': [], 'groups': group_ids}


def validate_file(path, group, opts, ctx, res, all_ids):
    if not GROUP_RE.match(group):
        res.add('error', 'group_name', None, 'group id %r must be lowercase letters, digits and hyphens' % group)
    if ctx['groups'] is not None and group not in ctx['groups']:
        res.add('error', 'group_unknown', None, 'group %r is not in groups.json' % group)
    seen = {}
    n = 0
    prev = None
    for ln, line in read_jsonl(path):
        n += 1
        try:
            row = json.loads(line)
        except Exception as e:
            res.add('error', 'json', None, 'line %d is not JSON: %s' % (ln, e), ln)
            continue
        check_row(row, ln, group, res, opts, seen, ctx)
        rid = row.get('id') if isinstance(row, dict) else None
        if rid and rid in all_ids and all_ids[rid][0] != group:
            res.add('error', 'id_duplicate', rid, 'id also used in group %s' % all_ids[rid][0], ln)
        if rid:
            all_ids.setdefault(rid, (group, ln))
        if rid and prev and rid < prev:
            res.add('warn', 'order', rid, 'rows are ordered by id', ln)
        prev = rid or prev
    return n


def cross_checks(ctx, res, all_ids, whole):
    for rid, refs, line, what in ctx['refs']:
        for r in refs:
            if r in all_ids:
                continue
            if isinstance(r, str) and r.startswith('register:'):
                continue
            res.add('error' if whole else 'warn', 'ref_unresolved', rid, '%s refers to %r which is not a row%s' % (what, r, '' if whole else ' of this file (other groups are checked with --all)'), line)
    # duplicates: same passage, kind and subject
    by = collections.defaultdict(list)
    for rid, line, sid, kind, subj, a, b, act in ctx['spans']:
        by[(sid, kind, subj)].append((a, b, rid, line))
    for key, lst in by.items():
        lst.sort()
        for i in range(len(lst)):
            for j in range(i + 1, len(lst)):
                a1, b1, r1, l1 = lst[i]
                a2, b2, r2, l2 = lst[j]
                if a2 >= b1:
                    break
                if _span_overlap(a1, b1, a2, b2) >= 0.5 * min(b1 - a1, b2 - a2):
                    res.add('error', 'duplicate_row', r2, 'same passage, kind and subject as %s (%s)' % (r1, key[0]), l2)


def run(groups, whole, opts):
    ctx = load_ctx(group_ids=None)
    gids = None
    if os.path.exists(GROUPS_PATH):
        try:
            gids = {g['id'] for g in load_json(GROUPS_PATH)['groups']}
        except Exception:
            gids = None
    ctx['groups'] = gids
    res = Result()
    all_ids = {}
    total = 0
    per_group = {}
    for g, path in groups:
        if not os.path.exists(path):
            res.add('error', 'file_missing', None, '%s does not exist' % path)
            continue
        per_group[g] = validate_file(path, g, opts, ctx, res, all_ids)
        total += per_group[g]
    cross_checks(ctx, res, all_ids, whole)
    return res, total, per_group


def evidence_files():
    out = []
    if os.path.isdir(EVID):
        for fn in sorted(os.listdir(EVID)):
            if fn.endswith('.jsonl') and not fn.startswith('_') and '.' not in fn[:-6]:
                out.append((fn[:-6], os.path.join(EVID, fn)))
    return out


# ------------------------------------------------------------------------------------------------------------- self-test
def self_test():
    ok = True
    log = []

    def check(name, cond, detail=''):
        nonlocal ok
        ok = ok and bool(cond)
        log.append(('PASS ' if cond else 'FAIL ') + name + (' -- ' + str(detail) if detail and not cond else ''))

    # 1. numbers
    check('numbers: dozen, hundreds, digits', {12, 250, 25, 1200} <= numbers_in('about a dozen; two hundred and fifty men; twenty-five rails; 1,200 men'))
    check('numbers: no invented figure', 40 not in numbers_in('twenty four men'))
    # 2. the matching engine on a synthetic text
    tmp = tempfile.mkdtemp(prefix='life_selftest_')
    try:
        txt = ('Preface and other matter.\n\nThe regiment arrived at the hill at about G a. m. on the morning of the 2d and at once began to in-\ntrench; the men'
               ' used the\nfew spades and shov-\nels of the “pioneer” wagon and rails taken from the fence.\n\nHDQRS. THIRD BRIGADE. 855\n\nAt noon the line was good cover for all the men'
               ' of the brigade and they were allowed to rest.\n') + ('Filler sentence about nothing in particular. ' * 40)
        tp = os.path.join(tmp, 'syn_djvu.txt')
        with open(tp, 'w', encoding='utf-8', newline='') as f:
            f.write(txt)
        sy = {'id': 'SYN-1', 'title': 'synthetic', 'class': 'regimental_volume', 'class_note': '', 'side': 'both', 'local_path': os.path.relpath(tp, ROOT).replace(os.sep, '/'),
              'bytes': len(txt), 'sha256': sha256_file(tp), 'lead': False, 'page_model': None}
        pm = dict(sy, id='SYN-MAN', **{'class': 'period_manual'})
        sources()['SYN-1'] = sy
        sources()['SYN-MAN'] = pm
        st = source_text('SYN-1')
        m1 = match_quote(st, 'began to intrench; the men used the few spades and shovels of the')
        check('match: hyphenation and whitespace joined (exact)', m1['mode'] == 'exact' and len(m1['spans']) == 1, m1)
        m2 = match_quote(st, 'used the few spades and shovels of the "pioneer" wagon')
        check('match: curly quotes (typo mode)', m2['mode'] == 'typo', m2['mode'])
        m3 = match_quote(st, 'arrived at the hill at about 6 a. m. on the morning of the 2d')
        check('match: OCR digit fold (6 for G)', m3['mode'] == 'ocr', m3['mode'])
        m4 = match_quote(st, 'At noon the line was god cover for all the men of the brigade and they were allowed to rest')
        check('match: small edit distance', m4['mode'] == 'edit', m4['mode'])
        m5 = match_quote(st, 'At noon the general ordered the whole division to march to Mars at once and rest')
        check('match: a fabricated sentence is not found', m5['mode'] == 'none', m5['mode'])
        a, b, d = m1['spans'][0]
        check('match: offsets point at the same words in the raw text', squash(txt[a:b]).startswith('began to in-') or squash(txt[a:b]).startswith('began to in'), squash(txt[a:b])[:40])
        # 3. rows on the synthetic source
        gid = 'selftest'
        U = [u for u in units() if u.startswith('us-12c-2d-greene-')][0] if any(u.startswith('us-12c-2d-greene-') for u in units()) else list(units())[10]
        clip = 'dig_shovel' if 'dig_shovel' in clip_ids() else list(clip_ids())[0]
        q1 = 'began to in-\ntrench; the men used the\nfew spades and shov-\nels of the'
        a, b, d = m1['spans'][0]
        base = {'id': gid + '-L001', 'group': gid, 'kind': 'labour', 'subkind': 'earth_parapet', 'unit_id': U, 'unit_text': 'the regiment', 'work_id': None,
                'window': {'start_min': min_of(7, 2, 6, 0), 'end_min': min_of(7, 2, 12, 0), 'basis': 'stated_clock', 'note': 'about 6 a. m. to noon'},
                'place': {'text': 'the hill', 'ref': None, 'map_scope': 'battlefield'}, 'activity': clip, 'pose_needed': None,
                'tools_props': [{'item': 'spade', 'role': 'tool', 'count': None, 'basis': 'stated'}, {'item': 'rail', 'role': 'material', 'count': None, 'basis': 'stated'}],
                'men': {'lo': None, 'hi': None, 'basis': 'unknown'}, 'tier': 'documented', 'source_id': 'SYN-1', 'part': None, 'report_id': None, 'printed_page': None,
                'page_basis': 'none', 'activity_basis': 'procedural', 'quote': q1, 'offset_start': a, 'offset_end': b,
                'context_quote': 'arrived at the hill at about 6 a. m.', 'context_offset_start': txt.index('arrived'), 'context_offset_end': txt.index('arrived') + 37,
                'conflicts': [], 'notes': None}
        base['context_quote'] = 'arrived at the hill at about G a. m.'
        base['context_offset_end'] = base['context_offset_start'] + len(base['context_quote'])

        def run_rows(rows, **opts):
            ctx = load_ctx(group_ids=None)
            ctx['sources'] = sources()
            res = Result()
            seen = {}
            for i, r in enumerate(rows, 1):
                check_row(r, i, gid, res, dict(opts), seen, ctx)
            cross_checks(ctx, res, {r['id']: (gid, 1) for r in rows if isinstance(r, dict) and 'id' in r}, True)
            return res

        def variant(**kw):
            r = json.loads(json.dumps(base))
            for k, v in kw.items():
                if v is KeyError:
                    r.pop(k, None)
                else:
                    r[k] = v
            return r
        r0 = run_rows([base])
        check('row: a valid documented row has no errors', not r0.errors, [i['code'] + ':' + i['msg'][:80] for i in r0.errors])
        if not os.path.exists(CONTRACT_PATH):
            check('contract.json exists (run build_contract.py)', False)
            return ok, log
        # mutation table: field changes that must be refused, with the code expected
        QS = 'the few spades and shovels of the "pioneer" wagon and rails taken from the fence'
        mq_ = match_quote(st, QS)
        QA, QB = mq_['spans'][0][0], mq_['spans'][0][1]
        mods = [
            ('fabricated quote', dict(quote='the regiment threw up a log breastwork two hundred yards long under fire at once'), 'quote_not_found'),
            ('offset moved', dict(offset_start=base['offset_start'] + 400, offset_end=base['offset_end'] + 400), 'offset_mismatch'),
            ('unknown clip', dict(activity='dig_with_a_backhoe'), 'clip_unknown'),
            ('unknown unit', dict(unit_id='us-99c-nobody'), 'unit_unknown'),
            ('window before the theatre', dict(window={'start_min': min_of(6, 1), 'end_min': min_of(6, 2), 'basis': 'stated_date'}), 'window_outside_theatre'),
            ('window reversed', dict(window={'start_min': min_of(7, 2, 12), 'end_min': min_of(7, 2, 6), 'basis': 'stated_clock'}), 'window_order'),
            ('window too long', dict(window={'start_min': min_of(6, 26), 'end_min': min_of(7, 14), 'basis': 'stated_date'}), 'window_too_long'),
            ('tier invalid', dict(tier='certain'), 'tier_invalid'),
            ('source not in the registry', dict(source_id='WIKIPEDIA-GETTYSBURG'), 'source_unknown'),
            ('inferred without reasoning', dict(tier='inferred'), 'tier_basis_required'),
            ('plausible-procedural without generic', dict(tier='plausible-procedural', tier_basis='the manual prints the practice of the time for all infantry'), 'generic_required'),
            ('men number not in the quote', dict(men={'lo': 400, 'hi': 500, 'basis': 'stated_number'}), 'number_not_in_quote'),
            ('tool count not in the quote', dict(tools_props=[{'item': 'spade', 'role': 'tool', 'count': [37, 37], 'basis': 'stated'}]), 'number_not_in_quote'),
            ('stated clock but no hour in the quote', dict(context_quote=None, context_offset_start=None, context_offset_end=None, quote=QS, offset_start=QA, offset_end=QB), 'window_basis_not_in_quote'),
            ('extra key', dict(speed='fast'), 'unknown_key'),
            ('id prefix', dict(id='other-L001'), 'id_prefix'),
            ('no subject', dict(unit_id=None, work_id=None), 'subject_missing'),
            ('no activity and no pose', dict(activity=None), 'activity_missing'),
            ('activity without its basis', dict(activity_basis=KeyError), 'activity_basis'),
            ('construction of a pre-existing wall', dict(place={'text': 'the Angle wall', 'ref': None, 'map_scope': 'battlefield', 'preexisting_ref': 'P-01'}), 'construction_of_preexisting'),
            ('page basis missing', dict(page_basis=KeyError), 'missing_key'),
            ('ocr fold without declared repairs', dict(quote='arrived at the hill at about 6 a. m. on the morning of the 2d', offset_start=txt.index('arrived'), offset_end=txt.index('arrived') + 55), 'ocr_unexplained'),
            ('manual cannot carry documented', dict(source_id='SYN-MAN'), 'tier_class_forbidden'),
            ('manual row must be generic', dict(source_id='SYN-MAN', tier='plausible-procedural', tier_basis='the manual prints the practice of the time for all infantry'), 'manual_not_generic'),
            ('bad conflict shape', dict(conflicts=[{'id': 'C1'}]), 'conflict_shape'),
            ('open gap with a quote', dict(tier='open gap'), 'gap_has_quote'),
        ]
        for name, kw, code in mods:
            r = run_rows([variant(**kw)])
            check('refused: %s -> %s' % (name, code), code in r.codes(), sorted(r.codes()))
        # the same fix accepted when the repair is declared
        r = run_rows([variant(quote='arrived at the hill at about 6 a. m. on the morning of the 2d', offset_start=txt.index('arrived'), offset_end=txt.index('arrived') + 55,
                              ocr_repairs=[{'ocr': 'G a. m.', 'reads': '6 a. m.', 'basis': 'context'}])])
        check('accepted: OCR repair declared', not r.errors, [i['code'] for i in r.errors])
        r = run_rows([variant(quote='arrived at the hill at about 6 a. m. on the morning of the 2d', offset_start=txt.index('arrived'), offset_end=txt.index('arrived') + 55,
                              ocr_repairs=[{'ocr': 'G a. m.', 'reads': '6 a. m.', 'basis': 'context'}])], strict=True)
        check('refused under --strict: OCR fold', 'ocr_strict' in r.codes())
        # a correct open gap row, an inferred row, a plausible-procedural manual row, a stated-number row
        gap = variant(tier='open gap', activity_basis=KeyError, source_id=None, quote=None, offset_start=None, offset_end=None, context_quote=None, context_offset_start=None, context_offset_end=None,
                      page_basis='none', activity=None, pose_needed=None, men={'lo': None, 'hi': None, 'basis': 'unknown'},
                      searched=[{'source_id': 'SYN-1', 'pattern': 'spades|shovels', 'result': 'no_hit'}], register_ref='EG-LIFE-0001',
                      tier_basis='no source read for this unit says who built the line; searched the report and the volume')
        check('accepted: a registered open gap', not run_rows([gap]).errors, [i['code'] for i in run_rows([gap]).errors])
        check('refused: open gap without searched list', 'gap_searched_required' in run_rows([dict(gap, searched=[])]).codes())
        check('refused: open gap without register_ref', 'gap_register' in run_rows([dict(gap, register_ref=None)]).codes())
        inf = variant(tier='inferred', tier_basis='the report places the brigade on the hill at six; the line stood by noon, so the work fell between them')
        check('accepted: an inferred row with its reasoning', not run_rows([inf]).errors, [i['code'] for i in run_rows([inf]).errors])
        man = variant(source_id='SYN-MAN', tier='plausible-procedural', generic=True, unit_id=None, tier_basis='the manual prints the practice for all infantry; the scene uses it and says so')
        check('accepted: a generic manual row', not run_rows([man]).errors, [i['code'] for i in run_rows([man]).errors])
        num = variant(context_quote=None, context_offset_start=None, context_offset_end=None, window={'start_min': min_of(7, 2), 'end_min': min_of(7, 2, 23, 59), 'basis': 'stated_date'})
        check('accepted: stated date window', not run_rows([num]).errors, [i['code'] for i in run_rows([num]).errors])
        d1 = variant()
        d2 = variant(id=gid + '-L002')
        check('refused: two rows on the same passage, kind and unit -> duplicate_row', 'duplicate_row' in run_rows([d1, d2]).codes())
        check('refused: the same id twice', 'id_duplicate' in run_rows([d1, dict(d1)]).codes())
        # 4. the real Official Records, when present
        real = [p for p in (1,) if os.path.exists(os.path.join(ROOT, sources().get('OR-27-%d' % p, {}).get('local_path', 'x/y')))]
        if real:
            import or27_find as F
            hits = F.search(r'threw up (?:a )?(?:slight )?(?:breast|rifle)', parts=(1,), ctx=0, max_hits=3)
            if hits:
                h = hits[0]
                stp = source_text('OR-27-1')
                raw = stp.raw
                q = squash(raw[h['start']:h['end'] + 40])[:80]
                mm = match_quote(stp, q)
                check('OR: the located passage is found again (%s)' % mm['mode'], mm['mode'] in ('exact', 'typo'), q)
                rec = h['record']
                pg = re.match(r'^(\d+)$', str(h['page']))
                row = variant(source_id='OR-27-1', part=1, report_id=rec, printed_page=pg.group(1) if pg else None, page_basis='running_head' if pg else 'interpolated',
                              quote=q, offset_start=h['start'], offset_end=h['start'] + len(q) + 8, context_quote=None, context_offset_start=None, context_offset_end=None,
                              window={'start_min': min_of(7, 2), 'end_min': min_of(7, 2, 23, 59), 'basis': 'stated_date'})
                if pg:
                    rr = run_rows([row])
                    check('OR row: record, part, page and quote all agree', not rr.errors, [i['code'] + ':' + i['msg'][:90] for i in rr.errors])
                    check('OR row: wrong page refused', 'page_mismatch' in run_rows([dict(row, printed_page=str(int(pg.group(1)) + 40))]).codes())
                    lp = leaf_page(1, h['start'])
                    if lp is not None:
                        rl = run_rows([dict(row, printed_page=str(lp), page_basis='scan_leaf')])
                        check('OR row: scan-leaf page accepted', not rl.errors, [i['code'] + ':' + i['msg'][:90] for i in rl.errors])
                        check('OR row: wrong scan-leaf page refused', 'page_mismatch' in run_rows([dict(row, printed_page=str(lp + 40), page_basis='scan_leaf')]).codes())
                    else:
                        log.append('SKIP scan-leaf checks (leaf map not built)')
                    check('OR row: wrong report refused', 'report_mismatch' in run_rows([dict(row, report_id='OR27-1-R001' if rec != 'OR27-1-R001' else 'OR27-1-R002')]).codes())
                    check('OR row: wrong part refused', 'part_mismatch' in run_rows([dict(row, part=2)]).codes())
            else:
                log.append('SKIP real Official Records row tests (no passage located)')
        else:
            log.append('SKIP real Official Records tests (text not on disk)')
        # 5. a state volume with a section index (the fence-2 citation c1: New York at Gettysburg vol. 3, section NY3-S006, printed page 991)
        nyp = sources().get('NY-GB-1902-v3', {}).get('local_path')
        if nyp and os.path.exists(os.path.join(ROOT, nyp)):
            q = 'near the garden with a picket fence at the McPherson House, a few rods east of the stone basement barn on the south side of the pike'
            m = match_quote(source_text('NY-GB-1902-v3'), q)
            if m['mode'] in ('exact', 'typo') and m['spans']:
                a, b, d = m['spans'][0]
                nrow = variant(source_id='NY-GB-1902-v3', part=None, report_id='NY3-S006', printed_page='991', page_basis='section_anchor', quote=q, offset_start=a, offset_end=b,
                               unit_id='us-12c-2d-greene', context_quote=None, context_offset_start=None, context_offset_end=None,
                               window={'start_min': min_of(7, 1), 'end_min': min_of(7, 1, 23, 59), 'basis': 'stated_date'})
                rr = run_rows([nrow])
                check('state volume row: section, page anchor and quote agree', not rr.errors, [i['code'] + ':' + i['msg'][:90] for i in rr.errors])
                check('state volume row: wrong section refused', 'report_mismatch' in run_rows([dict(nrow, report_id='NY3-S007')]).codes())
                check('state volume row: wrong page refused', 'page_mismatch' in run_rows([dict(nrow, printed_page='1100')]).codes())
            else:
                log.append('SKIP state volume row tests (quote not located)')
        else:
            log.append('SKIP state volume row tests (text not on disk)')
    finally:
        sources().pop('SYN-1', None)
        sources().pop('SYN-MAN', None)
        LL._texts.pop('SYN-1', None)
        LL._typo_views.pop('SYN-1', None)
        shutil.rmtree(tmp, ignore_errors=True)
    return ok, log


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('group', nargs='?')
    ap.add_argument('--all', action='store_true')
    ap.add_argument('--self-test', action='store_true')
    ap.add_argument('--strict', action='store_true')
    ap.add_argument('--json', action='store_true')
    ap.add_argument('--file')
    ap.add_argument('--no-text', action='store_true')
    ap.add_argument('--max-errors', type=int, default=200)
    a = ap.parse_args()
    if a.self_test:
        ok, log = self_test()
        print('\n'.join(log))
        print('SELF-TEST', 'OK' if ok else 'FAILED', '(%d checks, %d failed)' % (sum(1 for l in log if l.startswith(('PASS', 'FAIL'))), sum(1 for l in log if l.startswith('FAIL'))))
        sys.exit(0 if ok else 1)
    opts = {'strict': a.strict, 'no_text': a.no_text}
    if a.file:
        groups = [(os.path.basename(a.file).split('.')[0], a.file)]
        whole = False
    elif a.all:
        groups = evidence_files()
        whole = True
    elif a.group:
        groups = [(a.group, os.path.join(EVID, a.group + '.jsonl'))]
        whole = False
    else:
        ap.error('give a group, --all or --self-test')
    res, total, per_group = run(groups, whole, opts)
    if a.json:
        print(json.dumps({'rows': total, 'groups': per_group, 'errors': res.errors, 'warnings': res.warnings}, ensure_ascii=False, indent=1))
    else:
        for it in res.errors[:a.max_errors]:
            print('FAIL %s line %s [%s] %s' % (it['row'] or '-', it['line'], it['code'], it['msg']))
        for it in res.warnings[:50]:
            print('warn %s line %s [%s] %s' % (it['row'] or '-', it['line'], it['code'], it['msg']))
        print('%d row(s) in %d file(s): %d error(s), %d warning(s)' % (total, len(per_group), len(res.errors), len(res.warnings)))
    sys.exit(1 if res.errors else 0)


if __name__ == '__main__':
    main()

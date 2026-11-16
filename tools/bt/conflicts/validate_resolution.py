#!/usr/bin/env python3
"""Validate the resolution files of the 47 source conflicts: docs/battle-theatre/GOVERNANCE/conflicts/resolutions/C-0xx.json

    python3 -I tools/bt/conflicts/validate_resolution.py C-001 [C-002 ...]   one or more resolutions by id (exit 1 on any error)
    python3 -I tools/bt/conflicts/validate_resolution.py path/to/file.json    one file by path
    python3 -I tools/bt/conflicts/validate_resolution.py --all                every resolution file that exists (a missing one is reported, not an error)
    python3 -I tools/bt/conflicts/validate_resolution.py --all --complete     every one of the 47 must exist and pass
    python3 -I tools/bt/conflicts/validate_resolution.py --self-test          plants defects in a good fixture; every one must be caught (exit 1 if one slips through)
    python3 -I tools/bt/conflicts/validate_resolution.py --schema             print the enumerations of the format (schema.json)
    options: --strict (a warning is an error)   --json (machine output)   --max-errors N (default 60 lines per file)

What a file must satisfy is written in docs/battle-theatre/GOVERNANCE/conflicts/PLAN.md (sections 3 to 9) and listed in schema.json. In short: the id and topic are
those of conflict_register.json; the PDF row and the first delegated default are quoted exactly as the register and decisions/conflict_defaults.json have them;
every value of the PDF row and every scenario of the first delegated default is a position (none dropped), the default is one of the positions or a declared range,
every other position carries a reason it was not chosen; every position has a citation or the list of lookups that found nothing; every quote is found verbatim in
its local text at the stated offset and page (engine: tools/bt/town/validate_evidence.py check_cite through SOURCES.md, plus the scan-leaf page of the Official Records);
every clock time, number, day and name a citation says it states stands in its quote; the tier follows from the class and from the sources (a lead cannot document
anything); the source-panel text has at most 400 characters and mentions nothing about how the site was made; gap and irreducible conflicts list the searches that failed.
Run it with `python3 -I`; it reads only local files and the network is never used.
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cfl_lib as L
import cfl_parse as P
import cfl_cite as C

L.utf8_stdout()
MAX_PANEL = 400
MAX_LABEL = 120
MAX_REASON = 220
SCHEMA_ID = 'conflict-resolution-1'


def schema():
    return L.load_json(L.SCHEMA_JSON)


class Report:
    def __init__(self, label):
        self.label = label
        self.errors = []
        self.warnings = []
        self.stats = {}

    def err(self, code, msg):
        self.errors.append((code, msg))

    def warn(self, code, msg):
        self.warnings.append((code, msg))

    def extend(self, errs, warns):
        self.errors.extend(errs)
        self.warnings.extend(warns)

    def codes(self):
        return {c for c, _ in self.errors}


def _isint(x):
    return isinstance(x, int) and not isinstance(x, bool)


def _isnum(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool)


def _s(x):
    return isinstance(x, str) and bool(x.strip())


def _ws(s):
    return ' '.join(str(s).split())


ISO_DT = re.compile(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$')
ISO_D = re.compile(r'^\d{4}-\d{2}-\d{2}$')


def dt_atoms(dt):
    """('HH:MM', 'MM-DD') of an ISO local date-time."""
    return dt[11:16], dt[5:10]


def atoms_of(pos):
    """The checkable atoms of a position's value: times (HH:MM), numbers, dates (MM-DD), phrases."""
    k, v = pos.get('kind'), pos.get('value')
    a = {'times': set(), 'numbers': set(), 'dates': set(), 'phrases': set()}
    if not isinstance(v, dict):
        return a
    if k == 'time' and isinstance(v.get('at'), str) and ISO_DT.match(v['at']):
        t, d = dt_atoms(v['at'])
        a['times'].add(t)
        a['dates'].add(d)
    elif k == 'time_window':
        for key in ('from', 'to'):
            if isinstance(v.get(key), str) and ISO_DT.match(v[key]):
                t, d = dt_atoms(v[key])
                a['times'].add(t)
                a['dates'].add(d)
    elif k == 'period':
        if isinstance(v.get('date'), str) and ISO_D.match(v['date']):
            a['dates'].add(v['date'][5:10])
        if _s(v.get('text')):
            a['phrases'].add(v['text'])
    elif k == 'date':
        if isinstance(v.get('date'), str) and ISO_D.match(v['date']):
            a['dates'].add(v['date'][5:10])
    elif k == 'date_window':
        for key in ('from', 'to'):
            if isinstance(v.get(key), str) and ISO_D.match(v[key]):
                a['dates'].add(v[key][5:10])
    elif k in ('duration', 'quantity', 'count', 'count_range'):
        if isinstance(v.get('parts'), list):
            a['numbers'].update(x for x in v['parts'] if _isnum(x))
        for key in ('n', 'minutes', 'low', 'high'):
            if _isnum(v.get(key)):
                a['numbers'].add(v[key])
    elif k in ('place', 'person', 'category'):
        if _s(v.get('text')):
            a['phrases'].add(v['text'])
    return a


def stated_atoms(cites):
    s = {'times': set(), 'numbers': set(), 'dates': set(), 'phrases': set()}
    for c in cites:
        st = c.get('states') if isinstance(c, dict) else None
        if not isinstance(st, dict):
            continue
        s['times'].update(t for t in st.get('times') or [] if isinstance(t, str))
        s['numbers'].update(n for n in st.get('numbers') or [] if _isnum(n))
        s['dates'].update(d[-5:] for d in st.get('dates') or [] if isinstance(d, str))
        s['phrases'].update(p for p in st.get('phrases') or [] if isinstance(p, str))
    return s


def _num_in(n, have):
    return any(abs(float(n) - float(h)) < 1e-9 for h in have)


def atoms_missing(atoms, stated):
    miss = []
    for t in sorted(atoms['times']):
        tt = '00:00' if t == '24:00' else t
        if tt not in {('00:00' if x == '24:00' else x) for x in stated['times']}:
            miss.append('time %s' % t)
    for n in sorted(atoms['numbers']):
        if not _num_in(n, stated['numbers']):
            miss.append('number %s' % n)
    for d in sorted(atoms['dates']):
        if d not in stated['dates']:
            miss.append('day %s' % d)
    for ph in sorted(atoms['phrases']):
        sp = P.skeleton(ph)
        if not any(sp and (sp == P.skeleton(q) or sp in P.skeleton(q) or P.skeleton(q) in sp) for q in stated['phrases'] if P.skeleton(q)):
            miss.append('phrase %r' % ph)
    return miss


# ----------------------------------------------------------------------------------------------------------------------------- the checks
def check_top(R, obj, S, file_id):
    allowed = set(S['top_required']) | set(S['top_optional'])
    for k in obj:
        if k not in allowed and not str(k).startswith('x_'):
            R.err('unknown_key', 'unknown top-level key %r (own keys start with x_)' % k)
    for k in S['top_required']:
        if k not in obj:
            R.err('missing_key', 'missing top-level key %r' % k)
    if obj.get('schema') != SCHEMA_ID:
        R.err('schema_version', 'schema must be %r' % SCHEMA_ID)
    cid = obj.get('id')
    if not (isinstance(cid, str) and L.ID_RE.match(cid)):
        R.err('id_mismatch', 'id %r is not one of C-001..C-047' % cid)
        return None
    if file_id and cid != file_id:
        R.err('id_mismatch', 'id %s differs from the file name %s' % (cid, file_id))
    reg = L.register().get(cid)
    if reg is None:
        R.err('id_mismatch', 'id %s is not in conflict_register.json' % cid)
        return None
    if obj.get('topic') != reg['topic']:
        R.err('topic_mismatch', 'topic %r is not the register topic %r' % (obj.get('topic'), reg['topic']))
    for k in ('researched',):
        if not (isinstance(obj.get(k), str) and ISO_D.match(obj[k])):
            R.err('enum', '%s is an ISO date YYYY-MM-DD' % k)
    if not _s(obj.get('researcher')):
        R.err('missing_key', 'researcher is a short handle of who did the research (not shown in the product)')
    if not (isinstance(obj.get('event_date'), str) and ISO_D.match(obj['event_date'])):
        R.err('enum', 'event_date is the ISO date of the event the conflict is about (the date the sources are weighed against)')
    return cid


def check_pdf_row(R, obj, cid):
    pr = obj.get('pdf_row')
    reg, st = L.register()[cid], L.structured().get(cid) or {}
    if not isinstance(pr, dict):
        R.err('pdf_row_mismatch', 'pdf_row must be an object {page, text, values, recommended_default, selectable_alternatives}')
        return
    exp = {'page': reg['page'], 'text': reg['text'], 'values': [v['label'] for v in st.get('values', [])], 'recommended_default': st.get('pdf_recommended_default'),
           'selectable_alternatives': st.get('selectable_alternatives')}
    for k, v in exp.items():
        got = pr.get(k)
        if isinstance(v, str):
            same = isinstance(got, str) and _ws(got) == _ws(v)
        else:
            same = got == v
        if not same:
            R.err('pdf_row_mismatch', 'pdf_row.%s is not what conflict_register.json / conflicts_structured.json print: expected %r, got %r' % (k, v, got))
    for k in pr:
        if k not in exp and not str(k).startswith('x_'):
            R.err('unknown_key', 'unknown key %r in pdf_row' % k)


def check_first_delegated(R, obj, cid):
    fd = obj.get('first_delegated')
    d = L.defaults().get(cid)
    if not isinstance(fd, dict):
        R.err('delegated_mismatch', 'first_delegated must be an object {default_scenario_id, default_label, tier, basis, scenario_ids}')
        return None
    if d is None:
        R.err('delegated_mismatch', '%s is not in decisions/conflict_defaults.json' % cid)
        return None
    exp = {'default_scenario_id': d['default_scenario_id'], 'default_label': d['default_label'], 'tier': d['tier'], 'basis': d['basis'],
           'scenario_ids': [s['id'] for s in d['scenarios']]}
    for k, v in exp.items():
        got = fd.get(k)
        same = (_ws(got) == _ws(v)) if isinstance(v, str) and isinstance(got, str) else (got == v)
        if not same:
            R.err('delegated_mismatch', 'first_delegated.%s is not what decisions/conflict_defaults.json prints: expected %r, got %r' % (k, v, got))
    for k in fd:
        if k not in exp and not str(k).startswith('x_'):
            R.err('unknown_key', 'unknown key %r in first_delegated' % k)
    return exp


def check_positions(R, ctx, obj, cid, S, delegated):
    P_ = obj.get('positions')
    if not (isinstance(P_, list) and P_):
        R.err('missing_key', 'positions is a non-empty list: every value of the PDF row, the first delegated default and every value the research found')
        return {}, {'values': {}, 'scen': {}}, {}, {}
    byid, cites_of, infos = {}, {}, {}
    st = L.structured().get(cid) or {}
    pdf_values = [v['label'] for v in st.get('values', [])]
    rec_default = st.get('pdf_recommended_default')
    covered_values = {}
    scen_cov = {}
    flags_ok = set(S['flags'])
    event_date = obj.get('event_date') if isinstance(obj.get('event_date'), str) else None
    default_ids = set(((obj.get('default') or {}).get('positions')) or [])
    for i, p in enumerate(P_):
        w = 'positions[%d]' % i
        if not isinstance(p, dict):
            R.err('position_shape', '%s is not an object' % w)
            continue
        pid = p.get('id')
        w = 'position %s' % (pid or i)
        if not (isinstance(pid, str) and re.fullmatch(re.escape(cid) + r'-P\d{1,2}', pid)):
            R.err('position_shape', '%s: id must be %s-P1, %s-P2, ...' % (w, cid, cid))
            continue
        if pid in byid:
            R.err('duplicate_position', '%s: duplicate position id' % w)
            continue
        byid[pid] = p
        allowed = set(S['position_required']) | set(S['position_optional'])
        for k in p:
            if k not in allowed and not str(k).startswith('x_'):
                R.err('unknown_key', '%s: unknown key %r' % (w, k))
        for k in S['position_required']:
            if k not in p:
                R.err('missing_key', '%s: missing %r' % (w, k))
        if p.get('origin') not in S['origins']:
            R.err('enum', '%s: origin must be one of %s' % (w, ', '.join(S['origins'])))
        if p.get('kind') not in S['kinds']:
            R.err('enum', '%s: kind must be one of %s' % (w, ', '.join(S['kinds'])))
        if p.get('tier') not in S['tiers']:
            R.err('enum', '%s: tier must be one of %s' % (w, ', '.join(S['tiers'])))
        if p.get('clock') not in C.CLOCKS:
            R.err('enum', '%s: clock must be one of %s' % (w, ', '.join(C.CLOCKS)))
        if not _s(p.get('label')) or len(p.get('label') or '') > MAX_LABEL:
            R.err('label_length', '%s: label is a plain-English phrase of 1 to %d characters (it is shown in the viewer)' % (w, MAX_LABEL))
        bw = P.banned_words(p.get('label'))
        if bw:
            R.err('banned_copy', '%s: label mentions %s: product text says nothing about how the site was made' % (w, bw))
        # PDF coverage
        pl = p.get('pdf_label')
        if p.get('origin') in ('pdf_value', 'pdf_default'):
            if not _s(pl):
                R.err('pdf_label_missing', '%s: origin %s needs pdf_label, the value exactly as the PDF row prints it' % (w, p.get('origin')))
            else:
                hit = [v for v in pdf_values + ([rec_default] if rec_default else []) if _ws(v) == _ws(pl)]
                if not hit:
                    R.err('pdf_label_mismatch', '%s: pdf_label %r is neither a value nor the recommended default of the PDF row' % (w, pl))
                for v in pdf_values:
                    if _ws(v) == _ws(pl):
                        covered_values.setdefault(_ws(v), []).append(pid)
                if rec_default and _ws(rec_default) == _ws(pl):
                    covered_values.setdefault('__default__', []).append(pid)
        elif _s(pl):
            R.err('pdf_label_mismatch', '%s: pdf_label is only for origin pdf_value or pdf_default' % w)
        sids = p.get('scenario_ids', [])
        if not isinstance(sids, list) or not all(isinstance(x, str) for x in sids):
            R.err('position_shape', '%s: scenario_ids is a list of the first-pass scenario ids this position carries (C-0xx-S1, C-0xx-DEFAULT ...)' % w)
            sids = []
        for sid in sids:
            if delegated and sid not in delegated['scenario_ids']:
                R.err('scenario_unknown', '%s: scenario id %s is not a scenario of %s in conflict_defaults.json' % (w, sid, cid))
            scen_cov.setdefault(sid, []).append(pid)
        # stance and reason
        stance = p.get('stance')
        if stance not in ('default', 'selectable'):
            R.err('enum', '%s: stance is default or selectable' % w)
        elif (stance == 'default') != (pid in default_ids):
            R.err('stance_mismatch', '%s: stance %s but default.positions %s this position' % (w, stance, 'names' if pid in default_ids else 'does not name'))
        if stance == 'selectable' or pid not in default_ids:
            rn = p.get('reason_not_chosen')
            if not isinstance(rn, dict) or rn.get('kind') not in S['reason_kinds'] or not _s(rn.get('text')):
                R.err('reason_missing', '%s: a value that is not the default carries reason_not_chosen {"kind": one of %s, "text": why, in plain English}' % (w, ', '.join(S['reason_kinds'])))
            else:
                if len(rn['text']) > MAX_REASON or len(rn['text'].strip()) < 20:
                    R.err('reason_shape', '%s: reason_not_chosen.text has 20 to %d characters (it is shown in the viewer)' % (w, MAX_REASON))
                bw = P.banned_words(rn['text'])
                if bw:
                    R.err('banned_copy', '%s: reason mentions %s' % (w, bw))
        # citations
        sup = p.get('support', [])
        if not isinstance(sup, list):
            R.err('position_shape', '%s: support is a list of citations' % w)
            sup = []
        infos[pid] = []
        cites_of[pid] = sup
        for j, c in enumerate(sup):
            wc = '%s support[%d]' % (w, j)
            errs, warns = [], []
            info = C.check_citation(ctx, c, wc, errs, warns, event_date)
            R.extend(errs, warns)
            infos[pid].append(info)
        non_lead = [(c, inf) for c, inf in zip(sup, infos[pid]) if isinstance(c, dict) and not inf['lead'] and inf['class'] is not None]
        nl_ok = [(c, inf) for c, inf in non_lead if inf['ok']]
        groups = {inf['group'] for c, inf in nl_ok if inf['group']}
        fl = p.get('failed_lookups')
        if not non_lead:
            if not (isinstance(fl, list) and fl):
                R.err('failed_lookups_missing', '%s: no non-lead citation: list the lookups that found no source for this value in failed_lookups [{where, query, outcome, at}]' % w)
            else:
                _check_searches(R, fl, '%s failed_lookups' % w, 'failed_lookup_shape')
        elif fl is not None:
            _check_searches(R, fl, '%s failed_lookups' % w, 'failed_lookup_shape')
        # flags (gate spec CF-4: two independent non-lead sources or a flag)
        fg = p.get('flags', [])
        if not isinstance(fg, list) or any(f not in flags_ok for f in fg):
            R.err('enum', '%s: flags is a list of %s' % (w, ', '.join(S['flags'])))
            fg = []
        if len(groups) < 2 and not (set(fg) & {'single_source', 'unsourced', 'lead_only', 'weak', 'memoir_only'}):
            R.err('flags_missing', '%s: fewer than two independent non-lead sources (groups: %s): flag the value single_source, unsourced, lead_only, weak or memoir_only (gate spec CF-4)' % (w, sorted(groups)))
        if sup and all(inf['lead'] for inf in infos[pid]) and 'lead_only' not in fg:
            R.err('flags_missing', '%s: every citation is a lead: flag the value lead_only' % w)
        # tier against the sources
        tier = p.get('tier')
        atoms = atoms_of(p)
        if tier == 'documented':
            if not nl_ok:
                if sup and all(inf['lead'] for inf in infos[pid]):
                    R.err('lead_cannot_document', '%s: tier documented rests on a lead only (%s): a lead points to a primary source, it never documents a value' % (w, sorted({inf['source'] for inf in infos[pid]})))
                else:
                    R.err('documented_needs_non_lead', '%s: tier documented needs a non-lead citation whose quote was found at its offset' % w)
            else:
                ex = [c for c, inf in nl_ok if c.get('exact') is True]
                if not ex:
                    R.err('documented_not_exact', '%s: tier documented needs a non-lead citation with "exact": true (the quote states exactly this value)' % w)
                elif not any(isinstance(c.get('written'), dict) and c['written'].get('kind') in S['documented_kinds'] for c in ex):
                    R.err('documented_needs_witness_class', '%s: tier documented needs an exact citation that is a writing of the time or of a witness within a few years (%s); a later memoir, history, tablet or institutional text supports tier inferred at most (PLAN.md section 6)' % (w, ', '.join(S['documented_kinds'])))
                miss = atoms_missing(atoms, stated_atoms([c for c, inf in nl_ok if c.get('exact') is True]))
                if miss:
                    R.err('value_not_stated', '%s: documented, but the value is not stated by an exact citation: %s' % (w, '; '.join(miss)))
                if not any(atoms.values()) and p.get('kind') != 'none':
                    R.err('value_not_stated', '%s: the value has nothing a citation could state (check kind and value)' % w)
        elif tier == 'inferred':
            inf_ = p.get('inference')
            if not (isinstance(inf_, dict) and _s(inf_.get('step')) and len(inf_['step'].strip()) >= 20):
                R.err('inferred_basis', '%s: tier inferred needs inference {"step": what is inferred from what (at least 20 characters), "from": [citation ids or position ids]}' % w)
            if not nl_ok and not (isinstance(inf_, dict) and inf_.get('from')):
                R.err('inferred_basis', '%s: tier inferred needs a non-lead citation or premises in inference.from' % w)
            if sup and all(inf['lead'] for inf in infos[pid]) and not nl_ok:
                R.err('lead_cannot_document', '%s: tier inferred rests on a lead only: a lead cannot support an inference' % w)
            miss = atoms_missing(atoms, stated_atoms([c for c, inf in nl_ok]))
            if miss and p.get('derived') is not True:
                R.warn('rubric', '%s: inferred value with atoms no citation states (%s): set derived true and explain it in inference.step' % (w, '; '.join(miss)))
        elif tier == 'plausible-procedural':
            if not _s(p.get('procedural_basis')):
                R.err('procedural_basis', '%s: tier plausible-procedural needs procedural_basis: what stands in for the missing record (e.g. the PDF value kept as a marked stand-in)' % w)
        elif tier == 'open gap':
            if nl_ok:
                R.warn('rubric', '%s: tier open gap but the position has non-lead citations: is it not at least inferred?' % w)
        if tier in ('documented', 'inferred') and p.get('origin') in ('pdf_value', 'pdf_default') and not nl_ok:
            R.err('lead_cannot_document', '%s: a PDF-only value (no non-lead citation) cannot be %s' % (w, tier))
    return byid, {'values': covered_values, 'scen': scen_cov}, cites_of, infos


def _check_searches(R, lst, where, code):
    if not isinstance(lst, list):
        R.err(code, '%s is a list of {"where": place searched, "query": what was searched, "outcome": not_found|failed|blocked|not_read, "at": date}' % where)
        return 0
    n = 0
    for i, s in enumerate(lst):
        if not isinstance(s, dict) or not _s(s.get('where')) or not _s(s.get('query')) or s.get('outcome') not in ('not_found', 'failed', 'blocked', 'not_read') or not (isinstance(s.get('at'), str) and ISO_D.match(s['at'])):
            R.err(code, '%s[%d]: {"where", "query", "outcome": not_found|failed|blocked|not_read, "at": YYYY-MM-DD} (a search that found something is not a failed search)' % (where, i))
        else:
            n += 1
    return n


def check_coverage(R, obj, cid, delegated, cov):
    st = L.structured().get(cid) or {}
    for v in [x['label'] for x in st.get('values', [])]:
        if _ws(v) not in cov['values']:
            R.err('pdf_value_dropped', 'the PDF value %r has no position (pdf_label): every value of the PDF row stays selectable' % v)
    rd = st.get('pdf_recommended_default')
    if rd and not any(_ws(rd) == _ws(v) for v in [x['label'] for x in st.get('values', [])]) and '__default__' not in cov['values']:
        R.err('pdf_value_dropped', 'the PDF recommended default %r has no position (origin pdf_default)' % rd)
    if delegated:
        for sid in delegated['scenario_ids']:
            if sid not in cov['scen']:
                R.err('scenario_dropped', 'scenario %s of the first delegated default is carried by no position (scenario_ids): nothing is deleted' % sid)


def check_default(R, obj, cid, byid, S):
    d = obj.get('default')
    cls, tier = obj.get('class'), obj.get('tier')
    if not isinstance(d, dict):
        R.err('default_shape', 'default must be {"mode", "positions", "label", ...}')
        return
    allowed = set(S['default_keys'])
    for k in d:
        if k not in allowed and not str(k).startswith('x_'):
            R.err('unknown_key', 'unknown key %r in default' % k)
    mode = d.get('mode')
    if mode not in S['default_modes']:
        R.err('enum', 'default.mode must be one of %s' % ', '.join(S['default_modes']))
    ids = d.get('positions')
    if not (isinstance(ids, list) and ids and all(isinstance(x, str) for x in ids)):
        R.err('default_shape', 'default.positions is a non-empty list of position ids')
        return
    for x in ids:
        if x not in byid:
            R.err('default_unknown_position', 'default.positions names %s, which is not a position' % x)
    ids = [x for x in ids if x in byid]
    if not ids:
        return
    if mode == 'position' and len(ids) != 1:
        R.err('default_shape', 'default.mode position names exactly one position')
    if mode in ('range', 'window') and not _s(d.get('basis_text')):
        R.err('default_basis', 'a range or window default needs basis_text: the declared basis of the bounds (DEC-003, DEC-008)')
    if mode == 'unresolved_set' and len(ids) < 2:
        R.err('default_shape', 'default.mode unresolved_set names at least two positions (the claims that stay side by side)')
    if not _s(d.get('label')) or len(d.get('label') or '') > MAX_LABEL:
        R.err('label_length', 'default.label is a plain-English phrase of 1 to %d characters' % MAX_LABEL)
    bw = P.banned_words(d.get('label'))
    if bw:
        R.err('banned_copy', 'default.label mentions %s' % bw)
    kinds = {byid[x].get('kind') for x in ids}
    numeric = kinds <= {'count', 'count_range', 'quantity', 'duration'}
    if numeric and kinds:
        rg = d.get('range')
        if not (isinstance(rg, dict) and _isnum(rg.get('low')) and _isnum(rg.get('high')) and rg['low'] <= rg['high'] and _s(rg.get('basis'))):
            R.err('default_range', 'a numeric default carries range {"low", "high", "basis"}: the range stays visible whichever figure drives the picture (DEC-003, DEC-008)')
        else:
            v = d.get('value')
            if _isnum(v) and not (rg['low'] <= v <= rg['high']):
                R.err('default_range', 'default.value %s lies outside default.range %s-%s' % (v, rg['low'], rg['high']))
            if mode == 'position' and not _isnum(v):
                R.err('default_range', 'a numeric default of mode position carries value (the best-supported figure) as well as the range; mode range shows the range with no headline figure')
    if d.get('animation') is not None:
        an = d['animation']
        if not (isinstance(an, dict) and an.get('rule') in S['animation_rules']):
            R.err('default_animation', 'default.animation is {"at": ISO date-time or null, "rule": one of %s, "note": ...}' % ', '.join(S['animation_rules']))
        elif an.get('at') is not None and not (isinstance(an['at'], str) and ISO_DT.match(an['at'])):
            R.err('default_animation', 'default.animation.at is an ISO local date-time YYYY-MM-DDTHH:MM or null')
    # class and mode
    if cls == 'irreducible' and mode == 'position':
        R.err('class_mode', 'class irreducible: the record itself is divided, so the default is a range, a window or an unresolved set with a declared basis, not one value')
    if cls == 'settled' and mode == 'unresolved_set':
        R.err('class_mode', 'class settled cannot have an unresolved set as its default')
    # tier of the default against its positions
    ptiers = [byid[x].get('tier') for x in ids]
    weakest = L.weakest_tier(ptiers)
    if weakest and tier in L.TIER_RANK and L.TIER_RANK[tier] < L.TIER_RANK[weakest]:
        R.err('tier_better_than_support', 'tier %s is better than the weakest default position (%s): the tier of a resolution is that of the weakest position its default rests on' % (tier, weakest))
    if tier == 'documented' and any(t != 'documented' for t in ptiers):
        R.err('tier_better_than_support', 'tier documented but a default position is %s' % [t for t in ptiers if t != 'documented'])
    # the default never rests on a lead alone (gate spec CF-4)
    for x in ids:
        p = byid[x]
        sup = p.get('support') or []
        if sup and all(isinstance(c, dict) and ((c.get('source_class') == 'lead')) for c in sup) and tier not in ('plausible-procedural', 'open gap'):
            R.err('default_lead_only', 'default position %s rests on a lead only: a lead is never the basis of a default view above plausible-procedural' % x)


def check_class_tier(R, obj, S):
    cls, tier = obj.get('class'), obj.get('tier')
    if cls not in S['classes']:
        R.err('enum', 'class must be one of %s' % ', '.join(S['classes']))
    if tier not in S['tiers']:
        R.err('enum', 'tier must be one of %s' % ', '.join(S['tiers']))
    if cls in S['classes'] and tier in S['tiers'] and tier not in S['class_tiers'][cls]:
        R.err('class_tier', 'tier %s is not allowed for class %s (allowed: %s)' % (tier, cls, ', '.join(S['class_tiers'][cls])))
    b = obj.get('basis')
    if not (isinstance(b, dict) and b.get('kind') in S['basis_kinds'] and _s(b.get('text')) and len(b['text'].strip()) >= 20):
        R.err('basis_shape', 'basis is {"kind": one of %s, "text": what the default rests on (at least 20 characters)}' % ', '.join(S['basis_kinds']))
    elif tier in ('documented', 'inferred') and b['kind'] in ('gap', 'procedural'):
        R.err('basis_shape', 'basis.kind %s does not fit tier %s' % (b['kind'], tier))


def check_panel(R, obj):
    t = obj.get('source_panel_text')
    if not _s(t):
        R.err('panel_missing', 'source_panel_text is required: the plain-English text the viewer shows under the chosen value (at most %d characters)' % MAX_PANEL)
        return
    if len(t) > MAX_PANEL:
        R.err('panel_length', 'source_panel_text has %d characters; the limit is %d' % (len(t), MAX_PANEL))
    if len(t.strip()) < 60:
        R.err('panel_length', 'source_panel_text has %d characters; say what the default is, what it rests on and how many other values are listed (at least 60)' % len(t.strip()))
    bw = P.banned_words(t)
    if bw:
        R.err('banned_copy', 'source_panel_text mentions %s: product text says nothing about how the site was made' % bw)


def check_weighing(R, obj, S):
    w = obj.get('weighing')
    if not isinstance(w, dict):
        R.err('weighing_missing', 'weighing is {"summary", "who", "when", "where", "how_knew", "clock", "independence"} (the rubric of PLAN.md section 5)')
        return
    for k in S['weighing_keys']:
        if not (_s(w.get(k)) and len(w[k].strip()) >= 20):
            R.err('weighing_missing', 'weighing.%s is the reasoning on that point (at least 20 characters; "not applicable: <why>" where it does not apply)' % k)
    for k in w:
        if k not in S['weighing_keys'] and k not in ('overrides',) and not str(k).startswith('x_'):
            R.err('unknown_key', 'unknown key %r in weighing' % k)


def check_readers(R, obj, S):
    rd = obj.get('readers')
    if not isinstance(rd, list):
        R.err('readers_missing', 'readers is a list of {"kind", "ref", "must_change", "note"} (timeline rows, gates, app data and code that carry the value)')
        return
    if not rd and not _s(obj.get('readers_note')):
        R.err('readers_missing', 'readers is empty: say in readers_note which files were searched and that none reads this value')
    for i, r in enumerate(rd):
        if not (isinstance(r, dict) and r.get('kind') in S['reader_kinds'] and _s(r.get('ref')) and isinstance(r.get('must_change'), bool) and _s(r.get('note'))):
            R.err('readers_missing', 'readers[%d] is {"kind": one of %s, "ref": id or path, "must_change": true|false, "note": what changes or why not}' % (i, ', '.join(S['reader_kinds'])))


def check_holds(R, obj):
    h = obj.get('holds')
    if not isinstance(h, dict):
        R.err('holds_missing', 'holds is {"pdf_default": {"holds": yes|no|partly, "note": ...}, "first_delegated": {...}}')
        return
    for k in ('pdf_default', 'first_delegated'):
        v = h.get(k)
        if not (isinstance(v, dict) and v.get('holds') in ('yes', 'no', 'partly') and _s(v.get('note')) and len(v['note'].strip()) >= 20):
            R.err('holds_missing', 'holds.%s is {"holds": yes|no|partly, "note": why (at least 20 characters)}' % k)


def check_searches(R, obj):
    cls = obj.get('class')
    fs = obj.get('failed_searches')
    need = {'gap': 3, 'irreducible': 2}.get(cls, 0)
    if fs is None:
        fs = []
    n = _check_searches(R, fs, 'failed_searches', 'failed_search_shape')
    if need and n < need:
        R.err('failed_searches_missing', 'class %s lists the searches that failed to settle the point: at least %d, each {where, query, outcome, at} (found: %d)' % (cls, need, n))
    if cls == 'gap' and n >= need:
        wh = {_ws(s.get('where')).lower() for s in fs if isinstance(s, dict)}
        if len(wh) < 2:
            R.err('failed_searches_missing', 'class gap: the failed searches name at least two different places searched (found: %s)' % sorted(wh))
    if not _s(obj.get('what_would_change_it')) or len(obj['what_would_change_it'].strip()) < 20:
        R.err('missing_key', 'what_would_change_it says which source or fact would change the default (at least 20 characters)')


def check_brief(R, obj, cid, byid):
    """Warnings of the rubric: the default rests on a weaker citation than a rejected value; a rejected value is as well sourced as the default."""
    d = obj.get('default') or {}
    dids = [x for x in (d.get('positions') or []) if x in byid]
    WR = {'order_or_dispatch': 6, 'private_letter_or_diary': 5, 'newspaper_1863': 4, 'official_report': 5, 'reference_table': 4, 'early_narrative': 3, 'postwar_narrative': 2,
          'proceedings_or_tablet': 2, 'later_history': 1, 'institutional': 1, 'lead': 0}

    def best(p):
        b = -1
        for c in p.get('support') or []:
            if isinstance(c, dict) and c.get('source_class') != 'lead' and isinstance(c.get('written'), dict):
                k = c['written'].get('kind')
                r = WR.get(k, 0)
                if k == 'official_report' and isinstance(c['written'].get('date'), str) and re.match(r'^\d{4}-\d{2}-\d{2}$', c['written']['date']) and obj.get('event_date'):
                    import datetime
                    try:
                        gap = (datetime.date.fromisoformat(c['written']['date']) - datetime.date.fromisoformat(obj['event_date'])).days
                        r = 5 if gap <= 30 else 4 if gap <= 730 else 3
                    except ValueError:
                        pass
                b = max(b, r)
        return b
    if not dids:
        return
    db = max(best(byid[x]) for x in dids)
    for pid, p in byid.items():
        if pid in dids:
            continue
        rn = p.get('reason_not_chosen') or {}
        pb = best(p)
        if pb > db and rn.get('kind') not in ('clock', 'different_event', 'place_of_observation', 'elsewhere', 'tolerance', 'rounding', 'unclear_expression'):
            R.warn('rubric', 'position %s is supported by a better class of writing (rank %d) than the default (rank %d) and is rejected for %r: say in weighing why the default still holds' % (pid, pb, db, rn.get('kind')))
        if rn.get('kind') == 'later_memory' and pb >= db and db >= 0:
            R.warn('rubric', 'position %s is rejected as later memory but its best citation is not of a later class than the default\'s' % pid)
        if rn.get('kind') == 'no_source' and any(isinstance(c, dict) and c.get('source_class') != 'lead' for c in (p.get('support') or [])):
            R.warn('rubric', 'position %s is rejected as no_source but has non-lead citations' % pid)


def validate_obj(obj, label, ctx, file_id=None):
    R = Report(label)
    S = schema()
    if not isinstance(obj, dict):
        R.err('not_object', 'the file is not a JSON object')
        return R
    cid = check_top(R, obj, S, file_id)
    if cid is None:
        return R
    check_pdf_row(R, obj, cid)
    delegated = check_first_delegated(R, obj, cid)
    check_class_tier(R, obj, S)
    byid, cov, _cites, infos = check_positions(R, ctx, obj, cid, S, delegated)
    if byid:
        check_coverage(R, obj, cid, delegated, cov)
        check_default(R, obj, cid, byid, S)
        check_brief(R, obj, cid, byid)
    check_panel(R, obj)
    check_weighing(R, obj, S)
    check_readers(R, obj, S)
    check_holds(R, obj)
    check_searches(R, obj)
    R.stats = {'positions': len(byid), 'citations': sum(len(v) for v in infos.values()) if isinstance(infos, dict) else 0, 'class': obj.get('class'), 'tier': obj.get('tier')}
    return R


def load_file(path):
    try:
        with open(path, encoding='utf-8') as f:
            return json.load(f), None
    except UnicodeDecodeError as e:
        return None, 'the file is not UTF-8 (%s)' % str(e)[:80]
    except json.JSONDecodeError as e:
        return None, 'not JSON: %s' % str(e)[:100]
    except OSError as e:
        return None, 'cannot read: %s' % e


def validate_path(path, ctx):
    obj, err = load_file(path)
    R = Report(os.path.basename(path))
    if err:
        R.err('json_parse', err)
        return R
    fid = os.path.splitext(os.path.basename(path))[0]
    return validate_obj(obj, os.path.basename(path), ctx, fid if L.ID_RE.match(fid) else None)


def res_path(cid):
    return os.path.join(L.RESOLUTIONS, cid + '.json')


def print_report(R, maxn, strict):
    errs = list(R.errors) + (list(R.warnings) if strict else [])
    status = 'OK' if not errs else 'FAIL'
    st = R.stats
    print('%s: %s | errors %d, warnings %d%s' % (R.label, status, len(errs), len(R.warnings), (' | positions %(positions)s, citations %(citations)s, class %(class)s, tier %(tier)s' % st) if st else ''))
    for code, msg in R.errors[:maxn]:
        print('  ERROR [%s] %s' % (code, msg))
    if len(R.errors) > maxn:
        print('  ... %d more errors' % (len(R.errors) - maxn))
    for code, msg in R.warnings[:20]:
        print('  %s [%s] %s' % ('ERROR' if strict else 'warn ', code, msg))
    return not errs


def main(argv):
    flags = [a for a in argv if a.startswith('--')]
    args = [a for a in argv if not a.startswith('--')]
    maxn = 60
    if '--max-errors' in argv:
        i = argv.index('--max-errors')
        maxn = int(argv[i + 1])
        args = [a for a in args if a != argv[i + 1]]
    strict = '--strict' in flags
    if '--schema' in flags:
        print(json.dumps(schema(), indent=1, ensure_ascii=False))
        return 0
    if '--self-test' in flags:
        import cfl_selftest
        return cfl_selftest.run()
    ctx = L.new_ctx()
    results = []
    out = {}
    if '--all' in flags:
        missing = []
        for cid in L.IDS:
            p = res_path(cid)
            if not os.path.exists(p):
                missing.append(cid)
                continue
            R = validate_path(p, ctx)
            results.append((cid, R))
        n_ok = 0
        for cid, R in results:
            ok = print_report(R, maxn, strict) if '--json' not in flags else (not R.errors and not (strict and R.warnings))
            n_ok += 1 if ok else 0
            out[cid] = {'ok': ok, 'errors': R.errors, 'warnings': R.warnings, 'stats': R.stats}
        print('resolutions: %d present, %d pass, %d fail, %d missing%s' % (len(results), n_ok, len(results) - n_ok, len(missing), (' (%s)' % ', '.join(missing[:50])) if missing else ''))
        complete = '--complete' in flags
        ok_all = n_ok == len(results) and (not complete or not missing)
        if complete and missing:
            print('FAIL: --complete needs all 47 resolutions; missing: %s' % ', '.join(missing))
        for cid in missing:
            out[cid] = {'ok': False, 'missing': True}
        _write_summary(out)
        if '--json' in flags:
            print(json.dumps(out, ensure_ascii=False, indent=1, default=list))
        return 0 if ok_all else 1
    if not args:
        print(__doc__)
        return 2
    code = 0
    for a in args:
        if L.ID_RE.match(a):
            p = res_path(a)
            if not os.path.exists(p):
                print('%s: FAIL | no resolution file yet (%s)' % (a, L.rel(p)))
                code = 1
                continue
        else:
            p = a
        R = validate_path(p, ctx)
        ok = print_report(R, maxn, strict)
        out[os.path.basename(p)] = {'ok': ok, 'errors': R.errors, 'warnings': R.warnings, 'stats': R.stats}
        if not ok:
            code = 1
    _write_summary(out, partial=True)
    return code


def _write_summary(out, partial=False):
    try:
        d = os.path.join(L.TMP, 'validation')
        os.makedirs(d, exist_ok=True)
        for k, v in out.items():
            name = (k if k.startswith('C-') else k) + ('.partial' if False else '')
            L.dump_json(os.path.join(d, os.path.splitext(name)[0] + '.json'), v)
    except OSError:
        pass


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))

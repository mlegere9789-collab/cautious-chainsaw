#!/usr/bin/env python3
"""The history layer adopts the verified order-of-battle table (gate Q01.3, Q01.4, Q01.7).

    python3 -I tools/bt/oob_adopt.py --check      recompute the adoption from kit/verified_oob.json and compare it with history/units.json (exit 1 when units.json is stale)
    python3 -I tools/bt/oob_adopt.py --report     print the counts

This module owns no output file. `build_arrivals.py` (the builder that writes history/units.json) calls `apply(units)` just before it writes, so the adoption is part of the generated layer data and is
never hand-edited. `apply` adds two optional keys to a unit record and changes nothing else:

  commanders_verified   [{order, name, rank, tier, evidence_ids, from/to/change/role when the table has them}] the table's commanders with their order of succession, for a unit whose commander lines
                        include a documented line (a unit with inferred lines only is left with the printed commanders). The printed commanders (`commanders_printed`) stay as the PDF prints them.
  strength_verified     for a leaf unit (no children) that the table gives a strength: either
                        {status: 'adopted', basis_key, min, max, as_of?, tier: 'documented', basis, sources, evidence_ids, alternatives[], selection}   the documented range of one basis kind, or
                        {status: 'conflict' | 'date_unresolved', alternatives[], note}                                                                  nothing is chosen: the layer keeps its procedural share and carries the alternatives

Rules (each is declared in the record, none is hidden; the QC-3 rewrite):
  * only documented figures are adopted; an inferred range is carried as an alternative at most.
  * a unit whose strength field is a conflict set (the table's lines carry `alt` letters) is NOT given a figure: every alternative is carried, selectable, with no default (CLAUDE.md, Law cl. 6).
  * ELIGIBILITY (a figure is a candidate only if all hold; every other figure stays in the alternatives with the reason in `by_as_of_status`):
      - kind: the fighting strength: basis taken_into_action, present_for_duty, effective_total or estimate_in_report (the report's own estimate of the men in the fight); an aggregate (aggregate_present, aggregate_present_and_absent), a
        roll (muster_or_roll) or a derived figure is not the men who fought; `officers_only` is a component, never a total;
      - date: the figure's as_of/period overlaps the battle (1-3 July 1863), or, when no eligible count lies inside it, it is a RETURN (present_for_duty or effective_total: a statement of the men present on a day, not
        of an engagement) dated 1 to PRE_BATTLE_DAYS (7) days before 1 July, the nearest date before the unit came on the field (the return of 30 June); an engagement figure dated before the battle (Chancellorsville, Upperville)
        is another engagement, a figure dated after the battle or undated is not the battle's.
  * RANK: bounds last, then kind (taken_into_action > present_for_duty > effective_total > estimate_in_report), then closeness of date (inside the battle first, earliest; else the nearest before), then men kind
    (officers_and_men > not_stated > rank_and_file > enlisted_only); never by key order. The ranking is a modelling choice of this builder, recorded in each record (`selection`) and open to the owner.
  * HEDGES (read from the evidence line's text_figure): 'less than', 'not more than', 'not over', 'not exceeding' (or a range whose low is 0) is an UPPER BOUND; 'over', 'more than', 'upwards of', 'at least' a LOWER BOUND;
    'about', 'nearly', 'some', 'near', 'approximately' an APPROXIMATE figure. A bound is never drawn as an exact documented count: where it is the only eligible figure the record is status `bound_only`
    ({bound: {kind, value, hedge, ...}}), no count is adopted, the figure drawn stays the procedural share clamped to the bound by the app (real.mjs), and the unit is flagged (`flag: 'bound_only'`). An approximate figure is adopted
    with `exact: false` and `hedge` in the record, the hedge is in the basis text, and it is not drawn as an exact count (the app marks the strength `approximate`).
  * MUSKETS: men `enlisted_only` / `rank_and_file` are muskets (or rank and file), not the total. Officers are added only from a documented `officers_only` figure of the same basis, date and report (the 27th Virginia: 114
    muskets + 15 officers = 129, `composition` names both lines); with no such figure the record's `figure_kind` is 'muskets' and the total drawn is the muskets figure, within [muskets, muskets + officers], the officers
    being undocumented (`officers_documented: false`).
  * a range that spans dates is adopted on the figure of ONE date, the best-ranked (inside the battle: the earliest; else the nearest before); every other date stays in the alternatives.
  * the figures drawn = the top of the declared range (contract strengthDrawn); a documented figure and its basis replace a procedural share, nothing else changes an instanced count.
"""
import argparse, copy, datetime, glob, hashlib, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
BT = os.path.join(ROOT, 'docs', 'battle-theatre')
TABLE = os.path.join(BT, 'kit', 'verified_oob.json')
SOURCES = os.path.join(BT, 'kit', 'evidence', 'sources.json')
UNITS = os.path.join(BT, 'history', 'units.json')

BASIS_ORDER = ['taken_into_action', 'present_for_duty', 'effective_total', 'aggregate_present', 'estimate_in_report', 'muster_or_roll', 'derived', 'aggregate_present_and_absent']   # display order of the alternatives only
MEN_ORDER = ['officers_and_men', 'not_stated', 'rank_and_file', 'enlisted_only', 'officers_only']
FIGHT_KINDS = ['taken_into_action', 'present_for_duty', 'effective_total', 'estimate_in_report']      # the fighting strength, in rank order
RETURN_KINDS = ('present_for_duty', 'effective_total')          # a return states the men present on a day: the only kind of figure that may stand for the battle from before it
MUSKET_MEN = ('enlisted_only', 'rank_and_file')                 # not the total: officers are not in them
TOTAL_MEN = ('officers_and_men', 'not_stated')
BATTLE = ('1863-07-01', '1863-07-03')
PRE_BATTLE_DAYS = 7
EVIDENCE_DIR = os.path.join(BT, 'kit', 'evidence')
QUOTE_UPPER = re.compile(r'\b(less than|not more than|no more than|not over|not exceeding|fewer than)\s+((?:about\s+)?(?:\d[\d,]*|[a-z]+(?:[- ][a-z]+)?))', re.I)     # a printed upper bound in the quote of a line whose text_figure does not carry it
UPPER = re.compile(r'\b(less than|not more than|no more than|not over|not exceeding|fewer than|under|at most)\b', re.I)
LOWER = re.compile(r'\b(over|more than|upwards? of|at least|exceeding)\b', re.I)
APPROX = re.compile(r'\b(about|nearly|some|near|approximately|say|estimated)\b', re.I)
SELECTION = ('eligible: the fighting strength (taken_into_action, present_for_duty, effective_total, estimate_in_report; never an aggregate, roll or derived figure, never officers_only alone) whose date overlaps 1-3 July 1863, '
             'or, with no count inside the battle, a return (present_for_duty, effective_total) dated 1 to 7 days before it; ranked bounds last, then kind in that order, then date (inside the battle: the earliest; else the nearest before), then men kind, never by key order; '
             'a bound (less than / not more than / over / at least) is carried as a bound and never adopted as a count (status bound_only: the share stays, clamped to the bound); an approximate figure (about / nearly) is adopted as not exact; '
             'muskets (enlisted_only, rank_and_file) are not the total, officers are added only from a documented officers_only figure of the same basis, date and report; a conflict set is never resolved here (tools/bt/oob_adopt.py)')


def load_table(path=TABLE):
    try:
        with open(path, encoding='utf-8') as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


def file_sha(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        h.update(f.read())
    return h.hexdigest()


def _key_rank(key):
    basis, _, men = key.partition('|')
    b = BASIS_ORDER.index(basis) if basis in BASIS_ORDER else len(BASIS_ORDER)
    m = MEN_ORDER.index(men) if men in MEN_ORDER else len(MEN_ORDER)
    return (b, m, key)


_EVIDENCE = {}


def load_evidence(directory=EVIDENCE_DIR):
    """{evidence id: {text_figure, quote}} of the evidence lines (read only; this module never writes them): the printed hedge of a figure is in text_figure."""
    if directory in _EVIDENCE:
        return _EVIDENCE[directory]
    out = {}
    for p in sorted(glob.glob(os.path.join(directory, '*.jsonl'))):
        try:
            with open(p, encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        d = json.loads(line)
                    except ValueError:
                        continue
                    if d.get('id'):
                        v = d.get('value') or {}
                        out[d['id']] = {'text_figure': v.get('text_figure'), 'quote': d.get('quote')}
        except OSError:
            continue
    _EVIDENCE[directory] = out
    return out


def hedge_of(fig, evidence):
    """-> None, or {kind: upper|lower|approximate, word, text} of one table figure: the hedge of the printed words (evidence text_figure); a range with low 0 and high > 0 is an upper bound whatever the words."""
    texts = [(evidence.get(e) or {}).get('text_figure') for e in fig.get('evidence_ids') or []]
    texts = [t for t in texts if t]
    for t in texts:
        for kind, rx in (('upper', UPPER), ('lower', LOWER), ('approximate', APPROX)):
            m = rx.search(t)
            if m:
                return {'kind': kind, 'word': m.group(1).lower(), 'text': t}
    for e in fig.get('evidence_ids') or []:
        m = QUOTE_UPPER.search((evidence.get(e) or {}).get('quote') or '')
        if m:
            return {'kind': 'upper', 'word': m.group(1).lower(), 'text': m.group(0)}
    if fig.get('low') == 0 and (fig.get('high') or 0) > 0:
        return {'kind': 'upper', 'word': 'low 0 (no lower bound stated)', 'text': texts[0] if texts else None}
    return None


def _span(d):
    """(start, end) of an as_of: '1863-07-01' or '1863-07-01/1863-07-03'; None for no date / 'undated'."""
    if not d or d == 'undated':
        return None
    a, _, b = d.partition('/')
    return a, (b or a)


def _days_before_battle(span):
    try:
        return (datetime.date.fromisoformat(BATTLE[0]) - datetime.date.fromisoformat(span[1])).days
    except ValueError:
        return None


def date_class(basis, as_of):
    """-> (distance, reason): distance 0 for a date in the battle, n > 0 days before it for an eligible return, else (None, why not eligible)."""
    sp = _span(as_of)
    if sp is None:
        return None, 'no date'
    if sp[0] <= BATTLE[1] and sp[1] >= BATTLE[0]:
        return 0, None
    if sp[1] > BATTLE[1]:
        return None, 'dated after the battle'
    n = _days_before_battle(sp)
    if basis not in RETURN_KINDS:
        return None, 'an engagement figure dated before the battle (%s): another engagement' % as_of
    if n is None or n > PRE_BATTLE_DAYS:
        return None, 'a return dated %s, more than %d days before the battle' % (as_of, PRE_BATTLE_DAYS)
    return n, None


def candidates(tu, evidence=None):
    """Documented figures of a table row grouped by (basis, men, as_of): [{key, basis, men, as_of, low, high, figs, hedge, dist, why}], eligible ones have why None."""
    evidence = evidence or {}
    groups = {}
    for f in (tu.get('strength') or {}).get('figures') or []:
        if f.get('tier') != 'documented':
            continue
        groups.setdefault((f.get('basis'), f.get('men'), f.get('as_of') or 'undated'), []).append(f)
    out = []
    for (basis, men, as_of), figs in groups.items():
        hs = [h for h in (hedge_of(f, evidence) for f in figs) if h]
        rank = {'upper': 0, 'lower': 1, 'approximate': 2}
        hedge = sorted(hs, key=lambda h: rank[h['kind']])[0] if hs else None
        dist, why = date_class(basis, as_of)
        if why is None and basis not in FIGHT_KINDS:
            why = 'not the fighting strength (%s)' % basis
        if why is None and men not in TOTAL_MEN + MUSKET_MEN:
            why = 'men kind %s is not a total strength' % men
        out.append({'key': basis + '|' + men, 'basis': basis, 'men': men, 'as_of': as_of, 'low': min(f['low'] for f in figs), 'high': max(f['high'] for f in figs), 'figs': figs, 'hedge': hedge, 'dist': dist, 'why': why})
    if any(c['why'] is None and c['dist'] == 0 and not (c['hedge'] and c['hedge']['kind'] in ('upper', 'lower')) for c in out):
        for c in out:
            if c['why'] is None and c['dist']:
                c['why'] = 'a figure inside the battle exists; a return before it is used only when no count lies inside it'
    return out


def _rank(c):
    bound = c['hedge'] is not None and c['hedge']['kind'] in ('upper', 'lower')
    return (bound, FIGHT_KINDS.index(c['basis']), c['dist'], _span(c['as_of'])[0], MEN_ORDER.index(c['men']) if c['men'] in MEN_ORDER else 99, c['key'])


def _alternatives(tu, cands=None):
    """Every range of the table row, one entry per basis key (and per date): carried by the layer whatever it adopts. `by_as_of_status` says per date why a figure is or is not eligible and what hedge it carries."""
    status = {}
    for c in cands or []:
        status.setdefault(c['key'], {})[c['as_of']] = {'eligible': c['why'] is None, **({'why_not': c['why']} if c['why'] else {}), **({'hedge': c['hedge']['kind'], 'hedge_word': c['hedge']['word']} if c['hedge'] else {})}
    out = []
    for k, r in sorted(((tu.get('strength') or {}).get('ranges') or {}).items(), key=lambda kv: _key_rank(kv[0])):
        by = r.get('by_as_of') or {}
        e = {'key': k, 'low': r['low'], 'high': r['high'], 'tier': r.get('tier'), 'spans_dates': bool(r.get('spans_dates')),
             'by_as_of': {d: [v['low'], v['high']] for d, v in sorted(by.items())}}
        if k in status:
            e['by_as_of_status'] = {d: status[k][d] for d in sorted(status[k])}
        out.append(e)
    return out


def _cites(figs, sources):
    srcs, cites, ev = [], [], set()
    for f in figs:
        c = f.get('cite') or {}
        sid = c.get('source_id')
        if sid and sid not in srcs and (sources is None or sid in sources):
            srcs.append(sid)                                   # the volume; the reports and pages are in `cites`: a report id in `sources` would tie other basis keys of the same report to this figure (Q01.3 pick_ranges)
        cites.append({k: c[k] for k in ('report_id', 'printed_page') if c.get(k) is not None} | {'evidence_id': (f.get('evidence_ids') or [None])[0]})
        ev.update(f.get('evidence_ids') or [])
    return srcs, cites, sorted(ev)


def _officers_of(c, cands):
    """The documented officers_only group of the same basis, date and report as a musket figure, or None."""
    rids = {(f.get('cite') or {}).get('report_id') for f in c['figs']}
    for o in cands:
        if o['key'] == c['basis'] + '|officers_only' and o['as_of'] == c['as_of'] and not o['hedge'] and {(f.get('cite') or {}).get('report_id') for f in o['figs']} == rids:
            return o
    return None


def strength_record(tu, sources=None, evidence=None):
    """-> strength_verified record of a leaf unit's table row, or None when the table holds no range for it."""
    ranges = ((tu or {}).get('strength') or {}).get('ranges') or {}
    if not ranges:
        return None
    cands = candidates(tu, evidence)
    alts = _alternatives(tu, cands)
    if (tu.get('fields') or {}).get('strength') == 'conflict' or any(f.get('alt') for f in (tu.get('strength') or {}).get('figures') or []):
        return {'status': 'conflict', 'alternatives': alts, 'default': None,
                'note': 'the table holds a conflict set for this unit: every alternative is carried as a selectable scenario and none is the default; the figure drawn stays the procedural share until the owner decides'}
    elig = sorted((c for c in cands if c['why'] is None), key=_rank)
    if not cands:
        return {'status': 'no_documented_range', 'alternatives': alts, 'default': None, 'note': 'the table holds no documented range for this unit; inferred ranges are carried as alternatives only'}
    if not elig:
        return {'status': 'no_eligible_figure', 'alternatives': alts, 'default': None, 'flag': 'no_eligible_figure',
                'note': 'no documented figure is the fighting strength at the battle (%s): the figure drawn stays the procedural share' % '; '.join('%s on %s: %s' % (c['key'], c['as_of'], c['why']) for c in sorted(cands, key=lambda c: (c['key'], c['as_of'])))}
    c = elig[0]
    h = c['hedge']
    if h and h['kind'] in ('upper', 'lower'):
        val = c['high'] if h['kind'] == 'upper' else c['low']
        srcs, cites, ev = _cites(c['figs'], sources)
        return {'status': 'bound_only', 'flag': 'bound_only', 'tier': 'documented', 'default': None,
                'bound': {'kind': h['kind'], 'value': val, 'hedge': h['text'] or h['word'], 'basis_key': c['key'], 'as_of': c['as_of'], **({'low': c['low'], 'low_note': 'the table line gives a low end (arithmetic of the same passage, not printed)'} if h['kind'] == 'upper' and c['low'] > 0 else {})},
                'basis': 'documented bound, not a count: the report says "%s" (%s on %s). The figure drawn stays the procedural share, clamped to the bound (%s %s%s).' % (h['text'] or h['word'], c['key'], c['as_of'], 'at most' if h['kind'] == 'upper' else 'at least', val, ', and at least %s, the table line\'s low end' % c['low'] if h['kind'] == 'upper' and c['low'] > 0 else ''),
                'sources': srcs, 'cites': cites, 'evidence_ids': ev, 'alternatives': alts,
                'note': 'only bounds are eligible for this unit: no figure is adopted; the share is clamped to the %s bound %s and the unit is flagged' % (h['kind'], val)}
    lo, hi = c['low'], c['high']
    figs = list(c['figs'])
    kind = c['men']
    composition = [{'key': c['key'], 'low': lo, 'high': hi, 'evidence_ids': sorted({e for f in c['figs'] for e in f.get('evidence_ids') or []})}]
    officers_documented = None
    if c['men'] in MUSKET_MEN:
        o = _officers_of(c, cands)
        if o:
            lo, hi = lo + o['low'], hi + o['high']
            figs += o['figs']
            composition.append({'key': o['key'], 'low': o['low'], 'high': o['high'], 'evidence_ids': sorted({e for f in o['figs'] for e in f.get('evidence_ids') or []})})
            kind, officers_documented = 'officers_and_men', True
        else:
            kind, officers_documented = 'muskets', False
    same = [x for x in elig if x['key'] == c['key'] and not x['hedge']]
    how = None
    if len({x['as_of'] for x in same}) > 1:
        how = 'the same figure on every date' if len({(x['low'], x['high']) for x in same}) == 1 else ('earliest dated figure inside the battle' if c['dist'] == 0 else 'nearest dated return before the battle')
    srcs, cites, ev = _cites(figs, sources)
    text = ranges[c['key']].get('basis') or c['key']
    hedge_txt = ''
    if h:
        hedge_txt = ' Stated with a hedge: "%s" (approximate, not an exact count).' % (h['text'] or h['word'])
    comp_txt = ''
    if officers_documented:
        comp_txt = ' Total = %s %s + officers_only %s (documented, same report and date).' % (c['men'], c['low'] if c['low'] == c['high'] else '%s-%s' % (c['low'], c['high']), '%s' % composition[1]['low'] if composition[1]['low'] == composition[1]['high'] else '%s-%s' % (composition[1]['low'], composition[1]['high']))
    elif officers_documented is False:
        comp_txt = ' Muskets / rank and file only: no officers figure is documented, so the total drawn is the muskets figure (the officers are not counted).'
    basis = 'documented: %s; range %s to %s on %s%s%s.%s%s Drawn: the top of the declared range (selection rule: units.json meta.oob_adoption.selection).%s' % (
        text, lo, hi, c['as_of'], ' (%s; the other dates are in the alternatives)' % how if how else '', '', hedge_txt, comp_txt,
        ' Other documented bases of this unit are carried as alternatives; the record does not rank them.' if len(alts) > 1 else '')
    rec = {'status': 'adopted', 'basis_key': c['key'], 'min': lo, 'max': hi, 'tier': 'documented', 'basis': basis, 'sources': srcs, 'cites': cites, 'evidence_ids': ev, 'alternatives': alts,
           'figure_kind': kind, 'exact': h is None, 'as_of': c['as_of']}
    if len(composition) > 1:
        rec['composition'] = composition
    if officers_documented is not None:
        rec['officers_documented'] = officers_documented
    if h:
        rec['hedge'] = {'kind': h['kind'], 'word': h['word'], 'text': h['text']}
    if _span(c['as_of']) is None:
        rec.pop('as_of')
    return rec


def commanders_record(tu):
    cm = (tu or {}).get('commanders') or []
    if not cm or not any(c.get('tier') == 'documented' for c in cm):
        return None
    out = []
    for c in sorted(cm, key=lambda c: (c.get('order') or 0, c.get('name') or '')):
        r = {'order': c.get('order'), 'name': c.get('name'), 'rank': c.get('rank_printed') or c.get('rank'), 'tier': c.get('tier'), 'evidence_ids': list(c.get('evidence_ids') or [])}
        for k in ('role', 'from', 'to', 'change'):
            if c.get(k) is not None:
                r[k] = c[k]
        out.append(r)
    return out


def source_registry(units, sources_doc):
    """{id: {label, kind, cite}} for the source ids that the adopted records name (the layer lists them in its source table)."""
    srcs = (sources_doc or {}).get('sources') or {}
    out = {}
    for u in units:
        for rec in (u.get('strength_verified'),):
            if rec and rec.get('status') in ('adopted', 'bound_only'):
                for s in rec['sources']:
                    if s not in out:
                        d = srcs.get(s)
                        out[s] = {'label': (d or {}).get('title') or 'report %s (Official Records or a state volume, see kit/evidence)' % s, 'cite': (d or {}).get('cite') or 'report %s' % s, 'weak': bool((d or {}).get('lead', False))}
    return out


def apply(units, table=None, table_path=TABLE, sources_path=SOURCES, evidence=None):
    """Adds `commanders_verified` and `strength_verified` to the unit records in place; returns a summary dict (also stored by the builder in units.json meta)."""
    for u in units:
        u.pop('commanders_verified', None)
        u.pop('strength_verified', None)
    table = table if table is not None else load_table(table_path)
    if not table:
        return {'applied': False, 'reason': 'kit/verified_oob.json is absent'}
    try:
        with open(sources_path, encoding='utf-8') as f:
            sdoc = json.load(f)
    except (OSError, ValueError):
        sdoc = None
    srcs = (sdoc or {}).get('sources')
    tu = table['units']
    evidence = evidence if evidence is not None else load_evidence()
    cnt = {'commanders': 0, 'strength_adopted': 0, 'strength_conflict': 0, 'strength_bound_only': 0, 'strength_no_eligible_figure': 0, 'strength_no_documented_range': 0}
    for u in units:
        t = tu.get(u['id'])
        if not t:
            continue
        c = commanders_record(t)
        if c:
            u['commanders_verified'] = c
            cnt['commanders'] += 1
        if not u.get('children'):
            s = strength_record(t, srcs, evidence)
            if s:
                u['strength_verified'] = s
                cnt['strength_' + s['status']] += 1
    return {'applied': True, 'table_sha256': file_sha(table_path) if table is not None and os.path.exists(table_path) else None, 'counts': cnt, 'selection': SELECTION, 'sources': source_registry(units, sdoc)}


def check(units_path=UNITS, table_path=TABLE):
    """-> list of problems: units.json must equal what `apply` gives on its own units."""
    with open(units_path, encoding='utf-8') as f:
        doc = json.load(f)
    fresh = copy.deepcopy(doc['units'])
    summary = apply(fresh, table_path=table_path)
    bad = []
    if (doc.get('meta') or {}).get('oob_adoption') != summary:
        bad.append('meta.oob_adoption is stale: builder gives %s' % json.dumps(summary.get('counts')))
    have = {u['id']: (u.get('commanders_verified'), u.get('strength_verified')) for u in doc['units']}
    for u in fresh:
        h = have.get(u['id'])
        if h != (u.get('commanders_verified'), u.get('strength_verified')):
            bad.append('unit %s: adoption record differs from the verified table' % u['id'])
    return bad


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--check', action='store_true')
    ap.add_argument('--report', action='store_true')
    ap.add_argument('--units', default=UNITS)
    ap.add_argument('--table', default=TABLE)
    a = ap.parse_args(argv)
    if a.check:
        bad = check(a.units, a.table)
        for b in bad[:20]:
            print('STALE', b)
        print('oob_adopt --check: %s' % ('stale (%d problems); run tools/bt/build_arrivals.py' % len(bad) if bad else 'history/units.json holds exactly what the verified table gives'))
        return 1 if bad else 0
    with open(a.units, encoding='utf-8') as f:
        doc = json.load(f)
    print(json.dumps((doc.get('meta') or {}).get('oob_adoption'), indent=1))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))

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

Rules (each is declared in the record, none is hidden):
  * only documented ranges are adopted; an inferred range is carried as an alternative at most.
  * a unit whose strength field is a conflict set (the table's lines carry `alt` letters) is NOT given a figure: every alternative is carried, selectable, with no default (CLAUDE.md, Law cl. 6).
  * kinds are never mixed (the table's own rule): the layer names ONE basis key (basis|men) and the range of that key. Where a unit has several documented bases (a return of 30 June, a statement of the men taken
    into action) they measure different things, not one conflicted thing; the layer draws the basis that counts the men who went into the battle (BASIS_ORDER: taken into action first) and carries every other
    documented basis as an alternative. That order is a modelling choice of this builder, recorded in each record (`selection`) and open to the owner.
  * a range that spans dates is adopted on the figure of ONE date only when exactly one of its dates lies in the battle (1-3 July 1863); otherwise status date_unresolved (no date is picked for the owner).
  * the figures drawn = the top of the declared range (contract strengthDrawn); a documented figure and its basis replace a procedural share, nothing else changes an instanced count.
"""
import argparse, copy, hashlib, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
BT = os.path.join(ROOT, 'docs', 'battle-theatre')
TABLE = os.path.join(BT, 'kit', 'verified_oob.json')
SOURCES = os.path.join(BT, 'kit', 'evidence', 'sources.json')
UNITS = os.path.join(BT, 'history', 'units.json')

BASIS_ORDER = ['taken_into_action', 'present_for_duty', 'effective_total', 'aggregate_present', 'estimate_in_report', 'muster_or_roll', 'derived', 'aggregate_present_and_absent']
MEN_ORDER = ['officers_and_men', 'not_stated', 'enlisted_only', 'officers_only']
BATTLE = ('1863-07-01', '1863-07-03')
SELECTION = ('basis preference taken_into_action > present_for_duty > effective_total > aggregate_present > estimate_in_report > muster_or_roll > derived > aggregate_present_and_absent; '
             'men kind officers_and_men > not_stated > enlisted_only; a date-spanning range only on its one battle date; a conflict set is never resolved here (tools/bt/oob_adopt.py)')


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


def _alternatives(tu):
    """Every range of the table row, one entry per basis key (and per date): carried by the layer whatever it adopts."""
    out = []
    for k, r in sorted(((tu.get('strength') or {}).get('ranges') or {}).items(), key=lambda kv: _key_rank(kv[0])):
        by = r.get('by_as_of') or {}
        out.append({'key': k, 'low': r['low'], 'high': r['high'], 'tier': r.get('tier'), 'spans_dates': bool(r.get('spans_dates')),
                    'by_as_of': {d: [v['low'], v['high']] for d, v in sorted(by.items())}})
    return out


def _lines_of(tu, key):
    basis, _, men = key.partition('|')
    return [f for f in (tu.get('strength') or {}).get('figures') or [] if f.get('basis') == basis and f.get('men') == men and f.get('tier') == 'documented']


def _battle_dates(by):
    return sorted(d for d in by if d != 'undated' and BATTLE[0] <= d <= BATTLE[1])


def strength_record(tu, sources=None):
    """-> strength_verified record of a leaf unit's table row, or None when the table holds no range for it."""
    ranges = ((tu or {}).get('strength') or {}).get('ranges') or {}
    if not ranges:
        return None
    alts = _alternatives(tu)
    if (tu.get('fields') or {}).get('strength') == 'conflict' or any(f.get('alt') for f in (tu.get('strength') or {}).get('figures') or []):
        return {'status': 'conflict', 'alternatives': alts, 'default': None,
                'note': 'the table holds a conflict set for this unit: every alternative is carried as a selectable scenario and none is the default; the figure drawn stays the procedural share until the owner decides'}
    unresolved = None
    for key in sorted((k for k, r in ranges.items() if r.get('tier') == 'documented'), key=_key_rank):
        r = ranges[key]
        by = r.get('by_as_of') or {}
        as_of = None
        lo, hi = r['low'], r['high']
        if r.get('spans_dates'):
            bd = _battle_dates(by)
            if len(bd) != 1:
                unresolved = unresolved or key
                continue
            as_of = bd[0]
            lo, hi = by[as_of]['low'], by[as_of]['high']
        else:
            real = [d for d in by if d != 'undated']
            if len(real) == 1 and 'undated' not in by:
                as_of = real[0]
        lines = _lines_of(tu, key)
        ev = sorted({e for f in lines for e in f.get('evidence_ids') or []})
        srcs = []
        for f in lines:
            c = f.get('cite') or {}
            for s in (c.get('report_id'), c.get('source_id')):
                if s and s not in srcs and (s == c.get('report_id') or sources is None or s in sources):
                    srcs.append(s)
        text = r.get('basis') or key
        basis = 'documented: %s; range %s to %s%s. Drawn: the top of the declared range (selection rule: units.json meta.oob_adoption.selection).%s' % (text, lo, hi, ' on %s' % as_of if as_of else '',
                                                                                          ' Other documented bases of this unit are carried as alternatives; the record does not rank them.' if len(alts) > 1 else '')
        rec = {'status': 'adopted', 'basis_key': key, 'min': lo, 'max': hi, 'tier': 'documented', 'basis': basis, 'sources': srcs, 'evidence_ids': ev, 'alternatives': alts}
        if as_of:
            rec['as_of'] = as_of
        return rec
    return {'status': 'date_unresolved' if unresolved else 'no_documented_range', 'alternatives': alts, 'default': None,
            'note': ('the range of %s spans several dates and not exactly one of them lies in the battle: no date is picked for the owner' % unresolved) if unresolved else 'the table holds no documented range for this unit; inferred ranges are carried as alternatives only'}


def source_registry(units, sources_doc):
    """{id: {label, kind, cite}} for the source ids that the adopted records name (the layer lists them in its source table)."""
    srcs = (sources_doc or {}).get('sources') or {}
    out = {}
    for u in units:
        for rec in (u.get('strength_verified'),):
            if rec and rec.get('status') == 'adopted':
                for s in rec['sources']:
                    if s not in out:
                        d = srcs.get(s)
                        out[s] = {'label': (d or {}).get('title') or 'report %s (Official Records or a state volume, see kit/evidence)' % s, 'cite': (d or {}).get('cite') or 'report %s' % s, 'weak': bool((d or {}).get('lead', False))}
    return out


def apply(units, table=None, table_path=TABLE, sources_path=SOURCES):
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
    cnt = {'commanders': 0, 'strength_adopted': 0, 'strength_conflict': 0, 'strength_date_unresolved': 0, 'strength_no_documented_range': 0}
    for u in units:
        t = tu.get(u['id'])
        if not t:
            continue
        c = commanders_record(t)
        if c:
            u['commanders_verified'] = c
            cnt['commanders'] += 1
        if not u.get('children'):
            s = strength_record(t, srcs)
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

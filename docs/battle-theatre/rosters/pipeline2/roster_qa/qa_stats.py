"""Counts, error kinds and one-sided 95 percent Clopper-Pearson bounds of the independent sample, per stratum (data2/qa/stats.json).

    python3 -I qa_stats.py            read every data2/qa/pages/*.verdict.json, write data2/qa/stats.json and data2/qa/<family>.json, print a table

Gates (PLAN.md 4.3, 4.4; kinds are defined in qa_verdict.py):
  R-G1 names           rows with a name-* kind among all rows looked at (level N: every page)
  R-G2 dates           rows with a rem-date kind among the rows of pages looked at at level D
  R-G3a structure      rows with a rank, company, merge or split kind among all rows looked at (level N)
  R-G3b remark reading rows with a rem-char, rem-missing, rem-extra, rem-bound or rem-order kind among the rows of pages looked at at level R
  any error            rows with any kind among the rows of pages looked at at all three levels (NDR)
Decision per gate and stratum (the ladder of PLAN.md 4.4, never lowered): PASS when n >= 299 with 0 errors, n >= 473 with at most 1, n >= 628 with at
most 2, or n >= 773 with at most 3 (upper bound 1.0 percent); FAIL when 4 or more errors are found (no sample of the ladder can then pass);
CENSUS when every page of the stratum was looked at (the rate is exact, the bound is not needed); OPEN otherwise (not enough rows yet).
A level not looked at on a page (levels in the verdict) is not counted for its gate.
"""
import sys, os, json, glob, collections

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import qa_lib as Q

G1 = {'name-char', 'name-cut', 'name-nonperson'}
G2 = {'rem-date'}
G3A = {'rank', 'company', 'merge', 'split'}
G3B = {'rem-char', 'rem-missing', 'rem-extra', 'rem-bound', 'rem-order'}
LADDER = ((299, 0), (473, 1), (628, 2), (773, 3))


def decide(n, k, census=False, rate_ok=None):
    if n == 0:
        return 'NOT LOOKED AT'
    if census:
        return 'CENSUS: %d of %d rows (%.1f percent)%s' % (k, n, 100.0 * k / n, ', meets 99 percent' if k / n <= 0.01 else ', does not meet 99 percent')
    for nn, kk in LADDER:
        if n >= nn and k <= kk:
            return 'PASS'
    if k >= 4:
        return 'FAIL'
    return 'OPEN'


def bound(n, k):
    if n == 0:
        return None
    return round(Q.cp_upper(k, n) * 100, 2)


def lower(n, k):
    """One-sided 95 percent Clopper-Pearson lower bound on the error rate (shown for failing strata)."""
    if n == 0 or k == 0:
        return 0.0
    lo, hi = 0.0, k / n
    for _ in range(200):
        mid = (lo + hi) / 2
        if 1 - Q.binom_cdf(k - 1, n, mid) < 0.05:      # P(X >= k | p) still below alpha: p must be higher
            lo = mid
        else:
            hi = mid
    return round((lo + hi) / 2 * 100, 2)


def main():
    vs = []
    for p in sorted(glob.glob(os.path.join(Q.QA, 'pages', '*.verdict.json'))):
        vs.append(Q.jload(p))
    draw = Q.jload(os.path.join(Q.QA, 'draw.json'))['strata']
    by = collections.defaultdict(list)
    for v in vs:
        by[v['stratum']].append(v)
    out = {'f': 'roster-qa-stats/1', 'rules': __doc__, 'strata': {}}
    fam = collections.defaultdict(dict)
    for s in sorted(draw):
        pv = by.get(s, [])
        d = {'pages_in_stratum': draw[s]['pages'], 'rows_in_stratum': draw[s]['rows'], 'pages_looked_at': len(pv), 'decile_pages_looked_at': sum(1 for v in pv if v['in_lowest_decile']),
             'rows_looked_at': sum(v['rows_checked'] for v in pv), 'draw_positions': [v['draw_position'] for v in pv], 'pages': [v['page'] for v in pv]}
        census = len(pv) == draw[s]['pages']
        cnt = {'R-G1': [0, 0], 'R-G2': [0, 0], 'R-G3a': [0, 0], 'R-G3b': [0, 0], 'any': [0, 0]}
        kinds = collections.Counter()
        flagged = collections.Counter()
        unflag = collections.Counter()
        missed = 0
        for v in pv:
            lv = v.get('levels', 'NDR')
            nrows = v['rows_checked']
            unv = {u['i'] for u in v['unverifiable']}
            errs = collections.defaultdict(set)
            for e in v['errors']:
                for k in e['kinds']:
                    errs[k].add(e['i'])
                    kinds[k] += 1
                    (flagged if e.get('flagged_ocr_uncertain') else unflag)[k] += 1
            cnt['R-G1'][0] += nrows
            cnt['R-G1'][1] += len(set().union(*[errs[k] for k in G1 if k in errs]) - unv) if any(k in errs for k in G1) else 0
            cnt['R-G3a'][0] += nrows
            cnt['R-G3a'][1] += len(set().union(*[errs[k] for k in G3A if k in errs]) - unv) if any(k in errs for k in G3A) else 0
            if 'D' in lv:
                cnt['R-G2'][0] += nrows
                cnt['R-G2'][1] += len(errs['rem-date'] - unv) if 'rem-date' in errs else 0
            if 'R' in lv:
                cnt['R-G3b'][0] += nrows
                cnt['R-G3b'][1] += len(set().union(*[errs[k] for k in G3B if k in errs]) - unv) if any(k in errs for k in G3B) else 0
            if lv == 'NDR':
                cnt['any'][0] += nrows
                cnt['any'][1] += v['rows_in_error']
            missed += len(v['missed_lines'])
        gates = {}
        for g, (n, k) in cnt.items():
            gates[g] = {'rows': n, 'errors': k, 'rate_percent': round(100.0 * k / n, 2) if n else None, 'upper95_percent': bound(n, k), 'lower95_percent': lower(n, k) if k else 0.0,
                        'decision': decide(n, k, census) if g != 'any' else None}
        d['gates'] = gates
        d['error_kinds_count'] = dict(kinds)
        d['error_kinds_on_rows_flagged_ocr_uncertain'] = dict(flagged)
        d['error_kinds_on_rows_not_flagged'] = dict(unflag)
        d['missed_lines'] = missed
        d['census_complete'] = census
        out['strata'][s] = d
        fam[s.rsplit('-', 1)[0]][s] = d
    out['pages_looked_at'] = len(vs)
    out['rows_looked_at'] = sum(v['rows_checked'] for v in vs)
    Q.jdump(os.path.join(Q.QA, 'stats.json'), out)
    for f, strata in fam.items():
        Q.jdump(os.path.join(Q.QA, f + '.json'), {'f': 'roster-qa-family/1', 'family': f, 'strata': strata,
                                                  'verdicts': [v['page'] for s in strata for v in by.get(s, [])]})
    print('%-18s %5s %6s | %s' % ('stratum', 'pages', 'rows', 'R-G1 names | R-G2 dates | R-G3a structure | R-G3b remarks (errors/rows, upper bound, decision)'))
    for s, d in out['strata'].items():
        g = d['gates']
        cells = []
        for k in ('R-G1', 'R-G2', 'R-G3a', 'R-G3b'):
            x = g[k]
            cells.append('%d/%d %s%% %s' % (x['errors'], x['rows'], x['upper95_percent'], (x['decision'] or '')[:6]))
        print('%-18s %2d/%-3d %6d | %s' % (s, d['pages_looked_at'], d['pages_in_stratum'], d['rows_looked_at'], ' | '.join(cells)))
    return 0


if __name__ == '__main__':
    sys.exit(main())

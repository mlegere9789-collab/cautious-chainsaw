"""Freezes what the independent smoke sample of roster-qa (14 November 2026) found on the six pages of this item that it looked at, and what the flag files say of those lines now.

    python3 -I ma_qa_snapshot.py        writes GOVERNANCE/horde/ws-rosters/union-ma/qa-smoke-snapshot.json

The verdict files (rosters/data2/qa/pages/massachusettssol*.verdict.json) and rosters/data2/qa/MA-SSM.json are the work of roster-qa and are read, never written.  They may be
extended when that sample goes on; this snapshot keeps the numbers of the files as they were read here (their sha256 are in the snapshot), so the report of this item says
what was read and when.  Row identities of the verdicts are '<unit key without u-ma->#<row number of the unit file>'.  Standard library only.
"""
import sys, os, glob, json, gzip, hashlib, collections

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..', '..'))
QA = os.path.join(ROOT, 'docs', 'battle-theatre', 'rosters', 'data2', 'qa')
A = os.path.join(ROOT, 'docs', 'battle-theatre', 'rosters', 'data2', 'union', 'ma')
GOV = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'horde', 'ws-rosters', 'union-ma')


def sha(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        h.update(f.read())
    return h.hexdigest()


def main():
    fam = json.load(open(os.path.join(QA, 'MA-SSM.json'), encoding='utf-8'))
    flags = {}
    for f in sorted(glob.glob(os.path.join(A, '*.flags.json.gz'))):
        d = json.load(gzip.open(f, 'rt', encoding='utf-8'))
        flags[d['u']] = {'unc': set(d['ocr_uncertain']), 'rows': {c: set(v) for c, v in d['rows'].items()}}
    pages, files = [], {}
    tot = collections.Counter()
    kinds = collections.Counter()
    unflagged_now = []
    flagged_before = flagged_before_err = 0
    ok_flagged_now = 0
    n_ok = 0
    codes_on_error_rows = collections.Counter()
    names = 0                                                  # rows whose name is wrong (kind name-char, name-cut, name-nonperson)
    for f in sorted(glob.glob(os.path.join(QA, 'pages', 'massachusettssol*.verdict.json'))):
        d = json.load(open(f, encoding='utf-8'))
        files[d['page']] = {'file': os.path.relpath(f, ROOT).replace(os.sep, '/'), 'sha256': sha(f), 'verdict_utc': d['verdict_utc'], 'levels': d['levels']}
        errs = {e['rid']: e for e in d['errors']}
        rows = [x['rid'] for x in d['rows_listed']]
        units = sorted({r.rsplit('#', 1)[0] for r in rows})
        p = {'page': d['page'], 'printed_page': d['printed_page'], 'stratum': d['stratum'], 'units': units, 'rows_compared': d['rows_stored'], 'rows_with_a_difference': d['rows_in_error'],
             'rows_flagged_when_read': d['rows_flagged_ocr_uncertain'], 'error_kinds': dict(sorted(collections.Counter(k for e in d['errors'] for k in e['kinds']).items())),
             'missed_lines': len(d['missed_lines'])}
        pages.append(p)
        flagged_before += d['rows_flagged_ocr_uncertain']
        for rid in rows:
            uk, i = rid.rsplit('#', 1)
            u, i = 'u-ma-' + uk, int(i)
            now = i in flags[u]['unc']
            if rid in errs:
                e = errs[rid]
                tot['rows_with_a_difference'] += 1
                if any(k.startswith('name') for k in e['kinds']):
                    names += 1
                for k in e['kinds']:
                    kinds[k] += 1
                if e['flagged_ocr_uncertain']:
                    flagged_before_err += 1
                if now:
                    tot['rows_with_a_difference_flagged_now'] += 1
                    for c, rs in flags[u]['rows'].items():
                        if i in rs:
                            codes_on_error_rows[c] += 1
                else:
                    unflagged_now.append({'row': rid, 'kinds': e['kinds'], 'note': e['note']})
            else:
                n_ok += 1
                if now:
                    ok_flagged_now += 1
            tot['rows_compared'] += 1
    # the gates, as roster-qa computed them (copied, not recomputed)
    gates = {}
    for sname, st in fam['strata'].items():
        gates[sname] = {'pages_looked_at': st['pages_looked_at'], 'rows_looked_at': st['rows_looked_at'],
                        'gates': {g: {k: v for k, v in gv.items() if k in ('rows', 'errors', 'rate_percent', 'upper95_percent', 'decision')} for g, gv in st['gates'].items() if g != 'any'}}
    out = {
        'format': 'ma-qa-smoke-snapshot/1',
        'about': 'What roster-qa found when it compared the stored lines of six pages of the Massachusetts item with the printed pages (smoke stage of its first round, verdicts written '
                 '2026-11-14 00:47 to 01:07 UTC), copied from rosters/data2/qa/MA-SSM.json and the six verdict files, and what the flag files of the 24 unit files say of the same lines now '
                 '(after the marks of 14 November 2026 were widened; the unit files themselves are unchanged). The gates are those of roster-qa (PLAN.md 4.4); this item did not run them.',
        'read_files': {'family_file': {'file': 'docs/battle-theatre/rosters/data2/qa/MA-SSM.json', 'sha256': sha(os.path.join(QA, 'MA-SSM.json'))}, 'verdicts': files},
        'pages': pages,
        'totals': {'pages': len(pages), 'rows_compared': tot['rows_compared'], 'rows_with_a_difference_from_the_print': tot['rows_with_a_difference'],
                   'percent_rows_with_a_difference': round(100.0 * tot['rows_with_a_difference'] / tot['rows_compared'], 1),
                   'rows_with_a_wrong_name': names, 'percent_rows_with_a_wrong_name': round(100.0 * names / tot['rows_compared'], 1),
                   'difference_kinds_counted_over_rows': dict(sorted(kinds.items()))},
        'gates_as_computed_by_roster_qa': gates,
        'flags': {'rows_with_a_difference_flagged_when_read': flagged_before_err, 'rows_flagged_when_read_all': flagged_before,
                  'rows_with_a_difference_flagged_now': tot['rows_with_a_difference_flagged_now'], 'rows_without_a_difference_flagged_now': ok_flagged_now, 'rows_without_a_difference': n_ok,
                  'codes_on_the_rows_with_a_difference_flagged_now': dict(sorted(codes_on_error_rows.items())),
                  'rows_with_a_difference_not_flagged_now': unflagged_now},
        'caveat': 'The marks of 14 November 2026 were written after reading these 51 differences, so the share of them that the flag files mark now (in-sample) is no estimate of the share '
                  'marked on lines nobody compared; a line that no pattern marks is not thereby clean. The stored lines are not changed by any mark.',
    }
    with open(os.path.join(GOV, 'qa-smoke-snapshot.json'), 'w', encoding='utf-8') as fh:
        json.dump(out, fh, ensure_ascii=False, indent=1)
        fh.write('\n')
    print(json.dumps({'totals': out['totals'], 'flags': {k: v for k, v in out['flags'].items() if k != 'rows_with_a_difference_not_flagged_now'}}, indent=1))
    print('not flagged now:', [(x['row'], x['kinds']) for x in unflagged_now])
    return 0


if __name__ == '__main__':
    sys.exit(main())

"""Size budget of the compact roster format, measured on the rows that already exist in rosters/data (earlier run).

    nice python3 -I docs/battle-theatre/rosters/pipeline2/size_budget.py [OUT.json]       (run from the repository root)

For every live CSV of rosters/data (not _pre_audit, _quarantine, audits, tombstones, reconciliation files) each row is
re-expressed as the roster2/1 row  [name, rank, co, remarks, page, off, rd]  where
  name     = name_as_printed
  rank     = the printed rank column
  co       = company code
  remarks  = every other printed field joined by single blanks (residence, age, date columns, remarks; for the families that
             kept the whole entry (Moore, Booth, Salley style) the entry text without the name)
  page     = a 3-digit stand-in, off = a 7-digit stand-in, rd = a 4-digit stand-in (the real values need the text offsets)
The line length is the UTF-8 length of the compact JSON line.  Nothing here is a roster row of the new data set: the lengths of
the old fields are what is measured, so the figures are a model (Modelled) of the new lines, not a measurement of them.  The
real lines are measured on the prototypes (see PRODUCTION-PLAN.md section 3).
"""
import csv, glob, gzip, io, json, os, re, sys, statistics, collections

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', '..'))
BASE = os.path.join(ROOT, 'docs', 'battle-theatre', 'rosters', 'data')
csv.field_size_limit(10 ** 9)
SKIP = ('_pre_audit', '_quarantine', '/qa/', 'AUDIT', 'audit', 'tombstone', 'coverage', 'company_totals', 'roh_unresolved', 'OR27',
        'reconciliation', 'strength_', 'heitman', 'pilot-corrections', 'structural', 'qa_sample', 'stats', 'unit_map', 'units.csv',
        'unit_table', '/work/', 'sources', 'gaines_unresolved', 'paroles_officers_unresolved', 'oob_scope')
ENTRY = ('moore_1882_entry', 'booth_1920_entry', 'source_entry')
EXTRA = ('residence', 'residence_or_county', 'residence_as_printed', 'age', 'age_as_printed', 'enlist_or_commission_date',
         'enlisted_or_commissioned', 'enlisted_or_mustered', 'enlist_or_rank_date', 'muster_date', 'muster_date_as_printed',
         'mustered_out_as_printed', 'date_in', 'date_out', 'remarks_as_printed')
RANK = ('rank_as_printed', 'rank')


def lines_of(path):
    with open(path, encoding='utf-8', errors='replace', newline='') as fh:
        rd = csv.DictReader(fh)
        if not rd.fieldnames or 'name_as_printed' not in rd.fieldnames:
            return
        for r in rd:
            name = ' '.join((r.get('name_as_printed') or '').split())
            if not name:
                continue
            rank = ' '.join(next((r[k] for k in RANK if r.get(k)), '').split())
            co = (r.get('company') or '')[:4]
            ent = next((r[k] for k in ENTRY if r.get(k)), '')
            if ent:
                rem = ' '.join(ent.split())
                if rem.startswith(name):
                    rem = rem[len(name):].lstrip(' ,.')
            else:
                rem = ' '.join(' '.join(r[k] for k in EXTRA if r.get(k)).split())
            yield [name, rank, co, rem, 123, 1234567, 1234 if rem else 0]


def main():
    out_path = sys.argv[1] if len(sys.argv) > 1 else None
    fam = collections.defaultdict(lambda: {'rows': 0, 'bytes': 0, 'gz': 0, 'lens': [], 'files': 0})
    for f in sorted(glob.glob(os.path.join(BASE, '**', '*.csv'), recursive=True)):
        rel = os.path.relpath(f, BASE).replace(os.sep, '/')
        if any(s in rel for s in SKIP):
            continue
        buf = io.BytesIO()
        n = 0
        for row in lines_of(f):
            b = (json.dumps(row, ensure_ascii=False, separators=(',', ':')) + '\n').encode('utf-8')
            buf.write(b)
            fam[rel.split('/')[0]]['lens'].append(len(b))
            n += 1
        if n:
            raw = buf.getvalue()
            gz = len(gzip.compress(raw, 9, mtime=0))
            a = fam[rel.split('/')[0]]
            a['rows'] += n
            a['bytes'] += len(raw)
            a['gz'] += gz
            a['files'] += 1
    res = {}
    tot = {'rows': 0, 'bytes': 0, 'gz': 0, 'files': 0}
    alll = []
    for k, a in sorted(fam.items()):
        l = sorted(a['lens'])
        alll += l
        res[k] = {'files': a['files'], 'rows': a['rows'], 'raw_bytes': a['bytes'], 'gz_bytes': a['gz'],
                  'mean_line': round(a['bytes'] / a['rows'], 1), 'median_line': l[len(l) // 2],
                  'p90_line': l[int(len(l) * .9)], 'p99_line': l[int(len(l) * .99)],
                  'share_over_90': round(sum(1 for x in l if x > 90) / len(l), 3)}
        for t in tot:
            tot[t] += a[t if t != 'bytes' else 'bytes']
    alll.sort()
    res['ALL'] = {'files': tot['files'], 'rows': tot['rows'], 'raw_bytes': tot['bytes'], 'gz_bytes': tot['gz'],
                  'mean_line': round(tot['bytes'] / tot['rows'], 1), 'median_line': alll[len(alll) // 2],
                  'p90_line': alll[int(len(alll) * .9)], 'p99_line': alll[int(len(alll) * .99)],
                  'share_over_90': round(sum(1 for x in alll if x > 90) / len(alll), 3)}
    print(json.dumps(res, indent=1))
    if out_path:
        json.dump(res, open(out_path, 'w'), indent=1)


if __name__ == '__main__':
    main()

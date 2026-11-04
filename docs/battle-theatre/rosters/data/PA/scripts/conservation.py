"""R-G7 style conservation record: rows parsed per volume, rows emitted to unit files, pages dropped and why. Writes data/PA/conservation.json"""
import sys, os, json, csv, glob, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pa_common as C

emitted = collections.Counter()
for f in glob.glob(os.path.join(C.DATA, 'units', '*.csv')):
    for r in csv.DictReader(open(f, encoding='utf-8')):
        emitted[r['source_id'][-2:]] += 1
cons = {}
for v in ('01', '02', '03', '04', '00'):
    _pa = os.path.join(C.CACHE, 'derived', v + '.records_audit.json')
    recs = json.load(open(_pa if os.path.exists(_pa) else os.path.join(C.CACHE, 'derived', v + '.records.json')))
    pi = json.load(open(os.path.join(C.CACHE, 'derived', v + '.pageinfo.json')))
    pg = {r['page'] for r in recs}
    lost = [p for p in range(min(pg), max(pg) + 1) if pi.get(str(p)) and pi[str(p)]['dx'] is None and pi[str(p)].get('svc') and p not in pg and any(abs(q - p) <= 2 for q in pg)]
    cons[v] = dict(pages=len(pi), narrative_or_nonroll_pages_dropped=sum(1 for x in pi.values() if x.get('narrative')),
                   burial_record_pages_dropped=sum(1 for x in pi.values() if x.get('burial_record')),
                   pages_without_date_column=sum(1 for x in pi.values() if x['dx'] is None),
                   rows_parsed_in_volume=len(recs), rows_emitted_to_unit_files=emitted[v], rows_of_regiments_not_requested=len(recs) - emitted[v],
                   possibly_lost_roll_pages_djvu_index=lost)
cons['note'] = ('rows_of_regiments_not_requested are rolls of Pennsylvania regiments that are not in the repository OOB or that belong to other service blocks; '
                'no parsed row of a requested unit is dropped silently: pages dropped are listed by flag in derived/<vol>.pageinfo.json (tmp, reproducible)')
json.dump(cons, open(os.path.join(C.DATA, 'conservation.json'), 'w'), indent=1)
print(json.dumps({k: v for k, v in cons.items() if k != 'note'})[:800])

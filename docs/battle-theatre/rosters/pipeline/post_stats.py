import csv, json
from collections import Counter

D = '../../../../docs/battle-theatre/rosters/pilot'
st = json.load(open(f'{D}/pilot-stats.json'))
for fn, key in (('6th-wisconsin.csv', '6th Wisconsin'), ('20th-maine.csv', '20th Maine'), ('26th-north-carolina.csv', '26th North Carolina')):
    rows = list(csv.DictReader(open(f'{D}/{fn}', encoding='utf-8')))
    c = Counter(r['roll_status'] for r in rows)
    st[key]['roll_status'] = dict(c)
    st[key]['csv_rows'] = len(rows)
json.dump(st, open(f'{D}/pilot-stats.json', 'w'), indent=1)
for k, v in st.items():
    print(k, v['csv_rows'], v['labels'], v['roll_status'])

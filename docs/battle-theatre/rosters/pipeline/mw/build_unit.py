"""Build one unit CSV (+ a stats entry) for family MW from a parsed JSON.
usage: build_unit.py <family IN|IL|MN|MI|WI> <parsed.json> <unit_id> <regiment label> <slug> <source_id> [date_kind]
Reads tmp/library/rosters/MW/work/<parsed.json path given>, writes docs/battle-theatre/rosters/data/MW/<slug>.csv and
tmp/library/rosters/MW/work/<slug>.stats.json"""
import json, re, sys, csv, os
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..'))
from collections import Counter
import cls_gen
from dedupe import find_dupes

ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..', '..'))
OUT = os.path.join(ROOT, 'docs', 'battle-theatre', 'rosters', 'data', 'MW')
WORK = os.path.join(ROOT, 'tmp', 'library', 'rosters', 'MW', 'work')

fam, parsed, unit_id, regiment, slug, source_id = sys.argv[1:7]
date_kind = sys.argv[7] if len(sys.argv) > 7 else 'muster'
regiment = regiment.replace('_', ' ')
rows = json.load(open(parsed, encoding='utf8'))

COLS = ['regiment', 'unit_id', 'company', 'section', 'rank', 'name_as_printed', 'name_clean', 'residence', 'age_as_printed', 'enlist_or_rank_date', 'muster_date_as_printed', 'mustered_out_as_printed', 'remarks_as_printed', 'presence_label', 'presence_basis', 'dup_group', 'source_id', 'source_page_idx_ia', 'parse_flags', 'roll_status']


def dehalf(s):
    """OCR sometimes prints a cell twice ('Martin co Martin co', 'June 7 June 7'): keep one copy when the halves are near-identical."""
    t = s.split()
    n = len(t)
    if n >= 2 and n % 2 == 0:
        a, b = ' '.join(t[:n // 2]), ' '.join(t[n // 2:])
        import difflib
        if difflib.SequenceMatcher(None, a.lower(), b.lower()).ratio() > 0.78:
            return a
    return s


def clean_name(n):
    n = re.sub(r'[\.•·_\*]{2,}', ' ', n)
    n = re.sub(r'\s+', ' ', n).strip(' .,*•-—')
    n = re.sub(r'\s+[\.,](?=\s|$)', '', n)
    return n.strip(' .,')


def surname_first(n, ordr=None):
    if fam == 'MN' and ordr == 'sf':
        return n if ',' in n else re.sub(r'^(\S+)\s+', lambda m: m.group(1) + ', ', n, count=1)
    if fam in ('IL', 'MN'):
        if re.match(r"^[A-Za-z'\-]+\s*[,\.]\s*\S", n):
            return re.sub(r"^([A-Za-z'\-]+)\s*[,\.]\s*", lambda m: m.group(1) + ', ', n, count=1)
        n = re.sub(r'(?<=\.)(?=[A-Z][a-z])', ' ', n)
        t = n.split()
        return (t[-1] + ', ' + ' '.join(t[:-1])) if len(t) >= 2 else n
    if ',' in n:
        return n
    t = n.split(' ', 1)
    return (t[0] + ', ' + t[1]) if len(t) == 2 else n


recs = []
for r in rows:
    if fam in ('WI',):
        nm = r['name']
        recs.append(dict(co=r['co'], sec=r['sec'], rank=r['sec'], name_raw=r['name_raw'], name=nm, res=r['res'], enl=r.get('enl') or '', remarks=r['remarks'], label=r['label'], why=r['why'], roll=None, page=r['page']))
        continue
    name_raw = r['name']
    nm = clean_name(name_raw)
    name_lost = not nm
    res = '' if fam == 'MN' else clean_name(dehalf(r.get('res', '')))
    date_raw = dehalf(r.get('date', '') or '')
    muster_raw = dehalf(r.get('date2', '') or '')
    age_raw = ''
    out_raw = ''
    if fam == 'MN':
        age_raw = clean_name(r.get('res', '') or '')
        out_raw = muster_raw
        muster_raw = ''
    if fam == 'IL' and not cls_gen.find_dates(date_raw, None) and muster_raw:
        date_raw_used = muster_raw
    else:
        date_raw_used = date_raw
    rem = re.sub(r'\s+', ' ', r.get('rem', '') or '').strip()
    rec = dict(name=nm, rank=r.get('rank', ''), company=r.get('company'), date_raw=date_raw_used, year_hint=r.get('year'), remarks=rem, date_kind=date_kind)
    label, why, enl, roll, ev = cls_gen.classify(rec)
    if fam == 'MN' and label == 'Unknown' and out_raw:
        ods = cls_gen.find_dates(out_raw, None)
        if ods and ods[0][0] < cls_gen.GB0:
            label, roll = 'Absent-Documented', 'off-roll-before-battle'
            why = 'SEP-BEFORE: the Mustered-Out column is dated ' + str(ods[0][0]) + ' (before the battle); remark: ' + rem[:60]
    if fam == 'MI' and (r.get('rank') == 'XREF'):
        label, roll, why = 'Duplicate-Xref', 'xref', 'XREF: cross-reference entry ("See ...") in the Record of Service; the man is counted once under the spelling it points to'
    if fam in ('IL', 'IN') and re.match(r'veteran', r.get('rank', '') or '', re.I):
        label, roll = 'Duplicate-Xref', 'xref'
        why = 'VETERAN-SECTION: re-enlistment listing' + (f' (dated {enl})' if enl else '') + '; the same man is listed with his original enlistment in the company roll (see dup_group); counted once via that row; this row does not by itself place him before or after the battle'
    recs.append(dict(co=r.get('company'), sec=r.get('rank', ''), rank=r.get('rank', ''), name_raw=name_raw, name=surname_first(nm, r.get('ordr')), res=res, enl=enl, remarks=rem, label=label, why=why, roll=roll, page=r['page'], muster=muster_raw, age=age_raw, out=out_raw, ordr=r.get('ordr')))

for i, o in enumerate(recs):
    o['_ord'] = 'sf' if (fam != 'WI' or ',' in o['name']) else 'gs'
ex, var = find_dupes(recs, 'sf')
parent = list(range(len(recs)))


def find(x):
    while parent[x] != x:
        parent[x] = parent[parent[x]]
        x = parent[x]
    return x


for a, b in ex:
    parent[find(a)] = find(b)
for i, o in enumerate(recs):
    o['dup_group'] = f'{slug}-{find(i)}'


def roll_of(o):
    if o['roll']:
        return o['roll']
    l, w = o['label'], (o['why'] or '').lower()
    if l == 'Duplicate-Xref':
        return 'xref'
    if l == 'Absent-Documented':
        return 'not-yet-enlisted' if ('after the battle' in w or 'drafted' in w) else 'off-roll-before-battle'
    if l == 'Present-Documented':
        return 'named-present'
    if w.startswith('on-roll') or w.startswith('onroll'):
        return 'on-roll-undetermined'
    return 'unreadable-or-ambiguous'


os.makedirs(OUT, exist_ok=True)
with open(os.path.join(OUT, slug + '.csv'), 'w', newline='', encoding='utf-8') as f:
    w = csv.writer(f)
    w.writerow(COLS)
    for o in recs:
        w.writerow([regiment, unit_id, o['co'], o['sec'], o['rank'], o['name_raw'], o['name'], o['res'], o.get('age', ''), o['enl'] or '', o.get('muster', ''), o.get('out', ''), o['remarks'], o['label'], o['why'], o['dup_group'], source_id, o['page'], cls_gen.flags(o['name_raw']), roll_of(o)])

st = dict(regiment=regiment, unit_id=unit_id, slug=slug, source_id=source_id, rows=len(recs),
          unique_persons_if_same_name_merged=len(set(find(i) for i in range(len(recs)))), exact_same_name_pairs=len(ex), variant_pairs=len(var),
          labels=dict(Counter(o['label'] for o in recs)), roll_status=dict(Counter(roll_of(o) for o in recs)),
          name_flagged_rows=sum(1 for o in recs if cls_gen.flags(o['name_raw'])), companies=dict(Counter(o['co'] for o in recs)))
json.dump(st, open(os.path.join(WORK, slug + '.stats.json'), 'w'), indent=1)
print(slug, st['rows'], st['labels'], st['roll_status'])

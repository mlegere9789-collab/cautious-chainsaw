"""Consolidate all C-ALMSTX CSVs: stats.json, coverage_by_unit.csv, qa_sample.csv (30 rows, fixed seed, automatic name-in-source check)."""
import sys, os, csv, json, re, glob, random, hashlib
sys.path.insert(0, r'C:\Users\mlege\gettysburg-map\docs\battle-theatre\rosters\data\C-ALMSTX\scripts')
from rlib import *
from collections import Counter, defaultdict
SRCTXT = {'FL-SOLDIERS-1903': 'soldiersofflorid00flor_djvu.txt', 'AL-OATES-1905': '01897724_3053_djvu.txt', 'AL-HURST-1863': 'historyoffourtee01hurs_djvu.txt', 'MD-GOLDSBOROUGH-1869': 'marylandlineinco00gold_djvu.txt',
          'MS-REGISTER-1908': 'officialstatisti00missuoft_djvu.txt', 'AL-BREWER-1872': 'alabamaherhistor00brew_djvu.txt', 'TX-POLLEY-1910': 'hoodstexasbrigad00poll_djvu.txt', 'AL-PARK-1906': '04680903_3233_djvu.txt',
          'MS-QUITMAN-1866': 'historicalsketch00newo_djvu.txt', 'US-ESTES-1912': 'listoffieldoffic00este_djvu.txt'}
UNITS = json.load(open(DATA + r'\scripts\units_scope.json', encoding='utf-8')) if os.path.exists(DATA + r'\scripts\units_scope.json') else {}
rows = []
for f in glob.glob(DATA + r'\*\*.csv'):
    if os.path.basename(f) in ('company_totals.csv', 'coverage_by_unit.csv', 'qa_sample.csv'): continue
    with open(f, encoding='utf-8', newline='') as fh:
        for r in csv.DictReader(fh):
            r['_file'] = os.path.relpath(f, DATA); rows.append(r)
print('rows', len(rows))
lab = Counter(r['presence_label'] for r in rows)
rs = Counter(r['roll_status'] for r in rows)
unread = sum(1 for r in rows if r['roll_status'] == 'unreadable-or-ambiguous' or re.search(r'name-garbled|ocr-noise-in-name|name-missing-ocr|merged-row-suspected', r['parse_flags']))
bysrc = defaultdict(Counter)
for r in rows: bysrc[r['source_id']][r['presence_label']] += 1
byunit = defaultdict(lambda: defaultdict(Counter))
for r in rows:
    byunit[r['unit_id']][r['source_id']][r['presence_label']] += 1
# distinct unit ids
cov = []
for u in sorted(byunit):
    tot = sum(sum(c.values()) for c in byunit[u].values())
    cov.append(dict(unit_id=u, rows=tot, sources='; '.join('%s=%d' % (s, sum(c.values())) for s, c in sorted(byunit[u].items())),
                    present_documented=sum(c['Present-Documented'] for c in byunit[u].values()), absent_documented=sum(c['Absent-Documented'] for c in byunit[u].values()), unknown=sum(c['Unknown'] for c in byunit[u].values())))
with open(DATA + r'\coverage_by_unit.csv', 'w', encoding='utf-8', newline='') as fh:
    w = csv.DictWriter(fh, fieldnames=list(cov[0].keys())); w.writeheader(); [w.writerow(c) for c in cov]
# QA sample: 30 rows stratified across sources, fixed seed; automatic check that surname appears in the cached source text
random.seed(20261030)
texts = {}
def src_text(sid):
    if sid not in texts:
        fn = SRCTXT.get(sid)
        texts[sid] = re.sub(r'\s+', ' ', open(os.path.join(CACHE, 'norm', fn), encoding='utf-8', errors='replace').read()).lower() if fn else ''
    return texts[sid]
pool = [r for r in rows if r['source_id'] in SRCTXT and r['name_as_printed']]
bys = defaultdict(list)
for r in pool: bys[r['source_id']].append(r)
sample = []
per = {'FL-SOLDIERS-1903': 5, 'AL-OATES-1905': 4, 'AL-HURST-1863': 4, 'TX-POLLEY-1910': 5, 'MD-GOLDSBOROUGH-1869': 3, 'MS-REGISTER-1908': 3, 'AL-BREWER-1872': 3, 'AL-PARK-1906': 1, 'US-ESTES-1912': 2}
for sid, n in per.items():
    sample += random.sample(bys[sid], min(n, len(bys[sid])))
qa = []
for r in sample:
    nm = r['name_as_printed']
    toks = [t for t in re.findall(r"[A-Za-z']{3,}", nm)]
    sur = (re.split(r',', nm)[0].split()[-1] if ',' in nm else (nm.split()[-1] if nm.split() else '')).lower().strip(".,'")
    hit = bool(sur) and sur in src_text(r['source_id'])
    qa.append(dict(source_id=r['source_id'], unit_id=r['unit_id'], company=r['company'], name_as_printed=nm, label=r['presence_label'], basis=r['presence_basis'][:110], locator=r['locator'], surname_found_in_source_text=hit))
with open(DATA + r'\qa_sample.csv', 'w', encoding='utf-8', newline='') as fh:
    w = csv.DictWriter(fh, fieldnames=list(qa[0].keys())); w.writeheader(); [w.writerow(q) for q in qa]
json.dump(dict(total_rows=len(rows), labels=dict(lab), roll_status=dict(rs), unreadable_or_name_flagged_rows=unread, unreadable_share=round(unread / len(rows), 4),
               by_source={s: dict(c) for s, c in bysrc.items()}, units_with_rows=len(byunit), qa_surname_hits='%d/%d' % (sum(q['surname_found_in_source_text'] for q in qa), len(qa))),
          open(DATA + r'\stats.json', 'w'), indent=1)
print(json.dumps(dict(total_rows=len(rows), labels=dict(lab), unread=unread, share=round(unread / len(rows), 4), units=len(byunit), qa='%d/%d' % (sum(q['surname_found_in_source_text'] for q in qa), len(qa)))))
for q in qa:
    if not q['surname_found_in_source_text']: print('MISS', q['source_id'], q['name_as_printed'])

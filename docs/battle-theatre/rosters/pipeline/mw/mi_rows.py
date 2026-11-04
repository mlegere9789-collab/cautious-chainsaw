"""Convert Record-of-Service entries (mi_ros.py output) to the row JSON read by build_unit.py (family MI).
usage: mi_rows.py <entries.json> <out.json> [include_pages_from] [include_pages_to]"""
import json, re, sys

E = json.load(open(sys.argv[1], encoding='utf8'))
OUT = sys.argv[2]
LO = int(sys.argv[3]) if len(sys.argv) > 3 else 0
HI = int(sys.argv[4]) if len(sys.argv) > 4 else 10 ** 6


def fix4(m):
    tok = m.group(0)
    last = tok[-1]
    d = '1' if last in 'iIl[rJ|!' else last
    return '186' + d if d.isdigit() else tok


def norm(t):
    t = re.sub(r'\b[1iIlt][S8][6G][0-9iIl\[rJ|!]\b', fix4, t)   # 1S61, tS6i, i86[ -> 186x
    t = re.sub(r'\b[1iIl][S5](\d\d)\b', r'18\1', t)
    t = re.sub(r'\bi86([0-9rlI])\b', lambda m: '186' + ('1' if m.group(1) in 'rlI' else m.group(1)), t)
    t = re.sub(r'(\w)- (\w)', r'\1\2', t)
    t = t.replace('1.1arch', 'March').replace(':May', 'May').replace('\\Vilderness', 'Wilderness').replace('Infantrj', 'Infantry').replace('Infantrv', 'Infantry').replace('companj', 'company')
    return t


rows = []
for e in E:
    if not (LO <= e['page'] <= HI):
        continue
    txt = norm(e['text'])
    m = re.search(r'Enlisted in (?:company\s+)?([A-K])\b', txt)
    company = m.group(1) if m else ('UNASSIGNED' if re.search(r'Enlisted in unassigned', txt) else '')
    reorg = bool(re.search(r'\(reorganized\)|reorganized\)', txt[:200]))
    if reorg and company:
        company = company + '-reorg'
    rank = ''
    mr = re.search(r'Infantry,?\s+as\s+([A-Z][A-Za-z\. ]{2,30}?),', txt[:260])
    if mr:
        rank = mr.group(1)
    ie = txt.find('listed')
    seg = txt[ie:ie + 170] if ie >= 0 else txt[:200]
    md = re.search(r"Infan\w*[\.,]?\s*(?:as\s+[A-Za-z\. ]{2,30}?,\s*)?(.{0,32}?)\s*,?\s+at\s", seg)
    date_raw = md.group(1).strip(' ,.') if md else ''
    j = txt.find('Mustered')
    if j < 0:
        j = txt.find('tered')
    rem = txt[j:] if j >= 0 else txt[len(e['surname']) + len(e['given']) + 2:]
    # drop the muster-date sentence from the remark so it is not read as an event
    rem = re.sub(r'^\w*tered[^\.]*?\d{4}\.', 'Mustered.', rem, count=1)
    name = e['surname'] + ', ' + e['given']
    if re.match(r'^[^\.]{3,60}\.\s*(See|Also)\s', e['text']) and 'listed' not in e['text'][:120]:
        rank = 'XREF'
    rows.append(dict(page=e['page'], company=company, rank=rank, name=name, res=e['place'], date=date_raw, date2='', rem=rem, year=None, ordr='sf', raw=[e['text'][:300]]))
json.dump(rows, open(OUT, 'w'), indent=0)
print(len(rows), 'rows;', sum(1 for r in rows if not r['date']), 'without a readable enlistment date;', sum(1 for r in rows if '-reorg' in r['company']), 'reorganized')

import json, os, re, sys, collections
sys.path.insert(0, os.path.dirname(__file__))
from reg_common import *
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', '..'))
W = os.path.join(ROOT, 'tmp', 'library', 'rosters', 'REG', 'work')
OUT = os.path.join(ROOT, 'docs', 'battle-theatre', 'rosters', 'data', 'REG')
A = json.load(open(os.path.join(W, 'wvA_rows.json')))
MAP = [('7INF', 'U-7WV', '7th West Virginia Infantry'), ('1CAV', 'U-1WV-CAV', '1st West Virginia Cavalry'),
       ('3CAV', 'U-3WV-CAV', '3rd West Virginia Cavalry'), ('1LA', 'U-ART-CWV', 'Battery C, 1st West Virginia Light Artillery')]
stats = {}
for key, uid, name in MAP:
    rows = []
    for r in A:
        if r['unit'] != key:
            continue
        nm = re.sub(r'[\s\.]+$', '', r['name']).strip()
        if len(nm) < 3 or re.match(r'(?i)aggregate', nm):
            continue
        r['rem'] = re.sub(r'(men\.\s*)?VjOOQ\s*iC.*$|Digitized by.*$', '', r['rem']).strip()
        din = r['din'] and __import__('datetime').date.fromisoformat(r['din'])
        lab, basis, rs = label_from_dates(din or None, None, r['rem'])
        fl = list(r['flags'])
        if key == '1LA':
            r['company'] = 'C'
        if key == '3CAV':
            fl.append('company-at-gettysburg-unresolved: OR 27/1 p.157 organizes two companies (Capt. Seymour B. Conger) without naming them')
        rows.append(dict(unit_id=uid, regiment=name, company=r['company'], section='roll', name_as_printed=nm, rank_as_printed=r['rank'], residence='', age=r['age'],
                         date_in=r['din'], date_out='', remarks_as_printed=r['rem'].strip(), presence_label=lab, presence_basis=basis, roll_status=rs,
                         source_id='WV-AGR-1864', source_locator='IA annualreportadj07offigoog djvu page %s (book p.%s)' % (r['page'], r['page'] - 5), parse_flags=';'.join(fl)))
    write_csv(os.path.join(OUT, slug(uid) + '.csv'), rows)
    c = collections.Counter(x['presence_label'] for x in rows)
    cs = collections.Counter(x['roll_status'] for x in rows)
    stats[uid] = dict(rows=len(rows), labels=dict(c), roll_status=dict(cs))
    print(uid, len(rows), dict(c), dict(cs))

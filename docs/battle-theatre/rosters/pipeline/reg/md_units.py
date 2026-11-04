"""Cut the Maryland rows into the OOB units in REG scope and label them (PLAN 2.2).  Output: data/REG/<unit>.csv"""
import json, os, re, sys, collections, datetime
sys.path.insert(0, os.path.dirname(__file__))
from reg_common import *
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', '..'))
W = os.path.join(ROOT, 'tmp', 'library', 'rosters', 'REG', 'work')
OUT = os.path.join(ROOT, 'docs', 'battle-theatre', 'rosters', 'data', 'REG')
R = json.load(open(os.path.join(W, 'md_rows.json')))
UNITS = [
    ('U-3MD', '3rd Maryland Infantry', r'Third\s+Reg\w*\s+Infantry'),
    ('U-1MD-EH', '1st Maryland Eastern Shore Infantry', r'First\s+Reg\w*\s*,?\s+Eastern\s+Shore\s+Infantry'),
    ('U-1MD-PHB', '1st Maryland Potomac Home Brigade Infantry (not in the repository OOB; organised in OR 27/1 p.157)', r'First\s+Reg\w*\s+Potomac\s+Home\s+Brigade\s+Infantry'),
    ('U-1MD-CAV', '1st Maryland Cavalry', r'First\s+Reg\w*\s+Cavalry'),
    ('U-Purnell-MD', 'Purnell Legion Cavalry (Maryland)', r'Purnell\s+Legion\s+(Reg\w*\s+)?Cavalry'),
]
RB = json.load(open(os.path.join(W, 'mdB_rows.json')))


def nkey(parts):
    t = re.sub(r'[^A-Za-z ,]', '', ' '.join(parts)).lower().replace(',', ' ').split()
    return (t[0][:6] + ' ' + (t[1][:1] if len(t) > 1 else '')) if t else ''


def bindex(rx):
    ix = collections.defaultdict(list)
    for r in RB:
        if re.search(rx, r['hdr'], re.I):
            ix[(r['company'], nkey(r['name_parts']))].append(r)
    return ix


def cut(rx):
    return [r for r in R if re.search(rx, r['hdr'], re.I)]
SRC = 'MD-HRMV-1898'
allstats = {}
for uid, name, rx in UNITS:
    rows = []
    BI = bindex(rx)
    for r in cut(rx):
        nm = ' '.join(r['name_parts']).strip()
        if not nm or len(nm) < 3:
            continue
        d1 = parse_dates(r['date1']); d2 = parse_dates(r['date2'])
        if not d1 and not d2:
            dd = parse_dates(r['dates']); d1 = dd[:1]; d2 = dd[1:2]
        din = d1[0][0] if d1 else None
        dout = d2[0][0] if d2 else None
        co = r['company']
        flags = []
        if din is None or dout is None:
            cand = BI.get((co, nkey(r['name_parts'])), [])
            if len(cand) == 1:
                b1 = parse_dates(cand[0]['date1']); b2 = parse_dates(cand[0]['date2'])
                if din is None and b1:
                    din = b1[0][0]; flags.append('date_in-from-second-scan(IA historyandroste00assegoog)')
                if dout is None and b2:
                    dout = b2[0][0]; flags.append('date_out-from-second-scan(IA historyandroste00assegoog)')
                if not r['remarks'].strip() and cand[0]['remarks'].strip():
                    r['remarks'] = cand[0]['remarks']; flags.append('remarks-from-second-scan')
        if uid == 'U-Purnell-MD' and co != 'A':
            flags.append('company-not-listed-in-OR27/1-organization: only Company A (Capt. Robert E. Duvall) is organised with the Army of the Potomac; presence of other companies Unknown')
        lab, basis, rs = label_from_dates(din, dout, r['remarks'])
        if not re.match(r"^[A-Z][A-Za-z'\-\. ]+,", nm) and co not in ('FS',):
            flags.append('name-format-check')
        if not (din and dout) and lab == 'Unknown' and rs != 'unreadable-or-ambiguous':
            pass
        rows.append(dict(unit_id=uid, regiment=name, company=co, section='officers' if co == 'FS' else 'roll',
                         name_as_printed=nm, rank_as_printed=r['rank'], residence='', age='',
                         date_in=din.isoformat() if din else '', date_out=dout.isoformat() if dout else '',
                         remarks_as_printed=r['remarks'].strip(), presence_label=lab, presence_basis=basis, roll_status=rs,
                         source_id=SRC, source_locator='IA historyrosterofm01mary djvu page %s' % r['page'], parse_flags=';'.join(flags)))
    write_csv(os.path.join(OUT, slug(uid) + '.csv'), rows)
    c = collections.Counter(x['presence_label'] for x in rows)
    cs = collections.Counter(x['roll_status'] for x in rows)
    allstats[uid] = dict(rows=len(rows), labels=dict(c), roll_status=dict(cs), companies=dict(collections.Counter(x['company'] for x in rows)))
    print(uid, len(rows), dict(c), dict(cs))
json.dump(allstats, open(os.path.join(W, 'md_stats.json'), 'w'), indent=1)

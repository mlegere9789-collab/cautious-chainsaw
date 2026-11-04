"""11th Georgia (Anderson's brigade): Warren, History of the Eleventh Georgia Vols., embracing the muster rolls (Richmond, 1863),
IA historyofelevent00warr (djvu.xml with word coordinates). Three printed columns (name, rank, remarks); rows rebuilt from the coordinates.
The rolls were printed before the battle (remarks end with 1862 events), so they can show separations before July 1863 but nothing about Gettysburg.
Run: python -X utf8 warren11ga_parse.py"""
import re, sys, collections
sys.path.insert(0, 'C:/Users/mlege/gettysburg-map/docs/battle-theatre/rosters/data/C-VASCGA/scripts')
sys.path.insert(0, 'C:/Users/mlege/gettysburg-map/tmp/library/rosters/C-VASCGA')
from vscommon import *
import djvu_pages as D

SID = 'GA-WARREN-1863-11GA-v1'
UID, REGN = 'C-11GA', '11th Georgia Infantry'
PAGE_CO = {7: 'A', 8: 'A', 9: 'F', 10: 'F', 11: 'D', 12: 'D', 13: 'I', 14: 'I', 15: 'H', 16: 'H', 17: 'H', 18: 'C', 19: 'C', 20: 'E', 21: 'E', 22: 'K', 23: 'K', 24: 'G', 25: 'G', 26: 'B', 27: 'B'}
# djvu page index (0-based) -> printed page number is index; the roll pages are indices 6..26; company by index:
PAGE_CO = {6: 'A', 7: 'A', 8: 'F', 9: 'F', 10: 'D', 11: 'D', 12: 'I', 13: 'I', 14: 'H', 15: 'H', 16: 'H', 17: 'C', 18: 'C', 19: 'E', 20: 'E', 21: 'K', 22: 'K', 23: 'G', 24: 'G', 25: 'B', 26: 'B'}
NAME_X, REM_X = 590 / 1986.0, 812 / 1986.0
rows = []
for pi, w, h, words in D.pages(CACHE + 'historyofelevent00warr_djvu.xml'):
    if pi not in PAGE_CO:
        continue
    comp = PAGE_CO[pi]
    ws = [x for x in words if x[1] > 400]          # below the heading and column headers
    # lines by vertical centre
    ws.sort(key=lambda t: ((t[1] + t[3]) / 2, t[0]))
    lines = []
    for x in ws:
        yc = (x[1] + x[3]) / 2
        if lines and abs(lines[-1]['y'] - yc) <= 12:
            lines[-1]['w'].append(x)
            lines[-1]['y'] = (lines[-1]['y'] * (len(lines[-1]['w']) - 1) + yc) / len(lines[-1]['w'])
        else:
            lines.append(dict(y=yc, w=[x]))
    cur = None
    for ln in lines:
        nm = ' '.join(t[4] for t in sorted(ln['w']) if t[0] / w < NAME_X)
        rk = ' '.join(t[4] for t in sorted(ln['w']) if NAME_X <= t[0] / w < REM_X)
        rm = ' '.join(t[4] for t in sorted(ln['w']) if t[0] / w >= REM_X)
        nm_clean = re.sub(r'[\.\u2026_\s\-:]{2,}$', '', re.sub(r'(\.\s*){2,}', ' ', nm)).strip(' .,')
        if len(re.sub(r'[^A-Za-z]', '', nm_clean)) >= 3:
            if cur:
                rows.append(cur)
            cur = dict(name=nm_clean, rank=rk.strip(), rem=[rm.strip()] if rm.strip() else [], page=pi + 1, comp=comp)
        elif cur is not None and (rm.strip() or rk.strip()):
            if rm.strip():
                cur['rem'].append(rm.strip())
            if rk.strip() and not cur['rank']:
                cur['rank'] = rk.strip()
    if cur:
        rows.append(cur)

out = []
last_rank = {}
for r in rows:
    rem = squash(' '.join(r['rem']))
    rank = r['rank']
    if re.fullmatch(r'["\u201c\u201d\u2018\u2019\'\u00ab\u00bb\.,;:\s]*', rank) or not rank:
        rank = 'Private (ditto mark)' if rank else ''
    c = classify_history(rem, allow_rank_date=False)
    fl = name_flags(r['name']) + c['flags']
    if re.search(r"[^A-Za-z\.\s',\-]", r['name']) or re.search(r'\b[A-Za-z]\b\s[a-z]{1,2}\b', r['name']):
        fl.append('name-garbled')
    # state what the roll is: printed before the battle
    basis = c['basis']
    if c['label'] == 'Unknown' and c['basis_code'] == 'ONROLL-NO-STATUS':
        basis = 'on the regiment roll printed in 1863 (events to early 1863); no separation shown, no status for 30 June 1863'
    out.append(dict(regiment=REGN, unit_id=UID, company=r['comp'], section='muster roll', name_as_printed=r['name'], rank_as_printed=rank,
                    enlist_or_commission_date='', residence_or_county='', remarks_as_printed=rem, presence_label=c['label'], presence_basis=basis,
                    basis_code=c['basis_code'], dup_group='', source_id=SID, source_locator='book p.%d (djvu leaf %d)' % (r['page'] - 1, r['page'] - 1),
                    parse_flags=';'.join(sorted(set(fl))), roll_status=c['roll_status']))
write_csv(OUT + 'csv/C-11GA.csv', out)
print(len(out), dict(collections.Counter(r['presence_label'] for r in out)), dict(collections.Counter(r['company'] for r in out)))
print('garbled', sum(1 for r in out if 'name-garbled' in r['parse_flags']))

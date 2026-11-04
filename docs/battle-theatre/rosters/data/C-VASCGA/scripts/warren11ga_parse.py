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
# AUDIT 2026-10-30: table headings of the printed rolls ('Discharged', 'Died', 'Recruits', 'Conscripts', 'List of Recruits', OCR-damaged) were read as names (13 rows).
# They are not men: removed here and listed in tombstones_C-11GA.csv (conservation). A bare 'Captain' with a remark is a real officer entry whose name line is lost:
# kept, flagged 'name-missing'.
import difflib
HEADWORDS = ['discharged', 'died', 'recruits', 'conscripts', 'list of recruits', 'names', 'rank', 'remarks']
tomb = []


def heading_like(nm):
    n = re.sub(r'[^a-z ]', '', nm.lower()).strip()
    if len(n) < 3 or len(n.split()) > 3:
        return False
    return max(difflib.SequenceMatcher(None, n, h).ratio() for h in HEADWORDS) >= 0.7


for r in rows:
    if heading_like(r['name']) and not r['rem']:
        tomb.append(dict(company=r['comp'], name_as_read=r['name'], leaf=r['page'] - 1, reason='table heading read as a name'))
        continue
    rem = squash(' '.join(r['rem']))
    rank = r['rank']
    if re.fullmatch(r'["\u201c\u201d\u2018\u2019\'\u00ab\u00bb\.,;:\s]*', rank) or not rank:
        rank = 'Private (ditto mark)' if rank else ''
    # AUDIT 2026-10-30: in the printed tables a status sentence is often split across the rank column and the remarks column ('Deserted' | 'December 25, 1862';
    # 'Wounded' | 'at manassas, August 30, 1862'), so classifying the remarks alone lost the verb (about 100 rows). The rank cell is added to the classified text
    # when its first word is, or is a close OCR misreading of, a status verb.
    _first = re.sub(r'[^a-z]', '', (rank.split() or [''])[0].lower())
    _ver = ['wounded', 'died', 'discharged', 'deserted', 'killed', 'transferred', 'promoted', 'appointed', 'elected', 'resigned', 'dismissed', 'captured', 'absent']
    cls_text = rem
    if _first and (_first in _ver or difflib.get_close_matches(_first, _ver, n=1, cutoff=0.7)) and not re.search(r'(?i)private|ditto', rank):
        cls_text = rank + ' ' + rem
        _status_in_rank = True
    else:
        _status_in_rank = False
    c = classify_history(cls_text, allow_rank_date=False)
    if _status_in_rank and len(re.findall(r'[1I][8S][0-9OSGlI!]{2}', rem)) >= 2 and c['label'] != 'Unknown':
        # several dates in one cell: lines of neighbouring men were read together, the date of this man cannot be told
        c = dict(c, label='Unknown', roll_status='unreadable-or-ambiguous', basis_code='OCR-DATE-LOST',
                 basis='the status text of this table cell holds several dates (lines of neighbouring men read together); which date is his cannot be told', flags=list(c['flags']) + ['dates-of-neighbours-glued'])
    fl = name_flags(r['name']) + c['flags'] + (['status-word-in-rank-column'] if _status_in_rank else [])
    if re.fullmatch(r'(?i)(captain|lieutenant|colonel|major)', r['name'].strip()):
        fl.append('name-missing')
    sur_part = r['name'].split(',')[0]
    if (re.search(r"[^A-Za-z\.\s',\-]", r['name']) or re.search(r'\b[A-Za-z]\b\s[a-z]{1,2}\b', r['name'])
            or re.search(r'\s\.[A-Za-z]|[a-z][A-Z]|(?<![A-Za-z])[A-Za-z]{1,2}\s+\.\s*[A-Za-z]{3}', r['name'])      # AUDIT: ' .Till', 'aT' inside a word
            or not re.search(r'[AEIOUYaeiouy]', sur_part) or len(re.sub(r'[^A-Za-z]', '', sur_part)) < 3):
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
import csv as _csv
with open(OUT + 'tombstones_C-11GA.csv', 'w', newline='', encoding='utf-8') as _fh:
    _w = _csv.DictWriter(_fh, fieldnames=['company', 'name_as_read', 'leaf', 'reason'])
    _w.writeheader()
    _w.writerows(tomb)
print(len(out), dict(collections.Counter(r['presence_label'] for r in out)), dict(collections.Counter(r['company'] for r in out)))
print('garbled', sum(1 for r in out if 'name-garbled' in r['parse_flags']))

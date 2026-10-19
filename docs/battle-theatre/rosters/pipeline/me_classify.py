import json, re, sys, datetime, difflib
sys.path.insert(0, '.')
from common import mon_of
from collections import Counter

rows = json.load(open('../cache/me20_rows.json'))
KWS = ['Discharged', 'Died', 'Killed', 'Deserted', 'Transferred', 'Resigned', 'Dismissed', 'Promoted', 'Detached', 'Mustered', 'Sick', 'Wounded', 'Absent', 'Prisoner', 'Missing']
MD = re.compile(r"([A-Z][a-z]{2,8})\.?\s+(\d{1,2})(?:\s*[,\.]?\s*['\"‘’“”�]\s*(\d{2}))?")
LEAD_DITTO = re.compile(r"^((66|\(\(|<<|\"|“|”|�|f 6|6 6|it|‘‘|’’|\|)\s*)+")


def md_list(s):
    out = []
    for m in MD.finditer(s):
        mo = mon_of(m.group(1))
        if not mo:
            continue
        d = int(m.group(2))
        if not 1 <= d <= 31:
            continue
        y = m.group(3)
        out.append((mo, d, 1800 + int(y) if y else None, m.start()))
    return out


def classify(r):
    rem = LEAD_DITTO.sub('', re.sub(r'\s+', ' ', r['rem']).strip())
    mus = re.sub(r'\s+', ' ', r['mustered']).strip()
    mus_d = md_list(mus)
    gett = bool(re.search(r'Gett|Gcttys|Get\w*sb', rem, re.I))
    wd_gb = bool(re.search(r'(Wd|Wounded|Killed|Died of wounds)\W.{0,25}Gett', rem, re.I)) or bool(re.search(r'(Killed|Wd\.?|Wounded)\W{0,3}(at )?July [23]', rem, re.I)) or bool(re.search(r'(Killed|Wd\.?|Wounded|Died)\W.*?(July|Jul)\W*[123]\b', rem, re.I))
    ev = md_list(rem)
    # an event before the battle: month Jan-Jun without year (=1863) or any dated 1862
    before = None
    after = None
    amb = None
    for mo, d, y, pos in ev:
        pre = rem[max(0, pos - 18):pos]
        if y == 1862:
            before = before or (mo, d, 1862, pre)
        elif y in (None, 1863):
            if mo <= 6:
                before = before or (mo, d, 1863, pre)
            elif mo == 7 and d <= 3:
                pass
            elif mo >= 7 and mo <= 10:
                after = after or (mo, d, 1863, pre)
            else:
                amb = amb or (mo, d, None, pre)   # Nov/Dec without year: 1862 or 1863
    sepword = bool(re.search(r'\b(Disc|Died|Dicd|Killed|Deserted|Transferred|Transf|Trans|Tr\.|Resigned|Dismissed)', rem, re.I))
    joined_late = False
    if r['section'] == 'joined' and mus_d:
        mo, d, y, _ = mus_d[0]
        if y == 1863 and mo >= 7:
            joined_late = True
    why = ''
    # the "joined" section 'mustered' is the muster date of recruits (or original muster into 2nd Maine for transferred men)
    if joined_late:
        return 'Absent-Documented', f'mustered {mus} after the battle', rem
    if wd_gb:
        return 'Present-Documented', 'return remark: ' + rem[:80], rem
    if before and sepword:
        return 'Absent-Documented', f'separation event dated {before[0]}/{before[1]}/{before[2]} before the battle ({before[3].strip()})', rem
    if before and not sepword:
        # e.g. 'Reduced to ranks Mar 5', 'Prom. 2d lt Apr 6' (promotion, still present with regiment)
        return 'Present-Probable', 'dated change before battle is a rank change, not a separation; no separation recorded', rem
    if amb and sepword:
        return 'Unknown', f'separation dated {amb[0]}/{amb[1]} with no year: Nov-Dec 1862 (before) or 1863 (after) not decidable from the return', rem
    if rem == '' or not rem:
        return 'Present-Probable', 'on the 1 Dec 1863 return with no remark; on roll since before the battle (return gives no June 1863 status)', rem
    if re.search(r'Deserted|Dismissed', rem) and not ev:
        return 'Unknown', 'undated desertion/dismissal', rem
    if re.search(r'Disc|Died|Killed|Transf|Trans|Tr\.', rem) and not ev:
        return 'Unknown', 'separation without legible date', rem
    return 'Present-Probable', 'on roll at 1 Dec 1863; remark describes a state after or independent of the battle: ' + rem[:60], rem


out = []
prev_verb = {}
for r in rows:
    rem0 = LEAD_DITTO.sub('', re.sub(r'\s+', ' ', r['rem']).strip())
    # ditto-ed remark: '" " Jan. 19.' repeats the verb of the previous row's remark in the same company
    if rem0 and re.match(r'^(Jan|Feb|Mar|Apr|May|June|July|Aug|Sept|Oct|Nov|Dec)', rem0) and re.search(r'^\W*(66|“|\*\*|‘‘|\"|\(\()', re.sub(r'\s+', ' ', r['rem']).strip()):
        v = prev_verb.get(r['co'])
        if v:
            r = dict(r)
            r['rem'] = v + ' ' + rem0
    mv = re.match(r'^(Discharged|Disc\.?|Died|Killed|Deserted|Transferred|Transf\.?|Trans\.?)', rem0)
    if mv:
        prev_verb[r['co']] = mv.group(1)
    lab, why, rem = classify(r)
    out.append(dict(co=r['co'], sec=r['section'], name=re.sub(r'\s+', ' ', r['name']).strip(), age=r['age'], res=r['res'], ms=r['ms'], mustered=r['mustered'],
                    remarks=rem, label=lab, why=why, page=r['page']))
json.dump(out, open('../cache/me20_classified.json', 'w'), indent=0)
print(len(out), Counter(o['label'] for o in out))
print(Counter((o['sec'], o['label']) for o in out if o['co'] != 'FS').most_common(20))

"""Maine units: Dec 1863 company returns (AG report 1863 App D) + 1898 participants lists (Maine at Gettysburg).
Generalisation of the pilot parsers (rosters/pipeline/me_parse.py, me_classify.py, meg_parse.py, me_merge.py) to page ranges."""
import json, re, statistics, sys, difflib, datetime
sys.path.insert(0, r'C:\Users\mlege\gettysburg-map\tmp\bt\rosters\NE\scripts')
from rosterlib import mon_num
from collections import Counter, defaultdict

CACHE = r'C:\Users\mlege\gettysburg-map\tmp\bt\rosters\cache'
_ME = None
_MEG = None


def ME():
    global _ME
    if _ME is None:
        _ME = json.load(open(CACHE + r'\me_pages.json'))
    return _ME


def MEG():
    global _MEG
    if _MEG is None:
        _MEG = json.load(open(CACHE + r'\meg_pages.json'))
    return _MEG


def lines_of(words, gap=15):
    ws = sorted(words, key=lambda w: (w[1] + w[3]) / 2)
    lines, cur, last = [], [], None
    for w in ws:
        yc = (w[1] + w[3]) / 2
        if cur and yc - last > gap:
            lines.append(cur)
            cur = []
        cur.append(w)
        last = yc
    if cur:
        lines.append(cur)
    for l in lines:
        l.sort(key=lambda w: w[0])
    return lines


def clean(t):
    return re.sub(r'\s+', ' ', t).strip()


SECT = [('COMMISSIONED', 'officers'), ('SERGEANTS', 'sergeants'), ('CORPORALS', 'corporals'), ('MUSICIANS', 'musicians'),
        ('WAGONER', 'wagoner'), ('PRIVATES', 'privates'), ('Joined Co', 'joined'), ('FARRIERS', 'farriers'), ('BUGLERS', 'buglers'),
        ('SADDLER', 'saddler'), ('ARTIFICERS', 'artificers')]


def parse_returns(first, last, regname_pat=None, skip_present_org=True, first_company='FS', fixed_company=None, cut_first=True, cut_last=True, extra_cut_last=None):
    P = ME()
    rows = []
    company = 'FS'
    section = 'officers'
    for pn in range(first, last + 1):
        words = P.get(str(pn))
        if not words:
            continue
        lines = lines_of(words)
        title_y = None
        for l in lines:
            tt = clean(' '.join(w[4] for w in l))
            if re.match(r'^[A-Z][A-Z\-]+(\s+[A-Z\-]+)?\s+REGIMENT\s*(OF\s+)?[A-Z\. ]{0,12}$', tt) and 'ADJUTANT' not in tt:
                title_y = (l[0][1] + l[0][3]) / 2
                break
        ptxt = ' '.join(w[4] for w in words[:70])
        head = clean(' '.join(w[4] for w in words[:40]))
        if pn != first and skip_present_org and re.search(r'Present\s+Organization\s+of\s+the\s+Company', head):
            continue
        SEQ = 'ABCDEFGHIKLM'
        head2 = clean(' '.join(w[4] for w in words[:70]))
        is_ret_page = bool(re.search(r"Return\s+of\s+(Captain|Lieut|Capt)", head2))
        m = re.search(r"Company\s*\W{0,3}([A-M])\b", head2) if re.search(r'turn', head2) else None
        if pn == first:
            company = first_company
        elif is_ret_page:
            if m:
                company = m.group(1)
            elif company == 'FS':
                company = 'A'
            elif company in SEQ:
                company = SEQ[min(SEQ.index(company) + 1, len(SEQ) - 1)]
        elif m and re.search(r'turn\s+of\s+Company', head2):
            company = m.group(1)
        margin_pts = [l[0][0] for l in lines if 150 < l[0][0] < 460 and re.match(r"^[A-Z][a-z]", l[0][4])]
        ns = statistics.median(margin_pts) if margin_pts else 200
        rs_pts = [w[0] for w in words if w[0] > ns + 1000 and re.match(r'^(Disc|Died|Killed|Wd|Sick|Prom|Trans|Det|Desert|Absent|Pris|Missing|Tr\.|Furl|Wounded|Joined|Discharged)', w[4])]
        rs = statistics.median(rs_pts) if rs_pts else ns + 1290
        sc = (1490 - 200) / max(rs - ns, 500)
        first_page = bool(re.search(r"Return\s+of\s+(the\s+Field|Captain|Lieut)", head)) or pn == first
        if first_page:
            section = 'officers'
        cur = None
        for l in lines:
            yc = (l[0][1] + l[0][3]) / 2
            if yc < 560:
                continue
            if title_y is not None:
                if pn == first and cut_first and yc < title_y:
                    continue
                if pn == last and pn != first and cut_last and yc >= title_y - 5:
                    continue
            if extra_cut_last is not None and pn == last and yc >= extra_cut_last:
                continue
            cols = {'n': [], 'a': [], 'r': [], 'ms': [], 'd': [], 'm': []}
            for w in l:
                x = 200 + (w[0] - ns) * sc
                c = 'n' if x < 690 else 'a' if x < 770 else 'r' if x < 1090 else 'ms' if x < 1200 else 'd' if x < 1480 else 'm'
                cols[c].append(w[4])
            t = {k: clean(' '.join(v)) for k, v in cols.items()}
            full = clean(' '.join(w[4] for w in l))
            hit = None
            for key, name in SECT:
                if re.match(key, t['n'] or full, re.I) and not t['a'] and len(full) < 60:
                    hit = name
            if hit:
                section = hit
                cur = None
                continue
            if re.search(r'Condensed|ADJUTANT|APPENDIX|Return of|Continued|Mustered|^Name|Present Organization|Discharged and Deceased|Final Record|REGIMENT', full) and not t['a']:
                if re.search(r'Present Organization of Field|Present Organization of the', full):
                    pass
                continue
            first_w = l[0]
            is_start = (200 + (first_w[0] - ns) * sc) < 300 and re.match(r"^[A-ZÀ-ÿ][A-Za-z'\-]+", first_w[4]) is not None and (t['a'] or t['r'] or t['ms'] or len(t['n'].split()) >= 2)
            if is_start and (len(t['n']) > 2):
                cur = dict(page=pn, y=int(yc), co=(fixed_company or company), section=section, name=t['n'], age=t['a'], res=t['r'], ms=t['ms'], mustered=t['d'], rem=t['m'], raw=[full])
                rows.append(cur)
            elif cur is not None and cur['page'] == pn:
                for k, kk in (('n', 'name'), ('a', 'age'), ('r', 'res'), ('ms', 'ms'), ('d', 'mustered'), ('m', 'rem')):
                    if t[k]:
                        cur[kk] = clean(cur[kk] + ' ' + t[k])
                cur['raw'].append(full)
    return rows


LEAD_DITTO = re.compile(r"^((66|\(\(|<<|\"|“|”|�|f 6|6 6|it|‘‘|’’|\|)\s*)+")
MD = re.compile(r"([A-Z][a-z]{2,8})\.?\s+(\d{1,2})(?:\s*[,\.]?\s*['\"‘’“”�]\s*(\d{2}))?")


def md_list(s):
    out = []
    for m in MD.finditer(s):
        mo = mon_num(m.group(1))
        if not mo:
            continue
        d = int(m.group(2))
        if not 1 <= d <= 31:
            continue
        y = m.group(3)
        out.append((mo, d, 1800 + int(y) if y else None, m.start()))
    return out


def joined_after(mus):
    """'Joined since 1 Nov 1862' men whose muster month (year implied 1863, or stated 1863) is July (after the 3rd) to October."""
    d = md_list(re.sub(r'\s+', ' ', mus).strip())
    if not d:
        return False
    mo, dd, y, _ = d[0]
    if y not in (None, 1863):
        return False
    return (mo == 7 and dd > 3) or 8 <= mo <= 10


def classify_return(r):
    """pilot me_classify logic. Returns (label, why, rem); 'Present-Probable' is converted later (no participants => Unknown)."""
    rem = LEAD_DITTO.sub('', re.sub(r'\s+', ' ', r['rem']).strip())
    mus = re.sub(r'\s+', ' ', r['mustered']).strip()
    mus_d = md_list(mus)
    wd_gb = bool(re.search(r'G[eo]tt?[yv]s|Gett|Gcttys|Get\w{0,3}sb', rem, re.I)) and not re.search(r'Deserted', rem) or bool(re.search(r'(Wd|Wounded|Killed|Died of wounds)\W.{0,25}Gett', rem, re.I)) or bool(re.search(r'(Killed|Wd\.?|Wounded)\W{0,3}(at )?July [23]', rem, re.I)) or bool(re.search(r'(Killed|Wd\.?|Wounded|Died)\W.*?(July|Jul)\W*[123]\b', rem, re.I))
    ev = md_list(rem)
    before = after = amb = None
    for mo, d, y, pos in ev:
        pre = rem[max(0, pos - 18):pos]
        if y == 1862:
            before = before or (mo, d, 1862, pre)
        elif y in (None, 1863):
            if mo <= 6:
                before = before or (mo, d, 1863, pre)
            elif mo == 7 and d <= 3:
                pass
            elif 7 <= mo <= 10:
                after = after or (mo, d, 1863, pre)
            else:
                amb = amb or (mo, d, None, pre)
    sepword = bool(re.search(r'\b(Disc|Died|Dicd|Killed|Deserted|Transferred|Transf|Trans|Tr\.|Resigned|Dismissed)', rem, re.I))
    joined_late = joined_after(mus)
    if joined_late and r['section'] == 'joined':
        return 'Absent-Documented', 'mustered %s after the battle' % mus, rem, 'ENL-AFTER', 'not-yet-enlisted'
    if wd_gb:
        return 'Present-Documented', 'return remark: ' + rem[:80], rem, 'CAS-REMARK', 'named-present'
    if before and sepword:
        return 'Absent-Documented', 'separation event dated %s/%s/%s before the battle (%s)' % (before[0], before[1], before[2], before[3].strip()), rem, 'SEP-BEFORE', 'off-roll-before-battle'
    if before and not sepword:
        return 'Unknown', 'dated change before the battle is a rank change, not a separation; no separation recorded; return gives no June 1863 status', rem, 'ONROLL-NO-STATUS', 'on-roll-undetermined'
    if amb and sepword:
        return 'Unknown', 'separation dated %s/%s with no year: Nov-Dec 1862 (before) or 1863 (after), not decidable from the return' % (amb[0], amb[1]), rem, 'OCR-DATE-LOST', 'unreadable-or-ambiguous'
    if not rem:
        return 'Unknown', 'on the 1 Dec 1863 return with no remark; on roll since before the battle (return gives no June 1863 status)', rem, 'ONROLL-NO-STATUS', 'on-roll-undetermined'
    if re.search(r'Deserted|Dismissed', rem) and not ev:
        return 'Unknown', 'undated desertion/dismissal', rem, 'DATE-NOT-SHOWN', 'unreadable-or-ambiguous'
    if re.search(r'Disc|Died|Killed|Transf|Trans|Tr\.', rem) and not ev:
        return 'Unknown', 'separation without legible date', rem, 'DATE-NOT-SHOWN', 'unreadable-or-ambiguous'
    return 'Unknown', 'on roll at 1 Dec 1863; remark describes a state after or independent of the battle: ' + rem[:60], rem, 'ONROLL-NO-STATUS', 'on-roll-undetermined'


def classify_all(rows):
    out = []
    prev_verb = {}
    for r in rows:
        rem0 = LEAD_DITTO.sub('', re.sub(r'\s+', ' ', r['rem']).strip())
        if rem0 and re.match(r'^(Jan|Feb|Mar|Apr|May|June|July|Aug|Sept|Oct|Nov|Dec)', rem0) and re.search(r'^\W*(66|“|\*\*|‘‘|\"|\(\()', re.sub(r'\s+', ' ', r['rem']).strip()):
            v = prev_verb.get(r['co'])
            if v:
                r = dict(r)
                r['rem'] = v + ' ' + rem0
        mv = re.match(r'^(Discharged|Disc\.?|Died|Killed|Deserted|Transferred|Transf\.?|Trans\.?)', rem0)
        if mv:
            prev_verb[r['co']] = mv.group(1)
        lab, why, rem, code, rs = classify_return(r)
        out.append(dict(co=r['co'], sec=r['section'], name=clean(r['name']), age=r['age'], res=r['res'], ms=r['ms'], mustered=r['mustered'],
                        remarks=rem, label=lab, why=why, code=code, roll_status=rs, page=r['page']))
    return out


# ---------------- participants (Maine at Gettysburg 1898) ----------------
NAME = r"((?:[A-Z][a-z]+\.?|[A-Z]\.)(?:\s+(?:[A-Z][a-z'\-]+\.?|[A-Z]\.|2d|Jr\.))+)"
PARA = re.compile(NAME + r",\s+([A-Z][A-Za-z\.' ]*?(?:,\s+(?:R\.\s*\d+|N\.\s*B\.|Aroos\.?\s*Co\.))*)(?=\s*[,;\.]|\s*$)")
TITLE = re.compile(r"^(Acting\s+)?(First\s+Sergeant|1st\s*Sergt\.?|Sergeant|Corporal|Musician|Wagoner|Private|Bugler|Farrier|Saddler|Blacksmith)\s*[:,]\s*", re.I)


def parse_entry(s):
    s = TITLE.sub('', s)
    s = re.sub(r',\s*(Jr|Sr)\.?,', r' .,', s)
    s = s.rstrip(' ,.')
    if ',' not in s:
        return None
    first, rest = s.split(',', 1)
    first, rest = first.strip(), rest.strip()
    if ' ' not in first:
        if ',' not in rest:
            return None
        giv, res = rest.split(',', 1)
        return clean(giv + ' ' + first), clean(res), 'sf'
    return first, clean(rest), 'gs'


def parse_participants(pages):
    P = MEG()
    people = []
    state = dict(company='FS', rank='field_staff', para_mode=False, para_buf=[], para_page=None)

    def flush_para():
        if not state['para_buf']:
            return
        txt = clean(' '.join(state['para_buf']))
        txt = re.sub(r'(\w)- (\w)', r'\1\2', txt)
        txt = re.sub(r'^On Special Duty or Detached Service:?', '', txt).strip()
        for m in PARA.finditer(txt):
            nm, res = clean(m.group(1)), clean(m.group(2))
            if re.search(r'(battery|dept|Mass|U\. S|hosp|teamster|bugler|cook|guard|orderly|wagon|amb)', nm, re.I):
                continue
            people.append(dict(co=state['company'], rank='special_duty', name=nm, res=res, kind='detached', page=state['para_page']))
        state['para_buf'] = []
        state['para_mode'] = False

    done = False
    for pn in pages:
        if done:
            break
        words = P.get(str(pn))
        if not words:
            continue
        lines = lines_of(words, 14)
        cand = [l[0][0] for l in lines if l[0][4][:1].isalpha() and len(l) > 2]
        if not cand:
            continue
        L = min(cand)
        for l in lines:
            yc = (l[0][1] + l[0][3]) / 2
            txt = clean(' '.join(w[4] for w in l))
            if yc < 330:
                continue
            if re.search(r'REGIMENT\s+PARTICIPANTS|^PARTICIPANTS|MAINE\s+AT\s+GETTYSBURG|REVISED\s+REPORT|BATTERY\s+PARTICIPANTS|CAVALRY\s+PARTICIPANTS', txt) or re.match(r'^\d{3}$', txt):
                if 'REVISED' in txt:
                    flush_para()
                    done = True
                    break
                continue
            m = re.match(r'^Company\s+([A-M])\.?(\s*\(.*\))?$', txt)
            if m:
                flush_para()
                state['company'], state['rank'] = m.group(1), 'officers'
                continue
            if re.match(r'^(SERGEANTS|CORPORALS|PRIVATES|MUSICIANS|WAGONER|BUGLERS?|FARRIERS?|SADDLERS?|BLACKSMITHS?)\.?$', txt, re.I):
                flush_para()
                state['rank'] = txt.strip('.').lower()
                continue
            if re.match(r'^FIELD,\s+STAFF', txt):
                state['company'], state['rank'] = 'FS', 'field_staff'
                continue
            if txt.startswith('On Special Duty') or state['para_mode']:
                if txt.startswith('On Special Duty'):
                    flush_para()
                    state['para_mode'] = True
                    state['para_page'] = pn
                state['para_buf'].append(txt)
                continue
            left = [w for w in l if w[0] < L + 600]
            right = [w for w in l if w[0] >= L + 600]
            for part in (left, right):
                if not part:
                    continue
                s = clean(' '.join(w[4] for w in part))
                if state['rank'] in ('field_staff', 'officers'):
                    people.append(dict(co=state['company'], rank=state['rank'], raw=s, kind='officer_line', page=pn))
                    continue
                ent = parse_entry(s)
                if ent:
                    people.append(dict(co=state['company'], rank=state['rank'], name=ent[0], res=ent[1], kind='private' if ent[2] == 'sf' else 'nco', page=pn))
                else:
                    people.append(dict(co=state['company'], rank=state['rank'], raw=s, kind='unparsed', page=pn))
    flush_para()
    return people


def norm_tokens(s):
    s = re.sub(r'\b(jr|sr|2d|2nd|3d)\b\.?', '', s, flags=re.I)
    s = re.sub(r"[^A-Za-z' ]", ' ', s)
    return [t for t in s.split() if t]


def ret_key(r):
    t = norm_tokens(r['name'])
    if not t:
        return None
    if r['sec'] in ('privates', 'joined', 'sergeants', 'corporals', 'musicians') and r['name'].count(' ') >= 1:
        sur, giv = t[0], t[1:]
    else:
        sur, giv = t[-1], t[:-1]
    return sur.lower(), (giv[0].lower() if giv else ''), (''.join(x[0] for x in giv)).lower()


def par_key(p):
    t = norm_tokens(p['name'])
    if not t:
        return None
    return t[-1].lower(), (t[0].lower() if len(t) > 1 else ''), (''.join(x[0] for x in t[:-1])).lower()


def merge(ret, par):
    P = [p for p in par if p.get('kind') in ('private', 'nco', 'detached') and p.get('name')]
    for p in P:
        p['_k'] = par_key(p)
    for r in ret:
        r['_k'] = ret_key(r)
    idx = defaultdict(list)
    for i, r in enumerate(ret):
        if r['_k']:
            idx[(r['co'], r['_k'][0][:4])].append(i)
    unmatched = []
    for p in P:
        if not p['_k']:
            continue
        cands = idx.get((p['co'], p['_k'][0][:4]), [])
        best = None
        for i in cands:
            r = ret[i]
            s1 = difflib.SequenceMatcher(None, p['_k'][0], r['_k'][0]).ratio()
            s2 = difflib.SequenceMatcher(None, p['_k'][1], r['_k'][1]).ratio() if p['_k'][1] and r['_k'][1] else 0.5
            ini = 1.0 if (p['_k'][2][:1] == r['_k'][2][:1]) else 0.0
            sc = s1 * 0.5 + s2 * 0.4 + ini * 0.1
            if best is None or sc > best[0]:
                best = (sc, i)
        if best and best[0] >= 0.80:
            ret[best[1]].setdefault('participant', []).append(dict(name=p['name'], res=p['res'], kind=p['kind'], score=round(best[0], 2), page=p['page']))
        else:
            unmatched.append(p)
    # second pass: company may be mis-assigned by the page parser; match across companies with a stricter score, rows not yet taken
    idx2 = defaultdict(list)
    for i, r in enumerate(ret):
        if r['_k'] and not r.get('participant'):
            idx2[r['_k'][0][:4]].append(i)
    still = []
    for p in unmatched:
        best = None
        for i in idx2.get(p['_k'][0][:4], []):
            r = ret[i]
            if r.get('participant'):
                continue
            s1 = difflib.SequenceMatcher(None, p['_k'][0], r['_k'][0]).ratio()
            s2 = difflib.SequenceMatcher(None, p['_k'][1], r['_k'][1]).ratio() if p['_k'][1] and r['_k'][1] else 0.0
            ini = 1.0 if (p['_k'][2][:1] == r['_k'][2][:1]) else 0.0
            sc = s1 * 0.5 + s2 * 0.4 + ini * 0.1
            if best is None or sc > best[0]:
                best = (sc, i)
        if best and best[0] >= 0.93:
            ret[best[1]].setdefault('participant', []).append(dict(name=p['name'], res=p['res'], kind=p['kind'], score=round(best[0], 2), page=p['page'], company_mismatch=True))
        else:
            still.append(p)
    return P, still

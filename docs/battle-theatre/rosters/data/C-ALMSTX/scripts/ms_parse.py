"""Mississippi: Official and Statistical Register of the State of Mississippi, 1908, 'Military History of Mississippi' (Rowland), regimental and company commissioned officers.
Names of field, staff, company officers and some first sergeants only (the book states the rosters are incomplete); no privates."""
import sys, re, csv, os, difflib
sys.path.insert(0, r'C:\Users\mlege\gettysburg-map\docs\battle-theatre\rosters\data\C-ALMSTX\scripts')
from rlib import *

SRC = CACHE + r'\norm\officialstatisti00missuoft_djvu.txt'
LINES = open(SRC, encoding='utf-8', errors='replace').read().split('\n')
UNITS = [
    ('C-2MS', '2nd Mississippi Infantry', 35986, 36611), ('C-11MS', '11th Mississippi Infantry', 36612, 37096), ('C-12MS', '12th Mississippi Infantry', 37097, 37552),
    ('C-13MS', '13th Mississippi Infantry', 37553, 37996), ('C-16MS', '16th Mississippi Infantry', 37997, 38502), ('C-17MS', '17th Mississippi Infantry', 38503, 38988),
    ('C-18MS', '18th Mississippi Infantry', 38989, 39513), ('C-19MS', '19th Mississippi Infantry', 39514, 40131), ('C-21MS', '21st Mississippi Infantry', 40132, 40904),
    ('C-42MS', '42nd Mississippi Infantry', 40905, 41189), ('C-48MS', '48th Mississippi Infantry', 41190, 41604),
    ('C-Jeff-MS-CAV', 'Jeff Davis Legion (Mississippi Cavalry)', 41608, 41803),
]
ROLE = r"(Colonels?|Lieutenant[- ]Colonels?|Majors?|Adjutants?|Sergeant[- ]Majors?|Surgeons?|Assistant[- ]Surgeons?|Commissar(?:y|ies)|Quartermasters?|Chaplains?|Ensigns?|Captains?|First Lieutenants?|Second Lieutenants?|Third Lieutenants?|Lieutenants?|First Sergeants?|Second Sergeants?|Third Sergeants?|Fourth Sergeants?|Fifth Sergeants?|Sergeants?|Corporals?|Orderly Sergeants?|Hospital Stewards?|Ordnance Sergeants?|Bandmasters?|Quartermaster[- ]Sergeants?|Drum[- ]Majors?|Assistant Quartermasters?|Assistant Commissar\w+|Majors? and Quartermasters?|Brevet \w+ Lieutenants?|Junior Second Lieutenants?|Privates?)"
RE_ROLE = re.compile(r"^" + ROLE + r"\s*[—\-–]+\s*(.*)$", re.S)
RE_COMP = re.compile(r"^Company\s+([A-K])\b[\s,\.—\-]*(.*)$", re.S)
HDR = re.compile(r"^(?:\d{2,3}\s+)?MILITARY\s+HISTORY\s+OF\s+MISSISSIPPI\.?(?:\s+\d{2,3})?$", re.I)


SEPR = r"(?:\s*[—–]+\s*|\s+-+\s+|--)"
CANON = ['colonel', 'lieutenant-colonel', 'major', 'adjutant', 'sergeant-major', 'surgeon', 'assistant surgeon', 'quartermaster', 'commissary', 'chaplain', 'ensign',
         'captain', 'first lieutenant', 'second lieutenant', 'third lieutenant', 'lieutenant', 'first sergeant', 'second sergeant', 'third sergeant', 'fourth sergeant',
         'fifth sergeant', 'sergeant', 'corporal', 'orderly sergeant', 'hospital steward', 'ordnance sergeant', 'bandmaster', 'quartermaster-sergeant', 'drum-major',
         'assistant quartermaster', 'assistant commissary', 'commissary', 'commissaries', 'assistant commissaries', 'quartermasters', 'surgeons', 'assistant surgeons', 'major and quartermaster', 'brevet second lieutenant', 'junior second lieutenant', 'private']


def is_role(cand):
    c = re.sub(r"\s+", ' ', cand.strip(" .,;:^")).lower()
    if not c or len(c) < 5:
        return False
    return any(difflib.SequenceMatcher(None, c, k).ratio() >= 0.86 or difflib.SequenceMatcher(None, c.rstrip('s'), k).ratio() >= 0.9 for k in CANON)


class _M:
    def __init__(self, start, end, role):
        self._s, self._e, self._r = start, end, role

    def start(self):
        return self._s

    def end(self):
        return self._e

    def group(self, i):
        return self._r


def canon(cand):
    c = re.sub(r"\s+", ' ', cand.strip(" .,;:^")).lower()
    best = max(CANON, key=lambda k: max(difflib.SequenceMatcher(None, c, k).ratio(), difflib.SequenceMatcher(None, c.rstrip('s'), k).ratio()))
    return {'Commissaries': 'Commissary', 'Assistant Commissaries': 'Assistant Commissary', 'Quartermasters': 'Quartermaster', 'Surgeons': 'Surgeon', 'Assistant Surgeons': 'Assistant Surgeon'}.get(best.title(), best.title())


def role_markers(t):
    """AUDIT: every 'Role - ' marker in the paragraph (OCR-tolerant: 'Colondls', 'Sergeants-Major')."""
    out = []
    last_end = 0
    for m in re.finditer(SEPR, t):
        if m.start() < last_end:
            continue
        before = t[max(last_end, m.start() - 48):m.start()]
        toks = before.split()
        for k in (3, 2, 1):
            if len(toks) < k:
                continue
            cand = ' '.join(toks[-k:])
            if is_role(cand) and re.match(r"^[\^]?[A-Z]", toks[-k]) and (m.end() < len(t) and not t[m.end()].isspace()):
                st = m.start() - len(cand) - (len(before) - len(before.rstrip()) if False else 0)
                st = before.rfind(toks[-k]) + max(last_end, m.start() - 48)
                out.append(_M(st, m.end(), canon(cand)))
                last_end = m.end()
                break
    return out
NOTNAME = re.compile(r"\b(Guards?|Rifles?|Riflemen|Greys?|Grays?|Invincibles|Volunteers|Cavalry|Artillery|Infantry|Blues|Rangers|Company|Regiment|Battalion|Legion|Zouaves|Avengers|"
                     r"Cadets|Fencibles|Reds|Southrons|Colonels?|Majors?|Captains?|Lieutenants?|Sergeants?|Sergt|Corporals?|Adjutants?|Surgeons?|Quartermasters?|Jr|Sr|January|February|March|April|May|June|July|August|"
                     r"September|October|November|December|County|Alabama|Virginia|Mississippi|Tennessee|Georgia|Texas|Louisiana|Brigade|Division|Corps|Staff|Army|Legislature|Congress)\b", re.I)
NAMELIKE = re.compile(r"^[\^\*•]?(?:[A-Z][A-Za-z'\.\-]*\s+){0,4}[A-Z][A-Za-z'\-]+\.?$")


def parse_entry(e):
    """'A. B. One, C. D. Two, promoted' -> (['A. B. One', 'C. D. Two'], 'promoted').  The Register prints a remark after the man it belongs to,
    so a remark that follows a list of names belongs to the last name only (cross-checked: 'Third Lieutenants - R. P. Willing, J. L. Ard, James A. Barlow,
    promoted Captain, killed 31 May, 1862' while 'Captains - ... J. A. Barlow, killed')."""
    toks = [x.strip() for x in e.split(',')]
    names = [toks[0]]
    i = 1
    while i < len(toks):
        tk = toks[i]
        if NAMELIKE.match(tk) and not NOTNAME.search(tk) and ((re.search(r"\b[A-Z]\.", tk) or len(tk.split()) >= 2) or (i == len(toks) - 1 and len(tk) >= 4)) and len(tk) <= 40:
            names.append(tk); i += 1
        else:
            break
    return names, ', '.join(toks[i:]).strip()


def paras(lo, hi):
    out = []; cur = []
    for ln in range(lo, hi + 1):
        s = LINES[ln - 1].strip()
        if HDR.match(s) or re.fullmatch(r'\d{1,3}', s):
            continue
        if not s:
            if cur: out.append((cur[0][0], cur[:])); cur = []
            continue
        cur.append((ln, s))
    if cur: out.append((cur[0][0], cur))
    res = []
    for ln0, ls in out:
        t = ''
        for _, s in ls:
            if t.endswith('-') and len(t) > 1 and t[-2].isalpha():
                t = t[:-1] + s
            else:
                t = (t + ' ' + s).strip()
        res.append((ln0, t))
    return res


def split_entries(body):
    body = re.sub(r"\(Mississippi Military Archives\.?\)|\(Historic Roll\.?\)", '', body)
    return [e.strip(' .') for e in re.split(r";\s*(?=[A-Z(])", body) if e.strip(' .')]


def main():
    os.makedirs(DATA + r'\mississippi', exist_ok=True)
    totals = []
    allstats = {}
    for uid, reg, lo, hi in UNITS:
        wr = Writer(reg.lower().replace(' ', '-').replace('(', '').replace(')', ''))
        comp = 'FS'; ctx = 'field and staff'
        for ln0, t in paras(lo, hi):
            mc = RE_COMP.match(t)
            if mc and not RE_ROLE.match(t):
                comp = mc.group(1); ctx = 'company ' + comp
                rest = mc.group(2)
                # leading description up to first role marker belongs to the company header (kept as an entry note only)
                mr = re.search(r"\s(" + ROLE + r"\s*[—\-–]+.*)$", rest, re.S)
                if mr:
                    t = mr.group(1)
                else:
                    continue
            if re.match(r"^(Statement|Total (?:roll|enrol)|Whole number|Enrolled|Mustered)", t, re.I) or re.search(r"Total (?:roll|enrollment)", t[:80]):
                totals.append((uid, comp, ln0, t[:300])); continue
            # AUDIT 2026-10-30: a paragraph may hold several role markers ('Lieutenant-Colonels - ...; Majors - ...; Adjutant - ...');
            # every marker starts its own segment, so each man gets his own rank and none is dropped.
            segs = role_markers(t)
            if not segs:
                continue
            for si, mr in enumerate(segs):
                role = re.sub(r's$', '', mr.group(1)).strip()
                body = t[mr.end():(segs[si + 1].start() if si + 1 < len(segs) else len(t))]
                stat = re.search(r"\s(Statement\b|Total\s+roll|Total\s+enrol|Original\s+roll|Whole\s+number)", body)
                if stat:
                    totals.append((uid, comp, ln0, body[stat.start():][:300])); body = body[:stat.start()]
                for e in split_entries(body):
                    names, rem = parse_entry(e)
                    if rem.startswith('of ') and re.match(r"^of\s+[A-Z]", rem):
                        parts = rem.split(',', 1)
                        rem = parts[1].strip() if len(parts) > 1 else ''
                    for ni, nm in enumerate(names):
                        nm = nm.strip(' .')
                        if '—' in nm or len(nm) > 45 or len(nm.split()) > 6:
                            nm = ' '.join(nm.split()[:5])
                        nm = nm.strip(' .')
                        if not nm or not re.search(r'[A-Za-z]{3}', nm):
                            continue
                        last = (ni == len(names) - 1)
                        rm = rem if last else ''
                        label, basis, rs, fl = classify(rm)
                        fl = fl + name_flags(nm)
                        if len(names) > 1:
                            fl = fl + ['multi-name-entry']
                        wr.add(unit_id=uid, regiment=reg, company=comp, section=ctx, name_as_printed=nm, rank=role, source_entry=e[:300],
                               presence_label=label, presence_basis=basis, dup_group=comp + ':' + re.sub(r'[^a-z]', '', nm.lower()), source_id='MS-REGISTER-1908',
                               locator='Register 1908, Military History of Mississippi, djvu line %d' % ln0, parse_flags=';'.join(sorted(set(fl))), roll_status=rs)
        p = wr.save('mississippi')
        allstats[uid] = wr.stats()
        print(uid, len(wr.rows), wr.stats()['labels'])
        progress('mississippi %s (officers, Register 1908) parsed: %d rows' % (uid, len(wr.rows)))
    with open(DATA + r'\mississippi\company_totals.csv', 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f); w.writerow(['unit_id', 'company', 'djvu_line', 'statement_as_printed'])
        for r in totals: w.writerow(r)
    json.dump(allstats, open(DATA + r'\mississippi\stats.json', 'w'), indent=1)


import json
main()

"""Mississippi: Official and Statistical Register of the State of Mississippi, 1908, 'Military History of Mississippi' (Rowland), regimental and company commissioned officers.
Names of field, staff, company officers and some first sergeants only (the book states the rosters are incomplete); no privates."""
import sys, re, csv, os
sys.path.insert(0, r'C:\Users\mlege\gettysburg-map\docs\battle-theatre\rosters\data\C-ALMSTX\scripts')
from rlib import *

SRC = CACHE + r'\norm\officialstatisti00missuoft_djvu.txt'
LINES = open(SRC, encoding='utf-8', errors='replace').read().split('\n')
UNITS = [
    ('C-2MS', '2nd Mississippi Infantry', 35986, 36611), ('C-11MS', '11th Mississippi Infantry', 36612, 37096), ('C-12MS', '12th Mississippi Infantry', 37097, 37552),
    ('C-13MS', '13th Mississippi Infantry', 37553, 37996), ('C-16MS', '16th Mississippi Infantry', 37997, 38502), ('C-17MS', '17th Mississippi Infantry', 38503, 38988),
    ('C-18MS', '18th Mississippi Infantry', 38989, 39513), ('C-19MS', '19th Mississippi Infantry', 39514, 40131), ('C-21MS', '21st Mississippi Infantry', 40132, 40904),
    ('C-42MS', '42nd Mississippi Infantry', 40905, 41189), ('C-48MS', '48th Mississippi Infantry', 41190, 41928),
    ('C-Jeff-MS-CAV', 'Jeff Davis Legion (Mississippi Cavalry)', 41608, 41928),
]
ROLE = r"(Colonels?|Lieutenant[- ]Colonels?|Majors?|Adjutants?|Sergeant[- ]Majors?|Surgeons?|Assistant[- ]Surgeons?|Commissar(?:y|ies)|Quartermasters?|Chaplains?|Ensigns?|Captains?|First Lieutenants?|Second Lieutenants?|Third Lieutenants?|Lieutenants?|First Sergeants?|Second Sergeants?|Third Sergeants?|Fourth Sergeants?|Fifth Sergeants?|Sergeants?|Corporals?|Orderly Sergeants?|Hospital Stewards?|Ordnance Sergeants?|Bandmasters?|Quartermaster[- ]Sergeants?|Drum[- ]Majors?|Assistant Quartermasters?|Assistant Commissar\w+|Majors? and Quartermasters?|Brevet \w+ Lieutenants?|Junior Second Lieutenants?|Privates?)"
RE_ROLE = re.compile(r"^" + ROLE + r"\s*[—\-–]+\s*(.*)$", re.S)
RE_COMP = re.compile(r"^Company\s+([A-K])\b[\s,\.—\-]*(.*)$", re.S)
HDR = re.compile(r"^(?:\d{2,3}\s+)?MILITARY\s+HISTORY\s+OF\s+MISSISSIPPI\.?(?:\s+\d{2,3})?$", re.I)


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
            mr = RE_ROLE.match(t)
            if not mr:
                # roles may be glued after another sentence; scan for the first role marker
                mr2 = re.search(r"((?:^|\s)" + ROLE + r"\s*[—\-–]+\s.*)$", t, re.S)
                if not mr2: continue
                mr = RE_ROLE.match(mr2.group(1).strip())
                if not mr: continue
            role = re.sub(r's$', '', mr.group(1)).strip()
            body = mr.group(2)
            stat = re.search(r"\s(Statement\b|Total\s+roll|Total\s+enrol)", body)
            if stat:
                totals.append((uid, comp, ln0, body[stat.start():][:300])); body = body[:stat.start()]
            ents = []
            for e0 in split_entries(body):
                # 'A. B. Name, C. D. Name' (several names, no remarks) -> separate entries
                toks = [x.strip() for x in e0.split(',')]
                if len(toks) > 1 and all(re.fullmatch(r"(?:[A-Z][A-Za-z'\.\-]*\s+){0,3}[A-Z][A-Za-z'\-]+\.?", x) for x in toks):
                    ents.extend(toks)
                else:
                    ents.append(e0)
            for e in ents:
                nm, _, rem = e.partition(',')
                # names with 'of County' : 'Hugh R. Miller, of Pontotoc, fell ...'
                rem = rem.strip()
                if re.match(r"^of\s+[A-Z]", rem):
                    parts = rem.split(',', 1)
                    rem = parts[1].strip() if len(parts) > 1 else ''
                if '—' in nm or len(nm) > 45 or len(nm.split()) > 6:
                    nm = ' '.join(nm.split()[:5])
                nm = nm.strip(' .')
                if not nm or not re.search(r'[A-Za-z]{3}', nm):
                    continue
                label, basis, rs, fl = classify(rem if rem else '')
                fl = fl + name_flags(nm)
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

"""61st Georgia (Lawton-Gordon-Evans brigade): Nichols, A Soldier's Story of His Regiment (61st Georgia) (1898), IA 01494987.3402.emory.edu.
'Roster of Companies' B to K: 'Surname, Initials; fate' (officers 'Captain X; ...'). Company A has no roster in the book (only a list of its men who
surrendered at Appomattox). Run: python -X utf8 nichols61ga_parse.py"""
import re, sys, collections
sys.path.insert(0, 'C:/Users/mlege/gettysburg-map/docs/battle-theatre/rosters/data/C-VASCGA/scripts')
from vscommon import *

SID = 'GA-NICHOLS-1898-61GA-v1'
UID, REGN = 'C-61GA', '61st Georgia Infantry'
L = open(CACHE + '01494987.3402.emory.edu_djvu.txt', encoding='utf-8', errors='replace').read().splitlines()
START, END = 10052, 12474
OFF = re.compile(r"^(Captain|First\s+Lieutenant|Second\s+Lieutenant|Third\s+Lieutenant|Lieutenant|Colonel|Major|Adjutant|Surgeon)\s+([A-Z][A-Za-z\.\s']+?)\s*[;,]\s*(.*)$")
PRIV = re.compile(r"^([A-Z][A-Za-z'\u2019\-]+(?:\s[A-Z][a-z]+)?),\s+([A-Z][A-Za-z\.\s'\-]{0,24}?)\s*[;,]\s*(.*)$")
rows, cur, comp, prev_end = [], None, '?', True


# AUDIT 2026-10-30: names printed without a remark, or run on after the previous man's remark, were read as part of that remark (14 men lost, e.g. 'Car tee, William',
# 'Clements, A. M.', 'Floyd, W W', 'Forest, James'). The remark text is now split at every 'Surname, Initials' that follows a sentence end (or a ';' with a name before it)
# and each piece becomes its own row, flagged 'split-from-run-on-text'.
PLACE_WORDS = set("Va Pa Md Ga Fla Florida Georgia Virginia Maryland Pennsylvania Tenn Tennessee Ala Alabama Miss La Ky N S C D Del Delaware Ohio Ill Mo Tex Texas Carolina January February March April May June July August September October November December Jan Feb Mar Apr Aug Sept Oct Nov Dec Co Capt Col Gen Lieut Sergt Corp".split())
_TOK = r"[A-Z1\\|][A-Za-z\.\\1|]{0,12}(?![A-Za-z\.\\1|]*,)"
CAND = re.compile(r"([A-Z][A-Za-z'\-]+(?:\s[a-z]{1,4})?),\s+(" + _TOK + r"(?:\s" + _TOK + r"){0,2})")
AFTER = re.compile(r"\s*(?:\.\s*)?(?:[;:]|$)|\.\s+[a-z]|(?<=\.)\s+[a-z]|\s+[A-Z][a-z'\-]+(?:\s[a-z]{1,4})?,\s+[A-Z]")
PREP = {'at', 'in', 'near', 'of', 'from', 'to', 'on', 'by', 'with', 'and'}


def split_run_on(txt):
    """Return [(None, first_remark), (name, remark), ...]"""
    cuts = []
    prev_end = 0
    for m in CAND.finditer(txt):
        if m.start() < prev_end:
            continue
        sur, ini = m.group(1), m.group(2).strip()
        toks = re.findall(r'[A-Za-z]+', sur + ' ' + ini)
        if sur.split()[0] in PLACE_WORDS or any(len(t) >= 2 and t in PLACE_WORDS for t in re.findall(r'[A-Za-z]+', ini)[:1]):
            continue
        if not AFTER.match(txt, m.end()):
            continue
        before = txt[:m.start()].rstrip()
        ok = False
        if before and before[-1] in '.?;':
            ok = True
        elif before and cuts and cuts[-1][1] >= len(before) - 1:
            ok = True            # directly after the previous cut name
        elif before and re.match(r'\s*[;:]', txt[m.end():]) and re.findall(r'[A-Za-z]+', before)[-1].lower() not in PREP:
            ok = True            # 'died at Bethesda Conner, W W. ; killed ...': the glue has no sentence end
        if before.endswith('St.') or before.endswith('Fort') or not ok:
            continue
        cuts.append((m.start(), m.end(), sur + ', ' + ini))
        prev_end = m.end()
    if not cuts:
        return [(None, txt)]
    out = [(None, txt[:cuts[0][0]].strip())]
    for k, (a, b, nm) in enumerate(cuts):
        nxt = cuts[k + 1][0] if k + 1 < len(cuts) else len(txt)
        out.append((nm, txt[b:nxt].strip(' ;:.')))
    return out


def add_row(nm, rank, txt, line, comp, extra_flags=()):
    txt = re.sub(r'\.\s+[NX]\.\s*Y\.', ', N. Y.', txt)     # 'died in prison at Elmira. X. Y., 1864' is Elmira, N. Y.
    c = classify_history(txt, allow_rank_date=False)
    nm = squash(nm)
    fl = name_flags(nm) + c['flags'] + list(extra_flags)
    if re.search(r'^[A-Z][a-z]+ [a-z]{1,4},', nm):
        fl.append('surname-split-by-ocr')
    basis = c['basis']
    if c['basis_code'] == 'ONROLL-NO-STATUS':
        basis = 'on the 1898 company roster (compiled from memory and records of survivors); no separation dated before 1 July 1863, no Gettysburg remark; no status for 30 June 1863'
    rows.append(dict(regiment=REGN, unit_id=UID, company=comp, section='roster', name_as_printed=nm, rank_as_printed=rank,
                     enlist_or_commission_date=c['enlisted'], residence_or_county='', remarks_as_printed=txt, presence_label=c['label'], presence_basis=basis,
                     basis_code=c['basis_code'], dup_group='', source_id=SID, source_locator='book roster of companies (leaf text line %d)' % line,
                     parse_flags=';'.join(sorted(set(fl))), roll_status=c['roll_status']))


def flush():
    global cur
    if not cur:
        return
    txt = squash(' '.join(cur['body']).replace('- ', ''))
    parts = split_run_on(txt)
    first = parts[0][1]
    apm = re.search(r'Names of Those Who', first)
    if apm:
        first = first[:apm.start()].strip()
    add_row(cur['name'], cur['rank'], first, cur['line'], comp_of(cur))
    for nm, rem in parts[1:]:
        if apm and not rem:
            add_row(nm, '', 'named in the company list of those who surrendered at Appomattox (April 1865)', cur['line'], comp_of(cur), ['split-from-run-on-text', 'appomattox-surrender-list'])
        else:
            add_row(nm, '', rem, cur['line'], comp_of(cur), ['split-from-run-on-text'])
    cur = None


def comp_of(c):
    return c['comp']


for i in range(START - 1, END):
    s = re.sub(r'\s+', ' ', L[i]).strip()
    if not s or re.match(r'^\d{1,3}$', s):
        continue
    m = re.match(r'^COMPANY ([A-K])\.?$', s)
    if m:
        flush()
        comp = m.group(1)
        prev_end = True
        continue
    if re.match(r'^(ROSTER OF COMPANIES|OF|THE SIXTY-FIRST GEORGIA REGIMENT\.?|From .*County.*|To April.*)$', s, re.I):
        continue
    mo = OFF.match(s) if prev_end else None
    mp = PRIV.match(s) if prev_end else None
    if mo and mo.group(1) and len(mo.group(2).split()) <= 4:
        flush()
        cur = dict(name=mo.group(2), rank=mo.group(1), body=[mo.group(3)], comp=comp, line=i + 1)
    elif mp:
        flush()
        cur = dict(name=mp.group(1) + ', ' + mp.group(2).strip(' .'), rank='', body=[mp.group(3)], comp=comp, line=i + 1)
        if re.match(r'^(corporal|sergeant|lieutenant)', mp.group(3), re.I):
            pass
    elif cur is not None:
        cur['body'].append(s)
    prev_end = bool(re.search(r'[\.\?]\s*$', s)) or s.endswith('living')
flush()
write_csv(OUT + 'csv/C-61GA.csv', rows)
print(len(rows), dict(collections.Counter(r['presence_label'] for r in rows)), dict(collections.Counter(r['company'] for r in rows)))

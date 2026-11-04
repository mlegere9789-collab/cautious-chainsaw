"""NE family independent audit: systematic repairs to the parse outputs (30 Oct 2026, audit run).

Usage: python audit_repair.py dry     (counts only, writes nothing)
       python audit_repair.py apply   (freezes data/NE/_pre_audit/ once, rewrites CSVs, writes AUDIT-changes.csv and tombstones.csv)

Every repair keeps `name_as_printed` and `remarks_as_printed` as the source gave them (except the 27 Massachusetts rows whose remark text had swallowed
the following entries; the cut text is kept in the recovered rows). Nothing is deleted without a line in tombstones.csv. Python standard library only.
"""
import sys, os, re, csv, json, glob, shutil, math, collections, datetime, html
sys.path.insert(0, r'C:\Users\mlege\gettysburg-map\tmp\bt\rosters\NE\scripts')
import events as ev
import mass_run as mr
import me_gen as mg

csv.field_size_limit(10 ** 8)
DATA = r'C:\Users\mlege\gettysburg-map\docs\battle-theatre\rosters\data\NE'
MODE = sys.argv[1] if len(sys.argv) > 1 else 'dry'
FIELDS = ['unit_id', 'regiment', 'company', 'section', 'name_as_printed', 'name_clean', 'rank_as_printed', 'rank_class', 'age', 'residence', 'enlisted_or_commissioned',
          'remarks_as_printed', 'presence_label', 'presence_basis', 'basis_code', 'roll_status', 'evidence_label', 'dup_group', 'source_id', 'source_locator', 'parse_flags']
EVID = {'Present-Documented': 'Documented', 'Absent-Documented': 'Documented'}
CHANGES = []   # dict(file,row,name,repair,field,old,new)
TOMB = []      # full rows removed
GB_START, GB_END = datetime.date(1863, 7, 1), datetime.date(1863, 7, 3)


def log(fn, rowno, name, rid, field, old, new):
    CHANGES.append(dict(file=fn, row=rowno, name=name, repair=rid, field=field, old=old, new=new))


def setf(r, fn, rowno, rid, field, new):
    old = r.get(field, '')
    if old != new:
        log(fn, rowno, r['name_as_printed'], rid, field, old, new)
        r[field] = new


def addflag(r, flag):
    fl = [x for x in r['parse_flags'].split(';') if x]
    if flag not in fl:
        fl.append(flag)
    r['parse_flags'] = ';'.join(fl)


def delflags(r, names):
    r['parse_flags'] = ';'.join(x for x in r['parse_flags'].split(';') if x and x not in names)


def relabel(r, fn, rowno, rid, lab, rs, code, why, flags=()):
    for field, new in (('presence_label', lab), ('roll_status', rs), ('basis_code', code), ('presence_basis', why), ('evidence_label', EVID.get(lab, 'Unknown'))):
        setf(r, fn, rowno, rid, field, new)
    for fl in flags:
        addflag(r, fl)


# ------------------------------------------------------------------ gazetteer (given names / surnames) from Massachusetts and New Hampshire "Surname, Given" rows
GIV, SUR = collections.Counter(), collections.Counter()
SUFFIX = {'jr', 'sr', '2d', '3d', '2nd'}


def build_gazetteer(allrows):
    for fn, rows in allrows.items():
        if fn.startswith('maine'):
            continue
        for r in rows:
            n = r['name_as_printed']
            if ',' not in n:
                continue
            sur, giv = n.split(',', 1)
            gt = giv.split()
            s = re.sub(r'[^A-Za-z]', '', sur).lower()
            g = re.sub(r'[^A-Za-z]', '', gt[0]).lower() if gt else ''
            if len(g) >= 2 and len(s) >= 2:
                GIV[g] += 1
                SUR[s] += 1


def lg(t, A, B):
    return math.log((A[t] + 0.5) / (B[t] + 0.5))


def name_order(tokens):
    """'gf' given-first, 'sf' surname-first, 'unsure'"""
    t = [re.sub(r'[^A-Za-z]', '', x).lower() for x in tokens]
    t = [('h' if x == 'ii' else x) for x in t if x]   # OCR reads the initial H as II
    while t and t[-1] in SUFFIX:
        t = t[:-1]
    if len(t) < 2:
        return 'single'
    if len(t[-1]) == 1 and len(t) >= 3:
        return 'sf'
    if len(t) >= 3 and len(t[1]) == 1 and len(t[-1]) > 1:
        return 'gf'
    tot = lg(t[0], GIV, SUR) + lg(t[-1], SUR, GIV)
    if len(t) > 2 and len(t[1]) >= 2:
        tot -= lg(t[1], GIV, SUR)
    return 'gf' if tot > 2.5 else 'sf' if tot < -2.5 else 'unsure'


def given_first(core, section):
    toks = core.split()
    if len(toks) < 2:
        return core, 'single'
    suf = []
    while toks and re.sub(r'[^a-z0-9]', '', toks[-1].lower()) in SUFFIX:
        suf.insert(0, toks.pop())
    o = name_order(toks)
    if o == 'unsure':
        o = 'sf' if section in ('privates', 'joined', 'sergeants', 'corporals', 'musicians') else 'gf'
        basis = 'unsure'
    else:
        basis = 'sure'
    if o == 'sf' and len(toks) >= 2:
        toks = toks[1:] + toks[:1]
    return ' '.join(toks + suf), (o + '-' + basis)


# ------------------------------------------------------------------ Maine name cell repair
RANKWORDS = {'musician', 'farrier', 'wagoner', 'corporal', 'sergeant', 'saddler', 'blacksmith', 'artificer', 'bugler', 'private', 'com', 'corp', 'sergt', 'lieut'}
HEADER_PHRASES = re.compile(r"(Name\.?|comm?i+ss?'?d\s+offi\w*\.?|commiss.{0,4}d\s+officers\.?|Joined\s+Co\.?\s*:?\s*since|\[Rank not shown|Report for \d{4}\.?|Acting\b|Orderly\b|Return of the Field.*$|FOR DUTY.*$|"
                            r"Those remarks.*$|[A-Z]\. ?M\. SERGEANT\.?|COM\. SERGEANT\.?|SERGEANTS?\.?|CORPORALS?\.?|MUSICIANS?\.?|PRIVATES?\.?)", re.I)
REMWORD = re.compile(r"\b(Wd|Wounded|Killed|Died|Transf\w*|Transferred|Promoted|Prom|absent|sick|prisoner|Disc|Discharged|Deserted|Joined|detached|Det|resigned)\b")
RANKDESC = re.compile(r"^(Lieut\w*|Major|Captain|Colonel|Adjutant|Surgeon|Chaplain|Quartermaster|Q\. ?M\.?|Drum|Musician|resigned|Sergt|Sergeant)\b", re.I)
PARTICLES = {'jr', 'sr', '2d', '3d', 'de', 'van', 'la', 'le', 'st', 'mc', 'o', 'ii'}
FRAG_NO_JOIN = {'jr', 'sr', 'of', 'de', 'la', 'van', 'and', 'in', 'to', 'the', 'le', 'st', 'at', 'mc'}


def join_fragments(s):
    """OCR split a name into pieces ('J ames', 'Way land'); join when the joined word is in the gazetteer"""
    toks = s.split()
    out = []
    for t in toks:
        if out and re.fullmatch(r"[a-z]{2,8}", t) and t not in FRAG_NO_JOIN and re.fullmatch(r"[A-Z][a-z]{0,8}", out[-1]):
            j = (out[-1] + t).lower()
            if GIV.get(j) or SUR.get(j):
                out[-1] = out[-1] + t
                continue
        out.append(t)
    return ' '.join(out)


def person_like(core):
    toks = core.split()
    if not 2 <= len(toks) <= 4:
        return False
    cap = 0
    for t in toks:
        tt = re.sub(r"[^A-Za-z'\-]", '', t)
        if not tt:
            return False
        if tt.lower() in PARTICLES:
            continue
        if len(tt) > 1 and not tt[0].isupper():
            # lowercase fragment: tolerated once (OCR garble), the row is then flagged name-garbled
            continue
        if len(tt) > 2:
            cap += 1
    if cap > 3 or cap < 1:
        return False
    return True


def clean_cell(n):
    s = html.unescape(n)
    s = re.sub(r'\s+', ' ', s).strip()
    return s.replace('’', "'").replace('‘', "'")


def maine_name_repair(r):
    """returns dict(kind, core, age, res, note). kind: plain | tail | junk | merged"""
    raw = clean_cell(r['name_as_printed'])
    out = dict(kind='plain', core=raw, age='', res='', note='')
    s = HEADER_PHRASES.sub(' ', raw)
    s = re.sub(r"[|{}<>■♦©§®~·]+|&lt;|&gt;|&amp;", ' ', s)
    s = re.sub(r"\s+", ' ', s).strip(" .,;:!\"'`-_[]()*•^")
    if not re.search(r"[A-Za-z]{3}", s):
        out['kind'] = 'junk'
        return out
    # remark words that bled into the name cell: cut at the first one after at least two name tokens
    m = REMWORD.search(s)
    if m and len(s[:m.start()].split()) >= 2:
        out['note'] = s[m.start():]
        s = s[:m.start()].strip(" .,;:")
    # rank descriptors after a comma ("Ira S Libby, Lieutenant, resigned")
    if ',' in s:
        parts = [x.strip() for x in s.split(',') if x.strip()]
        if len(parts) >= 2 and all(RANKDESC.match(x) for x in parts[1:]):
            out['note'] = (out['note'] + ' ' + ', '.join(parts[1:])).strip()
            s = parts[0]
        elif len(parts) >= 2 and sum(1 for x in parts if len(re.findall(r'[A-Za-z]{2,}', x)) >= 2) >= 2:
            out['kind'] = 'junk'      # a run of several names separated by commas (a list printed in a note, not a roll row)
            return out
        elif len(parts) >= 2 and any(len(re.findall(r'[A-Za-z]{2,}', x)) >= 2 and not RANKDESC.match(x) for x in parts[1:]):
            out['kind'] = 'junk'      # a second name follows the comma: several men in one cell
            return out
        elif len(parts) >= 2:
            out['note'] = (out['note'] + ' ' + ', '.join(parts[1:])).strip()
            s = parts[0]
    mrk = re.match(r"^(Captain|Lieutenant|Sergeant|Corporal|Major|Colonel|Adjutant|Surgeon|Chaplain|Musician|Wagoner)\s+(?=[A-Z])", s)
    if mrk:
        out['note'] = (out['note'] + ' ' + mrk.group(1)).strip()
        s = s[mrk.end():]
    s = join_fragments(s)
    # separators in the middle of the cell: another man starts after them
    sep_mid = bool(re.search(r"(?<=\S)\s[•*^\"'`]+\s?[A-Z]", raw))
    m = re.match(r"^(.+?)\s+[\[\(\|!]?(\d{1,3})\b[\)\]\|,.;:!\-]*\s*(.*)$", s)
    if m:
        pre = re.sub(r"[^A-Za-z' .\-]", ' ', m.group(1))
        pre = re.sub(r'\s+', ' ', pre).strip(" .,'-")
        tail = m.group(3)
        digits = re.findall(r'(?<!\S)\d{1,3}(?!\S)', tail)
        res = ''
        mr_ = re.match(r"([A-Z][A-Za-z\.']{2,}(?:\s[A-Z][A-Za-z\.']{2,})?)", tail)
        if mr_ and mr_.group(1).lower().strip('.') not in RANKWORDS:
            res = mr_.group(1)
        extra = tail[len(mr_.group(0)):] if mr_ else tail
        ntok = len([t for t in pre.split() if t.lower() not in PARTICLES])
        if digits or ntok >= 5 or sep_mid or re.search(r"[A-Z][a-z]+ [A-Z][a-z]+", extra):
            out.update(kind='merged', core=pre)
            return out
        if person_like(pre) or len(pre.split()) >= 2:
            out.update(kind='tail', core=pre, age=(m.group(2) if 14 <= int(m.group(2)) <= 70 else ''), res=res, note=(out['note'] + ' ' + tail).strip())
            return out
    core = re.sub(r"[^A-Za-z' .\-]", ' ', s)
    core = re.sub(r'\s+', ' ', core).strip(" .,'-")
    toks = [t for t in core.split() if t.lower() not in PARTICLES]
    caps = [t for t in toks if len(t) > 1]
    if sep_mid or len(toks) >= 5 or len(caps) >= 4:
        out.update(kind='merged', core=core)
        return out
    out['core'] = core
    if core != raw:
        out['kind'] = 'tail'
    return out


# ------------------------------------------------------------------ Maine date logic with explicit years and intra-regiment transfers
MON = {'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6, 'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12}
DT = re.compile(r"\b(Jan|Feb|Mar|Apr|May|June?|July?|Aug|Sept?|Oct|Nov|Dec)[a-z]*\.?,?\s*(\d{1,2})?\s*[,\.]?\s*(?:['\"\u2018\u2019\u201c\u201d`\u00b4]\s*(\d{2})\b|(?:\b|(?<=\s))(18\d\d|186\d)\b|/(\d{2})\b)")
SEPWORD = re.compile(r"\b(Disc|Disch|Discharged|Died|Dicd|Killed|Deserted|Dismissed|Resigned|Dropped|Cashiered|Transf\.?|Transferred|Trans\.?|Tr\.|Mustered out|Must\. out)", re.I)
INTRA = re.compile(r"\b(?:Transf(?:erred)?|Trans|Tr)\.?,?\s+(?:to|from|fm\.?)\s+(?:co\.?|company)\s*[A-M]\b|\bTr\.? fm\.? [^;.]*", re.I)
NOYEAR = re.compile(r"\b(Jan|Feb|Mar|Apr|May|June?)[a-z]*\.?\s*(\d{1,2})\b")
SEGSPLIT = re.compile(r"(?:;|(?<=\.)\s+(?=(?:Disc|Died|Killed|Deserted|Transf|Trans|Wd|Wounded|Prom|Pris|Joined|Resigned|Dismissed)\b))")
PLACE_BEFORE = re.compile(r"Killed\s+(?:in\s+(?:action|battle)\s+)?at\s+(Fred\W*b\w*g|Fredericksburg|Fredksb\w*|Antietam|Chancellorsville|Salem Heights|Bull Run|Cedar Mountain|Fair Oaks|Malvern)", re.I)


def me_events(rem):
    """list of (kind_sep(bool), month, year|None, day|None, seg) over remark segments; year explicit only"""
    out = []
    for seg in SEGSPLIT.split(rem):
        seg = seg.strip()
        if not seg:
            continue
        for m in DT.finditer(seg):
            mo = MON[m.group(1)[:3].lower()]
            day = int(m.group(2)) if m.group(2) else None
            y = None
            if m.group(3):
                y = 1800 + int(m.group(3))
            elif m.group(4):
                y = int(m.group(4))
            elif m.group(5):
                y = 1800 + int(m.group(5))
            out.append((bool(SEPWORD.search(seg)) and not INTRA.sub('', seg).strip() == '', mo, y, day, seg))
    return out


def before_battle(mo, y, day):
    if y is None:
        return None
    if y < 1863:
        return True
    if y == 1863:
        if mo < 7:
            return True
        if mo == 7 and day is not None and day <= 3:
            return None
        return False
    return False


def sep_before_explicit(rem, assume_window=False):
    """first separation-like segment dated before the battle. assume_window: month-only Jan-Jun with no year means 1863 (the Maine return window runs 1 Nov 1862 to 1 Dec 1863)"""
    for seg in SEGSPLIT.split(rem):
        seg = seg.strip()
        stripped = INTRA.sub('', seg)
        if not SEPWORD.search(stripped) or re.search(r"G[eo]tt?[yv]s|Gett", seg):
            continue
        found = list(DT.finditer(seg))
        if not found and assume_window:
            m2 = NOYEAR.search(seg)
            if m2:
                if before_battle(MON[m2.group(1)[:3].lower()], 1863, int(m2.group(2))):
                    return seg[:90], 1863, MON[m2.group(1)[:3].lower()], int(m2.group(2))
        for m in found:
            mo = MON[m.group(1)[:3].lower()]
            day = int(m.group(2)) if m.group(2) else None
            y = (1800 + int(m.group(3))) if m.group(3) else int(m.group(4)) if m.group(4) else (1800 + int(m.group(5))) if m.group(5) else None
            if y is not None and not 1861 <= y <= 1866:
                y = None      # OCR garble ('27 for '62): treat the year as not read
            if y is None and assume_window and 1 <= mo <= 6:
                y = 1863
            b = before_battle(mo, y, day)
            if b:
                return seg[:90], y, mo, day
    return None


# ------------------------------------------------------------------ Massachusetts relabel with OCR-tolerant event kinds
_orig_seg_kind = ev.seg_kind


def seg_kind2(seg):
    k = _orig_seg_kind(seg)
    if k == 'other':
        s = re.sub(r'\s+', ' ', seg.strip()).lower()
        s = re.sub(r"^[\.,:\-\s'\"]+", '', s)
        s = re.sub(r'^and\s+', '', s)
        if re.match(r'(erl|onl|eul|cnl|eni|en1)', s):
            return 'enl'
        if re.match(r'(dratt|drafl|dralt)', s):
            return 'draft'
        if re.match(r'(comra|coram|corn[mn]|conim)', s):
            return 'comm'
        if re.match(r'(diseh|dlsch|disoh|discli|dlseh|dischg)', s):
            return 'disch'
        if re.match(r'(dcserted|deserled|desertcd|dcsert|desorted)', s):
            return 'deserted'
        if re.match(r'(dled|diod|dicd)', s):
            return 'died'
        if re.match(r'(wouuded|woundcd|wonnded)', s):
            return 'wounded'
        if re.match(r'(killcd|kllled)', s):
            return 'killed'
    return k


EMB = re.compile(r"(?:(?<=[\s\.;:,'’\|\\)])|^)[^A-Za-z\s]{0,3}([A-Za-z][A-Za-z'\-]{2,14}(?:\s[A-Z][a-z]+)?,\s+[A-Z][A-Za-z\.]*(?:\s[A-Z][A-Za-z\.]*){0,3}(?:,\s+(?:1st|2d|3d|Jr\.?))?)\s+—\s+"
                 r"(Priv|Corpl|Sergt|Music|Capt|Wagoner|Artificer|Bugler|Drummer|Farrier|Leader|Hospl|1st Lieut|2d Lieut)\.?\s*[^A-Za-z\s]{0,4}\s*[—;]?\s*[^A-Za-z\s]{0,3}\s*Res\.")


def mass_rank_class(rank):
    x = rank.strip()
    xl = x.lower()
    if re.fullmatch(r'[^A-Za-z]*(muse|music\.?|music)[^A-Za-z]*', xl) or re.fullmatch(r'[^a-z]*(drjinner|drummer)[^a-z]*', xl):
        return 'musician'
    if re.search(r'S.rgt', x):
        return 'nco'
    if re.search(r'I?[Mm]us[ce]', x):
        return 'musician'
    c = mr.rank_class(x)
    if c != 'other':
        return c
    if xl.startswith('drum major'):
        return 'nco'
    if re.search(r'scrgt|corjd|corpi|[\("]orpl|sergt', xl):
        return 'nco'
    if re.search(r'lieat|lieut', xl):
        return 'company_officer'
    if re.search(r'quarter ?master|qr\.? ?master|hosp', xl):
        return 'staff'
    core = re.sub(r'[^A-Za-z]', '', x)
    if 1 <= len(core) <= 5 and core[0] in 'PFITlpft1' and not re.match(r'(Farr|Fife|Lead|Cook|Tea|Sad|Cler|Fifer|Band)', core, re.I):
        return 'private'
    return 'other'


# ------------------------------------------------------------------ main
def load():
    """reads the frozen pre-audit copy when it exists, so that re-running is idempotent"""
    src = os.path.join(DATA, '_pre_audit') if os.path.isdir(os.path.join(DATA, '_pre_audit')) else DATA
    allrows = collections.OrderedDict()
    for fn in sorted(glob.glob(os.path.join(src, '*', '*.csv'))):
        rel = os.path.relpath(fn, src).replace(os.sep, '/')
        if 'pilot-corrections' in rel:
            continue
        allrows[rel] = list(csv.DictReader(open(fn, encoding='utf-8', newline='')))
    return allrows


def main():
    allrows = load()
    before_counts = {k: len(v) for k, v in allrows.items()}
    total_before = sum(before_counts.values())
    build_gazetteer(allrows)
    stats = collections.Counter()

    # ------------- Massachusetts
    ev.seg_kind = seg_kind2
    for fn, rows in allrows.items():
        if not fn.startswith('massachusetts/'):
            continue
        newrows = []
        for i, r in enumerate(rows):
            rowno = i + 2
            # M2: swallowed entries
            rem = r['remarks_as_printed']
            hits = list(EMB.finditer(rem))
            host_rem = rem
            recovered = []
            if hits:
                host_rem = rem[:hits[0].start()].rstrip(" '.|\\^")
                # find where 'Res.' of the embedded entry begins to cut each text
                for k, m in enumerate(hits):
                    end = hits[k + 1].start() if k + 1 < len(hits) else len(rem)
                    seg_txt = rem[m.end() - 4:end].strip()   # starts at 'Res.'
                    recovered.append((m.group(1), m.group(2), seg_txt))
                setf(r, fn, rowno, 'MA-SWALLOW', 'remarks_as_printed', host_rem)
                addflag(r, 'remark-cut-swallowed-following-entries')
                stats['MA-SWALLOW host rows'] += 1
            # M1: relabel with OCR-tolerant kinds
            if r['presence_label'] != 'Duplicate-Xref' and 'E-from-intra-transfer-partner' not in r['parse_flags']:
                res, age, rest = mr.parse_body(r['remarks_as_printed'])
                facts = ev.analyse(rest)
                lab, rs, code, words, flags = ev.label(facts, None)
                if lab != r['presence_label'] or code != r['basis_code']:
                    old = (r['presence_label'], r['basis_code'])
                    relabel(r, fn, rowno, 'MA-KIND', lab, rs, code, words)
                    delflags(r, {'no-enlistment-date', 'date-unreadable', 'separation-date-not-shown', 'separation-then-return-noted', 'separation-return-after-battle',
                                 'gettysburg-named-but-dated-before-battle', 'separation-dated-July-1863-month-only', 'enlistment-month-unreadable-1863', 'wounded-1863-place-not-stated'})
                    for fl in flags:
                        addflag(r, fl)
                    addflag(r, 'audit-relabelled-ocr-event-kind')
                    if not r['enlisted_or_commissioned'] and facts['E']:
                        setf(r, fn, rowno, 'MA-KIND', 'enlisted_or_commissioned', facts['E'].isoformat() + ('' if facts['E_prec'] == 'day' else ' (%s only)' % facts['E_prec']))
                    stats['MA-KIND %s->%s' % (old[1], code)] += 1
            # M3: rank class
            rc = mass_rank_class(r['rank_as_printed'] or 'Priv.')
            if rc != r['rank_class']:
                setf(r, fn, rowno, 'RANKCLASS', 'rank_class', rc)
                stats['RANKCLASS'] += 1
            # M7: name_clean punctuation
            nc = re.sub(r"(?<=[A-Za-z])'(?=\s|$)", '', r['name_clean'])
            nc = re.sub(r'\s+', ' ', nc).strip(" ,.*\u2022")
            if nc != r['name_clean']:
                setf(r, fn, rowno, 'NAMECLEAN', 'name_clean', nc)
                stats['NAMECLEAN mass'] += 1
            newrows.append(r)
            for nm, rk, seg_txt in recovered:
                res, age, rest = mr.parse_body(seg_txt)
                facts = ev.analyse(rest)
                lab, rs, code, words, flags = ev.label(facts, None)
                nr = dict(r)
                nr.update(name_as_printed=nm.strip(), name_clean=mr.clean_name(nm), rank_as_printed=rk + '.', rank_class=mass_rank_class(rk + '.'), age=str(age or ''), residence=res,
                          enlisted_or_commissioned=(facts['E'].isoformat() + ('' if facts['E_prec'] == 'day' else ' (%s only)' % facts['E_prec'])) if facts['E'] else '',
                          remarks_as_printed=re.sub(r'\s+', ' ', seg_txt), presence_label=lab, presence_basis=words, basis_code=code, roll_status=rs, evidence_label=EVID.get(lab, 'Unknown'),
                          dup_group='', parse_flags=';'.join(list(flags) + ['recovered-from-swallowed-entry'] + (['name-garbled'] if re.search(r"[^A-Za-z\.\,\s'\-]", nm) or nm[0].islower() else [])))
                log(fn, rowno, nr['name_as_printed'], 'MA-SWALLOW', 'new_row', '', '%s | %s | %s' % (nr['presence_label'], nr['basis_code'], nr['remarks_as_printed'][:80]))
                newrows.append(nr)
                stats['MA-SWALLOW recovered rows'] += 1
        allrows[fn] = newrows
    ev.seg_kind = _orig_seg_kind

    # ------------- New Hampshire
    for fn, rows in allrows.items():
        if not fn.startswith('new-hampshire/'):
            continue
        for i, r in enumerate(rows):
            rowno = i + 2
            rc = mass_rank_class(r['rank_as_printed'] or 'Priv.')
            if rc != r['rank_class']:
                setf(r, fn, rowno, 'RANKCLASS', 'rank_class', rc)
                stats['RANKCLASS'] += 1
            nc = re.sub(r"(?<=[A-Za-z])'(?=\s|$)", '', r['name_clean'])
            nc = re.sub(r'\s+', ' ', nc).strip(" ,.*\u2022")
            if nc != r['name_clean']:
                setf(r, fn, rowno, 'NAMECLEAN', 'name_clean', nc)
                stats['NAMECLEAN nh'] += 1

    # ------------- Maine
    for fn, rows in allrows.items():
        if not fn.startswith('maine/'):
            continue
        keep = []
        for i, r in enumerate(rows):
            rowno = i + 2
            part_only = r['section'] == 'participants-only'
            if part_only:
                keep.append(r)
                continue
            nr = maine_name_repair(r)
            kind = nr['kind']
            if kind == 'junk':
                t = dict(r)
                t['_file'] = fn
                t['_row'] = rowno
                t['_reason'] = 'ME-JUNK: name cell is a table header fragment, footnote text or a list of several men (no single person); label was %s %s' % (r['presence_label'], r['basis_code'])
                if r['basis_code'] == 'PART-LIST':
                    keep.append(r)   # supported by the 1898 list; keep, flag
                    addflag(r, 'name-cell-junk')
                    continue
                TOMB.append(t)
                stats['ME-JUNK tombstoned'] += 1
                continue
            core = nr['core']
            # age / residence
            if nr['age'] and not r['age']:
                setf(r, fn, rowno, 'ME-NAMETAIL', 'age', nr['age'])
                stats['ME-NAMETAIL age filled'] += 1
            if nr['res'] and r['residence'] in ('', '66', 'cc', 'CC', 'c c', '\ufffd', '“', '"', '<<', '&lt;&lt;', '((', 'Ice'):
                setf(r, fn, rowno, 'ME-NAMETAIL', 'residence', nr['res'])
                stats['ME-NAMETAIL residence filled'] += 1
            if kind in ('tail', 'merged') or core != r['name_as_printed']:
                stats['ME-NAMETAIL name cell cleaned'] += 1
            if kind == 'merged':
                addflag(r, 'name-cell-merged-several-men')
                stats['ME-MERGED'] += 1
                if r['basis_code'] != 'PART-LIST' and r['presence_label'] != 'Unknown':
                    old = (r['presence_label'], r['basis_code'])
                    relabel(r, fn, rowno, 'ME-MERGED', 'Unknown', 'unreadable-or-ambiguous', 'OCR-DATE-LOST',
                            'name cell holds more than one man (OCR merged adjacent rows); the remark cannot be attributed to one of them, so the earlier %s label (%s) is withheld' % old, ['label-withheld-merged-row'])
                    stats['ME-MERGED label withheld'] += 1
            # date repairs (non participants rows only)
            rem = r['remarks_as_printed']
            code = r['basis_code']
            if code in ('DATE-NOT-SHOWN', 'OCR-DATE-LOST') and kind != 'merged':
                sb = sep_before_explicit(rem, assume_window=False)
                if sb:
                    relabel(r, fn, rowno, 'ME-DATE', 'Absent-Documented', 'off-roll-before-battle', 'SEP-BEFORE',
                            'separation dated %s%s%s with the year printed (%s) before 1 July 1863 (audit: the earlier parser ignored a four-digit or apostrophe year)' % (sb[1], '-%02d' % sb[2], '' if not sb[3] else '-%02d' % sb[3], sb[0]), ['audit-relabelled-explicit-year'])
                    stats['ME-DATE explicit year -> Absent'] += 1
                elif PLACE_BEFORE.search(rem) and not re.search(r"G[eo]tt", rem):
                    pl = PLACE_BEFORE.search(rem).group(1)
                    relabel(r, fn, rowno, 'ME-DATE', 'Absent-Documented', 'off-roll-before-battle', 'SEP-BEFORE',
                            'killed at %s, a battle fought before 1 July 1863 (the printed remark has no calendar date; place-dated, Computed from the battle date)' % pl, ['audit-place-dated'])
                    stats['ME-DATE place-dated -> Absent'] += 1
                elif INTRA.search(rem) and not SEPWORD.search(INTRA.sub('', rem)):
                    relabel(r, fn, rowno, 'ME-INTRA', 'Unknown', 'on-roll-undetermined', 'ONROLL-NO-STATUS',
                            'remark records only a transfer between companies of the same regiment, which is not a separation; no status for 1-3 July 1863', ['intra-regiment-transfer'])
                    stats['ME-INTRA -> on-roll'] += 1
            elif code == 'SEP-BEFORE' and INTRA.search(rem) and not SEPWORD.search(INTRA.sub('', rem)):
                relabel(r, fn, rowno, 'ME-INTRA', 'Unknown', 'on-roll-undetermined', 'ONROLL-NO-STATUS',
                        'remark records only a transfer between companies of the same regiment, which is not a separation; no status for 1-3 July 1863', ['intra-regiment-transfer'])
                stats['ME-INTRA SEP-BEFORE -> on-roll'] += 1
            elif code == 'PART-LIST' and 'no-return-row' not in r['parse_flags']:
                enl = r['enlisted_or_commissioned']
                enl_verb = enl if re.fullmatch(r"\W*(Disc|Disch|Died|Killed|Deserted|Dismissed|Resigned)\W*", enl, re.I) else ''   # the verb fell into the muster column
                sb = sep_before_explicit((enl_verb + ' ' + rem).strip(), assume_window=True)
                if sb:
                    relabel(r, fn, rowno, 'ME-CONFLICT', 'Unknown', 'unreadable-or-ambiguous', 'CONFLICT',
                            'CONFLICT (PLAN 2.2 rule 10): the 1863 return dates a separation before the battle (%s) but the name matches the 1898 participants list (%s)' % (sb[0], 'a company other than the return row' if 'company-differs' in r['parse_flags'] else 'same company'), ['contested'])
                    stats['ME-CONFLICT part-list vs separation'] += 1
            # name_clean (given-first) ; officers/FS rows are given-first already
            gf, how = given_first(core, r['section']) if r['section'] not in ('officers',) and r['company'] != 'FS' else (core, 'gf-section')
            if gf != r['name_clean']:
                setf(r, fn, rowno, 'ME-NAMECLEAN', 'name_clean', gf)
            stats['ME-NAMECLEAN ' + how] += 1
            if how.endswith('unsure'):
                addflag(r, 'name-order-unsure')
            elif how.startswith(('sf', 'gf')) and r['section'] not in ('officers',):
                addflag(r, 'name-order-inferred')
            keep.append(r)
        allrows[fn] = keep

    for k, v in sorted(stats.items()):
        print(k, v)
    total_after = sum(len(v) for v in allrows.values())
    print('rows before', total_before, 'after', total_after, 'tombstoned', len(TOMB), 'recovered', stats['MA-SWALLOW recovered rows'])
    assert total_before - len(TOMB) + stats['MA-SWALLOW recovered rows'] == total_after, 'conservation'
    if MODE != 'apply':
        return
    frozen = os.path.join(DATA, '_pre_audit')
    if not os.path.exists(frozen):
        os.makedirs(frozen)
        for sub in ('maine', 'massachusetts', 'new-hampshire'):
            shutil.copytree(os.path.join(DATA, sub), os.path.join(frozen, sub))
        for fn in ('stats.json', 'README.md', 'QA-SAMPLE.md', 'progress.md'):
            if os.path.exists(os.path.join(DATA, fn)):
                shutil.copy2(os.path.join(DATA, fn), os.path.join(frozen, fn))
        print('frozen copy written', frozen)
    for fn, rows in allrows.items():
        with open(os.path.join(DATA, fn), 'w', encoding='utf-8', newline='') as fh:
            w = csv.DictWriter(fh, fieldnames=FIELDS, extrasaction='ignore', lineterminator='\n')
            w.writeheader()
            w.writerows(rows)
    with open(os.path.join(DATA, 'AUDIT-changes.csv'), 'w', encoding='utf-8', newline='') as fh:
        w = csv.DictWriter(fh, fieldnames=['file', 'row', 'name', 'repair', 'field', 'old', 'new'], lineterminator='\n')
        w.writeheader()
        w.writerows(CHANGES)
    with open(os.path.join(DATA, 'tombstones.csv'), 'w', encoding='utf-8', newline='') as fh:
        w = csv.DictWriter(fh, fieldnames=['_file', '_row', '_reason'] + FIELDS, lineterminator='\n')
        w.writeheader()
        w.writerows(TOMB)
    print('written', len(CHANGES), 'change lines,', len(TOMB), 'tombstones')


if __name__ == '__main__':
    main()

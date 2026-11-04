"""Officers named in Heitman's Historical Register (1903) with a Gettysburg event.
Part III (vol 2 of the IA copy): list of officers of the Regular Army killed, wounded or taken prisoner in action since 1789
   -> entries "Name, rank regiment, date, place, event" with place Gettysburg.
Part II (vol 1, A-M biographies) and the biographies in vol 2: brevets "for gal and mer ser in the battle of Gettysburg" (A-M only is on this copy's vol 1;
   the N-Z biographies are in the volume the IA item calls vol 2 only as far as its OCR text carries them).
Output: data/REG/heitman_gettysburg_officers.csv (every officer found, mapped to an OOB unit id where the regiment is a Regular regiment in REG scope).
Run: python -I -X utf8 heitman_gb.py"""
import re, os, sys, csv, collections
sys.path.insert(0, os.path.dirname(__file__))
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', '..'))
C = os.path.join(ROOT, 'tmp', 'library', 'rosters', 'REG')
OUT = os.path.join(ROOT, 'docs', 'battle-theatre', 'rosters', 'data', 'REG')
G = re.compile(r'[GCOQ][eo]tt?[yvuj]?[a-z]?[bh]')
REGMAP = {  # (number, arm) -> OOB unit ids that are battalions/companies of that Regular regiment
    ('2', 'inf'): ['U-2US'], ('3', 'inf'): ['U-3US-1', 'U-3US-2'], ('4', 'inf'): ['U-4US'], ('6', 'inf'): ['U-6US'], ('7', 'inf'): ['U-7US'],
    ('10', 'inf'): ['U-10US'], ('11', 'inf'): ['U-11US'], ('12', 'inf'): ['U-12US-1', 'U-12US-2'], ('14', 'inf'): ['U-14US'], ('17', 'inf'): ['U-17US'],
    ('8', 'inf'): ['PROVOST-8US'],
    ('1', 'cav'): ['U-1US-CAV'], ('2', 'cav'): ['U-2US-CAV'], ('5', 'cav'): ['U-5US-CAV'], ('6', 'cav'): ['U-6US-CAV'],
    ('1', 'art'): ['ART-1US'], ('2', 'art'): ['ART-2US'], ('3', 'art'): ['ART-3US'], ('4', 'art'): ['ART-4US'], ('5', 'art'): ['ART-5US'],
}


def entries_vol2():
    t = open(os.path.join(C, 'historicalregist02heitrich_djvu.txt'), encoding='utf-8', errors='replace').read()
    t = re.sub(r'-[ \t]*\n\s*(?=[a-z])', '', t)
    out = []
    cur = ''
    start = re.compile(r"^\*?\s*[A-Z][A-Za-z'\-]+(?: [A-Za-z'\-]+)?, [A-Z][A-Za-z\. ]*(?:, jr\.?)?, ")
    for raw in t.split('\n'):
        l = re.sub(r'\s+', ' ', raw).strip()
        if not l:
            continue
        for part in re.split(r' \* (?=[A-Z])', l):
            part = part.strip(' *')
            if start.match(part):
                out.append(cur)
                cur = part
            else:
                cur += ' ' + part
    out.append(cur)
    return out


CL = re.compile(r"(?P<rank>(?:capt|[12] ?[Il1] ?t|It|[12] lieut|maj|[Il1]t col|col|surg|asst surg|chap|bvt [a-z ]+|brig gen|maj gen|2 It|1 It)\.?)\s*(?P<reg>[0-9]{1,2}(?:\s?\([A-Z]\))?\s?[A-Za-z ]{0,8}?(?:inf|cav|art|drag|rifle|batty|engrs))?\s*,?\s*(?P<date>(?:\d{1,2}(?: ?(?:and|to) ?\d{1,2})? )?July 1863),\s*Gettysb[a-z]*\s*[A-Za-z]{0,3},\s*(?P<ev>[a-z ]+?)\s*(?:;|\.|$)")

STATE_TOK = {'Kans', 'Mont', 'Va', 'Pa', 'Tex', 'Ariz', 'Cal', 'Dak', 'Wyo', 'Ind', 'Ill', 'Mich', 'Minn', 'Mass', 'Conn', 'Fla', 'Ala', 'Ga', 'Ky', 'Md', 'Mo', 'Neb', 'Nev', 'Ore', 'Okla', 'Ter', 'Idaho', 'Utah', 'Cuba', 'Canada', 'Mex', 'Wis', 'Colo', 'Tenn', 'La', 'Miss', 'Ark', 'Ohio', 'Vt', 'Me', 'NH', 'RI', 'NJ', 'Del'}
ENTRY_START = re.compile(r"(?<=[.;\]] )(?=([A-Z][A-Za-z'\-]+(?: [A-Z][a-z]+)?), ([A-Z][a-z]+(?: [A-Z][A-Za-z]*\.?)*(?:, jr)?)\. [A-Z][A-Za-z ]{0,14}\.(?: [A-Z][A-Za-z ]{0,14}\.)? )")


def split_entries(p):
    """split a paragraph at the start of each 'Surname, Given. Birthplace. Appointed-from.' entry (Heitman Part II layout)."""
    cuts = [0]
    for m in ENTRY_START.finditer(p):
        if m.group(2).split(' ')[0].rstrip('.') in STATE_TOK:
            continue
        cuts.append(m.start())
    cuts.append(len(p))
    return [p[a:b].strip() for a, b in zip(cuts, cuts[1:]) if p[a:b].strip()]


def entries_vol1():
    t = open(os.path.join(C, 'historicalregist01heitrich_djvu.txt'), encoding='utf-8', errors='replace').read()
    t = re.sub(r'-[ \t]*\n\s*(?=[a-z])', '', t)
    ents = []
    for para in re.split(r'\n\s*\n', t):
        p1 = re.sub(r'\s+', ' ', para).strip(' *')
        # AUDIT 2026-10-30 (defect H2): one paragraph can hold several entries when the OCR lost the blank line between them;
        # the entry that carries the Gettysburg clause must keep its own name and its own service history.
        for seg in split_entries(p1):
            m = re.match(r"^([A-Z][A-Za-z'\-]+(?: [A-Za-z'\-]+)?), ([A-Z][A-Za-z\. ']+?)\.\s+(.*)$", seg)
            if m and G.search(seg):
                ents.append((m.group(1), m.group(2), m.group(3)))
    return ents


REGTOK = re.compile(r'(?<![\d/])(\d{1,2})\s+((?:[A-Z][a-z]{0,4}\.?\s?){0,2})(inf|cav|art|drgs|rifle|engrs)')


OUTSIDE = re.compile(r'(?:brig gen|maj gen|col|[Il1]t col|maj|capt|[12] It|asst adjt gen|a d c|a a g|a i g|a q m|a c s|chf|chief|mil sec|surg|paymr|asst surg)[^;]{0,40}?(?:vols|vol)(?![a-z])')
MONTHS = {'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'June': 6, 'July': 7, 'Aug': 8, 'Sept': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12}


def before_battle(cl):
    """True when the first dated item of the clause is earlier than 2 July 1863."""
    m = re.search(r'(\d{1,2}) (Jan|Feb|Mar|Apr|May|June|July|Aug|Sept|Oct|Nov|Dec) (18\d\d)', cl)
    if not m:
        return False
    y, mo, d = int(m.group(3)), MONTHS[m.group(2)], int(m.group(1))
    return (y, mo, d) < (1863, 7, 2)


def brevets():
    rows = []
    for sur, giv, body in entries_vol1():
        if re.search(r'C S A', body):
            continue
        cur = None
        outside = False  # AUDIT (defect H3): a commission in the Regular regiment says nothing about where the man was on 2 July 1863
        for cl in re.split(r';', body):
            if OUTSIDE.search(cl) and not re.match(r'^\s*bvt', cl) and before_battle(cl):
                outside = True
            yrs = [int(y) for y in re.findall(r'\b(18\d\d)\b', cl)]
            if not yrs or min(yrs) <= 1863:
                for m in REGTOK.finditer(cl):
                    cur = (m.group(1), m.group(2).strip(), m.group(3))
            if G.search(cl):
                ev = 'brevet for service in the battle' if re.search(r'bvt', cl) else ('wounded' if re.search(r'wound', cl) else ('killed' if re.search(r'kill', cl) else 'named'))
                reg = '%s %s%s' % (cur[0], (cur[1] + ' ') if cur[1] else '', cur[2]) if cur else ''
                units = REGMAP.get((cur[0], cur[2]), []) if (cur and not cur[1]) else []
                note = ''
                if outside and units:
                    note = 'outside-regiment: held a volunteer general, colonel or staff rank before the battle; the unit he was with is not stated by Heitman (not placed in a Regular regiment)'
                    units = []
                dm = re.search(r'(\d{1,2} )?July 1863', cl)
                rows.append(dict(name='%s, %s' % (sur, giv), rank_at_event=re.sub(r'\s+', ' ', cl.strip())[:30], regiment_raw=reg, date_raw=dm.group(0) if dm else '', event=ev,
                                 unit_ids=';'.join(units), evidence=re.sub(r'\s+', ' ', cl.strip())[:200], note=note,
                                 source='Heitman 1903 Part II (biographical register), IA historicalregist01heitrich'))
                break
    return rows


def main():
    rows = []
    for e in entries_vol2():
        if not G.search(e) or 'July 1863' not in e:
            continue
        m = re.match(r"^\*?\s*([A-Z][A-Za-z'\-]+(?: [A-Za-z'\-]+)?), ([A-Z][A-Za-z\. ]*?(?:, jr\.?)?),\s", e)
        if not m:
            continue
        sur, giv = m.group(1), m.group(2)
        body = e[m.end():]
        for cl in re.split(r';', body):
            if not G.search(cl):
                continue
            c = cl.strip()
            m2 = re.match(r"(?P<rank>[^,]+?)(?: (?P<num>\d{1,2}) ?(?P<arm>inf|cav|art|drag|rifle|batty|engrs))?\s*,\s*(?P<date>[^,]*1863),\s*(?P<place>[^,]*),\s*(?P<ev>[a-z ]+)", c)
            rank = reg = date = ev = ''
            if m2:
                rank = m2.group('rank'); date = m2.group('date'); ev = m2.group('ev').strip()
                n, arm = m2.group('num'), m2.group('arm')
                reg = '%s %s' % (n, arm) if n else ''
            else:
                rank = c[:40]
            # rank with regiment glued: e.g. "1 It 17 inf"
            m3 = re.match(r"(.*?)(\d{1,2}) (inf|cav|art|batty|drag|rifle)\s*$", rank)
            if not reg and m3:
                rank, reg = m3.group(1).strip(), '%s %s' % (m3.group(2), m3.group(3))
            if 'ft 1863' in c and False:
                pass
            units = []
            if reg:
                n, arm = reg.split(' ', 1)
                units = REGMAP.get((n, arm.strip()), [])
            rows.append(dict(name='%s, %s' % (sur, giv), rank_at_event=rank.strip(), regiment_raw=reg, date_raw=date.strip(), event=ev,
                             unit_ids=';'.join(units), evidence=re.sub(r'\s+', ' ', c)[:200], note='', source='Heitman 1903 Part III (killed, wounded, prisoner list), IA historicalregist02heitrich'))
    rows += brevets()
    path = os.path.join(OUT, 'heitman_gettysburg_officers.csv')
    with open(path, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)
    print(len(rows), 'rows;', collections.Counter(r['regiment_raw'] for r in rows).most_common(30))
    return rows


if __name__ == '__main__':
    main()

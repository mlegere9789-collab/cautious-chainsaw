"""2nd Rhode Island Volunteers (old organization) from the Official Register of Rhode Island Officers and Soldiers
(Adjutant General, 1866; IA officialregister00rhod, vol. 1, book pp. 43-91; djvu pages 49-97).
Columns: NAME AND RANK (x~195) | RESIDENCE (x~540) | DATE OF MUSTER (x~830) | REMARKS (x~1050)."""
import json, os, re, sys, collections
sys.path.insert(0, os.path.dirname(__file__))
from reg_common import *
from md_parse import lines_of
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', '..'))
W = os.path.join(ROOT, 'tmp', 'library', 'rosters', 'REG', 'work')
OUT = os.path.join(ROOT, 'docs', 'battle-theatre', 'rosters', 'data', 'REG')
P = json.load(open(os.path.join(W, 'ri_pages.json')))


def ri_year_fix(s):
    # the OCR reads the 6 of 186x as 0 or G or S: 1801 -> 1861, 1802 -> 1862 ...
    s = re.sub(r'\b18[0G]([1-5])\b', r'186\1', s)
    s = re.sub(r'\b1\.?[S8G]0?([1-5])\b', r'186\1', s)
    s = re.sub(r"'(0)([1-5])\b", r"'6\2", s)
    return s


def section_for(pg, y, lines_by_page):
    pass


def main():
    rows = []
    sect = 'FS'
    for pg in sorted(P, key=int):
        ip = int(pg)
        if not (51 <= ip <= 97):
            continue
        ln = lines_of(P[pg])
        cur = None
        firsts = sorted(r[0][0] for y, r in ln if y > 560 and r[0][0] < 400)
        left = firsts[len(firsts) // 8] if firsts else 195
        # column offsets of this page relative to the left margin (names ~ +0, residence ~ +345, date ~ +640, remarks ~ +855)
        for y, r in ln:
            txt = ' '.join(t for _, t in r)
            if y < 340 or re.search(r'REGIMENT|VOLUNTEERS\.|NAME\s+AND|DATE\s*$|MUSTER\.?$', txt) and len(r) < 8 and y < 560:
                continue
            m = re.fullmatch(r'COMPANY\s+([A-K])[.,;]?', txt.strip())
            if m and len(r) <= 3:
                sect = m.group(1); cur = None; continue
            if re.fullmatch(r'FIELD AND STAFF\.?', txt.strip()):
                sect = 'FS'; cur = None; continue
            if re.fullmatch(r'BAND\.?', txt.strip()):
                sect = 'BAND'; cur = None; continue
            if re.search(r'UNASSIGNED', txt):
                sect = 'UA'; cur = None; continue
            first = r[0][0]
            name_t = [t for x, t in r if x < left + 325]
            res_t = [t for x, t in r if left + 325 <= x < left + 620]
            date_t = [t for x, t in r if left + 620 <= x < left + 845]
            rem_t = [t for x, t in r if x >= left + 845]
            if first <= left + 30 and name_t and re.match(r"^[A-Za-z\.'\"\(]", name_t[0]):
                cur = dict(company=sect, name=' '.join(name_t), res=' '.join(res_t), date=' '.join(date_t), rem=' '.join(rem_t), page=pg)
                rows.append(cur)
            elif cur is not None:
                if name_t:
                    cur['name'] += ' ' + ' '.join(name_t)
                cur['res'] += (' ' + ' '.join(res_t)) if res_t else ''
                cur['date'] += (' ' + ' '.join(date_t)) if date_t else ''
                cur['rem'] += (' ' + ' '.join(rem_t)) if rem_t else ''
    json.dump(rows, open(os.path.join(W, 'ri2_rows.json'), 'w'))
    print(len(rows))
    return rows


def clause_sep(rem):
    """earliest separation date stated in the remark (clause-wise)."""
    best = None
    for cl in re.split(r';', rem):
        if re.search(r'(re-?enlist|veteran|prisoner|paroled|exchanged|returned|released)', cl, re.I) and not re.search(r'(discharg|died|killed)', cl, re.I):
            continue
        if re.search(r'(disch|dismiss|resign|died|killed|deserted|mustered out|dropped|mus\. out)', cl, re.I):
            ds = parse_dates(cl)
            if ds:
                d = ds[-1][0] if re.search(r'(wounded|prisoner).{0,60}(discharg|died|transfer)', cl, re.I) is None else ds[-1][0]
                best = d if best is None or d < best else best
    return best


def label(din, rem):
    if (GETT.search(rem) and CAS.search(rem)) or gb_casualty(rem):
        return 'Present-Documented', 'CAS-REMARK: remark names Gettysburg with a casualty event', 'named-present'
    sep = clause_sep(rem)
    if sep and sep < GB_START:
        return 'Absent-Documented', 'SEP-BEFORE: remark states a separation dated %s, before 1 July 1863' % sep.isoformat(), 'off-roll-before-battle'
    if din and din > GB_END:
        return 'Absent-Documented', 'ENL-AFTER: mustered %s' % din.isoformat(), 'not-yet-enlisted'
    if GETT.search(rem):
        return 'Unknown', 'remark mentions Gettysburg without a casualty word: check page image', 'unreadable-or-ambiguous'
    if din is None:
        return 'Unknown', 'no legible muster date', 'unreadable-or-ambiguous'
    return 'Unknown', 'ONROLL-NO-STATUS: on the roll before the battle, no separation before it; the roll gives no status for 30 June 1863', 'on-roll-undetermined'


if __name__ == '__main__':
    rows = main()
    out = []
    prev_din = None
    for r in rows:
        d = parse_dates(ri_year_fix(r['date']))
        din = d[0][0] if d else None
        fl = ''
        if din is None and prev_din is not None and not re.search(r'[A-Za-z0-9]', r['date']) and r['date'].strip():
            din = prev_din  # the date column carries only ditto marks: same muster date as the row above
            fl = 'date-ditto-inherited'
        if din is not None:
            prev_din = din
        rem = ri_year_fix(r['rem'])
        lab, basis, rs = label(din, rem)
        sect = 'officers' if r['company'] == 'FS' else ('band' if r['company'] == 'BAND' else 'roll')
        out.append(dict(unit_id='U-2RI', regiment='2nd Rhode Island Volunteers (original organization)', company=r['company'], section=sect,
                        name_as_printed=r['name'], rank_as_printed='', residence=r['res'], age='', date_in=din.isoformat() if din else '', date_out='',
                        remarks_as_printed=r['rem'], presence_label=lab, presence_basis=basis, roll_status=rs, source_id='RI-OFFREG-1866',
                        source_locator='IA officialregister00rhod djvu page %s' % r['page'], parse_flags=fl))
    write_csv(os.path.join(OUT, 'u-2ri.csv'), out)
    c = collections.Counter(x['presence_label'] for x in out); cs = collections.Counter(x['roll_status'] for x in out)
    print(len(out), dict(c), dict(cs), dict(collections.Counter(x['company'] for x in out)))

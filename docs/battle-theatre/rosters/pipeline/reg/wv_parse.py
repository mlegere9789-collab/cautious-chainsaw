"""West Virginia units from the Annual Report of the Adjutant General of West Virginia for 1864 (Appendix B company returns).
Two independent scans/OCR runs are on the Internet Archive: A = annualreportadj07offigoog (Google scan), B = AnnualReportOfTheAdjutantGeneralOfTheStateOfWestVirginia1864
(West Virginia University Libraries scan).  Columns on a return page: Names | Rank | age | When mustered into service | Remarks.
Rows: a dated line starts at the left margin with the name; a date that is only a day number is a ditto of the company's muster date (inherited, flagged).
Run: python -I -X utf8 wv_parse.py <A|B>   -> work/wv<A|B>_rows.json"""
import json, os, re, sys, collections
sys.path.insert(0, os.path.dirname(__file__))
from reg_common import *
from md_parse import lines_of
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', '..'))
W = os.path.join(ROOT, 'tmp', 'library', 'rosters', 'REG', 'work')

# (unit key, first page, last page) per scan
RANGES = {
    'A': [('7INF', 197, 234), ('1CAV', 476, 514), ('3CAV', 548, 577), ('1LA', 710, 713)],
    'B': [('7INF', 194, 232)],
}
RANK = re.compile(r"^(Priv|Serg|Corp|Mus|Wag|Capt|Lieut|1st|2d|2nd|Q\.|Surg|Asst|Chap|Col|Maj|Adj|Bug|Far|Black|Art|Sad|Hosp|Com|Ord|Cook|Teams|1t|2t|Sgt|Cpl)", re.I)
MONRE = re.compile(r'^(Jan|Feb|Mar|Apr|May|June?|July?|Aug|Sep|Sept|Oct|Nov|Dec)', re.I)


def company_of(top):
    m = re.search(r'Company\W{0,4}([A-Z])\W{0,4}\s+\w+\s+\w+', top)
    return m.group(1) if m else None


def parse_pages(which, unit, p0, p1, P):
    rows = []
    comp = None
    last_date = None
    for ip in range(p0, p1 + 1):
        w = P.get(str(ip))
        if not w:
            continue
        ln = lines_of(w)
        top = ' '.join(t for y, r in ln[:5] for x, t in r)
        c = company_of(top)
        if c and c in 'ABCDEFGHIKLM':
            if c != comp:
                last_date = None
            comp = c
        # header row y: the line carrying 'Names'/'Rank'/'Remarks'
        hy = 0
        for y, r in ln[:12]:
            if any(re.match(r'(Names?|Bank|Rank|Kank|Remarks?|Bemarks?|Bemarki|Remarkii)', t) for x, t in r):
                hy = max(hy, y)
        rank_xs = [x for y, r in ln if y > hy for x, t in r if RANK.match(t) and 700 < x < 1700]
        if len(rank_xs) < 3:
            continue
        rank_xs.sort()
        rx = rank_xs[len(rank_xs) // 2]
        namex = sorted(r[0][0] for y, r in ln if y > hy + 20 and r[0][0] < rx - 300)
        left = namex[len(namex) // 6] if namex else rx - 740
        cur = None
        for y, r in ln:
            if y <= hy + 20:
                continue
            name_t = [t for x, t in r if x < rx - 60]
            rank_t = [t for x, t in r if rx - 60 <= x < rx + 200]
            age_t = [t for x, t in r if rx + 200 <= x < rx + 330]
            date_t = [t for x, t in r if rx + 330 <= x < rx + 850]
            rem_t = [t for x, t in r if x >= rx + 850]
            first = r[0][0]
            if name_t and first <= left + 60 and re.match(r"^[A-Za-z\.'\(\*]", name_t[0]) and (rank_t or date_t or age_t or len(name_t) >= 2):
                dtxt = ' '.join(date_t)
                ds = parse_dates(dtxt)
                flags = []
                if ds:
                    last_date = ds[0][0]
                    din = ds[0][0]
                elif last_date and re.search(r'\d', dtxt) and not re.search(r'[A-Za-z]{3,}', dtxt):
                    din = last_date
                    flags.append('date-inherited-from-ditto')
                else:
                    din = None
                    if re.search(r'[A-Za-z]{3,}', dtxt):
                        last_date = None  # a printed date we could not read: never let the dittos below inherit an older date
                cur = dict(unit=unit, company=comp or '', name=' '.join(name_t), rank=' '.join(rank_t), age=' '.join(age_t), date_raw=dtxt, din=din.isoformat() if din else '',
                           rem=' '.join(rem_t), page=ip, flags=flags, scan=which)
                rows.append(cur)
            elif cur is not None and (rem_t or date_t) and not name_t:
                cur['rem'] += ' ' + ' '.join(rem_t)
                if date_t and not cur['din']:
                    cur['date_raw'] += ' ' + ' '.join(date_t)
            elif cur is not None and name_t and not rank_t and first > left + 60 and not rem_t:
                cur['name'] += ' ' + ' '.join(name_t)
    return rows


def main(which):
    P = json.load(open(os.path.join(W, 'wv%s_pages.json' % which)))
    allrows = []
    for unit, p0, p1 in RANGES[which]:
        if p0 == 0:
            continue
        r = parse_pages(which, unit, p0, p1, P)
        print(which, unit, len(r))
        allrows += r
    json.dump(allrows, open(os.path.join(W, 'wv%s_rows.json' % which), 'w'))


if __name__ == '__main__':
    main(sys.argv[1])

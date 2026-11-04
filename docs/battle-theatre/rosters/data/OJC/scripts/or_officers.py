import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
"""Officers killed / mortally wounded at Gettysburg, Connecticut, New Jersey and Ohio blocks, from OR Series I vol 27 part 1
(IA cu31924077699761, plain text, already cached in tmp/library/or27 by earlier work; US government publication).
Writes OR27-officer-casualties.csv and cross-references each name with the unit roster CSV (surname + initial match).
Run AFTER ct_emit / nj_emit / oh_emit (they rewrite the unit CSVs)."""
import re, csv, difflib, glob, collections
from ojc_common import *
import emit

SRC = os.path.join(REPO, 'tmp', 'library', 'or27', 'cu31924077699761_djvu.txt')
L = open(SRC, encoding='utf8', errors='replace').read().split('\n')


def block(a, b):
    out = []
    for x in L[a:b]:
        x = re.sub(r'\s+', ' ', x.strip())
        if not x or re.match(r'^(\[?Chap|THE GETT|N\. C\.|\d{3}$)', x):
            continue
        out.append(x)
    txt = ' '.join(out)
    txt = re.sub(r'(\w)- (\w)', r'\1\2', txt)
    return txt


# (list name, state, first line, last line exclusive) in the plain text of IA cu31924077699761
BLOCKS = [('killed', 'Connecticut', 24307, 24328), ('killed', 'New Jersey', 24515, 24530), ('killed', 'Ohio', 24706, 24744),
          ('mortally wounded', 'New Jersey', 25003, 25010), ('mortally wounded', 'Ohio', 25110, 25130)]
UNIT = {}
for st, nums, suffix in (('Connecticut', (5, 14, 17, 20, 27), 'CT'), ('New Jersey', (5, 6, 7, 8, 11, 12, 13), 'NJ'),
                         ('Ohio', (4, 5, 7, 8, 25, 29, 55, 61, 66, 73, 75, 82, 107), 'OH')):
    for n in nums:
        UNIT[(st, str(n))] = 'U-%d%s' % (n, suffix)
RANKS = r"(?:Lieut\.?\s*Col(?:onel)?\.?|Lieut\.?|Ldeut\.?|lieut\.?|Ident\.?|Capt\.?|Col\.?|Maj\.?|Asst\.?\s*Surg\.?|Surg\.?|Chap\.?)"
ENT = re.compile(r"(" + RANKS + r"\s+[^,]{4,70}?),\s+(\d{1,3})(?:st|nd|rd|th|d|ist|Ist)\s+(In\w*|Cav\w*|Artillery|Battery)")


def parse():
    rows = []
    for lst, state, a, b in BLOCKS:
        t = block(a, b)
        for m in ENT.finditer(t):
            rm = re.match(r"(" + RANKS + r")\s+(.*)", m.group(1).strip())
            rank, name = rm.group(1), rm.group(2)
            rank = {'Ldeut.': 'Lieut.', 'lieut.': 'Lieut.', 'Ident.': 'Lieut.'}.get(rank, rank)
            mm = re.match(r"(?:C!?ol\.?|CoL)\s+(.*)", name)
            if mm:
                rank, name = 'Lieut. Col.', mm.group(1)
            rows.append(dict(state=state, list=lst, rank_as_printed=rank, name_as_printed=name.strip(), unit_as_printed='%s %s' % (m.group(2), m.group(3)),
                             unit_id=UNIT.get((state, m.group(2)), '')))
    return rows


def surname_of(name):
    toks = [t for t in re.split(r"[\s,]+", name.replace('jr.', '').replace('jr', '').strip()) if t]
    return re.sub(r'[^a-z]', '', toks[-1].lower()) if toks else ''


if __name__ == '__main__':
    rows = parse()
    csvs = {}
    for f in sorted(glob.glob(os.path.join(DATA, '*.csv'))):
        if os.path.basename(f).startswith('OR27'):
            continue
        R = list(csv.DictReader(open(f, encoding='utf8')))
        if R:
            csvs[R[0]['unit_id']] = (f, R)
    out = []
    upgraded = 0
    for r in rows:
        r['matched_roster_row'] = ''; r['roster_label_before'] = ''; r['action'] = ''
        if not r['unit_id']:
            r['action'] = 'unit not in the OJC scope of the order of battle'; out.append(r); continue
        f, R = csvs.get(r['unit_id'], (None, None))
        if not R:
            r['action'] = 'no roster CSV for the unit'; out.append(r); continue
        sur = surname_of(r['name_as_printed'])
        first = r['name_as_printed'][:1].lower()
        best = None
        for i, x in enumerate(R):
            nm = x['name_clean'] or x['name_as_printed']
            if ',' in nm:
                sp, gv = nm.split(',', 1)
                rs_sur = re.sub(r'[^a-z]', '', sp.lower().split()[-1]) if sp.split() else ''
                rs_giv = [re.sub(r'[^a-z]', '', t.lower()) for t in gv.split() if re.sub(r'[^a-z]', '', t)]
            else:
                tk = [t for t in nm.split() if re.sub(r'[^A-Za-z]', '', t)]
                if len(tk) < 2:
                    continue
                rs_sur = re.sub(r'[^a-z]', '', tk[-1].lower())
                rs_giv = [re.sub(r'[^a-z]', '', t.lower()) for t in tk[:-1]]
            if not rs_sur or not rs_giv:
                continue
            sc = difflib.SequenceMatcher(None, sur, rs_sur).ratio()
            og = re.sub(r'[^a-z]', '', r['name_as_printed'].split()[0].lower())
            g0 = rs_giv[0]
            gsc = difflib.SequenceMatcher(None, og, g0).ratio() if len(g0) > 1 and len(og) > 1 else (1.0 if g0[:1] == og[:1] else 0.0)
            if sc >= 0.84 and gsc >= 0.7:
                if best is None or sc + gsc > best[0]:
                    best = (sc + gsc, i)
        if best:
            x = R[best[1]]
            r['matched_roster_row'] = '%s p.%s: %s' % (os.path.basename(f), x['source_page_idx_ia'], x['name_as_printed'])
            r['roster_label_before'] = x['presence_label']
            if x['presence_label'] != 'Present-Documented':
                x['presence_label'] = 'Present-Documented'; x['roll_status'] = 'named-present'; x['basis_code'] = 'CAS-OR27'
                x['presence_basis'] = 'named in the Union officers %s list, OR Series I vol 27 part 1 (%s, %s); the roster remark does not state it' % (r['list'], r['unit_as_printed'], r['state'])
                x['parse_flags'] = ';'.join(sorted(set(p for p in x['parse_flags'].split(';') if p) | {'label-from-OR27-officer-list'}))
                upgraded += 1
                r['action'] = 'roster row upgraded to Present-Documented'
            else:
                r['action'] = 'roster row already Present-Documented (second source)'
        else:
            r['action'] = 'no roster row matched (name garbled in the OCR text or absent from the page); kept here as a named officer present'
        out.append(r)
    for uid, (f, R) in csvs.items():
        with open(f, 'w', newline='', encoding='utf-8') as fh:
            w = csv.DictWriter(fh, fieldnames=emit.COLS); w.writeheader(); w.writerows(R)
    cols = ['state', 'unit_id', 'unit_as_printed', 'list', 'rank_as_printed', 'name_as_printed', 'matched_roster_row', 'roster_label_before', 'action']
    with open(os.path.join(DATA, 'OR27-officer-casualties.csv'), 'w', newline='', encoding='utf-8') as fh:
        w = csv.DictWriter(fh, fieldnames=cols); w.writeheader(); w.writerows(out)
    print(len(out), 'officers; upgraded', upgraded, dict(collections.Counter(o['action'][:45] for o in out)))

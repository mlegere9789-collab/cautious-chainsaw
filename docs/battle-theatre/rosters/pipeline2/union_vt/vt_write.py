"""Stage 2 of the Vermont build: the 11 unit files and their flag files.

    python3 -I docs/battle-theatre/rosters/pipeline2/union_vt/vt_write.py [--no-assert]       (run from the repository root)

Reads   tmp/library/rosters/union-vt-work/rows-<unit>.json         (vt_rows.py)
Writes  docs/battle-theatre/rosters/data2/union/vt/<unit>.jsonl.gz       one segment (VT-ROSTER-1892.1, layout cols), rows in page order
        docs/battle-theatre/rosters/data2/union/vt/<unit>.flags.json.gz  ocr_uncertain codes, on-the-rolls inference, footnote marks
        tmp/library/rosters/union-vt-work/write-report.json             counts for the report

Before a unit file is written every row is asserted against the pinned text (V1 name at its offset, V2 remark tokens in order inside the leaf,
V3 printed page of the leaf; vt_rows.assert_rows, the rules of r2lib.verify_rows).  A row that fails is not written.
The flags are derived from the printed cells by the rules in this file (documented in the report); no row is changed by them.
"""
import os, sys, json, gzip, re, collections, datetime
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import vt_lib as L          # noqa: E402
import vt_parse as P        # noqa: E402
import vt_rows as VR        # noqa: E402
R = L.R

OUT_DIR = os.path.join(L.D2, 'union', 'vt')
MONTHS = {'jan': 1, 'feb': 2, 'mch': 3, 'mar': 3, 'apr': 4, 'may': 5, 'june': 6, 'july': 7, 'aug': 8, 'sept': 9, 'oct': 10, 'nov': 11, 'dec': 12}
MON = r'(Jan|Feb|Mch|Mar|Apr|May|June|July|Aug|Sept|Oct|Nov|Dec)'
CELL_DATE = re.compile(r"^" + MON + r"\.?(\d{1,2})[,/.]?['’\"‘“]?(\d{2})\.?$")
TEXT_DATE = re.compile(MON + r"\.?\s*(\d{1,2})\s*[,.]?\s*['’\"‘“]{1,2}\s*(\d{2})")
BATTLE_START, BATTLE_END = datetime.date(1863, 7, 1), datetime.date(1863, 7, 3)

CODES = {
    'N': 'name text damaged (a character that is no part of a name, a lower-case start, a word run into the next, fewer than two words)',
    'H': 'the rank heading above the line is damaged (its letters are not those of a printed heading)',
    'C': 'the company title reads COMPANY without its letter in the text layer; the letter is taken from the order of the titles',
    'P': 'residence cell damaged (digits, marks, a word cut in two)',
    'E': 'date of enlistment (commission) cell damaged, cut or missing in the text layer',
    'M': 'date of muster (issue) cell damaged, cut or missing in the text layer',
    'K': 'remark text damaged (a word that is no printed word, no date mark, no name and not a word used elsewhere in the roll)',
    'W': 'a word of the printed line is in the word boxes but not in the text layer under the same spelling: it is missing from the remarks',
    'O': 'the text layer lists the words of the line in another order than the page does',
    'Y': 'words that stand on the line of a rank heading (above the line) were joined to this line',
    'F': 'the line carries an asterisk mark and the page prints the footnote "Enlisted for one year."',
}
DAMAGE_CODES = ('N', 'H', 'C', 'P', 'E', 'M', 'K', 'W', 'O', 'Y')
PARTICLES = {'de', 'van', 'von', 'der', 'den', 'la', 'le', 'du', 'del', 'di', 'da', 'ten', 'ter', 'dos', 'y'}


def parse_cell_date(text):
    t = re.sub(r'\s+', '', text)
    m = CELL_DATE.match(t)
    if not m:
        return None
    mo, day, yr = MONTHS[m.group(1).lower()], int(m.group(2)), int(m.group(3))
    if not (61 <= yr <= 66) or not (1 <= day <= 31):
        return None
    try:
        return datetime.date(1800 + yr, mo, day)
    except ValueError:
        return None


def text_dates(s):
    """[(start, end, date)] of the dates printed in running text (Mon. D, 'YY)."""
    out = []
    for m in TEXT_DATE.finditer(s):
        yr = int(m.group(3))
        if not (61 <= yr <= 66):
            continue
        try:
            out.append((m.start(), m.end(), datetime.date(1800 + yr, MONTHS[m.group(1).lower()], int(m.group(2)))))
        except ValueError:
            pass
    return out


# ------------------------------------------------------------------------------------------------ damage codes
def name_damaged(name):
    toks = name.split()
    if len(toks) < 2:
        return True
    for t in toks:
        core = t.strip(".,;:'\"()-")
        if not core:
            return True
        if re.fullmatch(r'(2d|3d|1st|2nd|3rd)[.,]?', t):
            continue
        if re.search(r"[^A-Za-z.,;:'\-()]", t):
            return True
        if re.search(r'[A-Za-z][.,][A-Za-z]', t):
            return True                                                    # two words run into one
        if core[0].islower() and core.lower() not in PARTICLES:
            return True
        if len(core) == 1 and not core.isupper():
            return True
        if re.search(r'[a-z][A-Z]', core) and not re.match(r"^(Mc|Mac|O'|De|Di|Le|La|Van)[A-Z]", core):
            return True
    return False


PLACE_TOK = re.compile(r"^([A-Z][A-Za-z'\-]*[.,;:]?|[A-Z]\.|[A-Z][a-z]?\.[A-Z]\.?,?|\(?[A-Z][A-Za-z]*\)?[.,]?)$")


def place_damaged(text):
    if not text.strip():
        return False
    for t in text.split():
        if re.search(r'[^A-Za-z.,;:\'\-()]', t):
            return True
        if t[0].islower() and t.strip('.,;:') not in ('of', 'de'):
            return True
        if not PLACE_TOK.match(t):
            return True
    return False


def date_cell_bad(text):
    return parse_cell_date(text) is None


# remark vocabulary: tokens used at least four times in the remarks of these 11 units are 'words of the roll'
def build_vocab(all_rem):
    c = collections.Counter()
    for rem in all_rem:
        for t in rem.split():
            c[t.lstrip('*•♦')] += 1
    return {t for t, n in c.items() if n >= 4}


def tok_ok(t, vocab):
    t = t.lstrip('*•♦')
    if not t or t in vocab:
        return True
    if re.fullmatch(r"\d{1,2}[,.;:]?", t):
        return True
    if re.fullmatch(r"['’\"‘“]{1,2}\d{2}[,.;:]?", t):
        return True
    if re.fullmatch(r"[A-Z][a-z]{2,}[.,;:]?", t):
        return True
    if re.fullmatch(r"[A-Z]\.[,;:]?", t):
        return True
    if re.fullmatch(r"\d+(st|d|th|nd|rd)[.,;:]?", t):
        return True
    if t in (';', ':', ',', '.', '-', '—', '(', ')', '[', ']'):
        return True
    return False


def remark_damaged(rem, vocab):
    return any(not tok_ok(t, vocab) for t in rem.split())


# ------------------------------------------------------------------------------------------------ on the rolls in July 1863
SEP = [
    ('Disch.', re.compile(r'(?<![A-Za-z])Disch(?![a-z])|Discharged')),
    ('Died', re.compile(r'(?<![A-Za-z])[Dd]ied(?![a-z])')),
    ('Killed', re.compile(r'(?<![A-Za-z])[Kk]illed(?![a-z])')),
    ('Des.', re.compile(r'(?<![A-Za-z])Des(?![a-z])|Deserted')),
    ('Resgd.', re.compile(r'Resgd|Resigned')),
    ('Dism.', re.compile(r'(?<![A-Za-z])Dism(?![a-z])|Dismissed')),
    ('Dropped', re.compile(r'Dropped')),
    ('Must. out', re.compile(r'Must\W{0,3}\s*out|Mustered\s+out')),
    ('Tr. out', re.compile(r'Tr\.\s*to\s+(?!Co\b|this\b|the\b)')),
]
RETURN = re.compile(r'Retd|Returned|(?<![A-Za-z])Ret\.')

BASIS = {
    'yes-after': 'enlistment (or muster) date printed before 1 July 1863; a separation is printed with a date on or after 1 July 1863 and none before',
    'yes-none': 'enlistment (or muster) date printed before 1 July 1863; no separation is printed in the remarks',
    'no-late': 'enlistment or muster date printed after 3 July 1863',
}


def infer_on_rolls(cols, rem_damaged):
    """('yes'|'no'|None, basis key) from the printed dates of one line.  None = unknown."""
    e, m = parse_cell_date(cols[1]), parse_cell_date(cols[2])
    rem = cols[3]
    # a separation printed before the battle makes the answer 'no' whatever else is damaged
    seps = []
    unknown = False
    for clause in rem.split(';'):
        for kind, rx in SEP:
            mt = rx.search(clause)
            if not mt:
                continue
            ds = [d for s0, e0, d in text_dates(clause) if s0 >= mt.start() - 1]
            if ds:
                seps.append((kind, ds[0]))
            else:
                unknown = True
            break
    for kind, d in seps:
        if d < BATTLE_START and not RETURN.search(rem):
            return 'no', 'no-sep:' + kind
    if (e and e > BATTLE_END) or (m and m > BATTLE_END):
        return 'no', 'no-late'
    start = e or m
    if start is None or start >= BATTLE_START:
        return None, None
    if rem_damaged or unknown or RETURN.search(rem) or re.search(r'(?<![A-Za-z])See\b', rem) or re.search(r'descriptive|never\s+joined|not\s+mustered', rem, re.I):
        return None, None
    if seps:
        return 'yes', 'yes-after'
    if not rem.strip():
        return None, None
    return 'yes', 'yes-none'


# ------------------------------------------------------------------------------------------------ files
def write_gz_json(path, obj):
    raw = (json.dumps(obj, ensure_ascii=False, separators=(',', ':')) + '\n').encode('utf-8')
    with open(path, 'wb') as f:
        with gzip.GzipFile(filename='', mode='wb', fileobj=f, compresslevel=9, mtime=0) as g:
            g.write(raw)
    return len(raw), os.path.getsize(path)


def main(assert_all=True):
    text, pm, ent = L.load_text()
    work = {}
    for key, desig, stem in L.UNITS:
        work[key] = json.load(open(os.path.join(L.WORK, 'rows-%s.json' % key), encoding='utf-8'))['rows']
    vocab = build_vocab([x['facts']['cols'][3] for k in work for x in work[k]])
    report = {'vocab_size': len(vocab), 'units': {}}
    os.makedirs(OUT_DIR, exist_ok=True)
    footnote_leaves = collections.defaultdict(set)
    rep1 = json.load(open(os.path.join(L.WORK, 'rows-report.json'), encoding='utf-8'))
    for key, v in rep1.items():
        for lf, y, t in v['event_samples'].get('footnote', []):
            footnote_leaves[key].add(lf)
    for key, desig, stem in L.UNITS:
        recs = work[key]
        rows = [x['row'] for x in recs]
        if assert_all:
            st, bad = VR.assert_rows(rows, text, pm)
            hard = {i for i, k in bad if any(c != 'rank-not-above' for c in k)}
            if hard:
                raise SystemExit('assertion failed for %s rows %s' % (key, sorted(hard)[:5]))
        groups = collections.defaultdict(list)
        yes, no, basis = [], [], []
        bid = {}
        for i, x in enumerate(recs):
            name, rank, co, rem, page, off, rd = x['row']
            f = x['facts']
            cols = f['cols']
            if name_damaged(name):
                groups['N'].append(i)
            if rank.startswith('^') and not P.heading_of(rank[1:])[1]:
                groups['H'].append(i)
            if f.get('co_inferred'):
                groups['C'].append(i)
            if place_damaged(cols[0]):
                groups['P'].append(i)
            if date_cell_bad(cols[1]):
                groups['E'].append(i)
            if date_cell_bad(cols[2]):
                groups['M'].append(i)
            kd = remark_damaged(cols[3], vocab)
            if kd:
                groups['K'].append(i)
            if f['unaligned']:
                groups['W'].append(i)
            if f['order_differs']:
                groups['O'].append(i)
            if f['stray']:
                groups['Y'].append(i)
            if f['leaf'] in footnote_leaves[key] and re.search(r'(^|\s)\*', rem):
                groups['F'].append(i)
            cls, b = infer_on_rolls(cols, kd)
            if cls:
                if b not in bid:
                    bid[b] = len(basis)
                    basis.append(BASIS[b] if b in BASIS else 'separation printed with a date before 1 July 1863: ' + b.split(':')[1])
                (yes if cls == 'yes' else no).append([i, bid[b]])
        ocr = sorted({i for c in DAMAGE_CODES for i in groups.get(c, [])})
        cells = [x['facts']['cols'] for x in recs]
        dated = []
        for i, x in enumerate(recs):
            clauses = x['facts']['cols'][3].split(';')
            for cl in clauses:
                if any(BATTLE_START <= d <= BATTLE_END for _, _, d in text_dates(cl)):
                    dated.append([i, re.sub(r'\s+', ' ', cl).strip()[:90]])
                    break
        path = os.path.join(OUT_DIR, stem + '.jsonl.gz')
        info = R.write_unit(path, key, 'union', 'vt', desig, [(L.SEG, rows)])
        flags = {'f': 'roster2-flags/1', 'u': key, 'n': info['n'],
                 'about': 'row numbers count the rows of the unit file in file order from 0; "ocr_uncertain" = the line is damaged in the text layer '
                          '(any of the codes N H C P E M K W O Y); the rows are never repaired; "on_rolls" is inferred from printed enlistment and '
                          'separation dates only; code F marks lines that carry the page footnote "Enlisted for one year."',
                 'codes': CODES, 'rows': {k: v for k, v in sorted(groups.items())}, 'ocr_uncertain': ocr,
                 'printed_event_dated_1_to_3_july_1863': {
                     'about': 'lines whose remark prints an event (wound, death, capture, promotion, muster out ...) with a date from 1 to 3 July 1863; '
                              'the clause is copied as the page prints it.  The line does not print the place: this is a printed date, not a statement of '
                              'presence at Gettysburg (compare the unit order of battle for where the unit stood on that date)',
                     'rows': dated},
                 'on_rolls_july_1863': {
                     'rule': 'inferred only from printed dates: "yes" needs a printed enlistment (or muster) date before 1 July 1863, no separation dated '
                             'before 1 July 1863, no cross-reference ("See ..."), no return from desertion, no damaged remark text and either a '
                             'separation dated on or after 1 July 1863 or none printed; "no" needs a printed separation dated before 1 July 1863 or '
                             'an enlistment or muster date after 3 July 1863; every other line is unknown',
                     'basis': basis, 'yes': yes, 'no': no}}
        fl_raw, fl_gz = write_gz_json(os.path.join(OUT_DIR, stem + '.flags.json.gz'), flags)
        cell_obj = {'f': 'roster2-cells/1', 'u': key, 'n': info['n'],
                    'about': 'the printed cells of every line of the unit file, by row number from 0, read by the position of each word on the page: '
                             '[residence, date of enlistment (commission), date of muster (issue), remarks]; the words are those of the text layer, '
                             'never corrected; the unit file keeps the same words in the order of the text layer (the remark string), which differs from the '
                             'page order on the lines flagged O; a word that runs across a column border (for example "Sept. 6,\'64|Sept.") stays in the '
                             'cell where it begins',
                    'columns': ['residence', 'enlistment_or_commission', 'muster_or_issue', 'remarks'], 'rows': cells}
        ce_raw, ce_gz = write_gz_json(os.path.join(OUT_DIR, stem + '.cells.json.gz'), cell_obj)
        gett = R.gettysburg_rows([(L.SEG, rows)])
        report['units'][key] = {'designation': desig, 'rows': info['n'], 'raw': info['raw'], 'gz': info['gz'], 'sha256_raw': info['sha256'],
                                'flags': {k: len(v) for k, v in groups.items()}, 'ocr_uncertain': len(ocr), 'on_rolls_yes': len(yes), 'on_rolls_no': len(no),
                                'on_rolls_unknown': info['n'] - len(yes) - len(no), 'gettysburg_in_remark': gett, 'flag_file_bytes': [fl_raw, fl_gz],
                                'cells_file_bytes': [ce_raw, ce_gz], 'dated_1_3_july_1863': len(dated)}
        print(key, info['n'], info['raw'], info['gz'], 'ocr_uncertain', len(ocr), 'yes/no', len(yes), len(no))
    json.dump(report, open(os.path.join(L.WORK, 'write-report.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main(assert_all='--no-assert' not in sys.argv)

"""Write the unit files, flag files and cells files of the Pennsylvania units from the rows of pa_build.py, and verify them.

    python3 -I docs/battle-theatre/rosters/pipeline2/union_pa/pa_write.py [--unit KEY]... [--no-verify]      (from the repository root)

Reads   tmp/library/rosters/union-pa-work/rows-<unit key>.json     (pa_build.py)
Writes  docs/battle-theatre/rosters/data2/union/pa/<unit>.jsonl.gz          roster2/2, one segment (the volume of Bates), layout cols
        docs/battle-theatre/rosters/data2/union/pa/<unit>.flags.json.gz     roster2-flags/1  (ocr_uncertain, on_rolls_july_1863, normalised_names, codes)
        docs/battle-theatre/rosters/data2/union/pa/<unit>.cells.json.gz     roster2-cells/1  (the words of a flagged line in the order of the page)
        docs/battle-theatre/GOVERNANCE/horde/ws-rosters/union-pa/diag/<unit>.json   lines whose name the text layer lost, orphan lines, headings
Every file is verified by verify_unit.verify_file (V1 name, V2 remarks, V3 page); a unit file that does not verify is removed.
"""
import os, sys, json, gzip, collections, re
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import pa_lib as L
import pa_units as PU
import pa_dates as D
import pa_tok as T

R = L.R
OUT = os.path.join(L.D2, 'union', 'pa')
DIAG = os.path.join(L.GOV, 'diag')

CODES = {
    'N': 'name text damaged in the text layer (a digit or mark inside a name word, a lower-case start, a letter pair the print does not have, a word run into the next, or no word of two letters)',
    'R': 'rank cell missing or damaged: the rank word or ditto mark of the line is not in the text layer, or the cell reads as no rank',
    'D': 'date of muster cell damaged: the month, the day or the year does not stand in the text layer as a date (the muster year is the usual loss)',
    'K': 'remark text damaged (a word that mixes letters and digits, or carries a mark no printed word has)',
    'G': 'stray marks (table rules, scanner marks) stand beside the line; they are kept in the remarks as the text layer has them',
    'J': 'the name cell and the rank cell are one word of the text layer ("Ewing....j...do"): cut at the leader dots, the part before is the name, the part after is the rank (the word stands in the pinned text)',
    'W': 'a word of the printed line is in the word boxes but not in the text layer under the same spelling: it is missing from the remarks',
    'S': 'a name word does not follow the name in the text layer: the name was cut there and the word stands in the remarks',
    'C': 'the company title above the line is damaged or lost in the text layer: the letter is taken from the order of the titles (or from the place that says where the company was recruited)',
    'O': 'the text layer lists the words of the line in another order than the page does (the cells file gives the order of the page)',
    'L': 'the line runs over more than six printed lines',
}
ON_ROLLS_RULE = ('inferred only from printed dates: "yes" needs a clean printed date of muster on or before 30 June 1863 and no separation printed (discharge, death, '
                 'desertion, transfer out, muster out) or only separations dated on or after 1 July 1863, no word of return or re-enlistment, no uncertain phrase '
                 '("not on muster-out roll", "date unknown" ...), and no separation without a clean date; "no" needs a printed date of muster after 3 July 1863 or a '
                 'separation with a clean date before 1 July 1863; every other line is unknown. A damaged date makes the line unknown.')
ABOUT = ('row numbers count the rows of the unit file in file order from 0; "ocr_uncertain" = the printed line is damaged in the text layer in at least one of the ways of the '
         'codes below (an empty result does not say the line is clean, it says no pattern matched); the rows are never repaired; "on_rolls_july_1863" is inferred from printed dates '
         'only and is no statement that the man was at Gettysburg; "normalised_names" only re-orders the printed tokens as Given Surname and strips stray marks at their ends, no letter '
         'is changed ("" where the head is not regular)')

_END_MARKS = re.compile(r"^[^A-Za-z0-9]+|[^A-Za-z0-9’']+$")


def normalise(name):
    """Given Surname form of a printed name; '' when the head is not regular."""
    toks = name.split()
    toks = [t for t in toks if T.core(t)]
    if not toks:
        return ''
    clean = [re.sub(r"[.…]{2,}.*$", '', t) if False else t for t in toks]
    # strip leader dots and marks at the end of the last token and marks at the start of the first
    clean[-1] = re.sub(r"[^A-Za-z0-9’'\.]+$", '', clean[-1]).rstrip('.') if clean[-1].rstrip('.').replace('.', '') else clean[-1]
    clean[-1] = re.sub(r"\.{2,}$", '', clean[-1])
    clean[0] = re.sub(r"^[^A-Za-z0-9’'\"]+", '', clean[0])
    if any(re.search(r'[0-9^~|*\\\[\]{}<>=_@#%&+/]', t) for t in clean):
        return ''
    if clean[0].endswith(','):
        sur = clean[0].rstrip(',')
        given = clean[1:]
        if not sur or not given or not all(re.match(r"^[A-Za-z’'.,\-]+$", t) for t in given):
            return ''
        # a suffix after the given names ("Jr", "Sr") stays at the end
        return ' '.join(g.rstrip(',') if k < len(given) - 1 else g for k, g in enumerate(given)).rstrip(',') + ' ' + sur
    if not all(re.match(r"^[A-Za-z’'.,\-\"]+$", t) for t in clean):
        return ''
    return ' '.join(clean)


def build_files(u, d):
    rows_all = d['rows']
    keep = [x for x in rows_all if u['co'] is None or x['row'][2] in u['co']]
    rows = [x['row'] for x in keep]
    for r in rows:
        if r[1].startswith('^'):
            raise ValueError('a rank that starts with ^ would be read as a carried heading: %r' % r[1])
    return keep, rows


def write_unit(u):
    d = json.load(open(os.path.join(L.WORK, 'rows-%s.json' % u['key']), encoding='utf-8'))
    keep, rows = build_files(u, d)
    seg = {'s': L.SRC, 'v': str(u['vol']), 't': L.text_id(u['vol']), 'lay': 'cols'}
    path = os.path.join(OUT, u['key'][len('u-pa-'):] + '.jsonl.gz')
    designation = None
    for x in json.load(open(os.path.join(L.D2, 'units.json')))['units']:
        if x['key'] == u['key']:
            designation = x['designation']
    meta = R.write_unit(path, u['key'], 'union', 'pa', designation, [(seg, rows)])
    # ---- flags
    n = len(rows)
    by_code = collections.defaultdict(list)
    ocr = set()
    yes, no, basis = [], [], []
    names_n = []
    cells = []
    for i, x in enumerate(keep):
        f = x['facts']
        for c in f['flags']:
            by_code[c].append(i)
            if c not in ('L',):
                ocr.add(i)
        names_n.append(normalise(x['row'][0]))
        rem_page = f.get('rem_page') or x['row'][3]
        cells.append(f.get('rem_page') or '')
        toks = rem_page.split()
        # a damaged date cell or damaged remark text: no inference
        if 'D' in f['flags']:
            continue
        st, why = D.on_rolls(toks)
        if st == 'yes':
            yes.append(i)
        elif st == 'no':
            no.append(i)
        if st:
            basis.append([i, why])
    sha = meta['sha256']
    flags = {'f': 'roster2-flags/1', 'u': u['key'], 'n': n, 'unit_file_raw_lines_sha256': sha, 'about': ABOUT,
             'codes': {c: CODES[c] for c in sorted(by_code)}, 'rows': {c: v for c, v in sorted(by_code.items())},
             'ocr_uncertain': sorted(ocr),
             'on_rolls_july_1863': {'rule': ON_ROLLS_RULE, 'basis': basis, 'yes': yes, 'no': no},
             'normalised_names': names_n}
    fp = os.path.join(OUT, u['key'][len('u-pa-'):] + '.flags.json.gz')
    with gzip.GzipFile(filename='', mode='wb', fileobj=open(fp, 'wb'), compresslevel=9, mtime=0) as g:
        g.write(json.dumps(flags, ensure_ascii=False, separators=(',', ':')).encode('utf-8'))
    # ---- cells: the words of a line in the order of the page, where that differs from the file
    diffs = {str(i): c for i, c in enumerate(cells) if c}
    cp = os.path.join(OUT, u['key'][len('u-pa-'):] + '.cells.json.gz')
    cobj = {'f': 'roster2-cells/1', 'u': u['key'], 'n': n,
            'about': 'rows: for every row of the unit file whose words stand in another order on the page than in the text layer (flag O), or that carry a stray word in the date cell (flag G), '
                     'the words of the remarks in the order of the page (visual line, then left to right); the unit file keeps the order of the text layer, which is what its offsets locate',
            'rows': [cells[i] for i in range(n)]}
    with gzip.GzipFile(filename='', mode='wb', fileobj=open(cp, 'wb'), compresslevel=9, mtime=0) as g:
        g.write(json.dumps(cobj, ensure_ascii=False, separators=(',', ':')).encode('utf-8'))
    # ---- diagnostics
    os.makedirs(DIAG, exist_ok=True)
    rej = [r for r in d['rejected'] if u['co'] is None or r['co'] in u['co']]
    json.dump({'unit': u['key'], 'rows': n, 'lost_name_lines': rej, 'orphans': d['orphans'], 'headings': d['headings']},
              open(os.path.join(DIAG, u['key'][len('u-pa-'):] + '.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    return path, meta, flags


def main(argv):
    only = [argv[i + 1] for i, a in enumerate(argv) if a == '--unit']
    verify = '--no-verify' not in argv
    os.makedirs(OUT, exist_ok=True)
    import verify_unit as V
    bad = 0
    tot = collections.Counter()
    for u in PU.U:
        if only and not any(o in u['key'] for o in only):
            continue
        if not os.path.exists(os.path.join(L.WORK, 'rows-%s.json' % u['key'])):
            print('no rows for', u['key'])
            bad += 1
            continue
        path, meta, flags = write_unit(u)
        res = V.verify_file(path) if verify else {'ok': True, 'v1_name_defects': 0, 'v3_page_defects': 0, 'stats': {}}
        tot['rows'] += meta['n']
        print('%-56s rows %5d raw %8d gz %7d  V1 %d V3 %d %s' % (u['key'][5:], meta['n'], meta['raw'], meta['gz'], res['v1_name_defects'], res['v3_page_defects'],
                                                                   'ok' if res['ok'] else 'FAIL'), flush=True)
        if not res['ok']:
            bad += 1
            print('   ', res.get('defect_samples'), res.get('problems'))
    print('rows', tot['rows'], 'failed units', bad)
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))

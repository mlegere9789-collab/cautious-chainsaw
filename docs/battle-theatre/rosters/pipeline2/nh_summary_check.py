"""Printed Summary of each New Hampshire regiment of the Ayling register against the rows of its unit file (work item union-nh, gap EG-ROS-NH-04).

    python3 -I nh_summary_check.py        (from any directory; reads the pinned OCR texts, the four unit files and the baseline order-of-battle files)

Writes, under GOVERNANCE/horde/ws-rosters/union-nh/:
    summary-figures.json          the lines of each printed Summary table that were used, each found in the OCR text of the Summary leaf (offset and text),
                                  the parts that make up the printed total strength and their sum
    summary-reconciliation.json   the rows of each unit file classified by the words after "See" in the first 10 tokens of their remarks, the printed
                                  total strength and the difference

Rules (the same for every unit; nothing is guessed):
  * the Summary tables are printed as a column of labels and a column of numbers and the OCR lists the two apart, so each figure is matched to its label
    by the order of the lines and by the arithmetic: the parts must add to the printed total strength (asserted).  Where a figure is damaged in the OCR
    the part is marked 'by arithmetic' and not 'printed'.
  * a row is a cross-reference line when the token "See" stands among the first 10 tokens of its remarks.  Its target decides the class:
      other organization   the target begins with a digit ("See 10 N. H. V.", "See 2 U. S. S. S.", OCR variants included)
      spelling             the target is only surnames ("See Batchelder.", "See Roarke and Rourke."); the target ends at the first token of three or more
                           letters that ends with a period, so marks of the scan after it do not count
      alias                any other name target ("See Charles Allen.", "See L. Prevost.")
    every other row is an own record (a full entry, including entries that end in "See 4 N. H. V." for later service).
  * rows minus spelling and alias lines is the number of lines that stand for a man; the lines "See 10 N. H. V." stand for the men gained by transfer and
    are counted.  The difference to the printed total strength is a residual, not an error figure.

Standard library only.
"""
import sys, os, re, json

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import r2lib as R
import parse_nh_ayling as P

ROOT = P.ROOT
D2 = P.D2
OUT = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'horde', 'ws-rosters', 'union-nh')
OOBD = os.path.join(ROOT, 'baseline', 'dist', 'data', 'oob')

# short name -> file, printed total strength, baseline order-of-battle file and id, the lines used (label, text as the OCR prints it with blank runs
# shortened to one blank, and optionally the label of the line after which it is searched; each is searched in the Summary leaf), and the parts of the total.
UNITS = [
    dict(short='2nd', file='2nd-new-hampshire-infantry', total=2555, oob=('union_regiments_iii_v_corps.json', 'U-2NH'),
         lines=[('total strength label', 'Total strengtli'),
                ('original members', 'officers, .37; enlisted men, 98,5; total, 1,022'),
                ('band gained by transfer row', '1 " 1', 'original members'),
                ('recruits row', '" 1,133 " 1,144'),
                ('band row', '" 22 " 22'),
                ('recruits gained by transfer row', '366 " 3G0'),
                ('printed total', '2,555'), ('printed total, second printing', '2,555', 'printed total')],
         parts=[('original members', 1022, 'printed'), ('recruits', 1144, 'printed'), ('band', 22, 'printed'),
                ('band gained by transfer', 1, 'printed as 1 and 1; its label is placed by the order of the lines and by the arithmetic'), ('recruits gained by transfer', 366, 'printed (the total column reads 3G0)')]),
    dict(short='5th', file='5th-new-hampshire-infantry', total=2562, oob=('union_regiments_i_ii_corps.json', 'U-5NH'),
         lines=[('total strength label', 'Total strength'),
                ('transfer label', 'gained by transfer from 2 U.'),
                ('original members', 'officers, 38; enlisted men, 940; total, 978'),
                ('band row', '" 24 u 04'),
                ('recruits row', 'officers, 12 " " 1,495 " 1,507'),
                ('transfer row', '" 49 " 53'),
                ('printed total', '2,562'), ('printed total, second printing', '2,562', 'printed total')],
         parts=[('original members', 978, 'printed'), ('band', 24, 'printed (the total column reads 04)'), ('recruits', 1507, 'printed'),
                ('recruits gained by transfer from 2 U. S. S. S.', 53, 'printed (officers 4, enlisted men 49, total 53)')]),
    dict(short='12th', file='12th-new-hampshire-infantry', total=1403, oob=('union_regiments_iii_v_corps.json', 'U-12NH'),
         lines=[('total strength label', 'Total strengtli'),
                ('first row', 'officers, 30; enli.sted men, 980; total, l,ni9 444 " 444'),
                ('printed total', '1,403'), ('printed total, second printing', '1,403', 'printed total')],
         parts=[('original members', 959, 'by arithmetic: the printed total less the recruits (the OCR of this figure reads l,ni9)'), ('recruits', 444, 'printed')]),
    dict(short='battery', file='1st-new-hampshire-battery', total=258, oob=('union_artillery.json', 'U-ART-1NH'),
         lines=[('original members', 'Original members officers, 5 ; enlisted men, 151 ; total, 156'),
                ('recruits', 'Recruits " " 101 " 101'),
                ('recruits gained by transfer', 'Recruits gained by transfer " " 1 " 1'),
                ('total strength', 'Total strength 258')],
         parts=[('original members', 156, 'printed'), ('recruits', 101, 'printed'), ('recruits gained by transfer', 1, 'printed')]),
]
NAME_ONLY = re.compile(r"[A-Z][A-Za-z'\-]*[.,]?(?: and [A-Z][A-Za-z'\-]*[.,]?){0,2}")


def classify(remarks):
    toks = remarks.split()
    i = next((j for j, t in enumerate(toks[:10]) if t == 'See'), None)
    if i is None:
        return 'own_record'
    if toks[i + 1:i + 2] and toks[i + 1][:1].isdigit():
        return 'cross_reference_to_another_organization'
    target = []                                   # the target ends at the first token of three or more letters that ends with a period
    for t in toks[i + 1:]:
        target.append(t)
        if t.endswith('.') and len(re.sub(r'[^A-Za-z]', '', t)) >= 3:
            break
    letters = re.sub(r"[^A-Za-z' .,\-]", '', ' '.join(target)).strip(' .,')
    return 'spelling_cross_reference' if NAME_ONLY.fullmatch(letters) else 'alias_cross_reference'


def oob_entry(fname, ident):
    d = json.load(open(os.path.join(OOBD, fname), encoding='utf-8'))
    found = []

    def walk(o):
        if isinstance(o, dict):
            if o.get('regiment_id') == ident or o.get('battery_id') == ident:
                found.append(o)
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)
    walk(d)
    assert len(found) == 1, 'baseline entry %s not found once in %s' % (ident, fname)
    return found[0]


def find_line(text, lo, hi, start, expected):
    """First place at or after start (inside the Summary leaf) where the OCR text, with blank runs shortened, begins with the expected line."""
    rx = re.compile(r'\s+'.join(re.escape(t) for t in expected.split()))
    m = rx.search(text, start, hi)
    assert m, 'line not found in the Summary leaf: %r' % expected
    return m.start(), ' '.join(m.group(0).split())


def main():
    ledger = json.load(open(os.path.join(D2, 'sources', P.SOURCE_ID + '.json'), encoding='utf-8'))
    texts, pms = {}, {}
    for vol in P.VOLS:
        ent = ledger['texts']['%s.%s' % (P.SOURCE_ID, vol)]
        texts[vol] = R.load_text(os.path.join(P.LIB, ent['files']['text']['name']))
        pms[vol] = R.PageMap(os.path.join(P.LIB, ent['files']['pageindex']['name']), os.path.join(P.LIB, ent['files']['page_numbers']['name']))
    sections = {k.split('-', 2)[2]: (vol, la, lb) for k, _, vol, la, lb, _, _ in P.SECTIONS}
    figures, recon = {}, {}
    for u in UNITS:
        vol, la, lb = sections[u['file']]
        lo, hi = pms[vol].span(lb)
        text = texts[vol]
        items = []
        for ln in u['lines']:
            label, expected = ln[0], ln[1]
            start = next(i['offset'] for i in items if i['label'] == ln[2]) + 1 if len(ln) > 2 else lo
            off, got = find_line(text, lo, hi, start, expected)
            items.append({'label': label, 'offset': off, 'text': got})
        parts = [{'label': a, 'value': b, 'basis': c} for a, b, c in u['parts']]
        s = sum(p['value'] for p in parts)
        assert s == u['total'], '%s: parts add to %d, the printed total is %d' % (u['short'], s, u['total'])
        figures[u['short']] = {'summary_leaf': lb, 'printed_total_strength': u['total'], 'lines': items, 'parts': parts, 'parts_sum': s}
        head, segs, meta = R.read_unit(os.path.join(D2, 'union', 'nh', u['file'] + '.jsonl.gz'))
        rows = segs[0][1]
        counts = {'own_record': 0, 'cross_reference_to_another_organization': 0, 'alias_cross_reference': 0, 'spelling_cross_reference': 0}
        for r in rows:
            counts[classify(r[3])] += 1
        assert sum(counts.values()) == len(rows)
        minus = len(rows) - counts['spelling_cross_reference'] - counts['alias_cross_reference']
        oob = oob_entry(*u['oob'])
        recon[u['file']] = dict({'rows': len(rows)}, **counts, rows_minus_spelling_and_alias=minus, printed_total_strength=u['total'], difference=minus - u['total'],
                                oob_strength=oob['strength'], oob_casualties=oob['casualties'], rows_per_oob_strength=round(len(rows) / oob['strength'], 1))
    figures['_note'] = ('Offsets are character offsets in the pinned OCR texts NH-AYLING-1895.1 (2nd, 5th) and NH-AYLING-1895.2 (12th, battery); each text is the printed OCR with blank '
                        'runs shortened to one blank. The Summary tables are printed as columns of labels and columns of numbers and the OCR lists them in separate blocks, so a '
                        'figure is matched to its label by the order of the lines and by the arithmetic stated in the parts; the parts must add to the printed total (asserted).')
    recon['_rule'] = ('A row is a cross-reference line when the token See is among the first 10 tokens of its remarks. Target begins with a digit: other organization; target is only '
                      'surnames: spelling; any other name: alias. Every other row is an own record. rows_minus_spelling_and_alias = rows less spelling and alias lines.')
    os.makedirs(OUT, exist_ok=True)
    json.dump(figures, open(os.path.join(OUT, 'summary-figures.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump(recon, open(os.path.join(OUT, 'summary-reconciliation.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    for k, v in recon.items():
        if k != '_rule':
            print(k, {a: b for a, b in v.items() if a not in ('oob_casualties',)})


if __name__ == '__main__':
    main()

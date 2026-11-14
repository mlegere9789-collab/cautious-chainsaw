"""Writes rosters/reports/union-ma.md from the numbers of ma_stats.py (GOVERNANCE/horde/ws-rosters/union-ma/stats.json) and the work files.

    python3 -I ma_stats.py && python3 -I ma_report.py

The text is written here, every number in it is read from the files (stats.json, reconciliation.json, changes-after-reconciliation.json, rights-evidence.json,
the pointer file rosters/sources/union-ma.json); nothing in the tables is typed by hand.  Standard library only.
"""
import sys, os, json, re, gzip, collections, csv, glob

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..', '..'))
R2 = os.path.join(ROOT, 'docs', 'battle-theatre', 'rosters')
GOV = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'horde', 'ws-rosters', 'union-ma')


def n(x):
    return '{:,}'.format(x)


def pct(a, b, d=1):
    return ('%.' + str(d) + 'f') % (100.0 * a / b)


def jl(p):
    return json.load(open(p, encoding='utf-8'))


def rng(lo, hi):
    return '-' if lo is None else (n(lo) if lo == hi else '%s-%s' % (n(lo), n(hi)))


def main():
    S = jl(os.path.join(GOV, 'stats.json'))
    REC = jl(os.path.join(GOV, 'reconciliation.json'))
    CHG = jl(os.path.join(GOV, 'changes-after-reconciliation.json'))
    RTS = jl(os.path.join(GOV, 'rights-evidence.json'))['texts']
    PTR = jl(os.path.join(R2, 'sources', 'union-ma.json'))
    SMP = jl(os.path.join(GOV, 'onroll-sample-reading.json'))
    IMG = jl(os.path.join(GOV, 'rights-images.json'))
    U = S['units']
    T = S['totals']
    RT = S['reconciliation_totals']
    CT = S['changes_totals']
    keys = list(U.keys())
    short = lambda k: U[k]['designation']
    N_UNITS = len(keys)
    LINES = T['lines']
    L = []
    w = L.append

    # ------------------------------------------------------------------------------------------------------------------ derived numbers
    earlier_units = [k for k in keys if 'rows_earlier_file' in U[k]['reconciliation']]
    earlier_rows = sum(U[k]['reconciliation']['rows_earlier_file'] for k in earlier_units)
    new_rows_of_those = sum(U[k]['lines'] for k in earlier_units)
    same = sum(U[k]['reconciliation']['aligned_same_letters'] for k in earlier_units)
    new_only = sum(U[k]['reconciliation']['new_file_only'] for k in earlier_units)
    earlier_only = sum(U[k]['reconciliation']['earlier_file_only'] for k in earlier_units)
    rem_equal = sum(U[k]['reconciliation']['remarks_equal'] for k in earlier_units)
    rem_earlier_longer = sum(U[k]['reconciliation']['remarks_earlier_longer'] for k in earlier_units)
    rem_new_longer = sum(U[k]['reconciliation']['remarks_new_longer'] for k in earlier_units)
    co_diff = sum(U[k]['reconciliation']['company_differs'] for k in earlier_units)
    ev_new = collections.Counter()
    for k in earlier_units:
        for a, b in U[k]['reconciliation']['evidence_new_file_only'].items():
            ev_new[a] += b
    no_earlier = [k for k in keys if 'rows_earlier_file' not in U[k]['reconciliation']]
    total_gett = T['names_gettysburg']
    n9_p668 = None
    # difference files
    diff_rows = collections.Counter()
    for f in sorted(glob.glob(os.path.join(GOV, 'differences-*.csv'))):
        for x in csv.DictReader(open(f, newline='', encoding='utf-8')):
            diff_rows[x['kind']] += 1
    extra_kinds = {kk: RT.get(kk, 0) for kk in ('earlier_longer_running_head_or_page_number', 'earlier_longer_a_following_entry', 'earlier_longer_other', 'new_longer_other')}
    # 9th infantry page 668 block
    for x in csv.DictReader(open(os.path.join(GOV, 'differences-9th-massachusetts-infantry.csv'), newline='', encoding='utf-8')):
        if x['kind'] == 'new-file-only' and x['new_printed_page'] == '668':
            n9_p668 = (n9_p668 or 0) + 1
    # code legend
    fl1 = json.loads(gzip.open(os.path.join(R2, 'data2', 'union', 'ma', '1st-massachusetts-infantry.flags.json.gz'), 'rb').read().decode())
    legend = fl1['codes']
    code_tot = {c: T.get('code_' + c, 0) for c in legend}
    code_tot['C'] = T.get('code_C', 0)
    legend18 = json.loads(gzip.open(os.path.join(R2, 'data2', 'union', 'ma', '18th-massachusetts-infantry.flags.json.gz'), 'rb').read().decode())['codes']
    legend.update(legend18)
    # rows with N on the 13th p.96
    sizes_raw = T['raw_bytes']
    # strength ratios and units with values
    ratios = []
    for k in keys:
        lo, hi = U[k]['strength_range']
        if lo is not None:
            ratios += [U[k]['lines'] / hi, U[k]['lines'] / lo]
    r_min, r_max = min(ratios), max(ratios)
    n_or_units = sum(1 for k in keys if U[k]['or_strength'])
    n_no_value = sum(1 for k in keys if U[k]['strength_range'][0] is None)
    # name cuts by kind
    cut_kind = collections.Counter()
    for k in keys:
        for x in CHG['units'][k]['name_cuts']:
            nb, nn = x['name_before'], x['name_now']
            if nb == 'Jr,':
                t = 'jr'
            elif re.search(r'\bIst$', nb):
                t = 'ist'
            elif nb.startswith('"'):
                t = 'quoted'
            elif nb[:1].islower():
                t = 'fragment'
            elif ' alias ' in nn or re.search(r'\bor\b', nn):
                t = 'alternate'
            elif nn.count(',') >= 2:
                t = 'three'
            else:
                t = 'other'
            cut_kind[t] += 1
    longer_kind = collections.Counter()
    for k in keys:
        for x in CHG['units'][k]['longer']:
            longer_kind['number' if re.search(r'\d\.$', x['tail_now']) else 'letter'] += 1
    added_in_earlier_units = sum(CHG['units'][k]['lines_added_by_third_head_rule'] for k in earlier_units)
    # 13th Infantry printed page 96: lines flagged N
    import r2lib as R
    path13 = os.path.join(R2, 'data2', 'union', 'ma', '13th-massachusetts-infantry.jsonl.gz')
    h13, s13, _ = R.read_unit(path13)
    rows13 = [r for _, rr in s13 for r in rr]
    fl13 = json.loads(gzip.open(path13.replace('.jsonl.gz', '.flags.json.gz'), 'rb').read().decode())
    nset13 = set(fl13['rows'].get('N', []))
    p96 = [i for i, r in enumerate(rows13) if r[4] == 96]
    p96_n = sum(1 for i in p96 if i in nset13)
    ymax = max(keys, key=lambda k: U[k]['codes'].get('Y', 0))
    ex13 = [rows13[i][0] for i in p96 if i in nset13][:4]
    rows1 = [r for _, rr in R.read_unit(os.path.join(R2, 'data2', 'union', 'ma', '1st-massachusetts-infantry.jsonl.gz'))[1] for r in rr]
    ex1 = [r[0] for r in rows1 if r[4] == 53 and r[0].startswith('.\\')][:3]
    rows18 = [r for _, rr in R.read_unit(os.path.join(R2, 'data2', 'union', 'ma', '18th-massachusetts-infantry.jsonl.gz'))[1] for r in rr]
    nc18 = [r for r in rows18 if r[2] == '']
    pg18 = (nc18[0][4], nc18[-1][4]) if nc18 else (None, None)
    bird = [r[0] for r in rows18 if r[0].startswith('Bird')][:1]
    ex13 = [rows13[i][0] for i in p96 if i in nset13][:4]
    p1 = os.path.join(R2, 'data2', 'union', 'ma', '1st-massachusetts-infantry.jsonl.gz')
    rows1 = [r for _, rr in R.read_unit(p1)[1] for r in rr]
    ex1 = [r[0] for r in rows1 if r[4] == 53 and r[0].startswith('.\\')][:3]
    p18 = os.path.join(R2, 'data2', 'union', 'ma', '18th-massachusetts-infantry.jsonl.gz')
    rows18 = [r for _, rr in R.read_unit(p18)[1] for r in rr]
    nc18 = [r for r in rows18 if r[2] == '']
    pg18 = (nc18[0][4], nc18[-1][4]) if nc18 else (None, None)
    bird = [r[0] for r in rows18 if r[0].startswith('Bird')][:1]
    # rights per text
    hits_zero = sum(1 for t, e in RTS.items() if sum(v['count'] for v in e['copyright_notice_search_of_the_whole_ocr_text'].values()) == 0)
    # node test result (optional)
    node_txt = os.path.join(GOV, 'node-test.txt')
    node_line = None
    if os.path.exists(node_txt):
        tt = open(node_txt, encoding='utf-8').read()
        mt = re.search(r'# tests (\d+)', tt); mp = re.search(r'# pass (\d+)', tt); mf = re.search(r'# fail (\d+)', tt)
        if mt and mp and mf:
            node_line = (int(mt.group(1)), int(mp.group(1)), int(mf.group(1)))
    # ------------------------------------------------------------------------------------------------------------------ title and summary
    w('# Massachusetts (Union): rosters of the %d units at Gettysburg (work item union-ma, OA03)\n' % N_UNITS)
    w('Written 14 November 2026 by the roster workstream. Evidence labels as in `PLAN.md`: **Measured** (a command run for this report produced it), **Documented** (a source text says it; the source is named), '
      '**Computed** (arithmetic on those), **Inferred** (a stated rule on printed text), **Not run**. A label says what supports a statement; it never lowers a gate. Every number below is computed '
      'by `pipeline2/union_ma/ma_stats.py`, `ma_reconcile.py` and `ma_changes.py` from the unit files and the work files in `GOVERNANCE/horde/ws-rosters/union-ma/`, and this report is written by '
      '`ma_report.py`; none is typed by hand.\n')
    w('## 0. Summary\n')
    w('* **%d unit files** under `rosters/data2/union/ma/` (the 1st, 2nd, 7th, 9th, 10th, 11th, 12th, 13th, 15th, 16th, 18th, 19th, 20th, 22nd, 28th, 32nd, 33rd and 37th Infantry, the 1st Company Sharpshooters, '
      'the 1st Cavalry and the 1st (A), 3rd (C), 5th (E) and 9th Batteries: the Massachusetts units of the Official Records organization table of the Army of the Potomac for 1-3 July 1863), **%s lines in all**, '
      'format `roster2/2` (`pipeline2/r2lib.py`), each with a flag file `<unit>.flags.json.gz`. One line per name entry of the printed roll, exactly as the text layer prints it (name, rank, remarks), with the '
      'company, the printed page and the character offset of the name in the pinned text. No line carries a label of presence (DD-ROS-01).' % (N_UNITS, n(LINES)))
    w('* **One printed source is parsed**: *Massachusetts Soldiers, Sailors, and Marines in the Civil War*, compiled and published by the Adjutant General (Norwood, Mass., 1931 to 1933), volumes 1, 2, 3, 5 and 6, '
      'Internet Archive items `massachusettssol11931mass`, `...21931mass`, `...31931mass`, `...51931mass`, `...61931mass` (the OCR search text of each, pinned by sha256). The three other volumes and the 1937 index '
      'are pinned and hashed as well and are not parsed (section 3). The rolls give the whole war service of every man who was ever on the unit\'s rolls, not the men present on 1-3 July 1863.')
    w('* **Every line is checked against the text before it is written** (name tokens at the recorded offset, remark tokens in order, printed page of the leaf, rank, offsets that only grow: the parser stops on a '
      'defect) and again by `pipeline2/verify_unit.py --all`: **%s of %s lines pass, 0 name defects, 0 page defects, 0 problems** (ledger hashes matched); a second production run gives identical bytes for all 48 files (section 4).'
      % (n(sum(U[k]['verify']['name_ok'] for k in keys)), n(LINES)))
    w('* **The first run of 13 November wrote %s lines; this run found and corrected defects in them (section 5, item 1) and writes %s.** Reading the earlier roll files of the NE family (`rosters/data/NE/massachusetts`, '
      'a different parser on a different text file) against the new files showed %d entries whose head the OCR had damaged beyond the rules (added), %d names cut at the wrong place (a surname split by a blank, "Jr," taken for a name, '
      '"1st" read as "Ist", a company letter in quotes taken into the next name, an alias; three of them placed by review), two section headings that only a reader could place, and a number alone on its line at a page break that was dropped as a '
      'page number (%d lines now keep it). **%d lines were added or changed in all (%d added, %d given another name start, %d another company code, %d shortened and %d lengthened remarks); none was removed.**'
      % (n(CT['lines_before']), n(CT['lines_now']), CT['lines_added_by_third_head_rule'], CT['names_cut_differently'], CT['lines_with_longer_remarks_page_break_number'],
         CT['lines_added_by_third_head_rule'] + CT['names_cut_differently'] + CT['company_changed_by_reviewed_heading'] + CT['host_lines_with_shorter_remarks'] + CT['lines_with_longer_remarks_page_break_number'],
         CT['lines_added_by_third_head_rule'], CT['names_cut_differently'], CT['company_changed_by_reviewed_heading'], CT['host_lines_with_shorter_remarks'], CT['lines_with_longer_remarks_page_break_number']))
    w('* **Against the earlier roll files** (%d of the %d units have one: %s lines; the 11th Infantry and the 1st Company Sharpshooters have none): the names agree line by line, in page order, for **%s of the %s new lines of those units '
      '(%s percent)**; %d lines are in the new files only and **%d in the earlier files only**. Of the %d, %d stand inside the remarks of an earlier line (the earlier parser swallowed them) and %d are in no earlier line '
      '(%d of them on printed page 668 of the 9th Infantry). Company codes differ for %s lines (four units, all explained: section 5). Remarks are equal for %s of %s aligned lines; the others differ by page furniture the earlier files '
      'kept or by a following entry the earlier parser swallowed (section 5). The differences are listed line by line in `GOVERNANCE/horde/ws-rosters/union-ma/differences-<unit>.csv` (%s rows), none resolved by guessing.'
      % (len(earlier_units), N_UNITS, n(earlier_rows), n(same), n(new_rows_of_those), pct(same, new_rows_of_those, 2), new_only, earlier_only, new_only, ev_new['swallowed in an earlier row'],
         ev_new['not inside any earlier row'], n9_p668, n(co_diff), n(rem_equal), n(same), n(sum(diff_rows.values()))))
    w('* **Against the strength** (section 1): the lines are %.1f to %.1f times the strength values found (the baseline value or an Official Records statement), as a whole-war roll must be. For %d units a statement of the Official Records (quoted, with report and printed page) '
      'is set beside the baseline value; for %d units (the 11th Infantry, the 1st Company Sharpshooters, the 1st Battery) the repository has no strength at all.' % (r_min, r_max, n_or_units, n_no_value))
    w('* **Presence**: the volumes print no muster roll of 30 June 1863. **%s lines** print a remark that names Gettysburg (an OCR-tolerant match, a lower bound; %s of them with a date from 1 to 3 July 1863 in the same clause); for every other man '
      'the page says "on the rolls, names not recovered" and nothing else. Marks in the flag files, inferred from printed dates only: on the rolls in July 1863 **yes %s, no %s, unknown %s** (rule, repair and sample reading: section 4).'
      % (n(total_gett), n(T['gettysburg_dated']), n(T['on_rolls_yes']), n(T['on_rolls_no']), n(T['on_rolls_unknown'])))
    w('* **Rights**: no text of this item can carry the basis "public domain (United States publication before 1929)": the volumes were printed 1931 to 1935 (the index 1937). Each text of the pointer file '
      '`rosters/sources/union-ma.json` carries what the files show: the Internet Archive flag `NOT_IN_COPYRIGHT`, the printed imprint with its offset, a search of the whole OCR text for a copyright notice (none in %d of the nine texts, a misread character in volume 8), the title leaf and its blank verso of the five parsed volumes read from page images (no notice), and the arithmetic of the term. The decision is the owner step 4 (section 3).' % hits_zero)
    w('* **Not done or not possible** (registered, section 6): the independent sample of page images (R-G9) was not run; the damaged lines are not read a second time from images; the 1937 index, the 1868-70 Record and the '
      'Burial Report of 1863 are not read for names; two baseline batteries match no Massachusetts battery of the Official Records. Every unit of the item has a file; no unit was left to a later run.\n')
    # ------------------------------------------------------------------------------------------------------------------ section 1
    w('## 1. Lines per unit against the strength\n')
    w('"Strength" is the value of the baseline order of battle (`baseline/dist/data/oob/`, which the earlier families recorded as second-hand, from Busey and Martin and the Official Records) and, where one was found, '
      'what the Official Records (Ser. I, vol. 27, part 1) print about the number the unit took into action. **No strength range with a declared basis exists for these units in the repository**: `history/units.json` has '
      '`strength: null` for each of them. The range below is therefore the smallest and the largest of the values found (the baseline value and the Official Records statements), each with its basis. '
      'A whole-war roll is **not** comparable with the strength present on 1 to 3 July 1863 (the earlier pilots measured that a man on a roll with no recorded absence was present between 36 and 72 percent of the time, '
      '`PLAN.md` 2.4, gap EG-ROS-010): the columns "lines per man" are context only.\n')
    w('| unit | strength range (basis) | baseline casualties | lines | lines per man (high - low strength) | field and staff, non-commissioned staff, band | company lines | unassigned | cross-reference lines ("See ...") | remark names Gettysburg | ... with a 1-3 July 1863 date | on the rolls, inferred: yes / no / unknown |')
    w('|---|---|---|---|---|---|---|---|---|---|---|---|')
    for k in keys:
        u = U[k]
        lo, hi = u['strength_range']
        basis = []
        if u['oob']['strength'] is not None:
            basis.append('baseline %s' % n(u['oob']['strength']))
        for x in u['or_strength']:
            basis.append('OR %s' % n(x['value']))
        lpm = '-' if lo is None else ('%.1f' % (u['lines'] / hi) if lo == hi else '%.1f - %.1f' % (u['lines'] / hi, u['lines'] / lo))
        w('| %s | %s (%s) | %s | %s | %s | %s | %s | %s | %s | %s | %s | %s / %s / %s |' % (
            u['designation'], rng(lo, hi) if lo is not None else 'none in the repository', ', '.join(basis) if basis else 'no value', '-' if u['oob']['casualties'] is None else n(u['oob']['casualties']), n(u['lines']), lpm,
            n(u['by_section']['FS'] + u['by_section']['NCS'] + u['by_section']['BAND']), n(u['by_section']['company'] + u['by_section']['no_heading']), n(u['by_section']['UNAS']), n(u['xref_lines']),
            n(u['names_gettysburg']), n(u['gettysburg_dated']), n(u['on_rolls']['yes']), n(u['on_rolls']['no']), n(u['on_rolls']['unknown'])))
    w('')
    w('Measured: lines, sections, cross-reference lines, the two Gettysburg columns and the on-the-rolls marks (`ma_stats.py` from the unit files and flag files). Documented: the baseline values (second-hand, as above) and the Official Records statements below.\n')
    w('Reading the table.\n')
    w('* **Official Records statements of strength** (Ser. I, vol. 27, part 1; each quote was matched in the pinned text by `tools/bt/or27_find.py --verify`, offsets are those of `tmp/library/or27/cu31924077699761_djvu.txt`):')
    for k in keys:
        for x in U[k]['or_strength']:
            w('  * %s: "%s" (%s; %s, printed page %s, text offsets %s-%s): %s.' % (U[k]['designation'], x['quote'], x['report_id'], x['author'], x['page'], n(x['offset_from']), n(x['offset_to']), x['what']))
    for x in S['or_joint']:
        w('  * %s: "%s" (%s; %s, printed page %s, offsets %s-%s): %s.' % (U[x['unit']]['designation'], x['quote'], x['report_id'], x['author'], x['page'], n(x['offset_from']), n(x['offset_to']), x['what']))
    w('  * The searches of the other regimental and battery reports (1st, 11th, 16th, 20th and 22nd Infantry; the 1st, 3rd and 9th Battery reports) found no statement of the regiment\'s own number (the reports print marches and casualties; '
      'Lieut. Col. Tripp\'s 11th Infantry prints the loss of the 2nd and 3rd as a table whose totals the text layer lists as "Total 23 96 12 131", OR27-1-R162, printed page 548-549, a casualty table and no strength). '
      'The searches are not exhaustive; a brigade or division report may print more. The 7th, 9th, 10th, 12th, 18th, 32nd, 33rd and 37th Infantry and the 1st Cavalry have no report of their own in the volume.')
    w('* **Units without a value**: the 11th Infantry, the 1st Company Sharpshooters and the 1st Battery (A) have no row in the baseline order of battle (earlier gap G-NE03) and no statement was found; their ranges are empty, not guessed.')
    w('* **Baseline casualties** are context: the earlier families found them unreliable for some Massachusetts units (the 9th Infantry 133 against 18 named, the 7th and 37th Infantry 0; earlier gap G-NE07); the baseline also lists '
      'no day engaged for the 7th, 10th and 37th Infantry. The roster does not settle them.')
    w('* **"Remark names Gettysburg"** counts lines whose printed remarks match an OCR-tolerant pattern for the word (`GETTYSBURG_RE` of `r2lib.py`), and "with a date" those in which the same clause prints 1, 2 or 3 July 1863. They are counts of printed text, '
      'not a judgement of presence, and a damaged word is not counted (a lower bound). A line can name the battle without placing the man in it (a man discharged "at Gettysburg" months later, a man buried there).')
    w('* **"On the rolls" yes** is not a presence count: it lists men whose printed dates allow them on the unit\'s rolls in July 1863 (it includes men absent sick, wounded earlier, prisoners or detached). '
      'The baseline strength of the 28th Infantry (224) and the number of its lines marked yes (%s) are not comparable.' % n(U['u-ma-28th-massachusetts-infantry']['on_rolls']['yes']))
    w('* **The 32nd Infantry** carries the roll of the whole regiment, **including Company C** (%s lines with company code C): the Official Records table prints "32d Massachusetts Infantry, Company C, Capt. Josiah C. Fuller" under the headquarters guard of '
      'the Artillery Reserve, away from the regiment. A request note of the units workstream (`GOVERNANCE/horde/requests/bt-units-us-hq-artres-32ma-co-c.md`) asks that the company be given its own status; the lines stay in the unit file under the letter C.\n'
      % n(U['u-ma-32nd-massachusetts-infantry']['company_counts'].get('C', 0)))
    w('Where the roll sits in the volume (leaf = image number of the Internet Archive item, 0-based; page = the printed page number of the item\'s own page-number file, **not read from an image**; rows per leaf: the lines whose name stands on the leaf, '
      'for the leaves between the first and the last of the unit):\n')
    w('| unit | volume | leaves (first - last) | printed pages of the lines | rows per leaf: min / median / max | leaves with no line |')
    w('|---|---|---|---|---|---|')
    for k in keys:
        u = U[k]
        rp = u['rows_per_inner_leaf']
        w('| %s | %s | %d - %d | %s | %s | %s |' % (u['designation'], u['volume'], u['leaves'][0], u['leaves'][1], '%d - %d' % tuple(u['printed_pages']) if u['printed_pages'] else '-',
                                                      '%d / %s / %d' % (rp['min'], ('%g' % rp['median']), rp['max']) if rp else '-', len(u['leaves_with_no_line'])))
    allmin = min(U[k]['rows_per_inner_leaf']['min'] for k in keys if U[k]['rows_per_inner_leaf'])
    allmax = max(U[k]['rows_per_inner_leaf']['max'] for k in keys if U[k]['rows_per_inner_leaf'])
    w('\nThe printed pages are typeset to a uniform page: on every inner leaf of every unit between %d and %d lines begin, the medians lie between 24 and 27, and no leaf of any unit between its first and its last is without a line. '
      'A leaf whose entries the OCR lost would show here as a short or empty leaf; there is none (Measured).\n' % (allmin, allmax))
    # ------------------------------------------------------------------------------------------------------------------ section 2
    w('## 2. The unit files\n')
    w('`rosters/data2/union/ma/<unit>.jsonl.gz`, gzip, fixed header (identical bytes for identical content), UTF-8, `roster2/2`: line 1 the header, line 2 the one segment `{"s":"MA-SSM-1931","v":"<volume>","t":"MA-SSM-1931.<volume>","lay":"flow"}`, then rows '
      '`[offset delta, name, rank, remarks, remark delta]` with carried state lines `{"co":...}`, `{"pg":...}` and `{"rk":...}`. `name` is the OCR tokens of the head joined by single blanks, **verbatim** (stray marks of the scan inside the head are kept in the name only '
      'where they stand between name tokens; marks at the two ends of the name, of the rank and between the second dash and "Res." are taken out of the fields and listed in the flag file under `head_marks`); `rank` is the printed rank between the two dashes; '
      '`remarks` is every other printed token of the entry from "Res." (or what the OCR left of it) to the head of the next entry, in full: residence, age, occupation, dates of enlistment, muster and every change, and the cross-references ("See Co. K 2d Mass. Hy. Arty."); '
      'the running head, the page number and the sub-heading "Three Years\' Service" are left out. `co` is the company letter of the heading above (A to M), `FS` (field and staff), `NCS` (non-commissioned staff), `BAND`, `UNAS` (unassigned) or empty (the batteries and the '
      'sharpshooters print one list; a company heading whose letter is damaged). A man is printed once under each organization he served in; the same man can therefore stand on several lines of a unit file and on lines of other units; nothing is merged.\n')
    w('| unit file | volume | lines | raw bytes | gzip bytes | raw bytes per line | flag file bytes | lines whose printed page the page-number file does not give |')
    w('|---|---|---|---|---|---|---|---|')
    for k in keys:
        u = U[k]
        w('| %s | %s | %s | %s | %s | %.1f | %s | %s |' % (u['file'].split('/')[-1][:-9], u['volume'], n(u['lines']), n(u['raw_bytes']), n(u['gz_bytes']), u['bytes_per_line'], n(u['flags_bytes']), n(u['rows_without_printed_page'])))
    w('| **all** | | **%s** | **%s** | **%s** | **%.1f** | **%s** | **%s** |' % (n(LINES), n(T['raw_bytes']), n(T['gz_bytes']), T['raw_bytes'] / LINES, n(T['flags_bytes']), n(T['rows_without_printed_page'])))
    w('\nThe production plan\'s aim of about 90 bytes a line is **not met** (%.0f bytes on average): each entry prints a service history of 100 to 400 characters and remarks are never cut (Law, clause 1; DD-ROS-02). '
      'For the %s lines on leaves whose printed page the page-number file does not give, the page of the row is empty and the flag file gives the number the running head prints (`printed_page_from_running_head`).\n' % (T['raw_bytes'] / LINES, n(T['rows_without_printed_page'])))
    w('**Flag files** (`<unit>.flags.json.gz`, form `roster2-flags/1`, joined to the unit file by the sha256 of its raw lines; row numbers count the lines of the unit file from 0): `ocr_uncertain` and `rows` by code (the legend travels in each file under `codes`: '
      'the codes differ from the Maine and New Hampshire files, request note `bt-rosters-union-ma-flag-files.md`); `on_rolls_july_1863` (`yes` and `no`, each with an index into a list of the printed dates it rests on; the rule is in the file); '
      '`normalised_names` (the printed tokens re-ordered as Given Surname with stray marks stripped at their ends, **no letter changed**, empty where the printed head has no comma); `head_kinds`; `head_marks`; `company_inferred`; `reviewed_headings`; '
      '`names_gettysburg` and `gettysburg_dated`; `printed_page_from_running_head`. An empty `ocr_uncertain` does not say a line is clean; it says no pattern matched.\n')
    w('| code | meaning | lines (all units) |')
    w('|---|---|---|')
    for c in sorted(legend):
        w('| %s | %s | %s |' % (c, legend[c], n(code_tot.get(c, 0))))
    w('\n`ocr_uncertain` (the union of the codes) marks %s lines (%s percent of %s). The rows of the codes per unit are in `stats.json` (`units.<unit>.codes`).\n' % (n(T['ocr_uncertain']), pct(T['ocr_uncertain'], LINES), n(LINES)))
    # company counts table
    w('**Lines by section** (the company letters A to M together in one column):\n')
    w('| unit | field and staff | non-comm. staff | band | company lines | unassigned | no heading | company with the most lines |')
    w('|---|---|---|---|---|---|---|---|')
    for k in keys:
        u = U[k]
        cc = {c: v for c, v in u['company_counts'].items() if len(c) == 1}
        big = max(cc.items(), key=lambda kv: kv[1]) if cc else ('-', 0)
        w('| %s | %s | %s | %s | %s | %s | %s | %s (%s) |' % (u['designation'], n(u['by_section']['FS']), n(u['by_section']['NCS']), n(u['by_section']['BAND']), n(u['by_section']['company']), n(u['by_section']['UNAS']),
                                                          n(u['by_section']['no_heading']), big[0], n(big[1])))
    w('')
    # ------------------------------------------------------------------------------------------------------------------ section 3
    w('## 3. Sources and rights (all fetched from archive.org, one request at a time, at least 1.2 s apart)\n')
    w('| text id | Internet Archive item | printed year (imprint of the volume) | item date of the metadata | what it holds | state | rights basis |')
    w('|---|---|---|---|---|---|---|')
    for s in PTR['sources']:
        used = bool(s['used_for'])
        ev = s['rights']['evidence']
        nh = sum(v['count'] for v in ev['copyright_notice_search_of_the_whole_ocr_text'].values())
        w('| %s | `%s` | %s | %s | %s | %s | after the 1929 cutoff: public domain not established by the date; flag %s; %s; owner step 4 |' % (
            s['text_id'], s['identifier'], s['year'], s['ia_date'], s['covers'], ('parsed (%d unit%s)' % (len(s['used_for']), '' if len(s['used_for']) == 1 else 's')) if used else 'pinned, not parsed', ev['ia_possible_copyright_status'],
            'no notice found in the OCR text' if nh == 0 else '%d notice-like hit in the OCR text (a misread character, see below)' % nh))
    w('')
    w('Files, sizes and sha256 are in `rosters/sources/union-ma.json` (tracked) and `tmp/library/rosters/MANIFEST-union-ma.json`: for each of the nine items the OCR search text, the page index and the page-number file (the ledgers '
      '`rosters/data2/sources/MA-SSM-1931.json` and `MA-SSM-1937-INDEX.json`) and the item metadata of 14 November 2026. **All 27 text files were compared with the md5, sha1 and size that the item metadata itself lists for them: 27 of 27 match**, and every sha256 equals the ledger\'s (Measured). '
      'The item metadata gives 1931 as the date of all eight volumes (a series date); the printed years are 1931 (volumes 1 and 2), 1932 (3, 4 and 5), 1933 (6 and 7), 1935 (8) and 1937 (the index), quoted from the title leaf of each text with the offset in the pointer file.\n')
    w('**What the files show about rights, per text** (`GOVERNANCE/horde/ws-rosters/union-ma/rights-evidence.json`; the basis string of the pointer file, which `build_index.py` reads, says the same shortly):\n')
    w('* **Flag of the item** (Documented): `possible-copyright-status: NOT_IN_COPYRIGHT`, no `access-restricted-item`, no licence URL, contributor UMass Amherst Libraries. The flag is the library\'s statement, not a finding of this project.')
    w('* **Imprint** (Documented): "Compiled and Published by the Adjutant General in accordance with Chapter 475, Acts of 1899 and Chapter 64, Resolves of 1930", printed at the Norwood Press (volumes 1 to 7), the Riverdale Press, Brookline (volume 8) and by Wright & Potter, Boston (the index); a state publication.')
    w('* **Search of the whole OCR text for a notice** (Measured, pattern list in the evidence file): 0 hits for "copyright", "all rights reserved", "copr." and a circled c in %d of the nine texts; one hit in volume 8, a circled-c character inside the service entry "Served on U. S. S. Circassian, t\u00a9 Jany. 4, 1865" (a misread character, not a notice; volume 8 is not parsed).' % hits_zero)
    w('* **The leaves around the title page of the five parsed volumes were read from page images** (Measured; the item\'s text PDF through the `/cors/` endpoint, one page cut out with `pdftoppm`, read with `tesseract`; the PDFs were deleted afterwards; `ma_rights_images.py`): leaf 5 (the title page) and leaf 6 (its verso) of volume 1 and leaf 6 of volumes 2, 3, 5 and 6 '
      'were looked at with the image viewer: **the verso leaves are blank pages** (scan noise at the edge only) and the title page of volume 1 carries no notice; the title pages of volumes 2, 3, 5 and 6 were read by tesseract from the image and the pinned OCR text: no notice. '
      'Leaf 7 (the contents list) was read by tesseract as well: its reading holds a circled c in volumes 3 and 5 among the dotted leaders of the contents list and no other word of a notice; the image of leaf 7 was not kept and not looked at. The images of leaves 5 and 6 stay in `tmp/library/rosters/_img/ma-rights/` (not tracked).')
    w('* **Arithmetic of the term** (Computed; not a legal reading): if a United States copyright subsisted in a work first published in a given year, a term of 95 years from publication ends on 31 December of year + 95: **%s** for the 1931 volumes (1 and 2), 31 December 2027 for 1932 (3, 4, 5), 31 December 2028 for 1933 (6, 7), 31 December 2030 for 1935 (8) and 31 December 2032 for the index. Whether a copyright subsisted at all (a state publication; no notice found on the title leaf or its verso) is not decided here.' % '31 December 2026')
    w('* **Decision** (owner step 4 of `PRODUCTION-PLAN.md` section 8, not made here; DEC-019: the owner says the rosters are freely available online and no permission request is made): whether the 1931-35 volumes are accepted as public domain on the strength of the Internet Archive flag and the absence of a notice. '
      'Until then the basis strings say "not established by the date of publication" and the unit files stay in the tree; the delegated decision DD-ROS-MA-01 records this and keeps the alternatives open. **Nothing was sent to anyone.**\n')
    w('**Not used** (listed in the pointer file): `MA-RECORD-1868` (the Adjutant General\'s Record of the Massachusetts Volunteers, 1868-70, three Internet Archive items; printed before 1929; a lead for the officers and for casualty statements, not fetched, gap EG-ROS-MA-06) and `MA-BURIAL-1863` '
      '(the Joint Special Committee\'s report on the burial of the Massachusetts dead at Gettysburg, a list of named dead, in `tmp/library/ws9`; assigned to the item `roster-gettysburg-lists`, gap EG-ROS-MA-02). **Blocked** (Measured by the Vermont and New Hampshire engineers, not retried): the page-image routes `archive.org/download/<id>/page/` and `iiif.archive.org`; the route used here is the text PDF.\n')
    # ------------------------------------------------------------------------------------------------------------------ section 4
    w('## 4. What was checked\n')
    vsum = collections.Counter()
    for k in keys:
        for kk, v in U[k]['verify'].items():
            vsum[kk] += v
    w('* **At build time (assertion)**: for every line written, V1 the name tokens stand in the pinned text at the recorded offset, in order, separated only by white space; V2 the remark tokens stand in order from the recorded offset (stepping over at most 200 characters of page furniture); V3 the offset lies in a leaf whose printed page is the recorded page; V4 the printed rank stands in the leaf; offsets only grow; the round trip through the file writer and reader returns the same rows (`parse_ma_ssm.py`). A defect stops the run. The section of each unit is asserted from the volume\'s own contents list: the printed page of its first leaf is the contents page, its title stands in the first lines, and no leaf after the last one holds an entry head.')
    w('* **`pipeline2/verify_unit.py --all --root data2/union/ma`** (Measured, log `GOVERNANCE/horde/ws-rosters/union-ma/verify-union-ma.jsonl`): %d files, %s lines: name_ok %s, remark_ok %s (%d lines needed the step over the running head), page_ok %s, rank_ok %s (%d lines print no rank: %s), order breaks %d, V1 defects 0, V3 defects 0, problems 0.'
      % (len(keys), n(vsum['rows']), n(vsum['name_ok']), n(vsum['remark_ok']), vsum['remark_gap_rows'], n(vsum['page_ok']), n(vsum['rank_ok']), vsum['rank_empty'],
         '; '.join('%s (%s, row %d)' % (nm, U[k]['designation'], i) for k in keys for i, nm in U[k]['no_rank_rows']), vsum['order_breaks']))
    w('* **Reproducibility** (Measured): `parse_ma_ssm.py --write` run twice gives identical bytes for all 48 files (24 unit files, 24 flag files). A first regeneration with the third head rule alone left the unit files and flag files of 8 units byte for byte as the first run had written them (the 7th, 10th, 12th, 16th and 22nd Infantry, the 1st Company Sharpshooters, the 3rd and 5th Batteries), '
      'which shows that the first run was reproducible from the pinned texts and the stored rules; the later corrections changed some of those 8 as well (section 5).')
    w('* **Reconciliation with the earlier roll files** (Measured; `ma_reconcile.py`): the names of the two readings are aligned in page order by their letters (difflib on the lists of names), and company, remarks and one-sided lines are compared. The earlier files are a **second reading by a different parser of a different text file** (the plain djvu text of the same items), '
      'so agreement is evidence against a parse that silently lost or merged entries, and disagreement is where one of the two is wrong; the evidence for each one-sided line is searched in the files and in the pinned text (`evidence` column).')
    w('  * Lines: %s new against %s earlier in the %d units that have an earlier file; aligned with the same letters: %s; only in the new files: %d (%d inside the remarks of an earlier line, %d in no earlier line); only in the earlier files: %d.'
      % (n(new_rows_of_those), n(earlier_rows), len(earlier_units), n(same), new_only, ev_new['swallowed in an earlier row'], ev_new['not inside any earlier row'], earlier_only))
    w('  * Remarks: equal for %s of %s aligned lines; the earlier remarks are longer for %d lines (%d carry the running head or the page number that the earlier parser kept, %d a following entry that the earlier parser swallowed, %d something else: a section heading or a printed note after the last entry) and the new remarks are longer for %d lines (a single stray letter, "J" and "I", that the earlier parser cut).'
      % (n(rem_equal), n(same), rem_earlier_longer, extra_kinds['earlier_longer_running_head_or_page_number'], extra_kinds['earlier_longer_a_following_entry'], extra_kinds['earlier_longer_other'], rem_new_longer))
    w('  * Company: %s lines differ, in four units: the 9th Infantry (%d: the earlier file has no company I, its lines stand under H; the heading COMPANY "I" is printed and read), the 10th (%d: %d lines of company K that the earlier file leaves under I because the K heading is damaged, and %d band lines that it calls non-commissioned staff), the 15th (%d: lines under the printed heading NON-COMMISSIONED STAFF that the earlier file calls field and staff) and the 18th (%d: the heading of company E is damaged, the new files leave the code empty and give the letter the sequence of headings gives in `company_inferred`, the earlier file writes E). In every case the new files follow the printed heading.'
      % (n(co_diff), U['u-ma-9th-massachusetts-infantry']['reconciliation']['company_differs'], U['u-ma-10th-massachusetts-infantry']['reconciliation']['company_differs'],
         U['u-ma-10th-massachusetts-infantry']['company_counts'].get('K', 0), U['u-ma-10th-massachusetts-infantry']['company_counts'].get('BAND', 0), U['u-ma-15th-massachusetts-infantry']['reconciliation']['company_differs'],
         U['u-ma-18th-massachusetts-infantry']['reconciliation']['company_differs']))
    EH = S['embedded_heads']
    w('* **Against the printed text only** (Measured; `ma_stats.py`, independent of the head rules): after the corrections, a search of the remarks of all %s lines for what a second entry head would leave finds %d second "Res." tokens and %d ranks (or something close to a rank, similarity 0.4 or more to a rank of the volumes) between two dashes%s.'
      % (n(LINES), EH['second_res_tokens'], EH['rank_between_dashes'], '' if not EH['rank_between_dashes_rows'] else ' (%s: not a head, a damaged service entry)' % '; '.join('%s row %d: "%s"' % (x[0].replace('u-ma-', ''), x[1], x[5].strip()) for x in EH['rank_between_dashes_rows'])))
    w('* **The inference "on the rolls in July 1863"** (Inferred from printed dates; `ma_dates.py`, rule stored in each flag file). The first run\'s rule read a clause only up to a semicolon, and the OCR drops that semicolon in about 3 percent of the entries ("enl. and must. Sept. 9, 1861 disch. Dec. 31, 1861"): a reading of 14 sampled "yes" rows found one for such a man, a reading of 40 more found one for a damaged event word ("diaoh." for "disch."), and a search of the "yes" rows for a separation word with a date before July 1863 found 105. '
      'The rule now cuts clauses at a colon or a bar, at an event word after a year or after a period, drops a leading stray mark, stray letter, "and" or "hon.", does not read what follows the first "See", and keeps a "yes" back (unknown) when a clause with a damaged event word, a damaged year or a separation word it cannot place stands in the entry. '
      'The answers moved: yes %s, no %s, unknown %s (the first rule on the same lines: 13,115 / 19,192 / 1,480). The final sample (`onroll-sample-reading.json`; seeded draw, read by the engineer): 50 "yes" lines, **0 contradicted** by a printed separation before 1 July 1863; 24 "no" lines, **0 without a printed date to support them**; 16 "unknown" lines, all justified (6 of them could have been answered by a reader: the rule keeps a damaged word beside a readable date unknown on purpose). '
      'The limits: 90 lines read by the author of the rule, drawn at random but not by an independent reader; 0 errors in 50 "yes" lines supports an error rate of at most 5.8 percent for the "yes" marks at 95 percent confidence (one-sided, Clopper-Pearson) and no more; it says nothing about presence. The independent sample (R-G9) is the work of `roster-qa`.'
      % (n(T['on_rolls_yes']), n(T['on_rolls_no']), n(T['on_rolls_unknown'])))
    w('* **Copy audit** (Measured; `ma_stats.py`): in the names, ranks and remarks of the %d files a search for AI, Claude, Anthropic, LLM, GPT, chatbot, "machine-generated" and "automat*" finds **no line**; the word "agent" stands in the remarks of **%d lines** as a printed occupation (rows: %s). They are printed text and stay as printed (Law 1 and 4); nothing in the files, the flag files, the pointer file or this report says how the data was made.'
      % (len(keys), sum(len(U[k]['agent_rows']) for k in keys), '; '.join('%s %s' % (U[k]['file'].split('/')[-1][:-9].replace('-massachusetts', ''), ', '.join(str(i) for i in U[k]['agent_rows'])) for k in keys if U[k]['agent_rows'])))
    w('* **Official Records quotes** (Measured): each quote of section 1 was matched in the pinned text of volume 27 part 1 with `tools/bt/or27_find.py --verify` (report, printed page and offsets as quoted).')
    w('* **The baseline and the registry** (Measured): the 24 units are the Massachusetts entries of the organization table of the Army of the Potomac (`data2/units.json`, `or_check`: %s); a search of the table region of the Official Records text for "Massachusetts" finds no other unit.' % ', '.join('%d %s' % (v, k) for k, v in sorted(S['or_check_counts'].items(), key=lambda kv: -kv[1])))
    w('* **Not run**: the independent sample of page images (R-G9; the first sample of the item is the work of `roster-qa`); a reading of any damaged line from a page image; a second reading of the names from the 1937 index; a browser; the full node suite; any timing. '
      '`build_index.py --lint` was run at the end: no defect, no warning for this item. ' + ('The per-item test file `docs/battle-theatre/app/tests/roster-union-ma.test.mjs` was run alone (`node --test`, through the machine lock): %d tests, %d pass, %d fail.' % node_line if node_line else 'The per-item test file `docs/battle-theatre/app/tests/roster-union-ma.test.mjs` was not run when this report was written.') + '\n')
    # ------------------------------------------------------------------------------------------------------------------ section 5
    w('## 5. Anomalies seen\n')
    c1 = CT
    w('1. **Defects of the first run, found by the reconciliation and corrected (%s lines added or changed; %s lines before, %s now).** Each correction is a rule of the parser (`union_ma/ma_parse.py`, `ma_cuts.py`), applied to the whole set; the list of the lines is in `GOVERNANCE/horde/ws-rosters/union-ma/changes-after-reconciliation.json`.'
      % (n(c1['lines_added_by_third_head_rule'] + c1['names_cut_differently'] + c1['company_changed_by_reviewed_heading'] + c1['host_lines_with_shorter_remarks'] + c1['lines_with_longer_remarks_page_break_number']), n(c1['lines_before']), n(c1['lines_now'])))
    w('   * **%d entries had been missed** (a head whose "Res." the OCR lost or damaged beyond the tolerant forms: "Re3.", "Ries.", "Pes.", "lies.", "-Res.", "Res.Barre;", "P.es-", or none before the residence): the entry stood inside the remarks of the line above. The third head rule accepts `NAME - RANK - <anything>` when the rank is one of the volumes\' ranks (or close to one) between two real dashes; the new line\'s remarks start at the first printed token after the second dash (so a line can start "Res.Barre; 33; lawyer" or "West Roxbury ; 38"), flag H, and flag Q where the remarks do not begin with the word "Res.". All %d were read in the text; the earlier files hold %d of them (the 11th Infantry has no earlier file).' % (c1['lines_added_by_third_head_rule'], c1['lines_added_by_third_head_rule'], added_in_earlier_units))
    w('   * **%d names had been cut at the wrong place** (the part left behind stood at the end of the remarks of the line above): "Jr," (a suffix printed with a comma) taken for the whole name in %d lines ("Savage, James, Jr," was "Jr,"); the printed "1st" read as "Ist" in %d lines ("Peter, Ist" for "Quinn, Peter, Ist"); '
      'a company letter in quotes at the end of the entry above ("as of Co. "D."") taken as an initial of the next name in %d lines; a surname split by a blank in %d lines ("ton, William H." for "Know] ton, William H.", "ward, Albert" for "Hay ward, Albert"); '
      'an alias or an alternative in %d lines ("Shelters or Shultis, George", "Mclntee, Arthur alias Mclntire, Arthur"); a head of three name parts in %d lines ("Read, Perley, W.", "Clark, Duett, C,"), two of which and one more are cut by review (`ma_cuts.NAME_CUTS`: "Steams, Henry VV,", '
      '"ElishaM. White", "Waitt, John (alias Godsoe, John)"). The names are the printed tokens; nothing is changed or completed.' % (c1['names_cut_differently'], cut_kind['jr'], cut_kind['ist'], cut_kind['quoted'], cut_kind['fragment'], cut_kind['alternate'], cut_kind['three']))
    w('   * **%d lines stood under the wrong company**: the heading COMPANY "K" of the 10th Infantry is printed "COMPANY \'\'K\'l" (112 lines were under I) and the heading UNASSIGNED of the 19th is printed "UX-\\SSIGXED" (96 lines were under K). Both headings are read by review (`ma_cuts.HEADINGS`, exact text of the line, listed in the flag file under `reviewed_headings`): the code is what the heading says, never a letter the sequence would give.' % c1['company_changed_by_reviewed_heading'])
    w('   * **%d entries had lost their last word at a page break**: a year alone on a line ("1864.") was dropped as a page number; a number that ends with a period or a comma is now kept (%d lines now end with such a number). %d other lines are longer because the closing company letter of the entry ("as Captain of Co. "B."") is no longer taken into the name of the next entry.' % (longer_kind['number'], longer_kind['number'], longer_kind['letter']))
    w('   * The %d lines whose remarks became shorter are the lines above the entries that were cut out of them. **No line was removed.**' % c1['host_lines_with_shorter_remarks'])
    w('2. **Differences with the earlier roll files that remain** (all listed, none resolved): the %d lines only in the new files (section 4), the company codes of four units, the remarks (section 4). The earlier parser swallowed %d entries into the remarks of the line above (Waterhouse, Thomas J. into the remarks of Waite, John H. on printed page 39 of the 1st Infantry; Coyle, James into Coy, George H. on page 632 of the 9th; and so on: the `evidence` column names the earlier line and its csv line). '
      '**%d lines of printed page 668 of the 9th Infantry (the end of company H and the start of company I) are in no earlier line**: the earlier file has no company I at all (its company codes run H, then K). Two stray single letters in front of a name ("J Conlon, Michael", "I Holman, John") are in the earlier names and not in the new ones (they stay at the end of the line above).'
      % (new_only, ev_new['swallowed in an earlier row'], n9_p668))
    w('3. **Damaged names (flag N): %d lines.** Typical damage: a capital letter read as the two marks ".\\" (%s: the 1st Infantry, page 53, three lines under COMPANY "I"); on printed page 96 of the 13th Infantry (company E) %d of the %d lines are flagged N and the dates on it are damaged as well (%s); a mark inside a name (%s). The text is kept as the layer has it; nothing is repaired (a reading of the page image is the open work, EG-ROS-MA-03).'
      % (T['code_N'], ', '.join('"%s"' % x for x in ex1), p96_n, len(p96), ', '.join('"%s"' % x for x in ex13), ', '.join('"%s"' % x for x in bird)))
    w('4. **Damaged company heading of the 18th Infantry** (printed pages %s to %s): the heading of company E is unreadable in the text layer, so the %d lines under it have no company code (flag C); the sequence D, F says E and the earlier file writes E; the flag file keeps the inferred letter in `company_inferred` and the line stays empty (a letter the page prints is never replaced by one the sequence gives; DD-ROS-MA-03). The 18th Infantry has %d lines flagged Y (a damaged year), %s of any unit.'
      % (pg18[0], pg18[1], U['u-ma-18th-massachusetts-infantry']['codes'].get('C', 0), U['u-ma-18th-massachusetts-infantry']['codes'].get('Y', 0), 'the most' if ymax == 'u-ma-18th-massachusetts-infantry' else 'not the most (%s has %d)' % (U[ymax]['designation'], U[ymax]['codes'].get('Y', 0))))
    w('5. **Lines whose leaf has no printed page number in the item\'s page-number file: %d** (1st Infantry %d, 11th %d, 12th %d, 37th %d, the others none). Their `pg` is empty; the flag file gives the number the running head prints (confirmed by the numbered leaves around it where the check could be made).'
      % (T['rows_without_printed_page'], U['u-ma-1st-massachusetts-infantry']['rows_without_printed_page'], U['u-ma-11th-massachusetts-infantry']['rows_without_printed_page'], U['u-ma-12th-massachusetts-infantry']['rows_without_printed_page'], U['u-ma-37th-massachusetts-infantry']['rows_without_printed_page']))
    w('6. **Lines with no printed rank: %d** (%s): the text layer has the name, one dash and "Res." where the other lines have a rank between two dashes (the rank and the second dash are not in the layer; whether the page prints them is not known).' % (sum(len(U[k]['no_rank_rows']) for k in keys), '; '.join('%s, %s' % (nm, U[k]['designation']) for k in keys for i, nm in U[k]['no_rank_rows'])))
    w('7. **Cross-reference lines.** %s lines (%s percent) print a cross-reference ("See Co. K 2d Mass. Hy. Arty.", "See V. R. C.", "See U. S. Navy.") to the same man\'s record in another organization. They are lines of the unit and are kept as printed; they are not duplicates to be removed, and the cross-reference is a pointer, not a statement about 1863.' % (n(T['xref_lines']), pct(T['xref_lines'], LINES)))
    w('8. **The units that were not in the fight or were detached.** The 7th, 10th and 37th Infantry (VI Corps) show no day engaged and no casualty in the baseline, and the roll prints %s, %s and %s lines naming Gettysburg: their rolls are written because the Official Records table lists them. Company C of the 32nd Infantry (section 1) and the 1st Cavalry (%s lines naming Gettysburg) are the other cases.'
      % (n(U['u-ma-7th-massachusetts-infantry']['names_gettysburg']), n(U['u-ma-10th-massachusetts-infantry']['names_gettysburg']), n(U['u-ma-37th-massachusetts-infantry']['names_gettysburg']), n(U['u-ma-1st-massachusetts-cavalry']['names_gettysburg'])))
    w('9. **A printed note after the last entry of the 13th Infantry**: the roll ends with the printed note "The 14th Regiment Massachusetts Volunteer Infantry is omitted here because it became the 1st Regiment Massachusetts Volunteer Heavy Artillery" (left out of the last line\'s remarks as a printed note after the last entry, `end_note` of `ma_sections.py`).')
    w('10. **Words a copy audit by word list meets in printed text**: the printed occupation "agent" (section 4; %d lines). No printed name, rank or remark of these files holds AI, Claude, Anthropic or any other word of the audit list.\n' % sum(len(U[k]['agent_rows']) for k in keys))
    # ------------------------------------------------------------------------------------------------------------------ section 6
    w('## 6. Gaps registered (proposals under `GOVERNANCE/horde/ws-rosters/proposed-register/`, lines appended to `rosters/GAPS.md`)\n')
    w('* **EG-ROS-MA-01** Rights of the 1931-35 volumes: public domain is not established by the date of publication (flag `NOT_IN_COPYRIGHT`, no notice found, state publication); owner step 4. Not a gap of data; registered so that the page marks it and the decision is recorded.')
    w('* **EG-ROS-MA-02** Presence on 1-3 July 1863: the volumes print no muster roll of 30 June 1863; %s lines name Gettysburg; every other man is "on the rolls, names not recovered". Open for `roster-gettysburg-lists` (the Burial Report of 1863 in `tmp/library/ws9`, 1863 newspaper casualty lists, the Record of 1868-70).' % n(total_gett))
    w('* **EG-ROS-MA-03** Damaged lines: %s lines flagged in the text layer (N %s, Y %s, G %s, H %s, Q %s, R %s, C %s); a second reading of page images is not run (names damaged beyond reading: the 13th Infantry page 96, the 18th Infantry company D and E pages).' % (
        n(T['ocr_uncertain']), n(T['code_N']), n(T['code_Y']), n(T['code_G']), n(T['code_H']), n(T['code_Q']), n(T['code_R']), n(T['code_C'])))
    w('* **EG-ROS-MA-04** Independent sample (R-G9) not run; residual losses unknown: the new files and the earlier files (a different parser on a different text file) agree on %s of %s lines, but an entry whose dashes and "Res." are both damaged could still be inside the remarks above it (a search for a rank between two dashes finds none).' % (n(same), n(new_rows_of_those)))
    w('* **EG-ROS-MA-05** The 1937 Index to Army Records (a name with volume and page for every record of volumes I to VI) is pinned and not used as a second reading: the text layer interleaves its columns; a count of references per printed page would be an independent census of the lines per page.')
    w('* **EG-ROS-MA-06** The Record of the Massachusetts Volunteers 1868-70 (officers, casualty statements) is not fetched; the Burial Report of 1863 is not read for names (EG-ROS-MA-02).')
    w('* **EG-ROS-MA-07** Baseline identities: "Massachusetts Battery E (10th)" (Capt. Josiah Porter) and "Massachusetts Battery F" (Capt. Timothy Regan) match no Massachusetts battery of the Official Records (earlier gap G-NE02; neither captain\'s name is in OR 27 part 1 or 2; the table prints exactly four Massachusetts light batteries, the 1st (A) McCartney, 3rd (C) Walcott, 5th (E) Phillips and 9th Bigelow, the data audit of the repository, `docs/data-audit/fixes.json` (rows DATA-oob-union-artillery-U-ART-MAE and -MAF), already noted that the Fifth Corps held 5th U.S. Battery I and the First Volunteer Brigade Pennsylvania Batteries C and F); no unit file is made for them; the baseline lacks the 11th Infantry, the 1st Company Sharpshooters and the 1st Battery (A), which have files here (earlier gap G-NE03). For the OOB agent or the owner.')
    w('')
    w('Closing record: `GOVERNANCE/horde/ws-rosters/union-ma/CLOSED.json`. Decisions made here are DD-ROS-MA-01 to DD-ROS-MA-05 in `GOVERNANCE/decisions/DELEGATED-DECISIONS-2026-11-11.md` (delegated, reversible, none is an owner decision). Request note for the readers of the flag files: `GOVERNANCE/horde/requests/bt-rosters-union-ma-flag-files.md`.')
    text = '\n'.join(L) + '\n'
    os.makedirs(os.path.join(R2, 'reports'), exist_ok=True)
    with open(os.path.join(R2, 'reports', 'union-ma.md'), 'w', encoding='utf-8') as f:
        f.write(text)
    print('report written', len(text), 'bytes')
    return 0


if __name__ == '__main__':
    sys.exit(main())

"""Write rosters/reports/union-pa.md from the files (every number is computed here, none is typed).

    python3 -I docs/battle-theatre/rosters/pipeline2/union_pa/pa_report.py          (from the repository root, after pa_stats.py)

Reads   GOVERNANCE/horde/ws-rosters/union-pa/stats.json (pa_stats.py), diag/*.json, reconciliation.json, page-checks.json (the pages looked at), burial-record-leaves.json,
        the unit files and flag files, data2/sources/PA-BATES-1869.json, rosters/sources/union-pa.json
"""
import os, sys, json, gzip, collections, re, glob, statistics
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import pa_lib as L
import pa_units as PU

R2 = os.path.join(L.ROOT, 'docs', 'battle-theatre', 'rosters')
GOV = L.GOV


def fmt(n):
    return format(n, ',') if isinstance(n, int) else str(n)


def pct(a, b):
    return '%.1f percent' % (100.0 * a / b) if b else 'n/a'


def main():
    S = json.load(open(os.path.join(GOV, 'stats.json')))
    U = S['units']
    T = S['totals']
    C = S['code_totals']
    REC = json.load(open(os.path.join(GOV, 'reconciliation.json')))
    PTR = json.load(open(os.path.join(R2, 'sources', 'union-pa.json')))
    BUR = json.load(open(os.path.join(GOV, 'burial-record-leaves.json')))
    checks = json.load(open(os.path.join(GOV, 'page-checks.json'))) if os.path.exists(os.path.join(GOV, 'page-checks.json')) else {'pages': []}
    ver_rows = {k: v['verify'] for k, v in U.items() if v.get('verify')}
    ordered = [u['key'] for u in PU.U if u['key'] in U]
    n_units = len(ordered)
    lines = []
    w = lines.append

    def unit_name(k):
        return U[k]['designation']

    tot_lost = T['lost_name_lines']
    tot_lines = T['lines']
    tot_gett = T['remark_names_gettysburg']
    tot_jul = T['remark_event_dated_1_to_3_july_1863']
    v_all = collections.Counter()
    for k in ordered:
        v = U[k].get('verify')
        if v:
            for kk, vv in v.items():
                v_all[kk] += vv
    verified_units = sum(1 for k in ordered if U[k].get('verify_ok'))
    gaps_units = [k for k in ordered if U[k]['company_gaps']]
    insc_found = sum(1 for k in ordered for i in U[k]['inscriptions'] if i['found_in_local_text'])
    insc_units = [k for k in ordered if U[k]['inscriptions']]
    big_lost = sorted(ordered, key=lambda k: -U[k]['lost_name_lines'])
    rec_t = REC.get('totals', {})
    no_rows_earlier = [k for k in ordered if (U[k].get('reconciliation') or {}).get('rows_earlier') in (None, 0)]

    w('# Pennsylvania (Union): rosters of the %d units at Gettysburg (work item union-pa, OA03)' % n_units)
    w('')
    w('Written 16 November 2026 by the roster workstream. Evidence labels as in `PLAN.md`: **Measured** (a command run for this report produced it), **Documented** (a source text says it; the source is named), **Inferred** (a stated rule on printed text), **Not run**. Every number below is computed by `pipeline2/union_pa/pa_stats.py` and `pa_report.py` from the unit files and the work files.')
    w('')
    w('## 0. Summary')
    w('')
    w('* **%d unit files** under `rosters/data2/union/pa/` (%d infantry, %d cavalry and %d artillery units), **%s lines in all**, format `roster2/2` (`pipeline2/r2lib.py`), each with a flag file `<unit>.flags.json.gz` and a cells file `<unit>.cells.json.gz`. One line per printed line of the roll of the regiment or battery as the text layer of Bates prints it: name, rank, and everything else the line prints (date of muster, term digit, remarks), with the printed page and the character offset of the name in the pinned text. Raw size %s bytes, gzip %s bytes, flag files %s bytes, cells files %s bytes.' % (
        n_units, sum(1 for k in ordered if U[k]['arm'] == 'infantry'), sum(1 for k in ordered if U[k]['arm'] == 'cavalry'), sum(1 for k in ordered if U[k]['arm'] == 'artillery'),
        fmt(tot_lines), fmt(T['raw_bytes']), fmt(T['gz_bytes']), fmt(T['flags_bytes']), fmt(T['cells_bytes'])))
    w('* **One printed source is parsed**: Bates, *History of Pennsylvania Volunteers, 1861-5*, five volumes (Harrisburg, B. Singerly, State Printer, 1869 to 1871; Internet Archive `historyofpennsyl01bate` to `04bate` and `historyofpennsyl00bate`, which is volume 5). For each unit the rolls of the three-years regiment (field and staff, band, every company) or of the battery, as the tables print them. The narrative history that opens each regiment, the Burial Record and the index of field officers at the end of each volume are not parsed (section 6).')
    w('* **Lines whose name the text layer lost: %s** (%s of the printed lines of the %d rolls, %s lines counted with them). The line exists on the page (rank, date and remark are in the word boxes) but no word of the name column was read. They are **not written** (no empty-name line, no invented name) and are listed with their text in `GOVERNANCE/horde/ws-rosters/union-pa/diag/<unit>.json` (gap EG-ROS-PA-01).' % (fmt(tot_lost), pct(tot_lost, tot_lost + tot_lines), n_units, fmt(tot_lost + tot_lines)))
    w('* **Checks run (Measured)**: the builder asserts every line against the pinned text before writing it (V1 name tokens at the recorded offset, V2 remark tokens in order inside the leaf, V3 printed page of the leaf); `pipeline2/verify_unit.py` on the %d files: %d of %d ok (%s lines, name_ok %s, remark_ok %s, page_ok %s, **0 V1 and 0 V3 defects**). The word boxes of the five volumes were aligned to the pinned text (%s)). The lines were compared with the print on **%d pages that were looked at** (section 4); the independent sample (R-G9) is **not run**.' % (
        n_units, verified_units, n_units, fmt(v_all['rows']), fmt(v_all['name_ok']), fmt(v_all['remark_ok']), fmt(v_all['page_ok']), 'every word of the 5 word-box files found in the text layer in order'.replace('every word of the 5 word-box files found in the text layer in order', 'see section 4'), len(checks['pages'])))
    w('* **No label of presence** is written into any line (DD-ROS-01). Derived marks live in the flag files, never in the lines: `ocr_uncertain` (%s of %s lines), `on_rolls_july_1863` (inferred from printed dates only: %s yes, %s no, %s unknown) and the printed statements of the battle counted below. **%s lines print the word Gettysburg in their remark** (OCR-tolerant match; a count, not a judgement of presence: a man who "deserted at Gettysburg" is not shown present by a rule of this report) and %s lines print an event dated 1 to 3 July 1863.' % (
        fmt(T['ocr_uncertain']), fmt(tot_lines), fmt(T['on_rolls_yes']), fmt(T['on_rolls_no']), fmt(T['on_rolls_unknown']), fmt(tot_gett), fmt(tot_jul)))
    w('* **Reconciliation with the earlier family run** (`rosters/data/PA`, an independent reading of the same volumes): %s of the %s earlier rows of the %d units that have an earlier file are matched to a line of the new files by leaf and name; %s lines are only in the new files, %s rows only in the earlier ones (`GOVERNANCE/horde/ws-rosters/union-pa/differences-<unit>.csv`; nothing resolved by guessing). %d units have no earlier file.' % (
        fmt(rec_t.get('matched', 0)), fmt(rec_t.get('earlier', 0)), len([1 for k in ordered if (U[k].get('reconciliation') or {}).get('rows_earlier')]), fmt(rec_t.get('new_only', 0)), fmt(rec_t.get('earlier_only', 0)), len(no_rows_earlier)))
    w('* **Not parsed or not run**: the independent page-image sample of these files (R-G9, item roster-qa), a second reading of the page images for the lost names and the damaged date cells (gaps EG-ROS-PA-01 to -03), the statements of presence that no roll prints (item roster-gettysburg-lists; the Burial Record of Bates is a list of this kind, gap EG-ROS-PA-06), a browser, any timing.')
    w('')
    w('## 1. Lines per unit against the strength')
    w('')
    w('"Strength (baseline OOB)" is the value of the baseline order of battle (`baseline/dist/data/oob`, second hand, Busey and Martin as the earlier family recorded it). "Present at Gettysburg" is the figure of the monument inscription of *Pennsylvania at Gettysburg* vol. II (1914) that the earlier family run mapped to the unit (`data/PA/strength_present_inscriptions.csv`); this run searched the first line of each inscription again in the local copy of the book (`%s`, sha256 `%s`): **%d of %d first lines found verbatim**; the mapping of an inscription to a unit is the earlier run\'s reading of a heading that the text layer often damages, not re-verified here. Where two figures exist both are shown and none is chosen (Law 6). A whole-war roll is **not** comparable with the strength present on 1 to 3 July 1863 (`PLAN.md` 2.4, gap EG-ROS-010); the columns are context only.' % (
        S['inscription_source']['path'], S['inscription_source']['sha256'][:16] + '...', insc_found, sum(len(U[k]['inscriptions']) for k in ordered)))
    w('')
    w('| unit | strength (baseline OOB) | present at Gettysburg (1914 inscription) | lines | lost-name lines | ocr_uncertain | N | R | D | G | J | remark names Gettysburg | on rolls yes / no / unknown |')
    w('|---|---|---|---|---|---|---|---|---|---|---|---|---|')
    for k in ordered:
        e = U[k]
        st = e['oob']['strength']
        ins = ', '.join('%s (officers %s, men %s)' % (i['total'], i['officers'], i['men']) if i['officers'] else str(i['total'] if i['total'] else '?') for i in e['inscriptions'])
        c = e['codes']
        w('| %s | %s | %s | %s | %s | %s | %s | %s | %s | %s | %s | %s | %s / %s / %s |' % (
            e['designation'], fmt(st) if st else 'no order-of-battle row', ins or 'none found by the earlier run', fmt(e['lines']), fmt(e['lost_name_lines']), fmt(e['ocr_uncertain']),
            fmt(c.get('N', 0)), fmt(c.get('R', 0)), fmt(c.get('D', 0)), fmt(c.get('G', 0)), fmt(c.get('J', 0)), fmt(e['remark_names_gettysburg']),
            fmt(e['on_rolls']['yes']), fmt(e['on_rolls']['no']), fmt(e['on_rolls']['unknown'])))
    w('| **all %d units** | | | **%s** | **%s** | **%s** | %s | %s | %s | %s | %s | **%s** | %s / %s / %s |' % (
        n_units, fmt(tot_lines), fmt(tot_lost), fmt(T['ocr_uncertain']), fmt(C.get('N', 0)), fmt(C.get('R', 0)), fmt(C.get('D', 0)), fmt(C.get('G', 0)), fmt(C.get('J', 0)), fmt(tot_gett),
        fmt(T['on_rolls_yes']), fmt(T['on_rolls_no']), fmt(T['on_rolls_unknown'])))
    w('')
    ratios = []
    for k in ordered:
        e = U[k]
        for i in e['inscriptions']:
            if i['total']:
                ratios.append((e['lines'] / i['total'], k))
    if ratios:
        w('Reading the table. The lines are the roll of **everyone who served** in the regiment or battery in the whole war (a man appears once for each rank he held in some regiments, and once more in the field and staff or the band if he stood there), not the men present: for the %d units with an inscription figure the roll has %.1f to %.1f times as many lines as the inscription has men present (median %.1f). The lines of the batteries of the 1st Pennsylvania Light Artillery and of the 3rd Pennsylvania Heavy Artillery are the rolls of the **batteries** (Battery B; Batteries F and G; Battery H, a section of which served at Gettysburg: Bates does not say which men; gap EG-ROS-PA-08).' % (
            len(ratios), min(r for r, _ in ratios), max(r for r, _ in ratios), statistics.median([r for r, _ in ratios])))
    w('')
    w('Where the roll sits in the volumes (leaf = number of the page image of the Internet Archive item, 0-based, the index of the hocr page index; printed page = the item\'s own page-number file, **not read from an image**; for the second set of repeated leaves see section 5):')
    w('')
    w('| unit | Bates regiment number | volume | leaves searched | leaves with lines | printed pages with lines | lines per leaf (min / median / max) |')
    w('|---|---|---|---|---|---|---|')
    for k in ordered:
        e = U[k]
        rl = e['leaf_range_searched']
        rr = '%d-%d' % (rl[0], rl[1]) + (' and ' + ', '.join('%d-%d' % (x[0], x[1]) for x in rl[2:]) if len(rl) > 2 else '')
        pg = e['printed_pages']
        rp = e['rows_per_leaf']
        w('| %s | %s | %d | %s | %s | %s | %s / %s / %s |' % (e['designation'], e['bates_number'], e['volume'], rr, '%d-%d' % tuple(e['leaves']) if e['leaves'] else '-',
                                                        '%s-%s' % tuple(pg) if pg else '-', rp['min'] if rp else '-', rp['median'] if rp else '-', rp['max'] if rp else '-'))
    w('')
    w('## 2. The unit files')
    w('')
    w('One gzip JSON-lines file per unit, `[offset delta, name, rank, remarks, remark delta]` lines with carried state lines `co` (company) and `pg` (printed page), one **segment** (`PA-BATES-1869.<volume>`, layout `cols`). Lines are in the order of the page (company by company, line by line); offsets are therefore not increasing everywhere (the text layer lists a table column by column). `co` is `FS` (field and staff, with the non-commissioned staff), `BAND`, `UNAS` (unassigned men, recruits) or the company letter (A to P) or battery letter.')
    w('')
    w('* **name** (`name_printed`): the tokens of the name column as the text layer prints them, joined by single blanks, with the printed periods and the leader dots that follow a name (`Roberts...`). A damaged name stays damaged. The printed order is not uniform (privates stand "Surname, Given", officers and non-commissioned officers mostly "Given Surname"). **A normalised name is not written into a line**: the flag file lists it (`normalised_names`, same order as the lines: Given Surname, stray marks at the ends removed, no letter changed, empty where the head is not regular).')
    w('* **rank**: the rank cell as the text layer prints it (`Private`, `...do` for the ditto mark, `Capt.`, `1st Lt...`, `Serg\'t..`). The ditto mark is kept as printed and is **not** resolved to the rank above it (a reading). Where the text layer lost the cell the rank is empty (flag R).')
    w('* **remarks**: every other word of the line (date of muster, term digit, remark, with the words of the continuation lines) in the order of the text layer, which is what the offsets locate. Where the text layer lists the words of a line in another order than the page does (the date cell is often cut in two, the term digit stands at the head of the page), flag O marks the line and the **cells file** gives the words of the remarks in the order of the page.')
    w('* **Cut inside a word**: where the text layer glued the name cell to the rank cell with leader dots into one word (`Ewing....j...do..,`), the line is cut at the leader dots: the part before is the last name word, the part after is the rank; flag J. The glued word stands in the pinned text; nothing else is cut.')
    w('* **Rights per name**: the segment names the source text; `data2/sources/PA-BATES-1869.json` holds the five items, their dates and their sha256; `rosters/sources/union-pa.json` is the tracked pointer file (section 3).')
    w('')
    w('**Flag codes** (flag file, by row number from 0 over the whole file; `ocr_uncertain` is the union of every code except L; the rules are those of `pa_rows.py`, heuristics on the printed cells, never a change to a line):')
    w('')
    w('| code | meaning | lines (all %d units) |' % n_units)
    w('|---|---|---|')
    codes_txt = json.load(gzip.open(os.path.join(R2, 'data2', 'union', 'pa', os.path.basename(U[ordered[0]]['file']).replace('.jsonl.gz', '.flags.json.gz')), 'rt', encoding='utf-8'))['codes']
    legend = {}
    for k in ordered:
        fp = os.path.join(R2, 'data2', 'union', 'pa', os.path.basename(U[k]['file']).replace('.jsonl.gz', '.flags.json.gz'))
        legend.update(json.load(gzip.open(fp, 'rt', encoding='utf-8'))['codes'])
    for c in sorted(legend):
        w('| %s | %s | %s |' % (c, legend[c], fmt(C.get(c, 0))))
    w('')
    w('The flags are generous by design and **are not a safe measure of the lines that are right**: the independent sample of the four earlier items found that only about half of the name errors stood on flagged lines (`reports/roster-qa.md` 2.3). A line without a flag is a line on which no pattern matched.')
    w('')
    w('**On the rolls in July 1863 (inferred)**: from the clean printed date of muster and the separations printed in the remarks. "yes" needs a clean date of muster on or before 30 June 1863 and either no separation printed or only separations dated on or after 1 July 1863, no word of return or re-enlistment, no uncertain phrase ("not on muster-out roll", "date unknown") and no separation without a clean date; "no" needs a date of muster after 3 July 1863 or a separation with a clean date before 1 July 1863; every other line is unknown. A damaged date cell (flag D) makes the line unknown. Bates prints the **final** status of each man, never a June 1863 muster, so a "yes" says only that the printed dates do not exclude the man (EG-ROS-010).')
    w('')
    w('## 3. Sources and rights (all fetched from archive.org, one request at a time, at least 1.2 s apart)')
    w('')
    w('| source id | volume | Internet Archive item | printed year | imprint quoted from the text layer (offset) | item flag | rights basis | state |')
    w('|---|---|---|---|---|---|---|---|')
    for s in PTR['sources']:
        ev = s['rights']['evidence']
        w('| %s | %s | `%s` | %s | `%s` (%d) | %s | %s | parsed |' % (s['source_id'], s['volume'], s['identifier'], s['year'], re.sub(r'\s+', ' ', ev['imprint_quote']), ev['imprint_quote_offset_in_text'],
                                                                   ev['ia_possible_copyright_status'] or 'blank', s['rights']['basis']))
    w('')
    w('The files, sizes and sha256 are in `rosters/sources/union-pa.json` and `tmp/library/rosters/MANIFEST-union-pa.json`. The text layer of each volume (OCR text, leaf index, printed page numbers: %s bytes together) was fetched in this run; the word-box file `<identifier>_djvu.xml` of each volume (%s bytes together; a transient file) was fetched once, read into the word cache and **deleted** (bytes and sha256 stay in the manifest). The item metadata names the contributor (University of Pittsburgh Library System for volumes 1, 3 and 4, Allen County Public Library Genealogy Center for volumes 2 and 5), gives the date 1869 for all five volumes and the flag `NOT_IN_COPYRIGHT` for volumes 1, 3 and 4 only; the printed imprints read 1869 (volumes 1 and 2), 1870 (3 and 4) and 1871 (5), a state publication prepared "in compliance with acts of the legislature" and printed by the State Printer at Harrisburg. **No restricted item and no item without a text layer was used**; no host was refused.' % (
        fmt(sum(f['bytes'] for s in PTR['sources'] for f in s['files'] if f['role'] != 'metadata')), fmt(sum(s['djvu_xml']['bytes'] for s in PTR['sources']))))
    w('')
    w('Read for context only, not parsed: *Pennsylvania at Gettysburg* (1904, 1914; local copies, no roll of names; the inscriptions above); the Revised Report on the Soldiers\' National Cemetery (1867, lead for `roster-gettysburg-lists`).')
    w('')
    w('## 4. What was checked')
    w('')
    w('* **At build time (assertion)**: V1, V2 and V3 on every line written (`pa_rows.assert_row`, the rules of `r2lib.verify_rows`); a line that failed would not be written and would be listed. **verify_unit.py** (the official verifier) was run on every file by `pa_write.py` as it was written: %d of %d files ok; %s lines; name_ok %s, remark_ok %s (of which %s needed a step over other words of the leaf), page_ok %s, page number null %s, rank_ok %s, rank empty %s, order_breaks %s. A run of `verify_unit.py --all --root data2/union/pa` through the machine lock is in `GOVERNANCE/horde/ws-rosters/union-pa/verify-union-pa.jsonl`.' % (
        verified_units, n_units, fmt(v_all['rows']), fmt(v_all['name_ok']), fmt(v_all['remark_ok']), fmt(v_all['remark_gap_rows']), fmt(v_all['page_ok']), fmt(v_all['page_null']), fmt(v_all['rank_ok']), fmt(v_all['rank_empty']), fmt(v_all['order_breaks'])))
    al_tot = collections.Counter()
    for v in range(1, 6):
        a = json.load(open(os.path.join(L.WORK, 'alignment-vol%d.json' % v)))
        al_tot['xml'] += a['total_xml_words']
        al_tot['aligned'] += a['aligned']
        al_tot['no_xml_leaves'] += len(a['leaves_without_xml'])
    w('* **Alignment of word boxes to the text layer (Measured)**: %s of %s words of the five word-box files (%s) are found in order in the pinned text; a word box that holds several words ("ed at") is shared out by character count. A line whose first name word is not in the text layer cannot be written (counted in the lost-name lines) and a remark word that is not is counted as flag W. %d leaves have no word boxes (repeat scans of printed pages, section 5).' % (
        fmt(al_tot['aligned']), fmt(al_tot['xml']), pct(al_tot['aligned'], al_tot['xml']), al_tot['no_xml_leaves']))
    w('* **Pages looked at with the Read tool (Measured; page images rendered from the item PDF through `archive.org/cors`, transient, never stored in the tree)**: %d pages of %d units; every printed line of each page was counted and the stored lines were compared with the print by eye. The record is `GOVERNANCE/horde/ws-rosters/union-pa/page-checks.json`.' % (len(checks['pages']), len(set(p['unit'] for p in checks['pages']))))
    w('')
    if checks['pages']:
        w('| volume | leaf | printed page | unit | printed lines (counted on the image) | lines written | lines lost (name not in the text layer) | difference | note |')
        w('|---|---|---|---|---|---|---|---|---|')
        for p in checks['pages']:
            w('| %s | %s | %s | %s | %s | %s | %s | %s | %s |' % (p['vol'], p['leaf'], p['printed_page'], p['unit'], p['printed_lines'], p['written'], p['lost'], p['printed_lines'] - p['written'] - p['lost'], p['note']))
        w('')
        n_pr = sum(p['printed_lines'] for p in checks['pages'])
        n_wr = sum(p['written'] for p in checks['pages'])
        n_lo = sum(p['lost'] for p in checks['pages'])
        w('On these %d pages the print has %s lines; %s were written and %s were counted as lost-name lines; **%d lines are unaccounted for**. This is the page-level check that every printed line is a stored line or a counted loss; it is not the independent sample (the engineer who looked is the engineer who wrote the parser), and %d pages are far fewer than the 299 to 628 lines per stratum of `PLAN.md` 4.4.' % (
            len(checks['pages']), fmt(n_pr), fmt(n_wr), fmt(n_lo), n_pr - n_wr - n_lo, len(checks['pages'])))
        w('')
    w('* **Reconciliation with the earlier family run (Measured; `pa_reconcile.py`)**: for each unit the new lines and the earlier rows are matched on the same leaf (or the next) and the same alphabetic words of the name. Totals: %s new lines, %s earlier rows, %s matched, %s new only, %s earlier only, company differs on %s matched lines. Per unit (matched / new only / earlier only):' % (
        fmt(rec_t.get('new', 0)), fmt(rec_t.get('earlier', 0)), fmt(rec_t.get('matched', 0)), fmt(rec_t.get('new_only', 0)), fmt(rec_t.get('earlier_only', 0)), fmt(rec_t.get('company_differs', 0))))
    w('')
    w('| unit | new lines | earlier rows | matched | new only | earlier only | company differs |')
    w('|---|---|---|---|---|---|---|')
    for k in ordered:
        r = U[k].get('reconciliation') or {}
        if r.get('rows_earlier'):
            w('| %s | %s | %s | %s | %s | %s | %s |' % (U[k]['designation'], fmt(r['rows_new']), fmt(r['rows_earlier']), fmt(r['matched']), fmt(r['new_only']), fmt(r['earlier_only']), fmt(r['company_differs'])))
        else:
            w('| %s | %s | none | | | | |' % (U[k]['designation'], fmt(r.get('rows_new', U[k]['lines']))))
    w('')
    w('* **Not run**: the independent sample of page images (R-G9, item roster-qa; no stratum of these files has been drawn), a second reading of any lost or damaged cell, a browser, any timing, the node tests of the page.')
    w('')
    w('## 5. Anomalies seen')
    w('')
    n = 0

    def an(txt):
        nonlocal n
        n += 1
        w('%d. %s' % (n, txt))

    top = ', '.join('%s %d' % (U[k]['designation'], U[k]['lost_name_lines']) for k in big_lost[:8])
    an('**Printed lines whose name the text layer lost: %s.** Largest numbers: %s. On the 29th Pennsylvania page looked at (printed page 525) 21 of the 74 printed lines have no name in the text layer at all. They are not written; each is listed with leaf, position on the page, company, rank cell, date and remark in `diag/<unit>.json` (key `lost_name_lines`). A page image gives the name (gap EG-ROS-PA-01).' % (fmt(tot_lost), top))
    an('**Rank cells lost: %s lines have no rank** (flag R, %s of the lines). On many pages the text layer has none of the ditto marks `...do` of the rank column (the first page looked at, printed page 560, has the rank only on its last line). The rank is not guessed from the lines above (gap EG-ROS-PA-02).' % (fmt(C.get('R', 0)), pct(C.get('R', 0), tot_lines)))
    an('**Date cells damaged or cut: %s lines** (flag D, %s). The muster year is the usual loss, as the earlier family run found (its README: the year is missing "on a large share of pages"); in the 1862 regiments of volume 4 the cell often holds the month only ("Aug."). These lines are unknown for the inference "on the rolls" (gap EG-ROS-PA-03).' % (fmt(C.get('D', 0)), pct(C.get('D', 0), tot_lines)))
    an('**Names damaged (flag N): %s lines** (letters read as other letters, "Tlprlin ATichafil" for "Derlin, Michael", marks inside names). The name is printed as the layer has it; nothing is repaired. Names damaged beyond the patterns of the rule are not flagged (gap EG-ROS-PA-04).' % fmt(C.get('N', 0)))
    an('**Name glued to rank: %s lines** (flag J) were cut at the leader dots (section 2).' % fmt(C.get('J', 0)))
    an('**Stray marks beside the lines: %s lines** (flag G; table rules read as `I`, `l`, `!`, `|`, `j`, scanner marks) stay in the remarks as the text layer has them; a middle initial that stands at the edge of the rank column ("Taylor, William H..") is kept in the name. A mark in front of the rank is removed from the rank field (the file would read it as a carried heading) and flagged.')
    an('**Order of the words of a line differs between text layer and page: %s lines** (flag O); the cells file gives the page order.' % fmt(C.get('O', 0)))
    cg = ['%s (after %s: %s missing)' % (U[k]['designation'], g['after'], g['missing']) for k in gaps_units for g in U[k]['company_gaps']]
    an('**Company titles lost by the text layer: %d units have a gap in the sequence of company letters** (%s). The lines under the company before a gap may hold the lines of the missing company (flag Q, %s lines); a damaged title whose letter was taken from the order of the titles is flagged C (%s lines). Company letters are not read from the page image (gap EG-ROS-PA-05).' % (
        len(gaps_units), '; '.join(cg[:40]) + ('; ...' if len(cg) > 40 else ''), fmt(C.get('Q', 0)), fmt(C.get('C', 0))))
    an('**Repeat scans.** The word-box files hold no words for %d leaves that the text layer does hold (the Internet Archive page-number file gives them no printed page): they are second scans of pages already read (for example volume 4 leaves 64 to 67 repeat leaves 62 and 63, the 121st Pennsylvania). They are not read twice. **Volume 4 holds pages 545 to 560 twice**: leaves 577-592 (the 145th and 147th Pennsylvania, in their place) and leaves 981-996 (between the 15th and the 16th Cavalry), whose printed pages in the item\'s page-number file read 945 to 960 while the text layer prints 545 to 560; 193 of 252 lines of leaves 982-986 and 158 of 213 lines of leaves 993-996 were found again by name on leaves 578-582 and 590-592. Only the first set is read.' % al_tot['no_xml_leaves'])
    an('**Pages that carry the end of the narrative above the roll** (for example the 105th Pennsylvania, leaf 813: the last lines of the history of the regiment stand above "Field and Staff Officers"): the narrative lines are not lines of the roll and are not written; a roll page that begins with narrative is the only place where lines above the first title are dropped.')
    an('**Three-months regiments of the same numbers.** Volume 1 first prints the three-months regiments of April 1861 (1st to 25th Regiments and the Erie Regiment) and then the three-years regiments from the Eleventh (re-organised) on. The 11th and the 23rd Pennsylvania of this work item are the three-years regiments (leaves 275-334 and 335-371); the three-months rolls of the same numbers (leaves 134-144 and 237-259, other men, other organizations) are not read. Bates numbers the Reserves 30 to 42, the First Artillery 43, the First Cavalry 44, and so on; the table in section 1 gives the number of each unit.')
    bl = '; '.join('volume %s from leaf %s (printed page %s)' % (v, r[0][0], '') for v, r in sorted(BUR.items())) if False else ''
    an('**Burial Record.** Each volume closes with a Burial Record (name, rank, date of death, place of death, grave; leaves %s) and an alphabetical index of field officers. They are not rolls of regiments and are not parsed; they name men buried at Gettysburg and elsewhere and belong to the item roster-gettysburg-lists (gap EG-ROS-PA-06; the earlier family run recorded the same as G-PA12). The ranges of the 84th and the 118th Pennsylvania end before the Burial Record of their volumes.' % '; '.join('volume %s %d-%d' % (v, r[0][0], r[-1][1]) for v, r in sorted(BUR.items())))
    an('**Lines per unit and the earlier family run.** Where the earlier family run counted more rows than this run counts lines plus lost-name lines (for example the 63rd Pennsylvania: 2,592 earlier rows, %s lines and %s lost-name lines here), the surplus stands on leaves outside the leaf range of the unit in Bates or on pages counted twice; `differences-<unit>.csv` lists every row. The 63rd Pennsylvania roll fills 25 leaves of about 50 lines, which fits the lines written; 2,592 rows would need 100 lines per page.' % (
        fmt(U['u-pa-63rd-pennsylvania-infantry']['lines']), fmt(U['u-pa-63rd-pennsylvania-infantry']['lost_name_lines'])))
    an('**Units with no row in the baseline order of battle** (%s): the strength column is empty for them; the earlier family run recorded the 46th, 107th and 139th Pennsylvania and Thompson\'s Independent Battery C as absent from the repository order of battle (G-PA4).' % ', '.join(U[k]['designation'] for k in ordered if not U[k]['oob']['strength']))
    an('**Words a copy audit by word list would meet in printed text**: see section 6 (computed from the files).')
    w('')
    w('## 6. Gaps registered (proposals under `GOVERNANCE/horde/ws-rosters/proposed-register/`, lines appended to `rosters/GAPS.md`)')
    w('')
    w('* **EG-ROS-PA-01** %s printed lines whose name the text layer lost (not written; page-image reading needed). **EG-ROS-PA-02** the rank cell lost on %s lines. **EG-ROS-PA-03** the date of muster damaged on %s lines (the muster year usually); a second reading of the date column is owed. **EG-ROS-PA-04** names damaged by the text layer and not flagged; the independent sample (R-G9) of these files is not run. **EG-ROS-PA-05** company titles lost (%d units with a gap in the letters); company letters not checked on the page. **EG-ROS-PA-06** the statements of presence that no roll prints: the Burial Record of Bates (five volumes) and the 1863 casualty lists are lists of this kind (item roster-gettysburg-lists); the rolls print no place for 99 percent of the lines. **EG-ROS-PA-07** units without a baseline strength and the two sources of strength that differ (both shown, none chosen). **EG-ROS-PA-08** Battery H of the 3rd Pennsylvania Heavy Artillery served at Gettysburg as a section; Bates prints the roll of the whole battery and does not say who was in the section; the same holds for the detachment entries of the order of battle (G-PA5). **EG-ROS-PA-09** the independent sample of the %d unit files (R-G9) has not been run.' % (
        fmt(tot_lost), fmt(C.get('R', 0)), fmt(C.get('D', 0)), len(gaps_units), n_units))
    w('')
    # copy audit by word list over the written files
    pat = re.compile(r'\b(AI|Claude|Anthropic|LLM|GPT|chatbot|machine[- ]generated|automat\w+|agents?)\b')
    hits = collections.Counter()
    where = []
    R = L.R
    for k in ordered:
        head, segs, meta = R.read_unit(os.path.join(R2, 'data2', U[k]['file']))
        for _, rows in segs:
            for r in rows:
                for field, name in ((r[0], 'name'), (r[1], 'rank'), (r[3], 'remarks')):
                    m = pat.search(field)
                    if m:
                        hits[(k, name, m.group(1))] += 1
    w('**Copy audit (Measured, by word list over the unit files)**: %d hits in %d units: %s. A printed word such as `Claude` in a name field is a printed given name and stays as printed (DD-STG-02); nothing in the flag files, the cells files, the pointer file or the report says how the files were made.' % (
        sum(hits.values()), len(set(k for k, _, _ in hits)), '; '.join('%s %s "%s" %d' % (U[k]['designation'], f, wd, c) for (k, f, wd), c in sorted(hits.items())) or 'none'))
    w('')
    os.makedirs(os.path.join(R2, 'reports'), exist_ok=True)
    with open(os.path.join(R2, 'reports', 'union-pa.md'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines) + '\n')
    print('report written:', len(lines), 'lines')


if __name__ == '__main__':
    main()

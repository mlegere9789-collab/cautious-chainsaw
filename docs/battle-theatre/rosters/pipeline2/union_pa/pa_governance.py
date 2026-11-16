"""Governance texts of the work item union-pa from the computed numbers: the nine proposed register entries, the rows for rosters/GAPS.md and the block for the
delegated decisions file.  Every number is read from stats.json, page-checks.json and the diag files; none is typed.

    python3 -I docs/battle-theatre/rosters/pipeline2/union_pa/pa_governance.py          (from the repository root, after pa_stats.py and pa_pagecheck.py)

Writes  GOVERNANCE/horde/ws-rosters/proposed-register/union-pa-EG-ROS-PA-01.md ... -09.md
        GOVERNANCE/horde/ws-rosters/union-pa/gaps-lines.md          the rows to append to rosters/GAPS.md (appended once by the shell: cat ... >> GAPS.md)
        GOVERNANCE/horde/ws-rosters/union-pa/delegated-block.md      the block to append to GOVERNANCE/decisions/DELEGATED-DECISIONS-2026-11-11.md (appended once by the shell)
"""
import os, sys, json, collections
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import pa_lib as L
import pa_units as PU

GOV = L.GOV
PR = os.path.join(os.path.dirname(GOV), 'proposed-register')


def fmt(n):
    return format(n, ',') if isinstance(n, int) else str(n)


def pct(a, b):
    return '%.1f percent' % (100.0 * a / b) if b else 'n/a'


def main():
    S = json.load(open(os.path.join(GOV, 'stats.json')))
    U = S['units']
    T = S['totals']
    C = S['code_totals']
    checks = json.load(open(os.path.join(GOV, 'page-checks.json')))['pages']
    n_units = len(U)
    tot_lines, tot_lost = T['lines'], T['lost_name_lines']
    order = [u['key'] for u in PU.U if u['key'] in U]
    name = lambda k: U[k]['designation']
    big_lost = sorted(order, key=lambda k: -U[k]['lost_name_lines'])[:5]
    lost_units = sum(1 for k in order if U[k]['lost_name_lines'])
    gap_units = [k for k in order if U[k]['company_gaps']]
    no_strength = [k for k in order if not U[k]['oob']['strength']]
    two_sources = [k for k in order if U[k]['oob']['strength'] and U[k]['inscriptions'] and any(i['total'] for i in U[k]['inscriptions'])]
    gett_lines = T['remark_names_gettysburg']
    agree = sum(1 for c in checks if c['agrees'])
    # lines per unit without the second letter of company etc. are not needed; the verify totals are in the report
    ids = {}

    def entry(n, title, category, desc, why, searched, subst, strongest, tier, competing, marking, impact, rec, owner):
        eid = 'EG-ROS-PA-%02d' % n
        ids[n] = eid
        t = '# %s: %s\n\n| Field | Content |\n|---|---|\n' % (eid, title)
        rows = [('ID', eid), ('Requirement IDs', 'OA03 (complete roster section of both armies, source and rights per name); R22; Law clauses 3, 4 and 7'), ('Category', category),
                ('Description', desc), ('Why literal 100% is not possible or blocked', why), ('Evidence searched', searched), ('Autonomous substitute applied', subst),
                ('Strongest evidence-based reconstruction', strongest), ('Confidence tier', tier), ('Competing values', competing), ('Product marking', marking),
                ('Visual and audio impact', impact), ('Review status', 'internal review only (DEC-006: no public review label)'), ('Owner decision requested', owner),
                ('Agent recommendation', rec), ('Status', 'open (proposed by bt-rosters / union-pa; not yet in register/)'), ('Owner decision and date', '(filled only from the Decision Log)')]
        for a, b in rows:
            t += '| %s | %s |\n' % (a, b.replace('\n', ' '))
        os.makedirs(PR, exist_ok=True)
        with open(os.path.join(PR, 'union-pa-%s.md' % eid), 'w', encoding='utf-8') as f:
            f.write(t)

    biglist = '; '.join('%s %s' % (name(k), fmt(U[k]['lost_name_lines'])) for k in big_lost)
    entry(1, 'Printed lines of the Pennsylvania rolls whose name the text layer lost (not written)', 'evidence on the page, lost by the text layer',
          '%s printed lines of the rolls of %d of the %d units (%s of the %s printed lines counted) have no name word in the text layer: the rank, the date and the remark of the line are in the word boxes of the page, the name cell was not read. '
          'The lines are not written to the unit files (a line without a name is not a roster line) and are listed with their text and their place on the leaf in `GOVERNANCE/horde/ws-rosters/union-pa/diag/<unit>.json`. The five largest: %s.' % (
              fmt(tot_lost), lost_units, n_units, pct(tot_lost, tot_lost + tot_lines), fmt(tot_lost + tot_lines), biglist),
          'The only text layer of these volumes is the ABBYY reading kept by the Internet Archive; its word boxes carry no word for the name cell of these lines, and no second reading of the text exists in the tree (G02). The name is printed on the page and can be read only from the page image.',
          'The word-box files of the five volumes (aligned to the pinned text), the pinned search text of each leaf, the rendered page images of %d pages, of which %d hold lines whose name was lost (on those pages the names are printed and legible by eye).' % (len(checks), sum(1 for c in checks if c['lost'])),
          'None. No name is supplied from the earlier family run, from another list or from the order of the lines.',
          'A reading of the name column of the page image for each listed line (leaf and vertical place are in the diag file), stored as a further segment of the unit file with the reading engine named, and checked against the neighbouring lines.',
          'documented that the line exists (rank, date and remark of the line are in the text layer); the name is unknown', '-',
          'The unit page of the roster shows the number of printed lines without a name next to the line count, with this id; no line is invented.', 'None.',
          'Read the name columns of the listed lines from the page images with a second engine and add them; until then they stay listed, not written.', 'None needed.')
    entry(2, 'Rank cell lost or damaged on lines of the Pennsylvania rolls', 'evidence on the page, lost by the text layer',
          'On %s of the %s lines the rank cell is empty or damaged in the text layer (flag R in the flag files; the page prints a rank or a ditto mark there, "do." for most privates).' % (fmt(C.get('R', 0)), fmt(tot_lines)),
          'The text layer has no rank word for the line; the printed rank is on the page image. A ditto mark carries the rank of the line above, so a rank is inferred only for a line whose neighbours are clean, and that inference would be a reading, not the print.',
          'The unit files (rank field), the flag files (code R), the page images of the pages looked at (%d pages).' % len(checks),
          'None: the rank field stays empty as the text layer has it.', 'Read the rank column of the page images for the R lines; where the ditto mark is legible, carry the rank of the line above and mark the line inferred.',
          'documented (the page prints a rank); the rank of the line is unknown in the file', '-',
          'The unit page does not claim a rank for the line; the flag file marks it R.', 'None.', 'Second reading of the rank column with the page images; mark inferred ranks.', 'None needed.')
    entry(3, 'Date of muster damaged on lines of the Pennsylvania rolls', 'evidence on the page, damaged in the text layer',
          'On %s of the %s lines the date of muster into service (month, day, year; the year usually) is incomplete or damaged in the text layer (flag D). The date cell and the remarks are one field of the line; the cells file gives the words in the order of the page. '
          'The inference "on the rolls in July 1863" is not made for these lines (unknown).' % (fmt(C.get('D', 0)), fmt(tot_lines)),
          'The text layer prints the month and loses the day and the year, or loses the cell. The date is on the page image only.', 'The unit files, the flag files (code D, and on_rolls_july_1863 unknown), the page images of the pages looked at.',
          'None: nothing is completed from the neighbours or from the muster years of the company.', 'A reading of the date column of the page images, stored as a further segment with the engine named; the on-the-rolls inference is re-run on the readings.',
          'documented (the page prints the date); not in the file', '-', 'The flag file marks the line D; the unit page does not show an enlistment date the line does not print.', 'None.',
          'Second reading of the date column with the page images for the D lines.', 'None needed.')
    entry(4, 'Names damaged by the text layer of the Pennsylvania rolls (flagged and not flagged)', 'text damaged',
          'The text layer damages names: %s lines carry flag N (a digit or mark inside a name word, a lower-case start, a letter pair the print does not have, a word run into the next, or no word of two letters), %s lines flag J (the name and the rank are one word of the text layer and are cut at the leader dots), %s flag S (a name word stands apart from the name in the text layer). '
          'The flags are patterns, not a reading: damage that does not match a pattern is not flagged, and the share of such lines is unknown because the independent sample (R-G9) of these files has not been run.' % (fmt(C.get('N', 0)), fmt(C.get('J', 0)), fmt(C.get('S', 0))),
          'The name is only in the text layer in the damaged spelling; no list of the same men exists that is not itself an OCR reading of the same volumes (the earlier family run read the same text layer).',
          'The unit files, the flag files, the difference lists against the earlier family run (`differences-<unit>.csv`, %s earlier rows only in the earlier files, %s lines only in the new files), the %d pages looked at.' % (fmt(S['reconciliation_totals'].get('earlier_only', 0)), fmt(S['reconciliation_totals'].get('new_only', 0)), len(checks)),
          'None: every name stays as the text layer has it; the normalised name in the flag file only re-orders the printed tokens.', 'The independent sample of pages by roster-qa (R-G9) and a second reading of the name column of the page images for the flagged lines.',
          'documented that a name is printed; the spelling in the file is the OCR reading', '-', 'The flag files mark N, J and S; no name is corrected.', 'None.', 'Run the independent sample on these files; read the flagged names from the images.', 'None needed.')
    gl = '; '.join('%s (%s)' % (name(k), ', '.join('after %s: %s missing' % (g['after'], g['missing']) for g in U[k]['company_gaps'])) for k in gap_units)
    entry(5, 'Company letters of Pennsylvania lines whose company title the text layer lost or damaged', 'evidence on the page, lost by the text layer',
          '%s lines carry flag C (the title of the company above the line is damaged or lost: the letter was taken from the order of the titles, or from the line that says where the company was recruited) and %s lines flag Q (a title is missing after the title of the line\'s company, so these lines may hold the lines of the missing company). '
          '%d units show a gap in the letters: %s.' % (fmt(C.get('C', 0)), fmt(C.get('Q', 0)), len(gap_units), gl or 'none'),
          'The company title is a line of the page that the text layer lost; the letter is on the page image.', 'The headings found per unit (`diag/<unit>.json`, headings), the flag files (C, Q), the pages looked at.',
          'The letter of the sequence is written with flag C; where the sequence has a gap, flag Q marks the lines that may belong to the missing company; no letter is supplied beyond that.',
          'Read the missing titles from the page images and re-assign the lines.', 'inferred (sequence of the titles)', 'the letter by sequence against the letter on the page (not read)',
          'The flag files mark C and Q; the unit page shows the company letter of a Q line as inferred.', 'None.', 'Read the titles of the companies of the gaps from the page images.', 'None needed.')
    entry(6, 'Statements of presence at Gettysburg that the Pennsylvania rolls do not print', 'evidence not in the source',
          'The rolls print the history of each man in the service (muster, promotion, wounds, discharge, death) and name Gettysburg in the remark of %s of the %s lines (%s; a count of a printed word, not a statement that the man was present). '
          'For every other line the roll does not say where the man was on 1 to 3 July 1863; the inference "on the rolls" (flag file) is made from printed dates only. Bates prints a Burial Record at the end of each volume and the National Cemetery lists exist; both are lists of this kind and are not read here (item roster-gettysburg-lists).' % (
              fmt(gett_lines), fmt(tot_lines), pct(gett_lines, tot_lines)),
          'No muster roll of 30 June 1863 or of the days of the battle is in the sources of this item (G01, G-PA1).', 'The remarks of the unit files (the word Gettysburg and events dated 1 to 3 July 1863: %s lines), the Burial Record leaves of the five volumes (`burial-record-leaves.json`).' % fmt(T['remark_event_dated_1_to_3_july_1863']),
          'None: no line carries a label of presence (DD-ROS-01); the flag file gives only "on the rolls (inferred from printed dates)".', 'The lists of the item roster-gettysburg-lists as further segments, with the printed place.',
          'documented where a remark prints the place; otherwise no statement', '-', 'The unit page says "on the rolls in July 1863 (inferred from printed dates)", never "present".', 'None.', 'Read the Burial Record and the casualty lists as further segments by the item roster-gettysburg-lists.', 'None needed.')
    nsl = ', '.join(name(k) for k in no_strength) or 'none'
    entry(7, 'Strength of the Pennsylvania units: units without a baseline strength, two sources that differ', 'source conflict',
          'The baseline order of battle gives a strength for %d of the %d units; no baseline strength: %s. For %d units the 1914 monument inscription (read by the earlier family run and searched again here) gives a figure of men present; where both exist they differ for most units (second-hand Busey and Martin against the 1914 text). Both are shown in the report, none is chosen (Law 6). '
          'The rolls are whole-war rolls and are not comparable with the strength present on 1 to 3 July 1863.' % (n_units - len(no_strength), n_units, nsl, len(two_sources)),
          'Two sources with different figures; the choice of a default is the owner\'s.', 'baseline/dist/data/oob, tmp/library/misc/pennsgettysburg02reynrich_djvu.txt (first lines of the inscriptions found again), data/PA/reconciliation.csv.', 'None.',
          'Both figures with their source, as a selectable scenario in the Battle Theatre.', 'documented (inscription text); second-hand (Busey and Martin)', 'baseline strength against 1914 inscription', 'The unit page shows both figures with the source of each.', 'Number of men instanced: the strength figure of the chosen scenario.',
          'Carry both as scenarios; add the missing orders of battle rows (46th, 107th and 139th Infantry, Independent Battery C) to the baseline.', 'Default view of the strength (PENDING OWNER).')
    entry(8, 'Battery H of the 3rd Pennsylvania Heavy Artillery and the detachment entries of the order of battle', 'evidence not in the source',
          'The baseline places a section of Battery H of the 3rd Pennsylvania Heavy Artillery at Gettysburg (and detachments of the 11th Infantry, the 11th Reserves and the 18th Cavalry, gap G-PA5). Bates prints the roll of the whole battery (or regiment) and does not say which men were in the section or the detachment. The unit file of Battery H is the roll of the battery (%s lines).' % fmt(U['u-pa-battery-h-3rd-pennsylvania-heavy-artillery-section']['lines']),
          'The source does not name the men of the detachment.', 'Bates vol 4 printed pages 737 to 740 (leaves 773 to 776); the baseline entries.', 'None: no man is assigned to the section.',
          'The Official Records and the monument text for the names of the section, if they exist.', 'documented that the section was present (baseline); the men are unknown', '-', 'The unit page says the file is the roll of the whole battery.', 'None.', 'Search the Official Records and the 1914 book for the names of the section.', 'None needed.')
    entry(9, 'Independent sample (R-G9) of the Pennsylvania unit files not run', 'verification not done',
          'The %d unit files (%s lines) were compared with the print by the author on %d pages (%d of them agree line by line; the rest are listed in `page-checks.json`). That is not an independent sample: the gate R-G9 (a fresh draw of pages read by a second reader) has not been run on these files, so the share of lines that differ from the print is unknown.' % (n_units, fmt(tot_lines), len(checks), agree),
          'The sample is the work of the item roster-qa and needs page images and a second reader.', 'The pages looked at (`page-checks.json`).', 'None.', 'The draw, the second reading and the verdicts of roster-qa.', 'not verified', '-', 'The unit page does not claim a measured accuracy.', 'None.', 'Draw the sample after the next round of the parser.', 'None needed.')

    # ---- rows for rosters/GAPS.md
    g = []
    ev = lambda *a: ' '.join(a)
    g.append('| G-PA21 | **Pennsylvania, %d units: %s printed lines whose name the text layer lost are not written** (EG-ROS-PA-01; %s of the printed lines counted); the five largest: %s | diag/<unit>.json (GOVERNANCE/horde/ws-rosters/union-pa), reports/union-pa.md | Open: read the name column of the page images with a second engine |' % (n_units, fmt(tot_lost), pct(tot_lost, tot_lost + tot_lines), biglist))
    g.append('| G-PA22 | **Pennsylvania: rank cell lost or damaged on %s lines** (EG-ROS-PA-02, flag R) | flag files, reports/union-pa.md | Open: second reading of the rank column |' % fmt(C.get('R', 0)))
    g.append('| G-PA23 | **Pennsylvania: date of muster damaged on %s lines** (EG-ROS-PA-03, flag D; the year is the usual loss); "on the rolls in July 1863" stays unknown for them | flag files, reports/union-pa.md | Open: second reading of the date column |' % fmt(C.get('D', 0)))
    g.append('| G-PA24 | **Pennsylvania: damaged names** (EG-ROS-PA-04): N %s, J %s, S %s lines flagged; damage that matches no pattern is not flagged and its share is unknown; nothing is corrected | flag files, differences-<unit>.csv | Open: independent sample, second reading of flagged names |' % (fmt(C.get('N', 0)), fmt(C.get('J', 0)), fmt(C.get('S', 0))))
    g.append('| G-PA25 | **Pennsylvania: company letters inferred** (EG-ROS-PA-05): %s lines flagged C, %s flagged Q; %d units show a gap in the letters (%s) | flag files, diag/<unit>.json headings | Open: read the missing titles from the page images |' % (fmt(C.get('C', 0)), fmt(C.get('Q', 0)), len(gap_units), ', '.join(name(k) for k in gap_units) or 'none'))
    g.append('| G-PA26 | **Pennsylvania: statements of presence not read** (EG-ROS-PA-06): the Burial Record of the five volumes (leaves in burial-record-leaves.json) and the casualty lists are not parsed; the rolls name Gettysburg in %s of %s lines | burial-record-leaves.json, reports/union-pa.md | Open: item roster-gettysburg-lists |' % (fmt(gett_lines), fmt(tot_lines)))
    g.append('| G-PA27 | **Pennsylvania: strengths** (EG-ROS-PA-07): no baseline strength for %s; where the 1914 inscription and the baseline differ both are shown, none chosen | stats.json, reports/union-pa.md section 1 | Permission: owner default view of the strength (PENDING OWNER) |' % nsl)
    g.append('| G-PA28 | **Pennsylvania: Battery H of the 3rd Heavy Artillery is a section; the men of the section and of the detachment entries are not named by Bates** (EG-ROS-PA-08) | reports/union-pa.md | Open: Official Records, 1914 book |')
    g.append('| G-PA29 | **Pennsylvania: independent sample (R-G9) of the %d unit files not run** (EG-ROS-PA-09); the author compared %d pages with the print, %d agree line by line | page-checks.json | Open: roster-qa |' % (n_units, len(checks), agree))
    g.append('| G-PA30 | **Pennsylvania: the rolls of the three-months regiments of April 1861 (volume 1, 1st to 25th Regiments and the Erie Regiment) are not read**; only the three-years rolls are units of this item. Leaves of volume 4 that repeat pages (545 to 560, scanned twice) are not read twice | pipeline2/union_pa/pa_units.py, reports/union-pa.md section 5 | Open if the owner wants the three-months rolls |')
    with open(os.path.join(GOV, 'gaps-lines.md'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(g) + '\n')

    # ---- delegated decisions
    d = []
    d.append('## Added 2026-11-16 by bt-rosters / union-pa: the Pennsylvania roster files (DELEGATED, reversible by the owner, not owner decisions; detail in rosters/reports/union-pa.md)')
    d.append('')
    d.append('| id | question | options | chosen default | evidence | tier | reversibility | product marking |')
    d.append('|---|---|---|---|---|---|---|---|')
    d.append('| DD-ROS-PA-01 | Which rolls of Bates are read for the 82 Pennsylvania units | every roll of the five volumes; the rolls of the three-years regiments and batteries only | The three-years rolls only: volume 1 prints the three-months regiments of April 1861 first and the three-years regiments after them; the units that stood at Gettysburg are the three-years regiments. The narrative histories, the Burial Record and the index of field officers are not read | pipeline2/union_pa/pa_units.py (ranges checked against the running heads), reports/union-pa.md section 5 | documented | extend pa_units.py and rerun | the unit page names the rolls read |')
    d.append('| DD-ROS-PA-02 | Printed lines whose name the text layer lost | write them with an empty name; write them with a name taken from another source; do not write them and list them | Not written, listed with their text and place in diag/<unit>.json (%s lines); no empty-name line, no supplied name | GOVERNANCE/horde/ws-rosters/union-pa/diag/*.json, EG-ROS-PA-01 | documented (the line exists) | rerun after a second reading | the unit page states the count of lines without a name |' % fmt(tot_lost))
    d.append('| DD-ROS-PA-03 | A word of the text layer that is the name and the rank cell run together by leader dots | keep the word whole in the name; cut it | Cut at the leader run (or at a ditto mark after the name); the part before is the name, the part after the rank; flag J (%s lines); the word stands in the pinned text so the line verifies | pa_tok.split_glued, flag files (J) | inferred (where the cell ends) | change split_glued and rerun | flag J |' % fmt(C.get('J', 0)))
    d.append('| DD-ROS-PA-04 | The company letter of a line under a damaged or lost title | leave it empty; take it from the order of the titles | From the order of the titles, with flag C (%s lines) and flag Q (%s lines) where a title is missing in the letters; never silently | pa_build.resolve_letter, diag headings | inferred | change the resolver and rerun | flags C and Q |' % (fmt(C.get('C', 0)), fmt(C.get('Q', 0))))
    d.append('| DD-ROS-PA-05 | The date of muster, the term digit and the remarks of a line | separate fields; one field of the line as the page prints it | One field (the remarks of roster2/2) in the order of the page: the words right of the rank cell exactly as the text layer prints them; the cells file gives the page order where the text layer lists them differently (flag O) | unit files, cells files | documented (the printed words) | none needed | the unit page shows the field as printed |')
    d.append('| DD-ROS-PA-06 | Page furniture and lines that are not soldiers (running heads, page numbers, column headings, signature marks, footnotes, "recruited at" lines) | write them as lines; skip them | Skipped; every skipped line stands with its text in diag/<unit>.json (skipped) so that nothing is concealed | diag files, pa_page.py | documented | none needed | none |')
    d.append('| DD-ROS-PA-07 | A remark that stands alone on a line under a complete remark | join it to the remark above (a wrapped line); count it as a line whose name, rank and date the text layer lost | A remark that begins at the left edge of the remark column with a verb of the rolls, under a remark that ends with a full stop, is a line of its own whose cells were lost (counted lost); a remark that is indented or under an unfinished remark is the wrapped line of the remark above | pa_page.py (_remark_start, _ends_sentence), page 898 of volume 5 (the two lines "Died - date unknown" and "Discharged - date unknown" would otherwise stand under the wrong men) | inferred | change the rule and rerun | none |')
    d.append('| DD-ROS-PA-08 | Pages that the Internet Archive scanned twice | read both; read the first | The first set only (leaves without word boxes are repeats; volume 4 pages 545 to 560 stand at leaves 577-592 and again at 981-996, the 145th and 147th Infantry are read from the first set) | duplicate-leaves.json | documented | add the ranges to pa_units.py | none |')
    d.append('| DD-ROS-PA-09 | The normalised name and the marks in the flag files | write them into the lines; keep them in the flag file | In the flag file beside each unit file (normalised_names, ocr_uncertain, on_rolls_july_1863); the lines are never repaired | flag files (about) | documented | none needed | none |')
    d.append('| DD-ROS-PA-10 | The inference "on the rolls in July 1863" | a presence label; printed dates only | Printed dates only (pa_dates.py, clean dates, strict month words): yes needs a clean muster date on or before 30 June 1863 and no separation or only later ones; no needs a muster date after 3 July 1863 or a clean earlier separation; unknown otherwise; never "present" | flag files (on_rolls_july_1863 rule), pa_dates.py | inferred | change the rule and rerun | "on the rolls in July 1863 (inferred from printed dates)" |')
    d.append('| DD-ROS-PA-11 | Stray marks, ditto marks and leader dots inside the line | strip them; keep them | Kept as the text layer has them, flag G where marks stand beside the line | unit files, flag files (G) | documented | none needed | none |')
    with open(os.path.join(GOV, 'delegated-block.md'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(d) + '\n')
    print('entries', len(ids), 'gap rows', len(g), 'dd rows', len(d) - 4)


if __name__ == '__main__':
    main()

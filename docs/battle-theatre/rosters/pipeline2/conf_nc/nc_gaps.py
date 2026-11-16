"""The gaps of the conf-nc work item, with every number computed from the files (stats.json, copy-audit.json, the unit and flag files through stats.json).

    python3 -I nc_gaps.py            writes under GOVERNANCE/horde/ws-rosters/conf-nc/:
                                       gap-lines.md           the rows to append to rosters/GAPS.md (appended by a shell >>, never rewritten)
                                       delegated-decisions.md the block to append to GOVERNANCE/decisions/DELEGATED-DECISIONS-2026-11-11.md (shell >>)
                                     and under GOVERNANCE/horde/ws-rosters/proposed-register/: conf-nc-EG-ROS-NC-0n.md (one file per gap)

nc_report.py imports analysis() and GAPS from here so that the report, GAPS.md and the proposed entries say the same thing.
"""
import os, sys, json, re, statistics, collections

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import nc_lib as L, nc_units as U

WS = L.WS
PROP = os.path.join(os.path.dirname(WS), 'proposed-register')


def fmt(n):
    return '{:,}'.format(n)


def jload(p):
    with open(p, encoding='utf-8') as f:
        return json.load(f)


def analysis(S):
    """Numbers shared by the report and the gap texts, from stats.json (S)."""
    A = {}
    units = S['units']
    A['n_units'] = len(units)
    A['tot'] = S['totals']
    pt = {k: u.get('printed_total') for k, u in units.items()}
    whole = {k: u for k, u in units.items() if u['moore']['company'] == ''}
    A['unreadable_totals'] = [k for k, u in whole.items() if pt[k] and pt[k]['value'] is None]
    diffs = {k: u['lines'] - pt[k]['value'] for k, u in whole.items() if pt[k] and pt[k]['value'] is not None}
    A['diffs'] = diffs
    A['diff_min'] = min(diffs.values())
    A['diff_max'] = max(diffs.values())
    A['n_neg'] = sum(1 for v in diffs.values() if v < 0)
    A['n_pos'] = sum(1 for v in diffs.values() if v > 0)
    A['n_zero'] = sum(1 for v in diffs.values() if v == 0)
    A['notes'] = [(k, x) for k, u in units.items() for x in u.get('notes', [])]
    small = []
    for k, u in units.items():
        cc = {c: v for c, v in u['company_counts'].items() if c != 'FS'}
        if len(cc) < 4:
            continue
        med = statistics.median(cc.values())
        for c, v in cc.items():
            if v < 0.5 * med:
                small.append((k, c, v, med))
    A['small_companies'] = small
    A['page_null'] = {k: u['page_null'] for k, u in units.items() if u['page_null']}
    A['no_baseline'] = [k for k, u in units.items() if u['baseline']['strength'] is None]
    A['no_earlier'] = [k for k, u in units.items() if not u['earlier_rows']]
    rr = jload(os.path.join(WS, 'reconciliation.json'))['units']
    A['rr'] = rr
    dp = [abs(diffs[k]) for k in diffs]
    ds = [abs(u['lines'] - rr[k]['second_scan']['lines']) for k, u in whole.items()]
    de = [abs(u['lines'] - rr[k]['earlier']['lines']) for k, u in whole.items() if rr[k].get('earlier')]
    A['med_printed'], A['n_printed'] = statistics.median(dp), len(dp)
    A['med_second'], A['n_second'] = statistics.median(ds), len(ds)
    A['med_earlier'], A['n_earlier'] = statistics.median(de), len(de)
    A['n_diff_files'] = len([f for f in os.listdir(WS) if f.startswith('differences-') and f.endswith('.csv')])
    runs = [(k, x['second_scan']['second_only_runs']) for k, x in rr.items() if x['second_scan']['second_only_runs']]
    A['second_runs'] = sum(len(v) for k, v in runs)
    A['second_run_lines'] = sum(r['second_rows'][1] - r['second_rows'][0] for k, v in runs for r in v)
    A['second_run_units'] = len(runs)
    A['dup_units'] = {k: sum(len(v) for v in u['scan']['dups_dropped'].values()) for k, u in units.items() if sum(len(v) for v in u['scan']['dups_dropped'].values())}
    hist = jload(os.path.join(L.ROOT, 'docs', 'battle-theatre', 'history', 'units.json'))['units']
    hh = {x['id']: x for x in hist} if isinstance(hist, list) else hist
    master = {x['key']: x for x in jload(os.path.join(L.D2, 'units.json'))['units']}
    ids = [i for k in units for i in ((master[k].get('registry') or {}).get('history') or [])]
    recap = jload(os.path.join(WS, 'recap.json'))['entries']
    A['recap_image'] = [k for k, x in units.items() if x['moore']['company'] == '' and recap.get('%s-%s' % (x['moore']['number'], x['moore']['kind']), {}).get('value_source') == 'page image']
    A['clark_units_with'] = [k for k, x in units.items() if x.get('clark', {}).get('notes')]
    A['clark_units_without'] = [k for k, x in units.items() if not x.get('clark', {}).get('notes')]
    A['clark_strength_units'] = [k for k, x in units.items() if x.get('clark', {}).get('strength_low') is not None]
    # Moore's notes that promise an appendix ("the names will be inserted in an appendix to this volume"): where the words stand in the eight text layers
    app = {}
    for vol in '1234':
        for sc in 'ab':
            txt = L.load(L.text_id(vol, sc))[0]
            hits = [m.start() for m in re.finditer(r'(?i)appendix|addenda|errata|corrigenda', txt)]
            app[L.text_id(vol, sc)] = {'n': len(hits), 'promises': sum(1 for h in hits if re.search(r'(?i)\ban\s+$', txt[max(0, h - 30):h]))}
    A['appendix'] = app
    A['registry_history_ids'] = len(ids)
    A['registry_with_strength'] = sum(1 for i in ids if hh[i].get('strength') is not None)
    return A


def appendix_clause(A, cap=False):
    """A measured sentence about the appendix that some of Moore's notes promise (no number is typed here; it stops the run when a hit is not a promise)."""
    ap = A['appendix']
    na = sum(v['n'] for k, v in ap.items() if not k.endswith('~b'))
    nb = sum(v['n'] for k, v in ap.items() if k.endswith('~b'))
    pa = sum(v['promises'] for k, v in ap.items() if not k.endswith('~b'))
    pb = sum(v['promises'] for k, v in ap.items() if k.endswith('~b'))
    assert pa == na and pb == nb, 'a place of the words appendix, addenda, errata, corrigenda is not inside a promise ("in an appendix"): read it before the gap text is written'
    vols = ' and '.join('volume %s' % v for v in '1234' if ap[L.text_id(v, 'a')]['n'] or ap[L.text_id(v, 'b')]['n']) or 'no volume'
    c = ('a search of the text layers of the eight pinned scans for the words appendix, addenda, errata and corrigenda finds %d places in the four first scans and %d in the four second scans (%s), every one inside a note that promises an appendix '
         '("... will be inserted in an appendix to this volume"); no part of a volume is headed by one of these words, so the names those notes promise (in this item Company I of the 4th Cavalry) are not in the pinned volumes' % (na, nb, vols))
    return c[0].upper() + c[1:] if cap else c


def gaps(S, A, audit=None):
    """[{'id': 'EG-ROS-NC-01', 'gid': 'G-NC01', 'title', 'line' (GAPS.md text), 'what', 'evidence', 'route', 'tier', 'markers'}]"""
    t = A['tot']
    u = S['units']
    unread = [u[k]['designation'] for k in A['unreadable_totals']]
    small = '; '.join('%s Company %s (%d lines, median company of the unit %d)' % (u[k]['designation'], c, v, med) for k, c, v, med in A['small_companies'])
    pn = A['page_null']
    pn_txt = ', '.join('%s %d' % (u[k]['designation'], v) for k, v in pn.items())
    rr = json.load(open(os.path.join(WS, 'reconciliation.json'), encoding='utf-8'))['units']
    ss_f = sum(x['second_scan']['only_in_file'] for x in rr.values())
    ss_s = sum(x['second_scan']['only_in_second'] for x in rr.values())
    ea_f = sum(x['earlier']['only_in_file_by_key'] for x in rr.values() if x.get('earlier'))
    ea_e = sum(x['earlier']['only_in_earlier_by_key'] for x in rr.values() if x.get('earlier'))
    n_ea = sum(1 for x in rr.values() if x.get('earlier'))
    g = []
    g.append({
        'id': 'EG-ROS-NC-01', 'gid': 'G-NC01', 'category': 'verification, independent sample not run',
        'title': 'North Carolina: independent sample (R-G9) not run; lines are checked against the pinned text only',
        'line': '| G-NC01 | **North Carolina, 41 units: independent sample (R-G9) not run** (EG-ROS-NC-01); the %s lines are checked by machine against the pinned text (name tokens at the offset, remark tokens in order, printed page of the leaf: 0 defects) and against two other readings, and one page image was looked at (to settle one damaged name); the cuts of entries that the text layer ran together (%s heads recovered backwards from a marker, %s lines flagged H) are readings of the parser and unproven beyond that | machine verification of every line; the second scan and the earlier roll files as two other readings; the page image of leaf 130 of volume 2 | Open: roster-qa, 299 lines or more of the 41 files against page images |'
                % (fmt(t['lines']), fmt(t['head_S-recovered']), fmt(t['flag_H'])),
        'what': 'The independent sample of page images (PRODUCTION-PLAN 9.8) was not run on the 41 North Carolina files, and no gate of that sample is claimed. The lines are verified by machine against the pinned text of the primary scan (V1 name tokens at the recorded offset, V2 remark tokens in order, V3 printed page of the leaf; 0 defects in %s lines), compared with the second scan and with the earlier roll files (reconciliation), and one page image was looked at, to settle one damaged name (the 2nd North Carolina Cavalry, printed page 116). Where the text layer runs several entries together the parser cuts them by rules (%s heads were recovered backwards from a strict marker inside the remarks of the line above; %s lines carry the flag H for a head cut by a rule that is a reading); whether a remark belongs to its name on a damaged page is proven only by the order of the tokens in the text layer.' % (fmt(t['lines']), fmt(t['head_S-recovered']), fmt(t['flag_H'])),
        'evidence': 'unit files and flag files; GOVERNANCE/horde/ws-rosters/conf-nc/build-summary.json, verify-unit-run.out, reconciliation.json; rosters/reports/conf-nc.md section 4',
        'route': 'roster-qa draws pages of the North Carolina strata (one stratum per primary scan, DD-ROS-NC-01) and compares the stored lines with the print',
        'tier': 'n/a (a verification gap)', 'markers': 'the flag H and the head_kinds of the flag files mark every line whose head was cut by a rule that is a reading'})
    g.append({
        'id': 'EG-ROS-NC-02', 'gid': 'G-NC02', 'category': 'damaged text layer, second reading of page images needed',
        'title': 'North Carolina: lines whose name, dates or remarks the text layer damaged, and lines without a printed page',
        'line': '| G-NC02 | **North Carolina: damaged lines** (EG-ROS-NC-02): %s of %s lines are flagged in the flag files (ocr_uncertain); name damaged N %s, head cut by a reading H %s, company letter by the sequence C %s, rank R %s, date Y %s, marks G %s, run-together entries M %s, remark word W %s; %s lines carry no printed page (%s: the first leaves of three volumes have no number in the item page-number file); a printed line the text layer lost altogether is not written and not counted anywhere | the text layers of two scans per volume; one page image looked at (2nd North Carolina Cavalry printed p. 116: Walker, Jesse M.) | Open: second reading of page images (pipeline2/page_image.py; EG-ROS-011) of the flagged leaves |'
                % (fmt(t['ocr_uncertain']), fmt(t['lines']), fmt(t['flag_N']), fmt(t['flag_H']), fmt(t['flag_C']), fmt(t['flag_R']), fmt(t['flag_Y']), fmt(t['flag_G']), fmt(t['flag_M']), fmt(t['flag_W']), fmt(t['page_null']), pn_txt),
        'what': 'The text layers of the Internet Archive scans are one OCR reading of each page. %s of %s lines (%.1f percent) match at least one damage pattern of the flag files; the patterns are heuristics on the printed cell, not a count of errors: N name damaged (%s), H head cut by a rule that is a reading (%s), C company letter given by the sequence of headings (%s), R rank damaged (%s), Y date damaged (%s), G marks of the scan (%s), M line that may hold more than one entry (%s), W remark word damaged (%s). %s lines carry no printed page because the page-number file of their Internet Archive item gives none for their leaf (%s). Names and dates that are damaged stay as the text layer prints them (Law 4: no repair); the second scan and the earlier file read the same lines differently in places (EG-ROS-NC-03), and one name was read from a page image (the print says "Walker, Jesse M."; the layer of the primary scan reads the initial as two capital letters).'
                % (fmt(t['ocr_uncertain']), fmt(t['lines']), 100.0 * t['ocr_uncertain'] / t['lines'], fmt(t['flag_N']), fmt(t['flag_H']), fmt(t['flag_C']), fmt(t['flag_R']), fmt(t['flag_Y']), fmt(t['flag_G']), fmt(t['flag_M']), fmt(t['flag_W']), fmt(t['page_null']), pn_txt),
        'evidence': 'flag files (ocr_uncertain, rows by code, page_image_readings); rosters/reports/conf-nc.md sections 2 and 5',
        'route': 'second reading of the page images of the flagged leaves with pipeline2/page_image.py (archive.org /cors/ text PDF, one page at a time); the roster-qa item samples it',
        'tier': 'documented where the line is legible; the damaged parts are marked, not reconstructed', 'markers': 'the flag files mark the lines; the roster page shows the mark'})
    g.append({
        'id': 'EG-ROS-NC-03', 'gid': 'G-NC03', 'category': 'source conflict between readings (carried, none resolved)',
        'title': 'North Carolina: the readings of the same roll differ in places; none is resolved',
        'line': '| G-NC03 | **North Carolina: lines in one reading only** (EG-ROS-NC-03): against the second scan of the same volume the alignment finds %s lines only in the file and %s only in the second scan (41 units); %d runs of second-scan lines (%d lines, %d units) have no place in the file (a block that the second scan holds twice, or lines that the primary scan lost: not decided); against the earlier roll files of the C-NCLA family (%d units, %s lines) %s file lines and %s earlier lines have no line with the same key in the other reading (%d differences files, the listing of a side cut at 400 lines); no line of any reading is merged into the unit files and none is resolved by guessing | reconciliation.json, differences-<unit>.csv | Open: second reading of page images of the lines in differences-<unit>.csv (EG-ROS-011) |'
                % (fmt(ss_f), fmt(ss_s), A['second_runs'], A['second_run_lines'], A['second_run_units'], n_ea, fmt(sum(x['earlier']['lines'] for x in rr.values() if x.get('earlier'))), fmt(ea_f), fmt(ea_e), A['n_diff_files']),
        'what': 'Each unit file is one reading (the primary scan, chosen per unit by a measured score). It was compared by alignment (company and the sorted letters of the name tokens) with the second scan of the same volume (the other Internet Archive copy of the 1882 edition, parsed by the same parser) and with the earlier roll file of the C-NCLA family (an independent reading of the same texts; %d of the 41 units have one). Lines in one reading only: second scan %s only in the file, %s only in the second scan; earlier file %s file lines and %s earlier lines whose key occurs in no line of the other side. The differences are in the main the same line damaged differently in the two readings (a name with a letter read otherwise changes the key); this is not proven line by line. %d runs of second-scan lines (%d lines, %d units) stand at no place of the file: either a block that the second scan holds twice or lines that the primary scan lost; this is not decided. Nothing is merged: the lines of the second scan are not supplements of the unit files (pages held twice make a run of "only in the second scan" lines unreliable as evidence of a lost line).' % (n_ea, fmt(ss_f), fmt(ss_s), fmt(ea_f), fmt(ea_e), A['second_runs'], A['second_run_lines'], A['second_run_units']),
        'evidence': 'GOVERNANCE/horde/ws-rosters/conf-nc/reconciliation.json and differences-<unit>.csv (%d files)' % A['n_diff_files'],
        'route': 'page images of the listed lines (EG-ROS-011); the owner picks no default: the readings stay selectable, the unit file is the primary reading',
        'tier': 'documented (two independent text readings of the same print differ); no reading is preferred beyond the primary-scan rule', 'markers': 'the differences files; the report'})
    g.append({
        'id': 'EG-ROS-NC-04', 'gid': 'G-NC04', 'category': 'presence on 1-3 July 1863 not stated by the roll',
        'title': 'North Carolina: Moore prints the whole war; presence at Gettysburg is stated only where a remark says so',
        'line': '| G-NC04 | **North Carolina: presence on 1-3 July 1863** (EG-ROS-NC-04): Moore prints every man of each unit for the whole war and no muster of 30 June 1863; %s of %s lines name Gettysburg in their remarks (an OCR-tolerant lower bound; %s of them print 1, 2 or 3 July 1863); every other man is on the rolls (inferred from printed dates only: yes %s, no %s, unknown %s) with no statement of presence; no label of presence is written into a line (DD-ROS-01) | the 41 unit files and flag files; the earlier GAPS lines G05 and GN01 (Moore names 512 or 515 Gettysburg casualties of the 26th where Clark reports 708) | Open: roster-gettysburg-lists (Official Records reports, 1863 newspaper casualty lists, the Clark histories) |'
                % (fmt(t['names_gettysburg']), fmt(t['lines']), fmt(t['gettysburg_dated']), fmt(t['on_rolls_yes']), fmt(t['on_rolls_no']), fmt(t['on_rolls_unknown'])),
        'what': 'The Roster of North Carolina Troops prints each man who served in a unit at any time between 1861 and 1865, with his service history. A man is stated present at Gettysburg only where his printed remark says so (a casualty or capture at Gettysburg, a date of 1 to 3 July 1863 with the place). %s of %s lines name Gettysburg in the remarks (flag file member names_gettysburg, an OCR-tolerant match, a lower bound) and %s of these also print 1, 2 or 3 July 1863 (gettysburg_dated). The flag member on_rolls_july_1863 is inferred from printed enlistment and separation dates only: yes %s, no %s, unknown %s; it is no statement that the man was at Gettysburg. The earlier GAPS lines say that Moore under-annotates Gettysburg (G05, GN01: Moore names 512 or 515 Gettysburg casualties of the 26th North Carolina where Clark reports 708 killed, wounded and missing; the 4th North Carolina only 21 lines); this run counts %s for the 26th and %s for the 4th by a different rule; the difference is not examined.'
                % (fmt(t['names_gettysburg']), fmt(t['lines']), fmt(t['gettysburg_dated']), fmt(t['on_rolls_yes']), fmt(t['on_rolls_no']), fmt(t['on_rolls_unknown']), u['c-nc-26th-north-carolina-infantry']['names_gettysburg'], u['c-nc-4th-north-carolina-infantry']['names_gettysburg']),
        'evidence': 'flag files (names_gettysburg, gettysburg_dated, on_rolls_july_1863); rosters/GAPS.md G01, G05, GN01',
        'route': 'roster-gettysburg-lists: officers named in the Official Records, casualty and burial lists, Clark 1901 company and casualty lists (EG-ROS-NC-05)',
        'tier': 'documented only for the lines whose remark names Gettysburg; every other line is an inference from dates or unknown', 'markers': 'on_rolls_july_1863 is shown as "on the rolls in July 1863 (inferred from printed dates)", never as present'})
    g.append({
        'id': 'EG-ROS-NC-05', 'gid': 'G-NC05', 'category': 'source read in part (notes), not complete',
        'title': 'North Carolina: Clark, Histories of the Several Regiments and Battalions (1901): statements of strength and losses read as notes, a floor and not a count of what Clark prints',
        'line': '| G-NC05 | **North Carolina: Clark 1901 read as notes, not complete** (EG-ROS-NC-05): the five volumes (Internet Archive cu31924092908536, cu31924092908544, cu31924092908551, cu31924092908569, historiesofsever05clar and the five Emory copies as second scans) were fetched and pinned; %d notes (statements of strength, number present for duty, number taken into action, number left, losses; each with a verbatim quotation, its offset, the printed page, the chapter and author, and the result of looking for the same statement in the second scan: %d agree, %d were settled from page images, %d of those looked at) are in the ledger data2/sources/NC-CLARK-1901.json under notes; %d of the 41 units have at least one note and %d have none (Clark\'s chapter of such a unit prints no figure of that kind that the scan found, or none at all); the list is a floor: it was made by a scan of the chapters for a figure that names men, guns or losses near a mention of Gettysburg, every hit read in context, and a figure written in words or on a page the scan does not know is not in it; Clark\'s figures are statements of his authors and conflict (the 26th: 800, 820, 850, 885 present for duty on 30 June, 900) | work-items.json first task 2 of conf-nc; the ledger notes; clark-notes-check.json | Open: a second reading of the chapters of the %d units without a note (by eye, not by scan); the Appomattox parole list and the other lists in volume 5 are not Gettysburg lists and were not read |'
                % (t['clark_notes'], t['clark_notes_second_scan_agrees'], t['clark_notes_page_image'], t['clark_notes_page_image_viewed'], len(A['clark_units_with']), len(A['clark_units_without']), len(A['clark_units_without'])),
        'what': 'The work item names Clark (1901, five volumes) and asks (first task 2) for its present-for-duty figures as notes in the ledger, not as rows. The five texts were fetched from archive.org (each volume twice: the Cornell, Harvard or New York Public Library copy and the Emory copy; sha256 in the ledger and the manifest) and the chapters of the 41 units, the Gettysburg chapters of volume 5 and the brigade histories of volume 4 were scanned sentence by sentence for a figure that names men, guns or losses near a mention of Gettysburg; every hit was read in context and kept only where the sentence states a strength, a number present, a number taken into action, a number left or a loss of that unit (or the brigade, battalion or company named). %d notes result (%s). Each note is a statement of the author of the chapter or of the person he quotes; none is a muster, and none is a roster row. Where the two text layers read a figure differently or one could not be matched, the page was rendered from the Emory copy (300 ppi, transient) and read again with tesseract and by eye: %d notes carry such a check (%d looked at). The list is a floor: the scan cannot see a figure that is not in its pattern, and the units without a note (%s) may have a statement that it missed; the report says so unit by unit.' % (t['clark_notes'], ', '.join('%s %d' % (k, v) for k, v in sorted(S.get('clark_kinds', {}).items())), t['clark_notes_page_image'], t['clark_notes_page_image_viewed'], ', '.join(u[k]['designation'] for k in A['clark_units_without'])),
        'evidence': 'rosters/data2/sources/NC-CLARK-1901.json (notes, notes_units), GOVERNANCE/horde/ws-rosters/conf-nc/clark-notes-check.json, pipeline2/conf_nc/nc_clark_spec.py and nc_clark.py; rosters/reports/conf-nc.md section 1.3',
        'route': 'a reading by eye of the chapters of the units without a note, and of the passages of the other chapters of Clark that name a unit of this item; the strength workstream may use the notes as statements with their basis',
        'tier': 'documented (the quotation stands at the recorded offset and says what the claim says; the figure is the author\'s statement, not a muster)', 'markers': 'a strength shown from a note carries its author, chapter and page; a range from several notes shows all of them'})
    g.append({
        'id': 'EG-ROS-NC-06', 'gid': 'G-NC06', 'category': 'rolls printed partially or not at all by the source; prose notes not carried as lines',
        'title': 'North Carolina: rolls that Moore prints in part or not at all, and the prose notes inside the rolls',
        'line': '| G-NC06 | **North Carolina: partial rolls and notes** (EG-ROS-NC-06): %d printed notes (Moore: "Note.") inside the rolls are prose, not lines, and are not in the unit files (they are listed in the report and in diagnostics/<unit>.json): the 4th Infantry "very imperfectly reported", the 16th Infantry Company A roll (printed at the end of the regiment), Company F of the 18th, Companies A, E and F of the 2nd Cavalry, Company C of the 22nd, Company I of the 4th Cavalry, Companies C, D and E of the 2nd Battalion, one on Beaufort county in the Branch Artillery; small rolls: %s; the Charlotte Artillery (Company C of the Tenth Regiment) holds %d lines and one captain, and no printed note was found in its section; %s | the 41 unit files; Moore notes at the offsets listed in the report | Open: the muster rolls Moore did not have (NARA, owner-only) are the only source; nothing is added from memory |'
                % (len(A['notes']), small, u['c-nc-charlotte-artillery']['lines'], appendix_clause(A)),
        'what': 'Moore printed what the rolls of 1882 held. %d notes of his comment on the source of a roll (a roll not reported, found late, marked with the letter of another company or not obtained; counties or residences of the men not found; a county remark), listed in the report with their offsets; the company rolls under them are as short as printed: %s. The Charlotte Artillery is Company C of the Tenth Regiment (First Artillery) in Moore; the text prints %d lines and one captain for it and no printed note was found in its section (whether the roll is partial is not stated), and the identification rests on the Official Records index (documented) and on the counties of the men (inferred). The notes are prose: they are kept in diagnostics/<unit>.json with their offsets, never made into lines. %s.' % (len(A['notes']), small, u['c-nc-charlotte-artillery']['lines'], appendix_clause(A, True)),
        'evidence': 'GOVERNANCE/horde/ws-rosters/conf-nc/diagnostics/<unit>.json (notes), stats.json; rosters/reports/conf-nc.md section 5',
        'route': 'no open source holds the missing rolls; NARA compiled service records are owner-only and not used; a page-image reading of the notes would confirm their text',
        'tier': 'documented (the note says so); the missing men are unknown', 'markers': 'the unit page should say that the roll is partial where this report says so'})
    g.append({
        'id': 'EG-ROS-NC-07', 'gid': 'G-NC07', 'category': 'lines against the source\'s own totals',
        'title': 'North Carolina: lines per unit against Moore\'s printed totals (Recapitulation); the difference is not explained',
        'line': '| G-NC07 | **North Carolina: lines against Moore\'s totals** (EG-ROS-NC-07): Moore\'s Recapitulation (volume 4) prints the number of each regiment "all told"; all %d whole-regiment totals are read (%d of them from the page image, because both text layers damage the figure: %s), and the lines of the unit files differ from them by %+d to %+d (%d units fewer lines, %d more, %d equal); the cause of the differences is not determined (a man printed under two ranks, totals that count otherwise, entries the text layers lost; the file agrees with the second scan to a median of %d lines and with the earlier file to %d, with the printed total to %d) | recap.json (quote and offset in both scans, the page-image readings), stats.json | Open: a count of entries against Moore\'s total by company where Moore prints a company total; a page-image count of one regiment |'
                % (len(A['diffs']), len(A['recap_image']), ', '.join(u[k]['designation'] for k in A['recap_image'] if k in u) or 'the 1st, 2nd and 4th Infantry and the 33rd Infantry', A['diff_min'], A['diff_max'], A['n_neg'], A['n_pos'], A['n_zero'], A['med_second'], A['med_earlier'], A['med_printed']),
        'what': 'The Recapitulation at the end of volume 4 gives, for each regiment and battalion, the number of men "all told". For all %d whole-regiment units the figure is read: %d from the text layers (a figure is read only where a text layer prints it in full and the other layer agrees or damages it without changing its length) and %d from the page image (the Emory copy, printed pages 456 and 457, 300 ppi, looked at and read again with tesseract: the 1st Infantry 1,742, the 2nd 1,435, the 4th 1,483, the 33rd 1,600, which both text layers print damaged). The lines of the unit files differ from the printed totals by %+d to %+d lines (%d units with fewer lines, %d with more, %d equal). The median absolute difference between the lines of the file and the printed total is %d lines (%d units), against %d lines between the file and the second scan (%d units) and %d lines between the file and the earlier file (%d units): the three readings of the roll agree with each other more closely than with the printed totals, so the difference lies at least in part between the printed roll and Moore\'s own count, not in the cutting of lines alone; the cause is not determined.' % (len(A['diffs']), len(A['diffs']) - len(A['recap_image']), len(A['recap_image']), A['diff_min'], A['diff_max'], A['n_neg'], A['n_pos'], A['n_zero'], A['med_printed'], A['n_printed'], A['med_second'], A['n_second'], A['med_earlier'], A['n_earlier']),
        'evidence': 'GOVERNANCE/horde/ws-rosters/conf-nc/recap.json (quote and offset per scan; value_source and page_image for the four read from images), stats.json; rosters/reports/conf-nc.md section 1',
        'route': 'the cause of the differences needs a count by company of the lines against a printed company total where Moore prints one, and a page-image count of one regiment against its printed total',
        'tier': 'documented (the printed totals, quoted with offsets or read from the page image); the explanation of the differences is open', 'markers': 'the report prints the figures of both text layers and the reading from the image'})
    g.append({
        'id': 'EG-ROS-NC-08', 'gid': 'G-NC08', 'category': 'no strength range with a declared basis; identification of the artillery companies',
        'title': 'North Carolina: no registered strength range for these units (Clark gives statements for some); four artillery companies identified through the Official Records index',
        'line': '| G-NC08 | **North Carolina: strengths and identifications** (EG-ROS-NC-08): the registry holds no strength (history/units.json: strength null for the %d registry ids of these units, %d with a strength); the baseline order of battle gives one second-hand figure for %d of 41 units and none for %s; Clark (1901) gives statements of a regiment\'s strength for %d units (%s; the notes of the ledger, EG-ROS-NC-05), which conflict where several exist; Moore prints the four artillery companies as Companies A, C and D of the Tenth Regiment (First Artillery) and Company F of the Fifth Battalion Light Artillery; each is identified through the Official Records pt. 2 index and the captain or the counties (the identification of the Rowan Artillery rests on the captain and on the counties of 168 men) | baseline/dist/data/oob; OR 27 pt. 2 index quotes in the report and in nc_units.py; the Clark notes | Open: strength workstream (the Clark notes with their basis, the Official Records); OOB agent: rows for the four cavalry regiments, Branch and Charlotte |'
                % (A['registry_history_ids'], A['registry_with_strength'], A['n_units'] - len(A['no_baseline']), ', '.join(u[k]['designation'] for k in A['no_baseline']), len(A['clark_strength_units']), ', '.join(u[k]['designation'] for k in A['clark_strength_units'])),
        'what': 'The strengths the Battle Theatre needs are ranges with a declared basis. The registry (history/units.json) holds none for the %d registry ids of the 41 units (%d with a strength); the baseline order of battle gives one second-hand figure (Busey and Martin as the earlier families recorded it) for %d units and none for %s. Clark\'s regimental histories give statements of the strength of a regiment at Gettysburg for %d units (%s): the report section 1.3 lists them with the author, the chapter and the page, and they conflict where there are several (for the 26th: 800, 820, 850 and 900 men taken into the fight, 885 present for duty on 30 June 1863 by the muster rolls). The unit files hold whole-war rolls, so lines are not strengths. The four artillery units are companies of Moore regiments or battalions: the Official Records index names them ("Manly\'s (B. C.) Artillery. See North Carolina Troops, Confederate, 1st Regiment, Battery A" and the like, quoted in the report) and Moore\'s captain (Manly, Reilly, Latham) or the counties of the men (Charlotte: Mecklenburg) fit; the identification of each company is documented by the index line and inferred where it rests on the captain or the counties.' % (A['registry_history_ids'], A['registry_with_strength'], A['n_units'] - len(A['no_baseline']), ', '.join(u[k]['designation'] for k in A['no_baseline']), len(A['clark_strength_units']), ', '.join(u[k]['designation'] for k in A['clark_strength_units'])),
        'evidence': 'rosters/data2/units.json (registry), baseline/dist/data/oob, nc_units.py IDENT, the ledger NC-CLARK-1901.json (notes); rosters/reports/conf-nc.md sections 1 and 5',
        'route': 'strength workstream (the Clark notes and the Official Records); the OOB agent adds baseline rows for the four cavalry regiments, the Branch and the Charlotte Artillery',
        'tier': 'documented (OR index line; the Clark statements as statements of their authors) / inferred (captain, counties)', 'markers': 'identification text in the unit page; strengths shown as a range with the basis, none invented'})
    return g


def register_text(e):
    return '''# %(id)s: %(title)s

| Field | Content |
|---|---|
| ID | %(id)s |
| Requirement IDs | OA03 (complete roster section of both armies, source and rights per name); R22; Law clauses 3, 4 and 7 |
| Category | %(category)s |
| Description | %(what)s |
| Why literal 100%% is not possible or blocked | %(why)s |
| Evidence searched | %(evidence)s |
| Autonomous substitute applied | The unit files stand with every line exactly as the text layer prints it and with the damage marked in the flag files; nothing is repaired, merged or invented; the difference or the missing part is listed, not resolved. |
| Strongest evidence-based reconstruction | The unit files, the flag files, the reconciliation and the report as they are. |
| Confidence tier | %(tier)s |
| Competing values | the primary reading of each unit (the scan with the higher measured score); the second scan; the earlier roll file (where the entry concerns readings) |
| Product marking | %(markers)s. |
| Visual and audio impact | None. |
| Review status | internal review only (DEC-006: no public review label) |
| Owner decision requested | none for the data; owner-only acts: none (no account, licence or payment is needed for the route named below) |
| Agent recommendation | %(route)s. |
| Status | open (proposed by bt-rosters / conf-nc; not yet in register/) |
| Owner decision and date | (filled only from the Decision Log) |
''' % dict(e, why=e.get('why', 'The record or the text layer does not give it; the route named under Agent recommendation is the only way to close it, and it was not run in this pass.'))


DD = '''
## Added 2026-11-16 by bt-rosters / conf-nc: the North Carolina roster files (DELEGATED, reversible by the owner, not owner decisions; detail in rosters/reports/conf-nc.md)

| id | question | options | chosen default | evidence | tier | reversibility | product marking |
|---|---|---|---|---|---|---|---|
| DD-ROS-NC-01 | Which of the two Internet Archive scans of each volume of Moore (1882) is the reading of a unit file | always the scan of the work item; always the Emory copy; per unit the scan with the better measured score (rows after pages held twice are taken out, minus the rows of company letters the other scan does not have, minus 15 per heading read by the sequence or defective) | The third, one scan per unit: %(primary_counts)s; the other scan is the second reading of the reconciliation only; no line of a unit file is taken from it (no supplement rows: pages that a scan holds twice make "only in the other scan" runs unreliable) | build-summary.json (score and reason per unit), reconciliation.json | measured | rerun nc_build.py with another rule; the unit file is rebuilt from the cached parses in seconds | the segment names the text id; the pointer file says which scan each unit is read from |
| DD-ROS-NC-02 | Whether a damaged name or date is repaired from the other scan or the earlier file | repair from the better reading; keep the primary text layer and mark the damage | The second: no line is repaired, merged or completed (Law 4); every damage pattern that matches is a code in the flag file; the one name read from a page image (2nd North Carolina Cavalry, printed p. 116: Walker, Jesse M.) is recorded in the flag file member page_image_readings with its evidence, and the unit file keeps the text layer | flag files; nc_flags.py PAGE_IMAGE_READINGS; request note bt-rosters-staging-copy-audit-ai-token.md | documented (the page image, for that name only) | none needed; add readings to PAGE_IMAGE_READINGS | flag N and the page reading in the flag file |
| DD-ROS-NC-03 | How the one word that the packer's copy audit rejects in these files is handled (the two capital letters AI in the name "Walker, Jesse AI.", row 156 of the 2nd North Carolina Cavalry, and in its normalised name) | change the name to the printed reading; drop the row; keep the text layer and ask the packer for a reviewed allowance for that one name | The third: the row stays as the text layer prints it (a line must be found at its offset in the pinned text; a name is never respelled to pass an audit); the print reads "M." (page image), recorded in the flag file; the packer is asked for one reviewed allowance for the word AI. in the name field of that row and in the normalised-name list of that flag file (the answer is appended to bt-rosters-staging-copy-audit-ai-token.md) | page image of leaf 130 of rosterofnorthcar02nort (looked at, not stored); the second scan reads "Jesse  M." at offset 383417 of NC-MOORE-1882.2; copy-audit.json | documented | the allowance is the packer's; the unit file is unchanged | none |
| DD-ROS-NC-04 | The four artillery units of the work item are companies inside Moore regiments or battalions: which Moore company is each | by the captain's name alone; by the counties of the men alone; through the Official Records index line that names the battery and then Moore's captain or counties | The third: Battery A of the 1st North Carolina Artillery is Company A of the Tenth Regiment (captain Manly), the Rowan Artillery Company D (captain Reilly), the Charlotte Artillery Company C, the Branch Artillery Company F of the Fifth Battalion Light Artillery (captain Latham); the unit file of each holds the lines of that company only; the index lines are quoted in the report | the OR 27 pt. 2 index lines quoted in nc_units.py IDENT and in the report (the Charlotte entries stand on printed pp. 1009 and 1012), found with tools/bt/or27_find.py | documented (index line); inferred (captain, counties) | change the company letter in nc_units.py and rebuild | the unit page states the identification and its basis |
| DD-ROS-NC-05 | How Moore's printed totals (Recapitulation) are read for the comparison with the lines | read every figure; read a figure only where a text layer prints it in full or both layers agree; do not read | The second, then the third for what the second leaves: a figure is read from the text layers only where it is printed in full in one layer and the other layer agrees or damages it without changing its length (a figure that lost its leading "1," in one layer is read when the other layer prints the full figure); a figure damaged or short in both layers (1st, 2nd, 4th and 33rd Infantry) is read from the page image (volume 4 of the Emory copy, printed pages 456 and 457, 300 ppi, looked at and read again with tesseract: 1,742; 1,435; 1,483; 1,600); both printed strings, the quote and the offset stay in recap.json together with the page-image reading and the way it was made | recap.json (value_source, page_image); nc_recap.py PAGE_IMAGE | documented (quote with offset; the page image for the four) | rerun nc_recap.py with another rule or without PAGE_IMAGE | the report prints the figures of both layers and the reading from the image |
| DD-ROS-NC-06 | How a company heading that the text layer damaged is read | the printed letter as it stands; the letter the sequence of headings gives; empty | The sequence gives the letter where the printed letter is one the scan confuses with the expected letter or is no letter (flag C, listed in company_inferred); a clean letter further on in the alphabet is taken as printed (the 16th and 21st Infantry have a Company M and no Company L in all three readings); a clean letter that no heading above had is taken as printed (the 16th Infantry Company A stands at the end of the regiment in Moore); a company roll Moore marks "Missing" has no lines | flag files (company_inferred); nc_parse.py | inferred (sequence) / documented (clean letter) | edit the rules in nc_parse.py and rebuild | lines under an inferred letter carry the flag C |
| DD-ROS-NC-07 | Whether the parser of the first build is corrected on the evidence of the review of the files | leave the files as built and list the defects; correct the rules and rebuild | The second: four narrow rules were corrected in two rounds and the 41 files rebuilt from the same pinned texts: (1) a surname split by the scan is not read where its second part is an abbreviation ("Wilkes co.; cm." is a county, not a split surname), (2) a given-name abbreviation (Wm., Thos., Jos., Geo., Alex., Benj., Robt., Fred., Jas., Zach., Theo., Jord., Matt.) may begin a head after "<County> co." or "Regiment." where a rank phrase or a strict marker follows the name, (3) the walk back from a strict marker inside remarks stops at a county abbreviation that carries a mark (any damaged "co"), (4) a lower-case word of at most three letters that ends with a full stop or a semicolon is no surname ("Burke eo.;" is a county whose abbreviation the scan damaged, the promotion that follows belongs to the entry before), while one that ends with a comma ("Alf red," "Rough ton,") is the second half of a surname the scan split and stays a head (a first form of rule 4 without the comma distinction took 12 true heads out of the files and was refined after the change list of that build was read). Before the first correction: %(county_before)s rows whose name was a county phrase and %(given_before)s rows whose remarks ended with the first given name of the next head; after the final build: %(county_after)s and %(given_after)s. Rows %(rows_before)s to %(rows_after)s; %(blocks)s changed blocks in %(units_changed)s units, each listed with the printed names and the first 60 characters of the remarks of both sides. No printed word is changed: every line is found at its offset in the rebuilt files (0 name, 0 remark and 0 page defects) | GOVERNANCE/horde/ws-rosters/conf-nc/changes-after-review.json; nc_diff.py | measured | the rules are in nc_parse.py; the first build is not kept in the tree (the change list is) | flag H on every head cut by a rule that is a reading |
| DD-ROS-NC-08 | How the statements of Clark (1901) about the strength and losses of the units are carried | as roster rows; as notes in the source ledger; not at all (a lead) | The second, as the work item asks (first task 2): notes in the ledger data2/sources/NC-CLARK-1901.json (member notes), never rows; each note holds the quotation as the text layer prints it (white space joined), its offset and end in the pinned text, the printed page of the leaf, the chapter and its author, the figures as printed with a reading of each as a number (None where the layer damages the figure), the comparison with the second scan (the Emory copy) and, where the scans read a figure differently or one could not be matched, a page-image check (300 ppi, transient; "viewed" = looked at and read with tesseract; "tesseract" = read with tesseract only); a note states the figure as the statement of the named author, never as fact; a date or figure the text layer damages is quoted as printed and the reading from the image is recorded beside it; the list is a floor (the scan of nc_clark_spec.py) and the units without a note say so in the report | the ledger notes; clark-notes-check.json; nc_clark.py | documented (the quotation) | delete the member notes of the ledger; no unit file is touched | strengths shown from a note carry author, chapter and page |
| DD-ROS-NC-09 | Which of Clark's strength figures for a regiment is shown as its strength | one figure (the muster-roll figure, or the highest, or the lowest); all of them as a range with the basis of each; none | The second: every regiment-level figure of strength that a note carries (strength_figure) is shown, with its author, chapter and page, and the low and high of them as the range of the statements (no figure is picked: the 26th has 800, 820, 850, 885 and 900 from five authors); a range from one statement is that statement; a unit with no note has no strength from Clark | the ledger notes (strength_figure); stats.json (clark.strength_low, strength_high) | documented as statements; the range is Computed from them | none needed | the unit page shows the range and each statement |
'''


def main():
    S = jload(os.path.join(WS, 'stats.json'))
    A = analysis(S)
    audit = None
    p = os.path.join(WS, 'copy-audit.json')
    if os.path.exists(p):
        audit = jload(p)
    G = gaps(S, A, audit)
    os.makedirs(PROP, exist_ok=True)
    with open(os.path.join(WS, 'gap-lines.md'), 'w', encoding='utf-8') as f:
        f.write('\n## North Carolina (Confederate), work item conf-nc, added 16 November 2026 (EG-ROS-NC-01 to -08; proposed entries under GOVERNANCE/horde/ws-rosters/proposed-register/)\n\n| ID | gap | what was tried | route |\n|---|---|---|---|\n')
        for e in G:
            f.write(e['line'] + '\n')
    for e in G:
        with open(os.path.join(PROP, 'conf-nc-%s.md' % e['id']), 'w', encoding='utf-8') as f:
            f.write(register_text(e))
    pc = collections.Counter(u['primary_text'] for u in S['units'].values() if u.get('primary_text'))
    ptr = jload(os.path.join(L.R2, 'sources', 'conf-nc.json'))
    labels = {x['text_id']: '%s (volume %s, %s, Internet Archive %s)' % (x['text_id'], x['volume'].split()[0], x['contributor'], x['identifier']) for x in ptr['sources']}
    primary_counts = '; '.join('%d unit%s from %s' % (v, '' if v == 1 else 's', labels.get(k, k)) for k, v in sorted(pc.items()))
    ch = jload(os.path.join(WS, 'changes-after-review.json'))['totals'] if os.path.exists(os.path.join(WS, 'changes-after-review.json')) else {}
    g = lambda k: fmt(ch[k]) if k in ch else 'n/a'
    with open(os.path.join(WS, 'delegated-decisions.md'), 'w', encoding='utf-8') as f:
        f.write(DD % {'primary_counts': primary_counts, 'county_before': g('county_name_rows_before'), 'county_after': g('county_name_rows_after'), 'given_before': g('given_name_abbreviation_before'),
                      'given_after': g('given_name_abbreviation_after'), 'rows_before': g('rows_before'), 'rows_after': g('rows_after'), 'blocks': g('blocks'), 'units_changed': g('units_changed')})
    print('wrote gap-lines.md, delegated-decisions.md and %d proposed entries' % len(G))
    return 0


if __name__ == '__main__':
    sys.exit(main())

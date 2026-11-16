"""The report of the conf-nc work item: rosters/reports/conf-nc.md.  Every number is computed from files (stats.json, recap.json, reconciliation.json, copy-audit.json, the pointer file,
the unit files and the pinned texts, verify-unit-run.out); nothing is typed.  Section order of reports/union-vt.md (PRODUCTION-PLAN 9.3 item 4).

    python3 -I nc_stats.py && python3 -I nc_report.py        (nc_gaps.py supplies the gap texts)
"""
import os, sys, re, json, gzip, collections, statistics, glob, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import nc_lib as L, nc_units as U, nc_gaps as G, nc_flags as F
import r2lib as R

WS = L.WS
fmt = G.fmt


def jload(p):
    with open(p, encoding='utf-8') as f:
        return json.load(f)


def pct(a, b):
    return '%.1f' % (100.0 * a / b) if b else '0.0'


def plural(n, one, many=None):
    return '%s %s' % (fmt(n), one if n == 1 else (many or one + 's'))


def verify_results():
    p = os.path.join(WS, 'verify-unit-run.out')
    if not os.path.exists(p) or os.path.getsize(p) == 0:
        return None
    out = {}
    dec = json.JSONDecoder()
    s = open(p, encoding='utf-8').read()
    i = 0
    while i < len(s):
        while i < len(s) and s[i] in ' \r\n':
            i += 1
        if i >= len(s):
            break
        o, i = dec.raw_decode(s, i)
        out[o['unit']] = o
    return out


def roll_position(units):
    """Per unit: first and last leaf, first and last printed page, lines without a printed page, from the unit file and the page map of the pinned text."""
    pos = {}
    maps = {}
    for key, u in units.items():
        path = os.path.join(L.ROOT, u['file'])
        head, segs, meta = R.read_unit(path)
        tid = segs[0][0]['t']
        if tid not in maps:
            maps[tid] = L.load(tid)[1]
        pm = maps[tid]
        rows = [x for sg, rs in segs for x in rs]
        leaves = [pm.leaf(x[5]) for x in rows]
        pages = [x[4] for x in rows if x[4] is not None]
        nul = [pm.leaf(x[5]) for x in rows if x[4] is None]
        pos[key] = {'leaf_first': min(leaves), 'leaf_last': max(leaves), 'n_leaves': len(set(leaves)), 'page_first': min(pages) if pages else None, 'page_last': max(pages) if pages else None,
                    'null_leaves': (min(nul), max(nul)) if nul else None}
    return pos


def table(head, rows, align=None):
    out = ['| ' + ' | '.join(head) + ' |', '|' + '|'.join('---' for _ in head) + '|']
    for r in rows:
        out.append('| ' + ' | '.join(str(c) for c in r) + ' |')
    return out


def main():
    S = jload(os.path.join(WS, 'stats.json'))
    units, tot = S['units'], S['totals']
    A = G.analysis(S)
    gaps = G.gaps(S, A)
    recap = jload(os.path.join(WS, 'recap.json'))['entries']
    rec = jload(os.path.join(WS, 'reconciliation.json'))['units']
    ptr = jload(os.path.join(L.R2, 'sources', 'conf-nc.json'))
    audit = jload(os.path.join(WS, 'copy-audit.json')) if os.path.exists(os.path.join(WS, 'copy-audit.json')) else None
    ver = verify_results()
    summ = jload(os.path.join(WS, 'build-summary.json'))['units']
    pos = roll_position(units)
    keys = [u[0] for u in U.UNITS]
    D = lambda k: units[k]['designation']
    n = len(keys)
    arms = collections.Counter(units[k]['arm'] for k in keys)
    flag_bytes = sum(os.path.getsize(os.path.join(L.D2, 'confederate', 'nc', k[len('c-nc-'):] + '.flags.json.gz')) for k in keys)
    prim = collections.Counter(units[k]['primary_text'] for k in keys)
    rows_total = tot['lines']
    whole = [k for k in keys if units[k]['moore']['company'] == '']
    o = []
    w = o.append

    # ---------------------------------------------------------------- title
    w('# North Carolina (Confederate): rosters of the %d units at Gettysburg (work item conf-nc, OA03)' % n)
    w('')
    w('Written %s by the roster workstream (bt-rosters / conf-nc). Evidence labels as in `PLAN.md`: **Measured** (a command run for this report produced it), **Documented** (a source text says it; the source is named), **Inferred** (a stated rule on printed text), **Not run**. Every number below is computed by `pipeline2/conf_nc/nc_report.py` (with `nc_stats.py` and `nc_gaps.py`) from the unit files, the flag files, the pinned texts and the work files under `GOVERNANCE/horde/ws-rosters/conf-nc/`; none is typed.' % time.strftime('%d %B %Y', time.gmtime()).lstrip('0'))
    w('')

    # ---------------------------------------------------------------- 0 summary
    w('## 0. Summary')
    w('')
    w('* **%d unit files** under `rosters/data2/confederate/nc/` (%d infantry regiments and battalions, %d cavalry regiments, %d batteries), **%s lines in all** (%s raw bytes, %s gzipped), format `roster2/2` (`pipeline2/r2lib.py`), each with a flag file `<unit>.flags.json.gz` (%s bytes in all). One line per name entry of the printed roll, exactly as the text layer prints it (name, rank, remarks), with the printed page and the character offset of the name in the pinned text. **No unit is a gap**: all %d units of the work item have a file.'
      % (n, arms['infantry'], arms['cavalry'], arms['artillery'], fmt(rows_total), fmt(tot['raw_bytes']), fmt(tot['gz_bytes']), fmt(flag_bytes), n))
    w('* **One printed source is parsed**: John W. Moore, *Roster of North Carolina Troops in the War between the States* (Raleigh, 1882), four volumes, each read in **two Internet Archive scans** (8 texts, `NC-MOORE-1882.<vol>` and `.<vol>~b`; section 3). For each unit the scan with the better measured score is the reading of the file (%s); the other scan is the second reading of the reconciliation only, and **no line of a unit file is taken from it**. The roll of each unit as Moore prints it: the field and staff and every company (officers, non-commissioned officers and privates), under the company the heading gives.'
      % '; '.join('%d from %s' % (v, k) for k, v in sorted(prim.items())))
    w('* **Not parsed**: the %d printed notes inside the rolls (Moore: "Note.", prose, listed in section 5), the %s tokens of text between a section heading and the first roll heading (the list of abbreviations and the like, counted in `diagnostics/<unit>.json`), Moore\'s Recapitulation (read only for the printed totals of section 1), and the **Appomattox parole list** and the other lists of Clark volume 5 (not Gettysburg lists). **Clark\'s histories of 1901 are read for notes, not for rows** (section 1.3, gap EG-ROS-NC-05): %d notes (statements of strength, number present for duty, number taken into action, number left and losses, each with a verbatim quotation and its offset) are in the ledger `data2/sources/NC-CLARK-1901.json`; %d of the 41 units have a note, %d have none. No name, date or figure is invented, completed or repaired.' % (len(A['notes']), fmt(sum((u.get('preamble_tokens') or 0) for u in units.values())), tot['clark_notes'], tot['clark_units_with_notes'], tot['clark_units_without_notes']))
    w('* **Checks run (Measured)**: the builder asserted every line against the pinned text before writing it (name tokens at the recorded offset, remark tokens in order inside the leaf, printed page of the leaf): %s lines, %d name defects, %d page defects, %d lines whose remarks are not found. `pipeline2/verify_unit.py` on the %d files: %s. Reconciliation with the second scan of the volume (all %d units) and with the earlier roll files of the C-NCLA family (%d units): every difference is counted and listed in `differences-<unit>.csv`, none is resolved (section 4). Page images (rendered from the text PDFs, transient) were looked at: one damaged name (section 5, item 12), the four Moore totals that both text layers damage (section 1.1) and the pages of %d Clark notes (section 1.3). **Not run**: the independent sample of page images (R-G9; roster-qa), a second reading of the damaged lines from page images, an eye reading of the Clark chapters of the units without a note, any browser or timing run.'
      % (fmt(rows_total), sum(u['verify']['v1'] for u in units.values()), sum(u['verify']['v3'] for u in units.values()), sum(u['verify']['remarks_not_found'] for u in units.values()), n,
         ('%d of %d files ok, %d name and %d page defects (`verify-unit-run.out`)' % (sum(1 for v in ver.values() if v['ok']), len(ver), sum(v['v1_name_defects'] for v in ver.values()), sum(v['v3_page_defects'] for v in ver.values()))) if ver and len(ver) == n else 'not finished when this report was written',
         n, sum(1 for k in keys if rec[k].get('earlier')), tot['clark_notes_page_image']))
    w('* **No label of presence** is written into any line (DD-ROS-01). Derived marks live in the flag files, never in the lines: `ocr_uncertain` (%s of %s lines match a damage pattern, section 2), `on_rolls_july_1863` (inferred from printed dates only: %s yes, %s no, %s unknown), `names_gettysburg` (%s lines whose remarks name Gettysburg, a lower bound) and `gettysburg_dated` (%s of these also print 1, 2 or 3 July 1863). Moore prints every man who served in a unit at any time of the war; a man is stated present at Gettysburg only where his remark says so (gap EG-ROS-NC-04).'
      % (fmt(tot['ocr_uncertain']), fmt(rows_total), fmt(tot['on_rolls_yes']), fmt(tot['on_rolls_no']), fmt(tot['on_rolls_unknown']), fmt(tot['names_gettysburg']), fmt(tot['gettysburg_dated'])))
    w('* **Four artillery units are companies inside Moore sections** and are filed to their own file by the company letter: Battery A of the 1st North Carolina Artillery (Moore: Tenth Regiment, Company A), the Rowan Artillery (Company D), the Charlotte Artillery (Company C) and the Branch Artillery (Company F of the Fifth Battalion Light Artillery); each identification is quoted from the Official Records index in section 5, item 11.')
    w('* **Owner-only steps: none.** The page-image route (`pipeline2/page_image.py`, archive.org /cors/) needs no host to be added; no account, licence or payment is involved. Eight gaps are proposed (section 6).')
    w('')

    # ---------------------------------------------------------------- 1 lines per unit
    w('## 1. Lines per unit against the strength')
    w('')
    w('"Strength" is the value of the baseline order of battle (`baseline/dist/data/oob`, second hand, from Busey and Martin as the earlier families recorded it; GAPS G15). **No registered strength range with a declared basis exists for these units**: `history/units.json` holds a strength for %d of the %d registry ids of the %d units, and the kit tables carry none for the cavalry and the batteries. The baseline has no row for %s. Clark (1901) gives statements of a regiment\'s strength at Gettysburg for %d units (section 1.3, as notes of the ledger, with the author of each; they conflict where there are several). "Printed total" is Moore\'s own count of the men of the regiment or battalion "all told", read from the Recapitulation at the end of volume 4 (`recap.json`: the quoted line and its offset in both scans, section 4); for a company of a regiment (the four batteries) the printed total is that of the **whole regiment or battalion** and is not comparable with the lines. A unit file holds the roll of the whole war, as Moore prints it; the strength is the men present on the field: the two are not the same kind of number.'
      % (A['registry_with_strength'], A['registry_history_ids'], n, ', '.join(D(k) for k in A['no_baseline']), len(A['clark_strength_units'])))
    w('')
    w('### 1.1 Lines, the printed total and the two other readings')
    w('')
    rows = []
    for k in keys:
        u = units[k]
        pt = u.get('printed_total')
        whole_unit = u['moore']['company'] == ''
        if pt and pt['value'] is not None:
            ptv = fmt(pt['value']) + ('' if whole_unit else ' (whole %s)' % ('regiment' if u['moore']['kind'] == 'regiment' else 'battalion')) + (' (page image)' if recap['%s-%s' % (u['moore']['number'], u['moore']['kind'])].get('value_source') == 'page image' else '')
            diff = ('%+d' % (u['lines'] - pt['value'])) if whole_unit else 'n/a'
        elif pt:
            ptv = 'not read (%s)' % '; '.join('%s' % (f if f is not None else 'no figure') for f in pt['figures'].values())
            diff = 'n/a'
        else:
            ptv, diff = 'none', 'n/a'
        r = rec[k]
        ea = r.get('earlier')
        rows.append([D(k), fmt(u['baseline']['strength']) if u['baseline']['strength'] is not None else 'no row', ptv, fmt(u['lines']), diff, fmt(r['second_scan']['lines']), (fmt(ea['lines']) if ea else 'no earlier file'),
                     '%.2f' % (u['lines'] / u['baseline']['strength']) if u['baseline']['strength'] else '-'])
    o.extend(table(['unit', 'strength (baseline OOB)', 'printed total (Recapitulation)', 'lines', 'lines minus printed total', 'lines of the second scan', 'lines of the earlier file', 'lines / strength'], rows))
    w('')
    pos_d = sorted(A['diffs'].items(), key=lambda kv: -abs(kv[1]))[:6]
    w('Reading the table. **Lines per strength: %s to %s** (units with a baseline strength): the rolls are whole-war and the baseline is the men present, so the ratio is the length of the roll against the strength and not a loss. **Lines against the printed totals**: %d of the %d whole-regiment totals are read (%d units with fewer lines than printed, %d with more, %d equal; the extremes are %s); %d of these totals are **read from the page image** because both text layers damage or shorten the figure (%s: marked "page image" in the table; the printed strings of the text layers are in `recap.json`). The median absolute difference between the lines and the printed total is %d lines (%d units), against %d between the file and the second scan (%d units) and %d between the file and the earlier file (%d units): the three readings of the roll agree with each other more closely than with Moore\'s total. The cause is **not determined** (a man is printed under each rank he held; Moore\'s count may count otherwise; entries may be lost in all text layers); nothing is added or removed to meet a total (gap EG-ROS-NC-07).'
      % ('%.2f' % min(units[k]['lines'] / units[k]['baseline']['strength'] for k in keys if units[k]['baseline']['strength']), '%.2f' % max(units[k]['lines'] / units[k]['baseline']['strength'] for k in keys if units[k]['baseline']['strength']),
         len(A['diffs']), len(whole), A['n_neg'], A['n_pos'], A['n_zero'], ', '.join('%s %+d' % (D(k), v) for k, v in pos_d), len(A['recap_image']), ', '.join(D(k) for k in A['recap_image']),
         A['med_printed'], A['n_printed'], A['med_second'], A['n_second'], A['med_earlier'], A['n_earlier']))
    w('')
    w('### 1.2 Flags and marks per unit (the flag files; derived, never in a line)')
    w('')
    rows = []
    for k in keys:
        u = units[k]
        f = u['flags']
        rows.append([D(k), fmt(u['lines']), fmt(u['ocr_uncertain']), f.get('N', 0), f.get('H', 0), f.get('C', 0), f.get('R', 0), f.get('Y', 0), f.get('G', 0), f.get('M', 0), f.get('W', 0), u['names_gettysburg'], u['gettysburg_dated'],
                     '%s / %s / %s' % (fmt(u['on_rolls']['yes']), fmt(u['on_rolls']['no']), fmt(u['on_rolls']['unknown']))])
    rows.append(['**total**', fmt(rows_total), fmt(tot['ocr_uncertain']), fmt(tot['flag_N']), fmt(tot['flag_H']), fmt(tot['flag_C']), fmt(tot['flag_R']), fmt(tot['flag_Y']), fmt(tot['flag_G']), fmt(tot['flag_M']), fmt(tot['flag_W']),
                 fmt(tot['names_gettysburg']), fmt(tot['gettysburg_dated']), '%s / %s / %s' % (fmt(tot['on_rolls_yes']), fmt(tot['on_rolls_no']), fmt(tot['on_rolls_unknown']))])
    o.extend(table(['unit', 'lines', 'ocr_uncertain', 'N', 'H', 'C', 'R', 'Y', 'G', 'M', 'W', 'remark names Gettysburg', 'event dated 1-3 July 1863', 'on rolls yes / no / unknown'], rows))
    w('')
    w('Where the roll sits in the volume (leaf = image number of the Internet Archive item, 0-based; page = the printed page number from the item\'s own page-number file, **not read from an image**). The section of a unit begins at the printed heading and ends at the next heading of the same kind (`nc_sections.py`; three headings that a text layer garbled beyond reading are set by reviewed overrides, with the printed page of the heading: the 57th Regiment in `NC-MOORE-1882.3` (printed page 608), the 39th Regiment in `NC-MOORE-1882.3~b` (printed page 83) and the 3rd Battalion in `NC-MOORE-1882.4~b` (printed page 231); the last two end the section that precedes them in that text).')
    w('')
    rows = []
    for k in keys:
        u = units[k]
        p = pos[k]
        cc = u['company_counts']
        letters = ''.join(c for c in cc if c != 'FS')
        rows.append([D(k), u['primary_text'], '%d - %d (%d leaves)' % (p['leaf_first'], p['leaf_last'], p['n_leaves']),
                     ('%s - %s' % (p['page_first'], p['page_last'])) if p['page_first'] is not None else 'none',
                     ('%d (leaves %d - %d)' % (u['page_null'], p['null_leaves'][0], p['null_leaves'][1])) if u['page_null'] else '0', letters or '-', cc.get('FS', 0)])
    o.extend(table(['unit', 'text read', 'roll leaves (first - last)', 'printed pages of the roll', 'lines without a printed page', 'company letters', 'field and staff lines (FS)'], rows))
    w('')

    # ---------------------------------------------------------------- 1.3 Clark
    cl = jload(os.path.join(L.D2, 'sources', 'NC-CLARK-1901.json'))
    cn = cl['notes']
    KA = {'present_for_duty': 'P', 'taken_into_action': 'T', 'remaining_after': 'R', 'casualties': 'L', 'strength_other': 'S', 'identification': 'I'}

    def short_chapter(x):
        return x['chapter']

    w('### 1.3 Statements of strength and losses in Clark (1901), as notes of the ledger')
    w('')
    w('Clark, *Histories of the Several Regiments and Battalions from North Carolina in the Great War, 1861-\'65* (published by the State, Raleigh and Goldsboro, 1901, five volumes), is read here for **statements, not for names**: work item first task 2 asks for its present-for-duty figures as notes in the ledger, not as rows. '
      '`data2/sources/NC-CLARK-1901.json` pins the ten texts (each volume twice, sha256) and holds, under `notes`, **%d notes** (%s). A note is the quotation exactly as the text layer prints it (white space joined), its offset and end in the pinned text, the printed page, the chapter and its author, the figures as printed with a reading of each as a number, the comparison with the second scan and, where the scans read a figure differently, a page-image check (%d notes; %d looked at by eye, the rest read with tesseract only). '
      '**A note is a statement of the author of the chapter or of the person he quotes, not a muster**; where authors disagree every statement stays and none is made the default (DD-ROS-NC-08, DD-ROS-NC-09). The list is a **floor**: the chapters of the 41 units, the Gettysburg chapters of volume 5 and the brigade histories of volume 4 were scanned sentence by sentence for a figure that names men, guns or losses near a mention of Gettysburg (the scan is `nc_clark.py`; the counts per unit are in the table), every hit was read in its context and kept only where the sentence states a strength, a number present, a number taken into action, a number left or a loss of that unit (or of the brigade, battalion or company named); a figure the scan does not know is not in the list (gap EG-ROS-NC-05). Kinds: P present for duty, T taken into action or in line, R left or present after the fight, L losses, S other strength (the crossing of the Potomac, guns), I identification of a battery (no figure).'
      % (len(cn), ', '.join('%s %d' % (k, v) for k, v in sorted(collections.Counter(x['kind'] for x in cn).items())), tot['clark_notes_page_image'], tot['clark_notes_page_image_viewed']))
    w('')
    rows = []
    for k in keys:
        u = units[k]
        c = u['clark']
        mine = [x for x in cn if k in x['units']]
        kinds = collections.Counter(KA[x['kind']] for x in mine)
        st = [x for x in mine if x.get('strength_figure') is not None]
        sc = c['scan'] or {}
        rows.append([D(k), len(mine), ' '.join('%s%d' % (a, kinds[a]) for a in 'PTRLSI' if kinds[a]) or '-',
                     '; '.join('%s: %s' % (x['id'], fmt(x['strength_figure'])) for x in st) or 'none',
                     ('%s - %s' % (fmt(c['strength_low']), fmt(c['strength_high']))) if c['strength_low'] is not None and c['strength_low'] != c['strength_high'] else (fmt(c['strength_low']) if c['strength_low'] is not None else 'none'),
                     fmt(u['lines']), '; '.join(c['chapters']) or '-', '%s / %s / %s' % (fmt(sc.get('sentences', 0)), fmt(sc.get('figure_sentences', 0)), fmt(sc.get('figure_sentences_with_men_or_losses', 0)))])
    o.extend(table(['unit', 'notes', 'kinds', 'regiment-level strength statements (note: figure)', 'range of the statements', 'lines of the file', 'Clark chapter(s) scanned', 'sentences / with a figure near Gettysburg / with a figure naming men or losses'], rows))
    w('')
    st_notes = [x for x in cn if x.get('strength_figure') is not None]
    w('**The statements of a regiment\'s strength** (every note with a regiment-level strength figure; the range in the table is the lowest and the highest of them, Computed; nothing is picked):')
    w('')
    rows = []
    for x in st_notes:
        rows.append([x['id'], D(x['units'][0]), fmt(x['strength_figure']), x['kind'], short_chapter(x), x['pg'] if x['pg'] is not None else 'no printed page', x['when'][:60], 'both layers' if x['second_scan'].get('agrees') else ('page image (%s)' % x['page_image_check']['how'] if x.get('page_image_check') else 'second scan not matched')])
    o.extend(table(['note', 'unit', 'strength figure', 'kind', 'author (volume)', 'printed page', 'date as stated', 'checked'], rows))
    w('')
    multi = [(k, units[k]['clark']) for k in keys if units[k]['clark']['strength_low'] is not None and units[k]['clark']['strength_low'] != units[k]['clark']['strength_high']]
    grp = collections.defaultdict(list)
    for x in cn:
        if x['kind'] in ('present_for_duty', 'taken_into_action') and x['subject'].startswith('Company') and x['figures']:
            for un in x['units']:
                grp[(un, x['subject'])].append(x)
    cconf = []
    for (un, sub), xs in grp.items():
        vals = {}
        for x in xs:
            for f in x['figures']:
                if f['value'] is not None and f['what'] in ('present for duty', 'men for duty', 'men', 'enlisted men', 'rank and file taken into action', 'men in action', 'men taken into the battle', 'privates present for duty', 'aggregate present', 'enlisted present', 'rank and file crossing in June', 'present and absent'):
                    vals.setdefault(f['value'], []).append(x['id'])
        if len(vals) > 1:
            cconf.append('%s %s: %s' % (D(un), sub, '; '.join('%s (%s)' % (fmt(v), ', '.join(ids)) for v, ids in sorted(vals.items()))))
    w('**Where the statements conflict.** %s Company-level statements that name different numbers for the same company (the "what" of each figure differs: present for duty, taken into action, enlisted, aggregate present or absent): %s. The statements are those of different authors about different dates and different counts (muster rolls of 30 June, men in the ranks on 1 July, "muskets", rank and file); this report does not reconcile them.'
      % (' '.join('%s: %s from %d statements (%s).' % (D(k), '%s to %s' % (fmt(c['strength_low']), fmt(c['strength_high'])), len(c['strength_notes']), ', '.join(c['strength_notes'])) for k, c in multi) or 'No unit has two different statements.', '; '.join(cconf) or 'none'))
    w('')
    nonote = [k for k in keys if not units[k]['clark']['notes']]
    w('**Units with no note (%d)**: %s. For each the chapter named in the table was scanned (the counts are in the last column); the scan found no figure of the kinds above for that unit, and no one has read the chapter by eye for a statement the scan could not see (gap EG-ROS-NC-05). A unit without a note is a unit whose Clark chapter gives no such figure that the scan found: it is not a statement that the unit was absent or that no figure exists.'
      % (len(nonote), ', '.join(D(k) for k in nonote)))
    w('')
    bs = [x for x in cn if re.search(r'brigade|battalion|column|detachment', x['subject'], re.I)]
    w('**Brigade, battalion and detachment statements** are carried with every unit of this work item they name (the `units` of the note); %d notes: %s.'
      % (len(bs), '; '.join('%s, %s (%s): %s' % (x['id'], x['subject'], x['when'][:40], ', '.join('%s %s' % (f['printed'], f['what']) for f in x['figures'])) for x in bs)))
    w('')

    # ---------------------------------------------------------------- 2 the unit files
    w('## 2. The unit files')
    w('')
    ex_flags = jload_gz(os.path.join(L.D2, 'confederate', 'nc', '26th-north-carolina-infantry.flags.json.gz'))
    w('One gzip JSON-lines file per unit, `[offset delta, name, rank, remarks, remark delta]` lines with carried state lines `co` (company), `pg` (printed page) and `rk` (the rank heading above the lines, as printed), one **segment** per source text (`NC-MOORE-1882.<vol>` or `.<vol>~b`, layout `flow`; every unit has exactly one: no line is read from a second scan). Lines are in the order of the printed page. The writer is `r2lib.write_unit` (deterministic bytes).')
    w('')
    w('* **name** (`name_printed`): the tokens of the head of the entry as the text layer prints them, joined by single blanks, with the printed commas and periods. Moore prints privates "Surname, Given, e. date; County co.; remarks" and officers "Given Surname, Rank, [cm. date;] County co.; remarks"; the head is cut where the entry begins (a surname-first head with an enlistment or commission marker, or a given-name-first head with a rank phrase); a damaged name stays damaged. Running heads ("North Carolina State Troops." and "Company X. Nth Regiment.") and page numbers are left out.')
    w('* **rank**: where the entry prints a rank (%s lines) it is the printed rank; every other line carries the rank of the **heading** above it (`^PRIVATES`, `^NON-COMMISSIONED OFFICERS`, `^OFFICERS`, `^FIELD AND STAFF`), carried as printed.' % fmt(sum(u['rank_printed'] for u in units.values())))
    w('* **company**: the letter of the company heading above the line (the printed letter; where the scan damaged it, the letter the sequence of headings gives, flag C). **`FS` is the code of the field and staff** of the regiment or battalion (%s lines): it is not a company. A battery that is one company of a Moore section holds that company only.' % fmt(sum(u['company_counts'].get('FS', 0) for u in units.values())))
    w('* **remarks**: every other token of the entry in the order of the text layer (county, event, date, remarks); %s of %s lines have remarks. Where the text layer inserts running heads or page furniture in the middle of an entry, the remark tokens skip them (the verifier allows a step-over of at most 200 characters inside the leaf): %s lines have such a step-over.'
      % (fmt(sum(u['with_remarks'] for u in units.values())), fmt(rows_total), fmt(sum(u['verify']['remark_gap_rows'] or 0 for u in units.values()))))
    w('* **Rights per name**: the segment names the source text; `data2/sources/NC-MOORE-1882.json` holds the eight items, their dates and their sha256; `rosters/sources/conf-nc.json` is the tracked pointer file (section 3).')
    w('')
    w('**Flag codes** (flag file, by row number from 0 over the whole file; `ocr_uncertain` is the union of N H C R Y G M W; the rules are those of `nc_flags.py`, heuristics on the printed cell, never a change to a line). Totals over the %d units:' % n)
    w('')
    rows = [[c, G.fmt(tot['flag_' + c]), F.CODES[c]] for c in 'NHCRYGMW']
    o.extend(table(['code', 'lines', 'meaning'], rows))
    w('')
    w('**Kinds of head** (`head_kinds` of the flag file lists the rows whose head was cut by a rule that is a reading; the regular head, a surname-first head with a strict marker `e.` or `cm.` or a given-name-first head with a rank phrase, is not listed): ' +
      '; '.join('`%s` %s' % (k[len('head_'):], fmt(v)) for k, v in sorted(tot.items()) if k.startswith('head_')) +
      '. `S-recovered`: a head recovered backwards from a strict marker inside the remarks of the line above (the text layer ran two entries together); `S-mark-weak`: a weak marker (`c.` `o.` `a.` for `e.`); `S-mark-junk`: a damaged marker; `S-county`, `S-month`, `S-event`, `S-rank`: no marker, the name is followed by a county, a date, an event word or a rank phrase; `G-mark`: a given-name-first head with a marker.')
    w('')
    w('**Company headings** (the rule that gave the letter, rows of all units): ' + '; '.join('%s %s' % (k, fmt(v)) for k, v in sorted(collections.Counter({r: sum(units[k]['heading_rules'].get(r, 0) for k in keys if units[k].get('heading_rules')) for r in set(r for k in keys for r in (units[k].get('heading_rules') or {}))}).items())) +
      ' (headings). `letter`: the printed letter is the next letter of the sequence; `sequence`: the printed letter is one the scan confuses with the expected letter or is no letter, the sequence gives it (flag C); `skip`: a clean letter further on in the alphabet than expected, taken as printed (listed in the flag member `company_skips`, no flag); `late`: a clean letter that no heading above had, taken as printed; `missing-roll`: Moore prints "Missing" for the company and no lines follow; `inferred-after-privates`: an officers heading appears after privates without a company heading, the next letter is given (flag C). Rows under a letter that the sequence gave: %s (flag C; the flag member `company_inferred` lists the stretches); rows under a clean letter that skips a letter of the sequence: %s (`company_skips`).'
      % (fmt(sum(c['n_rows'] for k in keys for c in units[k]['company_inferred'])), fmt(sum(c['n_rows'] for k in keys for c in units[k]['company_skips']))))
    w('')
    w('**`on_rolls_july_1863`** (inferred, in the flag file only): ' + ex_flags['on_rolls_july_1863']['rule'] + ' It is **no statement of presence**: a man on the rolls may have been sick, absent or detached; no muster roll of 30 June 1863 is in the source.')
    w('')
    w('**`names_gettysburg`** lists the rows whose printed remarks name Gettysburg (an OCR-tolerant match, a lower bound), **`gettysburg_dated`** those whose clause also prints 1, 2 or 3 July 1863; **`normalised_names`** only re-orders the printed tokens as "Given Surname" and strips stray marks at their ends (no letter is changed); **`page_image_readings`** (one entry, section 5 item 12) holds a reading of a printed name from a page image, with its evidence.')
    w('')
    w('Files: unit files `rosters/data2/confederate/nc/<unit>.jsonl.gz` (%d), flag files `<unit>.flags.json.gz` (%d), ledger `rosters/data2/sources/NC-MOORE-1882.json`, pointer file `rosters/sources/conf-nc.json`, manifest `tmp/library/rosters/MANIFEST-conf-nc.json`, this report; work files (diagnostics per unit, `build-summary.json`, `reconciliation.json`, `differences-<unit>.csv` (%d), `recap.json`, `stats.json`, `copy-audit.json`, `verify-unit-run.out`) under `GOVERNANCE/horde/ws-rosters/conf-nc/`; the tools are in `pipeline2/conf_nc/` (`nc_parse.py`, `nc_sections.py`, `nc_build.py`, `nc_flags.py`, `nc_recap.py`, `nc_reconcile.py`, `nc_stats.py`, `nc_gaps.py`, `nc_report.py`, `nc_audit.mjs`).' % (n, n, A['n_diff_files']))
    w('')

    # ---------------------------------------------------------------- 3 sources and rights
    w('## 3. Sources and rights (all fetched from archive.org, one request at a time, at least 1.2 s apart)')
    w('')
    clark_notes = jload(os.path.join(L.D2, 'sources', 'NC-CLARK-1901.json')).get('notes', [])
    rows = []
    for s in ptr['sources']:
        ev = s['rights']['evidence']
        tid = s['text_id']
        files = {f['role']: f for f in s['files']}
        rows.append([tid, '`%s` (%s)' % (s['identifier'], s['contributor']), '%s (%s)' % (s['year'], ev.get('year_source', '')), ev.get('ia_possible_copyright_status') or 'blank', fmt(files['text']['bytes']), files['text']['sha256'][:12] + '...',
                     ('%d notes (no roster line)' % sum(1 for x in clark_notes if x['t'] == tid) if s['source_id'] == 'NC-CLARK-1901' else ('%d units (primary reading)' % prim.get(tid, 0) if prim.get(tid, 0) else 'second reading only')), s['rights']['basis']])
    o.extend(table(['text id', 'Internet Archive item (contributor)', 'printed year (how established)', 'item flag possible-copyright-status', 'text bytes (gzipped hocr search text)', 'sha256', 'used as', 'rights basis'], rows))
    w('')
    w('The printed source is the State of North Carolina\'s own roster, compiled under an act of the General Assembly and printed at Raleigh by the state printers in 1882 (Documented: the imprint quoted with its offset in each text where the text layer has it, otherwise the item\'s own date; `rosters/sources/conf-nc.json`, `rights.evidence`). The basis "public domain (United States publication before 1929)" is written only for these eight texts, where the 1882 US publication is established, and for the ten texts of Clark (1901; "Published by the state", Goldsboro, Nash Brothers, printers, 1901; volume 1 Raleigh, E. M. Uzzell), where the 1901 US publication is established the same way. The files, sizes and sha256 are in `rosters/sources/conf-nc.json` and `tmp/library/rosters/MANIFEST-conf-nc.json` (%d files, sha256 re-checked against the ledger `rosters/data2/sources/NC-MOORE-1882.json`). **Two copies of each volume are pinned** because the text layer of one is damaged where the other is not, and because a scan may repeat pages (the earlier family found it in the Google scan of volume 1, GAPS GN03). The Emory copies are the primary reading of %d of the %d units of volume 1, %d of the %d of volume 2, %d of the %d of volume 3 and %d of the %d of volume 4; pages held twice were found in the parses of the second scan of %s.'
      % (sum(len(s['files']) for s in ptr['sources'] if s['source_id'] == 'NC-MOORE-1882'), prim.get('NC-MOORE-1882.1~b', 0), sum(1 for k in keys if units[k]['moore']['volume'] == '1'), prim.get('NC-MOORE-1882.2~b', 0), sum(1 for k in keys if units[k]['moore']['volume'] == '2'),
         prim.get('NC-MOORE-1882.3~b', 0), sum(1 for k in keys if units[k]['moore']['volume'] == '3'), prim.get('NC-MOORE-1882.4~b', 0), sum(1 for k in keys if units[k]['moore']['volume'] == '4'),
         ', '.join('%s (%d leaves)' % (D(k), v) for k, v in sorted(A['dup_units'].items())) or 'no unit'))
    w('')
    w('**Leads, not read** (the pointer file `not_used`): ' + '; '.join('%s (%s): %s' % (x['source_id'], x['title'], x['status']) for x in ptr['not_used']) + '. **Clark (1901)**: ten texts (five volumes, each from two Internet Archive items, `NC-CLARK-1901.<vol>` and `.<vol>~b`; the Cornell University Library copies of volumes 1 to 4, the New York Public Library copy of volume 5 and the Emory University copies as second scans) are pinned in the ledger `rosters/data2/sources/NC-CLARK-1901.json` with sha256 and the manifest, and read for notes only (section 1.3). **Blocked: none** (no host refused a request of this item; `blocked` is empty in the pointer file). **Page images**: text PDFs from archive.org /cors/ (one request at a time, 1.2 s apart) were fetched to look at pages (section 5, item 12; the four Moore totals, section 1.1; the pages of Clark notes, section 1.3): `rosterofnorthcar02nort` (53,035,273 bytes), the Emory copy of Moore volume 4 and the Emory copies of Clark volumes 1, 2, 3 and 5; they are transient files under `tmp/library/rosters/_pdf/`, the ones of Clark are deleted at the end of the run, and no image is stored in the tree.')
    w('')

    # ---------------------------------------------------------------- 4 what was checked
    w('## 4. What was checked')
    w('')
    sv = lambda f: sum(summ[k][f] or 0 for k in keys)
    w('* **At build time (assertion)** (`nc_build.py`, the rules of `r2lib.verify_rows`): for every line written, V1 the name tokens stand in the pinned text at the recorded offset, in order, separated only by white space; V2 the remark tokens stand in order from the recorded offset inside the leaf (step-over of at most 200 characters); V3 the offset lies in a leaf whose printed page is the recorded page; V4 the rank heading stands above the line. Over the %d files: %s lines, name defects %d, page defects %d, remarks found %s, remarks empty %s, remarks not found %d. A line that fails is not written; the parser is corrected, never the line.'
      % (n, fmt(sv('rows')), sv('v1'), sv('v3'), fmt(sv('remark_ok')), fmt(sv('remark_empty')), sv('rows_with_remarks_not_found')))
    if ver and len(ver) == n:
        w('* **`pipeline2/verify_unit.py` on the %d files (Measured, `verify-unit-run.out`)**: %d of %d ok; V1 name defects %d, V3 page defects %d, problems (missing text, sha mismatch) %d; the verifier checks the sha256 of each pinned text against the ledger before use.'
          % (n, sum(1 for v in ver.values() if v['ok']), len(ver), sum(v['v1_name_defects'] for v in ver.values()), sum(v['v3_page_defects'] for v in ver.values()), sum(len(v['problems']) for v in ver.values())))
    else:
        w('* **`pipeline2/verify_unit.py`**: not finished when this report was written.')
    w('* **Choice of the reading of each unit** (`build-summary.json`, DD-ROS-NC-01): both scans are parsed by the same parser; the score of a scan is its rows (pages held twice taken out) minus the rows of company letters the other scan does not have minus 15 per company heading read by the sequence or damaged; the scan with the higher score is the reading of the file. Primary scans: %s.' % '; '.join('%s %d' % (k, v) for k, v in sorted(prim.items())))
    rs = sum(x['second_scan']['matched'] for x in rec.values())
    w('* **Reconciliation with the second scan** (`reconciliation.json`; alignment by company and the sorted letters of the name tokens, so that the printed order does not matter): of %s file lines, %s are matched, %s stand only in the file and %s only in the second scan (%d runs of second-scan lines, %d lines, in %d units, have no place in the file: a block the second scan holds twice or lines the primary scan lost; not decided). Pages held twice that the parser took out (all of them in the parse of the second scan; none in a primary scan: %s): %s.'
      % (fmt(rows_total), fmt(rs), fmt(sum(x['second_scan']['only_in_file'] for x in rec.values())), fmt(sum(x['second_scan']['only_in_second'] for x in rec.values())), A['second_runs'], A['second_run_lines'], A['second_run_units'],
         'checked' if all(not units[k]['scan']['dups_dropped'][units[k]['primary']] for k in keys) else 'NOT the case', ', '.join('%s %d leaves' % (D(k), v) for k, v in sorted(A['dup_units'].items())) or 'none'))
    e_units = [k for k in keys if rec[k].get('earlier')]
    w('* **Reconciliation with the earlier roll files** (`rosters/data/C-NCLA/units/*.csv`, an independent reading of the same texts; %d of the %d units have one: %s have none): of %s earlier lines, %s are matched by alignment; %s file lines and %s earlier lines have no line with the same key in the other reading, listed in `differences-<unit>.csv` (%d files; a side is listed up to 400 lines, the file says where it is cut). Company counts per unit of all three readings are in `reconciliation.json`; the company letters present in one reading only are listed in section 5, item 4.'
      % (len(e_units), n, ', '.join(D(k) for k in keys if k not in e_units), fmt(sum(rec[k]['earlier']['lines'] for k in e_units)), fmt(sum(rec[k]['earlier']['matched'] for k in e_units)),
         fmt(sum(rec[k]['earlier']['only_in_file_by_key'] for k in e_units)), fmt(sum(rec[k]['earlier']['only_in_earlier_by_key'] for k in e_units)), A['n_diff_files']))
    w('* **Moore\'s totals** (`recap.json`, `nc_recap.py`): the Recapitulation line of each section is found in the volume-4 text of both scans; the figure is kept as the text layer prints it, with the quote and its offset (verified: `text[offset:offset+len(quote)] == quote`); a figure is read from the text layers only where it is printed in full in one layer and the other layer agrees or damages it without changing its length, otherwise from the page image where both layers damage it (DD-ROS-NC-05): the 1st, 2nd, 4th and 33rd Infantry, read from the Emory copy of volume 4 (leaves 470 and 471, printed pages 456 and 457; a crop looked at and read with tesseract). %d of %d sections have a read figure.'
      % (sum(1 for v in recap.values() if v['value'] is not None), len(recap)))
    dis = [x for x in clark_notes if x['second_scan'].get('agrees') is not True]
    dis_unchecked = [x for x in dis if not x.get('page_image_check')]
    w('* **Clark notes** (`nc_clark.py`; the ledger; `clark-notes-check.json`): every quotation was located in the pinned text by a phrase that occurs once in the volume, the sentences were joined as printed, and every printed figure was asserted to stand in the quotation; the same statement was looked for in the second scan (the Emory copy) on the same printed page: %d notes agree in both text layers (every printed figure stands in the second scan too), %d do not (a figure damaged in one layer, or the statement not matched because the page furniture splits it); %d notes carry a page-image check (300 ppi crop; %d looked at by eye, the others read with tesseract only), among them %d of the %d that do not agree; %s.' % (tot['clark_notes_second_scan_agrees'], len(dis), tot['clark_notes_page_image'], tot['clark_notes_page_image_viewed'], len(dis) - len(dis_unchecked), len(dis), ('every disagreement was settled from the page' if not dis_unchecked else '%d disagreements were NOT checked: %s' % (len(dis_unchecked), ', '.join(x['id'] for x in dis_unchecked)))))
    w('* **One page image looked at, for a name** (section 5, item 12): leaf 130 of `rosterofnorthcar02nort`, printed page 116 (the 2nd North Carolina Cavalry, Company A privates); the tesseract read of the page shares 0.939 of its tokens with the pinned leaf; a tesseract read is not a reading of the print and is not used as evidence.')
    if audit:
        w('* **Copy audit** (`nc_audit.mjs`, the rules of the staging packer `tools/bt/pack_theatre.mjs`: `audit()`, `AUDIT_RE`, `AUDIT_CS_RE`, `AUDIT_ALLOW`; DD-STG-02): the %d files of this item that ship under `rosters/data2` (%d unit files, %d flag files and the two source ledgers, Moore and Clark) were opened, the gzip files too, and their text audited (%s rows read): **%d hit%s**%s. Printed words that the rules match, by field: %s.'
          % (audit['files_audited'], audit['unit_files'], audit['flag_files'], fmt(audit['rows_read']), len(audit['hits']), '' if len(audit['hits']) == 1 else 's',
             (' (' + '; '.join('%s line %s: "%s"' % (h['file'], h.get('line'), h.get('match')) for h in audit['hits']) + ')') if audit['hits'] else '',
             '; '.join('%s: %d' % (k, v) for k, v in sorted(audit['printed_words']['by_field_and_word'].items())) or 'none'))
    w('* **Not run**: the independent sample of page images (R-G9; the item roster-qa draws it, a group never claims it); a second reading of the damaged lines from page images (EG-ROS-NC-02); an eye reading of the Clark chapters of the units without a note (EG-ROS-NC-05); a browser, the node suite or any timing run; no node test file was written for this item (optional, PRODUCTION-PLAN 9.3 item 5).')
    w('')

    # ---------------------------------------------------------------- 5 anomalies
    w('## 5. Anomalies seen')
    w('')
    n_it = [0]

    def item(text):
        n_it[0] += 1
        w('%d. %s' % (n_it[0], text))

    item('**Lines against the printed totals** (section 1.1): all %d whole-regiment totals read (%d of them from the page image, because both text layers damage the figure: %s); lines differ by %+d to %+d. Not explained here; nothing is added or removed (EG-ROS-NC-07).'
         % (len(A['diffs']), len(A['recap_image']), ', '.join('%s %s' % (D(k), fmt(units[k]['printed_total']['value'])) for k in A['recap_image']), A['diff_min'], A['diff_max']))
    nl = A['notes']
    item('**Printed notes inside the rolls: %d.** They are prose, not lines: they are not in the unit files and are kept with their offsets in `diagnostics/<unit>.json` (gap EG-ROS-NC-06). The first 200 characters of each, as the text layer prints them: ' % len(nl) +
         ' '.join('(%s, Company %s, offset %s) "%s"' % (D(k), x['co'], x['off'], x['text'].replace('"', "'")) for k, x in nl) + ' ' + G.appendix_clause(A, True) + ' (Measured).')
    sc = A['small_companies']
    item('**Small company rolls** (fewer than half of the median company of the unit; the roll is as printed): %s. The Charlotte Artillery (Company C of the Tenth Regiment) holds %d lines and one captain; no printed note was found in its section.' % ('; '.join('%s Company %s: %d lines (median %d)' % (D(k), c, v, med) for k, c, v, med in sc), units['c-nc-charlotte-artillery']['lines']))
    # company letters in one reading only
    one = []
    for k in keys:
        f = set(units[k]['company_counts'])
        ss = rec[k]['second_scan']['company_counts']
        ea = (rec[k].get('earlier') or {}).get('company_counts', {})
        a = {c: v for c, v in ss.items() if c not in f}
        b = {c: v for c, v in ea.items() if c not in f}
        c2 = {c: units[k]['company_counts'][c] for c in f if c not in ss}
        if a or b or c2:
            one.append('%s: %s' % (D(k), '; '.join(x for x in (('second scan only %s' % ', '.join('%s %d' % kv for kv in a.items())) if a else '', ('earlier file only %s' % ', '.join('%s %d' % kv for kv in b.items())) if b else '',
                                                           ('file only (not in the second scan) %s' % ', '.join('%s %d' % kv for kv in c2.items())) if c2 else '') if x)))
    rules = collections.Counter()
    for k in keys:
        for c in units[k]['company_inferred'] + units[k]['company_skips']:
            rules[c['rule']] += c['n_rows']
    item('**Company letters.** The letters of the files are A to K in %d units; the 16th and 21st Infantry have a Company M and no Company L in all three readings (a clean letter further on, taken as printed), the 22nd Infantry a Company L (%d lines); the 2nd Battalion has Companies A, B, D, E, F, G, H (Moore\'s note: no Company C; Companies D and E are Georgia companies whose roll was not found, 4 lines each). Rows by the rule that gave the letter where it is not the plain next letter (`sequence` and `inferred-after-privates` carry flag C; `skip` is a clean printed letter): %s. **Company letters present in one reading only** (the second scans of volumes 1 and 2 hold pages twice or out of order, so the headings of the repeated block continue the alphabet; the primary scan and the earlier file do not have them): %s.'
         % (sum(1 for k in keys if ''.join(c for c in units[k]['company_counts'] if c != 'FS') == 'ABCDEFGHIK'), units['c-nc-22nd-north-carolina-infantry']['company_counts'].get('L', 0), ', '.join('%s %s' % (k, fmt(v)) for k, v in sorted(rules.items())), ' | '.join(one) or 'none'))
    pn = A['page_null']
    item('**Lines without a printed page: %s** (%s). They stand on leaves at the start of a volume for which the item\'s page-number file gives no printed page (%s); the lines carry no page (a leaf without a printed page is not checked by V3), and no page is derived from the neighbouring leaves (the flag file member `printed_page_from_running_head` is empty).'
         % (fmt(tot['page_null']), ', '.join('%s %d' % (D(k), v) for k, v in pn.items()), '; '.join('%s leaves %d - %d' % (D(k), pos[k]['null_leaves'][0], pos[k]['null_leaves'][1]) for k in pn)))
    item('**Name text damaged (flag N): %s lines** (%s percent). The head is printed as the layer has it; nothing is repaired. Examples, the first flagged line of the first six units with one (name, unit, printed page): %s.' % (fmt(tot['flag_N']), pct(tot['flag_N'], rows_total), '; '.join(first_examples(units, keys, 'N', 6))))
    item('**Heads cut by a rule that is a reading (flag H): %s lines.** The text layer runs entries together on a line; %s heads were recovered backwards from a strict marker inside the remarks of the line above (`S-recovered`), %s heads had a weak or damaged marker, %s had no marker (county, date, event or rank right after the name). Entries that the layer ran together without any recognisable head stay merged with their neighbour: **%s lines carry flag M** (the remarks hold a second marker of enlistment or commission, or a name-like run with a comma follows a period).'
         % (fmt(tot['flag_H']), fmt(tot['head_S-recovered']), fmt(tot['head_S-mark-weak'] + tot['head_S-mark-junk']), fmt(tot['head_S-county'] + tot['head_S-month'] + tot['head_S-event'] + tot['head_S-rank']), fmt(tot['flag_M'])))
    item('**Dates and words damaged**: flag Y (a year or date damaged: `\'6!`, `1S63`) on %s lines, flag W (a remark word damaged) on %s, flag G (marks of the scan) on %s, flag R (rank text damaged) on %s. They stay as printed in the layer.' % (fmt(tot['flag_Y']), fmt(tot['flag_W']), fmt(tot['flag_G']), fmt(tot['flag_R'])))
    gk, g4 = 'c-nc-26th-north-carolina-infantry', 'c-nc-4th-north-carolina-infantry'
    item('**Presence.** %s of %s lines name Gettysburg in their remarks and %s of them print 1, 2 or 3 July 1863 (lower bounds). For the 26th Infantry this run counts %d lines that name Gettysburg (the earlier GAPS lines G05 and GN01 give 512 and 515 by another rule, against Clark\'s 708 killed, wounded and missing) and for the 4th Infantry %d (GN01: 21); the rules differ and the difference is not examined. No line states presence on any other ground (gap EG-ROS-NC-04).' % (fmt(tot['names_gettysburg']), fmt(rows_total), fmt(tot['gettysburg_dated']), units[gk]['names_gettysburg'], units[g4]['names_gettysburg']))
    item('**Lines against the earlier files**: for the %d units that have an earlier file the earlier files hold %s lines against %s in these files (%+d); the six units with no earlier file (the four cavalry regiments, the Branch and the Charlotte Artillery) have only the second scan as a second reading. The differences by line are in `differences-<unit>.csv` (section 4); none is resolved.'
         % (len(e_units), fmt(sum(rec[k]['earlier']['lines'] for k in e_units)), fmt(sum(units[k]['lines'] for k in e_units)), sum(units[k]['lines'] for k in e_units) - sum(rec[k]['earlier']['lines'] for k in e_units)))
    chp = os.path.join(WS, 'changes-after-review.json')
    if os.path.exists(chp):
        ch = jload(chp)['totals']
        item('**Parser corrected after the first review of the files (DD-ROS-NC-07).** Writing this report showed two classes of mis-cut heads in the first build: %s rows whose name was a county phrase ("Wilkes co.", a county taken for a split surname) and %s rows whose remarks ended with the first given name of the next head ("Wm.", "Thos.", left behind a county). Four narrow rules were corrected in two rounds (the fourth, a lower-case word of at most three letters that ends with a full stop or a semicolon is no surname, "Burke eo.;", was first written without the distinction from a lower-case fragment that ends with a comma, "Alf red,", "Rough ton,", which are the second half of a surname the scan split; that form took true heads out of the files and was refined after the change list was read) and the %d files rebuilt from the same pinned texts: after the correction %s and %s such rows remain; rows %s to %s; %s changed blocks in %s units, each listed in `changes-after-review.json` with the printed names and the first 60 characters of the remarks of both sides; no printed word is changed. What remains of the second class are heads that the text layer damaged (an initial run into the name: "JohnL.", "PeterS."; a given name read as "Tas." or "Tno."; a bare name with no date): they stay merged with the line before and carry flag M where a name-like run follows a period.'
             % (fmt(ch['county_name_rows_before']), fmt(ch['given_name_abbreviation_before']), n, fmt(ch['county_name_rows_after']), fmt(ch['given_name_abbreviation_after']),
                fmt(ch['rows_before']), fmt(ch['rows_after']), fmt(ch['blocks']), fmt(ch['units_changed'])))
    ident = [k for k in keys if units[k].get('identification')]
    item('**Identification of the four artillery units** (DD-ROS-NC-04; Documented by the Official Records index lines, Inferred where it rests on the captain or the counties): ' + ' || '.join('%s = Moore volume %s, %s %s, Company %s: %s' % (D(k), units[k]['moore']['volume'], 'Tenth Regiment' if units[k]['moore']['number'] == 10 else 'Fifth Battalion', '(First Artillery)' if units[k]['moore']['number'] == 10 else '(Light Artillery)', units[k]['moore']['company'], units[k]['identification']) for k in ident) + '. **Clark corroborates the four from his own chapters** (the notes of kind identification in the ledger): ' + ' || '.join('%s (%s, printed page %s): "%s"' % (x['id'], D(x['units'][0]), x['pg'] if x['pg'] is not None else 'not numbered', x['quote'][:170]) for x in cn if x['kind'] == 'identification') + '. The Clark chapters speak of Company A ("Ellis Light Artillery", later Manly\'s), Company C (organized at Charlotte, Joseph Graham a lieutenant), Reilly\'s battery ("Rowan Artillery") and Company F of the Thirteenth Battalion (Captain Latham); they confirm the captain or the place that Moore\'s companies carry and do not add a number.')
    ph = F.PAGE_IMAGE_READINGS
    item('**One name read from a page image and one word the copy audit rejects.** ' + ' '.join('%s: row %d (offset %d in %s), printed reading "%s". %s' % (D(k), x_row(units, k, e), e['offset'], e['text_id'], e['printed'], e['how']) for k, es in ph.items() for e in es) +
         ' The unit file keeps the text layer (a line must be found at its offset in the pinned text; a name is never respelled to pass an audit; DD-ROS-NC-02); the reading is in the flag file member `page_image_readings`. The staging packer asked for this (`GOVERNANCE/horde/requests/bt-rosters-staging-copy-audit-ai-token.md`); its copy audit rejects the two capital letters of that name in the name field of the row and in the normalised-name list of the flag file; the allowance it describes (one reviewed allowance for that one name, DD-ROS-NC-03) is the packer\'s to add, and the answer is appended to the note.')
    item('**Words that the copy audit would meet in printed text**: %s. The audit of the files of this item reports %d hit%s (%s); the rules and the allowance for a printed given name are those of `AUDIT_ALLOW` (DD-STG-02). Nothing in the files, the flag files or the ledger says how they were made.'
         % ('; '.join('%s: %d' % (k, v) for k, v in sorted(audit['printed_words']['by_field_and_word'].items())) if audit else 'not run', len(audit['hits']) if audit else 0, '' if audit and len(audit['hits']) == 1 else 's',
            '; '.join('%s line %s: "%s"' % (h['file'], h.get('line'), h.get('match')) for h in audit['hits']) if audit else 'not run'))
    w('')

    # ---------------------------------------------------------------- 6 gaps
    w('## 6. Gaps registered (proposals under `GOVERNANCE/horde/ws-rosters/proposed-register/`, lines appended to `rosters/GAPS.md`)')
    w('')
    for e in gaps:
        w('* **%s** (GAPS.md %s): %s. Route: %s. Tier: %s.' % (e['id'], e['gid'], e['title'], e['route'], e['tier']))
    w('')
    w('No unit lacks a file, so `units_without_file` in `CLOSED.json` is empty. Delegated decisions DD-ROS-NC-01 to -07 are appended to `GOVERNANCE/decisions/DELEGATED-DECISIONS-2026-11-11.md`.')
    w('')
    path = os.path.join(L.R2, 'reports', 'conf-nc.md')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(o))
    print('wrote', path, len(o), 'lines')
    return 0


def jload_gz(p):
    with gzip.open(p, 'rb') as f:
        return json.loads(f.read().decode('utf-8'))


def x_row(units, k, e):
    fl = jload_gz(os.path.join(L.D2, 'confederate', 'nc', k[len('c-nc-'):] + '.flags.json.gz'))
    for r in fl.get('page_image_readings', []):
        if r['offset'] == e['offset']:
            return r['row']
    return -1


_cache = {}


def first_examples(units, keys, code, limit):
    out = []
    for k in keys:
        if len(out) >= limit:
            break
        path = os.path.join(L.ROOT, units[k]['file'])
        fl = jload_gz(path[:-len('.jsonl.gz')] + '.flags.json.gz')
        idx = fl['rows'].get(code) or []
        if not idx:
            continue
        head, segs, meta = R.read_unit(path)
        rows = [x for sg, rs in segs for x in rs]
        r = rows[idx[0]]
        out.append('"%s" (%s, page %s)' % (r[0], units[k]['designation'], r[4]))
    return out


if __name__ == '__main__':
    sys.exit(main())

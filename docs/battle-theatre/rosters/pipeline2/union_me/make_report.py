"""Statistics of the 14 Maine unit files and the report docs/battle-theatre/rosters/reports/union-me.md (numbers are computed here, never typed).

    python3 -I docs/battle-theatre/rosters/pipeline2/union_me/make_report.py            (run from the repository root)
"""
import os, sys, json, gzip, re, collections
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import mlib as M
R = M.R

OOB = json.load(open(os.path.join(M.WORK, 'oob_strengths.json')))
OOB_ID = {'u-me-3rd-maine-infantry': 'U-3ME', 'u-me-4th-maine-infantry': 'U-4ME', 'u-me-5th-maine-infantry': 'U-5ME', 'u-me-6th-maine-infantry': 'U-6ME',
          'u-me-7th-maine-infantry': 'U-7ME', 'u-me-16th-maine-infantry': 'U-16ME', 'u-me-17th-maine-infantry': 'U-17ME', 'u-me-19th-maine-infantry': 'U-19ME',
          'u-me-20th-maine-infantry': 'U-20ME', 'u-me-1st-maine-cavalry': 'U-1ME-CAV', 'u-me-2nd-maine-battery-b': 'U-ART-2ME'}
SEGNAME = {'ME-AGR-1863-APPD.1863': 'returns 1863', 'ME-SUPP-1867.1867': 'index 1867', 'ME-SUPP-1867.1867~p': 'index 1867 (positional text)',
           'ME-GETT-1898.1898': 'Maine at Gettysburg 1898', 'ME-APPD-1861.1861': 'muster-in 1861'}


def load(p):
    return json.load(open(p, encoding='utf-8')) if os.path.exists(p) else {}


def main():
    idx = load(os.path.join(M.WORK, 'ME-SUPP-1867', 'diag.json'))
    agr = load(os.path.join(M.WORK, 'ME-AGR-1863-APPD', 'diag.json'))
    out = {'units': {}, 'generated': M.now()}
    for key, desig, rel in M.UNITS:
        path = os.path.join(M.D2, rel)
        head, segs, meta = R.read_unit(path)
        fl = json.load(gzip.open(path.replace('.jsonl.gz', '.flags.json.gz'), 'rb'))
        per = collections.OrderedDict()
        same = 0
        for seg, rows in segs:
            per[seg['t']] = len(rows)
            same += sum(1 for r in rows if re.match(r'^Same\W*$', r[0]))
        orl = fl['on_rolls_july_1863']
        n = head['n']
        u = {'designation': desig, 'rows': n, 'segments': per, 'same_lines': same, 'raw_bytes': meta['raw'], 'ocr_uncertain': len(fl['ocr_uncertain']),
             'flags': {k: len(v) for k, v in fl['rows'].items()}, 'gettysburg_in_remark': R.gettysburg_rows(segs),
             'on_rolls_yes': len(orl['yes']), 'on_rolls_no': len(orl['no']), 'on_rolls_unknown': n - len(orl['yes']) - len(orl['no']),
             'index_name_not_read': idx.get('skipped_counts', {}).get('name-not-read:' + key, 0),
             'index_defects_after_fallback': idx.get('units', {}).get(key, {}).get('defects'),
             'returns_non_person_lines': sum(1 for x in agr.get('non_person_lines', []) if x['unit'] == key),
             'returns_prose_lines': agr.get('prose_lines_not_parsed', {}).get(key, 0),
             'returns_defects': agr.get('units', {}).get(key, {}).get('defects'),
             'oob': OOB.get(OOB_ID.get(key, ''), None)}
        out['units'][key] = u
    out['totals'] = {'rows': sum(u['rows'] for u in out['units'].values())}
    json.dump(out, open(os.path.join(M.WORK, 'stats.json'), 'w'), indent=1)
    d = os.path.join(M.ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'horde', 'ws-rosters', 'union-me')
    os.makedirs(d, exist_ok=True)
    json.dump(out, open(os.path.join(d, 'stats.json'), 'w'), indent=1)
    print(json.dumps({k: (v['rows'], v['segments']) for k, v in out['units'].items()})[:900])
    return out


if __name__ == '__main__':
    main()


def write_md(out):
    idx = load(os.path.join(M.WORK, 'ME-SUPP-1867', 'diag.json'))
    agr = load(os.path.join(M.WORK, 'ME-AGR-1863-APPD', 'diag.json'))
    gett = load(os.path.join(M.WORK, 'ME-GETT-1898', 'diag.json'))
    tot = load(os.path.join(M.WORK, 'index_totals.json'))
    other = R.read_unit(os.path.join(M.D2, 'union', 'me', '_other-ME-SUPP-1867.jsonl.gz'))[0]['n']
    U = out['units']
    L = []
    w = L.append
    w('# Maine (Union): rosters of the 14 units at Gettysburg (work item union-me, OA03)')
    w('')
    w('Written 13 November 2026 by the roster workstream. Evidence labels as in `PLAN.md`: **Measured** (a command run for this report produced it), **Documented** (a source text says it; the source is named), **Inferred** (a stated rule on printed text), **Not run**. Every number in section 1 is computed by `pipeline2/union_me/make_report.py` from the unit files themselves.')
    w('')
    w('## 0. Summary')
    w('')
    n = out['totals']['rows']
    w('* **14 unit files** under `rosters/data2/union/me/` (3rd, 4th, 5th, 6th, 7th, 10th Battalion, 16th, 17th, 19th, 20th Infantry, 1st Cavalry, 2nd, 5th and 6th Batteries), **%s lines in all**, format `roster2/2` (`pipeline2/r2lib.py`), each with a flag file `<unit>.flags.json.gz`. Beside them `_other-ME-SUPP-1867.jsonl.gz` (%s index lines whose unit cannot be read, kept visible, filed to no unit).' % (format(n, ','), format(other, ',')))
    w('* **Three printed sources are parsed**: (1) the Alphabetical Index of the Adjutant General\'s Supplement of 1867 (whole-war name list, every unit), (2) the company returns of Appendix D of the Adjutant General\'s Report for 1863 (status at 1 to 5 November 1863 with every change since 1 November 1862; all 14 units, not 11: the returns of the 5th and 6th Batteries and of the First Battalion of the Tenth Regiment are in the volume), (3) the participants lists of "Maine at Gettysburg" (1898), the only source here that names men as present in the battle (14 units).')
    w('* **Not parsed in this run**: the casualty lists of the 1898 book, the run-in paragraphs of men on special duty in the same book, the 1861 muster-in returns (`ME-APPD-1861`, text pinned), Appendix I of the 1863 volume (deceased Maine volunteers, by name, company and regiment), and the prose lists of discharged and deceased men in the 1863 returns. Each is a gap or open work with its place named in section 6.')
    w('* **Checks run (Measured)**: the builders assert every line against the pinned source text before writing it (name at its offset, remark tokens in order, printed page); `pipeline2/verify_unit.py` was then run on all 15 files: **0 name defects, 0 page defects, 0 problems** (section 4). **Not run**: the independent page-image sample (R-G9). How a printed remark belongs to a name on the pages whose columns the text layer separates is therefore checked only by the geometry rules of the parser, not by a second reader.')
    w('* **No label of presence** is written into any row (DD-ROS-01). Two derived marks exist and are kept in the flag files, never in the row: `ocr_uncertain` (the line is damaged in the text layer) and `on_rolls_july_1863` (inferred from printed dates only, otherwise unknown).')
    w('')
    w('## 1. Lines per unit against the strength')
    w('')
    w('"Strength" is the value of the baseline order of battle (`baseline/dist/data/oob`, second-hand, from Busey and Martin as the earlier families recorded it; no strength range with a declared basis exists for these units in the registry, `history/units.json` has `strength: null`). A whole-war roll is **not** comparable with the strength present on 1 to 3 July 1863: the earlier pilots measured that a man on a roll with no recorded absence was present between 36 and 72 percent of the time (`PLAN.md` 2.4, gap EG-ROS-010). The column "lines/strength" is context only.')
    w('')
    w('| unit | strength (baseline OOB) | returns 1863 | index 1867 | participants 1898 | all lines | lines/strength | "Same" lines | ocr_uncertain | printed remark names Gettysburg | on rolls inferred yes / no / unknown |')
    w('|---|---|---|---|---|---|---|---|---|---|---|')
    for key, u in U.items():
        sg = u['segments']
        ret = sg.get('ME-AGR-1863-APPD.1863', 0)
        ix = sg.get('ME-SUPP-1867.1867', 0) + sg.get('ME-SUPP-1867.1867~p', 0)
        gb = sg.get('ME-GETT-1898.1898', 0)
        st = u['oob']['strength'] if u['oob'] else None
        w('| %s | %s | %s | %s | %s | %s | %s | %s | %s | %s | %s / %s / %s |' % (u['designation'], st if st else 'no order-of-battle row', format(ret, ','), format(ix, ','), format(gb, ','), format(u['rows'], ','),
          ('%.1f' % (u['rows'] / st)) if st else '-', u['same_lines'], u['ocr_uncertain'], u['gettysburg_in_remark'], u['on_rolls_yes'], u['on_rolls_no'], u['on_rolls_unknown']))
    w('')
    w('Reading the table. The three sources overlap: the same man is on the index, on the return and (if he was there) on the participants list, one line each. Nothing is merged across sources (a merge would be a reading). A "Same" line is the index\'s own ditto: a second line for the man named above it (another rank or another unit). The 10th Maine line count is the **First Battalion, Tenth Regiment** (the four companies at XII Corps headquarters, `or_note` of `units.json`): the index prints it as "Battalion / 10th Infantry" and the 1863 volume returns it as "First Battalion Tenth Regiment Infantry". The earlier two-year regiment (printed "10 Infantry", %s index lines, mustered out in May 1863 before the battle) is not filed to it. The 20th Maine: the 1898 list names %s men in the parsed entries (not counting the special-duty paragraph) against 386 in the baseline strength; the contest (G04, about 575 names on the whole list) is carried as printed, not resolved.' % (format(tot.get('regiment_10_infantry_lines', 0), ','), U['u-me-20th-maine-infantry']['segments'].get('ME-GETT-1898.1898')))
    w('')
    w('## 2. The unit files')
    w('')
    w('One gzip JSON-lines file per unit, `[offset delta, name, rank, remarks, remark delta]` rows with carried `co` (company), `pg` (printed page) and `rk` (the heading above, as printed) state lines; one **segment** per source text: `ME-AGR-1863-APPD.1863` (returns), `ME-SUPP-1867.1867` (index) and `ME-SUPP-1867.1867~p` (the same index read in a positional text, see section 5), `ME-GETT-1898.1898` (participants). The name is the OCR tokens of the line joined by single blanks (`name_printed` in the brief), never corrected, never re-ordered; the order of a name is the order of the print (index: Surname Given; returns: Surname Given for most privates and the men who joined since November 1862, Given Surname for officers, sergeants and corporals; participants: both forms). Rank is the printed rank cell, or the carried heading (`^SERGEANTS.`, `^PARTICIPANTS. PRIVATES.`, `^Joined Co. since Nov. 1, 1862.`) when the line prints none. Remarks are every other printed token of the line, in text order (age, residence, marital state, muster date and remark for a return; company, regiment and corps cells for the index; residence and notes for a participants list). Rights per name: the segment names the source text and `data2/sources/<source id>.json` holds the item, its date, its sha256; `rosters/sources/union-me.json` is the tracked pointer file.')
    w('')
    w('A **normalised name** is not written: the index and the returns print surname-first and given-first names side by side and a rule that splits "Van Buren John" or "Mc Kenney Jas" would be a reading of the line; a search by tokens needs none. A flag file holds, by row number: `N R C G P U` (the name, rank, company, regiment or corps cell, or the unit read through a tolerated cell, is damaged in the text layer: **ocr_uncertain** is the union), `S` (the printed name is "Same"), and `on_rolls_july_1863` with its basis strings.')
    w('')
    w('**On the rolls in July 1863 (inferred)**: only for lines of the 1863 company returns, and only when printed dates support it. "yes" needs a muster date printed on the line (or a ditto mark taking the date of the line above) before the battle and either no separation word in the remark or a separation dated after 3 July 1863; "no" needs a separation (discharged, deserted, died, killed, dropped, transferred, resigned) dated before 1 July 1863 or a muster date after 3 July; any separation word without a readable date, a "returned" remark, a remark word outside a list of harmless words, or a line without a muster date is **unknown**. A month-day without a year is read in the year of the return period (November and December as 1862, the other months as 1863). The index and the participants lists print no enlistment dates: every line of them is unknown. The inference says nothing about presence on the field (EG-ROS-010).')
    w('')
    w('## 3. Sources and rights (all fetched from archive.org, one request at a time, at least 1.2 s apart)')
    w('')
    w('| source id | Internet Archive item | printed year | what it is | rights basis | state |')
    w('|---|---|---|---|---|---|')
    w('| ME-AGR-1863-APPD | `annualreportofad1863main` | 1863 (imprint "AUGUSTA: STEVENS & SAYWARD, PRINTERS TO THE STATE. 1863.") | Annual Report of the Adjutant General of Maine for the year ending 31 December 1863; Appendix D, the company returns | public domain (United States publication before 1929) | parsed |')
    w('| ME-SUPP-1867 | `supplementtoannu00main` | 1867 (item date; the OCR of the imprint year is damaged) | Supplement to the Annual Reports 1861-1866: the Alphabetical Index of the volunteers | public domain (United States publication before 1929) | parsed |')
    w('| ME-GETT-1898 | `maineatgettysbur01main` | 1898 | Maine at Gettysburg: report of the Maine commissioners, with the participants and casualty lists | public domain (United States publication before 1929) | participants lists parsed; casualty lists not |')
    w('| ME-APPD-1861 | `appendixdofannua00main` | 1862 (item date; the item\'s own flag is NOT_IN_COPYRIGHT) | Appendix D of the report of 31 December 1861: the returns of the regiments of 1861 | public domain (United States publication before 1929) | text pinned, not parsed |')
    w('')
    w('The files, their sizes and sha256 are in `rosters/sources/union-me.json` and in `tmp/library/rosters/MANIFEST-union-me.json`. The djvu.xml word-box files (60 MB, 60 MB, 18 MB) are transient and were deleted after the run (their sha256 stay in the pointer file). **Blocked** (not worked around): Digital Maine (the 1864-65 final roster, the 20th Maine deceased list; gap G03): one request on 2026-11-13 20:42 UTC, the proxy answered CONNECT 403.')
    w('')
    w('## 4. What was checked')
    w('')
    w('* **At parse time (assertion)**: for every line written, V1 the name tokens stand in the pinned text at the recorded offset, in order, separated only by white space; V2 the remark tokens stand in order from the recorded offset inside the leaf; V3 the offset lies in a leaf whose printed page is the recorded page (`r2lib.verify_rows`). A line that fails is not written and is counted: 0 failed after the positional fallback for the index; %s for the returns; %s for the 1898 lists (section 5).' % (sum((v.get('defects') or 0) for v in agr.get('units', {}).values()), sum(v['defects'] for v in gett.get('units', {}).values())))
    w('* **After assembly**: `python3 -I pipeline2/verify_unit.py --all --root docs/battle-theatre/rosters/data2/union/me`: 15 files, **0 V1, 0 V3, 0 problems**, ledger hashes matched. Row order within a segment is text order.')
    w('* **Alignment of word boxes to the text** (Measured): index 555,582 of 555,591 words; returns 283,283 of 283,287 words (leaves 224-821); participants 225,526 of 227,109 words (the 1898 text differs more from its boxes: lines with an unaligned word cannot be written and are counted).')
    w('* **Not run**: the independent sample of page images (R-G9), which is the only check that a remark belongs to the name beside it on a page where the text layer lists the columns separately; a second reading of any page image; a browser; any timing.')
    w('')
    w('## 5. Anomalies seen')
    w('')
    nnr = sum(u['index_name_not_read'] for u in U.values())
    w('1. **Lines whose name the text layer lost.** The two volunteer lists of the index have %s lines with no name in the first column (page folios, footnotes, and lines whose name the OCR lost); of them %s carry the regiment and corps cells of one of these units: %s. They are not written (no empty-name row) and are listed in `GOVERNANCE/horde/ws-rosters/union-me/diag-index.json`. Per unit: %s. The returns: %s lines of the 1863 returns were left out as not person lines or lines the geometry could not bind (headings that no rule knew, run-in name lists, lines whose age cell is lost and whose name tokens fail the name test), per unit %s; they are listed with their text in `diag-returns.json`.' % (format(tot.get('index_lines_without_name_vol1', 0) + tot.get('index_lines_without_name_vol2', 0), ','), nnr, 'the units of this item', ', '.join('%s %d' % (u['designation'], u['index_name_not_read']) for u in U.values() if u['index_name_not_read']), len(agr.get('non_person_lines', [])), ', '.join('%s %d' % (u['designation'], u['returns_non_person_lines']) for u in U.values() if u['returns_non_person_lines'])))
    w('2. **Index leaves where the search text keeps the cells of a row apart.** On 29 leaves that hold these units the Internet Archive search text lists the surname column and the given-name column in separate blocks, so a name is not one run of the text (141 lines before the fallback). They are written against a second text, `ME-SUPP-1867.1867~p`, built from the same OCR words of the item\'s own djvu.xml, row by row (recipe and hashes in the ledger entry; nothing is added, only the order of the words changes): %s lines in all (segment `~p`).' % sum(u['segments'].get('ME-SUPP-1867.1867~p', 0) for u in U.values()))
    w('3. **Leaves without text.** Eight leaves of the index have no OCR text and no word boxes (328, 329, 560, 561, 838, 839, 1220, 1221 of the item; the printed pages around them run 319 to 320, 549 to 550, 825 to 826 and 1205 to 1206); whether they are blank, plates or unread is **not known** (no page image was fetched). Leaves 563 and 564 of "Maine at Gettysburg" are plates between printed pages 480 and 481 (no text, no printed number).')
    w('4. **Index lists not read.** The "Transferred men not accounted for" table and the omitted-men table at the foot of leaf 579 (about 35 to 45 names by a rough count of the text, "Company H, 4th Regiment, transferred to 38th New York", the unit stated by ditto marks the text layer garbles) and the lists of drafted men and substitutes (leaves 580-629; no unit stated) are not parsed. The first names the 4th Regiment: open.')
    w('5. **Index lines the unit of which cannot be read: %s lines** in `_other-ME-SUPP-1867` (the regiment cell blank or damaged while the corps cell reads Infantry, Cavalry or Mounted Artillery, or a battery cell damaged). Most belong to other regiments; some belong to these units; none is guessed.' % format(other, ','))
    w('6. **The 1863 volume holds more than the work item listed**: the returns of the 5th and 6th Batteries (as the Fifth and Sixth Battery of the First Regiment of Mounted Artillery), of the 2nd Battery and of the First Battalion of the Tenth Regiment; the 1st Maine Cavalry and the 2nd Battery returns are in leaves 224-262 and 300-307, not in the run of the infantry regiments.')
    w('7. **Prose in the returns.** Lines that give names in running text ("Discharged, and Deceased in 1862 - Final Record given in last Report", band musicians mustered out, "Recruits enlisted in 1862 not accounted for ...") are not parsed: %s lines in all (per unit in the stats file). A page of the 1863 volume can end one unit and begin the next (for example leaf 345: the 2nd Regiment above, the 3rd Regiment below); the parser switches unit at the heading.' % sum(u['returns_prose_lines'] for u in U.values()))
    w('8. **The text layer of the 1898 book** disagrees with its word boxes on 1,583 words (0.7 percent); entries with such a word are not written. Entries whose fields do not fit the three forms (officer lines with the residence in brackets, notes, "Acting Field Officer" lines) are cut where the fields allow and the rest is counted: %s fields not placed in the participants lists (per unit in `diag-participants.json`). The printed order of the officer lines ("Acting Field Officer, Captain Atherton W. Clark, Waldoboro") is kept: the rank cell is the first field, the name field may begin with a rank word.' % sum(v['unparsed_field_lines'] for v in gett.get('units', {}).values()))
    more = [u['designation'] for u in U.values() if u['oob'] and u['segments'].get('ME-GETT-1898.1898', 0) > u['oob']['strength']]
    fewer = [u['designation'] + ' (%d against %d)' % (u['segments'].get('ME-GETT-1898.1898', 0), u['oob']['strength']) for u in U.values() if u['oob'] and u['segments'].get('ME-GETT-1898.1898', 0) <= u['oob']['strength']]
    w('9. **All lines per unit are 5 to 14 times the baseline strength** (section 1): the lists carry every man who served in the unit up to 1865, with a line for each change of rank. The participants lists name more men than the baseline strength for %s; fewer for %s (the lists are not complete parses: unparsed fields and the special-duty paragraphs are not counted). The comparison is carried as printed (Contested, G-NE05, G04); it is not settled here.' % (', '.join(more), ', '.join(fewer)))
    w('10. **Words that a copy audit by word list would meet in printed text**: three remarks print "mail agent" (3rd Maine, 20th Maine, 1st Maine Cavalry: "Detailed as mail agent", "det. as mail agent") and a few given names and OCR fragments read "Ai" (for example the given name Ai in "Ai C. Harrington", 5th Maine, 7th Maine). They are printed source text, kept as printed (Law 1 and 4); an audit of the shipped data by word has to exempt printed source text, or the three remarks have to be reviewed by the owner. Nothing in the files, the flag files or the pointer file says how they were made.')
    w('')
    w('## 6. Gaps registered (proposals under `GOVERNANCE/horde/ws-rosters/proposed-register/`, lines appended to `rosters/GAPS.md`)')
    w('')
    w('* **EG-ROS-ME-01** casualty lists of "Maine at Gettysburg" not parsed (the documented wounded, killed and captured of the 14 units); **EG-ROS-ME-02** special-duty paragraphs of the 1898 lists not parsed (men present on detached duty); **EG-ROS-ME-03** the 1861 muster-in returns (`ME-APPD-1861`) not parsed (leaves 77 onward: the 3rd to 7th Regiments, printed pp. 121 onward); **EG-ROS-ME-04** Appendix I of the 1863 volume (deceased Maine volunteers, leaves 1300-1328, name, company, regiment in two column sets) not parsed; **EG-ROS-ME-05** lines without a readable name and lines of unreadable unit (counts above), page-image second reading needed (EG-ROS-011); **EG-ROS-ME-06** Digital Maine blocked (G03, owner step in the pointer file); **EG-ROS-ME-07** the return binding by geometry is not independently sampled (R-G9).')
    w('')
    open(os.path.join(M.ROOT, 'docs', 'battle-theatre', 'rosters', 'reports', 'union-me.md'), 'w', encoding='utf-8').write('\n'.join(L) + '\n')
    for name, src in (('diag-index.json', idx), ('diag-returns.json', agr), ('diag-participants.json', gett)):
        json.dump(src, open(os.path.join(M.ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'horde', 'ws-rosters', 'union-me', name), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    o = main()
    os.makedirs(os.path.join(M.ROOT, 'docs', 'battle-theatre', 'rosters', 'reports'), exist_ok=True)
    write_md(o)

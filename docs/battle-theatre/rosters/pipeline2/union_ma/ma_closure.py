"""Closure texts of work item union-ma: the proposed register entries, the request note for the readers of the flag files, and the lines that are appended (by the shell,
with >>) to rosters/GAPS.md and to GOVERNANCE/decisions/DELEGATED-DECISIONS-2026-11-11.md.  All numbers come from stats.json.

    python3 -I ma_closure.py <scratch dir>

writes  GOVERNANCE/horde/ws-rosters/proposed-register/union-ma-EG-ROS-MA-0n.md  (7 files)
        GOVERNANCE/horde/requests/bt-rosters-union-ma-flag-files.md
        <scratch dir>/gaps-lines.md, <scratch dir>/decisions-lines.md, <scratch dir>/progress-line.txt   (to be appended by the caller)
Standard library only.
"""
import sys, os, json

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..', '..'))
GOV = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'horde', 'ws-rosters', 'union-ma')
REG = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'horde', 'ws-rosters', 'proposed-register')
REQ = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'horde', 'requests')


def n(x):
    return '{:,}'.format(x)


def entry(i, title, category, desc, why, searched, substitute, reconstruction, tier, competing, marking, owner, recommendation):
    return '''# EG-ROS-MA-%02d: %s

| Field | Content |
|---|---|
| ID | EG-ROS-MA-%02d |
| Requirement IDs | OA03 (complete roster section of both armies, source and rights per name); R22; Law clauses 3, 4 and 7 |
| Category | %s |
| Description | %s |
| Why literal 100%% is not possible or blocked | %s |
| Evidence searched | %s |
| Autonomous substitute applied | %s |
| Strongest evidence-based reconstruction | %s |
| Confidence tier | %s |
| Competing values | %s |
| Product marking | %s |
| Visual and audio impact | None. |
| Review status | internal review only (DEC-006: no public review label) |
| Owner decision requested | %s |
| Agent recommendation | %s |
| Status | open (proposed by bt-rosters / union-ma; not yet in register/) |
| Owner decision and date | (filled only from the Decision Log) |
''' % (i, title, i, category, desc, why, searched, substitute, reconstruction, tier, competing, marking, owner, recommendation)


def main(scratch):
    S = json.load(open(os.path.join(GOV, 'stats.json'), encoding='utf-8'))
    T = S['totals']
    U = S['units']
    CT = S['changes_totals']
    RT = S['reconciliation_totals']
    LINES = T['lines']
    os.makedirs(REG, exist_ok=True)
    os.makedirs(scratch, exist_ok=True)
    gett = T['names_gettysburg']
    ents = []
    ents.append((1, 'Rights of the 1931-35 volumes of Massachusetts Soldiers, Sailors, and Marines in the Civil War: public domain not established by the date of publication', 'rights, owner decision pending',
                 'The nine texts of the item (volumes 1 to 8 printed 1931 to 1935, the index 1937) cannot carry the basis "public domain (United States publication before 1929)". Evidence in rosters/sources/union-ma.json and GOVERNANCE/horde/ws-rosters/union-ma/rights-evidence.json: the Internet Archive flag is NOT_IN_COPYRIGHT for all nine; the printed imprint is a state publication ("Compiled and Published by the Adjutant General", Norwood Press, Brookline, Wright & Potter); a search of the whole OCR text finds no copyright notice (one misread character in volume 8); the title leaf and its blank verso of the five parsed volumes were read from page images (rights-images.json: no notice); the term arithmetic (Computed, not a legal reading) ends 31 December 2026 for the 1931 volumes, 2027 for 1932, 2028 for 1933, 2030 for 1935, 2032 for the index.',
                 'Whether a United States copyright subsisted at all is a legal question that the files cannot settle; a state publication without a notice on the title leaf or its verso is not shown to be in the public domain by the date alone.',
                 'The ledger and metadata of the nine items (14 November 2026), the OCR text of each, the images of leaves 4 to 7 of volumes 1, 2, 3, 5 and 6 (viewed: leaf 5 of volume 1 and leaf 6 of each; read by tesseract: the others).',
                 'The unit files stay in the tree under DEC-019 (the owner says the rosters are freely available online and no permission request is made); each text carries a basis string that says what the files show and that the decision is pending. Nothing was sent to anyone.',
                 'The basis strings and the evidence block; the unit files unchanged.', 'documented (imprint, flag, notice search); computed (term arithmetic); the legal question is open', 'accepted as public domain by the flag and the absence of a notice; not accepted until the term ends (1 January 2027 for volumes 1 and 2); other',
                 'The roster page shows the rights basis of the segment of each unit.', 'Owner step 4 of PRODUCTION-PLAN.md section 8: whether the 1931-35 volumes are accepted as public domain on the strength of the Internet Archive flag and the absence of a notice.',
                 'No action by the roster workstream. If the owner accepts the flag, the basis strings are changed in the pointer file by one rerun of pipeline2/union_ma/ma_sources.py.'))
    ents.append((2, 'Presence of a man at Gettysburg: no muster roll of 30 June 1863 and no list of the men present in the sources read', 'documented absence of a source',
                 'The volumes print the whole-war service of every man who was ever on the unit\'s rolls (%s lines for 24 units) and no roll of 30 June 1863. %s lines print a remark that names Gettysburg (an OCR-tolerant match, a lower bound), %s of them with a date from 1 to 3 July 1863 in the same clause. The flag files give "on the rolls in July 1863" from printed dates only (yes %s, no %s, unknown %s); it is not a statement of presence.' % (
                     n(LINES), n(gett), n(T['gettysburg_dated']), n(T['on_rolls_yes']), n(T['on_rolls_no']), n(T['on_rolls_unknown'])),
                 'The rolls are a service record, not a roster of a battle; the earlier pilots measured that a man on a roll with no recorded absence was present between 36 and 72 percent of the time (PLAN.md 2.4, gap EG-ROS-010).',
                 'The 24 unit files; the baseline strengths and the Official Records statements of strength (rosters/reports/union-ma.md section 1).',
                 'Lines that print Gettysburg are marked as such; every other man is shown as "on the rolls, names not recovered".', 'The statements of presence that the item roster-gettysburg-lists collects (the Burial Report of 1863 in tmp/library/ws9, 1863 newspaper casualty lists, the Record of the Massachusetts Volunteers 1868-70 officers and casualties).',
                 'documented absence', 'strength per unit: baseline value against Official Records statements (2nd Infantry 294 enlisted, 320 officers and men; 13th Infantry 260 muskets against 284)', 'The unit page shows the strength with its basis and "n present, names not recovered" with this id.',
                 'None needed now; evidence welcome.', 'Read the Burial Report and the 1863 casualty lists for the Massachusetts units in roster-gettysburg-lists.'))
    ents.append((3, 'Text-layer damage in the Massachusetts rolls: damaged names, dates, company headings; no second reading of page images', 'evidence present, reading incomplete',
                 '%s of the %s lines carry at least one damage code in their flag file (N name text damaged %s, Y a year damaged %s, G garbage marks %s, H head cut by a rule or by review %s, Q "Res." damaged %s, R rank damaged %s, C company heading damaged %s). Worst cases: printed page 96 of the 13th Infantry (company E; names unreadable in the text layer), the 18th Infantry (company E heading unreadable: 138 lines without a company code; 147 lines with a damaged year, the most of any unit).' % (
                     n(T['ocr_uncertain']), n(LINES), n(T['code_N']), n(T['code_Y']), n(T['code_G']), n(T['code_H']), n(T['code_Q']), n(T['code_R']), n(T['code_C'])),
                 'One ABBYY reading per item; the page images are reached only through the text PDF (page_image.py) and a second reading of a whole volume is not done here.',
                 'Flag codes per line; reconciliation with the earlier roll files (a different parser, a different text file); a search of every remark for a second entry head.',
                 'None: the printed tokens are kept as the layer has them; no letter is repaired or completed (a normalised name only as a second field in the flag file).', 'A reading of the page images of the flagged lines (pages listed by the flag files).',
                 'documented (the layer); the true names of the damaged lines are open', 'none', 'Flagged lines show "damaged in the text layer" with the code.', 'None needed now.',
                 'roster-qa reads the page images of the 13th Infantry page 96 and the 18th Infantry company D and E pages first.'))
    ents.append((4, 'The independent sample (R-G9) of the Massachusetts files is not run; residual losses are unknown', 'verification not run',
                 'Every line is machine-verified to stand in the pinned text at its offset (%s of %s) and the new files agree with the earlier files (a different parser on a different text file) on %s of %s lines, but the binding of a remark to its name, the cut of an entry and the absence of lost entries are not tested by a reader of page images. The reconciliation led to %s lines added, re-cut or moved to another company in the files of the first run; an entry whose dashes and "Res." are both damaged beyond the three head rules could still stand inside the remarks above it (a search for a rank between two dashes finds none).' % (
                     n(LINES), n(LINES), n(RT['aligned_same_letters']), n(RT['rows_new']), '39 + 49 + 208 = %d' % (CT['lines_added_by_third_head_rule'] + CT['names_cut_differently'] + CT['company_changed_by_reviewed_heading'])),
                 'The sample needs page images read by an independent reader; the proxy refuses the page-image routes of archive.org; the text PDF route reads a page at about 1.5 s of CPU.', 'The unit files, the earlier files, the pinned texts; rows per printed page (18 to 30 on every inner leaf of every unit).',
                 'None.', 'The files as written.', 'documented for what is verified; the residual loss rate is unknown', 'none', 'The unit page states that the independent sample is not run.', 'None needed now.', 'roster-qa draws 299 lines of the 24 files (a 1.0 percent upper bound at zero errors).'))
    ents.append((5, 'The 1937 Index to Army Records is pinned and not used as a second reading of the names', 'work not done',
                 'MA-SSM-1937-INDEX (Internet Archive massachusettssol1937mass, printed by Wright & Potter, Boston, 1937, 652 leaves) prints every name with the volume and page of each record for volumes I to VI and part of VII ("Aahon, Otis F. I, 618."). Its text layer interleaves the two columns of a page, so a count of references per printed page needs the word boxes of the item (a transient djvu.xml) or a positional text.',
                 'Not blocked: a work item of its own.', 'The first 12 leaves of the text read; the foreword says the index covers the Army records only.', 'None.', 'References counted per (volume, page) would be an independent census of the lines per page of each unit and would show a lost entry as a page whose count falls short.',
                 'documented (the item); the census is not made', 'none', 'None.', 'None needed.', 'Build a positional text of the index (as pipeline2/union_me/pos_text.py does for Maine) and compare per page.'))
    ents.append((6, 'The Record of the Massachusetts Volunteers (1868-70) and the Burial Report of 1863 are not read for names', 'work not done',
                 'The Adjutant General\'s Record of the Massachusetts Volunteers 1861-1865 (Internet Archive adjutantmassrec01courrich, adjutantmassrec02courrich, recordofmassachu00mass; printed 1868-70, before 1929) holds the regimental narratives and the officers; the Report of the Joint Special Committee on the burial of the Massachusetts dead at Gettysburg (1863, local copy in tmp/library/ws9) lists named dead. Neither is fetched or read for names here.',
                 'Not blocked: assigned work (the burial list and the Record belong to roster-gettysburg-lists).', 'The item list of work-items.json and GOVERNANCE/library/acquired_2.json.', 'None.', 'The officers of the Record would be a second reading of the field and staff and company officers with a pre-1929 rights basis; the burial list a stated presence.',
                 'documented (the sources exist)', 'none', 'None.', 'None needed.', 'Read both in roster-gettysburg-lists.'))
    ents.append((7, 'Baseline identities: Massachusetts Battery E (10th) and Massachusetts Battery F match no battery of the Official Records; the baseline lacks three units that have files here', 'source conflict (baseline against the Official Records)',
                 'The baseline order of battle (baseline/dist/data/oob/union_artillery.json) lists U-ART-MAE "Massachusetts Battery E (10th)" (Capt. Josiah Porter) and U-ART-MAF "Massachusetts Battery F" (Capt. Timothy Regan). Neither name is in the text of the Official Records vol. 27 parts 1 and 2 (searched); the organization table of the Army of the Potomac prints exactly four Massachusetts light batteries: 1st (A) Capt. McCartney (VI Corps), 3rd (C) Lieut. Walcott (V Corps), 5th (E) Capt. Phillips and 9th Capt. Bigelow (First Volunteer Brigade). The data audit docs/data-audit/fixes.json already notes that the Fifth Corps held 5th U.S. Battery I and the First Volunteer Brigade Pennsylvania Batteries C and F. The baseline has no row for the 11th Infantry, the 1st Company Sharpshooters or the 1st Battery (A), which have files here (earlier gap G-NE03).',
                 'The identities of the baseline rows are not settled by a roster; the baseline is not in this workstream.', 'Text search of OR 27 parts 1 and 2 for the two captains and for "10th Massachusetts Battery"; the organization table region; data2/units.json attached_to_no_unit.',
                 'No unit file is made for the two baseline batteries; the 1st Battery (A) file carries the roll the earlier family had marked unmapped.', 'The four Massachusetts batteries of the table have files (1st, 3rd, 5th, 9th).', 'documented (the table); the baseline rows are unsupported by the Official Records', 'baseline (two batteries E (10th) and F) against the Official Records table (four batteries)',
                 'The unit page lists the four batteries of the table only.', 'The OOB agent or the owner corrects the identities of U-ART-MAE and U-ART-MAF (a baseline change, not made here) and adds rows for the three units.', 'Correct the baseline against the table; keep this entry until then.'))
    for e in ents:
        with open(os.path.join(REG, 'union-ma-EG-ROS-MA-%02d.md' % e[0]), 'w', encoding='utf-8') as f:
            f.write(entry(*e))
    # request note
    note = '''# To the roster index and the roster page (roster-index, roster-app): flag files beside the Massachusetts unit files

From: bt-rosters / union-ma, 2026-11-14. Detail: `docs/battle-theatre/rosters/reports/union-ma.md` (section 2). Earlier notes of this kind: `bt-rosters-union-me-flag-files.md`, `bt-rosters-union-nh-flag-files.md`.

## What
Beside each unit file `data2/union/ma/<unit>.jsonl.gz` (24 units, %s lines) there is `<unit>.flags.json.gz`, form `roster2-flags/1` as for the Maine and New Hampshire files, with these differences the reader must handle:
- the damage codes are **not** the Maine or New Hampshire codes: `N` name text damaged, `H` head of the entry cut by a rule that is a reading or by review (including the 39 lines added by the third head rule), `R` printed rank damaged, `Q` the word "Res." damaged, `C` company heading damaged (the row has no company code), `Y` a year damaged, `G` garbage marks of the scan; the legend is in each file under `codes`, so a reader should show the legend of the file and not a fixed table;
- extra keys: `normalised_names` (one string per row, same order; "Given Surname", no letter changed; an empty string where the printed head has no comma), `head_kinds` (row numbers by kind of head: `res-damaged`, `res-lost`, `junk-after-d2`, `cut:reviewed`, `cut:fragment-extended`, `cut:alternate-name`, ...), `head_marks`, `company_inferred` (`[row, letter]` pairs: the letter the sequence of headings gives for the 138 lines of the 18th Infantry whose company heading is unreadable; the row's `co` stays empty), `reviewed_headings` (the 10th Infantry company K and the 19th Infantry UNASSIGNED, read by review), `names_gettysburg` and `gettysburg_dated` (rows whose printed remarks name Gettysburg, and those whose clause also prints 1, 2 or 3 July 1863; counts of printed text, not statements of presence), `printed_page_from_running_head` (`[row, page, confirmed]` for the rows whose leaf has no printed page in the page-number file: the unit file's `pg` is empty for them);
- `on_rolls_july_1863` holds `yes` and `no` (row number and an index into `basis`) inferred from printed dates only; every other row is unknown; the rule is in the file under `rule`.

## Why
The brief asks for an `ocr_uncertain` mark and for an "on the rolls in July 1863" mark only where printed dates support it. The row format has no field for either, and DD-ROS-01 keeps presence labels out of the rows.

## Exact change asked (not made: the readers and the page are not in my ownership list)
The index should list the flag file of each unit (the pointer file `rosters/sources/union-ma.json` lists the sha256 of each unit file and each flag file under `unit_files`); the page should show "damaged in the text layer" on `ocr_uncertain` rows with the codes of that file, "on the rolls in July 1863 (inferred from printed dates)" on `yes` rows with the basis string, the normalised name as a second line under the printed name (the printed name stays the first), and the rights basis of the segment (`rights.basis` of the text id in the pointer file: it says that public domain is not established by the date and that an owner decision is pending). Rows with `company_inferred` should show no company, with the inferred letter marked as inferred. The unit page should also show the gaps EG-ROS-MA-01 to EG-ROS-MA-07 (proposals in `GOVERNANCE/horde/ws-rosters/proposed-register/`).

When done, append `-- handled: <what was done>` to this note with a shell `>>`.
''' % n(LINES)
    with open(os.path.join(REQ, 'bt-rosters-union-ma-flag-files.md'), 'w', encoding='utf-8') as f:
        f.write(note)
    # gaps lines
    g = []
    g.append("| G-MA01 | **Massachusetts, 24 units: rights of the 1931-35 volumes** (EG-ROS-MA-01): printed 1931 to 1935 (index 1937), after the 1929 cutoff; Internet Archive flag NOT_IN_COPYRIGHT; no copyright notice in the OCR text; title leaf and blank verso read from images (5 volumes) | metadata, notice search, page images, term arithmetic (31 December 2026 for the 1931 volumes) | Owner step 4: accept the flag as the basis, or wait for the term |")
    g.append("| G-MA02 | **Massachusetts: presence on 1-3 July 1863** (EG-ROS-MA-02): no muster roll of 30 June 1863; %s lines of %s name Gettysburg; every other man is shown as on the rolls, names not recovered | the 24 unit files; strength statements of the Official Records | Open: roster-gettysburg-lists (Burial Report 1863, newspaper casualty lists, the Record 1868-70) |" % (n(gett), n(LINES)))
    g.append("| G-MA03 | **Massachusetts: damaged lines** (EG-ROS-MA-03): %s lines flagged (N %s, Y %s, G %s, H %s, Q %s, R %s, C %s); the 13th Infantry printed page 96 and the 18th Infantry companies D and E are the worst | flag codes; reconciliation with the earlier files | Open: page-image reading of the flagged pages (text PDF route) |" % (n(T['ocr_uncertain']), n(T['code_N']), n(T['code_Y']), n(T['code_G']), n(T['code_H']), n(T['code_Q']), n(T['code_R']), n(T['code_C'])))
    g.append("| G-MA04 | **Massachusetts: independent sample (R-G9) not run; residual losses unknown** (EG-ROS-MA-04); the first run's 33,748 lines were corrected to %s after the reconciliation (39 entries added, 49 names re-cut, 208 company codes) | machine verification of every line; two readings compared; rows per leaf 18 to 30 | Open: roster-qa, 299 lines of the 24 files |" % n(LINES))
    g.append("| G-MA05 | **Massachusetts: the 1937 Index to Army Records not used as a second reading** (EG-ROS-MA-05) | pinned text read at its first leaves | Open: positional text of the index, references per (volume, page) against the lines per page |")
    g.append("| G-MA06 | **Massachusetts: the Record of the Massachusetts Volunteers 1868-70 and the Burial Report of 1863 not read for names** (EG-ROS-MA-06) | listed in the pointer file as leads | Open: roster-gettysburg-lists |")
    g.append("| G-MA07 | **Massachusetts: baseline batteries E (10th) and F match no battery of the Official Records; the baseline lacks the 11th Infantry, the 1st Company Sharpshooters and the 1st Battery (A)** (EG-ROS-MA-07; supersedes the roster part of G-NE02 and G-NE03) | text search of OR 27 parts 1 and 2; the organization table; docs/data-audit/fixes.json | Owner or OOB agent: correct the baseline identities and add the three rows |")
    with open(os.path.join(scratch, 'gaps-lines.md'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(g) + '\n')
    # decisions
    d = []
    d.append('')
    d.append('## Added 2026-11-14 by bt-rosters / union-ma: the Massachusetts roster files (DELEGATED, reversible by the owner, not owner decisions; detail in rosters/reports/union-ma.md)')
    d.append('')
    d.append('| id | question | options | chosen default | evidence | tier | reversibility | product marking |')
    d.append('|---|---|---|---|---|---|---|---|')
    d.append('| DD-ROS-MA-01 | The rights basis written for the nine texts of Massachusetts Soldiers, Sailors, and Marines in the Civil War (1931-37) | the basis "public domain (United States publication before 1929)"; the Internet Archive flag accepted as the basis; a basis that states what the files show and that the question is open | The third. Each text carries "printed <year> (state publication), after the 1929 cutoff: public domain is not established by the date of publication; Internet Archive flag NOT_IN_COPYRIGHT; no copyright notice found in the OCR text; owner decision pending (owner step 4)" and an evidence block (imprint with offset, the notice search, the title leaf and verso of five volumes read from page images, the term arithmetic). The unit files stay in the tree (DEC-019); nothing is sent to anyone | rosters/sources/union-ma.json; GOVERNANCE/horde/ws-rosters/union-ma/rights-evidence.json, rights-images.json; the verso leaves of volumes 1, 2, 3, 5 and 6 and the title page of volume 1 were looked at | documented (imprint, flag, notice search); computed (term) | change the basis in the pointer file by rerunning pipeline2/union_ma/ma_sources.py | the roster page shows the basis of the segment |')
    d.append('| DD-ROS-MA-02 | Whether the parser of the first run is corrected on the evidence of the earlier roll files | leave the 24 files as written and list the defects; correct the rules and regenerate | Corrected and regenerated: a third head rule (39 entries added), name-cut refinements (49 names re-cut), three reviewed name cuts and two reviewed headings (208 company codes), a number alone on its line at a page break kept (26 lines longer); %s lines before, %s now; no line removed; the earlier files agree with the new files on %s of %s names | rosters/reports/union-ma.md section 5; GOVERNANCE/horde/ws-rosters/union-ma/changes-after-reconciliation.json, differences-<unit>.csv, reconciliation.json | inferred (where an entry begins in damaged places); documented (the printed tokens) | git history of the unit files; the old rules are in the history of pipeline2/union_ma | flagged H where the head was cut by a rule that is a reading |' % (n(CT['lines_before']), n(CT['lines_now']), n(RT['aligned_same_letters']), n(RT['rows_new'])))
    d.append('| DD-ROS-MA-03 | The company code of a line under a damaged heading | the letter the sequence of headings gives; empty, with the inferred letter in the flag file; a reviewed reading where the letters of the heading are legible | Empty with the inferred letter in `company_inferred` for the 18th Infantry (company E, 138 lines, the heading unreadable); a reviewed reading, located by the exact text of the line, for the 10th Infantry COMPANY "K" (printed COMPANY \'\'K\'l, 112 lines) and the 19th Infantry UNASSIGNED (printed UX-\\SSIGXED, 96 lines); a letter is never supplied from the sequence | union_ma/ma_cuts.py HEADINGS; flag files (reviewed_headings, company_inferred); the earlier files wrote E for the 18th and put the 10th K lines under I and the 19th UNASSIGNED lines under K | documented (legible heading); inferred (sequence) | edit HEADINGS and rerun parse_ma_ssm.py --write | lines without a company show none |')
    d.append('| DD-ROS-MA-04 | The rule for "on the rolls in July 1863" and how its answers are read | the first rule (clauses cut at a semicolon); a rule that cuts the clauses the OCR ran together and keeps a "yes" back wherever a word or a date is damaged or cannot be placed | The second: yes %s, no %s, unknown %s (the first rule: 13,115 / 19,192 / 1,480 on the same lines); a printed separation before 1 July 1863 gives no, a start after 3 July 1863 gives no, every other line is unknown unless nothing doubtful stands in the entry; a sample of 90 lines was read by the author (0 wrong yes in 50, 0 unsupported no in 24); the independent sample is roster-qa\'s | union_ma/ma_dates.py; GOVERNANCE/horde/ws-rosters/union-ma/onroll-sample-reading.json | inferred | rebuild with another rule | "on the rolls in July 1863 (inferred from printed dates)"; never "present" |' % (n(T['on_rolls_yes']), n(T['on_rolls_no']), n(T['on_rolls_unknown'])))
    d.append('| DD-ROS-MA-05 | The two baseline batteries that match no battery of the Official Records (G-NE02) and the earlier file marked unmapped | make files for them; map them to a battery by guess; make no file and register the conflict | No file; EG-ROS-MA-07 registers the conflict between the baseline (Massachusetts Battery E (10th), Capt. Porter; Battery F, Capt. Regan) and the Official Records table (four batteries: 1st (A), 3rd (C), 5th (E), 9th), neither captain\'s name being in OR 27 parts 1 and 2; the 1st Battery (A) McCartney is in the table and has its file | the organization table of the Army of the Potomac (offsets 554043, 557630, 569271, 569347 of the part 1 text); docs/data-audit/fixes.json rows for U-ART-MAE and U-ART-MAF | documented | add files when the baseline is corrected | the unit page lists the four batteries of the table |')
    with open(os.path.join(scratch, 'decisions-lines.md'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(d) + '\n')
    prog = ('2026-11-14 bt-rosters / union-ma (round 1 closed; agent report; nothing committed): 24 unit files (%s lines; the first run\'s 33,748 corrected after the reconciliation with the earlier roll files: 39 missed entries added, 49 names re-cut, 208 company codes fixed by two reviewed headings, 26 page-break numbers kept), '
            'verify_unit.py 24 of 24 files 0 V1 and 0 V3 defects, second run identical bytes; reconciliation with rosters/data/NE/massachusetts (%s of %s names aligned, 0 only in the earlier files, 42 only in the new, differences-*.csv); the on-the-rolls rule repaired (lost semicolons; sample 50/24/16 read, 0 wrong); '
            'pointer file with rights per text (the 1931-35 volumes carry no pre-1929 basis: owner step 4; title leaf and verso of 5 volumes read from images), MANIFEST, report rosters/reports/union-ma.md, G-MA01 to G-MA07, EG-ROS-MA-01 to -07, DD-ROS-MA-01 to -05, request note for the flag files, node test roster-union-ma.test.mjs 124 pass; '
            'not run: R-G9 sample, page-image second reading, the 1937 index, the full node suite, a browser.\n' % (n(LINES), n(RT['aligned_same_letters']), n(RT['rows_new'])))
    with open(os.path.join(scratch, 'progress-line.txt'), 'w', encoding='utf-8') as f:
        f.write(prog)
    print('closure texts written')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else '/tmp/ma_closure'))

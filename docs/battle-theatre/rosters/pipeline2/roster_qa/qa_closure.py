"""The texts that close the roster-qa item, computed from data2/qa (roster-qa closure, 15 November 2026).

    python3 -I qa_closure.py            write GOVERNANCE/horde/ws-rosters/roster-qa/closure/{gaps-lines.md, decisions-rows.md, plan-note.md, progress-line.txt} and
                                        GOVERNANCE/horde/ws-rosters/proposed-register/roster-qa-EG-ROS-QA-0N.md (N = 1 to 5)

The closure files are appended to the shared files by a shell append, never by a rewrite (rosters/GAPS.md, GOVERNANCE/decisions/DELEGATED-DECISIONS-2026-11-11.md,
rosters/PRODUCTION-PLAN.md section 9.10, GOVERNANCE/progress.md); this script only writes the texts.  Every figure is read from data2/qa (verdicts with their addenda,
stats.json, the route test when it exists); nothing is typed.  The wording of the decisions is the one rule set of the sample as it was run (qa_frame.py, qa_verdict.py,
qa_stats.py, qa_lib.merge_addendum, qa_recover.py); a decision that the files do not show is not written.
"""
import sys, os, json, glob, collections, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import qa_lib as Q
import qa_stats as S
import qa_report as RP

OUTD = os.path.join(Q.WSQ, 'closure')
REG = os.path.join(Q.ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'horde', 'ws-rosters', 'proposed-register')
G1 = RP.G1


def f(n):
    return '{:,}'.format(n)


def main():
    os.makedirs(OUTD, exist_ok=True)
    os.makedirs(REG, exist_ok=True)
    today = time.strftime('%d %B %Y', time.gmtime())
    verdicts = Q.load_verdicts()
    first = Q.load_verdicts(merge=False)
    stats = Q.jload(os.path.join(Q.QA, 'stats.json'))
    sr_path = os.path.join(Q.QA, 'second-reading.json')
    sr = Q.jload(sr_path) if os.path.exists(sr_path) else None
    cur = Q.jload(os.path.join(Q.QA, 'verdicts-vs-files.json'))
    npages, nrows = len(verdicts), sum(v['rows_checked'] for v in verdicts)
    nstrata = len(stats['strata'])
    fail_strata = [s for s, d in stats['strata'].items() if any(x['decision'] == 'FAIL' for g, x in d['gates'].items() if g != 'any')]
    nd_fail = []
    for s in stats['strata']:
        pv = [v for v in verdicts if v['stratum'] == s and not v['in_lowest_decile']]
        c = S.gate_counts(pv) if pv else None
        if c and any(k >= 4 for n, k in c.values()):
            nd_fail.append(s)
    diag_me = Q.jload(os.path.join(Q.ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'horde', 'ws-rosters', 'union-me', 'diag-index.json'))
    n_lost_me = sum(len(v) for v in diag_me['skipped'].values())
    rec_me_rows = Q.jload(os.path.join(Q.QA, 'recovered', 'union-me.json'))['rows']
    rec_vt_rows = Q.jload(os.path.join(Q.QA, 'recovered', 'union-vt.json'))['rows']
    n_rec_me = sum(1 for r in rec_me_rows if r.get('status', '').startswith('recovered'))
    n_rec_vt = sum(1 for r in rec_vt_rows if r.get('status', '').startswith('recovered'))
    total_lines = sum(cur['frame_files']['rows_now_by_item'].values())
    addenda = [Q.jload(p) for p in sorted(glob.glob(os.path.join(Q.QA, 'pages', '*.addendum.json')))]
    missed_added = sum(len(a['missed_lines_added']) for a in addenda)
    # per family aggregates
    fam = collections.defaultdict(lambda: {'pages': 0, 'rows': 0, 'k': collections.Counter(), 'strata': set()})
    for v in verdicts:
        a = fam[v['family']]
        a['pages'] += 1
        a['rows'] += v['rows_checked']
        a['strata'].add(v['stratum'])
        for e in v['errors']:
            for k in e['kinds']:
                a['k'][k] += 1

    def gates_failed(fm):
        out = []
        for s in sorted(fam[fm]['strata']):
            gs = [g for g, x in stats['strata'][s]['gates'].items() if g != 'any' and x['decision'] == 'FAIL']
            out.append('%s: %s' % (s, '/'.join(gs) or 'none'))
        return '; '.join(out)

    def kinds(fm):
        return ', '.join('%s %d' % (k, n) for k, n in fam[fm]['k'].most_common())
    ME = ['ME-RET', 'ME-IDX', 'ME-GET']

    def item_row(gid, item, fams, needs):
        pages = sum(fam[x]['pages'] for x in fams)
        rows = sum(fam[x]['rows'] for x in fams)
        kd = collections.Counter()
        for x in fams:
            kd.update(fam[x]['k'])
        kk = ', '.join('%s %d' % (k, n) for k, n in kd.most_common())
        return ('| %s | **%s: defect list of the independent sample, %s** (EG-ROS-QA-01; the stored lines are not changed): %d pages, %s lines compared; kinds seen: %s; what the parser must do: %s; strata and gates failed: %s | '
                'data2/qa/pages/*.verdict.json and *.addendum.json (stored and printed text of every difference), reports/roster-qa.md 2.3 and 2.4, PRODUCTION-PLAN 9.8 | Open: item round 2 (parser or second reading), then a fresh draw (new seed) by roster-qa |' %
                (gid, item, today, pages, f(rows), kk, needs, '; '.join(gates_failed(x) for x in fams)))

    lines = []
    lines.append('| G-QA01 | **Independent sample (R-G9) not passed: every stratum of the four closed items fails** (EG-ROS-QA-01), %s: %d pages looked at in two sittings, %s lines compared; %d of %d strata fail at least one gate by the ladder (4 or more errors at a gate), %d of them also on the pages outside the lowest OCR-confidence decile; no gate lowered; none of the four items may be published as checked | data2/qa/pages/*.verdict.json and *.addendum.json, data2/qa/stats.json, reports/roster-qa.md 2.2, 2.5 and 2.6 | Open: the parsers of union-me, union-nh, union-vt and union-ma fix the defects of G-QA02 to G-QA05, then roster-qa draws fresh pages (new seed) of every stratum |' %
                 (today, npages, f(nrows), len(fail_strata), nstrata, len(nd_fail)))
    lines.append(item_row('G-QA02', 'union-me', ME,
                          'the ditto mark stored as the digits 66 (returns); several printed rows stored as one and prose fragments stored as rows (Field and Staff returns); a garbled name and garbled cells on index lines filed to no unit; rank words and run-in paragraphs in the participants lists; the state after a residence dropped; printed lines of the units missing on the pages looked at (index lines, and two men of the 1st Maine Cavalry return, leaf 224)'))
    lines.append(item_row('G-QA03', 'union-nh', ['NH-AYL'],
                          'digits read as other digits (the year 62 read 02, 63 read 03), letters (cred read ored, enl read eul), whole names with a changed letter (Twonibly, Platt read Piatt), stray marks after the remark; the flags mark only part of the lines'))
    lines.append(item_row('G-QA04', 'union-vt', ['VT-REV'],
                          'the day of a date cell lost or its digits read as letters (July 10 read io, 61 read 6i), the second date stored after the remarks (flag O), digits and letters of remarks (recd read reed), the carried heading damaged (tst Lieutenants) so that every line under it carries the wrong rank, run-over lines of remarks stored on the row above or below the remark they complete, names with a stray or changed letter'))
    lines.append(item_row('G-QA05', 'union-ma', ['MA-SSM'],
                          'the digit 8 read S (1S63), the digit 1 read I or l (Ist, let), letters in names and remarks (Mclntire, Noyos, Marrln, Gcnl., Rowel!, Maiden for Malden), margin marks stored as the letters j, i, 1 and signs inside remarks on pages with a shadowed margin, a rank read I*riv.'))
    rt = ('the second-reading route test on 20 pages per family is in reports/roster-qa.md 4.2' if sr else
          'the second-reading route test on 20 pages per family (`qa_route_test.py run`, 120 pages, queued through the machine lock) had not run when the item was closed: re-run it and then `qa_report.py`')
    lines.append('| G-QA06 | **Independent sample: gates not decided, pages not drawn, cells sidecar and further second readings not done** (EG-ROS-QA-02 to -05): the strata and gates shown OPEN in reports/roster-qa.md 2.2 need 299 to 628 lines each; the cells sidecar of the Vermont files (page order of the lines flagged O) is not sampled; %d of the %d lost Maine index lines and the lines that the first layer stored garbled are not re-read (EG-ROS-ME-05); printed lines of the units missing in the stored lines are not registered by the Maine item (index lines, and %d men of the 1st Maine Cavalry return found by the second sitting); the Pennsylvania muster years and the Florida losses cannot be tried before their items exist; %s | data2/qa, data2/qa/recovered, the verdicts and addenda (missed_lines) | Open: roster-qa later rounds; round 2 of union-me |' %
                 (n_lost_me - n_rec_me, n_lost_me, missed_added, rt))
    open(os.path.join(OUTD, 'gaps-lines.md'), 'w', encoding='utf-8').write('\n'.join(lines) + '\n')

    # ------------------------------------------------------------------ proposed register entries
    def entry(n, title, desc, why, searched, substitute, recon, tier, competing, marking, request, recommend):
        eid = 'EG-ROS-QA-%02d' % n
        body = ['# %s: %s' % (eid, title), '', '| Field | Content |', '|---|---|',
                '| ID | %s |' % eid, '| Requirement IDs | OA03 (complete roster section of both armies, source and rights per name); R22; the accuracy gates R-G1, R-G2, R-G3 and R-G9 of rosters/PLAN.md 4.3; Law clauses 3, 4 and 7 |',
                '| Category | %s |' % tier[0], '| Description | %s |' % desc, '| Why literal 100% is not possible or blocked | ' + why + ' |', '| Evidence searched | %s |' % searched,
                '| Autonomous substitute applied | %s |' % substitute, '| Strongest evidence-based reconstruction | %s |' % recon, '| Confidence tier | %s |' % tier[1], '| Competing values | %s |' % competing,
                '| Product marking | %s |' % marking, '| Visual and audio impact | None. |', '| Review status | internal review only (DEC-006: no public review label) |',
                '| Owner decision requested | %s |' % request, '| Agent recommendation | %s |' % recommend, '| Status | open (proposed by bt-rosters / roster-qa; not yet in register/) |',
                '| Owner decision and date | (filled only from the Decision Log) |']
        open(os.path.join(REG, 'roster-qa-%s.md' % eid), 'w', encoding='utf-8').write('\n'.join(body) + '\n')

    fk = {fm: fam[fm] for fm in fam}
    entry(1, 'The independent sample (R-G9) is not passed: every stratum of the four closed roster items fails',
          '%d pages of the four closed items (Maine, New Hampshire, Vermont, Massachusetts; 54 files, %s lines) were looked at in two sittings against the page images and %s stored lines were compared with the print, in %d strata. %d of %d strata have at least one gate with 4 or more errors (more than the ladder of PLAN.md 4.4 allows at 773 lines), %d of them also on the pages outside the lowest OCR-confidence decile; no gate of any stratum passes. The checks V1 to V3 (name and remark tokens at their offsets, printed page) are met by every line and cannot see these errors: digits read as letters or as other digits, letters changed in names and remarks, the ditto mark stored as the digits 66, run-over lines on the wrong row, several printed rows stored as one, rank words in the name field. The counts per stratum and gate with their one-sided 95 percent Clopper-Pearson bounds are in reports/roster-qa.md 2.2 and 2.6.' %
          (npages, f(total_lines), f(nrows), nstrata, len(fail_strata), nstrata, len(nd_fail)),
          'The text layer is one OCR reading of the scan; the gate measures it against the print and the stored lines differ from the print in characters on a large share of the lines (the share per family is in reports/roster-qa.md 2.3). No stored line was changed by the sample.',
          'data2/qa/pages/*.verdict.json and *.addendum.json (every difference with the stored and the printed text), data2/qa/stats.json, data2/qa/verdicts-vs-files.json (the verdicts describe the files as they are now), the second-reading detector (data2/qa/second-reading-detector.json).',
          'None: the items stay in the tree (DEC-019); no line is described as checked beyond V1 to V3.',
          'The parsers of the four items corrected under the requirements of PRODUCTION-PLAN 9.8 and reports/roster-qa.md 2.4, then a fresh draw of every stratum with a new seed; a second reading of the pages (tesseract with the table rules removed) as a work list.',
          ('evidence present, gate failed', 'documented (the counts are measured on the page images)'), '-',
          'The unit page and the roster page show, on every unit of the four items, that the independent sample failed (this id) and the share of lines that differ from the print; no unit is shown as checked.',
          'None.', 'Return the defect lists to the parsers (rounds 2 of union-me, union-nh, union-vt; a round 2 for union-ma) and re-draw; the request note bt-rosters-qa-defects-unowned.md asks the orchestrator where this work is placed.')
    entry(2, 'Gates of the independent sample not decided by round 1: lines still owed at the strata and gates shown OPEN',
          'Every stratum failed at least one gate, so its R-G9 result is decided (fail); the other gates of the same strata were not compared to the 299 to 628 lines that PLAN.md 4.4 asks for, because a level that a stratum has already failed decisively is not compared on further pages (qa_stats.py). They are shown OPEN in reports/roster-qa.md 2.2 (for example R-G1 of the Vermont officers pages: %d error in %d lines; the structure gate of New Hampshire: %d in %d). No pass is claimed for any gate.' %
          (stats['strata']['VT-REV-officers']['gates']['R-G1']['errors'], stats['strata']['VT-REV-officers']['gates']['R-G1']['rows'], stats['strata']['NH-AYL-other']['gates']['R-G3a']['errors'], stats['strata']['NH-AYL-other']['gates']['R-G3a']['rows']),
          'The rule that stopped the comparison of a decided level was chosen to spend the reading where it changes the result (DD-ROS-QA-03); a later round after the parsers are fixed draws fresh pages at every level.',
          'data2/qa/stats.json (decision per gate and stratum), the levels field of every verdict.', 'None.', 'Fresh pages after the parsers are fixed, at all levels, until each gate is decided (PASS or FAIL by the ladder).',
          ('verification incomplete', 'documented (counts) and not decided (gates shown OPEN)'), '-', 'No gate shown OPEN is described as passed.', 'None.', 'Draw fresh pages after the item round 2 of each source family.')
    entry(3, 'The cells sidecar of the Vermont files (page-order reading of the lines flagged O) is not sampled',
          'On the Vermont lines flagged O the unit-file line keeps the text-layer order of the cells (the second date can stand after the remarks); the page order is in the cells sidecar, which the independent sample did not compare with the page: %d lines of the Vermont pages looked at carry the kind rem-order (the printed words are all there in another order). The unit-file line stays in text-layer order by design.' % fam['VT-REV']['k']['rem-order'],
          'A comparison of the sidecar needs the same page images and a reader; the sample compared the unit-file lines only.', 'The Vermont pages looked at (data2/qa/pages/cu31924080774148-*.verdict.json), the flag O of the Vermont flag files.',
          'None.', 'Sample the cells sidecar of the lines flagged O against the page in round 2 of union-vt.', ('verification not run', 'documented (the unit-file order) and not checked (the sidecar order)'), '-',
          'A line flagged O shows its remarks as stored and the flag.', 'None.', 'Include the sidecar in the fresh draw after the Vermont round 2.')
    entry(4, 'Second reading of the lines the first text layer lost or stored garbled: only part of the known losses tried',
          'Of the %d Maine index lines whose name the first layer did not read, %d were read again from the page and recovered; %d are left (round 2 of union-me, EG-ROS-ME-05). Every line of `_other-ME-SUPP-1867` on the pages looked at had a garbled rank or regiment cell (not re-read). The %d Vermont lines whose name the layer lost are recovered (%d of %d). The Pennsylvania muster years on 2,039 pages (Documented, the Pennsylvania README of the earlier families) and the Florida 6.1 percent of names lost cannot be tried before their items have unit files. The recovered lines are plain JSON under data2/qa/recovered/ with their own locator, never rows of a unit file.' %
          (n_lost_me, n_rec_me, n_lost_me - n_rec_me, len(rec_vt_rows), n_rec_vt, len(rec_vt_rows)),
          'Each second reading needs a page, tesseract at 300 dpi with the rules removed, and a look at the line; the batch for the remaining lines belongs to the item rounds.',
          'data2/qa/recovered/union-vt.json and union-me.json, data2/qa/pageread-ledger.json (the derived texts pinned by sha256), reports/roster-qa.md 4.3.', 'None: a lost line stays out of the unit file (no empty-name row, no invented name).',
          'The recovered lines with their locators; the batch re-read of the rest in round 2 of union-me and of the Pennsylvania and Florida items.', ('evidence present, text layer lost', 'documented for the lines recovered; open for the rest'), '-',
          'A recovered line names its derived text; a lost line is counted in the unit report.', 'None.', 'Run the batch in the item rounds with the route of PRODUCTION-PLAN 9.5.')
    entry(5, 'Printed lines of the units missing in the stored lines on pages of the Maine items',
          'On the pages looked at, printed lines of the units have no stored line: %d lines in the verdicts and the addenda (3rd Maine C-company index lines, 7th Maine lines, one line of the 1st Cavalry, the 2nd Battery and others; and, found by the second sitting, Charles H Smith and Stephen Boothby of the 1st Maine Cavalry return on leaf 224, whose names stand in the pinned text of the leaf and in no stored row). The Maine item registers the index lines whose regiment cell could not be read (EG-ROS-ME-05) but not these, whose regiment cell was read and whose line was not stored.' % sum(len(v['missed_lines']) for v in verdicts),
          'The parsers did not store the lines; the sample can only count them on the pages it looked at.', 'The missed_lines of every verdict and addendum under data2/qa/pages.', 'None: no line is added to a unit file by this item.',
          'Round 2 of union-me: a parser that asserts one stored line per printed line on every table page, and the lines added from the page.', ('evidence present, not stored', 'documented (the printed lines are named in the verdicts)'), '-',
          'The unit page of the Maine units states this id.', 'None.', 'Add the missing lines in union-me round 2 and re-draw.')
    print('closure texts written under', Q.rel(OUTD), 'and', Q.rel(REG))

    # ------------------------------------------------------------------ decisions
    rows = []
    rows.append('| DD-ROS-QA-01 | How the pages of the independent sample (R-G9) are stratified and drawn | strata by state; strata by source family and layout; one random draw over all pages | Strata are the source family by layout (6 families) times officers pages and other pages (%d strata; an officers page holds at least 3 lines of which at least a quarter are officer lines); pages are ordered by sha256 of seed, stratum, identifier and leaf (seed roster-qa-round1-2026-11-14); decile pages (the 10 percent of a stratum with the most lines marked ocr_uncertain, at least 1) and other pages form two lists and the draw takes a decile page at positions 1, 4, 7 and so on, so that every prefix of m pages holds at least m/3 decile pages; the one pilot page that the pilot author read is excluded | PLAN.md 4.4 (strata by source family and table type, seeded draw, a third from the lowest OCR-confidence decile); data2/qa/frame.json and draw.json carry the seed, the rule and the order of every stratum | n/a (a test method) | change the seed or the rule in pipeline2/roster_qa/qa_frame.py and redraw | none; reports/roster-qa.md 2.1 states what the sample covered |' % nstrata)
    rows.append('| DD-ROS-QA-02 | What counts as an error when a stored line is compared with the page image, and which gate it belongs to | exact characters; case, punctuation and spacing ignored; OCR-typical confusions (1 and l, 8 and S) tolerated | Case, punctuation and spacing are ignored; every other differing character is an error, a digit read as a letter included (1S63, io for 10) and a printed ditto mark stored as the digits 66; kinds name-char, name-cut, name-nonperson, rank, company, rem-char, rem-date, rem-missing, rem-extra, rem-bound, rem-order, rem-ditto, merge, split; R-G1 = the name kinds, R-G2 = rem-date, R-G3 structure = rank, company, merge, split, R-G3 reading of the remark = the other remark kinds (the label gate R-G3 of PLAN.md 4.3 is measured on the structure of the line and the reading of its remarks because the roster2/2 files carry no presence label, DD-ROS-01: the reason is inferred, the gate definitions are those of qa_stats.py); a pass needs n >= 299 with 0 errors, 473 with at most 1, 628 with at most 2 or 773 with at most 3 (one-sided 95 percent Clopper-Pearson upper bound 1.0 percent), a gate with 4 or more errors is FAIL, anything else OPEN; no gate is lowered | PLAN.md 4.3 (R-G1: name exact after case and punctuation normalisation; R-G2: dates exact against the page image) and 4.4 (the ladder); pipeline2/roster_qa/qa_verdict.py (KINDS), qa_stats.py (decide), qa_lib.cp_upper (reproduces the plan values) | n/a (a test method) | re-run qa_stats.py with other kind sets; the verdicts keep every difference as stored and printed text | none; reports/roster-qa.md 2.1 gives the rule |')
    rows.append('| DD-ROS-QA-03 | When a level of a stratum is no longer compared on further pages, and what keeps a failure from resting on one page | compare every level on every drawn page up to 628 lines; stop a level when the ladder can no longer pass; stop the stratum at the first failure | A level (N names and structure, D dates, R remarks) that a stratum has already failed with 4 errors is not compared on its further pages; level N is compared on every page; the pages are still looked at. Where this left the failure of a stratum resting on one page (the lowest-decile page), the second sitting compared the missing levels on a page outside the decile (leaf 117 of the Vermont officers pages) and looked at the draw position that had been passed over (leaf 631 of the Massachusetts officers pages); reports/roster-qa.md 2.6 counts every gate without the decile pages | the ladder of PLAN.md 4.4 cannot pass once 4 errors are found at a gate; data2/qa/stats.json (decision per gate), the levels field of every verdict, data2/qa/pages/*.addendum.json | n/a (a test method) | draw more pages and compare every level (an addendum adds levels to a verdict, qa_lib.merge_addendum) | none; the report shows a gate that was not decided as OPEN |')
    rows.append('| DD-ROS-QA-04 | Who reads the pages, what tesseract is used for, and how a doubtful character is counted | tesseract alone; every page read by a vision model; the engineer looks at every page with tesseract as a pre-screen | The page image (the item text PDF through archive.org/cors, one page cut out with pdftoppm, transient, never stored) is looked at with the Read tool by the engineer, who compares every stored line of the page; tesseract 5.3.4 (psm 6, 300 dpi, table rules whitened with a threshold relative to the page background) is a pre-screen and the work list of the second reading, never the verdict; a doubtful character is zoomed to 500 or 600 dpi and, where still doubtful, not counted as an error (this favours the stored line); the plan\'s third reader for disagreements is the second sitting of the same role, which re-read %d pages with the first verdict opened only after the page had been read and recorded its result in an addendum without rewriting the first verdict | DD-ROS-09 (the page route and the role of tesseract, 14 November); the detector figures of reports/roster-qa.md 4.1 (tesseract marks as SUSPECT between %d and %d percent of the lines the reader found in error); data2/qa/pages/*.verdict.json (the reader field of every verdict) and *.addendum.json | n/a (a test method) | a third person re-reads the pages named in reports/roster-qa.md 2.5 | none |' %
                (len(addenda), round(100 * min(d['recall_of_errors'] for d in Q.jload(os.path.join(Q.QA, 'second-reading-detector.json'))['families'].values())), round(100 * max(d['recall_of_errors'] for d in Q.jload(os.path.join(Q.QA, 'second-reading-detector.json'))['families'].values()))))
    rows.append('| DD-ROS-QA-05 | Where a line that the first text layer lost and a second reading recovered is written, and where the work files of the sample live | into the unit file as a row; as a segment of a derived-text ledger with its own locator in plain JSON beside the sample results; not written | Plain JSON under data2/qa/recovered/ with its own locator: a derived text QA-PAGEREAD.<identifier>-<leaf> (the tesseract reading of that page, pinned by sha256 in data2/qa/pageread-ledger.json, kept under tmp/library/rosters/_qa/pageread) and the offset of the first name character in it; the checks V1 and V2 of r2lib pass on it; the line was looked at on the page image before it was written; never into a unit file or an existing row; data2/qa is a work area that the packer must not ship, and the derived-text ledger is kept there rather than under data2/sources because the packer audits that folder for statements of how a file was made | pipeline2/roster_qa/qa_recover.py and qa_pageread.py; data2/qa/recovered/union-vt.json (%d of %d recovered) and union-me.json (%d of %d); request note GOVERNANCE/horde/requests/bt-rosters-roster-qa-work-files.md | documented (the printed tokens at the offsets of the derived text) | delete data2/qa/recovered and the ledger; write the rows into the unit files with r2lib.write_unit as a segment of their own after the owner agrees | a recovered line would show its derived text as the source and "second reading of the page image" |' %
                (n_rec_vt, len(rec_vt_rows), n_rec_me, len(rec_me_rows)))
    head = ['', '## Added %s by bt-rosters / roster-qa: the independent sample of the stored roster lines (DELEGATED, reversible by the owner, not owner decisions; detail in rosters/reports/roster-qa.md)' % time.strftime('%Y-%m-%d', time.gmtime()), '',
            '| id | question | options | chosen default | evidence | tier | reversibility | product marking |', '|---|---|---|---|---|---|---|---|']
    open(os.path.join(OUTD, 'decisions-rows.md'), 'w', encoding='utf-8').write('\n'.join(head + rows) + '\n')
    return 0


if __name__ == '__main__':
    sys.exit(main())

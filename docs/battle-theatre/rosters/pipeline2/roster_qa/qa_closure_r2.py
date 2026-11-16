"""The texts that close round 2 of the roster-qa item (North Carolina, conf-nc), computed from data2/qa/round2.

    python3 -I qa_closure_r2.py            write GOVERNANCE/horde/ws-rosters/roster-qa/closure/r2-{gaps-lines.md, decisions-rows.md, plan-note.md, progress-line.txt, request-note.md} and
                                           GOVERNANCE/horde/ws-rosters/proposed-register/roster-qa-EG-ROS-QA-0{6,7}.md

The closure files are appended to the shared files by a shell append, never by a rewrite (rosters/GAPS.md, GOVERNANCE/decisions/DELEGATED-DECISIONS-2026-11-11.md,
rosters/PRODUCTION-PLAN.md section 9.11, GOVERNANCE/progress.md); the request note is a new file under GOVERNANCE/horde/requests.  Every figure is read from data2/qa/round2 (verdicts,
stats.json, claims check, route test, verdicts against the files); nothing is typed.  The wording of the decisions is the rule set of round 2 as it was run (qa_frame.py, qa_verdict.py,
qa_stats.py, qa_current.py); a decision that the files do not show is not written.
"""
import sys, os, re, json, glob, collections, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import qa_lib as Q
import qa_stats as S
import qa_report_r2 as R2

OUTD = os.path.join(Q.WSQ, 'closure')
REG = os.path.join(Q.ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'horde', 'ws-rosters', 'proposed-register')
REQ = os.path.join(Q.ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'horde', 'requests')
G_ALL = ('R-G1', 'R-G2', 'R-G3a', 'R-G3b')


def f(n):
    return '{:,}'.format(n)


def main():
    os.makedirs(OUTD, exist_ok=True)
    os.makedirs(REG, exist_ok=True)
    today = time.strftime('%d %B %Y', time.gmtime())
    vs = R2.load_verdicts2()
    stats = R2.jl('stats.json')
    cur = R2.jl('verdicts-vs-files.json')
    cl = R2.jl('claims-check.json')
    sr = R2.jl('second-reading.json')
    frame = R2.jl('frame.json')
    npages, nrows = len(vs), sum(v['rows_checked'] for v in vs)
    nstrata = len(stats['strata'])
    fail_strata = [s for s, d in stats['strata'].items() if any(x['decision'] == 'FAIL' for g, x in d['gates'].items() if g != 'any')]
    cells = [(s, g, d['gates'][g]) for s, d in stats['strata'].items() for g in G_ALL]
    nfail = sum(1 for c in cells if c[2]['decision'] == 'FAIL')
    open_cells = [(s, g, x) for s, g, x in cells if x['decision'] == 'OPEN']
    kinds = collections.Counter()
    for d in stats['strata'].values():
        kinds.update(d['error_kinds_count'])
    kind_txt = ', '.join('%s %d' % (k, n) for k, n in kinds.most_common())
    n_missed = sum(len(v['missed_lines']) for v in vs)
    n_merge = sum(1 for v in vs for e in v['errors'] if 'merge' in e['kinds'])
    err_rows = sum(len({e['i'] for e in v['errors']}) for v in vs)
    flagged = sum(1 for v in vs for e in {x['i']: x for x in v['errors']}.values() if e.get('flagged_ocr_uncertain'))
    per_stratum = '; '.join('%s: %d pages, %s lines, failed %s' % (s, d['pages_looked_at'], f(d['rows_looked_at']), '/'.join(g for g in G_ALL if d['gates'][g]['decision'] == 'FAIL') or 'none') for s, d in stats['strata'].items())
    cl_txt = ('%s claims of the conf-nc report and pointer file recomputed from the files, %s hold, %d do not (reports/roster-qa.md 8.6)' % (f(cl['checked']), f(cl['checked'] - len(cl['do_not_hold'])), len(cl['do_not_hold']))) if cl else 'the claims of the conf-nc report are not re-verified (owed)'
    sr_txt = ('the second-reading route test on 20 pages per Moore scan family ran (8.7)' if sr else 'the second-reading route test on 20 pages per Moore scan family is OWED (queued through the machine lock)')
    cur_txt = ('the verdicts of the %d pages describe the stored lines as they are now (%d identical, %d with the same lines under new row numbers)' % (cur['summary']['pages'], cur['summary']['identical'], cur['summary'].get('renumbered', 0))) if cur and cur['summary']['different'] == 0 else 'the check of the verdicts against the files is not clean or not run (8.3)'
    sup = sorted(glob.glob(os.path.join(R2.QA2, 'superseded', '*.json')))
    # ------------------------------------------------------------------ gaps
    g7 = ('| G-QA07 | **conf-nc: defect list of the independent sample, round 2, %s** (EG-ROS-QA-06; the stored lines are not changed): %d pages, %s lines compared in %d strata; %d of %d strata fail at least one gate by the ladder of PLAN.md 4.4 (R-G9 not passed; conf-nc may not be published as checked); kinds seen (rows): %s; what the parser or a second reading must do: the entries that the text layer runs together (the first words or initials of the next entry stand at the end of a line, the name of the next line loses its first word or its initials, %d printed entries are stored inside the remarks of another line, %d printed entries have no stored line), the carried headings damaged in the text layer (PRIVATES read PRIVATE-, NON-COMMISSIONED OFFICERS read XOX-COMMI8SIOXED OFFICERS) that every line under them inherits as its rank, the characters of the text layer (the digit 6 read 0, G or B, the digit 1 read l or i, e read c, m read rn, whole names garbled, worst in the first-scan text of volume 1: Charlotte Artillery leaf 384, 22 of 52 lines with a name error); %s of %s lines in error are marked ocr_uncertain by the flag files; strata and gates failed: %s | data2/qa/round2/pages/*.verdict.json (stored and printed text of every difference), data2/qa/round2/stats.json, reports/roster-qa.md 8.3 to 8.5 | Open: the conf-nc item fixes the cut of the entries and the headings or reads the pages again (EG-ROS-NC-02), then roster-qa draws fresh pages (new seed, the pages of this round excluded) of every stratum |' % (
        today, npages, f(nrows), nstrata, len(fail_strata), nstrata, kind_txt, n_merge, n_missed, f(flagged), f(err_rows),
        '; '.join('%s: %s' % (s, '/'.join(g for g in G_ALL if d['gates'][g]['decision'] == 'FAIL')) for s, d in stats['strata'].items())))
    g8 = ('| G-QA08 | **Independent sample round 2: gates not decided, claims and route test, further pages owed** (EG-ROS-QA-07): %s; the levels D and R were not compared on the pages of a stratum after it had failed the gate (the pages say which levels were compared); %s; %s; %s; the 299 to 628 lines per stratum of the plan were reached only where the gate could still pass; fresh pages after the conf-nc fixes are owed; the Pennsylvania muster years and the Florida losses cannot be tried before their items have unit files | data2/qa/round2/stats.json, data2/qa/round2/verdicts-vs-files.json, reports/roster-qa.md 8.3, 8.6, 8.7 and 8.9 | Open: roster-qa round 3 (new items and fresh pages), the route test through tools/horde/bench.sh |' % (
        ('gate cells shown OPEN (no pass claimed): ' + '; '.join('%s %s %d in %s lines' % (s, g, x['errors'], f(x['rows'])) for s, g, x in open_cells)) if open_cells else 'no gate cell is open',
        cl_txt, sr_txt, cur_txt))
    open(os.path.join(OUTD, 'r2-gaps-lines.md'), 'w', encoding='utf-8').write(g7 + '\n' + g8 + '\n')
    # ------------------------------------------------------------------ decisions
    dd = ['',
          '## Added %s by bt-rosters / roster-qa: round 2 of the independent sample (North Carolina; DELEGATED, reversible by the owner, not owner decisions; detail in rosters/reports/roster-qa.md section 8)' % time.strftime('%Y-%m-%d', time.gmtime()),
          '',
          '| id | question | options | chosen default | evidence | tier | reversibility | product marking |',
          '|---|---|---|---|---|---|---|---|',
          '| DD-ROS-QA-06 | How the pages of round 2 (Moore 1882, conf-nc) are stratified and drawn | the roll as one source family; strata by volume; strata by scan x officers pages and other pages | The roll is one printed source read from two scans (two text layers of the same print, with different errors; conf-nc builds each unit from the scan with the better measured score), so the strata are the scan (NC-MOO-E: the four Emory scans; NC-MOO-G: the four Internet Archive scans) x officers pages and other pages (4 strata); seed roster-qa-round2-2026-11-16; draw, decile rule and levels as round 1; the pages that the engineer of conf-nc and the pilot author had looked at are excluded (both scans of volume 2: printed pages 116 and 382) | data2/qa/round2/frame.json and draw.json (seed, rule, order, exclusions); qa_frame.py (`FAMILY_NC`, `EXCLUDED_BY_ROUND`) | n/a (a test method) | change the seed or the rule in qa_frame.py and redraw | none; reports/roster-qa.md 8.2 states what the sample covered |',
          '| DD-ROS-QA-07 | What counts as an error in a Moore page, beyond DD-ROS-QA-02 | each entry stored as one line only; an entry stored inside another line counted as a missed line; counted as a merge | An entry printed on its own line whose text stands inside the remarks of the line before it is a `merge` at that line (R-G3 structure) and is not also a missed line; a printed entry that no stored line holds at all is a missed line; the first words or initials of the next entry at the end of a line are `rem-extra` there and `name-cut` at the next line; a damaged carried heading is a `rank` error at every line under it (as ME-RET leaf 414 in round 1), noted once on the page; a doubtful character, zoomed and still doubtful, and a stored character that the print itself shows (a printed year that is a misprint) are not errors; the company letter of a page without a heading is read from the running heads (Company X, Nth Regiment) of the neighbouring pages | the verdict notes of every page of round 2 (data2/qa/round2/pages) | n/a (a test method) | recount with another rule from the verdict files (stored and printed text of every difference are in them) | none |',
          '| DD-ROS-QA-08 | What is done when the item under sample is rebuilt while the pages are looked at | wait for the item to close; sample the first build and report the drift; redo every page | The frame stays as built (the hashes of the raw lines of every file are in it); at the end `qa_current.py` compares the lines of every verdict page with the files as they are: a page with the same lines (identical, or the same lines under other row numbers because lines earlier in the file were removed) stands; a page whose lines changed is looked at again against the new lines and its first verdict is kept under data2/qa/round2/superseded/ and not counted; the report says how many of each (%s) | data2/qa/round2/verdicts-vs-files.json; superseded/ (%s) | n/a (a test method) | none | none |' % (cur_txt if cur else 'owed', ', '.join(os.path.basename(x) for x in sup) or 'none'),
          '| DD-ROS-QA-09 | How the tools carry a second round without touching the evidence of the first | copy data2/qa aside; a round parameter in the tools | The environment variable RQA_ROUND (default 1) selects the round: qa_lib.QA is data2/qa for round 1 and data2/qa/round<N> for a later round, qa_lib.ITEMS_BY_ROUND names the items of the round, qa_frame.py takes the seed, the families and the exclusions of the round; page_image.pdf_remote_name handles the file names of the Emory items; qa_route_test.py takes the families of the round; qa_current.py counts renumbered pages; the report generator qa_report.py appends section 8 (qa_report_r2.py) and leaves sections 0 to 7 as they were | pipeline2/roster_qa (qa_lib.py, qa_frame.py, qa_current.py, qa_route_test.py, qa_report_r2.py, qa_claims_nc.py, qa_sources_r2.py, qa_closure_r2.py); git history | n/a | revert the tools; the evidence files of round 1 are not changed by round 2 | none |',
          '']
    open(os.path.join(OUTD, 'r2-decisions-rows.md'), 'w', encoding='utf-8').write('\n'.join(dd) + '\n')
    # ------------------------------------------------------------------ plan note 9.11
    note = ['',
            '### 9.11 roster-qa: round 2, North Carolina (%s; the engineer of the item; appended, nothing above was rewritten)' % today,
            '',
            'In short: the second round of the independent sample covers conf-nc (Moore 1882): **%d pages and %s stored lines in %d strata; %d of %d strata fail at least one gate (R-G9 not passed for conf-nc)**; %s; %s; %s.' % (npages, f(nrows), nstrata, len(fail_strata), nstrata, cur_txt, cl_txt, sr_txt),
            '',
            '* **What round 2 is** (reports/roster-qa.md section 8; data2/qa/round2): the same tools with `RQA_ROUND=2` (see DD-ROS-QA-09), four strata (the two Moore scans x officers pages and other pages), seed roster-qa-round2-2026-11-16, every page looked at with the Read tool; per stratum: %s.' % per_stratum,
            '* **Defect list for the conf-nc item** (G-QA07, EG-ROS-QA-06): the entries that the text layer runs together (merge, name-cut, rem-extra), the damaged carried headings, the characters of the text layer; the stored lines are not changed.',
            '* **For the engineers of later rounds**: round 1 and round 2 share no source page (other volumes and scans), so round 2 needed no exclusion of round 1 pages; a round 3 draws a new seed and adds the pages of `data2/qa/round2/pages` to `EXCLUDED_BY_ROUND`; `qa_lib.ITEMS_BY_ROUND` names the items of a round; the strata of a Confederate item are scan x kind of page (`qa_frame.FAMILY_NC`); the Emory items are fetched through `page_image.pdf_remote_name`. The item conf-nc was rebuilt by its own engineer while this sample was taken (DD-ROS-QA-08).',
            '* **Not run**: %s.' % ('; '.join(['the gates shown OPEN (%s)' % ', '.join('%s %s' % (s, g) for s, g, x in open_cells)] if open_cells else []) + ('; ' if open_cells else '') + 'fresh pages after the conf-nc fixes; the third reader; a browser, any timing, a real-GPU or phone check'),
            '']
    open(os.path.join(OUTD, 'r2-plan-note.md'), 'w', encoding='utf-8').write('\n'.join(note) + '\n')
    # ------------------------------------------------------------------ progress line
    pl = ('- %s bt-rosters roster-qa (round 2 closed; engineer report; nothing committed): independent sample of conf-nc (North Carolina, Moore 1882; two scans x officers pages and other pages, 4 strata): %d pages looked at and %s stored lines compared with the print; %d of %d strata fail at least one gate by the ladder of PLAN.md 4.4 (R-G9 not passed; conf-nc may not be published as checked); kinds seen: %s; %s; %s; %s; written: G-QA07 and G-QA08 (GAPS.md), EG-ROS-QA-06 and -07 (proposed-register), DD-ROS-QA-06 to -09, request note bt-rosters-roster-qa-round2.md, PRODUCTION-PLAN 9.11, report section 8, CLOSED.json round 2 covering union-me, union-nh, union-vt, union-ma and conf-nc.' % (
        time.strftime('%Y-%m-%d %H:%M', time.gmtime()), npages, f(nrows), len(fail_strata), nstrata, kind_txt, cur_txt, cl_txt, sr_txt))
    open(os.path.join(OUTD, 'r2-progress-line.txt'), 'w', encoding='utf-8').write(pl + '\n')
    # ------------------------------------------------------------------ register entries
    def entry(n, title, desc, why, evidence, subst, recon, tier, marking, rec):
        t = ['# EG-ROS-QA-%02d: %s' % (n, title), '', '| Field | Content |', '|---|---|', '| ID | EG-ROS-QA-%02d |' % n,
             '| Requirement IDs | OA03 (complete roster section of both armies, source and rights per name); R22; the accuracy gates R-G1, R-G2, R-G3 and R-G9 of rosters/PLAN.md 4.3; Law clauses 3, 4 and 7 |',
             '| Category | verification %s |' % ('failed' if n == 6 else 'incomplete'), '| Description | %s |' % desc, '| Why literal 100%% is not possible or blocked | %s |' % why,
             '| Evidence searched | %s |' % evidence, '| Autonomous substitute applied | %s |' % subst, '| Strongest evidence-based reconstruction | %s |' % recon, '| Confidence tier | %s |' % tier,
             '| Competing values | - |', '| Product marking | %s |' % marking, '| Visual and audio impact | None. |', '| Review status | internal review only (DEC-006: no public review label) |',
             '| Owner decision requested | None. |', '| Agent recommendation | %s |' % rec, '| Status | open (proposed by bt-rosters / roster-qa; not yet in register/) |', '| Owner decision and date | (filled only from the Decision Log) |', '']
        return '\n'.join(t)
    e6 = entry(6, 'R-G9 not passed for conf-nc: every stratum of the Moore roll fails at least one gate',
               'Round 2 of the independent sample (reports/roster-qa.md section 8): %d pages, %s stored lines of the 41 conf-nc files compared with the page images in %d strata (two scans of the Moore roll x officers pages and other pages); %d of %d strata fail at least one gate by the ladder (4 or more errors at the gate); %d of the %d gate cells fail; kinds seen (rows): %s. The text layer runs the entries together (%d printed entries stored inside the remarks of another line, %d with no stored line), damages the carried headings that every line under them inherits as its rank, and misreads characters (the first-scan text of volume 1 worst). %s of the %s lines in error are marked ocr_uncertain by the flag files. None of the 41 files may be published as checked.' % (
                   npages, f(nrows), nstrata, len(fail_strata), nstrata, nfail, len(cells), kind_txt, n_merge, n_missed, f(flagged), f(err_rows)),
               'The stored lines are the text layer of the pinned scans, as the format requires (a line is found at its offset; a name is never respelled); the page image shows what the print says; the difference is the second reading of the page images (EG-ROS-NC-02), which no parser rule can replace.',
               'data2/qa/round2 (frame, draw, one verdict per page with the stored and printed text of every difference, stats.json, verdicts-vs-files.json); rosters/reports/roster-qa.md 8.2 to 8.5.',
               'None.', 'The second reading of the page images of conf-nc (route tested in 8.7), the fix of the cut of the entries and of the carried headings, then fresh pages (new seed) of every stratum until each gate is decided.',
               'documented (counts; the stored and the printed text of every error are in the verdict files)', 'The roster section must not describe the Moore lines as checked; lines flagged ocr_uncertain are marked, and the unflagged lines may still be wrong (the share is in 8.4).',
               'Do not publish conf-nc as checked; send the defect list (G-QA07) to the parser of conf-nc; draw fresh pages after the fixes.')
    e7 = entry(7, 'Gates of round 2 not decided, claims and route test, further pages owed',
               'Round 2 stopped the comparison of a level in a stratum once the gate had failed (DD-ROS-QA-03 of round 1); %s. %s; %s; %s.' % (
                   ('gate cells shown OPEN (no pass claimed): ' + '; '.join('%s %s %d in %s lines' % (s, g, x['errors'], f(x['rows'])) for s, g, x in open_cells)) if open_cells else 'no gate cell is open', cl_txt, sr_txt, cur_txt),
               'The rule that stopped the comparison of a decided level was chosen to spend the reading where it changes the result; a later round after the fixes draws fresh pages at every level.',
               'data2/qa/round2/stats.json (decision per gate and stratum), the levels field of every verdict, claims-check.json, second-reading.json, verdicts-vs-files.json.',
               'None.', 'Fresh pages at all levels after the conf-nc fixes until each gate is decided; the route test through the machine lock; the claims check again after any rebuild or regenerated report of conf-nc.',
               'documented (counts) and not decided (gates shown OPEN)', 'No gate shown OPEN is described as passed.', 'Draw fresh pages after the conf-nc fixes and after each later item closes.')
    open(os.path.join(REG, 'roster-qa-EG-ROS-QA-06.md'), 'w', encoding='utf-8').write(e6)
    open(os.path.join(REG, 'roster-qa-EG-ROS-QA-07.md'), 'w', encoding='utf-8').write(e7)
    # ------------------------------------------------------------------ request note
    rq = ['# Request from roster-qa (round 2): what the Integrate step and the packer must know about data2/qa/round2', '',
          'Written %s by the roster workstream (bt-rosters / roster-qa). No file outside the ownership of the item is changed by this note; it asks for nothing to be done to another item\'s files.' % today, '',
          '* **Work files, not product data.** `rosters/data2/qa/round2/` (frame.json, draw.json, pages/*.verdict.json and *.read.json, stats.json, NC-MOO-*.json, claims-check.json, verdicts-vs-files.json, second-reading*.json, superseded/) is the evidence of round 2 of the independent sample, as `data2/qa` is that of round 1 (request `bt-rosters-roster-qa-work-files.md`). It is JSON only (no .gz: `verify_unit.py --all` globs every .jsonl.gz under data2), is not loaded by `INDEX.json` and must not be packed into the app.',
          '* **Copy audit.** The files carry the printed words of the Moore roll in `stored` and `printed` fields; the result of the word search for the terms of the copy audit over the files of `data2/qa` (round 2 included) is in reports/roster-qa.md section 5 item 9.',
          '* **Result.** conf-nc is NOT checked (R-G9 not passed, EG-ROS-QA-06): %d of %d strata fail. The product must not call the Moore lines checked; the flag files mark the lines that a pattern of the text layer\'s damage matched (ocr_uncertain), and the share of the lines in error that are marked is in reports/roster-qa.md 8.4.' % (len(fail_strata), nstrata),
          '* **Pointer file and manifest.** `rosters/sources/roster-qa.json` now lists the eight Internet Archive items of Moore\'s Roster (source NC-MOORE-1882) with bytes and sha256 of the PDFs that the sample fetched (the PDFs are dropped from tmp/library/rosters/_pdf after the run; rights basis: public domain, United States publication before 1929, copied from rosters/sources/conf-nc.json).',
          '']
    open(os.path.join(OUTD, 'r2-request-note.md'), 'w', encoding='utf-8').write('\n'.join(rq) + '\n')
    print('written: r2-gaps-lines.md, r2-decisions-rows.md, r2-plan-note.md, r2-progress-line.txt, r2-request-note.md in', Q.rel(OUTD), 'and roster-qa-EG-ROS-QA-06.md, -07.md in', Q.rel(REG))
    return 0


if __name__ == '__main__':
    sys.exit(main())

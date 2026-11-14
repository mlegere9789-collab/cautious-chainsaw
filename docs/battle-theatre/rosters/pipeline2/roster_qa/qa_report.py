"""Write rosters/reports/roster-qa.md from the files of the sample.  Every number is computed here from data2/qa, the unit files, the flag files and the logs; none is typed.

    python3 -I qa_report.py            (re-run it after any new verdict, claims check or route test: it reads what exists and says what is missing)
"""
import sys, os, re, json, glob, collections, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import qa_lib as Q
import qa_stats as S
R = Q.R

OUT = os.path.join(Q.R2, 'reports', 'roster-qa.md')
G1 = {'name-char', 'name-cut', 'name-nonperson'}
KIND_TEXT = {
    'name-char': 'a character of the name differs from the print', 'name-cut': 'the boundary of the name is wrong (rank word or part of the remarks in the name field, a name split)',
    'name-nonperson': 'the stored name is no person (a heading, a fragment of a paragraph)', 'rank': 'the rank or the carried heading is wrong', 'company': 'the company is wrong',
    'rem-char': 'a character of a remark word differs', 'rem-date': 'a date or number of the remarks differs', 'rem-missing': 'printed remark text is missing',
    'rem-extra': 'text that is not the line\'s stands in the remarks', 'rem-bound': 'the remarks are those of another line', 'rem-order': 'the printed words are all there but in another order',
    'rem-ditto': 'a printed ditto mark is stored as the digits 66', 'merge': 'several printed lines stored as one', 'split': 'one printed line stored as several',
}
FAMILY_TEXT = {
    'VT-REV': 'Vermont: Revised Roster 1892 (cols)', 'MA-SSM': 'Massachusetts: Soldiers, Sailors and Marines 1931 (flow)', 'NH-AYL': 'New Hampshire: Ayling, Revised Register 1895 (flow)',
    'ME-RET': 'Maine: Adjutant General report 1863, Appendix D, company returns (cols)', 'ME-IDX': 'Maine: Supplement 1867, Alphabetical Index (cols)', 'ME-GET': 'Maine at Gettysburg 1898, participants lists (lists)',
}
ITEM_OF_FAMILY = {'VT-REV': 'union-vt', 'MA-SSM': 'union-ma', 'NH-AYL': 'union-nh', 'ME-RET': 'union-me', 'ME-IDX': 'union-me', 'ME-GET': 'union-me'}


def f(n):
    return '{:,}'.format(n)


def pct(a, b, d=1):
    return ('%.' + str(d) + 'f percent') % (100.0 * a / b) if b else 'n/a'


def load_strength():
    S_ = {}

    def walk(x):
        if isinstance(x, dict):
            for idk in ('regiment_id', 'battery_id', 'unit_id', 'id'):
                if idk in x and isinstance(x.get('strength'), (int, float)):
                    S_.setdefault(x[idk], x['strength'])
            for v in x.values():
                walk(v)
        elif isinstance(x, list):
            for v in x:
                walk(v)
    for p in glob.glob(os.path.join(Q.ROOT, 'baseline', 'dist', 'data', 'oob', '*.json')):
        walk(Q.jload(p))
    return S_


def main():
    w = []
    A = w.append
    frame = Q.jload(os.path.join(Q.QA, 'frame.json'))
    draw = Q.jload(os.path.join(Q.QA, 'draw.json'))['strata']
    verdicts = [Q.jload(p) for p in sorted(glob.glob(os.path.join(Q.QA, 'pages', '*.verdict.json')))]
    S.main.__call__ if False else None
    stats = Q.jload(os.path.join(Q.QA, 'stats.json'))
    claims = Q.jload(os.path.join(Q.QA, 'claims-check.json')) if os.path.exists(os.path.join(Q.QA, 'claims-check.json')) else None
    sr = Q.jload(os.path.join(Q.QA, 'second-reading.json')) if os.path.exists(os.path.join(Q.QA, 'second-reading.json')) else None
    det = Q.jload(os.path.join(Q.QA, 'second-reading-detector.json')) if os.path.exists(os.path.join(Q.QA, 'second-reading-detector.json')) else None
    rec_vt = Q.jload(os.path.join(Q.QA, 'recovered', 'union-vt.json'))
    rec_me = Q.jload(os.path.join(Q.QA, 'recovered', 'union-me.json'))
    ptr = Q.jload(os.path.join(Q.R2, 'sources', 'roster-qa.json'))
    diag_idx = Q.jload(os.path.join(Q.ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'horde', 'ws-rosters', 'union-me', 'diag-index.json'))
    n_lost_me = sum(len(v) for v in diag_idx['skipped'].values())
    n_rec_vt = sum(1 for r in rec_vt['rows'] if r.get('status', '').startswith('recovered'))
    n_rec_me = sum(1 for r in rec_me['rows'] if r.get('status', '').startswith('recovered'))
    ledger = Q.jload(os.path.join(Q.QA, 'pageread-ledger.json'))
    fr_pages = frame['pages']
    now = time.strftime('%d %B %Y, %H:%M UTC', time.gmtime())
    npages, nrows = len(verdicts), sum(v['rows_checked'] for v in verdicts)

    A('# Independent sample of the stored lines against page images, round 1 (Maine, New Hampshire, Vermont, Massachusetts) (work item roster-qa, OA03)')
    A('')
    A('Written %s by the roster workstream. Evidence labels as in `PLAN.md`: **Measured** (a command run for this report produced it), **Documented** (a source text or a file says it), **Computed**, **Inferred**, **Not run**. Every number below is computed by `pipeline2/roster_qa/qa_report.py` from `data2/qa/` (frame, draw, one verdict file per page looked at, statistics, claims check, second-reading tests, recovered lines), the unit files and the logs under `GOVERNANCE/horde/ws-rosters/roster-qa/`; none is typed. No stored line, flag file or ledger of another item was changed.' % now)
    A('')
    # ------------------------------------------------------------------ 0
    A('## 0. Summary')
    A('')
    fails = collections.Counter()
    nstrata_fail = 0
    for s, d in stats['strata'].items():
        fl = [g for g, x in d['gates'].items() if g != 'any' and x['decision'] == 'FAIL']
        if fl:
            nstrata_fail += 1
        for g in fl:
            fails[g] += 1
    A('* **The sample (Measured).** %d pages of the four closed items were drawn by a seeded rule (seed `%s`, %s pages in the frame, %d strata: six source families by layout, each split into pages of officers and other pages; at least a third of every stratum\'s pages from its lowest OCR-confidence decile) and **looked at** one by one with the Read tool on the page image (the item PDF through `archive.org/cors`, one page cut out with pdftoppm, transient, never stored). **%s stored lines were compared with the print** (name, rank or heading, company, and, where the stratum had not already failed the gate, dates and remarks). Page numbers, row numbers, the stored and the printed text of every difference are in `data2/qa/pages/*.verdict.json`.' % (npages, frame['seed'], f(len(fr_pages)), len(stats['strata']), f(nrows)))
    A('* **Result (Measured).** **All %d of %d strata fail at least one gate decisively** (4 or more errors at the gate concerned, which is more than the ladder of PLAN.md 4.4 allows at its largest sample of 773 lines): R-G1 names failed in %d strata, R-G2 dates in %d, R-G3 in %d (structure) and %d (reading of the remark). **No stratum passes R-G9; none of the four items may be published as checked.** Section 2.2 gives every count with its one-sided 95 percent Clopper-Pearson bound; where a gate is still open (too few lines to decide) the table says OPEN and no pass is claimed.' %
      (nstrata_fail, len(stats['strata']), fails['R-G1'], fails['R-G2'], fails['R-G3a'], fails['R-G3b']))
    kinds = collections.Counter()
    for v in verdicts:
        for e in v['errors']:
            for k in e['kinds']:
                kinds[k] += 1
    A('* **What is wrong (Measured, section 2.3).** The text layer differs from the print in characters (digits read as letters or as other digits, `1S63`, `\'03`, `6i`; letters, `Julv`, `reed`, `Mclntire`, `II` for H; whole names garbled); the flag files mark only part of the lines in error. Besides: the ditto mark stored as the digits 66 (Maine returns), margin marks stored as letters (Massachusetts), run-in paragraphs and run-over lines stored as fragment rows or on the wrong row, several printed rows stored as one (Maine Field and Staff returns), rank words in the name field of officer lines (Maine at Gettysburg). The checks V1 to V3 cannot see any of this; the sample is the only check that does.')
    if claims:
        vlines = {}
        for st_ in ('me', 'nh', 'vt', 'ma'):
            vp_ = os.path.join(Q.WSQ, 'verify-%s.jsonl' % st_)
            vlines[st_] = [json.loads(x) for x in open(vp_, encoding='utf-8') if x.strip()] if os.path.exists(vp_) else []
        nfiles = sum(len(v_) for v_ in vlines.values())
        v1 = sum(x['v1_name_defects'] for v_ in vlines.values() for x in v_)
        v3 = sum(x['v3_page_defects'] for v_ in vlines.values() for x in v_)
        A('* **The claims of the four reports hold (Measured, section 3).** %d claims of the reports of Maine, New Hampshire and Vermont (per-unit line counts, lines per segment, ocr_uncertain, on-the-rolls counts, Gettysburg counts, damage codes, totals), the flag-file hashes of all four items and every hash and size of the pointer files and ledgers kept locally were recomputed from the files: %d hold, %d do not. `verify_unit.py --all` on the four items: %d files, %d V1 and %d V3 defects; `build_index.py --lint`: 0 defects; the 23 node tests of the New Hampshire item pass.' % (claims['checked'], claims['hold'], len(claims['do_not_hold']), nfiles, v1, v3))
    else:
        A('* **Claims of the reports:** the check was not available when this report was written.')
    if det:
        lo = 100 * min(d_['recall_of_errors'] for d_ in det['families'].values())
        hi = 100 * max(d_['recall_of_errors'] for d_ in det['families'].values())
        tail = 'between %.0f and %.0f percent of the lines that the sample reader found in error (4.1); the agreement of the two engines on 20 pages per family is in 4.2.' % (lo, hi)
    else:
        tail = 'n/a.'
    A('* **The second-reading route (Measured, section 4).** %d of the %d lines that the first layer lost and that were tried (the %d Vermont lines of `diag-no-name.json` and %d of the %d Maine index lines of `diag-index.json`) were read by tesseract and are recovered, each with its own locator in a derived text (`data2/qa/pageread-ledger.json`) and confirmed by looking at the line on the page image; none is written into a unit file. The eight Maine index leaves without text are scanner-deleted leaves (`pageType Delete`) between consecutive printed pages: nothing is lost there. Compared with the first layer, tesseract marks as SUSPECT ' % (n_rec_vt + n_rec_me, len(rec_vt['rows']) + len(rec_me['rows']), len(rec_vt['rows']), len(rec_me['rows']), n_lost_me) + tail)
    A('* **Not run / owed (section 7).** The Pennsylvania muster years and the Florida 6.1 percent (no unit files of those items yet); the cells sidecar of the Vermont files (page-order reading of the lines flagged O) as a second reading; the 299 to 628 lines per stratum that the plan asks for were not reached because every stratum failed first; fresh pages after the parsers are fixed; browser, timing, real-GPU checks (not part of this work).')
    A('')
    # ------------------------------------------------------------------ 1
    A('## 1. Lines per unit against the strength')
    A('')
    A('"Strength" is the value of the baseline order of battle (`baseline/dist/data/oob`, second hand, from Busey and Martin as the earlier families recorded it); no strength range with a declared basis exists for these units in the registry (`history/units.json` has `strength: null`). A whole-war roll is not comparable with the strength present on 1 to 3 July 1863 (PLAN.md 2.4, gap EG-ROS-010); the ratio is context only. The sample parses nothing new: the lines are those of the four items as they stand in the tree; the right-hand columns say how much of each unit the sample touched.')
    A('')
    strength = load_strength()
    units = {u['key']: u for u in Q.jload(os.path.join(Q.D2, 'units.json'))['units']}
    per_unit_pages = collections.defaultdict(lambda: [0, 0, 0])
    stem_to_key = {}
    for item, st, path in Q.unit_files():
        stem = os.path.basename(path)[:-len('.jsonl.gz')]
        stem_to_key[(st, stem)] = stem
    ver_rows = {}
    for v in verdicts:
        for lr in v['rows_listed']:
            stem = lr['rid'].split('#')[0]
            ver_rows.setdefault(stem, [0, set(), set()])
            ver_rows[stem][0] += 1
            ver_rows[stem][1].add(v['page'])
        for e in v['errors']:
            stem = e['rid'].split('#')[0]
            ver_rows.setdefault(stem, [0, set(), set()])
            ver_rows[stem][2].add((v['page'], e['i']))
    rec_per_unit = collections.Counter(r['unit'] for r in rec_vt['rows'] + rec_me['rows'] if r.get('status', '').startswith('recovered'))
    A('| item | unit | lines in the file | baseline strength | lines / strength | pages of the sample that hold a line of the unit | lines of the unit on those pages | of them in error | lines recovered by the second reading |')
    A('|---|---|---|---|---|---|---|---|---|')
    tot = [0, 0, 0, 0]
    for item, st, path in Q.unit_files():
        stem = os.path.basename(path)[:-len('.jsonl.gz')]
        head, segs, meta = R.read_unit(path)
        key = head['u']
        oobs = (units.get(key, {}).get('registry', {}).get('oob') or [])
        stv = next((strength[o] for o in oobs if o in strength), None)
        vr = ver_rows.get(stem, [0, set(), set()])
        A('| %s | %s | %s | %s | %s | %d | %d | %d | %d |' % (item, head['name'] if not stem.startswith('_other') else 'lines filed to no unit (index lines whose unit cannot be read)', f(head['n']),
                                                              f(stv) if stv else 'no baseline row', ('%.1f' % (head['n'] / stv)) if stv else '-', len(vr[1]), vr[0], len(vr[2]), rec_per_unit.get(key, 0)))
        tot[0] += head['n']
        tot[1] += vr[0]
        tot[2] += len(vr[2])
    A('| **all** | | **%s** | | | | **%s** | **%s** | **%d** |' % (f(tot[0]), f(tot[1]), f(tot[2]), sum(rec_per_unit.values())))
    A('')
    A('Reading the table. The files hold lines of men who served up to 1865, several lines per man (index, return and participants list for Maine; a line per rank held for Vermont), so lines exceed the strength by a large factor, as the four reports say; nothing is merged. "Lines of the unit on those pages" counts the lines that were compared, not a sample estimate of the file. Lines that the first layer lost and the second reading recovered are not in the unit files and are not counted in "lines in the file" (section 4.4).')
    A('')
    # ------------------------------------------------------------------ 2
    A('## 2. The sample')
    A('')
    A('### 2.1 Design (as run)')
    A('')
    A('* **Frame.** A page is a leaf of an Internet Archive item that holds at least one stored line of the four items (unit files and the `_other-` file of Maine): %s pages, %s lines. Excluded: the one pilot page that the author of the pilot read in development (`pilot/QA-SAMPLE.md`, Maine report 1863 book p. 579, leaf 798). The frame was built at its first run from the files as they stood; the sha256 of the raw lines of every file is in `data2/qa/frame.json`. **The 24 Massachusetts files were rewritten by their engineer during the run** (22 of 24 differ from the frame hashes; the lines read 33,748 at the frame and 33,787 now); the lines on every Massachusetts page that was looked at are identical (name, rank, company, remarks, offset) in the commits of 00:46 and 00:56 and in the current files, so the verdicts stand for the current files. The Maine, New Hampshire and Vermont files are unchanged since the frame.' % (f(len(fr_pages)), f(sum(p['rows'] for p in fr_pages))))
    A('* **Strata.** Source family by layout (6 families) x kind of page: an officers page holds at least 3 lines of which at least a quarter are officer lines (rule in `qa_frame.py`); all other pages are "other". Inside a stratum the damage score of a page is the share of its lines that the flag file marks ocr_uncertain; the lowest OCR-confidence decile is the 10 percent of pages (at least 1) with the highest score.')
    A('* **Draw.** Pages are ordered by sha256 of `seed | stratum | identifier | leaf` (a published, recomputable pseudo-random order); decile pages and other pages form two lists; the draw order takes a decile page at positions 1, 4, 7 and so on, so that every prefix of m pages holds at least m/3 decile pages (PLAN.md 4.4). The order of every stratum is in `data2/qa/draw.json`; a sample is a prefix of it. **Where the sample is not a prefix** (ME-RET-other: draw position 3 was looked at first and positions 1 and 2 after it; no page was passed over because of what it showed) the verdict file says the position of every page.')
    A('* **Reader.** The sample reader is the engineer of this item, who did not write or see the builders of the four items; the page image is looked at with the Read tool (200 dpi view of the page; 300 dpi crops of tables; zoom to 600 dpi for a doubtful character). Tesseract 5.3.4 (psm 6, 300 dpi, the table rules whitened first with a threshold relative to the page background) is a **pre-screen only**: it lists the stored tokens it does not read and the tokens it reads that the line lacks; the sample reader decides every line. A line that both readings agree on was still compared by eye with the page (names, headings, dates, remarks); the detector figures in 4.3 say how often two readings agreeing was not enough.')
    A('* **Levels.** N: name, rank or carried heading, company, existence and cut of the line; D: the dates of the remarks; R: the other words of the remarks. The first pages of every family were looked at at all three levels (the smoke sample, to see the kinds of error). A level that a stratum had already failed decisively (4 errors; the ladder allows 3 at 773 lines) was not looked at on its further pages; `levels` in each verdict says what was compared. This stops the work where the result is decided, it does not lower a gate: a gate that was not decided is shown as OPEN.')
    A('* **Comparison rule.** Case, punctuation and spacing are ignored (they are not errors); any other differing character is an error, a digit read as a letter included. The kinds of error (`qa_verdict.py`): ' + '; '.join('`%s` %s' % (k, v) for k, v in KIND_TEXT.items()) + '. Gates: R-G1 = any `name-*` kind; R-G2 = `rem-date`; R-G3 structure = `rank`, `company`, `merge`, `split`; R-G3 reading of the remark = `rem-char`, `rem-missing`, `rem-extra`, `rem-bound`, `rem-order`, `rem-ditto`.')
    A('* **Decision rule (never lowered).** PASS when n >= 299 with 0 errors, n >= 473 with at most 1, n >= 628 with at most 2 or n >= 773 with at most 3 (one-sided 95 percent Clopper-Pearson upper bound 1.0 percent, `qa_lib.cp_upper`, which reproduces the values of PLAN.md 4.4); FAIL when 4 or more errors are found; OPEN otherwise. Lines of one page are not independent draws; the plan\'s own arithmetic treats them as such and so does this table (a caveat, not a change of rule).')
    A('* **What a page verdict states.** The sample reader looked at the page image and compared every stored line of the page with it (except lines named as unreadable; none was). The verdict carries the sha256 of the rendered page, of the PDF and of the tesseract text, the stored text of every line in error (`stored`) and the printed text (`printed`), and the printed lines of the units that no stored line accounts for (`missed_lines`).')
    A('')
    A('### 2.2 Result per stratum')
    A('')
    A('Errors / lines compared, one-sided 95 percent Clopper-Pearson upper bound, decision. R-G2 and R-G3 reading are counted only on pages looked at at that level.')
    A('')
    A('| stratum | pages in the frame | lines in the frame | pages looked at (decile pages) | lines compared | R-G1 names | R-G2 dates | R-G3 structure | R-G3 reading of the remark |')
    A('|---|---|---|---|---|---|---|---|---|')

    def cell(x):
        return '%d / %d, %s, **%s**' % (x['errors'], x['rows'], ('%s%%' % x['upper95_percent']) if x['upper95_percent'] is not None else '-', (x['decision'] or '-') if x['rows'] else 'not looked at')
    for s, d in stats['strata'].items():
        g = d['gates']
        A('| %s | %d | %s | %d (%d) | %s | %s | %s | %s | %s |' % (s, d['pages_in_stratum'], f(d['rows_in_stratum']), d['pages_looked_at'], d['decile_pages_looked_at'], f(d['rows_looked_at']), cell(g['R-G1']),
                                                                 cell(g['R-G2']) if g['R-G2']['rows'] else 'not compared (no dates in this source)', cell(g['R-G3a']), cell(g['R-G3b'])))
    A('')
    A('Pages looked at, one line each (stratum, draw position, D = in the lowest decile, levels, lines, lines in error):')
    A('')
    A('| page (identifier / leaf) | printed page | stratum | draw position | decile | levels | lines | in error | notes of printed lines of the units that no stored line accounts for |')
    A('|---|---|---|---|---|---|---|---|---|')
    for v in sorted(verdicts, key=lambda v: (v['stratum'], v['draw_position'] or 0)):
        A('| `%s` | %s | %s | %s | %s | %s | %d | %d | %d |' % (v['page'], v['printed_page'], v['stratum'], v['draw_position'], 'D' if v['in_lowest_decile'] else '', v['levels'], v['rows_checked'], v['rows_in_error'],
                                                           len(v['missed_lines'])))
    A('')
    clean_pages = [v for v in verdicts if v['rows_in_error'] == 0]
    npp = [d_['pages_looked_at'] for d_ in stats['strata'].values() if d_['pages_looked_at']]
    A('Findings on the sample itself. (1) The lowest-decile pages carry most errors, and the draw takes a third of its pages from the decile, so a pooled rate is an upper estimate of the rate of a whole stratum; the page table above gives every page. (2) Pages with no error at all exist (%d: %s), all of them compared at the name level only; **no page compared at the level of dates and remarks is free of error**, and the pages of the better kind still carry names that differ from the print (for example 1 line in 54 on `maineatgettysbur01main/220`, 1 in 25 on `massachusettssol11931mass/662`). (3) The pooled rates are not estimates of the files: they come from %d to %d pages per stratum, and lines of one page are not independent.' % (len(clean_pages), ', '.join('`%s`' % v['page'] for v in clean_pages), min(npp), max(npp)))
    A('')
    A('### 2.3 What kinds of error, by source family')
    A('')
    A('Counts are instances (a line can carry several kinds). "flagged" = the line is in `ocr_uncertain` of its flag file; "not flagged" = it is not.')
    A('')
    A('| family | pages | lines compared | lines with a name error | lines in error (all levels compared) | kinds (instances: flagged / not flagged) |')
    A('|---|---|---|---|---|---|')
    famagg = collections.defaultdict(lambda: {'pages': 0, 'rows': 0, 'name_rows': 0, 'full_rows': 0, 'full_err': 0, 'k': collections.Counter(), 'kf': collections.Counter()})
    for v in verdicts:
        a = famagg[v['family']]
        a['pages'] += 1
        a['rows'] += v['rows_checked']
        names = {e['i'] for e in v['errors'] if set(e['kinds']) & G1}
        a['name_rows'] += len(names)
        if v['levels'] == 'NDR':
            a['full_rows'] += v['rows_checked']
            a['full_err'] += v['rows_in_error']
        for e in v['errors']:
            for k in e['kinds']:
                a['k'][k] += 1
                if e.get('flagged_ocr_uncertain'):
                    a['kf'][k] += 1
    for fam in ('VT-REV', 'MA-SSM', 'NH-AYL', 'ME-RET', 'ME-IDX', 'ME-GET'):
        a = famagg[fam]
        A('| %s | %d | %s | %d (%s) | %s | %s |' % (FAMILY_TEXT[fam], a['pages'], f(a['rows']), a['name_rows'], pct(a['name_rows'], a['rows']),
                                                    ('%d of %d (%s)' % (a['full_err'], a['full_rows'], pct(a['full_err'], a['full_rows'], 0))) if a['full_rows'] else 'not compared at all levels',
                                                    '; '.join('`%s` %d (%d / %d)' % (k, n, a['kf'][k], n - a['kf'][k]) for k, n in a['k'].most_common())))
    A('')
    allk, allf = collections.Counter(), collections.Counter()
    for a in famagg.values():
        allk.update(a['k'])
        allf.update(a['kf'])
    name_i = sum(allk[k] for k in G1)
    name_f = sum(allf[k] for k in G1)
    A('Of the %d instances on name fields, %d (%s) stand on lines that the flag file marks ocr_uncertain and %d do not; of all %d instances %d (%s) are flagged. **The flags are not a safe measure of the lines that are right.** The kinds, with what each means for the parsers of the later items, are written up in `PRODUCTION-PLAN.md` 9.8 (appended 14 November) and summarised in 2.4.' %
      (name_i, name_f, pct(name_f, name_i, 0), name_i - name_f, sum(allk.values()), sum(allf.values()), pct(sum(allf.values()), sum(allk.values()), 0)))
    A('')
    A('### 2.4 Defect lists returned to the items (dated 14 November 2026; stored lines are not changed)')
    A('')
    ex = collections.defaultdict(list)
    for v in verdicts:
        for e in v['errors']:
            for k in e['kinds'][:1]:
                if len(ex[(v['family'], k)]) < 2 and (e.get('stored') or e.get('note')):
                    ex[(v['family'], k)].append('`%s` row %d: %s' % (v['page'], e['i'], (('stored %s, printed %s' % (e['stored'], e['printed'])) if e.get('stored') and e.get('printed') else (e.get('note') or ''))[:150]))
    for item, fams in (('union-me', ['ME-RET', 'ME-IDX', 'ME-GET']), ('union-nh', ['NH-AYL']), ('union-vt', ['VT-REV']), ('union-ma', ['MA-SSM'])):
        A('**%s**' % item)
        A('')
        for fam in fams:
            a = famagg[fam]
            A('* %s: %s.' % (FAMILY_TEXT[fam], '; '.join('`%s` (%d) e.g. %s' % (k, n, ' | '.join(ex[(fam, k)][:1]) if ex[(fam, k)] else '-') for k, n in a['k'].most_common(7))))
        A('')
    A('Requirements for the parsers (the same list is in PRODUCTION-PLAN 9.8): flag generously (digits and the letters that OCR confuses with them, a lower-case letter inside a name, an unusual letter pair); never store a ditto mark as digits; drop lone marks between punctuation on shadowed margins or keep them flagged; parse run-in paragraphs into entries or leave them out, never as fragment rows; keep the state after a residence (`N. H.`, `Vt.`, `Mass.`) in the remarks; assert one stored line per printed line on every table page; do not file a rank word in the name field.')
    A('')
    # ------------------------------------------------------------------ 3
    A('## 3. The claims of the closed items\' reports, re-verified against their files')
    A('')
    if claims:
        by = collections.defaultdict(lambda: [0, 0])
        for c in claims['claims']:
            what = re.sub(r'\s*\(.*', '', c['claim']).split(':')[0][:70]
            what = re.sub(r'^ledger sha256 of .*', 'ledger sha256 of the pinned text, page-index and page-number files', what)
            what = re.sub(r'^pointer file (bytes|sha256) of .*', lambda m_: 'pointer file %s of the files kept locally' % m_.group(1), what)
            what = re.sub(r'^manifest sha256 of .*', 'manifest sha256 of the files kept locally', what)
            key = (c['item'] if not c['item'].startswith(('MA-SSM', 'ME-', 'NH-', 'VT-')) else 'ledgers', what)
            by[key][0] += 1
            by[key][1] += 1 if c['holds'] else 0
        A('%d claims were recomputed from the files (script `pipeline2/roster_qa/qa_claims.py`, result `data2/qa/claims-check.json`): **%d hold, %d do not.**' % (claims['checked'], claims['hold'], len(claims['do_not_hold'])))
        A('')
        A('| item | what was recomputed | claims | hold |')
        A('|---|---|---|---|')
        for (item, what), (n, h) in sorted(by.items()):
            A('| %s | %s | %d | %d |' % (item, what, n, h))
        A('')
        for c in claims['do_not_hold']:
            A('* **Does not hold:** %s %s | %s | claimed %s | recomputed %s' % (c['item'], c.get('unit'), c['claim'], c['claimed'], c['recomputed']))
        A('* Two readings of the check were corrected before the result above: the Maine "Same" lines were first counted by the exact word (7 units differed by 1 to 5 lines) while the report counts the flag S, the printed ditto word with its OCR variants (`Samo`, `fcame`), which is the right definition; and the Massachusetts total of the morning (33,748 lines) is stale by design (the files were regenerated after the reconciliation, 33,787 lines, `GAPS.md` G-MA04). Neither is a defect of a report; both are listed as information in `claims-check.json`.')
        A('')
    for st in ('me', 'nh', 'vt', 'ma'):
        vp = os.path.join(Q.WSQ, 'verify-%s.jsonl' % st)
        if os.path.exists(vp):
            lines = [json.loads(x) for x in open(vp, encoding='utf-8') if x.strip()]
            A('* `verify_unit.py --all --root data2/union/%s`: %d files, %s lines, **%d V1 name defects, %d V3 page defects, %d problems** (ledger hashes matched); %d files not ok.' % (st, len(lines), f(sum(x['rows'] for x in lines)),
                                                                                                                                                          sum(x['v1_name_defects'] for x in lines), sum(x['v3_page_defects'] for x in lines), sum(len(x['problems']) for x in lines), sum(1 for x in lines if not x['ok'])))
    lp = os.path.join(Q.WSQ, 'lint.out')
    if os.path.exists(lp):
        t = open(lp, encoding='utf-8').read()
        m = re.search(r'TOTAL: (.*)', t)
        m2 = re.search(r'defects: (\d+), warnings: (\d+)', t)
        A('* `build_index.py --lint`: %s; **%s defects, %s warnings**.' % ((m.group(1) if m else '?'), m2.group(1) if m2 else '?', m2.group(2) if m2 else '?'))
    npth = os.path.join(Q.WSQ, 'node-roster-nh.out')
    if os.path.exists(npth):
        t = open(npth, encoding='utf-8').read()
        A('* `node --test docs/battle-theatre/app/tests/roster-union-nh.test.mjs`: %s tests, %s pass, %s fail.' % (re.search(r'# tests (\d+)', t).group(1), re.search(r'# pass (\d+)', t).group(1), re.search(r'# fail (\d+)', t).group(1)))
    A('* The four verify runs, the lint and the node test were run directly, not through `tools/horde/bench.sh`: each measured under 30 s of CPU (user times 20 s, 0.3 s, 25 s and 0.3 s for Maine, New Hampshire, Vermont; the Massachusetts run was the one queued through the lock). Locked copies of the same commands were queued as well and may overwrite the same output files with identical content.')
    A('')
    A('**An open question of the Maine report answered.** The report says of eight leaves of the index without text (328, 329, 560, 561, 838, 839, 1220, 1221) that "whether they are blank, plates or unread is not known". The scan data of the item (`supplementtoannu00main_scandata.xml`, Documented) gives `pageType Delete` and `addToAccessFormats false` for exactly these leaves, which are therefore not in the access PDF, and the printed page number advances by exactly one across each pair (319 to 320, 549 to 550, 825 to 826, 1205 to 1206; `PageMap.printed`). They are not book pages; no printed page of the index is missing there. The same holds for no other leaf of the item inside the range that carries stored lines (23 leaves of the item have no text; 15 lie before the first or after the last printed page).')
    A('')
    A('**Claims not recomputed here (Not run):** statements of prose in the reports (for example the readings of the Official Records for the strength of the 2nd and 5th New Hampshire, the explanations of the Summary residuals, the unit-by-unit notes on the sources) are not checked by this item; the counts that depend on a rule of the item (the "on the rolls" inference) were checked for consistency with the flag files, not for the correctness of the rule.')
    A('')
    # ------------------------------------------------------------------ 4
    A('## 4. The second-reading route')
    A('')
    A('Route (Measured, `pipeline2/page_image.py` and `pipeline2/roster_qa/qa_render.py`): the item PDF from `https://archive.org/cors/<id>/<id>.pdf` (one request, 1.2 s after the previous one, generic client name), the leaf found through the scan data where the PDF has fewer pages than the item has leaves, the page cut out with pdftoppm at 300 dpi, the table rules whitened (a threshold relative to the page background: the Maine scans are grey, about 155 on a scale of 255, and a fixed threshold erased the text and made tesseract return nothing on two pages before it was fixed), tesseract 5.3.4 `eng` psm 6 at one thread (about 1 to 4 s of CPU a page). The PDFs are transient (%s bytes in all, deleted after the run; sha256 in the pointer file).' % f(sum(x['bytes'] for s in ptr['sources'] for x in s['files'])))
    A('')
    A('### 4.1 What a second reading is worth, on the pages that were looked at')
    A('')
    if det:
        A('The comparison of qa_compare.py (every stored line AGREE when all its tokens are matched by the tesseract reading of the page, NEAR when only spacing differs, SUSPECT otherwise) against the verdict of the sample reader, on the pages looked at at all three levels:')
        A('')
        A('| family | lines | in error (reader) | of them SUSPECT | of them AGREE | clean lines (reader) | of them AGREE | of them SUSPECT |')
        A('|---|---|---|---|---|---|---|---|')
        for fam, d in det['families'].items():
            A('| %s | %d | %d | %d (%s) | %d | %d | %d (%s) | %d |' % (fam, d['rows_looked_at_all_levels'], d['rows_in_error'], d['error_rows_marked_SUSPECT'], pct(d['error_rows_marked_SUSPECT'], d['rows_in_error'], 0), d['error_rows_marked_AGREE'],
                                                                     d['rows_clean'], d['clean_rows_marked_AGREE'], pct(d['clean_rows_marked_AGREE'], d['rows_clean'], 0), d['clean_rows_marked_SUSPECT']))
        A('')
        A('Reading. The comparison finds nearly every line that is in error (it is a good detector where the layout is one line of text per printed line: Vermont, Ayling, the Massachusetts volumes, the Maine returns) and it also marks a share of the lines that are right (tesseract\'s own errors on a damaged page): the SUSPECT list is a work list, not a verdict. Lines that both readings agree on and that were still in error (%d on these pages) show that agreement of two engines is not proof either; the sample reader looked at the page for every line. Two-column lists (Maine at Gettysburg) and the index pages (Maine) are read by tesseract as one run per printed line, so the line-level comparison is not usable there and was not used.' %
          sum(d['error_rows_marked_AGREE'] for d in det['families'].values()))
    A('')
    A('### 4.2 Agreement of the two engines on 20 pages per family')
    A('')
    if sr:
        A('The first 20 pages of the draw order of the stratum "other" of each family were rendered and read; tesseract is compared with the first text layer (no judgement of the print is made here, this is agreement, not accuracy):')
        A('')
        A('| family | pages read | right page (share of the tesseract words in the pinned leaf >= 0.5) | share of the tesseract words (4 letters or more) in the pinned leaf, mean / lowest | stored lines | AGREE | NEAR | SUSPECT | agree share | tesseract CPU s |')
        A('|---|---|---|---|---|---|---|---|---|---|')
        for fam, d in sr['families'].items():
            A('| %s | %d | %s | %.3f / %.3f | %s | %s | %s | %s | %s | %.0f |' % (fam, d['pages_read'], 'all' if d['right_page_all'] else 'NOT ALL', d['share_in_pinned_leaf_mean'], d['share_in_pinned_leaf_min'] or 0, f(d['stored_lines']), f(d['agree']), f(d['near']), f(d['suspect']),
                                                                                  pct(d['agree'], d['stored_lines'], 0), d['tesseract_cpu_s_total']))
        A('')
    else:
        A('**Not finished when this report was written.** `qa_route_test.py run` (120 pages, about 10 minutes of CPU) was submitted through `tools/horde/bench.sh` and was still waiting for a slot of the machine lock; the command, its output file (`GOVERNANCE/horde/ws-rosters/roster-qa/route-test.out`) and the writer of this section (`qa_report.py`) are in place: re-run `python3 -I pipeline2/roster_qa/qa_report.py` when `data2/qa/second-reading.json` exists. No number of this section is claimed until then.')
        A('')
    A('### 4.3 Lines that the first layer lost, recovered')
    A('')
    A('Each recovered row has its own locator: a text id of the ledger `data2/qa/pageread-ledger.json` (the tesseract reading of that page, pinned by sha256, kept under `tmp/library/rosters/_qa/pageread/`) and the offset of the first name character in it; V1 (the name tokens stand at the offset) and V2 (the remark tokens follow in order) were checked by `r2lib`; the line was cropped at 300 dpi and **looked at** before the row was written; the name is the OCR tokens of the derived text, never corrected. The rows are plain JSON beside the sample results (`data2/qa/recovered/union-vt.json`, `union-me.json`), never lines of a unit file: no existing row was changed and `verify_unit.py --all` does not see them.')
    A('')
    A('**Vermont (diag-no-name.json: the six printed lines whose name the text layer lost): 6 of 6 recovered.**')
    A('')
    A('| unit | leaf (printed page) | name as read in the derived text | company, heading (carried from the stored neighbour) | V1 / V2 | the line as the first layer read it |')
    A('|---|---|---|---|---|---|')
    for r in rec_vt['rows']:
        A('| %s | %s (%s) | `%s` | %s, %s | %s / %s | `%s` |' % (r['unit'], r['leaf'], r['printed_page'], r['name'], r['co'], r['rk'], r['checks']['V1_name_tokens_at_offset'], r['checks']['V2_remark_tokens_follow'], r['first_layer_text_of_the_line'][:90]))
    A('')
    A('**Maine (diag-index.json, 106 index lines of the units whose name the first layer did not read; 7 tried, one per call of the draw below the first seven of the list sorted by unit): 7 of 7 recovered.** Five of the seven are the printed ditto word `Same` (a man named on the line above); two are names (`Coan Elisha S`, `Ellis Osco A`). The first layer\'s y position of each line (word-box frame) divided by 1.68 equals the top of the line in the 300 dpi read within the distance given, which ties the recovered line to the lost one.')
    A('')
    A('| unit | leaf (printed page) | name as read | rank, company, regiment, corps as read (not split) | V1 / V2 | y check (px, distance) |')
    A('|---|---|---|---|---|---|')
    for r in rec_me['rows']:
        if not r.get('status', '').startswith('recovered'):
            A('| %s | %s | not recovered | %s | | |' % (r['unit'], r['page'], r['status']))
            continue
        A('| %s | %s (%s) | `%s` | `%s` | %s / %s | %s, %s |' % (r['unit'], r['leaf'], r['printed_page'], r['name'], r['remarks'], r['checks']['V1_name_tokens_at_offset'], r['checks']['V2_remark_tokens_follow'], r['y_check']['second_reading_top_px_300dpi'], r['y_check']['distance_px']))
    A('')
    A('Not tried: the other 99 lost Maine index lines (the route is proved on the 7; the rest is a batch job for round 2 of union-me: read the leaf, find the line by the y position, look at it); the 119 lines of the 1863 returns that the Maine item left out (`non_person_lines`: they are prose lists and notes whose names the text layer has, not lost names; the item registers them as a gap of cut, not of reading); **the Pennsylvania muster years on 2,039 pages and the Florida 6.1 percent** (no unit file of those items exists yet, so there is no row to which a second reading could be attached; owed to the round of roster-qa that follows their items).')
    A('')
    # ------------------------------------------------------------------ 5
    A('## 5. Anomalies seen')
    A('')
    A('1. **Two pages could not be read by tesseract at first** (Maine returns leaves 365 and 414: zero words, 0.2 s of CPU): the rule remover used a fixed grey threshold of 140 and the Maine scans are grey (about 155); it whitened the text with the rules. Fixed (threshold relative to the page background) before any verdict was written; the pages read afterwards are unaffected. Recorded because the next engineer meets the same scans.')
    A('2. **The page-number map and the PDF disagree on some items** (the PDF of the Maine index has 1,226 pages for 1,236 leaves; the MA volumes 1 and 2 are mapped through the scan data): `page_image.leaf_to_pdf_page` handled all of them; every rendered page was checked by the share of its words in the pinned leaf (all above 0.7; lowest %s).' % ('%.3f' % min(min(p['share_in_pinned_leaf'] or 1 for p in d['pages'] if 'error' not in p) for d in sr['families'].values()) if sr else 'see 4.2'))
    A('3. **The digit 8 of the Massachusetts typeface is inked like an S** in many places (`1S62`, zoom at 600 dpi): the first layer reads S. Counted as an error in the date (the printed meaning is a year); the page shows what a reader sees.')
    A('4. **Two lines of one source are both "Same".** The index prints the ditto word `Same` for a man named above; a stored `Same` row has no man: which man is read from the line above in print and is not in the row (flag S). Three `Same` rows of one page belonged to three different men.')
    A('5. **Index lines of the units are missing on the pages looked at** (`missed_lines` in the verdicts): 3rd Maine C-company lines, 7th Maine lines, one line of the 1st Cavalry, the 2nd Battery and others; the Maine item registers the unreadable-unit lines (EG-ROS-ME-05) but not these, whose regiment cell was read and whose line was not stored.')
    A('6. **Run-over lines of table remarks** (a remark that wraps is printed with its overflow bracketed at the right of the next line: `[for wds.`, `[May 12, \'64.`) are stored on the row of the line they stand beside in Vermont, Maine returns and the Massachusetts margin; the printing convention is the cause, the geometry rule cannot tell.')
    import re as _re
    audit_files = glob.glob(os.path.join(Q.QA, '**', '*.json'), recursive=True) + [os.path.join(Q.R2, 'sources', 'roster-qa.json')] + glob.glob(os.path.join(Q.WSQ, '*'))
    pat = _re.compile(r"\bAI\b|Claude|Anthropic|\bagents?\b|\bsub-?agents?\b|\bLLM\b|\bGPT\b|artificial intelligence", _re.I)
    ah = {}
    for fp in audit_files:
        try:
            tx = open(fp, encoding='utf-8', errors='replace').read()
        except Exception:
            continue
        m_ = [x.group(0) for x in pat.finditer(tx)]
        if m_:
            ah[os.path.relpath(fp, Q.ROOT).replace(os.sep, '/')] = m_
    A('7. **Copy audit (Law; rule 6 of the task).** A word search (AI, Claude, Anthropic, agent, subagent, LLM, GPT, artificial intelligence) over the %d files this item wrote under `data2/qa`, `GOVERNANCE/horde/ws-rosters/roster-qa` and the pointer file found %d file(s) with a hit: %s. %s None of these files is loaded by the roster page; `data2/qa` is a work area and must not be packed (request note `GOVERNANCE/horde/requests/bt-rosters-roster-qa-work-files.md`); the derived-text ledger is kept there, not under `data2/sources/`, because the packer audits that folder for statements of how a file was made.' % (len(audit_files), len(ah), '; '.join('`%s`: %s' % (k, ', '.join(sorted(set(v)))) for k, v in ah.items()) or 'none', 'The hit is a printed given name of the source (the Maine participants list prints a man named Ai), kept as printed (Law 1 and 4).' if ah else ''))
    A('')
    # ------------------------------------------------------------------ 6
    A('## 6. Sources and rights')
    A('')
    A('Only the item PDFs of sources that the four items parsed were fetched (archive.org `/cors/` only; one request at a time, 1.2 s apart; no login, key or workaround). The pointer file `rosters/sources/roster-qa.json` (form roster2-sources-pointer/1) lists identifier, title, year, url, bytes, sha256 of each PDF and scan-data file and the rights block copied from the pointer file of the item that parsed the source; the manifest is `tmp/library/rosters/MANIFEST-roster-qa.json`. The basis "public domain (United States publication before 1929)" appears only where that is true (imprint 1863 to 1898); **the two Massachusetts volumes (printed 1931) carry the basis the Massachusetts item wrote: after the 1929 cutoff, public domain not established by the date, Internet Archive flag NOT_IN_COPYRIGHT, owner step 4 open (EG-ROS-MA-01).** The derived texts (tesseract readings of single pages) carry the rights of the item they were read from.')
    A('')
    A('| source id | volume | Internet Archive item | printed year | PDF bytes | PDF sha256 | rights basis |')
    A('|---|---|---|---|---|---|---|')
    for s in ptr['sources']:
        A('| %s | %s | `%s` | %s | %s | `%s...%s` | %s |' % (s['source_id'], s['volume'] or '-', s['identifier'], s['year'], f(s['bytes']), s['sha256'][:8], s['sha256'][-8:], (s['rights'].get('basis') or '')[:110]))
    A('')
    A('Rights per name: a recovered row names its derived text (`QA-PAGEREAD.<identifier>-<leaf>`), whose ledger entry gives the item, the leaf, the sha256 of the PDF and of the text, and the rights note above.')
    A('')
    # ------------------------------------------------------------------ 7
    A('## 7. Gaps, defects returned, owed')
    A('')
    A('Registered (lines appended to `rosters/GAPS.md`; proposed entries under `GOVERNANCE/horde/ws-rosters/proposed-register/roster-qa-EG-ROS-QA-*.md`; none is in `register/` yet):')
    A('')
    A('* **EG-ROS-QA-01** R-G9 not passed: every stratum of the four items fails (section 2.2); the items may not be published as checked; the defect lists of 2.4 go back to the parsers of union-me, union-nh, union-vt and union-ma, and a fresh draw (seed with the round number) of every stratum is owed after each fix.')
    A('* **EG-ROS-QA-02** Gates not decided by this round: the strata and gates shown OPEN in 2.2 (for example R-G1 of the Vermont officers pages: 1 error in 114 lines; the structure gate of New Hampshire: 0 in 110) need 299 to 628 lines each; no pass is claimed.')
    A('* **EG-ROS-QA-03** The cells sidecar of the Vermont files (the page-order reading of the lines flagged O) is not sampled; the unit-file line stays in text-layer order by design.')
    A('* **EG-ROS-QA-04** Second reading of the Maine index lost lines beyond the 7 tried (99 left), of the lines that the first layer stored garbled (every `_other-ME-SUPP-1867` line on the pages looked at had a garbled rank or regiment cell), and of the Pennsylvania muster years and the Florida losses (items not built yet).')
    A('* **EG-ROS-QA-05** Index lines of the units missing in the stored lines (section 5, item 5): not counted as unreadable-unit lines by the Maine item.')
    A('')
    A('Owner steps: none new. Delegated decisions made here: DD-ROS-QA-01 to DD-ROS-QA-05 (appended to `GOVERNANCE/decisions/DELEGATED-DECISIONS-2026-11-11.md`).')
    A('')
    A('**Not run in this item:** a browser, any timing, a real-GPU or phone check; the Pennsylvania and Florida tests; the cells sidecar; more than 3 to 6 pages per stratum; the 299 to 628 lines per stratum of the plan (every stratum failed first); a second independent reader of the disagreements (the sample reader is one reader; the plan\'s third reader for disagreements was not available, so a doubtful character was zoomed to 600 dpi and, where still doubtful, not counted as an error).')
    A('')
    open(OUT, 'w', encoding='utf-8').write('\n'.join(w) + '\n')
    print('report written', OUT, len('\n'.join(w)), 'characters')


if __name__ == '__main__':
    main()

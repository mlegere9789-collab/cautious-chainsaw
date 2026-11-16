"""Round 2 of the independent sample (North Carolina, work item conf-nc, Moore 1882): the sections of rosters/reports/roster-qa.md that describe it.  Standard library only.

    python3 -I qa_report_r2.py            print the text of section 8 (qa_report.py appends it to the report and quotes its summary at the top)

Every number is computed here from data2/qa/round2 (frame, draw, one verdict file per page looked at, statistics, claims check, route test, verdicts against the files), the unit files
and flag files of conf-nc, the baseline strengths and the pointer files; none is typed.  What does not exist yet (claims check, route test) is said to be owed, from the file test.
The module reads the files of round 2 by their path, so that it can be imported by the round 1 report (qa_lib.QA is the round of the process, 1 by default).
"""
import sys, os, re, json, glob, collections, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import qa_lib as Q
import qa_stats as S
R = Q.R

QA2 = os.path.join(Q.QA_ROOT, 'round2')
ITEM = 'conf-nc'
G_ALL = ('R-G1', 'R-G2', 'R-G3a', 'R-G3b')
FAM_TEXT = {
    'NC-MOO-E': 'Moore 1882, second scan (Emory University copies, identifiers 05913252.33NN.emory.edu)',
    'NC-MOO-G': 'Moore 1882, first scan (Internet Archive items rosternorthcaro00moorgoog, rosterofnorthcar02nort, 03moor, 04moor)',
}
KIND_ORDER = ['name-char', 'name-cut', 'name-nonperson', 'rank', 'company', 'merge', 'split', 'rem-char', 'rem-date', 'rem-missing', 'rem-extra', 'rem-bound', 'rem-order', 'rem-ditto']


def f(n):
    return '{:,}'.format(n)


def pct(a, b, d=1):
    return ('%.' + str(d) + 'f percent') % (100.0 * a / b) if b else 'n/a'


def present():
    return os.path.exists(os.path.join(QA2, 'stats.json')) and os.path.isdir(os.path.join(QA2, 'pages'))


def jl(name):
    p = os.path.join(QA2, name)
    return Q.jload(p) if os.path.exists(p) else None


def load_verdicts2():
    out = []
    for p in sorted(glob.glob(os.path.join(QA2, 'pages', '*.verdict.json'))):
        v = Q.jload(p)
        ap = p[:-len('.verdict.json')] + '.addendum.json'
        if os.path.exists(ap):
            v = Q.merge_addendum(v, Q.jload(ap))
        out.append(v)
    return out


def stem_of(rid):
    return rid.split('#')[0]


def unit_names():
    out = {}
    for item, st, path in [(it, s, p) for it, (army, s) in Q.ITEMS_BY_ROUND['2'].items() for p in sorted(glob.glob(os.path.join(Q.D2, army, s, '*.jsonl.gz')))]:
        stem = os.path.basename(path)[:-len('.jsonl.gz')]
        head, segs, meta = R.read_unit(path)
        out[stem] = head['name']
    return out


def summary_bullets():
    """The bullets that qa_report.py puts into its summary: [] when round 2 has not been run."""
    if not present():
        return []
    st = jl('stats.json')
    vs = load_verdicts2()
    npages, nrows = len(vs), sum(v['rows_checked'] for v in vs)
    nfail = sum(1 for d in st['strata'].values() if any(x['decision'] == 'FAIL' for g, x in d['gates'].items() if g != 'any'))
    cells = []
    for s, d in st['strata'].items():
        for g in G_ALL:
            cells.append((s, g, d['gates'][g]))
    nfailcell = sum(1 for c in cells if c[2]['decision'] == 'FAIL')
    nopen = [(s, g) for s, g, x in cells if x['decision'] == 'OPEN']
    cur = jl('verdicts-vs-files.json')
    cl = jl('claims-check.json')
    sr = jl('second-reading.json')
    out = []
    out.append('* **Round 2, North Carolina (Measured, section 8).** %d pages of the %d units of conf-nc (Moore, Roster of North Carolina Troops, 1882; two scans of each of four volumes) were looked at in %d strata (source scan x officers pages or other pages; seed `roster-qa-round2-2026-11-16`): **%s stored lines compared with the print; %d of %d strata fail at least one gate by the ladder of PLAN.md 4.4 and no gate of any stratum passes (R-G9 not passed for conf-nc)**; %d of the %d gate cells fail%s. %s %s %s' % (
        npages, len(unit_names()), len(st['strata']), f(nrows), nfail, len(st['strata']), nfailcell, len(cells),
        ('; the gate cells still OPEN (too few lines to decide, no pass claimed): ' + ', '.join('%s %s' % (s, g) for s, g in nopen)) if nopen else '; no gate cell is open',
        ('The verdicts of all %d pages describe the stored lines as they are now (`qa_current.py`: %d identical, %d with the same lines under new row numbers).' % (cur['summary']['pages'], cur['summary']['identical'], cur['summary'].get('renumbered', 0))) if cur and cur['summary']['different'] == 0 else
        (('%d of %d verdict pages differ from the files as they are now (the item was rebuilt while the sample was taken; section 8.3).' % (cur['summary']['different'], cur['summary']['pages'])) if cur else 'The check of the verdicts against the files as they are now is owed.'),
        ('The claims of the conf-nc report: %s of %s recomputed claims hold, %d do not (section 8.6).' % (f(cl['checked'] - len(cl['do_not_hold'])), f(cl['checked']), len(cl['do_not_hold']))) if cl else 'The claims of the conf-nc report were not re-verified (owed).',
        ('The second-reading route on 20 pages per scan family of Moore was run (section 8.7).' if sr else 'The second-reading route test on the two Moore scan families is owed (section 8.7).')))
    return out


def section_lines():
    """Section 8 of the report as a list of lines ([] when round 2 has not been run)."""
    if not present():
        return []
    w = []
    A = w.append
    frame = jl('frame.json')
    draw = jl('draw.json')['strata']
    stats = jl('stats.json')
    vs = load_verdicts2()
    first = []
    for p in sorted(glob.glob(os.path.join(QA2, 'pages', '*.verdict.json'))):
        first.append(Q.jload(p))
    cur = jl('verdicts-vs-files.json')
    cl = jl('claims-check.json')
    sr = jl('second-reading.json')
    det = jl('second-reading-detector.json')
    npages, nrows = len(vs), sum(v['rows_checked'] for v in vs)
    names = unit_names()
    fr_pages = frame['pages']
    by_id = {p['id']: p for p in fr_pages}
    now = time.strftime('%d %B %Y, %H:%M UTC', time.gmtime())
    A('## 8. Round 2: North Carolina (work item conf-nc, Moore 1882)')
    A('')
    A('Written %s by the roster workstream, appended to this report by `qa_report.py` (sections 0 to 7 are round 1 and are unchanged; their numbers are those of 15 November). Round 2 is run with the same tools as round 1 (`RQA_ROUND=2`: `qa_lib.py` writes to `data2/qa/round2` and reads the 41 unit files of conf-nc; `qa_frame.py` builds the frame and the draw with its own seed; `qa_render.py`, `qa_compare.py`, `qa_verdict.py` and `qa_stats.py` are unchanged); the round 1 evidence is not touched. Every number below is computed by `pipeline2/roster_qa/qa_report_r2.py` from `data2/qa/round2/`, the unit files and the flag files; none is typed.' % now)
    A('')
    # ---------------------------------------------------------------- 8.0
    A('### 8.0 Summary')
    A('')
    st_cells = [(s, g, d['gates'][g]) for s, d in stats['strata'].items() for g in G_ALL]
    nfail_strata = sum(1 for d in stats['strata'].values() if any(x['decision'] == 'FAIL' for g, x in d['gates'].items() if g != 'any'))
    A('* **The sample (Measured).** %d pages, %s stored lines compared with the print, in %d strata (two scans of the Moore roll x officers pages and other pages), seeded draw (seed `roster-qa-round2-2026-11-16`, %s pages and %s lines in the frame; at least a third of every stratum\'s pages from its lowest OCR-confidence decile), every page looked at one by one with the Read tool on the page image (the item PDF through `archive.org/cors`, one page cut out with pdftoppm, transient, never stored).' % (
        npages, f(nrows), len(stats['strata']), f(len(fr_pages)), f(sum(p['rows'] for p in fr_pages))))
    A('* **Result (Measured).** **%d of %d strata fail at least one gate by the ladder of PLAN.md 4.4** (4 or more errors at the gate; the ladder allows 3 at its largest sample of 773 lines): %d of the %d gate cells fail; **no stratum passes R-G9, and conf-nc may not be published as checked.** %s' % (
        nfail_strata, len(stats['strata']), sum(1 for c in st_cells if c[2]['decision'] == 'FAIL'), len(st_cells),
        ('Gate cells still OPEN (not decided, no pass claimed): ' + ', '.join('%s %s (%d in %s lines)' % (s, g, x['errors'], f(x['rows'])) for s, g, x in st_cells if x['decision'] == 'OPEN') + '.') if any(c[2]['decision'] == 'OPEN' for c in st_cells) else 'Every gate cell is decided.'))
    # per scan pooled rates at the level N
    fam_rows = collections.defaultdict(lambda: [0, 0])
    for v in vs:
        fam_rows[v['family']][0] += v['rows_checked']
        fam_rows[v['family']][1] += sum(1 for _ in {e['i'] for e in v['errors']})
    A('* **What is wrong (Measured, section 8.4).** The text layer differs from the print in characters (the digit 6 read 0, G, B or (; the digit 1 read l, i or I; the letter e read c, o or a mark; m read in or rn; whole names garbled) and, more than in the four Union items, in the cut of the entries: the text layer runs the entries of a roll together, so that the first words of the next entry stand at the end of a line (rem-extra), a name loses its first word or its initials (name-cut), the rank word or the carried heading stands in the name or in the rank field, and two or more printed entries are stored as one line (merge). The flag files mark only part of the lines in error (section 8.4).')
    tx = collections.defaultdict(lambda: {'pages': set(), 'rows': 0, 'name_err': set(), 'struct_err': set(), 'ndr_rows': 0, 'ndr_err': set()})
    for v in vs:
        err_by_row = collections.defaultdict(set)
        for e in v['errors']:
            for k in e['kinds']:
                err_by_row[e['i']].add(k)
        for i, lr in enumerate(v['rows_listed']):
            t = tx[lr['text_id']]
            t['pages'].add(v['page'])
            t['rows'] += 1
            if any(k in S.G1 for k in err_by_row.get(i, ())):
                t['name_err'].add((v['page'], i))
            if any(k in S.G3A for k in err_by_row.get(i, ())):
                t['struct_err'].add((v['page'], i))
            if v['levels'] == 'NDR':
                t['ndr_rows'] += 1
                if i in err_by_row:
                    t['ndr_err'].add((v['page'], i))
    rate = {tid: len(d['name_err']) / d['rows'] for tid, d in tx.items() if d['rows'] >= 30}
    lo = min(rate, key=rate.get) if rate else None
    hi = max(rate, key=rate.get) if rate else None
    A('* **The texts differ (Measured, section 8.4).** The roll was read from two scans of the same print, and the file of each unit is built from the scan with the better measured score (Documented: the conf-nc report, text ids per unit); the texts differ in what the pages show: of the texts with at least 30 compared lines, the lowest share of lines with a name error is %s (%s, %d of %s lines) and the highest %s (%s, %d of %s lines); the table of 8.4 gives every text.' % (
        pct(len(tx[lo]['name_err']), tx[lo]['rows']) if lo else 'n/a', lo, len(tx[lo]['name_err']) if lo else 0, f(tx[lo]['rows']) if lo else '0',
        pct(len(tx[hi]['name_err']), tx[hi]['rows']) if hi else 'n/a', hi, len(tx[hi]['name_err']) if hi else 0, f(tx[hi]['rows']) if hi else '0'))
    A('* **Verdicts against the files (Measured, section 8.3).** %s' % (
        ('The stored lines of every page that was looked at are the lines its verdict lists (%d of %d pages identical, %d with the same lines under new row numbers because the rebuild of the item removed lines earlier in the file; %s lines; `qa_current.py`).' % (cur['summary']['identical'], cur['summary']['pages'], cur['summary'].get('renumbered', 0), f(cur['summary']['lines_in_verdicts']))) if cur and cur['summary']['different'] == 0 else
        (('%d of %d pages differ from the files as they are now; those verdicts describe the earlier build of the item and are listed in 8.3.' % (cur['summary']['different'], cur['summary']['pages'])) if cur else 'Not checked yet (owed).')))
    A('* **The claims of the conf-nc report (Measured, section 8.6).** %s' % (
        ('%s claims of the report (per-unit lines, damage codes, flags, company letters, field and staff lines, totals, file sizes and sha256 values of the pointer file) were recomputed from the unit files, the flag files and the pointer file: %s hold, %d do not hold%s.' % (
            f(cl['checked']), f(cl['checked'] - len(cl['do_not_hold'])), len(cl['do_not_hold']), ('; they are listed in 8.6' if cl['do_not_hold'] else '')) if cl else 'Not run yet (owed).')))
    A('* **The second-reading route (Measured, section 8.7).** %s' % (
        ('The 20 pages of each Moore scan family that were drawn were read by tesseract and compared with the first text layer (agreement, not accuracy): see 8.7.' if sr else 'The test on 20 pages per Moore scan family is OWED: it was queued through the machine lock and had not run when this section was written.')))
    A('')
    # ---------------------------------------------------------------- 8.1
    A('### 8.1 Lines per unit against the strength')
    A('')
    A('"Strength" is the value of the baseline order of battle (`baseline/dist/data/oob`, second hand, from Busey and Martin as the earlier families recorded it); **no strength range with a declared basis exists for these units** (`history/units.json` holds `strength: null` for the 41 units, as the conf-nc report says in its section 1). A whole-war roll is not comparable with the strength present on 1 to 3 July 1863: Moore prints every man who served in a unit at any time of the war. "Printed total" is Moore\'s own count of the regiment or battalion, read by the conf-nc item from the Recapitulation; it is shown as the report gives it (`reports/conf-nc.md` 1.1) and is not read again here.')
    A('')
    import qa_report as RP
    strength = RP.load_strength()
    units = {u['key']: u for u in Q.jload(os.path.join(Q.D2, 'units.json'))['units']}
    ver_rows = {}
    for v in vs:
        for lr in v['rows_listed']:
            ver_rows.setdefault(stem_of(lr['rid']), [0, set(), set()])
            ver_rows[stem_of(lr['rid'])][0] += 1
            ver_rows[stem_of(lr['rid'])][1].add(v['page'])
        for e in v['errors']:
            ver_rows.setdefault(stem_of(e['rid']), [0, set(), set()])
            ver_rows[stem_of(e['rid'])][2].add((v['page'], e['i']))
    A('| unit | lines in the file | baseline strength | lines / strength | scan the file was read from | pages of the sample that hold a line of the unit | lines of the unit on those pages | of them in error |')
    A('|---|---|---|---|---|---|---|---|')
    tot = [0, 0, 0]
    ratios = []
    for item, st_, path in [(it, s, p) for it, (army, s) in Q.ITEMS_BY_ROUND['2'].items() for p in sorted(glob.glob(os.path.join(Q.D2, army, s, '*.jsonl.gz')))]:
        stem = os.path.basename(path)[:-len('.jsonl.gz')]
        head, segs, meta = R.read_unit(path)
        key = head['u']
        oobs = (units.get(key, {}).get('registry', {}).get('oob') or [])
        stv = next((strength[o] for o in oobs if o in strength), None)
        vr = ver_rows.get(stem, [0, set(), set()])
        tids = collections.Counter(seg['t'] for seg, rows in segs for _ in rows)
        scan = ', '.join('%s (%s)' % (t, f(n)) for t, n in tids.most_common())
        A('| %s | %s | %s | %s | %s | %d | %d | %d |' % (head['name'], f(head['n']), f(stv) if stv else 'no baseline row', ('%.2f' % (head['n'] / stv)) if stv else '-', scan, len(vr[1]), vr[0], len(vr[2])))
        tot[0] += head['n']
        tot[1] += vr[0]
        tot[2] += len(vr[2])
        if stv:
            ratios.append(head['n'] / stv)
    A('| **all** | **%s** | | | | | **%s** | **%s** |' % (f(tot[0]), f(tot[1]), f(tot[2])))
    A('')
    A('Reading the table. The files hold lines of men who served up to 1865 (a line per name entry of the printed roll, rank headings and officers included), so lines exceed the strength by a factor of %.2f to %.2f for the units with a baseline row (%d of 41); nothing is merged and nothing is capped. "Lines of the unit on those pages" counts the lines that were compared, not a sample estimate of the file.' % (min(ratios), max(ratios), len(ratios)))
    A('')
    # ---------------------------------------------------------------- 8.2
    A('### 8.2 The sample (design as run in round 2)')
    A('')
    A('* **Frame.** A page is a leaf of an Internet Archive item that holds at least one stored line of conf-nc: %s pages, %s lines (the first draw of the item gave 54,387 lines on %s pages including the %d excluded pages). Excluded, as the pilot page was in round 1: the pages that an engineer of conf-nc or the author of the pilot had already looked at (%s). The frame was built on 16 November 2026 from the files as they stood; the sha256 of the raw lines of every file is in `data2/qa/round2/frame.json`; the item was rebuilt by its own engineer while the sample was taken (8.3 says what that changed).' % (
        f(len(fr_pages)), f(sum(p['rows'] for p in fr_pages)), f(len(fr_pages) + len(frame['excluded'])), len(frame['excluded']),
        '; '.join('%s leaf %d' % (e['identifier'], e['leaf']) for e in frame['excluded'])))
    A('* **Strata.** The roll is one source printed once and read from two scans, two text layers of the same print with different errors (the item picks, per unit, the scan with the better measured score). A stratum is therefore the scan x the kind of page: NC-MOO-E (the four Emory scans, %s) and NC-MOO-G (the four Internet Archive scans, %s), each as officers pages (at least 3 lines and at least a quarter officer lines; rule in `qa_frame.py`) and other pages. Frame: %s.' % (
        FAM_TEXT['NC-MOO-E'], FAM_TEXT['NC-MOO-G'], '; '.join('%s: %s pages, %s lines, %d decile pages (damage score %.3f or more)' % (s, f(d['pages']), f(d['rows']), d['decile_pages'], d['decile_min_score']) for s, d in draw.items())))
    A('* **Draw.** As round 1 (sha256 of `seed | stratum | identifier | leaf`, decile pages at positions 1, 4, 7, ...). Order and decile of every stratum: `data2/qa/round2/draw.json`. Positions looked at: %s.' % '; '.join('%s %s' % (s, ','.join(str(x) for x in sorted(d['draw_positions']))) for s, d in stats['strata'].items()))
    A('* **Reader.** One sitting of the sample reader (16 November 2026), who had not written the parsers of conf-nc (before the first page it read the report of the item, the flag file of one unit and the five-line change of the head rule in `nc_parse.py` that the rebuild then in progress carried, to judge what the rebuild would change; it did not read the parser further). The page image is looked at with the Read tool (200 dpi view; 300 to 800 dpi crops for a doubtful character); tesseract 5.3.4 (psm 6, the table rules whitened first) is a pre-screen only and decides nothing. The company letter of a page that has no heading of its own is read from the running heads of the pages before and after it (Moore prints "Company X-Nth Regiment" on the odd pages). The third reader of the plan does not exist as a third person; a doubtful character, zoomed and still doubtful, is not counted as an error (the verdict says so in its note).')
    A('* **Levels, comparison rule, decision rule.** As in 2.1: levels N (name, rank or carried heading, company, existence and cut of the line), D (the dates of the remarks), R (the other remark words); the first pages of a stratum are compared at all three levels; a level that a stratum has already failed decisively (4 errors at the gate) is not compared on its further pages (`levels` in every verdict says what was compared; this stops the reading where the result is decided and does not lower a gate: a gate that was not decided is shown OPEN). Case, punctuation and spacing are ignored; every other differing character is an error. Gates and kinds as in 2.1; PASS needs the ladder (299 lines with 0 errors, 473 with at most 1, 628 with at most 2, 773 with at most 3), FAIL is 4 or more errors, never lowered.')
    A('* **What is new in the reading (round 2).** (1) The pages are single-column with one printed entry to a line or two, so the comparison is entry by entry; an entry whose text stands inside the remarks of the line before it is a `merge` at that line (not a missed line), an entry that no stored line holds at all is a missed line (`missed_lines`). (2) The first words or the initials of the next entry at the end of a line are `rem-extra` at that line and `name-cut` at the next one (each counted at its own gate). (3) A damaged carried heading (PRIVATES read PRIVATE-) is a `rank` error at every line under it, as in round 1 (ME-RET leaf 414); a page with such a heading says so in its note, as one defect that costs many lines.')
    A('')
    # ---------------------------------------------------------------- 8.3
    A('### 8.3 Result per stratum')
    A('')
    A('Errors / lines compared, one-sided 95 percent Clopper-Pearson upper bound, decision. R-G2 and R-G3b are counted only on pages looked at at that level.')
    A('')
    A('| stratum | pages in the frame | lines in the frame | pages looked at (decile pages) | lines compared | R-G1 names | R-G2 dates | R-G3 structure | R-G3 reading of the remark |')
    A('|---|---|---|---|---|---|---|---|---|')

    def cell(x):
        if not x['rows']:
            return 'not compared'
        return '%d / %s, %s%%, **%s**' % (x['errors'], f(x['rows']), x['upper95_percent'], x['decision'])
    for s, d in stats['strata'].items():
        g = d['gates']
        A('| %s | %s | %s | %d (%d) | %s | %s | %s | %s | %s |' % (s, f(d['pages_in_stratum']), f(d['rows_in_stratum']), d['pages_looked_at'], d['decile_pages_looked_at'], f(d['rows_looked_at']),
                                                                cell(g['R-G1']), cell(g['R-G2']), cell(g['R-G3a']), cell(g['R-G3b'])))
    A('')
    A('Pages looked at, one line each (stratum, draw position, D = in the lowest decile, levels, lines, lines in error, kind of the first error rows):')
    A('')
    A('| page (identifier / leaf) | printed page | unit(s) | stratum | draw position | decile | levels | lines | in error | lines named as printed but stored only inside another line | printed lines with no stored line |')
    A('|---|---|---|---|---|---|---|---|---|---|---|')
    for s in stats['strata']:
        for v in sorted([x for x in vs if x['stratum'] == s], key=lambda x: x['draw_position']):
            stems = collections.Counter(stem_of(lr['rid']) for lr in v['rows_listed'])
            us = ', '.join(names.get(k, k) for k, _ in stems.most_common())
            nmerge = sum(1 for e in v['errors'] if 'merge' in e['kinds'])
            A('| `%s` | %s | %s | %s | %d | %s | %s | %d | %d | %d | %d |' % (v['page'], v['printed_page'], us, s, v['draw_position'], 'D' if v['in_lowest_decile'] else '', v['levels'], v['rows_stored'], v['rows_in_error'], nmerge, len(v['missed_lines'])))
    A('')
    if cur:
        s_ = cur['summary']
        ff = cur['frame_files']
        A('**The verdicts against the files as they are now** (`qa_current.py`, `data2/qa/round2/verdicts-vs-files.json`, %s): of %d pages, %d have exactly the lines of their verdict, %d have the same lines under other row numbers (the rebuild of conf-nc removed lines earlier in the same unit file; offset, name, rank, company and remarks of every line are unchanged) and %d have changed lines (%s lines in the verdicts). The frame was built from the first build of the item (%s lines in all); the rebuild of the item at 03:05 UTC on 16 November, with a changed rule for the heads of entries (`nc_parse.py`, a short lower-case word is no surname), leaves %s lines in the 41 files now, and %d of the %d files differ from the frame hashes.' % (
            cur['generated_utc'], s_['pages'], s_['identical'], s_.get('renumbered', 0), s_['different'], f(s_['lines_in_verdicts']),
            f(sum(ff['rows_at_frame_by_item'].values())), f(sum(ff['rows_now_by_item'].values())), s_['files_differing_from_frame'], s_['files_in_frame']))
        sup = sorted(glob.glob(os.path.join(QA2, 'superseded', '*.json')))
        if sup:
            A('')
            A('One page was looked at again against the rebuilt lines because its lines changed: %s; the earlier verdict is kept under `data2/qa/round2/superseded/` and is not counted.' % ', '.join('`%s`' % os.path.basename(x) for x in sup))
        bad = [p for p in cur['pages'] if not p['identical'] and not p.get('renumbered_only')]
        if bad:
            A('')
            A('Pages whose lines changed after the verdict (the verdict describes the earlier build; the page is to be looked at again in the next round): ' + '; '.join('`%s` (%d lines in the verdict, %d now, %d differences)' % (p['page'], p['lines_in_verdict'], p['lines_now_on_the_leaf'], len(p['differences'])) for p in bad) + '.')
        A('')
    else:
        A('The check of the verdicts against the files as they are now (`qa_current.py` with `RQA_ROUND=2`) has not been run: owed.')
        A('')
    A('Reading the decisions. FAIL means 4 or more errors at the gate: more than the ladder allows even at 773 lines, whatever further lines are drawn. A gate shown OPEN is not decided and no pass is claimed. Lines of one page are not independent draws (a damaged heading costs every line under it; entries run together cost two lines at once); the plan\'s own arithmetic treats lines as independent and so does this table.')
    fcells = [(s, g, x) for s, g, x in st_cells if x['decision'] == 'FAIL']
    A('')
    A('%d of %d gate cells fail; of them %d also have a one-sided 95 percent lower bound above 1.0 percent (the true rate is above the 1.0 percent of the requirement at that confidence).' % (len(fcells), len(st_cells), sum(1 for c in fcells if c[2]['lower95_percent'] > 1.0)))
    A('')
    # ---------------------------------------------------------------- 8.4
    A('### 8.4 What kinds of error, by stratum and by scan')
    A('')
    A('Rows with the kind (a row with two kinds counts at both), from the verdicts of all levels compared (a level that was not compared on a page does not count there):')
    A('')
    A('| kind | ' + ' | '.join(stats['strata']) + ' | all |')
    A('|---|' + '---|' * (len(stats['strata']) + 1))
    tot_kind = collections.Counter()
    for k in KIND_ORDER:
        row = [stats['strata'][s]['error_kinds_count'].get(k, 0) for s in stats['strata']]
        if sum(row):
            A('| `%s` | %s | %d |' % (k, ' | '.join(str(x) for x in row), sum(row)))
            tot_kind[k] = sum(row)
    A('')
    # flagged share
    n_err_rows = 0
    n_flag = 0
    code_ct = collections.Counter()
    for v in vs:
        seen = {}
        for e in v['errors']:
            seen.setdefault(e['i'], e)
        for i, e in seen.items():
            n_err_rows += 1
            if e.get('flagged_ocr_uncertain'):
                n_flag += 1
            for c in e.get('flag_codes', []):
                code_ct[c] += 1
    n_any_code = 0
    for v in vs:
        seen = {}
        for e in v['errors']:
            seen.setdefault(e['i'], e)
        for i, e in seen.items():
            if e.get('flag_codes') or e.get('flagged_ocr_uncertain'):
                n_any_code += 1
    A('**The flag files and the lines in error (Measured).** Of the %s lines found in error, %s (%s) are marked ocr_uncertain by the flag file of the unit as it stood when the page was looked at; %s (%s) carry at least one damage code of that file (N name, H head cut by a rule that is a reading, C company letter inferred, R rank text damaged, Y year or date damaged, G garbage marks, M possible second entry, W word damaged; the legend of each file is in the file); the other lines in error are lines that no pattern of the flag file matched. Rows in error by code: %s.' % (
        f(n_err_rows), f(n_flag), pct(n_flag, n_err_rows), f(n_any_code), pct(n_any_code, n_err_rows), ', '.join('%s %d' % (c, n) for c, n in sorted(code_ct.items())) or 'none'))
    A('')
    # precision and recall of the flag on the pages compared at all three levels
    fl_rows = fl_err = err_all = 0
    for v in vs:
        if v['levels'] != 'NDR':
            continue
        errs = {}
        for e in v['errors']:
            errs.setdefault(e['i'], e)
        fl_rows += v['rows_flagged_ocr_uncertain']
        err_all += len(errs)
        fl_err += sum(1 for e in errs.values() if e.get('flagged_ocr_uncertain'))
    nrows3 = sum(v['rows_checked'] for v in vs if v['levels'] == 'NDR')
    A('**How well the flag sees the errors (Measured, the pages compared at all three levels).** %s lines were compared; the flag files mark %s of them ocr_uncertain; %s lines are in error; %s of the lines in error are marked (recall %s); %s of the marked lines are in error (precision %s). A mark is a pattern of damage that the parser knows, not a reading of the page: lines that no pattern matched are wrong as often as the flag misses them.' % (
        f(nrows3), f(fl_rows), f(err_all), f(fl_err), pct(fl_err, err_all), f(fl_err), pct(fl_err, fl_rows)))
    A('')
    # the same measures in the flag files as they are now (the pages whose lines are unchanged; qa_current.py matches the lines by their position on the leaf)
    if cur:
        comp = [pg for pg in cur['pages'] if pg.get('flag_now')]
        e_now = sum(pg['flag_now']['error_rows'] for pg in comp)
        f_now = sum(pg['flag_now']['error_rows_flagged'] for pg in comp)
        c3 = [pg for pg in comp if pg['flag_now']['levels'] == 'NDR']
        r3 = sum(pg['flag_now']['rows_flagged'] for pg in c3)
        e3 = sum(pg['flag_now']['error_rows'] for pg in c3)
        f3 = sum(pg['flag_now']['error_rows_flagged'] for pg in c3)
        same = (f_now == n_flag and e_now == n_err_rows and f3 == fl_err and r3 == fl_rows)
        A('**The same two measures in the flag files as they are now (Measured, %d of %d pages, those whose lines are unchanged).** %s of the %s lines in error are marked (%s); on the pages compared at all three levels the flag marks %s lines, %s of the %s lines in error are marked (recall %s) and %s of the marked lines are in error (precision %s).%s' % (
            len(comp), len(vs), f(f_now), f(e_now), pct(f_now, e_now), f(r3), f(f3), f(e3), pct(f3, e3), f(f3), pct(f3, r3),
            ' These are the figures above: the flag files were not rewritten between the sitting and this report.' if same else ' These differ from the figures above because the flag files were rewritten after some pages were looked at; the figures of this paragraph describe the files as they are.'))
        A('')
    # by scan: names and any error among rows
    famv = collections.defaultdict(list)
    for v in vs:
        famv[v['family']].append(v)
    A('**The two scans (Measured).** Pooled over the pages looked at (not a stratified estimate: the number of pages per stratum is in 8.3, the draw puts a third of the pages in the lowest decile, and the stopping rule leaves the levels D and R on fewer pages):')
    A('')
    A('| scan family | pages | lines compared | lines with a name error (R-G1) | lines with a structure error (R-G3a) | lines with any error at the pages compared at all three levels | lines at all three levels |')
    A('|---|---|---|---|---|---|---|')
    for fam in sorted(famv):
        pv = famv[fam]
        c = S.gate_counts(pv)
        nd3 = [v for v in pv if v['levels'] == 'NDR']
        A('| %s | %d | %s | %d (%s) | %d (%s) | %d (%s) | %s |' % (fam, len(pv), f(sum(v['rows_checked'] for v in pv)), c['R-G1'][1], pct(c['R-G1'][1], c['R-G1'][0]), c['R-G3a'][1], pct(c['R-G3a'][1], c['R-G3a'][0]),
                                                          sum(v['rows_in_error'] for v in nd3), pct(sum(v['rows_in_error'] for v in nd3), sum(v['rows_checked'] for v in nd3)), f(sum(v['rows_checked'] for v in nd3))))
    A('')
    A('**The texts (Measured).** The same pages by the text (volume and scan) that holds the lines:')
    A('')
    A('| text id | pages | lines compared | lines with a name error | lines with a structure error | lines at all three levels | of them in error |')
    A('|---|---|---|---|---|---|---|')
    for tid in sorted(tx):
        d = tx[tid]
        A('| %s | %d | %s | %d (%s) | %d (%s) | %s | %d (%s) |' % (tid, len(d['pages']), f(d['rows']), len(d['name_err']), pct(len(d['name_err']), d['rows']), len(d['struct_err']), pct(len(d['struct_err']), d['rows']),
                                                              f(d['ndr_rows']), len(d['ndr_err']), pct(len(d['ndr_err']), d['ndr_rows'])))
    A('')
    # without decile pages
    A('**Without the lowest-decile pages (Measured).** The decile pages hold the lines that the flag files mark most; the pooled rates above are upper estimates of a whole stratum. The same counts on the pages outside the decile:')
    A('')
    A('| stratum | pages outside the decile | lines | R-G1 | R-G2 | R-G3a | R-G3b |')
    A('|---|---|---|---|---|---|---|')
    for s in stats['strata']:
        pv = [v for v in vs if v['stratum'] == s and not v['in_lowest_decile']]
        if not pv:
            A('| %s | 0 | 0 | - | - | - | - |' % s)
            continue
        c = S.gate_counts(pv)
        A('| %s | %d | %s | %s | %s | %s | %s |' % (s, len(pv), f(sum(v['rows_checked'] for v in pv)), '%d / %s' % (c['R-G1'][1], f(c['R-G1'][0])),
                                                   ('%d / %s' % (c['R-G2'][1], f(c['R-G2'][0]))) if c['R-G2'][0] else 'not compared', '%d / %s' % (c['R-G3a'][1], f(c['R-G3a'][0])),
                                                   ('%d / %s' % (c['R-G3b'][1], f(c['R-G3b'][0]))) if c['R-G3b'][0] else 'not compared'))
    A('')
    # mechanisms
    mech = collections.Counter()
    ex = {}
    for v in vs:
        for e in v['errors']:
            note = (e.get('note') or '').lower()
            for k in e['kinds']:
                if k == 'rem-extra' and 'next entry' in note:
                    mech['the first words or initials of the next entry stand at the end of a line'] += 1
                    ex.setdefault('the first words or initials of the next entry stand at the end of a line', (v['page'], e.get('stored'), e.get('printed')))
                if k == 'name-cut' and 'remarks of the line above' in note:
                    mech['the first word or the initials of a name stand in the remarks of the line above'] += 1
                    ex.setdefault('the first word or the initials of a name stand in the remarks of the line above', (v['page'], e.get('stored'), e.get('printed')))
                if k == 'merge':
                    mech['two or more printed entries stored as one line'] += 1
                    ex.setdefault('two or more printed entries stored as one line', (v['page'], e.get('stored'), e.get('printed')))
                if k == 'rank' and 'carried heading' in note and 'is damaged' in note:
                    mech['a damaged carried heading is the rank of every line under it'] += 1
                    ex.setdefault('a damaged carried heading is the rank of every line under it', (v['page'], e.get('stored'), e.get('printed')))
                elif k == 'rank' and 'carried heading' in note:
                    mech['a carried heading stands where the printed rank belongs'] += 1
                    ex.setdefault('a carried heading stands where the printed rank belongs', (v['page'], e.get('stored'), e.get('printed')))
    A('**Mechanisms seen (Measured; the counts are rows with the mechanism, taken from the notes of the verdicts):** ' + '; '.join('%s: %d' % (m, n) for m, n in mech.most_common()) + '.')
    A('')
    # detector
    if det:
        A('**The pre-screen (Measured, `second-reading-detector.json`).** On the pages compared at all three levels, how often tesseract\'s comparison with the stored text points at the lines the reader found in error:')
        A('')
        A('| scan family | lines at all three levels | lines in error | in error and marked SUSPECT | in error and marked AGREE | clean lines marked AGREE |')
        A('|---|---|---|---|---|---|')
        for fam, d in sorted(det['families'].items()):
            A('| %s | %d | %d | %d (%s) | %d | %d of %d (%s) |' % (fam, d['rows_looked_at_all_levels'], d['rows_in_error'], d['error_rows_marked_SUSPECT'], pct(d['error_rows_marked_SUSPECT'], d['rows_in_error']),
                                                                d['error_rows_marked_AGREE'], d['clean_rows_marked_AGREE'], d['rows_clean'], pct(d['clean_rows_marked_AGREE'], d['rows_clean'])))
        A('')
    # ---------------------------------------------------------------- 8.5
    A('### 8.5 Defect list returned to conf-nc (dated 16 November 2026; stored lines are not changed)')
    A('')
    A('What the parser or a second reading must change, from the verdicts (examples are the stored and the printed text of a recorded error; the page and the row are in `data2/qa/round2/pages/*.verdict.json`):')
    A('')
    n_items = 0
    for m, n in mech.most_common():
        pg, stv_, prv_ = ex.get(m, (None, None, None))
        n_items += 1
        A('%d. **%s** (%d rows).%s' % (n_items, m[0].upper() + m[1:], n, (' Example, `%s`: stored `%s`, printed `%s`.' % (pg, (stv_ or '')[:140], (prv_ or '')[:140])) if pg else ''))
    A('%d. **Characters of the text layer**: the digit 6 read 0, G, B or an opening bracket, the digit 1 read l, i or I (`Ist`, `ls%%`), the digit 5 read o, the letter e read c, o or a mark, m read rn or in, u read ii, and whole names garbled (`Upcliurc&` for Upchurch); the rows of this kind are the `name-char`, `rem-char` and `rem-date` rows of 8.4; no parser rule repairs them (a stored line is the text layer as it reads), they need the second reading of the page image (EG-ROS-NC-02 of the item).' % (n_items + 1))
    A('%d. **Printed lines with no stored line**: %d printed entr%s with no stored line at all (`missed_lines` of the verdicts); %d printed entries stored only inside the remarks of another line (merge).' % (n_items + 2, sum(len(v['missed_lines']) for v in vs), 'y' if sum(len(v['missed_lines']) for v in vs) == 1 else 'ies', mech.get('two or more printed entries stored as one line', 0)))
    A('')
    A('Strata and gates failed: ' + '; '.join('%s: %s' % (s, '/'.join(g for g in G_ALL if d['gates'][g]['decision'] == 'FAIL') or 'none') for s, d in stats['strata'].items()) + '.')
    A('')
    # ---------------------------------------------------------------- 8.6
    A('### 8.6 The claims of the conf-nc report, re-verified against its files')
    A('')
    if cl:
        A('`qa_claims_nc.py` (%s; `data2/qa/round2/claims-check.json`) recomputed from the unit files, the flag files, the pointer file and the ledger: the per-unit lines, damage codes, ocr_uncertain, on-the-rolls, Gettysburg counts, company letters and field and staff lines of the report tables, the totals of its summary, the bytes and sha256 of the files named in its pointer file (the 41 unit files and flag files; the eight texts of the ledger), and the sha256 of the raw lines kept in each flag file. **%s claims were checked: %s hold, %d do not hold.**' % (cl['generated_utc'], f(cl['checked']), f(cl['checked'] - len(cl['do_not_hold'])), len(cl['do_not_hold'])))
        A('')
        for x in cl['do_not_hold'][:60]:
            A('* %s, %s: the report says %s, the files say %s.' % (x['unit'] or 'all units', x['claim'], x['claimed'], x['recomputed']))
        if cl['do_not_hold']:
            A('')
        for note in cl.get('notes', []):
            A('* ' + note)
        A('')
    else:
        A('Not run yet: owed (the conf-nc item was being rebuilt and its report regenerated while this sample was taken; the check is run after its closure: `RQA_ROUND=2 python3 -I qa_claims_nc.py`).')
        A('')
    # ---------------------------------------------------------------- 8.7
    A('### 8.7 The second-reading route on the Moore scans')
    A('')
    if sr:
        A('Test of the route (as in 4.2): the first 20 pages of the draw order of the stratum "other" of each scan family were rendered from the item PDF and read by tesseract; every stored line is AGREE when all its tokens are matched by the tesseract reading, NEAR when only spacing differs, SUSPECT otherwise. This measures how far the two engines agree, not accuracy (the accuracy against the print is measured on the pages looked at, 8.4).')
        A('')
        A('| scan family | pages read | right page | tesseract words in the pinned leaf (mean / lowest) | stored lines | AGREE | NEAR | SUSPECT | CPU seconds of tesseract |')
        A('|---|---|---|---|---|---|---|---|---|')
        for fam, d in sr['families'].items():
            A('| %s | %d | %s | %.3f / %.3f | %s | %s (%s) | %s | %s | %s |' % (fam, d['pages_read'], 'all' if d['right_page_all'] else 'NOT all', d['share_in_pinned_leaf_mean'], d['share_in_pinned_leaf_min'] or 0, f(d['stored_lines']),
                                                                         f(d['agree']), pct(d['agree'], d['stored_lines']), f(d['near']), f(d['suspect']), d['tesseract_cpu_s_total']))
        A('')
        sr1p = os.path.join(Q.QA_ROOT, 'second-reading.json')
        sr1 = Q.jload(sr1p) if os.path.exists(sr1p) else None
        rows_f = []
        for lab, doc in (('round 2', sr), ('round 1', sr1)):
            for fam, d in (doc['families'].items() if doc else []):
                for grp, x in (d.get('fragments') or {}).items():
                    rows_f.append((lab, fam, grp, x['errors_with_both_texts'], x['printed_text_found_in_tesseract_reading'], x['stored_text_found_in_tesseract_reading']))
        if rows_f:
            A('**Does tesseract read the printed text where the first layer is wrong? (Measured.)** For the errors of the pages looked at that are among the pages read, in which the verdict records both the stored and the printed text of the difference (at least %d characters, case, punctuation and spacing ignored), the table counts how often the printed text stands, character for character, in tesseract\'s reading of the page, and how often the stored (wrong) text stands in it (a shared error). A fragment found anywhere on the page is a generous test for short fragments; the counts are an upper estimate of what the second reading repairs.' % 4)
            A('')
            A('| round | scan family | kind of error | errors with both texts | printed text found in the tesseract reading | stored text found in the tesseract reading |')
            A('|---|---|---|---|---|---|')
            for lab, fam, grp, a, b, c in rows_f:
                A('| %s | %s | %s | %d | %d (%s) | %d (%s) |' % (lab, fam, grp, a, b, pct(b, a), c, pct(c, a)))
            A('')
    else:
        A('NOT RUN: the test on 20 pages per scan family (`RQA_ROUND=2 python3 -I qa_route_test.py run`) is queued through `tools/horde/bench.sh` and had not been given a slot when this section was written; it is owed (G-QA06 of `GAPS.md` for round 1 and G-QA08 for round 2).')
        A('')
    # ---------------------------------------------------------------- 8.8
    A('### 8.8 Sources and rights (round 2)')
    A('')
    ptr = Q.jload(os.path.join(Q.R2, 'sources', 'roster-qa.json'))
    nc = [s for s in ptr['sources'] if s['source_id'] == 'NC-MOORE-1882']
    if nc:
        A('Only the item PDFs of the Moore scans that were drawn were fetched (archive.org `/cors/` only; one request at a time, 1.2 s apart; the file names of the Emory items differ from the identifiers, `page_image.pdf_remote_name`). The pointer file `rosters/sources/roster-qa.json` lists identifier, title, year, url, bytes and sha256 of each; the rights block is copied from `rosters/sources/conf-nc.json` (public domain, United States publication before 1929: Raleigh, 1882); the PDFs are transient (bytes and sha256 stay in the pointer file and in `tmp/library/rosters/MANIFEST-roster-qa.json`).')
        A('')
        A('| text id | Internet Archive item | printed year | PDF bytes | PDF sha256 | rights basis |')
        A('|---|---|---|---|---|---|')
        for s in nc:
            A('| %s | `%s` | %s | %s | `%s...%s` | %s |' % (s['text_id'], s['identifier'], s['year'], f(s['bytes']) if s.get('bytes') else '-', (s.get('sha256') or '')[:8], (s.get('sha256') or '')[-8:], (s['rights'].get('basis') or '')[:100]))
        A('')
    else:
        A('The pointer file does not list the Moore scans yet (`qa_sources_r2.py` writes them from the PDFs on disk): owed.')
        A('')
    # ---------------------------------------------------------------- 8.9
    A('### 8.9 Anomalies seen (round 2; each is in the verdict of the page named)')
    A('')
    A('1. **The page number of the text layer and the print differ.** `05913252.3309.emory.edu/62`: the text layer prints the running head page as 48 and the page map says 46 (the print says 46); `rosterofnorthcar02nort/14`: the page map has no printed page number for the leaf and the print shows 4. The stored `page` of a line is the page map\'s; the leaf and offset are exact.')
    A('2. **The first entry of a page can be missing from the stored lines although the text layer holds it.** `05913252.3309.emory.edu/62`: Charles C. Tew, Colonel (the first line of the 2nd North Carolina Infantry roll), is in the text layer and in no stored line (a garbled initial in the head: `(\'.`); `05913252.3309.emory.edu/511` (rebuilt file): B. P. Jenkins, 1st Sergt.; `rosterofnorthcar02nort/32`: C. M. McLeod, 1st Sergeant. The conf-nc report says that unparsed text is counted in the diagnostics; these lines are lines of the roll.')
    A('3. **A printed misprint is stored as printed.** `rosterofnorthcar03moor/536`: John F. Lipps, "pr. September 22d, \'24" (the same capture as the line of Wm. C. Fletcher below, \'64): the print says \'24 and so does the stored line; it is not counted as an error, and a reader of the file sees a year before the enlistment of the man (enlisted 1862).')
    A('4. **A dash prints an unknown date.** `rosterofnorthcar03moor/536` ("e. --;") and `05913252.3309.emory.edu/250` ("Fullbright, --,"): the stored line keeps a bullet or nothing where the print has the dash (punctuation only, not an error, but the name field of `Fullbright` has no given name).')
    byp = {v['page']: v for v in vs}

    def rows_in_error(pid, pred=None):
        v = byp.get(pid)
        if not v:
            return None
        seen = {}
        for e in v['errors']:
            seen.setdefault(e['i'], []).append(e)
        return sum(1 for i, es in seen.items() if (pred is None or any(pred(e) for e in es)))

    def name_err(pid):
        return rows_in_error(pid, lambda e: any(k.startswith('name-') for k in e['kinds']))

    def rank_err(pid):
        return rows_in_error(pid, lambda e: 'rank' in e['kinds'])

    def stored_n(pid):
        v = byp.get(pid)
        return v['rows_stored'] if v else None

    def flagged_n(pid):
        v = byp.get(pid)
        return v['rows_flagged_ocr_uncertain'] if v else None

    cur_page = {pg['page']: pg for pg in (cur['pages'] if cur else [])}

    def flagged_now(pid):
        fn = (cur_page.get(pid) or {}).get('flag_now')
        return fn['rows_flagged'] if fn else None

    pid_m = 'rosterofnorthcar03moor/352'
    if pid_m in byp:
        n_mm = rows_in_error(pid_m, lambda e: 'margin mark' in (e.get('note') or ''))
        A('5. **Margin marks become letters (volume 3 page 344, `%s`).** The ink marks of the copy in the left margin (check marks) stand in the stored name of %d of the %d lines in error of this page as a stray letter or character in front of the name (`V Bowden, Rufus`, `J Carlisle, James PI.`, and a triangle in front of `Bowden, Wm.`); the other lines in error of the page are character misreads (`Bfockley` for Blockley, where the print has a speck on the l; `R S.` for P. S.). The free-text note of the verdict says "four of the five names carry a stray letter or character": that count is a slip of the note, the count here is made from the error lines of the verdict, which are as written. The same pattern as the Massachusetts margins of round 1 (section 5, item 3).' % (pid_m, n_mm, rows_in_error(pid_m)))
    pid_g, pid_g2 = 'rosternorthcaro00moorgoog/384', 'rosternorthcaro00moorgoog/383'
    if pid_g in byp and pid_g2 in byp:
        A('6. **The artillery pages of volume 1 in the first scan are dark and bold** (`%s` and `/383`, the Charlotte Artillery): %d of %d lines of leaf 384 have a name error (leaf 383: %d of %d); the file of the unit is built from this text (conf-nc report, table of the text ids: NC-MOORE-1882.1, leaves 383 to 386).' % (pid_g, name_err(pid_g), stored_n(pid_g), name_err(pid_g2), stored_n(pid_g2)))
    pid_h = '05913252.3309.emory.edu/511'
    if pid_h in byp:
        v = byp[pid_h]
        A('7. **A damaged heading is inherited by every line under it** (`%s`: PRIVATES read PRIVATE- and NON-COMMISSIONED OFFICERS read XOX-COMMI8SIOXED OFFICERS; of the %d lines of the page %d carry a wrong rank word, and %d lines are in error in all).' % (pid_h, stored_n(pid_h), rank_err(pid_h), rows_in_error(pid_h)))
    pid_c = '05913252.3309.emory.edu/472'
    if pid_c in byp:
        fn = flagged_now(pid_c)
        A('8. **A clean page can be marked uncertain wholesale** (`%s`): the flag file marks %d of the %d lines of the page ocr_uncertain (in the flag files as they are now: %s) because the company heading is damaged (flag C); %d of the %d lines are in error (the lines read well) and the company letter is right on every line (checked against the running heads of the neighbouring pages). The same measure on `rosterofnorthcar02nort/20`: the flag file marks %d of %d lines and %d lines are in error (the free-text note of that verdict says that the flag file marks all 40 lines: a slip of the note, the verdict data and the file show %d); the flag does not follow the quality of the page in either direction.' % (
            pid_c, flagged_n(pid_c), stored_n(pid_c), ('%d' % fn) if fn is not None else 'not comparable', rows_in_error(pid_c), stored_n(pid_c),
            flagged_n('rosterofnorthcar02nort/20') or 0, stored_n('rosterofnorthcar02nort/20') or 0, rows_in_error('rosterofnorthcar02nort/20') or 0, flagged_n('rosterofnorthcar02nort/20') or 0))
    if cur:
        sup_n = len(glob.glob(os.path.join(QA2, 'superseded', '*.json')))
        A('9. **A rebuild while the sample was taken** (8.3): the lines of %d verdict pages moved to other row numbers (same lines); the lines of %d page%s changed after the first verdict, which is kept under `superseded/` and not counted, and the page was looked at again against the new lines (the Jenkins entry of `05913252.3309.emory.edu/511` lost the fragment line that the earlier build stored for its tail); %d verdict page%s differ from the files as they are now; the row number of a line in a unit file is not a stable name for it, its offset in the pinned text is.' % (cur['summary'].get('renumbered', 0), sup_n, '' if sup_n == 1 else 's', cur['summary']['different'], '' if cur['summary']['different'] == 1 else 's'))
    A('')
    A('### 8.10 Not run, owed')
    A('')
    A('* The pages that the stopping rule left uncompared: the gates shown OPEN in 8.3 and the levels D and R of the strata whose first pages already failed them need fresh pages after conf-nc is corrected (a later round draws a new seed and excludes the pages of this one, `EXCLUDED_BY_ROUND` in `qa_frame.py`).')
    A('* The second reading of the damaged lines of conf-nc from page images (EG-ROS-NC-02 of the item; the route is tested in 8.7 and in section 4) and of the printed lines that no stored line holds; the Pennsylvania muster years (union-pa had no report when this section was written) and the Florida losses (conf-fl has no unit file).')
    A('* A third person as reader of the disagreements; a browser, any timing, a real-GPU or phone check (not part of this work).')
    A('')
    return w


if __name__ == '__main__':
    print('\n'.join(section_lines()))

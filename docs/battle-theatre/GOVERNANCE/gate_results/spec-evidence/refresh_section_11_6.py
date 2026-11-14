#!/usr/bin/env python3
"""Write the result cells of the table 'Run' in section 11.6 of GATE-SPEC.md from the saved outputs (<check>_v4.out). The only script of this folder
that writes the spec, and it writes only those six cells (a cell still holding its @@TOKEN@@, or a row that already holds a result). Usage: python3 -I refresh_section_11_6.py [suffix]"""
import re, sys, os, json
HERE = os.path.dirname(os.path.abspath(__file__)); SPEC = os.path.join(HERE, '..', 'GATE-SPEC.md')
suf = sys.argv[1] if len(sys.argv) > 1 else 'v4'
rd = lambda n: open(os.path.join(HERE, f'{n}_{suf}.out'), encoding='utf-8').read()
s = rd('check_gs_structure'); sj = json.loads(s[:s.index('}\n') + 1] if s.lstrip().startswith('{') else '{}')
notes = ' '.join(sj.get('notes', []))
m = lambda pat: re.search(pat, notes)
tables = m(r'(\d+) tables, (\d+) body rows'); chk = m(r'(\d+) numbered checks'); rc = m(r'(\d+) requirement-level'); thr = m(r'(\d+) thresholds'); dd = m(r'cited here: (\d+)')
STRUCT = (f"`check_gs_structure_{suf}.out`: {tables.group(1)} tables with {tables.group(2)} body rows, none with a wrong cell count; 28 gate sections, each with its text, definition, numbered checks, item rule, runner (command and output file), runs, gates and state; {chk.group(1)} numbered checks, equal to those of `GATE-SPEC-A.md` and contiguous per gate; U 28, A 57, X 56 and K 13 defined once and in order; {rc.group(1)} requirement-level check items; {thr.group(1)} thresholds; every U, A, X, T, RC and Q id used is defined; {dd.group(1)} DD-G ids cited, all rows of the decisions file; {sj.get('problems', '?')} problems")
q = json.loads(rd('check_quotes').split('\n')[0])
QUOTES = f"`check_quotes_{suf}.out`: {q['quoted_checked']} quoted strings: {q['found_on_cited_page']} found on a cited page, {q['no_page_cited_found_in_plan']} with no page on their line found elsewhere in the plan, {q['wrong_page']} on another page only, {q['not_in_plan'] + q['no_page_cited_not_in_plan']} not in the plan"
pg = json.loads(rd('check_pages').strip().split('\n')[-1])
PAGES = f"`check_pages_{suf}.out`: {pg['mismatches']} mismatches of a page and a section label"
pt = json.loads(rd('check_gs_paths').split('\n')[0])
PATHS = f"`check_gs_paths_{suf}.out`: {pt['path_like_tokens']} path-like tokens: {pt['exist']} exist, {pt['announced_planned_or_generated']} are announced by the file as planned or generated, {pt['not_found']} not found"
cn = json.loads(rd('check_gs_counts').split('\n')[0])
COUNTS = f"`check_gs_counts_{suf}.out`: {cn['checks']} checks of stable counts against the files (rows by class and origin, linked and unlinked, register entries and files, timeline tiers and statuses, the night minutes, the schedule and conflict-default tiers), {cn['failed']} mismatches"
ng = re.search(r'controls: (\d+), reported: (\d+), missed: (\d+)', rd('negative_controls'))
NEG = f"`negative_controls_{suf}.out`: {ng.group(1)} injected defects (a gate without its runner part, a table row with a missing cell, a missing X entry, an undefined id, a made-up quotation, a quotation on the wrong page, a wrong page label, a path that does not exist, a wrong count), {ng.group(2)} reported by the check they target, {ng.group(3)} missed"
rows = {'`python3 -I spec-evidence/check_gs_structure.py`': STRUCT, '`python3 -I spec-a-evidence/check_quotes.py ../GATE-SPEC.md`': QUOTES,
        '`python3 -I spec-a-evidence/check_pages.py ../GATE-SPEC.md`': PAGES, '`python3 -I spec-evidence/check_gs_paths.py`': PATHS,
        '`python3 -I spec-evidence/check_gs_counts.py`': COUNTS, '`bash spec-evidence/negative_controls.sh`': NEG}
lines = open(SPEC, encoding='utf-8').read().split('\n'); done = 0
for i, l in enumerate(lines):
    for k, v in rows.items():
        if l.startswith('| ' + k + ' | '):
            lines[i] = '| ' + k + ' | ' + v + ' |'; done += 1
if done != 6: print(f'expected 6 rows, found {done}'); sys.exit(1)
open(SPEC, 'w', encoding='utf-8').write('\n'.join(lines)); print('written: 6 result cells of 11.6')

#!/usr/bin/env python3
"""Rewrite the result cells of the table in section 11.3 of GATE-SPEC-A.md from the saved outputs <check>_<suffix>.out (default v4) of run_all_checks.sh,
so that the numbers printed in the spec are the numbers of the last run and never typed by hand. Refuses to write when a check is not clean
(a mismatch, an undefined cross-reference, a quotation on another page or not in the plan, a page mismatch, a path not found).
This is the only script of this folder that writes the spec, and it writes only those six table cells.
Usage: bash run_all_checks.sh [suffix] && python3 -I refresh_section_11_numbers.py [suffix]"""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from plan_lib import SPEC

H = os.path.dirname(os.path.abspath(__file__))
SUF = sys.argv[1] if len(sys.argv) > 1 else 'v4'
sys.path.insert(0, H)
import report_problems
last = lambda f: json.loads([l for l in open(os.path.join(H, f), encoding='utf-8').read().split('\n') if l.startswith('{')][-1])
c = last('%s_%s.out' % ('check_counts', SUF))
st = json.load(open(os.path.join(H, '%s_%s.out' % ('check_structure', SUF)), encoding='utf-8'))
gp = json.load(open(os.path.join(H, '%s_%s.out' % ('check_gate_parts', SUF)), encoding='utf-8'))
pa = json.loads([l for l in open(os.path.join(H, '%s_%s.out' % ('check_paths', SUF)), encoding='utf-8') if l.startswith('{')][0])
pg = [json.loads(l) for l in open(os.path.join(H, '%s_%s.out' % ('check_pages', SUF)), encoding='utf-8') if l.startswith('{')]
qu = json.loads(open(os.path.join(H, '%s_%s.out' % ('check_quotes', SUF)), encoding='utf-8').readline())
bad = {ch: report_problems.problems(ch, open(os.path.join(H, '%s_%s.out' % (ch, SUF)), encoding='utf-8').read()) for ch in report_problems.CHECKS}
bad = {k: v for k, v in bad.items() if v}
if bad:
    print('a check is not clean: nothing written', json.dumps(bad)[:600]); sys.exit(1)
n = sum(gp['numbered_checks_per_gate'].values())
cells = {
    'check_counts': f"{c['checks']} hard checks, {c['ok']} ok, {c['mismatches']} mismatches, and the soft counts of files that other workstreams were still writing, {c.get('soft_checks_stale', 0)} of them STALE: the class counts and the total of 2.2, one derived gate per owner row, the 71 requirement-level checks (39 of them the only children of 12 requirements), U-01 to U-28, A-01 to A-60 and DD-G01 to DD-G20 contiguous (each DD-G a row of the decisions file), the 42 threshold ids, the 13 rows outside the clock, sections 1 to 11, the 28 gate sections, and the register, timeline, correction-record (by kind and by class), status-word, vegetation, realization, photo-match and night-minute counts that the file states",
    'check_structure': f"{st['tables']} tables with {st['table_body_rows']} body rows, none with a wrong cell count; {st['cross_refs_used']} cross-references, 0 undefined ({len(st['external_cross_refs_only_in_section_11'])} ids of the log of `GATE-SPEC.md` are used only in this section); the {st['gate_texts_verbatim_on_p136_and_in_gates_json']} gate texts equal `gates.json` and p. 136 word for word, typography folded",
    'check_gate_parts': f"{gp['gate_sections']} gate sections, each with its text, checks, inputs, item, result, can-pass, registered-instead, judges and runs parts; {n} numbered checks Qnn.k; 0 problems",
    'check_paths': f"{pa['path_like_tokens']} path-like tokens: {pa['exist']} exist, {pa['announced_absent_or_generated']} are named by the file itself as absent or generated, {pa['not_found']} not found",
    'check_pages': f"{pg[-2]['pairs_checked']} citations of page and section label, {pg[-1]['mismatches']} mismatches",
    'check_quotes': f"{qu['quoted_checked']} quoted strings: {qu['found_on_cited_page']} found on a cited page, {qu['no_page_cited_found_in_plan']} with no page cited found elsewhere in the plan, {qu['wrong_page']} on another page only, {qu['not_in_plan'] + qu['no_page_cited_not_in_plan']} not in the plan",
}
t = open(SPEC, encoding='utf-8').read(); changed = 0
for name, cell in cells.items():
    pat = re.compile(r'(\| `python3 -I spec-a-evidence/%s\.py` \| `%s_%s\.out`: )(.*?)( \|\n)' % (name, name, SUF))
    m = pat.search(t)
    if not m: print('row not found:', name); sys.exit(1)
    if m.group(2) != cell: changed += 1
    t = t[:m.start(2)] + cell + t[m.end(2):]
open(SPEC, 'w', encoding='utf-8').write(t)
print('cells changed:', changed)

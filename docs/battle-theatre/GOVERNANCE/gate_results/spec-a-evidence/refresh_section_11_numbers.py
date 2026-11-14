#!/usr/bin/env python3
"""Rewrite the result cells of the table in section 11.3 of GATE-SPEC-A.md from the saved outputs <check>_v3.out of run_all_checks.sh,
so that the numbers printed in the spec are the numbers of the last run and never typed by hand. Refuses to write when a check is not clean
(a mismatch, an undefined cross-reference, a quotation on another page or not in the plan, a page mismatch, a path not found).
This is the only script of this folder that writes the spec, and it writes only those six table cells.
Usage: bash run_all_checks.sh && python3 -I refresh_section_11_numbers.py"""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from plan_lib import SPEC

H = os.path.dirname(os.path.abspath(__file__))
last = lambda f: json.loads([l for l in open(os.path.join(H, f), encoding='utf-8').read().split('\n') if l.startswith('{')][-1])
c = last('check_counts_v3.out')
st = json.load(open(os.path.join(H, 'check_structure_v3.out'), encoding='utf-8'))
gp = json.load(open(os.path.join(H, 'check_gate_parts_v3.out'), encoding='utf-8'))
pa = json.loads([l for l in open(os.path.join(H, 'check_paths_v3.out'), encoding='utf-8') if l.startswith('{')][0])
pg = [json.loads(l) for l in open(os.path.join(H, 'check_pages_v3.out'), encoding='utf-8') if l.startswith('{')]
qu = json.loads(open(os.path.join(H, 'check_quotes_v3.out'), encoding='utf-8').readline())
clean = (c['mismatches'] == 0 and not st['rows_with_wrong_cell_count'] and not st['cross_refs_not_defined_by_a_heading_or_row'] and not st['gate_text_problems']
         and not gp['with_problems'] and pa['not_found'] == 0 and pg[-1]['mismatches'] == 0 and qu['wrong_page'] == 0 and qu['not_in_plan'] == 0 and qu['no_page_cited_not_in_plan'] == 0)
if not clean:
    print('a check is not clean: nothing written'); sys.exit(1)
n = sum(gp['numbered_checks_per_gate'].values())
cells = {
    'check_counts': f"{c['checks']} checks, {c['ok']} ok, {c['mismatches']} mismatches: the class counts and the total of 2.2, one derived gate per owner row, the 71 requirement-level checks (39 of them the only children of 12 requirements), U-01 to U-28, A-01 to A-57 and DD-G01 to DD-G15 contiguous (each DD-G a row of the decisions file), sections 1 to 11, the 28 gate sections, and the register, timeline, correction-record (by kind and by class), status-word and night-minute counts that the file states",
    'check_structure': f"{st['tables']} tables with {st['table_body_rows']} body rows, none with a wrong cell count; {st['cross_refs_used']} cross-references, 0 undefined ({len(st['external_cross_refs_only_in_section_11'])} ids of the log of `GATE-SPEC.md` are used only in this section); the {st['gate_texts_verbatim_on_p136_and_in_gates_json']} gate texts equal `gates.json` and p. 136 word for word, typography folded",
    'check_gate_parts': f"{gp['gate_sections']} gate sections, each with its text, checks, inputs, item, result, can-pass, registered-instead, judges and runs parts; {n} numbered checks Qnn.k; 0 problems",
    'check_paths': f"{pa['path_like_tokens']} path-like tokens: {pa['exist']} exist, {pa['announced_absent_or_generated']} are named by the file itself as absent or generated, {pa['not_found']} not found",
    'check_pages': f"{pg[-2]['pairs_checked']} citations of page and section label, {pg[-1]['mismatches']} mismatches",
    'check_quotes': f"{qu['quoted_checked']} quoted strings: {qu['found_on_cited_page']} found on a cited page, {qu['no_page_cited_found_in_plan']} with no page cited found elsewhere in the plan, {qu['wrong_page']} on another page only, {qu['not_in_plan'] + qu['no_page_cited_not_in_plan']} not in the plan",
}
t = open(SPEC, encoding='utf-8').read(); changed = 0
for name, cell in cells.items():
    pat = re.compile(r'(\| `python3 -I spec-a-evidence/%s\.py` \| `%s_v3\.out`: )(.*?)( \|\n)' % (name, name))
    m = pat.search(t)
    if not m: print('row not found:', name); sys.exit(1)
    if m.group(2) != cell: changed += 1
    t = t[:m.start(2)] + cell + t[m.end(2):]
open(SPEC, 'w', encoding='utf-8').write(t)
print('cells changed:', changed)

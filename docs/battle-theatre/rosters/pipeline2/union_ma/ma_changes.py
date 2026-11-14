"""What changed between the unit files of the first run (13 November 2026, 33,748 lines; the copy is kept in tmp/library/rosters/_ma_logs/before) and the files now.

    python3 -I ma_changes.py        writes GOVERNANCE/horde/ws-rosters/union-ma/changes-after-reconciliation.json

Lines are compared by the character offset of the name in the pinned text.  A line that is in the files now and not in the first files is either a line the first run
had missed (the third head rule: lines_added_by_third_head_rule) or a line whose name starts earlier (names_cut_differently: the old line stands at an offset within
60 characters and ends with the same last name token); a line whose company code differs is a line under a reviewed heading; a line with the same offset, the same company
and other remarks is a line whose remarks the new rules shortened (the next entry was cut out of them) or lengthened (a number alone on its line at a page break is kept).
Standard library only.
"""
import sys, os, glob, json, collections

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import r2lib as R

ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..', '..'))
B = os.path.join(ROOT, 'tmp', 'library', 'rosters', '_ma_logs', 'before')
A = os.path.join(ROOT, 'docs', 'battle-theatre', 'rosters', 'data2', 'union', 'ma')
GOV = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'horde', 'ws-rosters', 'union-ma')


def main():
    out = {'format': 'ma-changes-after-reconciliation/1',
           'about': 'The 24 unit files as the first run of 13 November 2026 wrote them (33,748 lines) against the files now. Rules of the parser changed after the reconciliation with the earlier roll files '
                    'showed defects (union_ma/ma_parse.py, ma_cuts.py, ma_dates.py): a third head rule, name-cut refinements, three reviewed name cuts, two reviewed headings, a number alone on its line '
                    'at a page break kept in the remarks. Lines are compared by the character offset of the name in the pinned text.', 'units': {}}
    tot = collections.Counter()
    for f in sorted(glob.glob(os.path.join(A, '*.jsonl.gz'))):
        if f.endswith('.flags.json.gz'):
            continue
        stem = os.path.basename(f)
        h0, s0, _ = R.read_unit(os.path.join(B, stem))
        h1, s1, _ = R.read_unit(f)
        r0 = {r[5]: r for _, rr in s0 for r in rr}
        r1 = {r[5]: r for _, rr in s1 for r in rr}
        added = sorted(set(r1) - set(r0))
        removed = sorted(set(r0) - set(r1))
        moved, pure_added = [], []
        rem_left = set(removed)
        for o in added:
            n1 = r1[o][0]
            cand = [x for x in rem_left if abs(x - o) <= 60 and n1.split()[-1] == r0[x][0].split()[-1]]
            if cand:
                x = cand[0]
                rem_left.discard(x)
                moved.append((x, o))
            else:
                pure_added.append(o)
        common = set(r0) & set(r1)
        comp = [o for o in common if r0[o][2] != r1[o][2]]
        shorter = [o for o in common if r0[o][2] == r1[o][2] and len(r1[o][3]) < len(r0[o][3])]
        longer = [o for o in common if r0[o][2] == r1[o][2] and len(r1[o][3]) > len(r0[o][3])]
        u = {'lines_before': len(r0), 'lines_now': len(r1), 'lines_added_by_third_head_rule': len(pure_added), 'names_cut_differently': len(moved),
             'company_changed_by_reviewed_heading': len(comp), 'host_lines_with_shorter_remarks': len(shorter), 'lines_with_longer_remarks_page_break_number': len(longer),
             'lines_removed_unmatched': len(rem_left),
             'added': [{'page': r1[o][4], 'offset': o, 'name': r1[o][0], 'rank': r1[o][1], 'co': r1[o][2]} for o in pure_added],
             'name_cuts': [{'page': r1[o][4], 'offset_before': x, 'offset_now': o, 'name_before': r0[x][0], 'name_now': r1[o][0]} for x, o in moved],
             'longer': [{'page': r1[o][4], 'offset': o, 'name': r1[o][0], 'tail_now': r1[o][3][-30:]} for o in sorted(longer)],
             'company_changes': {'from': sorted({r0[o][2] for o in comp}), 'to': sorted({r1[o][2] for o in comp}), 'n': len(comp)}}
        out['units'][h1['u']] = u
        for k in ('lines_before', 'lines_now', 'lines_added_by_third_head_rule', 'names_cut_differently', 'company_changed_by_reviewed_heading', 'host_lines_with_shorter_remarks',
                  'lines_with_longer_remarks_page_break_number', 'lines_removed_unmatched'):
            tot[k] += u[k]
    out['totals'] = dict(tot)
    with open(os.path.join(GOV, 'changes-after-reconciliation.json'), 'w', encoding='utf-8') as fh:
        json.dump(out, fh, ensure_ascii=False, indent=1)
        fh.write('\n')
    print(dict(tot))
    return 0


if __name__ == '__main__':
    sys.exit(main())

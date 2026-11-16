"""Row-by-row difference between two builds of the unit files (the first build and the build after the parser rules were corrected on review).

    python3 -I nc_diff.py OLD_DIR      OLD_DIR holds the unit files (*.jsonl.gz) of the first build; the files under rosters/data2/confederate/nc are the new build
                                       writes GOVERNANCE/horde/ws-rosters/conf-nc/changes-after-review.json (per unit: rows before and after, the changed blocks with the printed
                                       names and the first 60 characters of the remarks of each side)

The changes are listed, never hidden: a line that moved from one reading to another is a change of the parser, not of a printed word.
"""
import os, sys, json, glob, difflib, collections

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import nc_lib as L
import r2lib as R


def main(old_dir):
    out = {'format': 'conf-nc-changes/1', 'about': __doc__.split('\n\n')[0], 'units': {}, 'totals': {}}
    tot = collections.Counter()
    for p in sorted(glob.glob(os.path.join(old_dir, '*.jsonl.gz'))):
        fn = os.path.basename(p)
        ho, so, mo = R.read_unit(p)
        hn, sn, mn = R.read_unit(os.path.join(L.D2, 'confederate', 'nc', fn))
        a = [tuple(x) for sg, rs in so for x in rs]
        b = [tuple(x) for sg, rs in sn for x in rs]
        blocks = []
        if a != b:
            sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
            for tag, i1, i2, j1, j2 in sm.get_opcodes():
                if tag == 'equal':
                    continue
                blocks.append({'before': [[x[0], x[2], x[3][:60]] for x in a[i1:i2]], 'after': [[x[0], x[2], x[3][:60]] for x in b[j1:j2]]})
        out['units'][ho['u']] = {'rows_before': len(a), 'rows_after': len(b), 'blocks': blocks}
        tot['units_changed'] += 1 if blocks else 0
        tot['blocks'] += len(blocks)
        tot['rows_before'] += len(a)
        tot['rows_after'] += len(b)
        tot['rows_before_in_blocks'] += sum(len(x['before']) for x in blocks)
        tot['rows_after_in_blocks'] += sum(len(x['after']) for x in blocks)
    out['totals'] = dict(tot)
    with open(os.path.join(L.WS, 'changes-after-review.json'), 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print(dict(tot))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1]))

"""Write the 14 unit files (data2/union/me) and their flag files from the work files of every source parser.

    python3 -I docs/battle-theatre/rosters/pipeline2/union_me/assemble.py            (run from the repository root)

Work files: tmp/library/rosters/union-me-work/<source id>/rows-<unit key>.jsonl, one row per line:
    [name, rank, co, remarks, page, off, rd, flags, list, work segment, on_rolls?]
A unit file holds one segment per source text that has rows for the unit (order of mlib.SEGMENTS); rows are in offset order inside a segment.
Beside each unit file a flag file  <unit>.flags.json.gz  lists, by row number over the whole file, the rows whose line is damaged in the
text layer (ocr_uncertain), the lines whose printed name is "Same", and the on-the-rolls inference where one is made from printed dates.
Standard library only.
"""
import os, sys, json, gzip, collections, hashlib
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import mlib as M
R = M.R


def load_rows(source, unit):
    p = os.path.join(M.WORK, source, 'rows-%s.jsonl' % unit)
    out = collections.defaultdict(list)
    if not os.path.exists(p):
        return out
    for ln in open(p, encoding='utf-8'):
        a = json.loads(ln)
        out[a[9]].append(a)
    return out


def write_flags(path, unit, n, groups, on_rolls):
    d = {'f': 'roster2-flags/1', 'u': unit, 'n': n,
         'about': 'row numbers count the rows of the unit file in file order from 0; "ocr_uncertain" = the line is damaged in the text layer '
                  '(any of the codes N R C G P U); the rows are never repaired; "on_rolls" is inferred from printed enlistment and separation dates only',
         'codes': M.FLAG_TEXT, 'rows': {k: v for k, v in sorted(groups.items())}, 'ocr_uncertain': sorted(set(i for k, v in groups.items() if k in M.OCR_FLAGS for i in v)),
         'on_rolls': on_rolls}
    raw = (json.dumps(d, ensure_ascii=False, separators=(',', ':')) + '\n').encode('utf-8')
    with open(path, 'wb') as f:
        with gzip.GzipFile(filename='', mode='wb', fileobj=f, compresslevel=9, mtime=0) as g:
            g.write(raw)
    return len(raw), os.path.getsize(path)


def main(only=None):
    report = {}
    for key, desig, rel in M.UNITS:
        if only and key not in only:
            continue
        segs, groups, on_rolls, idx = [], collections.defaultdict(list), {}, 0
        per_seg = []
        for (src, wseg), segobj in M.SEGMENTS:
            rows_in = load_rows(src, key).get(wseg, [])
            if not rows_in:
                continue
            rows_in.sort(key=lambda a: a[5])
            rows = []
            for a in rows_in:
                rows.append(R.row(a[0], a[1], a[2], a[3], a[4], a[5], a[6]))
                for ch in set(a[7]):
                    groups[ch].append(idx)
                if len(a) > 10 and a[10]:
                    on_rolls[str(idx)] = a[10]
                idx += 1
            segs.append((segobj, rows))
            per_seg.append({'text_id': segobj['t'], 'rows': len(rows)})
        path = os.path.join(M.D2, rel)
        info = R.write_unit(path, key, 'union', 'me', desig, segs)
        finfo = write_flags(path.replace('.jsonl.gz', '.flags.json.gz'), key, info['n'], groups, on_rolls)
        report[key] = {'rows': info['n'], 'raw': info['raw'], 'gz': info['gz'], 'sha256_raw': info['sha256'], 'segments': per_seg,
                       'flag_file_bytes': finfo, 'ocr_uncertain_rows': len(set(i for k, v in groups.items() if k in M.OCR_FLAGS for i in v))}
        print(key, info['n'], info['raw'], info['gz'], per_seg)
    json.dump(report, open(os.path.join(M.WORK, 'assemble-report.json'), 'w'), indent=1)


if __name__ == '__main__':
    main(sys.argv[1:] or None)

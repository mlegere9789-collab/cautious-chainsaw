"""Statistics of the 14 Maine unit files and the report docs/battle-theatre/rosters/reports/union-me.md (numbers are computed here, never typed).

    python3 -I docs/battle-theatre/rosters/pipeline2/union_me/make_report.py            (run from the repository root)
"""
import os, sys, json, gzip, re, collections
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import mlib as M
R = M.R

OOB = json.load(open(os.path.join(M.WORK, 'oob_strengths.json')))
OOB_ID = {'u-me-3rd-maine-infantry': 'U-3ME', 'u-me-4th-maine-infantry': 'U-4ME', 'u-me-5th-maine-infantry': 'U-5ME', 'u-me-6th-maine-infantry': 'U-6ME',
          'u-me-7th-maine-infantry': 'U-7ME', 'u-me-16th-maine-infantry': 'U-16ME', 'u-me-17th-maine-infantry': 'U-17ME', 'u-me-19th-maine-infantry': 'U-19ME',
          'u-me-20th-maine-infantry': 'U-20ME', 'u-me-1st-maine-cavalry': 'U-1ME-CAV', 'u-me-2nd-maine-battery-b': 'U-ART-2ME'}
SEGNAME = {'ME-AGR-1863-APPD.1863': 'returns 1863', 'ME-SUPP-1867.1867': 'index 1867', 'ME-SUPP-1867.1867~p': 'index 1867 (positional text)',
           'ME-GETT-1898.1898': 'Maine at Gettysburg 1898', 'ME-APPD-1861.1861': 'muster-in 1861'}


def load(p):
    return json.load(open(p, encoding='utf-8')) if os.path.exists(p) else {}


def main():
    idx = load(os.path.join(M.WORK, 'ME-SUPP-1867', 'diag.json'))
    agr = load(os.path.join(M.WORK, 'ME-AGR-1863-APPD', 'diag.json'))
    out = {'units': {}, 'generated': M.now()}
    for key, desig, rel in M.UNITS:
        path = os.path.join(M.D2, rel)
        head, segs, meta = R.read_unit(path)
        fl = json.load(gzip.open(path.replace('.jsonl.gz', '.flags.json.gz'), 'rb'))
        per = collections.OrderedDict()
        same = 0
        for seg, rows in segs:
            per[seg['t']] = len(rows)
            same += sum(1 for r in rows if re.match(r'^Same\W*$', r[0]))
        orl = fl['on_rolls_july_1863']
        n = head['n']
        u = {'designation': desig, 'rows': n, 'segments': per, 'same_lines': same, 'raw_bytes': meta['raw'], 'ocr_uncertain': len(fl['ocr_uncertain']),
             'flags': {k: len(v) for k, v in fl['rows'].items()}, 'gettysburg_in_remark': R.gettysburg_rows(segs),
             'on_rolls_yes': len(orl['yes']), 'on_rolls_no': len(orl['no']), 'on_rolls_unknown': n - len(orl['yes']) - len(orl['no']),
             'index_name_not_read': idx.get('skipped_counts', {}).get('name-not-read:' + key, 0),
             'index_defects_after_fallback': idx.get('units', {}).get(key, {}).get('defects'),
             'returns_non_person_lines': sum(1 for x in agr.get('non_person_lines', []) if x['unit'] == key),
             'returns_prose_lines': agr.get('prose_lines_not_parsed', {}).get(key, 0),
             'returns_defects': agr.get('units', {}).get(key, {}).get('defects'),
             'oob': OOB.get(OOB_ID.get(key, ''), None)}
        out['units'][key] = u
    out['totals'] = {'rows': sum(u['rows'] for u in out['units'].values())}
    json.dump(out, open(os.path.join(M.WORK, 'stats.json'), 'w'), indent=1)
    d = os.path.join(M.ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'horde', 'ws-rosters', 'union-me')
    os.makedirs(d, exist_ok=True)
    json.dump(out, open(os.path.join(d, 'stats.json'), 'w'), indent=1)
    print(json.dumps({k: (v['rows'], v['segments']) for k, v in out['units'].items()})[:900])
    return out


if __name__ == '__main__':
    main()

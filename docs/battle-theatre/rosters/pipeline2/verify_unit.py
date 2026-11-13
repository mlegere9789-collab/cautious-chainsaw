"""Verify roster2/1 unit files against their source texts (V1 name, V2 remarks, V3 page, V4 rank; see r2lib.py).

    python3 -I verify_unit.py PATH.jsonl.gz [PATH2 ...]           one JSON statistics object per file, exit 1 on any V1 or V3 defect
    python3 -I verify_unit.py --all [--root DIR]                  every unit file under DIR (default: rosters/data2)

The texts come from the ledger  data2/sources/<source id>.json  (the "texts" entry named by the segment's "t"), found in
tmp/library/rosters/<source id>/ and checked against the ledger sha256 before use.  A segment whose text is missing, or
whose sha256 differs, is a defect, never skipped.  Standard library only.
"""
import sys, os, json, glob, hashlib
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import r2lib as R

ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
D2 = os.path.join(ROOT, 'docs', 'battle-theatre', 'rosters', 'data2')
_cache = {}


def load_source(source_id, text_id):
    key = (source_id, text_id)
    if key in _cache:
        return _cache[key]
    led = json.load(open(os.path.join(D2, 'sources', source_id + '.json'), encoding='utf-8'))
    ent = led['texts'][text_id]
    d = os.path.join(ROOT, ent['local_dir'])
    f = ent['files']
    for role in ('text', 'pageindex'):
        p = os.path.join(d, f[role]['name'])
        if R.sha256_file(p) != f[role]['sha256']:
            raise ValueError('sha256 of %s differs from the ledger' % p)
    text = R.load_text(os.path.join(d, f['text']['name']))
    pn = os.path.join(d, f['page_numbers']['name']) if 'page_numbers' in f else None
    pm = R.PageMap(os.path.join(d, f['pageindex']['name']), pn)
    _cache[key] = (text, pm, ent)
    return _cache[key]


def verify_file(path):
    head, segs, meta = R.read_unit(path)
    texts, pms, rights = {}, {}, {}
    problems = []
    for seg, rows in segs:
        try:
            text, pm, ent = load_source(seg['s'], seg['t'])
            texts[seg['t']], pms[seg['t']] = text, pm
            rights[seg['t']] = ent.get('ia_possible_copyright_status') or 'ia flag blank'
        except Exception as e:                    # missing ledger entry, missing text, hash mismatch
            problems.append({'t': seg.get('t'), 'error': repr(e)})
    st = R.verify_rows([(s, r) for s, r in segs if s['t'] in texts], texts, pms) if texts else {'rows': 0, 'defects': []}
    hard = st['rows'] - st.get('name_ok', 0) if texts else 0
    page_bad = st['rows'] - st.get('page_ok', 0) if texts else 0
    out = {'file': os.path.relpath(path, ROOT).replace(os.sep, '/'), 'unit': head['u'], 'rows': head['n'], 'raw_bytes': meta['raw'],
           'segments': len(segs), 'v1_name_defects': hard, 'v3_page_defects': page_bad, 'problems': problems,
           'stats': {k: v for k, v in st.items() if k != 'defects'}, 'defect_samples': st['defects'][:5], 'rights': rights}
    out['ok'] = not problems and hard == 0 and page_bad == 0
    return out


def main(argv):
    root = D2
    if '--root' in argv:
        i = argv.index('--root'); root = argv[i + 1]; del argv[i:i + 2]
    paths = sorted(glob.glob(os.path.join(root, '**', '*.jsonl.gz'), recursive=True)) if '--all' in argv else [a for a in argv if not a.startswith('--')]
    bad = 0
    for p in paths:
        r = verify_file(p)
        print(json.dumps(r, ensure_ascii=False))
        bad += 0 if r['ok'] else 1
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))

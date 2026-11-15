#!/usr/bin/env python3
"""Record the result of a render determinism check (Q16): the renders of tmp/photomatch/renders (made in earlier sessions, and P29 in this one) against an independent full re-run of every pose into
tmp/photomatch/renders_rerun (PM_RENDER_DIR=tmp/photomatch/renders_rerun tools/horde/bench.sh node tools/bt/photomatch/run.mjs), file by file, by sha256; and, where it exists, the pre-third-pass copy of the 96 renders of the second pass
(tmp/photomatch/renders_prev with renders_prev.sha256) against the current ones. Writes tools/bt/photomatch/render_determinism.json, which photomatch-q16.test.mjs reads (no browser needed to check the stored hashes against the files).
The renders are software GL (SwiftShader through system Chrome): this shows that the renderer is reproducible on this machine class, never a real-GPU result.
Usage: python3 -I tools/bt/photomatch/record_determinism.py [--rerun-start ISO --rerun-end ISO]"""
import hashlib, json, os, sys, glob, datetime
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..')); R = os.path.join(ROOT, 'tmp', 'photomatch')
H = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()
def arg(k):
    return sys.argv[sys.argv.index(k) + 1] if k in sys.argv else None
def main():
    a = sorted(glob.glob(os.path.join(R, 'renders', '*.png'))); b = {os.path.basename(p): p for p in glob.glob(os.path.join(R, 'renders_rerun', '*.png'))}
    poses = [p['id'] for p in json.load(open(os.path.join(HERE, 'poses.json')))['poses']]; files = {}; differ = []; missing = []
    for p in a:
        n = os.path.basename(p)
        if n.split('_')[0] not in poses: continue            # a render of a pose that is not registered any more is not part of the record
        h1 = H(p); h2 = H(b[n]) if n in b else None
        if h2 is None: missing.append(n)
        elif h1 != h2: differ.append(n)
        files[n] = {'sha256': h1, 'rerun_sha256': h2, 'identical': h1 == h2, 'mtime_utc': datetime.datetime.fromtimestamp(os.path.getmtime(p), datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')}
    prev = {}; pp = os.path.join(R, 'renders_prev.sha256')
    if os.path.exists(pp):
        for l in open(pp):
            if l.strip(): h, f = l.split(None, 1); prev[os.path.basename(f.strip())] = h
    prev_same = sum(1 for n, h in prev.items() if n in files and files[n]['sha256'] == h); prev_diff = sorted(n for n, h in prev.items() if n in files and files[n]['sha256'] != h)
    out = {'_doc': __doc__.split('\n')[0] + ' Software GL (SwiftShader through system Chrome); no real-GPU claim.',
           'poses': poses, 'files_expected': 6 * len(poses), 'files_recorded': len(files), 'files_identical_in_rerun': sum(1 for f in files.values() if f['identical']), 'differing': differ, 'missing_in_rerun': missing,
           'rerun': {'command': 'PM_RENDER_DIR=tmp/photomatch/renders_rerun tools/horde/bench.sh node tools/bt/photomatch/run.mjs (all poses, main + 30 and 50 degree fields, base and full)', 'start_utc': arg('--rerun-start'), 'end_utc': arg('--rerun-end')},
           'earlier_sessions': {'file': 'tmp/photomatch/renders_prev.sha256 (the 96 renders of the 16 poses of the second pass, 2026-11-13, copied before the third pass re-rendered them)', 'files': len(prev), 'identical_to_current': prev_same, 'differing': prev_diff},
           'files': files}
    json.dump(out, open(os.path.join(HERE, 'render_determinism.json'), 'w'), indent=1); print({k: out[k] for k in ('files_expected', 'files_recorded', 'files_identical_in_rerun', 'differing', 'missing_in_rerun')}, 'earlier sessions identical', prev_same, 'of', len(prev))
if __name__ == '__main__': main()

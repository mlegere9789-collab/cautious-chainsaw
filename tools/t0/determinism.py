#!/usr/bin/env python3
"""Determinism proof of the release build: every train is built a second time, somewhere else, and compared byte for byte with release/<train>.

    python tools/t0/determinism.py                 # all four trains: build into release/check/<train>, compare with release/<train>
    python tools/t0/determinism.py --train R1c
    python tools/t0/determinism.py --keep          # keep release/check/ afterwards (default: removed)

For each train it requires, between release/<train>/ (the build under test) and release/check/<train>/ (a fresh build of the same tree into a different
folder, a different gate cache and a later moment): the same set of files in dist/ with the same sha256, the same tree digest and release id in
manifest.json, and byte-identical manifest.json, anchors.json and _ops/sw-kill.js, and the same gate.json (it names its own dist folder, the only field that may differ).  It never touches release/<train>/.  A second build that
is not identical means something in the tree moved between the two builds (an edited patch, a changed baseline) or the build is not deterministic;
either way the train is not deployable.  Output lines are `PASS <train> ...` / `FAIL <train> ...` (tools/t0/run_suites.mjs counts them).  Exit 0 when
every train passed, 1 on any difference, 2 when a build failed.  The ordinary reproducibility check for one train by hand is in ops/RELEASE-RUNBOOK.md
section 4.
"""
import hashlib
import json
import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..'))
TRAINS = ['R0', 'R1a', 'R1b', 'R1c', 'R1d', 'R1e', 'R1f', 'R1g']
SIDE = ['manifest.json', 'anchors.json', 'gate.json', os.path.join('_ops', 'sw-kill.js')]


def sha(p):
    with open(p, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()


def tree(root):
    out = {}
    for dp, _dn, fn in os.walk(root):
        for f in fn:
            p = os.path.join(dp, f)
            out[os.path.relpath(p, root).replace(os.sep, '/')] = sha(p)
    return out


def main(argv):
    only = argv[argv.index('--train') + 1] if '--train' in argv else None
    keep = '--keep' in argv
    trains = [t for t in TRAINS if not only or t == only]
    if not trains:
        print('unknown train %s' % only)
        return 2
    check_root = os.path.join(REPO, 'release', 'check')
    code = 0
    for t in trains:
        a = os.path.join(REPO, 'release', t)
        b = os.path.join(check_root, t)
        if not os.path.isdir(os.path.join(a, 'dist')):
            print('FAIL %s release/%s/dist is missing (python tools/t0/build.py --train %s)' % (t, t, t))
            code = max(code, 2)
            continue
        shutil.rmtree(b, ignore_errors=True)
        groups = json.load(open(os.path.join(a, 'dist', 'version.json'), encoding='utf-8')).get('groups', [])
        extra = ['--with', 'PG-legal'] if 'PG-legal' in groups else []
        r = subprocess.run([sys.executable, os.path.join(HERE, 'build.py'), '--train', t, '--out', 'release/check/' + t] + extra, cwd=REPO, capture_output=True, text=True, encoding='utf-8')
        if r.returncode != 0:
            print('FAIL %s the second build failed (exit %d): %s' % (t, r.returncode, (r.stdout + r.stderr).strip().splitlines()[-1][:200] if (r.stdout + r.stderr).strip() else ''))
            code = max(code, 2)
            continue
        ta, tb = tree(os.path.join(a, 'dist')), tree(os.path.join(b, 'dist'))
        problems = []
        for p in sorted(set(ta) | set(tb)):
            if p not in tb:
                problems.append('only in release/%s: %s' % (t, p))
            elif p not in ta:
                problems.append('only in the second build: %s' % p)
            elif ta[p] != tb[p]:
                problems.append('differs: %s' % p)
        ma = json.load(open(os.path.join(a, 'manifest.json'), encoding='utf-8'))
        mb = json.load(open(os.path.join(b, 'manifest.json'), encoding='utf-8'))
        if ma['tree_sha256'] != mb['tree_sha256']:
            problems.append('tree digest %s vs %s' % (ma['tree_sha256'][:12], mb['tree_sha256'][:12]))
        for s in SIDE:
            pa, pb = os.path.join(a, s), os.path.join(b, s)
            if os.path.isfile(pa) != os.path.isfile(pb):
                problems.append('%s exists in only one of the two builds' % s)
            elif s == 'gate.json' and os.path.isfile(pa):
                ga, gb = json.load(open(pa, encoding='utf-8')), json.load(open(pb, encoding='utf-8'))
                ga.pop('dist', None)       # the one field that names the output folder
                gb.pop('dist', None)
                if ga != gb:
                    problems.append('gate.json differs (apart from the dist path)')
            elif os.path.isfile(pa) and sha(pa) != sha(pb):
                problems.append('%s differs' % s)
        if problems:
            code = max(code, 1)
            print('FAIL %s not byte-identical: %s' % (t, '; '.join(problems[:6]) + (' ...' if len(problems) > 6 else '')))
        else:
            print('PASS %s identical: %d files, tree %s, release id %s, manifest/anchors/kill-switch copy byte-identical, same gate' % (t, len(ta), ma['tree_sha256'][:12], ma['release']['rid'] if isinstance(ma['release'], dict) else ma['release']))
    if not keep:
        shutil.rmtree(check_root, ignore_errors=True)
    print('determinism: %s' % ('all trains identical' if code == 0 else 'NOT identical (or a build failed)'))
    return code


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))

#!/usr/bin/env python3
"""Control trees for the red-first proofs of the fix groups, and the opt-in legal variant (never shipped, never deployed).

    python tools/t0/redtrees.py                 # build every control tree under release/control/<name>/ (about 40 s)
    python tools/t0/redtrees.py --only noA2     # one of them
    python tools/t0/redtrees.py --list

A test that is green on the finished tree proves little unless it is red on the tree WITHOUT the fix (tests/README.md, rule 2).  For the three
fix rounds whose groups are not the whole delta of a train, legacy/dist is the wrong control (it lacks far more than the fix), so the proof runs on
R1c built from a copy of tools/t0/patches in which exactly the fix is missing:

  R1c-noA2          group A2 emptied                                      -> tests/t0/desktop-fixes.spec.mjs --expect-red     (--filter 'DF-0[1-9]': all nine red; DF-X, the no-error guard, passes on any tree)
  R1c-noPrecompile  R0+mapbox-precompile.json removed                     -> tests/t0/perf-fixes.spec.mjs --expect-red        (PF-07..09, PF-07 also --behavior-only)
  R1c-noMobile      SHELL emptied and C.json as it was before commit 40844b8 (the mobile + shell fixes)
                                                                          -> tests/t0/mobile-fixes.spec.mjs --expect-red      (T0-MFIX-01..11 red)

One more tree is a VARIANT, not a control: R1c-legal is R1c built with the opt-in group PG-legal (`build.py --train R1c --with PG-legal`, gates ON).  No
default train contains the interim privacy/terms text, so the tests that need its table (T0-PGF-14) and the facts check against the legal text skip or
check the baseline text; this tree runs them (suite ids pagesfix.R1c.legal and static.legal.optin in tools/t0/run_suites.mjs) and proves the opt-in
group still applies cleanly on top of every other group of the integrated R1c.

The patches directory of each control is copied to release/control/_patches/<name>/ (build.py --patches), the build is the ordinary build.py
(same baseline, same overlay, same config hook, --no-gate because a control is not a release; the legal variant keeps its gates), the output is release/control/<name>/dist.
release/ is git-ignored.  Exit 0 when every requested control was built and differs from the real tree of the same train, 2 otherwise.
"""
import json
import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..'))
PATCHES = os.path.join(HERE, 'patches')
OUT = os.path.join(REPO, 'release', 'control')

# name -> train, groups whose patch list is emptied, files removed, files restored from an older commit
CONTROLS = {
    'R1c-legal': {'train': 'R1c', 'empty': [], 'drop': [], 'rev': {}, 'extra': ['--with', 'PG-legal'], 'gate': True, 'why': 'VARIANT: R1c with the opt-in legal text (PG-legal), gates on'},
    'R1c-noA2': {'train': 'R1c', 'empty': ['A2'], 'drop': [], 'rev': {}, 'why': 'desktop fixes (group A2) absent'},
    'R1c-noPrecompile': {'train': 'R1c', 'empty': [], 'drop': ['R0+mapbox-precompile.json'], 'rev': {}, 'why': 'Mapbox shader precompile (extension part of R0) absent'},
    'R1c-noMobile': {'train': 'R1c', 'empty': ['SHELL'], 'drop': [], 'rev': {'C.json': '40844b8^'}, 'why': 'mobile + shell fixes absent (SHELL empty, C.json from before 40844b8)'},
}


def build(name, spec):
    pdir = os.path.join(OUT, '_patches', name)
    shutil.rmtree(pdir, ignore_errors=True)
    shutil.copytree(PATCHES, pdir)
    for g in spec['empty']:
        with open(os.path.join(pdir, g + '.json'), 'w', encoding='utf-8', newline='\n') as f:
            f.write('{ "group": "%s", "patches": [] }\n' % g)
    for fn in spec['drop']:
        os.remove(os.path.join(pdir, fn))
    for fn, rev in spec['rev'].items():
        r = subprocess.run(['git', 'show', '%s:tools/t0/patches/%s' % (rev, fn)], cwd=REPO, capture_output=True)
        if r.returncode != 0:
            print('ERROR: git show %s:tools/t0/patches/%s failed (%s)' % (rev, fn, r.stderr.decode('utf-8', 'replace').strip()[:200]))
            return None
        with open(os.path.join(pdir, fn), 'wb') as f:
            f.write(r.stdout)
    out = os.path.join('release', 'control', name)
    shutil.rmtree(os.path.join(REPO, out), ignore_errors=True)
    cmd = [sys.executable, os.path.join(HERE, 'build.py'), '--train', spec['train'], '--out', out.replace(os.sep, '/'), '--patches', os.path.relpath(pdir, REPO).replace(os.sep, '/')] + ([] if spec.get('gate') else ['--no-gate']) + spec.get('extra', [])
    r = subprocess.run(cmd, cwd=REPO, capture_output=True, text=True, encoding='utf-8')
    if r.returncode != 0:
        print('ERROR: building %s failed (exit %d):\n%s' % (name, r.returncode, (r.stdout + r.stderr)[-1500:]))
        return None
    man = json.load(open(os.path.join(REPO, out, 'manifest.json'), encoding='utf-8'))
    real = json.load(open(os.path.join(REPO, 'release', spec['train'], 'manifest.json'), encoding='utf-8'))
    if man['tree_sha256'] == real['tree_sha256']:
        print('ERROR: control %s is identical to release/%s: the removed fix (or the added group) changed nothing' % (name, spec['train']))
        return None
    ver = json.load(open(os.path.join(REPO, out, 'dist', 'version.json'), encoding='utf-8'))
    print('control %-18s %s  release id %s (real %s)  tree %s  %s' % (name, spec['train'], ver['release'], real['release']['rid'] if isinstance(real['release'], dict) else real['release'], man['tree_sha256'][:12], spec['why']))
    return out


def main(argv):
    if '--list' in argv:
        for k, v in CONTROLS.items():
            print('%-18s %s: %s' % (k, v['train'], v['why']))
        return 0
    only = argv[argv.index('--only') + 1] if '--only' in argv else None
    todo = [k for k in CONTROLS if not only or only in k]
    if not todo:
        print('no control matches --only %s (see --list)' % only)
        return 2
    bad = 0
    for k in todo:
        if build(k, CONTROLS[k]) is None:
            bad += 1
    print('redtrees: %d built, %d failed' % (len(todo) - bad, bad))
    return 2 if bad else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))

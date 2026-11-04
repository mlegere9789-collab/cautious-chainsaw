#!/usr/bin/env python3
"""Run the four tests of tests/t0/polish.spec.mjs that need a control or a build (T0-POL-09, 10, 11, 12) on the matched pair built by tools/t0/polish_pair.py.

    python tools/t0/polish_pair_run.py            builds tmp/polish-pair/{ctl,tree} (R1c + CLOCK,DATA,MON,ANIM without and with POLISH + PG-polish), runs the spec with --control and --build

The exit code is the spec's.  Used by tools/t0/run_suites.mjs (row r1.polish.pair); see tools/t0/POLISH-README.md.
"""
import os
import subprocess
import sys

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PAIR = os.path.join(REPO, 'tools', 't0', 'polish_pair.py')
ctl, tree = os.path.join('tmp', 'polish-pair', 'ctl'), os.path.join('tmp', 'polish-pair', 'tree')
for out, groups in ((ctl, 'CLOCK,DATA,MON,ANIM'), (tree, 'CLOCK,DATA,MON,ANIM,POLISH,PG-polish')):
    r = subprocess.run([sys.executable, PAIR, '--out', out, '--with', groups, '--gate'], cwd=REPO)
    if r.returncode:
        sys.exit(r.returncode)
spec = ['node', os.path.join('tests', 't0', 'polish.spec.mjs'), '--dist', os.path.join(tree, 'dist'), '--control', os.path.join(ctl, 'dist'), '--build', '--filter', 'POL-(09|10|11|12)']
sys.exit(subprocess.run(spec, cwd=REPO).returncode)

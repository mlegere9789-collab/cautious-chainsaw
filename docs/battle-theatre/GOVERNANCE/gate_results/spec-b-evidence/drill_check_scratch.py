#!/usr/bin/env python
"""tools/bt/drill_check.py against a scratch copy of the 16 pinned OCR texts.
drill_check.py reads docs/battle-theatre/drill/*.json and the OCR texts in tmp/library/misc/ (absent in this container), pinned by sha256 in GOVERNANCE/library/acquired.json.
The 16 texts were fetched again from archive.org into tmp/bt-gates/library-misc (scratch; file sizes and sha256 equal acquired.json); this script points
drill_text.LIB there for the one run, in memory, and calls drill_check.main(). Nothing is placed in tmp/library/misc, which other tools read, and nothing is written.
Run under the machine lock (about 60 s of CPU):
    tools/horde/bench.sh python -I docs/battle-theatre/GOVERNANCE/gate_results/spec-b-evidence/drill_check_scratch.py"""
import os, sys, time
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, *(['..'] * 5)))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'bt'))
import drill_text as T
SCR = os.path.join(ROOT, 'tmp', 'bt-gates', 'library-misc')
if not os.path.isdir(SCR) or len(os.listdir(SCR)) < 16:
    print('scratch library missing or incomplete:', SCR, '-> NOT RUN'); sys.exit(2)
T.LIB = SCR
import drill_check
t = time.time(); rc = drill_check.main(); print('drill_check.main() returned', rc, 'in %.1f s' % (time.time() - t)); sys.exit(rc or 0)

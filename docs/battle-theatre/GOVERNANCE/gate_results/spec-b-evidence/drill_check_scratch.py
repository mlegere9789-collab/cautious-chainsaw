#!/usr/bin/env python
"""tools/bt/drill_check.py against a scratch copy of the 16 pinned OCR texts.
drill_check.py reads docs/battle-theatre/drill/*.json and OCR texts that GOVERNANCE/library/acquired.json pins by sha256. Eight manuals are read through drill_text.LIB and the eight
volumes of the usage search through drill_text.ROOT plus a repository-relative path ('tmp/library/misc/<file>'); tmp/library/misc is incomplete in this container (7 of the 16).
The 16 texts were fetched again from archive.org into tmp/bt-gates/library-misc (scratch; sizes and sha256 equal acquired.json). This script builds a scratch ROOT, tmp/bt-gates/root, of three
symlinks (tmp/library/misc -> the scratch texts, tmp/library/or27 and docs -> the real ones), points drill_text.ROOT and LIB at it for the one run, in memory, and calls drill_check.main().
Nothing is placed in tmp/library/misc, which other tools read, and nothing is written outside tmp/bt-gates. Run under the machine lock (about 45 s of CPU):
    tools/horde/bench.sh python -I docs/battle-theatre/GOVERNANCE/gate_results/spec-b-evidence/drill_check_scratch.py"""
import os, sys, time
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, *(['..'] * 5)))
SCR = os.path.join(ROOT, 'tmp', 'bt-gates', 'library-misc'); SROOT = os.path.join(ROOT, 'tmp', 'bt-gates', 'root')
if not os.path.isdir(SCR) or len(os.listdir(SCR)) < 16:
    print('scratch library missing or incomplete:', SCR, '-> NOT RUN'); sys.exit(2)
def link(dst, src):
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    if not os.path.lexists(dst): os.symlink(src, dst)
link(os.path.join(SROOT, 'tmp', 'library', 'misc'), SCR)
link(os.path.join(SROOT, 'tmp', 'library', 'or27'), os.path.join(ROOT, 'tmp', 'library', 'or27'))
link(os.path.join(SROOT, 'docs'), os.path.join(ROOT, 'docs'))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'bt'))
import drill_text as T
T.ROOT = SROOT; T.LIB = os.path.join(SROOT, 'tmp', 'library', 'misc')       # before drill_check is imported: it builds D and ACQ from T.ROOT at import
import drill_check
t = time.time(); rc = drill_check.main(); print('drill_check.main() returned', rc, 'in %.1f s' % (time.time() - t)); sys.exit(rc or 0)

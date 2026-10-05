#!/usr/bin/env python3
"""Source hygiene of the Tranche-0 tooling and the ship tooling: no stray control bytes, every script parses.

    python tools/t0/hygiene.py            # scans the git-tracked files of tools/t0, tests/t0, tools/ship, ops and docs/baseline-drift.md (working-tree contents)
    python tools/t0/hygiene.py --all      # also files git does not track yet (a script someone else is still writing may fail, which is why it is not the default)
    python tools/t0/hygiene.py --list     # print the files that are scanned

Why this exists: twice in one round a regular expression written as `\\b` (or a `\\x01` style escape) went through a shell heredoc or a
JSON string once too often and reached the file as a raw control byte (0x08 BACKSPACE inside a regex literal of tests/t0/journeys-desktop.spec.mjs
and of tools/t0/verify_release.mjs, 0x01 and 0x07 in ops scripts).  Such a file still parses, so nothing fails; the regex simply matches something
else (`/<link\\b[^>]*rel=.../` never matched, so the page-metadata comparison of verify_release compared null with null).  This check makes that
class of slip loud:

  1. no byte in 0x00-0x08, 0x0b, 0x0c, 0x0e-0x1f in a text file (tab, LF and CR are fine);
  2. every .mjs / .js file passes `node --check`, every .py file compiles (a heredoc that ate a quote shows up here);
  3. every .json file parses.

Exit 0 clean, 1 on any finding, 2 when node is missing.  Output lines are `PASS ...` / `FAIL <file>:<line> ...` (tools/t0/run_suites.mjs counts them).
Only reads; writes nothing.
"""
import ast
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..'))
ROOTS = ['tools/t0', 'tests/t0', 'tools/ship', 'ops', 'docs/baseline-drift.md']
TEXT = ('.mjs', '.js', '.py', '.md', '.json', '.tsv', '.txt', '.toml', '.html', '.css', '.sh', '.cjs')
SKIP_DIRS = {'node_modules', '.cache', '__pycache__', '.git'}
CTRL = re.compile(rb'[\x00-\x08\x0b\x0c\x0e-\x1f]')


def tracked():
    """git ls-files of the roots (None when git is unavailable)."""
    try:
        r = subprocess.run(['git', 'ls-files', '-z', '--'] + ROOTS, cwd=REPO, capture_output=True)
    except OSError:
        return None
    if r.returncode != 0:
        return None
    return {os.path.normpath(os.path.join(REPO, *n.split('/'))) for n in r.stdout.decode('utf-8').split('\0') if n}


def files(everything=False):
    out = []
    only = None if everything else tracked()
    for r in ROOTS:
        p = os.path.normpath(os.path.join(REPO, r))
        if os.path.isfile(p):
            if only is None or p in only:
                out.append(p)
            continue
        for dp, dn, fn in os.walk(p):
            dn[:] = sorted(d for d in dn if d not in SKIP_DIRS)
            for f in sorted(fn):
                if f.endswith(TEXT) and (only is None or os.path.normpath(os.path.join(dp, f)) in only):
                    out.append(os.path.join(dp, f))
    return out


def rel(p):
    return os.path.relpath(p, REPO).replace(os.sep, '/')


def main(argv):
    fl = files('--all' in argv)
    if '--list' in argv:
        print('\n'.join(rel(p) for p in fl))
        return 0
    findings = []
    js = []
    for p in fl:
        with open(p, 'rb') as f:
            b = f.read()
        for m in CTRL.finditer(b):
            line = b.count(b'\n', 0, m.start()) + 1
            findings.append('%s:%d control byte 0x%02x (a mangled escape such as \\b or \\x01?)' % (rel(p), line, b[m.start()]))
            break
        if p.endswith(('.mjs', '.js', '.cjs')):
            js.append(p)
        elif p.endswith('.py'):
            try:
                ast.parse(b.decode('utf-8'), filename=p)
            except (SyntaxError, UnicodeDecodeError, ValueError) as e:
                findings.append('%s does not compile: %s' % (rel(p), e))
        elif p.endswith('.json'):
            try:
                json.loads(b.decode('utf-8'))
            except (ValueError, UnicodeDecodeError) as e:
                findings.append('%s is not valid JSON: %s' % (rel(p), e))
    for p in js:
        try:
            r = subprocess.run(['node', '--check', p], capture_output=True, text=True, encoding='utf-8')
        except OSError:
            print('node is not on the PATH')
            return 2
        if r.returncode != 0:
            findings.append('%s fails node --check: %s' % (rel(p), (r.stderr.strip().splitlines() or ['?'])[-1][:160]))
    for x in findings:
        print('FAIL ' + x)
    if findings:
        print('hygiene: %d finding(s) in %d file(s)' % (len(findings), len(fl)))
        return 1
    print('PASS hygiene: %d files, no control bytes, %d scripts parse, JSON valid' % (len(fl), len(js) + sum(1 for p in fl if p.endswith('.py'))))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))

#!/usr/bin/env python3
"""Summarise a node:test TAP file: footer totals, every 'not ok', every skipped test with its reason, and the NOT RUN (NEEDS_GPU) lines of the browser harness.
    python3 -I summarize_tap.py <file.tap>"""
import re, sys
t = open(sys.argv[1], encoding='utf-8', errors='replace').read().splitlines()
foot = {}
for l in t:
    m = re.match(r'^# (tests|suites|pass|fail|cancelled|skipped|todo|duration_ms) ([\d.]+)', l)
    if m: foot[m.group(1)] = m.group(2)
print('totals:', foot)
nok = [l for l in t if re.match(r'^\s*not ok \d+', l)]
print('not ok lines:', len(nok))
for l in nok[:40]: print('  ', l.strip()[:240])
sk = [l for l in t if re.match(r'^\s*ok \d+ - .*# SKIP', l)]
print('skipped tests:', len(sk))
for l in sk[:40]: print('  ', l.strip()[:300])
nr = [l for l in t if 'NOT RUN (NEEDS_GPU)' in l]
print('NOT RUN (NEEDS_GPU) lines:', len(nr))
for l in nr[:40]: print('  ', l.strip()[:240])

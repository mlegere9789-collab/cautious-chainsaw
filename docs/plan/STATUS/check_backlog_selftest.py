#!/usr/bin/env python3
"""Proves that check_backlog.py can fail: each case damages a copy of backlog.json in one way and expects the named problem.

    python3 docs/plan/STATUS/check_backlog_selftest.py        exit 0 when every damaged copy is rejected for the expected reason and the intact copy passes
"""
import copy
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
TMP = os.path.join(REPO, 'tmp', 'r1h-cand', 'selftest')
os.makedirs(TMP, exist_ok=True)
base = json.load(open(os.path.join(HERE, 'backlog.json'), encoding='utf-8'))


def run(doc):
    p = os.path.join(TMP, 'b.json')
    json.dump(doc, open(p, 'w', encoding='utf-8'))
    r = subprocess.run([sys.executable, os.path.join(HERE, 'check_backlog.py'), '--file', p], cwd=REPO, capture_output=True, text=True)
    return r.returncode, r.stdout


def entry(doc, i):
    return next(e for e in doc['items'] if e['id'] == i)


w1 = [e['id'] for e in base['items'] if e.get('wave') == 1]
cases = []


def case(name, fn, expect):
    d = copy.deepcopy(base)
    fn(d)
    cases.append((name, d, expect))


case('bad id', lambda d: entry(d, 'wp-infra-23b').__setitem__('id', 'WP_INFRA_23B'), 'bad id')
case('unknown route', lambda d: entry(d, 'wp-pagec-30')['route'].__setitem__('type', 'magic'), 'unknown route')
case('empty acceptance', lambda d: entry(d, 'wp-pagec-30').__setitem__('acceptance', ' '), 'empty acceptance')
case('write outside ownership', lambda d: entry(d, 'wp-pagec-30')['files'].append('tools/t0/build.py'), 'outside this workstream')
case('candidate file in another folder', lambda d: entry(d, 'wp-pagec-30')['files'].append('candidates/r1h/wp-pagec-33/test.mjs'), 'outside its own folder')
case('wave 1 dependency', lambda d: entry(d, 'wp-pagec-30')['depends_on'].append('wp-pagec-33'), 'wave 1 not independent')
case('wave 1 write overlap', lambda d: entry(d, 'wp-pagec-30')['files'].append('data-src/geo/places.json'), 'write sets overlap')
case('wave 1 size L', lambda d: entry(d, 'wp-pagec-30').__setitem__('size', 'L'), 'size L')
openl = [e for e in base['items'] if not e['done'] and e.get('wave') is None]
case('dependency order', lambda d: entry(d, openl[5]['id'])['depends_on'].append(openl[200]['id']), 'precedes its dependency')
case('coverage', lambda d: d['items'].pop(), 'coverage')
case('done without record', lambda d: entry(d, 'wp-pagec-30').__setitem__('done', True), 'done without STATUS.json')
case('decision without row', lambda d: entry(d, 'd-name').__setitem__('decision', {'rows': [], 'recorded': False}), 'without a delegated row')
case('order gap', lambda d: entry(d, 'wp-pagec-30').__setitem__('order', 9999), 'order is not')
bad = 0
code, out = run(base)
print('intact copy:', 'passes' if code == 0 else 'FAILS (%s)' % out.strip()[:300])
bad += code != 0
for name, doc, expect in cases:
    code, out = run(doc)
    if expect is None:
        continue
    ok = code != 0 and expect in out
    print('%-34s %s' % (name, 'rejected as expected' if ok else 'NOT REJECTED (exit %d): %s' % (code, out.strip()[:200])))
    bad += not ok
sys.exit(1 if bad else 0)

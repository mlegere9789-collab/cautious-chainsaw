#!/usr/bin/env python3
"""used-names ledger CLI.

    python tools/t0/ledger.py seed  [--zips DIR]            (re)generate ops/used-names.txt from the archived zips + legacy/dist
    python tools/t0/ledger.py check --dist release/R0/dist  fail when the built tree reuses / collides with a published name
    python tools/t0/ledger.py record --dist release/R0/dist --train R0 --rid <rid>
                                                             append the NEW names of a DEPLOYED train (owner step, then commit)
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from t0build import ledger  # noqa: E402
from t0build.util import BuildError, REPO, load_json, walk_files  # noqa: E402


def legacy_names():
    cfg = load_json(os.path.join(REPO, 'tools', 't0', 'trains.json'))
    d = os.path.join(REPO, cfg['legacy']['dir'], 'assets')
    return {os.path.basename(p).lower() for p in walk_files(d)}, d


def main():
    for _st in (sys.stdout, sys.stderr):      # patch ids / paths may hold non-ASCII text; never die on a cp1252 console
        try:
            _st.reconfigure(encoding='utf-8', errors='replace')
        except (AttributeError, ValueError):
            pass
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='cmd', required=True)
    s = sub.add_parser('seed')
    s.add_argument('--zips', default=ledger.DEFAULT_ZIPS)
    c = sub.add_parser('check')
    c.add_argument('--dist', required=True)
    r = sub.add_parser('record')
    r.add_argument('--dist', required=True)
    r.add_argument('--train', required=True)
    r.add_argument('--rid', required=True)
    a = ap.parse_args()
    try:
        names, legacy_assets = legacy_names()
        if a.cmd == 'seed':
            n, nz = ledger.seed(a.zips, legacy_assets)
            print('ledger written: %d (name, sha256) lines from %d zips + legacy/dist -> %s' % (n, nz, ledger.LEDGER))
        elif a.cmd == 'check':
            problems = ledger.check(a.dist, ledger.load(), names)
            for p in problems:
                print('FAIL', p)
            print('ledger check: %s' % ('FAILED (%d)' % len(problems) if problems else 'ok'))
            return 1 if problems else 0
        else:
            added = ledger.record(a.dist, a.train, a.rid, legacy_names=names)
            print('recorded %d new name(s)' % len(added))
    except BuildError as e:
        print('ERROR:', e)
        return 2
    return 0


if __name__ == '__main__':
    sys.exit(main())

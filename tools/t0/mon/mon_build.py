#!/usr/bin/env python3
"""Build one train WITH the optional group MON (the Monuments layer) into a private directory.

    python tools/t0/mon/mon_build.py --train R1c --out tmp/mon-fix/mon-R1c [--no-gate]

Why a wrapper: tools/t0/build.py only loads groups that trains.json names, and the owner of trains.json (the Tranche 0 integrator) has not registered MON yet, so
MON.json lives in tools/t0/patches-next/ (inert, like CLOCK.json) and this script feeds it to the unmodified builder:
  * trains.json is read in memory and gets  "optional_groups": ["MON"]  (nothing is written back),
  * the patch set is copied to a scratch directory (<out>/../_mon-patches-<train>) together with MON.json and handed to the builder with its own `--patches` option,
  * build_train() then runs exactly as `python tools/t0/build.py --train <t> --out <dir> --with MON` would after the registration described in tools/t0/MON-README.md.
Nothing under release/ is touched unless --out says so; legacy/ and baseline/ are only read.  Exit codes are the builder's (0 ok, 2 anchors/preconditions, 3 gate).
"""
import argparse
import copy
import os
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
T0 = os.path.dirname(HERE)
sys.path.insert(0, T0)
import build as B  # noqa: E402
from t0build.util import REPO, load_json, rmtree_safe  # noqa: E402


def stage_patches(dest, with_mon=True):
    rmtree_safe(dest)
    os.makedirs(dest)
    src = os.path.join(T0, 'patches')
    for fn in sorted(os.listdir(src)):
        if fn.endswith('.json'):
            shutil.copyfile(os.path.join(src, fn), os.path.join(dest, fn))
    if with_mon and not os.path.isfile(os.path.join(dest, 'MON.json')):
        nxt = os.path.join(T0, 'patches-next', 'MON.json')
        if not os.path.isfile(nxt):
            raise SystemExit('tools/t0/patches-next/MON.json not found: run node tools/t0/mon/build-mon.mjs')
        shutil.copyfile(nxt, os.path.join(dest, 'MON.json'))


def main(argv=None):
    for st in (sys.stdout, sys.stderr):
        try:
            st.reconfigure(encoding='utf-8', errors='replace')
        except (AttributeError, ValueError):
            pass
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--train', choices=['R1a', 'R1b', 'R1c'], required=True)
    ap.add_argument('--out', required=True, help='output directory (under tmp/ or release/); NEVER the integrator\'s release/<train>')
    ap.add_argument('--no-gate', action='store_true')
    ap.add_argument('--without-mon', action='store_true', help='build the same tree without MON (control for before/after measurements)')
    a = ap.parse_args(argv)
    out_abs = os.path.abspath(os.path.join(REPO, a.out))
    default_out = os.path.join(REPO, 'release', a.train)
    if os.path.normcase(out_abs) == os.path.normcase(default_out):
        raise SystemExit('refusing to build into release/%s (the integrator\'s output); use a directory under tmp/' % a.train)
    cfg = copy.deepcopy(load_json(os.path.join(T0, 'trains.json')))
    registered = 'MON' in cfg.get('group_order', []) or 'MON' in cfg.get('optional_groups', [])
    if not registered:
        cfg['optional_groups'] = list(cfg.get('optional_groups', [])) + ['MON']
    scratch = os.path.join(os.path.dirname(out_abs), '_mon-patches-' + a.train)
    stage_patches(scratch, with_mon=not a.without_mon)
    ns = argparse.Namespace(train=a.train, all=False, out=a.out, with_groups=([] if a.without_mon else ['MON']), record=False, no_gate=a.no_gate,
                            keep_failed=True, order='fixed', dump_stage=None, legacy=None, base_dir=None, base_lock=None, patches=scratch, overlay=None,
                            ledger=None, config_hook=None)
    try:
        r = B.build_train(a.train, ns, cfg)
    except B.GateFailed as e:
        print('GATE FAILED:', e)
        return 3
    except B.BuildError as e:
        print('BUILD FAILED:', e)
        return 2
    print('OK: %s=%s%s' % (r['train'], r['rid'], '' if a.without_mon else ' (with MON)'))
    return 0


if __name__ == '__main__':
    sys.exit(main())

#!/usr/bin/env python3
"""Build one train WITH the prototype group ANIM (and, by default, MON) into a private scratch directory.

    node docs/pitch/anim/05-proto/build-anim-proto.mjs                                     # sources -> dist/ANIM-proto.json
    python docs/pitch/anim/05-proto/anim_build.py --train R1c --out tmp/pitch-anim/arch/anim-R1c [--no-gate] [--without-mon] [--control]

Same idea as tools/t0/mon/mon_build.py (this file is a modified copy; tools/t0 is imported unmodified): tools/t0/build.py only loads groups that trains.json names, the
prototype is NOT registered, so
  * trains.json is read in memory and gets  "optional_groups": ["MON", "ANIM"]  (nothing is written back),
  * the patch set is copied to a scratch directory next to --out together with MON.json (tools/t0/patches-next) and dist/ANIM-proto.json renamed ANIM.json,
  * build_train() then runs exactly as a registered optional group would: every anchor asserted (`expect`), every gate run (parse, unresolved globals, anchors, ledger, bytes ...).
--control builds the same tree without ANIM (the before/after control of the measurements).  Nothing under release/ is touched; legacy/ and baseline/ are only read.
Exit codes are the builder's: 0 ok, 2 anchors / preconditions, 3 gate.
"""
import argparse
import copy
import os
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
T0 = os.path.join(REPO, 'tools', 't0')
sys.path.insert(0, T0)
import build as B  # noqa: E402
from t0build.util import load_json, rmtree_safe  # noqa: E402


def stage_patches(dest, with_mon, with_anim):
    rmtree_safe(dest)
    os.makedirs(dest)
    src = os.path.join(T0, 'patches')
    for fn in sorted(os.listdir(src)):
        if fn.endswith('.json'):
            shutil.copyfile(os.path.join(src, fn), os.path.join(dest, fn))
    if with_mon:
        shutil.copyfile(os.path.join(T0, 'patches-next', 'MON.json'), os.path.join(dest, 'MON.json'))
    if with_anim:
        a = os.path.join(HERE, 'dist', 'ANIM-proto.json')
        if not os.path.isfile(a):
            raise SystemExit('dist/ANIM-proto.json not found: run node docs/pitch/anim/05-proto/build-anim-proto.mjs')
        shutil.copyfile(a, os.path.join(dest, 'ANIM.json'))


def main(argv=None):
    for st in (sys.stdout, sys.stderr):
        try:
            st.reconfigure(encoding='utf-8', errors='replace')
        except (AttributeError, ValueError):
            pass
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--train', choices=['R1a', 'R1b', 'R1c'], required=True)
    ap.add_argument('--out', required=True, help='output directory under tmp/ (NEVER release/<train>)')
    ap.add_argument('--no-gate', action='store_true')
    ap.add_argument('--without-mon', action='store_true')
    ap.add_argument('--control', action='store_true', help='build without ANIM')
    a = ap.parse_args(argv)
    out_abs = os.path.abspath(os.path.join(REPO, a.out))
    if os.path.normcase(out_abs) == os.path.normcase(os.path.join(REPO, 'release', a.train)):
        raise SystemExit("refusing to build into release/%s (the integrator's output); use a directory under tmp/" % a.train)
    cfg = copy.deepcopy(load_json(os.path.join(T0, 'trains.json')))
    want = (['MON'] if not a.without_mon else []) + (['ANIM'] if not a.control else [])
    cfg['optional_groups'] = list(cfg.get('optional_groups', [])) + want
    scratch = os.path.join(os.path.dirname(out_abs), '_anim-patches-' + a.train)
    stage_patches(scratch, not a.without_mon, not a.control)
    ns = argparse.Namespace(train=a.train, all=False, out=a.out, with_groups=want, record=False, no_gate=a.no_gate, keep_failed=True, order='fixed', dump_stage=None,
                            legacy=None, base_dir=None, base_lock=None, patches=scratch, overlay=None, ledger=None, config_hook=None)
    try:
        r = B.build_train(a.train, ns, cfg)
    except B.GateFailed as e:
        print('GATE FAILED:', e)
        return 3
    except B.BuildError as e:
        print('BUILD FAILED:', e)
        return 2
    print('OK: %s=%s (groups: %s)' % (r['train'], r['rid'], ', '.join(want) or 'none'))
    return 0


if __name__ == '__main__':
    sys.exit(main())

#!/usr/bin/env python3
"""Build one train WITH the optional group ANIM (the unit-marker engine) into a private directory.

    python tools/t0/anim/anim_build.py --train R1c --out tmp/motion-build/anim-R1c [--no-gate] [--without-anim] [--without-mon]

Why a wrapper: tools/t0/build.py only loads groups that trains.json names, and the owner of trains.json (the Tranche 0 integrator) has not registered ANIM yet, so ANIM.json (and its extension part
ANIM+mon.json, valid only when MON is in the build) live in tools/t0/patches-next/ (inert, like CLOCK.json, DATA.json and MON.json).  This script feeds them to the unmodified builder, the same pattern as
tools/t0/mon/mon_build.py:
  * trains.json is read in memory and gets  "optional_groups": [..., "MON", "ANIM"]  (nothing is written back); ANIM applies AFTER MON, so its Monuments hook anchors on MON's finished text;
  * the patch set is copied to a scratch directory (<out>/../_anim-patches-<train>) with the patches-next files handed to the builder with its own `--patches` option;
  * build_train() then runs exactly as `python tools/t0/build.py --train <t> --out <dir> --with MON,ANIM` would after the registration described in tools/t0/ANIM-README.md.
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


def stage_patches(dest, with_mon, with_anim, extra=()):
    rmtree_safe(dest)
    os.makedirs(dest)
    src = os.path.join(T0, 'patches')
    for fn in sorted(os.listdir(src)):
        if fn.endswith('.json'):
            shutil.copyfile(os.path.join(src, fn), os.path.join(dest, fn))
    nxt = os.path.join(T0, 'patches-next')
    want = []
    if with_mon:
        want.append('MON.json')
    if with_anim:
        want.append('ANIM.json')
        if with_mon:
            want.append('ANIM+mon.json')
    want.extend(extra)
    for fn in want:
        p = os.path.join(nxt, fn)
        if not os.path.isfile(p):
            raise SystemExit('tools/t0/patches-next/%s not found (run node tools/t0/anim/build-anim.mjs; MON.json comes from node tools/t0/mon/build-mon.mjs)' % fn)
        shutil.copyfile(p, os.path.join(dest, fn))


def main(argv=None):
    for st in (sys.stdout, sys.stderr):
        try:
            st.reconfigure(encoding='utf-8', errors='replace')
        except (AttributeError, ValueError):
            pass
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--train', choices=['R1a', 'R1b', 'R1c'], required=True)
    ap.add_argument('--out', required=True, help="output directory (under tmp/); NEVER the integrator's release/<train>")
    ap.add_argument('--no-gate', action='store_true')
    ap.add_argument('--without-anim', action='store_true', help='build the same tree without ANIM (control for before/after measurements)')
    ap.add_argument('--without-mon', action='store_true', help='build without the Monuments layer (ANIM then skips its Monuments hook)')
    ap.add_argument('--extra', action='append', default=[], help='another file of tools/t0/patches-next to add as an optional group (e.g. CLOCK.json)')
    a = ap.parse_args(argv)
    out_abs = os.path.abspath(os.path.join(REPO, a.out))
    default_out = os.path.join(REPO, 'release', a.train)
    if os.path.normcase(out_abs) == os.path.normcase(default_out):
        raise SystemExit("refusing to build into release/%s (the integrator's output); use a directory under tmp/" % a.train)
    cfg = copy.deepcopy(load_json(os.path.join(T0, 'trains.json')))
    groups = []
    if not a.without_mon:
        groups.append('MON')
    if not a.without_anim:
        groups.append('ANIM')
    for fn in a.extra:
        groups.append(fn.split('.')[0].split('+')[0])
    have = set(cfg.get('group_order', [])) | set(cfg.get('optional_groups', []))
    cfg['optional_groups'] = list(cfg.get('optional_groups', [])) + [g for g in groups if g not in have]
    scratch = os.path.join(os.path.dirname(out_abs), '_anim-patches-' + a.train)
    stage_patches(scratch, not a.without_mon, not a.without_anim, a.extra)
    ns = argparse.Namespace(train=a.train, all=False, out=a.out, with_groups=groups, record=False, no_gate=a.no_gate,
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
    print('OK: %s=%s (with %s)' % (r['train'], r['rid'], ','.join(groups) or 'no optional group'))
    return 0


if __name__ == '__main__':
    sys.exit(main())

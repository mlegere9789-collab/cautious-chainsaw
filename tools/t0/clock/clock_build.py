#!/usr/bin/env python3
"""Build one train WITH the optional group CLOCK (the corrected historical clock) into a private directory.

    python tools/t0/clock/clock_build.py --train R1c --out tmp/clock-integrate/clock-R1c [--no-gate] [--also MON --also DATA]

Pattern of tools/t0/mon/mon_build.py: tools/t0/build.py only loads groups that trains.json names; CLOCK.json lives in tools/t0/patches-next/ (inert) and this
wrapper feeds it to the unmodified builder:
  * trains.json is read in memory and gets "optional_groups": [..., "CLOCK"] (nothing is written back),
  * the patch set is copied to a scratch directory (<out>/../_clock-patches-<train>) together with CLOCK.json (and any --also group) and handed to the builder with its own --patches option.
--also NAME stacks another unregistered group from patches-next/ (MON, DATA) after CLOCK, in the order given, so the combined tree can be tested; each is added in memory the same way.
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


def stage_patches(dest, groups):
    rmtree_safe(dest)
    os.makedirs(dest)
    src = os.path.join(T0, 'patches')
    for fn in sorted(os.listdir(src)):
        if fn.endswith('.json'):
            shutil.copyfile(os.path.join(src, fn), os.path.join(dest, fn))
    for g in groups:
        if os.path.isfile(os.path.join(dest, g + '.json')):
            continue                                    # already registered in patches/: use that one
        nxt = os.path.join(T0, 'patches-next', g + '.json')
        if not os.path.isfile(nxt):
            raise SystemExit('tools/t0/patches-next/%s.json not found' % g)
        shutil.copyfile(nxt, os.path.join(dest, g + '.json'))


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
    ap.add_argument('--without-clock', action='store_true', help='build the same tree without CLOCK (control for before/after measurements)')
    ap.add_argument('--dump-stage', default=None, metavar='DIR', help='write the bundle texts (js, help, book, css) after the bundle groups to DIR (tools/t0/clock/build-clock.mjs asserts the patches that follow groups A..PERF against them)')
    ap.add_argument('--also', action='append', default=[], metavar='GROUP', help='stack another group from patches-next (MON, DATA) after CLOCK')
    a = ap.parse_args(argv)
    out_abs = os.path.abspath(os.path.join(REPO, a.out))
    default_out = os.path.join(REPO, 'release', a.train)
    if os.path.normcase(out_abs) == os.path.normcase(default_out):
        raise SystemExit("refusing to build into release/%s (the integrator's output); use a directory under tmp/" % a.train)
    groups = ([] if a.without_clock else ['CLOCK']) + list(a.also)
    cfg = copy.deepcopy(load_json(os.path.join(T0, 'trains.json')))
    for g in groups:
        if g not in cfg.get('group_order', []) and g not in cfg.get('optional_groups', []):
            cfg['optional_groups'] = list(cfg.get('optional_groups', [])) + [g]
    scratch = os.path.join(os.path.dirname(out_abs), '_clock-patches-' + a.train)
    stage_patches(scratch, groups)
    ns = argparse.Namespace(train=a.train, all=False, out=a.out, with_groups=groups, record=False, no_gate=a.no_gate,
                            keep_failed=True, order='fixed', dump_stage=a.dump_stage, legacy=None, base_dir=None, base_lock=None, patches=scratch, overlay=None,
                            ledger=None, config_hook=None)
    try:
        r = B.build_train(a.train, ns, cfg)
    except B.GateFailed as e:
        print('GATE FAILED:', e)
        return 3
    except B.BuildError as e:
        print('BUILD FAILED:', e)
        return 2
    print('OK: %s=%s (%s)' % (r['train'], r['rid'], '+'.join(groups) if groups else 'no optional group'))
    return 0


if __name__ == '__main__':
    sys.exit(main())

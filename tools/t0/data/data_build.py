#!/usr/bin/env python3
"""Build one train WITH the optional bundle group DATA (verified displayed data) into a private directory, optionally together with other
unregistered optional groups (CLOCK, MON, ...) that live in tools/t0/patches-next/.

    python tools/t0/data/data_build.py --train R1c --out tmp/data-audit/data-R1c [--with CLOCK,DATA,MON] [--no-gate] [--without-data]

Pattern of tools/t0/mon/mon_build.py: trains.json is read in memory and gets "optional_groups": [<the --with list, in that order>] (nothing is written
back), the patch set is copied to a scratch directory next to --out together with the chosen groups from patches-next/ (or patches/ once registered),
and the unmodified builder runs with its own --patches option.  Nothing under release/ is touched unless --out says so (it refuses release/<train>);
legacy/ and baseline/ are only read.  Exit codes are the builder's (0 ok, 2 anchors/preconditions, 3 gate).

Gate note: the gate row `data-untouched` (T0 rule 5: no served data/* file of the baseline may change) FAILS on a DATA build by design: the owner decision of
2026-10-05 (item 3) supersedes that rule for the displayed data this group corrects.  The row lists exactly the files DATA changed; every other gate row
must stay green.  `--no-gate` skips the gate (the tests/t0/data.spec.mjs harness uses it for speed, the audit runs the gate once and reads gate.json).
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
            continue
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
    ap.add_argument('--out', required=True, help='output directory under tmp/ (never release/<train>)')
    ap.add_argument('--with', dest='with_groups', default='DATA', help='comma list of optional groups in application order (default DATA)')
    ap.add_argument('--no-gate', action='store_true')
    ap.add_argument('--without-data', action='store_true', help='control: the same tree without DATA (the other --with groups stay)')
    a = ap.parse_args(argv)
    out_abs = os.path.abspath(os.path.join(REPO, a.out))
    if os.path.normcase(out_abs) == os.path.normcase(os.path.join(REPO, 'release', a.train)):
        raise SystemExit("refusing to build into release/%s (the integrator's output); use a directory under tmp/" % a.train)
    groups = [g for g in a.with_groups.split(',') if g]
    if a.without_data:
        groups = [g for g in groups if g != 'DATA']
    cfg = copy.deepcopy(load_json(os.path.join(T0, 'trains.json')))
    reg = set(cfg.get('group_order', [])) | set(cfg.get('optional_groups', []))
    cfg['optional_groups'] = list(cfg.get('optional_groups', [])) + [g for g in groups if g not in reg]
    scratch = os.path.join(os.path.dirname(out_abs), '_data-patches-' + os.path.basename(out_abs))
    stage_patches(scratch, groups)
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
    print('OK: %s=%s (groups: %s)' % (r['train'], r['rid'], ','.join(groups) or 'none'))
    return 0


if __name__ == '__main__':
    sys.exit(main())

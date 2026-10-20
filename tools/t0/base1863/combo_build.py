#!/usr/bin/env python3
"""Build one train WITH BOTH optional groups that make "the site shows only real images of Gettysburg": BASE1863 (the 1863 reconstruction as the base of the maps, no Mapbox satellite style,
no Street View) and IMG (real 1863 photographs instead of generated art), into a private directory.

    python tools/t0/base1863/combo_build.py --train R1c --out tmp/b1863/group/combo-R1c [--no-gate] [--with CLOCK,DATA,MON]

Verification pass 8 found that the two groups were never built together, so the tree that would ship still carried the Mapbox satellite style (Walkthrough map, seven pages), the Google
Street View embed and the generated og card / star icons.  This wrapper composes the two existing wrappers without changing either of them (tools/t0/base1863/b63_build.py,
tools/t0/images/img_build.py); trains.json is read in memory only, nothing is written back, nothing under release/ is touched.
Exit codes are the builder's (0 ok, 2 anchors/preconditions, 3 gate).
"""
import argparse
import copy
import json
import os
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
T0 = os.path.dirname(HERE)
sys.path.insert(0, T0)
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(T0, 'images'))
import build as B  # noqa: E402
from t0build import mechanism as M  # noqa: E402
from t0build.util import REPO, load_json, rmtree_safe  # noqa: E402
import b63_build as BB  # noqa: E402
import img_build as IB  # noqa: E402


def main(argv=None):
    for st in (sys.stdout, sys.stderr):
        try:
            st.reconfigure(encoding='utf-8', errors='replace')
        except (AttributeError, ValueError):
            pass
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--train', choices=['R1a', 'R1b', 'R1c'], required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--no-gate', action='store_true')
    ap.add_argument('--with', dest='with_groups', default='', help='other patches-next groups to stack before BASE1863 (e.g. CLOCK,DATA,MON)')
    ap.add_argument('--stage', default=BB.STAGE_DEFAULT)
    a = ap.parse_args(argv)
    BB.lowprio()
    out_abs = os.path.abspath(os.path.join(REPO, a.out))
    if os.path.normcase(out_abs) == os.path.normcase(os.path.join(REPO, 'release', a.train)):
        raise SystemExit("refusing to build into release/%s (the integrator's output); use a directory under tmp/" % a.train)
    stage = os.path.abspath(os.path.join(REPO, a.stage))
    others = [g for g in a.with_groups.split(',') if g]
    cfg = copy.deepcopy(load_json(os.path.join(T0, 'trains.json')))
    names = others + ['BASE1863']
    for g in names:
        if g in cfg.get('group_order', []):
            raise SystemExit('%s is registered in trains.json: use tools/t0/build.py --with instead' % g)
    cfg['optional_groups'] = list(cfg.get('optional_groups', [])) + names
    scratch = os.path.join(os.path.dirname(out_abs), '_combo-patches-' + os.path.basename(out_abs))
    BB.stage_patches(scratch, others, True)
    # IMG as the page group PG-zimg (same as img_build.stage_patches)
    nxt = os.path.join(T0, 'patches-next', 'IMG.json')
    g = load_json(nxt)
    g['group'] = IB.PG_NAME; g['optional'] = True; g['train'] = 'R1a'
    with open(os.path.join(scratch, IB.PG_NAME + '.json'), 'w', encoding='utf-8', newline='') as f:
        json.dump(g, f, indent=1, ensure_ascii=False); f.write('\n')
    scratch_ov = os.path.join(os.path.dirname(out_abs), '_combo-overlay-' + os.path.basename(out_abs))
    IB.stage_overlay(scratch_ov, True, None)                         # the overlay with the IMG edits (a full copy)
    top = os.path.join(stage, 'tiles1863')
    if not os.path.isdir(top):
        raise SystemExit('no staged tile set in %s: run python tools/t0/base1863/stage_assets.py first' % stage)
    last = cfg['trains'][a.train]['overlay'][-1]
    BB.link_tree(top, os.path.join(scratch_ov, last, 'tiles1863'))
    orig_tmpl = M._tmpl

    def tmpl(name):
        t = orig_tmpl(name)
        return BB.sw_with_tiles(t) if name == 'sw.js.tmpl' else t
    M._tmpl = tmpl
    hook = os.path.join('tools', 't0', 'base1863', 'config_hook.mjs') if cfg['trains'][a.train].get('config') else None
    ns = argparse.Namespace(train=a.train, all=False, out=a.out, with_groups=names + [IB.PG_NAME], record=False, no_gate=a.no_gate, keep_failed=True, order='fixed', dump_stage=None,
                            legacy=None, base_dir=None, base_lock=None, patches=scratch, overlay=scratch_ov, ledger=None, config_hook=hook)
    try:
        r = B.build_train(a.train, ns, cfg)
    except B.GateFailed as e:
        print('GATE FAILED:', e)
        return 3
    except B.BuildError as e:
        print('BUILD FAILED:', e)
        return 2
    finally:
        M._tmpl = orig_tmpl
    print('OK: %s=%s (with %s)' % (r['train'], r['rid'], '+'.join(names + [IB.PG_NAME])))
    return 0


if __name__ == '__main__':
    sys.exit(main())

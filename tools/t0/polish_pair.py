#!/usr/bin/env python3
"""Build the matched pair that T0-POL-09, 10 and 11 of tests/t0/polish.spec.mjs need (a tree with POLISH and the same tree without it).

    python tools/t0/polish_pair.py --out tmp/pol-ctl  --with CLOCK,DATA,MON,ANIM
    python tools/t0/polish_pair.py --out tmp/pol-tree --with CLOCK,DATA,MON,ANIM,POLISH,PG-polish
    node tests/t0/polish.spec.mjs --dist tmp/pol-tree/dist --control tmp/pol-ctl/dist [--build]

Why a pair on R1c and not "R1e without POLISH": later groups of R1d and R1e anchor on the text POLISH leaves in the bundle (PG-zperf3 in PERF3, for one), so train R1e cannot be built without POLISH.
The pair is the one the spec was written for (README, tools/t0/POLISH-README.md): R1c plus the groups named, the unmodified builder, patches taken from tools/t0/patches (the registered, frozen R1d copies)
and, for a group that is not registered for R1c, tools/t0/patches-next.  --gate also writes gate.json (T0-POL-11 runs the gate itself and needs anchors.json beside the tree, which the build writes).
"""
import argparse
import copy
import json
import os
import shutil
import subprocess
import sys

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
T0 = os.path.join(REPO, 'tools', 't0')
sys.path.insert(0, T0)
import build as B  # noqa: E402
from t0build.util import load_json, rmtree_safe  # noqa: E402

ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument('--out', required=True)
ap.add_argument('--with', dest='with_', default='')
ap.add_argument('--train', default='R1c')
ap.add_argument('--gate', action='store_true')
a = ap.parse_args()
groups = [g for g in a.with_.split(',') if g]
out_abs = os.path.abspath(os.path.join(REPO, a.out))
scratch = os.path.join(os.path.dirname(out_abs), '_stage-' + os.path.basename(out_abs))
rmtree_safe(scratch)
os.makedirs(scratch)
for fn in os.listdir(os.path.join(T0, 'patches')):
    if fn.endswith('.json'):
        shutil.copyfile(os.path.join(T0, 'patches', fn), os.path.join(scratch, fn))
nxt = os.path.join(T0, 'patches-next')
for g in groups:
    if os.path.isfile(os.path.join(scratch, g + '.json')) and not g.startswith('PG-'):
        continue
    n = 0
    for fn in sorted(os.listdir(nxt)):
        if fn == g + '.json' or (fn.startswith(g + '+') and fn.endswith('.json')):
            dst = os.path.join(scratch, fn)
            shutil.copyfile(os.path.join(nxt, fn), dst)
            n += 1
            if fn.startswith('PG-'):
                o = json.load(open(dst, encoding='utf-8'))
                o['train'] = a.train
                o['optional'] = True
                open(dst, 'w', encoding='utf-8', newline='').write(json.dumps(o, indent=1, ensure_ascii=False) + '\n')
    if not n:
        raise SystemExit('no patches-next file for ' + g)
cfg = copy.deepcopy(load_json(os.path.join(T0, 'trains.json')))
cfg['optional_groups'] = list(cfg.get('optional_groups', [])) + [g for g in groups if not g.startswith('PG-')]
ns = argparse.Namespace(train=a.train, all=False, out=a.out, with_groups=groups, record=False, no_gate=True, keep_failed=True, order='fixed', dump_stage=None, legacy=None, base_dir=None,
                        base_lock=None, patches=scratch, overlay=None, ledger=None, config_hook=None)
try:
    r = B.build_train(a.train, ns, cfg)
except B.BuildError as e:
    print('BUILD FAILED:', e)
    sys.exit(2)
print('OK: %s=%s (%s)' % (r['train'], r['rid'], ','.join(groups)))
if a.gate:
    gate = ['node', os.path.join(T0, 'gate.mjs'), '--train', a.train, '--dist', os.path.join(r['out'], 'dist'), '--anchors', os.path.join(r['out'], 'anchors.json'), '--out', os.path.join(r['out'], 'gate.json'),
            '--legacy', os.path.join(REPO, 'baseline', 'dist'), '--ledger', os.path.join(REPO, 'ops', 'used-names.txt')]
    subprocess.run(gate, cwd=REPO)

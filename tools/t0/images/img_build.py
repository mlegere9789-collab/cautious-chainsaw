#!/usr/bin/env python3
"""Build one train WITH the optional group IMG (real Gettysburg images only) into a private directory.

    python tools/t0/images/img_build.py --train R1c --out tmp/b1863/images/img-R1c [--no-gate] [--without-img]

Same pattern as tools/t0/mon/mon_build.py: tools/t0/build.py only loads groups that trains.json names and trains.json is not ours, so

  * trains.json is read in memory only (nothing is written back);
  * the patch set is copied to <out>/../_img-patches-<train> and tools/t0/patches-next/IMG.json is staged into it as the PAGE group `PG-zimg` (optional;
    page groups run in file-name order after every fixed group, i.e. after PG-maps, whose og:image text the IMG anchors expect) and requested with --with;
  * the overlay is copied to <out>/../_img-overlay-<train>; tools/t0/images/IMG-overlay.json then (1) removes the generic files the IMG group replaces
    (og/card-r1.png, the two maskable icons, the two "screenshots") and (2) edits the overlay manifest.json with asserted rows (a row that does not match exactly
    once stops the build, so a later change of that manifest cannot be reverted silently), and tools/t0/images/overlay/common/** (the derived photographs) is
    copied in;
  * build.py is then called with --patches and --overlay pointing at those scratch copies.  Nothing under release/ is touched unless --out says so.

--without-img builds the same tree through the same wrapper without the group (the control for before/after measurements; it equals the stock build).
Runs at below-normal priority.  Exit codes are the builder's (0 ok, 2 anchors/preconditions, 3 gate).

Integration (owner of trains.json): rename tools/t0/patches-next/IMG.json to patches/PG-zimg.json (group "PG-zimg", add "optional": true or drop it to ship by
default), copy tools/t0/images/overlay/common/** into tools/t0/overlay/common/, delete tools/t0/overlay/common/{screenshots,og/card-r1.png,
icons/icon-maskable-*.png}, and apply the two manifest rows of IMG-overlay.json to tools/t0/overlay/common/manifest.json.
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
import build as B  # noqa: E402
from t0build.util import REPO, load_json, rmtree_safe  # noqa: E402

PG_NAME = 'PG-zimg'


def lower_priority():
    try:
        import ctypes
        ctypes.windll.kernel32.SetPriorityClass(ctypes.windll.kernel32.GetCurrentProcess(), 0x00004000)   # BELOW_NORMAL_PRIORITY_CLASS
    except Exception:
        try:
            os.nice(10)
        except Exception:
            pass


def stage_patches(dest, with_img=True, img_json=None):
    rmtree_safe(dest)
    os.makedirs(dest)
    src = os.path.join(T0, 'patches')
    for fn in sorted(os.listdir(src)):
        if fn.endswith('.json'):
            shutil.copyfile(os.path.join(src, fn), os.path.join(dest, fn))
    if with_img:
        nxt = img_json or os.path.join(T0, 'patches-next', 'IMG.json')
        if not os.path.isfile(nxt):
            raise SystemExit('tools/t0/patches-next/IMG.json not found: run python tools/t0/images/gen_patches.py')
        g = load_json(nxt)
        g['group'] = PG_NAME
        g['optional'] = True
        g['train'] = 'R1a'
        with open(os.path.join(dest, PG_NAME + '.json'), 'w', encoding='utf-8', newline='') as f:
            json.dump(g, f, indent=1, ensure_ascii=False)
            f.write('\n')


def stage_overlay(dest, with_img=True, overlay_json=None):
    rmtree_safe(dest)
    shutil.copytree(os.path.join(T0, 'overlay'), dest)
    if not with_img:
        return
    spec = load_json(overlay_json or os.path.join(HERE, 'IMG-overlay.json'))
    common = os.path.join(dest, 'common')
    for rel in spec['remove_from_overlay']:
        p = os.path.join(common, *rel.split('/'))
        if not os.path.isfile(p):
            raise SystemExit('IMG-overlay.json: %s is not in tools/t0/overlay/common any more (someone changed the overlay; update IMG-overlay.json)' % rel)
        os.remove(p)
    for d in ('screenshots', 'og', 'icons'):
        p = os.path.join(common, d)
        if os.path.isdir(p) and not os.listdir(p) and d == 'screenshots':
            os.rmdir(p)
    mp = os.path.join(common, spec['file'])
    with open(mp, 'rb') as f:
        raw = f.read().decode('utf-8')
    crlf = '\r\n' in raw
    text = raw.replace('\r\n', '\n')
    for r in spec['rows']:
        n = text.count(r['find'])
        if n != r['expect']:
            raise SystemExit('IMG-overlay.json row %s: anchor found %d times, expected %d in tools/t0/overlay/common/%s' % (r['id'], n, r['expect'], spec['file']))
        text = text.replace(r['find'], r['repl'])
    json.loads(text)       # still valid JSON
    if crlf:
        text = text.replace('\n', '\r\n')
    with open(mp, 'wb') as f:
        f.write(text.encode('utf-8'))
    src = os.path.join(HERE, 'overlay', 'common')
    for root, _dirs, files in os.walk(src):
        for fn in files:
            rel = os.path.relpath(os.path.join(root, fn), src)
            tgt = os.path.join(common, rel)
            os.makedirs(os.path.dirname(tgt), exist_ok=True)
            shutil.copyfile(os.path.join(root, fn), tgt)


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
    ap.add_argument('--without-img', action='store_true', help='build the same tree without IMG (control)')
    ap.add_argument('--img-json', help='alternative IMG.json (self-test: a mutated anchor must stop the build)')
    ap.add_argument('--overlay-json', help='alternative IMG-overlay.json (self-test)')
    a = ap.parse_args(argv)
    lower_priority()
    out_abs = os.path.abspath(os.path.join(REPO, a.out))
    if os.path.normcase(out_abs) == os.path.normcase(os.path.join(REPO, 'release', a.train)):
        raise SystemExit("refusing to build into release/%s (the integrator's output); use a directory under tmp/" % a.train)
    with_img = not a.without_img
    cfg = copy.deepcopy(load_json(os.path.join(T0, 'trains.json')))
    pscratch = os.path.join(os.path.dirname(out_abs), '_img-patches-' + a.train)
    oscratch = os.path.join(os.path.dirname(out_abs), '_img-overlay-' + a.train)
    stage_patches(pscratch, with_img, os.path.abspath(a.img_json) if a.img_json else None)
    stage_overlay(oscratch, with_img, os.path.abspath(a.overlay_json) if a.overlay_json else None)
    ns = argparse.Namespace(train=a.train, all=False, out=a.out, with_groups=([PG_NAME] if with_img else []), record=False, no_gate=a.no_gate,
                            keep_failed=True, order='fixed', dump_stage=None, legacy=None, base_dir=None, base_lock=None, patches=pscratch, overlay=oscratch,
                            ledger=None, config_hook=None)
    try:
        r = B.build_train(a.train, ns, cfg)
    except B.GateFailed as e:
        print('GATE FAILED:', e)
        return 3
    except B.BuildError as e:
        print('BUILD FAILED:', e)
        return 2
    print('OK: %s=%s%s' % (r['train'], r['rid'], ' (with IMG)' if with_img else ' (control, no IMG)'))
    return 0


if __name__ == '__main__':
    sys.exit(main())

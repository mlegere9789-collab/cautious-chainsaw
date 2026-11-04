#!/usr/bin/env python3
"""Prepare the overlay directories of train R1d (the Release 1 candidate), then build it with the registered builder:

    python tools/t0/r1d_prepare.py [--tiles] [--guide docs/guide/out/user-guide.pdf]
    python tools/t0/build.py --train R1d            ->  release/R1d/{dist,anchors.json,gate.json,manifest.json}
    python tools/ship/pack_zip.py --train R1d --out deliver/gettysburg-R1d-<release id>-PRODUCTION.zip

What it writes (all deterministic; the first two are committed, the tile directory is generated and git-ignored):
  tools/t0/overlay/common-r1d/        tools/t0/overlay/common with the IMG edits applied (tools/t0/images/IMG-overlay.json rows and removals, the new photographs, icons and card)
  tools/t0/overlay/R1d/data/moments.json   R1c's data/moments.json with the Culp's Hill moment (tp-culps-hill-retaken) re-pointed from tick 460 to tick 480 (the chronology event of the XII Corps
                                      recapture of the lower works, 7:05 AM, in the DATA group's chronology; DATA moved "Colgrove's charge" from 460 to 483).  A provisional CONTENT decision, logged in docs/accept/R1-STATUS.md.
  tools/t0/overlay/R1d/user-guide.pdf the tutorial PDF (docs/guide/out/user-guide.pdf, built by tools/guide)
  tools/t0/overlay/R1d/tiles1863/     with --tiles: hard links to the staged reconstruction pyramid (python tools/t0/base1863/stage_assets.py first; tmp/b1863/group/stage/tiles1863/<version>/)
R1d's overlay list in trains.json is R0, common-r1d, R1a, R1b, R1c, R1d: the published trains keep reading tools/t0/overlay/common unchanged.
"""
import argparse
import os
import re
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, 'images'))
sys.path.insert(0, os.path.join(HERE, 'base1863'))
from t0build.util import REPO, rmtree_safe  # noqa: E402
import img_build as IB  # noqa: E402

OV = os.path.join(HERE, 'overlay')


def rm_overlay(path):
    ap = os.path.abspath(path)
    if not (ap.startswith(OV + os.sep) and os.path.basename(ap) in ('common-r1d', 'tiles1863')):
        raise SystemExit('refusing to delete ' + path)
    if os.path.isdir(ap):
        shutil.rmtree(ap)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--tiles', action='store_true', help='link the staged reconstruction tile pyramid into overlay/R1d/tiles1863')
    ap.add_argument('--stage', default=os.path.join('tmp', 'b1863', 'group', 'stage'))
    ap.add_argument('--guide', default=os.path.join('docs', 'guide', 'out', 'user-guide.pdf'))
    a = ap.parse_args(argv)
    tmp = os.path.join(REPO, 'tmp', 'r1d-overlay-stage')
    IB.stage_overlay(tmp, True, None)
    dst = os.path.join(OV, 'common-r1d')
    rm_overlay(dst)
    shutil.copytree(os.path.join(tmp, 'common'), dst)
    rmtree_safe(tmp)
    r1d = os.path.join(OV, 'R1d')
    os.makedirs(os.path.join(r1d, 'data'), exist_ok=True)
    src = os.path.join(OV, 'R1c', 'data', 'moments.json')
    txt = open(src, encoding='utf-8', newline='').read()
    rx = re.compile(r'("id":\s*"tp-culps-hill-retaken",\s*"kind":\s*"turning-point",\s*"tick":\s*)460\b')
    if len(rx.findall(txt)) != 1:
        raise SystemExit('overlay R1c data/moments.json: the tp-culps-hill-retaken row (tick 460) was not found exactly once')
    open(os.path.join(r1d, 'data', 'moments.json'), 'w', encoding='utf-8', newline='').write(rx.sub(lambda m: m.group(1) + '480', txt))
    g = os.path.join(REPO, a.guide)
    if os.path.isfile(g):
        shutil.copyfile(g, os.path.join(r1d, 'user-guide.pdf'))
    else:
        print('note: no tutorial PDF at %s (the published one stays)' % a.guide)
    if a.tiles:
        import b63_build as BB
        top = os.path.join(REPO, a.stage, 'tiles1863')
        if not os.path.isdir(top):
            raise SystemExit('no staged tile set in %s: run python tools/t0/base1863/stage_assets.py first' % a.stage)
        t = os.path.join(r1d, 'tiles1863')
        rm_overlay(t)
        BB.link_tree(top, t)
    print('R1d overlay ready: common-r1d, R1d/data/moments.json%s%s' % (', R1d/user-guide.pdf' if os.path.isfile(g) else '', ', R1d/tiles1863' if a.tiles else ''))
    return 0


if __name__ == '__main__':
    sys.exit(main())

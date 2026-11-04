#!/usr/bin/env python3
"""Page group PG-zperf6 (Release 1 round 5, train R1g): /compare '3D Terrain' (and every Mapbox page that queues the terrain variants) no longer links a shader program inside a frame.

    python tools/t0/r1g/gen_terrain.py            write tools/t0/patches-next/PG-zperf6.json
    python tools/t0/r1g/gen_terrain.py --check    exit 1 when the written file differs from what this script generates
    python tools/t0/r1g/gen_terrain.py --scratch DIR   also write DIR/PG-zperf5+terrain.json (the same patch as an extension part of PG-zperf5, for a scratch build of train R1f:
                                                  python tools/t0/build.py --train R1f --patches DIR --out tmp/...; the bytes of site-nav.js are those R1g gets)

The anchor is checked against release/R1f/dist (the finished text of the page groups that sort before PG-zperf6); an anchor that does not match exactly once stops the script.
What and why: tools/t0/PERF6-README.md section 2.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
OUT = os.path.join(REPO, 'tools', 't0', 'patches-next', 'PG-zperf6.json')
DIST = os.path.join(REPO, 'release', 'R1f', 'dist')

FIND = "if (withTerrain) { variants.push({ t: true, f: false }); if (fog) variants.push({ t: true, f: true }); }"
REPL = """if (withTerrain) {
            // PERF6: the circle and symbol programs of the terrain stage, with every combination of terrain and fog that a frame can draw: terrain on, with and without fog (the pitch decides),
            // and terrain OFF with fog (switching 3D Terrain off while the map is still tilted: the fog follows the pitch, the circle layer of the units is drawn with the FOG define and no terrain).
            // The last one was missing: its first draw linked the program inside Mapbox's render frame (getProgramParameter 34 ms, a frame of 45 ms) the first time a browser profile met it.
            variants.push({ t: true, f: false });
            if (fog) variants.push({ t: true, f: true }, { t: false, f: true });
          }"""


def dist_text(name):
    return open(os.path.join(DIST, name), encoding='utf-8', newline='').read()


def patches():
    txt = dist_text('site-nav.js')
    if txt.count(FIND) != 1:
        raise SystemExit('gen_terrain: the anchor is not in release/R1f/dist/site-nav.js exactly once (%d)' % txt.count(FIND))
    return [{'id': 'PERF6-nav-terrain-fog-variant', 'target': 'site-nav.js', 'find': FIND, 'repl': REPL, 'expect': 1,
             'note': 'GTBG_PRECOMPILE: with terrain variants queued, the circle and symbol programs also get the variant terrain off + fog on (map tilted, 3D Terrain just switched off), queued in the same idle slices as the other terrain variants'}]


def wanted():
    return json.dumps({'group': 'PG-zperf6', 'description': 'Release 1 round 5: the precompile queue holds the circle/symbol variant terrain off + fog on, so switching 3D Terrain off on a tilted map links no program in a frame; sorts after PG-zperf5',
                       'train': 'R1g', 'patches': patches()}, indent=1, ensure_ascii=False) + '\n'


def main(argv):
    text = wanted()
    if '--scratch' in argv:
        d = argv[argv.index('--scratch') + 1]
        os.makedirs(d, exist_ok=True)
        open(os.path.join(d, 'PG-zperf5+terrain.json'), 'w', encoding='utf-8', newline='').write(json.dumps({'group': 'PG-zperf5', 'patches': patches()}, indent=1, ensure_ascii=False) + '\n')
        print('scratch: ' + os.path.join(d, 'PG-zperf5+terrain.json'))
    cur = open(OUT, encoding='utf-8', newline='').read() if os.path.isfile(OUT) else None
    if '--check' in argv:
        print('differs' if cur != text else 'identical')
        return 1 if cur != text else 0
    if cur != text:
        open(OUT, 'w', encoding='utf-8', newline='').write(text)
    print('written: PG-zperf6.json' if cur != text else 'written: (nothing)')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))

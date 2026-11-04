#!/usr/bin/env python3
"""Page group PG-ztail (Release 1 round 5, train R1g): the cold-load tail of the Mapbox map pages on the phone (blocking time at 4x CPU).

    python tools/t0/r1g/gen_ztail.py            write tools/t0/patches-next/PG-ztail.json
    python tools/t0/r1g/gen_ztail.py --check    exit 1 when the written file differs from what this script generates

Every anchor is checked against release/R1f/dist (the finished text of the page groups that sort before PG-ztail); an anchor that does not match exactly once stops the script.
What the patches do and why is in docs/accept/ZTAIL-NOTES.md; the decisions are in docs/decisions/R1G-PROVISIONAL-DECISIONS-2026-11-01.md.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
OUT = os.path.join(REPO, 'tools', 't0', 'patches-next', 'PG-ztail.json')
DIST = os.path.join(REPO, 'release', 'R1f', 'dist')

P = []


def add(pid, target, find, repl, note):
    P.append({'id': pid, 'target': target, 'find': find, 'repl': repl, 'expect': 1, 'note': note})


# ---------------------------------------------------------------------------------------------------------------------------------------------- ground-remembers.html: the fog
A_GR = "  map.once('style.load', () => { if (window.GTBG_PRECOMPILE) window.GTBG_PRECOMPILE(map); });   // PERF2: link the dark style's programs before its tiles arrive"
B_GR = """  map.once('style.load', () => {
    // ZTAIL: the dark style's fog costs the first frames after the style load 25 to 40 ms at 4x CPU (Mapbox builds 16,000 star quads for the atmosphere even though the style's star-intensity is 0, and
    // its fog and globe programs). At zoom 13 and no pitch the fog is not visible (pixel-identical). It is off for the first frames and back, with the style's own values, as soon as the visitor first
    // moves the map (a tilt or a zoom out shows it) or, when the visitor does not, in a quiet moment 4.5 s after the first idle (not while the map moves).
    try {
      const fog = map.getFog();
      if (fog) {
        map.setFog(null);
        let back = false, timer = 0;
        const on = () => {
          if (back) return;
          if (map.isMoving()) { map.once('moveend', () => setTimeout(on, 250)); return; }
          back = true; clearTimeout(timer); map.off('movestart', onMove);
          try { map.setFog(fog); } catch (e) {}
        };
        const onMove = () => { if (back) return; back = true; clearTimeout(timer); map.off('movestart', onMove); try { map.setFog(fog); } catch (e) {} };
        map.on('movestart', onMove);
        map.once('idle', () => { timer = setTimeout(() => { (window.requestIdleCallback || setTimeout)(on, { timeout: 2000 }); }, 4500); });
      }
    } catch (e) {}
    if (window.GTBG_PRECOMPILE) window.GTBG_PRECOMPILE(map);   // PERF2: link the dark style's programs before its tiles arrive
  });"""
add('ZTAIL-ground-fog-later', 'ground-remembers.html', A_GR, B_GR,
    'the style fog is switched off at style.load and on again at the first movement, or 4.5 s after the first idle when the visitor has not moved the map (public API only: getFog, setFog, idle, movestart, isMoving, moveend)')


def check_anchors():
    bad = []
    for p in P:
        t = open(os.path.join(DIST, p['target']), encoding='utf-8', newline='').read()
        n = t.count(p['find'])
        if n != p['expect']:
            bad.append('%s: %d hits in %s' % (p['id'], n, p['target']))
    return bad


def wanted():
    return json.dumps({'group': 'PG-ztail', 'description': 'Release 1 round 5: cold-load tail of /ground-remembers on the phone (the dark style fog is off for the first frames); sorts after PG-zperf5', 'train': 'R1g', 'patches': P},
                      indent=1, ensure_ascii=False) + '\n'


def main(argv):
    bad = check_anchors()
    if bad:
        print('ANCHOR FAILURES:\n  ' + '\n  '.join(bad))
        return 2
    text = wanted()
    cur = open(OUT, encoding='utf-8', newline='').read() if os.path.isfile(OUT) else None
    if cur != text:
        if '--check' in argv:
            print('differs: PG-ztail.json')
            return 1
        open(OUT, 'w', encoding='utf-8', newline='').write(text)
        print('written: PG-ztail.json')
    else:
        print('(nothing: already in step)')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))

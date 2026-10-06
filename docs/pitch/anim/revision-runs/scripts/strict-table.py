"""strict-table.py <results-dir> - prints the figures of PITCH.md section 10.2 from the real-time and deterministic runs of the strict-glide experiment.
For each configuration tag (q-wr-default, q-wr-strict, ...) and each scene and speed:
  solid-over-solid frames, faint-over-solid % of frames (v3-play, popups on, real time), frames with a unit with no LIVE tile of its own (v3-play), % of frames with a unit with no tile of any kind (v3b-gaps, 60 Hz virtual, popups off),
  solid sudden jumps per second and largest one-frame step (v4-motion, popups off), separate tiles (v3-play mean tiles), frames per second reached.
Reads v3-play-1440x900-<tag>.json, v4-motion-1440x900-cpu1-<tag>.json and x-v3b-gaps-<tag>.json from the results directory."""
import json, os, sys
R = sys.argv[1] if len(sys.argv) > 1 else '.'
if not R.endswith('/'): R += '/'
def L(n):
    p = R + n
    return json.load(open(p, encoding='utf8')) if os.path.exists(p) else None
tags = sys.argv[2:] or ['q-wr-default', 'q-wr-strict', 'q-wr-strict-d0', 'q-wr-strict-d12', 'q-fm-strict-instr', 'q-mk-default', 'q-mk-strict', 'q-mk-strict-d12']
for tag in tags:
    P = L(f'v3-play-1440x900-{tag}.json') or L(f'v3-play-1440x900-x-{tag}.json'); M = L(f'v4-motion-1440x900-cpu1-{tag}.json') or L(f'v4-motion-1440x900-cpu1-x-{tag}.json'); G = L(f'x-v3b-gaps-{tag}.json')
    if not (P or M or G): print(tag, '(no data)'); continue
    print('=====', tag)
    rows = {}
    for r in (P or {}).get('runs', []):
        k = (r['scene'], r['speed']); n = r['frames']
        rows.setdefault(k, {}).update(ss=r['framesSolidOverlap'], sd=100.0 * r['framesSolidDimOverlap'] / n, miss=100.0 * r['framesMissingUnits'] / n, tiles=r['tilesMean'], fps=r['fps'], sdDepth=r['maxDepthPx'], ssDepth=r['maxDepthSolidSolidPx'], n=n)
    for r in (M or {}).get('runs', []):
        k = (r['scene'], r['speed']); m = r['motion']
        rows.setdefault(k, {}).update(sudden=m['suddenSolidPerSec'], steps8=m['stepsOver8PerSec'], maxStep=m['maxStepPx'], fps2=r['raf']['fps'], over20=r['raf']['over20'])
    for r in (G or {}).get('runs', []):
        k = (r['scene'], r['speed'])
        rows.setdefault(k, {}).update(gap=r['shareFramesWithGap'], gapUnits=r['maxUnitsAtOnce'])
    for k in sorted(rows):
        o = rows[k]
        print('%-12s %dx | solid-solid %s fr | faint-over-solid %s%% | no live tile %s%% | no tile at all %s%% (max %s units) | sudden solid %s/s | steps>=8px %s/s | largest step %s px | tiles %s | fps %s / %s'
              % (k[0], k[1], o.get('ss'), '%.1f' % o['sd'] if 'sd' in o else None, '%.1f' % o['miss'] if 'miss' in o else None, o.get('gap'), o.get('gapUnits'), o.get('sudden'), o.get('steps8'), o.get('maxStep'), o.get('tiles'), o.get('fps'), o.get('fps2')))

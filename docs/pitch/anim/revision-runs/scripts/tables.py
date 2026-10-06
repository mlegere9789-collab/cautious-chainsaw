"""tables.py - recomputes, from the committed pitch-run result files, every playback figure that PITCH.md quotes for the three looks.
Run from the repository root:  python docs/pitch/anim/revision-runs/scripts/tables.py
Reads docs/pitch/anim/pitch-runs/results/*.json (not changed).  Prints per look: range and mean over the six real-time runs (The Angle, Rose Woods, Cemetery Hill at 1x and 4x)."""
import json, os, statistics as st
R = 'docs/pitch/anim/pitch-runs/results/'
def L(n):
    p = R + n
    return json.load(open(p, encoding='utf8')) if os.path.exists(p) else None
def pct(a, b): return 100.0 * a / b
def rng(xs, f='{:.1f}'): return f.format(min(xs)) + ' to ' + f.format(max(xs)) + '  (mean ' + f.format(st.mean(xs)) + ')'
for look in ['war-room', 'field-manual', 'map-1863']:
    P = L(f'v3-play-1440x900-{look}.json'); M = L(f'v4-motion-1440x900-cpu1-{look}.json'); G = L(f'v3b-gaps-{look}.json')
    print('=====', look)
    runs = P['runs']
    n = [r['frames'] for r in runs]
    print(' frames per run', n, 'total', sum(n), ' fps', [r['fps'] for r in runs])
    print(' solid-solid frames', [r['framesSolidOverlap'] for r in runs], 'total', sum(r['framesSolidOverlap'] for r in runs), 'of', sum(n))
    print(' faint-over-solid % of frames', rng([pct(r['framesSolidDimOverlap'], r['frames']) for r in runs]), ' overall', '{:.1f}'.format(pct(sum(r['framesSolidDimOverlap'] for r in runs), sum(n))))
    print(' frames with a unit with NO LIVE tile (framesMissingUnits) %', rng([pct(r['framesMissingUnits'], r['frames']) for r in runs]), ' overall', '{:.1f}'.format(pct(sum(r['framesMissingUnits'] for r in runs), sum(n))), ' max units at once', max(r['maxMissing'] for r in runs))
    print(' frames with a unit shown only by a faint tile (framesUnitDimOnly, verifier rule) %', rng([pct(r['framesUnitDimOnly'], r['frames']) for r in runs]), ' overall', '{:.1f}'.format(pct(sum(r['framesUnitDimOnly'] for r in runs), sum(n))))
    print(' interface over chips % of tile-frames', rng([100 * r['chipsUnderDomSum'] / max(1, r['chipsMean'] * r['frames']) for r in runs]))
    print(' tiles mean at The Angle', [r['tilesMean'] for r in runs if r['scene'] == 'the-angle'])
    mr = M['runs']
    print(' v4-motion fps', [r['raf']['fps'] for r in mr], ' over20', [r['raf']['over20'] for r in mr])
    print(' v4-motion sudden SOLID per sec', [r['motion']['suddenSolidPerSec'] for r in mr], ' -> range', min(r['motion']['suddenSolidPerSec'] for r in mr), 'to', max(r['motion']['suddenSolidPerSec'] for r in mr))
    print(' v4-motion largest step px', [r['motion']['maxStepPx'] for r in mr], ' -> range', min(r['motion']['maxStepPx'] for r in mr), 'to', max(r['motion']['maxStepPx'] for r in mr))
    print(' v4-motion  blinks/s', [r['motion']['blinksPerSec'] for r in mr])
    gr = G['runs']
    print(' v3b-gaps (60 Hz virtual, popups off) % frames with a gap', [r['shareFramesWithGap'] for r in gr], ' mean', '{:.2f}'.format(st.mean(r['shareFramesWithGap'] for r in gr)), ' max units at once', max(r['maxUnitsAtOnce'] for r in gr))

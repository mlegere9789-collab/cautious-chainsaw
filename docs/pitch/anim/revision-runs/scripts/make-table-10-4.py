"""make-table-10-4.py <quiet-results-dir> - prints the markdown table of PITCH.md section 10.4 (motion personalities against each look's default) from the result files.
Run from the repository root.  Defaults come from the committed pitch runs (docs/pitch/anim/pitch-runs/results, 4x, The Angle and Rose Woods) except War Room's, which is the quiet re-run of this revision."""
import json, os, sys
PITCH = 'docs/pitch/anim/pitch-runs/results/'
Q = sys.argv[1]
def load(d, n):
    p = os.path.join(d, n)
    return json.load(open(p, encoding='utf8')) if os.path.exists(p) else None
def cell(P, M, G):
    out = {}
    for scene in ('the-angle', 'rose-woods'):
        o = {}
        r = [x for x in P['runs'] if x['scene'] == scene and x['speed'] == 4][0]; n = r['frames']
        o.update(faint=100.0 * r['framesSolidDimOverlap'] / n, nolive=100.0 * r['framesMissingUnits'] / n, tiles=r['tilesMean'])
        r = [x for x in M['runs'] if x['scene'] == scene and x['speed'] == 4][0]; o.update(hops=r['motion']['suddenSolidPerSec'], step=r['motion']['maxStepPx'])
        r = [x for x in G['runs'] if x['scene'] == scene and x['speed'] == 4][0]; o.update(gap=r['shareFramesWithGap'])
        out[scene] = o
    return out
def f(o, k, fmt='%.1f'):
    return fmt % o['the-angle'][k] + ' / ' + fmt % o['rose-woods'][k]
ROWS = [
    ('War Room, engine default (quiet re-run)', Q, 'q-wr-default'), ('**War Room "Show"**', Q, 'q-pers-wr'),
    ('Field Manual, engine default (pitch run)', PITCH, 'field-manual'), ('**Field Manual "Instrument"**', Q, 'q-pers-fm'),
    ('1863 Map, engine default (pitch run)', PITCH, 'map-1863'), ('**1863 Map "Document"**', Q, 'q-pers-m63'),
]
print('| Look and setting | Faint tile over a solid one (% of frames) | A unit with no live tile of its own (%) | A unit with no tile of any kind (%) | Solid sudden jumps per second | Largest step (px) | Separate tiles |')
print('|---|---|---|---|---|---|---|')
for label, d, tag in ROWS:
    if d == PITCH:
        P = load(d, f'v3-play-1440x900-{tag}.json'); M = load(d, f'v4-motion-1440x900-cpu1-{tag}.json'); G = load(d, f'v3b-gaps-{tag}.json')
    else:
        P = load(d, f'v3-play-1440x900-{tag}.json'); M = load(d, f'v4-motion-1440x900-cpu1-{tag}.json'); G = load(d, f'x-v3b-gaps-{tag}.json')
    if not (P and M and G): continue
    o = cell(P, M, G)
    print('| %s | %s | %s | %s | %s | %s | %s |' % (label, f(o, 'faint'), f(o, 'nolive'), f(o, 'gap'), f(o, 'hops', '%.2f'), f(o, 'step', '%.0f'), f(o, 'tiles', '%.0f')))

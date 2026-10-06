"""make-table-10-2.py <quiet-results-dir> [<second-results-dir>] - prints the markdown table of PITCH.md section 10.2 from the result files.
Run from the repository root.  Rows from the committed pitch runs (docs/pitch/anim/pitch-runs/results) and from the quiet re-runs of this revision.
Each cell is "The Angle / Rose Woods" at 4x, 20 s real time with popups on (faint, no-live-tile, hops, step, tiles) or 60 Hz virtual time with popups off (no tile of any kind)."""
import json, os, sys
PITCH = 'docs/pitch/anim/pitch-runs/results/'
Q = [a for a in sys.argv[1:]]
def load(dirs, names):
    for d in dirs:
        for n in names:
            p = os.path.join(d, n)
            if os.path.exists(p): return json.load(open(p, encoding='utf8'))
    return None
def cell(tag, pitch=False, speed=4):
    dirs = [PITCH] if pitch else Q
    pre = 'x-' if pitch else ''
    P = load(dirs, [f'v3-play-1440x900-{pre}{tag}.json'])
    M = load(dirs, [f'v4-motion-1440x900-cpu1-{pre}{tag}.json'])
    G = load(dirs, [f'x-v3b-gaps-{tag}.json'])
    out = {}
    for scene in ('the-angle', 'rose-woods'):
        o = {}
        if P:
            r = [x for x in P['runs'] if x['scene'] == scene and x['speed'] == speed]
            if r:
                r = r[0]; n = r['frames']
                o.update(faint=100.0 * r['framesSolidDimOverlap'] / n, nolive=100.0 * r['framesMissingUnits'] / n, tiles=r['tilesMean'], ss=r['framesSolidOverlap'])
        if M:
            r = [x for x in M['runs'] if x['scene'] == scene and x['speed'] == speed]
            if r: o.update(hops=r[0]['motion']['suddenSolidPerSec'], step=r[0]['motion']['maxStepPx'])
        if G:
            r = [x for x in G['runs'] if x['scene'] == scene and x['speed'] == speed]
            if r: o.update(gap=r[0]['shareFramesWithGap'])
        out[scene] = o
    return out
def f(o, k, fmt='%.1f'):
    a = o['the-angle'].get(k); b = o['rose-woods'].get(k)
    g = lambda v: ('n/m' if v is None else fmt % v)
    return g(a) + ' / ' + g(b)
ROWS = [
    ('**Default** (War Room plate, glide and fades, nudge up to 48 px), quiet re-run', 'q-wr-default', False),
    ('Never nudge (glide and fades), pitch run', 'wr-dmax0', True),
    ('Nudge budget 12 px (glide and fades), pitch run', 'wr-dmax12', True),
    ('Snap (no gliding, no fades), pitch run', 'wr-snap', True),
    ('**Strict glide**, nudge up to 48 px (new)', 'q-wr-strict', False),
    ('**Strict glide, nudge up to 12 px** (new)', 'q-wr-strict-d12', False),
    ('**Strict glide, never nudge** (new)', 'q-wr-strict-d0', False),
    ('Field Manual "Instrument" with strict glide (new)', 'q-fm-strict-instr', False),
    ('Strict glide with pushing (new)', 'q-wr-strictpush', False),
    ('**12 px marks**, default motion (new sketch)', 'q-mk-default', False),
    ('**12 px marks, strict glide**, nudge up to 48 px (new sketch)', 'q-mk-strict', False),
    ('12 px marks, strict glide, nudge up to 12 px (new sketch)', 'q-mk-strict-d12', False),
    ('12 px marks, strict glide with pushing (new sketch)', 'q-mk-strictpush', False),
]
print('| Setting | Faint tile over a solid one (% of frames) | A unit with no live tile of its own (% of frames) | A unit with no tile of any kind (% of frames) | Solid sudden jumps per second | Largest one-frame step (px) | Separate tiles |')
print('|---|---|---|---|---|---|---|')
for label, tag, pitch in ROWS:
    o = cell(tag, pitch)
    if not o['the-angle'] and not o['rose-woods']: continue
    print('| %s | %s | %s | %s | %s | %s | %s |' % (label, f(o, 'faint'), f(o, 'nolive'), f(o, 'gap'), f(o, 'hops', '%.2f'), f(o, 'step', '%.0f'), f(o, 'tiles', '%.0f')))

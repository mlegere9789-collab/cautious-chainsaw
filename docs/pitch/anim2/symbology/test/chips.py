"""Chip placement checks on the shipped atlas PNGs (run by test/symbology.test.mjs, or: python test/chips.py [dist]).
The status chip is a corner badge drawn at the base sprite's `ne` anchor.  For every base sprite of every language at 3x:
  1. clearance: the chip BODY (radius chip.size/2) stays away from the glyph ink box (`ink`) and from the echelon-mark strip (`strip`): the chip never covers an arm glyph or an echelon mark;
  2. coverage: the share of the symbol's solid pixels (alpha >= 200: plate, rings, marks, glyph) that lie under the chip's OUTER circle (body + its rings) stays below tokens chip.maxCoverage (+0.04 for the
     pixel-versus-analytic difference), and above zero (a badge that touches nothing would float);
  3. the chip does not leave the tile footprint the index advertises (`boxFull`).
Prints a JSON summary; exit code 1 on any violation."""
import json, sys, os, math
import numpy as np
from PIL import Image

dist = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', 'dist')
tok = json.load(open(os.path.join(os.path.dirname(__file__), '..', 'tokens', 'symbology.tokens.json'), encoding='utf8'))
CHIP = tok['chip']['size']['$value']; RING = tok['ring']['light']['$value'] + tok['ring']['dark']['$value']
BODY = CHIP / 2; OUTER = CHIP / 2 + RING
MAXCOV = tok['chip']['maxCoverage']['$value']; TOL = 0.04     # the build places the chip by analytic coverage of the silhouette; the pixels also count rings, marks and glyph ink, hence the tolerance
out = {'chip': {'body': BODY, 'outer': OUTER}, 'rows': [], 'violations': []}
def dist_rect(x, y, r):
    return math.hypot(max(r[0] - x, 0, x - r[2]), max(r[1] - y, 0, y - r[3]))
for name in ['nato', 'shield', 'minimal']:
    idx = json.load(open(os.path.join(dist, 'atlas', name + '.json'), encoding='utf8')); sc = 3
    im = np.array(Image.open(os.path.join(dist, 'atlas', idx['files'][str(sc)])).convert('RGBA')); a = im[:, :, 3]
    for key, s in idx['sprites'].items():
        if s['group'] != 'base': continue
        x0, y0, w, h = s['x'] * sc, s['y'] * sc, s['w'] * sc, s['h'] * sc
        solid = a[y0:y0 + h, x0:x0 + w] >= 200
        nx, ny = s['anchors']['ne']
        yy, xx = np.mgrid[0:h, 0:w]
        under = ((xx + 0.5) / sc - nx) ** 2 + ((yy + 0.5) / sc - ny) ** 2 <= OUTER ** 2
        cov = float((solid & under).sum()) / max(1, int(solid.sum()))
        row = {'atlas': name, 'key': key, 'shape': s['shape'], 'coverage': round(cov, 4)}
        if s.get('ink'):
            d = dist_rect(nx, ny, s['ink']) - BODY; row['inkClearance'] = round(d, 2)
            if d < 0.5: out['violations'].append(f'{key}: the chip body is {d:.2f} u from the glyph ink box (needs >= 0.5)')
        if s.get('strip'):
            d = dist_rect(nx, ny, s['strip']) - BODY; row['stripClearance'] = round(d, 2)
            if d < 0.5: out['violations'].append(f'{key}: the chip body is {d:.2f} u from the echelon marks (needs >= 0.5)')
        lim = MAXCOV + TOL
        if cov > lim: out['violations'].append(f'{key}: the chip covers {cov:.1%} of the symbol (bound {lim:.0%})')
        if cov == 0: out['violations'].append(f'{key}: the chip touches nothing: it would float off the symbol')
        if s.get('boxFull'):
            bf = s['boxFull']
            if not (nx - OUTER >= bf[0] - 0.01 and nx + OUTER <= bf[2] + 0.01 and ny - OUTER >= bf[1] - 0.01 and ny + OUTER <= bf[3] + 0.01): out['violations'].append(f'{key}: the chip leaves boxFull {bf}')
        out['rows'].append(row)
worst = {}
for r in out['rows']:
    w = worst.setdefault((r['atlas'], r['shape']), {'max': 0, 'min': 1, 'n': 0}); w['max'] = max(w['max'], r['coverage']); w['min'] = min(w['min'], r['coverage']); w['n'] += 1
out['coverageByShape'] = {f'{k[0]}/{k[1]}': {'n': v['n'], 'min': round(v['min'], 3), 'max': round(v['max'], 3)} for k, v in sorted(worst.items())}
print(json.dumps({k: v for k, v in out.items() if k != 'rows'}, indent=1))
sys.exit(1 if out['violations'] else 0)

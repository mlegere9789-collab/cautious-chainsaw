"""linestate_crops.py [sheet ...] : per-claim line-state reading crops for the Bachelder 1876 sheets.

For every claim in docs/battle-theatre/history/positions/troopmap_jul{1,2,3}_b1876.jsonl writes
docs/battle-theatre/terrain/troopmaps/crops_state/<claim_id>.png: a plain true-colour crop of the scan
(tmp/troopmaps/full_<sheet>.png) around the claim's geo.scan_px (line-symbol anchor, green ring) and
geo.label_px (label centre, magenta ring), at SCALE x, with a 100 px tick grid in scan px, the claim id and
printed text in a header, and on the right the four legend swatches of the same sheet and ink colour
(First Position / Intermediate / Evening / All Day, top to bottom) cut from the sheet's own legend at the
same scale. The window is sized to contain both points plus a margin (MIN_W x MIN_H at least, MAX_W x MAX_H at most).
Also writes crops_state/_manifest.json (window origin, size, scale per claim: scan = origin + img/scale).
Optional: --montage N out_prefix  writes reading montages of N crops each (for the by-eye pass) into tmp/troopmaps/ls_mont/.
"""
import sys, os, json, cv2, numpy as np
os.environ['OPENCV_IO_MAX_IMAGE_PIXELS'] = str(2 ** 40)
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
POS = os.path.join(ROOT, 'docs', 'battle-theatre', 'history', 'positions')
OUT = os.path.join(ROOT, 'docs', 'battle-theatre', 'terrain', 'troopmaps', 'crops_state')
FILES = {'a': 'troopmap_jul1_b1876.jsonl', 'b': 'troopmap_jul2_b1876.jsonl', 'c': 'troopmap_jul3_b1876.jsonl'}
# legend swatch blocks (scan px, x0,y0,x1,y1) per sheet and side, read by eye from legend crops (LINE-STATES-NOTES.md)
LEGEND = {
    ('a', 'US'): (2475, 10245, 2615, 10380), ('a', 'CS'): (2685, 10243, 2825, 10372),
    ('b', 'US'): (2510, 10405, 2655, 10540), ('b', 'CS'): (2695, 10422, 2840, 10555),
    ('c', 'US'): (2475, 10520, 2625, 10655), ('c', 'CS'): (2672, 10515, 2815, 10645),
}
SCALE = 3.0
MIN_W, MIN_H, MAX_W, MAX_H, MARGIN = 300, 220, 560, 420, 90


def load(sheet):
    return cv2.imread(os.path.join(ROOT, 'tmp', 'troopmaps', f'full_{sheet}.png'))


def side_of(unit_id):
    return 'CS' if unit_id.startswith('cs') else 'US'


def window(sx, sy, lx, ly):
    x0, x1 = min(sx, lx) - MARGIN, max(sx, lx) + MARGIN
    y0, y1 = min(sy, ly) - MARGIN, max(sy, ly) + MARGIN
    w, h = max(MIN_W, x1 - x0), max(MIN_H, y1 - y0)
    w, h = min(w, MAX_W), min(h, MAX_H)
    cx, cy = (sx + lx) // 2, (sy + ly) // 2
    return cx - w // 2, cy - h // 2, w, h


def render(im, sheet, claim, scale=1.0):
    """Stored crop (lossless, native resolution): the same scan window as the reading tile, with the anchor and label rings,
    the tick grid and the legend swatches; the reading zoom (5x / 3.5x / 2.33x) is a deterministic bicubic upscale of these pixels
    and is recorded in the manifest as reading_scale."""
    H, W = im.shape[:2]
    sx, sy = claim['geo']['scan_px']; lx, ly = claim['geo']['label_px']
    anchored = claim['geo']['basis'] == 'line_symbol_centroid'
    if anchored and side_of(claim['unit_id']) == 'US': w, h, rs = 180, 126, 5.0
    elif anchored: w, h, rs = 200, 140, 3.5
    else: w, h, rs = 300, 210, 700 / 300
    if abs(sx - lx) + 60 <= w and abs(sy - ly) + 60 <= h: cx, cy = (sx + lx) // 2, (sy + ly) // 2
    elif anchored: cx, cy = sx, sy
    else: cx, cy = lx, ly
    x0 = max(0, min(cx - w // 2, W - w)); y0 = max(0, min(cy - h // 2, H - h))
    c = im[y0:y0 + h, x0:x0 + w].copy()
    if scale != 1.0: c = cv2.resize(c, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
    def P(x, y): return int((x - x0) * scale), int((y - y0) * scale)
    if 0 <= sx - x0 < w and 0 <= sy - y0 < h: cv2.circle(c, P(sx, sy), max(3, int(9 * scale)), (0, 200, 0), 1)
    if 0 <= lx - x0 < w and 0 <= ly - y0 < h: cv2.circle(c, P(lx, ly), max(2, int(6 * scale)), (255, 0, 255), 1)
    for gx in range((x0 // 100 + 1) * 100, x0 + w, 100):
        X = int((gx - x0) * scale); cv2.line(c, (X, 0), (X, 6), (0, 0, 0), 1); cv2.putText(c, str(gx), (X + 2, 12), cv2.FONT_HERSHEY_SIMPLEX, 0.3, (0, 0, 0), 1)
    for gy in range((y0 // 100 + 1) * 100, y0 + h, 100):
        Y = int((gy - y0) * scale); cv2.line(c, (0, Y), (6, Y), (0, 0, 0), 1); cv2.putText(c, str(gy), (8, Y + 4), cv2.FONT_HERSHEY_SIMPLEX, 0.3, (0, 0, 0), 1)
    # legend panel (same sheet and ink colour, native resolution)
    side = side_of(claim['unit_id']); lx0, ly0, lx1, ly1 = LEGEND[(sheet, side)]
    leg = im[ly0:ly1, lx0:lx1]
    if scale != 1.0: leg = cv2.resize(leg, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
    ph = max(leg.shape[0], c.shape[0])
    body = np.full((ph, c.shape[1] + leg.shape[1] + 6, 3), 255, np.uint8)
    body[:c.shape[0], :c.shape[1]] = c; body[:leg.shape[0], c.shape[1] + 6:] = leg
    head = np.full((16, body.shape[1], 3), 255, np.uint8)
    txt = f"{claim['claim_id']} {side} {claim['source']['quote'][:50]} | legend 1st/int/eve/all"
    cv2.putText(head, txt, (2, 12), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (0, 0, 0), 1)
    return np.vstack([head, body]), dict(origin=[x0, y0], size=[w, h], stored_scale=scale, reading_scale=rs, scan_px=[sx, sy], label_px=[lx, ly], legend_box=[lx0, ly0, lx1, ly1])


TILE_W, TILE_H, TILE_SCALE = 330, 235, 2.0


def tile(im, sheet, claim, scale=None, w=None, h=None, header=None):
    """Reading tile (output 700 x 490 px): anchored claims 200 x 140 scan px at 3.5x centred on the symbol anchor; label-only claims 300 x 210 at 2.33x centred on the label (the bar is within about a label length). scale/w/h override (calibration pass 2 used 330 x 235 at 2x)."""
    H, W = im.shape[:2]
    sx, sy = claim['geo']['scan_px']; lx, ly = claim['geo']['label_px']
    anchored = claim['geo']['basis'] == 'line_symbol_centroid'
    if w is None:
        if anchored and side_of(claim['unit_id']) == 'US': w, h, scale = 180, 126, 5.0   # dark ink hides the wedge below 5x (5x checks on TMJ1-020/037/038/048)
        elif anchored: w, h, scale = 200, 140, 3.5
        else: w, h, scale = 300, 210, 700 / 300
    if abs(sx - lx) + 60 <= w and abs(sy - ly) + 60 <= h: cx, cy = (sx + lx) // 2, (sy + ly) // 2
    elif anchored: cx, cy = sx, sy
    else: cx, cy = lx, ly
    x0 = max(0, min(cx - w // 2, W - w)); y0 = max(0, min(cy - h // 2, H - h))
    c = cv2.resize(im[y0:y0 + h, x0:x0 + w], None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
    def P(x, y): return int((x - x0) * scale), int((y - y0) * scale)
    if 0 <= sx - x0 < w and 0 <= sy - y0 < h: cv2.circle(c, P(sx, sy), int(9 * scale), (0, 200, 0), 2)
    if 0 <= lx - x0 < w and 0 <= ly - y0 < h: cv2.circle(c, P(lx, ly), int(6 * scale), (255, 0, 255), 2)
    head = np.full((22, c.shape[1], 3), 255, np.uint8)
    cv2.putText(head, header if header is not None else f"{claim['claim_id']} {side_of(claim['unit_id'])} {claim['source']['quote'][:40]}", (4, 16), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)
    return np.vstack([head, c]), dict(origin=[x0, y0], size=[w, h], scale=scale)


def legend_strip(im, sheet, scale=TILE_SCALE):
    parts = []
    for side in ('US', 'CS'):
        lx0, ly0, lx1, ly1 = LEGEND[(sheet, side)]
        parts.append(cv2.resize(im[ly0:ly1, lx0:lx1], None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC))
    wmax = max(p.shape[1] for p in parts)
    parts = [np.hstack([p, np.full((p.shape[0], wmax - p.shape[1], 3), 255, np.uint8)]) for p in parts]
    strip = np.vstack([parts[0], np.full((12, wmax, 3), 255, np.uint8), parts[1]])
    for i, t in enumerate(['1st', 'int', 'eve', 'all'] * 2):
        y = int((i % 4) * parts[0].shape[0] / 4.2) + 18 + (0 if i < 4 else parts[0].shape[0] + 12)
        cv2.putText(strip, t, (2, y), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 0), 1)
    return strip


def montage(im, sheet, claims, out, cols=3, headers=None):
    tiles = [tile(im, sheet, c, header=(headers[i] if headers else None))[0] for i, c in enumerate(claims)]
    th, tw = max(t.shape[0] for t in tiles), max(t.shape[1] for t in tiles)
    rows = (len(tiles) + cols - 1) // cols
    canvas = np.full((rows * th, cols * tw, 3), 255, np.uint8)
    for i, t in enumerate(tiles):
        r, cc = divmod(i, cols); canvas[r * th:r * th + t.shape[0], cc * tw:cc * tw + t.shape[1]] = t
    strip = legend_strip(im, sheet)
    side = np.full((canvas.shape[0], strip.shape[1] + 6, 3), 255, np.uint8); side[:strip.shape[0], 6:] = strip[:canvas.shape[0]]
    cv2.imwrite(out, np.hstack([canvas, side]), [cv2.IMWRITE_JPEG_QUALITY, 80])


def main():
    if '--montage' in sys.argv:          # --montage sheet [--todo] -> tmp/troopmaps/ls_mont/<sheet>_{US,X}_<nn>.jpg + index json; US anchored 4 per image (2 cols, 5x), others 6 per image (3 cols)
        sheet = sys.argv[sys.argv.index('--montage') + 1]
        md = os.path.join(ROOT, 'tmp', 'troopmaps', 'ls_mont'); os.makedirs(md, exist_ok=True)
        im = load(sheet); rows = [json.loads(l) for l in open(os.path.join(POS, FILES[sheet]), encoding='utf-8')]
        if '--todo' in sys.argv:
            rp = os.path.join(ROOT, 'docs', 'battle-theatre', 'terrain', 'troopmaps', 'line_state_readings.json')
            done = json.load(open(rp, encoding='utf-8')) if os.path.exists(rp) else {}
            rows = [r for r in rows if r['claim_id'] not in done]
        idx = {}
        for tag, group, n, cols in (('US', [r for r in rows if r['geo']['basis'] == 'line_symbol_centroid' and side_of(r['unit_id']) == 'US'], 4, 2),
                                    ('X', [r for r in rows if not (r['geo']['basis'] == 'line_symbol_centroid' and side_of(r['unit_id']) == 'US')], 6, 3)):
            for k in range(0, len(group), n):
                name = f'{sheet}_{tag}_{k // n:02d}.jpg'; montage(im, sheet, group[k:k + n], os.path.join(md, name), cols=cols); idx[name] = [r['claim_id'] for r in group[k:k + n]]
        json.dump(idx, open(os.path.join(md, f'{sheet}_index.json'), 'w'), indent=1); print(sheet, len(idx), 'montages', {k: len(v) for k, v in idx.items()}); return
    if '--cal' in sys.argv:              # --cal : 30 calibration claims (10 per sheet, seeded), blind 2x tiles in shuffled order with numbers only
        import random
        rnd = random.Random(20261030); md = os.path.join(ROOT, 'tmp', 'troopmaps', 'ls_mont'); os.makedirs(md, exist_ok=True)
        picks = []
        for sheet in FILES:
            rows = [json.loads(l) for l in open(os.path.join(POS, FILES[sheet]), encoding='utf-8')]
            picks += [(sheet, r) for r in rnd.sample(rows, 10)]
        order = list(range(30)); rnd.shuffle(order)
        json.dump({'pass1_order': [p[1]['claim_id'] for p in picks], 'pass2_blind_numbers': {str(i + 1): picks[j][1]['claim_id'] for i, j in enumerate(order)}}, open(os.path.join(md, 'cal_index.json'), 'w'), indent=1)
        ims = {s: load(s) for s in FILES}
        for k in range(0, 30, 6):
            group = [picks[j] for j in order[k:k + 6]]
            # tiles may come from different sheets: render each tile with its own sheet, legend strip of the first sheet is NOT shown (blind, legend read separately)
            tiles = [tile(ims[s], s, c, scale=2.0, w=330, h=235, header=f'#{k + i + 1} {side_of(c["unit_id"])}')[0] for i, (s, c) in enumerate(group)]
            th, tw = max(t.shape[0] for t in tiles), max(t.shape[1] for t in tiles)
            canvas = np.full((2 * th, 3 * tw, 3), 255, np.uint8)
            for i, t in enumerate(tiles):
                r, cc = divmod(i, 3); canvas[r * th:r * th + t.shape[0], cc * tw:cc * tw + t.shape[1]] = t
            cv2.imwrite(os.path.join(md, f'cal2_{k // 6}.jpg'), canvas, [cv2.IMWRITE_JPEG_QUALITY, 80])
        print('calibration set written'); return
    sheets = [a for a in sys.argv[1:] if a in FILES] or list(FILES)
    os.makedirs(OUT, exist_ok=True)
    mpath = os.path.join(OUT, '_manifest.json')
    man = json.load(open(mpath)) if os.path.exists(mpath) else {}
    for sheet in sheets:
        im = load(sheet)
        # legend reference crops, 5x, per side: _legend_<sheet>_<side>.png
        for side in ('US', 'CS'):
            lx0, ly0, lx1, ly1 = LEGEND[(sheet, side)]
            leg = cv2.resize(im[ly0 - 10:ly1 + 10, lx0 - 10:lx1 + 10], None, fx=5, fy=5, interpolation=cv2.INTER_CUBIC)
            cv2.imwrite(os.path.join(OUT, f'_legend_{sheet}_{side}.png'), leg, [cv2.IMWRITE_PNG_COMPRESSION, 9])
            man[f'_legend_{sheet}_{side}'] = dict(sheet=sheet, side=side, box=[lx0 - 10, ly0 - 10, lx1 + 10, ly1 + 10], stored_scale=5.0)
        rows = [json.loads(l) for l in open(os.path.join(POS, FILES[sheet]), encoding='utf-8')]
        for r in rows:
            img, meta = render(im, sheet, r)
            cv2.imwrite(os.path.join(OUT, r['claim_id'] + '.png'), img, [cv2.IMWRITE_PNG_COMPRESSION, 9])
            meta['sheet'] = sheet; man[r['claim_id']] = meta
        print(sheet, len(rows), 'crops')
        json.dump(man, open(mpath, 'w'), indent=0)


if __name__ == '__main__':
    main()

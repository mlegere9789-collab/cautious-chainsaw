"""an.py - the pixel analysis of one captured scene.  Inputs are the files written by capture.mjs (real Chrome, real data): the canvas of the map in four renderings
   B   everything                      BT  everything except text (no fillText, no strokeText)         BH  everything except the text FILL (halos kept)      BG  ground only (no marks, no text)
plus the records of every fillText with its full transform, the list of the DOM's text nodes, the page screenshot with its text made transparent, and the DOM-only alpha picture.
Nothing here reads an engine source: contrast is measured against pixels, sizes from the transforms of the real draw calls."""
import json
import math
import os
import numpy as np
from PIL import Image
import colour as C

HERE = os.path.dirname(os.path.abspath(__file__))
CAP = os.path.join(HERE, 'cap')


def img(path):
    return np.asarray(Image.open(path).convert('RGBA')).astype(np.float64) if os.path.exists(path) else None


def pct(a, q):
    return float(np.percentile(a, q)) if len(a) else None


def font_px(font):
    import re
    m = re.search(r'([\d.]+)px', font or '')
    return float(m.group(1)) if m else None


def font_weight(font):
    f = (font or '').lower()
    if 'bold' in f:
        return 700
    import re
    m = re.match(r'\s*(?:italic\s+|oblique\s+)?(\d{3})\b', f)
    return int(m.group(1)) if m else 400


def key_of(r):
    if any(v is None for v in r['m']):
        return (r['s'], None, None)
    return (r['s'], round(r['m'][4] * 2) / 2, round(r['m'][5] * 2) / 2)


def glyph_bbox(r):
    """device-pixel bounding box of a text record (actual glyph extent, squeezed by maxWidth if the draw call squeezed it)"""
    f = 1.0
    if r.get('mw') is not None and r['w'] > 0 and r['mw'] < r['w']:
        f = r['mw'] / r['w']
    lx0 = r['x'] - r['bl_'] * f
    lx1 = r['x'] + r['br_'] * f
    ly0 = r['y'] - r['ba']
    ly1 = r['y'] + r['bd']
    m = r['m']
    pts = [(m[0] * px + m[2] * py + m[4], m[1] * px + m[3] * py + m[5]) for px, py in ((lx0, ly0), (lx1, ly0), (lx1, ly1), (lx0, ly1))]
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return min(xs), min(ys), max(xs), max(ys), f


def crop(a, x0, y0, x1, y1):
    h, w = a.shape[:2]
    x0 = max(0, int(math.floor(x0)))
    y0 = max(0, int(math.floor(y0)))
    x1 = min(w, int(math.ceil(x1)))
    y1 = min(h, int(math.ceil(y1)))
    if x1 <= x0 or y1 <= y0:
        return None
    return a[y0:y1, x0:x1, :3]


def contrast_stats(F, alpha, P):
    """F: rgb of the text, alpha 0..1, P: (n,3) backdrop pixels -> dict of the contrast ratios of the text composited on each pixel"""
    Fp = alpha * np.asarray(F, dtype=np.float64) + (1 - alpha) * P
    r = C.ratio(C.lum(Fp), C.lum(P))
    return {'med': float(np.median(r)), 'p10': float(np.percentile(r, 10)), 'min': float(r.min()), 'n': int(len(r))}


def rect_mask_cover(mask, x0, y0, x1, y1):
    sub = crop(mask[..., None] if mask.ndim == 2 else mask, x0, y0, x1, y1)
    if sub is None:
        return 0.0
    return float(sub.mean())


def load_scene(cfg, vp, scene, dpr=2):
    base = os.path.join(CAP, cfg, f'{vp}-dpr{dpr}')
    full = os.path.join(base, 'full', scene)
    if not os.path.exists(full + '.json'):
        return None
    S = {'rec': json.load(open(full + '.json'))}
    S['B'] = img(full + '.B.png')
    S['B0'] = img(full + '.B0.png')
    S['page'] = img(full + '.page.png')
    S['pagent'] = img(full + '.notext.png')
    S['dom'] = img(full + '.dom.png')
    S['BT'] = img(os.path.join(base, 'notext', scene + '.B.png'))
    S['BG'] = img(os.path.join(base, 'notext', scene + '.BG.png'))
    S['BH'] = img(os.path.join(base, 'nofill', scene + '.B.png'))
    S['dpr'] = dpr
    return S


def canvas_text(S):
    """every text drawn on the map canvas: size, colour, halo, and the contrast against the backdrop (raw = text-free picture, eff = with the halo the skin draws).
    Records with a non-finite transform are draw calls that put nothing on the canvas and are skipped.  The same string drawn twice at almost the same place (an engraved shadow copy under the
    visible text) counts once: the copy drawn last is what the viewer reads."""
    rec = S['rec']
    dpr = S['dpr']
    recs = rec['textRecs']
    furniture = {key_of(r) for r in rec['textRecs0'] if r['kind'] == 'fill' and None not in r['m']}
    strokes = {}
    for r in recs:
        if r['kind'] == 'stroke' and None not in r['m']:
            strokes.setdefault(key_of(r), []).append(r)
    domA = S['dom'][..., 3] > 16 if S['dom'] is not None else None
    H, W = S['B'].shape[:2]
    kept = []
    for r in recs:
        if r['kind'] != 'fill' or None in r['m'] or r.get('bl_') is None or r.get('br_') is None or not r['s'].strip():
            continue
        x0, y0, x1, y1, sq = glyph_bbox(r)
        c = ((x0 + x1) / 2, (y0 + y1) / 2)
        for n, (rr, cc) in enumerate(kept):
            if rr['s'] == r['s'] and abs(cc[0] - c[0]) < 2.5 * dpr and abs(cc[1] - c[1]) < 2.5 * dpr:
                kept[n] = (r, c)
                break
        else:
            kept.append((r, c))
    items = []
    for r, _ in kept:
        col = C.parse_css(r['fill'])
        if col is None:
            continue
        a = col[3] * r['ga']
        if a < 0.05:
            continue
        x0, y0, x1, y1, sq = glyph_bbox(r)
        if x1 <= 0 or y1 <= 0 or x0 >= W or y0 >= H:
            continue
        # hidden behind the page's own chrome (top bar, dock, cards)?  then it is not what the viewer sees
        if domA is not None:
            sub = domA[max(0, int(y0)):min(H, int(y1) + 1), max(0, int(x0)):min(W, int(x1) + 1)]
            if sub.size and sub.mean() > 0.3:
                continue
        size = (font_px(r['font']) or 0) * math.hypot(r['m'][2], r['m'][3]) / dpr
        weight = font_weight(r['font'])
        halo = [s for s in strokes.get(key_of(r), []) if s['s'] == r['s']]
        pad = 1 + (max([s['lw'] for s in halo]) / 2 * math.hypot(r['m'][0], r['m'][1]) if halo else 0)
        win = (x0 - pad, y0 - pad, x1 + pad, y1 + pad)
        item = {'s': r['s'][:40], 'kind': 'place' if key_of(r) in furniture else 'unit', 'size': round(size, 2), 'weight': weight, 'fontpx': font_px(r['font']), 'scale': round(math.hypot(r['m'][2], r['m'][3]) / dpr, 3), 'squeeze': round(sq, 3), 'bbox': [round(v / dpr, 1) for v in (x0, y0, x1, y1)],
                'fill': r['fill'], 'alpha': round(a, 3), 'halo': bool(halo), 'family': (r['font'] or '').split('px', 1)[-1].strip()[:40]}
        if S['BT'] is not None:
            bt = crop(S['BT'], *win)
            if bt is not None:
                P = bt.reshape(-1, 3)
                item['raw'] = contrast_stats(col[:3], a, P)
                eff = item['raw']
                if halo and S['BH'] is not None:
                    bh = crop(S['BH'], *win)
                    d = np.abs(bh - bt).max(axis=2).reshape(-1) > 3
                    if d.sum() >= 4:
                        eff = contrast_stats(col[:3], a, bh.reshape(-1, 3)[d])
                item['eff'] = eff
        items.append(item)
    return items


def dom_text(S):
    rec = S['rec']
    dpr = S['dpr']
    out = []
    if S['pagent'] is None:
        return out
    for it in rec.get('dom', []):
        col = C.parse_css(it['color'])
        if col is None or col[3] * it['op'] < 0.05:
            continue
        a = col[3] * it['op']
        px = []
        for (l, t, r_, b) in it['rects']:
            sub = crop(S['pagent'], l * dpr, t * dpr, r_ * dpr, b * dpr)
            if sub is not None:
                px.append(sub.reshape(-1, 3))
        if not px:
            continue
        P = np.concatenate(px)
        size = it['fs'] * it.get('scale', 1)
        out.append({'s': it['text'][:40], 'size': round(size, 2), 'fs': it['fs'], 'scale': it['scale'], 'weight': int(it['fw']) if str(it['fw']).isdigit() else (700 if it['fw'] == 'bold' else 400), 'family': it['fam'], 'cls': it['cls'], 'op': it['op'], 'alpha': round(a, 3), 'color': it['color'], 'raw': contrast_stats(col[:3], a, P), 'rect': [round(v, 1) for v in it['rects'][0]], 'svg': it['svg']})
    return out


def is_large(size, weight):
    return size >= 24 or (size >= 18.66 and weight >= 700)


def summarize_text(items, key='eff'):
    """per-population numbers: n, smallest size, contrast median / worst item / share at or above 4.5:1 (3:1 for large text) and 3:1 (items judged by their median ratio), and by their worst decile"""
    if not items:
        return {'n': 0}
    size = np.array([i['size'] for i in items])
    out = {'n': len(items), 'size_min': float(size.min()), 'size_p5': pct(size, 5), 'size_med': float(np.median(size)), 'n_lt9': int((size < 9).sum()), 'n_lt10': int((size < 10).sum()), 'n_lt11': int((size < 11).sum()), 'n_lt12': int((size < 12).sum())}
    its = [i for i in items if (key in i) or ('raw' in i)]
    if not its:
        return out
    g = lambda i: i.get(key) or i.get('raw')
    med = np.array([g(i)['med'] for i in its])
    p10 = np.array([g(i)['p10'] for i in its])
    need = np.array([3.0 if is_large(i['size'], i['weight']) else 4.5 for i in its])
    out.update({'n_cr': len(its), 'cr_med': float(np.median(med)), 'cr_min': float(med.min()), 'cr_p10_items': pct(med, 10), 'share_ge_need': float((med >= need).mean()), 'share_ge_3': float((med >= 3).mean()), 'share_p10_ge_3': float((p10 >= 3).mean()), 'cr_worst_decile_med': float(np.median(p10))})
    return out


def dilate(m, r):
    """binary dilation by a (2r+1)^2 square, numpy only"""
    out = m.copy()
    for _ in range(r):
        o = out.copy()
        o[1:, :] |= out[:-1, :]
        o[:-1, :] |= out[1:, :]
        t = o.copy()
        t[:, 1:] |= o[:, :-1]
        t[:, :-1] |= o[:, 1:]
        out = t
    return out


def erode(m, r):
    return ~dilate(~m, r)


def label_count(mask, return_centroids=False):
    """number of 8-connected components of a boolean mask (run-length + union-find); optionally their centroids (x, y)"""
    H, W = mask.shape
    d = np.diff(np.pad(mask.astype(np.int8), ((0, 0), (1, 1))), axis=1)
    rows_s, cols_s = np.nonzero(d == 1)
    rows_e, cols_e = np.nonzero(d == -1)           # same order: row-major
    n = len(rows_s)
    if n == 0:
        return (0, []) if return_centroids else 0
    parent = np.arange(n)

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    row_start = np.searchsorted(rows_s, np.arange(H + 1))
    for y in range(1, H):
        a0, a1 = row_start[y - 1], row_start[y]
        b0, b1 = row_start[y], row_start[y + 1]
        if a0 == a1 or b0 == b1:
            continue
        sa, ea = cols_s[a0:a1], cols_e[a0:a1]      # runs [s, e)
        sb, eb = cols_s[b0:b1], cols_e[b0:b1]
        j = 0
        for i in range(a1 - a0):
            while j < b1 - b0 and eb[j] < sa[i]:
                j += 1
            k = j
            while k < b1 - b0 and sb[k] <= ea[i]:
                ra, rb = find(a0 + i), find(b0 + k)
                if ra != rb:
                    parent[rb] = ra
                k += 1
    roots = np.array([find(i) for i in range(n)])
    uniq = np.unique(roots)
    if not return_centroids:
        return int(len(uniq))
    cents = []
    cx = (cols_s + cols_e) / 2.0
    w = (cols_e - cols_s).astype(np.float64)
    for u in uniq:
        sel = roots == u
        ww = w[sel]
        cents.append((float((cx[sel] * ww).sum() / ww.sum()), float((rows_s[sel] * ww).sum() / ww.sum())))
    return int(len(uniq)), cents


def density(S, win=100, stride=10, close=2):
    """objects = connected blobs of ink (the picture with the skin differs from the same picture without it by >= 16/255 in some channel, closed by `close` CSS px so that the letters of a word are one blob), counted by
    centroid in the busiest `win` x `win` CSS-px window (busiest = most blobs) among windows that the page's own chrome covers by less than 5 %."""
    dpr = S['dpr']
    B, BG = S['B'], S['B0']      # same page run: the skin's own ink only (the ground, place names and fx are in both pictures)
    if B is None or BG is None:
        return None
    H, W = B.shape[:2]
    ink = (np.abs(B[..., :3] - BG[..., :3]).max(axis=2) >= 16)
    h, w = H // dpr, W // dpr
    ink = ink[:h * dpr, :w * dpr].reshape(h, dpr, w, dpr).max(axis=(1, 3))
    ink_c = dilate(ink, close)
    n, cents = label_count(ink_c, True)
    chrome = (S['dom'][..., 3] > 16)[:h * dpr, :w * dpr].reshape(h, dpr, w, dpr).max(axis=(1, 3)) if S['dom'] is not None else np.zeros((h, w), bool)
    rec = S['rec']
    marks = [(t['x'] + rec['view']['dx'], t['y'] + rec['view']['dy']) for t in rec['tiles'] if t['opacity'] >= 0.5]
    texts = [((b[0] + b[2]) / 2, (b[1] + b[3]) / 2, i['kind']) for i in S['_ctext'] for b in [i['bbox']]]
    cs = np.array(cents) if cents else np.zeros((0, 2))
    # integral image of chrome for the 5 % rule
    ii = np.pad(chrome.astype(np.int64).cumsum(0).cumsum(1), ((1, 0), (1, 0)))
    best = None
    for y in range(0, h - win + 1, stride):
        for x in range(0, w - win + 1, stride):
            cov = (ii[y + win, x + win] - ii[y, x + win] - ii[y + win, x] + ii[y, x]) / (win * win)
            if cov > 0.05:
                continue
            nb = int(((cs[:, 0] >= x) & (cs[:, 0] < x + win) & (cs[:, 1] >= y) & (cs[:, 1] < y + win)).sum()) if len(cs) else 0
            if best is None or nb > best['objects']:
                best = {'x': x, 'y': y, 'objects': nb}
    if best is None:
        return {'objects_total': n, 'window': None}
    x, y = best['x'], best['y']
    inwin = lambda px, py: x <= px < x + win and y <= py < y + win
    best['marks'] = sum(1 for (px, py) in marks if inwin(px, py))
    best['text_unit'] = sum(1 for (px, py, k) in texts if k == 'unit' and inwin(px, py))
    best['text_place'] = sum(1 for (px, py, k) in texts if k == 'place' and inwin(px, py))
    best['text_all'] = best['text_unit'] + best['text_place']
    best['ink_cover'] = float(ink[y:y + win, x:x + win].mean())
    best['objects_total'] = n
    best['chrome_cover_total'] = float(chrome.mean())
    # the busiest window by MARKS as well (the second reading of "busiest")
    bm = None
    for yy in range(0, h - win + 1, stride):
        for xx in range(0, w - win + 1, stride):
            cov = (ii[yy + win, xx + win] - ii[yy, xx + win] - ii[yy + win, xx] + ii[yy, xx]) / (win * win)
            if cov > 0.05:
                continue
            nm = sum(1 for (px, py) in marks if xx <= px < xx + win and yy <= py < yy + win)
            if bm is None or nm > bm['marks']:
                bm = {'x': xx, 'y': yy, 'marks': nm}
    if bm:
        bm['objects'] = int(((cs[:, 0] >= bm['x']) & (cs[:, 0] < bm['x'] + win) & (cs[:, 1] >= bm['y']) & (cs[:, 1] < bm['y'] + win)).sum()) if len(cs) else 0
        bm['text_all'] = sum(1 for (px, py, k) in texts if bm['x'] <= px < bm['x'] + win and bm['y'] <= py < bm['y'] + win)
        best['by_marks'] = bm
    return best


def geometry(S, rec=None):
    """independent re-computation of overlaps from the frame's tile list: footprints (x +- w*scale/2), labels the skin draws separately, pin boxes covered by another footprint"""
    rec = rec or S['rec']
    T = [t for t in rec['tiles'] if t['opacity'] >= 0.5]
    R = [(t['key'], t['x'] - t['w'] * t['scale'] / 2, t['y'] - t['h'] * t['scale'] / 2, t['x'] + t['w'] * t['scale'] / 2, t['y'] + t['h'] * t['scale'] / 2) for t in T]
    v = rec['view']
    inview = [r for r in R if r[3] + v['dx'] > 0 and r[1] + v['dx'] < v['w'] and r[4] + v['dy'] > 0 and r[2] + v['dy'] < v['h']]
    n = 0
    minGap = 1e9
    for i in range(len(inview)):
        a = inview[i]
        for j in range(i + 1, len(inview)):
            b = inview[j]
            g = max(a[1] - b[3], b[1] - a[3], a[2] - b[4], b[2] - a[4])
            if g < 0:
                n += 1
            minGap = min(minGap, g)
    lab_x1 = lambda L: L['x1'] if L.get('x1') is not None else L['x0'] + L['w']
    lab_y1 = lambda L: L['y1'] if L.get('y1') is not None else L['y0'] + L['h']
    labels = [(t['key'], t['label']['x0'], t['label']['y0'], lab_x1(t['label']), lab_y1(t['label'])) for t in T if t.get('label') and (t['label'].get('opacity') or 0) >= 0.5 and (t['label'].get('x1') is not None or t['label'].get('w') is not None)]
    lab_over = 0
    for (k, x0, y0, x1, y1) in labels:
        for r in R:
            if r[0] == k:
                continue
            if x0 < r[3] and r[1] < x1 and y0 < r[4] and r[2] < y1:
                lab_over += 1
        for (k2, a0, b0, a1, b1) in labels:
            if k2 > k and x0 < a1 and a0 < x1 and y0 < b1 and b0 < y1:
                lab_over += 1
    ph = rec['spec']['pinHalf'] or 0
    pins_cov = 0
    for t in T:
        if not t['displaced']:
            continue
        px = t['px'] if t.get('px') is not None else t['ax']
        py = t['py'] if t.get('py') is not None else t['ay']
        for r in R:
            if r[0] == t['key']:
                continue
            if px - ph < r[3] and r[1] < px + ph and py - ph < r[4] and r[2] < py + ph:
                pins_cov += 1
                break
    return {'tiles_solid': len(T), 'tiles_in_view': len(inview), 'footprint_overlaps': n, 'min_gap_px': None if minGap > 1e8 else round(minGap, 2), 'labels': len(labels), 'label_overlaps': lab_over, 'pins_covered': pins_cov,
            'engine_overlaps': rec.get('overlaps'), 'unrepresented': rec.get('unrepresented'), 'on_field': rec.get('onField')}


def marks_contrast(S, sides):
    """each isolated mark (ink pass) against what is around its side colour.  K = the cluster of the mark's solid ink (>= 64/255 from the ground-only picture) that is nearest to the colour that
    identifies the mark's side (pooled over the configuration, see side_colours); it counts as found if it is within dE00 12 of that side colour.  Two ratios (WCAG contrast of K against each pixel of a ring):
      vs_ground    ring = ground-only pixels 2 to 4 device px outside ALL of the mark's ink (the bare map the mark sits on)
      vs_surround  ring = pixels of the text-free picture 1 to 3 device px outside the region painted in K (what actually touches the colour: the mark's own outline, halo, plate, lettering)"""
    rec = S['rec']
    if 'ink' not in rec or S['BT'] is None or S['BG'] is None or not sides:
        return None
    BT, BG = S['BT'][..., :3], S['BG'][..., :3]
    H, W = BT.shape[:2]
    side_lab = {k: C.rgb2lab(np.array(v['rgb'], dtype=np.float64)) for k, v in sides.items()}
    rows = []
    for t in rec['ink']['perTile']:
        tops = t.get('topNT') or t['top']          # solid ink outside the lettering's boxes: the mark's own colours
        if not t['bbox'] or not tops or t['side'] not in side_lab:
            continue
        cands = [np.array(c['rgb'], dtype=np.float64) for c in tops]
        des = [float(C.de2000(C.rgb2lab(c), side_lab[t['side']])) for c in cands]
        j = int(np.argmin(des))
        found = des[j] <= 12
        row = {'key': t['key'], 'kind': t['kind'], 'side': t['side'], 'found': bool(found), 'dE_side': des[j], 'K': cands[j].tolist()}
        x0, y0, x1, y1 = t['bbox']
        pad = 8
        X0, Y0, X1, Y1 = max(0, x0 - pad), max(0, y0 - pad), min(W, x1 + pad), min(H, y1 + pad)
        if found and X1 - X0 >= 4 and Y1 - Y0 >= 4:
            a, g = BT[Y0:Y1, X0:X1], BG[Y0:Y1, X0:X1]
            ink = np.abs(a - g).max(axis=2) >= 12
            Kreg = np.abs(a - cands[j]).max(axis=2) <= 14
            Kreg &= ink
            if ink.sum() >= 6 and Kreg.sum() >= 6:
                ring_g = dilate(ink, 4) & ~dilate(ink, 1)
                ring_s = dilate(Kreg, 3) & ~dilate(Kreg, 0) & ~Kreg
                if ring_g.sum() >= 8 and ring_s.sum() >= 8:
                    Lk = float(C.lum(cands[j]))
                    rg = C.ratio(Lk, C.lum(g[ring_g]))
                    rs = C.ratio(Lk, C.lum(a[ring_s]))
                    row.update({'vs_ground_med': float(np.median(rg)), 'vs_ground_p10': float(np.percentile(rg, 10)), 'vs_surround_med': float(np.median(rs)), 'vs_surround_p10': float(np.percentile(rs, 10)), 'K_px': int(Kreg.sum()),
                                'ground_rgb': np.median(g[ring_g], axis=0).tolist()})
        rows.append(row)
    return rows


def side_colours(rec_list):
    """from the isolated marks of one configuration (all ink scenes pooled): the colour that most separates the two sides' marks (share of a side's solid ink minus the other side's share)"""
    bins = {'union': {}, 'confederate': {}}
    tot = {'union': 0, 'confederate': 0}
    for rec in rec_list:
        if 'ink' not in rec:
            continue
        for t in rec['ink']['perTile']:
            if t['kind'] != 'leaf' or t['side'] not in bins:
                continue
            for c in (t.get('topNT') or t['top']):
                key = tuple(int(v) // 16 for v in c['rgb'])
                e = bins[t['side']].setdefault(key, [0, np.zeros(3)])
                e[0] += c['n']
                e[1] += np.array(c['rgb']) * c['n']
                tot[t['side']] += c['n']
    out = {}
    if not (tot['union'] and tot['confederate']):
        return None
    other = {'union': 'confederate', 'confederate': 'union'}
    for s in bins:
        best = None
        for k, (n, sm) in bins[s].items():
            sc = n / tot[s] - bins[other[s]].get(k, [0])[0] / tot[other[s]]
            if best is None or sc > best[0]:
                best = (sc, k, (sm / n))
        out[s] = {'rgb': [round(float(v)) for v in best[2]], 'score': round(float(best[0]), 3)}
    return out


def ink_outside(rec_main, rec_lab):
    """tiles whose ink (any channel >= 12/255, tile drawn alone) lies beyond the box the layout reserved for it (footprint, plus the label rectangle where the skin has one) by more than 4 CSS px"""
    if 'ink' not in rec_main:
        return None
    src = rec_lab or rec_main
    tl = {t['key']: t for t in src['tiles']}
    v = rec_main['view']
    tot = out = big = reach = 0
    ex = []
    for t in rec_main['ink']['perTile']:
        if not t['bbox']:
            continue
        tot += 1
        f = list(t['foot'])
        L = (tl.get(t['key']) or {}).get('label')
        if L and (L.get('x1') is not None or L.get('w') is not None) and (L.get('opacity') or 0) >= 0.5:
            x1 = L['x1'] if L.get('x1') is not None else L['x0'] + L['w']
            y1 = L['y1'] if L.get('y1') is not None else L['y0'] + L['h']
            f = [min(f[0], (L['x0'] + v['dx']) * 2), min(f[1], (L['y0'] + v['dy']) * 2), max(f[2], (x1 + v['dx']) * 2), max(f[3], (y1 + v['dy']) * 2)]
        b = t['bbox']
        ov = max(f[0] - b[0], f[1] - b[1], b[2] - f[2], b[3] - f[3]) / 2.0
        if ov > 4:
            out += 1
            if len(ex) < 3:
                ex.append([t['key'], round(ov, 1)])
        if ov > 20:
            big += 1
        if t.get('reach'):
            reach += 1
    return {'tiles': tot, 'beyond_4px': out, 'beyond_20px': big, 'reach_10px': reach, 'examples': ex}

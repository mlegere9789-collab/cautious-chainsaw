"""run_an.py - runs the analysis of an.py over every captured scene of every configuration and writes results/an-<config>.json.
   python run_an.py [config ...]"""
import json
import os
import sys
import numpy as np
import an
import colour as C

CONFIGS = ['d1-day', 'd1-night', 'd4-paper', 'd4-aerial']
DESK = ['s1a', 's1b', 's1c', 's2', 's3', 's4', 's6', 's7', 's8']
PHONE = ['s5', 's1cp', 's2p']
INK_SCENES = ['s1a', 's1b', 's1c', 's2', 's3', 's4']
OUT = os.path.join(an.HERE, 'results')
os.makedirs(OUT, exist_ok=True)


def summ_marks(rows):
    if not rows:
        return None
    n_all = len(rows)
    found = [r for r in rows if r['found']]
    meas = [r for r in found if 'vs_ground_med' in r]
    out = {'n_marks': n_all, 'n_side_colour_found': len(found), 'share_side_colour_found': len(found) / n_all, 'n_measured': len(meas)}
    if meas:
        g = np.array([r['vs_ground_med'] for r in meas])
        s_ = np.array([r['vs_surround_med'] for r in meas])
        out.update({'ground_med': float(np.median(g)), 'ground_p10_marks': float(np.percentile(g, 10)), 'ground_share_ge3': float((g >= 3).mean()), 'ground_share_ge45': float((g >= 4.5).mean()), 'ground_min': float(g.min()),
                    'surround_med': float(np.median(s_)), 'surround_p10_marks': float(np.percentile(s_, 10)), 'surround_share_ge3': float((s_ >= 3).mean()), 'surround_share_ge45': float((s_ >= 4.5).mean()), 'surround_min': float(s_.min())})
    ed = [r for r in rows if 'edge_med' in r]
    if ed:
        e = np.array([r['edge_med'] for r in ed])
        out.update({'n_edge': len(ed), 'edge_med': float(np.median(e)), 'edge_min': float(e.min()), 'edge_share_ge3': float((e >= 3).mean()), 'edge_share_ge45': float((e >= 4.5).mean())})
    # the most favourable reading per mark: the better of the cloth against the bare ground and the silhouette against the bare ground
    best = []
    for r in rows:
        v = [r[k] for k in ('vs_ground_med', 'edge_med') if k in r]
        if v:
            best.append(max(v))
    if best:
        b = np.array(best)
        out.update({'best_n': len(b), 'best_med': float(np.median(b)), 'best_min': float(b.min()), 'best_share_ge3': float((b >= 3).mean()), 'best_share_ge45': float((b >= 4.5).mean()), 'best_n_lt45': int((b < 4.5).sum())})
    return out


def mark_colours(S):
    """the colour of every isolated mark: the most populous solid-ink cluster whose chroma is at least 15 (the side's cloth, not the white or black of a glyph), else the most populous"""
    out = []
    for t in S['rec'].get('ink', {}).get('perTile', []):
        if t['side'] not in ('union', 'confederate') or not t['top']:
            continue
        best = None
        for c in t['top']:
            lab = C.rgb2lab(np.array(c['rgb'], dtype=np.float64))
            ch = float(np.hypot(lab[1], lab[2]))
            if ch >= 15 and (best is None or c['n'] > best[0]):
                best = (c['n'], c['rgb'])
        if best is None:
            best = (t['top'][0]['n'], t['top'][0]['rgb'])
        out.append((t['side'], best[1], t['kind']))
    return out


def cvd_pairs(cols):
    u = np.array([c[1] for c in cols if c[0] == 'union'], dtype=np.float64)
    k = np.array([c[1] for c in cols if c[0] == 'confederate'], dtype=np.float64)
    if not len(u) or not len(k):
        return None
    res = {'n_union': int(len(u)), 'n_confederate': int(len(k))}
    for kind in C.CVD:
        U, K = C.simulate(u, kind), C.simulate(k, kind)
        LU, LK = C.rgb2lab(U), C.rgb2lab(K)
        d = C.de2000(LU[:, None, :], LK[None, :, :]).reshape(-1)
        res[kind] = {'min': float(d.min()), 'p5': float(np.percentile(d, 5)), 'median': float(np.median(d)), 'share_ge20': float((d >= 20).mean()), 'share_ge10': float((d >= 10).mean())}
    return res


def cvd_block(sides, mark_rows):
    if not sides or not mark_rows:
        return None
    u = np.array(sides['union']['rgb'], dtype=np.float64)
    c = np.array(sides['confederate']['rgb'], dtype=np.float64)
    out = {'side_rgb': {'union': u.tolist(), 'confederate': c.tolist()}, 'side_score': {'union': sides['union']['score'], 'confederate': sides['confederate']['score']}, 'sims': {}}
    for kind in C.CVD:
        su, sc = C.simulate(u, kind), C.simulate(c, kind)
        d = float(C.de2000(C.rgb2lab(su), C.rgb2lab(sc)))
        row = {'side_vs_side': d}
        for side, s in (('union', su), ('confederate', sc)):
            gs = [r['ground_rgb'] for r in mark_rows if r['side'] == side and 'ground_rgb' in r]
            if not gs:
                continue
            G = C.simulate(np.array(gs, dtype=np.float64), kind)
            de = C.de2000(np.broadcast_to(C.rgb2lab(s), (len(G), 3)), C.rgb2lab(G))
            row['vs_ground_' + side] = {'med': float(np.median(de)), 'p10': float(np.percentile(de, 10))}
        out['sims'][kind] = row
    return out


def run(cfg):
    res = {'config': cfg, 'desktop': {}, 'phone': {}, 'desktop_dpr1': {}}
    pooled_marks = []
    pooled_cols = []
    recs = []
    for sc in INK_SCENES:
        f = os.path.join(an.CAP, cfg, 'desktop-dpr2', 'full', sc + '.json')
        if os.path.exists(f):
            recs.append(json.load(open(f)))
    sides = an.side_colours(recs)
    del recs
    for vp, scenes in (('desktop', DESK), ('phone', PHONE)):
        for sc in scenes:
            S = an.load_scene(cfg, vp, sc, 2)
            if S is None:
                print(cfg, vp, sc, 'MISSING')
                continue
            ct = an.canvas_text(S)
            S['_ctext'] = ct
            dt = an.dom_text(S)
            row = {'tick': S['rec']['tick'], 'zoom': S['rec']['zoom'], 'view': S['rec']['view'], 'dpr': S['rec']['dpr'], 'n_tiles': len(S['rec']['tiles']),
                   'canvas_unit': an.summarize_text([i for i in ct if i['kind'] == 'unit']), 'canvas_place': an.summarize_text([i for i in ct if i['kind'] == 'place']), 'dom': an.summarize_text(dt, 'raw'),
                   'density': an.density(S), 'geometry': an.geometry(S), 'items_unit': [i for i in ct if i['kind'] == 'unit'], 'items_place': [i for i in ct if i['kind'] == 'place'], 'items_dom': dt}
            if 'ink' in S['rec']:
                row['ink'] = S['rec']['ink']['summary']
                mc = an.marks_contrast(S, sides)
                row['marks'] = summ_marks(mc)
                if vp == 'desktop' and sc in INK_SCENES:
                    pooled_marks.extend(mc or [])
                    pooled_cols.extend(mark_colours(S))
            # sanity: the text-free picture must equal the full picture outside the text boxes (alignment of the passes)
            if S['BT'] is not None and S['B'] is not None:
                d = np.abs(S['B'][..., :3] - S['BT'][..., :3]).max(axis=2) > 8
                if S['domc'] is not None:
                    d &= ~(S['domc'] > 16)         # what the page's own chrome covers is not part of the check
                m = np.zeros_like(d)
                for i in ct:
                    x0, y0, x1, y1 = [int(v * 2) for v in i['bbox']]
                    pad = 16
                    m[max(0, y0 - pad):y1 + pad, max(0, x0 - pad):x1 + pad] = True
                row['align'] = {'diff_px_outside_text': int((d & ~m).sum()), 'diff_px_inside_text': int((d & m).sum())}
            res[vp][sc] = row
            print(cfg, vp, sc, 'unit', row['canvas_unit'].get('n'), 'place', row['canvas_place'].get('n'), 'dom', row['dom'].get('n'), 'align', row.get('align'))
    res['sides'] = sides
    res['cvd'] = cvd_block(sides, pooled_marks)
    res['cvd_pairs'] = cvd_pairs(pooled_cols)
    res['marks_pooled'] = summ_marks(pooled_marks)
    # DPR 1 (text sizes at 1x)
    for sc in DESK:
        S = an.load_scene(cfg, 'desktop', sc, 1)
        if S is None:
            continue
        ct = an.canvas_text(S)
        dt = an.dom_text(S)
        res['desktop_dpr1'][sc] = {'canvas_unit': an.summarize_text([i for i in ct if i['kind'] == 'unit'], 'raw'), 'canvas_place': an.summarize_text([i for i in ct if i['kind'] == 'place'], 'raw'), 'dom': an.summarize_text(dt, 'raw'), 'items_unit': [i for i in ct if i['kind'] == 'unit'],
                                   'items_dom': [{k: v for k, v in i.items() if k in ('s', 'size', 'family', 'cls', 'fs', 'scale')} for i in dt]}
    json.dump(res, open(os.path.join(OUT, f'an-{cfg}.json'), 'w'))
    return res


if __name__ == '__main__':
    for cfg in (sys.argv[1:] or CONFIGS):
        run(cfg)

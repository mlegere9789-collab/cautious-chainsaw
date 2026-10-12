"""popcover.py - from cap-pop/<cfg>/<vp>/*.json and the DOM-only pictures: which marks does the interface cover?
For each scene: marks inside the viewport at drawn opacity >= 0.5 (core ink = 64/255 from the ground), the share of each mark's core ink that lies under something the page paints
(alpha of the DOM-only picture: opaque >= 128/255, veiled 16..127), the group of elements doing it (sampled), the popup ink the canvas draws over cores, marks dissolved or cut by the frame.
   python popcover.py > results/popcover.json"""
import base64
import json
import os
import sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
POP = os.path.join(HERE, 'cap-pop')
FRAME_IDS = {'#topbar', '#dock'}
POPUP_IDS = {'#pop-rail', '#narration', '#panel', '#metrics', '#popups', '#pop-live'}
RECTS = json.load(open(os.path.join(HERE, 'results', 'canvasrect.json')))
NEUTRAL = {'#app', '#stage', '#map'}


def bits(b):
    raw = np.frombuffer(base64.b64decode(b['coreBits']), dtype=np.uint8)
    w, h = b['bw'], b['bh']
    flat = np.unpackbits(raw, bitorder='little')[: w * h]
    return flat.reshape(h, w).astype(bool)


def group(d):
    if d.startswith('popup:'):
        return 'popup'
    if d in NEUTRAL:
        return None
    if d in FRAME_IDS:
        return 'frame'
    if d in POPUP_IDS:
        return 'popup'
    return 'other:' + d


def scene(cfg, vp, f):
    j = json.load(open(os.path.join(POP, cfg, vp, f)))
    dom = np.asarray(Image.open(os.path.join(POP, cfg, vp, f.replace('.json', '.dom.png'))).convert('RGBA'))[..., 3]
    cr = j.get('canvasRect') or RECTS[f'{cfg}-{vp}']
    ox, oy = int(round(cr['left'] * j['dpr'])), int(round(cr['top'] * j['dpr']))
    rows = []
    for b in j['bodies']:
        if not b.get('bbox') or 'coreBits' not in b:
            continue
        m = bits(b)
        x0, y0, x1, y1 = b['bbox']
        a = dom[y0 + oy:y1 + oy, x0 + ox:x1 + ox]
        if a.shape != m.shape:
            continue
        core = int(m.sum())
        if not core:
            continue
        opq = int((m & (a >= 128)).sum())
        vei = int((m & (a >= 16) & (a < 128)).sum())
        grp = {}
        for d, n in (b.get('over') or {}).items():
            g = group(d)
            if g:
                grp[g] = grp.get(g, 0) + n
        rows.append({'name': b['name'], 'kind': b['kind'], 'n': b.get('n'), 'core': core, 'opq': opq, 'veil': vei, 'opq_share': opq / core, 'groups': grp, 'fk': b.get('fk', 1), 'fx_over_core': b.get('fxOverCore', 0), 'fx_in_box': b.get('fxInBox', 0)})
    res = {'scene': j['id'], 'what': j['what'], 'tiles': len(rows), 'inview': j['inview'], 'corePairs': len(j['corePairs']), 'softPairs': j['softPairs'], 'popups': [p['d'] for p in j['popups']], 'engine_overlaps': j['overlaps'], 'unrepresented': j['unrepresented'],
           'lost': j.get('lost'), 'vis0': j.get('vis0'), 'vis1': j.get('vis1'), 'dissolved': j.get('dissolved', []), 'partlyCut': j.get('partlyCut', []), 'jsError': j['info'].get('jsError')}
    def pick(cond):
        return [r for r in rows if cond(r)]
    # a mark is covered by what class of surface: decided by the sampled elements over its core; unknown group (sampling missed) counts as 'frame or popup' by position later
    cov = pick(lambda r: r['opq'] > 0)
    res['covered_any'] = len(cov)
    res['covered_gt25'] = len(pick(lambda r: r['opq_share'] > 0.25))
    res['covered_gt50'] = len(pick(lambda r: r['opq_share'] > 0.5))
    res['covered_all'] = len(pick(lambda r: r['opq_share'] >= 0.98))
    res['covered_by_popup'] = len(pick(lambda r: r['opq'] > 0 and r['groups'].get('popup', 0) > 0))
    res['covered_by_frame'] = len(pick(lambda r: r['opq'] > 0 and r['groups'].get('frame', 0) > 0 and not r['groups'].get('popup', 0)))
    res['covered_unattributed'] = len(pick(lambda r: r['opq'] > 0 and not r['groups']))
    res['covered_other'] = len(pick(lambda r: r['opq'] > 0 and any(k.startswith('other') for k in r['groups'])))
    res['veiled_only'] = len(pick(lambda r: r['opq'] == 0 and r['veil'] > 0))
    res['fx_over_core_tiles'] = len(pick(lambda r: r['fx_over_core'] > 0))
    res['fx_over_core_px'] = sum(r['fx_over_core'] for r in rows)
    res['fx_cross_box_tiles'] = len(pick(lambda r: r['fx_in_box'] > 0))
    res['detail'] = [{k: r[k] for k in ('name', 'kind', 'n', 'core', 'opq', 'veil', 'opq_share', 'groups', 'fx_over_core')} for r in sorted(cov, key=lambda r: -r['opq_share'])[:25]]
    res['fx_detail'] = [{k: r[k] for k in ('name', 'kind', 'fx_over_core', 'fx_in_box')} for r in sorted(pick(lambda r: r['fx_over_core'] > 0), key=lambda r: -r['fx_over_core'])[:10]]
    return res


if __name__ == '__main__':
    out = {}
    for cfg in sorted(os.listdir(POP)):
        for vp in sorted(os.listdir(os.path.join(POP, cfg))):
            for f in sorted(os.listdir(os.path.join(POP, cfg, vp))):
                if f.endswith('.json'):
                    out.setdefault(cfg, {}).setdefault(vp, {})[f[:-5]] = scene(cfg, vp, f)
    os.makedirs(os.path.join(HERE, 'results'), exist_ok=True)
    json.dump(out, open(os.path.join(HERE, 'results', 'popcover.json'), 'w'))
    for cfg, v in out.items():
        for vp, ss in v.items():
            for k, r in ss.items():
                print(cfg, vp, k, 'tiles', r['tiles'], 'covered', r['covered_any'], '>25%', r['covered_gt25'], 'popup', r['covered_by_popup'], 'frame', r['covered_by_frame'], 'unattr', r['covered_unattributed'], 'dissolved', len(r['dissolved']), 'cut', len(r['partlyCut']), 'fx-core', r['fx_over_core_tiles'])

"""report.py - turns every result file into the tables and the PASS / FAIL lines of docs/pitch/anim2/jury/round-1-objective.md.
   python report.py            writes results/report-data.json and results/report-tables.md (the verdict table first)
Every verdict is computed here from the result files; nothing is typed by hand."""
import glob
import json
import os
import re
import sys
import numpy as np

sys.stdout.reconfigure(encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__))
R = os.path.join(HERE, 'results')
CFG = [('d1-day', 'D1 day'), ('d1-night', 'D1 night'), ('d4-paper', 'D4 paper'), ('d4-aerial', 'D4 aerial')]
DESK = ['s1a', 's1b', 's1c', 's2', 's3', 's4', 's6', 's7', 's8']
PHONE = ['s5', 's1cp', 's2p']
SCN = {'s1a': 'S1a field z13.5 t551', 's1b': 'S1b field z13.5 t556', 's1c': 'S1c Angle z15 t556', 's2': 'S2 Wheatfield z15 t295', 's3': 'S3 Cemetery Hill z15.5 t346', 's4': 'S4 close-up z16.5, one unit selected',
       's6': 'S6 event and story cards, t28', 's7': 'S7 legend open', 's8': 'S8 hover tooltip z16', 's5': 'S5 phone z14.5, sheet open', 's1cp': 'P1 phone Angle z14.5', 's2p': 'P2 phone Wheatfield z14.5'}


def load(name):
    p = os.path.join(R, name)
    return json.load(open(p)) if os.path.exists(p) else None


AN = {c: load(f'an-{c}.json') for c, _ in CFG}
RECT = load('canvasrect.json')
V = {}                          # verdicts: V[line][cfg] = (True/False/None, text)
DATA = {}


def setv(line, cfg, ok, text):
    V.setdefault(line, {})[cfg] = (ok, text)


def tbl(head, rows):
    out = ['| ' + ' | '.join(head) + ' |', '|' + '|'.join(['---'] + ['---:'] * (len(head) - 1)) + '|']
    out += ['| ' + ' | '.join(str(x) for x in r) + ' |' for r in rows]
    return '\n'.join(out)


def pct(x, n=0):
    return f'{100 * x:.{n}f}%'


def f1(x, n=1):
    return '-' if x is None else f'{x:.{n}f}'


# ------------------------------------------------------------------------------------------------ 1. text contrast
def need(i):
    return 3.0 if (i['size'] >= 24 or (i['size'] >= 18.66 and i['weight'] >= 700)) else 4.5


def pool(c, scenes, vp, kind):
    out = []
    for sc in scenes:
        d = (AN[c] or {}).get(vp, {}).get(sc)
        if d:
            for i in d.get('items_' + kind, []):
                out.append((sc, i))
    return out


def med_of(i, key):
    g = i.get(key) or i.get('raw')
    return g['med'] if g else None


def text_contrast():
    rows = []
    worst = {}
    DATA['text_contrast'] = {}
    for pop, kind, key in (('unit lettering on the map', 'unit', 'eff'), ('place names on the map', 'place', 'eff'), ('interface text (DOM)', 'dom', 'raw')):
        cells = []
        for c, _ in CFG:
            items = pool(c, DESK, 'desktop', kind) + pool(c, PHONE, 'phone', kind)
            faded = [x for x in items if x[1].get('alpha', 1) < 0.3]
            items = [x for x in items if x[1].get('alpha', 1) >= 0.3]
            m = [(sc, i, med_of(i, key)) for sc, i in items if med_of(i, key) is not None]
            if not m:
                cells.append('-')
                continue
            vals = np.array([x[2] for x in m])
            fail = [(sc, i, v) for sc, i, v in m if v < need(i)]
            p10 = np.array([(i.get(key) or i.get('raw'))['p10'] for sc, i, v in m])
            cells.append(f"{np.median(vals):.1f} / {vals.min():.1f} / {pct(1 - len(fail) / len(m), 1)} ({len(fail)} of {len(m)} fail{', ' + str(len(faded)) + ' more fading under the bars, not counted' if faded else ''})")
            DATA['text_contrast'].setdefault(c, {})[kind] = {'n': len(m), 'median': float(np.median(vals)), 'min': float(vals.min()), 'fail': len(fail), 'share_pass': 1 - len(fail) / len(m), 'share_p10_ge3': float((p10 >= 3).mean()), 'faded': len(faded)}
            worst.setdefault(c, {})[kind] = sorted([(v, sc, i['s'], i['size']) for sc, i, v in fail])[:6]
        rows.append([pop] + cells)
    for c, _ in CFG:
        d = DATA['text_contrast'].get(c, {})
        nf = sum(x['fail'] for x in d.values())
        n = sum(x['n'] for x in d.values())
        setv('text_contrast', c, nf == 0 and n > 0, f'{nf} of {n} text items under 4.5:1')
    return rows, worst


# ------------------------------------------------------------------------------------------------ 2. mark contrast
def mark_contrast():
    rows = []
    DATA['mark_contrast'] = {}
    for c, name in CFG:
        a = AN[c]
        m = a and a.get('marks_pooled')
        if not m:
            continue
        DATA['mark_contrast'][c] = m
        pn = 0
        pb45 = 0
        pb3 = 0
        for sc in ('s5', 's1cp', 's2p'):
            q = (a['phone'].get(sc) or {}).get('marks')
            if q and q.get('best_n'):
                pn += q['best_n']
                pb45 += q['best_share_ge45'] * q['best_n']
                pb3 += q['best_share_ge3'] * q['best_n']
        rows.append([name, m['n_marks'], f"{m['ground_med']:.1f} / {pct(m['ground_share_ge3'])} / {pct(m['ground_share_ge45'], 1)} (n={m['n_measured']})", f"{m['edge_med']:.1f} / {pct(m['edge_share_ge3'])} / {pct(m['edge_share_ge45'], 1)} (n={m['n_edge']})",
                     f"{m['best_med']:.1f} / {pct(m['best_share_ge3'])} / {pct(m['best_share_ge45'], 1)} (n={m['best_n']})", f"{m['surround_med']:.1f} / {pct(m['surround_share_ge45'], 1)}", (f"{pct(pb3 / pn)} / {pct(pb45 / pn, 1)} (n={pn})" if pn else '-')])
        setv('mark_contrast', c, m['best_n_lt45'] == 0, f"{m['best_n_lt45']} of {m['best_n']} marks stay under 4.5:1 even on the more favourable of two readings (cloth or outer silhouette against the bare ground; median {m['best_med']:.1f}); {pct(m['best_share_ge3'])} reach 3:1")
    return rows


# ------------------------------------------------------------------------------------------------ 3. text size
def text_size():
    rows = []
    DATA['text_size'] = {}
    for c, name in CFG:
        a = AN[c]
        if not a:
            continue
        res = {}
        for pop, kind in (('map', 'canvas_unit'), ('places', 'canvas_place'), ('ui', 'dom')):
            sizes1 = []
            n1 = 0
            lt11 = 0
            for sc in DESK:
                d = a['desktop_dpr1'].get(sc, {}).get(kind)
                if d and d.get('n'):
                    sizes1.append(d['size_min'])
                    n1 += d['n']
                    lt11 += d['n_lt11']
            sizesp = []
            np_ = 0
            ltp = 0
            for sc in PHONE:
                d = a['phone'].get(sc, {}).get(kind)
                if d and d.get('n'):
                    sizesp.append(d['size_min'])
                    np_ += d['n']
                    ltp += d['n_lt11']
            res[pop] = {'min_1x': min(sizes1) if sizes1 else None, 'n_1x': n1, 'lt11_1x': lt11, 'min_phone': min(sizesp) if sizesp else None, 'n_phone': np_, 'lt11_phone': ltp}
        DATA['text_size'][c] = res
        rows.append([name] + [f"{f1(res[p]['min_1x'], 2)} ({res[p]['lt11_1x']} of {res[p]['n_1x']} under 11) / {f1(res[p]['min_phone'], 2)} ({res[p]['lt11_phone']} of {res[p]['n_phone']})" for p in ('map', 'places', 'ui')])
        mn = min([v for p in res.values() for v in (p['min_1x'], p['min_phone']) if v is not None] or [0])
        nbad = sum(p['lt11_1x'] + p['lt11_phone'] for p in res.values())
        setv('text_size', c, mn >= 11.0 and nbad == 0, f'smallest {mn:.2f} px; {nbad} items under 11 px')
    return rows


# ------------------------------------------------------------------------------------------------ 4. vital-core overlaps (stills)
def overlaps_stills():
    rows = []
    DATA['overlaps_stills'] = {}
    for c, name in CFG:
        a = AN[c]
        if not a:
            continue
        tot = {'foot': 0, 'lab': 0, 'pins': 0, 'core': 0, 'text': 0, 'pinbody': 0, 'tiles': 0, 'scenes': 0}
        for vp, scs in (('desktop', ['s1a', 's1b', 's1c', 's2', 's3', 's4']), ('phone', PHONE)):
            for sc in scs:
                d = a[vp].get(sc)
                if not d or 'ink' not in d:
                    continue
                g = d['geometry']
                i = d['ink']
                tot['scenes'] += 1
                tot['foot'] += g['footprint_overlaps']
                tot['lab'] += g['label_overlaps']
                tot['pins'] += g['pins_covered']
                tot['core'] += i['bodyCorePairs']
                tot['text'] += i['textCovered']
                tot['pinbody'] += i['pinOnBodyPairs']
                tot['tiles'] += i['tiles']
        DATA['overlaps_stills'][c] = tot
        rows.append([name, tot['scenes'], tot['tiles'], tot['foot'], tot['lab'], tot['pins'], tot['core'], tot['text'], tot['pinbody']])
    return rows


# ------------------------------------------------------------------------------------------------ strips
def summ_strip(s):
    rows = s['rows']

    def mx(k):
        return max([r.get(k, 0) for r in rows] or [0])
    px = [r for r in rows if 'px' in r]
    out = {'frames': len(rows), 'maxStep': mx('maxStep'), 'maxRaw': mx('maxRaw'), 'maxJolt': mx('maxJolt'), 'jolt3': sum(r.get('nJolt3', 0) for r in rows), 'maxOff': mx('maxOff'), 'rev': sum(r['nRev'] for r in rows), 'pops6': sum(r['nStep6'] for r in rows),
           'opPops': sum(r['nOp'] for r in rows), 'maxOp': mx('maxOp'), 'geoFrames': sum(1 for r in rows if r['geo'] > 0), 'geoMax': mx('geo'), 'geo5Frames': sum(1 for r in rows if r['geo5'] > 0), 'engFrames': sum(1 for r in rows if r['eng'] > 0),
           'pxFrames': len(px), 'pxAnyFrames': sum(1 for r in px if r['px']['core'] > 0), 'pxAnyMax': max([r['px']['core'] for r in px] or [0]), 'pxSolidFrames': sum(1 for r in px if r['px'].get('solid', 0) > 0), 'pxSolidMax': max([r['px'].get('solid', 0) for r in px] or [0]),
           'tileOff': s['tileOff'], 'ex': s['ex']}
    # frames until the engine stops being busy (first frame after which it is never busy again)
    last_busy = max([r['f'] for r in rows if r['busy']] or [-1])
    out['restAfter'] = None if last_busy >= len(rows) - 1 else last_busy + 1
    # motion after rest: steps in the frames after the engine is idle
    return out


STRIPS = {}
for c, _ in CFG:
    for vp in ('desktop', 'phone'):
        for tag in ('', 'dt33'):
            p = os.path.join(R, f"strips-{c}-{vp}{'-' + tag if tag else ''}.json")
            if os.path.exists(p):
                d = json.load(open(p))
                STRIPS[(c, vp, tag)] = {n: (summ_strip(s) if 'rows' in s else {'error': s.get('error')}) for n, s in d['scenarios'].items()}
STATIC = ['rest', 'play4', 'play1', 'select', 'arrival', 'deploy']
CAMERA = ['zoomin', 'zoomout', 'pan']


def strips_tables():
    out = {}
    DATA['strips'] = {f'{k[0]}|{k[1]}|{k[2]}': v for k, v in STRIPS.items()}
    # overlaps in motion
    rows = []
    for c, name in CFG:
        for vp in ('desktop', 'phone'):
            S = STRIPS.get((c, vp, ''))
            if not S:
                continue
            fr = sum(s.get('frames', 0) for s in S.values() if 'frames' in s)
            pxf = sum(s.get('pxFrames', 0) for s in S.values() if 'frames' in s)
            anyf = sum(s.get('pxAnyFrames', 0) for s in S.values() if 'frames' in s)
            solf = sum(s.get('pxSolidFrames', 0) for s in S.values() if 'frames' in s)
            anymax = max([s.get('pxAnyMax', 0) for s in S.values() if 'frames' in s] or [0])
            geof = sum(s.get('geoFrames', 0) for s in S.values() if 'frames' in s)
            g5 = sum(s.get('geo5Frames', 0) for s in S.values() if 'frames' in s)
            eng = sum(s.get('engFrames', 0) for s in S.values() if 'frames' in s)
            rows.append([name, vp, len(S), fr, pxf, anyf, solf, anymax, geof, g5, eng])
            if vp == 'desktop':
                DATA.setdefault('overlap_motion', {})[c] = {'frames': fr, 'pxFrames': pxf, 'anyFrames': anyf, 'solidFrames': solf, 'geoFrames': geof, 'geo5Frames': g5, 'engFrames': eng}
    out['overlap'] = rows
    # verdict: overlaps in motion, desktop + phone together
    for c, _ in CFG:
        anyf = 0
        solf = 0
        fr = 0
        for vp in ('desktop', 'phone'):
            S = STRIPS.get((c, vp, ''))
            if S:
                anyf += sum(s.get('pxAnyFrames', 0) for s in S.values() if 'frames' in s)
                solf += sum(s.get('pxSolidFrames', 0) for s in S.values() if 'frames' in s)
                fr += sum(s.get('pxFrames', 0) for s in S.values() if 'frames' in s)
        setv('overlap_motion_solid', c, fr > 0 and solf == 0, f'{solf} of {fr} frames have two solid marks (drawn alpha 0.5 or more) whose core ink overlaps')
        setv('overlap_motion', c, fr > 0 and anyf == 0, f'{anyf} of {fr} frames have two marks whose core ink overlaps ({solf} of them between two solid marks)')
    # jitter table
    rows = []
    for c, name in CFG:
        for vp in ('desktop', 'phone'):
            S = STRIPS.get((c, vp, ''))
            if not S:
                continue
            for n in STATIC + CAMERA:
                s = S.get(n)
                if not s or 'frames' not in s:
                    continue
                rows.append([name, vp, n, f1(s['maxStep'], 2), f1(s['maxRaw'], 1), f1(s['maxJolt'], 2), s['jolt3'], s['pops6'], s['opPops'], s['rev'], f1(s['maxOff'], 1), s['restAfter'] if s['restAfter'] is not None else 'never'])
    out['jitter'] = rows
    for c, _ in CFG:
        worst_jolt = 0
        pops = 0
        oppops = 0
        who = ''
        for vp in ('desktop', 'phone'):
            S = STRIPS.get((c, vp, ''))
            if not S:
                continue
            for n, s in S.items():
                if 'frames' not in s:
                    continue
                if s['maxJolt'] > worst_jolt:
                    worst_jolt = s['maxJolt']
                    who = f'{vp} {n}'
                if n in STATIC:
                    pops += s['pops6']
                oppops += s['opPops']
        ok = worst_jolt <= 2.0 and pops == 0 and oppops == 0
        setv('jitter', c, ok, f'largest velocity change {worst_jolt:.1f} px in one frame ({who}); {pops} steps over 6 px in the static-camera strips; {oppops} opacity jumps over 0.35')
    # rest
    for c, _ in CFG:
        S = STRIPS.get((c, 'desktop', ''))
        P = STRIPS.get((c, 'phone', ''))
        S3 = STRIPS.get((c, 'desktop', 'dt33'))
        P3 = STRIPS.get((c, 'phone', 'dt33'))
        def rest_of(X):
            r = (X or {}).get('rest')
            return r['restAfter'] if r and 'frames' in r else 'n/m'

        def rest_motion(X):
            r = (X or {}).get('rest')
            return r['maxOff'] if r and 'frames' in r else None
        DATA.setdefault('rest', {})[c] = {'desktop60': rest_of(S), 'phone60': rest_of(P), 'desktop30': rest_of(S3), 'phone30': rest_of(P3), 'maxOff60': rest_motion(S), 'maxOff30': rest_motion(S3)}
    return out


# ------------------------------------------------------------------------------------------------ popups
def popups_tables():
    pc = load('popcover.json') or {}
    rows = []
    DATA['popcover'] = {}
    for c, name in CFG:
        for vp in ('desktop', 'phone'):
            ss = (pc.get(c) or {}).get(vp) or {}
            for k in sorted(ss):
                r = ss[k]
                rows.append((c, vp, k, r))
    return rows, pc


# ------------------------------------------------------------------------------------------------ own vs merged
def classify_crowd(text, kind):
    t = (text or '').lower()
    has_form = bool(re.search(r'corps|div|bde|brigade|artillery|cavalry|battalion|regiment', t))
    vague = ('others' in t) or ('no formation' in t) or bool(re.search(r'(^|, )unlisted', t))
    if not has_form:
        return 'uninformative'
    if vague:
        return 'vague'
    if kind in ('brigade', 'division') or re.search(r'bde|brigade|div', t):
        return 'formation'
    return 'corps'


def props_tables():
    out = {}
    DATA['props'] = {}
    for vp in ('desktop', 'phone'):
        rows = load(f'props-{vp}.json')
        if not rows:
            continue
        trs = []
        for z in (13.5, 15, 16.5):
            cells = []
            for c, _ in CFG:
                d, l = c.split('-')
                rr = [r for r in rows if r['dir'] == d and r['look'] == l and r['zoom'] == z and r['unitsInView'] > 0]
                if not rr:
                    cells.append('-')
                    continue
                own = sum(r['unitsOwn'] for r in rr)
                tot = sum(r['unitsInView'] for r in rr)
                sh = [r['unitsOwn'] / r['unitsInView'] for r in rr]
                cells.append(f"{pct(own / tot)} (min {pct(min(sh))}, max {pct(max(sh))}; {sum(r['crowdMarks'] for r in rr) / len(rr):.0f} crowd marks per view)")
                DATA['props'].setdefault(c, {}).setdefault(vp, {})[str(z)] = {'own_share': own / tot, 'min': min(sh), 'max': max(sh), 'views': len(rr)}
            trs.append([f'z{z}'] + cells)
        out[vp] = trs
    # crowd names (desktop views at z13.5 and z15)
    rows = load('props-desktop.json')
    names = []
    if rows:
        for c, name in CFG:
            d, l = c.split('-')
            for z in (13.5, 15, 16.5):
                rr = [r for r in rows if r['dir'] == d and r['look'] == l and r['zoom'] == z]
                crowds = [(cr, r) for r in rr for cr in r.get('crowds', [])]
                if not crowds:
                    names.append([name, f'z{z}', 0, '-', '-', '-', '-', '-'])
                    continue
                cls = [classify_crowd(cr['text'], cr['kind']) for cr, r in crowds]
                n = len(cls)
                cnt = {k: cls.count(k) for k in ('formation', 'corps', 'vague', 'uninformative')}
                dup = 0
                dupviews = 0
                for r in rr:
                    texts = [cr['text'] for cr in r.get('crowds', [])]
                    d2 = len(texts) - len(set(texts))
                    dup += d2
                    dupviews += 1 if d2 else 0
                names.append([name, f'z{z}', n, pct(cnt['formation'] / n), pct(cnt['corps'] / n), pct(cnt['vague'] / n), pct(cnt['uninformative'] / n), f'{dup} ({dupviews} of {len(rr)} views)'])
                DATA.setdefault('crowd_names', {}).setdefault(c, {})[str(z)] = {'n': n, **cnt, 'dup': dup}
        for c, nm in CFG:
            d = DATA.get('crowd_names', {}).get(c, {})
            allc = sum(d[z]['n'] for z in d)
            bad = sum(d[z]['vague'] + d[z]['uninformative'] for z in d)
            own = DATA.get('props', {}).get(c, {}).get('desktop', {})
            o135 = own.get('13.5', {}).get('own_share')
            setv('crowds', c, allc > 0 and bad == 0, f"{bad} of {allc} crowd marks carry no formation or corps (vague or residual wording); own-mark share at z13.5 {pct(o135) if o135 is not None else '-'}")
    out['names'] = names
    return out


# ------------------------------------------------------------------------------------------------ perf
def perf_tables():
    p = load('perf.json')
    if not p:
        return None
    rows = []
    DATA['perf'] = {}
    for r in p['rows']:
        key = (r['dir'] + '-' + r['look'])
        DATA['perf'].setdefault(key, {}).setdefault(r['set'], {})[r['view']] = {'tiles': r['tiles'], 'draw_flush': r['draw_flush'], 'draw_js_still': r['draw_js_still'], 'play_draw': r['play']['draw_js'], 'step': r['play']['step_ms'], 'fps': r['play']['fps'], 'over20': r['play']['over20ms'], 'pacing': r['play']['pacing_ms']}
    for c, name in CFG:
        d = DATA['perf'].get(c, {})
        s = d.get('dpr2cpu1', {})
        if not s:
            continue
        worst_med = max(v['play_draw']['med'] for v in s.values())
        worst_p95 = max(v['play_draw']['p95'] for v in s.values())
        worst_fmed = max(v['draw_flush']['med'] for v in s.values())
        worst_fp95 = max(v['draw_flush']['p95'] for v in s.values())
        setv('draw_time', c, worst_p95 <= 8.0 and worst_med <= 8.0, f'densest tick, DPR 2: renderer.draw in the running page median {worst_med:.1f} / p95 {worst_p95:.1f} ms (worst of three views); drawn in isolation with read-back median {worst_fmed:.1f} / p95 {worst_fp95:.1f} ms')
    for c, name in CFG:
        d = DATA['perf'].get(c, {})
        s4 = d.get('dpr2cpu4', {})
        if s4:
            wp = max(v['play_draw']['p95'] for v in s4.values())
            wm = max(v['play_draw']['med'] for v in s4.values())
            fps = min(v['fps'] for v in s4.values())
            setv('draw_time_cpu4', c, wp <= 16.7, f'CPU slowed 4x: renderer.draw median {wm:.1f} / p95 {wp:.1f} ms (worst view), slowest view runs at {fps:.0f} fps')
    return p


# ------------------------------------------------------------------------------------------------ cvd
def cvd_tables():
    rows = []
    DATA['cvd'] = {}
    for c, name in CFG:
        a = AN[c]
        if not a or not a.get('cvd'):
            continue
        cv = a['cvd']
        cp = a.get('cvd_pairs') or {}
        ident = {k: v['side_vs_side'] for k, v in cv['sims'].items()}
        pairs = {k: cp.get(k) for k in ('normal', 'protanopia', 'deuteranopia', 'tritanopia')}
        DATA['cvd'][c] = {'identifying': ident, 'pairs': pairs, 'side_rgb': cv['side_rgb']}
        rows.append([name, f"{cv['side_rgb']['union']} / {cv['side_rgb']['confederate']}"] + [f"{ident[k]:.0f} · p5 {pairs[k]['p5']:.0f} · {pct(pairs[k]['share_ge20'], 1)}" if pairs.get(k) else f'{ident[k]:.0f}' for k in ('normal', 'protanopia', 'deuteranopia', 'tritanopia')])
        okid = all(ident[k] >= 20 for k in ('protanopia', 'deuteranopia', 'tritanopia'))
        okpair = all(pairs[k] and pairs[k]['share_ge20'] >= 0.90 for k in ('protanopia', 'deuteranopia', 'tritanopia'))
        worst_share = min(pairs[k]['share_ge20'] for k in ('protanopia', 'deuteranopia', 'tritanopia') if pairs.get(k))
        setv('cvd', c, okid and okpair, f"identifying colours {min(ident[k] for k in ('protanopia', 'deuteranopia', 'tritanopia')):.0f} dE00 at the worst simulation; {pct(worst_share, 1)} of Union-vs-Confederate mark pairs reach 20")
    return rows


# ------------------------------------------------------------------------------------------------ bytes
def bytes_tables():
    s = load('sizes.json')
    n = load('net.json')
    rows = []
    DATA['bytes'] = {}
    for d, name in (('d1', 'D1'), ('d4', 'D4')):
        if not s or d not in s:
            continue
        z = s[d]
        skin = z['skin_bytes'] + z['tokens_bytes'] + z['css_bytes'] + z['ground_bytes'] + z['fonts_total']
        DATA['bytes'][d] = {'page': z['page_bytes'], 'page_gzip': z['page_gzip'], 'skin_layer': skin, 'fonts': z['fonts_total'], 'skin_gzip': z['skin_gzip']}
        net = {}
        for look in ('day', 'night', 'paper', 'aerial'):
            k = f'{d}-{look}'
            if n and k in n:
                net[look] = n[k]
        rows.append((d, name, z, skin, net))
    for c, name in CFG:
        d = c.split('-')[0]
        b = DATA['bytes'].get(d)
        if not b:
            continue
        nt = (n or {}).get(c)
        first = nt['load_and_field']['total']['bytes'] if nt else None
        ok = b['skin_layer'] <= 300000 and b['page_gzip'] <= 1000000
        setv('bytes', c, ok, f"page {b['page'] / 1e6:.2f} MB ({b['page_gzip'] / 1e3:.0f} KB gzip); the skin layer (code, tokens, stylesheets, fonts) {b['skin_layer'] / 1e3:.0f} KB" + (f"; first view downloads {first / 1e6:.2f} MB" if first else ''))
    return rows


def main():
    out = []
    P = out.append
    r_text, worst = text_contrast()
    r_mark = mark_contrast()
    r_size = text_size()
    r_ovs = overlaps_stills()
    st = strips_tables()
    pr = props_tables()
    pf = perf_tables()
    r_cvd = cvd_tables()
    r_bytes = bytes_tables()
    pop_rows, pc = popups_tables()
    # popups verdict
    for c, _ in CFG:
        tot_popup = 0
        tot_fx = 0
        tot_frame = 0
        tot_lost = 0
        tot_scenes = 0
        base_cov = 0
        base_cut = 0
        base_edge = 0
        base_diss = 0
        base_scenes = 0
        for vp in ('desktop', 'phone'):
            for k, r in ((pc.get(c) or {}).get(vp) or {}).items():
                if k[0] in 'pm':
                    tot_scenes += 1
                    tot_popup += r['covered_by_popup']
                    tot_fx += r['fx_over_core_tiles']
                    tot_frame += r['covered_by_frame']
                    if k not in ('p9-day-banner', 'p10-tour-step'):          # the clock plays or the tour moves the camera: marks leave the view for that reason
                        tot_lost += len(r.get('lost') or [])
                else:
                    rc = RECT[f'{c}-{vp}']
                    interior = ('T' if rc['top'] > 0.5 else '') + ('B' if rc['top'] + rc['h'] < rc['ih'] - 0.5 else '')
                    base_scenes += 1
                    base_cov += r['covered_any']
                    base_cut += sum(1 for q in r['partlyCut'] if len(q) > 2 and any(e in interior for e in q[2]))
                    base_edge += len(r['partlyCut'])
                    base_diss += len(r['dissolved'])
        setv('popups', c, tot_scenes > 0 and tot_popup == 0 and tot_lost == 0, f'{tot_popup} marks lie under a popup and {tot_lost} marks leave the visible map (dissolved or cut) when a rail, panel, card or sheet opens, summed over {tot_scenes} popup scenes (popup ink touches the core of {tot_fx} marks, a count that includes the subject mark of each popup)')
        setv('interface_cover', c, tot_scenes > 0 and base_cov == 0 and base_diss == 0 and base_cut == 0, f'with no popup open, in {base_scenes} scenes: {base_cov} marks under the bars, {base_diss} marks dissolved by the bars, {base_cut} marks cut by a map edge that is not the screen edge ({base_edge - base_cut} more are cut by the screen edge, as on any pannable map)')
        DATA.setdefault('popup_totals', {})[c] = {'lost': tot_lost, 'popup': tot_popup, 'fx': tot_fx, 'frame': tot_frame, 'scenes': tot_scenes, 'base_cov': base_cov, 'base_cut': base_cut, 'base_edge': base_edge, 'base_scenes': base_scenes, 'base_dissolved': base_diss}
    # overlaps in stills verdict
    for c, _ in CFG:
        t = DATA['overlaps_stills'].get(c)
        if t:
            pcs = 0
            pcn = 0
            for vp in ('desktop', 'phone'):
                for k, r in ((pc.get(c) or {}).get(vp) or {}).items():
                    pcn += 1
                    pcs += r['corePairs']
            n = t['foot'] + t['lab'] + t['pins'] + t['core'] + t['text'] + t['pinbody'] + pcs
            setv('overlap_still', c, n == 0, f"{n} overlaps in {t['scenes']} measured scenes and {pcn} popup/base scenes ({t['core']} core-ink pairs, {t['text']} lettering boxes under another mark, {pcs} core pairs in popup scenes)")
    dts = load('dtsweep.json')
    if dts:
        for c, _ in CFG:
            d = c.split('-')[0]
            rows = [r for r in dts if r['dir'] == d]
            bad = [r for r in rows if r['framesMoving'] > 0]
            worst_ok = min([r['fps'] for r in rows if r['framesMoving'] == 0] or [0])
            first_bad = max([1000 / r['dt'] for r in bad] or [0])
            mv = max([r['maxStep'] for r in bad] or [0])
            rt = [r for r in (load('rtrest.json') or []) if r['dir'] == d and 'framesMoving' in r]
            rtbad = [r for r in rt if r['framesMoving'] > 0]
            rttxt = f"; in the real page with the CPU slowed 1x, 2x, 4x, 6x it keeps moving in {len(rtbad)} of {len(rt)} runs" + (f" (first at {min((r['cpu'], r['vp']) for r in rtbad)[0]}x slowdown)" if rtbad else '')
            setv('rest_fps', c, not bad and not rtbad, (f"keeps moving at {len(bad)} of {len(rows)} constant frame times tested (from {first_bad:.0f} fps down; up to {mv:.0f} px in one frame, every frame)" if bad else f'comes to rest at all {len(rows)} frame times tested (60 down to 20 fps), desktop and phone') + rttxt)
        DATA['dtsweep'] = dts
    json.dump({'verdicts': {k: {c: list(v) for c, v in d.items()} for k, d in V.items()}, 'data': DATA}, open(os.path.join(R, 'report-data.json'), 'w'), indent=1, default=float)
    # ------- verdict table
    LINES = [('text_contrast', 'Contrast of every text, at least 4.5:1'), ('mark_contrast', 'Contrast of every mark against its backdrop, at least 4.5:1'), ('text_size', 'Smallest rendered text, at least 11 CSS px (1x and phone)'),
             ('overlap_still', 'Vital-core overlaps in every scene, 0'), ('overlap_motion_solid', 'Overlap between two solid marks in any frame of the motion strips, 0'), ('overlap_motion', 'Overlap between any two marks, travelling marks at 42 percent included, in any frame, 0'), ('crowds', 'A crowd says what it stands for'),
             ('draw_time', 'Draw time at the densest tick, at most 8 ms (desktop)'), ('draw_time_cpu4', 'Draw time with the CPU slowed 4x (phone proxy), p95 inside one 60 Hz frame'), ('bytes', 'Bytes'), ('cvd', 'Sides distinguishable under colour-vision deficiency, dE00 at least 20'), ('popups', 'Popups cover no vital tile'), ('interface_cover', 'The interface (bars, edges) hides no vital tile'), ('jitter', 'Frame-to-frame jitter in the strips (60 fps)'), ('rest_fps', 'The layout comes to rest at a phone frame rate (30 fps)')]
    P('## Verdicts\n')
    head = ['line'] + [n for _, n in CFG]
    rows = []
    for key, label in LINES:
        cells = []
        for c, _ in CFG:
            v = V.get(key, {}).get(c)
            cells.append('-' if not v else ('**PASS**' if v[0] else '**FAIL**') if v[0] is not None else 'n/m')
        rows.append([label] + cells)
    P(tbl(head, rows))
    P('\nThe numbers behind each cell:\n')
    for key, label in LINES:
        P(f'* **{label}**')
        for c, n in CFG:
            v = V.get(key, {}).get(c)
            if v:
                P(f"  * {n}: {'PASS' if v[0] else 'FAIL'}: {v[1]}")
    open(os.path.join(R, 'report-verdicts.md'), 'w', encoding='utf-8').write('\n'.join(out))
    out.clear()
    P('### Text contrast\n')
    P('Cell: median / lowest item median / share of items at or above the need (4.5:1, 3:1 for large text); items = distinct text drawn in a scene, contrast of the text colour against the pixels it stands on (halo pixels where the skin draws a halo), 9 desktop and 3 phone scenes pooled.\n')
    P(tbl(['text'] + [n for _, n in CFG], r_text))
    P('\nThe lowest items (ratio, scene, text, size):\n')
    for c, n in CFG:
        for kind, lst in (worst.get(c) or {}).items():
            if lst:
                P(f'* {n} {kind}: ' + '; '.join(f'{v:.1f} {sc} "{s}" {sz:.0f}px' for v, sc, s, sz in lst[:4]))
    P('\n### Mark contrast\n')
    P('Cell: median ratio / share of marks at 3:1 or more / share at 4.5:1 or more. Desktop scenes S1a to S4 pooled; phone pooled in the last column.\n')
    P(tbl(['config', 'marks', 'cloth colour against the bare ground', 'outer silhouette against the bare ground', 'better of the two', 'cloth against its own outline (median / 4.5:1)', 'phone: better of the two, 3:1 / 4.5:1'], r_mark))
    P('\n### Text size\n')
    P('Cell: smallest size at 1x on the 1440 x 900 page (items under 11 px of items) / on the 390 x 844 phone shots.\n')
    P(tbl(['config', 'map lettering', 'place names', 'interface text'], r_size))
    P('\n### Overlaps in the stills\n')
    P(tbl(['config', 'scenes', 'tiles isolated', 'footprint overlaps', 'label overlaps', 'pins covered', 'core-ink pairs', 'lettering boxes under another mark', 'pin on body'], r_ovs))
    P('\n### Overlaps in motion\n')
    P(tbl(['config', 'viewport', 'strips', 'frames', 'pixel-checked frames', 'frames with a core overlap (any mark at 10% or more)', 'of which between two solid marks', 'most pairs in a frame', 'frames with footprint overlap (10% or more)', 'of which both solid', 'engine-counted frames'], st['overlap']))
    P('\n### Jitter\n')
    P(tbl(['config', 'viewport', 'strip', 'largest step (camera removed)', 'largest raw step', 'largest velocity change', 'changes over 3', 'steps over 6', 'opacity jumps over 0.35', 'velocity reversals', 'largest offset step', 'frames until rest'], st['jitter']))
    P('\n### Own mark versus merged\n')
    for vp, trs in pr.items():
        if vp == 'names':
            continue
        P(f'{vp}\n')
        P(tbl(['zoom'] + [n for _, n in CFG], trs))
        P('')
    P('\n### Crowd names\n')
    P(tbl(['config', 'zoom', 'crowd marks', 'formation named', 'corps named', 'vague wording', 'no formation or corps', 'duplicate names in a view'], pr.get('names', [])))
    P('\n### Colour vision\n')
    P(tbl(['config', 'side colours (Union / Confederate)', 'normal', 'protanopia', 'deuteranopia', 'tritanopia'], r_cvd))
    # ---- perf
    P('\n### Draw time and engine time per frame, densest tick (tick 620, 478 units on the field), Chrome 155 headless on an Intel Core Ultra 7 265H with its Arc GPU (ANGLE, Direct3D 11)\n')
    P('Cell: median / p95 of renderer.draw in the running page (ms) ; engine.step median / p95 (ms) | frames per second | share of frames over 20 ms. The page plays at 4x across the tick for 7 s with its own animation loop.\n')
    prow = []
    for c, name in CFG:
        for sname, lab in (('dpr2cpu1', 'DPR 2, CPU 1x'), ('dpr1cpu1', 'DPR 1, CPU 1x'), ('dpr2cpu4', 'DPR 2, CPU slowed 4x')):
            d = DATA.get('perf', {}).get(c, {}).get(sname)
            if not d:
                continue
            cells = []
            for vname in ('field-z13.5', 'angle-z15', 'angle-z16.5'):
                v = d.get(vname)
                cells.append('-' if not v else f"{v['play_draw']['med']:.1f} / {v['play_draw']['p95']:.1f} ; {v['step']['med']:.1f} / {v['step']['p95']:.1f} ; {v['fps']:.0f} ; {pct(v['over20'], 1)}")
            prow.append([name, lab] + cells)
    P(tbl(['config', 'setting', 'field z13.5', 'Angle z15', 'Angle z16.5'], prow))
    P('\nA forced read-back after each draw (an upper bound that stalls the pipeline; not what a viewer waits for) takes, DPR 2, CPU 1x, field / Angle z15 / Angle z16.5: ' + '; '.join(f"{name} " + ' / '.join(f"{DATA['perf'][c]['dpr2cpu1'][v]['draw_flush']['med']:.0f}" for v in ('field-z13.5', 'angle-z15', 'angle-z16.5')) + ' ms' for c, name in CFG if c in DATA.get('perf', {})) + '.')
    # ---- popups per scene
    P('\n### Marks the interface covers or removes, scene by scene\n')
    P('Cell: marks in view ; under something the page paints on top (any core ink) ; of which more than a quarter hidden ; left the visible map when the panel opened (dissolved or cut; - where the scene has no panel) ; popup ink on the core.\n')
    pcd = load('popcover.json') or {}
    names = {}
    for c, vp, k, r in pop_rows:
        names[(vp, k)] = r['what']
    keys = sorted(names, key=lambda x: (x[0] != 'desktop', x[1][0] != 'b', x[1]))
    prow = []
    for vp, k in keys:
        cells = []
        for c, _ in CFG:
            r = ((pcd.get(c) or {}).get(vp) or {}).get(k)
            if not r:
                cells.append('-')
                continue
            lost = '' if r.get('lost') is None else str(len(r['lost']))
            cells.append(f"{r['tiles']} ; {r['covered_any']} ; {r['covered_gt25']} ; {lost or '-'} ; {r['fx_over_core_tiles']}")
        prow.append([f'{vp} {k}: {names[(vp, k)]}'] + cells)
    P(tbl(['scene'] + [n for _, n in CFG], prow))
    # ---- bytes
    P('\n### Bytes\n')
    brow = []
    s_ = load('sizes.json') or {}
    n_ = load('net.json') or {}
    for d, name in (('d1', 'D1'), ('d4', 'D4')):
        z = s_.get(d)
        if not z:
            continue
        skin = z['skin_bytes'] + z['tokens_bytes'] + z['css_bytes'] + z['ground_bytes'] + z['fonts_total']
        brow.append([name, f"{z['page_bytes'] / 1e6:.2f} MB", f"{z['page_gzip'] / 1e3:.0f} KB", f"{z['skin_bytes'] / 1e3:.0f} KB", f"{z['tokens_bytes'] / 1e3:.0f} KB", f"{z['css_bytes'] / 1e3:.0f} KB", f"{z['ground_bytes'] / 1e3:.0f} KB", f"{z['fonts_total'] / 1e3:.0f} KB", f"{skin / 1e3:.0f} KB", f"{z['skin_gzip'] / 1e3:.0f} KB"])
    P(tbl(['direction', 'built page', 'page gzip', 'skin code', 'token JSON', 'stylesheets', 'ground code', 'fonts', 'skin layer total', 'code, tokens, css, ground, gzipped'], brow))
    nrow = []
    for c, name in CFG:
        z = n_.get(c)
        if z:
            f = z['load_and_field']
            nrow.append([name, f"{f['page']['bytes'] / 1e6:.2f} MB", f"{f.get('tiles', {}).get('files', 0)} files, {f.get('tiles', {}).get('bytes', 0) / 1e6:.2f} MB", f"{f.get('fonts', {}).get('bytes', 0) / 1e3:.0f} KB", f"{f['total']['bytes'] / 1e6:.2f} MB", f"{z['all']['total']['bytes'] / 1e6:.2f} MB"])
    P('\nCold start at the field view, then the close-up, from an empty profile (what the page fetches from the static server, no compression):\n')
    P(tbl(['config', 'page', 'aerial tiles at the field view', 'fonts as separate files', 'first view total', 'after the close-up'], nrow))
    # ---- rest
    P('\n### Does the layout come to rest?\n')
    P('Constant frame time, after a jump to the field view; the next 120 frames are measured. Cell: frames in which any mark moved more than 0.5 px / marks that moved / largest single-frame move (px).\n')
    dts = load('dtsweep.json') or []
    rrow = []
    for dt in sorted({r['dt'] for r in dts}):
        cells = []
        for d, vp in (('d1', 'desktop'), ('d1', 'phone'), ('d4', 'desktop'), ('d4', 'phone')):
            r = [x for x in dts if x['dir'] == d and x['vp'] == vp and x['dt'] == dt]
            cells.append('-' if not r else f"{r[0]['framesMoving']} / {r[0]['tilesMoving']} / {r[0]['maxStep']:.0f}")
        rrow.append([f'{1000 / dt:.0f} fps ({dt:.1f} ms)'] + cells)
    P(tbl(['frame rate', 'D1 desktop', 'D1 phone', 'D4 desktop', 'D4 phone'], rrow))
    P('\nThe same question in the real page (its own animation loop), 180 animation frames after 15 s, CPU slowed by the stated factor. Cell: frames moving / marks moving / largest move (px) / median and p95 frame time (ms).\n')
    rt = load('rtrest.json') or []
    rrow = []
    for cpu in (1, 2, 4, 6):
        cells = []
        for d, vp in (('d1', 'desktop'), ('d1', 'phone'), ('d4', 'desktop'), ('d4', 'phone')):
            r = [x for x in rt if x['dir'] == d and x['vp'] == vp and x['cpu'] == cpu and 'frames' in x]
            cells.append('-' if not r else f"{r[0]['framesMoving']} / {r[0]['tilesMoving']} / {r[0]['maxStep']:.0f} / {r[0]['frameMs']['med']:.0f}, {r[0]['frameMs']['p95']:.0f}")
        rrow.append([f'{cpu}x'] + cells)
    P(tbl(['CPU slowdown', 'D1 desktop', 'D1 phone', 'D4 desktop', 'D4 phone'], rrow))
    open(os.path.join(R, 'report-tables.md'), 'w', encoding='utf-8').write('\n'.join(out))
    print(open(os.path.join(R, 'report-verdicts.md'), encoding='utf-8').read())


if __name__ == '__main__':
    main()

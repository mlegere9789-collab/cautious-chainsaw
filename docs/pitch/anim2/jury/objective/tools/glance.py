"""glance.py - the one-row-per-metric overview table (headline number per direction), built from the same results as the full tables.   python glance.py > results/glance.md"""
import json
import os
import sys
import numpy as np
import an
import tables as T

sys.stdout.reconfigure(encoding='utf-8')
R = os.path.join(an.HERE, 'results')
CFG = T.CFG
A = T.A
S = json.load(open(os.path.join(R, 'sizes.json')))
PR = [json.loads(l) for l in open(os.path.join(R, 'perf-rows.jsonl')) if l.strip()]
PROPS = json.load(open(os.path.join(R, 'props-desktop.json')))
MAP_SCENES = ['s1a', 's1b', 's1c', 's2', 's3', 's4']


def cells(fn):
    out = []
    for c, _ in CFG:
        try:
            out.append(fn(c))
        except Exception as e:  # a missing number is shown as a dash, never invented
            out.append('–')
    return out


def pooled_unit(c):
    s = T.pooled(c, 'desktop', T.DESK, 'unit', 'eff')
    return f"{s['cr_med']:.1f} median, worst item {s['cr_min']:.1f}, {s['share_ge_need']:.0%} of {s['n']} items at 4.5:1"


def pooled_place(c):
    s = T.pooled(c, 'desktop', T.DESK, 'place', 'eff')
    return f"{s['cr_med']:.1f} median, worst {s['cr_min']:.1f}, {s['share_ge_need']:.0%} of {s['n']} at 4.5:1"


def pooled_dom(c):
    s = T.pooled(c, 'desktop', T.DESK, 'dom', 'raw')
    return f"{s['cr_med']:.1f} median, worst {s['cr_min']:.1f}, {s['share_ge_need']:.0%} of {s['n']} at 4.5:1"


def marks(c):
    m = A[c]['marks_pooled']
    return f"g {m['ground_med']:.1f} ({m['ground_share_ge3']:.0%} at 3:1), s {m['surround_med']:.1f} ({m['surround_share_ge3']:.0%})"


def minsize(c):
    mp = []
    for kind in ('canvas_unit', 'canvas_place', 'dom'):
        v = [A[c]['desktop_dpr1'][s][kind].get('size_min') for s in T.DESK if A[c]['desktop_dpr1'][s][kind].get('n')]
        mp.append(min(v))
    ph = [A[c]['phone'][s][k].get('size_min') for s in T.PHONE for k in ('canvas_unit', 'canvas_place', 'dom') if A[c]['phone'][s][k].get('n')]
    return f"map {mp[0]:.1f}, places {mp[1]:.1f}, UI {mp[2]:.1f}; phone min {min(ph):.1f}"


def dens(c):
    rows = [A[c]['desktop'][s]['density'] for s in MAP_SCENES]
    rows = [r for r in rows if r and 'objects' in r]
    return f"max {max(r['text_all'] for r in rows)} text / {max(r['objects'] for r in rows)} objects / {max(r['marks'] for r in rows)} marks"


def overlaps(c):
    d = c.split('-')[0]
    cc = {'d1': 'd1-night', 'd2': 'd2-default', 'd3': 'd3-default', 'd4': 'd4-paper'}[d]
    g = sum(A[cc]['desktop'][s]['geometry']['footprint_overlaps'] + A[cc]['desktop'][s]['geometry']['label_overlaps'] + A[cc]['desktop'][s]['geometry']['pins_covered'] for s in T.DESK)
    g += sum(A[cc]['phone'][s]['geometry']['footprint_overlaps'] + A[cc]['phone'][s]['geometry']['label_overlaps'] + A[cc]['phone'][s]['geometry']['pins_covered'] for s in T.PHONE)
    core = sum(A[cc]['desktop'][s]['ink']['bodyCorePairs'] for s in MAP_SCENES) + sum(A[cc]['phone'][s]['ink']['bodyCorePairs'] for s in T.PHONE)
    return f"{g} by geometry; {core} by pixels"


def own(c):
    d, l = c.split('-')
    out = []
    for z in (13.5, 15, 16.5):
        rr = [r for r in PROPS if r['dir'] == d and r['look'] == l and r['zoom'] == z]
        out.append(f"{sum(r['unitsOwn'] for r in rr) / sum(r['unitsInView'] for r in rr):.0%}")
    return ' / '.join(out)


def nbytes(c):
    d = c.split('-')[0]
    v = S[d]
    return f"{(v['skin_bytes'] + v['page_css_ex_fonts'] + v['fonts_in_page_binary']) / 1000:.0f} kB"


def perf(c):
    d, l = c.split('-')
    r = next(q for q in PR if q['dir'] == d and q['look'] == l and q['set'] == 'dpr2cpu1' and q['view'] == 'field-z13.5')
    r4 = next(q for q in PR if q['dir'] == d and q['look'] == l and q['set'] == 'dpr2cpu4' and q['view'] == 'field-z13.5')
    return f"{r['play']['draw_js']['med']:.1f} / {r['play']['draw_js']['p95']:.1f} ms JS, still {r['draw_flush']['med']:.0f} / {r['draw_flush']['p95']:.0f}; 4x throttle {r4['play']['draw_js']['med']:.0f} / {r4['play']['draw_js']['p95']:.0f} ms, {r4['play']['fps']:.0f} fps"


def cvd(c):
    cv = A[c]['cvd']
    ss = min(v['side_vs_side'] for v in cv['sims'].values())
    gg = min(min(v[k]['med'] for k in ('vs_ground_union', 'vs_ground_confederate') if k in v) for v in cv['sims'].values())
    return f"side vs side {ss:.0f} (min of 4 visions); vs ground {gg:.0f}"


def main():
    rows = []
    for lab, fn in (('Map lettering contrast (T1, desktop pooled)', pooled_unit), ('Place-name contrast (T1b)', pooled_place), ('Interface text contrast (T2)', pooled_dom), ('Mark side colour vs ground / vs its surroundings, pooled (T3)', marks),
                    ('Smallest text, CSS px at 1x (T4)', minsize), ('Busiest 100x100 px window over S1a-S4 (T5)', dens), ('Vital-core overlaps (T6)', overlaps), ('Units as their own mark at z13.5 / z15 / z16.5 (T7)', own),
                    ('Skin + CSS + fonts (T8)', nbytes), ('Draw time, field z13.5 at the densest tick, median / p95 (T9)', perf), ('Colour-vision: dE00 of the sides (T10)', cvd)):
        rows.append('| ' + lab + ' | ' + ' | '.join(cells(fn)) + ' |')
    print('| metric | ' + ' | '.join(n for _, n in CFG) + ' |')
    print('|' + '|'.join(['---'] * (len(CFG) + 1)) + '|')
    print('\n'.join(rows))


if __name__ == '__main__':
    main()

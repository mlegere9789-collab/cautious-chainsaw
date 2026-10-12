"""tables.py - turns results/*.json into the markdown tables of the report (one table per metric).   python tables.py > results/tables.md"""
import json
import sys
sys.stdout.reconfigure(encoding='utf-8')
import os
import sys
import numpy as np
import an

R = os.path.join(an.HERE, 'results')
CFG = [('d1-night', 'D1 night'), ('d1-day', 'D1 day'), ('d2-default', 'D2'), ('d3-default', 'D3'), ('d4-paper', 'D4 paper'), ('d4-aerial', 'D4 aerial')]
CFG4 = [('d1-night', 'D1'), ('d2-default', 'D2'), ('d3-default', 'D3'), ('d4-paper', 'D4')]
DESK = ['s1a', 's1b', 's1c', 's2', 's3', 's4', 's6', 's7', 's8']
PHONE = ['s5', 's1cp', 's2p']
SCN = {'s1a': 'S1a field z13.5 t551', 's1b': 'S1b field z13.5 t556', 's1c': 'S1c Angle z15 t556', 's2': 'S2 Wheatfield z15 t295', 's3': 'S3 Cemetery Hill z15.5 t346', 's4': 'S4 close-up z16.5, one unit selected', 's6': 'S6 event + story cards, t28',
       's7': 'S7 legend open', 's8': 'S8 hover tooltip z16', 's5': 'S5 phone z14.5, sheet open', 's1cp': 'P1 phone Angle z14.5', 's2p': 'P2 phone Wheatfield z14.5'}
A = {}
for c, _ in CFG:
    p = os.path.join(R, f'an-{c}.json')
    if os.path.exists(p):
        A[c] = json.load(open(p))


def row(title, cells):
    return '| ' + title + ' | ' + ' | '.join(cells) + ' |'


def table(head, rows):
    out = ['| ' + ' | '.join(head) + ' |', '|' + '|'.join(['---'] + ['---:'] * (len(head) - 1)) + '|']
    out += rows
    return '\n'.join(out)


def get(c, vp, sc, *path):
    try:
        d = A[c][vp][sc]
        for k in path:
            d = d[k]
        return d
    except (KeyError, TypeError):
        return None


def vp_of(sc):
    return 'phone' if sc in PHONE else 'desktop'


def f1(x, n=1):
    return '–' if x is None else (f'{x:.{n}f}')


def pooled(c, vp, scs, kind, key='eff'):
    items = []
    for sc in scs:
        d = A.get(c, {}).get(vp, {}).get(sc)
        if d:
            items += d.get('items_' + kind, [])
    return an.summarize_text(items, key)


def contrast_table(kind, title_key='canvas_unit', key='eff'):
    head = ['scene'] + [n for _, n in CFG]
    rows = []
    for sc in DESK + PHONE:
        cells = []
        for c, _ in CFG:
            s = get(c, vp_of(sc), sc, title_key)
            if not s or not s.get('n_cr'):
                cells.append('–' if not s or not s.get('n') else 'n/a')
            else:
                cells.append(f"{s['cr_med']:.1f} / {s['cr_min']:.1f} / {s['share_ge_need']:.0%} (n={s['n']})")
        rows.append(row(SCN[sc], cells))
    for label, scs, vp in (('**all desktop scenes pooled**', DESK, 'desktop'), ('**all phone scenes pooled**', PHONE, 'phone')):
        cells = []
        for c, _ in CFG:
            s = pooled(c, vp, scs, kind.split('_')[1] if '_' in kind else kind, key)
            cells.append('–' if not s.get('n_cr') else f"{s['cr_med']:.1f} / {s['cr_min']:.1f} / {s['share_ge_need']:.0%} (n={s['n']})")
        rows.append(row(label, cells))
    return table(head, rows)


def main():
    out = []
    P = out.append
    P('### T0 The scenes and what each direction puts on them\n')
    P('Cell: marks in the viewport (a mark = one tile of the engine: a unit, or a formation or crowd standing for several) / units those marks stand for (all of the units that the viewport shows).\n')
    rows = []
    for sc in DESK + PHONE:
        cells = []
        for c, _ in CFG4:
            g = get(c, vp_of(sc), sc, 'geometry')
            cells.append('–' if not g else f"{g['tiles_in_view']} marks of {g['on_field']} units on the field")
        d = A.get('d1-night', {}).get(vp_of(sc), {}).get(sc, {})
        rows.append(row(f"{SCN[sc]} (tick {d.get('tick')}, zoom {d.get('zoom')}, {d.get('view', {}).get('w')} x {d.get('view', {}).get('h')})", cells))
    P(table(['scene'] + [n for _, n in CFG4], rows))
    P('\n### T1 Contrast of unit lettering on the map (canvas text)\n')
    P(contrast_table('items_unit', 'canvas_unit', 'eff'))
    P('\n### T1b Contrast of place names on the map (canvas text)\n')
    P(contrast_table('items_place', 'canvas_place', 'eff'))
    P('\n### T2 Contrast of interface text (DOM)\n')
    P(contrast_table('items_dom', 'dom', 'raw'))
    # marks
    P("\n### T3 Contrast of the mark's side colour against its surroundings\n")
    P('Cell: median WCAG ratio / share of marks at or above 3:1 (WCAG 1.4.11, non-text), against the bare ground around the mark (g) and against what touches the colour as drawn: outline, halo, plate (s); then the share of the marks that carry their side colour at all (a solid ink within dE00 12 of it).'+chr(10))
    head = ['scene'] + [n for _, n in CFG]
    rows = []
    for sc in ['s1a', 's1b', 's1c', 's2', 's3', 's4', 's5', 's1cp', 's2p']:
        cells = []
        for c, _ in CFG:
            m = get(c, vp_of(sc), sc, 'marks')
            cells.append('–' if not m or not m.get('n_measured') else f"g {m['ground_med']:.1f} / {m['ground_share_ge3']:.0%} · s {m['surround_med']:.1f} / {m['surround_share_ge3']:.0%} · found {m['share_side_colour_found']:.0%}")
        rows.append(row(SCN[sc], cells))
    cells = []
    for c, _ in CFG:
        m = A.get(c, {}).get('marks_pooled')
        cells.append('–' if not m or not m.get('n_measured') else f"g {m['ground_med']:.1f} / {m['ground_share_ge3']:.0%} · s {m['surround_med']:.1f} / {m['surround_share_ge3']:.0%} · found {m['share_side_colour_found']:.0%} (n={m['n_measured']})")
    rows.append(row('**pooled desktop scenes S1a to S4**', cells))
    P(table(head, rows))
    # text size
    P('\n### T4 Smallest rendered text (CSS px), at 1x (desktop 1440 x 900, DPR 1) and on the phone shot (390 x 844)\n')
    rows = []
    for sc in DESK:
        cells = []
        for c, _ in CFG:
            d = A.get(c, {}).get('desktop_dpr1', {}).get(sc)
            if not d:
                cells.append('–')
                continue
            cm = d['canvas_unit'].get('size_min')
            pm = d['canvas_place'].get('size_min')
            dm = d['dom'].get('size_min')
            cells.append(f"map {f1(cm)} · places {f1(pm)} · UI {f1(dm)}")
        rows.append(row(SCN[sc] + ' (1x)', cells))
    for sc in PHONE:
        cells = []
        for c, _ in CFG:
            d = A.get(c, {}).get('phone', {}).get(sc)
            if not d:
                cells.append('–')
                continue
            cells.append(f"map {f1(d['canvas_unit'].get('size_min'))} · places {f1(d['canvas_place'].get('size_min'))} · UI {f1(d['dom'].get('size_min'))}")
        rows.append(row(SCN[sc] + ' (phone)', cells))
    P(table(['scene'] + [n for _, n in CFG], rows))
    P('\n### T4b How many text items are below 10, 11 and 12 CSS px (all desktop scenes at 1x, distinct strings per scene summed)\n')
    rows = []
    for lab, kind in (('map lettering', 'canvas_unit'), ('place names', 'canvas_place'), ('interface text', 'dom')):
        cells = []
        for c, _ in CFG:
            tot = {'n': 0, 'a': 0, 'b': 0, 'c': 0}
            for sc in DESK:
                d = A.get(c, {}).get('desktop_dpr1', {}).get(sc, {}).get(kind)
                if d and d.get('n'):
                    tot['n'] += d['n']
                    tot['a'] += d['n_lt10']
                    tot['b'] += d['n_lt11']
                    tot['c'] += d['n_lt12']
            cells.append(f"{tot['a']} / {tot['b']} / {tot['c']} of {tot['n']}")
        rows.append(row(lab, cells))
    P(table(['text'] + [n for _, n in CFG], rows))
    # density
    P('\n### T5 Density in the busiest 100 x 100 CSS-px window (busiest = most separate ink objects; windows that the page chrome covers by more than 5 % are skipped)\n')
    P('Cell: text elements (lettering + place names) / separate ink objects / marks, and the share of the window that is ink.\n')
    rows = []
    for sc in DESK[:6] + ['s5', 's1cp', 's2p']:
        cells = []
        for c, _ in CFG:
            d = get(c, vp_of(sc), sc, 'density')
            cells.append('–' if not d or d.get('window', 1) is None or 'objects' not in d else f"{d['text_all']} / {d['objects']} / {d['marks']} · {d['ink_cover']:.0%}")
        rows.append(row(SCN[sc], cells))
    P(table(['scene'] + [n for _, n in CFG], rows))
    # overlaps
    P('\n### T6 Vital-core overlaps\n')
    P('Cell: footprint overlaps (engine tiles, recomputed) / label overlaps / pins covered / body-ink core pairs (pixels, tile drawn alone) / glyph boxes covered by another mark\'s core ink.\n')
    rows = []
    for sc in DESK + PHONE:
        cells = []
        for c, _ in CFG4:
            g = get(c, vp_of(sc), sc, 'geometry')
            i = get(c, vp_of(sc), sc, 'ink')
            if not g:
                cells.append('–')
                continue
            cells.append(f"{g['footprint_overlaps']} / {g['label_overlaps']} / {g['pins_covered']} / " + (f"{i['bodyCorePairs']} / {i['textCovered']}" if i else 'n/m'))
        rows.append(row(SCN[sc], cells))
    P(table(['scene'] + [n for _, n in CFG4], rows))
    P('\n### T6b Vital-core overlaps, totals over the pixel-checked scenes (desktop S1a to S4 and the three phone scenes), every mark drawn alone\n')
    rows = []
    def tot(c, key, sub=None):
        n = 0
        for vp, scs in (('desktop', ['s1a', 's1b', 's1c', 's2', 's3', 's4']), ('phone', PHONE)):
            for sc in scs:
                d = get(c, vp, sc, key)
                if d:
                    n += d[sub] if sub else d
        return n
    for lab, key, sub in (('marks drawn alone (in view or near it)', 'ink', 'tiles'), ('pairs of marks whose ink touches at all (halo, shadow, hairline)', 'ink', 'bodySoftPairs'), ('pairs whose solid ink overlaps (>= 64/255 on both): vital-core overlaps', 'ink', 'bodyCorePairs'),
                          ('glyph boxes with another mark\'s solid ink on them', 'ink', 'textCovered'), ('pins lying on another mark\'s solid ink', 'ink', 'pinOnBodyPairs'), ('pins on pins (two units at one true position)', 'ink', 'pinPinPairs'),
                          ('leaders / crowd outlines passing under another mark\'s solid ink (drawn beneath, never over)', 'ink', None),
                          ('marks whose ink goes beyond the box the layout reserved (footprint + label) by more than 4 CSS px', 'ink_outside', 'beyond_4px'), ('... and ink that still reaches 10 CSS px out (the edge of the search window)', 'ink_outside', 'reach_10px'), ('engine footprint overlaps, all scenes', 'geometry', 'footprint_overlaps'), ('label rectangle overlaps, all scenes', 'geometry', 'label_overlaps'), ('pins covered by a footprint, all scenes', 'geometry', 'pins_covered'), ('units not represented by any mark, all scenes', 'geometry', 'unrepresented')):
        cells = []
        for c, _ in CFG4:
            if key == 'ink' and sub is None:
                n = 0
                for vp, scs in (('desktop', ['s1a', 's1b', 's1c', 's2', 's3', 's4']), ('phone', PHONE)):
                    for sc in scs:
                        d = get(c, vp, sc, 'ink')
                        if d:
                            n += d['aux']['underCore']
                cells.append(str(n))
                continue
            if key in ('geometry',):
                n = 0
                for vp, scs in (('desktop', DESK), ('phone', PHONE)):
                    for sc in scs:
                        d = get(c, vp, sc, key)
                        if d and d.get(sub) is not None:
                            n += d[sub]
                cells.append(str(n))
            else:
                cells.append(str(tot(c, key, sub)))
        rows.append(row(lab, cells))
    P(table(['count'] + [n for _, n in CFG4], rows))
    # own vs merged
    for vp in ('desktop', 'phone'):
        p = os.path.join(R, f'props-{vp}.json')
        if not os.path.exists(p):
            continue
        rows_all = json.load(open(p))
        P(f'\n### T7 Units shown as their own mark vs merged into a formation or crowd mark ({vp})\n')
        P('Share of the units inside the viewport that stand as their own mark; range over 4 ticks (295, 346, 551, 556) and 4 places (field centre, the Angle, the Wheatfield, Cemetery Hill) = 16 views per zoom. In brackets: the same share counted over every unit on the field.\n')
        rowsT = []
        for z in (13.5, 15, 16.5):
            cells = []
            for c, _ in CFG:
                d, l = c.split('-')
                rr = [r for r in rows_all if r['dir'] == d and r['look'] == l and r['zoom'] == z and r['unitsInView'] > 0]
                if not rr:
                    cells.append('–')
                    continue
                sh = np.array([r['unitsOwn'] / r['unitsInView'] for r in rr])
                allsh = np.array([r['ownAll'] / max(1, r['ownAll'] + r['mergedAll']) for r in rr])
                tot_own = sum(r['unitsOwn'] for r in rr)
                tot = sum(r['unitsInView'] for r in rr)
                cells.append(f"{tot_own / tot:.0%} (min {sh.min():.0%}, max {sh.max():.0%}) [{np.mean(allsh):.0%}]")
            rowsT.append(row(f'z{z}', cells))
        P(table(['zoom'] + [n for _, n in CFG], rowsT))
    print('\n'.join(out))


if __name__ == '__main__':
    main()

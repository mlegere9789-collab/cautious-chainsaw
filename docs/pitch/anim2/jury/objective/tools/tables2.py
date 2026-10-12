"""tables2.py - bytes, draw time, colour-vision tables.   python tables2.py > results/tables2.md"""
import json
import os
import sys
import numpy as np

sys.stdout.reconfigure(encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__))
R = os.path.join(HERE, 'results')
CFG = [('d1-night', 'D1 night'), ('d1-day', 'D1 day'), ('d2-default', 'D2'), ('d3-default', 'D3'), ('d4-paper', 'D4 paper'), ('d4-aerial', 'D4 aerial')]
CFG4 = [('d1', 'D1'), ('d2', 'D2'), ('d3', 'D3'), ('d4', 'D4')]


def table(head, rows):
    return '\n'.join(['| ' + ' | '.join(head) + ' |', '|' + '|'.join(['---'] + ['---:'] * (len(head) - 1)) + '|'] + rows)


def kb(n):
    return f'{n / 1000:,.1f} kB'


def main():
    out = []
    P = out.append
    # ---- bytes ----
    S = json.load(open(os.path.join(R, 'sizes.json')))
    P('### T8 Bytes of the skin and of its assets (snapshot of commit 9db3f4b)\n')
    P('Skin = the drawing module(s) and the token spec the page really contains; CSS = every stylesheet the page ships, without the inlined font data; fonts = the font binaries inlined in the page (base64 in the file is 4/3 of this).\n')
    rows = []
    for key, lab in (('skin_bytes', 'skin code and tokens'), ('page_css_ex_fonts', 'CSS (whole page)'), ('fonts_in_page_binary', 'fonts (binary)')):
        rows.append('| ' + lab + ' | ' + ' | '.join(kb(S[k][key]) for k, _ in CFG4) + ' |')
    tot = {k: S[k]['skin_bytes'] + S[k]['page_css_ex_fonts'] + S[k]['fonts_in_page_binary'] for k, _ in CFG4}
    rows.append('| **skin + CSS + fonts** | ' + ' | '.join(f'**{kb(tot[k])}**' for k, _ in CFG4) + ' |')
    rows.append('| of which fonts: files | ' + ' | '.join(str(len(S[k]['fonts'])) for k, _ in CFG4) + ' |')
    rows.append('| ground/place-name code of the direction (info) | ' + ' | '.join(kb(S[k]['ground_bytes']) for k, _ in CFG4) + ' |')
    rows.append('| whole page, raw | ' + ' | '.join(kb(S[k]['page_bytes']) for k, _ in CFG4) + ' |')
    rows.append('| whole page, gzip -9 | ' + ' | '.join(kb(S[k]['page_gzip']) for k, _ in CFG4) + ' |')
    P(table(['bytes'] + [n for _, n in CFG4], rows))
    P(f"\nShared by all four: the aerial tiles, {S['_shared']['basemap_assets_files']} files, {S['_shared']['basemap_assets_bytes'] / 1e6:.2f} MB on disk.\n")
    nf = os.path.join(R, 'net.json')
    if os.path.exists(nf):
        N = json.load(open(nf))
        P('\n### T8b What a cold session really fetches (local server, no compression)\n')
        rows = []
        for ph, lab in (('load_and_field', 'page load + field overview z13.5'), ('then_closeup', 'then close-up z16.5 at the Angle'), ('all', 'total')):
            cells = []
            for c, _ in CFG:
                n = N.get(c, {}).get(ph)
                cells.append('–' if not n else f"{n['total']['bytes'] / 1e6:.2f} MB / {n['total']['files']} files" + (f" (tiles {n['tiles']['bytes'] / 1e6:.2f} MB)" if 'tiles' in n else ''))
            rows.append('| ' + lab + ' | ' + ' | '.join(cells) + ' |')
        P(table(['fetched'] + [n for _, n in CFG], rows))
    # ---- perf ----
    pf = os.path.join(R, 'perf-rows.jsonl')
    if os.path.exists(pf):
        rows_all = [json.loads(l) for l in open(pf) if l.strip()]
        dens = next((r['_densest'] for r in rows_all if r.get('_densest')), None)
        env = next((r['_env'] for r in rows_all if r.get('_env')), None)
        P(f"\n### T9 Draw time per frame at the densest tick (tick {dens['best']['tick']}, {dens['best']['n']} units on the field)\n" if dens else '\n### T9 Draw time\n')
        if env:
            P(f"Machine: {env['cores']} logical cores; WebGL renderer string: {env['gl']}; headless Chrome (software or GPU raster as the machine decides; the numbers are relative between directions, not absolute for a user's device).\n")
        views = ['field-z13.5', 'angle-z15', 'angle-z16.5']
        for setn, lab in (('dpr2cpu1', 'DPR 2, no CPU throttle (the reference)'), ('dpr2cpu4', 'DPR 2, CPU throttled 4x (a mid-range device)')):
            rs = [r for r in rows_all if r['set'] == setn]
            if not rs:
                continue
            P(f'\n**{lab}.** Cell: draw time in ms, median / p95. "JS" = `renderer.draw()` call time over the frames of a real-time play across the densest tick (the page runs its own animation loop; about 420 frames); "still" = the same draw on a still frame with a one-pixel read-back forced so that the canvas work has really finished (200 draws); tiles = marks drawn.\n')
            rows = []
            for v in views:
                cells = []
                for c, _ in CFG:
                    d, l = c.split('-')
                    r = next((q for q in rs if q['dir'] == d and q['look'] == l and q['view'] == v), None)
                    if not r:
                        cells.append('–')
                        continue
                    pl = r['play']
                    cells.append(f"JS {pl['draw_js']['med']:.1f} / {pl['draw_js']['p95']:.1f} · still {r['draw_flush']['med']:.0f} / {r['draw_flush']['p95']:.0f} · {r['tiles']} tiles")
                rows.append(f'| {v} | ' + ' | '.join(cells) + ' |')
            P(table(['view'] + [n for _, n in CFG], rows))
            P('\nSame runs: the ground alone (skin switched off) on a still frame, median ms (the share of "still" that belongs to the ground, not to the direction), engine step (layout and motion) median / p95 ms, frame rate and share of frames over 20 ms in the play:\n')
            rows = []
            for v in views:
                cells = []
                for c, _ in CFG:
                    d, l = c.split('-')
                    r = next((q for q in rs if q['dir'] == d and q['look'] == l and q['view'] == v), None)
                    if not r:
                        cells.append('–')
                        continue
                    pl = r['play']
                    cells.append(f"ground {r['ground_only_flush']['med']:.0f} · step {pl['step_ms']['med']:.1f} / {pl['step_ms']['p95']:.1f} · {pl['fps']:.0f} fps · {pl['over20ms']:.0%} > 20 ms")
                rows.append(f'| {v} | ' + ' | '.join(cells) + ' |')
            P(table(['view'] + [n for _, n in CFG], rows))
        rp = os.path.join(R, 'perf-rows-rep.jsonl')
        if os.path.exists(rp):
            rep = [json.loads(l) for l in open(rp) if l.strip()]
            P('\n**How repeatable the timing is.** The same measurement a second time, later the same day (run 1 / run 2): JS draw time median, still-frame draw median with read-back, and frames per second of the play; field z13.5 at the densest tick.\n')
            rows = []
            for setn, lab in (('dpr2cpu1', 'DPR 2, no throttle'), ('dpr2cpu4', 'DPR 2, 4x throttle')):
                cells = []
                for c, _ in CFG:
                    d, l = c.split('-')
                    a = next((q for q in rows_all if q['dir'] == d and q['look'] == l and q['set'] == setn and q['view'] == 'field-z13.5'), None)
                    b = next((q for q in rep if q['dir'] == d and q['look'] == l and q['set'] == setn and q['view'] == 'field-z13.5'), None)
                    cells.append('–' if not (a and b) else f"JS {a['play']['draw_js']['med']:.1f} / {b['play']['draw_js']['med']:.1f} ms · still {a['draw_flush']['med']:.0f} / {b['draw_flush']['med']:.0f} ms · {a['play']['fps']:.0f} / {b['play']['fps']:.0f} fps")
                rows.append(f'| {lab} | ' + ' | '.join(cells) + ' |')
            P(table(['run'] + [n for _, n in CFG], rows))
    # ---- colour vision ----
    P('\n### T10 Can the two sides be told apart without colour vision? (CIEDE2000 of the side colours as rendered)\n')
    P('Side colours are measured from the pixels of the isolated marks (the solid ink that most separates the Union marks from the Confederate marks, pooled over S1a to S4); the simulation is Machado et al. 2009 at severity 1.0 on linear RGB. dE00 1 is the smallest visible difference; about 10 is a clear difference for two large patches, and marks are small. Cell: side against side / the smaller of the two sides against the ground behind its marks (median over marks).\n')
    rows = []
    for kind in ('normal', 'protanopia', 'deuteranopia', 'tritanopia'):
        cells = []
        for c, _ in CFG:
            f = os.path.join(R, f'an-{c}.json')
            A = json.load(open(f)) if os.path.exists(f) else {}
            cv = A.get('cvd')
            if not cv:
                cells.append('–')
                continue
            sm = cv['sims'][kind]
            g = [sm[k]['med'] for k in ('vs_ground_union', 'vs_ground_confederate') if k in sm]
            cells.append(f"{sm['side_vs_side']:.1f} / {min(g):.1f}" if g else f"{sm['side_vs_side']:.1f} / –")
        rows.append(f'| {kind} | ' + ' | '.join(cells) + ' |')
    P(table(['vision'] + [n for _, n in CFG], rows))
    rows = []
    for side in ('union', 'confederate'):
        cells = []
        for c, _ in CFG:
            f = os.path.join(R, f'an-{c}.json')
            A = json.load(open(f)) if os.path.exists(f) else {}
            sd = A.get('sides')
            cells.append('–' if not sd else 'rgb(' + ', '.join(str(v) for v in sd[side]['rgb']) + f") score {sd[side]['score']:.2f}")
        rows.append(f'| {side} colour | ' + ' | '.join(cells) + ' |')
    P('\nThe side colours that were measured (score = share of that side\'s solid ink in that colour minus the other side\'s share):\n')
    P(table(['side'] + [n for _, n in CFG], rows))
    print('\n'.join(out))


if __name__ == '__main__':
    main()

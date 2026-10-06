"""agg-summary.py <r-agg.json>  - summarises the 'units inside counted tiles' probe: share by setting and zoom, and at zoom 13.5 what the counted tiles are named (formation / contact / lead)."""
import json, sys, collections
d = json.load(open(sys.argv[1]))
rows = d['rows']
cfgs = []
for r in rows:
    k = (r['style'], r['set'])
    if k not in cfgs: cfgs.append(k)
zooms = sorted({r['zoom'] for r in rows})
print('share of units on the field that sit inside a counted tile (mean over %d ticks; max in brackets)' % len(d['ticks']))
print('%-34s' % 'setting' + ''.join('%14s' % ('z' + str(z)) for z in zooms))
for k in cfgs:
    line = '%-34s' % (k[0] + ' ' + k[1])
    for z in zooms:
        rr = [r for r in rows if (r['style'], r['set']) == k and r['zoom'] == z]
        m = sum(r['shareAgg'] for r in rr) / len(rr); mx = max(r['shareAgg'] for r in rr)
        line += '%14s' % ('%.0f%% (%.0f%%)' % (100 * m, 100 * mx))
    print(line)
print()
for z in (13.5,):
    for k in cfgs:
        rr = [r for r in rows if (r['style'], r['set']) == k and r['zoom'] == z]
        tot = collections.Counter(); mixed = 0; allagg = 0; units = 0; tiles = 0
        for r in rr:
            for kk, v in r['kinds'].items(): tot[kk] += v
            mixed += r['mixedUnits']; allagg += r['unitsInAgg']; units += r['leaves'] + r['unitsInAgg']; tiles += r['tiles']
        print('zoom', z, k, 'tiles/tick %.0f' % (tiles / len(rr)), 'units/tick %.0f' % (units / len(rr)), 'merged unit-observations', allagg, '| by name kind:', {kk: '%.0f%%' % (100 * v / allagg) for kk, v in tot.most_common()}, '| mixed-side units %.0f%%' % (100 * mixed / allagg))

"""lanes.geojson from the hand traces on sheet 'a' (traces_a.json) with registration regtf.FieldTF. Each trace is a lane section; confidence follows the drawing and the NPS text."""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from geomlib import *
from sources import S
import regtf, lanes_inventory
af = regtf.FieldTF()
INV = {l['id']: l for l in lanes_inventory.L}
CONF = {'LN-001w': ('Documented', 25), 'LN-001e': ('Estimated', 40), 'LN-004': ('Documented', 25), 'LN-010': ('Documented', 25)}
def build():
    T = json.load(open(os.path.join(OUT, 'traces_a.json')))['traces']; feats = []
    for k, t in T.items():
        coords = [list(af.px2ll(x, y)) for x, y in t['px']]
        inv = INV[t['lane']]; conf, err = CONF.get(k, ('Estimated', 30))
        srcs = list(inv['sources']) + [dict(cite='Map of the battle field of Gettysburg (Bachelder 1876, topography from Warren 1868-69), sheet cw0325000a', sheet_or_page='First day sheet; vertices read by eye on gridded crops (traces_a.json, trace %s)' % k, url='https://www.loc.gov/item/99447491/', type='A1',
                                         quote_or_paraphrase=t['draw'] + '.', key='LOC-BACH-1876')]
        feats.append({'type': 'Feature', 'id': k, 'properties': {'id': k, 'category': 'lane', 'subtype': 'farm or neighbourhood lane (traced from the period map)', 'name': t['name'], 'name_modern': '', 'present_1863': True,
            'period_note': inv['route_1863'] + ' Status today: ' + inv['status_today'], 'sources': srcs,
            'method': 'Vertices read by eye on a gridded crop of the Bachelder/Warren sheet (50 percent LOC render, 1.8x, reading error about 4 px = 8 m) and converted to ground with the sheet-a registration (registration_sheet_a.json: leave-one-out error 15-19 m); positional error is their combination.',
            'positional_error_m': err, 'confidence': conf, 'notes': t.get('conf_note', ''), 'lane_id': t['lane']}, 'geometry': {'type': 'LineString', 'coordinates': coords}})
    return feats
if __name__ == '__main__':
    f = build()
    for x in f: round_geom(x['geometry'])
    write_pair(os.path.join(OUT, 'lanes'), f, 'lanes_1863')
    print(len(f), 'lane traces', [(x['id'], round(length_m(shape(x['geometry']))) ) for x in f])

"""Build roads.geojson (+ mercator copy) from spec_roads.ROADS; verification results (verification_roads.json) are merged when present."""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from geomlib import *
import spec_roads
OUTDIR = os.path.join(OUT)
def load_p5():
    p = os.path.join(OUT, 'verification', 'pass5_map_presence.json')
    return json.load(open(p))['results'] if os.path.exists(p) else {}
P5 = load_p5()
def load_verif():
    p = os.path.join(OUT, 'verification_roads.json')
    return json.load(open(p)) if os.path.exists(p) else {}
def build():
    ver = load_verif(); feats = []; idmap = {}
    for r in spec_roads.ROADS:
        edges = [(p, g) for (p, g) in tiger_lines(ids=set(r['tiger']))]
        found = {p['linearid'] for p, g in edges}
        missing = set(r['tiger']) - found
        if missing: print('WARNING', r['id'], 'missing TIGER ids', missing)
        geom = merge_lines([g for p, g in edges], clip=XBOX)
        L = length_m(geom)
        v = dict(ver.get(r['id'], {}))
        pm = P5.get(r['id'], {})
        if pm.get('samples', 0) >= 4 and pm.get('detection_rate') is not None:
            v.setdefault('sources', [])
            v['sources'] = list(v['sources']) + [dict(cite='Map of the battle field of Gettysburg (Bachelder 1876, topography from Warren 1868-69), sheet cw0325000a', sheet_or_page='First day sheet; automatic presence check scripts/map_check.py (verification/pass5_map_presence.json)', url='https://www.loc.gov/item/99447491/', type='A1',
                quote_or_paraphrase='A drawn double line (road) was found along %d%% of %d samples (40 m spacing) of this road within +-16 px of the registered position; the same test displaced 110-140 px sideways finds one in %d%%; median lateral offset %s m, 90th percentile %s m.' % (round(100 * pm['detection_rate']), pm['samples'], round(100 * pm['control_rate']), pm['median_offset_m'], pm['p90_abs_offset_m']), key='LOC-BACH-1876')]
            if pm['detection_rate'] >= 0.4 and pm['control_rate'] <= 0.2:
                v['confidence'] = 'Documented' if (r['sources'] and not r.get('map_only')) else 'Estimated'
                v['positional_error_m'] = int(max(15, min(35, pm.get('p90_abs_offset_m') or 25)))
            if r.get('map_only'):
                v['notes'] = 'Known only from the sheet (surveyed 1868-69) and the modern map: the sheet does not date the road to July 1863.'
        feats.append({'type': 'Feature', 'id': r['id'], 'properties': {
            'id': r['id'], 'category': 'road', 'subtype': r['subtype'], 'name': r['name'], 'name_modern': r['name_modern'],
            'present_1863': (True if (r.get('present', True) is None and v.get('confidence') in ('Documented', 'Estimated')) else r.get('present', True)), 'period_note': r['period_note'], 'sources': r['sources'] + v.get('sources', []),
            'method': v.get('method') or 'Centreline of TIGER/Line 2023 edge(s) %s clipped to the map box; taken as the 1863 alignment (modern centreline) pending the period-map check.' % ', '.join(r['tiger']),
            'positional_error_m': v.get('positional_error_m', 25), 'confidence': v.get('confidence', 'Unknown' if r.get('present', True) is None else 'Estimated'),
            'notes': v.get('notes', ''), 'tiger_ids': r['tiger'], 'length_m_in_box': round(L)}, 'geometry': mapping(geom)})
        idmap[r['id']] = r['tiger']
    return feats
if __name__ == '__main__':
    feats = build()
    for f in feats: round_geom(f['geometry'])
    write_pair(os.path.join(OUT, 'roads'), feats, 'roads_1863')
    print(len(feats), 'road features;', sum(f['properties']['length_m_in_box'] for f in feats) / 1000, 'km')

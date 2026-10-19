"""Build roads.geojson (+ mercator copy) from spec_roads.ROADS; verification results (verification_roads.json) are merged when present."""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from geomlib import *
import spec_roads
OUTDIR = os.path.join(OUT)
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
        v = ver.get(r['id'], {})
        feats.append({'type': 'Feature', 'id': r['id'], 'properties': {
            'id': r['id'], 'category': 'road', 'subtype': r['subtype'], 'name': r['name'], 'name_modern': r['name_modern'],
            'present_1863': True, 'period_note': r['period_note'], 'sources': r['sources'] + v.get('sources', []),
            'method': v.get('method') or 'Centreline of TIGER/Line 2023 edge(s) %s clipped to the map box; taken as the 1863 alignment (modern centreline) pending the period-map check.' % ', '.join(r['tiger']),
            'positional_error_m': v.get('positional_error_m', 25), 'confidence': v.get('confidence', 'Estimated'),
            'notes': v.get('notes', ''), 'tiger_ids': r['tiger'], 'length_m_in_box': round(L)}, 'geometry': mapping(geom)})
        idmap[r['id']] = r['tiger']
    return feats
if __name__ == '__main__':
    feats = build()
    for f in feats: round_geom(f['geometry'])
    write_pair(os.path.join(OUT, 'roads'), feats, 'roads_1863')
    print(len(feats), 'road features;', sum(f['properties']['length_m_in_box'] for f in feats) / 1000, 'km')

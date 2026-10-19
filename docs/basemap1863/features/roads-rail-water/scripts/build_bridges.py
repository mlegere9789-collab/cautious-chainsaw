"""Crossings of the catalogued 1863 roads with named NHD streams -> bridge or ford features (points).
NPS (2004): by 1863 bridges had been built along the main turnpikes and state roads; nearly all local and internal circulation features used fords (pdf p79).
Rule: a crossing of a turnpike or county road with a named perennial stream is 'bridge (class rule)'; a crossing of a township road or lane is 'ford (class rule)'.
Positions are the TIGER x NHD intersection (error 30 m along the road); the map symbol check refines them (verification_bridges.json)."""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from geomlib import *
from sources import S
import spec_roads

BRIDGE_CLASSES = ('turnpike', 'county road')
NAMED = ('Rock Creek', 'Willoughby Run', 'Marsh Creek', 'Plum Run', 'White Run', 'Stevens Run', 'Littles Run', 'Little Marsh Creek')

VER = json.load(open(os.path.join(OUT, 'verification', 'pass_bridges.json')))['readings'] if os.path.exists(os.path.join(OUT, 'verification', 'pass_bridges.json')) else {}
def build():
    roads = json.load(open(os.path.join(OUT, 'roads.geojson')))['features']
    nhd = json.load(open(os.path.join(CACHE, 'nhd_6.geojson')))['features']
    streams = [(f['properties']['gnis_name'], shape(f['geometry'])) for f in nhd if f['properties'].get('gnis_name') in NAMED and f['properties'].get('fcode') == 46006 and f['geometry']['type'] == 'LineString']
    out = []; n = 0
    for rf in roads:
        rg = shape(rf['geometry']); sub = rf['properties']['subtype']
        for sn, sg in streams:
            ix = rg.intersection(sg)
            pts = [ix] if ix.geom_type == 'Point' else [g for g in getattr(ix, 'geoms', []) if g.geom_type == 'Point']
            for p in pts:
                if not in_xbox(p.x, p.y): continue
                n += 1
                bridge = sub in BRIDGE_CLASSES
                unk = (sn == 'Stevens Run')   # inside the borough: the 1863 crossing type is not established by any source read
                out.append({'type': 'Feature', 'id': 'BR-%03d' % n, 'properties': {
                    'id': 'BR-%03d' % n, 'category': 'crossing' if unk else ('bridge' if bridge else 'ford'), 'subtype': ('crossing (type unknown)' if unk else ('bridge (class rule)' if bridge else 'ford (class rule)')),
                    'name': '%s over %s' % (rf['properties']['name'].split(' (')[0].split(',')[0], sn), 'name_modern': '', 'present_1863': True,
                    'period_note': 'Crossing of the 1863 road %s with %s.' % (rf['id'], sn),
                    'sources': [S('NPS-TREAT-2004', 'pdf p79 (ford section)', 'By 1863 bridges had been built along the main turnpikes and state roads in Adams County; nearly all local and internal circulation features (county roads, lanes, field and wood access lanes) used fords.' if True else '')],
                    'method': 'Intersection of the catalogued road centreline (%s) with the NHD flowline of %s; type from the road class.' % (rf['id'], sn),
                    'positional_error_m': 30, 'confidence': 'Unknown' if unk else 'Estimated',
                    'notes': 'Whether a bridge or a ford stood at this exact crossing in July 1863 is NOT established by a source naming this crossing; the class rule is the only support until the period-map symbol is read (verification_bridges.json).',
                    'road_id': rf['id'], 'stream': sn, 'period_map_symbol': VER.get('BR-%03d' % n, {}).get('symbol', 'not examined')}, 'geometry': {'type': 'Point', 'coordinates': [round(p.x, 6), round(p.y, 6)]}})
    for f in out:
        v = VER.get(f['id'], {}); p = f['properties']
        if v.get('symbol') in ('seen', 'probable') and p['category'] == 'bridge':
            p['confidence'] = 'Documented' if v['symbol'] == 'seen' else 'Estimated'
            p['subtype'] = 'bridge (symbol on the Bachelder/Warren sheet)' if v['symbol'] == 'seen' else 'bridge (probable symbol on the Bachelder/Warren sheet)'
            p['sources'].append(dict(cite='Map of the battle field of Gettysburg (Bachelder 1876, topography from Warren 1868-69), sheet cw0325000a', sheet_or_page='First day sheet, crop at ' + str(f['geometry']['coordinates']), url='https://www.loc.gov/item/99447491/', type='A1', quote_or_paraphrase=v['note'], key='LOC-BACH-1876'))
            p['notes'] = 'Bridge symbol identified on the period map near this crossing (verification/pass_bridges.json); the position is the modern road x stream crossing (error 30 m).'
        elif v.get('symbol') == 'unclear':
            p['notes'] += ' Period-map reading: ' + v['note'] + '.'
    return out

if __name__ == '__main__':
    feats = build()
    write_pair(os.path.join(OUT, 'bridges'), feats, 'bridges_fords_1863')
    print(len(feats), 'crossings')
    for f in feats: print(f['id'], f['properties']['subtype'], f['properties']['name'], f['geometry']['coordinates'])

"""Build railways.geojson (1863 and post-1863 lines, flagged), fences.geojson (OSM-mapped NPS fences and walls on candidate 1863 lines)."""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from geomlib import *
from sources import S

def ways(ids):
    o = osm(); out = []
    for i in ids:
        e = o.get(i)
        if e: out.append(LineString(osm_coords(e)))
    return out

RAIL = [
 dict(id='RL-001', name='Gettysburg Railroad (Hanover Junction, Hanover and Gettysburg Railroad), Gettysburg to the east', subtype='railway (completed, in service)', present=True,
      osm=[391694055, 493786763, 493786764], conf='Estimated', err=30,
      period_note='completed 1858 from Hanover and Hanover Junction to the Carlisle Street station (the Lincoln Railroad Station, built 1858-59); in service in 1863',
      sources=[S('NPS-CLI-GETT', 'pdf p64', 'By 1863 railroad tracks for the Gettysburg and Hanover Railroad had reached the town from the east.'),
               S('NPS-TREAT-2004', 'pdf p19, fig. 2-1 caption', 'The Hanover and Gettysburg Railroad reached Gettysburg in 1858.'),
               S('OSM', 'way 453171438', 'Building "Lincoln Railroad Station", 35 Carlisle St, start_date 1858/May, "Built in 1859 by the Hanover Junction Railroad".')],
      method='Centreline of the modern CSX Hanover Subdivision (OSM ways 391694055, 493786763, 493786764) east of the Carlisle Street station, assumed to follow the 1858 line; the Bachelder/Warren sheet shows the line leaving the borough north-east (check pending).',
      notes='Alignment of the 1858 line in the borough and on the first miles east is taken from the modern track bed; realignments since 1863 are not excluded.'),
 dict(id='RL-002', name='Unfinished Gettysburg Railroad grade west of the borough (the Railroad Cuts)', subtype='railway grade (graded, no track laid)', present=True,
      osm=[1078695840, 1078695841, 702107202, 781044358, 1212407684, 1383353951, 1383353952], conf='Estimated', err=40,
      period_note='the roadbed west of Gettysburg was graded (cuts through Seminary Ridge and East and West McPherson Ridges) but no track was laid by July 1863; used as a wagon road and as an avenue of approach on 1 July',
      sources=[S('NPS-CLI-GETT', 'pdf p64', 'In the area of the first day\'s battlefield grading had been completed to extend the line westward although the tracks had not been laid by the time of the battle.'),
               S('NPS-TREAT-2004', 'pdf p19-20 and p23-24', 'The construction of the Hanover and Gettysburg Railroad bed west of Gettysburg created three deep cuts (Seminary Ridge, East and West McPherson Ridge); the line was unfinished in 1863 and was used as a wagon road; Johnson\'s division used the cuts as an avenue of approach on the evening of 1 July.')],
      method='Centreline of the modern CSX Hanover Subdivision west of the borough (OSM ways listed), which was laid on the 1863 grade after 1863; the Bachelder/Warren sheet draws the grade as a straight line north of the Chambersburg Pike (check pending).',
      notes='The modern rails and ties are not 1863; only the grade (cuts and embankments) existed. The west end of the 1863 grade is not established by the sources read; the line is drawn only to the edge of the map box.'),
 dict(id='RL-003', name='Round Top Branch (Gettysburg and Harrisburg Railway spur to the Round Top area)', subtype='railway (post-1863)', present=False,
      osm=[96575925, 1117498844, 1117498845, 1117498846, 1117498847], conf='Documented', err=20,
      period_note='built 1884 (right of way across the Codori farm granted 1884); tracks removed 1942-43',
      sources=[S('NPS-CLI-EMM', 'pdf p89', 'In 1884 Simon J. Codori granted a right of way across his farm to the Gettysburg and Harrisburg Railway Company for the Round Top Railroad; in 1942-1943 the remaining rail lines were removed and the right of way regraded.'),
               S('OSM', 'ways 96575925, 1117498844-47', 'Abandoned "Round Top Branch" alignment.')],
      method='OSM abandoned-railway ways (Round Top Branch).', notes='Not present in 1863: remove from the imagery (the right of way was regraded and revegetated in 1942-43).'),
 dict(id='RL-004', name='Gettysburg Electric Railway (trolley) along Emmitsburg Road to Wheatfield Road and the Round Tops', subtype='railway (post-1863)', present=False, osm=[], conf='Documented', err=None,
      period_note='in operation from 1893 (CLI) and ceased operating in 1916 (CLI)',
      sources=[S('NPS-CLI-EMM', 'pdf p89', 'The Gettysburg Electric Railway bordered the project area beginning in 1893 along the western side of Emmitsburg Road to Wheatfield Road.'),
               S('NPS-CLI-EMM', 'pdf p90', 'In 1916 the adjacent electric railroad ceased operations.')],
      method='No geometry stored: the line ran on the western edge of the Emmitsburg Road; its remains are not mapped in the open data used here.', notes='Geometry not captured; listed so that the removal step does not treat it as 1863.'),
 dict(id='RL-005', name='Reading (Gettysburg and Harrisburg Railroad) depot 1884 and later rail spurs and sidings in the borough', subtype='railway (post-1863)', present=False,
      osm=[11798201, 11798363, 11798456, 11798476, 11798594, 11798864, 11800360, 369320732, 369320739, 369320742, 369320744, 369320745, 369320748, 413221947, 889740729, 96575913, 391694059, 1012082871, 1012082872, 821626589],
      conf='Estimated', err=20, period_note='the Reading depot was built 1884 (OSM description); no source read dates the spurs, sidings and the Gettysburg and Northern line for 1863, so they are treated as not shown',
      sources=[S('OSM', 'way 842280072', 'Former Reading Railroad Station built in 1884 (OSM description).'), S('OSM', 'ways (spurs, sidings, Gettysburg and Northern Railroad)', 'Modern spur and siding geometry; operator Gettysburg and Northern Railroad on some ways.')],
      method='OSM railway ways other than the main Hanover Subdivision line.', notes='Spurs and sidings are treated as post-1863 unless a dated source places them in 1863; confidence Estimated.'),
]

FENCE_KEEP = {'split_rail': 'post and rail or worm fence (NPS reconstruction mapped by OSM)', 'dry_stone': 'dry-laid stone wall (mapped by OSM)', 'drystone_wall': 'dry-laid stone wall (mapped by OSM)'}

def build_rail():
    feats = []
    for r in RAIL:
        geoms = ways(r['osm'])
        g = merge_lines(geoms, clip=XBOX) if geoms else None
        feats.append({'type': 'Feature', 'id': r['id'], 'properties': {
            'id': r['id'], 'category': 'railroad', 'subtype': r['subtype'], 'name': r['name'], 'name_modern': '', 'present_1863': r['present'], 'period_note': r['period_note'],
            'sources': r['sources'], 'method': r['method'], 'positional_error_m': r['err'], 'confidence': r['conf'], 'notes': r['notes'], 'osm_way_ids': r['osm'],
            'length_m_in_box': round(length_m(g)) if g is not None else 0}, 'geometry': mapping(g) if g is not None else None})
    return feats

def build_fences():
    feats = []; n = 0
    for e in osm_fence().values():
        t = e['tags']
        if e['type'] != 'way': continue
        b = t.get('barrier'); ft = t.get('fence_type')
        key = None
        if b == 'fence' and ft in FENCE_KEEP: key = ft
        elif b == 'wall' and t.get('wall') in (None, 'dry_stone', 'stone', 'drystone'): key = 'dry_stone'
        if not key: continue
        c = osm_coords(e)
        if not all(in_xbox(*q) for q in c): continue
        n += 1
        feats.append({'type': 'Feature', 'id': 'FN-%04d' % n, 'properties': {
            'id': 'FN-%04d' % n, 'category': 'fence', 'subtype': FENCE_KEEP.get(key, 'stone wall'), 'name': t.get('name') or '', 'name_modern': '', 'present_1863': None,
            'period_note': 'A fence or wall is mapped here today; whether it stands on an 1863 fence line is decided by the period-map check (verification_fences.json).',
            'sources': [S('OSM', 'way %s' % e['id'], 'barrier=%s fence_type=%s' % (b, ft)), S('NPS-TREAT-2004', 'pdf p69', 'NPS rebuilds fences in the 1863 styles along documented 1863 fence lines (worm, post and rail, stone wall, stone and rail, stone and rider); about 39.1 miles of 1863 fences were lost park-wide.')],
            'method': 'OSM way %s geometry (modern mapped line).' % e['id'], 'positional_error_m': 10, 'confidence': 'Unknown',
            'notes': 'Candidate only until verified.', 'osm_way_id': e['id'], 'length_m': round(line_len(c))},
            'geometry': {'type': 'LineString', 'coordinates': [list(q) for q in c]}})
    return feats

if __name__ == '__main__':
    rf = build_rail()
    for f in rf:
        if f['geometry']: round_geom(f['geometry'])
    # features without geometry are kept in the properties-only listing
    write_pair(os.path.join(OUT, 'railways'), [f for f in rf if f['geometry']], 'railways_1863')
    json.dump([f['properties'] for f in rf if not f['geometry']], open(os.path.join(OUT, 'railways_no_geometry.json'), 'w'), indent=1)
    ff = build_fences()
    for f in ff: round_geom(f['geometry'])
    write_pair(os.path.join(OUT, 'fences'), ff, 'fences_candidates')
    print(len(rf), 'rail features;', len(ff), 'fence candidates')

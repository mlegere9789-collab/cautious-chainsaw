"""Springs, ponds, mill dams, wetlands (points and polygons) for the waterways file (appended as category 'water feature').
Everything here has a named source; extents that the sources do not give are marked Estimated with the stated uncertainty, or Unknown."""
import json, os, sys, math
sys.path.insert(0, os.path.dirname(__file__))
from geomlib import *
from shapely.ops import substring, nearest_points
from shapely.geometry import MultiPolygon
from sources import S, SRC

def along(line_m, p_m, dist, direction):
    """Point on a UTM line at `dist` metres from the projection of p_m, toward the line start (-1) or end (+1)."""
    d0 = line_m.project(p_m); d = d0 + direction * dist
    d = max(0, min(line_m.length, d)); return line_m.interpolate(d)

def build():
    feats = []; n = [0]
    def add(cat, sub, name, geom, present, period, sources, method, err, conf, notes):
        n[0] += 1; i = 'WF-%03d' % n[0]
        feats.append({'type': 'Feature', 'id': i, 'properties': {'id': i, 'category': cat, 'subtype': sub, 'name': name, 'name_modern': '', 'present_1863': present,
            'period_note': period, 'sources': sources, 'method': method, 'positional_error_m': err, 'confidence': conf, 'notes': notes}, 'geometry': (mapping(geom) if geom is not None else None)})
    nhd = json.load(open(os.path.join(CACHE, 'nhd_6.geojson')))['features']
    def named(nm):
        return [shape(f['geometry']) for f in nhd if f['properties'].get('gnis_name') == nm and f['properties'].get('fcode') == 46006 and f['geometry']['type'] == 'LineString']
    # Spangler's Spring
    add('spring', 'improved spring', "Spangler's Spring", Point(-77.2172953, 39.8145311), True,
        "Improved natural spring at the foot of Culp's Hill; Union and Confederate soldiers drank here; 1870 Tipton photograph shows its probable appearance",
        [S('NPS-HBM-1958', 'documentation grid 3I (pdf p8-9)', "Spangler's Spring in position indicated on the [Warren] map; see the 1940 report 'Proposed Restoration of the Spangler's Spring - Culp's Hill Area' and a Tipton photograph of 1870 for its probable appearance."),
         S('NPS-TREAT-2004', 'pdf p77 fig. 2-44', "Spangler's Spring, ca. 1880s-1890s, 'seen here much as it appeared at the time of the battle'."),
         S('OSM', 'way 778735889 (historic=ruins, name Spangler\'s Spring)', 'Position of the spring structure as mapped today.')],
        'Position of the OSM-mapped spring ruin (way 778735889 centre); cross-checked in the text against the Warren map position by the 1958 NPS review, not re-measured on the map here.', 20, 'Documented',
        'The 1863 structure is not drawn: only the spring position is given.')
    # Biesecker pond / McPherson pond
    add('pond', 'farm pond', 'McPherson pond (Edward McPherson farm)', None, True,
        'One of only two identified ponds on the 1863 battlefield; it disrupted Col. Roy Stone\'s brigade on 1 July; it still exists',
        [S('NPS-TREAT-2004', 'pdf p78 and p79', 'There were only two identified ponds on the battlefield in 1863: the McPherson pond, which still exists, and a large pond at the John Biesecker farm, later removed by D. D. Eisenhower; the McPherson pond disrupted Stone\'s brigade on 1 July.')],
        'No geometry: the sources read name the pond but give no coordinates (the McPherson farm barn is OSM way 711545174 at 39.8369, -77.2513); the pond outline is NOT located by this layer.', 150, 'Unknown',
        'Position not established by a source read here; do not draw until located.')
    add('pond', 'farm pond (removed)', 'Large pond at the John Biesecker farm', None, True,
        'Removed later by D. D. Eisenhower',
        [S('NPS-TREAT-2004', 'pdf p78', 'A large pond at the John Biesecker Farm, which was later removed by D. D. Eisenhower.')],
        'No geometry: the pond is named by NPS but its position is not given in the sources read; a modern NHD waterbody exists near the Taneytown Road south of the borough but the identification is NOT established.', 400, 'Unknown',
        'Do not draw: the location is unverified.')
    # Mill dams on Rock Creek (650 yards north of the Baltimore Pike)
    rc = named('Rock Creek')
    if rc:
        from shapely.ops import linemerge
        m = linemerge([utm_line(g) for g in rc])
        cross = utm_pt(-77.211278, 39.805018)
        # direction: upstream = north (higher northing)
        line = m if m.geom_type == 'LineString' else max(m.geoms, key=lambda g: g.length)
        d0 = line.project(cross); a = line.interpolate(d0 + 594.0); b = line.interpolate(d0 - 594.0)
        up = a if a.y > b.y else b
        ll = Point(*m2ll(up.x, up.y))
        add('dam', 'mill dam (two dams)', "McAllister mill dams on Rock Creek", ll, True,
            'Two dams approximately 650 yards north of the Baltimore Pike backed up a pond "from one-half to three-quarters of a mile" and put Rock Creek 6 to 8 feet deep at the mill pond',
            [S('NPS-TREAT-2004', 'pdf p78-79', 'Only two known dams existed on the battlefield, on Rock Creek approximately 650 yards north of the Baltimore Pike, part of the McAllister Mill complex; the dams raised a sheet of water stretching 1/2 to 3/4 mile upstream.')],
            'Point on the NHD Rock Creek flowline 594 m (650 yd) upstream (north) of the Baltimore Pike crossing; the dam sites are not surveyed here.', 100, 'Estimated',
            'The distance is NPS\'s round figure; the dams are archaeological sites today.')
    # Plum Run wetland ("Valley of Death")
    pr = [g for g in named('Plum Run')]
    if pr:
        sel = []
        for g in pr:
            gg = g.intersection(box(-77.2440, 39.7905, -77.2370, 39.7965))
            if not gg.is_empty: sel.append(gg)
        if sel:
            u = unary_union(sel); poly = utm_poly(u, 25.0)
            add('wetland', 'marsh', 'Plum Run wetland (Valley of Death), northern and central sections', poly, True,
                'Marsh "about 50 yards wide, ankle-deep and miry" crossed by the 40th New York and 2nd U.S. on 2 July',
                [S('NPS-TREAT-2004', 'pdf p98', 'Plum Run wetlands at the valley\'s northern and central sections formed a substantial obstacle on 2 July; Maj. Lee: "a marsh about 50 yards wide, ankle-deep and miry".')],
                'Buffer (25 m each side, i.e. 50 yd wide) of the NHD Plum Run flowline between 39.7905 and 39.7965 N; the northern and central extent is the NPS wording, the latitude limits are an estimate.', 80, 'Estimated',
                'Drawn only as a marsh tint along the stream; the sources give no boundary.')
    return feats

def utm_line(g): return LineString([ll2m(*c[:2]) for c in g.coords])
def utm_pt(lng, lat): return Point(*ll2m(lng, lat))
def utm_poly(gline, half):
    gm = shape_to_utm(gline).buffer(half)
    if gm.geom_type == 'MultiPolygon':
        return MultiPolygon([Polygon([m2ll(*c) for c in p.exterior.coords]) for p in gm.geoms])
    return Polygon([m2ll(*c) for c in gm.exterior.coords])
def shape_to_utm(g):
    if g.geom_type == 'LineString': return utm_line(g)
    return MultiLineString([utm_line(h) for h in g.geoms])

if __name__ == '__main__':
    feats = build()
    for f in feats:
        if f['geometry']: round_geom(f['geometry'])
    json.dump([f['properties'] for f in feats if not f['geometry']], open(os.path.join(OUT, 'water_features_no_geometry.json'), 'w'), indent=1)
    feats = [f for f in feats if f['geometry']]
    write_pair(os.path.join(OUT, 'water_features'), feats, 'water_features_1863')
    print(len(feats), 'features'); [print(f['id'], f['properties']['name'], f['properties']['confidence']) for f in feats]

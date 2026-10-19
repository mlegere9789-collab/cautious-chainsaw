"""Build waterways.geojson: streams (NHD flowlines), modern ponds (flagged absent), springs, ponds present in 1863, mill dams/ford notes.
Geometry: NHD high-resolution flowlines (modern course). NPS (2004) states that stream courses have changed over 140 years; the period-map check
(verification_water.json) records where the Bachelder/Warren drawing differs."""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from geomlib import *
from sources import S, SRC

STREAM_NOTES = {
 'Rock Creek': ('The creek was fairly wide and up to six feet deep, steep-banked in places; key terrain anchoring the Union right on 2-3 July; two mill dams (McAllister Mill) ~650 yards north of the Baltimore Pike raised a pond up to 3/4 mile long.',
                [S('NPS-TREAT-2004', 'pdf p96-97 and p78', 'Rock Creek: fairly wide, up to six feet deep, steep banks; waist-deep at Culp\'s Hill; two dams of the McAllister Mill about 650 yards north of the Baltimore Pike.')]),
 'Willoughby Run': ('Rocky banks lined by woods, willow clumps and briars; divided the Union and Confederate lines on McPherson Ridge on 1 July.',
                [S('NPS-CLI-FD', 'pdf p37-38', 'Through the centre of the 1st Corps landscape was Willoughby Run, with its rocky banks lined by woods, willow clumps, and briars; it formed a divide between the two sides.')]),
 'Marsh Creek': ('One of the wider, deeper and swifter streams of the area.', [S('NPS-TREAT-2004', 'pdf p95', 'A few streams, such as Rock Creek and Marsh Creek, are fairly wide and can be quite deep and swift.')]),
 'Plum Run': ('Drains the Valley of Death between the Round Tops and Houck\'s Ridge; marshy in its northern and central sections (see wetland feature).',
              [S('NPS-TREAT-2004', 'pdf p98', 'Plum Run, a small sluggish stream through the Valley of Death, with extremely marshy wetlands in the northern and central sections.')]),
 'Stevens Run': ('Tributary of Rock Creek rising in the Bliss Farm and flowing north through the borough.', [S('NPS-CLI-PC', 'pdf p70', 'Stevens Run originates almost in the centre of the Bliss Farm and flows northerly through the town of Gettysburg until reaching the creek.')]),
}

def build():
    feats = []; n = 0
    nhd = json.load(open(os.path.join(CACHE, 'nhd_6.geojson')))['features']
    for f in nhd:
        p = f['properties']; g = shape(f['geometry'])
        gg = g.intersection(XBOX)
        if gg.is_empty: continue
        n += 1; fc = p.get('fcode'); nm = p.get('gnis_name')
        if fc == 55800:
            sub, pres, conf, note = 'artificial path (NHD, through a modern pond or culvert)', None, 'Unknown', 'NHD artificial path: a centreline drawn through a modern waterbody or culvert; whether a stream channel lay here in 1863 is not established.'
            continue_flag = True
        elif fc == 33400:
            continue
        else:
            sub = 'stream (perennial)' if fc == 46006 else 'stream (intermittent)'
            if nm:
                pres, conf = True, 'Estimated'
                note = 'Named stream: course taken from the modern NHD flowline and compared with the drawn creek on the Bachelder/Warren sheet at 14 stations (median offset 13 m, maximum 50 m; verification/pass6_streams.json); NPS notes that stream courses have changed over 140 years.'
            else:
                pres, conf = None, 'Unknown'
                note = 'Unnamed NHD channel: may be a natural swale or intermittent stream of 1863, or a modern ditch or tile-drain outfall; NOT compared with the period map. Not drawn unless confirmed.'
        notes, srcs = ('', [])
        if nm in STREAM_NOTES: notes, srcs = STREAM_NOTES[nm]
        srcs = srcs + [S('NHD-HR', 'flowline ' + str(p.get('permanent_identifier')), 'USGS NHD high-resolution flowline (' + ('named ' + nm if nm else 'unnamed') + '); the modern course.')]
        feats.append({'type': 'Feature', 'id': 'WT-%03d' % n, 'properties': {
            'id': 'WT-%03d' % n, 'category': 'waterway', 'subtype': sub, 'name': nm or 'unnamed tributary', 'name_modern': nm or '',
            'present_1863': pres, 'period_note': notes, 'sources': srcs,
            'method': 'NHD high-resolution flowline (fcode %s) clipped to the map box; Bachelder/Warren drainage comparison pending (see verification_water.json).' % fc,
            'positional_error_m': 30 if nm else None, 'confidence': conf, 'notes': note, 'nhd_permanent_identifier': p.get('permanent_identifier'), 'nhd_fcode': fc,
            'length_m_in_box': round(length_m(gg))}, 'geometry': mapping(gg)})
    return feats

if __name__ == '__main__':
    feats = build()
    ver = json.load(open(os.path.join(OUT, 'verification_water.json'))) if os.path.exists(os.path.join(OUT, 'verification_water.json')) else {}
    for f in feats:
        v = ver.get(f['id'])
        if v: f['properties'].update({k: v[k] for k in v if k in f['properties']})
        round_geom(f['geometry'])
    write_pair(os.path.join(OUT, 'waterways'), feats, 'waterways_1863')
    print(len(feats), 'waterway features')

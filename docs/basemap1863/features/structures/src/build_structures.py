"""Build the 1863 structures layer (GeoJSON, EPSG:4326 plus a Web Mercator copy).

Inputs : evidence/*.json (georeferenced map readings), catalogue.py / catalogue_town.py (curated, sourced entries),
         2023 Adams County building outlines (read from COUNTY_PATH; fetched by tmp/b1863/modern, not committed).
Outputs: ../structures.geojson, ../structures.mercator.geojson  (and statistics in ../evidence/build_stats.json)
Run    : python build_structures.py   (from this directory)
"""
import os, sys, json, math, warnings, collections
warnings.filterwarnings('ignore')
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import numpy as np
from pyproj import Transformer
from shapely.geometry import shape, mapping, Point, Polygon
from shapely.ops import transform as shp_transform
from sources import SRC
import catalogue
import catalogue_town
import catalogue_extra

OUTDIR = os.path.abspath(os.path.join(HERE, '..'))
EVID = os.path.join(OUTDIR, 'evidence')
COUNTY_PATH = os.path.abspath(os.path.join(HERE, '../../../../../tmp/b1863/modern/vec/adams_buildings2023.json'))
T_UTM = Transformer.from_crs(4326, 32618, always_xy=True)
T_INV = Transformer.from_crs(32618, 4326, always_xy=True)
T_WM = Transformer.from_crs(4326, 3857, always_xy=True)
FT = 0.3048

GEORef_NOTE = ('Bachelder 1876 / Warren 1868-69 plate georeferenced by a thin-plate spline fitted to %d control points (surviving buildings, road junctions, bridges, summits); '
               'leave-one-out error median %.1f m, 90th percentile %.1f m, maximum %.0f m (evidence/gcps_final.json)')


def load_county():
    d = json.load(open(COUNTY_PATH, encoding='utf-8'))['features']
    out = {}
    for i, f in enumerate(d):
        g = shape(f['geometry'])
        out[i] = dict(ll=g, utm=shp_transform(lambda x, y, z=None: T_UTM.transform(x, y), g), props=f['properties'], srcid=str(f.get('id')))
    return out


def source_entries(lst):
    out = []
    for key, loc, quote in lst:
        s = SRC[key]
        out.append(dict(cite=s['cite'], sheet_or_page=loc, url=s['url'], type=s['type'], quote_or_paraphrase=quote, src_key=key))
    return out


def ll_poly(geom_ll):
    return mapping(geom_ll)


def build():
    ev = json.load(open(os.path.join(EVID, 'clusters_a_positions.json'), encoding='utf-8'))
    gc = json.load(open(os.path.join(EVID, 'gcps_final.json'), encoding='utf-8'))['accuracy']
    auto = json.load(open(os.path.join(EVID, 'auto_symbols.json'), encoding='utf-8'))
    county = load_county()
    georef = GEORef_NOTE % (gc['n_gcps'], gc['loo_median_m'], gc['loo_p90_m'], gc['loo_max_m'])
    gcl = json.load(open(os.path.join(EVID, 'gcps_final.json'), encoding='utf-8'))['gcps']
    gxy = np.array([T_UTM.transform(a['lon'], a['lat']) for a in gcl])

    def global_err(lon, lat, px=None):
        x, y = T_UTM.transform(lon, lat); d = float(np.min(np.hypot(gxy[:, 0] - x, gxy[:, 1] - y)))
        e = 25 + 0.04 * max(0.0, d - 800.0)
        if px is not None:
            # regions where this georeference and the sibling affine disagree and the control is thin (evidence/georef_comparison.json):
            # north-west quarter, and east of town (NE, where a two-bridge control and a building anchor disagree by 30 m)
            if px[0] < 3000 and px[1] < 4500:
                e = max(e, 60.0)
            elif px[0] > 5200 and px[1] < 4700:
                e = max(e, 45.0)
        return round(e), round(d)
    feats = []
    used_cty = set()
    stats = collections.Counter()

    def add(f):
        feats.append(f)

    def base(fid, subtype, name, geom, present, period, srcs, method, err, conf, notes, extra):
        p = dict(id=fid, category='structure', subtype=subtype, name=name, present_1863=present, period_note=period,
                 sources=source_entries(srcs), method=method, positional_error_m=err, confidence=conf, notes=notes)
        p.update(extra)
        return dict(type='Feature', id=fid, geometry=geom, properties=p)

    def sym_pos(skey, idx):
        s = ev[skey]['symbols'][idx]
        if s['pos_method'] == 'local_anchor':
            spread = s.get('anchor_spread_m') or 0.0
            err = round(max(10.0, 1.5 * spread + 6.0))
            m = ('Position of the Bachelder/Warren plate building symbol (px %.0f,%.0f in the cw0325000a frame), carried to ground coordinates by a local offset '
                 'from %d surviving anchor building(s) of the same farmstead (anchor spread %.1f m).' % (s['px'][0], s['px'][1], s['anchor_n'], spread))
        else:
            err, dn = global_err(s['lon'], s['lat'], s['px'])
            m = ('Position of the Bachelder/Warren plate building symbol (px %.0f,%.0f in the cw0325000a frame) through the global thin-plate-spline georeference; nearest control point %d m away (error 25 m within 800 m, growing 4 m per 100 m beyond; floor 60 m in the north-west quarter and 45 m east of town where the control is thin).' % (s['px'][0], s['px'][1], dn))
        return s, err, m

    seq = collections.Counter()
    seen_sym = set()
    # ------------------------------------------------ curated farm buildings
    for farm in catalogue.FARMS:
        for b in farm['buildings']:
            seq[(farm['key'], b['role'])] += 1
            fid = 'STR-%s-%s%d' % (farm['key'].upper(), b['role'].upper(), seq[(farm['key'], b['role'])])
            geom = None; err = None; method = ''; map_px = None; check = {}
            if b['sym'] is not None and b['cty'] is None and b['pt'] is None:
                _s = ev[b['sym'][0]]['symbols'][b['sym'][1]]
                _k = (b['sym'][0], round(_s['px'][0]), round(_s['px'][1]))
                if _k in seen_sym:
                    stats['duplicate_symbol_skipped'] += 1
                    continue
                seen_sym.add(_k)
            if b['cty'] is not None:
                c = county[b['cty']]
                geom = ll_poly(c['ll']); used_cty.add(b['cty'])
                err = b['err'] or 4
                method = ('Footprint = 2023 Adams County outline of the surviving building (index %d, %.0f m2); identity taken from the NPS/HABS/OSM name and checked against the map symbol%s.'
                          % (b['cty'], c['utm'].area, ''))
                if b['sym'] is not None:
                    s = ev[b['sym'][0]]['symbols'][b['sym'][1]]
                    cen = c['utm'].centroid
                    off = math.hypot(s['m_global'][0] - cen.x, s['m_global'][1] - cen.y)
                    check['map_symbol_offset_m'] = round(off, 1); map_px = s['px']
                    method = method[:-1] + ' (Warren-plate symbol lies %.0f m from the outline centroid in the global georeference).' % off
                if b['status'] in ('destroyed_1863',):
                    method += ' NOTE: this outline is the later reconstruction on the old foundation.'
            elif b['sym'] is not None or b['pt'] is not None:
                if b['sym'] is not None:
                    s, e1, m1 = sym_pos(*b['sym']); map_px = s['px']
                    lon, lat = s['lon'], s['lat']; err = e1; method = m1
                    if b['pt'] is not None:
                        plon, plat, perr, why = b['pt']
                        x1, y1 = T_UTM.transform(lon, lat); x2, y2 = T_UTM.transform(plon, plat)
                        dist = math.hypot(x1 - x2, y1 - y2); check['marker_offset_m'] = round(dist, 1)
                        if dist <= 30:
                            lon, lat, err = plon, plat, perr
                            method = ('Point = %s (independent site mark); the Warren-plate symbol agrees within %.0f m (symbol px %.0f,%.0f).' % (why, dist, s['px'][0], s['px'][1]))
                        else:
                            method += ' The independent mark (%s) lies %.0f m away and is NOT used.' % (why, dist)
                else:
                    plon, plat, perr, why = b['pt']; lon, lat, err = plon, plat, perr; method = 'Point = %s.' % why
                if b['err']:
                    err = b['err']
                geom = dict(type='Point', coordinates=[lon, lat])
            else:
                method = 'No geometry: no source read gives a position for this structure (UNKNOWN).'
            conf = b['conf'] if geom is not None or b['conf'] == 'Documented' else 'Unknown'
            if geom is None and b['conf'] != 'Documented':
                conf = 'Unknown'
            extra = dict(farm=farm['key'], farm_name=farm['name'], owner_1863=farm['owner_1863'], status=b['status'], dims_documented=b['dims'], material=b['material'], roof=b['roof'],
                         built=b['built'], fabric_1863=b['fabric'], geometry_kind=('footprint_2023_outline' if b['cty'] is not None else ('map_symbol_point' if geom else 'none')),
                         georef_model=(georef if (b['sym'] is not None and b['cty'] is None) else None), map_px_cw0325000a=map_px)
            if b['cty'] is not None:
                extra['adams_county_srcid'] = county[b['cty']]['srcid']
                extra['geometry_represents'] = ('later building on the 1863 site/foundation (not the 1863 structure itself)' if b['status'] == 'destroyed_1863' else ('present building outline; 1863 form may have been smaller (see fabric_1863)' if b['status'] == 'survives_altered' else 'present building outline, taken as the 1863 building'))
            extra.update(check)
            f = base(fid, b['subtype'], b['name'], geom, b['present'], b['period'], b['src'], method, err, conf, b['notes'], extra)
            add(f); stats['curated_' + b['status']] += 1
    # ------------------------------------------------ borough and institutional landmarks
    for t in catalogue_town.TOWN:
        c = county[t['cty']]; used_cty.add(t['cty'])
        fid = 'STR-TOWN-%s' % t['key'].upper()
        method = 'Footprint = 2023 Adams County outline of the surviving building (index %d, %.0f m2); identity from the named source; the 1863 footprint may be smaller (see notes).' % (t['cty'], c['utm'].area)
        extra = dict(farm=None, status=t['status'], dims_documented=t['dims'], built=t['built'], geometry_kind='footprint_2023_outline', adams_county_srcid=county[t['cty']]['srcid'],
                     geometry_represents=('present building outline; 1863 form may have been smaller' if t['status'] == 'survives_altered' else 'present building outline, taken as the 1863 building'))
        f = base(fid, t['subtype'], t['name'], ll_poly(c['ll']), True, '', t['src'], method, t['err'], t['conf'], t['notes'], extra)
        add(f); stats['town_' + t['status']] += 1
    for t in catalogue_town.LOST:
        fid = 'STR-LOST-%s' % t['key'].upper()
        extra = dict(farm=None, status=t['status'], built=t['built'], geometry_kind='none')
        f = base(fid, t['subtype'], t['name'], None, True, '', t['src'], 'No geometry: no source read gives coordinates (UNKNOWN).', None, 'Unknown' if t['conf'] != 'Documented' else 'Documented', t['notes'], extra)
        add(f); stats['lost_nogeom'] += 1
    # ------------------------------------------------ extra named points (bridge, mill)
    for t in catalogue_extra.EXTRA_POINTS:
        fid = 'STR-SITE-%s' % t['key'].upper()
        extra = dict(farm=None, status=t['status'], built=t['built'], geometry_kind='named_point', geometry_represents='site position, not a footprint')
        f = base(fid, t['subtype'], t['name'], dict(type='Point', coordinates=[t['lon'], t['lat']]), True, '', t['src'], 'Point = %s.' % t['why'], t['err'], t['conf'], t['notes'], extra)
        add(f); stats['site_point'] += 1
    # ------------------------------------------------ borough building masses (map-derived)
    mass = json.load(open(os.path.join(EVID, 'borough_mass.json'), encoding='utf-8'))
    for i, m in enumerate(mass):
        fid = 'STR-BORO-MASS-%03d' % (i + 1)
        method = ('Outline of an inked building mass on the Warren plate (cw0353500 registered to the cw0325000a frame), extracted by thresholding and contour tracing, '
                  'then carried to ground coordinates through the global thin-plate-spline georeference. The plate draws buildings as solid symbols that are larger than the buildings and run together along the street fronts: '
                  'this polygon is the extent of the ink, NOT an individual building footprint.')
        extra = dict(farm=None, status='map_mass', geometry_kind='map_ink_mass', geometry_represents='extent of drawn building symbols (merges neighbouring buildings)', georef_model=georef, area_ink_px=round(m['area_px']))
        srcs = [('WARREN-PLATE', 'Gettysburg borough, whole plate', 'Solid building symbols along the street fronts of the borough as surveyed in 1868-69; letters W/B/S mark wood, brick, stone where drawn.')]
        f = base(fid, 'borough_building_mass', 'Gettysburg borough building mass %d (Warren plate)' % (i + 1), dict(type='Polygon', coordinates=[m['ll']]), True,
                 'Standing at the 1868-69 survey; most borough blocks were built up before 1863 but individual buildings are not dated.', srcs, method, 20, 'Estimated',
                 'Buildings erected between July 1863 and 1869 cannot be separated from those standing in July 1863 using this plate alone.', extra)
        add(f); stats['borough_mass'] += 1
    # ------------------------------------------------ machine-detected symbols (unreviewed)
    for i, a in enumerate(auto):
        fid = 'STR-MAPSYM-%04d' % (i + 1)
        method = ('Machine-detected building symbol on the Warren plate (px %.0f,%.0f), compact solid dark blob with at least one neighbour within 50 px and an owner label within 140 px; '
                  'position through the global thin-plate-spline georeference. NOT individually reviewed.' % tuple(a['px']))
        extra = dict(farm=None, status='unreviewed_symbol', geometry_kind='map_symbol_point', nearest_owner_label=a['nearest_label'], nearest_label_dist_px=round(a['nearest_label_dist_px']),
                     georef_model=georef, map_px_cw0325000a=a['px'], review_status='auto-detected, not reviewed')
        srcs = [('WARREN-PLATE', 'Whole plate (cw0353500 registered to cw0325000a)', 'Filled building symbol; occupant name label nearest: %s.' % a['nearest_label'])]
        f = base(fid, 'building', 'Building symbol near owner label "%s" (unreviewed)' % a['nearest_label'], dict(type='Point', coordinates=[a['lon'], a['lat']]), True,
                 'Standing when the Warren survey was made (1868-69); standing in July 1863 is probable but not independently confirmed.', srcs, method, max(30, global_err(a['lon'], a['lat'], a['px'])[0]), 'Estimated',
                 'Auto-detected; owner label is a nearest-label hint (OCR) and may belong to a neighbouring farm; roles unknown.', extra)
        add(f); stats['auto_symbol'] += 1
    return feats, used_cty, stats, georef


def to_3857(feat):
    f = json.loads(json.dumps(feat))
    g = f['geometry']
    if g is None:
        return f
    def conv(c):
        x, y = T_WM.transform(c[0], c[1]); return [round(x, 2), round(y, 2)]
    def walk(a):
        return conv(a) if isinstance(a[0], (int, float)) else [walk(x) for x in a]
    g['coordinates'] = walk(g['coordinates'])
    return f


def write(feats, extra_fc_props=None):
    for f in feats:
        g = f['geometry']
        if g is not None:
            def rnd(a):
                return [round(a[0], 7), round(a[1], 7)] if isinstance(a[0], (int, float)) else [rnd(x) for x in a]
            g['coordinates'] = rnd(g['coordinates'])
    fc = dict(type='FeatureCollection', name='structures_1863',
              crs=dict(type='name', properties=dict(name='urn:ogc:def:crs:OGC:1.3:CRS84')),
              properties=dict(title='Structures standing (or documented) in July 1863 within the Gettysburg battlefield bounds',
                              label='RECONSTRUCTION from period maps and later documentation - not a photograph of 1863. Each feature carries its sources, method, positional error and confidence.',
                              bounds=dict(north=39.85, south=39.77, east=-77.18, west=-77.29)),
              features=feats)
    json.dump(fc, open(os.path.join(OUTDIR, 'structures.geojson'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    fc3 = dict(fc); fc3['crs'] = dict(type='name', properties=dict(name='urn:ogc:def:crs:EPSG::3857'))
    fc3['features'] = [to_3857(f) for f in feats]
    json.dump(fc3, open(os.path.join(OUTDIR, 'structures.mercator.geojson'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))


if __name__ == '__main__':
    feats, used, stats, georef = build()
    write(feats)
    json.dump(dict(stats=dict(stats), n_features=len(feats), used_cty=sorted(used), georef=georef), open(os.path.join(EVID, 'build_stats.json'), 'w'), indent=1)
    print(len(feats), dict(stats))

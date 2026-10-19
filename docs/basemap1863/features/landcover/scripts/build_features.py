"""Compose the land-cover feature classes (Warren-derived) as shapely geometries in UTM 18N with full provenance."""
import json, os, re, sys
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from export_features import *   # noqa
from shapely.geometry import Point

def anchors_utm(d):
    return {k: tuple(float(v) for v in warp.px_to_utm(*xy)) for k, xy in d.items()}

def to_utm_list(lst):
    out = []
    for n, w in lst:
        g = wkt.loads(w).buffer(0)
        if g.is_empty:
            continue
        u = px_poly_to_utm(g).buffer(0).intersection(COVER_UTM)
        if not u.is_empty:
            out.append((n, u))
    return out

PERIOD_WOOD = ("Warren survey is 1868-69 (revised 1873); the sheet legend says objects are shown as at the time of the battle. "
               "Soldiers cut timber for breastworks and fuel in July 1863 and owners cut woodlots in the following five years; "
               "neither is separately recorded here (UNKNOWN).")
METHOD_WOOD = ("Digitised from the georeferenced Warren sheet: tree-symbol density and connected-region extraction, visual review of every candidate "
               "in 42 map tiles, residual dense-symbol regions reviewed; polygons converted to UTM 18N through the Warren georeference "
               "(similarity fit to Census TIGER roads plus a smooth free-form warp).")


def build():
    A = load_px()
    MAN = load_manual()
    feats = {}
    ANCH = anchors_utm({"Culp's Hill": (6420, 5400), 'Big Round Top': (4700, 8700),
                        'Herbst': (3350, 3340), 'Peach Orchard': (3880, 7150)})
    # ---------------- woods
    woods = to_utm_list(A['woods'])
    for m in MAN:
        if m['cls'] == 'wood':
            g = px_poly_to_utm(Polygon(m['pts']).buffer(0)).intersection(COVER_UTM)
            woods.append((m['name'], g))
    WU = unary_union([g.buffer(0.01) for n, g in woods]).buffer(0)
    comps = list(WU.geoms) if WU.geom_type == 'MultiPolygon' else [WU]
    wf = []
    k = 0
    for p in sorted(comps, key=lambda q: -q.area):
        for q in clean(p, tol=1.2, minarea=1200):
            contrib = [n for n, g in woods if g.intersects(q) and g.intersection(q).area > 0.3 * g.area]
            auto_only = all(re.match(r'^(B\d{3}|C\d{4}|SYM-|R\d{4})', n) for n in contrib)
            k += 1
            fid = 'LC-WOOD-%04d' % k
            name = None
            extra = []
            notes = ''
            for an, (E, N) in ANCH.items():
                if q.contains(Point(E, N)):
                    if an == "Culp's Hill":
                        name = "Culp's Hill timber"
                        notes += "Named by position (summit contour 408 on the Warren sheet). "
                    if an == 'Big Round Top':
                        name = 'Big Round Top timber'
                        notes += 'Named by position (Round Top summit on the Warren sheet). '
                    if an == 'Herbst':
                        name = 'Herbst Woods / McPherson woodlots (complex)'
                        notes += ('Named by position next to the J. Herbst farmstead on the Warren sheet. Hartwig reports an 18-acre Herbst woodlot, '
                                  'cattle-grazed and free of undergrowth except along Willoughby Run (willows and brush). The mapped complex is %.1f acres and '
                                  'joins neighbouring McPherson timber, so the 18-acre figure cannot be checked against this polygon. ' % (q.area / ACRE))
                        extra.append(src('S-HARTWIG', 'p.1 (opening paragraph)',
                                         'Herbst woodlot: 18 of 160 acres; free of undergrowth except along Willoughby Run where willows and brush grew thickly.'))
            if any(n.startswith('Little Round Top east') for n in contrib):
                name = name or 'Little Round Top east slope woodlot (Weikert/Bushman woods)'
                extra.append(src('S-LRT-CLR', 'PDF p.19 and p.43',
                                 'Bushman and Weikert tracts on the east slope were wooded in July 1863; a tree line at the summit separated them from the cleared Hanaway tract.'))
            if any('Seminary' in n for n in contrib):
                name = name or 'Seminary Ridge grove (Lutheran Theological Seminary)'
                notes += 'Named from the Warren label LUTH. T. SEM. beside the grove. '
            sparse = any('sparse' in n for n in contrib)
            sub = 'woodlot_sparse_timber' if sparse else 'woodlot'
            if contrib:
                notes += 'Built from %d Warren-sheet tree-symbol regions (%s).' % (len(contrib), ', '.join(contrib[:6]) + ('...' if len(contrib) > 6 else ''))
            wf.append(make(fid, 'woods', sub, name, q, True, PERIOD_WOOD,
                           [WARREN_SRC('Tree-symbol region on the Warren sheet. ' + WARREN_LEGEND)] + extra, METHOD_WOOD,
                           30 if auto_only else 40, 'Documented' if (auto_only or not sparse) else 'Estimated', notes.strip()))
    feats['woods'] = wf
    # ---------------- orchards
    orch = to_utm_list(A['orchards'])
    scat = to_utm_list(A['scatter'])
    marsh = to_utm_list(A['marsh'])
    of = []
    k = 0
    pk = Point(*ANCH['Peach Orchard'])
    for n, g in sorted(orch, key=lambda t: -t[1].area):
        for q in clean(g, tol=1.0, minarea=300):
            k += 1
            hand = not re.match(r'^(B\d{3}|C\d{4})', n)
            of.append(make('LC-ORCH-%04d' % k, 'orchards', 'orchard', (n if hand else None), q, True,
                           'Warren survey 1868-69; orchards persist for decades but individual blocks may have been planted or removed after 1863 (UNKNOWN).',
                           [WARREN_SRC('Regular rows of orchard-tree symbols (circle with hachure) on the Warren sheet.')],
                           'Digitised from the georeferenced Warren sheet (orchard-symbol regions, visual review of each candidate; hand outlines tightened to the symbol density).',
                           40 if hand else 30, 'Estimated' if hand else 'Documented', 'Source id %s.' % n))
    scat2 = []
    for n, g in scat:
        if n.startswith('G') and g.contains(pk):
            for q in clean(g, tol=1.0, minarea=300):
                k += 1
                of.append(make('LC-ORCH-%04d' % k, 'orchards', 'orchard', 'Peach Orchard (with the adjoining J. Want orchard on the Warren sheet)', q, True,
                               'Warren survey 1868-69.',
                               [WARREN_SRC('Peach Orchard labelled on the sheet; orchard-tree glyphs mapped by detection.')],
                               'Small-glyph detection and clustering on the Warren sheet, reviewed by eye.', 30, 'Documented',
                               'Name read from the Warren label PEACH ORCHARD; the polygon also includes the J. Want orchard block north of the Wheatfield Road.'))
        else:
            scat2.append((n, g))
    feats['orchards'] = of
    # ---------------- scattered trees
    sf = []
    k = 0
    for n, g in sorted(scat2, key=lambda t: -t[1].area):
        for q in clean(g, tol=1.0, minarea=300):
            k += 1
            kind = 'tree_symbol_cluster_dense' if n.startswith('R') else 'small_tree_symbols_cluster' if n.startswith('G') else 'scattered_trees'
            sf.append(make('LC-TREES-%04d' % k, 'scattered_trees', kind, (None if re.match(r'^[RG]\d{4}', n) else n), q, True, 'Warren survey 1868-69.',
                           [WARREN_SRC('Single-tree symbols and small tree-glyph clusters on the Warren sheet (orchard, farmyard, fence-row or pasture trees).')],
                           'Residual dense-symbol regions and small-glyph clusters not already inside a mapped woodlot or orchard, detected on the Warren sheet and reviewed by eye '
                           '(clusters of fewer than 7 glyphs and regions under about 0.6 ha are not mapped).',
                           40, 'Estimated', 'Source id %s. May be an orchard, farmyard trees, a fence-row or loose pasture trees; the sheet symbols do not separate them reliably.' % n))
    feats['scattered_trees'] = sf
    # ---------------- marsh / wetland
    man_m = [m for m in MAN if m['name'].startswith('Plum Run bottom')]
    marsh2 = list(marsh) + [(m['name'], px_poly_to_utm(Polygon(m['pts']).buffer(0)).intersection(COVER_UTM)) for m in man_m]
    mf = []
    k = 0
    for n, g in sorted(marsh2, key=lambda t: -t[1].area):
        for q in clean(g, tol=1.0, minarea=300):
            k += 1
            plum = n.startswith('Plum Run')
            srcs = [WARREN_SRC('Grass-tuft (marsh) symbols on the Warren sheet.')]
            if plum:
                srcs.append(src('S-LRT-CLR', 'PDF p.19', 'The marshy bottom land along Plum Run at the western foot of Little Round Top.'))
            mf.append(make('LC-WET-%04d' % k, 'marsh_wetland', 'marshy_bottom_land' if plum else 'marsh', (n if plum else None), q, True, 'Warren survey 1868-69.', srcs,
                           'Digitised from Warren-sheet grass-tuft symbols (reviewed by eye)' + ('; Plum Run outline drawn by hand along the stream corridor.' if plum else '.'),
                           40 if plum else 30, 'Estimated',
                           'Source id %s. Wet ground in July 1863 depends on rainfall (heavy rain on 25-26 June 1863 is recorded by Jacobs); the extent is the map symbol, not a measured water table.' % n))
    feats['marsh_wetland'] = mf
    # ---------------- boulder fields
    bf = []
    k = 0
    for m in MAN:
        if m['cls'] == 'boulder' and not m['name'].startswith('Plum Run'):
            g = px_poly_to_utm(Polygon(m['pts']).buffer(0)).intersection(COVER_UTM)
            for q in clean(g, tol=1.0, minarea=300):
                k += 1
                bf.append(make('LC-BOULD-%04d' % k, 'boulder_field', m['subtype'], m['name'], q, True,
                               "Natural diabase boulders, present in 1863 and today; the Warren sheet marks the Devil's Den ground with boulder symbols.",
                               [WARREN_SRC("Devil's Den and Houck's Ridge labelled on the sheet with boulder (dot and hachure) symbols."),
                                src('S-LRT-CLR', 'PDF p.19 and p.90', 'Plum Run valley and Little Round Top ground covered with loose rocks (the CLR quotes Chamberlain of 6 July 1863).')],
                               "Outline drawn by hand over the Warren-sheet boulder symbols near Devil's Den.", 40, 'Estimated',
                               'Bare rock: keep modern ground texture here; do not add or remove tree cover from this polygon without separate evidence.'))
    feats['boulder_fields'] = bf
    # ---------------- documented fields
    ff = []
    for m in MAN:
        if m['cls'] == 'field':
            g = px_poly_to_utm(Polygon(m['pts']).buffer(0)).intersection(COVER_UTM)
            for q in clean(g, tol=1.0, minarea=300):
                ff.append(make('LC-FIELD-0001', 'field', 'wheat_standing', 'Wheatfield (George Rose farm)', q, True,
                               'July 1863: standing wheat on 2 July (ripe or nearly ripe; golden-tan).',
                               [src('S-HMDB-WHEATFIELD', 'marker text', 'NPS marker: golden wheat grew tall here in the summer of 1863; the ground changed hands six times on 2 July.'),
                                WARREN_SRC('Open ground enclosed by fences between the woods around the Wheatfield Road (no tree symbols).')],
                               'Hand outline of the open ground on the Warren sheet; the crop (wheat) comes from the marker text and battle accounts.', 40, 'Estimated',
                               'Measured %.1f acres; secondary books give about 20 to 26 acres (UNKNOWN which is right). The boundary follows my reading of the Warren fences, not a surveyed corner.' % (q.area / ACRE)))
    feats['fields_documented'] = ff
    # ---------------- cleared old field (Little Round Top west slope)
    oc = []
    for m in MAN:
        if m['cls'] == 'oldfield':
            g = px_poly_to_utm(Polygon(m['pts']).buffer(0)).intersection(COVER_UTM)
            for q in clean(g, tol=1.0, minarea=300):
                oc.append(make('LC-OPEN-0001', 'open_cleared', 'cleared_rocky_slope', 'Little Round Top west slope, summit ridge and Vincent Spur (Hanaway tract)', q, True,
                               'Cleared before 1863 (NPS CLR).',
                               [src('S-LRT-CLR', 'PDF p.19, p.43, p.90', "The Hanaway tract on the west slope was mostly cleared of trees before 1863; a tree line at the summit separated it from the wooded east-slope tracts; the western face is managed as old field."),
                                WARREN_SRC('Few tree symbols and dense contour hachures on this slope.')],
                               'Hand outline from the CLR site-history text and the Warren sheet.', 40, 'Estimated',
                               'Cleared does not mean bare: grass or scrub and loose rock with scattered trees; the CLR notes more mature old-field vegetation today than in 1863.'))
    feats['open_cleared'] = oc
    return feats, ANCH


if __name__ == '__main__':
    f, a = build()
    print({k: len(v) for k, v in f.items()})
    print(round(sum(x['area_acres'] for x in f['woods'])), 'wood acres;', round(sum(x['area_acres'] for x in f['orchards'])), 'orchard acres')
    for x in f['woods'][:8]:
        print(x['id'], x['name'], x['area_acres'])
    for k in ('fields_documented', 'open_cleared'):
        for x in f[k]:
            print(x['name'], x['area_acres'])

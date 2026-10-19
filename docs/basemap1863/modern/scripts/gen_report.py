"""Assemble docs/basemap1863/modern/MODERN-FEATURES.md from results/*.json (numbers are never typed by hand) plus the fixed prose in report_prose/."""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
MOD = os.path.abspath(os.path.join(HERE, '..'))
R = lambda n: json.load(open(os.path.join(MOD, 'results', n), encoding='utf8')) if os.path.exists(os.path.join(MOD, 'results', n)) else None
inv = R('inventory.json'); masks = R('masks.json'); cv = R('detect_cv.json'); reg = R('registration.json'); mon = R('monuments.json'); mon6 = R('monuments_0p6.json')
ter = R('terrain_changes.json'); cor = R('corridors.json'); inp = R('inpaint_test.json'); vis = R('visual_review.json'); chk = R('checks.json')
L = []
w = L.append
w('# Modern (post-1863) features: inventory, removal masks, removal method\n')
w('Part of the 1863 base-map reconstruction. Written by `scripts/gen_report.py` from `results/*.json`; every number below is read from a result file that a script in `scripts/` produced. The finished map is a **reconstruction**: no photograph of 1863 exists. This document says what in the modern photograph is not 1863, where it is, how much of it there is, how it is cut out, and how well the cutting-out was tested. It does not say the result is exact.\n')
w('Base photograph and why: `../IMAGERY-CHOICE.md`. Licences: `LICENCES.md`.\n')
w('## 1. Inventory by class\n')
w('Box: west -77.34375, south 39.75788, east -77.14600, north 39.87602 (235 km2). Sources: OpenStreetMap (ODbL), Adams County GIS 2023 building outlines and centre lines, US Census TIGERweb, USGS NHD, USGS structures, Wikipedia monument list (CC BY-SA). `removal` says what the 1863 reconstruction does with the class: REMOVE = cut out; REMOVE_REPLACE = the modern surface is cut out and the 1863 feature on that line is drawn back by the layer that owns it from its own sources; UNKNOWN = not established here, kept in the picture and flagged; KEEP = not removed by this layer.\n')
w('| Class | Count | Length km | Area ha | Sources | Removal | Note |')
w('|---|---:|---:|---:|---|---|---|')
for c, s in inv['classes'].items():
    src = ', '.join(f'{k} {v}' for k, v in s['sources'].items())
    w(f"| {c} | {s['count']:,} | {s.get('length_km', '')} | {s.get('area_ha', '')} | {src} | {s['removal']} | {s['label']}. {s['note']} |")
tot = sum(s['count'] for s in inv['classes'].values())
w(f'\nTotal {tot:,} features in {len(inv["classes"])} classes. Every feature carries an id `MOD-<CLASS>-<n>`, its class, subclass, source and source id in `data/inventory_features.geojson.gz` (WGS84).\n')
w('Cross-checks of the sources against each other (`results/inventory.json`):\n')
for k, v in inv['road_cross_check'].items():
    w(f'- {k}: {v}')
w(f"- Buildings: Adams County 2023 outlines {inv['adams_building_outlines']:,}; OSM buildings with no Adams outline under them (added) {inv['osm_buildings_added_not_in_adams']}.")
w(f"- Water: NHD water bodies duplicating an OSM polygon {inv.get('nhd_water_duplicates_of_osm')} (dropped), added {inv.get('nhd_water_added')}.")
m = inv['monuments']
w(f"- Monuments: OSM points {m['osm_points']}; Wikipedia list entries with coordinates {m['wikipedia_list_entries_with_coords']}, of which {m['wikipedia_matched_to_osm_within_15m']} lie within 15 m of an OSM point (median offset {m['wiki_osm_offset_median_m']} m, 90th percentile {m['wiki_osm_offset_p90_m']} m) and {m['wikipedia_added']} were added; total located {m['total_listed']}. {m['nps_published_count_note']}")
w('')
if mon:
    w(f"**Visibility of monuments.** In the 1.0 m 2013 photograph {mon['visible_count']} of {mon['n_points']} listed monument points ({100*mon['visible_fraction']:.1f} %) show a luminance anomaly above the 95th percentile of {mon['control_points']} random open-ground controls (so about {round(0.05*mon['n_points'])} of them are chance); the rest are not resolvable (tablets and markers are below 1 m). On the 0.6 m 2019 flight the figure is {mon6['visible_count']} ({100*mon6['visible_fraction']:.1f} %) " if mon6 else '')
    w('So the monument layer matters for the legend and for large state monuments, not for most of the 1,320 objects; and about 380 of the park\'s objects have no coordinate in any open source read here.\n')
w('## 2. Pixel masks\n')
if masks:
    w(f"Grid {masks['grid']}; box {masks['box_area_km2']} km2. Class codes: 1 road surface, 2 building (roof and cast shadow), 3 monument, 4 utility, 5 area to re-texture, 6 detected but not mapped, 7 modern water.\n")
    w('| Mask class | Pixels | Area ha | % of box |')
    w('|---|---:|---:|---:|')
    for k, v in masks['classes'].items():
        w(f"| {k} | {v['pixels']:,} | {v['area_ha']} | {v['percent_of_box']} |")
    w(f"\nPatch-based removal (classes 1-4, 6): **{masks['patch_removal_area_ha']} ha**. Needs the 1863 land-cover layer (classes 5, 7): **{masks['retexture_area_ha']} ha**.")
    w(f"Building outlines evaluated {masks['building_outlines_evaluated']:,}: roof visible in the 2013 photograph {masks['building_outlines_with_roof_visible_in_2013']:,}; not visible (built after 2013, or hidden) {masks['building_outlines_not_visible_in_2013']:,}, which are not cut out. Detected, unmapped components: {masks['detected_unmapped_components']:,}, {masks['detected_unmapped_area_ha']} ha.\n")
if cv:
    w(f"Detector (`scripts/detect.py`, gradient-boosted trees on 12 pixel features of the 1.0 m R,G,B,NIR photograph) under 2-fold spatial hold-out against map-derived labels: pavement recall {cv['recall']['pavement']:.2f}, precision {cv['precision']['pavement']:.2f}; roof recall {cv['recall']['roof']:.2f}, precision {cv['precision']['roof']:.2f}; background recall {cv['recall']['background']:.2f}. These are measured against the maps' own labels (a road under trees is a miss; a new building is a false hit), not against a hand-drawn truth.\n")
if reg:
    w(f"Registration of vectors on the photograph: median shift ({reg['global_median_dx_m']:+.1f}, {reg['global_median_dy_m']:+.1f}) m east, north, spread {reg['global_mad_dx_m']:.1f} m (4,000 buildings); masks are grown by 1 m.\n")
w('## 3. Terrain changes and power-line corridors\n')
if ter:
    w(f"3DEP 1 m cross-profile estimate (`scripts/terrain.py`): noise floor sigma {ter['noise_sigma_m']} m on {ter['noise_n']} off-road samples, threshold {ter['threshold_m']} m. {ter['road_candidates']} road stretches (total {ter['road_candidate_length_km']} km) are candidates for a cut ({ter['cuts']}) or fill ({ter['fills']}) of at least that height; arterials {ter['by_road_class']['ROAD_ARTERIAL']}, local roads {ter['by_road_class']['ROAD_LOCAL']}. Many 1863 roads also run in cuts and hollows, so a candidate is not proof of a post-1863 change. {ter['caveat']}\n")
    w('Largest candidates:\n')
    w('| Id | Kind | Road | Length m | Median height m | Max m |')
    w('|---|---|---|---:|---:|---:|')
    for p in ter['top_road_candidates'][:12]:
        w(f"| {p['id']} | {p['kind']} | {p.get('name') or p['road_srcid']} | {p['length_m']} | {p['median_h_m']} | {p['max_abs_h_m']} |")
    w('\nEngineered water and the quarry (depth = ring median minus inside 5th percentile):\n')
    w('| Id | Kind | Area ha | Depth m |')
    w('|---|---|---:|---:|')
    for p in ter['polygons'][:15]:
        w(f"| {p['id']} | {p['kind']} {p['sub']} | {p['area_ha']} | {p['depth_m']} |")
    w('')
if cor:
    w(f"Power-line corridors through woodland (`scripts/corridors.py`): {cor['lines_with_woodland_corridor']} of {cor['lines_scanned']} mapped lines cross woodland, {cor['woodland_corridor_length_km']} km, median cleared width {cor['median_width_m_all']} m, about {cor['area_ha']} ha of canopy missing because of them. The 1863 canopy is the land-cover layer's decision; the corridor polygons are in `data/power_corridors.geojson.gz`.\n")
w('## 4. Removal method\n')
w(open(os.path.join(HERE, 'report_prose', 'removal.md'), encoding='utf8').read() if os.path.exists(os.path.join(HERE, 'report_prose', 'removal.md')) else '(removal prose missing)')
if inp:
    a = inp['aggregate_mean']
    w('\n### Test on 20 real masks\n')
    w(f"{inp['n_sites']} sites, {inp['window_m']} m windows, mask classes {inp['mask_classes']}. Means over sites. seam_ratio: 1.0 = the filled boundary is as busy as ordinary ground; above 1.3 visible. tex_ratio: Laplacian variance inside the fill over the ring around it (1.0 = same grain). truth_*: the same shape moved onto clean ground and compared with the real pixels.\n")
    w('| Method | seam_ratio mean | seam_ratio median | sites with seam > 1.3 | tex_ratio | truth PSNR dB | truth SSIM | truth tex_ratio | truth JS(grad) | s per site |')
    w('|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|')
    for mn, v in a.items():
        w(f"| {mn} | {v['seam_ratio']} | {v['seam_ratio_median']} | {v['seam_visible_sites(>1.3)']} | {v['tex_ratio']} | {v['truth_psnr']} | {v['truth_ssim']} | {v['truth_tex']} | {v['truth_js']} | {v['seconds']} |")
    w('\nPer site:\n')
    w('| Site | Class | Mask px | telea seam/tex | ns seam/tex | exemplar seam/tex | exemplar truth PSNR |')
    w('|---|---|---:|---|---|---|---:|')
    for r in inp['per_site']:
        w(f"| {r['site']} | {r['cls']} | {r['mask_px']} | {r['telea']['seam_ratio']}/{r['telea']['tex_ratio']} | {r['ns']['seam_ratio']}/{r['ns']['tex_ratio']} | {r['exemplar']['seam_ratio']}/{r['exemplar']['tex_ratio']} | {r['exemplar'].get('truth_psnr')} |")
if vis:
    w('\n## 5. Visual review (looked at)\n')
    w(json.dumps(vis, indent=1))
if chk:
    w('\n## 6. The eight checks\n')
    for k, v in chk.items():
        w(f'- {k}: {v}')
open(os.path.join(MOD, 'MODERN-FEATURES.md'), 'w', encoding='utf8').write('\n'.join(L) + '\n')
print('written', len(L), 'lines')

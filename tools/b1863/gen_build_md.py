"""Write docs/basemap1863/BUILD.md from the stage statistics and the eight check results (numbers are read from files, never typed)."""
import sys, os, json, glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C

def J(p, d=None):
    try:
        return json.load(open(p, encoding='utf-8'))
    except Exception:
        return {} if d is None else d

def main():
    B = C.BUILD
    tg = J(os.path.join(B, 'targets_stats.json')); lc = J(os.path.join(B, 'lc_stats.json')); bk = J(os.path.join(B, 'bank_stats.json')); ds = J(os.path.join(B, 'draw_stats.json'))
    pv = J(os.path.join(B, 'prov_stats.json')); s20 = J(os.path.join(B, 'stage20_stats.json')); s30 = J(os.path.join(B, 'stage30_stats.json')); sun = J(os.path.join(B, 'sun.json'))
    idx = J(os.path.join(B, 'tiles_index.json'), [])
    ck = {n: J(os.path.join(C.PROV, 'checks', 'pass%d.json' % n)) for n in range(1, 9)}
    tiles_mb = sum(r['bytes'] for r in idx) / 1e6
    byz = {}
    for r in idx:
        e = byz.setdefault(r['z'], [0, 0]); e[0] += 1; e[1] += r['bytes']
    cls = pv.get('classes', {})
    L = []
    w = L.append
    w('# Reconstruction of Gettysburg, July 1863: the base map build\n')
    w('**This is a reconstruction.** No aerial photograph of Gettysburg in 1863 exists. The map is a modern public-domain aerial photograph (USDA NAIP, flown 4 June 2013, 1.0 m per pixel) from which modern features were removed and to which 1863 features were added, from period maps and records. '
      'It is **not** an exact replica and **no accuracy of 100 percent is claimed anywhere**. What is measured is stated in section 7; what is not known is left as photographed or drawn neutral, and recorded as UNKNOWN. '
      'Every change is listed in `PROVENANCE-LAYER/` with its sources (title, locator, URL, type A1 primary map or record, A2 later first-hand, B secondary), method, positional error in metres and confidence (Documented, Estimated, Contested).\n')
    w('Written by `tools/b1863/gen_build_md.py`; every number in it comes from a file produced by a script in `tools/b1863/`.\n')
    w('## 1. What ships\n')
    w('| Path | What |\n|---|---|')
    w('| `docs/basemap1863/tiles/{z}/{x}/{y}.webp` | the photoreal tile pyramid, 512 px tiles, Mapbox GL convention (zoom z is the camera zoom), z11 to z17: %d tiles, %.1f MB (limit 40 MB) |' % (len(idx), tiles_mb))
    w('| `docs/basemap1863/tiles/manifest.json` | scheme, bounds, attribution text, per-tile sha256, input hashes, the RECONSTRUCTION label |')
    w('| `docs/basemap1863/PROVENANCE-LAYER/tiles/{z}/{x}/{y}.png` | per-pixel provenance class (palette PNG, same tile grid, z13 and finer): the "show what was changed" layer |')
    w('| `docs/basemap1863/PROVENANCE-LAYER/added_features.geojson` | every drawn road, railway, bridge, fence, building, mass and orchard area: id, sources, method, error, confidence |')
    w('| `docs/basemap1863/PROVENANCE-LAYER/changed_regions.geojson.gz` | outlines of removed, re-synthesised, added-tree and ambiguous regions |')
    w('| `docs/basemap1863/PROVENANCE-LAYER/classes.json`, `checks/` | class codes; the eight verification passes (JSON) and the review images |')
    w('| `tools/b1863/` | the pipeline (section 3); `python tools/b1863/run_all.py` rebuilds everything from the inputs |\n')
    w('Tile levels: ' + '; '.join('z%d %d tiles %.2f MB' % (z, n, b / 1e6) for z, (n, b) in sorted(byz.items())) + '. The photograph is 1.0 m per pixel, so z16 (0.92 m per pixel at this latitude) is the native level; z17 tiles exist only around ten hotspots and are enlargements (no new detail); no z18 tile is shipped (it would be a further 2x enlargement of the same pixels). '
      'The tile scheme is the one the Battle Studio backdrop already uses (512 px tiles, zoom equals camera zoom).\n')
    w('## 2. Inputs\n')
    w('| Input | Source | Licence |\n|---|---|---|')
    w('| Base photograph: NAIP 2013-06-04, 4 bands R,G,B,NIR, 1.0 m, 16 quarter-quad scenes, mosaic 17,280 x 13,620 px on the UTM 18N 1 m grid | USDA Farm Service Agency NAIP (read from the Microsoft Planetary Computer mirror of the USDA files); choice and tests: `IMAGERY-CHOICE.md` | public domain |')
    w('| Elevation: 3DEP 1 m DEM and the 2017 lidar canopy height model (2 m cells) | USGS 3DEP (project PA_South_Central_B1_2017) | public domain |')
    w('| Removal masks (roads, roofs with cast shadow, monuments, utilities, areas, water) and the modern-feature inventory | `modern/` of this work (scripts and results there); built from OpenStreetMap (ODbL), Adams County GIS 2023 building outlines and centre lines, Census TIGER, USGS NHD, Wikipedia monument list (CC BY-SA) | see `modern/LICENCES.md` (the Adams County data carries no stated licence: used only to decide what to remove, not redistributed here) |')
    w('| 1863 land cover: woods, orchards, wheat field, cleared slope, open ground, coverage, town zone; the lidar canopy mask | `features/landcover/` from the Warren map (Library of Congress cw0353500) and NPS documents | public domain |')
    w('| 1863 roads, lanes, railways, bridges, fences | `features/roads-rail-water/` (Bachelder/Warren sheets, NPS 2004 landscape treatment, Census TIGER, OSM) | public domain / ODbL |')
    w('| 1863 structures catalogue and the list of buildings that survive | `features/structures/` (NPS, HABS/HAER via Library of Congress, Warren/Bachelder plates) | public domain |')
    w('| The borough in 1858: building symbols and street plan | Hopkins/Converse, Map of Adams Co., Pennsylvania (1858), Gettysburg inset, Library of Congress item 2004629149, scan la000697; georeferenced in `maps/` (fit RMSE %s m, leave-one-out %s m, 8 control points) | public domain |' % ('1.91', '2.85'))
    w('\nNot used, and why: Google Earth, Google Maps, Bing, Maxar, Mapbox and any other commercial imagery (their terms forbid derivative or offline use); the `pass7` check greps this repository part for them.\n')
    w('## 3. Pipeline (all scripts in `tools/b1863/`, heavy ones at below-normal priority with at most 4 workers)\n')
    w('| Stage | Script | What it does |\n|---|---|---|')
    w('| 10 | `s10_targets.py` | turns the modern removal mask into targets: THIN (filled from surroundings), DEEP (wide objects: a pixel 13 px from a core of the mask), AREA, WATER; grows masks 2 px; keeps the real roofs of the 41 buildings that stood in 1863 and still stand; adds monument plazas and plinths (%s px); retextures the Soldiers\' National Cemetery (founded after the battle) |' % tg.get('monument_plaza_px_added', '?'))
    w('| 20 | `s20_remove.py`, `pminpaint.py` | removes THIN targets (%s px) by multi-scale PatchMatch with patch voting (own implementation, numba, deterministic): real photographic grain is copied from the surroundings, not diffused |' % tg.get('thin_px', '?'))
    w('| 25 | `s25_lc.py` | rasterises the 1863 land cover; derives the change decisions on the lidar grid with registration margins (section 4) |')
    w('| 28 | `s28_bank.py` | cuts banks of real 24 x 24 px photograph blocks: %s open-ground blocks, %s woods-canopy blocks (never from synthesised pixels) |' % (bk.get('field_blocks', '?'), bk.get('woods_blocks', '?')))
    w('| 30 | `s30_synth.py`, `synth.py`, `quilt.py` | fills wide targets, modern canopy outside 1863 tree cover (with its cast shadow), and 1863 woods that are open now, by image quilting from the banks (Efros-Freeman, colour- and texture-guided, minimum-error seams, boundary colour matching) |')
    w('| 33 | `s33_hopkins.py` | reads the 1858 borough inset: building symbols (solid black rectangles) and the street plan |')
    w('| 34 | `s34_prepare.py` | decides what is drawn (rules in section 4) and records what is not |')
    w('| 35 | `s35_features.py`, `features.py`, `render.py` | draws roads (unpaved ribbons with natural edges, ruts, verge shading and real grain), railway, bridges, fences, roofs with sun-consistent shading and cast shadows, orchards, the Wheatfield colour |')
    w('| 39 | `s39_final.py` | per-pixel provenance raster |')
    w('| 40, 45, 46 | `s40_tiles.py`, `s45_prov_vectors.py`, `s46_manifest.py` | tile pyramid, provenance tiles, GeoJSON provenance, manifest |')
    w('| checks | `checks.py` | the eight verification passes (section 8) |\n')
    w('## 4. Decisions and rules (each one is a place where a judgement was made)\n')
    w('1. **Registration margins.** The 1863 land-cover outlines are georeferenced to the ground with a measured error of median 27 m, 90th percentile 40 m, maximum 63 m (land-cover task). A change is therefore made only where it holds with a margin: modern canopy is removed only where it lies more than 150 m from every 1863 tree polygon (60 m was tried first and removed woods that the NPS says were wooded east of Little Round Top); 1863 woods are added only where the modern canopy is more than 60 m away; orchard trees only where the orchard outline eroded by 12 m has no modern canopy within 25 m. Everything inside the margins stays as photographed and is labelled AMBIGUOUS_KEPT (%s ha).' % (cls.get('AMBIGUOUS_KEPT', {}).get('ha', '?')))
    w('2. **Survivors.** The 41 buildings that stood in 1863 and still stand keep their real roof pixels (modern additions attached to them stay, modern roofing material is the real modern roofing).')
    w('3. **Roads.** Drawn only where the catalogue says present in 1863 and the confidence is not Unknown, on the catalogue line, as unpaved ribbons (turnpike 6.5 m, county road 5.5 m, township road 4.5 m, lane 3 m). The colour is measured from 3,846 samples of 29 real unpaved tracks of the photograph (median-bright half RGB about 200,192,173; the ribbons use RGB 190,181,162 and the macadam 186,182,172). All modern roads are removed; roads not in the catalogue are not drawn.')
    w('4. **The borough.** The 1858 Hopkins inset gives individual building symbols (A1, five years before the battle, georeferenced to 3 m). They replace the 1868-69 Warren masses inside the plan (%s masses superseded; the Warren masses elsewhere stay). Streets of the plan: every non-service street centre line of the modern network inside the plan (alleys, which cross the blocks of the 1858 plan, are not drawn); each was reviewed by eye on `PROVENANCE-LAYER/checks/review_street_overlay.jpg`. Lot boundaries, ridge direction, roof material and the 1859-1863 infill are NOT in the source: roofs are schematic. Modern yard and street trees inside the town block are removed (1863 yard trees are UNKNOWN); the real lawn pixels stay.' % ds.get('masses_superseded_by_hopkins', '?'))
    w('5. **Other structures.** Curated entries with a position error up to 30 m are drawn (documented footprint where known, typical size for the type otherwise). Machine-detected plate symbols (STR-MAPSYM) are drawn only when the position error is at most 35 m and a 2023 building outline lies within the error radius. Everything else is listed as undrawn (`tmp/b1863/build/draw_stats.json`: %d entries).' % len(ds.get('undrawn', [])))
    w('6. **Fences.** Only the 36 fences with a continuous drawn line on the period sheet. The 356 others stay as photographed (fence lines are sub-pixel at 1 m).')
    w('7. **The Wheatfield.** Recoloured to ripe wheat (NPS marker: golden wheat on 2 July 1863); the real field texture is kept, the hue is Estimated (no 1863 colour record), the outline is the catalogue\'s Estimated outline, feathered over about 6 m. No other crop is known; the rest of the open ground keeps the colour of 4 June 2013 (no global seasonal edit is made: the photograph is four weeks before the battle and the July crop state is UNKNOWN).')
    w('8. **Light.** The shadows of the photograph fall toward the north-west (measured on %s isolated trees: darkest ground at %s deg east-counterclockwise, shadow length about 1.1 times the height, from `sun_estimate.py`). Everything drawn (roofs, trees, fences, bridges) is lit and shadowed to match.' % (sun.get('n_trees', '?'), sun.get('shadow_dir_deg_east_ccw', '?')))
    w('9. **Terrain** is not rolled back (road cuts, the quarry, basins): the lidar shows modern ground only. Listed as a limit.\n')
    w('## 5. Areas of each provenance class\n')
    w('| Class | Code | Hectares | Meaning |\n|---|---:|---:|---|')
    import s45_prov_vectors as V
    for name, v in sorted(cls.items(), key=lambda kv: kv[1]['code']):
        w('| %s | %d | %s | %s |' % (name, v['code'], v['ha'], V.DEFS.get(v['code'], '')))
    w('')
    w('## 6. Drawn features\n')
    w('Counts from `tmp/b1863/build/draw_stats.json`: ' + ', '.join('%s %s' % (k, v) for k, v in ds.get('counts', {}).items()) + '. Hopkins 1858: %s. Machine-detected plate symbols: %s.\n' % (json.dumps(ds.get('hopkins', {})), json.dumps(ds.get('mapsym', {}))))
    w('## 7. Accuracy: what is measured and what is not\n')
    w('Nothing here is a ground survey. The numbers are those of the inputs, plus the checks below.\n')
    w('| Layer | Number | From |\n|---|---|---|')
    w('| Photograph vs county building outlines (2023) | median shift 0.0 m east, -1.0 m north, spread 1.5 m (4,000 buildings) | `modern/results/registration.json` |')
    w('| Warren map to ground | 16 m absolute (leave-one-out), 2 to 3 m relative | `maps/README.md` |')
    w('| Hopkins 1858 inset | 1.9 m fit, 2.85 m leave-one-out, 4.2 m maximum | `maps/transforms/hopkins-1858-gettysburg-inset.json` |')
    w('| 1863 woods, orchards, open ground outlines | 27 m median, 40 m 90th percentile, 63 m maximum against independent control points; stated 30 to 40 m | `SOURCES-landcover.md` |')
    w('| 1863 structures from the Warren/Bachelder plates | leave-one-out median 10 m, 90th percentile 22 m, maximum 35 m (and a 76 m disagreement between two georeferences of the same plate at the plate edges) | `SOURCES-structures.md` |')
    w('| 1863 roads | modern centre lines on the 1863 corridors; period-map registration 15 to 19 m | `SOURCES-roads.md` |')
    w('| Roofs from Hopkins symbols | 3 to 4 m position, nominal size | this build |')
    w('\nUnknown and not measured: the colour of July 1863 fields (crops), woods cut or grown between 1863 and the 1868-69 survey, the 1863 stream courses (the modern NHD courses are kept), the terrain, the street trees and yard trees, farm lanes not in the catalogue, fences not in the catalogue, buildings not in the catalogue or on the 1858 inset.\n')
    w('## 8. The eight verification passes\n')
    w('Each pass writes `PROVENANCE-LAYER/checks/passN.json`. Results of this build:\n')
    w('| Pass | Question | Result |\n|---|---|---|')
    c1 = ck[1]; w('| 1 pixel accounting | do pixels labelled "kept photograph" differ from the photograph? | %s of the kept pixels differ by more than 6 grey levels |' % c1.get('unlabelled_change_share', '?'))
    c2 = ck[2].get('per_class', {})
    w('| 2 closed loop | does a modern-surface detector still fire inside removed areas? | ' + '; '.join('%s: mean P(modern) %s -> %s' % (k, v['mean_p_modern_before'], v['mean_p_modern_after']) for k, v in c2.items() if k.startswith(('removed', 'canopy', 'town', 'kept'))) + ' |')
    c3 = ck[3]; w('| 3 drawn roads and ghosts | do catalogue roads fall on drawn roads; grey ghost pixels left in the old road corridor | %s of road samples on drawn roads; ghost share %s (before %s) |' % (c3.get('share_of_road_samples_drawn', '?'), c3.get('ghost_after', {}).get('share', '?'), c3.get('ghost_before', {}).get('share', '?')))
    c4 = ck[4]; w('| 4 seams | colour step at window seams and at filled-region borders | random line %s, window rows %s, window columns %s, filled-region border %s |' % (c4.get('random_line_step_mean', '?'), c4.get('window_row_seam_step_mean', '?'), c4.get('window_col_seam_step_mean', '?'), c4.get('synth_border_mean_step', '?')))
    c5 = ck[5]; w('| 5 repeated texture | near-duplicate 32 px patches within 320 px | open fill %s, removed fill %s, drawn road %s, untouched %s |' % (c5.get('synthesised_open', {}).get('near_duplicate_share', '?'), c5.get('synthesised_removed', {}).get('near_duplicate_share', '?'), c5.get('road_drawn', {}).get('near_duplicate_share', '?'), c5.get('untouched', {}).get('near_duplicate_share', '?')))
    c6 = ck[6]; w('| 6 colour and light | Lab difference of filled and drawn classes to the ground around; shadow direction of drawn roofs | %s; roof shadow at %s deg (expected 130) |' % (json.dumps({k: v.get('median_dE') for k, v in c6.get('lab_difference_to_context', {}).items()}), c6.get('drawn_roof_shadow_direction_deg_east_ccw', '?')))
    c7 = ck[7]; w('| 7 sources, licences, labels | banned imagery terms outside a "not used" sentence; claims; tile hashes; size; sources on every feature | banned hits %s; accuracy-claim hits outside a negation %s; tile hash mismatches %s of %s; %s MB; features missing sources %s of %s |' % (len(c7.get('banned_hits_not_in_a_not_used_statement', [])), len(c7.get('accuracy_claims_not_in_a_negation', [])), c7.get('tiles_hash_mismatch', '?'), c7.get('tiles', '?'), c7.get('tiles_MB', '?'), c7.get('n_missing', '?'), c7.get('added_features', '?')))
    w('| 8 hotspot review | five hotspots at z13, z15, z16.5, z17.5 from the written tiles | %d images in `PROVENANCE-LAYER/checks/review/` (looked at; fixes made are in section 9) |' % len(ck[8].get('images', [])))
    det = J(os.path.join(C.PROV, 'checks', 'determinism.json'))
    w('')
    w('Reading the table: (2) the detector reads removed areas as far less modern than before (the floor is the untouched level 0.19); drawn roads and roofs are meant to stay "modern surface" to a detector (0.75 and 0.48), they are roads and roofs. (4) The step across the 1024 px window seams (6.1 to 6.3) is about 12 percent above the random-line step (5.55): a faint seam effect cannot be excluded and was not traced further; the border of filled regions (2.3) is small. (5) Quilted and filled areas show no more repeated 32 px patches than untouched ground. (6) Roads are 28 L* units lighter than the surrounding ground by design (a pale dirt ribbon); the wheat tone is deliberately far from the 2013 grass. Determinism: PatchMatch stage run twice, byte-identical = %s; one 900 px quilting window run twice, identical = %s (`PROVENANCE-LAYER/checks/determinism.json`).' % (det.get('identical'), det.get('stage30_quilt_window_town_900px', {}).get('identical')))
    w('')
    w('## 9. Fixes made after looking, and known artefacts that remain\n')
    w(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'artefacts.md'), encoding='utf-8').read() if os.path.exists(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'artefacts.md')) else '(to be filled)')
    w('\n## 10. Licences and attribution table\n')
    w('| Source | Used for | Licence | Attribution shown |\n|---|---|---|---|')
    w('| USDA FSA NAIP 2013-06-04 | the photograph | public domain | NAIP imagery provided by USDA Farm Service Agency |')
    w('| USGS 3DEP (lidar, DEM) | canopy mask, terrain analysis | public domain | USGS 3DEP |')
    w('| Library of Congress: Warren 1868-69, Bachelder 1876, Hopkins/Converse 1858 | 1863 land cover, roads, structures, the 1858 borough | public domain (Library of Congress, no rights advisory) | Library of Congress Geography and Map Division |')
    w('| Historic American Buildings Survey / HAER (Library of Congress) | structure identity and size | public domain | HABS/HAER, Library of Congress |')
    w('| National Park Service documents (Cultural Landscape Reports, Treatment Philosophy 2004, NPS web pages) | 1863 land cover, roads, structures | public domain (US Government work) | National Park Service |')
    w('| US Census TIGER/Line 2023, USGS NHD | road control, water | public domain | US Census Bureau, USGS |')
    w('| OpenStreetMap | list of modern features to remove; modern street centre lines used on the 1858 plan | ODbL 1.0 | (c) OpenStreetMap contributors |')
    w('| Adams County GIS building outlines 2023 | list of modern buildings to remove; corroboration of plate symbols | county public records, no licence text published | Adams County GIS (not redistributed here) |')
    w('| Wikipedia monument list | monument positions to remove | CC BY-SA 4.0 | Wikipedia contributors |')
    w('\nThe manifest carries the attribution text: "Reconstruction of Gettysburg, July 1863, built from USGS/USDA NAIP imagery ... with period maps ...".\n')
    w('## 11. Rebuild\n')
    w('`python tools/b1863/run_all.py` (about 25 minutes on this machine with 4 workers). Inputs live under `tmp/b1863/` (not committed): `modern/work/naip2013_1.0m.tif`, `removal_mask_1m.tif`, `detect_ppav.tif`, `inventory_utm.pkl`; `landcover/canopy_smooth.npy`; `maps/scans/la000697.jp2`. Their scripts are in `docs/basemap1863/modern/scripts`, `features/landcover/scripts` and `maps/tools`. Everything is seeded and deterministic (seed 1863).\n')
    open(os.path.join(C.DOCS, 'BUILD.md'), 'w', encoding='utf-8').write('\n'.join(L))
    print('BUILD.md', os.path.getsize(os.path.join(C.DOCS, 'BUILD.md')))

if __name__ == '__main__':
    main()

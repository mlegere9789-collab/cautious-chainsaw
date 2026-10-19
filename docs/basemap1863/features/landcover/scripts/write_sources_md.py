import json, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from sources_reg import SRC
ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..'))
DOC = os.path.normpath(os.path.join(ROOT, '..', '..', '..', 'docs', 'basemap1863'))
st = json.load(open(os.path.join(ROOT, 'final_stats.json')))
V = json.load(open(os.path.join(DOC, 'features', 'landcover', 'VERIFICATION-landcover.json')))
cnt = st['counts']; ac = st['acres']
rows = []
for k, s in SRC.items():
    rows.append("| %s | %s | %s | <%s> | %s | %s |" % (k, s['type'], s['cite'], s['url'], s['rights'], s['note']))
p1 = V['p1_tiger_fit_ffd']; p1s = V['p1_tiger_fit_similarity']; p2 = V['p2_independent_gcps']; p3 = V['p3_terrain_registration']
p4 = V['p4_canopy_persistence']; p5 = V['p5_naip_2022_04_leafoff_check']; p7 = V['p7_schema']; p8 = V['p8_rebuild_identical']
agree = sum(1 for v in V['p6_landmarks'].values() if v['agrees']); nlm = len(V['p6_landmarks'])
md = """# Sources for the 1863 land-cover reconstruction

Owner: land-cover pipeline (`docs/basemap1863/features/landcover/`). Generated 2026-10-19 from `scripts/sources_reg.py` and the verification run. Every number below comes from a command run in this session (script names in `scripts/`).

## 1. What this is, and what it is not

No aerial photograph of the battlefield in 1863 exists. This is a **reconstruction** of the July 1863 land cover (woods, orchards, tree clusters, marsh, boulder ground, one documented wheat field, one cleared slope, and the rest as open farmland) from the Warren survey of 1868-69. Modern tree canopy measured from 2017 lidar shows where today's trees were **not** there in 1863 and where 1863 woods are open now. It must be labelled "reconstruction" wherever it is shown. It is not "1:1" and not "100 percent accurate"; measured and estimated accuracy is in section 5.

Main limit: the Warren sheet was made **five to six years after the battle** (surveyed 1868 and 1869, revised on the ground in 1873 by P. M. Blake). Its printed legend says every object is shown as near as possible as it was at the time of the battle, but I could not check that claim. Woods cut or regrown between 1863 and 1869 are UNKNOWN. Land outside the sheet's inner frame (the sheet covers %(cov).0f acres) is UNKNOWN and gets no features.

## 2. Source table (licence and attribution)

| Id | Type | Citation | URL | Licence | What was taken from it, and caveats |
|---|---|---|---|---|---|
%(rows)s

Source types: A1 = primary period map or record; B = secondary; MODERN = modern measurement used only for registration or the change layers (not an 1863 source). No Google, Bing, Maxar or Mapbox imagery was used.

## 3. Feature files (GeoJSON in EPSG:4326, plus `.3857.geojson` Web Mercator copies)

| File | Features | Acres | Class and confidence |
|---|---|---|---|
| `woods_1863` | %(n_woods)d | %(a_woods).0f | woodlots from Warren tree symbols; Documented for dense symbol areas, Estimated for hand-drawn sparse ones |
| `orchards_1863` | %(n_orch)d | %(a_orch).0f | orchards from Warren orchard symbols (incl. Peach Orchard); Documented (automatic) or Estimated (hand) |
| `scattered_trees_1863` | %(n_sc)d | %(a_sc).0f | small tree-glyph clusters and residual symbol regions; Estimated, may include lettering mistaken for glyphs (see section 6) |
| `marsh_wetland_1863` | %(n_m)d | %(a_m).0f | Warren grass-tuft marsh symbols and the Plum Run bottom (NPS CLR); Estimated |
| `boulder_fields_1863` | %(n_b)d | %(a_b).0f | Devil's Den and Houck's Ridge boulder ground; Estimated |
| `fields_documented_1863` | %(n_f)d | %(a_f).0f | Wheatfield (Rose farm), standing wheat; Estimated outline, Documented crop |
| `open_cleared_1863` | %(n_o)d | %(a_o).0f | Little Round Top west slope cleared (Hanaway tract); Estimated |
| `open_ground_1863` | %(n_og)d | %(a_og).0f | everything else inside the sheet that is not tree, wet, boulder or town; open farmland, crop type UNKNOWN |
| `coverage_warren_sheet`, `excluded_town_zone` | 1, 1 | %(a_cov).0f, %(a_town).0f | extent of the evidence; the town block is left to the structures layer |
| `change_remove_modern_canopy` | %(n_rem)d | %(a_rem).0f | modern canopy absent in 1863: replace with the surrounding open-ground texture |
| `change_add_1863_tree_cover` | %(n_add)d | %(a_add).0f | 1863 tree cover with no canopy now: add leaf-on trees or orchard rows |

Also: `season_july_1863.json` (leaf and crop state for the grading), `crops_unknown_1863.json` (what is not known), `VERIFICATION-landcover.json` (eight passes), `scripts/` (the pipeline).

Every feature carries `id, category, subtype, name, geometry, present_1863, period_note, sources[{cite, sheet_or_page, url, type, quote_or_paraphrase}], method, positional_error_m, confidence, notes`. Names are given only where the Warren label or an NPS source supports them; most polygons are unnamed.

## 4. Method in brief

1. Fetched the Warren scan (LoC `cw0353500.jp2`, 8878 x 9845 px) and Census TIGER 2023 roads. Fitted a similarity transform (rotation, scale, shift) of the sheet to about 5,900 road points by minimising distance to ink, then a smooth free-form warp (8 x 9 control grid, strong smoothness penalty, largest control shift 26 px).
2. Detected tree-symbol areas (ink density with long lines removed, then local texture) and reviewed **every** candidate by eye in 42 map tiles (wood, orchard, marsh or reject). Added hand outlines where symbols were sparse, then reviewed the residual dense-symbol regions and small-glyph clusters.
3. Converted to UTM 18N through the georeference, merged, simplified (1 to 1.2 m) and wrote GeoJSON.
4. Downloaded 3DEP lidar (USGS_LPC_PA_South_Central_B1_2017, EPT depth up to 10, 7,628 nodes, 2.1 GB, not committed). Built a 2 m canopy height model (highest non-ground return minus ground). Canopy = height above 4 m with a multi-return share above 0.08, 5 x 5 majority filter. Change layers: modern canopy more than 12 m from any 1863 tree polygon (remove); 1863 tree polygons with no canopy within 6 m (add).

## 5. Measured accuracy and what is uncertain

(from `VERIFICATION-landcover.json`)

- **Pass 1, fit to roads:** median %(p1m)s m, %(p1f)d %% of road points within 5 m (similarity transform only: median %(p1sm)s m, %(p1sf)d %% within 5 m). Optimistic: these points were fitted, and roads moved after 1863.
- **Pass 2, independent control:** 25 ground control points picked by the maps agent (summits, junctions, bridges, farm buildings) disagree with my transform by a median of %(p2m)s m (90th percentile %(p2p)s m, maximum %(p2x)s m). Unresolved: either their picks, my fit, or the 1863-versus-modern positions of the features carry 25 to 30 m of error. I therefore state **30 to 40 m** positional error for the polygons.
- **Pass 3, terrain:** Warren ink density against slope from lidar, 3 km windows: median best-fit shift %(p3m).0f m (90th percentile %(p3p).0f m); the correlation is weak (0.3 to 0.47), so it only confirms the error scale.
- **Pass 4, canopy persistence:** modern canopy covers %(p4w).0f %% of the interior of mapped 1863 woods, %(p4o).0f %% of 1863 open ground outside the town block (much of it modern hedgerow, stream-bank and suburban growth, and some Warren omissions), and %(p4s).0f %% of the whole sheet.
- **Pass 5, 2022-04 NAIP:** woods NDVI %(w_nd)s, brightness %(w_br)s; open ground NDVI %(o_nd)s, brightness %(o_br)s. **Weak contrast**: the polygons are not clearly separated by April colour, so this pass adds little confidence.
- **Pass 6, landmarks:** %(agree)d of %(nlm)d agree (Culp's Hill and Big Round Top wooded; Peach Orchard an orchard; Wheatfield, Little Round Top summit and Cemetery Hill not woods). The Herbst Woods test point (coordinates from memory, approximate) falls 52 m outside the nearest wood: not resolved.
- **Pass 7, schema:** %(nfeat)d features, %(nschema)d schema problems, %(ninv)d invalid geometries, directory %(mb)s MB.
- **Pass 8, determinism:** rebuilt all %(nfiles)d GeoJSON files; identical = %(ident)s.

## 6. Known weaknesses (not hidden)

- The canopy mask uses lidar from **2017**, not 2026 and not the base photograph's date; it also catches roof edges and fence-line trees. The remove layer is about 3,770 acres, mostly hedgerows, stream corridors and modern suburbs; hedgerows may have existed in 1863 but Warren did not draw them (UNKNOWN). Inside the town, 1863 yard and street trees are UNKNOWN; the town block is excluded from land cover.
- `scattered_trees_1863` clusters come from glyph detection; some are probably lettering or hachure marks rather than trees. Treat them as sparse single trees at most, never as dense canopy.
- Woodlot extents are the 1868-69 state: timber cut for breastworks or fuel in July 1863, and regrowth to 1869, are not modelled.
- Orchard blocks marked Documented are on the Warren sheet; whether each existed in July 1863 is not separately sourced.
- The 18-acre Herbst woodlot (Hartwig) cannot be separated from neighbouring woods in the mapped complex.
- Photographs of 1863 (Gardner, O'Sullivan, Brady, Tyson, Weaver; Frassanito's camera positions) were **not analysed**: the Library of Congress API returned HTTP 429 and its item pages HTTP 403 to the fetch tool during this run. Only catalogue titles seen in search results are cited (S-LOC-PHOTOS). This is the main source of 1863 vegetation evidence not yet used.
- Official Records and veterans' accounts of specific woods and fields were not systematically read; only the Hartwig essay, the Little Round Top CLR and the Trostle claim text were read in full or in part.
- The NPS vegetation inventory (GETT) and the park's 1999 GMP historic-woodlot maps were not obtained (no open GIS layer found on the NPS ArcGIS services; the NPS Data Store was not reachable with the tools used). A comparison against them would be the best independent check.
""" % dict(
    cov=ac['coverage'], rows="\n".join(rows),
    n_woods=cnt['woods_1863'], a_woods=ac['woods'], n_orch=cnt['orchards_1863'], a_orch=ac['orchards'], n_sc=cnt['scattered_trees_1863'], a_sc=ac['scattered_trees'],
    n_m=cnt['marsh_wetland_1863'], a_m=ac['marsh_wetland'], n_b=cnt['boulder_fields_1863'], a_b=ac['boulder_fields'], n_f=cnt['fields_documented_1863'], a_f=ac['fields_documented'],
    n_o=cnt['open_cleared_1863'], a_o=ac['open_cleared'], n_og=cnt['open_ground_1863'], a_og=ac['open_ground'], a_cov=ac['coverage'], a_town=ac['excluded_zone'],
    n_rem=cnt['change_remove_modern_canopy'], a_rem=ac['change_remove'], n_add=cnt['change_add_1863_tree_cover'], a_add=ac['change_add'],
    p1m=p1['median_m'], p1f=int(p1['frac_within_5m'] * 100), p1sm=p1s['median_m'], p1sf=int(p1s['frac_within_5m'] * 100),
    p2m=p2['median_m'], p2p=p2['p90_m'], p2x=p2['max_m'], p3m=p3['median_abs_shift_m'], p3p=p3['p90_abs_shift_m'],
    p4w=p4['modern_canopy_in_woods_interior'] * 100, p4o=p4['modern_canopy_outside_all_1863_tree_polys_excl_town'] * 100, p4s=p4['modern_canopy_frac_of_sheet'] * 100,
    w_nd=p5['woods']['ndvi_mean'], w_br=p5['woods']['brightness_mean'], o_nd=p5['open_ground_1863']['ndvi_mean'], o_br=p5['open_ground_1863']['brightness_mean'],
    agree=agree, nlm=nlm, nfeat=p7['features'], nschema=p7['schema_problems'], ninv=p7['invalid_geometries'], mb=p7['directory_mb'], nfiles=p8['files'], ident=p8['identical'])
open(os.path.join(DOC, 'SOURCES-landcover.md'), 'w', encoding='utf-8').write(md)
print(len(md))

# 1863 land-cover reconstruction (RECONSTRUCTION, not a photograph of 1863)

Files are GeoJSON (EPSG:4326) with `.3857.geojson` Web Mercator copies. Read `../../SOURCES-landcover.md` first: it has the licences, the measured accuracy (30 to 40 m positional error, not "1:1") and the list of what is UNKNOWN.

- Land-cover classes: `woods_1863`, `orchards_1863`, `scattered_trees_1863`, `marsh_wetland_1863`, `boulder_fields_1863`, `fields_documented_1863`, `open_cleared_1863`, `open_ground_1863`.
- Extent: `coverage_warren_sheet` (outside it nothing is known), `excluded_town_zone`.
- Change map for the imagery: `change_remove_modern_canopy` (replace by the surrounding open-ground texture), `change_add_1863_tree_cover` (add leaf-on trees).
- `season_july_1863.json`, `crops_unknown_1863.json`, `VERIFICATION-landcover.json`.
- `scripts/`: the pipeline. It was run from a scratch folder (`tmp/b1863/landcover/`, not committed) that holds the Warren scan, NAIP tiles and the 2.1 GB lidar cache; `decisions.json` and `manual.json` are the recorded human review decisions.

Rebuild: `python scripts/final_build.py` then `python scripts/verify.py` (needs the scratch inputs).

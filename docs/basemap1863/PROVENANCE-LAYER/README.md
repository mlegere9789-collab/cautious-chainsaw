# Provenance layer of the 1863 reconstruction

**The base map is a reconstruction, not a photograph of 1863.** This folder says, for every pixel and every drawn feature, what was changed and why. Nothing here claims the map is an exact replica or perfectly accurate; the measured numbers and the open questions are in `../BUILD.md` (sections 7 to 9).

## Files

| File | Content |
|---|---|
| `tiles/{z}/{x}/{y}.png` | per-pixel provenance class as a palette PNG (class code = palette index), the same 512 px tile grid and tile index as `../tiles/` (Mapbox GL convention, zoom z = camera zoom), z13 and finer. Nearest-neighbour sampled from the 1 m class raster: do not smooth it. |
| `classes.json` | class codes, names and meanings |
| `added_features.geojson` | every drawn road, railway, bridge, fence, building, building mass and orchard area (WGS84): `id, cls, name, confidence, positional_error_m, method, sources[]` (each source: title, locator, URL, type A1 primary map or record, A2 later first-hand, B secondary) |
| `changed_regions.geojson.gz` | outlines (gzip) of removed or re-synthesised ground, canopy removed, trees added, town ground, and the ambiguous regions that were kept |
| `checks/` | the eight verification passes (`pass1.json` to `pass8.json`), the street-plan review overlay and the hotspot review images |

## Classes

| Code | Name | Meaning | Confidence of the change |
|---:|---|---|---|
| 0 | PHOTO_KEPT | 2013 photograph, unmodified, inside the Warren-sheet coverage. Not verified as 1863: no source says it differs | not applicable |
| 22 | PHOTO_KEPT_OUTSIDE | 2013 photograph, unmodified, outside the Warren-sheet coverage (1863 land cover unknown) | not applicable |
| 1 | REMOVED_PATCH | modern road, roof, utility or small object removed, filled from the surroundings (PatchMatch) | the removed object is a documented modern feature; the fill is Estimated |
| 2 | REMOVED_SYNTH | wide modern object or area removed, ground re-synthesised from real photograph blocks | same |
| 3 | CANOPY_REMOVED | modern tree canopy further than 150 m from every 1863 tree polygon, replaced by open-ground texture | Estimated |
| 4 | TREES_ADDED | 1863 woods that are open now (further than 60 m from modern canopy), real canopy blocks added | Estimated |
| 5 | TOWN_GROUND | the town block ground (modern yards, streets, trees removed; 1858 plan drawn on it) | Estimated |
| 6 | ROAD_ADDED | 1863 road, lane or town street drawn | per feature (Documented or Estimated) |
| 7 | RAIL_ADDED | the 1858 railroad (track) or the unfinished railroad grade | per feature |
| 8 | BRIDGE_ADDED | 1863 bridge | per feature |
| 9 | FENCE_ADDED | fence or wall with a continuous drawn line on the period sheet | Estimated |
| 10 | STRUCTURE_ADDED | 1863 building (documented footprint or typical size; schematic roof) | per feature |
| 11 | ORCHARD_ADDED | orchard trees on an orchard polygon of the Warren sheet | Estimated |
| 12 | CROP_RECOLOURED | the Wheatfield recoloured to ripe wheat (hue Estimated, outline Estimated) | Estimated |
| 13 | TOWN_MASS_ADDED | a building mass of the 1868-69 survey outside the 1858 plan (schematic roofs) | Estimated |
| 20 | AMBIGUOUS_KEPT | inside the registration margin of an 1863 tree polygon: photograph kept, the evidence cannot decide | kept |
| 21 | SURVIVOR_KEPT | a building that stood in 1863 and still stands: its real roof pixels are kept | Documented (identity), modern roofing |

## Showing what was changed

Draw the provenance tile for the same (z, x, y) over the photograph tile and give it an opacity; the viewer can group the codes: removed (1, 2, 3), added (4 to 13), kept but uncertain (20, 22), survivors (21). Always keep the label "Reconstruction of Gettysburg, July 1863" visible; the text for it is in `../tiles/manifest.json`.

## Sources of the change decisions

Warren (1868-69) and Bachelder (1876) maps, Library of Congress; Hopkins/Converse (1858) borough inset, Library of Congress item 2004629149; National Park Service landscape documents; USGS NAIP, 3DEP, NHD; Census TIGER; OpenStreetMap contributors (ODbL); Adams County GIS (2023, used to decide what to remove). The licence and attribution table is in `../BUILD.md`, section 10.

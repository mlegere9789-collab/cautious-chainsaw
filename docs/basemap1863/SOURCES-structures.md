# Sources and method: structures standing in July 1863 (Gettysburg battlefield)

Owner of this part: the structures task of the 1863 base map. Layer: `docs/basemap1863/features/structures/structures.geojson` (EPSG:4326) and `structures.mercator.geojson` (EPSG:3857). Table of modern structures: `modern_structures_to_remove.json` / `.csv`; survivors to keep: `retain_1863_survivors.csv`. Regenerate everything with `src/build_structures.py`, `src/build_modern_table.py`, `src/verify_structures.py`, `src/build_sources_doc.py`.

## What this is, and what it is not

No aerial photograph of Gettysburg exists for 1863. This layer is a **reconstruction** of where buildings stood, assembled from the post-battle survey of 1868-69 (Warren), later NPS and HABS documentation, and the footprints of the buildings that survive. It is labelled so in the file header and must be labelled so wherever it is shown. It is not "1:1" and it is not "100 percent accurate": each feature states its own positional error and confidence, and where a position is not supported by any source the feature has **no geometry** (UNKNOWN) rather than a guess.

Contents of the layer (602 features):

| Kind | Count | Notes |
|---|---|---|
| Curated farm buildings, farmsteads and named landmarks | 110 | each with sources, method, error, confidence; 15 without geometry (UNKNOWN) |
| Borough building masses (subtype `borough_building_mass`) | 229 | ink extent of the building symbols of the Warren plate, **not individual footprints** |
| Machine-detected building symbols (`unreviewed_symbol`) | 263 | rural symbols not yet read by hand; owner label is an OCR hint; error 30 m within 800 m of a control point, up to about 110 m at the far north-west and west edges |

Status of the curated features: destroyed_1863 4, lost_later 31, ruin 2, survives 31, survives_altered 16, unknown_fate 26.
Confidence over all features: Contested 1, Documented 41, Estimated 557, Unknown 3. (Documented = named in an NPS, HABS or claim source and tied to a surviving or marked site; Estimated = supported by the Warren-plate symbol and or an NPS statement, position or identity less certain; Contested = sources disagree; Unknown = no position.)

Meaning of `present_1863`: the structure (or its predecessor on the same site) stood on 1-3 July 1863. `geometry_represents` says what the drawn shape is: the outline of the present building taken as the 1863 building, the outline of an altered building (the 1863 form was smaller; `fabric_1863` says what is known), a later building on an 1863 site (for example the 1884 Codori barn, the 1868 Sherfy barn, the 1935 Spangler barn), a point at a map symbol, or the extent of ink on a map.

## Method

1. **Catalogue from documents.** Every named structure was entered from an NPS Cultural Landscapes Inventory or National Register description (building dates, dimensions, material, roof, fate), HABS records (Library of Congress), the NPS historic structure reports and the NPS landscape and management documents of 1958-2024 (sources table below). Fate in or after the battle (burned, demolished, ruin, survives altered) comes from the same documents.
2. **Positions of surviving buildings** are the 2023 Adams County building outlines of the surviving building (identity taken from the NPS or HABS name and checked against the Warren symbol). Where the building was later altered the entry says so; the 1863 footprint is then smaller than the drawn outline.
3. **Positions of lost buildings** come from the building symbols of the Warren survey of 1868-69 as printed on the Bachelder maps of 1876 and on the Warren plate cw0353500 (1 inch = 1000 ft, about 1:12,000; both Library of Congress, public domain). The plate was georeferenced by a thin-plate spline: 88 control points, of which 19 are surviving farm buildings read by hand, 46 are building pairs found by a robust nearest-neighbour fit (rural only), and 23 are road junctions, bridges, summits and farm buildings from the sibling maps task (`docs/basemap1863/maps/gcps/warren.json`). Where a farmstead has surviving buildings, lost buildings of the same farmstead are placed by their **offset from the surviving ones** (local anchors), which removes the plate distortion; otherwise through the global model.
4. **Accuracy of the georeference** (leave-one-out, metres on the ground, one metre is about one pixel of the working frame): median 10.0, mean 11.4, 90th percentile 22.4, maximum 35.0 over all 88 control points. By kind: curated n=19 median 11.6 max 32.0; icp n=46 median 9.3 max 24.4; sib_summit n=4 median 15.8 max 22.9; sib_road-junction n=7 median 9.9 max 12.9; sib_bridge n=2 median 26.4 max 35.0; sib_farm-building n=10 median 5.4 max 25.4. 9 control points whose error exceeded 35 m or three times the median were left out of the fit; the sparse north-west (First Day) corner can be 50 m or more out, so features placed there only through the global model carry the larger error given by the distance rule below: this is why the McPherson symbols are not drawn.
5. **Positional error per feature**: surviving-building outlines 4-8 m (18 m for the church whose 1863 shape is unknown, 40 m for the Presbyterian church site); plate symbols placed with local anchors `max(10, 1.5 x anchor spread + 6)` m; plate symbols through the global model 25 m within 800 m of a control point and 4 m more per further 100 m (leave-one-out error grows with distance from control; 78 m at the McPherson barn, 1.1 km from the nearest control point); machine-detected symbols the same rule with a floor of 30 m; floors of 60 m in the north-west quarter and 45 m east of town, where the control is thin and the two georeferences disagree; named OSM points 12-150 m as stated.

### Honesty rules applied

- A building with no source for its position has no geometry (confidence Unknown or Documented-without-position): 15 curated entries.
- The 1863 form of an altered building is not invented: the drawn outline is the present one and the entry says what is known of the 1863 form (for example Sherfy, Codori, Klingel, Trostle additions).
- Roles (house, barn, outbuilding) are given only where a document or the geometry supports them; many Warren symbols are entered as "building" with roles unresolved.
- Conflicts between sources are kept visible (Rose barn: NPS windstorm 1935 versus a lightning fire in one web source; Bryan house and barn distances; Presbyterian church; Christ Lutheran Church address 30 versus 44 Chambersburg Street).

## Curated entries by farmstead

| Farmstead / group | Feature id | Name | Status | Conf. | Geometry | Err (m) |
|---|---|---|---|---|---|---|
| Daniel Klingel farmstead | STR-KLINGEL-HOUSE1 | Klingel farm house | survives_altered | Documented | footprint_2023_outline | 4 |
| Daniel Klingel farmstead | STR-KLINGEL-BAKE_OVEN1 | Klingel exterior bake oven | survives | Documented | none | none |
| Daniel Klingel farmstead | STR-KLINGEL-OUTBUILDING1 | Klingel farmstead: wood building NE of the house (Warren plate) | unknown_fate | Estimated | map_symbol_point | 10 |
| Abraham (Catherine) Trostle farmstead | STR-TROSTLE-HOUSE1 | Trostle farm house | survives_altered | Documented | footprint_2023_outline | 4 |
| Abraham (Catherine) Trostle farmstead | STR-TROSTLE-BARN1 | Trostle barn | survives | Documented | footprint_2023_outline | 4 |
| Abraham (Catherine) Trostle farmstead | STR-TROSTLE-SUMMER_KITCHEN1 | Trostle summer kitchen (under construction) | survives | Estimated | footprint_2023_outline | 15 |
| Abraham (Catherine) Trostle farmstead | STR-TROSTLE-HOG_PEN1 | Trostle log hog pen (seen in O'Sullivan photograph) | lost_later | Documented | none | none |
| Joseph Sherfy farmstead (Peach Orchard) | STR-SHERFY-HOUSE1 | Sherfy farm house | survives_altered | Documented | footprint_2023_outline | 4 |
| Joseph Sherfy farmstead (Peach Orchard) | STR-SHERFY-BARN1 | Sherfy barn of 1863 (burned 3 July 1863) | destroyed_1863 | Documented | map_symbol_point | 10 |
| Joseph Sherfy farmstead (Peach Orchard) | STR-SHERFY-OUTBUILDING1 | Sherfy farmstead: wood building W of the house (Warren plate) | unknown_fate | Estimated | map_symbol_point | 11 |
| Nicholas Codori farmstead | STR-CODORI-HOUSE1 | Codori farm house (1834 section) | survives_altered | Documented | footprint_2023_outline | 4 |
| Nicholas Codori farmstead | STR-CODORI-BARN1 | Codori barn standing in 1868-69 (Warren plate) | unknown_fate | Estimated | map_symbol_point | 10 |
| Nicholas Codori farmstead | STR-CODORI-OUTBUILDING1 | Codori farmstead: wood building E of the barn (Warren plate) | unknown_fate | Estimated | map_symbol_point | 11 |
| Henry Spangler farmstead | STR-SPANGLER_H-HOUSE1 | Henry Spangler farm house | survives | Documented | footprint_2023_outline | 4 |
| Henry Spangler farmstead | STR-SPANGLER_H-BARN1 | Henry Spangler barn (burned in the battle; 1935 reconstruction on the old foundation) | destroyed_1863 | Documented | footprint_2023_outline | 4 |
| Henry Spangler farmstead | STR-SPANGLER_H-OUTBUILDING1 | Spangler smokehouse | survives | Unknown | none | none |
| Henry Spangler farmstead | STR-SPANGLER_H-OUTBUILDING2 | Spangler stable and carriage shed | survives | Unknown | none | none |
| Henry Spangler farmstead | STR-SPANGLER_H-OUTBUILDING3 | Spangler farmstead: wood building W of the house (Warren plate) | unknown_fate | Estimated | map_symbol_point | 10 |
| Henry Spangler farmstead | STR-SPANGLER_H-OUTBUILDING4 | Spangler farmstead: stone-lettered symbol E of the house (Warren plate) | unknown_fate | Estimated | map_symbol_point | 10 |
| Henry Spangler farmstead | STR-SPANGLER_H-OUTBUILDING5 | Spangler farmstead: building N of the house (Warren plate) | unknown_fate | Estimated | map_symbol_point | 10 |
| Abraham Brien (Bryan) farmstead | STR-BRYAN-HOUSE1 | Brien (Bryan) house | survives_altered | Documented | footprint_2023_outline | 4 |
| Abraham Brien (Bryan) farmstead | STR-BRYAN-BARN1 | Brien (Bryan) barn | survives_altered | Estimated | footprint_2023_outline | 4 |
| Lydia Leister farmstead (Meade headquarters) | STR-LEISTER-HOUSE1 | Leister house | survives_altered | Documented | footprint_2023_outline | 4 |
| Lydia Leister farmstead (Meade headquarters) | STR-LEISTER-BARN1 | Leister barn | survives | Documented | footprint_2023_outline | 4 |
| Jacob Hummelbaugh farmstead | STR-HUMMELBAUGH-HOUSE1 | Hummelbaugh house | survives | Documented | footprint_2023_outline | 4 |
| Jacob Hummelbaugh farmstead | STR-HUMMELBAUGH-OUTBUILDING1 | Hummelbaugh farmstead: second building W of house (Warren plate) | unknown_fate | Estimated | footprint_2023_outline | 4 |
| George Weikert farmstead | STR-GWEIKERT-HOUSE1 | George Weikert house | survives | Documented | footprint_2023_outline | 4 |
| George Weikert farmstead | STR-GWEIKERT-BARN1 | George Weikert barn | survives | Documented | footprint_2023_outline | 4 |
| George Weikert farmstead | STR-GWEIKERT-SUMMER_KITCHEN1 | George Weikert summer kitchen | survives | Estimated | footprint_2023_outline | 4 |
| George Weikert farmstead | STR-GWEIKERT-SPRING_HOUSE1 | George Weikert wood spring house | lost_later | Documented | none | none |
| John Weikert farmstead | STR-JWEIKERT-HOUSE1 | John Weikert farm house | survives | Estimated | footprint_2023_outline | 4 |
| John Weikert farmstead | STR-JWEIKERT-OUTBUILDING1 | John Weikert farmstead: other symbols on the Warren plate | unknown_fate | Estimated | map_symbol_point | 25 |
| John Weikert farmstead | STR-JWEIKERT-OUTBUILDING2 | John Weikert farmstead: second symbol | unknown_fate | Estimated | map_symbol_point | 25 |
| John Rose farmstead | STR-ROSE-HOUSE1 | Rose farm house (stone) | survives | Documented | footprint_2023_outline | 4 |
| John Rose farmstead | STR-ROSE-SUMMER_KITCHEN1 | Rose stone summer kitchen with bake oven | survives | Documented | none | none |
| John Rose farmstead | STR-ROSE-OUTBUILDING1 | Rose wood-framed smokehouse | survives | Documented | none | none |
| John Rose farmstead | STR-ROSE-BARN1 | Rose barn (granite walls; ruin) | ruin | Estimated | map_symbol_point | 10 |
| John Rose farmstead | STR-ROSE-OUTBUILDING2 | Rose farmstead: wood building on the Warren plate | unknown_fate | Estimated | map_symbol_point | 10 |
| John Slyder farmstead | STR-SLYDER-HOUSE1 | Slyder house (granite) | survives | Documented | footprint_2023_outline | 4 |
| John Slyder farmstead | STR-SLYDER-SUMMER_KITCHEN1 | Slyder kitchen | survives | Unknown | none | none |
| John Slyder farmstead | STR-SLYDER-OUTBUILDING1 | Slyder farmstead: wood building W of the house (Warren plate) | unknown_fate | Estimated | map_symbol_point | 11 |
| John Slyder farmstead | STR-SLYDER-BARN1 | Slyder barn | survives | Estimated | footprint_2023_outline | 4 |
| Michael Bushman farmstead | STR-BUSHMAN-HOUSE1 | Bushman farm house | survives | Estimated | footprint_2023_outline | 4 |
| Michael Bushman farmstead | STR-BUSHMAN-BARN1 | Bushman barn | survives | Estimated | footprint_2023_outline | 4 |
| Warfield / Snyder farmsteads | STR-WARFIELD_SNYDER-HOUSE1 | Warfield house | survives | Estimated | footprint_2023_outline | 4 |
| Warfield / Snyder farmsteads | STR-WARFIELD_SNYDER-OUTBUILDING1 | Warfield farmstead: other symbols (3) | unknown_fate | Estimated | map_symbol_point | 10 |
| Warfield / Snyder farmsteads | STR-WARFIELD_SNYDER-OUTBUILDING2 | Warfield farmstead: other symbol 2 | unknown_fate | Estimated | map_symbol_point | 10 |
| Warfield / Snyder farmsteads | STR-WARFIELD_SNYDER-OUTBUILDING3 | Warfield farmstead: other symbol 3 | unknown_fate | Estimated | map_symbol_point | 10 |
| Warfield / Snyder farmsteads | STR-WARFIELD_SNYDER-OUTBUILDING4 | Snyder farmstead: building 1 (Warren plate) | lost_later | Estimated | map_symbol_point | 25 |
| Warfield / Snyder farmsteads | STR-WARFIELD_SNYDER-OUTBUILDING5 | Snyder farmstead: building 2 (Warren plate) | lost_later | Estimated | map_symbol_point | 25 |
| John Wentz farmstead (Peach Orchard) | STR-WENTZ-HOUSE1 | Wentz log house (site and ruin) | ruin | Documented | map_symbol_point | 20 |
| John Wentz farmstead (Peach Orchard) | STR-WENTZ-OUTBUILDING1 | Wentz farmstead: building 2 (Warren plate) | lost_later | Estimated | map_symbol_point | 25 |
| John Wentz farmstead (Peach Orchard) | STR-WENTZ-OUTBUILDING2 | Wentz farmstead: building 3 (Warren plate) | lost_later | Estimated | map_symbol_point | 25 |
| Peter Rogers farmstead | STR-ROGERS-HOUSE1 | Rogers farm buildings (3 Warren-plate symbols) | lost_later | Documented | map_symbol_point | 20 |
| Peter Rogers farmstead | STR-ROGERS-OUTBUILDING1 | Rogers farmstead: symbol 1 | lost_later | Estimated | map_symbol_point | 25 |
| Peter Rogers farmstead | STR-ROGERS-OUTBUILDING2 | Rogers farmstead: symbol 3 | lost_later | Estimated | map_symbol_point | 25 |
| William Bliss farmstead | STR-BLISS-HOUSE1 | Bliss house (burned 3 July 1863) | destroyed_1863 | Estimated | map_symbol_point | 20 |
| William Bliss farmstead | STR-BLISS-BARN1 | Bliss barn (large stone barn, burned 3 July 1863) | destroyed_1863 | Estimated | map_symbol_point | 20 |
| David McMillan farmstead | STR-MCMILLAN-HOUSE1 | McMillan house | survives | Documented | footprint_2023_outline | 4 |
| David McMillan farmstead | STR-MCMILLAN-BARN1 | McMillan barn (lost) | lost_later | Estimated | map_symbol_point | 25 |
| David McMillan farmstead | STR-MCMILLAN-OUTBUILDING1 | McMillan log building 18 x 20 ft (lost) | lost_later | Estimated | map_symbol_point | 25 |
| Moses McClean farmstead (tenant J. Martin) | STR-MCLEAN-BARN1 | McClean barn | survives | Documented | footprint_2023_outline | 4 |
| Moses McClean farmstead (tenant J. Martin) | STR-MCLEAN-HOUSE1 | McClean house (original narrow house) | survives_altered | Estimated | footprint_2023_outline | 4 |
| McClean tenant farms: David Hagy and John Beams | STR-HAGY_BEAMS-HOUSE1 | Hagy tenant house and barn (lost; 4 Warren-plate symbols for the Hagy and Beams tenant properties) | lost_later | Estimated | map_symbol_point | 25 |
| McClean tenant farms: David Hagy and John Beams | STR-HAGY_BEAMS-OUTBUILDING1 | Hagy/Beams symbol 2 | lost_later | Estimated | map_symbol_point | 25 |
| McClean tenant farms: David Hagy and John Beams | STR-HAGY_BEAMS-OUTBUILDING2 | Hagy/Beams symbol 3 | lost_later | Estimated | map_symbol_point | 25 |
| McClean tenant farms: David Hagy and John Beams | STR-HAGY_BEAMS-OUTBUILDING3 | Hagy/Beams symbol 4 | lost_later | Estimated | map_symbol_point | 25 |
| Edward McPherson farmstead | STR-MCPHERSON-BARN1 | McPherson barn | survives | Documented | footprint_2023_outline | 4 |
| Edward McPherson farmstead | STR-MCPHERSON-HOUSE1 | McPherson farm house (burned 1895) | lost_later | Documented | none | none |
| Edward McPherson farmstead | STR-MCPHERSON-OUTBUILDING1 | McPherson central wagon shed (lost) | lost_later | Documented | none | none |
| John Forney farmstead | STR-FORNEY-HOUSE1 | Forney farmstead (house and barn; demolished 1937) | lost_later | Estimated | map_symbol_point | 20 |
| William/Henry Culp farmstead (Rock Creek) | STR-CULP-HOUSE1 | Culp farm house (brick) | survives | Documented | footprint_2023_outline | 4 |
| William/Henry Culp farmstead (Rock Creek) | STR-CULP-OUTBUILDING1 | Culp farmstead: symbol 2 (Warren plate) | unknown_fate | Estimated | map_symbol_point | 45 |
| William/Henry Culp farmstead (Rock Creek) | STR-CULP-OUTBUILDING2 | Culp farmstead: symbol 3 (stone-lettered) | unknown_fate | Estimated | map_symbol_point | 45 |
| William/Henry Culp farmstead (Rock Creek) | STR-CULP-OUTBUILDING3 | Culp farmstead: symbol 4 | unknown_fate | Estimated | map_symbol_point | 45 |
| William/Henry Culp farmstead (Rock Creek) | STR-CULP-OUTBUILDING4 | Culp farmstead: symbol 5 | unknown_fate | Estimated | map_symbol_point | 45 |
| M. Fry (Frey) farmstead | STR-FRY-OUTBUILDING1 | Frey farmstead: building 1 (Warren plate) | unknown_fate | Estimated | map_symbol_point | 25 |
| M. Fry (Frey) farmstead | STR-FRY-OUTBUILDING2 | Frey farmstead: building 2 (Warren plate) | unknown_fate | Estimated | map_symbol_point | 25 |
| M. Fry (Frey) farmstead | STR-FRY-OUTBUILDING3 | Frey farmstead: building 3 (Warren plate) | unknown_fate | Estimated | map_symbol_point | 25 |
| S. Patterson farmstead | STR-PATTERSON-HOUSE1 | Patterson farmstead: building 1 (Warren plate) | unknown_fate | Estimated | map_symbol_point | 25 |
| S. Patterson farmstead | STR-PATTERSON-OUTBUILDING1 | Patterson farmstead: building 2 (Warren plate) | unknown_fate | Estimated | map_symbol_point | 25 |
| S. Patterson farmstead | STR-PATTERSON-OUTBUILDING2 | Patterson farmstead: building 3 (Warren plate) | unknown_fate | Estimated | map_symbol_point | 25 |
| Adams County Almshouse (Poor Farm) complex | STR-ALMSHOUSE-COMPLEX_BUILDING1 | Almshouse complex building 1 (Warren plate) | lost_later | Estimated | map_symbol_point | 45 |
| Adams County Almshouse (Poor Farm) complex | STR-ALMSHOUSE-COMPLEX_BUILDING2 | Almshouse complex building 2 (Warren plate) | lost_later | Estimated | map_symbol_point | 45 |
| Adams County Almshouse (Poor Farm) complex | STR-ALMSHOUSE-COMPLEX_BUILDING3 | Almshouse complex building 3 (Warren plate) | lost_later | Estimated | map_symbol_point | 45 |
| Adams County Almshouse (Poor Farm) complex | STR-ALMSHOUSE-COMPLEX_BUILDING4 | Almshouse complex building 4 (Warren plate) | lost_later | Estimated | map_symbol_point | 45 |
| Adams County Almshouse (Poor Farm) complex | STR-ALMSHOUSE-COMPLEX_BUILDING5 | Almshouse complex building 5 (Warren plate) | lost_later | Estimated | map_symbol_point | 45 |
| Adams County Almshouse (Poor Farm) complex | STR-ALMSHOUSE-COMPLEX_BUILDING6 | Almshouse complex building 6 (Warren plate) | lost_later | Estimated | map_symbol_point | 45 |
| Adams County Almshouse (Poor Farm) complex | STR-ALMSHOUSE-COMPLEX_BUILDING7 | Almshouse complex building 7 (Warren plate) | lost_later | Estimated | map_symbol_point | 45 |
| Adams County Almshouse (Poor Farm) complex | STR-ALMSHOUSE-COMPLEX_BUILDING8 | Almshouse complex building 8 (Warren plate) | lost_later | Estimated | map_symbol_point | 45 |
| Adams County Almshouse (Poor Farm) complex | STR-ALMSHOUSE-COMPLEX_BUILDING9 | Almshouse complex building 9 (Warren plate) | lost_later | Estimated | map_symbol_point | 45 |
| Borough / landmark | STR-TOWN-COURTHOUSE | Adams County Courthouse (Baltimore Street) | survives_altered | Estimated | footprint_2023_outline | 8 |
| Borough / landmark | STR-TOWN-DEPOT | Gettysburg Railroad station (Carlisle Street; "Lincoln Railroad Station") | survives_altered | Documented | footprint_2023_outline | 6 |
| Borough / landmark | STR-TOWN-CHRIST_LUTHERAN | Christ Lutheran Church (44 Chambersburg Street) | survives_altered | Estimated | footprint_2023_outline | 18 |
| Borough / landmark | STR-TOWN-PENN_HALL | Pennsylvania Hall ("Old Dorm"), Pennsylvania College | survives_altered | Documented | footprint_2023_outline | 4 |
| Borough / landmark | STR-TOWN-SCHMUCKER_HALL | Schmucker Hall, Lutheran Theological Seminary | survives_altered | Documented | footprint_2023_outline | 4 |
| Borough / landmark | STR-TOWN-THOMPSON_HOUSE | Thompson House (Lee's headquarters), Chambersburg Pike | survives | Estimated | footprint_2023_outline | 4 |
| Borough / landmark | STR-TOWN-SCHULTZ_HOUSE | Schultz House (Oak Ridge Academy building) | survives_altered | Documented | footprint_2023_outline | 4 |
| Borough / landmark | STR-TOWN-GATEHOUSE | Evergreen Cemetery gatehouse (Cemetery Hill) | survives_altered | Documented | footprint_2023_outline | 4 |
| Borough / landmark | STR-TOWN-WADE_HOUSE | McClellan house, 548 Baltimore Street (Jennie Wade killed here, 3 July 1863) | survives | Estimated | footprint_2023_outline | 6 |
| Borough / landmark | STR-TOWN-GARLACH_HOUSE | Garlach house, Baltimore Street (Henry Garlach, cabinetmaker; General Schimmelfennig hid behind its woodpile) | survives | Estimated | footprint_2023_outline | 6 |
| Borough / landmark | STR-TOWN-PRESBYTERIAN_CHURCH | Presbyterian Church, Baltimore Street (hospital 1863; present building is later) | survives_altered | Contested | footprint_2023_outline | 40 |
| Borough / landmark | STR-TOWN-BLACK_HORSE_TAVERN | Black Horse Tavern, Fairfield Road (Confederate Heth division area, July 1) | survives | Documented | footprint_2023_outline | 8 |
| Borough / landmark | STR-LOST-BIGGS_HOUSE | Basil Biggs house (former Fisher farm), Taneytown Road | survives | Documented | none | none |
| Borough / landmark | STR-LOST-FISHER_LOG_HOUSE | Fisher farm log house and stable (Taneytown Road) | lost_later | Documented | none | none |
| Borough / landmark | STR-LOST-GRANITE_SCHOOLHOUSE | Granite Schoolhouse (Culp's Hill / Baltimore Pike area) | lost_later | Documented | none | none |
| Borough / landmark | STR-LOST-GUINN_FARM | Guinn farm (Baltimore Pike) | lost_later | Documented | none | none |
| Borough / landmark | STR-LOST-STAUB_FARM | Staub farm (Emmitsburg Road) | lost_later | Documented | none | none |
| Borough / landmark | STR-SITE-SACHS_BRIDGE | Sachs Covered Bridge over Marsh Creek (Sach's Mill road) | survives | Documented | named_point | 12 |
| Borough / landmark | STR-SITE-MCALLISTER_MILL | McAllister's Mill complex (grist and saw mills with two dams), Rock Creek | unknown_fate | Estimated | named_point | 150 |

## Sources

Type: A1 = primary map or record of 1863-1869; A2 = later first-hand; B = secondary or later measured survey. Most facts rest on B sources; the only A1 evidence used is the Warren survey (1868-69) and the 1863 damage claims quoted by NPS. **NPS PDFs, HABS data pages, NPS web pages, OSM and county data were read directly in this session. Four web pages (Gettysburg Daily on the Sherfy barn and on Christ Lutheran Church, the Almshouse history page, the station page) were seen only as web-search result summaries and the page text was not opened; they are the weakest sources here and the entries that rest on them say so (column Read status). Links to loc.gov answered HTTP 403 to the automated re-check at the end of the run (bot protection after earlier requests); the same items were read earlier the same day through the Library of Congress JSON interface and are not retried, to respect the block.**

| Key | Type | Source | URL | Licence | Read status | Features citing |
|---|---|---|---|---|---|---|
| WARREN-BACH | A1 | Bachelder, J.B. (ed.), Map of the battle field of Gettysburg, July 1st, 2nd, 3rd 1863 (Boston, 1876), 3 sheets; topography from the G.K. Warren survey of 1868-69 (1 inch = 200 ft, reduced); LoC call no. G3824.G3S5 1863 .B33; sheets cw0325000a (July 1) and cw0325000c (July 3) were used | https://www.loc.gov/item/99447491/ | Public domain (LoC: no known restrictions; 1876 US publication) | opened and read | 46 |
| WARREN-PLATE | A1 | U.S. Army Office of the Chief of Engineers, Battle field of Gettysburg (Warren survey 1868-69, reduced to 1 inch = 1000 ft, no troop positions), scan cw0353500 | https://www.loc.gov/item/99448794/ | Public domain (US Government publication) | opened and read | 492 |
| NPS-CLI-EMM | B | NPS, Cultural Landscapes Inventory: Emmitsburg Road Ridge Battlefield, Gettysburg National Military Park (Olmsted Center for Landscape Preservation), Buildings and Structures / Chronology; cites National Register documentation 2004 (NR 2004, Sec.7) | https://npshistory.com/publications/gett/cli-emmitsburg-rd-ridge-battlefield.pdf | Public domain (US Government work) | opened and read | 5 |
| NPS-CLI-PICKETT | B | NPS, Cultural Landscapes Inventory: Pickett's Charge Battlefield, Gettysburg National Military Park (OCLP, 2024), Buildings and Structures / Chronology; cites NR 2004 Sec.7 and the Historic Structure Inventory (HSI) | https://npshistory.com/publications/gett/cli-picketts-charge-battlefield.pdf | Public domain (US Government work) | opened and read | 17 |
| NPS-CLI-1CORPS | B | NPS, Cultural Landscapes Inventory: First Day, Union 1st Corps Battlefield, Gettysburg NMP (cites Cultural Landscape Report 2021) | https://npshistory.com/publications/gett/cli-first-day-ufcb.pdf | Public domain (US Government work) | opened and read | 14 |
| NPS-CLI-LRT | B | NPS, Cultural Landscapes Inventory: Little Round Top, Gettysburg NMP | https://npshistory.com/publications/gett/cli-little-round-top.pdf | Public domain (US Government work) | opened and read | 3 |
| NPS-CLI-LAND | B | NPS, Cultural Landscapes Inventory: Gettysburg Landscape, Gettysburg NMP, Buildings and Structures (agrarian period to 1863; the battle; later periods) | https://npshistory.com/publications/gett/cli-gettsyburg-landscape.pdf | Public domain (US Government work) | opened and read | 13 |
| NPS-CLI-CEM | B | NPS, Cultural Landscapes Inventory: Gettysburg National Cemetery, Gettysburg NMP | https://npshistory.com/publications/gett/cli-cemetery.pdf | Public domain (US Government work) | opened and read | 2 |
| NPS-CLR-ROT1 | B | Layton, T.W. et al., Cultural Landscape Report for Gettysburg National Military Park, Record of Treatment, Volume I (Olmsted Center for Landscape Preservation, NPS, 2018) | https://npshistory.com/publications/gett/clr-v1.pdf | Public domain (US Government work) | opened and read | 13 |
| NPS-TP-2004 | B | Campbell, E., Treatment Philosophy: The 1863 Landscape, Gettysburg National Military Park (NPS, March 2004), ch. 2 Cultural Features: Farm Building Complexes | https://irma.nps.gov/DataStore/DownloadFile/472822 | Public domain (US Government work) | opened and read | 12 |
| NPS-GMP-1999 | B | NPS, Final General Management Plan and Environmental Impact Statement, Gettysburg NMP, Vol. 1 (1999), Affected Environment: Historic Structures; Archeological Resources | https://npshistory.com/publications/gett/fgmp-eis-v1-1999.pdf | Public domain (US Government work) | opened and read | 23 |
| NPS-HBM-1958 | B | Tilberg, F. and Pfanz, H.W., Historical Base Map, Gettysburg National Military Park (NPS, 23 June 1958): documentation of the Warren map grid by grid | https://irma.nps.gov/DataStore/DownloadFile/472812 | Public domain (US Government work) | opened and read | 1 |
| NPS-HS-SPANGLER | B | NPS, Historical Statement: Henry Spangler Farm Buildings | https://npshistory.com/publications/gett/spangler-farm.pdf | Public domain (US Government work) | opened and read | 1 |
| NPS-HS-BRIEN | B | NPS, The Brien Farm and Family | https://npshistory.com/publications/gett/brien-farm.pdf | Public domain (US Government work) | opened and read | 2 |
| NPS-HSR-LEISTER-BARN | B | NPS, Historic Structure Report: Physical Fabric Section, Leister Barn, Gettysburg NMP (HABS/HAER 1984 fieldwork) | https://npshistory.com/publications/gett/hsr-leister-barn.pdf | Public domain (US Government work) | opened and read | 2 |
| NPS-HSR-MCCLEAN-BARN | B | NPS, Historic Structure Report: The McClean Barn, Gettysburg NMP | https://npshistory.com/publications/gett/hsr-mcclean-barn.pdf | Public domain (US Government work) | opened and read | 1 |
| NPS-MCCLEAN-1968 | B | Brown, L.E., McClean House and Barn, Gettysburg National Military Park, Pa. (NPS Division of History, 1 Oct 1968); cites Moses McClean damage claim #3248 (Adams County), RG 2, Pennsylvania State Archives, and the Warren map | https://npshistory.com/publications/gett/mcclean-house-barn.pdf | Public domain (US Government work) | opened and read | 2 |
| NPS-THEN-NOW | B | NPS, Buildings and Farms Then and Now (Gettysburg NMP web page) | https://www.nps.gov/gett/learn/photosmultimedia/buildings-and-farms-then-and-now.htm | Public domain (US Government work) | opened and read | 7 |
| HABS-PA | B | Library of Congress, Historic American Buildings Survey (HABS) records for Gettysburg NMP buildings, cited by HABS number; data pages typed in the 1950s | https://www.loc.gov/collections/historic-american-buildings-landscapes-and-engineering-records/?q=gettysburg | Public domain (LoC; made by the US Government) | opened and read | 23 |
| OSM | B | OpenStreetMap contributors, building and historic tags in the Gettysburg battlefield bounding box (Overpass API extract, 19 Oct 2026); used for building names and as a cross-check of position | https://www.openstreetmap.org/copyright | ODbL 1.0 - (c) OpenStreetMap contributors | opened and read | 17 |
| NEWS-COMPILER-1863 | B | Gettysburg Compiler, 20 July 1863, report on the burning of the Sherfy barn (as cited by Gettysburg Daily) | https://www.gettysburgdaily.com/joseph-sherfy-barn-roof-replaced/ | Secondary web page quoting a public-domain 1863 newspaper; only the fact is used | search summary only | 1 |
| ASYLUM-ALMS | B | Asylum Projects, Adams County Almshouse (Gettysburg, PA), incl. Pennsylvania Historical and Museum Commission marker text (complex closed 1964, barn burned 1967, last building demolished 1974) | https://asylumprojects.org/index.php/Adams_County_Almshouse | Web page; only dates (facts) are used | search summary only | 9 |
| WIKI-STATION | B | Gettysburg station (Wikipedia) and Abraham Lincoln Online, Gettysburg Railroad station (built 1858-59; hospital in July 1863) | https://en.wikipedia.org/wiki/Gettysburg_station | CC BY-SA 4.0 (facts only) | search summary only | 1 |
| GETTYSDAILY-CHRIST | B | Gettysburg Daily, Gettysburg's Christ Lutheran Church, Part 1 (church completed 1836; Union I Corps divisional hospital 1 July to 15 Aug 1863) | https://www.gettysburgdaily.com/gettysburgs-christ-lutheran-church-part-1/ | Web page; facts only | search summary only | 3 |
| NPS-ROSE | B | NPS, Stay at the Historic Rose House (Gettysburg NMP web page): Rose farm structures | https://www.nps.gov/gett/planyourvisit/historic-rose-house.htm | Public domain (US Government work) | opened and read | 4 |

Network check of the cited URLs (HTTP status of a byte-range request; 200/206 = reachable): 200 7, 206 13, 403 3.

## Licences and attribution

| Material | Use | Licence | Attribution |
|---|---|---|---|
| Library of Congress: Bachelder 1876 and Warren plate scans; HABS records | symbol positions; building dates | public domain / no known restrictions | "Library of Congress, Geography and Map Division; HABS/HAER" |
| NPS documents (CLIs, CLR, HSRs, GMP, treatment philosophy) | descriptions, dates, dimensions | public domain (US Government works) | "National Park Service" |
| Adams County GIS Building Outlines 2023 | outlines of surviving buildings; building class counts | public-record data, no licence text published; used read-only; **ask the county before reuse beyond this layer** | "Adams County, Pennsylvania GIS" |
| OpenStreetMap | building names, site points, tower and monument counts | ODbL 1.0 | "(c) OpenStreetMap contributors, ODbL" |
| Wikipedia / web pages | facts only (dates), quoted nowhere | CC BY-SA 4.0 / facts | cited per entry |

Not used: Google Earth/Maps, Bing, Maxar, Mapbox or Esri imagery or tiles; HMDB text (one marker's wording is paraphrased for the Wheatfield in `SOURCES-landcover.md`, a fact only); any private or paywalled source.

## Verification (eight passes)

Recorded in `evidence/verification.json`; run `python src/verify_structures.py [--net]`.

| # | Pass | Result | What it found |
|---|---|---|---|
| 1 | Schema: required fields, enums, geometry validity, bounds, unique ids, null geometry carries no error | pass | 8 self-intersecting borough polygons found and repaired (precision-rounded and re-validated) |
| 2 | Source integrity: every cited key in the registry, every source has cite, sheet or page, URL, type and a paraphrase; URL reachability | pass | 24 unique URLs; LoC 403 recorded above |
| 3 | Position cross-checks: plate symbol versus surviving outline and versus NPS or OSM site marks (31 comparisons) | pass | median 3.8 m, 90th percentile 33.5 m; 5 offsets above 30 m, each explained in the record (Brien: Warren shows house and barn 30 ft apart, present 75 ft; McPherson symbols 50 m from the barn; southern and western plate edges; Bliss tablet between its two symbols); a wrong Culp house symbol and a McMillan house symbol were found and re-assigned |
| 4 | Georeference accuracy and independence: leave-one-out, and comparison with the independent road-junction, bridge and summit points of the sibling task | pass | the first, building-only fit was a median 49 m (maximum 115 m, about 100 m in the borough) out against those independent points: the pairs that caused it were removed and the independent points added; the two Rock Creek bridges were wrongly dropped by the outlier rule first and restored; now LOO median 10.0 m, p90 22.4 m. The sibling affine georeference of the same plate misses this task control points by a median of 88 m (central block 27 m, edges 76 m): the two models disagree at the plate edges and neither is proven there |
| 5 | Documented dimensions versus outline area (10 buildings) | pass | the Codori house (ratio 2.3) and McClean house (2.7) outlines include post-1863 additions, as the entries say |
| 6 | Chronology: no building first built after 1863 is drawn as an 1863 building | pass | later barns on 1863 sites are flagged `destroyed_1863` with `geometry_represents` |
| 7 | Second print of the survey: symbols present on the July-3 sheet and on the 1:1000 plate (87 symbols) | pass | 85 of 87 on the July-3 sheet, 79 on the plate; two mis-read pixel positions (Hummelbaugh, Slyder) corrected. These are prints of one survey, so this tests transcription, not independent existence |
| 8 | Visual audit of 26 farm groups on the plate, duplicates and counts | pass | almshouse points were on contour marks (redone), Slyder west symbol missing (added), Leister house and barn symbols swapped (fixed by the NPS barn report: barn 60 yd west of the house), Bushman pair 40-60 m out (added as control) |

Overlays for the audit are in `evidence/review/` (Warren plate crops, public domain).

## What is uncertain or unknown (not drawn)

- **Klingel exterior bake oven** (STR-KLINGEL-BAKE_OVEN1): Stands east of the house; its footprint is not separately mapped in any source read, so no geometry is drawn (UNKNOWN).
- **Trostle log hog pen (seen in O'Sullivan photograph)** (STR-TROSTLE-HOG_PEN1): Stood against the east end of the barn; no source gives coordinates, so no geometry (UNKNOWN).
- **Spangler smokehouse** (STR-SPANGLER_H-OUTBUILDING1): One of the small 2023 outlines 5425/9179/11824; assignment not resolved, so no geometry is drawn (UNKNOWN).
- **Spangler stable and carriage shed** (STR-SPANGLER_H-OUTBUILDING2): Assignment among small 2023 outlines not resolved; UNKNOWN geometry.
- **George Weikert wood spring house** (STR-GWEIKERT-SPRING_HOUSE1): Location UNKNOWN (no source gives coordinates).
- **Rose stone summer kitchen with bake oven** (STR-ROSE-SUMMER_KITCHEN1): Not separately located in any source read; UNKNOWN geometry.
- **Rose wood-framed smokehouse** (STR-ROSE-OUTBUILDING1): Not separately located; UNKNOWN geometry.
- **Slyder kitchen** (STR-SLYDER-SUMMER_KITCHEN1): Separate footprint not identified; UNKNOWN geometry.
- **McPherson farm house (burned 1895)** (STR-MCPHERSON-HOUSE1): Site not marked and not archaeologically tested (CLI); position UNKNOWN beyond "near the barn"; no geometry.
- **McPherson central wagon shed (lost)** (STR-MCPHERSON-OUTBUILDING1): Position UNKNOWN.
- **Basil Biggs house (former Fisher farm), Taneytown Road** (STR-LOST-BIGGS_HOUSE): No outline could be tied to this house with the sources at hand; UNKNOWN geometry.
- **Fisher farm log house and stable (Taneytown Road)** (STR-LOST-FISHER_LOG_HOUSE): Location only described as south of the Fisher Orchard; no coordinates in the sources read (UNKNOWN).
- **Granite Schoolhouse (Culp's Hill / Baltimore Pike area)** (STR-LOST-GRANITE_SCHOOLHOUSE): No coordinates in the sources read (UNKNOWN).
- **Guinn farm (Baltimore Pike)** (STR-LOST-GUINN_FARM): Warren-plate symbols exist near the label but were not read in this pass; UNKNOWN geometry in the curated layer.
- **Staub farm (Emmitsburg Road)** (STR-LOST-STAUB_FARM): UNKNOWN geometry in the curated layer.
- Individual buildings of the borough: only street-front masses are drawn; no source read dates individual town buildings to July 1863, and buildings put up between 1863 and 1869 cannot be told apart.
- Fences, orchards, woods and roads belong to the sibling layers.
- East Cavalry Field farms (Rummel, Lott, Cress) lie east of the -77.18 bound and are not catalogued.
- Most farm outbuildings (smokehouses, corn cribs, wagon sheds, springhouses, privies) are documented by NPS only for surviving farms, and rarely with positions.
- The Warren survey dates from 5-6 years after the battle; buildings changed after July 1863 may be shown as they were in 1868-69 (the NPS 1958 Historical Base Map corrects some; its scan is OCR-poor).

## Modern structures to remove

`modern_structures_to_remove.json` holds 27 documented post-1863 structures (name, date, removal, source, whether present in the 2013-06-04 NAIP flight used as the base photograph), the rules for removal, and counts of the 8394 2023 building outlines inside the bounds by zone:

| Zone | Outlines | Footprint m2 |
|---|---|---|
| borough zone: remove; replace by the 1863 borough building masses | 1006 | 243173 |
| retain: surviving 1863 structure (named in this catalogue) | 41 | 13023 |
| rural, house-sized (100-1500 m2): remove unless it is a surviving 1863 farm building not yet catalogued | 4662 | 1185658 |
| rural, large (>=1500 m2: commercial, institutional, industrial, farm-industrial): remove | 74 | 293101 |
| rural, small (<100 m2: sheds, garages, pool houses): remove | 2611 | 113739 |

The full per-feature inventory of everything modern (about 25,000 features: roads, paths, parking, power lines, monuments, ponds, buildings) is the sibling task's `docs/basemap1863/modern/data/inventory_features.geojson.gz`. The 41 survivors in `retain_1863_survivors.csv` carry the Adams County `srcid` and the sibling inventory id so that nothing catalogued here is erased by the removal step.

Towers on the battlefield today (Oak Ridge, Culp's Hill, Warfield Ridge) date from 1895-96; the 1,830 monuments, markers, tablets and statues counted by NPS (the OpenStreetMap extract has 833 monument and memorial points inside the bounds) and the visitor centre, motels, houses and radio masts are all post-1863.

## Files

- `structures.geojson`, `structures.mercator.geojson` - the layer.
- `modern_structures_to_remove.json|csv`, `retain_1863_survivors.csv` - removal table and keep list.
- `evidence/gcps_final.json` (control points and accuracy), `clusters_a_positions.json` (curated symbol readings), `auto_symbols.json`, `borough_mass.json`, `ocr_labels.json`, `osm_named_cty.json`, `osm_extract_poi_2026-10-19.json` (ODbL extract), `visual_audit.json`, `cross_sheet_check.json`, `verification.json`, `build_stats.json`, `review/*.jpg`.
- `src/` - catalogue (`catalogue*.py`), registry (`sources.py`), builders and verifier; `src/pipeline_extracts/` - the image-processing scripts that produced the evidence (they read scans and caches kept under `tmp/b1863/`, which are not committed).

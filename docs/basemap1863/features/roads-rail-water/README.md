# roads-rail-water: the road, rail, bridge, stream, lane and fence layers of July 1863 (RECONSTRUCTION)

Part of `docs/basemap1863/`. Read `../../SOURCES-roads.md` first: it states what this layer claims, how every class was built, the measured accuracy, the licence table, the eight verification passes and the list of what is Unknown.

**This is a reconstruction.** No 1863 aerial photograph exists. Label it so wherever it is shown. Nothing here claims to be an exact or complete copy of the 1863 landscape.

## Use

| To draw | Take | Rule |
|---|---|---|
| 1863 public roads | `roads.geojson` features with `present_1863 == true` | geometry is the modern centreline; `positional_error_m` 15-35; `confidence` Documented / Estimated; `Unknown` records (RD-017) are not drawn |
| lanes | `lanes.geojson` | 4 traced sections only; the other 18 NPS-named lanes are in `lanes_inventory.json` without geometry |
| railroad | `railways.geojson` with `present_1863 == true` (RL-001, RL-002, RL-006, RL-007) | RL-002W (grade west of the sheet) is Unknown: do not draw; RL-003 and RL-005 are post-1863: they must be removed from the photograph |
| streams | `waterways.geojson` with `confidence == "Estimated"` (named streams) | unnamed channels are Unknown |
| bridges, fords | `bridges.geojson` | `bridge` (symbol seen or class rule), `ford`; `crossing` = type unknown |
| fences, walls | `fences.geojson` with `properties.draw == true` | 36 lines confirmed against the sheet; style of 1863 unknown from this check |
| what to remove from the modern photograph | `modern-roads-remove.csv` | `present_1863 == false` classes; `null` classes (undecided, `DRAWN_ON_1876_SHEET`) are NOT removed until decided |

Each file has an EPSG:4326 copy and a `.mercator.geojson` (EPSG:3857, metres) copy.

## Honest limits (full list in SOURCES-roads.md section 6)

- The period map is dated 1868-69, not 1863.
- The registration of the period map is accurate to about 15-19 m (leave-one-out), worse in sparsely controlled corners.
- 18 of 21 named lanes, 356 of 392 mapped fences, the 1863 ponds, the borough street plan and the far west and south are not drawn because no source read places them.

Regenerate: see `scripts/` (SOURCES-roads.md section 8). Caches and map renders are in `tmp/b1863/roads/` and are not committed.

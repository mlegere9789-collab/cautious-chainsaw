# sources-a-EG-05: USGS lidar: project dates, geoid, quality level and the later PA_17County_D24 project not verifiable here; tile-count conflict

| Field | Content |
|---|---|
| ID | sources-a-EG-05 |
| Requirement IDs | R12, R02 |
| Category | source not yet used / access |
| Description | Verified live on the public AWS copy (2026-11-16): project USGS_LPC_PA_South_Central_B1_2017_LAS_2019 is a LAZ EPT of 76,019,979,744 points; its source list has 4,911 LAZ files whose points sum to that total; the Gettysburg tile 18SUK309410 (13,309,519 points, a 1,500 m square) is in NAD83(2011) / UTM 18N + NAVD88 height, LAS 1.4; the bucket lists no PA_17County_D24 prefix. Conflict: 7,975 tiles (PDF/AmeriGEOSS) vs 4,911 source files (EPT). Not verifiable here: collection dates 2017-11-21 to 2017-12-21, publication 2018-10-26, GEOID12B, QL2 figures, 150 control points and 245 checkpoints, the DEM and 2-ft contour products, and the first-round reading of D24 (collected 2024-12-12 to 2025-03-24; quality level never read). |
| Why literal 100% is not possible or blocked | The pages that state them (AmeriGEOSS, ScienceBase, USGS, TNM, Adams County GIS) are refused by the proxy. |
| Evidence searched | AWS EPT root, ept-build, ept-sources list and tile record, bucket prefix listing (2026-11-16); project notes terrain_pipeline_status.md; shard rows R12.021, R12.022. |
| Autonomous substitute applied | Keep the 2017 DEM as the documented modern reference; its datum is NAVD88 (geoid model unverified). |
| Strongest evidence-based reconstruction | In an open-network session: read the AmeriGEOSS and ScienceBase records, the USGS QL table and the TNM API result for D24; ingest one D24 DEM tile and difference it against 2017 for processing noise and change. |
| Confidence tier | documented (tile geometry, datum components); open gap (dates, geoid, QL, D24) |
| Competing values | Tiles 4,911 (EPT) vs 7,975 (AmeriGEOSS) |
| Product marking | Modern ground only; labelled as such |
| Visual and audio impact | Terrain surface |
| Review status | internal review only (DEC-006: no public review label) |
| Owner decision requested | None. |
| Agent recommendation | Do this before the next terrain milestone; note the epoch used in provenance. |
| Status | proposed (shard sources-a, close-out of 2026-11-16; not yet merged into register/) |
| Owner decision and date | (filled only from the Decision Log) |

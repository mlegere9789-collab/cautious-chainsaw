# sources-a-EG-05: USGS lidar project PA_17County_D24 (2024-25) not ingested; QL unread

| Field | Content |
|---|---|
| ID | sources-a-EG-05 |
| Requirement IDs | R12, R02 |
| Category | source not yet used |
| Description | A later USGS project covers Gettysburg: LPC tiles collected 2024-12-12 to 2025-03-24 (published 2026-05-04), 1 m DEM tiles published 2026-10-23. The terrain work uses only PA_South_Central_B1_2017 (collected 2017-11-21 to 2017-12-21). D24 quality level and vertical accuracy were not read. Two modern epochs exist and have not been reconciled; neither is 1863 ground. |
| Why literal 100% is not possible or blocked | Not blocked; not yet fetched (timing run forbids heavy downloads). |
| Evidence searched | TNM Access API queries, ScienceBase items 69fbecf1... and 5eacea79..., D24 tile metadata XML; shard result R12.021. |
| Autonomous substitute applied | Keep the 2017 DEM as the documented modern reference. |
| Strongest evidence-based reconstruction | Ingest one D24 DEM tile, difference against 2017 for processing noise and change, read the D24 QL from its project metadata. |
| Confidence tier | documented |
| Competing values | - |
| Product marking | Modern ground only; labelled as such |
| Visual and audio impact | Terrain surface |
| Review status | internal review only (DEC-006: no public review label) |
| Owner decision requested | None. |
| Agent recommendation | Do this before the next terrain milestone; note the epoch used in provenance. |
| Status | proposed (shard sources-a; not yet merged into register/) |
| Owner decision and date | (filled only from the Decision Log) |

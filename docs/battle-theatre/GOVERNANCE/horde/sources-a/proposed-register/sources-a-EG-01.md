# sources-a-EG-01: Warren 1:2400 large-scale sheets: LOC extract not downloaded, NARA scans not obtained; sheet-count, date and size conflicts

| Field | Content |
|---|---|
| ID | sources-a-EG-01 |
| Requirement IDs | R02, R12, R13 |
| Category | evidence missing / access |
| Description | LOC 99446453 (1:2400 tracing-linen extract, 121 x 72 cm, 4-ft contours, 7186 x 13687 px, JP2 13,495,108 bytes, TIFF 295,067,312 bytes; sizes re-verified on tile.loc.gov 2026-11-16) is open but has not been downloaded, read or georeferenced; the NARA originals (RG 77 entry E 81) are behind a robots.txt that disallows all crawling and an owner-side request. Conflicts carried, not resolved: sheets of the large map 4 (LOC title, NPS Administrative History) vs 25 (NPS Little Round Top CLR) vs 20 sections / "1 of 5" (xyHt, unread); date imprint 1886 vs LOC machine field 1861; size 12 ft square (1893 Commission report via NPS) vs about 13 ft (xyHt, unread). The LOC IIIF manifest URL answers 403 to this client (item and resource paths). |
| Why literal 100% is not possible or blocked | Not literal-100% blocked: the LOC image is obtainable (tile.loc.gov answers); the NARA scans need an owner-side step; the xyHt statements need a page this container cannot reach. |
| Evidence searched | LOC item JSON and IIIF info.json, HEAD of JP2 and TIFF (2026-11-16); NPS Administrative History, Little Round Top CLR, Record of Treatment (local texts); catalog.archives.gov/robots.txt; shard rows R12.001, R12.002 (docs: evidence_corrections/sources-a.jsonl). |
| Autonomous substitute applied | Keep LOC 99448794 (1:12,000 reduction of the same survey) as master; the 1:2400 extract is the next source; no contour level is guessed. |
| Strongest evidence-based reconstruction | Download the LOC JP2 (13.5 MB) through the build container (tile.loc.gov is reachable), georeference it in the FFD frame, read printed contour labels beyond the 48 anchors (EG-0027), rerun elev1863; keep the three sheet-count values selectable. |
| Confidence tier | inferred |
| Competing values | Sheets 4 / 25 / 20; date 1886 / 1861; size 12 ft / about 13 ft |
| Product marking | Per-pixel provenance class 2 over every area without a trusted Warren level; the date printed as 1886 with 1861 listed as a catalogue field |
| Visual and audio impact | All terrain |
| Review status | internal review only (DEC-006: no public review label) |
| Owner decision requested | For the NARA scans: whether to send a request or use an account (owner-only act). Nothing else. |
| Agent recommendation | Next terrain session: ingest LOC 99446453 (the only step that raises trusted coverage above 14.2 percent without an owner act). |
| Status | proposed (shard sources-a, close-out of 2026-11-16; not yet merged into register/) |
| Owner decision and date | (filled only from the Decision Log) |

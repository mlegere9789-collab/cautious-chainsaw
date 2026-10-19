# Pipeline extracts (image and text processing that produced the evidence)

These scripts were run from `tmp/b1863/structures/` (not committed: scans, caches, 1 GB of NPS PDFs, OSM and county extracts). They are kept for the record and reproduction; they use relative paths of that working directory.

Order: `reg2.py` (register the 1:1000 Warren plate cw0353500 and sheet cw0325000c into the cw0325000a frame by SIFT homography), `det2.py` / `det2d.py` (building-symbol blob detection on sheet a and the plate), `sym2.py` + `icp2.py` (robust nearest-neighbour matching of county outlines to symbols), `clusters_b.py` (curated farmstead symbol readings), `assemble_gcps.py` (control set, leave-one-out outlier rule), `georef_final.py` (thin-plate-spline model with Newton inverse), `prep_evidence.py`, `prep_town.py` (borough masses), `ocr_all.py` (RapidOCR of owner labels), `audit_overlay.py` (visual audit sheets), `road_shift.py` (inconclusive road-ink test), `parse_cli.py`, `ctx.py`, `dig.py` (text search of the NPS PDFs), `habs_data.py` (HABS data pages from the Library of Congress, polite 2 s delay).

Network: read-only, one request at a time, descriptive User-Agent; NPS PDFs from npshistory.com and irma.nps.gov; HABS from loc.gov; OSM through the public Overpass API; no Google, Bing, Maxar or Mapbox imagery.

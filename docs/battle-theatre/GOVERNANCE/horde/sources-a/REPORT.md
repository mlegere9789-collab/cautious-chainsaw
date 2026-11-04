# Shard sources-a report (R12.0000 and R12.001..R12.022, 23 rows)

Slice: R12 has 46 rows (R12.001..045 and R12.0000); this shard holds R12.0000 and items 1-22 of the terrain source catalogue (sources-b holds 23-45). Found exactly R12.0000 and R12.001..022; nothing missing, duplicated or malformed. R21.0000 has no shard here beyond what R12.0000 notes.

Counts: verified 15, inferred 2 (R12.0000, R12.013), gap 3 (R12.002, 007, 014), failed_lookup 3 (R12.003 Rumsey 404, R12.005 W&M 403, R12.020 game maps). Nothing marked passes.

Fix: R12.020 (failed_lookup) had no register entry; added sources-a-EG-10 and set its `register`. Entries now sources-a-EG-01..10; all non-verified rows link to one. Every verified row has a citation and a supporting_passage_refs list. R12.018 is verified for the Stone Sentinels menu only (a lead source), tier inferred.

Key findings: ground surface in use is Warren LOC 99448794 (1:12,000) and the 2017 USGS lidar; Warren 1:2400 sheets (LOC 99446453, NARA RG 77) are the route to higher trusted coverage; a 2024-25 USGS lidar project PA_17County_D24 is a new source (EG-05); NPS 1863 GIS layers are not public (EG-04).

own_checks (local text; the web claims themselves were not re-fetched):
- R12.001: LOC 99446453 as a manuscript map at 1:2400, 121 x 72 cm, contours at 4-ft intervals, roads, buildings, fences, fortifications: matches the PDF catalogue row (docs/battle-theatre/BIBLE/plan-clean.txt lines 24930-24940). The PDF row itself derives from LOC, so this is agreement, not independence.
- R12.021: lidar project PA_South_Central_B1_2017, NAD83(2011) / NAVD88 GEOID12B: matches terrain/terrain_pipeline_status.md lines 30-39; the 2017-11-21 to 2017-12-21 collection dates match the PDF row 21 (pipeline status item 7 notes the project documents say only "acquired 2017").
- R12.004: LOC 99447491 is identified as the Bachelder battlefield map in docs/historian/sources.yaml (line 351): identity only, not the passages.

Lookups: web_lookups.json logs 56 requests with timestamps and byte counts (loc.gov, USGS, NARA, NPS, PASDA, davidrumsey 404, W&M 403, ehistory 403). Includes archive.org requests that succeeded in the shard run; archive.org is blocked for this audit (403), so R12.012 (Atlas plates) is as logged, not re-checked.

Owner decisions: none beyond the register entries (use of Warren 1:2400, rights of NPS layers, acceptance of item 20 as not used).

Verification limits (2026-11-04 audit): the raw OR Ser. I vol. 27 OCR (tmp/library/or27) is not present in this checkout, and the proxy returned 403 for loc.gov, archive.org, gutenberg.org, ehistory.osu.edu and nps.gov, so no web re-fetch was possible; none circumvented. Web-derived rows (NPS, LOC, USGS, NARA pages) rest on the shard run own fetch log and were not re-verified by this audit. Spot checks use independent local extractions or repo files, matched on text, report id and page.

# Shard sources-b report: R12.0000, R12.023..045, R21.0000 (25 items)

sources-a did R12.0000 (items 1-22) and R12.001..022. This shard does the other half of the terrain source catalog (items 23-45), its top-level row, and R21.0000 (R21 has no children; its only sub-requirement is the top-level row).

Method: no web access worked from this container (archive.org and nps.gov refused; lookups.jsonl). Rows use the earlier lookup pass (web_lookups.jsonl, 362 rows: titles, HTTP codes, archive.org metadata, search counts) plus terrain_sources.json and sibling shards. That pass did not keep page text, so only identity is confirmed for most rows; unread claims are listed per row as unverified_parts, not guessed.

Counts: R12.023..045 (23 rows): verified 5 (24, 27, 28, 29, 35), inferred 11, gap 4 (25, 34, 39, 45), failed_lookup 3 (33, 37, 41). R12.0000 and R21.0000 not satisfied. Proposed register entries: sources-b-EG-01..08.

Owner-decision items:
1. 1860 agricultural census and PA damage claims: need NARA, FamilySearch or Ancestry accounts or an archive visit (owner-only); the catalog has no 1860 file.
2. Frassanito book (copyrighted): purchase is owner-only.
3. NPS VMI layer: robots blocks the download; a request to NPS is owner-only.
4. Sherfy replanting date 2008 vs 1883 and Penn Pilot 1937 vs 1938: conflicts carried, no default.
5. R21: the library is not read in full; 20 of 36 library sources are still scheduled.

Blocked, not circumvented: LOC collection pages (403), Gettysburg College URL (404), PHMC census PDFs (moved), ACHS holdings (robots 403 on retry), eHistory, HathiTrust. No shared file edited; not committed.

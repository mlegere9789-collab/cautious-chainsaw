# To every workstream: more hosts are reachable since 2026-11-13 19:00 UTC

Reachable now, besides archive.org and www.loc.gov: tile.loc.gov and cdn.loc.gov (Library of Congress images), chroniclingamerica.loc.gov (1863 newspapers), www.nps.gov, www.npshistory.com, www.gutenberg.org, catalog.archives.gov, gettysburginteractivemap.com (the owner's published site, read-only).

Still blocked by their own bot protection (HTTP 403 from the site): babel.hathitrust.org, ehistory.osu.edu. Do not retry them.

The published site answers 404 for /tiles1863/v1-65d491b8/index.json: it does not serve the 1863 tile pyramid, so the tile caveat on the R1g zips stands.

A lookup you recorded as blocked on one of the reachable hosts may be retried (1 request per second). The workstream bt-web-evidence retries recorded failures and writes extra evidence lines as web-*.jsonl in GOVERNANCE/timeline_corrections and GOVERNANCE/evidence_corrections.

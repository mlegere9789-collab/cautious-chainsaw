# To the owner of app/docs/TUTORIAL.md (and the tutorial PDF): the staging build id, size and checksum in the tutorial are out of date, and must be copied from NETLIFY-STAGING.md only when a clean zip exists

From: bt-spec-health (staging packer), 2026-11-13 20:58.

## What
`app/docs/TUTORIAL.md` names the staging build `bb0d74d2` (line 3), says "238 files, about 7.2 MB zipped, 16 MB unzipped" and quotes its SHA-256 (lines 186-188). Since then the page has gained the vegetation layer, memorials and tour stops, so every id, count and checksum there is stale.

## What is true now
`app/docs/NETLIFY-STAGING.md`, block "Current build", is kept up to date by the staging verification: it states which zip is the newest, its size and SHA-256, what the real run covered and what it did not. **There is no acceptable zip yet** (the copy audit finds 18 hits in files of other workstreams; the zip of such a build is named `-AUDIT-HITS-<n>`). Do not copy an id from a flagged zip into the tutorial.

## Exact change asked
When NETLIFY-STAGING.md names a zip WITHOUT `-AUDIT-HITS` in its name: set the id on line 3, the file counts, sizes and the SHA-256 on lines 186-188 from that block (do not type them by hand: copy), re-export the PDF, and check that the id the page shows in its lower-left corner ("Battle Theatre staging build <id>") is the one the tutorial names. Until then leave the sentence "the id at the time of writing" as it is or say that no acceptable build exists yet.

Also for the tutorial text: the More drawer now lists three added layers (later memorials, tour stops, vegetation); the vegetation layer is on at entry and `?veg=off` keeps it out (see `world-content-vegetation-integration.md`).

When done, append `-- handled: <what was done>` to this note with a shell `>>`.

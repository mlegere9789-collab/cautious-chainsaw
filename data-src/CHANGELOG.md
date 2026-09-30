# Data changelog

Format: Keep-a-Changelog sections (Added / Changed / Corrected / Removed). Every **Corrected** entry carries
`{record_id, before, after, citation, reviewer, date, dv_impact}`. `data_version` = bytes; `dv` (clock calibration) belongs to chapter 04 and is
never bumped from this file. Rule D001 fails when a served data file changes without a new version and an entry here.

## [0.9.0] - 2026-09-30

### Added
- Baseline of record: the 71 files of the Netlify deploy 6aa16d61 (2026-09-09) under `legacy/dist/data`, frozen by `tools/data/manifest.mjs freeze`
  (`data-src/legacy-manifest.tsv`, `data-src/data.lock.json`, `data-src/version.json`). No byte of served data was changed.

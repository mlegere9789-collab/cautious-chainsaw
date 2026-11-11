# ws10 photo-match (Q16) report, 2026-11-11

Scope read: CLAUDE.md, gates.json Q16, requirements.json (Q16 linked from R12.* items only; no requirement mentions photo-match by name beyond R12/R04 notes), PDF plan lines on photographs, library/status.json, register EG-0004/0021, app terrain/structures code. No git commit/push.

## Done
- Catalogue of 109 LOC records (tools/bt/photomatch/catalogue.json); licence basis from each record's rights field; 13 staged-flagged by title.
- Image acquisition under rate limit through archive.org /cors/ only: 3 LOC Gardner scans + 6 Met-programme items, sha256 ledger (images_ledger.json). LOC image hosts refused (EG-01), not circumvented.
- 8 registered pose assumptions, deterministic SwiftShader renderer, composites, test (tests/photomatch.test.mjs, 5 pass + determinism check).
- Verdicts: 0 matches, 0 roughly, 4 does not, 4 cannot judge. See docs/battle-theatre/app/docs/PHOTOMATCH.md.

## Not done / blocked
- No documented camera position exists in any source read, so Q16 ("known camera positions") cannot pass; gate not marked.
- Gaps: proposed-register/ws10-EG-01..08.

## Governance note
Nothing added to requirements.json, gates.json or register/ (proposals only). check_governance.py not run for any milestone claim.

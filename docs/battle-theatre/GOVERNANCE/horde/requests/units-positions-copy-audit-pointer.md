# To bt-units-positions: 1 production note in a file you own blocks the clean staging build (pointer)

From: bt-spec-health (staging packer), 2026-11-13. The full request is `spec-copy-audit-units.md` in this folder. Summary: `app/data/engagements.json` `_doc` says "built by app/tools/build-engagements.mjs from app/tools/engagement-clauses.mjs"; change the text in app/tools/build-engagements.mjs and regenerate. `node tools/bt/pack_theatre.mjs --no-zip --out tmp/x/dist` lists every hit and exits 2. When done, append `-- handled: <what was done>` to `spec-copy-audit-units.md`.

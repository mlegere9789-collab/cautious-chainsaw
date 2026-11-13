# bt-world-content, lane vegetation (R20, Q21): status file (files are the memory)

Updated by shell append at each milestone. Newest last.

- 2026-11-13 recon: ext loader and EXT-CONTRACT read; src/ext/index.mjs exists (monuments, tour). Source families: OR27 (tools/bt/or27_find.py), NPS reports under tmp/library/web/nps (73 texts, ws-web), public-domain books and 1863 papers under tmp/library/ws9. Land-cover layer docs/basemap1863/features/landcover (Warren 1868-69, 30-40 m).
- Tools written: tools/bt/vegetation/srcs.py (search + verify across the three families), verify_claims.py (every quote looked up again in the saved text), gen_nps_claims.py (selects rows of the ws-web NPS extract sheets, re-verified), claims_or27.json, claims_library.json, claims_nps_hand.json.
- 2026-11-13 data built: tools/bt/vegetation/{build_vegetation,veg_tables,verify_claims,gen_nps_claims,srcs}.py; claims_{or27,library,nps_hand,web,nps_extracts}.json (+ claims_verified.json); app/data/vegetation.json 1.6 MB; proposed register ws-world-veg-G01..G15. Next: src/ext/vegetation/{model,trees,decals,index}.mjs, tests/vegetation.test.mjs, GATE-HOOKS.md, browser screenshots.

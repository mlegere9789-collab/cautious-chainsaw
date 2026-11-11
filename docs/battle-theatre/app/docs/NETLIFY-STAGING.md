# Battle Theatre: Netlify staging build

A separate, test-only site made from the current page shell. It is not the production site and nothing here is published by the build tool.

## Build
`node tools/bt/pack_theatre.mjs` writes `deliver/bt-staging/dist/` and `deliver/gettysburg-BT-staging-<hash>.zip` with a `.sha256` beside it (`deliver/` is not committed). The build is deterministic: the same sources give the same bytes, the same zip and the same 8-character hash. The hash is shown in the lower-left corner of the page ("Battle Theatre staging build <hash>") and is in `MANIFEST.json` (size and SHA-256 of every file). Self-test: `node --test tests/bt-pack/pack.test.mjs`.

## What the owner does
1. In Netlify, add a new site by dropping a folder or zip (labels on Netlify screens are from memory; if one differs, stop and ask). Drop the zip, or the unzipped `dist` folder, onto a **new throwaway site**, not the production site.
2. Open the address Netlify gives. The root page forwards to `/app/index.html`. Press the enter button on the landing page.
3. Send the address back so the checks can be run against it. Delete the throwaway site when done.

The site sends `X-Robots-Tag: noindex, nofollow` (and a robots meta tag) so search engines ignore it. The "Return to the map" link goes to the staging root, not to the main map.

## What is in the zip
The shell (`app/`: page, styles, 45 modules, 14 data files) and exactly the siblings it requests at runtime, found by tracing the module imports and every file URL in the code and confirmed by a request log of a full run (no 404): the prototype renderers and terrain (`render/prototype/`), `sim/`, `GOVERNANCE/` (timeline, register index, conflicts), `environment/`, `history/`, `structures/`, `kit/`. The folder layout is kept so every relative URL works from the site root. Left out: tests, screenshots, notes, tools, and the 65 MB of figures, animation, effects and audio data, which the shell does not load yet.
Files are not renamed with hashes (the modules import each other by relative path); `_headers` sets `Cache-Control: max-age=0, must-revalidate`, so the browser revalidates against Netlify's content ETag and unchanged files return 304. No COOP/COEP headers: the shell uses no SharedArrayBuffer.

## What works
- WebGPU on desktop Chrome (the shell's default). Where WebGPU is unavailable it falls back to WebGL2; `?api=webgl2` forces WebGL2 and `?api=webgpu` forces WebGPU.
- Landing page, timeline and scrubber, scenarios for source conflicts, tier marking, evidence overlay, bookmarks, the real history layer (`?history=stub` opens the placeholder layer).

## Not in this build yet
- The 3D figures (`figures3d`), animation (`anim3d`), effects (`fx3d`) and audio (`audio3d`) are written but not wired into the shell, so they are not shipped.
- Weather rendering: the weather timeline file is loaded, but weather is not drawn in the scene.
- `GOVERNANCE/timeline_verified.jsonl` and `GOVERNANCE/decisions/conflict_defaults.json` are not read by the shell, so they are not shipped (the packer lists them in `MANIFEST.json` as not loaded).
- Ground is the modern landscape, as the page states.

## Known blocker
The copy audit (no mention of how the site was made in any shipped file) currently fails on eight lines in shipped data and code comments that cite the project instruction file by name (`GOVERNANCE/register_index.json`, `environment/weather_timeline.json`, `kit/kit_specs.json`, `kit/weapons.json`, `app/src/history/casualties.mjs`). The packer reports them and exits non-zero; it does not rewrite them. The source files must be corrected before any release. This staging build is for the owner's test only.

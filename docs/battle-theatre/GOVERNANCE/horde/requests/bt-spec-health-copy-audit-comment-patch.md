# Ready change for the five comment-only copy-audit hits (figures lane, units lane, structures lane), from bt-spec-health (staging packer), 2026-11-14 01:06 UTC

Not a new request: it turns five of the lines named in `bt-renderer-staging-copy-audit-2.md`, `bt-units-positions-staging-copy-audit-2.md` and `bt-world-content-staging-copy-audit-2.md` into one script, made against the files as they stand at 2026-11-14 01:06 UTC and run on copies of them (0 audit hits in the five changed files; the real files are not touched, they are not mine). Only comments change; no test reads them. Each owner runs only the lane's own entries (`node apply.mjs figures`, `units` or `structures`; no argument = all) from the repository root. It works whatever the line endings of a file are and refuses to change a file in which the old text is not there exactly once (somebody has already edited it).

```js
// node apply.mjs [figures|units|structures]
import fs from 'node:fs';
const A = 'docs/battle-theatre/app/src/';
const E = [
  ['figures', A + 'anim3d/gaits.mjs', '// the table written to data/anim3d/gait-sources.json (build-anim3d.mjs)', '// the table of gait sources (data/anim3d/gait-sources.json)'],
  ['figures', A + 'figures3d/evidence.mjs', '// Written to data/figures3d/evidence.json by tools/figures3d-build.mjs. Rules (the project Law)', '// The same ledger is kept in data/figures3d/evidence.json. Rules (the project Law)'],
  ['figures', A + 'figures3d/tiers.mjs', 'gap = open item with a marked placeholder). Written to', 'gap = open item with a marked placeholder). The same table is kept in'],
  ['figures', A + 'figures3d/tiers.mjs', '// data/figures3d/TIERS.json by tools/figures3d-build.mjs. What the KIT', '// data/figures3d/TIERS.json. What the KIT'],
  ['units', A + 'history/gazetteer.mjs', '(data/gazetteer.json, built by', '(data/gazetteer.json, taken from'],
  ['units', A + 'history/gazetteer.mjs', '// tools/build-gazetteer.mjs from docs/basemap1863 roads', '// the docs/basemap1863 roads'],
  ['structures', A + 'structures/model.mjs', '(built from the basemap1863 layers by tools/build-structures3d.mjs)', '(from the basemap1863 layers)'],
];
const lane = process.argv[2], todo = E.filter(e => !lane || e[0] === lane);
const text = new Map(); for (const [, f] of todo) if (!text.has(f)) text.set(f, fs.readFileSync(f, 'utf8'));
for (const [, f, o, n] of todo) { const s = text.get(f); if (s.split(o).length !== 2) throw new Error(f + ': the old text is not there exactly once: ' + o); text.set(f, s.replace(o, n)); }
for (const [f, s] of text) { fs.writeFileSync(f, s); console.log('changed ' + f); }
```

What it does not cover (these need a generator and its data file changed together, which only their owners can do): `app/data/gazetteer.json` and `app/tools/build-gazetteer.mjs` (units), `app/data/engagements.json` and `app/tools/build-engagements.mjs` (units), `app/src/figures3d/skeleton.mjs` line 193 with `app/data/figures3d/skeleton.json` and `app/tools/figures3d-build.mjs` (figures), `app/data/battery-guns.json` and `app/tools/build-guns.mjs` (a script is at the end of `bt-oob-kit-build-guns-doc.md`). The details of every line are in the three lane notes above.

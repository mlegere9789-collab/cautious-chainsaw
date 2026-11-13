# wp-arch-09 HANDOFF: toolchain, stack record, layout, config module

Route: source-rebuild. Nothing in the shipped bundle or pages changes, so this item has no `group.json`, no patch JSON, no overlay and no scratch copy of `release/R1g/dist`: the generic candidate-group steps do not apply. Nothing is registered in any train. The red-first test of the item is `src/config/tokens.test.mjs`, which fails (module not found) until `src/config/mapbox.js` exists.

## What changed

All new files; no existing file was edited except the two shared logs below. `src/lib/time` is untouched.

| File | What it is |
|---|---|
| `src/STACK.md` | the stack record: layout mapping (plan path to repository path), choices the register and rows A10, A11, C03 fix, 12 open choices written as "not decided: owner" with the conservative default and the way back, the token module rules, dated registry readings, commands |
| `src/package.json` | private manifest, `workspaces` `["lib/*", "app"]`, `engines.node` `>=22.23.4`, script `test` = `node --test`; no dependency |
| `src/tsconfig.base.json` | strict base: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `isolatedModules`, `noImplicitOverride`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `forceConsistentCasingInFileNames`, `noEmit`, `types: []` |
| `src/.nvmrc` | `24`, the toolchain target |
| `src/README.md`, `src/app/README.md`, `src/lib/README.md` | where things go; who builds what; how to add a library |
| `src/config/mapbox.js`, `src/config/mapbox.d.ts` | the one reader of `PUBLIC_MAPBOX_TOKEN`: `getMapboxToken(env?)`, `isProductionBuild(env?)`, `MapboxTokenError` (codes `MAPBOX_TOKEN_MISSING`, `MAPBOX_TOKEN_SECRET`, `MAPBOX_TOKEN_MALFORMED`), `TOKEN_ENV_NAME` |
| `src/config/tokens.test.mjs` | 13 tests of the module and the source scans (no token literal under `src/`; no other file names the variable) |
| `src/foundation.test.mjs` | 10 tests: manifest, exact pins (React 18.3.1, mapbox-gl 3.24.1, no react-map-gl), strict base, STACK.md structure, READMEs, `mapbox-gl` imported only in `src/app/map/lib/map/`, the request note |
| `docs/battle-theatre/GOVERNANCE/horde/requests/main-site-wp-arch-09.md` | the request to the release workstream (below) |
| `docs/decisions/DELEGATED-DECISIONS-MAIN-SITE.md` | five rows appended (W09-1 to W09-5); the ids are outside the A/B/C scheme, so `merge_status.py` does not count them and `merge_status.py --check` stays green |
| `candidates/r1h/wp-arch-09/` | `STATUS.json`, this file, `red-first.log`, `red-first-foundation.log`, `mutation-check.mjs`, `scratch-checks.sh`, `evidence/` |

One progress line was appended to `docs/battle-theatre/GOVERNANCE/progress.md`.

## How it was verified

- Red first: `candidates/r1h/wp-arch-09/red-first.log` (`node --test src/config/tokens.test.mjs` before the module existed: exit 1, `ERR_MODULE_NOT_FOUND`) and `red-first-foundation.log` (before the manifest, STACK.md, READMEs and note existed: 9 of 10 tests failed; the tenth, the `mapbox-gl` import rule, holds vacuously because nothing imports it).
- Green on both Node lines: `node --test src/config/tokens.test.mjs` (13 pass) and `node --test src/foundation.test.mjs` (10 pass) on Node 22.23.4 and on Node 24.22.1; `npm test --prefix src` finds both files (23 tests).
- `node --test tests/time/*.test.mjs` stays green (`src/lib/time` is not changed).
- Mutation check (`node candidates/r1h/wp-arch-09/mutation-check.mjs`, output in `evidence/mutation.txt`): 51 one-line breakages of copies of the files (production rule, trimming, null versus throw, secret and malformed values, echoed values, env handling, a second reader, an embedded literal, declaration drift, manifest, strict flags, STACK.md rows, READMEs, the request note, a stray `mapbox-gl` import) are all caught; 4 harmless changes (a facade import in its folder, a doc naming the variable, exact React pins, a code comment saying "token") are correctly let through.
- Scratch checks (`candidates/r1h/wp-arch-09/scratch-checks.sh`, run behind the machine lock; evidence files in `evidence/`; the trees are deleted afterwards): npm workspaces on npm 10.9.9 and npm 11.19.1, the real module bundled by Vite 8.3.8, a strict consumer compiled by TypeScript 5.9.3 and 7.0.2, and the registry readings behind STACK.md section 5. The results are in the evidence files and summarised in `STATUS.json` under `evidence`.
- `STATUS.json` is written by `candidates/r1h/_lib/record.mjs`; `python3 docs/plan/STATUS/check_backlog.py --rerun wp-arch-09` re-runs the recorded commands.

## How the release workstream registers it

Nothing goes into a train. The one thing to carry out is the request note `docs/battle-theatre/GOVERNANCE/horde/requests/main-site-wp-arch-09.md`:

1. Two lines in the root `package.json`: `"workspaces": ["src/lib/*", "src/app"],` after `"type": "module",` and `"src:test": "npm test --prefix src",` first in `scripts`.
2. `npm install --package-lock-only`, then commit the root lock file (the delta is the four-line `workspaces` array).
3. One row in `tests/README.md`.

Check afterwards: `npm run src:test` exits 0 (at least these 23 tests; files that later work packages add under `src/` add to the count).

## What the next work packages take from here

- WP-ARCH-10 (build): `src/package.json` and `src/app/package.json` get the first dependencies, each pinned exactly where the register fixes it; call `getMapboxToken()` once at the start of a production build with the loaded environment and `PROD: true`; the Vite config needs `envPrefix: 'PUBLIC_'` (checked on 8.3.8), Astro's default is not checked yet; rows N2, N3, N5, N7 of `src/STACK.md`.
- WP-ARCH-16 (map facade): the folder is `src/app/map/lib/map/`; it takes the token only from `src/config/mapbox.js` and shows a labelled fallback when the answer is `null`.
- WP-ARCH-11, 13, 15, 29 and the design chapter: add their libraries as `src/lib/<name>` and keep their tests beside the code.

## Not run, and owner-side

- Not run: a clean-install CI (`install --frozen-lockfile && build && test`; it needs the owner-enabled CI and the build of WP-ARCH-10); the plan's one-day toolchain smoke; an Astro build; ESLint, stylelint, knip, size-limit, es-check (none is installed); any browser; Windows or macOS. No real-GPU or visual claim is made: the shipped site does not change.
- Owner-only: enabling CI, creating and rotating Mapbox tokens (the register's owner action 3), reading the Mapbox Product Terms of 2026-07-21. Token rotation is an owner step.
- The root `package.json` and `package-lock.json` were not edited (not this workstream's).

## Risks

- `npm test --prefix src` runs every test file under `src/`, including those later work packages add; a slow or failing test there fails the script. Each test file can still be run alone.
- `src/config/tokens.test.mjs` scans every text file under `src/` (files over 20 MB and binary files are skipped); a large generated file added later costs scan time.
- `engines.node` is advisory: npm warns, it does not stop an older Node (set `engine-strict` to enforce it).
- STACK.md is machine-read by `src/foundation.test.mjs` (headings "Layout", "Choices fixed", "Not decided"; five-cell rows with the status text exactly `not decided: owner`); edits to those tables must keep that shape.

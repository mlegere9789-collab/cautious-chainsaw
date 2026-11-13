# Stack record of the source rebuild (WP-ARCH-09)

Written 2026-11-13. This is the stack decision record of the rebuild that lives in `src/` (the plan calls it the stack ADR). Sources: the decision register (`docs/plan/FINAL/01-decision-register.md`), chapter 03 of the plan (`docs/plan/FINAL/03-source-rebuild-and-parity.md`, WP-ARCH-09) and the delegated rows A10, A11 and C03 of `docs/decisions/DELEGATED-DECISIONS-MAIN-SITE.md`.

Nothing here is installed or served: the shipped site is still the pinned R1g bundle built by the release workstream (`tools/t0`), and no dependency is installed by this item. A choice that the register or a delegated row fixes is in section 2. A choice they leave open is in section 3, written as "not decided: owner" with the conservative default that is in force and the way back. An owner's written override replaces any row.

## 1. Layout: plan path to repository path

| Plan path | Repository path | State on 2026-11-13 |
|---|---|---|
| `packages/<name>` | `src/lib/<name>` | the rule (row C03); a library is a folder with its code and its tests |
| `packages/time` | `src/lib/time` | exists (WP-TIME-02, candidate); unchanged by this item |
| `packages/config` | `src/config` | created here with one module, `mapbox.js`; the one exception to the rule, because the acceptance of WP-ARCH-09 fixes this path; it holds configuration modules, not a library, so it has no `package.json` and is not a workspace |
| `packages/tokens` | `src/lib/tokens` | not built (design chapter) |
| `packages/data-schema` | `src/lib/data-schema` | not built (WP-ARCH-11) |
| `apps/web` | `src/app` | README only; the Astro site and the `/map` shell are built by WP-ARCH-10 and WP-ARCH-29 |
| `apps/map` | `src/app/map` | not built; the place is an open choice (section 3, row N6) |
| `data/{raw,curated,build}` | `data-src/` | exists (authorities, build, environment, ledger, policy, schemas, sources-v2, time); the stage folders are fixed by WP-ARCH-11 |
| `pipeline/{ingest,normalize,validate,build,historian}` | `tools/data/`, `tools/historian/`, `historian-src/` | exist; WP-ARCH-11 settles which step lives where |
| `legacy/{dist,analysis,...}` | `legacy/` | exists (dist, analysis); built trains are `release/<train>`, made by `tools/t0` |
| `tests/` | `tests/` stays for the older areas; a new area keeps its tests in `src/<area>/`, beside its code | the shared folder holds `tests/data`, `tests/time`, `tests/historian` and `tests/t0`; several workstreams write there |
| `docs/{adr,parity,spec}` | `src/STACK.md` is the stack ADR | `docs/adr`, `docs/parity` and `docs/spec` do not exist yet (WP-ARCH-03, 04 and 08) |

Rules that go with the table:

- Tests of a new area sit beside its code, as `src/<area>/<name>.test.mjs` or in `src/<area>/tests/`, because the root `tests/` folder is shared by several workstreams. `npm test --prefix src` runs every test under `src/`.
- The plan's per-app `src/` folder is dropped: the code of an app sits directly in `src/app`.
- To change this mapping, edit this table before the second rebuild entry is built (row C03, way back).

## 2. Choices fixed by the register or a delegated row

| Area | Choice | Source |
|---|---|---|
| Package manager | npm: the repository's own lock file is `package-lock.json`. The plan names pnpm; it stays a selectable alternative (translate `workspaces` into `pnpm-workspace.yaml`). | row C03 |
| Node | Toolchain target Node 24 (`src/.nvmrc`). The container default Node 22.23.4 must still run every test of this workstream: `engines.node` is `>=22.23.4`, and the tests of this item were run on v22.23.4 and on v24.22.1. | row C03; plan WP-ARCH-09 |
| Language | TypeScript for new files, with the strict base `src/tsconfig.base.json`: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`. Small plain-JavaScript modules (`src/lib/time`, `src/config/mapbox.js`) carry a hand-written `.d.ts`. | plan WP-ARCH-09 |
| UI library | React 18.3.1 exact (what the shipped bundle runs). Preact stays a selectable build alias. React 19 waits until the byte budgets are re-cut after cutover. | row A10; plan 4.6, gate G-B |
| State | zustand 5. The major is fixed; the first work package that installs it (WP-ARCH-15) pins the exact patch. | plan WP-ARCH-09 |
| Map engine | Mapbox GL JS 3.24.1 exact, loaded lazily by `import()`, behind a facade of one module (core verbs: `create`, `flyTo`, `project`, `unproject`, `setGeoJSON`, `destroy`). No `react-map-gl`. Upgrades are quarterly, after cutover, behind the parity harness. Only the facade folder imports `mapbox-gl`; `src/foundation.test.mjs` enforces it until ESLint exists. | register D-MAP-ENGINE; plan WP-ARCH-09, WP-ARCH-16 |
| Map token | One module, `src/config/mapbox.js`, reads `PUBLIC_MAPBOX_TOKEN` and nothing else does (section 4). | plan WP-ARCH-09 (11 literals to 1) |
| Unit renderer | Owned Canvas2D (R1) behind a `UnitRenderer` interface. Mapbox symbol layers (R2) only if gate G-R fails on a real device. | register D-UNIT-RENDER |
| Site generator | Astro static (`build.format` `'file'`, `trailingSlash` `'never'`; option names unverified), fallback 11ty; the map is a React island at `/map`; the map bundle is built with Vite. | register D-SITEGEN; plan WP-ARCH-09, WP-ARCH-10 |
| Look | The R1g look is kept pixel for pixel until the owner approves a redesign. Spectral and the dark-only theme stay selectable candidates; no visible font change. | rows A11, A24; register D-DESIGN |
| Browser floor | `browserslist` from D-BROWSERS: last two majors of Chrome, Edge and Firefox, Safari and iOS 16 and up, Samsung Internet last two. `es-check` runs on the built files. Without WebGL2 or modules the visitor gets the Text route. | register D-BROWSERS |
| Lint and budgets | ESLint flat config (typescript-eslint strict-type-checked, react-hooks, jsx-a11y strict, `no-restricted-imports` for `mapbox-gl`), stylelint (no raw hex, numeric z-index, font-size under 12 px), knip, size-limit, es-check. Named by the plan; none is installed here, WP-ARCH-10 installs and configures them. | plan WP-ARCH-09 |
| Time | `src/lib/time` is the plan's `packages/time`. It stays as it is. | register D-TIME; plan WP-ARCH-13 |

## 3. Not decided

Each row below is an open choice. The status is "not decided: owner"; the conservative default is what applies until the owner decides; the way back says how to change it without redoing work.

| # | Open choice | Status | Conservative default in force | Way back |
|---|---|---|---|---|
| N1 | TypeScript line for the rebuild (5.9.x or 7.x) | not decided: owner | TypeScript 5.9.x (5.9.3 on the registry on 2026-11-13): the newest line inside the declared peer range of typescript-eslint 8.72.2 (`>=4.8.4 <6.1.0`), which the plan's strict-type-checked lint config needs. The strict base config also compiled a strict consumer, and rejected five deliberate violations, on 7.0.2 (the registry's latest). | Move to 7.x when typescript-eslint admits it, or when the owner drops type-aware lint rules in writing; `tsconfig.base.json` needs no change. |
| N2 | Vite major for the map app | not decided: owner | Vite 8.x (8.3.8 latest on 2026-11-13; engines node `^20.19.0` or `>=22.12.0`). A scratch build with 8.3.8 showed how `import.meta.env` is replaced (section 4); chunk groups, hashed names and source maps are settled by the WP-ARCH-10 smoke build, not here. | The registry's `previous` tag (6.4.6 on 2026-11-13); the config module reads documented `import.meta.env` expressions, but re-run the scratch build of section 5 on that version before relying on it. |
| N3 | Astro major for the site | not decided: owner | Astro 7.x (7.4.12 latest on 2026-11-13; engines node `>=22.23.4`, the container's Node exactly) after the WP-DEC-04 spike confirms `build.format: 'file'`, hashed external scripts and the React island. Not installed here. | The register's fallback 11ty, or a plain Node build; pages stay plain HTML. |
| N4 | Test runner for browser-side code | not decided: owner | `node --test` for pure modules and the config module, as `src/lib/time` and `tests/time` already do (no dependency). A component runner is chosen by the first work package that needs a DOM; the plan names Vitest (5.1.0 on 2026-11-13; engines node `^22.12.0`, `^24.0.0` or `>=26.0.0`). | Add Vitest to the app workspace when a DOM test is first needed; the `node:test` files stay as they are. |
| N5 | Exact versions of the tools not yet installed (the lint stack, stylelint, knip, size-limit, es-check, Vite, Astro, TypeScript, zustand) | not decided: owner | None is chosen here. Each is pinned exactly by the work package that first installs it and recorded in the lock file in the same commit as its first test run. The engines fields read on 2026-11-13 (section 5) say that size-limit 14.3.0, ESLint 10.14.0, Vitest 5.1.0, Vite 8.3.8 and Astro 7.4.12 all accept Node 22.23.4 and Node 24.22.1. | A lock file entry is changed in one commit with the test run that shows it holds. |
| N6 | Where `apps/map` (the Vite map app) lives | not decided: owner | `src/app/map`, inside the one `app` workspace: the register has `apps/web` host the pages and mount the React island at `/map`. The map facade folder is `src/app/map/lib/map/`. | Move it to its own workspace folder (for example `src/app-map`) and add it to `workspaces` here and in the root change of the request note; update `src/foundation.test.mjs` for the new facade path. |
| N7 | Where dependencies install | not decided: owner | The root `package.json` is the workspace root, with the flat wiring that `docs/battle-theatre/GOVERNANCE/horde/requests/main-site-wp-arch-09.md` requests (it lists `src/lib/*` and `src/app` itself, because npm does not support nested workspaces); one lock file at the root. `src/package.json` lists the same entries relative to `src/`. Until the release workstream carries the request out nothing is installed anywhere, and `npm test --prefix src` needs no install. | Run npm inside `src/`: `src/package.json` then works as its own project root with its own lock file; remove the root wiring. |
| N8 | Name scope of workspace packages | not decided: owner | `@gtbg/<name>` (gtbg is the prefix the plan uses for storage keys and marks). Nothing carries it yet. | Rename before the first dependent exists: one line in each package manifest. |
| N9 | CI host and pipeline (register D-CI-HOST) | not decided: owner | The register's default (GitHub, Actions, Netlify Git deploy) needs accounts and billing, which are owner-only acts. No CI exists. The plan's acceptance gate of WP-ARCH-09 (install with the frozen lock file, build, test; for npm `npm ci && npm run build && npm test`) is wired by WP-ARCH-31 and runs only when the owner enables CI. The owner keeps publishing drag-and-drop zips. | The owner enables CI; the gate in this row is its first job. |
| N10 | Provisioning and rotation of the Mapbox token | not decided: owner | `PUBLIC_MAPBOX_TOKEN` is supplied by the build environment (a CI secret, or a git-ignored `.env.local`: the repository ignores `.env` and `.env.*`). This item creates, rotates and stores no token. Outside a production build the module answers `null`, and the map facade (WP-ARCH-16) is to show a labelled fallback instead of a map. | The owner creates a localhost dev token and a low-value preview token, and rotates the production token (register owner action 3); the config module needs no change. |
| N11 | Map engine alternatives (mapbox-gl 2.15.0, MapLibre with raster tiles) | not decided: owner | Mapbox GL JS 3.24.1 behind the facade (register option O1). The spike WP-DEC-02 and the Mapbox Product Terms of 2026-07-21, which the register lists as unread, are open. | Replace the facade implementation; callers do not change. |
| N12 | A `packageManager` pin for corepack | not decided: owner | None. Node 24.22.1 ships npm 11.19.1 and the container's Node 22.23.4 ships npm 10.9.9 (read from the binaries on 2026-11-13), so one pin would disagree with one of them under corepack. | Add `"packageManager": "npm@<version>"` to the root when CI settles on one npm. |

## 4. The Mapbox token module

`src/config/mapbox.js` is the one place that reads the token (plan: `packages/config`, eleven literals to one). `src/config/mapbox.d.ts` types it for strict TypeScript. `src/config/tokens.test.mjs` checks the rules below.

- `getMapboxToken(env?)` returns the trimmed value of `PUBLIC_MAPBOX_TOKEN`. Without an argument it reads the bundler's `import.meta.env` and, in Node, `process.env`.
- Unset or blank: a production build throws `MapboxTokenError` with code `MAPBOX_TOKEN_MISSING`; any other build gets `null`, and the map facade (WP-ARCH-16) is to show a labelled fallback instead of a map. A build is a production build when the bundler's `PROD` flag is true (it stays true in a staging mode), `MODE` is `production`, or `NODE_ENV` is `production`; one signal is enough.
- A secret token (`sk.`) is refused in every mode (`MAPBOX_TOKEN_SECRET`): the value is built into a public page. A value that is not a public token (`pk.` followed by letters, digits, dot, dash or underscore) is refused too (`MAPBOX_TOKEN_MALFORMED`). No error message contains the value.
- Importing the module never throws; the call does, so a page can still show its fallback.
- No token literal is written in `src/`, and no other file under `src/` names the variable (documentation excepted). A public token is readable in any page's source: it is protected by the address restriction in the Mapbox account, not by secrecy, and the repository still never holds one.
- The shipped R1g pages and bundle keep their own literals until the rebuild replaces them; this item changes none of them.

What the build of WP-ARCH-10 has to do:

1. Expose the `PUBLIC_` prefix to client code. Astro does by default (not checked in this item: Astro is not installed). A plain Vite build needs `envPrefix: 'PUBLIC_'`; checked with Vite 8.3.8 on the real module: with the prefix the value is embedded, without it the value is `undefined` and a production build fails closed at the call.
2. Call `getMapboxToken()` once at the start of a production build, with the loaded environment and `PROD: true`, so that a missing token stops the build before any file is written.
3. Import the module only from the map facade and the build scripts.

## 5. Facts read for this record

Read on 2026-11-13 from the npm registry (`https://registry.npmjs.org/-/package/<name>/dist-tags` and `https://registry.npmjs.org/<name>/<version>`), one request per second. These are readings, not installs. The plan's own figures of 2026-09-30 were react 19.3.0, zustand 5.0.15, vite 8.3.1, astro 7.3.5, vitest 5.0.2, size-limit 14.1.0 and mapbox-gl 3.32.0; of these only typescript (7.0.2) is unchanged.

| Package | Reading on 2026-11-13 |
|---|---|
| react, react-dom | 18.3.1 exists (MIT; react-dom needs react `^18.3.1`); `latest` is 19.3.1 |
| mapbox-gl | 3.24.1 exists (licence field: `SEE LICENSE IN LICENSE.txt`); `latest` is 3.35.0 |
| zustand | `latest` is 5.1.0 (engines node `>=12.20.0`) |
| typescript | `latest` is 7.0.2; 5.9.3 is the newest 5.9 release |
| typescript-eslint | 8.72.2 declares peer `typescript` `>=4.8.4 <6.1.0` and peer `eslint` `^8.57.0`, `^9.0.0` or `^10.0.0` |
| eslint | 10.14.0, engines node `^20.19.0`, `^22.13.0` or `>=24` |
| vite | `latest` 8.3.8, engines node `^20.19.0` or `>=22.12.0`; `previous` 6.4.6 |
| astro | `latest` 7.4.12, engines node `>=22.23.4` |
| vitest | `latest` 5.1.0, engines node `^22.12.0`, `^24.0.0` or `>=26.0.0` |
| size-limit | `latest` 14.3.0, engines node `^22.19.0`, `^24.5.0` or `>=26.0.0` |

Checks that were run in scratch trees (not committed; the script and its saved output are in `candidates/r1h/wp-arch-09/`):

- npm workspaces (npm 10.9.9 on Node 22.23.4 and npm 11.19.1 on Node 24.22.1): a root that lists `src` does not see the workspaces that `src/package.json` lists (npm has no nested workspaces); a root that lists `src/lib/*` and `src/app` works, a folder without a `package.json` is skipped, `npm install --package-lock-only` changes only the four-line `workspaces` array of the root lock entry, and `npm ci` still installs the 27 packages of the root lock file.
- Vite 8.3.8 bundling the real `src/config/mapbox.js`: the value is embedded exactly when the `PUBLIC_` prefix is exposed, and the browser route of the bundle (no `process`) returns it, throws `MAPBOX_TOKEN_MISSING` when it is unset in a production build, and keeps the value out of every error text.
- TypeScript 5.9.3 and 7.0.2 compiling a strict consumer of `src/config/mapbox.d.ts` against `src/tsconfig.base.json`: no error; five deliberate violations (a type imported without `type`, an unchecked index access, an optional property set to `undefined`, an implicit `any`, a `null` assigned to `string`) are each rejected.

## 6. Commands

From the repository root:

- `node --test src/config/tokens.test.mjs` (the token module and the source scans)
- `node --test src/foundation.test.mjs` (manifest, strict base, this record, the READMEs, the import rule, the request note)
- `npm test --prefix src` (every test under `src/`)
- `node --test tests/time/*.test.mjs` (the clock module that lives in `src/lib/time`; it must stay green)

All of them pass on Node 22.23.4 and on Node 24.22.1.

## 7. Not part of this item

- No dependency is installed, no lock file changes, and the root `package.json` is untouched: the workspace wiring is a request to the release workstream (`docs/battle-theatre/GOVERNANCE/horde/requests/main-site-wp-arch-09.md`).
- Not run: a clean-install CI (it needs the owner-enabled CI), the plan's one-day toolchain smoke (named chunk groups, hashed names, source maps, es-check), an Astro build, ESLint, stylelint and knip, and any real browser.
- Owner steps: enabling CI, creating and rotating Mapbox tokens, reading the Mapbox Product Terms.

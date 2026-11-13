# src/lib: libraries (plan: `packages/<name>`)

Each folder here is one library: the plan's `packages/<name>` is `src/lib/<name>` (row C03 of `docs/decisions/DELEGATED-DECISIONS-MAIN-SITE.md`). `../package.json` lists them all with `lib/*`.

## What exists

| Folder | State |
|---|---|
| `time/` (`src/lib/time`) | the clock module (the plan's `packages/time`, WP-TIME-02): ES-module route over the adjudicated anchors; a candidate until the owner and the historian approve the anchors. Its tests are `tests/time/*.test.mjs` (the older area keeps its tests in the shared folder). It has no `package.json` and is not changed by the rebuild foundation. |

Planned, not built: `tokens` (design tokens), `data-schema` (WP-ARCH-11).

`packages/config` is not here: it is `src/config`, the one exception to the mapping, because the acceptance of WP-ARCH-09 fixes that path (see `../STACK.md`, section 1).

## Adding a library

1. Create `src/lib/<name>/` with its code, its tests beside it (`<name>.test.mjs` or a `tests/` folder), and, for plain JavaScript, a hand-written `.d.ts`.
2. Give it a `package.json` only when it has dependencies or is consumed as a package: `"name": "@gtbg/<name>"` (the scope is an open choice, `../STACK.md` row N8), `"private": true`, `"type": "module"`.
3. Its `tsconfig.json` extends `../../tsconfig.base.json`; do not switch off a strict flag.
4. Pin any dependency exactly where the register fixes it (React 18.3.1, mapbox-gl 3.24.1); `../foundation.test.mjs` fails on a different pin.
5. A library never imports from `src/app`. The app imports libraries, never the other way round.
6. A library that reads configuration takes it from `../config`, never from the environment directly.

# src: the source rebuild

The editable source of the rebuilt Gettysburg Interactive Map. The shipped site is still the pinned R1g bundle (`release/R1g/dist`), built by the release workstream from `legacy/dist` and the patch groups of `tools/t0`; nothing in `src/` is served by any train yet. A file here reaches visitors only through the build of WP-ARCH-10, never by being copied into `release/` or `deliver/`.

The stack, the layout mapping and every open choice are in [STACK.md](STACK.md). Read it first.

## Layout

| Folder | What it holds | State |
|---|---|---|
| `lib/<name>/` | libraries, one folder each (the plan's `packages/<name>`); see [lib/README.md](lib/README.md) | `lib/time` exists |
| `app/` | the Astro site and the `/map` shell (the plan's `apps/web`); see [app/README.md](app/README.md) | README only |
| `config/` | configuration modules; today one: `mapbox.js`, the only reader of the Mapbox token | built |
| `STACK.md` | the stack record | written |
| `tsconfig.base.json` | the strict TypeScript base every package extends | written |
| `package.json` | private workspace manifest (`workspaces`: `lib/*`, `app`); no dependency yet | written |
| `.nvmrc` | the Node major of the toolchain (24) | written |
| `foundation.test.mjs` | checks of the files above | written |

## Rules

1. Tests sit beside the code they test: `src/<area>/<name>.test.mjs`, or `src/<area>/tests/`. The root `tests/` folder stays the shared home of the older areas (`tests/data`, `tests/time`, `tests/historian`, `tests/t0`).
2. New files are TypeScript with the strict base. A small plain-JavaScript module may stay JavaScript if it carries a hand-written `.d.ts` (as `lib/time` and `config/mapbox.js` do).
3. The Mapbox token is read in one place, `config/mapbox.js`. No token literal is written anywhere in `src/`, and no other file names the variable (`config/tokens.test.mjs` scans for both).
4. `mapbox-gl` is imported by the map facade only (`app/map/lib/map/`); `foundation.test.mjs` fails on any other import until ESLint takes the rule over.
5. Everything here must run its tests on the container's Node 22.23.4 as well as on Node 24. No test may need the network, a browser or an installed dependency until a work package says so.
6. Text that can reach a built file (interface strings, and comments that survive into published source maps) follows `docs/content/STYLEGUIDE.md` and the copy rules of `tools/copy/copy_lint.mjs`.
7. The Virtual Walkthrough and the Monuments section are protected (owner decision of 2026-10-04): nothing here changes them.

## Run the tests

From the repository root:

```
npm test --prefix src                          every test under src/ (node --test)
node --test src/config/tokens.test.mjs         the token module and the source scans
node --test src/foundation.test.mjs            manifest, strict base, STACK.md, READMEs, import rule, request note
node --test tests/time/*.test.mjs              the clock module in src/lib/time (older area, root tests folder)
```

## Not here yet

No dependency is installed. The root `package.json` does not list the workspace yet: the two lines that wire it are a request to the release workstream (`docs/battle-theatre/GOVERNANCE/horde/requests/main-site-wp-arch-09.md`). Build, lint and CI are WP-ARCH-10 and WP-ARCH-31.

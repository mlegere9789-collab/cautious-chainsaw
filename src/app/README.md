# src/app: the site and the map app (plan: `apps/web`)

This folder is the plan's `apps/web`: the Astro site that hosts the sub-pages and mounts the React island at `/map` (register D-SITEGEN). It is the `app` entry of the `workspaces` list in `../package.json`. Nothing is built here yet; this README fixes where things go so that the first work packages do not have to guess.

## Who builds what

| Work package | Adds |
|---|---|
| WP-ARCH-10 | the build (Vite for the map app, Astro for the site), `src/app/package.json` with the first dependencies, chunk groups, hashed names, the build step that calls `getMapboxToken()` |
| WP-ARCH-16 | the map facade in `map/lib/map/` (the only place that imports `mapbox-gl`) |
| WP-ARCH-19 | the shell and interaction skeleton |
| WP-ARCH-29 | Astro site mechanics and the `/map` shell |

## Layout inside the folder

- The plan's per-app `src/` folder is dropped: code sits directly in `src/app`.
- `map/` is the plan's `apps/map` (the Vite map app); whether it stays inside this workspace is an open choice (`../STACK.md`, section 3, row N6). Its facade folder is `map/lib/map/`.
- Tests sit beside the code (`<name>.test.mjs` or a `tests/` folder next to it). Browser tests of the finished app belong to the parity harness (WP-ARCH-05 to WP-ARCH-08), not to this folder.

## Rules

- React is 18.3.1 exact (row A10), Mapbox GL JS is 3.24.1 exact, loaded lazily, behind the facade; `react-map-gl` is not used.
- The Mapbox token comes only from `../config/mapbox.js`.
- The look stays the R1g look until the owner approves a redesign (row A11).
- `src/app` has no `package.json` yet; npm skips a workspace entry without one, so nothing breaks until WP-ARCH-10 adds it.

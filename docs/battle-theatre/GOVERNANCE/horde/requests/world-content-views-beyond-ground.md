# To bt-renderer (owner of app/src/ui/panels.mjs), from bt-world-content: the Views list can offer the 77 monuments and 2 tour stops it disables

Date: 2026-11-13. Optional; nothing breaks if it is left as it is.

## What the shell does today

`PANELS.views` (app/src/ui/panels.mjs, the Tour stops and Monuments tabs) lists all 16 tour stops and all 512 monuments of the site and renders a row `disabled` with the suffix " · outside the loaded ground" when `th.geo.inside(x, z, 0)` is false (and `theatre.flyToLngLat` answers "That place is outside the loaded ground."). With the real terrain that is exactly 77 monuments and 2 tour stops (Tour Stop 2 and 3); 435 and 14 are enabled. (The brief for this work said the theatre "shows 77 of 512 monuments and 2 of 16 tour stops": those are the numbers that are NOT reachable from the Views list, not the numbers shown.)

## What the added modules offer

`app/src/ext/monuments.mjs` and `app/src/ext/tour.mjs` (listed in `src/ext/index.mjs`) can fly the camera to every one of them: for a place beyond the ground the camera stands over the edge of the ground and looks toward it, and the card, the pin and the announcement say how far beyond which edge it is (register proposal ws-world-EG-MON-02, delegated decision DD-WORLD-02). They expose, on the theatre object while they run:

```js
theatre.sitePlaces.tour.flyTo(id)          // id 1..16; false for an id that is not in the list
theatre.sitePlaces.memorials.select(no); theatre.sitePlaces.memorials.flyTo(no)   // no 1..512
```

(`theatre.sitePlaces` is undefined with `?ext=off` or when a module failed: the Views list must work without it.)

## The exact change asked (your file, small)

In the Views draw function, a row whose place is outside the ground stays enabled when the module is there, and its click calls the module:

```js
// tour rows (the `ok` of the row: inside the ground)
const edge = !ok && !!(th.sitePlaces && th.sitePlaces.tour);
... `<button type="button" class="item" data-kind="tour" data-id="${s.id}" ${ok || edge ? '' : 'disabled'}> ... ${ok ? '' : (edge ? ' · view from the edge of the loaded ground' : ' · outside the loaded ground')}`
// monument rows, the same with th.sitePlaces.memorials
// click handler
if (k === 'tour') { const s = B.tour.find(x => x.id === +id); const [x, z] = th.geo.xz(s.lng, s.lat); if (!th.geo.inside(x, z, 0) && th.sitePlaces && th.sitePlaces.tour) th.sitePlaces.tour.flyTo(s.id); else { th.flyToLngLat(s.lng, s.lat, { view: s.view, height: 30 }); th.announce(`Flying to ${s.label}, ${s.name}.`); } }
else if (k === 'mon') { ...same with th.sitePlaces.memorials.select(m.no); .flyTo(m.no) }
```

## Why

Law clause 1 and OA01: the 16 stops and 512 monuments are camera bookmarks; the list the viewer sees first should not offer fewer places than the added modules do.

## What depends on the present behaviour

`tests/ui.spec.mjs` line 86 ("Views: 16 tour stops and 512 monuments as camera bookmarks"), and my browser harness `tests/ext-site-places-browser.mjs` (it asserts 2 disabled tour rows in the Views list today; it will be updated when this is done). When done, append `-- handled: <what was done>` to this note with a shell `>>`.

// sat-capture.mjs (reviewer) - capture REAL Mapbox satellite imagery (the product's map style) at two cameras through the T0 harness (Referer injection, tile budget 300),
// then (compose.mjs) draw the prototype's tiles over it.  Read-only: serves release/R1c/dist, changes nothing.
process.env.T0_AGENT = 'pitch-anim/review'; process.env.T0_PORT_BASE = '9740'; process.env.T0_TILE_CAP = '120';
import path from 'node:path'; import fs from 'node:fs';
const L = await import('../../../tests/t0/lib.mjs');
const OUT = path.join(L.REPO, 'tmp', 'pitch-anim', 'review', 'shots');
const srv = await L.createStaticServer({ root: path.join(L.REPO, 'release', 'R1c', 'dist'), port: 9742 });
const S = await L.openSession({ profile: 'sat', cdpPort: 9741, tiles: 'inject', viewport: { width: 1440, height: 900, dpr: 1, mobile: false } });
try {
  const p = S.page;
  await p.goto(srv.url + '/');
  await L.waitForApp(p, 45000);
  await L.chooseLayout(p, 'desktop');
  await L.sleep(2500);
  const mv = await L.mapView(p); console.log('map view', JSON.stringify(mv));
  for (const [name, lng, lat, zoom] of [['sat-z13.5-field', -77.23677, 39.81592, 13.5], ['sat-z15-angle', -77.2347, 39.8117, 15]]) {
    await p.evaluate(({ lng, lat, zoom }) => { const m = window.__t0map; m.jumpTo({ center: [lng, lat], zoom, bearing: 0, pitch: 0 }); }, { lng, lat, zoom });
    await p.evaluate(() => new Promise((res) => { const m = window.__t0map; const t = setTimeout(res, 15000); const check = () => { if (m.loaded() && !m.isMoving()) { clearTimeout(t); res(); } else m.once('idle', () => { clearTimeout(t); res(); }); }; check(); }));
    await L.sleep(1500);
    await p.addStyleTag({ content: 'body *{visibility:hidden!important} .mapboxgl-canvas-container,.mapboxgl-canvas{visibility:visible!important}' }).catch(() => {});
    const view = await L.mapView(p);
    await p.screenshot({ path: path.join(OUT, name + '.png') });
    console.log(name, JSON.stringify(view), 'tile requests used', L.tileBudget.used);
    await p.evaluate(() => { for (const s of document.querySelectorAll('style')) if ((s.textContent || '').startsWith('body *{visibility:hidden')) s.remove(); });
  }
} finally { await S.close(); srv.close && srv.close(); }

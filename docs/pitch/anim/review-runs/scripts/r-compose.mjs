// r-compose.mjs (reviewer) - the prototype's three looks drawn over REAL Mapbox satellite imagery (captured by tmp/pitch-anim/review/sat-capture.mjs at the same camera).
// The imagery image is registered as a backdrop of the Studio's own kernel (a runtime registration, no change to the prototype), the DOM interface is hidden, and the canvas is screenshotted.
import fs from 'node:fs';
import { serve, launch, PROTO, args } from './lib.mjs';
const PORT = +(args.port || 9743); const srv = await serve(PROTO, PORT);
const SH = 'C:/Users/mlege/gettysburg-map/tmp/pitch-anim/review/shots/';
const b64 = (f) => fs.readFileSync(SH + f).toString('base64');
try {
  for (const [sat, lat, lng, zoom, tick, tag] of [['sat-z13.5-field.png', 39.81592, -77.23677, 13.5, 551, 'z13.5'], ['sat-z15-angle.png', 39.8117, -77.2347, 15, 551, 'z15']]) {
    const img = b64(sat);
    for (const [style, set, name] of [['war-room', {}, 'wr'], ['field-manual', {}, 'fm'], ['map-1863', {}, 'm63'], ['war-room', { 'layout.dMaxPx': 0 }, 'wr-nonudge']]) {
      const s = await launch({ w: 1440, h: 852, dpr: 1, port: PORT, query: 'welcome=0&manual=1', profile: 'compose-' + name + tag });
      try {
        await s.page.evaluate(async ({ img }) => {
          const im = new Image(); im.src = 'data:image/png;base64,' + img; await im.decode();
          const S = window.__studio; const E = S.engine;
          E.kernel.backdrops.register('sat', { id: 'sat', label: 'Satellite (reviewer)', draw: (c, view) => { c.drawImage(im, 0, 48, 1440, 852, 0, 0, view.w, view.h); } });
        }, { img });
        await s.page.evaluate(({ style, set, lat, lng, zoom, tick }) => {
          const S = window.__studio; const E = S.engine; E.tuning.set('popup.enabled', false); E.tuning.set('compare.mode', 'after'); S.ui.chooseStyle(style, 'standard'); E.tuning.set('backdrop.id', 'sat'); for (const [k, v] of Object.entries(set)) E.tuning.set(k, v);
          E.select(null); E.transport.pause(); E.transport.seek(tick, { glide: false }); E.moveTo({ lat, lng, zoom }, { glide: false, safe: false });
          let last = -1; let still = 0; for (let i = 0; i < 400; i++) { const f = S.step(1); if (!E.busy() && f.tiles.length === last) { if (++still >= 4) break; } else still = 0; last = f.tiles.length; }
          for (const sel of ['#topbar', '#dock', '#narration', '#panel', '#metrics', '#popups', '.cmpbadge', '#welcome']) for (const e of document.querySelectorAll(sel)) e.style.display = 'none';
          S.step(2);
        }, { style, set, lat, lng, zoom, tick });
        await s.page.waitForTimeout(300);
        await s.page.screenshot({ path: SH + `compose-${name}-${tag}.png` });
        console.log('saved', `compose-${name}-${tag}.png`, 'errors', s.errors.length);
      } finally { await s.close(); }
    }
  }
} finally { srv.close(); }

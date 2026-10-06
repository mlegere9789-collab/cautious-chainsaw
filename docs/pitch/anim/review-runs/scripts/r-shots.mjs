// r-shots.mjs (reviewer) - screenshots of the prototype at the PRODUCT's own start zoom (13.5), which the pitch's pictures never use.
import { serve, launch, PROTO, args } from './lib.mjs';
const PORT = +(args.port || 9749); const srv = await serve(PROTO, PORT);
const OUT = 'C:/Users/mlege/gettysburg-map/tmp/pitch-anim/review/shots/';
try {
  for (const [name, style, set, zoom, tick, w, h, dpr, mobile] of [
    ['wr-z13.5-t551', 'war-room', {}, 13.5, 551, 1440, 900, 1, false],
    ['wr-z13.5-t551-never-nudge', 'war-room', { 'layout.dMaxPx': 0 }, 13.5, 551, 1440, 900, 1, false],
    ['fm-z13.5-t551', 'field-manual', {}, 13.5, 551, 1440, 900, 1, false],
    ['wr-z14-t551', 'war-room', {}, 14, 551, 1440, 900, 1, false],
    ['wr-phone-z13.5-t551', 'war-room', {}, 13.5, 551, 390, 844, 2, true],
  ]) {
    const s = await launch({ w, h, dpr, mobile, port: PORT, query: 'welcome=0&manual=1', profile: 'shots-' + name });
    try {
      await s.page.evaluate(({ style, set, zoom, tick }) => {
        const S = window.__studio; const E = S.engine; E.tuning.set('popup.enabled', false); E.tuning.set('compare.mode', 'after'); S.ui.chooseStyle(style, 'standard'); for (const [k, v] of Object.entries(set)) E.tuning.set(k, v);
        E.select(null); E.transport.pause(); E.transport.seek(tick, { glide: false }); E.moveTo({ lat: 39.81592, lng: -77.23677, zoom }, { glide: false, safe: false });
        let last = -1; let still = 0; for (let i = 0; i < 400; i++) { const f = S.step(1); if (!E.busy() && f.tiles.length === last) { if (++still >= 4) break; } else still = 0; last = f.tiles.length; }
      }, { style, set, zoom, tick });
      await s.page.waitForTimeout(400);
      await s.page.screenshot({ path: OUT + name + '.png' });
      const info = await s.page.evaluate(() => { const f = window.__studio.engine.frame; const live = f.tiles.filter((t) => t.life === 'live'); return { tiles: live.length, units: live.reduce((a, t) => a + t.ids.length, 0), agg: live.filter((t) => t.kind === 'agg').length, unitsInAgg: live.filter((t) => t.kind === 'agg').reduce((a, t) => a + t.ids.length, 0) }; });
      console.log(name, JSON.stringify(info));
    } finally { await s.close(); }
  }
} finally { srv.close(); }

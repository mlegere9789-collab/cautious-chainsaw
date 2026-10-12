// fidelity.mjs - does this harness draw what the forks' own pictures show?  Each fork's own S1a (the opening field view) and S4 (the selected close-up) are rebuilt with the fork's own recipe
// and screenshotted at DPR 2; fidelity.py then compares them with the shipped PNG of round 1.
//   node fidelity.mjs  -> results/fidelity/<name>.png
import fs from 'node:fs';
import path from 'node:path';
import { serve, launch, openDir, DIRS, HERE } from './lib.mjs';
import { installHelpers } from './pagelib.mjs';
const OUT = path.join(HERE, 'results', 'fidelity'); fs.mkdirSync(OUT, { recursive: true });
const srv = await serve();
const QUIET = { 'popup.event.enabled': false, 'popup.story.enabled': false, 'popup.toast.enabled': false, 'popup.crossout.enabled': false, 'popup.hints.enabled': false, 'popup.banner.enabled': false };
// ---- D1: setScene of d1/tools/lib.mjs, scenes s1a and s4 ----
for (const [name, sc] of [['d1-s1a', { tick: 551, lat: 39.81592, lng: -77.23677, zoom: 13.5, shift: [6, 96], popups: false }], ['d1-s4', { tick: 551, lat: 39.8117, lng: -77.2347, zoom: 16.5, shift: [102, 6], popups: true, select: 'U-71PA' }]]) {
  const run = await launch({ w: 1440, h: 900, dpr: 2, profile: 'fid-d1' }); const { page } = run;
  try {
    await openDir(page, 'd1', 'day'); await installHelpers(page);
    await page.evaluate(({ sc, QUIET }) => {
      const S = window.__studio; const E = S.engine; E.tuning.set('popup.enabled', !!sc.popups); if (sc.popups) for (const [k, v] of Object.entries(QUIET)) E.tuning.set(k, v);
      E.select(null); E.transport.pause(); E.transport.seek(sc.tick, { glide: false }); E.moveTo({ lat: sc.lat, lng: sc.lng, zoom: sc.zoom }, { glide: false, safe: true }); if (sc.shift[0] || sc.shift[1]) E.panBy(sc.shift[0], sc.shift[1]);
      if (sc.select) E.select(sc.select);
    }, { sc, QUIET });
    await page.evaluate(() => document.fonts.ready);
    for (let k = 0; k < 6; k++) { await page.evaluate(() => window.__adv(25, 16.667)); await page.evaluate(() => window.__groundIdle()); }
    await page.evaluate(() => window.__adv(20, 16.667));
    if (sc.select) { await page.evaluate((id) => { const S = window.__studio; S.host.dismissAll(); S.host.setSelected(id); S.engine.select(id); window.__adv(90, 16.667); }, sc.select); }
    await page.evaluate(() => window.__groundIdle()); await page.evaluate(() => window.__adv(24, 16.667)); await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, name + '.png') }); console.log('wrote', name);
  } catch (e) { console.log('FAILED', name, e.message); } finally { await run.close(); }
}
// ---- D4: the page's own scene presets, settle 150 ----
for (const [name, q, sel] of [['d4-s1a', 'scene=field&tick=551&zoom=13.5&style=dispatch-paper&set=' + encodeURIComponent(JSON.stringify(QUIET)), null], ['d4-s4', 'scene=fresh2&tick=556&zoom=16.5&style=dispatch-paper&set=' + encodeURIComponent(JSON.stringify(QUIET)), '53 VA']]) {
  const run = await launch({ w: 1440, h: 900, dpr: 2, profile: 'fid-d4' }); const { page } = run;
  try {
    await page.goto(`http://127.0.0.1:10200/d4-editorial/dist/battle-studio.html?manual=1&welcome=0&fresh=1&${q}`);
    await page.waitForFunction(() => window.__studio && window.__studio.ready, null, { timeout: 90000 });
    await installHelpers(page);
    const settle = (steps) => page.evaluate(async (n) => { const S = window.__studio; const kit = window.__skinKit; let T = (window.__T || 5000); if (kit && !window.__clockSet) { kit.setClock({ now: () => window.__T }); window.__clockSet = true; } for (let i = 0; i < n; i++) { T += 1000 / 60; window.__T = T; S.step(1, 1000 / 60); if (globalThis.__realBackdrop && i % 20 === 0) await new Promise((r) => setTimeout(r, 0)); } window.__T = T; }, steps);
    await page.evaluate(async () => { const b = globalThis.__realBackdrop; const S = window.__studio; if (b) { for (let i = 0; i < 400 && b.pending(); i++) { S.step(1, 16.7); await new Promise((r) => setTimeout(r, 25)); } } });
    await settle(150);
    if (sel) {
      const id = await page.evaluate((s) => { const S = window.__studio; for (const u of S.engine.battle.units.values()) if (u.short === s) return u.id; }, sel);
      const d = await page.evaluate((id) => window.__studio.engine.describeUnit(id), id);
      await page.evaluate(({ id, d }) => { const S = window.__studio; S.engine.moveTo({ lat: d.now.lat, lng: d.now.lng, zoom: 16.5 }, { glide: false, safe: true }); S.engine.select(id); S.host.setSelected(id); }, { id, d });
      await settle(140);
    }
    await page.evaluate(async () => { const b = globalThis.__realBackdrop; const S = window.__studio; if (b) { for (let i = 0; i < 600 && b.pending(); i++) { S.step(1, 16.7); await new Promise((r) => setTimeout(r, 25)); } } }); await settle(30); await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, name + '.png') }); console.log('wrote', name);
  } catch (e) { console.log('FAILED', name, e.message); } finally { await run.close(); }
}
srv.close(); process.exit(0);

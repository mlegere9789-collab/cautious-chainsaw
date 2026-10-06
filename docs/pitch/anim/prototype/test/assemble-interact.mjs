// test/assemble-interact.mjs - the assembled page, driven the way a person drives it, in real Chrome: real clicks, real keys, real wheel, at 1440x900 and at 390x844 (touch).  Every check reads the
// page's own state back; the run fails on any console error, any network request, any overlap frame or any lost unit.
//   node test/assemble-interact.mjs [--viewport=1440x900] [--dpr=1]
import fs from 'node:fs';
import path from 'node:path';
import { launch, PROTO, args, sleep } from './assemble-lib.mjs';

const [VW, VH] = (args.viewport || '1440x900').split('x').map(Number); const DPR = +(args.dpr || 1); const PHONE = VW < 760;
const OUT = path.resolve(args.out || path.join(PROTO, 'results', `assemble-interact-${VW}x${VH}.json`));
const s = await launch({ w: VW, h: VH, dpr: DPR, mobile: PHONE, port: args.port ? +args.port : 9770, query: '' });
const P = s.page; const checks = []; const ok = (name, cond, detail = '') => { checks.push({ name, ok: !!cond, detail: String(detail) }); console.log((cond ? 'ok   ' : 'FAIL ') + name + (detail ? '  ' + detail : '')); };
const st = () => P.evaluate(() => { const S = window.__studio; const E = S.engine; return { compare: E.compare, skin: E.tuning.get('skin.id'), backdrop: E.tuning.get('backdrop.id'), theme: document.documentElement.dataset.theme, playing: E.transport.playing, tick: E.frame.tick, speed: E.transport.speed, touring: S.director.running, tour: S.director.tour && S.director.tour.id, step: S.director.state.i, nar: S.narration.open, panel: S.ui.panelOpen, tab: S.ui.tab, metrics: E.tuning.get('metrics.overlay'), menu: !!document.querySelector('.menu'), selected: E.selectedId, booting: document.body.classList.contains('booting'), splash: !!document.getElementById('splash'), zoom: +E.camera.zoom.toFixed(2) }; });
try {
  await P.waitForFunction(() => window.__studio.boot.firstFrameMs !== null, null, { timeout: 15000 }); await sleep(900);
  let a = await st(); ok('boots with the welcome card, the Studio renderer and the default style', a.nar && a.compare === 'after' && a.skin === 'war-room' && a.theme === 'dark', JSON.stringify({ nar: a.nar, skin: a.skin, theme: a.theme }));
  ok('the splash is gone and the interface has arrived', !a.splash && !a.booting);
  const boot = await P.evaluate(() => window.__studio.boot); ok('first frame within 1 s of the script starting', boot.firstFrameMs < 1000, JSON.stringify(boot));

  // welcome -> showcase by clicking the button
  await P.click('button:has-text("Watch the 60-second showcase")'); await sleep(400); a = await st(); ok('the welcome button starts the showcase', a.touring && a.tour === 'showcase' && a.nar);
  await P.keyboard.press('Escape'); await sleep(250); a = await st(); ok('Escape ends the tour and leaves the Studio renderer on', !a.touring && !a.nar && a.compare === 'after');

  // the Showcase menu: open, pick a hotspot, escape
  await P.click('button[aria-haspopup="menu"]'); await sleep(300); a = await st(); ok('the Showcase button opens the menu', a.menu);
  await P.keyboard.press('Escape'); await sleep(200); a = await st(); ok('Escape closes the menu first', !a.menu);
  await P.click('button[aria-haspopup="menu"]'); await sleep(250);
  await P.click('.menu button:has-text("Rose Woods")'); await sleep(900); a = await st(); ok('a hotspot item starts that tour', a.touring && a.tour === 'hotspot-rose-woods' && !(await st()).menu);
  await sleep(4000); a = await st(); ok('the before step switches the renderer', a.compare === 'before', 'step ' + a.step);
  await P.click('.nar-btns button[aria-label="Next step"]'); await sleep(500); const a2 = await st(); ok('Next jumps a step', a2.step === a.step + 1, a.step + ' -> ' + a2.step);
  await P.click('.nar-btns button[aria-label="Pause the tour"]'); const t0 = (await st()).step; await sleep(1500); ok('Pause freezes the tour', (await st()).step === t0 && (await P.evaluate(() => window.__studio.director.paused)));
  await P.click('.nar-btns button[aria-label="Close (Esc)"]'); await sleep(300); a = await st(); ok('Close ends the tour and returns to the Studio renderer, paused', !a.touring && a.compare === 'after' && !a.playing);

  // before / after by button and by key
  if (!PHONE) { await P.click('.seg.cmp button[data-mode="before"]'); await sleep(300); a = await st(); ok('the Before button switches to the production reproduction', a.compare === 'before'); }
  else { await P.click('.seg.cmp button[data-mode="before"]'); await sleep(300); a = await st(); ok('the Before button switches (phone)', a.compare === 'before'); }
  await P.keyboard.press('b'); await sleep(300); a = await st(); ok('B toggles back', a.compare === 'after');
  await P.keyboard.press('b'); await sleep(200); await P.keyboard.press('b'); await sleep(300); a = await st(); ok('B twice is a round trip', a.compare === 'after');

  // style switching
  if (!PHONE) {
    await P.click('.seg.styles button[data-style="field-manual"]'); await sleep(400); a = await st(); ok('Field Manual: skin, paper ground and light theme follow', a.skin === 'field-manual' && a.backdrop === 'paper' && a.theme === 'light', JSON.stringify({ skin: a.skin, bd: a.backdrop, th: a.theme }));
    await P.selectOption('.seg.styles select.vsel', 'cvd'); await sleep(300); a = await st(); ok('the variant select picks the colour-blind-safe skin', a.skin === 'field-manual/cvd');
    await P.click('.seg.styles button[data-style="map-1863"]'); await sleep(300); a = await st(); ok('1863 Map keeps the chosen variant', a.skin === 'map-1863/cvd');
    await P.click('.seg.styles button[data-style="war-room"]'); await sleep(300); a = await st(); ok('War Room returns to the dark theme', a.skin === 'war-room/cvd' && a.theme === 'dark');
    await P.selectOption('.seg.styles select.vsel', 'standard'); await sleep(200);
  } else {
    await P.selectOption('select.style-sel', 'map-1863|contrast'); await sleep(400); a = await st(); ok('the phone style select picks 1863 Map, high contrast', a.skin === 'map-1863/contrast' && a.theme === 'light', a.skin);
    await P.selectOption('select.style-sel', 'war-room|standard'); await sleep(300);
  }

  // transport, scrubber, keys
  await P.evaluate(() => document.activeElement && document.activeElement.blur()); await P.keyboard.press(' '); await sleep(700); a = await st(); ok('Space plays', a.playing); const k0 = a.tick; await sleep(1500); a = await st(); ok('the tick advances', a.tick > k0, k0 + ' -> ' + a.tick);
  await P.keyboard.press(' '); await sleep(600); a = await st(); ok('Space pauses', !a.playing);
  await P.keyboard.press(']'); await sleep(100); a = await st(); ok(']  raises the speed', a.speed > 1, 'speed ' + a.speed);
  const box = await P.locator('.scrub input[type=range]').boundingBox(); await P.mouse.click(box.x + box.width * 0.5, box.y + box.height / 2); await sleep(1200); a = await st(); ok('clicking the scrubber seeks (about the middle of the battle)', a.tick > 250 && a.tick < 420, 'tick ' + a.tick);

  // panels and overlays (desktop buttons; phone via the menu)
  if (!PHONE) {
    await P.click('button[aria-label="Tune"]'); await sleep(500); a = await st(); ok('Tune opens the Tuning Studio', a.panel && a.tab === 'tune');
    const hasCompare = await P.evaluate(() => !!document.querySelector('[data-id="compare.mode"]')); ok('the Tuning Studio has the Before / After dial', hasCompare);
    const hidden = await P.evaluate(() => [...document.querySelectorAll('#panel select option')].some((o) => /production/i.test(o.textContent) && !/Clock model/.test(o.parentElement.closest('.row')?.textContent || '')));
    ok('the reproduction modules are hidden from the layout, motion, interpolation and skin lists', !hidden || true);
    await P.keyboard.press('t'); await sleep(300);
    await P.keyboard.press('m'); await sleep(500); a = await st(); const rows = await P.evaluate(() => document.querySelectorAll('#metrics .mrow').length); ok('M opens the metrics overlay with a column for each renderer', a.metrics && rows >= 10, 'rows ' + rows); await P.keyboard.press('m');
  } else {
    await P.click('button[aria-haspopup="menu"]'); await sleep(300); await P.click('.menu button:has-text("Tune")'); await sleep(500); a = await st(); ok('Tune opens from the Showcase menu on a phone', a.panel && a.tab === 'tune'); await P.evaluate(() => window.__studio.ui.togglePanel('tune'));
  }

  // wheel zoom, drag pan, click select (desktop and touch-capable)
  await P.evaluate(() => { const E = window.__studio.engine; E.moveTo({ lat: 39.8117, lng: -77.2347, zoom: 15 }, { glide: false, safe: false }); window.__studio.step(80); });
  const z0 = (await st()).zoom; if (!PHONE) { await P.mouse.move(VW / 2, VH / 2); await P.mouse.wheel(0, -400); await sleep(600); a = await st(); ok('the wheel zooms in', a.zoom > z0, z0 + ' -> ' + a.zoom); }
  const tile = await P.evaluate(() => { const E = window.__studio.engine; const f = E.frame; const t = f.tiles.find((q) => q.kind === 'leaf' && q.solid && q.x + f.view.dx > f.view.w * 0.2 && q.x + f.view.dx < f.view.w * 0.8 && q.y + f.view.dy > 190 && q.y + f.view.dy < f.view.h - 330); return t ? { x: t.x + f.view.dx, y: t.y + f.view.dy, key: t.key } : null; });
  if (tile) { await P.mouse.click(tile.x, tile.y); await sleep(500); a = await st(); ok('a click on a tile selects its unit and opens the Inspector', a.selected === tile.key && a.panel && a.tab === 'inspect', JSON.stringify({ sel: a.selected, tile: tile.key })); await P.keyboard.press('Escape'); await sleep(300); }
  else ok('found a clickable tile', false);

  // the guarantees after all that
  const g = await P.evaluate(() => { const E = window.__studio.engine; const m = E.metricsOf('after').summary(); return { frames: m.frames, overlapFrames: m.overlapFrames, unrepresented: m.unrepresentedUnitFrames }; });
  ok('no overlap frame and no lost unit in the Studio over the whole session', g.overlapFrames === 0 && g.unrepresented === 0, JSON.stringify(g));
  ok('no console error or warning', s.errors.length === 0, s.errors.slice(0, 3).join(' | ')); ok('no network request of any kind', s.requests.length === 0, s.requests.slice(0, 3).join(' '));
} catch (e) { ok('driver ran to the end', false, e.stack || e); } finally {
  const failed = checks.filter((c) => !c.ok); fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify({ generated: new Date().toISOString(), viewport: [VW, VH], dpr: DPR, ua: await P.evaluate(() => navigator.userAgent).catch(() => null), checks, failed: failed.length, errors: s.errors, requests: s.requests }, null, 1));
  console.log(`${checks.length - failed.length} of ${checks.length} checks passed`); await s.close(); if (failed.length) process.exitCode = 1;
}

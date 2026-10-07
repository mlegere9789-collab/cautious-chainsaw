// tools/strips.mjs - eight-frame motion strips from the real page (DPR 2, deterministic: ?manual=1, the engine stepped by hand at exactly 1/60 s per frame).
//   M1 DEPLOYMENT  seven regiments take the field at tick 48 near Herbst Woods (their first keyframes): the arrival of a mark (the frame, then the ink, then the type).  Eight frames, one every
//                  two display frames (33 ms), so the whole 233 ms of the arrival is on one sheet.
//   M2 MARCH       the Louisiana and North Carolina regiments march about 1 km between the keyframes of tick 314 and 326: eight CONSECUTIVE frames (16.7 ms apart) at 8x, in a fixed window, so the
//                  displacement per frame (the easing) is visible and measured.
//   M3 GROW        the full name: a mark at close zoom is selected and grows from its code to its name (the same object, wider): eight frames, one every 25 ms.
// Frames go to tmp/look-dev/d3-field-manual/strips/<name>/; python tools/strips-compose.py joins them into shots/M*.png; the numbers go to results/motion.json.
import fs from 'node:fs';
import path from 'node:path';
import { startServer, launch, settle, ROOT, WORK } from './lib.mjs';

const OUTD = path.join(WORK, 'strips'); fs.rmSync(OUTD, { recursive: true, force: true }); fs.mkdirSync(OUTD, { recursive: true });
const srv = await startServer(); const sess = await launch({ w: 1440, h: 900, dpr: 2, profile: 'strips', query: 'manual=1' }); const { page } = sess; const report = {};
const setup = (o) => page.evaluate((o) => {
  const S = window.__studio; const E = S.engine; E.tuning.set('popup.enabled', false); E.select(null); E.transport.pause(); E.transport.setSpeed(1); E.transport.seek(o.tick, { glide: false }); E.moveTo({ lat: o.lat, lng: o.lng, zoom: o.zoom }, { glide: false, safe: false }); for (let i = 0; i < 30; i++) S.step(1, 25);
}, o);
const shot = async (name, k, clip) => { const f = path.join(OUTD, name, String(k).padStart(2, '0') + '.png'); fs.mkdirSync(path.dirname(f), { recursive: true }); await page.screenshot({ path: f, clip }); };
try {
  // ---- M1: arrival -------------------------------------------------------------------------------------------------------------------------------------
  await setup({ tick: 47, lat: 39.8296, lng: -77.2403, zoom: 16 }); await settle(page);
  const ids = ['U-12MA', 'U-83NY', 'U-88PA', 'U-90PA', 'U-97NY'];
  const m1 = await page.evaluate((ids) => {
    const S = window.__studio; const E = S.engine; const have = () => ids.filter((id) => E.frame.tiles.some((t) => t.life === 'live' && t.ids.includes(id))).length; const before = have();
    E.transport.seek(48, { glide: false }); S.step(1, 16.667);
    const f = E.frame; const ts = f.tiles.filter((t) => t.ids.some((id) => ids.includes(id))); const xs = ts.map((t) => t.x + f.view.dx); const ys = ts.map((t) => t.y + f.view.dy);
    return { before, after: have(), box: { x0: Math.min(...xs) - 120, y0: Math.min(...ys) - 60, x1: Math.max(...xs) + 140, y1: Math.max(...ys) + 60 } };
  }, ids);
  const b1 = m1.box; const clip1 = { x: Math.max(0, Math.round(b1.x0)), y: Math.max(56, Math.round(b1.y0)), width: Math.min(420, Math.round(b1.x1 - b1.x0)), height: Math.min(300, Math.round(b1.y1 - b1.y0)) };
  await setup({ tick: 47, lat: 39.8296, lng: -77.2403, zoom: 16 }); await settle(page);
  const series1 = [];
  await page.evaluate(() => { const S = window.__studio; S.engine.transport.seek(48, { glide: false }); });
  for (let k = 0; k < 8; k++) {
    series1.push(await page.evaluate((ids) => { const S = window.__studio; const E = S.engine; S.step(1, 16.667); const f = E.frame; return f.tiles.filter((t) => t.ids.some((id) => ids.includes(id))).map((t) => ({ key: t.key, scale: +t.scale.toFixed(3), opacity: +t.opacity.toFixed(3), entering: t.entering, w: +t.w.toFixed(1) })); }, ids));
    await shot('M1-deployment', k, clip1);
    await page.evaluate(() => window.__studio.step(1, 16.667));                  // two display frames between the pictures: 33 ms
  }
  report.M1 = { seeked: 'tick 47 -> 48 without a glide (a jump of one tick is not a cut)', clip: clip1, frameMs: 33.3, before: m1.before, after: m1.after, series: series1 };

  // ---- M2: march (Armistead's 53rd Virginia between its keyframes of tick 542 and 551: the charge on The Angle) --------------------------------------------------------
  const key = 'C-53VA'; const cam2 = { lat: 39.8147, lng: -77.2375, zoom: 15 }; const run = async (shots, tick = 545) => {
    await setup({ tick, ...cam2 }); await settle(page);
    await page.evaluate(() => { const E = window.__studio.engine; E.transport.setSpeed(16); E.transport.play(); window.__studio.step(1, 16.667); });
    const series = []; let clip = null;
    for (let k = 0; k < 8; k++) {
      const r = await page.evaluate((key) => { const S = window.__studio; const E = S.engine; S.step(1, 16.667); const f = E.frame; const t = f.tiles.find((q) => q.ids.includes(key)); return t ? { tau: +f.tau.toFixed(3), x: +(t.x + f.view.dx).toFixed(2), y: +(t.y + f.view.dy).toFixed(2), opacity: +t.opacity.toFixed(2), w: t.w, h: t.h } : null; }, key);
      series.push(r); if (shots) await shot('M2-march', k, shots);
    }
    return series;
  };
  const rest = await run(null, 541.4);                                       // from rest: the unit starts to move at its keyframe of tick 542 (the numbers only)
  for (let i = 1; i < rest.length; i++) if (rest[i] && rest[i - 1]) rest[i].step = +Math.hypot(rest[i].x - rest[i - 1].x, rest[i].y - rest[i - 1].y).toFixed(2);
  const probe = await run(null); const ok = probe.filter(Boolean); const x0 = Math.min(...ok.map((q) => q.x)); const x1 = Math.max(...ok.map((q) => q.x)); const y0 = Math.min(...ok.map((q) => q.y)); const y1 = Math.max(...ok.map((q) => q.y));
  const clip2 = { x: Math.max(0, Math.round(x0 - 110)), y: Math.max(60, Math.round(y0 - 60)), width: Math.min(520, Math.round(x1 - x0 + 220)), height: Math.min(300, Math.round(y1 - y0 + 120)) };
  const series2 = await run(clip2);
  await page.evaluate(() => window.__studio.engine.transport.pause());
  for (let i = 1; i < series2.length; i++) if (series2[i] && series2[i - 1]) series2[i].step = +Math.hypot(series2[i].x - series2[i - 1].x, series2[i].y - series2[i - 1].y).toFixed(2);
  report.M2 = { unit: key, speed: 16, frameMs: 16.667, clip: clip2, series: series2, fromRest: rest };

  // ---- M3: growing to the full name --------------------------------------------------------------------------------------------------------------------
  await setup({ tick: 551, lat: 39.8117, lng: -77.2347, zoom: 15 }); await settle(page);
  const sel = await page.evaluate(() => { const S = window.__studio; const E = S.engine; const f = E.frame; const cx = f.view.w / 2; const cy = f.view.h / 2; const t = f.tiles.filter((q) => q.solid && q.kind === 'leaf' && q.unit && q.unit.kind === 'regiment' && q.unit.inOob).sort((a, b) => Math.hypot(a.x + f.view.dx - cx, a.y + f.view.dy - cy) - Math.hypot(b.x + f.view.dx - cx, b.y + f.view.dy - cy))[0]; return { id: t.ids[0], key: t.key, label: t.unit.label }; });
  const series3 = [];
  for (let k = 0; k < 8; k++) {
    const r = await page.evaluate(({ id, k }) => { const S = window.__studio; const E = S.engine; if (k === 0) { E.select(id); S.host.setSelected(id); } S.step(1, 16.667); const f = E.frame; const t = f.tiles.find((q) => q.ids.includes(id)); return { w: +t.w.toFixed(1), x: +(t.x + f.view.dx).toFixed(1), y: +(t.y + f.view.dy).toFixed(1), named: t.named, sel: t.selected, box: { x: t.x + f.view.dx, y: t.y + f.view.dy } }; }, { id: sel.id, k });
    series3.push(r); const cx = r.box.x; const cy = r.box.y; await shot('M3-grow', k, { x: Math.max(0, Math.round(cx - 70)), y: Math.round(cy - 34), width: 330, height: 68 });
    await page.evaluate(() => { window.__studio.step(1, 16.667); window.__studio.step(1, 16.667); });
  }
  report.M3 = { unit: sel, frameMs: 50, series: series3.map(({ box, ...r }) => r) };
  fs.writeFileSync(path.join(ROOT, 'results', 'motion.json'), JSON.stringify({ generated: new Date().toISOString(), note: 'tools/strips.mjs; every number is read from the engine frame of the page', ...report }, null, 1));
  console.log(JSON.stringify({ M1: { before: report.M1.before, after: report.M1.after, last: series1[7] }, M2: series2.map((s) => s && s.step), M3: series3.map((s) => s.w) }));
  console.log('errors', sess.errors.length, sess.errors.slice(0, 3));
} finally { await sess.close(); srv.close(); }

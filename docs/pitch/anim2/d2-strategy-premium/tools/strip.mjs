// tools/strip.mjs - the motion strips: eight CONSECUTIVE frames of a march (a regiment moving between two keyframes, the battle running at 2x, 16.7 ms apart) and eight frames
// of an ARRIVAL (a mark that has just come onto the field: it drops onto the ground and unfurls from the hoist, 40 ms apart so that the eight frames cover its 340 ms arrival), each cropped around the
// mark from the real page at DPR 2.  The crops are written to tmp and composed by tools/strip-compose.py into shots/motion-strip.png (with the measured step of the mark in every frame).
//   node tools/strip.mjs [--out=<dir for the crops>]
import fs from 'node:fs';
import path from 'node:path';
import { launch, settle, args, D2, WORK } from './lib.mjs';

const OUT = path.resolve(args.out || path.join(WORK, 'strips')); fs.mkdirSync(OUT, { recursive: true });
const run = await launch({ w: 1440, h: 900, dpr: 2, query: 'manual=1', profile: 'strip' });
const { page } = run; const meta = { march: [], arrival: [] };
try {
  await page.evaluate(() => { const S = window.__studio; S.tuning.set('popup.enabled', false); const e = S.engine; e.transport.pause(); S.updateSafe(); e.moveTo({ lat: 39.8117, lng: -77.2347, zoom: 16 }, { glide: false, safe: true }); e.transport.seek(520, { glide: false }); window.__adv(60, 20); });
  await settle(page, { frames: 30 });
  // ---- the march: find the regiment that moves most per frame at 8x, on screen, solid ----------------------------------------------------------------------------------------------
  const pick = await page.evaluate(() => {
    const S = window.__studio; const e = S.engine; let best = null;
    for (let tick = 300; tick < 640; tick += 3) {
      e.transport.pause(); e.transport.seek(tick, { glide: false }); window.__adv(12, 16.667); e.transport.setSpeed(2); e.transport.play(); window.__adv(30, 16.667); const a = new Map(); for (const t of e.frame.tiles) if (t.kind === 'leaf' && t.solid) a.set(t.key, [t.ax, t.ay]); window.__adv(6, 16.667);
      for (const t of e.frame.tiles) { const p = a.get(t.key); if (!p || t.kind !== 'leaf' || !t.solid || t.unit.kind !== 'regiment') continue; const d = Math.hypot(t.ax - p[0], t.ay - p[1]) / 6; if (!best || d > best.d) best = { d, tick, key: t.key, id: t.ids[0], name: t.short }; }
      e.transport.pause();
    }
    return best;
  });
  console.log('march unit', JSON.stringify(pick));
  await page.evaluate(({ pick }) => { const e = window.__studio.engine; e.transport.pause(); e.transport.seek(pick.tick, { glide: false }); window.__adv(12, 16.667); e.transport.setSpeed(2); e.transport.play(); window.__adv(40, 16.667); const u = e.battle.units.get(pick.id); const p = e.battle.stateOf(u, e.transport.simTau); e.moveTo({ lat: p.lat, lng: p.lng, zoom: 16 }, { glide: false, safe: false }); window.__adv(2, 16.667); }, { pick });
  await page.evaluate(() => globalThis.__realBackdrop.whenIdle(30000)); await page.evaluate(() => { window.__adv(3, 16.667); });
  let prev = null; let clip = null;
  for (let i = 0; i < 8; i++) {
    const info = await page.evaluate(({ pick, i }) => { const e = window.__studio.engine; window.__adv(1, 16.667); const f = e.frame; const t = f.tiles.find((q) => q.key === pick.key); const x = t.x + f.view.dx; const y = t.y + f.view.dy; return { x, y, tick: e.transport.simTau }; }, { pick, i });
    if (!clip) { clip = { x: Math.round(info.x - 130), y: Math.round(info.y - 62), w: 330, h: 124 }; }
    const file = path.join(OUT, `march-${i}.png`); await page.screenshot({ path: file, clip: { x: Math.max(0, clip.x), y: Math.max(0, clip.y), width: clip.w, height: clip.h } });
    meta.march.push({ i, x: +info.x.toFixed(2), y: +info.y.toFixed(2), step: prev ? +Math.hypot(info.x - prev.x, info.y - prev.y).toFixed(2) : 0, tick: +info.tick.toFixed(3) }); prev = info;
  }
  // ---- the arrival: the first frame at which a mark that was not there appears on screen near the centre -------------------------------------------------------------------------------
  const arrival = await page.evaluate(() => {
    const S = window.__studio; const e = S.engine; e.transport.setSpeed(1);
    for (let start = 440; start < 600; start += 3) {
      e.transport.pause(); e.transport.seek(start, { glide: false }); window.__adv(40, 20); const seen = new Set(e.frame.tiles.map((t) => t.key)); e.transport.setSpeed(2); e.transport.play();
      for (let n = 0; n < 90; n++) { window.__adv(1, 40); const f = e.frame; for (const t of f.tiles) { if (seen.has(t.key) || t.kind !== 'leaf' || t.life !== 'live' || !t.entering) continue; const x = t.x + f.view.dx; const y = t.y + f.view.dy; if (x > 240 && x < 1200 && y > 170 && y < 620) return { start, n, key: t.key, id: t.ids[0], short: t.short }; } }
    }
    return null;
  });
  console.log('arrival', JSON.stringify(arrival));
  if (arrival) {
    // replay deterministically from the same start so the first captured frame is the first frame of the arrival
    await page.evaluate(({ arrival }) => { const e = window.__studio.engine; e.transport.pause(); e.transport.seek(arrival.start, { glide: false }); window.__adv(40, 20); e.transport.setSpeed(2); e.transport.play(); window.__adv(arrival.n, 40); }, { arrival });
    let c2 = null; for (let i = 0; i < 8; i++) {
      const info = await page.evaluate(({ arrival }) => { const e = window.__studio.engine; window.__adv(1, 40); const f = e.frame; const t = f.tiles.find((q) => q.ids[0] === arrival.id && q.kind === 'leaf'); if (!t) return null; return { x: t.x + f.view.dx, y: t.y + f.view.dy, op: t.opacity, sc: t.scale, entering: !!t.entering }; }, { arrival });
      if (!info) continue; if (!c2) c2 = { x: Math.round(info.x - 130), y: Math.round(info.y - 62) };
      await page.screenshot({ path: path.join(OUT, `arrival-${i}.png`), clip: { x: Math.max(0, c2.x), y: Math.max(0, c2.y), width: 330, height: 124 } }); meta.arrival.push({ i, opacity: +info.op.toFixed(3), scale: +info.sc.toFixed(3), entering: info.entering, ms: i * 40 });
    }
  }
  fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify({ made: 'node tools/strip.mjs', march: { unit: pick, frames: meta.march, note: 'consecutive frames, 16.667 ms apart, the battle running at 2x' }, arrival: { unit: arrival, frames: meta.arrival, note: 'frames 40 ms apart (the eight cover 280 ms of the 340 ms arrival)' } }, null, 1));
  console.log(JSON.stringify(meta));
} finally { await run.close(); }

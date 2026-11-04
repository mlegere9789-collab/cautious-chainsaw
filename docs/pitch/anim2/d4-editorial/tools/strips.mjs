// tools/strips.mjs - eight-frame MOTION STRIPS from the real page: a march, an arrival, and the name growing out of a mark (the deployment is tools/deploy-strip.mjs).  Frames are driven by studio.step() on a virtual clock (the kit's
// clock is the same one), so the pictures are deterministic.  Each frame is a screenshot of a small window (DPR 2); tools/strips-compose.py joins them with their times.
//   node tools/strips.mjs [--dpr=2] [--out=results/strips-src]     then   python tools/strips-compose.py
import fs from 'node:fs';
import path from 'node:path';
import { serve, launch, open, settle, ROOT } from './lib.mjs';
const a = process.argv.slice(2); const o = Object.fromEntries(a.filter((x) => x.startsWith('--')).map((x) => { const i = x.indexOf('='); return i < 0 ? [x.slice(2), '1'] : [x.slice(2, i), x.slice(i + 1)]; }));
const DPR = +(o.dpr || 2); const OUT = path.resolve(o.out || path.join(ROOT, 'results', 'strips-src')); fs.mkdirSync(OUT, { recursive: true });
const QUIET = encodeURIComponent(JSON.stringify({ 'popup.event.enabled': false, 'popup.story.enabled': false, 'popup.toast.enabled': false, 'popup.crossout.enabled': false, 'popup.banner.enabled': false, 'popup.hints.enabled': false, 'popup.clock.enabled': false, 'popup.legend.enabled': false, 'popup.minimap.enabled': false }));
const srv = await serve(); const b = await launch({ dpr: DPR }); const meta = {};
const stageOff = () => b.page.evaluate(() => { const r = document.getElementById('stage').getBoundingClientRect(); return [r.left, r.top]; });
// per-frame record of every solid mark (key -> x, y on the page, opacity) while stepping, for the jitter count
const REC = [];
const advance = (n, dt) => b.page.evaluate(({ n, dt }) => {
  const S = window.__studio; let T = window.__T || 5000; window.__REC = window.__REC || []; window.__PREV = window.__PREV || new Map();
  for (let i = 0; i < n; i++) {
    T += dt; window.__T = T; S.step(1, dt); const f = S.engine.frame; const cam = S.engine.camera; const prev = window.__PREV; const now = new Map(); const steps = [];
    for (const t of f.tiles) {
      if (t.life !== 'live' || t.opacity < 0.5) continue; const sx = t.x + f.view.dx - (t.hx || 0); const sy = t.y + f.view.dy; const ll = cam.fromScreen(sx, sy); const tx = t.px + f.view.dx; const ty = t.py + f.view.dy; const tl = cam.fromScreen(tx, ty); now.set(t.key, [ll[0], ll[1], tl[0], tl[1]]);
      const p = prev.get(t.key); if (p) { const q = cam.toScreen(p[0], p[1]); const qt = cam.toScreen(p[2], p[3]); steps.push([t.key, Math.hypot(q[0] - sx, q[1] - sy), t.opacity, t.kind, Math.hypot(qt[0] - tx, qt[1] - ty), !!t.displaced]); }      // the step of the drawn mark in screen px with the camera's own motion taken out: its previous place, seen through the camera of this frame
    }
    window.__PREV = now; window.__REC.push({ over: f.overlaps, steps });
  }
  window.__T = T;
}, { n, dt });
const shot = (name, i, x, y, w = 200, h = 112) => b.page.screenshot({ path: path.join(OUT, `${name}-${i}.png`), clip: { x: Math.max(0, Math.min(1440 - w, Math.round(x))), y: Math.max(0, Math.min(900 - h, Math.round(y))), width: w, height: h } });
/** the jitter count of a recorded run: the engine's own overlap count per frame, and the steps of every mark that is solid in two consecutive frames (sudden = 8 px or more and at least 3 times the step before) */
const stats = (rec) => {
  let overlapFrames = 0; let maxStep = 0; let sudden = 0; let ownMotion = 0; const ex = []; let fi = 0; const prevStep = new Map(); const seen = new Set();
  for (const fr of rec) {
    if (fr.over > 0) overlapFrames++; const now = new Set();
    for (const [k, d, op, kind, dTrue, disp] of fr.steps) {
      now.add(k); seen.add(k); if (d > maxStep) maxStep = d; const had = prevStep.has(k); const q = prevStep.get(k) ?? 0;
      if (had && d >= 8 && d >= 3 * Math.max(q, 0.5)) { sudden++; const own = kind === 'leaf' && !disp && Math.abs(d - dTrue) < 1.5; if (own) ownMotion++; if (ex.length < 8) ex.push(`${k} (${kind}${own ? ', the units own motion' : ''}) f${fi} ${d.toFixed(1)}px (was ${q.toFixed(1)}), opacity ${op.toFixed(2)}`); }
      prevStep.set(k, d);
    }
    for (const k of [...prevStep.keys()]) if (!now.has(k)) prevStep.delete(k); fi++;
  }
  return { examples: ex, frames: rec.length, framesWithOverlaps: overlapFrames, marksTracked: seen.size, maxStepPx: +maxStep.toFixed(2), suddenSteps: sudden, ofWhichTheUnitsOwnMotion: ownMotion, suddenStepsOfTheDisplay: sudden - ownMotion };
};
const resetRec = () => b.page.evaluate(() => { window.__REC = []; window.__PREV = new Map(); });
const takeRec = () => b.page.evaluate(() => window.__REC || []);
const camOf = () => b.page.evaluate(() => { const c = window.__studio.engine.camera; return { lng: +c.lng.toFixed(7), lat: +c.lat.toFixed(7), zoom: +c.zoom.toFixed(4) }; });
const camSame = (a, z) => ({ start: a, end: z, identical: JSON.stringify(a) === JSON.stringify(z) });
try {
  if (!o.only || o.only === 'march') {
  // ---- 1. a march: a unit under way at 8x, eight consecutive frames (16.7 ms apart) -----------------------------------------------------------------
  await open(b.page, `scene=carry1&tick=282&zoom=15&style=dispatch-paper&set=${QUIET}`, { steps: 90 });
  await b.page.evaluate(() => { const S = window.__studio; S.engine.transport.setSpeed(8); S.engine.transport.play(); });
  await advance(45, 1000 / 60);
  const pick = await b.page.evaluate(() => {
    const S = window.__studio; const E = S.engine; const f0 = E.frame; const m0 = new Map(f0.tiles.filter((t) => t.life === 'live' && t.kind === 'leaf' && t.solid && t.moving).map((t) => [t.key, [t.x, t.y]]));
    let T = window.__T; T += 1000 / 60; window.__T = T; S.step(1, 1000 / 60); const f1 = E.frame; let best = null;
    for (const t of f1.tiles) { const p = m0.get(t.key); if (!p || t.life !== 'live' || !t.solid) continue; const sr = document.getElementById('stage').getBoundingClientRect(); const gx = t.x + f1.view.dx - (t.hx || 0) + sr.left; const gy = t.y + f1.view.dy + sr.top; if (gx < 120 || gx > innerWidth - 300 || gy < 120 || gy > innerHeight - 260) continue; const d = Math.hypot(t.x - p[0], t.y - p[1]); if (!best || d > best.d) best = { d, short: t.short, key: t.key, gx, gy, dx: t.x - p[0], dy: t.y - p[1] }; }
    return best;
  });
  meta.march = { unit: pick.short, pxPerFrame: +pick.d.toFixed(2), speed: 8, frameMs: 100 };
  const cx = pick.gx - (pick.dx >= 0 ? 36 : 164 + 100); const cy = pick.gy - 84;
  const mc0 = await camOf(); await resetRec(); for (let i = 0; i < 8; i++) { await shot('march', i, cx, cy, 300, 168); await advance(6, 1000 / 60); }
  { meta.march.camera = camSame(mc0, await camOf()); await advance(60, 1000 / 60); meta.march.stats = stats(await takeRec()); }
  }
  if (!o.only || o.only === 'arrival') {
  // ---- 2. an arrival: a unit that appears at its first keyframe: eight frames 80 ms apart, from 125 ms before it appears -------------------------------
  await open(b.page, `scene=fresh2&tick=236&zoom=16&style=dispatch-paper&set=${QUIET}`, { steps: 60 });
  // the unit: 3rd Maine, an infantry regiment whose first keyframe (tick 240) stands 355 m from the nearest other unit (found by tools/ in the data: an arrival with nothing around it)
  const arr = await b.page.evaluate(() => { const E = window.__studio.engine; const u = E.battle.units.get('U-3ME'); const k = u.kf[0]; return { id: u.id, short: u.short, tick: k.tick, lat: k.lat, lng: k.lng }; });
  await b.page.evaluate((q) => { const S = window.__studio; S.engine.transport.pause(); S.engine.transport.seek(q.tick - 0.1, { glide: false }); S.engine.moveTo({ lat: q.lat, lng: q.lng, zoom: 16 }, { glide: false }); }, arr);
  await settle(b.page, 30);
  await b.page.evaluate(() => { window.__studio.engine.transport.setSpeed(1); window.__studio.engine.transport.play(); });
  const so = await stageOff(); const apos0 = await b.page.evaluate((q) => window.__studio.engine.camera.toScreen(q.lng, q.lat), arr); const apos = [apos0[0] + so[0], apos0[1] + so[1]];
  meta.arrival = { unit: arr.short, tick: arr.tick, frameMs: 80, clockStartsTicksBefore: 0.1, firstFrame: 'the first frame at which the mark is visible (opacity 0.06)' };
  await resetRec(); let waited = 0; for (; waited < 400; waited++) { await advance(1, 16); const op = await b.page.evaluate((id) => { const t = window.__studio.engine.frame.tiles.find((q) => q.ids.includes(id) && q.life === 'live'); return t ? t.opacity : 0; }, arr.id); if (op > 0.06) break; }
  const ac0 = await camOf(); meta.arrival.waitedFrames = waited; for (let i = 0; i < 8; i++) { await shot('arrival', i, apos[0] - 60, apos[1] - 56, 240, 112); await advance(5, 16); }
  meta.arrival.camera = camSame(ac0, await camOf()); meta.arrival.stats = stats(await takeRec());
  }
  if (!o.only || o.only === 'growth') {
  // ---- 3. the name growing out of the mark on hover, then the selection ring drawing itself: frames 50 ms apart ---------------------------------------------------
  await open(b.page, `scene=fresh2&tick=556&zoom=16.5&style=dispatch-paper&set=${QUIET}`, { steps: 120 });
  const gp = await b.page.evaluate(() => { const S = window.__studio; const f = S.engine.frame; const t = f.tiles.find((q) => q.life === 'live' && q.kind === 'leaf' && q.short === '53 VA'); const sr = document.getElementById('stage').getBoundingClientRect(); return { id: t.ids[0], x: t.x + f.view.dx - (t.hx || 0) + sr.left, y: t.y + f.view.dy + sr.top }; });
  await b.page.mouse.move(gp.x + 180, gp.y + 90); await advance(10, 16);
  meta.growth = { unit: '53 VA', frameMs: 50 };
  await b.page.mouse.move(gp.x, gp.y, { steps: 1 });
  for (let i = 0; i < 4; i++) { await shot('growth', i, gp.x - 40, gp.y - 56, 280, 112); await advance(3, 16.7); }
  await b.page.mouse.down(); await b.page.mouse.up();
  for (let i = 4; i < 8; i++) { await advance(3, 16.7); await shot('growth', i, gp.x - 40, gp.y - 56, 280, 112); }
  }
  // the deployment strip (a crowd opening into its records, camera still) is filmed by tools/deploy-strip.mjs
  if (b.errors.length) console.log('errors', b.errors.slice(0, 5));
} finally { await b.close(); srv.close(); }
const mp = path.join(OUT, 'meta.json'); const old = fs.existsSync(mp) ? JSON.parse(fs.readFileSync(mp, 'utf8')) : {}; fs.writeFileSync(mp, JSON.stringify({ ...old, ...meta }, null, 1)); console.log(JSON.stringify(meta));

// tools/strips.mjs - eight-frame MOTION STRIPS from the real page: a march, an arrival, and the name growing out of a mark.  Frames are driven by studio.step() on a virtual clock (the kit's
// clock is the same one), so the pictures are deterministic.  Each frame is a screenshot of a small window (DPR 2); tools/strips-compose.py joins them with their times.
//   node tools/strips.mjs [--dpr=2] [--out=results/strips-src]     then   python tools/strips-compose.py
import fs from 'node:fs';
import path from 'node:path';
import { serve, launch, open, settle, ROOT } from './lib.mjs';
const a = process.argv.slice(2); const o = Object.fromEntries(a.filter((x) => x.startsWith('--')).map((x) => { const i = x.indexOf('='); return i < 0 ? [x.slice(2), '1'] : [x.slice(2, i), x.slice(i + 1)]; }));
const DPR = +(o.dpr || 2); const OUT = path.resolve(o.out || path.join(ROOT, 'results', 'strips-src')); fs.mkdirSync(OUT, { recursive: true });
const QUIET = encodeURIComponent(JSON.stringify({ 'popup.event.enabled': false, 'popup.story.enabled': false, 'popup.toast.enabled': false, 'popup.crossout.enabled': false, 'popup.banner.enabled': false, 'popup.hints.enabled': false, 'popup.clock.enabled': false, 'popup.legend.enabled': false, 'popup.minimap.enabled': false }));
const srv = await serve(); const b = await launch({ dpr: DPR }); const meta = {};
const advance = (n, dt) => b.page.evaluate(({ n, dt }) => { const S = window.__studio; let T = window.__T || 5000; for (let i = 0; i < n; i++) { T += dt; window.__T = T; S.step(1, dt); } window.__T = T; }, { n, dt });
const shot = (name, i, x, y) => b.page.screenshot({ path: path.join(OUT, `${name}-${i}.png`), clip: { x: Math.max(0, Math.min(1240, Math.round(x))), y: Math.max(0, Math.min(788, Math.round(y))), width: 200, height: 112 } });
try {
  // ---- 1. a march: a unit under way at 8x, eight consecutive frames (16.7 ms apart) -----------------------------------------------------------------
  await open(b.page, `scene=carry1&tick=282&zoom=15&style=dispatch-paper&set=${QUIET}`, { steps: 90 });
  await b.page.evaluate(() => { const S = window.__studio; S.engine.transport.setSpeed(8); S.engine.transport.play(); });
  await advance(45, 1000 / 60);
  const pick = await b.page.evaluate(() => {
    const S = window.__studio; const E = S.engine; const f0 = E.frame; const m0 = new Map(f0.tiles.filter((t) => t.life === 'live' && t.kind === 'leaf' && t.solid && t.moving).map((t) => [t.key, [t.x, t.y]]));
    let T = window.__T; T += 1000 / 60; window.__T = T; S.step(1, 1000 / 60); const f1 = E.frame; let best = null;
    for (const t of f1.tiles) { const p = m0.get(t.key); if (!p || t.life !== 'live' || !t.solid) continue; const gx = t.x + f1.view.dx - (t.hx || 0); const gy = t.y + f1.view.dy; if (gx < 120 || gx > innerWidth - 300 || gy < 120 || gy > innerHeight - 260) continue; const d = Math.hypot(t.x - p[0], t.y - p[1]); if (!best || d > best.d) best = { d, short: t.short, key: t.key, gx, gy, dx: t.x - p[0], dy: t.y - p[1] }; }
    return best;
  });
  meta.march = { unit: pick.short, pxPerFrame: +pick.d.toFixed(2), speed: 8, frameMs: 16.7 };
  const cx = pick.gx - (pick.dx >= 0 ? 36 : 164); const cy = pick.gy - 56;
  for (let i = 0; i < 8; i++) { await shot('march', i, cx, cy); await advance(1, 1000 / 60); }
  // ---- 2. an arrival: a unit that appears at its first keyframe: eight frames 80 ms apart, from 125 ms before it appears -------------------------------
  await open(b.page, `scene=fresh2&tick=236&zoom=16&style=dispatch-paper&set=${QUIET}`, { steps: 60 });
  // the unit: 3rd Maine, an infantry regiment whose first keyframe (tick 240) stands 355 m from the nearest other unit (found by tools/ in the data: an arrival with nothing around it)
  const arr = await b.page.evaluate(() => { const E = window.__studio.engine; const u = E.battle.units.get('U-3ME'); const k = u.kf[0]; return { id: u.id, short: u.short, tick: k.tick, lat: k.lat, lng: k.lng }; });
  await b.page.evaluate((q) => { const S = window.__studio; S.engine.transport.pause(); S.engine.transport.seek(q.tick - 0.1, { glide: false }); S.engine.moveTo({ lat: q.lat, lng: q.lng, zoom: 16 }, { glide: false }); }, arr);
  await settle(b.page, 30);
  await b.page.evaluate(() => { window.__studio.engine.transport.setSpeed(1); window.__studio.engine.transport.play(); });
  const apos = await b.page.evaluate((q) => window.__studio.engine.camera.toScreen(q.lng, q.lat), arr);
  meta.arrival = { unit: arr.short, tick: arr.tick, frameMs: 80, clockStartsTicksBefore: 0.1 };
  for (let i = 0; i < 8; i++) { await shot('arrival', i, apos[0] - 40, apos[1] - 56); await advance(5, 16); }
  // ---- 3. the name growing out of the mark on hover, then the selection ring drawing itself: frames 50 ms apart ---------------------------------------------------
  await open(b.page, `scene=fresh2&tick=556&zoom=16.5&style=dispatch-paper&set=${QUIET}`, { steps: 120 });
  const gp = await b.page.evaluate(() => { const S = window.__studio; const f = S.engine.frame; const t = f.tiles.find((q) => q.life === 'live' && q.kind === 'leaf' && q.short === '53 VA'); return { id: t.ids[0], x: t.x + f.view.dx - (t.hx || 0), y: t.y + f.view.dy }; });
  await b.page.mouse.move(gp.x + 180, gp.y + 90); await advance(10, 16);
  meta.growth = { unit: '53 VA', frameMs: 50 };
  await b.page.mouse.move(gp.x, gp.y, { steps: 1 });
  for (let i = 0; i < 4; i++) { await shot('growth', i, gp.x - 40, gp.y - 56); await advance(3, 16.7); }
  await b.page.mouse.down(); await b.page.mouse.up();
  for (let i = 4; i < 8; i++) { await advance(3, 16.7); await shot('growth', i, gp.x - 40, gp.y - 56); }
  if (b.errors.length) console.log('errors', b.errors.slice(0, 5));
} finally { await b.close(); srv.close(); }
fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify(meta, null, 1)); console.log(JSON.stringify(meta));

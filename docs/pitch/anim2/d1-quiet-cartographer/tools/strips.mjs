// tools/strips.mjs - the MOTION STRIPS (round 2): eight consecutive pictures of a march, a selection and a deployment, each from ONE fixed camera, each starting at the moment of the change, at 200 percent (the frames are
// DPR 2 screenshots shown at their own pixels).  The frames are real engine frames (the engine stepped by a fixed dt, the skin kit's clock stepped with it), composed by tools/compose-strip.py on a light page.
//   march:   the 11th Mississippi (1 July, 4x) sets off as the clock speeds up: the speed eases in over half a second, the pip follows it, the code stays beside it.  Camera still (centred on the middle of its path).
//   select:  the 71st Pennsylvania at zoom 16.5: a click closes a ring round the pip, the code gives way to the name growing from the same place; the pip does not move, no neighbour moves, nothing is merged.
//   deploy:  nine marks born on Seminary Ridge on 3 July (eight Virginia regiments and a battalion, tick 400): from the frame before they exist, each grows from 86 percent and fades in, its lettering after it.
//   node tools/strips.mjs [--only=march|deploy|select] [--dpr=2]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { open, setScene, shot, args, D1, TMP, stopServer } from './lib.mjs';

const DPR = +(args.dpr || 2); const OUT = path.resolve(args.out || path.join(D1, 'shots', 'round-1')); const FR = path.join(TMP, 'strip-frames'); fs.mkdirSync(FR, { recursive: true });
const STRIPS = [
  { name: 'march', tick: 12, speed: 1, dt: 100, zoom: 16, follow: { unit: 'C-11MS' }, span: 1.1, crop: [420, 250], paused0: true, title: 'A march: the 11th Mississippi sets off, 1 July, the clock easing up to 1x, a picture every 100 ms' },
  { name: 'select', tick: 551, speed: 0, dt: 40, zoom: 16.5, at: [39.8117, -77.2347], select: 'U-82NY', crop: [380, 250], title: 'A selection: the 82nd New York, a picture every 40 ms; the ring closes, the name grows from the code, the pip stands still' },
  { name: 'deploy', tick: 400.0, speed: 1, dt: 50, ramp0: true, zoom: 15.5, at: [39.8211, -77.2522], crop: [460, 270], title: 'A deployment: nine marks arrive on Seminary Ridge, 3 July, tick 400, a picture every 50 ms; each grows and fades in' },
];
for (const st of STRIPS) {
  if (args.only && args.only !== st.name) continue;
  const s = await open({ dpr: DPR, profile: 'strip' });
  try {
    await setScene(s.page, { tick: st.tick, lat: st.at ? st.at[0] : 39.83, lng: st.at ? st.at[1] : -77.28, zoom: st.zoom, safe: false, popups: false, steps: 90 });
    // settle at the starting time, then fix the camera for the whole strip: centred on the middle of the subject's path (march), on the selected pip (select), or on the marks that are about to arrive (deploy)
    const centre = await s.page.evaluate(({ st }) => {
      const S = window.__studio; const E = S.engine; E.transport.pause(); const adv = globalThis.__advance;
      if (st.ramp0) E.tuning.set('time.speedRampMs', 0);
      const goCam = (lat, lng) => E.moveTo({ lat, lng, zoom: st.zoom }, { glide: false, safe: false });
      if (st.follow) { const u = E.battle.units.get(st.follow.unit); const a = E.battle.stateOf(u, st.tick); const b = E.battle.stateOf(u, st.tick + (st.span || 4)); goCam((a.lat + b.lat) / 2, (a.lng + b.lng) / 2); } else goCam(st.at[0], st.at[1]);
      E.transport.seek(st.tick, { glide: false }); if (st.speed) E.transport.setSpeed(st.speed); adv(60, 16.667); E.transport.seek(st.tick, { glide: false }); adv(6, 16.667);
      let f = E.frame; let x = f.view.w / 2; let y = f.view.h / 2; let box = null; if (st.name === 'deploy') { x = 700; y = 350; }      // the nine marks stand within 160 px of here at this camera (round 1's strip, same camera)
      if (st.select) { const t = f.tiles.find((q) => q.ids.includes(st.select) && q.life === 'live'); if (t) { x = t.x + f.view.dx + 120; y = t.y + f.view.dy; } }
      if (st.name === 'deploy') {        // the marks that do not exist yet: play on, take their box, come back to the first picture
        const k0 = new Set(f.tiles.map((t) => t.key)); E.transport.play(); adv(48, 16.667); f = E.frame; const nt = f.tiles.filter((t) => !k0.has(t.key) && t.life === 'live');
        if (false && nt.length) { const xs = nt.map((t) => t.x + f.view.dx); const ys = nt.map((t) => t.y + f.view.dy); box = { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys), n: nt.length }; x = (box.x0 + box.x1) / 2 - 20; y = (box.y0 + box.y1) / 2; }
        E.transport.pause(); E.transport.seek(st.tick, { glide: false }); adv(60, 16.667); E.transport.seek(st.tick, { glide: false }); adv(6, 16.667);
      }
      return { x, y, tau: E.transport.simTau, box };
    }, { st });
    await s.page.evaluate(() => globalThis.__ground.whenIdle(20000)); await s.page.evaluate(() => globalThis.__advance(2, 16.667));
    const w = st.crop[0]; const h = st.crop[1]; const clip = { x: Math.max(0, Math.min(1440 - w, Math.round(centre.x - w / 2))), y: Math.max(80, Math.min(900 - h - 100, Math.round(centre.y - h / 2))), width: w, height: h };
    if (!st.select && !st.paused0) await s.page.evaluate(() => { window.__studio.engine.transport.play(); });
    const info = []; const fine = [];      // info: the 8 pictures; fine: every engine frame (16.7 ms) between and including them, for the jitter count
    const PIPS = `(() => { const E = window.__studio.engine; const fr = E.frame; return fr.tiles.filter((t) => t.life === 'live' && t.opacity >= 0.5 && !t.entering && !t.travelling).map((t) => [t.key, +(t.x - t.ax).toFixed(3), +(t.y - t.ay).toFixed(3)]); })()`;
    const K = Math.max(1, Math.round(st.dt / 16.667));      // engine frames per picture: the strip is a time-lapse (a picture every dt ms); the engine runs at 60 frames per second in between
    for (let i = 0; i < 8; i++) {
      if (st.select && i === 1) await s.page.evaluate((id) => { window.__studio.engine.select(id); }, st.select);
      if (st.paused0 && i === 1) await s.page.evaluate(() => { window.__studio.engine.transport.play(); });
      if (i === 0) { await s.page.evaluate(() => globalThis.__advance(1, 0.001)); fine.push(await s.page.evaluate(PIPS)); }
      else for (let q = 0; q < K; q++) { await s.page.evaluate(() => globalThis.__advance(1, 16.667)); fine.push(await s.page.evaluate(PIPS)); }
      const f = await s.page.evaluate(() => { const E = window.__studio.engine; const fr = E.frame; return { tau: +E.transport.simTau.toFixed(3), births: fr.stats.births, tiles: fr.tiles.filter((t) => t.life === 'live').length, entering: fr.tiles.filter((t) => t.entering).length }; });
      info.push(f); await shot(s.page, path.join(FR, `${st.name}-${i}.png`), { clip });
    }
    // JITTER over every engine frame of the strip (K per picture, 60 per second): the DISPLACEMENT of every solid, settled mark from the true position it stands for, frame to frame (the unit marching and the camera are not counted): a step above 6 px in one frame is a pop, a velocity flip above 0.12 px on both sides is jitter
    { const trk = new Map(); let steps = 0; let reversals = 0; let worst = 0; let samples = 0; const examples = []; for (let i = 0; i < fine.length; i++) for (const [k, dx, dy] of fine[i]) { const q = trk.get(k) || []; q[i] = [dx, dy]; trk.set(k, q); }
      for (const [qk, q] of trk) { let prev = null; let pv = null; for (let i = 0; i < q.length; i++) { if (!q[i]) { prev = null; pv = null; continue; } if (prev) { const vx = q[i][0] - prev[0]; const vy = q[i][1] - prev[1]; samples++; const m = Math.hypot(vx, vy); worst = Math.max(worst, m); if (m > 6) { steps++; examples.push(`${qk} frame ${i} step ${m.toFixed(2)}`); } if (pv) for (const [a, b] of [[vx, pv[0]], [vy, pv[1]]]) if (a * b < 0 && Math.min(Math.abs(a), Math.abs(b)) > 0.12) { reversals++; examples.push(`${qk} frame ${i} reversal ${a.toFixed(2)}/${b.toFixed(2)}`); } pv = [vx, vy]; } prev = q[i]; } }
      const jit = { engineFrames: fine.length, pictures: info.length, marksFollowed: trk.size, samples, steps, reversals, worstStepPx: +worst.toFixed(2), examples: examples.slice(0, 8) }; fs.mkdirSync(path.join(D1, 'results'), { recursive: true }); fs.writeFileSync(path.join(D1, 'results', `strip-${st.name}.json`), JSON.stringify({ title: st.title, ...jit, taus: info.map((f) => f.tau), entering: info.map((f) => f.entering) }, null, 1)); console.log(st.name, 'jitter', JSON.stringify(jit)); }
    fs.writeFileSync(path.join(FR, `${st.name}.json`), JSON.stringify({ title: st.title, dt: st.dt, frames: info, clip }));
    console.log(st.name, JSON.stringify(info.map((f) => f.tau)), 'entering', info.map((f) => f.entering).join(','), s.errors.filter((e) => !/404/.test(e)).length ? 'ERRORS ' + s.errors[0] : 'ok');
  } finally { await s.close(); }
}
await stopServer();
execFileSync('python', [path.join(D1, 'tools', 'compose-strip.py'), FR, OUT, ...(args.only ? [args.only] : [])], { stdio: 'inherit' });

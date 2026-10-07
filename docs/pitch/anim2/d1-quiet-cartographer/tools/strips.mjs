// tools/strips.mjs - the MOTION STRIPS: eight consecutive frames of a march and of a deployment, to show the easing and the arrival (shots/strip-march.png, shots/strip-deploy.png).  The frames are real
// engine frames (the engine stepped by a fixed dt, the skin kit's clock stepped with it), each cropped from a real screenshot at DPR 2, then composed by tools/compose-strip.py.
//   march:   a Confederate regiment (11th Mississippi) on the road in from the west on the morning of 1 July, 4x speed, 100 ms between frames, the camera still.
//   select:  one unit is selected at close zoom and the same mark grows its name and strength hairline, the ring easing in.
//   deploy:  the Confederate guns going into line on Seminary Ridge on the morning of 3 July (tick 400: 14 first keyframes within 250 m), 1x speed, 50 ms between frames, from 0.1 tick before they appear.
//   node tools/strips.mjs [--only=march|deploy|select] [--dpr=2]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { open, setScene, shot, args, D1, TMP, stopServer } from './lib.mjs';

const DPR = +(args.dpr || 2); const OUT = path.join(D1, 'shots'); const FR = path.join(TMP, 'strip-frames'); fs.mkdirSync(FR, { recursive: true });
const STRIPS = [
  { name: 'march', tick: 12, speed: 4, dt: 100, zoom: 15, follow: { unit: 'C-11MS' }, crop: [560, 260], title: 'A march: 11th Mississippi, 1 July, 4x speed, a frame every 100 ms' },
  { name: 'select', tick: 551, speed: 0, dt: 40, zoom: 15.5, at: [39.8117, -77.2347], select: 'C-53VA', crop: [560, 190], title: 'A selection: the 53rd Virginia grows its name and its strength hairline, in place, a frame every 40 ms' },
  { name: 'deploy', tick: 399.88, speed: 1, dt: 50, ramp0: true, zoom: 15.5, at: [39.8211, -77.2522], crop: [560, 300], title: 'A deployment: the guns go into line on Seminary Ridge, 3 July, tick 400, a frame every 50 ms' },
];
for (const st of STRIPS) {
  if (args.only && args.only !== st.name) continue;
  const s = await open({ dpr: DPR, profile: 'strip' });
  try {
    await setScene(s.page, { tick: st.tick, lat: st.at ? st.at[0] : 39.83, lng: st.at ? st.at[1] : -77.28, zoom: st.zoom, safe: false, popups: false, steps: 90 });
    // settle at the starting time, then centre on the subject
    const centre = await s.page.evaluate(({ st }) => {
      const S = window.__studio; const E = S.engine; E.transport.pause();
      if (st.follow) { const u = E.battle.units.get(st.follow.unit); const tauMid = st.tick + 0.5 * 8 * st.dt / 1000 * 2 * st.speed; const p = E.battle.stateOf(u, tauMid); E.moveTo({ lat: p.lat, lng: p.lng, zoom: st.zoom }, { glide: false, safe: false }); }
      else E.moveTo({ lat: st.at[0], lng: st.at[1], zoom: st.zoom }, { glide: false, safe: false });
      if (st.ramp0) E.tuning.set('time.speedRampMs', 0); E.transport.seek(st.tick, { glide: false }); if (st.speed) E.transport.setSpeed(st.speed); globalThis.__advance(60, 16.667); E.transport.seek(st.tick, { glide: false });      // (paused: the clock does not move while the camera and the marks settle)
      globalThis.__advance(6, 16.667); const f = E.frame;
      let x = f.view.w / 2; let y = f.view.h / 2; if (st.select) { const t = f.tiles.find((q) => q.ids.includes(st.select) && q.life === 'live'); if (t) { x = t.x + f.view.dx; y = t.y + f.view.dy; } } if (st.follow) { const t = f.tiles.find((q) => q.ids.includes(st.follow.unit) && q.life === 'live'); if (t) { x = t.x + f.view.dx; y = t.y + f.view.dy; } }
      return { x, y, tau: E.transport.simTau };
    }, { st });
    await s.page.evaluate(() => globalThis.__ground.whenIdle(20000)); await s.page.evaluate(() => globalThis.__advance(2, 16.667));
    const w = st.crop[0]; const h = st.crop[1]; const clip = { x: Math.max(0, Math.min(1440 - w, Math.round(centre.x - w / 2 + (st.follow ? 120 : st.select ? 150 : 0)))), y: Math.max(70, Math.min(900 - h - 190, Math.round(centre.y - h / 2))), width: w, height: h };
    if (!st.follow && !st.select) { clip.x = Math.round(720 - w / 2); clip.y = Math.round(330 - h / 2); }
    if (!st.select) await s.page.evaluate(() => { window.__studio.engine.transport.play(); });
    const info = [];
    for (let i = 0; i < 8; i++) {
      if (st.select && i === 1) await s.page.evaluate((id) => { window.__studio.engine.select(id); }, st.select);
      if (i > 0) await s.page.evaluate((dt) => globalThis.__advance(1, dt), st.dt);
      else await s.page.evaluate(() => globalThis.__advance(1, 0.001));
      const f = await s.page.evaluate(() => { const E = window.__studio.engine; const fr = E.frame; return { tau: +E.transport.simTau.toFixed(3), births: fr.stats.births, tiles: fr.tiles.filter((t) => t.life === 'live').length, entering: fr.tiles.filter((t) => t.entering).length }; });
      info.push(f); await shot(s.page, path.join(FR, `${st.name}-${i}.png`), { clip });
    }
    fs.writeFileSync(path.join(FR, `${st.name}.json`), JSON.stringify({ title: st.title, dt: st.dt, frames: info, clip }));
    console.log(st.name, JSON.stringify(info.map((f) => f.tau)), 'entering', info.map((f) => f.entering).join(','), s.errors.filter((e) => !/404/.test(e)).length ? 'ERRORS ' + s.errors[0] : 'ok');
  } finally { await s.close(); }
}
await stopServer();
execFileSync('python', [path.join(D1, 'tools', 'compose-strip.py'), FR, OUT, ...(args.only ? [args.only] : [])], { stdio: 'inherit' });

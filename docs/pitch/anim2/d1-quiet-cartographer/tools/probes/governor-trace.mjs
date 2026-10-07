// tools/probes/governor-trace.mjs - real Chrome, real time: trace the solve-cadence governor (E.autoEvery()) and the frame interval while the whole field plays, to see whether the cadence flaps.
//   node tools/probes/governor-trace.mjs [--secs=30] [--speed=4] [--dpr=1] [--cpu=1] [--place=whole-field]
import { open, args, sleep, stopServer } from '../lib.mjs';
const SECS = +(args.secs || 30); const SPEED = +(args.speed || 4); const DPR = +(args.dpr || 1); const CPU = +(args.cpu || 1);
const H = { 'whole-field': { tick: 612, lat: 39.81592, lng: -77.23677, zoom: 13.5 }, 'the-angle': { tick: 550, lat: 39.8117, lng: -77.2347, zoom: 15 } }[args.place || 'whole-field'];
const s = await open({ w: 1440, h: 900, dpr: DPR, cpu: CPU, manual: false, profile: 'gov' });
try {
  await s.page.evaluate(() => { const S = window.__studio; S.engine.tuning.set('popup.enabled', false); window.__ints = []; window.__draw = []; let last = 0; const f = (t) => { if (last) window.__ints.push(t - last); window.__draw.push(S.renderer.stats.drawMs); last = t; requestAnimationFrame(f); }; requestAnimationFrame(f); });
  await sleep(1500);
  await s.page.evaluate(({ H, SPEED }) => { const E = window.__studio.engine; E.transport.pause(); E.select(null); E.transport.seek(H.tick, { glide: false }); E.moveTo({ lat: H.lat, lng: H.lng, zoom: H.zoom }, { glide: false, safe: false }); E.transport.setSpeed(SPEED); }, { H, SPEED });
  await sleep(1800); await s.page.evaluate(() => globalThis.__ground.whenIdle(20000));
  await s.page.evaluate(() => { window.__ints.length = 0; window.__trace = []; const E = window.__studio.engine; window.__tr = setInterval(() => { const a = window.__ints.splice(0); const dr = window.__draw.splice(0); const m = E.metricsOf('after').summary(); E.metricsOf('after').reset(); window.__trace.push([E.autoEvery(), +(a.reduce((x, y) => x + y, 0) / Math.max(1, a.length)).toFixed(1), +Math.max(0, ...a).toFixed(0), +(+m.engineMsMean).toFixed(1), +(dr.reduce((x, y) => x + y, 0) / Math.max(1, dr.length)).toFixed(1), E.frame.tiles.length]); }, 1000); window.__studio.engine.transport.play(); });
  await sleep(SECS * 1000);
  const tr = await s.page.evaluate(() => { clearInterval(window.__tr); window.__studio.engine.transport.pause(); return window.__trace; });
  console.log('per second: cadence | mean frame ms | worst frame ms | engine ms | draw ms | marks'); console.log(tr.map((r) => r.join('|')).join('  '));
  const flips = tr.filter((r, i) => i && r[0] !== tr[i - 1][0]).length; console.log('cadence changes:', flips, ' seconds at cadence 1:', tr.filter((r) => r[0] === 1).length, 'of', tr.length);
} finally { await s.close(); await stopServer(); }

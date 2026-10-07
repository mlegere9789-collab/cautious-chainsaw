// tools/pacing.mjs - frame pacing and per-frame displacement of THIS skin on the real ground, in real Chrome in real time (the page's own animation loop, not stepped), AFTER only (the production
// reproduction is the prototype's job, docs/pitch/anim/prototype/README.md section 4.1): the three hardest places x 1x and 4x, popups off, with the camera still and then with the camera moving.
// Every number is read from the page's metrics recorder (the code behind the live overlay) plus an independent rAF interval log taken inside the page.  Jitter here = sudden jumps and the largest
// one-frame step of any mark, overlap frames, unrepresented units, and the rAF intervals.
//   node tools/pacing.mjs [--places=whole-field,the-angle] [--secs=8] [--dpr=1] [--cpu=1] [--speeds=1,4] [--viewport=1440x900] [--out=results/pacing-dpr1.json]
import fs from 'node:fs';
import path from 'node:path';
import { open, args, sleep, D1, stopServer } from './lib.mjs';

const SECS = +(args.secs || 8); const DPR = +(args.dpr || 1); const CPU = +(args.cpu || 1); const SPEEDS = (args.speeds || '1,4').split(',').map(Number); const [VW, VH] = (args.viewport || '1440x900').split('x').map(Number);
const OUT = path.resolve(args.out || path.join(D1, 'results', `pacing-${VW}x${VH}-dpr${DPR}${CPU > 1 ? '-cpu' + CPU : ''}.json`));
const HOT_ALL = [{ id: 'cemetery-hill', tick: 340, lat: 39.8189, lng: -77.2262, zoom: 14 }, { id: 'rose-woods', tick: 287, lat: 39.7994, lng: -77.2417, zoom: 14 }, { id: 'the-angle', tick: 550, lat: 39.8117, lng: -77.2347, zoom: 15 }, { id: 'whole-field', tick: 612, lat: 39.81592, lng: -77.23677, zoom: 13.5 }];
const HOT = args.places ? HOT_ALL.filter((h) => args.places.split(',').includes(h.id)) : HOT_ALL;
const pct = (a, p) => { const b = [...a].sort((x, y) => x - y); return b.length ? b[Math.min(b.length - 1, Math.floor(p * (b.length - 1) + 0.5))] : 0; };
const s = await open({ w: VW, h: VH, dpr: DPR, cpu: CPU, manual: false, profile: 'pace', mobile: VW < 700 });
const rows = [];
try {
  await s.page.evaluate(() => { const S = window.__studio; S.engine.tuning.set('popup.enabled', false); window.__ints = []; let last = 0; const f = (t) => { if (last) window.__ints.push(t - last); last = t; requestAnimationFrame(f); }; requestAnimationFrame(f); });
  await sleep(1500);
  for (const H of HOT) for (const speed of SPEEDS) for (const cam of ['still', 'moving']) {
    await s.page.evaluate(({ H }) => { const E = window.__studio.engine; E.transport.pause(); E.select(null); E.transport.seek(H.tick, { glide: false }); E.moveTo({ lat: H.lat, lng: H.lng, zoom: H.zoom }, { glide: false, safe: false }); }, { H });
    await sleep(1800); await s.page.evaluate(() => globalThis.__ground.whenIdle(20000));
    await s.page.evaluate(({ speed, cam, H }) => { const E = window.__studio.engine; E.metricsOf('after').reset(); window.__ints.length = 0; E.transport.setSpeed(speed); E.transport.play(); if (cam === 'moving') { let n = 0; window.__pan = setInterval(() => { n++; E.panBy(Math.sin(n / 20) * 6, Math.cos(n / 27) * 4); if (n % 90 === 0) E.zoomTo(H.zoom + (n % 180 === 0 ? 0.6 : -0.4)); }, 16); } }, { speed, cam, H });
    await sleep(SECS * 1000);
    const r = await s.page.evaluate(() => { clearInterval(window.__pan); const E = window.__studio.engine; E.transport.pause(); const m = E.metricsOf('after').summary(); const f = E.frame; return { summary: m, tick: f.tick, tiles: f.tiles.length, onField: f.onField, ints: window.__ints.slice() }; });
    const ints = r.ints; const m = r.summary;
    const row = { place: H.id, zoom: H.zoom, speed, camera: cam, seconds: SECS, rafFrames: ints.length, rafFps: +(1000 / (ints.reduce((a, b) => a + b, 0) / Math.max(1, ints.length))).toFixed(1), rafP50: +pct(ints, 0.5).toFixed(2), rafP95: +pct(ints, 0.95).toFixed(2), rafP99: +pct(ints, 0.99).toFixed(2), rafMax: +Math.max(0, ...ints).toFixed(1), rafOver20Pct: +(100 * ints.filter((x) => x > 20).length / Math.max(1, ints.length)).toFixed(1), ...Object.fromEntries(['frames', 'fpsMean', 'dtMsP95', 'engineMsMean', 'tilesMean', 'jumpsPerSec', 'jumpsSolidPerSec', 'hopsPerSec', 'maxStepPx', 'overlapFrames', 'overlapPairs', 'unrepresentedUnitFrames', 'blinksPerSec', 'framesOver20msPct'].map((k) => [k, m[k] == null ? null : +(+m[k]).toFixed(2)])), endTick: r.tick, marks: r.tiles, onField: r.onField };
    rows.push(row); console.log(`${H.id.padEnd(13)} x${speed} cam ${cam.padEnd(6)} raf ${row.rafFps} fps p95 ${row.rafP95} ms >20ms ${row.rafOver20Pct}% | engine ${row.engineMsMean} ms | jumps/s ${row.jumpsPerSec} (solid ${row.jumpsSolidPerSec}) maxStep ${row.maxStepPx}px | overlap frames ${row.overlapFrames} unrep ${row.unrepresentedUnitFrames}`);
  }
  const out = { generated: new Date().toISOString(), viewport: [VW, VH], dpr: DPR, cpuThrottle: CPU, secondsPerRun: SECS, ua: await s.page.evaluate(() => navigator.userAgent), errors: s.errors.filter((e) => !/404/.test(e)), requests: s.requests, rows };
  fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(out, null, 1)); console.log('errors', out.errors.length, 'requests', s.requests.length, '->', path.relative(process.cwd(), OUT));
} finally { await s.close(); await stopServer(); }

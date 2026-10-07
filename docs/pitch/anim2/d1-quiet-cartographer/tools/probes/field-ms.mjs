// tools/probes/field-ms.mjs - milliseconds per frame (step + draw) in real Chrome for the whole field at zoom 13.5 under a few settings of the layout dials (solveEvery fixed at 1, camera still, 4x playback).
import { open, setScene, stopServer } from '../lib.mjs';
const s = await open({ dpr: 1, profile: 'fieldms', port: 9846 });
try {
  await setScene(s.page, { tick: 612, lat: 39.81592, lng: -77.23677, zoom: 13.5, safe: false, popups: false, steps: 40 });
  const res = await s.page.evaluate(() => { const S = window.__studio; const E = S.engine; const out = []; E.tuning.set('layout.solveEvery', '1'); E.transport.setSpeed(4); E.transport.play();
    for (const [label, set] of [['warm-up (default)', {}], ['dMax 56 kCap 60 (default)', {}], ['dMax 56 kCap 40', { 'layout.kCap': 40 }], ['dMax 56 kCap 35', { 'layout.kCap': 35 }], ['dMax 48 kCap 35', { 'layout.dMaxPx': 48, 'layout.kCap': 35 }], ['dMax 48 kCap 60', { 'layout.dMaxPx': 48, 'layout.kCap': 60 }], ['dMax 40 kCap 60', { 'layout.dMaxPx': 40, 'layout.kCap': 60 }]]) {
      E.tuning.set('layout.dMaxPx', 56); E.tuning.set('layout.kCap', 60); for (const [k, v] of Object.entries(set)) E.tuning.set(k, v); E.transport.seek(612, { glide: false }); E.transport.setSpeed(4); E.transport.play(); globalThis.__advance(80);
      let t = 0; let d = 0; const N = 200; for (let i = 0; i < N; i++) { const t0 = performance.now(); globalThis.__advance(1); t += performance.now() - t0; d += S.renderer.stats.drawMs; }
      out.push({ label, frameMs: +(t / N).toFixed(1), drawMs: +(d / N).toFixed(1), marks: E.frame.tiles.length }); }
    return out; });
  for (const r of res) console.log(JSON.stringify(r));
} finally { await s.close(); await stopServer(); }

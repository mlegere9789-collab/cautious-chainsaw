// One benchmark run: one candidate, one configuration. The runner (../run.mjs) reads window.__phase and window.__result.
import { cfg, dpr, loadScene, Timeline, Cam, pct, mean } from './lib.js';

const group = cfg.cand.startsWith('mbx-') ? 'mbx' : cfg.cand.startsWith('gl') ? 'gl' : '2d';
const loadScript = (src) => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });

async function main() {
  window.__phase = 'init';
  const host = document.getElementById('host'); host.style.width = cfg.W + 'px'; host.style.height = cfg.H + 'px';
  const scene = await loadScene(cfg.n), tl = new Timeline(scene), cam = new Cam(cfg.W, cfg.H);
  if (group === 'mbx') await loadScript('/vendor/mapbox-gl.js');
  const env = { tl, host, W: cfg.W, H: cfg.H, dpr, cam, jsMs: [], measuring: false, running: true, sec: 0, canvasBytes: 0 };
  const cand = await (await import(`./cand-${group}.js`)).create(env, cfg.cand);
  const upd = [], draw = [], iv = []; let t0 = null, last = 0, frames = 0;
  const rate = 2 * cfg.speed;                                                      // base speed: 1 tick per 500 ms
  function loop(now) {
    if (t0 === null) { t0 = now; last = now; window.__phase = 'warm'; }
    const fixed = cfg.v.includes('fixed');                                   // parity runs: one frozen instant (tick 620, t = 1 s), so two renderers draw the same frame
    const el = fixed ? 1 + (now - t0) / 1e9 : (now - t0) / 1000, dt = now - last; last = now; env.sec = el;
    const simT = fixed ? 620 : 450 + ((el * rate) % 225); cam.at(fixed ? 1 : el);
    const a = performance.now(); tl.stateAt(simT); const b = performance.now();
    if (env.map) env.map.jumpTo({ center: [cam.lng, cam.lat], zoom: cam.zoom });
    cand.frame(simT, cam, el); const c = performance.now();
    if ((now - t0) / 1000 >= cfg.warm) {
      if (!env.measuring) { env.measuring = true; window.__phase = 'measure'; }
      iv.push(dt); upd.push(b - a); if (!cand.selfTimed) draw.push(c - b); frames++;
    }
    if ((now - t0) / 1000 < cfg.warm + cfg.sec) requestAnimationFrame(loop); else finish();
  }
  function finish() {
    env.running = false; env.measuring = false;
    const X = new Float64Array(tl.n), Y = new Float64Array(tl.n); cam.projectAll(tl, X, Y); let vis = 0;
    for (let j = 0; j < tl.nAlive; j++) { const i = tl.alive[j]; if (X[i] > -60 && X[i] < cfg.W + 60 && Y[i] > -30 && Y[i] < cfg.H + 30) vis++; }
    const drawMs = cand.selfTimed ? env.jsMs : draw, tot = iv.reduce((x, y) => x + y, 0);
    const st = (a) => ({ mean: +mean(a).toFixed(3), p50: +pct(a, .5).toFixed(3), p95: +pct(a, .95).toFixed(3), p99: +pct(a, .99).toFixed(3), max: +Math.max(0, ...a).toFixed(3) });
    window.__result = {
      cand: cfg.cand, n: cfg.n, W: cfg.W, H: cfg.H, dpr, zoom: cfg.zoom, speed: cfg.speed, frames, seconds: +(tot / 1000).toFixed(2), fps: +(frames / (tot / 1000)).toFixed(1),
      interval: st(iv), over20: iv.filter((x) => x > 20).length, over33: iv.filter((x) => x > 33.4).length, over50: iv.filter((x) => x > 50).length,
      updMs: st(upd), drawMs: st(drawMs), alive: tl.nAlive, visible: vis, real: scene.real,
      atlasMB: env.atlasBytes ? +(env.atlasBytes() / 1048576).toFixed(1) : 0, atlasUsedMB: env.atlasUsed ? +(env.atlasUsed() * 4 / 1048576).toFixed(1) : 0, canvasMB: +((env.canvasBytes || 0) / 1048576).toFixed(1), spriteMisses: env.spriteMisses ? env.spriteMisses() : 0,
      dbg: env.dbg || null, stale: env.stale && env.stale.length ? st(env.stale) : null, setCalls: env.disp ? env.disp.sets : null,
      gl: (() => { try { const c = document.createElement('canvas').getContext('webgl2'); const e = c.getExtension('WEBGL_debug_renderer_info'); return e ? c.getParameter(e.UNMASKED_RENDERER_WEBGL) : '?'; } catch (e) { return 'none'; } })(),
    };
    window.__phase = 'done';
  }
  requestAnimationFrame(loop);
}
main().catch((e) => { window.__error = String(e && e.stack || e); window.__phase = 'error'; });

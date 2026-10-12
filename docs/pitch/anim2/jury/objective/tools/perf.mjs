// perf.mjs - draw time per frame at the densest tick, measured in real Chrome (run ALONE: nothing else heavy may run).
//   node perf.mjs [--dir=d1] [--sets=dpr2cpu1,dpr2cpu4,dpr1cpu1]      writes results/perf.json
// Three readings per view:
//   draw_js    renderer.draw() JS time of every real-time frame (a wrapper around the page's own renderer; the page runs its own animation loop; the clock plays across the densest tick)
//   pacing     requestAnimationFrame intervals of that real-time run (what the viewer feels: includes raster and compositing backpressure)
//   flush      renderer.draw() on a still frame followed by a forced read-back of one pixel (so the canvas work really finished): the cost of drawing the frame, in isolation
//   step       engine.step() time (layout + interpolation) of every real-time frame
import fs from 'node:fs';
import path from 'node:path';
import { serve, launch, openDir, DIRS, HERE } from './lib.mjs';
const args = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => { const i = a.indexOf('='); return i < 0 ? [a.slice(2), '1'] : [a.slice(2, i), a.slice(i + 1)]; }));
const ANGLE = { lat: 39.8117, lng: -77.2347 }; const FIELD = { lat: 39.81592, lng: -77.23677 };
const VIEWS = [['field-z13.5', FIELD, 13.5], ['angle-z15', ANGLE, 15], ['angle-z16.5', ANGLE, 16.5]];
const SETS = { dpr2cpu1: { dpr: 2, cpu: 1 }, dpr2cpu4: { dpr: 2, cpu: 4 }, dpr1cpu1: { dpr: 1, cpu: 1 } };
const sets = (args.sets || 'dpr2cpu1,dpr2cpu4,dpr1cpu1').split(',');
const configs = [['d1', 'night'], ['d2', 'default'], ['d3', 'default'], ['d4', 'paper'], ['d1', 'day'], ['d4', 'aerial']].filter(([d]) => !args.dir || args.dir.split(',').includes(d));
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p / 100 * s.length))] : null; };
const stat = (a) => ({ n: a.length, med: q(a, 50), p95: q(a, 95), max: a.length ? Math.max(...a) : null, mean: a.length ? a.reduce((x, y) => x + y, 0) / a.length : null });
await serve(); let densest = null; let env = null;
const ROWS = path.join(HERE, 'results', process.env.PERF_ROWS || 'perf-rows.jsonl'); fs.mkdirSync(path.join(HERE, 'results'), { recursive: true });
const done = new Set(); const out = []; if (fs.existsSync(ROWS)) for (const l of fs.readFileSync(ROWS, 'utf8').split(String.fromCharCode(10)).filter(Boolean)) { const r = JSON.parse(l); out.push(r); done.add(`${r.dir}-${r.look}-${r.set}`); if (r._densest) densest = r._densest; if (r._env) env = r._env; }
for (const setName of sets) {
  const { dpr, cpu } = SETS[setName];
  for (const [d, look] of configs) {
    if (done.has(`${d}-${look}-${setName}`)) continue;
    let attempt = 0; let ok = false;
    while (!ok && attempt++ < 3) {
    const b = await launch({ dpr, cpu, profile: `perf-${d}-${look}-${setName}-${attempt}` }); const rowsHere = [];
    try {
      // ---- still frames (manual page) ----
      await openDir(b.page, d, look); await b.page.evaluate(() => { window.__studio.engine.tuning.set('popup.enabled', false); });
      if (!env) env = await b.page.evaluate(() => { const c = document.createElement('canvas'); const gl = c.getContext('webgl'); const e = gl && gl.getExtension('WEBGL_debug_renderer_info'); return { ua: navigator.userAgent, cores: navigator.hardwareConcurrency, gl: e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : null }; });
      const dn = densest ? densest : await b.page.evaluate(() => { const S = window.__studio; const E = S.engine; let best = { n: 0, tick: 0 }; const all = []; E.transport.pause(); E.select(null); for (let tk = 1; tk <= 675; tk += 1) { E.transport.seek(tk, { glide: false }); window.__adv(1, 16.7); const n = E.frame.onField; all.push(n); if (n > best.n) best = { n, tick: tk }; } return { best, max: Math.max(...all), ticksAtMax: all.map((n, i) => (n === Math.max(...all) ? i + 1 : 0)).filter(Boolean).length }; });
      if (!densest) densest = dn; const tick = dn.best.tick;
      const stills = {};
      for (const [vn, pos, zoom] of VIEWS) {
        stills[vn] = await b.page.evaluate(async ({ tick, pos, zoom }) => {
          const S = window.__studio; const E = S.engine; E.transport.pause(); E.transport.seek(tick, { glide: false }); E.moveTo({ lat: pos.lat, lng: pos.lng, zoom }, { glide: false, safe: true }); window.__adv(40, 50); window.__adv(150, 16.7);
          const f = E.frame; const o = S.lastOut || {}; const ctx = document.getElementById('map').getContext('2d'); const arg = { popupFx: o.fx || null, mapRect: o.mapRect || null, toneColors: S.layer.toneColors ? S.layer.toneColors() : null };
          for (let i = 0; i < 20; i++) { S.renderer.draw(f, arg); ctx.getImageData(0, 0, 1, 1); }
          const sk = E.kernel.skins.get(E.tok('skin.id')).draw; const orig = { ...sk }; for (const k of ['tile', 'label', 'pin', 'leader', 'hull', 'shadow']) if (orig[k]) sk[k] = () => undefined;
          for (let i = 0; i < 10; i++) { S.renderer.draw(f, arg); ctx.getImageData(0, 0, 1, 1); } const gl = []; for (let i = 0; i < 100; i++) { const t0 = performance.now(); S.renderer.draw(f, arg); ctx.getImageData(0, 0, 1, 1); gl.push(performance.now() - t0); }
          for (const k of Object.keys(orig)) sk[k] = orig[k];
          const js = []; const fl = []; for (let i = 0; i < 200; i++) { const t0 = performance.now(); S.renderer.draw(f, arg); const t1 = performance.now(); ctx.getImageData(0, 0, 1, 1); const t2 = performance.now(); js.push(t1 - t0); fl.push(t2 - t0); }
          const live = f.tiles.filter((t) => t.life === 'live' && t.opacity > 0.02); return { js, fl, gl, tiles: live.length, onField: f.onField, dpr: S.renderer.dpr };
        }, { tick, pos, zoom });
      }
      await b.page.close().catch(() => {});
      // ---- real-time play across the densest tick (the page's own loop) ----
      const page2 = await b.ctx.newPage(); if (cpu > 1) { const cdp2 = await b.ctx.newCDPSession(page2); await cdp2.send('Emulation.setCPUThrottlingRate', { rate: cpu }); }
      await page2.goto(`http://127.0.0.1:9960/${DIRS[d].html}?${DIRS[d].base.replace('&manual=1', '')}${DIRS[d].looks[look] ? '&' + DIRS[d].looks[look] : ''}`);
      await page2.waitForFunction(() => window.__studio && window.__studio.ready, null, { timeout: 90000 });
      for (const [vn, pos, zoom] of VIEWS) {
        const r = await page2.evaluate(async ({ tick, pos, zoom }) => {
          const S = window.__studio; const E = S.engine; E.tuning.set('popup.enabled', false); E.transport.pause(); E.select(null); E.transport.seek(tick - 12, { glide: false }); E.moveTo({ lat: pos.lat, lng: pos.lng, zoom }, { glide: false, safe: true });
          await new Promise((res) => setTimeout(res, 1500));
          const draw = []; const step = []; const rd = S.renderer.draw; const es = E.step;
          S.renderer.draw = function (...a) { const t0 = performance.now(); const r = rd.apply(this, a); draw.push(performance.now() - t0); return r; };
          E.step = function (...a) { const t0 = performance.now(); const r = es.apply(this, a); step.push(performance.now() - t0); return r; };
          E.transport.setSpeed(4); E.transport.play();
          const iv = []; let last = performance.now(); let ticks = []; const T0 = last; const tk0 = E.frame.tick;
          await new Promise((res) => { const f = (now) => { iv.push(now - last); last = now; if (now - T0 < 7000) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
          const tk1 = E.frame.tick; E.transport.pause(); S.renderer.draw = rd; E.step = es; E.transport.setSpeed(1);
          return { draw, step, iv: iv.slice(5), tk0, tk1, frames: iv.length };
        }, { tick, pos, zoom });
        const iv = r.iv; const over = (lim) => iv.filter((x) => x > lim).length / Math.max(1, iv.length);
        const st = stills[vn];
        rowsHere.push({ dir: d, look, set: setName, dpr, cpu, view: vn, tick, tiles: st.tiles, onField: st.onField, draw_flush: stat(st.fl), ground_only_flush: stat(st.gl), draw_js_still: stat(st.js), play: { frames: r.frames, ticks: [r.tk0, r.tk1], draw_js: stat(r.draw), step_ms: stat(r.step), pacing_ms: stat(iv), over20ms: over(20), over33ms: over(33.4), fps: 1000 / (iv.reduce((a, c) => a + c, 0) / iv.length) } });
        const lr = rowsHere[rowsHere.length - 1]; console.log(d, look, setName, vn, `tiles ${st.tiles}`, `flush med ${lr.draw_flush.med.toFixed(2)} p95 ${lr.draw_flush.p95.toFixed(2)}`, `play draw med ${lr.play.draw_js.med.toFixed(2)} p95 ${lr.play.draw_js.p95.toFixed(2)}`, `fps ${lr.play.fps.toFixed(1)}`);
      }
      rowsHere[0]._densest = densest; rowsHere[0]._env = env; for (const r of rowsHere) { out.push(r); fs.appendFileSync(ROWS, JSON.stringify(r) + String.fromCharCode(10)); } ok = true;
    } catch (e) { console.log('RETRY', d, look, setName, attempt, String(e.message).slice(0, 120)); } finally { await b.close().catch(() => {}); }
    }
  }
}
fs.mkdirSync(path.join(HERE, 'results'), { recursive: true });
fs.writeFileSync(path.join(HERE, 'results', args.dir ? `perf-${args.dir}.json` : 'perf.json'), JSON.stringify({ densest, env, rows: out }, null, 1));
process.exit(0);

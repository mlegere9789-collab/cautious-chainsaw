// Page entry: loads terrain + world, creates the renderer (?api=webgpu|webgl2), free-fly camera, HUD, and the window.bench API used by tools/run-bench.mjs.
import { loadTerrain, buildWorld } from './world.mjs';
import { Camera, FlyControls } from './camera.mjs';
import { D2R } from './math.mjs';
const Q = new URLSearchParams(location.search); const api = Q.get('api') || 'webgpu';
const canvas = document.getElementById('c'), hud = document.getElementById('hud'), errEl = document.getElementById('err');
const tNav = performance.now();
const state = { simT: 10, paused: false, hud: true, frames: [], shot: Q.get('shot') || 'ridge' };
window.bench = { ready: false, state };
const fail = (e) => { console.error(e); errEl.textContent = 'ERROR: ' + (e.stack || e); window.bench.error = String(e.stack || e); };
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
try {
  const T = await loadTerrain('./'); const world = buildWorld(T, { total: +Q.get('soldiers') || 165000, gunRate: +Q.get('gunRate') || 1 });
  const tWorld = performance.now();
  const cam = new Camera(); const ctl = new FlyControls(cam, canvas, T);
  const sh = world.show; const L = sh.line; const f = [Math.sin(L.heading), Math.cos(L.heading)], r = [Math.cos(L.heading), -Math.sin(L.heading)];
  const g = (x, z) => T.h(x, z);
  const shots = {
    overview: () => ({ pos: [L.x + 700, 1900, L.z + 1600], look: [L.x - 400, 0, L.z - 300], fov: 55 }),
    ridge: () => ({ pos: [L.x + f[0] * -90 + r[0] * 0, g(L.x, L.z) + 55, L.z + f[1] * -90 + r[1] * 0 - 0], look: [L.x + f[0] * 280, g(L.x, L.z) + 5, L.z + f[1] * 280], fov: 62 }),
    line: () => ({ pos: [L.x + f[0] * 16 - r[0] * 26, g(L.x, L.z) + 1.7, L.z + f[1] * 16 - r[1] * 26], look: [L.x - f[0] * 2 + r[0] * 4, g(L.x, L.z) + 1.3, L.z - f[1] * 2 + r[1] * 4], fov: 62 }),
    battery: () => { const g0 = world.guns[0], gf = [Math.sin(g0[2]), Math.cos(g0[2])], gr = [Math.cos(g0[2]), -Math.sin(g0[2])]; return { pos: [g0[0] + gf[0] * 13 - gr[0] * 11, g(g0[0], g0[1]) + 1.9, g0[1] + gf[1] * 13 - gr[1] * 11], look: [g0[0] - gf[0] * 1 + gr[0] * 6, g(g0[0], g0[1]) + 1.3, g0[1] - gf[1] * 1 + gr[1] * 6], fov: 62 }; },
    cavalry: () => ({ pos: [sh.cav.x + 22, g(sh.cav.x, sh.cav.z) + 2.2, sh.cav.z + 22], look: [sh.cav.x - 20, g(sh.cav.x, sh.cav.z) + 1.5, sh.cav.z - 6], fov: 58, follow: 'cav' }),
    ground: () => ({ pos: [L.x + 40, g(L.x + 40, L.z) + 1.8, L.z - 300], look: [L.x - 100, g(L.x - 100, L.z - 30) + 3, L.z - 20], fov: 60 }),
    wide: () => ({ pos: [L.x + 250, g(L.x + 250, L.z) + 120, L.z + 300], look: [L.x - 200, g(L.x - 200, L.z) + 5, L.z - 100], fov: 70 }),
  };
  window.bench.shots = Object.keys(shots);
  const cavU = world.units.findIndex(u => u.kind === 'cav'); state.follow = null;
  const setShot = (name) => { const s = shots[name](); state.follow = s.follow || null; cam.set(s.pos[0], s.pos[1], s.pos[2], 0, 0, s.fov); cam.lookAtPoint(...s.look); if (name === 'overview') cam.far = 14000; state.shot = name; };
  setShot(state.shot);
  let R;
  const opts = { base: './', nearQ: +Q.get('nearQ') || 1, midQ: +Q.get('midQ') || .35, nearR: +Q.get('nearR') || 40, midR: +Q.get('midR') || 300, shadowSize: +Q.get('shadow') || 2048, power: Q.get('power') || undefined,
    midMode: Q.get('mid') || 'vat', fxAlpha: Q.get('fxAlpha') ? +Q.get('fxAlpha') : 1, exposure: Q.get('exposure') ? +Q.get('exposure') : 1,
    flags: Object.fromEntries([...Q.entries()].filter(([k]) => k.startsWith('f_')).map(([k, v]) => [k.slice(2), +v])) };
  if (api === 'webgpu') { const m = await import('./webgpu.mjs'); R = await m.GPURenderer.create(canvas, world, opts); }
  else { const m = await import('./webgl2.mjs'); R = await m.GLRenderer.create(canvas, world, opts); }
  const tInit = performance.now();
  const setSize = (w, h) => { canvas.width = w; canvas.height = h; R.resize(w, h); };
  const dpr = +Q.get('dpr') || Math.min(devicePixelRatio, 2); setSize(Math.round((+Q.get('w') || innerWidth) * (Q.get('w') ? 1 : dpr)), Math.round((+Q.get('h') || innerHeight) * (Q.get('h') ? 1 : dpr)));
  addEventListener('resize', () => { if (!Q.get('w')) setSize(Math.round(innerWidth * dpr), Math.round(innerHeight * dpr)); });
  addEventListener('keydown', e => { if (e.code === 'F1') { state.hud = !state.hud; hud.style.display = state.hud ? '' : 'none'; } if (/^Digit[1-7]$/.test(e.code)) setShot(window.bench.shots[+e.code.slice(5) - 1]); if (e.code === 'Space') state.paused = !state.paused; });
  const timing = { navToWorld: tWorld - tNav, worldToInit: tInit - tWorld, initMs: R.initMs, bakeMs: R.bakeMs, navToReady: 0 };
  let last = performance.now(), hudT = 0, lastStats = {}, rec = null;
  const advance = (dt, steps) => { for (let i = 0; i < steps; i++) { state.simT += dt; R.fx.update(state.simT, cam); } };
  let inflight = 0; state.maxInflight = 2; state.fast = false; const mc = new MessageChannel(); mc.port1.onmessage = () => loop(performance.now()); const sched = () => { if (state.fast) mc.port2.postMessage(0); else requestAnimationFrame(loop); };
  function loop(now) {
    if (inflight >= state.maxInflight) { if (state.fast) setTimeout(sched, 0); else sched(); return; }
    const dtReal = Math.min(0.1, (now - last) / 1000); const interval = now - last; last = now;
    if (!state.paused) state.simT += dtReal; if (!rec) ctl.update(dtReal);
    if (state.follow === 'cav') { const o = cavU * 12, f = world.unitF, dt = state.simT - f[o + 8], ux = f[o] + f[o + 4] * dt, uz = f[o + 1] + f[o + 5] * dt; const h = f[o + 2]; const ex = Math.sin(h), ez = Math.cos(h), rx = Math.cos(h), rz = -Math.sin(h);
      cam.x = ux + rx * 16 - ex * 4; cam.z = uz + rz * 16 - ez * 4; cam.y = T.h(cam.x, cam.z) + 2.0; cam.lookAtPoint(ux - ex * 14, T.h(ux, uz) + 1.6, uz - ez * 14); }
    lastStats = R.frame(state.simT, cam); const tSub = performance.now(); inflight++; const myRec = rec;
    R.onDone().then(() => { inflight--; const t = performance.now(); if (myRec && myRec === rec) { myRec.done.push(t); myRec.wall.push(t - tSub); } });
    if (rec) { rec.iv.push(interval); rec.cpu.push(lastStats.cpuMs); rec.cpuLod.push(lastStats.cpuLod); rec.cpuPose.push(lastStats.cpuPose); rec.cpuEncode.push(lastStats.cpuEncode); rec.cpuFx.push(lastStats.cpuFx); if (R.gpuMs.total !== undefined) rec.gpu.push({ ...R.gpuMs }); if (rec.path) rec.path(rec.iv.length); }
    if (now - hudT > 250 && state.hud) { hudT = now; const s = lastStats, gm = R.gpuMs || {}; const fr = state.frames; fr.push(interval); if (fr.length > 30) fr.shift(); const avg = fr.reduce((a, b) => a + b, 0) / fr.length;
      hud.textContent = `${api}  ${R.adapterInfo?.vendor || ''} ${R.adapterInfo?.arch || R.rendererName || ''}  ${canvas.width}x${canvas.height}\n${(1000 / avg).toFixed(0)} fps  ${avg.toFixed(1)} ms frame | cpu ${s.cpuMs?.toFixed(1)} ms (lod ${s.cpuLod?.toFixed(1)} pose ${s.cpuPose?.toFixed(1)} enc ${s.cpuEncode?.toFixed(1)}) | gpu ${gm.total?.toFixed(1) ?? 'n/a'} ms\nsoldiers present ${world.comp.soldiers} (union ${world.comp.union} conf ${world.comp.confederate}) mounted ${world.comp.mounted} guns ${world.comp.guns}\nnear ${s.nearFoot}+${s.nearMnt}  mid ${s.midFoot}+${s.midMnt}  far ${s.farFoot + s.farMnt}   tris ${(s.tris / 1e6).toFixed(2)} M   fx events ${s.events}\nshot ${state.shot}  t ${state.simT.toFixed(1)} s  GPU mem (accounted) ${(R.memoryBytes() / 1048576).toFixed(0)} MiB`; }
    sched();
  }
  requestAnimationFrame(loop);
  timing.navToReady = performance.now() - tNav;
  Object.assign(window.bench, {
    ready: true, ctl, timing, world: world.comp, adapter: R.adapterInfo || { renderer: R.rendererName }, api, canvas, R, cam, setShot, setSize, advance, T, W: world,
    seek(t, back = 30) { state.simT = Math.max(0, t - back); R.fx.lastK = null; R.fx.n = 0; R.fx.pending.length = 0; R.fx.lastT = null; advance(0.1, Math.round((t - state.simT) / 0.1)); state.simT = t; R.fx.update(t, cam); },
    gunFireTimes(i, tmin) { const g = world.gunF, o = i * 8, P = g[o + 4], ph = g[o + 5]; const k = Math.ceil((tmin + ph) / P); return k * P - ph; },
    setInflight(n) { state.maxInflight = n; }, setFlags(fl) { Object.assign(R.o.flags, fl); }, setOpts(o) { Object.assign(R.o, o); if (o.nearR !== undefined) R.cfg.nearR = o.nearR; if (o.midR !== undefined) R.cfg.midR = o.midR; },
    // record n frames (after warm frames); camera may follow a fly-through path function(k) -> sets cam
    async record(n, { warm = 30, path = null, speed = 1 } = {}) {
      if (path === 'fly') { const keys = ['overview', 'wide', 'ridge', 'line', 'battery', 'cavalry', 'ground'].map(k => shots[k]()); const t0 = performance.now(); const sm = x => x * x * (3 - 2 * x);
        path = () => { const tt = (performance.now() - t0) / 1000 * speed / 3.5; const i = Math.floor(tt) % keys.length, u = sm(tt - Math.floor(tt)), a = keys[i], b = keys[(i + 1) % keys.length]; const L = (p, q) => p + (q - p) * u;
          cam.set(L(a.pos[0], b.pos[0]), L(a.pos[1], b.pos[1]), L(a.pos[2], b.pos[2]), 0, 0, L(a.fov, b.fov)); cam.lookAtPoint(L(a.look[0], b.look[0]), L(a.look[1], b.look[1]), L(a.look[2], b.look[2])); }; }
      state.fast = true; await new Promise(res => { let k = 0; const w = () => { if (++k >= warm) res(); else setTimeout(w, 0); }; setTimeout(w, 0); });
      rec = { iv: [], done: [], wall: [], cpu: [], cpuLod: [], cpuPose: [], cpuEncode: [], cpuFx: [], gpu: [], path }; await new Promise(res => { const c = () => { if (rec.done.length >= n + 2) res(); else setTimeout(c, 2); }; setTimeout(c, 2); }); state.fast = false;
      const r0 = rec; rec = null; await new Promise(res => setTimeout(res, 300)); // let the last timestamp reads land
      const dn = r0.done, iv = []; for (let i = 3; i < dn.length; i++) iv.push(dn[i] - dn[i - 1]); const wall = r0.wall.slice(2), mean = a => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length); const med = pct(iv, .5);
      const gk = r0.gpu.length ? Object.keys(r0.gpu[0]) : []; const gpu = {}; for (const k of gk) gpu[k] = mean(r0.gpu.slice(4).map(x => x[k]));
      return { frames: iv.length, frameMs: { mean: mean(iv), p50: med, p95: pct(iv, .95), p99: pct(iv, .99), max: Math.max(...iv), fps: 1000 / mean(iv) }, hitches: iv.filter(x => x > med * 1.5).length, gpuWallMs: mean(wall), inflight: state.maxInflight,
        cpuMs: { mean: mean(r0.cpu.slice(2)), lod: mean(r0.cpuLod.slice(2)), pose: mean(r0.cpuPose.slice(2)), encode: mean(r0.cpuEncode.slice(2)), fx: mean(r0.cpuFx.slice(2)) }, gpuMs: gpu, stats: { ...lastStats }, memBytes: R.memoryBytes(), memItems: R.mem.items };
    },
    async shot(name) { return new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res))); },
  });
} catch (e) { fail(e); }

// Harness (not a gate): the real shell with the real crowd (127,572 figures, the real layer, July 3 13:30) on software rendering, the camera put at chosen distances from the middle man of the largest infantry unit that is on the field,
// every distance drawn twice: with the HARD swap between levels (crowd.lod.band = 0, hyst = 0: the earlier behaviour) and with the CROSS-FADE. The picture of each shot is read back in the frame's own task.
//   tools/horde/bench.sh node docs/battle-theatre/app/tests/crowd-lod-shots.mjs <outDir> [webgl2|webgpu] [--w=640] [--h=360] [--sets=b10,b13,b75,dab,purity] [--entry-timeout=1500] [--extra=a=b&c=d]
// The field of view is chosen so that a metre at a given distance covers the same number of pixels as at 1080p and 60 degrees (the radii of the levels are defined in pixels: lodRadii), so the boundaries are at
// their 10, 13 and 75 m and the dab at 267 m whatever the size of the picture; a smaller picture is only fewer pixels around the same men.
//   b10   the swap of level 0 for level 1 (10 m):   distances 8.4 .. 11.6 m      b13  level 1 for level 2 (13 m): 11 .. 15 m
//   b75   level 2 for the impostor (75 m):          distances 60 .. 90 m         dab  the baked view for the flat dab (267 m): 230 .. 305 m
//   purity  the same time and camera reached by two different histories, in bytes
// Output: <outDir>/<api>/<set>-<mode>-<distance>.png, <set>-<distance>-montage.png (hard | cross-fade | difference x4, the middle of the picture at 3x), summary.json (stats of the crowd per shot, differences), console.log.
// Software rendering only (SwiftShader). Nothing here is a real-GPU result.
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from '../../../../node_modules/playwright-core/index.mjs';
import { serve } from '../tools/serve.mjs';
import { encodePng, chromeArgs, HOOKS } from './weather3d-gpu-lib.mjs';

const args = process.argv.slice(2), flag = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const pos = args.filter(a => !a.startsWith('--')), outRoot = path.resolve(pos[0] || '.'), api = pos[1] === 'webgpu' ? 'webgpu' : 'webgl2', W = +flag('w', 640), H = +flag('h', 360), ENTRY_MS = +flag('entry-timeout', 1500) * 1000, EXTRA = flag('extra', '');
const SETS = {
  b10: { what: 'level 0 for level 1 at 10 m', dists: [8.4, 9.2, 10.0, 10.8, 11.6], eye: 1.7 }, b13: { what: 'level 1 for level 2 at 13 m', dists: [11, 12, 13, 14, 15], eye: 1.7 },
  b75: { what: 'level 2 for the impostor at 75 m', dists: [60, 68, 75, 82, 90], eye: 2.5 }, dab: { what: 'the baked view for the flat dab at 267 m', dists: [230, 250, 267, 285, 305], eye: 4 } };
const want = (flag('sets', 'b10,b13,b75,dab,purity')).split(',').filter(Boolean), out = path.join(outRoot, api); fs.mkdirSync(out, { recursive: true });
const t00 = Date.now(), say = (...a) => console.log(((Date.now() - t00) / 1000).toFixed(0).padStart(5) + 's', ...a), logs = [];
const summary = { api, w: W, h: H, started: new Date().toISOString(), sets: {}, errors: [], purity: null }, save = () => fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify(summary, null, 1));
const srv = await serve(0), port = srv.address().port, url = `http://127.0.0.1:${port}/app/index.html?history=real&api=${api}&structures=off&fx=off&ext=off${EXTRA ? '&' + EXTRA : ''}`;
let browser;
const u8 = b64 => { const b = Buffer.from(b64, 'base64'); return new Uint8Array(b.buffer, b.byteOffset, b.length); };
function diffStats(a, b) { let sum = 0, over = 0; const n = a.length / 4, d = new Uint8Array(a.length); for (let i = 0; i < n; i++) { let m = 0; for (let c = 0; c < 3; c++) { const v = Math.abs(a[i * 4 + c] - b[i * 4 + c]); sum += v; if (v > m) m = v; d[i * 4 + c] = Math.min(255, v * 4); } d[i * 4 + 3] = 255; if (m > 24) over++; } return { meanAbs: +(sum / (n * 3)).toFixed(4), overShare: +(over / n).toFixed(5), img: d }; }
function crop(px, w, h, x0, y0, cw, ch, z) { const o = new Uint8Array(cw * z * ch * z * 4); for (let y = 0; y < ch * z; y++) for (let x = 0; x < cw * z; x++) { const s = ((y0 + (y / z | 0)) * w + x0 + (x / z | 0)) * 4, d = (y * cw * z + x) * 4; o[d] = px[s]; o[d + 1] = px[s + 1]; o[d + 2] = px[s + 2]; o[d + 3] = 255; } return o; }
const side = (parts, w, h) => { const o = new Uint8Array(w * parts.length * h * 4); parts.forEach((p, k) => { for (let y = 0; y < h; y++) o.set(p.subarray(y * w * 4, (y + 1) * w * 4), (y * w * parts.length + k * w) * 4); }); return { w: w * parts.length, h, data: o }; };
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true, args: chromeArgs(false) });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 }); await ctx.addInitScript(HOOKS, { realCanvas: false, trace: false }); ctx.setDefaultTimeout(0);
  const page = await ctx.newPage(); page.on('console', m => logs.push(m.type() + ': ' + m.text())); page.on('pageerror', e => logs.push('pageerror: ' + e.message)); page.on('crash', () => logs.push('PAGE CRASH'));
  say('open', url); await page.goto(url, { waitUntil: 'load', timeout: 300000 }); await page.evaluate(() => document.querySelector('[data-bt-enter]').click());
  const hb = setInterval(async () => { try { say('  entering:', await page.evaluate(() => { const l = document.querySelector('.loading-card'); return (l ? l.innerText.replace(/\s+/g, ' ').slice(0, 140) : 'no loading card') + ' | btApp ' + !!window.btApp; })); } catch { say('  entering: page busy'); } }, 30000);
  try { await page.waitForFunction(() => window.btApp && (window.btApp.ready || document.querySelector('.loading-card .fail')), null, { timeout: ENTRY_MS, polling: 1000 }); } finally { clearInterval(hb); }
  const entered = await page.evaluate(() => { const a = window.btApp; if (!a || !a.ready) return { ready: false, fail: (document.querySelector('.loading-card') || {}).textContent }; const th = a.theatre, c = th.host.crowd; return { ready: true, api: a.api, entryMs: th.perf.entryMs, crowd: !!c, lod: c ? { ...c.lod } : null, adapter: th.host.info, w: th.host.R.W, h: th.host.R.H }; });
  summary.entered = entered; say('entered', JSON.stringify(entered).slice(0, 400)); save(); if (!entered.ready || !entered.crowd) throw new Error('the theatre did not start with the crowd: ' + JSON.stringify(entered).slice(0, 300));
  // the picture is read back in the frame's own task; the page is paused at 13:30 on July 3
  await page.evaluate(async () => {
    const a = window.btApp, th = a.theatre, host = th.host, R = host.R, { minOf } = await import('/app/src/clock.mjs');
    const grabGPU = () => { const d = R.dev, tex = R.ctx.getCurrentTexture(), w = tex.width, h = tex.height, bpr = Math.ceil(w * 4 / 256) * 256, buf = d.createBuffer({ size: bpr * h, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ }), enc = d.createCommandEncoder();
      enc.copyTextureToBuffer({ texture: tex }, { buffer: buf, bytesPerRow: bpr }, [w, h]); d.queue.submit([enc.finish()]);
      return buf.mapAsync(GPUMapMode.READ).then(() => { const src = new Uint8Array(buf.getMappedRange()), o = new Uint8Array(w * h * 4), bgra = /^bgra/.test(tex.format); for (let y = 0; y < h; y++) o.set(src.subarray(y * bpr, y * bpr + w * 4), y * w * 4); if (bgra) for (let i = 0; i < o.length; i += 4) { const t = o[i]; o[i] = o[i + 2]; o[i + 2] = t; } buf.unmap(); buf.destroy(); return { w, h, data: o }; }); };
    const grabGL = () => { const gl = R.gl, w = R.W, h = R.H, px = new Uint8Array(w * h * 4); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px); const o = new Uint8Array(w * h * 4); for (let y = 0; y < h; y++) o.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4); return Promise.resolve({ w, h, data: o }); };
    const orig = host.frame.bind(host); host.frame = (t, cam) => { const r = orig(t, cam); if (window.__grab) { window.__grab = false; window.__grabP = host.api === 'webgpu' ? grabGPU() : grabGL(); } return r; };
    th.setPlaying(false); th.controls.flight = null; a.setTime(minOf(7, 3, 13, 30)); await a.frames(6);
    // the subject: the middle man of the largest infantry unit on the field
    const st = a.stage, L = a.layer; let pick = -1, bc = 0; for (let i = 0; i < L.units.length; i++) if (st.present[i] === 1 && L.units[i].arm === 'infantry' && st.w.units[i].count > bc) { bc = st.w.units[i].count; pick = i; }
    if (pick < 0) throw new Error('no infantry unit on the field at 13:30 on July 3'); window.__subject = { index: pick, id: L.units[pick].id, name: L.units[pick].name, count: bc };
    window.__shot = async (o) => {                           // o: { D, eye, along (metres along the line, 0 = the middle man), mode: 'hard'|'fade', t (minutes, optional) }
      const crowd = host.crowd; crowd.lod.band = o.mode === 'hard' ? 0 : 0.075; crowd.lod.hyst = o.mode === 'hard' ? 0 : 0.10; if (o.t != null) { a.setTime(o.t); }
      const u = st.w.units[pick], fi = u.first + (u.count >> 1), tmp = [0, 0, 0], { soldierPlace } = await import('/render/prototype/src/world.mjs'); soldierPlace(st.w, fi, host.animT ?? 0, tmp); const hd = st.ch[pick], fx = tmp[0] + Math.cos(hd) * (o.along || 0), fz = tmp[1] - Math.sin(hd) * (o.along || 0), fy = th.T.h(fx, fz);
      const ex = fx + Math.sin(hd) * o.D, ez = fz + Math.cos(hd) * o.D, ey = th.T.h(ex, ez) + o.eye, tx = fx, ty = fy + 1.2, tz = fz, fov = 2 * Math.atan((R.H / 1080) * Math.tan(Math.PI / 6)) * 180 / Math.PI;
      th.controls.flyTo({ x: ex, y: ey, z: ez, yaw: Math.atan2(tx - ex, tz - ez), pitch: Math.atan2(ty - ey, Math.hypot(tx - ex, tz - ez)), fov }, 0);
      await a.frames(2); window.__grab = true; await a.frames(2); const pic = await window.__grabP, s = crowd.stats; let b = ''; const d = pic.data; for (let i = 0; i < d.length; i += 0x8000) b += String.fromCharCode.apply(null, d.subarray(i, i + 0x8000));
      return { w: pic.w, h: pic.h, px: btoa(b), cam: { x: th.cam.x, y: th.cam.y, z: th.cam.z, yaw: th.cam.yaw, pitch: th.cam.pitch, fovDeg: th.cam.fov * 180 / Math.PI }, t: th.state.t, animT: host.animT,
        crowd: { listed: s.listed, lod0: s.lod0, lod1: s.lod1, lod2: s.lod2, fading: s.fading, horse: s.horse, r0e: s.r0e, budgetCut: s.budgetCut, bands: s.bands, draws: s.draws, records: s.records, tris: Math.round(s.tris), selectMs: +s.selectMs.toFixed(2), animMs: +s.animMs.toFixed(2) }, lod: { ...crowd.lod }, radii: { ...crowd.lastR } };
    };
  });
  summary.subject = await page.evaluate(() => window.__subject); say('subject', JSON.stringify(summary.subject)); save();
  const shot = async (name, o) => { const t0 = Date.now(), r = await page.evaluate(o => window.__shot(o), o); r.px = u8(r.px); r.wallMs = Date.now() - t0; fs.writeFileSync(path.join(out, name + '.png'), encodePng(r.w, r.h, r.px)); return r; };
  for (const key of want.filter(k => SETS[k])) {
    const S = SETS[key], rec = summary.sets[key] = { what: S.what, shots: {}, pairs: [] }; say('set', key, S.what);
    for (const D of S.dists) {
      const pair = {}; for (const mode of ['hard', 'fade']) {
        const r = await shot(`${key}-${mode}-${D}`, { D, eye: S.eye, mode }); pair[mode] = r; const { px, ...meta } = r; rec.shots[`${mode}-${D}`] = meta; say(`  ${key} ${mode} ${D} m`, `listed ${r.crowd.listed} L0 ${r.crowd.lod0} L1 ${r.crowd.lod1} L2 ${r.crowd.lod2} fading ${r.crowd.fading} bands ${r.crowd.bands}`, `${r.wallMs} ms`); }
      const df = diffStats(pair.hard.px, pair.fade.px), cw = 213, ch = 120, x0 = Math.max(0, (W - cw) >> 1), y0 = Math.max(0, (H - ch) >> 1), z = 3, parts = [crop(pair.hard.px, W, H, x0, y0, cw, ch, z), crop(pair.fade.px, W, H, x0, y0, cw, ch, z), crop(df.img, W, H, x0, y0, cw, ch, z)];
      const m = side(parts, cw * z, ch * z); fs.writeFileSync(path.join(out, `${key}-${D}-montage.png`), encodePng(m.w, m.h, m.data));
      rec.pairs.push({ D, meanAbs: df.meanAbs, overShare: df.overShare }); say(`  ${key} ${D} m: hard against cross-fade, mean absolute difference ${df.meanAbs}, ${(df.overShare * 100).toFixed(2)} percent of the pixels differ by more than 24 levels`); save();
    }
  }
  if (want.includes('purity')) {
    say('purity: the same time and camera by two histories');
    const base = { D: 10, eye: 1.7, mode: 'fade' }, a1 = await shot('purity-a', base), other = await shot('purity-away', { D: 60, eye: 6, mode: 'fade', along: 15, t: 7 * 0 + (await page.evaluate(() => window.btApp.state.t)) + 30 }), back = await shot('purity-b', { ...base, t: a1.t });
    const same = a1.px.length === back.px.length && Buffer.compare(Buffer.from(a1.px), Buffer.from(back.px)) === 0, df = diffStats(a1.px, back.px); void other;
    summary.purity = { sameBytes: same, meanAbs: df.meanAbs, overShare: df.overShare, timeA: a1.t, timeB: back.t, cameraA: a1.cam, cameraB: back.cam }; say('purity', JSON.stringify(summary.purity)); save();
  }
  summary.perf = await page.evaluate(() => { try { return window.btApp.perf(); } catch { return null; } });
} catch (e) { summary.errors.push(String((e && e.stack) || e).slice(0, 2000)); say('ERROR', String(e).slice(0, 500)); }
finally { summary.finished = new Date().toISOString(); summary.consoleProblems = logs.filter(l => /error|fail|invalid|validation|lost|crash/i.test(l)).slice(0, 40); summary.consoleLines = logs.length; save(); fs.writeFileSync(path.join(out, 'console.log'), logs.join('\n')); try { await browser.close(); } catch { /* gone */ } srv.close(); }
say('done', 'errors', summary.errors.length, 'console problems', (summary.consoleProblems || []).length);

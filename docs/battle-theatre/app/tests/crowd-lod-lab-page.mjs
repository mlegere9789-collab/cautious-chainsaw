// Page of tests/crowd-lod-lab.mjs: the TWO REAL BACKENDS of the figure pass (src/crowd/gl.mjs and gpu.mjs, with their shaders) on synthetic data, under the Battle Theatre's render host and the prototype renderer, and nothing else
// (no history layer, no figures3d meshes, no animation). The lab draws flat quads in place of the levels, so that what the GPU does with the dither range of a record can be MEASURED against what lod.mjs says:
//   * three levels of one figure at one place, each with its range [lo, hi): the share of the pixels each of them keeps, and that no pixel is left empty (partition);
//   * the impostor of one world figure, whose far share the vertex shader computes from its distance, band, hysteresis and hash: the share of its pixels that is drawn against the JS formula;
//   * the dab: the share of an impostor drawn as a flat two-tone dab against dabShare().
// One call = one frame at a given camera, read back in the frame's own task (WebGPU: the stand-in texture of HOOKS in weather3d-gpu-lib.mjs; WebGL2: readPixels). Same inputs, same pixels (the driver checks that).
import { URLS } from '../src/config.mjs';
import { loadTerrain, buildWorld, soldierPlace } from '../../render/prototype/src/world.mjs';
import { Camera } from '../../render/prototype/src/camera.mjs';
import { RenderHost } from '../src/render-host.mjs';
import { MeshStore } from '../src/crowd/meshes.mjs';
import { buildPal, PAL_W, PAL_H, NSLOT, MATC } from '../src/crowd/tables.mjs';

const Q = new URLSearchParams(location.search), API = Q.get('api') === 'webgl2' ? 'webgl2' : 'webgpu', W = +Q.get('w') || 320, H = +Q.get('h') || 180;
const LAB = window.LAB = { api: API, ready: false, error: null, log: [], w: W, h: H, mats: { L0: 40, L1: 41, L2: 42, IMP: 43, COAT: MATC.COAT, TROUSERS: MATC.TROUSERS } };
const b64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
let world = null, T = null, host = null, be = null, crowdLike = null, S = null, ms = null, cam = null;
const half1 = 0x3C00;
function mkBank(nb = 36) {              // identity matrices for every bone of four frames (two per row), the layout of clips.mjs Bank
  const tpf = nb * 3, width = tpf * 2, rows = 2, data = new Uint16Array(width * rows * 4);
  for (let g = 0; g < 4; g++) { const o = ((g >> 1) * width + (g & 1) * tpf) * 4; for (let b = 0; b < nb; b++) { data[o + b * 12] = half1; data[o + b * 12 + 5] = half1; data[o + b * 12 + 10] = half1; } }
  let dirty = [0, rows - 1]; return { width, rows, tpf, data, takeDirty() { const d = dirty; dirty = null; return d; } };
}
async function setup() {
  T = await loadTerrain(URLS.proto); world = buildWorld(T, { total: 1500, horses: 100, gunRate: 0 }); for (let i = 0; i < world.count; i++) world.sold1[i * 4] = 1e9;
  const canvas = document.getElementById('c'); canvas.width = W; canvas.height = H;
  const ropts = { base: URLS.proto, nearQ: 1, midQ: 0.35, nearR: 0.01, midR: 0.01, shadowSize: 1024, midMode: 'vat', fxAlpha: 0.75, exposure: 1 };
  host = await RenderHost.create({ canvas, world, api: API, opts: ropts, replaceCanvas: () => canvas }); host.resize(W, H); cam = LAB.cam = new Camera();
  const f = host.R.o.flags; f.near = 0; f.mid = 0; f.far = 0; f.particles = 0; host.setLight([0.35, 0.8, 0.45], 1);
  // synthetic data of the figure pass: one outfit variant, one impostor class, a flat palette of pure colours
  ms = new MeshStore(1 << 10, 1 << 11); const pal = buildPal({});
  const setc = (m, r, g, b) => { pal[m * 4] = r; pal[m * 4 + 1] = g; pal[m * 4 + 2] = b; pal[m * 4 + 3] = 0.9; const o1 = (PAL_W + m) * 4; pal[o1] = 0; pal[o1 + 1] = -1; pal[o1 + 2] = 0; pal[o1 + 3] = 0; };
  setc(LAB.mats.L0, 0.8, 0.03, 0.03); setc(LAB.mats.L1, 0.8, 0.7, 0.03); setc(LAB.mats.L2, 0.1, 0.05, 0.8); setc(LAB.mats.IMP, 0.85, 0.85, 0.85); setc(LAB.mats.COAT, 0.8, 0.03, 0.6); setc(LAB.mats.TROUSERS, 0.03, 0.6, 0.8);
  const imp = { w: 384, h: 64, layers: 1, data: new Uint8Array(384 * 64 * 4), meta: Float32Array.from([2.0, 32.0, 0, 0]) }; for (let i = 0; i < 384 * 64; i++) { imp.data[i * 4] = LAB.mats.IMP; imp.data[i * 4 + 1] = 128; imp.data[i * 4 + 2] = 128; imp.data[i * 4 + 3] = 255; }
  S = { count: world.count, nVariants: 2, nslot: NSLOT, inst: new Uint32Array(world.count * 4), varInfo: new Uint16Array(8), varPal: new Uint8Array(2 * NSLOT * 4), pal, palW: PAL_W, palH: PAL_H, nearCap: 4, banks: { human: mkBank(), horse: mkBank(60) }, imp };
  crowdLike = { meshes: ms, settings: {}, prepare() { }, scene(p) { if (be) be.scene(p); }, shadow(p, c) { if (be) be.shadow(p, c); }, destroy() { } };
  const { CrowdGL } = API === 'webgl2' ? await import('../src/crowd/gl.mjs') : {}, { CrowdGPU } = API === 'webgpu' ? await import('../src/crowd/gpu.mjs') : {};
  be = API === 'webgl2' ? new CrowdGL(host, crowdLike) : new CrowdGPU(host, crowdLike); be.init(S); host.setCrowd(crowdLike); LAB.ready = true;
}
setup().catch(e => { LAB.error = String((e && e.stack) || e); console.error('lab set-up failed', e); });

const quad = (mat, dz) => ms.add('q' + mat + ':' + dz, { nv: 4, pos: Float32Array.from([-1.2, 0.2, dz, 1.2, 0.2, dz, -1.2, 2.6, dz, 1.2, 2.6, dz]), nrm: Float32Array.from([0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1]), mat: Uint8Array.from([mat, mat, mat, mat]),
  joints: new Uint8Array(16), weights: Float32Array.from([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]), flags: new Uint8Array(4), idx: Uint32Array.from([0, 1, 2, 2, 1, 3]) });
function grabGPU(R) {
  const d = R.dev, tex = R.ctx.getCurrentTexture(), w = tex.width, h = tex.height, bpr = Math.ceil(w * 4 / 256) * 256, buf = d.createBuffer({ label: 'lab readback', size: bpr * h, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
  const enc = d.createCommandEncoder(); enc.copyTextureToBuffer({ texture: tex }, { buffer: buf, bytesPerRow: bpr }, [w, h]); d.queue.submit([enc.finish()]);
  return buf.mapAsync(GPUMapMode.READ).then(() => { const src = new Uint8Array(buf.getMappedRange()), out = new Uint8Array(w * h * 4), bgra = /^bgra/.test(tex.format); for (let y = 0; y < h; y++) out.set(src.subarray(y * bpr, y * bpr + w * 4), y * w * 4); if (bgra) for (let i = 0; i < out.length; i += 4) { const t = out[i]; out[i] = out[i + 2]; out[i + 2] = t; } buf.unmap(); buf.destroy(); return { w, h, data: out }; });
}
function grabGL(R) { const gl = R.gl, w = R.W, h = R.H, px = new Uint8Array(w * h * 4); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px); const out = new Uint8Array(w * h * 4); for (let y = 0; y < h; y++) out.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4); return Promise.resolve({ w, h, data: out }); }

// spec = { dist (m from the figure), fovDeg, dx, t, draws: [{ level: 0|1|2, mat, dz, P }], imp: null | { r2, band, hyst, dabPx }, band, hyst, dabPx }
// the camera looks at figure 0 from dist metres on its -z side; the quads face -z; a smaller dz is nearer to the camera
LAB.shot = async function (spec) {
  if (!LAB.ready) throw new Error('the lab is not ready: ' + LAB.error);
  const R = host.R, t = spec.t ?? 100, tmp = [0, 0, 0]; soldierPlace(world, 0, t, tmp); const gx = tmp[0], gz = tmp[1], gy = T.h(gx, gz);
  cam.set(gx, gy + 1.4, gz - spec.dist, 0, 0, spec.fovDeg || 30); cam.lookAtPoint(gx, gy + 1.4, gz); cam.x += spec.dx || 0;      // dx: a parallel shift of the camera (the figure moves a fraction of a pixel across the dither)
  const nrec = (spec.draws || []).length, inst = new ArrayBuffer(48 * Math.max(1, nrec)), f32 = new Float32Array(inst), u32 = new Uint32Array(inst), draws = [];
  (spec.draws || []).forEach((d, i) => { const e = quad(d.mat, d.dz || 0), o = i * 12; f32[o] = gx; f32[o + 1] = gz; f32[o + 2] = 0; f32[o + 3] = 1; u32[o + 8] = 0; u32[o + 9] = 0; u32[o + 10] = 0; u32[o + 11] = d.P >>> 0;
    draws.push({ near: d.level === 0, bank: d.level === 0 ? null : 'human', first: e.firstIndex, count: e.indexCount, off: i * 48, n: 1 }); });
  const pose = new Float32Array(S.nearCap * 61 * 12); pose[0] = 1; pose[5] = 1; pose[10] = 1;
  const imp = spec.imp, F = { draws, inst: new Uint8Array(inst), instBytes: nrec * 48, pose, nPose: 1, impostors: !!imp, nWorld: 1, r2: imp ? imp.r2 : 1, band: imp ? imp.band : 0.075, hyst: imp ? imp.hyst : 0.1, dabPx: imp && imp.dabPx != null ? imp.dabPx : 7 };
  crowdLike.prepare = () => be.upload(F);
  const dev = R.dev || null, res = await new Promise((resolve, reject) => requestAnimationFrame(() => { try { if (dev) dev.pushErrorScope('validation'); host.frame(40 + t, cam); const pend = API === 'webgpu' ? grabGPU(R) : grabGL(R), scope = dev ? dev.popErrorScope() : Promise.resolve(null); resolve({ pend, scope }); } catch (e) { reject(e); } }));
  const [pic, err] = await Promise.all([res.pend, res.scope]); if (dev) await dev.queue.onSubmittedWorkDone();
  let glErr = null; if (API === 'webgl2') { const e = R.gl.getError(); if (e) glErr = e; }
  return { w: pic.w, h: pic.h, px: b64(pic.data), figure: { x: gx, z: gz, y: gy }, validation: err ? String(err.message || err).slice(0, 1200) : null, glError: glErr, gpuErrors: (window.__gpuErrors || []).slice(), wgsl: (window.__wgslMessages || []).slice() };
};
LAB.diag = () => ({ api: API, ready: LAB.ready, error: LAB.error, log: LAB.log, adapter: host && host.info, gpuErrors: window.__gpuErrors || [], wgsl: window.__wgslMessages || [], modules: window.__gpuLabels || [], hostLog: host ? host.log : [] });

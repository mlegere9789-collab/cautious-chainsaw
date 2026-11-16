// Recorder of the NATIVE replay of the vegetation layer (the python half is tests/vegetation-native-replay.py). In node, with no browser and no GPU: the real layer (src/ext/vegetation, unchanged: its WebGL2 backend gl.mjs, the real data,
// the real state function) is started on a stand-in theatre whose `gl` is a recorder: every GL call the layer makes (textures, buffers, vertex arrays, programs, uniforms, draws) goes to <out>/ops.json with its data in <out>/blobs.bin, for
// a list of views (a place, a time, a camera, the readings of the source conflicts). The replay then makes the same calls on a real OpenGL ES 3.2 context (Mesa llvmpipe, software) and writes the pictures.
//   node vegetation-native-record.mjs <outDir> [--w=800] [--h=500] [--only=label1,label2]
// What it records is what the layer's gl.mjs does; what it does not run is the shell: no terrain, no sky, no shadow maps (every fragment lit), no other layer, no post-processing. So a picture shows the layer ALONE (ground cover and trees)
// through its real shaders, on a flat sky, with the terrain's heights under it: it is not a browser, not the shell and not the light of the product, and no frame time is claimed. A real stage is not loaded: the trampling is the layer's events
// (the Wheatfield fought through on 2 July) and not the walk of the formations (the plan of the troops is a browser matter). The wind is a stand-in (6 to 12 mph, the shape the environment layer gives: th.wx.wind.mph) because the shell's weather is not
// loaded: the sway is drawn for it with the direction the plan gives, and the pictures of the sway say nothing of the weather of those days.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
import * as VEG from '../src/ext/vegetation/index.mjs';
import { isoMin } from '../src/ext/vegetation/model.mjs';
import { tierMark } from '../src/ui/extensions.mjs';
import { Bus } from '../src/scope.mjs';
import { nodeWorld } from './node-world.mjs';
import { assemble, pre, TW } from './crowd-lod-glsl-sources.mjs';
import { Camera } from '../../render/prototype/src/camera.mjs';
import { invert } from '../../render/prototype/src/math.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), APP = path.resolve(here, '..');
const out = path.resolve(process.argv[2] || '.'); fs.mkdirSync(out, { recursive: true });
const opt = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const W = Number(opt('w', 800)), Hh = Number(opt('h', 500)), ONLY = opt('only', '') ? opt('only', '').split(',') : null;

// ---- the recorder (as tests/crowd-lod-native-record.mjs)
const ops = [], blobs = []; let boff = 0, hid = 0;
const CONST = { ARRAY_BUFFER: 0x8892, ELEMENT_ARRAY_BUFFER: 0x8893, STATIC_DRAW: 0x88E4, DYNAMIC_DRAW: 0x88E8, FLOAT: 0x1406, UNSIGNED_SHORT: 0x1403, UNSIGNED_BYTE: 0x1401, RGBA: 0x1908, RGBA32F: 0x8814, R32F: 0x822E, RED: 0x1903, TEXTURE_2D: 0x0DE1,
  TEXTURE0: 0x84C0, TEXTURE_MIN_FILTER: 0x2801, TEXTURE_MAG_FILTER: 0x2800, TEXTURE_WRAP_S: 0x2802, TEXTURE_WRAP_T: 0x2803, NEAREST: 0x2600, LINEAR: 0x2601, CLAMP_TO_EDGE: 0x812F, TRIANGLES: 4, CULL_FACE: 0x0B44, DEPTH_TEST: 0x0B71, BLEND: 0x0BE2,
  LESS: 0x0201, LEQUAL: 0x0203, UNPACK_ALIGNMENT: 0x0CF5, UNPACK_FLIP_Y_WEBGL: 0x9240, UNPACK_PREMULTIPLY_ALPHA_WEBGL: 0x9241, LINK_STATUS: 0x8B82, MAX_COMBINED_TEXTURE_IMAGE_UNITS: 0x8B4D };
const H = kind => ({ __h: ++hid, kind }), enc = a => (a && typeof a === 'object' && '__h' in a ? { h: a.__h } : ArrayBuffer.isView(a) ? Array.from(a) : a === undefined ? null : a);
const blob = (ta, so = 0, len) => { const bpe = ta.BYTES_PER_ELEMENT, n = (len ?? ta.length - so) * bpe; if (so * bpe + n > ta.byteLength) throw new Error('recorder: a source range past the end of its array'); blobs.push(new Uint8Array(ta.buffer, ta.byteOffset + so * bpe, n).slice()); const r = [boff, n]; boff += n; return r; };       // a copy: the layer writes its state texture from one array that it rewrites at every minute
const CREATE = new Set(['createTexture', 'createBuffer', 'createVertexArray', 'createFramebuffer', 'createRenderbuffer']), seen = new Set();
const gl = new Proxy({}, { get(_, p) {
  if (typeof p !== 'string') return undefined;
  if (/^[A-Z0-9_]+$/.test(p)) { if (!(p in CONST)) throw new Error('recorder: GL constant ' + p + ' is not in the table'); return CONST[p]; }
  if (CREATE.has(p)) return () => { const h = H(p.slice(6).toLowerCase()); ops.push([p, h.__h]); return h; };
  if (p === 'getUniformLocation') return (prog, name) => { const h = H('loc'); ops.push([p, h.__h, prog.__h, name]); return h; };
  if (p === 'bufferData') return (t, d, u) => { ops.push(typeof d === 'number' ? [p, t, d, null, u] : [p, t, d.byteLength, blob(d), u]); };
  if (p === 'bufferSubData') return (t, off, d, so = 0, len) => { ops.push([p, t, off, blob(d, so, len)]); };
  if (p === 'texSubImage2D') return (t, l, x, y, w, h, f, ty, d, so = 0) => { ops.push([p, t, l, x, y, w, h, f, ty, d ? blob(d, so) : null]); };
  if (p === 'getParameter') return n => (n === CONST.MAX_COMBINED_TEXTURE_IMAGE_UNITS ? 32 : null);
  if (p === 'getProgramParameter') return () => true;
  if (p === 'getExtension') return () => null;
  if (p === 'getShaderInfoLog' || p === 'getProgramInfoLog') return () => '';
  return (...a) => { seen.add(p); ops.push([p, ...a.map(enc)]); };
} });
const progs = [];
const R = { gl, W, H: Hh, progs, mem: { buffers: 0, textures: 0 }, track() { },
  prog(name, vs, fs) { const h = H('program'), p = assemble(vs, fs); h.name = name; progs.push(h); ops.push(['prog', h.__h, name, p.vs, p.fs]); return h; }, finishProgs() { ops.push(['finishProgs']); } };

// ---- the layer on a stand-in theatre
const { T } = await nodeWorld();
const hooks = [], th = { dead: false, T, state: { t: isoMin('1863-07-02T12:00'), chapter: 'battle' }, bus: new Bus(), root: null, announce() {}, stage: null, controls: { flyTo() {} }, openPanel() {}, sample: { sunAlt: 50 }, wx: { wind: { mph: [6, 12] } }, viewFor: () => ({}) };
const ctx = { theatre: th, host: { api: 'webgl2', R, addSceneHook: h => { hooks.push(h); return () => { const i = hooks.indexOf(h); if (i >= 0) hooks.splice(i, 1); }; } }, urls: { data: pathToFileURL(path.join(APP, 'data') + path.sep).href }, choices: () => ({}), tierMark,
  registerPanel: i => ({ id: i, open() {}, close() {}, isOpen: () => false, refresh() {} }), registerLayerToggle: (i, t, g, s) => ({ id: i, get: g, set: v => { s(v); return Promise.resolve(); } }) };
await VEG.init(ctx);
const v = th.vegetation, M = v.model;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const centre = lc => { const u = M.units.find(x => x.lc === lc); if (!u) throw new Error('no unit ' + lc); const r = u.rings[0]; let x = 0, y = 0, n = 0; for (let i = 0; i < r.length; i += 2) { x += r[i]; y += r[i + 1]; n++; } return T.xz(x / n, y / n); };
function viewFor(x, z, o = {}) {                       // as Theatre.viewFor
  const g = T.h(x, z), dist = o.dist ?? 140, h = o.height ?? 45, yaw = o.yaw ?? Math.PI * .75, cx = x - Math.sin(yaw) * dist, cz = z - Math.cos(yaw) * dist, cy = Math.max(T.h(cx, cz) + 3, g + h);
  const dx = x - cx, dy = g + 3 - cy, dz = z - cz; return { x: cx, y: cy, z: cz, yaw: Math.atan2(dx, dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)), fov: 62 };
}
const SUN = (() => { const s = [0.35, 0.85, 0.40], l = Math.hypot(...s); return s.map(q => q / l); })(), ANIM_T = 40;
function frameBlock(c) {                              // the frame block as GLRenderer.writeFU writes it (block 0)
  const cam = new Camera(); cam.x = c.x; cam.y = c.y; cam.z = c.z; cam.yaw = c.yaw; cam.pitch = c.pitch; cam.fov = c.fov * Math.PI / 180; cam.near = 0.25; cam.far = 14000; cam.update(W / Hh);
  const glVp = new Float32Array(cam.vp), glPrev = new Float32Array(cam.prevVp), glInv = new Float32Array(16); for (let i = 0; i < 4; i++) { glVp[i * 4 + 2] = cam.vp[i * 4 + 2] * 2 - cam.vp[i * 4 + 3]; glPrev[i * 4 + 2] = cam.prevVp[i * 4 + 2] * 2 - cam.prevVp[i * 4 + 3]; } invert(glVp, glInv);
  const f = new Float32Array(128), r = cam.right(), u = cam.up(), fw = cam.fwd; f.set(glVp, 0); f.set(glPrev, 16); f.set(glInv, 32); f.set(glVp, 48); f.set(glVp, 64);
  f.set([cam.x, cam.y, cam.z, ANIM_T], 80); f.set([SUN[0], SUN[1], SUN[2], 3.1], 84); f.set([W, Hh, 1 / W, 1 / Hh], 88); f.set([T.W, T.H, T.N, T.hmin], 92); f.set([T.hmax - T.hmin, 1, 0, 0], 96); f.set([40, 300, 9000, cam.far], 100);
  f.set([...r, 0], 104); f.set([...u, 0], 108); f.set([...fw, 0], 112); f.set([Math.tan(cam.fov / 2), W / Hh, 1, cam.near], 116); f.set([80, 0, 0, 1 / 2048], 120); return Array.from(f);
}
// ---- the views: a place (a unit of the layer by its stable name), a time, a camera, the readings of the choices
const VIEWS = [
  { label: 'wheatfield-2jul-noon', lc: 'LC-FIELD-0001', t: '1863-07-02T12:00', o: { dist: 420, height: 230, yaw: 2.2 } },
  { label: 'wheatfield-close-2jul-noon', lc: 'LC-FIELD-0001', t: '1863-07-02T12:00', o: { dist: 90, height: 22, yaw: 2.2 } },
  { label: 'wheatfield-2jul-20h30', lc: 'LC-FIELD-0001', t: '1863-07-02T20:30', o: { dist: 420, height: 230, yaw: 2.2 } },
  { label: 'wheatfield-3jul-noon', lc: 'LC-FIELD-0001', t: '1863-07-03T12:00', o: { dist: 420, height: 230, yaw: 2.2 } },
  { label: 'wheatfield-close-3jul-noon', lc: 'LC-FIELD-0001', t: '1863-07-03T12:00', o: { dist: 90, height: 22, yaw: 2.2 } },
  { label: 'wheatfield-14jul', lc: 'LC-FIELD-0001', t: '1863-07-14T12:00', o: { dist: 420, height: 230, yaw: 2.2 } },
  { label: 'wheatfield-19nov', lc: 'LC-FIELD-0001', t: '1863-11-19T12:00', o: { dist: 320, height: 170, yaw: 2.2 } },
  { label: 'peach-orchard-2jul', lc: 'LC-ORCH-0206', t: '1863-07-02T12:00', o: { dist: 160, height: 45, yaw: 0.9 } },
  { label: 'culps-hill-3jul', lc: 'LC-WOOD-0001', t: '1863-07-03T09:00', o: { dist: 520, height: 260, yaw: 1.2 } },
  { label: 'ground-2jul', at: [-100, -300], t: '1863-07-02T14:00', cam: { x: -300, y: 2700, z: 3100, pitch: -0.62 } },
  { label: 'ground-14jul', at: [-100, -300], t: '1863-07-14T14:00', cam: { x: -300, y: 2700, z: 3100, pitch: -0.62 } },
  { label: 'copse-of-trees-3jul', lc: 'LC-TREES-0039', t: '1863-07-03T12:00', o: { dist: 55, height: 14, yaw: 0.8 } },
  { label: 'zieglers-grove-3jul', lc: 'LC-WOOD-0127', t: '1863-07-03T12:00', o: { dist: 150, height: 40, yaw: 0.8 } },
  { label: 'meyers-orchard-19nov', lc: 'LC-ORCH-0046', t: '1863-11-19T12:00', o: { dist: 170, height: 45, yaw: 1.0 } },
  { label: 'lrt-east-default', lc: 'LC-WOOD-LRT-E', t: '1863-07-02T12:00', o: { dist: 300, height: 95, yaw: -Math.PI / 2 } },
  { label: 'lrt-east-unwooded', lc: 'LC-WOOD-LRT-E', t: '1863-07-02T12:00', o: { dist: 300, height: 95, yaw: -Math.PI / 2 }, choose: [['CF-VEG-LRT', 'wiki_unwooded']] },
  { label: 'lrt-east-light-summit', lc: 'LC-WOOD-LRT-E', t: '1863-07-02T12:00', o: { dist: 300, height: 95, yaw: -Math.PI / 2 }, choose: [['CF-VEG-LRT', 'wiki_light_summit']] },
  { label: 'houck-warren-woods', lc: 'LC-TREES-0009', t: '1863-07-02T12:00', o: { dist: 220, height: 80, yaw: 1.4 }, choose: [['CF-VEG-LRT', 'nps_clr']] },
  { label: 'houck-clear-cut', lc: 'LC-TREES-0009', t: '1863-07-02T12:00', o: { dist: 220, height: 80, yaw: 1.4 }, choose: [['CF-VEG-HOUCK', 'clear_cut']] },
  { label: 'understory-as-classed', lc: 'LC-WOOD-0001', t: '1863-07-03T09:00', o: { dist: 60, height: 12, yaw: 1.2 }, choose: [['CF-VEG-HOUCK', 'as_warren'], ['CF-VEG-UNDER', 'as_classed']] },
  { label: 'understory-dense', lc: 'LC-WOOD-0001', t: '1863-07-03T09:00', o: { dist: 60, height: 12, yaw: 1.2 }, choose: [['CF-VEG-UNDER', 'dense']] },
  { label: 'understory-open-grown', lc: 'LC-WOOD-0001', t: '1863-07-03T09:00', o: { dist: 60, height: 12, yaw: 1.2 }, choose: [['CF-VEG-UNDER', 'open_grown']] },
  { label: 'woods-sway-a', lc: 'LC-WOOD-0001', t: '1863-07-03T09:00', o: { dist: 45, height: 16, yaw: 1.2 }, choose: [['CF-VEG-UNDER', 'as_classed']] },
  { label: 'woods-sway-b', lc: 'LC-WOOD-0001', t: '1863-07-03T09:01', o: { dist: 45, height: 16, yaw: 1.2 } },
];
const frames = [];
for (const vw of VIEWS) {
  if (ONLY && !ONLY.includes(vw.label)) continue;
  for (const [id, key] of vw.choose || []) { v.choose(id, key); }
  await sleep(120);                                    // the woods are placed again 30 ms after a choice of the understory
  let c; if (vw.lc) { const [x, z] = centre(vw.lc); c = viewFor(x, z, vw.o); } else { const [x, z] = vw.at; c = viewFor(x, z, { dist: 1, height: 1 }); c = { ...c, ...vw.cam, yaw: Math.atan2(vw.at[0] - vw.cam.x, vw.at[1] - vw.cam.z), fov: 60 }; }
  const tMin = isoMin(vw.t); th.state.t = tMin; const camObj = { x: c.x, y: c.y, z: c.z, yaw: c.yaw, pitch: c.pitch, fov: c.fov * Math.PI / 180, near: 0.25, far: 14000 };
  for (let k = 0; k < 3; k++) VEG.update({ tMin, dtMs: 16, cam: camObj, paused: true, speed: 1 });
  ops.push(['frame', vw.label, frameBlock(c)]); hooks[0].scene(gl, R); ops.push(['end']);
  const st = v.status(); frames.push({ label: vw.label, t: vw.t, trees: st.trees, treesDrawn: st.treesDrawn, chunksNear: st.chunksNear, chunksFar: st.chunksFar, choose: vw.choose || [], cam: c });
  for (const [id] of vw.choose || []) v.choose(id, M.scenarios[id].default);          // back to the default before the next view
}
// ---- the world table the replay binds: the terrain's heights
const wr = (name, ta) => fs.writeFileSync(path.join(out, name), Buffer.from(ta.buffer, ta.byteOffset, ta.byteLength));
wr('world.height.f32', T.heights);
fs.writeFileSync(path.join(out, 'blobs.bin'), Buffer.concat(blobs.map(b => Buffer.from(b.buffer, b.byteOffset, b.byteLength))));
fs.writeFileSync(path.join(out, 'ops.json'), JSON.stringify(ops));
fs.writeFileSync(path.join(out, 'pre.glsl'), pre);
fs.writeFileSync(path.join(out, 'meta.json'), JSON.stringify({ W, H: Hh, TW, T: { N: T.N, W: T.W, H: T.H, hmin: T.hmin, hmax: T.hmax }, frames, calls: [...seen].sort() }, null, 1));
console.log(`recorded ${ops.length} GL ops (${(boff / 1e6).toFixed(1)} MB of data), ${frames.length} frames; calls seen: ${[...seen].sort().join(' ')}`);
for (const f of frames) console.log(` ${f.label}: trees ${f.trees}, drawn ${f.treesDrawn} (chunks near ${f.chunksNear}, far ${f.chunksFar})`);
VEG.dispose(); process.exit(0);

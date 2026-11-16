// Recorder of the NATIVE replay of the crowd's figure pass (the python half is tests/crowd-lod-native-replay.py). In node, with no browser and no GPU: the real layer at 13:30 on 3 July, the real crowd built with the REAL WebGL2 backend
// (src/crowd/gl.mjs, unchanged) whose `gl` is a recorder: every GL call the backend makes (textures, buffers, vertex arrays, programs, uniforms, draws) is written to <out>/ops.json with its data in <out>/blobs.bin, together with the
// frame blocks and the world tables the prototype's renderer would have bound (<out>/world.*). The replay then makes the same calls on a real OpenGL ES 3.2 context (Mesa llvmpipe, software) and writes the pictures.
//   node crowd-lod-native-record.mjs <outDir> [--near=7,7.5,...,14.5] [--far=62,64,...,90] [--modes=fade,hard] [--w=640] [--h=360]
// The unit it picks (the largest infantry unit present at 13:30) is on the march in a column of fours about a kilometre long, so the camera stands BESIDE the column, not in front of it (in front it would stand among the men).
// Scene 'track': the camera at the distance D from the middle man, on the side, looking at him: his distance is D, the pictures are the strips of one man crossing the 10 m, 13 m and 75 m boundaries. Scene 'diag': the camera 8 m
// (and 60 m) from the column looking 40 degrees along it, so that the men in view stand at a continuous range of distances (9 to 15 m, and 65 to 120 m) and the levels and the fades side by side.
// What it records is what gl.mjs does; what it does not run is the prototype's renderer (terrain, sky, shadows, post): the replay supplies a flat sky, no ground and no shadow maps (every fragment lit), so a picture shows the
// figures only. Takes about 25 s of CPU (the same build as tests/crowd-lod-build.test.mjs).
import fs from 'node:fs'; import path from 'node:path';
import { nodeWorld } from './node-world.mjs';
import { makeGeo } from '../src/geo.mjs';
import { loadRawFromDisk, terrainMeta } from '../tools/history-report.mjs';
import { createRealHistory } from '../src/history/real.mjs';
import { worldFromUnits } from '../src/world-from-units.mjs';
import { Stage } from '../src/stage.mjs';
import { minOf } from '../src/clock.mjs';
import { invert } from '../../render/prototype/src/math.mjs';
import { Camera } from '../../render/prototype/src/camera.mjs';
import { soldierPlace } from '../../render/prototype/src/world.mjs';
import { Crowd } from '../src/crowd/crowd.mjs';
import { decodeRange } from '../src/crowd/lod.mjs';
import { CrowdGL } from '../src/crowd/gl.mjs';
import { HEAD } from '../src/crowd/shaders-gl.mjs';
import { assemble, TW, pre } from './crowd-lod-glsl-sources.mjs';

const out = path.resolve(process.argv[2] || '.'); fs.mkdirSync(out, { recursive: true });
const opt = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const rng = (a, b, st) => { const o = []; for (let v = a; v <= b + 1e-9; v += st) o.push(+v.toFixed(3)); return o; };
const NEAR = opt('near', '').length ? opt('near', '').split(',').map(Number) : rng(7, 14.5, 0.5), FAR = opt('far', '').length ? opt('far', '').split(',').map(Number) : rng(62, 90, 2), MODES = opt('modes', 'fade,hard').split(','), W = Number(opt('w', 640)), Hh = Number(opt('h', 360));

// ---- the recorder
const ops = [], blobs = []; let boff = 0, hid = 0;
const CONST = { ARRAY_BUFFER: 0x8892, ELEMENT_ARRAY_BUFFER: 0x8893, DYNAMIC_DRAW: 0x88E8, STATIC_DRAW: 0x88E4, BYTE: 0x1400, UNSIGNED_BYTE: 0x1401, UNSIGNED_SHORT: 0x1403, UNSIGNED_INT: 0x1405, FLOAT: 0x1406, HALF_FLOAT: 0x140B,
  RGBA: 0x1908, RGBA_INTEGER: 0x8D99, RGBA8: 0x8058, RGBA16F: 0x881A, RGBA32F: 0x8814, RGBA16UI: 0x8D76, RGBA32UI: 0x8D70, SRGB8_ALPHA8: 0x8C43, TEXTURE_2D: 0x0DE1, TEXTURE_2D_ARRAY: 0x8C1A, TEXTURE0: 0x84C0,
  TEXTURE_MIN_FILTER: 0x2801, TEXTURE_MAG_FILTER: 0x2800, TEXTURE_WRAP_S: 0x2802, TEXTURE_WRAP_T: 0x2803, NEAREST: 0x2600, CLAMP_TO_EDGE: 0x812F, TRIANGLES: 4, TRIANGLE_STRIP: 5, CULL_FACE: 0x0B44, DEPTH_TEST: 0x0B71, BLEND: 0x0BE2,
  LESS: 0x0201, UNPACK_ALIGNMENT: 0x0CF5 };
const H = kind => ({ __h: ++hid, kind }), enc = a => (a && typeof a === 'object' && '__h' in a ? { h: a.__h } : a === undefined ? null : a);
const blob = (ta, so = 0, len) => { const bpe = ta.BYTES_PER_ELEMENT, n = (len ?? ta.length - so) * bpe; if (so * bpe + n > ta.byteLength) throw new Error('recorder: a source range past the end of its array'); blobs.push(new Uint8Array(ta.buffer, ta.byteOffset + so * bpe, n)); const r = [boff, n]; boff += n; return r; };
const CREATE = new Set(['createTexture', 'createBuffer', 'createVertexArray', 'createFramebuffer', 'createRenderbuffer']), seen = new Set();
const gl = new Proxy({}, { get(_, p) {
  if (typeof p !== 'string') return undefined;
  if (/^[A-Z0-9_]+$/.test(p)) { if (!(p in CONST)) throw new Error('recorder: GL constant ' + p + ' is not in the table'); return CONST[p]; }
  if (CREATE.has(p)) return () => { const h = H(p.slice(6).toLowerCase()); ops.push([p, h.__h]); return h; };
  if (p === 'getUniformLocation') return (prog, name) => { const h = H('loc'); ops.push([p, h.__h, prog.__h, name]); return h; };
  if (p === 'bufferData') return (t, d, u) => { ops.push(typeof d === 'number' ? [p, t, d, null, u] : [p, t, d.byteLength, blob(d), u]); };
  if (p === 'bufferSubData') return (t, off, d, so = 0, len) => { ops.push([p, t, off, blob(d, so, len)]); };
  if (p === 'texSubImage2D') return (t, l, x, y, w, h, f, ty, d, so = 0) => { ops.push([p, t, l, x, y, w, h, f, ty, d ? blob(d, so) : null]); };
  if (p === 'texSubImage3D') return (t, l, x, y, z, w, h, dd, f, ty, d, so = 0) => { ops.push([p, t, l, x, y, z, w, h, dd, f, ty, d ? blob(d, so) : null]); };
  if (p === 'getExtension' || p === 'getParameter') return () => null;
  return (...a) => { seen.add(p); ops.push([p, ...a.map(enc)]); };
} });
const R = { gl, o: { flags: { near: 1, mid: 1, far: 1 } }, cfg: {}, W, H: Hh, mem: { buffers: 0, textures: 0 }, track() { },
  prog(name, vs, fs) { const h = H('program'), p = assemble(vs, fs); ops.push(['prog', h.__h, name, p.vs, p.fs]); return h; }, finishProgs() { ops.push(['finishProgs']); } };

// ---- the real layer, world, stage and crowd (as tests/crowd-lod-build.test.mjs)
const raw = loadRawFromDisk(), TM = terrainMeta(), { T } = await nodeWorld(), geo = makeGeo(T);
const L = createRealHistory({ raw, T: TM, helpers: { civilDawn: m => m + 4 * 60 + 3 } }), world = worldFromUnits(T, geo, L), stage = new Stage({ layer: L, world, T, geo });
stage.loadScenario({ id: 'pdf-recommended', choices: {}, optionText: {} });
const tMin = minOf(7, 3, 13) + 30; stage.apply(tMin); const ANIM_T = 40 + (tMin * 60) % 7200;
const host = { api: 'webgl2', R, setCrowd(c) { this.crowd = c; } };
const crowd = await Crowd.create(host, { layer: L, world, stage, T, settings: { nearR: 40, midR: 300 }, backend: CrowdGL, progress() { } });
if (!(crowd.be instanceof CrowdGL)) throw new Error('the crowd did not take the WebGL2 backend');

let pick = -1, bc = 0; for (let i = 0; i < L.units.length; i++) if (stage.present[i] === 1 && L.units[i].arm === 'infantry' && world.units[i].count > bc) { bc = world.units[i].count; pick = i; }
const U = world.units[pick], mid = U.first + (U.count >> 1), tmp = [0, 0, 0]; soldierPlace(world, mid, ANIM_T, tmp); const FX = tmp[0], FZ = tmp[1], HD = stage.ch[pick];
const FOV = 2 * Math.atan((Hh / 1080) * Math.tan(Math.PI / 6));                 // 1 m covers the same pixels as in 1080p at 60 degrees, in a frame of this height
function camera(D, turnDeg = 0, eye = 1.7) {                       // beside the column (perpendicular to its heading), D from the middle man; turnDeg: look this far along the column from the perpendicular
  const sx = Math.cos(HD), sz = -Math.sin(HD), ax = Math.sin(HD), az = Math.cos(HD), ex = FX + sx * D, ez = FZ + sz * D, ey = T.h(ex, ez) + eye, along = D * Math.tan(turnDeg * Math.PI / 180);
  const tx = FX + ax * along, tz = FZ + az * along, ty = T.h(tx, tz) + 1.2, yaw = Math.atan2(tx - ex, tz - ez), pitch = Math.atan2(ty - ey, Math.hypot(tx - ex, tz - ez)), cp = Math.cos(pitch);
  return { x: ex, y: ey, z: ez, fwd: [Math.sin(yaw) * cp, Math.sin(pitch), Math.cos(yaw) * cp], yaw, pitch, fov: FOV, near: 0.25, far: 6000 }; }
// the frame block as GLRenderer.writeFU writes it (block 0), for the same camera
const SUN = (() => { const s = [0.35, 0.85, 0.40], l = Math.hypot(...s); return s.map(v => v / l); })();
function frameBlock(c) {
  const cam = new Camera(); cam.x = c.x; cam.y = c.y; cam.z = c.z; cam.yaw = c.yaw; cam.pitch = c.pitch; cam.fov = c.fov; cam.near = c.near; cam.far = c.far; cam.update(W / Hh);
  const glVp = new Float32Array(cam.vp), glPrev = new Float32Array(cam.prevVp), glInv = new Float32Array(16); for (let i = 0; i < 4; i++) { glVp[i * 4 + 2] = cam.vp[i * 4 + 2] * 2 - cam.vp[i * 4 + 3]; glPrev[i * 4 + 2] = cam.prevVp[i * 4 + 2] * 2 - cam.prevVp[i * 4 + 3]; } invert(glVp, glInv);
  const f = new Float32Array(128), r = cam.right(), u = cam.up(), fw = cam.fwd; f.set(glVp, 0); f.set(glPrev, 16); f.set(glInv, 32); f.set(glVp, 48); f.set(glVp, 64);        // sm0, sm1: unused (no shadow maps)
  f.set([cam.x, cam.y, cam.z, ANIM_T], 80); f.set([SUN[0], SUN[1], SUN[2], 3.1], 84); f.set([W, Hh, 1 / W, 1 / Hh], 88); f.set([T.W, T.H, T.N, T.hmin], 92); f.set([T.hmax - T.hmin, 1, 0, 0], 96); f.set([40, 300, 9000, cam.far], 100);
  f.set([...r, 0], 104); f.set([...u, 0], 108); f.set([...fw, 0], 112); f.set([Math.tan(cam.fov / 2), W / Hh, 1, cam.near], 116); f.set([80, 0, 0, 1 / 2048], 120); return Array.from(f);
}
// ---- the frames
const frames = [], SPEC = [...NEAR.map(D => ({ scene: 'track', D, turn: 0, grp: 'near' })), ...FAR.map(D => ({ scene: 'track', D, turn: 0, grp: 'far' })), { scene: 'diag', D: 8, turn: 40, grp: 'near' }, { scene: 'diag', D: 60, turn: 40, grp: 'far' }];
for (const mode of MODES) for (const sp of SPEC) {
  crowd.lod.band = mode === 'hard' ? 0 : 0.075; crowd.lod.hyst = mode === 'hard' ? 0 : 0.10;
  const c = camera(sp.D, sp.turn); crowd.prepare(c, ANIM_T); const fl = crowd.fl, st = crowd.stats, label = `${sp.scene}-${mode}-${sp.D}`;
  let me = null; for (let j = 0; j < fl.n; j++) if (fl.fig[j] === mid) { const sh = [0, 1, 2].map(l => { if (!((fl.mask[j] >> l) & 1)) return 0; const d = decodeRange(fl.p[j * 3 + l]); return Math.max(0, Math.min(d.hi, 1) - d.lo); }); me = { mask: fl.mask[j], shares: sh.map(v => +v.toFixed(3)), dist: +Math.sqrt(fl.d2[j]).toFixed(2) }; }
  frames.push({ label, scene: sp.scene, mode, D: sp.D, grp: sp.grp, turn: sp.turn, listed: fl.n, records: crowd.frameData.instBytes / 48, draws: crowd.frameData.draws.length, lod0: st.lod0, fading: st.fading, man: me });
  ops.push(['frame', label, frameBlock(c)]); crowd.scene(gl); ops.push(['end']);
}
// ---- the world tables the prototype's renderer binds on units 0..6
const pad = (arr, texels) => { const rows = Math.ceil(texels / TW), d = new Float32Array(TW * rows * 4); d.set(arr); return { d, rows }; };
const s0 = pad(world.sold, world.count), s1 = pad(world.sold1, world.count), un = pad(world.unitF, world.units.length * 3);
const wr = (name, ta) => fs.writeFileSync(path.join(out, name), Buffer.from(ta.buffer, ta.byteOffset, ta.byteLength));
wr('world.sold0.f32', s0.d); wr('world.sold1.f32', s1.d); wr('world.units.f32', un.d); wr('world.height.f32', T.heights);
fs.writeFileSync(path.join(out, 'blobs.bin'), Buffer.concat(blobs.map(b => Buffer.from(b.buffer, b.byteOffset, b.byteLength))));
fs.writeFileSync(path.join(out, 'ops.json'), JSON.stringify(ops));
const meta = { probe: { mid, x: FX, z: FZ, groundY: T.h(FX, FZ), camGround: T.h(camera(10).x, camera(10).z), cam10: [camera(10).x, camera(10).y, camera(10).z] }, W, H: Hh, TW, rows: { sold0: s0.rows, sold1: s1.rows, units: un.rows }, T: { N: T.N, W: T.W, H: T.H, hmin: T.hmin, hmax: T.hmax }, frames, unit: { id: L.units[pick].id ?? pick, men: U.count, at: [FX, FZ], heading: HD }, animT: ANIM_T, tMin, glCallsNotMapped: [...seen].sort(), ops: ops.length, blobBytes: boff };
fs.writeFileSync(path.join(out, 'pre.glsl'), pre); fs.writeFileSync(path.join(out, 'meta.json'), JSON.stringify(meta, null, 1));
console.log(`recorded ${ops.length} GL ops (${(boff / 1e6).toFixed(1)} MB of data), ${frames.length} frames; unit ${meta.unit.id} with ${U.count} men; calls seen: ${meta.glCallsNotMapped.join(' ')}`);
for (const f of frames) console.log(` ${f.label}: listed ${f.listed}, records ${f.records}, draws ${f.draws}, lod0 ${f.lod0}, fading ${f.fading}, middle man ${JSON.stringify(f.man)}`);

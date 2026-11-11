// THE CROWD: every drawn figure, one-to-one, with the FIGURES models, the ANIMATION state machine and the level of detail of the film-grade plan. It replaces the prototype's single soldier model in the shell
// (the prototype's own near / mid / far flags are switched off; guns, terrain, sky and the prototype's particle pass stay).
//   LOD0  parts of the man's own kit (head, hair, hands, coat, trousers, shoes, hat, accoutrements, arm ...), 61 bones, posed on the CPU by anim3d (foot planting on the real ground)          d <  R0   (10 m at 1080p / 60 degrees)
//   LOD1  merged class mesh + accessory mesh, 36 bones, bone-matrix texture                                                                                                                R0 .. R1  (13 m)
//   LOD2  low class mesh + accessory mesh, 36 bones, bone-matrix texture                                                                                                                   R1 .. R2  (75 m)
//   FAR   baked impostor views (material ids, colours from the outfit variant) for EVERY figure beyond R2: one instanced draw over the whole world, no cap                                      R2 ..
//   Horses (mounted units) use the horse meshes LOD0 / 1 / 2 with the horse bone texture at the same radii.
// The radii are the figures3d hand-over distances (handover.json: 10 m, 13 m, 75 m measured at 1080p) scaled by vertical pixels / 1080 and by tan(30 degrees) / tan(fov / 2); the two sliders of the Settings panel move them.
// No figure is ever dropped: when more than LOD0_BUDGET men are inside R0 the nearest keep LOD0 and the others are drawn at LOD1 (a triangle budget, the plan's WebGL2 rule). Cross-fade and hysteresis are NOT implemented (verification list).
import { URLS } from '../config.mjs';
import { buildCrowdData } from './data.mjs';
import { CrowdAnim } from './anim.mjs';
import { ClipBank, CORE } from './clips.mjs';
import { MeshStore } from './meshes.mjs';
import { buildPal, PAL_W, PAL_H, NSLOT } from './tables.mjs';
import { partsForFigure, partsAtLod, unpackInstance } from '../figures3d/index.mjs';
import { SEL_TH } from '../anim3d/unit-anim.mjs';
import { perspective, lookAt, mul, frustumPlanes, sphereInFrustum } from '../../../render/prototype/src/math.mjs';
import { soldierPlace } from '../../../render/prototype/src/world.mjs';

export const LOD_BASE = { r0: 10, r1: 13, r2: 75 };       // metres at 1080p, 60 degrees (figures3d handover.json)
export const LOD0_BUDGET = 96;                            // men at LOD0 at once (WebGL2 triangle-budget rule); the rest of those inside R0 are drawn at LOD1
const REC = 12;                                           // words per instance record (48 bytes)
const tick = () => new Promise(r => setTimeout(r, 0));
const H30 = Math.PI / 6;

export class Crowd {
  static async create(host, o) { const c = new Crowd(host, o); await c.build(o.progress || (() => {})); return c; }
  constructor(host, o) {
    this.host = host; this.layer = o.layer; this.world = o.world; this.stage = o.stage; this.T = o.T; this.api = host.api; this.dead = false; this.settings = o.settings || { nearR: 40, midR: 300 };
    this.stats = { lod0: 0, lod1: 0, lod2: 0, horse: 0, far: 0, draws: 0, tris: 0, records: 0, selectMs: 0, animMs: 0, bakeMs: 0, parts: 0, classes: 0 }; this.meshes = new MeshStore(); this.tmp = [0, 0, 0]; this.pl = { view: new Float32Array(16), proj: new Float32Array(16), vp: new Float32Array(16), planes: new Float32Array(24) };
    this.cap = 0; this._grow(4096); this.inst = new ArrayBuffer(48 * 4096); this.instF = new Float32Array(this.inst); this.instU = new Uint32Array(this.inst); this.nearCap = LOD0_BUDGET; this.pose = new Float32Array(this.nearCap * 61 * 12);
    this.partCache = new Map(); this.draws = []; this.rowsTmp = new Float64Array(3); this.nUnits = this.world.units.length; this.lastR = { r0: 0, r1: 0, r2: 0 };
  }
  _grow(n) {
    const keep = this.cap ? { fig: this.wFig, unit: this.wUnit, k: this.wK, x: this.wX, z: this.wZ, h: this.wH, d2: this.wD2, lod: this.wLod, ra: this.wRA, rb: this.wRB, fa: this.wFA, fb: this.wFB, wb: this.wWB, hr: this.wHR, hf: this.wHF, mount: this.wMt, key: this.wKey, key2: this.wKey2 } : null;
    this.cap = n; const mk = (C, old) => { const a = new C(n); if (old) a.set(old.subarray(0, Math.min(old.length, n))); return a; };
    this.wFig = mk(Int32Array, keep && keep.fig); this.wUnit = mk(Int32Array, keep && keep.unit); this.wK = mk(Int32Array, keep && keep.k); this.wX = mk(Float32Array, keep && keep.x); this.wZ = mk(Float32Array, keep && keep.z); this.wH = mk(Float32Array, keep && keep.h); this.wD2 = mk(Float32Array, keep && keep.d2);
    this.wLod = mk(Uint8Array, keep && keep.lod); this.wRA = mk(Uint32Array, keep && keep.ra); this.wRB = mk(Uint32Array, keep && keep.rb); this.wFA = mk(Float32Array, keep && keep.fa); this.wFB = mk(Float32Array, keep && keep.fb); this.wWB = mk(Float32Array, keep && keep.wb);
    this.wHR = mk(Uint32Array, keep && keep.hr); this.wHF = mk(Float32Array, keep && keep.hf); this.wMt = mk(Uint8Array, keep && keep.mount); this.wKey = mk(Int32Array, keep && keep.key); this.wKey2 = mk(Int32Array, keep && keep.key2);
    this.order = new Int32Array(n); this.order2 = new Int32Array(n);
  }

  // ---------------------------------------------------------------------------------------------------- loading (time-sliced: no long task)
  async build(progress) {
    const t0 = performance.now(), world = this.world, layer = this.layer;
    progress(0.0, 'Dressing every figure from its kit manifest');
    this.D = await buildCrowdData({ layer, world, progress: f => progress(f * 0.55, 'Dressing every figure from its kit manifest') }); if (!this.D) throw new Error('the layer has no per-figure kit manifests');
    if (this.dead) return; const sys = this.sys = this.D.sys;
    progress(0.56, 'Preparing the animation'); await tick();
    const skeleton = await (await fetch(URLS.app + 'data/figures3d/skeleton.json')).json(), flagMean = ((await (await fetch(URLS.app + 'data/figures3d/flag-mean-colours.json')).json()) || {}).mean || {};
    this.driver = new CrowdAnim({ skeleton, world, layer, stage: this.stage }); this.bank = new ClipBank(this.driver.lib); await tick();
    let n = 0, s0 = performance.now(); const nClips = this.bank.prebakeIds(CORE).length;
    for (const clip of this.bank.prebake(CORE)) { n++; void clip; if (performance.now() - s0 > 25) { progress(0.58 + 0.12 * n / nClips, 'Baking the animation clips'); await tick(); s0 = performance.now(); if (this.dead) return; } }
    // meshes: the class meshes of every outfit class that occurs (merged LOD1, low LOD2, accessory sets), the horse, the impostor atlas
    const cl = this.D.classes, nC = cl.silhouettes.length; this.cls = { mid: new Array(nC), low: new Array(nC), acc1: new Array(cl.accessories.length), acc2: new Array(cl.accessories.length) }; s0 = performance.now();
    for (let c = 0; c < nC; c++) {
      const key = cl.silhouettes[c].key; this.cls.mid[c] = this.meshes.add('m1:' + c, sys.midMesh(key).finalize()); this.cls.low[c] = this.meshes.add('m2:' + c, sys.lowMesh(key).finalize());
      if (performance.now() - s0 > 25) { progress(0.7 + 0.15 * c / nC, 'Building the figure models'); await tick(); s0 = performance.now(); if (this.dead) return; }
    }
    cl.accessories.forEach((a, i) => { const [k, army] = a.key.split('|'); this.cls.acc1[i] = this.meshes.add('a1:' + i, sys.accessoryMesh(k, army, 1).finalize()); this.cls.acc2[i] = this.meshes.add('a2:' + i, sys.accessoryMesh(k, army, 2).finalize()); });
    this.horseM = [0, 1, 2].map(l => this.meshes.add('h:' + l, sys.horse(l).finalize())); await tick();
    const imp = this.imp = { w: 0, h: 0, layers: cl.impostors.length, data: null, meta: null }; s0 = performance.now(); let atl = null;
    for (let i = 0; i < cl.impostors.length; i++) {
      const a = sys.impostor(cl.impostors[i].key); if (!atl) { imp.w = a.width; imp.h = a.height; atl = new Uint8Array(imp.w * imp.h * 4 * imp.layers); imp.meta = new Float32Array(imp.layers * 4); }
      if (a.width !== imp.w || a.height !== imp.h) throw new Error('impostor atlases differ in size'); atl.set(a.rgba, i * imp.w * imp.h * 4); imp.meta[i * 4] = a.height_m; imp.meta[i * 4 + 1] = a.ppm;
      if (performance.now() - s0 > 25) { progress(0.86 + 0.08 * i / cl.impostors.length, 'Baking the far views'); await tick(); s0 = performance.now(); if (this.dead) return; }
    }
    imp.data = atl; progress(0.95, 'Starting the figure pass'); await tick();
    const S = this.S = { count: this.D.count, nVariants: this.D.nVariants, nslot: NSLOT, inst: this.D.inst, varInfo: this.D.varInfo, varPal: this.D.varPal, pal: buildPal(flagMean), palW: PAL_W, palH: PAL_H, nearCap: this.nearCap, banks: { human: this.bank.human, horse: this.bank.horse }, imp };
    const R = this.host.R; R.o.flags.near = 0; R.o.flags.mid = 0; R.o.flags.far = 0; R.cfg.nearR = 0.01; R.cfg.midR = 0.01;            // the prototype soldiers off: its selection pass sees no unit in range
    if (this.api === 'webgpu') { const { CrowdGPU } = await import('./gpu.mjs'); this.be = new CrowdGPU(this.host, this); } else { const { CrowdGL } = await import('./gl.mjs'); this.be = new CrowdGL(this.host, this); }
    this.be.init(S); this.host.setCrowd(this);
    this.driver.anim.setPlacement((id, k, t, out) => this.placement(id, k, out));
    this.stats.buildMs = Math.round(performance.now() - t0); this.stats.classes = nC; progress(1, 'Figures ready');
  }
  scene(p) { if (!this.dead && this.be) this.be.scene(p); }
  shadow(p, c) { if (!this.dead && this.be) this.be.shadow(p, c); }

  // ---------------------------------------------------------------------------------------------------- per frame
  radii() {
    const R = this.host.R, cam = this.cam, S = this.settings, H = R.H || 1080, k = (H / 1080) * (Math.tan(H30) / Math.tan(cam.fov / 2)), a = (S.nearR || 40) / 40, b = (S.midR || 300) / 300;
    return { r0: LOD_BASE.r0 * k * a, r1: LOD_BASE.r1 * k * a, r2: LOD_BASE.r2 * k * b };
  }
  _frustum(cam, aspect) { const a = this.pl, f = cam.fwd; lookAt([cam.x, cam.y, cam.z], [cam.x + f[0], cam.y + f[1], cam.z + f[2]], [0, 1, 0], a.view); perspective(cam.fov, aspect, cam.near, cam.far, a.proj); mul(a.proj, a.view, a.vp); frustumPlanes(a.vp, a.planes); return a.planes; }
  // select the figures near the camera, evaluate their animation, build the instance records and the draw list for both backends
  prepare(cam, animT) {
    if (this.dead || !this.be) return; this.cam = cam; const st = this.stage, w = this.world, T = this.T, R = this.host.R, t0 = performance.now(), tSec = (st.tNow ?? 0) * 60;
    const rad = this.lastR = this.radii(), planes = this._frustum(cam, R.W / R.H), r2sq = rad.r2 * rad.r2, r0sq = rad.r0 * rad.r0, r1sq = rad.r1 * rad.r1, f = w.unitF, tmp = this.tmp, D = this.D, nU = this.nUnits;
    let n = 0;
    for (let ui = 0; ui < nU; ui++) {
      if (st.present[ui] !== 1) continue; const u = w.units[ui], o = ui * 12, ux = f[o], uz = f[o + 1], uy = T.h(ux, uz) + 1;
      if (Math.hypot(ux - cam.x, uy - cam.y, uz - cam.z) - u.radius > rad.r2) continue; if (!sphereInFrustum(planes, ux, uy, uz, u.radius + 2)) continue;
      const mounted = u.klass === 1;
      for (let k = 0; k < u.count; k++) {
        const i = u.first + k; soldierPlace(w, i, animT, tmp); const x = tmp[0], z = tmp[1], y = T.h(x, z) + (mounted ? 1.3 : 0.9), dx = x - cam.x, dy = y - cam.y, dz = z - cam.z, d2 = dx * dx + dy * dy + dz * dz;
        if (d2 > r2sq) continue; if (!sphereInFrustum(planes, x, y, z, mounted ? 2.2 : 1.3)) continue;
        if (n >= this.cap) this._grow(this.cap * 2);
        this.wFig[n] = i; this.wUnit[n] = ui; this.wK[n] = k; this.wX[n] = x; this.wZ[n] = z; this.wH[n] = tmp[2]; this.wD2[n] = d2; this.wMt[n] = mounted ? 1 : 0; this.wLod[n] = d2 < r0sq ? 0 : d2 < r1sq ? 1 : 2; n++;
      }
    }
    // the LOD0 triangle budget: the nearest keep LOD0, the others are drawn at LOD1 (nobody is dropped)
    let n0 = 0; for (let j = 0; j < n; j++) if (this.wLod[j] === 0) n0++;
    if (n0 > this.nearCap) { const ix = []; for (let j = 0; j < n; j++) if (this.wLod[j] === 0) ix.push(j); ix.sort((a, b) => this.wD2[a] - this.wD2[b] || this.wFig[a] - this.wFig[b]); for (let q = this.nearCap; q < ix.length; q++) this.wLod[ix[q]] = 1; n0 = this.nearCap; }
    this.host.animT = animT; if (this.driver.anim.bus.stats && (this.host.fxWants !== false)) this._ensureAnimators(6);
    const t1 = performance.now(); this._build(n, tSec); const t2 = performance.now();
    this.stats.selectMs = t1 - t0; this.stats.animMs = t2 - t1; this.stats.bakeMs = this.bank.bakeMs; this.stats.far = w.count - n; this.stats.listed = n; void D;
    const F = this.frameData; F.impostors = true; F.nWorld = w.count; F.r2 = rad.r2; this.be.upload(F);
  }
  // anim3d placement hook (events carry world positions): k = -1 the unit's centre; the current frame's tables (events of the window just before now)
  placement(id, k, out) {
    const ui = this.driver.byId.get(id); if (ui === undefined || this.stage.present[ui] !== 1) return false; const w = this.world.units[ui], f = this.world.unitF;
    if (k < 0 || k >= w.count) { out.x = f[ui * 12]; out.z = f[ui * 12 + 1]; out.yaw = f[ui * 12 + 2]; } else { soldierPlace(this.world, w.first + k, this.host.animT ?? 0, this.tmp); out.x = this.tmp[0]; out.z = this.tmp[1]; out.yaw = this.tmp[2]; }
    out.y = this.T.h(out.x, out.z); return true;
  }
  // every unit that is on the field gets its animator (events of the whole field, drawn or not): a few milliseconds a frame
  _ensureAnimators(budgetMs) { const t0 = performance.now(), st = this.stage; for (let ui = 0; ui < this.nUnits && performance.now() - t0 < budgetMs; ui++) if (st.present[ui] === 1) this.driver.get(ui); }
  _build(n, tSec) {
    const w = this.world, D = this.D, drv = this.driver, bank = this.bank, sel = drv.sel, rows = this.rowsTmp, T = this.T, sys = this.sys;
    let c0 = 0, c1 = 0, c2 = 0, nh = 0, nPose = 0; const mid = this.cls;
    // 1. animation for everyone listed: clip rows for LOD1 / LOD2 (and the horse of a mounted man); the full pose for LOD0
    for (let j = 0; j < n; j++) {
      const ui = this.wUnit[j], k = this.wK[j], lod = this.wLod[j]; drv.clipAt(ui, k, tSec);
      if (lod === 0) { this.wFA[j] = nPose; drv.pose(ui, k, tSec, this.wX[j], this.wZ[j], this.wH[j], T.h, this.pose, nPose * 61 * 12); nPose++; c0++; }
      else {
        bank.rows(sel.a, sel.d[0], rows, 0); this.wRA[j] = rows[0] | (rows[1] << 16); this.wFA[j] = rows[2];
        if (sel.b >= 0 && sel.d[2] > 0) { bank.rows(sel.b, sel.d[1], rows, 0); this.wRB[j] = rows[0] | (rows[1] << 16); this.wFB[j] = rows[2]; this.wWB[j] = sel.d[2]; } else { this.wRB[j] = this.wRA[j]; this.wFB[j] = 0; this.wWB[j] = 0; }
        if (lod === 1) c1++; else c2++;
      }
      if (this.wMt[j]) { const h = sel.h >= 0 ? sel.h : drv.ua[ui].iHorseIdle; bank.rows(h, sel.h >= 0 ? sel.d[SEL_TH] : tSec, rows, 0); this.wHR[j] = rows[0] | (rows[1] << 16); this.wHF[j] = rows[2]; nh++; }
    }
    this.stats.lod0 = c0; this.stats.lod1 = c1; this.stats.lod2 = c2; this.stats.horse = nh;
    // 2. instance records and draws. capacity: LOD0 parts (about 30 per man), LOD1 / LOD2 x (class + accessory), horses
    const need = (c0 * 40 + (c1 + c2) * 2 + nh) * REC; if (need * 4 > this.inst.byteLength) { this.inst = new ArrayBuffer(Math.max(need * 4, this.inst.byteLength * 2)); this.instF = new Float32Array(this.inst); this.instU = new Uint32Array(this.inst); this.inst8 = null; }
    const F = this.frameData || (this.frameData = { draws: [], inst: null, instBytes: 0, pose: this.pose, nPose: 0 }); const draws = F.draws; draws.length = 0; let rec = 0; const f32 = this.instF, u32 = this.instU;
    const put = (j, x1, x2, x3, u1, u2, u3) => { const o = rec * REC; f32[o] = this.wX[j]; f32[o + 1] = this.wZ[j]; f32[o + 2] = this.wH[j]; f32[o + 3] = 1; f32[o + 4] = x1; f32[o + 5] = x2; f32[o + 6] = x3; f32[o + 7] = 0; u32[o + 8] = this.wFig[j]; u32[o + 9] = u1; u32[o + 10] = u2; u32[o + 11] = u3; rec++; };
    // LOD0: per part, the men that wear it
    if (c0) {
      const byPart = new Map();
      for (let j = 0; j < n; j++) if (this.wLod[j] === 0) {
        const wd = D.inst.subarray(this.wFig[j] * 4, this.wFig[j] * 4 + 4), U = unpackInstance(wd), V = sys.table.list[U.kit_variant], parts = partsAtLod(partsForFigure(V, U.acc_mask, U.flags, { head: U.head, hair: U.hair_style, facial: U.facial_hair }), 0);
        for (const p of parts) { let a = byPart.get(p.id); if (!a) byPart.set(p.id, a = []); a.push(j); }
      }
      for (const [id, js] of byPart) {
        let e = this.partCache.get(id); if (!e) { e = this.meshes.add('p0:' + id, sys.mesh(id, 0).finalize()); this.partCache.set(id, e); this.stats.parts = this.partCache.size; }
        if (!e.indexCount) continue; const first = rec; for (const j of js) put(j, 0, 0, 0, this.wFA[j], 0, 0);
        draws.push({ near: true, bank: null, first: e.firstIndex, count: e.indexCount, off: first * 48, n: js.length });
      }
    }
    // LOD1 and LOD2: sorted by class (counting sort), a second pass for the accessory class
    const nC = D.classes.silhouettes.length, nA = D.classes.accessories.length;
    for (const lod of [1, 2]) {
      const js = []; for (let j = 0; j < n; j++) if (this.wLod[j] === lod) js.push(j); if (!js.length) continue;
      const pass = (keyOf, count, store) => {
        const startA = new Uint32Array(count + 1); for (const j of js) startA[keyOf(j) + 1]++; for (let q = 0; q < count; q++) startA[q + 1] += startA[q];
        const pos = startA.slice(0, count), order = new Int32Array(js.length); for (const j of js) order[pos[keyOf(j)]++] = j; const base = rec;
        for (let q = 0; q < order.length; q++) { const j = order[q]; put(j, this.wFA[j], this.wFB[j], this.wWB[j], this.wRA[j], this.wRB[j], 0); }
        for (let c = 0; c < count; c++) { const nn = startA[c + 1] - startA[c]; if (nn <= 0) continue; const e = store[c]; if (!e || !e.indexCount) continue; draws.push({ near: false, bank: 'human', first: e.firstIndex, count: e.indexCount, off: (base + startA[c]) * 48, n: nn }); }
      };
      const mk = j => D.varInfo[(D.inst[this.wFig[j] * 4] & 0xffff) * 4], ak = j => D.varInfo[(D.inst[this.wFig[j] * 4] & 0xffff) * 4 + 1];
      pass(mk, nC, lod === 1 ? mid.mid : mid.low); if (nA) pass(ak, nA, lod === 1 ? mid.acc1 : mid.acc2);
    }
    // horses
    if (nh) for (const lod of [0, 1, 2]) {
      const first = rec; let cnt = 0; for (let j = 0; j < n; j++) if (this.wMt[j] && this.wLod[j] === lod) { put(j, this.wHF[j], 0, 0, this.wHR[j], this.wHR[j], 0); cnt++; }
      if (cnt) { const e = this.horseM[lod]; draws.push({ near: false, bank: 'horse', first: e.firstIndex, count: e.indexCount, off: first * 48, n: cnt }); }
    }
    F.inst = this.inst8 || (this.inst8 = new Uint8Array(this.inst)); F.instBytes = rec * 48; F.nPose = nPose; F.pose = this.pose; this.stats.records = rec; this.stats.draws = draws.length; this.stats.tris = draws.reduce((a, d) => a + d.count / 3 * d.n, 0);
  }

  destroy() {
    if (this.dead) return; this.dead = true;
    try { if (this.host && this.host.crowd === this) this.host.crowd = null; if (this.be) this.be.destroy(); } catch (e) { console.warn('crowd teardown', e); }
    this.be = null; this.driver = null; this.bank = null; this.meshes = null; this.D = null; this.sys = null; this.partCache.clear(); this.frameData = null;
  }
}

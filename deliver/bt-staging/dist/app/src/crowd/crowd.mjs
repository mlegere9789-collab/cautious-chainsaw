// THE CROWD: every drawn figure, one-to-one, with the FIGURES models, the ANIMATION state machine and the level of detail of the film-grade plan. It replaces the prototype's single soldier model in the shell
// (the prototype's own near / mid / far flags are switched off; guns, terrain, sky and the prototype's particle pass stay).
//   LOD0  parts of the man's own kit (head, hair, hands, coat, trousers, shoes, hat, accoutrements, arm ...), 61 bones, posed on the CPU by anim3d (foot planting on the real ground)          d <  R0   (10 m at 1080p / 60 degrees)
//   LOD1  merged class mesh + accessory mesh, 36 bones, bone-matrix texture                                                                                                                R0 .. R1  (13 m)
//   LOD2  low class mesh + accessory mesh, 36 bones, bone-matrix texture                                                                                                                   R1 .. R2  (75 m)
//   FAR   baked impostor views (material ids, colours from the outfit variant) for EVERY figure beyond R2: one instanced draw over the whole world, no cap                                      R2 ..
//   Horses (mounted units) use the horse meshes LOD0 / 1 / 2 with the horse bone texture at the same radii.
// The radii are the figures3d hand-over distances (handover.json: 10 m, 13 m, 75 m measured at 1080p) scaled by vertical pixels / 1080 and by tan(30 degrees) / tan(fov / 2); the two sliders of the Settings panel move them.
// No figure is ever dropped: when more than LOD0_BUDGET men could be at LOD0 the LOD0 radius is cut to the distance of the K-th nearest (a triangle budget, the plan's WebGL2 rule), not to a rank.
// CROSS-FADE (lod.mjs): every swap between levels, and between the low mesh and the impostor, is a dithered fade over 15 percent of the radius with a per-figure spread of the thresholds (10 percent); the picture is a pure function of (time, camera).
import { URLS } from '../config.mjs';
import { buildCrowdData } from './data.mjs';
import { CrowdAnim } from './anim.mjs';
import { ClipBank, CORE } from './clips.mjs';
import { MeshStore } from './meshes.mjs';
import { buildPal, PAL_W, PAL_H, NSLOT } from './tables.mjs';
import { partsForFigure, partsAtLod, unpackInstance } from '../figures3d/index.mjs';
import { LED, BATTERY_HORSE_LOSSES, batteryHorseFalls } from '../history/cavalry.mjs';
import { SEL_TH, SEL_HX, SEL_HZ, SEL_MZ } from '../anim3d/unit-anim.mjs';
import { perspective, lookAt, mul, frustumPlanes, sphereInFrustum } from '../../../render/prototype/src/math.mjs';
import { soldierPlace } from '../../../render/prototype/src/world.mjs';
import { FigureList, LOD_BASE, LOD0_BUDGET, lodOptions, lodRadii, selectFigures, edgeRange } from './lod.mjs';

export { LOD_BASE, LOD0_BUDGET };                         // metres at 1080p, 60 degrees (figures3d handover.json); men at LOD0 at once (WebGL2 triangle-budget rule)
const REC = 12;                                           // words per instance record (48 bytes)
const tick = () => new Promise(r => setTimeout(r, 0));

export class Crowd {
  static async create(host, o) { const c = new Crowd(host, o); await c.build(o.progress || (() => {})); return c; }
  constructor(host, o) {
    this.host = host; this.layer = o.layer; this.world = o.world; this.stage = o.stage; this.T = o.T; this.api = host.api; this.dead = false; this.settings = o.settings || { nearR: 40, midR: 300 };
    this.stats = { lod0: 0, lod1: 0, lod2: 0, horse: 0, far: 0, draws: 0, tris: 0, records: 0, selectMs: 0, animMs: 0, bakeMs: 0, parts: 0, classes: 0, fading: 0, listed: 0, r0e: 0, budgetCut: false, bands: [0, 0, 0] }; this.meshes = new MeshStore(); this.tmp = [0, 0, 0]; this.pl = { view: new Float32Array(16), proj: new Float32Array(16), vp: new Float32Array(16), planes: new Float32Array(24) };
    // the cross-fade between levels (lod.mjs): o.lod = { band, hyst, budget } overrides the defaults; the object stays live (a test sets band = 0 and hyst = 0 for the hard swap it replaces)
    this.Backend = o.backend || null;                         // a test passes its own backend class (the draw lists are then inspected in node, without a GPU); the shell leaves it out
    this.nearCap = LOD0_BUDGET; this.lod = lodOptions({ ...(o.lod || {}), mountedSphere: 2.2 + LED.back_m }); this.lod.budget = Math.min(this.lod.budget, this.nearCap);
    this.fl = new FigureList(4096); this.inst = new ArrayBuffer(48 * 4096); this.instF = new Float32Array(this.inst); this.instU = new Uint32Array(this.inst); this.pose = new Float32Array(this.nearCap * 61 * 12);
    this.partCache = new Map(); this.draws = []; this.rowsTmp = new Float64Array(3); this.nUnits = this.world.units.length; this.lastR = { r0: 0, r1: 0, r2: 0 };
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
    this.horseM = [0, 1, 2].map(l => this.meshes.add('h:' + l, sys.horse(l).finalize()));
    // the artillery train and the works (structures draw lists): rigid props are skinned to an identity frame of the horse bank; one generic Napoleon tube (the layer names no piece for a train gun: plausible-procedural)
    this.ex = { carriage: this.meshes.add('x:carriage', sys.carriage(2).finalize()), tube: this.meshes.add('x:tube', sys.gunTube('napoleon_12pdr_m1857', 2).finalize()), limber: this.meshes.add('x:limber', sys.limber(2).finalize()), caisson: this.meshes.add('x:caisson', sys.caisson(2).finalize()), draught: this.meshes.add('x:draught', sys.horse(2, 'draught').finalize()) };
    this.idRow = this.bank.horse.addIdentity(); this.horseIdleIdx = this.bank.index.get('horse_idle'); this.horseFallIdx = this.bank.index.get('horse_fall'); this._hf = new Map(); this.crewIdx = ['stand_shoulder', 'chop_axe', 'dig_shovel', 'march_carry_rail'].map(id => this.bank.index.get(id)); this.driverIdx = this.bank.index.get('rider_walk'); await tick();
    const imp = this.imp = { w: 0, h: 0, layers: cl.impostors.length, data: null, meta: null }; s0 = performance.now(); let atl = null;
    for (let i = 0; i < cl.impostors.length; i++) {
      const a = sys.impostor(cl.impostors[i].key); if (!atl) { imp.w = a.width; imp.h = a.height; atl = new Uint8Array(imp.w * imp.h * 4 * imp.layers); imp.meta = new Float32Array(imp.layers * 4); }
      if (a.width !== imp.w || a.height !== imp.h) throw new Error('impostor atlases differ in size'); atl.set(a.rgba, i * imp.w * imp.h * 4); imp.meta[i * 4] = a.height_m; imp.meta[i * 4 + 1] = a.ppm;
      if (performance.now() - s0 > 25) { progress(0.86 + 0.08 * i / cl.impostors.length, 'Baking the far views'); await tick(); s0 = performance.now(); if (this.dead) return; }
    }
    imp.data = atl; progress(0.95, 'Starting the figure pass'); await tick();
    const S = this.S = { count: this.D.count, nVariants: this.D.nVariants, nslot: NSLOT, inst: this.D.inst, varInfo: this.D.varInfo, varPal: this.D.varPal, pal: buildPal(flagMean), palW: PAL_W, palH: PAL_H, nearCap: this.nearCap, banks: { human: this.bank.human, horse: this.bank.horse }, imp };
    const R = this.host.R; R.o.flags.near = 0; R.o.flags.mid = 0; R.o.flags.far = 0; R.cfg.nearR = 0.01; R.cfg.midR = 0.01;            // the prototype soldiers off: its selection pass sees no unit in range
    if (this.Backend) this.be = new this.Backend(this.host, this); else if (this.api === 'webgpu') { const { CrowdGPU } = await import('./gpu.mjs'); this.be = new CrowdGPU(this.host, this); } else { const { CrowdGL } = await import('./gl.mjs'); this.be = new CrowdGL(this.host, this); }
    this.be.init(S); this.host.setCrowd(this);
    this.driver.anim.setPlacement((id, k, t, out) => this.placement(id, k, out));
    this.stats.buildMs = Math.round(performance.now() - t0); this.stats.classes = nC; progress(1, 'Figures ready');
  }
  scene(p) { if (!this.dead && this.be) this.be.scene(p); }
  shadow(p, c) { if (!this.dead && this.be) this.be.shadow(p, c); }

  // ---------------------------------------------------------------------------------------------------- per frame
  radii() { const R = this.host.R; return lodRadii(R.H || 1080, this.cam.fov, this.settings); }
  _frustum(cam, aspect) { const a = this.pl, f = cam.fwd; lookAt([cam.x, cam.y, cam.z], [cam.x + f[0], cam.y + f[1], cam.z + f[2]], [0, 1, 0], a.view); perspective(cam.fov, aspect, cam.near, cam.far, a.proj); mul(a.proj, a.view, a.vp); frustumPlanes(a.vp, a.planes); return a.planes; }
  // select the figures near the camera, evaluate their animation, build the instance records and the draw list for both backends
  prepare(cam, animT) {
    if (this.dead || !this.be) return; this.cam = cam; const st = this.stage, w = this.world, T = this.T, R = this.host.R, t0 = performance.now(), tSec = (st.tNow ?? 0) * 60, L = this.fl;
    const rad = this.lastR = this.radii(), planes = this._frustum(cam, R.W / R.H);
    // which figures are listed, at which levels and with which dither ranges: a pure function of (time, camera, settings) (lod.mjs); a figure inside a cross-fade is listed at two levels
    const n = selectFigures(L, { world: w, T, present: st.present, cam, planes, rad, animT, opt: this.lod, nUnits: this.nUnits }), ls = L.stats;
    this.host.animT = animT; if (this.driver.anim.bus.stats && (this.host.fxWants !== false)) this._ensureAnimators(6);
    const t1 = performance.now(); this._build(n, tSec); const t2 = performance.now();
    this.stats.selectMs = t1 - t0; this.stats.animMs = t2 - t1; this.stats.bakeMs = this.bank.bakeMs; this.stats.far = w.count - n; this.stats.listed = n; this.stats.r0e = ls.r0e; this.stats.budgetCut = ls.budgetCut; this.stats.bands = ls.bands.slice();
    const F = this.frameData; F.impostors = true; F.nWorld = w.count; F.r2 = rad.r2; F.band = this.lod.band; F.hyst = this.lod.hyst; F.dabPx = this.lod.dabPx; this.be.upload(F);
  }
  // the structures' draw lists (Structures.drawLists + the works mesh): a function of the time in minutes; null when the structures layer is off
  setExtrasSource(fn) { this.extraSrc = fn; this._exT = null; }
  // anim3d placement hook (events carry world positions): k = -1 the unit's centre; the current frame's tables (events of the window just before now)
  placement(id, k, out) {
    const ui = this.driver.byId.get(id); if (ui === undefined || this.stage.present[ui] !== 1) return false; const w = this.world.units[ui], f = this.world.unitF;
    if (k < 0 || k >= w.count) { out.x = f[ui * 12]; out.z = f[ui * 12 + 1]; out.yaw = f[ui * 12 + 2]; } else { soldierPlace(this.world, w.first + k, this.host.animT ?? 0, this.tmp); out.x = this.tmp[0]; out.z = this.tmp[1]; out.yaw = this.tmp[2]; }
    out.y = this.T.h(out.x, out.z); return true;
  }
  // every unit that is on the field gets its animator (events of the whole field, drawn or not): a few milliseconds a frame
  _extraLists(tMin) {
    if (this._exT === tMin && this._exL !== undefined) return this._exL; this._exT = tMin; let L = null;
    try { L = this.extraSrc(tMin); } catch (e) { if (!this._exWarned) { console.warn('structure draw lists not used:', e); this._exWarned = true; } }
    if (L && L.error) L = null; this._exL = L;
    if (L && L.workMesh && L.workMesh.idx.length) { const M = L.workMesh, nv = M.verts.length / 10, pos = new Float32Array(nv * 3), nrm = new Float32Array(nv * 3), mat = new Uint8Array(nv).fill(63), y0 = this.T.h(0, 0);
      for (let i = 0; i < nv; i++) { pos[i * 3] = M.verts[i * 10]; pos[i * 3 + 1] = M.verts[i * 10 + 1] - y0; pos[i * 3 + 2] = M.verts[i * 10 + 2]; nrm.set([M.verts[i * 10 + 3], M.verts[i * 10 + 4], M.verts[i * 10 + 5]], i * 3); }
      this.workEntry = this.meshes.setDynamic('x:works', { nv, pos, nrm, mat, idx: M.idx }); }
    return L;
  }
  // ws10: the draught horses of a battery that go down (history/cavalry.mjs BATTERY_HORSE_LOSSES, EG-CAV-08): Map(unitIndex * 100000 + serial -> fall time, simulation seconds). Cached per (unit, horse count): the list does not depend on the camera.
  _trainHorseFalls(list) {
    const per = new Map(); for (let q = 0; q + 7 < list.length; q += 8) { const bi = list[q + 4] | 0; let a = per.get(bi); if (!a) per.set(bi, a = []); a.push(list[q + 5] | 0); }
    const out = new Map(), nL = this.driver.nL;
    for (const [bi, serials] of per) {
      if (bi >= nL) continue; const lu = this.layer.units[bi]; if (!BATTERY_HORSE_LOSSES[lu.id]) continue; const key = bi + ':' + serials.length + ':' + this.driver.version; let c = this._hf.get(bi);
      if (!c || c.key !== key) { const wins = ((lu.casualties && lu.casualties.windows) || []).map(w => [w.from * 60, w.to * 60]); this._hf.set(bi, c = { key, falls: batteryHorseFalls(lu.id, serials, wins, this.driver.seed) }); }
      for (const [sr, t] of c.falls) out.set(bi * 100000 + sr, t);
    }
    return out;
  }
  _ensureAnimators(budgetMs) { const t0 = performance.now(), st = this.stage; for (let ui = 0; ui < this.nUnits && performance.now() - t0 < budgetMs; ui++) if (st.present[ui] === 1) this.driver.get(ui); }
  _build(n, tSec) {
    const w = this.world, D = this.D, drv = this.driver, bank = this.bank, sel = drv.sel, rows = this.rowsTmp, T = this.T, sys = this.sys, L = this.fl, mask = L.mask, P = L.p, mid = this.cls;
    let c0 = 0, c1 = 0, c2 = 0, nh = 0, nPose = 0, nFade = 0;
    // 1. animation for everyone listed: clip rows for LOD1 / LOD2 (and the horse of a mounted man); the full pose for LOD0. A figure inside a cross-fade has two levels and both are prepared.
    for (let j = 0; j < n; j++) {
      const ui = L.unit[j], k = L.k[j], mk = mask[j]; drv.clipAt(ui, k, tSec);
      if (sel.m) {                                                           // ws10: a cavalryman afoot: his horse is led to the rear, a holder stands with the horses (heading h: ahead = (sin h, cos h), right = (cos h, -sin h))
        const hh = L.h[j], sn = Math.sin(hh), cs = Math.cos(hh), hx = sel.x[SEL_HX], hz = sel.x[SEL_HZ], mz = sel.x[SEL_MZ];
        L.hx[j] = L.x[j] + hx * cs + hz * sn; L.hz[j] = L.z[j] - hx * sn + hz * cs; L.x[j] += mz * sn; L.z[j] += mz * cs;
      }
      if (mk & 1) { L.slot[j] = nPose; drv.pose(ui, k, tSec, L.x[j], L.z[j], L.h[j], T.h, this.pose, nPose * 61 * 12); nPose++; c0++; }
      if (mk & 6) {
        bank.rows(sel.a, sel.d[0], rows, 0); L.ra[j] = rows[0] | (rows[1] << 16); L.fa[j] = rows[2];
        if (sel.b >= 0 && sel.d[2] > 0) { bank.rows(sel.b, sel.d[1], rows, 0); L.rb[j] = rows[0] | (rows[1] << 16); L.fb[j] = rows[2]; L.wb[j] = sel.d[2]; } else { L.rb[j] = L.ra[j]; L.fb[j] = 0; L.wb[j] = 0; }
        if (mk & 2) c1++; if (mk & 4) c2++;
      }
      if (mk & (mk - 1)) nFade++;                                            // more than one level: inside a cross-fade
      if (L.mount[j]) { const h = sel.h >= 0 ? sel.h : drv.ua[ui].iHorseIdle; bank.rows(h, sel.h >= 0 ? sel.d[SEL_TH] : tSec, rows, 0); L.hr[j] = rows[0] | (rows[1] << 16); L.hf[j] = rows[2]; nh += (mk & 1) + ((mk >> 1) & 1) + ((mk >> 2) & 1); }
    }
    this.stats.lod0 = c0; this.stats.lod1 = c1; this.stats.lod2 = c2; this.stats.horse = nh; this.stats.fading = nFade;
    // 2. instance records and draws. capacity: LOD0 parts (about 30 per man), LOD1 / LOD2 x (class + accessory), horses. The fourth word of a record is the packed dither range of the level (lod.mjs): the levels of one figure partition [0, 1).
    const need = (c0 * 40 + (c1 + c2) * 2 + nh + 6000) * REC; if (need * 4 > this.inst.byteLength) { this.inst = new ArrayBuffer(Math.max(need * 4, this.inst.byteLength * 2)); this.instF = new Float32Array(this.inst); this.instU = new Uint32Array(this.inst); this.inst8 = null; }
    const F = this.frameData || (this.frameData = { draws: [], inst: null, instBytes: 0, pose: this.pose, nPose: 0 }); const draws = F.draws; draws.length = 0; let rec = 0; const f32 = this.instF, u32 = this.instU;
    const put = (j, x1, x2, x3, u1, u2, u3, px = L.x[j], pz = L.z[j]) => { const o = rec * REC; f32[o] = px; f32[o + 1] = pz; f32[o + 2] = L.h[j]; f32[o + 3] = 1; f32[o + 4] = x1; f32[o + 5] = x2; f32[o + 6] = x3; f32[o + 7] = 0; u32[o + 8] = L.fig[j]; u32[o + 9] = u1; u32[o + 10] = u2; u32[o + 11] = u3; rec++; };
    // LOD0: per part, the men that wear it
    if (c0) {
      const byPart = new Map();
      for (let j = 0; j < n; j++) if (mask[j] & 1) {
        const wd = D.inst.subarray(L.fig[j] * 4, L.fig[j] * 4 + 4), U = unpackInstance(wd), V = sys.table.list[U.kit_variant], parts = partsAtLod(partsForFigure(V, U.acc_mask, U.flags, { head: U.head, hair: U.hair_style, facial: U.facial_hair }), 0);
        for (const p of parts) { let a = byPart.get(p.id); if (!a) byPart.set(p.id, a = []); a.push(j); }
      }
      for (const [id, js] of byPart) {
        let e = this.partCache.get(id); if (!e) { e = this.meshes.add('p0:' + id, sys.mesh(id, 0).finalize()); this.partCache.set(id, e); this.stats.parts = this.partCache.size; }
        if (!e.indexCount) continue; const first = rec; for (const j of js) put(j, 0, 0, 0, L.slot[j], 0, P[j * 3]);
        draws.push({ near: true, bank: null, first: e.firstIndex, count: e.indexCount, off: first * 48, n: js.length });
      }
    }
    // LOD1 and LOD2: sorted by class (counting sort), a second pass for the accessory class
    const nC = D.classes.silhouettes.length, nA = D.classes.accessories.length;
    for (const lod of [1, 2]) {
      const js = []; for (let j = 0; j < n; j++) if ((mask[j] >> lod) & 1) js.push(j); if (!js.length) continue;
      const pass = (keyOf, count, store) => {
        const startA = new Uint32Array(count + 1); for (const j of js) startA[keyOf(j) + 1]++; for (let q = 0; q < count; q++) startA[q + 1] += startA[q];
        const pos = startA.slice(0, count), order = new Int32Array(js.length); for (const j of js) order[pos[keyOf(j)]++] = j; const base = rec;
        for (let q = 0; q < order.length; q++) { const j = order[q]; put(j, L.fa[j], L.fb[j], L.wb[j], L.ra[j], L.rb[j], P[j * 3 + lod]); }
        for (let c = 0; c < count; c++) { const nn = startA[c + 1] - startA[c]; if (nn <= 0) continue; const e = store[c]; if (!e || !e.indexCount) continue; draws.push({ near: false, bank: 'human', first: e.firstIndex, count: e.indexCount, off: (base + startA[c]) * 48, n: nn }); }
      };
      const mk = j => D.varInfo[(D.inst[L.fig[j] * 4] & 0xffff) * 4], ak = j => D.varInfo[(D.inst[L.fig[j] * 4] & 0xffff) * 4 + 1];
      pass(mk, nC, lod === 1 ? mid.mid : mid.low); if (nA) pass(ak, nA, lod === 1 ? mid.acc1 : mid.acc2);
    }
    // horses: at the levels of their rider, with his dither range
    if (nh) for (const lod of [0, 1, 2]) {
      const first = rec; let cnt = 0; for (let j = 0; j < n; j++) if (L.mount[j] && ((mask[j] >> lod) & 1)) { put(j, L.hf[j], 0, 0, L.hr[j], L.hr[j], P[j * 3 + lod], L.hx[j], L.hz[j]); cnt++; }
      if (cnt) { const e = this.horseM[lod]; draws.push({ near: false, bank: 'horse', first: e.firstIndex, count: e.indexCount, off: first * 48, n: cnt }); }
    }
    // the artillery train and the works: drawn within 350 m (they have no far level), cross-faded out over the same band as the levels (a dither range [0, q))
    const exl = this.extraSrc ? this._extraLists(tSec / 60) : null;
    if (exl) {
      const cam = this.cam, planes = this.pl.planes, EDGE = 350, bE = this.lod.band, reach = EDGE * (1 + bE), limSq = reach * reach;
      const fadeP = (x, z) => { const dx = x - cam.x, dz = z - cam.z, d2 = dx * dx + dz * dz; if (d2 >= limSq || !sphereInFrustum(planes, x, T.h(x, z) + 1, z, 12)) return -1; return edgeRange(Math.sqrt(d2), EDGE, bE); };      // -1: not drawn; 0: drawn fully
      let curP = 0;
      const rigid = (x, z, h, fig, row, frac) => { const o = rec * REC; f32[o] = x; f32[o + 1] = z; f32[o + 2] = h; f32[o + 3] = 2; f32[o + 4] = frac; f32[o + 5] = 0; f32[o + 6] = 0; f32[o + 7] = 0; u32[o + 8] = fig; u32[o + 9] = row | (row << 16); u32[o + 10] = row | (row << 16); u32[o + 11] = curP; rec++; };
      const figOf = bi => { const u = w.units[bi]; return u && u.count ? u.first : 0; };
      const run = (e, first, nn, bankName) => { if (nn && e && e.indexCount) draws.push({ near: false, bank: bankName, first: e.firstIndex, count: e.indexCount, off: first * 48, n: nn }); };
      const art = exl.artillery;
      if (art) {
        const each = (arr, fn) => { let c = 0; for (let q = 0; q + 7 < arr.length; q += 8) { const p = fadeP(arr[q], arr[q + 1]); if (p >= 0) { curP = p; fn(arr, q); c++; } } return c; };
        for (const [name, entries] of [['guns', [this.ex.carriage, this.ex.tube]], ['limbers', [this.ex.limber]], ['caissons', [this.ex.caisson]], ['wagons', [this.ex.caisson]]]) {
          const arr = art[name]; if (!arr || !arr.length) continue; for (const e of entries) { const first = rec; const c = each(arr, (A, q) => rigid(A[q], A[q + 1], A[q + 2], figOf(A[q + 4] | 0), this.idRow, 0)); run(e, first, c, 'horse'); }
        }
        if (art.horses && art.horses.length) { const hfall = this._trainHorseFalls(art.horses), first = rec, c = each(art.horses, (A, q) => { const hft = hfall.get((A[q + 4] | 0) * 100000 + (A[q + 5] | 0)); if (hft !== undefined && tSec >= hft) this.bank.rows(this.horseFallIdx, tSec - hft, this.rowsTmp, 0); else this.bank.rows(this.horseIdleIdx, tSec + (A[q + 5] % 11) * 0.37, this.rowsTmp, 0); rigid(A[q], A[q + 1], A[q + 2], figOf(A[q + 4] | 0), this.rowsTmp[0] | 0, this.rowsTmp[2]); this.instU[(rec - 1) * REC + 9] = this.rowsTmp[0] | (this.rowsTmp[1] << 16); }); run(this.ex.draught, first, c, 'horse'); }
        if (art.drivers && art.drivers.length) {
          const byCls = new Map(); each(art.drivers, (A, q) => { const fg = figOf(A[q + 4] | 0), k = D.varInfo[(D.inst[fg * 4] & 0xffff) * 4]; let l = byCls.get(k); if (!l) byCls.set(k, l = []); l.push(A, q, fg, curP); });
          for (const [k, l] of byCls) { const first = rec; for (let q = 0; q < l.length; q += 4) { const A = l[q], i = l[q + 1]; this.bank.rows(this.driverIdx, tSec + (A[i + 5] % 7) * 0.3, this.rowsTmp, 0); const o = rec * REC; f32[o] = A[i]; f32[o + 1] = A[i + 1]; f32[o + 2] = A[i + 2]; f32[o + 3] = 1; f32[o + 4] = this.rowsTmp[2]; f32[o + 5] = 0; f32[o + 6] = 0; f32[o + 7] = 0; u32[o + 8] = l[q + 2]; u32[o + 9] = this.rowsTmp[0] | (this.rowsTmp[1] << 16); u32[o + 10] = u32[o + 9]; u32[o + 11] = l[q + 3]; rec++; } run(mid.low[k], first, l.length / 4, 'human'); }
        }
      }
      const wk = exl.works;
      if (wk && wk.crew && wk.crew.length) {
        const fg = D.sources.length ? D.sources[0].first : 0, k = D.varInfo[(D.inst[fg * 4] & 0xffff) * 4], byClip = [[], [], [], []];
        for (let q = 0; q + 7 < wk.crew.length; q += 8) { const p = fadeP(wk.crew[q], wk.crew[q + 1]); if (p >= 0) byClip[wk.crew[q + 5] | 0].push(q, p); }
        for (let c = 0; c < 4; c++) for (let t = 0; t < byClip[c].length; t += 2) { const q = byClip[c][t]; this.bank.rows(this.crewIdx[c], tSec + (q % 13) * 0.4, this.rowsTmp, 0); const o = rec * REC; f32[o] = wk.crew[q]; f32[o + 1] = wk.crew[q + 1]; f32[o + 2] = wk.crew[q + 2]; f32[o + 3] = 1; f32[o + 4] = this.rowsTmp[2]; f32[o + 5] = 0; f32[o + 6] = 0; f32[o + 7] = 0; u32[o + 8] = fg; u32[o + 9] = this.rowsTmp[0] | (this.rowsTmp[1] << 16); u32[o + 10] = u32[o + 9]; u32[o + 11] = byClip[c][t + 1]; rec++; }
        const nCrew = byClip.reduce((a, l) => a + l.length / 2, 0); if (nCrew) draws.push({ near: false, bank: 'human', first: mid.low[k].firstIndex, count: mid.low[k].indexCount, off: (rec - nCrew) * 48, n: nCrew });     // one class mesh for all crew: instances are in clip order, one run
      }
      curP = 0; if (exl.workMesh && this.workEntry && this.workEntry.indexCount) { const first = rec; rigid(0, 0, 0, D.sources.length ? D.sources[0].first : 0, this.idRow, 0); draws.push({ near: false, bank: 'horse', first: this.workEntry.firstIndex, count: this.workEntry.indexCount, off: first * 48, n: 1 }); }
    }
    F.inst = this.inst8 || (this.inst8 = new Uint8Array(this.inst)); F.instBytes = rec * 48; F.nPose = nPose; F.pose = this.pose; this.stats.records = rec; this.stats.draws = draws.length; this.stats.tris = draws.reduce((a, d) => a + d.count / 3 * d.n, 0);
  }

  destroy() {
    if (this.dead) return; this.dead = true;
    try { if (this.host && this.host.crowd === this) this.host.crowd = null; if (this.be) this.be.destroy(); } catch (e) { console.warn('crowd teardown', e); }
    this.be = null; this.driver = null; this.bank = null; this.meshes = null; this.D = null; this.sys = null; this.partCache.clear(); this.frameData = null;
  }
}

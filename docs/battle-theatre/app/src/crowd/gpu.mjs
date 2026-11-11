// WebGPU backend of the figure pass: the same draw list as gl.mjs, drawn into the prototype's scene pass and its two shadow passes through R.ext (bind group 0 = the prototype's frame group, bind group 1 = this pass's data).
import { common } from '../../../render/prototype/src/shaders.mjs';
import { wgsl } from './shaders-wgsl.mjs';
import { VERTEX_STRIDE } from './meshes.mjs';

export class CrowdGPU {
  constructor(host, crowd) { this.host = host; this.R = host.R; this.d = host.R.dev; this.crowd = crowd; this.dead = false; this.mem = 0; this.meshVer = -1; this.stats = { draws: 0, tris: 0, instances: 0 }; this.instCap = 0; this.bufs = []; this.texs = []; }
  track(kind, name, bytes) { this.mem += bytes; this.R.track(kind, 'crowd.' + name, bytes); }
  init(S) {
    const d = this.d, R = this.R, G = GPUShaderStage, TU = GPUTextureUsage, BU = GPUBufferUsage; this.S = S;
    const tex = (name, w, h, layers, format, data, bpp, rowBytes) => { const t = d.createTexture({ label: 'crowd.' + name, size: [w, h, layers], format, usage: TU.TEXTURE_BINDING | TU.COPY_DST }); this.texs.push(t); if (data) d.queue.writeTexture({ texture: t }, data, { bytesPerRow: rowBytes ?? w * bpp, rowsPerImage: h }, [w, h, layers]); this.track('textures', name, w * h * layers * bpp); return t; };
    const nI = S.count, rowsI = Math.ceil(nI / 4096), nV = S.nVariants, rowsV = Math.ceil(nV / 4096), rowsP = Math.ceil(nV * S.nslot / 4096), pad = (a, rows, C, per) => { const o = new C(4096 * rows * per); o.set(a); return o; };
    this.tex = {
      inst: tex('inst', 4096, rowsI, 1, 'rgba32uint', pad(S.inst, rowsI, Uint32Array, 4), 16), varInfo: tex('varInfo', 4096, rowsV, 1, 'rgba16uint', pad(S.varInfo, rowsV, Uint16Array, 4), 8),
      varPal: tex('varPal', 4096, rowsP, 1, 'rgba8unorm-srgb', pad(S.varPal, rowsP, Uint8Array, 4), 4), pal: tex('pal', S.palW, S.palH, 1, 'rgba32float', S.pal, 16),
      imp: tex('impostors', S.imp.w, Math.max(1, S.imp.h), Math.max(1, S.imp.layers), 'rgba8unorm', S.imp.layers ? S.imp.data : null, 4), impMeta: tex('impMeta', Math.max(1, S.imp.layers), 1, 1, 'rgba32float', S.imp.layers ? S.imp.meta : null, 16),
      b_human: tex('bones.human', S.banks.human.width, S.banks.human.rows, 1, 'rgba16float', null, 8), b_horse: tex('bones.horse', S.banks.horse.width, S.banks.horse.rows, 1, 'rgba16float', null, 8),
    };
    if (!S.imp.layers) this.tex.imp = tex('impostors', 1, 1, 1, 'rgba8unorm', new Uint8Array(4), 4);
    this.poseB = d.createBuffer({ label: 'crowd.pose', size: S.nearCap * 183 * 16, usage: BU.STORAGE | BU.COPY_DST }); this.track('buffers', 'pose', S.nearCap * 183 * 16);
    const cfgBuf = () => { const b = d.createBuffer({ size: 16, usage: BU.UNIFORM | BU.COPY_DST }); this.bufs.push(b); return b; }; this.cfg = { human: cfgBuf(), horse: cfgBuf() };
    d.queue.writeBuffer(this.cfg.human, 0, new Uint32Array([S.banks.human.tpf, 0, 0, 0])); d.queue.writeBuffer(this.cfg.horse, 0, new Uint32Array([S.banks.horse.tpf, 0, 0, 0]));
    const vis = G.VERTEX | G.FRAGMENT, e = (b, v, o) => ({ binding: b, visibility: v, ...o });
    this.bgl = d.createBindGroupLayout({ entries: [e(0, G.VERTEX, { texture: { sampleType: 'unfilterable-float' } }), e(1, vis, { texture: { sampleType: 'uint' } }), e(2, vis, { texture: { sampleType: 'uint' } }), e(3, vis, { texture: { sampleType: 'unfilterable-float' } }),
      e(4, vis, { texture: { sampleType: 'unfilterable-float' } }), e(5, G.VERTEX, { buffer: { type: 'read-only-storage' } }), e(6, G.FRAGMENT, { texture: { sampleType: 'unfilterable-float', viewDimension: '2d-array' } }), e(7, G.VERTEX, { texture: { sampleType: 'unfilterable-float' } }), e(8, vis, { buffer: { type: 'uniform' } })] });
    const mkBG = (bones, cfg) => d.createBindGroup({ layout: this.bgl, entries: [{ binding: 0, resource: bones.createView() }, { binding: 1, resource: this.tex.inst.createView() }, { binding: 2, resource: this.tex.varInfo.createView() }, { binding: 3, resource: this.tex.varPal.createView() }, { binding: 4, resource: this.tex.pal.createView() },
      { binding: 5, resource: { buffer: this.poseB } }, { binding: 6, resource: this.tex.imp.createView({ dimension: '2d-array' }) }, { binding: 7, resource: this.tex.impMeta.createView() }, { binding: 8, resource: { buffer: cfg } }] });
    this.bg = { human: mkBG(this.tex.b_human, this.cfg.human), horse: mkBG(this.tex.b_horse, this.cfg.horse) };
    const impCfg = cfgBuf(); this.impCfg = impCfg; this.bg.imp = mkBG(this.tex.b_human, impCfg);
    const mod = d.createShaderModule({ code: wgsl(common(R.K)), label: 'crowd' }); mod.getCompilationInfo().then(i => { for (const x of i.messages) console.warn('crowd', x.type, x.lineNum + ':' + x.linePos, x.message); });
    const layout = d.createPipelineLayout({ bindGroupLayouts: [R.g0L, this.bgl] }), HDR = 'rgba16float', DF = 'depth32float', ds = { format: DF, depthWriteEnabled: true, depthCompare: 'less' }, dsS = { format: DF, depthWriteEnabled: true, depthCompare: 'less', depthBias: 3, depthBiasSlopeScale: 2.5, depthBiasClamp: 0.01 };
    const vbs = [{ arrayStride: VERTEX_STRIDE, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }, { shaderLocation: 1, offset: 12, format: 'snorm8x4' }, { shaderLocation: 2, offset: 16, format: 'uint8x4' }, { shaderLocation: 3, offset: 20, format: 'uint8x4' }, { shaderLocation: 4, offset: 24, format: 'unorm8x4' }] },
      { arrayStride: 48, stepMode: 'instance', attributes: [{ shaderLocation: 5, offset: 0, format: 'float32x4' }, { shaderLocation: 6, offset: 16, format: 'float32x4' }, { shaderLocation: 7, offset: 32, format: 'uint32x4' }] }];
    const prim = { topology: 'triangle-list', cullMode: 'none' }, mk = (vs, shadow) => d.createRenderPipeline({ layout, vertex: { module: mod, entryPoint: vs, buffers: vbs }, fragment: shadow ? undefined : { module: mod, entryPoint: 'fs_fig', targets: [{ format: HDR }] }, primitive: prim, depthStencil: shadow ? dsS : ds });
    this.P = { mid: mk('vs_mid', false), midS: mk('vs_mid', true), near: mk('vs_near', false), nearS: mk('vs_near', true),
      imp: d.createRenderPipeline({ layout, vertex: { module: mod, entryPoint: 'vs_imp' }, fragment: { module: mod, entryPoint: 'fs_imp', targets: [{ format: HDR }] }, primitive: { topology: 'triangle-strip' }, depthStencil: ds }) };
    this.syncMeshes(); this.syncBanks(); return this;
  }
  syncMeshes() {
    const d = this.d, ms = this.crowd.meshes, dd = ms.takeDirty(), BU = GPUBufferUsage; if (!dd.v && !dd.i && this.meshVer === ms.version) return;
    if (this.meshVer !== ms.version) {
      if (this.vb) { this.vb.destroy(); this.ib.destroy(); }
      this.vb = d.createBuffer({ label: 'crowd.vb', size: ms.vb.byteLength, usage: BU.VERTEX | BU.COPY_DST }); this.ib = d.createBuffer({ label: 'crowd.ib', size: ms.ib.byteLength, usage: BU.INDEX | BU.COPY_DST });
      d.queue.writeBuffer(this.vb, 0, ms.vb, 0, ms.nv * VERTEX_STRIDE); d.queue.writeBuffer(this.ib, 0, ms.ib, 0, ms.ni); this.meshVer = ms.version; const nb = ms.vb.byteLength + ms.ib.byteLength; this.R.mem.buffers += nb - (this.trackedMesh || 0); this.trackedMesh = nb;
    } else {
      if (dd.v) d.queue.writeBuffer(this.vb, dd.v[0] * VERTEX_STRIDE, ms.vb, dd.v[0] * VERTEX_STRIDE, (dd.v[1] - dd.v[0]) * VERTEX_STRIDE);
      if (dd.i) d.queue.writeBuffer(this.ib, dd.i[0] * 4, ms.ib, dd.i[0], dd.i[1] - dd.i[0]);
    }
  }
  syncBanks() {
    const d = this.d;
    for (const k of ['human', 'horse']) { const b = this.S.banks[k], r = b.takeDirty(); if (!r) continue; const w = b.width, n = r[1] - r[0] + 1; d.queue.writeTexture({ texture: this.tex['b_' + k], origin: [0, r[0], 0] }, b.data, { offset: r[0] * w * 8, bytesPerRow: w * 8, rowsPerImage: n }, [w, n, 1]); }
  }
  upload(F) {
    const d = this.d, BU = GPUBufferUsage; this.syncMeshes(); this.syncBanks(); this.F = F;
    if (F.instBytes) { const need = (F.instBytes + 3) & ~3; if (need > this.instCap) { if (this.instB) this.instB.destroy(); this.instCap = Math.max(need, this.instCap * 2, 1 << 16); this.instB = d.createBuffer({ label: 'crowd.inst', size: this.instCap, usage: BU.VERTEX | BU.COPY_DST }); }
      d.queue.writeBuffer(this.instB, 0, F.inst, 0, need); }
    if (F.nPose) d.queue.writeBuffer(this.poseB, 0, F.pose, 0, F.nPose * 183 * 4);
    d.queue.writeBuffer(this.impCfg, 0, new Float32Array([0, 0, F.r2, 0]).buffer); for (const k of ['human', 'horse']) d.queue.writeBuffer(this.cfg[k], 8, new Float32Array([F.r2]));
  }
  _run(p, shadow) {
    const F = this.F, P = this.P; if (!F || !F.draws.length) return; p.setVertexBuffer(0, this.vb); p.setIndexBuffer(this.ib, 'uint32'); let cur = null, curBG = null, draws = 0, tris = 0, inst = 0;
    for (const dr of F.draws) {
      const pipe = dr.near ? (shadow ? P.nearS : P.near) : (shadow ? P.midS : P.mid); if (pipe !== cur) { p.setPipeline(pipe); cur = pipe; }
      const bg = this.bg[dr.near ? 'human' : dr.bank]; if (bg !== curBG) { p.setBindGroup(1, bg); curBG = bg; }
      p.setVertexBuffer(1, this.instB, dr.off, dr.n * 48); p.drawIndexed(dr.count, dr.n, dr.first, 0, 0); draws++; tris += dr.count / 3 * dr.n; inst += dr.n;
    }
    if (!shadow) { this.stats.draws = draws; this.stats.tris = tris; this.stats.instances = inst; }
  }
  scene(p) { const F = this.F; if (!F) return; this._run(p, false); if (F.impostors && this.S.imp.layers) { p.setPipeline(this.P.imp); p.setBindGroup(1, this.bg.imp); p.draw(4, F.nWorld); this.stats.farInstances = F.nWorld; } }
  shadow(p) { this._run(p, true); }
  destroy() {
    if (this.dead) return; this.dead = true;
    try { for (const t of this.texs) t.destroy(); for (const b of [this.vb, this.ib, this.instB, this.poseB, ...this.bufs]) if (b) b.destroy(); } catch (e) { console.warn('crowd teardown', e); }
  }
}

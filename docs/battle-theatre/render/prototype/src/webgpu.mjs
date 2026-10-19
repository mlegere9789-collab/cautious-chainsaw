// WebGPU renderer for the crowd benchmark/prototype. One file: resources, pipelines, frame graph, timestamp queries.
import { mul, lookAt, ortho, invert } from './math.mjs';
import * as CH from './characters.mjs';
import { selectLods, makeLists } from './lod.mjs';
import { FX, EV_PER } from './fx.mjs';
import { common, terrainWGSL, skyWGSL, nearWGSL, midWGSL, midBoneWGSL, gunWGSL, impWGSL, partWGSL, postWGSL } from './shaders.mjs';
import { soldierClip, UNIT_STRIDE } from './world.mjs';

const FU_BYTES = 512;
export const DEFAULTS = { nearQ: 1, midQ: .35, nearR: 40, midR: 300, nearMax: 1536, midMax: 60000, nearMntMax: 256, midMntMax: 8000, shadowSize: 2048, sunDir: [-0.55, 0.62, 0.56],
  flags: { terrain: 1, near: 1, mid: 1, far: 1, guns: 1, particles: 1, shadows: 1, post: 1, bloom: 1, dof: 0, mblur: 0, sky: 1 }, exposure: 1.0, scale: 1 };

export class GPURenderer {
  static async create(canvas, world, opts = {}) { const r = new GPURenderer(canvas, world, opts); await r.init(); return r; }
  constructor(canvas, world, opts) { this.canvas = canvas; this.w = world; this.o = { ...DEFAULTS, ...opts, flags: { ...DEFAULTS.flags, ...(opts.flags || {}) } }; this.mem = { buffers: 0, textures: 0, items: {} }; this.stats = {}; this.gpuMs = {}; this.api = 'webgpu'; }
  track(kind, name, bytes) { this.mem[kind] += bytes; this.mem.items[name] = (this.mem.items[name] || 0) + bytes; }
  buf(name, size, usage, data) { const b = this.dev.createBuffer({ label: name, size: Math.max(16, (size + 3) & ~3), usage: usage | GPUBufferUsage.COPY_DST }); if (data) this.dev.queue.writeBuffer(b, 0, data); this.track('buffers', name, size); return b; }
  async init() {
    const t0 = performance.now(); const o = this.o, w = this.w, T = w.T;
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: o.power || 'high-performance' }); if (!adapter) throw new Error('no adapter');
    this.adapterInfo = adapter.info ? { vendor: adapter.info.vendor, arch: adapter.info.architecture, device: adapter.info.device, desc: adapter.info.description } : {};
    const feats = ['timestamp-query', 'float32-filterable'].filter(f => adapter.features.has(f)); this.hasTS = feats.includes('timestamp-query');
    this.dev = await adapter.requestDevice({ requiredFeatures: feats, requiredLimits: { maxStorageBuffersPerShaderStage: Math.min(10, adapter.limits.maxStorageBuffersPerShaderStage), maxBufferSize: Math.min(adapter.limits.maxBufferSize, 1 << 30), maxStorageBufferBindingSize: Math.min(adapter.limits.maxStorageBufferBindingSize, 1 << 29) } });
    this.dev.lost.then(i => console.error('device lost', i.message)); this.dev.addEventListener?.('uncapturederror', e => console.error('GPU error', e.error.message));
    this.ctx = this.canvas.getContext('webgpu'); this.fmt = navigator.gpu.getPreferredCanvasFormat(); this.ctx.configure({ device: this.dev, format: this.fmt, alphaMode: 'opaque' });
    // ---- characters + bakes
    const tb = performance.now();
    this.meshes = { footNear: CH.buildFootMesh(o.nearQ), footMid: CH.buildFootMesh(o.midQ), hrsNear: CH.buildHorseMesh(o.nearQ), hrsMid: CH.buildHorseMesh(o.midQ), gun: CH.buildGunMesh(1) };
    this.vatF = CH.bakeVAT('foot', this.meshes.footMid, 32); this.vatH = CH.bakeVAT('horse', this.meshes.hrsMid, 32); this.boneF = CH.bakeBones('foot', 32); this.boneH = CH.bakeBones('horse', 32);
    this.atF = [0, 1].map(t => CH.bakeImpostor('foot', this.meshes.footMid, this.vatF, t, { views: 8, frames: 8, cw: 32, ch: 48 }));
    this.atH = [0, 1].map(t => CH.bakeImpostor('horse', this.meshes.hrsMid, this.vatH, t, { views: 8, frames: 8, cw: 64, ch: 64 }));
    this.bakeMs = performance.now() - tb;
    const K = { frames: 32, frow: this.vatF.rows.map(r => r + '.0').join(','), hrow: this.vatH.rows.map(r => r + '.0').join(',') }; this.K = K;
    // ---- buffers
    const TU = GPUTextureUsage; const U = GPUBufferUsage; const S = U.STORAGE, V = U.VERTEX, I = U.INDEX, UN = U.UNIFORM;
    this.ub = this.buf('frame uniforms', FU_BYTES * 3, UN);
    this.unitsB = this.buf('units', w.unitF.byteLength, S, w.unitF); this.s0B = this.buf('soldiers.a', w.sold.byteLength, S, w.sold); this.s1B = this.buf('soldiers.b', w.sold1.byteLength, S, w.sold1);
    this.gunsData = new Float32Array(w.guns.length * 8); w.guns.forEach((g, i) => { this.gunsData.set([g[0], g[1], g[2], g[3], g[4], g[5], g[6], g[7]], i * 8); }); // a=(x,z,heading,team) b=(period,phase,flight,range)
    const gb = new Float32Array(w.guns.length * 8); w.guns.forEach((g, i) => { gb.set([g[0], g[1], g[2], g[3], g[4], g[5], g[6], g[7]], i * 8); }); this.gunsB = this.buf('guns', gb.byteLength, S, gb);
    const pal = new Float32Array(64 * 4); for (let t = 0; t < 2; t++) for (let m = 0; m < 16; m++) { const c = CH.PALETTE[t][m]; pal.set([c[0], c[1], c[2], c[3]], (t * 16 + m) * 8); pal.set([c[4], 0, 0, 0], (t * 16 + m) * 8 + 4); } this.palB = this.buf('palette', pal.byteLength, UN, pal);
    const mk = (m, nm) => ({ vb: this.buf(nm + '.vb', m.verts.byteLength, V, m.verts), ib: this.buf(nm + '.ib', m.idx.byteLength, I, m.idx), n: m.idx.length, tris: m.ntri, verts: m.nv });
    this.g = { footNear: mk(this.meshes.footNear, 'foot.near'), footMid: mk(this.meshes.footMid, 'foot.mid'), hrsNear: mk(this.meshes.hrsNear, 'horse.near'), hrsMid: mk(this.meshes.hrsMid, 'horse.mid'), gun: mk(this.meshes.gun, 'gun') };
    // lists
    this.cfg = { nearR: o.nearR, midR: o.midR, nearMax: o.nearMax, midMax: o.midMax, nearMntMax: o.nearMntMax, midMntMax: o.midMntMax }; this.L = makeLists(this.cfg);
    this.listB = { nearFoot: this.buf('list.nearFoot', o.nearMax * 4, S), midFoot: this.buf('list.midFoot', o.midMax * 4, S), nearMnt: this.buf('list.nearMnt', o.nearMntMax * 4, S), midMnt: this.buf('list.midMnt', o.midMntMax * 4, S) };
    this.NBF = CH.FOOT_RIG.n; this.NBM = CH.HORSE_RIG.n; this.poseF = new Float32Array(o.nearMax * this.NBF * 12); this.poseM = new Float32Array(o.nearMntMax * this.NBM * 12);
    this.poseFB = this.buf('pose.foot', this.poseF.byteLength, S); this.poseMB = this.buf('pose.mounted', this.poseM.byteLength, S);
    const farF = [], farM = []; for (let i = 0; i < w.count; i++) { (w.units[w.sold[i * 4 + 3]].klass === 1 ? farM : farF).push(i); }
    this.farN = { foot: farF.length, mnt: farM.length }; this.farB = { foot: this.buf('far.foot', farF.length * 4, S, new Uint32Array(farF)), mnt: this.buf('far.mnt', farM.length * 4, S, new Uint32Array(farM)) };
    // terrain
    this.heightTex = this.dev.createTexture({ size: [T.N, T.N], format: 'r32float', usage: TU.TEXTURE_BINDING | TU.COPY_DST }); this.track('textures', 'height r32f', T.N * T.N * 4);
    this.dev.queue.writeTexture({ texture: this.heightTex }, T.heights, { bytesPerRow: T.N * 4 }, [T.N, T.N]);
    await this.loadAerial();
    this.makeTerrainMeshes();
    // textures: VAT, atlases
    const mkTex = (name, w_, h_, fmt, data, bpp) => { const t = this.dev.createTexture({ label: name, size: [w_, h_], format: fmt, usage: TU.TEXTURE_BINDING | TU.COPY_DST }); this.dev.queue.writeTexture({ texture: t }, data, { bytesPerRow: w_ * bpp }, [w_, h_]); this.track('textures', name, w_ * h_ * bpp); return t; };
    this.vatFT = mkTex('VAT foot rgba32f', this.vatF.w, this.vatF.h, 'rgba32float', this.vatF.tex, 16); this.vatHT = mkTex('VAT horse rgba32f', this.vatH.w, this.vatH.h, 'rgba32float', this.vatH.tex, 16);
    this.boneFT = mkTex('bone matrices foot rgba32f', this.boneF.w, this.boneF.h, 'rgba32float', this.boneF.tex, 16); this.boneHT = mkTex('bone matrices horse rgba32f', this.boneH.w, this.boneH.h, 'rgba32float', this.boneH.tex, 16);
    const stack = (a) => { const W = a[0].W, H = a[0].H * 2, d = new Uint8Array(W * H * 4); d.set(a[0].img, 0); d.set(a[1].img, W * a[0].H * 4); return { W, H, d }; };
    const sf = stack(this.atF), sh = stack(this.atH); this.atlasF = mkTex('atlas foot', sf.W, sf.H, 'rgba8unorm', sf.d, 4); this.atlasH = mkTex('atlas horse', sh.W, sh.H, 'rgba8unorm', sh.d, 4);
    this.impO = { foot: { views: 8, frames: 8, cw: 32, ch: 48, W: sf.W, H: sf.H, qh: 2.03, qw: 1.354, midy: 1.0, nclips: 7 }, mnt: { views: 8, frames: 8, cw: 64, ch: 64, W: sh.W, H: sh.H, qh: 2.81, qw: 2.81, midy: 1.35, nclips: 3 } };
    this.shadowTex = this.dev.createTexture({ size: [o.shadowSize, o.shadowSize, 2], format: 'depth32float', usage: TU.RENDER_ATTACHMENT | TU.TEXTURE_BINDING }); this.track('textures', 'shadow maps 2x', o.shadowSize * o.shadowSize * 4 * 2);
    this.shadowViews = [0, 1].map(i => this.shadowTex.createView({ dimension: '2d', baseArrayLayer: i, arrayLayerCount: 1 })); this.shadowArr = this.shadowTex.createView({ dimension: '2d-array' });
    this.samplers = { clamp: this.dev.createSampler({ magFilter: 'linear', minFilter: 'linear', addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge' }), wrap: this.dev.createSampler({ magFilter: 'linear', minFilter: 'linear', mipmapFilter: 'linear', addressModeU: 'repeat', addressModeV: 'repeat', maxAnisotropy: 8 }), cmp: this.dev.createSampler({ compare: 'less', magFilter: 'linear', minFilter: 'linear' }) };
    this.evB = this.buf('events', 4096 * 32, S); this.fx = new FX(w);
    this.buildPipelines(); this.makeBindGroups(); this.resize(this.canvas.width, this.canvas.height);
    this.qs = this.hasTS ? this.dev.createQuerySet({ type: 'timestamp', count: 12 }) : null; this.qResolve = this.hasTS ? this.dev.createBuffer({ size: 96, usage: U.QUERY_RESOLVE | U.COPY_SRC }) : null;
    this.qRead = this.hasTS ? [0, 1, 2, 3].map(() => ({ b: this.dev.createBuffer({ size: 96, usage: U.MAP_READ | U.COPY_DST }), busy: false })) : []; this.qi = 0;
    this.initMs = performance.now() - t0; this.fu = new Float32Array(FU_BYTES * 3 / 4);
  }
  async loadAerial() {
    const base = this.o.base || './'; const blob = await (await fetch(base + 'data/aerial.jpg')).blob(); const bmp = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
    const mips = Math.floor(Math.log2(Math.max(bmp.width, bmp.height))) + 1; const t = this.dev.createTexture({ size: [bmp.width, bmp.height], mipLevelCount: mips, format: 'rgba8unorm-srgb', usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT });
    let bytes = 0; for (let l = 0; l < mips; l++) { const w_ = Math.max(1, bmp.width >> l), h_ = Math.max(1, bmp.height >> l); const src = l === 0 ? bmp : await createImageBitmap(bmp, { resizeWidth: w_, resizeHeight: h_, resizeQuality: 'high', colorSpaceConversion: 'none' }); this.dev.queue.copyExternalImageToTexture({ source: src }, { texture: t, mipLevel: l }, [w_, h_]); bytes += w_ * h_ * 4; }
    this.aerialTex = t; this.track('textures', 'aerial srgb+mips', bytes);
  }
  makeTerrainMeshes() {
    const mk = (G) => { const n = G + 3, v = new Float32Array(n * n * 3), idx = []; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const ii = i - 1, jj = j - 1; const sk = (ii < 0 || ii > G || jj < 0 || jj > G) ? 1 : 0; v.set([Math.min(Math.max(ii, 0), G) / G, Math.min(Math.max(jj, 0), G) / G, sk], (j * n + i) * 3); }
      for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) { const a = j * n + i; idx.push(a, a + n, a + 1, a + 1, a + n, a + n + 1); } const ia = new Uint32Array(idx); return { vb: this.buf('terrain.vb' + G, v.byteLength, GPUBufferUsage.VERTEX, v), ib: this.buf('terrain.ib' + G, ia.byteLength, GPUBufferUsage.INDEX, ia), n: ia.length, G }; };
    this.tm = [mk(96), mk(48), mk(24)]; this.chunks = 16; this.chunkBuf = [0, 1, 2].map(i => this.buf('terrain.chunks' + i, 256 * 16, GPUBufferUsage.VERTEX));
  }
  buildPipelines() {
    const d = this.dev, K = this.K; const G = GPUShaderStage;
    const g0 = d.createBindGroupLayout({ entries: [
      { binding: 0, visibility: G.VERTEX | G.FRAGMENT, buffer: { type: 'uniform', hasDynamicOffset: true, minBindingSize: FU_BYTES } },
      ...[1, 2, 3].map(b => ({ binding: b, visibility: G.VERTEX, buffer: { type: 'read-only-storage' } })),
      { binding: 4, visibility: G.VERTEX | G.FRAGMENT, texture: { sampleType: 'float' } }, { binding: 5, visibility: G.VERTEX | G.FRAGMENT, sampler: { type: 'filtering' } },
      { binding: 6, visibility: G.FRAGMENT, texture: { sampleType: 'depth', viewDimension: '2d-array' } }, { binding: 7, visibility: G.FRAGMENT, sampler: { type: 'comparison' } },
      { binding: 8, visibility: G.FRAGMENT, texture: { sampleType: 'float' } }, { binding: 9, visibility: G.VERTEX | G.FRAGMENT, buffer: { type: 'uniform' } },
      { binding: 10, visibility: G.VERTEX, buffer: { type: 'read-only-storage' } }, { binding: 11, visibility: G.FRAGMENT, sampler: { type: 'filtering' } }] });
    this.g0L = g0;
    const gSkin = d.createBindGroupLayout({ entries: [{ binding: 0, visibility: G.VERTEX, buffer: { type: 'read-only-storage' } }, { binding: 1, visibility: G.VERTEX, buffer: { type: 'read-only-storage' } }] });
    const gVat = d.createBindGroupLayout({ entries: [{ binding: 0, visibility: G.VERTEX, buffer: { type: 'read-only-storage' } }, { binding: 1, visibility: G.VERTEX, texture: { sampleType: 'unfilterable-float' } }] });
    const gImp = d.createBindGroupLayout({ entries: [{ binding: 0, visibility: G.VERTEX, buffer: { type: 'read-only-storage' } }, { binding: 1, visibility: G.FRAGMENT, texture: { sampleType: 'float' } }] });
    const gPart = d.createBindGroupLayout({ entries: [{ binding: 0, visibility: G.VERTEX, buffer: { type: 'read-only-storage' } }, { binding: 1, visibility: G.FRAGMENT, texture: { sampleType: 'depth' } }] });
    const gPost = d.createBindGroupLayout({ entries: [{ binding: 0, visibility: G.FRAGMENT, texture: { sampleType: 'float' } }, { binding: 1, visibility: G.FRAGMENT, texture: { sampleType: 'depth' } }, { binding: 2, visibility: G.FRAGMENT, texture: { sampleType: 'float' } }] });
    this.gL = { gSkin, gVat, gImp, gPart, gPost };
    const pl = (...l) => d.createPipelineLayout({ bindGroupLayouts: l });
    const mod = (code, label) => { const m = d.createShaderModule({ code, label }); m.getCompilationInfo().then(i => { for (const x of i.messages) console.warn(label, x.type, x.lineNum + ':' + x.linePos, x.message); }); return m; };
    const meshVB = [{ arrayStride: 44, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }, { shaderLocation: 1, offset: 12, format: 'float32x3' }, { shaderLocation: 2, offset: 24, format: 'float32' }, { shaderLocation: 3, offset: 28, format: 'float32x4' }] }];
    const meshVB3 = [{ arrayStride: 44, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }, { shaderLocation: 1, offset: 12, format: 'float32x3' }, { shaderLocation: 2, offset: 24, format: 'float32' }] }];
    const HDR = 'rgba16float', DF = 'depth32float';
    const ds = { format: DF, depthWriteEnabled: true, depthCompare: 'less' }; const dsShadow = { format: DF, depthWriteEnabled: true, depthCompare: 'less', depthBias: 3, depthBiasSlopeScale: 2.5, depthBiasClamp: 0.01 };
    const prim = { topology: 'triangle-list', cullMode: 'back', frontFace: 'ccw' }, primNone = { topology: 'triangle-list', cullMode: 'none' };
    this.P = {};
    const mTerr = mod(terrainWGSL(K), 'terrain'); this.P.terrain = d.createRenderPipeline({ layout: pl(g0), vertex: { module: mTerr, entryPoint: 'vs', buffers: [{ arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }] }, { arrayStride: 16, stepMode: 'instance', attributes: [{ shaderLocation: 1, offset: 0, format: 'float32x4' }] }] }, fragment: { module: mTerr, entryPoint: 'fs', targets: [{ format: HDR }] }, primitive: { topology: 'triangle-list', cullMode: 'none' }, depthStencil: ds });
    const mSky = mod(skyWGSL(K), 'sky'); this.P.sky = d.createRenderPipeline({ layout: pl(g0), vertex: { module: mSky, entryPoint: 'vs' }, fragment: { module: mSky, entryPoint: 'fs', targets: [{ format: HDR }] }, primitive: { topology: 'triangle-list' }, depthStencil: { format: DF, depthWriteEnabled: false, depthCompare: 'always' } });
    const mBone = mod(midBoneWGSL(K), 'midBone'), mNF = mod(nearWGSL(K, this.NBF), 'nearFoot'), mNM = mod(nearWGSL(K, this.NBM), 'nearMnt'), mMid = mod(midWGSL(K), 'mid'), mGun = mod(gunWGSL(K), 'gun');
    const mk = (m, layout, vb, shadow, prim_) => d.createRenderPipeline({ layout, vertex: { module: m, entryPoint: 'vs', buffers: vb }, fragment: shadow ? undefined : { module: m, entryPoint: 'fs', targets: [{ format: HDR }] }, primitive: shadow ? primNone : prim_ || prim, depthStencil: shadow ? dsShadow : ds });
    for (const sh of [false, true]) { const s = sh ? 'S' : '';
      this.P['midBone' + s] = mk(mBone, pl(g0, gVat), meshVB, sh); this.P['nearFoot' + s] = mk(mNF, pl(g0, gSkin), meshVB, sh); this.P['nearMnt' + s] = mk(mNM, pl(g0, gSkin), meshVB, sh); this.P['midFoot' + s] = mk(mMid, pl(g0, gVat), meshVB3, sh); this.P['midMnt' + s] = mk(mMid, pl(g0, gVat), meshVB3, sh); this.P['gun' + s] = mk(mGun, pl(g0), meshVB, sh); }
    const impP = (o) => { const m = mod(impWGSL(K, o), 'imp'); return d.createRenderPipeline({ layout: pl(g0, gImp), vertex: { module: m, entryPoint: 'vs' }, fragment: { module: m, entryPoint: 'fs', targets: [{ format: HDR }] }, primitive: { topology: 'triangle-strip' }, depthStencil: ds }); };
    this.P.impFoot = impP(this.impO.foot); this.P.impMnt = impP(this.impO.mnt);
    const mPart = mod(partWGSL(K), 'particles'); this.P.part = d.createRenderPipeline({ layout: pl(g0, gPart), vertex: { module: mPart, entryPoint: 'vs' }, fragment: { module: mPart, entryPoint: 'fs', targets: [{ format: HDR, blend: { color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' }, alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' } } }] }, primitive: { topology: 'triangle-strip' }, depthStencil: { format: DF, depthWriteEnabled: false, depthCompare: 'less' } });
    const mPost = mod(postWGSL(K), 'post'); const pp = (entry, fmt) => d.createRenderPipeline({ layout: pl(g0, gPost), vertex: { module: mPost, entryPoint: 'vs' }, fragment: { module: mPost, entryPoint: entry, targets: [{ format: fmt }] }, primitive: { topology: 'triangle-list' } });
    this.P.pre = pp('fs_pre', HDR); this.P.blurH = pp('fs_blurH', HDR); this.P.blurV = pp('fs_blurV', HDR); this.P.post = pp('fs', this.fmt);
  }
  makeBindGroups() {
    const d = this.dev, B = (layout, entries) => d.createBindGroup({ layout, entries: entries.map((e, i) => ({ binding: e.binding ?? i, resource: e.resource ?? e })) });
    this.bg0 = d.createBindGroup({ layout: this.g0L, entries: [{ binding: 0, resource: { buffer: this.ub, size: FU_BYTES } }, { binding: 1, resource: { buffer: this.unitsB } }, { binding: 2, resource: { buffer: this.s0B } }, { binding: 3, resource: { buffer: this.s1B } },
      { binding: 4, resource: this.heightTex.createView() }, { binding: 5, resource: this.samplers.clamp }, { binding: 6, resource: this.shadowArr }, { binding: 7, resource: this.samplers.cmp }, { binding: 8, resource: this.aerialTex.createView() }, { binding: 9, resource: { buffer: this.palB } }, { binding: 10, resource: { buffer: this.gunsB } }, { binding: 11, resource: this.samplers.wrap }] });
    const dummy = d.createTexture({ size: [1, 1, 2], format: 'depth32float', usage: GPUTextureUsage.TEXTURE_BINDING }); this.dummyShadow = dummy.createView({ dimension: '2d-array' });
    this.bg0S = d.createBindGroup({ layout: this.g0L, entries: [{ binding: 0, resource: { buffer: this.ub, size: FU_BYTES } }, { binding: 1, resource: { buffer: this.unitsB } }, { binding: 2, resource: { buffer: this.s0B } }, { binding: 3, resource: { buffer: this.s1B } },
      { binding: 4, resource: this.heightTex.createView() }, { binding: 5, resource: this.samplers.clamp }, { binding: 6, resource: this.dummyShadow }, { binding: 7, resource: this.samplers.cmp }, { binding: 8, resource: this.aerialTex.createView() }, { binding: 9, resource: { buffer: this.palB } }, { binding: 10, resource: { buffer: this.gunsB } }, { binding: 11, resource: this.samplers.wrap }] });
    const sb = (b) => ({ buffer: b });
    this.bg = { nearFoot: B(this.gL.gSkin, [sb(this.listB.nearFoot), sb(this.poseFB)]), nearMnt: B(this.gL.gSkin, [sb(this.listB.nearMnt), sb(this.poseMB)]),
      midFoot: B(this.gL.gVat, [sb(this.listB.midFoot), this.vatFT.createView()]), midMnt: B(this.gL.gVat, [sb(this.listB.midMnt), this.vatHT.createView()]),
      boneFoot: B(this.gL.gVat, [sb(this.listB.midFoot), this.boneFT.createView()]), boneMnt: B(this.gL.gVat, [sb(this.listB.midMnt), this.boneHT.createView()]),
      impFoot: B(this.gL.gImp, [sb(this.farB.foot), this.atlasF.createView()]), impMnt: B(this.gL.gImp, [sb(this.farB.mnt), this.atlasH.createView()]) };
  }
  resize(w, h) {
    const d = this.dev, U = GPUTextureUsage; this.W = w; this.H = h; for (const k of ['hdr', 'depth', 'bloomA', 'bloomB', 'bloomC']) this[k]?.destroy?.();
    const sz = (s) => [Math.max(1, w >> s), Math.max(1, h >> s)];
    this.hdr = d.createTexture({ size: [w, h], format: 'rgba16float', usage: U.RENDER_ATTACHMENT | U.TEXTURE_BINDING }); this.depth = d.createTexture({ size: [w, h], format: 'depth32float', usage: U.RENDER_ATTACHMENT | U.TEXTURE_BINDING });
    this.bloomA = d.createTexture({ size: sz(1), format: 'rgba16float', usage: U.RENDER_ATTACHMENT | U.TEXTURE_BINDING }); this.bloomB = d.createTexture({ size: sz(2), format: 'rgba16float', usage: U.RENDER_ATTACHMENT | U.TEXTURE_BINDING }); this.bloomC = d.createTexture({ size: sz(2), format: 'rgba16float', usage: U.RENDER_ATTACHMENT | U.TEXTURE_BINDING });
    this.mem.rt = w * h * (8 + 4) + (sz(1)[0] * sz(1)[1] * 8) + 2 * (sz(2)[0] * sz(2)[1] * 8);
    this.hdrV = this.hdr.createView(); this.depthV = this.depth.createView({ aspect: 'depth-only' }); this.depthRT = this.depth.createView();
    const mkPost = (bloomTex) => d.createBindGroup({ layout: this.gL.gPost, entries: [{ binding: 0, resource: this.hdrV }, { binding: 1, resource: this.depthV }, { binding: 2, resource: bloomTex.createView() }] });
    this.bgPre = mkPost(this.bloomC); this.bgBlurH = mkPost(this.bloomA); this.bgBlurV = mkPost(this.bloomB); this.bgFinal = mkPost(this.bloomC);
    this.bgPart = d.createBindGroup({ layout: this.gL.gPart, entries: [{ binding: 0, resource: { buffer: this.evB } }, { binding: 1, resource: this.depthV }] });
  }
  cascade(c, center, R, size, out) {
    const L = this.sun; const eye = [center[0] + L[0] * (R + 500), center[1] + L[1] * (R + 500), center[2] + L[2] * (R + 500)];
    const v = lookAt(eye, center, [0, 1, 0]); const texel = 2 * R / size; // snap the centre to the texel grid in light space
    const cl = [v[0] * center[0] + v[4] * center[1] + v[8] * center[2] + v[12], v[1] * center[0] + v[5] * center[1] + v[9] * center[2] + v[13]];
    const sx = cl[0] - Math.round(cl[0] / texel) * texel, sy = cl[1] - Math.round(cl[1] / texel) * texel;
    const p = ortho(-R - sx, R - sx, -R - sy, R - sy, 10, 2 * R + 1000); return mul(p, v, out);
  }
  writeFU(cam, t, block, vp, aspect) {
    const f = this.fu, o = block * (FU_BYTES / 4), T = this.w.T; f.set(vp, o); f.set(cam.prevVp, o + 16); f.set(cam.invVp, o + 32); f.set(this.sm0, o + 48); f.set(this.sm1, o + 64);
    const r = cam.right(), u = cam.up(), fw = cam.fwd; f.set([cam.x, cam.y, cam.z, t], o + 80); f.set([this.sun[0], this.sun[1], this.sun[2], 3.1], o + 84); f.set([this.W, this.H, 1 / this.W, 1 / this.H], o + 88);
    f.set([T.W, T.H, T.N, T.hmin], o + 92); f.set([T.hmax - T.hmin, this.o.fxAlpha ?? 1, 0, 0], o + 96); f.set([this.o.nearR, this.o.midR, 9000, cam.far], o + 100); f.set([...r, 0], o + 104); f.set([...u, 0], o + 108); f.set([...fw, 0], o + 112);
    f.set([Math.tan(cam.fov / 2), aspect, this.o.exposure, cam.near], o + 116); f.set([this.focus ?? 80, this.o.flags.dof ? (this.o.dofStrength ?? 1) : 0, this.o.flags.mblur ? (this.o.mblurStrength ?? 1) : 0, 1 / this.o.shadowSize], o + 120);
  }
  frame(t, cam) {
    const tf0 = performance.now(), o = this.o, F = o.flags, w = this.w, T = w.T, dev = this.dev, q = dev.queue; const aspect = this.W / this.H; const st = this.stats = {};
    const s = o.sunDir, sl = Math.hypot(...s); this.sun = [s[0] / sl, s[1] / sl, s[2] / sl];
    cam.update(aspect);
    // cascades
    const fw = cam.fwd; const c0 = [cam.x + fw[0] * 28, Math.max(T.h(cam.x + fw[0] * 28, cam.z + fw[2] * 28), 0) + 2, cam.z + fw[2] * 28]; const c1 = [cam.x + fw[0] * 150, T.h(cam.x + fw[0] * 150, cam.z + fw[2] * 150) + 2, cam.z + fw[2] * 150];
    this.sm0 = this.cascade(0, c0, 45, o.shadowSize, this.sm0 || new Float32Array(16)); this.sm1 = this.cascade(1, c1, 260, o.shadowSize, this.sm1 || new Float32Array(16));
    this.writeFU(cam, t, 0, cam.vp, aspect); this.writeFU(cam, t, 1, this.sm0, aspect); this.writeFU(cam, t, 2, this.sm1, aspect); q.writeBuffer(this.ub, 0, this.fu);
    // CPU: LOD selection, poses, fx
    const t1 = performance.now(); this.cfg.nearR = o.nearR; this.cfg.midR = o.midR; const L = selectLods(w, t, cam, cam.planes, this.cfg, this.L); const t2 = performance.now();
    this.writePoses(L, t); const t3 = performance.now();
    q.writeBuffer(this.listB.nearFoot, 0, L.nearFoot, 0, L.nNF); q.writeBuffer(this.listB.midFoot, 0, L.midFoot, 0, L.nMF); q.writeBuffer(this.listB.nearMnt, 0, L.nearMnt, 0, L.nNM); q.writeBuffer(this.listB.midMnt, 0, L.midMnt, 0, L.nMM);
    q.writeBuffer(this.poseFB, 0, this.poseF, 0, L.nNF * this.NBF * 12); q.writeBuffer(this.poseMB, 0, this.poseM, 0, L.nNM * this.NBM * 12);
    this.fx.update(t, cam); const nEv = this.fx.n; if (nEv) q.writeBuffer(this.evB, 0, this.fx.data()); const t4 = performance.now();
    // terrain chunks
    const nch = this.terrainChunks(cam); const t5 = performance.now();
    const enc = dev.createCommandEncoder(); const ts = (i) => this.hasTS ? { querySet: this.qs, beginningOfPassWriteIndex: i * 2, endOfPassWriteIndex: i * 2 + 1 } : undefined;
    const drawChars = (suffix, pass) => {
      if (F.near) { if (L.nNF) { pass.setPipeline(this.P['nearFoot' + suffix]); pass.setBindGroup(1, this.bg.nearFoot); pass.setVertexBuffer(0, this.g.footNear.vb); pass.setIndexBuffer(this.g.footNear.ib, 'uint32'); pass.drawIndexed(this.g.footNear.n, L.nNF); }
        if (L.nNM) { pass.setPipeline(this.P['nearMnt' + suffix]); pass.setBindGroup(1, this.bg.nearMnt); pass.setVertexBuffer(0, this.g.hrsNear.vb); pass.setIndexBuffer(this.g.hrsNear.ib, 'uint32'); pass.drawIndexed(this.g.hrsNear.n, L.nNM); } }
      if (F.mid && o.midMode === 'bones') { if (L.nMF) { pass.setPipeline(this.P['midBone' + suffix]); pass.setBindGroup(1, this.bg.boneFoot); pass.setVertexBuffer(0, this.g.footMid.vb); pass.setIndexBuffer(this.g.footMid.ib, 'uint32'); pass.drawIndexed(this.g.footMid.n, L.nMF); }
        if (L.nMM) { pass.setPipeline(this.P['midBone' + suffix]); pass.setBindGroup(1, this.bg.boneMnt); pass.setVertexBuffer(0, this.g.hrsMid.vb); pass.setIndexBuffer(this.g.hrsMid.ib, 'uint32'); pass.drawIndexed(this.g.hrsMid.n, L.nMM); } }
      else if (F.mid) { if (L.nMF) { pass.setPipeline(this.P['midFoot' + suffix]); pass.setBindGroup(1, this.bg.midFoot); pass.setVertexBuffer(0, this.g.footMid.vb); pass.setIndexBuffer(this.g.footMid.ib, 'uint32'); pass.drawIndexed(this.g.footMid.n, L.nMF); }
        if (L.nMM) { pass.setPipeline(this.P['midMnt' + suffix]); pass.setBindGroup(1, this.bg.midMnt); pass.setVertexBuffer(0, this.g.hrsMid.vb); pass.setIndexBuffer(this.g.hrsMid.ib, 'uint32'); pass.drawIndexed(this.g.hrsMid.n, L.nMM); } }
      if (F.guns) { pass.setPipeline(this.P['gun' + suffix]); pass.setVertexBuffer(0, this.g.gun.vb); pass.setIndexBuffer(this.g.gun.ib, 'uint32'); pass.drawIndexed(this.g.gun.n, w.guns.length); }
    };
    if (F.shadows) for (let c = 0; c < 2; c++) { const p = enc.beginRenderPass({ colorAttachments: [], depthStencilAttachment: { view: this.shadowViews[c], depthClearValue: 1, depthLoadOp: 'clear', depthStoreOp: 'store' }, timestampWrites: ts(c) }); p.setBindGroup(0, this.bg0S, [FU_BYTES * (1 + c)]); drawChars('S', p); p.end(); }
    // scene
    { const p = enc.beginRenderPass({ colorAttachments: [{ view: this.hdrV, clearValue: { r: .5, g: .6, b: .8, a: 1 }, loadOp: 'clear', storeOp: 'store' }], depthStencilAttachment: { view: this.depthRT, depthClearValue: 1, depthLoadOp: 'clear', depthStoreOp: 'store' }, timestampWrites: ts(2) });
      p.setBindGroup(0, this.bg0, [0]);
      if (F.sky) { p.setPipeline(this.P.sky); p.draw(3); }
      if (F.terrain) { p.setPipeline(this.P.terrain); for (let l = 0; l < 3; l++) if (this.chunkN[l]) { p.setVertexBuffer(0, this.tm[l].vb); p.setVertexBuffer(1, this.chunkBuf[l]); p.setIndexBuffer(this.tm[l].ib, 'uint32'); p.drawIndexed(this.tm[l].n, this.chunkN[l]); } }
      drawChars('', p);
      if (F.far) { p.setPipeline(this.P.impFoot); p.setBindGroup(1, this.bg.impFoot); p.draw(4, this.farN.foot); p.setPipeline(this.P.impMnt); p.setBindGroup(1, this.bg.impMnt); p.draw(4, this.farN.mnt); }
      p.end(); }
    if (F.particles && nEv) { const p = enc.beginRenderPass({ colorAttachments: [{ view: this.hdrV, loadOp: 'load', storeOp: 'store' }], depthStencilAttachment: { view: this.depthRT, depthReadOnly: true }, timestampWrites: ts(3) }); p.setBindGroup(0, this.bg0, [0]); p.setPipeline(this.P.part); p.setBindGroup(1, this.bgPart); p.draw(4, nEv * EV_PER); p.end(); }
    const post = (pipe, target, bg, tsw) => { const p = enc.beginRenderPass({ colorAttachments: [{ view: target, loadOp: 'clear', clearValue: { r: 0, g: 0, b: 0, a: 1 }, storeOp: 'store' }], timestampWrites: tsw }); p.setBindGroup(0, this.bg0, [0]); p.setPipeline(pipe); p.setBindGroup(1, bg); p.draw(3); p.end(); };
    if (F.post && F.bloom) { post(this.P.pre, this.bloomA.createView(), this.bgPre, this.hasTS ? { querySet: this.qs, beginningOfPassWriteIndex: 8 } : undefined); post(this.P.blurH, this.bloomB.createView(), this.bgBlurH); post(this.P.blurV, this.bloomC.createView(), this.bgBlurV, this.hasTS ? { querySet: this.qs, endOfPassWriteIndex: 9 } : undefined); }
    post(this.P.post, this.ctx.getCurrentTexture().createView(), this.bgFinal, ts(5));
    let rb = null; if (this.hasTS) { const slot = this.qRead[this.qi % 4]; if (!slot.busy) { rb = slot; enc.resolveQuerySet(this.qs, 0, 12, this.qResolve, 0); enc.copyBufferToBuffer(this.qResolve, 0, slot.b, 0, 96); this.qi++; } }
    q.submit([enc.finish()]); const t6 = performance.now();
    if (rb) { rb.busy = true; const f = { ...F }; rb.b.mapAsync(GPUMapMode.READ).then(() => { const a = new BigUint64Array(rb.b.getMappedRange().slice(0)); rb.b.unmap(); rb.busy = false; const m = (i) => Number(a[i * 2 + 1] - a[i * 2]) / 1e6; const g = { shadow0: F.shadows ? m(0) : 0, shadow1: F.shadows ? m(1) : 0, scene: m(2), particles: (F.particles && nEv) ? m(3) : 0, bloom: (F.post && F.bloom) ? Number(a[9] - a[8]) / 1e6 : 0, post: m(5) }; g.total = g.shadow0 + g.shadow1 + g.scene + g.particles + g.bloom + g.post; this.gpuMs = g; }).catch(() => { rb.busy = false; }); }
    const triFoot = this.g.footNear.tris, triMid = this.g.footMid.tris;
    Object.assign(st, { nearFoot: L.nNF, nearMnt: L.nNM, midFoot: L.nMF, midMnt: L.nMM, farFoot: this.farN.foot, farMnt: this.farN.mnt, unitsNear: L.unitsNear, soldiersTested: L.soldiersTested, events: nEv, terrainChunks: nch,
      tris: L.nNF * triFoot + L.nNM * this.g.hrsNear.tris + L.nMF * triMid + L.nMM * this.g.hrsMid.tris + (this.farN.foot + this.farN.mnt) * 2 + this.terrainTris + w.guns.length * this.g.gun.tris * (F.guns ? 1 : 0) + nEv * EV_PER * 2,
      cpuMs: performance.now() - tf0, cpuLod: t2 - t1, cpuPose: t3 - t2, cpuFx: t4 - t3, cpuSetup: t1 - tf0, cpuTerrain: t5 - t4, cpuEncode: t6 - t5 });
    return st;
  }
  terrainChunks(cam) {
    const T = this.w.T, n = this.chunks, cs = T.W / n, csz = cs; const per = [[], [], []]; this.terrainTris = 0; let cnt = 0;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const x0 = -T.W / 2 + i * cs, z0 = -T.H / 2 + j * csz; const cx = x0 + cs / 2, cz = z0 + csz / 2; const cy = T.h(cx, cz); const r = cs * .75 + 40;
      const dx = Math.max(Math.abs(cx - cam.x) - cs / 2, 0), dz = Math.max(Math.abs(cz - cam.z) - csz / 2, 0), dist = Math.hypot(dx, dz, Math.max(cam.y - cy - 40, 0));
      let ok = true; const pl = cam.planes; for (let k = 0; k < 24; k += 4) if (pl[k] * cx + pl[k + 1] * (cy + 20) + pl[k + 2] * cz + pl[k + 3] < -r) { ok = false; break; } if (!ok) continue;
      const lod = dist < 700 ? 0 : dist < 1800 ? 1 : 2; per[lod].push(x0, z0, cs, 0); this.terrainTris += this.tm[lod].n / 3; cnt++; }
    this.chunkN = per.map((a, l) => { const f = new Float32Array(a); if (f.length) this.dev.queue.writeBuffer(this.chunkBuf[l], 0, f); return f.length / 4; }); return cnt;
  }
  writePoses(L, t) {
    const o = [0, 0, 0]; const pose = this._pose || (this._pose = [CH.newPose(CH.FOOT_RIG), CH.newPose(CH.HORSE_RIG)]); const w = this.w;
    for (let k = 0; k < L.nNF; k++) { soldierClip(w, L.nearFoot[k], t, o); CH.poseFoot(pose[0], o[0], o[1], o[2]); CH.fk(CH.FOOT_RIG, pose[0], this.poseF, k * this.NBF * 12); }
    for (let k = 0; k < L.nNM; k++) { soldierClip(w, L.nearMnt[k], t, o); CH.poseHorse(pose[1], o[0], o[1], o[2]); CH.fk(CH.HORSE_RIG, pose[1], this.poseM, k * this.NBM * 12); }
  }
  onDone() { return this.dev.queue.onSubmittedWorkDone(); }
  memoryBytes() { return this.mem.buffers + this.mem.textures + (this.mem.rt || 0); }
}

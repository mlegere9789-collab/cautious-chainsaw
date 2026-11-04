// Draws the structures model into the prototype renderer's scene (WebGPU and WebGL2), through the two optional hook points the prototype exposes (`ext.scene`, `ext.shadow`).
// One draw call per class where possible: roads (ground ribbons), buildings (one static mesh), fence panels near, stone panels near, fence impostors mid, markers.
// Everything is instanced or static; the per-object state (visible, A, B, mix) is one small array the shaders index by object. Memory is counted into the renderer's own tally.
import { common } from '../../../render/prototype/src/shaders.mjs';
import { wgsl, glsl } from './shaders.mjs';

const BYTES = a => a.byteLength;
export class StructuresGPU {
  constructor(host, model) { this.host = host; this.R = host.R; this.api = host.api; this.m = model; this.on = { roads: true, fences: true, buildings: true, masses: true, markers: true }; this.n = { near: 0, far: 0, stone: 0, worm: 0 }; this.stats = { draws: 0, tris: 0, instances: 0, cullMs: 0 }; this.mem = 0; this.dead = false; this.stateDirty = true; }
  static async create(host, model) { const s = new StructuresGPU(host, model); if (s.api === 'webgpu') s.initGPU(); else s.initGL(); host.R.ext = s; return s; }
  track(name, bytes) { this.mem += bytes; this.R.track(this.api === 'webgpu' ? 'buffers' : 'buffers', 'structures.' + name, bytes); }

  // ================================================================================== WebGPU
  initGPU() {
    const R = this.R, d = R.dev, G = GPUShaderStage, U = GPUBufferUsage, m = this.m, M = m.mesh;
    const buf = (name, data, usage) => { const b = d.createBuffer({ label: 'structures.' + name, size: Math.max(16, (data.byteLength + 3) & ~3), usage: usage | U.COPY_DST }); d.queue.writeBuffer(b, 0, data); this.track(name, data.byteLength); return b; };
    const dyn = (name, bytes) => { const b = d.createBuffer({ label: 'structures.' + name, size: Math.max(16, (bytes + 3) & ~3), usage: U.VERTEX | U.COPY_DST }); this.track(name, bytes); return b; };
    this.ostB = d.createBuffer({ label: 'structures.state', size: Math.max(32, m.nObj * 32), usage: U.STORAGE | U.COPY_DST }); this.track('state', m.nObj * 32);
    const bgl = d.createBindGroupLayout({ entries: [{ binding: 0, visibility: G.VERTEX | G.FRAGMENT, buffer: { type: 'read-only-storage' } }] });
    this.bg = d.createBindGroup({ layout: bgl, entries: [{ binding: 0, resource: { buffer: this.ostB } }] });
    const code = wgsl(common(R.K)), mod = d.createShaderModule({ code, label: 'structures' });
    mod.getCompilationInfo().then(i => { for (const x of i.messages) console.warn('structures', x.type, x.lineNum + ':' + x.linePos, x.message); });
    const layout = d.createPipelineLayout({ bindGroupLayouts: [R.g0L, bgl] }), HDR = 'rgba16float', DF = 'depth32float';
    const ds = { format: DF, depthWriteEnabled: true, depthCompare: 'less' }, dsShadow = { format: DF, depthWriteEnabled: true, depthCompare: 'less', depthBias: 3, depthBiasSlopeScale: 2.5, depthBiasClamp: 0.01 };
    const prim = { topology: 'triangle-list', cullMode: 'none' };
    const f4 = (loc, off) => ({ shaderLocation: loc, offset: off, format: 'float32x4' });
    const instL = { arrayStride: 32, stepMode: 'instance', attributes: [f4(2, 0), f4(3, 16)] };
    const mk = (vs, fs, buffers, extra = {}) => d.createRenderPipeline({ layout, vertex: { module: mod, entryPoint: vs, buffers }, fragment: fs ? { module: mod, entryPoint: fs, targets: [extra.blend ? { format: HDR, blend: extra.blend } : { format: HDR }] } : undefined, primitive: prim, depthStencil: extra.ds || ds });
    const bldL = [{ arrayStride: 40, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }, { shaderLocation: 1, offset: 12, format: 'float32x3' }, f4(2, 24)] }];
    this.P = {
      bld: mk('vs_bld', 'fs_bld', bldL), bldS: mk('vs_bld_shadow', null, bldL, { ds: dsShadow }),
      fence: mk('vs_fence', 'fs_fence', [{ arrayStride: 32, attributes: [f4(0, 0), f4(1, 16)] }, instL]), line: mk('vs_line', 'fs_line', [instL]),
      mark: mk('vs_mark', 'fs_mark', [{ arrayStride: 24, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }, { shaderLocation: 1, offset: 12, format: 'float32x3' }] }, instL]),
      road: mk('vs_road', 'fs_road', [{ arrayStride: 24, attributes: [f4(0, 0), { shaderLocation: 1, offset: 16, format: 'float32x2' }] }], { ds: { format: DF, depthWriteEnabled: false, depthCompare: 'less-equal' }, blend: { color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha' }, alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' } } }),
    };
    const VI = U.VERTEX, II = U.INDEX;
    this.B = { road: buf('road.vb', M.roads.verts, VI), roadI: buf('road.ib', M.roads.idx, II), bld: buf('bld.vb', M.buildings.verts, VI), bldI: buf('bld.ib', M.buildings.idx, II),
      rail: buf('rail.vb', M.rail.verts, VI), railI: buf('rail.ib', M.rail.idx, II), stone: buf('stone.vb', M.stone.verts, VI), stoneI: buf('stone.ib', M.stone.idx, II), worm: buf('worm.vb', M.worm.verts, VI), wormI: buf('worm.ib', M.worm.idx, II),
      mark: buf('mark.vb', M.marker.verts, VI), markI: buf('mark.ib', M.marker.idx, II), markInst: buf('mark.inst', M.markers, VI),
      near: dyn('fence.near', BYTES(m.bufs.near)), far: dyn('fence.far', BYTES(m.bufs.far)), stoneInst: dyn('fence.stone', BYTES(m.bufs.stone)), wormInst: dyn('fence.worm', BYTES(m.bufs.worm)) };
    this.nMark = M.markers.length / 8;
  }
  // ================================================================================== WebGL2
  initGL() {
    const R = this.R, gl = R.gl, m = this.m, M = m.mesh, H = glsl.head;
    const mkb = (name, target, data, usage = gl.STATIC_DRAW) => { const b = gl.createBuffer(); gl.bindBuffer(target, b); gl.bufferData(target, data, usage); this.track(name, data.byteLength ?? data); return b; };
    const NOFS = '#version 300 es\nprecision highp float; out vec4 o; void main() { o = vec4(0.0); }';
    const P = this.P = {
      bld: R.prog('s-bld', H + glsl.bldVS, H + glsl.bldFS), bldS: R.prog('s-bldS', H + glsl.bldShadowVS, NOFS), fence: R.prog('s-fence', H + glsl.fenceVS, H + glsl.fenceFS), line: R.prog('s-line', H + glsl.lineVS, H + glsl.lineFS),
      mark: R.prog('s-mark', H + glsl.markVS, H + glsl.markFS), road: R.prog('s-road', H + glsl.roadVS, H + glsl.roadFS) };
    R.finishProgs();
    for (const p of Object.values(P)) { gl.useProgram(p); const l = gl.getUniformLocation(p, 'uStruct'); if (l) gl.uniform1i(l, 9); }
    const B = this.B = {
      road: mkb('road.vb', gl.ARRAY_BUFFER, M.roads.verts), roadI: mkb('road.ib', gl.ELEMENT_ARRAY_BUFFER, M.roads.idx), bld: mkb('bld.vb', gl.ARRAY_BUFFER, M.buildings.verts), bldI: mkb('bld.ib', gl.ELEMENT_ARRAY_BUFFER, M.buildings.idx),
      rail: mkb('rail.vb', gl.ARRAY_BUFFER, M.rail.verts), railI: mkb('rail.ib', gl.ELEMENT_ARRAY_BUFFER, M.rail.idx), stone: mkb('stone.vb', gl.ARRAY_BUFFER, M.stone.verts), stoneI: mkb('stone.ib', gl.ELEMENT_ARRAY_BUFFER, M.stone.idx), worm: mkb('worm.vb', gl.ARRAY_BUFFER, M.worm.verts), wormI: mkb('worm.ib', gl.ELEMENT_ARRAY_BUFFER, M.worm.idx),
      mark: mkb('mark.vb', gl.ARRAY_BUFFER, M.marker.verts), markI: mkb('mark.ib', gl.ELEMENT_ARRAY_BUFFER, M.marker.idx), markInst: mkb('mark.inst', gl.ARRAY_BUFFER, M.markers),
      near: mkb('fence.near', gl.ARRAY_BUFFER, BYTES(m.bufs.near), gl.DYNAMIC_DRAW), far: mkb('fence.far', gl.ARRAY_BUFFER, BYTES(m.bufs.far), gl.DYNAMIC_DRAW), stoneInst: mkb('fence.stone', gl.ARRAY_BUFFER, BYTES(m.bufs.stone), gl.DYNAMIC_DRAW), wormInst: mkb('fence.worm', gl.ARRAY_BUFFER, BYTES(m.bufs.worm), gl.DYNAMIC_DRAW) };
    const vao = f => { const v = gl.createVertexArray(); gl.bindVertexArray(v); f(); return v; };
    const att = (loc, n, stride, off, div = 0) => { gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, n, gl.FLOAT, false, stride, off); if (div) gl.vertexAttribDivisor(loc, div); };
    this.V = {
      road: vao(() => { gl.bindBuffer(gl.ARRAY_BUFFER, B.road); att(0, 4, 24, 0); att(1, 2, 24, 16); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, B.roadI); }),
      bld: vao(() => { gl.bindBuffer(gl.ARRAY_BUFFER, B.bld); att(0, 3, 40, 0); att(1, 3, 40, 12); att(2, 4, 40, 24); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, B.bldI); }),
      rail: vao(() => { gl.bindBuffer(gl.ARRAY_BUFFER, B.rail); att(0, 4, 32, 0); att(1, 4, 32, 16); gl.bindBuffer(gl.ARRAY_BUFFER, B.near); att(2, 4, 32, 0, 1); att(3, 4, 32, 16, 1); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, B.railI); }),
      stone: vao(() => { gl.bindBuffer(gl.ARRAY_BUFFER, B.stone); att(0, 4, 32, 0); att(1, 4, 32, 16); gl.bindBuffer(gl.ARRAY_BUFFER, B.stoneInst); att(2, 4, 32, 0, 1); att(3, 4, 32, 16, 1); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, B.stoneI); }),
      worm: vao(() => { gl.bindBuffer(gl.ARRAY_BUFFER, B.worm); att(0, 4, 32, 0); att(1, 4, 32, 16); gl.bindBuffer(gl.ARRAY_BUFFER, B.wormInst); att(2, 4, 32, 0, 1); att(3, 4, 32, 16, 1); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, B.wormI); }),
      line: vao(() => { gl.bindBuffer(gl.ARRAY_BUFFER, B.far); att(2, 4, 32, 0, 1); att(3, 4, 32, 16, 1); }),
      mark: vao(() => { gl.bindBuffer(gl.ARRAY_BUFFER, B.mark); att(0, 3, 24, 0); att(1, 3, 24, 12); gl.bindBuffer(gl.ARRAY_BUFFER, B.markInst); att(2, 4, 32, 0, 1); att(3, 4, 32, 16, 1); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, B.markI); }),
    };
    gl.bindVertexArray(null);
    this.rows = Math.max(1, Math.ceil(m.nObj * 2 / 1024)); this.stTex = gl.createTexture(); gl.activeTexture(gl.TEXTURE9); gl.bindTexture(gl.TEXTURE_2D, this.stTex); gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, 1024, this.rows);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    R.track('textures', 'structures.state', 1024 * this.rows * 16); this.mem += 1024 * this.rows * 16; this.pad = new Float32Array(1024 * this.rows * 4); this.nMark = M.markers.length / 8;
  }

  // ================================================================================== per frame
  // Called by the theatre before host.frame(): culls the fence panels for this camera, uploads what changed. Cheap: a few hundred chunk tests and at most ~1,900 panel records.
  prepare(cam, on) {
    const t0 = performance.now(); if (on) this.on = on; const m = this.m, o = this.on;
    const v = m.cullFences(cam, o.fences); this.n.near = v.near; this.n.far = v.far; this.n.stone = v.stone; this.n.worm = v.worm;
    if (this.api === 'webgpu') {
      const q = this.R.dev.queue; if (this.stateDirty) { q.writeBuffer(this.ostB, 0, m.stateBuf); this.stateDirty = false; }
      if (v.near) q.writeBuffer(this.B.near, 0, m.bufs.near, 0, v.near * 8); if (v.far) q.writeBuffer(this.B.far, 0, m.bufs.far, 0, v.far * 8); if (v.stone) q.writeBuffer(this.B.stoneInst, 0, m.bufs.stone, 0, v.stone * 8); if (v.worm) q.writeBuffer(this.B.wormInst, 0, m.bufs.worm, 0, v.worm * 8);
    } else {
      const gl = this.R.gl;
      if (this.stateDirty) { this.pad.set(m.stateBuf); gl.activeTexture(gl.TEXTURE9); gl.bindTexture(gl.TEXTURE_2D, this.stTex); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 1024, this.rows, gl.RGBA, gl.FLOAT, this.pad); this.stateDirty = false; }
      const up = (b, arr, n) => { if (!n) return; gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferSubData(gl.ARRAY_BUFFER, 0, arr, 0, n * 8); };
      up(this.B.near, m.bufs.near, v.near); up(this.B.far, m.bufs.far, v.far); up(this.B.stoneInst, m.bufs.stone, v.stone); up(this.B.wormInst, m.bufs.worm, v.worm);
    }
    this.stats.cullMs = performance.now() - t0; return v;
  }
  markDirty() { this.stateDirty = true; }
  // PANEL triangle counts of the meshes, for the budget table
  get meshTris() { const M = this.m.mesh; return { rail: M.rail.idx.length / 3, stone: M.stone.idx.length / 3, marker: M.marker.idx.length / 3 }; }

  scene(pass) { return this.api === 'webgpu' ? this.sceneGPU(pass) : this.sceneGL(pass); }
  shadow(pass, c) { return this.api === 'webgpu' ? this.shadowGPU(pass) : this.shadowGL(pass); }

  sceneGPU(p) {
    const m = this.m, o = this.on, B = this.B, M = m.mesh, n = this.n; let draws = 0, tris = 0, inst = 0; p.setBindGroup(1, this.bg);
    if (o.roads && M.roads.idx.length) { p.setPipeline(this.P.road); p.setVertexBuffer(0, B.road); p.setIndexBuffer(B.roadI, 'uint32'); p.drawIndexed(M.roads.idx.length); draws++; tris += M.roads.idx.length / 3; }
    if ((o.buildings || o.masses) && M.buildings.idx.length) { p.setPipeline(this.P.bld); p.setVertexBuffer(0, B.bld); p.setIndexBuffer(B.bldI, 'uint32'); p.drawIndexed(M.buildings.idx.length); draws++; tris += M.buildings.idx.length / 3; }
    if (o.fences) {
      if (n.near) { p.setPipeline(this.P.fence); p.setVertexBuffer(0, B.rail); p.setIndexBuffer(B.railI, 'uint32'); p.setVertexBuffer(1, B.near); p.drawIndexed(M.rail.idx.length, n.near); draws++; tris += M.rail.idx.length / 3 * n.near; inst += n.near; }
      if (n.stone) { p.setPipeline(this.P.fence); p.setVertexBuffer(0, B.stone); p.setIndexBuffer(B.stoneI, 'uint32'); p.setVertexBuffer(1, B.stoneInst); p.drawIndexed(M.stone.idx.length, n.stone); draws++; tris += M.stone.idx.length / 3 * n.stone; inst += n.stone; }
      if (n.worm) { p.setPipeline(this.P.fence); p.setVertexBuffer(0, B.worm); p.setIndexBuffer(B.wormI, 'uint32'); p.setVertexBuffer(1, B.wormInst); p.drawIndexed(M.worm.idx.length, n.worm); draws++; tris += M.worm.idx.length / 3 * n.worm; inst += n.worm; }
      if (n.far) { p.setPipeline(this.P.line); p.setVertexBuffer(0, B.far); p.draw(12, n.far); draws++; tris += 4 * n.far; inst += n.far; }
    }
    if (o.markers && this.nMark) { p.setPipeline(this.P.mark); p.setVertexBuffer(0, B.mark); p.setIndexBuffer(B.markI, 'uint32'); p.setVertexBuffer(1, B.markInst); p.drawIndexed(M.marker.idx.length, this.nMark); draws++; tris += M.marker.idx.length / 3 * this.nMark; inst += this.nMark; }
    Object.assign(this.stats, { draws, tris, instances: inst });
  }
  shadowGPU(p) {
    const m = this.m, o = this.on, M = m.mesh; if (!(o.buildings || o.masses) || !M.buildings.idx.length) return;
    p.setBindGroup(1, this.bg); p.setPipeline(this.P.bldS); p.setVertexBuffer(0, this.B.bld); p.setIndexBuffer(this.B.bldI, 'uint32'); p.drawIndexed(M.buildings.idx.length);
  }
  sceneGL(gl) {
    const m = this.m, o = this.on, M = m.mesh, n = this.n; let draws = 0, tris = 0, inst = 0;
    gl.activeTexture(gl.TEXTURE9); gl.bindTexture(gl.TEXTURE_2D, this.stTex); gl.disable(gl.CULL_FACE); gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS); gl.depthMask(true); gl.disable(gl.BLEND);
    if (o.roads && M.roads.idx.length) { gl.useProgram(this.P.road); gl.bindVertexArray(this.V.road); gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); gl.depthFunc(gl.LEQUAL);
      gl.drawElements(gl.TRIANGLES, M.roads.idx.length, gl.UNSIGNED_INT, 0); gl.depthFunc(gl.LESS); gl.depthMask(true); gl.disable(gl.BLEND); draws++; tris += M.roads.idx.length / 3; }
    if ((o.buildings || o.masses) && M.buildings.idx.length) { gl.useProgram(this.P.bld); gl.bindVertexArray(this.V.bld); gl.drawElements(gl.TRIANGLES, M.buildings.idx.length, gl.UNSIGNED_INT, 0); draws++; tris += M.buildings.idx.length / 3; }
    if (o.fences) {
      if (n.near) { gl.useProgram(this.P.fence); gl.bindVertexArray(this.V.rail); gl.drawElementsInstanced(gl.TRIANGLES, M.rail.idx.length, gl.UNSIGNED_INT, 0, n.near); draws++; tris += M.rail.idx.length / 3 * n.near; inst += n.near; }
      if (n.stone) { gl.useProgram(this.P.fence); gl.bindVertexArray(this.V.stone); gl.drawElementsInstanced(gl.TRIANGLES, M.stone.idx.length, gl.UNSIGNED_INT, 0, n.stone); draws++; tris += M.stone.idx.length / 3 * n.stone; inst += n.stone; }
      if (n.worm) { gl.useProgram(this.P.fence); gl.bindVertexArray(this.V.worm); gl.drawElementsInstanced(gl.TRIANGLES, M.worm.idx.length, gl.UNSIGNED_INT, 0, n.worm); draws++; tris += M.worm.idx.length / 3 * n.worm; inst += n.worm; }
      if (n.far) { gl.useProgram(this.P.line); gl.bindVertexArray(this.V.line); gl.drawArraysInstanced(gl.TRIANGLES, 0, 12, n.far); draws++; tris += 4 * n.far; inst += n.far; }
    }
    if (o.markers && this.nMark) { gl.useProgram(this.P.mark); gl.bindVertexArray(this.V.mark); gl.drawElementsInstanced(gl.TRIANGLES, M.marker.idx.length, gl.UNSIGNED_INT, 0, this.nMark); draws++; tris += M.marker.idx.length / 3 * this.nMark; inst += this.nMark; }
    gl.bindVertexArray(null); Object.assign(this.stats, { draws, tris, instances: inst });
  }
  shadowGL(gl) {
    const m = this.m, o = this.on, M = m.mesh; if (!(o.buildings || o.masses) || !M.buildings.idx.length) return;
    gl.activeTexture(gl.TEXTURE9); gl.bindTexture(gl.TEXTURE_2D, this.stTex); gl.useProgram(this.P.bldS); gl.bindVertexArray(this.V.bld); gl.drawElements(gl.TRIANGLES, M.buildings.idx.length, gl.UNSIGNED_INT, 0); gl.bindVertexArray(null);
  }
  destroy() {
    if (this.dead) return; this.dead = true; if (this.R) this.R.ext = null;
    try {
      if (this.api === 'webgpu') { for (const b of Object.values(this.B)) b.destroy(); this.ostB.destroy(); }
      else { const gl = this.R.gl; for (const b of Object.values(this.B)) gl.deleteBuffer(b); for (const v of Object.values(this.V)) gl.deleteVertexArray(v); for (const p of Object.values(this.P)) gl.deleteProgram(p); gl.deleteTexture(this.stTex); }
    } catch (e) { console.warn('structures teardown', e); }
  }
}

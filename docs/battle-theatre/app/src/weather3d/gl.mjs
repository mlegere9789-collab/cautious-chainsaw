// WebGL2 side of the weather layer and of the fx3d particle pass: program build, textures, uniforms, the two weather draws, the sprite draw, and exact state save/restore around them
// (they run inside the prototype renderer's scene pass through its `ext.scene` hook, so every GL state touched is put back).
import { WEATHER_VS, WEATHER_FS, withDefs, patchFxFragment, MAX_LIGHTS } from './shaders.mjs';
import { GLSL_VERT, GLSL_FRAG } from '../fx3d/shaders.mjs';
import { WIND_HIST_N } from '../fx3d/wind.mjs';
import { LIGHT_STRIDE } from '../fx3d/lights.mjs';
import { LAT_DEG } from './timeline.mjs';
import { val } from './params.mjs';

export const EV_W = 6144, EV_PER_ROW = 1024, CUM_W = 4096;        // events live in a 6144-wide texture, 1024 events (6 texels each) per row: no event limit from MAX_TEXTURE_SIZE
// fx3d's vertex shader addresses event e at texel (k, e); re-address into the wide layout
export const patchFxVertex = src => { const n = (src.match(/ivec2\(\d, e\)/g) || []).length; if (n !== 6) throw new Error('fx3d vertex shader changed: expected 6 event texel reads, found ' + n); let out = src.replace(/ivec2\((\d), e\)/g, `ivec2(((e & ${EV_PER_ROW - 1}) * 6 + $1), e >> 10)`);
  return out; };
export const fxSources = () => ({ vs: patchFxVertex(GLSL_VERT), fs: patchFxFragment(GLSL_FRAG) });

function compile(gl, type, src, name, log) {
  const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { const m = gl.getShaderInfoLog(s) || ''; log.push(`${name} ${type === gl.VERTEX_SHADER ? 'vertex' : 'fragment'} shader compile failed: ${m}`); gl.deleteShader(s); return null; }
  return s;
}
export function buildProgram(gl, name, vsSrc, fsSrc, log) {
  const v = compile(gl, gl.VERTEX_SHADER, vsSrc, name, log), f = compile(gl, gl.FRAGMENT_SHADER, fsSrc, name, log); if (!v || !f) return null;
  const p = gl.createProgram(); gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p); gl.deleteShader(v); gl.deleteShader(f);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { log.push(`${name} link failed: ${gl.getProgramInfoLog(p)}`); gl.deleteProgram(p); return null; }
  const bi = gl.getUniformBlockIndex(p, 'FU'); if (bi !== 0xFFFFFFFF && bi !== -1) gl.uniformBlockBinding(p, bi, 0);
  const loc = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); for (let i = 0; i < n; i++) { const u = gl.getActiveUniform(p, i); const nm = u.name.replace(/\[0\]$/, ''); loc[nm] = gl.getUniformLocation(p, u.name); }
  return { p, loc, name };
}
const tex = (gl, unit, internal, w, h, format, type) => { const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); gl.texStorage2D(gl.TEXTURE_2D, 1, internal, w, h);
  for (const k of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, k, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; };

// everything that must be put back
export function saveState(gl, units) {
  const s = { prog: gl.getParameter(gl.CURRENT_PROGRAM), vao: gl.getParameter(gl.VERTEX_ARRAY_BINDING), fb: gl.getParameter(gl.FRAMEBUFFER_BINDING), active: gl.getParameter(gl.ACTIVE_TEXTURE), blend: gl.isEnabled(gl.BLEND), depthTest: gl.isEnabled(gl.DEPTH_TEST), cull: gl.isEnabled(gl.CULL_FACE),
    depthMask: gl.getParameter(gl.DEPTH_WRITEMASK), depthFunc: gl.getParameter(gl.DEPTH_FUNC), colorMask: gl.getParameter(gl.COLOR_WRITEMASK), viewport: gl.getParameter(gl.VIEWPORT), blendSrc: gl.getParameter(gl.BLEND_SRC_RGB), blendDst: gl.getParameter(gl.BLEND_DST_RGB), blendSrcA: gl.getParameter(gl.BLEND_SRC_ALPHA), blendDstA: gl.getParameter(gl.BLEND_DST_ALPHA), tex: [] };
  for (const u of units) { gl.activeTexture(gl.TEXTURE0 + u); s.tex.push([u, gl.getParameter(gl.TEXTURE_BINDING_2D)]); }
  return s;
}
export function restoreState(gl, s) {
  for (const [u, t] of s.tex) { gl.activeTexture(gl.TEXTURE0 + u); gl.bindTexture(gl.TEXTURE_2D, t); }
  gl.activeTexture(s.active); gl.useProgram(s.prog); gl.bindVertexArray(s.vao); gl.bindFramebuffer(gl.FRAMEBUFFER, s.fb);
  (s.blend ? gl.enable : gl.disable).call(gl, gl.BLEND); (s.depthTest ? gl.enable : gl.disable).call(gl, gl.DEPTH_TEST); (s.cull ? gl.enable : gl.disable).call(gl, gl.CULL_FACE);
  gl.depthMask(s.depthMask); gl.depthFunc(s.depthFunc); gl.colorMask(...s.colorMask); gl.viewport(...s.viewport); gl.blendFuncSeparate(s.blendSrc, s.blendDst, s.blendSrcA, s.blendDstA);
}

export class GLPasses {
  // R: the prototype GLRenderer (gl, W, H, t.height, t.depthCopy, fbScene, fbDepthCopy, glVp). unit numbers: the prototype re-binds its own textures for every later pass (checked: particles and post bind explicitly), and they are saved and restored anyway.
  constructor(R, { maxEvents }) {
    this.R = R; this.gl = R.gl; this.log = []; this.ok = false; const gl = this.gl;
    this.U = { ev: 12, depth: 13, cum: 14, wind: 15 };
    this.progMul = buildProgram(gl, 'weather-mul', WEATHER_VS, withDefs(WEATHER_FS, 'mul'), this.log); this.progAdd = buildProgram(gl, 'weather-add', WEATHER_VS, withDefs(WEATHER_FS, 'add'), this.log);
    const { vs, fs } = fxSources(); this.progFx = buildProgram(gl, 'fx3d-sprites', vs, fs, this.log);
    this.weatherOk = !!(this.progMul && this.progAdd); this.fxOk = !!this.progFx; this.ok = this.weatherOk || this.fxOk;
    this.vao = gl.createVertexArray(); this.maxEvents = maxEvents; this.rows = Math.ceil((maxEvents + 64) / EV_PER_ROW);
    this.stage = new Float32Array(EV_W * 4); this.cumStage = new Float32Array(CUM_W * Math.ceil((maxEvents + 64 + 1) / CUM_W));
    const prev = saveState(gl, [this.U.ev, this.U.depth, this.U.cum, this.U.wind]);
    this.tEv = tex(gl, this.U.ev, gl.RGBA32F, EV_W, this.rows); this.tCum = tex(gl, this.U.cum, gl.R32F, CUM_W, this.cumStage.length / CUM_W); this.tWind = tex(gl, this.U.wind, gl.RG32F, WIND_HIST_N, 1);
    restoreState(gl, prev);
    if (this.progFx) { gl.useProgram(this.progFx.p); const L = this.progFx.loc; gl.uniform1i(L.uEv, this.U.ev); gl.uniform1i(L.uCum, this.U.cum); gl.uniform1i(L.uWind, this.U.wind); gl.uniform1i(L.uDepth, this.U.depth); }
    for (const pr of [this.progMul, this.progAdd]) if (pr) { gl.useProgram(pr.p); gl.uniform1i(pr.loc.uDepth, this.U.depth); gl.uniform1i(pr.loc.uHeight, 0); }
    gl.useProgram(null); this.stats = { weatherDraws: 0, fxDraws: 0, spritesDrawn: 0, depthBlits: 0 };
  }
  _uploadFx(fr) {
    const gl = this.gl, n = fr.nEvents, evf = fr.events;
    gl.activeTexture(gl.TEXTURE0 + this.U.ev); gl.bindTexture(gl.TEXTURE_2D, this.tEv);
    const full = Math.floor(n / EV_PER_ROW), rem = n - full * EV_PER_ROW;
    if (full) gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, EV_W, full, gl.RGBA, gl.FLOAT, evf, 0);
    if (rem) gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, full, rem * 6, 1, gl.RGBA, gl.FLOAT, evf, full * EV_PER_ROW * 24);
    const cum = fr.cum, cs = this.cumStage, m = n + 1; for (let i = 0; i < m; i++) cs[i] = cum[i];
    gl.activeTexture(gl.TEXTURE0 + this.U.cum); gl.bindTexture(gl.TEXTURE_2D, this.tCum); const rowsUsed = Math.ceil(m / CUM_W); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, CUM_W, rowsUsed, gl.RED, gl.FLOAT, cs, 0);
    gl.activeTexture(gl.TEXTURE0 + this.U.wind); gl.bindTexture(gl.TEXTURE_2D, this.tWind); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, WIND_HIST_N, 1, gl.RG, gl.FLOAT, fr.windHist);
  }
  _setWeather(L, W, fr, cam) {
    const gl = this.gl, sk = W.sky, pal = sk.palette, st = sk.stars, cl = W.cloud, g = W.ground, f = W.fog, ax = [0, Math.sin(LAT_DEG * Math.PI / 180), -Math.cos(LAT_DEG * Math.PI / 180)];
    gl.uniform3fv(L.uSunDir, sk.sunDir); gl.uniform3fv(L.uMoonDir, sk.moonDir); gl.uniform4f(L.uMoon, sk.moonIllum / 100, val('moon.radiance'), 0.0045 * val('moon.disc_scale'), sk.moonUp ? 1 : 0);
    gl.uniform3fv(L.uZen, pal.zenith); gl.uniform3fv(L.uHor, pal.horizon); gl.uniform3fv(L.uSunCol, pal.sunCol); gl.uniform4f(L.uSky, pal.sunVis, val('sun.glow_gain'), sk.dayW, 0);
    gl.uniform3fv(L.uTw, pal.twilightWarm); gl.uniform3fv(L.uFloor, pal.floor); gl.uniform3fv(L.uCLit, pal.cloudLit); gl.uniform3fv(L.uCShade, pal.cloudShade);
    gl.uniform4f(L.uCloud, cl.cover, cl.altitude, cl.scale, cl.softness); gl.uniform2f(L.uCOff, cl.driftCellsX, cl.driftCellsZ);
    gl.uniform4f(L.uStars, st.visibility, st.density, st.fraction, st.gain); gl.uniform4f(L.uStarAxis, ax[0], ax[1], ax[2], st.rotation);
    gl.uniform4f(L.uFog, f.extra, f.scaleHeight, 0, 0); gl.uniform3fv(L.uFogCol, pal.horizon.map(v => v * 0.92)); gl.uniform4f(L.uProto, 1, 0.00006, 0.85, 0.9);
    gl.uniform4f(L.uWet, g.albedoMul, g.puddle, g.puddleDarken, g.puddleScale); gl.uniform4f(L.uGround, g.tolerance, 0.012, 0, 0);
    const gain = val('light.flash_gain'), nl = Math.min(fr ? fr.nLights : 0, MAX_LIGHTS), pos = new Float32Array(MAX_LIGHTS * 4), col = new Float32Array(MAX_LIGHTS * 4);
    for (let i = 0; i < nl; i++) { const o = i * LIGHT_STRIDE, I = fr.lights[o + 4] * gain; pos.set([fr.lights[o], fr.lights[o + 1], fr.lights[o + 2], fr.lights[o + 3]], i * 4); col.set([fr.lights[o + 5] * I, fr.lights[o + 6] * I, fr.lights[o + 7] * I, 0], i * 4); }
    gl.uniform1i(L.uNL, nl); gl.uniform4fv(L.uLPos, pos); gl.uniform4fv(L.uLCol, col);
  }
  // draw: weather (2 fullscreen draws) then the sprites. W: WeatherTimeline state, fr: fx3d frame (or null), cam: prototype Camera
  draw(W, fr, cam, flags = { weather: true, fx: true }) {
    const gl = this.gl, R = this.R; if (!this.ok || !W) return;
    const s = saveState(gl, [this.U.ev, this.U.depth, this.U.cum, this.U.wind, 0]);
    // depth: copy the scene depth so it can be sampled (WebGL2 cannot sample the depth buffer it tests against)
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, R.fbScene); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, R.fbDepthCopy); gl.blitFramebuffer(0, 0, R.W, R.H, 0, 0, R.W, R.H, gl.DEPTH_BUFFER_BIT, gl.NEAREST); gl.bindFramebuffer(gl.FRAMEBUFFER, R.fbScene); this.stats.depthBlits++;
    gl.activeTexture(gl.TEXTURE0 + this.U.depth); gl.bindTexture(gl.TEXTURE_2D, R.t.depthCopy);
    gl.viewport(0, 0, R.W, R.H); gl.disable(gl.CULL_FACE); gl.bindVertexArray(this.vao);
    if (flags.weather && this.weatherOk) {
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, R.t.height); gl.disable(gl.DEPTH_TEST); gl.depthMask(false); gl.enable(gl.BLEND);
      gl.useProgram(this.progMul.p); this._setWeather(this.progMul.loc, W, fr, cam); gl.blendFuncSeparate(gl.ZERO, gl.SRC_COLOR, gl.ZERO, gl.ONE); gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.useProgram(this.progAdd.p); this._setWeather(this.progAdd.loc, W, fr, cam); gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ZERO, gl.ONE); gl.drawArrays(gl.TRIANGLES, 0, 3); this.stats.weatherDraws++;
    }
    if (flags.fx && this.fxOk && fr && fr.nSprites > 0) {
      this._uploadFx(fr); const L = this.progFx.loc, lt = fr.env.lighting, r = cam.right(), u = cam.up(); gl.useProgram(this.progFx.p);
      gl.uniform1i(L.uNEv, fr.nEvents); gl.uniform1i(L.uFirst, 0); gl.uniform1f(L.uNow, fr.now); gl.uniformMatrix4fv(L.uVP, false, R.glVp); gl.uniform3f(L.uCam, cam.x, cam.y, cam.z); gl.uniform3fv(L.uRight, r); gl.uniform3fv(L.uUp, u); gl.uniform3fv(L.uSun, lt.directDir);
      gl.uniform4f(L.uLight, lt.ambient, lt.direct, lt.albedo, lt.g); gl.uniform2f(L.uKappa, fr.kappa[0], fr.kappa[1]); gl.uniform4f(L.uExtra, lt.floor, 1, cam.near, cam.far); gl.uniform2f(L.uNF, cam.near, cam.far);
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS); gl.depthMask(false); gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, fr.nSprites); this.stats.fxDraws++; this.stats.spritesDrawn = fr.nSprites;
    }
    restoreState(gl, s);
  }
  dispose() { const gl = this.gl; for (const p of [this.progMul, this.progAdd, this.progFx]) if (p) gl.deleteProgram(p.p); for (const t of [this.tEv, this.tCum, this.tWind]) gl.deleteTexture(t); gl.deleteVertexArray(this.vao); this.ok = false; }
}

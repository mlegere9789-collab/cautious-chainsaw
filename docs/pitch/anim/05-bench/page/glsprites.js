// Instanced sprite renderer shared by the standalone WebGL overlay and the Mapbox custom layer: one draw call per (pass, atlas page).
// Screen-space design: the CPU projects every tile in double precision and uploads pixel positions, so there is no float32 precision loss at any zoom
// (the usual source of GPU-side shimmer) and the same shader serves an own canvas and Mapbox's context.
const VS = `#version 300 es
in vec2 a_corner; in vec4 i_rect; in vec4 i_uv; in vec4 i_misc;
uniform vec2 u_res; out vec2 v_uv; out float v_a;
void main(){ vec2 p=(a_corner-0.5)*i_rect.zw; float c=cos(i_misc.y), s=sin(i_misc.y); p=vec2(p.x*c-p.y*s, p.x*s+p.y*c);
  vec2 px=i_rect.xy+p; gl_Position=vec4(px.x/u_res.x*2.0-1.0, 1.0-px.y/u_res.y*2.0, 0.0, 1.0);
  v_uv=mix(i_uv.xy,i_uv.zw,a_corner); v_a=i_misc.x; }`;
const FS = `#version 300 es
precision mediump float; in vec2 v_uv; in float v_a; uniform sampler2D u_tex; out vec4 o;
void main(){ o=texture(u_tex,v_uv)*v_a; }`;
export const STRIDE = 12;
export class GLSprites {
  constructor(gl, atlas, passes = 4, maxPer = 1024) {
    this.gl = gl; this.atlas = atlas; this.passes = passes; this.maxPer = maxPer;
    const mk = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const pr = this.pr = gl.createProgram(); gl.attachShader(pr, mk(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, mk(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    this.loc = { corner: gl.getAttribLocation(pr, 'a_corner'), rect: gl.getAttribLocation(pr, 'i_rect'), uv: gl.getAttribLocation(pr, 'i_uv'), misc: gl.getAttribLocation(pr, 'i_misc'), res: gl.getUniformLocation(pr, 'u_res'), tex: gl.getUniformLocation(pr, 'u_tex') };
    this.vao = gl.createVertexArray(); gl.bindVertexArray(this.vao);
    const qb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, qb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(this.loc.corner); gl.vertexAttribPointer(this.loc.corner, 2, gl.FLOAT, false, 0, 0);
    this.ib = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.ib); gl.bufferData(gl.ARRAY_BUFFER, maxPer * STRIDE * 4, gl.DYNAMIC_DRAW);
    for (const [name, off] of [['rect', 0], ['uv', 4], ['misc', 8]]) { const l = this.loc[name]; gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 4, gl.FLOAT, false, STRIDE * 4, off * 4); gl.vertexAttribDivisor(l, 1); }
    gl.bindVertexArray(null);
    this.tex = []; this.texV = []; this.lists = [];                                    // lists[pass][page] = {a: Float32Array, n}
    for (let p = 0; p < passes; p++) this.lists.push([]);
  }
  reset() { for (const L of this.lists) for (const e of L) if (e) e.n = 0; }
  push(pass, page, x, y, w, h, u0, v0, u1, v1, alpha, rot) {
    const L = this.lists[pass]; let e = L[page]; if (!e) e = L[page] = { a: new Float32Array(this.maxPer * STRIDE), n: 0 };
    if (e.n >= this.maxPer) return;
    const a = e.a, o = e.n++ * STRIDE;
    a[o] = x; a[o + 1] = y; a[o + 2] = w; a[o + 3] = h; a[o + 4] = u0; a[o + 5] = v0; a[o + 6] = u1; a[o + 7] = v1; a[o + 8] = alpha; a[o + 9] = rot; a[o + 10] = 0; a[o + 11] = 0;
  }
  syncTextures() {
    const gl = this.gl;
    this.atlas.pages.forEach((pg, i) => {
      if (!this.tex[i]) { this.tex[i] = gl.createTexture(); this.texV[i] = -1; }
      if (this.texV[i] === pg.v) return;
      gl.bindTexture(gl.TEXTURE_2D, this.tex[i]);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, pg.c);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      this.texV[i] = pg.v;
    });
  }
  draw(resW, resH) {                                                                  // resW/H in CSS px; the caller sets the GL viewport
    const gl = this.gl; this.syncTextures();
    gl.useProgram(this.pr); gl.bindVertexArray(this.vao); gl.bindBuffer(gl.ARRAY_BUFFER, this.ib);
    gl.uniform2f(this.loc.res, resW, resH); gl.uniform1i(this.loc.tex, 0); gl.activeTexture(gl.TEXTURE0);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.disable(gl.STENCIL_TEST); gl.disable(gl.SCISSOR_TEST);
    for (const L of this.lists) L.forEach((e, page) => {
      if (!e || !e.n) return;
      gl.bindTexture(gl.TEXTURE_2D, this.tex[page]);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, e.a, 0, e.n * STRIDE);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, e.n);
    });
    gl.bindVertexArray(null);
  }
}

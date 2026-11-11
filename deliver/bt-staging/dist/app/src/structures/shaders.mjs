// Shaders of the structures classes, written twice: WGSL (appended to the prototype's common(K): frame uniforms, hAt, shadowAt, lit, fogged, hsh) and GLSL ES 3.00 (appended to
// the prototype's PRE(K) by GLRenderer.prog). Flat colours by material class, no photograph claim. Per-object state is read from one array (storage buffer / float texture):
//   s0 = (visible, A.x, A.y, mix)   s1 = (B.x, B.y, uncertain, tier)
// where A is the picture before the change and B after, and `mix` is the share of the object (screen-door by world cell, or panel by panel) that shows B: a change inside a clock
// window grows with progress; a change dated only to a day shows half and half (and the card says so).
const lin = c => c.map(v => Math.pow(v / 255, 2.2).toFixed(4));
const v3 = c => `vec3f(${lin(c).join(', ')})`, g3 = c => `vec3(${lin(c).join(', ')})`;
export const PAL = {
  wall: [[150, 140, 125], [140, 70, 52], [128, 126, 118], [98, 72, 48], [170, 164, 150], [70, 62, 56], [96, 90, 84], [60, 52, 44], [160, 150, 138]],       // 0 generic, brick, stone, log, frame, shingle roof, mass roof, floor, mass wall
  char: [26, 22, 20],
  post: [112, 94, 72], rail: [132, 110, 82], stone: [124, 121, 110],
  tiers: [[111, 207, 151], [224, 178, 80], [183, 156, 242], [239, 125, 107]],
  road: [[178, 174, 164], [172, 162, 142], [152, 140, 114], [118, 112, 102], [140, 126, 104]],                                                                    // macadam, dirt, cart, rail bed, grade
  tie: [58, 46, 36], steel: [86, 88, 92],
};
const wgslArr = (name, arr) => `var<private> ${name}: array<vec3f, ${arr.length}> = array<vec3f, ${arr.length}>(${arr.map(v3).join(', ')});`;
const glslArr = (name, arr) => `const vec3 ${name}[${arr.length}] = vec3[${arr.length}](${arr.map(g3).join(', ')});`;

export const wgsl = (common) => common + /* wgsl */`
@group(1) @binding(0) var<storage, read> ost: array<vec4f>;
${wgslArr('WALL', PAL.wall)}
${wgslArr('TIERC', PAL.tiers)}
${wgslArr('ROADC', PAL.road)}
const CHAR: vec3f = ${v3(PAL.char)};
fn hv3(p: vec3f) -> f32 { let q = vec3i(floor(p)); return hsh((u32(q.x + 8192) * 73856093u) ^ (u32(q.y + 8192) * 19349663u) ^ (u32(q.z + 8192) * 83492791u)); }
fn hv2(p: vec2f) -> f32 { let q = vec2i(floor(p)); return hsh((u32(q.x + 8192) * 73856093u) ^ (u32(q.y + 8192) * 19349663u)); }
fn vn2(p: vec2f) -> f32 { let i = floor(p); let f = fract(p); let u = f * f * (3.0 - 2.0 * f); return mix(mix(hv2(i), hv2(i + vec2f(1.0, 0.0)), u.x), mix(hv2(i + vec2f(0.0, 1.0)), hv2(i + vec2f(1.0, 1.0)), u.x), u.y); }
fn terrN(p: vec3f) -> vec3f { let e = 3.0; let hx = hAt(p.x + e, p.z) - hAt(p.x - e, p.z); let hz = hAt(p.x, p.z + e) - hAt(p.x, p.z - e); return normalize(vec3f(-hx, 2.0 * e, -hz)); }
const HID: vec4f = vec4f(2.0, 2.0, 2.0, 1.0);

// ---------------- buildings (static mesh; one draw call for all)
struct BIn { @location(0) pos: vec3f, @location(1) nrm: vec3f, @location(2) a: vec4f }
struct BOut { @builtin(position) pos: vec4f, @location(0) wp: vec3f, @location(1) n: vec3f, @location(2) @interpolate(flat) mt: vec4f }
@vertex fn vs_bld(in: BIn) -> BOut {
  var o: BOut; let oid = u32(in.a.x + 0.5); let s0 = ost[oid * 2u]; o.wp = in.pos; o.n = in.nrm; o.mt = in.a;
  if (s0.x < 0.5) { o.pos = HID; return o; }
  o.pos = F.vp * vec4f(in.pos, 1.0); return o;
}
@vertex fn vs_bld_shadow(in: BIn) -> @builtin(position) vec4f { let oid = u32(in.a.x + 0.5); let s0 = ost[oid * 2u]; if (s0.x < 0.5) { return HID; } return F.vp * vec4f(in.pos, 1.0); }
@fragment fn fs_bld(in: BOut) -> @location(0) vec4f {
  let oid = u32(in.mt.x + 0.5); let s0 = ost[oid * 2u]; let s1 = ost[oid * 2u + 1u]; let kind = u32(in.mt.y + 0.5); let mat = u32(in.mt.z + 0.5);
  var burn = s0.y; var dmg = s0.z; if (hv3(in.wp * 2.5) < s0.w) { burn = s1.x; dmg = s1.y; }
  if (kind == 1u && burn > 0.5) { discard; }
  var alb = WALL[min(mat, 8u)];
  if (kind == 0u && mat == 2u) { let c = floor(in.wp.y * 3.2); let j = hv2(vec2f(floor((in.wp.x + in.wp.z) * 2.2 + c * 0.5), c)); alb = alb * (0.82 + 0.3 * j); }
  if (kind == 0u && mat == 1u) { let c = floor(in.wp.y * 11.0); let j = hv2(vec2f(floor((in.wp.x + in.wp.z) * 4.5 + c * 0.5), c)); alb = alb * (0.88 + 0.22 * j); }
  if (kind == 0u && mat == 3u) { alb = alb * (0.8 + 0.3 * hv2(vec2f(0.0, floor(in.wp.y * 6.0)))); }
  let spk = hv3(in.wp * 7.0); if (dmg > 0.0 && spk > 1.0 - dmg * 0.16) { alb = alb * 0.3; }
  alb = mix(alb, CHAR, clamp(burn, 0.0, 1.0) * 0.92);
  let V = normalize(F.cam.xyz - in.wp); var N = normalize(in.n); var inside = false; if (kind != 2u && dot(N, V) < 0.0) { N = -N; inside = true; }
  var sh = shadowAt(in.wp); if (inside) { sh = 0.15; }
  let ao = clamp(0.55 + 0.45 * smoothstep(0.0, 2.2, in.wp.y - hAt(in.wp.x, in.wp.z)), 0.0, 1.0) * select(1.0, 0.6, inside);
  return vec4f(fogged(lit(alb, 0.92, 0.0, N, in.wp, sh, ao), in.wp), 1.0);
}

// ---------------- fences and walls: panel instances (x0, z0, x1, z1) (obj, style, height, salt) on a panel mesh (xs, off, y, z) (n, mat)
struct FIn { @location(0) m: vec4f, @location(1) n: vec4f, @location(2) i0: vec4f, @location(3) i1: vec4f }
struct FOut { @builtin(position) pos: vec4f, @location(0) wp: vec3f, @location(1) n: vec3f, @location(2) @interpolate(flat) mt: vec4f }
fn fenceState(i1: vec4f) -> vec3f {   // x = hidden (1) / lying (2) / standing (0), y unused, z = uncertain flag
  let oid = u32(i1.x + 0.5); let s0 = ost[oid * 2u]; let s1 = ost[oid * 2u + 1u];
  if (s0.x < 0.5) { return vec3f(1.0, 0.0, 0.0); }
  var down = s0.y; var gone = s0.z; if (hsh(u32(i1.w * 65536.0) + 977u) < s0.w) { down = s1.x; gone = s1.y; }
  let r = i1.w; if (r < gone) { return vec3f(1.0, 0.0, 0.0); } if (r < gone + down) { return vec3f(2.0, 0.0, 0.0); } return vec3f(0.0, 0.0, 0.0);
}
@vertex fn vs_fence(in: FIn) -> FOut {
  var o: FOut; let st = fenceState(in.i1); o.mt = vec4f(in.n.w, in.i1.x, st.x, in.i1.w); o.n = in.n.xyz;
  if (st.x == 1.0) { o.pos = HID; o.wp = vec3f(0.0); return o; }
  let a = in.i0.xy; let b = in.i0.zw; let dv = b - a; let len = max(length(dv), 0.01); let d = dv / len; let pr = vec2f(-d.y, d.x);
  let flip = select(1.0, -1.0, in.i1.y > 1.5 && (u32(in.i1.w * 4096.0) & 1u) == 1u);
  let along = in.m.x * len + in.m.y; var lat = in.m.w * flip; var yy = in.m.z;
  if (st.x == 2.0) { yy = yy * 0.1 + 0.05; lat = lat + (in.m.z / 1.52) * (hsh(u32(in.i1.w * 65536.0) + 31u) - 0.5) * 1.6; }
  let xz = a + d * along + pr * lat; let g = hAt(xz.x, xz.y);
  o.wp = vec3f(xz.x, g + yy, xz.y); o.pos = F.vp * vec4f(o.wp, 1.0); return o;
}
@fragment fn fs_fence(in: FOut) -> @location(0) vec4f {
  let mat = u32(in.mt.x + 0.5); var alb = vec3f(0.0);
  if (mat == 0u) { alb = ${v3(PAL.post)}; } else if (mat == 1u) { alb = ${v3(PAL.rail)}; } else {
    let c = floor(in.wp.y * 4.0); let j = hv2(vec2f(floor((in.wp.x + in.wp.z) * 2.6 + c * 0.5), c)); alb = ${v3(PAL.stone)} * (0.78 + 0.34 * j); }
  alb = alb * (0.9 + 0.2 * hv3(in.wp * 3.0));
  let N = normalize(in.n); let sh = shadowAt(in.wp); let ao = clamp(0.6 + 0.4 * smoothstep(0.0, 0.8, in.wp.y - hAt(in.wp.x, in.wp.z)), 0.0, 1.0);
  return vec4f(fogged(lit(alb, 0.95, 0.0, select(N, -N, dot(N, F.cam.xyz - in.wp) < 0.0), in.wp, sh, ao), in.wp), 1.0);
}
// far impostor: the panel as a thin ribbon on the ground plus a vertical plane, 12 vertices per panel (no mesh)
struct IOut { @builtin(position) pos: vec4f, @location(0) wp: vec3f, @location(1) k: f32 }
@vertex fn vs_line(@builtin(vertex_index) vi: u32, @location(2) i0: vec4f, @location(3) i1: vec4f) -> IOut {
  var o: IOut; let st = fenceState(i1); o.k = select(0.0, 1.0, i1.y > 0.5 && i1.y < 1.5); if (st.x == 1.0) { o.pos = HID; o.wp = vec3f(0.0); return o; }
  let a = i0.xy; let b = i0.zw; let dv = b - a; let len = max(length(dv), 0.01); let d = dv / len; let pr = vec2f(-d.y, d.x);
  let q = vi % 6u; let quad = vi / 6u; var uvs = array<vec2f, 6>(vec2f(0.0, 0.0), vec2f(1.0, 0.0), vec2f(1.0, 1.0), vec2f(0.0, 0.0), vec2f(1.0, 1.0), vec2f(0.0, 1.0)); let uv = uvs[q];
  let h = select(1.52, 0.76, o.k > 0.5);
  var xz = a + d * (uv.x * len); var y = 0.0;
  if (quad == 0u) { xz = xz + pr * (uv.y - 0.5) * 0.9; y = select(0.12, 0.08, st.x == 2.0); } else { y = uv.y * select(h, 0.1, st.x == 2.0); }
  o.wp = vec3f(xz.x, hAt(xz.x, xz.y) + y, xz.y); o.pos = F.vp * vec4f(o.wp, 1.0); return o;
}
@fragment fn fs_line(in: IOut) -> @location(0) vec4f {
  let alb = select(${v3(PAL.rail)}, ${v3(PAL.stone)}, in.k > 0.5); let N = vec3f(0.0, 1.0, 0.0);
  return vec4f(fogged(lit(alb, 0.95, 0.0, N, in.wp, 1.0, 0.9), in.wp), 1.0);
}

// ---------------- markers: pole + diamond, instance (x, z, obj, scale) (tier, kind)
struct MIn { @location(0) pos: vec3f, @location(1) nrm: vec3f, @location(2) i0: vec4f, @location(3) i1: vec4f }
struct MOut { @builtin(position) pos: vec4f, @location(0) wp: vec3f, @location(1) n: vec3f, @location(2) @interpolate(flat) mt: vec4f, @location(3) hy: f32 }
@vertex fn vs_mark(in: MIn) -> MOut {
  var o: MOut; let oid = u32(in.i0.z + 0.5); let s0 = ost[oid * 2u]; o.mt = vec4f(in.i0.z, in.i1.x, in.i1.y, 0.0); o.hy = in.pos.y; o.n = in.nrm; o.wp = vec3f(0.0);
  if (s0.x < 0.5) { o.pos = HID; return o; }
  let g = hAt(in.i0.x, in.i0.y); let dist = length(vec3f(in.i0.x, g, in.i0.y) - F.cam.xyz); let sc = clamp(dist / 260.0, 1.0, 16.0);
  o.wp = vec3f(in.i0.x + in.pos.x * sc, g + in.pos.y * sc, in.i0.y + in.pos.z * sc); o.pos = F.vp * vec4f(o.wp, 1.0); return o;
}
@fragment fn fs_mark(in: MOut) -> @location(0) vec4f {
  let oid = u32(in.mt.x + 0.5); let s0 = ost[oid * 2u]; let s1 = ost[oid * 2u + 1u]; var burn = s0.y; if (hv3(in.wp * 6.0) < s0.w) { burn = s1.x; }
  var alb = TIERC[min(u32(in.mt.y + 0.5), 3u)]; if (in.hy < 3.99) { alb = vec3f(0.12, 0.1, 0.09); } alb = mix(alb, CHAR, clamp(burn, 0.0, 1.0) * 0.9);
  let N = normalize(in.n); let sh = shadowAt(in.wp); let c = lit(alb, 0.6, 0.0, N, in.wp, sh, 0.9) + alb * 0.28;
  return vec4f(fogged(c, in.wp), 1.0);
}

// ---------------- roads and railway: ground ribbons, (x, z, u, v) (mat, obj)
struct ROut { @builtin(position) pos: vec4f, @location(0) wp: vec3f, @location(1) uvm: vec3f }
@vertex fn vs_road(@location(0) p: vec4f, @location(1) m: vec2f) -> ROut {
  var o: ROut; let g = hAt(p.x, p.y); let dist = length(vec3f(p.x, g, p.y) - F.cam.xyz); let lift = 0.05 + dist * 0.0011;
  o.wp = vec3f(p.x, g + lift, p.y); o.pos = F.vp * vec4f(o.wp, 1.0); o.uvm = vec3f(p.z, p.w, m.x); return o;
}
@fragment fn fs_road(in: ROut) -> @location(0) vec4f {
  let mat = u32(in.uvm.z + 0.5); let av = abs(in.uvm.y); var alb = ROADC[min(mat, 4u)]; var a = 1.0 - smoothstep(0.7, 1.0, av);
  let n1 = vn2(in.wp.xz * 0.8); alb = alb * (0.88 + 0.24 * n1);
  if (mat == 1u || mat == 2u) { let rut = 1.0 - smoothstep(0.0, 0.12, abs(av - 0.42)); alb = alb * (1.0 - 0.22 * rut); a = a * 0.92; }
  if (mat == 3u) { let tie = 1.0 - smoothstep(0.22, 0.30, abs(fract(in.uvm.x / 0.65) - 0.5)); alb = mix(alb, ${v3(PAL.tie)}, tie * step(av, 0.78)); let rl = 1.0 - smoothstep(0.05, 0.1, abs(av - 0.38)); alb = mix(alb, ${v3(PAL.steel)}, rl); }
  let N = terrN(in.wp); let sh = shadowAt(in.wp);
  return vec4f(fogged(lit(alb, 0.95, 0.0, N, in.wp, sh, 1.0), in.wp), a * 0.94);
}
`;

// ---------------------------------------------------------------------------------------------------------------------------------------------------------- GLSL
const GL_HEAD = /* glsl */`
uniform sampler2D uStruct;
vec4 OS(int i) { return texelFetch(uStruct, ivec2(i & 1023, i >> 10), 0); }
${glslArr('WALL', PAL.wall)}
${glslArr('TIERC', PAL.tiers)}
${glslArr('ROADC', PAL.road)}
const vec3 CHAR = ${g3(PAL.char)};
float hv3(vec3 p) { ivec3 q = ivec3(floor(p)); return hsh((uint(q.x + 8192) * 73856093u) ^ (uint(q.y + 8192) * 19349663u) ^ (uint(q.z + 8192) * 83492791u)); }
float hv2(vec2 p) { ivec2 q = ivec2(floor(p)); return hsh((uint(q.x + 8192) * 73856093u) ^ (uint(q.y + 8192) * 19349663u)); }
float vn2(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f); return mix(mix(hv2(i), hv2(i + vec2(1.0, 0.0)), u.x), mix(hv2(i + vec2(0.0, 1.0)), hv2(i + vec2(1.0, 1.0)), u.x), u.y); }
vec3 terrN(vec3 p) { float e = 3.0; float hx = hAt(p.x + e, p.z) - hAt(p.x - e, p.z); float hz = hAt(p.x, p.z + e) - hAt(p.x, p.z - e); return normalize(vec3(-hx, 2.0 * e, -hz)); }
const vec4 HID = vec4(2.0, 2.0, 2.0, 1.0);
`;
export const glsl = {
  bldVS: `layout(location=0) in vec3 pos; layout(location=1) in vec3 nrm; layout(location=2) in vec4 aa;
out vec3 vWp; out vec3 vN; flat out vec4 vMt;
void main() { vWp = pos; vN = nrm; vMt = aa; vec4 s0 = OS(int(aa.x + 0.5) * 2); if (s0.x < 0.5) { gl_Position = HID; return; } gl_Position = vp * vec4(pos, 1.0); }`,
  bldFS: `in vec3 vWp; in vec3 vN; flat in vec4 vMt; out vec4 o;
void main() {
  int oid = int(vMt.x + 0.5); vec4 s0 = OS(oid * 2); vec4 s1 = OS(oid * 2 + 1); int kind = int(vMt.y + 0.5); int mat = int(vMt.z + 0.5);
  float burn = s0.y; float dmg = s0.z; if (hv3(vWp * 2.5) < s0.w) { burn = s1.x; dmg = s1.y; }
  if (kind == 1 && burn > 0.5) discard;
  vec3 alb = WALL[min(mat, 8)];
  if (kind == 0 && mat == 2) { float c = floor(vWp.y * 3.2); float j = hv2(vec2(floor((vWp.x + vWp.z) * 2.2 + c * 0.5), c)); alb *= 0.82 + 0.3 * j; }
  if (kind == 0 && mat == 1) { float c = floor(vWp.y * 11.0); float j = hv2(vec2(floor((vWp.x + vWp.z) * 4.5 + c * 0.5), c)); alb *= 0.88 + 0.22 * j; }
  if (kind == 0 && mat == 3) { alb *= 0.8 + 0.3 * hv2(vec2(0.0, floor(vWp.y * 6.0))); }
  float spk = hv3(vWp * 7.0); if (dmg > 0.0 && spk > 1.0 - dmg * 0.16) alb *= 0.3;
  alb = mix(alb, CHAR, clamp(burn, 0.0, 1.0) * 0.92);
  vec3 V = normalize(cam.xyz - vWp); vec3 N = normalize(vN); bool inside = false; if (kind != 2 && dot(N, V) < 0.0) { N = -N; inside = true; }
  float sh = inside ? 0.15 : shadowAt(vWp);
  float ao = clamp(0.55 + 0.45 * smoothstep(0.0, 2.2, vWp.y - hAt(vWp.x, vWp.z)), 0.0, 1.0) * (inside ? 0.6 : 1.0);
  o = vec4(fogged(lit(alb, 0.92, 0.0, N, vWp, sh, ao), vWp), 1.0);
}`,
  bldShadowVS: `layout(location=0) in vec3 pos; layout(location=2) in vec4 aa; void main() { vec4 s0 = OS(int(aa.x + 0.5) * 2); if (s0.x < 0.5) { gl_Position = HID; return; } gl_Position = vp * vec4(pos, 1.0); }`,
  fenceVS: `layout(location=0) in vec4 m; layout(location=1) in vec4 nn; layout(location=2) in vec4 i0; layout(location=3) in vec4 i1; out vec3 vWp; out vec3 vN; flat out vec4 vMt;
vec3 fenceState(vec4 j1) { int oid = int(j1.x + 0.5); vec4 s0 = OS(oid * 2); vec4 s1 = OS(oid * 2 + 1); if (s0.x < 0.5) return vec3(1.0, 0.0, 0.0);
  float down = s0.y; float gone = s0.z; if (hsh(uint(j1.w * 65536.0) + 977u) < s0.w) { down = s1.x; gone = s1.y; }
  float r = j1.w; if (r < gone) return vec3(1.0, 0.0, 0.0); if (r < gone + down) return vec3(2.0, 0.0, 0.0); return vec3(0.0); }
void main() { vec3 st = fenceState(i1); vMt = vec4(nn.w, i1.x, st.x, i1.w); vN = nn.xyz; vWp = vec3(0.0); if (st.x == 1.0) { gl_Position = HID; return; }
  vec2 a = i0.xy; vec2 b = i0.zw; vec2 dv = b - a; float len = max(length(dv), 0.01); vec2 d = dv / len; vec2 pr = vec2(-d.y, d.x);
  float flip = (i1.y > 1.5 && (uint(i1.w * 4096.0) & 1u) == 1u) ? -1.0 : 1.0; float along = m.x * len + m.y; float lat = m.w * flip; float yy = m.z;
  if (st.x == 2.0) { yy = yy * 0.1 + 0.05; lat += (m.z / 1.52) * (hsh(uint(i1.w * 65536.0) + 31u) - 0.5) * 1.6; }
  vec2 xz = a + d * along + pr * lat; float g = hAt(xz.x, xz.y); vWp = vec3(xz.x, g + yy, xz.y); gl_Position = vp * vec4(vWp, 1.0); }`,
  fenceFS: `in vec3 vWp; in vec3 vN; flat in vec4 vMt; out vec4 o;
void main() { int mat = int(vMt.x + 0.5); vec3 alb;
  if (mat == 0) alb = ${g3(PAL.post)}; else if (mat == 1) alb = ${g3(PAL.rail)}; else { float c = floor(vWp.y * 4.0); float j = hv2(vec2(floor((vWp.x + vWp.z) * 2.6 + c * 0.5), c)); alb = ${g3(PAL.stone)} * (0.78 + 0.34 * j); }
  alb *= 0.9 + 0.2 * hv3(vWp * 3.0); vec3 N = normalize(vN); if (dot(N, cam.xyz - vWp) < 0.0) N = -N; float ao = clamp(0.6 + 0.4 * smoothstep(0.0, 0.8, vWp.y - hAt(vWp.x, vWp.z)), 0.0, 1.0);
  o = vec4(fogged(lit(alb, 0.95, 0.0, N, vWp, shadowAt(vWp), ao), vWp), 1.0); }`,
  lineVS: `layout(location=2) in vec4 i0; layout(location=3) in vec4 i1; out vec3 vWp; out float vK;
vec3 fenceState(vec4 j1) { int oid = int(j1.x + 0.5); vec4 s0 = OS(oid * 2); vec4 s1 = OS(oid * 2 + 1); if (s0.x < 0.5) return vec3(1.0, 0.0, 0.0);
  float down = s0.y; float gone = s0.z; if (hsh(uint(j1.w * 65536.0) + 977u) < s0.w) { down = s1.x; gone = s1.y; }
  float r = j1.w; if (r < gone) return vec3(1.0, 0.0, 0.0); if (r < gone + down) return vec3(2.0, 0.0, 0.0); return vec3(0.0); }
void main() { vec3 st = fenceState(i1); vK = (i1.y > 0.5 && i1.y < 1.5) ? 1.0 : 0.0; vWp = vec3(0.0); if (st.x == 1.0) { gl_Position = HID; return; }
  vec2 a = i0.xy; vec2 b = i0.zw; vec2 dv = b - a; float len = max(length(dv), 0.01); vec2 d = dv / len; vec2 pr = vec2(-d.y, d.x);
  int vi = gl_VertexID; int q = vi % 6; int quad = vi / 6; vec2 uv = q == 0 ? vec2(0.0, 0.0) : q == 1 ? vec2(1.0, 0.0) : q == 2 ? vec2(1.0, 1.0) : q == 3 ? vec2(0.0, 0.0) : q == 4 ? vec2(1.0, 1.0) : vec2(0.0, 1.0);
  float h = vK > 0.5 ? 0.76 : 1.52; vec2 xz = a + d * (uv.x * len); float y = 0.0;
  if (quad == 0) { xz += pr * (uv.y - 0.5) * 0.9; y = st.x == 2.0 ? 0.08 : 0.12; } else { y = uv.y * (st.x == 2.0 ? 0.1 : h); }
  vWp = vec3(xz.x, hAt(xz.x, xz.y) + y, xz.y); gl_Position = vp * vec4(vWp, 1.0); }`,
  lineFS: `in vec3 vWp; in float vK; out vec4 o; void main() { vec3 alb = vK > 0.5 ? ${g3(PAL.stone)} : ${g3(PAL.rail)}; o = vec4(fogged(lit(alb, 0.95, 0.0, vec3(0.0, 1.0, 0.0), vWp, 1.0, 0.9), vWp), 1.0); }`,
  markVS: `layout(location=0) in vec3 pos; layout(location=1) in vec3 nrm; layout(location=2) in vec4 i0; layout(location=3) in vec4 i1; out vec3 vWp; out vec3 vN; flat out vec4 vMt; out float vHy;
void main() { vMt = vec4(i0.z, i1.x, i1.y, 0.0); vHy = pos.y; vN = nrm; vWp = vec3(0.0); vec4 s0 = OS(int(i0.z + 0.5) * 2); if (s0.x < 0.5) { gl_Position = HID; return; }
  float g = hAt(i0.x, i0.y); float dist = length(vec3(i0.x, g, i0.y) - cam.xyz); float sc = clamp(dist / 260.0, 1.0, 16.0);
  vWp = vec3(i0.x + pos.x * sc, g + pos.y * sc, i0.y + pos.z * sc); gl_Position = vp * vec4(vWp, 1.0); }`,
  markFS: `in vec3 vWp; in vec3 vN; flat in vec4 vMt; in float vHy; out vec4 o;
void main() { int oid = int(vMt.x + 0.5); vec4 s0 = OS(oid * 2); vec4 s1 = OS(oid * 2 + 1); float burn = s0.y; if (hv3(vWp * 6.0) < s0.w) burn = s1.x;
  vec3 alb = TIERC[min(int(vMt.y + 0.5), 3)]; if (vHy < 3.99) alb = vec3(0.12, 0.1, 0.09); alb = mix(alb, CHAR, clamp(burn, 0.0, 1.0) * 0.9);
  vec3 N = normalize(vN); vec3 c = lit(alb, 0.6, 0.0, N, vWp, shadowAt(vWp), 0.9) + alb * 0.28; o = vec4(fogged(c, vWp), 1.0); }`,
  roadVS: `layout(location=0) in vec4 p; layout(location=1) in vec2 m; out vec3 vWp; out vec3 vUvm;
void main() { float g = hAt(p.x, p.y); float dist = length(vec3(p.x, g, p.y) - cam.xyz); float lift = 0.05 + dist * 0.0011; vWp = vec3(p.x, g + lift, p.y); gl_Position = vp * vec4(vWp, 1.0); vUvm = vec3(p.z, p.w, m.x); }`,
  roadFS: `in vec3 vWp; in vec3 vUvm; out vec4 o;
void main() { int mat = int(vUvm.z + 0.5); float av = abs(vUvm.y); vec3 alb = ROADC[min(mat, 4)]; float a = 1.0 - smoothstep(0.7, 1.0, av);
  alb *= 0.88 + 0.24 * vn2(vWp.xz * 0.8);
  if (mat == 1 || mat == 2) { float rut = 1.0 - smoothstep(0.0, 0.12, abs(av - 0.42)); alb *= 1.0 - 0.22 * rut; a *= 0.92; }
  if (mat == 3) { float tie = 1.0 - smoothstep(0.22, 0.30, abs(fract(vUvm.x / 0.65) - 0.5)); alb = mix(alb, ${g3(PAL.tie)}, tie * step(av, 0.78)); float rl = 1.0 - smoothstep(0.05, 0.1, abs(av - 0.38)); alb = mix(alb, ${g3(PAL.steel)}, rl); }
  vec3 N = terrN(vWp); o = vec4(fogged(lit(alb, 0.95, 0.0, N, vWp, shadowAt(vWp), 1.0), vWp), a * 0.94); }`,
  head: GL_HEAD,
};

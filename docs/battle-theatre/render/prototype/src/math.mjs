// Minimal column-major math (Float32Array / plain arrays). WebGPU clip space: z in [0,1].
export const D2R = Math.PI / 180;
export function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export function mat4() { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; }
export function mul(a, b, out = new Float32Array(16)) { // out = a * b
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; out[c * 4 + r] = s; } return out; }
export function perspective(fovy, aspect, near, far, out = new Float32Array(16)) {
  const f = 1 / Math.tan(fovy / 2); out.fill(0); out[0] = f / aspect; out[5] = f; out[10] = far / (near - far); out[11] = -1; out[14] = near * far / (near - far); return out; }
export function ortho(l, r, b, t, n, f, out = new Float32Array(16)) { out.fill(0); out[0] = 2 / (r - l); out[5] = 2 / (t - b); out[10] = 1 / (n - f); out[12] = -(r + l) / (r - l); out[13] = -(t + b) / (t - b); out[14] = n / (n - f); out[15] = 1; return out; }
export function lookAt(e, c, up, out = new Float32Array(16)) {
  let zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2]; let l = Math.hypot(zx, zy, zz) || 1; zx /= l; zy /= l; zz /= l;
  let xx = up[1] * zz - up[2] * zy, xy = up[2] * zx - up[0] * zz, xz = up[0] * zy - up[1] * zx; l = Math.hypot(xx, xy, xz) || 1; xx /= l; xy /= l; xz /= l;
  const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
  out[0] = xx; out[1] = yx; out[2] = zx; out[3] = 0; out[4] = xy; out[5] = yy; out[6] = zy; out[7] = 0; out[8] = xz; out[9] = yz; out[10] = zz; out[11] = 0;
  out[12] = -(xx * e[0] + xy * e[1] + xz * e[2]); out[13] = -(yx * e[0] + yy * e[1] + yz * e[2]); out[14] = -(zx * e[0] + zy * e[1] + zz * e[2]); out[15] = 1; return out; }
export function invert(m, out = new Float32Array(16)) {
  const a = m, b = new Float64Array(16); const [a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23, a30, a31, a32, a33] = a;
  const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12,
    b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
  let d = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06; d = 1 / d;
  out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * d; out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * d; out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * d; out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * d;
  out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * d; out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * d; out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * d; out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * d;
  out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * d; out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * d; out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * d; out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * d;
  out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * d; out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * d; out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * d; out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * d; return out; }
export function frustumPlanes(vp, out = new Float32Array(24)) { // left,right,bottom,top,near,far (normalised, inside = positive); WebGPU z in [0,1]
  const r = (i) => [vp[i], vp[4 + i], vp[8 + i], vp[12 + i]]; const r0 = r(0), r1 = r(1), r2 = r(2), r3 = r(3);
  const P = [[r3[0] + r0[0], r3[1] + r0[1], r3[2] + r0[2], r3[3] + r0[3]], [r3[0] - r0[0], r3[1] - r0[1], r3[2] - r0[2], r3[3] - r0[3]],
    [r3[0] + r1[0], r3[1] + r1[1], r3[2] + r1[2], r3[3] + r1[3]], [r3[0] - r1[0], r3[1] - r1[1], r3[2] - r1[2], r3[3] - r1[3]],
    [r2[0], r2[1], r2[2], r2[3]], [r3[0] - r2[0], r3[1] - r2[1], r3[2] - r2[2], r3[3] - r2[3]]];
  P.forEach((p, i) => { const l = Math.hypot(p[0], p[1], p[2]) || 1; out[i * 4] = p[0] / l; out[i * 4 + 1] = p[1] / l; out[i * 4 + 2] = p[2] / l; out[i * 4 + 3] = p[3] / l; }); return out; }
export function sphereInFrustum(pl, x, y, z, r) { for (let i = 0; i < 24; i += 4) if (pl[i] * x + pl[i + 1] * y + pl[i + 2] * z + pl[i + 3] < -r) return false; return true; }
// quaternions [x,y,z,w]
export function qmul(a, b) { return [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]]; }
export function qeuler(x, y, z) { // YXZ order
  const cx = Math.cos(x / 2), sx = Math.sin(x / 2), cy = Math.cos(y / 2), sy = Math.sin(y / 2), cz = Math.cos(z / 2), sz = Math.sin(z / 2);
  return [sx * cy * cz + cx * sy * sz, cx * sy * cz - sx * cy * sz, cx * cy * sz - sx * sy * cz, cx * cy * cz + sx * sy * sz]; }
export function qmat(q, m = new Float32Array(9)) { const [x, y, z, w] = q; const xx = x * x, yy = y * y, zz = z * z, xy = x * y, xz = x * z, yz = y * z, wx = w * x, wy = w * y, wz = w * z;
  m[0] = 1 - 2 * (yy + zz); m[1] = 2 * (xy + wz); m[2] = 2 * (xz - wy); m[3] = 2 * (xy - wz); m[4] = 1 - 2 * (xx + zz); m[5] = 2 * (yz + wx); m[6] = 2 * (xz + wy); m[7] = 2 * (yz - wx); m[8] = 1 - 2 * (xx + yy); return m; } // column-major 3x3
export function hsh(n) { n = (n ^ 61) ^ (n >>> 16); n = (n + (n << 3)) | 0; n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); n ^= n >>> 15; return (n >>> 0) / 4294967296; }

// Small deterministic math for the figure generators (no dependencies). Right-handed, y up, +z forward, +x = the figure's LEFT (glTF convention).
export const v3 = { add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: a => Math.hypot(a[0], a[1], a[2]), norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t] };
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const r6 = x => Math.round(x * 1e6) / 1e6;
// orthonormal frame (u, v) perpendicular to unit vector d, deterministic
export function frame(d) { let u = Math.abs(d[0]) < 0.9 ? [1, 0, 0] : [0, 0, 1]; const dp = v3.dot(u, d); u = v3.norm([u[0] - dp * d[0], u[1] - dp * d[1], u[2] - dp * d[2]]); return [u, v3.cross(d, u)]; }
// 4x4 column-major matrices (Float64Array(16)) for the rigid parts we need: translation + rotation + uniform scale
export const m4 = {
  ident: () => { const m = new Float64Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; },
  mul(a, b) { const o = new Float64Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; },
  trs(t, q, s = 1) { const [x, y, z, w] = q, m = new Float64Array(16); const xx = x * x, yy = y * y, zz = z * z, xy = x * y, xz = x * z, yz = y * z, wx = w * x, wy = w * y, wz = w * z;
    m[0] = (1 - 2 * (yy + zz)) * s; m[1] = 2 * (xy + wz) * s; m[2] = 2 * (xz - wy) * s; m[4] = 2 * (xy - wz) * s; m[5] = (1 - 2 * (xx + zz)) * s; m[6] = 2 * (yz + wx) * s;
    m[8] = 2 * (xz + wy) * s; m[9] = 2 * (yz - wx) * s; m[10] = (1 - 2 * (xx + yy)) * s; m[12] = t[0]; m[13] = t[1]; m[14] = t[2]; m[15] = 1; return m; },
  translation: t => { const m = m4.ident(); m[12] = t[0]; m[13] = t[1]; m[14] = t[2]; return m; },
  point(m, p) { return [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]]; },
  dir(m, p) { return [m[0] * p[0] + m[4] * p[1] + m[8] * p[2], m[1] * p[0] + m[5] * p[1] + m[9] * p[2], m[2] * p[0] + m[6] * p[1] + m[10] * p[2]]; },
};
export const qAxisAngle = (a, ang) => { const s = Math.sin(ang / 2), n = v3.norm(a); return [n[0] * s, n[1] * s, n[2] * s, Math.cos(ang / 2)]; };
export const qMul = (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
// rotation taking unit vector a to unit vector b
export function qFromTo(a, b) { const d = v3.dot(a, b); if (d < -0.999999) { const [u] = frame(a); return qAxisAngle(u, Math.PI); } const c = v3.cross(a, b), q = [c[0], c[1], c[2], 1 + d], l = Math.hypot(...q); return q.map(x => x / l); }
// deterministic hash (sha256 hex) of a typed array or string, via node:crypto (node-only module; the runtime API never calls it)

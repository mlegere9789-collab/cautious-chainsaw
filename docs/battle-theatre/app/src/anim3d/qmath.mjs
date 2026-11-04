// Small allocation-free quaternion and vector kernels for the animation system. Quaternions are [x, y, z, w] in flat typed arrays (offset arguments), vectors are 3 floats.
// Conventions follow data/figures3d/skeleton.json: right-handed, +Y up, +Z forward, +X = the figure's left; Euler = intrinsic XYZ in degrees (q = qx * qy * qz); a pose is a local quaternion
// relative to the (identity-rotation) rest pose, so positive X swings a downward-pointing limb BACKWARD (knee flexion +x, elbow flexion -x, hip flexion -x).
// Determinism: pure arithmetic only (no Math.random, no clock).
// allocation-free norms (Math.hypot allocates in V8)
export const hyp2 = (a, b) => Math.sqrt(a * a + b * b), hyp3 = (a, b, c) => Math.sqrt(a * a + b * b + c * c), hyp4 = (a, b, c, d) => Math.sqrt(a * a + b * b + c * c + d * d);
export const D2R = Math.PI / 180, R2D = 180 / Math.PI;
export const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const smoother = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * t * (t * (t * 6 - 15) + 10); };

// out[o..o+3] = a * b (Hamilton product, a applied after b when rotating vectors: R(a*b) v = R(a)(R(b) v))
export function qmul(out, o, a, ao, b, bo) {
  const ax = a[ao], ay = a[ao + 1], az = a[ao + 2], aw = a[ao + 3], bx = b[bo], by = b[bo + 1], bz = b[bo + 2], bw = b[bo + 3];
  out[o] = aw * bx + ax * bw + ay * bz - az * by; out[o + 1] = aw * by - ax * bz + ay * bw + az * bx; out[o + 2] = aw * bz + ax * by - ay * bx + az * bw; out[o + 3] = aw * bw - ax * bx - ay * by - az * bz;
}
export function qset(out, o, x, y, z, w) { out[o] = x; out[o + 1] = y; out[o + 2] = z; out[o + 3] = w; }
export function qident(out, o) { out[o] = 0; out[o + 1] = 0; out[o + 2] = 0; out[o + 3] = 1; }
export function qcopy(out, o, a, ao) { out[o] = a[ao]; out[o + 1] = a[ao + 1]; out[o + 2] = a[ao + 2]; out[o + 3] = a[ao + 3]; }
export function qnorm(out, o) { const l = hyp4(out[o], out[o + 1], out[o + 2], out[o + 3]) || 1; out[o] /= l; out[o + 1] /= l; out[o + 2] /= l; out[o + 3] /= l; }
export function qconj(out, o, a, ao) { out[o] = -a[ao]; out[o + 1] = -a[ao + 1]; out[o + 2] = -a[ao + 2]; out[o + 3] = a[ao + 3]; }
// intrinsic XYZ Euler in radians -> quaternion
export function qeuler(out, o, x, y, z) {
  const cx = Math.cos(x / 2), sx = Math.sin(x / 2), cy = Math.cos(y / 2), sy = Math.sin(y / 2), cz = Math.cos(z / 2), sz = Math.sin(z / 2);
  // q = qx * qy * qz, expanded
  out[o] = sx * cy * cz + cx * sy * sz;
  out[o + 1] = cx * sy * cz - sx * cy * sz;
  out[o + 2] = cx * cy * sz + sx * sy * cz;
  out[o + 3] = cx * cy * cz - sx * sy * sz;
}
// quaternion -> intrinsic XYZ Euler (radians) into e[0..2]; q is rotation of the rest-relative pose
export function qtoEuler(e, q, o) {
  const x = q[o], y = q[o + 1], z = q[o + 2], w = q[o + 3];
  // rotation matrix of q
  const m00 = 1 - 2 * (y * y + z * z), m01 = 2 * (x * y - z * w), m02 = 2 * (x * z + y * w), m11 = 1 - 2 * (x * x + z * z), m12 = 2 * (y * z - x * w), m10 = 2 * (x * y + z * w), m20 = 2 * (x * z - y * w), m21 = 2 * (y * z + x * w), m22 = 1 - 2 * (x * x + y * y);
  // R = Rx(a) Ry(b) Rz(c):  m02 = sin b, m12 = -sin a cos b, m22 = cos a cos b, m01 = -cos b sin c, m00 = cos b cos c
  void m10; void m11; void m20; void m21;
  const sb = clamp(m02, -1, 1); e[1] = Math.asin(sb);
  if (Math.abs(sb) < 0.999999) { e[0] = Math.atan2(-m12, m22); e[2] = Math.atan2(-m01, m00); }
  else { e[0] = Math.atan2(m21, m11); e[2] = 0; }
}
export function qaxis(out, o, ax, ay, az, ang) { const l = hyp3(ax, ay, az) || 1, s = Math.sin(ang / 2) / l; out[o] = ax * s; out[o + 1] = ay * s; out[o + 2] = az * s; out[o + 3] = Math.cos(ang / 2); }
// rotate vector (vx,vy,vz) by q into r[ro..ro+2]
export function qrot(r, ro, q, o, vx, vy, vz) {
  const x = q[o], y = q[o + 1], z = q[o + 2], w = q[o + 3];
  const tx = 2 * (y * vz - z * vy), ty = 2 * (z * vx - x * vz), tz = 2 * (x * vy - y * vx);
  r[ro] = vx + w * tx + (y * tz - z * ty); r[ro + 1] = vy + w * ty + (z * tx - x * tz); r[ro + 2] = vz + w * tz + (x * ty - y * tx);
}
// shortest-arc rotation taking unit a to unit b
export function qfromTo(out, o, ax, ay, az, bx, by, bz) {
  const d = ax * bx + ay * by + az * bz;
  if (d < -0.999999) { // 180 degrees about any axis perpendicular to a
    let ux = 1, uy = 0, uz = 0; if (Math.abs(ax) > 0.9) { ux = 0; uy = 1; }
    const dp = ux * ax + uy * ay + uz * az; ux -= dp * ax; uy -= dp * ay; uz -= dp * az; const l = hyp3(ux, uy, uz) || 1;
    out[o] = ux / l; out[o + 1] = uy / l; out[o + 2] = uz / l; out[o + 3] = 0; return;
  }
  const cx = ay * bz - az * by, cy = az * bx - ax * bz, cz = ax * by - ay * bx;
  out[o] = cx; out[o + 1] = cy; out[o + 2] = cz; out[o + 3] = 1 + d; qnorm(out, o);
}
// normalised lerp with hemisphere alignment: out = nlerp(a, b, t)
export function qnlerp(out, o, a, ao, b, bo, t) {
  let bx = b[bo], by = b[bo + 1], bz = b[bo + 2], bw = b[bo + 3];
  if (a[ao] * bx + a[ao + 1] * by + a[ao + 2] * bz + a[ao + 3] * bw < 0) { bx = -bx; by = -by; bz = -bz; bw = -bw; }
  const s = 1 - t; out[o] = a[ao] * s + bx * t; out[o + 1] = a[ao + 1] * s + by * t; out[o + 2] = a[ao + 2] * s + bz * t; out[o + 3] = a[ao + 3] * s + bw * t; qnorm(out, o);
}
export function qangle(a, ao, b, bo) { const d = Math.abs(a[ao] * b[bo] + a[ao + 1] * b[bo + 1] + a[ao + 2] * b[bo + 2] + a[ao + 3] * b[bo + 3]); return 2 * Math.acos(Math.min(1, d)); }
// 3x3 helpers (row-major arrays of 9) used for frame construction
export function qfromBasis(out, o, m) { // m = [xx,xy,xz, yx,yy,yz, zx,zy,zz] as COLUMNS x,y,z of the rotation matrix
  const m00 = m[0], m10 = m[1], m20 = m[2], m01 = m[3], m11 = m[4], m21 = m[5], m02 = m[6], m12 = m[7], m22 = m[8];
  const tr = m00 + m11 + m22;
  if (tr > 0) { const s = Math.sqrt(tr + 1) * 2; out[o + 3] = 0.25 * s; out[o] = (m21 - m12) / s; out[o + 1] = (m02 - m20) / s; out[o + 2] = (m10 - m01) / s; }
  else if (m00 > m11 && m00 > m22) { const s = Math.sqrt(1 + m00 - m11 - m22) * 2; out[o + 3] = (m21 - m12) / s; out[o] = 0.25 * s; out[o + 1] = (m01 + m10) / s; out[o + 2] = (m02 + m20) / s; }
  else if (m11 > m22) { const s = Math.sqrt(1 + m11 - m00 - m22) * 2; out[o + 3] = (m02 - m20) / s; out[o] = (m01 + m10) / s; out[o + 1] = 0.25 * s; out[o + 2] = (m12 + m21) / s; }
  else { const s = Math.sqrt(1 + m22 - m00 - m11) * 2; out[o + 3] = (m10 - m01) / s; out[o] = (m02 + m20) / s; out[o + 1] = (m12 + m21) / s; out[o + 2] = 0.25 * s; }
  qnorm(out, o);
}
export const len3 = (x, y, z) => hyp3(x, y, z);

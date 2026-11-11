// CPU LOD selection shared by the WebGPU and WebGL2 renderers: unit-level cull, then soldier-level distance classes.
// Far soldiers (everyone not in a near/mid list) are drawn as impostors from a static list; the vertex shader collapses the ones that are in a nearer list.
import { sphereInFrustum } from './math.mjs';
import { soldierPlace, soldierClip, UNIT_STRIDE } from './world.mjs';

export function makeLists(cfg) {
  return { nearFoot: new Uint32Array(cfg.nearMax), midFoot: new Uint32Array(cfg.midMax), nearMnt: new Uint32Array(cfg.nearMntMax), midMnt: new Uint32Array(cfg.midMntMax), nNF: 0, nMF: 0, nNM: 0, nMM: 0, unitsTested: 0, unitsNear: 0, soldiersTested: 0 };
}
const tmp = [0, 0, 0];
export function selectLods(w, t, cam, planes, cfg, L) {
  L.nNF = L.nMF = L.nNM = L.nMM = 0; L.unitsTested = L.unitsNear = L.soldiersTested = 0;
  const f = w.unitF, T = w.T; const nearR2 = cfg.nearR * cfg.nearR, midR2 = cfg.midR * cfg.midR;
  for (let ui = 0; ui < w.units.length; ui++) {
    const u = w.units[ui], o = ui * UNIT_STRIDE; const dt = t - f[o + 8]; const ux = f[o] + f[o + 4] * dt, uz = f[o + 1] + f[o + 5] * dt; const uy = T.h(ux, uz) + 1;
    L.unitsTested++;
    const dx = ux - cam.x, dy = uy - cam.y, dz = uz - cam.z; const d = Math.hypot(dx, dy, dz); if (d - u.radius > cfg.midR) continue;
    if (!sphereInFrustum(planes, ux, uy, dz * 0 + uz, u.radius + 2)) continue; L.unitsNear++;
    const mounted = u.klass === 1;
    for (let k = 0; k < u.count; k++) { const i = u.first + k; soldierPlace(w, i, t, tmp); const x = tmp[0], z = tmp[1], y = T.h(x, z) + (mounted ? 1.3 : .9); L.soldiersTested++;
      const ddx = x - cam.x, ddy = y - cam.y, ddz = z - cam.z, d2 = ddx * ddx + ddy * ddy + ddz * ddz; if (d2 > midR2) continue;
      if (!sphereInFrustum(planes, x, y, z, mounted ? 2.2 : 1.3)) continue;
      if (mounted) { if (d2 < nearR2 && L.nNM < L.nearMnt.length) L.nearMnt[L.nNM++] = i; else if (L.nMM < L.midMnt.length) L.midMnt[L.nMM++] = i; }
      else { if (d2 < nearR2 && L.nNF < L.nearFoot.length) L.nearFoot[L.nNF++] = i; else if (L.nMF < L.midFoot.length) L.midFoot[L.nMF++] = i; } }
  }
  return L;
}

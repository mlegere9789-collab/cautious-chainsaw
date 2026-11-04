// Terrain hooks for the sound engine: line of sight over the heightfield, single-edge diffraction (acoustic shadow behind a ridge) and ridge / woods echoes.
// Input is only a height function heightAt(x, z) -> metres (the app's T.h from render/prototype/src/world.mjs, x east, z south) and, optionally, woodsAt(x, z) -> 0..1.
// The ground is the MODERN bare-earth DEM (USGS 3DEP): the macro form of Seminary / Cemetery Ridge, the Round Tops and Culp's Hill is right, trees and the 1863 fields are not in it.
// So: shadows and ridge echoes are 'inferred' (geometry from the DEM, 1863 vegetation absent); woods echoes are 'plausible-procedural' and need a woods mask to exist at all.
//
// Method (ISO 9613-2 section 7.4, written from the published equations): for the dominant diffracting edge on the profile,
//   z  = (dss + dsr) - d                         path difference over the edge (m)
//   Dz = 10 log10(3 + (C2/lambda) C3 z Kmet)     per band, C2 = 20, C3 = 1 (single edge); Dz >= 0, capped at 20 dB (single) / 25 dB (double)
//   Kmet = exp(-sqrt(dss dsr d / (2 z)) / 2000)  for z > 0 (downwind / favourable meteorological correction)
// When a path is shadowed the ISO ground term is not added (the caller zeroes it). Multiple edges: only the dominant edge is evaluated, plus a second edge when
// the profile has another point with z > 0.25 of the first and more than 150 m away (double diffraction cap 25 dB). Everything else is a documented simplification.

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const d3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

export function makeTerrain({ heightAt, woodsAt = null, extent = null, cellM = 40 } = {}) {
  if (typeof heightAt !== 'function') throw new Error('makeTerrain needs heightAt(x, z)');
  const inside = (x, z) => !extent || (Math.abs(x) <= extent.halfW && Math.abs(z) <= extent.halfH);
  const shadowCache = new Map(), echoCache = new Map();
  const key = (a, b) => `${Math.round(a[0] / cellM)},${Math.round(a[2] / cellM)},${Math.round(a[1] / 6)}|${Math.round(b[0] / cellM)},${Math.round(b[2] / cellM)},${Math.round(b[1] / 6)}`;

  /** Profile scan between two 3D points: the dominant edge. Returns { zMax, edge:[x,y,z], dss, dsr, d, blocked, clearance } (clearance = min height of the line above the terrain, negative if blocked). */
  function scan(src, lst, maxSamples = 96, stepM = 8) {
    const d = d3(src, lst), n = clamp(Math.ceil(d / stepM), 8, maxSamples);
    let zMax = -Infinity, edge = null, dssBest = 0, dsrBest = 0, minClear = Infinity;
    const zs = new Float32Array(n + 1);
    for (let i = 1; i < n; i++) {
      const t = i / n, x = src[0] + (lst[0] - src[0]) * t, z = src[2] + (lst[2] - src[2]) * t, y = src[1] + (lst[1] - src[1]) * t;
      const h = heightAt(x, z), clear = y - h; if (clear < minClear) minClear = clear;
      const p = [x, h, z], dss = d3(src, p), dsr = d3(p, lst), zp = (dss + dsr - d) * (clear < 0 ? 1 : -1); zs[i] = zp;   // z > 0 when the terrain point is above the line of sight
      if (zp > zMax) { zMax = zp; edge = p; dssBest = dss; dsrBest = dsr; }
    }
    return { zMax, edge, dss: dssBest, dsr: dsrBest, d, blocked: minClear < 0, clearance: minClear, zs, n };
  }

  /**
   * Diffraction (acoustic shadow) loss per band for the path src -> lst. `bandsHz` are the band centres, c the speed of sound. Returns { lossDb[], blocked, zMax, edge, double }.
   * Loss is 0 when the edge is far below the line of sight.
   */
  function shadow(src, lst, bandsHz, c) {
    const k = key(src, lst); let s = shadowCache.get(k);
    if (!s) {
      s = scan(src, lst);
      if (shadowCache.size > 20000) shadowCache.clear();
      shadowCache.set(k, s);
    }
    const out = new Array(bandsHz.length).fill(0);
    if (!s.blocked || !s.edge) return { lossDb: out, blocked: s.blocked, zMax: s.zMax, edge: s.edge, double: false, clearance: s.clearance };
    // look for a second edge far from the first
    let double = false;
    if (s.zMax > 0) { const n = s.n; for (let i = 1; i < n; i++) { const t = i / n, x = src[0] + (lst[0] - src[0]) * t, z = src[2] + (lst[2] - src[2]) * t; if (Math.hypot(x - s.edge[0], z - s.edge[2]) > 150 && s.zs[i] > 0.25 * s.zMax) { double = true; break; } } }
    const cap = double ? 25 : 20, z = Math.max(s.zMax, -0.4);
    const Kmet = z > 0 ? Math.exp(-Math.sqrt(s.dss * s.dsr * s.d / (2 * z)) / 2000) : 1;
    for (let i = 0; i < bandsHz.length; i++) {
      const lam = c / bandsHz[i], arg = 3 + (20 / lam) * z * Kmet;
      out[i] = arg > 1 ? Math.min(cap, 10 * Math.log10(arg)) : 0;
    }
    return { lossDb: out, blocked: s.blocked, zMax: s.zMax, edge: s.edge, double, clearance: s.clearance };
  }

  /** Is there a direct line of sight (terrain only)? */
  const lineOfSight = (src, lst) => { const s = scan(src, lst, 64, 10); return !s.blocked; };

  /**
   * Echo taps for a source heard by a listener: rays fan out from the source over `nRays` azimuths; the first place where terrain rises `riseM` above the ray is a reflecting
   * slope. Its normal comes from the height gradient; the tap is kept when the specular direction points at the listener within `coneDeg`.
   * Returns up to `maxTaps` taps { delay (s after the direct arrival), gain (linear, re the direct sound), azimuthRad (from the listener), distance (m), kind, tier }.
   * `rho` (reflectivity of a grass slope) is ASSUMED.
   */
  function echoes(src, lst, c, { nRays = 72, maxRange = 3500, riseM = 6, coneDeg = 28, rho = 0.35, maxTaps = 4, minDelay = 0.12, maxDelay = 12, stepM = 12 } = {}) {
    const k = 'e' + key(src, lst); const hit = echoCache.get(k); if (hit) return hit;
    const direct = d3(src, lst), taps = [];
    const sh = src[1] + 0.0;                       // ray height = source height (metres a.s.l.)
    for (let r = 0; r < nRays; r++) {
      const th = (r / nRays) * 2 * Math.PI, ux = Math.sin(th), uz = -Math.cos(th);
      let prevH = null;
      for (let s = stepM; s < maxRange; s += stepM) {
        const x = src[0] + ux * s, z = src[2] + uz * s; if (!inside(x, z)) break;
        const h = heightAt(x, z);
        if (h > sh + riseM) {
          // refine the hit and take the gradient there
          const e = stepM * 1.5, gx = (heightAt(x + e, z) - heightAt(x - e, z)) / (2 * e), gz = (heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e);
          let nx = -gx, ny = 1, nz = -gz; const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl;
          const inc = [ux, 0, uz], dot = inc[0] * nx + inc[1] * ny + inc[2] * nz;
          const rx = inc[0] - 2 * dot * nx, ry = inc[1] - 2 * dot * ny, rz = inc[2] - 2 * dot * nz;
          const P = [x, sh, z], toL = [lst[0] - P[0], lst[1] - P[1], lst[2] - P[2]], dl = Math.hypot(toL[0], toL[1], toL[2]) || 1;
          const cosA = (rx * toL[0] + ry * toL[1] + rz * toL[2]) / dl;
          const sp = s, path = sp + dl, delay = (path - direct) / c;
          const facing = -(ux * nx + uz * nz);                       // how squarely the slope faces the source (0 = grazing, 1 = a wall)
          if (delay >= minDelay && delay <= maxDelay && ny < 0.99) {
            const az = Math.atan2(P[0] - lst[0], -(P[2] - lst[2]));
            if (cosA > Math.cos(coneDeg * Math.PI / 180)) taps.push({ delay, gain: rho * (direct / path) * (0.5 + 0.5 * cosA), azimuthRad: az, distance: dl, reflectorM: s, kind: 'ridge', tier: 'inferred' });
            else if (facing > 0.12) taps.push({ delay, gain: rho * 0.6 * facing * (direct / path), azimuthRad: az, distance: dl, reflectorM: s, kind: 'ridge-diffuse', tier: 'inferred' });   // rough slopes scatter rather than mirror: ASSUMED scattering
          }
          break;
        }
        prevH = h;
      }
    }
    // merge near-duplicates (same ridge hit by neighbouring rays) and keep the strongest
    taps.sort((a, b) => b.gain - a.gain);
    const kept = [];
    for (const t of taps) { if (kept.every((u) => Math.abs(u.delay - t.delay) > 0.25 || Math.abs(u.azimuthRad - t.azimuthRad) > 0.5)) kept.push(t); if (kept.length >= maxTaps) break; }
    kept.sort((a, b) => a.delay - b.delay);
    if (echoCache.size > 5000) echoCache.clear();
    echoCache.set(k, kept);
    return kept;
  }

  /** Woods hook: fraction of the straight path through woods (0..1) from the optional mask; 0 when no mask is given (the product then says: no woods data). */
  function woodsFraction(src, lst, n = 24) {
    if (!woodsAt) return null;
    let acc = 0; for (let i = 1; i < n; i++) { const t = i / n; acc += woodsAt(src[0] + (lst[0] - src[0]) * t, src[2] + (lst[2] - src[2]) * t) > 0.5 ? 1 : 0; }
    return acc / (n - 1);
  }

  return { heightAt, woodsAt, scan, shadow, lineOfSight, echoes, woodsFraction, clearCaches() { shadowCache.clear(); echoCache.clear(); } };
}

/** Terrain with a height function from analytic ridges, for tests: sum of gaussian ridges along z (a long north-south ridge crest at x = ridgeX). */
export function syntheticRidge({ ridgeX = 0, height = 40, halfWidth = 120, base = 0 } = {}) {
  return makeTerrain({ heightAt: (x) => base + height * Math.exp(-((x - ridgeX) ** 2) / (2 * (halfWidth / 2) ** 2)), extent: { halfW: 6000, halfH: 6000 } });
}

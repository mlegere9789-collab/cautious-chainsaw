// Scene data for the benchmark: terrain, 165,000 soldiers in ~700 units (+ horses, guns), deterministic, placeholder placements (Modelled, NOT historical positions).
import { mulberry32, hsh, clamp } from './math.mjs';

export const Y0 = 150; // metres subtracted from elevation so y is near 0
const TILE = 512, Z15 = 2 ** 15 * TILE;
function worldPx(lng, lat) { const s = Math.sin(lat * Math.PI / 180); return [(lng + 180) / 360 * Z15, (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * Z15]; }

export async function loadTerrain(base) {
  const meta = await (await fetch(base + 'data/terrain.json')).json();
  const buf = await (await fetch(base + 'data/height.bin')).arrayBuffer(); const u16 = new Uint16Array(buf); const N = meta.N;
  const heights = new Float32Array(N * N); const sc = (meta.hmax - meta.hmin) / 65535; for (let i = 0; i < N * N; i++) heights[i] = meta.hmin + u16[i] * sc - Y0;
  const [bx, by, bw, bh] = meta.z15box; const mpp = meta.groundMPerZ15Px;
  const T = { N, W: meta.widthM, H: meta.heightM, hmin: meta.hmin - Y0, hmax: meta.hmax - Y0, heights, meta,
    xz(lng, lat) { const [px, py] = worldPx(lng, lat); return [(px - bx - bw / 2) * mpp, (py - by - bh / 2) * mpp]; },
    h(x, z) { const u = (x / T.W + .5) * (N - 1), v = (z / T.H + .5) * (N - 1); const i = clamp(Math.floor(u), 0, N - 2), j = clamp(Math.floor(v), 0, N - 2), fu = clamp(u - i, 0, 1), fv = clamp(v - j, 0, 1);
      return heights[j * N + i] * (1 - fu) * (1 - fv) + heights[j * N + i + 1] * fu * (1 - fv) + heights[(j + 1) * N + i] * (1 - fu) * fv + heights[(j + 1) * N + i + 1] * fu * fv; } };
  return T;
}

// ---- unit buffer layout (3 vec4 per unit): [x0,z0,heading,clipKind] [vx,vz,team,klass] [tRef,aux,first,count]
// clipKind foot: 0 idle 1 march 2 run 3 fireline 4 crew; mounted: 0 idle 1 walk 2 gallop
export const UNIT_STRIDE = 12, SOLD_STRIDE = 8;
export const KLASS = { FOOT: 0, MOUNTED: 1 };
export const FOOT_DUR = [4.0, 1.0, 0.62, 4.2, 1.4, 1.6, 1.0], HORSE_DUR = [4.0, 1.15, 0.58];
export const FIRE_PERIOD = 5.6;

export function buildWorld(T, { total = 165000, seed = 1863, horses = 12000, gunRate = 1 } = {}) {
  const rnd = mulberry32(seed); const units = []; const sold0 = []; // sold0 rows: slotX, slotZ, seed, unit ; sold1 rows: fallT, fallStyle, fireOff, variant
  const P = (lng, lat) => T.xz(lng, lat);
  let count = 0;
  function addUnit(u, slots) { u.first = count; u.count = slots.length; u.id = units.length; units.push(u); for (const s of slots) { sold0.push(s[0], s[1], rnd(), u.id); count++; } }
  const lineSlots = (n, ranks = 2, fileW = .55, rankD = .9) => { const files = Math.ceil(n / ranks), a = []; for (let i = 0; i < n; i++) { const r = Math.floor(i / files), f = i % files; a.push([(f - (files - 1) / 2) * fileW + (rnd() - .5) * .12, -r * rankD + (rnd() - .5) * .12]); } return a; };
  const colSlots = (n, abreast = 4, fileW = .6, rankD = 1.0) => { const a = []; for (let i = 0; i < n; i++) { const r = Math.floor(i / abreast), f = i % abreast; a.push([(f - (abreast - 1) / 2) * fileW + (rnd() - .5) * .1, -r * rankD + (rnd() - .5) * .15]); } return a; };
  const skirmSlots = (n, w) => { const a = []; for (let i = 0; i < n; i++) a.push([(i / Math.max(1, n - 1) - .5) * w + (rnd() - .5) * 2, (rnd() - .5) * 6]); return a; };
  const mountSlots = (n) => { const a = [], files = 8; for (let i = 0; i < n; i++) { const r = Math.floor(i / files), f = i % files; a.push([(f - (files - 1) / 2) * 1.1, -r * 2.6]); } return a; };

  // ---- placeholder front lines (lng,lat polylines, NOT the 1863 positions)
  const unionFront = [[-77.2200, 39.8185], [-77.2262, 39.8198], [-77.2312, 39.8200], [-77.2372, 39.8150], [-77.2418, 39.8100], [-77.2438, 39.8045], [-77.2408, 39.7992], [-77.2380, 39.7935], [-77.2368, 39.7905]].map(p => P(...p));
  const confFront = [[-77.2540, 39.8335], [-77.2532, 39.8250], [-77.2535, 39.8180], [-77.2545, 39.8100], [-77.2535, 39.8035], [-77.2508, 39.7985], [-77.2485, 39.7935], [-77.2470, 39.7890]].map(p => P(...p));
  const roadUnion = [[-77.2290, 39.8100], [-77.2300, 39.8040], [-77.2310, 39.7990], [-77.2325, 39.7930]].map(p => P(...p));   // columns on a road behind the line
  const roadConf = [[-77.2640, 39.8250], [-77.2610, 39.8150], [-77.2590, 39.8050], [-77.2570, 39.7950]].map(p => P(...p));
  function poly(pts) { const seg = [], cum = [0]; for (let i = 0; i + 1 < pts.length; i++) { const dx = pts[i + 1][0] - pts[i][0], dz = pts[i + 1][1] - pts[i][1]; const l = Math.hypot(dx, dz); seg.push([dx / l, dz / l, l]); cum.push(cum[i] + l); } return { pts, seg, cum, len: cum[cum.length - 1],
    at(s) { s = clamp(s, 0, this.len - 1e-3); let i = 0; while (this.cum[i + 1] < s) i++; const t = s - this.cum[i], d = this.seg[i]; return [pts[i][0] + d[0] * t, pts[i][1] + d[1] * t, d[0], d[1]]; } }; }
  const heading = (fx, fz) => Math.atan2(fx, fz);

  // ---- showcase block (known place for the benchmark cameras): near the Union line
  const sc = P(-77.2425, 39.8108); const showHead = heading(-1, 0.15);
  const show = { line: { x: sc[0], z: sc[1], heading: showHead }, gun: null, cav: null };
  addUnit({ team: 0, klass: 0, kind: 'line', x0: sc[0], z0: sc[1], heading: showHead, clip: 3, vx: 0, vz: 0, tRef: 0 }, lineSlots(280));
  addUnit({ team: 0, klass: 0, kind: 'line', x0: sc[0] + 30, z0: sc[1] - 80, heading: showHead, clip: 3, vx: 0, vz: 0, tRef: 0 }, lineSlots(280));
  addUnit({ team: 0, klass: 0, kind: 'line', x0: sc[0] + 36, z0: sc[1] + 10, heading: showHead, clip: 1, vx: -1.12 * Math.cos(showHead + Math.PI / 2 * 0) * 0, vz: 0, tRef: 0 }, lineSlots(260)); // placeholder, set below
  // marching column right next to the camera spot, heading south along the line
  const colU = units[units.length - 1]; colU.kind = 'col'; { const sl = colSlots(260); // replace slots in place (reuse allocated rows)
    for (let i = 0; i < sl.length; i++) { sold0[(colU.first + i) * 4] = sl[i][0]; sold0[(colU.first + i) * 4 + 1] = sl[i][1]; } colU.heading = heading(0, 1); colU.vx = 0; colU.vz = 1.12; colU.x0 = sc[0] + 18; colU.z0 = sc[1] - 140; }
  show.battery = { x: sc[0] + 70, z: sc[1] + 30, heading: showHead };
  show.cav = { x: sc[0] + 110, z: sc[1] + 120, heading: heading(-1, -.3) };
  addUnit({ team: 0, klass: 1, kind: 'cav', x0: show.cav.x, z0: show.cav.z, heading: show.cav.heading, clip: 2, vx: -6.5 * Math.sin(show.cav.heading + Math.PI / 2) * 0 - 6.0, vz: -1.8, tRef: 0 }, mountSlots(96));
  addUnit({ team: 0, klass: 1, kind: 'cav', x0: show.cav.x + 40, z0: show.cav.z - 60, heading: show.cav.heading, clip: 1, vx: -1.5, vz: -.45, tRef: 0 }, mountSlots(48));

  // ---- guns (360) and crews: batteries of 6, crews of 8 (counted in the 165,000)
  const guns = []; // x,z,heading,team,period,phase,flight,range
  function addBattery(x, z, head, team, period, phase0) { const fx = Math.sin(head), fz = Math.cos(head), rx = Math.cos(head), rz = -Math.sin(head);
    for (let g = 0; g < 6; g++) { const gx = x + rx * (g - 2.5) * 14, gz = z + rz * (g - 2.5) * 14; const gi = guns.length; guns.push([gx, gz, head, team, period / gunRate * (.9 + .2 * rnd()), phase0 + g * period / 6 + rnd() * 1.5, 2.6 + rnd(), 700 + rnd() * 600]);
      const slots = []; for (let k = 0; k < 8; k++) { const ang = [-1.4, 1.4, -1.0, 1.0, 0, -.3, .3, 0][k], r = [1.6, 1.6, 3.2, 3.2, 4.5, 2.2, 2.2, 6][k]; slots.push([Math.sin(ang) * r, -Math.cos(ang) * r * .8 - 1.6]); }
      addUnit({ team, klass: 0, kind: 'crew', x0: gx, z0: gz, heading: head, clip: 4, vx: 0, vz: 0, tRef: 0, gun: gi }, slots); } }
  addBattery(show.battery.x, show.battery.z, showHead, 0, 14.0, 0);
  let nBat = 1;
  // ---- main fill
  const target = (team, frac) => Math.round((total - count) * frac);
  function fillLines(front, depths, team, facingSign, share) {
    const f = poly(front); let remaining = share; const wanted = [];
    for (const d of depths) { let s = 20; while (s < f.len - 60 && remaining > 0) { const n = Math.min(remaining, 200 + Math.floor(rnd() * 160)), fw = n / 2 * .55 + 12; const a = f.at(s + fw / 2); const nx = -a[3] * facingSign * -1, nz = a[2] * facingSign * -1;
        // normal pointing toward the enemy: choose so Union faces west (-x), Confederate faces east (+x)
        let fx = -a[3], fz = a[2]; if ((fx * (team === 0 ? -1 : 1)) < 0) { fx = -fx; fz = -fz; }
        const px = a[0] - fx * d, pz = a[1] - fz * d; const h = heading(fx, fz);
        const firing = d < 140 && rnd() < .55; const clip = firing ? 3 : (rnd() < .35 ? 1 : 0); const sp = clip === 1 ? 1.1 : 0;
        addUnit({ team, klass: 0, kind: 'line', x0: px, z0: pz, heading: h, clip, vx: Math.sin(h) * sp, vz: Math.cos(h) * sp, tRef: 0 }, lineSlots(n)); remaining -= n; s += fw; wanted.push(n); } if (remaining <= 0) break; }
    return remaining;
  }
  // skirmishers, columns, batteries, cavalry first (small shares), then lines to use the remainder
  function fillColumns(road, team, share, speed, clip) { const f = poly(road); let remaining = share, k = 0; while (remaining > 0) { const n = Math.min(remaining, 220 + Math.floor(rnd() * 120)); const a = f.at(f.len * ((k * .13 + rnd() * .05) % 1)); const h = heading(a[2], a[3]); const off = (rnd() - .5) * 40;
      addUnit({ team, klass: 0, kind: 'col', x0: a[0] + a[3] * off, z0: a[1] - a[2] * off + (k % 7) * 18, heading: h, clip, vx: Math.sin(h) * speed, vz: Math.cos(h) * speed, tRef: 0 }, colSlots(n)); remaining -= n; k++; } }
  const horsesPerSide = horses / 2;
  function fillCav(team, share, area) { let remaining = share, k = 0; while (remaining > 0) { const n = Math.min(remaining, 96 + Math.floor(rnd() * 80)); const x = area[0] + rnd() * 400, z = area[1] + rnd() * 400; const gal = rnd() < .3; const h = heading(team === 0 ? -1 : 1, (rnd() - .5) * .6);
      addUnit({ team, klass: 1, kind: 'cav', x0: x, z0: z, heading: h, clip: gal ? 2 : (rnd() < .5 ? 1 : 0), vx: Math.sin(h) * (gal ? 6.5 : 1.4), vz: Math.cos(h) * (gal ? 6.5 : 1.4), tRef: 0 }, mountSlots(n)); remaining -= n; k++; } }
  const hor = horses - units.filter(u => u.klass === 1).reduce((a, u) => a + u.count, 0);
  fillCav(0, Math.round(hor / 2), P(-77.2290, 39.8000)); fillCav(1, hor - Math.round(hor / 2), P(-77.2330, 39.8300));
  // batteries along both fronts
  for (let i = 0; i < 29; i++) { const f = poly(unionFront); const a = f.at(120 + i / 29 * (f.len - 240)); const h = heading(-a[3], a[2]) ; const hh = (Math.sin(h) > 0 ? h + Math.PI : h); addBattery(a[0] + 8, a[1], hh, 0, 25 + rnd() * 20, rnd() * 20); nBat++; }
  for (let i = 0; i < 30; i++) { const f = poly(confFront); const a = f.at(120 + i / 30 * (f.len - 240)); const h = heading(-a[3], a[2]); const hh = (Math.sin(h) < 0 ? h + Math.PI : h); addBattery(a[0] - 8, a[1], hh, 1, 25 + rnd() * 20, rnd() * 20); nBat++; }
  const afterGuns = count;
  const infantryLeft = total - count; const unionShare = Math.round(infantryLeft * 93900 / 165000 * 0 + infantryLeft * .565);
  const colShareU = Math.round(unionShare * .12), colShareC = Math.round((infantryLeft - unionShare) * .1);
  fillColumns(roadUnion, 0, colShareU, 1.1, 1); fillColumns(roadConf, 1, colShareC, 1.1, 1);
  let leftU = unionShare - colShareU, leftC = infantryLeft - unionShare - colShareC;
  const dU = [0, 120, 250, 400, 560, 740, 930, 1120, 1330, 1550], dC = [0, 120, 250, 400, 560, 740, 930, 1120, 1330, 1550];
  leftU = fillLines(unionFront, dU, 0, 1, leftU); leftC = fillLines(confFront, dC, 1, 1, leftC);
  // any remainder (lines exhausted) goes to extra reserve columns so the total is exact
  if (leftU > 0) fillColumns(roadUnion, 0, leftU, 0, 0); if (leftC > 0) fillColumns(roadConf, 1, leftC, 0, 0);
  // trim / pad to the exact total
  while (count > total) { const u = units[units.length - 1]; if (count - total >= u.count) { count -= u.count; sold0.length -= u.count * 4; units.pop(); } else { const k = count - total; u.count -= k; count -= k; sold0.length -= k * 4; } }
  if (count < total) { const u = units.find(u => u.kind === 'col' && u.team === 1 && u.vx === 0) || units[units.length - 1]; const k = total - count; const slots = colSlots(k); /* extra unit */ addUnit({ team: 1, klass: 0, kind: 'col', x0: roadConf[0][0], z0: roadConf[0][1], heading: 0, clip: 0, vx: 0, vz: 0, tRef: 0 }, slots); }
  // soldier data tables
  const S = count; const sold = new Float32Array(S * 4); sold.set(sold0.slice(0, S * 4)); const s1 = new Float32Array(S * 4);
  for (let i = 0; i < S; i++) { const u = units[sold[i * 4 + 3]]; const r1 = hsh(i * 3 + 7), r2 = hsh(i * 5 + 11); const fires = (u.clip === 3 || u.kind === 'crew' || u.kind === 'line') && r1 < .04; s1[i * 4] = 1e9; s1[i * 4 + 1] = Math.floor(r2 * 3); s1[i * 4 + 2] = r2; s1[i * 4 + 3] = hsh(i * 7 + 3); }
  // scripted casualties: ~1.6% of infantry fall during the first 3 minutes, more in the showcase lines
  for (let i = 0; i < S; i++) { const u = units[sold[i * 4 + 3]]; const p = (u.id < 3 ? .06 : (u.kind === 'line' ? .025 : .004)); if (hsh(i * 13 + 5) < p) s1[i * 4] = 6 + hsh(i * 17 + 1) * 180; }
  const uf = new Float32Array(units.length * UNIT_STRIDE);
  units.forEach((u, i) => { const o = i * UNIT_STRIDE; uf[o] = u.x0; uf[o + 1] = u.z0; uf[o + 2] = u.heading; uf[o + 3] = u.clip; uf[o + 4] = u.vx; uf[o + 5] = u.vz; uf[o + 6] = u.team; uf[o + 7] = u.klass; uf[o + 8] = u.tRef; uf[o + 9] = u.gun ?? -1; uf[o + 10] = u.first; uf[o + 11] = u.count; });
  const gf = new Float32Array(guns.length * 8); guns.forEach((g, i) => gf.set(g, i * 8));
  // radius of each unit for culling
  units.forEach(u => { let r = 0; for (let k = 0; k < u.count; k++) { const sx = sold[(u.first + k) * 4], sz = sold[(u.first + k) * 4 + 1]; r = Math.max(r, Math.hypot(sx, sz)); } u.radius = r + 3; });
  const mounted = units.filter(u => u.klass === 1).reduce((a, u) => a + u.count, 0);
  const comp = { soldiers: S, units: units.length, guns: guns.length, batteries: nBat, mounted, horses: mounted, crew: units.filter(u => u.kind === 'crew').reduce((a, u) => a + u.count, 0),
    union: units.filter(u => u.team === 0).reduce((a, u) => a + u.count, 0), confederate: units.filter(u => u.team === 1).reduce((a, u) => a + u.count, 0) };
  return { T, units, unitF: uf, sold, sold1: s1, guns, gunF: gf, show, comp, count: S };
}

// unit position at time t (mirrors the shaders)
export function unitPos(w, ui, t, out) { const o = ui * UNIT_STRIDE, f = w.unitF; const dt = t - f[o + 8]; out[0] = f[o] + f[o + 4] * dt; out[1] = f[o + 1] + f[o + 5] * dt; return out; }
// soldier world placement at time t (mirrors the shaders): returns x,z,heading
export function soldierPlace(w, i, t, out) {
  const so = i * 4, f = w.unitF, ui = w.sold[so + 3] | 0, o = ui * UNIT_STRIDE; const seed = w.sold[so + 2]; const fallT = w.sold1[so]; const te = Math.min(t, fallT);
  const dt = te - f[o + 8]; const ux = f[o] + f[o + 4] * dt, uz = f[o + 1] + f[o + 5] * dt, h = f[o + 2] + (seed - .5) * .12;
  const sx = w.sold[so] + (hsh(i * 31 + 1) - .5) * .2, sz = w.sold[so + 1] + (hsh(i * 37 + 2) - .5) * .2; const c = Math.cos(f[o + 2]), s = Math.sin(f[o + 2]);
  out[0] = ux + sx * c + sz * s; out[1] = uz - sx * s + sz * c; out[2] = h; return out;
}
// clip selection (mirrors the shaders): returns clip index and phase s in [0,1)
export function soldierClip(w, i, t, out) {
  const so = i * 4, f = w.unitF, ui = w.sold[so + 3] | 0, o = ui * UNIT_STRIDE; const seed = w.sold[so + 2], kind = f[o + 3] | 0, klass = f[o + 7] | 0; const fallT = w.sold1[so], fo = w.sold1[so + 2], vr = w.sold1[so + 3];
  if (klass === 1) { out[0] = kind; out[1] = ((t / HORSE_DUR[kind]) * (.94 + .12 * seed) + seed) % 1; out[2] = vr; return out; }
  if (t >= fallT) { const a = (t - fallT) / FOOT_DUR[5]; if (a < 1) { out[0] = 5; out[1] = a; } else { out[0] = 6; out[1] = 1; } out[2] = vr; return out; }
  if (kind === 3 || kind === 4) { const P = FIRE_PERIOD + (seed - .5) * 1.0, ph = (((t + fo * P) / P) % 1 + 1) % 1; if (ph < .78) { out[0] = 3; out[1] = ph / .78; } else { out[0] = 4; out[1] = (ph - .78) / .22; } out[2] = vr; return out; }
  const dur = FOOT_DUR[kind]; out[0] = kind; out[1] = (((t / dur) * (.92 + .16 * seed) + seed) % 1 + 1) % 1; out[2] = vr; return out;
}

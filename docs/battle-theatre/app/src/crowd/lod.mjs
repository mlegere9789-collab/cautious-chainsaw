// LEVEL OF DETAIL OF THE CROWD: which figures are listed, at which level, and how much of each level a pixel of a figure keeps. PURE: no GPU, no DOM, no wall clock, no Math.random, no state kept
// from one frame to the next. The result is a function of (simulation time, camera, settings) alone, so the same time and camera give the same pixels however the viewer got there (scrub purity, gate Q12).
//
// THE RULE (FIGURES3D-NOTES 9.2: "each swap is a 15 percent dithered cross-fade centred on the distance with 10 percent hysteresis"):
//   * levels 0 (parts, 61 bones), 1 (merged class mesh), 2 (low class mesh) and FAR (baked impostor) are cut at the radii r0, r1, r2 (lodRadii: 10, 13 and 75 m at 1080p / 60 degrees).
//   * a figure has an effective distance  nu = d / f,  d = its distance to the camera, f = figureScale(fig) in [1 - h, 1 + h], h = 0.10: every figure keeps its OWN hand-over distances, spread over +-10 percent
//     of the nominal ones by a hash of its number (the same way fx3d decides near and far per shot, FX3D-NOTES 3). This is the hysteresis band of the plan, made memoryless: a rank of men standing at one
//     distance does not change level in one stroke, and a figure at a threshold has a fixed threshold, never one that depends on where it came from.
//   * around its threshold each figure cross-fades over a band of +-7.5 percent of it (15 percent wide, centred): the share of the coarser level is a smoothstep of nu, so the picture changes continuously with
//     the distance (a distance error of 1 percent of a radius moves a level by at most 0.1 of its coverage) and there is no instant at which a level appears or goes.
//   * the cross-fade is a DITHER: every fragment of every level draws the same number  n = fract(ign(pixel) + phase(fig))  and keeps itself when  lo <= n < hi.  The ranges [lo, hi) of the levels of one figure
//     are consecutive and cover [0, 1) exactly once, so every pixel is drawn by one level (no hole, no doubled pixel); a level's range is a function of nu alone.
//   * the LOD0 triangle budget (K men at LOD0 at once, the plan's WebGL2 rule) is a RADIUS, not a rank: when more than K men could be at LOD0 the LOD0 radius is cut to the distance of the K-th nearest man
//     (counted in nu) so that its fade band ends there. The radius moves continuously with the camera (the K-th smallest of continuous functions is continuous), so a man never swaps with his neighbour.
//     Men outside the view use up the budget with a weight that falls from 1 at the edge of the view to 0 over an angular margin (softMargin, 0.2 rad): a whole rank of men entering the view in one step of a
//     turn would otherwise move the radius by a whole gap of ranks (the real layer has more than 96 men within 10 m of 18 to 23 percent of its men: the budget binds in its dense columns).
//   * ranges are packed into the unused fourth word of the instance record: low 16 bits lo * 65534, high 16 bits hi * 65534 (hi >= 65534 means no upper bound); the word 0 means "keep everything".
//   * the impostor (shaders-gl.mjs IMP_VS, shaders-wgsl.mjs vs_imp) fades in over the band of the low mesh's outer radius, takes the next of its 8 baked views with the share fract(yaw / 45 degrees), and gives way to the flat dab
//     over the same band of its height in pixels, the dab narrowing to the baked silhouette (LOD_DAB); the shaders repeat the formulas of this file and tests/crowd-lod.test.mjs pins their text to it.
// HARD MODE (band = 0): the same code with no band and no spread: every threshold is a step. It is the earlier behaviour (a hard swap at the radius, the K nearest visible men at LOD0, the nearest baked view, the whole-quad dab)
// and exists to compare pictures and to test that the cross-fade removes the step; it is not a setting of the product.
import { hsh, sphereInFrustum } from '../../../render/prototype/src/math.mjs';
import { soldierPlace } from '../../../render/prototype/src/world.mjs';

export const LOD_BASE = Object.freeze({ r0: 10, r1: 13, r2: 75 });                      // metres at 1080p, 60 degrees (figures3d handover.json)
export const LOD0_BUDGET = 96;                                                          // men at LOD0 at once (the pose palette has this many slots)
export const LOD_FADE = Object.freeze({ width: 0.15, band: 0.075, hysteresis: 0.10, dabPx: 7, softMargin: 0.2 });   // width = 2 * band; hysteresis = the half-width of the per-figure threshold spread; dabPx = height of an impostor below which it is a dab
export const LOD_Q = 65534;                                                             // ranges are 16-bit integers 0 .. LOD_Q
// the flat dab of a small figure (below dabPx pixels high) fills its whole impostor quad; the baked figure fills 18 percent of it (131 upright foot classes of data/figures3d/impostor-atlas.png: mean silhouette area 0.181 of the quad,
// bounding box 22.1 of 48 texels wide and 56.1 of 64 high, empty 0.105 of the quad above the head and 0.018 below the feet, so the mean width over the height 0.181 / 0.877 = 0.206). A cross-fade from one to the other
// cannot hide a five-fold jump of area, so the dab narrows to the figure's footprint as the figure grows: from the whole quad at lowPx pixels (the earlier look of a small figure, kept) to a strip w wide that leaves top
// and bottom of the quad's height empty at dabPx, where the baked view takes over.
export const LOD_DAB = Object.freeze({ w: 0.21, top: 0.105, bottom: 0.018, lowPx: 3 });
const H30 = Math.PI / 6;

// ---------------------------------------------------------------------------------------------------- options and radii
export function lodOptions(o = {}) {
  const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
  return { band: Math.max(0, Math.min(0.45, num(o.band, LOD_FADE.band))), hyst: Math.max(0, Math.min(0.45, num(o.hyst, LOD_FADE.hysteresis))), budget: Math.max(1, Math.floor(num(o.budget, LOD0_BUDGET))),
    mountedSphere: num(o.mountedSphere, 2.2 + 12), footSphere: num(o.footSphere, 1.3), dabPx: num(o.dabPx, LOD_FADE.dabPx), softMargin: Math.max(0, num(o.softMargin, LOD_FADE.softMargin)) };
}
// the hand-over distances: the figures3d ones scaled by vertical pixels / 1080 and by tan(30 degrees) / tan(fov / 2); the two sliders of the Settings panel move them (nearR 40 and midR 300 are the defaults)
export function lodRadii(H, fov, settings = {}) {
  const k = ((H || 1080) / 1080) * (Math.tan(H30) / Math.tan(fov / 2)), a = (settings.nearR || 40) / 40, b = (settings.midR || 300) / 300;
  const r2 = LOD_BASE.r2 * k * b, r1 = Math.min(LOD_BASE.r1 * k * a, r2), r0 = Math.min(LOD_BASE.r0 * k * a, r1);
  return { r0, r1, r2 };
}

// ---------------------------------------------------------------------------------------------------- the memoryless parts
// the share of the coarser level at effective distance nu around the radius r: 0 inside r (1 - b), 1 beyond r (1 + b), a smoothstep between; a step at r when b = 0
export function fadeBand(nu, r, b) {
  if (r <= 0) return 1; if (b <= 0) return nu >= r ? 1 : 0;
  const t = (nu - r * (1 - b)) / (2 * r * b); return t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
}
export const figureScale = (fig, h) => (h > 0 ? 1 + h * (2 * hsh(fig * 13 + 5) - 1) : 1);       // the figure's own hand-over scale in [1 - h, 1 + h]; the impostor shader computes the same from its instance number
export const figurePhase = fig => hsh(fig * 7 + 3);                                              // the dither phase of a figure: every level and the impostor of one figure draw the same n
const lodQ = (nu, r, b) => Math.round(LOD_Q * (1 - fadeBand(nu, r, b)));                         // the threshold (0 .. LOD_Q) below which the finer side of a boundary keeps a fragment
// the three thresholds q0 <= q1 <= q2 of a figure at effective distance nu: level k keeps  q(k-1) <= n * LOD_Q < q(k),  the impostor keeps n * LOD_Q >= q2. out: Int32Array(3) or array
export function thresholds(nu, r0e, r1, r2, b, out) {
  const q0 = lodQ(nu, r0e, b); let q1 = lodQ(nu, r1, b), q2 = lodQ(nu, r2, b); if (q1 < q0) q1 = q0; if (q2 < q1) q2 = q1; out[0] = q0; out[1] = q1; out[2] = q2; return out;
}
// the shares of the four levels (L0, L1, L2, FAR) from the thresholds: they sum to 1
export function sharesOf(q, out = [0, 0, 0, 0]) { out[0] = q[0] / LOD_Q; out[1] = (q[1] - q[0]) / LOD_Q; out[2] = (q[2] - q[1]) / LOD_Q; out[3] = 1 - q[2] / LOD_Q; return out; }
// pack the range [lo, hi) of a level into the instance record's word: lo16 | hi16 << 16. A range that covers everything is the word 0.
export function packRange(lo, hi) { return lo <= 0 && hi >= LOD_Q ? 0 : ((lo & 0xffff) | ((hi >= LOD_Q ? LOD_Q : hi) << 16)) >>> 0; }
export function decodeRange(P) { if (P === 0) return { lo: 0, hi: 2 }; const lo = P & 0xffff, hi = P >>> 16; return { lo: lo / LOD_Q, hi: hi >= LOD_Q ? 2 : hi / LOD_Q }; }
// the fade word of an object that only vanishes beyond a distance (the train and works lists): keeps [0, q) with q from a cross-fade band around `edge`; -1 = fully faded (not drawn), 0 = fully drawn
export function edgeRange(dist, edge, b) { const q = lodQ(dist, edge, b); return q <= 0 ? -1 : q >= LOD_Q ? 0 : ((q << 16) >>> 0); }

// the shaders' number, in JS (float64): interleaved gradient noise of the pixel, shifted by the figure's phase. px, py = gl_FragCoord.xy (pixel centre: integer + 0.5)
const fr = v => v - Math.floor(v);
export const ign = (px, py) => fr(52.9829189 * fr(px * 0.06711056 + py * 0.00583715));
export const ditherNumber = (fig, px, py) => fr(ign(px, py) + figurePhase(fig));
export function keepFragment(P, fig, px, py) { if (P === 0) return true; const { lo, hi } = decodeRange(P), n = ditherNumber(fig, px, py); return n >= lo && n < hi; }
// the impostor keeps what the three levels do not: n >= q2 / LOD_Q, with q2 from the impostor's own distance (the vertex shader computes it from its own position)
export function farKeeps(nu, r2, b, fig, px, py) { const q2 = lodQ(nu, r2, b); if (q2 >= LOD_Q) return false; return ditherNumber(fig, px, py) >= q2 / LOD_Q; }
// the impostor's baked views stand at whole numbers of yn = yaw / (2 pi) * 8 (0 .. 8): between two, a fragment takes the next view with the share fract(yn) (hard mode: the nearest view). { view, share } of the first view and of the next one.
export function viewBlend(yn, b) { return b > 0 ? { view: ((Math.floor(yn) % 8) + 8) % 8, share: yn - Math.floor(yn) } : { view: ((Math.floor(yn + 0.5) % 8) + 8) % 8, share: 0 }; }
// the view a fragment of the impostor of figure fig at pixel centre (px, py) draws: the second noise is the same pattern turned over (ign of the transposed pixel) shifted by a second phase of the figure
export function impostorView(yn, b, fig, px, py) { const v = viewBlend(yn, b); if (v.share > 0 && fr(ign(py, px) + fr(figurePhase(fig) * 7.0 + 0.37)) < v.share) return (v.view + 1) % 8; return v.view; }
// the impostor of a figure of apparent height hpx (pixels; after the figure's scale) shades as a flat two-tone dab below dabPx and as the baked view above it: the share of the dab
export const dabShare = (hpx, f, b, dabPx = LOD_FADE.dabPx) => 1 - fadeBand(hpx * f, dabPx, b);
// the footprint of the dab at apparent height ht (= hpx * the figure's scale): { w: the share of the quad's width it fills, top and bottom: the shares of the quad's height left empty there, k }; the whole quad in hard mode
export function dabFootprint(ht, b, dabPx = LOD_FADE.dabPx) { let k = 0; if (b > 0) { const t = Math.min(1, Math.max(0, (ht - LOD_DAB.lowPx) / (dabPx - LOD_DAB.lowPx))); k = t * t * (3 - 2 * t); } return { w: 1 - (1 - LOD_DAB.w) * k, top: LOD_DAB.top * k, bottom: LOD_DAB.bottom * k, k }; }

// ---------------------------------------------------------------------------------------------------- the list of drawn figures (typed arrays, grown by doubling, nothing allocated per frame)
const FIELDS = [['fig', Int32Array, 1], ['unit', Int32Array, 1], ['k', Int32Array, 1], ['x', Float32Array, 1], ['z', Float32Array, 1], ['h', Float32Array, 1], ['d2', Float64Array, 1], ['nu', Float64Array, 1], ['mount', Uint8Array, 1],
  ['hx', Float32Array, 1], ['hz', Float32Array, 1], ['mask', Uint8Array, 1], ['p', Uint32Array, 3], ['slot', Uint32Array, 1], ['ra', Uint32Array, 1], ['rb', Uint32Array, 1], ['fa', Float32Array, 1], ['fb', Float32Array, 1], ['wb', Float32Array, 1],
  ['hr', Uint32Array, 1], ['hf', Float32Array, 1]];
export class FigureList {
  constructor(cap = 4096) { this.cap = 0; this.n = 0; this.tmp = [0, 0, 0]; this.q = new Int32Array(3); this.bud = new Float64Array(1024); this.budW = new Float64Array(1024); this.stats = { listed: 0, r0e: 0, budgetCut: false, budgetCounted: 0, nL0: 0, bands: [0, 0, 0], inRange: 0 }; this.grow(cap); }
  grow(n) {
    const old = this.cap ? this : null;
    for (const [name, C, per] of FIELDS) { const a = new C(n * per); if (old) a.set(old[name].subarray(0, Math.min(old[name].length, n * per))); this[name] = a; }
    this.cap = n;
  }
  growBudget() { const n = this.bud.length * 2; const a = new Float64Array(n), w = new Float64Array(n); a.set(this.bud); w.set(this.budW); this.bud = a; this.budW = w; }
  // the indices of the first nB budget entries by effective distance (ties by index): a sort of a few hundred numbers, only when the budget binds
  budOrder(nB) { const idx = new Array(nB); for (let i = 0; i < nB; i++) idx[i] = i; const d = this.bud; idx.sort((a, z) => d[a] - d[z] || a - z); return idx; }
}
// levels of figure j from its thresholds: mask bit k = level k is drawn, p[3 j + k] = the packed range of level k
function setRanges(L, j, q0, q1, q2) {
  let mask = 0, lo = 0; const p = L.p, o = j * 3;
  for (let k = 0; k < 3; k++) { const hi = k === 0 ? q0 : k === 1 ? q1 : q2; p[o + k] = 0; if (hi > lo) { mask |= 1 << k; p[o + k] = packRange(lo, hi); lo = hi; } }
  L.mask[j] = mask;
}
const copyFig = (L, a, b) => { L.fig[b] = L.fig[a]; L.unit[b] = L.unit[a]; L.k[b] = L.k[a]; L.x[b] = L.x[a]; L.z[b] = L.z[a]; L.h[b] = L.h[a]; L.d2[b] = L.d2[a]; L.nu[b] = L.nu[a]; L.mount[b] = L.mount[a]; L.hx[b] = L.hx[a]; L.hz[b] = L.hz[a]; };

// ---------------------------------------------------------------------------------------------------- selection
// How much a man outside the view counts for the LOD0 budget: 1 inside (his sphere meets the four side planes), falling to 0 over an angular margin M (radians) beyond them, so the budget radius moves continuously as the
// camera turns (a rank of men that enters the view in one step would otherwise move it by a whole gap of ranks).
function softWeight(pl, x, y, z, r, d, M) {
  let e = -1e9; for (let i = 0; i < 16; i += 4) { const s = -(pl[i] * x + pl[i + 1] * y + pl[i + 2] * z + pl[i + 3]); if (s > e) e = s; } e -= r; if (e <= 0) return 1; const m = M * d + r; return e >= m ? 0 : 1 - e / m;
}
// c = { world, T, present, cam {x, y, z}, planes, rad {r0, r1, r2}, animT, opt (lodOptions), nUnits }
// Lists every figure that is in view and has a share of some level above the impostor, with its level mask and packed ranges (L.mask, L.p). Returns L.n.
// The LOD0 radius is cut where the 96th nearest man (counted by effective distance, men outside the view by their soft weight) stands: those men are not listed, they only use up the budget.
export function selectFigures(L, c) {
  const w = c.world, T = c.T, present = c.present, cam = c.cam, planes = c.planes, rad = c.rad, animT = c.animT, opt = c.opt, f = w.unitF, tmp = L.tmp, b = opt.band, h = opt.hyst, K = opt.budget, M = b > 0 ? opt.softMargin : 0;
  const nU = c.nUnits === undefined ? w.units.length : c.nUnits, r0 = rad.r0, r1 = rad.r1, r2 = rad.r2, in0 = r0 * (1 + b), in0Max = in0 * (1 + h), in0MaxSq = in0Max * in0Max, rOut = r2 * (1 + h) * (1 + b), rOutSq = rOut * rOut, cx = cam.x, cy = cam.y, cz = cam.z;
  let n = 0, nB = 0;
  for (let ui = 0; ui < nU; ui++) {
    if (present[ui] !== 1) continue; const u = w.units[ui], o = ui * 12, ux = f[o], uz = f[o + 1], uy = T.h(ux, uz) + 1, dU = Math.hypot(ux - cx, uy - cy, uz - cz);
    if (dU - u.radius > rOut) continue;
    const strict = sphereInFrustum(planes, ux, uy, uz, u.radius + 2);
    if (!strict && !(M > 0 && dU - u.radius < in0Max && sphereInFrustum(planes, ux, uy, uz, u.radius + 2 + M * dU + 2))) continue;           // out of view, and no man of it can use up the budget
    const mounted = u.klass === 1, sph = mounted ? opt.mountedSphere : opt.footSphere, yo = mounted ? 1.3 : 0.9;
    for (let k = 0; k < u.count; k++) {
      const i = u.first + k; soldierPlace(w, i, animT, tmp); const x = tmp[0], z = tmp[1], y = T.h(x, z) + yo, dx = x - cx, dy = y - cy, dz = z - cz, d2 = dx * dx + dy * dy + dz * dz;
      if (d2 > rOutSq) continue; const vis = strict && sphereInFrustum(planes, x, y, z, sph); let nu = -1;
      if (d2 < in0MaxSq) {                                    // within the reach of LOD0: counts for the budget
        const dd = Math.sqrt(d2); nu = dd / figureScale(i, h);
        if (nu < in0) { const wt = vis ? 1 : M > 0 ? softWeight(planes, x, y, z, sph, dd, M) : 0; if (wt > 0) { if (nB >= L.bud.length) L.growBudget(); L.bud[nB] = nu; L.budW[nB] = wt; nB++; } }
      }
      if (!vis) continue;
      if (n >= L.cap) L.grow(L.cap * 2);
      L.fig[n] = i; L.unit[n] = ui; L.k[n] = k; L.x[n] = x; L.z[n] = z; L.h[n] = tmp[2]; L.d2[n] = d2; L.nu[n] = nu; L.mount[n] = mounted ? 1 : 0; L.hx[n] = x; L.hz[n] = z; n++;
    }
  }
  const st = L.stats; st.inRange = n; st.budgetCut = false; st.bands[0] = st.bands[1] = st.bands[2] = 0; st.budgetCounted = nB;
  // the LOD0 radius under the triangle budget: the effective distance at which the weighted count of men reaches K
  let r0e = r0, total = 0; for (let q = 0; q < nB; q++) total += L.budW[q];
  if (total > K) {
    const ord = L.budOrder(nB); let cum = 0, nk = L.bud[ord[nB - 1]]; for (let q = 0; q < nB; q++) { cum += L.budW[ord[q]]; if (cum >= K) { nk = L.bud[ord[q]]; break; } }
    r0e = Math.min(r0, b > 0 ? nk / (1 + b) : nk * (1 + 1e-9)); st.budgetCut = true;
  }
  st.r0e = r0e;
  // thresholds, ranges, and the list packed to the figures that have a level (those beyond the last band are the impostor's alone)
  const q = L.q; let m = 0, nL0 = 0;
  for (let j = 0; j < n; j++) {
    const nu = L.nu[j] >= 0 ? L.nu[j] : Math.sqrt(L.d2[j]) / figureScale(L.fig[j], h); L.nu[j] = nu; thresholds(nu, r0e, r1, r2, b, q); if (q[2] <= 0) continue;
    if (m !== j) copyFig(L, j, m); setRanges(L, m, q[0], q[1], q[2]);
    if (q[0] > 0) nL0++; for (let k = 0; k < 3; k++) if (q[k] > 0 && q[k] < LOD_Q) st.bands[k]++; m++;      // bands[k]: the figures inside the cross-fade of boundary k
  }
  // a tie at the budget radius can leave one man too many at LOD0: the farthest (then the highest number) go to LOD1
  if (nL0 > K) {
    const idx = []; for (let j = 0; j < m; j++) if (L.mask[j] & 1) idx.push(j); idx.sort((a, z) => L.nu[z] - L.nu[a] || L.fig[z] - L.fig[a]);
    for (let t = 0; t < nL0 - K; t++) { const j = idx[t]; thresholds(L.nu[j], 0, r1, r2, b, q); setRanges(L, j, 0, q[1], q[2]); } nL0 = K;
  }
  st.nL0 = nL0; st.listed = m; L.n = m; return m;
}

// ---------------------------------------------------------------------------------------------------- pure checks for the gate runner
// every fragment is drawn by exactly one of the four levels (no hole, no doubled pixel): sampled over distances and pixels. Returns { ok, problems, samples }
export function checkComplementary(o = {}) {
  const b = o.band ?? LOD_FADE.band, h = o.hyst ?? LOD_FADE.hysteresis, rad = o.rad || { r0: 10, r1: 13, r2: 75 }, problems = [], q = [0, 0, 0]; let samples = 0;
  for (let fig = 1; fig < (o.figures || 40); fig++) for (let d = 5; d < rad.r2 * 1.3; d += o.step || 0.37) {
    const nu = d / figureScale(fig, h); thresholds(nu, rad.r0, rad.r1, rad.r2, b, q); const P = [0, 0, 0]; let lo = 0;
    for (let k = 0; k < 3; k++) { const hi = q[k]; P[k] = hi > lo ? packRange(lo, hi) : -1; if (hi > lo) lo = hi; }
    for (let py = 0; py < 3; py++) for (let px = 0; px < 3; px++) {
      let kept = 0; for (let k = 0; k < 3; k++) if (P[k] >= 0 && keepFragment(P[k], fig, px + 0.5, py + 0.5)) kept++; if (farKeeps(nu, rad.r2, b, fig, px + 0.5, py + 0.5)) kept++;
      samples++; if (kept !== 1 && problems.length < 10) problems.push(`figure ${fig} at ${d.toFixed(2)} m, pixel ${px},${py}: drawn by ${kept} levels`);
    }
  }
  return { ok: problems.length === 0, problems, samples };
}

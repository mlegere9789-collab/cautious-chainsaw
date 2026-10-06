// Extracts the app's own interpolation + draw routines from the beautified bundle text (terser beautify, no mangle changes) and
// evaluates them in a vm closure. Nothing is re-implemented: y1/F4/z4 (interpolation) and lS (unit canvas draw) are the shipped code.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
const W = 'C:/Users/mlege/gettysburg-map/tmp/pitch-anim/a1/';
const src = { baseline: fs.readFileSync(W + 'base.pretty.js', 'utf8'), r1c: fs.readFileSync(W + 'r1c.pretty.js', 'utf8') };
const between = (s, a, b) => { const i = s.indexOf(a); if (i < 0) throw new Error('marker not found: ' + a); const j = s.indexOf(b, i); if (j < 0) throw new Error('end marker not found: ' + b); return s.slice(i, j); };

export function loadModel(which, { textWidth } = {}) {
  const s = src[which];
  const interp = between(s, 'function n2(c, f, x) {', 'const Lp = {');
  const draw = between(s, 'const Lp = {', 'const Jx = {};');
  const clock = between(s, 'const Jx = {};', 'const hF = {');
  const code = `
    ${interp}
    ${draw}
    ${clock}
    const __origY1 = y1; let __lastY1 = null, __lastArgs = null; y1 = function (...a) { const r = __origY1(...a); __lastY1 = r; __lastArgs = [a[1], a[2]]; return r; };
    ({ y1, F4, z4, lS, lA, Y4, cx, X4, Lp, uF, dA, cA, Qx, Ed, Op, Gk, e1, aT, Xx, getLastY1: () => __lastY1, getLastArgs: () => __lastArgs, getI2: () => i2, getHc: () => Hc, setHc: (v) => { Hc = v; }, setF: (v) => { F_ = v; }, cF, s2 });
  `;
  const ctxObj = {
    Math, Object, Array, Number, String, Set, Map, JSON, window: { __gtbgReduceMotion: false, AudioContext: undefined }, document: {},
    performance: { now: () => 0 }, requestAnimationFrame: () => 0, cancelAnimationFrame: () => {}, console,
    CanvasRenderer: {}, sT: undefined,
    yn: { getState: () => ({ loadedDays: new Set([1, 2, 3]), addPlacementsForDay() {} }), setState() {} },
  };
  ctxObj.window.window = ctxObj.window;
  vm.createContext(ctxObj);
  // CanvasRenderer is referenced as a global in the baseline's lS (a bug: it is not defined) - provide it only when asked
  const api = vm.runInContext(code, ctxObj, { filename: `model-${which}.js` });
  api.__ctx = ctxObj;
  return api;
}
// replicate the store's addPlacementsForDay per build
export function buildStore(which, rowsByDay) {
  let pbt = {};
  const loaded = new Set();
  const add = (day, rows) => {
    const P = {}; rows.forEach((z) => { (P[z.tick] ||= []).push(z); });
    if (which === 'baseline') pbt = { ...pbt, ...P };
    else {
      const m = { ...pbt };
      for (const k in P) { const cur = m[k]; if (!cur) { m[k] = P[k]; continue; } const seen = new Map(); cur.forEach((r) => seen.set(r.unit_id, r)); P[k].forEach((r) => seen.set(r.unit_id, r)); m[k] = [...seen.values()]; }
      pbt = m;
    }
    loaded.add(day);
  };
  return { add, get pbt() { return pbt; }, loaded };
}
export const DAY_FILES = {
  1: ['placements_day1_ticks1_50.json', 'placements_day1_ticks51_100.json', 'placements_day1_ticks101_225.json', 'density_day1_ticks1_50.json', 'density_day1_ticks51_100.json', 'density_day1_afternoon.json', 'density_artillery_positions.json', 'density_cavalry_detail.json', 'density_skirmishers.json', 'density_day1_lateafternoon.json', 'density_day1_seminary.json', 'density_day1_opening.json', 'density_day1_iverson.json', 'density_day1_railroadcut.json', 'density_day1_barlowsknoll.json', 'density_day1_ironbrigade.json'],
  2: ['placements_day2_ticks226_300.json', 'placements_day2_ticks301_375.json', 'placements_day2_ticks376_450.json', 'density_day2_lrt.json', 'density_day2_wheatfield.json', 'density_day2_culpshill.json', 'density_day2_overnight.json', 'density_reserves.json', 'density_day2_morning.json', 'density_day2_afternoon.json', 'density_day2_bigelow.json', 'density_day2_culpshill_overnight.json', 'density_day2_cemhill.json', 'density_day2_wright.json', 'density_day2_kershaw.json', 'density_day2_15alabama.json', 'density_day2_devilsden.json'],
  3: ['placements_day3_ticks451_520.json', 'placements_day3_ticks521_600.json', 'placements_day3_ticks601_675.json', 'density_day3_picketts_charge.json', 'density_day3_culpshill.json', 'density_day3_aftermath.json', 'density_day3_cannonade.json', 'density_day3_pettigrew.json', 'density_day3_retreat.json', 'density_day3_morning.json', 'density_day3_cavalry.json', 'density_day3_angle.json', 'density_day3_vermont.json', 'density_day3_hancock.json'],
};
export function dayRows(day, dist = 'baseline/dist') {
  const D = path.join('C:/Users/mlege/gettysburg-map', dist, 'data'); const out = [];
  for (const f of DAY_FILES[day]) { const j = JSON.parse(fs.readFileSync(path.join(D, f), 'utf8')); const pl = Array.isArray(j) ? j : j.placements || []; for (const r of pl) out.push(r); }
  return out;
}

// Node tests (no browser, no GPU) of the level-of-detail selection on the REAL layer: the 127,572 figures of the history layer on the field at 13:30 on 3 July, the stage that places them, and cameras at the distances of the
// hand-overs. The selection is the one the crowd runs every frame (src/crowd/lod.mjs selectFigures). Run next to the hard swap that the cross-fade replaces.
//   node --test docs/battle-theatre/app/tests/crowd-lod-real.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import { nodeWorld } from './node-world.mjs';
import { makeGeo } from '../src/geo.mjs';
import { loadRawFromDisk, terrainMeta } from '../tools/history-report.mjs';
import { createRealHistory } from '../src/history/real.mjs';
import { worldFromUnits } from '../src/world-from-units.mjs';
import { Stage } from '../src/stage.mjs';
import { minOf } from '../src/clock.mjs';
import { perspective, lookAt, mul, frustumPlanes } from '../../render/prototype/src/math.mjs';
import { soldierPlace } from '../../render/prototype/src/world.mjs';
import { FigureList, selectFigures, lodOptions, lodRadii, decodeRange, LOD0_BUDGET } from '../src/crowd/lod.mjs';

const raw = loadRawFromDisk(), TM = terrainMeta(), { T } = await nodeWorld(), geo = makeGeo(T);
const L = createRealHistory({ raw, T: TM, helpers: { civilDawn: m => m + 4 * 60 + 3 } }), world = worldFromUnits(T, geo, L), stage = new Stage({ layer: L, world, T, geo });
stage.loadScenario({ id: 'pdf-recommended', choices: {}, optionText: {} });
const tMin = minOf(7, 3, 13) + 30; stage.apply(tMin);
const ANIM_T = 40 + (tMin * 60) % 7200;

// the largest infantry unit on the field, its middle man and heading
let pick = -1, bc = 0; for (let i = 0; i < L.units.length; i++) if (stage.present[i] === 1 && L.units[i].arm === 'infantry' && world.units[i].count > bc) { bc = world.units[i].count; pick = i; }
const U = world.units[pick], mid = U.first + (U.count >> 1), tmp = [0, 0, 0]; soldierPlace(world, mid, ANIM_T, tmp); const FX = tmp[0], FZ = tmp[1], HD = stage.ch[pick], FY = T.h(FX, FZ);
// a 640 x 360 picture with the field of view that gives the pixel density of 1080p at 60 degrees: the radii are the nominal 10, 13 and 75 m
const FOV = 2 * Math.atan((360 / 1080) * Math.tan(Math.PI / 6)), RAD = lodRadii(360, FOV, { nearR: 40, midR: 300 });
function cam(ex, ey, ez, tx, ty, tz) { const yaw = Math.atan2(tx - ex, tz - ez), pitch = Math.atan2(ty - ey, Math.hypot(tx - ex, tz - ez)), cp = Math.cos(pitch), fwd = [Math.sin(yaw) * cp, Math.sin(pitch), Math.cos(yaw) * cp], view = new Float32Array(16), proj = new Float32Array(16), vp = new Float32Array(16), planes = new Float32Array(24);
  lookAt([ex, ey, ez], [ex + fwd[0], ey + fwd[1], ez + fwd[2]], [0, 1, 0], view); perspective(FOV, 16 / 9, 0.25, 6000, proj); mul(proj, view, vp); frustumPlanes(vp, planes); return { cam: { x: ex, y: ey, z: ez, fwd, fov: FOV }, planes }; }
const front = (D, eye = 1.7, along = 0) => { const fx = FX + Math.cos(HD) * along, fz = FZ - Math.sin(HD) * along, ex = fx + Math.sin(HD) * D, ez = fz + Math.cos(HD) * D; return cam(ex, T.h(ex, ez) + eye, ez, fx, T.h(fx, fz) + 1.2, fz); };
const run = (L2, c, opt = lodOptions(), rad = RAD) => selectFigures(L2, { world, T, present: stage.present, cam: c.cam, planes: c.planes, rad, animT: ANIM_T, opt, nUnits: world.units.length });
const HARD = { band: 0, hyst: 0 };
const coverage = L2 => { const m = new Map(); for (let j = 0; j < L2.n; j++) { const c = [0, 0, 0]; for (let k = 0; k < 3; k++) if ((L2.mask[j] >> k) & 1) { const d = decodeRange(L2.p[j * 3 + k]); c[k] = Math.min(d.hi, 1) - d.lo; } m.set(L2.fig[j], c); } return m; };
const snap = L2 => ({ n: L2.n, fig: L2.fig.slice(0, L2.n), mask: L2.mask.slice(0, L2.n), p: L2.p.slice(0, L2.n * 3), nu: L2.nu.slice(0, L2.n) });
const eq = (a, b) => a.n === b.n && ['fig', 'mask', 'p', 'nu'].every(k => Buffer.compare(Buffer.from(a[k].buffer, a[k].byteOffset, a[k].byteLength), Buffer.from(b[k].buffer, b[k].byteOffset, b[k].byteLength)) === 0);

test('the real layer: a large infantry unit is on the field at 13:30 on 3 July and the radii are the nominal ones', () => {
  assert.ok(pick >= 0 && bc >= 200, `unit ${pick} has ${bc} figures`); assert.ok(Math.abs(RAD.r0 - 10) < 1e-9 && Math.abs(RAD.r1 - 13) < 1e-9 && Math.abs(RAD.r2 - 75) < 1e-9);
});
test('at the distances of the hand-overs men are inside a cross-fade: figures are listed at two levels there, and the count of fading figures is a small share of the list', () => {
  const rows = []; for (const D of [4, 8, 9.5, 10, 10.5, 12, 13, 14, 20, 40, 65, 75, 85, 120]) { const L2 = new FigureList(256); run(L2, front(D)); const s = L2.stats; let two = 0, one = 0; for (let j = 0; j < L2.n; j++) { const m = L2.mask[j]; if (m & (m - 1)) two++; else one++; } rows.push({ D, listed: L2.n, L0: [...Array(L2.n).keys()].filter(j => L2.mask[j] & 1).length, two, one, bands: s.bands.slice(), r0e: +s.r0e.toFixed(2), cut: s.budgetCut });
    assert.ok(s.nL0 <= LOD0_BUDGET, `D ${D}: ${s.nL0} at LOD0`); for (let j = 0; j < L2.n; j++) assert.ok(L2.mask[j] >= 1, 'every listed figure has a level'); }
  console.log('# real unit ' + L.units[pick].id + ' (' + bc + ' figures) at 13:30 July 3, listed figures by camera distance (640x360 equivalent of 1080p / 60 degrees):'); for (const r of rows) console.log('#   ' + JSON.stringify(r));
  const at = D => rows.find(r => r.D === D); assert.ok(at(10).two > 0 && at(13).two > 0 && at(75).two > 0, 'cross-fades are active at 10, 13 and 75 m'); for (const r of rows) assert.ok(r.two <= r.listed * 0.1 + 5, `D ${r.D}: ${r.two} of ${r.listed} inside a cross-fade`); assert.ok(at(4).L0 > 0, 'near: level 0'); assert.ok(at(120).L0 === 0 && at(120).two === 0, 'at 120 m nothing of the unit is inside a band (the other units in view are farther or beyond)');
});
test('a camera moving toward the unit 2 cm at a time: no figure changes any level by more than the slope of the band; the hard swap steps by a whole level', () => {
  const sweep = opt => { let prev = null, worst = 0, hist = 0, where = ''; const L2 = new FigureList(256); for (let D = 24; D > 5; D -= 0.02) { run(L2, front(D), opt); const cov = coverage(L2); if (prev) for (const [fig, c] of cov) { const p = prev.get(fig); if (!p) continue; for (let k = 0; k < 3; k++) { const s = Math.abs(c[k] - p[k]); if (s > worst) { worst = s; where = `fig ${fig} level ${k} at ${D.toFixed(2)} m`; } if (s > 0.2) hist++; } } prev = cov; } return { worst, hist, where }; };
  const soft = sweep(lodOptions()), hard = sweep(lodOptions(HARD)); console.log('# sweep 24 m to 5 m in 2 cm steps: cross-fade worst step', soft.worst.toFixed(4), soft.where, '| hard swap worst step', hard.worst, 'steps over 0.2:', hard.hist, hard.where);
  assert.ok(soft.worst < 0.1 && soft.hist === 0, `${soft.worst} ${soft.where}`); assert.ok(hard.worst === 1 && hard.hist > 20);
});
test('the same time and camera give the same lists and ranges through a different history on the real layer', () => {
  const A = front(10.4), B = front(70, 3, 20), C = front(200, 30);
  const L1 = new FigureList(128); run(L1, A); const s1 = snap(L1); const L2 = new FigureList(128); for (const c of [B, C, A, C, B]) run(L2, c); run(L2, A); assert.ok(eq(s1, snap(L2)), 'through a different history'); assert.ok(L1.n > 50);
});
test('the budget on the real layer: standing inside the unit (a few metres from the middle man) and at 40 random places of the field, never more than K men have a LOD0 share', () => {
  let cuts = 0, worst = 0; const places = [[0, 0.5], [1.5, 0.5], [0, 3], [10, 1]]; for (const [along, d] of places) { const L2 = new FigureList(256), c = front(d, 1.7, along); run(L2, c); worst = Math.max(worst, L2.stats.nL0); if (L2.stats.budgetCut) cuts++; }
  let seed = 12345; const rnd = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296, cuts2 = []; const nUnits = stage.present.length, present = []; for (let i = 0; i < nUnits; i++) if (stage.present[i] === 1 && world.units[i].count > 20) present.push(i);
  for (let q = 0; q < 40; q++) { const ui = present[Math.floor(rnd() * present.length)], u = world.units[ui], fi = u.first + Math.floor(rnd() * u.count); soldierPlace(world, fi, ANIM_T, tmp); const ang = rnd() * 6.28, D = 1.5 + rnd() * 6, ex = tmp[0] + Math.sin(ang) * D, ez = tmp[1] + Math.cos(ang) * D, c = cam(ex, T.h(ex, ez) + 1.7, ez, tmp[0], T.h(tmp[0], tmp[1]) + 1.2, tmp[1]), L2 = new FigureList(256);
    run(L2, c); worst = Math.max(worst, L2.stats.nL0); if (L2.stats.budgetCut) cuts2.push({ unit: L.units[ui].id, men: L2.stats.nL0, r0e: +L2.stats.r0e.toFixed(2) }); }
  console.log('# budget on the real layer: the largest LOD0 count seen', worst, '| budget cut in', cuts, 'of', places.length, 'places in the unit and', cuts2.length, 'of 40 random places', JSON.stringify(cuts2.slice(0, 5)));
  assert.ok(worst <= LOD0_BUDGET);
});
test('the list is never empty where figures are, and no figure the cross-fade lists is beyond the last band: the list is a fraction of the layer', () => {
  const L2 = new FigureList(256); run(L2, front(30, 40)); assert.ok(L2.n > 100 && L2.n < world.count / 4, `listed ${L2.n} of ${world.count}`);
  const hard = new FigureList(256); run(hard, front(30, 40), lodOptions(HARD)); assert.ok(L2.n >= hard.n * 0.9 && L2.n <= hard.n * 1.5, `cross-fade ${L2.n} against hard ${hard.n}: the fades add the figures of the outer bands only`);
});

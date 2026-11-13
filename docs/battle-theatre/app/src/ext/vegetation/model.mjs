// The vegetation of July 1863 as data and as a pure function of time (requirement R20, gate Q21). No DOM, no GPU, no clock, no Math.random: every value below is a function
// of the data file (data/vegetation.json), the minute of the theatre clock and the viewer's choices. Tested in node (tests/vegetation.test.mjs).
//
//   stateAt(model, unit, tMin, choices)    the state of one unit (a field cell, a woodlot, an orchard, a tree cluster ...) at a minute: crop and stage, colour and height as
//                                          RANGES with the unit's own seeded position inside them, cut share, trampled share, flattened share, leaf cover, tree damage, fruit,
//                                          and the tier of every part with the claims that bear on it
//   checkVegetation(model, opts)           the check of gate Q21: every unit at every sampled date lies inside the documented-or-ranged schedule, damage never comes before
//                                          its event, the state is the same in any order of asking, every claim a state names exists and carries its quote and its place
//   placeTrees(unit, project, opts)        the seeded scatter of the trees of one unit (rows for orchards)
//
// Tiers (data-contract): documented, inferred, plausible-procedural, open gap. A state carries the WEAKEST tier of what it is made of.

export const SCHEMA = 'bt-vegetation/1';
export const TIERS = ['documented', 'inferred', 'plausible-procedural', 'open gap'];
const RANK = Object.fromEntries(TIERS.map((t, i) => [t, i]));
export const weakest = (...ts) => ts.filter(Boolean).reduce((a, b) => (RANK[b] > RANK[a] ? b : a), 'documented');

// ---------------------------------------------------------------------------------------------------------------------------------- time
const MONTH0 = { 6: 0, 7: 30, 8: 61, 9: 92, 10: 122, 11: 153 };
/** '1863-07-02' or '1863-07-02T16:30' -> minutes since 1863-06-01 00:00 (the clock of the theatre) */
export function isoMin(s) {
  const [d, t = ''] = String(s).split('T'), [y, m, dd] = d.split('-').map(Number);
  if (y !== 1863 || !(m in MONTH0) || !(dd >= 1 && dd <= 31)) throw new RangeError('not a date of this model: ' + s);
  const [hh = 0, mm = 0] = t ? t.split(':').map(Number) : [];
  return ((MONTH0[m] + dd - 1) * 24 + hh) * 60 + mm;
}
export const DAY = 1440;
export const WINDOW_FROM = isoMin('1863-06-26'), WINDOW_TO = isoMin('1863-07-15');
export const SEASON_SPLIT = isoMin('1863-08-15');       // before: the window (late June to mid July); after: the epilogue (19 November)
export const EPILOGUE_T = isoMin('1863-11-19');
export const minToIso = m => { const d = Math.floor(m / DAY), r = m - d * DAY; let mo = 6; for (const k of [11, 10, 9, 8, 7, 6]) if (d >= MONTH0[k]) { mo = k; break; } const dd = d - MONTH0[mo] + 1, hh = Math.floor(r / 60), mm = Math.round(r % 60); return `1863-${String(mo).padStart(2, '0')}-${String(dd).padStart(2, '0')}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`; };

// ---------------------------------------------------------------------------------------------------------------------------------- numbers
export const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, f) => a + (b - a) * f;
export const smooth = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
export const lerpArr = (a, b, f) => a.map((v, i) => lerp(v, b[i], f));
/** a 32-bit integer hash (Murmur3 finaliser) of up to three integers */
export function hash32(a, b = 0, c = 0) {
  let h = (a | 0) ^ Math.imul(b | 0, 0x9e3779b1) ^ Math.imul(c | 0, 0x85ebca6b);
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return h >>> 0;
}
export const strHash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
/** a number in [0,1) that depends only on the unit's seed and a tag */
export const u01 = (seed, tag, k = 0) => hash32(seed, strHash(tag), k) / 4294967296;
export function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---------------------------------------------------------------------------------------------------------------------------------- the model
export class VegModel {
  constructor(data) {
    const bad = validateData(data); if (bad.length) throw new Error('the vegetation data is not fit to use: ' + bad[0] + (bad.length > 1 ? ` (and ${bad.length - 1} more)` : ''));
    this.data = data; this.cal = data.calendar; this.units = data.units; this.byId = new Map(data.units.map((u, i) => (u.i = i, [u.id, u])));
    this.claims = new Map(data.claims.map(c => [c.id, c])); this.events = new Map(data.events.map(e => [e.id, e])); this.farms = new Map(data.farms.map(f => [f.id, f]));
    this.scenarios = data.scenarios; this.species = data.species; this.speciesList = Object.keys(data.species); this.gaps = data.gaps;
    for (const k of Object.keys(this.cal.crops)) { this.cal.crops[k].keys.sort((a, b) => a.t - b.t); }
    this.lrtUnits = new Set(data.scenarios['CF-VEG-LRT'].lrt_units);
  }
  unit(u) { return typeof u === 'string' ? this.byId.get(u) : u; }
  stateAt(u, tMin, choices) { return stateAt(this, u, tMin, choices); }
}

export function validateData(d) {
  const bad = [];
  if (!d || d.schema !== SCHEMA) return ['schema is not ' + SCHEMA];
  for (const k of ['calendar', 'species', 'woods_classes', 'orchard_classes', 'scenarios', 'farms', 'events', 'gaps', 'claims', 'units']) if (!(k in d)) bad.push('missing ' + k);
  if (bad.length) return bad;
  const ids = new Set();
  for (const u of d.units) { if (ids.has(u.id)) bad.push('repeated unit id ' + u.id); ids.add(u.id); if (!Array.isArray(u.rings) || !u.rings[0] || u.rings[0].length < 6) bad.push('unit ' + u.id + ' has no outline'); if (!TIERS.includes(u.geom_tier)) bad.push('unit ' + u.id + ' has no geometry tier'); }
  return bad;
}

// ---------------------------------------------------------------------------------------------------------------------------------- scenarios
/** the option key in force for a scenario id: the viewer's choice (a map of id -> option, read from `choices` as the shell's live choices object or a plain object) or the default */
export function scenarioOption(model, choices, id) {
  const s = model.scenarios[id]; if (!s) throw new Error('no scenario ' + id);
  let c; try { c = choices && (typeof choices === 'function' ? choices() : choices)[id]; } catch { c = undefined; }
  return c && s.options[c] ? c : s.default;
}

// ---------------------------------------------------------------------------------------------------------------------------------- crops
function bracket(keys, te) {
  if (te <= keys[0].t) return [keys[0], keys[0], 0];
  const L = keys[keys.length - 1]; if (te >= L.t) return [L, L, 0];
  let i = 0; while (keys[i + 1].t <= te) i++;
  return [keys[i], keys[i + 1], (te - keys[i].t) / (keys[i + 1].t - keys[i].t)];
}
const midOf = (range, f) => lerp(range[0], range[1], f);
/** the instant a unit's crop is cut: the harvest range of the calendar with the unit's own draw (or the end the viewer pinned) */
export function cutMinute(model, u, choices) {
  const c = model.cal.crops[u.crop]; if (!c || !c.harvest) return Infinity;
  const h = c.harvest, opt = model.scenarios['CF-VEG-HARVEST'].options[scenarioOption(model, choices, 'CF-VEG-HARVEST')];
  const draw = opt.u == null ? Math.pow(u.p.cut_u, h.bias) : opt.u;
  return Math.round(lerp(h.earliest_min, h.latest_min, draw));
}

/** ground cover state of a crop at a minute: before the cut, during it, after it */
export function cropState(model, u, tMin, choices) {
  const cal = model.cal, c = cal.crops[u.crop]; if (!c) return null;
  const p = u.p;
  if (tMin >= SEASON_SPLIT) {                                   // the epilogue: 19 November
    const rows = cal.epilogue.stages[u.crop] || cal.epilogue.stages.pasture; let x = p.epi_u * rows.reduce((a, r) => a + r.w, 0), r = rows[rows.length - 1];
    for (const q of rows) { if ((x -= q.w) <= 0) { r = q; break; } }
    return { season: 'epilogue', stage: r.stage, color: lerpArr(r.color[0], r.color[1], p.color_u), colorRange: r.color, h: r.h.map(v => v * p.h_scale), cut: 1, tier: cal.epilogue.tier, why: cal.epilogue.why };
  }
  const te = tMin - p.ripe_off_d * DAY;
  const [a, b, f] = bracket(c.keys, te);
  const colorRange = [lerpArr(a.color[0], b.color[0], f), lerpArr(a.color[1], b.color[1], f)], hRange = lerpArr(a.h, b.h, f);
  const stand = { stage: a.stage, color: lerpArr(colorRange[0], colorRange[1], p.color_u), colorRange, h: hRange.map(v => v * p.h_scale), hRange, tier: weakest(a.tier, b.tier), why: a.why };
  const cutT = cutMinute(model, u, choices);
  if (!(tMin > cutT) || !c.cut) return { season: 'window', ...stand, cut: 0, cutAt: cutT };
  const cut = c.cut, f2 = smooth((tMin - cutT) / DAY);
  const after = tMin - cutT >= cut.days * DAY ? cut.stubble : cut;
  const cc = lerpArr(after.color[0], after.color[1], p.color_u), hh = after.h.map(v => v * p.h_scale);
  const color = lerpArr(stand.color, cc, f2), h = lerpArr(stand.h.length === 2 ? stand.h : [stand.h[0], stand.h[1]], hh, f2);
  const stage = f2 < 1 ? 'being_cut' : (tMin - cutT >= cut.days * DAY ? cut.stubble.stage : cut.stage);
  return { season: 'window', stage, color, colorRange: [lerpArr(colorRange[0], after.color[0], f2), lerpArr(colorRange[1], after.color[1], f2)], h, hRange: lerpArr(hRange, after.h, f2).map(v => v * 1), cut: f2, cutAt: cutT, shockH: cut.shock_h || null,
    tier: weakest(stand.tier, c.harvest.tier), why: c.harvest.why };
}

// ---------------------------------------------------------------------------------------------------------------------------------- damage
const ramp = (t, a, b) => smooth((t - a) / Math.max(1, b - a));
function eventAmount(model, u, e, tMin) {
  const hit = (u.ev || []).find(x => x[0] === e.id); if (!hit) return 0;
  const ev = model.events.get(e.id), fin = lerp(ev.final[0], ev.final[1], u01(u.seed, ev.id));
  return hit[1] * fin * ramp(tMin, ev.from_min, ev.to_min);
}
export function damageAt(model, u, tMin) {
  let tr = 1, st = 1; const hits = [];
  for (const [id] of (u.ev || [])) {
    const ev = model.events.get(id); if (!ev) continue;
    const a = eventAmount(model, u, ev, tMin);
    if (a > 0) hits.push(id);
    if (ev.kind === 'trample') tr *= 1 - a; else if (ev.kind === 'strip') st *= 1 - a;
  }
  return { trample: 1 - tr, strip: 1 - st, events: hits };
}
export function lodgingAt(model, u, tMin, choices) {
  const L = model.cal.lodging, opt = model.scenarios['CF-VEG-RAIN'].options[scenarioOption(model, choices, 'CF-VEG-RAIN')];
  if (!L.crops.includes(u.crop)) return 0;
  return opt.lodging * ramp(tMin, L.from_min, L.to_min) * (0.6 + 0.8 * u01(u.seed, 'lodge'));
}

// ---------------------------------------------------------------------------------------------------------------------------------- leaf, fruit
export function leafAt(model, u, tMin) {
  const L = model.cal.leaf, win = tMin < SEASON_SPLIT, r = (win ? L.window : L.epilogue).range;
  return { leaf: lerp(r[0], r[1], u01(u.seed, 'leaf')), range: r, tier: (win ? L.window : L.epilogue).tier };
}
export function fruitAt(model, u, tMin) {
  if (!u.orchard) return null; const out = {};
  for (const [sp, w] of Object.entries(u.orchard.species)) {
    const f = model.cal.orchard_fruit[sp]; if (!f || tMin >= SEASON_SPLIT) { out[sp] = { stage: tMin >= SEASON_SPLIT ? 'none_leaf_off' : 'no_account', share: w, tier: 'plausible-procedural' }; continue; }
    const ks = f.keys; let k = ks[0]; for (const q of ks) if (tMin >= q.t) k = q;
    out[sp] = { stage: k.stage, share: w, tier: k.tier };
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------------------- the state of one unit
/**
 * The state of a unit at a minute. Pure: the same (model, unit, tMin, choices) always gives the same record.
 *   ground:  { crop, stage, color [r,g,b], colorRange, h [min,max] (m), cut, trample, lodging }   -- for cover that is a crop, meadow, pasture or bare/rocky ground
 *   trees:   { leaf, leafRange, strip, trees: perHa, understory }                                  -- for woodlots, thickets, tree clusters and orchards
 *   tiers:   the tier of each part; `tier` is the weakest of all of them
 *   claims:  ids of the claims that bear on the unit with their role (exact: the claim names this polygon; nearest: placed by a rule; area: evidence for the neighbourhood)
 */
export function stateAt(model, unit, tMin, choices) {
  const u = model.unit(unit); if (!u) throw new Error('no unit ' + unit);
  const dm = damageAt(model, u, tMin), season = tMin >= SEASON_SPLIT ? 'epilogue' : 'window';
  const out = { id: u.id, cls: u.cls, name: u.name, t: tMin, season, tiers: {}, claims: u.claims, events: dm.events };
  let lrtNote = null;
  if (u.crop) {
    const cs = cropState(model, u, tMin, choices);
    const lodge = season === 'window' && cs.cut < 0.5 ? lodgingAt(model, u, tMin, choices) : 0;     // only a standing crop can be laid flat by the rain
    const flat = clamp(dm.trample, 0, 1);
    out.ground = { crop: u.crop, label: model.cal.crops[u.crop].label, stage: cs.stage, color: cs.color, colorRange: cs.colorRange, h: cs.h.map(v => v * (1 - 0.82 * flat) * (1 - 0.45 * lodge)), hStanding: cs.h, cut: cs.cut, cutAt: Number.isFinite(cs.cutAt) ? cs.cutAt : null, shockH: cs.shockH || null, trample: flat, lodging: lodge };
    out.tiers.crop = u.crop_tier; out.tiers.stage = u.crop_tier === 'documented' ? cs.tier : weakest(cs.tier, u.crop_tier); out.tiers.height = out.tiers.stage; out.tiers.colour = 'plausible-procedural';
    out.why = cs.why;
  }
  if (u.woods || u.cls === 'woods' || u.cls === 'scatter') {
    const lf = leafAt(model, u, tMin);
    let density = u.woods ? u.woods.per_ha : 0, lrt = scenarioOption(model, choices, 'CF-VEG-LRT');
    if (model.lrtUnits.has(u.id)) { if (lrt === 'wiki_unwooded') { density = 0; lrtNote = 'Little Round Top read as unwooded'; } else if (lrt === 'wiki_light_summit') { density *= 0.5; lrtNote = 'Little Round Top read as lightly wooded'; } }
    out.trees = { leaf: lf.leaf * (1 - 0.9 * dm.strip), leafFull: lf.leaf, leafRange: lf.range, strip: dm.strip, perHa: density, class: u.woods && u.woods.class, understory: u.woods && u.woods.understory, species: u.woods && u.woods.species };
    out.tiers.leaf = lf.tier; out.tiers.density = 'plausible-procedural'; out.tiers.species = (u.woods && u.woods.class === 'big_round_top') ? 'inferred' : 'plausible-procedural';
    if (lrtNote) { out.tiers.cover = model.scenarios['CF-VEG-LRT'].options[lrt].tier; out.scenario = { 'CF-VEG-LRT': lrt, note: lrtNote }; }
  }
  if (u.orchard) {
    const lf = leafAt(model, u, tMin);
    out.trees = { leaf: lf.leaf * (1 - 0.9 * dm.strip), leafFull: lf.leaf, leafRange: lf.range, strip: dm.strip, class: u.orchard.class, spacing: u.orchard.spacing_m, species: u.orchard.species };
    out.fruit = fruitAt(model, u, tMin); out.tiers.leaf = lf.tier; out.tiers.fruit = weakest(...Object.values(out.fruit).map(f => f.tier)); out.tiers.age = u.orchard.age_tier;
    if (!out.ground) { out.ground = { crop: 'pasture', ...(() => { const cs = cropState(model, { crop: 'pasture', p: u.p, seed: u.seed }, tMin, choices); return { label: 'Grass under the trees', stage: cs.stage, color: cs.color, colorRange: cs.colorRange, h: cs.h, hStanding: cs.h, cut: 0, shockH: null, trample: clamp(dm.trample, 0, 1), lodging: 0 }; })() }; out.tiers.crop = 'plausible-procedural'; out.tiers.stage = 'plausible-procedural'; out.tiers.height = 'plausible-procedural'; out.tiers.colour = 'plausible-procedural'; }
  }
  if (u.cls === 'boulder') { out.ground = { crop: 'open_rock', label: 'Boulder ground', stage: 'rock', color: [0.46, 0.43, 0.38], colorRange: [[0.42, 0.40, 0.35], [0.5, 0.46, 0.4]], h: [0, 0.1], hStanding: [0, 0.1], cut: 0, shockH: null, trample: 0, lodging: 0 }; out.tiers.crop = 'inferred'; out.tiers.stage = 'inferred'; out.tiers.height = 'inferred'; out.tiers.colour = 'plausible-procedural'; }
  if (u.cls === 'woods' || u.cls === 'scatter') {          // the ground under a woodlot: leaf litter and shade, not a crop
    out.ground = { crop: 'forest_floor', label: 'Woodlot floor', stage: season === 'window' ? 'shaded_litter' : 'leaf_litter', color: season === 'window' ? [0.2, 0.21, 0.13] : [0.34, 0.27, 0.17], colorRange: [[0.15, 0.17, 0.1], [0.26, 0.26, 0.16]], h: [0, 0.2], hStanding: [0, 0.2], cut: 0, shockH: null, trample: 0, lodging: 0 };
    out.tiers.crop = 'plausible-procedural'; out.tiers.stage = 'plausible-procedural'; out.tiers.height = 'plausible-procedural'; out.tiers.colour = 'plausible-procedural';
  }
  out.tiers.geometry = u.geom_tier;
  if (dm.events.length) out.tiers.damage = weakest(...dm.events.map(id => model.events.get(id).tier), 'plausible-procedural');
  out.tier = weakest(...Object.values(out.tiers));
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------------------- trees
export const SHAPES = ['broad', 'oval', 'column', 'cone', 'round'];
/**
 * The trees of one unit as a flat list [x, z, height_m, crown_radius_m, species_index, seed01, strip01, shape_index] * n (x east, z south, metres of the theatre's frame).
 * `project(lng, lat) -> [x, z]` is the theatre's own projection. Deterministic: the unit's seed and the position are the only inputs.
 * Woodlots and clusters: a jittered grid at the unit's density; orchards: rows along the unit's row direction at its spacing; the Warren outlines are the only limit.
 */
export function placeTrees(model, u, project, opts = {}) {
  const cls = u.cls; if (!(u.woods || u.orchard)) return new Float32Array(0);
  const ring = []; const r0 = u.rings[0]; for (let i = 0; i < r0.length; i += 2) ring.push(project(r0[i], r0[i + 1]));
  let minx = 1e9, minz = 1e9, maxx = -1e9, maxz = -1e9; for (const [x, z] of ring) { if (x < minx) minx = x; if (x > maxx) maxx = x; if (z < minz) minz = z; if (z > maxz) maxz = z; }
  const inside = (x, z) => { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const a = ring[i], b = ring[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
  const spec = u.orchard ? u.orchard.species : u.woods.species, names = Object.keys(spec).filter(n => model.species[n]), cum = []; let acc = 0; for (const n of names) { acc += spec[n]; cum.push(acc); }
  const pickSpecies = r => { const x = r * acc; for (let i = 0; i < names.length; i++) if (x <= cum[i]) return names[i]; return names[names.length - 1]; };
  const out = []; const rnd = mulberry32(u.seed ^ 0x5bd1e995);
  const push = (x, z, young) => {
    const sp = pickSpecies(rnd()), S = model.species[sp], g = rnd(), age = young ? 0.5 : 1;
    const h = lerp(S.h[0], S.h[1], Math.pow(rnd(), 1.4)) * age * (0.9 + 0.2 * g), r = lerp(S.r[0], S.r[1], rnd()) * age;
    out.push(x, z, h, r, model.speciesList.indexOf(sp), rnd(), rnd(), SHAPES.indexOf(S.shape));
  };
  const thin = opts.thin == null ? 1 : opts.thin;
  if (u.orchard) {
    const s = u.orchard.spacing_m, ang = (u.p.rows_deg || 0) * Math.PI / 180, ca = Math.cos(ang), sa = Math.sin(ang), young = u.orchard.class === 'young';
    const cx = (minx + maxx) / 2, cz = (minz + maxz) / 2, R = Math.hypot(maxx - minx, maxz - minz) / 2 + s;
    for (let a = -R; a <= R; a += s) for (let b = -R; b <= R; b += s) {
      const x = cx + a * sa + b * ca + (rnd() - 0.5) * 0.7, z = cz - a * ca + b * sa + (rnd() - 0.5) * 0.7;
      if (x < minx || x > maxx || z < minz || z > maxz || !inside(x, z)) { rnd(); rnd(); rnd(); rnd(); rnd(); rnd(); continue; }
      push(x, z, young);
    }
  } else {
    const per = u.woods.per_ha * thin; if (!(per > 0)) return new Float32Array(0);
    const cell = Math.sqrt(1e4 / per);
    for (let a = minx; a < maxx; a += cell) for (let b = minz; b < maxz; b += cell) {
      const x = a + rnd() * cell, z = b + rnd() * cell;
      if (!inside(x, z)) { rnd(); rnd(); rnd(); rnd(); rnd(); rnd(); continue; }
      push(x, z, false);
    }
  }
  return Float32Array.from(out);
}

// ---------------------------------------------------------------------------------------------------------------------------------- the check of gate Q21
/** default sample minutes: every day of the window at 06:00, 12:00 and 18:00, every event boundary, the two ends of the window and 19 November at noon */
export function sampleTimes(model) {
  const s = new Set();
  for (let d = WINDOW_FROM; d <= WINDOW_TO; d += DAY) for (const h of [6, 12, 18]) s.add(d + h * 60);
  s.add(WINDOW_FROM); s.add(WINDOW_TO);
  for (const e of model.data.events) { s.add(e.from_min - 1); s.add(e.from_min); s.add((e.from_min + e.to_min) >> 1); s.add(e.to_min); s.add(e.to_min + 1); }
  s.add(model.cal.lodging.from_min); s.add(model.cal.lodging.to_min);
  s.add(EPILOGUE_T + 12 * 60);
  return [...s].sort((a, b) => a - b);
}

const finite = (...xs) => xs.every(x => Number.isFinite(x));
const inRange = (v, lo, hi, eps = 1e-6) => v >= lo - eps && v <= hi + eps;

/**
 * The check of gate Q21 ("crop, canopy and ground-cover state per field per date within the documented-or-ranged schedule"). Returns { gate, ok, checked, failures, notRun, summary }.
 * Nothing here lowers a bar: a failing unit is reported with the minute and the reason; `notRun` lists what the check does not look at (pictures, real-GPU timing).
 */
export function checkVegetation(model, opts = {}) {
  const times = opts.times || sampleTimes(model), choicesList = opts.choicesList || [{}, { 'CF-VEG-HARVEST': 'early' }, { 'CF-VEG-HARVEST': 'late' }, { 'CF-VEG-RAIN': 'pdf_flattened' }, { 'CF-VEG-LRT': 'wiki_unwooded' }, { 'CF-VEG-LRT': 'wiki_light_summit' }];
  const failures = []; let checked = 0; const fail = (u, t, why) => { if (failures.length < 200) failures.push({ unit: u.id, t, iso: minToIso(t), why }); };
  const cal = model.cal;
  // claims: each has a quote, a tier of the two allowed, and a locator
  for (const c of model.data.claims) {
    if (!c.quote || c.quote.length < 12) fail({ id: c.id }, 0, 'claim without a quote of at least 12 characters');
    if (c.tier !== 'documented' && c.tier !== 'inferred') fail({ id: c.id }, 0, 'claim tier is ' + c.tier);
    if (!c.loc || !(c.loc.pdf_page || c.loc.page || c.loc.char_start != null)) fail({ id: c.id }, 0, 'claim without a place in its source');
  }
  for (const u of model.units) {
    for (const [cid] of u.claims || []) if (!model.claims.has(cid)) fail(u, 0, 'cites unknown claim ' + cid);
    for (const [eid] of u.ev || []) if (!model.events.has(eid)) fail(u, 0, 'names unknown event ' + eid);
    if (u.crop_tier === 'documented') {                          // a documented crop needs a documented claim that names this polygon
      const ok = (u.claims || []).some(([cid, role]) => role === 'exact' && model.claims.get(cid) && model.claims.get(cid).tier === 'documented' && model.claims.get(cid).about && model.claims.get(cid).about.crop === u.crop);
      if (!ok) fail(u, 0, 'documented crop without an exact documented claim that names it');
    }
    if (u.crop && !(u.crop in cal.crops)) fail(u, 0, 'crop ' + u.crop + ' not in the calendar');
    if (u.cls === 'field' && !u.crop_basis) fail(u, 0, 'field cell without the basis of its crop');
  }
  const prevTr = new Map();
  for (const t of times) {
    for (const choices of choicesList) {
      for (const u of model.units) {
        const s = stateAt(model, u, t, choices); checked++;
        if (!s.tier) { fail(u, t, 'no tier'); continue; }
        for (const k of Object.keys(s.tiers)) if (!TIERS.includes(s.tiers[k])) fail(u, t, `tier of ${k} is ${s.tiers[k]}`);
        if (s.ground) {
          const g = s.ground, c = cal.crops[u.crop] || null;
          if (!finite(...g.color, ...g.h, g.cut, g.trample, g.lodging)) fail(u, t, 'non-finite ground state');
          if (g.color.some(v => v < 0 || v > 1)) fail(u, t, 'colour outside 0..1');
          if (g.h[0] < -1e-9 || g.h[0] > g.h[1] + 1e-9) fail(u, t, 'height range inverted');
          if (g.trample < -1e-9 || g.trample > 1 + 1e-9 || g.cut < -1e-9 || g.cut > 1 + 1e-9) fail(u, t, 'share outside 0..1');
          if (c && s.season === 'window' && g.cut === 0) {              // standing crop: colour and height lie inside the keyframe ranges that bracket the unit's own time
            const te = t - u.p.ripe_off_d * DAY, ks = c.keys, lo = ks.filter(k => k.t <= te).pop() || ks[0], hi = ks.find(k => k.t >= te) || ks[ks.length - 1];
            for (let i = 0; i < 3; i++) {
              const mn = Math.min(lo.color[0][i], hi.color[0][i]), mx = Math.max(lo.color[1][i], hi.color[1][i]);
              if (!inRange(g.color[i], mn, mx)) fail(u, t, `colour ${i} ${g.color[i].toFixed(3)} outside the schedule range ${mn.toFixed(3)}..${mx.toFixed(3)}`);
            }
            const hmax = Math.max(lo.h[1], hi.h[1]) * 1.08 + 1e-6;
            if (g.hStanding[0] < Math.min(lo.h[0], hi.h[0]) * 0.92 - 1e-6 || g.hStanding[1] > hmax) fail(u, t, 'standing height outside the schedule range');
            if (g.h[1] > hmax) fail(u, t, 'height outside the schedule range');
          }
          if (c && c.harvest && g.cut > 0 && t < c.harvest.earliest_min - 1) fail(u, t, 'cut before the earliest date of its range');
          if (g.cutAt != null && c && c.harvest && (g.cutAt < c.harvest.earliest_min || g.cutAt > c.harvest.latest_min)) fail(u, t, 'cut date outside the harvest range');
        }
        if (s.trees) {
          if (!finite(s.trees.leaf, s.trees.strip)) fail(u, t, 'non-finite tree state');
          const win = s.season === 'window', L = win ? cal.leaf.window.range : cal.leaf.epilogue.range;
          if (!inRange(s.trees.leafFull, L[0], L[1])) fail(u, t, 'leaf cover outside its range');
          if (win && s.trees.leaf < 0.05) fail(u, t, 'leaf-off in the window');
          if (!win && s.trees.leafFull > 0.3 + 1e-9) fail(u, t, 'leaf-on in the epilogue');
        }
        // nothing before its time: no damage before its event starts
        for (const [eid] of u.ev || []) { const e = model.events.get(eid); if (t < e.from_min && ((e.kind === 'trample' && s.ground && s.ground.trample > 1e-9 && s.events.includes(eid)) || (e.kind === 'strip' && s.trees && s.trees.strip > 1e-9 && s.events.includes(eid)))) fail(u, t, `damage of ${eid} before ${e.from}`); }
        // trampling never decreases with time (the order of asking is the sampled order, ascending)
        if (choices === choicesList[0] && s.ground) { const k = u.id, last = prevTr.get(k); if (last != null && s.ground.trample < last - 1e-9) fail(u, t, 'trampling went down with time'); prevTr.set(k, s.ground.trample); }
      }
    }
  }
  // purity: the same questions in a shuffled order give the same answers
  const sub = model.units.filter((_, i) => i % 7 === 0), idx = times.map((_, i) => i); const rng = mulberry32(7); for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  let pure = true; for (const i of idx.slice(0, 24)) for (const u of sub) { const a = JSON.stringify(stateAt(model, u, times[i], {})), b = JSON.stringify(stateAt(model, u, times[i], {})); if (a !== b) { pure = false; fail(u, times[i], 'state differs between two asks'); } }
  const summary = {
    units: model.units.length, claims: model.data.claims.length, times: times.length, scenarios: choicesList.length, states: checked,
    byTier: Object.fromEntries(TIERS.map(t => [t, model.units.filter(u => (u.crop_tier || u.geom_tier) === t).length])), pure,
  };
  return { gate: 'Q21', ok: failures.length === 0 && pure, checked, failures, notRun: ['pictures of the fields and trees (software renderer only; no real-GPU timing)', 'comparison with 1863 photographs (none analysed)'], summary };
}

export const GATE_HOOKS = [{ gate: 'Q21', module: 'src/ext/vegetation/model.mjs', fn: 'checkVegetation(model, opts)', inputs: 'model = new VegModel(JSON of data/vegetation.json); opts.times (minutes), opts.choicesList', output: '{ gate, ok, checked, failures[], notRun[], summary }' }];

// Construction states of the field works as DRAW LISTS (gates Q08 and Q07, PDF B.7.1-B.7.6): every earthwork, breastwork, barricade and lunette of the record that has a construction window is
// absent before its documented start, passes through the stages of PDF B.7.4 (layout, felling and gathering, stacking, head logs, completed, damaged) inside the window the state engine reports,
// carries a work crew while it is being built, and is never pre-placed. A pre-existing wall or fence (PDF B.7.3: the Angle wall and the rest) is present from the first frame and has NO construction
// state at all. Pure data: no GPU. `works.at(tMin, choice)` is a pure function of (time, scenario choice): scrubbing in any order gives the same lists.
//
// What is real and what is procedural (data/works3d.json, GOVERNANCE/horde/ws6-structures/proposed-register/ws6-EG-06..09):
//  * TIMES: only the state engine (src/structures/state.mjs, the port of check_structures.state_at). A work whose engine state is resolved by a clock window is split into stages by the seeded procedure
//    of PDF B.7.4 (assumption 1, plausible-procedural); each segment of the work starts within a seeded offset (assumption 2) and still ends at the work's finish. A window with no clock is NOT turned
//    into a build: 'indeterminate' shows layout marks only (a ghost, uncertain), 'under construction, stage not resolved' shows a half-built segment marked uncertain; no stand-in crew works in a window
//    the record does not bound, and a work with no finish stays unfinished (open gap) rather than being completed by a guess.
//  * FOOTPRINT: no work has a mapped line in the repository (only a named place with its sigma), so each is a line traced along the contour of the (modern) ground from the gazetteer place, of the
//    printed length where the record prints one (inferred: weak keys) or of an assumed number of regiment fronts (plausible-procedural). It carries the place's sigma. It is never presented as measured.
//  * PROFILE: a 3D profile is drawn from the sourced description only (Culp's Hill: log close-fence with stone and earth, about 5 ft: tier inferred). No 1863 profile is documented anywhere in the
//    repository, so no work has a documented profile; the others are labelled plausible-procedural assumptions. Nothing is read from the modern (rebuilt or cleared) Culp's Hill, Little Round Top or Cemetery
//    Ridge walls (B.7.6): this module reads the ground height only, to drape the line.
//  * CREW: the builder units of the record that the history layer shows in a build_works activity at that time ARE the crew (the stage animates their figures); where none is, a labelled stand-in
//    crew (builder unknown, PDF B.7.1) is listed as draw instances, while the engine says the work is being built.
import { makeStateEngine, parseIso, isoOf } from './state.mjs';
import { msOfMin } from './model.mjs';

const MIN = 60000, TIER_CODE = { documented: 0, inferred: 1, 'plausible-procedural': 2, 'open gap': 3 };
export const SEG_STRIDE = 12, CREW_STRIDE = 8, CLIP = { stand: 0, chop_axe: 1, dig_shovel: 2, march_carry_rail: 3 };
export const FLAG = { uncertain: 1, crewing: 2, damaged: 4, ghost: 8, unfinished: 16 };
const fnv = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return h >>> 0; };      // FNV-1a with the murmur finaliser (the last characters of an id must reach the high bits)
const unit = s => fnv(s) / 4294967296;
const endOf = ms => { if (ms == null) return ms; const d = new Date(ms); return d.getUTCHours() === 23 && d.getUTCMinutes() === 59 ? ms + MIN : ms; };
const clone = o => JSON.parse(JSON.stringify(o));

// the work records with the labelled conventions and the overlay scenarios of data/works3d.json applied (a copy: the shared works file is never changed)
export function mergeWorks(works, data) {
  const W = clone(works), conv = data.params.conventions;
  for (const [id, d] of Object.entries(data.works)) {
    const w = W.works[id]; if (!w) continue;
    const pod = d.convention && d.convention.pod, c = pod && conv[pod], dateOnly = w.begin && w.begin.gran === 'date' && String(w.begin.earliest).endsWith('T00:00');
    if (c && w.begin && (w.begin.earliest == null || dateOnly) && (w.begin.date || '').length >= 10) { w.begin.earliest = `${w.begin.date.slice(0, 10)}T${c.clock}`; w.begin.convention = `${pod} = ${c.clock}: ${c.basis}`; }
    if (d.scenarios) { w.scenarios = w.scenarios || {}; for (const [name, sc] of Object.entries(d.scenarios)) w.scenarios[name] = { ...sc }; }
  }
  return W;
}

// ---- footprint: a line traced along the contour of the ground
function gradient(T, x, z) { const e = 6; return [(T.h(x + e, z) - T.h(x - e, z)) / (2 * e), (T.h(x, z + e) - T.h(x, z - e)) / (2 * e)]; }
function traceContour(T, x, z, sign, length, step, dir0) {
  const pts = [[x, z]]; let dir = dir0 || null, L = 0; const lim = [T.W / 2 - 5, T.H / 2 - 5];
  while (L < length - 1e-9) {
    const g = gradient(T, x, z), gm = Math.hypot(g[0], g[1]); let d = gm > 1e-4 ? [-g[1] / gm, g[0] / gm] : dir || [1, 0];
    if (dir && d[0] * dir[0] + d[1] * dir[1] < 0) d = [-d[0], -d[1]]; if (!dir && sign < 0) d = [-d[0], -d[1]]; if (!dir) dir = d; dir = d;
    const s = Math.min(step, length - L), nx = x + d[0] * s, nz = z + d[1] * s; if (Math.abs(nx) > lim[0] || Math.abs(nz) > lim[1]) break;
    x = nx; z = nz; L += s; pts.push([x, z]);
  }
  return pts;
}
function walkGradient(T, x, z, metres, step) {       // uphill (+) or downhill (-) by steepest ascent
  let L = 0; const sgn = metres >= 0 ? 1 : -1; metres = Math.abs(metres);
  while (L < metres - 1e-9) { const g = gradient(T, x, z), gm = Math.hypot(g[0], g[1]); if (gm < 1e-4) break; const s = Math.min(step, metres - L); x += sgn * g[0] / gm * s; z += sgn * g[1] / gm * s; L += s; }
  return [x, z];
}
const arcLen = pts => { let s = 0; for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return s; };
function sliceRuns(pts, run) {                       // cut a polyline into runs of at most `run` metres: [{a:[x,z], b:[x,z], len}]
  const out = []; let acc = 0, cur = pts[0], target = run;
  for (let i = 1; i < pts.length; i++) {
    let a = pts[i - 1], b = pts[i]; const seg = Math.hypot(b[0] - a[0], b[1] - a[1]); let pos = 0;
    while (acc + (seg - pos) >= target - 1e-9 && seg > 0) { const f = (pos + (target - acc)) / seg, p = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]; out.push({ a: cur, b: p, len: Math.hypot(p[0] - cur[0], p[1] - cur[1]) }); cur = p; pos = f * seg; acc = 0; target = run; }
    acc += seg - pos;
  }
  const last = pts[pts.length - 1]; if (Math.hypot(last[0] - cur[0], last[1] - cur[1]) > 0.5) out.push({ a: cur, b: last, len: Math.hypot(last[0] - cur[0], last[1] - cur[1]) });
  return out;
}

export function buildWorks3D({ data, inputs, T, gaz, units = [], events = [] }) {
  const P = data.params, merged = mergeWorks(inputs.works, data), engine = makeStateEngine({ structures: inputs.structures, sched: inputs.sched, works: merged, hospitals: inputs.hospitals });
  const unitIds = new Set(units.map(u => u.id)), leafIds = units.filter(u => !(u.children && u.children.length)).map(u => u.id);
  // builder activity per unit from the layer's events (minutes): the latest enter/activity/leave at or before t says whether the unit is building
  const act = new Map(); for (const e of events) if (e.type === 'enter' || e.type === 'activity' || e.type === 'leave') (act.get(e.unit) || act.set(e.unit, []).get(e.unit)).push(e);
  for (const a of act.values()) a.sort((p, q) => p.t - q.t);
  const building = (uid, t) => { const a = act.get(uid); if (!a) return false; let st = null; for (const e of a) { if (e.t > t) break; st = e.type === 'leave' ? null : e.type === 'enter' ? 'stand' : e.activity; } return st === 'build_works'; };
  const S = new Map(inputs.structures.structures.map(s => [s.id, s]));
  const works = [], coverage = [], byId = new Map();
  const place = d => { const p = gaz.resolve(d.place); return p ? { name: p.name, lng: p.center.lng, lat: p.center.lat, sigma_m: p.sigma_m, tier: p.tier } : null; };

  for (const [id, d] of Object.entries(data.works)) {
    const w = merged.works[id], rec = S.get(id), pl = place(d);
    if (!w || !rec) { coverage.push({ id, decision: 'gap', reason: 'no work or structure record' }); continue; }
    if (!pl) { coverage.push({ id, decision: 'gap', reason: `place “${d.place}” is not in the gazetteer: no footprint, open gap` }); continue; }
    // ---- footprint
    const [cx, cz] = T.xz(pl.lng, pl.lat); let pts;
    const L = d.length_m, step = P.contour_step_m;
    if (d.after || d.before) {
      const ref = byId.get(d.after || d.before); if (!ref) throw new Error(`${id} is anchored to ${d.after || d.before}, which must be listed earlier`);
      const from = d.after ? ref.pts[ref.pts.length - 1] : ref.pts[0], dirRef = d.after ? [ref.pts[ref.pts.length - 1][0] - ref.pts[ref.pts.length - 2][0], ref.pts[ref.pts.length - 1][1] - ref.pts[ref.pts.length - 2][1]] : [ref.pts[0][0] - ref.pts[1][0], ref.pts[0][1] - ref.pts[1][1]];
      const dm = Math.hypot(dirRef[0], dirRef[1]) || 1; pts = traceContour(T, from[0], from[1], 1, L, step, [dirRef[0] / dm, dirRef[1] / dm]);
    } else {
      const [sx, sz] = walkGradient(T, cx, cz, d.uphill_m || 0, step), along = d.along_m || 0;
      let mid = [sx, sz]; if (along) { const tr = traceContour(T, sx, sz, along > 0 ? 1 : -1, Math.abs(along), step); mid = tr[tr.length - 1]; }
      const a = traceContour(T, mid[0], mid[1], 1, L / 2, step), b = traceContour(T, mid[0], mid[1], -1, L / 2, step);
      pts = [...b.slice(1).reverse(), ...a];
    }
    if (pts.length < 2) { coverage.push({ id, decision: 'gap', reason: 'the line left the loaded ground: no footprint' }); continue; }
    const runs = sliceRuns(pts, P.segment_run_m), segs = runs.map((r, i) => ({ i, a: r.a, b: r.b, len: r.len, ya: T.h(r.a[0], r.a[1]), yb: T.h(r.b[0], r.b[1]), off: unit(`${id}:off:${i}`) * P.offset_max_frac, seed: fnv(`${id}:seg:${i}`) % 1000003 }));
    const builders = [...(d.builders || []), ...((d.builder_prefixes || []).flatMap(pre => leafIds.filter(x => x.startsWith(pre))))], unknown = builders.filter(b => !unitIds.has(b));
    const o = { id, index: works.length, name: rec.name, kind: d.kind, place: pl, length_m: arcLen(pts), length_tier: d.length_tier, length_basis: d.length_basis, height_m: d.height_m, height_tier: d.height_tier, height_basis: d.height_basis, profile_tier: d.profile_tier, material: d.material,
      tier: rec.tier, footprint: { tier: 'plausible-procedural', basis: `${P.contour_basis}; anchored at ${pl.name} (sigma ${pl.sigma_m} m)`, sigma_m: pl.sigma_m }, pts, segs, builders, builderText: d.builder_text, unknownBuilders: unknown, alias: d.alias || [], damage: d.damage || null,
      builderKnown: w.builder_known !== false && builders.length > 0, scenarios: engine.scenariosFor(id), hasFinish: !!(w.finish && (w.finish.latest || w.finish.earliest)) };
    works.push(o); byId.set(id, o);
    coverage.push({ id, decision: 'drawn', reason: `construction states from the state engine; footprint plausible-procedural; profile ${d.profile_tier}`, aliases: o.alias });
  }
  // ---- what is not drawn, with a reason for every E, G and P record (nothing is dropped silently)
  const pre = [];
  for (const s of inputs.structures.structures) {
    if (/^E-\d\d$/.test(s.id) || /^G-\d\d$/.test(s.id)) {
      if (byId.has(s.id) || works.some(x => x.alias.includes(s.id))) { if (!byId.has(s.id)) coverage.push({ id: s.id, decision: 'drawn_as', reason: data.not_drawn[s.id] || 'drawn as its alias' }); continue; }
      const nd = data.not_drawn[s.id] || (s.emplacement_class && data.gun_emplacement_rule[s.emplacement_class]) || null;
      coverage.push({ id: s.id, decision: nd ? 'not_drawn' : 'unexplained', reason: nd || 'no reason recorded', class: s.emplacement_class || s.kind });
    } else if (s.kind === 'preexisting_wall_or_fence') {
      pre.push({ id: s.id, name: s.name, tier: s.tier, rec: s });
      coverage.push({ id: s.id, decision: 'pre_existing', reason: 'present from the first frame, never given a construction state (PDF B.7.3); no 1863 line is mapped, so only the 2D ring of the layer exists' });
    }
  }

  // ---- state of one work at a time
  const win = (w, sc) => {                                  // the instants the engine uses for a clock window (a mirror of state.mjs workState, for the segment mapping)
    const b = { ...w.begin }, f = { ...w.finish }, s = (w.scenarios || {})[sc];
    if (s) { if ('begin_earliest' in s) { b.earliest = s.begin_earliest; b.default = null; } if ('begin_latest' in s) b.latest = s.begin_latest; if ('begin_gran' in s) b.gran = s.begin_gran; if ('finish_earliest' in s) f.earliest = s.finish_earliest; if ('finish_latest' in s) f.latest = s.finish_latest; }
    const be = parseIso(b.earliest), bd = parseIso(b.default); let bl = parseIso(b.latest), fl = parseIso(f.latest); if (fl != null) fl = endOf(fl); if (bl != null && b.gran === 'date') bl = endOf(bl);
    const startClock = bd != null ? bd : (be != null && be === bl ? be : null), clock = b.gran === 'clock' && startClock != null && f.gran === 'clock' && fl != null && fl > startClock;
    return { startClock, finish: fl, clock, floor: be != null ? be : parseIso(b.date), latest: bl };
  };
  const scenarioOf = (o, choice) => { const c = choice && (choice[o.id] || o.alias.map(a => choice[a]).find(Boolean)); return c && o.scenarios.includes(c) ? c : 'default'; };
  function stateOf(o, tMin, choice) {
    const ms = msOfMin(tMin), sc = scenarioOf(o, choice), w = merged.works[o.id], r = engine.stateAt(o.id, ms, sc), W = win(w, sc), res = { work: r, scenario: sc, kind: 'absent', segs: [] }, hf = P.stage_height_frac;
    if (r.status === 'not_a_construction' || r.status === 'open_gap' || r.status === 'certain_before_documented_start' || r.present === false || (r.status === 'certain_by_window' && r.stage === 0)) return res;
    res.kind = r.status;
    let dmg = null; if (o.damage) { const da = parseIso(o.damage.begin), dl = parseIso(o.damage.finish_latest); if (ms >= da) dmg = Math.min(1, (ms - da) / (dl - da)); }
    const clockStatus = r.status === 'stage_split_plausible_procedural' || r.status === 'certain_by_window' || r.status === 'transitioning_derived_window' || r.status === 'inferred_damage_state_derived_window';
    for (const sg of o.segs) {
      let stage = null, frac = 0, flags = 0, resolved = false;
      if (W.clock && clockStatus) {
        resolved = true;
        if (ms >= W.finish) stage = 5; else { const st0 = W.startClock + sg.off * (W.finish - W.startClock), tq = ms <= st0 ? W.startClock - MIN : W.startClock + (ms - st0) / (W.finish - st0) * (W.finish - W.startClock); stage = Math.floor(engine.stateAt(o.id, tq, sc, sg.seed).stage ?? 0); }
        if (stage === 0) { res.segs.push(null); continue; }
        frac = hf[String(Math.min(5, stage))];
      } else if (r.status === 'indeterminate_window') { stage = 1; frac = hf['1']; flags |= FLAG.uncertain | FLAG.ghost; }
      else if (r.status === 'partial_window') { frac = hf.unresolved_in_progress; flags |= FLAG.uncertain; if (!o.hasFinish) flags |= FLAG.unfinished; }
      else if (r.status === 'after_documented_finish') { stage = 5; frac = hf['5']; }
      else { res.segs.push(null); continue; }
      if (dmg != null && (stage === 5 || stage === null || resolved)) { frac = hf['5'] + (hf['6'] - hf['5']) * dmg; stage = dmg >= 1 ? 6 : 5.5; flags |= FLAG.damaged; }
      if (resolved ? (stage >= 1 && stage <= 4) : (r.status === 'partial_window' && o.hasFinish)) flags |= FLAG.crewing;
      res.segs.push({ stage, h: frac * o.height_m, frac, flags, resolved });
    }
    return res;
  }
  const unitCrewBuilding = (o, tMin) => o.builders.filter(b => unitIds.has(b) && building(b, tMin));

  // ---- draw lists
  const nSegAll = works.reduce((s, o) => s + o.segs.length, 0), segBuf = new Float32Array(Math.max(1, nSegAll) * SEG_STRIDE), crewMax = works.reduce((s, o) => s + o.segs.length * P.crew_per_segment, 0), crewBuf = new Float32Array(Math.max(1, crewMax) * CREW_STRIDE);
  function at(tMin, choice = null) {
    let ns = 0, nc = 0, standIn = 0; const status = [];
    for (const o of works) {
      const st = stateOf(o, tMin, choice), tier = TIER_CODE[o.profile_tier] ?? 2, unitsBuilding = unitCrewBuilding(o, tMin);
      const cap = P.crew_cap && P.crew_cap[o.id] != null ? Math.floor(P.crew_cap[o.id] / o.segs.length) : P.crew_per_segment;
      let crewSegs = 0;
      o.segs.forEach((sg, k) => {
        const s = st.segs[k]; if (!s) return;
        const a = sg.a, b = sg.b, i = ns * SEG_STRIDE; segBuf[i] = o.index; segBuf[i + 1] = k; segBuf[i + 2] = a[0]; segBuf[i + 3] = a[1]; segBuf[i + 4] = b[0]; segBuf[i + 5] = b[1]; segBuf[i + 6] = s.h; segBuf[i + 7] = s.stage == null ? -1 : s.stage; segBuf[i + 8] = s.flags; segBuf[i + 9] = tier; segBuf[i + 10] = s.frac; segBuf[i + 11] = (s.flags & FLAG.crewing) ? (unitsBuilding.length ? 0 : cap) : 0; ns++;
        if ((s.flags & FLAG.crewing) && !unitsBuilding.length) {            // a labelled stand-in crew: the builder is unknown or its units are not building here now
          crewSegs++; const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1, nx = -dz / L, nz = dx / L, g = gradient(T, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2), side = (g[0] * nx + g[1] * nz) >= 0 ? 1 : -1;   // crew on the uphill (rear) side
          for (let c = 0; c < cap; c++) { const f = (c + 0.5) / cap, x = a[0] + dx * f + nx * side * 1.4, z = a[1] + dz * f + nz * side * 1.4, j = nc * CREW_STRIDE, h = Math.atan2(-(nx * -side), -(nz * -side)); const clip = s.stage === 1 ? 'stand' : s.stage === 2 ? 'chop_axe' : s.stage === 3 ? 'dig_shovel' : s.stage === 4 ? 'march_carry_rail' : ['chop_axe', 'dig_shovel', 'march_carry_rail'][fnv(`${o.id}:${k}:${c}`) % 3]; crewBuf[j] = x; crewBuf[j + 1] = z; crewBuf[j + 2] = h; crewBuf[j + 3] = o.index; crewBuf[j + 4] = k; crewBuf[j + 5] = CLIP[clip]; crewBuf[j + 6] = 1; crewBuf[j + 7] = 2; nc++; standIn++; }
        }
      });
      status.push({ id: o.id, kind: st.kind, scenario: st.scenario, crewSegments: crewSegs, unitsBuilding });
    }
    return { t: tMin, segs: segBuf.subarray(0, ns * SEG_STRIDE), crew: crewBuf.subarray(0, nc * CREW_STRIDE), counts: { segments: ns, standInCrew: standIn }, status, segStride: SEG_STRIDE, crewStride: CREW_STRIDE };
  }
  // the state of one work as data, for its card: tier of every part, the basis and the builder
  function describe(id, tMin, choice = null) {
    const o = byId.get(id); if (!o) return null; const st = stateOf(o, tMin, choice);
    return { id, name: o.name, kind: o.kind, place: o.place, footprint: o.footprint, length: { m: o.length_m, tier: o.length_tier, basis: o.length_basis }, height: { m: o.height_m, tier: o.height_tier, basis: o.height_basis }, profileTier: o.profile_tier, tier: o.tier, builders: o.builders, builderText: o.builderText,
      unitsBuilding: unitCrewBuilding(o, tMin), standIn: !o.builderKnown || !unitCrewBuilding(o, tMin).length, state: st.work, scenario: st.scenario, scenarios: o.scenarios, kindNow: st.kind, damage: o.damage, segments: o.segs.length, hasFinish: o.hasFinish };
  }
  // a triangle mesh of the visible segments (draped on the ground): vertices [x, y, z, nx, ny, nz, work, stage, frac, tier], stride 10, for a host that draws it with its own material
  function mesh(list) {
    const v = [], idx = [], tb = P.thickness_base_m / 2, tt = P.thickness_top_m / 2;
    for (let s = 0; s < list.segs.length; s += SEG_STRIDE) {
      const S = list.segs, h = S[s + 6]; if (h < 0.02) continue; const ax = S[s + 2], az = S[s + 3], bx = S[s + 4], bz = S[s + 5], len = Math.hypot(bx - ax, bz - az); if (len < 0.1) continue;
      const nSt = Math.max(1, Math.ceil(len / 4)), dx = (bx - ax) / len, dz = (bz - az) / len, nx = -dz, nz = dx; let prev = -1;
      for (let k = 0; k <= nSt; k++) {
        const f = k / nSt, x = ax + (bx - ax) * f, z = az + (bz - az) * f, y = T.h(x, z), base = v.length / 10, ow = S[s], st = S[s + 7], fr = S[s + 10], tr = S[s + 9];
        const row = [[-tb, 0, -0.7, 0.7], [-tt, h, -0.7, 0.7], [tt, h, 0.7, 0.7], [tb, 0, 0.7, 0.7]];
        for (const [lat, up, nlat, nup] of row) v.push(x + nx * lat, y + up, z + nz * lat, nx * nlat, nup, nz * nlat, ow, st, fr, tr);
        if (prev >= 0) for (let q = 0; q < 3; q++) { const a0 = prev + q, a1 = prev + q + 1, b0 = base + q, b1 = base + q + 1; idx.push(a0, b0, a1, a1, b0, b1); }
        prev = base;
      }
    }
    return { verts: new Float32Array(v), idx: new Uint32Array(idx), stride: 10 };
  }
  const preexisting = () => pre.map(p => ({ id: p.id, name: p.name, tier: p.tier, present: true, construction: false, progress: 1 }));
  return { works, byId, at, describe, mesh, coverage, preexisting, engine, merged, win, stateOf, SEG_STRIDE, CREW_STRIDE };
}
export const isoMin = tMin => isoOf(msOfMin(tMin));

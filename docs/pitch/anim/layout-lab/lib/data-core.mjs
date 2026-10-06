// layout-lab/lib/data-core.mjs  (pure: no node imports, runs in node and in the browser; data.mjs is the node wrapper)
// Loads the REAL placement + order-of-battle data of the site (baseline/dist/data, read-only) and exposes
//   * units      : Map(unit_id -> Unit)  (side, arm, echelon, parent chain, short code, label, keyframes)
//   * visibleAt  : the set of units on the field at a (fractional) tick, with interpolated position/strength
// The loading rules replicate the shipped bundle where it is documented there (baseline/dist/assets/index-Cg8FAMXN.js):
//   - the placement rows of a day are the concatenation of placements_* then density_* in the order listed in the bundle (tF / nF),
//     the LAST row for a (unit, tick) wins (the bundle's y1() writes rows in that order into a map),
//   - a unit is on the field from its first keyframe onward and keeps its last position (carry-forward; the bundle's i2 cache),
//   - side = id prefix "U-" / "C-" (the bundle's lS()).  This lab ALSO computes a corrected side from the OOB files and flags
//     the ids where the two disagree (see sideFlag), because "side" is vital information.
// Nothing here modifies any product file.

// ---- load order exactly as listed in the bundle (tF = placements, nF = density, per day) -----------------------------
export const TF = {
  1: ['placements_day1_ticks1_50.json', 'placements_day1_ticks51_100.json', 'placements_day1_ticks101_225.json'],
  2: ['placements_day2_ticks226_300.json', 'placements_day2_ticks301_375.json', 'placements_day2_ticks376_450.json'],
  3: ['placements_day3_ticks451_520.json', 'placements_day3_ticks521_600.json', 'placements_day3_ticks601_675.json'],
};
export const NF = {
  1: ['density_day1_ticks1_50.json', 'density_day1_ticks51_100.json', 'density_day1_afternoon.json', 'density_artillery_positions.json', 'density_cavalry_detail.json', 'density_skirmishers.json', 'density_day1_lateafternoon.json', 'density_day1_seminary.json', 'density_day1_opening.json', 'density_day1_iverson.json', 'density_day1_railroadcut.json', 'density_day1_barlowsknoll.json', 'density_day1_ironbrigade.json'],
  2: ['density_day2_lrt.json', 'density_day2_wheatfield.json', 'density_day2_culpshill.json', 'density_day2_overnight.json', 'density_reserves.json', 'density_day2_morning.json', 'density_day2_afternoon.json', 'density_day2_bigelow.json', 'density_day2_culpshill_overnight.json', 'density_day2_cemhill.json', 'density_day2_wright.json', 'density_day2_kershaw.json', 'density_day2_15alabama.json', 'density_day2_devilsden.json'],
  3: ['density_day3_picketts_charge.json', 'density_day3_culpshill.json', 'density_day3_aftermath.json', 'density_day3_cannonade.json', 'density_day3_pettigrew.json', 'density_day3_retreat.json', 'density_day3_morning.json', 'density_day3_cavalry.json', 'density_day3_angle.json', 'density_day3_vermont.json', 'density_day3_hancock.json'],
};
// NOTE: the bundle loads day 1 first, then day 2 and day 3 lazily; rows are keyed per tick, so the cross-day order is irrelevant
// (a tick belongs to exactly one day) -- but the order inside one day matters for duplicate (unit, tick) rows.

export const OOB_FILES = [
  ['union', 'oob/union_oob_corps_division.json'], ['union', 'oob/union_oob_brigades.json'],
  ['union', 'oob/union_regiments_i_ii_corps.json'], ['union', 'oob/union_regiments_iii_v_corps.json'], ['union', 'oob/union_regiments_vi_xi_xii_corps.json'],
  ['union', 'oob/union_cavalry_artillery.json'], ['union', 'oob/union_artillery.json'],
  ['confederate', 'oob/confederate_oob_corps_div_bde.json'], ['confederate', 'oob/confederate_regiments_first_corps.json'],
  ['confederate', 'oob/confederate_regiments_second_corps.json'], ['confederate', 'oob/confederate_regiments_third_corps.json'],
  ['confederate', 'oob/confederate_cavalry.json'], ['confederate', 'oob/confederate_artillery.json'],
];


// ---- order of battle registry -----------------------------------------------------------------------------------------
// echelon levels (1 = smallest drawn tile)  regiment/battery 1, brigade/battalion 2, division 3, corps 4, army 5
export const ECHELON = { regiment: 1, battery: 1, brigade: 2, battalion: 2, division: 3, corps: 4, army: 5 };

function buildOob(readJson) {
  const reg = new Map(); // id -> { id, kind, side, designation, strength, parent, file }
  const put = (e) => { if (!reg.has(e.id)) reg.set(e.id, e); };
  for (const [side, rel] of OOB_FILES) {
    const d = readJson(rel);
    for (const c of d.corps || []) put({ id: c.corps_id, kind: 'corps', side, designation: c.designation, strength: c.strength, parent: null, file: rel });
    for (const v of d.divisions || []) put({ id: v.division_id, kind: 'division', side, designation: v.designation, strength: v.strength, parent: v.parent_corps_id || null, file: rel });
    for (const b of d.brigades || []) {
      // Union cavalry brigades live in the regiments file as parents only; confederate_cavalry has a brigades[] list
      if (b.brigade_id) put({ id: b.brigade_id, kind: 'brigade', side, designation: b.designation, strength: b.strength, parent: b.parent_division_id || b.parent_corps_id || null, file: rel });
    }
    for (const r of d.regiments || []) put({ id: r.regiment_id, kind: 'regiment', side, designation: r.designation, strength: r.strength, parent: r.parent_brigade_id || null, parentCorps: r.parent_corps_id || null, file: rel });
    for (const r of d.cavalry_regiments || []) put({ id: r.regiment_id, kind: 'regiment', side, designation: r.designation, strength: r.strength, parent: r.parent_brigade_id || null, file: rel });
    for (const h of d.horse_artillery || []) put({ id: h.battery_id, kind: 'battery', side, designation: h.designation, strength: h.strength, parent: h.division_attached || null, file: rel });
    // artillery
    for (const k of ['first_corps_artillery', 'second_corps_artillery', 'third_corps_artillery']) {
      const corpsId = { first_corps_artillery: 'C-I', second_corps_artillery: 'C-II', third_corps_artillery: 'C-III' }[k];
      for (const bn of d[k]?.battalions || []) {
        put({ id: bn.battalion_id, kind: 'battalion', side, designation: bn.designation, strength: null, parent: corpsId, file: rel });
        for (const bt of bn.batteries || []) put({ id: bt.battery_id, kind: 'battery', side, designation: bt.designation, strength: bt.strength, parent: bn.battalion_id, file: rel });
      }
    }
    for (const b of d.artillery_reserve?.brigades || []) {
      put({ id: b.brigade_id, kind: 'brigade', side, designation: b.designation, strength: null, parent: null, file: rel });
      for (const bt of b.batteries || []) put({ id: bt.battery_id, kind: 'battery', side, designation: bt.designation, strength: bt.strength, parent: b.brigade_id, file: rel });
    }
    for (const b of d.corps_artillery_brigades || []) {
      put({ id: b.brigade_id, kind: 'brigade', side, designation: b.designation, strength: null, parent: b.corps || null, file: rel });
      for (const bt of b.batteries || []) put({ id: bt.battery_id, kind: 'battery', side, designation: bt.designation, strength: bt.strength, parent: b.brigade_id, file: rel });
    }
  }
  return reg;
}

// ---- placement rows -------------------------------------------------------------------------------------------------
function loadRows(readJson) {
  const rows = []; let order = 0;
  for (const day of [1, 2, 3]) {
    for (const f of [...TF[day], ...NF[day]]) {
      const d = readJson(f);
      for (const p of d.placements || []) rows.push({ ...p, _order: order++, _file: f });
    }
  }
  return rows;
}

// Confederate-only / Union-only state suffixes, derived from the OOB registry (not assumed)
function suffixOf(id) { const m = /^[UC]-\d+([A-Z]{2,3})(?:-|$)/.exec(id); return m ? m[1] : null; }

const ARM_OF = (id, kind) => (/(^|-)(ART|HAB)(-|$)/.test(id) || kind === 'battery' || kind === 'battalion') ? 'artillery' : (/(^|-)CAV(-|$)/.test(id) ? 'cavalry' : 'infantry');

const ORD = { First: '1st', Second: '2nd', Third: '3rd', Fourth: '4th', Fifth: '5th', Sixth: '6th', Seventh: '7th', Eighth: '8th', Ninth: '9th', Tenth: '10th', Eleventh: '11th', Twelfth: '12th' };
/** designation -> compact label ("Second Brigade, Third Division, First Corps" -> "2nd Bde, 3rd Div, 1st Corps"); lab-only, the product owns the real wording */
function abbreviate(des) {
  let s = des.replace(/\s*\(.*?\)\s*/g, ' ').trim();
  s = s.replace(/\b(First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleventh|Twelfth)\b/g, (w) => ORD[w]);
  s = s.replace(/\bBrigade\b/g, 'Bde').replace(/\bDivision\b/g, 'Div').replace(/\bVolunteers?\b ?/g, '').replace(/\bVolunteer Infantry\b/g, 'Infantry').replace(/\bRegiment\b/g, 'Reg.');
  return s.replace(/\s+/g, ' ').trim();
}

/** short code (the vital "short name" that lives INSIDE the core chip) and long label (secondary, may collapse) */
function names(id, reg) {
  const e = reg.get(id);
  const bare = id.replace(/^[UC]-/, '');
  let short; let label;
  let m;
  if ((m = /^(\d+)([A-Z]{2,3})(?:-([A-Z0-9]+))?$/.exec(bare))) { short = `${m[1]} ${m[2]}`; }
  else if ((m = /^(?:ART|HAB)-(\d*[A-Z]*\d*[A-Z]*)$/.exec(bare)) && m[1].length <= 8) { short = m[1]; }
  else if (/^(?:ART|HAB)-/.test(bare)) { short = bare.replace(/^(?:ART|HAB)-/, '').slice(0, 8); }
  else short = bare.replace(/-/g, '/').slice(0, 9);
  if (e && e.designation) {
    label = abbreviate(e.designation);
    const nick = /\(([^)]+)\)/.exec(e.designation);
    if ((e.kind === 'brigade' || e.kind === 'battalion') && nick && nick[1].length <= 16) label = nick[1];
    if (label.length > 24) label = label.slice(0, 23) + '…';
  } else label = short;
  return { short, label };
}

export function buildAll(readJson) {
  const reg = buildOob(readJson);
  const rows = loadRows(readJson);
  // duplicates: last row in load order wins (bundle semantics); remember conflicts
  const byKey = new Map(); const conflicts = [];
  for (const r of rows) {
    const k = r.unit_id + '@' + r.tick;
    const prev = byKey.get(k);
    if (prev) {
      const dist = Math.hypot((prev.lat - r.lat) * 111195, (prev.lng - r.lng) * 111195 * Math.cos(r.lat * Math.PI / 180));
      if (dist > 0.5 || prev.strength !== r.strength || prev.disposition !== r.disposition) conflicts.push({ unit: r.unit_id, tick: r.tick, metres: +dist.toFixed(1), a: prev._file, b: r._file });
    }
    byKey.set(k, r);
  }
  const kept = [...byKey.values()];
  const perUnit = new Map();
  for (const r of kept) { if (!perUnit.has(r.unit_id)) perUnit.set(r.unit_id, []); perUnit.get(r.unit_id).push(r); }

  // suffix -> sides in the registry
  const sufSides = new Map();
  for (const e of reg.values()) { const s = suffixOf(e.id); if (!s) continue; if (!sufSides.has(s)) sufSides.set(s, new Set()); sufSides.get(s).add(e.side); }

  const units = new Map();
  for (const [id, kfs] of perUnit) {
    kfs.sort((a, b) => a.tick - b.tick || a._order - b._order);
    const e = reg.get(id) || null;
    const prefixSide = id.startsWith('U-') ? 'union' : 'confederate';
    let side = prefixSide; let sideFlag = null;
    if (e && e.side !== prefixSide) { side = e.side; sideFlag = 'oob-disagrees-with-prefix'; }
    else if (!e) {
      const s = suffixOf(id);
      const ss = s && sufSides.get(s);
      if (ss && ss.size === 1 && !ss.has(prefixSide)) { side = [...ss][0]; sideFlag = 'state-suffix-only-seen-on-other-side'; }
    }
    const kind = e ? e.kind : (/^[UC]-[IVX]+$/.test(id) ? 'corps' : /^[UC]-[IVX]+-\d+$/.test(id) || /^[UC]-\d-[IVX]+$/.test(id) ? 'division' : /^[UC]-[IVX]+-\d+-\d+$/.test(id) || /^[UC]-(CAV|ART)/.test(id) && /-\d(-\d)?$/.test(id) ? 'brigade' : 'regiment');
    const arm = ARM_OF(id, kind);
    const nm = names(id, reg);
    const maxStr = Math.max(...kfs.map((k) => k.strength || 0), e?.strength || 0) || 1;
    units.set(id, {
      id, side, prefixSide, sideFlag, kind, echelon: ECHELON[kind] || 1, arm, inOob: !!e, parentOob: e ? e.parent : null,
      designation: e ? e.designation : null, short: nm.short, label: nm.label, strengthRef: maxStr, kfs,
    });
  }

  // parent resolution -------------------------------------------------------------------------------------------------
  // 1. OOB parent chain; 2. documented id-pattern fallback (flagged parentSource='idpattern'); 3. side bucket (parentSource='none')
  const nodes = new Map(); // id -> { id, side, kind, parent, depth }
  const ensure = (id, side, kind) => { if (!nodes.has(id)) nodes.set(id, { id, side, kind, parent: null, source: 'oob' }); return nodes.get(id); };
  const armyId = { union: 'A-U', confederate: 'A-C' };
  ensure('ROOT', null, 'root');
  for (const s of ['union', 'confederate']) { const n = ensure(armyId[s], s, 'army'); n.parent = 'ROOT'; }
  for (const e of reg.values()) {
    const n = ensure(e.id, e.side, e.kind); n.parent = e.parent; n.designation = e.designation;
  }
  for (const n of [...nodes.values()]) { if (n.kind === 'corps') n.parent = armyId[n.side]; }
  const patternParent = (id, side) => {
    let m;
    if ((m = /^([UC])-([IVX]+)-(\d+)-\d+/.exec(id))) return { p: `${m[1]}-${m[2]}-${m[3]}`, why: 'idpattern' };
    if ((m = /^([UC])-([IVX]+)-(\d+)$/.exec(id))) return { p: `${m[1]}-${m[2]}`, why: 'idpattern' };
    if ((m = /^([UC])-ART-([IVX]+)-\d+$/.exec(id))) return { p: `${m[1]}-${m[2]}`, why: 'idpattern' };
    return null;
  };
  for (const u of units.values()) {
    const n = ensure(u.id, u.side, u.kind);
    if (u.inOob) { u.parentSource = 'oob'; if (!n.parent) n.parent = armyId[u.side]; }
    else {
      const pp = patternParent(u.id, u.side);
      if (pp) { n.parent = pp.p; u.parentSource = 'idpattern'; } else { n.parent = armyId[u.side]; u.parentSource = 'none'; }
    }
    n.side = u.side; n.kind = u.kind;
  }
  // make every referenced parent exist, chaining unknown ones to the army
  for (let guard = 0; guard < 8; guard++) {
    for (const n of [...nodes.values()]) {
      if (n.id === 'ROOT') continue;
      if (!n.parent) n.parent = armyId[n.side] || 'ROOT';
      if (!nodes.has(n.parent)) {
        const pn = ensure(n.parent, n.side, n.parent.split('-').length === 2 ? 'corps' : n.parent.split('-').length === 3 ? 'division' : 'brigade');
        pn.virtual = true;
        pn.parent = patternParent(n.parent, n.side)?.p || armyId[n.side] || 'ROOT';
      }
    }
  }
  // cycle guard + depth
  const depth = (id, seen = new Set()) => { if (id === 'ROOT') return 0; if (seen.has(id)) return 99; seen.add(id); return 1 + depth(nodes.get(id).parent, seen); };
  for (const n of nodes.values()) n.depth = depth(n.id);
  const chain = (id) => { const out = []; let c = id; const seen = new Set(); while (c && !seen.has(c)) { seen.add(c); out.push(c); if (c === 'ROOT') break; c = nodes.get(c).parent; } return out; };
  for (const u of units.values()) { u.chain = chain(u.id); u.depth = nodes.get(u.id).depth; }

  return { units, nodes, reg, conflicts, rows: rows.length, kept: kept.length, chain, armyId };
}

// ---- time model --------------------------------------------------------------------------------------------------------
const smooth = (s) => s * s * (3 - 2 * s);
const easeFor = (disp) => (disp === 'Charging Line' ? (c) => c * c : disp === 'Chaotic Retreat' ? (c) => 1 - (1 - c) * (1 - c) : disp === 'Line of March' ? (c) => c : (c) => (c < 0.5 ? 2 * c * c : 1 - Math.pow(-2 * c + 2, 2) / 2));

/** position/strength of unit u at fractional tick tau; null before its first keyframe.
 *  mode 'smooth' (default, owner decision 5: continuous interpolation between consecutive keyframes of the unit, eased),
 *  mode 'hold'   (the shipped behaviour for contrast: hold the last keyframe, blend only inside the last tick). */
export function stateAt(u, tau, mode = 'smooth') {
  const k = u.kfs; const n = k.length;
  if (tau < k[0].tick) return null;
  if (tau >= k[n - 1].tick) { const r = k[n - 1]; return { lat: r.lat, lng: r.lng, strength: r.strength, bearing: r.bearing, disposition: r.disposition, moving: false, segment: n - 1 }; }
  // binary search for last keyframe with tick <= tau
  let lo = 0; let hi = n - 1;
  while (lo + 1 < hi) { const mid = (lo + hi) >> 1; if (k[mid].tick <= tau) lo = mid; else hi = mid; }
  const a = k[lo]; const b = k[lo + 1];
  if (mode === 'hold') {                                    // the shipped y1()/F4(): hold the last keyframe, blend only between keyframes of ADJACENT ticks
    const f = Math.floor(tau); const frac = tau - f;
    let i = lo; while (i > 0 && k[i].tick > f) i--;
    const cur = k[i]; const nxt = k[i + 1];
    if (cur.tick === f && nxt && nxt.tick === f + 1 && frac > 0) {
      const eased = easeFor(nxt.disposition !== cur.disposition ? nxt.disposition : cur.disposition)(frac);
      return { lat: cur.lat + (nxt.lat - cur.lat) * eased, lng: cur.lng + (nxt.lng - cur.lng) * eased, strength: Math.round(cur.strength + (nxt.strength - cur.strength) * frac), bearing: cur.bearing, disposition: cur.disposition, moving: true, segment: i };
    }
    return { lat: cur.lat, lng: cur.lng, strength: cur.strength, bearing: cur.bearing, disposition: cur.disposition, moving: false, segment: i };
  }
  const span = b.tick - a.tick;
  const s = smooth((tau - a.tick) / span);
  const moving = Math.abs(a.lat - b.lat) + Math.abs(a.lng - b.lng) > 1e-7;
  return {
    lat: a.lat + (b.lat - a.lat) * s, lng: a.lng + (b.lng - a.lng) * s,
    strength: Math.round(a.strength + (b.strength - a.strength) * ((tau - a.tick) / span)),
    bearing: a.bearing, disposition: tau - a.tick < span / 2 ? a.disposition : b.disposition, moving, segment: lo,
  };
}

/** units on the field at tau. opts.window: if set, a unit disappears when tau - lastKeyframeTick > window (sensitivity run);
 *  default = the bundle's unbounded carry-forward. */
export function visibleAt(all, tau, opts = {}) {
  const out = [];
  for (const u of all.units.values()) {
    if (opts.window != null) { const last = u.kfs[u.kfs.length - 1].tick; if (tau - last > opts.window) continue; }
    const st = stateAt(u, tau, opts.mode || 'smooth');
    if (st) out.push({ u, st });
  }
  return out;
}

// ---- projection (Mapbox GL: 512 px tiles) ----------------------------------------------------------------------------
export const WORLD0 = 512;
export function project(lng, lat, z) {
  const s = WORLD0 * 2 ** z;
  const x = (lng + 180) / 360 * s;
  const sin = Math.sin(lat * Math.PI / 180);
  const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * s;
  return [x, y];
}
export const metresPerPx = (lat, z) => 40075016.686 * Math.cos(lat * Math.PI / 180) / (WORLD0 * 2 ** z);

/** every data file the loader reads (relative to the data directory) - used by the browser lab to prefetch them */
export const ALL_FILES = [...[1, 2, 3].flatMap((d) => [...TF[d], ...NF[d]]), ...OOB_FILES.map((x) => x[1])];

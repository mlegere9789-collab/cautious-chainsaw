// host/dataset.mjs - builds the engine's dataset (units with keyframes, the order-of-battle hierarchy, names) at RUNTIME from the data the app itself has loaded:
//   * the placement rows: the store's placementsByTick (the app's own merge; whatever the data holds is what is drawn, so a corrected data file reaches the engine with no change here)
//   * the order-of-battle files: handed over by the one hook in the app's loader (GTANIM.oobFiles), so the hierarchy, designations and battalions are the order of battle's own.
// The rules (side from the order of battle with a flag where it disagrees with the id prefix, kind, arm, short code, label, id-pattern parents flagged as such) are those of the
// loader the look was designed on (docs/pitch/anim2/release-look/data/loader.mjs); nothing is invented: a unit with no order-of-battle entry carries inOob=false and the id-pattern parent
// is the CORPS only when the id itself names it (the pattern parent of C-III-4 is the corps C-III; the engine never prints a division or brigade the order of battle does not have).
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

/** the rows of the store's placementsByTick in tick order (one record per unit and tick as the app merged them) */
function rowsOf(pbt) {
  const rows = []; let order = 0; const ticks = Object.keys(pbt || {}).map(Number).filter((t) => t >= 1).sort((a, b) => a - b);
  for (const t of ticks) { const a = pbt[t]; if (!a) continue; for (const p of a) if (p && p.unit_id && isFinite(p.lat) && isFinite(p.lng)) rows.push({ ...p, tick: +(p.tick ?? t), _order: order++ }); }
  return rows;
}

export function buildAll(readJson, pbt) {
  const reg = buildOob(readJson);
  const rows = rowsOf(pbt);
  // duplicates: last row in load order wins (bundle semantics); remember conflicts
  const byKey = new Map(); const conflicts = [];
  for (const r of rows) {
    const k = r.unit_id + '@' + r.tick;
    const prev = byKey.get(k);
    if (prev) {
      const dist = Math.hypot((prev.lat - r.lat) * 111195, (prev.lng - r.lng) * 111195 * Math.cos(r.lat * Math.PI / 180));
      if (dist > 0.5 || prev.strength !== r.strength || prev.disposition !== r.disposition) conflicts.push({ unit: r.unit_id, tick: r.tick, metres: +dist.toFixed(1) });
    }
    r._order0 = prev ? prev._order0 : r._order;                 // first row of the (unit, tick) key in load order: the shipped cache inserts a unit when it first sees one of its rows
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

  // snapshot index for visibility rule B (latest keyframe snapshot): populated tick -> [{ u, idx }]
  const snap = new Map();
  for (const u of units.values()) u.kfs.forEach((r, idx) => { let a = snap.get(r.tick); if (!a) snap.set(r.tick, a = []); a.push({ u, idx }); });
  const snapTicks = [...snap.keys()].sort((a, b) => a - b);
  return { units, nodes, reg, conflicts, rows: rows.length, kept: kept.length, chain, armyId, snap, snapTicks };
}


/** the dataset createBattle() reads, from the rows and the order-of-battle files (readJson(rel) -> the parsed file or undefined) */
export function buildDataset(readJson, pbt) {
  const all = buildAll((rel) => readJson(rel) || {}, pbt);
  const dispositions = []; const dIdx = (d) => { let i = dispositions.indexOf(d); if (i < 0) { i = dispositions.length; dispositions.push(d); } return i; };
  const notes = []; const nIdx = new Map(); const noteIdx = (s) => { if (!s) return -1; let i = nIdx.get(s); if (i === undefined) { i = notes.length; notes.push(s); nIdx.set(s, i); } return i; };
  const units = [];
  for (const id of [...all.units.keys()].sort()) {
    const u = all.units.get(id);
    units.push({ id, side: u.sideFlag ? 'unknown' : u.side, prefixSide: u.prefixSide, sideGuess: u.sideFlag ? u.side : null, sideFlag: u.sideFlag, kind: u.kind, arm: u.arm, inOob: u.inOob, parentSource: u.parentSource,
      short: u.short, label: u.label, designation: u.designation, strengthRef: u.strengthRef, parent: u.chain[1] ?? null,
      rows: u.kfs, kf: u.kfs.map((k) => [k.tick, +k.lat, +k.lng, k.strength || 0, k.bearing || 0, dIdx(k.disposition), noteIdx(k.notes)]) });
  }
  const nodes = [...all.nodes.values()].filter((n) => n.id !== 'ROOT').map((n) => ({ id: n.id, side: n.side, kind: n.kind, parent: n.parent, designation: n.designation || null, virtual: !!n.virtual }));
  return { dispositions, notes, units, nodes, counts: { units: units.length, rows: all.rows, kept: all.kept, conflicts: all.conflicts.length } };
}

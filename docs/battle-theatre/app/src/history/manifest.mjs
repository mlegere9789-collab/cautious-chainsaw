// Per-figure kit manifests (PDF B.6.12). A LINE-FOR-LINE PORT of manifest_for and its helpers in tools/bt/check_kit.py (which stays the reference and the validator): the same integer mixing
// (sim/rng.mjs = the Python port), the same draws in the same order, so a manifest made here is bit-identical to the one Python makes for the same (soldier id, unit, seed, date, rank, role, variant).
// tests/manifest.test.mjs compares both on golden cases. The B.6.12 validator itself is NOT ported: tools/bt/check_figures.py runs it, in Python, over
// the figures the shell actually draws (the exported list).
// Determinism: Math.imul / >>> 0 only, no clock, no Math.random.
import { hash4, rand, strId } from '../../../sim/rng.mjs';

export const ENLISTED = ['private', 'corporal', 'sergeant', 'first sergeant'];
export const OFFICERS = ['lieutenant', 'captain', 'field officer', 'general'];
const LONG_ARM_BRANCHES = ['infantry', 'sharpshooter', 'cavalry', 'provost', 'pioneer'];
const SWORD_IDS = ['m1850_foot_officer_sword', 'm1840_nco_sword', 'm1860_light_cav_saber', 'm1840_heavy_saber'];
export const FIELD_ORDER = ['headgear', 'coat', 'shirt', 'trousers', 'shoes', 'accoutrements', 'weapon', 'bayonet', 'sidearm_sword', 'sash', 'pack_state', 'badge', 'flag_or_instrument'];
const OFFICER_FIELDS = ['coat', 'headgear', 'trousers', 'shirt', 'accoutrements', 'sidearm_sword', 'sash'];
const COMPONENT_PROB_DIVISOR = 6.0;
const WEAPON_TAGS = { spencer_repeater: ['spencer'], henry_rifle: ['henry'], m1863_rifle_musket: ['m1863'], whitworth_rifle: ['whitworth'] };
const BATTLE_WEAPON_KINDS = ['long_arm', 'carbine', 'repeater'];
const TIER_RANK = { documented: 3, inferred: 2, 'plausible-procedural': 1, gap: 0 };
const has = (o, k) => o != null && Object.prototype.hasOwnProperty.call(o, k);
const truthy = v => !(v === undefined || v === null || v === false || v === 0 || v === '');
const pyRound6 = x => { const y = x * 1e6, f = Math.floor(y), d = y - f; const m = d === 0.5 ? (f % 2 === 0 ? f : f + 1) : Math.round(y); return m / 1e6; };      // Python round(x, 6): ties to even
export const soldierSeed = (projectSeed, soldierId) => hash4(projectSeed >>> 0, strId(soldierId), 0, 0);
// the wear level of a soldier's manifest (an inferred tuning parameter: no source quantifies soiling); manifestFor stores it, the shell reads it for the renderer's variation scalar without building the rest
export const wearLevel = seed => pyRound6(rand(seed, 99, 0, 1));

// ---- the kit data: kit_specs.json + artillery_batteries.json + cavalry_units.json (units), weapons.json (weapons); plus, optionally, synthetic default units (see defaultUnitId)
export class Kit {
  constructor({ specs, weapons, artillery, cavalry }) {
    this.ks = specs; this.units = {};
    for (const src of [specs.units, artillery ? artillery.units : {}, cavalry ? cavalry.units : {}]) for (const [k, v] of Object.entries(src)) { if (has(this.units, k)) throw new Error('duplicate unit id ' + k); this.units[k] = v; }
    this.defaults = specs.defaults; this.items = specs.items; this.weapons = weapons ? weapons.weapons : {};
    // a unit with no record of its own is drawn from the default of its army and arm: a synthetic unit that inherits it (tier of every field is the default's)
    for (const side of ['union', 'confederate']) for (const arm of ['infantry', 'artillery', 'cavalry']) {
      const id = `DEFAULT.${side}.${arm}`; if (has(this.defaults, `default.${side}.${arm}`)) this.units[id] = { id, name: `default for ${side} ${arm}`, army: side, scope: 'default', branch: arm, group: 'default', corps: null, division: null, brigade: null, presence: { status: 'present_at_gettysburg' }, inherits: `default.${side}.${arm}`, fields: {}, dispute_ids: [] };
    }
  }
  cat(iid) {
    if (has(this.items, iid)) { const it = this.items[iid]; return { id: iid, kind: it.kind, army: it.army, tags: it.tags || [], barred: !!it.barred }; }
    if (has(this.weapons, iid)) { const w = this.weapons[iid], cat = w.category; return { id: iid, kind: BATTLE_WEAPON_KINDS.includes(cat) ? 'weapon' : cat === 'bayonet' ? 'bayonet' : 'sidearm', category: cat, army: w.army, tags: WEAPON_TAGS[iid] || [], barred: !!w.barred }; }
    return null;
  }
  chain(unitId) { const u = this.units[unitId], out = [u]; let nxt = u.inherits, guard = 0; while (nxt) { const d = this.defaults[nxt]; out.push(d); nxt = d.inherits; if (++guard >= 10) throw new Error('inherits chain too long'); } return out; }
  officerDefault(army) { return this.defaults[`default.${army}.officers`]; }
}
export const defaultUnitId = (side, arm) => `DEFAULT.${side}.${arm}`;

function validEntry(e, date, kit) {
  const c = kit.cat(e.item); if (c === null || c.barred) return false;
  if (e.valid_from && date < e.valid_from) return false;
  if (e.valid_to && date > e.valid_to) return false;
  if (e.only_on && date !== e.only_on) return false;
  return true;
}
// nearest definition of a field in the chain (unit variant > unit > defaults), honouring date_fallback; officers use the officer default unless the unit's definition is unit_wide
function resolveField(kit, unitId, field, date, variant, rank, sv) {
  const u = kit.units[unitId], chain = kit.chain(unitId), isOff = OFFICERS.includes(rank), svs = u.soldier_variants || [];
  if (sv) for (const v of svs) if (v.id === sv && has(v.fields || {}, field)) { const spec = v.fields[field], ents = spec.allowed.filter(e => validEntry(e, date, kit)); if (ents.length) return [spec, ents, unitId + '@' + sv]; }
  let specs = [];
  if (variant && u.variants && has(u.variants, variant) && has(u.variants[variant].fields, field)) specs.push([u.variants[variant].fields[field], unitId + '#' + variant]);
  for (const node of chain) if (has(node.fields || {}, field)) specs.push([node.fields[field], node.id]);
  if (isOff && OFFICER_FIELDS.includes(field)) {
    const od = kit.officerDefault(u.army);
    if (has(od.fields, field)) { const unitwide = specs.filter(([s]) => truthy(s.unit_wide)); if (!unitwide.length) specs = [[od.fields[field], od.id], ...specs]; }
  }
  let extras = [];
  if (!sv) for (const v of svs) if (has(v.fields || {}, field)) extras = extras.concat(v.fields[field].allowed.filter(e => validEntry(e, date, kit)));
  for (const [spec, owner] of specs) {
    const ents = spec.allowed.filter(e => validEntry(e, date, kit));
    if (ents.length) return [spec, ents.concat(extras), owner];
    if (spec.date_fallback === 'inherit_default') continue;
    return [spec, [].concat(extras), owner];
  }
  if (extras.length) { const withField = svs.filter(v => has(v.fields || {}, field)); return [svs[0].fields[field] || withField[0].fields[field], extras, unitId + '@soldier_variants']; }
  return [null, [], null];
}
const hasTag = (kit, iid, tag) => { const c = kit.cat(iid); return !!c && c.tags.includes(tag); };
function rankAllowsItem(kit, iid, rank, unit) {
  const c = kit.cat(iid); if (!c) return false; if (OFFICERS.includes(rank)) return true;
  const tags = c.tags; if (tags.includes('officer_only')) return false;
  if (tags.includes('sash') && !tags.includes('zouave')) return (rank === 'sergeant' || rank === 'first sergeant') && ['sash_red_artillery', 'sash_yellow_cavalry', 'sash_red_cs'].includes(iid);
  if (SWORD_IDS.includes(iid) && unit.branch !== 'cavalry') return false;
  return true;
}
// resolve a field for a (unit, date, rank, variant, soldier variant) once: the spec, its owner and the entries that survive the rank, pile and kepi rules. Same code as the Python loop body, run once per key.
function fieldPlan(kit, unitId, u, field, date, variant, rank, sv, army) {
  const key = `${unitId}|${field}|${date}|${variant}|${rank}|${sv}`; kit._fp = kit._fp || new Map(); if (kit._fp.has(key)) return kit._fp.get(key);
  const [spec, ents, owner] = resolveField(kit, unitId, field, date, variant, rank, sv); let res = null;
  if (spec !== null) {
    const ok = []; let packFlag = false;
    for (const e of ents) {
      if (!rankAllowsItem(kit, e.item, rank, u)) continue;
      if (hasTag(kit, e.item, 'needs_pile_id') && !e.pile_id) { packFlag = true; continue; }
      if (hasTag(kit, e.item, 'kepi') && army === 'confederate' && ENLISTED.includes(rank) && e.flagged_exception !== 'private_purchase') continue;
      ok.push(e);
    }
    res = { spec, owner, ok, packFlag, total: ok.reduce((a, e) => a + e.weight.value, 0) };
  }
  kit._fp.set(key, res); return res;
}
const NA_BAYONET = (owner) => ({ items: ['bayonet_none_not_applicable'], tier: 'inferred', source_keys: [], weak_source: null, owner, assignment_id: null, captured: [], pile_ids: [] });
// -> the manifest of one soldier. Throws (as the Python raises ValueError) for a disputed unit with no variant chosen and for a unit that was not at Gettysburg.
export function manifestFor(kit, { soldierId, unitId, seed, date = '1863-07-02', rank = 'private', role = 'rifleman', variant = null }) {
  const u = kit.units[unitId]; if (!u) throw new Error('unknown kit unit ' + unitId);
  if (u.variants && !variant) throw new Error(`unit ${unitId} is disputed (${(u.dispute_ids || []).join(',')}): a scenario variant must be selected, no default is chosen: ${Object.keys(u.variants).join(', ')}`);
  if (u.presence.status !== 'present_at_gettysburg') throw new Error(`unit ${unitId} is ${u.presence.status}: no soldier may be generated`);
  const sd = soldierSeed(seed, soldierId), army = u.army;
  const out = { soldier_id: soldierId, seed: sd, project_seed: seed, unit: unitId, army, corps: u.corps ?? null, division: u.division ?? null, brigade: u.brigade ?? null, branch: u.branch, rank, role, date, variant, fields: {}, tier_map: {}, source_ids: [], flags: [], dispute_ids: [...(u.dispute_ids || [])] };
  const sources = new Set(); let sv = null; const svs = u.soldier_variants || [];
  if (svs.length) {
    const wts = kit.ks.tuning_parameters.share_word_weights.values, ws = svs.map(v => (has(wts, v.share || 'some') ? wts[v.share || 'some'] : 2.0)), total = ws.reduce((a, b) => a + b, 0), r = rand(sd, 98, 0, 1) * total;
    let acc = 0; sv = svs[svs.length - 1].id;
    for (let i = 0; i < svs.length; i++) { acc += ws[i]; if (r < acc) { sv = svs[i].id; break; } }
    out.soldier_variant = sv;
  }
  FIELD_ORDER.forEach((field, fi) => {
    if ((field === 'weapon' || field === 'bayonet') && (!LONG_ARM_BRANCHES.includes(u.branch) || OFFICERS.includes(rank))) {
      if (field === 'bayonet') { out.fields.bayonet = NA_BAYONET('rule:no long arm'); out.tier_map.bayonet = 'inferred'; }
      return;
    }
    if (field === 'bayonet' && u.branch === 'cavalry') { out.fields.bayonet = NA_BAYONET('rule:cavalry carbine'); out.tier_map.bayonet = 'inferred'; return; }
    const fp = fieldPlan(kit, unitId, u, field, date, variant, rank, sv, army);       // the part of the draw that is the same for every soldier of the unit (memoised)
    if (fp === null) return;
    const { spec, owner, ok, packFlag } = fp; if (packFlag) out.flags.push('pack_dropped_without_pile_id_skipped');
    if (!ok.length) return;
    let chosen = [];
    if (field === 'accoutrements') {
      ok.forEach((e, ci) => { const w = e.weight.value, p = e.share === 'all' ? 1.0 : Math.min(1.0, w / COMPONENT_PROB_DIVISOR); if (p >= 1.0 || rand(sd, fi, 0, 10 + ci) < p) chosen.push(e); });
    } else {
      const tot = fp.total;
      const r = rand(sd, fi, 0, 1) * tot; let acc = 0, pick = ok[ok.length - 1];
      for (const e of ok) { acc += e.weight.value; if (r < acc) { pick = e; break; } }
      chosen = [pick];
    }
    const items = chosen.map(e => e.item), tiers = [];
    for (const e of chosen) {
      tiers.push(has(e, 'tier') ? e.tier : (has(spec, 'tier_declared') ? spec.tier_declared : spec.tier));
      if (truthy(e.flagged) || truthy(e.flagged_exception)) out.flags.push('flagged_entry:' + e.item);
      if (e.flagged_exception === 'private_purchase') out.flags.push('private_purchase_exception');
      if (hasTag(kit, e.item, 'gap_placeholder')) out.flags.push('gap_placeholder:' + e.item);
    }
    if (!tiers.length) tiers.push(has(spec, 'tier_declared') ? spec.tier_declared : spec.tier);
    let ftier = tiers[0]; for (const t of tiers) if ((TIER_RANK[t] ?? 0) < (TIER_RANK[ftier] ?? 0)) ftier = t;
    const keys = [...(spec.source_keys || [])];
    out.fields[field] = { items, tier: ftier, source_keys: keys, weak_source: has(spec, 'weak_source') ? spec.weak_source : null, owner, assignment_id: has(spec, 'assignment_id') ? spec.assignment_id : null,
      captured: chosen.filter(e => truthy(e.captured)).map(e => e.item), pile_ids: chosen.filter(e => truthy(e.pile_id)).map(e => e.pile_id) };
    out.tier_map[field] = ftier;
    if (ftier === 'documented') for (const k of keys) sources.add(k);
  });
  let wsid = null;
  for (const w of kit.ks.wear_states) if (w.from && w.to && w.from <= date && date <= w.to) wsid = w.id;
  if (wsid === null && date <= '1863-06-30') wsid = 'before_jul1';
  out.wear_state = { state: wsid, level: wearLevel(sd), tier: 'inferred', level_kind: 'tuning_parameter' };
  out.tier_map.wear_state = 'inferred';
  out.source_ids = [...sources].sort();
  out.flags = [...new Set(out.flags)].sort();
  if (u.dispute_ids && u.dispute_ids.length) out.flags.push('disputed:' + u.dispute_ids.join(','));
  return out;
}

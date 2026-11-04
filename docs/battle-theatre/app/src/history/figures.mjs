// Per-figure kit manifests for the drawn units (contract 1.3, PDF B.6.12). Every drawn figure has a manifest made by manifest.mjs (the bit-identical port of check_kit.manifest_for) from
//  * the kit record of its unit when data/kit-crosswalk.json names one (its own record, or its brigade's), else
//  * the DEFAULT of its army and arm (a synthetic unit that inherits default.<army>.<arm>; the tier of every field is the default's, plausible-procedural where the default says so);
// rank private and role rifleman for every figure (the record has no rank structure: PDF B.5 “10,000+ company officers, not sourced”), seed = the project seed 1863, soldier id = `<history unit id>:<index>`.
// A manifest exists only from the unit's arrival (gate Q04): figureManifest returns null before it. A disputed unit (the 140th NY dress) yields both variants, flagged, none chosen.
// What the renderer can show of a manifest (render/prototype is imported unchanged): see RENDERER_SUPPORT. Everything else is listed on the card as not drawn.
import { Kit, manifestFor, defaultUnitId, soldierSeed, wearLevel } from './manifest.mjs';
import { hash4 } from '../../../sim/rng.mjs';
import { parts } from '../clock.mjs';

export const FIGURE_SEED = 1863;
export const RENDERER_SUPPORT = {
  drawn: [{ category: 'wear_state', how: 'the coat’s brightness class (the renderer’s per-figure variation scalar, sold1.w, drives a ±18% brightness on coat, trousers, hat and canvas): the more worn (soiled) the figure’s wear level, the darker the coat. The other materials vary freely with the same scalar.', tier: 'inferred' }],
  not_drawn: ['headgear (one hat model)', 'coat cut and colour class (one coat model; one palette per army)', 'shirt', 'trousers', 'shoes', 'accoutrements', 'weapon (one rifle model)', 'bayonet', 'sidearm or sword', 'sash', 'pack state', 'corps badge', 'colours or instrument', 'horse coat colour (the kit data holds none: PDF gap)'],
  note: 'The prototype renderer has one soldier model, one colour palette per army and one per-figure variation scalar; it is imported unchanged, so the manifest is shown in the card and drawn only through that scalar.',
};
const TIER_RANK = { documented: 3, inferred: 2, 'plausible-procedural': 1, gap: 0 };
const iso = tMin => { const p = parts(tMin); return `1863-${String(p.month).padStart(2, '0')}-${String(p.dom).padStart(2, '0')}`; };

export function createFigures({ raw, units, enterOf }) {
  if (!raw.kit || !raw.kitWeapons || !raw.kitCrosswalk) return null;
  const kit = new Kit({ specs: raw.kit, weapons: raw.kitWeapons, artillery: raw.kitArtillery, cavalry: raw.kitCavalry });
  const by = new Map(units.map(u => [u.id, u])), cw = raw.kitCrosswalk.units, memo = new Map();
  // which kit unit a history unit's figures take their manifest from
  function kitUnitOf(id) {
    const u = by.get(id), rec = cw[id], side = u.side, arm = u.arm === 'cavalry' ? 'cavalry' : u.arm === 'artillery' ? 'artillery' : 'infantry';
    if (rec && rec.kit && kit.units[rec.kit]) return { kit_unit: rec.kit, how: rec.how, note: rec.note, default: false };
    return { kit_unit: defaultUnitId(side, arm), how: 'default', note: rec ? rec.note : 'not in the crosswalk', default: true };
  }
  const idOf = (unitId, k) => `${unitId}:${String(k).padStart(4, '0')}`;
  const dateFor = (unitId, tMin, scenario) => iso(tMin != null ? tMin : enterOf(unitId, scenario));
  // one figure's manifest at a time (null: the unit has not arrived, is not drawn, or the kit refuses it). A disputed unit returns { disputed, variants: { name: manifest } }.
  function manifest(unitId, k, tMin, scenario, rank = 'private', role = 'rifleman') {
    const u = by.get(unitId); if (!u || !u.drawn) return null;
    const e = enterOf(unitId, scenario); if (e == null || (tMin != null && tMin < e)) return null;       // no manifest before the unit enters the field (Q04); the unit enters at its default arrival in the scenario
    const ku = kitUnitOf(unitId), ent = kit.units[ku.kit_unit], date = dateFor(unitId, tMin ?? e, scenario), key = `${unitId}|${k}|${date}|${rank}`;
    if (memo.has(key)) return memo.get(key);
    let m;
    if (ent.presence.status !== 'present_at_gettysburg') m = null;
    else if (ent.variants) { const variants = {}; for (const v of Object.keys(ent.variants)) variants[v] = manifestFor(kit, { soldierId: idOf(unitId, k), unitId: ku.kit_unit, seed: FIGURE_SEED, date, rank, role, variant: v }); m = { disputed: true, dispute_ids: ent.dispute_ids || [], variants, flags: ['disputed:' + (ent.dispute_ids || []).join(','), 'no variant chosen'] }; }
    else m = manifestFor(kit, { soldierId: idOf(unitId, k), unitId: ku.kit_unit, seed: FIGURE_SEED, date, rank, role });
    if (memo.size > 4000) memo.clear(); memo.set(key, m); return m;
  }
  // the renderer's variation scalar of a figure: the coat-brightness class from the manifest's wear level. v = (b + kk) / 13.7 gives fract(13.7 v) = b exactly (the shader's coat term), and kk (a draw of the
  // soldier's seed that is not in the manifest) varies the other materials. null for a disputed unit or a unit with no manifest.
  function vari(unitId, k) {
    const u = by.get(unitId); if (!u || !u.drawn || k < 0 || k >= u.strength.drawn || enterOf(unitId) == null) return null;
    const ku = kitUnitOf(unitId), ent = kit.units[ku.kit_unit]; if (ent.variants || ent.presence.status !== 'present_at_gettysburg') return null;       // a disputed or absent unit: no manifest to read
    const sd = soldierSeed(FIGURE_SEED, idOf(unitId, k)), b = Math.min(0.9999, 1 - wearLevel(sd)), nk = b < 0.7 ? 14 : 13, kk = Math.floor((hash4(sd, 97, 0, 0) / 4294967296) * nk);
    return (b + kk) / 13.7;
  }
  // an aggregate of all the unit's figures at a time: per field the items drawn and how many figures have them, the tier mix, the flags
  function summary(unitId, tMin, scenario) {
    const u = by.get(unitId); if (!u || !u.drawn) return null;
    const e = enterOf(unitId, scenario), ku = kitUnitOf(unitId), ent = kit.units[ku.kit_unit], n = u.strength.drawn;
    const base = { unit: unitId, n, kit_unit: ku.kit_unit, kit_name: ent.name, how: ku.how, how_note: ku.note, default: ku.default, date: dateFor(unitId, tMin, scenario), enters: e };
    if (e == null || tMin < e) return { ...base, present: false, note: e == null ? 'the unit has no arrival in this scenario' : 'no manifest exists before the unit enters the field (gate Q04): its first date is ' + iso(e) };
    if (ent.variants) return { ...base, present: true, disputed: true, dispute_ids: ent.dispute_ids || [], variants: Object.keys(ent.variants), note: 'the dress of this unit is disputed in the sources; both variants are carried and none is chosen' };
    const by_field = {}, tiers = {}, flags = {}; let weakest = 'documented';
    for (let k = 0; k < n; k++) {
      const m = manifest(unitId, k, tMin, scenario);
      for (const [f, v] of Object.entries(m.fields)) { const key = v.items.join(' + '), slot = (by_field[f] = by_field[f] || new Map()), r = slot.get(key) || { items: v.items, tier: v.tier, count: 0, weak: v.weak_source }; r.count++; slot.set(key, r); tiers[v.tier] = (tiers[v.tier] || 0) + 1; if ((TIER_RANK[v.tier] ?? 0) < (TIER_RANK[weakest] ?? 0)) weakest = v.tier; }
      for (const f of m.flags) flags[f] = (flags[f] || 0) + 1;
    }
    return { ...base, present: true, disputed: false, by_field: Object.fromEntries(Object.entries(by_field).map(([f, mp]) => [f, [...mp.values()].sort((a, b) => b.count - a.count)])), tiers, flags, weakest_tier: weakest };
  }
  return { kit, kitUnitOf, manifest, vari, summary, idOf, dateFor, crosswalk: cw, soldierSeed };
}

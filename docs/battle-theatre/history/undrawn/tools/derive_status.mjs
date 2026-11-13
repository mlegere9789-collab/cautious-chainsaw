// Derives, from the history layer as it is built now, what the layer draws of every unit of the roster and what is missing.
//   node docs/battle-theatre/history/undrawn/tools/derive_status.mjs            writes docs/battle-theatre/history/undrawn/status.json
//   node docs/battle-theatre/history/undrawn/tools/derive_status.mjs --print    prints the counts only
// Nothing here is a historical statement: every field is read from the layer (src/history/real.mjs), the five position ledgers and the troop-map digest.
// Re-run it after every merge: the round-2 list is the units whose `missing` is still not empty.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), BT = path.resolve(here, '../../..'), APP = path.join(BT, 'app');
const { loadRawFromDisk, terrainMeta } = await import(path.join(APP, 'tools/history-report.mjs'));
const { createRealHistory } = await import(path.join(APP, 'src/history/real.mjs'));
const { loadLedgers, unusable } = await import(path.join(APP, 'tools/claim-ledger.mjs'));

export const FIELD_DAYS = ['1863-07-01', '1863-07-02', '1863-07-03'];
const BRIGADE_LEVELS = ['brigade', 'artillery_brigade', 'artillery_battalion', 'artillery_group', 'group'];
const iso = m => (m == null || !Number.isFinite(m) ? null : new Date(Date.UTC(1863, 5, 1) + Math.round(m) * 60000).toISOString().slice(0, 16));

export function derive() {
  const raw = loadRawFromDisk(), L = createRealHistory({ raw, T: terrainMeta() }), rep = L.report({}), both = L.both({});
  const rawU = new Map(raw.units.units.map(u => [u.id, u])), byId = new Map(L.units.map(u => [u.id, u]));
  const evBy = new Map(); for (const e of both.events) { if (!evBy.has(e.unit)) evBy.set(e.unit, {}); const m = evBy.get(e.unit); m[e.type] = (m[e.type] || 0) + 1; }
  const dayStops = new Map(); for (const d of rep.day_stops) { if (!dayStops.has(d.unit)) dayStops.set(d.unit, []); dayStops.get(d.unit).push(d); }
  const led = loadLedgers(), claims = new Map(); for (const c of led.claims) { if (!claims.has(c.unit_id)) claims.set(c.unit_id, []); claims.get(c.unit_id).push(c); }
  // what the layer did with every ledger claim (app/data/claim-dispositions.json, written by app/tools/build-claim-placement.mjs): [claim, ledger, unit, kind, disposition, code, reason, entry]
  const dispo = new Map(); for (const r of JSON.parse(fs.readFileSync(path.join(APP, 'data/claim-dispositions.json'), 'utf8')).rows) dispo.set(r[0], { disposition: r[4], code: r[5] || null });
  const dispOf = c => dispo.get(c.claim_id) || { disposition: 'not_read', code: null };
  const tmOwn = new Map(); for (const c of Object.values((raw.dayPositions || {}).claims || {})) { if (!tmOwn.has(c.unit)) tmOwn.set(c.unit, []); tmOwn.get(c.unit).push(c.id); }
  const chain = id => { const c = []; for (let u = byId.get(id); u; u = byId.get(u.parent)) c.unshift(u); return c; };
  const reasonCode = u => {
    const r = u.render.reason || '';
    if (u.render.status === 'moving') return 'placed';
    if (u.render.status === 'edge_only') return 'no_place_after_arrival';
    if (u.render.status === 'aggregate') return 'formation';
    if (u.render.status === 'not_on_field') return rawU.get(u.id).status === 'never_on_field' || rawU.get(u.id).status === 'never_main_field' ? 'listed_not_on_field' : 'documented_absent';
    if (/gives no figure/.test(r)) return 'no_figure';
    if (/does not cross into the loaded ground/.test(r)) return 'road_outside_ground';
    if (/reports of this unit print another/.test(r)) return 'reports_disagree';
    if (/names a road or a route that the repository cannot place/.test(r)) return 'route_unplaceable';
    if (/has no single-label day position/.test(r)) return 'no_single_day_label';
    if (/Stuart’s cavalry/.test(r)) return 'cavalry_no_road';
    if (/name different roads/.test(r)) return 'sibling_roads_differ';
    return 'no_road';
  };
  const units = [];
  for (const u of L.units) {
    const ru = rawU.get(u.id), g = L.model.effective(u.id, {}), p = L.plans.get(u.id) || null, own = claims.get(u.id) || [], ch = chain(u.id);
    const up = ch.slice(0, -1).reverse();      // the formations above the unit, nearest first (the last is the army)
    const leaf = !(u.children || []).length, status = u.render.status, onFieldLeaf = leaf && ['moving', 'edge_only', 'not_drawn'].includes(status);
    const byLedger = {}, byDisp = {}, byCode = {}; let usable = 0;
    for (const c of own) { byLedger[c.ledger] = (byLedger[c.ledger] || 0) + 1; if (!unusable(c)) usable++; const d = dispOf(c); byDisp[d.disposition] = (byDisp[d.disposition] || 0) + 1; if (d.code && d.disposition === 'unresolved') byCode[d.code] = (byCode[d.code] || 0) + 1; }   // by_code counts the reason codes of the refused (unresolved) claims only: a used claim may carry a code (documented_absence, conflict_approach) but was not refused
    const stops = p && p.stops ? p.stops.map(s => ({ po: s.po, place: s.place, t: iso(s.t_doc) })) : [];
    const ds = dayStops.get(u.id) || [];
    const gateDate = g && g.earliest != null ? iso(g.earliest).slice(0, 10) : null;
    const places = {};
    for (const d of FIELD_DAYS) {
      if (!onFieldLeaf) break;
      if (gateDate && d < gateDate) { places[d] = 'before_gate'; continue; }
      const led1 = stops.some(s => s.t && s.t.slice(0, 10) === d), map1 = ds.some(x => x.date === d && (x.applied || x.merged_into));
      places[d] = led1 && map1 ? 'ledger+map' : led1 ? 'ledger' : map1 ? 'map' : 'none';
    }
    // the ledger claims of the unit dated on a day of 1 to 3 July on which the layer holds no place, each with what the layer did with it (the reason it is not a stop)
    const dayClaims = {};
    if (onFieldLeaf) for (const d of FIELD_DAYS) {
      if (places[d] !== 'none') continue;
      const cs = own.filter(c => c.when && c.when.date === d).map(c => { const x = dispOf(c); return { id: c.claim_id, ledger: c.ledger, kind: c.kind, disposition: x.disposition, code: x.code }; });
      if (cs.length) dayClaims[d] = cs;
    }
    const tm = {}; for (const d of (u.day_positions ? u.day_positions.days : [])) tm[d.sheet] = d.status + (d.owner && d.owner !== u.id ? '@' + d.owner_level : '');
    // ---- what is missing (leaf units on the field only; the five words of the plan)
    const missing = [], detail = {};
    if (onFieldLeaf) {
      if (!g || g.owner !== u.id) { missing.push('arrival'); detail.arrival = g ? `no arrival of its own: the gate is that of ${g.owner} (${g.kind}, tier ${g.tier})` : 'no gate'; }
      const noDays = FIELD_DAYS.filter(d => places[d] === 'none');
      if (status !== 'moving') { missing.push('positions'); detail.positions = status === 'edge_only' ? 'no place after arrival: the unit waits in its column where its road leaves the loaded ground' : 'not drawn: no place is applied'; }
      else if (noDays.length) { missing.push('positions'); detail.positions = `no place of its own on ${noDays.join(', ')} (it stays where it last stood); no place after 3 July`; }
      else detail.positions = 'a place on every day from its gate to 3 July; none on 4 July; times of the troop-map positions are modelled';
      const held = noDays.filter(d => dayClaims[d]).map(d => `${d}: ${dayClaims[d].length} (${[...new Set(dayClaims[d].map(x => x.code || x.disposition))].join(', ')})`);
      if (held.length) detail.claims = `ledger claims held for a day without a place, none of them a stop: ${held.join('; ')}`;
      const a = u.approach;
      if (!a) { missing.push('path'); detail.path = 'no road of approach'; }
      else if (a.modelled) { missing.push('path'); detail.path = `modelled road (${a.road}, sibling rule DEC-015, tier plausible-procedural)`; }
      else if (a.tier === 'plausible-procedural') { missing.push('path'); detail.path = `only the corps-level road is printed (${a.road}, ${a.id}, set for ${a.owner})`; }
      else detail.path = `${a.road} (${a.id}, tier ${a.tier}, set for ${a.owner})`;
      if (!(evBy.get(u.id) || {}).leave) detail.path += '; no departure';
      if (u.strength && u.strength.kind !== 'printed') { missing.push('strength'); detail.strength = `procedural share ${u.strength.share} (no figure of its own; a range with a declared basis is required)`; }
      const ownLabel = (tmOwn.get(u.id) || []).length > 0;
      if (!own.length && !ownLabel && (!g || g.owner !== u.id) && (!a || a.owner !== u.id)) { missing.push('parent_only'); detail.parent_only = 'gate, road and places all come from formations above it; no ledger claim and no map label names the unit'; }
    }
    units.push({ id: u.id, name: u.name, name_printed: ru.name_printed, army: ru.army, level: u.level, arm: u.arm, parent: u.parent,
      corps: ch[1] ? ch[1].id : null, division: (up.find(x => x.level === 'division') || {}).id || null, brigade: (up.find(x => BRIGADE_LEVELS.includes(x.level)) || {}).id || null,
      leaf, roster_status: ru.status, layer_status: status, reason: reasonCode(u), figures: u.strength ? u.strength.drawn : 0, share: u.strength ? u.strength.share : 0, strength_kind: u.strength ? u.strength.kind : null,
      gate: g ? { earliest: iso(g.earliest), default: iso(g.default), latest: iso(g.latest), owner: g.owner, kind: g.kind, tier: g.tier } : null,
      approach: u.approach ? { id: u.approach.id, road: u.approach.road, tier: u.approach.tier, owner: u.approach.owner, modelled: !!u.approach.modelled } : null,
      places, troop_map: tm, claims_own: { total: own.length, usable, by_ledger: byLedger, by_disposition: byDisp, by_code: byCode }, day_claims: dayClaims, missing, detail });
  }
  return { generated_by: 'docs/battle-theatre/history/undrawn/tools/derive_status.mjs', counts: L.counts, figures_drawn: L.units.filter(u => u.drawn).reduce((a, u) => a + u.strength.drawn, 0), ledgers: Object.fromEntries(Object.entries(led.meta).map(([k, v]) => [k, v.claims])), units };
}
const main = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (main) {
  const s = derive();
  if (!process.argv.includes('--print')) fs.writeFileSync(path.join(here, '..', 'status.json'), JSON.stringify(s, null, 0).replace(/\},\{"id"/g, '},\n{"id"') + '\n');
  const leafs = s.units.filter(u => u.leaf && ['moving', 'edge_only', 'not_drawn'].includes(u.layer_status)), tally = {};
  for (const u of leafs) for (const m of u.missing) tally[m] = (tally[m] || 0) + 1;
  console.log(JSON.stringify({ counts: s.counts, figures_drawn: s.figures_drawn, leaf_units_on_field: leafs.length, complete: leafs.filter(u => !u.missing.length).length, missing: tally }));
}

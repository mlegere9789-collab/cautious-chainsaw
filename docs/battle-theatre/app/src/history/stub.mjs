// STUB HISTORY LAYER. Every datum here is a MODELLED PLACEHOLDER made up to exercise the page shell: the units are the 992 placeholder units of the
// prototype crowd, their arrival times, routes and activities are arbitrary, and nothing is a claim about any real unit, place or time.
// It implements the history-layer contract (contract.mjs, ../../data-contract.md). Replace this module by the real layer; the shell does not change.
import { rand } from '../../../sim/rng.mjs';
import { minOf } from '../clock.mjs';
import { bearingDeg } from '../geo.mjs';
import { SEED, LABEL_PLACEHOLDER } from '../config.mjs';

const KIND = { line: 'line', col: 'column', cav: 'mounted block', crew: 'gun crew' };
const FORMATION = { line: 'line', col: 'column_fours', cav: 'mounted_line', crew: 'battery' };
const MARCH_MPS = 1.25;                        // placeholder marching speed
// scenario links: which placeholder group follows which register conflict, and on which date its value applies when the printed value carries only a clock time
const LINKS = {
  'C-004': { side: 'union', pick: i => i % 8 === 0, day: [7, 2], what: 'II Corps arrival' },
  'C-005': { side: 'confederate', pick: i => i % 8 === 0, day: [7, 2], what: 'Hood at Seminary Ridge' },
  'C-021': { side: 'confederate', pick: i => i % 8 === 1, day: [7, 3], what: 'Pickett\'s arrival' },
  'C-023': { side: 'confederate', pick: (i, u) => u.klass === 1, day: [7, 2], what: 'Stuart\'s arrival' },
};
export const STUB_LINKS = LINKS;
const fx = (k, id, b = 0) => rand(SEED, id, b, k);
const lerp = (a, b, t) => a + (b - a) * t;

// minutes for a conflict option text: a clock time with an optional 'Jul n', or 'dawn' (civil dawn of the link's day); null when the value carries no time
export function optionTime(text, link, helpers = {}) {
  const clock = /(\d{1,2}):(\d{2})/.exec(text); const jd = /Jul\s+(\d{1,2})/.exec(text); const day = jd ? [7, +jd[1]] : link.day;
  if (clock) return minOf(day[0], day[1], +clock[1], +clock[2]);
  if (/dawn/i.test(text) && helpers.civilDawn) return helpers.civilDawn(minOf(day[0], day[1]));
  return null;
}

export function createStubHistory({ base, T, geo, tiersDemo = false, helpers = {} }) {
  const W = T.W, H = T.H;
  const U = base.units;
  const SIDE = ['union', 'confederate'];
  const units = U.map((u, i) => {
    const id = `STUB-${String(i + 1).padStart(4, '0')}`, side = SIDE[u.team];
    const tier = tiersDemo ? ['plausible-procedural', 'inferred', 'documented'][i % 3] : 'plausible-procedural';
    return {
      id, name: `${side === 'union' ? 'Union' : 'Confederate'} placeholder ${KIND[u.kind] || u.kind} ${String(i + 1).padStart(4, '0')}`, short: `${side === 'union' ? 'U' : 'C'}${String(i + 1).padStart(4, '0')}`,
      side, arm: u.kind === 'cav' ? 'cavalry' : u.kind === 'crew' ? 'artillery' : 'infantry', parent: null, level: 'placeholder',
      strength: { min: u.count, max: u.count, basis: `${LABEL_PLACEHOLDER}: the number of figures drawn for this placeholder unit` },
      formation: { kind: FORMATION[u.kind] || 'line', ranks: u.kind === 'line' ? 2 : 1, facing_default_deg: null },
      kit: 'KIT-STUB', tier, sources: ['STUB-GEN'], register: 'EG-0001', stub: true, tierDemo: tiersDemo,
      notes: tiersDemo ? 'Demo tier assignment: the tier colour only illustrates the overlay; it is not a claim about this unit.' : 'Not a real unit.',
    };
  });
  const sources = {
    'STUB-GEN': { key: 'STUB-GEN', label: 'Page-shell placeholder source', kind: 'placeholder', weak: true, citation: `${LABEL_PLACEHOLDER}. Made up to exercise the page; not a historical source.` },
    'EG-0001': { key: 'EG-0001', label: 'Evidence-gap register: individual soldier position and action', kind: 'register', weak: false, citation: 'GOVERNANCE/register/EG-0001.md' },
  };
  const binding = U.map((u, i) => ({ unit: units[i].id, index: i }));
  const idByIndex = units.map(u => u.id);

  // ---- entry and exit points, just outside the loaded ground (the unit marches in from off the map)
  const edge = (side, k, r) => {
    const out = r + 60, j = (fx(7, k) - 0.5) * 80;
    const SPOTS = side === 'union' ? [[0.30, 0.5], [0.05, 0.5], [0.5, 0.30], [0.5, 0.05]] : [[-0.5, -0.05], [-0.5, 0.2], [-0.2, -0.5], [-0.5, -0.3]];
    const s = SPOTS[Math.floor(fx(8, k) * SPOTS.length)];
    const x = s[0] * W, z = s[1] * H; const nx = Math.abs(s[0]) === 0.5 ? Math.sign(s[0]) : 0, nz = Math.abs(s[1]) === 0.5 ? Math.sign(s[1]) : 0;
    return [x + nx * out + (nz ? j : 0), z + nz * out + (nx ? j : 0)];
  };
  const ll = (x, z) => { const [lng, lat] = geo.lnglat(x, z); return { lng, lat }; };
  const wp = (t, x, z, sigma) => ({ t, ...ll(x, z), sigma_m: sigma });

  const plan = new Map();    // per unit, scenario independent: slot, entry, exit, random draws
  U.forEach((u, i) => {
    const o = i * 12, sx = base.unitF[o], sz = base.unitF[o + 1], head = base.unitF[o + 2];
    plan.set(units[i].id, { i, slot: [sx, sz], head, entry: edge(u.team === 0 ? 'union' : 'confederate', i, u.radius), exit: edge(u.team === 0 ? 'union' : 'confederate', i + 5000, u.radius), r1: fx(1, i), r2: fx(2, i), r3: fx(3, i), clip0: base.unitF[o + 3], u });
  });

  // placeholder schedule: every unit has a window on the field; windows overlap so that all of them are present around 3 Jul morning
  function arrivals(scenario) {
    const ch = scenario?.choices || {}, groupTime = {};
    for (const [cid, link] of Object.entries(LINKS)) {
      const key = ch[cid] || 'recommended'; if (key === 'range') continue;
      const text = scenario?.optionText?.[cid]; if (text == null) continue;
      const t = optionTime(text, link, helpers); if (t != null) groupTime[cid] = t;
    }
    return units.map((un, i) => {
      const p = plan.get(un.id), u = p.u; let t0, linked = null;
      for (const [cid, link] of Object.entries(LINKS)) if (link.side === un.side && link.pick(i, u) && groupTime[cid] != null) { linked = cid; t0 = groupTime[cid] + p.r1 * 180; }
      if (linked == null) t0 = un.side === 'union' ? lerp(minOf(6, 30, 6), minOf(7, 2, 18), p.r1 ** 1.4) : lerp(minOf(6, 29, 12), minOf(7, 2, 12), p.r1 ** 1.4);
      const earliest = linked ? groupTime[linked] : t0;
      return { unit: un.id, earliest, default: t0, latest: t0 + 120, entry: { ...ll(...p.entry), sigma_m: 200 }, tier: un.tier, sources: ['STUB-GEN'], conflict: linked, note: `${LABEL_PLACEHOLDER}: arrival time and entry point are arbitrary` };
    });
  }

  function events(scenario) {
    const arr = arrivals(scenario), ev = [];
    arr.forEach((a, i) => {
      const un = units[i], p = plan.get(un.id), dist = Math.hypot(p.slot[0] - p.entry[0], p.slot[1] - p.entry[1]), dur = Math.max(1, dist / MARCH_MPS / 60);
      const head = bearingDeg(p.slot[0] - p.entry[0], p.slot[1] - p.entry[1]);
      ev.push({ t: a.default, unit: un.id, type: 'enter', at: { lng: a.entry.lng, lat: a.entry.lat }, tier: un.tier, sources: ['STUB-GEN'] });
      ev.push({ t: a.default, unit: un.id, type: 'activity', activity: 'march', heading_deg: head, tier: un.tier, sources: ['STUB-GEN'] });
      ev.push({ t: a.default, unit: un.id, type: 'path', wp: [wp(a.default, ...p.entry, 200), wp(a.default + dur, ...p.slot, 60)], tier: un.tier, sources: ['STUB-GEN'] });
      const settle = a.default + dur;
      ev.push({ t: settle, unit: un.id, type: 'activity', activity: 'stand', heading_deg: (((180 - p.head * 180 / Math.PI) % 360) + 360) % 360, tier: un.tier, sources: ['STUB-GEN'] });
      // placeholder fire window for the placeholder firing lines and crews: 3 Jul 13:00-14:30 (arbitrary)
      const fireAct = p.u.kind === 'crew' ? 'serve_guns' : (p.clip0 === 3 ? 'fire' : null);
      if (fireAct && settle < minOf(7, 3, 13)) { ev.push({ t: minOf(7, 3, 13), unit: un.id, type: 'activity', activity: fireAct, tier: un.tier, sources: ['STUB-GEN'] }); ev.push({ t: minOf(7, 3, 14, 30), unit: un.id, type: 'activity', activity: 'stand', tier: un.tier, sources: ['STUB-GEN'] }); }
      // placeholder departure
      const dep = un.side === 'union' ? lerp(minOf(7, 5, 6), minOf(7, 8, 12), p.r2) : lerp(minOf(7, 4, 21), minOf(7, 6, 6), p.r2);
      const dist2 = Math.hypot(p.exit[0] - p.slot[0], p.exit[1] - p.slot[1]), dur2 = Math.max(1, dist2 / MARCH_MPS / 60);
      ev.push({ t: dep, unit: un.id, type: 'activity', activity: 'march', heading_deg: bearingDeg(p.exit[0] - p.slot[0], p.exit[1] - p.slot[1]), tier: un.tier, sources: ['STUB-GEN'] });
      ev.push({ t: dep, unit: un.id, type: 'path', wp: [wp(dep, ...p.slot, 60), wp(dep + dur2, ...p.exit, 200)], tier: un.tier, sources: ['STUB-GEN'] });
      ev.push({ t: dep + dur2, unit: un.id, type: 'leave', tier: un.tier, sources: ['STUB-GEN'] });
    });
    // one deliberately illegal event, to prove the arrival rule: a movement three hours BEFORE the earliest arrival of unit 5 (the cache must reject it, gate Q04)
    const bad = arr[5]; ev.push({ t: bad.earliest - 180, unit: bad.unit, type: 'path', wp: [wp(bad.earliest - 180, ...plan.get(bad.unit).slot, 60), wp(bad.earliest - 170, ...plan.get(bad.unit).slot, 60)], tier: 'plausible-procedural', sources: ['STUB-GEN'], stub_note: 'deliberately early: must be rejected by the arrival rule' });
    ev.sort((a, b) => a.t - b.t);
    return { arrivals: arr, events: ev };
  }

  // ---- placeholder objects: one pre-existing fence (never given a construction animation) and one work that is built on screen in a window
  const L0 = units.findIndex((u, i) => U[i].kind === 'line' && U[i].team === 0 && i > 5);
  const p0 = plan.get(units[L0].id).slot, h0 = plan.get(units[L0].id).head;
  const along = (d, off) => [p0[0] + Math.cos(h0) * d + Math.sin(h0) * off, p0[1] - Math.sin(h0) * d + Math.cos(h0) * off];
  const objects = [
    { id: 'OBJ-STUB-FENCE', name: 'Placeholder fence line', kind: 'fence', pre_existing: true, built: null, tier: 'plausible-procedural', sources: ['STUB-GEN'], line: [along(-90, 40), along(90, 40)].map(([x, z]) => ll(x, z)), note: `${LABEL_PLACEHOLDER}: a pre-existing feature is never given a construction animation` },
    { id: 'OBJ-STUB-WORK', name: 'Placeholder earthwork', kind: 'earthwork', pre_existing: false, built: { from: minOf(7, 2, 18), to: minOf(7, 3, 6) }, tier: 'plausible-procedural', sources: ['STUB-GEN'], line: [along(-70, -30), along(70, -30)].map(([x, z]) => ll(x, z)), note: `${LABEL_PLACEHOLDER}: built on screen between 2 Jul 18:00 and 3 Jul 06:00 (arbitrary window); nothing is pre-placed` },
  ];
  const KIT_CATS = ['Headgear', 'Coat or jacket', 'Trousers', 'Footwear', 'Shoulder arm', 'Accoutrements', 'Colours or flags', 'Equipment carried'];
  return {
    meta: { id: 'stub-0', contract: '1.0', stub: true, label: LABEL_PLACEHOLDER, scenarioAware: true, note: 'Made up by the page shell; every position, time and count is arbitrary.' },
    units, sources, objects, binding, idByIndex, plan, arrivals: s => events(s).arrivals, events: s => events(s).events, both: events,
    kit(unitId) { return { id: 'KIT-STUB', unit: unitId, valid_from: null, valid_to: null, items: KIT_CATS.map(c => ({ category: c, item: `${LABEL_PLACEHOLDER}: no item data`, tier: 'plausible-procedural', sources: ['STUB-GEN'], valid_from: null, valid_to: null })), validator: { rule: 'PDF B.6.12 kit validator', passed: null, note: 'not run: the placeholder carries no items' } }; },
    objectProgress(obj, tMin) { if (obj.pre_existing) return 1; const { from, to } = obj.built; return tMin <= from ? 0 : tMin >= to ? 1 : (tMin - from) / (to - from); },
  };
}

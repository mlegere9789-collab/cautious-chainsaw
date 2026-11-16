// Gate Q20, node side: what the real product holds of the cavalry (GATE-SPEC Q20.1 to Q20.6).
//   node tools/bt/gates/q20_layer.mjs --out dump.json [--mutate file.mjs]
// It reports, and does not judge. For every cavalry leaf unit of the layer (regiments, battalions, brigade-level leaves) and every horse-artillery unit it dumps the layer's record, its arrival, the
// kit card the figure pass resolves it to, and for the drawn ones the horses (`src/history/cavalry.mjs`), the dismounted roles, the world's mounted count and, from the REAL per-figure manifests the page dresses
// the figures from (`layer.figureManifest`, `layer.figureSummary`) at the minute ten after the unit enters, the distribution of every field, the ranks, the instruments and every shoulder arm and sidearm named.
import { build, loadMutation, parseArgs, writeOut, APP, r6 } from './oob_layer_lib.mjs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const imp = rel => import(pathToFileURL(path.join(APP, rel)).href);
const args = parseArgs(process.argv.slice(2));
const mutate = await loadMutation(args.mutate);
const B = await build({ mutate });
const { layer, world, clock } = B;
const U = layer.units, idx = new Map(U.map((u, i) => [u.id, i]));
const cav = await imp('src/history/cavalry.mjs');
const { ACTIVITIES } = await imp('src/history/contract.mjs');
const arr = new Map(layer.arrivals({}).map(a => [a.unit, a]));
const by = new Map(U.map(u => [u.id, u]));
const chain = id => { const o = []; let u = by.get(id); while (u) { o.push(u.id); u = u.parent ? by.get(u.parent) : null; } return o; };
const domain = U.filter(u => !u.children.length && (u.arm === 'cavalry' || (u.arm === 'artillery' && chain(u.id).some(x => /cav|horse/.test(x)))));
const counts = (arrOrIter) => { const m = {}; for (const x of arrOrIter) m[x] = (m[x] || 0) + 1; return m; };

const units = [];
for (const u of domain) {
  const i = idx.get(u.id), w = world.units[i], a = arr.get(u.id) || null;
  const kit = layer.figures && layer.figures.kitUnitOf ? layer.figures.kitUnitOf(u.id) : null;
  const rec = { id: u.id, name: u.name, army: u.side === 'union' ? 'US' : 'CS', level: u.level, arm: u.arm, parent: u.parent, status: u.status, drawn: !!u.drawn, render: u.render.status, render_reason: String(u.render.reason || '').slice(0, 200), strength_drawn: u.strength.drawn,
    enter_min: a ? a.default : null, arrival: a ? { earliest: a.earliest, default: a.default, latest: a.latest } : null, kit: kit ? { unit: kit.kit_unit ?? null, how: kit.how ?? null, default: !!kit.default } : null,
    world: { own: w.count, klass: w.klass, mounted: w.klass === 1 ? w.count : 0, kind: w.kind }, horse: u.drawn ? cav.horseRange(u.strength.drawn) : null, summary: null, figures: null, dismount: null };
  const dr = cav.dismountRecord(u.id);
  if (dr) { const share = cav.dismountShare(dr); rec.dismount = { record: dr.id, share, share_tier: dr.share_tier, from: dr.from, to: dr.to, counts: share != null && u.drawn ? cav.dismountCounts(u.strength.drawn, share) : null, roles: null };
    if (share != null && u.drawn) { const r = cav.mountRoles(u.id, u.strength.drawn, share); rec.dismount.roles = { mounted: r.filter(x => x === 0).length, fight: r.filter(x => x === 1).length, hold: r.filter(x => x === 2).length }; } }
  if (u.drawn && a) {
    const t = a.default + 10, n = u.strength.drawn;
    const s = layer.figureSummary(u.id, t, {});
    rec.summary = s ? { t_min: t, date: s.date, present: s.present, kit_unit: s.kit_unit, n: s.n, by_field: s.by_field, disputed: s.disputed } : null;
    const rank = [], role = [], instr = [], weapon = [], side = [], none = []; let have = 0;
    for (let k = 0; k < n; k++) {
      const m = layer.figureManifest(u.id, k, t, {});
      if (!m) { none.push(k); continue; }
      have++; rank.push(m.rank); role.push(m.role);
      for (const x of (m.fields.flag_or_instrument || {}).items || []) instr.push(x);
      for (const x of (m.fields.weapon || {}).items || []) weapon.push(x);
      for (const x of (m.fields.sidearm_sword || {}).items || []) side.push(x);
    }
    rec.figures = { checked: n, with_manifest: have, without: none.length, rank: counts(rank), role: counts(role), instrument: counts(instr), weapon_items: counts(weapon), sidearm_items: counts(side) };
  }
  units.push(rec);
}
writeOut(args.out, { schema: 'q20-layer-dump/1', layer: { id: layer.meta.id, units: U.length }, all_unit_ids: U.map(u => u.id), units,
  world: { mounted_total: world.comp ? world.comp.mounted : null, horses_total: world.comp ? world.comp.horses : null },
  cavalry_module: { holder: cav.HOLDER, mounted_share: { min: cav.MOUNTED_SHARE.min, max: cav.MOUNTED_SHARE.max, tier: cav.MOUNTED_SHARE.tier, observed: cav.MOUNTED_SHARE.observed }, led: cav.LED, tier: cav.TIER,
    dismounts: cav.DISMOUNTS.map(d => ({ id: d.id, units: d.units, share: d.share ?? null, share_rule: d.share_rule ?? null, share_tier: d.share_tier, from: d.from, to: d.to })), gaps: cav.GAPS.map(g => ({ id: g.id, title: g.title, tier: g.tier })) },
  state_schedule: { per_unit: false, mapping: null, basis: 'the layer keys cavalry units to the activities of contract.mjs ACTIVITIES (march, halt, stand, rest, fire, gallop ...) only; there is no per-unit time-keyed schedule of the cavalry states of B.6.15.7 (no module or data file holds one)' },
  activities: Object.fromEntries(Object.entries(ACTIVITIES).map(([k, v]) => [k, { foot: v.foot ?? null, mounted: v.mounted ?? null }])),
  });

// Node child of the Q02 and Q19 runners: builds the real history layer exactly as the page does (createRealHistory over the files on disk) and writes the data classes
// that the layer produces as normalized datum records, together with what the app's own contract validators (app/src/history/contract.mjs) say about them.
//   node tools/bt/gates/q02_layer.mjs --out <file.json> [--app <docs/battle-theatre/app>]
// No network, no wall clock, nothing written but --out. Deterministic: records are in the layer's own order (units, arrivals, events), ids are built from the data.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const APP = path.resolve(opt('--app', path.resolve(here, '../../../docs/battle-theatre/app')));
const OUT = opt('--out', null);
if (!OUT) { console.error('usage: node q02_layer.mjs --out <file.json> [--app <app dir>]'); process.exit(2); }
const imp = f => import(pathToFileURL(path.join(APP, f)).href);

const { loadRawFromDisk, terrainMeta } = await imp('tools/history-report.mjs');
const { createRealHistory } = await imp('src/history/real.mjs');
const C = await imp('src/history/contract.mjs');

const raw = loadRawFromDisk(), TM = terrainMeta();
const L = createRealHistory({ raw, T: TM, helpers: { civilDawn: m => m + 4 * 60 + 3 } });
const both = L.both({});
const unitIds = new Set(L.units.map(u => u.id));

const arr = v => (v == null ? [] : Array.isArray(v) ? v : [v]);
const str = v => (v == null ? null : String(v));
const classes = {};
const add = (cls, rec) => { (classes[cls] ||= []).push(rec); };
const rec = (id, o) => ({ id, tier: o.tier ?? null, sources: arr(o.sources).map(String), basis: str(o.basis), reasoning: str(o.reasoning), procedural: o.procedural ?? null, register_ids: arr(o.register).map(String), render_flag: o.render_flag ?? null,
  quote: str(o.quote), claim_ids: arr(o.claims).map(String), weak_source: o.weak_source === undefined ? null : !!o.weak_source, extra: o.extra || {} });

// ---- units and the datums a unit carries (the history layer's `units` table)
for (const u of L.units) {
  add('layer.units', rec('unit:' + u.id, { tier: u.tier, sources: u.sources, register: u.register, extra: { drawn: !!u.drawn, level: u.level, arm: u.arm, status: u.status } }));
  const s = u.strength || {};
  add('layer.unit.strength', rec('strength:' + u.id, { tier: s.tier, sources: s.sources, basis: s.basis, weak_source: s.weak_source, extra: { kind: s.kind, min: s.min, max: s.max, drawn: s.drawn } }));
  const c = u.casualties || {};
  if (c.kind && c.kind !== 'none') add('layer.unit.casualties', rec('casualties:' + u.id, { tier: c.tier, sources: c.sources, basis: c.basis, weak_source: c.weak_source, extra: { kind: c.kind, printed_tier: c.printed_tier || null } }));
  const g = u.guns || {};
  if (g.status && g.status !== 'not_applicable') add('layer.unit.guns', rec('guns:' + u.id, { tier: g.tier, sources: g.sources, basis: g.reason || g.printed || null, weak_source: g.weak_source, extra: { status: g.status, count: g.count ?? null } }));
  const a = u.approach;
  if (a && (a.id || a.tier)) add('layer.unit.approach', rec('approach:' + u.id, { tier: a.tier, sources: [], basis: a.text || null, register: a.register, claims: a.claims, quote: a.phrase, extra: { modelled: !!a.modelled, claim_tier: a.claim_tier || null, entry: a.id || null } }));
  const p = u.provenance;
  if (p && p.claims) for (const id of Object.keys(p.claims).sort()) {
    const k = p.claims[id];
    add('layer.provenance.claims', rec('claim:' + id, { tier: k.tier, sources: [k.report].filter(Boolean), quote: k.quote, claims: [id], extra: { unit: u.id, fidelity: k.fidelity || null, page: k.page ?? null, source_kind: k.source_kind || 'or27', printed_page: k.page ?? null } }));
  }
}
// de-duplicate claims carried by several units
if (classes['layer.provenance.claims']) { const seen = new Set(); classes['layer.provenance.claims'] = classes['layer.provenance.claims'].filter(r => !seen.has(r.id) && seen.add(r.id)); }

// ---- arrivals and events (scenario: every conflict on the layer's own default view, `{}`)
for (const a of both.arrivals) add('layer.arrivals', rec('arrival:' + a.unit, { tier: a.tier, sources: a.sources, basis: a.entry_status || a.note || null, extra: { has_entry: a.entry != null } }));
both.events.forEach((e, i) => add('layer.events', rec('event:' + i + ':' + e.unit + ':' + e.type + '@' + e.t, { tier: e.tier, sources: e.sources, weak_source: e.weak_source, extra: { type: e.type } })));

// ---- the kit manifest of every unit (one datum per item)
for (const u of L.units) {
  let k; try { k = L.kit(u.id, 0); } catch (e) { continue; }
  (k.items || []).forEach((it, i) => add('layer.kit_items', rec('kit:' + u.id + ':' + i + ':' + it.category, { tier: it.tier, sources: it.sources, basis: it.item, extra: { valid_from: it.valid_from ?? null, valid_to: it.valid_to ?? null, category: it.category, kit_valid_from: k.valid_from ?? null, kit_valid_to: k.valid_to ?? null } })));
}

// ---- works and structures that the layer carries (objects)
for (const o of arr(L.objects)) add('layer.objects', rec('object:' + o.id, { tier: o.tier, sources: o.sources, basis: o.note || null, extra: { kind: o.kind, pre_existing: !!o.pre_existing, built: o.built ?? null, state_rows: !!o.state_rows } }));

// ---- the Source Manifest of the layer
const manifest = Object.keys(L.sources).sort().map(k => { const s = L.sources[k]; return { key: k, kind: s.kind ?? null, weak: !!s.weak, label: s.label ?? null, citation: s.citation ?? null, date_written: s.date_written ?? null, rights: s.rights ?? null, reliability_tier: s.reliability_tier ?? null, independent_of: s.independent_of ?? null, derived_from: s.derived_from ?? null, type: s.type ?? null }; });

// ---- what the app's own contract validators say
const contract = {};
const run = (name, f) => { try { contract[name] = f(); } catch (e) { contract[name] = ['validator threw: ' + String(e && e.message || e).slice(0, 200)]; } };
run('validateLayer', () => C.validateLayer(L));
run('validateUnits', () => C.validateUnits(L.units));
run('validateArrivals', () => C.validateArrivals(both.arrivals, unitIds));
run('validateEvents', () => C.validateEvents(both.events, unitIds));
run('validateKit', () => { const out = []; for (const u of L.units) { let k; try { k = L.kit(u.id, 0); } catch (e) { out.push(u.id + ': kit threw'); continue; } for (const p of C.validateKit(k)) out.push(u.id + ': ' + p); } return out; });
run('validateProvenance', () => { const out = []; for (const u of L.units) if (u.provenance) for (const p of C.validateProvenance(u.provenance, 'unit ' + u.id)) out.push(p); return out; });
run('validateDayPositions', () => { const out = []; for (const u of L.units) if (u.day_positions) for (const p of C.validateDayPositions(u.day_positions, u, 'unit ' + u.id)) out.push(p); return out; });
run('validateCasualties', () => { const out = []; for (const u of L.units) if (u.casualties) for (const p of C.validateCasualties(u.casualties, 'unit ' + u.id)) out.push(p); return out; });
run('validateGuns', () => { const out = []; for (const u of L.units) if (u.guns) for (const p of C.validateGuns(u.guns, 'unit ' + u.id)) out.push(p); return out; });

const counts = Object.fromEntries(Object.keys(classes).sort().map(k => [k, classes[k].length]));
const doc = { schema: 'bt-q02-layer-dump/1', app: path.relative(process.cwd(), APP).split(path.sep).join('/'), layer: { stub: !!(L.meta && L.meta.stub), scenarioAware: !!(L.meta && L.meta.scenarioAware), units: L.units.length, arrivals: both.arrivals.length, events: both.events.length, sources: manifest.length }, counts,
  classes: Object.fromEntries(Object.keys(classes).sort().map(k => [k, classes[k]])), manifest, contract: Object.fromEntries(Object.keys(contract).sort().map(k => [k, { problems: contract[k].length, first: contract[k].slice(0, 20) }])) };
fs.writeFileSync(OUT, JSON.stringify(doc));
console.error('q02_layer: ' + JSON.stringify(counts));

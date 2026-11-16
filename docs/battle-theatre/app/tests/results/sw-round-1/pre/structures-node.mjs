// RECORD COPY. The imports below are relative to tmp/bt-spec/pre/ (a scratch folder, not committed): to run it, copy it there first.
// Pre-check (node only, no browser) of the DATA assertions of structures3d.spec.mjs: test 1 (counts per class, every drawn object visible at the seven times, the Bliss, Sherfy and McPherson barns on 2, 3 and 4 July),
// test 3 (the date-only half and half of the Sherfy house) and test 4 (reading PD-01 as 2 July evening, the per-object choice winning). The same model, state engine and update call as src/structures/index.mjs; no GPU.
//   node tmp/bt-spec/pre/structures-node.mjs
import fs from 'node:fs'; import path from 'node:path';
import { nodeWorld, BT } from '../../../docs/battle-theatre/app/tests/node-world.mjs';
import { makeGeo } from '../../../docs/battle-theatre/app/src/geo.mjs';
import { loadRawFromDisk, terrainMeta } from '../../../docs/battle-theatre/app/tools/history-report.mjs';
import { createRealHistory } from '../../../docs/battle-theatre/app/src/history/real.mjs';
import { makeStateEngine } from '../../../docs/battle-theatre/app/src/structures/state.mjs';
import { buildModel } from '../../../docs/battle-theatre/app/src/structures/model.mjs';
const rj = f => JSON.parse(fs.readFileSync(path.join(BT, f), 'utf8'));
const raw = loadRawFromDisk(), TM = terrainMeta(), { T } = await nodeWorld(), geo = makeGeo(T), L = createRealHistory({ raw, T: TM, helpers: { civilDawn: m => m + 4 * 60 + 3 } });
const inputs = { data: rj('app/data/structures3d.json'), sched: rj('structures/state_schedule.json'), hospitals: rj('structures/hospitals.json'), structures: raw.structures || rj('structures/structures.json'), works: raw.works || rj('structures/works_stages.json') };
const engine = makeStateEngine({ structures: inputs.structures, sched: inputs.sched, works: inputs.works, hospitals: inputs.hospitals });
const m = buildModel({ data: inputs.data, T, engine, workObjs: L.objects || [], workProgress: (o, t) => L.objectProgress(o, t) }), on = { roads: true, fences: true, buildings: true, masses: true, markers: true };
const minOf = (mo, d, h = 0, mi = 0) => ({ 6: 0, 7: 30 }[mo] + d - 1) * 1440 + h * 60 + mi, ok = (c, msg) => console.log((c ? 'OK   ' : 'FAIL ') + msg);
const pd = inputs.sched.pdf_defaults_log || [];
const choice = (structPD = {}, structChoice = {}) => { const out = {}; for (const [id, name] of Object.entries(structPD)) { const p = pd.find(x => x.id === id); if (!p) continue; for (const r of p.rows || []) { const row = inputs.sched.rows.find(x => x.id === r); if (row) for (const o of row.object_ids) if (engine.scenariosFor(o).includes(name)) out[o] = name; } } return Object.assign(out, structChoice); };
const c = m.counts; ok(c.buildings >= 35 && c.masses >= 200 && c.fences >= 25 && c.panels >= 1500 && c.markers >= 100 && c.roads >= 25, 'test 1 counts ' + JSON.stringify(c));
const B = m.stateBuf; let bad = 0;
for (const [label, t] of [['1 Jul 12:00', minOf(7, 1, 12)], ['2 Jul 12:00', minOf(7, 2, 12)], ['2 Jul 20:00', minOf(7, 2, 20)], ['3 Jul 08:30', minOf(7, 3, 8, 30)], ['3 Jul 16:00', minOf(7, 3, 16)], ['3 Jul 17:00', minOf(7, 3, 17)], ['4 Jul 12:00', minOf(7, 4, 12)]]) {
  m.update(t, choice(), on); let visible = 0; for (const o of m.objects) { if (o.cls === 'works') continue; if (B[o.oid * 8] >= 0.5) visible++; }
  const want = c.buildings + c.masses + c.fences + c.markers + c.roads; if (visible !== want) { bad++; console.log(`   ${label}: visible ${visible}, want ${want}`); }
}
ok(bad === 0, 'test 1: every drawn object is visible at the seven times');
const lv = t => { m.update(t, choice(), on); const f = id => { const o = m.byId.get(id), i = o.oid * 8; return [B[i + 1], B[i + 4], B[i + 3], B[i + 6]]; }; return { bliss: f('STR-BLISS-BARN1'), sherfy: f('STR-SHERFY-BARN1'), mcp: f('STR-MCPHERSON-BARN1') }; };
const a2 = lv(minOf(7, 2, 12)), a3 = lv(minOf(7, 3, 12)), a4 = lv(minOf(7, 4, 12));
ok(a2.bliss[0] === 0 && a2.bliss[1] === 0 && a3.bliss[3] === 1 && a4.bliss[1] === 1 && a4.bliss[2] === 0 && a2.mcp[0] + a3.mcp[1] + a4.mcp[1] === 0, `test 1: Bliss/McPherson states: bliss 2 Jul ${a2.bliss}, 3 Jul ${a3.bliss}, 4 Jul ${a4.bliss}; mcpherson ${a2.mcp[0]},${a3.mcp[1]},${a4.mcp[1]}`);
m.update(minOf(7, 3, 8, 30), choice(), on); { const o = m.byId.get('STR-SHERFY-HOUSE1'), i = o.oid * 8; ok(B[i + 3] === 0.5 && B[i + 6] === 1, `test 3: Sherfy house at 3 Jul 08:30 [mix, uncertain] = [${B[i + 3]}, ${B[i + 6]}] (spec: [0.5, 1])`); }
const st = (t, ch) => { m.update(t, ch, on); const o = m.byId.get('STR-SHERFY-BARN1'), i = o.oid * 8; return { mix: B[i + 3], unc: B[i + 6], B: B[i + 4], vis: B[i] }; };
const t2 = minOf(7, 2, 22), d0 = st(t2, choice()); ok(d0.unc === 0, 'test 4: default reading, Sherfy barn intact on the evening of 2 July (unc ' + d0.unc + ')');
const d1 = st(t2, choice({ 'PD-01': 'jul2_evening_c026' })); ok(d1.unc === 1 && d1.mix === 0.5, `test 4: PD-01 read as 2 July evening: unc ${d1.unc}, mix ${d1.mix} (spec: 1, 0.5)`);
const d2 = st(t2, choice({ 'PD-01': 'jul2_evening_c026' }, { [m.byId.get('STR-SHERFY-BARN1').state_id]: 'default' })); ok(d2.unc === 0, 'test 4: the per-object choice on the card wins (unc ' + d2.unc + ')');
const d3 = st(t2, choice({})); ok(d3.unc === 0, 'test 4: global reading cleared (unc ' + d3.unc + ')');

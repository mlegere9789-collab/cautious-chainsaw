// Pre-check (node only, no browser) of the data-dependent constants of arrival.spec.mjs, against the real history layer at HEAD. Not a spec: it prints what the spec's assertions would see.
import { nodeWorld, BT } from '../../../docs/battle-theatre/app/tests/node-world.mjs';
import { makeGeo } from '../../../docs/battle-theatre/app/src/geo.mjs';
import { loadRawFromDisk, terrainMeta } from '../../../docs/battle-theatre/app/tools/history-report.mjs';
import { createRealHistory } from '../../../docs/battle-theatre/app/src/history/real.mjs';
import { worldFromUnits } from '../../../docs/battle-theatre/app/src/world-from-units.mjs';
import { Stage } from '../../../docs/battle-theatre/app/src/stage.mjs';
import { minOf } from '../../../docs/battle-theatre/app/src/clock.mjs';
import { loadConflicts, DEFAULT_SCENARIO } from '../../../docs/battle-theatre/app/src/data.mjs';
import { pdfChoices, setChoice, PDF_KEY } from '../../../docs/battle-theatre/app/src/scenario-defaults.mjs';
const raw = loadRawFromDisk(), TM = terrainMeta(), { T } = await nodeWorld(), geo = makeGeo(T), helpers = { civilDawn: m => m + 4 * 60 + 3 };
const L = createRealHistory({ raw, T: TM, helpers }), world = worldFromUnits(T, geo, L), stage = new Stage({ layer: L, world, T, geo });
const conf = await loadConflicts(), sc0 = DEFAULT_SCENARIO(conf);
// what theatre.applyScenario does: the text of the chosen option of every linked conflict drives the arrival of the units linked to it
const byId = new Map(conf.map(c => [c.id, c]));
const load = sc => { sc.optionText = {}; for (const id of (L.meta.linkedConflicts || [])) { const c = byId.get(id); if (!c) continue; const key = sc.choices[id] || 'recommended', opt = c.options.find(o => o.key === key); sc.optionText[id] = opt ? opt.text : ''; } return stage.loadScenario(sc); };
console.log('   linkedConflicts:', (L.meta.linkedConflicts || []).join(','));
const ok = (c, m) => console.log((c ? 'OK   ' : 'FAIL ') + m);
load(sc0);
ok(L.meta.stub === false && L.units.length === 726, `real layer, ${L.units.length} units (spec: 726)`);
ok(L.counts.moving > 0 && L.counts.edge_only > 0 && L.counts.not_drawn > 100, `counts moving ${L.counts.moving}, edge_only ${L.counts.edge_only}, not_drawn ${L.counts.not_drawn} (spec: all >0, not_drawn >100); rejected ${stage.rejected.length} (spec: 0)`);
const grp = () => [...stage.arrivals.values()].filter(a => a.unit.startsWith('us-2c')).map(a => ({ u: a.unit, d: a.default, e: a.earliest, c: a.conflict }));
const before = grp();
ok(before.length > 40 && before.every(a => a.d === minOf(7, 2, 6, 30)) && before.every(a => a.c === 'C-004'), `II Corps: ${before.length} units, defaults ${[...new Set(before.map(a => a.d))].join(',')} (spec: all ${minOf(7, 2, 6, 30)} = 06:30 Jul 2), conflicts ${[...new Set(before.map(a => a.c))].join(',')}`);
const c4 = conf.find(c => c.id === 'C-004'); console.log('   C-004 options:', c4.options.map(o => `${o.key}=${o.label}`).join(' | '));
const opt = c4.options.find(o => o.label === '22:30 Jul 1' || /^22:30 Jul 1/.test(o.label)); console.log('   option "22:30 Jul 1" key:', opt && opt.key);
const sc1 = setChoice(structuredClone(sc0), conf, c4, opt.key); load(sc1); const after = grp();
ok(after.length === before.length && Math.min(...after.map(a => a.d)) === minOf(7, 1, 22, 30) && after.every(a => a.d >= minOf(7, 1, 22, 30)), `with 22:30 Jul 1: min ${Math.min(...after.map(a => a.d))} (spec: ${minOf(7, 1, 22, 30)})`);
ok(after.some(a => a.d === minOf(7, 2, 0) && a.c === null), `a division whose own gate is the date Jul 2 stays at ${minOf(7, 2, 0)} with no conflict: ${after.filter(a => a.d === minOf(7, 2, 0) && a.c === null).length} such units`);
load(sc0); ok(JSON.stringify(grp()) === JSON.stringify(before), 'reset restores the delegated defaults');
const scp = { ...structuredClone(sc0), choices: pdfChoices(conf) }; load(scp); const pd = grp(); ok(pd.every(a => a.d === minOf(7, 2, 6)), `PDF values: II Corps defaults ${[...new Set(pd.map(a => a.d))].join(',')} (spec: ${minOf(7, 2, 6)} = 06:00 Jul 2)`);
ok(Object.values(scp.choices).filter(v => v === 'recommended').length === 47, `PDF choices carry ${Object.values(scp.choices).filter(v => v === 'recommended').length} 'recommended' keys (spec: 47; PDF_KEY=${PDF_KEY})`);
load(sc0);
const id = 'us-5c-1d-vincent-20me', a20 = stage.arrivals.get(id); ok(a20 && a20.default === minOf(7, 2, 7), `20th Maine default ${a20 && a20.default} (spec: ${minOf(7, 2, 7)} = 07:00 Jul 2)`);
const c3 = conf.find(c => c.id === 'C-003'); console.log('   C-003 options:', c3.options.map(o => `${o.key}=${o.label}`).join(' | '));
const v0 = c3.options.find(o => o.key === 'v0'); ok(!!v0, 'C-003 has an option with key v0: ' + (v0 && v0.text));
if (v0) { load(setChoice(structuredClone(sc0), conf, c3, 'v0')); ok(stage.arrivals.get(id).default === minOf(7, 2, 5), `20th Maine with v0: ${stage.arrivals.get(id).default} (spec: ${minOf(7, 2, 5)} = 05:00)`); }
const wx = conf.filter(c => /^CF-/.test(c.id)); ok(wx.length >= 5, `weather conflicts ${wx.length}: ${wx.map(c => c.id).join(', ')} (spec: >= 5)`);
const rain = conf.find(c => c.id === 'CF-JUL4-RAIN-TIMING'); ok(rain && rain.options.length > 2, `CF-JUL4-RAIN-TIMING options ${rain && rain.options.length} (spec picks index 2)`);
const regs = conf.filter(c => c.kind === 'register'); ok(regs.length === 47, `register conflicts ${regs.length} (spec: 47)`);
const printed = c4.printed || c4.raw || ''; console.log('   C-004 printed:', JSON.stringify(printed).slice(0, 200));
// test 4 facts
const i = L.focus, u = L.units[i], arr = stage.arrivals.get(u.id); console.log(`   focus unit ${u.id} (${u.name}) tier ${u.tier}; earliest ${arr.earliest} default ${arr.default}`);

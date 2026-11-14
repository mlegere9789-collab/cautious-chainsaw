// Pre-check (node only) of the data-dependent constants of casualties.spec.mjs against the real layer at HEAD: the unit card's loss section and the running count.
import { nodeWorld } from '../../../docs/battle-theatre/app/tests/node-world.mjs';
import { makeGeo } from '../../../docs/battle-theatre/app/src/geo.mjs';
import { loadRawFromDisk, terrainMeta } from '../../../docs/battle-theatre/app/tools/history-report.mjs';
import { createRealHistory } from '../../../docs/battle-theatre/app/src/history/real.mjs';
import { worldFromUnits } from '../../../docs/battle-theatre/app/src/world-from-units.mjs';
import { Stage } from '../../../docs/battle-theatre/app/src/stage.mjs';
import { minOf } from '../../../docs/battle-theatre/app/src/clock.mjs';
import { loadConflicts, DEFAULT_SCENARIO } from '../../../docs/battle-theatre/app/src/data.mjs';
import { lossSection, lossLive, gunsRows } from '../../../docs/battle-theatre/app/src/ui/card-sections.mjs';
const raw = loadRawFromDisk(), TM = terrainMeta(), { T } = await nodeWorld(), geo = makeGeo(T), helpers = { civilDawn: m => m + 4 * 60 + 3 };
const L = createRealHistory({ raw, T: TM, helpers }), world = worldFromUnits(T, geo, L), stage = new Stage({ layer: L, world, T, geo });
const conf = await loadConflicts(), sc = DEFAULT_SCENARIO(conf), byId = new Map(conf.map(c => [c.id, c]));
sc.optionText = {}; for (const id of (L.meta.linkedConflicts || [])) { const c = byId.get(id); if (!c) continue; const key = sc.choices[id] || 'recommended', opt = c.options.find(o => o.key === key); sc.optionText[id] = opt ? opt.text : ''; }
stage.loadScenario(sc); stage.apply(minOf(7, 1, 15, 20));
const th = { layer: L, stage, state: { scenario: sc, t: minOf(7, 1, 15, 20) } };
const ok = (c, m) => console.log((c ? 'OK   ' : 'FAIL ') + m);
const inner = h => h.replace(/<\/(dt|dd|th|td|h3|p|div|tr|li)>/g, ' ').replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, '').replace(/&middot;|&#183;/g, '·').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
const id = 'us-1c-3d-biddle-121pa', i = L.units.findIndex(u => u.id === id), u = L.units[i];
const txt = inner(lossSection(th, u)) + ' On the map now ' + inner(lossLive(th, i, minOf(7, 1, 15, 20)));
for (const re of [/Loss share\s+130 \(range 130-131/, /Killed\s+17-18/, /Wounded\s+80-83/, /Missing\s+30-31/, /On the map now\s+strength \d+-\d+ of 308 . down \d+/, /all 130 of its losses fall where it stands on the map/, /plausible-procedural: the nearest printed loss figure/, /Busey and Martin not available/, /the middle of each range \(DEC-008/, /EN-009\s+1 Jul 15:00 to 15:30 . timeline row T1-147 \(seeded unverified\) . OR27 audit: SUPPORTED BY OR/]) ok(re.test(txt), String(re));
console.log('   text:', txt.slice(0, 1400));
console.log('   casualties object:', JSON.stringify({ kind: u.casualties.kind, total: u.casualties.total, fates: u.casualties.fates, tier: u.casualties.tier, clauses: u.casualties.engagement_clauses }), 'drawn strength', u.strength.drawn);
const g2 = L.units.findIndex(x => x.id === 'us-1c-art-2me'); console.log('   2me guns rows:', inner(gunsRows(L.units[g2])).slice(0, 200), '| lossSection:', inner(lossSection(th, L.units[g2])).slice(0, 200));
const pg = L.units.findIndex(x => x.id === 'cs-1c-pickett-garnett'); console.log('   pickett-garnett lossSection:', inner(lossSection(th, L.units[pg])).slice(0, 260), '| live:', inner(lossLive(th, pg, minOf(7, 1, 15, 20))));

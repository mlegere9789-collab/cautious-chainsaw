// RECORD COPY. The imports below are relative to tmp/bt-spec/pre/ (a scratch folder, not committed): to run it, copy it there first.
// Pre-check (node only, no browser) of arrival.spec.mjs test 2 ("across the whole window ... nothing is drawn before its window opens, and the renderer was told exactly what the stage holds"):
// the same loop over the same 282 times, with stage.apply(t) in place of a frame, and world.unitF (the table the host uploads) in place of host.lastUnits. Not a spec: it prints what the spec would count.
//   node tmp/bt-spec/pre/arrival-window-node.mjs
import { nodeWorld } from '../../../docs/battle-theatre/app/tests/node-world.mjs';
import { makeGeo } from '../../../docs/battle-theatre/app/src/geo.mjs';
import { loadRawFromDisk, terrainMeta } from '../../../docs/battle-theatre/app/tools/history-report.mjs';
import { createRealHistory } from '../../../docs/battle-theatre/app/src/history/real.mjs';
import { worldFromUnits } from '../../../docs/battle-theatre/app/src/world-from-units.mjs';
import { Stage } from '../../../docs/battle-theatre/app/src/stage.mjs';
import { loadConflicts, DEFAULT_SCENARIO } from '../../../docs/battle-theatre/app/src/data.mjs';
const raw = loadRawFromDisk(), TM = terrainMeta(), { T } = await nodeWorld(), geo = makeGeo(T), helpers = { civilDawn: m => m + 4 * 60 + 3 };
const L = createRealHistory({ raw, T: TM, helpers }), world = worldFromUnits(T, geo, L), st = new Stage({ layer: L, world, T, geo });
const conf = await loadConflicts(), sc = DEFAULT_SCENARIO(conf), byId = new Map(conf.map(c => [c.id, c]));
sc.optionText = {}; for (const id of (L.meta.linkedConflicts || [])) { const c = byId.get(id); if (!c) continue; const key = sc.choices[id] || 'recommended', opt = c.options.find(o => o.key === key); sc.optionText[id] = opt ? opt.text : ''; }
st.loadScenario(sc);
const n = st.layer.units.length, ids = st.layer.units.map(u => u.id); let samples = 0, mismatches = 0, drawnEarly = 0, maxPresent = 0, nonDrawnShown = 0;
for (let t = 36000 + 7; t < 63360; t += 97) {
  st.apply(t); samples++; const sent = st.w.unitF; let sentOn = 0, early = 0;
  for (let i = 0; i < n; i++) { const on = Math.abs(sent[i * 12]) < 1e5; if (on) { sentOn++; if (!st.layer.units[i].drawn) nonDrawnShown++; } const p = st.presence[ids[i]]; if (on && (!p || t * 60 < p.from)) early++; if (on !== !!st.present[i]) mismatches++; }
  drawnEarly += early; maxPresent = Math.max(maxPresent, sentOn);
}
const ok = (c, m) => console.log((c ? 'OK   ' : 'FAIL ') + m);
console.log(`${samples} samples (spec: 282 frames); units ${n}; drawn ${st.layer.counts.drawn}`);
ok(drawnEarly === 0, `units on the table before their window opened: ${drawnEarly} (spec: 0)`); ok(mismatches === 0, `table/stage mismatches: ${mismatches} (spec: 0)`);
ok(maxPresent === st.layer.counts.drawn, `most units on the field at once ${maxPresent} of ${st.layer.counts.drawn} drawn (spec: equal)`); ok(nonDrawnShown === 0, `units the layer does not draw but the table shows: ${nonDrawnShown} (spec: 0)`);

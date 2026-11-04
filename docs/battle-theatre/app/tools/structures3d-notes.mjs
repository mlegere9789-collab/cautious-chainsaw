// Writes app/STRUCTURES-3D-NOTES.md: the geometry inventory (every record of structures/structures.json and every feature of the basemap1863 layers), the drawing rules, the generic
// dimensions, the state mapping and the measured cost. Every number comes from data/structures3d.json, data/structures3d-inventory.json and tests/results-structures3d.json.
//   node docs/battle-theatre/app/tools/structures3d-notes.mjs            write
//   node docs/battle-theatre/app/tools/structures3d-notes.mjs --check    fail if the file is stale
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { nodeTerrain, BT } from './node-terrain.mjs';
import { makeStateEngine } from '../src/structures/state.mjs';
import { buildModel, FENCE_GEN } from '../src/structures/model.mjs';
import { GEN } from '../src/structures/geom.mjs';
import { Gazetteer } from '../src/history/gazetteer.mjs';
import { buildObjects } from '../src/history/objects.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), APP = path.resolve(here, '..');
const rj = (...p) => JSON.parse(fs.readFileSync(path.join(...p), 'utf8'));
const data = rj(APP, 'data/structures3d.json'), inv = rj(APP, 'data/structures3d-inventory.json'), resFile = path.join(APP, 'tests/results-structures3d.json'), res = fs.existsSync(resFile) ? rj(resFile) : null;
const T = await nodeTerrain();
const structures = rj(BT, 'structures/structures.json'), sched = rj(BT, 'structures/state_schedule.json'), works = rj(BT, 'structures/works_stages.json'), hospitals = rj(BT, 'structures/hospitals.json');
const E = makeStateEngine({ structures, sched, works, hospitals }), gaz = new Gazetteer(rj(APP, 'data/gazetteer.json')), OB = buildObjects({ raw: { structures, works }, gaz });
const M = buildModel({ data, T, engine: E, workObjs: OB.list.filter(o => o.at), workProgress: OB.progress });
const c = M.counts, cell = s => String(s ?? '').replace(/\|/g, '/').replace(/\s+/g, ' ').trim(), cut = (s, n) => (cell(s).length > n ? cell(s).slice(0, n - 1) + '…' : cell(s));
const L = [];
const row = (...a) => L.push('| ' + a.map(cell).join(' | ') + ' |');
const head = (...a) => { row(...a); L.push('|' + a.map(() => '---').join('|') + '|'); };
const byLayer = (name, dec) => inv.features.filter(f => f.layer === name && (!dec || f.decision === dec));

L.push('# The 1863 structures in the Battle Theatre: geometry inventory and drawing rules', '');
L.push('Written by `app/tools/structures3d-notes.mjs` from `app/data/structures3d.json`, `app/data/structures3d-inventory.json` (both written by `app/tools/build-structures3d.mjs`) and `app/tests/results-structures3d.json`. Rebuild it with that script rather than editing it.', '');
L.push('**Status: a reconstruction.** Every drawn object is a copy of a feature of the 1863 base-map layers (`docs/basemap1863/features/`), which are themselves reconstructions from period maps and later documentation, with their own error bounds. Every state change is read from the state schedule of the plan (`structures/state_schedule.json`), whose rows are `seeded_unverified`: transcribed from the plan, no primary source opened to confirm them. Nothing here claims 100 percent accuracy, and nothing is drawn that no source in the repository places.', '');

L.push('## 1. What is drawn, what is not', '');
head('Class', 'Drawn', 'How', 'Not drawn');
row('Fences and walls', `${c.fences} lines, ${data.meta.counts.fences_len_m} m, ${c.panels} panels (${c.panelsByStyle.rail} rail, ${c.panelsByStyle.stone} stone, ${c.panelsByStyle.worm} worm)`, 'instanced panels (posts and rails, or stone courses) along the confirmed lines; line impostors mid-range; nothing beyond ' + M.lod.farD / 1000 + ' km', `${byLayer('basemap fences', 'not drawn').length} of 392 fence candidates (356 not confirmed on the period sheet, 6 outside the ground)`);
row('Buildings', `${c.buildings} footprints (extruded: walls, gable roof), ${c.masses} borough masses (flat tops, schematic)`, 'one static mesh, per-object state; shadows cast', `${structures.structures.filter(s => s.id.startsWith('bld-')).length - structures.structures.filter(s => s.id.startsWith('bld-') && inv.records.find(r => r.id === s.id).decision.startsWith('drawn')).length} of the ${structures.structures.filter(s => s.id.startsWith('bld-')).length} building records have no footprint (marker or nothing)`);
row('Markers', `${c.markers} points (${data.meta.counts.markers_building_points} building symbols, ${data.meta.counts.markers_bridges} bridges/fords/crossings, trestle and depot)`, 'a labelled pole with a diamond head, instanced; never a building', '73 machine-detected plate symbols not reviewed by hand; 13 rejected; the rest outside the ground');
row('Roads, lanes, railway', `${c.roads} lines (${data.meta.counts.roads} roads, ${data.meta.counts.lanes} lanes, ${data.meta.counts.rail} railway lines)`, 'ground ribbons on the terrain, blended, under the units', 'post-1863 railways, unknown extents, 18 named lanes with no traced line, 7 roads outside the ground');
row('Works and pre-existing walls', `${c.works} rings at named places (no mapped line exists for any)`, 'labelled rings of the place\'s own uncertainty (2D, as before); selectable', 'works with no finish time in the record (listed as open gaps)');
L.push('', `GPU memory of the structures: ${res && res.memory ? res.memory.structuresKB + ' KB' : 'not yet measured'}; draw calls per frame 3 to 7; triangles at the default view ${res ? Math.round((res.frame.find(r => r.structures && r.api === 'webgpu' && r.view === 'overview') || {}).tris || 0) : '—'}.`, '');

L.push('## 2. Rules applied', '');
L.push('1. **No invented geometry.** A building footprint is a polygon of the basemap catalogue (the 2023 county outline of a surviving building, a traced roof, or the inked extent of the 1868-69 survey symbols). A line is a line of the basemap (the modern OSM mapping of a fence, confirmed against the period sheet at 25 m error). Where only a point exists the object is a labelled pole.');
L.push('2. **Existence and position carry the tier of the evidence; the form is generic and says so.** The card of every object gives the tier of its existence and position (documented / inferred, from the record and the basemap confidence, the weaker of the two) and, separately, the tier of its form (plausible-procedural unless the record prints the storeys).');
L.push('3. **Dimensions only as printed.** Documented storeys (5 buildings, each checked at build time against the words of its own record) are used; a storey is 3 m (generic). Fences use the generic post-and-rail dimensions the plan prints and flags as generic (rails about 11 ft, height about 5 ft; ECW-PostRail, a non-Gettysburg source). A stone wall is 2.5 ft: the Angle wall was originally about 2-3 ft (P-01, documented) and one critic gives about 2 ft; **no profile is taken from the modern rebuilt walls (48-52 in.)**.');
L.push('4. **Nothing before it existed; nothing pre-placed.** The buildings, fences and roads that are drawn are those the sources say stood in July 1863 and are present from the first frame (no construction animation: PDF B.7.3). No work has a mapped line, so no work is drawn as a 3D object; each is a ring at its named place, absent before its printed start and built over its printed window (`objectProgress`, as before). The avenues (RULE-04) are never drawn. Post-1863 railways are never drawn.');
L.push('5. **State over time** comes from the port of `check_structures.state_at` (tested equal to the Python function on 65,700 evaluations): see section 7.');
L.push('6. **The tier mark stays**: Evidence outlines every object in its tier colour, dash and glyph, as for units.', '');

L.push('## 3. Inventory A: every record of `structures/structures.json` (130)', '');
head('Id', 'Name', 'Kind', 'Geometry source', 'Error bound (m)', 'Tier', 'Drawn or not, and why');
for (const r of inv.records) row(r.id, cut(r.name, 56), r.kind, cut(r.geometry, 90), r.err_m ?? '—', r.tier || '—', `${r.decision}: ${cut(r.reason, 170)}`);
L.push('');

L.push('## 4. Inventory B: every feature of the basemap1863 layers', '');
L.push('One decision for each of the 1,078 features is in `app/data/structures3d-inventory.json` (`features`). Grouped:', '');
head('Layer', 'Decision', 'Group', 'Features', 'Reason');
const grp = new Map(); for (const f of inv.features) { const k = [f.layer, f.decision, f.group, f.decision === 'not drawn' ? f.reason : ''].join('|'); const g = grp.get(k) || { layer: f.layer, decision: f.decision, group: f.group, n: 0, reason: f.decision === 'not drawn' ? f.reason : f.reason.replace(/\(.*$/, '').trim() }; g.n++; grp.set(k, g); }
for (const g of [...grp.values()].sort((a, b) => a.layer.localeCompare(b.layer) || a.decision.localeCompare(b.decision) || b.n - a.n)) row(g.layer, g.decision, g.group, g.n, g.reason);
L.push('');
L.push('### 4.1 Fences and walls drawn (' + data.fences.length + ' lines)', '');
head('Line', 'OSM way', 'Style drawn', 'Length (m)', 'Error (m)', 'Sheet check (continuity)', 'Attributed to', 'Sources');
for (const f of data.fences) row(f.id, f.way, (f.recStyle || f.style) === 'stone' ? 'stone wall (generic 0.76 m)' : 'rail fence (generic 1.52 m)', f.len_m, f.err, f.check.continuity, f.rec ? `${f.rec.id} (inferred)` : '— (no record names it)', f.src.join(', '));
L.push('', 'The 1863 style of a line is not read from the period sheet. Lines along the Emmitsburg Road (at least 70 percent of the line within 45 m of the road centreline, a rail style, as the record) take that record\'s state rows; every other line has no state row and stays as it is.', '');
L.push('### 4.2 Buildings drawn as footprints (' + c.buildings + ')', '');
head('Id', 'Name', 'Geometry', 'Error (m)', 'Tier', 'Record', 'Height / form basis');
for (const o of M.objects.filter(o => o.cls === 'buildings')) row(o.id, cut(o.name, 52), o.geometry.kind, o.geometry.err, o.tier, o.state_id || '—', `${o.form.height.toFixed(1)} m to the ridge; ${cut(o.form.basis, 100)}`);
L.push('', `The ${c.masses} borough masses (\`STR-BORO-MASS-nnn\`) are the inked extent of the building symbols of the Warren plate, error 20 m; they merge neighbouring buildings and may include buildings put up between July 1863 and 1869. They are drawn two storeys high with flat tops, labelled schematic.`, '');
L.push('### 4.3 Markers drawn (' + c.markers + ')', '');
head('Id', 'Name', 'Kind', 'Error (m)', 'Tier', 'Record');
for (const o of M.objects.filter(o => o.cls === 'markers')) row(o.id, cut(o.name, 70), o.meta.kind, o.geometry.err, o.tier, o.state_id || '—');
L.push('');
L.push('### 4.4 Roads, lanes and railway drawn (' + c.roads + ')', '');
head('Id', 'Name', 'Surface', 'Width (m, generic)', 'Error (m)', 'Tier of the surface', 'Basis of the surface');
for (const o of M.objects.filter(o => o.cls === 'roads')) row(o.id, cut(o.name, 60), o.form.surface, o.form.width, o.geometry.err, o.form.tier, cut(o.meta.surface_basis, 120));
L.push('');
L.push('### 4.5 Not drawn: groups with examples', '');
head('Layer', 'Reason', 'Features', 'Examples');
for (const g of data.notDrawnGroups) row(g.layer, g.reason, g.n, g.ids.join(', '));
L.push('');

L.push('## 5. Hospitals', '');
L.push(`${data.hospitals.length} of the 23 hospitals of \`structures/hospitals.json\` name a building that is drawn or marked (\`structure_ids\`, the record's own link). A badge ("H") is shown on the building while the hospital is open: hollow inside the printed date window of its setup or closing, solid after it, gone after the closing window. A hospital with no printed setup time gets no timed badge (its card says so). The others have no building geometry or name no building:`, '');
head('Hospital', 'Name', 'Host building', 'Decision');
for (const h of inv.hospitals) row(h.id, cut(h.name, 50), h.host.join(', ') || '—', cut(h.decision + ': ' + h.reason, 150));
L.push('');

L.push('## 6. Generic dimensions and forms (all plausible-procedural unless stated)', '');
head('Item', 'Value', 'Basis');
row('Storey height', `${GEN.storeyH} m`, 'generic');
row('Roof', `gable, ${Math.round(Math.atan(GEN.pitch) * 180 / Math.PI)} degree pitch over the minimum bounding rectangle of the footprint, ridge along the long side; flat for masses`, 'generic form (roof material is not recorded except for a few shingle roofs; the colour is generic)');
row('Eave heights', 'house 6 m (2 storeys), barn 4.8-5.2 m, outbuilding 3 m, institutional 7.5 m, college/seminary 9 m, church 7.5 m, other 4.5 m', 'class defaults by catalogue subtype; the five documented storey counts override them');
row('Rail fence', `${FENCE_GEN.rail.h} m high, ${FENCE_GEN.rail.len} m panels, posts and four rails`, FENCE_GEN.rail.basis);
row('Stone wall', `${FENCE_GEN.stone.h} m high, 0.6 m thick`, FENCE_GEN.stone.basis);
row('Road width', 'turnpike 6.5 m, county road 5.5 m, township road 4.5 m, lane 3 m, railway bed 4 m, grade 5 m', 'the widths the base map draws (BUILD.md 4.3), generic, not measured');
row('Road surface', 'macadam for the turnpikes (documented for the Baltimore and Chambersburg pikes; the York Pike by class: inferred), dirt otherwise (NPS: most were dirt)', 'NPS-TREAT-2004 p20, 22-23; flat colours, no photograph claim');
row('Colours', 'flat colours by material class (brick, stone, log, frame, generic), shingle roofs, charred when burned', 'no photograph is claimed; material only where the catalogue says');
L.push('');

L.push('## 7. State over time', '');
L.push('The state of an object is `state_at(structure id or part id, time, scenario)` of `tools/bt/check_structures.py`, ported to `src/structures/state.mjs` and tested equal on every record, part, hospital and scenario at a grid of times and at every printed bound of every row (+-1 minute). The page quantizes the time to a quarter minute, so the buffer the shaders read is a pure function of that time and the chosen readings: the same minute gives the same picture however it was reached (tested through seeks, detours and playback).', '');
L.push('| The schedule says | Drawn as |', '|---|---|');
L.push('| the object is in one state (before, after, or no row) | that state (A = B) |', '| a change inside a printed clock window (`transitioning`) | A and B mixed by progress through the window: panels fall one by one, burning and scarring spread over the surface by world cell (a screen-door), so the picture grows with the clock |', '| a change dated only to a day (`indeterminate within date window`) | half and half (a 50 percent screen-door of the two states) for the whole window; the card says "Date only" and why. It is **not** put at a guessed hour: the Bliss and Sherfy fires therefore show half burned all of 3 July and fully burned from midnight (the printed "morning" and "afternoon" are not parsed as bounds in the schedule) |');
L.push('', 'Only physical states are drawn: burned, shell and bullet damage (building and marker); splintered, breached, dismantled, felled, knocked down, destroyed, missing, burned (fence). Role and use states (hospital, headquarters, school, occupied) change no pixel and are on the card; hospitals also get the badge above. `tests/structures3d.test.mjs` fails if a physical-sounding state of a drawn object is not mapped.', '');
L.push('Readings of the conflicts: the eleven printed defaults PD-01..PD-11 (`state_schedule.json`, all PENDING OWNER) are selectable in Sources ("How the structures follow these conflicts"), and each object card has a "Reading of the record" selector for its own scenarios; the card choice wins. Nothing is chosen for the viewer.', '');

L.push('## 8. Rendering, levels of detail and measured cost', '');
L.push(`Hooks: the prototype renderers call an optional \`ext\` at the end of the shadow and scene passes (two null-guarded lines in each of \`webgpu.mjs\` and \`webgl2.mjs\`); everything else is in \`src/structures/\`. One draw call per class: roads (static ribbons, \`less-equal\` depth with a lift that grows with distance, alpha-blended edges), buildings (static mesh with per-object state, cast and receive shadows), fence panels near (full detail, within ${M.lod.nearD} m), stone panels near, fence impostors (a thin ribbon plus a vertical plane, ${M.lod.nearD} m to ${M.lod.farD / 1000} km), markers (instanced, scaled with distance so they stay visible). Culling: fence panels are culled in chunks of 12 by distance and by frustum on the CPU and compacted into small instance buffers; nothing beyond ${M.lod.farD / 1000} km.`, '');
if (res && res.frame && res.frame.length) {
  L.push(`Machine: ${res.machine && res.machine.adapter ? `${res.machine.adapter.vendor || ''} ${res.machine.adapter.arch || ''} ${res.machine.adapter.desc || ''}`.trim() : '—'}, ${res.machine && res.machine.browser ? 'Chrome ' + res.machine.browser : ''}, 1920 x 1080, 3 Jul 13:30 (the real layer: 430 units). Frame times as a person sees them (display paced), GPU and CPU times per frame; "off" is the same page with \`?structures=off\`.`, '');
  head('API', 'View', 'Structures', 'Frame p50 / p95 (ms)', 'CPU p50 / p95 (ms)', 'GPU p50 / p95 (ms)', 'Draws', 'Triangles', 'GPU memory total (MB)', 'Structures memory (KB)', 'Long tasks');
  for (const r of res.frame) row(r.api, r.view, r.structures ? 'on' : 'off', `${r.p50} / ${r.p95}`, `${r.cpuP50} / ${r.cpuP95}`, r.gpuP50 == null ? '—' : `${r.gpuP50} / ${r.gpuP95}`, r.draws ?? '—', r.tris ?? '—', r.memMB, r.structuresKB || '—', r.long);
  L.push('', 'The PDF gate Q15 is a placeholder of 6 to 11 ms at 1080p; the existing gate of the page (frame p95 at most 20 ms) holds with the structures on in every case above. WebGL2 has no GPU timer here (`—`).', '');
} else L.push('Frame cost: not yet measured (run `tests/structures3d.spec.mjs`).', '');

L.push('## 9. Provisional builder choices (DEC-016)', '');
L.push('Logged in `GOVERNANCE/decision_log.md` as DEC-016, each reversible, none a scope reduction: (1) the 229 borough masses are drawn, as schematic masses, and can be switched off in Views; (2) a date-only change is shown half and half for its whole window; (3) the fences along the Emmitsburg Road take the record\'s state rows by a stated proximity rule (inferred); (4) point-only structures are poles, never buildings; (5) generic heights and widths as in section 6; (6) works stay rings; (7) the structures are drawn on the placeholder layer too (`?structures=off` removes them).', '');

L.push('## 10. Not done, and known limits', '');
const noGeo = inv.records.filter(r => r.id.startsWith('bld-') && r.decision === 'not drawn').map(r => r.id.replace('bld-', '')), ptOnly = inv.records.filter(r => r.id.startsWith('bld-') && r.decision === 'marker only').map(r => r.id.replace('bld-', ''));
L.push(`- ${noGeo.length} building records have no geometry in the repository (${noGeo.join(', ')}): listed, not drawn. ${ptOnly.length} have only a point (${ptOnly.join(', ')}); the Sherfy and Codori barns and the Bliss house and barn are poles, not buildings. The McPherson farmhouse (burned 1895) has no geometry either.`);
L.push('- Towers, cupolas and porches are not drawn: the 70 ft clock tower of the courthouse and the cupolas of Schmucker Hall and Pennsylvania Hall (S-002 marks one as a signal post) are documented but have no mapped footprint, and a role change of a cupola is not a pixel change.');
L.push('- Footprints of surviving buildings are today\'s outlines; the 1863 form may be smaller (the basemap says so per feature and the card repeats it). Where a later building stands on an 1863 site (the Spangler barn of 1935) the card says what the outline represents.');
L.push('- 1863 fence styles (worm, board, picket, iron) are recorded by name only: no line in the repository carries them, so none is drawn; the worm panel mesh exists and is used for any line the record styles `worm`.');
L.push('- No work has a mapped line (the rings stay 2D marks); no earthwork, gun pit or traverse is drawn in 3D, and none is derived from modern rebuilt profiles.');
L.push('- The ground is the modern ground (roads and cuts of today). Road ribbons are laid on it; the modern road below can show through where the 1863 centreline is off by its error (15 to 37 m).');
L.push('- Smoke, fire and damage are marks on surfaces, not simulated: a burned building loses its roof and darkens; no flames are drawn.');
const outside = {}; for (const f of inv.features) if (f.group === 'outside') outside[f.layer] = (outside[f.layer] || 0) + 1;
L.push(`- Features outside the loaded 6.2 x 6.1 km are listed as outside: ${Object.entries(outside).map(([k, v]) => `${v} of ${k.replace('basemap ', '')}`).join(', ')}.`);
L.push('');
const text = L.join('\n') + '\n';
const file = path.join(APP, 'STRUCTURES-3D-NOTES.md');
if (process.argv.includes('--check')) { if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== text) { console.error('STRUCTURES-3D-NOTES.md is stale: run node docs/battle-theatre/app/tools/structures3d-notes.mjs'); process.exit(1); } console.log('notes current'); process.exit(0); }
fs.writeFileSync(file, text); console.log('wrote', file, text.length, 'bytes');

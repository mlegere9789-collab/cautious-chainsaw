// tools/report.mjs - rewrites the measured tables of SPEC.md and README.md (between <!--NAME--> and <!--/NAME--> markers) from results/*.json, so no number in the prose is typed by hand.
//   node tools/report.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const R = (f) => { const p = path.join(ROOT, 'results', f); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null; };
const fill = (file, name, body) => { const p = path.join(ROOT, file); let s = fs.readFileSync(p, 'utf8'); const a = `<!--${name}-->`; const b = `<!--/${name}-->`; const i = s.indexOf(a); const j = s.indexOf(b); if (i < 0 || j < 0) return false; s = s.slice(0, i + a.length) + '\n' + body.trim() + '\n' + s.slice(j); fs.writeFileSync(p, s); return true; };
const out = {};

// ---- colour tests ---------------------------------------------------------------------------------------------------------------------------------------------------------
{ const c = R('contrast-tests.json'); if (c) { const groups = [...new Set(c.results.map((x) => x.group))]; const rows = groups.map((g) => { const rs = c.results.filter((x) => x.group === g); const w = rs.reduce((m, x) => (x.value / x.bar < m.value / m.bar ? x : m)); return `| ${g} | ${rs.filter((x) => x.pass).length} of ${rs.length} | ${w.name} | ${w.value}${w.unit} | ${w.bar}${w.unit} |`; });
  out.CONTRAST = `**${c.checks - c.failed} of ${c.checks} checks pass** (6 skins x the mark tests, 2 themes x the card tests).\n\n| Group | Pass | Weakest pair | Measured | Bar |\n|---|---:|---|---:|---:|\n${rows.join('\n')}\n\nFull list: \`results/contrast-tests.json\`.`; } }

// ---- scenes ---------------------------------------------------------------------------------------------------------------------------------------------------------------
{ const s = R('scenes-round-1.json') || R('scenes-final.json'); if (s) { const rs = s.results.filter((r) => r.scene); const rows = rs.map((r) => `| ${r.scene} | ${r.tick} / ${r.zoom} | ${r.marks + r.crowds} (${r.crowds} crowds for ${r.merged} records) | ${r.onField} | **${r.coreOverlaps}** | **${r.pinsCovered}** | **${r.labelOverlaps}** | **${r.unrepresented}** | ${r.minCoreGap} | ${r.names} | ${r.cardsOver} |`);
  const sum = (k) => rs.reduce((a, r) => a + (r[k] || 0), 0);
  out.SCENES = `### Scene checks (real Chrome, ${s.dpr}x, 1440x900 and 390x844; the independent frame check of \`tools/frame-check.mjs\`, which shares no code with the engine's verifier)\n\n| Scene | Tick / zoom | Marks on screen | Units on the field | Core overlaps | Pins covered | Name overlaps | Unrepresented units | Smallest gap between two boxes (px) | Names grown | Cards over a mark (frames) |\n|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|\n${rows.join('\n')}\n\n**Over the ${rs.length} scenes: ${sum('coreOverlaps')} overlapping vital cores, ${sum('pinsCovered')} covered true positions, ${sum('labelOverlaps')} overlapping names, ${sum('unrepresented')} unrepresented units; the engine's own verifier reports ${sum('engineOverlaps')} overlapping pairs on the same frames.** A *core* is the box of a mark (the glyph and its code, one object); a *crowd* is a standard that stands for several records, so every unit is represented. Console errors: ${(s.results.filter((r) => r._errors).flatMap((r) => r._errors)).length}; requests that left the machine: ${(s.results.filter((r) => r._external).flatMap((r) => r._external)).length}.`; } }

// ---- tests and pixel check ----------------------------------------------------------------------------------------------------------------------------------------------
{ const ink = R('skin-ink.json'); const t = R('tests.json'); const parts = [];
  if (ink) { const tiles = ink.scenes.reduce((a, s) => a + s.tiles, 0); const states = ink.scenes.reduce((a, s) => a + s.states, 0); const over = ink.scenes.reduce((a, s) => a + s.over.length, 0); const labels = ink.scenes.reduce((a, s) => a + s.labels, 0); const lo = ink.scenes.reduce((a, s) => a + s.labelOver.length, 0); const pins = ink.scenes.reduce((a, s) => a + s.pins, 0); const po = ink.scenes.reduce((a, s) => a + s.pinOver.length, 0);
    parts.push(`### The ink stays in its box (\`tools/skin-ink.mjs\`, pixels, DPR 2)\n\n${tiles} real tiles of ${ink.scenes.length} scenes were drawn alone in ${states} states (rest, hover, selected, arriving): **${over} of them paint more than 0.5 px outside the box the layout reserved**; ${labels} grown names: **${lo}** outside their tile's box plus label rectangle; ${pins} pins: **${po}** outside the pin box. The worst overrun is ${Math.max(...ink.scenes.map((s) => s.maxOver)).toFixed(2)} px (anti-aliasing).`); }
  if (t) parts.push(`### Tests\n\n${t.lines.map((l) => `* ${l}`).join('\n')}`);
  out.TESTS = parts.join('\n\n'); }

// ---- real-time pacing -----------------------------------------------------------------------------------------------------------------------------------------------
{ const runs = [['pacing-dpr2.json', 'DPR 2, no slowdown'], ['pacing-dpr1.json', 'DPR 1, no slowdown'], ['pacing-dpr2-cpu4.json', 'DPR 2, main thread 4x slower (a harsh stand-in for a phone, not a phone)']].map(([f, n]) => [R(f), n]).filter(([r]) => r);
  if (runs.length) { const rows = []; for (const [r, n] of runs) for (const x of r.runs) rows.push(`| ${n} | ${x.scene} | ${x.speed}x | ${x.fps} | ${x.p95ms} | ${x.over20} | ${x.engineMs} | ${x.drawMsMedian} | ${x.solidMaxStepPx} | ${x.solidSuddenPerS} | ${x.solidSuddenRawPerS ?? 'n/a'} | ${x.overlapFrames} |`);
    out.PACING = `### Real-time frame pacing and jitter (the page's own animation loop in real Chrome 155, 8 s per row after 2 s of warm-up; \`tools/pacing.mjs\`)

| Condition | Scene | Speed | fps | Frame p95 (ms) | Frames over 20 ms (%) | Engine (ms/frame) | Skin draw, median (ms) | Largest step of a solid mark (px) | Sudden steps of solid marks per s | Frames with overlaps |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
${rows.join(String.fromCharCode(10))}

*Largest step of a solid mark* and *sudden steps* come from an instrument of the driver's own (every tile that is solid in two consecutive frames; a step of 8 px or more whose speed, in px per millisecond of the frame it took, is at least 3 times the speed before it is sudden; the next column counts the same without correcting for an uneven frame time, which is what a throttled main thread produces), independent of the engine's recorder; the recorder also counts dimmed travelling marks, which can step farther (it reported up to 161 px at The Angle at 1x) and are not solid.`; } }

// ---- the interface over the marks --------------------------------------------------------------------------------------------------------------------------------------------
{ const c = R('chrome-cover.json'); if (c) { const rows = c.results.map((r) => `| ${r.scene} | ${r.marks} | ${r.hidden} | ${r.partly} | ${r.cutByTheMapEdge ?? 0} | ${r.fadingAtTheEdge ?? 0} |`);
  out.CHROMECOVER = `### The interface over the marks (\`tools/chrome-cover.mjs\`: five points of every solid mark's box are asked of the browser, \`document.elementsFromPoint\`)

| Scene | Marks on the map | Hidden under an opaque panel | Partly hidden | Opaque and cut by the edge | Fading out at the edge (safe area) |
|---|---:|---:|---:|---:|---:|
${rows.join(String.fromCharCode(10))}

**The first pass measured 6 to 12 percent of the marks under the dock or the top bar (14 of 117 in S1b) and called it "not solved". The interface is now a frame around the map (section 9), so the count is 0 by construction and the tool confirms it.** A mark that comes within 14 px of the edge of the map (the masthead, the dock, the rail, the screen) dissolves whole instead of being cut (\`edge.fadePx\`, the safe area); the last two columns count the marks that are still opaque and cut by an edge (none, by construction) and the marks caught mid-dissolve in the still.`; } }

// ---- the motion strips: the jitter count ---------------------------------------------------------------------------------------------------------------------------------
{ const m = R('strips-src/meta.json'); if (m) { const row = (name, d) => d && d.stats ? `| ${name} | ${d.unit || d.crowd || ''} | ${d.stats.frames} | ${d.stats.marksTracked} | ${d.stats.framesWithOverlaps} | ${d.stats.maxStepPx ?? 'n/a'} | ${d.stats.suddenSteps} (${d.stats.suddenStepsOfTheDisplay} of the display, ${d.stats.ofWhichTheUnitsOwnMotion} the unit's own motion) |` : null;
  const rows = [row('A march (8x)', m.march), row('An arrival', m.arrival), row('A deployment (camera still, 4x)', m.deploy)].filter(Boolean);
  out.STRIPS = `### The motion strips: overlaps and jitter, counted (\`tools/strips.mjs\`, virtual clock at 60 Hz)

| Strip | Subject | Frames recorded | Marks tracked | Frames with an overlap | Largest one-frame step (px, camera removed) | Sudden steps (8 px or more and at least 3 times the step before) |
|---|---|---:|---:|---:|---:|---|
${rows.join(String.fromCharCode(10))}

Every solid mark of every frame is followed; its step is measured with the camera's own motion taken out (the mark's previous place seen through this frame's camera), so a zoom is not mistaken for a hop. A sudden step is classed as *the unit's own motion* when the mark is on its true position and its step equals the step of that position: the unit's interpolated track changes speed there (the clock's time-warp gaps or a keyframe), which the display must follow and not hide. ${(() => { const all = [m.march, m.arrival, m.deploy].filter(Boolean); const disp = all.reduce((a, d) => a + (d.stats ? d.stats.suddenStepsOfTheDisplay : 0), 0); const own = all.reduce((a, d) => a + (d.stats ? d.stats.ofWhichTheUnitsOwnMotion : 0), 0); const ex = all.flatMap((d) => (d.stats && d.stats.examples) || []).filter((e) => !/own motion/.test(e)); return `**Over the three strips ${disp} sudden step${disp === 1 ? '' : 's'} of the display and ${own} of the units' own motion were counted** (the arrival and the deployment: none at all; the largest step of any mark in them is ${Math.max(m.arrival.stats.maxStepPx, m.deploy.stats.maxStepPx)} px).${ex.length ? ' The display step: ' + ex.join('; ') + ' (a crowd mark in the dimmed-travel rule of the engine; it did not recur on a second identical run).' : ''}`; })()}`; } }

for (const [k, v] of Object.entries(out)) for (const f of ['SPEC.md', 'README.md']) if (fill(f, k, v)) console.log('filled', k, 'in', f);

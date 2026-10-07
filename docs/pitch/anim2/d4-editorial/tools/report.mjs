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
{ const s = R('scenes-final.json'); if (s) { const rs = s.results.filter((r) => r.scene); const rows = rs.map((r) => `| ${r.scene} | ${r.tick} / ${r.zoom} | ${r.marks + r.crowds} (${r.crowds} crowds for ${r.merged} records) | ${r.onField} | **${r.coreOverlaps}** | **${r.pinsCovered}** | **${r.labelOverlaps}** | **${r.unrepresented}** | ${r.minCoreGap} | ${r.names} | ${r.cardsOver} |`);
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
  if (runs.length) { const rows = []; for (const [r, n] of runs) for (const x of r.runs) rows.push(`| ${n} | ${x.scene} | ${x.speed}x | ${x.fps} | ${x.p95ms} | ${x.over20} | ${x.engineMs} | ${x.drawMsMedian} | ${x.solidMaxStepPx} | ${x.solidSuddenPerS} | ${x.overlapFrames} |`);
    out.PACING = `### Real-time frame pacing and jitter (the page's own animation loop in real Chrome 155, 8 s per row after 2 s of warm-up; \`tools/pacing.mjs\`)

| Condition | Scene | Speed | fps | Frame p95 (ms) | Frames over 20 ms (%) | Engine (ms/frame) | Skin draw, median (ms) | Largest step of a solid mark (px) | Sudden steps of solid marks per s | Frames with overlaps |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
${rows.join(String.fromCharCode(10))}

*Largest step of a solid mark* and *sudden steps* come from an instrument of the driver's own (every tile that is solid in two consecutive frames; a step of 8 px or more that is at least 3 times the step before it is sudden), independent of the engine's recorder; the recorder also counts dimmed travelling marks, which can step farther (it reported up to 161 px at The Angle at 1x) and are not solid.`; } }

// ---- the interface over the marks --------------------------------------------------------------------------------------------------------------------------------------------
{ const c = R('chrome-cover.json'); if (c) { const rows = c.results.map((r) => `| ${r.scene} | ${r.marks} | ${r.hidden} (${(100 * r.hidden / r.marks).toFixed(0)}%) | ${r.partly} | ${Object.entries(r.who).map(([k, v]) => k + ' ' + v).join(', ')} |`);
  out.CHROMECOVER = `### The interface over the marks (\`tools/chrome-cover.mjs\`: five points of every solid mark's box are asked of the browser)

| Scene | Marks on screen | Hidden under an opaque panel | Partly hidden | By |
|---|---:|---:|---:|---|
${rows.join(String.fromCharCode(10))}

**This is not solved.** The layout and the popup director treat the dock and the top bar as part of the map; a card never lies on a mark (section 9), but the dock and the top bar do. Panning reveals a hidden mark; no one can see it where it stands.`; } }

for (const [k, v] of Object.entries(out)) for (const f of ['SPEC.md', 'README.md']) if (fill(f, k, v)) console.log('filled', k, 'in', f);

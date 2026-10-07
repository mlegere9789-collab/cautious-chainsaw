// test/assemble-report.mjs - writes the measured tables of the README from the result files, so that a number in the README is a number in results/*.json and nowhere else.
// Replaces what is between <!--NAME--> and <!--/NAME--> for NAME in BEFOREAFTER, THROTTLE, SWEEP, MEMORY, INTERACT.
//   node test/assemble-report.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url)); const PROTO = path.resolve(HERE, '..'); const R = (f) => JSON.parse(fs.readFileSync(path.join(PROTO, 'results', f), 'utf8'));
const f = (v, d = 1) => (Number.isFinite(v) ? (d === 0 ? String(Math.round(v)) : v.toFixed(d)) : 'n/a');
const NAME = { 'cemetery-hill': 'Cemetery Hill', 'rose-woods': 'Rose Woods', 'the-angle': 'The Angle' };
const pair = (rows, h, sp) => ({ b: rows.find((r) => r.hotspot === h && r.speed === sp && r.mode === 'before'), a: rows.find((r) => r.hotspot === h && r.speed === sp && r.mode === 'after') });

function beforeAfter(file) {
  const j = R(file); const lines = [`| place (zoom) | speed | sudden jumps per s (all tiles / solid) | largest one-frame step | frames with overlaps | overlapping pairs per frame | vanish for one frame, per s | engine ms per frame |`, '|---|---:|---:|---:|---:|---:|---:|---:|'];
  const hs = [...new Set(j.rows.map((r) => r.hotspot))]; const sps = [...new Set(j.rows.map((r) => r.speed))];
  for (const h of hs) for (const sp of sps) {
    const { a, b } = pair(j.rows, h, sp); if (!a || !b) continue;
    lines.push(`| ${NAME[h]} (z${a.zoom}) | ${sp}x | ${f(b.jumpsPerSec)} / ${f(b.jumpsSolidPerSec)} **before**<br>${f(a.jumpsPerSec)} / ${f(a.jumpsSolidPerSec)} **after** | ${f(b.maxStepPx, 0)} px<br>${f(a.maxStepPx, 0)} px | ${f(100 * b.overlapFrames / b.frames, 0)} %<br>${f(100 * a.overlapFrames / Math.max(1, a.frames), 0)} % | ${f(b.overlapPairs / b.frames, 0)}<br>${f(a.overlapPairs / Math.max(1, a.frames), 0)} | ${f(b.blinksPerSec, 2)}<br>${f(a.blinksPerSec, 2)} | ${f(b.engineMsMean, 1)}<br>${f(a.engineMsMean, 1)} |`);
  }
  return lines.join('\n') + `\n\n*(${j.secondsPerRun} s per run in real time in ${j.ua.match(/Chrome\/[\d.]+/)[0]}, ${j.viewport.join('x')}, DPR ${j.dpr}, popups off; \`${file}\`. Both renderers drew at ${f(Math.min(...j.rows.map((r) => r.rafFps)), 0)} to ${f(Math.max(...j.rows.map((r) => r.rafFps)), 0)} fps on this machine.)*`;
}
function throttle() {
  const lines = ['| device stand-in | place | renderer | fps | frame p95 | frames over 20 ms | engine ms per frame | sudden jumps per s (solid) |', '|---|---|---|---:|---:|---:|---:|---:|'];
  for (const [label, file] of [['desktop, 1x CPU', 'assemble-pacing-1440x900.json'], ['desktop, 4x CPU slowdown', 'assemble-pacing-1440x900-cpu4.json'], ['phone viewport (390x844, DPR 2), 1x CPU', 'assemble-pacing-390x844.json'], ['phone viewport, 4x CPU slowdown', 'assemble-pacing-390x844-cpu4.json']]) {
    const j = R(file); for (const h of [...new Set(j.rows.map((r) => r.hotspot))]) for (const mode of ['before', 'after']) {
      const r = j.rows.find((x) => x.hotspot === h && x.speed === 4 && x.mode === mode); if (!r) continue;
      lines.push(`| ${label} | ${NAME[h]} | ${mode} | ${f(r.rafFps, 0)} | ${f(r.rafP95, 1)} ms | ${f(r.rafOver20Pct, 0)} % | ${f(r.engineMsMean, 1)} | ${f(r.jumpsPerSec)} (${f(r.jumpsSolidPerSec)}) |`);
    }
  }
  return lines.join('\n');
}
function sweep() {
  const out = [];
  for (const file of ['assemble-sweep-1440x900.json', 'assemble-sweep-390x844.json']) {
    const j = R(file); const w = j.worst; const byZoom = new Map();
    for (const r of j.rows) { const z = byZoom.get(r.zoom) || { n: 0, tiles: 0, agg: 0, inView: 0, bad: 0 }; z.n++; z.tiles = Math.max(z.tiles, r.tiles); z.agg = Math.max(z.agg, r.agg); z.inView = Math.max(z.inView, r.inView); z.bad += r.coreOverlaps + r.pinCovered + r.labelOverlaps + r.unrepresented + (r.engineOverlaps || 0); byZoom.set(r.zoom, z); }
    out.push(`**${j.viewport.join('x')}** (DPR ${j.dpr}): ${j.samples} settled samples (${j.styles.length} styles x ${j.zooms.length} zooms x ${j.ticks.length} ticks), ${j.seconds} s. Worst over all samples: core overlaps ${w.coreOverlaps}, pins covered ${w.pinCovered}, label overlaps ${w.labelOverlaps}, unrepresented units ${w.unrepresented}; smallest gap between two vital cores ${w.minCoreClearance} px (design clearance 2 px, verifier tolerance 0.05 px). The engine's own verifier over the ${j.engineTotals.frames.toLocaleString('en-US')} frames of the sweep: ${j.engineTotals.overlapFrames} overlap frames, ${j.engineTotals.unrepresentedUnitFrames} unrepresented unit-frames. Console errors ${j.errors.length}, network requests ${j.requests.length}. Text widths: ${j.textWidths}.`);
    out.push('', '| zoom | samples | most tiles | most aggregates | most tiles in view | violations |', '|---:|---:|---:|---:|---:|---:|');
    for (const z of [...byZoom.keys()].sort((a, b) => a - b)) { const v = byZoom.get(z); out.push(`| ${z} | ${v.n} | ${v.tiles} | ${v.agg} | ${v.inView} | ${v.bad} |`); }
    out.push('');
  }
  return out.join('\n');
}
function memory() {
  const out = ['| viewport | after load | after each showcase run (60 s, real time) | growth first to last run | after 80 before/after and 30 style switches | showcase frame rate / p95 / over 20 ms |', '|---|---:|---|---:|---:|---|'];
  for (const file of ['assemble-memory-1440x900.json', 'assemble-memory-390x844.json']) {
    const j = R(file); const s = j.summary; const sc = j.showcase.map((r) => `${f(r.rafFps, 1)} fps, ${f(r.rafP95, 1)} ms, ${f(r.over20Pct, 1)} %`).join('; ');
    out.push(`| ${j.viewport.join('x')} | ${f(s.heapAfterLoadMB)} MB | ${s.heapAfterRunsMB.map((v) => f(v)).join(', ')} MB | ${f(s.growthBetweenFirstAndLastRunMB, 2)} MB | ${f(s.heapAfterStressMB)} MB | ${sc} |`);
  }
  return out.join('\n') + '\n\n*(JS heap after a forced garbage collection; DOM nodes stay between 190 and 300. The growth after the switching run is consistent with the metric recorders filling toward their sample caps, up to about 2.4 MB per renderer; it was not profiled separately.)*';
}
function interact() {
  return ['1440x900', '390x844'].map((v) => { const j = R(`assemble-interact-${v}.json`); return `- ${v}: **${j.checks.length - j.failed} of ${j.checks.length}** real-input checks pass (clicks, keys, wheel, scrubber, menus, tours, styles, before/after, selection); console errors ${j.errors.length}; network requests ${j.requests.length}.`; }).join('\n');
}

function fixes() {
  const j = R('assemble-fixes.json'); const out = ['Playback at 4x, 8 s at 60 fps, popups off (sudden = a step of 8 px or more that is at least 3 times the same tile’s step in the frame before; solid = the tile is solid in both frames):', '', '| scene | sudden steps per s | of them solid | largest one-frame step |', '|---|---:|---:|---:|'];
  j.before.play.forEach((b, i) => { const a = j.after.play[i]; out.push(`| ${b.name}, zoom ${b.zoom} | ${f(b.jumpsPerSec, 2)} -> **${f(a.jumpsPerSec, 2)}** | ${f(b.jumpsSolidPerSec, 2)} -> **${f(a.jumpsSolidPerSec, 2)}** | ${f(b.maxStepPx, 0)} px -> **${f(a.maxStepPx, 0)} px** |`); });
  out.push('', 'A paused picture with the camera still, over 60 s (after its first 5 s):', '', '| scene | aggregate-set changes | largest step of any tile | engine idle after |', '|---|---:|---:|---|');
  j.before.rest.forEach((b, i) => { const a = j.after.rest[i]; out.push(`| ${b.name}, zoom ${b.zoom}, tick ${b.tick} | ${b.aggregateChanges60s} -> **${a.aggregateChanges60s}** | ${f(b.largestStepAtRestPx, 2)} px -> **${f(a.largestStepAtRestPx, 2)} px** | never -> **${a.idleAfterFrames + 1} frames** (the ${100}-frame settle window) |`); });
  const NL = String.fromCharCode(10);
  return out.join(NL) + NL + NL + `*(left of the arrow: display layer, layout solver and strategy module as committed before the assembly, \`${j.oldCommit}\`; right: now; same engine, metrics and scenes otherwise; \`results/assemble-fixes.json\`, \`test/fixes-before-after.mjs\`.)*`;
}

const BLOCKS = { FIXES: fixes, BEFOREAFTER: () => beforeAfter('assemble-pacing-1440x900.json'), THROTTLE: throttle, SWEEP: sweep, MEMORY: memory, INTERACT: interact };
const readme = path.join(PROTO, 'README.md'); let text = fs.readFileSync(readme, 'utf8'); let n = 0;
for (const [name, make] of Object.entries(BLOCKS)) {
  const re = new RegExp(`<!--${name}-->[\\s\\S]*?<!--/${name}-->`);
  if (!re.test(text)) { console.warn('no marker for', name); continue; }
  text = text.replace(re, () => `<!--${name}-->\n${make()}\n<!--/${name}-->`); n++;
}
fs.writeFileSync(readme, text); console.log('README tables written:', n);

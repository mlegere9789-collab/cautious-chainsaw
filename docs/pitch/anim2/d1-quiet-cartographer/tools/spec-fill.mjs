// tools/spec-fill.mjs - fills the generated tables of SPEC.md (between <!--NAME--> and <!--/NAME--> markers) from the result files, so no number in the specification is typed by hand.
//   node tools/spec-fill.mjs
import fs from 'node:fs';
import path from 'node:path';
import { D1 } from './lib.mjs';
import { QC_TOKENS } from '../src/skins/quiet-cartographer.spec.mjs';

const R = (n) => { const p = path.join(D1, 'results', n); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null; };
const md = (head, rows) => [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');
const f1 = (x) => (x == null ? '-' : (+x).toFixed(1)); const f2 = (x) => (x == null ? '-' : (+x).toFixed(2));
const S = {};

S.CONTRAST = (() => { const c = R('contrast.json'); if (!c) return '(results/contrast.json missing)'; const rows = Object.entries(c.skins).map(([id, v]) => [id, `${f2(v.worstText.ratio)} (${v.worstText.name}${v.worstText.state ? ', ' + v.worstText.state : ''})`, `${f2(v.worstMark.ratio)} (${v.worstMark.name})`, `${f1(v.sides.minDeltaE)} (Union vs Confederate ${f1(v.sides.unionVsConfederateMin)})`, `${f2(v.sides.greyscaleLuminanceRatio)} : 1`, Object.values(v.verdict).every(Boolean) ? 'pass' : 'FAIL']);
  return md(['skin', 'worst lettering over 35 ground bands (bar 4.5)', 'worst mark over 35 bands (bar 3)', 'smallest CIEDE2000 between any two of the three sides, over four vision types (bar 20)', 'greyscale luminance ratio, Union against Confederate', 'verdict'], rows) + `\n\n${Object.keys(c.skins).length} skins; ${c.fails} failing checks. The ground bands are in the result file (five views per ground, seven percentiles each).`; })();

S.CURVES = (() => { const c = R('curves.json'); if (!c) return '(results/curves.json missing)'; const rows = c.rows.filter((r) => r.timeConstantMs).map((r) => [r.name, `${r.timeConstantMs} ms`, `${r.ms50} / ${r.ms90} / ${r.ms99} ms`, r.source]);
  const fade = c.rows.find((r) => r.durationMs);
  return md(['what', 'time constant', '50 % / 90 % / 99 % reached after', 'where it is set'], rows) + `\n\nFade in or out of a mark: ${fade.durationMs} ms, smoothstep (10 % at ${fade.ms10} ms, 50 % at ${fade.ms50} ms, 90 % at ${fade.ms90} ms). ${c.uiCurve}.`; })();

S.SCENES = (() => { const c = R('scene-checks.json'); if (!c) return '(results/scene-checks.json missing)'; const rows = c.map((r) => [`${r.scene}: ${r.file.replace('shots/round-1/', '').replace('shots/', '')}`, `${r.vp.join('x')} @${r.dpr}x, tick ${r.tick}, zoom ${r.zoom}`, `${r.marks} (${r.inView} in view)`, r.units, `${r.aggregates} (${r.unitsInAggregates} units)`, r.coreOverlaps, r.pinCovered, r.unrepresented, r.minClear, `${r.underChrome} / ${r.inMargin}`, r.cards ? r.cards.over : '-']);
  return md(['scene', 'view', 'marks (in view)', 'units on the field', 'crowd standards (units merged)', 'overlapping cores', 'pins covered', 'units unrepresented', 'smallest gap (px)', 'marks on the interface / within 16 px of it (dissolved)', 'frames with a card on a mark'], rows); })();

S.SWEEPS = (() => { const files = [['sweep-1440x900.json', 'desktop 1440x900, DPR 1'], ['sweep-1440x900-selected.json', 'desktop, a mark selected'], ['sweep-390x844.json', 'phone 390x844, DPR 2'], ['sweep-390x844-selected.json', 'phone, a mark selected']]; const rows = []; const med = (a) => { const b = [...a].sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : null; };
  for (const [f, label] of files) { const r = R(f); if (!r) { rows.push([label, 'missing', '', '', '', '', '', '', '', '']); continue; } const capped = r.rows.filter((x) => x.capped).length; const sel = r.rows.map((x) => x.selectSettle).filter((x) => x != null);
    rows.push([label, `${r.samples} (${r.styles.length} grounds x ${r.zooms.length} zooms x ${r.ticks.length} ticks)`, r.worst.coreOverlaps, r.worst.pinCovered, r.worst.unrepresented, `${r.engineTotals.overlapFrames} of ${r.engineTotals.frames}`, `${r.engineTotals.unrepresentedUnitFrames}`, r.worst.minClear, capped, sel.length ? `${med(sel)} / ${Math.max(...sel)}` : '-', `${r.errors.length} / ${r.requests.length}`]); }
  return md(['sweep', 'settled samples', 'worst overlapping cores', 'worst pins covered', 'worst units unrepresented', 'engine verifier: frames with an overlap', 'unrepresented unit-frames', 'smallest gap in a sampled frame (px; design clearance 1)', 'views where a settling stage ran out of frames (160 per stage, 200 after a click) before the picture was at rest', 'frames to rest after the click: median / most (cap 200)', 'console errors / requests outside the folder'], rows); })();

S.TESTS = (() => { const t = R('tests.json'); if (!t) return '(results/tests.json missing)'; const rows = t.rows.map((r) => [r.file, r.missing ? 'not run' : r.tests, r.missing ? '' : r.pass, r.missing ? '' : r.fail, r.seconds ?? '']); const tot = t.rows.reduce((a, r) => ({ t: a.t + (r.tests || 0), p: a.p + (r.pass || 0), f: a.f + (r.fail || 0) }), { t: 0, p: 0, f: 0 });
  return md(['test file', 'tests', 'pass', 'fail', 'seconds'], rows) + `\n\nTotal ${tot.t} tests, ${tot.p} pass, ${tot.f} fail (node ${t.node}). \`skins.test.mjs\` of the prototype tested three skins that are not in this fork and was removed; \`skin-d1.test.mjs\` replaces it.`; })();

S.PACING = (() => { const out = []; for (const [f, label] of [['pacing-1440x900-dpr1.json', 'DPR 1'], ['pacing-1440x900-dpr2.json', 'DPR 2'], ['pacing-1440x900-dpr1-cpu4.json', 'DPR 1, main thread 4x slower']]) { const r = R(f); if (!r) continue; const rows = r.rows.map((x) => [`${x.place} z${x.zoom}`, `${x.speed}x`, x.camera, x.rafFps, x.rafP95, `${x.rafOver20Pct} %`, x.engineMsMean, `${x.jumpsPerSec} (${x.jumpsSolidPerSec})`, x.maxStepPx, x.overlapFrames, x.unrepresentedUnitFrames]);
  out.push(`${label} (${r.secondsPerRun} s per row, ${r.ua.match(/Chrome\/[0-9.]+/)[0]}):\n\n` + md(['place', 'speed', 'camera', 'frames per second', 'frame p95 (ms)', 'frames over 20 ms', 'engine ms per frame', 'sudden jumps per s (solid)', 'largest one-frame step (px)', 'overlap frames', 'unrepresented unit-frames'], rows)); }
  return out.length ? out.join('\n\n') + '\n\nA sudden jump is a mark that steps 8 px or more in one frame, at least 3 times its step in the frame before. The camera row "moving" pans and zooms continuously while the battle plays; a marching cavalry unit makes large smooth steps, which are not jumps.' : '(no pacing results)'; })();

S.DOMAUDIT = (() => { const a = R('dom-audit.json'); if (!a) return '(results/dom-audit.json missing)'; const rows = a.map((r) => [r.id, r.textsChecked, Math.min(...Object.keys(r.sizesMid).map(Number)), Object.keys(r.sizesMid).sort((x, y) => x - y).join(', '), `${f2(r.worst.dark.ratio)} / ${f2(r.worst.mid.ratio)} / ${f2(r.worst.bright.ratio)}`, `${r.below.dark.length} / ${r.below.mid.length} / ${r.below.bright.length}`, Object.entries(r.radii).map(([k, v]) => `${k} x${v}`).join(', ')]);
  return md(['state', 'text elements', 'smallest px', 'sizes in use (px)', 'worst contrast over dark / middle / bright map (bar 4.5)', 'elements below 4.5', 'corner radii in use'], rows); })();

S.REST = (() => { const r = R('rest-times.json'); if (!r) return '(results/rest-times.json missing)'; const head = ['scene', 'tick', 'zoom', 'Quiet Cartographer', ...(r.prototype ? Object.keys(r.prototype).map((k) => `prototype ${k}`) : [])]; const fmt = (x) => (x.framesToRest < 0 ? 'never (30 s)' : `${x.framesToRest} (${x.seconds} s)`);
  const rows = r.quietCartographer.map((x, i) => [x.scene, x.tick, x.zoom, fmt(x), ...(r.prototype ? Object.values(r.prototype).map((v) => fmt(v[i])) : [])]);
  return md(head, rows) + '\n\nFrames (at 60 per second) until `engine.busy()` is false; the probe gives up at 1,800 frames. The right-hand columns are the same probe on the same scenes with the three skins of the prototype (its own engine, read-only).'; })();

S.TOKENS = (() => { const rows = QC_TOKENS.map(([name, value, doc, o = {}]) => [`\`${name}\``, typeof value === 'string' ? `\`${value}\`` : String(value), o.min != null ? `${o.min} to ${o.max}${o.unit ? ' ' + o.unit : ''}` : (typeof value === 'string' && /^#/.test(value) ? 'colour' : ''), doc.replace(/\|/g, '/')]);
  return `${QC_TOKENS.length} rows (the night values; the day and variant overrides are at the bottom of the spec file):\n\n` + md(['token', 'default', 'range', 'what it does'], rows); })();


S.SELECT = (() => { const r = R('select-motion.json'); if (!r) return '(results/select-motion.json missing)'; const zs = [...new Set(r.rows.map((x) => x.zoom))].sort((a, b) => a - b);
  const rows = zs.map((z) => { const q = r.rows.filter((x) => x.zoom === z); return [z, q.map((x) => x.marksThatMovedOverQuarterPx).join(' / '), Math.max(...q.map((x) => x.firstSecondMax)).toFixed(1), Math.max(...q.map((x) => x.lastFrameAbove005)), Math.max(...q.map((x) => x.after300Max)).toFixed(2)]; });
  return md(['zoom', 'marks that moved more than a quarter pixel after one click (ticks 620 / 346 / 551)', 'largest one-frame step in the first second (px)', 'last frame with any step of 0.05 px or more (-1 = nothing ever moved)', 'largest step after frame 300 (px)'], rows) + `

The mark nearest the middle of the view is selected after the picture has been at rest; 900 frames are watched (headless engine, the final dials; \`tools/probes/select-motion.mjs\`).`; })();

S.ENGINEMS = (() => { const r = R('engine-ms.json'); if (!r) return '(results/engine-ms.json missing)'; const mine = r.rows.filter((x) => x.label === 'Quiet Cartographer'); const proto = r.rows.filter((x) => x.label !== 'Quiet Cartographer');
  const rows = mine.map((x) => { const p = proto.find((q) => q.scene === x.scene && q.zoom === x.zoom); return [`${x.scene} tick ${x.tick} zoom ${x.zoom}`, x.tiles, x.engineMs, x.solveMs, p ? `${p.tiles} marks, ${p.engineMs} ms (${p.solveMs} solving)` : '-']; });
  return md(['scene', 'marks', 'engine ms per frame (solve + display layer, no drawing)', 'of which the layout solve', 'prototype War Room, same scene'], rows) + `

Headless engine, node ${r.node}, 600 frames at 4x after 120 warm-up frames, solve every frame (\`tools/probes/engine-ms.mjs --compare\`).`; })();

S.JITTER = (() => {
  const a = R('jitter.json'); const b = R('jitter-round0-tree.json'); if (!a) return '(results/jitter.json missing)';
  const rows = a.rows.map((r, i) => { const o = b && b.rows[i]; return [r.scene, r.frames, r.marksFollowed, `${r.steps}${o ? ` (${o.steps})` : ''}`, `${r.reversals}${o ? ` (${o.reversals})` : ''}`, `${r.reversalsAbove0_5px}${o ? ` (${o.reversalsAbove0_5px})` : ''}`, r.worstStepPx]; });
  const strips = ['march', 'select', 'deploy'].map((n) => { const x = R(`strip-${n}.json`); return x ? [x.title.split(':')[0], x.pictures, x.engineFrames, x.marksFollowed, x.samples, x.steps, x.reversals, x.worstStepPx] : null; }).filter(Boolean);
  return md(['headless engine, this skin, 60 frames per second (in brackets: the round 0 tree, same probe)', 'frames', 'marks followed', 'pops: a mark\'s displacement from its place changes by more than 6 px in one frame', 'jitter: its velocity flips, both sides above 0.12 px per frame', 'of those, both sides above 0.5 px', 'largest one-frame step (px)'], rows)
    + '\n\nThe motion strips of the shots folder, counted the same way over every engine frame between their eight pictures:\n\n' + md(['strip', 'pictures', 'engine frames', 'marks followed', 'mark-frames', 'pops', 'jitter', 'largest step (px)'], strips);
})();

S.TEXTFIT = (() => {
  const t = R('textfit.json'); if (!t) return '(results/textfit.json missing)';
  const rows = Object.entries(t.fonts).map(([k, v]) => [k, v.strings, v.overModel, v.worst.ratio, v.worst.s]);
  return md(['cut', 'strings', 'wider than reserved', 'worst real / reserved', 'the string'], rows) + `\n\nGlyph coverage: ${t.chars} characters of the data, ${t.missing.length} missing from QC Sans.`;
})();

let spec = fs.readFileSync(path.join(D1, 'SPEC.md'), 'utf8');
for (const [k, v] of Object.entries(S)) { const re = new RegExp(`<!--${k}-->[\\s\\S]*?<!--/${k}-->`); if (!re.test(spec)) { console.warn('no marker', k); continue; } spec = spec.replace(re, () => `<!--${k}-->\n${v}\n<!--/${k}-->`); }
fs.writeFileSync(path.join(D1, 'SPEC.md'), spec); console.log('SPEC.md filled:', Object.keys(S).join(', '));

// tools/curves.mjs - the motion curves of the language, computed (not drawn from memory): the rise time of every critically damped ease the engine and the skin use, the arrival easing, and the fade.
//   node tools/curves.mjs  -> results/curves.json
import fs from 'node:fs';
import path from 'node:path';
import { dampStep } from '../src/interp/damp.mjs';
import { loadDocs, PROTO } from '../src/headless.mjs';
import { QC_TOKENS } from '../src/skins/quiet-cartographer.spec.mjs';

const T = Object.fromEntries(loadDocs().tokens.tokens.map((t) => [t.id, t.default])); const Q = Object.fromEntries(QC_TOKENS.map((r) => [r[0], r[1]]));
const rise = (tau, frac) => { let x = 0; let v = 0; for (let i = 1; i <= 8000; i++) { [x, v] = dampStep(x, v, 1, tau, 0.001); if (x >= frac) return i; } return null; };
const smooth = (x) => x * x * (3 - 2 * x); const inv = (f, y) => { let lo = 0; let hi = 1; for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (f(m) < y) lo = m; else hi = m; } return (lo + hi) / 2; };
const cubicOut = (x) => 1 - (1 - x) ** 3;
const rows = [];
for (const [name, ms, what] of [
  ['mark glide to its solved place', T['motion.smoothMs'], 'engine dial motion.smoothMs'], ['travel of a dimmed mark', T['motion.travelMs'], 'engine dial motion.travelMs'],
  ['selection ring', Q['motion.selectMs'], 'skin token motion.selectMs'], ['hover ring', Q['motion.hoverMs'], 'skin token motion.hoverMs'], ['name grows in or out', 180, 'skin constant, ease("name")'], ['code appears or goes (pip codes by zoom)', 160, 'skin constant, ease("txt")'],
  ['camera zoom glide', T['camera.zoomGlideMs'], 'engine dial camera.zoomGlideMs'], ['camera pan glide', T['camera.panGlideMs'], 'engine dial camera.panGlideMs'],
]) rows.push({ name, timeConstantMs: ms, source: what, ms50: rise(ms / 1000, 0.5), ms90: rise(ms / 1000, 0.9), ms99: rise(ms / 1000, 0.99), kind: 'critically damped, no overshoot (interp/damp.mjs)' });
const fade = T['motion.fadeMs']; rows.push({ name: 'fade in or out of a mark (opacity)', durationMs: fade, source: 'engine dial motion.fadeMs', curve: 'smoothstep 3x^2 - 2x^3', ms10: Math.round(fade * inv(smooth, 0.1)), ms50: Math.round(fade * 0.5), ms90: Math.round(fade * inv(smooth, 0.9)) });
rows.push({ name: 'arrival scale of a mark (skin)', from: Q ? 0.72 : 0, to: 1, driver: 'the display layer ramps the tile scale birthScale ' + T['motion.birthScale'] + ' -> 1 with the fade; the skin maps that progress p with 1 - (1 - p)^3 (ease-out cubic)', pAt50: +cubicOut(0.5).toFixed(3), pAt25: +cubicOut(0.25).toFixed(3) });
rows.push({ name: 'dimmed travel opacity', value: T['motion.dimOpacity'], travelPx: T['motion.travelPx'], source: 'engine dials motion.dimOpacity, motion.travelPx' });
const out = { generated: new Date().toISOString(), uiCurve: 'cubic-bezier(.2, .72, .2, 1) at 140, 240 and 380 ms (quiet.css and studio.css)', rows };
console.log(JSON.stringify(out, null, 1)); fs.mkdirSync(path.join(PROTO, 'results'), { recursive: true }); fs.writeFileSync(path.join(PROTO, 'results', 'curves.json'), JSON.stringify(out, null, 1));

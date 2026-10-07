// tools/contrast.mjs - the colour tests of the Precision Field Manual, from the token files and the stylesheet (no browser): every pair that carries text or a symbol, in every variant, against its bar.
//   node tools/contrast.mjs   ->  results/contrast.json (and a table on stdout); exit 1 when a bar is missed
// Bars: 4.5:1 for text and for a glyph on its cell (WCAG 1.4.3), 3:1 for a boundary and a line (WCAG 1.4.11).  The colour maths is the symbology module's (docs/pitch/anim2/symbology/src/colour.mjs):
// WCAG relative luminance, CIEDE2000, and the Machado, Oliveira and Fernandes (2009) colour-vision matrices at severity 1.0 (a software simulation, not people).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { contrast, over, deltaE, simulate, luminance, hexToRgb, rgbToHex } from '../../symbology/src/colour.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skin = JSON.parse(fs.readFileSync(path.join(ROOT, 'tokens', 'd3.skin.tokens.json'), 'utf8'));
const css = fs.readFileSync(path.join(ROOT, 'engine', 'ui', 'fm.css'), 'utf8');
const base = Object.fromEntries(skin.tokens.map((t) => [t.name, t.value]));
const variants = { standard: {}, ...Object.fromEntries(Object.entries(skin.variants).map(([k, v]) => [k, v.set])) };
const rows = []; let failed = 0;
const check = (group, name, ratio, bar, note = '') => { const ok = ratio >= bar; if (!ok) failed++; rows.push({ group, name, ratio: +ratio.toFixed(2), bar, ok, note }); };

// ---- the marks, per variant -----------------------------------------------------------------------------------------------------------------------------
for (const [vid, set] of Object.entries(variants)) {
  const P = { ...base, ...set }; const g = `marks / ${vid}`;
  check(g, 'code on plate', contrast(P['color.text'], P['color.plate']), 4.5, 'color.text on color.plate');
  check(g, 'code on plate (hover, selected)', contrast(P['color.text'], P['color.plateHover']), 4.5);
  check(g, 'tail (muted) on plate', contrast(P['color.textMuted'], P['color.plate']), 4.5);
  check(g, 'tail (muted) on plate (hover)', contrast(P['color.textMuted'], P['color.plateHover']), 4.5);
  for (const s of ['union', 'confederate']) {
    check(g, `arm symbol on ${s} cell, fresh`, contrast(P['color.glyph'], P['color.' + s + '.fill']), 4.5);
    check(g, `arm symbol on ${s} cell, a day old`, contrast(P['color.glyph'], P['color.' + s + '.old']), 4.5);
    check(g, `${s} line colour on its underlay (pin, leader)`, contrast(P['color.' + s + '.ink'], P['color.underlay']), 3);
  }
  check(g, 'arm symbol on contested cell, fresh', contrast(P['color.contested.glyph'], P['color.contested.fill']), 4.5);
  check(g, 'arm symbol on contested cell, a day old', contrast(P['color.contested.glyph'], P['color.contested.old']), 4.5);
  // the boundary of a plate on ANY grey ground: either the plate itself or its keyline must stand out 3:1 (worst case over every grey level)
  let worst = 99; let worstAt = -1; const kl = P['alpha.keyline'];
  for (let v = 0; v < 256; v++) { const gh = rgbToHex([v, v, v]); const a = contrast(P['color.plate'], gh); const b = contrast(over(P['color.keyline'], kl, gh), gh); const best = Math.max(a, b); if (best < worst) { worst = best; worstAt = v; } }
  check(g, 'plate boundary on the worst grey ground (plate or keyline)', worst, 3, `worst ground: grey ${worstAt}`);
  const gh = '#6b6f73'; void gh;
  // colour-vision separation of the two armies' cells (CIEDE2000, bar 20 = this project's own)
  for (const t of ['normal', 'protanopia', 'deuteranopia', 'tritanopia']) {
    check(g, `Union vs Confederate cell, fresh, ${t}`, deltaE(simulate(P['color.union.fill'], t), simulate(P['color.confederate.fill'], t)), 20, 'CIEDE2000');
    check(g, `Union vs Confederate cell, a day old, ${t}`, deltaE(simulate(P['color.union.old'], t), simulate(P['color.confederate.old'], t)), 12, 'CIEDE2000; the washed colours are closer by design');
  }
  rows.push({ group: g, name: 'Union vs Confederate fresh luminance ratio (greyscale print)', ratio: +(Math.max(luminance(P['color.union.fill']), luminance(P['color.confederate.fill'])) / Math.min(luminance(P['color.union.fill']), luminance(P['color.confederate.fill']))).toFixed(2), bar: null, ok: null, note: 'information only: side is also in the cell glyph position and the code, never in colour alone for a reader of the legend' });
  // fresh against a day-old cell of the same side: the one provisional device must be visible
  for (const s of ['union', 'confederate']) check(g, `${s}: fresh vs a day old cell (the provisional device is visible)`, deltaE(P['color.' + s + '.fill'], P['color.' + s + '.old']), 12, 'CIEDE2000');
}

// ---- the stylesheet, per theme --------------------------------------------------------------------------------------------------------------------------
const block = (re) => { const m = re.exec(css); return m ? m[1] : ''; };
const vars = (txt) => Object.fromEntries([...txt.matchAll(/--([a-zA-Z0-9-]+):\s*(#[0-9a-fA-F]{6})\b/g)].map((m) => [m[1], m[2].toLowerCase()]));
const dark = vars(block(/:root \{([\s\S]*?)\n\}/)); const light = { ...dark, ...vars(block(/:root\[data-theme="light"\] \{([\s\S]*?)\n\}/)) };
for (const [theme, V] of [['night', dark], ['day', light]]) {
  const g = `interface / ${theme}`;
  for (const k of ['text', 'muted', 'faint', 'signal']) for (const bg of ['panel', 'panel2', 'panel3']) check(g, `--${k} on --${bg}`, contrast(V[k], V[bg]), 4.5);
  check(g, 'signal-ink on --signal (primary buttons)', contrast(V['signal-ink'], V.signal), 4.5);
  for (const e of ['Documented', 'Measured', 'Computed', 'Modelled', 'Contested', 'Unknown']) check(g, `evidence label ${e} on --panel`, contrast(V['ev-' + e], V.panel), 4.5);
  check(g, 'union ink on --panel (card kicker)', contrast(V.union, V.panel), 4.5); check(g, 'confederate ink on --panel (card kicker)', contrast(V.confederate, V.panel), 4.5);
  check(g, 'inverse button: --panel on --text', contrast(V.panel, V.text), 4.5);
}
const out = { generated: new Date().toISOString(), note: 'tools/contrast.mjs; colour maths of docs/pitch/anim2/symbology/src/colour.mjs', bars: { text: 4.5, nonText: 3 }, failed, checks: rows };
fs.mkdirSync(path.join(ROOT, 'results'), { recursive: true }); fs.writeFileSync(path.join(ROOT, 'results', 'contrast.json'), JSON.stringify(out, null, 1));
const bad = rows.filter((r) => r.ok === false); console.log(`${rows.length} rows, ${rows.filter((r) => r.ok).length} pass, ${bad.length} fail`); for (const r of bad) console.log('FAIL', r.group, '|', r.name, r.ratio, '<', r.bar, r.note);
process.exitCode = failed ? 1 : 0;

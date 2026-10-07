// tools/contrast-tests.mjs - THE COLOUR TESTS of the Dispatch language (SPEC.md section 4): every colour pair the design depends on, with its measured ratio and its bar.
//   node tools/contrast-tests.mjs     prints the table and writes results/contrast-tests.json (exit code 1 when a bar is missed)
// Marks:   glyph on fill (fresh 4.5:1, a battle day old 3:1), ring against the real ground (3:1: the better of the light ring and the dark hairline, against seven luminance bands of the REAL backdrop,
//          results/ground-bands.json), text ink against its halo (7:1), selection amber against the dark underlay beside it (3:1), Union against Confederate (CIEDE2000 at least 20 under normal vision,
//          protanopia, deuteranopia and tritanopia; the luminance ratio in greyscale at least 1.3:1).
// Cards:   every text and label colour of editorial.css against the card (4.5:1) in the light and the dark theme.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { contrast, deltaE, simulate, mix, over, luminance } from './colour.mjs';
import { DISPATCH_TOKENS, DP_VARIANTS, DA_SET, DA_VARIANTS, fadeFill } from '../studio/src/skins/editorial.spec.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rows = (...sets) => { const P = {}; for (const r of DISPATCH_TOKENS) P[r[0]] = r[1]; P['text.dy'] = 0.6; for (const s of sets) Object.assign(P, s || {}); return P; };
const FAMILIES = [['dispatch-paper', rows()], ['dispatch-paper/cvd', rows(DP_VARIANTS.cvd.set)], ['dispatch-paper/contrast', rows(DP_VARIANTS.contrast.set)],
  ['dispatch-aerial', rows(DA_SET)], ['dispatch-aerial/cvd', rows(DA_SET, DA_VARIANTS.cvd.set)], ['dispatch-aerial/contrast', rows(DA_SET, DA_VARIANTS.contrast.set)]];
const bands = JSON.parse(fs.readFileSync(path.join(ROOT, 'results', 'ground-bands.json'), 'utf8'));
const grounds = { paper: [...new Set(bands.filter((b) => b.look === 'real-paper').flatMap((b) => b.bands))], aerial: [...new Set(bands.filter((b) => b.look === 'real-dim').flatMap((b) => b.bands))] };

export function runContrastTests() {
  const out = []; const T = (group, name, value, bar, unit = ':1', note = '') => out.push({ group, name, value: +value.toFixed(2), bar, unit, pass: value >= bar, note });
  for (const [id, P] of FAMILIES) {
    const ground = id.startsWith('dispatch-paper') ? 'paper' : 'aerial';
    const faded = (hex) => fadeFill(P, hex, 1);
    T('glyph on fill', `${id}: white glyph on Union, fresh`, contrast(P['color.glyph'], P['color.union']), 4.5);
    T('glyph on fill', `${id}: white glyph on Confederate, fresh`, contrast(P['color.glyph'], P['color.confederate']), 4.5);
    T('glyph on fill', `${id}: dark glyph on contested amber`, contrast(P['color.unknownInk'], P['color.unknown']), 4.5);
    T('glyph on fill', `${id}: white glyph on Union, a battle day old`, contrast(over(P['color.glyph'], 1 - P['fade.glyph'], faded(P['color.union'])), faded(P['color.union'])), 3, ':1', 'a graphic, not text: 3:1');
    T('glyph on fill', `${id}: white glyph on Confederate, a battle day old`, contrast(over(P['color.glyph'], 1 - P['fade.glyph'], faded(P['color.confederate'])), faded(P['color.confederate'])), 3, ':1', 'a graphic, not text: 3:1');
    T('text', `${id}: ink on its halo`, contrast(P['text.ink'], over(P['text.halo'], P['text.haloAlpha'], ground === 'paper' ? '#c9bda1' : '#535959')), 7);
    // the ring against the ground: the better of the light ring and the dark hairline, on the worst band
    let worst = Infinity; let wb = null; for (const g of grounds[ground]) { const v = Math.max(contrast(P['color.ringLight'], g), contrast(over(P['color.ringDark'], 0.62, g), g)); if (v < worst) { worst = v; wb = g; } }
    T('ring on ground', `${id}: best ring on the worst of ${grounds[ground].length} measured ground colours (${wb})`, worst, 3, ':1', 'WCAG 1.4.11 non-text 3:1');
    let ws = Infinity; for (const g of grounds[ground]) { const under = over(P['color.ringDark'], 0.55, g); const v = contrast(P['color.accent'], under); if (v < ws) ws = v; }
    T('selection', `${id}: amber ring against its dark underlay, worst ground`, ws, 3, ':1');
    for (const type of ['normal', 'protanopia', 'deuteranopia', 'tritanopia']) T('side separation', `${id}: Union against Confederate, ${type}`, deltaE(simulate(P['color.union'], type), simulate(P['color.confederate'], type)), 20, ' dE2000', 'the project bar of 20');
    T('side separation', `${id}: Union against Confederate, luminance ratio (greyscale print)`, contrast(P['color.union'], P['color.confederate']), 1.3, ':1', 'colour is not the only cue: circle against rounded square, swallow-tail against point');
    T('age', `${id}: a battle-day-old Union mark against a fresh one (the fade must be visible), CIEDE2000`, deltaE(P['color.union'], faded(P['color.union'])), /contrast/.test(id) ? 4 : 7, ' dE2000', 'age is a device only if it can be seen (the high-contrast variant fades less on purpose)');
    T('age', `${id}: a battle-day-old Union mark against a battle-day-old Confederate one (the side must survive the fade), CIEDE2000`, deltaE(faded(P['color.union']), faded(P['color.confederate'])), 20, ' dE2000');
    T('side separation', `${id}: contested amber against Union and Confederate (smallest, normal vision)`, Math.min(deltaE(P['color.unknown'], P['color.union']), deltaE(P['color.unknown'], P['color.confederate'])), 20, ' dE2000');
  }
  // the interface: every text and label colour against the card, light and dark
  const css = fs.readFileSync(path.join(ROOT, 'studio', 'src', 'ui', 'editorial.css'), 'utf8');
  const block = (re) => { const m = re.exec(css); const v = {}; if (m) for (const x of m[1].matchAll(/--([a-zA-Z0-9-]+):\s*([^;]+);/g)) v[x[1]] = x[2].trim(); return v; };
  const themes = { light: block(/:root\[data-theme="light"\]\s*\{([\s\S]*?)\n\}/), dark: block(/:root\[data-theme="dark"\],\s*:root:not\(\[data-theme\]\)\s*\{([\s\S]*?)\n\}/) };
  for (const [th, v] of Object.entries(themes)) {
    const res = (x) => { x = String(x || '').trim(); const m = /^var\(--([a-zA-Z0-9-]+)\)$/.exec(x); return m ? res(v[m[1]]) : x; }; const panel = res(v.panel);
    for (const k of ['text', 'muted']) T('card text', `${th}: --${k} on the card`, contrast(res(v[k]), panel), 4.5);
    for (const k of Object.keys(v).filter((n) => /^ink-/.test(n))) T('card text', `${th}: --${k} (the kicker of that tone) on the card`, contrast(res(v[k]), panel), 4.5);
    for (const k of Object.keys(v).filter((n) => /^evi-/.test(n))) T('card text', `${th}: --${k} (an evidence label) on the card`, contrast(res(v[k]), panel), 4.5);
    T('card text', `${th}: accent ink on the accent (the play button)`, contrast(res(v['accent-ink']), res(v.accent)), 4.5);
    T('card text', `${th}: --panel on --text (the active segment, the primary button)`, contrast(panel, res(v.text)), 4.5);
  }
  void luminance;
  return out;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = runContrastTests(); const fail = r.filter((x) => !x.pass);
  fs.writeFileSync(path.join(ROOT, 'results', 'contrast-tests.json'), JSON.stringify({ checks: r.length, failed: fail.length, results: r }, null, 1));
  const groups = [...new Set(r.map((x) => x.group))];
  for (const g of groups) { const rs = r.filter((x) => x.group === g); console.log(`${g}: ${rs.filter((x) => x.pass).length} of ${rs.length} pass; weakest ${rs.reduce((m, x) => (x.value / x.bar < m.value / m.bar ? x : m)).name} = ${rs.reduce((m, x) => (x.value / x.bar < m.value / m.bar ? x : m)).value}${rs[0].unit} (bar ${rs[0].bar})`); }
  console.log(`${r.length} checks, ${fail.length} failed`); for (const f of fail) console.log('FAIL', f.group, f.name, f.value, 'bar', f.bar);
  process.exitCode = fail.length ? 1 : 0;
}

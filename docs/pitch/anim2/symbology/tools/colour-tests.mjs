// tools/colour-tests.mjs - the tested pairs.  WCAG 2.x contrast (relative luminance, https://www.w3.org/WAI/GL/wiki/Relative_luminance; ratios from SC 1.4.3 and 1.4.11) and CIEDE2000 distance under three simulated
// colour-vision deficiencies (Machado, Oliveira, Fernandes 2009 matrices) and greyscale.  Writes results/colour-tests.json and prints the tables.   node tools/colour-tests.mjs [--palette standard|highContrast]
import fs from 'node:fs'; import path from 'node:path';
import { ROOT } from './chrome.mjs';
import { loadTokens } from '../src/tokens.mjs';
import { contrast, luminance, over, mix, deltaE, simulate, CVD_TYPES } from '../src/colour.mjs';
import { BACKDROPS } from '../src/sheets.mjs';
const pal = process.argv.includes('--palette') ? process.argv[process.argv.indexOf('--palette') + 1] : 'standard';
const { T } = loadTokens({ palette: pal }); const P = T.palette; const R = T.ring;
const BACK = [{ id: 'forest-shadow', hex: '#0c1b0a', label: 'darkest 5% (measured)' }, ...BACKDROPS];
const f2 = (v) => Math.round(v * 100) / 100; const out = { palette: pal, thresholds: { glyphOnPlate: 4.5, ringOnBackdrop: 3, plateOnBackdrop: 3, distanceDeltaE2000: 20, note: 'ink 4.5:1 = WCAG 1.4.3 normal text (applied to glyphs, stricter than the 3:1 of 1.4.11); ring 3:1 = WCAG 1.4.11 non-text contrast; delta E 20 is this project\'s own bar for "clearly different" under simulation, not a WCAG number' } };
const checks = []; const add = (group, name, value, min, extra = {}) => checks.push({ group, name, value: f2(value), min, pass: value >= min, ...extra });

// 1. glyph ink on each plate (fresh, and carried: the plate mixed toward grey, the ink at glyphOpacity composited over it)
for (const [side, plate, ink] of [['union', P.union, P.ink], ['confederate', P.confederate, P.ink], ['unknown', P.unknown, P.inkOnUnknown]]) {
  add('glyph on plate', `${side} fresh`, contrast(ink, plate), 4.5, { ink, plate });
  const cp = mix(plate, P.carriedGrey, T.carried.mix); const ci = over(ink, T.carried.glyphOpacity, over(cp, T.carried.fillOpacity, '#4e613e'));
  add('glyph on plate', `${side} carried, over the field backdrop`, contrast(ci, over(cp, T.carried.fillOpacity, '#4e613e')), 3, { ink: ci, plate: cp, note: 'carried plates are deliberately calmer: held to the 3:1 non-text bar' });
}
add('glyph on plate', 'bone glyph on chip', contrast(P.bone, P.chip), 4.5);
// 2. rings against every backdrop: the plate's silhouette is the light ring or the dark ring, whichever is further from the backdrop; at least one must be 3:1
for (const b of BACK) {
  const light = contrast(P.bone, b.hex); const dkc = over(P.keyline, R.darkAlpha, b.hex); const dark = contrast(dkc, b.hex);
  add('ring on backdrop', `${b.id}: best of light / dark ring`, Math.max(light, dark), 3, { backdrop: b.hex, light: f2(light), dark: f2(dark), winner: light >= dark ? 'light ring' : 'dark ring' });
}
// 2b. the same ring test on the luminance bands of the real NAIP-derived backdrops (assets/naip, tools/sample-naip.mjs): 7 bands x each preview.  The ring must hold on every band, so a unit stays outlined over any part of the real ground.
const naipFile = path.join(ROOT, 'results', 'naip-bands.json');
if (fs.existsSync(naipFile)) { const naip = JSON.parse(fs.readFileSync(naipFile, 'utf8')); out.naipBands = {};
  for (const im of naip.images) for (const [bn, band] of Object.entries(im.bands)) {
    const light = contrast(P.bone, band.hex); const dkc = over(P.keyline, R.darkAlpha, band.hex); const dark = contrast(dkc, band.hex); const nm = path.basename(im.file, '.jpg');
    add('ring on NAIP backdrop', `${nm} ${bn}: best of light / dark ring`, Math.max(light, dark), 3, { backdrop: band.hex, light: f2(light), dark: f2(dark), winner: light >= dark ? 'light ring' : 'dark ring' });
    (out.naipBands[nm] = out.naipBands[nm] || {})[bn] = band.hex; } }
// 3. plate fill against backdrops (information: the rings carry the guarantee, a plate that also passes is a bonus)
const plateVs = []; for (const [side, plate] of [['union', P.union], ['confederate', P.confederate], ['unknown', P.unknown]]) for (const b of BACK) plateVs.push({ side, backdrop: b.id, ratio: f2(contrast(plate, b.hex)), passes3: contrast(plate, b.hex) >= 3 });
out.plateVsBackdrop = plateVs;
// 4. side separation under each vision
const pairs = [['union', 'confederate'], ['union', 'unknown'], ['confederate', 'unknown']]; const sep = [];
for (const [a, b] of pairs) { const ca = P[a]; const cb = P[b]; const row = { pair: `${a} / ${b}`, luminanceRatio: f2(contrast(ca, cb)) }; for (const t of CVD_TYPES) { const sa = simulate(ca, t); const sb = simulate(cb, t); row[t] = { deltaE2000: f2(deltaE(sa, sb)), a: sa, b: sb, lumRatio: f2(contrast(sa, sb)) }; } sep.push(row); }
out.separation = sep;
for (const row of sep) for (const t of CVD_TYPES.filter((x) => x !== 'achromatopsia')) add('side separation', `${row.pair} under ${t}`, row[t].deltaE2000, 20);
for (const row of sep) add('side separation', `${row.pair} in greyscale (luminance ratio)`, row.luminanceRatio, 1.3, { note: 'greyscale: the sides also differ in lightness (ratio >= 1.3); the frame shape (NATO language) and the marker shapes are the further redundancy' });
// 5. division colours of the badges against each other (red / white / blue) under simulation
const bc = T.badge.colours; const bsep = [];
for (const [a, b] of [['red', 'white'], ['red', 'blue'], ['white', 'blue']]) { const row = { pair: `${a} / ${b}` }; for (const t of CVD_TYPES.filter((x) => x !== 'achromatopsia')) { row[t] = f2(deltaE(simulate(bc[a], t), simulate(bc[b], t))); add('badge colours', `${a} / ${b} under ${t}`, deltaE(simulate(bc[a], t), simulate(bc[b], t)), 20); } bsep.push(row); }
out.badgeSeparation = bsep;
out.checks = checks; out.summary = { total: checks.length, pass: checks.filter((c) => c.pass).length, fail: checks.filter((c) => !c.pass).map((c) => `${c.group}: ${c.name} = ${c.value} (min ${c.min})`) };
fs.mkdirSync(path.join(ROOT, 'results'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'results', pal === 'standard' ? 'colour-tests.json' : `colour-tests-${pal}.json`), JSON.stringify(out, null, 2));
console.log(`palette ${pal}: ${out.summary.pass}/${out.summary.total} checks pass`); if (out.summary.fail.length) console.log('FAIL:\n' + out.summary.fail.join('\n'));
for (const c of checks) console.log(`${c.pass ? 'ok  ' : 'FAIL'} ${c.group.padEnd(18)} ${c.name.padEnd(52)} ${String(c.value).padStart(6)} (>= ${c.min})${c.winner ? '  ' + c.winner : ''}`);

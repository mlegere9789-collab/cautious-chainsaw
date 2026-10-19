// tools/spec-fill.mjs - fills the section "9. What was measured" of SPEC.md (between <!--AUDIT--> and <!--/AUDIT-->) from the JSON files in results/, so no number in the document is typed by hand.
//   node tools/spec-fill.mjs
import fs from 'node:fs';
import path from 'node:path';
import { D1 } from './lib.mjs';

const R = (f) => { const p = path.join(D1, 'results', f); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null; };
const NAME = { a: 'A Standards', b: 'B Glyph' }; const out = [];
// 1. the layout scene checks
out.push('**Layout, in the real engine, on every settled scene frame** (`tools/scenes.mjs`, results `scene-checks-a.json`, `scene-checks-b.json`). A core overlap is two solid marks whose footprints overlap; a covered pin is a true-position pin under another mark; unrepresented is a unit with no mark and in no crowd; cards over tiles counts frames in which a popup lay on a mark, label or pin.\n');
out.push('| option | scene | marks | units on the field | crowds | units inside crowds | core overlaps | pins covered | unrepresented | frames with a card over a tile |\n|---|---|---:|---:|---:|---:|---:|---:|---:|---:|');
let ov = 0; let nScenes = 0;
for (const o of ['a', 'b']) { const r = R(`scene-checks-${o}.json`) || []; for (const x of r) { nScenes++; ov += x.coreOverlaps + x.pinCovered + x.unrepresented + ((x.cards && x.cards.over) || 0); out.push(`| ${NAME[o]} | ${x.scene} (${x.file.split('/').pop().replace(/\.png$/, '')}) | ${x.marks} | ${x.units} | ${x.aggregates} | ${x.unitsInAggregates} | ${x.coreOverlaps} | ${x.pinCovered} | ${x.unrepresented} | ${x.cards ? x.cards.over + ' of ' + x.cards.frames : 'n/a'} |`); } }
out.push(`\n${nScenes} scene frames, ${ov} violations of any of the four kinds.\n`);
// 2. lettering contrast from rendered pixels
out.push('**Lettering contrast, read from rendered pixels** (`tools/audit.mjs`, `audit-a.json`, `audit-b.json`). Every lettering sprite the renderer blits is located on the canvas; its opaque ink pixels give the ink, the pixels 2 to 3 device px from the ink (halo over ground, or the cloth under a numeral) give the background; each pixel pair is a WCAG ratio. "Median" is the median neighbour pixel of a label; "worst decile" its 10th-percentile pixel. Haloed labels are unit codes beside a mark, names and formation words; on-cloth labels are the code or count standing on a flag or glyph body (no halo; the cream edge of a flag lies 2 to 3 px from the glyphs, which is the "worst decile" shortfall there).\n');
out.push('| option | scene | haloed labels | share with median at 4.5:1 | share with worst decile at 4.5:1 | worst median | on-cloth labels | share with median at 4.5:1 | share with worst decile at 4.5:1 | worst median |\n|---|---|---:|---:|---:|---:|---:|---:|---:|---:|');
const pc = (v) => (v == null ? 'n/a' : Math.round(v * 1000) / 10 + ' %');
for (const o of ['a', 'b']) { const r = R(`audit-${o}.json`); if (!r) continue; for (const s of r.scenes) { const h = s.split.haloed; const c = s.split.onCloth; out.push(`| ${NAME[o]} | ${s.scene} | ${h.n} | ${pc(h.shareMedian)} | ${pc(h.shareP10)} | ${h.worstMedian} | ${c.n} | ${pc(c.shareMedian)} | ${pc(c.shareP10)} | ${c.worstMedian ?? 'n/a'} |`); } }
out.push('\nThe measured ink is the median of the opaque ink pixels after the canvas has resampled them, which makes it slightly lighter (or darker) than the token colour: the ratios are conservative.\n');
// 3. analytic
out.push('**Marks, text and the two sides, from the token file over the ground bands the page renders** (5 views x 7 percentiles of ground luminance, from the page\'s own backdrop; standard, colour-blind-safe and high-contrast token sets). A mark holds when its light or its dark outermost line stands 3:1 off the ground; text is the ink over the halo over the ground; sides are CIEDE2000 between the Union and Confederate colours under normal vision and protanopia, deuteranopia and tritanopia (Machado 2009 matrices, as the symbology job\'s colour module has them).\n');
out.push('| option | token set | worst text ratio | worst mark ratio (light / dark line) | smallest CIEDE2000, Union vs Confederate | greyscale luminance ratio | verdict |\n|---|---|---:|---:|---:|---:|---|');
for (const o of ['a', 'b']) { const r = R(`audit-${o}.json`); if (!r) continue; for (const [sid, v] of Object.entries(r.skins)) out.push(`| ${NAME[o]} | ${sid} | ${v.worstText.ratio} (${v.worstText.name}) | ${v.worstMark.ratio} (${v.worstMark.light} / ${v.worstMark.dark}) | ${Math.min(...Object.values(v.deltaE2000UnionVsConfederate))} | ${v.greyscaleLuminanceRatio} : 1 | ${Object.entries(v.verdict).map(([k, x]) => k + (x ? ' pass' : ' FAIL')).join(', ')} |`); }
out.push('');
// 4. ink fit
out.push('**Lettering stays inside its own footprint** (`tools/inkfit.mjs`, `inkfit-a.json`, `inkfit-b.json`): the alpha bounds of every lettering sprite against the box of the mark that owns it (more than 0.6 px outside counts). The drawn shapes (pole, flag, glyph, rings, bar, gauge, selection ring) are checked against the footprint in node by `test/skin-look.test.mjs` with a recording context, every unit at six zooms, both armies, selected and not.\n');
out.push('| option | ' + (R('inkfit-a.json') || { rows: [] }).rows.map((x) => x.scene).join(' | ') + ' |\n|---|' + (R('inkfit-a.json') || { rows: [] }).rows.map(() => '---:').join('|') + '|');
for (const o of ['a', 'b']) { const r = R(`inkfit-${o}.json`); if (!r) continue; out.push(`| ${NAME[o]} | ${r.rows.map((x) => `${x.sprites} sprites, ${x.overflow + x.orphan} outside`).join(' | ')} |`); }
out.push('');
// 5. interface text sizes
out.push('**Text sizes of the interface** (computed `font-size` of every visible text node, nine states): ' + ['a', 'b'].map((o) => { const r = R(`audit-${o}.json`); if (!r) return ''; const sizes = [...new Set(r.dom.flatMap((d) => Object.keys(d.sizes)))].map(Number).sort((x, y) => x - y); return `${NAME[o]}: ${sizes.join(', ')} px, minimum ${Math.min(...r.dom.map((d) => d.min))} px`; }).join('; ') + '. Map lettering: 12 and 13 px (the font table of `layout/text.mjs`).\n');
// 6. tests
const t = R('tests.json');
if (t) { out.push('**Node tests** (`tools/run-tests.mjs`, `tests.json`):\n'); out.push('| file | tests | pass | fail |\n|---|---:|---:|---:|'); for (const r of t.rows) out.push(`| ${r.file} | ${r.tests} | ${r.pass} | ${r.fail} |`); out.push(''); }
const f = path.join(D1, 'SPEC.md'); let s = fs.readFileSync(f, 'utf8'); const a = s.indexOf('<!--AUDIT-->'); const b = s.indexOf('<!--/AUDIT-->'); if (a < 0 || b < 0) throw new Error('markers missing');
s = s.slice(0, a) + '<!--AUDIT-->\n' + out.join('\n') + '\n' + s.slice(b); fs.writeFileSync(f, s); console.log('SPEC.md section 9 filled:', out.length, 'blocks');

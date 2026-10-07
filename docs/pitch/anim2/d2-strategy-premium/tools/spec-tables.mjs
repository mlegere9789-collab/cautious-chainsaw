// tools/spec-tables.mjs - fills the generated tables of SPEC.md (and README.md) from the files they describe, so a number in the prose of the spec can never drift from the result file it came from.
// A table sits between two markers  <!--T:name-->  ...  <!--/T:name-->  and is rewritten whole.  Sources: design/*.json (tokens), results/*.json (every measurement), studio/src/skins/semantics.mjs
// (the evidence label of every encoding).   node tools/spec-tables.mjs [--check]     --check exits 1 if a table is out of date (nothing is written).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const D2 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const J = (f) => JSON.parse(fs.readFileSync(path.join(D2, f), 'utf8'));
const maybe = (f) => { try { return J(f); } catch { return null; } };
const esc = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const table = (head, rows, align = []) => [`| ${head.join(' | ')} |`, `| ${head.map((_, i) => (align[i] === 'r' ? '---:' : '---')).join(' | ')} |`, ...rows.map((r) => `| ${r.map(esc).join(' | ')} |`)].join('\n');
const n1 = (x, d = 1) => (x === null || x === undefined || Number.isNaN(x) ? 'n/a' : Number(x).toFixed(d));
const T = {};

// ---- tokens
function flatten(node, pre = '') { const out = []; for (const [k, v] of Object.entries(node)) { if (k.startsWith('$')) continue; if (v && typeof v === 'object' && '$value' in v) out.push([pre + k, v]); else if (v && typeof v === 'object') out.push(...flatten(v, pre + k + '.')); } return out; }
T.tokens = () => {
  const doc = J('design/premium.tokens.json'); const rows = flatten(doc); const groups = {};
  for (const [name, v] of rows) { const g = name.split('.')[0]; (groups[g] = groups[g] || []).push([`\`${name}\``, `\`${typeof v.$value === 'string' && v.$value.length > 40 ? v.$value.slice(0, 38) + '..' : v.$value}\``, v.$unit || '', v.$description || '']); }
  const label = { color: 'Colour', geo: 'Geometry', type: 'Type', light: 'Light', state: 'State', motion: 'Motion' };
  return Object.entries(groups).map(([g, r]) => `**${label[g] || g}** (${r.length} tokens)\n\n${table(['Token', 'Value', 'Unit', 'What it sets'], r)}`).join('\n\n') + `\n\n${rows.length} tokens in all.`;
};
T.variants = () => {
  const out = []; for (const f of ['cvd', 'contrast']) { const d = J(`design/variants/${f}.json`); const rows = flatten(d).map(([n, v]) => [`\`${n}\``, `\`${v.$value}\``]); out.push(`**${d.$label}** (\`design/variants/${f}.json\`, ${rows.length} tokens differ from the standard look): ${d.$description}\n\n${table(['Token', 'Value'], rows)}`); }
  return out.join('\n\n');
};

// ---- the same tests on the tokens (the cloth colours of every palette against the type colour); the rendered-pixel test below is the binding one, this is its upper bound
const lum = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
T.pairs = () => {
  const base = Object.fromEntries(flatten(J('design/premium.tokens.json')).map(([n, v]) => [n, v.$value])); const out = [];
  for (const [label, file] of [['standard', null], ['colour-blind safe', 'cvd'], ['high contrast', 'contrast']]) {
    const t = { ...base }; if (file) for (const [n, v] of flatten(J(`design/variants/${file}.json`))) t[n] = v.$value;
    for (const [side, sk, ink] of [['Union', 'union', 'color.ink'], ['Confederate', 'csa', 'color.ink'], ['Contested (gold)', 'unk', 'color.inkOnGold']]) for (const end of ['hi', 'lo']) out.push([label, side, end, `\`${t[ink]}\``, `\`${t[`color.${sk}.${end}`]}\``, n1(ratio(t[ink], t[`color.${sk}.${end}`]), 2)]);
    for (const [side, sk] of [['Union', 'union'], ['Confederate', 'csa']]) out.push([label, side, 'hoist band', `\`${t['color.ink']}\``, `\`${t[`color.${sk}.strip`]}\``, n1(ratio(t['color.ink'], t[`color.${sk}.strip`]), 2)]);
  }
  return `${table(['Palette', 'Side', 'Cloth', 'Type colour', 'Cloth colour', 'Contrast'], out, ['', '', '', '', '', 'r'])}

The type sits on the gradient between the two cloth ends, so the lower of the two ratios of a row is its token-level floor; the cloth runs from \`hi\` at the top to \`lo\` at the bottom and gloss and sheen lift it by at most ${n1(base['light.gloss'] + base['light.sheen'], 2)} of white, which only the pixel test below includes.`;
};

// ---- the rendered-pixel legibility test
T.legibility = () => {
  const d = J('results/legibility.json'); const by = {}; for (const r of d.rows) (by[r.variant] = by[r.variant] || []).push(r);
  const sum = Object.entries(by).map(([v, rs]) => [v, rs.length, n1(Math.min(...rs.map((r) => r.contrast)), 2), n1(rs.reduce((s, r) => s + r.contrast, 0) / rs.length, 2), rs.filter((r) => r.contrast < d.bar).length]);
  const std = by.standard.map((r) => [r.name, `\`${r.ink}\``, n1(r.bgLumWorst, 3), n1(r.contrast, 2), r.contrast >= d.bar ? 'pass' : 'FAIL']);
  return `Bar: ${d.bar}:1.  Method: ${d.method}.\n\n${table(['Palette', 'Samples', 'Lowest ratio', 'Mean ratio', 'Below the bar'], sum, ['', 'r', 'r', 'r', 'r'])}\n\nStandard palette, every state that carries type:\n\n${table(['Case', 'Ink', 'Worst background luminance', 'Contrast', 'Result'], std, ['', '', 'r', 'r', ''])}\n\n${d.rows.length} samples, ${d.below} below the bar.`;
};

// ---- colour-vision and greyscale separation of the side colours
T.cvd = () => {
  const d = J('results/colour-tests.json'); const by = {}; for (const r of d.rows) { const k = `${r.palette}|${r.pair}`; (by[k] = by[k] || { palette: r.palette, pair: r.pair, v: {} }).v[r.vision] = r.deltaE2000; }
  const vis = ['normal', 'protanopia', 'deuteranopia', 'tritanopia']; const grey = d.rows.filter((r) => /greyscale/.test(r.vision));
  const rows = Object.values(by).filter((b) => vis.some((v) => b.v[v] !== undefined)).map((b) => [b.palette, b.pair, ...vis.map((v) => n1(b.v[v], 1)), n1(Math.min(...vis.map((v) => b.v[v]).filter((x) => x !== undefined)), 1)]);
  const greyRows = grey.map((r) => [r.palette === 'cvd' ? 'colour-blind safe' : r.palette === 'contrast' ? 'high contrast' : r.palette, r.pair, n1(r.value, 2)]);
  return `CIEDE2000 between the cloth colours (the bar is ${d.bar}; the vision rows simulate the deficiency with the Machado et al. matrices, severity 1.0, applied in linear sRGB).\n\n${table(['Palette', 'Pair', 'Normal', 'Protanopia', 'Deuteranopia', 'Tritanopia', 'Lowest'], rows, ['', '', 'r', 'r', 'r', 'r', 'r'])}\n\nPairs below the bar: ${d.below}.  Greyscale (luminance ratio, 1.00 means identical): ${greyRows.map((r) => `${r[0]} ${r[1]} = ${r[2]}`).join('; ')}.  The fly shape, not the colour, carries the side in greyscale.`;
};

// ---- the evidence label of every encoding
T.channels = async () => {
  const { CHANNELS } = await import(pathToFileURL(path.join(D2, 'studio/src/skins/semantics.mjs')).href);
  const rows = []; const count = {};
  for (const [id, c] of Object.entries(CHANNELS)) for (const v of c.values) { rows.push([c.title, String(v.id), v.text, v.evidence]); count[v.evidence] = (count[v.evidence] || 0) + 1; }
  return `${table(['Encoding', 'Value', 'What it claims', 'Evidence'], rows)}\n\n${rows.length} rows: ${Object.entries(count).map(([k, n]) => `${k} ${n}`).join(', ')}.`;
};

// ---- the zero-overlap sweeps
T.sweep = () => {
  const out = []; for (const vp of ['desktop', 'phone']) {
    const d = maybe(`results/sweep-${vp}.json`); if (!d) continue;
    const rows = [...d.byZoom].sort((a, b) => a.zoom - b.zoom).map((b) => [b.zoom, b.samples, b.maxMarks, b.maxCrowds, b.maxUnitsInCrowds, b.bruteOverlaps, b.engineOverlaps, b.clearanceViolations, b.pinsCovered, b.unrepresented, b.minGap]);
    out.push(`**${vp}** ${d.viewport.join('x')} at DPR ${d.dpr}: ${d.samples} settled samples (${[...new Set(d.rows.map((r) => r.z))].length} zooms x 9 ticks x 4 places), ${d.seconds} s.  Totals: independent overlaps ${d.totals.brute}, engine overlaps ${d.totals.eng}, pins covered ${d.totals.pins}, unrepresented units ${d.totals.unrep}, pairs closer than the clearance ${d.totals.tight}; page errors ${d.errors.length}, external requests ${d.externalRequests}.\n\n${table(['Zoom', 'Samples', 'Most marks', 'Most crowds', 'Most units in crowds', 'Overlaps (independent)', 'Overlaps (engine)', 'Clearance violations', 'Pins covered', 'Unrepresented', 'Smallest gap (px)'], rows, ['r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r'])}`);
  } return out.join('\n\n');
};

// ---- the footprint contract on pixels
T.ink = () => { const d = J('results/ink.json'); return `${table(['Scene', 'Zoom', 'Marks', 'Paints (4 states x 2 DPR)', 'Paints outside the footprint'], d.scenes.map((s) => [s.id, s.zoom, s.marks, s.painted, s.violations]), ['', 'r', 'r', 'r', 'r'])}\n\n${d.paintedTotal} paints in all, ${d.violations} outside the box the layout reserved (tolerance ${d.tolerancePx} px).`; };

// ---- motion
T.motion = () => {
  const d = J('results/motion.json'); const cols = ['frames', 'fps', 'p95ms', 'over20Pct', 'enginems', 'popsPerSec', 'teleportsPerSec', 'maxExcessPx', 'jumpsPerSec', 'jumpsSolidPerSec', 'maxStepPx', 'overlapFrames', 'unrepresentedUnitFrames', 'travelsPerSec', 'travellingTilesMean'];
  const head = ['Condition', 'Frames', 'fps', 'Frame p95 (ms)', 'Frames over 20 ms (%)', 'Engine (ms)', 'Pops/s', 'Teleports/s', 'Largest excess (px)', 'Jumps/s', 'Solid jumps/s', 'Largest step (px)', 'Overlap frames', 'Unrepresented unit-frames', 'Long hops/s (dimmed)', 'Dimmed tiles per frame'];
  const A = d.A.map((r) => [`${r.scene}, DPR ${r.dpr}`, ...cols.map((c) => r[c])]); const BC = [...d.B, ...d.C].map((r) => [r.label, ...cols.map((c) => r[c])]);
  return `Real-time playback in real Chrome (each row ${d.secs} s of the page's own animation loop):\n\n${table(head, A, ['', ...cols.map(() => 'r')])}\n\nDriven frame by frame at 60 Hz (zoom glides and selections):\n\n${table(head, BC, ['', ...cols.map(() => 'r')])}`;
};

// ---- the pictures
T.shots = () => {
  const d = J('results/shots.json'); const rows = d.results.map((r) => [r.id, `\`shots/${r.file}\``, r.crop ? `\`shots/${r.crop}\`` : '', r.zoom, r.tick, r.marks, r.crowdMarks, r.unitsInCrowds, r.unitsOnField, r.bruteOverlaps, r.engineOverlaps, r.pinsCovered, r.unrepresented, r.minGapPx, r.marksUnderChrome, r.marksUnderCards]);
  return `${table(['Scene', 'Picture', '100% crop of the busiest free window (600x400; 390x300 on the phone)', 'Zoom', 'Tick', 'Marks', 'Crowd marks', 'Units in crowds', 'Units on the field', 'Overlaps (independent)', 'Overlaps (engine)', 'Pins covered', 'Unrepresented', 'Smallest gap (px)', 'Marks under fixed chrome', 'Marks touched by a card'], rows, ['', '', '', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r'])}\n\nEvery scene was checked by the independent routine on the frame that was drawn.  "Under fixed chrome" counts marks more than half covered by the brand and clock chips, the tool strip, the dock or a side panel; "touched by a card" counts marks any pixel of which lies under a popup card or the reading rail.`;
};

// ---- the type on screen (every visible DOM text node of every scene)
T.type = () => {
  const d = J('results/shots.json'); const by = {}; const sizesPer = [];
  for (const r of d.results) { if (!r.type) continue; sizesPer.push([r.id, r.type.sizes.join(' / '), r.type.min]); for (const t of r.type.rows) { const k = `${t.size}|${t.weight}|${t.family}`; const e = by[k] || (by[k] = { size: t.size, weight: t.weight, family: t.family, chars: 0, scenes: new Set(), sample: t.sample }); e.chars += t.chars; e.scenes.add(r.id); } }
  const rows = Object.values(by).sort((a, b) => a.size - b.size || a.weight - b.weight).map((e) => [`${e.size} px`, e.weight, e.family, e.chars, [...e.scenes].length, e.sample]);
  const all = [...new Set(Object.values(by).map((e) => e.size))].sort((a, b) => a - b);
  return `${table(['Scene', 'Sizes on screen (px)', 'Smallest'], sizesPer)}\n\nAll scenes: sizes ${all.join(', ')} px.  By style:\n\n${table(['Size', 'Weight', 'Face', 'Characters', 'Scenes', 'Example'], rows, ['r', 'r', '', 'r', 'r', ''])}`;
};

// ---- the node tests
T.tests = () => {
  try { const t = fs.readFileSync(path.join(D2, 'results', 'node-tests.txt'), 'utf8'); const g = (k) => (new RegExp(`^ℹ ${k} (\\d+)`, 'm').exec(t) || [])[1]; return `\`node --test studio/test/*.test.mjs\`: ${g('tests')} tests, ${g('pass')} pass, ${g('fail')} fail (full log: \`results/node-tests.txt\`).`; } catch { return '(no test log)'; }
};

// ---- fonts
T.fonts = () => {
  const files = fs.readdirSync(path.join(D2, 'fonts')).filter((f) => f.endsWith('.woff2')).sort(); const rows = files.map((f) => { const m = /^(.*)-latin-(\d+)-(normal|italic)\.woff2$/.exec(f); return [m ? m[1].replace(/-/g, ' ') : f, m ? m[2] : '', m ? m[3] : '', `\`fonts/${f}\``, `${(fs.statSync(path.join(D2, 'fonts', f)).size / 1024).toFixed(1)} KB`, 'SIL OFL 1.1']; });
  return table(['Family', 'Weight', 'Style', 'File', 'Size', 'Licence'], rows, ['', 'r', '', '', 'r', '']);
};

// ---- write
const FILES = ['SPEC.md', 'README.md']; let stale = 0; const CHECK = process.argv.includes('--check');
for (const f of FILES) {
  const p = path.join(D2, f); if (!fs.existsSync(p)) continue; let s = fs.readFileSync(p, 'utf8'); let changed = false;
  for (const name of Object.keys(T)) {
    const re = new RegExp(`(<!--T:${name}-->)[\\s\\S]*?(<!--/T:${name}-->)`, 'g'); if (!re.test(s)) continue;
    const body = await T[name](); const next = s.replace(new RegExp(`(<!--T:${name}-->)[\\s\\S]*?(<!--/T:${name}-->)`, 'g'), () => `<!--T:${name}-->\n${body}\n<!--/T:${name}-->`);
    if (next !== s) { changed = true; s = next; }
  }
  if (changed) { stale++; if (!CHECK) fs.writeFileSync(p, s); console.log(CHECK ? 'out of date' : 'updated', f); } else console.log('current', f);
}
if (CHECK && stale) process.exit(1);

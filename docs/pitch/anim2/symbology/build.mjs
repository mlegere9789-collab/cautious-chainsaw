// build.mjs - THE SYMBOL PIPELINE.  tokens -> needed set (from the real data) -> sprites (SVG, code-drawn) -> atlas PNG at 1x / 2x / 3x -> index JSON -> byte accounting -> sheets.
//
//   node build.mjs                        everything for the standard palette: dist/svg, dist/atlas, results/atlas-sizes.json, the sheets
//   node build.mjs --all                  render the whole vocabulary (every side x arm x echelon) into the atlas instead of the data's needed set
//   node build.mjs --palette highContrast  another palette of the token file; output goes to dist-<palette>/
//   node build.mjs --tokens my.json       override a few tokens (same tree as tokens/symbology.tokens.json, only the leaves you change)
//   node build.mjs --only nato,shield     some languages only (the overlays atlas is always built)
//   (tools/sheets.mjs draws the sheets; tools/webp-pack.py runs at the end of every build: a lossless WebP next to each PNG, proven identical)
//
// Build time only: it needs node 20+ and Chrome (playwright-core from the repo's node_modules).  Nothing it uses ships; the product loads dist/atlas/*.png and *.json and draws sprites with runtime/atlas.mjs.
import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib'; import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url'; import { spawnSync } from 'node:child_process';
import { loadTokens } from './src/tokens.mjs';
import { neededSet } from './src/needed.mjs';
import { LANGUAGES, LANGUAGE_IDS } from './src/languages.mjs';
import { buildLanguageSprites, buildOverlaySprites, EVIDENCE_OF_GROUP } from './src/build-sprites.mjs';
import { pack, rasterise } from './src/atlas.mjs';
import { legendFor, EVIDENCE_LABELS } from './src/legend.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url)); const REPO = path.resolve(ROOT, '..', '..', '..', '..');
const argv = process.argv.slice(2); const flag = (n) => argv.includes('--' + n); const opt = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const palette = opt('palette', 'standard'); const all = flag('all'); const only = (opt('only', '') || '').split(',').filter(Boolean);
const outDir = path.join(ROOT, palette === 'standard' ? 'dist' : `dist-${palette}`);
const SCALES = [1, 2, 3];

const { T, tree } = loadTokens({ overrides: opt('tokens', null), palette });
const needed = neededSet({ repo: REPO });
const tokenHash = crypto.createHash('sha256').update(JSON.stringify(T)).digest('hex').slice(0, 16);
fs.mkdirSync(path.join(outDir, 'atlas'), { recursive: true });
fs.rmSync(path.join(outDir, 'svg'), { recursive: true, force: true });
const gz = (b) => zlib.gzipSync(b, { level: 9 }).length;

const sets = [];
for (const id of (only.length ? only : LANGUAGE_IDS)) sets.push({ id, label: LANGUAGES[id].label, sprites: buildLanguageSprites(id, T, needed, { all }) });
sets.push({ id: 'overlays', label: 'Overlays shared by every language: status chips, strength gauge, Union corps badges', sprites: buildOverlaySprites(T, needed, { all }) });

const report = { generated: new Date().toISOString(), palette, vocabulary: all ? 'all' : 'needed', tokenHash, scales: SCALES, dataset: needed.dataset, atlases: {} };
for (const set of sets) {
  const t0 = Date.now(); const layout = pack(set.sprites);
  const out = await rasterise(set.sprites, layout, { scales: SCALES, each: true, webp: true });
  // per-sprite SVG files (the designer's source of truth)
  let svgBytes = 0; let svgGz = 0;
  for (const s of set.sprites) { const f = path.join(outDir, 'svg', s.key + '.svg'); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s.svg); svgBytes += Buffer.byteLength(s.svg); svgGz += gz(Buffer.from(s.svg)); }
  const index = { format: 'battle-symbology-atlas/1', atlas: set.id, label: set.label, palette, tokenHash, scales: SCALES, pad: 2, units: 'CSS px at 1x; sprite rectangles at scale s are (x*s, y*s, w*s, h*s)', size: { w: layout.w, h: layout.h },
    files: Object.fromEntries(SCALES.map((s) => [s, `${set.id}@${s}x.png`])), evidence: EVIDENCE_OF_GROUP,
    ...(set.id === 'overlays' ? { meta: { leader: { ...T.leader, boneColour: T.palette.bone, keylineColour: T.palette.keyline }, chip: { size: T.chip.size, ring: T.ring.light + T.ring.dark } } } : {}), sprites: {} };
  const U = (a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])]; const rr = (cx, cy, w, h) => [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2];
  const ringR = T.ring.light + T.ring.dark; const chipW = T.chip.size + 2 * ringR; const gaugeW = 4 * T.gauge.segW + 3 * T.gauge.gap + 2 * ringR; const gaugeH = T.gauge.h + 2 * ringR; const badgeW = T.badge.size + 2 * ringR;
  for (const s of set.sprites) {
    const r = layout.rects.get(s.key);
    let box = s.core; if (s.strip) box = U(box, s.strip); let boxFull = null;
    if (s.group === 'base' && s.anchors) { boxFull = U(box, rr(s.anchors.ne[0], s.anchors.ne[1], chipW, chipW)); boxFull = U(boxFull, rr(s.anchors.below[0], s.anchors.below[1] + gaugeH / 2 + 0.5, gaugeW, gaugeH)); boxFull = U(boxFull, rr(s.anchors.left[0] - badgeW / 2 + 2, s.anchors.left[1], badgeW, badgeW)); }
    index.sprites[s.key] = { x: r.x, y: r.y, w: s.w, h: s.h, ax: s.ax, ay: s.ay, core: s.core.map((v) => Math.round(v * 100) / 100), box: box.map((v) => Math.round(v * 100) / 100), ...(boxFull ? { boxFull: boxFull.map((v) => Math.round(v * 100) / 100) } : {}), ...(s.strip ? { strip: s.strip.map((v) => Math.round(v * 100) / 100) } : {}), ...(s.ink ? { ink: s.ink.map((v) => Math.round(v * 100) / 100) } : {}), ...(s.anchors ? { anchors: Object.fromEntries(Object.entries(s.anchors).map(([k, v]) => [k, v.map((x) => Math.round(x * 100) / 100)])) } : {}), group: s.group, shape: s.shape,
      ...(s.sil ? { sil: s.sil } : {}), ...(s.slots ? { slots: s.slots } : {}), ...(s.stackOffset ? { stackOffset: s.stackOffset, depth: s.depth } : {}), ...(s.tab ? { tab: s.tab } : {}) };
  }
  fs.writeFileSync(path.join(outDir, 'atlas', `${set.id}.json`), JSON.stringify(index));
  const sizes = { sprites: set.sprites.length, byGroup: {}, atlas: { w: layout.w, h: layout.h }, svg: { files: set.sprites.length, bytes: svgBytes, gzipBytes: svgGz }, png: {}, pngEach: {}, webpLossless: {} };
  for (const s of set.sprites) sizes.byGroup[s.group] = (sizes.byGroup[s.group] || 0) + 1;
  for (const sc of SCALES) {
    fs.writeFileSync(path.join(outDir, 'atlas', `${set.id}@${sc}x.png`), out.atlasPng[sc]);
    sizes.png[`${sc}x`] = { w: layout.w * sc, h: layout.h * sc, bytes: out.atlasPng[sc].length };
    sizes.pngEach[`${sc}x`] = { files: out.each[sc].size, bytes: [...out.each[sc].values()].reduce((a, b) => a + b.length, 0) };
    sizes.webpLossless[`${sc}x`] = { bytes: out.webp[sc].length };
    if (sc === 1 || sc === 3) { const d = path.join(ROOT, '..', '..', '..', '..', 'tmp', 'look-dev', 'symbology', 'each', set.id, `${sc}x`); }
  }
  report.atlases[set.id] = sizes;
  console.log(`${set.id}: ${set.sprites.length} sprites, atlas ${layout.w}x${layout.h} u, PNG ${SCALES.map((sc) => sizes.png[sc + 'x'].bytes).join(' / ')} bytes, svg ${svgBytes} bytes, ${(Date.now() - t0) / 1000}s`);
  set.layout = layout; set.out = out;
}
const legend = { format: 'battle-symbology-legend/1', evidenceLabels: EVIDENCE_LABELS, palette, languages: {} };
for (const set of sets) if (set.id !== 'overlays') { const sel = set.sprites.find((x) => x.group === 'ring' && x.key.includes('/ring/select/') && x.key.includes('regiment')); legend.languages[set.id] = { label: set.label, rows: legendFor(set.id, { selectKey: sel ? sel.key : null, has: (k) => set.sprites.some((x) => x.key === k) }) }; }
fs.writeFileSync(path.join(outDir, 'legend.json'), JSON.stringify(legend, null, 1));
const total = (f) => Object.values(report.atlases).reduce((a, s) => a + f(s), 0);
report.totals = { sprites: total((s) => s.sprites), png1x: total((s) => s.png['1x'].bytes), png2x: total((s) => s.png['2x'].bytes), png3x: total((s) => s.png['3x'].bytes), svgBytes: total((s) => s.svg.bytes) };
fs.mkdirSync(path.join(ROOT, 'results'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'results', palette === 'standard' ? 'atlas-sizes.json' : `atlas-sizes-${palette}.json`), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(ROOT, 'results', 'needed-set.json'), JSON.stringify(needed, null, 2));
console.log('totals', JSON.stringify(report.totals));
// lossless WebP next to every PNG (python + Pillow): the PNG stays the reference and the fallback; the step proves the WebP is the same picture or removes it
const wp = spawnSync('python', [path.join(ROOT, 'tools', 'webp-pack.py'), outDir], { encoding: 'utf8' });
if (wp.status === 0) console.log(wp.stdout.trim()); else console.warn('webp-pack skipped (needs python with Pillow):', (wp.stderr || wp.stdout || '').trim().split(String.fromCharCode(10)).pop());
export { sets, T, tree, needed, outDir };

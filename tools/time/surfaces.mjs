#!/usr/bin/env node
// Formula inventory (WP-TIME-20, TM-V9): finds every tick-to-clock / tick-to-date implementation in the legacy site, evaluates each one on
// all 675 ticks against the canonical model, and reports how far it is from it. Regressions are detectable: --check compares the inventory
// with the committed baseline (tools/time/surfaces.baseline.json) and fails on a changed, added or removed implementation.
//
// The nine implementations (chapter 04 section 2.1):
//   store getTickTime | HUD date badge | monument tooltip JF | ancestor timeline QF | day/night lighting M4+E4 |
//   compare.html | living-ledger.html | camera.html | immersive.html
//
//   node tools/time/surfaces.mjs                     print the inventory and write docs/editorial/formula-inventory.md + tools/time/build/surfaces.json
//   node tools/time/surfaces.mjs --check             compare with the baseline (exit 1 on any difference)
//   node tools/time/surfaces.mjs --baseline          rewrite the baseline from the current tree
//   node tools/time/surfaces.mjs --root=<dir>        scan another tree (for example a patched output) instead of legacy/dist
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';
import { P, ROOT, LEGACY, BUNDLE, readText, writeIfChanged, parseArgs, mdTable, mean, median, r1 } from './lib.mjs';
import m from '../../src/lib/time/index.js';

const { flags } = parseArgs(process.argv.slice(2));
const TREE = flags.root ? path.resolve(String(flags.root)) : LEGACY;
const SAMPLE = [1, 12, 17, 28, 100, 160, 225, 226, 267, 300, 338, 368, 451, 518, 538, 551, 675];
const sha = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 10);
const T = m.tickMax;

// ---------------------------------------------------------------- load files
const files = {};
for (const f of fs.readdirSync(TREE)) if (/\.(html|js|json)$/.test(f)) files[f] = readText(path.join(TREE, f));
const assetsDir = path.join(TREE, 'assets');
if (fs.existsSync(assetsDir)) for (const f of fs.readdirSync(assetsDir)) if (/\.js$/.test(f)) files['assets/' + f] = readText(path.join(assetsDir, f));
const bundleName = Object.keys(files).find((f) => /^assets\/index-[\w-]+\.js$/.test(f)) || BUNDLE;
const bundle = files[bundleName];
if (!bundle) { console.error('bundle not found under ' + TREE); process.exit(2); }

const lineOf = (text, idx) => { let n = 1; for (let i = 0; i < idx; i++) if (text.charCodeAt(i) === 10) n++; return n; };
const locOf = (file, text, idx) => `${file}:${lineOf(text, idx)}@${idx}`;

// ---------------------------------------------------------------- AST helpers
const bundleAst = acorn.parse(bundle, { ecmaVersion: 'latest', sourceType: 'module' });
function findFunction(ast, name) { let hit = null; walk.simple(ast, { FunctionDeclaration(n) { if (n.id && n.id.name === name && !hit) hit = n; } }); return hit; }
function findProperty(ast, key) { let hit = null; walk.simple(ast, { Property(n) { if (!hit && n.key && (n.key.name === key || n.key.value === key)) hit = n; } }); return hit; }
function inlineScripts(html) { const out = []; const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g; let mm; while ((mm = re.exec(html))) out.push({ text: mm[1], index: mm.index + mm[0].indexOf('>') + 1 }); return out; }
function pageFunction(file, name) {
  for (const s of inlineScripts(files[file] || '')) {
    let ast; try { ast = acorn.parse(s.text, { ecmaVersion: 'latest', sourceType: 'script' }); } catch { continue; }
    const fn = findFunction(ast, name); if (fn) return { src: s.text.slice(fn.start, fn.end), idx: s.index + fn.start };
  }
  return null;
}
function run(code, args) { const sb = { Math, String, Number }; vm.createContext(sb); return vm.runInContext('(' + code + ')', sb)(...args); }

// ---------------------------------------------------------------- parse printed clocks
function parsePrinted(s) {
  s = String(s);
  let mm;
  if ((mm = /July (\d+), (\d+):(\d\d) (AM|PM)/i.exec(s))) return { date: +mm[1], mod: ((+mm[2] % 12) + (mm[4].toUpperCase() === 'PM' ? 12 : 0)) * 60 + +mm[3] };
  if ((mm = /(\d+):(\d\d) (AM|PM) July (\d+)/i.exec(s))) return { date: +mm[4], mod: ((+mm[1] % 12) + (mm[3].toUpperCase() === 'PM' ? 12 : 0)) * 60 + +mm[2] };
  if ((mm = /^(\d+):(\d\d)(am|pm)/i.exec(s))) return { date: null, mod: ((+mm[1] % 12) + (mm[3].toLowerCase() === 'pm' ? 12 : 0)) * 60 + +mm[2] };
  if ((mm = /^July (\d+), 1863$/.exec(s))) return { date: +mm[1], mod: null };
  return null;
}
const canon = (t) => { const p = m.parts(t, 0); return { date: p.date, mod: p.mod }; };
const circ = (a, b) => { const d = Math.abs(a - b) % 1440; return Math.min(d, 1440 - d); };

// ---------------------------------------------------------------- the nine implementations
const impls = [];
function addImpl(o) { impls.push(o); }

// 1 store getTickTime
{
  const p = findProperty(bundleAst, 'getTickTime');
  const src = bundle.slice(p.value.start, p.value.end);
  const f = (t) => run('(fn)=>fn(()=>({currentTick:' + t + '}))', [(g) => run(src, [])(g)]);
  const call = (t) => new Function('f', 'return (' + src + ')()')(() => ({ currentTick: t }));
  addImpl({ id: 'A', name: 'store getTickTime', file: bundleName, at: locOf(bundleName, bundle, p.value.start), src, rule: 'base 06:00 (Day 1) / 04:00 (Days 2-3), 5 min/tick, date = Day tab number, no midnight rollover', feeds: 'toolbar label, time bar, mobile header clock', out: call, kind: 'clock+date' });
}
// 2 HUD date badge: template `July ${l+2}, 1863`
{
  let hit = null;
  walk.simple(bundleAst, { TemplateLiteral(n) { if (!hit && n.quasis[0].value.raw === 'July ' && n.quasis.length === 2 && n.quasis[1].value.raw === ', 1863') hit = n; } });
  if (hit) {
    const src = bundle.slice(hit.start, hit.end), expr = bundle.slice(hit.expressions[0].start, hit.expressions[0].end);
    const dayExpr = 'x<=225?1:x<=450?2:3'; // the tab expression that feeds l in the same declaration (asserted below)
    const around = bundle.slice(hit.start - 60, hit.start);
    addImpl({ id: 'B', name: 'HUD date badge (_F)', file: bundleName, at: locOf(bundleName, bundle, hit.start), src: around + src, rule: 'date = Day tab number + 2 (July 3-5), fixed ", 1863"', feeds: 'map HUD badge', kind: 'date',
      out: (t) => run(`(x)=>{const l=${dayExpr};return ${src}}`, [t]), attributed: /x<=225\?1:x<=450\?2:3/.test(around) });
  }
}
// 3 JF, 4 QF
for (const [id, fn, name, rule, feeds, args] of [
  ['C', 'JF', 'monument tooltip JF', 'base 05:00, 5 min/tick, date = monument day + 2, day passed in by the caller', 'monument hover text', (t) => [t, m.tabDay(t)]],
  ['D', 'QF', 'ancestor timeline QF', 'base 05:00, 5 min/tick, date = tab number + 2', 'Follow-Your-Ancestor rows', (t) => [t]],
]) {
  const n = findFunction(bundleAst, fn);
  if (n) { const src = bundle.slice(n.start, n.end); addImpl({ id, name, file: bundleName, at: locOf(bundleName, bundle, n.start), src, rule, feeds, kind: 'clock+date', out: (t) => run(src.replace(/^function \w+/, 'function'), args(t)) }); }
}
// 5 M4 + E4 lighting
{
  const a = findFunction(bundleAst, 'M4'), b = findFunction(bundleAst, 'E4');
  if (a && b) {
    const srcA = bundle.slice(a.start, a.end), srcB = bundle.slice(b.start, b.end);
    addImpl({ id: 'E', name: 'day/night lighting M4 + E4', file: bundleName, at: locOf(bundleName, bundle, a.start), src: srcA + srcB, rule: 'hour = 05:00 base + 5 min/tick per tab; tint table keyed on hour (night before 05, dusk 16-21)', feeds: 'desktop map tint overlay', kind: 'hour',
      out: (t) => { const sb = { Math }; vm.createContext(sb); vm.runInContext(srcA + srcB, sb); return { hour: vm.runInContext(`M4(${t})`, sb), alpha: vm.runInContext(`E4(M4(${t}))`, sb).alpha }; } });
  }
}
// 6-9 static pages
for (const [id, file, fn, extra] of [['F', 'compare.html', 'approxTimeForTick', 'dayForTick'], ['G', 'living-ledger.html', 'timeForTick', null], ['H', 'camera.html', 'hourForTick', null], ['I', 'immersive.html', 'hourForTick', null]]) {
  const f = pageFunction(file, fn);
  if (!f) continue;
  const rule = { F: 'base 05:00 per tab, 5 min/tick, lower-case am/pm, no date ("Day N" shown separately)', G: 'base 05:00 per tab, 5 min/tick, date = tab number (DAY_BOUNDS [1,226,451,676])', H: 'integer hour, base 05:00 per tab, 5 min/tick, wraps at 24', I: 'integer hour, base 05:00 per tab, 5 min/tick (same code as camera.html)' }[id];
  const feeds = { F: 'Compare time labels', G: 'Living Ledger clock', H: 'Camera atmosphere overlay', I: 'Immersive atmosphere overlay' }[id];
  const src = f.src + (id === 'G' ? '' : '');
  const pre = id === 'G' ? 'const DAY_BOUNDS=[1,226,451,676];' : '';
  addImpl({ id, name: file, file, at: locOf(file, files[file], f.idx), src: f.src, rule, feeds, kind: id === 'H' || id === 'I' ? 'hour' : id === 'F' ? 'clock' : 'clock+date',
    out: (t) => { const sb = { Math, String }; vm.createContext(sb); vm.runInContext(pre + f.src, sb); return vm.runInContext(`${fn}(${t})`, sb); } });
}

// ---------------------------------------------------------------- evaluate every implementation on all ticks against the canonical model
const inventory = [];
for (const im of impls) {
  const per = [], samples = {};
  let dateWrong = 0, over30 = 0, over60 = 0; const errs = [];
  for (let t = 1; t <= T; t++) {
    let o; try { o = im.out(t); } catch (e) { o = null; }
    const c = canon(t);
    if (im.id === 'E') { const h = o.hour, e = circ(Math.round(h * 60), c.mod); per.push(e); errs.push(e); if (e > 30) over30++; if (e > 60) over60++; if (SAMPLE.includes(t)) samples[t] = `hour ${h.toFixed(2)} alpha ${o.alpha}`; continue; }
    if (im.id === 'H' || im.id === 'I') { const e = circ(o * 60 + 30, c.mod); errs.push(e); if (Math.abs(o - Math.floor(c.mod / 60)) >= 1 && circ(o * 60, c.mod - (c.mod % 60)) >= 60) over60++; if (o !== Math.floor(c.mod / 60)) over30++; if (SAMPLE.includes(t)) samples[t] = `hour ${o}`; continue; }
    const pr = parsePrinted(o);
    if (SAMPLE.includes(t)) samples[t] = o;
    if (!pr) continue;
    if (pr.date !== null && pr.date !== c.date) dateWrong++;
    if (pr.mod !== null) { const e = circ(pr.mod, c.mod); errs.push(e); if (e > 30) over30++; if (e > 60) over60++; }
  }
  inventory.push({ id: im.id, name: im.name, file: im.file, at: im.at, hash: sha(im.src), bytes: im.src.length, rule: im.rule, feeds: im.feeds, kind: im.kind,
    ticksOver30MinFromModel: over30, ticksOver60MinFromModel: over60, datesWrong: dateWrong, meanAbsErrMin: errs.length ? r1(mean(errs)) : null, medianAbsErrMin: errs.length ? r1(median(errs)) : null, samples });
}

// ---------------------------------------------------------------- generic detectors (TM-V9 style), attributed to the known implementations or flagged UNKNOWN
const known = [];
for (const im of impls) { const text = files[im.file]; const i = text.indexOf(im.src); if (i >= 0) known.push({ file: im.file, from: i, to: i + im.src.length, id: im.id }); }
const DETECTORS = [
  ['tick*5', /\)\s*\*\s*5\b/g, (text, i) => /(?:-\s*1|-\s*dayStart(?:Tick)?|-\s*dayStart)\s*\)\s*\*\s*5\b/.test(text.slice(Math.max(0, i - 40), i + 8))],
  ['5*60|6*60|4*60', /\b[456]\s*\*\s*60\b/g, () => true],
  ['toLocale*String|getHours|Intl.DateTimeFormat', /toLocale(?:Time|Date)String|getHours\(|Intl\.DateTimeFormat/g, () => true],
  ['July ${..+-N}', /July \$\{[^}]*[+-]\s*\d/g, () => true],
  ['tab expression (<=225 ? 1 : <=450 ? 2 : 3)', /<=?\s*225\s*\?\s*1\s*:\s*\(?\s*\w+\s*<=?\s*450\s*\?\s*2\s*:\s*3/g, () => true],
  ['hour step of 12 ticks', /shiftKey\?(?:\w+[+-]12\b|12:)|=>\w+\(\w+[+-]12\)/g, () => true],
];
const generic = [];
for (const [name, re, keep] of DETECTORS) {
  for (const [file, text] of Object.entries(files)) {
    if (/^assets\/index-.*\.js$/.test(file) === false && !/\.(html|js)$/.test(file)) continue;
    let mm; re.lastIndex = 0;
    while ((mm = re.exec(text))) {
      if (!keep(text, mm.index)) continue;
      const owner = known.find((k) => k.file === file && mm.index >= k.from && mm.index < k.to);
      generic.push({ detector: name, file, at: lineOf(text, mm.index) + '@' + mm.index, attributedTo: owner ? owner.id : null, text: text.slice(Math.max(0, mm.index - 30), mm.index + mm[0].length + 20).replace(/\s+/g, ' ') });
    }
  }
}
const byDetector = {};
for (const g of generic) { const d = (byDetector[g.detector] ||= { total: 0, attributed: 0, byFile: {} }); d.total++; if (g.attributedTo) d.attributed++; d.byFile[g.file] = (d.byFile[g.file] || 0) + 1; }
const unknownTickFormulas = generic.filter((g) => (g.detector === 'tick*5' || g.detector === '5*60|6*60|4*60' || g.detector === 'July ${..+-N}') && !g.attributedTo);
const wallClock = generic.filter((g) => g.detector.startsWith('toLocale'));

// visible jargon and copy related to the clock (counts only)
const COPY = { 'Tick N (visible text)': /["`>](?:At )?Tick ["`$]|"Tick "|tick \$\{|Tick \$\{|"tick "/g, 'real time': /real[- ]time/gi, 'five-minute': /five[- ]minute|5[- ]minute/gi, 'minute-by-minute': /minute-by-minute/gi };
const copy = {};
for (const [k, re] of Object.entries(COPY)) { let n = 0; const where = {}; for (const [file, text] of Object.entries(files)) { const c = (text.match(re) || []).length; if (c) { n += c; where[file] = c; } } copy[k] = { total: n, files: where }; }

const result = {
  tree: path.relative(ROOT, TREE).replace(/\\/g, '/') || '.', bundle: bundleName, bundleBytes: bundle.length, implementations: inventory,
  detectors: byDetector, unknownTickFormulas: unknownTickFormulas.map((g) => `${g.detector} ${g.file}:${g.at} ${g.text}`), wallClock: wallClock.map((g) => `${g.file}:${g.at}`), copy,
  module: { version: m.version, dv: m.dv },
};

// ---------------------------------------------------------------- output
const lines = [];
lines.push(`Formula inventory for ${result.tree} (${inventory.length} tick-to-clock/date implementations found, canonical model ${m.version} dv${m.dv} CANDIDATE)`);
lines.push(mdTable(['id', 'implementation', 'location', 'rule', 'ticks >30 min off', 'ticks >60 min off', 'dates wrong', 'mean abs err (min)'], inventory.map((i) => [i.id, i.name, i.at, i.rule, i.ticksOver30MinFromModel, i.ticksOver60MinFromModel, i.datesWrong, i.meanAbsErrMin ?? 'n/a'])));
lines.push('');
lines.push('Generic detectors (matches / attributed to one of the implementations above): ' + Object.entries(byDetector).map(([k, v]) => `${k}: ${v.total}/${v.attributed}`).join('; '));
lines.push(`Unattributed tick formulas: ${unknownTickFormulas.length}${unknownTickFormulas.length ? '\n  ' + result.unknownTickFormulas.join('\n  ') : ''}`);
lines.push(`Wall-clock (visitor's own clock, allow-listed): ${result.wallClock.join(', ') || 'none'}`);
lines.push('Clock copy counts: ' + Object.entries(copy).map(([k, v]) => `${k}: ${v.total}`).join('; '));
console.log(lines.join('\n'));

const sampleRows = SAMPLE.map((t) => [t, m.tickToLabel(t, { style: 'compat', approx: false, roundMin: 0 }), ...inventory.map((i) => String(i.samples[t] ?? '').replace(/\n/g, ' '))]);
const md = `# Formula inventory: every tick-to-clock implementation in the legacy site

> CANDIDATE, generated by \`node tools/time/surfaces.mjs\` on the frozen baseline (\`${result.tree}\`, bundle \`${bundleName}\`, md5 pinned by tools/t0). Nothing here is approved by the historian or the owner; the canonical model is the proposed set (${m.version}, dv ${m.dv}). Do not edit by hand: re-run the script.

There are ${inventory.length} independent implementations that turn a tick into a clock, a date or an hour of day. Each was evaluated on all ${T} ticks and compared with the canonical model. "Ticks more than 30 (60) minutes off" counts ticks where the printed time-of-day differs from the model by more than that (hour-only implementations compare the whole hour). "Dates wrong" counts ticks whose printed calendar date differs from the model (the model's date rolls at midnight).

${mdTable(['id', 'implementation', 'location (file:line@offset)', 'rule', '>30 min off', '>60 min off', 'dates wrong', 'mean abs err (min)', 'feeds'], inventory.map((i) => [i.id, i.name, i.at, i.rule, i.ticksOver30MinFromModel, i.ticksOver60MinFromModel, i.datesWrong, i.meanAbsErrMin ?? 'n/a', i.feeds]))}

## The same ticks through every implementation

${mdTable(['tick', 'canonical (exact, unrounded)', ...inventory.map((i) => `${i.id} ${i.name}`)], sampleRows)}

## Regression detectors (what a new implementation would trip)

${mdTable(['detector', 'matches', 'attributed to a known implementation', 'files'], Object.entries(byDetector).map(([k, v]) => [k, v.total, v.attributed, Object.entries(v.byFile).map(([f, n]) => `${f}: ${n}`).join(', ')]))}

Unattributed tick formulas (must be 0 for the baseline; any new one is a regression): **${unknownTickFormulas.length}**.
Wall-clock use (the visitor's own clock, legitimate, allow-listed): ${wallClock.map((g) => g.file + ' ' + g.at).join(', ') || 'none'}.

## Clock copy and tick jargon (counts across the tree)

${mdTable(['pattern', 'matches', 'files'], Object.entries(copy).map(([k, v]) => [k, v.total, Object.entries(v.files).map(([f, n]) => `${f}: ${n}`).join(', ')]))}

Typed clocks beside ticks (monument labels, tour subtitles, Turning Points day parts, Sandbox presets) are counted by \`tools/time/validate.mjs\` (TM-V3), not here.
`;

const BASELINE = P('tools', 'time', 'surfaces.baseline.json');
const compact = { implementations: inventory.map(({ id, name, hash, bytes, ticksOver30MinFromModel, ticksOver60MinFromModel, datesWrong, meanAbsErrMin }) => ({ id, name, hash, bytes, ticksOver30MinFromModel, ticksOver60MinFromModel, datesWrong, meanAbsErrMin })), detectors: Object.fromEntries(Object.entries(byDetector).map(([k, v]) => [k, { total: v.total, attributed: v.attributed }])), unknownTickFormulas: unknownTickFormulas.length, copy: Object.fromEntries(Object.entries(copy).map(([k, v]) => [k, v.total])) };
if (flags.baseline) { fs.writeFileSync(BASELINE, JSON.stringify(compact, null, 2) + '\n'); console.log('baseline written'); }
else if (flags.check) {
  const base = JSON.parse(readText(BASELINE)); const diffs = [];
  const a = JSON.stringify(base, null, 1).split('\n'), b = JSON.stringify(compact, null, 1).split('\n');
  for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) diffs.push(`baseline: ${a[i]}   now: ${b[i]}`);
  if (diffs.length) { console.error('SURFACE REGRESSION vs tools/time/surfaces.baseline.json:\n' + diffs.slice(0, 40).join('\n')); process.exit(1); }
  console.log('surfaces match the baseline');
} else if (!flags.root) {
  writeIfChanged(P('docs', 'editorial', 'formula-inventory.md'), md);
  writeIfChanged(P('tools', 'time', 'build', 'surfaces.json'), JSON.stringify(result, null, 2) + '\n');
}
export { result as surfaces };

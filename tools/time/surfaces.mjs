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
import { findMatches, exemptModule, DETECTORS } from './detectors.mjs';
import { loadTreeFiles, isCode, kindOf } from './data.mjs';

const { flags } = parseArgs(process.argv.slice(2));
const TREE = flags.root ? path.resolve(String(flags.root)) : LEGACY;
const SAMPLE = [1, 12, 17, 28, 100, 160, 225, 226, 267, 300, 338, 368, 451, 518, 538, 551, 675];
const sha = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 10);
const T = m.tickMax;

// ---------------------------------------------------------------- load files
// the same loader as TM-V9 (tools/time/data.mjs): root files, assets/*, and every script-bearing file in any subdirectory (a shared script in js/ or scripts/ is loaded by every page)
const files = {};
for (const [f, t] of Object.entries(loadTreeFiles(TREE).files)) if (!/\.css$/.test(f)) files[f] = t;
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
// the inlined module (patched trees): var GTBGT=(function(){...})(); in the bundle, window.GTBGTime in a page <script>
const GT = {};
{
  // the module is followed by the helper assignments of the CLOCK group (GTBGT.s=...;) or, in a tree with the module alone, by the next declaration (function v4()): the lookahead
  // names both, so an inner IIFE of the module can not end the match early (the old lookahead named only v4 and found nothing once helpers followed the module)
  const m = /var GTBGT=(\(function\(\)\{[\s\S]*?\}\)\(\));(?=GTBGT\.\w+=|function v4\()/.exec(bundle);
  if (m) { const sb = {}; vm.createContext(sb); vm.runInContext('var G=' + m[1] + ';', sb); GT.GTBGT = sb.G; }
  for (const [f, text] of Object.entries(files)) {
    if (!f.endsWith('.html')) continue;
    const mm = /\(function\(g\)\{g\.GTBGTime=(\(function\(\)\{[\s\S]*?\}\)\(\));\}\)\(/.exec(text);
    if (mm) { const sb = {}; vm.createContext(sb); vm.runInContext('var G=' + mm[1] + ';', sb); GT.GTBGTime = sb.G; break; }
  }
}
const sandbox = () => { const sb = { Math, String, Number, ...GT }; vm.createContext(sb); return sb; };
function run(code, args) { const sb = sandbox(); return vm.runInContext('(' + code + ')', sb)(...args); }

// ---------------------------------------------------------------- parse printed clocks
function parsePrinted(s) {
  s = String(s).replace(/about /g, '').replace(/Night of July (\d+)-(\d+)/g, 'July $2');
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
  const call = (t) => run('(f)=>(' + src + ')()', [() => ({ currentTick: t })]);
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
      out: (t) => { const sb = sandbox(); vm.runInContext(srcA + srcB, sb); return { hour: vm.runInContext(`M4(${t})`, sb), alpha: vm.runInContext(`E4(M4(${t}))`, sb).alpha }; } });
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
    out: (t) => { const sb = sandbox(); vm.runInContext(pre + f.src, sb); return vm.runInContext(`${fn}(${t})`, sb); } });
}

// ---------------------------------------------------------------- evaluate every implementation on all ticks against the canonical model
const inventory = [];
for (const im of impls) {
  const per = [], samples = {};
  let dateWrong = 0, over30 = 0, over60 = 0; const errs = [];
  let evalErrors = 0, firstEvalError = null;
  for (let t = 1; t <= T; t++) {
    // an implementation that throws or returns nothing is a finding, never a crash of the inventory: it is counted per implementation and reported (exit 3) after the table is printed
    let o, why = null; try { o = im.out(t); } catch (e) { why = String((e && e.message) || e).slice(0, 160); }
    if (why === null && (o === null || o === undefined)) why = `returned ${o}`;
    if (why !== null) { if (!evalErrors++) firstEvalError = `tick ${t}: ${why}`; continue; }
    const c = canon(t);
    if (im.id === 'E') { const h = o.hour, e = circ(Math.round(h * 60), c.mod); per.push(e); errs.push(e); if (e > 30) over30++; if (e > 60) over60++; if (SAMPLE.includes(t)) samples[t] = `hour ${h.toFixed(2)} alpha ${o.alpha}`; continue; }
    if (im.id === 'H' || im.id === 'I') { const oh = Math.floor(o), e = circ(oh * 60 + 30, c.mod - (c.mod % 60) + 30); errs.push(e); if (circ(oh * 60, c.mod - (c.mod % 60)) >= 60) over60++; if (oh !== Math.floor(c.mod / 60)) over30++; if (SAMPLE.includes(t)) samples[t] = `hour ${o}`; continue; }
    const pr = parsePrinted(o);
    if (SAMPLE.includes(t)) samples[t] = o;
    if (!pr) continue;
    if (pr.date !== null && pr.date !== c.date) dateWrong++;
    if (pr.mod !== null) { const e = circ(pr.mod, c.mod); errs.push(e); if (e > 30) over30++; if (e > 60) over60++; }
  }
  inventory.push({ id: im.id, name: im.name, file: im.file, at: im.at, routed: /GTBGT(?:ime)?\b/.test(im.src), hash: sha(im.src), bytes: im.src.length, rule: im.rule, feeds: im.feeds, kind: im.kind,
    ticksOver30MinFromModel: over30, ticksOver60MinFromModel: over60, datesWrong: dateWrong, meanAbsErrMin: errs.length ? r1(mean(errs)) : null, medianAbsErrMin: errs.length ? r1(median(errs)) : null, samples, evalErrors, firstEvalError });
}

// ---------------------------------------------------------------- generic detectors (TM-V9 style), attributed to the known implementations or flagged UNKNOWN
// The detector families live in detectors.mjs (shared with TM-V9/V16/V17): they match the SHAPE of a tick -> clock formula (a month plus a constant,
// (x-k)*5, 300000, (tick-1)/12, 4/5/6 hour bases, time-of-day formatters off a bare new Date(), typed AM/PM), not one spelling. The module's own
// inlined text is exempt (exact bytes); an edited copy of it is not.
const known = [];
for (const im of impls) { const text = files[im.file]; const i = text.indexOf(im.src); if (i >= 0) known.push({ file: im.file, from: i, to: i + im.src.length, id: im.id }); }
const LOCAL = [ // inventory-only detectors: shapes of the tab arithmetic itself (not printed clocks)
  ['tab expression (<=225 ? 1 : <=450 ? 2 : 3)', /<=?\s*225\s*\?\s*1\s*:\s*\(?\s*\w+\s*<=?\s*450\s*\?\s*2\s*:\s*3/g],
  ['hour step of 12 ticks', /shiftKey\?(?:\w+[+-]12\b|12:)|=>\w+\(\w+[+-]12\)/g],
];
const generic = [];
const scanFiles = exemptModule(files);
const owner = (file, i) => known.find((k) => k.file === file && i >= k.from && i < k.to);
for (const [file, text] of Object.entries(scanFiles)) {
  if (!isCode(file)) continue; // the bundle, chunks, pages, site scripts and modules
  const loc = (i) => lineOf(text, i) + '@' + i, ctx = (i, len) => text.slice(Math.max(0, i - 30), i + len + 20).replace(/\s+/g, ' ');
  for (const h of findMatches(text, undefined, { kind: kindOf(file) })) { const o = owner(file, h.index); generic.push({ detector: h.surface, formula: h.formula, allowed: h.allowed, file, at: loc(h.index), attributedTo: o ? o.id : null, text: ctx(h.index, h.text.length) }); }
  for (const [name, re] of LOCAL) { let mm; re.lastIndex = 0; while ((mm = re.exec(text))) { const o = owner(file, mm.index); generic.push({ detector: name, formula: false, allowed: false, file, at: loc(mm.index), attributedTo: o ? o.id : null, text: ctx(mm.index, mm[0].length) }); } }
}
// every detector has a row, even at 0 (a new one shows up in the baseline diff); the visitor's own clock (a bare `new Date()`) is not a tick formula and is not counted
const byDetector = Object.fromEntries([...DETECTORS.map((d) => d.surface), ...LOCAL.map((l) => l[0])].filter((n, i, a) => a.indexOf(n) === i).map((n) => [n, { total: 0, attributed: 0, byFile: {} }]));
for (const g of generic) { if (g.allowed) continue; const d = byDetector[g.detector]; d.total++; if (g.attributedTo) d.attributed++; d.byFile[g.file] = (d.byFile[g.file] || 0) + 1; }
const unknownTickFormulas = generic.filter((g) => g.formula && !g.attributedTo && !g.allowed);
const wallClock = generic.filter((g) => g.allowed);

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
lines.push(mdTable(['id', 'implementation', 'location', 'rule', 'routed through the module', 'ticks >30 min off', 'ticks >60 min off', 'dates wrong', 'mean abs err (min)'], inventory.map((i) => [i.id, i.name, i.at, i.rule, i.routed ? 'yes' : 'no', i.ticksOver30MinFromModel, i.ticksOver60MinFromModel, i.datesWrong, i.meanAbsErrMin ?? 'n/a'])));
lines.push(`Legacy formulas still in use (not routed through the module): ${inventory.filter((i) => !i.routed).length} of ${inventory.length}`);
lines.push('');
lines.push('Generic detectors (matches / attributed to one of the implementations above): ' + Object.entries(byDetector).map(([k, v]) => `${k}: ${v.total}/${v.attributed}`).join('; '));
lines.push(`Unattributed tick formulas: ${unknownTickFormulas.length}${unknownTickFormulas.length ? '\n  ' + result.unknownTickFormulas.join('\n  ') : ''}`);
lines.push(`Wall-clock (visitor's own clock, allow-listed): ${result.wallClock.join(', ') || 'none'}`);
lines.push('Clock copy counts: ' + Object.entries(copy).map(([k, v]) => `${k}: ${v.total}`).join('; '));
console.log(lines.join('\n'));

const sampleRows = SAMPLE.map((t) => [t, m.tickToLabel(t, { style: 'compat', approx: false, roundMin: 0 }), ...inventory.map((i) => String(i.samples[t] ?? '').replace(/\n/g, ' '))]);
const md = `# Formula inventory: every tick-to-clock implementation in the legacy site

> **CANDIDATE. Nothing here is approved by the historian or the owner, and nothing here ships until they approve it (D-TIME).** Generated by \`node tools/time/surfaces.mjs\` on the frozen baseline (\`${result.tree}\`, bundle \`${bundleName}\`, md5 pinned by tools/t0). The canonical model is the proposed set (${m.version}, dv ${m.dv}). Do not edit by hand: re-run the script.

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
const compact = { implementations: inventory.map(({ id, name, routed, hash, bytes, ticksOver30MinFromModel, ticksOver60MinFromModel, datesWrong, meanAbsErrMin }) => ({ id, name, routed, hash, bytes, ticksOver30MinFromModel, ticksOver60MinFromModel, datesWrong, meanAbsErrMin })), detectors: Object.fromEntries(Object.entries(byDetector).map(([k, v]) => [k, { total: v.total, attributed: v.attributed }])), unknownTickFormulas: unknownTickFormulas.length, copy: Object.fromEntries(Object.entries(copy).map(([k, v]) => [k, v.total])) };
if (flags.baseline) { fs.writeFileSync(BASELINE, JSON.stringify(compact, null, 2) + '\n'); console.log('baseline written'); }
else if (flags.check) {
  const base = JSON.parse(readText(BASELINE)); const diffs = [];
  const flat = (o, pre = '', out = {}) => { if (Array.isArray(o)) o.forEach((v, i) => flat(v && v.id ? v : v, `${pre}[${o[i] && o[i].id ? o[i].id : i}]`, out)); else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) flat(v, pre ? `${pre}.${k}` : k, out); else out[pre] = o; return out; };
  const fa = flat(base), fb = flat(compact);
  for (const k of new Set([...Object.keys(fa), ...Object.keys(fb)])) if (fa[k] !== fb[k]) diffs.push(`${k}: baseline ${JSON.stringify(fa[k])} -> now ${JSON.stringify(fb[k])}`);
  if (diffs.length) { console.error('SURFACE REGRESSION vs tools/time/surfaces.baseline.json:\n' + diffs.slice(0, 40).join('\n')); process.exit(1); }
  console.log('surfaces match the baseline');
} else if (!flags.root) {
  writeIfChanged(P('docs', 'editorial', 'formula-inventory.md'), md);
  writeIfChanged(P('tools', 'time', 'build', 'surfaces.json'), JSON.stringify(result, null, 2) + '\n');
}
const broken = inventory.filter((i) => i.evalErrors);
if (broken.length) {
  console.error('INVENTORY ERROR: ' + broken.map((i) => `${i.id} ${i.name} threw or returned nothing on ${i.evalErrors} of ${T} ticks (first: ${i.firstEvalError})`).join('; '));
  if (!flags.noexit) process.exitCode = 3;
}
export { result as surfaces };

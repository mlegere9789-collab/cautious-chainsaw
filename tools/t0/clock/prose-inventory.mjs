#!/usr/bin/env node
// Inventory of every clock time TYPED IN PROSE in a built tree (the CLOCK group routes the strings that are a function of a tick through the time module;
// a time that a person typed inside a sentence is a claim of the text, and only the text's owner and the sources can correct it). This tool finds them all, attaches the
// frame the text belongs to where the data say which one it is, compares the typed time with the clock of that frame and prints what the sources support.
//
//   node tools/t0/clock/prose-inventory.mjs [--dist tmp/clock-integrate/clock-R1c/dist] [--out tools/t0/clock/PROSE-INVENTORY.md] [--json <file>] [--label "R1c + CLOCK"]
//
// Where the text comes from (every one is read from the built tree, nothing is guessed):
//   bundle   the Story cards (th), the monument story markers (mA), the NPS tour stops (d2), the onboarding steps (Gc), Soldier's Eye (message) and every other string literal
//            of the entry bundle that carries a time (listed as "other text"); the frame comes from the record's own `tick`
//   data     every string of data/*.json that carries a time; the frame comes from the record's tick / trigger_tick / approx_tick (sibling keys of the string)
//   pages    every time in the html of a page; the frame is the nearest `tick:` of the same script block within 400 characters (heuristic, said so)
// A typed time is read as a clock on the date the text names ("July 2") or on the date of the frame. delta = typed - model clock of the frame. Verdict:
//   consistent  |delta| <= the uncertainty bound of the frame (uncertainty_min, tools/time/build/uncertainty.json)
//   near        |delta| <= twice the bound
//   differs     more: either the text or the frame the text is attached to is wrong; the sources decide which (the nearest anchor and its window are printed)
//   no frame    the data do not say which frame the sentence belongs to
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { makeOracle } from './oracle.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const DIST = path.resolve(ROOT, opt('dist', 'tmp/clock-integrate/clock-R1c/dist'));
const OUT = opt('out', null);
const JSON_OUT = opt('json', null);
const LABEL = opt('label', path.relative(ROOT, DIST).replace(/\\/g, '/'));
const O = makeOracle();

// ------------------------------------------------------------------ finding times in a sentence
const RE_CLOCK = /\b(?<h>\d{1,2})(?::(?<m>\d{2}))?\s?(?<ap>[ap])\.?m\b\.?|\b(?<w>noon|midnight)\b|\b(?<oc>\d{1,2})\s+o['’]clock\b/gi;
function times(text) {
  const out = [];
  for (const m of text.matchAll(RE_CLOCK)) {
    const g = m.groups;
    let min, kind = 'clock';
    if (g.w) { min = g.w.toLowerCase() === 'noon' ? 720 : 0; kind = g.w.toLowerCase(); }
    else if (g.oc) { min = (+g.oc % 12) * 60; kind = "o'clock"; }
    else { const h = +g.h, mi = g.m ? +g.m : 0; if (h < 1 || h > 12 || mi > 59) continue; min = (h % 12) * 60 + mi + (g.ap.toLowerCase() === 'p' ? 720 : 0); }
    out.push({ phrase: m[0].trim(), min, kind, index: m.index });
  }
  return out;
}
const dateNear = (text, idx) => {
  const w = text.slice(Math.max(0, idx - 80), idx + 80);
  const m = /July\s+(\d{1,2})/.exec(w);
  return m ? +m[1] : null;
};

const records = [];
let fields = 0;                                   // typed clock fields of the data files (time, real_time, approx_time ...): counted, not prose
function consider(source, where, tick, text, extra = {}) {
  if (typeof text !== 'string') return;
  for (const t of times(text)) {
    const ctx = text.slice(Math.max(0, t.index - 60), t.index + t.phrase.length + 50).replace(/\s+/g, ' ');
    const rec = { source, where, tick: tick ?? null, phrase: t.phrase, context: ctx, ...extra };
    if (tick != null && tick >= 1 && tick <= 675) {
      const mod = O.minutes(tick), day = Math.floor(mod / 1440) + 1, named = dateNear(text, t.index);
      const date = named ?? day;
      const typed = (date - 1) * 1440 + t.min;
      let best = typed;
      if (named == null) for (const d of [-1440, 1440]) if (Math.abs(typed + d - mod) < Math.abs(best - mod)) best = typed + d;
      const delta = Math.round(best - mod), unc = O.uncertaintyMin(tick);
      rec.model = O.fmt(tick, 'compat'); rec.deltaMin = delta; rec.uncertaintyMin = Math.round(unc);
      rec.verdict = Math.abs(delta) <= unc ? 'consistent' : Math.abs(delta) <= 2 * unc ? 'near' : 'differs';
      rec.nearestAnchor = O.nearestAnchor(tick);
    } else rec.verdict = 'no frame';
    records.push(rec);
  }
}

// ------------------------------------------------------------------ bundle
function sliceArray(src, startRe) {
  const m = startRe.exec(src); if (!m) return null;
  let i = src.indexOf('[', m.index), depth = 0, q = null;
  const start = i;
  for (; i < src.length; i++) {
    const c = src[i];
    if (q) { if (c === '\\') i++; else if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === '`') { q = c; continue; }
    if (c === '[' || c === '{') depth++;
    else if (c === ']' || c === '}') { depth--; if (depth === 0) return { text: src.slice(start, i + 1), from: start, to: i + 1 }; }
  }
  return null;
}
const evalArr = (sl) => { try { return vm.runInNewContext('(' + sl.text + ')', { matchMedia: () => ({ matches: false }), window: {}, navigator: {} }, { timeout: 2000 }); } catch (e) { return null; } };
const entry = fs.readdirSync(path.join(DIST, 'assets')).find((f) => /^index-[0-9a-f]{8}\.js$/.test(f));
const bundle = fs.readFileSync(path.join(DIST, 'assets', entry), 'utf8');
const covered = [];
const ARR = [
  ['story cards', /\bth=\[\{id:1,title:/, (o) => [o.tick, `${o.title}: ${o.subtitle}`, o.narrative], (o) => `story ${o.id} "${o.title}"`],
  ['monument story markers', /\bmA=\[\{id:"mon_/, (o) => [o.tick, o.name, o.label], (o) => `marker ${o.id}`],
  ['NPS tour stops', /\bd2=\[\{id:1,name:/, (o) => [null, o.name, (o.history || []).join('  ')], (o) => `tour stop ${o.id} "${o.name}"`],
  ['onboarding steps', /\bGc=\[\{tick:1,title:/, (o) => [o.tick, o.title, `${o.body} ${o.hint || ''}`], (o) => `onboarding "${o.title}"`],
  ["Soldier's Eye viewpoints", /\[\{id:"[a-z0-9_]+",name:"[^"]*",message:/, (o) => [null, o.name, o.message], (o) => `viewpoint ${o.id}`],
];
for (const [label, re, pick, where] of ARR) {
  const sl = sliceArray(bundle, re); if (!sl) { console.error(`note: ${label}: array not found in ${entry}`); continue; }
  covered.push([sl.from, sl.to]);
  const arr = evalArr(sl); if (!Array.isArray(arr)) { console.error(`note: ${label}: not evaluable`); continue; }
  for (const o of arr) { const [tk, a, b] = pick(o); consider('bundle: ' + label, where(o), tk, [a, b].filter(Boolean).join('  ')); }
}
// every other string literal of the bundle with a time (outside the arrays above)
{
  const re = /"((?:[^"\\\n]|\\.){12,600})"|`((?:[^`\\]|\\.){12,600})`/g; let m;
  while ((m = re.exec(bundle))) {
    if (covered.some(([a, b]) => m.index >= a && m.index < b)) continue;
    const text = m[1] ?? m[2];
    if (!/\d\s?[ap]\.?m\b|\bnoon\b|midnight|o['’]clock/i.test(text) || /^[\w$.-]+$/.test(text)) continue;
    consider('bundle: other text', `offset ${m.index}`, null, text);
  }
}

// ------------------------------------------------------------------ data files
const tickOf = (o) => { for (const k of ['tick', 'trigger_tick', 'approx_tick', 'start_tick', 'startTick']) if (Number.isInteger(o[k])) return o[k]; return null; };
function walk(file, node, trail, tick) {
  if (typeof node === 'string') { consider('data: ' + file, trail, tick, node); return; }
  if (Array.isArray(node)) { node.forEach((x, i) => walk(file, x, `${trail}[${i}]`, tick)); return; }
  if (node && typeof node === 'object') {
    const tk = tickOf(node) ?? tick;
    const id = node.vignette_id || node.id || node.unit_id || node.regiment_id || null;
    for (const [k, v] of Object.entries(node)) {
      if (typeof v === 'string' && /^(tick|time|time_legacy|date|day|approx_time|approx_time_legacy|real_time)$/.test(k)) { fields++; continue; }   // typed clock FIELDS of the data files: not prose, counted
      walk(file, v, `${trail}${id ? `{${id}}` : ''}.${k}`, tk);
    }
  }
}
function walkDir(dir, rel = '') {
  for (const f of fs.readdirSync(dir).sort()) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) { walkDir(full, rel + f + '/'); continue; }
    if (!f.endsWith('.json') || /^(terrain|monuments)\.json$/.test(f)) continue;
    let doc; try { doc = JSON.parse(fs.readFileSync(full, 'utf8')); } catch { continue; }
    walk(rel + f.replace(/\d+/g, '#'), doc, '', null);
  }
}
walkDir(path.join(DIST, 'data'));

// ------------------------------------------------------------------ pages
for (const f of fs.readdirSync(DIST).filter((x) => x.endsWith('.html')).sort()) {
  const html = fs.readFileSync(path.join(DIST, f), 'utf8');
  const body = html.replace(/<script>\/\* GTBGTime[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<script[^>]*src=[^>]*><\/script>/g, ' ');
  const seen = new Set();
  for (const t of times(body)) {
    const key = body.slice(Math.max(0, t.index - 40), t.index + 40);
    if (seen.has(key)) continue; seen.add(key);
    const near = [...body.slice(Math.max(0, t.index - 400), t.index + 400).matchAll(/\btick:\s*(\d+)/g)].map((m) => ({ d: Math.abs(m.index + Math.max(0, t.index - 400) - t.index), tk: +m[1] })).sort((a, b) => a.d - b.d)[0];
    const clean = body.slice(Math.max(0, t.index - 80), t.index + 90).replace(/<[^>]+>/g, ' ');
    consider('page: ' + f, near ? 'nearest tick: in the same script (heuristic)' : 'page text', near ? near.tk : null, clean, { heuristicFrame: !!near });
  }
}

// ------------------------------------------------------------------ report
const by = {}; for (const r of records) { (by[r.source] ||= { consistent: 0, near: 0, differs: 0, 'no frame': 0 })[r.verdict]++; }
const tot = { consistent: 0, near: 0, differs: 0, 'no frame': 0 }; for (const r of records) tot[r.verdict]++;
let md = `# Clock times typed in prose: ${LABEL}\n\nGenerated by \`node tools/t0/clock/prose-inventory.mjs --dist ${path.relative(ROOT, DIST).replace(/\\/g, '/')}\` (clock oracle: data-src/time/time_anchors.json). ` +
  `Nothing here changes a word: the CLOCK group rewrites only strings that are a function of a frame (see tools/t0/CLOCK-README.md); a time typed inside a sentence is a claim of the text, and the sources decide.\n\n` +
  `**${records.length} typed times**: ${tot.consistent} consistent with the clock of their frame (within its uncertainty), ${tot.near} near (within twice), **${tot.differs} differ**, ${tot['no frame']} with no frame attached (the data do not say which moment the sentence is about).\n\n` +
  `Typed clock fields of the data files (time, real_time, approx_time: not prose, not displayed except by the pages that the CLOCK group routes through the model): ${fields}.

` +
  `delta = typed time minus the model clock of the frame, in minutes; bound = the frame's uncertainty_min. "Nearest anchor" = the adjudicated anchor closest to the frame (its status and window are the evidence the model clock rests on).\n\n## By source\n\n| source | consistent | near | differs | no frame |\n|---|---|---|---|---|\n`;
for (const [k, v] of Object.entries(by).sort()) md += `| ${k} | ${v.consistent} | ${v.near} | ${v.differs} | ${v['no frame']} |\n`;
const q = (s) => String(s).replace(/\|/g, '/').replace(/\n/g, ' ');
md += `\n## Typed times that differ from the clock of their frame (${tot.differs})\n\n| source | where | frame | model clock | typed | delta (min) | bound | nearest anchor | context |\n|---|---|---|---|---|---|---|---|---|\n`;
for (const r of records.filter((x) => x.verdict === 'differs').sort((a, b) => (a.tick - b.tick) || a.source.localeCompare(b.source))) {
  const a = r.nearestAnchor;
  md += `| ${q(r.source)} | ${q(r.where)}${r.heuristicFrame ? ' (frame by heuristic)' : ''} | ${r.tick} | ${r.model} | ${q(r.phrase)} | ${r.deltaMin} | ${r.uncertaintyMin} | t${a.tick} ${a.time} ${a.status}${a.window ? ' [' + a.window + ']' : ''} ${q(a.label)} | ${q(r.context)} |\n`;
}
md += `\n## Near (${tot.near})\n\n| source | where | frame | model clock | typed | delta | bound |\n|---|---|---|---|---|---|---|\n`;
for (const r of records.filter((x) => x.verdict === 'near').sort((a, b) => (a.tick - b.tick) || a.source.localeCompare(b.source))) md += `| ${q(r.source)} | ${q(r.where)} | ${r.tick} | ${r.model} | ${q(r.phrase)} | ${r.deltaMin} | ${r.uncertaintyMin} |\n`;
md += `\n## No frame attached (${tot['no frame']})\n\nThe sentence names a time but the data do not say which frame it belongs to. Listed so that nothing typed is invisible; each needs its source cited or the time removed or labelled as an estimate.\n\n| source | where | typed | context |\n|---|---|---|---|\n`;
for (const r of records.filter((x) => x.verdict === 'no frame')) md += `| ${q(r.source)} | ${q(r.where)} | ${q(r.phrase)} | ${q(r.context)} |\n`;
if (OUT) { fs.writeFileSync(path.resolve(ROOT, OUT), md); console.log(`wrote ${OUT}`); }
if (JSON_OUT) fs.writeFileSync(path.resolve(ROOT, JSON_OUT), JSON.stringify({ label: LABEL, totals: tot, bySource: by, records }, null, 1));
console.log(`${LABEL}: ${records.length} typed times: consistent ${tot.consistent}, near ${tot.near}, differs ${tot.differs}, no frame ${tot['no frame']}`);
for (const [k, v] of Object.entries(by).sort()) console.log(`  ${k.padEnd(52)} c${v.consistent} n${v.near} d${v.differs} x${v['no frame']}`);

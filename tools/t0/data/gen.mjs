#!/usr/bin/env node
// Generator of the optional bundle group DATA (verified displayed data).
//   node tools/t0/data/gen.mjs            write tools/t0/patches-next/DATA.json and docs/data-audit/fixes.json
//   node tools/t0/data/gen.mjs --check    regenerate in memory, require equality with the files on disk, and replay every data-file patch on baseline/dist
//
// Fix modules live in tools/t0/data/fixes/*.mjs. Two kinds:
//   kind 'events' (default export array, `file` = data file with one JSON object per line, e.g. chronology_day1.json): entries
//        { tick, [match], set:{field:value|null}, cls, before, src }      replace fields of the row whose "tick" is `tick` (match = substring when ticks repeat)
//        { insertAfter:{tick,[match]}, row:{...}, cls, before, src }       add a row after an existing row
//        { remove:{tick,[match]}, cls, before, src }                       delete a row
//   kind 'text' (default export array): { id, target:'data/x.json'|'js'|'help'|'dashboard.html'..., find, repl, expect=1, regex?, cls, before, src }
// Every entry becomes ONE asserted patch (find counted against the CURRENT text, must equal expect), so a change by another group to the same bytes
// fails the build loudly instead of being reverted silently.  Nothing here writes under legacy/, baseline/ or release/.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..');
const BASE = path.join(REPO, 'baseline', 'dist');
const OUT_GROUP = path.join(REPO, 'tools', 't0', 'patches-next', 'DATA.json');
const OUT_FIXES = path.join(REPO, 'docs', 'data-audit', 'fixes.json');
const check = process.argv.includes('--check');

const rd = (p) => fs.readFileSync(p, 'utf8');
const files = fs.readdirSync(path.join(HERE, 'fixes')).filter((f) => f.endsWith('.mjs')).sort();
const patches = [];
const fixes = [];
const errors = [];

function addPatch(p, meta) {
  patches.push({ id: p.id, target: p.target, find: p.find, repl: p.repl, expect: p.expect ?? 1, ...(p.regex ? { regex: true } : {}), note: meta.note });
  fixes.push({ id: p.id, target: p.target, cls: meta.cls, before: meta.before, src: meta.src, find: p.find.length > 1500 ? p.find.slice(0, 1500) + '...' : p.find, repl: p.repl.length > 1500 ? p.repl.slice(0, 1500) + '...' : p.repl, area: meta.area });
}

for (const f of files) {
  const mod = await import(pathToFileURL(path.join(HERE, 'fixes', f)).href);
  const kind = mod.kind || 'events';
  const area = f.replace(/\.mjs$/, '');
  if (kind === 'text') {
    for (const e of mod.default) {
      if (!e.id || e.find == null || e.repl == null || !e.target) { errors.push(`${f}: text entry without id/target/find/repl: ${JSON.stringify(e).slice(0, 120)}`); continue; }
      addPatch(e, { cls: e.cls, before: e.before, src: e.src, note: `${e.cls || ''}: ${e.src || ''}`.slice(0, 300), area });
    }
    continue;
  }
  const rel = 'data/' + mod.file;
  const text = rd(path.join(BASE, rel));
  const lines = text.split('\n');
  const rowIdx = (sel) => {
    const key = `"tick":${sel.tick},`;
    const hits = lines.map((l, i) => [l, i]).filter(([l]) => l.trim().startsWith('{' + key) && (!sel.match || l.includes(sel.match)));
    if (hits.length !== 1) { errors.push(`${f}: tick ${sel.tick}${sel.match ? ' match ' + sel.match : ''} selects ${hits.length} rows`); return -1; }
    return hits[0][1];
  };
  const idBase = 'DATA-' + (mod.file.replace(/\.json$/, '').replace(/chronology_day/, 'chr-d'));
  for (const e of mod.default) {
    if (e.set) {
      const i = rowIdx(e); if (i < 0) continue;
      const old = lines[i].trim().replace(/,$/, '');
      const obj = JSON.parse(old);
      if (JSON.stringify(obj) !== old) { errors.push(`${f}: tick ${e.tick} does not round-trip`); continue; }
      for (const [k, v] of Object.entries(e.set)) { if (v === null) delete obj[k]; else obj[k] = v; }
      const nw = JSON.stringify(obj);
      addPatch({ id: `${idBase}-${e.tick}${e.match ? '-' + e.match.replace(/\W+/g, '') : ''}`, target: rel, find: old, repl: nw }, { cls: e.cls, before: e.before, src: e.src, note: `${e.cls}: ${e.src}`.slice(0, 300), area });
      fixes[fixes.length - 1].tick = e.tick;
    } else if (e.insertAfter) {
      const i = rowIdx(e.insertAfter); if (i < 0) continue;
      const old = lines[i].trim().replace(/,$/, '');
      const indent = lines[i].match(/^\s*/)[0];
      addPatch({ id: `${idBase}-add-${e.row.tick}${e.id ? '-' + e.id : ''}`, target: rel, find: old, repl: old + ',\n' + indent + JSON.stringify(e.row) }, { cls: e.cls, before: e.before || 'missing event', src: e.src, note: `${e.cls}: ${e.src}`.slice(0, 300), area });
      fixes[fixes.length - 1].tick = e.row.tick;
    } else if (e.remove) {
      const sel = e.remove === true ? e : e.remove; const i = rowIdx(sel); if (i < 0) continue;
      const old = lines[i].trim();
      const indent = lines[i].match(/^\s*/)[0];
      const last = /^\s*\]/.test(lines[i + 1] || '');
      if (last) errors.push(`${f}: removing the last row (tick ${sel.tick}) is not supported`);
      addPatch({ id: `${idBase}-del-${sel.tick}`, target: rel, find: old + '\n' + indent, repl: '' }, { cls: e.cls, before: e.before, src: e.src, note: `${e.cls}: ${e.src}`.slice(0, 300), area });
      fixes[fixes.length - 1].tick = sel.tick;
    } else errors.push(`${f}: entry without set/insertAfter/remove`);
  }
}

const ids = new Set();
for (const p of patches) { if (ids.has(p.id)) errors.push('duplicate patch id ' + p.id); ids.add(p.id); }

// replay on baseline for data-file and html targets (bundle targets cannot be replayed here: the build asserts them)
const cur = {};
for (const p of patches) {
  if (['js', 'help', 'book', 'css'].includes(p.target)) continue;
  const fp = path.join(BASE, p.target);
  if (!fs.existsSync(fp)) { errors.push(`${p.id}: target ${p.target} not in baseline/dist`); continue; }
  let t = cur[p.target] ??= rd(fp);
  const crlf = t.includes('\r\n') && !t.replace(/\r\n/g, '').includes('\n');
  const find = crlf && !p.find.includes('\r\n') ? p.find.replace(/\n/g, '\r\n') : p.find;
  const repl = crlf && !p.repl.includes('\r\n') ? p.repl.replace(/\n/g, '\r\n') : p.repl;
  let n = 0;
  if (p.regex) { n = (t.match(new RegExp(find, 'g')) || []).length; if (n === p.expect) t = t.replace(new RegExp(find, 'g'), repl); }
  else { n = t.split(find).length - 1; if (n === p.expect) t = t.split(find).join(repl); }
  if (n !== p.expect) errors.push(`${p.id}: find occurs ${n}x on the current text of ${p.target}, expected ${p.expect}`);
  cur[p.target] = t;
}
for (const [t, txt] of Object.entries(cur)) if (t.endsWith('.json')) { try { JSON.parse(txt); } catch (e) { errors.push(`${t}: invalid JSON after patches: ${e.message}`); } }

if (errors.length) { console.error('GENERATOR ERRORS\n  ' + errors.join('\n  ')); process.exit(2); }

const group = {
  group: 'DATA',
  description: 'Optional group DATA (owner decision 2026-10-05, item 3): displayed data verified against cited sources, or labelled, or removed. Generated by tools/t0/data/gen.mjs from tools/t0/data/fixes/*.mjs; every patch is asserted (expect) and carries its error class and source in the note. Method, sample, error rates and every fix with its source: docs/data-audit/AUDIT.md.',
  patches,
};
const groupText = JSON.stringify(group, null, 1) + '\n';
const fixText = JSON.stringify({ schema: 1, count: fixes.length, fixes }, null, 1) + '\n';
if (check) {
  const same = fs.existsSync(OUT_GROUP) && rd(OUT_GROUP) === groupText && fs.existsSync(OUT_FIXES) && rd(OUT_FIXES) === fixText;
  console.log(same ? `OK: DATA.json up to date (${patches.length} patches), all data-file patches replay on baseline/dist` : 'STALE: run node tools/t0/data/gen.mjs');
  process.exit(same ? 0 : 1);
}
fs.mkdirSync(path.dirname(OUT_FIXES), { recursive: true });
fs.writeFileSync(OUT_GROUP, groupText);
fs.writeFileSync(OUT_FIXES, fixText);
console.log(`wrote ${path.relative(REPO, OUT_GROUP)} (${patches.length} patches) and ${path.relative(REPO, OUT_FIXES)}`);

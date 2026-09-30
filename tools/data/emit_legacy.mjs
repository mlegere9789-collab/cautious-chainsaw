#!/usr/bin/env node
// Legacy-compat emitter (WP-DATA-01 step 3, first form): regenerates the served file names and shapes byte for byte, applying only
// VALUE-ONLY patches by editing the exact bytes of the patched values. With no patches the output must equal data-src/legacy-manifest.tsv.
//   node tools/data/emit_legacy.mjs [--src DIR] [--patches DIR] [--out DIR] [--verify]
// Patch file (data-src/patches/*.json): { "id", "description", "citation", "reviewer", "edits": [ { "file": "terrain.json", "pointer": "/key_locations/28/name", "before": "...", "after": "..." } ] }
// Guarantees: `before` must equal the current value (fail closed); shape and every other byte are untouched; the output is parsed and compared with
// the patched object; nothing is ever written under legacy/. Renames and shape changes are NOT patches: they go to /data/v2 (chapter 13 WP-DATA-01).
import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_DATA_DIR, REPO_ROOT } from './lib/util.mjs';
import { findSpan, getAt, setAt } from './lib/jsonspan.mjs';
import { hashTree, readTsv, diffAgainstManifest } from './lib/manifest.mjs';

export function loadPatches(dir) {
  if (!dir || !fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => ({ ...JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')), _file: f }));
}

export function applyEditsToText(text, edits) {
  const doc = JSON.parse(text);
  const expected = structuredClone(doc);
  // apply from the last span to the first so earlier offsets stay valid
  const located = edits.map((e) => {
    const cur = getAt(doc, e.pointer);
    if (cur !== e.before) throw new Error(`${e.file} ${e.pointer}: current value differs from "before" (${JSON.stringify(cur)})`);
    const [s, en] = findSpan(text, e.pointer);
    if (text.slice(s, en) !== JSON.stringify(e.before)) throw new Error(`${e.file} ${e.pointer}: the bytes at the pointer are not the canonical encoding of "before" (escaped differently); refusing to guess`);
    setAt(expected, e.pointer, e.after);
    return { s, en, after: JSON.stringify(e.after) };
  }).sort((a, b) => b.s - a.s);
  for (let k = 1; k < located.length; k++) if (located[k].en > located[k - 1].s) throw new Error('overlapping edits');
  let out = text;
  for (const l of located) out = out.slice(0, l.s) + l.after + out.slice(l.en);
  if (JSON.stringify(JSON.parse(out)) !== JSON.stringify(expected)) throw new Error('post-edit document differs from the expected patched object');
  return out;
}

export function emit({ src = DEFAULT_DATA_DIR, patches = [], out }) {
  if (path.resolve(out).startsWith(path.join(REPO_ROOT, 'legacy'))) throw new Error('refusing to write under legacy/');
  const byFile = new Map();
  for (const p of patches) for (const e of p.edits) { if (!byFile.has(e.file)) byFile.set(e.file, []); byFile.get(e.file).push(e); }
  const entries = hashTree(src);
  for (const f of byFile.keys()) if (!entries.some((e) => e.path === f)) throw new Error(`patch names unknown file ${f}`);
  let changed = 0;
  for (const e of entries) {
    const from = path.join(src, e.path);
    const to = path.join(out, e.path);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    if (byFile.has(e.path)) {
      const text = fs.readFileSync(from, 'utf8');
      fs.writeFileSync(to, applyEditsToText(text, byFile.get(e.path)), 'utf8');
      changed++;
    } else fs.copyFileSync(from, to);
  }
  return { files: entries.length, changed };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
if (isMain) {
  const a = process.argv.slice(2);
  const opt = (n, d) => { const i = a.indexOf(n); return i >= 0 ? a[i + 1] : d; };
  const out = path.resolve(opt('--out', path.join(REPO_ROOT, 'tmp', 'data-emit')));
  const patches = loadPatches(path.resolve(opt('--patches', path.join(REPO_ROOT, 'data-src', 'patches'))));
  const r = emit({ src: path.resolve(opt('--src', DEFAULT_DATA_DIR)), patches, out });
  console.log(`emitted ${r.files} files to ${path.relative(REPO_ROOT, out)} (${patches.length} patch file(s), ${r.changed} file(s) changed)`);
  if (a.includes('--verify')) {
    const d = diffAgainstManifest(hashTree(out), readTsv());
    const bad = d.missing.length + d.extra.length + d.changed.length;
    console.log(`legacy-roundtrip: missing ${d.missing.length}, extra ${d.extra.length}, changed ${d.changed.length}`);
    if (bad && patches.length === 0) { console.error(JSON.stringify(d)); process.exit(1); }
  }
}

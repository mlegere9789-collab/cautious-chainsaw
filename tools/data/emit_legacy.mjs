#!/usr/bin/env node
// Legacy-compat emitter (WP-DATA-01 step 3, first form): regenerates the served file names and shapes byte for byte, applying only
// VALUE-ONLY patches by editing the exact bytes of the patched values. With no patches the output must equal data-src/legacy-manifest.tsv.
//   node tools/data/emit_legacy.mjs [--src DIR] [--patches DIR] [--out DIR] [--verify]
// Patch file (data-src/patches/*.json): { "id", "description", "citation", "reviewer", "edits": [ { "file": "terrain.json", "pointer": "/key_locations/28/name", "before": "...", "after": "..." } ] }
// Guarantees: `before` must equal the current value (fail closed); shape and every other byte are untouched; the output is parsed and compared with
// the patched object; nothing is ever written under legacy/ (the guard resolves symlinks and junctions, ignores letter case, and never writes
// THROUGH a link or hard link at a destination). Only scalar values can be patched; renames and shape changes are NOT patches: they go to
// /data/v2 (chapter 13 WP-DATA-01). Numbers are matched by VALUE, not by spelling: "39.814100" is the number 39.8141, and the replacement is
// written as JSON.stringify(after) ("39.8142"), so only the bytes of that one value change.
import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_DATA_DIR, REPO_ROOT, isMainModule } from './lib/util.mjs';
import { findSpan, getAt, setAt } from './lib/jsonspan.mjs';
import { hashTree, readTsv, diffAgainstManifest } from './lib/manifest.mjs';

export function loadPatches(dir) {
  if (!dir || !fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => ({ ...JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')), _file: f }));
}

const isScalar = (v) => v === null || typeof v === 'string' || typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v));

export function applyEditsToText(text, edits) {
  const doc = JSON.parse(text);
  const expected = structuredClone(doc);
  // apply from the last span to the first so earlier offsets stay valid
  const located = edits.map((e) => {
    const where = `${e.file} ${e.pointer}`;
    if (!isScalar(e.before) || !isScalar(e.after)) throw new Error(`${where}: only scalar values (string, finite number, boolean, null) can be patched; an object or array value is a shape change, not a value-only patch`);
    const cur = getAt(doc, e.pointer);
    if (cur !== e.before) throw new Error(`${where}: current value differs from "before" (${JSON.stringify(cur)})`);
    const [s, en] = findSpan(text, e.pointer);
    const raw = text.slice(s, en);
    if (typeof e.before === 'number') {
      // The stored spelling may carry trailing zeros or an exponent ("39.814100", "1E3"); JSON.stringify never reproduces those, so compare
      // the number the bytes denote. (`before` already equals the parsed value; this asserts that the located span is that number literal.)
      if (!/^-?\d/.test(raw) || Number(raw) !== e.before) throw new Error(`${where}: the bytes at the pointer (${raw}) do not denote the number ${e.before}`);
    } else if (raw !== JSON.stringify(e.before)) {
      throw new Error(`${where}: the bytes at the pointer are not the canonical encoding of "before" (escaped differently); refusing to guess`);
    }
    setAt(expected, e.pointer, e.after);
    return { s, en, after: JSON.stringify(e.after) };
  }).sort((a, b) => b.s - a.s);
  for (let k = 1; k < located.length; k++) if (located[k].en > located[k - 1].s) throw new Error('overlapping edits');
  let out = text;
  for (const l of located) out = out.slice(0, l.s) + l.after + out.slice(l.en);
  if (JSON.stringify(JSON.parse(out)) !== JSON.stringify(expected)) throw new Error('post-edit document differs from the expected patched object');
  return out;
}

// ---- legacy/ write guard ---------------------------------------------------------------------------------------------------------

const LEGACY_ROOT = path.join(REPO_ROOT, 'legacy');
const fold = (p) => p.toLowerCase(); // conservative on every platform: NTFS and default APFS are case-insensitive, and refusing too much is safe

/**
 * Canonical form of `p`: links (symlinks, junctions) of the longest EXISTING prefix are resolved and the native realpath also normalises the
 * on-disk letter case and 8.3 names on Windows; the not-yet-existing tail is appended as given. A dangling link throws.
 */
function canonical(p) {
  let cur = path.resolve(p);
  const tail = [];
  for (;;) {
    try { fs.lstatSync(cur); break; } catch (e) { if (e.code !== 'ENOENT' && e.code !== 'ENOTDIR') throw e; }
    const up = path.dirname(cur);
    if (up === cur) break;
    tail.unshift(path.basename(cur));
    cur = up;
  }
  return path.join(fs.realpathSync.native(cur), ...tail);
}

const isInside = (child, parent) => { const rel = path.relative(fold(parent), fold(child)); return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel)); };

/** True when `target` or one of its existing ancestors IS the legacy directory (same device and file id), whatever its spelling. */
function sameFileAsLegacy(target) {
  let legacy;
  try { legacy = fs.statSync(LEGACY_ROOT, { bigint: true }); } catch { return false; }
  if (!legacy.ino) return false;
  for (let cur = target; ;) {
    try { const st = fs.statSync(cur, { bigint: true }); if (st.ino === legacy.ino && st.dev === legacy.dev) return true; } catch { /* not there yet */ }
    const up = path.dirname(cur);
    if (up === cur) return false;
    cur = up;
  }
}

/** Throws unless `target` lies outside legacy/ after resolving links and ignoring case. Returns the canonical path. */
export function assertNotLegacy(target) {
  let c;
  try { c = canonical(target); } catch (e) { throw new Error(`refusing to write: cannot resolve ${target} (${e.code || e.message})`); }
  let legacyReal = LEGACY_ROOT;
  try { legacyReal = canonical(LEGACY_ROOT); } catch { /* legacy/ absent: the plain path is still protected */ }
  if (isInside(c, legacyReal) || isInside(c, LEGACY_ROOT) || isInside(path.resolve(target), LEGACY_ROOT) || sameFileAsLegacy(c)) throw new Error(`refusing to write under legacy/ (${target} resolves to ${c})`);
  return c;
}

const isLink = (p) => { try { return fs.lstatSync(p).isSymbolicLink(); } catch { return false; } };

export function emit({ src = DEFAULT_DATA_DIR, patches = [], out }) {
  assertNotLegacy(out);
  const byFile = new Map();
  for (const p of patches) for (const e of p.edits) { if (!byFile.has(e.file)) byFile.set(e.file, []); byFile.get(e.file).push(e); }
  const entries = hashTree(src);
  for (const f of byFile.keys()) if (!entries.some((e) => e.path === f)) throw new Error(`patch names unknown file ${f}`);
  let changed = 0;
  for (const e of entries) {
    const from = path.join(src, e.path);
    const to = path.join(out, e.path);
    assertNotLegacy(to);
    // never write THROUGH a symlink or a hard link that already sits at the destination: replace the name, not its target
    if (isLink(to) || fs.existsSync(to)) fs.rmSync(to, { force: true });
    fs.mkdirSync(path.dirname(to), { recursive: true });
    assertNotLegacy(path.dirname(to));
    if (byFile.has(e.path)) {
      const text = fs.readFileSync(from, 'utf8');
      fs.writeFileSync(to, applyEditsToText(text, byFile.get(e.path)), 'utf8');
      changed++;
    } else fs.copyFileSync(from, to);
  }
  return { files: entries.length, changed };
}

if (isMainModule(import.meta.url)) {
  const a = process.argv.slice(2);
  const opt = (n, d) => { const i = a.indexOf(n); return i >= 0 ? a[i + 1] : d; };
  const out = path.resolve(opt('--out', path.join(REPO_ROOT, 'tmp', 'data-emit')));
  const patches = loadPatches(path.resolve(opt('--patches', path.join(REPO_ROOT, 'data-src', 'patches'))));
  let r;
  try { r = emit({ src: path.resolve(opt('--src', DEFAULT_DATA_DIR)), patches, out }); } catch (e) { console.error(e.message); process.exit(2); }
  console.log(`emitted ${r.files} files to ${path.relative(REPO_ROOT, out)} (${patches.length} patch file(s), ${r.changed} file(s) changed)`);
  if (a.includes('--verify')) {
    const d = diffAgainstManifest(hashTree(out), readTsv());
    const bad = d.missing.length + d.extra.length + d.changed.length;
    console.log(`legacy-roundtrip: missing ${d.missing.length}, extra ${d.extra.length}, changed ${d.changed.length}`);
    if (bad && patches.length === 0) { console.error(JSON.stringify(d)); process.exit(1); }
  }
}

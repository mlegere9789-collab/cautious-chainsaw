#!/usr/bin/env node
// Data manifest tooling (WP-DATA-01 baseline freeze, WP-DATA-02 versioning).
//   node tools/data/manifest.mjs freeze              write legacy-manifest.tsv, data.lock.json, version.json (first time only)
//   node tools/data/manifest.mjs verify              legacy-roundtrip: the tree must equal data-src/legacy-manifest.tsv byte for byte, and data-src/build/data-manifest.json must be current
//   node tools/data/manifest.mjs bump <ver> "<why>"  record a new data_version for the CURRENT tree (append-only history + lock)
//   node tools/data/manifest.mjs candidate           write data-src/build/data-manifest.json (no timestamp: reproducible)
// The legacy tree (legacy/dist/data) is never edited by this tool; it only reads it.
import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_DATA_DIR, REPO_ROOT, prettyJson } from './lib/util.mjs';
import { hashTree, manifestTsv, contentHash, readTsv, diffAgainstManifest, readJsonIfExists, PATHS } from './lib/manifest.mjs';

const [cmd, ...args] = process.argv.slice(2);
const dataDir = process.env.DATA_DIR || DEFAULT_DATA_DIR;
const entries = hashTree(dataDir);

function writeFile(p, text) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, text, 'utf8');
}

/** The candidate manifest (data-src/build/data-manifest.json): reproducible, no timestamp. `verify` compares the committed file with it. */
function candidateManifestText() {
  const v = readJsonIfExists(PATHS.version);
  const files = {};
  for (const e of entries) files[e.path.replace(/\.json$/, '')] = { path: `data/${e.path}`, sha256: e.sha256, bytes: e.bytes };
  return prettyJson({
    schema: 'gtbg/data-manifest/1',
    status: 'CANDIDATE: describes the LEGACY tree under its legacy names; nothing is deployed from this file',
    data_version: v?.data_version ?? '0.9.0',
    dv: 1,
    dv_note: 'dv is the clock calibration stamp owned by chapter 04 (links without dv mean 1). This tool copies it and never bumps it.',
    built_at: null,
    schema_version: '1',
    time_model: null,
    content_sha256: contentHash(entries),
    files,
  });
}

if (cmd === 'freeze') {
  if (fs.existsSync(PATHS.legacyManifest)) { console.error('legacy-manifest.tsv already exists: the baseline is frozen and never rewritten'); process.exit(2); }
  writeFile(PATHS.legacyManifest, manifestTsv(entries));
  const names = {};
  for (const e of entries) names[e.path] = [e.sha256];
  writeFile(PATHS.lock, prettyJson({ schema: 'gtbg/data-lock/1', note: 'name -> sha256 history; the last entry is current. A name may only gain a new last entry through `manifest.mjs bump`.', names }));
  const h = contentHash(entries);
  writeFile(PATHS.version, prettyJson({
    schema: 'gtbg/data-version/1',
    note: 'data_version = bytes (MAJOR id removal/rename without alias, schema break, unit/tick semantics; MINOR new records/fields/sources; PATCH corrections). dv (clock calibration) is chapter 04 and is never bumped here.',
    data_version: '0.9.0',
    history: [{ data_version: '0.9.0', label: 'legacy baseline of record (Netlify deploy 6aa16d61, 2026-09-09)', files: entries.length, content_sha256: h }],
  }));
  console.log(`froze ${entries.length} files, content_sha256 ${h}`);
} else if (cmd === 'verify') {
  const man = readTsv();
  if (!man) { console.error('no legacy-manifest.tsv'); process.exit(2); }
  const d = diffAgainstManifest(entries, man);
  const bad = d.missing.length + d.extra.length + d.changed.length;
  console.log(`legacy-roundtrip: ${entries.length} files, ${man.length} in manifest, missing ${d.missing.length}, extra ${d.extra.length}, changed ${d.changed.length}`);
  if (bad) { console.error(JSON.stringify(d, null, 2)); process.exit(1); }
  // the committed candidate manifest describes this tree: a stale or missing one is as wrong as a changed data file
  const cand = fs.existsSync(PATHS.candidateManifest) ? fs.readFileSync(PATHS.candidateManifest, 'utf8') : null;
  if (cand !== candidateManifestText()) { console.error(`STALE ${path.relative(REPO_ROOT, PATHS.candidateManifest)} (run node tools/data/manifest.mjs candidate)`); process.exit(1); }
  console.log('candidate manifest up to date');
} else if (cmd === 'bump') {
  const [ver, why] = args;
  if (!/^\d+\.\d+\.\d+$/.test(ver || '') || !why) { console.error('usage: manifest.mjs bump <x.y.z> "<why>"'); process.exit(2); }
  const v = readJsonIfExists(PATHS.version);
  if (v.history.some((h) => h.data_version === ver)) { console.error(`version ${ver} already recorded`); process.exit(2); }
  const lock = readJsonIfExists(PATHS.lock);
  for (const e of entries) {
    const hist = lock.names[e.path] || (lock.names[e.path] = []);
    if (hist[hist.length - 1] !== e.sha256) hist.push(e.sha256);
  }
  v.data_version = ver;
  v.history.push({ data_version: ver, label: why, files: entries.length, content_sha256: contentHash(entries) });
  writeFile(PATHS.lock, prettyJson(lock));
  writeFile(PATHS.version, prettyJson(v));
  console.log(`recorded ${ver}; now add "## [${ver}]" to data-src/CHANGELOG.md`);
} else if (cmd === 'candidate') {
  writeFile(PATHS.candidateManifest, candidateManifestText());
  console.log(`wrote candidate manifest for ${entries.length} files`);
} else {
  console.error('usage: manifest.mjs freeze|verify|bump|candidate');
  process.exit(2);
}

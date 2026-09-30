// Data manifest, version record and name/bytes lock (WP-DATA-01 baseline freeze, WP-DATA-02 versioning, rules D001/D002).
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT, DEFAULT_DATA_DIR, sha256 } from './util.mjs';

export const PATHS = {
  legacyManifest: path.join(REPO_ROOT, 'data-src', 'legacy-manifest.tsv'),
  version: path.join(REPO_ROOT, 'data-src', 'version.json'),
  lock: path.join(REPO_ROOT, 'data-src', 'data.lock.json'),
  changelog: path.join(REPO_ROOT, 'data-src', 'CHANGELOG.md'),
  candidateManifest: path.join(REPO_ROOT, 'data-src', 'build', 'data-manifest.json'),
};

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p)); else out.push(p);
  }
  return out;
}

/** [{path, bytes, sha256}] sorted by path, forward slashes. */
export function hashTree(dir = DEFAULT_DATA_DIR) {
  return walk(dir).map((p) => {
    const buf = fs.readFileSync(p);
    return { path: path.relative(dir, p).split(path.sep).join('/'), bytes: buf.length, sha256: sha256(buf) };
  }).sort((a, b) => (a.path < b.path ? -1 : 1));
}

export const manifestTsv = (entries) => 'path\tbytes\tsha256\n' + entries.map((e) => `${e.path}\t${e.bytes}\t${e.sha256}`).join('\n') + '\n';
export const contentHash = (entries) => sha256(Buffer.from(manifestTsv(entries), 'utf8'));

export function readTsv(file = PATHS.legacyManifest) {
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, 'utf8').split('\n').slice(1).filter(Boolean).map((l) => {
    const [p, b, h] = l.split('\t');
    return { path: p, bytes: Number(b), sha256: h };
  });
}

export function readJsonIfExists(file) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
}

/** Compare a tree against the frozen manifest. Returns {missing, extra, changed}. */
export function diffAgainstManifest(entries, manifest) {
  const cur = new Map(entries.map((e) => [e.path, e]));
  const old = new Map(manifest.map((e) => [e.path, e]));
  return {
    missing: [...old.keys()].filter((k) => !cur.has(k)),
    extra: [...cur.keys()].filter((k) => !old.has(k)),
    changed: [...cur.keys()].filter((k) => old.has(k) && (old.get(k).sha256 !== cur.get(k).sha256 || old.get(k).bytes !== cur.get(k).bytes)),
  };
}

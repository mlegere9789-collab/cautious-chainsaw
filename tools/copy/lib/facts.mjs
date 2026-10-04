// Facts for the COUNT rule. Reads data-src/build/facts.json (read-only). When it is absent, falls back to counts that can be
// computed from legacy/dist/data (stories, events, places, moments) and says so: the other nouns are then not checked.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function repoRoot(from = import.meta.url) {
  let dir = path.dirname(fileURLToPath(from));
  for (let i = 0; i < 8; i++) { if (fs.existsSync(path.join(dir, 'package.json')) && fs.existsSync(path.join(dir, 'tools'))) return dir; dir = path.dirname(dir); }
  return process.cwd();
}

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

export function fallbackFacts(root) {
  const dataDir = path.join(root, 'legacy', 'dist', 'data');
  const f = { units: {}, content: {}, ticks: {} };
  let vig = 0; let ev = 0; let maxTick = 0;
  for (const n of ['vignettes_part1', 'vignettes_part2', 'vignettes_part3']) {
    const p = path.join(dataDir, n + '.json'); if (fs.existsSync(p)) vig += (readJson(p).vignettes || []).length;
  }
  for (const d of [1, 2, 3]) {
    const p = path.join(dataDir, `chronology_day${d}.json`);
    if (!fs.existsSync(p)) continue;
    const j = readJson(p); ev += (j.events || []).length;
    const range = j.metadata?.[`day${d}_tick_range`];
    const m = typeof range === 'string' ? range.match(/(\d+)\D+(\d+)/) : Array.isArray(range) ? range : null;
    if (m) maxTick = Math.max(maxTick, Number(m[2] ?? m[1]));
  }
  const terr = path.join(dataDir, 'terrain.json');
  if (vig) f.content.vignettes = vig;
  if (ev) f.content.chronology_events = ev;
  if (maxTick) f.ticks.total = maxTick;
  if (fs.existsSync(terr)) f.content.terrain_key_locations = (readJson(terr).key_locations || []).length;
  return f;
}

/** @returns {{facts:object, source:string, note:string}} */
export function loadFacts({ factsPath = null, root = repoRoot() } = {}) {
  const p = factsPath || path.join(root, 'data-src', 'build', 'facts.json');
  if (factsPath !== 'none' && fs.existsSync(p)) {
    try { return { facts: readJson(p), source: path.relative(root, p).replace(/\\/g, '/'), note: 'facts.json' }; } catch (e) { return { facts: fallbackFacts(root), source: 'legacy/dist/data (fallback)', note: `facts.json unreadable (${e.message}); fallback counts only` }; }
  }
  return { facts: fallbackFacts(root), source: 'legacy/dist/data (fallback)', note: 'facts.json absent; COUNT checks only stories, events, places and moments' };
}

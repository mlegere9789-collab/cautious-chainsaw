// Builds the shared read-only context every rule works from.
import fs from 'node:fs';
import path from 'node:path';
import { loadDataDir, fileGroups } from './load.mjs';
import { buildOobIndex } from './oob.mjs';
import { DEFAULT_DATA_DIR, DEFAULT_BUNDLE, REPO_ROOT } from './util.mjs';
import { extractEmbeddedDatasets } from './bundle_extract.mjs';
import { loadWarpedClock } from './clock.mjs';

const ANCHORS_CSV = path.join(REPO_ROOT, 'docs', 'plan', 'data', 'time-facts-anchors.csv');
const AUTHORITIES_JSON = path.join(REPO_ROOT, 'data-src', 'authorities', 'authorities.json');

function readDistText(distDir) {
  const out = new Map();
  if (!distDir || !fs.existsSync(distDir)) return out;
  const push = (rel) => {
    const p = path.join(distDir, rel);
    if (fs.existsSync(p) && fs.statSync(p).isFile()) out.set(rel.split(path.sep).join('/'), fs.readFileSync(p, 'utf8'));
  };
  for (const e of fs.readdirSync(distDir, { withFileTypes: true })) {
    if (e.isFile() && /\.(html|json|js|css|txt|xml)$/.test(e.name)) push(e.name);
  }
  const assets = path.join(distDir, 'assets');
  if (fs.existsSync(assets)) {
    for (const e of fs.readdirSync(assets, { withFileTypes: true })) {
      if (e.isFile() && e.name.endsWith('.js')) push(path.join('assets', e.name));
    }
  }
  return out;
}

/**
 * @param {object} opts
 * @param {string} [opts.dataDir]
 * @param {object} [opts.data]       pre-loaded data (tests, seeded defects)
 * @param {string|null} [opts.bundlePath] pretty bundle for embedded datasets; null disables
 * @param {string|null} [opts.distDir]    deploy root for site-text rules (F001/R008/K001); null disables
 * @param {string} [opts.now]        ISO date used for baseline expiry
 */
export function buildContext(opts = {}) {
  const dataDir = opts.dataDir ?? DEFAULT_DATA_DIR;
  const data = opts.data ?? loadDataDir(dataDir);
  const oob = buildOobIndex(data);
  const bundlePath = opts.bundlePath === undefined ? DEFAULT_BUNDLE : opts.bundlePath;
  const distDir = opts.distDir === undefined ? path.join(REPO_ROOT, 'legacy', 'dist') : opts.distDir;

  // ---- placement rows (placements_* then density_*, alphabetical within a group; density is applied last, as the app does)
  const rows = [];
  const groupOrder = [['placements', fileGroups.placements], ['density', fileGroups.density]];
  for (const [group, pred] of groupOrder) {
    for (const [rel, f] of [...data.files].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
      if (!pred(rel) || !f.json || !Array.isArray(f.json.placements)) continue;
      f.json.placements.forEach((r, idx) => {
        rows.push({ file: rel, idx, group, ...r });
      });
    }
  }
  const rowsByUnit = new Map();
  for (const r of rows) {
    if (!rowsByUnit.has(r.unit_id)) rowsByUnit.set(r.unit_id, []);
    rowsByUnit.get(r.unit_id).push(r);
  }
  // merged track per unit: last writer wins per (unit,tick) in `rows` order
  const merged = new Map(); // unit -> sorted [{tick,...winning row}]
  const conflicts = []; // {unit,tick,rows:[...]}
  const perKey = new Map();
  for (const r of rows) {
    const k = `${r.unit_id}@${r.tick}`;
    if (!perKey.has(k)) perKey.set(k, []);
    perKey.get(k).push(r);
  }
  for (const [k, list] of perKey) {
    if (list.length > 1) conflicts.push({ key: k, unit_id: list[0].unit_id, tick: list[0].tick, rows: list });
  }
  for (const [unit, list] of rowsByUnit) {
    const byTick = new Map();
    for (const r of list) byTick.set(r.tick, r);
    merged.set(unit, [...byTick.values()].sort((a, b) => a.tick - b.tick));
  }

  const terrain = data.files.get('terrain.json')?.json ?? null;
  const extent = terrain?.metadata?.battlefield_bounds ?? { north: 39.85, south: 39.77, east: -77.18, west: -77.29 };

  let embedded = opts.embedded ?? null;
  const getEmbedded = () => {
    if (embedded === null) {
      embedded = bundlePath && fs.existsSync(bundlePath) ? extractEmbeddedDatasets(bundlePath) : { monuments: [], story: [], tour: [], warnings: ['bundle not available'], monumentsLoc: null };
    }
    return embedded;
  };

  const distText = readDistText(distDir);
  const warped = loadWarpedClock(ANCHORS_CSV);
  const authoritiesPath = opts.authoritiesPath === undefined ? AUTHORITIES_JSON : opts.authoritiesPath;
  const authorities = authoritiesPath && fs.existsSync(authoritiesPath) ? JSON.parse(fs.readFileSync(authoritiesPath, 'utf8')) : null;

  return {
    opts,
    now: opts.now ?? new Date().toISOString().slice(0, 10),
    data, dataDir, oob, rows, rowsByUnit, merged, conflicts, perKey,
    terrain, extent,
    distDir, distText,
    warped, authorities,
    getEmbedded,
    file: (rel) => data.files.get(rel)?.json ?? null,
    filesWhere: (pred) => [...data.files].filter(([rel]) => pred(rel)),
    oobHas: (id) => oob.records.has(id),
  };
}

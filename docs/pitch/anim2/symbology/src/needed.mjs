// src/needed.mjs - derive the set of symbols the real data needs, so the atlas ships exactly those (and `--all` ships the whole vocabulary for design review).
// Reads (read-only): the prototype dataset (docs/pitch/anim/prototype/data/dataset.json: 478 placed units, 11 dispositions, the order-of-battle chain) and the unit registry (data-src/build/unit_registry.json),
// because the prototype dataset collapses the registry's 5 arms (infantry, cavalry, artillery, horse_artillery, sharpshooter) into 3.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
import { ECH_OF_KIND } from './common.mjs';
import { CHIP_OF_DISPOSITION } from './chips.mjs';
import { BADGE_SHAPES } from './overlays.mjs';

const RE_BDE = /^[UC]-(XII|XI|X|IX|VIII|VII|VI|IV|V|III|II|I)-(\d)-\d+$/; const RE_DIV = /^[UC]-(XII|XI|X|IX|VIII|VII|VI|IV|V|III|II|I)-(\d)$/; const RE_CORPS = /^[UC]-(XII|XI|X|IX|VIII|VII|VI|IV|V|III|II|I)$/;
const FORMATION_KINDS = new Set(['brigade', 'division', 'corps', 'army']);
const DIV_COLOUR = { 1: 'red', 2: 'white', 3: 'blue' };

export function neededSet({ repo, datasetPath, registryPath }) {
  const dsFile = datasetPath || path.join(repo, 'docs/pitch/anim/prototype/data/dataset.json'); const rgFile = registryPath || path.join(repo, 'data-src/build/unit_registry.json');
  const ds = JSON.parse(fs.readFileSync(dsFile, 'utf8')); const rg = JSON.parse(fs.readFileSync(rgFile, 'utf8')).units; const regById = new Map(rg.map((u) => [u.id, u]));
  const nodeParent = new Map(ds.nodes.map((n) => [n.id, n.parent]));
  const specs = new Map(); const chips = new Map(); const badges = new Map(); const armSource = { registry: 0, dataset: 0 };
  let idOnly = 0; const sides = {};
  for (const u of ds.units) {
    const formation = FORMATION_KINDS.has(u.kind); const r = regById.get(u.id);
    let arm = formation ? 'formation' : (r && r.arm) || u.arm; if (!formation) armSource[r ? 'registry' : 'dataset']++;
    const ech = ECH_OF_KIND[u.kind]; const key = `${u.side}/${arm}/${ech}`;
    const e = specs.get(key) || { side: u.side, arm, ech, units: 0, ids: [] }; e.units++; if (e.ids.length < 3) e.ids.push(u.id); specs.set(key, e);
    sides[u.side] = (sides[u.side] || 0) + 1; if (!u.inOob) idOnly++;
    // chips from the keyframes' dispositions
    for (const kf of u.kf) { const name = CHIP_OF_DISPOSITION[ds.dispositions[kf[5]]]; if (name) { const c = chips.get(name) || { rows: 0, units: new Set() }; c.rows++; c.units.add(u.id); chips.set(name, c); } }
    // Union corps badge (the same rule as the prototype's semantics.corpsFacts)
    if (u.side === 'union' && u.inOob && u.parentSource === 'oob' && (u.arm === 'infantry' || formation) && !(r && (r.arm === 'cavalry' || r.arm === 'artillery' || r.arm === 'horse_artillery'))) {
      let roman = null; let div = null; const chain = [u.id]; let p = u.parent; while (p && p !== 'ROOT' && chain.length < 12) { chain.push(p); p = nodeParent.get(p); }
      for (const id of chain) { let m; if ((m = RE_BDE.exec(id)) || (m = RE_DIV.exec(id))) { if (!roman) roman = m[1]; if (div === null) div = +m[2]; } else if ((m = RE_CORPS.exec(id))) { if (!roman) roman = m[1]; } }
      if (roman && BADGE_SHAPES[roman]) { const col = DIV_COLOUR[div] || null; if (col) { const k = `${roman}/${col}`; badges.set(k, (badges.get(k) || 0) + 1); } }
    }
  }
  let agg = null; const censusFile = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', 'results', 'agg-census.json');
  if (fs.existsSync(censusFile)) { const c = JSON.parse(fs.readFileSync(censusFile, 'utf8')); agg = { source: 'results/agg-census.json', solves: c.solves, aggregateTiles: c.aggregateTiles, combos: c.combos.map((x) => ({ side: x.side, armset: x.armset, depth: x.depth, tiles: x.tiles })) }; }
  const sha = crypto.createHash('sha256').update(fs.readFileSync(dsFile)).digest('hex');
  return {
    dataset: { file: path.relative(repo, dsFile).replace(/\\/g, '/'), sha256: sha, units: ds.units.length }, registry: path.relative(repo, rgFile).replace(/\\/g, '/'),
    specs: [...specs.values()].sort((a, b) => a.side.localeCompare(b.side) || a.arm.localeCompare(b.arm) || a.ech.localeCompare(b.ech)),
    chips: Object.fromEntries([...chips].map(([k, v]) => [k, { rows: v.rows, units: v.units.size }])),
    badges: Object.fromEntries(badges), idOnly, sides, armSource, agg,
    dispositions: ds.dispositions,
  };
}

/** a dataset unit as a tile spec plus its display text (designation, else the short code) for the sheets; null when the id is not in the data */
let _ds = null;
export function dsUnit(needed, id) {
  if (!_ds) { const repo = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..', '..', '..', '..'); _ds = JSON.parse(fs.readFileSync(path.join(repo, needed.dataset.file), 'utf8')); const rg = JSON.parse(fs.readFileSync(path.join(repo, needed.registry), 'utf8')).units; _ds._reg = new Map(rg.map((u) => [u.id, u])); }
  const u = _ds.units.find((x) => x.id === id); if (!u) return null; const formation = FORMATION_KINDS.has(u.kind); const r = _ds._reg.get(id);
  return { id, side: u.side, arm: formation ? 'formation' : (r && r.arm) || u.arm, ech: ECH_OF_KIND[u.kind], text: u.designation || u.label || u.short };
}

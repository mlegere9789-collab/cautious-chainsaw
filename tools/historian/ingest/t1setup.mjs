// t1setup.mjs - the site's entity registry (T1) and the engine's linker, built from the site data exactly as tools/historian/build.mjs builds them, for the ingestion steps that link text
// (corpus.mjs). One registry, one linker: the units, people and places an Official Records passage is linked to are the ones the site's own questions resolve to.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { loadSite } from '../lib/load.mjs';
import { buildRegistry } from '../lib/registry.mjs';
import { serializeT1, buildEntityIndex } from '../lib/t1.mjs';
import { prepareT1 } from '../../../historian-src/core/entities.js';
import { createLinker } from '../../../historian-src/core/linker.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');

export function loadLinker({ dataDir = path.join(root, 'legacy/dist/data') } = {}) {
  const site = loadSite(dataDir);
  const curated = JSON.parse(fs.readFileSync(path.join(root, 'tools/historian/data/aliases.v1.json'), 'utf8'));
  const reg = buildRegistry(site, { curated });
  const t1 = serializeT1(reg, { kb: 'or27-link' });
  const entix = buildEntityIndex(reg);
  const idx = prepareT1(t1);
  const link = createLinker(idx, entix);
  const sha = crypto.createHash('sha256').update(JSON.stringify(t1.records.map((r) => [r.id, r.label, r.aliases]))).digest('hex').slice(0, 12);
  return { site, reg, t1, entix, idx, link, sha };
}

/** the units of the data workstream's registry (data-src/build/unit_registry.json): id -> { side, kind, designation } (569 units). Null when the file is absent. */
export function loadUnitRegistry(file = path.join(root, 'data-src/build/unit_registry.json')) {
  if (!fs.existsSync(file)) return null;
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  return new Map((j.units || []).map((u) => [u.id, { side: u.side, kind: u.kind, arm: u.arm, designation: u.designation, state: u.state }]));
}

// headless.mjs - node-side helpers: load the committed dataset / tokens / text table from disk and create an engine.  Used by the tests, the benchmarks and the build.
// (The browser bundle inlines the same three JSON documents and calls createEngine directly.)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEngine } from './scene/engine.mjs';

export const PROTO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const REPO = path.resolve(PROTO, '..', '..', '..', '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(PROTO, p), 'utf8'));
let cache = null;
export function loadDocs() { if (!cache) cache = { dataset: read('data/dataset.json'), tokens: read('tokens/tokens.json'), textTable: read('data/text-widths.json'), popupData: read('data/popup-data.json') }; return cache; }

/** a fresh engine on the real data.  settings = { 'layout.dMaxPx': 40, ... } applied before the first frame */
export function makeEngine({ settings = {}, start, viewport, kernel, skin, autoQuality = false } = {}) {
  const d = loadDocs();
  const e = createEngine({ autoQuality, dataset: d.dataset, tokens: d.tokens, textTable: d.textTable, start, viewport, kernel });
  if (skin) { e.kernel.skins.register(skin.id, skin, { replace: true }); }
  for (const [k, v] of Object.entries(settings)) e.tuning.set(k, v);
  return e;
}

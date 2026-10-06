// layout-lab/lib/data.mjs - node wrapper around data-core.mjs: reads the REAL data files (baseline/dist/data, read-only) from disk and loads the
// measured text-width table (out/text-widths.json) into spec.mjs when it exists.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAll } from './data-core.mjs';
import { setTextTable } from './spec.mjs';
export * from './data-core.mjs';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(HERE, '..', '..', '..', '..', '..');
export const DATA_DIR = path.join(REPO, 'baseline', 'dist', 'data');
try { setTextTable(JSON.parse(fs.readFileSync(path.join(HERE, '..', 'out', 'text-widths.json'), 'utf8'))); } catch { /* estimate is used, spec.TEXT_SOURCE() says so */ }

export function loadAll() { return buildAll((rel) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, rel), 'utf8'))); }

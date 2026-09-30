// Loads every JSON file under a data directory, strictly (UTF-8 fatal decode), keeping raw bytes for hashing.
import fs from 'node:fs';
import path from 'node:path';
import { sha256 } from './util.mjs';

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

/**
 * @returns {{dir:string, files: Map<string, {rel:string, bytes:number, sha256:string, json:any, error:string|null}>}}
 * `rel` uses forward slashes ("oob/union_artillery.json").
 */
export function loadDataDir(dir) {
  const files = new Map();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  for (const p of walk(dir).sort()) {
    const rel = path.relative(dir, p).split(path.sep).join('/');
    if (!rel.endsWith('.json')) continue;
    const buf = fs.readFileSync(p);
    let json = null;
    let error = null;
    try {
      const text = decoder.decode(buf);
      if (text.charCodeAt(0) === 0xfeff) error = 'BOM present';
      json = JSON.parse(text);
    } catch (e) {
      error = String(e.message || e);
    }
    files.set(rel, { rel, bytes: buf.length, sha256: sha256(buf), json, error });
  }
  return { dir, files };
}

/** Build a data set from in-memory objects (used by tests and seeded-defect runs). */
export function dataFromObjects(objs) {
  const files = new Map();
  for (const [rel, json] of Object.entries(objs)) {
    files.set(rel, { rel, bytes: JSON.stringify(json).length, sha256: '', json, error: null });
  }
  return { dir: '<memory>', files };
}

export function cloneData(data) {
  const files = new Map();
  for (const [rel, f] of data.files) files.set(rel, { ...f, json: f.json == null ? null : structuredClone(f.json) });
  return { dir: data.dir, files };
}

export const fileGroups = {
  placements: (rel) => /^placements_.*\.json$/.test(rel),
  density: (rel) => /^density_.*\.json$/.test(rel),
  chronology: (rel) => /^chronology_day\d\.json$/.test(rel),
  vignettes: (rel) => /^vignettes_part\d\.json$/.test(rel),
  oob: (rel) => rel.startsWith('oob/'),
};

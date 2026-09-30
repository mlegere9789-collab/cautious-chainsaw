// Shared fixtures for the data-tooling tests (node:test). Nothing here touches legacy/ except to READ it.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadDataDir, cloneData } from '../../tools/data/lib/load.mjs';
import { runValidation } from '../../tools/data/lib/validation.mjs';
import { evaluateRatchet } from '../../tools/data/lib/ratchet.mjs';
import { DEFAULT_DATA_DIR, REPO_ROOT } from '../../tools/data/lib/util.mjs';

export const NOW = '2026-09-30';
export const legacy = loadDataDir(DEFAULT_DATA_DIR);
export const baseline = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'tools', 'data', 'baseline.json'), 'utf8'));

export const clone = () => cloneData(legacy);

/** Locate an OOB record's raw object in a (cloned) data set. */
export function oobRaw(data, id) {
  for (const [rel, f] of data.files) {
    if (!rel.startsWith('oob/')) continue;
    let found = null;
    const visit = (v) => {
      if (found || !v || typeof v !== 'object') return;
      if (Array.isArray(v)) { v.forEach(visit); return; }
      if ([v.regiment_id, v.brigade_id, v.division_id, v.corps_id, v.battery_id, v.battalion_id].includes(id)) { found = v; return; }
      for (const k of Object.keys(v)) visit(v[k]);
    };
    visit(f.json);
    if (found) return found;
  }
  throw new Error(`no OOB record ${id}`);
}

export function placementFile(data, rel) {
  return data.files.get(rel).json.placements;
}

/** A valid extra placement row. */
export const row = (unit_id, tick, lat = 39.815, lng = -77.235, extra = {}) => ({ unit_id, tick, lat, lng, bearing: 90, disposition: 'Line of Battle', strength: 300, ...extra });

export function baselineFor(ruleId) {
  return { ...baseline, rules: baseline.rules[ruleId] ? { [ruleId]: baseline.rules[ruleId] } : {} };
}

/**
 * Run one rule over (possibly mutated) data and judge it against the committed baseline.
 * @returns {{r:any, verdict:any}}
 */
export async function judge(ruleId, data, { ctxOpts = {}, dataDir } = {}) {
  const { results } = await runValidation({ data: dataDir ? null : data, dataDir, only: [ruleId], site: false, ctxOpts, now: NOW });
  const r = results.get(ruleId);
  const verdict = evaluateRatchet(results, baselineFor(ruleId), { now: NOW });
  return { r, verdict };
}

export function tmpCopyOfData() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gtbg-data-'));
  fs.cpSync(DEFAULT_DATA_DIR, dir, { recursive: true });
  return dir;
}

export function fixtureDist(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gtbg-dist-'));
  for (const [name, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    fs.writeFileSync(path.join(dir, name), text, 'utf8');
  }
  return dir;
}

export const rmrf = (d) => fs.rmSync(d, { recursive: true, force: true });

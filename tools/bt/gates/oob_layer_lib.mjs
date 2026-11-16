// Node side of the Q01, Q14 and Q20 runners (workstream bt-gates): builds the REAL history layer, the world built from it, the stage and the crowd animation driver exactly as the
// application's own node tests do (app/tests/history.test.mjs, crowd.test.mjs), so a runner judges the code the page runs and not a copy of it.
// No network, no clock, no random number: two runs on the same tree give the same dump. Nothing is written except the JSON file named by --out.
//
// A test can inject a defect into the REAL code path with `--mutate <file.mjs>`: the module may export
//   mutateRaw(raw)            -- the raw inputs of the layer (history/units.json, arrivals.json, kit tables ...) before the layer is built
//   mutateWorld(world, layer) -- the world built from the layer, before the stage reads it
//   mutateLayer(layer)        -- the layer, before the world is built
// and the runner must then report the defect. Without --mutate nothing is changed.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = process.env.BT_GATES_ROOT ? path.resolve(process.env.BT_GATES_ROOT) : path.resolve(HERE, '..', '..', '..');
export const BT = path.join(ROOT, 'docs', 'battle-theatre');
export const APP = path.join(BT, 'app');
const imp = rel => import(pathToFileURL(path.join(APP, rel)).href);

export function parseArgs(argv) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t.startsWith('--')) { const k = t.slice(2); const v = (i + 1 < argv.length && !argv[i + 1].startsWith('--')) ? argv[++i] : true; a[k] = v; } else a._.push(t);
  }
  return a;
}

export async function loadMutation(file) {
  if (!file) return {};
  return await import(pathToFileURL(path.resolve(file)).href);
}

// scenarios of the app's own test (history.test.mjs SCENARIOS): a SAMPLE, never S* (GATE-SPEC X-23)
export const SAMPLE_SCENARIOS = [
  { id: 'sample-1', choices: { 'C-004': 'v0' }, optionText: { 'C-004': '22:30 Jul 1' } },
  { id: 'sample-2', choices: { 'C-004': 'v1' }, optionText: { 'C-004': 'at dawn' } },
  { id: 'sample-3', choices: { 'C-004': 'v3' }, optionText: { 'C-004': '07:00 Jul 2' } },
  { id: 'sample-4', choices: { 'C-003': 'v1', 'C-005': 'v2' }, optionText: { 'C-003': '08:00 (head of column)', 'C-005': '07:30 (EPP, FREE, PADRE)' } },
  { id: 'sample-5', choices: { 'C-043': 'v3' }, optionText: { 'C-043': '17:00' } },
  { id: 'sample-6', choices: { 'C-023': 'v1', 'C-021': 'range' }, optionText: { 'C-023': 'mid-afternoon', 'C-021': 'night of Jul 2 (W-D2, PHIF); Jul 3 (SS2)' } },
];

export function ofatScenarios(raw, layer) {
  const out = [];
  for (const cid of layer.meta.linkedConflicts) {
    const c = ((raw.conflicts || {}).conflicts || []).find(x => x.id === cid);
    if (!c) continue;
    (c.values || []).forEach((v, k) => out.push({ id: `ofat:${cid}:v${k}`, choices: { [cid]: 'v' + k }, optionText: { [cid]: v.label } }));
  }
  return out;
}

export function scenarioList(kind, raw, layer) {
  const def = { id: 'default', choices: {}, optionText: {} };
  if (kind === 'default') return [def];
  if (kind === 'ofat') return [def, ...ofatScenarios(raw, layer)];
  return [def, ...SAMPLE_SCENARIOS];             // 'sample' is the default of the runners
}

// the application's own pipeline: raw files -> layer -> world (-> stage)
export async function build({ mutate = {}, stage = false } = {}) {
  const { nodeWorld } = await imp('tests/node-world.mjs');
  const { makeGeo } = await imp('src/geo.mjs');
  const { loadRawFromDisk, terrainMeta } = await imp('tools/history-report.mjs');
  const { createRealHistory } = await imp('src/history/real.mjs');
  const { worldFromUnits } = await imp('src/world-from-units.mjs');
  const clock = await imp('src/clock.mjs');
  const raw = loadRawFromDisk();
  if (mutate.mutateRaw) await mutate.mutateRaw(raw);
  const { T } = await nodeWorld();
  const geo = makeGeo(T);
  const layer = createRealHistory({ raw, T: terrainMeta(), helpers: { civilDawn: m => m + 4 * 60 + 3 } });
  if (mutate.mutateLayer) await mutate.mutateLayer(layer);
  const world = worldFromUnits(T, geo, layer);
  if (mutate.mutateWorld) await mutate.mutateWorld(world, layer);
  const out = { raw, T, geo, layer, world, clock, BATTLE: clock.BATTLE };
  if (stage) out.Stage = (await imp('src/stage.mjs')).Stage;
  return out;
}

export function writeOut(file, obj) {
  const body = JSON.stringify(obj);
  if (file && file !== true) fs.writeFileSync(file, body);
  else process.stdout.write(body);
}

// the one place where a source tree is scanned for figure caps (OA02, Q01.6): the names the application's own test (anim3d-onetoone.test.mjs) looks for, in every module the page loads
export const CAP_PATTERNS = ['MAX_FIGURES', 'MAX_SOLDIERS', 'figureCap', 'soldierCap', 'maxInstances', 'MAX_AGENTS', 'maxAgents', 'agentCap', 'MAX_FIGURE', 'figureBudget', 'FIGURE_BUDGET'];
export function capScan() {
  const dirs = [path.join(APP, 'src'), path.join(BT, 'render', 'prototype', 'src')];
  const re = new RegExp(CAP_PATTERNS.join('|'));
  const hits = []; let files = 0;
  const walk = d => {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(mjs|js)$/.test(e.name)) {
        files++; const lines = fs.readFileSync(p, 'utf8').split('\n');
        lines.forEach((ln, i) => { const m = re.exec(ln); if (m) hits.push({ file: path.relative(ROOT, p).split(path.sep).join('/'), line: i + 1, pattern: m[0] }); });
      }
    }
  };
  for (const d of dirs) walk(d);
  hits.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : a.line - b.line));
  return { patterns: CAP_PATTERNS, files_scanned: files, hits };
}

export const r6 = x => (x == null || !Number.isFinite(x) ? x : Math.round(x * 1e6) / 1e6);

// layout-lab/job-worker.mjs - worker_threads entry used by measure.mjs: runs one measurement job and posts the result.
import { parentPort, workerData } from 'node:worker_threads';
import { loadAll } from './lib/data.mjs';
import { SPECS } from './lib/spec.mjs';
import { e1 } from './e1-worker.mjs';
import { runWindow, runLegacyWindow } from './lib/dynamic.mjs';

const { kind, args } = workerData;
const pack = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Array.from(v)]));
let out;
if (kind === 'e1') {
  const r = e1(args.z, { specName: args.specName, strategies: args.strategies, ticks: args.ticks, opts: args.opts, window: args.window, rule: args.rule, legacy: args.legacy });
  const lite = { hybrid: ['visible', 'tiles', 'leafTiles', 'aggTiles', 'unitsInAggs', 'displacedTiles', 'maxDispPx', 'overlaps', 'unrepresented', 'ms'], raw: ['overlaps'], aggregate: ['tiles', 'aggTiles', 'overlaps'], displace: ['tiles', 'dropped', 'overlaps'], fanout: ['tiles', 'dropped', 'overlaps'] };
  const series = args.keepSeries ? Object.fromEntries(Object.entries(lite).filter(([s]) => r.series[s]).map(([s, keys]) => [s, Object.fromEntries(keys.map((k) => [k, Array.from(r.series[s][k])]))])) : null;
  out = { summary: r.out, series, legacySeries: args.keepSeries && r.legacySeries ? pack(r.legacySeries) : null };
} else if (kind === 'dyn') {
  const all = loadAll(); const spec = SPECS[args.specName || 'standard'];
  const r = args.legacy ? runLegacyWindow(all, args.run) : runWindow(all, args.strategy, args.specOverride ? { ...spec, ...args.specOverride } : spec, args.run);
  out = { acc: r.acc };
} else throw new Error('unknown job kind ' + kind);
parentPort.postMessage(out);

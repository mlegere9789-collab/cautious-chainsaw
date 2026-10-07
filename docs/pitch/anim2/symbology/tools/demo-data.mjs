// tools/demo-data.mjs - cut the real data into the scenes the demo draws (demo/scenes.json): the units of one tick under the SNAPSHOT rule (each unit's latest keyframe, only the units whose latest keyframe is the most recent
// keyframe tick: 03-data-fuel.md rule B), with the fields a tile needs.  Read-only on the prototype dataset and the registry.
import fs from 'node:fs'; import path from 'node:path';
import { ROOT, REPO } from './chrome.mjs';
import { neededSet } from '../src/needed.mjs';
import { ECH_OF_KIND } from '../src/common.mjs';
import { CHIP_OF_DISPOSITION } from '../src/chips.mjs';
const needed = neededSet({ repo: REPO }); const ds = JSON.parse(fs.readFileSync(path.join(REPO, needed.dataset.file), 'utf8')); const reg = new Map(JSON.parse(fs.readFileSync(path.join(REPO, needed.registry), 'utf8')).units.map((u) => [u.id, u]));
const FORM = new Set(['brigade', 'division', 'corps', 'army']);
const SCENES = [
  { id: 'angle', name: 'The Angle, July 3 (tick 551)', tick: 551, lat: 39.8117, lng: -77.235, zoom: 16 },
  { id: 'culps', name: "Culp's Hill, July 3 (tick 451)", tick: 451, lat: 39.815, lng: -77.2194, zoom: 16 },
  { id: 'cemetery', name: 'Cemetery Hill and the Taneytown road, July 1 (tick 120)', tick: 120, lat: 39.8197, lng: -77.2326, zoom: 14.5 },
];
const keyTicks = [...new Set(ds.units.flatMap((u) => u.kf.map((k) => k[0])))].sort((a, b) => a - b);
const out = [];
for (const sc of SCENES) {
  const latest = Math.max(...keyTicks.filter((t) => t <= sc.tick)); const units = [];
  for (const u of ds.units) {
    const kfs = u.kf.filter((k) => k[0] <= sc.tick); if (!kfs.length) continue; const k = kfs[kfs.length - 1]; if (k[0] !== latest) continue;
    const r = reg.get(u.id); const formation = FORM.has(u.kind);
    units.push({ id: u.id, side: u.side, arm: formation ? 'formation' : (r && r.arm) || u.arm, ech: ECH_OF_KIND[u.kind], lat: k[1], lng: k[2], label: u.label, short: u.short, ratio: Math.min(1, k[3] / Math.max(1, u.strengthRef)), disposition: ds.dispositions[k[5]], idOnly: !u.inOob, ageTicks: sc.tick - k[0] });
  }
  const med = (a) => { const b = a.slice().sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
  if (sc.id === 'cemetery') { sc.lat = +med(units.map((u) => u.lat)).toFixed(4); sc.lng = +med(units.map((u) => u.lng)).toFixed(4); }
  out.push({ ...sc, snapshotTick: latest, units });
}
fs.writeFileSync(path.join(ROOT, 'demo', 'scenes.json'), JSON.stringify({ source: needed.dataset, rule: 'snapshot: units whose latest keyframe is at the most recent keyframe tick', scenes: out }));
console.log(out.map((s) => `${s.id}: tick ${s.tick} (snapshot ${s.snapshotTick}) ${s.units.length} units`).join('\n'));

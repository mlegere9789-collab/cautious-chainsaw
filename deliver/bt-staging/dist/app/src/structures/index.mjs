// The structures layer of one theatre visit: loads its inputs, builds the model, attaches the GPU part to the renderer, and follows the clock each frame.
import { URLS } from '../config.mjs';
import { makeStateEngine } from './state.mjs';
import { buildModel, CLASSES } from './model.mjs';
import { StructuresGPU } from './gpu.mjs';

const getJSON = async url => { const r = await fetch(url); if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`); return r.json(); };
export async function loadStructureInputs(raw) {
  const [data, sched, hospitals] = await Promise.all([getJSON(URLS.data + 'structures3d.json'), getJSON(URLS.structures + 'state_schedule.json'), getJSON(URLS.structures + 'hospitals.json')]);
  const structures = raw && raw.structures ? raw.structures : await getJSON(URLS.structures + 'structures.json'), works = raw && raw.works ? raw.works : await getJSON(URLS.structures + 'works_stages.json');
  return { data, sched, hospitals, structures, works };
}
export const DEFAULT_LAYERS = () => ({ roads: true, fences: true, buildings: true, masses: true, markers: true });

export class Structures {
  constructor(th, inputs, T) {
    this.th = th; this.inputs = inputs; this.T = T; this.engine = makeStateEngine({ structures: inputs.structures, sched: inputs.sched, works: inputs.works, hospitals: inputs.hospitals });
    const t0 = performance.now(); this.model = buildModel({ data: inputs.data, T, engine: this.engine, workObjs: th.layer.objects || [], workProgress: (o, t) => th.layer.objectProgress(o, t) }); this.buildMs = performance.now() - t0; this.gpu = null; this.ms = { update: 0, prepare: 0 };
    this.pd = inputs.sched.pdf_defaults_log || [];
  }
  get on() { return this.th.state.layers; }
  flags() { return { ...this.th.state.layers, works: this.th.state.settings.works !== false }; }
  // scenario names per structure id: the global readings (PD-nn, chosen in Sources) and the per-object choice on a card; the card's choice wins
  choice() {
    const st = this.th.state, out = {};
    for (const [pd, name] of Object.entries(st.structPD || {})) { const p = this.pd.find(x => x.id === pd); if (!p) continue; for (const r of p.rows || []) { const row = this.inputs.sched.rows.find(x => x.id === r); if (row) for (const o of row.object_ids) if (this.engine.scenariosFor(o).includes(name)) out[o] = name; } }
    return Object.assign(out, st.structChoice || {});
  }
  async attach(host) { this.gpu = await StructuresGPU.create(host, this.model); this.gpu.markDirty(); return this; }
  frame(tMin, cam) {
    if (!this.gpu) return; const t0 = performance.now(), m = this.model;
    if (m.update(tMin, this.choice(), this.on)) { this.gpu.markDirty(); this.version = (this.version || 0) + 1; this.th.bus.emit('structures'); }
    const t1 = performance.now(); this.gpu.prepare(cam, this.on); this.ms.update = t1 - t0; this.ms.prepare = performance.now() - t1;
  }
  destroy() { if (this.gpu) { this.gpu.destroy(); this.gpu = null; } this.model = null; }
  summary() {
    const c = this.model.counts, n = this.inputs.data.notDrawn.length;
    return { drawn: { buildings: c.buildings, masses: c.masses, fences: c.fences, panels: c.panels, markers: c.markers, roads: c.roads }, notDrawnRecords: n, classes: CLASSES };
  }
}

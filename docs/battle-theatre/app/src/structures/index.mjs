// The structures layer of one theatre visit: loads its inputs, builds the model, attaches the GPU part to the renderer, and follows the clock each frame.
import { URLS } from '../config.mjs';
import { makeStateEngine } from './state.mjs';
import { buildModel, CLASSES } from './model.mjs';
import { StructuresGPU } from './gpu.mjs';
import { planArtillery, ArtilleryTrain } from './artillery.mjs';
import { buildWorks3D } from './works3d.mjs';
import { Gazetteer } from '../history/gazetteer.mjs';

const getJSON = async url => { const r = await fetch(url); if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`); return r.json(); };
export async function loadStructureInputs(raw) {
  const [data, sched, hospitals] = await Promise.all([getJSON(URLS.data + 'structures3d.json'), getJSON(URLS.structures + 'state_schedule.json'), getJSON(URLS.structures + 'hospitals.json')]);
  const structures = raw && raw.structures ? raw.structures : await getJSON(URLS.structures + 'structures.json'), works = raw && raw.works ? raw.works : await getJSON(URLS.structures + 'works_stages.json');
  // workstream 6 inputs (the artillery train and the construction states of the works): optional, a failure is reported in ws6Errors and never stops the structures from drawing
  const opt = async url => { try { return await getJSON(url); } catch (e) { return { error: String(e.message || e) }; } };
  const [train, works3d] = await Promise.all([opt(URLS.data + 'artillery-train.json'), opt(URLS.data + 'works3d.json')]);
  const batteryGuns = raw && raw.batteryGuns ? raw.batteryGuns : await opt(URLS.data + 'battery-guns.json'), gazetteer = raw && raw.gazetteer ? raw.gazetteer : await opt(URLS.data + 'gazetteer.json');
  return { data, sched, hospitals, structures, works, train, works3d, batteryGuns, gazetteer, ws6Errors: [train, works3d, batteryGuns, gazetteer].filter(x => x && x.error).map(x => x.error) };
}
export const DEFAULT_LAYERS = () => ({ roads: true, fences: true, buildings: true, masses: true, markers: true });

export class Structures {
  constructor(th, inputs, T) {
    this.th = th; this.inputs = inputs; this.T = T; this.engine = makeStateEngine({ structures: inputs.structures, sched: inputs.sched, works: inputs.works, hospitals: inputs.hospitals });
    const t0 = performance.now(); this.model = buildModel({ data: inputs.data, T, engine: this.engine, workObjs: th.layer.objects || [], workProgress: (o, t) => th.layer.objectProgress(o, t) }); this.buildMs = performance.now() - t0; this.gpu = null; this.ms = { update: 0, prepare: 0 };
    this.pd = inputs.sched.pdf_defaults_log || [];
  }
  // ---- workstream 6 draw lists: the artillery train (guns beyond the stated ones, limbers, caissons, teams) and the construction states of the works (src/structures/artillery.mjs, works3d.mjs).
  // Pure functions of (time, the stage's poses, the viewer's choices). Nothing is computed per frame unless the host asks: call drawLists(tMin) after stage.apply(tMin), or pass a pose function.
  ws6() {
    const th = this.th, sc = th.state && th.state.scenario, key = JSON.stringify(sc && sc.choices || {}) + '|' + (sc && sc.id || '');
    if (this._w6 && this._w6.key === key) return this._w6;
    const I = this.inputs, w = { key, train: null, works: null, error: null };
    try {
      if (!I.train || I.train.error || !I.works3d || I.works3d.error || !I.batteryGuns || I.batteryGuns.error || !I.gazetteer || I.gazetteer.error) throw new Error('inputs missing: ' + (I.ws6Errors || []).join('; '));
      const both = th.layer.both(sc), units = th.layer.units;
      const plan = planArtillery({ units, train: I.train, batteryGuns: I.batteryGuns, arrivals: both.arrivals }); w.plan = plan;
      w.train = new ArtilleryTrain({ plan, train: I.train, units });
      w.works = buildWorks3D({ data: I.works3d, inputs: I, T: this.T, gaz: new Gazetteer(I.gazetteer), units, events: both.events });
    } catch (e) { w.error = String(e.message || e); console.warn('workstream 6 lists not built:', w.error); }
    return this._w6 = w;
  }
  stagePose() { const st = this.th.stage; return (i, o) => { if (!st || st.present[i] !== 1) return false; o.x = st.cx[i]; o.z = st.cz[i]; o.h = st.ch[i]; return true; }; }
  drawLists(tMin, o = {}) {
    const w = this.ws6(); if (w.error) return { error: w.error };
    const pose = o.pose || this.stagePose(), tc = o.trainChoice !== undefined ? o.trainChoice : (this.th.state && this.th.state.trainChoice) || null, wc = o.workChoice !== undefined ? o.workChoice : this.choice();
    return { t: tMin, artillery: w.train.at(tMin, pose, tc), works: w.works.at(tMin, wc), preexisting: w.works.preexisting() };
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
    const w6 = this._w6 && !this._w6.error ? { artillery: this._w6.train.totals(this.th.state && this.th.state.trainChoice || null), artilleryGaps: this._w6.plan.gaps, works: this._w6.works.coverage.reduce((a, x) => { a[x.decision] = (a[x.decision] || 0) + 1; return a; }, {}) } : null;
    return { drawn: { buildings: c.buildings, masses: c.masses, fences: c.fences, panels: c.panels, markers: c.markers, roads: c.roads }, notDrawnRecords: n, classes: CLASSES, ws6: w6 };
  }
}

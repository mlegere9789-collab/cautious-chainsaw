// The query library of the realization harness (gate Q17). It loads the SAME data and modules the Battle Theatre shell loads (app/src: the history layer, the world, the stage, the environment,
// the weather timeline, the structures model and the artillery/works lists) and answers, for any minute of the window, what the picture shows:
//   units:       is the unit on the field, where (lng, lat, metres from a named place), what is it doing (march, fire, build_works ...), its figures, its losses so far;
//   structures:  the state of a building, fence, work or hospital (the shell's own state engine) and whether anything is drawn for it;
//   weather/sky: the weather record, the drawn weather state (precipitation, cloud, wetness, fog, wind, temperature) and the sun and moon;
//   casualties:  the men who leave the line (killed, wounded, missing) in a window;
//   cards:       the event cards and the epilogue content the product shows (module adapters, absent until the owning workstream adds them);
//   places:      the gazetteer (gazetteer.mjs).
// Nothing here writes a file, draws, or decides what a row means; checks.mjs compares what is shown with what a record says.
//
//   const P = await openProduct();                         // the shell's opening scenario (the delegated defaults)
//   P.scene('pdf').unitAt('cs-2c-early', minOf(7, 1, 8));  // another scenario: 'default', 'pdf', or { choices: { 'C-021': 'v1' } }
//
// A time is a number of minutes since 1863-06-01 00:00 local mean time (app/src/clock.mjs) or 'YYYY-MM-DDTHH:MM'.
import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL, fileURLToPath } from 'node:url';
import { ROOT, BT, APP, GOV, readJSON, readJSONL, exists, rel, sha256File, toMin, isoOf, round, tokens, designators, designatorHits, fold } from './lib.mjs';
import { Places, distM, measure } from './gazetteer.mjs';

const T_ = x => (typeof x === 'number' ? x : toMin(x));
const NEVER = { from: Infinity, to: null };          // the stage's presence of a unit with no arrival record (app/src/stage.mjs)
const PLACE_WORDS = new Set(['hill', 'hills', 'ridge', 'run', 'creek', 'road', 'pike', 'woods', 'wood', 'farm', 'field', 'house', 'church', 'knoll', 'top', 'den', 'orchard', 'lane', 'spring', 'mill', 'bridge', 'station', 'hall', 'barn', 'town', 'street', 'grove', 'gap', 'cut', 'cuts', 'mountain', 'river']);

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// loading: one shared load per process (the layer, world, terrain and environment are scenario independent); a scene is the stage under one scenario
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const reads = new Map();                                // every file URL the shell's loaders fetched: path -> sha256 (the digest of the inputs of a run)
function installFetchShim() {
  if (globalThis.__btFetchShim) return; globalThis.__btFetchShim = true; const real = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.startsWith('file:')) { const p = fileURLToPath(u); if (!fs.existsSync(p)) return new Response('nf', { status: 404 }); const b = fs.readFileSync(p); reads.set(rel(p), null); return new Response(b, { status: 200 }); }
    return real(url);
  };
}
const imp = rp => import(pathToFileURL(path.join(APP, rp)).href);
let SHARED = null;
async function loadShared() {
  if (SHARED) return SHARED;
  installFetchShim();
  const [{ nodeTerrain }, data, { createRealHistory }, { worldFromUnits }, { Stage }, { makeGeo }, { Environment }, clock, contract, defaults] = await Promise.all([imp('tools/node-terrain.mjs'), imp('src/data.mjs'), imp('src/history/real.mjs'), imp('src/world-from-units.mjs'), imp('src/stage.mjs'), imp('src/geo.mjs'), imp('src/environment.mjs'), imp('src/clock.mjs'), imp('src/history/contract.mjs'), imp('src/scenario-defaults.mjs')]);
  const T = await nodeTerrain(), geo = makeGeo(T);
  const [conflicts, [eph, wxf]] = await Promise.all([data.loadConflicts(), data.loadEnvironmentFiles()]);
  const env = new Environment(eph, wxf), civilDawn = m => { const e = env.sunEvents(m); return e && e.civil_dawn != null ? e.civil_dawn : null; };
  const raw = await data.loadHistoryData();
  const layer = createRealHistory({ raw, T, helpers: { civilDawn } }), world = worldFromUnits(T, geo, layer);
  const tolerances = readJSON(path.join(path.dirname(fileURLToPath(import.meta.url)), 'tolerances.json'));
  const places = new Places({ tolerances });
  SHARED = { T, geo, conflicts, eph, wxf, env, raw, layer, world, Stage, clock, contract, defaults, data, places, tolerances, createRealHistory };
  return SHARED;
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------
export class Product {
  constructor(S) {
    Object.assign(this, S); this._scenes = new Map(); this._struct = null; this._wx = new Map(); this.byId = new Map(S.layer.units.map(u => [u.id, u])); this.index = new Map(S.layer.units.map((u, i) => [u.id, i]));
    this.children = new Map(); for (const u of S.layer.units) if (u.parent) (this.children.get(u.parent) || this.children.set(u.parent, []).get(u.parent)).push(u.id);
    this._uidx = null; this.adapters = null;
  }
  // ---- scenarios: 'default' (the shell's opening scenario: every conflict on its delegated default), 'pdf' (the plan's recommended values), or { choices }
  scenarioSpec(spec = 'default') {
    const { conflicts, defaults } = this;
    if (spec === 'default' || spec == null) return this.data.DEFAULT_SCENARIO(conflicts);
    if (spec === 'pdf') return { id: 'pdf-recommended', label: 'PDF recommended, pending owner', choices: defaults.pdfChoices(conflicts) };
    if (typeof spec === 'object') return { id: spec.id || 'custom', label: spec.label || 'custom', choices: { ...(spec.choices || {}) } };
    throw new Error(`unknown scenario "${spec}" (use 'default', 'pdf' or { choices })`);
  }
  scene(spec = 'default') { const sc = this.scenarioSpec(spec), key = JSON.stringify([sc.id, sc.choices]); let s = this._scenes.get(key); if (!s) { s = new Scene(this, sc, key, spec); this._scenes.set(key, s); } return s; }
  // ---- units: static facts
  unit(id) { const u = this.byId.get(id); return u || null; }
  ancestors(id) { const out = []; let u = this.byId.get(id); while (u && u.parent) { out.push(u.parent); u = this.byId.get(u.parent); } return out; }
  descendants(id) { const out = []; const walk = x => { for (const c of this.children.get(x) || []) { out.push(c); walk(c); } }; walk(id); return out; }
  // the leaf units of a formation (a unit with no children is its own leaf). onField: only the leaves the layer lists on the field (status on_field or partly_on_field)
  leaves(id, { onField = true } = {}) {
    const u = this.byId.get(id); if (!u) return [];
    const kids = this.children.get(id) || []; const ls = kids.length ? kids.flatMap(c => this.leaves(c, { onField: false })) : [id];
    return onField ? ls.filter(x => { const s = this.byId.get(x).status; return s === 'on_field' || s === 'partly_on_field'; }) : ls;
  }
  _unitIndex() {
    if (this._uidx) return this._uidx;
    const out = new Map();
    for (const u of this.layer.units) {
      const own = String(u.name).replace(/\(.*$/, '').trim(), tk = tokens(own).filter(w => !PLACE_WORDS.has(w));
      const cm = []; for (const c of u.commanders || []) { const nm = String(c).replace(/\((k|w|mw|c)\)/gi, '').replace(/\b[A-Z]\.\s*/g, ' ').trim(); for (const part of nm.split(/[\/,]/)) { const t = tokens(part).filter(w => !PLACE_WORDS.has(w) && w.length >= 3); for (const w of t) cm.push(w); } }
      out.set(u.id, { own, tokens: tk, numbered: /^\d/.test(own), designators: designators(u.name + ' ' + (u.short || '')), commanders: [...new Set(cm)], level: u.level });
    }
    return (this._uidx = out);
  }
  // the units a text names, with the reason: a regiment or battery by its designator ("6th Wisconsin" = 6 WI), a formation by the words of its own name (Early, Meredith's Iron Brigade), a brigade, division or
  // corps by its commander's surname. Place names are blanked first, so that "Cemetery Hill" never names a general Hill. -> [{ id, why, score }]
  unitsNamedIn(text) {
    const blank = this._blank(text), tk = new Set(tokens(blank)), hits = designatorHits(blank), idx = this._unitIndex(), out = [];       // tokens() strips possessives
    // a designator names a unit only if the words after it agree with the unit: "26th Pennsylvania Emergency Militia" is not the 26th PA Volunteers, "35th Va Cav Bn" is a cavalry unit, "1st Va Artillery" an artillery unit
    const agrees = (h, u) => { const a = h.after; if (/^(emergency|militia|state militia)\b/.test(a)) return /militia/i.test(u.name); if (/^(cav|cavalry|cav bn)\b/.test(a)) return u.arm === 'cavalry'; if (/^(art|artillery|battery|btty|light artillery)\b/.test(a)) return u.arm === 'artillery'; return true; };
    const des = { has: (k, u) => hits.some(h => h.key === k && agrees(h, u)) };
    for (const [id, x] of idx) {
      const u = this.byId.get(id); let why = null, score = 0;
      if (x.designators.size && [...x.designators].some(d => des.has(d, u))) { why = 'designator ' + [...x.designators].filter(d => des.has(d, u)).join(','); score = 3; }
      else if (!x.numbered && x.tokens.length && x.tokens.every(w => tk.has(w))) { why = 'name ' + x.tokens.join(' '); score = 2 + Math.min(2, x.tokens.length) / 10; }
      else if (['brigade', 'division', 'corps', 'army', 'artillery_brigade', 'artillery_battalion', 'artillery_group', 'group', 'command'].includes(x.level) && x.commanders.some(w => tk.has(w))) { why = 'commander ' + x.commanders.filter(w => tk.has(w)).join(','); score = 1; }
      if (why) out.push({ id, name: u.name, level: u.level, side: u.side, why, score });
    }
    return out.sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : 1));
  }
  _blank(text) { let t = String(text || ''); const hits = this.places.findIn(t); if (!hits.length) return t; for (const h of hits) { const re = new RegExp(h.key.split(' ').map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join("[\\s'’‘\\ufffd.,]*"), 'i'); t = t.replace(re, ' '); } return t; }
  // is the unit (or one of its ancestors) named in the text? -> { bound, how, via } (how: 'name' matched the words of the row; 'declared' only through a quote the record gives)
  bindUnit(id, text) {
    const named = this.unitsNamedIn(text), set = new Map(named.map(n => [n.id, n])); const chain = [id, ...this.ancestors(id)];
    for (const c of chain) if (set.has(c)) return { bound: true, how: 'matched', unit: c, why: set.get(c).why };
    return { bound: false };
  }
  // ---- structures (lazy, one bundle per scene): the shell's own Structures object (state engine, drawn objects, artillery train and works lists) on the real layer and that scene's stage
  async structures(spec = 'default') {
    const sc = this.scene(spec); if (sc._struct) return sc._struct;
    const m = await imp('src/structures/index.mjs'), inputs = this._sin || (this._sin = await m.loadStructureInputs(this.raw));
    const th = { layer: this.layer, stage: sc.stage, state: { scenario: sc.sc, layers: m.DEFAULT_LAYERS(), settings: {}, structPD: {}, structChoice: {}, trainChoice: null }, bus: { emit() {} } };
    const S = new m.Structures(th, inputs, this.T), byState = new Map();
    for (const o of S.model.objects) { for (const k of new Set([o.id, o.state_id, o.rec])) if (k) (byState.get(k) || byState.set(k, []).get(k)).push(o); }
    return (sc._struct = { S, inputs, model: S.model, engine: S.engine, byState, th });
  }
  // ---- weather: the drawn state (app/src/weather3d/timeline.mjs WeatherTimeline.at) and the record (app/src/environment.mjs weatherAt), for a scenario's choices
  async weather(choices = {}) {
    if (!this._WT) this._WT = (await imp('src/weather3d/timeline.mjs')).WeatherTimeline;
    const key = JSON.stringify(choices); let w = this._wx.get(key);
    if (!w) { w = new this._WT(this.env, { fxParams: readJSON(path.join(APP, 'data/fx3d/params.json')), choices }); this._wx.set(key, w); }
    return w;
  }
  async weatherAt(tMin, spec = 'default') {
    const sc = this.scenarioSpec(spec), t = T_(tMin), W = await this.weather(sc.choices), drawn = W.at(t * 60, {}), record = this.env.weatherAt(t, sc.choices), sun = this.env.sample(t, {});
    return { t, iso: isoOf(t), drawn, record, sun };
  }
  // ---- extension modules the product lists (src/ext/index.mjs) and the adapters for event cards and the epilogue chapter
  async extList() {
    const p = path.join(APP, 'src/ext/index.mjs'); if (!exists(p)) return { listed: [], file: null };
    const m = await import(pathToFileURL(p).href + '?t=' + fs.statSync(p).mtimeMs); return { listed: Array.isArray(m.default) ? m.default.slice() : [], file: rel(p) };
  }
  async adapters_() {
    if (this.adapters) return this.adapters;
    const A = readJSON(path.join(path.dirname(fileURLToPath(import.meta.url)), 'adapters.json')), ext = await this.extList(), out = { ext, found: {} };
    const hooksFile = path.join(APP, 'docs/GATE-HOOKS.md'), hooks = exists(hooksFile) ? fs.readFileSync(hooksFile, 'utf8').split(/\r?\n/) : [];
    for (const [name, spec] of Object.entries(A.adapters)) {
      const r = { name, spec, module: null, fn: null, listed: false, error: null }, mods = [...spec.modules];
      for (const line of hooks) { if (spec.functions.some(f => line.includes(f))) { const m = /(src\/[A-Za-z0-9_\/.-]+\.mjs)/.exec(line); if (m && !mods.includes(m[1])) mods.unshift(m[1]); } }   // a hook listed in docs/GATE-HOOKS.md is tried first
      for (const mp of mods) {
        const file = mp.startsWith('src/') ? path.join(APP, mp) : path.join(APP, 'src/ext', mp); if (!exists(file)) continue;
        const extRel = mp.startsWith('src/ext/') ? mp.slice('src/ext/'.length) : mp.startsWith('src/') ? null : mp;
        r.module = rel(file); r.listed = extRel != null && ext.listed.includes(extRel);
        try { const m = await import(pathToFileURL(file).href + '?t=' + fs.statSync(file).mtimeMs); const fn = spec.functions.find(f => typeof m[f] === 'function'); if (fn) { r.fn = fn; r.call = m[fn]; r.mod = m; } else r.error = `module ${mp} exports none of ${spec.functions.join(', ')}`; }
        catch (e) { r.error = `module ${mp} failed to load: ${String(e.message || e).slice(0, 200)}`; }
        break;
      }
      out.found[name] = r;
    }
    return (this.adapters = out);
  }
  // event cards shown at a minute: [{ id, rows: [timeline ids], title, tier, ... }]; available:false says why nothing can be asked (no module, not listed in the product, load error)
  async cardsAt(tMin, opts = {}) { return this._adapt('event_cards', tMin, opts); }
  async epilogueAt(tMin, opts = {}) { return this._adapt('epilogue', tMin, opts); }
  async _adapt(name, tMin, opts) {
    const a = (await this.adapters_()).found[name];
    if (!a || !a.module) return { available: false, reason: `no module for ${name} in app/src/ext (looked for ${a ? a.spec.modules.join(', ') : '?'}); see docs/GATE-HOOKS.md`, items: [] };
    if (a.error) return { available: false, reason: a.error, module: a.module, items: [] };
    if (!a.listed) return { available: false, reason: `${a.module} exists but is not in src/ext/index.mjs, so the product does not load it`, module: a.module, items: [] };
    try { const r = await a.call(T_(tMin), opts); return { available: true, module: a.module, fn: a.fn, items: Array.isArray(r) ? r : (r && r.items) || [] }; }
    catch (e) { return { available: false, reason: `${a.module} ${a.fn} threw: ${String(e.message || e).slice(0, 200)}`, module: a.module, items: [] }; }
  }
  inputDigest() { const out = {}; for (const k of [...reads.keys()].sort()) { try { out[k] = sha256File(path.join(ROOT, k)).slice(0, 16); } catch { out[k] = null; } } return out; }
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// one scenario: the stage's events, presence and activity timelines, and the per-minute frame
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------
export class Scene {
  constructor(P, sc, key, spec = 'default') {
    this.P = P; this.sc = sc; this.key = key; this.spec = spec; const { layer, world, T, geo, Stage } = P;
    this.stage = new Stage({ layer, world, T, geo }); this.info = this.stage.loadScenario(sc); this.both = layer.both(sc);
    this.stage.cache.build(P.clock.BATTLE.to * 60); this._frames = new Map(); this._segs = new Map(); this._ev = null;
  }
  frame(tMin) { const k = Math.round(T_(tMin) * 60); let f = this._frames.get(k); if (!f) { if (this._frames.size > 4000) this._frames.clear(); f = this.stage.cache.at(k); this._frames.set(k, f); } return f; }
  // the state of a unit at a minute, exactly as the stage's apply() decides it
  unitAt(id, tMin) {
    const P = this.P, st = this.stage, i = st.index.get(id), t = T_(tMin), tSec = t * 60;
    if (i == null) return { id, known: false, present: false, why: 'not_in_layer' };
    const u = P.layer.units[i], base = { id, known: true, name: u.name, level: u.level, side: u.side, arm: u.arm, drawn: !!u.drawn, status: u.status, render: u.render && u.render.status, figures: u.drawn ? u.strength.drawn : 0, t };
    if (!u.drawn) return { ...base, present: false, why: u.render && u.render.status === 'aggregate' ? 'aggregate_has_no_figures' : u.render && u.render.status === 'not_on_field' ? 'not_on_field' : 'not_drawn', reason: u.render && u.render.reason || null };
    const rec = this.frame(t).u[i], p = st.presence[id] || NEVER, arrival = Number.isFinite(p.from) ? p.from / 60 : null;
    const on = !!rec && tSec >= p.from && (p.to == null || tSec <= p.to);
    if (!on) return { ...base, present: false, why: !Number.isFinite(p.from) ? 'no_arrival_record' : tSec < p.from ? 'before_arrival' : (p.to != null && tSec > p.to) ? 'after_leave' : 'no_enter_event_yet', arrival_min: arrival, arrival: arrival == null ? null : isoOf(arrival) };
    const o = [0, 0, 0]; st._pos(rec, tSec, o); const [lng, lat] = P.geo.lnglat(o[0], o[1]), h = st._heading(rec, tSec);
    const seg = this.activityAt(i, tSec);
    return { ...base, present: true, x: round(o[0], 2), z: round(o[1], 2), lng: round(lng, 6), lat: round(lat, 6), sigma_m: round(o[2], 1), heading_deg: round(((180 - h * 180 / Math.PI) % 360 + 360) % 360, 1), activity: seg.activity, speed_ms: round(seg.speed, 2), event_activity: rec.act, since_min: seg.t0 == null ? null : round(seg.t0 / 60, 2), night: seg.night, arrival_min: arrival, arrival: arrival == null ? null : isoOf(arrival), loss: rec.loss || null };
  }
  // the activity the picture shows at a time: the stage's activity timeline (what the animation is driven by); before the first segment a present unit stands
  activityAt(i, tSec) {
    const s = this.segments(i); let k = -1; for (let j = 0; j < s.length; j++) { if (s[j].t0 <= tSec + 1e-6) k = j; else break; }
    return k < 0 ? { activity: 'stand', speed: 0, t0: null, night: false } : s[k];
  }
  segments(i) { return this.stage.unitSegments(i); }
  // the whole story of a unit for an author: arrival, presence, the legs of its path and its activity segments with positions
  timeline(id, { max = 60 } = {}) {
    const i = this.stage.index.get(id); if (i == null) return null; const P = this.P, p = this.stage.presence[id] || NEVER, segs = this.segments(i);
    const at = tSec => { const rec = this.stage._replay(i, tSec); if (!rec) return null; const o = [0, 0, 0]; this.stage._pos(rec, tSec, o); const [lng, lat] = P.geo.lnglat(o[0], o[1]); return { lng: round(lng, 5), lat: round(lat, 5) }; };
    const rows = segs.slice(0, max).map((s, k) => { const next = segs[k + 1]; return { from: isoOf(s.t0 / 60), to: next ? isoOf(next.t0 / 60) : null, activity: s.activity, speed_ms: round(s.speed, 2), at_start: at(s.t0 + 1e-3), at_end: next ? at(next.t0 - 1e-3) : null }; });
    return { id, arrival: Number.isFinite(p.from) ? isoOf(p.from / 60) : null, leave: p.to == null ? null : isoOf(p.to / 60), segments: rows, n_segments: segs.length };
  }
  // the units on the field at a minute, optionally within radiusM of a lng/lat or a place
  present(tMin, { near = null, radiusM = null, side = null } = {}) {
    const out = []; for (const u of this.P.layer.units) { if (!u.drawn) continue; if (side && u.side !== side) continue; const s = this.unitAt(u.id, tMin); if (!s.present) continue; if (near) { const d = distM(near, s); if (d > radiusM) continue; out.push({ ...s, d_m: round(d, 0) }); } else out.push(s); }
    return near ? out.sort((a, b) => a.d_m - b.d_m) : out;
  }
  // events admitted for a unit (enter, path, activity, formation, state, leave) in a window, in minutes
  events(id, from, to) { const i = this.stage.index.get(id); const tr = (i != null && this.stage.track[i]) || []; const a = T_(from) * 60, b = T_(to) * 60; return tr.filter(e => e.t >= a && e.t <= b); }
  // casualty events (men who leave the line) in a window; id null = every unit
  casualties(from, to, id = null) {
    const a = T_(from), b = T_(to), out = { killed: 0, wounded: 0, missing: 0, events: 0, units: new Set(), first: null, last: null };
    for (const e of this.both.events) { if (e.type !== 'state') continue; if (id && e.unit !== id) continue; if (e.t < a || e.t > b) continue; out[e.fate]++; out.events++; out.units.add(e.unit); out.first = out.first == null ? e.t : Math.min(out.first, e.t); out.last = out.last == null ? e.t : Math.max(out.last, e.t); }
    return { ...out, units: [...out.units].sort(), first: out.first == null ? null : isoOf(out.first), last: out.last == null ? null : isoOf(out.last) };
  }
  // the artillery train and the works (draw lists of the shell's Structures) at a minute
  async drawLists(tMin) { const S = (await this.P.structures()); return S.S.drawLists(T_(tMin), { pose: S.S.stagePose() }); }
}

export async function openProduct() { return new Product(await loadShared()); }
export { T_ as toTime, distM, measure, isoOf, toMin };

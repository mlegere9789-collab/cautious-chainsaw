// The added layers and panels of a theatre visit (contract: docs/EXT-CONTRACT.md). src/ext/index.mjs lists module paths; each module may export init(ctx), update(frame) and
// dispose(). This file is the loader (start, the per-frame call, teardown), the two registries the modules write to (panels, layer switches), the tier mark they use and the
// live view of the scenario choices. A module that fails is logged, stopped and listed as not running; it never stops the theatre. Nothing here touches the DOM: the drawer
// side is ui/ext-panel.mjs, and theatre.mjs supplies the importer, so this file also runs under node (tests/ext-loader.test.mjs).
import { URLS, TIERS, TIER_STYLE } from '../config.mjs';
import { glyphSVG } from '../overlay.mjs';

export const INDEX = 'index.mjs';
export const INIT_WAIT_MS = 15000;                                   // the theatre waits this long for one module to start, then goes on; the module joins when it is ready
export const RESERVED_PANELS = ['more'];                             // plus every name of the shell's own panels (th.PANELS)
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const msg = e => String((e && e.message) || e || 'unknown error').slice(0, 300);
const isThen = r => !!r && typeof r.then === 'function';

// ---------------------------------------------------------------- the tier mark
// One of the four tiers of config.mjs for any tier statement: the exact names and their short spellings map to themselves; a longer statement ("documented (secondary)",
// "hats documented; leggings open") takes the WEAKEST tier it names, so a mark never says more than the statement; a statement that names none is null (shown as "Tier not stated").
const SHORT = { 'documented': 0, 'inferred': 1, 'plausible-procedural': 2, 'plausible procedural': 2, 'plausible': 2, 'procedural': 2, 'open gap': 3, 'open-gap': 3, 'open': 3, 'gap': 3 };
const clean = t => String(t ?? '').trim().toLowerCase().replace(/_/g, ' ').replace(/\s+/g, ' ');
export function tierName(tier) {
  const s = clean(tier); if (!s) return null; if (s in SHORT) return TIERS[SHORT[s]];
  const p = s.replace(/\b(?:not|never|no|non|nothing|none)\b[\s-]+(?:\w+[\s-]+){0,2}?(?:documented|inferred)\b/g, ' ');     // "not documented", "never documented": that word does not count
  let w = -1;
  if (/\bdocumented\b/.test(p)) w = Math.max(w, 0); if (/\binferred\b/.test(p)) w = Math.max(w, 1); if (/\bplausible\b|\bprocedural\b/.test(p)) w = Math.max(w, 2); if (/\bopen\b|\bgaps?\b|\bunresolved\b/.test(p)) w = Math.max(w, 3);
  return w < 0 ? null : TIERS[w];
}
const NO_TIER = Object.freeze({ tier: null, label: 'Tier not stated', color: '#9aa3b8', dash: Object.freeze([3, 3]), glyph: 'square' });
const tierStyle = tier => { const n = tierName(tier); if (!n) return NO_TIER; const s = TIER_STYLE[n]; return { tier: n, label: s.label, color: s.color, dash: [...s.dash], glyph: s.glyph }; };
/** The tier marking as HTML: the same pill the unit and object cards use (glyph + label, so the tier never depends on colour alone). Anything said beyond the plain tier name stays visible beside it. */
export function tierMark(tier) {
  const n = tierName(tier), raw = String(tier ?? '').trim();
  if (!n) return `<span class="pill" data-tier="none" title="No tier is stated in a form this page knows">Tier not stated${raw ? ': ' + esc(raw) : ''}</span>`;
  const pill = `<span class="pill" data-tier="${n}">${glyphSVG(n, 12)}${esc(TIER_STYLE[n].label)}</span>`;
  return clean(raw) in SHORT ? pill : `<span class="tier-mark">${pill} <span class="mini tier-note">${esc(raw)}</span></span>`;
}
tierMark.tier = tierName;                                             // 'documented' | 'inferred' | 'plausible-procedural' | 'open gap' | null
tierMark.label = tier => tierStyle(tier).label;                       // 'Documented', 'Inferred', 'Plausible-procedural', 'Open gap', 'Tier not stated'
tierMark.style = tierStyle;                                           // { tier, label, color, dash, glyph } for marks drawn on a canvas or in the scene (use dash and glyph, not colour alone)
tierMark.node = tier => { const t = document.createElement('template'); t.innerHTML = tierMark(tier); return t.content.firstElementChild; };
tierMark.tiers = Object.freeze([...TIERS]);

// ---------------------------------------------------------------- the scenario choices, live
// ctx.choices can be called (returns the current choices object) and can be read like the object itself (choices['CF-WIND-SPEED'], 'x' in choices, Object.keys, {...choices}).
// Both always show the choices in effect now, also after the viewer changes a source or resets the scenario. It cannot be written to: choices are made in the Sources panel.
export function liveChoices(get) {
  const cur = () => { const c = get(); return c && typeof c === 'object' ? c : {}; };
  return new Proxy(() => {}, {
    apply: () => cur(), get: (t, k) => cur()[k], has: (t, k) => k in cur(), ownKeys: () => Reflect.ownKeys(cur()),
    getOwnPropertyDescriptor: (t, k) => { const d = Reflect.getOwnPropertyDescriptor(cur(), k); if (d) d.configurable = true; return d; },
    set: () => false, deleteProperty: () => false, defineProperty: () => false,
  });
}

// ---------------------------------------------------------------- the loader
// a path of the list: a non-empty string that stays inside src/ext/
export function badPath(p) {
  if (typeof p !== 'string') return 'an entry of the list is not a string';
  const s = p.trim(); if (!s) return 'an entry of the list is empty';
  if (/^[a-z][a-z0-9+.-]*:/i.test(s) || s.startsWith('/') || s.startsWith('\\')) return 'a path must be relative to src/ext/';
  if (s.replace(/\\/g, '/').split('/').includes('..')) return 'a path must stay inside src/ext/';
  if (s.replace(/^\.\//, '') === INDEX) return 'the list names itself';
  return null;
}
// without an existence check: the wording browsers and node use when a module file is simply not there
export function looksAbsent(e) {
  if (!e) return false; if (e.code === 'ERR_MODULE_NOT_FOUND') return true;
  return e instanceof TypeError && /dynamically imported module|module script failed|error loading/i.test(String(e.message));
}
// the functions of a module: its named exports, or (when it has none of the three) a default-exported object that has them
const apiOf = m => { const has = o => !!o && ['init', 'update', 'dispose'].some(k => typeof o[k] === 'function'); return has(m) ? m : (m && has(m.default) ? m.default : m); };

export class Extensions {
  /** th: the theatre ({host, state, env, layer, structs, bus, PANELS, openPanel, closePanel, announce}). o.importer(path) -> Promise<module> (theatre.mjs: p => import('./ext/' + p));
   *  o.exists(path) -> Promise<boolean> (optional: says whether the list file is there, so that a missing list is told from a broken one); o.progress(i, n, path); o.waitMs; o.log; o.now. */
  constructor(th, o = {}) {
    if (typeof o.importer !== 'function') throw new TypeError('Extensions: an importer is required');
    this.th = th; this.importer = o.importer; this.exists = o.exists || null; this.progress = o.progress || null; this.waitMs = o.waitMs ?? INIT_WAIT_MS; this.log = o.log || console; this.now = o.now || (() => performance.now());
    this.recs = []; this.panels = new Map(); this.toggles = new Map(); this.index = { state: 'not read', error: null }; this.disposed = false; this.version = 0; this.nUpdating = 0;
    this.frame = Object.seal({ tMin: 0, dtMs: 0, cam: null, paused: true, speed: 1 }); this._pending = new Set(); this._loading = null;
    this.urls = Object.freeze({ ...URLS }); this.choices = liveChoices(() => { const t = this.th; return t && t.state && t.state.scenario ? t.state.scenario.choices : null; });
  }
  // ---- what a module is given
  ctxFor(rec) {
    const th = this.th;
    return Object.freeze({ theatre: th, host: th.host, state: th.state, env: th.env, history: th.layer, structures: th.structs || null, urls: this.urls, choices: this.choices,
      registerPanel: (id, title, renderFn) => this.registerPanel(rec, id, title, renderFn), registerLayerToggle: (id, title, getFn, setFn) => this.registerLayerToggle(rec, id, title, getFn, setFn), tierMark });
  }
  _changed() { this.version++; const th = this.th; if (th && th.bus) th.bus.emit('ext'); }
  _id(id, what) { if (typeof id !== 'string' || !id.trim() || id.length > 80) throw new TypeError(`${what}: the id must be a non-empty string of at most 80 characters`); return id.trim(); }
  _live(rec, what) { if (this.disposed) throw new Error(`${what}: the theatre has been left`); if (rec && (rec.state === 'failed' || rec.state === 'stopped')) throw new Error(`${what}: ${rec.path} is not running`); }

  // ---- panels: registerPanel(id, title, renderFn). renderFn(body, theatre, scope) is called each time the panel is opened (ui/ext-panel.mjs).
  registerPanel(rec, id, title, renderFn) {
    const what = `registerPanel(${JSON.stringify(id)})`; this._live(rec, what); id = this._id(id, what);
    if (typeof renderFn !== 'function') throw new TypeError(`${what}: renderFn must be a function`);
    const th = this.th; if (RESERVED_PANELS.includes(id) || (th.PANELS && Object.prototype.hasOwnProperty.call(th.PANELS, id))) throw new Error(`${what}: that name belongs to the shell`);
    const had = this.panels.get(id); if (had && had.owner !== rec) throw new Error(`${what}: already registered by ${had.owner ? had.owner.path : 'the shell'}`);
    const p = had || { id, owner: rec, handle: null }; p.title = String(title ?? '').trim() || id; p.render = renderFn; this.panels.set(id, p);
    if (!p.handle) p.handle = Object.freeze({ id, open: () => this.openPanel(id), close: () => this.closePanel(id), refresh: () => this.refreshPanel(id), isOpen: () => this.isOpen(id), remove: () => this.removePanel(id) });
    this._changed(); if (had) this.refreshPanel(id); return p.handle;
  }
  isOpen(id) { const th = this.th; return !!th && !!th.state && th.state.panel === id; }
  openPanel(id) { const th = this.th; if (!th || !this.panels.has(id) || this.isOpen(id) || typeof th.openPanel !== 'function') return this.isOpen(id); th.openPanel(id); return this.isOpen(id); }
  closePanel(id) { const th = this.th; if (th && this.isOpen(id) && typeof th.closePanel === 'function') th.closePanel(true); }
  refreshPanel(id) { const th = this.th; if (th && th.bus && this.isOpen(id)) th.bus.emit('ext-panel', id); }
  removePanel(id) { if (!this.panels.has(id)) return false; this.closePanel(id); this.panels.delete(id); this._changed(); return true; }

  // ---- layer switches: registerLayerToggle(id, title, getFn, setFn). getFn() -> on or off now; setFn(on) is called with true or false when the viewer switches it.
  registerLayerToggle(rec, id, title, getFn, setFn) {
    const what = `registerLayerToggle(${JSON.stringify(id)})`; this._live(rec, what); id = this._id(id, what);
    if (typeof getFn !== 'function' || typeof setFn !== 'function') throw new TypeError(`${what}: getFn and setFn must be functions`);
    const had = this.toggles.get(id); if (had && had.owner !== rec) throw new Error(`${what}: already registered by ${had.owner ? had.owner.path : 'the shell'}`);
    const t = had || { id, owner: rec, handle: null, getFailed: false }; t.title = String(title ?? '').trim() || id; t.get = getFn; t.set = setFn; this.toggles.set(id, t);
    if (!t.handle) t.handle = Object.freeze({ id, get: () => this.toggleState(id), set: on => this.setToggle(id, on), refresh: () => this._toggled(id), remove: () => this.removeToggle(id) });
    this._changed(); return t.handle;
  }
  toggleState(id) {
    const t = this.toggles.get(id); if (!t) return false;
    try { return !!t.get(); } catch (e) { if (!t.getFailed) { t.getFailed = true; this.log.error(`ext ${t.owner ? t.owner.path : ''}: the state of layer switch '${id}' could not be read`, e); } return false; }
  }
  _toggled(id) { const th = this.th; if (th && th.bus) th.bus.emit('ext-toggle', id); }
  /** Switch a layer as the viewer does: setFn(on) (awaited when it returns a promise), then the real state is read back with getFn and shown. Resolves to that state. */
  async setToggle(id, on, o = {}) {
    const t = this.toggles.get(id); if (!t) return false; let ok = true;
    try { await t.set(!!on); } catch (e) { ok = false; this.log.error(`ext ${t.owner ? t.owner.path : ''}: layer switch '${id}' failed`, e); }
    if (this.disposed || this.toggles.get(id) !== t) return false;
    const now = this.toggleState(id), th = this.th; this._toggled(id); if (th && th.bus) th.bus.emit('layer', id, now);
    if (th && typeof th.announce === 'function' && !o.silent) th.announce(ok ? `${t.title} ${now ? 'shown' : 'hidden'}.` : `${t.title} could not be switched.`);
    return now;
  }
  removeToggle(id) { if (!this.toggles.delete(id)) return false; this._changed(); return true; }
  _unregister(rec) {
    let n = 0; for (const [id, p] of [...this.panels]) if (p.owner === rec) { this.panels.delete(id); n++; } for (const [id, t] of [...this.toggles]) if (t.owner === rec) { this.toggles.delete(id); n++; }
    return n;                                                           // an open panel of that module is replaced by the list of what is not running (ui/ext-panel.mjs)
  }

  // ---- start: the list, then each module in the order of the list
  load() { return this._loading || (this._loading = this._load()); }
  async _load() {
    const ix = this.index; let list;
    if (this.exists) { let there = true; try { there = (await this.exists(INDEX)) !== false; } catch { there = true; } if (!there) { ix.state = 'absent'; return this; } }   // no list: nothing is added, nothing is said
    if (this.disposed) return this;
    try { const m = await this.importer(INDEX); list = m && m.default; }
    catch (e) { if (!this.exists && looksAbsent(e)) { ix.state = 'absent'; return this; } return this._indexFailed(e); }
    if (this.disposed) return this;
    if (!Array.isArray(list)) return this._indexFailed(new TypeError('the default export of src/ext/' + INDEX + ' is not an array of module paths'));
    ix.state = 'read'; const seen = new Set(), todo = [];
    for (const p of list) {
      const bad = badPath(p), path = bad ? String(p) : p.trim().replace(/^\.\//, '');
      if (bad) this._refuse(path, bad); else if (seen.has(path)) this.log.warn(`ext ${path}: listed twice in src/ext/${INDEX}; started once`); else { seen.add(path); todo.push(path); }
    }
    for (let i = 0; i < todo.length; i++) { if (this.disposed) break; if (this.progress) { try { this.progress(i, todo.length, todo[i]); } catch { /* the caller's display */ } } await this._start(todo[i]); }
    return this;
  }
  _indexFailed(e) { this.index.state = 'failed'; this.index.error = msg(e); this.log.error(`ext: src/ext/${INDEX} could not be read; nothing was added`, e); this._changed(); return this; }
  _rec(path) { const rec = { path, state: 'loading', stage: 'import', error: null, m: null, api: null, ctx: null, inited: false, ended: false, hasUpdate: false, late: false, initMs: 0, updateMs: 0, updateMaxMs: 0, updates: 0 }; this.recs.push(rec); return rec; }
  _refuse(path, why) { const rec = this._rec(path); rec.state = 'failed'; rec.stage = 'list'; rec.error = why; this.log.error(`ext ${path}: ${why}; it is skipped`); this._changed(); }
  async _start(path) {
    const rec = this._rec(path), run = this._run(rec); this._pending.add(run); run.then(() => this._pending.delete(run));
    let timer = 0; const late = new Promise(r => { timer = setTimeout(() => r('late'), this.waitMs); });
    const r = await Promise.race([run, late]); clearTimeout(timer);
    if (r === 'late' && rec.state === 'loading') { rec.late = true; this.log.warn(`ext ${path}: still starting after ${this.waitMs} ms; the theatre goes on, the module joins when it is ready`); }
  }
  async _run(rec) {                                                    // never rejects
    const t0 = this.now();
    try {
      const m = await this.importer(rec.path); rec.m = m; rec.api = apiOf(m);
      if (this.disposed) { rec.state = 'stopped'; return; }             // the visit ended before it was started: there is nothing to end
      rec.stage = 'init'; rec.ctx = this.ctxFor(rec); rec.inited = true;
      if (typeof rec.api.init === 'function') await rec.api.init(rec.ctx);
      rec.initMs = this.now() - t0;
      if (this.disposed) { this._end(rec); rec.state = 'stopped'; return; }   // the visit ended while it was starting
      if (!['init', 'update', 'dispose'].some(k => typeof rec.api[k] === 'function')) this.log.warn(`ext ${rec.path}: exports no init, update or dispose; nothing runs`);
      rec.hasUpdate = typeof rec.api.update === 'function'; rec.state = 'running'; rec.stage = 'run'; if (rec.hasUpdate) this.nUpdating++; this._changed();
    } catch (e) { rec.initMs = this.now() - t0; this._fail(rec, rec.stage, e); }
  }
  // a failing module: logged, everything it registered is taken away, it is told to end (so that it removes what it drew) and it is listed as not running
  _fail(rec, stage, e) {
    if (rec.state === 'failed') return;
    if (this.disposed) { if (rec.inited) this._end(rec); rec.state = 'stopped'; if (this.log.debug) this.log.debug(`ext ${rec.path}: ${stage} ended with the visit`, e); return; }   // the visit is over: a module that breaks because its theatre is gone is not news
    if (rec.state === 'running' && rec.hasUpdate) this.nUpdating--;
    rec.state = 'failed'; rec.stage = stage; rec.error = msg(e);
    this.log.error(`ext ${rec.path}: ${stage} failed; it is skipped`, e);
    this._unregister(rec); if (rec.inited) this._end(rec); this._changed();
  }
  _end(rec) {                                                           // dispose() of one module, once, never throwing
    if (rec.ended || !rec.api) return; rec.ended = true; if (typeof rec.api.dispose !== 'function') return;
    try { const r = rec.api.dispose(); if (isThen(r)) r.then(null, e => this.log.warn(`ext ${rec.path}: dispose failed`, e)); } catch (e) { this.log.warn(`ext ${rec.path}: dispose failed`, e); }
  }

  // ---- every frame, before the renderer's frame: update({tMin, dtMs, cam, paused, speed}) of each running module, in the order of the list
  update(tMin, dtMs, cam, paused, speed) {
    if (this.disposed || !this.nUpdating) return;
    const f = this.frame, recs = this.recs;
    for (let i = 0; i < recs.length; i++) {
      const rec = recs[i]; if (rec.state !== 'running' || !rec.hasUpdate) continue;
      f.tMin = tMin; f.dtMs = dtMs; f.cam = cam; f.paused = paused; f.speed = speed;         // set again for each module: one module cannot change what the next one is given
      const t0 = this.now();
      try { const r = rec.api.update(f); if (isThen(r)) r.then(null, e => this._fail(rec, 'update', e)); } catch (e) { this._fail(rec, 'update', e); continue; }
      const ms = this.now() - t0; rec.updateMs = ms; if (ms > rec.updateMaxMs) rec.updateMaxMs = ms; rec.updates++;
    }
  }

  // ---- Back: dispose() of every started module, the last started first. Modules still starting are ended as soon as their init settles.
  dispose() {
    if (this.disposed) return; this.disposed = true;
    for (let i = this.recs.length - 1; i >= 0; i--) { const rec = this.recs[i]; if (rec.state === 'running') { this._end(rec); rec.state = 'stopped'; } }
    this.nUpdating = 0; this.panels.clear(); this.toggles.clear(); this.th = null; this.frame.cam = null;
  }

  // ---- what happened (the More drawer, the tests, the gate runner)
  status() { return this.recs.map(r => ({ path: r.path, state: r.state, stage: r.stage, error: r.error, late: r.late, initMs: r.initMs, updateMs: r.updateMs, updateMaxMs: r.updateMaxMs, updates: r.updates,
    panels: [...this.panels.values()].filter(p => p.owner === r).map(p => p.id), toggles: [...this.toggles.values()].filter(t => t.owner === r).map(t => t.id) })); }
  /** What is not running, for the viewer: [{name, text}] (a broken list first, then each module that failed, then modules still starting). */
  problems() {
    const out = []; if (this.index.state === 'failed') out.push({ name: 'The list of added layers', text: 'could not be read: ' + this.index.error });
    for (const r of this.recs) { if (r.state === 'failed') out.push({ name: r.path, text: `${{ list: 'refused', import: 'could not be loaded', init: 'could not be started', update: 'stopped' }[r.stage] || 'stopped'}: ${r.error}` }); else if (r.state === 'loading' && r.late) out.push({ name: r.path, text: 'still starting' }); }
    return out;
  }
  /** Resolves when no module is still starting. */
  async whenSettled() { while (this._pending.size) await Promise.all([...this._pending]); return this; }
}

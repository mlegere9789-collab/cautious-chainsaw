// One visit to the Battle Theatre: builds the page, loads the data, starts the renderer and the frame loop, and tears all of it down again.
// A Theatre owns a Scope; leaving the theatre disposes the scope, destroys the GPU device, removes the DOM and returns the page to its landing state.
import { URLS, DEFAULTS, SEED, SIM_CODE } from './config.mjs';
import { Scope, Bus } from './scope.mjs';
import { loadTerrain, buildWorld } from '../../render/prototype/src/world.mjs';
import { Camera } from '../../render/prototype/src/camera.mjs';
import { RenderHost } from './render-host.mjs';
import { makeGeo } from './geo.mjs';
import { BATTLE, EPILOGUE, chapterOf, clampT, minOf, fmtDate, fmtTime, fmtShort } from './clock.mjs';
import { Environment, BAND_NAMES } from './environment.mjs';
import { loadTimeline, loadConflicts, loadEnvironmentFiles, loadBookmarks, loadHistoryData, DEFAULT_SCENARIO } from './data.mjs';
import { createStubHistory, STUB_LINKS } from './history/stub.mjs';
import { createRealHistory } from './history/real.mjs';
import { worldFromUnits } from './world-from-units.mjs';
import { validateLayer, validateUnits, validateArrivals, validateEvents, validateKit } from './history/contract.mjs';
import { Stage } from './stage.mjs';
import { Controls } from './controls.mjs';
import { Overlay } from './overlay.mjs';
import { mountChrome } from './ui/chrome.mjs';
import { mountDock } from './ui/dock.mjs';
import { mountPanels } from './ui/panels.mjs';
import { mountCard } from './ui/card.mjs';
import { mountObjectCard } from './ui/object-card.mjs';
import { Structures, loadStructureInputs, DEFAULT_LAYERS } from './structures/index.mjs';
import { drawStructureMarks } from './structures/overlay.mjs';
import * as fxHost from './fx-host.mjs';
import * as AudioHost from './audio-host.mjs';
import { perspective, lookAt, mul, frustumPlanes } from '../../render/prototype/src/math.mjs';

const warm = { T: null, base: null };                // parsed ground and the placeholder crowd, kept between visits (plain arrays; no GPU or DOM objects)
const nextFrame = () => new Promise(r => requestAnimationFrame(() => r()));
const idle = () => new Promise(r => setTimeout(r, 0));
const qs = new URLSearchParams(location.search);

export class Theatre {
  constructor(tpl, opts = {}) {
    this.tpl = tpl; this.opts = opts; this.scope = new Scope('theatre'); this.bus = new Bus(); this.dead = false; this.ready = false; this.root = null; this.host = null;
    this.state = { t: minOf(7, 1, 12), chapter: 'battle', playing: false, speed: 1, rate: 0, scenario: DEFAULT_SCENARIO(), overlay: false, selected: -1, selectedObj: -1, layers: DEFAULT_LAYERS(), structPD: {}, structChoice: {}, hover: -1, event: null, panel: null, follow: false,
      settings: { nightFloor: DEFAULTS.nightFloor, renderScale: DEFAULTS.renderScale, nearR: DEFAULTS.nearR, midR: DEFAULTS.midR, reduceMotion: null, labels: true, works: true, lightLock: false } };
    this.perf = { frames: [], cpu: [], gpu: [], long: [], longEntry: [], n: 0, maxKeep: 1500, phase: { light: 0, stage: 0, upload: 0, structs: 0, fx: 0, render: 0, overlay: 0, ui: 0 } }; this.anim = { t: 60, rate: 1 }; this.needSeek = true; this.needFx = true; this.light = {}; this.sample = {}; this.wx = null; this.lastLightKey = '';
    this.counters = { frames: 0, uploads: 0, replays: 0 };
  }
  get reduceMotion() { const o = this.state.settings.reduceMotion; return o == null ? matchMedia('(prefers-reduced-motion: reduce)').matches : o; }
  announce(msg) { const el = this.els?.live; if (el) { el.textContent = ''; this.scope.timeout(() => { if (this.els?.live) this.els.live.textContent = msg; }, 30); } }

  async start() {
    const sc = this.scope, t0 = performance.now();
    this.root = this.tpl.content.firstElementChild.cloneNode(true); document.body.appendChild(this.root);
    const q = s => this.root.querySelector(s);
    this.els = { stage: q('#bt-stage'), canvas: q('#bt-canvas'), overlay: q('#bt-overlay'), rain: q('#bt-rain'), grade: q('#bt-grade'), loading: q('#bt-loading'), step: q('#bt-loading-step'), bar: q('#bt-loading-bar'), live: q('#bt-live'),
      back: q('#bt-back'), drawer: q('#bt-drawer'), card: q('#bt-card') };
    // long tasks (the user-visible freezes) are recorded for the whole visit
    if (typeof PerformanceObserver !== 'undefined' && PerformanceObserver.supportedEntryTypes?.includes('longtask')) {
      const po = sc.observe(new PerformanceObserver(l => { for (const e of l.getEntries()) { (this.ready ? this.perf.long : this.perf.longEntry).push({ at: Math.round(e.startTime), ms: Math.round(e.duration) }); } })); po.observe({ type: 'longtask' });
    }
    const step = (txt, f) => { if (this.dead) return; this.els.step.textContent = txt; this.els.bar.style.width = Math.round(f * 100) + '%'; };
    try {
      step('Reading the timeline, sources and sky tables', 0.04);
      const [timeline, conflicts, [eph, wxf], bookmarks] = await Promise.all([loadTimeline(), loadConflicts(), loadEnvironmentFiles(), loadBookmarks()]); if (this.dead) return;
      this.timeline = timeline; this.conflicts = conflicts; this.bookmarks = bookmarks; this.env = new Environment(eph, wxf);
      this.timed = timeline.filter(e => e.t != null && e.t >= BATTLE.from && e.t < BATTLE.to);
      step('Loading the ground', 0.2); await idle();
      if (!warm.T) warm.T = await loadTerrain(URLS.proto); if (this.dead) return;
      this.T = warm.T; this.geo = makeGeo(this.T);
      let rawHist = null;
      const civilDawn = m => { const e = this.env.sunEvents(m); return e && e.civil_dawn != null ? e.civil_dawn : null; };
      if (qs.get('history') === 'stub') {      // the placeholder layer, kept for the shell's own tests and for comparison (?history=stub)
        step('Placing the placeholder crowd', 0.45); await idle(); if (this.dead) return;
        if (!warm.base) { const b = buildWorld(this.T, { total: 165000, gunRate: 1 }); for (let i = 0; i < b.count; i++) b.sold1[i * 4] = 1e9; warm.base = b; }   // no scripted casualties: losses belong to the history layer
        const base = warm.base; this.world = { ...base, unitF: base.unitF.slice(), gunF: base.gunF.slice() };
        this.layer = createStubHistory({ base, T: this.T, geo: this.geo, tiersDemo: qs.get('demo') === 'tiers', helpers: { civilDawn } });
      } else {
        step('Reading the order of battle, the arrival ledger and the gazetteer', 0.4); await idle(); if (this.dead) return;
        const raw = rawHist = await loadHistoryData(); if (this.dead) return;
        step('Placing the units the record can place', 0.5); await idle(); if (this.dead) return;
        this.layer = createRealHistory({ raw, T: this.T, helpers: { civilDawn } });
        this.world = worldFromUnits(this.T, this.geo, this.layer);
      }
      if (!this.layer.meta.stub) { const rb = this.root.querySelector('#bt-ribbon'); if (rb) rb.innerHTML = '<span class="ribbon-dot" aria-hidden="true"></span><strong>Version 0 of the record</strong><span class="ribbon-long"> · most units have no place yet (open gap); losses and kit are procedural shares</span>'; }
      const bad = [...validateLayer(this.layer), ...validateUnits(this.layer.units)]; if (bad.length) throw new Error('history layer breaks the contract: ' + bad.slice(0, 3).join('; '));
      this.stage = new Stage({ layer: this.layer, world: this.world, T: this.T, geo: this.geo });
      this.applyScenario(false);
      step('Starting the renderer', 0.6); await idle(); if (this.dead) return;
      this.stage.apply(this.state.t);
      const cam = this.cam = new Camera(); this.sizeCanvas();
      const o = this.opts, api = qs.get('api') || 'auto', S = this.state.settings;
      const ropts = { base: URLS.proto, nearQ: +qs.get('nearQ') || 1, midQ: +qs.get('midQ') || .35, nearR: +qs.get('nearR') || S.nearR, midR: +qs.get('midR') || S.midR, shadowSize: +qs.get('shadow') || 2048, midMode: qs.get('mid') || 'vat', fxAlpha: .75, exposure: 1 };
      this.host = await RenderHost.create({ canvas: this.els.canvas, world: this.world, api, opts: ropts, replaceCanvas: () => this.replaceCanvas() }); if (this.dead) { this.host.destroy(); this.host = null; return; }
      const r0 = performance.now(); this.els.canvas = this.host.canvas; this.sizeCanvas(true); this.perf.resizeMs = performance.now() - r0;
      // the figures: every drawn figure with the figures3d models and the anim3d state machine (the placeholder layer has no kit manifests and keeps the prototype's soldier; ?crowd=off keeps it on the real layer too)
      if (!this.layer.meta.stub && this.layer.figures && qs.get('crowd') !== 'off') {
        try { await this.host.attachCrowd({ layer: this.layer, world: this.world, stage: this.stage, T: this.T, settings: S, progress: (f, txt) => step(txt, 0.6 + 0.2 * f) }); if (this.dead) return; }
        catch (e) { console.warn('figures not drawn, the prototype soldier is used:', e); this.crowdError = String(e.message || e); this.host.crowd = null; this.host.R.o.flags.near = this.host.R.o.flags.mid = this.host.R.o.flags.far = 1; this.host.setLod(S.nearR, S.midR); }
      }
      if (qs.get('structures') !== 'off') {
        step('Drawing the structures', 0.8); await idle(); if (this.dead) return;
        try { const inputs = await loadStructureInputs(rawHist); if (this.dead) return; this.structs = new Structures(this, inputs, this.T); await this.structs.attach(this.host); this.host.structures = this.structs.gpu; this.structs.gpu.markDirty(); }
        catch (e) { console.warn('structures not drawn:', e); this.structsError = String(e.message || e); this.structs = null; }
      }
      if (this.structs && this.host.crowd) this.host.crowd.setExtrasSource(tMin => { const L = this.structs.drawLists(tMin); if (L.error) return L; const w = this.structs.ws6().works; return { ...L, workMesh: L.works && L.works.segs && L.works.segs.length ? w.mesh(L.works) : null }; });
      try {                                         // effects (weather, smoke, dust: src/fx-host.mjs) and sound (src/audio-host.mjs)
        const anim = this.host.crowd ? this.host.crowd.driver.anim : null; this.anim3d = anim;
        this.fxOn = qs.get('fx') === 'off' ? null : await fxHost.init(this.host, { environment: this.env, anim, choices: () => this.state.scenario.choices, nightFloor: S.nightFloor });
        this.audio = AudioHost.init({ scope: sc, bus: anim ? anim.bus : null, replay: anim ? (a, b) => anim.advance(a, b) : null, T: this.T, search: location.search });
      } catch (e) { console.warn('effects or sound not started:', e); this.fxOn = null; }
      step('Building the controls', 0.9); await idle(); if (this.dead) return;
      this.controls = new Controls({ cam, canvas: this.els.canvas, T: this.T, scope: sc, reduceMotion: () => this.reduceMotion, onTap: (x, y, type) => this.tap(x, y, type), onHover: (x, y) => this.hoverAt(x, y), onMove: done => { if (done) this.bus.emit('camera-settled'); } });
      this.overlay = new Overlay({ canvas: this.els.overlay, stage: this.stage, layer: this.layer, cam, T: this.T, scope: sc }); this.sizeCanvas(true);
      const m0 = performance.now(); mountChrome(this); const m1 = performance.now(); mountDock(this); const m2 = performance.now(); mountPanels(this); mountCard(this); mountObjectCard(this);
      this.setView('overview', true); this.installResize(); this.installKeys(); this.perf.mount = { chrome: m1 - m0, dock: m2 - m1, rest: performance.now() - m2 };
      this.ready = true; this.root.dataset.ready = 'true'; this.els.loading.dataset.done = 'true'; sc.timeout(() => { if (this.els?.loading) this.els.loading.hidden = true; }, 420);
      step('Ready', 1); this.perf.entryMs = Math.round(performance.now() - t0);
      this.last = performance.now(); this.loopId = sc.raf(t => this.loop(t));
      this.expose(); this.els.canvas.focus({ preventScroll: true });
    } catch (e) {
      if (this.dead) return; console.error('Battle Theatre could not start:', e); this.failed = e;
      const l = this.els.loading; l.querySelector('.loading-card').innerHTML = `<p class="loading-title">The theatre could not start</p><p class="fail">${String(e.message || e).replace(/[<&]/g, c => ({ '<': '&lt;', '&': '&amp;' }[c]))}</p><p class="mini" style="margin-top:12px">Use Back to return. This page needs WebGPU or WebGL2.</p>`;
    }
  }
  replaceCanvas() { const old = this.els.canvas, n = old.cloneNode(false); old.replaceWith(n); this.els.canvas = n; return n; }
  sizeCanvas(apply) {
    const r = this.els.stage.getBoundingClientRect(), S = this.state.settings; const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let sc = S.renderScale * dpr; const maxPx = 3.2e6, px = r.width * r.height * sc * sc; if (px > maxPx) sc *= Math.sqrt(maxPx / px);
    this.cssW = Math.max(2, Math.round(r.width)); this.cssH = Math.max(2, Math.round(r.height)); this.pxW = Math.max(2, Math.round(r.width * sc)); this.pxH = Math.max(2, Math.round(r.height * sc)); this.dpr = dpr;
    if (apply && this.host) { this.host.resize(this.pxW, this.pxH); this.overlay?.resize(this.cssW, this.cssH, dpr); const rn = this.els.rain; rn.width = this.cssW; rn.height = this.cssH; this.bus.emit('resize'); }
    else if (!this.host) { this.els.canvas.width = this.pxW; this.els.canvas.height = this.pxH; }
  }
  installResize() {
    const ro = this.scope.observe(new ResizeObserver(() => { if (this.resizeRaf) return; this.resizeRaf = this.scope.raf(() => { this.resizeRaf = 0; this.sizeCanvas(true); }); })); ro.observe(this.els.stage);
  }
  // ---- scenario: the user's choices on the source conflicts. Linked placeholder groups follow the printed value; the weather follows the weather conflicts.
  applyScenario(announce = true) {
    const sc = this.state.scenario, byId = new Map(this.conflicts.map(c => [c.id, c]));
    sc.optionText = {}; for (const id of (this.layer.meta.linkedConflicts || Object.keys(STUB_LINKS))) { const c = byId.get(id); if (!c) continue; const key = sc.choices[id] || 'recommended', opt = c.options.find(o => o.key === key); sc.optionText[id] = opt ? opt.text : ''; }
    const info = this.stage.loadScenario(sc); this.rejected = this.stage.rejected; this._wxDirty = true; this.needSeek = true; this.needFx = true; this.stage.apply(this.state.t); this.bus.emit('scenario');
    if (announce) this.announce('Sources updated. ' + (Object.keys(sc.choices).length ? 'Custom choices are in effect.' : 'Following the plan recommended values, pending owner.'));
    return info;
  }
  // ---- time
  setTime(min, o = {}) {
    const ch = o.chapter || this.state.chapter; const t = clampT(min, ch);
    this.state.t = t; this.state.chapter = ch; this.needSeek = true; if (o.replay !== false) this.needFx = true; this.bus.emit('time', o);
    if (o.say) this.announce(o.say);
  }
  jumpEvent(e) {
    let t = e.t, say;
    if (t == null) { t = e.date ?? this.state.t; say = `Time not recorded${e.phrase ? ` (${e.phrase})` : ''}. Moved to the start of the day.`; }
    else say = `Jumped to ${fmtDate(t)} ${fmtTime(t)}.`;
    this.state.event = e; const ch = chapterOf(t); this.setTime(t, { chapter: ch, say }); this.bus.emit('event', e);
  }
  nextEvent(dir) { const t = this.state.t, L = this.timed; let lo = 0, hi = L.length; while (lo < hi) { const m = (lo + hi) >> 1; if (L[m].t <= t + (dir > 0 ? 0.5 : -0.5)) lo = m + 1; else hi = m; } const i = dir > 0 ? lo : lo - 1; while (L[i] && Math.abs(L[i].t - t) < 0.5) return L[i + (dir > 0 ? 1 : -1)] || null; return L[i] || null; }
  setPlaying(on) { this.state.playing = on; if (on) { const r = this.state.chapter === 'epilogue' ? EPILOGUE : BATTLE; if (this.state.t >= r.to - 1) this.setTime(r.from); } this.bus.emit('play'); }
  setSpeed(v) { this.state.speed = v; this.bus.emit('speed'); }
  // ---- views
  viewFor(x, z, o = {}) {
    const g = this.T.h(x, z), dist = o.dist ?? 140, h = o.height ?? 45, yaw = o.yaw ?? Math.PI * .75;     // looking north-east by default: the camera stands south-west of the point
    const cx = x - Math.sin(yaw) * dist, cz = z - Math.cos(yaw) * dist, cy = Math.max(this.T.h(cx, cz) + 3, g + h);
    const dx = x - cx, dy = g + 3 - cy, dz = z - cz; return { x: cx, y: cy, z: cz, yaw: Math.atan2(dx, dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)), fov: 62 };
  }
  setView(name, instant) {
    const c = this.cam, T = this.T; let v;
    if (name === 'overview') v = this.lookView({ x: 700, y: 1900, z: 1600, yaw: 0, pitch: 0, fov: 55 }, -400, 0, -300);
    else if (name === 'ground') { const f = this.layer.focus ?? 0, sl = this.stage.slots[f]; v = this.viewFor(sl.x, sl.z, { dist: 50, height: 5 }); }
    if (v) this.controls.flyTo(v, instant ? 0 : undefined);
  }
  lookView(v, tx, ty, tz) { const dx = tx - v.x, dy = ty - v.y, dz = tz - v.z; return { ...v, yaw: Math.atan2(dx, dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) }; }
  flyToLngLat(lng, lat, o = {}) {
    const [x, z] = this.geo.xz(lng, lat); if (!this.geo.inside(x, z, 0)) { this.announce('That place is outside the loaded ground.'); return false; }
    if (o.view) { const [vx, vz] = this.geo.xz(o.view.lng, o.view.lat), g = this.T.h(vx, vz), y = g + (o.height ?? 30); const dx = x - vx, dz = z - vz, d = Math.hypot(dx, dz);
      const yaw = d > 25 ? Math.atan2(dx, dz) : (Math.PI - o.view.heading * Math.PI / 180); const pitch = d > 25 ? Math.atan2(this.T.h(x, z) + 3 - y, d) : -.2; this.controls.flyTo({ x: vx, y, z: vz, yaw, pitch, fov: 62 }); }
    else this.controls.flyTo(this.viewFor(x, z, o)); return true;
  }
  flyToUnit(i) { this.controls.flyTo(this.viewFor(this.stage.cx[i], this.stage.cz[i], { dist: Math.max(90, this.stage.bbox[i][1] * 2 + 60), height: 40, yaw: this.stage.ch[i] + Math.PI * .8 })); }
  select(i, o = {}) {
    if (i === this.state.selected) { if (i >= 0) this.bus.emit('select', i); return; }
    if (i >= 0 && this.state.selectedObj >= 0) { this.state.selectedObj = -1; this.bus.emit('select-obj', -1); }
    this.state.selected = i; this.overlay.selected = i; if (i < 0) this.controls.follow = null; this.bus.emit('select', i);
    if (i >= 0 && !o.silent) this.announce(`Selected ${this.layer.units[i].name}.`);
  }
  tap(x, y, type) {
    const r = this.els.stage.getBoundingClientRect(), px = x - r.left, py = y - r.top, i = this.overlay.pick(px, py);
    if (i >= 0 || !this.structs) { this.select(i); return; }
    const hit = this.structs.model.pick(px, py, (X, Y, Z, out) => this.overlay.project(X, Y, Z, out), this.structs.flags(), this.cam);
    if (hit) this.selectObject(hit.oid); else { this.select(-1); this.selectObject(-1); }
  }
  hoverAt(x, y) { if (!this.ready || this.controls.pointers.size) return; const r = this.els.stage.getBoundingClientRect(); const now = performance.now(); if (now - (this._hv || 0) < 60) return; this._hv = now; const i = this.overlay.pick(x - r.left, y - r.top); let hov = i >= 0; if (!hov && this.structs && now - (this._hs || 0) > 140) { this._hs = now; this._hsHit = !!this.structs.model.pick(x - r.left, y - r.top, (X, Y, Z, out) => this.overlay.project(X, Y, Z, out), this.structs.flags(), this.cam); } if (!hov && this.structs) hov = this._hsHit; if (i !== this.overlay.hover || hov !== this._hov) { this.overlay.hover = i; this._hov = hov; this.els.canvas.style.cursor = hov ? 'pointer' : ''; } }
  installKeys() { /* playback and panel keys live in ui/chrome.mjs */ }
  togglePanel(name) { this.bus.emit('panel', name); }

  // ---- the frame loop
  loop(now) {
    if (this.dead) return; const sc = this.scope; this.loopId = sc.raf(t => this.loop(t));
    if (this.inflight >= 2) return;                       // never queue more than two frames on the GPU
    const dtMs = now - this.last; this.last = now; const dt = Math.min(0.1, dtMs / 1000); const f0 = performance.now(), st = this.state, S = st.settings;
    // time: rate eases toward the target, so play, pause and speed changes glide
    const target = st.playing ? st.speed : 0; st.rate += (target - st.rate) * (1 - Math.exp(-dt / .16)); if (Math.abs(st.rate - target) < 0.02) st.rate = target;
    if (st.rate > 0) {
      const r = st.chapter === 'epilogue' ? EPILOGUE : BATTLE; st.t += dt * st.rate / 60; this.anim.t += dt * Math.min(st.rate, 2);
      if (st.t >= r.to - 1 / 60) { st.t = r.to - 1 / 60; st.playing = false; st.rate = 0; this.bus.emit('play'); }
      this.bus.emit('tick');
    }
    if (this.needSeek) this._seekedForAudio = true;
    if (this.needSeek) { this.anim.t = 40 + (st.t * 60) % 7200; this.needSeek = false; this.stage.rebase(); }
    if (this.anim.t > 2e5) { this.anim.t = 40 + (st.t * 60) % 7200; this.needFx = true; this.stage.rebase(); }
    const p0 = performance.now(); this.controls.update(dt);
    // sky and light
    const smp = this.env.sample(st.t, this.sample), wx = (this._wxT === undefined || Math.abs(st.t - this._wxT) > 0.5 || this._wxDirty) ? (this._wxDirty = false, this._wxT = st.t, this.wx = this.env.weatherAt(st.t, st.scenario.choices)) : this.wx;
    const lt = this.env.light(smp, { nightFloor: S.nightFloor }, wx, this.light);
    if (S.lightLock && this._lock) { Object.assign(lt, this._lock); }
    this.host.setLight(lt.sunDir, lt.exposure); this.applyGrade(lt, smp);
    const p1 = performance.now();
    // stage (units, guns) at this time
    this.stage.animT = this.anim.t; const stats = this.stage.apply(st.t); const p2 = performance.now();
    if (this.stage.dirtyUnits) { this.host.uploadUnits(); this.stage.dirtyUnits = false; this.counters.uploads++; }
    if (this.stage.dirtySlots || this.stage.dirtyFalls) { this.host.uploadSoldiers([...(this.stage.dirtySlots ? ['s0'] : []), ...(this.stage.dirtyFalls ? ['s1'] : [])]); this.stage.dirtySlots = this.stage.dirtyFalls = false; this.counters.soldierUploads = (this.counters.soldierUploads || 0) + 1; }
    if (this.stage.dirtyGuns) { this.host.uploadGuns(); this.stage.dirtyGuns = false; }
    if (this.structs) this.structsFrame(st.t);
    const p3 = performance.now(); if (this.needFx) { this.needFx = false; this.replayFx(); this.counters.replays++; }
    this.stats = stats; const p4 = performance.now();
    if (this.fxOn) { try { this.fxInfo = fxHost.update({ tMin: st.t, cam: this.cam, choices: st.scenario.choices }); } catch (e) { console.warn('effects stopped:', e); this.fxOn = null; } }
    if (this.audio) AudioHost.update({ t: st.t, playing: st.playing, speed: st.speed, rate: st.rate, dt, seeked: this._seekedForAudio === true, scrubbing: !!this.scrubbing, cam: this.cam, weather: this.wx, sun: this.sample }); this._seekedForAudio = false;
    const rs = this.host.frame(this.anim.t, this.cam); this.rs = rs; this.counters.frames++; const p5 = performance.now();
    this.inflight = (this.inflight || 0) + 1; this.host.done().then(() => { this.inflight--; }, () => { this.inflight = 0; });
    // overlay and rain
    this.overlay.show = st.overlay; this.overlay.draw(st.t, { objects: S.works ? this.layer.objects.filter(o => o.line || o.at) : [], progress: (o, t) => this.layer.objectProgress(o, t), geo: this.geo });
    if (this.structs) drawStructureMarks(this, this.overlay);
    this.drawRain(dt, wx);
    const p6 = performance.now(); this.bus.emit('frame', dt);
    const cpu = performance.now() - f0; const ph = this.perf.phase; ph.light = Math.max(ph.light, p1 - p0); ph.stage = Math.max(ph.stage, p2 - p1); ph.upload = Math.max(ph.upload, p3 - p2); ph.structs = Math.max(ph.structs, this.structsMs || 0); ph.fx = Math.max(ph.fx, p4 - p3); ph.render = Math.max(ph.render, p5 - p4); ph.overlay = Math.max(ph.overlay, p6 - p5); ph.ui = Math.max(ph.ui, performance.now() - p6); const P = this.perf; P.frames.push(dtMs); P.cpu.push(cpu); const gm = this.host.gpuMs.total; if (gm !== undefined) P.gpu.push(gm); if (P.frames.length > P.maxKeep) { P.frames.shift(); P.cpu.shift(); if (P.gpu.length > P.maxKeep) P.gpu.shift(); } P.n++;
  }
  // structures: the clock and the fresh frustum of this frame's camera (the renderer builds its own later in the frame), then the culling and uploads
  structsFrame(t) {
    const cam = this.cam, R = this.host.R, aspect = R.W / R.H, f = cam.fwd, a = this._sc || (this._sc = { view: new Float32Array(16), proj: new Float32Array(16), vp: new Float32Array(16), planes: new Float32Array(24) });
    lookAt([cam.x, cam.y, cam.z], [cam.x + f[0], cam.y + f[1], cam.z + f[2]], [0, 1, 0], a.view); perspective(cam.fov, aspect, cam.near, cam.far, a.proj); mul(a.proj, a.view, a.vp); frustumPlanes(a.vp, a.planes);
    const t0 = performance.now(); this.structs.frame(t, { x: cam.x, y: cam.y, z: cam.z, planes: a.planes }); this.structsMs = performance.now() - t0;
  }
  // select a structure object (a fence, wall, building, mass, marker, road); clears a unit selection and the other way round
  selectObject(oid, o = {}) {
    if (oid === this.state.selectedObj) { if (oid >= 0) this.bus.emit('select-obj', oid); return; }
    if (oid >= 0 && this.state.selected >= 0) { this.state.selected = -1; this.overlay.selected = -1; this.controls.follow = null; this.bus.emit('select', -1); }
    this.state.selectedObj = oid; this.bus.emit('select-obj', oid);
    if (oid >= 0 && !o.silent && this.structs) this.announce(`Selected ${this.structs.model.objects[oid].name}.`);
  }
  replayFx() {
    const st = this.state, stage = this.stage, anim = this.anim.t;
    this.host.replayFx(this.cam, anim, a => stage.applyGunsAt(st.t - (anim - a) / 60));
    stage.applyGunsAt(st.t); stage.apply(st.t);
  }
  applyGrade(lt, smp) {
    const m = [1, 1, 1], mix = (c, k) => { for (let i = 0; i < 3; i++) m[i] *= 1 - k * (1 - c[i] / 255); };
    mix([64, 86, 150], lt.tint.night); mix([255, 205, 150], lt.tint.warm); mix([188, 196, 208], lt.tint.grey);
    const key = m.map(v => Math.round(v * 255)).join(','); if (key !== this.lastLightKey) { this.lastLightKey = key; this.els.grade.style.background = `rgb(${key})`; }
  }
  drawRain(dt, wx) {
    const cv = this.els.rain, k = wx && wx.precip ? wx.precip.intensity : 0;
    if (!this.rainOn && (k <= 0 || this.reduceMotion)) return;
    const c = cv.getContext('2d'); c.clearRect(0, 0, cv.width, cv.height); this.rainOn = false; if (k <= 0 || this.reduceMotion) return;
    this.rainOn = true; const n = Math.round(60 + 380 * k), w = cv.width, h = cv.height, ph = (this.rainPh = ((this.rainPh || 0) + dt * (700 + 600 * k)) % h);
    c.strokeStyle = `rgba(200,214,235,${0.16 + 0.22 * k})`; c.lineWidth = 1; c.beginPath();
    for (let i = 0; i < n; i++) { const x = ((i * 9301 + 49297) % 233280) / 233280 * w, y = (((i * 7919) % 104729) / 104729 * h + ph) % h, l = 10 + 14 * k; c.moveTo(x, y); c.lineTo(x - 2, y + l); } c.stroke();
  }
  // measured figures for the performance gates
  perfSummary() {
    const f = [...this.perf.frames].sort((a, b) => a - b), q = p => f.length ? f[Math.min(f.length - 1, Math.floor(p * f.length))] : 0, c = [...this.perf.cpu].sort((a, b) => a - b), g = [...this.perf.gpu].sort((a, b) => a - b);
    return { frames: f.length, p50: q(.5), p95: q(.95), p99: q(.99), max: f[f.length - 1] || 0, cpuP50: c[Math.floor(c.length * .5)] || 0, cpuP95: c[Math.floor(c.length * .95)] || 0, gpuP50: g[Math.floor(g.length * .5)] ?? null, gpuP95: g[Math.floor(g.length * .95)] ?? null, gpuMax: g[g.length - 1] ?? null, phases: { ...this.perf.phase }, long: [...this.perf.long], longEntry: [...this.perf.longEntry], entryMs: this.perf.entryMs, mount: this.perf.mount, resizeMs: this.perf.resizeMs };
  }
  resetPerf() { this.perf.frames.length = 0; this.perf.cpu.length = 0; this.perf.gpu.length = 0; this.perf.long.length = 0; for (const k in this.perf.phase) this.perf.phase[k] = 0; }
  expose() {
    const self = this;
    window.btApp = {
      version: SIM_CODE, get state() { return self.state; }, get ready() { return self.ready; }, get api() { return self.host?.api; }, get stats() { return self.stats; }, get header() { return self.stage.header(); }, get rejected() { return self.stage.rejected; },
      perf: () => self.perfSummary(), resetPerf: () => self.resetPerf(), scopeCounts: () => self.scope.counts(), liveHash: () => self.stage.liveHash(), stateHash: t => self.stage.stateHash(t ?? self.state.t),
      setTime: (t, o) => self.setTime(t, o), setPlaying: v => self.setPlaying(v), setSpeed: v => self.setSpeed(v), present: () => Array.from(self.stage.present), unitIds: () => self.layer.units.map(u => u.id),
      stage: self.stage, layer: self.layer, get structs() { return self.structs; }, selectObject: o => self.selectObject(o), cam: self.cam, env: self.env, host: self.host, overlay: self.overlay, theatre: self, select: i => self.select(i), flyToUnit: i => self.flyToUnit(i),
      lock(on) { self.state.settings.lightLock = on; self._lock = on ? { sunDir: [...self.light.sunDir], exposure: self.light.exposure, tint: { ...self.light.tint } } : null; },
      async frames(n = 2) { const c0 = self.counters.frames; while (self.counters.frames < c0 + n) await nextFrame(); },
    };
  }
  dispose() {
    if (this.dead) return; this.dead = true;
    try { if (window.btApp) delete window.btApp; } catch { /* ignore */ }
    this.scope.dispose();                       // listeners, timers, animation frames, observers
    try { fxHost.dispose(); } catch (e) { console.warn('effects teardown', e); }
    try { AudioHost.dispose(); } catch (e) { console.warn('sound teardown', e); }
    if (this.host) { this.host.destroy(); this.host = null; }
    this.bus.clear(); if (this.root) { this.root.remove(); this.root = null; }
    for (const k of Object.keys(this)) if (k !== 'dead') this[k] = null;       // a finished visit holds nothing: no DOM, no closure over the DOM
  }
}

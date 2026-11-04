// core.mjs - the ENGINE CORE of the release: composes the named modules into one frame pipeline and owns nothing else.  DOM-free (loads in node), so every smoothness and overlap claim is tested headless
// and again in real Chrome on the same code.
//
//   battle.visibleAt(tau)  ->  units + interpolated positions       model.mjs, interp/*   the ONE resolver of "what is on the field": exact at every keyframe, monotone cubic between them
//   layout.solve(...)      ->  certified targets                     layout/*              zero overlap by construction, aggregation into formation marks, hysteresis
//   display.step(...)      ->  display frame                         scene/display.mjs     entry/exit by fade and scale, one-frame swaps for crowds, no ghost tiles, the net
//
// The CAMERA and the TIME are inputs of step(), not state of the core: the host reads the Mapbox camera and the app's clock and hands them in, so the same function serves the browser, the tests and
// the frame strips.  Nothing here knows about React, Mapbox or the store.
import { createKernel } from './kernel/registry.mjs';
import { createTuning } from './tuning/tuning.mjs';
import { createBattle } from './model.mjs';
import { Camera } from './geo/project.mjs';
import { makeSpec } from './layout/spec.mjs';
import { createTextModel } from './layout/text.mjs';
import { worldOrigin } from './layout/tiles.mjs';
import { LAYOUTS } from './layout/strategies.mjs';
import { PchipTrack, ChordTrack, LinearTrack } from './interp/paths.mjs';
import { Display } from './scene/display.mjs';
import { createMetrics } from './metrics.mjs';

export const INTERP_MODELS = [
  { id: 'pchip', label: 'Monotone cubic (PCHIP)', doc: 'Exact at keyframes, no overshoot, C1: a unit does not stop at every keyframe.', build: (kfs, o = {}) => new PchipTrack(kfs, o.endSlopes) },
  { id: 'chord-smooth', label: 'Straight chords, smooth speed', doc: 'The path is the polyline through the keyframes; only the speed along it is smoothed.', build: (kfs, o = {}) => new ChordTrack(kfs, o.endSlopes) },
  { id: 'linear', label: 'Straight chords, constant speed', doc: 'Comparison baseline: velocity jumps at every keyframe.', build: (kfs) => new LinearTrack(kfs) },
];

/** the solve-cadence governor: judge the last 45 frames (or the last 0.8 s of slow ones); slow frames (mean interval over 21 ms) raise the cadence at once (1 -> 2 -> 3), and only a sustained calm (4.5 s of frames
 *  under 17.5 ms with the engine using less than 11 ms) lowers it again, so it does not flap.  Pure: the host passes real timings, the tests pass synthetic ones. */
export function governorStep(g, every, rawDtMs, engineMs) {
  g.n++; g.sum += rawDtMs; g.eng += engineMs;
  if (g.n < 45 && !(g.n >= 12 && g.sum >= 800)) return every;
  const avg = g.sum / g.n; const eng = g.eng / g.n; let next = every;
  if (avg > 21 && every < 3) { next = every + 1; g.calm = 0; }
  else if (avg < 17.5 && eng < 11 && every > 1) { g.calm += g.n; if (g.calm >= 270) { next = every - 1; g.calm = 0; } }
  else g.calm = 0;
  g.n = 0; g.sum = 0; g.eng = 0; return next;
}

/** R1F: the records of the units on the field are the engine's own, one per unit, refilled by every frame (model.mjs visibleAt with reuse); a cold start that runs in slices over several frames (warmG) solves the same picture again and again from the
 *  records it was started with, so it gets copies of them (the start of a job is a cut or a new day of data, never a frame of ordinary playback) */
const snapshotVis = (laid) => laid.map((v) => ({ u: v.u, st: { ...v.st }, p: v.p ? [v.p[0], v.p[1]] : undefined, pb: null, sx: v.sx, sy: v.sy }));

/**
 * @param {{dataset:object, tokens:object, textTable?:object, storage?:Storage|null, kernel?:object, systemReduced?:()=>boolean, autoQuality?:boolean, skins?:object[], settings?:object}} o
 */
export function createCore(o) {
  const kernel = o.kernel || createKernel();
  for (const m of INTERP_MODELS) if (!kernel.interp.has(m.id)) kernel.interp.register(m.id, m);
  for (const l of LAYOUTS) if (!kernel.layout.has(l.id)) kernel.layout.register(l.id, l);
  for (const s of o.skins || []) if (!kernel.skins.has(s.id)) kernel.skins.register(s.id, s);
  const tuning = createTuning(o.tokens, { storage: o.storage || null });
  if (o.storage) tuning.load();
  if (o.settings) tuning.import({ format: 'gtanim-settings/1', tokens: o.settings });
  const tok = (id) => tuning.get(id);
  let battle = createBattle(o.dataset, kernel, tok);
  const systemReduced = o.systemReduced || (() => false);
  const reduced = () => { const m = tok('motion.reduced'); return m === 'on' || (m === 'auto' && systemReduced()); };
  const camera = new Camera({ lng: -77.2377, lat: 39.8206, zoom: 13.5, w: 1280, h: 800 });
  const metrics = createMetrics(tok);
  let textModel = createTextModel(o.textTable || { fonts: {} }, 1.04, o.textTable ? 'table' : 'none');

  const E = { kernel, tuning, tok, camera, frame: null, frames: 0, forcedSolves: 0, dirty: true, selectedId: null, metrics, get battle() { return battle; }, get text() { return textModel; }, reduced };
  let layoutMod = null; let display = null; let specCache = null; let skinCache = null;
  let lastL = null; let lastSelected = null; let sinceSolve = 0; let accDtMs = 0; let autoEvery = 1; const gov = { n: 0, sum: 0, eng: 0, calm: 0 };
  // PERF3: SLICED WORK.  With o.sliceMs > 0 (the browser host) the two expensive solves, the cold start after a cut or at the first frame and the probes of the rest canon, run in slices of a few milliseconds, one slice per frame,
  // so that a frame never takes more than a slice plus the ordinary few milliseconds, whatever the machine.  Without it (the node tests, the harness) every solve is one call, as before.
  const SLICE_MS = o.sliceMs > 0 ? o.sliceMs : 0; const COLD_SLICE_MS = SLICE_MS * 1.5; let coldJob = null; let rewarm = false; let heldL = null; const EMPTY = Object.freeze({ placed: [], dropped: [], items: [], leaves: [], labelsShown: 0, ms: 0, rounds: 0, stats: {}, empty: true });
  // R1F: PRE-SOLVE (the browser host, o.presolve).  On a slow device the solve runs every 2nd or 3rd frame (the others carry it), and the frame that solves is the frame that also meets the map's render, the page's style and layout and a React commit
  // in ONE task: a solve of 20 to 60 ms at 4x CPU made 50 to 70 ms tasks.  The solve that the next frame will need is made in a task of its own after this frame (E.presolve, called by the host), from this frame's marks, and the next frame
  // takes it as a carried layout would be taken: brought to the marks' places by refresh (one frame of carry, where the cadence already carries two), and checked like any carried frame (overlap -> exact solve at once).  Not taken (and thrown
  // away) when the frame is not the plain successor: another zoom, a selection, a unit that comes or goes, a cut.
  const sameMarks = (ids, laid) => { if (ids.length !== laid.length) return false; for (let i = 0; i < ids.length; i++) if (ids[i] !== laid[i].u.id) return false; return true; };
  const PRESOLVE = !!o.presolve; const SLOW_ON = o.slowOnMs ?? 3.4; const SLOW_OFF = SLOW_ON * 0.75; let engEma = 0; let slowMode = false; let pre = null; let preMs = 0; let preOff = false; E.presolves = 0; E.adopted = 0; E.preMisses = 0; E.why = { set: 0, forced: 0, cold: 0, due: 0, other: 0 }; const LI = { laid: null, zoom: 0, tau: 0, view: null, spec: null, every: 1, origin: null, proj: null, cullPx: 0, pass: null };
  const fieldStamp = new Map(); let fieldEp = 0; let idsA = []; let idsB = []; const NO_IDS = new Set(); let prevZoom = null; let forceCut = false; let lastStamp = -1; let engClock = 0; let stampAtMs = 0; let solves = 0; let restSig = ''; let restSince = 0; let canonDone = false; E.canons = 0;

  const buildLayout = () => { layoutMod = kernel.layout.get(tok('layout.strategy')).create({ all: battle, tok }); };
  const buildDisplay = () => { display = new Display({ glide: tok('motion.mode') !== 'snap' }, tok); };
  buildLayout(); buildDisplay();

  const currentSkin = () => { const id = tok('skin.id'); return kernel.skins.has(id) ? kernel.skins.get(id) : null; };
  E.skin = currentSkin;
  /** the tile spec of the moment: the skin's footprint + the layout tokens + the text model (cached until one of them changes) */
  E.spec = () => {
    const skin = currentSkin();
    if (!specCache || skinCache !== skin) { specCache = makeSpec(skin && skin.footprint ? skin.footprint : {}, tok, textModel, skin && skin.sizer ? skin.sizer : null); skinCache = skin; }
    return specCache;
  };
  const invalidateSpec = () => { specCache = null; lastL = null; E.dirty = true; };
  tuning.on('layout.*', (v, id) => { if (id === 'layout.strategy') { buildLayout(); forceCut = true; } invalidateSpec(); });
  tuning.on('motion.mode', () => { buildDisplay(); forceCut = true; E.dirty = true; });
  tuning.on('interp.*', (v, id) => { if (id !== 'interp.strengthTweenMs') { battle.buildTracks(); layoutMod.reset(); forceCut = true; } E.dirty = true; });
  tuning.on('skin.id', () => { invalidateSpec(); layoutMod.reset(); forceCut = true; });
  kernel.skins.subscribe(() => { invalidateSpec(); });

  E.setTextTable = (table, source = 'measured') => { textModel = createTextModel(table, 1.04, source); specCache = null; lastL = null; layoutMod.reset(); E.dirty = true; };      // the solver's remembered crowds carry boxes sized with the old widths: start them again
  /** a new dataset (a day of placements arrived): the battle is rebuilt, the layout starts from the picture the viewer sees (the display layer keeps its tiles by identity, so nothing blinks) */
  E.setDataset = (ds) => { if (SLICE_MS > 0 && lastL) heldL = lastL; battle = createBattle(ds, kernel, tok); buildLayout(); lastL = null; specCache = null; E.dirty = true; if (SLICE_MS > 0) rewarm = true; };      // (sliced: the new layout is warmed in slices while the marks stand as they were drawn, see step)
  E.select = (id) => { E.selectedId = id || null; E.dirty = true; };
  E.cut = () => { forceCut = true; E.dirty = true; };
  E.warming = () => !!coldJob;

  /** the top-most solid tile at a screen point (CSS px), or null.  reach = extra pixels around the mark (a mouse 4, a finger 14) */
  E.hit = (sx, sy, reach = 4) => {
    const f = E.frame; if (!f) return null;
    for (let i = f.tiles.length - 1; i >= 0; i--) {
      const t = f.tiles[i]; if (!t.solid || t.life !== 'live') continue;
      const x = t.x + f.view.dx; const y = t.y + f.view.dy; const hw = t.w * t.scale / 2 + reach; const hh = t.h * t.scale / 2 + reach;
      if (sx >= x - hw && sx <= x + hw && sy >= y - hh && sy <= y + hh) return t;
    }
    return null;
  };

  /** what a pointer at (sx, sy) means: a unit (its own mark, or its true place: the foot of its pole, or its dot inside a crowd), a crowd (its mark), or nothing.  Order: a mark's box, a crowd member's dot, a crowd's
   *  box, the foot of a pole.  { kind: 'unit'|'crowd', id?, tile } or null.  reach = extra pixels (a mouse 4, a finger 14). */
  E.pickAt = (sx, sy, reach = 4) => {
    const f = E.frame; if (!f) return null; const dx = f.view.dx; const dy = f.view.dy; const tiles = f.tiles;
    for (let i = tiles.length - 1; i >= 0; i--) {
      const t = tiles[i]; if (!t.solid || t.life !== 'live' || t.kind !== 'leaf') continue;
      const hw = t.w * t.scale / 2 + reach; const hh = t.h * t.scale / 2 + reach; const x = t.x + dx; const y = t.y + dy;
      if (sx >= x - hw && sx <= x + hw && sy >= y - hh && sy <= y + hh) return { kind: 'unit', id: t.ids[0], tile: t };
    }
    let best = null; let bd = (reach + 5) * (reach + 5);
    for (let i = tiles.length - 1; i >= 0; i--) {
      const t = tiles[i]; if (!t.solid || t.life !== 'live' || t.kind !== 'agg' || !t.members) continue;
      for (const m of t.members) { const d = (m.ax + dx - sx) ** 2 + (m.ay + dy - sy) ** 2; if (d < bd) { bd = d; best = { kind: 'unit', id: m.id, tile: t }; } }
    }
    if (best) return best;
    for (let i = tiles.length - 1; i >= 0; i--) {
      const t = tiles[i]; if (!t.solid || t.life !== 'live' || t.kind !== 'agg') continue;
      const hw = t.w * t.scale / 2 + reach; const hh = t.h * t.scale / 2 + reach; const x = t.x + dx; const y = t.y + dy;
      if (sx >= x - hw && sx <= x + hw && sy >= y - hh && sy <= y + hh) return { kind: 'crowd', tile: t };
    }
    bd = (reach + 8) * (reach + 8);
    for (let i = tiles.length - 1; i >= 0; i--) {
      const t = tiles[i]; if (!t.solid || t.life !== 'live' || t.kind !== 'leaf') continue;
      const d = (t.ax + dx - sx) ** 2 + (t.ay + dy - sy) ** 2; if (d < bd) { bd = d; best = { kind: 'unit', id: t.ids[0], tile: t }; }
    }
    return best;
  };

  /**
   * advance by dtMs and return the display frame.
   * @param {{dtMs:number, rawDtMs?:number, tau:number, cam:{lng:number,lat:number,zoom:number,w:number,h:number}, selectedId?:string|null, pass?:(u:object,st:object)=>boolean, cut?:boolean, bias?:[number,number]}} inp
   */
  /** the marks near the screen (see the comment in step); R1F: a function of its own, the pre-solve's prediction of the next frame culls the same way */
  const cullVis = (vis, zoom, origin, view, proj, cullPx) => {
    const sc = 512 * 2 ** zoom; const D2R = Math.PI / 180; const wx = (v) => (proj ? (v.p = proj(v.st.lng, v.st.lat, v.pb || (v.pb = [0, 0])))[0] : (v.st.lng + 180) / 360 * sc - origin[0] + view.dx); const wy = (v) => { if (proj) return v.p[1]; const s = Math.sin(v.st.lat * D2R); return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * sc - origin[1] + view.dy; };
    const x0 = -cullPx; const x1 = view.w + cullPx; const y0 = -cullPx; const y1 = view.h + cullPx; const laid = [];
    for (const v of vis) { const x = wx(v); const y = wy(v); if ((x > x0 && x < x1 && y > y0 && y < y1) || v.u.id === E.selectedId) { v.sx = x; v.sy = y; laid.push(v); } }
    return laid;
  };

  E.step = (inp) => {
    const t0 = performance.now(); const dtMs = inp.dtMs; const rawDtMs = inp.rawDtMs ?? dtMs;
    camera.lng = inp.cam.lng; camera.lat = inp.cam.lat; camera.zoom = inp.cam.zoom; camera.w = inp.cam.w; camera.h = inp.cam.h;
    const zoom = camera.zoom; const first = E.frames === 0;
    if (inp.selectedId !== undefined) E.selectedId = inp.selectedId;
    const cut = forceCut || !!inp.cut || (!first && prevZoom !== null && Math.abs(zoom - prevZoom) > 0.6 && !inp.zoomGlide);
    forceCut = false; prevZoom = zoom;
    if (cut) { layoutMod.reset(); lastL = null; }
    // the units on the field (every unit with a keyframe up to tau, filtered by the app's filters) ...
    // (entries and exits are a matter of TIME: a unit that comes onto the field or leaves it.  A filter the viewer switches is not one: its marks are there or gone in that frame.)
    let vis = battle.visibleAt(inp.tau, { reuse: true });
    // R1F: who came onto the field and who left it since the last call, without a set of 360 ids built and thrown away every frame: each id is stamped with the number of the call that saw it (fieldEp), the ones whose stamp is not the
    // previous call's are new, the previous call's list (idsPrev) is walked once for the ones whose stamp is not this call's; the two sets are made only when something changed (and are the same shared empty set when nothing did)
    const ep = ++fieldEp; const idsNow = idsB; let nNow = 0; let newArr = null; let goneArr = null;
    for (let i = 0; i < vis.length; i++) { const id = vis[i].u.id; if (fieldStamp.get(id) !== ep - 1) (newArr || (newArr = [])).push(id); fieldStamp.set(id, ep); idsNow[nNow++] = id; }
    idsNow.length = nNow;
    for (let i = 0; i < idsA.length; i++) { const id = idsA[i]; if (fieldStamp.get(id) !== ep) (goneArr || (goneArr = [])).push(id); }
    idsB = idsA; idsA = idsNow;
    if (inp.pass) vis = vis.filter((v) => inp.pass(v.u, v.st));
    const newIds = newArr ? new Set(newArr) : NO_IDS; const goneIds = goneArr ? new Set(goneArr) : NO_IDS;
    // ... of which the ones near the screen are laid out (the others cannot be seen: a layout of 478 units for a phone showing 60 is wasted work).  The margin is wide, so a crowd near the edge is still whole.
    const proj = inp.project || null; const spec = E.spec(); spec.proj = proj; E.proj = proj; spec.zoom = zoom; spec.dMax = zoom >= tok('layout.fullZoom') ? tok('layout.dMaxFullPx') : tok('layout.dMaxPx'); const origin = worldOrigin(zoom); const camO = camera.origin(); const bias = inp.bias || [0, 0];
    const view = proj ? { dx: 0, dy: 0, w: camera.w, h: camera.h } : { dx: origin[0] - camO[0] + bias[0], dy: origin[1] - camO[1] + bias[1], w: camera.w, h: camera.h };
    const cullPx = Math.min(tok('layout.cullPx'), Math.max(100, 0.3 * Math.min(camera.w, camera.h))); let laid = vis;      // a phone's margin is smaller (a quarter of the screen's short side, 100 px at least): fewer marks to lay out where there is least room for them
    if (cullPx > 0) laid = cullVis(vis, zoom, origin, view, proj, cullPx);
    const setting = tok('layout.solveEvery'); const every = setting === 'auto' ? (o.autoQuality ? autoEvery : 1) : +setting;
    const frameDt = Math.min(dtMs || 16.667, 50); accDtMs += frameDt; engClock += frameDt;
    // THE REST CANON.  The sticky layout is history-dependent by design (merge now, split later), so after a long journey a still picture can sit in a coarser partition than the same picture reached fresh (measured: 7 marks against 24 for the same 29 units).
    // Once the picture has been still for 6 frames and nothing on screen is fading, the layout is solved ONCE from clean state; it is adopted only if it shows MORE marks (never fewer: no flicker, no cycle), and not while a unit is selected.  Any change re-arms it.
    let sig = zoom.toFixed(3) + '|' + (E.selectedId || '') + '|' + inp.tau.toFixed(3) + '|' + laid.length; let hs = 0; for (const v of laid) hs = (Math.imul(hs ^ (((v.sx || 0) * 4) | 0), 16777619) ^ (((v.sy || 0) * 4) | 0)) | 0; sig += '|' + hs;
    if (sig !== restSig) { restSig = sig; restSince = E.frames; canonDone = false; if (layoutMod.canonCancel) layoutMod.canonCancel(); }
    let canonNow = !first && !cut && !coldJob && !E.selectedId && !!layoutMod.canon && !!lastL && (layoutMod.canonProbing() || (!canonDone && E.frames - restSince >= 6 && !display.busy()));
    // PERF3: the cold start of a cut (or of the first frame) is a job: while it runs the old marks fade out (a cut is a cross-fade anyway) and the new ones are born when the layout is warm.
    const sliced = SLICE_MS > 0 && !!layoutMod.warmStart; let coldCut = false; let pending = null;
    const redo = rewarm && !cut && !first; rewarm = false;      // a new dataset (a day of placements arrived) starts a layout from clean state: warmed like a cut's, but the marks stay as they are (no fade) until it is ready
    if (sliced && (cut || first || redo)) { coldJob = { fade: !first && !redo, fresh: true, held: redo ? heldL : null }; layoutMod.warmStart({ vis: snapshotVis(laid), z: zoom, tau: inp.tau, view, dtMs: accDtMs, selectedId: E.selectedId, spec, noSettle: !!E.selectedId }); }
    if (coldJob) {
      const done = layoutMod.warmStep(COLD_SLICE_MS);
      if (done) { coldCut = coldJob.fade ? (coldJob.fresh ? 'cut' : 'in') : false; coldJob = null; }
      else {
        const Fp = display.step(coldJob.held || EMPTY, { dtMs: dtMs || 16.667, z: zoom, origin, spec, cut: coldJob.fade && coldJob.fresh, selectedId: E.selectedId, reduced: reduced(), newIds: null, goneIds: null });
        coldJob.fresh = false; Fp.solved = false; Fp.pending = true; Fp.t1 = performance.now(); pending = Fp;
      }
    }
    if (PRESOLVE) { LI.laid = laid; LI.zoom = zoom; LI.tau = inp.tau; LI.view = view; LI.spec = spec; LI.every = every; LI.origin = origin; LI.proj = proj; LI.cullPx = cullPx; LI.pass = inp.pass || null; }
    let pre0 = pre; pre = null; if (pre0 && pre0.frames !== E.frames) pre0 = null;
    const run = (force, dt) => {
      let L = null; let solved = true;
      // solve cadence: every frame, or (slow devices) every 2nd / 3rd with the solved tiles carried along by their units in between; a zoom change, a new selection or a change of the set of units always solves at once
      if (!force && lastL && every > 1 && sinceSolve + 1 < every && zoom === lastL._z && E.selectedId === lastSelected && newIds.size === 0 && goneIds.size === 0 && layoutMod.refresh) { if (layoutMod.refresh(lastL, { vis: laid, z: zoom, spec, selectedId: E.selectedId })) { L = lastL; solved = false; sinceSolve++; } }
      if (!L && pre0) {      // R1F: the pre-solved layout, taken like a carried one (see PRESOLVE above)
        const P = pre0; pre0 = null;
        if (!force && !first && !cut && P.zoom === zoom && P.sel === E.selectedId && P.spec === spec && P.bat === battle && sameMarks(P.ids, laid) && layoutMod.refresh(P.L, { vis: laid, z: zoom, spec, selectedId: E.selectedId })) { L = P.L; lastL = L; lastSelected = E.selectedId; sinceSolve = 0; solved = false; E.adopted++; } else E.preMisses++;
      }
      if (!L && canonNow) { canonNow = false; const C = layoutMod.canon({ vis: laid, z: zoom, tau: inp.tau, view, selectedId: E.selectedId, spec, against: lastL }, SLICE_MS > 0 ? SLICE_MS : Infinity); if (C) { L = C; L._z = zoom; lastL = L; lastSelected = E.selectedId; E.canons++; sinceSolve = 0; accDtMs = 0; solves++; } if (!layoutMod.canonProbing()) canonDone = true; }
      if (!L) { E.why[force ? 'forced' : (first || cut || !lastL) ? 'cold' : (newIds.size || goneIds.size) ? 'set' : (every > 1 && sinceSolve + 1 >= every) || every === 1 ? 'due' : 'other']++; const sin = { vis: laid, z: zoom, tau: inp.tau, view, dtMs: accDtMs, selectedId: E.selectedId, spec, cold: !sliced && (first || cut) }; L = layoutMod.solve(sin); if (!sliced && (first || cut) && layoutMod.settle && !E.selectedId) L = layoutMod.settle(sin, L); L._z = zoom; lastL = L; lastSelected = E.selectedId; sinceSolve = 0; accDtMs = 0; solves++; }
      const t1 = performance.now();
      const F = display.step(L, { dtMs: dt, z: zoom, origin, spec, cut: sliced ? coldCut === 'cut' : cut && !first, cutIn: coldCut === 'in', selectedId: E.selectedId, reduced: reduced(), newIds: first ? null : newIds, goneIds: first ? null : goneIds });
      F.solved = solved; F.t1 = t1; return F;
    };
    let F = pending;
    if (!F) {
      F = run(false, dtMs || 16.667);
      if (F.overlaps > 0 && !F.solved) { F = run(true, 0); E.forcedSolves++; }      // a frame carried on from the last solve touched a neighbour: solve it exactly now (the guarantee is per DISPLAYED frame)
      layoutMod.feedback(F.offsets);
    }
    const t2 = performance.now();
    F.tau = inp.tau; F.tick = Math.round(inp.tau); F.zoom = zoom; F.spec = spec; F.view = view; F.solveEvery = every; F.visible = vis.length; F.vis = vis; F.project = proj; F.camera = { lng: camera.lng, lat: camera.lat, zoom }; F.laid = laid.length;
    if (layoutMod.stamp !== undefined && layoutMod.stamp !== lastStamp) { lastStamp = layoutMod.stamp; stampAtMs = engClock; }
    E.frame = F; E.frames++; E.dirty = false;
    const engMs = t2 - t0 + preMs; preMs = 0;
    if (PRESOLVE) { engEma += (engMs - engEma) * 0.03; slowMode = engEma > (slowMode ? SLOW_OFF : SLOW_ON); }      // a device on which the engine's frame costs 3.4 ms or more (a 4x throttled phone: 5; a desktop: 1.5 to 2.5) solves ahead at cadence 1 too      // (R1F: the pre-solve that served this frame is part of the engine's cost of it)
    metrics.record(F, { rawDtMs, engineMs: engMs, displayMs: t2 - F.t1 });
    if (o.autoQuality && tok('layout.solveEvery') === 'auto' && !first) autoEvery = governorStep(gov, autoEvery, rawDtMs, engMs);
    return F;
  };

  // R1E: the settling period after the set of crowds last changed is a stretch of the engine's own time, not a count of frames.  100 frames were 1.7 s at 60 fps and 10 s at 10 fps, so on a loaded machine the engine stayed awake
  // (and drew) six times longer for the same picture (T0-ANIM-B14's "back to rest within 8 s" was a coin flip under load).  The dwell timers of the layout run on the same clock (the frame's dt, at most 50 ms), so the period still
  // covers the longest wait before a split trial; at 60 fps it is the same 100 frames (the fingerprint tests see no difference).
  const SETTLE_MS = 1640;                          // = 98.4 frames of 16.667 ms: longer than the longest wait before a split trial (the dwell plus its jitter)
  /** does the picture need another frame?  false when nothing moves, fades or settles */
  E.busy = () => E.dirty || !!coldJob || display.busy() || (layoutMod.canonProbing && layoutMod.canonProbing()) || (layoutMod.stamp !== undefined && engClock - stampAtMs < SETTLE_MS);
  E.autoEvery = () => autoEvery;
  E.slowMode = () => slowMode;
  /** R1F: will the next frame solve (cadence) with nothing else to do first?  Then the host may call presolve() in a task of its own after this frame. */
  E.wantsPre = (tauNext) => {
    if (!(PRESOLVE && !preOff && !pre && !!LI.laid && (LI.every > 1 || slowMode) && !!lastL && !coldJob && !E.selectedId && !!layoutMod.refresh && lastL._z === LI.zoom && !(layoutMod.canonProbing && layoutMod.canonProbing()))) return false;
    return sinceSolve + 1 >= LI.every || (tauNext !== undefined && battle.arrives(LI.tau, tauNext));      // the next frame solves by the cadence, or a unit comes onto the field in it (a solve at once, whatever the cadence)
  };
  /** tauNext: the displayed time the host expects of the next frame (the host's clock, one frame on), or undefined.  With it, a frame in which a unit comes onto the field is solved ahead too, for the marks that frame will have. */
  E.presolve = (tauNext) => {
    if (!E.wantsPre(tauNext)) return false;
    const t = performance.now(); let L = null; let laidN = LI.laid; let tauN = LI.tau;
    if (tauNext !== undefined && tauNext !== LI.tau && (tauNext - LI.tau >= 0.1 || battle.arrives(LI.tau, tauNext))) {      // the marks where the next frame will have them (the clock goes on as it does), when they will have moved by a tenth of a tick or more (3x playback and faster) or a unit comes onto the field in it: the solve is then that of the next frame, not of this one.  At 1x and 2x a frame moves them by a fraction of a pixel and the refresh at the next frame is all they need
      let visN = battle.visibleAt(tauNext, { reuse: true, alt: true }); if (LI.pass) visN = visN.filter((v) => LI.pass(v.u, v.st));
      laidN = LI.cullPx > 0 ? cullVis(visN, LI.zoom, LI.origin, LI.view, LI.proj, LI.cullPx) : visN; tauN = tauNext;
    }
    try { L = layoutMod.solve({ vis: laidN, z: LI.zoom, tau: tauN, view: LI.view, dtMs: accDtMs, selectedId: E.selectedId, spec: LI.spec, cold: false }); } catch (e) { preOff = true; pre = null; throw e; }
    const ids = new Array(laidN.length); for (let i = 0; i < ids.length; i++) ids[i] = laidN[i].u.id;
    L._z = LI.zoom; accDtMs = 0; solves++; pre = { L, ids, zoom: LI.zoom, sel: E.selectedId, spec: LI.spec, bat: battle, frames: E.frames }; preMs += performance.now() - t; E.presolves++; return true;
  };
  E.dropPre = () => { pre = null; };
  E.solves = () => solves;
  E.modules = () => ({ layout: layoutMod, display });
  /** facts about one unit at tau, each with the site's evidence label (nothing here is invented) */
  E.describeUnit = (id, tau) => {
    const u = battle.units.get(id); if (!u) return null; const st = battle.stateOf(u, tau);
    return { id: u.id, short: u.short, label: u.label, designation: u.designation, side: u.side, arm: u.arm, kind: u.kind, inOob: u.inOob, parentSource: u.parentSource, chain: u.chain, keyframes: u.kf.length, firstTick: u.kf[0].tick, lastTick: u.kf[u.kf.length - 1].tick,
      now: st && { lat: st.lat, lng: st.lng, strength: st.strength, strengthRef: u.strengthRef, disposition: st.disposition, note: st.note, kfTick: st.kfTick, moving: st.moving, bearing: st.bearing } };
  };
  return E;
}

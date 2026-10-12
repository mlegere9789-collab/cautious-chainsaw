// app.mjs - the browser entry: reads the inlined data, builds the engine, registers the skins, the popups and the tours, wires the canvas, the input, the Studio chrome, the narration and the
// guided tours, and runs the frame loop.  Everything the page needs is inlined by build.mjs, except the aerial tiles of the ground (files beside the page, or inlined with --pack): no request ever leaves the machine.
//
// URL parameters (all optional):  ?tune=1 open the Tuning Studio   ?metrics=1 metrics overlay   ?scene=<id>   ?tick=N   ?zoom=Z   ?speed=S   ?play=1   ?compare=before|after   ?tour=showcase|hotspot-...
//                                 ?style=dispatch-paper|dispatch-aerial (&variant=standard|cvd|contrast)   ?skin= ?mode= (motion) ?layout= ?vis= (carry|window|snapshot)   ?backdrop=paper|ink
//                                 ?welcome=0 (no welcome card)   ?manual=1 (no animation loop: only studio.step() advances the engine, for deterministic tests and frame strips)   ?fresh=1 (ignore saved settings)   ?set={"layout.dMaxPx":40} (any dials)
// Test hook: window.__studio = { engine, ui, renderer, tuning, kernel, host, director, narration, startTour(id), step(n, dtMs), ready, boot }.
import { createKernel } from './kernel/registry.mjs';
import { registerBuiltins } from './builtins.mjs';
import { createEngine } from './scene/engine.mjs';
import { createRenderer } from './render/canvas.mjs';
import { createStudioUI } from './ui/studio.mjs';
import { createPopupHost, tileObstacles } from './popups/host.mjs';
import { createPopupLayer } from './ui/popup-layer.mjs';
import { createNarration } from './ui/narration.mjs';
import { createDirector } from './tours/director.mjs';
import { createActions } from './tours/actions.mjs';
import { TOURS, viewReplayTour } from './tours/library.mjs';
import { STYLES, VARIANTS, DEFAULT_STYLE, applyStyle, styleOfSkin } from './styles/index.mjs';
import { SKINS } from './skins/index.mjs';
import { POPUPS } from './popups/index.mjs';
import { FX } from './fx/index.mjs';
import { measureTable, FONT_SPECS } from './layout/text.mjs';

const readJson = (id) => JSON.parse(document.getElementById(id).textContent);
const WELCOME_KEY = 'battle-studio.welcome.v1';

/** the fonts the page ships (Inter, Source Serif 4; base64 in the page): load them BEFORE the first measure, so the layout's text widths are the ones the canvas will draw */
const FONT_LOADS = ['600 12px Inter', '700 13px Inter', '400 13px Inter', '500 13px Inter', '600 18px "Source Serif 4"', '400 13px "Source Serif 4"', 'italic 400 12px "Source Serif 4"'];
async function loadFonts() { try { if (document.fonts && document.fonts.load) await Promise.all(FONT_LOADS.map((f) => document.fonts.load(f))); } catch { /* the stack falls back to the system fonts; widths are measured in whatever renders */ } }

export async function boot() {
  await loadFonts();
  const t0 = performance.now(); const phases = {}; const mark = (k) => { phases[k] = +(performance.now() - t0).toFixed(1); };
  const dataset = readJson('studio-dataset'); for (const sc of dataset.scenes) sc.name = sc.name.replace(/^Contact ([A-C])/, 'Fresh cluster $1');       // the data records no engagement: a cluster of fresh keyframes is not "contact"
   const tokens = readJson('studio-tokens'); const textTable = readJson('studio-text'); const popupData = readJson('studio-popups'); mark('parse');
  const q = new URLSearchParams(location.search);
  let storage = null; try { if (!q.has('fresh')) { storage = window.localStorage; storage.getItem('probe'); } } catch { storage = null; }

  const kernel = registerBuiltins(createKernel());
  for (const k of SKINS) kernel.skins.register(k.id, k);
  for (const k of POPUPS) kernel.popups.register(k.id, k);
  for (const k of FX) kernel.fx.register(k.id, k);
  for (const k of TOURS) kernel.tours.register(k.id, k);
  const app = document.getElementById('app'); const canvas = document.getElementById('map'); const popups = document.getElementById('popups'); const fadeCanvas = document.getElementById('map-fade'); const splash = document.getElementById('splash');
  const stage = document.getElementById('stage'); const rect = stage.getBoundingClientRect();           // the map is the stage: the band between the masthead and the dock, so no mark ever lies under the interface
  const mql = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  // start: a scene (default: the densest fresh-contact scene, paused) unless the URL says otherwise
  const scene = dataset.scenes.find((s) => s.id === q.get('scene')) || dataset.scenes.find((s) => s.id === 'fresh2') || dataset.scenes[0];
  const engine = createEngine({ autoQuality: true, dataset, tokens, textTable, storage, kernel, systemReduced: () => mql.matches, viewport: { w: rect.width, h: rect.height }, start: { tick: +(q.get('tick') || scene.tick), lat: scene.lat, lng: scene.lng, zoom: +(q.get('zoom') || scene.zoom) } });
  if (globalThis.__realBackdrop) globalThis.__realBackdrop.onchange = () => { engine.dirty = true; };      // the one line a host needs: redraw when a tile arrives
  const T = engine.tuning; mark('engine'); let nar = null; let director = null;                  // the narration and the tour director (created below; the safe-area code reads them)
  const trySet = (id, v) => { try { T.set(id, v); } catch (e) { console.warn('ignored URL setting', id, e.message); } };
  // the viewer's own style is remembered; a first visit gets the default style, and a visit always opens on the Studio ("after"), never on the reproduction
  const savedSkin = (() => { try { return storage && JSON.parse(storage.getItem('battle-studio.settings.v1') || '{}').tokens?.['skin.id']; } catch { return null; } })();
  if (!savedSkin && !q.has('skin')) applyStyle(engine, DEFAULT_STYLE);
  if (T.get('compare.mode') !== 'after') trySet('compare.mode', 'after');
  for (const [p, id] of [['skin', 'skin.id'], ['mode', 'motion.mode'], ['layout', 'layout.strategy'], ['vis', 'layout.visibility'], ['backdrop', 'backdrop.id'], ['compare', 'compare.mode']]) if (q.has(p)) trySet(id, q.get(p));
  if (q.has('style')) { try { applyStyle(engine, q.get('style'), q.get('variant') || 'standard'); } catch (e) { console.warn('ignored ?style', e.message); } }
  if (q.has('metrics')) trySet('metrics.overlay', q.get('metrics') !== '0');
  if (q.has('set')) { try { T.import({ format: 'battle-studio-settings/1', tokens: JSON.parse(q.get('set')) }); } catch (e) { console.warn('bad ?set', e.message); } }

  // text widths of THIS browser's fonts: the zero-overlap guarantee holds for the measured boxes
  const mctx = document.createElement('canvas').getContext('2d');
  const measure = () => { try { engine.setTextTable(measureTable(mctx, FONT_SPECS), 'measured in this browser'); } catch (e) { console.warn('text measuring failed; using the table measured in Chrome 155', e); } };
  measure(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure); mark('measure');

  const renderer = createRenderer({ canvas, engine, data: dataset });
  let updateSafeRef = () => {}; const ui = createStudioUI({ root: app, engine, data: dataset, onSafe: () => updateSafeRef() }); mark('ui');
  { const cr = document.getElementById('credit'); if (cr && globalThis.__realBackdrop) { const full = globalThis.__realBackdrop.caption(); cr.replaceChildren(); const a = document.createElement('span'); a.className = 'credit-full'; a.textContent = full; const b = document.createElement('span'); b.className = 'credit-short'; b.textContent = 'Modern ground: USGS NAIP aerial, 2022. Not the 1863 landscape.'; cr.append(a, b); } }       // what this ground is, on screen at all times
  // Escape ends a running tour before anything else acts on it (registered before the popup layer, whose own Escape handler would otherwise consume the key)
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && director && director.running) { e.preventDefault(); e.stopImmediatePropagation(); director.stop('closed'); } }, true);
  let layer = null; const sysReduced = () => mql.matches;
  const host = createPopupHost(engine, { popupData, size: { w: rect.width, h: rect.height }, systemReduced: sysReduced, chrome: () => (layer ? layer.chrome() : { rects: [], safe: { top: 0, right: 0, bottom: 0, left: 0 } }), measure: (c, f) => (layer ? layer.measure(c, f) : null), onSelect: (id) => { const t = id ? engine.frame && engine.frame.tiles.find((q) => q.ids[0] === id && q.kind === 'leaf') : null; ui.setSelection(t || null); } });
  layer = createPopupLayer({ root: app, container: popups, engine, host, systemReduced: sysReduced }); mark('popups');
  ui.onPreview = (id) => { host.preview(id); engine.dirty = true; }; if (q.has('tune')) ui.togglePanel('tune');
  if (q.has('speed')) engine.transport.setSpeed(+q.get('speed'));
  if (q.get('play') === '1') engine.transport.play();

  const updateSafe = () => { const r = app.getBoundingClientRect(); const panel = document.getElementById('panel'); const narrow = r.width < 760;
    engine.safe = { top: 0, bottom: 0, left: nar && nar.open && !narrow ? nar.width + 24 : 0, right: panel && !panel.classList.contains('hidden') && !narrow ? r.width - panel.getBoundingClientRect().left : 0 }; };
  updateSafeRef = updateSafe;
  let lastStageH = null;
  const resize = () => { const r = stage.getBoundingClientRect(); const dpr = window.devicePixelRatio || 1; if (lastStageH !== null && Math.abs(r.height - lastStageH) > 0.5 && engine.frame) engine.shiftView(0, (lastStageH - r.height) / 2); lastStageH = r.height;       // the dock grew or shrank: the ground stays where it is on screen
    renderer.resize(r.width, r.height, dpr); fadeCanvas.width = canvas.width; fadeCanvas.height = canvas.height; host.setSize(r.width, r.height); ui.drawMarks(); };
  { const dockEl = document.getElementById('dock'); const setDockH = () => { if (dockEl) app.style.setProperty('--dock-h', Math.ceil(dockEl.getBoundingClientRect().height) + 'px'); }; setDockH(); if (dockEl) new ResizeObserver(() => { setDockH(); }).observe(dockEl); }
  new ResizeObserver(() => { resize(); updateSafe(); }).observe(stage);

  // ---- the theme follows the ground (ink = dark chrome, paper = light chrome); a skin or ground change dissolves instead of cutting ----------------------------------------------------
  const syncTheme = () => { const bid = T.get('backdrop.id'); const be = engine.kernel.backdrops.has(bid) ? engine.kernel.backdrops.get(bid) : null; document.documentElement.dataset.theme = (be && be.theme ? be.theme === 'dark' : bid === 'ink') ? 'dark' : 'light'; ui.drawMarks(); if (layer) layer.applyStyle(); engine.dirty = true; };
  const dissolve = () => {
    if (mql.matches || q.get('manual') === '1' || !fadeCanvas.width || !engine.frame) return;
    try { const g = fadeCanvas.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, fadeCanvas.width, fadeCanvas.height); g.drawImage(canvas, 0, 0); fadeCanvas.style.transition = 'none'; fadeCanvas.style.opacity = '1'; void fadeCanvas.offsetWidth; fadeCanvas.style.transition = 'opacity 320ms cubic-bezier(.2,.72,.2,1)'; fadeCanvas.style.opacity = '0'; } catch { /* a dissolve is a nicety */ }
  };
  T.on('skin.id', () => { dissolve(); }); T.on('backdrop.id', () => { dissolve(); syncTheme(); }); T.on('compare.mode', () => { dissolve(); });
  syncTheme();
  resize(); updateSafe();
  if (!q.has('tick') || q.has('scene')) { engine.moveTo({ lat: scene.lat, lng: scene.lng, zoom: +(q.get('zoom') || scene.zoom) }, { glide: false, safe: true }); }
  mql.addEventListener?.('change', () => { engine.dirty = true; });

  // ---- tours: the director runs a script on the engine's own time; the narration shows its words ---------------------------------------------------------------------------------------
  const ctx = { engine, dataset, report: null };
  const hooks = { select: (id) => { host.setSelected(id); ui.setSelection(null); }, panel: (tab) => { if (!tab) { ui.panelOpen = false; ui.renderChrome(); } else if (!ui.panelOpen || ui.tab !== tab) ui.togglePanel(tab); }, metrics: () => {} };
  const act = createActions({ engine, hooks });
  nar = createNarration({ root: app, engine, onPrev: () => director.skip(-1), onNext: () => director.skip(1), onPause: () => { if (director.paused) director.resume(); else director.pause(); nar.setPaused(director.paused); },
    onClose: () => { if (director.running) director.stop('closed'); else nar.hide(); try { storage && storage.setItem(WELCOME_KEY, '1'); } catch { /* optional */ } }, onLayout: () => { document.body.classList.toggle('touring', nar.open); if (layer) layer.markChrome(); updateSafe(); } });
  director = createDirector({ act, ctx, onCaption: (c) => { if (c) nar.show(c); else nar.hide(); }, onProgress: (p) => nar.progress(p),
    onEnd: (by) => { nar.setPaused(false); nar.hide(); if (engine.compare !== 'after') T.set('compare.mode', 'after'); if (ctx.popupsWas !== undefined) { T.set('popup.enabled', ctx.popupsWas); ctx.popupsWas = undefined; } engine.transport.pause(); ctx.report = null; } });
  function startTour(id) {
    const tour = id === 'view-replay' ? viewReplayTour({ tick: engine.transport.simTau, lat: engine.camera.lat, lng: engine.camera.lng, zoom: engine.camera.zoom }) : kernel.tours.get(id);
    ui.closeMenu(); if (director.running) director.stop('replaced'); host.dismissAll(); updateSafe(); director.start(tour); nar.setPaused(false); return tour;
  }
  ui.onTour = (id) => startTour(id);
  const showWelcome = () => nar.welcome({ kicker: 'Battle Studio · prototype', title: 'Gettysburg, animated honestly.', text: `${dataset.provenance.counts.units.toLocaleString('en-US')} real units and ${dataset.provenance.counts.keyframes.toLocaleString('en-US')} hand-placed keyframes, drawn by a renderer that never lets a tile hide another. Watch the 60-second showcase, or press Space and explore. The ground is the real aerial photograph (USGS NAIP, 2022), read from the folder beside this page: nothing is requested from any other site.`,
    chips: [{ ev: 'Documented', text: 'identity: order of battle' }, { ev: 'Modelled', text: 'positions and clock' }], actions: [{ label: 'Watch the 60-second showcase', primary: true, run: () => startTour('showcase') }, { label: 'Explore', run: () => { nar.hide(); try { storage && storage.setItem(WELCOME_KEY, '1'); } catch { /* optional */ } } }] });
  let welcomed = false; try { welcomed = !!(storage && storage.getItem(WELCOME_KEY)); } catch { welcomed = false; }
  if (q.get('welcome') !== '0' && !welcomed && !q.has('tour') && !q.has('scene') && !q.has('tick') && q.get('play') !== '1') showWelcome();
  if (q.has('tour')) { try { startTour(q.get('tour')); } catch (e) { console.warn('ignored ?tour', e.message); } }

  // ---- input ------------------------------------------------------------------------------------------------------------------------------------
  const pointers = new Map(); let drag = null; let hoverKey = null; let pinch = null;
  const pos = (e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  canvas.addEventListener('pointerdown', (e) => {
    ui.closeMenu(); canvas.setPointerCapture(e.pointerId); pointers.set(e.pointerId, pos(e)); canvas.focus();
    if (pointers.size === 1) drag = { x: e.clientX, y: e.clientY, moved: 0, id: e.pointerId };
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: engine.camera.zoom }; drag = null; }
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = pos(e); const had = pointers.has(e.pointerId);
    if (had) pointers.set(e.pointerId, p);
    if (pinch && pointers.size === 2) { const [a, b] = [...pointers.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); engine.zoomTo(pinch.z + Math.log2(d / pinch.d), { at: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] }); return; }
    if (drag && e.pointerId === drag.id && (e.buttons & 1 || e.pointerType === 'touch')) {
      const dx = e.clientX - drag.x; const dy = e.clientY - drag.y; drag.moved += Math.abs(dx) + Math.abs(dy); drag.x = e.clientX; drag.y = e.clientY;
      if (drag.moved > 4) { canvas.classList.add('dragging'); engine.panBy(dx, dy); }
      return;
    }
    const t = engine.hit(p[0], p[1]); const k = t ? t.key : null; if (k !== hoverKey) { hoverKey = k; engine.dirty = true; engine.focus(t && t.kind === 'leaf' ? t.ids[0] : null); canvas.classList.toggle('over-tile', !!k); host.setHover(k ? { key: k, since: performance.now(), x: p[0], y: p[1] } : null); }
  });
  const end = (e) => {
    const was = drag; pointers.delete(e.pointerId); if (pointers.size < 2) pinch = null; canvas.classList.remove('dragging');
    if (was && e.pointerId === was.id && was.moved <= 4 && e.type === 'pointerup') {
      const p = pos(e); const t = engine.hit(p[0], p[1]);
      if (t && t.kind === 'leaf') { engine.select(t.ids[0]); host.setSelected(t.ids[0]); ui.setSelection(t); } else if (t) { engine.select(null); host.setSelected(null); ui.setSelection(t); } else { engine.select(null); host.setSelected(null); ui.setSelection(null); }
    }
    if (pointers.size === 0) drag = null;
  };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('pointerleave', () => { if (hoverKey) { hoverKey = null; engine.dirty = true; engine.focus(null); canvas.classList.remove('over-tile'); host.setHover(null); } });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); const p = pos(e); const k = e.ctrlKey ? 0.012 : (e.deltaMode === 1 ? 0.05 : 0.0016); const base = engine.tuning.get('camera.zoom'); engine.zoomTo(base - e.deltaY * k, { at: p }); }, { passive: false });
  canvas.tabIndex = 0;
  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement && e.target.type !== 'range' && e.target.type !== 'checkbox') return; if (e.target instanceof HTMLSelectElement) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const tr = engine.transport; const k = e.key;
    if (k === ' ' && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); tr.toggle(); }
    else if (k === 'ArrowRight' || k === 'ArrowLeft') { if (e.target instanceof HTMLInputElement) return; e.preventDefault(); tr.pause(); tr.seek(Math.round(tr.target ?? tr.simTau) + (k === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? 12 : 1), { ms: 100 }); }
    else if (k === ']' || k === '[') { const sp = [0.25, 0.5, 1, 2, 4, 8, 16]; const i = Math.max(0, Math.min(sp.length - 1, sp.indexOf(tr.speed) + (k === ']' ? 1 : -1))); tr.setSpeed(sp[i]); }
    else if (k === '+' || k === '=') engine.zoomTo(T.get('camera.zoom') + 0.5); else if (k === '-') engine.zoomTo(T.get('camera.zoom') - 0.5);
    else if (k === 't' || k === 'T') ui.togglePanel('tune'); else if (k === 'i' || k === 'I') ui.togglePanel('inspect'); else if (k === 'a' || k === 'A') ui.togglePanel('about'); else if (k === 'm' || k === 'M') T.set('metrics.overlay', !T.get('metrics.overlay'));
    else if (k === 'b' || k === 'B') ui.setCompare(engine.compare === 'before' ? 'after' : 'before');
    else if (k === 'w' || k === 'W') startTour('showcase');
    else if (k === 'Escape') { if (director.running) director.stop('closed'); else if (nar.open) nar.hide(); else { engine.select(null); host.setSelected(null); ui.setSelection(null); } }
  });

  // ---- loop ----------------------------------------------------------------------------------------------------------------------------------
  const manual = q.get('manual') === '1'; let last = 0; let idle = false; let frames = 0; let virtualNow = 1e6; let firstFrameMs = null;
  /** frames in which a visible popup card lay on a tile, a label or a pin (the director places cards on free ground; this re-checks the result from the drawn rectangles) */
  const cardStats = { frames: 0, withCards: 0, over: 0 };
  function checkCards(f, out) {
    let any = false; let over = false; let obs = null;
    for (const c of out.cards) {
      if (!c.rect || c.opacity < 0.5 || c.lane || c.hidden || c.kind === 'doc') continue; any = true; obs = obs || tileObstacles(f, { minOpacity: 0.5, hulls: false, leaders: false });
      const r = { x0: c.rect.x, y0: c.rect.y, x1: c.rect.x + c.rect.w, y1: c.rect.y + c.rect.h };
      for (const o of obs) if (o.x0 < r.x1 && o.x1 > r.x0 && o.y0 < r.y1 && o.y1 > r.y0) { over = true; break; }
      if (over) break;
    }
    cardStats.frames++; if (any) cardStats.withCards++; if (over) cardStats.over++; ui.cardsOverTiles = cardStats.over;
  }
  function frameOnce(dt, raw, now) {
    const f = engine.step(Math.min(dt, 100), { rawDtMs: raw });
    virtualNow += Math.min(dt, 100); const out = host.frame(f, virtualNow, Math.min(dt, 100)); layer.update(out, virtualNow); studio.lastOut = out;
    if (director.running) { director.update(Math.min(dt, 100)); } nar.update(now);
    renderer.draw(f, { hoverKey, popupFx: out.fx, mapRect: out.mapRect, toneColors: layer.toneColors() }); ui.update(f, now); checkCards(f, out); frames++;
    if (firstFrameMs === null) { firstFrameMs = performance.now() - t0; studio.boot.firstFrameMs = +firstFrameMs.toFixed(1); requestAnimationFrame(() => { splash.classList.add('gone'); document.body.classList.remove('booting'); setTimeout(() => splash.remove(), 700); }); }
    return f;
  }
  function tick(now) {
    const raw = last ? now - last : 16.667; last = now;
    if (firstFrameMs === null || (!manual && (engine.busy() || host.busy() || ui.scrubbing || director.running))) {
      const dt = idle ? 16.667 : raw; idle = false;                                 // time spent at rest is not a slow frame
      frameOnce(dt, dt, now);
    } else idle = true;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  const studio = {
    updateSafe, engine, ui, renderer, host, layer, popupData, tuning: T, kernel, director, narration: nar, ready: true, lastOut: null, cardStats, boot: { phases, firstFrameMs: null }, get frames() { return frames; },
    startTour, showWelcome,
    /** drive n frames synchronously (tests and screenshots): deterministic, no rAF */
    step(n = 1, dtMs = 1000 / 60) { let f = null; let out = null; for (let i = 0; i < n; i++) { f = engine.step(dtMs, { rawDtMs: dtMs }); virtualNow += dtMs; out = host.frame(f, virtualNow, dtMs); if (director.running) director.update(dtMs); } if (f) { layer.update(out, virtualNow); nar.update(performance.now() + 1e6); renderer.draw(f, { hoverKey, popupFx: out.fx, mapRect: out.mapRect, toneColors: layer.toneColors() }); ui.update(f, performance.now()); checkCards(f, out); } studio.lastOut = out; return f; },
  };
  window.__studio = studio;
  return studio;
}
boot();

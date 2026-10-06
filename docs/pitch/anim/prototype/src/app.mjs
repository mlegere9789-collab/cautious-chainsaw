// app.mjs - the browser entry: reads the inlined data, builds the engine, registers the REFERENCE skin, wires the canvas, the input and the Studio chrome, and runs the frame loop.
// Everything the page needs is inlined by build.mjs: there is no network request of any kind.
//
// URL parameters (all optional):  ?tune=1 open the Tuning Studio   ?metrics=1 metrics overlay   ?scene=<id>   ?tick=N   ?zoom=Z   ?speed=S   ?play=1
//                                 ?skin= ?mode= (motion) ?layout= ?vis= (carry|window|snapshot) ?fresh=1 (ignore saved settings)   ?set={"layout.dMaxPx":40} (any dials)
// Test hook: window.__studio = { engine, ui, renderer, tuning, kernel, step(n, dtMs), ready }.
import { createKernel } from './kernel/registry.mjs';
import { registerBuiltins } from './builtins.mjs';
import { createEngine } from './scene/engine.mjs';
import { createRenderer } from './render/canvas.mjs';
import { createStudioUI } from './ui/studio.mjs';
import { createPopupHost } from './popups/host.mjs';
import { createPopupLayer } from './ui/popup-layer.mjs';
import { referenceSkin } from './skins/reference.mjs';
import { measureTable, FONT_SPECS } from './layout/text.mjs';

const readJson = (id) => JSON.parse(document.getElementById(id).textContent);

export function boot() {
  const dataset = readJson('studio-dataset'); const tokens = readJson('studio-tokens'); const textTable = readJson('studio-text');
  const q = new URLSearchParams(location.search);
  let storage = null; try { if (!q.has('fresh')) { storage = window.localStorage; storage.getItem('probe'); } } catch { storage = null; }

  const kernel = registerBuiltins(createKernel());
  kernel.skins.register(referenceSkin.id, referenceSkin);
  const app = document.getElementById('app'); const canvas = document.getElementById('map'); const popups = document.getElementById('popups');
  const rect = app.getBoundingClientRect();
  const mql = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  // start: a scene (default: the densest fresh-contact scene, paused) unless the URL says otherwise
  const scene = dataset.scenes.find((s) => s.id === q.get('scene')) || dataset.scenes.find((s) => s.id === 'fresh2') || dataset.scenes[0];
  const engine = createEngine({ dataset, tokens, textTable, storage, kernel, systemReduced: () => mql.matches, viewport: { w: rect.width, h: rect.height }, start: { tick: +(q.get('tick') || scene.tick), lat: scene.lat, lng: scene.lng, zoom: +(q.get('zoom') || scene.zoom) } });
  const T = engine.tuning;
  const trySet = (id, v) => { try { T.set(id, v); } catch (e) { console.warn('ignored URL setting', id, e.message); } };
  for (const [p, id] of [['skin', 'skin.id'], ['mode', 'motion.mode'], ['layout', 'layout.strategy'], ['vis', 'layout.visibility'], ['backdrop', 'backdrop.id']]) if (q.has(p)) trySet(id, q.get(p));
  if (q.has('metrics')) trySet('metrics.overlay', q.get('metrics') !== '0');
  if (q.has('set')) { try { T.import({ format: 'battle-studio-settings/1', tokens: JSON.parse(q.get('set')) }); } catch (e) { console.warn('bad ?set', e.message); } }

  // text widths of THIS browser's fonts: the zero-overlap guarantee holds for the measured boxes
  const mctx = document.createElement('canvas').getContext('2d');
  const measure = () => { try { engine.setTextTable(measureTable(mctx, FONT_SPECS), 'measured in this browser'); } catch (e) { console.warn('text measuring failed; using the table measured in Chrome 155', e); } };
  measure(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

  const renderer = createRenderer({ canvas, engine, data: dataset });
  let updateSafeRef = () => {}; const ui = createStudioUI({ root: app, engine, data: dataset, onSafe: () => updateSafeRef() });
  const host = createPopupHost(engine); const layer = createPopupLayer(popups, engine, host);
  if (q.has('tune')) ui.togglePanel('tune');
  if (q.has('speed')) engine.transport.setSpeed(+q.get('speed'));
  if (q.get('play') === '1') engine.transport.play();

  const updateSafe = () => { const r = app.getBoundingClientRect(); const top = document.getElementById('topbar'); const dock = document.getElementById('dock'); const panel = document.getElementById('panel'); const narrow = r.width < 760;
    engine.safe = { top: top ? top.getBoundingClientRect().bottom : 0, bottom: dock ? r.height - dock.getBoundingClientRect().top : 0, left: 0, right: panel && !panel.classList.contains('hidden') && !narrow ? r.width - panel.getBoundingClientRect().left : 0 }; };
  updateSafeRef = updateSafe;
  const resize = () => { const r = app.getBoundingClientRect(); const dpr = window.devicePixelRatio || 1; renderer.resize(r.width, r.height, dpr); engine.setViewport(r.width, r.height); ui.drawMarks(); };
  new ResizeObserver(() => { resize(); updateSafe(); }).observe(app); resize(); updateSafe();
  if (!q.has('tick') || q.has('scene')) { engine.moveTo({ lat: scene.lat, lng: scene.lng, zoom: +(q.get('zoom') || scene.zoom) }, { glide: false, safe: true }); }
  mql.addEventListener?.('change', () => { engine.dirty = true; });

  // ---- input ------------------------------------------------------------------------------------------------------------------------------------
  const pointers = new Map(); let drag = null; let hoverKey = null; let pinch = null;
  const pos = (e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId); pointers.set(e.pointerId, pos(e)); canvas.focus();
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
    const t = engine.hit(p[0], p[1]); const k = t ? t.key : null; if (k !== hoverKey) { hoverKey = k; engine.dirty = true; canvas.classList.toggle('over-tile', !!k); }
  });
  const end = (e) => {
    const was = drag; pointers.delete(e.pointerId); if (pointers.size < 2) pinch = null; canvas.classList.remove('dragging');
    if (was && e.pointerId === was.id && was.moved <= 4 && e.type === 'pointerup') {
      const p = pos(e); const t = engine.hit(p[0], p[1]);
      if (t && t.kind === 'leaf') { engine.select(t.ids[0]); ui.setSelection(t); } else if (t) { engine.select(null); ui.setSelection(t); } else { engine.select(null); ui.setSelection(null); }
    }
    if (pointers.size === 0) drag = null;
  };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('pointerleave', () => { if (hoverKey) { hoverKey = null; engine.dirty = true; canvas.classList.remove('over-tile'); } });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); const p = pos(e); const k = e.ctrlKey ? 0.012 : (e.deltaMode === 1 ? 0.05 : 0.0016); const base = engine.tuning.get('camera.zoom'); engine.zoomTo(base - e.deltaY * k, { at: p }); }, { passive: false });
  canvas.tabIndex = 0;
  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement && e.target.type !== 'range' && e.target.type !== 'checkbox') return; if (e.target instanceof HTMLSelectElement) return;
    const tr = engine.transport; const k = e.key;
    if (k === ' ' && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); tr.toggle(); }
    else if (k === 'ArrowRight' || k === 'ArrowLeft') { if (e.target instanceof HTMLInputElement) return; e.preventDefault(); tr.pause(); tr.seek(Math.round(tr.target ?? tr.simTau) + (k === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? 12 : 1), { ms: 100 }); }
    else if (k === ']' || k === '[') { const sp = [0.25, 0.5, 1, 2, 4, 8, 16]; const i = Math.max(0, Math.min(sp.length - 1, sp.indexOf(tr.speed) + (k === ']' ? 1 : -1))); tr.setSpeed(sp[i]); }
    else if (k === '+' || k === '=') engine.zoomTo(T.get('camera.zoom') + 0.5); else if (k === '-') engine.zoomTo(T.get('camera.zoom') - 0.5);
    else if (k === 't' || k === 'T') ui.togglePanel('tune'); else if (k === 'i' || k === 'I') ui.togglePanel('inspect'); else if (k === 'a' || k === 'A') ui.togglePanel('about'); else if (k === 'm' || k === 'M') T.set('metrics.overlay', !T.get('metrics.overlay'));
    else if (k === 'Escape') { engine.select(null); ui.setSelection(null); }
  });

  // ---- loop ----------------------------------------------------------------------------------------------------------------------------------
  let last = 0; let idle = false; let frames = 0;
  function tick(now) {
    const raw = last ? now - last : 16.667; last = now;
    if (engine.busy() || ui.scrubbing) {
      const dt = idle ? 16.667 : raw; idle = false;                                 // time spent at rest is not a slow frame
      const f = engine.step(Math.min(dt, 100), { rawDtMs: dt });
      const leaders = layer.update(f, now, dt);
      renderer.draw(f, { hoverKey, popupLeaders: leaders }); ui.update(f, now); frames++;
    } else idle = true;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  const studio = {
    updateSafe, engine, ui, renderer, tuning: T, kernel, ready: true, get frames() { return frames; },
    /** drive n frames synchronously (tests and screenshots): deterministic, no rAF */
    step(n = 1, dtMs = 1000 / 60) { let f = null; for (let i = 0; i < n; i++) { f = engine.step(dtMs, { rawDtMs: dtMs }); } if (f) { renderer.draw(f, { hoverKey }); ui.update(f, performance.now()); } return f; },
  };
  window.__studio = studio;
  return studio;
}
boot();

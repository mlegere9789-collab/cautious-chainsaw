// The time dock: play/pause, speed, previous/next event, the scrubber with the day-and-night strip, event ticks and the epilogue chapter marker.
// The scrubber is a native range input (keyboard, touch and screen-reader support for free) laid over a canvas that draws the strip.
import { SPEEDS, TIER_STYLE } from '../config.mjs';
import { BATTLE, EPILOGUE, minOf, parts, fmtDate, fmtTime, fmtShort } from '../clock.mjs';

const $ = (r, s) => r.querySelector(s);
const RAMP = [[0, [9, 12, 30]], [.12, [22, 30, 62]], [.25, [40, 52, 96]], [.5, [112, 104, 84]], [.8, [176, 156, 112]], [1, [202, 180, 126]]];
function ramp(l) { l = Math.max(0, Math.min(1, l)); let i = 1; while (i < RAMP.length - 1 && RAMP[i][0] < l) i++; const [a, ca] = RAMP[i - 1], [b, cb] = RAMP[i], f = (l - a) / (b - a); return [0, 1, 2].map(k => Math.round(ca[k] + (cb[k] - ca[k]) * f)); }
export const speedLabel = v => (v < 1 ? v : Math.round(v * 100) / 100) + '×';

export function mountDock(th) {
  const sc = th.scope, root = th.root, st = th.state;
  const el = { play: $(root, '#bt-play'), prev: $(root, '#bt-prev'), next: $(root, '#bt-next'), slower: $(root, '#bt-slower'), faster: $(root, '#bt-faster'), speed: $(root, '#bt-speed'), readout: $(root, '#bt-readout'),
    chapter: $(root, '#bt-chapter'), strip: $(root, '#bt-strip'), slider: $(root, '#bt-slider'), scrub: $(root, '#bt-scrub') };
  th.els.dock = el;
  let scrubbing = false, stripCache = null;
  const range = () => st.chapter === 'epilogue' ? EPILOGUE : BATTLE;
  const paintPlay = () => { el.play.setAttribute('aria-label', st.playing ? 'Pause' : 'Play'); el.play.setAttribute('aria-pressed', String(st.playing)); el.play.querySelector('use').setAttribute('href', st.playing ? '#i-pause' : '#i-play'); };
  const paintSpeed = () => { el.speed.textContent = speedLabel(st.speed); el.slower.disabled = st.speed <= SPEEDS[0]; el.faster.disabled = st.speed >= SPEEDS[SPEEDS.length - 1]; };
  sc.on(el.play, 'click', () => th.setPlaying(!st.playing));
  sc.on(el.prev, 'click', () => { const e = th.nextEvent(-1); if (e) th.jumpEvent(e); });
  sc.on(el.next, 'click', () => { const e = th.nextEvent(1); if (e) th.jumpEvent(e); });
  const stepSpeed = d => { let i = SPEEDS.indexOf(st.speed); if (i < 0) i = SPEEDS.findIndex(v => v >= st.speed); const j = Math.max(0, Math.min(SPEEDS.length - 1, i + d)); th.setSpeed(SPEEDS[j]); th.announce('Speed ' + speedLabel(SPEEDS[j])); };
  sc.on(el.slower, 'click', () => stepSpeed(-1)); sc.on(el.faster, 'click', () => stepSpeed(1)); th.bus.on('speed-step', stepSpeed, sc);
  th.bus.on('play', paintPlay, sc); th.bus.on('speed', paintSpeed, sc); paintPlay(); paintSpeed();

  // ---- slider
  function configure() {
    const r = range(); el.slider.min = String(r.from); el.slider.max = String(r.to - 1); el.slider.step = '1'; el.slider.setAttribute('aria-label', st.chapter === 'epilogue' ? 'Time, 18 to 19 November 1863' : 'Time, 26 June to 14 July 1863');
    sync(true); paintChapter(); drawStrip(true);
  }
  function sync(force) { if (scrubbing && !force) return; const v = Math.floor(st.t); if (+el.slider.value !== v) el.slider.value = String(v); const txt = `${fmtDate(st.t)} ${fmtTime(st.t)}`; if (el.slider.getAttribute('aria-valuetext') !== txt) el.slider.setAttribute('aria-valuetext', txt); }
  sc.on(el.slider, 'pointerdown', () => { scrubbing = true; });
  const endScrub = () => { if (scrubbing) { scrubbing = false; th.needFx = true; } };
  sc.on(window, 'pointerup', endScrub); sc.on(window, 'pointercancel', endScrub);
  sc.on(el.slider, 'input', () => { const v = +el.slider.value; if (st.event) { st.event = null; drawStrip(true); } th.setTime(v, { replay: !scrubbing }); });
  th.bus.on('tick', () => sync(false), sc); th.bus.on('time', () => { sync(false); lastEv(); }, sc);

  // ---- chapter button (4 July night -> 19 November 1863)
  function paintChapter() {
    const b = el.chapter; b.hidden = false;
    if (st.chapter === 'epilogue') { b.textContent = '◂ The campaign and battle'; b.setAttribute('aria-label', 'Back to the campaign and battle, 26 June to 14 July 1863'); }
    else { b.textContent = 'Epilogue · 19 Nov 1863 ▸'; b.setAttribute('aria-label', 'Go to the epilogue chapter, 19 November 1863'); }
  }
  sc.on(el.chapter, 'click', () => {
    if (st.chapter === 'epilogue') { th.setTime(minOf(7, 4, 21), { chapter: 'battle', say: 'Back to the night of 4 July 1863.' }); }
    else th.setTime(EPILOGUE.entry, { chapter: 'epilogue', say: 'Epilogue, 19 November 1863. The timeline file records no time of day for it, so the chapter opens at midnight local mean time.' });
    configure();
  });

  // ---- last event readout
  let lastId = null;
  function lastEv() {
    const L = th.timed, t = st.t; if (st.chapter === 'epilogue') { if (lastId !== 'epi') { lastId = 'epi'; el.readout.textContent = 'Epilogue: the timeline file lists no events for November 1863'; } return; }
    let lo = 0, hi = L.length; while (lo < hi) { const m = (lo + hi) >> 1; if (L[m].t <= t) lo = m + 1; else hi = m; } const e = L[lo - 1];
    const id = e ? e.id : 'none'; if (id === lastId) return; lastId = id;
    el.readout.textContent = e ? `Latest event: ${fmtShort(e.t)} · ${e.label.slice(0, 54)}${e.label.length > 54 ? '…' : ''}` : 'No timeline event yet';
  }

  // ---- strip: day and night shading, day lines, event ticks, moon, chapter marker
  function drawStrip(rebuild) {
    const cv = el.strip, r = el.scrub.getBoundingClientRect(); const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = Math.max(2, Math.round(r.width)), H = Math.max(2, Math.round(r.height)); if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); rebuild = true; }
    const rg = range(); const key = `${st.chapter}|${W}`;
    if (!stripCache || stripCache.key !== key) { stripCache = { key, lum: th.env.strip(rg.from, rg.to, W), moon: new Float32Array(W) }; const s = {}; for (let i = 0; i < W; i++) { th.env.sample(rg.from + (rg.to - rg.from) * (i + .5) / W, s); stripCache.moon[i] = s.moonUp ? s.moonIllum / 100 : 0; } }
    const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
    const { lum, moon } = stripCache; for (let x = 0; x < W; x++) { const [a, b, d] = ramp(lum[x]); c.fillStyle = `rgb(${a},${b},${d})`; c.fillRect(x, 0, 1, H); }
    c.fillStyle = 'rgba(8,8,16,.38)'; c.fillRect(0, 0, W, 16);
    // moon line
    for (let x = 0; x < W; x++) if (moon[x] > 0) { c.fillStyle = `rgba(235,240,255,${.25 + .6 * moon[x]})`; c.fillRect(x, H - 3, 1, 3); }
    // day lines and labels
    const span = rg.to - rg.from, X = m => (m - rg.from) / span * W; c.font = '600 10.5px system-ui, sans-serif'; c.textBaseline = 'middle';
    const days = Math.round(span / 1440), every = W / days > 44 ? 1 : W / days > 22 ? 2 : W / days > 14 ? 3 : 7;
    for (let d = 0; d <= days; d++) { const m = rg.from + d * 1440, x = X(m); if (d > 0 && d < days) { c.fillStyle = 'rgba(255,255,255,.22)'; c.fillRect(Math.round(x), 0, 1, H); } if (d < days && d % every === 0) { const p = parts(m); c.fillStyle = '#ecebe6'; c.fillText(p.dom === 1 || d === 0 ? `${p.dom} ${p.mon}` : String(p.dom), x + 4, 8); } }
    const eb = eventBand(); if (eb && st.chapter === 'battle') { c.fillStyle = 'rgba(232,213,163,.30)'; c.fillRect(X(eb.earliest), 16, Math.max(2, X(eb.latest) - X(eb.earliest)), H - 16); }
    // event ticks
    if (st.chapter === 'battle') {
      for (const e of th.timed) { const S = TIER_STYLE[e.tier]; c.fillStyle = S.color; c.globalAlpha = .85; c.fillRect(Math.round(X(e.t)), H - 16, 1, 11); } c.globalAlpha = 1;
      // chapter marker at 4 July night
      const cm = X(minOf(7, 4, 21)); c.strokeStyle = '#e8d5a3'; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(cm, 16); c.lineTo(cm, H); c.stroke(); c.setLineDash([]);
      c.fillStyle = '#e8d5a3'; c.beginPath(); c.moveTo(cm, H - 4); c.lineTo(cm + 5, H - 10); c.lineTo(cm - 5, H - 10); c.closePath(); c.fill();
      if (W > 560) { const lab = 'Epilogue chapter ▸ 19 Nov'; c.fillStyle = '#e8d5a3'; c.fillText(lab, Math.min(cm + 8, W - c.measureText(lab).width - 6), 26); }
    }
  }
  const eventBand = () => { const e = st.event; return e && e.earliest != null && e.latest != null && e.latest > e.earliest ? e : null; };
  th.bus.on('event', () => { drawStrip(true); }, sc);
  th.bus.on('resize', () => drawStrip(true), sc); th.bus.on('scenario', () => {}, sc);
  configure(); lastEv();
  th.configureDock = configure;
}

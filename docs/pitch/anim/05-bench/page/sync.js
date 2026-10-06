// Does an overlay canvas that projects with map.project() stay glued to the map while the map moves?
//   mode=raf     the overlay is drawn from its own requestAnimationFrame loop (what the app does: the loop re-arms itself at the end of its callback)
//   mode=rafpre  same loop, but armed BEFORE the map is created, so it runs before Mapbox's frame callback in every frame
//   mode=render  the overlay is drawn inside map.on('render') and the map is kept repainting with triggerRepaint (frame-synced)
// For every browser frame we compare where the overlay drew a reference point with where the map's own draw put it (px).
import { loadScene, Timeline } from '/page/lib.js';
const q = new URLSearchParams(location.search), mode = q.get('mode') || 'raf', SEC = +(q.get('sec') || 8), SPEED = +(q.get('speed') || 667);   // px per second
mapboxgl.accessToken = 'pk.' + btoa('{"u":"bench","a":"bench"}') + '.bench';
const W = 1440, H = 852, dpr = window.devicePixelRatio || 1;

async function main() {
  const sc = await loadScene(462), tl = new Timeline(sc); tl.stateAt(600);
  const cv = document.createElement('canvas'); cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px'; document.getElementById('host').appendChild(cv);
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const ref = [tl.lng[tl.alive[0]], tl.lat[tl.alive[0]]];
  const S = { overlayX: null, mapX: null, mism: [], frames: 0, mapRenders: 0, overlayDraws: 0 };
  const draw = () => {                                                             // light fixed cost: 462 projections + 462 small rects
    g.clearRect(0, 0, W, H); let rx = 0;
    for (let j = 0; j < tl.nAlive; j++) { const i = tl.alive[j], p = map.project([tl.lng[i], tl.lat[i]]); g.fillStyle = tl.side[i] ? '#c43a3a' : '#3a6bc4'; g.fillRect(p.x - 4, p.y - 3, 8, 6); if (j === 0) rx = p.x; }
    S.overlayX = rx; S.overlayDraws++;
  };
  let map = null, pre = null;
  if (mode === 'rafpre') { const loop = () => { if (map) draw(); pre = requestAnimationFrame(loop); }; pre = requestAnimationFrame(loop); }
  map = new mapboxgl.Map({ container: 'm', center: [-77.2373, 39.812], zoom: 13, interactive: false, attributionControl: false, fadeDuration: 0, trackResize: false, antialias: false,
    style: { version: 8, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#2b3a2b' } }] } });
  await new Promise((r) => map.once('load', r));
  map.on('render', () => { S.mapX = map.project(ref).x; S.mapRenders++; if (mode === 'render') { draw(); if (running) map.triggerRepaint(); } });
  let running = true, t0 = null;
  const total = SPEED * SEC;
  map.panBy([total, 0], { duration: SEC * 1000, easing: (t) => t, animate: true });          // linear pan, SPEED px/s
  const compare = () => { if (S.frames > 20 && S.overlayX != null && S.mapX != null) S.mism.push(S.overlayX - S.mapX); };   // end-of-frame state = what was composited
  const tick = (now) => {
    if (t0 === null) t0 = now;
    if (mode === 'raf') draw();                                                    // armed after the map started animating: runs after Mapbox's frame callback
    S.frames++; setTimeout(compare, 0);
    if (now - t0 < SEC * 1000) requestAnimationFrame(tick); else finish();
  };
  function finish() {
    running = false; cancelAnimationFrame(pre);
    const a = S.mism.map(Math.abs).sort((x, y) => x - y), n = a.length, mean = a.reduce((x, y) => x + y, 0) / n;
    window.__result = { mode, speedPxPerS: SPEED, samples: n, absMismatchPx: { mean: +mean.toFixed(2), p50: +a[Math.floor(n * .5)].toFixed(2), p95: +a[Math.floor(n * .95)].toFixed(2), max: +a[n - 1].toFixed(2) },
      shareFramesOver1px: +(a.filter((x) => x > 1).length / n).toFixed(3), mapRenders: S.mapRenders, overlayDraws: S.overlayDraws, frames: S.frames, pxPerFrameAtSpeed: +(SPEED / 60).toFixed(2) };
    window.__phase = 'done';
  }
  window.__phase = 'measure';
  requestAnimationFrame(tick);
}
main().catch((e) => { window.__error = String(e && e.stack || e); window.__phase = 'error'; });

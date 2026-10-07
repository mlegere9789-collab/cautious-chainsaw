// render/backdrops.mjs - the SCHEMATIC ground the tiles are drawn on.  Mapbox tiles are token-restricted, so the Studio does not draw terrain: it draws a metric grid, a scale bar and the
// named places of terrain.json.  Nothing here is relief; no elevation is interpolated; the caption in the corner says so.
//
// Place marks use the LEGACY terrain frame, the frame the placements were authored in (03-data-fuel.md fact 11): production terrain.json moved 8 of the 30 places by 166-733 m
// (computed in data/build-dataset.mjs, stored in the dataset).  Those 8 are drawn with a dashed mark; which frame is right is UNKNOWN here.  Marks are orientation, not a claim that a
// unit "is at" a place.
//
// A backdrop = { id, label, draw(c, view, data, tok) }.  view = { w, h, camera, mpp, toScreen(lng, lat) }.
import { project } from '../geo/project.mjs';

const PALETTES = {
  paper: { bg: '#ebe6da', minor: 'rgba(90,76,50,0.09)', major: 'rgba(90,76,50,0.17)', ink: '#5b5748', halo: 'rgba(235,230,218,0.92)', mark: '#6a6554', caption: 'rgba(60,54,40,0.62)', vignette: 'rgba(92,76,44,0.16)', glow: 'rgba(255,252,243,0.55)' },
  ink: { bg: '#14181d', minor: 'rgba(255,255,255,0.05)', major: 'rgba(255,255,255,0.10)', ink: '#a4adb7', halo: 'rgba(20,24,29,0.88)', mark: '#8e98a3', caption: 'rgba(200,208,216,0.6)', vignette: 'rgba(0,0,0,0.42)', glow: 'rgba(70,96,128,0.10)' },
};

function niceScale(mpp, targetPx = 110) {                    // a round length (m) whose bar is near targetPx wide
  const raw = targetPx * mpp; const pow = 10 ** Math.floor(Math.log10(raw)); const f = raw / pow;
  const nice = f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10; return nice * pow;
}

function drawBackdrop(pal, c, view, data, tok) {
  const { w, h, camera } = view; const mpp = view.mpp;
  c.fillStyle = pal.bg; c.fillRect(0, 0, w, h);
  // depth: a soft light in the middle of the map and a vignette at the edges, so the ground sits behind the tiles (drawn first, under the grid; two gradient fills per frame)
  { const g = c.createRadialGradient(w * 0.5, h * 0.46, 0, w * 0.5, h * 0.46, Math.hypot(w, h) * 0.62); g.addColorStop(0, pal.glow); g.addColorStop(0.55, 'rgba(0,0,0,0)'); g.addColorStop(1, pal.vignette); c.fillStyle = g; c.fillRect(0, 0, w, h); }
  // metric grid, anchored on a fixed world point so it does not swim while the camera moves
  const gridM = tok('backdrop.gridM'); const step = gridM / mpp;
  if (step >= 14) {
    const o = camera.origin(); const a0 = project(-77.2377, 39.8206, camera.zoom);
    const kx0 = Math.floor((o[0] - a0[0]) / step); const ky0 = Math.floor((o[1] - a0[1]) / step);
    c.lineWidth = 1;
    for (let k = kx0; ; k++) { const x = Math.round(a0[0] + k * step - o[0]) + 0.5; if (x > w) break; c.strokeStyle = k % 5 === 0 ? pal.major : pal.minor; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
    for (let k = ky0; ; k++) { const y = Math.round(a0[1] + k * step - o[1]) + 0.5; if (y > h) break; c.strokeStyle = k % 5 === 0 ? pal.major : pal.minor; c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
  }
  if (tok('backdrop.places') && data.terrain) {
    c.textBaseline = 'middle'; c.textAlign = 'left'; c.font = '600 10px "Segoe UI", system-ui, sans-serif'; c.lineJoin = 'round';
    const showMinor = camera.zoom >= 14.5; const disputed = new Set(data.terrain.disputed);
    const mark = (lng, lat, name, dashed, minor) => {
      const [x, y] = view.toScreen(lng, lat); if (x < -60 || x > w + 160 || y < -20 || y > h + 20) return;
      c.strokeStyle = pal.mark; c.lineWidth = 1.2; c.setLineDash(dashed ? [2, 2] : []);
      c.beginPath(); if (minor) c.rect(x - 2.5, y - 2.5, 5, 5); else { c.moveTo(x, y - 4.5); c.lineTo(x + 4.5, y); c.lineTo(x, y + 4.5); c.lineTo(x - 4.5, y); c.closePath(); } c.stroke(); c.setLineDash([]);
      c.lineWidth = 3; c.strokeStyle = pal.halo; c.strokeText(name, x + 8, y); c.fillStyle = pal.ink; c.fillText(name, x + 8, y);
    };
    for (const l of data.terrain.locations) mark(l.lng, l.lat, l.displayName || l.name, disputed.has(l.id), false);
    if (showMinor) { for (const f of data.terrain.features) mark(f.lng, f.lat, f.name, false, true); for (const s of data.terrain.structures) mark(s.lng, s.lat, s.name, false, true); }
  }
  // scale bar and caption
  const len = niceScale(mpp); const px = len / mpp; const x0 = 16; const y0 = h - 50;
  c.strokeStyle = pal.ink; c.lineWidth = 2; c.beginPath(); c.moveTo(x0, y0 - 4); c.lineTo(x0, y0); c.lineTo(x0 + px, y0); c.lineTo(x0 + px, y0 - 4); c.stroke();
  c.fillStyle = pal.ink; c.font = '600 11px "Segoe UI", system-ui, sans-serif'; c.textAlign = 'left'; c.textBaseline = 'bottom'; c.fillText(len >= 1000 ? (len / 1000) + ' km' : len + ' m', x0 + px + 8, y0 + 4);
  c.fillStyle = pal.caption; c.font = '10px "Segoe UI", system-ui, sans-serif'; c.textBaseline = 'alphabetic';
  c.fillText('Schematic backdrop: metric grid and place marks,', x0, h - 26); c.fillText('not terrain. Marks follow the placement frame.', x0, h - 14);
}

export const BACKDROPS = [
  { id: 'paper', label: 'Paper (light)', doc: 'Warm paper, metric grid, place marks, scale bar.', draw: (c, view, data, tok) => drawBackdrop(PALETTES.paper, c, view, data, tok) },
  { id: 'ink', label: 'Ink (dark)', doc: 'The same schematic on a dark ground, to test a skin on both.', draw: (c, view, data, tok) => drawBackdrop(PALETTES.ink, c, view, data, tok) },
];

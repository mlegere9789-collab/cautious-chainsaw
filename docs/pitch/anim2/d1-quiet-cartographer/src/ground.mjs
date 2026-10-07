// ground.mjs - the REAL ground under the Quiet Cartographer: the basemap job's backdrop (docs/pitch/anim2/basemap: USGS NAIP aerial, 3DEP hillshade and contours, Census TIGER roads and streams,
// the site's place marks; public domain; no network at run time) wrapped into the Studio's backdrop registry as two grounds that match the skin's two palettes:
//   qc-night  slate relief, near-monochrome blue-grey, the quietest ground for saturated marks     (theme 'dark')
//   qc-day    a pale atlas sheet: the aerial ghosted into cool paper, soft warm-lit relief         (theme 'light')
// The tile files are NOT copied into this folder: the page loads them from ../basemap/assets/ (or from ?tiles=<folder>), as the basemap's own demo does.
//
// Honesty: the photograph is MODERN (24 April to 10 May 2022, leaf-off), not the 1863 landscape; the caption below says so on every frame.  The units were placed by hand in the site's legacy terrain
// frame, so the place marks are drawn in that frame too (placeFrame 'legacy'): a mark and the units placed "at" it agree with each other, and the backdrop's dashed rings show where the aerial
// disagrees with that frame (up to 731 m at Culp's Hill, basemap README 7.3).
import { createBackdrop } from '../../basemap/src/backdrop.mjs';
import { LOOKS, registerLook } from '../../basemap/src/looks.mjs';
import { MANIFEST } from '../../basemap/data/manifest.mjs';
import { VECTORS } from '../../basemap/data/vectors.mjs';

const FACE = '"QC Sans", "Liberation Sans", Arial, sans-serif';
const place = (c) => ({ ...c, font: `400 11px ${FACE}`, placeFont: `italic 400 11px ${FACE}`, roadFont: `400 11px ${FACE}` });

/** the two grounds as looks (data: nothing here draws; the basemap's loader grades and paints them) */
export function makeLooks() {
  const night = registerLook({
    ...LOOKS.slate, id: 'qc-night', label: 'Night survey', theme: 'dark',
    doc: 'Slate relief: the NAIP aerial in near-monochrome blue-grey with 3DEP hillshade, quiet contours and streams.',
    labels: { ...place(LOOKS.slate.labels), place: 'rgba(214,224,236,0.78)', placeHalo: 'rgba(6,9,12,0.8)', road: 'rgba(196,208,222,0.62)', roadHalo: 'rgba(6,9,12,0.7)', water: 'rgba(124,168,210,0.8)', dot: 'rgba(214,224,236,0.8)', dotRing: 'rgba(6,9,12,0.6)', tracking: 0.3 },
  });
  const day = registerLook({
    ...LOOKS.paper, id: 'qc-day', label: 'Day atlas', theme: 'light', ground: '#e6e7e3',
    doc: 'A pale atlas sheet: the aerial ghosted into cool grey paper, soft relief lit from the north-west, thin contours and blue water.',
    grade: [
      { op: 'saturation', color: '#808080', alpha: 0.86 },
      { self: 'overlay', alpha: 0.42 },
      { op: 'screen', color: '#8d918e', alpha: 1 },
      { op: 'multiply', color: '#e6e8e3', alpha: 1 },
      { op: 'soft-light', color: '#9aa7b2', alpha: 0.22 },
    ],
    shade: { op: 'soft-light', alpha: 1, invert: true },
    vignette: { color: '#4d5359', alpha: 0.12, inner: 0.62 },
    contours: { color: '#5b6672', minor: { alpha: [[14.8, 0], [16, 0.16]], width: 0.5 }, major: { alpha: [[13.4, 0.1], [15, 0.32]], width: [[13.4, 0.6], [16, 0.9]] } },
    water: { fill: 'rgba(120,160,190,0.55)', line: [[13, 0.9], [16, 1.6]], lineColor: 'rgba(70,122,162,0.9)', lineAlpha: [[13, 0.8], [16, 1]] },
    roads: { ...LOOKS.paper.roads, casing: { color: 'rgba(96,104,112,0.5)', extra: 1.4 }, primary: { color: 'rgba(252,252,250,0.95)', width: [[13, 1.3], [16, 3.4], [18, 6]] }, secondary: { color: 'rgba(252,252,250,0.9)', width: [[13, 1.0], [16, 2.6], [18, 5]] }, local: { color: 'rgba(252,252,250,0.8)', width: [[14, 0.5], [16, 1.6], [18, 3.2]], minZoom: 13.4 }, rail: { color: 'rgba(78,88,98,0.6)', width: [[13, 1], [16, 1.8]], tick: true } },
    labels: { ...place(LOOKS.paper.labels), place: '#3d4a57', placeHalo: 'rgba(238,240,236,0.92)', road: 'rgba(72,84,96,0.82)', roadHalo: 'rgba(238,240,236,0.88)', water: 'rgba(46,92,130,0.92)', dot: '#3d4a57', dotRing: 'rgba(238,240,236,0.9)', tracking: 0.3 },
  });
  return { night, day };
}

/** the shared instance and the registry entries.  base = folder of tile files, relative to the page. */
export function createGround({ base = '../basemap/assets/', onActive = null } = {}) {
  const looks = makeLooks();
  const backdrop = createBackdrop({ manifest: MANIFEST, vectors: VECTORS, base });
  backdrop.prefetch(14);
  const entry = (look) => ({
    id: look.id, label: look.label, doc: look.doc, theme: look.theme, caption: MANIFEST.caption, attribution: MANIFEST.attribution, look,
    draw: (c, view, data, tok) => {
      const r = backdrop.draw(c, view.camera, look, { places: false, placeFrame: 'legacy', labels: true, fade: !globalThis.__qcManual });      // the place names are set by render/places.mjs, around the marks
      if (r && (r.animating || r.pending) && onActive) onActive();
      drawCaption(c, view, look);
    },
  });
  return { backdrop, looks, entries: [entry(looks.night), entry(looks.day)], caption: MANIFEST.caption, places: VECTORS.places };
}

function niceLen(mpp, target) { const raw = target * mpp; const p = 10 ** Math.floor(Math.log10(raw)); const f = raw / p; return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * p; }
/** a scale bar and the one-line caption, in the page's own type, bottom-left, above the dock's footprint on a phone.  Drawn after the ground, under the tiles. */
function drawCaption(c, view, look) {
  const L = look.labels; const mpp = view.mpp; const len = niceLen(mpp, 88); const px = len / mpp; const x = 16; const y = view.h - 78;
  if (view.w < 520) return;
  c.save(); c.lineCap = 'butt'; c.lineJoin = 'round'; c.textAlign = 'left';
  c.beginPath(); c.moveTo(x, y - 4); c.lineTo(x, y); c.lineTo(x + px, y); c.lineTo(x + px, y - 4); c.strokeStyle = L.placeHalo; c.lineWidth = 3.4; c.stroke(); c.strokeStyle = L.place; c.lineWidth = 1.2; c.stroke();
  c.font = `400 11px ${FACE}`; c.textBaseline = 'alphabetic'; const t = len >= 1000 ? len / 1000 + ' km' : len + ' m';
  c.lineWidth = 3; c.strokeStyle = L.placeHalo; c.strokeText(t, x + px + 7, y + 0.5); c.fillStyle = L.place; c.fillText(t, x + px + 7, y + 0.5);
  c.restore();
}

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

const FACE = '"QC Sans", "Source Sans 3", Arial, sans-serif';
const place = (c) => ({ ...c, font: `400 12px ${FACE}`, placeFont: `400 12px ${FACE}`, roadFont: `400 12px ${FACE}` });      // places upright (a place is not a unit with no record: that is italic), streams italic (the basemap's own rule)

/** the two grounds as looks (data: nothing here draws; the basemap's loader grades and paints them) */
export function makeLooks() {
  const night = registerLook({
    ...LOOKS.slate, id: 'qc-night', label: 'Night', theme: 'dark',
    doc: 'Slate relief: the NAIP aerial in near-monochrome blue-grey with 3DEP hillshade, quiet contours and streams.',
    labels: { ...place(LOOKS.slate.labels), place: '#e8eef6', placeHalo: 'rgba(6,9,12,0.92)', road: '#dde5ef', roadHalo: 'rgba(6,9,12,0.9)', water: '#9fc6ee', dot: '#e8eef6', dotRing: 'rgba(6,9,12,0.85)', tracking: 0.3 },
  });
  let ovr = {}; try { const raw = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('lookday') : null; if (raw) ovr = JSON.parse(raw); } catch { ovr = {}; }      // EXPERIMENT: ?lookday={...} merges into the day look
  const day = registerLook({
    ...LOOKS.paper, id: 'qc-day', label: 'Day', theme: 'light', ground: '#efebe1',
    doc: 'A pale atlas sheet in the Swiss manner: the aerial ghosted into ivory paper, relief lit from the north-west with cool grey-blue shadows, thin brown contours, blue water.',
    grade: [
      { op: 'saturation', color: '#808080', alpha: 1 },
      { self: 'overlay', alpha: 0.4 },
      { op: 'screen', color: '#88847b', alpha: 1 },
      { op: 'multiply', color: '#f6f0e4', alpha: 1 },
      { op: 'soft-light', color: '#7a93b4', alpha: 0.36 },
    ],
    shade: { op: 'soft-light', alpha: 1, invert: true },
    vignette: { color: '#55524a', alpha: 0.1, inner: 0.62 },
    contours: { color: '#74695a', minor: { alpha: [[14.8, 0], [16, 0.16]], width: 0.5 }, major: { alpha: [[13.4, 0.1], [15, 0.32]], width: [[13.4, 0.6], [16, 0.9]] } },
    water: { fill: 'rgba(120,160,190,0.55)', line: [[13, 0.9], [16, 1.6]], lineColor: 'rgba(70,122,162,0.9)', lineAlpha: [[13, 0.8], [16, 1]] },
    roads: { ...LOOKS.paper.roads, casing: { color: 'rgba(100,96,88,0.5)', extra: 1.4 }, primary: { color: 'rgba(253,252,248,0.96)', width: [[13, 1.3], [16, 3.4], [18, 6]] }, secondary: { color: 'rgba(253,252,248,0.92)', width: [[13, 1.0], [16, 2.6], [18, 5]] }, local: { color: 'rgba(253,252,248,0.82)', width: [[14, 0.5], [16, 1.6], [18, 3.2]], minZoom: 13.4 }, rail: { color: 'rgba(78,84,92,0.6)', width: [[13, 1], [16, 1.8]], tick: true } },
    labels: { ...place(LOOKS.paper.labels), place: '#332e26', placeHalo: 'rgba(250,247,240,0.96)', road: '#2c3239', roadHalo: 'rgba(250,247,240,0.96)', water: '#1d4f7c', dot: '#332e26', dotRing: 'rgba(250,247,240,0.95)', tracking: 0.3 },
    ...ovr,
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
      const r = backdrop.draw(c, view.camera, look, { places: false, placeFrame: 'legacy', labels: false, fade: !globalThis.__qcManual });      // the place names are set by render/places.mjs, around the marks
      if (r && (r.animating || r.pending) && onActive) onActive();
    },
  });
  return { backdrop, looks, entries: [entry(looks.night), entry(looks.day)], caption: MANIFEST.caption, places: VECTORS.places, vectors: backdrop.vectors };
}


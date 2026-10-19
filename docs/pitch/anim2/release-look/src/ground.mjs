// ground.mjs - the REAL ground under the Quiet Cartographer: the basemap job's backdrop (docs/pitch/anim2/basemap: USGS NAIP aerial, 3DEP hillshade and contours, Census TIGER roads and streams,
// the site's place marks; public domain; no network at run time) wrapped into the Studio's backdrop registry as two grounds that match the skin's two palettes:
//   look-a  Field   : the aerial under one warm muted grade (theme 'dark')      look-b  Survey : the aerial ghosted into cool white paper (theme 'light')
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

/** the two grounds of the two options, as looks (data: nothing here draws; the basemap's loader grades and paints them)
 *   look-a  "Field": the real aerial under ONE grade (a muted, warm, slightly hazy terrain with soft relief, darker toward the edges and cooler toward the far top), the ground of the planted standards
 *   look-b  "Survey": the aerial ghosted into cool white paper, crisp relief, thin contours: the ground of the editorial glyphs */
export function makeLooks() {
  const parse = (k) => { try { const raw = typeof location !== 'undefined' ? new URLSearchParams(location.search).get(k) : null; return raw ? JSON.parse(raw) : {}; } catch { return {}; } };      // EXPERIMENT: ?lookA={...} and ?lookB={...} merge into the look
  const a = registerLook({
    ...LOOKS.natural, id: 'look-a', label: 'Field', theme: 'dark', ground: '#1b1a16',
    doc: 'The real aerial under one warm, muted grade with soft relief, a little haze and a vignette: terrain a standard can be planted in.',
    grade: [
      { op: 'saturation', color: '#808080', alpha: 0.62 },
      { self: 'overlay', alpha: 0.28 },
      { op: 'multiply', color: '#e6e0cb', alpha: 1 },
      { op: 'soft-light', color: '#56664a', alpha: 0.3 },
      { op: 'screen', color: '#1c1b14', alpha: 1 },
    ],
    shade: { op: 'soft-light', alpha: 0.62 },
    vignette: { color: '#0b0a07', alpha: 0.34, inner: 0.52 },
    haze: { color: '#cdbf9e', alpha: 0.13, to: 0.5 },
    contours: { color: '#f1e6c9', minor: { alpha: [[14.8, 0], [16, 0.09]], width: 0.5 }, major: { alpha: [[13.4, 0.06], [15, 0.2]], width: [[13.4, 0.5], [16, 0.9]] } },
    water: { fill: 'rgba(66,98,116,0.55)', line: [[13, 0.9], [16, 1.6]], lineColor: 'rgba(122,168,196,0.8)', lineAlpha: [[13, 0.75], [16, 0.95]] },
    roads: { ...LOOKS.natural.roads, casing: { color: 'rgba(14,12,8,0.5)', extra: 1.4 }, primary: { color: 'rgba(240,229,200,0.62)', width: [[13, 1.3], [16, 3.4], [18, 6]] }, secondary: { color: 'rgba(236,224,194,0.5)', width: [[13, 1.0], [16, 2.6], [18, 5]] }, local: { color: 'rgba(230,218,188,0.34)', width: [[14, 0.5], [16, 1.6], [18, 3.2]], minZoom: 13.4 }, rail: { color: 'rgba(220,210,186,0.42)', width: [[13, 1], [16, 1.8]], tick: true } },
    labels: { ...place(LOOKS.natural.labels), place: '#f6efdc', placeHalo: 'rgba(14,12,8,0.92)', road: '#ece3c9', roadHalo: 'rgba(14,12,8,0.9)', water: '#a9cfea', dot: '#f6efdc', dotRing: 'rgba(14,12,8,0.85)', tracking: 0.3 },
    ...parse('lookA'),
  });
  const b = registerLook({
    ...LOOKS.paper, id: 'look-b', label: 'Survey', theme: 'light', ground: '#f1f2f0',
    doc: 'A survey sheet in the editorial manner: the aerial ghosted into cool white paper, relief lit from the north-west, thin brown contours, blue water.',
    grade: [
      { op: 'saturation', color: '#808080', alpha: 0.9 },
      { self: 'overlay', alpha: 0.42 },
      { op: 'screen', color: '#a6a69e', alpha: 1 },
      { op: 'multiply', color: '#f7f5ec', alpha: 1 },
      { op: 'soft-light', color: '#8ea4b8', alpha: 0.26 },
    ],
    shade: { op: 'soft-light', alpha: 1, invert: true },
    vignette: { color: '#4d5057', alpha: 0.08, inner: 0.62 },
    contours: { color: '#7d6f5c', minor: { alpha: [[14.8, 0], [16, 0.14]], width: 0.5 }, major: { alpha: [[13.4, 0.1], [15, 0.3]], width: [[13.4, 0.6], [16, 0.9]] } },
    water: { fill: 'rgba(124,164,196,0.55)', line: [[13, 0.9], [16, 1.6]], lineColor: 'rgba(66,118,160,0.9)', lineAlpha: [[13, 0.8], [16, 1]] },
    roads: { ...LOOKS.paper.roads, casing: { color: 'rgba(96,98,100,0.5)', extra: 1.4 }, primary: { color: 'rgba(255,255,255,0.97)', width: [[13, 1.3], [16, 3.4], [18, 6]] }, secondary: { color: 'rgba(255,255,255,0.93)', width: [[13, 1.0], [16, 2.6], [18, 5]] }, local: { color: 'rgba(255,255,255,0.84)', width: [[14, 0.5], [16, 1.6], [18, 3.2]], minZoom: 13.4 }, rail: { color: 'rgba(74,80,90,0.6)', width: [[13, 1], [16, 1.8]], tick: true } },
    labels: { ...place(LOOKS.paper.labels), place: '#2a2e33', placeHalo: 'rgba(255,255,255,0.96)', road: '#30363d', roadHalo: 'rgba(255,255,255,0.96)', water: '#1d4f7c', dot: '#2a2e33', dotRing: 'rgba(255,255,255,0.95)', tracking: 0.3 },
    ...parse('lookB'),
  });
  return { a, b };
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
      if (look.haze) { const hz = look.haze; const n = parseInt(hz.color.slice(1), 16); const rgb = `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`; const gr = c.createLinearGradient(0, 0, 0, view.h * hz.to); gr.addColorStop(0, `rgba(${rgb},${hz.alpha})`); gr.addColorStop(1, `rgba(${rgb},0)`); c.save(); c.fillStyle = gr; c.fillRect(0, 0, view.w, view.h * hz.to); c.restore(); }      // the far (top) of the picture a little hazier: depth without a camera tilt
      if (r && (r.animating || r.pending) && onActive) onActive();
    },
  });
  return { backdrop, looks, entries: [entry(looks.a), entry(looks.b)], caption: MANIFEST.caption, places: VECTORS.places, vectors: backdrop.vectors };
}


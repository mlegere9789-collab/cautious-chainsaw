// render/real-ground.mjs - the REAL ground of the Strategy Premium pictures: the basemap folder's USGS aerial (NAIP, April-May 2022) lit by 3DEP hillshade, with contours, streams, roads and the site's place
// marks (docs/pitch/anim2/basemap, public-domain sources, no network at run time other than the tile files next to the page).  This module only registers it with the Studio's backdrop registry.
//
// One look is added here, 'campaign': the basemap's 'dim' grade (calm, desaturated, dark, so the standards read) with the hillshade INVERTED, i.e. lit from the north-west like the marks, and the
// labels set in the language's own face.  Evidence: the ground is Measured modern ground, never the 1863 landscape (the caption below says so).
import { createBackdrop } from '../../../../basemap/src/backdrop.mjs';
import { LOOKS, registerLook } from '../../../../basemap/src/looks.mjs';
import { MANIFEST } from '../../../../basemap/data/manifest.mjs';
import { VECTORS } from '../../../../basemap/data/vectors.mjs';

// a picture or a test that drives the engine by hand (?manual=1) must not depend on the wall clock: the 240 ms cross-fade of a tile that has just arrived is off there
const MANUAL = typeof location !== 'undefined' && /[?&]manual=1/.test(location.search);
const FAM = '"Barlow Semi Condensed", "Bahnschrift SemiCondensed", "Segoe UI", system-ui, sans-serif';

/** register the campaign look (once) and return it */
export function campaignLook() {
  if (LOOKS.campaign) return LOOKS.campaign;
  const dim = JSON.parse(JSON.stringify(LOOKS.dim));
  const look = {
    ...dim, id: 'campaign', label: 'Campaign ground', theme: 'dark',
    doc: 'NAIP aerial graded calm and dark, with the 3DEP hillshade lit from the north-west, the direction the marks are lit from.',
    ground: '#0b0e11',
    grade: [
      { op: 'saturation', color: '#808080', alpha: 0.5 },
      { self: 'overlay', alpha: 0.5 },
      { op: 'multiply', color: '#a3a9b0', alpha: 1 },
      { op: 'soft-light', color: '#243449', alpha: 0.3 },
      { op: 'screen', color: '#070a0f', alpha: 1 },
    ],
    shade: { op: 'soft-light', alpha: 0.6, invert: true },
    vignette: { color: '#04060a', alpha: 0.42, inner: 0.5 },
    labels: { ...dim.labels, font: `600 11px ${FAM}`, placeFont: `600 11px ${FAM}`, roadFont: `600 11px ${FAM}`, tracking: 0.5, place: '#eef0ea', placeHalo: 'rgba(7,10,14,0.88)', road: 'rgba(228,232,238,0.8)', roadHalo: 'rgba(7,10,14,0.8)' },
  };
  return registerLook(look);
}

/** @param {{base?: string}} [o] base = the folder of the basemap's tile files, relative to the page (default ../../basemap/assets/) */
export function makeRealGround(o = {}) {
  campaignLook();
  const base = o.base || '../../basemap/assets/';
  const backdrop = createBackdrop({ manifest: MANIFEST, vectors: VECTORS, base });
  backdrop.prefetch(14);
  // the registry entries are made here (not by the basemap's backdropEntries) because the place names are drawn by the Studio, clear of the marks (render/places.mjs): the basemap is asked for no places
  const entries = Object.values(LOOKS).map((look) => ({ id: 'real-' + look.id, label: look.label + ' (real ground)', doc: look.doc, theme: look.theme, ownPlaces: true, caption: backdrop.caption(), attribution: backdrop.attribution(),
    draw: (c, view, data, tok) => backdrop.draw(c, view.camera, look, { places: false, placeFrame: 'ground', fade: !MANUAL }) }));
  return { backdrop, entries, caption: () => backdrop.caption(), attribution: () => backdrop.attribution() };
}

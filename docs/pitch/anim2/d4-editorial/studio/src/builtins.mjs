// builtins.mjs - the modules that ship with the engine, registered into a kernel.  Skins, popups and fx are NOT registered here: those registries start empty and a
// design pitch fills them (the Studio shell registers one clearly-labelled REFERENCE skin so there is something to look at; see ui/reference-skin.mjs).
import { PchipTrack, ChordTrack, LinearTrack } from './interp/paths.mjs';
import { ProductionTrack } from './interp/production.mjs';
import { PRODUCTION_LAYOUT } from './layout/production.mjs';
import { PRODUCTION_MOTION } from './scene/production.mjs';
import { LAYOUTS } from './layout/strategies.mjs';
import { MOTION_MODES } from './scene/modes.mjs';
import { BACKDROPS } from './render/backdrops.mjs';
import { createBackdrop } from './basemap/backdrop.mjs';
import { LOOKS } from './basemap/looks.mjs';
import { MANIFEST } from './basemap/data/manifest.mjs';
import { VECTORS } from './basemap/data/vectors.mjs';

export const INTERP_MODELS = [
  { id: 'pchip', label: 'Monotone cubic (PCHIP)', doc: 'Exact at keyframes, no overshoot, C1: a unit does not stop at every keyframe. The path may cut a corner inside the keyframes\' bounding box.', build: (kfs, o = {}) => new PchipTrack(kfs, o.endSlopes) },
  { id: 'chord-smooth', label: 'Straight chords, smooth speed', doc: 'Geography is the polyline through the keyframes; only the speed along it is smoothed (monotone cubic of distance).', build: (kfs, o = {}) => new ChordTrack(kfs, o.endSlopes) },
  { id: 'linear', label: 'Straight chords, constant speed', doc: 'Baseline for comparison: velocity jumps at every keyframe.', build: (kfs) => new LinearTrack(kfs) },
  { id: 'production-step', hidden: true, label: 'Production stepping (reproduction)', doc: 'The shipped y1/F4 semantics: interpolation only between adjacent ticks, eased per tick, hold then jump otherwise, units pushed in half a tick early. For the before/after comparison; not a design.', build: (kfs, o = {}) => new ProductionTrack(kfs, o.kf) },
];

/** @param {ReturnType<typeof import('./kernel/registry.mjs').createKernel>} kernel  @param {{motion?: object[], backdrops?: object[]}} [extra] */
export function registerBuiltins(kernel, extra = {}) {
  for (const m of INTERP_MODELS) kernel.interp.register(m.id, m);
  for (const l of LAYOUTS) kernel.layout.register(l.id, l);
  kernel.layout.register(PRODUCTION_LAYOUT.id, PRODUCTION_LAYOUT);
  kernel.motion.register(PRODUCTION_MOTION.id, PRODUCTION_MOTION);
  for (const m of MOTION_MODES) kernel.motion.register(m.id, m);
  for (const m of extra.motion || []) kernel.motion.register(m.id, m);
  for (const b of BACKDROPS) kernel.backdrops.register(b.id, b);
  for (const b of extra.backdrops || []) kernel.backdrops.register(b.id, b);
  // D4 FORK: the real ground (USGS NAIP aerial + 3DEP hillshade + contours + TIGER roads, docs/pitch/anim2/basemap).  The backdrop paints no place names: the skin draws them (so they can step aside for a mark).
  kernel.places = { list: VECTORS.places, frame: 'ground' };
  if (typeof document !== 'undefined') {
    const base = (typeof location !== 'undefined' && new URLSearchParams(location.search).get('assets')) || globalThis.__D4_ASSETS || '../../basemap/assets/';
    const real = createBackdrop({ manifest: MANIFEST, vectors: VECTORS, base }); globalThis.__realBackdrop = real; real.prefetch(14);
    for (const look of Object.values(LOOKS)) kernel.backdrops.register('real-' + look.id, { id: 'real-' + look.id, label: look.label + ' (real ground)', doc: look.doc, theme: look.theme, draw: (c, view) => real.draw(c, view.camera, look, { places: false, placeFrame: 'ground', lineLabels: false }), roadLabels: (camera) => real.roadLabels(camera) });
  }
  return kernel;
}

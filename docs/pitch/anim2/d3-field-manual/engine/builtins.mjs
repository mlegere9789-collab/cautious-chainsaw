// builtins.mjs - the modules that ship with the engine, registered into a kernel.  Skins, popups and fx are NOT registered here: those registries start empty and a
// design pitch fills them (the Studio shell registers one clearly-labelled REFERENCE skin so there is something to look at; see ui/reference-skin.mjs).
import { PchipTrack, ChordTrack, LinearTrack } from './interp/paths.mjs';
import { ProductionTrack } from './interp/production.mjs';
import { PRODUCTION_LAYOUT } from './layout/production.mjs';
import { PRODUCTION_MOTION } from './scene/production.mjs';
import { LAYOUTS } from './layout/strategies.mjs';
import { MOTION_MODES } from './scene/modes.mjs';
import { BACKDROPS } from './render/backdrops.mjs';
import { createBackdrop, backdropEntries } from '../../basemap/src/backdrop.mjs';
import { LOOKS, registerLook } from '../../basemap/src/looks.mjs';
import { MANIFEST } from '../../basemap/data/manifest.mjs';
import { VECTORS } from '../../basemap/data/vectors.mjs';

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
  // d3 fork: the real ground (docs/pitch/anim2/basemap: USGS NAIP aerial, 3DEP hillshade, TIGER roads, the site's place marks).  Two looks of this language are registered next to the module's own four:
  // 'fm' (the dimmed aerial the night skin was drawn for) and 'fmday' (the paper-toned one), with the labels set in this language's type at its 11 px floor.
  const FONT = '"FM Serif", Georgia, "Times New Roman", serif'; const retype = (L) => ({ ...L, font: `700 11px ${FONT}`, placeFont: `700 11px ${FONT}`, roadFont: `400 11px ${FONT}` });      // the ground is annotated in the serif (water names are its true italic), the marks are set in the sans
  registerLook({ ...LOOKS.dim, id: 'fm', label: 'Field Manual night', labels: retype(LOOKS.dim.labels) });
  registerLook({ ...LOOKS.paper, id: 'fmday', label: 'Field Manual day', labels: retype(LOOKS.paper.labels) });
  const real = createBackdrop({ manifest: MANIFEST, vectors: VECTORS, base: globalThis.__FM_TILES || '../../basemap/assets/' }); globalThis.__realBackdrop = real; real.prefetch(14);
  for (const b of backdropEntries(real)) kernel.backdrops.register(b.id, b);
  return kernel;
}

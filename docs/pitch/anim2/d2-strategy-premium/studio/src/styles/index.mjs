// styles/index.mjs - THE STYLES of the Studio: a style is a named pairing of a tile skin family with the ground it was drawn for, the interface theme that sits well beside it and the engine
// dials the design needs (no label boxes, a one-pixel clearance, the arrival timing).  The Style switcher lists these; a skin is chosen by `family` + a variant (standard, colour-blind safe, high contrast).
// To add a style: register the skin (skins/index.mjs), add one entry here, run node build.mjs.  Nothing here draws anything: it only sets dials and tells the shell which theme to wear.
export const STYLES = [
  { id: 'premium', family: 'premium', label: 'Strategy Premium', blurb: 'Standards and banners: one object per unit, scale tells the formation, light from the north-west, soft contact shadows, a gilt crowd mark with a count.', backdrop: 'real-campaign', theme: 'dark',
    dials: { 'layout.labels': false, 'layout.gapPx': 1, 'motion.fadeMs': 340, 'motion.birthScale': 0.96, 'motion.sizeMs': 90, 'motion.smoothMs': 120, 'scene.hulls': true } },
];

export const VARIANTS = [
  { id: 'standard', suffix: '', label: 'Standard' },
  { id: 'cvd', suffix: '/cvd', label: 'Colour-blind safe' },
  { id: 'contrast', suffix: '/contrast', label: 'High contrast' },
];

export const DEFAULT_STYLE = 'premium';

/** the skin id of a style and a variant */
export function skinIdOf(style, variant = 'standard') { const v = VARIANTS.find((x) => x.id === variant) || VARIANTS[0]; return style.family + v.suffix; }

/** which style and variant a skin id belongs to, or null (the reference test skin belongs to none) */
export function styleOfSkin(skinId) {
  for (const s of STYLES) for (const v of VARIANTS) if (s.family + v.suffix === skinId) return { style: s, variant: v.id };
  return null;
}

/** set the dials of a style.  engine = a Studio engine; returns the style, or throws when the style or the skin is unknown (a typo is never silently ignored) */
export function applyStyle(engine, styleId, variant = 'standard') {
  const s = STYLES.find((x) => x.id === styleId); if (!s) throw new Error(`unknown style "${styleId}" (known: ${STYLES.map((x) => x.id).join(', ')})`);
  if (!VARIANTS.some((v) => v.id === variant)) throw new Error(`unknown variant "${variant}" (known: ${VARIANTS.map((v) => v.id).join(', ')})`);
  const skin = skinIdOf(s, variant); if (!engine.kernel.skins.has(skin)) throw new Error(`style ${s.id}: no skin "${skin}" is registered`);
  for (const [id, v] of Object.entries(s.dials || {})) { try { engine.tuning.set(id, v); } catch (e) { console.warn('style dial ignored', id, e.message); } }
  engine.tuning.set('skin.id', skin);
  if (engine.kernel.backdrops.has(s.backdrop)) engine.tuning.set('backdrop.id', s.backdrop);
  return s;
}

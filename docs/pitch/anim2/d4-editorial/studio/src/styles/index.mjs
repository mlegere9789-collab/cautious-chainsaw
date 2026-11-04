// styles/index.mjs - THE STYLES of this fork: a style is a skin family, the real ground it was drawn for and the interface theme that sits beside it.  Nothing here draws anything: it sets two dials
// (skin.id, backdrop.id) and tells the shell which theme to wear.  Add a style: register the skin (skins/index.mjs), add an entry here, run node build.mjs.
export const STYLES = [
  { id: 'dispatch-paper', family: 'dispatch-paper', label: 'Paper', blurb: 'The survey print: the aerial ghosted into cool grey-green paper, relief and contours, dark ink with a pale halo.', backdrop: 'real-paper', theme: 'light' },
  { id: 'dispatch-aerial', family: 'dispatch-aerial', label: 'Aerial', blurb: 'The photograph, dimmed and calmed: white ink with a dark halo.', backdrop: 'real-dim', theme: 'dark' },
];

export const VARIANTS = [
  { id: 'standard', suffix: '', label: 'Standard', blurb: 'Blue for the Union, red for the Confederacy.' },
  { id: 'cvd', suffix: '/cvd', label: 'Colour-blind safe', blurb: 'Blue and orange, tuned for the common colour-vision differences.' },
  { id: 'contrast', suffix: '/contrast', label: 'High contrast', blurb: 'Deeper colours and heavier rings.' },
];

export const DEFAULT_STYLE = 'dispatch-paper';

/** the skin id of a style and a variant */
export function skinIdOf(style, variant = 'standard') { const v = VARIANTS.find((x) => x.id === variant) || VARIANTS[0]; return style.family + v.suffix; }

/** which style and variant a skin id belongs to, or null (the reference skin belongs to none) */
export function styleOfSkin(skinId) {
  for (const s of STYLES) for (const v of VARIANTS) if (s.family + v.suffix === skinId) return { style: s, variant: v.id };
  return null;
}

/** set the dials of a style.  engine = a Studio engine; returns the style, or throws when the style or the skin is unknown (a typo is never silently ignored) */
export function applyStyle(engine, styleId, variant = 'standard') {
  const s = STYLES.find((x) => x.id === styleId); if (!s) throw new Error(`unknown style "${styleId}" (known: ${STYLES.map((x) => x.id).join(', ')})`);
  if (!VARIANTS.some((v) => v.id === variant)) throw new Error(`unknown variant "${variant}" (known: ${VARIANTS.map((v) => v.id).join(', ')})`);
  const skin = skinIdOf(s, variant); if (!engine.kernel.skins.has(skin)) throw new Error(`style ${s.id}: no skin "${skin}" is registered`);
  engine.tuning.set('skin.id', skin); engine.tuning.set('backdrop.id', s.backdrop);
  return s;
}

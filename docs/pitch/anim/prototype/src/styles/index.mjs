// styles/index.mjs - THE STYLES of the Studio: a style is a named pairing of a tile skin family with the ground it was drawn for and the interface theme that sits well beside it.  The Style
// switcher in the top bar lists these; a skin is chosen by `family` + a variant (standard, colour-blind safe, high contrast).  To add a style: register the skin (skins/index.mjs), then add one
// entry here and run node build.mjs.  Nothing here draws anything: it only sets dials (skin.id, backdrop.id) and tells the shell which theme to wear.
//
// The three families are the pitched tile designs of docs/pitch/anim/prototype/src/skins/README.md; their rationale and evidence limits are there.
export const STYLES = [
  { id: 'war-room', family: 'war-room', label: 'War Room', blurb: 'Cinematic dark glass. Light means a fresh report, an unlit dashed plate means a carried-forward fix; depth means echelon.', backdrop: 'ink', theme: 'dark' },
  { id: 'field-manual', family: 'field-manual', label: 'Field Manual', blurb: 'A modern cartographic symbol in the NATO / APP-6 grammar: frame = side, glyph = arm, marks = echelon, dashed = not a fresh report.', backdrop: 'paper', theme: 'light' },
  { id: 'map-1863', family: 'map-1863', label: '1863 Map', blurb: 'A lithographed field map: the seven Union corps badges and division colours of the 21 March 1863 circular, ink for firm, pencil for provisional.', backdrop: 'paper', theme: 'light' },
];

export const VARIANTS = [
  { id: 'standard', suffix: '', label: 'Standard' },
  { id: 'cvd', suffix: '/cvd', label: 'Colour-blind safe' },
  { id: 'contrast', suffix: '/contrast', label: 'High contrast' },
];

export const DEFAULT_STYLE = 'war-room';

/** the skin id of a style and a variant */
export function skinIdOf(style, variant = 'standard') { const v = VARIANTS.find((x) => x.id === variant) || VARIANTS[0]; return style.family + v.suffix; }

/** which style and variant a skin id belongs to, or null (the reference and minimal test skins belong to none) */
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

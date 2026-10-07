// styles/index.mjs - THE STYLES of the Studio (d3 fork).  A style is a skin family plus the ground it was drawn for and the interface theme beside it; a variant is the same drawing under another
// token set (and, for the day variant, another ground).  The Precision Field Manual is the only style of this fork: night on the dimmed NAIP aerial, day on the paper-toned aerial, a colour-blind-safe
// and a high-contrast token set.  To add a style: register its skin (skins/index.mjs), add one entry here, run node build.mjs.  Nothing here draws anything: it only sets dials.
export const STYLES = [
  { id: 'field-manual', family: 'd3', label: 'Field Manual', blurb: 'One mark per unit: a coloured cell for the side and the arm, the code, a four-step strength gauge; echelon marks in a tab for formations; a crowd merges into a formation mark with its count. Flat, on a 2 px grid, 11 and 13 px type.', backdrop: 'real-fm', theme: 'dark' },
];

export const VARIANTS = [
  { id: 'standard', suffix: '', label: 'Night' },
  { id: 'day', suffix: '/day', label: 'Day', backdrop: 'real-fmday', theme: 'light' },
  { id: 'cvd', suffix: '/cvd', label: 'Colour-blind safe' },
  { id: 'contrast', suffix: '/contrast', label: 'High contrast' },
];

export const DEFAULT_STYLE = 'field-manual';

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
  const v = VARIANTS.find((x) => x.id === variant); if (!v) throw new Error(`unknown variant "${variant}" (known: ${VARIANTS.map((x) => x.id).join(', ')})`);
  const skin = skinIdOf(s, variant); if (!engine.kernel.skins.has(skin)) throw new Error(`style ${s.id}: no skin "${skin}" is registered`);
  engine.tuning.set('skin.id', skin); engine.tuning.set('backdrop.id', v.backdrop || s.backdrop);
  return s;
}

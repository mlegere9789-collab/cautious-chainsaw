// layout/spec.mjs - THE TILE SPEC: every footprint number and every layout budget, assembled from two places and nowhere else:
//   * the SKIN declares its footprint (chip height, padding, glyph width, label height ...): a different skin may be bigger or smaller, the layout adapts;
//   * the TOKENS declare the policy dials (clearance, displacement budget, hysteresis, label delays ...).
// Time-valued dials are stored in milliseconds in the tokens and converted here to "frame equivalents" (1 = 1/60 s) because the solver's hysteresis is counted in them,
// so its behaviour does not change with the display's refresh rate.
export const FRAME_MS = 1000 / 60;

/** the reference skin's footprint (also the default for a skin that declares none).  px, CSS pixels. */
export const DEFAULT_FOOTPRINT = {
  chipH: 20, chipPadX: 5, glyphW: 14, glyphGap: 3, chipMinW: 36, ring: 2, badgeGap: 3,   // chip: 13 px body + 3 px strength bar + 2 x 2 px selection ring
  labelH: 14, labelPadX: 4, labelGap: 2,                                                   // name label (secondary)
  pinHalf: 2,                                                                              // true-position pin box: 4 px
};

/** @param {object} footprint  skin footprint   @param {(id:string)=>any} tok  token reader   @param {{width:(font:string,s:string)=>number}} text */
export function makeSpec(footprint, tok, text, sizer = null) {
  return {
    ...DEFAULT_FOOTPRINT, ...footprint, text, _sz: new Map(), sizer, zoom: 14,   // FORK: a skin may supply `sizer` ({ key, leaf, agg }, see skins/quiet-cartographer.mjs) to size each tile by detail level; spec.zoom is set by the engine every frame
    gap: tok('layout.gapPx'), dMax: tok('layout.dMaxPx'), band: tok('layout.bandPx'),
    relax: tok('layout.relaxPxPerSec') / 60,                       // px per frame-equivalent
    splitDwell: tok('layout.splitDwellMs') / FRAME_MS, labelShowDelay: 12, labelCooldown: 72,
    labelMinZoom: 12, kCap: tok('layout.kCap'), pinProtect: tok('layout.pinProtect'), labels: false,
    maxSplitTries: tok('layout.maxSplitTries'), continuity: tok('layout.continuityPx'),
  };
}

/** chip box of a leaf or aggregate: width = padding + glyph + gap + the measured text (+ badge) + selection ring */
export function chipSize(spec, codeText, badgeText = null) {
  const codeW = spec.text.width('code', codeText);
  let w = spec.chipPadX * 2 + spec.glyphW + spec.glyphGap + codeW + 2 * spec.ring;
  if (badgeText) w += spec.badgeGap + spec.text.width('badge', badgeText) + 6;
  return { w: Math.max(spec.chipMinW, Math.ceil(w)), h: spec.chipH, codeW };
}
export function labelSize(spec, text) {
  return { w: Math.ceil(spec.text.width('label', text) + 2 * spec.labelPadX), h: spec.labelH };
}

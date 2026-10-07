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
export function makeSpec(footprint, tok, text, skin = null) {
  return {
    ...DEFAULT_FOOTPRINT, ...footprint, text, _sz: new Map(), _aggSz: new Map(), measure: skin && skin.measure ? skin.measure : null, forms: skin && skin.forms ? skin.forms : null, _named: false,
    gap: tok('layout.gapPx'), dMax: tok('layout.dMaxPx'), band: tok('layout.bandPx'),
    relax: tok('layout.relaxPxPerSec') / 60,                       // px per frame-equivalent
    splitDwell: tok('layout.splitDwellMs') / FRAME_MS, labelShowDelay: tok('layout.labelShowDelayMs') / FRAME_MS, labelCooldown: tok('layout.labelCooldownMs') / FRAME_MS,
    labelMinZoom: tok('layout.labelMinZoom'), kCap: tok('layout.kCap'), pinProtect: tok('layout.pinProtect'), labels: tok('layout.labels'),
    maxSplitTries: tok('layout.maxSplitTries'), continuity: tok('layout.continuityPx'),
  };
}

/** d3 fork: the footprint of a tile.  A skin may size its own marks (spec.measure: height by echelon, a tab, a grown name ...); otherwise the prototype's chip formula.
 *  info = { kind: 'leaf', u, named } or { kind: 'agg', code, tail, nameKind, n }.  Returns { w, h, codeW } including the selection band. */
export function sizeOf(spec, info) {
  if (spec.measure) return spec.measure(spec, info);
  return chipSize(spec, info.kind === 'leaf' ? info.u.short : info.code, info.kind === 'leaf' ? null : info.tail);
}
/** d3 fork: is the camera at a zoom where every mark has grown to its full name?  A hysteresis (the state lives on the spec) keeps a camera resting on the threshold from flickering between forms. */
export function namedAt(spec, z) {
  const f = spec.forms; if (!f) return false;
  if (spec._named) { if (z < f.nameZoom - f.nameHyst) spec._named = false; } else if (z >= f.nameZoom) spec._named = true;
  return spec._named;
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

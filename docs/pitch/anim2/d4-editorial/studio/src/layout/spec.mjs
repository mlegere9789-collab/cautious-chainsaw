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
    ...DEFAULT_FOOTPRINT, ...footprint, text, _sz: new Map(), lodOf: skin && skin.lodOf ? skin.lodOf : null, zoom: 20, skinSize: skin && skin.size ? skin.size : null, skinLabel: skin && skin.labelSize ? skin.labelSize : null,
    gap: tok('layout.gapPx'), dMax: tok('layout.dMaxPx'), dMaxBase: tok('layout.dMaxPx'), dMaxFar: tok('layout.dMaxFarPx'), dMaxFrom: tok('layout.dMaxFarFrom'), dMaxTo: tok('layout.dMaxFarTo'), band: tok('layout.bandPx'),
    relax: tok('layout.relaxPxPerSec') / 60,                       // px per frame-equivalent
    splitDwell: tok('layout.splitDwellMs') / FRAME_MS, labelShowDelay: tok('layout.labelShowDelayMs') / FRAME_MS, labelCooldown: tok('layout.labelCooldownMs') / FRAME_MS,
    labelMinZoom: tok('layout.labelMinZoom'), codeMinZoom: tok('layout.codeMinZoom'), kCap: tok('layout.kCap'), pinProtect: tok('layout.pinProtect'), labels: tok('layout.labels'), labelSlots: String(tok('layout.labelSlots') || 'rlbt').split(''),
    maxSplitTries: tok('layout.maxSplitTries'), continuity: tok('layout.continuityPx'),
  };
}

/** chip box of a leaf or aggregate: width = padding + glyph + gap + the measured text (+ badge) + selection ring */
export function chipSize(spec, codeText, badgeText = null, info = null) {
  // D4 FORK: a skin may size its own mark (a glyph and a text run have no fixed chip: a disc, a guidon and a standard differ).  skin.size(spec, info) -> { w, h, hx, hy, textW }.
  // hx, hy = the offset from the symbol's TRUE POSITION to the centre of the box (a mark whose glyph stands left of its text is anchored on the glyph, not on the middle of the box).
  if (spec.skinSize) { const r = spec.skinSize(spec, { text: codeText, badge: badgeText, ...(info || {}) }); return { w: Math.ceil(r.w), h: r.h, codeW: r.textW ?? 0, hx: r.hx || 0, hy: r.hy || 0, textW: r.textW ?? 0, font: r.font, kind: r.kind, frameW: r.frameW, frameH: r.frameH }; }
  const codeW = spec.text.width('code', codeText);
  let w = spec.chipPadX * 2 + spec.glyphW + spec.glyphGap + codeW + 2 * spec.ring;
  if (badgeText) w += spec.badgeGap + spec.text.width('badge', badgeText) + 6;
  return { w: Math.max(spec.chipMinW, Math.ceil(w)), h: spec.chipH, codeW, hx: 0, hy: 0 };
}
export function labelSize(spec, text, cs = null, code = null) {
  if (spec.skinLabel) { const r = spec.skinLabel(spec, { text, chip: cs, code }); return { w: Math.ceil(r.w), h: r.h, cw: Math.ceil(r.cw || 0) }; }     // D4 FORK: the name that GROWS out of the mark: the label rectangle is only the part of the name beyond the code's own text run
  return { w: Math.ceil(spec.text.width('label', text) + 2 * spec.labelPadX), h: spec.labelH };
}

/** round 2: how far a mark may stand from its true position at zoom z.  The overview keeps the first prototype's budget (a crowd is the honest answer there); from the zoom where a unit can show its code, the budget
 *  grows to dMaxFar, so two records are not merged into a crowd while there is free ground within reach (a pin and a leader keep the true position).  Sets spec.dMax and returns it. */
export function dMaxAt(spec, z) {
  const a = spec.dMaxFrom; const b = Math.max(a + 0.01, spec.dMaxTo); const k = Math.max(0, Math.min(1, (z - a) / (b - a))); const e = k * k * (3 - 2 * k);
  spec.dMax = spec.dMaxBase + (Math.max(spec.dMaxBase, spec.dMaxFar) - spec.dMaxBase) * e; return spec.dMax;
}

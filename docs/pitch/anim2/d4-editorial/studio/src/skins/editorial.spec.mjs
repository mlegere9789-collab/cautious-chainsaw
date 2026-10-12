// skins/editorial.spec.mjs - THE TOKEN FILE OF THE DISPATCH LANGUAGE (art direction 4, "Editorial Annotation").  One row per token: [name, value, what it does, { min, max, unit }].
// A designer edits a value here (or passes ?skinset={"dispatch-paper":{"mark.r":8}} live) and nothing else: the drawing code reads every number below and invents none.
// Lengths are CSS px at 1x ("u"); the drawing is resolution independent.  Colours are #rrggbb.  SPEC.md section 4 explains the system and prints the contrast tests of every colour pair.
//
// Two families share one drawing: `dispatch-paper` (dark ink on the light survey-print ground) and `dispatch-aerial` (white ink on the dark aerial ground).  Each has a colour-blind-safe and a
// high-contrast variant (DP_VARIANTS / DA_VARIANTS): a variant is the same drawing under another token set.
export const DISPATCH_TOKENS = [
  // ---- colour: the two sides, the contested mark, the ink of a mark -------------------------------------------------------------------------------------------------------------
  ['color.union', '#1C57A6', 'Union: the fill of a unit mark and of a formation standard.  Documented side.  White glyph on it is 7.0:1 (tested).'],
  ['color.confederate', '#C2441B', 'Confederate: the fill of a unit mark and of a formation standard.  Documented side.  White glyph on it is 4.9:1 (tested).'],
  ['color.unknown', '#D9A21B', 'Contested side (10 ids whose state code contradicts the prefix): amber with a diagonal hatch, never a side colour.'],
  ['color.unknownInk', '#1B1405', 'Ink of the glyph on the contested amber.'],
  ['color.glyph', '#ffffff', 'Ink of the arm glyph, the pips and the count inside a mark.'],
  ['color.glyphDark', '#17202b', 'Ink of the glyph, the pips and the count inside a mark that has aged to a light tint (the better of the two inks is used).'],
  ['color.ringLight', '#ffffff', 'The inner ring that separates a mark from any ground.'],
  ['color.ringDark', '#0a1018', 'The outer hairline of the ring: the second chance on a pale ground.'],
  ['color.accent', '#ffc21a', 'Selection, focus and the highlighter of the interface (amber).'],
  // ---- ink of the text beside a mark: the theme of the ground it stands on -----------------------------------------------------------------------------------------------------
  ['text.ink', '#17202b', 'Colour of the code and name beside a mark (dark ink on the light ground, white on the dark one).'],
  ['text.halo', '#f7f2e4', 'Colour of the halo that keeps the text legible on any ground.'],
  ['text.haloAlpha', 0.94, 'Opacity of the solid inner halo.', { min: 0.5, max: 1 }],
  ['text.haloWidth', 3.8, 'Width of the halo stroke (it extends half of this around each letter).', { min: 0, max: 8, unit: 'u' }],
  ['text.formUnion', '#123f7a', 'Ink of the name of a Union formation (brigade, division, corps): the side in deep ink, so the formation tier is set apart from the units by colour and weight, not only by size.'],
  ['text.formConfederate', '#8e2c0e', 'Ink of the name of a Confederate formation.'],
  // ---- the unit mark (a regiment, a battery, a battalion): a bold disc, one white arm glyph -------------------------------------------------------------------------------
  ['mark.r', 7.5, 'Radius of the disc of a regiment or a battery (the fill).', { min: 5, max: 12, unit: 'u' }],
  ['mark.rBattalion', 8.5, 'Radius of the disc of a battalion (echelon 1): a little larger.', { min: 5, max: 14, unit: 'u' }],
  ['ring.light', 1.5, 'Width of the light ring around a disc or a standard.', { min: 0.5, max: 3, unit: 'u' }],
  ['ring.dark', 1, 'Width of the dark hairline outside the light ring.', { min: 0, max: 2, unit: 'u' }],
  ['glyph.size', 3.4, 'Half-size of the arm glyph (infantry saltire, cavalry slash, artillery dot).', { min: 2, max: 6, unit: 'u' }],
  ['glyph.stroke', 1.9, 'Stroke width of the arm glyph.', { min: 1, max: 3.2, unit: 'u' }],
  ['unit.shape.confederate', 'square', 'Silhouette of a Confederate unit mark (the side is redundant in colour and shape): square or circle.'],
  // ---- the formation standard (a brigade, a division, a corps record, and the crowd mark) ------------------------------------------------------------------------------------
  ['flag.w.brigade', 28, 'Width of a brigade standard.', { min: 14, max: 48, unit: 'u' }],
  ['flag.h.brigade', 18, 'Height of a brigade standard.', { min: 10, max: 36, unit: 'u' }],
  ['flag.w.division', 34, 'Width of a division standard.', { min: 14, max: 56, unit: 'u' }],
  ['flag.h.division', 22, 'Height of a division standard.', { min: 10, max: 40, unit: 'u' }],
  ['flag.w.corps', 40, 'Width of a corps standard.', { min: 14, max: 64, unit: 'u' }],
  ['flag.h.corps', 26, 'Height of a corps standard.', { min: 10, max: 44, unit: 'u' }],
  ['flag.w.crowd', 25, 'Width of the crowd mark (a standard that stands for several records).', { min: 14, max: 48, unit: 'u' }],
  ['flag.h.crowd', 17, 'Height of the crowd mark.', { min: 10, max: 36, unit: 'u' }],
  ['flag.notch', 5, 'Depth of the swallow-tail (Union) or of the point (Confederate) at the fly end.', { min: 0, max: 10, unit: 'u' }],
  ['flag.radius', 2.5, 'Corner radius of a standard.', { min: 0, max: 8, unit: 'u' }],
  ['flag.stack', 3, 'Offset of the standard behind the crowd mark: "this stands for several records".', { min: 0, max: 8, unit: 'u' }],
  ['pip.r', 2.1, 'Radius of the pips of a formation record (1 brigade, 2 division, 3 corps).', { min: 1, max: 3, unit: 'u' }],
  ['pip.pitch', 4.6, 'Distance between two pips.', { min: 3, max: 8, unit: 'u' }],
  // ---- the footprint ---------------------------------------------------------------------------------------------------------------------------------------------------------
  ['gap.text', 3, 'Space between the mark and its text.', { min: 0, max: 8, unit: 'u' }],
  ['pad.left', 2, 'Space left of the mark inside the footprint (the selection ring lives here).', { min: 0, max: 6, unit: 'u' }],
  ['pad.right', 2, 'Space right of the text inside the footprint (half of the halo).', { min: 0, max: 6, unit: 'u' }],
  ['pad.band', 2, 'Reserved band around the mark for the hover and selection rings.', { min: 1, max: 4, unit: 'u' }],
  // ---- secondary detail: the strength gauge IS the light ring of a unit mark (Modelled; in quarters: a state, not a number) --------------------------------------------------------------------------
  ['gauge.gap', 1.9, 'Gap between the four arcs of the ring (px along the ring).', { min: 0.5, max: 4, unit: 'u' }],
  ['gauge.track', 0.2, 'Opacity of the quarters of the ring that are not lit (the strength the unit no longer has).', { min: 0.05, max: 0.8 }],
  // ---- the one device for age: a carried-forward mark recedes toward the ground it stands on, KEEPING ITS HUE (the side is never lost), and its ring thins ---------------------------------------------------------
  ['color.fade', '#fffdf4', 'The ground colour an old mark recedes toward: the paper of the survey print on the light ground, the near-black of the dimmed photograph on the dark one.'],
  ['fade.desat', 0, 'How far the fill of a mark at least a battle day old loses chroma (a touch only: the side must stay blue or red, never grey).', { min: 0, max: 0.4 }],
  ['fade.fill', 0.55, 'How far the fill of such a mark is then mixed toward the ground colour (a pale tint on paper, deeper on the aerial): age is a fading ink.', { min: 0, max: 0.75 }],
  ['fade.ring', 0.3, 'Opacity lost by the light ring of such a mark.', { min: 0, max: 0.8 }],
  ['fade.ringW', 0.62, 'Width of the light ring of such a mark, as a fraction of a fresh one: the second cue, independent of colour.', { min: 0.3, max: 1 }],
  ['fade.glyph', 0.06, 'Opacity lost by the glyph of such a mark (it stays well above 3:1).', { min: 0, max: 0.4 }],
  ['fade.text', 0.12, 'Opacity lost by the code of such a mark (it stays above 4.5:1).', { min: 0, max: 0.4 }],
  // ---- hull: the soft shape of a formation, shown on interaction ---------------------------------------------------------------------------------------------------------------
  ['hull.pad', 10, 'How far the hull reaches beyond the true positions of the records it joins.', { min: 4, max: 40, unit: 'u' }],
  ['hull.alpha', 0.055, 'Opacity of the hull fill (the rim is where the soft stroke and the fill overlap).', { min: 0.04, max: 0.5 }],
  ['hull.dot', 2.4, 'Radius of the dot at the true position of each record of a hull.', { min: 1, max: 5, unit: 'u' }],
  // ---- leader and pin: the thin line from a displaced mark to the place it truly stands --------------------------------------------------------------------------------------------
  ['leader.width', 1.1, 'Width of the leader line.', { min: 0.5, max: 3, unit: 'u' }],
  ['leader.alpha', 0.9, 'Opacity of the leader line.', { min: 0.2, max: 1 }],
  ['leader.minGap', 7, 'A leader and a pin are drawn only when the true position is at least this far outside the mark.', { min: 0, max: 20, unit: 'u' }],
  ['pin.r', 2, 'Radius of the dot at a true position (white ring and dark hairline are added).', { min: 1, max: 4, unit: 'u' }],
  // ---- place names (the ground's own text) ----------------------------------------------------------------------------------------------------------------------------------
  ['place.fromZoom', 13.2, 'Zoom from which place names appear.', { min: 10, max: 18, unit: 'zoom' }],
  ['place.dot', 2.2, 'Radius of the dot of a place (a ring when the position is in doubt).', { min: 1, max: 5, unit: 'u' }],
  // ---- motion: the language of arrival, selection, growth -------------------------------------------------------------------------------------------------------------------------
  ['motion.selectMs', 240, 'Time constant of the selection ring (it draws itself around the mark).', { min: 0, max: 800, unit: 'ms' }],
  ['motion.hoverMs', 130, 'Time constant of the hover ring and of the lift.', { min: 0, max: 800, unit: 'ms' }],
  ['motion.rippleMs', 520, 'Duration of the ring that leaves a mark when it arrives.', { min: 0, max: 1500, unit: 'ms' }],
];

/** the light family: the survey print, dark ink with a pale halo */
export const DP_VARIANTS = {
  cvd: { label: 'colour-blind safe', set: { 'color.union': '#0b5cad', 'color.confederate': '#b84f06', 'color.unknown': '#c9b037' } },
  contrast: { label: 'high contrast', set: { 'color.union': '#0a3d86', 'color.confederate': '#a8300c', 'ring.light': 2, 'text.haloAlpha': 1, 'fade.desat': 0, 'fade.fill': 0.52, 'fade.ring': 0.2, 'fade.ringW': 0.8, 'fade.glyph': 0.03, 'fade.text': 0.06, 'hull.alpha': 0.1 } },
};
/** the dark family: the aerial ground, white ink with a dark halo */
export const DA_SET = { 'text.ink': '#ffffff', 'text.halo': '#08111a', 'text.haloAlpha': 0.9, 'hull.alpha': 0.08, 'color.fade': '#0f1722', 'fade.desat': 0.05, 'fade.fill': 0.34, 'text.formUnion': '#a9cbf7', 'text.formConfederate': '#ffb59b' };
export const DA_VARIANTS = {
  cvd: { label: 'colour-blind safe', set: { 'color.union': '#1a5aab', 'color.confederate': '#bd5209', 'color.unknown': '#d8c24a' } },
  contrast: { label: 'high contrast', set: { 'color.union': '#1d5fb0', 'color.confederate': '#c8481a', 'ring.light': 2, 'text.haloAlpha': 1, 'fade.desat': 0.05, 'fade.fill': 0.3, 'fade.ring': 0.2, 'fade.ringW': 0.8, 'fade.glyph': 0.03, 'fade.text': 0.06, 'hull.alpha': 0.14 } },
};

/** how far a mark has aged, as the language draws it: nothing until half a battle day, then a quick (not a slow) change to the old look, so no mark rests in the mid-tone where neither a white nor a dark glyph reads (b: 0 fresh .. 1 a day or more) */
export const fadeT = (b) => { const u = Math.max(0, Math.min(1, (b - 0.45) / 0.25)); return u * u * (3 - 2 * u); };
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const lum = (hex) => { const [r, g, bl] = rgb(hex).map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * bl; };
export const contrastOf = (a, b) => { const x = lum(a); const y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
/** the one device for age: the fill of a mark recedes toward the ground colour (fade.fill), keeping its hue, by `b` (0 fresh .. 1 a battle day or more).
 *  Shared by the skin and by the colour tests, so the tests measure exactly what is drawn. */
export function fadeFill(P, hex, b) {
  const t = fadeT(b); const v = rgb(hex); const y = 0.299 * v[0] + 0.587 * v[1] + 0.114 * v[2]; const kd = P['fade.desat'] * t; const f = rgb(P['color.fade']); const kf = P['fade.fill'] * t;
  return '#' + v.map((c, i) => { const d = c + (y - c) * kd; return Math.round(d + (f[i] - d) * kf).toString(16).padStart(2, '0'); }).join('');
}
/** the ink of the glyph, the pips and the count on a mark of age b: white, or the dark ink when the aged fill is light enough that the dark reads better (the better of the two, always) */
export function fadeInk(P, hex, b) { const fill = fadeFill(P, hex, b); return contrastOf(P['color.glyph'], fill) >= contrastOf(P['color.glyphDark'], fill) ? P['color.glyph'] : P['color.glyphDark']; }

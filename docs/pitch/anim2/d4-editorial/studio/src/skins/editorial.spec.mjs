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
  ['color.ringLight', '#ffffff', 'The inner ring that separates a mark from any ground.'],
  ['color.ringDark', '#0a1018', 'The outer hairline of the ring: the second chance on a pale ground.'],
  ['color.fade', '#c2b8a2', 'A carried-forward mark is mixed toward this neutral (a warm paper grey on the light ground, a slate on the dark one): the one device for "not a fresh report".'],
  ['color.accent', '#ffc21a', 'Selection, focus and the highlighter of the interface (amber).'],
  // ---- ink of the text beside a mark: the theme of the ground it stands on -----------------------------------------------------------------------------------------------------
  ['text.ink', '#17202b', 'Colour of the code and name beside a mark (dark ink on the light ground, white on the dark one).'],
  ['text.halo', '#f7f2e4', 'Colour of the halo that keeps the text legible on any ground.'],
  ['text.haloAlpha', 0.94, 'Opacity of the solid inner halo.', { min: 0.5, max: 1 }],
  ['text.haloWidth', 3.8, 'Width of the halo stroke (it extends half of this around each letter).', { min: 0, max: 8, unit: 'u' }],
  // ---- the unit mark (a regiment, a battery, a battalion): a bold disc, one white arm glyph -------------------------------------------------------------------------------
  ['mark.r', 7.5, 'Radius of the disc of a regiment or a battery (the fill).', { min: 5, max: 12, unit: 'u' }],
  ['mark.rBattalion', 8.5, 'Radius of the disc of a battalion (echelon 1): a little larger.', { min: 5, max: 14, unit: 'u' }],
  ['ring.light', 1.5, 'Width of the light ring around a disc or a standard.', { min: 0.5, max: 3, unit: 'u' }],
  ['ring.dark', 1, 'Width of the dark hairline outside the light ring.', { min: 0, max: 2, unit: 'u' }],
  ['glyph.size', 3.4, 'Half-size of the arm glyph (infantry saltire, cavalry slash, artillery dot).', { min: 2, max: 6, unit: 'u' }],
  ['glyph.stroke', 1.9, 'Stroke width of the arm glyph.', { min: 1, max: 3.2, unit: 'u' }],
  ['unit.shape.confederate', 'square', 'Silhouette of a Confederate unit mark (the side is redundant in colour and shape): square or circle.'],
  // ---- the formation standard (a brigade, a division, a corps record, and the crowd mark) ------------------------------------------------------------------------------------
  ['flag.w.brigade', 26, 'Width of a brigade standard.', { min: 14, max: 48, unit: 'u' }],
  ['flag.h.brigade', 17, 'Height of a brigade standard.', { min: 10, max: 36, unit: 'u' }],
  ['flag.w.division', 32, 'Width of a division standard.', { min: 14, max: 56, unit: 'u' }],
  ['flag.h.division', 21, 'Height of a division standard.', { min: 10, max: 40, unit: 'u' }],
  ['flag.w.corps', 38, 'Width of a corps standard.', { min: 14, max: 64, unit: 'u' }],
  ['flag.h.corps', 25, 'Height of a corps standard.', { min: 10, max: 44, unit: 'u' }],
  ['flag.w.crowd', 28, 'Width of the crowd mark (a standard that stands for several records).', { min: 14, max: 48, unit: 'u' }],
  ['flag.h.crowd', 19, 'Height of the crowd mark.', { min: 10, max: 36, unit: 'u' }],
  ['flag.notch', 5, 'Depth of the swallow-tail (Union) or of the point (Confederate) at the fly end.', { min: 0, max: 10, unit: 'u' }],
  ['flag.radius', 2.5, 'Corner radius of a standard.', { min: 0, max: 8, unit: 'u' }],
  ['flag.stack', 3.5, 'Offset of the standard behind the crowd mark: "this stands for several records".', { min: 0, max: 8, unit: 'u' }],
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
  // ---- the one device for age: a carried-forward mark fades toward neutral ------------------------------------------------------------------------------------------------------
  ['fade.desat', 0.55, 'How far the fill of a mark at least a battle day old is drained of its colour toward the grey of the same lightness: age is a fading ink, and the glyph keeps its contrast.', { min: 0, max: 0.9 }],
  ['fade.fill', 0.16, 'How far the fill of such a mark is then mixed toward the neutral (a light touch: it should look faded, not washed out).', { min: 0, max: 0.9 }],
  ['fade.ring', 0.4, 'Opacity lost by the light ring of such a mark.', { min: 0, max: 0.8 }],
  ['fade.glyph', 0.1, 'Opacity lost by the glyph of such a mark (it stays well above 3:1).', { min: 0, max: 0.4 }],
  // ---- hull: the soft shape of a formation, shown on interaction ---------------------------------------------------------------------------------------------------------------
  ['hull.pad', 15, 'How far the hull reaches beyond the true positions of the records it joins.', { min: 4, max: 40, unit: 'u' }],
  ['hull.alpha', 0.13, 'Opacity of the hull fill (the rim is where the soft stroke and the fill overlap).', { min: 0.04, max: 0.5 }],
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
  contrast: { label: 'high contrast', set: { 'color.union': '#0a3d86', 'color.confederate': '#a8300c', 'ring.light': 2, 'text.haloAlpha': 1, 'fade.desat': 0.35, 'fade.fill': 0.1, 'fade.ring': 0.25, 'fade.glyph': 0.05, 'hull.alpha': 0.24 } },
};
/** the dark family: the aerial ground, white ink with a dark halo */
export const DA_SET = { 'text.ink': '#ffffff', 'text.halo': '#08111a', 'text.haloAlpha': 0.9, 'hull.alpha': 0.18, 'color.fade': '#56616d', 'fade.desat': 0.65, 'fade.fill': 0.2 };
export const DA_VARIANTS = {
  cvd: { label: 'colour-blind safe', set: { 'color.union': '#1a5aab', 'color.confederate': '#bd5209', 'color.unknown': '#d8c24a' } },
  contrast: { label: 'high contrast', set: { 'color.union': '#1d5fb0', 'color.confederate': '#c8481a', 'ring.light': 2, 'text.haloAlpha': 1, 'fade.desat': 0.35, 'fade.fill': 0.1, 'fade.ring': 0.25, 'fade.glyph': 0.05, 'hull.alpha': 0.28 } },
};

/** the one device for age: the fill of a mark, drained of its colour toward the grey of the same lightness (fade.desat) and touched with the neutral (fade.fill), by `b` (0 fresh .. 1 a battle day or more).
 *  Shared by the skin and by the colour tests, so the tests measure exactly what is drawn. */
export function fadeFill(P, hex, b) {
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)); const y = 0.299 * v[0] + 0.587 * v[1] + 0.114 * v[2]; const kd = P['fade.desat'] * b; const f = [1, 3, 5].map((i) => parseInt(P['color.fade'].slice(i, i + 2), 16)); const kf = P['fade.fill'] * b;
  return '#' + v.map((c, i) => { const d = c + (y - c) * kd; return Math.round(d + (f[i] - d) * kf).toString(16).padStart(2, '0'); }).join('');
}

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
  ['color.unknownInk', '#1B1405', 'Ink of the glyph and of the count on the contested amber.'],
  ['color.glyph', '#ffffff', 'Ink of the arm glyph, the bars and the count inside a fresh mark.'],
  ['color.ringLight', '#ffffff', 'The light ring that separates a mark from any ground.'],
  ['color.ringDark', '#0a1018', 'The dark ring: on the light ground it is the outermost ring (the silhouette), on the dark ground it lies inside the light one.'],
  ['ring.outer', 'dark', 'Which ring is outermost: dark on the light ground, light on the dark ground, so the silhouette of every mark is at least 4.5:1 against what it stands on.'],
  ['color.accent', '#ffc21a', 'Selection, focus and the interface highlight (amber).'],
  // ---- ink of the text beside a mark: the theme of the ground it stands on -----------------------------------------------------------------------------------------------------
  ['text.ink', '#17202b', 'Colour of the code and name beside a mark (dark ink on the light ground, white on the dark one).'],
  ['text.halo', '#f4f6f2', 'Colour of the halo that keeps the text legible on any ground.'],
  ['text.haloAlpha', 0.94, 'Opacity of the solid inner halo.', { min: 0.5, max: 1 }],
  ['text.haloWidth', 3.8, 'Width of the halo stroke (it extends half of this around each letter).', { min: 0, max: 8, unit: 'u' }],
  ['text.formUnion', '#123f7a', 'Ink of the name of a Union formation (brigade, division, corps): the side in deep ink, so the formation tier is set apart from the units by colour and weight, not only by size.'],
  ['text.formConfederate', '#8e2c0e', 'Ink of the name of a Confederate formation.'],
  // ---- the unit mark (a regiment, a battery, a battalion): a bold disc; infantry is the plain disc, cavalry a slash, artillery a dot -----------------------------------------------
  ['mark.r', 7.5, 'Radius of the disc of a regiment or a battery (the fill).', { min: 5, max: 12, unit: 'u' }],
  ['mark.rBattalion', 8.5, 'Radius of the disc of a battalion (echelon 1): a little larger.', { min: 5, max: 14, unit: 'u' }],
  ['ring.light', 1.5, 'Width of the light ring around a disc or a standard.', { min: 0.5, max: 3, unit: 'u' }],
  ['ring.dark', 1.25, 'Width of the dark ring around a disc or a standard (opaque).', { min: 0.5, max: 2, unit: 'u' }],
  ['glyph.size', 3.6, 'Half-size of the arm glyph (cavalry slash, artillery dot); infantry, the plain disc, has none.', { min: 2, max: 6, unit: 'u' }],
  ['glyph.stroke', 2.1, 'Stroke width of the arm glyph.', { min: 1, max: 3.2, unit: 'u' }],
  ['unit.shape.confederate', 'square', 'Silhouette of a Confederate unit mark (the side is redundant in colour and shape): square or circle.'],
  // ---- the formation standard (a brigade, a division, a corps record) and the crowd mark (a tab with a pile behind it) -------------------------------------------------------------
  ['flag.w.brigade', 32, 'Width of a brigade standard.', { min: 14, max: 56, unit: 'u' }],
  ['flag.h.brigade', 20, 'Height of a brigade standard.', { min: 10, max: 40, unit: 'u' }],
  ['flag.w.division', 40, 'Width of a division standard.', { min: 14, max: 64, unit: 'u' }],
  ['flag.h.division', 25, 'Height of a division standard.', { min: 10, max: 44, unit: 'u' }],
  ['flag.w.corps', 48, 'Width of a corps standard.', { min: 14, max: 72, unit: 'u' }],
  ['flag.h.corps', 30, 'Height of a corps standard.', { min: 10, max: 48, unit: 'u' }],
  ['flag.w.crowd', 25, 'Width of the crowd mark (a tab that stands for several records).', { min: 14, max: 48, unit: 'u' }],
  ['flag.h.crowd', 17, 'Height of the crowd mark.', { min: 10, max: 36, unit: 'u' }],
  ['flag.notch', 5, 'Depth of the swallow-tail (Union) or of the point (Confederate) at the fly end of a standard.', { min: 0, max: 10, unit: 'u' }],
  ['flag.radius', 2.5, 'Corner radius of a standard.', { min: 0, max: 8, unit: 'u' }],
  ['flag.stack', 3, 'Offset of the tab behind the crowd mark: "this stands for several records".', { min: 0, max: 8, unit: 'u' }],
  ['crowd.lineDy', 7, 'Half the distance between the two lines of a crowd name: who on the first, what on the second.', { min: 5, max: 10, unit: 'u' }],
  ['bar.len', 11, 'Width of a chevron of a formation standard (one chevron a brigade, two a division, three a corps).', { min: 6, max: 20, unit: 'u' }],
  ['bar.h', 2.1, 'Stroke of a chevron.', { min: 1, max: 4, unit: 'u' }],
  ['bar.pitch', 4.4, 'Distance between two chevrons.', { min: 3, max: 8, unit: 'u' }],
  // ---- the footprint ---------------------------------------------------------------------------------------------------------------------------------------------------------
  ['gap.text', 3, 'Space between the mark and its text.', { min: 0, max: 8, unit: 'u' }],
  ['pad.left', 2, 'Space left of the mark inside the footprint (the selection ring lives here).', { min: 0, max: 6, unit: 'u' }],
  ['pad.right', 2, 'Space right of the text inside the footprint (half of the halo).', { min: 0, max: 6, unit: 'u' }],
  ['pad.band', 2, 'Reserved band around the mark for the hover and selection rings.', { min: 1, max: 4, unit: 'u' }],
  // ---- age: a carried-forward mark is OUTLINED, not ghosted: a pale tint of its own hue inside an outline in the side colour, so it keeps the contrast of a fresh one -----------------------------------
  ['color.fade', '#f7f9f6', 'The ground colour the fill of an old mark is tinted toward (paper on the light ground, near-black on the dark one).'],
  ['fade.fill', 0.75, 'How far the fill of a mark at least a battle day old is mixed toward the ground colour: a pale tint of its own hue.', { min: 0.3, max: 0.92 }],
  ['age.outline', 2.2, 'Width of the outline, in the side colour, of a mark at least a battle day old.', { min: 1, max: 3.5, unit: 'u' }],
  ['age.union', '#1b539e', 'Ink of the outline, the glyph and the count of an aged Union mark.'],
  ['age.confederate', '#963515', 'Ink of the outline, the glyph and the count of an aged Confederate mark.'],
  // ---- hull: the records of a formation as dots and hairlines, shown on interaction ---------------------------------------------------------------------------------------------------------------
  ['hull.alpha', 0.62, 'Opacity of the hairlines that join the true positions of a formation (a spanning tree: no outline, no taper, no wedge).', { min: 0.1, max: 1 }],
  ['hull.dot', 2.6, 'Radius of the dot at the true position of each record.', { min: 1, max: 5, unit: 'u' }],
  // ---- leader and pin: the thin line from a displaced mark to the place it truly stands --------------------------------------------------------------------------------------------
  ['leader.width', 1, 'Width of the leader line.', { min: 0.5, max: 3, unit: 'u' }],
  ['leader.alpha', 0.85, 'Opacity of the leader line.', { min: 0.2, max: 1 }],
  ['leader.minGap', 14, 'A leader and a pin are drawn only when the true position is at least this far outside the mark (the selected and hovered mark always).', { min: 0, max: 40, unit: 'u' }],
  ['pin.r', 2, 'Radius of the dot at a true position (white ring and dark hairline are added).', { min: 1, max: 4, unit: 'u' }],
  // ---- place names (the ground's own text) ----------------------------------------------------------------------------------------------------------------------------------
  ['place.fromZoom', 13.2, 'Zoom from which place names appear.', { min: 10, max: 18, unit: 'zoom' }],
  ['place.dot', 2.2, 'Radius of the dot of a place (a ring when the position is in doubt).', { min: 1, max: 5, unit: 'u' }],
  // ---- the safe area: a mark whose box comes within this distance of the edge of the map fades out whole, so no mark is ever cut ------------------------------------------------------------------
  ['edge.fadePx', 14, 'Width of the band at every edge of the map in which a whole mark fades in or out (it is never cut in two).', { min: 0, max: 80, unit: 'u' }],
  // ---- motion: the language of arrival, selection, growth -------------------------------------------------------------------------------------------------------------------------
  ['motion.selectMs', 240, 'Time constant of the selection ring (it draws itself around the mark).', { min: 0, max: 800, unit: 'ms' }],
  ['motion.hoverMs', 130, 'Time constant of the hover ring and of the lift.', { min: 0, max: 800, unit: 'ms' }],
  ['motion.rippleMs', 520, 'Duration of the ring that leaves a mark when it arrives.', { min: 0, max: 1500, unit: 'ms' }],
];

/** the light family: the survey print, dark ink with a pale halo */
export const DP_VARIANTS = {
  cvd: { label: 'colour-blind safe', set: { 'color.union': '#0b5cad', 'color.confederate': '#b84f06', 'color.unknown': '#c9b037', 'age.union': '#094c8f', 'age.confederate': '#853904', 'fade.fill': 0.68 } },
  contrast: { label: 'high contrast', set: { 'color.union': '#0a3d86', 'color.confederate': '#a8300c', 'ring.light': 2, 'text.haloAlpha': 1, 'fade.fill': 0.73, 'age.union': '#0a3d86', 'age.confederate': '#932a0b', 'age.outline': 2.6, 'hull.alpha': 0.8 } },
};
/** the dark family: the aerial ground, white ink with a dark halo */
export const DA_SET = { 'ring.outer': 'light', 'text.ink': '#ffffff', 'text.halo': '#08111a', 'text.haloAlpha': 0.9, 'hull.alpha': 0.8, 'color.fade': '#0b1119', 'fade.fill': 0.78, 'text.formUnion': '#a9cbf7', 'text.formConfederate': '#ffb59b', 'age.union': '#8fbcf6', 'age.confederate': '#ffa383' };
export const DA_VARIANTS = {
  cvd: { label: 'colour-blind safe', set: { 'color.union': '#1a5aab', 'color.confederate': '#bd5209', 'color.unknown': '#d8c24a', 'age.union': '#8cbcf8', 'age.confederate': '#ffb06a' } },
  contrast: { label: 'high contrast', set: { 'color.union': '#1d5fb0', 'color.confederate': '#c8481a', 'ring.light': 2, 'text.haloAlpha': 1, 'fade.fill': 0.7, 'age.outline': 2.6, 'hull.alpha': 0.9, 'age.union': '#a9cbf7', 'age.confederate': '#ffb59b' } },
};

/** how far a mark has aged, as the language draws it: nothing until half a battle day, then a quick (not a slow) change to the old look, so no mark rests in the mid-tone (b: 0 fresh .. 1 a day or more) */
export const fadeT = (b) => { const u = Math.max(0, Math.min(1, (b - 0.45) / 0.25)); return u * u * (3 - 2 * u); };
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const lum = (hex) => { const [r, g, bl] = rgb(hex).map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * bl; };
export const contrastOf = (a, b) => { const x = lum(a); const y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
/** the fill of a mark of age b: its own hue mixed toward the ground colour (a pale tint), by fade.fill, as b goes from 0 to 1.  Shared by the skin and by the colour tests. */
export function fadeFill(P, hex, b) {
  const t = fadeT(b); const v = rgb(hex); const f = rgb(P['color.fade']); const kf = P['fade.fill'] * t;
  return '#' + v.map((c, i) => Math.round(c + (f[i] - c) * kf).toString(16).padStart(2, '0')).join('');
}
/** the ink of the outline, the glyph, the bars and the count of a mark of age b: white while it is fresh, the side's own ink once the fill has paled (the change happens in the quick part of fadeT, never in the mid-tone) */
export function ageInk(P, side, b) { return fadeT(b) < 0.5 ? P['color.glyph'] : (side === 'union' ? P['age.union'] : P['age.confederate']); }

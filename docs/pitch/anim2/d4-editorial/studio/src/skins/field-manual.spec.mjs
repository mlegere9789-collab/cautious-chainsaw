// skins/field-manual.spec.mjs - THE TOKENS OF THE FIELD MANUAL SKIN.  Edit a value, run `node docs/pitch/anim/prototype/build.mjs`, reload.  Or try it live without a build:
//   open battle-studio.html?skin=field-manual&skinset={"field-manual":{"frame.width":2,"color.union":"#0b4f9e"}}      (console: __skinKit.setToken('field-manual', 'frame.width', 2))
// Row = [name, value, what it does, { min, max, unit }].  Every row is read by the drawing code and checked by test/skins.test.mjs (a token nobody reads, or read but not listed, fails).
export const FM_TOKENS = [
  // palette (Documented side colours are the only colours that mean a side; unknown is neutral grey with hatching and never a side colour)
  ['color.union', '#17489a', 'Union frame, arm glyph, gauge and aggregate pill'],
  ['color.confederate', '#c8441f', 'Confederate frame, arm glyph, gauge and aggregate pill'],
  ['color.unknown', '#6d6a63', 'Contested side (id prefix and state code disagree): neutral grey with hatching, never a side colour'],
  ['color.accent', '#f59e0b', 'Selection ring'],
  ['color.plate', '#fdfbf6', 'Plate of a tile whose latest keyframe is fresh'],
  ['color.plateOld', '#ebe7dc', 'Plate of a tile that is carried forward (older than a day)'],
  ['color.ink', '#111827', 'Text ink on the plate'],
  ['color.keyline', '#ffffff', 'One-pixel halo outside the frame: keeps the frame readable on any imagery'],
  ['color.track', '#c4bfb0', 'Empty part of the strength gauge'],
  // construction
  ['plate.alpha', 0.97, 'Opacity of the plate', { min: 0.6, max: 1 }],
  ['frame.width', 1.5, 'Frame line width', { min: 1, max: 3, unit: 'px' }],
  ['frame.dash', 5, 'Dash length of a carried-forward frame', { min: 2, max: 10, unit: 'px' }],
  ['frame.gap', 2.6, 'Gap of a carried-forward frame (blends in from 0 as the keyframe ages)', { min: 0.5, max: 6, unit: 'px' }],
  ['frame.chamfer', 4, 'Corner cut of the Confederate silhouette', { min: 0, max: 7, unit: 'px' }],
  ['band.width', 3, 'Solid side-colour band on the left edge of the plate: the side at a glance, at any zoom', { min: 0, max: 6, unit: 'px' }],
  ['cell.tint', 0.14, 'Side tint behind the arm glyph', { min: 0, max: 0.4 }],
  ['glyph.weight', 1.5, 'Stroke weight of the arm glyph and echelon marks', { min: 1, max: 2.5, unit: 'px' }],
  ['gauge.height', 3, 'Strength gauge thickness', { min: 2, max: 5, unit: 'px' }],
  ['gauge.segments', 5, 'Segments of the strength gauge (a gauge, not a measurement)', { min: 3, max: 10 }],
  ['ink.modelled', 0.78, 'Opacity of Modelled marks (posture, gauge): they must not look as firm as Documented ones', { min: 0.4, max: 1 }],
  ['hatch.pitch', 5, 'Spacing of the hatching on a contested tile', { min: 3, max: 9, unit: 'px' }],
  // detail by zoom
  ['lod.posture', 13.6, 'Zoom at which the posture mark starts to appear (secondary detail)', { min: 11, max: 18 }],
  ['lod.span', 0.7, 'Zoom range over which secondary detail fades in', { min: 0.2, max: 2 }],
  // motion (wall-clock; the display layer owns arrival and departure timing)
  ['motion.selectMs', 120, 'Ease of the selection ring', { min: 0, max: 600, unit: 'ms' }],
  ['motion.hoverMs', 80, 'Ease of the hover response', { min: 0, max: 600, unit: 'ms' }],
  ['motion.crossMs', 220, 'Cross-fade when a keyframe changes a unit\'s posture or transit state', { min: 0, max: 800, unit: 'ms' }],
];

// Variants: the same drawing under another token set.
export const FM_VARIANTS = {
  cvd: { label: 'colour-blind safe', set: {
    'color.union': '#00609b', 'color.confederate': '#d26400', 'color.unknown': '#666666', 'color.accent': '#e8c600', 'color.track': '#b7b2a3',
    'frame.width': 1.8, 'hatch.pitch': 4 } },
  contrast: { label: 'high contrast', set: {
    'color.union': '#00307a', 'color.confederate': '#b83400', 'color.unknown': '#555555', 'color.accent': '#ffd400', 'color.plate': '#ffffff', 'color.plateOld': '#e6e6e6',
    'color.ink': '#000000', 'color.keyline': '#ffffff', 'color.track': '#8a8a8a', 'plate.alpha': 1, 'frame.width': 2.4, 'ink.modelled': 1, 'cell.tint': 0.0, 'glyph.weight': 2 } },
};

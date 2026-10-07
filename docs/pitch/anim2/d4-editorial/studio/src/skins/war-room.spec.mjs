// skins/war-room.spec.mjs - THE TOKENS OF THE WAR ROOM SKIN.  Edit a value, run `node docs/pitch/anim/prototype/build.mjs`, reload; or try it live:
//   open battle-studio.html?skin=war-room&skinset={"war-room":{"rim.glow":0.6,"color.union":"#3fa0ff"}}      (console: __skinKit.setToken('war-room', 'rim.glow', 0.6))
// Row = [name, value, what it does, { min, max, unit }].  Every row is read by the drawing code and checked by test/skins.test.mjs.
export const WR_TOKENS = [
  // palette: light on dark.  Side colours are the only colours that mean a side; grey with hatching is the contested side and never a side colour
  ['color.union', '#8fd0ff', 'Union rim light, glyph, meter and pill'],
  ['color.confederate', '#ff6b35', 'Confederate rim light, glyph, meter and pill'],
  ['color.unknown', '#a9b2bb', 'Contested side: neutral grey with hatching, never a side colour'],
  ['color.accent', '#ffe066', 'Selection brackets'],
  ['color.plateTop', '#212d3c', 'Top of the glass plate (a tile whose latest keyframe is fresh)'],
  ['color.plateBottom', '#0e151d', 'Bottom of the glass plate'],
  ['color.plateOld', '#1b222b', 'Plate of a tile carried forward for a day or more: flat, unlit'],
  ['color.ink', '#eef3f9', 'Text and aggregate pill ink'],
  ['color.dim', '#93a5b9', 'Secondary ink (posture marks, modelled marks)'],
  ['color.off', '#2c394a', 'Unlit meter segments'],
  ['color.edge', '#000000', 'Outer contour that separates the plate from any imagery'],
  // construction
  ['plate.alpha', 0.95, 'Opacity of the glass plate', { min: 0.6, max: 1 }],
  ['plate.radius', 5, 'Corner radius of the Union plate', { min: 0, max: 8, unit: 'px' }],
  ['plate.cut', 4, 'Corner cut of the Confederate plate (all four corners)', { min: 1, max: 8, unit: 'px' }],
  ['rim.width', 1.5, 'Rim light thickness (top and left edge)', { min: 1, max: 3, unit: 'px' }],
  ['rim.glow', 0.4, 'Strength of the side-colour glow in the glyph cell when the keyframe is fresh', { min: 0, max: 1 }],
  ['lift.perEchelon', 0.7, 'Pixels a plate floats up per echelon level (depth encodes echelon; the shadow grows with it)', { min: 0, max: 1 }],
  ['shadow.alpha', 0.36, 'Contact shadow darkness', { min: 0, max: 0.8 }],
  ['glyph.weight', 1.6, 'Stroke weight of glyphs', { min: 1, max: 2.6, unit: 'px' }],
  ['glyph.glow', 0.3, 'Glow under glyphs', { min: 0, max: 0.8 }],
  ['meter.segments', 8, 'Segments of the strength meter (a gauge, not a measurement)', { min: 4, max: 12 }],
  ['meter.height', 4, 'Strength meter thickness', { min: 2, max: 6, unit: 'px' }],
  ['ink.modelled', 0.8, 'Opacity of Modelled marks (posture, meter): they must not look as firm as Documented ones', { min: 0.4, max: 1 }],
  ['hatch.pitch', 5, 'Spacing of the hatching on a contested tile', { min: 3, max: 9, unit: 'px' }],
  ['sweep.width', 16, 'Width of the light sweep that reveals a tile on arrival', { min: 6, max: 40, unit: 'px' }],
  // detail by zoom
  ['lod.posture', 13.6, 'Zoom at which the posture mark starts to appear (secondary detail)', { min: 11, max: 18 }],
  ['lod.span', 0.7, 'Zoom range over which secondary detail fades in', { min: 0.2, max: 2 }],
  // motion (wall-clock; the display layer owns arrival and departure timing)
  ['motion.selectMs', 150, 'Ease of the selection brackets', { min: 0, max: 600, unit: 'ms' }],
  ['motion.hoverMs', 90, 'Ease of the hover lift', { min: 0, max: 600, unit: 'ms' }],
  ['motion.crossMs', 240, 'Cross-fade when a keyframe changes a unit\'s posture or transit state', { min: 0, max: 800, unit: 'ms' }],
];

export const WR_VARIANTS = {
  cvd: { label: 'colour-blind safe', set: {
    'color.union': '#7fcbff', 'color.confederate': '#e07b00', 'color.unknown': '#bdbdbd', 'color.accent': '#ffffff', 'rim.width': 1.8, 'hatch.pitch': 4 } },
  contrast: { label: 'high contrast', set: {
    'color.union': '#6fd4ff', 'color.confederate': '#ff7a1a', 'color.unknown': '#f0f0f0', 'color.accent': '#ffffff', 'color.plateTop': '#000000', 'color.plateBottom': '#000000', 'color.plateOld': '#000000',
    'color.ink': '#ffffff', 'color.dim': '#ffffff', 'color.off': '#555b63', 'color.edge': '#ffffff', 'plate.alpha': 1, 'rim.width': 2.4, 'rim.glow': 0, 'ink.modelled': 1, 'glyph.weight': 2, 'shadow.alpha': 0, 'glyph.glow': 0 } },
};

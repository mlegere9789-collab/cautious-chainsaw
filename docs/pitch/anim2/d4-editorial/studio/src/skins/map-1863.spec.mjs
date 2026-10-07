// skins/map-1863.spec.mjs - THE TOKENS OF THE 1863 MAP SKIN.  Edit a value, run `node docs/pitch/anim/prototype/build.mjs`, reload; or try it live:
//   open battle-studio.html?skin=map-1863&skinset={"map-1863":{"color.parchment":"#f1e8d2","frame.width":1.6}}      (console: __skinKit.setToken('map-1863', 'frame.width', 1.6))
// Row = [name, value, what it does, { min, max, unit }].  Every row is read by the drawing code and checked by test/skins.test.mjs.
export const M63_TOKENS = [
  // palette: ink on parchment, blue and red washes (the blue and red bars of period maps, 04-benchmarks.md R08)
  ['color.union', '#1f3d7a', 'Union flag, wash and gauge (blue)'],
  ['color.confederate', '#c0402a', 'Confederate flag, wash and gauge (red)'],
  ['color.unknown', '#7a7568', 'Contested side: grey-brown with hatching, never a side colour'],
  ['color.accent', '#d49a14', 'Selection: a gilt ring'],
  ['color.parchment', '#f0e7d0', 'Tablet of a tile whose latest keyframe is fresh (drawn in ink)'],
  ['color.parchmentOld', '#ddd5bf', 'Tablet of a tile carried forward for a day or more (drawn in pencil)'],
  ['color.ink', '#2a2017', 'Ink: frame, text, glyphs'],
  ['color.divRed', '#c0392b', 'First-division badge colour (circular of 21 March 1863)'],
  ['color.divWhite', '#fbf8ef', 'Second-division badge colour'],
  ['color.divBlue', '#2f66bf', 'Third-division badge colour'],
  ['color.keyline', '#fffdf6', 'Pale halo outside the frame: keeps the tablet readable on any imagery'],
  // construction
  ['frame.width', 1.4, 'Ink rule around the tablet', { min: 1, max: 3, unit: 'px' }],
  ['frame.radius', 2, 'Corner radius of the tablet', { min: 0, max: 6, unit: 'px' }],
  ['rule.inner', 0.45, 'Opacity of the inner hairline rule (the cartouche)', { min: 0, max: 1 }],
  ['flag.tail', 4.5, 'Depth of the Union swallow-tail and the Confederate point', { min: 2, max: 8, unit: 'px' }],
  ['glyph.weight', 1.5, 'Stroke weight of the arm pictograms', { min: 1, max: 2.5, unit: 'px' }],
  ['gauge.height', 4, 'Pencilled strength band thickness', { min: 3, max: 6, unit: 'px' }],
  ['pencil.dash', 1.8, 'Dash of a pencilled (Modelled or carried-forward) line', { min: 1, max: 4, unit: 'px' }],
  ['ink.modelled', 0.72, 'Opacity of pencilled (Modelled) marks', { min: 0.4, max: 1 }],
  ['hatch.pitch', 4.5, 'Spacing of the hatching on a contested tile', { min: 3, max: 9, unit: 'px' }],
  ['badge.size', 4.4, 'Radius of the corps badge medallion', { min: 3.5, max: 6, unit: 'px' }],
  // detail by zoom
  ['lod.posture', 13.6, 'Zoom at which the posture mark starts to appear (secondary detail)', { min: 11, max: 18 }],
  ['lod.badge', 13.0, 'Zoom at which the corps badge starts to appear (secondary detail)', { min: 11, max: 18 }],
  ['lod.span', 0.7, 'Zoom range over which secondary detail fades in', { min: 0.2, max: 2 }],
  // motion (wall-clock; the display layer owns arrival and departure timing)
  ['motion.selectMs', 140, 'Ease of the gilt selection ring', { min: 0, max: 600, unit: 'ms' }],
  ['motion.hoverMs', 90, 'Ease of the hover warmth', { min: 0, max: 600, unit: 'ms' }],
  ['motion.crossMs', 240, 'Cross-fade when a keyframe changes a unit\'s posture or transit state', { min: 0, max: 800, unit: 'ms' }],
];

export const M63_VARIANTS = {
  cvd: { label: 'colour-blind safe', set: {
    'color.union': '#183f87', 'color.confederate': '#c25400', 'color.unknown': '#767676', 'color.accent': '#e8c600', 'frame.width': 1.7 } },
  contrast: { label: 'high contrast', set: {
    'color.union': '#06308f', 'color.confederate': '#c43a00', 'color.unknown': '#6a6a6a', 'color.accent': '#ffd400', 'color.parchment': '#ffffff', 'color.parchmentOld': '#e8e8e8', 'color.ink': '#000000',
    'color.divRed': '#b00020', 'color.divWhite': '#ffffff', 'color.divBlue': '#0044cc', 'color.keyline': '#ffffff', 'frame.width': 2.4, 'ink.modelled': 1, 'glyph.weight': 2, 'rule.inner': 0 } },
};

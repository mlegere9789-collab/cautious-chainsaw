// looks.mjs - the LOOKS of the backdrop, as data.  A look is a recipe, not code: how the aerial tile is graded when it is baked, how the hillshade is laid on it, and how
// the vector layers (water, roads, contours, labels) are drawn at each zoom.  Add a look = add an object here (or call registerLook at run time); nothing else changes.
//
// grade: a list of canvas compositing steps applied to each 512-px aerial tile once, when it is baked (never per frame):
//   { op: <globalCompositeOperation>, color: '#rrggbb', alpha: 0..1 }       fills the tile with colour under that blend mode.
//   'saturation' with a gray fill = desaturate (alpha 0.55 keeps 45 % of the colour); 'multiply' = darken / tint; 'screen' = lift the blacks; 'soft-light' / 'overlay' = tone.
// shade: how the hillshade tile (gray, 128 = flat) is laid on the graded aerial: { op, alpha }.  alpha 0 = none.
// stops: [[zoom, value], ...] linear in zoom, flat beyond the ends.  Colours are CSS strings.  Widths are CSS px.
// roads.fade: stops of an alpha multiplier for the road and rail overlay; zoomed in past 16.3 the aerial shows the real road, so the overlay thins to 30 % by 17.4 (road names stay).
// Evidence: the imagery is MEASURED modern ground (NAIP, April-May 2022), not the 1863 landscape; the look never claims otherwise (see README, 'What the picture is').

export const LOOKS = {
  // the default under the unit tiles: dark, desaturated, calm; relief and water read, nothing shouts
  dim: {
    id: 'dim', label: 'Dim aerial', theme: 'dark',
    doc: 'NAIP aerial, desaturated and darkened so symbols pop, lit by 3DEP hillshade; faint contours, water and roads.',
    ground: '#0d1013',
    grade: [
      { op: 'saturation', color: '#808080', alpha: 0.45 },
      { self: 'overlay', alpha: 0.6 },
      { op: 'multiply', color: '#9aa2ab', alpha: 1 },
      { op: 'soft-light', color: '#1d3045', alpha: 0.34 },
      { op: 'screen', color: '#080b10', alpha: 1 },
    ],
    shade: { op: 'soft-light', alpha: 0.5 },
    vignette: { color: '#05070a', alpha: 0.38, inner: 0.55 },
    edge: { fadePx: 160 },
    contours: { color: '#cfe0f2', minor: { alpha: [[14.8, 0], [16, 0.11]], width: 0.6 }, major: { alpha: [[13.4, 0.06], [15, 0.2]], width: [[13.4, 0.6], [16, 1]] } },
    water: { fill: 'rgba(63,104,140,0.55)', line: [[13, 0.9], [16, 1.6]], lineColor: 'rgba(96,150,196,0.75)', lineAlpha: [[13, 0.7], [16, 0.9]] },
    roads: {
      casing: { color: 'rgba(8,10,13,0.55)', extra: 1.6 },
      primary: { color: 'rgba(238,241,246,0.62)', width: [[13, 1.3], [16, 3.4], [18, 6]] },
      secondary: { color: 'rgba(226,231,238,0.50)', width: [[13, 1.0], [16, 2.6], [18, 5]] },
      local: { color: 'rgba(214,220,228,0.34)', width: [[14, 0.5], [16, 1.6], [18, 3.2]], minZoom: 13.4 },
      trail: { color: 'rgba(214,220,228,0.22)', width: [[15.5, 0.6], [17, 1.1]], dash: [3, 3], minZoom: 15.5 },
      rail: { color: 'rgba(198,206,216,0.45)', width: [[13, 1], [16, 1.8]], tick: true },
      fade: [[16.3, 1], [17.4, 0.3]],
    },
    labels: {
      font: '600 11px "Segoe UI", system-ui, sans-serif', placeFont: '600 11px "Segoe UI", system-ui, sans-serif', roadFont: '600 10px "Segoe UI", system-ui, sans-serif',
      place: '#e7ecf2', placeHalo: 'rgba(10,13,17,0.82)', road: 'rgba(225,230,237,0.78)', roadHalo: 'rgba(10,13,17,0.78)', water: 'rgba(150,190,226,0.85)',
      dot: '#e7ecf2', dotRing: 'rgba(10,13,17,0.7)', tracking: 0.6,
    },
  },

  // the aerial as it is, only gently graded: for a skin that wants real ground under it
  natural: {
    id: 'natural', label: 'Natural aerial', theme: 'dark',
    doc: 'NAIP aerial in near-natural colour, slightly muted, with soft relief.',
    ground: '#14181b',
    grade: [
      { op: 'saturation', color: '#808080', alpha: 0.16 },
      { self: 'overlay', alpha: 0.3 },
      { op: 'multiply', color: '#d4d8dc', alpha: 1 },
      { op: 'soft-light', color: '#31404f', alpha: 0.16 },
    ],
    shade: { op: 'soft-light', alpha: 0.5 },
    vignette: { color: '#05070a', alpha: 0.22, inner: 0.62 },
    edge: { fadePx: 160 },
    contours: { color: '#f2f6fb', minor: { alpha: [[14.8, 0], [16, 0.12]], width: 0.6 }, major: { alpha: [[13.4, 0.08], [15, 0.28]], width: [[13.4, 0.6], [16, 1]] } },
    water: { fill: 'rgba(60,110,150,0.45)', line: [[13, 0.9], [16, 1.6]], lineColor: 'rgba(120,175,220,0.8)', lineAlpha: [[13, 0.8], [16, 1]] },
    roads: {
      casing: { color: 'rgba(0,0,0,0.38)', extra: 1.4 },
      primary: { color: 'rgba(255,255,255,0.7)', width: [[13, 1.3], [16, 3.4], [18, 6]] },
      secondary: { color: 'rgba(255,255,255,0.58)', width: [[13, 1.0], [16, 2.6], [18, 5]] },
      local: { color: 'rgba(255,255,255,0.4)', width: [[14, 0.5], [16, 1.6], [18, 3.2]], minZoom: 13.4 },
      trail: { color: 'rgba(255,255,255,0.28)', width: [[15.5, 0.6], [17, 1.1]], dash: [3, 3], minZoom: 15.5 },
      rail: { color: 'rgba(235,238,242,0.55)', width: [[13, 1], [16, 1.8]], tick: true },
      fade: [[16.3, 1], [17.4, 0.3]],
    },
    labels: {
      font: '600 11px "Segoe UI", system-ui, sans-serif', placeFont: '600 11px "Segoe UI", system-ui, sans-serif', roadFont: '600 10px "Segoe UI", system-ui, sans-serif',
      place: '#f4f7fa', placeHalo: 'rgba(8,11,14,0.85)', road: 'rgba(240,244,248,0.85)', roadHalo: 'rgba(8,11,14,0.8)', water: 'rgba(170,205,238,0.9)',
      dot: '#f4f7fa', dotRing: 'rgba(8,11,14,0.7)', tracking: 0.6,
    },
  },

  // darkest: almost monochrome, for skins with strong colour
  slate: {
    id: 'slate', label: 'Slate relief', theme: 'dark',
    doc: 'Near-monochrome blue-grey aerial with strong relief: the quietest ground for saturated symbols.',
    ground: '#0a0d10',
    grade: [
      { op: 'saturation', color: '#808080', alpha: 1 },
      { self: 'overlay', alpha: 0.7 },
      { op: 'multiply', color: '#8f98a2', alpha: 1 },
      { op: 'soft-light', color: '#2a4a66', alpha: 0.42 },
      { op: 'screen', color: '#080d13', alpha: 1 },
    ],
    shade: { op: 'soft-light', alpha: 0.5 },
    vignette: { color: '#030507', alpha: 0.5, inner: 0.5 },
    edge: { fadePx: 200 },
    contours: { color: '#b7cde4', minor: { alpha: [[14.8, 0], [16, 0.1]], width: 0.6 }, major: { alpha: [[13.4, 0.08], [15, 0.22]], width: [[13.4, 0.6], [16, 1]] } },
    water: { fill: 'rgba(52,92,128,0.6)', line: [[13, 0.9], [16, 1.6]], lineColor: 'rgba(92,146,194,0.75)', lineAlpha: [[13, 0.7], [16, 0.9]] },
    roads: {
      casing: { color: 'rgba(5,7,10,0.6)', extra: 1.6 },
      primary: { color: 'rgba(214,224,236,0.5)', width: [[13, 1.3], [16, 3.4], [18, 6]] },
      secondary: { color: 'rgba(200,212,226,0.4)', width: [[13, 1.0], [16, 2.6], [18, 5]] },
      local: { color: 'rgba(190,203,218,0.27)', width: [[14, 0.5], [16, 1.6], [18, 3.2]], minZoom: 13.4 },
      trail: { color: 'rgba(190,203,218,0.18)', width: [[15.5, 0.6], [17, 1.1]], dash: [3, 3], minZoom: 15.5 },
      rail: { color: 'rgba(180,194,210,0.4)', width: [[13, 1], [16, 1.8]], tick: true },
      fade: [[16.3, 1], [17.4, 0.3]],
    },
    labels: {
      font: '600 11px "Segoe UI", system-ui, sans-serif', placeFont: '600 11px "Segoe UI", system-ui, sans-serif', roadFont: '600 10px "Segoe UI", system-ui, sans-serif',
      place: '#d9e2ec', placeHalo: 'rgba(6,9,12,0.85)', road: 'rgba(205,216,228,0.72)', roadHalo: 'rgba(6,9,12,0.8)', water: 'rgba(130,172,212,0.85)',
      dot: '#d9e2ec', dotRing: 'rgba(6,9,12,0.7)', tracking: 0.6,
    },
  },

  // light: a faded survey print: warm paper, the aerial ghosted into it, relief and contours in brown
  paper: {
    id: 'paper', label: 'Paper and relief', theme: 'light',
    doc: 'Warm paper with the aerial ghosted in, brown hillshade and contours: a light ground for dark symbols.',
    ground: '#e9e2d1',
    grade: [
      { op: 'saturation', color: '#808080', alpha: 0.86 },
      { self: 'overlay', alpha: 0.35 },
      { op: 'screen', color: '#a39b88', alpha: 1 },
      { op: 'multiply', color: '#ece3cf', alpha: 1 },
      { op: 'soft-light', color: '#b8a074', alpha: 0.30 },
    ],
    shade: { op: 'soft-light', alpha: 0.9, invert: true },
    vignette: { color: '#6b5a3a', alpha: 0.16, inner: 0.6 },
    edge: { fadePx: 160 },
    contours: { color: '#7a5f3a', minor: { alpha: [[14.8, 0], [16, 0.2]], width: 0.5 }, major: { alpha: [[13.4, 0.14], [15, 0.4]], width: [[13.4, 0.6], [16, 0.9]] } },
    water: { fill: 'rgba(122,160,184,0.55)', line: [[13, 0.9], [16, 1.6]], lineColor: 'rgba(86,132,162,0.9)', lineAlpha: [[13, 0.8], [16, 1]] },
    roads: {
      casing: { color: 'rgba(120,98,64,0.55)', extra: 1.4 },
      primary: { color: 'rgba(250,246,236,0.95)', width: [[13, 1.3], [16, 3.4], [18, 6]] },
      secondary: { color: 'rgba(250,246,236,0.9)', width: [[13, 1.0], [16, 2.6], [18, 5]] },
      local: { color: 'rgba(250,246,236,0.8)', width: [[14, 0.5], [16, 1.6], [18, 3.2]], minZoom: 13.4 },
      trail: { color: 'rgba(120,98,64,0.5)', width: [[15.5, 0.6], [17, 1.1]], dash: [3, 3], minZoom: 15.5 },
      rail: { color: 'rgba(90,72,48,0.6)', width: [[13, 1], [16, 1.8]], tick: true },
      fade: [[16.3, 1], [17.4, 0.3]],
    },
    labels: {
      font: '600 11px "Segoe UI", system-ui, sans-serif', placeFont: '600 11px "Segoe UI", system-ui, sans-serif', roadFont: '600 10px "Segoe UI", system-ui, sans-serif',
      place: '#4a3c26', placeHalo: 'rgba(240,234,218,0.9)', road: 'rgba(84,66,40,0.85)', roadHalo: 'rgba(240,234,218,0.88)', water: 'rgba(52,96,128,0.9)',
      dot: '#4a3c26', dotRing: 'rgba(240,234,218,0.9)', tracking: 0.6,
    },
  },
};

/** add or replace a look at run time (the object is used as is; give it an id) */
export function registerLook(look) {
  if (!look || !look.id) throw new Error('registerLook: a look needs an id');
  LOOKS[look.id] = look;
  look.version = (look.version || 0) + 1;
  return look;
}
/** linear interpolation over [[zoom, value], ...]; a plain number passes through */
export function stops(s, z) {
  if (typeof s === 'number') return s;
  if (z <= s[0][0]) return s[0][1];
  for (let i = 1; i < s.length; i++) if (z <= s[i][0]) { const a = s[i - 1], b = s[i]; return a[1] + (b[1] - a[1]) * (z - a[0]) / (b[0] - a[0]); }
  return s[s.length - 1][1];
}
export const ROAD_CLASSES = ['primary', 'secondary', 'local', 'trail'];

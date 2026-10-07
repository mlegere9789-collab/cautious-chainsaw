// src/chips.mjs - the small status chips and the strength gauge: language-independent overlays the skin places on a tile (a corner of the plate, the true-position side).
//
//   posture chips   Modelled (every keyframe's `disposition` is hand-authored, 28 duplicate keys disagree): charge, retreat, march, skirmish, reserve, bivouac
//   arm-state chips Modelled (same field): limbered (artillery), dismounted (cavalry).  The defaults carry no chip: Line of Battle, Deployed Artillery, Mounted Cavalry are the plain symbols (calm by default).
//   identity chip   Unknown: "?" = the unit has no order-of-battle record, its name and arm come from the id alone (the 95 unresolved ids)
// Glyphs are drawn from strokes and dots in the light ink on a dark chip: they hold on every backdrop and need no font.  NONE of them is a NATO or period symbol: invented here, and none points anywhere,
// because the data has no reliable heading (03-data-fuel.md E12: bearing agrees with the real move 47% of the time).
import { Sprite, el, n2, circle, line, poly, ringReach, rings } from './svg.mjs';
import { shadowFilter } from './common.mjs';

export const CHIPS = ['charge', 'retreat', 'march', 'skirmish', 'reserve', 'bivouac', 'limbered', 'dismounted', 'idonly'];
/** dataset disposition string -> chip name (null = the plain symbol) */
export const CHIP_OF_DISPOSITION = {
  'Line of Battle': null, 'Charging Line': 'charge', 'Chaotic Retreat': 'retreat', 'Line of March': 'march', 'Skirmish Line': 'skirmish', Reserve: 'reserve', Bivouac: 'bivouac',
  'Mounted Cavalry': null, 'Dismounted Cavalry': 'dismounted', 'Deployed Artillery': null, 'Limbered Artillery': 'limbered',
};
export const CHIP_TEXT = {
  charge: 'Charging line (Modelled)', retreat: 'Chaotic retreat (Modelled)', march: 'Line of march (Modelled)', skirmish: 'Skirmish line (Modelled)', reserve: 'Reserve posture (Modelled)', bivouac: 'Bivouac posture (Modelled)',
  limbered: 'Limbered artillery (Modelled)', dismounted: 'Dismounted cavalry (Modelled)', idonly: 'Identity from the id alone: no order-of-battle record (Unknown)',
};

function glyph(name, ink, sw) {
  const st = { stroke: ink, strokeWidth: sw, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' }; const dot = (x, y, r) => el('circle', { cx: x, cy: y, r, fill: ink });
  switch (name) {
    case 'charge': { let d = ''; for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; d += line(Math.cos(a) * 1.9, Math.sin(a) * 1.9, Math.cos(a) * 4.5, Math.sin(a) * 4.5); } return el('path', { d, ...st }) + dot(0, 0, 1.15); }
    case 'retreat': return dot(-2.9, -2, 1.3) + dot(2.8, -2.7, 1.2) + dot(0.1, 2.6, 1.3) + dot(3.3, 1.8, 1);
    case 'march': return dot(0, -3.3, 1.25) + dot(0, 0, 1.25) + dot(0, 3.3, 1.25);
    case 'skirmish': return el('path', { d: line(-4.5, 0, -2.7, 0) + line(-0.9, 0, 0.9, 0) + line(2.7, 0, 4.5, 0), ...st, strokeWidth: sw * 1.05 });
    case 'reserve': return el('circle', { cx: 0, cy: 0, r: 3.1, ...st });
    case 'bivouac': return el('path', { d: poly([[-4.4, 3.4], [0, -3.8], [4.4, 3.4]], true) + poly([[-1.3, 3.4], [0, 0.8], [1.3, 3.4]]), ...st, strokeWidth: sw * 0.9 });
    case 'limbered': return el('circle', { cx: -3, cy: 0, r: 1.9, ...st, strokeWidth: sw * 0.85 }) + el('circle', { cx: 3.2, cy: 0, r: 1.3, ...st, strokeWidth: sw * 0.85 }) + el('path', { d: line(-1.1, 0, 1.9, 0), ...st, strokeWidth: sw * 0.85 });
    case 'dismounted': return el('path', { d: line(-2.6, 2.1, 2.7, -2.9) + line(-4.3, 4.3, 4.3, 4.3), ...st });
    case 'idonly': return el('path', { d: 'M-2.3 -2.3C-2.3 -5 2.7 -5 2.7 -2.2C2.7 -0.2 0.2 -0.3 0.2 1.9', ...st }) + dot(0.2, 4.1, 1.1);
    default: return '';
  }
}

export function renderChip(name, T, id) {
  const C = T.chip; const sp = new Sprite(id); const r = C.size / 2; const reach = ringReach(T); const d = circle(0, 0, r);
  const flt = shadowFilter(sp, T);
  sp.add(el('g', { filter: flt }, el('path', { d, fill: T.palette.chip, stroke: T.palette.chip, strokeWidth: 2 * reach })), [-r - reach - 3, -r - reach - 3, r + reach + 3, r + reach + 4]);
  sp.add(rings(d, T) + el('path', { d, fill: T.palette.chip, fillOpacity: C.alpha }));
  sp.add(glyph(name, T.palette.bone, C.stroke));
  const res = sp.finish({ pad: 1 });
  return { ...res, core: [-r - reach + res.ax, -r - reach + res.ay, r + reach + res.ax, r + reach + res.ay], strip: null, shape: 'chip' };
}

/** the strength gauge: `n` of 4 segments lit.  Modelled: a placement keyframe's strength over the unit's reference strength, in quartiles (no false precision). */
export const GAUGE_BINS = [{ n: 0, text: 'under 12.5% of reference strength' }, { n: 1, text: '12.5 to 37.5%' }, { n: 2, text: '37.5 to 62.5%' }, { n: 3, text: '62.5 to 87.5%' }, { n: 4, text: '87.5% and over' }];
export const gaugeLevel = (ratio) => Math.max(0, Math.min(4, Math.round(Math.max(0, Math.min(1, ratio)) * 4)));
export function renderGauge(n, T, id) {
  const G = T.gauge; const sp = new Sprite(id); const segW = G.segW; const gap = G.gap; const h = G.h; const w = 4 * segW + 3 * gap; const reach = ringReach(T) * 0.75;
  const flt = shadowFilter(sp, T);
  const back = `M${n2(-w / 2)} ${n2(-h / 2)}H${n2(w / 2)}V${n2(h / 2)}H${n2(-w / 2)}Z`;
  sp.add(el('g', { filter: flt }, el('path', { d: back, fill: T.palette.chip, stroke: T.palette.chip, strokeWidth: 2 * reach })), [-w / 2 - reach - 3, -h / 2 - reach - 3, w / 2 + reach + 3, h / 2 + reach + 4]);
  let segs = '';
  for (let i = 0; i < 4; i++) {
    const x = -w / 2 + i * (segW + gap); const on = i < n;
    segs += el('rect', { x, y: -h / 2, width: segW, height: h, rx: G.radius, fill: on ? T.palette.bone : T.palette.chip, fillOpacity: on ? 1 : 0.9, stroke: on ? undefined : T.palette.bone, strokeOpacity: on ? undefined : 0.55, strokeWidth: on ? undefined : 0.75 });
  }
  const frame = el('path', { d: back, fill: 'none', stroke: T.palette.keyline, strokeOpacity: T.ring.darkAlpha, strokeWidth: 2 * (reach * 0.5 + 0.5) }) ;
  sp.add(frame + segs);
  const r = sp.finish({ pad: 1 });
  return { ...r, core: [-w / 2 - reach + r.ax, -h / 2 - reach + r.ay, w / 2 + reach + r.ax, h / 2 + reach + r.ay], strip: null, shape: 'gauge' };
}

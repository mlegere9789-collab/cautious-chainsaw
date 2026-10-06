// layout-lab/lib/spec.mjs  (pure; the text table is injected by data.mjs in node or by the lab page in the browser)
// THE TILE SPEC: every number that defines a tile footprint or a layout budget lives here (and nowhere else), so the owner / the motion
// agent can tweak it without touching an algorithm.  Units: CSS px.  Text widths come from out/text-widths.json (measured in Chrome by
// measure-text.mjs); if that file is absent a conservative per-character estimate is used and `textSource` says so.
let TW = null; let textSource = 'estimate';
export function setTextTable(tw) { TW = tw; textSource = 'chrome-measured: ' + (tw.browser || '').replace(/^.*(HeadlessChrome\/[\d.]+|Chrome\/[\d.]+).*$/, '$1'); }
export const TEXT_SOURCE = () => textSource;

const EST = { code: 6.7, label: 6.9, badge: 6.0 };
/** width of a string in a tile font (sum of measured advances x safety factor + 1 px).  kern error measured: worst +-3.7 % (see text-widths.json check). */
export function textWidth(font, s, safety = 1.04) {
  if (!TW) return s.length * EST[font] * safety;
  const adv = TW.fonts[font].adv; let w = 0;
  for (const ch of s) w += adv[ch] ?? adv['M'];
  return w * safety + 1;
}

export const SPECS = {
  // the recommended footprint: 20 px chip (13 px body + 3 px strength bar + 2 x 2 px selection ring), 12 px label
  standard: {
    name: 'standard', chipH: 20, chipPadX: 5, glyphW: 14, glyphGap: 3, chipMinW: 36, ring: 2, badgeGap: 3,
    labelH: 14, labelPadX: 4, labelGap: 2, labelMinZoom: 12,
    gap: 2,            // minimum clearance between any two tile boxes (zero overlap = clearance >= 0; design clearance = gap)
    pinHalf: 2,        // half size of the true-position pin box (px)
    dMax: 48,          // displacement budget of a chip (px); beyond it the tile is aggregated
    band: 12,          // hysteresis band on the budget for splitting an aggregate back into its members
    relax: 2.0,        // px per frame a displaced tile relaxes back toward its true position (inertia)
    splitDwell: 30,    // frames an aggregate must have existed before a split is attempted
    labelShowDelay: 12,// frames a label must be feasible before it may appear (it disappears immediately when it stops fitting)
  },
  // a tighter footprint for the sensitivity run
  compact: {
    name: 'compact', chipH: 16, chipPadX: 4, glyphW: 11, glyphGap: 2, chipMinW: 30, ring: 1.5, badgeGap: 2,
    labelH: 12, labelPadX: 3, labelGap: 2, labelMinZoom: 12,
    gap: 2, pinHalf: 2, dMax: 40, band: 10, relax: 2.0, splitDwell: 30, labelShowDelay: 12,
  },
};

/** code text and label text widths for a leaf, chip and label rect sizes */
export function chipSize(spec, codeText, badgeText = null) {
  const codeW = textWidth('code', codeText);
  let w = spec.chipPadX * 2 + spec.glyphW + spec.glyphGap + codeW + 2 * spec.ring;
  if (badgeText) w += spec.badgeGap + textWidth('badge', badgeText) + 6;
  return { w: Math.max(spec.chipMinW, Math.ceil(w)), h: spec.chipH, codeW };
}
export function labelSize(spec, text) {
  return { w: Math.ceil(textWidth('label', text) + 2 * spec.labelPadX), h: spec.labelH };
}

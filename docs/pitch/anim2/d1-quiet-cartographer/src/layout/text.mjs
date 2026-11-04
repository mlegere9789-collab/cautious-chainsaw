// layout/text.mjs - the text-width model behind every tile footprint.  A tile's chip is as wide as its text, so the zero-overlap guarantee is exactly as good as
// the width model: wider rendered text than modelled would push ink outside its box.  Two sources, one interface:
//   * the TABLE measured in real Chrome 155 on Windows (Segoe UI; data/text-widths.json, validated against measureText of all 478 real short codes: worst error 3.3 %, so a
//     4 % safety factor is applied).  Node tests and the first frame use it, so layout is deterministic everywhere;
//   * a table measured AT RUN TIME in the viewer's own browser with the viewer's own font (measureTextModel), which the app installs before the first solve.
// text.width(font, string) -> CSS px (including the safety factor and 1 px)
// FORK (d1 Quiet Cartographer): the page ships its own face, QC Sans (a subset of Liberation Sans 2.1.5, SIL OFL 1.1; assets/fonts), so the widths below are the same on every machine.
// POLISH ROUND 1: the face is Source Sans 3 (renamed QC Sans), 12 px for lettering and 13 px for the large formations: code = semibold 12 (a unit's code, the count in a flag), codeI = italic 12 (identity from the
// id alone), name = regular 12, brig and form = bold 12 (ROUND 2: one rank of bold: every formation and every crowd, tinted with its side; the flag, not the lettering, carries the rank).
export const FONT_STACK = '"QC Sans", "Source Sans 3", Arial, "Helvetica Neue", sans-serif';
export const FONT_SPECS = { code: `600 12px ${FONT_STACK}`, codeI: `italic 400 12px ${FONT_STACK}`, name: `400 12px ${FONT_STACK}`, brig: `700 12px ${FONT_STACK}`, form: `700 12px ${FONT_STACK}`, label: `400 11px ${FONT_STACK}`, badge: `600 11px ${FONT_STACK}` };
export const CHARSET = (() => { let s = ''; for (let i = 32; i < 127; i++) s += String.fromCharCode(i); return s + '×…·•'; })();

/** @param {{fonts: Record<string,{adv: Record<string,number>}>}} table  @param {number} [safety] */
export function createTextModel(table, safety = 1.04, source = 'table') {
  const fonts = table.fonts;
  return {
    source, safety, table,
    width(font, s) {
      const adv = fonts[font].adv; let w = 0;
      for (const ch of s) w += adv[ch] ?? adv.M;
      return w * safety + 1;
    },
  };
}

/** measure every tile font with a 2D canvas context of the running browser; returns a table in the same shape as data/text-widths.json */
export function measureTable(ctx2d, fontSpecs = FONT_SPECS, chars = CHARSET) {
  const out = { browser: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown', fonts: {} };
  for (const [k, css] of Object.entries(fontSpecs)) {
    ctx2d.font = css; const adv = {};
    for (const ch of chars) adv[ch] = ctx2d.measureText(ch).width;
    out.fonts[k] = { css, adv };
  }
  return out;
}

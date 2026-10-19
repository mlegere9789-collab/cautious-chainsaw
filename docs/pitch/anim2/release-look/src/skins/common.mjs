// skins/common.mjs - what the two looks of this folder (standards.mjs, glyph.mjs) share: what a mark says (pure functions of the display tile or the unit), haloed lettering sprites, a few shapes.
// Nothing here decides how anything LOOKS beyond "text with a halo": each option owns its marks.
import { rgba, mixHex, clamp01 } from './kit.mjs';
import { codeOf, compactName as compactNameOf } from '../layout/words.mjs';
import { FORMATION_KINDS } from './semantics.mjs';

export const TAU = Math.PI * 2;
export const ECH_OF_KIND = { brigade: 1, battalion: 0, division: 2, corps: 3, army: 3 };
export const sideOf = (s) => (s === 'union' || s === 'confederate' || s === 'unknown' || s === 'mixed' ? s : 'unknown');
/** which way a mark reads: +1 to the right (Union, unknown, both sides), -1 to the left (Confederate): the armies face each other */
export const sgnOf = (side) => (side === 'confederate' ? -1 : 1);
export { codeOf };
export function compactName(u) { return u ? compactNameOf(u, FORMATION_KINDS.has(u.kind)) : null; }
const NAMES = new WeakMap();
const nameOfUnit = (u) => { let n = NAMES.get(u); if (n === undefined) { n = compactName(u); NAMES.set(u, n); } return n; };
export function infoOfUnit(u) { const flag = FORMATION_KINDS.has(u.kind); return { flag, side: sideOf(u.side), short: codeOf(u), name: nameOfUnit(u), idOnly: !u.inOob && !flag, count: null, ech: flag ? (ECH_OF_KIND[u.kind] ?? 1) : 0, agg: false, arm: u.arm }; }
export function infoOfAgg(a) { return { flag: true, side: sideOf(a.side), short: a.short, name: a.name || null, idOnly: false, count: a.badge, ech: ECH_OF_KIND[a.kind] || 0, generic: a.kind === 'scope' || a.kind === 'contact', agg: true, arm: 'mixed' }; }
export const infoOfTile = (t) => (t.kind === 'agg' ? infoOfAgg({ short: t.short, name: t.fname, badge: t.badge, kind: t.nameKind, side: t.side }) : infoOfUnit(t.unit));
export const wideScreen = (P) => (typeof innerWidth === 'number' ? innerWidth : 1440) >= P['detail.selectNameMinViewport'];

/** progressive disclosure (the same rule for both options): formations and crowds say their names first (a corps from zoom 11, a division from 12.5, a brigade 13, a crowd 12), a unit says its short code only
 *  at the full zoom (default 15: below it a unit is a small side-and-arm mark), its full name close up; a selected mark always says all it can */
export function textShown(info, z, P, sel) {
  if (sel && z >= P['detail.selectGrowZoom']) return true;
  if (!info.flag) return z >= P['detail.fullZoom'];
  if (info.agg) return z >= P['detail.crowdNameZoom'];
  return z >= (info.ech >= 3 ? P['detail.corpsNameZoom'] : info.ech === 2 ? P['detail.divisionNameZoom'] : P['detail.brigadeNameZoom']);
}
export const detailOf = (z, P) => ({ uname: z >= P['detail.unitNameZoom'], hull: z >= P['detail.hullZoom'], full: z >= P['detail.fullZoom'] });

// ---- lettering sprites: haloed text is rendered once per (face, string, ink, halo) and blitted ------------------------------------------------------------------------------------
const SPR = new Map();
export function makeCanvas(w, h) { if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h); const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
const pxOf = (font) => +(/(\d+(?:\.\d+)?)px/.exec(font) || [0, 12])[1];
let PROBE = null;
/** returns { img, x, y, w, h, tw }: (x, y) is where the text baseline origin lies inside the sprite (CSS px) */
export function lettering(g, font, s, ink, haloHex, haloAlpha) {
  const P = g.P; const dpr = g.dpr; const halo = haloHex || P['color.halo']; const ha = haloAlpha ?? P['halo.alpha']; const key = font + '|' + s + '|' + ink + '|' + dpr + '|' + g.skin.rev + '|' + halo + P['halo.width'] + ha + P['halo.soft'];
  let e = SPR.get(key); if (e) return e;
  const size = pxOf(font); const pad = Math.ceil((P['halo.width'] + (P['halo.soft'] > 0 ? 2 : 0)) / 2) + 1;
  if (!PROBE) PROBE = makeCanvas(4, 4).getContext('2d'); PROBE.font = font; const tw = PROBE.measureText(s).width;
  const w = Math.ceil(tw) + 2 * pad; const h = Math.ceil(size * 1.3) + 2 * pad; const asc = Math.round(size * 0.97) + pad;
  const cv = makeCanvas(Math.ceil(w * dpr), Math.ceil(h * dpr)); const c = cv.getContext('2d'); c.scale(dpr, dpr); c.font = font; c.textBaseline = 'alphabetic'; c.textAlign = 'left'; c.lineJoin = 'round'; c.miterLimit = 2;
  if (P['halo.soft'] > 0 && P['halo.width'] > 0) { c.lineWidth = P['halo.width'] + 2; c.strokeStyle = rgba(halo, P['halo.soft']); c.strokeText(s, pad, asc); }
  if (P['halo.width'] > 0) { c.lineWidth = P['halo.width']; c.strokeStyle = rgba(halo, ha); c.strokeText(s, pad, asc); }
  c.fillStyle = ink; c.fillText(s, pad, asc);
  cv._cloth = haloAlpha === 0;      // a count or a code standing on cloth or a glyph body (asked for without a halo): tools/audit.mjs measures these apart
  e = { img: cv, x: pad, y: asc, w, h, tw }; if (SPR.size > 3000) SPR.clear(); SPR.set(key, e); return e;
}
/** blit a lettering: (x, baseY) = the text's near edge and baseline; `sgn` -1 right-aligns it on x; lo..hi is the footprint's ink range (cuts a text still easing in) */
export function putText(c, g, font, s, x, baseY, ink, alpha, sgn, lo, hi, haloHex) {
  if (!(alpha > 0.004) || !s) return; const sp = lettering(g, font, s, ink, haloHex); const w = sp.w; const h = sp.h; const left = sgn < 0 ? x - sp.tw : x; const dx = left - sp.x; const dy = baseY - sp.y; const base = c.globalAlpha; c.globalAlpha = base * alpha;
  const a = Math.max(dx, lo); const b = Math.min(dx + w, hi);
  if (b - a >= w - 0.01) c.drawImage(sp.img, dx, dy, w, h);
  else if (b > a) c.drawImage(sp.img, (a - dx) * g.dpr, 0, (b - a) * g.dpr, h * g.dpr, a, dy, b - a, h);
  c.globalAlpha = base;
}

export const isLight = (hex) => { const n = parseInt(String(hex).slice(1, 7), 16); return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255) > 150; };
export const rrect = (c, x, y, w, h, r) => { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.arcTo(x + w, y, x + w, y + r, r); c.lineTo(x + w, y + h - r); c.arcTo(x + w, y + h, x + w - r, y + h, r); c.lineTo(x + r, y + h); c.arcTo(x, y + h, x, y + h - r, r); c.lineTo(x, y + r); c.arcTo(x, y, x + r, y, r); c.closePath(); };
export function wrapText(c, text, maxW) { const words = text.split(' '); const lines = []; let line = ''; for (const w of words) { const t = line ? line + ' ' + w : w; if (line && c.measureText(t).width > maxW) { lines.push(line); line = w; } else line = t; } if (line) lines.push(line); return lines; }
export { rgba, mixHex, clamp01 };

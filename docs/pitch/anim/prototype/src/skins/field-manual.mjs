// skins/field-manual.mjs - SKIN 1 of 3: FIELD MANUAL.  A modern cartographic symbol: a pale plate, a side-coloured frame, an arm glyph in a tinted cell, a segmented strength gauge.
//
// Why this direction (04-benchmarks.md, 03-data-fuel.md):
//   * It is the NATO / APP-6 grammar the research recommends (R01, R02): frame = side, inner glyph = arm, echelon marks = size (X, XX, XXX), a dashed frame = not a fresh report,
//     a question mark and hatching = unconfirmed.  Each channel carries ONE variable (P5) and colour is never alone: the Confederate silhouette is chamfered, the contested side is
//     hatched, the Union frame is square-cornered (silhouette first, colour second: R22, R44).
//   * It holds against imagery without relying on it: [white keyline][coloured frame][white plate] keeps 3:1 on any base map (WCAG 1.4.11, R42).
//   * It is the calm reference for evidence: Documented marks are drawn in full ink, Modelled marks (gauge, posture) in lighter ink (P10), fix age blends the frame to dashed.
//   * Choreography: a left-to-right wipe on arrival and departure (the display layer ramps scale and opacity; the wipe makes it a deliberate unfolding), selection ring and hover tint ease.
//
// Footprint: 26 px tall (2 px keyline margin, 22 px body: a text row and a gauge row), the same 14 px glyph cell as the reference skin plus 10 px side padding: a solid side band on the left, the posture mark on the right.
import { defineFamily, clamp01, ss, mixHex, rgba, textWidth, pinFade, meter } from './kit.mjs';
import { FONTS } from './semantics.mjs';
import { armGlyph, echelonMarks, postureMark, rr, chamfer } from './glyphs.mjs';
import { FM_TOKENS, FM_VARIANTS } from './field-manual.spec.mjs';

const FOOT = { chipH: 26, chipPadX: 10, glyphW: 14, glyphGap: 4, chipMinW: 44, ring: 2, badgeGap: 4, labelH: 16, labelPadX: 6, labelGap: 3, pinHalf: 3 };
const STACK = 3;                                              // an aggregate's front plate is this much smaller; the "cards" behind it show as an L

const sideHex = (g, side) => (side === 'union' ? g.P['color.union'] : side === 'confederate' ? g.P['color.confederate'] : g.P['color.unknown']);
const catAlpha = (ct, v) => (ct.to === v ? ct.m : 0) + (ct.from === v ? 1 - ct.m : 0);
const withAlpha = (c, base, k, fn) => { if (k <= 0.004) return; c.globalAlpha = base * k; fn(); c.globalAlpha = base; };

/** the plate outline path of a tile, inset by `i` px from the rectangle r */
function platePath(c, side, r, i, g) {
  const x = r.x + i; const y = r.y + i; const w = r.w - 2 * i; const h = r.h - 2 * i;
  if (side === 'confederate') chamfer(c, x, y, w, h, Math.max(0, g.P['frame.chamfer'] - i * 0.4)); else rr(c, x, y, w, h, 1.6);
}

function hatch(c, r, hex, pitch) {
  c.strokeStyle = hex; c.lineWidth = 1; c.beginPath();
  for (let k = -r.h; k < r.w; k += pitch) { c.moveTo(r.x + k, r.y + r.h); c.lineTo(r.x + k + r.h, r.y); }
  c.stroke();
}

function tile(c, t, g) {
  const P = g.P; const vm = g.vm; const spec = g.env.spec; const side = vm.side; const hw = g.hw; const hh = g.hh; const base = c.globalAlpha;
  const b = g.body; const r = vm.agg ? { x: b.x, y: b.y, w: b.w - STACK, h: b.h - STACK } : b;          // r = the front plate
  const fw = g.lw(P['frame.width']) + 0.5 * g.sel + 0.4 * g.hov; const sc = side === 'mixed' ? P['color.union'] : sideHex(g, side);
  const ink = P['color.ink']; const old = vm.carried;

  // arrival / departure: a wipe from the left edge (the display layer is also fading and scaling the tile)
  if (g.enter < 1) { c.beginPath(); c.rect(-hw - 2, -hh - 2, (g.w + 4) * ss(0, 1, g.enter), g.h + 4); c.clip(); }

  // keyline halo (in the 2 px margin), replaced by the selection ring as it eases in
  if (g.sel < 0.999) { rr(c, -hw + 1, -hh + 1, g.w - 2, g.h - 2, 3.4); c.strokeStyle = g.col('color.keyline', 0.9 * (1 - g.sel)); c.lineWidth = 1; c.stroke(); }

  // stacked cards behind an aggregate
  if (vm.agg) {
    c.strokeStyle = rgba(side === 'mixed' ? P['color.confederate'] : sc, 0.7); c.lineWidth = 1; c.beginPath();
    c.moveTo(r.x + STACK + 0.5, r.y + r.h + STACK - 0.5); c.lineTo(r.x + r.w + STACK - 0.5, r.y + r.h + STACK - 0.5); c.lineTo(r.x + r.w + STACK - 0.5, r.y + STACK + 0.5); c.stroke();
  }

  // plate
  const plateHex = mixHex(mixHex(P['color.plate'], P['color.plateOld'], old * 0.9), sc, g.hov * 0.16);
  platePath(c, side, r, 0, g); c.fillStyle = rgba(plateHex, P['plate.alpha']); c.fill();
  const cellW = spec.chipPadX + spec.glyphW + spec.glyphGap / 2;
  c.save(); c.clip();
  if (side === 'unknown') { c.fillStyle = g.col('color.unknown', 0.1); c.fillRect(r.x, r.y, r.w, r.h); hatch(c, r, g.col('color.unknown', 0.3), P['hatch.pitch']); }
  else if (side === 'mixed') { c.fillStyle = g.col('color.union', 0.13); c.fillRect(r.x, r.y, r.w / 2, r.h); c.fillStyle = g.col('color.confederate', 0.13); c.fillRect(r.x + r.w / 2, r.y, r.w / 2, r.h); }
  else { c.fillStyle = rgba(sc, P['cell.tint']); c.fillRect(r.x, r.y, cellW, r.h); c.fillStyle = rgba(sc, 1); c.fillRect(r.x, r.y, P['band.width'], r.h); }
  if (g.sel > 0.01) { c.fillStyle = g.col('color.accent', 0.13 * g.sel); c.fillRect(r.x, r.y, r.w, r.h); }
  c.restore();
  c.fillStyle = rgba(sc, 0.38); if (side !== 'mixed') c.fillRect(r.x + cellW, r.y + fw, 1, r.h - 2 * fw);                       // the divider of the glyph cell

  // frame: solid while the keyframe is fresh, blending to dashes as it ages (Computed from the age in ticks)
  const dash = old > 0.08;
  if (dash) c.setLineDash([P['frame.dash'], P['frame.gap'] * old]);
  c.lineWidth = fw; c.lineJoin = 'miter';
  if (side === 'mixed') {
    for (const [hex, x0, x1] of [[P['color.union'], r.x - 4, r.x + r.w / 2], [P['color.confederate'], r.x + r.w / 2, r.x + r.w + 4]]) {
      c.save(); c.beginPath(); c.rect(x0, r.y - 4, x1 - x0, r.h + 8); c.clip(); platePath(c, 'union', r, fw / 2, g); c.strokeStyle = hex; c.stroke(); c.restore();
    }
  } else { platePath(c, side, r, fw / 2, g); c.strokeStyle = sc; c.stroke(); }
  if (dash) c.setLineDash([]);

  // the arm glyph (or the echelon marks of a formation) in its cell
  const ty = g.cr(r.y + 8.4, 0); const gx = r.x + spec.chipPadX + spec.glyphW / 2; const gw = P['glyph.weight'];
  const as = g.cat('armState', vm.armState, P['motion.crossMs']);
  const glyph = (state, k) => withAlpha(c, base, k, () => { if (vm.arm === 'formation') echelonMarks(c, vm.ech, gx, ty, 5.8, { ink: sc, lw: gw }, spec.glyphW - 1); else armGlyph(c, vm.arm, gx, ty, 5, { ink: sc, lw: gw }, state); });
  if (as.from !== null) { glyph(as.from, 1 - as.m); glyph(as.to, as.m); } else glyph(vm.armState, 1);
  if (vm.ech === 1) echelonMarks(c, 1, r.x + r.w - 6.4, ty, 3.4, { ink: sc, lw: 1.3 });                                          // battalion: II (its glyph cell carries the arm)
  if (vm.agg && side === 'mixed') { c.strokeStyle = ink; c.lineWidth = 1.5; c.lineCap = 'round'; c.beginPath(); c.moveTo(gx - 3, ty - 3); c.lineTo(gx + 3, ty + 3); c.moveTo(gx + 3, ty - 3); c.lineTo(gx - 3, ty + 3); c.stroke(); }   // contact: crossed

  const tx = r.x + spec.chipPadX + spec.glyphW + spec.glyphGap;

  // identity: the short code (vital), and its evidence mark
  c.font = FONTS.code; c.textBaseline = 'middle'; c.fillStyle = ink; c.textAlign = 'left';
  const maxCode = spec.text.width('code', vm.code);
  const tw = g.text(c, vm.code, tx, ty + 0.5, maxCode, 'left');
  if (vm.idOnly) { c.fillStyle = g.col('color.ink', 0.55); for (let x = tx; x < tx + tw - 1; x += 3) c.fillRect(Math.round(x), g.cr(ty + 5.4, 1) - 0.5, 1.4, 1); }   // dotted underline: no complete order-of-battle parent
  if (vm.count) {
    c.font = FONTS.badge; const bw = Math.min(spec.text.width('badge', vm.count), textWidth(c, vm.count)) + 6; const px = tx + Math.min(tw + spec.badgeGap, maxCode + spec.badgeGap);
    rr(c, px, ty - 5.5, bw, 11, 5.5); c.fillStyle = side === 'mixed' || side === 'unknown' ? ink : sc; c.fill(); c.fillStyle = '#ffffff'; c.textAlign = 'left'; c.fillText(vm.count, px + 3, ty + 0.5);
  }

  // transit mark (Modelled): three dots under the glyph while the tile is between two keyframes
  const tr = g.cat('moving', vm.moving, P['motion.crossMs']); const ta = catAlpha(tr, true);
  withAlpha(c, base, ta, () => { c.fillStyle = rgba(sc, P['ink.modelled']); for (let i = -1; i <= 1; i++) { c.beginPath(); c.arc(gx + i * 3, g.cr(r.y + r.h - 5.2, 0), 0.8, 0, 6.283); c.fill(); } });

  // posture mark (Modelled), a secondary detail that collapses by zoom
  const lod = g.at(P['lod.posture'], P['lod.span']);
  if (lod > 0.01) {
    const pc = g.cat('posture', vm.posture, P['motion.crossMs']);
    const mark = (p, k) => withAlpha(c, base, k * lod, () => postureMark(c, p, r.x + r.w - 6.4, ty, 3.2, { ink: rgba(sc, P['ink.modelled']), lw: 1.3 }));
    if (pc.from !== null) { mark(pc.from, 1 - pc.m); mark(pc.to, pc.m); } else mark(vm.posture, 1);
  }

  // strength gauge (Modelled): a segmented bar; the empty part is a dotted line, the filled part solid
  const gh = P['gauge.height']; const gy = g.cr(r.y + r.h - fw - 1.5 - gh, 0); const gx0 = Math.round(tx); const gx1 = Math.round(r.x + r.w - fw - 4); const gl = gx1 - gx0;
  if (gl > 8) {
    meter(c, gx0, gy, gl, gh, P['gauge.segments'], 1, vm.ratio, g.col('color.track', 0.85), rgba(sc, P['ink.modelled'] + 0.2));
  }

  // hover / selection: the ring sits in the 2 px margin
  if (g.sel > 0.003) {
    rr(c, -hw + 0.5, -hh + 0.5, g.w - 1, g.h - 1, 3.8); c.strokeStyle = g.col('color.ink', 0.85 * g.sel); c.lineWidth = 1; c.stroke();
    rr(c, -hw + 1.5, -hh + 1.5, g.w - 3, g.h - 3, 3.2); c.strokeStyle = g.col('color.accent', g.sel); c.lineWidth = 1; c.stroke();
  }
}

function label(c, t, g) {
  const L = t.label; const lw = L.x1 - L.x0; const lh = L.y1 - L.y0; const sc = sideHex(g, t.side === 'mixed' ? 'union' : t.side);
  rr(c, 0.5, 0.5, lw - 1, lh - 1, 3); c.fillStyle = g.col('color.plate', 0.94); c.fill(); c.strokeStyle = rgba(sc, 0.55); c.lineWidth = 1; c.stroke();
  c.fillStyle = rgba(sc, 1); c.fillRect(1, 3, 2, lh - 6);
  c.font = FONTS.label; c.textBaseline = 'middle'; c.fillStyle = g.P['color.ink'];
  g.text(c, L.text, g.env.spec.labelPadX + 1, lh / 2 + 0.5, lw - g.env.spec.labelPadX * 2 - 1, 'left');
}
function pin(c, t, g) { const a = pinFade(t); if (a < 0.02) return; const sc = sideHex(g, t.side === 'mixed' ? 'union' : t.side); const b0 = c.globalAlpha; c.globalAlpha = b0 * a; c.beginPath(); c.arc(0, 0, 2.1, 0, 6.283); c.fillStyle = g.col('color.plate', 1); c.fill(); c.strokeStyle = sc; c.lineWidth = 1.2; c.stroke(); c.beginPath(); c.arc(0, 0, 0.7, 0, 6.283); c.fillStyle = sc; c.fill(); c.globalAlpha = b0; }
function leader(c, t, g, a, b) { c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.strokeStyle = rgba(sideHex(g, t.side === 'mixed' ? 'union' : t.side), 0.85); c.lineWidth = 1; c.stroke(); }
function hull(c, t, g, pts) { const sc = sideHex(g, t.side === 'mixed' ? 'union' : t.side); c.fillStyle = rgba(sc, 1); c.strokeStyle = g.col('color.keyline', 0.9); c.lineWidth = 0.8; for (const p of pts) { c.beginPath(); c.arc(p[0], p[1], 1.7, 0, 6.283); c.fill(); c.stroke(); } }

/** the legend swatches are drawn by the same helpers, in an 18 x 12 cell centred on (0, 0) */
function sample(c, ch, v, g, w, h) {
  const P = g.P; const x = -w / 2 + 0.5; const y = -h / 2 + 0.5; const W = w - 1; const H = h - 1; const ink = P['color.ink'];
  const sc0 = v === 'confederate' ? P['color.confederate'] : v === 'unknown' ? P['color.unknown'] : P['color.union'];
  const plate = (side, hex, dashed) => {
    const r = { x, y, w: W, h: H }; platePath(c, side, r, 0, g); c.fillStyle = g.col('color.plate', 1); c.fill();
    if (side === 'unknown') { c.save(); c.clip(); hatch(c, r, g.col('color.unknown', 0.35), 4); c.restore(); }
    if (dashed) c.setLineDash([3.4, 1.8]); platePath(c, side, r, 0.8, g); c.strokeStyle = hex; c.lineWidth = 1.5; c.stroke(); c.setLineDash([]);
  };
  const sc = sc0; const st = { ink: sc, lw: 1.4 };
  switch (ch) {
    case 'side': if (v === 'mixed') { plate('union', P['color.union']); c.save(); c.beginPath(); c.rect(0, -h, w, 2 * h); c.clip(); platePath(c, 'union', { x, y, w: W, h: H }, 0.8, g); c.strokeStyle = P['color.confederate']; c.lineWidth = 1.5; c.stroke(); c.restore(); } else plate(v, sc); break;
    case 'arm': plate('union', P['color.union']); if (v === 'formation') echelonMarks(c, 2, 0, 0, 4.4, st); else armGlyph(c, v, 0, 0, 4.2, { ink: P['color.union'], lw: 1.4 }); break;
    case 'armState': plate('union', P['color.union']); armGlyph(c, v === 'mounted' || v === 'dismounted' ? 'cavalry' : 'artillery', 0, 0, 4, { ink: P['color.union'], lw: 1.3 }, v); break;
    case 'echelon': plate('union', P['color.union']); echelonMarks(c, v, 0, 0, 4.6, { ink: P['color.union'], lw: 1.4 }); break;
    case 'posture': plate('union', P['color.union']); postureMark(c, v, 0, 0, 3.4, { ink: rgba(P['color.union'], P['ink.modelled']), lw: 1.4 }); break;
    case 'strength': { plate('union', P['color.union']); const n = P['gauge.segments']; const gl = 12; const x0 = -gl / 2; c.fillStyle = g.col('color.track', 0.9); c.fillRect(x0, -1.5, gl, 3); c.fillStyle = rgba(P['color.union'], 0.98); c.fillRect(x0, -1.5, gl * v, 3); c.fillStyle = g.col('color.plate', 1); for (let i = 1; i < n; i++) c.fillRect(x0 + gl * i / n - 0.5, -1.5, 1, 3); break; }
    case 'fix': { c.fillStyle = g.col(v === 'carried' ? 'color.plateOld' : 'color.plate', 1); c.fillRect(x, y, W, H); c.strokeStyle = P['color.union']; c.lineWidth = 1.6; if (v === 'carried') c.setLineDash([3.4, 2.2]); c.beginPath(); c.moveTo(x + 1, 0); c.lineTo(x + W - 1, 0); c.stroke(); c.setLineDash([]); break; }
    case 'transit': plate('union', P['color.union']); c.fillStyle = rgba(P['color.union'], P['ink.modelled']); for (let i = -1; i <= 1; i++) { c.beginPath(); c.arc(i * 3, 0, 0.9, 0, 6.283); c.fill(); } break;
    case 'idOnly': plate('union', P['color.union']); c.fillStyle = g.col('color.ink', 0.9); c.font = '700 8px sans-serif'; c.textBaseline = 'middle'; c.textAlign = 'center'; c.fillText('10 AL', 0, -1); c.fillStyle = g.col('color.ink', 0.6); for (let xx = -6; xx < 6; xx += 3) c.fillRect(xx, 3.2, 1.4, 1); break;
    case 'aggregate': { plate('union', P['color.union']); rr(c, -5, -3.2, 10, 6.4, 3.2); c.fillStyle = P['color.union']; c.fill(); c.fillStyle = '#fff'; c.font = '700 6.5px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('×4', 0, 0.3); break; }
    case 'selection': plate('union', P['color.union']); rr(c, x - 0.5, y - 0.5, W + 1, H + 1, 3); c.strokeStyle = P['color.accent']; c.lineWidth = 1.6; c.stroke(); break;
    case 'pin': c.beginPath(); c.moveTo(-6, 3); c.lineTo(2, -1); c.strokeStyle = rgba(P['color.union'], 0.85); c.lineWidth = 1; c.stroke(); c.beginPath(); c.arc(-6, 3, 2.1, 0, 6.283); c.fillStyle = g.col('color.plate', 1); c.fill(); c.strokeStyle = P['color.union']; c.lineWidth = 1.2; c.stroke(); break;
    default: return false;
  }
  return true;
}

export const FIELD_MANUAL = defineFamily({
  id: 'field-manual', label: 'Field Manual', version: '1.0', footprint: FOOT, fonts: FONTS, tokens: FM_TOKENS,
  channels: { side: true, arm: true, armState: true, echelon: true, posture: true, strength: true, fix: true, transit: true, idOnly: true, aggregate: true, selection: true, pin: true },
  fallbackSwatch: '#1f5aa6', draw: { tile, label, pin, leader, hull }, sample,
}, FM_VARIANTS);

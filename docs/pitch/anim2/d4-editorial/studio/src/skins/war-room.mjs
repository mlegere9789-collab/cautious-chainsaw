// skins/war-room.mjs - SKIN 2 of 3: WAR ROOM.  Cinematic: a dark glass plate that floats over the map, lit from the top-left, with the side colour as its rim light.
//
// Why this direction (04-benchmarks.md, 03-data-fuel.md):
//   * The owner wants the battle animation to feel like a production, and the strongest honest cinematic device the data allows is LIGHT.  Evidence maps onto it directly: a unit whose
//     latest keyframe is fresh is lit (bright rim, glow in the glyph cell); a unit that has been carried forward for a day or more is unlit and its rim is dashed.  The viewer reads
//     "how stale is this" before reading anything else, and it needs no legend to feel right.  The vital channels (text, glyph, gauge) are never dimmed: only the glow is.
//   * DEPTH encodes echelon: a regiment lies flat, a brigade floats 1.4 px, a division and a corps 2 px (capped by the 3 px margin; the contact shadow grows with it).  A hierarchy you can feel, not just read
//     (03 E03; 04 R22: silhouette first, colour second): the Confederate plate has four cut corners, the Union plate is rounded, the contested side is hatched grey.
//   * It never shows what the record lacks: no trail (the tile skin has no honest path to draw), no weather, no casualty glow, no speed.  The only motion cues are arrival (a light sweep that
//     reveals the plate), selection (corner brackets that lock in), hover (the plate lifts) and a cross-fade when a keyframe changes a posture.
//   * Rim, glow and shadow are drawn with translucent layers and linear gradients (no shadowBlur: 04 P4), gradients are cached, so the cost stays near the flat skin's.
import { defineFamily, clamp01, ss, mixHex, rgba, lin, textWidth, pinFade, meter } from './kit.mjs';
import { FONTS } from './semantics.mjs';
import { armGlyph, postureMark, echelonMarks, chevrons, rr, bevel } from './glyphs.mjs';
import { WR_TOKENS, WR_VARIANTS } from './war-room.spec.mjs';

const FOOT = { chipH: 28, chipPadX: 10, glyphW: 14, glyphGap: 5, chipMinW: 48, ring: 3, badgeGap: 5, labelH: 18, labelPadX: 7, labelGap: 3, pinHalf: 3 };
const STACK = 3;
const sideHex = (g, side) => (side === 'union' ? g.P['color.union'] : side === 'confederate' ? g.P['color.confederate'] : g.P['color.unknown']);
const catAlpha = (ct, v) => (ct.to === v ? ct.m : 0) + (ct.from === v ? 1 - ct.m : 0);
const withAlpha = (c, base, k, fn) => { if (k <= 0.004) return; c.globalAlpha = base * k; fn(); c.globalAlpha = base; };
const light = (hex, k) => mixHex(hex, '#ffffff', k);

function plate(c, side, x, y, w, h, g) { if (side === 'confederate') bevel(c, x, y, w, h, g.P['plate.cut']); else rr(c, x, y, w, h, g.P['plate.radius']); }

function tile(c, t, g) {
  const P = g.P; const vm = g.vm; const spec = g.env.spec; const side = vm.side; const base = c.globalAlpha; const hw = g.hw; const hh = g.hh;
  const sc = side === 'mixed' ? P['color.union'] : sideHex(g, side); const old = vm.carried; const fresh = 1 - old;
  const lift = Math.min(2, Math.min(3, vm.ech) * P['lift.perEchelon'] + g.hov * 0.9);
  const b = g.body; const bw = vm.agg ? b.w - STACK : b.w; const bh = vm.agg ? b.h - STACK : b.h;
  const x = b.x; const y = b.y - lift; const w = bw; const h = bh;                       // the plate floats up by `lift`
  const k = side === 'confederate' ? P['plate.cut'] : P['plate.radius'];

  // arrival / departure: the plate is revealed behind a bright vertical band sweeping left to right
  const pe = ss(0, 1, g.enter); const sweepX = -hw - 8 + (g.w + 16) * pe;
  if (g.enter < 1) { c.beginPath(); c.rect(-hw - 4, -hh - 4, sweepX + hw + 4 + 3, g.h + 8); c.clip(); }

  // contact shadow: three translucent layers in the margin, offset down; grows with the lift
  const sa = P['shadow.alpha'] * (1 - 0.35 * old);
  const so = 0.8 + 0.25 * lift;
  if (sa > 0.01) for (let i = 0; i < 3; i++) { rr(c, b.x - 0.4 * i + 0.2, b.y + so, bw + 0.8 * i - 0.4, bh + 0.8 * i, k + 1); c.fillStyle = rgba('#000000', sa * (0.55 - 0.17 * i)); c.fill(); }
  if (vm.agg) {                                                                          // glass layers behind an aggregate
    for (let i = 2; i >= 1; i--) { plate(c, side === 'mixed' ? 'union' : side, x + i * STACK / 2, y + i * STACK / 2, w, h, g); c.fillStyle = rgba(P['color.plateBottom'], 0.55); c.fill(); c.strokeStyle = rgba(sc, 0.4); c.lineWidth = 1; c.stroke(); }
  }
  // the plate: glass gradient, flat and unlit when old
  const top = mixHex(P['color.plateTop'], P['color.plateOld'], old * 0.9); const bot = mixHex(P['color.plateBottom'], P['color.plateOld'], old * 0.55);
  plate(c, side === 'mixed' ? 'union' : side, x - 0.5, y - 0.5, w + 1, h + 1, g); c.strokeStyle = rgba(P['color.edge'], 0.7); c.lineWidth = 1; c.stroke();                // contour on any imagery
  plate(c, side === 'mixed' ? 'union' : side, x, y, w, h, g);
  c.fillStyle = lin(c, 0, y, 0, y + h, [[0, rgba(top, P['plate.alpha'])], [1, rgba(bot, P['plate.alpha'])]]); c.fill();
  c.save(); c.clip();
  const glowK = P['rim.glow'] * (1 - 0.85 * old);
  if (side === 'unknown') { c.strokeStyle = rgba(sc, 0.3); c.lineWidth = 1; c.beginPath(); for (let q = -h; q < w; q += P['hatch.pitch']) { c.moveTo(x + q, y + h); c.lineTo(x + q + h, y); } c.stroke(); }
  else if (side === 'mixed') { c.fillStyle = lin(c, x, 0, x + 22, 0, [[0, rgba(P['color.union'], glowK)], [1, rgba(P['color.union'], 0)]]); c.fillRect(x, y, 22, h); c.fillStyle = lin(c, x + w - 22, 0, x + w, 0, [[0, rgba(P['color.confederate'], 0)], [1, rgba(P['color.confederate'], glowK)]]); c.fillRect(x + w - 22, y, 22, h); }
  else { c.fillStyle = lin(c, x, 0, x + 24, 0, [[0, rgba(sc, glowK)], [1, rgba(sc, 0)]]); c.fillRect(x, y, 24, h); c.fillStyle = rgba(sc, 1 - 0.45 * old); c.fillRect(x, y, 3, h); }
  c.fillStyle = lin(c, 0, y, 0, y + 9, [[0, 'rgba(255,255,255,0.16)'], [1, 'rgba(255,255,255,0)']]); c.fillRect(x, y, w, 9);        // top gloss
  if (g.hov > 0.01 || g.sel > 0.01) { c.fillStyle = rgba('#ffffff', 0.07 * g.hov + 0.07 * g.sel); c.fillRect(x, y, w, h); }
  c.restore();

  // rim light: the whole edge faintly, the top and left edges strongly; dashed when the keyframe is old
  const rw = g.lw(P['rim.width']); const dash = old > 0.08;
  plate(c, side === 'mixed' ? 'union' : side, x + 0.5, y + 0.5, w - 1, h - 1, g);
  if (dash) c.setLineDash([4, 2.4 * old]);
  c.strokeStyle = rgba(sc, 0.38 + 0.2 * fresh + 0.25 * g.hov); c.lineWidth = 1; c.stroke();
  c.strokeStyle = rgba(light(sc, 0.25), 0.55 + 0.4 * fresh + 0.2 * g.hov); c.lineWidth = rw; c.lineCap = 'butt'; c.beginPath();
  const kx = side === 'confederate' ? k : k * 0.6; c.moveTo(x + w - kx - 1, y + rw / 2); c.lineTo(x + kx, y + rw / 2); c.lineTo(x + rw / 2, y + kx); c.lineTo(x + rw / 2, y + h - kx); c.stroke();
  if (dash) c.setLineDash([]);
  if (side === 'mixed') { c.strokeStyle = rgba(P['color.confederate'], 0.7); c.lineWidth = rw; c.beginPath(); c.moveTo(x + w - rw / 2, y + k); c.lineTo(x + w - rw / 2, y + h - k); c.stroke(); }

  // the arm glyph (luminous), or the echelon chevrons of a formation
  const ty = g.cr(y + 9.4, 0); const gx = x + spec.chipPadX + spec.glyphW / 2; const gw = P['glyph.weight']; const core = light(sc, 0.32);
  const as = g.cat('armState', vm.armState, P['motion.crossMs']);
  const glyph = (state, kk) => withAlpha(c, base, kk, () => {
    const draw = (ink, lw) => { if (vm.arm === 'formation') chevrons(c, vm.ech - 1, gx, ty, 5.6, { ink, lw }, 11); else armGlyph(c, vm.arm, gx, ty, 5.2, { ink, lw }, state); };
    if (P['glyph.glow'] > 0.01) { c.globalAlpha = base * kk * P['glyph.glow']; draw(sc, gw + 2.4); c.globalAlpha = base * kk; }
    draw(core, gw);
  });
  if (as.from !== null) { glyph(as.from, 1 - as.m); glyph(as.to, as.m); } else glyph(vm.armState, 1);
  if (vm.agg && side === 'mixed') { c.strokeStyle = P['color.ink']; c.lineWidth = 1.5; c.lineCap = 'round'; c.beginPath(); c.moveTo(gx - 3, ty - 3); c.lineTo(gx + 3, ty + 3); c.moveTo(gx + 3, ty - 3); c.lineTo(gx - 3, ty + 3); c.stroke(); }
  if (vm.ech === 1) echelonMarks(c, 1, x + w - 6.8, ty, 3.4, { ink: rgba(P['color.dim'], 1), lw: 1.3 });

  // in transit (Modelled): a small comet under the glyph
  const tr = g.cat('moving', vm.moving, P['motion.crossMs']);
  withAlpha(c, base, catAlpha(tr, true), () => { for (let i = 0; i < 3; i++) { c.fillStyle = rgba(core, 0.95 - 0.3 * i); c.beginPath(); c.arc(gx - 3 + i * 3, g.cr(y + h - 5.6, 0), 1 - 0.18 * i, 0, 6.283); c.fill(); } });

  // identity: the short code (vital) and its evidence mark
  const tx = x + spec.chipPadX + spec.glyphW + spec.glyphGap; c.font = FONTS.code; c.textBaseline = 'middle'; c.textAlign = 'left'; c.fillStyle = P['color.ink'];
  const maxCode = spec.text.width('code', vm.code); const tw = g.text(c, vm.code, tx, ty + 0.5, maxCode, 'left');
  if (vm.idOnly) { c.fillStyle = rgba(P['color.dim'], 0.9); for (let q = tx; q < tx + tw - 1; q += 3) c.fillRect(Math.round(q), g.cr(ty + 6.2, 1) - 0.5, 1.4, 1); }
  if (vm.count) {
    c.font = FONTS.badge; const bw2 = Math.min(spec.text.width('badge', vm.count), textWidth(c, vm.count)) + 6; const px = tx + tw + spec.badgeGap;
    rr(c, px, ty - 5.5, bw2, 11, 5.5); c.fillStyle = side === 'mixed' || side === 'unknown' ? P['color.ink'] : sc; c.fill(); c.fillStyle = '#06101a'; c.textAlign = 'left'; c.fillText(vm.count, px + 3, ty + 0.5);
  }

  // posture (Modelled), secondary: collapses by zoom
  const lod = g.at(P['lod.posture'], P['lod.span']);
  if (lod > 0.01) {
    const pc = g.cat('posture', vm.posture, P['motion.crossMs']);
    const mark = (p, kk) => withAlpha(c, base, kk * lod, () => postureMark(c, p, x + w - 6.8, ty, 3.3, { ink: rgba(P['color.dim'], P['ink.modelled']), lw: 1.3 }));
    if (pc.from !== null) { mark(pc.from, 1 - pc.m); mark(pc.to, pc.m); } else mark(vm.posture, 1);
  }

  // strength meter (Modelled): segments lit in the side colour
  const mh = P['meter.height']; const my = g.cr(y + h - 1.8 - mh, 0); const mx0 = Math.round(tx); const mx1 = Math.round(x + w - 5); const ml = mx1 - mx0; const n = P['meter.segments'];
  if (ml > 10) {
    meter(c, mx0, my, ml, mh, n, 1, vm.ratio, rgba(P['color.off'], 1), rgba(light(sc, 0.12), P['ink.modelled'] + 0.2));
  }

  // selection: four corner brackets lock in (inside the 3 px margin); hover is the lift above
  if (g.sel > 0.003) {
    const L = 3 + 5 * g.sel; c.strokeStyle = rgba(P['color.accent'], g.sel); c.lineWidth = 1.6; c.lineCap = 'butt'; c.beginPath();
    const x0 = -hw + 0.9; const x1 = hw - 0.9; const y0 = -hh + 0.9; const y1 = hh - 0.9;
    const corner = (cx, cy, sx, sy) => { c.moveTo(cx, cy + sy * L); c.lineTo(cx, cy); c.lineTo(cx + sx * L, cy); };
    corner(x0, y0, 1, 1); corner(x1, y0, -1, 1); corner(x0, y1, 1, -1); corner(x1, y1, -1, -1);
    c.stroke();
    rr(c, -hw + 1.2, -hh + 1.2, g.w - 2.4, g.h - 2.4, k + 1); c.strokeStyle = rgba(P['color.accent'], 0.28 * g.sel); c.lineWidth = 1; c.stroke();
  }

  // the sweep band of an arriving or departing tile
  if (g.enter < 1) {
    const a = 4 * g.enter * (1 - g.enter); const W = P['sweep.width'];
    c.beginPath(); c.rect(-hw - 4, -hh - 4, g.w + 8, g.h + 8); c.clip();
    c.fillStyle = lin(c, -1, 0, -1 + W, 0, [[0, 'rgba(255,255,255,0)'], [1, 'rgba(255,255,255,0.9)']]);
    c.save(); c.translate(sweepX - W, 0); c.globalAlpha = base * a * 0.7; c.fillRect(-1, -hh, W + 1, g.h); c.restore(); c.globalAlpha = base;
  }
}

function label(c, t, g) {
  const L = t.label; const lw = L.x1 - L.x0; const lh = L.y1 - L.y0; const sc = sideHex(g, t.side === 'mixed' ? 'union' : t.side);
  rr(c, 0.5, 0.5, lw - 1, lh - 1, 4); c.fillStyle = rgba(g.P['color.plateBottom'], 0.94); c.fill(); c.strokeStyle = rgba(g.P['color.edge'], 0.7); c.lineWidth = 1; c.stroke();
  rr(c, 1.5, 1.5, lw - 3, lh - 3, 3); c.strokeStyle = rgba(sc, 0.45); c.stroke(); c.fillStyle = rgba(sc, 1); c.fillRect(2, 4, 2, lh - 8);
  c.font = FONTS.label; c.textBaseline = 'middle'; c.fillStyle = g.P['color.ink'];
  g.text(c, L.text, g.env.spec.labelPadX + 1, lh / 2 + 0.5, lw - g.env.spec.labelPadX * 2 - 1, 'left');
}
function pin(c, t, g) { const a = pinFade(t); if (a < 0.02) return; const b0 = c.globalAlpha; c.globalAlpha = b0 * a; const sc = sideHex(g, t.side === 'mixed' ? 'union' : t.side); c.beginPath(); c.arc(0, 0, 2.9, 0, 6.283); c.fillStyle = rgba(sc, 0.3); c.fill(); c.beginPath(); c.arc(0, 0, 1.7, 0, 6.283); c.fillStyle = light(sc, 0.35); c.fill(); c.strokeStyle = rgba(g.P['color.edge'], 0.8); c.lineWidth = 0.8; c.stroke(); c.globalAlpha = b0; }
function leader(c, t, g, a, b) { const sc = sideHex(g, t.side === 'mixed' ? 'union' : t.side); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.strokeStyle = rgba(sc, 0.22); c.lineWidth = 3; c.stroke(); c.strokeStyle = rgba(light(sc, 0.3), 0.9); c.lineWidth = 1; c.stroke(); }
function hull(c, t, g, pts) { const sc = sideHex(g, t.side === 'mixed' ? 'union' : t.side); for (const p of pts) { c.fillStyle = rgba(sc, 0.3); c.beginPath(); c.arc(p[0], p[1], 3, 0, 6.283); c.fill(); c.fillStyle = light(sc, 0.4); c.beginPath(); c.arc(p[0], p[1], 1.5, 0, 6.283); c.fill(); } }

function sample(c, ch, v, g, w, h) {
  const P = g.P; const x = -w / 2 + 0.5; const y = -h / 2 + 0.5; const W = w - 1; const H = h - 1;
  const hex = v === 'confederate' ? P['color.confederate'] : v === 'unknown' ? P['color.unknown'] : P['color.union'];
  const slab = (side, sc, dashed, lit = true) => {
    plate(c, side, x, y, W, H, g); c.fillStyle = lin(c, 0, y, 0, y + H, [[0, rgba(P['color.plateTop'], 1)], [1, rgba(P['color.plateBottom'], 1)]]); c.fill();
    if (side === 'unknown') { c.save(); c.clip(); c.strokeStyle = rgba(sc, 0.4); c.lineWidth = 1; c.beginPath(); for (let q = -H; q < W; q += 4) { c.moveTo(x + q, y + H); c.lineTo(x + q + H, y); } c.stroke(); c.restore(); }
    plate(c, side, x + 0.5, y + 0.5, W - 1, H - 1, g); if (dashed) c.setLineDash([3, 2]); c.strokeStyle = rgba(sc, lit ? 0.95 : 0.4); c.lineWidth = 1.4; c.stroke(); c.setLineDash([]);
  };
  const core = light(P['color.union'], 0.32); const U = P['color.union'];
  switch (ch) {
    case 'side': if (v === 'mixed') { slab('union', U); c.save(); c.beginPath(); c.rect(0, -h, w, 2 * h); c.clip(); plate(c, 'union', x + 0.5, y + 0.5, W - 1, H - 1, g); c.strokeStyle = P['color.confederate']; c.lineWidth = 1.4; c.stroke(); c.restore(); } else slab(v, hex); break;
    case 'arm': slab('union', U); if (v === 'formation') chevrons(c, 2, 0, 0, 4.2, { ink: core, lw: 1.4 }, 8); else armGlyph(c, v, 0, 0, 4, { ink: core, lw: 1.4 }); break;
    case 'armState': slab('union', U); armGlyph(c, v === 'mounted' || v === 'dismounted' ? 'cavalry' : 'artillery', 0, 0, 3.8, { ink: core, lw: 1.3 }, v); break;
    case 'echelon': slab('union', U); if (v === 1) echelonMarks(c, 1, 0, 0, 4, { ink: P['color.dim'], lw: 1.3 }); else chevrons(c, v - 1, 0, 0, 4.2, { ink: core, lw: 1.3 }, 8); break;
    case 'posture': slab('union', U); postureMark(c, v, 0, 0, 3.4, { ink: rgba(P['color.dim'], 1), lw: 1.3 }); break;
    case 'strength': { slab('union', U); const n = 6; const sw = 1.6; const gl = n * (sw + 1) - 1; for (let i = 0; i < n; i++) { const f = clamp01(v * n - i); c.fillStyle = P['color.off']; c.fillRect(-gl / 2 + i * (sw + 1), -2, sw, 4); if (f > 0) { c.fillStyle = core; c.fillRect(-gl / 2 + i * (sw + 1), -2, sw * f, 4); } } break; }
    case 'fix': { c.fillStyle = lin(c, 0, y, 0, y + H, [[0, rgba(v === 'carried' ? P['color.plateOld'] : P['color.plateTop'], 1)], [1, rgba(v === 'carried' ? P['color.plateOld'] : P['color.plateBottom'], 1)]]); c.fillRect(x, y, W, H); c.strokeStyle = rgba(light(U, 0.25), v === 'carried' ? 0.5 : 1); c.lineWidth = 1.8; if (v === 'carried') c.setLineDash([3, 2.2]); c.beginPath(); c.moveTo(x + 1, 0); c.lineTo(x + W - 1, 0); c.stroke(); c.setLineDash([]); break; }
    case 'transit': slab('union', U); for (let i = 0; i < 3; i++) { c.fillStyle = rgba(core, 0.95 - 0.3 * i); c.beginPath(); c.arc(-3 + i * 3, 0, 1 - 0.18 * i, 0, 6.283); c.fill(); } break;
    case 'idOnly': slab('union', U); c.fillStyle = P['color.ink']; c.font = '700 8px sans-serif'; c.textBaseline = 'middle'; c.textAlign = 'center'; c.fillText('10 AL', 0, -1); c.fillStyle = rgba(P['color.dim'], 0.9); for (let xx = -6; xx < 6; xx += 3) c.fillRect(xx, 3.2, 1.4, 1); break;
    case 'aggregate': slab('union', U); rr(c, -5, -3.2, 10, 6.4, 3.2); c.fillStyle = U; c.fill(); c.fillStyle = '#06101a'; c.font = '700 6.5px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('×4', 0, 0.3); break;
    case 'selection': slab('union', U); c.strokeStyle = P['color.accent']; c.lineWidth = 1.6; c.beginPath(); for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { c.moveTo(sx * 8.4, sy * 4.2 - sy * 3.4); c.lineTo(sx * 8.4, sy * 4.2); c.lineTo(sx * 8.4 - sx * 4, sy * 4.2); } c.stroke(); break;
    case 'pin': c.beginPath(); c.moveTo(-6, 3); c.lineTo(3, -1); c.strokeStyle = rgba(U, 0.3); c.lineWidth = 3; c.stroke(); c.strokeStyle = rgba(core, 0.9); c.lineWidth = 1; c.stroke(); c.beginPath(); c.arc(-6, 3, 2.9, 0, 6.283); c.fillStyle = rgba(U, 0.3); c.fill(); c.beginPath(); c.arc(-6, 3, 1.7, 0, 6.283); c.fillStyle = core; c.fill(); break;
    default: return false;
  }
  return true;
}

export const WAR_ROOM = defineFamily({
  id: 'war-room', label: 'War Room', version: '1.0', footprint: FOOT, fonts: FONTS, tokens: WR_TOKENS,
  channels: { side: true, arm: true, armState: true, echelon: true, posture: true, strength: true, fix: true, transit: true, idOnly: true, aggregate: true, selection: true, pin: true },
  fallbackSwatch: '#4aa8ff', draw: { tile, label, pin, leader, hull }, sample,
}, WR_VARIANTS);

// skins/premium.mjs - STRATEGY PREMIUM: the tile skin of the second design round.  A unit is ONE object, a small standard: a banner on a dark hoist band, side-coloured fabric with a swallow-tailed
// (Union) or pointed (Confederate) fly, an arm sign on the hoist, the short code in the fabric, a thin strength line along the lower edge.  Light comes from the north-west (it matches the
// hillshade of the 'campaign' ground): a light rim on the north and west edges, a soft ground shadow to the south-east, a dark hairline everywhere.
//
//   SCALE tells the size of the formation: regiment 22 px, battalion 24, brigade 30, division 34, corps 38 (body height), and the formation standards are gilt-framed and float a little.
//   ONE OBJECT: the full name never gets a second box.  At close zoom and when selected the SAME banner unfolds downward and the name appears under the code (the footprint is the layout's own, so
//   the neighbours make room and nothing overlaps).
//   CROWDS: tiles that cannot all stand merge into a crowd mark: a stack of banners behind a gilt count pill, the side colours as bands, the formation code or the side word.
//   PROVISIONAL: a carried-forward position (the keyframe is a day old or more) is the SAME mark mixed toward grey and matte (no gloss, a quieter keyline): one device, continuous in age.
//   A unit in transit flutters its fly while the battle plays (Modelled).  The identity-only mark carries a dotted rule under its code (Unknown).
//
// Honesty: every channel here is backed by a tile field (see semantics.mjs); the Documented / Modelled / Computed labels are in the legend and SPEC.md.
import { defineFamily, clamp01, ss, mixHex, rgba, lin, pinFade, textWidth } from './kit.mjs';
import { describe, ECH_LEVEL } from './semantics.mjs';
import { PREMIUM_TOKENS, PREMIUM_VARIANTS } from './premium.tokens.gen.mjs';
import { bannerPath, rr, armSign, echSign, shadowSprite, shapeOfSide, easeOutCubic, TAU } from './premium-art.mjs';

const FOOT = { chipH: 22, chipPadX: 5, glyphW: 14, glyphGap: 3, chipMinW: 36, ring: 2, badgeGap: 3, labelH: 14, labelPadX: 4, labelGap: 2, pinHalf: 3 };
const SIDEKEY = { union: 'union', confederate: 'csa', unknown: 'unk' };
const lerp = (a, b, k) => a + (b - a) * k;
const hashPhase = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return (h >>> 0) % 628 / 100; };

// ---- fonts ----------------------------------------------------------------------------------------------------------------------------------------------------------
export function fontSpecs(P) {
  const fam = P['type.family']; const u = P['type.unitSize']; const f = P['type.formSize'];
  return { code: `${P['type.unitWeight']} ${u}px ${fam}`, codeL: `${P['type.formWeight']} ${f}px ${fam}`, name: `${P['type.nameWeight']} ${u}px ${fam}`, badge: `${P['type.formWeight']} ${f}px ${fam}`, label: `${P['type.nameWeight']} ${u}px ${fam}` };
}

// ---- the name that unfolds under the code --------------------------------------------------------------------------------------------------------------------
// The dataset's `label` is already cut at 24 characters with an ellipsis ("11th Mississippi Infant..."), which is exactly a name hidden by a box.  The unfolded name is built from the unit's full
// designation instead: the trailing parenthesis (the long form, which lives in the card) is dropped, ordinals are short ("First Brigade" is "1st Brigade"), and a name that is still long is cut
// at a word, never in the middle of one.  A unit whose only name is its code (no order-of-battle record) has nothing to unfold.
const ORD = { First: '1st', Second: '2nd', Third: '3rd', Fourth: '4th', Fifth: '5th', Sixth: '6th', Seventh: '7th', Eighth: '8th', Ninth: '9th', Tenth: '10th', Eleventh: '11th', Twelfth: '12th' };
const NAMES = new WeakMap();
export function nameOf(u) {
  if (!u) return null; if (NAMES.has(u)) return NAMES.get(u);
  let s = String(u.designation || u.label || '').trim(); const bare = s.replace(/\s*\([^)]*\)\s*$/, ''); if (bare.length >= 4) s = bare;
  s = s.replace(/\b(First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleventh|Twelfth)\b/g, (m) => ORD[m]);
  if (s.length > 44) { const cut = s.slice(0, 43); const sp = cut.lastIndexOf(' '); s = (sp > 20 ? cut.slice(0, sp) : cut).replace(/[,;:\s-]+$/, '') + '\u2026'; }
  const out = !s || s === u.short ? null : s; NAMES.set(u, out); return out;
}

// ---- footprints: the layout asks the skin how big a unit's mark is -----------------------------------------------------------------------------------------------
/** the closure over a skin instance's live tokens: { leaf(u, spec, { z, selected }), agg(nm, spec, tile) } -> { w, h } of the footprint box (ring included) */
function layoutOf(skin) {
  // The footprint unfolds with ZOOM only.  Selection once forced the named size into the layout (iteration 3): at zoom 14.5 a 190 px name covered the true positions of its neighbours, the selected unit
  // could not be placed within the budget and was merged into a crowd.  Selection and hover now unfold the same banner into free ground (draw-only, see grow() and render/canvas.mjs), never in the layout.
  const nameK = (z, force) => (force ? 1 : ss(skin.P['geo.nameZoom0'], skin.P['geo.nameZoom1'], z));
  return {
    nameK,
    leaf(u, spec, { z = 15, force = false } = {}) {
      const P = skin.P; const L = ECH_LEVEL[u.kind] ?? 0; const big = L >= 2; const ring = P['geo.ring']; const bh = P['geo.h' + L];
      const nm = nameOf(u); const k = nm ? nameK(z, force) : 0; const strip = big ? P['geo.hoist1'] : P['geo.hoist0'];
      const codeW = spec.text.width(big ? 'codeL' : 'code', u.short); const nameW = k > 0.001 ? spec.text.width('name', nm) : 0;
      const textW = lerp(codeW, Math.max(codeW, nameW), k);
      return { w: Math.ceil(strip + P['geo.padL'] + textW + P['geo.padR'] + P['geo.fly']) + 2 * ring, h: Math.ceil(bh + k * P['geo.nameLine']) + 2 * ring, codeW };
    },
    agg(nm, spec, t) {
      const P = skin.P; const ring = P['geo.ring']; const n = t.n || 2; const layers = n >= 4 ? 3 : 2; const off = (layers - 1) * P['geo.stack'];
      const bh = P['geo.hAgg']; const pill = Math.max(bh - 8, spec.text.width('badge', nm.badge || String(n)) + 12);
      const codeW = spec.text.width('codeL', nm.short);
      return { w: Math.ceil(P['geo.padL'] - 1 + pill + 6 + codeW + P['geo.padR'] + P['geo.fly']) + off + 2 * ring, h: Math.ceil(bh + off) + 2 * ring, codeW };
    },
  };
}

// ---- palettes ---------------------------------------------------------------------------------------------------------------------------------------------------
const PAL = new Map();
function palette(g, sk, cb) {
  const P = g.P; const key = g.skin.id + ':' + g.skin.rev + ':' + sk + ':' + cb; let p = PAL.get(key); if (p) return p;
  const m = P['state.carriedMix'] * cb; const d = (sk === 'unk' ? 0 : P['state.carriedDark']) * cb; /* the gold of an undecided side stays light: its type is dark and needs a light cloth */ const f = (hex) => mixHex(mixHex(hex, P['color.carriedGrey'], m), '#000000', d);
  p = { hi: f(P[`color.${sk}.hi`]), lo: f(P[`color.${sk}.lo`]), strip: f(P[`color.${sk}.strip`]), edge: P[`color.${sk}.edge`], ink: sk === 'unk' ? P['color.inkOnGold'] : mixHex(P['color.ink'], P['color.carriedGrey'], 0.1 * cb) };
  if (PAL.size > 300) PAL.clear(); PAL.set(key, p); return p;
}

// ---- the mark ----------------------------------------------------------------------------------------------------------------------------------------------------
/** geometry of a mark in tile-local coordinates, from the footprint box (w, h) */
function geom(P, m) {
  const ring = P['geo.ring']; const off = m.agg ? (m.layers - 1) * P['geo.stack'] : 0;
  return { ring, off, bx: -m.w / 2 + ring + off, by: -m.h / 2 + ring + off, bw: m.w - 2 * ring - off, bh: m.h - 2 * ring - off };
}

/** draw one mark.  m = { side ('union'|'confederate'|'unknown'|'mixed'), sides[] (for a crowd), agg, layers, big, ech, arm, code, count, name, ratio, carried 0..1, w, h, hoist (px), codeH (the code row's body height),
 *  nameK (0..1: how far the name has unfolded), idOnly, fl (fly offsets), lift }.  c is at the tile centre.  g = { P, skin, dpr, text(), lw(), cr() }  */
function paintMark(c, m, g) {
  const P = g.P; const G = geom(P, m); const { bx, by, bw, bh } = G; const r = P['geo.radius']; const d = P['geo.fly']; const hair = P['geo.hairline'];
  const carried = m.carried; const cb = Math.round(carried * 12) / 12; const shape = m.agg && m.side === 'mixed' ? 'square' : shapeOfSide(m.side === 'mixed' ? 'x' : m.side);
  const sk = SIDEKEY[m.side] || 'union'; const pal = palette(g, sk, cb); const gl = P['light.gloss'] * (1 - carried);
  const front = (ox, oy, dim) => {
    const x = bx + ox; const y = by + oy;
    // outer hairline (dark): visible 1 px outside the fabric on any ground
    bannerPath(c, x, y, bw, bh, shape, r, d, m.fl); c.lineJoin = 'round'; c.lineWidth = 2 * hair; c.strokeStyle = rgba(P['color.keyline'], dim ? 0.6 : 0.78); c.stroke();
    // fabric
    bannerPath(c, x, y, bw, bh, shape, r, d, m.fl); c.save(); c.clip();
    if (m.agg && m.sides && m.sides.length > 1) {                                                          // a crowd of both sides: the side colours as bands, the seam in gilt
      const n = m.sides.length; const wband = bw / n;
      m.sides.forEach((sd, i) => { const pk = palette(g, SIDEKEY[sd] || 'union', cb); c.fillStyle = lin(c, 0, y, 0, y + bh, [[0, pk.hi], [1, pk.lo]]); c.fillRect(x + i * wband - 0.5, y, wband + 1, bh); });
    } else { c.fillStyle = lin(c, 0, y, 0, y + bh, [[0, pal.hi], [1, pal.lo]]); c.fillRect(x - 1, y - 1, bw + 2, bh + 2); }
    if (dim) { c.fillStyle = 'rgba(4,8,14,0.34)'; c.fillRect(x - 1, y - 1, bw + 2, bh + 2); }
    if (!m.agg && m.hoist > 0) { c.fillStyle = pal.strip; c.fillRect(x, y, m.hoist, bh); c.fillStyle = rgba(m.big ? P['color.giltHi'] : '#ffffff', m.big ? 0.55 - 0.3 * carried : 0.16); c.fillRect(x + m.hoist - 0.5, y, hair, bh); }
    if (gl > 0.004 && !dim) { c.fillStyle = lin(c, 0, y, 0, y + bh * 0.55, [[0, `rgba(255,255,255,${(gl).toFixed(3)})`], [1, 'rgba(255,255,255,0)']]); c.fillRect(x, y, bw, bh * 0.55); }
    if (!dim && P['light.sheen'] > 0.002) { c.fillStyle = lin(c, x, y, x + bw * 0.55, y + bh, [[0, `rgba(255,255,255,${(P['light.sheen'] * (1 - carried)).toFixed(3)})`], [0.55, 'rgba(255,255,255,0)']]); c.fillRect(x, y, bw, bh); }
    c.restore();
    if (dim) return;
    // light rim on the north and west edges (light from the north-west), a dark line on the south
    const rim = P['light.rimAlpha'] * (1 - 0.55 * carried);
    if (rim > 0.01) { c.lineWidth = hair; c.lineCap = 'butt'; c.strokeStyle = `rgba(255,255,255,${rim.toFixed(3)})`; c.beginPath(); c.moveTo(x + r, y + hair / 2); c.lineTo(x + bw - d - 1, y + hair / 2); c.moveTo(x + hair / 2, y + r); c.lineTo(x + hair / 2, y + bh - r); c.stroke(); }
    c.lineWidth = hair; c.strokeStyle = 'rgba(0,0,0,0.30)'; c.beginPath(); c.moveTo(x + r, y + bh - hair / 2); c.lineTo(x + bw - d - 1, y + bh - hair / 2); c.stroke();
    // the keyline: gilt for a formation standard, bone for a unit mark; quieter when carried forward
    bannerPath(c, x + hair / 2, y + hair / 2, bw - hair, bh - hair, shape, r, d, m.fl); c.lineWidth = hair;
    if (m.big || m.agg) c.strokeStyle = lin(c, 0, y, 0, y + bh, [[0, rgba(P['color.giltHi'], 1 - 0.55 * carried)], [1, rgba(P['color.giltLo'], 1 - 0.45 * carried)]]);
    else c.strokeStyle = rgba(P['color.bone'], lerp(P['light.keyline'], P['state.carriedKeyline'], carried));
    c.stroke();
    // the staff: a thin gilt pole along the hoist edge, a little proud of the banner top and bottom; formation standards carry a finial ball
    if (!dim) {
      const px = x - 0.5; const pw2 = m.big || m.agg ? 2 : 1.6; c.fillStyle = rgba(P['color.keyline'], 0.8); c.fillRect(px - 0.5, y - 1.8, pw2 + 1, bh + 3.6);
      c.fillStyle = lin(c, 0, y, 0, y + bh, [[0, rgba(P['color.giltHi'], 1 - 0.5 * carried)], [1, rgba(P['color.giltLo'], 1 - 0.4 * carried)]]); c.fillRect(px, y - 1.3, pw2, bh + 2.6);
      if (m.big || m.agg) { c.beginPath(); c.arc(px + pw2 / 2, y - 0.1, 1.9, 0, TAU); c.fillStyle = rgba(P['color.keyline'], 0.8); c.fill(); c.beginPath(); c.arc(px + pw2 / 2, y - 0.1, 1.3, 0, TAU); c.fillStyle = P['color.giltHi']; c.fill(); }
    }
  };
  // the banners behind a crowd mark (dimmer, offset up and to the left: the stack)
  if (m.agg) for (let i = m.layers - 1; i >= 1; i--) front(-i * P['geo.stack'], -i * P['geo.stack'], true);
  front(0, 0, false);

  const ink = pal.ink; const strokeW = 1.6; const x0 = bx; const codeH = m.codeH; const rowCy = by + codeH / 2;
  c.textBaseline = 'middle'; c.textAlign = 'left';
  if (m.agg) {                                                                                             // crowd: the gilt count pill, then the code
    const ph = bh - 8; const text = m.count; c.font = m.fonts.badge; const tw = textWidth(c, text); const pw = Math.max(ph, tw + 12); const px = x0 + 5 - 1; const py = by + (bh - ph) / 2;
    rr(c, px, py, pw, ph, ph / 2); c.fillStyle = lin(c, 0, py, 0, py + ph, [[0, P['color.giltHi']], [1, P['color.giltLo']]]); c.fill();
    rr(c, px + 0.5, py + 0.5, pw - 1, ph - 1, ph / 2); c.strokeStyle = 'rgba(40,28,4,0.55)'; c.lineWidth = hair; c.stroke();
    c.fillStyle = '#20180a'; c.textAlign = 'center'; c.fillText(text, px + pw / 2, g.cr(py + ph / 2 + 0.6, 0)); c.textAlign = 'left';
    c.font = m.fonts.codeL; const tx = px + pw + 6; const maxW = bw - (tx - x0) - P['geo.padR'] - d;
    c.fillStyle = 'rgba(0,0,0,0.38)'; g.text(c, m.code, tx, g.cr(by + bh / 2 + 0.6 + 0.7, 0), maxW, 'left'); c.fillStyle = ink; g.text(c, m.code, tx, g.cr(by + bh / 2 + 0.6, 0), maxW, 'left');
    return;
  }
  // the hoist band: the arm sign of a unit, the echelon signs of a formation
  const hx = x0 + m.hoist / 2; const gs = m.big ? 4.4 : 4.1;
  if (m.arm === 'formation') echSign(c, m.ech, hx, rowCy, rgba(P['color.giltHi'], 1 - 0.4 * carried), strokeW);
  else { armSign(c, m.arm, hx, m.ech === 1 ? rowCy + 2 : rowCy, gs, rgba('#fffaf0', 0.96 - 0.2 * carried), strokeW); if (m.ech === 1) echSign(c, 1, hx, rowCy - 5.4, rgba(P['color.giltHi'], 0.9), 1.3); }
  // the code
  const tx = x0 + m.hoist + P['geo.padL']; const maxW = bw - (tx - x0) - P['geo.padR'] - d + 1; c.font = m.big ? m.fonts.codeL : m.fonts.code;
  const cy = g.cr(rowCy + 0.6, 0);
  c.fillStyle = 'rgba(0,0,0,0.34)'; g.text(c, m.code, tx, cy + 0.8, maxW, 'left'); c.fillStyle = ink; const tw = g.text(c, m.code, tx, cy, maxW, 'left');
  if (m.idOnly) { c.fillStyle = rgba(ink, 0.7); for (let q = tx; q < tx + tw - 1; q += 3) c.fillRect(Math.round(q), g.cr(cy + (m.big ? 8.4 : 7.4), 1), 1.4, 1); }
  // the name unfolds under the code: the same banner, taller
  if (m.nameK > 0.02 && m.name) {
    // revealed inside the banner as it grows (clipped to the cloth, faded in over the second half of the growth); condensed to fit only when fully grown
    const a0 = c.globalAlpha; c.save(); bannerPath(c, bx, by, bw, bh, shape, r, d, m.fl); c.clip(); c.globalAlpha = a0 * clamp01((m.nameK - 0.4) / 0.6); c.font = m.fonts.name; c.fillStyle = rgba(P['color.ink'], 0.9);
    const ny = by + codeH + (P['geo.nameLine'] - 4) / 2 - 0.6; const maxWn = bw - (tx - x0) - P['geo.padR'] - d + 2;
    if (m.nameK > 0.995) g.text(c, m.name, tx, g.cr(ny + 0.6, 0), maxWn, 'left'); else { c.textAlign = 'left'; c.fillText(m.name, tx, g.cr(ny + 0.6, 0)); }
    c.restore();
  }
  // the strength line (Modelled): along the lower edge of the code row, a quiet 2 px rule
  if (m.gauge) {
    const gx0 = tx; const gx1 = bw + x0 - P['geo.padR'] - d + 3; const gy = by + bh - 3.5 - (m.nameK > 0.02 ? 0 : 0); const gw = Math.max(0, gx1 - gx0);
    if (gw > 8) { c.fillStyle = rgba(P['color.gaugeTrack'], 0.55); c.fillRect(gx0, gy, gw, 2); c.fillStyle = lin(c, gx0, 0, gx1, 0, [[0, rgba(P['color.giltHi'], 0.95 - 0.35 * carried)], [1, rgba(P['color.giltLo'], 0.95 - 0.35 * carried)]]); c.fillRect(gx0, gy, gw * clamp01(m.ratio), 2); }
  }
}

/** the hover edge light and the selection ring (inside the 2 px band the footprint reserves), shared by the map and the specimen sheets */
function paintOverlay(c, m, P, sel, hov) {
  if (!(hov > 0.01 || sel > 0.01)) return; const G = geom(P, m);
  const shape = m.agg && m.side === 'mixed' ? 'square' : shapeOfSide(m.side === 'mixed' ? 'x' : m.side); const r = P['geo.radius']; const d = P['geo.fly']; const hair = P['geo.hairline']; const fl = m.fl;
  if (hov > 0.01) { bannerPath(c, G.bx + 0.5, G.by + 0.5, G.bw - 1, G.bh - 1, shape, r, d, fl); c.lineWidth = hair * 1.2; c.strokeStyle = rgba(P['color.accent'], 0.85 * hov); c.stroke(); }
  if (sel > 0.01) {
    bannerPath(c, G.bx - 0.9, G.by - 0.9, G.bw + 1.8, G.bh + 1.8, shape, r + 1, d, fl); c.lineWidth = hair * 2.2; c.strokeStyle = rgba(P['color.accent'], 0.28 * sel); c.stroke();
    c.lineWidth = hair * 1.5; c.strokeStyle = rgba(P['color.accent'], sel); c.stroke();
  }
}

function tile(c, t0, g) {
  const P = g.P; const vm = g.vm; const spec = g.env.spec;
  // HOVER UNFOLD: when the renderer found free ground around the pointed-at mark (and the battle is not running), the SAME banner grows to its named size; it never grows into anything
  const gk = g.ease('grow', t0.hoverGrow ? 1 : 0, P['motion.growMs']); const gsz = t0.hoverGrow || g.st.lastGrow || null; if (t0.hoverGrow) g.st.lastGrow = t0.hoverGrow;
  const t = gk > 0.002 && gsz ? { ...t0, w: t0.w + (gsz.w - t0.w) * gk, h: t0.h + (gsz.h - t0.h) * gk } : t0; const hw = t.w / 2; const hh = t.h / 2;
  const L = vm.agg ? 0 : vm.ech; const big = !vm.agg && L >= 2; const base = c.globalAlpha;
  const fonts = skinFonts(g);
  const bodyH = vm.agg ? P['geo.hAgg'] : P['geo.h' + L]; const ring = P['geo.ring'];
  const nameLine = P['geo.nameLine']; const nameK = vm.agg ? 0 : clamp01((t.h - (bodyH + 2 * ring)) / nameLine);
  const sides = vm.agg ? ['union', 'confederate', 'unknown'].filter((k) => t.nSides && t.nSides[k] > 0) : null;
  // motion state of the fly: flutters only while the battle plays and the unit is between two keyframes
  const st = g.st; const tm = g.env.timeMs; const flowing = st && st.t0 !== undefined && Math.abs(tm - st.t0) > 1e-6; if (st) st.t0 = tm;
  const fk = g.ease('flutter', vm.moving && flowing && !vm.agg ? 1 : 0, P['motion.flutterMs']) * P['state.flutter'];
  let fl = null; if (fk > 0.02) { const ph = hashPhase(t.key) + g.now * 0.0115; fl = [fk * Math.sin(ph), fk * Math.sin(ph + 1.9), fk * Math.sin(ph + 3.9)]; }
  const m = { side: vm.side, sides, agg: vm.agg, layers: vm.agg ? ((t.n || 2) >= 4 ? 3 : 2) : 1, big, ech: L, arm: vm.arm, code: vm.code, count: vm.agg ? String(vm.n) : null, name: t.unit ? nameOf(t.unit) : null, ratio: vm.ratio,
    carried: vm.carried, w: t.w, h: t.h, hoist: vm.agg ? 0 : (big ? P['geo.hoist1'] : P['geo.hoist0']), codeH: bodyH, nameK, idOnly: vm.idOnly, fl, fonts, gauge: !vm.agg && g.at(14.3, 0.5) > 0.01 };
  // arrival and departure: the mark drops onto the ground, unfurling from the hoist (arrival), or lifts and fades (departure)
  const p = g.enter; const arriving = t.entering; const leaving = t.life === 'dying';
  let dy = 0; let reveal = 1;
  if (arriving) { dy = -P['motion.dropPx'] * (1 - easeOutCubic(p)); reveal = easeOutCubic(clamp01(p / Math.max(0.05, P['motion.unfurl']))); }
  else if (leaving) dy = -2.5 * (1 - p);
  const lift = Math.min(3, (big ? L * P['light.liftPerEchelon'] : 0) + g.hov * 1.6 + (vm.agg ? 0.4 : 0));
  c.save(); c.translate(0, dy);      // the float and the hover are carried by the shadow (it grows and moves away), not by moving the cloth: the pole already uses the whole 2 px band the footprint reserves
  if (reveal < 0.999) { c.beginPath(); c.rect(-hw - 6, -hh - 8, (t.w + 12) * reveal, t.h + 16); c.clip(); }
  paintMark(c, m, g);
  // hover: a warm edge light; selection: the gilt ring inside the reserved band, then the glow
  paintOverlay(c, m, P, g.sel, g.hov);
  c.restore(); c.globalAlpha = base;
}

/** the box a pointed-at unit mark would grow to (its named size), or null when it has nothing to unfold; the renderer asks, and grows it only into free ground */
function grow(t, g) {
  if (t.kind !== 'leaf' || !t.unit || t.entering || t.life !== 'live') return null; const lay = g.skin.out && g.skin.out.layout; if (!lay) return null;
  const b = lay.leaf(t.unit, g.env.spec, { z: g.env.zoom, force: true }); if (b.w <= t.w + 1 && b.h <= t.h + 1) return null; return { w: b.w, h: b.h };
}

/** the ground shadow, in its own pass beneath every mark */
function shadow(c, t0, g) {
  const P = g.P; const vm = g.vm; const gk = g.easedOf('grow'); const gsz = t0.hoverGrow || null; const t = gk > 0.002 && gsz ? { ...t0, w: t0.w + (gsz.w - t0.w) * gk, h: t0.h + (gsz.h - t0.h) * gk } : t0; const L = vm.agg ? 0 : vm.ech; const big = !vm.agg && L >= 2; const ring = P['geo.ring']; const layers = vm.agg ? ((t.n || 2) >= 4 ? 3 : 2) : 1;
  const off = vm.agg ? (layers - 1) * P['geo.stack'] : 0; const bw = t.w - 2 * ring - off; const bh = t.h - 2 * ring - off;
  const shape = vm.agg && vm.side === 'mixed' ? 'square' : shapeOfSide(vm.side === 'mixed' ? 'x' : vm.side);
  const lift = Math.min(3, (big ? L * P['light.liftPerEchelon'] : 0) + g.hov * 1.6 + (vm.agg ? 0.4 : 0));
  const S = Math.max(1, Math.ceil(g.dpr - 0.01)); const sp = shadowSprite(P, Math.round(bw), Math.round(bh), shape, layers, S, Math.round(lift * 2) / 2);
  const p = g.enter; const a = t.entering ? easeOutCubic(p) : t.life === 'dying' ? p : 1; const carried = vm.carried;
  const prev = c.globalAlpha; c.globalAlpha = prev * a * (1 - 0.35 * carried);
  const gx = -t.w / 2 + ring + off; const gy = -t.h / 2 + ring + off; c.drawImage(sp.canvas, gx + sp.ox, gy + sp.oy, sp.w, sp.h); c.globalAlpha = prev;
}

const FONTS = new WeakMap();
function skinFonts(g) { let f = FONTS.get(g.P); if (!f || f._rev !== g.skin.rev) { f = fontSpecs(g.P); f._rev = g.skin.rev; FONTS.set(g.P, f); } return f; }

// ---- pin, leader and crowd members --------------------------------------------------------------------------------------------------------------------------------
const sideColour = (g, side) => g.P[`color.${SIDEKEY[side === 'mixed' ? 'union' : side] || 'union'}.hi`];
function pin(c, t, g) {
  const a = pinFade(t); if (a < 0.02) return; const b0 = c.globalAlpha; c.globalAlpha = b0 * a; const col = sideColour(g, t.side);
  c.beginPath(); c.arc(0, 0, 3.6, 0, TAU); c.fillStyle = rgba(g.P['color.keyline'], 0.8); c.fill();
  c.beginPath(); c.arc(0, 0, 2.7, 0, TAU); c.fillStyle = g.P['color.bone']; c.fill();
  c.beginPath(); c.arc(0, 0, 1.7, 0, TAU); c.fillStyle = col; c.fill(); c.globalAlpha = b0;
}
function leader(c, t, g, a, b) {
  const dx = b[0] - a[0]; const dy = b[1] - a[1]; const len = Math.hypot(dx, dy); if (len < 4) return; const nx = -dy / len; const ny = dx / len; const bow = Math.min(7, len * 0.12);
  const cxp = (a[0] + b[0]) / 2 + nx * bow; const cyp = (a[1] + b[1]) / 2 + ny * bow; c.lineCap = 'round';
  c.beginPath(); c.moveTo(a[0], a[1]); c.quadraticCurveTo(cxp, cyp, b[0], b[1]); c.strokeStyle = rgba(g.P['color.keyline'], 0.4); c.lineWidth = 3; c.stroke();
  c.strokeStyle = rgba(g.P['color.bone'], 0.85); c.lineWidth = 1; c.stroke();
}
function hull(c, t, g, pts) {
  for (const p of pts) { c.beginPath(); c.arc(p[0], p[1], 3.2, 0, TAU); c.fillStyle = rgba(g.P['color.keyline'], 0.7); c.fill(); c.beginPath(); c.arc(p[0], p[1], 2.2, 0, TAU); c.fillStyle = g.P['color.bone']; c.fill(); c.beginPath(); c.arc(p[0], p[1], 1.2, 0, TAU); c.fillStyle = sideColour(g, t.side); c.fill(); }
}

// ---- legend samples ---------------------------------------------------------------------------------------------------------------------------------------------------
/** paint a mark from a plain description, anywhere (the legend, the cards, the specimen sheets): o = { code, side, arm, ech, agg, count, sides, ratio, carried, idOnly, name, nameK, gauge };
 *  c is at the CENTRE of the mark (origin 'c', default) or at its top-left (origin 'tl'); `fit` = { w, h, up } scales it to fit (never up unless up).  Returns { w, h, scale } of what was drawn. */
export function paintSpec(c, skin, o, fit = null, origin = 'c') {
  const P = skin.P; const fonts = fontSpecs(P);
  const L = o.ech ?? 0; const big = !o.agg && L >= 2; const bh = o.agg ? P['geo.hAgg'] : P['geo.h' + L]; const ring = P['geo.ring']; const hoist = o.agg ? 0 : (big ? P['geo.hoist1'] : P['geo.hoist0']);
  c.font = big || o.agg ? fonts.codeL : fonts.code; const codeW = c.measureText(o.code).width; const layers = o.agg ? 2 : 1; const off = o.agg ? P['geo.stack'] : 0; const nameK = o.name ? (o.nameK ?? 0) : 0;
  c.font = fonts.name; const nameW = nameK > 0 ? c.measureText(o.name).width : 0; c.font = big || o.agg ? fonts.codeL : fonts.code; const textW = lerp(codeW, Math.max(codeW, nameW), nameK);
  const pill = o.agg ? Math.max(bh - 8, c.measureText(o.count || '0').width + 12) : 0;
  const bw = o.agg ? 5 - 1 + pill + 6 + codeW + P['geo.padR'] + P['geo.fly'] + off : hoist + P['geo.padL'] + textW + P['geo.padR'] + P['geo.fly']; const W = Math.ceil(bw) + 2 * ring; const H = Math.ceil(bh + off + nameK * P['geo.nameLine']) + 2 * ring;
  const m = { side: o.side || 'union', sides: o.sides || null, agg: !!o.agg, layers, big, ech: L, arm: o.arm || 'infantry', code: o.code, count: o.count || null, name: o.name || null, ratio: o.ratio ?? 1, carried: o.carried || 0, w: W, h: H, hoist, codeH: bh, nameK, idOnly: !!o.idOnly, fl: null, fonts, gauge: o.gauge !== false && !o.agg };
  let sc = fit ? Math.min(fit.up ? 99 : 1, (fit.w - 2) / W, (fit.h - 2) / H) : 1; if (!(sc > 0)) sc = 1;
  const gg = { P, skin, dpr: 3, text: (cc, str, x, y, mw, al) => { if (al) cc.textAlign = al; cc.fillText(str, x, y); return cc.measureText(str).width; }, cr: (x) => x, ease: () => 0 };
  c.save(); if (origin === 'tl') c.translate(W * sc / 2, H * sc / 2); c.scale(sc, sc);
  // a shadow under it, from the same sprite the map uses
  try { const S = 3; const shape = m.agg && m.side === 'mixed' ? 'square' : shapeOfSide(m.side === 'mixed' ? 'x' : m.side); const sp = shadowSprite(P, Math.round(W - 2 * ring - off), Math.round(H - 2 * ring - off), shape, layers, S, m.big ? L * P['light.liftPerEchelon'] : 0); c.globalAlpha = 0.9; c.drawImage(sp.canvas, -W / 2 + ring + off + sp.ox, -H / 2 + ring + off + sp.oy, sp.w, sp.h); c.globalAlpha = 1; } catch { /* no sprite in a headless context */ }
  if (o.flutter) { const A = o.flutter; m.fl = [A * Math.sin(1.0), A * Math.sin(2.9), A * Math.sin(4.9)]; }
  paintMark(c, m, gg); paintOverlay(c, m, P, o.selected ? 1 : 0, o.hover ? 1 : 0); c.restore();
  return { w: W * sc, h: H * sc, scale: sc };
}

function sample(c, ch, v, g, w, h) {
  const P = g.P; const sm = (o) => paintSpec(c, g.skin, o, { w, h });
  switch (ch) {
    case 'side': if (v === 'mixed') sm({ code: 'Both sides', count: '6', agg: true, side: 'mixed', sides: ['union', 'confederate'] }); else sm({ code: v === 'unknown' ? '10 AL' : v === 'union' ? '14 VT' : '4 AL', side: v }); break;
    case 'arm': if (v === 'formation') sm({ code: 'II/2/1', ech: 2, arm: 'formation' }); else if (v === 'mixed') sm({ code: 'Union', count: '5', agg: true, side: 'union' }); else sm({ code: v === 'infantry' ? '14 VT' : v === 'cavalry' ? 'CAV/2' : '3 NY', arm: v }); break;
    case 'echelon': sm({ code: v === 1 ? '2 ME' : v === 2 ? 'II/2/1' : v === 3 ? 'II/2' : 'II', ech: v, arm: v === 1 ? 'artillery' : 'formation' }); break;
    case 'strength': sm({ code: '14 VT', ratio: v }); break;
    case 'fix': sm({ code: '14 VT', carried: v === 'carried' ? 1 : 0 }); break;
    case 'idOnly': sm({ code: '10 AL', idOnly: true, side: 'confederate' }); break;
    case 'aggregate': sm({ code: 'II/2/1', count: '7', agg: true }); break;
    case 'selection': { sm({ code: '14 VT' }); c.strokeStyle = P['color.accent']; c.lineWidth = 1.5; c.strokeRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2); break; }
    case 'pin': { c.beginPath(); c.moveTo(-12, 6); c.quadraticCurveTo(-4, 6, 6, -3); c.strokeStyle = rgba(P['color.keyline'], 0.4); c.lineWidth = 3; c.stroke(); c.strokeStyle = rgba(P['color.bone'], 0.85); c.lineWidth = 1; c.stroke(); for (const [r2, col] of [[3.6, rgba(P['color.keyline'], 0.8)], [2.7, P['color.bone']], [1.7, P['color.union.hi']]]) { c.beginPath(); c.arc(-12, 6, r2, 0, TAU); c.fillStyle = col; c.fill(); } break; }
    default: return false;
  }
  return true;
}

export const PREMIUM = defineFamily({
  id: 'premium', label: 'Strategy Premium', version: '1.0', footprint: FOOT, fonts: (P) => fontSpecs(P), layout: layoutOf, tokens: PREMIUM_TOKENS,
  channels: { side: true, arm: true, echelon: true, strength: true, fix: true, idOnly: true, aggregate: true, selection: true, pin: true },
  swatch: { w: 78, h: 38 }, fallbackSwatch: '#2f66a8', draw: { tile, shadow, grow, pin, leader, hull }, sample,
}, PREMIUM_VARIANTS);

// a debug and test hook (the legibility test and the specimen tools paint marks from a description, outside the engine)
if (typeof window !== 'undefined') window.__premium = { paintSpec, PREMIUM, nameOf, fontSpecs };

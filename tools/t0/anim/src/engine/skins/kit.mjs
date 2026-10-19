// skins/kit.mjs - the SKIN KIT: everything a skin needs that is not its design.  A skin supplies a token table, a footprint and a few drawing functions; the kit supplies the honest view
// model (semantics.mjs), the eased interaction state, the per-tile choreography progress, level-of-detail fades, pixel snapping for crisp edges, safe text fitting, the legend generator
// and the live tweak API.  The aim: a designer changes TOKENS (spec files) without touching code, and a new skin is mostly drawing.
//
//   defineSkin({ id, label, version, family?, variant?, footprint, fonts?, tokens, channels, draw: { tile(c, t, g), label?(c, t, g), pin?, leader?(c, t, g, a, b), hull?(c, t, g, pts) }, sample(c, channel, value, g, w, h) })
//       -> a skin definition that kernel.skins.register() accepts (draw.tile ... plus legend() and the token table as skin.tokenDocs)
//   defineFamily(base, variants) -> [skin, skin/cvd, skin/contrast ...]   the same drawing code under different token sets (colour-blind safe, high contrast)
//
// WHAT g (the second argument of every drawing function) CARRIES, per tile and frame:
//   g.P            tokens (plain object, g.P['color.union']);  g.col(name, alpha) -> css colour of a colour token;  g.mix(a, b, k)
//   g.vm           the view model (semantics.mjs describe): side, arm, ech, ratio, posture, fresh/carried, badge ...
//   g.w g.h        footprint box size;  g.body = { x, y, w, h } the box inset by spec.ring (draw your body there; the margin is the selection ring's)
//   g.sel g.hov    0..1 EASED selection and hover (critically damped, wall-clock, reduced-motion aware)
//   g.enter        0..1 arrival / departure progress taken from the tile's own scale (the display layer ramps it): 0 = just born or nearly gone, 1 = settled.  Continuous: no pop
//   g.rest         0..1: 1 once the tile has stopped moving, so hairlines can settle onto the device-pixel grid (applied by the kit as a translation before tile() is called)
//   g.at(z0, span) 0..1 level-of-detail fade by zoom (secondary detail collapses by zoom; the vital channels never do)
//   g.cat(chan, v) cross-fade of a categorical channel when its value changes: { from, to, m } (draw `from` at 1-m and `to` at m): a keyframe that changes posture does not pop
//   g.lw(v)        a line width rounded DOWN-ish to whole device pixels (1.5 px is 1 px at DPR 1 and 1.5 px at DPR 2: always crisp)
//   g.cr(v, lw)    snap a coordinate to the device-pixel grid for a stroke of width lw: crisp 1 px lines at DPR 1, 2 and 3
//   g.text(c, s, x, y, maxW, align)  draws text and condenses it (never overflows) when it is wider than maxW: a font that renders wider than measured cannot push ink out of the box
// The ink of tile() must stay inside the footprint box (skins/contract.mjs checkSkin); the honesty rules of contract.mjs apply (every mark backed by a field; Modelled must not look
// Documented; side 'unknown' must not look like a side).
import { dampStep } from '../interp/damp.mjs';
import { describe, CHANNELS } from './semantics.mjs';

export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const lerp = (a, b, k) => a + (b - a) * k;
export const ss = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// ---- colour helpers ---------------------------------------------------------------------------------------------------------------------------------------------
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const rgbCache = new Map(); const rgbaCache = new Map();
export function hexToRgb(hex) {
  let v = rgbCache.get(hex); if (v) return v;
  if (!HEX.test(hex)) throw new Error(`not a colour: ${hex}`);
  let h = hex.slice(1); if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  v = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; rgbCache.set(hex, v); return v;
}
export function rgba(hex, a = 1) {
  const q = Math.round(clamp01(a) * 100) / 100; const k = hex + '|' + q; let s = rgbaCache.get(k);
  if (!s) { const [r, g, b] = hexToRgb(hex); s = `rgba(${r},${g},${b},${q})`; if (rgbaCache.size > 6000) rgbaCache.clear(); rgbaCache.set(k, s); }
  return s;
}
export function mixHex(a, b, k) { const A = hexToRgb(a); const B = hexToRgb(b); return '#' + [0, 1, 2].map((i) => Math.round(lerp(A[i], B[i], clamp01(k))).toString(16).padStart(2, '0')).join(''); }
/** relative luminance (WCAG) and contrast ratio: used by the skins' own tests, exported so a designer can check a palette */
export function luminance(hex) { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; const [r, g, b] = hexToRgb(hex); return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); }
export function contrast(a, b) { const la = luminance(a); const lb = luminance(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); }

// ---- token tables ---------------------------------------------------------------------------------------------------------------------------------------------------
/** rows: [name, value, doc, opts?]  opts = { min, max, unit }.  A colour is a '#rrggbb' string, a number may carry min/max, a boolean is a boolean.  Returns the table. */
export function compileTokens(rows, owner = 'skin') {
  const byName = new Map(); const P = {};
  for (const r of rows) {
    const [name, value, doc, opts = {}] = r;
    if (typeof name !== 'string' || !/^[a-z][a-zA-Z0-9]*(\.[a-zA-Z0-9]+)+$/.test(name)) throw new Error(`${owner}: bad token name ${JSON.stringify(name)}`);
    if (byName.has(name)) throw new Error(`${owner}: duplicate token ${name}`);
    if (typeof doc !== 'string' || doc.length < 6) throw new Error(`${owner}: token ${name} needs a doc string`);
    const type = typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'boolean' : typeof value === 'string' && HEX.test(value) ? 'color' : 'string';
    if (type === 'number' && !Number.isFinite(value)) throw new Error(`${owner}: token ${name} is not finite`);
    const def = { name, type, value, doc, min: opts.min, max: opts.max, unit: opts.unit || '' };
    const bad = checkToken(def, value); if (bad) throw new Error(`${owner}: token ${name}: ${bad}`);
    byName.set(name, def); P[name] = value;
  }
  return { byName, P, rows };
}
export function checkToken(def, v) {
  if (def.type === 'number') { if (typeof v !== 'number' || !Number.isFinite(v)) return 'expected a finite number'; if (def.min !== undefined && v < def.min) return `${v} is below ${def.min}`; if (def.max !== undefined && v > def.max) return `${v} is above ${def.max}`; return null; }
  if (def.type === 'color') return typeof v === 'string' && HEX.test(v) ? null : 'expected #rrggbb';
  if (def.type === 'boolean') return typeof v === 'boolean' ? null : 'expected true or false';
  return typeof v === 'string' ? null : 'expected a string';
}

// ---- clock, frames, eased state ------------------------------------------------------------------------------------------------------------------------------
let clock = { now: () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) };
/** tests and screenshots replace the wall clock; the picture is then a pure function of the injected time */
export function setClock(c) { clock = c; }

const FRAME = { env: null, now: 0, dt: 16.7, n: 0, birth: 0.6, reduced: false, active: false, pumping: false };
const STORE = new Map();                                    // tile key -> state (eased channels, categorical cross-fades, position history)
let hoverKey = null; let hoverAttached = false; let snapOn = true;
const registry = new Map();                                 // skin id -> skin (for the tweak API)

function newFrame(env) {
  const now = clock.now(); const gap = FRAME.n ? now - FRAME.now : 16.7;
  FRAME.dt = Math.min(100, Math.max(0, gap)); FRAME.now = now; FRAME.env = env; FRAME.n++; FRAME.active = false;
  const tok = env.tok; let birth = 0.6; let red = false;
  try { const b = tok('motion.birthScale'); if (typeof b === 'number' && b >= 0 && b < 1) birth = b; const m = tok('motion.reduced'); red = m === 'on' || (m === 'auto' && typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches); } catch { /* a standalone caller without the engine's tokens */ }
  FRAME.birth = birth; FRAME.reduced = red;
  if ((FRAME.n & 63) === 0) for (const [k, s] of STORE) if (FRAME.n - s.seen > 120) STORE.delete(k);          // forget tiles that have not been drawn for a while
}

function stateOf(key) { let s = STORE.get(key); if (!s) { s = { seen: 0, ch: {}, cat: {}, px: NaN, py: NaN, still: 0 }; STORE.set(key, s); } s.seen = FRAME.n; return s; }
function ease(s, name, target, smoothMs, first) {
  let c = s.ch[name]; if (!c) c = s.ch[name] = { x: first === undefined ? target : first, v: 0 };
  if (FRAME.reduced || smoothMs <= 0) { c.x = target; c.v = 0; return target; }
  if (c.x === target) return target;
  const r = dampStep(c.x, c.v, target, smoothMs / 1000, FRAME.dt / 1000);
  c.x = r[0]; c.v = r[1];
  if (Math.abs(c.x - target) < 0.004 && Math.abs(c.v) < 0.02) { c.x = target; c.v = 0; return target; }
  FRAME.active = true; return c.x;
}
function cat(s, name, value, ms) {
  let c = s.cat[name];
  if (!c) { c = s.cat[name] = { to: value, from: null, m: 1 }; return c; }
  if (c.to !== value) { c.from = c.to; c.to = value; c.m = FRAME.reduced ? 1 : 0; }
  if (c.m < 1) { c.m = Math.min(1, c.m + FRAME.dt / ms); if (c.m < 1) FRAME.active = true; else c.from = null; }
  return c;
}

/** ask the host to draw another frame while something is still easing.  The skin contract has no redraw request, so this goes through the Studio's test hook (window.__studio) when it
 *  exists and does nothing otherwise (the picture then simply eases on the next frame the host draws anyway).  Engine request: an env.invalidate() would make this a clean call. */
let invalidateHook = null;
function invalidate() { if (invalidateHook) invalidateHook(); }
function pump() {
  if (!FRAME.active || FRAME.pumping || typeof requestAnimationFrame !== 'function') return;
  FRAME.pumping = true; requestAnimationFrame(() => { FRAME.pumping = false; invalidate(); });
}
function attachHover() {
  if (hoverAttached || typeof document === 'undefined') return;
  const cv = document.getElementById('map'); if (!cv) return; hoverAttached = true;
  const at = (e) => { const r = cv.getBoundingClientRect(); const s = globalThis.__studio; if ((e.buttons & 1) || !s || !s.engine) return null; const t = s.engine.hit(e.clientX - r.left, e.clientY - r.top); return t ? t.key : null; };
  cv.addEventListener('pointermove', (e) => { const k = at(e); if (k !== hoverKey) { hoverKey = k; invalidate(); } });
  cv.addEventListener('pointerleave', () => { if (hoverKey !== null) { hoverKey = null; invalidate(); } });
}

// ---- text -------------------------------------------------------------------------------------------------------------------------------------------------------------
const TW = new Map();
function textWidth(c, s) { const k = c.font + '|' + s; let w = TW.get(k); if (w === undefined) { w = c.measureText(s).width; if (TW.size > 6000) TW.clear(); TW.set(k, w); } return w; }
/** fill text anchored at (x, y) with the context's textAlign / textBaseline; wider than maxW -> condensed horizontally about the anchor so the ink stays inside */
export function fitText(c, s, x, y, maxW, align) {
  if (align) c.textAlign = align;
  const w = textWidth(c, s);
  if (!(maxW > 0) || w <= maxW) { c.fillText(s, x, y); return Math.min(w, maxW || w); }
  c.save(); c.translate(x, y); c.scale(maxW / w, 1); c.fillText(s, 0, 0); c.restore(); return maxW;
}
export { textWidth };

/** how visible a displaced tile's pin should be: 0 while the true position lies under the tile's own chip (the pin would sit on its own text), rising to 1 three pixels outside it */
export function pinFade(t) {
  const hw = (t.w * t.scale) / 2; const hh = (t.h * t.scale) / 2; const dx = Math.max(Math.abs(t.x - t.ax) - hw, 0); const dy = Math.max(Math.abs(t.y - t.ay) - hh, 0);
  const d = Math.hypot(dx, dy); return Number.isFinite(d) ? ss(0, 3.5, d) : 1;
}

/** a segmented gauge in TWO paint calls (all empty segments, all lit segments) instead of two per segment: x, y, w, h, n segments, gap px, ratio 0..1; styles are css colours or gradients */
export function meter(c, x, y, w, h, n, gap, ratio, trackStyle, litStyle) {
  const sw = (w - (n - 1) * gap) / n; c.beginPath();
  for (let i = 0; i < n; i++) c.rect(x + i * (sw + gap), y, sw, h);
  c.fillStyle = trackStyle; c.fill(); c.beginPath(); let any = false;
  for (let i = 0; i < n; i++) { const f = clamp01(ratio * n - i); if (f > 0.004) { c.rect(x + i * (sw + gap), y, sw * f, h); any = true; } }
  if (any) { c.fillStyle = litStyle; c.fill(); }
}

// ---- gradients are cached (a CanvasGradient is defined in the local coordinate space, so it can be reused by every tile of the same geometry) -------------------------------------
const GRADS = new Map();
/** linear gradient from (x0,y0) to (x1,y1) with stops [[offset, css], ...]; cached by its own description */
export function lin(c, x0, y0, x1, y1, stops) {
  const k = x0 + ',' + y0 + ',' + x1 + ',' + y1 + '|' + stops.map((s) => s[0] + s[1]).join('|'); let g = GRADS.get(k);
  if (!g) { g = c.createLinearGradient(x0, y0, x1, y1); for (const s of stops) g.addColorStop(s[0], s[1]); if (GRADS.size > 800) GRADS.clear(); GRADS.set(k, g); }
  return g;
}

// ---- the per-tile context g ---------------------------------------------------------------------------------------------------------------------------------
function makeG(skin) {
  const g = {
    skin, P: skin.P, t: null, env: null, vm: null, dpr: 1, zoom: 15, w: 0, h: 0, hw: 0, hh: 0, ring: 2, body: { x: 0, y: 0, w: 0, h: 0 }, sel: 0, hov: 0, enter: 1, rest: 0, now: 0, st: null, cell: null,
    col(name, a = 1) { return rgba(this.P[name], a); },
    mix(a, b, k) { return mixHex(this.P[a], this.P[b], k); },
    at(z0, span = 0.6) { return ss(z0, z0 + span, this.zoom); },
    cat(name, v, ms = 200) { return this.st ? cat(this.st, name, v, ms) : { from: null, to: v, m: 1 }; },
    ease(name, target, ms = 120) { return this.st ? ease(this.st, name, target, ms) : target; },
    lw(v) { return Math.max(1, Math.floor(v * this.dpr + 0.49)) / this.dpr; },
    cr(v, lw = 1) { const d = this.dpr; return Math.round((v - lw / 2) * d) / d + lw / 2; },
    text(c, s, x, y, maxW, align) { return fitText(c, s, x, y, maxW, align); },
  };
  return g;
}

function prepare(skin, g, c, t, env) {
  if (FRAME.env !== env) newFrame(env);
  const spec = env.spec; const st = stateOf(t.key);
  g.t = t; g.env = env; g.vm = describe(t); g.dpr = env.dpr || 1; g.zoom = env.zoom; g.now = FRAME.now; g.st = st; g.P = skin.P;
  g.w = t.w; g.h = t.h; g.hw = t.w / 2; g.hh = t.h / 2; g.ring = spec.ring;
  g.body.x = -g.hw + g.ring; g.body.y = -g.hh + g.ring; g.body.w = t.w - 2 * g.ring; g.body.h = t.h - 2 * g.ring;
  g.sel = ease(st, 'sel', t.selected ? 1 : 0, skin.P['motion.selectMs']);
  g.hov = ease(st, 'hov', hoverKey === t.key && t.solid ? 1 : 0, skin.P['motion.hoverMs']);
  const p = FRAME.birth < 1 ? clamp01((t.scale - FRAME.birth) / (1 - FRAME.birth)) : 1;
  g.enter = t.entering || t.life === 'dying' ? p : 1;
  // rest: has this tile stopped moving on the device-pixel grid?
  const m = typeof c.getTransform === 'function' ? c.getTransform() : null; let shx = 0; let shy = 0; let restTarget = 0;
  if (m) {
    const dxm = m.e - st.px; const dym = m.f - st.py; st.px = m.e; st.py = m.f;
    st.still = Math.abs(dxm) < 0.04 && Math.abs(dym) < 0.04 ? Math.min(st.still + 1, 99) : 0;
    restTarget = snapOn && st.still >= 2 && Math.abs(m.a - g.dpr) < 1e-3 ? 1 : 0;
    g.rest = ease(st, 'rest', restTarget, 70);
    if (restTarget === 0 && g.rest === 0) { st.snapX = undefined; st.snapY = undefined; }
    if (g.rest > 0) {                                     // latch the pixel the plate settles on; a tile that creeps by a fraction of a pixel keeps it (hysteresis) instead of hopping at every rounding boundary
      const left = m.e - g.hw * m.a; const top = m.f - g.hh * m.d;
      if (st.snapX === undefined || Math.abs(left - st.snapX) > 0.65) st.snapX = Math.round(left); if (st.snapY === undefined || Math.abs(top - st.snapY) > 0.65) st.snapY = Math.round(top);
      shx = (st.snapX - left) * g.rest / m.a; shy = (st.snapY - top) * g.rest / m.d;
    }
  } else g.rest = 0;
  g.shx = shx; g.shy = shy;
  return g;
}
const light = (skin, g, t, env) => { if (FRAME.env !== env) newFrame(env); g.t = t; g.env = env; g.dpr = env.dpr || 1; g.zoom = env.zoom; g.P = skin.P; g.vm = describe(t); g.st = null; g.sel = 0; g.hov = 0; g.enter = 1; g.w = t.w; g.h = t.h; g.ring = env.spec.ring; return g; };

// ---- legend ---------------------------------------------------------------------------------------------------------------------------------------------------------
const swatchCache = new Map();
/** draw one sample into an 18 x 12 CSS-px canvas (at 3x) and return { css, drawn }: css is a `background` value; where no canvas exists (node) css is the fallback colour and drawn is true */
function swatchOf(skin, key, fallback, fn) {
  if (typeof document === 'undefined') return { css: fallback, drawn: true };
  const k = skin.id + '|' + key + '|' + skin.rev; let v = swatchCache.get(k); if (v) return v;
  try {
    const W = 18; const H = 12; const D = 3; const cv = document.createElement('canvas'); cv.width = W * D; cv.height = H * D; const c = cv.getContext('2d');
    c.setTransform(D, 0, 0, D, W * D / 2, H * D / 2); c.lineCap = 'round'; c.lineJoin = 'round';
    const drawn = fn(c, W, H) !== false;
    v = { css: drawn ? `url("${cv.toDataURL('image/png')}") center / 100% 100% no-repeat` : fallback, drawn };
  } catch { v = { css: fallback, drawn: false }; }
  swatchCache.set(k, v); return v;
}

function legendOf(skin, impl) {
  const rows = []; const sg = makeG(skin); sg.dpr = 3; sg.zoom = 17; sg.enter = 1; sg.rest = 0; sg.ring = impl.footprint && impl.footprint.ring !== undefined ? impl.footprint.ring : 2;
  for (const [ch, want] of Object.entries(impl.channels)) {
    const def = CHANNELS[ch]; if (!def) throw new Error(`skin ${skin.id}: unknown channel "${ch}"`);
    const vals = want === true ? def.values : def.values.filter((v) => want.includes(v.id));
    for (const v of vals) {
      const sw = swatchOf(skin, ch + ':' + v.id, impl.fallbackSwatch || '#888', (c, w, h) => impl.sample(c, ch, v.id, sg, w, h));
      if (!sw.drawn) continue;                                                       // a value the skin cannot draw is not in its legend
      rows.push({ swatch: sw.css, text: (impl.legendText && impl.legendText[ch + ':' + v.id]) || v.text, evidence: (impl.legendEvidence && impl.legendEvidence[ch + ':' + v.id]) || v.evidence, channel: ch, value: v.id });      // FORK: the sentences of semantics.mjs are self-describing, no title prefix
    }
  }
  return rows;
}

// ---- defineSkin ----------------------------------------------------------------------------------------------------------------------------------------------------
const EVID_OK = new Set(['Documented', 'Measured', 'Computed', 'Modelled', 'Contested', 'Unknown', 'Design']);

/** @param {object} def see the header of this file */
export function defineSkin(def) {
  for (const k of ['id', 'label', 'version', 'tokens', 'footprint', 'channels', 'draw', 'sample']) if (def[k] === undefined) throw new Error(`defineSkin(${def.id || '?'}): missing "${k}"`);
  const table = def.tokens.byName ? def.tokens : compileTokens(def.tokens, def.id);
  for (const n of ['motion.selectMs', 'motion.hoverMs']) if (!table.byName.has(n)) throw new Error(`defineSkin(${def.id}): token ${n} is required (the eased selection and hover)`);
  const skin = { id: def.id, label: def.label, version: def.version, family: def.family || def.id, variant: def.variant || null, P: { ...table.P }, tokenDocs: table, rev: 0, footprint: def.footprint, fonts: def.fonts, channels: def.channels, reads: null };
  const g = makeG(skin); const gl = makeG(skin);
  const wrap = (fn) => fn && ((c, t, env, a, b) => { fn(c, t, light(skin, gl, t, env), a, b); });
  if (typeof def.draw.tile !== 'function') throw new Error(`defineSkin(${def.id}): draw.tile(c, t, g) is required`);
  const D = def.draw;
  const draw = {
    tile(c, t, env) {
      prepare(skin, g, c, t, env);
      c.save(); if (g.shx || g.shy) c.translate(g.shx, g.shy);
      try { D.tile(c, t, g); } finally { c.restore(); }
      pump();
    },
  };
  if (D.label) draw.label = (c, t, env) => { D.label(c, t, light(skin, gl, t, env)); };
  if (D.pin) draw.pin = wrap(D.pin);
  if (D.leader) draw.leader = (c, t, env, a, b) => { D.leader(c, t, light(skin, gl, t, env), a, b); };
  if (D.hull) draw.hull = (c, t, env, pts) => { D.hull(c, t, light(skin, gl, t, env), pts); };
  const out = { id: def.id, label: def.label, version: def.version, family: skin.family, variant: skin.variant, footprint: def.footprint, fonts: def.fonts, draw, channels: def.channels, tokenDocs: table, skin, sizer: typeof def.sizer === 'function' ? def.sizer(skin) : null };      // FORK: sizer(skin) -> { key, leaf, agg }: the footprint by detail level (layout/spec.mjs)
  out.legend = () => legendOf(skin, def);
  if (typeof def.figure === 'function') { const gf = makeG(skin); out.figure = (c, w) => { const m = typeof c.getTransform === 'function' ? c.getTransform() : null; gf.dpr = m ? m.a : 1; gf.ring = def.footprint && def.footprint.ring !== undefined ? def.footprint.ring : 2; return def.figure(c, gf, w); }; out.figureH = def.figureH || 300; out.figureMeasure = (w) => { try { if (typeof OffscreenCanvas === 'undefined') return out.figureH; const cv = new OffscreenCanvas(4, 4); const c = cv.getContext('2d'); return Math.ceil(out.figure(c, w)) + 6; } catch { return out.figureH; } }; }      // figureMeasure(w): the height the figure needs at width w (it is drawn once on a throwaway canvas)      // POLISH 1: the legend's figure (anatomy of the marks), drawn with the skin's own code
  if (def.fonts) { for (const k of ['code', 'label', 'badge']) if (typeof def.fonts[k] !== 'string') throw new Error(`defineSkin(${def.id}): fonts.${k}`); }
  for (const [ch] of Object.entries(def.channels)) if (!CHANNELS[ch]) throw new Error(`defineSkin(${def.id}): unknown channel ${ch}`);
  skin.def = def; skin.out = out; registry.set(def.id, skin);
  applyUrlSettings(skin);
  return out;
}

/** one drawing, several token sets.  variants = { cvd: { label, set: { 'color.union': '#0072b2', ... } }, ... } -> [base, base/cvd, ...] */
export function defineFamily(base, variants = {}) {
  const table = compileTokens(base.tokens, base.id); const out = [defineSkin({ ...base, tokens: table })];
  for (const [vid, v] of Object.entries(variants)) {
    const rows = table.rows.map((r) => (v.set[r[0]] !== undefined ? [r[0], v.set[r[0]], r[2], r[3]] : r));
    for (const k of Object.keys(v.set)) if (!table.byName.has(k)) throw new Error(`${base.id}/${vid}: unknown token ${k}`);
    out.push(defineSkin({ ...base, id: `${base.id}/${vid}`, label: `${base.label}: ${v.label}`, variant: vid, family: base.id, tokens: compileTokens(rows, `${base.id}/${vid}`) }));
  }
  return out;
}

// ---- live tweaking --------------------------------------------------------------------------------------------------------------------------------------------------
/** set one token of a registered skin right now (the next frame uses it).  Validates against the token's own range.  Returns the old value. */
export function setToken(skinId, name, value) {
  const s = registry.get(skinId); if (!s) throw new Error(`no skin ${skinId}`);
  const def = s.out.tokenDocs.byName.get(name); if (!def) throw new Error(`skin ${skinId}: no token ${name}`);
  const bad = checkToken(def, value); if (bad) throw new Error(`skin ${skinId}: token ${name}: ${bad}`);
  const old = s.P[name]; s.P[name] = value; s.rev++; invalidate(); return old;
}
function applyUrlSettings(skin) {
  if (typeof location === 'undefined' || !location.search) return;
  let raw = null; try { raw = new URLSearchParams(location.search).get('skinset'); } catch { return; } if (!raw) return;
  try {
    const o = JSON.parse(raw); const mine = o[skin.id] || {}; const fam = skin.variant ? {} : o['*'] || {};
    for (const [n, v] of Object.entries({ ...fam, ...mine })) { const def = skin.out.tokenDocs.byName.get(n); if (!def) { console.warn(`skinset: ${skin.id} has no token ${n}`); continue; } const bad = checkToken(def, v); if (bad) console.warn(`skinset: ${n}: ${bad}`); else skin.P[n] = v; }
  } catch (e) { console.warn('bad ?skinset', e.message); }
}
/** every token of a skin as a settings object (what a designer pastes into the spec file or ?skinset=) */
export function exportTokens(skinId) { const s = registry.get(skinId); if (!s) throw new Error(`no skin ${skinId}`); return { [skinId]: { ...s.P } }; }

export const skinKit = { onInvalidate(fn) { invalidateHook = fn; }, setToken, exportTokens, setClock, setSnap(v) { snapOn = !!v; }, ids: () => [...registry.keys()], hover: () => hoverKey, setHover(k) { hoverKey = k; }, frame: FRAME, states: STORE, reset() { STORE.clear(); TW.clear(); GRADS.clear(); hoverKey = null; FRAME.env = null; FRAME.n = 0; } };
if (typeof window !== 'undefined') window.__skinKit = skinKit;
export { EVID_OK };

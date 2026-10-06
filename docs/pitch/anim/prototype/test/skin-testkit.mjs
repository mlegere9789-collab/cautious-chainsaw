// test/skin-testkit.mjs - helpers shared by the skin tests: a SPY drawing context (records every paint call with the colours in force, so a test can say "this tile used no Union colour"
// and "changing this field changes the ink"), a specimen builder on real units, and colour-vision-deficiency / contrast arithmetic.
import { recordingContext } from '../src/skins/contract.mjs';

const ROUND = (v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v);
const PAINT = new Set(['fill', 'stroke', 'fillRect', 'strokeRect', 'fillText', 'drawImage']);
const PATH = new Set(['moveTo', 'lineTo', 'arc', 'arcTo', 'rect', 'roundRect', 'quadraticCurveTo', 'bezierCurveTo', 'translate', 'scale', 'rotate', 'clip', 'setLineDash', 'save', 'restore', 'beginPath', 'closePath']);

/** a recording context that also logs every call.  ctx.log = lines; ctx.signature() = the whole log; ctx.colors() = every colour string painted with (fill, stroke, text, gradient stops) */
export function spyContext(textModel) {
  const base = recordingContext(textModel); const log = []; const colours = new Set();
  const note = (s) => { if (typeof s === 'string') colours.add(s); else if (s && s.stops) for (const st of s.stops) colours.add(st); };
  const proxy = new Proxy(base, {
    get(t, k) {
      if (k === 'log') return log; if (k === 'colors') return () => [...colours]; if (k === 'signature') return () => log.join('\n'); if (k === 'base') return base;
      if (k === 'createLinearGradient') return (...a) => ({ stops: [], addColorStop(o, col) { this.stops.push(col); }, toString() { return 'grad(' + a.map(ROUND).join(',') + ':' + this.stops.join('|') + ')'; } });
      const v = t[k];
      if (typeof v !== 'function' || k === 'measureText') return v;
      return (...a) => {
        if (PAINT.has(k)) { const fs = t.fillStyle; const ss = t.strokeStyle; log.push(`${k}(${a.map(ROUND).join(',')}) f=${String(fs)} s=${String(ss)} w=${ROUND(t.lineWidth)} a=${ROUND(t.globalAlpha)} font=${t.font}`); if (k === 'stroke' || k === 'strokeRect') note(ss); else if (k === 'drawImage') { /* no colour */ } else note(fs); }
        else if (PATH.has(k)) log.push(`${k}(${a.map(ROUND).join(',')})`);
        return v.apply(t, a);
      };
    },
    set(t, k, v) { t[k] = v; return true; },
  });
  return proxy;
}

export function parseColour(s) {
  let m = /^#([0-9a-f]{6})$/i.exec(s); if (m) return [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)];
  m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(s); if (m) return [+m[1], +m[2], +m[3]];
  return null;
}
export const sameRgb = (a, b) => a && b && a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
/** does any painted colour (incl. gradient stops) equal this hex colour? */
export function usesColour(spy, hex) { const want = parseColour(hex); return spy.colors().some((c) => { const p = parseColour(c); if (sameRgb(p, want)) return true; return c.includes('grad(') && c.split(/rgba?\(/).slice(1).some((x) => sameRgb(parseColour('rgba(' + x), want)); }); }

// ---- colour arithmetic -------------------------------------------------------------------------------------------------------------------------------------
const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const gam = (v) => { v = Math.max(0, Math.min(1, v)); return Math.round(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055)); };
export function contrastRatio(a, b) { const L = (rgb) => 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]); const la = L(a); const lb = L(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); }
export function toLab(rgb) {
  const r = lin(rgb[0]); const g = lin(rgb[1]); const b = lin(rgb[2]);
  const X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047; const Y = 0.2126 * r + 0.7152 * g + 0.0722 * b; const Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116); return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}
export const deltaE = (a, b) => { const x = toLab(a); const y = toLab(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };
/** Machado, Oliveira and Fernandes (2009) severity-1.0 simulation matrices in linear RGB, as the author recalls them (not re-verified against the paper: the checks that use them are indicative) */
export const CVD = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
  tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]],
};
export function simulate(rgb, kind) { const m = CVD[kind]; const l = [lin(rgb[0]), lin(rgb[1]), lin(rgb[2])]; return [0, 1, 2].map((i) => gam(m[i][0] * l[0] + m[i][1] * l[1] + m[i][2] * l[2])); }
export const hexRgb = (h) => parseColour(h);

// ---- specimens on real units ---------------------------------------------------------------------------------------------------------------------------
/** tile factories on the real units of an engine, sized with that engine's current spec (so each skin's own footprint) */
export function specimens(E) {
  const spec = E.spec(); const units = [...E.battle.units.values()];
  const pick = (f, n = 0) => units.filter(f)[n];
  const U = {
    inf: pick((u) => u.side === 'union' && u.kind === 'regiment' && u.arm === 'infantry' && u.inOob && u.short.length <= 6),
    csa: pick((u) => u.side === 'confederate' && u.kind === 'regiment' && u.arm === 'infantry' && u.inOob && u.short.length <= 6),
    cav: pick((u) => u.arm === 'cavalry' && u.kind === 'regiment') || pick((u) => u.arm === 'cavalry'), art: pick((u) => u.kind === 'battery' && u.side === 'union'),
    bat: pick((u) => u.kind === 'battalion'), bde: pick((u) => u.kind === 'brigade' && u.side === 'union' && /^U-II-/.test(u.id)), div: pick((u) => u.kind === 'division' && u.side === 'union'),
    unk: pick((u) => u.side === 'unknown'), idonly: pick((u) => !u.inOob && u.kind === 'regiment' && u.side === 'union'),
  };
  let n = 0;
  const tileFor = (u, over = {}, extra = {}) => {
    const short = extra.short ?? u.short; const badge = extra.badge ?? null; let w = spec.chipPadX * 2 + spec.glyphW + spec.glyphGap + spec.text.width('code', short) + 2 * spec.ring; if (badge) w += spec.badgeGap + spec.text.width('badge', badge) + 6;
    return { key: 'sp' + (n++), kind: 'leaf', ids: [u.id], n: 1, x: 0, y: 0, ax: 0, ay: 0, w: Math.max(spec.chipMinW, Math.ceil(w)), h: spec.chipH, scale: 1, opacity: 1, solid: true, life: 'live', entering: false, travelling: false, displaced: false,
      side: u.side, arm: u.arm, short, badge, nameKind: null, ratio: 1, strength: u.strengthRef, disposition: 'Line of Battle', selected: false, unit: u, ageTicks: 0, ageMin: 0, ageMax: 0, moving: false, members: null, label: null, ...over };
  };
  const aggTile = (over = {}) => { const short = over.short || 'XII/2/1'; const badge = over.badge || '×5'; const w = spec.chipPadX * 2 + spec.glyphW + spec.glyphGap + spec.text.width('code', short) + 2 * spec.ring + spec.badgeGap + spec.text.width('badge', badge) + 6;
    return { key: 'sp' + (n++), kind: 'agg', ids: ['a', 'b'], n: 5, x: 0, y: 0, ax: 0, ay: 0, w: Math.max(spec.chipMinW, Math.ceil(w)), h: spec.chipH, scale: 1, opacity: 1, solid: true, life: 'live', entering: false, travelling: false, displaced: false,
      side: 'union', arm: 'infantry', short, badge, nameKind: 'brigade', ratio: 0.8, strength: 1500, disposition: null, selected: false, unit: null, ageTicks: 20, ageMin: 5, ageMax: 20, moving: false, members: null, label: null, ...over }; };
  const corpsUnit = (roman, div) => pick((u) => u.side === 'union' && u.kind === 'regiment' && u.arm === 'infantry' && u.inOob && u.parentSource === 'oob' && u.chain.some((c) => c.startsWith('U-' + roman + '-')) && (!div || u.chain.includes(`U-${roman}-${div}`)));
  return { spec, U, units, tileFor, aggTile, corpsUnit, pick };
}

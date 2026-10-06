// Deterministic harness around the app's OWN code (y1/F4/lS/Ed/uF/dA/cA extracted from the bundle by model.mjs).
// A fake 2D context records every draw the unit canvas routine makes, in the same shape probe.js records in the browser.
import fs from 'node:fs';
import vm from 'node:vm';
import { loadModel } from './model.mjs';
const W = 'C:/Users/mlege/gettysburg-map/tmp/pitch-anim/a1/';

export const WORLD = 512;
export function mercator(center, zoom, W, H) {
  const s = WORLD * 2 ** zoom;
  const fx = (lng) => ((lng + 180) / 360) * s;
  const fy = (lat) => (0.5 - Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / (2 * Math.PI)) * s;
  const cx = fx(center[0]), cy = fy(center[1]);
  return { project: ([lng, lat]) => ({ x: W / 2 + fx(lng) - cx, y: H / 2 + fy(lat) - cy }), pxPerDegLng: s / 360 };
}
let widthTable = null;
export function loadWidths() { if (!widthTable) { try { widthTable = JSON.parse(fs.readFileSync(W + 'text-widths.json', 'utf8')); } catch { widthTable = {}; } } return widthTable; }
export function textWidth(font, text) {
  const t = loadWidths(); const k = font + '|' + text; if (t[k] != null) return t[k];
  const size = +/(\d+)px/.exec(font)[1]; return (textWidth.missing = (textWidth.missing || 0) + 1, text.length * size * 0.62);
}

export class RecCtx {
  constructor(canvas) {
    this.canvas = canvas; this.fillStyle = '#000'; this.strokeStyle = '#000'; this.lineWidth = 1; this.shadowBlur = 0; this.shadowColor = 'rgba(0, 0, 0, 0)'; this.globalAlpha = 1; this.font = '10px sans-serif';
    this.frames = []; this.cur = null; this.st = { stack: [], tx: 0, ty: 0, ang: 0, inTile: null, dash: false, leaderStart: null };
  }
  clearRect(x, y, w, h) { this.cur = { tiles: [], dots: [], labels: [], leaders: 0, other: [] }; this.frames.push(this.cur); this.st = { stack: [], tx: 0, ty: 0, ang: 0, inTile: null, dash: false, leaderStart: null }; }
  save() { this.st.stack.push({ tx: this.st.tx, ty: this.st.ty, ang: this.st.ang }); this.st.inTile = null; }
  restore() { const s = this.st.stack.pop(); if (s) { this.st.tx = s.tx; this.st.ty = s.ty; this.st.ang = s.ang; } }
  translate(x, y) { const st = this.st; st.tx += x; st.ty += y; st.inTile = { x: r2(st.tx), y: r2(st.ty) }; }
  rotate(a) { this.st.ang += a; if (this.st.inTile) this.st.inTile.ang = r2((a * 180) / Math.PI); }
  setLineDash(d) { this.st.dash = !!(d && d.length); }
  beginPath() {}
  fillRect(x, y, w, h) {
    const st = this.st;
    if (st.inTile) { this.cur.tiles.push({ ...st.inTile, shadow: this.shadowBlur, kind: 'rect', w: r2(w), h: r2(h), fill: String(this.fillStyle), alpha: this.globalAlpha }); st.inTile.used = true; }
    else if (this.fillStyle === 'rgba(0,0,0,0.72)') this.cur.labels.push({ bx: r2(x), by: r2(y), bw: r2(w), bh: r2(h), text: null });
  }
  strokeRect(x, y, w, h) { const st = this.st; if (st.inTile && !st.inTile.used) { this.cur.tiles.push({ ...st.inTile, shadow: this.shadowBlur, kind: 'art', w: r2(w), h: r2(h), fill: null, alpha: this.globalAlpha }); st.inTile.used = true; } }
  moveTo(x, y) { const st = this.st; if (st.inTile && !st.inTile.used && st.dash) st.inTile.sk = { x0: x }; else if (!st.inTile && this.lineWidth === 0.5) st.leaderStart = [x, y]; }
  lineTo(x, y) {
    const st = this.st;
    if (st.inTile && st.inTile.sk && !st.inTile.used) { this.cur.tiles.push({ ...st.inTile, shadow: this.shadowBlur, kind: 'skirm', w: r2(Math.abs(x - st.inTile.sk.x0)), h: 2, fill: null, alpha: this.globalAlpha }); st.inTile.used = true; }
    else if (!st.inTile && this.lineWidth === 0.5 && st.leaderStart) { this.cur.leaders++; st.leaderStart = null; }
  }
  stroke() {}
  arc(x, y, r) { if (r === 3.5) this.cur.dots.push({ x: r2(x), y: r2(y), color: null }); }
  fill() { const D = this.cur.dots[this.cur.dots.length - 1]; if (D && D.color === null) D.color = String(this.fillStyle); }
  measureText(t) { return { width: textWidth(this.font, String(t)) }; }
  fillText(t, x, y) {
    const L = this.cur.labels[this.cur.labels.length - 1];
    if (/ fps$/.test(String(t))) this.cur.fps = String(t);
    else if (L && L.text === null) { L.text = String(t); L.x = r2(x); L.y = r2(y); L.font = this.font; L.tw = textWidth(this.font, String(t)); }
  }
}
const r2 = (v) => Math.round(v * 100) / 100;

/** A deterministic app instance: the shipped Ed loop driven by explicit frame times. */
export function makeApp(which, { pbt, W: cw = 1440, H: ch = 852, center = [-77.235, 39.812], zoom = 13.5, tick = 1, speed = 1, reduceMotion = false, filters } = {}) {
  const api = loadModel(which);
  const canvas = { width: cw, height: ch, getBoundingClientRect: () => ({ width: cw, height: ch }) };
  const ctx = new RecCtx(canvas); canvas.getContext = () => ctx;
  const map = { ...mercator(center, zoom, cw, ch), getZoom: () => zoom };
  const state = { currentTick: tick, isPlaying: true, playbackSpeed: speed, placementsByTick: pbt, filters: filters || { sides: ['Union', 'Confederate'], dispositions: undefined, minStrength: 0 }, selectedUnitId: null, pinnedUnitId: null };
  const raf = { cb: null };
  const g = api.__ctx; // vm global
  g.requestAnimationFrame = (cb) => { raf.cb = cb; return 1; };
  g.cancelAnimationFrame = () => { raf.cb = null; };
  g.performance = { now: () => 0 };
  g.window.__gtbgReduceMotion = reduceMotion;
  // stub trails (cA draws on a module canvas that does not exist here): trails are not part of the position model
  const app = {
    api, ctx, state, canvas, map, raf, lastY1: null,
    setView(c, z) { map.project = mercator(c, z, cw, ch).project; map.getZoom = () => z; },
    start() { api.Gk(() => state, (p) => { Object.assign(state, p); }, canvas, map); },
    step(t) { const cb = raf.cb; if (!cb) return false; raf.cb = null; cb(t); return true; },
    drawStill(tick, selected = null) { state.currentTick = tick; state.selectedUnitId = selected; state.pinnedUnitId = selected; api.e1(canvas, map, state.placementsByTick, tick, selected, selected, state.filters); },
  };
  return app;
}

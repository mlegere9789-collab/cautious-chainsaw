// Shared pieces of the renderer benchmark: scene (real placements), continuous-time timeline, camera, tile sprite design, atlas.
// The benchmark tile is a representative WORKLOAD (shadow, badge glyph, designation text, strength bar, posture dot, facing chevron,
// engaged glow, selection ring), not a design proposal.
export const q = new URLSearchParams(location.search);
export const cfg = {
  cand: q.get('cand') || 'c2d-atlas1', n: +(q.get('n') || 462), W: +(q.get('w') || 1440), H: +(q.get('h') || 852),
  sec: +(q.get('sec') || 10), warm: +(q.get('warm') || 2), speed: +(q.get('speed') || 8), start: +(q.get('start') || 600),
  zoom: +(q.get('zoom') || 12.4), v: q.get('v') || '',
};
export const dpr = window.devicePixelRatio || 1;

// ---------------------------------------------------------------- scene
const hash = (i) => { let x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
export async function loadScene(N) {
  const j = await (await fetch('/scene.json')).json();
  const base = j.units;
  const units = [];
  for (let i = 0; i < N; i++) {
    const b = base[i % base.length];
    if (i < base.length) { units.push(b); continue; }
    const k = (i / base.length) | 0, dx = (hash(i) - 0.5) * 0.006, dy = (hash(i * 7 + 1) - 0.5) * 0.004;     // synthetic clone, +-300 m
    units.push({ ...b, id: b.id + '~' + k, lng: b.lng.map((v) => v + dx), lat: b.lat.map((v) => v + dy), synthetic: true });
  }
  return { units, disp: j.disp, real: Math.min(N, base.length) };
}

// Continuous-time timeline over each unit's OWN keyframes (the engine design; linear here, motion models are pluggable in the product).
export class Timeline {
  constructor(sc) {
    const U = sc.units, n = U.length;
    this.n = n; this.disp = sc.disp; this.units = U;
    this.off = new Int32Array(n); this.cnt = new Int32Array(n); this.ptr = new Int32Array(n);
    let tot = 0; for (const u of U) tot += u.t.length;
    this.T = new Float32Array(tot); this.LNG = new Float64Array(tot); this.LAT = new Float64Array(tot);
    this.B = new Float32Array(tot); this.S = new Float32Array(tot); this.D = new Uint8Array(tot);
    this.side = new Uint8Array(n); this.type = new Uint8Array(n); this.maxS = new Float32Array(n); this.engaged = new Uint8Array(n);
    let o = 0;
    U.forEach((u, i) => {
      this.off[i] = o; this.cnt[i] = u.t.length; this.side[i] = u.side; this.type[i] = u.type; this.engaged[i] = i % 7 === 0 ? 1 : 0;
      let mx = 1;
      for (let k = 0; k < u.t.length; k++, o++) { this.T[o] = u.t[k]; this.LNG[o] = u.lng[k]; this.LAT[o] = u.lat[k]; this.B[o] = u.b[k]; this.S[o] = u.s[k]; this.D[o] = u.d[k]; mx = Math.max(mx, u.s[k]); }
      this.maxS[i] = mx;
    });
    this.lng = new Float64Array(n); this.lat = new Float64Array(n); this.b = new Float32Array(n); this.s = new Float32Array(n);
    this.d = new Uint8Array(n); this.a = new Float32Array(n); this.alive = new Int32Array(n); this.nAlive = 0;
  }
  stateAt(t) {
    const { off, cnt, ptr, T } = this; let na = 0;
    for (let i = 0; i < this.n; i++) {
      const o = off[i], c = cnt[i]; let p = ptr[i];
      while (p + 1 < c && T[o + p + 1] <= t) p++;
      while (p > 0 && T[o + p] > t) p--;
      ptr[i] = p;
      if (t < T[o]) { this.a[i] = 0; continue; }
      const k = o + p;
      if (p === c - 1) { this.lng[i] = this.LNG[k]; this.lat[i] = this.LAT[k]; this.b[i] = this.B[k]; this.s[i] = this.S[k]; this.d[i] = this.D[k]; }
      else {
        const u = (t - T[k]) / (T[k + 1] - T[k]), e = u * u * (3 - 2 * u);
        this.lng[i] = this.LNG[k] + (this.LNG[k + 1] - this.LNG[k]) * e; this.lat[i] = this.LAT[k] + (this.LAT[k + 1] - this.LAT[k]) * e;
        let db = this.B[k + 1] - this.B[k]; if (db > 180) db -= 360; else if (db < -180) db += 360;
        this.b[i] = (this.B[k] + db * e + 360) % 360; this.s[i] = this.S[k] + (this.S[k + 1] - this.S[k]) * u; this.d[i] = this.D[k];
      }
      this.a[i] = Math.min(1, (t - T[o]) / 1.5);
      this.alive[na++] = i;
    }
    this.nAlive = na;
  }
}

// ---------------------------------------------------------------- camera (Web Mercator, 512 px tiles like Mapbox; pitch 0, bearing 0)
export class Cam {
  constructor(W, H) { this.W = W; this.H = H; this.lng = -77.2373; this.lat = 39.812; this.zoom = cfg.zoom; this.update(); }
  update() { this.ws = 512 * Math.pow(2, this.zoom); this.cx = mx(this.lng); this.cy = my(this.lat); }
  at(sec) { this.lng = -77.2373 + 0.012 * Math.sin(sec * 0.35); this.lat = 39.812 + 0.006 * Math.sin(sec * 0.27); this.zoom = cfg.zoom + 0.2 * Math.sin(sec * 0.5); this.update(); }
  projectAll(tl, X, Y) {
    const { ws, cx, cy, W, H } = this, a = tl.alive, n = tl.nAlive, lng = tl.lng, lat = tl.lat;
    for (let j = 0; j < n; j++) { const i = a[j]; X[i] = (mx(lng[i]) - cx) * ws + W / 2; Y[i] = (my(lat[i]) - cy) * ws + H / 2; }
  }
}
export function mx(lng) { return (lng + 180) / 360; }
export function my(lat) { const s = Math.sin(lat * Math.PI / 180); return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI); }

// ---------------------------------------------------------------- tile design (workload)
export const TIERS = [{ w: 46, h: 20 }, { w: 62, h: 22 }, { w: 78, h: 24 }];
export const tierOf = (s) => (s < 600 ? 0 : s < 1500 ? 1 : 2);
export const PAD = 14;                       // sprite padding around the body (shadow, chevron, glow room)
export const COL = [{ main: '#3a6bc4', dark: '#1a3a7a', light: '#8fb4f0', glow: '#9fd0ff' }, { main: '#c43a3a', dark: '#7a1a1a', light: '#f0a39a', glow: '#ffb27a' }];
export const POSTURE = ['#9aa0aa', '#ff4422', '#66aaff', '#ff8800', '#aaaaaa', '#44aa66', '#777777', '#f5c518', '#c8a84a', '#44aa44', '#88cc88'];
const FONT = 'bold 10px system-ui, "Segoe UI", Arial, sans-serif';

function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
// body + badge + designation + strength bar + posture dot (+ optional baked chevron). g is scaled to CSS px; k = device pixel ratio (for shadow sizes)
export function drawTile(g, k, sp) {
  const { w, h } = TIERS[sp.tier], c = COL[sp.side], x = PAD, y = PAD;
  g.save();
  g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 5 * k; g.shadowOffsetY = 2 * k;
  const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, c.light); gr.addColorStop(0.18, c.main); gr.addColorStop(1, c.dark);
  g.fillStyle = gr; rr(g, x, y, w, h, 4); g.fill();
  g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetY = 0;
  g.lineWidth = 1.25; g.strokeStyle = c.dark; g.stroke();
  g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.roundRect(x, y, 18, h, [4, 0, 0, 4]); g.fill();      // badge block
  g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.beginPath();                                                // type glyph
  if (sp.type === 0) { g.moveTo(x + 4, y + 5); g.lineTo(x + 14, y + h - 5); g.moveTo(x + 14, y + 5); g.lineTo(x + 4, y + h - 5); }
  else if (sp.type === 1) { g.moveTo(x + 4, y + h - 5); g.lineTo(x + 14, y + 5); }
  else { g.arc(x + 9, y + h / 2, 3.2, 0, 6.2832); g.fillStyle = '#fff'; g.fill(); }
  g.stroke();
  if (sp.text) {
    g.font = FONT; g.textBaseline = 'middle'; g.textAlign = 'left';
    g.lineWidth = 2.5; g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineJoin = 'round'; g.strokeText(sp.text, x + 22, y + h / 2 + 0.5); g.fillStyle = '#fff'; g.fillText(sp.text, x + 22, y + h / 2 + 0.5);
  }
  if (sp.bar !== false) { g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(x, y + h + 3, w, 3); g.fillStyle = c.light; g.fillRect(x, y + h + 3, Math.max(1, w * sp.frac), 3); }   // strength bar
  if (sp.dot !== false) { g.fillStyle = POSTURE[sp.posture] || '#9aa0aa'; g.beginPath(); g.arc(x + w - 5, y + 5, 2.6, 0, 6.2832); g.fill(); g.strokeStyle = 'rgba(0,0,0,.8)'; g.lineWidth = 1; g.stroke(); }   // posture dot
  g.restore();
  if (sp.chev != null) drawChevron(g, x + w / 2, y + h / 2, w, h, sp.chev, c.light);
}
// facing chevron on the box edge in direction `bearingDeg` (0 = north), continuous angle
export function chevPos(w, h, bearingDeg) {
  const a = bearingDeg * Math.PI / 180, dx = Math.sin(a), dy = -Math.cos(a);
  const t = Math.min((w / 2 + 4) / Math.max(Math.abs(dx), 1e-6), (h / 2 + 4) / Math.max(Math.abs(dy), 1e-6));
  return { x: dx * t, y: dy * t, rot: a };
}
export function drawChevron(g, cx, cy, w, h, bearingDeg, col) {
  const p = chevPos(w, h, bearingDeg);
  g.save(); g.translate(cx + p.x, cy + p.y); g.rotate(p.rot); g.fillStyle = col; g.strokeStyle = 'rgba(0,0,0,.85)'; g.lineWidth = 1;
  g.beginPath(); g.moveTo(0, -5); g.lineTo(4.5, 3); g.lineTo(0, 1); g.lineTo(-4.5, 3); g.closePath(); g.fill(); g.stroke(); g.restore();
}
export function drawGlow(g, k, side, tier) {
  const { w, h } = TIERS[tier], c = COL[side]; g.save(); g.shadowColor = c.glow; g.shadowBlur = 12 * k; g.fillStyle = c.glow;
  rr(g, PAD, PAD, w, h, 5); g.fill(); g.restore();
}
export function drawRing(g, tier) { const { w, h } = TIERS[tier]; g.save(); g.strokeStyle = '#e8d5a3'; g.lineWidth = 2; rr(g, PAD - 3, PAD - 3, w + 6, h + 6, 6); g.stroke(); g.restore(); }
export const spriteWH = (tier) => ({ w: TIERS[tier].w + 2 * PAD, h: TIERS[tier].h + 2 * PAD + 6 });

// ---------------------------------------------------------------- sprite atlas (shelf packing, device-pixel exact, 2 px gutters)
export class Atlas {
  constructor(k, size = 4096) { this.k = k; this.size = size; this.pages = []; this.map = new Map(); this.x = 0; this.y = 0; this.rowH = 0; this.bytes = 0; this.usedPx = 0; this.version = 0; this._new(); }
  _new() { const c = document.createElement('canvas'); c.width = c.height = this.size; this.pages.push({ c, g: c.getContext('2d', { willReadFrequently: false }), idx: this.pages.length, v: 0 }); this.cur = this.pages.at(-1); this.x = this.y = this.rowH = 0; this.bytes += this.size * this.size * 4; }
  add(key, wCss, hCss, draw) {
    let e = this.map.get(key); if (e) return e;
    const k = this.k, sw = Math.ceil(wCss * k), sh = Math.ceil(hCss * k);
    if (this.x + sw + 2 > this.size) { this.x = 0; this.y += this.rowH + 2; this.rowH = 0; }
    if (this.y + sh + 2 > this.size) this._new();
    const sx = this.x + 1, sy = this.y + 1; this.x += sw + 2; this.rowH = Math.max(this.rowH, sh);
    const g = this.cur.g; g.save(); g.translate(sx, sy); g.beginPath(); g.rect(0, 0, sw, sh); g.clip(); g.scale(k, k); draw(g, k); g.restore();
    this.cur.v++; this.version++; this.usedPx += sw * sh;
    e = { page: this.cur.idx, sx, sy, sw, sh, w: sw / k, h: sh / k, u0: sx / this.size, v0: sy / this.size, u1: (sx + sw) / this.size, v1: (sy + sh) / this.size };
    this.map.set(key, e); return e;
  }
}

// ---------------------------------------------------------------- stats helpers
export const pct = (a, p) => { if (!a.length) return 0; const s = Float64Array.from(a).sort(); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))]; };
export const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

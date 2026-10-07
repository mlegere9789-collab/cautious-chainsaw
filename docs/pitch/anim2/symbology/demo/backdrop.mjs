// demo/backdrop.mjs - a SYNTHETIC aerial-like ground for legibility tests: seeded value noise cut into forest, field, pasture and bare soil with the colour statistics measured from two satellite screenshots
// (results/backdrop-sample.json) and a few pale roads.  It is NOT imagery and NOT the battlefield: it only gives the symbols a busy, realistic-contrast ground to sit on.
function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function noiseField(seed, W, H, cell) {
  const rnd = mulberry(seed); const gw = Math.ceil(W / cell) + 2; const gh = Math.ceil(H / cell) + 2; const g = new Float32Array(gw * gh); for (let i = 0; i < g.length; i++) g[i] = rnd();
  return (x, y) => { const gx = x / cell; const gy = y / cell; const x0 = Math.floor(gx); const y0 = Math.floor(gy); const fx = gx - x0; const fy = gy - y0; const sx = fx * fx * (3 - 2 * fx); const sy = fy * fy * (3 - 2 * fy);
    const a = g[y0 * gw + x0]; const b = g[y0 * gw + x0 + 1]; const c = g[(y0 + 1) * gw + x0]; const d = g[(y0 + 1) * gw + x0 + 1]; return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy; };
}
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const RAMPS = { forest: ['#0c1b0a', '#21321a', '#394d2e'], field: ['#394d2e', '#4e613e', '#65704d'], pasture: ['#65704d', '#777f5b', '#899371'], soil: ['#a69b78', '#c0b48f', '#d6cba8'] };
/** draw into ctx (CSS px; the canvas is already scaled by dpr).  kind: aerial | forest | field | pale | soil | paper | ink */
export function drawGround(ctx, W, H, kind = 'aerial', seed = 7) {
  const flat = { paper: '#ebe6da', ink: '#14181d', forest: null, field: null, pale: null, soil: null }[kind];
  if (flat) { ctx.fillStyle = flat; ctx.fillRect(0, 0, W, H); return; }
  const step = 3; const w = Math.ceil(W / step); const h = Math.ceil(H / step); const img = ctx.createImageData(w, h);
  const big = noiseField(seed, W, H, 220); const mid = noiseField(seed + 1, W, H, 70); const small = noiseField(seed + 2, W, H, 14); const fine = noiseField(seed + 3, W, H, 4); const stripe = noiseField(seed + 4, W, H, 160);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const x = i * step; const y = j * step; const n = big(x, y) * 0.6 + mid(x, y) * 0.3 + small(x, y) * 0.1; let ramp;
    if (kind === 'forest') ramp = RAMPS.forest; else if (kind === 'field') ramp = RAMPS.field; else if (kind === 'pale') ramp = RAMPS.pasture; else if (kind === 'soil') ramp = RAMPS.soil;
    else ramp = n < 0.38 ? RAMPS.forest : n < 0.6 ? RAMPS.field : n < 0.78 ? RAMPS.pasture : RAMPS.soil;
    const t = Math.max(0, Math.min(1, small(x, y) * 0.55 + fine(x, y) * 0.45)); const c = t < 0.5 ? mix(hex(ramp[0]), hex(ramp[1]), t * 2) : mix(hex(ramp[1]), hex(ramp[2]), (t - 0.5) * 2);
    const row = (kind === 'aerial' || kind === 'field') && n >= 0.6 && n < 0.78 ? 1 + 0.05 * Math.sin((x * 0.7 + y * 0.35) * 0.9 + stripe(x, y) * 6) : 1;
    const o = (j * w + i) * 4; img.data[o] = c[0] * row; img.data[o + 1] = c[1] * row; img.data[o + 2] = c[2] * row; img.data[o + 3] = 255;
  }
  const off = new OffscreenCanvas(w, h); off.getContext('2d').putImageData(img, 0, 0); ctx.imageSmoothingEnabled = true; ctx.drawImage(off, 0, 0, w, h, 0, 0, W, H);
  if (kind === 'aerial') { const rnd = mulberry(seed + 9); ctx.lineCap = 'round'; for (let k = 0; k < 3; k++) { ctx.strokeStyle = 'rgba(205,200,185,0.8)'; ctx.lineWidth = 3 + k; ctx.beginPath(); let x = rnd() * W * 0.2; let y = rnd() * H; ctx.moveTo(x, y); for (let s = 0; s < 8; s++) { x += W / 8; y += (rnd() - 0.5) * 120; ctx.lineTo(x, y); } ctx.stroke(); } }
}

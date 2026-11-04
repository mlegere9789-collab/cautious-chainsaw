// tools/accept/lib/imgdiff.mjs - pixelmatch-style image comparison (YIQ colour distance with the same maximum-delta formula and anti-aliasing exemption
// as the pixelmatch library), executed inside a blank Chrome page so no image library is needed.  Reports the differing-pixel ratio, a grid of
// regions (cells with the most differing pixels) and the bounding box of the difference.
const IN_PAGE = `
(async (aB64, bB64, threshold, gridX, gridY, makeDiff) => {
  const load = (b64) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('image decode failed')); i.src = 'data:image/png;base64,' + b64; });
  const [A, B] = await Promise.all([load(aB64), load(bB64)]);
  const w = Math.min(A.width, B.width), h = Math.min(A.height, B.height);
  const data = (img) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0); return x.getImageData(0, 0, w, h).data; };
  const a = data(A), b = data(B);
  const maxDelta = 35215 * threshold * threshold;
  const blend = (c, al) => 255 + (c - 255) * al;
  const rgb2y = (r, g, bb) => r * 0.29889531 + g * 0.58662247 + bb * 0.11448223;
  const rgb2i = (r, g, bb) => r * 0.59597799 - g * 0.2741761 - bb * 0.32180189;
  const rgb2q = (r, g, bb) => r * 0.21147017 - g * 0.52261711 + bb * 0.31114694;
  const delta = (p1, p2, k1, k2, yOnly) => {
    let r1 = p1[k1], g1 = p1[k1 + 1], b1 = p1[k1 + 2], a1 = p1[k1 + 3], r2 = p2[k2], g2 = p2[k2 + 1], b2 = p2[k2 + 2], a2 = p2[k2 + 3];
    if (a1 === a2 && r1 === r2 && g1 === g2 && b1 === b2) return 0;
    if (a1 < 255) { a1 /= 255; r1 = blend(r1, a1); g1 = blend(g1, a1); b1 = blend(b1, a1); }
    if (a2 < 255) { a2 /= 255; r2 = blend(r2, a2); g2 = blend(g2, a2); b2 = blend(b2, a2); }
    const y = rgb2y(r1, g1, b1) - rgb2y(r2, g2, b2);
    if (yOnly) return y;
    const i = rgb2i(r1, g1, b1) - rgb2i(r2, g2, b2), q = rgb2q(r1, g1, b1) - rgb2q(r2, g2, b2);
    const d = 0.5053 * y * y + 0.299 * i * i + 0.1957 * q * q;
    return rgb2y(r1, g1, b1) > rgb2y(r2, g2, b2) ? -d : d;
  };
  const hasMany = (img, x1, y1) => {
    const x0 = Math.max(x1 - 1, 0), yy0 = Math.max(y1 - 1, 0), x2 = Math.min(x1 + 1, w - 1), y2 = Math.min(y1 + 1, h - 1);
    const pos = (y1 * w + x1) * 4; let zeroes = x1 === x0 || x1 === x2 || yy0 === y1 || y1 === y2 ? 1 : 0;
    for (let x = x0; x <= x2; x++) for (let y = yy0; y <= y2; y++) {
      if (x === x1 && y === y1) continue; const p = (y * w + x) * 4;
      if (img[pos] === img[p] && img[pos + 1] === img[p + 1] && img[pos + 2] === img[p + 2] && img[pos + 3] === img[p + 3]) zeroes++;
      if (zeroes > 2) return true;
    }
    return false;
  };
  const antialiased = (img, x1, y1, img2) => {
    const x0 = Math.max(x1 - 1, 0), yy0 = Math.max(y1 - 1, 0), x2 = Math.min(x1 + 1, w - 1), y2 = Math.min(y1 + 1, h - 1);
    const pos = (y1 * w + x1) * 4; let zeroes = x1 === x0 || x1 === x2 || yy0 === y1 || y1 === y2 ? 1 : 0;
    let min = 0, max = 0, minX, minY, maxX, maxY;
    for (let x = x0; x <= x2; x++) for (let y = yy0; y <= y2; y++) {
      if (x === x1 && y === y1) continue;
      const d = delta(img, img, pos, (y * w + x) * 4, true);
      if (d === 0) { zeroes++; if (zeroes > 2) return false; }
      else if (d < min) { min = d; minX = x; minY = y; }
      else if (d > max) { max = d; maxX = x; maxY = y; }
    }
    if (min === 0 || max === 0) return false;
    return (hasMany(img, minX, minY) && hasMany(img, maxX, maxY)) || (hasMany(img2, minX, minY) && hasMany(img2, maxX, maxY));
  };
  const cells = new Array(gridX * gridY).fill(0);
  let diff = 0, aa = 0, minX = w, minY = h, maxX = -1, maxY = -1;
  let out = null, od = null;
  if (makeDiff) { out = document.createElement('canvas'); out.width = w; out.height = h; const ox = out.getContext('2d'); od = ox.createImageData(w, h); }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const k = (y * w + x) * 4; const d = Math.abs(delta(a, b, k, k, false));
    if (d > maxDelta) {
      if (antialiased(a, x, y, b) || antialiased(b, x, y, a)) { aa++; if (od) { od[k] = 255; od[k + 1] = 200; od[k + 2] = 0; od[k + 3] = 255; } continue; }
      diff++; cells[Math.min(gridY - 1, Math.floor(y / h * gridY)) * gridX + Math.min(gridX - 1, Math.floor(x / w * gridX))]++;
      if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (od) { od[k] = 255; od[k + 1] = 0; od[k + 2] = 0; od[k + 3] = 255; }
    } else if (od) { const g = rgb2y(a[k], a[k + 1], a[k + 2]); od[k] = od[k + 1] = od[k + 2] = blend(g, 0.1); od[k + 3] = 255; }
  }
  let diffPng = null;
  if (od) { out.getContext('2d').putImageData(od, 0, 0); diffPng = out.toDataURL('image/png').split(',')[1]; }
  const regions = cells.map((n, i) => ({ col: i % gridX, row: Math.floor(i / gridX), pixels: n })).filter((c) => c.pixels > 0).sort((p, q) => q.pixels - p.pixels).slice(0, 6)
    .map((c) => ({ ...c, box: [Math.round(c.col * w / gridX), Math.round(c.row * h / gridY), Math.round((c.col + 1) * w / gridX), Math.round((c.row + 1) * h / gridY)] }));
  return { widthA: A.width, heightA: A.height, widthB: B.width, heightB: B.height, compared: [w, h], diffPixels: diff, antialiasedPixels: aa, diffRatio: diff / (w * h), bbox: diff ? [minX, minY, maxX, maxY] : null, regions, diffPng };
})`;

/** compare two PNG buffers using `page` (any blank page of a Chrome session) */
export async function diffPngs(page, bufA, bufB, { threshold = 0.1, grid = [8, 6], makeDiff = false } = {}) {
  return page.evaluate(`${IN_PAGE}(${JSON.stringify(bufA.toString('base64'))}, ${JSON.stringify(bufB.toString('base64'))}, ${threshold}, ${grid[0]}, ${grid[1]}, ${makeDiff})`);
}

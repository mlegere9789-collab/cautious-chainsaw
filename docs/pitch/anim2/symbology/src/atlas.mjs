// src/atlas.mjs - pack sprites into one atlas per scale and rasterise them in the real Chrome.  Build-time only: nothing here ships.
// A sprite = { key, svg, w, h, ax, ay, core, strip, slots, ... } (src/svg.mjs Sprite.finish()).  Layout is computed once at 1x on whole units, then every scale multiplies it, so a sprite's rectangle is
// (x*s, y*s, w*s, h*s) at scale s and a drawing routine needs one index for all scales.
import { launch } from '../tools/chrome.mjs';

/** shelf packing: sort by height, fill rows up to maxW (1x units), PAD units of transparent gutter around every sprite (so linear filtering at 2x / 3x never pulls a neighbour in) */
export function pack(sprites, { maxW = 640, pad = 2 } = {}) {
  const order = [...sprites].sort((a, b) => b.h - a.h || b.w - a.w || a.key.localeCompare(b.key));
  let x = pad; let y = pad; let rowH = 0; let W = 0; const rects = new Map();
  for (const s of order) {
    if (x + s.w + pad > maxW) { x = pad; y += rowH + pad; rowH = 0; }
    rects.set(s.key, { x, y, w: s.w, h: s.h }); x += s.w + pad; rowH = Math.max(rowH, s.h); W = Math.max(W, x);
  }
  return { rects, w: Math.ceil(W), h: Math.ceil(y + rowH + pad) };
}

const svgAt = (svg, w, h, s) => svg.replace(/^<svg ([^>]*?)width="[\d.]+" height="[\d.]+"/, `<svg $1width="${w * s}" height="${h * s}"`);

/** rasterise: returns { atlasPng: { [scale]: Buffer }, each: { [scale]: Map(key -> Buffer) } }.  `each` = a separate PNG per sprite (for byte accounting and for tools that want single files). */
export async function rasterise(sprites, layout, { scales = [1, 2, 3], each = true, webp = false } = {}) {
  const { page, close } = await launch({ w: 400, h: 400, dpr: 1 });
  try {
    await page.setContent('<body style="margin:0;background:transparent"></body>');
    const payload = sprites.map((s) => ({ key: s.key, svg: s.svg, w: s.w, h: s.h, r: layout.rects.get(s.key) }));
    const res = await page.evaluate(async ({ payload, scales, W, H, each, webp }) => {
      const toB64 = (blob) => new Promise((ok) => { const fr = new FileReader(); fr.onload = () => ok(String(fr.result).split(',')[1]); fr.readAsDataURL(blob); });
      const load = async (svg) => { const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); await img.decode(); return img; };
      const at = (svg, w, h, s) => svg.replace(/^<svg ([^>]*?)width="[\d.]+" height="[\d.]+"/, (m, a) => `<svg ${a}width="${w * s}" height="${h * s}"`);
      const out = { atlas: {}, each: {}, webp: {} };
      for (const s of scales) {
        const cv = document.createElement('canvas'); cv.width = W * s; cv.height = H * s; const g = cv.getContext('2d'); g.imageSmoothingEnabled = true;
        out.each[s] = {};
        for (const p of payload) {
          const img = await load(at(p.svg, p.w, p.h, s)); g.drawImage(img, p.r.x * s, p.r.y * s, p.w * s, p.h * s);
          if (each) { const c2 = document.createElement('canvas'); c2.width = p.w * s; c2.height = p.h * s; c2.getContext('2d').drawImage(img, 0, 0, p.w * s, p.h * s); out.each[s][p.key] = await toB64(await new Promise((ok) => c2.toBlob(ok, 'image/png'))); }
        }
        out.atlas[s] = await toB64(await new Promise((ok) => cv.toBlob(ok, 'image/png')));
        if (webp) out.webp[s] = await toB64(await new Promise((ok) => cv.toBlob(ok, 'image/webp', 1)));
      }
      return out;
    }, { payload, scales, W: layout.w, H: layout.h, each, webp });
    const atlasPng = {}; const eachPng = {}; const webpOut = {};
    for (const s of scales) { atlasPng[s] = Buffer.from(res.atlas[s], 'base64'); eachPng[s] = new Map(Object.entries(res.each[s]).map(([k, v]) => [k, Buffer.from(v, 'base64')])); if (webp) webpOut[s] = Buffer.from(res.webp[s], 'base64'); }
    return { atlasPng, each: eachPng, webp: webpOut };
  } finally { await close(); }
}

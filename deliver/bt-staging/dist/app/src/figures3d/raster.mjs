// A small deterministic software rasteriser (orthographic z-buffer) used for (1) the baked impostor views (material id + normal + shade, 8 orientations), (2) inspection renders of the meshes
// that can be looked at without a GPU or browser. It is NOT the product renderer; it exists so the figure geometry can be checked by eye in node and so impostor bakes are code-generated.
// View convention: yaw 0 = the viewer is in front of the figure (the figure faces +z, the viewer at +z); +yaw moves the viewer toward the figure's left (+x).
export function viewBasis(yaw) { const s = Math.sin(yaw), c = Math.cos(yaw); return { right: [c, 0, -s], up: [0, 1, 0], dir: [-s, 0, -c] }; }
// meshes: finalized meshes {pos,nrm,mat,idx}; opts: {w,h,yaw,ppm (pixels per metre),cy (world height mapped to the image vertical centre),centreXZ}
export function rasterize(meshes, o) {
  const { w, h, yaw = 0, ppm, cy = 1, bg = 0 } = o, B = viewBasis(yaw), W = w, H = h, depth = new Float32Array(W * H).fill(1e9), mat = new Uint8Array(W * H).fill(bg), nx = new Int8Array(W * H), ny = new Int8Array(W * H), nz = new Int8Array(W * H);
  const cpos = o.centreXZ ?? [0, 0];
  for (const m of meshes) {
    const n = m.nv, sx = new Float32Array(n), sy = new Float32Array(n), sd = new Float32Array(n), vn = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const x = m.pos[i * 3] - cpos[0], y = m.pos[i * 3 + 1], z = m.pos[i * 3 + 2] - cpos[1];
      sx[i] = W / 2 + (x * B.right[0] + z * B.right[2]) * ppm; sy[i] = H / 2 - (y - cy) * ppm; sd[i] = x * B.dir[0] + z * B.dir[2];
      const a = m.nrm[i * 3], b = m.nrm[i * 3 + 1], c = m.nrm[i * 3 + 2]; vn[i * 3] = a * B.right[0] + c * B.right[2]; vn[i * 3 + 1] = b; vn[i * 3 + 2] = -(a * B.dir[0] + c * B.dir[2]);    // view-space normal: +z toward the viewer
    }
    for (let t = 0; t < m.idx.length; t += 3) {
      const a = m.idx[t], b = m.idx[t + 1], c = m.idx[t + 2];
      const x0 = sx[a], y0 = sy[a], x1 = sx[b], y1 = sy[b], x2 = sx[c], y2 = sy[c], area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
      if (Math.abs(area) < 1e-9) continue;
      const minx = Math.max(0, Math.floor(Math.min(x0, x1, x2))), maxx = Math.min(W - 1, Math.ceil(Math.max(x0, x1, x2))), miny = Math.max(0, Math.floor(Math.min(y0, y1, y2))), maxy = Math.min(H - 1, Math.ceil(Math.max(y0, y1, y2)));
      for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++) {
        const px = x + 0.5, py = y + 0.5, w0 = ((x1 - px) * (y2 - py) - (x2 - px) * (y1 - py)) / area, w1 = ((x2 - px) * (y0 - py) - (x0 - px) * (y2 - py)) / area, w2 = 1 - w0 - w1;
        if (w0 < -1e-6 || w1 < -1e-6 || w2 < -1e-6) continue;
        const d = w0 * sd[a] + w1 * sd[b] + w2 * sd[c], k = y * W + x; if (d >= depth[k]) continue;
        let ax = w0 * vn[a * 3] + w1 * vn[b * 3] + w2 * vn[c * 3], ay = w0 * vn[a * 3 + 1] + w1 * vn[b * 3 + 1] + w2 * vn[c * 3 + 1], az = w0 * vn[a * 3 + 2] + w1 * vn[b * 3 + 2] + w2 * vn[c * 3 + 2];
        const l = Math.hypot(ax, ay, az) || 1; ax /= l; ay /= l; az /= l; if (az < 0) { ax = -ax; ay = -ay; az = -az; }                  // two-sided: show the face toward the viewer
        depth[k] = d; const vi = w0 >= w1 && w0 >= w2 ? a : w1 >= w2 ? b : c; mat[k] = m.mat[vi]; nx[k] = Math.round(ax * 127); ny[k] = Math.round(ay * 127); nz[k] = Math.round(az * 127);
      }
    }
  }
  return { w: W, h: H, depth, mat, nx, ny, nz };
}
// the shade scalar baked into the impostor alpha (key light from upper-front-left, plus a sky term)
export function shadeOf(nx, ny, nz) { const L = [-0.45, 0.65, 0.62], l = Math.hypot(...L), d = Math.max(0, (nx * L[0] + ny * L[1] + nz * L[2]) / (l * 127)); return Math.min(1, 0.32 + 0.68 * d + 0.12 * Math.max(0, ny / 127)); }
// colour an image with a 64-entry palette [[r,g,b], ...]
export function colourise(img, palette, bgc = [58, 62, 70]) {
  const out = new Uint8Array(img.w * img.h * 4);
  for (let k = 0; k < img.w * img.h; k++) {
    if (img.mat[k] === 0) { out.set([bgc[0], bgc[1], bgc[2], 255], k * 4); continue; }
    const s = shadeOf(img.nx[k], img.ny[k], img.nz[k]), p = palette[img.mat[k]] || [128, 128, 128];
    out[k * 4] = Math.min(255, p[0] * s * 1.15); out[k * 4 + 1] = Math.min(255, p[1] * s * 1.15); out[k * 4 + 2] = Math.min(255, p[2] * s * 1.15); out[k * 4 + 3] = 255;
  }
  return out;
}
// impostor atlas: nViews views of one mesh set across a row; RGBA8 = material id | view normal x,y (0..255 mapped from -1..1) | shade (0..255); material 0 = empty
export function bakeImpostor(meshes, { nViews = 8, w = 48, h = 64, heightM = 1.95, centreXZ = [0, 0] } = {}) {
  const ppm = (h - 2) / heightM, atlas = new Uint8Array(nViews * w * h * 4);
  for (let v = 0; v < nViews; v++) {
    const img = rasterize(meshes, { w, h, yaw: v / nViews * Math.PI * 2, ppm, cy: heightM / 2, centreXZ });
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const k = y * w + x, o = (y * nViews * w + v * w + x) * 4; atlas[o] = img.mat[k]; if (!img.mat[k]) continue;
      atlas[o + 1] = Math.round((img.nx[k] / 127 * 0.5 + 0.5) * 255); atlas[o + 2] = Math.round((img.ny[k] / 127 * 0.5 + 0.5) * 255); atlas[o + 3] = Math.round(shadeOf(img.nx[k], img.ny[k], img.nz[k]) * 255);
    }
  }
  return { width: nViews * w, height: h, view_w: w, view_h: h, views: nViews, ppm, height_m: heightM, rgba: atlas };
}

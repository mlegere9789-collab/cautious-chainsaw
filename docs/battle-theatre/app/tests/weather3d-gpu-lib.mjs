// Shared by tests/weather3d-gpu.mjs and tests/weather3d-gpu-compare.mjs: a PNG writer (RGBA 8-bit, no interlace) and the numbers of a picture.
import zlib from 'node:zlib';
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc = b => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]), c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
export function encodePng(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h); for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; for (let x = 0; x < w; x++) { const s = (y * w + x) * 4, d = y * (w * 4 + 1) + 1 + x * 4; raw[d] = rgba[s]; raw[d + 1] = rgba[s + 1]; raw[d + 2] = rgba[s + 2]; raw[d + 3] = 255; } }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 6 })), chunk('IEND', Buffer.alloc(0))]);
}
// luminance (Rec. 709 on the 8-bit display values) of the whole frame, the top and the bottom 35 percent
export function stats(w, h, rgba) {
  const reg = (y0, y1) => { const ys = []; let sum = 0, dark = 0; for (let y = y0; y < y1; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4, v = 0.2126 * rgba[i] + 0.7152 * rgba[i + 1] + 0.0722 * rgba[i + 2]; ys.push(v); sum += v; if (v < 2) dark++; }
    ys.sort((a, b) => a - b); const q = p => ys[Math.min(ys.length - 1, Math.floor(p * ys.length))]; return { mean: +(sum / ys.length).toFixed(3), min: +ys[0].toFixed(2), p1: +q(0.01).toFixed(2), p50: +q(0.5).toFixed(2), p99: +q(0.99).toFixed(2), max: +ys[ys.length - 1].toFixed(2), blackShare: +(dark / ys.length).toFixed(5) }; };
  const a = Math.floor(h * 0.35), b = Math.ceil(h * 0.65); return { all: reg(0, h), top: reg(0, a), bottom: reg(b, h) };
}

// Chrome flags of the harnesses: WebGPU on its software adapter (SwiftShader through Vulkan) and WebGL2 on SwiftShader through ANGLE. This machine has no GPU; nothing run with these flags is a real-GPU result.
export const CHROME_ARGS = ['--enable-unsafe-webgpu', '--enable-features=Vulkan,WebGPUService', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
// Installed before any page script (context.addInitScript(HOOKS, { realCanvas })): uncaptured WebGPU errors and device loss go to window.__gpuErrors; the compiler messages of every shader module to window.__wgslMessages.
// The canvas texture is replaced by an ordinary texture of the same size and format (configure() is not passed on, getCurrentTexture() returns the stand-in): the software adapter of a machine without a GPU
// loses its device as soon as the real swapchain is read, drawn into for a while or captured (see the swapchain probe of tests/weather3d-gpu.mjs), and a texture of our own is the one thing that can be read back.
// The commands the renderer records are the same; only the target of its last pass is not the canvas. { realCanvas: true } leaves the canvas alone. Self-contained: it is sent to the page as source text.
export function HOOKS(opts) {
  window.__gpuErrors = []; window.__wgslMessages = []; window.__gpuLabels = []; window.__swap = { standIn: !(opts && opts.realCanvas), configured: 0, calls: 0 };
  if (typeof GPUAdapter !== 'undefined') {
    const rd = GPUAdapter.prototype.requestDevice;
    GPUAdapter.prototype.requestDevice = async function (...a) {
      const d = await rd.apply(this, a);
      d.addEventListener('uncapturederror', e => window.__gpuErrors.push(String((e.error && e.error.message) || e).slice(0, 900)));
      d.lost.then(i => window.__gpuErrors.push('DEVICE LOST ' + i.reason + ': ' + i.message));
      const csm = d.createShaderModule.bind(d);
      d.createShaderModule = desc => { const m = csm(desc), label = (desc && desc.label) || '(no label)'; m.getCompilationInfo().then(info => { window.__gpuLabels.push(label + ' messages=' + info.messages.length); for (const x of info.messages) window.__wgslMessages.push({ label, type: x.type, line: x.lineNum, col: x.linePos, msg: String(x.message).slice(0, 400) }); }, e => window.__gpuErrors.push('getCompilationInfo ' + label + ': ' + e)); return m; };
      return d;
    };
  }
  if (typeof GPUCanvasContext !== 'undefined' && !(opts && opts.realCanvas)) {
    const P = GPUCanvasContext.prototype, st = new WeakMap();
    P.configure = function (cfg) { st.set(this, { cfg: { ...cfg }, tex: null, w: 0, h: 0 }); window.__swap.configured++; };
    P.unconfigure = function () { const s = st.get(this); if (s && s.tex) { try { s.tex.destroy(); } catch { /* gone */ } } st.delete(this); };
    P.getCurrentTexture = function () {
      const s = st.get(this); if (!s) throw new DOMException('the canvas context is not configured', 'InvalidStateError'); const w = this.canvas.width, h = this.canvas.height;
      if (!s.tex || s.w !== w || s.h !== h) { if (s.tex) s.tex.destroy(); s.tex = s.cfg.device.createTexture({ label: 'harness stand-in for the canvas texture', size: [w, h], format: s.cfg.format, usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC | GPUTextureUsage.TEXTURE_BINDING }); s.w = w; s.h = h; }
      window.__swap.calls++; return s.tex;
    };
  }
}

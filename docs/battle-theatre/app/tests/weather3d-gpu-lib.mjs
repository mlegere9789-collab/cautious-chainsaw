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

// A PNG reader for what a browser writes for page.screenshot: 8-bit, not interlaced, RGB (colour type 2) or RGBA (6). Returns { w, h, data } with data as RGBA bytes (alpha 255 for RGB). Throws on anything else.
export function decodePng(buf) {
  const sig = [137, 80, 78, 71, 13, 10, 26, 10]; if (!buf || buf.length < 33 || sig.some((v, i) => buf[i] !== v)) throw new Error('not a PNG');
  let pos = 8, w = 0, h = 0, bd = 0, ct = 0, il = 0; const idat = [];
  while (pos + 8 <= buf.length) {
    const len = buf.readUInt32BE(pos), type = buf.toString('latin1', pos + 4, pos + 8), d = buf.subarray(pos + 8, pos + 8 + len); pos += 12 + len;
    if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); bd = d[8]; ct = d[9]; il = d[12]; } else if (type === 'IDAT') idat.push(d); else if (type === 'IEND') break;
  }
  if (bd !== 8 || il !== 0 || (ct !== 2 && ct !== 6)) throw new Error(`unsupported PNG (bit depth ${bd}, colour type ${ct}, interlace ${il})`);
  const bpp = ct === 6 ? 4 : 3, stride = w * bpp, raw = zlib.inflateSync(Buffer.concat(idat)); if (raw.length < (stride + 1) * h) throw new Error('truncated PNG data');
  const out = new Uint8Array(w * h * 4); let prev = new Uint8Array(stride);
  for (let y = 0; y < h; y++) {
    const o = y * (stride + 1), ft = raw[o], cur = new Uint8Array(stride);
    for (let i = 0; i < stride; i++) {
      const x = raw[o + 1 + i], a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0; let v;
      if (ft === 0) v = x; else if (ft === 1) v = x + a; else if (ft === 2) v = x + b; else if (ft === 3) v = x + ((a + b) >> 1);
      else if (ft === 4) { const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c); v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); } else throw new Error('bad PNG filter ' + ft);
      cur[i] = v & 255;
    }
    for (let xq = 0; xq < w; xq++) { const sp = xq * bpp, dp = (y * w + xq) * 4; out[dp] = cur[sp]; out[dp + 1] = cur[sp + 1]; out[dp + 2] = cur[sp + 2]; out[dp + 3] = bpp === 4 ? cur[sp + 3] : 255; }
    prev = cur;
  }
  return { w, h, data: out };
}
// How far two RGBA pictures of the same size are apart (alpha ignored): the mean absolute difference per colour channel (8-bit levels), the rmse, the 99th percentile and the maximum of the largest channel difference of a pixel,
// and the shares of pixels whose largest channel difference is over 8 and over 24 levels (the same measures as weather3d-gpu-compare.mjs).
export function diffStats(a, b, w, h) {
  const n = w * h; if (a.length !== n * 4 || b.length !== n * 4) throw new Error('the two pictures are not both ' + w + ' x ' + h + ' RGBA');
  let sum = 0, sq = 0, n8 = 0, n24 = 0, max = 0; const hist = new Uint32Array(256);
  for (let i = 0; i < n; i++) { let m = 0; for (let c = 0; c < 3; c++) { const d = Math.abs(a[i * 4 + c] - b[i * 4 + c]); sum += d; sq += d * d; if (d > m) m = d; } hist[m]++; if (m > 8) n8++; if (m > 24) n24++; if (m > max) max = m; }
  let acc = 0, p99 = 0; const target = Math.floor(0.99 * n); for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc > target) { p99 = v; break; } }
  return { meanAbs: +(sum / (n * 3)).toFixed(3), rmse: +Math.sqrt(sq / (n * 3)).toFixed(3), p99, max, over8: +(n8 / n).toFixed(4), over24: +(n24 / n).toFixed(4) };
}
// The mean absolute difference (8-bit levels per channel) that the compositor's picture of the real canvas may have from the read-back of the same frame before it is a problem. A harness value, not a project gate: rounding of the compositor
// is a level or two; a blank, black, stale, flipped or red-blue swapped canvas is tens of levels.
export const CANVAS_SHOT_LIMIT = 4;

// Chrome flags of the harnesses: WebGPU on its software adapter (SwiftShader through Vulkan) and WebGL2 on SwiftShader through ANGLE. This machine has no GPU; nothing run with these flags is a real-GPU result.
export const CHROME_ARGS = ['--enable-unsafe-webgpu', '--enable-features=Vulkan,WebGPUService', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
// Chrome flags of a run on a machine WITH a GPU (--real-gpu of the harnesses): no software rasteriser is asked for, so WebGPU and WebGL2 both use the GPU that Chrome picks (on Linux WebGPU needs the Vulkan feature).
// The summary records the adapter (WebGPU: vendor and architecture; WebGL2: the renderer string) and checkRun (weather3d-gpu-check.mjs) refuses to call a run "real GPU" when that adapter is a software one, so a
// check on the wrong machine, or with the software flags above, can never pass as a real-GPU result.
export const REAL_GPU_ARGS = ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist', ...(process.platform === 'linux' ? ['--enable-features=Vulkan'] : [])];
export const chromeArgs = realGpu => (realGpu ? REAL_GPU_ARGS : CHROME_ARGS);
// The REAL canvas of a WebGPU page on a machine without a GPU (found 2026-11-16, results/weather3d-webgpu/xvfb-probe, set H5): headed Chrome under a virtual X server (xvfb-run -a -s "-screen 0 1280x720x24" node ...) with
// SwiftShader as the Vulkan driver and no Vulkan surface. The device stays alive, drawImage of the canvas, page.screenshot and an X screen capture all show what the page drew. Four other headed flag sets and all the headless ones
// lose the device and show black. Software only: it is not a real-GPU result. --xvfb-canvas of the drivers means: these flags, headed, the real canvas, and the compositor-picture check (--canvas-shot).
export const XVFB_CANVAS_ARGS = ['--use-vulkan=swiftshader', '--disable-vulkan-surface'];
export function expandXvfbCanvas(a) {
  if (!a.includes('--xvfb-canvas')) return a; const have = f => a.includes(f);
  return [...a, ...['--headed', '--real-canvas', '--canvas-shot'].filter(f => !have(f)), ...XVFB_CANVAS_ARGS.filter(f => !have('--chrome-arg=' + f)).map(f => '--chrome-arg=' + f)];
}
export const SOFTWARE_ADAPTER_RE = /swiftshader|llvmpipe|lavapipe|softpipe|software|basic render|microsoft basic/i;
// What a recorded adapter says about the machine, for the run checker and the one-command real-GPU run. The records are the prototype's `adapterInfo`: WebGPU { vendor, arch, device, desc } (an empty {} when the browser
// gives no adapter.info), WebGL2 { vendor: 'webgl2', arch: <renderer>, renderer } with the renderer 'unknown' when the browser hides it (no WEBGL_debug_renderer_info). A record NAMES hardware only when at least one
// identifying field carries a real value: an empty record, empty strings, 'unknown', 'n/a' and the harness's own labels ('webgl2') name nothing, and a run with such a record cannot be told from a software run, so it is never a
// real-GPU result. `software`: the WHOLE record (never a shortened copy of it) matches SOFTWARE_ADAPTER_RE, or says it is a fallback adapter. Several records (the run records one at the start and one at the end) are read
// together: one software record among them makes the answer software; one record that names hardware is enough to have a name. Pure. Returns { named, software, text (the record shown, at most 200 characters, or null), names }.
export const ADAPTER_ID_KEYS = ['vendor', 'arch', 'architecture', 'device', 'desc', 'description', 'renderer'];
const NO_NAME_RE = /^(?:|unknown|n\/a|na|none|null|undefined|nil|-+|\?+|webgl2?|webgpu|generic|default|unmasked|not available|unavailable)(?:\s+(?:gpu|adapter|renderer|vendor|device))?$/i;
export function adapterVerdict(...records) {
  const recs = records.filter(r => r !== null && r !== undefined && r !== false && r !== ''), shown = [];
  const nameOf = v => (typeof v === 'string' && !NO_NAME_RE.test(v.trim()) ? v.trim() : null);
  for (const r of recs) {
    let recNamed = false, recSoft = false;
    if (typeof r === 'string') { recNamed = nameOf(r) !== null; recSoft = SOFTWARE_ADAPTER_RE.test(r); }
    else if (typeof r === 'object') {
      for (const k of ADAPTER_ID_KEYS) if (nameOf(r[k]) !== null) recNamed = true;
      let whole = ''; try { whole = JSON.stringify(r) || ''; } catch { whole = ''; }
      recSoft = SOFTWARE_ADAPTER_RE.test(whole) || r.isFallbackAdapter === true || r.fallback === true;
    }
    shown.push({ r, recNamed, recSoft });
  }
  const named = shown.some(x => x.recNamed), software = shown.some(x => x.recSoft), pick = shown.find(x => x.recSoft) || shown.find(x => x.recNamed) || shown[0] || null;
  const text = pick ? (typeof pick.r === 'string' ? pick.r : JSON.stringify(pick.r)).slice(0, 200) : null;
  return { named, software, text, names: shown.filter(x => x.recNamed).length };
}
// Installed before any page script (context.addInitScript(HOOKS, { realCanvas })): uncaptured WebGPU errors and device loss go to window.__gpuErrors; the compiler messages of every shader module to window.__wgslMessages.
// The canvas texture is replaced by an ordinary texture of the same size and format (configure() is not passed on, getCurrentTexture() returns the stand-in): the software adapter of a machine without a GPU
// loses its device as soon as the real swapchain is read, drawn into for a while or captured (see the swapchain probe of tests/weather3d-gpu.mjs), and a texture of our own is the one thing that can be read back.
// The commands the renderer records are the same; only the target of its last pass is not the canvas. { realCanvas: true } uses the real canvas and only adds COPY_SRC to its configuration (untested here). Self-contained: it is sent to the page as source text.
export function HOOKS(opts) {
  window.__gpuErrors = []; window.__wgslMessages = []; window.__gpuLabels = []; window.__swap = { standIn: !(opts && opts.realCanvas), configured: 0, calls: 0 };
  window.__pending = new Map(); let pid = 0;
  const track = (name, pr) => { if (!opts || !opts.trace) return pr; const id = ++pid; window.__pending.set(id, { name, t: performance.now() }); const done = () => window.__pending.delete(id); pr.then(done, done); return pr; };
  if (typeof GPUAdapter !== 'undefined') {
    const rd = GPUAdapter.prototype.requestDevice;
    GPUAdapter.prototype.requestDevice = async function (...a) {
      const d = await rd.apply(this, a);
      d.addEventListener('uncapturederror', e => window.__gpuErrors.push(String((e.error && e.error.message) || e).slice(0, 900)));
      d.lost.then(i => window.__gpuErrors.push('DEVICE LOST ' + i.reason + ': ' + i.message));
      if (opts && opts.trace) {            // which promise of the device never settles: the page's heartbeat reads window.__pending
        for (const k of ['createRenderPipelineAsync', 'createComputePipelineAsync', 'popErrorScope']) { const f = d[k].bind(d); d[k] = (...x) => track(k + (x[0] && x[0].label ? ' ' + x[0].label : ''), f(...x)); }
        const osw = d.queue.onSubmittedWorkDone.bind(d.queue); d.queue.onSubmittedWorkDone = () => track('queue.onSubmittedWorkDone', osw());
      }
      return d;
    };
  }
  if (typeof GPUShaderModule !== 'undefined') {          // the compiler messages of every module, recorded when its creator asks for them: this hook never asks a second time (two overlapping requests for one module's messages can leave one of them unanswered)
    const gci = GPUShaderModule.prototype.getCompilationInfo, seen = new WeakSet();
    GPUShaderModule.prototype.getCompilationInfo = function () {
      const m = this, label = m.label || '(no label)';
      return track('getCompilationInfo ' + label, gci.call(m)).then(info => { if (!seen.has(m)) { seen.add(m); window.__gpuLabels.push(label + ' messages=' + info.messages.length); for (const x of info.messages) window.__wgslMessages.push({ label, type: x.type, line: x.lineNum, col: x.linePos, msg: String(x.message).slice(0, 400) }); } return info; });
    };
  }
  if (typeof GPUCanvasContext !== 'undefined' && opts && opts.realCanvas) {          // the real canvas, made readable: the same configure() with COPY_SRC added (not run on this machine: its software adapter cannot use the canvas)
    const cf = GPUCanvasContext.prototype.configure; GPUCanvasContext.prototype.configure = function (c) { return cf.call(this, { ...c, usage: (c.usage ?? GPUTextureUsage.RENDER_ATTACHMENT) | GPUTextureUsage.COPY_SRC }); };
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

// What the browser of this container renders with, read from the browser (never assumed). It launches Chrome exactly as the specs do (app/tests/lib.mjs launch(): the hardware
// flags first, SwiftShader when they give no WebGL2 context) and prints the renderer, the WebGL2 limits, the WebGPU adapter and the audio contexts. Opens no page of the theatre.
//   tools/horde/bench.sh node docs/battle-theatre/GOVERNANCE/gate_results/spec-b-evidence/browser_caps.mjs
import { launch, RENDER, startServer } from '../../../app/tests/lib.mjs';
const S = await startServer(10795), b = await launch();
try {
  const page = await (await b.newContext()).newPage(); await page.goto(`http://127.0.0.1:${S.port}/app/styles.css`);
  const r = await page.evaluate(async () => {
    const o = { secureContext: isSecureContext, hardwareConcurrency: navigator.hardwareConcurrency, deviceMemoryGB: navigator.deviceMemory ?? null, userAgent: navigator.userAgent };
    const gl = document.createElement('canvas').getContext('webgl2');
    if (gl) { const e = gl.getExtension('WEBGL_debug_renderer_info'); o.webgl2 = { renderer: e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), vendor: e ? gl.getParameter(e.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR), maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE), maxRenderbufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE), extColorBufferFloat: !!gl.getExtension('EXT_color_buffer_float'), extDisjointTimerQuery2: !!gl.getExtension('EXT_disjoint_timer_query_webgl2') }; }
    else o.webgl2 = null;
    o.gpuApi = 'gpu' in navigator;
    if (o.gpuApi) { try { const a = await navigator.gpu.requestAdapter(); o.webgpuAdapter = a ? { vendor: a.info?.vendor, architecture: a.info?.architecture, description: a.info?.description, isFallbackAdapter: a.isFallbackAdapter ?? a.info?.isFallbackAdapter, timestampQuery: a.features.has('timestamp-query'), maxTextureDimension2D: a.limits.maxTextureDimension2D, maxBufferSize: a.limits.maxBufferSize } : null; } catch (e) { o.webgpuError = String(e); } }
    o.AudioContext = typeof AudioContext; o.OfflineAudioContext = typeof OfflineAudioContext;
    return o;
  });
  console.log(JSON.stringify({ chrome: b.version(), harness_RENDER: { renderer: RENDER.renderer, software: RENDER.software, webgpu: RENDER.webgpu, args: RENDER.args }, page: r }, null, 1));
} finally { await b.close(); await S.close(); }
process.exit(0);

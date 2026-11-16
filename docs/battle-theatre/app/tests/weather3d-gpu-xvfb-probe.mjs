// Probe (harness, not a gate): is the REAL canvas of a WebGPU page capturable when Chrome runs HEADED under a virtual X server (Xvfb) on a machine without a GPU (the software adapter)?
// The earlier flag-set probe (results/weather3d-webgpu/canvas-probe-flags.json) was headless only. One flag set per process:
//   xvfb-run -a -s "-screen 0 1280x720x24" node docs/battle-theatre/app/tests/weather3d-gpu-xvfb-probe.mjs <set H1..H5> <outDir>      (driver for all sets: weather3d-gpu-xvfb-probe.sh; build machine: through tools/horde/bench.sh)
// A 128 x 128 canvas is cleared orange (255,128,0) through the real swapchain texture for 30 frames; then: page.screenshot (25 s limit), an X screen capture (ImageMagick import -window root), the page's own
// readback of the canvas into a 2D canvas (drawImage). Everything is written to <outDir>/<set>.json with the PNGs next to it. Software adapters only.
import { chromium } from '../../../../node_modules/playwright-core/index.mjs';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
const [, , setName, outDir] = process.argv; fs.mkdirSync(outDir, { recursive: true });
const BASE = ['--enable-unsafe-webgpu', '--enable-features=Vulkan,WebGPUService', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const SETS = {
  H1: BASE,
  H2: [...BASE, '--disable-gpu-compositing'],
  H3: ['--enable-unsafe-webgpu', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader'],
  H4: [...BASE, '--ozone-platform=x11', '--disable-gpu-sandbox'],
  H5: ['--enable-unsafe-webgpu', '--enable-features=Vulkan,WebGPUService', '--ignore-gpu-blocklist', '--use-vulkan=swiftshader', '--disable-vulkan-surface', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
};
if (!SETS[setName]) { console.error('unknown set ' + setName); process.exit(2); }
const PAGE = `<!doctype html><meta charset=utf-8><body style="margin:0;background:#000"><canvas id=c width=128 height=128 style="display:block;width:128px;height:128px"></canvas><script type=module>
const o = window.PROBE = { done: false, lost: null, errors: [], steps: [] };
try {
  const a = await navigator.gpu.requestAdapter(); o.adapter = a && { vendor: a.info && a.info.vendor, architecture: a.info && a.info.architecture, description: a.info && a.info.description };
  const d = await a.requestDevice(); d.lost.then(i => { o.lost = i.reason + ': ' + i.message; }); d.addEventListener('uncapturederror', e => o.errors.push(String(e.error.message).slice(0, 200)));
  const fmt = navigator.gpu.getPreferredCanvasFormat(); o.fmt = fmt; const cv = document.getElementById('c'), ctx = cv.getContext('webgpu'); ctx.configure({ device: d, format: fmt, alphaMode: 'opaque' });
  const clear = view => { const e = d.createCommandEncoder(), p = e.beginRenderPass({ colorAttachments: [{ view, clearValue: { r: 1, g: 0.5, b: 0, a: 1 }, loadOp: 'clear', storeOp: 'store' }] }); p.end(); d.queue.submit([e.finish()]); };
  await new Promise(res => { let n = 0; const loop = () => { clear(ctx.getCurrentTexture().createView()); if (++n < 30) requestAnimationFrame(loop); else res(); }; loop(); });
  o.steps.push('presented 30 frames');
  try { const x = document.createElement('canvas'); x.width = x.height = 128; const g = x.getContext('2d', { willReadFrequently: true }); g.drawImage(cv, 0, 0); o.drawImagePixel = [...g.getImageData(64, 64, 1, 1).data]; } catch (e) { o.drawImageError = String(e.message).slice(0, 160); }
} catch (e) { o.error = String(e && e.message || e).slice(0, 300); }
o.done = true;
</script>`;
const srv = http.createServer((q, r) => { r.setHeader('content-type', 'text/html'); r.end(PAGE); }).listen(0, '127.0.0.1'); await new Promise(r => srv.once('listening', r));
const port = srv.address().port, res = { set: setName, args: SETS[setName], display: process.env.DISPLAY, started: new Date().toISOString() }, t0 = Date.now();
const save = () => fs.writeFileSync(path.join(outDir, setName + '.json'), JSON.stringify(res, null, 1));
const analyze = f => { try { return JSON.parse(execFileSync('python3', ['-I', '-c', `
import sys, json
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGB'); w, h = im.size; px = im.load(); orange = 0; tot = w * h; mn = [255, 255, 255]; mx = [0, 0, 0]; sx = [0, 0, 0]
step = max(1, (w * h) // 400000 or 1)
cnt = 0
for y in range(0, h):
    for x in range(0, w, step):
        r, g, b = px[x, y]; cnt += 1
        if abs(r - 255) < 24 and abs(g - 128) < 24 and b < 40: orange += 1
        for i, v in enumerate((r, g, b)):
            mn[i] = min(mn[i], v); mx[i] = max(mx[i], v); sx[i] += v
print(json.dumps({ 'w': w, 'h': h, 'sampled': cnt, 'orangeSamples': orange, 'min': mn, 'max': mx, 'mean': [round(s / cnt, 2) for s in sx] }))
`, f], { timeout: 60000 }).toString()); } catch (e) { return { error: String(e.message).slice(0, 160) }; } };
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: false, args: SETS[setName] }); res.launched = true; save();
  const ctx = await browser.newContext({ viewport: { width: 640, height: 360 }, deviceScaleFactor: 1 }), page = await ctx.newPage(); const logs = []; page.on('console', m => logs.push(m.type() + ': ' + m.text().slice(0, 160))); page.on('pageerror', e => logs.push('pageerror ' + e.message.slice(0, 160)));
  await page.goto(`http://127.0.0.1:${port}/`);
  try { await page.waitForFunction(() => window.PROBE && window.PROBE.done, null, { timeout: 60000 }); res.probe = await page.evaluate(() => ({ ...window.PROBE })); } catch (e) { res.probe = 'timeout waiting for the page: ' + String(e.message).split('\n')[0]; }
  res.afterPresentS = +((Date.now() - t0) / 1000).toFixed(1); save();
  // X screen capture first (it does not depend on the browser's screenshot path)
  try { const f = path.join(outDir, setName + '-xscreen.png'); execFileSync('import', ['-window', 'root', f], { timeout: 30000, env: process.env }); res.xscreen = analyze(f); } catch (e) { res.xscreen = { error: String(e.message).split('\n')[0].slice(0, 200) }; }
  save();
  try { const b = await page.screenshot({ timeout: 25000 }); const f = path.join(outDir, setName + '-page.png'); fs.writeFileSync(f, b); res.pageShot = { bytes: b.length, ...analyze(f) }; } catch (e) { res.pageShot = { error: String(e.message).split('\n')[0].slice(0, 200) }; }
  try { res.afterShot = await page.evaluate(() => ({ lost: window.PROBE.lost, errors: window.PROBE.errors })); } catch (e) { res.afterShot = { error: String(e.message).split('\n')[0].slice(0, 160) }; }
  res.console = logs.slice(0, 6);
} catch (e) { res.error = String(e.message).split('\n')[0].slice(0, 300); }
finally { res.wallS = +((Date.now() - t0) / 1000).toFixed(1); save(); try { await Promise.race([browser && browser.close(), new Promise(r => setTimeout(r, 15000))]); } catch { /* gone */ } srv.close(); }
console.log(JSON.stringify(res)); process.exit(0);

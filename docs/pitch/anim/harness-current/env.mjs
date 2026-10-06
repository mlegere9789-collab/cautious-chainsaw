import { open, WORK, wj } from './common.mjs';
import os from 'node:os';
const S = await open({ vp: 'desktop', tiles: 'block', port: 9504, profile: 'env' });
try {
  await S.page.goto('about:blank');
  const gl = await S.page.evaluate(() => { const c = document.createElement('canvas'); const g = c.getContext('webgl'); const e = g.getExtension('WEBGL_debug_renderer_info'); return { renderer: g.getParameter(e.UNMASKED_RENDERER_WEBGL), vendor: g.getParameter(e.UNMASKED_VENDOR_WEBGL) }; });
  const env = { chrome: S.chrome.version, gl, os: `${os.type()} ${os.release()} ${os.arch()}`, cpus: os.cpus().length, cpuModel: os.cpus()[0].model, node: process.version, date: new Date().toISOString() };
  wj(`${WORK}/env.json`, env); console.log(JSON.stringify(env));
} finally { await S.close(); }

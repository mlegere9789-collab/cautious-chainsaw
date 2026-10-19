// Shared Playwright helper: Chrome (system install) at below-normal priority, GPU on, uncapped frame rate, console capture.
import os from 'node:os';
import { chromium } from '../../../../../node_modules/playwright-core/index.mjs';
try { os.setPriority(process.pid, os.constants.priority.PRIORITY_BELOW_NORMAL); } catch (e) { /* ignore */ }
export const BASE = 'http://127.0.0.1:10740/prototype/index.html';
export async function launch({ headless = true, extra = [] } = {}) {
  const args = ['--enable-unsafe-webgpu', '--enable-features=Vulkan,WebGPUService', '--ignore-gpu-blocklist', '--disable-frame-rate-limit', '--disable-gpu-vsync', '--disable-dawn-features=timestamp_quantization', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', ...extra];
  const browser = await chromium.launch({ channel: 'chrome', headless, args }); return browser;
}
export async function open(browser, qs, { w = 1920, h = 1080, throttle = 1, log = [] } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 }); const page = await ctx.newPage();
  page.on('console', m => { const t = m.text(); if (m.type() === 'error' || m.type() === 'warning' || /error|fail/i.test(t)) log.push(m.type() + ': ' + t.slice(0, 400)); });
  page.on('pageerror', e => log.push('pageerror: ' + String(e).slice(0, 400)));
  const bytes = { total: 0, items: [] }; page.on('response', async r => { try { const len = +(r.headers()['content-length'] || 0); const u = r.url().replace(/^https?:\/\/[^/]+/, ''); bytes.items.push([u, len]); bytes.total += len; } catch (e) { /* ignore */ } });
  if (throttle > 1) { const c = await ctx.newCDPSession(page); await c.send('Emulation.setCPUThrottlingRate', { rate: throttle }); page.__cdp = c; }
  const t0 = Date.now(); await page.goto(BASE + '?' + qs, { waitUntil: 'load' });
  await page.waitForFunction(() => window.bench && (window.bench.ready || window.bench.error), null, { timeout: 120000 });
  const err = await page.evaluate(() => window.bench.error || null); if (err) throw new Error(err + '\n' + log.join('\n'));
  return { page, ctx, log, bytes, loadMs: Date.now() - t0 };
}

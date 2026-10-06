// v11-net.mjs - "no network request of any kind" and the static facts of the single file: opened from file:// with every host resolver rule blocking the network (so a hidden dependency would fail loudly),
// plus a scan of the source for URLs and network APIs.  Also the size, the console, and the first-frame time.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { PROTO, WORK, CHROME, writeJson, sleep } from './lib.mjs';

const html = fs.readFileSync(path.join(PROTO, 'battle-studio.html'), 'utf8'); const out = { generated: new Date().toISOString(), bytes: Buffer.byteLength(html) };
out.urls = [...new Set([...html.matchAll(/https?:\/\/[^\s"'<>)\\]+/g)].map((m) => m[0]))];
out.apis = Object.fromEntries(['fetch(', 'XMLHttpRequest', 'WebSocket', 'sendBeacon', 'importScripts', 'EventSource', 'new Worker', 'navigator.serviceWorker', 'localStorage', 'IndexedDB', 'document.cookie'].map((k) => [k, html.split(k).length - 1]));
out.externalTags = [...html.matchAll(/<(script|link|img|iframe|source|video|audio)\b[^>]*\b(src|href)=["']([^"']+)["']/gi)].map((m) => m[0].slice(0, 120));
const dir = path.join(WORK, 'chrome-profile', 'net'); fs.mkdirSync(dir, { recursive: true });
const ctx = await chromium.launchPersistentContext(dir, { executablePath: CHROME, headless: true, viewport: { width: 1440, height: 900 }, args: ['--no-first-run', '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost', '--disable-sync'] });
const page = ctx.pages()[0] || await ctx.newPage(); const reqs = []; const errs = []; const fails = [];
page.on('request', (r) => reqs.push(r.url().slice(0, 120))); page.on('requestfailed', (r) => fails.push(r.url().slice(0, 120) + ' ' + (r.failure() || {}).errorText)); page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errs.push(m.type() + ': ' + m.text()); }); page.on('pageerror', (e) => errs.push('pageerror ' + e.message));
const url = pathToFileURL(path.join(PROTO, 'battle-studio.html')).href + '?fresh=1&welcome=0'; await page.goto(url); await page.waitForFunction(() => window.__studio && window.__studio.ready, null, { timeout: 30000 }); await sleep(2500);
out.fileProtocol = { requests: reqs, failed: fails, consoleErrors: errs, firstFrameMs: await page.evaluate(() => window.__studio.boot.firstFrameMs), phases: await page.evaluate(() => window.__studio.boot.phases) };
// play a few seconds, open every panel, run the showcase for 12 s: still no request?
await page.evaluate(async () => { const S = window.__studio; S.engine.transport.play(); await new Promise((r) => setTimeout(r, 2500)); for (const t of ['tune', 'inspect', 'about']) { S.ui.panelOpen = false; S.ui.togglePanel(t); await new Promise((r) => setTimeout(r, 200)); } S.ui.panelOpen = false; S.ui.renderChrome(); S.startTour('showcase'); await new Promise((r) => setTimeout(r, 12000)); S.director.stop('closed'); });
out.afterUse = { requests: reqs.length, failed: fails, consoleErrors: errs };
await ctx.close(); console.log(JSON.stringify({ bytes: out.bytes, urls: out.urls.length, apis: out.apis, externalTags: out.externalTags, file: { requests: out.fileProtocol.requests.length, failed: out.fileProtocol.failed.length, errs: out.fileProtocol.consoleErrors }, after: out.afterUse.requests, firstFrameMs: out.fileProtocol.firstFrameMs }));
console.log('urls in the source:', out.urls.join(' | ').slice(0, 900)); writeJson('v11-net.json', out);

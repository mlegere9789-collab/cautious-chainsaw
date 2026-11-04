// Prints docs/guide/src/guide.html to PDF with headless Chrome (tagged PDF + document outline), serving docs/guide over
// localhost so the stylesheet, the embedded web fonts and the screenshots load exactly as they would on a web page.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from 'playwright-core';
import { spawnSync } from 'node:child_process';
import { GUIDE, REPO } from './site.mjs';

export const CHROME = process.env.GUIDE_CHROME || process.env.T0_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml' };

function serveGuide() {
  const server = http.createServer((req, res) => {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const f = path.resolve(GUIDE, '.' + p);
    if (!f.startsWith(GUIDE) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
    res.end(fs.readFileSync(f));
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port })));
}

/** print src/guide.html -> pdfPath; also returns the page boxes (CSS px) of every element with an id, for layout checks */
export async function printPdf(pdfPath, { pngDir = null } = {}) {
  if (!fs.existsSync(CHROME)) throw new Error(`Chrome not found at ${CHROME} (set GUIDE_CHROME)`);
  const { server, port } = await serveGuide();
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--font-render-hinting=none', '--disable-lcd-text'] });
  try {
    const page = await browser.newPage({ viewport: { width: 816, height: 1056 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('requestfailed', (r) => errors.push(`request failed: ${r.url()}`));
    page.on('response', (r) => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
    await page.goto(`http://127.0.0.1:${port}/src/guide.html`, { waitUntil: 'load' });
    await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; })))); });
    const fonts = await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.weight} ${f.style}`));
    await page.emulateMedia({ media: 'print' });
    await page.pdf({ path: pdfPath, preferCSSPageSize: true, printBackground: true, tagged: true, outline: true, displayHeaderFooter: false });
    if (errors.length) throw new Error('page problems while printing:\n' + errors.join('\n'));
    return { fonts };
  } finally { await browser.close(); server.close(); }
}

/** run a python helper of this folder and parse its JSON output */
export function py(script, args) {
  const r = spawnSync('python', ['-I', path.join(REPO, 'tools', 'guide', 'lib', script), ...args], { encoding: 'utf8', maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error(`${script} failed:\n${r.stderr || r.stdout}`);
  return r.stdout ? JSON.parse(r.stdout) : null;
}

// verify/studio-integration.mjs - does the backdrop drop into the REAL Battle Studio?  It copies the prototype (docs/pitch/anim/prototype, read only) to tmp/look-dev/basemap/proto,
// adds the backdrop modules and the data-URI tile pack next to the engine, registers backdropEntries() in the Studio's backdrop registry (the hook registerBuiltins(kernel, { backdrops }) offers),
// builds ONE self-contained battle-studio.html with the Studio's own strict bundler, opens it in real Chrome at DPR 1 and 2 with ?backdrop=real-dim and ?backdrop=real-paper and checks:
// the bundler accepts every module, the token validates against the registry, no page error, no tile failed, no network request at all, and the Studio drew the real ground.
//   node verify/studio-integration.mjs  -> results/studio-integration.json and previews/studio-on-real-ground-<look>.jpg (DPR 1)
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright-core';
const HERE = path.dirname(fileURLToPath(import.meta.url)); const BASE = path.resolve(HERE, '..'); const REPO = path.resolve(BASE, '..', '..', '..', '..');
const PROTO = path.join(REPO, 'docs', 'pitch', 'anim', 'prototype'); const S = path.join(REPO, 'tmp', 'look-dev', 'basemap', 'proto'); const PORT = 9805;
fs.rmSync(S, { recursive: true, force: true }); fs.mkdirSync(S, { recursive: true });
for (const f of ['src', 'data', 'tokens', 'build.mjs']) fs.cpSync(path.join(PROTO, f), path.join(S, f), { recursive: true });
fs.mkdirSync(path.join(S, 'src', 'basemap', 'data'), { recursive: true });
for (const f of fs.readdirSync(path.join(BASE, 'src'))) fs.copyFileSync(path.join(BASE, 'src', f), path.join(S, 'src', 'basemap', f));
for (const f of ['manifest.mjs', 'vectors.mjs']) fs.copyFileSync(path.join(BASE, 'data', f), path.join(S, 'src', 'basemap', 'data', f));
if (!fs.existsSync(path.join(BASE, 'dist', 'pack.mjs'))) throw new Error('run node tools/build-pack.mjs first');
fs.copyFileSync(path.join(BASE, 'dist', 'pack.mjs'), path.join(S, 'src', 'basemap', 'pack.mjs'));
const patch = (file, from, to) => { const p = path.join(S, 'src', file); const s = fs.readFileSync(p, 'utf8'); if (!s.includes(from)) throw new Error('patch target not found in ' + file); fs.writeFileSync(p, s.replace(from, to)); };
patch('builtins.mjs', "import { BACKDROPS } from './render/backdrops.mjs';", "import { BACKDROPS } from './render/backdrops.mjs';\nimport { createBackdrop, backdropEntries } from './basemap/backdrop.mjs';\nimport { MANIFEST } from './basemap/data/manifest.mjs';\nimport { VECTORS } from './basemap/data/vectors.mjs';\nimport { PACK } from './basemap/pack.mjs';");
patch('builtins.mjs', "  for (const b of extra.backdrops || []) kernel.backdrops.register(b.id, b);", "  for (const b of extra.backdrops || []) kernel.backdrops.register(b.id, b);\n  const real = createBackdrop({ manifest: MANIFEST, vectors: VECTORS, pack: PACK }); globalThis.__realBackdrop = real; real.prefetch(14);\n  for (const b of backdropEntries(real)) kernel.backdrops.register(b.id, b);");
patch('app.mjs', "  const T = engine.tuning; mark('engine');", "  if (globalThis.__realBackdrop) globalThis.__realBackdrop.onchange = () => { engine.dirty = true; };      // the one line a host needs: redraw when a tile arrives\n  const T = engine.tuning; mark('engine');");
const built = execFileSync('node', [path.join(S, 'build.mjs')], { encoding: 'utf8' }); console.log(built.trim().split('\n').pop());
const srv = http.createServer((req, res) => { const f = path.join(S, decodeURIComponent(req.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, { 'content-type': f.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream' }); res.end(d); } }); }).listen(PORT);
const out = [];
for (const [look, dpr] of [['dim', 1], ['dim', 2], ['paper', 1], ['slate', 2], ['natural', 1]]) {
  const ctx = await chromium.launchPersistentContext(path.join(REPO, 'tmp', 'look-dev', 'basemap', 'chrome-profile'), { executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, viewport: { width: 1440, height: 900 }, deviceScaleFactor: dpr });
  const page = ctx.pages()[0] || await ctx.newPage(); const errors = []; const reqs = [];
  page.on('pageerror', (e) => errors.push('pageerror ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errors.push(m.text()); });
  page.on('request', (r) => { const u = r.url(); if (!u.startsWith(`http://127.0.0.1:${PORT}`) && !u.startsWith('data:') && !u.startsWith('blob:')) reqs.push(u); });
  await page.goto(`http://127.0.0.1:${PORT}/battle-studio.html?backdrop=real-${look}&welcome=0&fresh=1`);
  await page.waitForFunction(() => window.__studio, null, { timeout: 60000 }); await page.waitForTimeout(2500);
  const info = await page.evaluate(() => ({ id: window.__studio.tuning.get('backdrop.id'), stats: globalThis.__realBackdrop.stats(), idle: !globalThis.__realBackdrop.pending() }));
  const file = dpr === 1 ? path.join(BASE, 'previews', `studio-on-real-ground-${look}.jpg`) : path.join(REPO, 'tmp', 'look-dev', 'basemap', `studio-on-real-ground-${look}-dpr2.jpg`); await page.screenshot({ path: file, type: 'jpeg', quality: 84 });      // DPR 2 pictures stay in tmp (not committed)
  out.push({ look, dpr, backdropId: info.id, tilesFailed: info.stats.aerialFailed, tilesLoaded: info.stats.aerialLoaded, renders: info.stats.renders, idle: info.idle, errors, externalRequests: reqs, screenshot: dpr === 1 ? path.relative(BASE, file).split(path.sep).join('/') : null });
  console.log(JSON.stringify(out.at(-1))); await ctx.close();
}
srv.close();
const ok = out.every((o) => o.backdropId === 'real-' + o.look && o.tilesFailed === 0 && o.errors.length === 0 && o.externalRequests.length === 0 && o.idle);
fs.mkdirSync(path.join(HERE, 'results'), { recursive: true }); fs.writeFileSync(path.join(HERE, 'results', 'studio-integration.json'), JSON.stringify({ ok, studioHtmlKB: Math.round(fs.statSync(path.join(S, 'battle-studio.html')).size / 1024), runs: out }, null, 1)); console.log('ok:', ok);

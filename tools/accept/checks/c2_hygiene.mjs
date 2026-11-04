// Check 2: static hygiene - parse everything, crawl every internal reference over HTTP (through the _headers/_redirects server), mixed content,
// console/pageerror/failed-request cleanliness on EVERY route, service worker install and update.
import fs from 'node:fs';
import path from 'node:path';
import { Check, walk, sleep, round } from '../lib/util.mjs';
import * as sp from '../lib/static_parse.mjs';
import { watchPage, watchDefects, settle } from '../lib/browser.mjs';

const MIME_BY_EXT = { '.js': /javascript/, '.mjs': /javascript/, '.css': /text\/css/, '.json': /json/, '.html': /text\/html/, '.png': /image\/png/, '.jpg': /image\/jpeg/, '.jpeg': /image\/jpeg/, '.webp': /image\/webp/, '.svg': /image\/svg/, '.ico': /image\/(x-icon|vnd\.microsoft\.icon)/, '.pdf': /application\/pdf/, '.xml': /xml/, '.webmanifest': /manifest|json/, '.woff2': /font\/woff2|octet/, '.txt': /text\/plain/ };
const SKIP_LINT = /^google[0-9a-f]+\.html$/;

export async function run(ctx) {
  const c = new Check('2', 'Static hygiene (parse, crawl, console, mixed content, service worker)');
  const dist = ctx.dist; const files = walk(dist);
  const read = (f) => fs.readFileSync(path.join(dist, f));
  const text = (f) => read(f).toString('utf8');

  // ---------------------------------------------------------------- A. parse
  const parse = { html: 0, css: 0, js: 0, json: 0, inlineScripts: 0, inlineStyles: 0 };
  const idsByPage = {};
  for (const f of files) {
    const ext = path.extname(f).toLowerCase();
    if (ext === '.html' && !SKIP_LINT.test(f)) {
      parse.html++; const t = text(f); const { issues, ids } = sp.lintHtml(t); idsByPage['/' + f] = ids;
      for (const i of issues) c.defect(i.code, `${f}:${i.line}`, i.detail);
      for (const s of sp.inlineScripts(t)) {
        parse.inlineScripts++;
        if (/json/i.test(s.type)) { try { JSON.parse(s.body); } catch (e) { c.defect('json-parse', `${f}:${s.line}`, `inline ${s.type}: ${e.message}`); } }
        else if (/javascript|module|ecmascript/i.test(s.type)) { const r = sp.parseJs(s.body); if (!r.ok) c.defect('js-parse', `${f}:${s.line}`, `inline script: ${r.error}`); }
      }
      for (const s of sp.inlineStyles(t)) { parse.inlineStyles++; for (const i of sp.lintCss(s.body)) c.defect(i.code, `${f}:${s.line}`, i.detail); }
    } else if (ext === '.html') { /* search-console verification file: not a document */ }
    else if (ext === '.css') { parse.css++; for (const i of sp.lintCss(text(f), f)) c.defect(i.code, f, i.detail); }
    else if (ext === '.js' || ext === '.mjs') { parse.js++; const r = sp.parseJs(text(f)); if (!r.ok) c.defect('js-parse', f, r.error); }
    else if (ext === '.json' || ext === '.webmanifest') { parse.json++; try { JSON.parse(text(f)); } catch (e) { c.defect('json-parse', f, e.message); } }
  }
  c.metrics.parsed = parse;

  // ---------------------------------------------------------------- B. crawl
  const refs = []; let dynamicRefs = 0;
  for (const f of files) {
    const from = '/' + f; const ext = path.extname(f).toLowerCase();
    if (f.startsWith('_ops/') || f === '_headers' || f === '_redirects' || f === 'netlify.toml') continue;
    try {
      if (ext === '.html') refs.push(...sp.htmlRefs(text(f), from));
      else if (ext === '.css') refs.push(...sp.cssRefs(text(f), from));
      else if (ext === '.js' || ext === '.mjs') { const r = sp.jsRefs(text(f), from); refs.push(...r.refs); dynamicRefs += r.dynamic; }
      else if (f === 'manifest.json' || ext === '.webmanifest') refs.push(...sp.manifestRefs(text(f), from));
      else if (f === 'sitemap.xml') refs.push(...sp.sitemapRefs(text(f), from));
      else if (f === 'robots.txt') refs.push(...sp.robotsRefs(text(f), from));
    } catch (e) { c.defect('crawl-read', f, e.message); }
  }
  const IGNORE = [[/^\/mapbox-gl-js\//, 'prefix of the Mapbox CDN path (https://api.mapbox.com/mapbox-gl-js/...): Mapbox GL appends it to its own origin at runtime']];
  const ignored = refs.filter((r) => r.path && IGNORE.some(([re]) => re.test(r.path)));
  const internal = refs.filter((r) => r.path && !r.external && !IGNORE.some(([re]) => re.test(r.path)));
  if (ignored.length) c.note('crawl-ignored', '-', `${ignored.length} string literals under /mapbox-gl-js/ ignored: ${IGNORE[0][1]}`);
  const external = refs.filter((r) => r.external);
  const targets = new Map();                                    // path -> [refs]
  for (const r of internal) { if (!targets.has(r.path)) targets.set(r.path, []); targets.get(r.path).push(r); }
  const results = new Map();
  const queue = [...targets.keys()]; let qi = 0;
  const worker = async () => {
    while (qi < queue.length) {
      const p = queue[qi++];
      try {
        const res = await fetch(ctx.cand.url + encodeURI(p), { redirect: 'follow' });
        const body = await res.arrayBuffer();
        results.set(p, { status: res.status, type: res.headers.get('content-type') || '', bytes: body.byteLength, nosniff: res.headers.get('x-content-type-options'), cc: res.headers.get('cache-control') || '', url: res.url });
      } catch (e) { results.set(p, { status: 0, error: e.message }); }
    }
  };
  await Promise.all(Array.from({ length: 12 }, worker));
  const referenced = new Set();
  for (const [p, rs] of targets) {
    const res = results.get(p); const first = rs[0];
    referenced.add(p.replace(/^\//, '')); referenced.add(p.replace(/^\//, '') + '.html');
    if (!res || res.status !== 200) { c.defect('broken-reference', `${first.from}${first.line ? ':' + first.line : ''}`, `${first.kind} -> ${p} answers ${res ? res.status || res.error : 'nothing'} (${rs.length} reference${rs.length > 1 ? 's' : ''})`, { target: p }); continue; }
    const ext = path.extname(p).toLowerCase();
    if (MIME_BY_EXT[ext] && !MIME_BY_EXT[ext].test(res.type)) c.defect('wrong-mime-type', first.from, `${p} is served as "${res.type}"`);
    if (res.nosniff !== 'nosniff') c.defect('missing-response-header', p, 'x-content-type-options: nosniff is not sent');
    if (p.startsWith('/assets/') && !/immutable|max-age=31536000/.test(res.cc)) c.defect('bad-response-header', p, `hashed asset without long-lived cache-control ("${res.cc}")`);
    if (p === '/sw.js' && !/no-cache|no-store|max-age=0/.test(res.cc)) c.defect('bad-response-header', p, `service worker must not be cached (cache-control "${res.cc}")`);
    if (res.bytes === 0 && ext !== '.html') c.defect('empty-file', first.from, `${p} is 0 bytes`);
    // fragments
    for (const r of rs) {
      if (!r.hash) continue;
      const pagePath = r.path === '/' ? '/index.html' : (path.extname(r.path) ? r.path : r.path + '.html');
      const ids = idsByPage[pagePath];
      if (ids && r.from !== pagePath && !ids.has(decodeURIComponent(r.hash)) && r.kind === 'a' && !/^(top|!)/.test(r.hash) && pagePath !== '/index.html') c.defect('broken-fragment', `${r.from}:${r.line}`, `${r.path}#${r.hash}: no element with that id`);
    }
  }
  // same-page "#x" links are dropped by resolveRef when empty; check pure-fragment anchors against their own page
  for (const f of files.filter((x) => x.endsWith('.html') && !SKIP_LINT.test(x))) {
    const t = text(f); const ids = idsByPage['/' + f] || new Map();
    for (const m of t.matchAll(/<a\b[^>]*\bhref\s*=\s*["']#([^"']+)["']/gi)) if (!ids.has(m[1]) && !/^(top|!.*)$/.test(m[1])) c.note('fragment-target-not-static', f, `#${m[1]} has no static id (may be created by script)`);
  }
  const extHosts = {}; for (const r of external) { try { const h = new URL(r.abs).host; extHosts[h] = (extHosts[h] || 0) + 1; } catch { /* odd */ } }
  const unreferenced = files.filter((f) => !referenced.has(f) && !/^(_headers|_redirects|netlify\.toml|index\.html|404\.html|robots\.txt|sitemap\.xml|version\.json|sw\.js)$/.test(f) && !f.startsWith('_ops/') && !f.startsWith('data/') && !/\.html$/.test(f));
  c.metrics.crawl = { internalReferences: internal.length, uniqueTargets: targets.size, externalReferences: external.length, externalHosts: extHosts, dynamicTemplateReferencesNotResolvable: dynamicRefs, unreferencedFilesNote: unreferenced.length };
  c.note('external-not-checked', '-', `${external.length} references to ${Object.keys(extHosts).length} external hosts were NOT requested (the run is offline by design): ${Object.keys(extHosts).join(', ')}`);
  if (dynamicRefs) c.note('dynamic-references-not-resolvable', '-', `${dynamicRefs} template-string asset references (with \${}) cannot be resolved statically; the route sweep exercises the ones the pages actually request`);
  if (unreferenced.length) c.note('unreferenced-files', '-', unreferenced.slice(0, 40).join(', ') + (unreferenced.length > 40 ? ` ... (+${unreferenced.length - 40})` : ''));

  // ---------------------------------------------------------------- C. mixed content / insecure URLs
  let insecure = 0;
  for (const f of files) {
    const ext = path.extname(f).toLowerCase();
    if (!['.html', '.css', '.js', '.json', '.xml', '.txt', '.webmanifest', '.svg'].includes(ext) || f === '_headers' || f.startsWith('_ops/')) continue;
    let t; try { t = text(f); } catch { continue; }
    for (const u of sp.insecureUrls(t)) { insecure++; c.defect('mixed-content-or-insecure-url', `${f}:${u.line}`, u.url); }
  }
  c.metrics.insecureUrls = insecure;

  // ---------------------------------------------------------------- D/E. every route in a fresh browser: console, pageerror, failed/bad requests, live fragment targets.
  // Pages that need Mapbox (the app, and the pages that load mapbox-gl from api.mapbox.com) load with REAL tiles through the capped, Referer-injecting
  // channel; the rest load with Mapbox blocked.
  const routes = ctx.routes;
  const routeResults = [];
  const loadRoute = async (session, r, mode) => {
    const page = await session.newPage();
    const expect = r.expectStatus ? { [r.url]: r.expectStatus } : {};
    const w = watchPage(page, ctx.lib, { expectStatus: expect, getTileMode: () => mode, capped: () => session.tileStats.capBlocked > 0 });
    let status = null; const t0 = Date.now();
    try {
      const resp = await page.goto(ctx.cand.url + r.url, { waitUntil: 'load', timeout: 45000 });
      status = resp && resp.status();
      if (resp && !r.expectStatus) {
        const h = resp.headers();
        for (const need of ['x-content-type-options', 'referrer-policy', 'strict-transport-security', 'cache-control', 'permissions-policy']) if (!h[need]) c.defect('missing-response-header', r.path, `${need} is not sent for this document (check _headers coverage of the route)`);
        if (h['x-content-type-options'] && !/nosniff/i.test(h['x-content-type-options'])) c.defect('bad-response-header', r.path, `x-content-type-options: ${h['x-content-type-options']}`);
        if (!h['x-frame-options'] && !/frame-ancestors/i.test(h['content-security-policy'] || '') && r.path !== '/embed') c.defect('missing-response-header', r.path, 'neither X-Frame-Options nor CSP frame-ancestors is sent (clickjacking protection)');
        if (!/no-cache|max-age=0|must-revalidate/i.test(h['cache-control'] || '')) c.defect('bad-response-header', r.path, `documents must revalidate, cache-control is "${h['cache-control'] || ''}"`);
      }
      await settle(page, mode === 'inject' ? 4000 : 1200);
      if (r.app) await ctx.lib.waitForApp(page, 45000).catch((e) => c.defect('app-did-not-mount', r.path, e.message));
    } catch (e) { c.defect('navigation-failed', r.path, e.message); }
    const exp = r.expectStatus || 200;
    if (status !== exp) c.defect('unexpected-status', r.path, `status ${status}, expected ${exp}`);
    const info = await page.evaluate(() => ({
      title: document.title, bodyChars: (document.body && document.body.innerText.length) || 0, canvases: document.querySelectorAll('.mapboxgl-canvas').length,
      brokenFragments: [...document.querySelectorAll('a[href^="#"]')].map((a) => a.getAttribute('href').slice(1)).filter((id) => id && id !== '!' && !document.getElementById(decodeURIComponent(id)) && !document.getElementsByName(id).length),
      brokenImages: [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.currentSrc && !i.currentSrc.startsWith('data:')).map((i) => i.currentSrc),
    })).catch(() => ({}));
    if (!info.title) c.defect('no-document-title', r.path, 'empty document.title');
    if (info.bodyChars < 20 && !r.app) c.defect('blank-page', r.path, `visible text length ${info.bodyChars}`);
    for (const id of info.brokenFragments || []) c.defect('broken-fragment-live', r.path, `#${id}: no element with that id in the rendered page`);
    for (const u of info.brokenImages || []) c.defect('broken-image', r.path, u);
    for (const d of watchDefects(w)) c.defect(`route-${d.code}`, r.path, d.detail);
    if (mode === 'inject' && (r.hasMapbox || r.app) && !info.canvases) c.defect('map-canvas-missing', r.path, 'page uses Mapbox but no .mapboxgl-canvas exists after load with real tiles');
    routeResults.push({ route: r.path, mode, status, ms: Date.now() - t0, mapCanvases: info.canvases, mapboxNoiseSuppressed: w.mapboxNoise, console: w.console.length, pageerrors: w.pageerrors.length, failed: w.failed.length, bad: w.bad.length, csp: w.csp.length });
    await page.close();
  };
  const plain = routes.filter((r) => !r.hasMapbox && !r.app), mapped = routes.filter((r) => r.hasMapbox || r.app);
  const s1 = await ctx.sessions.create({ profile: 'hygiene', tiles: 'block', onboarded: false });
  c.metrics.chrome = s1.chromeVersion;
  try { for (const r of plain) await loadRoute(s1, r, 'block'); } finally { await s1.close(); }
  const s2 = await ctx.sessions.create({ profile: 'hygiene-map', tiles: 'inject', onboarded: false });
  try {
    for (const r of mapped) {
      if (ctx.lib.tileBudget.used > ctx.lib.tileBudget.cap - 60) { c.defect('map-route-not-loaded-budget', r.path, `tile budget spent (${ctx.lib.tileBudget.used}/${ctx.lib.tileBudget.cap}); raise --tile-cap, this route was NOT verified`); continue; }
      await loadRoute(s2, r, 'inject');
    }
    const st = s2.tileStats;
    c.metrics.mapLoads = { routes: mapped.length, tileRequestsSeen: st.seen, statuses: st.status, refererInjected: st.referer, skus: [...st.skus].length };
    if (Object.keys(st.status).some((k) => Number(k) >= 400)) c.defect('mapbox-status', 'mapbox', `Mapbox answered ${JSON.stringify(st.status)} with the production Referer injected (token/URL restriction or outage?)`);
  } finally { await s2.close(); }
  c.metrics.routes = routeResults.length;
  c.raw.routeLoads = routeResults;
  c.note('mapbox-cdn-runtime-dependency', '-', `${mapped.filter((r) => !r.app).length} pages load mapbox-gl.js/css from https://api.mapbox.com at runtime (SRI-pinned v3.24.1); the app bundles its own copy`);

  // ---------------------------------------------------------------- F. service worker install + update
  await serviceWorkerDrill(ctx, c, files);
  return c.finish();
}

async function serviceWorkerDrill(ctx, c, files) {
  if (!files.includes('sw.js')) { c.defect('no-service-worker', 'sw.js', 'sw.js is not shipped'); return; }
  const { lib } = ctx;
  const session = await ctx.sessions.create({ profile: 'sw', tiles: 'block', onboarded: true });
  const sw = {};
  try {
    const page = session.page;
    const w = watchPage(page, lib, { getTileMode: () => 'block' });
    await page.goto(ctx.cand.url + '/', { waitUntil: 'load' }); await settle(page, 1500);
    const ready = await page.evaluate(async () => { try { const reg = await Promise.race([navigator.serviceWorker.ready, new Promise((_, rej) => setTimeout(() => rej(new Error('serviceWorker.ready timeout 20 s')), 20000))]); return { scope: reg.scope, active: reg.active && reg.active.scriptURL, state: reg.active && reg.active.state }; } catch (e) { return { error: String(e.message) }; } });
    sw.install = ready;
    if (ready.error || !ready.active) c.defect('sw-not-installed', '/sw.js', ready.error || 'no active worker');
    // a reload: the worker controls the page and serves hashed assets from its cache
    await page.reload({ waitUntil: 'load' }); await settle(page, 2000);
    const afterReload = await page.evaluate(async () => ({ controller: navigator.serviceWorker.controller ? navigator.serviceWorker.controller.scriptURL : null, caches: await caches.keys(), cachedAssets: await (async () => { const ks = (await caches.keys()).filter((k) => k.startsWith('gbg-')); let n = 0; for (const k of ks) n += (await (await caches.open(k)).keys()).length; return n; })() }));
    sw.afterReload = afterReload;
    if (!afterReload.controller) c.defect('sw-not-controlling', '/', 'page is not controlled by the service worker after a reload');
    if (!afterReload.caches.some((k) => k.startsWith('gbg-'))) c.defect('sw-cache-missing', '/', `no gbg-* cache after load (caches: ${afterReload.caches.join(',') || 'none'})`);
    if (!afterReload.cachedAssets) c.defect('sw-cache-empty', '/', 'service worker cache holds no asset after two loads');
    // update path: serve a changed sw.js (new cache name), ask for an update, expect a waiting/active new worker and no page reload
    const orig = fs.readFileSync(path.join(ctx.dist, 'sw.js'), 'utf8');
    const m = /const CACHE\s*=\s*['"]([^'"]+)['"]/.exec(orig);
    const updated = m ? orig.replace(m[1], m[1] + '-acceptance-update') : orig + '\n// acceptance update drill\n';
    const swPath = path.join(ctx.scratch, 'sw-updated.js'); fs.writeFileSync(swPath, updated);
    ctx.cand.setOverrides({ '/sw.js': swPath });
    await page.evaluate(() => { window.__acceptNoReload = Math.random(); });
    const tok = await page.evaluate(() => window.__acceptNoReload);
    const upd = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration(); await reg.update();
      const t0 = performance.now();
      while (performance.now() - t0 < 15000) { if (reg.waiting || (reg.active && reg.installing == null && reg.active.scriptURL && false)) break; await new Promise((r) => setTimeout(r, 100)); }
      return { waiting: !!reg.waiting, installing: !!reg.installing, active: reg.active && reg.active.state };
    });
    sw.update = upd;
    const samePage = (await page.evaluate(() => window.__acceptNoReload)) === tok;
    if (!upd.waiting) c.defect('sw-update-not-detected', '/sw.js', `reg.update() with a changed sw.js produced no waiting worker (${JSON.stringify(upd)})`);
    if (!samePage) c.defect('sw-update-reloaded-page', '/', 'the page was reloaded by the update (the worker promises it never does)');
    // activate: close every tab, open a new one, the new worker must take over and purge the old cache
    const page2 = await session.newPage(); await page.close();
    await sleep(3000);
    let after = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      await page2.goto(ctx.cand.url + '/', { waitUntil: 'load' }); await settle(page2, 2500);
      after = await page2.evaluate(async () => { const reg = await navigator.serviceWorker.getRegistration(); return { active: reg && reg.active && reg.active.state, waiting: !!(reg && reg.waiting), caches: await caches.keys(), controller: !!navigator.serviceWorker.controller }; });
      after.loads = attempt + 1;
      if (!after.waiting && (!m || after.caches.includes(m[1] + '-acceptance-update'))) break;
      await sleep(3000);
    }
    sw.afterActivate = after;
    if (m) {
      if (!after.caches.includes(m[1] + '-acceptance-update')) c.defect('sw-update-not-activated', '/sw.js', `new cache ${m[1]}-acceptance-update not present after the old tabs closed (${after.caches.join(',')})`);
      if (after.caches.includes(m[1])) c.defect('sw-old-cache-not-purged', '/sw.js', `old cache ${m[1]} still present after activation`);
    }
    for (const d of watchDefects(w)) c.defect(`sw-${d.code}`, '/', d.detail);
    ctx.cand.setOverrides({});
  } catch (e) { c.defect('sw-drill-error', '/sw.js', e.message); }
  finally { try { ctx.cand.setOverrides({}); } catch { /* closed */ } await session.close(); }
  c.metrics.serviceWorker = sw;
}

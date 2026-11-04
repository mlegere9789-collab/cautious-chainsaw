#!/usr/bin/env node
// tests/t0/prod-probe.mjs - post-deploy / scheduled probe of a Netlify site (chapter 02 sections 2 and 8, WP-T0-18/19; probes HP-01..15 of
// chapter 12 plus the Tranche-0 probes T0-xx). Dependency-free (node >= 18). READ-ONLY: it sends HEAD requests for almost everything and
// GET only for small text files (version.json, sw.js, sitemap.xml, the kill switch) and for TWO html pages (/ and /ar.html); it never
// executes page JavaScript, so it cannot reach Netlify RUM (RUM runs in browsers). It identifies itself as `gbg-prod-probe/1`.
//
//   node tests/t0/prod-probe.mjs --base https://gettysburginteractivemap.com --train R0
//   node tests/t0/prod-probe.mjs --base https://gbg-staging.netlify.app --train R1a --staging --dist release/R1a/dist
//   node tests/t0/prod-probe.mjs --base https://gettysburginteractivemap.com --train R1c --parity https://gbg-staging.netlify.app --staging-vs
//
// options
//   --base URL          site to probe (default https://gettysburginteractivemap.com)
//   --train T           which expectations apply: legacy | R0 | R1a | R1b | R1c | R1d | S1 | auto (default auto = the last row of ops/RELEASE-LOG.md,
//                       `legacy` when the log is empty). A probe that is red but not yet due for that train prints KNOWN, not FAIL.
//   --expect-release R  /version.json "release" must equal R (default: the release id of the last RELEASE-LOG row, when there is one)
//   --dist DIR          a release dist (release/<train>/dist): the served entry, chunks, css, sw.js and version.json must be byte-identical to the
//                       files in DIR (T0-BYTES; downloads about 2.3 MB once), and the served index.html / privacy.html must equal DIR's page after
//                       Netlify's post-processing model (T0-HTML: any other difference is content drift and FAILS; there is no warning level)
//   --staging           the site is gbg-staging: X-Robots-Tag noindex MUST be present (production: it must be absent - T0-06)
//   --kill              level-2 kill switch is deployed: /sw.js must be ops/sw-kill.js, T0-03 is inverted
//   --parity URL        also compare the security/caching headers of representative URLs between --base and URL (proves netlify.toml/_headers
//                       were processed the same way on both sites); with --staging-vs the X-Robots-Tag difference is expected
//   --headers-probe P   auto (default) | off | <path>: also run ops/headers-probe.mjs when that file exists (its own HP-01..15 + E-01..04; profile chosen from --train:
//                       R0/R1a/R1b = baseline (no header may regress), R1c = t0, S1 = s1); skipped under --no-content because it GETs /
//   --no-content        skip the two html GETs (T0-05 and T0-02 report SKIP)
//   --json FILE         write the full result as JSON (overwritten every run)
//   --log FILE          append ONE summary line per run (time, verdict, counts, failing ids): the file to look at after a scheduled run
//   --retries N (default 3)  --timeout MS (default 15000)  --verbose  --list  (print the probe table and exit)
// exit codes: 0 = no unexpected failure, 1 = at least one FAIL, 2 = the probe itself could not run (network, bad options): never read as a site failure
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const UA = 'gbg-prod-probe/1 (release monitoring; HEAD-mostly; contact: site owner)';
const TRAINS = ['legacy', 'R0', 'R1a', 'R1b', 'R1c', 'S1'];        // R1d = R1c; DG2 (never inside Tranche 0) is handled separately
const LEGACY_ENTRY = 'index-Cg8FAMXN.js';
const NETLIFY_APP_HOST = 'https://friendly-lolly-da85c0.netlify.app';   // the default netlify.app host of the production site (chapter 02 WP-T0-15)

// ------------------------------------------------------------------ options
const argv = process.argv.slice(2);
const opt = {}; const flags = new Set(['staging', 'kill', 'no-content', 'verbose', 'list', 'staging-vs', 'help']);
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]; if (!a.startsWith('--')) { console.error(`unexpected argument ${a}`); process.exit(2); }
  const k = a.slice(2); if (flags.has(k)) opt[k] = true; else { opt[k] = argv[++i]; if (opt[k] === undefined) { console.error(`--${k} needs a value`); process.exit(2); } }
}
if (opt.help) { const out = []; for (const l of fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1)) { if (!l.startsWith('//')) break; out.push(l.slice(3)); } console.log(out.join('\n')); process.exit(0); }
const BASE = (opt.base || 'https://gettysburginteractivemap.com').replace(/\/+$/, '');
try { new URL(BASE); } catch { console.error(`bad --base ${BASE}`); process.exit(2); }
const RETRIES = Number(opt.retries ?? 3); const TIMEOUT = Number(opt.timeout || 15000);
const LOG_FILE = path.join(REPO, 'ops', 'RELEASE-LOG.md');

// ------------------------------------------------------------------ release log (ops/RELEASE-LOG.md): last row = what should be live
function readLog() {
  if (!fs.existsSync(LOG_FILE)) return null;
  const rows = [];
  for (const line of fs.readFileSync(LOG_FILE, 'utf8').split(/\r?\n/)) {
    if (!line.startsWith('|')) continue;
    const c = line.split('|').slice(1, -1).map((s) => s.trim());
    if (c.length < 5 || /^-+$/.test(c[0].replace(/:/g, '')) || /^#$/.test(c[0])) continue;
    const [n, date, action, train, rid] = c;
    if (!/^\d+$/.test(n) || !/^[0-9a-f]{8}$/.test(rid || '')) continue;      // template/placeholder rows are ignored
    rows.push({ n: Number(n), date, action: (action || '').toLowerCase(), train, rid });
  }
  return rows.length ? rows[rows.length - 1] : null;
}
const lastRow = readLog();
let TRAIN = opt.train || 'auto';
if (TRAIN === 'auto') TRAIN = lastRow ? lastRow.train : 'legacy';
if (TRAIN === 'R1d' || TRAIN === 'R1e' || TRAIN === 'R1f' || TRAIN === 'R1g') TRAIN = 'R1c';
if (!TRAINS.includes(TRAIN)) { console.error(`unknown train ${TRAIN} (use ${TRAINS.join(' | ')} | R1d | auto)`); process.exit(2); }
const due = (from) => from !== 'DG2' && TRAINS.indexOf(TRAIN) >= TRAINS.indexOf(from);
const EXPECT_RELEASE = opt['expect-release'] || (lastRow && TRAIN !== 'legacy' ? lastRow.rid : null);

// ------------------------------------------------------------------ http
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function http(method, url, { redirect = 'manual', wantBody = false } = {}) {
  let lastErr;
  for (let a = 0; a <= RETRIES; a++) {
    const ac = new AbortController(); const t = setTimeout(() => ac.abort(), TIMEOUT);
    try {
      const res = await fetch(url, { method, redirect, signal: ac.signal, headers: { 'User-Agent': UA, 'Cache-Control': 'no-cache' } });
      const headers = {}; res.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });
      const body = wantBody && method !== 'HEAD' ? Buffer.from(await res.arrayBuffer()) : null;
      if (!wantBody) { try { await res.arrayBuffer(); } catch { /* drain */ } }
      return { status: res.status, headers, location: headers.location || null, body, url };
    } catch (e) { lastErr = e; await sleep(400 * (a + 1)); } finally { clearTimeout(t); }
  }
  const err = new Error(`network error for ${method} ${url}: ${(lastErr && lastErr.cause && lastErr.cause.code) || (lastErr && lastErr.message)}`); err.probeError = true; throw err;
}
const cache = new Map();
const memo = (key, fn) => { if (!cache.has(key)) cache.set(key, fn()); return cache.get(key); };
const head = (base, p) => memo(`H ${base}${p}`, () => http('HEAD', base + p));
const get = (base, p) => memo(`G ${base}${p}`, () => http('GET', base + p, { wantBody: true }));
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const h = (r, name) => r.headers[name] || '';
const isImmutable = (cc) => /max-age=31536000/.test(cc) && /immutable/.test(cc);
const frameAncestors = (r) => { const m = h(r, 'content-security-policy').match(/frame-ancestors\s+([^;]+)/i); return m ? m[1].trim() : null; };
const frameable = (r) => (!h(r, 'x-frame-options') && (frameAncestors(r) || '').split(/\s+/).includes('*'));
const notFrameable = (r) => /^(deny|sameorigin)$/i.test(h(r, 'x-frame-options')) || /'(self|none)'/.test(frameAncestors(r) || '');

// version.json (memoised) - the release the site says it is
async function version() {
  return memo('version', async () => {
    const r = await get(BASE, '/version.json');
    if (r.status !== 200) return { ok: false, status: r.status, why: `HTTP ${r.status}` };
    try { const j = JSON.parse(r.body.toString('utf8')); return { ok: true, json: j, res: r }; } catch { return { ok: false, status: 200, why: 'not JSON' }; }
  });
}
const names = (v) => (v.ok ? [v.json.entry, v.json.help, v.json.bookmark, v.json.css].filter(Boolean) : [LEGACY_ENTRY]);

// ------------------------------------------------------------------ probes: {id, title, from: first train where it must pass ('DG2' = never inside Tranche 0), run}
const P = [];
const probe = (id, title, from, run, extra = {}) => P.push({ id, title, from, run, ...extra });

probe('HP-01', 'enforcing Content-Security-Policy on / (not only Report-Only)', 'DG2', async () => { const r = await head(BASE, '/'); return [!!h(r, 'content-security-policy'), `enforcing CSP present: ${!!h(r, 'content-security-policy')}, report-only present: ${!!h(r, 'content-security-policy-report-only')}`]; });
probe('HP-02', 'CSP has a reporting endpoint (report-uri / report-to)', 'DG2', async () => { const r = await head(BASE, '/'); const c = h(r, 'content-security-policy') + ' ' + h(r, 'content-security-policy-report-only'); return [/report-(uri|to)/.test(c), 'no report-uri/report-to (D-TELEMETRY: not before the collector exists)']; });
probe('HP-03', "script-src has no 'unsafe-inline'", 'DG2', async () => { const r = await head(BASE, '/'); const c = h(r, 'content-security-policy') || h(r, 'content-security-policy-report-only'); const m = c.match(/script-src([^;]*)/); return [!!m && !/'unsafe-inline'/.test(m[1]), "script-src allows 'unsafe-inline' (inline scripts remain until the rebuild)"]; });
probe('HP-04', 'HSTS max-age >= 1 year, includeSubDomains, preload', 'legacy', async () => { const r = await head(BASE, '/'); const v = h(r, 'strict-transport-security'); const age = Number((v.match(/max-age=(\d+)/) || [])[1] || 0); return [age >= 31536000 && /includesubdomains/i.test(v) && /preload/i.test(v), v || 'no Strict-Transport-Security header']; });
probe('HP-05', 'nosniff + Referrer-Policy + Permissions-Policy on /', 'legacy', async () => { const r = await head(BASE, '/'); const ok = /nosniff/i.test(h(r, 'x-content-type-options')) && !!h(r, 'referrer-policy') && !!h(r, 'permissions-policy'); return [ok, `nosniff=${h(r, 'x-content-type-options') || '-'} referrer=${h(r, 'referrer-policy') || '-'} permissions=${h(r, 'permissions-policy') ? 'set' : '-'}`]; });
probe('HP-06', '/embed and /embed.html frameable cross-origin (no X-Frame-Options, frame-ancestors *); / and /privacy not frameable', 'R1c', async () => {
  const bad = [];
  for (const p of ['/embed', '/embed.html']) { const r = await head(BASE, p); if (r.status !== 200) bad.push(`${p} HTTP ${r.status}`); else if (!frameable(r)) bad.push(`${p} not frameable (xfo=${h(r, 'x-frame-options') || '-'} frame-ancestors=${frameAncestors(r) || '-'})`); }
  for (const p of ['/', '/privacy']) { const r = await head(BASE, p); if (!notFrameable(r)) bad.push(`${p} is frameable (xfo=${h(r, 'x-frame-options') || '-'} frame-ancestors=${frameAncestors(r) || '-'})`); }
  return [bad.length === 0, bad.join('; ') || 'embeds frameable, / and /privacy not'];
});
probe('HP-07', '/embed and /embed.html carry no site-wide report-only CSP', 'R1c', async () => { const bad = []; for (const p of ['/embed', '/embed.html']) { const r = await head(BASE, p); if (h(r, 'content-security-policy-report-only')) bad.push(p); } return [bad.length === 0, bad.length ? `report-only CSP still sent on ${bad.join(', ')}` : 'none']; });
probe('HP-08', '/sw.js is no-store', 'legacy', async () => { const r = await head(BASE, '/sw.js'); return [r.status === 200 && /no-store/.test(h(r, 'cache-control')), `HTTP ${r.status} cache-control: ${h(r, 'cache-control') || '-'}`]; });
probe('HP-09', 'entry, Help, Bookmarks and CSS assets exist and are immutable (names from /version.json; legacy entry before R0)', 'legacy', async () => {
  const v = await version(); const bad = [];
  for (const n of names(v)) { const r = await head(BASE, `/assets/${n}`); if (r.status !== 200) bad.push(`${n} HTTP ${r.status}`); else if (!isImmutable(h(r, 'cache-control'))) bad.push(`${n} cache-control ${h(r, 'cache-control') || '-'}`); }
  return [bad.length === 0, bad.join('; ') || names(v).join(', ')];
});
probe('HP-10', '/index.html answers 301 to /', 'S1', async () => { const r = await head(BASE, '/index.html'); return [r.status === 301, `HTTP ${r.status}${r.location ? ' -> ' + r.location : ''} (canonical forms are train S1; T0 changes no URL form)`]; });
probe('HP-11', '/x.html answers 301 to /x (search, dashboard, compare, camera)', 'S1', async () => { const out = []; let ok = true; for (const p of ['search', 'dashboard', 'compare', 'camera']) { const r = await head(BASE, `/${p}.html`); out.push(`${p}.html=${r.status}`); if (r.status !== 301) ok = false; } return [ok, out.join(' ')]; });
probe('HP-12', 'sitemap.xml lists /privacy and /terms', 'S1', async () => { const r = await get(BASE, '/sitemap.xml'); const t = r.body ? r.body.toString('utf8') : ''; return [r.status === 200 && /\/privacy/.test(t) && /\/terms/.test(t), `HTTP ${r.status}; privacy=${/\/privacy/.test(t)} terms=${/\/terms/.test(t)}`]; });
probe('HP-13a', 'scanner and config paths do not answer 200 (/.env /.git/config /wp-admin/install.php /xmlrpc.php /package.json /netlify.toml /_headers /_redirects)', 'legacy', async () => {
  const bad = []; for (const p of ['/.env', '/.git/config', '/wp-admin/install.php', '/xmlrpc.php', '/package.json', '/netlify.toml', '/_headers', '/_redirects']) { const r = await head(BASE, p); if (r.status === 200) bad.push(p); }
  return [bad.length === 0, bad.length ? `answers 200: ${bad.join(', ')}` : 'all 404'];
});
probe('HP-13b', 'developer pages are gone in both spellings (/diagnostics /diagnostics.html /unit-rendering-reference /unit-rendering-reference.html)', 'R1a', async () => {
  const bad = []; for (const p of ['/diagnostics', '/diagnostics.html', '/unit-rendering-reference', '/unit-rendering-reference.html']) { const r = await head(BASE, p); if (r.status !== 404 && r.status !== 410) bad.push(`${p}=${r.status}`); }
  return [bad.length === 0, bad.length ? bad.join(' ') : 'all 404'];
});
probe('HP-14', '/user-guide.pdf is application/pdf and an attachment', 'legacy', async () => { const r = await head(BASE, '/user-guide.pdf'); return [r.status === 200 && /application\/pdf/.test(h(r, 'content-type')) && /attachment/.test(h(r, 'content-disposition')), `HTTP ${r.status} ${h(r, 'content-type') || '-'} ${h(r, 'content-disposition') ? 'attachment' : 'no disposition'}`]; });
probe('HP-15', '/version.json exists, parses, has release/train/entry/help/bookmark/css, is not long-cached, and matches the expected release', 'R0', async () => {
  const v = await version(); if (!v.ok) return [false, `/version.json: ${v.why}`];
  const j = v.json; const miss = ['release', 'train', 'entry', 'help', 'bookmark', 'css'].filter((k) => !j[k]);
  const cc = h(v.res, 'cache-control'); const long = /max-age=(\d+)/.test(cc) && Number(cc.match(/max-age=(\d+)/)[1]) > 60 && !/no-cache/.test(cc);
  const why = []; if (miss.length) why.push(`missing ${miss.join(',')}`); if (long) why.push(`cache-control ${cc}`);
  if (EXPECT_RELEASE && j.release !== EXPECT_RELEASE) why.push(`release ${j.release} but expected ${EXPECT_RELEASE}${opt['expect-release'] ? '' : ' (last row of ops/RELEASE-LOG.md)'}`);
  if (TRAIN !== 'legacy' && j.train && !(TRAIN === j.train || (TRAIN === 'S1'))) why.push(`train ${j.train} but expectations are for ${TRAIN}`);
  return [why.length === 0, why.join('; ') || `release ${j.release}, train ${j.train}`];
});
probe('T0-01', `the default ${NETLIFY_APP_HOST.replace('https://', '')} host answers 301 to the primary domain`, 'R1c', async () => {
  const r = await head(NETLIFY_APP_HOST, '/'); return [r.status === 301 && /^https:\/\/gettysburginteractivemap\.com\//.test(r.location || ''), `HTTP ${r.status}${r.location ? ' -> ' + r.location : ''}`];
}, { onlyIf: () => /^https:\/\/gettysburginteractivemap\.com$/.test(BASE), skipWhy: 'only meaningful when --base is the production domain' });
probe('T0-02', 'Battlefield AR is hidden: /ar.html has noindex and sitemap.xml does not list it', 'R1a', async () => {
  const r = await get(BASE, '/ar.html'); const s = await get(BASE, '/sitemap.xml'); const t = r.body ? r.body.toString('utf8') : '';
  const noindex = /noindex/i.test(h(r, 'x-robots-tag')) || /<meta[^>]+name=["']robots["'][^>]*noindex/i.test(t);
  const inMap = /\/ar(\.html)?\s*</.test(s.body ? s.body.toString('utf8') : '');
  return [noindex && !inMap, `noindex=${noindex} inSitemap=${inMap}`];
}, { content: true });
probe('T0-03', 'sw.js is the no-skipWaiting worker (R0 mechanism) - or the kill switch with --kill', 'R0', async () => {
  const r = await get(BASE, '/sw.js'); const t = r.body ? r.body.toString('utf8') : '';
  if (r.status !== 200) return [false, `HTTP ${r.status}`];
  if (opt.kill) { const kill = fs.readFileSync(path.join(REPO, 'ops', 'sw-kill.js')); return [sha(r.body) === sha(kill), sha(r.body) === sha(kill) ? 'kill switch is live (identical to ops/sw-kill.js)' : 'sw.js is NOT ops/sw-kill.js']; }
  const noSkip = !/skipWaiting\s*\(/.test(t); const cache = /'gbg-r0-[0-9a-f]{8}'|"gbg-r0-[0-9a-f]{8}"/.test(t);
  return [noSkip && cache, `skipWaiting( absent=${noSkip}, cache name gbg-r0-<rid> present=${cache}`];
});
probe('T0-04', 'the kill switch is NOT publicly served (/_ops/sw-kill.js, /sw-kill.js answer 404) and ops/sw-kill.js exists to be deployed as /sw.js on demand (L2)', 'R0', async () => {
  const bad = []; for (const p of ['/_ops/sw-kill.js', '/sw-kill.js']) { const r = await head(BASE, p); if (r.status === 200) bad.push(`${p} answers 200`); }
  if (!fs.existsSync(path.join(REPO, 'ops', 'sw-kill.js'))) bad.push('ops/sw-kill.js is missing from the repository');
  return [bad.length === 0, bad.join('; ') || 'not served; ops/sw-kill.js present'];
});
probe('T0-05', 'index.html loads the entry named by /version.json and has no modulepreload', 'R0', async () => {
  const v = await version(); if (!v.ok) return [false, 'no /version.json to compare with'];
  const r = await get(BASE, '/'); const t = r.body ? r.body.toString('utf8') : '';
  return [r.status === 200 && t.includes(v.json.entry) && !/rel=["']?modulepreload/i.test(t), `entry named=${t.includes(v.json.entry)} modulepreload=${/modulepreload/i.test(t)}`];
}, { content: true });
probe('T0-06', 'staging is noindex, production is not (a staging copy must never go live)', 'legacy', async () => {
  const r = await head(BASE, '/'); const xr = h(r, 'x-robots-tag'); const noindex = /noindex/i.test(xr);
  return opt.staging ? [noindex, `x-robots-tag: ${xr || '(absent)'}`] : [!noindex, noindex ? `PRODUCTION SENDS x-robots-tag: ${xr} - the staging copy is live` : 'x-robots-tag absent'];
});
probe('T0-07', '/data/chronology_day1.json exists with max-age=3600 (data names never change in T0)', 'legacy', async () => { const r = await head(BASE, '/data/chronology_day1.json'); return [r.status === 200 && /max-age=3600/.test(h(r, 'cache-control')), `HTTP ${r.status} cache-control: ${h(r, 'cache-control') || '-'}`]; });
probe('T0-BYTES', 'served entry/chunks/css/sw.js/version.json are byte-identical to --dist', 'R0', async () => {
  const dist = path.resolve(REPO, opt.dist); const v = await version(); if (!v.ok) return [false, 'no /version.json'];
  const files = [...names(v).map((n) => `assets/${n}`), 'sw.js', 'version.json']; const bad = [];
  for (const f of files) { const local = path.join(dist, f); if (!fs.existsSync(local)) { bad.push(`${f} missing in --dist`); continue; } const r = await get(BASE, '/' + f); if (r.status !== 200) bad.push(`${f} HTTP ${r.status}`); else if (sha(r.body) !== sha(fs.readFileSync(local))) bad.push(`${f} differs`); }
  return [bad.length === 0, bad.join('; ') || `${files.length} files identical`];
}, { onlyIf: () => !!opt.dist, skipWhy: 'no --dist given' });
probe('T0-HTML', 'served index.html and privacy.html equal --dist after Netlify post-processing (RUM snippet, pretty-URL link rewrite): any other difference is content drift', 'R0', async () => {
  const dist = path.resolve(REPO, opt.dist);
  const { forwardModel } = await import(pathToFileURL(path.join(REPO, 'ops', 'sha-list.mjs')).href);
  const bad = [];
  for (const [url, file] of [['/', 'index.html'], ['/privacy', 'privacy.html']]) {
    const local = path.join(dist, file); if (!fs.existsSync(local)) { bad.push(`${file} missing in --dist`); continue; }
    const r = await get(BASE, url); if (r.status !== 200) { bad.push(`${url} HTTP ${r.status}`); continue; }
    const served = r.body.toString('utf8'); const rum = (/\n(<script async id="netlify-rum-container"[^>]*><\/script>)\n/.exec(served) || [])[1] || null;
    const src = fs.readFileSync(local, 'utf8');
    let want; try { want = forwardModel(src, rum); } catch (e) { bad.push(`${file}: model refused (${e.message.slice(0, 80)})`); continue; }
    // as uploaded (a site with all post-processing off, or a local emulator) OR exactly what the model says Netlify serves; nothing in between
    if (served !== src && served !== want) bad.push(`${url} differs from ${file} beyond post-processing (served ${Buffer.byteLength(served)} B, source ${Buffer.byteLength(src)} B, model ${Buffer.byteLength(want)} B)`);
  }
  return [bad.length === 0, bad.join('; ') || 'both pages equal the built files (as uploaded, or after the post-processing model)'];
}, { onlyIf: () => !!opt.dist, skipWhy: 'no --dist given', content: true });
probe('T0-08', 'fixed-name images (manifest screenshots, og card) revalidate and nothing outside /assets/ and /icons/ is immutable (manifest.json, favicon.ico included)', 'R1a', async () => {
  const bad = []; const seen = [];
  for (const [p, maxAge] of [['/screenshots/day1.png', 86400], ['/screenshots/day3.png', 86400], ['/og/card-r1.png', 86400], ['/manifest.json', 604800], ['/favicon.ico', 604800]]) {
    const r = await head(BASE, p);
    if (r.status !== 200) { bad.push(`${p} HTTP ${r.status}`); continue; }
    const cc = h(r, 'cache-control'); seen.push(`${p.split('/').pop()}=${cc || '(none)'}`);
    if (/immutable/.test(cc)) bad.push(`${p} is immutable (${cc})`);
    else if (Number((cc.match(/max-age=(\d+)/) || [])[1] || 0) > maxAge) bad.push(`${p} cache-control ${cc} (max ${maxAge} s)`);
  }
  return [bad.length === 0, bad.join('; ') || seen.join(' ')];
});

// ------------------------------------------------------------------ parity (staging vs production headers)
const PARITY_HEADERS = ['cache-control', 'content-type', 'content-disposition', 'x-frame-options', 'content-security-policy', 'content-security-policy-report-only', 'strict-transport-security', 'referrer-policy', 'permissions-policy', 'x-content-type-options', 'x-permitted-cross-domain-policies', 'x-robots-tag'];
// whitespace after , and ; and the case of content-type are formatting, not policy (matters only when one side is not Netlify, e.g. a local emulator)
const norm = (k, v) => (k === 'content-type' ? v.toLowerCase() : v).replace(/\s*,\s*/g, ',').replace(/;\s*/g, ';').trim();
async function parity(other) {
  const v = await version(); const ov = await memo('ov', async () => { const r = await http('GET', other + '/version.json', { wantBody: true }); try { return JSON.parse(r.body.toString('utf8')); } catch { return null; } });
  const entry = (v.ok && v.json.entry) || LEGACY_ENTRY; const oentry = (ov && ov.entry) || LEGACY_ENTRY;      // each site's own entry name: the two sites may serve different trains
  const paths = ['/', '/privacy', '/dashboard', '/embed', '/embed.html', '/sw.js', '/version.json', '/data/chronology_day1.json', '/manifest.json', '/robots.txt', '/sitemap.xml', '/user-guide.pdf', '/favicon.ico', '/icons.svg', '/site-nav.css'];
  const diffs = []; let n = 0;
  for (const p of paths.concat([`/assets/${entry}`])) {
    const a = await head(BASE, p); const b = p === `/assets/${entry}` ? await http('HEAD', other + `/assets/${oentry}`) : await http('HEAD', other + p);
    n++;
    if (p === '/version.json' && (a.status !== b.status)) continue;         // one side may run the legacy tree, which has none: not a header question
    if (a.status !== b.status) { diffs.push(`${p}: status ${a.status} vs ${b.status}`); continue; }
    for (const k of PARITY_HEADERS) {
      if (k === 'x-robots-tag' && opt['staging-vs']) continue;
      const x = h(a, k), y = h(b, k);
      if (norm(k, x) !== norm(k, y)) diffs.push(`${p}: ${k}: [${x || '-'}] vs [${y || '-'}]`);
    }
  }
  return { checked: n, diffs };
}

// ------------------------------------------------------------------ run
if (opt.list) { for (const p of P) console.log(`${p.id.padEnd(9)} from ${p.from.padEnd(6)} ${p.title}`); process.exit(0); }
const results = []; let fail = 0, known = 0, errors = 0, pass = 0, skip = 0;
console.log(`prod-probe: base ${BASE}  train ${TRAIN}${lastRow && !opt.train ? ` (from ops/RELEASE-LOG.md row ${lastRow.n}: ${lastRow.train} ${lastRow.rid})` : ''}${EXPECT_RELEASE ? `  expect-release ${EXPECT_RELEASE}` : ''}${opt.staging ? '  STAGING' : ''}${opt.kill ? '  KILL-SWITCH' : ''}`);
for (const p of P) {
  if (p.content && opt['no-content']) { results.push({ id: p.id, status: 'skip', detail: '--no-content' }); skip++; console.log(`SKIP  ${p.id}  ${p.title} (--no-content)`); continue; }
  if (p.onlyIf && !p.onlyIf()) { results.push({ id: p.id, status: 'skip', detail: p.skipWhy }); skip++; console.log(`SKIP  ${p.id}  ${p.title} (${p.skipWhy})`); continue; }
  let status, detail;
  try {
    const [ok, d] = await p.run(); detail = d;
    if (ok) { status = 'pass'; pass++; } else if (due(p.from)) { status = 'fail'; fail++; } else { status = 'known'; known++; }
  } catch (e) { status = 'error'; detail = e.message; errors++; }
  results.push({ id: p.id, title: p.title, status, from: p.from, detail });
  const tag = { pass: 'PASS ', fail: 'FAIL ', known: 'KNOWN', error: 'ERROR' }[status];
  const dueTxt = status === 'known' ? ` [red on purpose until ${p.from === 'DG2' ? 'CSP enforcement (DG-2, not in Tranche 0)' : 'train ' + p.from}]` : '';
  console.log(`${tag} ${p.id}  ${p.title}${status === 'pass' && !opt.verbose ? '' : `\n         ${detail}${dueTxt}`}`);
}

let parityRes = null;
if (opt.parity) {
  try {
    parityRes = await parity(opt.parity.replace(/\/+$/, ''));
    if (parityRes.diffs.length) { fail++; console.log(`FAIL  PARITY  header parity ${BASE} vs ${opt.parity}: ${parityRes.diffs.length} differences in ${parityRes.checked} URLs`); for (const d of parityRes.diffs) console.log(`         ${d}`); }
    else { pass++; console.log(`PASS  PARITY  ${parityRes.checked} representative URLs carry identical security/caching headers on both sites`); }
  } catch (e) { errors++; console.log(`ERROR PARITY  ${e.message}`); }
}

// ops/headers-probe.mjs (the infra agent's HP-01..15 + E-01..E-04 probe): integrated by file existence only.  Interface (read from its header comment):
//   node ops/headers-probe.mjs <base> --profile baseline|t0|s1|final [--expect-release <rid>]    exit 0 as expected, 1 unexpected FAIL, 2 could not run
// Its profiles say what each probe is EXPECTED to do.  Trains R0, R1a and R1b change no header on purpose, so they run against the recorded
// production BASELINE (a probe that passed on 2026-09-29 and now fails is a regression = unexpected FAIL); R1c uses profile t0 (the deferred
// CSP/URL rows are expected red), S1 uses s1.  It requests / with GET once, so --no-content skips it (scheduled runs).
let hp = null;
const hpOpt = opt['headers-probe'] || 'auto';
const hpFile = hpOpt === 'auto' ? path.join(REPO, 'ops', 'headers-probe.mjs') : (hpOpt === 'off' ? null : path.resolve(REPO, hpOpt));
if (hpFile && opt['no-content'] && hpOpt === 'auto') console.log('SKIP  HEADERS  ops/headers-probe.mjs (it fetches / with GET; --no-content)');
else if (hpFile && fs.existsSync(hpFile)) {
  const profile = { legacy: 'baseline', R0: 'baseline', R1a: 'baseline', R1b: 'baseline', R1c: 't0', S1: 's1' }[TRAIN];
  const r = spawnSync(process.execPath, [hpFile, BASE, '--profile', profile, ...(EXPECT_RELEASE ? ['--expect-release', EXPECT_RELEASE] : [])], { encoding: 'utf8', timeout: 180000 });
  const out = `${r.stdout || ''}${r.stderr || ''}`.trim();
  hp = { file: path.relative(REPO, hpFile), profile, exit: r.status, output: out.slice(-6000) };
  const st = r.status === 0 ? 'pass' : (r.status === 1 ? 'fail' : 'error');
  if (st === 'pass') pass++; else if (st === 'fail') fail++; else errors++;
  const lastLine = out.split('\n').filter(Boolean).slice(-1)[0] || '';
  console.log(`${st === 'pass' ? 'PASS ' : st === 'fail' ? 'FAIL ' : 'ERROR'} HEADERS  ${hp.file} --profile ${profile}: ${lastLine}${st === 'pass' && !opt.verbose ? '' : '\n' + out.split('\n').filter((l) => /UNEXPECTED|ERROR|^target|as expected/.test(l)).slice(-30).map((l) => '         ' + l).join('\n')}`);
} else console.log(`SKIP  HEADERS  ${hpFile ? path.relative(REPO, hpFile) + ' does not exist yet' : 'disabled'}`);

console.log(`\nsummary: ${pass} pass, ${fail} FAIL, ${known} known-red (not yet due), ${errors} error, ${skip} skipped  -> ${fail ? 'RED' : errors ? 'PROBE ERROR (not a verdict on the site)' : 'GREEN'}`);
const failing = results.filter((r) => r.status === 'fail' || r.status === 'error').map((r) => r.id).concat(parityRes && parityRes.diffs.length ? ['PARITY'] : [], hp && hp.exit !== 0 ? ['HEADERS'] : []);
const verdict = fail ? 'RED' : errors ? 'PROBE-ERROR' : 'GREEN';
if (opt.log) { fs.mkdirSync(path.dirname(path.resolve(opt.log)), { recursive: true }); fs.appendFileSync(opt.log, `${new Date().toISOString()}	${verdict}	${BASE}	train=${TRAIN}	pass=${pass} fail=${fail} known=${known} error=${errors} skip=${skip}	${failing.join(',')}
`); }
if (opt.json) { fs.mkdirSync(path.dirname(path.resolve(opt.json)), { recursive: true }); fs.writeFileSync(opt.json, JSON.stringify({ base: BASE, train: TRAIN, at: new Date().toISOString(), expectRelease: EXPECT_RELEASE, summary: { pass, fail, known, errors, skip }, results, parity: parityRes, headersProbe: hp }, null, 2) + '\n'); }
process.exit(fail ? 1 : errors ? 2 : 0);

#!/usr/bin/env node
// R1c config generator (chapter 02 WP-T0-15; docs/plan/specialists/infra-netlify.md appendix A/B, pages-C.md).
//
//   node tools/t0/config/gen.mjs <distPath> '<json>'      env T0_TRAIN=R1c   [T0_CONTEXT=production|staging]
//
// <json> = {"rid","entry","help","bookmark","css"} (file names inside dist/assets/).  build.py calls this after the page phase and the
// overlay; the hook may write ONLY _headers, _redirects, netlify.toml and _ops/** inside <distPath> (build.py fails otherwise).
// Deterministic (same dist + same JSON + same T0_CONTEXT -> same bytes); prints no secrets.
//
// What it writes
//   _headers      the ONLY place headers live.  Structure (the "one rule per header name per URL" invariant, proven before writing):
//                   /*                    only headers that are identical for every response and are never varied per path
//                                         (nosniff, Referrer-Policy, HSTS, X-Permitted-Cross-Domain-Policies; X-Robots-Tag in staging)
//                   one block per document path, BOTH spellings (/x and /x.html; / and /index.html)
//                                         Cache-Control, X-Frame-Options DENY, enforced CSP frame-ancestors 'none', Content-Security-Policy-
//                                         Report-Only (per-page origin list), Permissions-Policy (camera/geolocation/sensors only for /ar;
//                                         accelerometer + gyroscope also on / for the Street View frame only: ops/header-decisions.md)
//                   /embed and /embed.html  Cache-Control, CSP frame-ancestors *, Permissions-Policy; NO X-Frame-Options, NO Report-Only
//                   one block per remaining top-level directory (/assets/* ...) and per remaining root file: their cache class + X-Frame-Options
//                 Netlify cannot unset an inherited header, so X-Frame-Options can NOT sit in /* (the embed paths could never drop it);
//                 it is enumerated instead.  Unknown paths (the 404 page for a path nobody built) only get the /* set: documented gap.
//   _redirects    netlify.app host -> primary domain (301!, http and https), dev pages force-404 in both spellings, scanner-path 404s
//   netlify.toml  comments only: no header/redirect tables (Netlify does not document how toml rules combine with _headers)
//   _ops/config-manifest.json   what was classified how (no timestamps)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { parseHeadersFile, checkInvariant, parseRedirectsFile } from './lib.mjs';

// ---------------------------------------------------------------------------------------------------------------- constants
export const SITE = 'https://gettysburginteractivemap.com';
export const DUP_HOST = 'friendly-lolly-da85c0.netlify.app';
const RUM = 'https://ingesteer.services-prod.nsvcs.net';                 // Netlify RUM collector (Lighthouse inspector-issues named it)
const MAPBOX = { api: 'https://api.mapbox.com', events: 'https://events.mapbox.com' };
const PEER = { http: 'https://0.peerjs.com', ws: 'wss://0.peerjs.com', cdn: 'https://cdn.jsdelivr.net' };
const FRAMES_APP = ['https://www.google.com', 'https://www.nps.gov'];    // Street View embed + NPS video page, opened only on user action
const EMBED_ROUTES = ['embed'];                                          // frameable cross-origin (frame-ancestors *, no XFO)
const DEV_PAGES = ['diagnostics', 'unit-rendering-reference'];           // 404 in both spellings (WP-T0-12 deletes the files; the redirects are the safety net)
const SENSOR_PAGES = ['ar'];                                             // the only pages that use camera / geolocation / motion sensors

const HSTS = 'max-age=31536000; includeSubDomains; preload';             // unchanged
const HTML_CACHE = 'no-cache, must-revalidate';                          // unchanged (bfcache-friendly; was only on the /x.html spelling)
const CACHE_FILES = {                                                    // root files: cache class UNCHANGED from the legacy netlify.toml (+ version.json, new file)
  'favicon.ico': 'public, max-age=604800',
  'apple-touch-icon.png': 'public, max-age=604800',
  'robots.txt': 'public, max-age=86400',
  'sitemap.xml': 'public, max-age=86400',
  'manifest.json': 'public, max-age=3600',
  'sw.js': 'no-cache, no-store, must-revalidate',
  'version.json': 'no-cache',
};
const CACHE_DIRS = {
  assets: 'public, max-age=31536000, immutable',                         // hashed names only (the runner never reuses a name)
  data: 'public, max-age=3600',                                          // fixed names: T0 does not touch /data/*
  icons: 'public, max-age=86400',                                        // was immutable for a year on un-fingerprinted names (infra-netlify-13/24)
  screenshots: 'public, max-age=0, must-revalidate',                     // R1a replaces day1.png / day3.png UNDER THE SAME NAMES: revalidate every time (Netlify's default, now explicit)
  og: 'public, max-age=0, must-revalidate',                              // social cards under fixed names (/og/card-r1.png): crawlers and browsers revalidate
};
// directories whose files can be replaced under the SAME NAME (manifest screenshots, og/twitter images, icons): never immutable (release verifier 2026-09-30)
const FIXED_NAME_DIRS = ['screenshots', 'og', 'icons'];
for (const d of FIXED_NAME_DIRS) {
  const v = CACHE_DIRS[d] || '';
  const age = Number((/max-age=(\d+)/.exec(v) || [])[1] || 0);
  if (!v || /immutable/.test(v) || age > 86400) throw new Error(`fixed-name directory /${d}/ must have an explicit non-immutable cache class of at most one day, got ${v || '(none)'}`);
}
// written by build.py AFTER this hook (finalize): their rules are emitted whether or not the file exists yet
const BUILD_FILES = ['version.json'];
const BUILD_DIRS = ['_ops'];
const GUIDE = { 'user-guide.pdf': ['public, max-age=86400', 'attachment; filename="Gettysburg-Interactive-Map-User-Guide.pdf"'] };

const PP_OFF = 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=()';
const PP_SENSORS = 'accelerometer=(self), camera=(self), geolocation=(self), gyroscope=(self), magnetometer=(self), microphone=(), payment=()';
// The app page (/ and /index.html) hosts the Virtual Walkthrough's Google Street View iframe.  Chrome logs "Permissions policy violation: accelerometer is
// not allowed in this document" (+ a deviceorientation warning) from inside that frame unless BOTH the iframe has allow="accelerometer; gyroscope" (bundle patch
// tools/t0/patches/CP+walkthrough-sensors.json) AND this header names the frame's origin.  `self` must stay in the list (Chrome 153 refused the delegation with
// the Google origin alone).  magnetometer stays off: it was not needed (measured, ops/header-decisions.md section 2).  Only these two features, only this origin.
//
// The delegation is emitted whenever the entry bundle carries the allow attribute (the header then has something to back; without the attribute it would be inert)
// -- including the DEFAULT build, which does not contain the opt-in legal text: the Walkthrough must not log Google's accelerometer error (a requirement of the
// release-verifier follow-up, 2026-10-01).  The privacy page is kept honest in the other direction: if privacy.html SAYS the site lets that frame read the motion sensors (the
// opt-in PG-legal text does) but the bundle has no attribute, nothing is delegated and the generator warns; ops/legal-drafts/verify-facts.mjs fails such a tree.
// The baseline privacy text is silent about sensors (it says only that Google serves the Street View iframe and "we don't see anything from that embed ourselves",
// which stays true); that gap is an owner decision, ops/header-decisions.md sections 2 and 6.
const STREETVIEW_ORIGIN = 'https://www.google.com';
const SENSOR_ALLOW_ATTR = 'allow:"accelerometer; gyroscope"';             // what bundle patch cp:walkthrough-streetview-allow writes
const PP_APP = `accelerometer=(self "${STREETVIEW_ORIGIN}"), camera=(), geolocation=(), gyroscope=(self "${STREETVIEW_ORIGIN}"), magnetometer=(), microphone=(), payment=()`;
const APP_ROUTES = ['index'];                                            // documents that host the Walkthrough frame

// scanner-path 404 rules: the legacy toml's, minus /*.sql and /*.bak (a `*` is only valid at the END of a redirect path; they never matched)
const SCANNER = ['/wp-admin/*', '/wp-login.php', '/wp-content/*', '/xmlrpc.php', '/.env', '/.env.local', '/.env.production', '/.git/*', '/.htaccess',
  '/config.php', '/config.json', '/phpinfo.php', '/phpmyadmin/*', '/storage/*', '/vendor/*', '/package.json', '/package-lock.json'];

// ---------------------------------------------------------------------------------------------------------------- helpers
const posix = (p) => p.split(path.sep).join('/');
function walk(dir, base = dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, base, out); else out.push(posix(path.relative(base, p)));
  }
  return out;
}
const uniq = (a) => [...new Set(a)];
const originOf = (u) => { try { const x = new URL(u); return x.protocol === 'https:' || x.protocol === 'wss:' ? x.origin : null; } catch { return null; } };

/** absolute (https) origins named by resource-loading tags of a page; preconnect / canonical / icons / plain links are not loads */
function markupOrigins(html) {
  const o = { script: [], style: [], img: [], media: [], frame: [] };
  for (const m of html.matchAll(/<(script|link|img|iframe|source|video|audio)\b([^>]*)>/gi)) {
    const tag = m[1].toLowerCase(); const attrs = {};
    for (const a of m[2].matchAll(/([a-zA-Z:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) attrs[a[1].toLowerCase()] = a[2] ?? a[3] ?? a[4] ?? '';
    const url = attrs.src || (tag === 'link' && /(^|\s)stylesheet(\s|$)/i.test(attrs.rel || '') ? attrs.href : '');
    const org = url && /^https?:\/\//i.test(url) ? originOf(url) : null;
    if (!org) continue;
    if (tag === 'script') o.script.push(org); else if (tag === 'link') o.style.push(org); else if (tag === 'img') o.img.push(org);
    else if (tag === 'iframe') o.frame.push(org); else o.media.push(org);
  }
  return o;
}

/** feature set of one document -> {klass, script, style, img, font, connect, frame, media, mapbox} */
function features(route, html) {
  const m = markupOrigins(html);
  const isApp = route === '/';
  const mapbox = isApp || /\bmapboxgl\b|mapbox-gl/i.test(html);
  const peer = /peerjs/i.test(html);
  const f = { klass: isApp ? 'app' : peer ? 'peer' : mapbox ? 'map' : 'static', mapbox,
    script: [...m.script], style: [...m.style], img: [...m.img], font: [], connect: [], frame: [...m.frame], media: [...m.media] };
  if (mapbox) { f.connect.push(MAPBOX.api, MAPBOX.events); f.img.push(MAPBOX.api); }
  if (peer) { f.connect.push(PEER.http, PEER.ws); f.script.push(PEER.cdn); }
  if (isApp) f.frame.push(...FRAMES_APP);
  for (const k of ['script', 'style', 'img', 'font', 'connect', 'frame', 'media']) f[k] = uniq(f[k]);
  return f;
}

/** Content-Security-Policy-Report-Only for a document.  REPORT-ONLY, no report-uri / report-to (no collector exists yet: D-TELEMETRY). */
function cspReportOnly(f) {
  const d = [
    ['default-src', ["'self'"]],
    ['script-src', ["'self'", "'unsafe-inline'", ...f.script]],
    ['style-src', ["'self'", "'unsafe-inline'", ...f.style]],
    ['img-src', ["'self'", 'data:', 'blob:', ...f.img]],
    ['font-src', ["'self'", ...f.font]],
    ['connect-src', ["'self'", RUM, ...f.connect]],
    ...(f.frame.length ? [['frame-src', f.frame]] : []),
    ['worker-src', ["'self'", 'blob:']],
    ...(f.mapbox ? [['child-src', ["'self'", 'blob:']]] : []),
    ['media-src', ["'self'", 'blob:', ...f.media]],
    ['object-src', ["'none'"]],
    ['base-uri', ["'self'"]],
  ];
  return d.map(([k, v]) => `${k} ${v.join(' ')}`).join('; ');
}

const block = (p, headers) => `${p}\n${headers.map(([k, v]) => `  ${k}: ${v}`).join('\n')}\n`;

// ---------------------------------------------------------------------------------------------------------------- main
export function generate(dist, rel, { context = 'production' } = {}) {
  const files = walk(dist).filter((f) => !['_headers', '_redirects', 'netlify.toml'].includes(f));
  const warnings = [];
  const docs = [], rootFiles = [], dirs = new Map();
  for (const f of files) {
    const seg = f.split('/');
    if (seg.length === 1) { (f.endsWith('.html') ? docs : rootFiles).push(f); }
    else { if (f.endsWith('.html')) throw new Error(`nested HTML document ${f}: add an explicit document rule (a directory rule would set X-Frame-Options twice)`); dirs.set(seg[0], (dirs.get(seg[0]) || 0) + 1); }
  }

  for (const f of BUILD_FILES) if (!rootFiles.includes(f)) rootFiles.push(f);
  for (const d of BUILD_DIRS) if (!dirs.has(d)) dirs.set(d, 0);

  // ---- documents (both spellings)
  const docRoutes = [];                                  // {file, routes:[...], name, klass}
  for (const f of docs) {
    const name = f.replace(/\.html$/, '');
    if (DEV_PAGES.includes(name)) { warnings.push(`${f} is still in dist: it is served 404 by _redirects (force) but WP-T0-12 should delete it`); continue; }
    docRoutes.push({ file: f, name, routes: f === 'index.html' ? ['/', '/index.html'] : [`/${name}`, `/${name}.html`] });
  }
  docRoutes.sort((a, b) => (a.file === 'index.html' ? -1 : b.file === 'index.html' ? 1 : a.file < b.file ? -1 : 1));

  // ---- Street View sensor delegation: on whenever the bundle carries the allow attribute (it backs the header); privacy.html's wording is cross-checked, not required
  let appPP = PP_OFF; let appPerm = 'off';
  {
    const readIf = (f) => { try { return fs.readFileSync(path.join(dist, f), 'utf8'); } catch { return ''; } };
    const hasAttr = !!rel.entry && readIf(`assets/${rel.entry}`).includes(SENSOR_ALLOW_ATTR);
    const privacyText = readIf('privacy.html').replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style)[\s\S]*?<\/\1>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const discloses = /allows that frame[^.]*motion sensors/i.test(privacyText);
    if (hasAttr) {
      appPP = PP_APP; appPerm = 'streetview-frame';
      if (!discloses) warnings.push('the Street View frame is allowed to read the device motion sensors (iframe allow="accelerometer; gyroscope" + Permissions-Policy of / naming https://www.google.com) but privacy.html does not say so: the baseline text is silent, the opt-in legal text (--with PG-legal) discloses it; owner decision, ops/header-decisions.md section 6');
    } else if (discloses) warnings.push('privacy.html discloses a Street View motion-sensor delegation but the entry bundle has no allow attribute (CP+walkthrough-sensors.json): nothing is delegated, so the statement is untrue (verify-facts fails this tree)');
  }

  // The configuration files of trains after R1c carry no generator or tool name in their comments (the release copy audit); R0..R1c keep their wording byte for byte (reproducible builds)
  const NEUTRAL = !['R0', 'R1a', 'R1b', 'R1c'].includes(process.env.T0_TRAIN || 'R1c');
  const sections = [];
  const contextLine = context === 'production' ? '' : ['X-Robots-Tag', 'noindex, nofollow'];
  sections.push(
    (NEUTRAL ? `# Release ${rel.rid} (${process.env.T0_TRAIN}, ${context}).\n` : `# Generated by tools/t0/config/gen.mjs for release ${rel.rid} (train ${process.env.T0_TRAIN || 'R1c'}, context ${context}).  DO NOT EDIT.\n`) +
    '# Invariant: for any URL each header NAME is produced by at most ONE matching rule (Netlify documents neither how same-name rules merge nor\n' +
    '# how to unset an inherited header).  That is why X-Frame-Options / CSP / Permissions-Policy are NOT in /* : the embed paths could never drop them.\n' +
    '# Referrer-Policy must stay strict-origin-when-cross-origin: the Mapbox token restriction and the Google key restriction need the Referer.\n',
    block('/*', [
      ['X-Content-Type-Options', 'nosniff'],
      ['Referrer-Policy', 'strict-origin-when-cross-origin'],
      ['Strict-Transport-Security', HSTS],
      ['X-Permitted-Cross-Domain-Policies', 'none'],
      ...(contextLine ? [contextLine] : []),
    ]),
  );

  const manifest = { ...(NEUTRAL ? {} : { generator: 'tools/t0/config/gen.mjs' }), release: rel.rid, context, documents: [], groups: [], files: [], embed: EMBED_ROUTES.map((r) => `/${r}`) };
  sections.push('# ---- documents: one block per path, both spellings (/x and /x.html)\n');
  for (const d of docRoutes) {
    const html = fs.readFileSync(path.join(dist, d.file), 'utf8');
    const embed = EMBED_ROUTES.includes(d.name);
    const f = features(d.routes[0], html);
    const pp = SENSOR_PAGES.includes(d.name) ? PP_SENSORS : APP_ROUTES.includes(d.name) ? appPP : PP_OFF;
    for (const route of d.routes) {
      sections.push(block(route, embed
        ? [['Cache-Control', HTML_CACHE], ['Content-Security-Policy', 'frame-ancestors *'], ['Permissions-Policy', pp]]
        : [['Cache-Control', HTML_CACHE], ['X-Frame-Options', 'DENY'], ['Content-Security-Policy', "frame-ancestors 'none'"],
          ['Content-Security-Policy-Report-Only', cspReportOnly(f)], ['Permissions-Policy', pp]]));
    }
    manifest.documents.push({ file: d.file, routes: d.routes, class: embed ? 'embed' : f.klass, permissions: SENSOR_PAGES.includes(d.name) ? 'sensors' : APP_ROUTES.includes(d.name) ? appPerm : 'off' });
  }

  // ---- resource groups
  sections.push('# ---- directories and root files: cache class (unchanged except /icons/*) + X-Frame-Options (kept everywhere except the embed paths)\n');
  for (const dname of [...dirs.keys()].sort()) {
    const h = [];
    if (CACHE_DIRS[dname]) h.push(['Cache-Control', CACHE_DIRS[dname]]);
    h.push(['X-Frame-Options', 'DENY']);
    sections.push(block(`/${dname}/*`, h));
    manifest.groups.push({ path: `/${dname}/*`, cache: CACHE_DIRS[dname] || null });
  }
  for (const f of rootFiles.sort()) {
    const h = [];
    if (GUIDE[f]) h.push(['Cache-Control', GUIDE[f][0]], ['Content-Disposition', GUIDE[f][1]]);
    else if (CACHE_FILES[f]) h.push(['Cache-Control', CACHE_FILES[f]]);
    h.push(['X-Frame-Options', 'DENY']);
    sections.push(block(`/${f}`, h));
    manifest.files.push({ path: `/${f}`, cache: (GUIDE[f] || [CACHE_FILES[f]])[0] || null });
  }
  const headersText = sections.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';

  // ---- prove the invariant on the text we are about to write
  const parsed = parseHeadersFile(headersText);
  const testPaths = [];
  for (const d of docRoutes) testPaths.push(...d.routes);
  for (const f of rootFiles) testPaths.push(`/${f}`);
  for (const f of files) if (f.includes('/')) testPaths.push(`/${f}`);
  for (const d of BUILD_DIRS) testPaths.push(`/${d}/asset-manifest.json`);
  const enumerated = uniq(testPaths);
  const problems = checkInvariant(parsed, [...enumerated, '/definitely-not-a-page', '/wp-admin/x'], {
    isEmbed: (p) => EMBED_ROUTES.some((r) => p === `/${r}` || p === `/${r}.html`), enumerated });
  if (problems.length) throw new Error(`header invariant violated:\n  ${problems.join('\n  ')}`);
  const longest = Math.max(...headersText.split('\n').map((l) => l.length));
  if (longest > 1500) throw new Error(`a _headers line is ${longest} characters long (unverified Netlify limit: keep lines short)`);

  // ---- redirects
  const redirects = [
    NEUTRAL ? '# First matching rule wins; `!` = force (applies even when a file exists at the path).' : '# Generated by tools/t0/config/gen.mjs.  DO NOT EDIT.  First matching rule wins; `!` = force (applies even when a file exists at the path).',
    '# Query strings are forwarded automatically on 301.  `*` is only valid at the END of a path in a redirect rule.',
    '',
    '# Duplicate host -> primary domain (D-NETLIFY-DOMAIN).  Host-based rules only match hostnames assigned to this site; deploy-preview and branch',
    '# hosts (deploy-preview-N--<site>.netlify.app) are different hostnames and keep serving.  Set the primary-domain option in the dashboard first.',
    `https://${DUP_HOST}/*  ${SITE}/:splat  301!`,
    `http://${DUP_HOST}/*  ${SITE}/:splat  301!`,
    '',
    '# Developer pages: 404 in BOTH spellings, forced (a file at the path would otherwise win).  WP-T0-12 also deletes the two files.',
    ...DEV_PAGES.flatMap((p) => [`/${p}  /404  404!`, `/${p}.html  /404  404!`]),
    '',
    '# Scanner probes (unchanged from the legacy netlify.toml; /*.sql and /*.bak dropped: not valid redirect patterns and they never matched).',
    ...SCANNER.map((p) => `${p}  /404  404`),
  ].join('\n') + '\n';
  parseRedirectsFile(redirects);                                          // must parse

  const toml = [
    NEUTRAL ? `# Release ${rel.rid}.` : `# Generated by tools/t0/config/gen.mjs for release ${rel.rid}.  DO NOT EDIT.`,
    '# All headers live in _headers and all redirects in _redirects, generated together so that no header name is set by two rules.',
    '# Do NOT add header or redirect tables (the toml array-of-tables form) here or in a repo-root netlify.toml: Netlify does not document how they combine with _headers.',
    '# Deploy-preview noindex cannot be set per context in netlify.toml (Netlify: headers are global); a staging/preview tree is built with',
    '# T0_CONTEXT=staging, which adds X-Robots-Tag: noindex, nofollow to the /* block of _headers.',
    '',
  ].join('\n');

  manifest.counts = { documents: docRoutes.length, headerBlocks: parsed.length, redirects: parseRedirectsFile(redirects).length };
  manifest.sha256 = { _headers: sha(headersText), _redirects: sha(redirects) };
  manifest.warnings = warnings;
  return { headersText, redirects, toml, manifest, warnings };
}
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

// ---------------------------------------------------------------------------------------------------------------- CLI (build hook)
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const [dist, json] = process.argv.slice(2);
  if (!dist || !fs.existsSync(dist)) { console.error('gen.mjs: dist path missing'); process.exit(2); }
  let rel;
  try { rel = JSON.parse(json || '{}'); } catch { console.error('gen.mjs: release JSON is not valid JSON'); process.exit(2); }
  if (!rel.rid) { console.error('gen.mjs: release JSON missing rid'); process.exit(2); }
  const context = process.env.T0_CONTEXT || 'production';
  if (!['production', 'staging'].includes(context)) { console.error(`gen.mjs: T0_CONTEXT must be production|staging, got ${context}`); process.exit(2); }
  try {
    const out = generate(dist, rel, { context });
    fs.writeFileSync(path.join(dist, '_headers'), out.headersText);
    fs.writeFileSync(path.join(dist, '_redirects'), out.redirects);
    fs.writeFileSync(path.join(dist, 'netlify.toml'), out.toml);
    fs.mkdirSync(path.join(dist, '_ops'), { recursive: true });
    fs.writeFileSync(path.join(dist, '_ops', 'config-manifest.json'), JSON.stringify(out.manifest, null, 2) + '\n');
    for (const w of out.warnings) console.log(`warning: ${w}`);
    console.log(`config: ${out.manifest.counts.documents} documents, ${out.manifest.counts.headerBlocks} header blocks, ${out.manifest.counts.redirects} redirects (${context}, rid ${rel.rid})`);
  } catch (e) {
    console.error(`gen.mjs FAILED: ${e.message}`);
    process.exit(1);
  }
}

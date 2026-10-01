// WP-T0-15 acceptance: the R1c generated config (_headers / _redirects / netlify.toml) -- rules, probes, real-browser framing and CSP.
//
//   node tests/t0/headers.spec.mjs                       builds R1c into tmp/infra-config/R1c (python tools/t0/build.py) and tests it
//   node tests/t0/headers.spec.mjs --dist <dist>         any built tree that ran the config hook (e.g. release/R1c/dist)
//   node tests/t0/headers.spec.mjs --no-browser          rule/probe tests only (no Chrome, no Mapbox requests)
//   node tests/t0/headers.spec.mjs --online              also HDR-23: the Virtual Walkthrough's REAL Google Street View frame (loads www.google.com; skipped otherwise)
//   node tests/t0/headers.spec.mjs --filter 'HDR-0[1-5]' subset by id regex
// Ports: T0_PORT_BASE (default 8420 here) = the emulated site, +1 = Chrome CDP, +2 = the cross-origin "framer" page.
// Mapbox: only through the harness (production Referer injected, capped: T0_TILE_CAP, default 150 here); pages that need no tiles run with tiles blocked.
// Honesty: this proves the generated RULES and that Chrome honours the resulting headers; it cannot prove Netlify's own matching/merge semantics
// (those are only documented in part) -- that needs a deploy to gbg-staging and `node ops/headers-probe.mjs https://<staging>`.
process.env.T0_AGENT ||= 'infra-config';
process.env.T0_PORT_BASE ||= '8420';
process.env.T0_TILE_CAP ||= '150';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const lib = await import('./lib.mjs');
const { REPO, PORT_BASE, openSession, createSuite, assert, assertEq, sleep, waitFor, waitForApp, chooseLayout, cdpFor, tileBudget, Skip } = lib;
const cfgLib = await import(pathToFileURL(path.join(REPO, 'tools/t0/config/lib.mjs')).href);
const { loadDistConfig, resolveHeaders, checkInvariant, parseHeadersFile, parseRedirectsFile, parseNetlifyToml, findRedirect } = cfgLib;
const { generate } = await import(pathToFileURL(path.join(REPO, 'tools/t0/config/gen.mjs')).href);
const { createEmulator } = await import(pathToFileURL(path.join(REPO, 'tools/t0/config/emulate.mjs')).href);

const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : dflt; };
const OUT = path.join(REPO, 'tmp', process.env.T0_AGENT);          // default tmp/infra-config; set T0_AGENT to run in your own scratch folder
let DIST = opt('dist', null);
const FILTER = opt('filter', null);
const NO_BROWSER = !!opt('no-browser', false);
const ONLINE = !!opt('online', false);
const LEGACY = path.join(REPO, 'legacy', 'dist');

if (!DIST) {
  DIST = path.join(OUT, 'R1c', 'dist');
  console.log(`building R1c into ${path.relative(REPO, OUT).split(path.sep).join('/')}/R1c ...`);
  const b = spawnSync('python', ['tools/t0/build.py', '--train', 'R1c', '--with', 'PG-legal', '--out', `${path.relative(REPO, OUT).split(path.sep).join('/')}/R1c`], { cwd: REPO, encoding: 'utf8' });
  if (b.status !== 0) { console.error(b.stdout.slice(-3000), b.stderr.slice(-2000)); console.error('build failed'); process.exit(2); }
  console.log(b.stdout.split('\n').filter((l) => /^(OK|config hook|deleted|tree sha256)/.test(l)).join('\n'));
} else DIST = path.resolve(REPO, String(DIST));
const read = (p) => fs.readFileSync(p, 'utf8');
if (!fs.existsSync(path.join(DIST, '_headers'))) { console.error(`${DIST} has no _headers: it was not built with the R1c config hook`); process.exit(2); }

const VERSION = JSON.parse(read(path.join(DIST, 'version.json')));
const MANIFEST = JSON.parse(read(path.join(DIST, '_ops', 'config-manifest.json')));
const CFG = loadDistConfig(DIST);
const LEG = loadDistConfig(LEGACY);
const embedPaths = ['/embed', '/embed.html'];
// The Street View sensor delegation exists only when the bundle carries the allow attribute AND privacy.html discloses it (gen.mjs); the tests below
// recompute that rule independently.  The default spec build includes the opt-in legal text (--with PG-legal) so the delegation is exercised.
const APP_DOC = MANIFEST.documents.find((d) => d.file === 'index.html');
const DELEGATED = APP_DOC.permissions === 'streetview-frame';
const ENTRY_TEXT = read(path.join(DIST, 'assets', VERSION.entry));
const PRIVACY_TEXT = fs.existsSync(path.join(DIST, 'privacy.html')) ? read(path.join(DIST, 'privacy.html')).replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style)[\s\S]*?<\/\1>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ') : '';
const HAS_ATTR = ENTRY_TEXT.includes('allow:"accelerometer; gyroscope"');
const DISCLOSED = /allows that frame[^.]*motion sensors/i.test(PRIVACY_TEXT);
const docRoutes = MANIFEST.documents.flatMap((d) => d.routes);
const walk = (dir, base = dir, out = []) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) walk(p, base, out); else out.push(path.relative(base, p).split(path.sep).join('/')); } return out; };
const ALL_FILES = walk(DIST).filter((f) => !['_headers', '_redirects', 'netlify.toml'].includes(f));
const H = (rules, p) => { const { headers } = resolveHeaders(rules, p); return Object.fromEntries([...headers].map(([k, v]) => [k, v.value])); };
const hdr = (p) => H(CFG.headerRules, p);
const dirOf = (policy, name) => { const d = (policy || '').split(';').map((s) => s.trim()).find((s) => s.split(/\s+/)[0] === name); return d ? d.split(/\s+/).slice(1) : null; };

const suite = createSuite('headers');
const sessions = [];

// ==================================================================================================================== rules (no browser)
suite.test('HDR-01', 'config files present; netlify.toml carries no [[headers]]/[[redirects]]; only allowed outputs differ from a run without the hook', async (t) => {
  assert(CFG.sources._headers && CFG.sources._redirects && CFG.sources['netlify.toml'], 'a config file is missing');
  const toml = read(path.join(DIST, 'netlify.toml')).split(/\r?\n/).filter((l) => !l.trim().startsWith('#')).join(' ');      // comments do not count
  assert(!/\[\[\s*(headers|redirects)\s*\]\]/.test(toml), 'netlify.toml still has [[headers]]/[[redirects]] (Netlify does not document how they combine with _headers)');
  assertEq(CFG.toml.headers.length + CFG.toml.redirects.length, 0, 'toml rules');
  assert(!/publish\s*=\s*"\."/.test(toml), 'toml publishes "."');
  // the hook writes only _headers, _redirects, netlify.toml, _ops/config-manifest.json
  const tmp = path.join(OUT, 'hook-copy'); fs.rmSync(tmp, { recursive: true, force: true }); fs.cpSync(DIST, tmp, { recursive: true });
  for (const f of ['_headers', '_redirects', 'netlify.toml', '_ops/config-manifest.json']) fs.rmSync(path.join(tmp, f), { force: true });
  const before = new Set(walk(tmp));
  const r = spawnSync('node', [path.join(REPO, 'tools/t0/config/gen.mjs'), tmp, JSON.stringify({ rid: VERSION.release, entry: VERSION.entry, help: VERSION.help, bookmark: VERSION.bookmark, css: VERSION.css })], { encoding: 'utf8' });
  assertEq(r.status, 0, `hook exit (${r.stderr})`);
  const added = walk(tmp).filter((f) => !before.has(f)).sort();
  assertEq(added, ['_headers', '_ops/config-manifest.json', '_redirects', 'netlify.toml'], 'files written by the hook');
  for (const f of ['_headers', '_redirects', 'netlify.toml', '_ops/config-manifest.json']) assertEq(read(path.join(tmp, f)) === read(path.join(DIST, f)), true, `${f} differs from the built tree (non-deterministic or stale build)`);
  // second run over its own output: identical bytes (deterministic, idempotent)
  const r2 = spawnSync('node', [path.join(REPO, 'tools/t0/config/gen.mjs'), tmp, JSON.stringify({ rid: VERSION.release, entry: VERSION.entry, help: VERSION.help, bookmark: VERSION.bookmark, css: VERSION.css })], { encoding: 'utf8' });
  assertEq(r2.status, 0, 'hook re-run');
  for (const f of ['_headers', '_redirects', 'netlify.toml']) assertEq(read(path.join(tmp, f)) === read(path.join(DIST, f)), true, `${f} not idempotent`);
  t.note('files', added.join(' '));
  fs.rmSync(tmp, { recursive: true, force: true });
});

suite.test('HDR-02', 'one rule per header name per URL: every dist path in both spellings + synthetic unknown paths', async (t) => {
  const paths = new Set(['/nope', '/wp-admin/x', '/.env']);
  for (const f of ALL_FILES) { paths.add(`/${f}`); if (f.endsWith('.html')) { paths.add(`/${f.replace(/\.html$/, '')}`); if (f === 'index.html') paths.add('/'); } }
  for (const r of docRoutes) paths.add(r);
  const enumerated = [...paths].filter((p) => !['/nope', '/wp-admin/x', '/.env'].includes(p) && !p.endsWith('/index'));
  const problems = checkInvariant(CFG.headerRules, [...paths], { isEmbed: (p) => embedPaths.includes(p), enumerated });
  assertEq(problems, [], 'invariant');
  // every rule pattern is one of: /*, an exact path, or /dir/* (no other overlap shapes)
  const shapes = CFG.headerRules.map((r) => r.path).filter((p) => p !== '/*' && p.includes('*') && !/^\/[^*/]+\/\*$/.test(p));
  assertEq(shapes, [], 'unexpected wildcard shapes');
  // negative control: the legacy toml violates the invariant on /embed.html (this is the bug being fixed)
  const legacy = checkInvariant(LEG.headerRules, ['/embed.html'], { isEmbed: (p) => embedPaths.includes(p) });
  assert(legacy.length > 0, 'the legacy toml should violate the invariant on /embed.html (control)');
  t.note('paths checked', paths.size); t.note('rules', CFG.headerRules.length); t.note('legacy /embed.html violations', legacy.length);
});

suite.test('HDR-03', '/embed and /embed.html: no X-Frame-Options, frame-ancestors *, no Report-Only; every other enumerated path keeps X-Frame-Options DENY', async (t) => {
  for (const p of embedPaths) {
    const h = hdr(p);
    assert(!('x-frame-options' in h), `${p} has X-Frame-Options`);
    assert(!('content-security-policy-report-only' in h), `${p} has Report-Only`);
    assertEq(h['content-security-policy'], 'frame-ancestors *', `${p} CSP`);
  }
  let n = 0;
  for (const f of ALL_FILES) {
    const routes = f.endsWith('.html') ? (f === 'index.html' ? ['/', '/index.html'] : [`/${f.replace(/\.html$/, '')}`, `/${f}`]) : [`/${f}`];
    for (const p of routes) {
      if (embedPaths.includes(p)) continue; n++;
      const h = hdr(p);
      assertEq(h['x-frame-options'], 'DENY', `${p} X-Frame-Options`);
      if (f.endsWith('.html')) assertEq(h['content-security-policy'], "frame-ancestors 'none'", `${p} enforced CSP`);
    }
  }
  t.note('non-embed paths checked', n);
});

suite.test('HDR-04', 'caching classes unchanged vs the legacy netlify.toml, except /icons/* (1 day, no immutable); HTML clean URLs get the .html class; version.json no-cache', async (t) => {
  const cc = (cfg, p) => H(cfg.headerRules, p)['cache-control'] || 'DEFAULT';
  const entry = `/assets/${VERSION.entry}`;
  const same = [entry, '/data/chronology_day1.json', '/data/oob/x.json', '/favicon.ico', '/apple-touch-icon.png', '/robots.txt', '/sitemap.xml', '/manifest.json', '/sw.js', '/user-guide.pdf', '/dashboard.html', '/privacy.html', '/index.html', '/embed.html', '/404.html'];
  const norm = (s) => s.replace(/,\s*/g, ',');
  const diff = same.filter((p) => norm(cc(LEG, p)) !== norm(cc(CFG, p))).map((p) => `${p}: legacy ${cc(LEG, p)} -> ${cc(CFG, p)}`);
  assertEq(diff, [], 'cache-control drift');
  // clean spellings: legacy fell to Netlify's default (max-age=0, must-revalidate); now the same class as .html
  for (const p of ['/', '/dashboard', '/privacy', '/embed']) assertEq(norm(cc(CFG, p)), 'no-cache,must-revalidate', `${p} cache-control`);
  // icons: the one intended change
  const ic = cc(CFG, '/icons/icon-192.png'); assertEq(ic, 'public, max-age=86400', 'icons'); assert(!/immutable/.test(ic));
  assert(/immutable/.test(cc(LEG, '/icons/icon-192.png')), 'control: legacy icons were immutable');
  assertEq(cc(CFG, '/version.json'), 'no-cache', 'version.json');
  assertEq(hdr('/user-guide.pdf')['content-disposition'], 'attachment; filename="Gettysburg-Interactive-Map-User-Guide.pdf"', 'guide disposition');
  const univ = ['strict-transport-security', 'x-content-type-options', 'referrer-policy', 'x-permitted-cross-domain-policies'];
  for (const p of ['/', '/embed', '/assets/x.js', '/nope']) for (const k of univ) assertEq(H(CFG.headerRules, p)[k], H(LEG.headerRules, p)[k], `${p} ${k} vs legacy`);
  t.note('legacy-equal paths', same.length);
});

suite.test('HDR-05', 'redirects: netlify.app 301! (http+https), dev pages forced 404 in both spellings, every valid legacy scanner rule kept', async (t) => {
  const R = CFG.redirectRules;
  const dup = 'friendly-lolly-da85c0.netlify.app';
  for (const scheme of ['https', 'http']) {
    const rule = R.find((r) => r.host === dup && r.scheme === scheme);
    assert(rule, `no ${scheme} host rule`);
    assertEq([rule.to, rule.status, rule.force], ['https://gettysburginteractivemap.com/:splat', 301, true], `${scheme} host rule`);
    const hit = findRedirect(R, { scheme, host: dup, path: '/historian', fileExists: true });
    assertEq([hit.to, hit.status], ['https://gettysburginteractivemap.com/historian', 301], `${scheme} resolves`);
  }
  assertEq(findRedirect(R, { scheme: 'https', host: `deploy-preview-3--${dup}`, path: '/historian', fileExists: true }), null, 'deploy-preview host must not redirect');
  assertEq(findRedirect(R, { scheme: 'https', host: 'gettysburginteractivemap.com', path: '/historian', fileExists: true }), null, 'primary host must not redirect');
  for (const p of ['/diagnostics', '/diagnostics.html', '/unit-rendering-reference', '/unit-rendering-reference.html']) {
    const hit = findRedirect(R, { scheme: 'https', host: 'gettysburginteractivemap.com', path: p, fileExists: true });      // fileExists: force must still win
    assertEq([hit && hit.status, hit && hit.force], [404, true], `${p} forced 404`);
  }
  const legacy404 = LEG.redirectRules.filter((r) => r.to === '/404' && r.status === 404 && !/\.(sql|bak)$/.test(r.from) && !/^\/diagnostics/.test(r.from));
  const missing = legacy404.filter((l) => !R.some((r) => r.from === l.from && r.to === '/404' && r.status === 404 && !r.force));
  assertEq(missing.map((r) => r.from), [], 'scanner rules dropped');
  const dropped = LEG.redirectRules.filter((r) => /\.(sql|bak)$/.test(r.from)).map((r) => r.from).sort();
  assertEq(dropped, ['/*.bak', '/*.sql'], 'the two invalid mid-splat rules are the only ones not carried over');
  for (const r of R) if (r.fromPath.includes('*')) assert(r.fromPath.endsWith('/*'), `redirect ${r.from}: * only valid at the end of a path`);
  t.note('legacy scanner rules kept', legacy404.length); t.note('redirect rules', R.length);
});

suite.test('HDR-06', 'CSP Report-Only: full origin list, still report-only, no report endpoint, per-page markup origins covered', async (t) => {
  const all = read(path.join(DIST, '_headers'));
  assert(!/report-uri|report-to|Reporting-Endpoints/i.test(all), 'a report endpoint was invented (none exists yet: D-TELEMETRY)');
  const RUM = 'https://ingesteer.services-prod.nsvcs.net';
  const seen = new Set();
  for (const d of MANIFEST.documents) {
    const embed = d.class === 'embed';
    for (const route of d.routes) {
      const h = hdr(route); const ro = h['content-security-policy-report-only'];
      if (embed) { assert(!ro, `${route} has Report-Only`); continue; }
      assert(ro, `${route} has no Report-Only`);
      assert(dirOf(ro, 'connect-src').includes(RUM), `${route} connect-src lacks the RUM host`);
      assert(!/(^|;)\s*(script-src|default-src)[^;]*\*/.test(ro), `${route} has a wildcard source`);
      assertEq(h['content-security-policy'], "frame-ancestors 'none'", `${route} enforced CSP must stay frame-ancestors only`);
      seen.add(route);
    }
    // independent origin lint of the page markup
    if (d.class === 'embed') continue;
    const html = read(path.join(DIST, d.file)); const ro = hdr(d.routes[0])['content-security-policy-report-only'];
    for (const m of html.matchAll(/<(script|link|img|iframe)\b([^>]*)>/gi)) {
      const tag = m[1].toLowerCase(); const src = /\b(?:src|href)\s*=\s*["'](https:\/\/[^"']+)["']/i.exec(m[2]);
      if (!src || (tag === 'link' && !/stylesheet/i.test(m[2]))) continue;
      const origin = new URL(src[1]).origin; const dn = { script: 'script-src', link: 'style-src', img: 'img-src', iframe: 'frame-src' }[tag];
      assert((dirOf(ro, dn) || dirOf(ro, 'default-src')).includes(origin), `${d.file}: <${tag}> loads ${origin} which ${dn} does not list`);
    }
  }
  const app = dirOf(hdr('/')['content-security-policy-report-only'], 'frame-src');
  assert(app.includes('https://www.nps.gov') && app.includes('https://www.google.com'), `/ frame-src ${app}`);
  const appConnect = dirOf(hdr('/')['content-security-policy-report-only'], 'connect-src');
  for (const o of ['https://api.mapbox.com', 'https://events.mapbox.com', RUM]) assert(appConnect.includes(o), `/ connect-src lacks ${o}`);
  const wt = hdr('/watch-together')['content-security-policy-report-only'];
  assert(dirOf(wt, 'script-src').includes('https://cdn.jsdelivr.net') && dirOf(wt, 'connect-src').includes('wss://0.peerjs.com'), 'watch-together lacks jsdelivr / peerjs');
  assert(!dirOf(hdr('/dashboard')['content-security-policy-report-only'], 'script-src').some((s) => /jsdelivr/.test(s)), 'jsdelivr leaked onto a static page');
  // nothing enforces script/style/connect: the only enforced CSP anywhere is frame-ancestors
  const enforced = [...new Set(CFG.headerRules.flatMap((r) => r.headers).filter(([k]) => k.toLowerCase() === 'content-security-policy').map(([, v]) => v))].sort();
  assertEq(enforced, ["frame-ancestors 'none'", 'frame-ancestors *'], 'enforced CSP values');
  t.note('documents checked', seen.size);
});

suite.test('HDR-07', 'Permissions-Policy: camera/geolocation only on /ar; sensors on /ar (self) and, for the Street View frame only, accelerometer + gyroscope on / ; microphone and payment stay off; HSTS unchanged', async (t) => {
  const OFF = 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=()';
  const SELF = 'accelerometer=(self), camera=(self), geolocation=(self), gyroscope=(self), magnetometer=(self), microphone=(), payment=()';
  const APP = 'accelerometer=(self "https://www.google.com"), camera=(), geolocation=(), gyroscope=(self "https://www.google.com"), magnetometer=(), microphone=(), payment=()';
  const bad = [];
  for (const d of MANIFEST.documents) for (const r of d.routes) {
    const pp = hdr(r)['permissions-policy']; const want = /^\/ar(\.html)?$/.test(r) ? SELF : (r === '/' || r === '/index.html') ? (DELEGATED ? APP : OFF) : OFF;
    if (pp !== want) bad.push(`${r}: ${pp}`);
  }
  assertEq(bad, [], 'permissions-policy');
  // the delegation exists iff the bundle carries the allow attribute AND privacy.html discloses it (recomputed here, independently of gen.mjs)
  assertEq(DELEGATED, HAS_ATTR && DISCLOSED, `delegation ${DELEGATED} but allow attribute ${HAS_ATTR} / privacy disclosure ${DISCLOSED}`);
  t.note('Street View delegation', DELEGATED ? 'on (attribute + disclosure present)' : `OFF (attribute ${HAS_ATTR}, disclosed ${DISCLOSED})`);
  // the only origin ever named in a Permissions-Policy is the Street View embed origin, and only for accelerometer + gyroscope
  const named = [...new Set(CFG.headerRules.flatMap((r) => r.headers).filter(([k]) => k.toLowerCase() === 'permissions-policy').flatMap(([, v]) => [...v.matchAll(/([a-z-]+)=\(([^)]*)\)/g)].filter((m) => /"https?:/.test(m[2])).map((m) => `${m[1]}:${m[2].match(/"https?:[^"]+"/g).join(',')}`)))].sort();
  assertEq(named, DELEGATED ? ['accelerometer:"https://www.google.com"', 'gyroscope:"https://www.google.com"'] : [], 'origins named in Permissions-Policy');
  assertEq(hdr('/')['strict-transport-security'], 'max-age=31536000; includeSubDomains; preload', 'HSTS');
  // never a feature the legacy header did not already name (no new "unrecognized feature" console warnings)
  const legacyNames = new Set(H(LEG.headerRules, '/')['permissions-policy'].split(',').map((s) => s.trim().split('=')[0]));
  const newNames = [...new Set(OFF.split(',').map((s) => s.trim().split('=')[0]))];
  assertEq(newNames.filter((n) => !legacyNames.has(n)), [], 'features not in the legacy header');
});

suite.test('HDR-08', 'generator guard rails: nested html refused, staging context adds noindex only in /*, dev pages still in dist are 404-redirected and given no doc rule', async (t) => {
  const tmp = path.join(OUT, 'gen-guard'); fs.rmSync(tmp, { recursive: true, force: true });
  // a minimal dist: index + embed + assets
  fs.mkdirSync(path.join(tmp, 'assets'), { recursive: true }); fs.mkdirSync(path.join(tmp, 'sub'), { recursive: true });
  for (const f of ['index.html', 'embed.html', 'diagnostics.html', 'privacy.html']) fs.writeFileSync(path.join(tmp, f), '<html><body>x</body></html>');
  fs.writeFileSync(path.join(tmp, 'assets', 'a.js'), '1');
  const rel = { rid: 'deadbeef' };
  const ok = generate(tmp, rel);
  assert(ok.warnings.some((w) => /diagnostics\.html is still in dist/.test(w)), 'expected a warning for a leftover dev page');
  assert(!/^\/diagnostics/m.test(ok.headersText), 'dev page must not get a document rule');
  assert(/^\/diagnostics {2}\/404 {2}404!$/m.test(ok.redirects), 'dev page redirect (forced 404)');
  const stg = generate(tmp, rel, { context: 'staging' });
  const stgRules = parseHeadersFile(stg.headersText);
  assertEq(stgRules.filter((r) => r.headers.some(([k]) => /x-robots-tag/i.test(k))).map((r) => r.path), ['/*'], 'X-Robots-Tag only in /*');
  assert(!/x-robots-tag/i.test(ok.headersText), 'production must not carry X-Robots-Tag');
  fs.writeFileSync(path.join(tmp, 'sub', 'x.html'), '<html></html>');
  let threw = null; try { generate(tmp, rel); } catch (e) { threw = e.message; }
  assert(threw && /nested HTML/.test(threw), `nested html must be refused, got: ${threw}`);
  fs.rmSync(tmp, { recursive: true, force: true });
});

suite.test('HDR-09', 'probe + emulator on the built dist: profile t0 all as expected; HP-06/07/13/15 PASS; legacy tree reproduces the audit baseline (10 of 15 red)', async (t) => {
  const run = (dist, profile, jsonName, extra = []) => spawnSync('node', [path.join(REPO, 'ops/headers-probe.mjs'), '--dist', dist, '--profile', profile, '--json', path.join(OUT, jsonName), ...extra], { encoding: 'utf8' });
  const a = run(DIST, 't0', 'probe-t0.json');
  assertEq(a.status, 0, `t0 probe exit\n${a.stdout.slice(-1500)}`);
  const ja = JSON.parse(read(path.join(OUT, 'probe-t0.json')));
  for (const id of ['HP-04', 'HP-05', 'HP-06', 'HP-07', 'HP-08', 'HP-09', 'HP-13', 'HP-14', 'HP-15', 'E-01', 'E-02', 'E-03', 'E-04']) assertEq(ja.results.find((r) => r.id === id).actual, 'PASS', id);
  const deferred = ja.results.filter((r) => r.expected === 'FAIL').map((r) => r.id).sort();
  assertEq(deferred, ['HP-01', 'HP-02', 'HP-03', 'HP-10', 'HP-11', 'HP-12'], 'deferred set'); for (const id of deferred) assertEq(ja.results.find((r) => r.id === id).actual, 'FAIL', `${id} is expected to stay red in T0`);
  // red-first proof: the same probes on the legacy tree
  const b = run(LEGACY, 'baseline', 'probe-baseline-legacy.json', ['--strict-profile']);
  assertEq(b.status, 0, `baseline probe exit\n${b.stdout.slice(-1500)}`);
  const jb = JSON.parse(read(path.join(OUT, 'probe-baseline-legacy.json')));
  const red = jb.results.filter((r) => r.id.startsWith('HP-') && r.actual === 'FAIL').map((r) => r.id).sort();
  assertEq(red, ['HP-01', 'HP-02', 'HP-03', 'HP-06', 'HP-07', 'HP-10', 'HP-11', 'HP-12', 'HP-13', 'HP-15'], 'legacy red set (qa-ci appendix C.4: 10 of 15)');
  // strict `final` profile on the T0 tree: exactly the deferred probes fail
  const c = run(DIST, 'final', 'probe-final.json');
  assertEq(c.status, 1, 'final profile must fail while CSP/URL work is deferred');
  t.note('t0', `${ja.summary.ok}/${ja.summary.total} as expected`); t.note('legacy red', red.join(','));
});

suite.test('HDR-10', 'emulator applies rules exactly like the resolver (spot check over HTTP incl. HEAD, 404 page status, forced 404 on an existing path, query kept on 301)', async (t) => {
  const em = await createEmulator({ dist: DIST });
  try {
    const req = (p, headers = {}, method = 'HEAD') => new Promise((res, rej) => { const r = http.request(em.url + p, { method, headers }, (x) => { x.resume(); x.on('end', () => res({ status: x.statusCode, h: x.headers })); }); r.on('error', rej); r.end(); });
    const embed = await req('/embed'); assertEq([embed.status, embed.h['x-frame-options'], embed.h['content-security-policy']], [200, undefined, 'frame-ancestors *'], '/embed');
    const root = await req('/'); assertEq([root.status, root.h['x-frame-options']], [200, 'DENY'], '/');
    assertEq((await req('/nope')).status, 404, 'unknown path');
    assertEq((await req('/wp-admin/anything')).status, 404, 'scanner rule');
    assertEq((await req('/diagnostics.html')).status, 404, 'dev page');
    const dup = await req('/search?q=1', { host: 'friendly-lolly-da85c0.netlify.app', 'x-forwarded-proto': 'https' });
    assertEq([dup.status, dup.h.location], [301, 'https://gettysburginteractivemap.com/search?q=1'], 'host redirect keeps the query string');
    assertEq(em.conflicts, [], 'the emulator saw a same-name header overlap');
    t.note('requests', em.requests.length);
  } finally { await em.close(); }
});

suite.test('HDR-11', 'fixed-name files (manifest screenshots, og/twitter cards, icons, manifest.json, favicon) are never cached immutably; the only immutable class is /assets/* (hashed names)', async (t) => {
  const cc = (p) => H(CFG.headerRules, p)['cache-control'] || 'DEFAULT';
  const age = (v) => Number((/max-age=(\d+)/.exec(v) || [])[1] || 0);
  const imm = ALL_FILES.filter((f) => /immutable/.test(cc(`/${f}`)));
  assertEq(imm.filter((f) => !f.startsWith('assets/')), [], 'immutable outside /assets/');
  // every file the manifest and the pages name as an image, wherever it lives
  const refs = new Set();
  const mj = JSON.parse(read(path.join(DIST, 'manifest.json')));
  for (const it of [...(mj.icons || []), ...(mj.screenshots || [])]) refs.add(it.src.replace(/^\//, ''));
  for (const f of ALL_FILES.filter((x) => x.endsWith('.html'))) {
    for (const m of read(path.join(DIST, f)).matchAll(/<meta[^>]+(?:property|name)=["'](?:og|twitter):image["'][^>]*content=["']([^"']+)["']/gi)) {
      const u = m[1]; const mm = /^https:\/\/gettysburginteractivemap\.com(\/[^?#]*)/.exec(u) || /^(\/[^?#]*)$/.exec(u); if (mm) refs.add(mm[1].replace(/^\//, ''));
    }
  }
  const missing = [...refs].filter((f) => !ALL_FILES.includes(f));
  assertEq(missing, [], 'images named by the manifest/og tags that are not in the dist');
  const long = [...refs].filter((f) => /immutable/.test(cc(`/${f}`)) || age(cc(`/${f}`)) > 86400);
  assertEq(long, [], 'fixed-name image with a long or immutable cache class');
  // files that exist in the baseline under the SAME name with DIFFERENT bytes (day1/day3.png, manifest.json, html, data...): never immutable either
  const BASE = path.join(REPO, 'baseline', 'dist');
  const crypto = await import('node:crypto');
  const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
  const replaced = ALL_FILES.filter((f) => fs.existsSync(path.join(BASE, f)) && sha(path.join(BASE, f)) !== sha(path.join(DIST, f)) && !f.startsWith('assets/'));
  assertEq(replaced.filter((f) => /immutable/.test(cc(`/${f}`))), [], 'replaced-under-the-same-name file cached immutably');
  for (const f of ['screenshots/day1.png', 'screenshots/day3.png']) assert(replaced.includes(f), `${f} is expected to be replaced under the same name (control)`);
  for (const f of ['screenshots/day1.png', 'screenshots/day3.png', 'og/card-r1.png']) assertEq(cc(`/${f}`), 'public, max-age=0, must-revalidate', `${f} cache-control`);
  t.note('images named by manifest/og', refs.size); t.note('replaced under the same name', replaced.length);
});

suite.test('HDR-12', 'the kill switch is not in the public dist (or served); the build keeps its copy beside the dist; _ops holds only bookkeeping', async (t) => {
  assertEq(ALL_FILES.filter((f) => /sw-kill/.test(f)), [], 'sw-kill.js inside the dist');
  const killCopy = path.join(path.dirname(DIST), '_ops', 'sw-kill.js');
  if (fs.existsSync(killCopy)) assertEq(read(killCopy) === read(path.join(REPO, 'ops', 'sw-kill.js')), true, 'the build copy is not ops/sw-kill.js');
  else t.note('build copy', 'none beside this dist (built by hand?): canonical file is ops/sw-kill.js');
  assertEq(ALL_FILES.filter((f) => f.startsWith('_ops/')).sort(), ['_ops/asset-manifest.json', '_ops/config-manifest.json', '_ops/used-names.txt'], 'files under _ops/');
  const em = await createEmulator({ dist: DIST });
  try {
    const st = (p) => new Promise((res, rej) => { const r = http.request(em.url + p, { method: 'HEAD' }, (x) => { x.resume(); x.on('end', () => res(x.statusCode)); }); r.on('error', rej); r.end(); });
    assertEq([await st('/_ops/sw-kill.js'), await st('/netlify.toml'), await st('/_headers'), await st('/_redirects')], [404, 404, 404, 404], 'kill switch and config files must not be served');
  } finally { await em.close(); }
});

suite.test('HDR-13', 'iframe allow attributes: the Street View frame carries exactly accelerometer + gyroscope, the NPS frame none, and the Permissions-Policy of / names the same two features for the same origin', async (t) => {
  const entry = read(path.join(DIST, 'assets', VERSION.entry));
  const allows = [...entry.matchAll(/\ballow:"([^"]*)"/g)].map((m) => m[1]);
  assertEq(allows, ['accelerometer; gyroscope'], 'allow props in the entry bundle');   // the attribute ships with the R1c bundle whether or not the header delegates (inert without it)
  const svAt = entry.indexOf('"iframe",{src:`https://www.google.com/maps/embed/v1/streetview');       // the template literal nests backticks: look at the props that follow it
  assert(svAt > 0, 'the Street View iframe was not found in the entry bundle');
  assert(/allowFullScreen:!0,allow:"accelerometer; gyroscope",title:/.test(entry.slice(svAt, svAt + 600)), 'the allow attribute is not on the Street View iframe');
  const nps = /"iframe",\{src:[\w$.]+\.videoUrl,style:[\w$.]+,title:[\w$.]+,allowFullScreen:!0\}/.test(entry);
  assert(nps, 'the NPS video iframe changed (it must stay without an allow attribute)');
  for (const f of ALL_FILES.filter((x) => x.endsWith('.html'))) assertEq(/<iframe\b[^>]*\ballow\s*=/i.test(read(path.join(DIST, f))), false, `${f} has an iframe with an allow attribute`);
  const pp = hdr('/')['permissions-policy'];
  for (const feat of allows[0].split(/;\s*/)) {
    if (DELEGATED) assert(pp.split(', ').includes(`${feat}=(self "https://www.google.com")`), `/ does not delegate ${feat} to https://www.google.com: ${pp}`);
    else assert(pp.split(', ').includes(`${feat}=()`), `/ must keep ${feat} off while privacy.html does not disclose the delegation: ${pp}`);
  }
  // nothing outside the app page may name the Google origin
  const others = MANIFEST.documents.filter((d) => !d.routes.includes('/')).flatMap((d) => d.routes).filter((r) => /google\.com/.test(hdr(r)['permissions-policy'] || ''));
  assertEq(others, [], 'pages that delegate to google.com besides /');
});

suite.test('HDR-24', 'the DEFAULT R1c build (the opt-in legal group is NOT included): privacy/terms carry no draft text, and the Street View sensor delegation stays OFF because the privacy page does not disclose it', async (t) => {
  const out = path.join(OUT, 'R1c-default'); const rel = path.relative(REPO, out).split(path.sep).join('/');
  const b = spawnSync('python', ['tools/t0/build.py', '--train', 'R1c', '--out', rel], { cwd: REPO, encoding: 'utf8' });
  assertEq(b.status, 0, `default build failed\n${b.stdout.slice(-1500)}${b.stderr.slice(-800)}`);
  assert(/optional page group\(s\) NOT included[^\n]*PG-legal/.test(b.stdout), 'the build did not report PG-legal as an opt-in group that is not included');
  const d = path.join(out, 'dist');
  const v = JSON.parse(read(path.join(d, 'version.json'))); assert(!v.groups.includes('PG-legal'), 'PG-legal is in the default build');
  const man = JSON.parse(read(path.join(d, '_ops', 'config-manifest.json')));
  assertEq(man.documents.find((x) => x.file === 'index.html').permissions, 'off', 'default build delegation');
  assert(man.warnings.some((w) => /does not disclose it/.test(w)), `expected the generator warning, got ${JSON.stringify(man.warnings)}`);
  const pp = H(loadDistConfig(d).headerRules, '/')['permissions-policy'];
  assertEq(pp, 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=()', '/ Permissions-Policy in the default build');
  for (const f of ['privacy.html', 'terms.html']) { const x = read(path.join(d, f)); assert(!/OWNER|September 30, 2026|November 3, 2026|motion sensors/.test(x), `${f} carries legal-draft text in the default build`); }
  t.note('warnings', man.warnings.length);
  fs.rmSync(out, { recursive: true, force: true });
});

// ==================================================================================================================== real Chrome
const framer = () => new Promise((resolve) => {
  const targets = [['embed', '/embed'], ['embed-html', '/embed.html'], ['embed-q', '/embed?vignette=V-018'], ['root', '/'], ['index', '/index.html'], ['privacy', '/privacy'], ['dashboard', '/dashboard'], ['dashboard-html', '/dashboard.html'], ['ar', '/ar']];
  const srv = http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(`<!doctype html><title>framer</title><body>${targets.map(([n, p]) => `<iframe name="${n}" src="http://127.0.0.1:${PORT_BASE}${p}" width="300" height="200"></iframe>`).join('')}</body>`);
  });
  srv.listen(PORT_BASE + 2, '127.0.0.1', () => resolve({ srv, url: `http://127.0.0.1:${PORT_BASE + 2}/`, targets, close: () => new Promise((r) => { srv.closeAllConnections?.(); srv.close(() => r()); }) }));
});

suite.test('HDR-20', 'real Chrome, cross-origin page: /embed and /embed.html frame; /, /index.html, /privacy, /dashboard(.html), /ar do not', async (t) => {
  if (NO_BROWSER) throw new Skip('--no-browser');
  const em = await createEmulator({ dist: DIST, port: PORT_BASE });
  const fr = await framer();
  const S = await openSession({ profile: 'hdr-frame', cdpPort: PORT_BASE + 1, tiles: 'block' }); sessions.push(S);
  try {
    await S.page.goto(fr.url, { waitUntil: 'load' });
    await sleep(2500);
    const out = {};
    for (const [name] of fr.targets) {
      const f = S.page.frames().find((x) => x.name() === name);
      const url = f ? f.url() : '(no frame)';
      const loaded = !!f && url.startsWith(`http://127.0.0.1:${PORT_BASE}`);
      const has = loaded ? await f.locator('.embed, #root, body').count() : 0;
      out[name] = { url: url.slice(0, 60), loaded, has };
    }
    t.note('frames', Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.loaded ? 'FRAMED' : 'blocked'])));
    for (const n of ['embed', 'embed-html', 'embed-q']) assert(out[n].loaded, `${n} was blocked from framing: ${JSON.stringify(out[n])}`);
    for (const n of ['root', 'index', 'privacy', 'dashboard', 'dashboard-html', 'ar']) assert(!out[n].loaded, `${n} was framed cross-origin: ${JSON.stringify(out[n])}`);
    // the embed frame really renders its widget (fetches /data/vignettes_part*.json from its own origin)
    const ef = S.page.frames().find((x) => x.name() === 'embed');
    await waitFor(async () => (await ef.locator('.embed').count()) > 0, { timeout: 8000, label: 'embed widget markup' });
    // the same-origin case too (DENY / frame-ancestors 'none' are stricter than the runbook's 'self': the site frames none of its own pages)
    const so = await S.newPage(); await so.goto(`http://127.0.0.1:${PORT_BASE}/embed`, { waitUntil: 'load' });
    await so.evaluate((u) => { const i = document.createElement('iframe'); i.name = 'self-root'; i.src = u; document.body.appendChild(i); }, `http://127.0.0.1:${PORT_BASE}/privacy`);
    await sleep(1500);
    const sf = so.frames().find((x) => x.name() === 'self-root');
    t.note('same-origin /privacy in a frame', sf && sf.url().startsWith('chrome-error') ? 'blocked (DENY)' : sf && sf.url());
    assert(sf && sf.url().startsWith('chrome-error'), 'same-origin framing of /privacy should be blocked (X-Frame-Options DENY kept)');
  } finally { await fr.close(); await em.close(); await S.close(); sessions.splice(sessions.indexOf(S), 1); }
});

const cspProbe = () => {
  window.__csp = [];
  document.addEventListener('securitypolicyviolation', (e) => window.__csp.push({ dir: e.violatedDirective, blocked: e.blockedURI, disp: e.disposition, src: (e.sourceFile || '').slice(-40), sample: (e.sample || '').slice(0, 40) }));
};
suite.test('HDR-21', 'real Chrome: every page loads under its Report-Only CSP + Permissions-Policy with 0 violations and 0 policy warnings (violation control included)', async (t) => {
  if (NO_BROWSER) throw new Skip('--no-browser');
  const em = await createEmulator({ dist: DIST, port: PORT_BASE });
  const S = await openSession({ profile: 'hdr-csp', cdpPort: PORT_BASE + 1, tiles: 'block', initScripts: [cspProbe] }); sessions.push(S);
  const policyMsgs = [];
  S.page.on('console', (m) => { const x = m.text(); if (/Content Security Policy|Report Only|Permissions[- ]Policy|Feature[- ]Policy|Unrecognized feature/i.test(x)) policyMsgs.push({ page: S.page.url().replace(/^http:\/\/127\.0\.0\.1:\d+/, ''), text: x.slice(0, 200) }); });
  try {
    // never let a page reach a non-local, non-Mapbox host (jsDelivr, PeerJS broker, Google, NPS, the RUM collector): blocked at the network layer, AFTER the CSP check
    const c = await cdpFor(S.page); await c.send('Network.enable');
    await c.send('Network.setBlockedURLs', { urls: ['https://cdn.jsdelivr.net/*', 'https://0.peerjs.com/*', 'wss://0.peerjs.com/*', 'https://www.google.com/*', 'https://www.nps.gov/*', 'https://ingesteer.services-prod.nsvcs.net/*'] });
    // control: the listener sees a Report-Only violation (a websocket to an unlisted local origin; it fails locally, nothing leaves the machine)
    await S.page.goto(`http://127.0.0.1:${PORT_BASE}/privacy`, { waitUntil: 'load' });
    await S.page.evaluate(() => { try { new WebSocket('wss://127.0.0.1:1/x'); } catch (e) { /* refused */ } });
    await sleep(500);
    const ctl = await S.page.evaluate(() => window.__csp);
    assert(ctl.some((v) => v.dir.startsWith('connect-src') && v.disp === 'report'), `violation control not observed: ${JSON.stringify(ctl)}`);
    t.note('control violation seen', ctl[0].dir + ' ' + ctl[0].disp);
    policyMsgs.length = 0;

    const routes = [...new Set(MANIFEST.documents.filter((d) => d.class !== 'embed').map((d) => d.routes[0]).concat(['/embed']))];
    const withTiles = new Set(['/', '/camera', '/watch-together']);
    const res = {}; const boot = [];
    for (const r of routes) {
      S.setTiles(withTiles.has(r) ? 'inject' : 'block');
      await S.page.goto(`http://127.0.0.1:${PORT_BASE}${r}`, { waitUntil: 'load' });
      if (r === '/') { await chooseLayout(S.page, 'desktop').catch(() => {}); await waitForApp(S.page, 40000).then(() => boot.push('app mounted'), (e) => boot.push(`app NOT mounted: ${e.message.slice(0, 80)}`)); await sleep(2500); }
      else await sleep(withTiles.has(r) ? 4000 : 1200);
      res[r] = await S.page.evaluate(() => window.__csp);
    }
    const viol = Object.entries(res).filter(([, v]) => v.length).map(([r, v]) => `${r}: ${v.map((x) => `${x.dir} <- ${x.blocked} (${x.disp})`).join('; ')}`);
    t.note('pages', routes.length); t.note('boot', boot.join('; ')); t.note('mapbox requests used', `${tileBudget.used}/${tileBudget.cap}`);
    assertEq(viol, [], 'securitypolicyviolation events (report-only counts)');
    assertEq(policyMsgs, [], 'console messages about CSP / Permissions-Policy');
    assert(boot.every((b) => b === 'app mounted'), boot.join('; '));
    const pp = {};
    for (const r of ['/', '/ar', '/embed']) { await S.page.goto(`http://127.0.0.1:${PORT_BASE}${r}`, { waitUntil: 'domcontentloaded' }); pp[r] = await S.page.evaluate(() => { const p = document.permissionsPolicy || document.featurePolicy; return p ? ['camera', 'geolocation', 'accelerometer', 'gyroscope', 'magnetometer', 'microphone', 'payment'].map((f) => `${f}:${p.allowsFeature(f) ? 1 : 0}`).join(' ') : 'n/a'; }); }
    t.note('allowsFeature', pp);
    // the app page allows accelerometer + gyroscope for itself AND the Street View frame (the origin list is HDR-07); the rest stays off
    assert((DELEGATED ? /camera:0 geolocation:0 accelerometer:1 gyroscope:1 magnetometer:0 microphone:0 payment:0/ : /camera:0 geolocation:0 accelerometer:0 gyroscope:0 magnetometer:0 microphone:0 payment:0/).test(pp['/']), `/ allows an unexpected feature: ${pp['/']}`);
    assert(/camera:1 geolocation:1 accelerometer:1 gyroscope:1 magnetometer:1 microphone:0 payment:0/.test(pp['/ar']), `/ar: ${pp['/ar']}`);
    assert(/camera:0/.test(pp['/embed']), `/embed: ${pp['/embed']}`);
    // dev pages and unknown paths really 404 in the browser, both spellings
    const st = {};
    for (const p of ['/diagnostics', '/diagnostics.html', '/unit-rendering-reference', '/unit-rendering-reference.html', '/not-a-page']) { const rsp = await S.page.goto(`http://127.0.0.1:${PORT_BASE}${p}`, { waitUntil: 'domcontentloaded' }); st[p] = rsp.status(); }
    assertEq(Object.values(st), [404, 404, 404, 404, 404], 'dev pages / unknown');
    t.note('404s', st);
  } finally { await S.close(); sessions.splice(sessions.indexOf(S), 1); await em.close(); }
});

suite.test('HDR-22', 'negative control: the same crawl DOES report a violation when the app policy lacks a Mapbox origin (tiles blocked: nothing leaves the machine)', async (t) => {
  if (NO_BROWSER) throw new Skip('--no-browser');
  const tmp = path.join(OUT, 'csp-negative'); fs.rmSync(tmp, { recursive: true, force: true }); fs.cpSync(DIST, tmp, { recursive: true });
  const f = path.join(tmp, '_headers'); let txt = read(f);
  const before = txt;
  txt = txt.replace(/(connect-src 'self' https:\/\/ingesteer\.services-prod\.nsvcs\.net) https:\/\/api\.mapbox\.com https:\/\/events\.mapbox\.com/g, '$1');
  assert(txt !== before, 'could not doctor the policy');
  fs.writeFileSync(f, txt);
  const em = await createEmulator({ dist: tmp, port: PORT_BASE });
  const S = await openSession({ profile: 'hdr-neg', cdpPort: PORT_BASE + 1, tiles: 'block', initScripts: [cspProbe] }); sessions.push(S);
  try {
    const c = await cdpFor(S.page); await c.send('Network.enable');
    await c.send('Network.setBlockedURLs', { urls: ['https://www.google.com/*', 'https://www.nps.gov/*', 'https://ingesteer.services-prod.nsvcs.net/*'] });
    await S.page.goto(`http://127.0.0.1:${PORT_BASE}/`, { waitUntil: 'load' });
    await chooseLayout(S.page, 'desktop').catch(() => {});
    await waitFor(async () => (await S.page.evaluate(() => window.__csp)).length > 0, { timeout: 30000, label: 'a connect-src violation for api.mapbox.com' });
    const v = await S.page.evaluate(() => window.__csp);
    t.note('violations', v.slice(0, 2).map((x) => `${x.dir} <- ${x.blocked.slice(0, 40)} (${x.disp})`));
    assert(v.some((x) => x.dir.startsWith('connect-src') && /api\.mapbox\.com/.test(x.blocked) && x.disp === 'report'), JSON.stringify(v.slice(0, 3)));
  } finally { await S.close(); sessions.splice(sessions.indexOf(S), 1); await em.close(); fs.rmSync(tmp, { recursive: true, force: true }); }
});

suite.test('HDR-23', 'ONLINE (--online): the Virtual Walkthrough opens the REAL Google Street View frame and logs no permissions-policy error; the same page without the allow attribute logs it (control)', async (t) => {
  if (NO_BROWSER) throw new Skip('--no-browser');
  if (!ONLINE) throw new Skip('--online not given (this test loads https://www.google.com/maps/embed from the Walkthrough, about two page loads of the embed)');
  if (!DELEGATED) throw new Skip('the Street View delegation is OFF in this build (privacy.html does not disclose it: build with --with PG-legal); Google then logs its own accelerometer error, as on the live site today');
  const entryRel = path.join('assets', VERSION.entry);
  const run = async (name, mutate) => {
    const dir = path.join(OUT, 'wt-' + name); fs.rmSync(dir, { recursive: true, force: true }); fs.cpSync(DIST, dir, { recursive: true });
    mutate(dir);
    const em = await createEmulator({ dist: dir, port: PORT_BASE });
    const S = await openSession({ profile: 'hdr-wt-' + name, cdpPort: PORT_BASE + 1, tiles: 'block' }); sessions.push(S);
    const msgs = [];
    S.page.on('console', (m) => msgs.push({ type: m.type(), text: m.text().replace(/(key|access_token)=[^&\s"]+/g, '$1=<redacted>').slice(0, 200) }));
    try {
      await S.page.goto(`http://127.0.0.1:${PORT_BASE}/`, { waitUntil: 'load' });
      await chooseLayout(S.page, 'desktop').catch(() => {});
      await waitForApp(S.page, 40000);
      await sleep(1000);
      const from = msgs.length;
      await S.page.getByText('Virtual Walkthrough').first().click();
      await waitFor(async () => S.page.frames().some((f) => f.url().startsWith('https://www.google.com/maps/embed/v1/streetview')), { timeout: 20000, label: 'the Street View frame' });
      await sleep(8000);
      const frame = S.page.frames().find((f) => f.url().startsWith('https://www.google.com/maps/embed/v1/streetview'));
      const allowAttr = await S.page.evaluate(() => (document.querySelector('iframe[src*="streetview"]') || {}).getAttribute?.('allow') ?? null);
      return { policy: msgs.slice(from).filter((m) => /ermissions[- ]policy|deviceorientation|accelerometer|gyroscope/i.test(m.text)), framed: !!frame, allowAttr, conflicts: em.conflicts.length };
    } finally { await S.close(); sessions.splice(sessions.indexOf(S), 1); await em.close(); fs.rmSync(dir, { recursive: true, force: true }); }
  };
  const good = await run('as-built', () => {});
  const ctl = await run('no-allow', (dir) => { const f = path.join(dir, entryRel); const a = read(f); const b = a.replace(',allow:"accelerometer; gyroscope"', ''); assert(a !== b, 'could not remove the allow attribute for the control'); fs.writeFileSync(f, b); });
  t.note('as built', { framed: good.framed, allow: good.allowAttr, policyMessages: good.policy.length });
  t.note('control (no allow attribute)', { framed: ctl.framed, allow: ctl.allowAttr, policyMessages: ctl.policy.map((m) => m.text.slice(0, 70)) });
  assert(good.framed && ctl.framed, 'the Street View frame did not load (offline or Google changed the embed URL)');
  assertEq(good.conflicts + ctl.conflicts, 0, 'emulator header conflicts');
  assertEq(good.policy, [], 'as built: policy/sensor console messages from the Walkthrough');
  assert(ctl.policy.some((m) => /accelerometer is not allowed/i.test(m.text)), `the control did not reproduce Google's accelerometer error, so the clean run proves nothing: ${JSON.stringify(ctl.policy)}`);
});

// ==================================================================================================================== run
const outFile = path.join(OUT, 'headers-results.json');
let summary;
try {
  summary = await suite.run({ filter: FILTER, outFile, extra: () => ({ dist: path.relative(REPO, DIST).split(path.sep).join('/'), release: VERSION.release, mapboxBudget: { ...tileBudget } }) });
} finally {
  for (const s of [...sessions]) { try { await s.close(); } catch { /* closed */ } }
}
process.exit(summary.failed ? 1 : 0);

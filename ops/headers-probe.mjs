#!/usr/bin/env node
// Header / redirect / version prod-probe: the 15 probes HP-01..HP-15 of docs/plan/specialists/qa-ci.md (5.10) plus 4 T0 extras (E-01..E-04).
// Dependency-free (node >= 18).  Runs against ANY base URL, or against a local server that applies a built dist's own rules.
//
//   node ops/headers-probe.mjs https://gettysburginteractivemap.com                 read-only HEAD/GET requests, ~45 requests
//   node ops/headers-probe.mjs --dist release/R1c/dist                              starts tools/t0/config/emulate.mjs on a free port
//   options:  --profile t0|s1|final|baseline   what each probe is EXPECTED to do.  Default: from env PROBE_TRAIN when tests/t0/prod-probe.mjs
//                                           calls this file (legacy/R0/R1a/R1b -> baseline, R1c/R1d -> t0, S1 -> s1), else t0
//             --staging                     accepted and ignored (staging is a different site: E-01 is skipped there anyway)
//             --strict-profile              an unexpected PASS is a failure too (use with baseline, to prove the probes reproduce the audit)
//             --expect-release <rid>        HP-15: /version.json .release must equal this (local mode: taken from <dist>/version.json)
//             --host-check auto|off         E-01 (netlify.app -> primary): auto = query the duplicate host directly on production, use a Host
//                                           header against the local emulator, skip on any other base (staging is a different site)
//             --json <file>  --md           machine-readable result / markdown table
//             --timeout <ms> (15000)  --retries <n> (3)  --delay <ms> (120, politeness between live requests)
// Exit codes: 0 every verdict as expected, 1 an unexpected FAIL (or, with --strict-profile, any mismatch), 2 a probe could not run (network error).
//
// Profiles.  `t0` = train R1c: HP-01/02/03 are deferred by D-CSP (enforcement is DG-2; T0 ships Report-Only and invents no report endpoint) and
// HP-10/11/12 by D-URL/D-SITEMAP (S1 train: T0 changes no URL form, canonical or sitemap content set beyond dropping ar.html).  `final` = the A+
// end state (all pass).  `baseline` = the state recorded on production on 2026-09-29 (qa-ci appendix C.4: 10 of 15 fail).
// NOTE: a local run proves the generated RULES; Netlify's real matching/merge semantics can only be finally verified on a deploy (gbg-staging).
import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PRIMARY = 'https://gettysburginteractivemap.com';
const UA = 'gbg-headers-probe/1 (synthetic; T0)';

// ------------------------------------------------------------------------------------------------------------------ args
const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(`--${name}`); if (i < 0) return dflt; const v = argv[i + 1]; return v === undefined || v.startsWith('--') ? true : v; };
const flag = (name) => argv.includes(`--${name}`);
const VALUE_FLAGS = new Set(['profile', 'expect-release', 'host-check', 'json', 'timeout', 'retries', 'delay', 'dup-host', 'dist', 'port']);
const positional = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--') && VALUE_FLAGS.has(argv[i - 1].slice(2))));
const TRAIN_PROFILE = { legacy: 'baseline', R0: 'baseline', R1a: 'baseline', R1b: 'baseline', R1c: 't0', R1d: 't0', S1: 's1' };
const PROFILE = String(opt('profile', TRAIN_PROFILE[process.env.PROBE_TRAIN] || 't0'));
const TIMEOUT = Number(opt('timeout', 15000)), RETRIES = Number(opt('retries', 3)), DELAY = Number(opt('delay', 120));
const DUP_HOST = String(opt('dup-host', 'friendly-lolly-da85c0.netlify.app'));
if (!['t0', 's1', 'final', 'baseline'].includes(PROFILE)) { console.error(`unknown profile ${PROFILE}`); process.exit(2); }

// ------------------------------------------------------------------------------------------------------------------ http
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let BASE = null;                                                         // URL object of the target
let LOCAL = false;
function once(u, { method = 'HEAD', headers = {}, body = false }) {
  return new Promise((resolve, reject) => {
    const url = new URL(u);
    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.request({ protocol: url.protocol, hostname: url.hostname, port: url.port || undefined, path: url.pathname + url.search, method, agent: false, timeout: TIMEOUT,
      headers: { 'user-agent': UA, 'x-gtbg-synthetic': '1', accept: '*/*', 'accept-encoding': 'identity', ...headers } }, (res) => {
      const chunks = []; let n = 0;
      res.on('data', (c) => { n += c.length; if (body && n < 4_000_000) chunks.push(c); });
      res.on('end', () => resolve({ status: res.statusCode, headers: Object.fromEntries(Object.entries(res.headers).map(([k, v]) => [k, Array.isArray(v) ? v.join(', ') : v])), body: body ? Buffer.concat(chunks).toString('utf8') : '' }));
      res.on('error', reject);
    });
    req.on('timeout', () => req.destroy(Object.assign(new Error(`timeout after ${TIMEOUT} ms`), { code: 'ETIMEDOUT' })));
    req.on('error', reject);
    req.end();
  });
}
async function get(pathOrUrl, opts = {}) {
  const u = /^https?:\/\//i.test(pathOrUrl) ? pathOrUrl : new URL(pathOrUrl, BASE).href;
  let lastErr;
  for (let i = 0; i < RETRIES; i++) {
    try { const r = await once(u, opts); if (!LOCAL) await sleep(DELAY); return r; } catch (e) { lastErr = e; await sleep(800 * (i + 1)); }
  }
  const err = new Error(`${opts.method || 'HEAD'} ${u}: ${lastErr && (lastErr.code || lastErr.message)}`); err.network = true; throw err;
}
const head = (p, o = {}) => get(p, { ...o, method: 'HEAD' });
const gett = (p, o = {}) => get(p, { ...o, method: 'GET', body: true });

// ------------------------------------------------------------------------------------------------------------------ helpers
const cspOf = (r) => ({ enforced: r.headers['content-security-policy'] || null, ro: r.headers['content-security-policy-report-only'] || null });
const dir = (policy, name) => { if (!policy) return null; const d = policy.split(';').map((s) => s.trim()).find((s) => s.split(/\s+/)[0].toLowerCase() === name); return d ? d.split(/\s+/).slice(1) : null; };
const short = (s, n = 90) => (s == null ? 'none' : s.length > n ? `${s.slice(0, n)}...` : s);
const ok = (evidence) => ({ ok: true, evidence });
const bad = (evidence) => ({ ok: false, evidence });
const framingRefused = (r) => {
  const x = (r.headers['x-frame-options'] || '').toUpperCase(); const fa = dir(cspOf(r).enforced, 'frame-ancestors');
  return { refused: /^(DENY|SAMEORIGIN)$/.test(x) || (!!fa && !fa.includes('*')), x, fa: fa ? fa.join(' ') : null };
};

// ------------------------------------------------------------------------------------------------------------------ probes
const PAGES_ALT = ['search', 'dashboard', 'compare', 'camera', 'documentary', 'report', 'education', 'aftermath'];
const NOT_200 = ['/.env', '/.git/config', '/wp-admin/install.php', '/xmlrpc.php', '/package.json', '/diagnostics.html', '/diagnostics', '/unit-rendering-reference.html', '/unit-rendering-reference'];
let ROOT = null;                                                           // cached GET /

const PROBES = [
  { id: 'HP-01', audit: 'X3', title: 'an enforcing Content-Security-Policy (script-src/default-src) on /', async run() {
    const c = cspOf(ROOT);
    const restricts = !!(c.enforced && (dir(c.enforced, 'script-src') || dir(c.enforced, 'default-src')));
    return (restricts ? ok : bad)([`enforced: ${short(c.enforced)}`, `report-only present: ${!!c.ro}`]);
  } },
  { id: 'HP-02', audit: 'X3', title: 'CSP has a reporting endpoint (report-uri / report-to)', async run() {
    const c = cspOf(ROOT); const has = [c.enforced, c.ro].some((p) => p && /(^|;)\s*(report-uri|report-to)\s/.test(p));
    return (has ? ok : bad)([`report-uri/report-to in CSP: ${has}`, `Reporting-Endpoints header: ${short(ROOT.headers['reporting-endpoints'])}`]);
  } },
  { id: 'HP-03', audit: 'X3', title: "script-src has no 'unsafe-inline'", async run() {
    const c = cspOf(ROOT); const policy = c.enforced && (dir(c.enforced, 'script-src') || dir(c.enforced, 'default-src')) ? c.enforced : c.ro;
    if (!policy) return bad(['no CSP at all']);
    const eff = dir(policy, 'script-src') || dir(policy, 'default-src') || [];
    return (eff.includes("'unsafe-inline'") ? bad : ok)([`effective script-src (${policy === c.enforced ? 'enforced' : 'report-only'}): ${eff.join(' ') || '(none)'}`]);
  } },
  { id: 'HP-04', audit: '-', title: 'HSTS max-age >= 1 year, includeSubDomains, preload', async run() {
    const v = ROOT.headers['strict-transport-security'] || ''; const age = Number((/max-age=(\d+)/.exec(v) || [])[1] || 0);
    return (age >= 31536000 && /includeSubDomains/i.test(v) && /preload/i.test(v) ? ok : bad)([`Strict-Transport-Security: ${short(v)}`]);
  } },
  { id: 'HP-05', audit: '-', title: 'nosniff, Referrer-Policy, Permissions-Policy present on /', async run() {
    const h = ROOT.headers; const e = [`x-content-type-options: ${h['x-content-type-options'] || 'none'}`, `referrer-policy: ${h['referrer-policy'] || 'none'}`, `permissions-policy: ${short(h['permissions-policy'], 60)}`];
    return ((h['x-content-type-options'] || '').toLowerCase() === 'nosniff' && h['referrer-policy'] && h['permissions-policy'] ? ok : bad)(e);
  } },
  { id: 'HP-06', audit: 'X4', title: '/embed and /embed.html: no X-Frame-Options, frame-ancestors *; /, /privacy, /dashboard refuse framing', async run() {
    const ev = []; let good = true;
    for (const p of ['/embed', '/embed.html']) {
      const r = await head(p); const fa = dir(cspOf(r).enforced, 'frame-ancestors');
      const pass = r.status === 200 && !r.headers['x-frame-options'] && !!fa && fa.includes('*');
      if (!pass) good = false; ev.push(`${p}: ${r.status} XFO=${r.headers['x-frame-options'] || 'none'} frame-ancestors=${fa ? fa.join(' ') : 'none'} ${pass ? 'ok' : 'BAD'}`);
    }
    for (const p of ['/', '/privacy', '/dashboard']) {
      const r = p === '/' ? ROOT : await head(p); const f = framingRefused(r);
      if (!f.refused) good = false; ev.push(`${p}: XFO=${f.x || 'none'} frame-ancestors=${f.fa || 'none'} ${f.refused ? 'refused' : 'FRAMEABLE'}`);
    }
    return (good ? ok : bad)(ev);
  } },
  { id: 'HP-07', audit: 'X4', title: '/embed and /embed.html carry no Content-Security-Policy-Report-Only', async run() {
    const ev = []; let good = true;
    for (const p of ['/embed', '/embed.html']) { const r = await head(p); const ro = r.headers['content-security-policy-report-only']; if (ro) good = false; ev.push(`${p}: report-only ${ro ? `PRESENT (${short(ro, 40)})` : 'absent'}`); }
    return (good ? ok : bad)(ev);
  } },
  { id: 'HP-08', audit: 'C6', title: '/sw.js no-store and a JavaScript type', async run() {
    const r = await head('/sw.js'); const cc = r.headers['cache-control'] || ''; const ct = r.headers['content-type'] || '';
    return (r.status === 200 && /no-store/i.test(cc) && /javascript/i.test(ct) ? ok : bad)([`${r.status} cache-control: ${cc || 'none'}; content-type: ${ct || 'none'}`]);
  } },
  { id: 'HP-09', audit: 'P2', title: 'the entry bundle named by / is immutable (>= 1 year)', async run() {
    const m = /\/assets\/index-[A-Za-z0-9_-]+\.js/.exec(ROOT.body || '');
    if (!m) return bad(['no /assets/index-*.js reference found in the HTML of /']);
    const r = await head(m[0]); const cc = r.headers['cache-control'] || ''; const age = Number((/max-age=(\d+)/.exec(cc) || [])[1] || 0);
    return (r.status === 200 && /immutable/i.test(cc) && age >= 31536000 ? ok : bad)([`${m[0]}: ${r.status} cache-control: ${cc || 'none'}`]);
  } },
  { id: 'HP-10', audit: 'T3', title: '/index.html answers 301 to /', async run() {
    const r = await head('/index.html'); const loc = r.headers.location || '';
    return (r.status === 301 && /^(https?:\/\/[^/]+)?\/$/.test(loc) ? ok : bad)([`/index.html -> ${r.status}${loc ? ` Location ${loc}` : ''}`]);
  } },
  { id: 'HP-11', audit: 'T3', title: 'alternate URL forms (/x.html) answer 301 to the clean URL', async run() {
    const ev = []; let good = true;
    for (const n of PAGES_ALT) { const r = await head(`/${n}.html`); const loc = r.headers.location || ''; const pass = r.status === 301 && new RegExp(`/${n}$`).test(loc); if (!pass) good = false; ev.push(`/${n}.html=${r.status}`); }
    return (good ? ok : bad)([ev.join(' ')]);
  } },
  { id: 'HP-12', audit: 'E5', title: 'sitemap lists /privacy and /terms', async run() {
    const r = await gett('/sitemap.xml'); const locs = [...(r.body || '').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    const has = (n) => locs.some((l) => new RegExp(`/${n}(\\.html)?$`).test(l));
    return (r.status === 200 && has('privacy') && has('terms') ? ok : bad)([`${locs.length} <loc>; privacy: ${has('privacy')}; terms: ${has('terms')}`]);
  } },
  { id: 'HP-13', audit: 'T2,X4', title: 'scanner and developer paths (both spellings) answer 404', async run() {
    const ev = []; let good = true;
    for (const p of NOT_200) { const r = await head(p); if (r.status !== 404) good = false; ev.push(`${p}=${r.status}`); }
    return (good ? ok : bad)([ev.join(' ')]);
  } },
  { id: 'HP-14', audit: 'G1', title: '/user-guide.pdf: attachment disposition, application/pdf', async run() {
    const r = await head('/user-guide.pdf'); const cd = r.headers['content-disposition'] || ''; const ct = r.headers['content-type'] || '';
    return (r.status === 200 && /^attachment/i.test(cd) && /application\/pdf/i.test(ct) ? ok : bad)([`${r.status} content-disposition: ${short(cd, 60)}; content-type: ${ct || 'none'}`]);
  } },
  { id: 'HP-15', audit: 'N1', title: '/version.json exists, is JSON, matches the deployed release, names an entry that exists', async run() {
    const r = await gett('/version.json'); let j = null; try { j = JSON.parse(r.body); } catch { /* not json */ }
    if (r.status !== 200 || !j || typeof j.release !== 'string') return bad([`/version.json: ${r.status}${j ? '' : ' (missing or not JSON)'}`]);
    const ev = [`release ${j.release}, train ${j.train}, entry ${j.entry}`]; let good = true;
    const want = EXPECT_RELEASE; if (want) { if (j.release !== want) good = false; ev.push(`expected release ${want}: ${j.release === want ? 'match' : 'MISMATCH'}`); }
    const cc = r.headers['cache-control'] || ''; if (/immutable|max-age=[1-9]/.test(cc)) { good = false; ev.push(`cache-control ${cc} would let a stale version.json hide a deploy`); }
    if (j.entry) { const e = await head(`/assets/${j.entry}`); if (e.status !== 200) good = false; ev.push(`/assets/${j.entry}: ${e.status}`); }
    return (good ? ok : bad)(ev);
  } },
];

const EXTRAS = [
  { id: 'E-01', audit: 'X12/T3', title: `${DUP_HOST} answers 301 (force) to the primary domain, path and query kept; deploy-preview hosts untouched`, async run() {
    const mode = HOST_CHECK; const ev = []; let good = true;
    if (mode === 'skip') return { skip: true, evidence: ['skipped: base is neither production nor a local emulation (staging is a different site; the rule is host-based)'] };
    if (LOCAL) {
      for (const proto of ['https', 'http']) {
        const r = await head('/historian?x=1', { headers: { host: DUP_HOST, 'x-forwarded-proto': proto } });
        const want = `${PRIMARY}/historian?x=1`; const pass = r.status === 301 && r.headers.location === want; if (!pass) good = false;
        ev.push(`${proto}://${DUP_HOST}/historian?x=1 -> ${r.status} ${r.headers.location || ''}${pass ? '' : ' BAD'}`);
      }
      const pv = await head('/historian', { headers: { host: `deploy-preview-1--${DUP_HOST}`, 'x-forwarded-proto': 'https' } });
      if (pv.status !== 200) good = false; ev.push(`deploy-preview host -> ${pv.status} (must stay 200)`);
    } else {
      const r = await head(`https://${DUP_HOST}/historian?x=1`); const want = `${PRIMARY}/historian?x=1`; good = r.status === 301 && r.headers.location === want;
      ev.push(`https://${DUP_HOST}/historian?x=1 -> ${r.status} ${r.headers.location || ''}`);
    }
    return (good ? ok : bad)(ev);
  } },
  { id: 'E-02', audit: 'T0-15', title: '/icons/* is not immutable (un-fingerprinted names): max-age <= 1 day', async run() {
    const r = await head('/icons/icon-192.png'); const cc = r.headers['cache-control'] || ''; const age = Number((/max-age=(\d+)/.exec(cc) || [])[1] || 0);
    return (r.status === 200 && !/immutable/i.test(cc) && age > 0 && age <= 86400 ? ok : bad)([`/icons/icon-192.png: ${r.status} cache-control: ${cc || 'none'}`]);
  } },
  { id: 'E-03', audit: 'infra-04', title: 'Permissions-Policy: camera/geolocation/sensors off on /embed and /dashboard, on for self only on /ar; on / either everything off or ONLY the Street View frame may use accelerometer + gyroscope (and then privacy.html says so)', async run() {
    const ev = []; let good = true;
    const pp = (r) => r.headers['permissions-policy'] || '';
    const feat = (v, n) => { const m = new RegExp(`(?:^|,\\s*)${n}=(\\([^)]*\\)|\\*)`).exec(v); return m ? m[1] : '(unset)'; };
    // / (and /index.html) hosts the Virtual Walkthrough's Google Street View iframe.  Two valid states (ops/header-decisions.md section 2):
    //   off        every sensor/camera/location feature () - the build without the opt-in legal text, and trains R0-R1b are not judged here (baseline profile)
    //   delegated  accelerometer and gyroscope = (self "https://www.google.com"), the rest off, AND privacy.html discloses it ("This site allows that frame ... motion sensors")
    {
      const v = pp(ROOT); const G = '(self "https://www.google.com")';
      const rest = ['camera', 'geolocation', 'magnetometer', 'microphone', 'payment'].every((n) => feat(v, n) === '()');
      const allOff = rest && feat(v, 'accelerometer') === '()' && feat(v, 'gyroscope') === '()';
      const deleg = rest && feat(v, 'accelerometer') === G && feat(v, 'gyroscope') === G;
      let state = allOff ? 'all off' : deleg ? 'Street View frame only' : 'NOT AS DESIGNED';
      if (deleg) {
        const pv = await gett('/privacy'); const text = (pv.body || '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style)[\s\S]*?<\/\1>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        if (!/allows that frame[^.]*motion sensors/i.test(text)) { state = 'delegated but /privacy does not disclose it'; good = false; }
      }
      if (!(allOff || deleg)) good = false;
      ev.push(`/: accelerometer${feat(v, 'accelerometer')} gyroscope${feat(v, 'gyroscope')} camera${feat(v, 'camera')} geolocation${feat(v, 'geolocation')} ${state}`);
    }
    for (const p of ['/embed', '/dashboard']) {
      const r = await head(p); const v = pp(r);
      const off = ['camera', 'geolocation', 'accelerometer', 'gyroscope', 'magnetometer', 'microphone'].every((n) => feat(v, n) === '()');
      if (!off) good = false; ev.push(`${p}: camera${feat(v, 'camera')} geolocation${feat(v, 'geolocation')} ${off ? 'off' : 'NOT OFF'}`);
    }
    const ar = await head('/ar');
    if (ar.status === 200) { const v = pp(ar); const on = ['camera', 'geolocation', 'accelerometer', 'gyroscope', 'magnetometer'].every((n) => feat(v, n) === '(self)') && feat(v, 'microphone') === '()'; if (!on) good = false; ev.push(`/ar: camera${feat(v, 'camera')} geolocation${feat(v, 'geolocation')} ${on ? 'self only' : 'BAD'}`); }
    else { good = false; ev.push(`/ar: ${ar.status} (expected the hidden AR page to still be served)`); }
    return (good ? ok : bad)(ev);
  } },
  { id: 'E-04', audit: 'X3', title: 'CSP Report-Only lists the RUM host (connect-src) and nps.gov + google (frame-src) and has NO report endpoint yet', async run() {
    const c = cspOf(ROOT); const conn = dir(c.ro, 'connect-src') || [], fr = dir(c.ro, 'frame-src') || [];
    const rum = conn.includes('https://ingesteer.services-prod.nsvcs.net'), nps = fr.some((s) => /nps\.gov/.test(s)), goog = fr.some((s) => /www\.google\.com/.test(s));
    const noRep = !/report-(uri|to)/.test(c.ro || '');
    return (c.ro && rum && nps && goog && noRep ? ok : bad)([`report-only present: ${!!c.ro}; connect-src RUM: ${rum}; frame-src nps.gov: ${nps}, google: ${goog}; no report endpoint: ${noRep}`]);
  } },
];

// ------------------------------------------------------------------------------------------------------------------ profiles
const T0_DEFERRED = {
  'HP-01': 'D-CSP: enforcement is DG-2; T0 keeps Report-Only (the enforced header carries frame-ancestors only)',
  'HP-02': 'D-TELEMETRY: no collector exists yet; T0 invents no report endpoint',
  'HP-03': "D-CSP: 'unsafe-inline' stays in Report-Only until hashes (DG-2)",
  'HP-10': 'D-URL: canonical/redirect train S1 (T0 changes no URL form)',
  'HP-11': 'D-URL: canonical/redirect train S1 (T0 changes no URL form)',
  'HP-12': 'E5: sitemap content set is S1 (T0 only drops ar.html)',
};
const BASELINE_FAIL = { 'HP-01': 'recorded fail', 'HP-02': 'recorded fail', 'HP-03': 'recorded fail', 'HP-06': 'recorded fail (XFO DENY + frame-ancestors *)', 'HP-07': 'recorded fail (site-wide report-only leaks)',
  'HP-10': 'recorded fail', 'HP-11': 'recorded fail', 'HP-12': 'recorded fail', 'HP-13': 'recorded fail (dev pages 200)', 'HP-15': 'recorded fail (no version.json)',
  'E-01': 'netlify.app served 200', 'E-02': 'icons immutable for a year', 'E-03': 'camera/geolocation (self) on every page', 'E-04': 'no RUM host / nps.gov in the policy' };
const S1_DEFERRED = Object.fromEntries(Object.entries(T0_DEFERRED).filter(([id]) => !['HP-10', 'HP-11', 'HP-12'].includes(id)));   // S1 executes D-URL: only the CSP rows stay open (DG-2)
const expectFail = (id) => (PROFILE === 't0' ? T0_DEFERRED[id] : PROFILE === 's1' ? S1_DEFERRED[id] : PROFILE === 'baseline' ? BASELINE_FAIL[id] : null) || null;

// ------------------------------------------------------------------------------------------------------------------ main
let EXPECT_RELEASE = opt('expect-release', null); if (EXPECT_RELEASE === true) EXPECT_RELEASE = null;
let HOST_CHECK = String(opt('host-check', 'auto'));

async function main() {
  let stop = null;
  const distArg = opt('dist', null);
  if (distArg && distArg !== true) {
    const dist = path.resolve(process.cwd(), String(distArg));
    if (!fs.existsSync(dist)) { console.error(`dist not found: ${dist}`); return 2; }
    const { createEmulator } = await import(pathToFileURL(path.join(HERE, '..', 'tools', 't0', 'config', 'emulate.mjs')).href);
    const em = await createEmulator({ dist, port: Number(opt('port', 0)) });
    stop = () => em.close(); BASE = new URL(em.url); LOCAL = true;
    if (!EXPECT_RELEASE) { try { EXPECT_RELEASE = JSON.parse(fs.readFileSync(path.join(dist, 'version.json'), 'utf8')).release; } catch { /* legacy tree has no version.json */ } }
    if (HOST_CHECK === 'auto') HOST_CHECK = 'run';
  } else {
    const u = positional[0]; if (!u) { console.error('usage: node ops/headers-probe.mjs <baseUrl> | --dist <dir>   (see the header of this file)'); return 2; }
    BASE = new URL(u);
    if (HOST_CHECK === 'auto') HOST_CHECK = /^(www\.)?gettysburginteractivemap\.com$/.test(BASE.hostname) ? 'run' : 'skip';
    if (HOST_CHECK === 'off') HOST_CHECK = 'skip';
  }
  const results = [];
  try {
    ROOT = await gett('/');
    if (ROOT.status !== 200) throw Object.assign(new Error(`GET / answered ${ROOT.status}`), { network: true });
    for (const p of [...PROBES, ...EXTRAS]) {
      let r;
      try { r = await p.run(); } catch (e) { if (!e.network) throw e; r = { error: e.message, evidence: [`ERROR ${e.message}`] }; }
      const reason = expectFail(p.id); const expected = reason ? 'FAIL' : 'PASS';
      let actual, verdict;
      if (r.error) { actual = 'ERROR'; verdict = 'ERROR'; }
      else if (r.skip) { actual = 'SKIP'; verdict = 'SKIP'; }
      else { actual = r.ok ? 'PASS' : 'FAIL'; verdict = actual === expected ? (expected === 'FAIL' ? 'OK (expected fail)' : 'OK') : expected === 'PASS' ? 'UNEXPECTED FAIL' : 'UNEXPECTED PASS'; }
      results.push({ id: p.id, audit: p.audit, title: p.title, expected, actual, verdict, why: reason, evidence: r.evidence });
    }
  } catch (e) {
    if (stop) await stop();
    console.error(`probe run failed: ${e.message}`); return 2;
  }
  if (stop) await stop();

  const target = LOCAL ? `${String(distArg)} (local emulation)` : BASE.href;
  const w = (s, n) => (s + ' '.repeat(n)).slice(0, n);
  if (flag('md')) {
    console.log(`Target: ${target}, profile ${PROFILE}\n\n| ID | Audit | Probe | Expected | Actual | Verdict | Evidence |\n|---|---|---|---|---|---|---|`);
    for (const r of results) console.log(`| ${r.id} | ${r.audit} | ${r.title.replace(/\|/g, '/')} | ${r.expected}${r.why ? ' (' + r.why.replace(/\|/g, '/') + ')' : ''} | ${r.actual} | ${r.verdict} | ${r.evidence.join('; ').replace(/\|/g, '/')} |`);
  } else {
    console.log(`target: ${target}   profile: ${PROFILE}${EXPECT_RELEASE ? `   release: ${EXPECT_RELEASE}` : ''}`);
    console.log(`${w('ID', 6)} ${w('EXPECT', 7)} ${w('ACTUAL', 7)} ${w('VERDICT', 20)} PROBE`);
    for (const r of results) {
      console.log(`${w(r.id, 6)} ${w(r.expected, 7)} ${w(r.actual, 7)} ${w(r.verdict, 20)} [${r.audit}] ${r.title}`);
      if (r.why) console.log(`${' '.repeat(42)}expected fail: ${r.why}`);
      for (const e of r.evidence) console.log(`${' '.repeat(42)}${e}`);
    }
  }
  const count = (v) => results.filter((r) => r.verdict.startsWith(v)).length;
  const summary = { target, profile: PROFILE, release: EXPECT_RELEASE, total: results.length, ok: count('OK'), unexpectedFail: count('UNEXPECTED FAIL'), unexpectedPass: count('UNEXPECTED PASS'), errors: count('ERROR'), skipped: count('SKIP') };
  console.log(`\n${summary.ok}/${summary.total} as expected, ${summary.unexpectedFail} unexpected FAIL, ${summary.unexpectedPass} unexpected PASS, ${summary.errors} error, ${summary.skipped} skipped`);
  const jf = opt('json', null); if (jf && jf !== true) { fs.mkdirSync(path.dirname(path.resolve(jf)), { recursive: true }); fs.writeFileSync(jf, JSON.stringify({ summary, results }, null, 2) + '\n'); }
  if (summary.errors) return 2;
  if (summary.unexpectedFail || (flag('strict-profile') && summary.unexpectedPass)) return 1;
  return 0;
}
process.exitCode = await main();

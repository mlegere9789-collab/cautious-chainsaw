#!/usr/bin/env node
// ops/walkthrough-policy-experiment.mjs - the experiment behind ops/header-decisions.md section 2 (Virtual Walkthrough, Google Street View frame,
// Permissions-Policy and the iframe `allow` attribute).  ONLINE: it opens the REAL https://www.google.com/maps/embed/v1/streetview frame (one load per
// variant, with the site's own embed key, from 127.0.0.1) in headless system Chrome.  It writes nothing outside tmp/<T0_AGENT>/ and prints no key or token.
//
//   node ops/walkthrough-policy-experiment.mjs <variant> [--dist release/R1c/dist] [--inject]
//
// variants (header on / and /index.html + iframe allow attribute):
//   asbuilt          the dist exactly as built (no change)
//   nohdr            Permissions-Policy removed for / and /index.html; no attribute      (what a legacy-like page does for the cross-origin frame)
//   off              accelerometer=() etc. as the first R1c build had it; no attribute
//   pp-google        header names https://www.google.com (with self); NO attribute        -> a header alone cannot delegate
//   pp-google+allow  header names it AND allow="accelerometer; gyroscope; magnetometer; fullscreen"
//   off+allow        attribute but the header still `()`                                  -> the parent's header still blocks
//   min+allow        header (self + google) for accelerometer + gyroscope only AND allow="accelerometer; gyroscope"   (what R1c ships with the legal opt-in)
//   min2+allow       like min+allow but the header WITHOUT `self`                         -> Chrome 153 refuses the delegation
// --inject lets the page's map use real Mapbox tiles through the harness (Referer injected, capped); default blocks them (then two Mapbox "Failed to fetch"
// console errors are the test's own doing, not the Walkthrough's).  Output: the top-level policy, the iframe attribute, and every console message
// after the Walkthrough was opened that is an error, a warning or mentions permissions/sensors.  Reproduced results (Chrome 153.0.8010.54, 2026-09-30):
// ops/header-decisions.md section 2.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.env.T0_AGENT ||= 'walkthrough-policy';
process.env.T0_PORT_BASE ||= '8300';
const lib = await import(pathToFileURL(path.join(REPO, 'tests/t0/lib.mjs')).href);
const { openSession, sleep, chooseLayout, waitForApp, PORT_BASE } = lib;
const { createEmulator } = await import(pathToFileURL(path.join(REPO, 'tools/t0/config/emulate.mjs')).href);

const variant = process.argv[2];
const VARIANTS = ['asbuilt', 'nohdr', 'off', 'pp-google', 'pp-google+allow', 'off+allow', 'min+allow', 'min2+allow'];
if (!VARIANTS.includes(variant)) { console.error(`usage: node ops/walkthrough-policy-experiment.mjs <${VARIANTS.join('|')}> [--dist <dist>] [--inject]`); process.exit(2); }
const di = process.argv.indexOf('--dist');
const SRC = path.resolve(REPO, di > 0 ? process.argv[di + 1] : 'release/R1c/dist');
const work = path.join(REPO, 'tmp', process.env.T0_AGENT, 'exp', variant.replace(/\+/g, '_'));
fs.rmSync(work, { recursive: true, force: true });
fs.cpSync(SRC, work, { recursive: true });

const G = '"https://www.google.com"';
const PP = {
  off: 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=()',
  both: `accelerometer=(self ${G}), camera=(), geolocation=(), gyroscope=(self ${G}), magnetometer=(self ${G}), microphone=(), payment=()`,
  min: `accelerometer=(self ${G}), camera=(), geolocation=(), gyroscope=(self ${G}), magnetometer=(), microphone=(), payment=()`,
  min2: `accelerometer=(${G}), camera=(), geolocation=(), gyroscope=(${G}), magnetometer=(), microphone=(), payment=()`,
};
const plan = {
  asbuilt: { pp: undefined, allow: undefined }, nohdr: { pp: null, allow: undefined }, off: { pp: PP.off, allow: undefined },
  'pp-google': { pp: PP.both, allow: undefined }, 'pp-google+allow': { pp: PP.both, allow: 'accelerometer; gyroscope; magnetometer; fullscreen' },
  'off+allow': { pp: PP.off, allow: 'accelerometer; gyroscope; magnetometer; fullscreen' }, 'min+allow': { pp: PP.min, allow: 'accelerometer; gyroscope' },
  'min2+allow': { pp: PP.min2, allow: 'accelerometer; gyroscope' },
}[variant];

if (plan.pp !== undefined) {
  let cur = null;
  const lines = fs.readFileSync(path.join(work, '_headers'), 'utf8').split('\n').map((l) => {
    if (/^\S/.test(l)) cur = l.trim();
    if ((cur === '/' || cur === '/index.html') && /^\s*Permissions-Policy:/.test(l)) return plan.pp === null ? null : `  Permissions-Policy: ${plan.pp}`;
    return l;
  }).filter((l) => l !== null);
  fs.writeFileSync(path.join(work, '_headers'), lines.join('\n'));
}
const version = JSON.parse(fs.readFileSync(path.join(work, 'version.json'), 'utf8'));
const entryFile = path.join(work, 'assets', version.entry);
let entry = fs.readFileSync(entryFile, 'utf8');
// the dist may already carry the shipped attribute (R1c); put the variant's attribute (or none) in its place
entry = entry.replace(',allow:"accelerometer; gyroscope"', '');
if (plan.allow) {
  const find = 'allowFullScreen:!0,title:c.name})';
  if (entry.split(find).length !== 2) throw new Error(`the Street View iframe anchor was not found exactly once (${entry.split(find).length - 1})`);
  entry = entry.replace(find, `allowFullScreen:!0,allow:"${plan.allow}",title:c.name})`);
} else if (variant === 'asbuilt') entry = fs.readFileSync(entryFile, 'utf8');
fs.writeFileSync(entryFile, entry);

const mask = (x) => String(x).replace(/(key|access_token)=[^&\s"']+/g, '$1=<redacted>');
const em = await createEmulator({ dist: work, port: PORT_BASE });
const S = await openSession({ profile: `exp-${variant.replace(/\+/g, '_')}`, cdpPort: PORT_BASE + 1, tiles: process.argv.includes('--inject') ? 'inject' : 'block' });
const msgs = [];
S.page.on('console', (m) => msgs.push({ type: m.type(), text: mask(m.text()).slice(0, 260), url: mask(m.location().url || '').slice(0, 90) }));
try {
  await S.page.goto(`http://127.0.0.1:${PORT_BASE}/`, { waitUntil: 'load' });
  await chooseLayout(S.page, 'desktop').catch(() => {});
  await waitForApp(S.page, 40000);
  await sleep(1500);
  const before = msgs.length;
  await S.page.getByText('Virtual Walkthrough').first().click();
  await sleep(9000);
  const top = await S.page.evaluate(() => { const p = document.permissionsPolicy || document.featurePolicy; return ['accelerometer', 'gyroscope', 'magnetometer'].map((f) => `${f}:${p.allowsFeature(f) ? 1 : 0}`).join(' '); });
  const iframes = await S.page.evaluate(() => [...document.querySelectorAll('iframe')].map((i) => ({ src: i.src.replace(/key=[^&]+/, 'key=<redacted>').slice(0, 70), allow: i.getAttribute('allow') })));
  const interesting = msgs.slice(before).filter((m) => m.type === 'error' || m.type === 'warning' || /ermission|policy|accelerometer|deviceorientation|gyroscope|sensor/i.test(m.text));
  console.log(JSON.stringify({ variant, rootPermissionsPolicy: plan.pp === undefined ? '(as built)' : plan.pp === null ? '(none)' : plan.pp.slice(0, 120), topLevelAllows: top, iframes }, null, 1));
  console.log(`console messages after opening the Walkthrough: ${msgs.length - before}; errors/warnings/policy: ${interesting.length}`);
  for (const m of interesting) console.log(`  [${m.type}] ${m.text}  (${m.url})`);
  console.log(`emulator header conflicts: ${em.conflicts.length}`);
} finally { await S.close(); await em.close(); }

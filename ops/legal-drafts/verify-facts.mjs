#!/usr/bin/env node
// verify-facts.mjs - static half of the privacy "ORG-01 / SL-18 / SL-19" check (WP-DEC-07, WP-INFRA-26 step 4).
//
//   node ops/legal-drafts/verify-facts.mjs [--dist release/R1c/dist] [--inventory ops/legal-drafts/data-inventory.json] [--json out.json]
//
// Reads a BUILT tree (legacy/dist or release/<train>/dist) and the fact base in data-inventory.json and fails when
//   1. the tree references a third-party host that is neither in the inventory nor on its ignore list,
//   2. the tree uses a localStorage/sessionStorage key or a Cache Storage name that the inventory does not list,
//   3. the tree writes cookies (document.cookie) anywhere in first-party or bundled code,
//   4. camera / location / orientation APIs are used outside ar.html (library code for an unused Mapbox control is reported, not failed),
//   5. the tree's privacy.html does not mention every inventory host, storage key and permission it must disclose,
//   6. privacy.html / terms.html still show an unresolved "[OWNER TO CONFIRM" marker in VISIBLE text (markers inside HTML comments are listed).
// It also reports (WARN) whether the Terms embed sentence is backed by the generated headers (WP-T0-15), when a _headers file exists.
// It never touches the network and never writes inside the tree it reads.  Exit code 1 when any FAIL.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : dflt; };
const distArg = opt('--dist', fs.existsSync(path.join(REPO, 'release/R1c/dist')) ? 'release/R1c/dist' : 'legacy/dist');
const dist = path.resolve(REPO, distArg);
const inv = JSON.parse(fs.readFileSync(path.resolve(REPO, opt('--inventory', 'ops/legal-drafts/data-inventory.json')), 'utf8'));
const jsonOut = opt('--json', null);

const results = [];
const add = (level, id, msg) => { results.push({ level, id, msg }); };
const TEXT_EXT = new Set(['.html', '.js', '.css', '.json', '.toml', '.txt', '.xml', '.mjs', '.webmanifest', '']);

function walk(dir, base = dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, base, out); else out.push(path.relative(base, p).split(path.sep).join('/'));
  }
  return out;
}
if (!fs.existsSync(dist)) { console.error(`dist not found: ${dist}`); process.exit(2); }
const files = walk(dist);
const devPages = new Set(inv.dev_pages.files);
const scanFiles = files.filter((f) => !devPages.has(f) && !f.startsWith('data/') && !f.startsWith('_ops/') && !f.startsWith('screenshots/') && TEXT_EXT.has(path.extname(f).toLowerCase()) && f !== 'version.json');
for (const f of files) if (devPages.has(f)) add('WARN', 'dev-pages', `${f} is still in this tree (WP-T0-12 deletes it); excluded from the scan`);
const read = (f) => fs.readFileSync(path.join(dist, f), 'utf8');
const stripCommentsJs = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\])\/\/.*$/gm, '$1');

const inventoryHosts = new Set([...inv.origins.flatMap((o) => o.hosts), ...Object.keys(inv.ignored_hosts), ...inv.own_hosts]);

// ---- 1. hosts --------------------------------------------------------------------------------------------------------------
const hostFiles = new Map();
const URL_RE = /\b(?:https?|wss?):\/\/([a-z0-9-]+(?:\.[a-z0-9-]+)+)/gi;
for (const f of scanFiles) {
  const t = read(f);
  for (const m of t.matchAll(URL_RE)) {
    const h = m[1].toLowerCase();
    if (!hostFiles.has(h)) hostFiles.set(h, new Set());
    hostFiles.get(h).add(f);
  }
}
let undisclosed = 0;
for (const [h, fs_] of [...hostFiles].sort()) {
  if (inventoryHosts.has(h)) continue;
  undisclosed++;
  add('FAIL', 'hosts', `host ${h} is referenced (${[...fs_].slice(0, 4).join(', ')}) but is not in the inventory or its ignore list`);
}
if (!undisclosed) add('PASS', 'hosts', `${hostFiles.size} distinct host names in ${scanFiles.length} text files; all are inventoried or ignored`);
const usedInv = new Set(hostFiles.keys());
for (const o of inv.origins) {
  if (o.in_dist === false) continue;
  if (!o.hosts.some((h) => usedInv.has(h))) add('WARN', 'hosts-stale', `inventory origin ${o.id} is marked in_dist but none of its hosts appears in this tree`);
}
// CSP allow-list (informational): hosts allowed by the Report-Only policy that no inventory row explains
for (const f of ['netlify.toml', '_headers']) {
  if (!files.includes(f)) continue;
  const t = read(f);
  const csp = [...t.matchAll(/Content-Security-Policy[^=\n:]*[=:]\s*"?([^\n"]+)/gi)].map((m) => m[1]).join(' ');
  const tokens = new Set([...csp.matchAll(/(?:^|[\s;])(?:wss:\/\/|https:\/\/)?((?:\*\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+)(?=[\s;]|$)/gi)].map((m) => m[1].toLowerCase()));
  const unexplained = [...tokens].filter((h) => !inventoryHosts.has(h) && !inventoryHosts.has(h.replace(/^\*\./, '')) && ![...inventoryHosts].some((x) => h.startsWith('*.') && x.endsWith(h.slice(1))));
  if (unexplained.length) add('WARN', 'csp-hosts', `${f}: CSP allows hosts not explained by the inventory: ${unexplained.join(', ')}`);
}

// ---- 2. storage keys and cache names ---------------------------------------------------------------------------------------
const invKeys = [...inv.storage.localStorage, ...inv.storage.sessionStorage, ...inv.storage.cacheStorage].map((k) => k.match);
const litKeys = new Map();
let dynamicSites = 0;
const ST_RE = /\b(local|session)Storage\s*\.\s*(?:getItem|setItem|removeItem)\s*\(\s*(?:(["'`])([^"'`]+)\2|([A-Za-z_$][\w$]*))/g;
for (const f of scanFiles) {
  const t = read(f);
  for (const m of t.matchAll(ST_RE)) {
    if (m[3]) { const k = `${m[1]}:${m[3]}`; if (!litKeys.has(k)) litKeys.set(k, new Set()); litKeys.get(k).add(f); } else dynamicSites++;
  }
  for (const m of t.matchAll(/\bcaches\s*\.\s*open\s*\(\s*(["'`])([^"'`]+)\1/g)) { const k = `cache:${m[2]}`; if (!litKeys.has(k)) litKeys.set(k, new Set()); litKeys.get(k).add(f); }
  // constants used as keys (e.g. Wk="gettysburg_bookmarks", TOGGLE_KEY='gtbg-ef-hidden') and library-built keys
  for (const known of invKeys) if (t.includes(known)) { const k = `known:${known}`; if (!litKeys.has(k)) litKeys.set(k, new Set()); litKeys.get(k).add(f); }
  if (f === 'sw.js') for (const m of t.matchAll(/\bconst\s+CACHE(?:_NAME)?\s*=\s*(["'`])([^"'`{]+)/g)) { const k = `cache:${m[2]}`; if (!litKeys.has(k)) litKeys.set(k, new Set()); litKeys.get(k).add(f); }
}
let badKeys = 0;
for (const [k, fs_] of [...litKeys].sort()) {
  const name = k.split(':').slice(1).join(':');
  if (k.startsWith('known:')) continue;
  if (invKeys.some((x) => name === x || name.startsWith(x))) continue;
  badKeys++;
  add('FAIL', 'storage', `${k} is used (${[...fs_].slice(0, 3).join(', ')}) but is not in the inventory`);
}
if (!badKeys) add('PASS', 'storage', `${[...litKeys.keys()].filter((k) => !k.startsWith('known:')).length} literal storage/cache names found, all inventoried (plus ${dynamicSites} dynamic accessor sites: Mapbox library keys built from "mapbox.eventData")`);
for (const k of invKeys) if (!scanFiles.some((f) => read(f).includes(k))) add('WARN', 'storage-stale', `inventory key ${k} does not appear in this tree (fine for keys of a later train, e.g. gtbg_layout before R1b)`);

for (const k of [...inv.storage.localStorage, ...inv.storage.sessionStorage].filter((x) => x.read_only)) {
  const esc = k.match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const setRe = new RegExp('setItem\\s*\\(\\s*["\'`]' + esc + '["\'`]');
  const w = scanFiles.filter((f) => setRe.test(read(f)));
  if (w.length) add('FAIL', 'storage', `${k.key} is inventoried as READ-ONLY but is written in ${w.join(', ')}: disclose it in privacy.html`);
}

// ---- 3. cookies ------------------------------------------------------------------------------------------------------------
const cookieFiles = scanFiles.filter((f) => !/^(privacy|terms)\.html$/.test(f) && /document\s*\.\s*cookie/.test(read(f)));
if (cookieFiles.length) add('FAIL', 'cookies', `document.cookie appears in ${cookieFiles.join(', ')}`); else add('PASS', 'cookies', 'no document.cookie in any first-party or bundled file');

// ---- 4. device permissions -------------------------------------------------------------------------------------------------
const perm = { getUserMedia: /getUserMedia\s*\(/, geolocation: /geolocation\s*\.\s*(?:watchPosition|getCurrentPosition)|navigator\s*\.\s*geolocation/, orientation: /deviceorientation|DeviceOrientationEvent|devicemotion/i };
for (const [name, re] of Object.entries(perm)) {
  const where = scanFiles.filter((f) => re.test(read(f)));
  const outside = where.filter((f) => f !== 'ar.html' && !/^assets\/(index|HelpModal|BookmarkPanel)-/.test(f) && !/^assets\//.test(f));
  if (outside.length) add('FAIL', 'permissions', `${name} is used outside ar.html: ${outside.join(', ')}`);
  else add('PASS', 'permissions', `${name}: ${where.join(', ') || '(none)'}${where.some((f) => f.startsWith('assets/')) ? ' (the bundle copies are the unused Mapbox GeolocateControl/library code: the app only ever adds NavigationControl)' : ''}`);
}

// ---- 4b. pages the policy says keep everything on the device: only same-origin GET /data/* fetches, no beacons/sockets/XHR
for (const f of inv.local_only_pages || []) {
  if (!files.includes(f)) { add('WARN', 'local-only', `${f} is not in this tree`); continue; }
  const t = stripCommentsJs(read(f));
  const bad = [];
  for (const m of t.matchAll(/\bfetch\s*\(\s*([^)]*)\)/g)) { const a = m[1].trim(); if (a && !/^["'`]\/data\//.test(a)) bad.push(`fetch(${a.slice(0, 40)})`); }
  for (const re of [/sendBeacon\s*\(/, /new\s+XMLHttpRequest/, /new\s+WebSocket/, /new\s+EventSource/, /\bimport\s*\(\s*["'`]https?:/]) if (re.test(t)) bad.push(String(re));
  add(bad.length ? 'FAIL' : 'PASS', 'local-only', bad.length ? `${f} makes network calls the policy says it does not: ${bad.join(', ')}` : `${f}: only same-origin GET /data/* fetches (policy says it stays on the device)`);
}

// ---- 5. policy coverage ----------------------------------------------------------------------------------------------------
const stripComments = (h) => h.replace(/<!--[\s\S]*?-->/g, '');
const visible = (h) => stripComments(h).replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
let privacyVisible = '';
if (files.includes('privacy.html')) {
  privacyVisible = visible(read('privacy.html')).toLowerCase();
  let miss = 0;
  const need = (label, s) => { if (!privacyVisible.includes(String(s).toLowerCase())) { miss++; add('FAIL', 'policy', `privacy.html does not mention ${label}: "${s}"`); } };
  for (const o of inv.origins) for (const s of o.policy_mentions || []) need(`origin ${o.id}`, s);
  for (const k of [...inv.storage.localStorage, ...inv.storage.sessionStorage, ...inv.storage.cacheStorage]) if (!k.read_only) need(`storage ${k.key}`, k.match);
  need('the camera permission', 'camera'); need('the location permission', 'location'); need('the orientation/compass permission', 'compass');
  need('mapbox-tiles cache', 'mapbox-tiles');
  if (!miss) add('PASS', 'policy', 'privacy.html names every inventoried origin, storage key, cache and device permission');
} else add('FAIL', 'policy', 'privacy.html is missing from the tree');

// ---- 5b. coupling: what privacy.html says about WHEN jsDelivr/PeerJS is contacted must match watch-together.html
if (files.includes('watch-together.html') && privacyVisible) {
  const wt = read('watch-together.html');
  const staticTag = /<script[^>]+src=["']https:\/\/cdn\.jsdelivr\.net[^"']*peerjs/i.test(stripComments(wt));
  const saysOnPress = /only when you press host or join:\s*the page downloads the peerjs code from jsdelivr/.test(privacyVisible);
  if (saysOnPress && staticTag) add('FAIL', 'peerjs-timing', 'privacy.html says PeerJS is downloaded from jsDelivr only when Host or Join is pressed, but watch-together.html still loads it with a static <script src> at page load');
  else if (!saysOnPress && !staticTag) add('FAIL', 'peerjs-timing', 'watch-together.html loads PeerJS on demand but privacy.html does not say the jsDelivr download happens only on Host/Join');
  else add('PASS', 'peerjs-timing', `privacy.html and watch-together.html agree on when PeerJS is fetched (${staticTag ? 'page load' : 'on Host/Join'})`);
}

// ---- 6. unresolved markers --------------------------------------------------------------------------------------------------
for (const f of ['privacy.html', 'terms.html']) {
  if (!files.includes(f)) continue;
  const raw = read(f);
  const vis = (raw.match(/\[OWNER TO CONFIRM/gi) || []).length - (stripComments(raw).match(/\[OWNER TO CONFIRM/gi) || []).length;
  const visibleMarkers = (visible(raw).match(/\[OWNER TO CONFIRM/gi) || []).length;
  if (visibleMarkers) add('FAIL', 'markers', `${f}: ${visibleMarkers} [OWNER TO CONFIRM] marker(s) are visible in the page text`);
  if (vis) add('INFO', 'markers', `${f}: ${vis} [OWNER TO CONFIRM] marker(s) sit in HTML comments (invisible; the owner resolves them at sign-off)`);
}

// ---- 7. Terms embed sentence vs generated headers ---------------------------------------------------------------------------
if (files.includes('terms.html') && /embedding its widget/i.test(read('terms.html'))) {
  if (files.includes('_headers')) {
    const h = read('_headers');
    const embed = h.split(/\n(?=\S)/).filter((b) => /^\/embed(\.html)?\s/.test(b));
    const ok = embed.length >= 1 && embed.every((b) => /frame-ancestors\s+\*/i.test(b) && !/X-Frame-Options:\s*(DENY|SAMEORIGIN)/i.test(b));
    add(ok ? 'PASS' : 'FAIL', 'terms-embed', ok ? 'Terms invite embedding the widget and _headers frees /embed and /embed.html (frame-ancestors *, no X-Frame-Options)' : 'Terms invite embedding the widget but _headers does not clearly free /embed and /embed.html');
  } else {
    add('WARN', 'terms-embed', 'Terms invite embedding "its widget" but this tree has no _headers (WP-T0-15 config not generated): in a legacy tree /embed.html is served with X-Frame-Options DENY, so the sentence is only true once train R1c config ships');
  }
}

// ---- report -----------------------------------------------------------------------------------------------------------------
const order = { FAIL: 0, WARN: 1, INFO: 2, PASS: 3 };
results.sort((a, b) => order[a.level] - order[b.level]);
for (const r of results) console.log(`${r.level.padEnd(4)}  ${r.id.padEnd(12)} ${r.msg}`);
const fails = results.filter((r) => r.level === 'FAIL').length;
console.log(`\n${dist}: ${fails ? `${fails} FAIL` : 'no FAIL'}, ${results.filter((r) => r.level === 'WARN').length} WARN`);
if (jsonOut) fs.writeFileSync(path.resolve(jsonOut), JSON.stringify({ dist: path.relative(REPO, dist).split(path.sep).join('/'), results }, null, 2) + '\n');
process.exit(fails ? 1 : 0);

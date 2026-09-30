#!/usr/bin/env node
// Generates tools/t0/patches/PG-maps.json (page group "PG-maps", first train R1a) from legacy/dist, asserting every anchor.
//   node tools/t0/assets-src/gen_pg_maps.mjs [--check]     --check: fail if the committed PG-maps.json differs from what would be generated
//
// WP-T0-13  the 8 map sub-pages: Mapbox GL becomes non-blocking WITHOUT breaking them.
//             head:   preconnect (CORS-mode, matches the SRI/CORS fetches) + mapbox-gl.css and mapbox-gl.js pinned to the SAME 3.24.1 files
//                     with SRI, the script `defer`red (plain defer alone throws `mapboxgl is not defined`: the inline script runs at parse time)
//             body:   the inline `(async function () { ... })();` becomes a DOMContentLoaded listener; deferred scripts run before DCL, so the
//                     token is still set before `new mapboxgl.Map` and nothing else in the page changes
//             watch-together: PeerJS leaves the head; Host / Join set "connecting..." first, let it paint, then load the SRI-pinned 1.5.4 file
// WP-T0-14  og:image / twitter:image of the 21 pages -> /og/card-r1.png (new path so crawler caches refresh; the corrupt day3.png is replaced too)
// Pages mix LF and CRLF files (camera, compare, sandbox, viewshed are CRLF): every multi-line anchor/replacement takes the page's own
// line ending.  Single-line anchors are preferred so other groups' patches cannot overlap them.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..');
const LEGACY = path.join(REPO, 'legacy', 'dist');
const OUT = path.join(REPO, 'tools', 't0', 'patches', 'PG-maps.json');
const SRI = JSON.parse(fs.readFileSync(path.join(HERE, 'sri.json'), 'utf8'));
const eolOf = (text) => (text.includes('\r\n') ? '\r\n' : '\n');
const withEol = (s, nl) => s.replace(/\r?\n/g, nl);
const page = (name) => fs.readFileSync(path.join(LEGACY, name + '.html'), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;

const MAP_PAGES = ['camera', 'cinematic-export', 'compare', 'ground-remembers', 'immersive', 'sandbox', 'viewshed', 'watch-together'];
const MB = 'https://api.mapbox.com/mapbox-gl-js/v3.24.1';
const CSS_OLD = `<link href="${MB}/mapbox-gl.css" rel="stylesheet" />`;
const JS_OLD = `<script src="${MB}/mapbox-gl.js"></script>`;
if (SRI['mapbox-gl.js'].url !== `${MB}/mapbox-gl.js` || SRI['mapbox-gl.css'].url !== `${MB}/mapbox-gl.css`) throw new Error('sri.json does not pin the 3.24.1 files');
const CSS_NEW = (`<link rel="preconnect" href="https://api.mapbox.com" crossorigin />\n<link href="${MB}/mapbox-gl.css" rel="stylesheet" integrity="${SRI['mapbox-gl.css'].integrity}" crossorigin="anonymous" />`);
const JS_NEW = `<script defer src="${MB}/mapbox-gl.js" integrity="${SRI['mapbox-gl.js'].integrity}" crossorigin="anonymous"></script>`;
const OPEN_OLD = '(async function() {';
const OPEN_NEW = "document.addEventListener('DOMContentLoaded', async function () {";
const CLOSE_OLD = '})();\n</script>';
const CLOSE_NEW = '});\n</script>';

const patches = [];
const P = (id, target, find, repl, expect = 1, note) => patches.push({ id, target, find, repl, expect, ...(note ? { note } : {}) });

// ------------------------------------------------------------------ WP-T0-13: the 8 map pages
for (const name of MAP_PAGES) {
  const t = page(name), target = `${name}.html`, nl = eolOf(t), E = (x) => withEol(x, nl);
  for (const [what, needle] of [['css link', CSS_OLD], ['script tag', JS_OLD], ['IIFE open', OPEN_OLD], ['IIFE close', E(CLOSE_OLD)]]) {
    if (count(t, needle) !== 1) throw new Error(`${target}: ${what} anchor occurs ${count(t, needle)} times in legacy/dist (need exactly 1)`);
  }
  if (!t.includes('mapboxgl.accessToken = MAPBOX_TOKEN;')) throw new Error(`${target}: token line missing`);
  P(`maps:${name}:css`, target, CSS_OLD, E(CSS_NEW), 1, 'WP-T0-13 preconnect + SRI-pinned stylesheet (same 3.24.1 file)');
  P(`maps:${name}:js`, target, JS_OLD, JS_NEW, 1, 'WP-T0-13 mapbox-gl.js no longer parser-blocking: defer + SRI (same 3.24.1 file)');
  P(`maps:${name}:dcl-open`, target, OPEN_OLD, OPEN_NEW, 1, 'WP-T0-13 inline script waits for DOMContentLoaded (after the deferred library ran)');
  P(`maps:${name}:dcl-close`, target, E(CLOSE_OLD), E(CLOSE_NEW), 1, 'WP-T0-13 closes the DOMContentLoaded listener');
}

// ------------------------------------------------------------------ WP-T0-13: PeerJS on demand (watch-together)
{
  const t = page('watch-together'), target = 'watch-together.html', crlf = (x) => withEol(x, eolOf(t));
  const PEER_TAG = `<script src="${SRI['peerjs.min.js'].url}"></script>`;
  const CHECK_OLD = crlf(`  if (typeof Peer === 'undefined') {
    setSyncStatus('unavailable (couldn\\'t load the connection library)', 'error');
    document.getElementById('host-btn').disabled = true;
    document.getElementById('join-btn').disabled = true;
  }`);
  const LOADER = crlf(`  // Live Sync: PeerJS (about 90 KB) is not part of the page load.  It is fetched the first time someone clicks Host or Join, after
  // the "connecting..." status has been painted, and pinned to the exact 1.5.4 file with SRI.
  const PEERJS_SRC = '${SRI['peerjs.min.js'].url}';
  const PEERJS_SRI = '${SRI['peerjs.min.js'].integrity}';
  let peerLibPromise = null;
  function loadPeerJs() {
    if (typeof Peer !== 'undefined') return Promise.resolve();
    if (!peerLibPromise) {
      peerLibPromise = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = PEERJS_SRC; s.integrity = PEERJS_SRI; s.crossOrigin = 'anonymous';
        s.onload = () => (typeof Peer !== 'undefined' ? resolve() : reject(new Error('PeerJS loaded but did not define Peer')));
        s.onerror = () => reject(new Error('PeerJS could not be loaded'));
        document.head.appendChild(s);
      }).catch((err) => { peerLibPromise = null; throw err; });
    }
    return peerLibPromise;
  }
  // \`start\` runs once PeerJS is available; the caller has already set the status text, which gets a frame to paint first.
  function withPeerJs(start) {
    requestAnimationFrame(() => setTimeout(() => {
      loadPeerJs().then(start, () => setSyncStatus("unavailable (couldn't load the connection library)", 'error'));
    }, 0));
  }`);
  const HOST_OPEN_OLD = crlf(`  document.getElementById('host-btn').addEventListener('click', () => {
    if (typeof Peer === 'undefined') return;
    if (peer) peer.destroy();`);
  const HOST_OPEN_NEW = crlf(`  document.getElementById('host-btn').addEventListener('click', () => {
    setSyncStatus('connecting…', 'connecting');
    withPeerJs(startHost);
  });
  function startHost() {
    if (peer) peer.destroy();`);
  const HOST_CLOSE_OLD = crlf(`    peer.on('error', (err) => setSyncStatus('connection error — try again', 'error'));
  });`);
  const HOST_CLOSE_NEW = crlf(`    peer.on('error', (err) => setSyncStatus('connection error — try again', 'error'));
  }`);
  const JOIN_OPEN_OLD = crlf(`  document.getElementById('join-btn').addEventListener('click', () => {
    if (typeof Peer === 'undefined') return;
    const code = document.getElementById('join-code').value.trim().toUpperCase();
    if (code.length !== 5) { setSyncStatus('enter the 5-letter code first', 'error'); return; }
    if (peer) peer.destroy();`);
  const JOIN_OPEN_NEW = crlf(`  document.getElementById('join-btn').addEventListener('click', () => {
    const code = document.getElementById('join-code').value.trim().toUpperCase();
    if (code.length !== 5) { setSyncStatus('enter the 5-letter code first', 'error'); return; }
    setSyncStatus('connecting…', 'connecting');
    withPeerJs(() => startJoin(code));
  });
  function startJoin(code) {
    if (peer) peer.destroy();`);
  const JOIN_CLOSE_OLD = crlf(`    peer.on('error', () => setSyncStatus('could not connect — check the code', 'error'));
  });`);
  const JOIN_CLOSE_NEW = crlf(`    peer.on('error', () => setSyncStatus('could not connect — check the code', 'error'));
  }`);
  for (const [what, needle] of [['peerjs tag', PEER_TAG], ['unavailable check', CHECK_OLD], ['host open', HOST_OPEN_OLD], ['host close', HOST_CLOSE_OLD], ['join open', JOIN_OPEN_OLD], ['join close', JOIN_CLOSE_OLD]]) {
    if (count(t, needle) !== 1) throw new Error(`${target}: ${what} anchor occurs ${count(t, needle)} times (need 1)`);
  }
  P('maps:watch-together:peerjs-tag', target, PEER_TAG, '<!-- PeerJS is not loaded with the page: Live Sync fetches it on demand (SRI-pinned) when someone clicks Host or Join. -->', 1, 'WP-T0-13 PeerJS leaves the head');
  P('maps:watch-together:peerjs-loader', target, CHECK_OLD, LOADER, 1, 'WP-T0-13 on-demand loader replaces the load-time availability check');
  P('maps:watch-together:host-open', target, HOST_OPEN_OLD, HOST_OPEN_NEW, 1, 'WP-T0-13 Host: status first, then load PeerJS, then startHost');
  P('maps:watch-together:host-close', target, HOST_CLOSE_OLD, HOST_CLOSE_NEW, 1, 'WP-T0-13 closes startHost');
  P('maps:watch-together:join-open', target, JOIN_OPEN_OLD, JOIN_OPEN_NEW, 1, 'WP-T0-13 Join: validate, status, load PeerJS, then startJoin(code)');
  P('maps:watch-together:join-close', target, JOIN_CLOSE_OLD, JOIN_CLOSE_NEW, 1, 'WP-T0-13 closes startJoin');
}

// ------------------------------------------------------------------ WP-T0-14: og:image / twitter:image of the 21 pages
{
  const OLD_URL = 'https://gettysburginteractivemap.com/screenshots/day3.png', NEW_URL = 'https://gettysburginteractivemap.com/og/card-r1.png';
  const OG = `<meta property="og:image" content="${OLD_URL}" />`, TW = `<meta name="twitter:image" content="${OLD_URL}" />`;
  let ogPages = 0, twPages = 0;
  for (const f of fs.readdirSync(LEGACY).filter((x) => x.endsWith('.html')).sort()) {
    const name = f.slice(0, -5), t = page(name);
    if (!t.includes(OLD_URL)) continue;
    if (count(t, OG) !== 1) throw new Error(`${f}: og:image anchor occurs ${count(t, OG)} times`);
    P(`maps:og:${name}:og-image`, f, OG, OG.replace(OLD_URL, NEW_URL), 1, 'WP-T0-14 og:image -> own card (the old file is corrupt)');
    ogPages++;
    if (t.includes(TW)) {
      if (count(t, TW) !== 1) throw new Error(`${f}: twitter:image anchor occurs ${count(t, TW)} times`);
      P(`maps:og:${name}:twitter-image`, f, TW, TW.replace(OLD_URL, NEW_URL), 1, 'WP-T0-14 twitter:image -> own card');
      twPages++;
    }
    if (t.replace(OG, '').replace(TW, '').includes(OLD_URL)) throw new Error(`${f}: another reference to ${OLD_URL} exists that no patch covers`);
  }
  if (ogPages !== 21) throw new Error(`expected 21 pages with og:image day3.png, found ${ogPages}`);
  console.log(`og:image patches: ${ogPages} pages, twitter:image patches: ${twPages} pages`);
}

const doc = {
  group: 'PG-maps',
  description: 'WP-T0-13 (8 map pages: non-blocking Mapbox GL with SRI, PeerJS on demand) and WP-T0-14 (og:image/twitter:image -> /og/card-r1.png on 21 pages). Generated by tools/t0/assets-src/gen_pg_maps.mjs; do not edit by hand.',
  patches,
};
const text = JSON.stringify(doc, null, 2) + '\n';
if (process.argv.includes('--check')) {
  const have = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (have !== text) { console.error('PG-maps.json is stale: run node tools/t0/assets-src/gen_pg_maps.mjs'); process.exit(1); }
  console.log('PG-maps.json is up to date');
} else {
  fs.writeFileSync(OUT, text);
  console.log(`wrote ${path.relative(REPO, OUT)}: ${patches.length} patches`);
}

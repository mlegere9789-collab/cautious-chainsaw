#!/usr/bin/env python3
"""R0 mechanism build on a SCRATCH copy: rename-by-release-id, chunk specifiers, index.html boot loader, new sw.js, kill switch.
Usage: python r0_build.py <bundle_js_path> <out_tree>"""
import sys, os, re, shutil, hashlib, json

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.join(HERE, 'base')
bundle_path, out = sys.argv[1], sys.argv[2]
if os.path.exists(out):
    shutil.rmtree(out)
shutil.copytree(BASE, out)


def rd(p):
    return open(os.path.join(out, p), encoding='utf8').read()


def wr(p, s):
    open(os.path.join(out, p), 'w', encoding='utf8', newline='').write(s)


def once(text, find, repl, label):
    n = text.count(find)
    assert n == 1, '%s: expected 1 match, found %d' % (label, n)
    return text.replace(find, repl)


# ---- assets: placeholder-ize the cross references, hash the whole set, then substitute
entry = open(bundle_path, encoding='utf8').read()
entry = once(entry, '"./HelpModal-CFV9T0zH.js"', '"./__HELP__"', 'entry->help')
entry = once(entry, '"./BookmarkPanel-C5YT4b5k.js"', '"./__BOOK__"', 'entry->bookmark')
help_ = rd('assets/HelpModal-CFV9T0zH.js')
book_ = rd('assets/BookmarkPanel-C5YT4b5k.js')
if os.environ.get('HELP_PATCHES') == '1':
    help_ = once(help_, '{key:"H",desc:"Toggle heatmap"},', '', 'help h09 heatmap row')
    help_ = once(help_, '445+ Union and Confederate units', 'hundreds of Union and Confederate regiments and batteries', 'help h01 445+')
    help_ = once(help_, '"Primary Sources"', '"Sources"', 'help h03 sources')
help_ = once(help_, 'from"./index-Cg8FAMXN.js"', 'from"./__ENTRY__"', 'help->entry')
book_ = once(book_, 'from"./index-Cg8FAMXN.js"', 'from"./__ENTRY__"', 'bookmark->entry')
rid = hashlib.sha256((entry + '\0' + help_ + '\0' + book_).encode('utf8')).hexdigest()[:8]
EN, HN, BN = 'index-%s.js' % rid, 'HelpModal-%s.js' % rid, 'BookmarkPanel-%s.js' % rid
entry = entry.replace('__HELP__', HN).replace('__BOOK__', BN)
help_ = help_.replace('__ENTRY__', EN)
book_ = book_.replace('__ENTRY__', EN)
css_bytes = open(os.path.join(out, 'assets/index-B4G7Z_2G.css'), 'rb').read()
CN = 'index-%s.css' % hashlib.sha256(css_bytes).hexdigest()[:8]
for old in ('index-Cg8FAMXN.js', 'HelpModal-CFV9T0zH.js', 'BookmarkPanel-C5YT4b5k.js', 'InterpolationWorker-ufiwa2-e.js', 'index-B4G7Z_2G.css'):
    os.remove(os.path.join(out, 'assets', old))          # old names are removed from THIS deploy; previous deploys keep them
wr('assets/' + EN, entry)
wr('assets/' + HN, help_)
wr('assets/' + BN, book_)
open(os.path.join(out, 'assets', CN), 'wb').write(css_bytes)

# ---- index.html
h = rd('index.html')
h = once(h, '  <link rel="modulepreload" href="/assets/index-Cg8FAMXN.js" crossorigin />\n', '', 'modulepreload')
h = once(h, '''  <link rel="preload" as="style" href="/assets/index-B4G7Z_2G.css" crossorigin
        onload="this.onload=null;this.rel='stylesheet'" />
  <noscript><link rel="stylesheet" href="/assets/index-B4G7Z_2G.css" crossorigin /></noscript>
''', '  <link rel="stylesheet" href="/assets/%s" crossorigin />\n' % CN, 'css preload swap')
for pc in ('  <link rel="preconnect" href="https://events.mapbox.com" crossorigin />\n',
           '  <link rel="preconnect" href="https://a.tiles.mapbox.com" crossorigin />\n',
           '  <link rel="preconnect" href="https://b.tiles.mapbox.com" crossorigin />\n',
           '  <link rel="dns-prefetch" href="https://api.mapbox.com" />\n',
           '  <link rel="preconnect" href="https://www.google.com" crossorigin />\n',
           '  <link rel="preconnect" href="https://maps.googleapis.com" crossorigin />\n',
           '  <link rel="preconnect" href="https://streetviewpixels-pa.googleapis.com" crossorigin />\n',
           '  <link rel="dns-prefetch" href="https://maps.googleapis.com" />\n',
           '  <link rel="dns-prefetch" href="https://www.google.com" />\n'):
    h = once(h, pc, '', 'preconnect ' + pc.strip()[:60])
h = once(h, '  <meta name="theme-color" content="#0a0a14" />\n', '  <meta name="theme-color" content="#0a0a14" />\n  <meta name="color-scheme" content="dark" />\n', 'color-scheme')
h = once(h, '      animation: boot-fade-in 0.4s ease both;\n', '', 'boot-splash fade')
# SW block (lines 255-277) -> idle registration + chunk-error guard
a = h.index('  <script>\n    // Register the service worker')
b = h.index('  </script>\n', a) + len('  </script>\n')
SWREG = '''  <script>
    // Service worker: register when the browser is idle, never reload the page (D-SW). A stale lazy chunk after a
    // deploy reloads at most once per session.
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        (window.requestIdleCallback || function (f) { setTimeout(f, 3000); })(function () {
          navigator.serviceWorker.register('/sw.js').catch(function (e) { console.warn('Service worker registration failed:', e); });
        }, { timeout: 8000 });
      });
    }
    window.addEventListener('vite:preloadError', function (ev) {
      try { if (sessionStorage.getItem('gtbg_chunk_reload')) return; sessionStorage.setItem('gtbg_chunk_reload', '1'); } catch (e) {}
      ev.preventDefault && ev.preventDefault();
      location.reload();
    });
  </script>
'''
h = h[:a] + SWREG + h[b:]
h = once(h, '  <script src="/site-nav.js"></script>\n', '  <script defer src="/site-nav.js"></script>\n', 'site-nav defer')
LOADER = '''  <script>
    // Boot after first paint (perf-cwv-02): the 2.3 MB app is imported one task after the first contentful paint, so the static
    // splash is what the browser paints and measures. Guarded: one automatic retry per session, then a visible retry button.
    (function () {
      var started = false, ENTRY = '/assets/%s';
      function fail() {
        var again = false;
        try { again = sessionStorage.getItem('gtbg_boot_retry') === '1'; if (!again) sessionStorage.setItem('gtbg_boot_retry', '1'); } catch (e) {}
        if (!again) { location.reload(); return; }
        var s = document.getElementById('boot-splash');
        if (!s) return;
        var c = s.querySelector('.boot-caption'); if (c) c.textContent = 'The map could not be loaded.';
        if (!s.querySelector('button')) {
          var b = document.createElement('button'); b.type = 'button'; b.textContent = 'Try again';
          b.style.cssText = 'font:inherit;padding:12px 22px;min-height:44px;border-radius:8px;border:1px solid #c9a24b;background:#12121e;color:#c9a24b;cursor:pointer';
          b.onclick = function () { try { sessionStorage.removeItem('gtbg_boot_retry'); } catch (e) {} location.reload(); };
          s.appendChild(b);
        }
      }
      function start() {
        if (started) return; started = true;
        setTimeout(function () { import(ENTRY).catch(fail); }, 0);
      }
      try {
        new PerformanceObserver(function (list, obs) {
          if (list.getEntriesByName('first-contentful-paint').length) { obs.disconnect(); start(); }
        }).observe({ type: 'paint', buffered: true });
      } catch (e) { addEventListener('load', function () { requestAnimationFrame(function () { setTimeout(start, 0); }); }); }
      setTimeout(start, 3000);
    })();
  </script>
''' % EN
h = once(h, '  <script type="module" crossorigin src="/assets/index-Cg8FAMXN.js"></script>\n', LOADER, 'module script')
if os.environ.get('GROUP_C_HTML') == '1':
    import json as _j
    for m in _j.load(open(os.path.join(HERE, 'mobile_patches.json'), encoding='utf8')):
        if m['target'] == 'html' and m['id'].startswith('HF-12'):
            h = once(h, m['find'], m['repl'], m['id'])
assert 'Cg8FAMXN' not in h and 'B4G7Z_2G' not in h
wr('index.html', h)

# ---- site-nav.css: remove the body entrance animation (all pages)
c = rd('site-nav.css')
c = once(c, '''/* Pure-CSS page-load fade -- no JS dependency, so content is never stuck invisible if a
   script fails; the animation simply finishes on its own. */
body { animation: gtbg-page-in 340ms ease both; }
@keyframes gtbg-page-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { body { animation: none; } }
''', '/* Page-load fade removed (R0): text painted under an opacity:0 ancestor is not counted for FCP/LCP. */\n', 'body fade')
wr('site-nav.css', c)

# ---- sw.js (new) and the kill switch (kept in the repo, not deployed)
SW = '''/* Gettysburg Interactive Map service worker, release r0 (%s).
 * Rules (D-SW): no install-time precache, no skipWaiting, no reload, never intercept navigations, cache only ok same-origin
 * responses for hashed /assets/* files, purge only gbg-* caches, leave /data/, /hx/, /api/, /.netlify/ and everything else alone. */
const CACHE = 'gbg-r0-%s';
self.addEventListener('install', function () {});
self.addEventListener('activate', function (e) {
  e.waitUntil((async function () {
    const keys = await caches.keys();
    await Promise.all(keys.filter(function (k) { return k.indexOf('gbg-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET' || req.mode === 'navigate') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.indexOf('/assets/') !== 0) return;
  e.respondWith((async function () {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req);
    if (hit) return hit;
    const res = await fetch(req);
    if (res.ok && res.status === 200 && res.type === 'basic') e.waitUntil(cache.put(req, res.clone()));
    return res;
  })());
});
''' % (rid, rid)
wr('sw.js', SW)
KILL = '''/* Kill switch: deploy this file AS /sw.js to remove the service worker and every gbg-* cache from all visitors. */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil((async function () {
    const keys = await caches.keys();
    await Promise.all(keys.filter(function (k) { return k.indexOf('gbg-') === 0; }).map(function (k) { return caches.delete(k); }));
    await self.registration.unregister();
    const cs = await self.clients.matchAll({ type: 'window' });
    cs.forEach(function (c) { try { c.navigate(c.url); } catch (e) {} });
  })());
});
'''
os.makedirs(os.path.join(out, '_ops'), exist_ok=True)
wr('_ops/sw-kill.js', KILL)

# ---- manifest of the release
man = {}
for root, _, files in os.walk(os.path.join(out, 'assets')):
    for f in files:
        p = os.path.join(root, f)
        man['assets/' + f] = dict(bytes=os.path.getsize(p), sha256=hashlib.sha256(open(p, 'rb').read()).hexdigest())
man['_release'] = dict(rid=rid, entry=EN, help=HN, bookmark=BN, css=CN)
json.dump(man, open(os.path.join(out, '_ops', 'asset-manifest.json'), 'w'), indent=1)
print('R0 built', json.dumps(man['_release']))
for k, v in sorted(man.items()):
    if k != '_release':
        print(' ', k, v['bytes'])

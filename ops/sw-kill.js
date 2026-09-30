/* Kill switch (chapter 02 appendix A.3, WP-T0-04, rollback level L2).
 * Deploy this file AS /sw.js (copy it over dist/sw.js, or use dist/_ops/sw-kill.js from any built train).  On the next
 * navigation every returning visitor's browser fetches /sw.js (it is served no-cache), installs this worker, and this
 * worker deletes every gbg-* cache, unregisters itself and re-navigates open windows.  Mapbox's own `mapbox-tiles` cache
 * is deliberately left alone.  Tested by tests/t0/r0.mjs (T0-R0-06); committed but never deployed by a normal train. */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil((async function () {
    const keys = await caches.keys();
    await Promise.all(keys.filter(function (k) { return k.indexOf('gbg-') === 0; }).map(function (k) { return caches.delete(k); }));
    await self.registration.unregister();
    const cs = await self.clients.matchAll({ type: 'window' });
    cs.forEach(function (c) { try { c.navigate(c.url); } catch (err) {} });
  })());
});

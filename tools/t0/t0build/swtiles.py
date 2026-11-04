"""The BASE1863 service-worker edit: /tiles1863/<version>/* (immutable, versioned names) is cached cache-first in the release cache, at most TILE_MAX entries, oldest dropped first.

Used by tools/t0/t0build/mechanism.py for a train whose trains.json entry says "sw_tiles": true (R1d), and by tools/t0/base1863/b63_build.py (scratch builds).  Every find must occur exactly once in
tools/t0/mechanism/sw.js.tmpl; nothing else in the worker changes.  (Moved here unchanged from b63_build.py, 2026-10-21.)
"""
from .util import BuildError

TILE_MAX = 600          # entries of /tiles1863/ in the release cache: about 24 MB at the 40 KB average tile (journey budget in BASE1863-README.md section 8)

SW_EDITS = [
    # (find, replace): every find must occur exactly once in tools/t0/mechanism/sw.js.tmpl
    (" * ok, basic responses of hashed /assets/* files (cache-first), purges",
     " * ok, basic responses of hashed /assets/* files and of the versioned /tiles1863/* tiles (cache-first), purges"),
    ("const CACHE = 'gbg-r0-{{RID}}';\n",
     "const CACHE = 'gbg-r0-{{RID}}';\n"
     "/* BASE1863: the reconstruction tiles /tiles1863/<version>/... (immutable names) are cached cache-first in the same release cache, at most TILE_MAX entries, oldest dropped first;\n"
     " * the asset entries are never evicted by it.  Nothing else changed in this worker. */\n"
     "const TILES = '/tiles1863/', TILE_MAX = %d;\n"
     "async function putTile(c, r, res) { await c.put(r, res); const ks = (await c.keys()).filter(function (k) { return new URL(k.url).pathname.indexOf(TILES) === 0; });\n"
     "  if (ks.length > TILE_MAX) await Promise.all(ks.slice(0, ks.length - TILE_MAX).map(function (k) { return c.delete(k); })); }\n" % TILE_MAX),
    ("  const u = new URL(r.url); if (u.origin !== self.location.origin || u.pathname.indexOf('/assets/') !== 0) return;\n",
     "  const u = new URL(r.url); if (u.origin !== self.location.origin) return;\n"
     "  const tile = u.pathname.indexOf(TILES) === 0; if (!tile && u.pathname.indexOf('/assets/') !== 0) return;\n"),
    ("const res = await fetch(r); if (res.ok && res.status === 200 && res.type === 'basic') e.waitUntil(c.put(r, res.clone())); return res; })());",
     "let res; try { res = await fetch(r); } catch (err) { if (tile) return Response.error(); throw err; } "
     "if (res.ok && res.status === 200 && res.type === 'basic') e.waitUntil(tile ? putTile(c, r, res.clone()) : c.put(r, res.clone())); return res; })());"),
]


def sw_with_tiles(text):
    for find, repl in SW_EDITS:
        n = text.count(find)
        if n != 1:
            raise BuildError('BASE1863 service-worker edit anchor found %d times (expected 1): %r' % (n, find[:70]))
        text = text.replace(find, repl)
    return text

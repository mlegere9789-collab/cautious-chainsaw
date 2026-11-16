"""Run (and cache) the searches listed by the row files; writes only tmp/tl-04/search_cache.json.
    python3 -I tmp/tl-04/run_searches.py [--scopes OR27,LIB,NEWS,NPS,TOWN,MED,CA]
(a scope list lets the run be made in pieces, each of a few seconds of CPU; build.py --write then re-uses the cached results as long as pattern,
scope and the scope's text files are unchanged)."""
import os, sys, time
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build as B
import tl4lib as T
B.load_rows()
scopes = None
if '--scopes' in sys.argv:
    scopes = set(sys.argv[sys.argv.index('--scopes') + 1].split(','))
specs = [s for r in T.ROWS.values() for s in r['searched'] if (scopes is None or (s['scope'] if isinstance(s['scope'], str) else 'LIST') in scopes)]
t0 = time.time()
c0 = time.process_time()
print('rows %d, searches %d (scopes %s)' % (len(T.ROWS), len(specs), sorted(scopes) if scopes else 'all'), flush=True)
res = B.run_cached(specs)
zero = sum(1 for s in specs if res[id(s)]['hits'] == 0)
print('done in %.0f s wall, %.1f s CPU; searches with zero hits: %d of %d' % (time.time() - t0, time.process_time() - c0, zero, len(specs)))

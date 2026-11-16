#!/usr/bin/env python3
"""archive.org full-text retries (public service endpoint used by the site's own search page), one paced request per query.

Usage: python3 -I fts_battery.py specs.json
Spec: {"id": "A01", "lk": [...], "q": "<query>", "maxy": 1930}
Result per spec appended to fts_attempts.jsonl: query, http, total hits, response sha256, and the first 12 hits (identifier, year, title, lending status,
up to 3 snippets). Snippets of lending-library books are leads only. Nothing here is evidence: a candidate text must be downloaded and matched verbatim.
"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'scripts'))
import rlib, fts
LOG = os.path.join(HERE, 'fts_attempts.jsonl')
for sp in json.load(open(sys.argv[1])):
    rec, d = fts.fts(sp['q'], 20)
    hs = fts.hits_of(d)
    total = d['response']['body']['hits'].get('total') if d else None
    out = {'id': sp['id'], 'lk': sp.get('lk', []), 'q': sp['q'], 'at': rec['at'], 'http': rec['http'], 'total_hits': total, 'response_sha256': rec.get('sha256'), 'response_file': rec.get('file'),
           'error': rec.get('error'), 'hits': [{'identifier': h['identifier'], 'year': h['year'], 'title': (h['title'] or '')[:90], 'lending': h.get('lending'),
                                                'snippets': [' '.join(s.split())[:260] for s in h['snippets'][:3]]} for h in hs[:12]]}
    rlib.jsonl_append(LOG, out)
    pd = [h for h in out['hits'] if h['year'] and int(h['year']) <= (sp.get('maxy') or 1930)]
    print(sp['id'], '| http', rec['http'], '| total', total, '| <=%s: %d' % (sp.get('maxy') or 1930, len(pd)), '|', sp['q'][:70], flush=True)

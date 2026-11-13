#!/usr/bin/env python3
"""archive.org full-text search (public service endpoint), one paced request per query.

Usage: python3 -I fts.py "<query>" [--max-year 1930] [--n 20] [--lk LKR-0001,...] [--why "..."]
Prints: identifier | year | title | snippet. Hits from lending-library books (modern, copyrighted) are shown for
orientation only: their snippets are leads, never evidence. Every query is logged to retry/fts_log.jsonl.
"""
import json, os, sys, urllib.parse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rlib

LOG = os.path.join(rlib.RETRY, 'fts_log.jsonl')


def fts(query, n=20, page=1):
    u = 'https://archive.org/services/search/beta/page_production/?service_backend=fts&user_query=%s&hits_per_page=%d&page=%d' % (urllib.parse.quote(query), n, page)
    dest = os.path.join(rlib.WEBDIR, 'fts', rlib.sha_bytes(u.encode())[:16] + '.json')
    rec = rlib.curl(u, dest, max_time=90)
    d = None
    if rec.get('file'):
        try:
            d = json.load(open(rlib.abspath(rec['file'])))
        except Exception:
            d = None
    return rec, d


def hits_of(d):
    out = []
    if not d:
        return out
    for h in d['response']['body']['hits']['hits']:
        f = h['fields']
        out.append({'identifier': f.get('identifier'), 'year': f.get('year'), 'title': f.get('title'), 'creator': f.get('creator'),
                    'collection': f.get('collection'), 'lending': f.get('lending___status'), 'snippets': (h.get('highlight') or {}).get('text', [])})
    return out


if __name__ == '__main__':
    a = sys.argv[1:]
    q = a[0]
    n = int(a[a.index('--n') + 1]) if '--n' in a else 20
    maxy = int(a[a.index('--max-year') + 1]) if '--max-year' in a else None
    lk = a[a.index('--lk') + 1].split(',') if '--lk' in a else []
    why = a[a.index('--why') + 1] if '--why' in a else ''
    rec, d = fts(q, n)
    hs = hits_of(d)
    total = d['response']['body']['hits'].get('total') if d else None
    shown = []
    for h in hs:
        if maxy and h['year'] and int(h['year']) > maxy:
            continue
        shown.append(h)
        print('%s | %s | %s | %s' % (h['identifier'], h['year'], (h['title'] or '')[:70], h.get('lending') or ''))
        for s in h['snippets'][:3]:
            print('     > ' + ' '.join(s.split())[:230])
    print('---- http %s total=%s shown=%d' % (rec['http'], total, len(shown)))
    rlib.jsonl_append(LOG, {'at': rec['at'], 'query': q, 'why': why, 'lk': lk, 'http': rec['http'], 'total_hits': total, 'shown_max_year': maxy,
                           'pd_candidates': [x['identifier'] for x in shown][:15], 'response_sha256': rec.get('sha256'), 'response_file': rec.get('file')})

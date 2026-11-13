#!/usr/bin/env python3
"""Chronicling America searches for the lookup retries (documented JSON search of loc.gov; at most 1 request per 5 s on loc.gov).

Usage: python3 -I ca_retry.py "<query>" <date-from> <date-to> [--lk LKR-..,LKR-..] [--why "..."] [--text N]
Every search is logged to retry/ca_log.jsonl (what was asked, URL, http, hit count, sha256 of the saved JSON).
--text N: fetch the OCR text (tile.loc.gov text service) of the first N result pages and save under tmp/library/web/retry/ca/pages.
Nothing is solved or bypassed: a challenge page or a refusal is logged as such.
"""
import json, os, sys, urllib.parse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rlib

LOG = os.path.join(rlib.RETRY, 'ca_log.jsonl')
BASE = 'https://www.loc.gov/collections/chronicling-america/'


def search(q, d1, d2, c=50):
    params = [('fo', 'json'), ('at', 'results,pagination'), ('dl', 'page'), ('c', str(c)), ('q', q), ('dates', '%s/%s' % (d1, d2))]
    u = BASE + '?' + urllib.parse.urlencode(params, safe='/,')
    dest = os.path.join(rlib.WEBDIR, 'ca', 'search-' + rlib.sha_bytes(u.encode())[:14] + '.json')
    rec = rlib.curl(u, dest, max_time=120)
    d = None
    if rec.get('file'):
        try:
            d = json.load(open(rlib.abspath(rec['file'])))
        except Exception:
            d = None
    return u, rec, d


def meta(r):
    first = lambda x: x[0] if isinstance(x, list) and x else x
    wc = r.get('word_coordinates_url') or ''
    seg = urllib.parse.parse_qs(urllib.parse.urlparse(wc).query).get('segment', [''])[0]
    return {'lccn': first(r.get('number_lccn')), 'date': r.get('date'), 'seq': first(r.get('number_page')), 'paper': first(r.get('partof_title')) or '',
            'state': first(r.get('location_state')), 'segment': seg, 'snippet': (first(r.get('description')) or '')[:200]}


def fetch_text(m):
    if not m['segment']:
        return None
    u = 'https://tile.loc.gov/text-services/word-coordinates-service?segment=%s&format=alto_xml&full_text=1' % m['segment']
    name = '%s_%s_seq%s.txt' % (m['lccn'], m['date'], int(m['seq']) if str(m['seq']).isdigit() else m['seq'])
    dest = os.path.join(rlib.WEBDIR, 'ca', 'pages', name)
    rec = rlib.curl(u, dest, max_time=120)
    out = {'page': '%s %s seq %s' % (m['lccn'], m['date'], m['seq']), 'url': u, 'http': rec['http'], 'bytes': rec.get('bytes'), 'file': rec.get('file'), 'sha256': rec.get('sha256')}
    return out


if __name__ == '__main__':
    a = sys.argv[1:]
    q, d1, d2 = a[0], a[1], a[2]
    lk = a[a.index('--lk') + 1].split(',') if '--lk' in a else []
    why = a[a.index('--why') + 1] if '--why' in a else ''
    ntext = int(a[a.index('--text') + 1]) if '--text' in a else 0
    u, rec, d = search(q, d1, d2)
    res = d.get('results', []) if d else []
    of = (d or {}).get('pagination', {}).get('of')
    ms = [meta(r) for r in res]
    print('http %s of=%s shown=%d' % (rec['http'], of, len(ms)))
    for m in ms[:25]:
        print('  %s | %s | seq %s | %s | %s' % (m['date'], m['paper'][:45], m['seq'], m['state'], m['snippet'][:90].replace('\n', ' ')))
    texts = []
    for m in ms[:ntext]:
        t = fetch_text(m)
        if t:
            texts.append(t)
            print('  text', t['page'], t['http'], t['bytes'])
    rlib.jsonl_append(LOG, {'at': rec['at'], 'q': q, 'dates': '%s/%s' % (d1, d2), 'why': why, 'lk': lk, 'url': u, 'http': rec['http'], 'of': of, 'returned': len(ms),
                           'response_sha256': rec.get('sha256'), 'response_file': rec.get('file'), 'error': rec.get('error'), 'body_start': rec.get('body_start'),
                           'pages': [{'lccn': m['lccn'], 'date': m['date'], 'seq': m['seq'], 'paper': m['paper']} for m in ms[:40]], 'texts': texts})

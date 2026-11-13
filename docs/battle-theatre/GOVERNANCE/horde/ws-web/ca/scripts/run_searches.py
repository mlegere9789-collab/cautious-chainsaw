#!/usr/bin/env python3
"""Run a list of Chronicling America searches (one JSON file of {q, dates, extra?, max_pages?}).

Usage: python3 -I run_searches.py queries.json [--worker i/n]
Every search is one request (c=100 results per request); further result pages (sp=2, 3 ...) are
requested only while the hit count of the query is larger than what has been read, up to max_pages
(default 3). Results are cached by URL under tmp/library/web/ca/search; a cached search is not requested again.
"""
import json, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import calib


def main():
    qs = json.load(open(sys.argv[1]))
    wi, wn = 0, 1
    if '--worker' in sys.argv:
        a = sys.argv[sys.argv.index('--worker') + 1]
        wi, wn = [int(x) for x in a.split('/')]
    for i, spec in enumerate(qs):
        if i % wn != wi:
            continue
        maxp = spec.get('max_pages', 3)
        sp = 1
        while sp <= maxp:
            path, d, rec = calib.search(spec.get('q'), spec.get('dates'), c=spec.get('c', 100), sp=sp, extra=spec.get('extra'))
            if d is None:
                print('FAILED', spec, rec and {k: rec.get(k) for k in ('status', 'error', 'blocked')}, flush=True)
                break
            pg = d.get('pagination', {})
            of = pg.get('of') or 0
            got = len(d.get('results', []))
            print('%s | %s | sp=%d | results %d of %s' % (spec.get('q'), spec.get('dates'), sp, got, of), flush=True)
            if sp * spec.get('c', 100) >= of or got == 0:
                break
            sp += 1


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""Count the page-level hits of a Chronicling America search for each day of a window (c=1: one request per day, 1 request per second).
Usage: python3 -I count_hits.py 'query' FROM TO   -> prints date, hits (pagination 'of'); results are cached like all searches.
"""
import datetime, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import calib

q, d0, d1 = sys.argv[1], sys.argv[2], sys.argv[3]
d = datetime.date.fromisoformat(d0)
end = datetime.date.fromisoformat(d1)
while d <= end:
    ds = d.isoformat()
    path, data, rec = calib.search(q, '%s/%s' % (ds, ds), c=1)
    if data is None:
        print(ds, 'FAILED', rec and {k: rec.get(k) for k in ('status', 'error', 'blocked')}, flush=True)
    else:
        print(ds, data.get('pagination', {}).get('of'), flush=True)
    d += datetime.timedelta(days=1)

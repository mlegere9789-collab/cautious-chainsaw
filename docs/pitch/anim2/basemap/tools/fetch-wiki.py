"""Download the Wikipedia page summaries (REST API, coordinates field) that the ground-truth and landmark checks use as REFERENCE points, cached under tmp/look-dev/basemap/cache/wiki/.
Only the coordinates (facts) are used, nothing of the text.  The first three are needed by verify/ground-truth.py (search centres for the hill summits); the rest are the references named in
verify/landmarks.json and the README.   Usage: python fetch-wiki.py     (re-running fetches nothing that is already cached)"""
import os, sys, urllib.parse
sys.path.insert(0, os.path.dirname(__file__))
from common import *
TITLES = ["Little_Round_Top", "Big_Round_Top", "Culp's_Hill",                                                # needed by verify/ground-truth.py
          "Soldiers'_National_Monument", "Virginia_Monument", "Eternal_Light_Peace_Memorial", "United_Lutheran_Seminary",
          "Schmucker_Hall", "Lutheran_Theological_Seminary_at_Gettysburg", "Seminary_Ridge", "Evergreen_Cemetery_(Gettysburg,_Pennsylvania)"]     # references for the landmark check
for t in TITLES:
    q = urllib.parse.quote(t)
    p = polite_get('https://en.wikipedia.org/api/rest_v1/page/summary/' + q, cache_key=f'wiki/{q}.json', min_interval=1.5)
    print(t, os.path.getsize(p), 'bytes')

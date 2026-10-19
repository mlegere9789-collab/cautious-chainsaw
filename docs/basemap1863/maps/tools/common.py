"""Shared constants for the 1863 basemap map-georeferencing tools (owner: docs/basemap1863/maps)."""
import os, sys, time, subprocess
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
TMP = os.path.join(ROOT, 'tmp', 'b1863', 'maps')          # caches, scans, rasters: never committed
OUT = os.path.join(ROOT, 'docs', 'basemap1863', 'maps')    # committed: transforms, citations, thumbnails
UA = 'gettysburg-map-research/1.0 (non-commercial historical research; polite, rate-limited, cached)'
CRS = 'EPSG:32618'          # WGS84 / UTM 18N, the reference frame for everything here
# Reference AOI in UTM 18N metres (covers the Warren sheet and a margin)
AOI = dict(e0=301750, e1=313000, n0=4405000, n1=4415750)
def polite_get(url, out, tries=4, wait=2.0, timeout=300):
    """curl with User-Agent, retries, atomic write; returns True on success."""
    if os.path.exists(out) and os.path.getsize(out) > 200: return True
    os.makedirs(os.path.dirname(out), exist_ok=True)
    for i in range(tries):
        r = subprocess.run(['curl', '-s', '-L', '-m', str(timeout), '-A', UA, '-o', out + '.part', '-w', '%{http_code}', url], capture_output=True, text=True)
        ok = r.stdout.strip() == '200' and os.path.exists(out + '.part') and os.path.getsize(out + '.part') > 200
        if ok:
            head = open(out + '.part', 'rb').read(64)
            if head.lstrip()[:1] == b'{' and b'error' in open(out + '.part', 'rb').read(400): ok = False
        if ok: os.replace(out + '.part', out); time.sleep(wait); return True
        time.sleep(wait * (i + 2))
    return False

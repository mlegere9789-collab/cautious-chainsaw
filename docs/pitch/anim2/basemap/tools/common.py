"""Shared helpers for the basemap pipeline: Web Mercator math on the 512-px 'Mapbox' world the prototype uses,
a polite cached downloader for the public-domain USGS/Census services, and path constants.
Everything written outside docs/pitch/anim2/basemap goes under tmp/look-dev/basemap/ (cache)."""
import hashlib, json, math, os, sys, time, urllib.parse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..', '..'))      # repo root
BASEMAP = os.path.abspath(os.path.join(HERE, '..'))
CACHE = os.path.join(ROOT, 'tmp', 'look-dev', 'basemap', 'cache')
UA = 'gettysburg-map-design-research/1.0 (read-only, polite, cached; public-domain USGS/Census data)'

R_EARTH = 6378137.0
ORIGIN = math.pi * R_EARTH                                  # half the Web Mercator world in metres
TILE = 512                                                  # tile size in px; tile zoom z == the prototype's camera zoom (world = 512 * 2^z px)

def mpp(z):                                                 # metres per pixel at the equator, zoom z (512-px world)
    return 2 * ORIGIN / (TILE * 2 ** z)

def lnglat_to_merc(lng, lat):
    x = math.radians(lng) * R_EARTH
    y = math.log(math.tan(math.pi / 4 + math.radians(lat) / 2)) * R_EARTH
    return x, y

def merc_to_lnglat(x, y):
    lng = math.degrees(x / R_EARTH)
    lat = math.degrees(2 * math.atan(math.exp(y / R_EARTH)) - math.pi / 2)
    return lng, lat

def world_px(lng, lat, z):                                  # same as geo/project.mjs project()
    s = TILE * 2 ** z
    sin = math.sin(math.radians(lat))
    return (lng + 180) / 360 * s, (0.5 - math.log((1 + sin) / (1 - sin)) / (4 * math.pi)) * s

def tile_bounds_merc(z, tx, ty):                            # (xmin, ymin, xmax, ymax) in EPSG:3857 metres of tile tx,ty (y down)
    span = TILE * mpp(z)
    xmin = -ORIGIN + tx * span
    ymax = ORIGIN - ty * span
    return xmin, ymax - span, xmin + span, ymax

def lnglat_to_tile(lng, lat, z):
    wx, wy = world_px(lng, lat, z)
    return wx / TILE, wy / TILE

def polite_get(url, params=None, cache_key=None, min_interval=1.0, retries=4, timeout=240, binary=True):
    """GET with an on-disk cache (re-runs cost nothing), one request at a time, a pause between requests, backoff on errors."""
    if params:
        url = url + ('&' if '?' in url else '?') + urllib.parse.urlencode(params)
    key = cache_key or hashlib.sha1(url.encode()).hexdigest()
    path = os.path.join(CACHE, key)
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return path
    os.makedirs(os.path.dirname(path), exist_ok=True)
    last = None
    for a in range(retries):
        try:
            time.sleep(min_interval)
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                data = r.read()
                ctype = r.headers.get('Content-Type', '')
            if b'"error"' in data[:400] and 'json' in ctype.lower() or data[:1] == b'<':
                raise RuntimeError('service error: ' + data[:300].decode('utf8', 'replace'))
            tmp = path + '.part'
            with open(tmp, 'wb') as f:
                f.write(data)
            os.replace(tmp, path)
            return path
        except Exception as e:                              # noqa
            last = e
            wait = 5 * (a + 1) ** 2
            print(f'  retry {a + 1}/{retries} after {wait}s: {e}', file=sys.stderr)
            time.sleep(wait)
    raise RuntimeError(f'failed: {url[:200]} ({last})')

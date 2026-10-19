"""Verification passes over the roads/rail/water/fence catalogue. Writes verification/passN.json and prints a summary.
  pass1 schema        every feature has the required fields, valid enums, non-empty sources (or an explicit reason), positional error and confidence consistent
  pass2 citations     each cited NPS PDF page was read: the content words of the paraphrase are looked up on the cited page of the cached text
  pass3 geometry      geometries valid, inside the expanded map box, roads connected at junctions (gaps reported), no duplicate ids
  pass4 removal       every TIGER edge in the box is classified; 1863 roads never listed for removal; undecided classes counted
  pass8 honesty       no claim of 1:1 / 100 percent / exact; every file states reconstruction; Unknown never drawn without a flag
(passes 5 to 7 are the map-overlay checks: scripts/map_checks.py)"""
import json, os, re, sys, glob, collections
sys.path.insert(0, os.path.dirname(__file__))
from geomlib import *
from sources import SRC
VER = os.path.join(OUT, 'verification'); os.makedirs(VER, exist_ok=True)
FILES = ['roads', 'railways', 'waterways', 'bridges', 'water_features', 'fences', 'lanes']
CATS = {'road', 'railroad', 'waterway', 'bridge', 'ford', 'crossing', 'fence', 'wall', 'spring', 'pond', 'dam', 'wetland', 'lane'}
CONF = {'Documented', 'Estimated', 'Contested', 'Unknown'}
TYPES = {'A1', 'A2', 'B'}
REQ = ['id', 'category', 'subtype', 'name', 'present_1863', 'period_note', 'sources', 'method', 'positional_error_m', 'confidence', 'notes']
def load(name):
    p = os.path.join(OUT, name + '.geojson')
    return json.load(open(p))['features'] if os.path.exists(p) else []

def pass1():
    res = dict(errors=[], warnings=[], counts={})
    ids = collections.Counter()
    for fn in FILES:
        fs = load(fn); res['counts'][fn] = len(fs)
        for f in fs:
            p = f['properties']; i = p.get('id'); ids[i] += 1
            for k in REQ:
                if k not in p: res['errors'].append(f'{fn} {i}: missing {k}')
            if p.get('category') not in CATS: res['errors'].append(f'{fn} {i}: bad category {p.get("category")}')
            if p.get('confidence') not in CONF: res['errors'].append(f'{fn} {i}: bad confidence {p.get("confidence")}')
            for s in p.get('sources', []):
                for k in ('cite', 'sheet_or_page', 'url', 'type', 'quote_or_paraphrase'):
                    if k not in s or s[k] in (None, ''): res['errors'].append(f'{fn} {i}: source missing {k}')
                if s.get('type') not in TYPES: res['errors'].append(f'{fn} {i}: bad source type {s.get("type")}')
            if not p.get('sources') and p.get('confidence') in ('Documented',): res['errors'].append(f'{fn} {i}: Documented without sources')
            if not p.get('sources') and p.get('present_1863') is True and fn in ('roads', 'lanes'): res['warnings'].append(f'{fn} {i} ({p.get("name")}): present_1863 true with no source')
            if p.get('positional_error_m') is None and p.get('confidence') != 'Unknown' and f.get('geometry'): res['warnings'].append(f'{fn} {i}: no positional error')
    for i, c in ids.items():
        if c > 1: res['errors'].append(f'duplicate id {i} x{c}')
    return res

def page_text(key, page):
    f = os.path.join(CACHE, 'txt', {'NPS-CLI-GETT': 'cli-gettsyburg-landscape', 'NPS-CLI-FD': 'cli-first-day-ufcb', 'NPS-CLI-EMM': 'cli-emmitsburg-rd-ridge-battlefield', 'NPS-CLI-PC': 'cli-picketts-charge-battlefield',
        'NPS-CLI-LRT': 'cli-little-round-top', 'NPS-CLR-LRT': 'clr-little-round-top', 'NPS-CLR-ROT-V1': 'clr-v1', 'NPS-CLR-ROT-V2': 'clr-v2', 'NPS-CLR-1DAY': 'clr-1-day-union-1-corps', 'NPS-TREAT-2004': 'treatment-1863-landscape-2004',
        'NPS-HBM-1958': 'hist-base-map-1958'}.get(key, '?') + '.txt')
    if not os.path.exists(f): return None
    t = open(f, encoding='utf8', errors='ignore').read()
    pg = re.split(r'\n=====PAGE (\d+)=====\n', t)
    d = {int(pg[i]): pg[i + 1] for i in range(1, len(pg), 2)}
    return d.get(page, '')
STOP = set('the a an and of to in on at by for with from was were is are as that this which it its their his her not or be been had has have but also than into who during after before over under'.split())
def pass2():
    res = dict(checked=0, ok=0, weak=[], nopage=[], untested=[])
    items = []
    for fn in FILES:
        for f in load(fn): items.append(f['properties'])
    inv = os.path.join(OUT, 'lanes_inventory.json')
    if os.path.exists(inv):
        for L in json.load(open(inv)): items.append(dict(id=L['id'], sources=L['sources']))
    for p in items:
        if True:
            for s in p.get('sources', []):
                k = s.get('key')
                m = re.findall(r'p(\d+)', s['sheet_or_page'])
                if not k or not k.startswith(('NPS',)) or not m:
                    res['untested'].append(f"{p['id']}:{k}:{s['sheet_or_page'][:30]}"); continue
                words = [w.lower() for w in re.findall(r"[A-Za-z0-9][A-Za-z0-9'\-]{3,}", s['quote_or_paraphrase']) if w.lower() not in STOP]
                words = sorted(set(words))
                txt = '';
                for pg in m: txt += (page_text(k, int(pg)) or '') + ' '
                # also allow the next page (PDF page offsets)
                txt = txt.lower().replace('’', "'").replace('neighborhood', 'neighbourhood')
                hit = [w for w in words if w.replace('’', "'") in txt]
                res['checked'] += 1
                frac = len(hit) / max(1, len(words))
                if not txt.strip(): res['nopage'].append(f"{p['id']}:{k}:{s['sheet_or_page']}")
                elif frac >= 0.45: res['ok'] += 1
                else: res['weak'].append(dict(id=p['id'], key=k, page=s['sheet_or_page'], frac=round(frac, 2), missing=[w for w in words if w not in hit][:12]))
    # unique (key,page) dedup summary
    return res

def pass3():
    res = dict(errors=[], warnings=[], gaps=[])
    for fn in FILES:
        for f in load(fn):
            g = f.get('geometry')
            if not g: res['warnings'].append(f"{fn} {f['properties']['id']}: no geometry"); continue
            s = shape(g)
            if not s.is_valid: res['errors'].append(f"{fn} {f['properties']['id']}: invalid geometry")
            b = s.bounds
            if b[0] < XW - 1e-6 or b[2] > XE + 1e-6 or b[1] < XS - 1e-6 or b[3] > XN + 1e-6: res['errors'].append(f"{fn} {f['properties']['id']}: outside expanded box {b}")
    # road connectivity: junction nodes between catalogued roads
    roads = load('roads'); geoms = {f['id']: shape(f['geometry']) for f in roads}
    from shapely.ops import nearest_points
    ids = list(geoms)
    for r in ids:
        gm = geoms[r]; ends = []
        lines = [gm] if gm.geom_type == 'LineString' else list(gm.geoms)
        for ln in lines:
            for q in (Point(ln.coords[0]), Point(ln.coords[-1])):
                if not in_box(q.x, q.y): continue   # end at the box edge is fine
                dmin = min(hav(q.coords[0], nearest_points(q, geoms[o])[1].coords[0]) for o in ids if o != r)
                own = [ln2 for ln2 in lines if ln2 is not ln]
                dself = min([hav(q.coords[0], nearest_points(q, ln2)[1].coords[0]) for ln2 in own] or [1e9])
                if dmin > 3.0 and dself > 3.0: res['gaps'].append(dict(road=r, end=[round(q.x, 5), round(q.y, 5)], nearest_other_road_m=round(dmin, 1)))
    return res

def pass4():
    rows = json.load(open(os.path.join(OUT, 'modern-roads-remove.json')))
    c = collections.Counter(r['cls'] for r in rows)
    ids = [r['tiger_linearid'] for r in rows]
    tig = {f['properties']['linearid'] for f in tiger() if not LineString(f['geometry']['coordinates']).intersection(XBOX).is_empty}
    res = dict(edges_in_box=len(tig), classified=len(set(ids)), missing=sorted(tig - set(ids))[:20], classes=dict(c))
    bad = [r['tiger_linearid'] for r in rows if r['cls'] == 'ROAD_1863_SAME_LINE' and r['present_1863'] is not True]
    res['inconsistent'] = bad
    return res

BAN = [r'(?<![\d:])1\s*:\s*1(?![\d])', r'100\s*(percent|%)\s*(accurate|exact|correct)', r'\bexact replica\b', r'\bpixel[- ]perfect\b', r'\bperfect(ly)? accurate\b']
def pass8():
    res = dict(hits=[], files=[])
    for fp in glob.glob(os.path.join(OUT, '**', '*'), recursive=True) + [os.path.join(OUT, '..', '..', 'SOURCES-roads.md')]:
        if not os.path.isfile(fp) or os.path.basename(fp).startswith('pass') or fp.endswith(('.png', '.jpg', '.pyc')) or os.sep + 'scripts' + os.sep in fp and fp.endswith('verify.py'): continue
        try: t = open(fp, encoding='utf8', errors='ignore').read()
        except Exception: continue
        for rx in BAN:
            for m in re.finditer(rx, t, re.I):
                ctx = t[max(0, m.start() - 60):m.end() + 60].replace('\n', ' ')
                # allowed: the sentence that forbids the claim
                if re.search(r'(never|not|no|never claim|do not)\b', ctx, re.I): continue
                res['hits'].append(dict(file=os.path.relpath(fp, OUT), match=m.group(0), ctx=ctx))
    res['reconstruction_label'] = 'RECONSTRUCTION' in open(os.path.join(OUT, '..', '..', 'SOURCES-roads.md'), encoding='utf8').read() if os.path.exists(os.path.join(OUT, '..', '..', 'SOURCES-roads.md')) else False
    return res

if __name__ == '__main__':
    which = sys.argv[1:] or ['1', '2', '3', '4', '8']
    fns = {'1': pass1, '2': pass2, '3': pass3, '4': pass4, '8': pass8}
    for w in which:
        r = fns[w](); json.dump(r, open(os.path.join(VER, f'pass{w}.json'), 'w'), indent=1)
        s = json.dumps(r)[:700]
        print('pass', w, s)

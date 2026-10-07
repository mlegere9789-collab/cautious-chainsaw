"""Turn landmark-readings.json into errors in metres: the site's coordinate (and a second source's, where there is one) against the feature read on the NAIP crop.
Also reports the two cases where nothing is at the site's coordinate (seminary, Evergreen gatehouse) as a distance to the reference.   Usage: python landmark-report.py  -> results/landmarks.json"""
import json, math, os
HERE = os.path.dirname(os.path.abspath(__file__))
lm = {l['id']: l for l in json.load(open(os.path.join(HERE, 'landmarks.json'), encoding='utf8'))['landmarks']}
rd = json.load(open(os.path.join(HERE, 'landmark-readings.json'), encoding='utf8'))
K_LAT = 111195.0                                      # metres per degree of latitude (the same constant the site-side checks use)
def k_lng(lat): return 111320.0 * math.cos(math.radians(lat))
rows = []
feat = {}                                             # id -> (lat, lng) of the feature as read
for r in rd['readings']:
    L = lm[r['id']]; s = L['site']
    fx = sum(p[0] for p in r['points']) / len(r['points']); fy = sum(p[1] for p in r['points']) / len(r['points'])
    east = (fx - r['cross'][0]) / r['px_per_m']; north = (r['cross'][1] - fy) / r['px_per_m']
    lat = s['lat'] + north / K_LAT; lng = s['lng'] + east / k_lng(s['lat']); feat[r['id']] = (lat, lng)
    row = dict(id=r['id'], name=L['name'], coordinate=dict(lat=s['lat'], lng=s['lng'], source=s['source']), feature=r['feature'], feature_offset_from_coordinate_m=dict(east=round(east, 1), north=round(north, 1)),
               err_m=round(math.hypot(east, north), 1))
    if 'site2' in L:
        e2 = (L['site2']['lng'] - s['lng']) * k_lng(s['lat']); n2 = (L['site2']['lat'] - s['lat']) * K_LAT
        row['second_source'] = dict(source=L['site2']['source'], err_m=round(math.hypot(e2 - east, n2 - north), 1))
    rows.append(row)
for a in rd['absent']:
    L = lm[a['id']]; s = L['site']; d = dict(id=a['id'], name=L['name'], coordinate=dict(lat=s['lat'], lng=s['lng'], source=s['source']), result=a['result'])
    if a['id'] == 'seminary':
        f = feat['schmucker-wiki']; d['distance_to_cupola_m'] = round(math.hypot((f[1] - s['lng']) * k_lng(s['lat']), (f[0] - s['lat']) * K_LAT), 0)
    if a['id'] == 'evergreen-gate':
        c = lm['evergreen-candidate']['site']; e = (c['lng'] + 25 / k_lng(c['lat']) - s['lng']) * k_lng(s['lat']); n = (c['lat'] + 4 / K_LAT - s['lat']) * K_LAT
        d['distance_to_candidate_m'] = round(math.hypot(e, n), 0)
    rows.append(d)
# the place marks the checks found NOT at the thing they name: data/place-checks.json, read by tools/build-vectors.py, drawn by the loader with a dashed ring
checks = {}
for r in rows:
    if r['id'] == 'seminary': checks[lm['seminary']['locId']] = dict(off_m=int(r['distance_to_cupola_m']), ev='Measured', basis='Measured: no building at the mark; the seminary cupola (Schmucker Hall) is %d m away (verify/landmark-report.py)' % r['distance_to_cupola_m'])
    if r['id'] == 'evergreen-gate': checks[lm['evergreen-gate']['locId']] = dict(off_m=int(r['distance_to_candidate_m']), ev='Unknown', basis='Measured: no building at the mark; the likely gatehouse is about %d m away, not confirmed against an independent coordinate (verify/landmark-report.py)' % r['distance_to_candidate_m'])
os.makedirs(os.path.join(HERE, '..', 'data'), exist_ok=True)
json.dump(dict(sorted(checks.items())), open(os.path.join(HERE, '..', 'data', 'place-checks.json'), 'w'), indent=1)
mon = [r for r in rows if 'err_m' in r and r['id'] != 'schmucker-wiki']
summary = dict(n_monuments=len(mon), median_err_m=round(sorted(r['err_m'] for r in mon)[len(mon) // 2], 1), max_err_m=max(r['err_m'] for r in mon), within_5m=sum(r['err_m'] <= 5 for r in mon), within_11m=sum(r['err_m'] <= 11 for r in mon))
os.makedirs(os.path.join(HERE, 'results'), exist_ok=True)
json.dump(dict(summary=summary, rows=rows), open(os.path.join(HERE, 'results', 'landmarks.json'), 'w'), indent=1)
for r in rows: print({k: v for k, v in r.items() if k in ('id', 'err_m', 'feature_offset_from_coordinate_m', 'second_source', 'distance_to_cupola_m', 'distance_to_candidate_m')})
print(summary)

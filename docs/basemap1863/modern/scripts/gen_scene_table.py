"""List every NAIP scene over the AOI by vintage (from the STAC search saved by the survey) and the solar noon elevation of each flight date (astronomy, NOAA formulae)."""
import json, os, math, sys, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import aoi_util as A
cat = json.load(open(os.path.join(A.ROOT, 'tmp', 'b1863', 'modern', 'catalog_pc_naip.json'), encoding='utf8'))['features']
def noon_elev(date, lat=39.81):
    d = datetime.date.fromisoformat(date); n = d.timetuple().tm_yday
    decl = 23.44 * math.sin(math.radians(360 / 365 * (n - 81)))
    return round(90 - lat + decl, 1)
by = {}
for f in cat:
    p = f['properties']
    if not f['id'].startswith('pa_'):
        continue          # Maryland quads touch only the 0.5 km south edge, outside the box
    by.setdefault(p['datetime'][:10], []).append(dict(id=f['id'], gsd=p['gsd'], proj_bbox=p['proj:bbox'], href=f['assets']['image']['href']))
out = {d: dict(scenes=len(v), gsd_m=v[0]['gsd'], solar_noon_elevation_deg=noon_elev(d), items=v) for d, v in sorted(by.items())}
json.dump(out, open(os.path.join(A.ROOT, 'docs', 'basemap1863', 'modern', 'results', 'naip_scenes_pa.json'), 'w'), indent=1)
for d, v in out.items():
    print(d, v['scenes'], 'scenes', v['gsd_m'], 'm', 'noon elev', v['solar_noon_elevation_deg'])

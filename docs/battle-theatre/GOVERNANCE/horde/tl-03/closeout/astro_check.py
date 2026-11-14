"""Independent cross-check (PyEphem 4.x, VSOP87/ELP-based, no external data files) of the computed sky values of shard tl-03 (T1-158 and T1-171):
sun altitude and azimuth at 16:00 local mean time on 1863-07-01, sunset, civil, nautical and astronomical dusk, moonrise and moon illumination on the evening of 1 July.
Site: Gettysburg 39.8309 N, 77.2311 W. LMT = UT + lon/15 h (project clock, a convention: no standard time existed in 1863).
Rise/set: upper limb, standard refraction 34' (pressure 0, horizon -0:34). Twilight: Sun's centre at -6, -12, -18 degrees.  Sun altitude/azimuth: geometric (pressure 0).
Run: PYTHONPATH=tmp/tl-02/pylib python3 -I docs/battle-theatre/GOVERNANCE/horde/tl-03/closeout/astro_check.py > docs/battle-theatre/GOVERNANCE/horde/tl-03/astro_check.json"""
import sys, os, json, math
sys.path.insert(0, os.path.join(os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', '..', '..', '..')), 'tmp', 'tl-02', 'pylib'))
import ephem
lat, lon = '39.8309', '-77.2311'
off_days = (-77.2311 / 15.0) / 24.0
def lmt(d):
    y, m, dd, h, mi, s = ephem.Date(d + off_days).tuple()
    sec = int(round(s))
    if sec >= 60: sec = 59
    return '%04d-%02d-%02d %02d:%02d:%02d' % (y, m, dd, h, mi, sec)
o = ephem.Observer(); o.lat, o.lon = lat, lon; o.elevation = 0; o.pressure = 0
out = {}
def ev(key, f, start, horizon, body, use_center=False):
    o.date = start; o.horizon = horizon
    t = f(body, use_center=use_center)
    out[key] = {'ut': str(t), 'lmt': lmt(t)}
noon = ephem.Date('1863/7/1 17:08:55')   # 12:00 LMT Jul 1 (UT = LMT + 5 h 8 min 55 s)
ev('sunset_jul1', o.next_setting, noon, '-0:34', ephem.Sun())
ev('civil_dusk_jul1', o.next_setting, noon, '-6', ephem.Sun(), True)
ev('nautical_dusk_jul1', o.next_setting, noon, '-12', ephem.Sun(), True)
ev('astronomical_dusk_jul1', o.next_setting, noon, '-18', ephem.Sun(), True)
ev('moonrise_jul1', o.next_rising, noon, '-0:34', ephem.Moon())
# sun altitude and azimuth at 16:00 LMT on Jul 1 (geometric, pressure 0, horizon 0)
o.horizon = '0'
t = ephem.Date('1863/7/1 21:08:55')
o.date = t; s = ephem.Sun(o)
out['sun_1600_lmt'] = {'ut': str(t), 'altitude_deg': round(math.degrees(s.alt), 3), 'azimuth_deg': round(math.degrees(s.az), 3)}
m = ephem.Moon()
for k, d in (('moon_lit_pct_2000_lmt', '1863/7/2 01:08:55'), ('moon_lit_pct_at_moonrise', out['moonrise_jul1']['ut'])):
    m.compute(d); out[k] = round(m.phase, 2)
out['_method'] = 'PyEphem %s; LMT offset %.2f min; pressure 0, horizon -0:34 (upper limb) for rise/set; Sun centre at -6/-12/-18 for twilight; sun altitude/azimuth geometric' % (ephem.__version__, off_days * 1440)
print(json.dumps(out, indent=1))

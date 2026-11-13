"""Independent cross-check (PyEphem 4.x, VSOP87/ELP-based, no external data files) of the computed sky rows T1-068, T1-070, T1-075.
Site: Gettysburg 39.8309 N, 77.2311 W. LMT = UT + lon/15 h. Rise/set: upper limb, standard refraction 34' (pressure 0, horizon -0:34).
Twilight: Sun's centre at -6, -12, -18 degrees. Run: PYTHONPATH=tmp/tl-02/pylib python3 tmp/tl-02/astro_check.py"""
import ephem, json
lat, lon = '39.8309', '-77.2311'
off_days = (-77.2311 / 15.0) / 24.0
def lmt(d):
    y, m, dd, h, mi, s = ephem.Date(d + off_days).tuple()
    return '%04d-%02d-%02d %02d:%02d:%02d' % (y, m, dd, h, mi, int(round(s)) if s < 59.5 else 59)
o = ephem.Observer(); o.lat, o.lon = lat, lon; o.elevation = 0; o.pressure = 0
out = {}
def ev(key, f, start, horizon, body, use_center=False):
    o.date = start; o.horizon = horizon
    t = f(body, use_center=use_center)
    out[key] = {'ut': str(t), 'lmt': lmt(t)}
mid = ephem.Date('1863/7/1 05:08:55')      # 00:00 LMT Jul 1
noon30 = ephem.Date('1863/6/30 17:08:55')  # 12:00 LMT Jun 30
fm = ephem.next_full_moon('1863/6/30'); out['full_moon'] = {'ut': str(fm), 'lmt': lmt(fm)}
ev('sunset_jun30', o.next_setting, noon30, '-0:34', ephem.Sun())
ev('moonrise_jun30', o.next_rising, noon30, '-0:34', ephem.Moon())
ev('astronomical_dawn_jul1', o.next_rising, mid, '-18', ephem.Sun(), True)
ev('nautical_dawn_jul1', o.next_rising, mid, '-12', ephem.Sun(), True)
ev('civil_dawn_jul1', o.next_rising, mid, '-6', ephem.Sun(), True)
ev('sunrise_jul1', o.next_rising, mid, '-0:34', ephem.Sun())
ev('moonset_jul1', o.next_setting, mid, '-0:34', ephem.Moon())
ev('sunset_jul1', o.next_setting, mid, '-0:34', ephem.Sun())
m = ephem.Moon()
for k, d in (('moon_lit_pct_jun30_2100lmt', '1863/7/1 02:08:55'), ('moon_lit_pct_at_full', str(fm)), ('moon_lit_pct_jul1_0400lmt', '1863/7/1 09:08:55')):
    m.compute(d); out[k] = round(m.phase, 2)
out['_method'] = 'PyEphem %s; LMT offset %.2f min; pressure 0, horizon -0:34 (upper limb) for rise/set; Sun centre at -6/-12/-18 for twilight' % (ephem.__version__, off_days * 1440)
print(json.dumps(out, indent=1))

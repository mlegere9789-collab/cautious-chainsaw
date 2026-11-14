"""Independent cross-check (PyEphem 4.x) of the computed sky rows T1-189, 190, 193, 195, 196, 220, 223, 224, 225 (Jul 1 evening to Jul 2 sunrise).
Site: Gettysburg 39.8309 N, 77.2311 W, sea level, no terrain horizon. LMT = UT + lon/15 h (UT - 5 h 08 m 55 s).
Rise/set: upper limb, standard refraction 34' (pressure 0, horizon -0:34). Twilight: Sun centre at -6, -12, -18 degrees.
Moon altitude/azimuth: geometric topocentric position of the centre (pressure 0). Moon illumination: ephem Moon.phase (percent of the disc lit).
Run: PYTHONPATH=tmp/tl-04/pylib python3 -I -S ... (the script adds the path itself)"""
import sys, os, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pylib'))
import ephem, math
lat, lon = '39.8309', '-77.2311'
off_days = (-77.2311 / 15.0) / 24.0
def lmt(d):
    y, m, dd, h, mi, s = ephem.Date(d + off_days).tuple()
    s2 = int(round(s))
    if s2 == 60:
        s2 = 59
    return '%04d-%02d-%02d %02d:%02d:%02d' % (y, m, dd, h, mi, s2)
def ut_of_lmt(y, mo, d, h, mi):
    return ephem.Date((y, mo, d, h, mi, 0)) - off_days
o = ephem.Observer(); o.lat, o.lon = lat, lon; o.elevation = 0; o.pressure = 0
out = {}
def ev(key, f, start, horizon, body, use_center=False):
    o.date = start; o.horizon = horizon
    t = f(body, use_center=use_center)
    out[key] = {'ut': str(t), 'lmt': lmt(t)}
noon_jul1 = ut_of_lmt(1863, 7, 1, 12, 0)
mid_jul2 = ut_of_lmt(1863, 7, 2, 0, 0)
ev('sunset_jul1', o.next_setting, noon_jul1, '-0:34', ephem.Sun())
ev('moonrise_jul1', o.next_rising, noon_jul1, '-0:34', ephem.Moon())
ev('civil_dusk_jul1', o.next_setting, noon_jul1, '-6', ephem.Sun(), True)
ev('nautical_dusk_jul1', o.next_setting, noon_jul1, '-12', ephem.Sun(), True)
ev('astronomical_dusk_jul1', o.next_setting, noon_jul1, '-18', ephem.Sun(), True)
ev('astronomical_dawn_jul2', o.next_rising, mid_jul2, '-18', ephem.Sun(), True)
ev('nautical_dawn_jul2', o.next_rising, mid_jul2, '-12', ephem.Sun(), True)
ev('civil_dawn_jul2', o.next_rising, mid_jul2, '-6', ephem.Sun(), True)
ev('sunrise_jul2', o.next_rising, mid_jul2, '-0:34', ephem.Sun())
ev('moonset_jul2', o.next_setting, mid_jul2, '-0:34', ephem.Moon())
fm = ephem.next_full_moon(ut_of_lmt(1863, 6, 29, 0, 0)); out['full_moon'] = {'ut': str(fm), 'lmt': lmt(fm)}
m = ephem.Moon()
o.horizon = '0'
pos = {}
for lab, (y, mo, d, h, mi) in {'jul1_2000': (1863, 7, 1, 20, 0), 'jul1_2100': (1863, 7, 1, 21, 0), 'jul1_2200': (1863, 7, 1, 22, 0), 'jul2_0000': (1863, 7, 2, 0, 0),
                              'jul2_0200': (1863, 7, 2, 2, 0), 'jul2_0400': (1863, 7, 2, 4, 0), 'jul2_0435': (1863, 7, 2, 4, 35), 'jul2_0614': (1863, 7, 2, 6, 14), 'jul2_0700': (1863, 7, 2, 7, 0), 'jul1_1953': (1863, 7, 1, 19, 53)}.items():
    o.date = ut_of_lmt(y, mo, d, h, mi); m.compute(o)
    pos[lab] = {'alt_deg': round(math.degrees(m.alt), 2), 'az_deg': round(math.degrees(m.az), 2), 'illum_pct': round(m.phase, 2)}
out['moon_position'] = pos
out['_method'] = 'PyEphem %s; LMT offset %.2f min; pressure 0; horizon -0:34 (upper limb) for rise/set; Sun centre at -6/-12/-18 for twilight; moon alt/az geometric topocentric centre' % (ephem.__version__, off_days * 1440)
print(json.dumps(out, indent=1))

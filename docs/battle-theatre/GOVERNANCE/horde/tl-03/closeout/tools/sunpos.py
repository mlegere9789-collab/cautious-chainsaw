"""Independent low-precision check (Meeus, Astronomical Algorithms 2nd ed. ch.25 'low accuracy') of the Sun values that rows T1-158 and T1-171 take from
docs/battle-theatre/environment/ephemeris_1863.json: altitude and azimuth at 1863-07-01 16:00 LMT, sunset and civil/astronomical dusk of that date, for
39.83 N, 77.23 W, LMT = UT + lon/15 h. Accuracy of the formulas about 0.01 degree; no refraction in the altitude, the rise/set horizon -0.833 deg as the file's sun_band.
Run: python3 -I sunpos.py"""
import math
LAT = 39.83; LON_E = -77.23
def jd(y, m, d, h=0.0):
    if m <= 2: y -= 1; m += 12
    A = y // 100; B = 2 - A + A // 4
    return int(365.25 * (y + 4716)) + int(30.6001 * (m + 1)) + d + B - 1524.5 + h / 24.0
def sun(jdut):
    T = (jdut - 2451545.0) / 36525.0
    L0 = (280.46646 + 36000.76983 * T + 0.0003032 * T * T) % 360
    M = math.radians((357.52911 + 35999.05029 * T - 0.0001537 * T * T) % 360)
    e = 0.016708634 - 0.000042037 * T
    C = (1.914602 - 0.004817 * T) * math.sin(M) + 0.019993 * math.sin(2 * M) + 0.000289 * math.sin(3 * M)
    lam = L0 + C
    om = math.radians(125.04 - 1934.136 * T)
    lam_app = math.radians(lam - 0.00569 - 0.00478 * math.sin(om))
    eps = math.radians(23.439291 - 0.0130042 * T + 0.00256 * math.cos(om))
    dec = math.asin(math.sin(eps) * math.sin(lam_app))
    ra = math.atan2(math.cos(eps) * math.sin(lam_app), math.cos(lam_app))
    gmst = (280.46061837 + 360.98564736629 * (jdut - 2451545.0) + 0.000387933 * T * T) % 360
    return ra, dec, gmst
def altaz(y, m, d, lmt_h):
    ut_h = lmt_h - LON_E / 15.0                         # LMT = UT + lon/15 (lon east negative here)
    j = jd(y, m, d, ut_h)
    ra, dec, gmst = sun(j)
    lst = math.radians((gmst + LON_E) % 360)
    H = lst - ra
    phi = math.radians(LAT)
    sa = math.sin(phi) * math.sin(dec) + math.cos(phi) * math.cos(dec) * math.cos(H)
    alt = math.degrees(math.asin(sa))
    az = (math.degrees(math.atan2(math.sin(H), math.cos(H) * math.sin(phi) - math.tan(dec) * math.cos(phi))) + 180) % 360
    return alt, az
def crossing(y, m, d, level, after_noon=True):
    lo, hi = (12.0, 23.99) if after_noon else (0.0, 12.0)
    f = lambda t: altaz(y, m, d, t)[0] - level
    for _ in range(60):
        mid = (lo + hi) / 2
        if (f(mid) > 0) == after_noon: lo = mid
        else: hi = mid
    return (lo + hi) / 2
def hm(t): return '%02d:%05.2f' % (int(t), (t - int(t)) * 60)
if __name__ == '__main__':
    a, z = altaz(1863, 7, 1, 16.0)
    print('1863-07-01 16:00 LMT  alt %.3f  az %.3f' % (a, z))
    print('sunset (alt -0.833)    ', hm(crossing(1863, 7, 1, -0.833)))
    print('civil dusk (alt -6)    ', hm(crossing(1863, 7, 1, -6.0)))
    print('astronomical dusk (-18)', hm(crossing(1863, 7, 1, -18.0)))

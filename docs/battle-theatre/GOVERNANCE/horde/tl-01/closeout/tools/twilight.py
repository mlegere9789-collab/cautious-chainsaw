"""Civil twilight, sunrise and sunset at Gettysburg (39.8309 N, 77.2311 W) in local mean time, for the window limits of the tl-01 close-out.

Low-precision solar position (NOAA / Meeus). Used only to check that the dawn and dusk limits the seed prints for 2-3 July
(civil twilight 04:03 and 20:04, sunrise about 04:35, sunset 19:32; ENV-ASTRO rows of timeline_seed.jsonl) also hold, within a few
minutes, for 26-30 June. It reproduces the seed's 2-3 July values to the minute.
Run:  python3 -I docs/battle-theatre/GOVERNANCE/horde/tl-01/closeout/tools/twilight.py"""
import math
LAT, LON = 39.8309, -77.2311

def _jd(y, m, d):
    if m <= 2:
        y -= 1; m += 12
    a = y // 100; b = 2 - a + a // 4
    return int(365.25 * (y + 4716)) + int(30.6001 * (m + 1)) + d + b - 1524.5

def _sun(j):
    t = (j - 2451545.0) / 36525
    l0 = (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360
    m = 357.52911 + t * (35999.05029 - 0.0001537 * t)
    e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t)
    c = (math.sin(math.radians(m)) * (1.914602 - t * (0.004817 + 0.000014 * t)) + math.sin(math.radians(2 * m)) * (0.019993 - 0.000101 * t) + math.sin(math.radians(3 * m)) * 0.000289)
    om = 125.04 - 1934.136 * t
    lam = l0 + c - 0.00569 - 0.00478 * math.sin(math.radians(om))
    eps0 = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60
    eps = eps0 + 0.00256 * math.cos(math.radians(om))
    dec = math.degrees(math.asin(math.sin(math.radians(eps)) * math.sin(math.radians(lam))))
    y = math.tan(math.radians(eps / 2)) ** 2
    eqt = 4 * math.degrees(y * math.sin(2 * math.radians(l0)) - 2 * e * math.sin(math.radians(m)) + 4 * e * y * math.sin(math.radians(m)) * math.cos(2 * math.radians(l0)) - 0.5 * y * y * math.sin(4 * math.radians(l0)) - 1.25 * e * e * math.sin(2 * math.radians(m)))
    return dec, eqt

def lmt_pair(year, month, day, alt_deg):
    """(morning, evening) local mean time in minutes after midnight at which the sun is at altitude alt_deg."""
    dec, eqt = _sun(_jd(year, month, day) + 0.5)
    ha = math.degrees(math.acos((math.sin(math.radians(alt_deg)) - math.sin(math.radians(LAT)) * math.sin(math.radians(dec))) / (math.cos(math.radians(LAT)) * math.cos(math.radians(dec)))))
    noon = 12 * 60 - eqt
    return noon - 4 * ha, noon + 4 * ha

def hm(x):
    x = round(x)
    return '%02d:%02d' % (x // 60, x % 60)

if __name__ == '__main__':
    for mo, dd in [(6, 26), (6, 27), (6, 28), (6, 29), (6, 30), (7, 1), (7, 2), (7, 3)]:
        a, b = lmt_pair(1863, mo, dd, -6.0); r, s = lmt_pair(1863, mo, dd, -0.833)
        print('1863-%02d-%02d  civil dawn %s  sunrise %s  sunset %s  civil dusk %s  (local mean time)' % (mo, dd, hm(a), hm(r), hm(s), hm(b)))

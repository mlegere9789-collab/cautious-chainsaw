import math, datetime
lat, lon = 39.8309, -77.2311  # lon west negative


def jd_of(y, m, d):
    # Gregorian calendar (1863 in the US) julian day at 0h UT
    a = (14 - m) // 12
    yy = y + 4800 - a
    mm = m + 12 * a - 3
    return d + (153 * mm + 2) // 5 + 365 * yy + yy // 4 - yy // 100 + yy // 400 - 32045 - 0.5


def sun(jd):
    T = (jd - 2451545.0) / 36525.0
    L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360
    M = 357.52911 + T * (35999.05029 - 0.0001537 * T)
    e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T)
    Mr = math.radians(M)
    C = (math.sin(Mr) * (1.914602 - T * (0.004817 + 0.000014 * T)) + math.sin(2 * Mr) * (0.019993 - 0.000101 * T) + math.sin(3 * Mr) * 0.000289)
    tl = L0 + C
    om = 125.04 - 1934.136 * T
    lam = tl - 0.00569 - 0.00478 * math.sin(math.radians(om))
    eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60
    eps = eps0 + 0.00256 * math.cos(math.radians(om))
    dec = math.degrees(math.asin(math.sin(math.radians(eps)) * math.sin(math.radians(lam))))
    y = math.tan(math.radians(eps / 2)) ** 2
    L0r = math.radians(L0)
    eot = 4 * math.degrees(y * math.sin(2 * L0r) - 2 * e * math.sin(Mr) + 4 * e * y * math.sin(Mr) * math.cos(2 * L0r) - 0.5 * y * y * math.sin(4 * L0r) - 1.25 * e * e * math.sin(2 * Mr))
    return dec, eot


def hm(m):
    return "%02d:%02d" % (int(m // 60), int(round(m % 60)) % 60 if round(m % 60) < 60 else 0)


for day in (1, 2, 3):
    jd = jd_of(1863, 7, day) + 0.5  # noon UT approx for sun position
    dec, eot = sun(jd)
    noon_lmt = 720 - eot  # local mean time of solar transit, minutes
    out = {"noon": noon_lmt}
    for name, alt in (("sunrise", -0.833), ("civil", -6.0), ("naut", -12.0)):
        cosH = (math.sin(math.radians(alt)) - math.sin(math.radians(lat)) * math.sin(math.radians(dec))) / (math.cos(math.radians(lat)) * math.cos(math.radians(dec)))
        H = math.degrees(math.acos(cosH)) * 4  # minutes
        out[name + "_am"] = noon_lmt - H
        out[name + "_pm"] = noon_lmt + H
    print("1863-07-%02d dec %.3f eot %.2f" % (day, dec, eot), {k: "%d:%02d" % (int(v // 60), round(v % 60)) for k, v in out.items()})

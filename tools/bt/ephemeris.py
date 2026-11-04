#!/usr/bin/env python
"""Per-minute sun and moon ephemeris at Gettysburg for the Battle Theatre (PDF B.10.2, gate Q11).

Site 39.83 N, 77.23 W, 170 m.  Clock = local mean time (LMT = UT + longitude/15 h = UT - 5 h 08.92 min;
the PDF rounds this to "UTC minus 5 h 09 m").  Windows: 1863-06-26..1863-07-06 and 1863-11-18..19.

Two independent methods (nothing in B imports or calls astropy):
  A  astropy builtin ephemeris (ERFA epv00 for Earth/Sun, ERFA moon98 for the Moon), full
     GCRS -> ITRS -> AltAz topocentric transform, geometric (no refraction).
  B  own pure-Python/numpy implementation: Meeus "Astronomical Algorithms" ch.25 (Sun, low accuracy,
     with aberration and nutation), ch.47 (Moon, full 60+60 term series with the A1-A3 and E
     corrections), ch.22 nutation (short form), ch.11/40 topocentric parallax, ch.12 sidereal time,
     ch.48 illuminated fraction.

Shared assumption (declared, not independent): DeltaT = TT - UT.  Both methods use the Espenak/Meeus
polynomial for 1860-1900 (about 7.2 s in 1863).  Sensitivity to this is measured in main().

Altitudes are geometric topocentric altitudes of the body CENTRE (no refraction, no local terrain horizon).
Rise/set: Sun centre at -0.833 deg; Moon upper limb with 34' refraction, i.e. topocentric centre altitude
-(34' + semidiameter).  Twilights: Sun centre at -6, -12, -18 deg.

Usage:  PYTHONIOENCODING=utf-8 python tools/bt/ephemeris.py        (writes the JSON files; ~1-2 min)
"""
import datetime as dt
import gzip
import json
import math
import os
import sys
import warnings

import numpy as np

LAT = 39.83
LON_E = -77.23
HEIGHT_M = 170.0
LMT_OFFSET_H = LON_E / 15.0            # -5.148667 h  (5 h 08 m 55.2 s behind UT)
AU_KM = 149597870.7
SUN_H0 = -0.833
TWILIGHT = {"civil": -6.0, "nautical": -12.0, "astronomical": -18.0}

# (first LMT date, last LMT date) of the table
SEGMENTS = [("battle", dt.date(1863, 6, 26), dt.date(1863, 7, 6)),
            ("epilogue", dt.date(1863, 11, 18), dt.date(1863, 11, 19))]
PAD_DAYS = 1


# --------------------------------------------------------------------------- time
def delta_t_seconds(year):
    """TT - UT in seconds, Espenak & Meeus polynomial for 1860-1900 (NASA eclipse site)."""
    t = year - 1860.0
    return 7.62 + 0.5737 * t - 0.251754 * t ** 2 + 0.01680668 * t ** 3 - 0.0004473624 * t ** 4 + t ** 5 / 233174.0


def jd_of_lmt(date, minute):
    """Julian date (UT) for local-mean-time `date` + `minute` (float array of minutes since LMT midnight)."""
    jd0 = date.toordinal() + 1721424.5          # 0h UT of that civil date (proleptic Gregorian)
    return jd0 + np.asarray(minute, dtype=float) / 1440.0 - LMT_OFFSET_H / 24.0


def decimal_year(jd):
    return 2000.0 + (np.asarray(jd) - 2451544.5) / 365.25


def lmt_label(date, minute):
    m = int(round(minute))
    d = date + dt.timedelta(days=m // 1440)
    m = m % 1440
    return "%s %02d:%02d" % (d.isoformat(), m // 60, m % 60)


def build_grid(pad=PAD_DAYS):
    """Return list of segment dicts with 'date0','ndays','jd_ut' (padded), 'pad' (index offset)."""
    segs = []
    for name, d0, d1 in SEGMENTS:
        first = d0 - dt.timedelta(days=pad)
        ndays = (d1 - d0).days + 1 + 2 * pad
        minutes = np.arange(ndays * 1440, dtype=float)
        jd = jd_of_lmt(first, minutes)
        segs.append(dict(name=name, first=first, d0=d0, d1=d1, ndays=ndays, minutes=minutes, jd_ut=jd,
                         pad_min=pad * 1440, n_table=((d1 - d0).days + 1) * 1440))
    return segs


# --------------------------------------------------------------------------- method A: astropy
def method_a(jd_ut, dts=None):
    """astropy builtin ephemeris.  Returns dict of arrays."""
    from astropy.utils import iers
    iers.conf.auto_download = False
    iers.conf.iers_degraded_accuracy = "ignore"
    from astropy.time import Time
    from astropy.coordinates import EarthLocation, AltAz, get_body, get_sun, solar_system_ephemeris
    import astropy.units as u
    import astropy
    solar_system_ephemeris.set("builtin")
    jd_ut = np.asarray(jd_ut, dtype=float)
    dts = delta_t_seconds(decimal_year(jd_ut)) if dts is None else np.broadcast_to(np.asarray(dts, float), jd_ut.shape)
    loc = EarthLocation(lat=LAT * u.deg, lon=LON_E * u.deg, height=HEIGHT_M * u.m)
    out = {k: [] for k in ("sun_alt", "sun_az", "moon_alt", "moon_az", "moon_dist_km", "illum")}
    CH = 6000
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        for i in range(0, len(jd_ut), CH):
            jd = jd_ut[i:i + CH]
            dT = dts[i:i + CH]
            t = Time(jd + dT / 86400.0, format="jd", scale="tt")
            # force UT1 = the intended UT (the 1863 UTC scale does not exist; IERS has nothing before 1962)
            t.delta_ut1_utc = 32.184 - dT
            err = np.abs(t.ut1.jd - jd).max() * 86400.0
            if err > 1e-3:
                raise RuntimeError("UT1 override failed: %g s" % err)
            frame = AltAz(obstime=t, location=loc)
            s = get_sun(t).transform_to(frame)
            m_topo = get_body("moon", t, location=loc).transform_to(frame)
            m_geo = get_body("moon", t)          # geocentric, for distance and phase
            s_geo = get_sun(t)
            mv = m_geo.cartesian.xyz.to(u.km).value
            sv = s_geo.cartesian.xyz.to(u.km).value
            mv = mv.reshape(3, -1)
            sv = sv.reshape(3, -1)
            # phase angle i = angle Earth-Moon-Sun, taken from the vectors (independent of the Meeus ch.48 formula)
            a = -mv
            b = sv - mv
            cosi = np.sum(a * b, axis=0) / (np.linalg.norm(a, axis=0) * np.linalg.norm(b, axis=0))
            out["sun_alt"].append(s.alt.deg)
            out["sun_az"].append(s.az.deg)
            out["moon_alt"].append(m_topo.alt.deg)
            out["moon_az"].append(m_topo.az.deg)
            out["moon_dist_km"].append(np.linalg.norm(mv, axis=0))
            out["illum"].append((1.0 + cosi) / 2.0)
    res = {k: np.concatenate(v) for k, v in out.items()}
    res["_version"] = "astropy %s, pyerfa %s, builtin ephemeris" % (astropy.__version__, __import__("erfa").__version__)
    return res


# --------------------------------------------------------------------------- method B: Meeus
_D = np.radians
# Meeus Table 47.A: D, M, M', F, sum_l (1e-6 deg), sum_r (1e-3 km)
_T47A = [
    (0, 0, 1, 0, 6288774, -20905355), (2, 0, -1, 0, 1274027, -3699111), (2, 0, 0, 0, 658314, -2955968),
    (0, 0, 2, 0, 213618, -569925), (0, 1, 0, 0, -185116, 48888), (0, 0, 0, 2, -114332, -3149),
    (2, 0, -2, 0, 58793, 246158), (2, -1, -1, 0, 57066, -152138), (2, 0, 1, 0, 53322, -170733),
    (2, -1, 0, 0, 45758, -204586), (0, 1, -1, 0, -40923, -129620), (1, 0, 0, 0, -34720, 108743),
    (0, 1, 1, 0, -30383, 104755), (2, 0, 0, -2, 15327, 10321), (0, 0, 1, 2, -12528, 0),
    (0, 0, 1, -2, 10980, 79661), (4, 0, -1, 0, 10675, -34782), (0, 0, 3, 0, 10034, -23210),
    (4, 0, -2, 0, 8548, -21636), (2, 1, -1, 0, -7888, 24208), (2, 1, 0, 0, -6766, 30824),
    (1, 0, -1, 0, -5163, -8379), (1, 1, 0, 0, 4987, -16675), (2, -1, 1, 0, 4036, -12831),
    (2, 0, 2, 0, 3994, -10445), (4, 0, 0, 0, 3861, -11650), (2, 0, -3, 0, 3665, 14403),
    (0, 1, -2, 0, -2689, -7003), (2, 0, -1, 2, -2602, 0), (2, -1, -2, 0, 2390, 10056),
    (1, 0, 1, 0, -2348, 6322), (2, -2, 0, 0, 2236, -9884), (0, 1, 2, 0, -2120, 5751),
    (0, 2, 0, 0, -2069, 0), (2, -2, -1, 0, 2048, -4950), (2, 0, 1, -2, -1773, 4130),
    (2, 0, 0, 2, -1595, 0), (4, -1, -1, 0, 1215, -3958), (0, 0, 2, 2, -1110, 0),
    (3, 0, -1, 0, -892, 3258), (2, 1, 1, 0, -810, 2616), (4, -1, -2, 0, 759, -1897),
    (0, 2, -1, 0, -713, -2117), (2, 2, -1, 0, -700, 2354), (2, 1, -2, 0, 691, 0),
    (2, -1, 0, -2, 596, 0), (4, 0, 1, 0, 549, -1423), (0, 0, 4, 0, 537, -1117),
    (4, -1, 0, 0, 520, -1571), (1, 0, -2, 0, -487, -1739), (2, 1, 0, -2, -399, 0),
    (0, 0, 2, -2, -381, -4421), (1, 1, 1, 0, 351, 0), (3, 0, -2, 0, -340, 0),
    (4, 0, -3, 0, 330, 0), (2, -1, 2, 0, 327, 0), (0, 2, 1, 0, -323, 1165),
    (1, 1, -1, 0, 299, 0), (2, 0, 3, 0, 294, 0), (2, 0, -1, -2, 0, 8752),
]
# Meeus Table 47.B: D, M, M', F, sum_b (1e-6 deg)
_T47B = [
    (0, 0, 0, 1, 5128122), (0, 0, 1, 1, 280602), (0, 0, 1, -1, 277693), (2, 0, 0, -1, 173237),
    (2, 0, -1, 1, 55413), (2, 0, -1, -1, 46271), (2, 0, 0, 1, 32573), (0, 0, 2, 1, 17198),
    (2, 0, 1, -1, 9266), (0, 0, 2, -1, 8822), (2, -1, 0, -1, 8216), (2, 0, -2, -1, 4324),
    (2, 0, 1, 1, 4200), (2, 1, 0, -1, -3359), (2, -1, -1, 1, 2463), (2, -1, 0, 1, 2211),
    (2, -1, -1, -1, 2065), (0, 1, -1, -1, -1870), (4, 0, -1, -1, 1828), (0, 1, 0, 1, -1794),
    (0, 0, 0, 3, -1749), (0, 1, -1, 1, -1565), (1, 0, 0, 1, -1491), (0, 1, 1, 1, -1475),
    (0, 1, 1, -1, -1410), (0, 1, 0, -1, -1344), (1, 0, 0, -1, -1335), (0, 0, 3, 1, 1107),
    (4, 0, 0, -1, 1021), (4, 0, -1, 1, 833), (0, 0, 1, -3, 777), (4, 0, -2, 1, 671),
    (2, 0, 0, -3, 607), (2, 0, 2, -1, 596), (2, -1, 1, -1, 491), (2, 0, -2, 1, -451),
    (0, 0, 3, -1, 439), (2, 0, 2, 1, 422), (2, 0, -3, -1, 421), (2, 1, -1, 1, -366),
    (2, 1, 0, 1, -351), (4, 0, 0, 1, 331), (2, -1, 1, 1, 315), (2, -2, 0, -1, 302),
    (0, 0, 1, 3, -283), (2, 1, 1, -1, -229), (1, 1, 0, -1, 223), (1, 1, 0, 1, 223),
    (0, 1, -2, -1, -220), (2, 1, -1, -1, -220), (1, 0, 1, 1, -185), (2, -1, -2, -1, 181),
    (0, 1, 2, 1, -177), (4, 0, -2, -1, 176), (4, -1, -1, -1, 166), (1, 0, 1, -1, -164),
    (4, 0, 1, -1, 132), (1, 0, -1, -1, -119), (4, -1, 0, -1, 115), (2, -2, 0, 1, 107),
]


def _sin(x):
    return np.sin(np.radians(x))


def _cos(x):
    return np.cos(np.radians(x))


def meeus_moon_geocentric(jde):
    """Meeus ch.47.  Returns (lambda_deg geometric of date, beta_deg, distance_km)."""
    T = (np.asarray(jde, dtype=float) - 2451545.0) / 36525.0
    Lp = 218.3164477 + 481267.88123421 * T - 0.0015786 * T ** 2 + T ** 3 / 538841.0 - T ** 4 / 65194000.0
    D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T ** 2 + T ** 3 / 545868.0 - T ** 4 / 113065000.0
    M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T ** 2 + T ** 3 / 24490000.0
    Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T ** 2 + T ** 3 / 69699.0 - T ** 4 / 14712000.0
    F = 93.2720950 + 483202.0175233 * T - 0.0036539 * T ** 2 - T ** 3 / 3526000.0 + T ** 4 / 863310000.0
    A1 = 119.75 + 131.849 * T
    A2 = 53.09 + 479264.290 * T
    A3 = 313.45 + 481266.484 * T
    E = 1.0 - 0.002516 * T - 0.0000074 * T ** 2
    sl = np.zeros_like(T)
    sr = np.zeros_like(T)
    sb = np.zeros_like(T)
    for d, m, mp, f, cl, cr in _T47A:
        arg = d * D + m * M + mp * Mp + f * F
        ef = E ** abs(m)
        sl += cl * ef * _sin(arg)
        sr += cr * ef * _cos(arg)
    for d, m, mp, f, cb in _T47B:
        arg = d * D + m * M + mp * Mp + f * F
        sb += cb * (E ** abs(m)) * _sin(arg)
    sl += 3958 * _sin(A1) + 1962 * _sin(Lp - F) + 318 * _sin(A2)
    sb += (-2235 * _sin(Lp) + 382 * _sin(A3) + 175 * _sin(A1 - F) + 175 * _sin(A1 + F)
           + 127 * _sin(Lp - Mp) - 115 * _sin(Lp + Mp))
    lam = (Lp + sl / 1e6) % 360.0
    beta = sb / 1e6
    dist = 385000.56 + sr / 1000.0
    return lam, beta, dist


def meeus_sun_geocentric(jde):
    """Meeus ch.25 low-accuracy Sun.  Returns (true longitude of date deg, R in AU)."""
    T = (np.asarray(jde, dtype=float) - 2451545.0) / 36525.0
    L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T ** 2
    M = 357.52911 + 35999.05029 * T - 0.0001537 * T ** 2
    e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T ** 2
    C = ((1.914602 - 0.004817 * T - 0.000014 * T ** 2) * _sin(M) + (0.019993 - 0.000101 * T) * _sin(2 * M)
         + 0.000289 * _sin(3 * M))
    true_lon = (L0 + C) % 360.0
    nu = M + C
    R = 1.000001018 * (1 - e ** 2) / (1 + e * _cos(nu))
    return true_lon, R


def meeus_nutation(T):
    """Short-form nutation (Meeus ch.22 / ch.25 note): dpsi, deps in degrees."""
    Om = 125.04452 - 1934.136261 * T
    L = 280.4665 + 36000.7698 * T
    Lp = 218.3165 + 481267.8813 * T
    dpsi = (-17.20 * _sin(Om) - 1.32 * _sin(2 * L) - 0.23 * _sin(2 * Lp) + 0.21 * _sin(2 * Om)) / 3600.0
    deps = (9.20 * _cos(Om) + 0.57 * _cos(2 * L) + 0.10 * _cos(2 * Lp) - 0.09 * _cos(2 * Om)) / 3600.0
    return dpsi, deps


def mean_obliquity(T):
    return 23.0 + 26.0 / 60 + 21.448 / 3600 - (46.8150 * T + 0.00059 * T ** 2 - 0.001813 * T ** 3) / 3600.0


def gmst_deg(jd_ut):
    jd_ut = np.asarray(jd_ut, dtype=float)
    T = (jd_ut - 2451545.0) / 36525.0
    th = 280.46061837 + 360.98564736629 * (jd_ut - 2451545.0) + 0.000387933 * T ** 2 - T ** 3 / 38710000.0
    return th % 360.0


def ecl_to_equ(lam, beta, eps):
    lam_r, b_r, e_r = np.radians(lam), np.radians(beta), np.radians(eps)
    ra = np.degrees(np.arctan2(np.sin(lam_r) * np.cos(e_r) - np.tan(b_r) * np.sin(e_r), np.cos(lam_r))) % 360.0
    dec = np.degrees(np.arcsin(np.sin(b_r) * np.cos(e_r) + np.cos(b_r) * np.sin(e_r) * np.sin(lam_r)))
    return ra, dec


def _observer_terms():
    phi = math.radians(LAT)
    u = math.atan(0.99664719 * math.tan(phi))
    rs = 0.99664719 * math.sin(u) + (HEIGHT_M / 6378140.0) * math.sin(phi)
    rc = math.cos(u) + (HEIGHT_M / 6378140.0) * math.cos(phi)
    return rs, rc


def topocentric_altaz(ra, dec, sin_pi, theta):
    """Meeus ch.40 parallax + ch.13 horizontal conversion.  ra, dec, theta in degrees, returns alt, az (az from N)."""
    rs, rc = _observer_terms()
    H = np.radians((theta + LON_E - ra) % 360.0)
    d = np.radians(dec)
    dra = np.arctan2(-rc * sin_pi * np.sin(H), np.cos(d) - rc * sin_pi * np.cos(H))
    dec_t = np.arctan2((np.sin(d) - rs * sin_pi) * np.cos(dra), np.cos(d) - rc * sin_pi * np.cos(H))
    Ht = H - dra
    phi = math.radians(LAT)
    alt = np.degrees(np.arcsin(np.sin(phi) * np.sin(dec_t) + np.cos(phi) * np.cos(dec_t) * np.cos(Ht)))
    az = (np.degrees(np.arctan2(np.sin(Ht), np.cos(Ht) * math.sin(phi) - np.tan(dec_t) * math.cos(phi))) + 180.0) % 360.0
    return alt, az


def method_b(jd_ut, dts=None):
    jd_ut = np.asarray(jd_ut, dtype=float)
    dts = delta_t_seconds(decimal_year(jd_ut)) if dts is None else np.broadcast_to(np.asarray(dts, float), jd_ut.shape)
    jde = jd_ut + dts / 86400.0
    T = (jde - 2451545.0) / 36525.0
    dpsi, deps = meeus_nutation(T)
    eps = mean_obliquity(T) + deps
    theta = (gmst_deg(jd_ut) + dpsi * np.cos(np.radians(eps))) % 360.0   # apparent sidereal time
    # Sun
    slon, R_au = meeus_sun_geocentric(jde)
    slon_app = slon + dpsi - 20.4898 / 3600.0 / R_au                      # nutation + aberration
    sra, sdec = ecl_to_equ(slon_app, 0.0, eps)
    sin_pi_s = np.sin(np.radians(8.794 / 3600.0 / R_au))
    s_alt, s_az = topocentric_altaz(sra, sdec, sin_pi_s, theta)
    # Moon
    mlon, mlat, mdist = meeus_moon_geocentric(jde)
    mra, mdec = ecl_to_equ(mlon + dpsi, mlat, eps)
    sin_pi_m = 6378.14 / mdist
    m_alt, m_az = topocentric_altaz(mra, mdec, sin_pi_m, theta)
    # Illuminated fraction, Meeus ch.48 (geocentric elongation psi, then phase angle i)
    sr_, sd_, mr_, md_ = map(np.radians, (sra, sdec, mra, mdec))
    cospsi = np.sin(sd_) * np.sin(md_) + np.cos(sd_) * np.cos(md_) * np.cos(sr_ - mr_)
    psi = np.arccos(np.clip(cospsi, -1, 1))
    R_km = R_au * AU_KM
    i = np.arctan2(R_km * np.sin(psi), mdist - R_km * np.cos(psi))
    illum = (1.0 + np.cos(i)) / 2.0
    return dict(sun_alt=s_alt, sun_az=s_az, moon_alt=m_alt, moon_az=m_az, moon_dist_km=mdist, illum=illum,
                _version="own Meeus (AA 2nd ed. ch.11,12,22,25,40,47,48), numpy %s" % np.__version__)


# --------------------------------------------------------------------------- events
def crossings(t, f):
    """Linear-interpolated zero crossings of f(t).  Returns arrays (t_cross, direction +1 rising / -1 falling)."""
    s = np.sign(f)
    idx = np.where(s[:-1] * s[1:] < 0)[0]
    tc = t[idx] + f[idx] / (f[idx] - f[idx + 1]) * (t[idx + 1] - t[idx])
    return tc, np.sign(f[idx + 1] - f[idx])


def moon_h0(dist_km):
    sd = np.degrees(np.arcsin(1737.4 / dist_km))
    return -(34.0 / 60.0 + sd)


def day_events(seg, res):
    """Events per LMT date of the table.  Times are minutes since local-mean-time midnight of that date."""
    t = seg["minutes"]
    ev = {}
    pad = seg["pad_min"]
    ndays = (seg["d1"] - seg["d0"]).days + 1

    def put(name, tcs):
        for tc in tcs:
            k = int(math.floor((tc - pad) / 1440.0))
            if 0 <= k < ndays:
                date = seg["d0"] + dt.timedelta(days=k)
                ev.setdefault(date.isoformat(), {}).setdefault(name, []).append(float(tc - pad - 1440.0 * k))

    sa = res["sun_alt"]
    tc, d = crossings(t, sa - SUN_H0)
    put("sunrise", tc[d > 0])
    put("sunset", tc[d < 0])
    for nm, thr in TWILIGHT.items():
        tc, d = crossings(t, sa - thr)
        put(nm + "_dawn", tc[d > 0])
        put(nm + "_dusk", tc[d < 0])
    # solar transit: azimuth crossing 180 rising
    az = res["sun_az"]
    for nm, a, alt in (("sun_transit", res["sun_az"], res["sun_alt"]), ("moon_transit", res["moon_az"], res["moon_alt"])):
        f = a - 180.0
        idx = np.where((f[:-1] < 0) & (f[1:] >= 0) & (np.abs(f[:-1]) < 90) & (np.abs(f[1:]) < 90))[0]
        tcs = t[idx] + (-f[idx]) / (f[idx + 1] - f[idx])
        put(nm, tcs)
        for tcv, i in zip(tcs, idx):
            k = int(math.floor((tcv - pad) / 1440.0))
            if 0 <= k < ndays:
                fr = tcv - t[i]
                ev[(seg["d0"] + dt.timedelta(days=k)).isoformat()].setdefault(nm + "_alt", []).append(
                    float(alt[i] + fr * (alt[i + 1] - alt[i])))
    ma = res["moon_alt"] - moon_h0(res["moon_dist_km"])
    tc, d = crossings(t, ma)
    put("moonrise", tc[d > 0])
    put("moonset", tc[d < 0])
    return ev


def interp_at(seg, res, key, minute_of_first_day_zero):
    """Interpolate a result array at a given minutes-since-(seg padded start) value."""
    return float(np.interp(minute_of_first_day_zero, seg["minutes"], res[key]))


# --------------------------------------------------------------------------- comparison
def circ_diff(a, b):
    return (a - b + 180.0) % 360.0 - 180.0


def stats(x):
    x = np.asarray(x, dtype=float)
    return dict(max_abs=float(np.max(np.abs(x))), rms=float(np.sqrt(np.mean(x ** 2))), mean=float(np.mean(x)), n=int(x.size))


def compare_arrays(a, b, mask_table):
    """Per-minute disagreement statistics A - B restricted to the table rows."""
    out = {}
    sm = mask_table
    out["sun_alt_deg"] = stats((a["sun_alt"] - b["sun_alt"])[sm])
    out["sun_az_deg"] = stats(circ_diff(a["sun_az"], b["sun_az"])[sm])
    out["moon_alt_deg"] = stats((a["moon_alt"] - b["moon_alt"])[sm])
    out["moon_az_deg"] = stats(circ_diff(a["moon_az"], b["moon_az"])[sm])
    sup = sm & (a["sun_alt"] > 0)
    out["sun_alt_deg_sun_above_horizon"] = stats((a["sun_alt"] - b["sun_alt"])[sup])
    out["sun_az_deg_sun_above_horizon"] = stats(circ_diff(a["sun_az"], b["sun_az"])[sup])
    mup = sm & (a["moon_alt"] > 0)
    out["moon_alt_deg_moon_above_horizon"] = stats((a["moon_alt"] - b["moon_alt"])[mup])
    out["moon_az_deg_moon_above_horizon"] = stats(circ_diff(a["moon_az"], b["moon_az"])[mup])
    out["moon_illum_pct"] = stats(100.0 * (a["illum"] - b["illum"])[sm])
    out["moon_distance_km"] = stats((a["moon_dist_km"] - b["moon_dist_km"])[sm])
    return out


def compare_events(evA, evB):
    """Event-by-event difference in minutes (A - B), matched by name and date."""
    diffs = {}
    unmatched = []
    for date, ea in evA.items():
        eb = evB.get(date, {})
        for name, va in ea.items():
            if name.endswith("_alt"):
                continue
            vb = eb.get(name, [])
            if len(va) != len(vb):
                unmatched.append((date, name, len(va), len(vb)))
                continue
            for x, y in zip(sorted(va), sorted(vb)):
                diffs.setdefault(name, []).append(x - y)
    for date, eb in evB.items():
        for name in eb:
            if name.endswith("_alt"):
                continue
            if name not in evA.get(date, {}):
                unmatched.append((date, name, 0, len(eb[name])))
    summary = {}
    allv = []
    for name, v in diffs.items():
        summary[name] = dict(max_abs_min=float(np.max(np.abs(v))), rms_min=float(np.sqrt(np.mean(np.square(v)))), n=len(v))
        allv += v
    if allv:
        summary["ALL"] = dict(max_abs_min=float(np.max(np.abs(allv))), rms_min=float(np.sqrt(np.mean(np.square(allv)))), n=len(allv))
    return summary, unmatched


# --------------------------------------------------------------------------- self-test of method B against Meeus's worked example
def selftest_meeus_47a():
    """Meeus example 47.a: 1992 April 12, 0h TD: lambda=133.162655 beta=-3.229126 dist=368409.7 km."""
    lam, beta, dist = meeus_moon_geocentric(np.array([2448724.5]))
    return dict(lambda_deg=float(lam[0]), lambda_expected=133.162655, beta_deg=float(beta[0]), beta_expected=-3.229126,
                dist_km=float(dist[0]), dist_expected=368409.7,
                lambda_err_arcsec=float((lam[0] - 133.162655) * 3600), beta_err_arcsec=float((beta[0] + 3.229126) * 3600),
                dist_err_km=float(dist[0] - 368409.7))


# --------------------------------------------------------------------------- table assembly
def band_code(sun_alt):
    """0 day (>= -0.833), 1 civil twilight, 2 nautical, 3 astronomical, 4 night."""
    a = np.asarray(sun_alt)
    code = np.full(a.shape, 4, dtype=int)
    code[a >= -18.0] = 3
    code[a >= -12.0] = 2
    code[a >= -6.0] = 1
    code[a >= SUN_H0] = 0
    return code


BAND_NAMES = ["day", "civil_twilight", "nautical_twilight", "astronomical_twilight", "night"]


def fmt_hhmm(m):
    mm = int(math.floor(m + 0.5))
    return "%02d:%02d" % (mm // 60, mm % 60)


def run(outdir, verbose=True):
    segs = build_grid()
    allA, allB = [], []
    report = {"segments": {}}
    tables = {}
    evA_all, evB_all = {}, {}
    for seg in segs:
        if verbose:
            print("segment", seg["name"], "minutes", len(seg["jd_ut"]), file=sys.stderr)
        A = method_a(seg["jd_ut"])
        B = method_b(seg["jd_ut"])
        seg["A"], seg["B"] = A, B
        mask = np.zeros(len(seg["jd_ut"]), dtype=bool)
        mask[seg["pad_min"]:seg["pad_min"] + seg["n_table"]] = True
        seg["mask"] = mask
        seg["cmp"] = compare_arrays(A, B, mask)
        seg["evA"] = day_events(seg, A)
        seg["evB"] = day_events(seg, B)
        evA_all.update(seg["evA"])
        evB_all.update(seg["evB"])
    return segs


def combined_stats(segs):
    """Pool the per-minute differences of all segments."""
    cat = {}
    for key in ("sun_alt", "sun_az", "moon_alt", "moon_az", "illum", "moon_dist_km"):
        cat[key + "_A"] = np.concatenate([s["A"][key][s["mask"]] for s in segs])
        cat[key + "_B"] = np.concatenate([s["B"][key][s["mask"]] for s in segs])
    a = {k: cat[k + "_A"] for k in ("sun_alt", "sun_az", "moon_alt", "moon_az", "illum", "moon_dist_km")}
    b = {k: cat[k + "_B"] for k in ("sun_alt", "sun_az", "moon_alt", "moon_az", "illum", "moon_dist_km")}
    return compare_arrays(a, b, np.ones(len(a["sun_alt"]), dtype=bool))


def write_table(segs, outdir, meta):
    os.makedirs(outdir, exist_ok=True)
    seg_out = []
    for seg in segs:
        sl = slice(seg["pad_min"], seg["pad_min"] + seg["n_table"])
        A = seg["A"]
        sa = A["sun_alt"][sl]
        ma = A["moon_alt"][sl]
        h0 = moon_h0(A["moon_dist_km"][sl])
        events = {}
        for date, ev in seg["evA"].items():
            events[date] = {k: ([round(x, 3) for x in v] if k.endswith("_alt") else [round(x, 3) for x in v])
                            for k, v in ev.items()}
        seg_out.append(dict(
            name=seg["name"], first_lmt_date=seg["d0"].isoformat(), last_lmt_date=seg["d1"].isoformat(),
            minutes_per_day=1440, n_rows=int(seg["n_table"]),
            columns={
                "sun_alt_deg": [round(float(x), 3) for x in sa],
                "sun_az_deg": [round(float(x), 3) for x in A["sun_az"][sl]],
                "moon_alt_deg": [round(float(x), 3) for x in ma],
                "moon_az_deg": [round(float(x), 3) for x in A["moon_az"][sl]],
                "moon_illum_pct": [round(float(x) * 100, 2) for x in A["illum"][sl]],
                "sun_band": [int(x) for x in band_code(sa)],
                "moon_up": [int(x) for x in (ma >= h0)],
            },
            events_lmt_minutes_since_midnight=events,
        ))
    doc = dict(meta, segments=seg_out)
    path = os.path.join(outdir, "ephemeris_1863.json")
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(doc, fh, separators=(",", ":"))
    return path, os.path.getsize(path)




# --------------------------------------------------------------------------- lunar phases (opposition etc.)
def _ecl_lon_a(jd_ut):
    """astropy: geocentric true-ecliptic-of-date longitudes of Sun and Moon (apparent, includes nutation)."""
    from astropy.utils import iers
    iers.conf.auto_download = False
    iers.conf.iers_degraded_accuracy = "ignore"
    from astropy.time import Time
    from astropy.coordinates import get_body, get_sun, GeocentricTrueEcliptic
    jd_ut = np.asarray(jd_ut, float)
    dT = delta_t_seconds(decimal_year(jd_ut))
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        t = Time(jd_ut + dT / 86400.0, format="jd", scale="tt")
        t.delta_ut1_utc = 32.184 - dT
        fr = GeocentricTrueEcliptic(equinox=t, obstime=t)
        s = get_sun(t).transform_to(fr)
        m = get_body("moon", t).transform_to(fr)
        return s.lon.deg, m.lon.deg


def _ecl_lon_b(jd_ut):
    jd_ut = np.asarray(jd_ut, float)
    dT = delta_t_seconds(decimal_year(jd_ut))
    jde = jd_ut + dT / 86400.0
    T = (jde - 2451545.0) / 36525.0
    dpsi, _ = meeus_nutation(T)
    slon, R = meeus_sun_geocentric(jde)
    mlon, _, _ = meeus_moon_geocentric(jde)
    return (slon + dpsi - 20.4898 / 3600.0 / R) % 360.0, (mlon + dpsi) % 360.0


def phase_time_utc(jd_guess, target_deg, lonfun, half_window_days=0.75):
    """UT Julian date at which (moon_lon - sun_lon) crosses target_deg, searched on a 1-minute grid then linear."""
    n = int(half_window_days * 2 * 1440) + 1
    jd = jd_guess - half_window_days + np.arange(n) / 1440.0
    s, m = lonfun(jd)
    f = circ_diff((m - s) % 360.0, np.full_like(jd, target_deg))
    tc, d = crossings(jd, f)
    tc = tc[d > 0]
    if len(tc) != 1:
        raise RuntimeError("phase search found %d crossings" % len(tc))
    return float(tc[0])


def jd_to_utc_str(jd):
    d = dt.datetime(2000, 1, 1, 12) + dt.timedelta(days=float(jd) - 2451545.0)
    return d.strftime("%Y-%m-%d %H:%M:%S")


def lmt_of_jd(jd):
    d = dt.datetime(2000, 1, 1, 12) + dt.timedelta(days=float(jd) - 2451545.0 + LMT_OFFSET_H / 24.0)
    return d.strftime("%Y-%m-%d %H:%M:%S")


# NASA/Espenak principal phases (UT, whole minutes) as already retrieved into the repo's data-src/environment/astro_by_day.json
# (nasa_parsed_window); the 1863-06-01 23:29 full moon is the figure printed in the PDF (a total lunar eclipse).
PHASE_REFS = [
    ("New Moon", 0.0, "1863-06-16 07:36"),
    ("First Quarter", 90.0, "1863-06-24 10:32"),
    ("Full Moon", 180.0, "1863-07-01 06:46"),
    ("Last Quarter", 270.0, "1863-07-07 22:29"),
    ("New Moon", 0.0, "1863-07-15 22:54"),
    ("Full Moon", 180.0, "1863-06-01 23:29"),
]


def lunar_phases():
    out = []
    for name, tgt, ref in PHASE_REFS:
        d = dt.datetime.strptime(ref[:16], "%Y-%m-%d %H:%M")
        jd_ref = (d - dt.datetime(2000, 1, 1, 12)).total_seconds() / 86400.0 + 2451545.0
        ja = phase_time_utc(jd_ref, tgt, _ecl_lon_a)
        jb = phase_time_utc(jd_ref, tgt, _ecl_lon_b)
        out.append(dict(phase=name, reference_ut_minute=ref, A_ut=jd_to_utc_str(ja), B_ut=jd_to_utc_str(jb),
                        A_minus_ref_min=(ja - jd_ref) * 1440.0, B_minus_ref_min=(jb - jd_ref) * 1440.0,
                        A_minus_B_s=(ja - jb) * 86400.0, A_lmt=lmt_of_jd(ja)))
    return out


# --------------------------------------------------------------------------- comparison with the repo's earlier (astronomy-engine) files
def _hms_to_min(s):
    h, m, sec = s.split(":")
    return int(h) * 60 + int(m) + float(sec) / 60.0


def compare_with_astro_by_day(segs, root):
    path = os.path.join(root, "data-src", "environment", "astro_by_day.json")
    d = json.load(open(path, encoding="utf-8"))
    evA, evB = {}, {}
    for s in segs:
        evA.update(s["evA"])
        evB.update(s["evB"])
    keymap = {("sun", "civil_dawn"): "civil_dawn", ("sun", "sunrise"): "sunrise", ("sun", "solar_transit"): "sun_transit",
              ("sun", "sunset"): "sunset", ("sun", "civil_dusk"): "civil_dusk", ("sun", "nautical_dawn"): "nautical_dawn",
              ("sun", "nautical_dusk"): "nautical_dusk", ("moon", "moonrise"): "moonrise", ("moon", "moon_transit"): "moon_transit",
              ("moon", "moonset"): "moonset"}
    rows = []
    for day in d["days"]:
        date = day["date"]
        if date not in evA:
            continue
        for (grp, k), mine in keymap.items():
            ref = day[grp].get(k)
            if not ref or not ref.get("lmt_hms"):
                if evA[date].get(mine):
                    rows.append(dict(date=date, event=mine, note="reference has none, we have one"))
                continue
            r = _hms_to_min(ref["lmt_hms"])
            a = evA[date].get(mine, [])
            b = evB[date].get(mine, [])
            if not a or not b:
                rows.append(dict(date=date, event=mine, ref_min=r, note="not found by A or B"))
                continue
            rows.append(dict(date=date, event=mine, ref_min=r, A_minus_ref_s=(a[0] - r) * 60.0, B_minus_ref_s=(b[0] - r) * 60.0))
    va = [abs(r["A_minus_ref_s"]) for r in rows if "A_minus_ref_s" in r]
    vb = [abs(r["B_minus_ref_s"]) for r in rows if "B_minus_ref_s" in r]
    byev = {}
    for r in rows:
        if "A_minus_ref_s" in r:
            e = byev.setdefault(r["event"], dict(A=[], B=[]))
            e["A"].append(abs(r["A_minus_ref_s"]))
            e["B"].append(abs(r["B_minus_ref_s"]))
    return dict(reference="data-src/environment/astro_by_day.json (astronomy-engine 2.1.19, 39.8309 N 77.2311 W, 0 m; "
                          "itself cross-checked there against the USNO AA API within 0.5 min). Reference seconds are as stored (lmt_hms).",
                n_events=len(va), max_abs_s_A=max(va), rms_s_A=float(np.sqrt(np.mean(np.square(va)))),
                max_abs_s_B=max(vb), rms_s_B=float(np.sqrt(np.mean(np.square(vb)))),
                by_event={k: dict(A_max_s=max(v["A"]), B_max_s=max(v["B"]), n=len(v["A"])) for k, v in byev.items()},
                rows_without_pair=[r for r in rows if "A_minus_ref_s" not in r])


def compare_with_astro_by_tick(root):
    path = os.path.join(root, "data-src", "environment", "astro_by_tick.json")
    t = json.load(open(path, encoding="utf-8"))
    rows = t["rows"]
    lm = np.array([r[1] for r in rows], dtype=float)           # minutes since 1863-07-01 00:00 LMT (their lon -77.2311)
    ref = dict(sun_alt=np.array([r[3] for r in rows], float), sun_az=np.array([r[4] for r in rows], float),
               moon_alt=np.array([r[5] for r in rows], float), moon_az=np.array([r[6] for r in rows], float),
               illum=np.array([r[7] for r in rows], float))
    # their LMT uses 77.2311 W: UT = LMT_theirs + 5.14874 h
    jd = dt.date(1863, 7, 1).toordinal() + 1721424.5 + lm / 1440.0 + 5.14874 / 24.0
    A = method_a(jd)
    B = method_b(jd)
    out = dict(reference="data-src/environment/astro_by_tick.json rows (astronomy-engine, geometric, 39.8309 N 77.2311 W, 0 m)",
               n=int(len(jd)))
    mu = ref["moon_alt"] > 0
    for nm, R in (("A", A), ("B", B)):
        out[nm] = dict(
            sun_alt_deg=stats(R["sun_alt"] - ref["sun_alt"]), sun_az_deg=stats(circ_diff(R["sun_az"], ref["sun_az"])),
            moon_alt_deg=stats(R["moon_alt"] - ref["moon_alt"]), moon_az_deg_moon_up=stats(circ_diff(R["moon_az"], ref["moon_az"])[mu]),
            moon_illum_pct=stats(100 * R["illum"] - ref["illum"]))
    out["note"] = ("reference values are rounded to 0.01 deg alt, 0.1 deg az, 0.1 pct; site differs by 0.0009 deg lat, "
                   "0.0011 deg lon, 170 m height (the reference used 0 m)")
    return out


def sensitivity(segs):
    """Effect of the DeltaT assumption on the battle table rows (method B, which has the same DeltaT dependence as A):
    DeltaT = 32.184 s (what a naive astropy run with UTC input effectively uses) and +-3 s about the polynomial."""
    seg = segs[0]
    sl = slice(seg["pad_min"], seg["pad_min"] + seg["n_table"])
    jd = seg["jd_ut"][sl]
    b0 = {k: v[sl] for k, v in seg["B"].items() if not k.startswith("_")}
    base_dt = delta_t_seconds(decimal_year(jd))
    out = {}
    for label, dts in (("deltaT_32.184s_naive_UTC_to_TT", 32.184), ("deltaT_plus3s", base_dt + 3.0), ("deltaT_minus3s", base_dt - 3.0)):
        alt = method_b(jd, dts)
        out[label] = dict(
            sun_alt_deg_max=float(np.max(np.abs(alt["sun_alt"] - b0["sun_alt"]))),
            sun_az_deg_max=float(np.max(np.abs(circ_diff(alt["sun_az"], b0["sun_az"])))),
            moon_alt_deg_max=float(np.max(np.abs(alt["moon_alt"] - b0["moon_alt"]))),
            moon_az_deg_max=float(np.max(np.abs(circ_diff(alt["moon_az"], b0["moon_az"])))),
            illum_pct_max=float(np.max(np.abs(100 * (alt["illum"] - b0["illum"])))))
    return out


def main():
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    outdir = os.path.join(root, "docs", "battle-theatre", "environment")
    segs = run(outdir)
    pooled = combined_stats(segs)
    evA_all, evB_all = {}, {}
    for s in segs:
        evA_all.update(s["evA"])
        evB_all.update(s["evB"])
    ev_cmp, unmatched = compare_events(evA_all, evB_all)
    agreement = dict(
        method_A=segs[0]["A"]["_version"], method_B=segs[0]["B"]["_version"],
        meeus_47a_selftest=selftest_meeus_47a(),
        delta_t_s_at_1863_07_03=float(delta_t_seconds(1863.5)),
        rows_compared=int(sum(s["n_table"] for s in segs)),
        per_minute_A_minus_B=pooled,
        per_segment_A_minus_B={s["name"]: s["cmp"] for s in segs},
        events_A_minus_B_minutes=ev_cmp, events_unmatched=unmatched,
        lunar_phases=lunar_phases(),
        vs_astro_by_day=compare_with_astro_by_day(segs, root),
        vs_astro_by_tick=compare_with_astro_by_tick(root),
        deltaT_sensitivity=sensitivity(segs),
    )
    meta = dict(
        title="Per-minute sun and moon at Gettysburg, 1863-06-26..07-06 and 1863-11-18..19 (local mean time)",
        site=dict(lat_north=LAT, lon_east=LON_E, height_m=HEIGHT_M),
        clock=dict(name="LMT = UT + lon/15 h", offset_from_UT_hours=LMT_OFFSET_H,
                   note="5 h 08 m 55.2 s behind UT. The PDF rounds this to 'UTC minus 5 h 09 m' (4.8 s different). "
                        "Row 0 of each segment is 00:00 LMT of first_lmt_date, one row per minute; row k holds the instant "
                        "of minute k at :00 seconds LMT."),
        table_method="A (astropy builtin ephemeris, selected as the more accurate of the two; B agrees to the numbers in agreement.per_minute_A_minus_B)",
        method_versions=dict(A=segs[0]["A"]["_version"], B=segs[0]["B"]["_version"]),
        delta_t="Espenak/Meeus polynomial for 1860-1900 (about 7.2 s in 1863); UT1 forced to the intended UT in astropy; no IERS data exist for 1863",
        quantities="Geometric topocentric altitude of the body centre (degrees, no refraction), azimuth clockwise from true north (degrees), "
                   "moon_illum_pct = illuminated fraction of the lunar disc from the Earth-Moon-Sun phase angle (percent). "
                   "sun_band: 0 day (alt >= -0.833), 1 civil twilight (>= -6), 2 nautical (>= -12), 3 astronomical (>= -18), 4 night. "
                   "moon_up: 1 when the topocentric moon centre is above -(34' + semidiameter), i.e. the upper limb is above the refracted horizon.",
        horizon_label="ASTRONOMICAL HORIZON ONLY. The local horizon (South Mountain to the west, the Round Tops) is NOT modelled. "
                      "PDF B.10.2 says the terrain model must supply it; the PDF's estimate that South Mountain advances apparent sunset by "
                      "10 to 20 minutes is an estimate, not a computed value, and is not applied here.",
        tier="computed (not measured); the clock is a project convention (no standard time existed in 1863)",
        events_note="events_lmt_minutes_since_midnight: per LMT date, minutes since 00:00 LMT of that date, linear-interpolated between "
                    "minute rows (sub-second); sun_transit/moon_transit are upper transits (azimuth passes 180 deg), *_alt is the altitude at transit.",
        agreement=agreement,
    )
    path, size = write_table(segs, outdir, meta)
    with open(os.path.join(outdir, "ephemeris_agreement.json"), "w", encoding="utf-8") as fh:
        json.dump(agreement, fh, indent=1)
    print("wrote", path, size, "bytes", file=sys.stderr)
    print(json.dumps(agreement["per_minute_A_minus_B"], indent=1))


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    if len(sys.argv) > 1 and sys.argv[1] == "--selftest":
        print(json.dumps(selftest_meeus_47a(), indent=1))
    else:
        main()

#!/usr/bin/env python
"""Gate checks for the Battle Theatre environment layer.

  Q11  ephemeris check (sun and moon equal an independent ephemeris at the site and times)
  Q22  weather state check (weather timeline internally consistent and equal to the PDF's own tables)
  Q10  support: night_luminance_floor(time_iso) documents the readability-floor concept as parameters (no rendering)

Usage:  PYTHONIOENCODING=utf-8 python tools/bt/check_environment.py [--no-recompute]
        --no-recompute skips the ~20 s live A/B recomputation and uses the saved ephemeris_agreement.json numbers.

The script never edits the governance files and never sets any gate's `passes`.  A PDF figure that differs from the computation
is printed and recorded as a FINDING about the PDF; it is not hidden and no tolerance is tuned to make it pass.
"""
import datetime as dt
import json
import math
import os
import re
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import ephemeris as E  # noqa: E402

ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
ENV = os.path.join(ROOT, "docs", "battle-theatre", "environment")
PDF_TXT = os.path.join(ROOT, "tmp", "pdf", "plan-clean.txt")

# Gate Q11 tolerances given by the task owner
TOL_SUN_DEG = 0.05
TOL_RISESET_MIN = 2.0
TOL_MOON_DEG = 0.5


# ----------------------------------------------------------------------------- table access
_TABLE = None


def load_table():
    global _TABLE
    if _TABLE is None:
        _TABLE = json.load(open(os.path.join(ENV, "ephemeris_1863.json"), encoding="utf-8"))
    return _TABLE


def parse_lmt(time_iso):
    """'1863-07-03T13:00' or '1863-07-03 13:00:30' (LMT) -> (date, minutes since that LMT midnight, float)."""
    s = time_iso.strip().replace("T", " ")
    parts = s.split(" ")
    date = dt.date.fromisoformat(parts[0])
    m = 0.0
    if len(parts) > 1:
        hms = [float(x) for x in parts[1].split(":")]
        hms += [0.0] * (3 - len(hms))
        m = hms[0] * 60 + hms[1] + hms[2] / 60.0
    return date, m


def row_at(time_iso):
    """Linear interpolation of the per-minute table at an LMT instant.  Azimuth interpolated on the unwrapped circle."""
    date, m = parse_lmt(time_iso)
    t = load_table()
    for seg in t["segments"]:
        d0 = dt.date.fromisoformat(seg["first_lmt_date"])
        d1 = dt.date.fromisoformat(seg["last_lmt_date"])
        if d0 <= date <= d1:
            k = (date - d0).days * 1440 + m
            i = int(math.floor(k))
            f = k - i
            c = seg["columns"]
            j = min(i + 1, len(c["sun_alt_deg"]) - 1)
            out = {}
            for key in ("sun_alt_deg", "moon_alt_deg", "moon_illum_pct"):
                out[key] = c[key][i] * (1 - f) + c[key][j] * f
            for key in ("sun_az_deg", "moon_az_deg"):
                a, b = c[key][i], c[key][j]
                b = a + (((b - a + 180.0) % 360.0) - 180.0)
                out[key] = (a * (1 - f) + b * f) % 360.0
            out["sun_band"] = E.BAND_NAMES[c["sun_band"][i]]
            out["moon_up"] = bool(c["moon_up"][i])
            return out
    raise ValueError("time outside the table: %s" % time_iso)


def events_of(date_iso):
    t = load_table()
    for seg in t["segments"]:
        if date_iso in seg["events_lmt_minutes_since_midnight"]:
            return seg["events_lmt_minutes_since_midnight"][date_iso]
    raise KeyError(date_iso)


def hhmm(x):
    return int(x[:2]) * 60 + int(x[3:5])


def floor_half(x):
    return math.floor(x + 0.5)


# ----------------------------------------------------------------------------- PDF printed figures (B.10.2, pp.111-112)
SUN_TABLE = {   # astro begins, nautical begins, civil begins, sunrise, noon (time, alt, az), sunset, civil ends, nautical ends, astro ends
    "1863-07-01": ("02:33", "03:21", "04:02", "04:35", ("12:04", 73.3, 180), "19:32", "20:05", "20:46", "21:33"),
    "1863-07-02": ("02:34", "03:21", "04:03", "04:35", ("12:04", 73.2, 180), "19:32", "20:04", "20:45", "21:33"),
    "1863-07-03": ("02:34", "03:22", "04:03", "04:36", ("12:04", 73.2, 180), "19:32", "20:04", "20:45", "21:33"),
    "1863-07-04": ("02:35", "03:23", "04:04", "04:36", ("12:04", 73.1, 180), "19:31", "20:04", "20:45", "21:32"),
}
SUN_TABLE_KEYS = ["astronomical_dawn", "nautical_dawn", "civil_dawn", "sunrise", "sun_transit", "sunset", "civil_dusk", "nautical_dusk",
                  "astronomical_dusk"]

SUN_MOMENTS = [   # date, LMT hh:mm, printed altitude, printed azimuth, label
    ("1863-07-01", "10:30", 64.2, 123, "Jul 1, 10:30 am"),
    ("1863-07-01", "16:00", 37.9, 270, "Jul 1, 4 pm (XI Corps collapse)"),
    ("1863-07-02", "16:00", 37.9, 270, "Jul 2, 4 pm (Sickles, Peach Orchard)"),
    ("1863-07-02", "18:30", 9.8, 292, "Jul 2, 6:30 pm (Wheatfield, Cemetery Ridge)"),
    ("1863-07-02", "19:00", 4.5, 296, "Jul 2, 7 pm (Culp's Hill / East Cemetery Hill)"),
    ("1863-07-03", "05:00", 3.2, 62, "Jul 3, 5 am (Culp's Hill dawn)"),
    ("1863-07-03", "13:00", 69.4, 219, "Jul 3, 1 pm (cannonade start)"),
    ("1863-07-03", "15:00", 49.3, 259, "Jul 3, 3 pm (the Charge)"),
    ("1863-07-03", "16:00", 37.9, 270, "Jul 3, 4 pm"),
    ("1863-07-03", "19:00", 4.5, 296, "Jul 3, 7 pm"),
]

MOONRISE = [("1863-07-01", "19:53"), ("1863-07-02", "20:38"), ("1863-07-03", "21:16"), ("1863-07-04", "21:50")]
MOONSET = [("1863-07-01", "04:59"), ("1863-07-02", "06:14"), ("1863-07-03", "07:29"), ("1863-07-04", "08:42"), ("1863-07-05", "09:53")]

# night start date -> list of (hh clock-hours since the start date's midnight, printed alt, printed az); 26/28 = 02:00/04:00 next day
MOON_ALTAZ = {
    "1863-07-01": [(21, 10, 125), (22, 18.5, 136), (24, 30, 164), (26, 30, 196), (28, 19, 224)],
    "1863-07-02": [(21, 3, 112), (22, 13, 122), (24, 29, 147), (26, 36, 180), (28, 30, 213)],
    "1863-07-03": [(22, 7, 110), (24, 27, 132), (26, 39, 163), (28, 39, 200)],
    "1863-07-04": [(22, 1, 97), (24, 23, 117), (26, 40, 145), (28, 46, 185)],
}
# printed illumination ranges per night (start %, end %) and the printed moonrise/moonset used to evaluate them
MOON_ILLUM = {"1863-07-01": (99, 93), "1863-07-02": (95, 86), "1863-07-03": (88, 77), "1863-07-04": (80, 68)}


def lmt_minutes_abs(date_iso, minute):
    """Absolute minute count since 1863-06-26 00:00 LMT for table-free interpolation of events."""
    d = dt.date.fromisoformat(date_iso)
    return (d - dt.date(1863, 6, 26)).days * 1440 + minute


def classify_value(printed, computed, nd):
    res = 10.0 ** (-nd)
    diff = computed - printed
    if floor_half(computed / res) * res == floor_half(printed / res) * res or abs(diff) <= 0.5 * res + 1e-9:
        return "MATCH", diff
    if abs(diff) <= res + 1e-9:
        return "MARGINAL", diff
    return "FINDING", diff


def classify_time(printed_min, computed_min):
    diff = computed_min - printed_min
    if floor_half(computed_min) == printed_min:
        return "MATCH", diff
    if math.floor(computed_min) == printed_min:
        return "MATCH(trunc)", diff
    if abs(diff) <= 1.0 + 1e-9:
        return "MARGINAL", diff
    return "FINDING", diff


def fmt_t(m):
    s = int(round(m * 60))
    return "%02d:%02d:%02d" % (s // 3600 % 24, s // 60 % 60, s % 60)


def pdf_figure_checks():
    rows = []   # dict(kind, label, printed, computed, diff, unit, status, approx)

    def add(kind, label, printed, computed, diff, unit, status, approx=False, note=""):
        rows.append(dict(kind=kind, label=label, printed=printed, computed=computed, diff=diff, unit=unit, status=status, approx=approx, note=note))

    # --- sun table
    for date, vals in SUN_TABLE.items():
        ev = events_of(date)
        for key, pv in zip(SUN_TABLE_KEYS, vals):
            if key == "sun_transit":
                tt, palt, paz = pv
                c = ev["sun_transit"][0]
                st, df = classify_time(hhmm(tt), c)
                add("sun time", "%s solar noon" % date, tt, fmt_t(c), "%+.2f" % df, "min", st)
                ca = ev["sun_transit_alt"][0]
                st, df = classify_value(palt, ca, 1)
                add("sun alt", "%s solar noon altitude" % date, palt, "%.2f" % ca, "%+.2f" % df, "deg", st)
                add("sun az", "%s solar noon azimuth" % date, paz, "180.0 (by definition of transit)", "0", "deg", "MATCH")
            else:
                c = ev[key][0]
                st, df = classify_time(hhmm(pv), c)
                add("sun time", "%s %s" % (date, key), pv, fmt_t(c), "%+.2f" % df, "min", st)
    # --- sun altitude/azimuth moments
    for date, hm, palt, paz, label in SUN_MOMENTS:
        r = row_at("%sT%s" % (date, hm))
        st, df = classify_value(palt, r["sun_alt_deg"], 1)
        add("sun alt", label, palt, "%.2f" % r["sun_alt_deg"], "%+.2f" % df, "deg", st)
        st, df = classify_value(paz, r["sun_az_deg"], 0)
        add("sun az", label, paz, "%.2f" % r["sun_az_deg"], "%+.2f" % df, "deg", st)
    # shadow ratio at the Charge
    r = row_at("1863-07-03T15:00")
    ratio = 1.0 / math.tan(math.radians(r["sun_alt_deg"]))
    st, df = classify_value(0.86, ratio, 2)
    add("shadow", "Jul 3 3 pm shadow length / object height", 0.86, "%.3f" % ratio, "%+.3f" % df, "ratio", st)
    sh_az = (r["sun_az_deg"] + 180.0) % 360.0
    st, df = classify_value(79, sh_az, 0)
    add("shadow", "Jul 3 3 pm shadow azimuth ('about 79')", 79, "%.1f" % sh_az, "%+.1f" % df, "deg", st, approx=True)
    # --- moon rise / set
    for date, pv in MOONRISE:
        c = events_of(date)["moonrise"][0]
        st, df = classify_time(hhmm(pv), c)
        add("moon time", "moonrise %s" % date, pv, fmt_t(c), "%+.2f" % df, "min", st)
    for date, pv in MOONSET:
        c = events_of(date)["moonset"][0]
        st, df = classify_time(hhmm(pv), c)
        add("moon time", "moonset %s (morning)" % date, pv, fmt_t(c), "%+.2f" % df, "min", st)
    c = events_of("1863-06-30")["moonrise"][0]
    st, df = classify_time(19 * 60 + 10, c)
    add("moon time", "moonrise 1863-06-30 ('about 19:10', 'not computed')", "19:10", fmt_t(c), "%+.2f" % df, "min", st, approx=True,
        note="the PDF itself says this figure is approximate and was not computed; computed value is ~9 min earlier (the LMT/EST offset is 8.9 min)")
    # --- moon alt/az at times
    for night, lst in MOON_ALTAZ.items():
        nd = dt.date.fromisoformat(night)
        for hh, palt, paz in lst:
            day = nd + dt.timedelta(days=hh // 24)
            r = row_at("%sT%02d:00" % (day.isoformat(), hh % 24))
            nd_alt = 1 if (palt != int(palt)) else 0
            st, df = classify_value(palt, r["moon_alt_deg"], nd_alt)
            lab = "night %s %02d:00" % (night, hh % 24) + (" (next day)" if hh >= 24 else "")
            add("moon alt", lab, palt, "%.2f" % r["moon_alt_deg"], "%+.2f" % df, "deg", st)
            st, df = classify_value(paz, r["moon_az_deg"], 0)
            add("moon az", lab, paz, "%.2f" % r["moon_az_deg"], "%+.2f" % df, "deg", st)
    # --- illumination (printed as 'start% to end%' for the night; evaluated at moonrise and at the next moonset)
    table = load_table()
    seg = table["segments"][0]
    il = np.array(seg["columns"]["moon_illum_pct"])
    d0 = dt.date.fromisoformat(seg["first_lmt_date"])

    def ill_at(date_iso, minute):
        return float(il[(dt.date.fromisoformat(date_iso) - d0).days * 1440 + int(round(minute))])
    for night, (p0, p1) in MOON_ILLUM.items():
        nd = dt.date.fromisoformat(night)
        rise = events_of(night)["moonrise"][0]
        nxt = (nd + dt.timedelta(days=1)).isoformat()
        setm = events_of(nxt)["moonset"][0]
        c0 = ill_at(night, rise)
        c1 = ill_at(nxt, setm)
        st, df = classify_value(p0, c0, 0)
        add("moon illum", "night %s start (at moonrise)" % night, "%d%%" % p0, "%.1f%%" % c0, "%+.1f" % df, "pct-pt", st, approx=True,
            note="PDF: illumination 'approximate, from geocentric elongation'")
        st, df = classify_value(p1, c1, 0)
        add("moon illum", "night %s end (at next moonset)" % night, "%d%%" % p1, "%.1f%%" % c1, "%+.1f" % df, "pct-pt", st, approx=True,
            note="PDF: illumination 'approximate, from geocentric elongation'")
    c = float(il.max())
    add("moon illum", "Jun 30 to Jul 1 maximum ('about 99 to 100%')", "99-100%", "%.2f%% (max in table)" % c, "n/a", "pct", "MATCH", approx=True)
    # --- full moon time
    ph = E.lunar_phases()
    full = [p for p in ph if p["phase"] == "Full Moon" and p["reference_ut_minute"].startswith("1863-07-01")][0]
    add("phase", "full moon 1863-07-01 UT, method A", "06:46", full["A_ut"][11:], "%+.2f" % full["A_minus_ref_min"], "min",
        "MATCH" if abs(full["A_minus_ref_min"]) <= 0.5 else ("MARGINAL" if abs(full["A_minus_ref_min"]) <= 1 else "FINDING"))
    add("phase", "full moon 1863-07-01 UT, method B", "06:46", full["B_ut"][11:], "%+.2f" % full["B_minus_ref_min"], "min",
        "MATCH" if abs(full["B_minus_ref_min"]) <= 0.5 else ("MARGINAL" if abs(full["B_minus_ref_min"]) <= 1 else "FINDING"))
    lm = full["A_lmt"]
    add("phase", "full moon in LMT (PDF '01:37 LMT')", "01:37", lm[11:], "%+.2f" % ((hhmm(lm[11:16]) + int(lm[17:19]) / 60.0) - hhmm("01:37")),
        "min", "MATCH" if lm[11:16] == "01:37" else "MARGINAL")
    jun1 = [p for p in ph if p["reference_ut_minute"].startswith("1863-06-01")][0]
    add("phase", "previous full moon 1863-06-01 23:29 UT (PDF)", "23:29", jun1["A_ut"][11:], "%+.2f" % jun1["A_minus_ref_min"], "min",
        "MATCH" if abs(jun1["A_minus_ref_min"]) <= 0.5 else ("MARGINAL" if abs(jun1["A_minus_ref_min"]) <= 1 else "FINDING"))
    # --- statements in the text
    ev = events_of("1863-07-02")
    add("moon time", "Jul 2: 'moon not up until about 20:40' (moonrise 20:38 printed elsewhere)", "~20:40", fmt_t(ev["moonrise"][0]),
        "%+.2f" % (ev["moonrise"][0] - hhmm("20:40")), "min", "MATCH" if abs(ev["moonrise"][0] - hhmm("20:40")) <= 3 else "FINDING", approx=True)
    # --- source figures quoted by the PDF (time basis unstated by the sources) and the T2-052 timeline note
    e1, e2, e4 = events_of("1863-07-01"), events_of("1863-07-02"), events_of("1863-07-04")
    for lab, pv, c in (("Strategypage Jul 1 sunrise 0435", "04:35", e1["sunrise"][0]), ("Strategypage Jul 1 sunset 1933", "19:33", e1["sunset"][0]),
                       ("Strategypage Jul 4 sunrise 0437", "04:37", e4["sunrise"][0]), ("Strategypage Jul 4 sunset 1932", "19:32", e4["sunset"][0]),
                       ("Freeman Jul 2 sunrise 04:32 (timeline T2-052)", "04:32", e2["sunrise"][0])):
        d = c - hhmm(pv)
        add("source fig", lab, pv, fmt_t(c), "%+.2f" % d, "min", "INFO", approx=True,
            note="figure from a historical/secondary source, time basis not stated; difference to computed LMT is for information")
    d = e2["sunrise"][0] - hhmm("04:29")
    add("timeline", "T2-052 'USNO 04:44 EST (about 04:29 local)' sunrise Jul 2", "04:29", fmt_t(e2["sunrise"][0]), "%+.2f" % d, "min",
        "FINDING", note="04:44 EST is consistent with computed 04:35 LMT (04:44:11 EST) but '04:29 local' is not; the row itself says its arithmetic line is inconsistent")
    # --- modern clock arithmetic
    est_min = 60.0 * (-E.LMT_OFFSET_H - 5.0)
    add("clock", "EST = LMT + about 9 minutes", "9", "%.2f" % est_min, "%+.2f" % (est_min - 9), "min", "MATCH" if abs(est_min - 9) <= 0.5 else "FINDING", approx=True)
    add("clock", "'04:36 LMT equals 05:45 on a modern EDT clock'", "05:45", "%02d:%02d" % divmod(hhmm("04:36") + 69, 60), "0", "clock", "MATCH")
    return rows


# ----------------------------------------------------------------------------- Q11
def gate_q11(recompute=True):
    out = {"gate": "Q11", "text": "Ephemeris check: sun and moon values equal an independent ephemeris at the site and times."}
    if recompute:
        segs = E.run(ENV, verbose=False)
        pooled = E.combined_stats(segs)
        evA, evB = {}, {}
        for s in segs:
            evA.update(s["evA"])
            evB.update(s["evB"])
        evc, unmatched = E.compare_events(evA, evB)
        # stored table = method A?
        diff_store = 0.0
        t = load_table()
        for seg, s in zip(t["segments"], segs):
            sl = slice(s["pad_min"], s["pad_min"] + s["n_table"])
            c = seg["columns"]
            diff_store = max(diff_store, float(np.max(np.abs(np.array(c["sun_alt_deg"]) - s["A"]["sun_alt"][sl]))),
                             float(np.max(np.abs(np.array(c["moon_alt_deg"]) - s["A"]["moon_alt"][sl]))))
        src = "recomputed live (A astropy, B own Meeus)"
    else:
        a = json.load(open(os.path.join(ENV, "ephemeris_agreement.json"), encoding="utf-8"))
        pooled, evc, unmatched, diff_store = a["per_minute_A_minus_B"], a["events_A_minus_B_minutes"], a["events_unmatched"], None
        src = "saved ephemeris_agreement.json (not recomputed)"
    checks = []

    def chk(name, value, tol, unit):
        checks.append(dict(check=name, measured=value, tolerance=tol, unit=unit, ok=bool(value <= tol)))
    chk("sun altitude, max |A-B| over all table minutes", pooled["sun_alt_deg"]["max_abs"], TOL_SUN_DEG, "deg")
    chk("sun azimuth, max |A-B| over all table minutes", pooled["sun_az_deg"]["max_abs"], TOL_SUN_DEG, "deg")
    chk("moon altitude, max |A-B|", pooled["moon_alt_deg"]["max_abs"], TOL_MOON_DEG, "deg")
    chk("moon azimuth, max |A-B|", pooled["moon_az_deg"]["max_abs"], TOL_MOON_DEG, "deg")
    for nm in ("sunrise", "sunset", "moonrise", "moonset"):
        chk("%s, max |A-B| over all days" % nm, evc[nm]["max_abs_min"], TOL_RISESET_MIN, "min")
    chk("all events (twilights, transits, rise/set), max |A-B|", evc["ALL"]["max_abs_min"], TOL_RISESET_MIN, "min")
    checks.append(dict(check="events found by only one method", measured=len(unmatched), tolerance=0, unit="count", ok=len(unmatched) == 0))
    if diff_store is not None:
        chk("stored ephemeris_1863.json equals fresh method A (alt)", diff_store, 0.0006, "deg")
    ph = E.lunar_phases()
    full = [p for p in ph if p["phase"] == "Full Moon" and p["reference_ut_minute"].startswith("1863-07-01")][0]
    for nm in ("A", "B"):
        v = abs(full[nm + "_minus_ref_min"])
        checks.append(dict(check="full moon 1863-07-01 06:46 UT (Moonblink via PDF), method %s computed %s" % (nm, full[nm + "_ut"][11:]),
                           measured=v, tolerance=1.0, unit="min", ok=v <= 1.0))
    out["source"] = src
    out["checks"] = checks
    out["pooled_A_minus_B"] = pooled
    out["events_A_minus_B_min"] = evc
    out["lunar_phases"] = ph
    out["computation_passes"] = all(c["ok"] for c in checks)
    out["independence_caveats"] = [
        "Both methods use the same DeltaT polynomial (about 7.2 s); effect of +-3 s is <= 0.002 deg (see ephemeris_agreement.json deltaT_sensitivity).",
        "The Moon series of ERFA moon98 (method A) and Meeus ch.47 (method B) both descend from Chapront's ELP-2000/82, so their agreement "
        "tests the implementation, not the lunar theory. Independent anchors: NASA/Espenak phase minutes (via the repo file), astronomy-engine "
        "values stored in data-src/environment (2 s on events), and the Sun, whose VSOP-type (A) and Meeus low-accuracy (B) models are unrelated.",
        "Altitudes are geometric (no refraction) and use the astronomical horizon; the local horizon is not modelled.",
    ]
    return out


# ----------------------------------------------------------------------------- Q22
def parse_pdf_table1():
    lines = open(PDF_TXT, encoding="utf-8", errors="replace").read().split("\n")
    i0 = next(i for i, l in enumerate(lines) if l.startswith("Table 1. Temperature and sky"))
    i1 = next(i for i, l in enumerate(lines) if l.startswith("Table 2. Weather elements by day"))
    res = {}
    mon = {"Jun": 6, "Jul": 7}
    i = i0
    while i < i1:
        m = re.match(r"^(Jun|Jul) (\d+)$", lines[i].strip())
        if m:
            date = "1863-%02d-%02d" % (mon[m.group(1)], int(m.group(2)))
            vals = []
            for j in range(1, 4):
                mm = re.match(r"^(\d+) F$", lines[i + j].strip())
                vals.append(int(mm.group(1)) if mm else lines[i + j].strip())
            res[date] = vals
        i += 1
    return res, "\n".join(lines[i0:i1 + 1])


def gate_q22():
    out = {"gate": "Q22", "text": "Weather state check: scene weather matches the weather timeline at every time. "
                                  "(No scene exists yet; this checks the timeline itself.)"}
    wt = json.load(open(os.path.join(ENV, "weather_timeline.json"), encoding="utf-8"))
    pdf_t1, t1text = parse_pdf_table1()
    pdf_all = open(PDF_TXT, encoding="utf-8", errors="replace").read()
    checks = []

    def ck(name, ok, detail=""):
        checks.append(dict(check=name, ok=bool(ok), detail=detail))
    # 1. every day has three readings equal to the PDF's own table text
    expected_days = ["1863-06-%02d" % d for d in range(26, 31)] + ["1863-07-%02d" % d for d in range(1, 5)]
    by = {r["date"]: r for r in wt["jacobs_readings"]}
    ck("every day Jun 26 - Jul 4 present with 07:00/14:00/21:00 readings",
       all(d in by and set(by[d]["readings_F"]) == {"07:00", "14:00", "21:00"} and all(isinstance(v, int) for v in by[d]["readings_F"].values())
           for d in expected_days))
    mism = []
    for d in expected_days:
        got = [by[d]["readings_F"][k] for k in ("07:00", "14:00", "21:00")]
        if got != pdf_t1.get(d):
            mism.append((d, got, pdf_t1.get(d)))
    ck("27 readings equal the numbers parsed from the PDF text (Table 1)", not mism, str(mism))
    ck("Jul 5 recorded as n/a (no readings invented)", by.get("1863-07-05", {}).get("readings_F") is None and pdf_t1.get("1863-07-05") == ["n/a", "n/a", "n/a"])
    # 2. ranges
    allv = [v for d in expected_days for v in by[d]["readings_F"].values()]
    ck("no reading outside the printed range (min 60 F; max 87 F, 'highest of the battle and of July')", min(allv) >= 60 and max(allv) <= 87,
       "min %d max %d" % (min(allv), max(allv)))
    ck("87 F occurs only at 14:00 on Jul 3", [(d, k) for d in expected_days for k, v in by[d]["readings_F"].items() if v == 87] == [("1863-07-03", "14:00")])
    ck("Jul 4 readings <= 76 F ('never recorded above 76 F on Jul 4 to 8')", max(by["1863-07-04"]["readings_F"].values()) <= 76)
    ck("PDF text contains the 87 F / 2 pm / Jul 3 statement", "The 87 F on Jul 3 at 2 pm" in pdf_all)
    # 3. conflicts carried as ranges, no default chosen
    forbidden = re.compile(r"\"(chosen|default|selected|preferred)\"\s*:", re.I)
    ck("no 'chosen/default/selected' field anywhere in weather_timeline.json", not forbidden.search(json.dumps(wt)))
    conf = {c["id"]: c for c in wt["conflicts_carried_as_ranges"]}
    ck("wind conflict lists both 12 mph and 2 mph", {x.get("value_mph") for x in conf["CF-WIND-SPEED"]["candidates"]} == {12, 2})
    ck("Jul 4 rain conflict lists two schedules and the shared 1.39 in", len(conf["CF-JUL4-RAIN-TIMING"]["candidates"]) == 2
       and "1.39" in json.dumps(conf["CF-JUL4-RAIN-TIMING"]))
    ck("Jul 2 sky conflict lists two states", len(conf["CF-JUL2-SKY"]["candidates"]) == 2)
    ck("Jul 3 87 F vs 'below average' lists two statements", len(conf["CF-JUL3-87F"]["candidates"]) == 2)
    ck("Jul 2 2 pm 3/10 carried as ambiguous (both 0.3 and 0.7 covered listed)",
       [c for c in wt["cloud_readings"] if c["lmt"] == "1863-07-02T14:00"][0]["fraction_covered"] == [0.3, 0.7])
    for needle in ("12 mph", "2 mph", "2:15 to 4 pm", "1.39 in", "3/10", "below average"):
        ck("PDF conflict text contains '%s'" % needle, needle in pdf_all)
    # 4. cloud fractions and wetness within [0, 1]
    fr = []
    for c in wt["cloud_readings"]:
        v = c["fraction_covered"]
        fr += v if isinstance(v, list) else ([v] if v is not None else [])
    ck("cloud fractions within [0,1]", all(0 <= v <= 1 for v in fr))
    wet = [s["wetness_pdf"] for s in wt["wetness_schedule"]["segments"]]
    norm = re.sub(r"\s+", " ", pdf_all)
    ck("wetness schedule is 0 -> about 0.3 -> 1.0 as in B.10.6 (and the PDF text says so)", wet == [0.0, "about 0.3", 1.0] and
       "0 on Jul 1 to the afternoon of Jul 3, about 0.3 after the 6 pm storm of Jul 3, 1.0 on Jul 4" in norm)
    # 5. moonlight table: four nights, rise times agree with the computed ephemeris
    nights = [m["night"] for m in wt["moonlight_by_night"]]
    ck("moonlight table has the four PDF nights", nights == ["Jul 1 to 2", "Jul 2 to 3", "Jul 3 to 4", "Jul 4 to 5"])
    for m, (d, pv) in zip(wt["moonlight_by_night"], MOONRISE):
        mm = re.search(r"Rise (\d\d:\d\d)", m["moon_available"])
        c = events_of(d)["moonrise"][0]
        ck("moonlight row %s rise %s equals computed %s within 1 min" % (m["night"], mm.group(1), fmt_t(c)), abs(c - hhmm(mm.group(1))) <= 1.0)
    # 6. tiers and PENDING OWNER
    allowed = ("documented", "inferred", "plausible-procedural", "open gap")
    tiers = [r["tier"] for r in wt["jacobs_readings"]] + [c["tier"] for c in wt["conflicts_carried_as_ranges"]]
    ck("every normalised tier is one of documented/inferred/plausible-procedural/open gap", all(t in allowed for t in tiers), str(sorted(set(tiers))))
    ck("every tier_as_printed is present (the PDF's own wording kept)", all(r.get("tier_as_printed") for r in wt["jacobs_readings"] + wt["conflicts_carried_as_ranges"]))
    ck("every Jacobs row carries the weak-source flag", all(r["weak_source_flag"] for r in wt["jacobs_readings"]))
    ck("pdf_recommended_render is marked PENDING OWNER", "PENDING OWNER" in wt["pdf_recommended_render"]["status"])
    # 7. data-src comparison
    ck("27 temperatures equal data-src/environment/weather_by_day.json", all(c["status"] == "all three temperatures equal"
                                                                      for c in wt["temperature_comparison_with_data_src"]))
    out["checks"] = checks
    out["computation_passes"] = all(c["ok"] for c in checks)
    out["pdf_vs_data_src_differences"] = [d["id"] + ": " + d["item"] for d in wt["pdf_vs_data_src"] if d["id"] in ("D1", "D2", "D3", "D4", "D6", "D8")]
    return out


# ----------------------------------------------------------------------------- weather lookup (what Q22 compares a scene against)
def weather_at(time_iso):
    """Return the timeline segment governing an LMT instant, the nearest cloud readings, and the conflicts that apply.
    Nothing is interpolated or defaulted: hourly interpolation is 'inferred' in the PDF and left to the owner."""
    wt = json.load(open(os.path.join(ENV, "weather_timeline.json"), encoding="utf-8"))
    date, m = parse_lmt(time_iso)
    t = "%sT%02d:%02d" % (date.isoformat(), int(m // 60), int(m % 60))
    seg = [s for s in wt["segments"] if s["from_lmt"] <= t < s["to_lmt"]]
    prev = [c for c in wt["cloud_readings"] if c["lmt"] <= t]
    nxt = [c for c in wt["cloud_readings"] if c["lmt"] > t]
    return dict(lmt=t, segment=seg[0] if seg else None, previous_cloud_reading=prev[-1] if prev else None,
                next_cloud_reading=nxt[0] if nxt else None,
                note="between readings the state is NOT interpolated here; PDF: hourly interpolation inferred")


# ----------------------------------------------------------------------------- Q10 support
MOONLIGHT_NIGHT_CLOUD = {   # night starting on (LMT date) -> (PDF cloud wording, attenuation applies?)
    "1863-07-01": ("overcast at 9 pm; Strategypage: cloudy, moon largely hidden", True),
    "1863-07-02": ("cirrus at 9 pm; Strategypage: moon fairly bright", False),
    "1863-07-03": ("7/10 cumulus at 9 pm; thunderstorm about 6 pm", True),
    "1863-07-04": ("very wet, heavily clouded; little moonlight during the retreat", True),
}


def night_luminance_floor(time_iso, cloud_fraction=None):
    """Document the readability-floor concept (PDF B.10.5, acceptance criterion 3, steps 9-12 and 15) as PARAMETERS for an instant.
    time_iso is local mean time.  Nothing is rendered and no value is selected where the PDF gives a range.

    Returns the ephemeris state (computed), a physical moonlight illuminance RANGE (inferred, see 'scaling'), the PDF's cloud attenuation
    range where the PDF says the night was cloudy, and the artistic readability parameters (ranges, inferred design, PENDING OWNER).
    The PDF gives no numeric luminance or contrast threshold for gate Q10: `q10_assertion_thresholds` is therefore an open item."""
    r = row_at(time_iso)
    date, m = parse_lmt(time_iso)
    night_start = date if m >= 12 * 60 else date - dt.timedelta(days=1)
    night_key = night_start.isoformat()
    cloud_txt, atten = MOONLIGHT_NIGHT_CLOUD.get(night_key, ("not specified by the PDF for this night", None))
    if cloud_fraction is not None:
        atten = cloud_fraction >= 0.7
        cloud_txt = "caller-supplied cloud fraction %.2f" % cloud_fraction
    alt = r["moon_alt_deg"]
    k = r["moon_illum_pct"] / 100.0
    if r["moon_up"] and alt > 0:
        zen = 0.26   # lux, full moon at zenith, Epic documentation (PDF B.10.5 step 4)
        s = math.sin(math.radians(alt))
        lux_hi = zen * s * k           # linear in illuminated fraction
        lux_lo = zen * s * k * k       # steeper phase dependence
    else:
        lux_lo = lux_hi = 0.0
    div = (3, 10) if atten else (1, 1)
    sun_band = r["sun_band"]
    return dict(
        lmt=time_iso,
        ephemeris=dict(sun_alt_deg=round(r["sun_alt_deg"], 3), sun_az_deg=round(r["sun_az_deg"], 3), sun_band=sun_band,
                       moon_alt_deg=round(alt, 3), moon_az_deg=round(r["moon_az_deg"], 3), moon_up=r["moon_up"],
                       moon_illum_pct=round(r["moon_illum_pct"], 2), horizon="astronomical, local terrain not modelled", tier="computed"),
        night_of=night_key, cloud_wording_from_pdf=cloud_txt,
        physical_moonlight_ground_lux=dict(
            range=[round(lux_lo / div[1], 5), round(lux_hi / div[0], 5)],
            zenith_full_moon_lux=0.26, cloud_divisor_range=list(div),
            scaling="0.26 lux x sin(altitude) x [k^2 .. k], k = illuminated fraction. The PDF states only the anchor 'about 0.1 to 0.2 lux at "
                    "30 to 40 deg altitude and 90 to 99% illumination (inferred; includes phase and altitude scaling)' and 'a factor of 3 to 10 "
                    "less under 7/10 cumulus or overcast'. The k^2..k form is this tool's own bracket, not a PDF formula.",
            tier="inferred"),
        twilight_sky_light="no lux values in the PDF; only the bands sun_band (-0.833/-6/-12/-18 deg). Sky darkens per band (B.10.5 criterion 2).",
        readability_floor=dict(
            requirement="At every instant a viewer can identify units, activity and terrain features in the free camera at gameplay distance "
                        "(B.10.5 criterion 3); an artistic exposure choice applied on top of a physical light setup, stated openly in the product.",
            parameters_pdf_starting_values=dict(
                auto_exposure_min_ev100=[-4, -2], eye_adaptation_speed_up_stops_per_s=[1, 2],
                night_exposure_compensation_ev=[1, 2], moon_intensity_boost_x=[5, 20], moon_tint="cool blue, slight desaturation, low contrast",
                fill_light="dim shadowless directional fill or raised Sky Light", campfire_K=[2000, 2500], campfire_light_radius_m=[5, 15]),
            combined_boost_factor_range_derived=[5 * 2 ** 1, 20 * 2 ** 2],
            combined_boost_note="derived here: moon boost 5-20x times +1..+2 EV compensation (2x..4x); not a PDF figure",
            physical_check="0.26 lux full moon is about EV100 -3 (PDF estimate); without compensation shadows would show almost nothing.",
            tier="inferred design - starting values to tune, not Epic figures; defaults PENDING OWNER",
            physically_dim_toggle="PDF: a 'physically dim' toggle may be provided; the default is the readable setting"),
        q10_assertion_thresholds="OPEN: the PDF gives no numeric minimum luminance or contrast for gate Q10; to be set by the owner, not guessed",
        evidence_tier_display="unit markers and tier tags must stay legible at night (B.10.5 criterion 6)")


# ----------------------------------------------------------------------------- reporting
def print_figure_table(rows):
    w = (11, 52, 13, 22, 10, 7, 12)
    hdr = ("kind", "figure", "PDF", "computed", "diff", "unit", "status")
    print("".join(h.ljust(x) for h, x in zip(hdr, w)))
    print("-" * sum(w))
    for r in rows:
        print("".join(str(v)[:x - 1].ljust(x) for v, x in zip((r["kind"], r["label"], r["printed"], r["computed"], r["diff"], r["unit"],
                                                              r["status"] + ("*" if r["approx"] else "")), w)))
    print("(* = the PDF itself calls the figure approximate)")


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    recompute = "--no-recompute" not in sys.argv
    print("=== Q11 ephemeris ===")
    q11 = gate_q11(recompute)
    print("source:", q11["source"])
    for c in q11["checks"]:
        print("  [%s] %-95s measured %.6g %s (tolerance %.4g)" % ("ok" if c["ok"] else "FAIL", c["check"][:95], c["measured"], c["unit"], c["tolerance"]))
    print("Q11 computation:", "PASS" if q11["computation_passes"] else "FAIL")
    print()
    print("=== PDF printed sun/moon figures vs computation (method A table) ===")
    rows = pdf_figure_checks()
    print_figure_table(rows)
    counts = {}
    for r in rows:
        counts[r["status"]] = counts.get(r["status"], 0) + 1
    print("status counts:", counts)
    findings = [r for r in rows if r["status"] == "FINDING"]
    print("FINDINGS about the PDF (differences beyond the printed precision):", len(findings))
    for r in findings:
        print("  -", r["label"], "| PDF", r["printed"], "| computed", r["computed"], "| diff", r["diff"], r["unit"], r["note"])
    print()
    print("=== Q22 weather timeline ===")
    q22 = gate_q22()
    for c in q22["checks"]:
        print("  [%s] %s %s" % ("ok" if c["ok"] else "FAIL", c["check"], ("-- " + c["detail"]) if (c["detail"] and not c["ok"]) else ""))
    print("Q22 timeline consistency:", "PASS" if q22["computation_passes"] else "FAIL")
    print("PDF-vs-data-src differences recorded:", *q22["pdf_vs_data_src_differences"], sep="\n  ")
    print()
    print("=== Q10 support: night_luminance_floor ===")
    for tm in ("1863-07-02T22:00", "1863-07-03T02:00", "1863-07-04T02:00"):
        f = night_luminance_floor(tm)
        print(tm, "moon alt %.1f illum %.1f%% band %s | physical lux range %s | cloud: %s" % (
            f["ephemeris"]["moon_alt_deg"], f["ephemeris"]["moon_illum_pct"], f["ephemeris"]["sun_band"],
            f["physical_moonlight_ground_lux"]["range"], f["cloud_wording_from_pdf"]))
    res = dict(q11=q11, pdf_figure_table=rows, pdf_figure_status_counts=counts, pdf_findings=findings, q22=q22,
               note="Computation/consistency results only. No gate's `passes` is set by this script.")
    with open(os.path.join(ENV, "check_environment_results.json"), "w", encoding="utf-8") as fh:
        json.dump(res, fh, indent=1, ensure_ascii=False, default=str)
    print("\nwrote docs/battle-theatre/environment/check_environment_results.json")
    return 0 if (q11["computation_passes"] and q22["computation_passes"]) else 1


if __name__ == "__main__":
    sys.exit(main())

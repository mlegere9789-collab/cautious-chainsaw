#!/usr/bin/env python
"""Build docs/battle-theatre/environment/weather_timeline.json from the PDF's B.10 tables (transcribed below) and
compare it with data-src/environment/weather_by_day.json (compare only, never overwrite).

Every value in PDF_* below is transcribed from tmp/pdf/plan-clean.txt, B.10.1 (pp.110-111), B.10.2 (pp.111-112),
B.10.5 (p.114) and B.10.6 (p.115).  Tiers are the PDF's own words (`tier_as_printed`) plus a normalised `tier`.
Nothing is defaulted: where the PDF carries a conflict, every value is listed and none is marked chosen.

Run:  PYTHONIOENCODING=utf-8 python tools/bt/build_weather_timeline.py
"""
import json
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "docs", "battle-theatre", "environment", "weather_timeline.json")

DOC = "tmp/pdf/plan-clean.txt"

# --- B.10.1 Table 1 (PDF p.110): date, 7 am, 2 pm, 9 pm (deg F), sky/wind/rain as printed, tier as printed, sources as printed
PDF_TABLE1 = [
    ("1863-06-26", 60, 63, 62, "Intermittent rain from 8 am Jun 25 to 7 am Jun 27", "documented (secondary)", ["Strategypage"]),
    ("1863-06-27", 61, 63, 67, "Rain ended 7 am", "documented (secondary)", ["Strategypage"]),
    ("1863-06-28", 63, 67, 68, "No rain listed", "documented (secondary)", ["Strategypage"]),
    ("1863-06-29", 66, 72, 69, "No rain listed", "documented (secondary)", ["Strategypage"]),
    ("1863-06-30", 68, 79, 71, "No rain listed", "documented (secondary)", ["Strategypage"]),
    ("1863-07-01", 72, 76, 74, "'Very cloudy'; overcast all day; gentle warm southern breeze; 9 pm sky overcast",
     "documented (secondary)", ["Strategypage", "Emerging Civil War", "TeachersFirst"]),
    ("1863-07-02", 74, 81, 76, "Overcast at 8 am; Strategypage adds foggy dawn, 'humid', and afternoon drizzle ('mizzling'); at 2 pm cloud "
     "cover is 3/10 in one reading of TeachersFirst (the fetch summary is ambiguous); cirrus at 9 pm",
     "documented (secondary), same three sources", ["Strategypage", "Emerging Civil War", "TeachersFirst"]),
    ("1863-07-03", 73, 87, 76, "Overcast at 8 am; 4/10 covered at 2 pm; 7/10 cumulus at 9 pm; thunderstorm nearby about 6 pm; 'very humid'; "
     "very gentle S to SSW wind", "documented (secondary), same three sources", ["Strategypage", "Emerging Civil War", "TeachersFirst"]),
    ("1863-07-04", 69, 72, 70, "Showers 6 am to noon, heavier 1 to 2 pm, very heavy from 9 pm (Strategypage). TeachersFirst instead gives "
     "showers at 6 am, 2:15 to 4 pm and 4 am Jul 5. Both agree on a total of 1.39 in.",
     "documented (secondary)", ["Strategypage", "TeachersFirst", "AMS"]),
]
PDF_TABLE1_JUL5 = ("1863-07-05", "n/a", "n/a", "n/a", "Morning rain aided Lee's retreat", ["Strategypage"])

# --- B.10.1 Table 2 (PDF pp.110-111), paraphrased cell by cell
PDF_TABLE2 = {
    "clouds": {
        "tier_as_printed": "documented (Jacobs, secondary) for the readings; hourly interpolation inferred",
        "1863-07-01": "Overcast all day ('very cloudy')",
        "1863-07-02": "Overcast morning; cleared in the afternoon per Boston Globe and Emerging Civil War; cirrus by 9 pm",
        "1863-07-03": "Overcast 8 am; 4/10 at 2 pm; 7/10 cumulus at 9 pm; sky not fully overcast during the Charge, so troops were exposed to sun",
        "1863-07-04": "Overcast, showery",
    },
    "fog": {
        "tier_as_printed": "Jul 2 dawn fog documented (one secondary source); valley placement inferred",
        "1863-07-01": "None reported",
        "1863-07-02": "Foggy dawn (Strategypage). Low-ground ground fog in the Plum Run, Rock Creek and Marsh Creek valleys at dawn is plausible",
        "1863-07-03": "None reported; night of Jul 3 low cloud and wet air",
        "1863-07-04": "Fog not reported; air saturated after the storm",
    },
    "drizzle_rain": {
        "tier_as_printed": "documented (secondary)",
        "1863-07-01": "Dry; ground mostly dry",
        "1863-07-02": "Afternoon 'mizzling' per Strategypage versus clearing per Boston Globe; both carried. Rendered as brief light drizzle "
                      "possible at midday, clearing late afternoon",
        "1863-07-03": "Thunderstorm about 6 pm (Jacobs); Jacobs wrote that the thunder 'seemed tame' after the afternoon artillery",
        "1863-07-04": "1.39 in total; Plum Run overran its banks and some wounded in low ground reportedly drowned (AMS); rain made powder "
                      "misfire and mud immobilized artillery per Boston Globe (secondary; its other claims, such as Jul 4 marching distances, "
                      "are unverified)",
    },
    "wind": {
        "tier_as_printed": "direction documented; speed see conflicts",
        "1863-07-01": "Gentle warm southern breeze",
        "1863-07-02": "S to SSW, light",
        "1863-07-03": "Very gentle S to SSW; no breeze during the Charge",
        "1863-07-04": "Not recorded in the notes",
    },
    "humidity": {
        "tier_as_printed": "open gap",
        "1863-07-01": "Not measured",
        "1863-07-02": "Not measured; 'humid' (Strategypage)",
        "1863-07-03": "'Very humid'",
        "1863-07-04": "'Very humid'",
    },
    "temperature_feel": {
        "tier_as_printed": "Jul 2 and 3 heat-index figures are estimates by Nese and Harding from Harrisburg observers",
        "1863-07-01": "Mid-70s",
        "1863-07-02": "81 F shade; heat index at least 90 F, possibly about 100 F in sun",
        "1863-07-03": "87 F shade; the authors estimate about 2 degrees warmer at 3 to 4 pm; heat index about 98 to 105 F during the Charge; "
                      "direct sun adds up to 10 to 15 F",
        "1863-07-04": "Cool, 69 to 72 F",
    },
}

# --- conflicts carried as ranges (PDF p.111): every candidate value, no choice
CONFLICTS = [
    dict(id="CF-WIND-SPEED", element="wind speed", days=["1863-07-01", "1863-07-02"],
         candidates=[dict(value_mph=12, source="Emerging Civil War"), dict(value_mph=2, source="TeachersFirst ('about 2 mph')")],
         agreed=["direction S (Jul 3: S to SSW)", "'gentle'"],
         pdf_note="The difference is probably a unit or transcription issue.",
         pdf_handling="Open gap. Render a wind of 2 to 6 mph from S to SSW. The range is inferred.",
         tier_as_printed="open gap (render range inferred)", tier="open gap"),
    dict(id="CF-JUL4-RAIN-TIMING", element="July 4 rain timing", days=["1863-07-04", "1863-07-05"],
         candidates=[dict(source="Strategypage", schedule="showers 6 am to noon; heavier 1 to 2 pm; very heavy from 9 pm"),
                     dict(source="TeachersFirst", schedule="showers at 6 am; 2:15 to 4 pm; and 4 am Jul 5")],
         agreed=["total 1.39 in"],
         pdf_handling="Render a wet showery all day with the heaviest rain from afternoon to night. The timing stays a range.",
         tier_as_printed="documented (secondary); timing a range", tier="documented"),
    dict(id="CF-JUL2-SKY", element="July 2 sky", days=["1863-07-02"],
         candidates=[dict(source="Strategypage", state="foggy dawn and mizzling afternoon"),
                     dict(source="Boston Globe; Emerging Civil War", state="clearing in the afternoon")],
         pdf_handling="Foggy or overcast morning, brief drizzle possible midday, clearing late afternoon with cirrus by evening (Jacobs 9 pm). Inferred.",
         tier_as_printed="inferred", tier="inferred"),
    dict(id="CF-JUL3-87F", element="July 3 '87 F' versus 'below average'", days=["1863-07-03"],
         candidates=[dict(source="AMS", statement="Jul 1 to 3 were slightly below average"),
                     dict(source="Nese/Harding and Jacobs", statement="87 F at 2 pm")],
         pdf_handling="Inferred resolution: Jul 1 (76 F) and Jul 2 (81 F) were below early-July norms, and Jul 3 at 87 F in shade was near the modern "
                      "normal highs (modern normals are not 1863 normals). Heat felt worse because of humidity, wool, sun and exertion. "
                      "Use 87 F shade and a heat index of about 100 F for the Charge.",
         tier_as_printed="inferred", tier="inferred"),
    dict(id="CF-JUL2-CLOUD-2PM", element="July 2 cloud cover at 2 pm", days=["1863-07-02"],
         candidates=[dict(source="TeachersFirst (one reading)", reading="3/10", meaning="ambiguous: clear or covered"),
                     ],
         pdf_handling="Carried as ambiguous.", tier_as_printed="carried as ambiguous", tier="open gap"),
]

# --- moonlight by night (PDF p.112)
MOONLIGHT = [
    dict(night="Jul 1 to 2", moon_available="Rise 19:53; 10 degrees at 21:00; 99% to 93%",
         cloud="Overcast at 9 pm (Jacobs); Strategypage says the night of Jul 1-2 was cloudy and largely hid the moon",
         result_for_engine="Darkest of the nights; moon mostly hidden; soft low-contrast diffuse light",
         tier_as_printed="documented (sky) plus inferred (lux)"),
    dict(night="Jul 2 to 3", moon_available="Rise 20:38; near-dark at the end of the East Cemetery Hill fighting; moonlight from about 21:00",
         cloud="Cirrus at 9 pm; Strategypage says the moon was fairly bright",
         result_for_engine="Brightest clear-sky night of the battle once risen. Union works strengthened overnight",
         tier_as_printed="documented (sky) plus inferred (lux)"),
    dict(night="Jul 3 to 4", moon_available="Rise 21:16 (only 7 degrees at 22:00); 88% to 77%",
         cloud="7/10 cumulus at 9 pm; thunderstorm about 6 pm",
         result_for_engine="Moon shows through gaps after rising; the post-midnight half is among the brightest; ground saturated",
         tier_as_printed="documented (sky) plus inferred"),
    dict(night="Jul 4 to 5", moon_available="Rise 21:50; 80% to 68%",
         cloud="Very wet; heavily clouded; Strategypage says little moonlight during the Jul 5 retreat",
         result_for_engine="(not stated beyond the cloud column)",
         tier_as_printed="documented plus inferred"),
]

# --- wetness schedule (PDF B.10.6, p.115)
WETNESS = [
    dict(from_lmt="1863-07-01T00:00", to_lmt="1863-07-03T18:00", wetness_pdf=0.0, tier="inferred",
         note="PDF: '0 on Jul 1 to the afternoon of Jul 3'. Dry roads sourced to a Boston Globe summary (secondary)."),
    dict(from_lmt="1863-07-03T18:00", to_lmt="1863-07-04T00:00", wetness_pdf="about 0.3", tier="inferred",
         note="PDF: 'about 0.3 after the 6 pm storm of Jul 3'; mud on roads from the evening of Jul 3."),
    dict(from_lmt="1863-07-04T00:00", to_lmt="1863-07-05T00:00", wetness_pdf=1.0, tier="inferred",
         note="PDF: '1.0 on Jul 4'; puddles on Jul 4; Plum Run flooding as a raised water level (Jul 4). Rain documented (B.10.1); parameters inferred."),
]

NIGHT_LIGHT_PARAMS = dict(
    epic_moon_zenith_lux=0.26,
    estimated_ground_lux_30_to_40_deg_and_90_to_99_pct=[0.1, 0.2],
    cloud_attenuation_divisor_under_7_10_cumulus_or_overcast=[3, 10],
    moon_intensity_boost_range=[5, 20],
    auto_exposure_min_ev100_range=[-4, -2],
    night_exposure_compensation_ev_range=[1, 2],
    physical_moon_ev100_estimate=-3,
    tier_as_printed="Epic documentation figures documented; estimates and boosts inferred design",
)


def d_src_compare(table1, root=ROOT):
    path = os.path.join(root, "data-src", "environment", "weather_by_day.json")
    d = json.load(open(path, encoding="utf-8"))
    byday = {x["date"]: x for x in d["days"]}
    res = []
    for date, t7, t14, t21, *_ in table1:
        ds = byday.get(date, {}).get("temperature_F")
        if not ds:
            res.append(dict(date=date, status="no data-src temperatures"))
            continue
        mine = dict(zip(("7am", "2pm", "9pm"), (t7, t14, t21)))
        diff = {k: dict(pdf=mine[k], data_src=ds[k]["value"], verification=ds[k]["verification"]) for k in mine if mine[k] != ds[k]["value"]}
        res.append(dict(date=date, status="all three temperatures equal" if not diff else "DIFFERENCE", differences=diff,
                        data_src_verification={k: ds[k]["verification"] for k in ds}))
    return res


def build():
    readings = []
    for date, t7, t14, t21, text, tier, srcs in PDF_TABLE1:
        readings.append(dict(
            date=date,
            readings_F={"07:00": t7, "14:00": t14, "21:00": t21},
            sky_wind_rain_as_printed=text, tier="documented", tier_as_printed=tier,
            weak_source_flag=True,
            weak_source_reason="Every value reached the PDF through secondary summaries; Jacobs's original table was not read (PDF B.10.1, B.10.7).",
            sources_as_printed=srcs,
            timeline_seed_status="seeded_unverified"))
    j5 = PDF_TABLE1_JUL5
    readings.append(dict(date=j5[0], readings_F=None, readings_note="n/a in the PDF", sky_wind_rain_as_printed=j5[4], tier="documented",
                         tier_as_printed="documented (secondary)", weak_source_flag=True, sources_as_printed=j5[5],
                         weak_source_reason="secondary summary only", timeline_seed_status="seeded_unverified"))

    elements = {}
    for el, cells in PDF_TABLE2.items():
        elements[el] = {"tier_as_printed": cells["tier_as_printed"],
                        "by_day": {k: v for k, v in cells.items() if k != "tier_as_printed"}}

    # Cloud readings that carry a number in the PDF text.  fraction_covered = tenths covered / 10.  No value is chosen where ambiguous.
    cloud_readings = [
        dict(lmt="1863-07-01T21:00", description="overcast", fraction_covered=1.0, tier="documented (secondary)", note="Table 1: '9 pm sky overcast'"),
        dict(lmt="1863-07-02T08:00", description="overcast", fraction_covered=1.0, tier="documented (secondary)", note="Table 1"),
        dict(lmt="1863-07-02T14:00", description="3/10 - ambiguous (clear versus covered)", fraction_covered=[0.3, 0.7],
             tier="open gap (carried as ambiguous)", note="PDF: 'the fetch summary is ambiguous'; both readings listed, neither chosen"),
        dict(lmt="1863-07-02T21:00", description="cirrus", fraction_covered=None, tier="documented (secondary)", note="no tenths in the PDF"),
        dict(lmt="1863-07-03T08:00", description="overcast", fraction_covered=1.0, tier="documented (secondary)", note="Table 1"),
        dict(lmt="1863-07-03T14:00", description="4/10 covered", fraction_covered=0.4, tier="documented (secondary)", note="Table 1"),
        dict(lmt="1863-07-03T21:00", description="7/10 cumulus", fraction_covered=0.7, tier="documented (secondary)", note="Table 1"),
    ]
    events = [
        dict(id="EV-RAIN-START", lmt=["1863-06-25T08:00"], text="Intermittent rain begins (PDF prints 8 am Jun 25)", tier="documented (secondary)",
             flag="DIFFERS from data-src: Jacobs 1885 text says 8 p.m.; see pdf_vs_data_src"),
        dict(id="EV-RAIN-END", lmt=["1863-06-27T07:00"], text="Rain ends 7 am Jun 27", tier="documented (secondary)"),
        dict(id="EV-JUL2-FOG", lmt=["1863-07-02T04:35"], text="Foggy dawn (Strategypage); valley placement inferred", tier="documented (one secondary source) / inferred placement"),
        dict(id="EV-JUL3-STORM", lmt=["1863-07-03T18:00"], text="Thunderstorm nearby about 6 pm (Jacobs); 'thunder seemed tame' after the cannonade",
             tier="documented (secondary)"),
        dict(id="EV-JUL4-RAIN", lmt=None, text="Showers on Jul 4, total 1.39 in; timing is a range (see CF-JUL4-RAIN-TIMING)", tier="documented (secondary); timing a range"),
        dict(id="EV-JUL5-RAIN", lmt=None, text="Morning rain aided Lee's retreat (Jul 5)", tier="documented (secondary)"),
    ]
    segments = [
        dict(from_lmt="1863-06-25T08:00", to_lmt="1863-06-27T07:00", precipitation="intermittent rain", wetness=None, tier="documented (secondary)",
             flag="start time differs from data-src (08:00 vs 20:00)"),
        dict(from_lmt="1863-06-27T07:00", to_lmt="1863-07-01T00:00", precipitation="none listed", wetness=None, tier="documented (secondary)",
             flag="PDF gives no wetness value before Jul 1 although 1.28 in fell Jun 25-27 per data-src; gap"),
        dict(from_lmt="1863-07-01T00:00", to_lmt="1863-07-02T00:00", precipitation="none; ground mostly dry", sky="overcast all day", wetness=0.0,
             tier="documented (secondary); wetness inferred"),
        dict(from_lmt="1863-07-02T00:00", to_lmt="1863-07-03T00:00", precipitation="dry in the morning; afternoon: drizzle OR clearing (conflict CF-JUL2-SKY)",
             sky="overcast 8 am; 2 pm ambiguous (CF-JUL2-CLOUD-2PM); cirrus 9 pm", wetness=0.0, tier="documented (secondary); conflict carried",
             conflicts=["CF-JUL2-SKY", "CF-JUL2-CLOUD-2PM"]),
        dict(from_lmt="1863-07-03T00:00", to_lmt="1863-07-03T18:00", precipitation="none", sky="overcast 8 am; 4/10 covered 2 pm", wetness=0.0,
             tier="documented (secondary); wetness inferred"),
        dict(from_lmt="1863-07-03T18:00", to_lmt="1863-07-04T00:00", precipitation="thunderstorm about 6 pm", sky="7/10 cumulus 9 pm", wetness="about 0.3",
             tier="documented (storm); wetness inferred"),
        dict(from_lmt="1863-07-04T00:00", to_lmt="1863-07-05T00:00", precipitation="showers; timing a range (CF-JUL4-RAIN-TIMING); 1.39 in total",
             sky="overcast, showery", wetness=1.0, tier="documented (secondary); timing a range; wetness inferred", conflicts=["CF-JUL4-RAIN-TIMING"]),
        dict(from_lmt="1863-07-05T00:00", to_lmt="1863-07-06T00:00", precipitation="morning rain (Jul 5)", wetness=None,
             tier="documented (secondary)", flag="PDF gives no wetness value after Jul 4; gap"),
    ]

    pdf_vs_data_src = [
        dict(id="D1", item="Rain start, June 25", pdf="8 am Jun 25 (Table 1; timeline row T1-003)",
             data_src="Jacobs 1885 text: 'June 25th, at 8 p. m., a rain began' (Civil War Rx transcription); the 1864 Notes p.14 say only 'the heavy rain of that night'",
             assessment="PDF AM/PM looks wrong: 8 am Jun 25 is contradicted by the only transcription of the text that states a clock time; carried as a FINDING, not corrected here"),
        dict(id="D2", item="Jul 4 rain timing", pdf="Two schedules (Strategypage; TeachersFirst)",
             data_src="Jacobs 1885 text: 'Rain in showers at 6 a.m., from 2:15 to 4 p.m., and at 4 a.m. of the 5th, aggregating 1.390'",
             assessment="The TeachersFirst schedule is the one that matches the Jacobs-derived text; the Strategypage 'heavier 1 to 2 pm, very heavy from 9 pm' has no counterpart in it. Both still carried."),
        dict(id="D3", item="1.39 in attributed to 'July 4'", pdf="plan-clean.txt line 18844 (soiling table): 'Rain on July 4, 1.39 in'",
             data_src="gauge total covers July 4 6 a.m. to July 5 4 a.m.",
             assessment="the total spans two dates"),
        dict(id="D4", item="Jul 2, 2 pm cloud", pdf="3/10 ambiguous (clear vs covered)",
             data_src="Jacobs 1885 text: 'At 2 p.m., three-tenths are clear' (two paths, level two_independent_paths)",
             assessment="data-src reading is three-tenths CLEAR (seven-tenths covered); the PDF ambiguity is carried unchanged because the owner decides"),
        dict(id="D5", item="Wind speed Jul 1-2", pdf="12 mph (ECW) vs about 2 mph (TeachersFirst)",
             data_src="'(2 miles per hour)' in Civil War Rx; '(12 miles per hour)' in ECW typed text and image reading; status open",
             assessment="the same conflict; the paragraph is for July 1 and July 2 inherits it ('wind as on preceding day')"),
        dict(id="D6", item="87 F 'shade'", pdf="'87 F shade' (Table 2, Table 1 note)",
             data_src="thermometer exposure not recorded in these sources; 'shade' is an inference",
             assessment="PDF states shade as fact; data-src says exposure unrecorded"),
        dict(id="D7", item="Temperatures Jun 26 - Jul 4 (27 readings)", pdf="Table 1", data_src="weather_by_day.json days",
             assessment="see temperature_comparison; all equal"),
        dict(id="D8", item="Sky Jun 27 - Jun 30", pdf="Table 1 says only 'No rain listed'",
             data_src="Jacobs 1885: entire sky covered Jun 27, 28 and until the 9 pm observation of Jun 29; Jun 30 7 am and 2 pm complete, 9 pm four-tenths covered; 'almost entire calm' of wind",
             assessment="PDF omits these sky readings; gap in the PDF, data available in data-src"),
        dict(id="D9", item="Source of the numbers", pdf="Strategypage, ECW, TeachersFirst, AMS... (secondary summaries)",
             data_src="the numbers trace to H. E. Jacobs's 1885 'Meteorology of the Battle' (two typed transcriptions plus a low-resolution image); the 1864 Notes contain no thermometer table",
             assessment="provenance of the weather figures is better known in data-src than in the PDF"),
        dict(id="D10", item="Jul 1, 9 pm sky", pdf="'sky overcast'", data_src="'cirro-stratus at 9 p.m.', entire sky covered", assessment="consistent (cloud type not in the PDF)"),
        dict(id="D11", item="Jul 3 thunder source", pdf="Jacobs, 6 pm", data_src="present in the 1885 article, ABSENT from all three 1864 Notes scans (PC3)",
             assessment="consistent with the PDF only if 'Jacobs' means the 1885 article"),
    ]

    doc = dict(
        title="Weather and light timeline for the Battle Theatre, Jun 25 - Jul 5, 1863 (and Nov 19, 1863)",
        status="PDF-derived and cross-checked against data-src/environment/weather_by_day.json. Secondary-source weather: Jacobs's original sheets were not read "
               "(PDF B.10.7). Nothing here is a default; see pdf_recommended_render (PENDING OWNER).",
        pdf_source=dict(file=DOC, sections="B.10.1 (pp.110-111), B.10.2 (pp.111-112), B.10.5 (p.114), B.10.6 (p.115), B.10.7 (p.116), B.12 (p.117+)"),
        clock="local mean time (LMT); times here are LMT unless a field says otherwise",
        tiers_legend={"documented": "a non-lead source supports the claim; here almost always 'documented (secondary)'",
                      "inferred": "reasoned from sources or general knowledge, not retrieved",
                      "plausible-procedural": "filled procedurally where evidence is absent; marked in the product",
                      "open gap": "no source found; shown as a visible gap (Law clause 7)"},
        weak_source_flags=[
            "All Jacobs temperature and sky values arrive through secondary summaries (Strategypage/Nofi, Emerging Civil War, TeachersFirst, AMS, HistoryNet, Coastal Point); the original table was not read.",
            "Humidity, dew point, pressure and visibility are open gaps; heat-index figures are estimates by Nese and Harding from Harrisburg observers 35 miles away.",
            "Cloud effects on lux are inferred, not measured. Fog placement is inferred. Dust is inferred.",
            "Timeline rows are seeded_unverified until checked against a primary source (CLAUDE.md).",
        ],
        jacobs_readings=readings,
        temperature_comparison_with_data_src=d_src_compare(PDF_TABLE1),
        elements_by_day=elements,
        cloud_readings=cloud_readings,
        events=events,
        segments=segments,
        conflicts_carried_as_ranges=CONFLICTS,
        conflicts_note="No candidate is marked chosen or default. 'pdf_handling' is the PDF's recommendation, repeated in pdf_recommended_render (PENDING OWNER).",
        moonlight_by_night=MOONLIGHT,
        night_light_parameters=NIGHT_LIGHT_PARAMS,
        wetness_schedule=dict(source="PDF B.10.6 'Wet surfaces and rain'", parameter="global wetness 0..1 (darker albedo, lower roughness, puddle masks)",
                              segments=WETNESS,
                              gaps=["No value before Jul 1 (rain of Jun 25-27 documented at 1.28 in in data-src) and none after Jul 4 (Jul 5 morning rain documented).",
                                    "Decay of wetness after rain is not specified."]),
        wind=dict(direction="S to SSW (documented, Jacobs)", speed_conflict="CF-WIND-SPEED", gusts="gusting before the Jul 3 storm (inferred, PDF B.10.3/B.10.6)"),
        humidity_guess_for_rendering=dict(tier="inferred, no measured values behind it",
                                          dawn_jul2_relative_humidity_pct=[75, 90], afternoon_jul2_relative_humidity_pct=[55, 70],
                                          jul3_and_jul4="'very humid' (no number)"),
        heat_index_estimates_F=dict(tier="estimates (Nese and Harding, Harrisburg observers 35 miles away)",
                                    jul2=">= 90, possibly about 100 in sun", jul3_charge=[98, 105], jul3_direct_sun_extra=[10, 15]),
        epilogue_nov_1863=dict(
            source="PDF B.12.2 row E-007 and B.12.3 state S-085/S-086 (pp.117-119)",
            weather_conflict_carried=[dict(source="NYT as reported by W-CONS", state="the day turned sunny during the prayer"),
                                      dict(source="W-CONS", state="the day was cloudy"),
                                      dict(source="GC-COMP", state="the morning was 'perfect'")],
            pdf_default="cloudy, clearing during the prayer (PENDING OWNER; PDF row E-007 says 'default')",
            foliage="Late autumn, trees assumed leaf-off or nearly so (inferred; no Nov 19 vegetation source retrieved)",
            sun_and_shadow="computed from the ephemeris (see ephemeris_1863.json, segment 'epilogue'); PDF S-086 quotes 39.82 N, this build uses 39.83 N",
            tier="documented (conflicting accounts) / inferred"),
        pdf_vs_data_src=pdf_vs_data_src,
        figures_to_avoid=[
            dict(figure="88 F on July 1", why="Appears in a Substack essay with no source."),
            dict(figure="Record highs 93, 95, 97 F", why="TeachersFirst gives these as climatological records, not 1863 observations."),
            dict(figure="(from the PDF's own B.11 list) the 'Pittsburgh-heard-it' claim as a precise July 3 fact, and the Ellis acoustic attribution",
                 why="listed in B.11 as unverified")],
        pdf_recommended_render=dict(
            status="PENDING OWNER - recorded from the PDF, not selected",
            items=[
                dict(id="R-WIND", value="wind 2 to 6 mph from S to SSW, gusting before the Jul 3 storm", tier="inferred"),
                dict(id="R-JUL4", value="wet, showery all day with the heaviest rain from afternoon to night; timing stays a range", tier="documented (secondary) / inferred render"),
                dict(id="R-JUL2-SKY", value="foggy or overcast morning, brief drizzle possible midday, clearing late afternoon, cirrus by evening", tier="inferred"),
                dict(id="R-JUL3-HEAT", value="87 F shade and a heat index of about 100 F for the Charge", tier="inferred"),
                dict(id="R-CLOUD-JUL1", value="100% stratus, light grey, base about 800 to 1,500 m", tier="inferred"),
                dict(id="R-CLOUD-JUL3", value="40% cumulus at 2 pm and 70% by evening with a storm anvil at 6 pm", tier="documented readings, inferred render"),
                dict(id="R-CLOUD-JUL4", value="overcast with steady rain", tier="documented (secondary) / inferred render"),
                dict(id="R-WETNESS", value="0 on Jul 1 to the afternoon of Jul 3; about 0.3 after the 6 pm storm of Jul 3; 1.0 on Jul 4", tier="inferred"),
                dict(id="R-NOV19", value="cloudy, clearing during the prayer", tier="inferred default among conflicting accounts"),
                dict(id="R-READABLE-NIGHT", value="readability floor: moon boost 5 to 20x with cool tint, fill light, min EV100 about -4 to -2 (starting values to tune)", tier="inferred design"),
            ]),
        gaps=[
            "Jacobs's original thermometer, cloud and wind table (National Archives; APS Franklin Institute series).",
            "Humidity, dew point, pressure, visibility at Gettysburg.",
            "Wind speed (2 vs 12 mph); rain at night Jun 30 - Jul 2; star visibility; smoke and dust accounts; audibility distances.",
            "Fruit state, crop state and the other vegetation items of B.10.3 are not part of this file.",
        ],
    )
    return doc


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    doc = build()
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(doc, fh, indent=1, ensure_ascii=False)
    bad = [c for c in doc["temperature_comparison_with_data_src"] if c["status"] != "all three temperatures equal"]
    print("wrote", OUT, "| temperature differences vs data-src:", bad)

# Environment layer notes (PDF B.10; gates Q11, Q22; Q10 support)

Built by `tools/bt/ephemeris.py`, `tools/bt/build_weather_timeline.py`, `tools/bt/check_environment.py`.
Everything here is **computed** (sun, moon) or **transcribed from the PDF with its own tiers** (weather). Nothing is a default; PDF recommendations are listed
as `pdf_recommended_render`, **PENDING OWNER**. Weather timeline rows stay `seeded_unverified` / weak-source (Jacobs's original sheets not read).
No gate's `passes` flag was touched.

## Files
| file | content |
|---|---|
| `ephemeris_1863.json` | per-minute table (757 KB), columnar: sun/moon altitude + azimuth, moon illuminated %, sun band (0 day .. 4 night), moon_up; 1863-06-26..07-06 (15,840 rows) and 1863-11-18..19 (2,880 rows); per-day events (sunrise/sunset, civil/nautical/astronomical twilight, upper transits, moonrise/moonset) to sub-second; metadata and the agreement numbers |
| `ephemeris_agreement.json` | full A-vs-B statistics, phases, comparison with the repo's earlier astronomy-engine files, DeltaT sensitivity |
| `weather_timeline.json` | Jacobs readings (PDF Table 1), Table 2 elements, conflicts as ranges, moonlight by night, wetness schedule, segments, PDF-vs-data-src differences, `pdf_recommended_render` |
| `check_environment_results.json` | output of the gate script (every printed PDF figure vs computed) |

Re-run: `PYTHONIOENCODING=utf-8 python tools/bt/ephemeris.py` (17 s), `python tools/bt/build_weather_timeline.py`, `python tools/bt/check_environment.py` (27 s; `--no-recompute` reuses saved numbers).

## Method and clock
* Site 39.83 N, 77.23 W, 170 m. Clock = local mean time, `LMT = UT + lon/15 h = UT - 5 h 08 m 55.2 s`. The PDF writes "UTC minus 5 h 09 m" (a rounding, 4.8 s different).
  **Open item for the owner:** near solar noon the sun's azimuth moves 0.79 deg/min, so the 4.8 s choice of clock moves sun altitude by up to 0.015 deg and
  azimuth by up to 0.065 deg (measured, method B). The 0.05 deg sun tolerance of Q11 is therefore smaller than the effect of the clock definition; A-vs-B agreement is only meaningful on one fixed clock. This build uses the exact longitude.
* Method A: astropy 8.0.2 / pyerfa 2.0.1.5, builtin ephemeris (ERFA epv00 + moon98), GCRS -> AltAz with the site as observer. astropy was missing and was installed with `pip install astropy`. 1863 is outside the IERS range and outside epv00's nominal 1900-2100 (ERFA warns); UT1 was forced to the intended instant, TT = UT + DeltaT.
* Method B: own pure Python/numpy, Meeus AA ch.25 (sun, low accuracy + aberration + nutation), ch.47 (moon, full 60 + 60 terms with A1-A3 and E), ch.22 (short nutation), ch.11/40 (parallax), ch.12 (sidereal time), ch.48 (phase). Self-test: Meeus example 47.a reproduced to 0.0015 arcsec in latitude, 0.0011 arcsec in longitude, 0.015 km in distance.
* Shared assumption: DeltaT = 7.2 s (Espenak/Meeus 1860-1900 polynomial). +-3 s changes moon alt <= 0.0005 deg, moon az <= 0.0017 deg, sun < 0.0002 deg. Using 32.184 s (what an astropy run fed UTC with no DeltaT override effectively uses) would change moon az by up to 0.014 deg: harmless.
* Altitudes are geometric (no refraction), centre of the body, topocentric. Sun rise/set -0.833, twilights -6/-12/-18. Moon rise/set: upper limb with 34' refraction, i.e. centre altitude -(34' + semidiameter).
* **Astronomical horizon only. South Mountain and the Round Tops are not modelled** (PDF: the terrain model must supply them). Relation computed here (Jul 3, sun at az ~297): sunset advances by `(horizon elevation + 0.833 deg) / 0.167 deg per min`, i.e. 8 min for a 0.5 deg horizon, 17 min for 2 deg. The PDF's "10 to 20 minutes" therefore corresponds to a western horizon about 0.8 to 2.5 deg above the astronomical one; whether the real ridge is that high is not checked here (no terrain model).

## Q11: measured agreement (18,720 rows, 11 + 2 days)
| quantity | max abs A-B | RMS A-B | tolerance |
|---|---|---|---|
| sun altitude | 0.00226 deg | 0.00108 deg | 0.05 |
| sun azimuth | 0.00827 deg | 0.00206 deg | 0.05 |
| moon altitude | 0.00016 deg | 0.00010 deg | 0.5 |
| moon azimuth | 0.00060 deg | 0.00016 deg | 0.5 |
| moon illuminated fraction | 0.0023 pct-points | 0.0012 | (none given) |
| sunrise | 0.013 min (0.8 s) | | 2 min |
| sunset | 0.009 min | | 2 min |
| moonrise / moonset | 0.0006 / 0.0009 min | | 2 min |
| all 154 events (twilights, transits, rise/set) | 0.0144 min | 0.0063 min | 2 min |

Full moon of 1863-07-01: A 06:45:56 UT, B 06:46:01 UT, PDF/Moonblink 06:46 (within 0.05 min); in LMT 01:37:01 (PDF 01:37). Other phases against the NASA/Espenak minutes already stored in `data-src/environment/astro_by_day.json`: A-minus-reference -0.40 .. +0.49 min (New Moon Jun 16 +0.49, FQ Jun 24 -0.38, LQ Jul 7 -0.40, New Moon Jul 15 -0.23); the PDF's previous full moon 1863-06-01 23:29 UT: A +0.80 min, B +0.96 min. All within 1 minute. A and B differ by up to 18 s on phase times.

Independent third reference (repo files, astronomy-engine 2.1.19, sea level, stored by earlier work and itself within 0.5 min of USNO): 109 events, max |difference| 1.97 s (A) and 2.14 s (B); 675 tick rows, sun alt max 0.0065 deg, moon alt 0.0070 deg, azimuth 0.05 deg (reference rounding is 0.01 / 0.1 deg).

**Caveat on independence.** ERFA moon98 and Meeus ch.47 both descend from Chapront's ELP series, so the moon agreement tests implementations, not theory; the sun models (VSOP-type vs Meeus low accuracy) are unrelated. The astronomy-engine values and NASA minutes are the other anchors. A genuine USNO re-fetch was not made in this task (no network use beyond pip).

Result: **Q11 computation PASSES** on every stated tolerance; recorded, not written to `gates.json`.

## PDF figures checked (B.10.2): 134 rows (129 compared, 5 information-only), 6 findings
Result of `check_environment.py`: 119 MATCH (printed value equals the rounded computed value), 1 MATCH(trunc), 3 MARGINAL (<= 1 last digit), 5 INFO (source figures with unstated basis), 6 FINDING. All sun table times, every printed sun and moon altitude-azimuth figure, all moonrise/moonset times, the "shadow 0.86 times height, azimuth about 79", and the full moon times agree. The 6 findings:

1. **Moon illumination end-of-night values are wrong.** PDF "99% to 93%", "95% to 86%", "88% to 77%", "80% to 68%" (also B.10.5 step 5 "99% (Jul 1) to 68% (Jul 5)"). Start values agree (computed at moonrise 99.0, 95.0, 88.2, 79.4). End values, computed at the next moonset: 97.7, 92.3, 84.3, 74.5, i.e. the PDF is lower by 4.7, 6.3, 7.3, 6.5 percentage points. The PDF's end numbers are what the computation gives about a day later (93% is reached Jul 3 04:53, 86% Jul 4 03:57, 77% Jul 5 03:48, 68% Jul 6 01:06 LMT). Cause not established; it is not the "elongation vs phase angle" approximation (that differs by at most 0.12 percentage points, measured). The Jul 4-to-5 night is 79 -> 74.5 %, not 80 -> 68 %.
2. **Moonrise Jun 30 "about 19:10"**: computed 19:01:18 (-8.7 min). The PDF flags this figure as not computed; the offset equals the LMT/EST difference, so it may be an EST time, unverified.
3. **T2-052 timeline note "USNO 04:44 EST (about 04:29 local)"**: 04:44 EST equals computed 04:35:15 LMT (04:44:10 EST); "04:29" is 6.3 min off (the row itself says its arithmetic is inconsistent).
4. Marginal, not errors: Jul 1 solar noon printed 12:04, computed 12:03:28 (0.54 min); Jul 4 sunset printed 19:31, computed 19:31:30 (truncation); 1863-06-01 full moon printed 23:29, computed 23:29:47.
5. Sources quoted by the PDF, for information: Strategypage 0435/1933 (Jul 1) and 0437/1932 (Jul 4) differ from computed LMT by -0.2/-1.0 and -0.7/-0.5 min; Freeman's Jul 2 sunrise 04:32 is 3.3 min earlier than computed.
6. Loose wording, not numeric errors: "no moon before about 21:00 on Jul 2 and about 22:00 on Jul 3" (moonrises are 20:38 and 21:16; 3 and 7 degrees up at those hours). PDF S-086 gives the site as 39.82 N, B.10.2 as 39.83 N (0.01 deg is 1 km; < 0.01 deg of sun altitude).

Epilogue (not in the PDF as numbers): Nov 19, 1863 LMT sunrise 06:49, sunset 16:42 (EST 06:58 / 16:50), sun 30.6 deg at noon, 22.9 deg az 214 at 14:00, 6.2 deg az 238 at 16:00; moon waxing gibbous 67.6-69.4 % lit, rises 13:17, 7 deg up at 14:00, 29 deg up at 16:00 (visible in the daytime sky during the ceremony). These are astronomical-horizon values.

## Q22: weather timeline
`check_environment.py` parses PDF Table 1 from `tmp/pdf/plan-clean.txt` and compares it with the JSON: 9 days x 3 readings equal; 87 F occurs only at 14:00 Jul 3; Jul 4 <= 76 F; no chosen/default fields; all five conflicts carry every candidate (Jul 2 2 pm "3/10" kept ambiguous, both 0.3 and 0.7 covered listed); wetness 0 -> about 0.3 -> 1.0 equals the PDF sentence; computed moonrises equal the moonlight table's rise times; tiers normalised with the PDF wording kept. **Q22 timeline consistency PASSES (31 checks).** Q22 proper (scene vs timeline) cannot run until a scene exists; `weather_at(time_iso)` returns the governing segment without interpolating or defaulting.

### Differences from `data-src/environment/weather_by_day.json` (compare only, not overwritten)
* All 27 temperatures equal (Jun 26 - Jul 4).
* **Rain start**: PDF "8 am Jun 25" (Table 1 and timeline T1-003); Jacobs-1885 text in data-src says "June 25th, at 8 p. m." and the 1864 Notes say "the heavy rain of that night". The PDF's AM looks wrong. Carried as a flag, not corrected. data-src also holds the 1.28 in total, absent from the PDF.
* **Jul 4 rain**: the TeachersFirst schedule (6 am; 2:15-4 pm; 4 am Jul 5) is the one that matches the Jacobs-derived text in data-src; Strategypage's "heavier 1 to 2 pm, very heavy from 9 pm" has no counterpart there. Both stay carried. The 1.39 in spans Jul 4 6 am to Jul 5 4 am (the PDF soiling table says "Rain on July 4, 1.39 in").
* **Jul 2 2 pm**: data-src text reads "three-tenths are clear" (seven-tenths covered); the PDF keeps "3/10" ambiguous. Not resolved here (owner).
* **Wind** 2 vs 12 mph is the same conflict, in the July 1 paragraph, inherited by July 2 (the PDF says Jul 1-2: correct).
* "87 F in shade": data-src says the thermometer exposure is not recorded; shade is an inference, the PDF states it as fact.
* PDF omits sky readings of Jun 27-30 (fully covered Jun 27-29; Jun 30 four-tenths at 9 pm; "almost entire calm" wind) that data-src has.
* PDF numbers trace to H. E. Jacobs's 1885 article (two typed transcriptions and a low-resolution image); the 1864 Notes contain no thermometer table and no thunderstorm line.
* Astronomy: data-src `astro_by_day.json` (sea level, 39.8309 N 77.2311 W) agrees with this build to <= 2.2 s on 109 events; its Jul 1 full moon is 06:46:29 UT versus A 06:45:56 (33 s apart). Its moonrise Jun 30 is 19:01:18, which supports finding 2.

### Figures to avoid (PDF B.10.1, B.11)
"88 F on July 1" (unsourced Substack); "record highs 93, 95, 97 F" (climatology, not 1863); the Pittsburgh-heard-it claim as a precise July 3 fact and the Ellis acoustic attribution (B.11); Nese/Harding heat indices are estimates from stations 35 miles away.

## Q10 support
`night_luminance_floor(time_iso, cloud_fraction=None)` (LMT input) returns the computed sun band and moon state, a moonlight ground-illuminance **range** (0.26 lux zenith full moon x sin(alt) x [k^2, k]; the bracket is this tool's own, anchored only on the PDF's "0.1 to 0.2 lux at 30-40 deg, 90-99%"), the PDF's 3-10x cloud attenuation for the cloudy nights, and the PDF's readability parameters as ranges (EV100 min -4..-2, moon boost 5-20x, +1..+2 EV, fill light), marked inferred design / PENDING OWNER. The PDF gives **no numeric luminance or contrast threshold** for Q10; that stays an open item, not guessed.

## Gaps
Local horizon (terrain model); Jacobs's original sheets; humidity, pressure, visibility; wetness before Jul 1 and after Jul 4 and its decay; Jul 2 2 pm cloud; wind speed; star visibility; independent USNO re-fetch for 1863 values; clock definition (5 h 09 m vs 5 h 08 m 55 s); Q10 numeric floor; Nov 19 weather (conflict carried: cloudy clearing at the prayer vs "perfect" morning, default PENDING OWNER).

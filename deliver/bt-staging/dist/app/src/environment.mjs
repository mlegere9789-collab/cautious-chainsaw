// Sun, moon, light level and weather state at any minute.
//  - sun and moon: the project's per-minute table (environment/ephemeris_1863.json: 26 Jun-6 Jul and 18-19 Nov 1863, LMT) where it exists; for 7-14 Jul the
//    low-precision formula of astro.mjs (flagged 'formula' in every sample).
//  - light: night is dimmed but never black. `nightFloor` is the luminance floor: the exposure never falls below it (gate Q10).
//  - weather: read from environment/weather_timeline.json (secondary-source Jacobs readings and the PDF's schedule). Where that file has no record the
//    state says so; nothing is invented. Source conflicts in the weather file are scenario choices.
import { isoToMin, minOf, parts } from './clock.mjs';
import { sunMoon } from './astro.mjs';
const R = Math.PI / 180;
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const lerpAz = (a, b, t) => { const d = ((b - a + 540) % 360) - 180; return (a + d * t + 360) % 360; };
export const band = alt => alt >= -0.833 ? 0 : alt >= -6 ? 1 : alt >= -12 ? 2 : alt >= -18 ? 3 : 4;
export const BAND_NAMES = ['Day', 'Civil twilight', 'Nautical twilight', 'Astronomical twilight', 'Night'];
const isoKey = day => { const p = parts(day * 1440); return `1863-${String(p.month).padStart(2, '0')}-${String(p.dom).padStart(2, '0')}`; };

export class Environment {
  constructor(eph, weather) {
    this.segs = eph.segments.map(s => ({
      from: isoToMin(s.first_lmt_date), n: s.n_rows, events: s.events_lmt_minutes_since_midnight,
      c: Object.fromEntries(Object.entries(s.columns).map(([k, v]) => [k, Float32Array.from(v)])),
    }));
    this.weather = weather; this._wx = buildWeather(weather);
  }
  tableCovers(min) { return this.segs.some(s => min >= s.from && min < s.from + s.n - 1); }
  // sun/moon at a (fractional) minute; `out` is reused so the frame loop makes no garbage
  sample(min, out = {}) {
    for (const s of this.segs) {
      const k = min - s.from;
      if (k >= 0 && k < s.n - 1) {
        const i = Math.floor(k), f = k - i, c = s.c;
        out.sunAlt = lerp(c.sun_alt_deg[i], c.sun_alt_deg[i + 1], f); out.sunAz = lerpAz(c.sun_az_deg[i], c.sun_az_deg[i + 1], f);
        out.moonAlt = lerp(c.moon_alt_deg[i], c.moon_alt_deg[i + 1], f); out.moonAz = lerpAz(c.moon_az_deg[i], c.moon_az_deg[i + 1], f);
        out.moonIllum = lerp(c.moon_illum_pct[i], c.moon_illum_pct[i + 1], f); out.moonUp = c.moon_up[i] > 0.5; out.src = 'table';
        out.band = band(out.sunAlt); return out;
      }
    }
    const r = sunMoon(min); Object.assign(out, r); out.moonUp = r.moonAlt > -0.833; out.src = 'formula'; out.band = band(r.sunAlt); return out;
  }
  // light parameters for the renderer. lum (0..1) is the scene luminance before the floor; exposure = floor + (1 - floor) * lum.
  light(s, opts = {}, wx = null, out = {}) {
    const floor = opts.nightFloor ?? 0.34, cloud = wx && wx.cloud != null ? wx.cloud : 0.3;
    const dayW = smooth(-4, 10, s.sunAlt), moonLum = s.moonUp ? (s.moonIllum / 100) * smooth(0, 25, s.moonAlt) : 0;
    out.lum = dayW * (1 - 0.32 * cloud) + (1 - dayW) * (0.06 + 0.16 * moonLum); out.dayW = dayW;
    out.exposure = Math.min(1.05, floor + (1 - floor) * out.lum);
    const sunAlt = Math.max(s.sunAlt, 9) * R, sunAz = s.sunAz * R, nAlt = Math.max(s.moonUp ? s.moonAlt : 55, 22) * R, nAz = (s.moonUp ? s.moonAz : 200) * R;
    // world axes: x east, z south, y up. direction TO the light.
    const sd = [Math.sin(sunAz) * Math.cos(sunAlt), Math.sin(sunAlt), -Math.cos(sunAz) * Math.cos(sunAlt)];
    const nd = [Math.sin(nAz) * Math.cos(nAlt), Math.sin(nAlt), -Math.cos(nAz) * Math.cos(nAlt)];
    const v = [0, 1, 2].map(i => sd[i] * dayW + nd[i] * (1 - dayW)), l = Math.hypot(v[0], v[1], v[2]) || 1;
    out.sunDir = [v[0] / l, v[1] / l, v[2] / l];
    const warm = smooth(-6, 0, s.sunAlt) * (1 - smooth(0, 12, s.sunAlt)), night = 1 - smooth(-10, 2, s.sunAlt);
    out.tint = { night: night * (0.8 - 0.2 * moonLum), warm: warm * 0.16, grey: cloud * dayW * 0.14 };   // grade laid over the canvas
    return out;
  }
  weatherAt(min, choices = {}) { return this._wx(min, choices); }
  // day/night strip for the scrubber: scene luminance per column
  strip(from, to, cols) {
    const out = new Float32Array(cols), s = {}, o = {};
    for (let i = 0; i < cols; i++) { this.sample(from + (to - from) * (i + 0.5) / cols, s); this.light(s, { nightFloor: 0 }, null, o); out[i] = o.lum; }
    return out;
  }
  sunEvents(min) {
    const day = Math.floor(min / 1440), key = isoKey(day);
    for (const s of this.segs) { const e = s.events && s.events[key]; if (e) { const at = k => e[k] ? day * 1440 + e[k][0] : null; return { sunrise: at('sunrise'), sunset: at('sunset'), civil_dawn: at('civil_dawn'), civil_dusk: at('civil_dusk'), moonrise: at('moonrise') }; } }
    return null;
  }
}

function buildWeather(w) {
  const temps = [];
  for (const r of w.jacobs_readings || []) if (r.readings_F) for (const [hm, f] of Object.entries(r.readings_F)) { const [h, m] = hm.split(':').map(Number); temps.push([isoToMin(r.date) + h * 60 + m, f]); }
  temps.sort((a, b) => a[0] - b[0]);
  const clouds = (w.cloud_readings || []).map(c => ({ t: isoToMin(c.lmt), f: c.fraction_covered, d: c.description, tier: c.tier }));
  const byDay = (k, day) => { const e = w.elements_by_day[k]; return e && e.by_day[isoKey(day)] ? { text: e.by_day[isoKey(day)], tier: e.tier_as_printed } : null; };
  const wet = w.wetness_schedule.segments.map(s => ({ a: isoToMin(s.from_lmt.slice(0, 16)), b: isoToMin(s.to_lmt.slice(0, 16)), v: typeof s.wetness_pdf === 'number' ? s.wetness_pdf : (/0\.3/.test(String(s.wetness_pdf)) ? 0.3 : null), text: s.wetness_pdf, tier: s.tier }));
  const D = { j1: minOf(7, 1) / 1440, j2: minOf(7, 2) / 1440, j3: minOf(7, 3) / 1440, j4: minOf(7, 4) / 1440, j5: minOf(7, 5) / 1440 };
  // 4-5 July rain: three carried schedules (CF-JUL4-RAIN-TIMING). Intensity values are render parameters (inferred), not measurements.
  const h4 = x => minOf(7, 4) + x * 60;
  const RAIN = {
    recommended: [[h4(0), h4(12), 0.3, 'showery'], [h4(12), h4(24), 0.6, 'heaviest from afternoon to night']],
    opt0: [[h4(6), h4(12), 0.35, 'showers 6 am to noon'], [h4(13), h4(14), 0.7, 'heavier 1 to 2 pm'], [h4(21), h4(24), 0.95, 'very heavy from 9 pm']],
    opt1: [[h4(6), h4(6.5), 0.35, 'showers at 6 am'], [h4(14.25), h4(16), 0.55, 'showers 2:15 to 4 pm'], [h4(28), h4(28.5), 0.35, 'showers at 4 am on 5 Jul']],
  };
  const jul5Morning = [minOf(7, 5), minOf(7, 5, 12), 0.25, 'morning rain on 5 Jul (hours not recorded; shown to noon, inferred)'];
  return function weatherState(min, ch) {
    const day = Math.floor(min / 1440), st = { min, record: true, flags: [], conflicts: [] };
    if (day < minOf(6, 26) / 1440 || day > D.j5) {
      Object.assign(st, { record: false, sky: 'No weather record is loaded for this date', cloud: null, precip: { kind: 'none', intensity: 0, text: 'not recorded' }, wetness: { v: null, text: 'not specified' }, tempF: null, wind: { text: 'not recorded', mph: null }, fog: 'not recorded', tier: 'open gap' });
      return st;
    }
    let pre = { kind: 'none', intensity: 0, text: 'none reported', tier: 'documented (secondary)' };
    if (min >= minOf(6, 25, 8) && min < minOf(6, 27, 7)) pre = { kind: 'rain', intensity: 0.3, text: 'intermittent rain (ends 07:00 on 27 Jun)', tier: 'documented (secondary)' };
    const stormC = minOf(7, 3, 18);
    if (Math.abs(min - stormC) < 30) pre = { kind: 'storm', intensity: 0.95 * (1 - Math.abs(min - stormC) / 30), text: 'thunderstorm about 18:00 (duration not recorded; 30 min either side drawn, inferred)', tier: 'documented (secondary)' };
    if (day === D.j4 || day === D.j5) {
      const sched = RAIN[ch['CF-JUL4-RAIN-TIMING']] || RAIN.recommended; let best = null;
      for (const [a, b, k, lab] of [...sched, jul5Morning]) if (min >= a && min < b && (!best || k > best.intensity)) best = { kind: 'rain', intensity: k, text: lab, tier: 'documented (secondary), timing a range' };
      if (best) pre = best; else if (day === D.j4) pre = { kind: 'none', intensity: 0, text: 'between showers', tier: 'documented (secondary), timing a range' };
      st.conflicts.push('CF-JUL4-RAIN-TIMING');
    }
    if (day === D.j2) {
      const v = ch['CF-JUL2-SKY'] || 'recommended'; st.conflicts.push('CF-JUL2-SKY', 'CF-JUL2-CLOUD-2PM');
      st.flags.push(v === 'opt0' ? 'foggy dawn and mizzling afternoon (Strategypage)' : v === 'opt1' ? 'clearing in the afternoon (Boston Globe; Emerging Civil War)' : 'foggy or overcast morning, brief drizzle possible midday, clearing late afternoon (PDF recommended; drizzle not drawn)');
    }
    st.precip = pre;
    // cloud cover (fraction covered): Jacobs readings at 08:00, 14:00, 21:00 interpolated; the 2 pm reading on 2 Jul is carried as ambiguous
    const pick = c => Array.isArray(c.f) ? (ch['CF-JUL2-CLOUD-2PM'] === 'opt0' ? c.f[0] : ch['CF-JUL2-CLOUD-2PM'] === 'opt1' ? c.f[1] : (c.f[0] + c.f[1]) / 2) : c.f;
    let cloud = null; const nums = clouds.filter(c => Math.floor(c.t / 1440) === day && c.f != null).map(c => ({ t: c.t, f: pick(c) }));
    if (day === D.j1 || day === D.j4) cloud = 1;
    else if (nums.length) { cloud = nums[0].f; for (let i = 0; i < nums.length; i++) if (min >= nums[i].t) cloud = i + 1 < nums.length && min < nums[i + 1].t ? lerp(nums[i].f, nums[i + 1].f, (min - nums[i].t) / (nums[i + 1].t - nums[i].t)) : nums[i].f; }
    st.cloud = cloud; st.sky = byDay('clouds', day)?.text || 'No sky description in the weather record for this date';
    if (day === D.j2 && min >= minOf(7, 2, 12) && min < minOf(7, 2, 16)) st.flags.push('the 2 pm cloud reading (3/10) is ambiguous: clear or covered; the light uses ' + (ch['CF-JUL2-CLOUD-2PM'] ? 'the chosen value' : 'the midpoint of the carried range'));
    st.tempF = null;
    for (let i = 0; i + 1 < temps.length; i++) if (min >= temps[i][0] && min <= temps[i + 1][0] && temps[i + 1][0] - temps[i][0] <= 14 * 60 + 1) { st.tempF = lerp(temps[i][1], temps[i + 1][1], (min - temps[i][0]) / (temps[i + 1][0] - temps[i][0])); break; }
    const ws = wet.find(s => min >= s.a && min < s.b); st.wetness = ws ? { v: ws.v, text: ws.v == null ? String(ws.text) : ws.v.toFixed(1), tier: ws.tier } : { v: null, text: 'not specified in the weather record' };
    const wcv = ch['CF-WIND-SPEED'] || 'recommended';
    st.wind = { text: byDay('wind', day)?.text || 'not recorded', mph: wcv === 'opt0' ? [12, 12] : wcv === 'opt1' ? [2, 2] : [2, 6], note: wcv === 'recommended' ? '2 to 6 mph (PDF recommended, pending owner; the sources say 2 and 12)' : wcv === 'opt0' ? '12 mph (Emerging Civil War)' : '2 mph (TeachersFirst)' };
    st.conflicts.push('CF-WIND-SPEED');
    st.fog = byDay('fog', day)?.text || 'not recorded'; st.heat = byDay('temperature_feel', day)?.text || null; st.tier = 'documented (secondary)';
    return st;
  };
}

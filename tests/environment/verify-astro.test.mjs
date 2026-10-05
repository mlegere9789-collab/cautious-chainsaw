// ADVERSARIAL VERIFIER (sky data). node --test tests/environment/verify-astro.test.mjs
// VERIFY-A1..A3 FAIL on the committed validator (validateAstroByDay accepts the seeded error).
// VERIFY-A4..A6 PASS: they re-check the committed sky against values the verifier fetched itself (USNO API v4.0.1 and NASA/Espenak phases, 2026-10-04).
// Separately, the verifier re-derived all 128 events and the 675 tick rows with its own code (Astronomical Almanac sun formulae + Meeus ch. 47 moon in Python, kept in
// the git-ignored tmp/verify-sky, not derived from tools/environment): largest difference from the committed UTC instants 4.1 s; tick rows: sun altitude 0.012 deg,
// moon altitude 0.009 deg, azimuth 0.058 deg, illumination 0.055 points. Those scripts are not committed, so these tests only pin the fetched authority values.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateAstroByDay } from '../../tools/environment/validate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const astro = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'data-src', 'environment', 'astro_by_day.json'), 'utf8'));
const day = (d, date) => d.days.find((x) => x.date === date);
const accepted = async (d, label) => { const r = await validateAstroByDay(d); assert.ok(r.errors.length > 0, `${label}: validateAstroByDay accepted a seeded error (0 errors)`); };

test('VERIFY-A1: a wrong weekday must be rejected (1863-07-03 was a Friday; a Saturday label is accepted today)', async () => {
  const d = astro();
  day(d, '1863-07-03').weekday = 'Saturday';
  await accepted(d, 'weekday');
});
test('VERIFY-A2: a moon phase name that contradicts the principal phases must be rejected (July 2 is after the Full Moon of 1863-07-01 06:46 UT, so "Waxing Gibbous" is wrong)', async () => {
  const d = astro();
  day(d, '1863-07-02').moon.phase_name = 'Waxing Gibbous';
  await accepted(d, 'phase name');
});
test('VERIFY-A3: the pitch checks must be recomputed, not trusted (the EST-to-LMT shift 8.92 min changed to 9.92 min in the text is accepted today)', async () => {
  const d = astro();
  const i = d.pitch_checks.findIndex((p) => /8\.9/.test(JSON.stringify(p)));
  assert.ok(i >= 0, 'a pitch check mentions 8.9');
  d.pitch_checks[i] = JSON.parse(JSON.stringify(d.pitch_checks[i]).replace(/8\.9\d?/g, '9.92'));
  await accepted(d, 'pitch check text');
});

// ---------------------------------------------------------------- independent evidence (passing)
// USNO AA API rstt/oneday v4.0.1, coords 39.8309,-77.2311, tz=-5 (whole minutes, EST), fetched by the verifier on 2026-10-04 with its own fetcher.
// "sha" is the first 12 hex characters of the SHA-256 of each response; they equal the first characters of the hashes the builder recorded in astro_by_day.json.
const USNO = JSON.parse(String.raw`{"1863-06-25":{"sha":"4f2d7d5f865b","frac":"63%","phase":"Waxing Gibbous","sun:Begin Civil Twilight":"04:09","sun:Rise":"04:41","sun:Upper Transit":"12:11","sun:Set":"19:41","sun:End Civil Twilight":"20:14","moon:Set":"00:06","moon:Rise":"13:41","moon:Upper Transit":"19:13"},"1863-06-26":{"sha":"6edace147556","frac":"73%","phase":"Waxing Gibbous","sun:Begin Civil Twilight":"04:09","sun:Rise":"04:42","sun:Upper Transit":"12:11","sun:Set":"19:41","sun:End Civil Twilight":"20:14","moon:Set":"00:38","moon:Rise":"14:48","moon:Upper Transit":"20:05"},"1863-06-27":{"sha":"860307c6b250","frac":"83%","phase":"Waxing Gibbous","sun:Begin Civil Twilight":"04:09","sun:Rise":"04:42","sun:Upper Transit":"12:12","sun:Set":"19:41","sun:End Civil Twilight":"20:14","moon:Set":"01:16","moon:Rise":"15:56","moon:Upper Transit":"21:01"},"1863-06-28":{"sha":"5b30c9d5dfd7","frac":"90%","phase":"Waxing Gibbous","sun:Begin Civil Twilight":"04:10","sun:Rise":"04:42","sun:Upper Transit":"12:12","sun:Set":"19:41","sun:End Civil Twilight":"20:14","moon:Set":"02:01","moon:Rise":"17:05","moon:Upper Transit":"22:01"},"1863-06-29":{"sha":"bb5ed3ea70db","frac":"96%","phase":"Waxing Gibbous","sun:Begin Civil Twilight":"04:10","sun:Rise":"04:43","sun:Upper Transit":"12:12","sun:Set":"19:41","sun:End Civil Twilight":"20:14","moon:Set":"02:55","moon:Rise":"18:11","moon:Upper Transit":"23:04"},"1863-06-30":{"sha":"4d0a0e86ab02","frac":"99%","phase":"Waxing Gibbous","sun:Begin Civil Twilight":"04:11","sun:Rise":"04:43","sun:Upper Transit":"12:12","sun:Set":"19:41","sun:End Civil Twilight":"20:14","moon:Set":"03:57","moon:Rise":"19:10"},"1863-07-01":{"sha":"649ab53cc053","frac":"100%","phase":"Full Moon","sun:Begin Civil Twilight":"04:11","sun:Rise":"04:44","sun:Upper Transit":"12:12","sun:Set":"19:41","sun:End Civil Twilight":"20:13","moon:Upper Transit":"00:07","moon:Set":"05:08","moon:Rise":"20:02"},"1863-07-02":{"sha":"9b8f5c126f5e","frac":"97%","phase":"Waning Gibbous","sun:Begin Civil Twilight":"04:12","sun:Rise":"04:44","sun:Upper Transit":"12:13","sun:Set":"19:41","sun:End Civil Twilight":"20:13","moon:Upper Transit":"01:09","moon:Set":"06:23","moon:Rise":"20:47"},"1863-07-03":{"sha":"5a9c5676c7bc","frac":"91%","phase":"Waning Gibbous","sun:Begin Civil Twilight":"04:12","sun:Rise":"04:45","sun:Upper Transit":"12:13","sun:Set":"19:41","sun:End Civil Twilight":"20:13","moon:Upper Transit":"02:08","moon:Set":"07:38","moon:Rise":"21:25"},"1863-07-04":{"sha":"225451898440","frac":"83%","phase":"Waning Gibbous","sun:Begin Civil Twilight":"04:13","sun:Rise":"04:45","sun:Upper Transit":"12:13","sun:Set":"19:40","sun:End Civil Twilight":"20:13","moon:Upper Transit":"03:04","moon:Set":"08:51","moon:Rise":"21:59"},"1863-07-05":{"sha":"5251f1f57f26","frac":"74%","phase":"Waning Gibbous","sun:Begin Civil Twilight":"04:13","sun:Rise":"04:46","sun:Upper Transit":"12:13","sun:Set":"19:40","sun:End Civil Twilight":"20:13","moon:Upper Transit":"03:56","moon:Set":"10:02","moon:Rise":"22:31"},"1863-07-06":{"sha":"06fdf93e6fb3","frac":"63%","phase":"Waning Gibbous","sun:Begin Civil Twilight":"04:14","sun:Rise":"04:46","sun:Upper Transit":"12:13","sun:Set":"19:40","sun:End Civil Twilight":"20:12","moon:Upper Transit":"04:46","moon:Set":"11:10","moon:Rise":"23:01"},"1863-07-07":{"sha":"095bb9f93c44","frac":"53%","phase":"Waning Gibbous","sun:Begin Civil Twilight":"04:15","sun:Rise":"04:47","sun:Upper Transit":"12:13","sun:Set":"19:40","sun:End Civil Twilight":"20:12","moon:Upper Transit":"05:34","moon:Set":"12:16","moon:Rise":"23:33"}}`);
const USNO_EVENT = { 'sun:Begin Civil Twilight': ['sun', 'civil_dawn'], 'sun:Rise': ['sun', 'sunrise'], 'sun:Upper Transit': ['sun', 'solar_transit'], 'sun:Set': ['sun', 'sunset'], 'sun:End Civil Twilight': ['sun', 'civil_dusk'], 'moon:Rise': ['moon', 'moonrise'], 'moon:Set': ['moon', 'moonset'], 'moon:Upper Transit': ['moon', 'moon_transit'] };

test('VERIFY-A6: every EST time of the committed file that USNO also lists (fetched independently) agrees to within 1 minute (builder claims 0.5 min of rounding), and the integer illumination at EST noon agrees on all 13 days', () => {
  const d = astro();
  let compared = 0, worst = 0;
  for (const [date, u] of Object.entries(USNO)) {
    const dd = day(d, date);
    for (const [k, [grp, name]] of Object.entries(USNO_EVENT)) {
      if (!(k in u)) continue;
      const e = dd[grp][name];
      if (!e || e.absent) continue; // an event on the EST day that falls on the neighbouring LMT day is not in this day's record
      const [uh, um] = u[k].split(':').map(Number), [fh, fm] = e.est.split(':').map(Number);
      let diff = fh * 60 + fm - (uh * 60 + um); if (Math.abs(diff) > 720) diff -= 1440 * Math.round(diff / 1440);
      compared++; worst = Math.max(worst, Math.abs(diff));
      assert.ok(Math.abs(diff) <= 1, `${date} ${name}: committed est ${e.est} vs USNO ${u[k]}`);
    }
    assert.equal(Math.round(dd.moon.illumination_noon_est_pct), Number(u.frac.replace('%', '')), `${date} illumination vs USNO ${u.frac}`);
  }
  assert.ok(compared >= 100, `compared ${compared} events`);
  assert.ok(worst <= 1);
});

test('VERIFY-A4: NASA/Espenak principal phases (UT) fetched independently: New Jun 16 07:36, First Quarter Jun 24 10:32, Full Jul 1 06:46, Last Quarter Jul 7 22:29, New Jul 15 22:54 -- the committed instants fall within [0, 1) minute of each', () => {
  const NASA = { 'New Moon|1863-06-16': '07:36', 'First Quarter|1863-06-24': '10:32', 'Full Moon|1863-07-01': '06:46', 'Last Quarter|1863-07-07': '22:29', 'New Moon|1863-07-15': '22:54' };
  const d = astro();
  assert.equal(d.principal_phases.length, 5);
  for (const p of d.principal_phases) {
    const key = `${p.phase}|${p.utc.slice(0, 10)}`;
    const [h, m] = NASA[key].split(':').map(Number);
    const mine = h * 60 + m, theirs = Number(p.utc.slice(11, 13)) * 60 + Number(p.utc.slice(14, 16)) + Number(p.utc.slice(17, 19)) / 60;
    assert.ok(NASA[key], `a NASA value exists for ${key}`);
    assert.ok(theirs - mine >= -0.001 && theirs - mine < 1, `${key}: committed ${p.utc} vs NASA ${NASA[key]} UT differs by ${(theirs - mine).toFixed(2)} min`);
  }
});

test('VERIFY-A5: the pitch\'s sky numbers hold in the committed file (checked against USNO and against an independent re-derivation): July 2 sunrise 04:35 / sunset 19:32 LMT, civil dusk 20:04, moonrise 20:38 LMT = 20:47 EST, 66 min after sunset, 97% lit; July 3 91% lit', () => {
  const d = astro();
  const j2 = day(d, '1863-07-02'), j3 = day(d, '1863-07-03');
  assert.equal(j2.sun.sunrise.lmt, '04:35'); assert.equal(j2.sun.sunset.lmt, '19:32'); assert.equal(j2.sun.civil_dusk.lmt, '20:04');
  assert.equal(j2.sun.sunrise.est, '04:44'); assert.equal(j2.sun.sunset.est, '19:41');
  assert.equal(j2.moon.moonrise.lmt, '20:38'); assert.equal(j2.moon.moonrise.est, '20:47');
  const toMin = (s) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
  assert.equal(toMin(j2.moon.moonrise.lmt) - toMin(j2.sun.sunset.lmt), 66);
  assert.equal(Math.round(j2.moon.illumination_noon_est_pct), 97);
  assert.equal(Math.round(j3.moon.illumination_noon_est_pct), 91);
  // independent re-derivation of the shift: 77.2311 deg / 15 = 5.14874 h = 5 h 8.92 min west of Greenwich
  assert.equal(Math.round((77.2311 / 15 - 5) * 60 * 100) / 100, 8.92);
});

// Count the night minutes (sun altitude below -0.833 deg) of the grid used by GATE-SPEC-A: every integer minute LMT of
// 26 Jun 00:00 .. 14 Jul 23:59 and of 18 and 19 Nov, with the product's low-precision sunMoon() of app/src/astro.mjs.
// A scratch count to size Q10; it is not a Q11 result. Read-only. Usage: node night_count.mjs
import { sunMoon } from '../../../app/src/astro.mjs';
import { minOf } from '../../../app/src/clock.mjs';
const count = (a, b, off) => { let n = 0, tot = 0; for (let m = a; m < b; m++) { tot++; if (sunMoon(m + off).sunAlt < -0.833) n++; } return [n, tot]; };
const jul = [minOf(6, 26), minOf(7, 15)], nov = [minOf(11, 18), minOf(11, 20)];
const out = {};
for (const off of [0, 0.5]) {
  const [a, ta] = count(jul[0], jul[1], off), [b, tb] = count(nov[0], nov[1], off);
  out['instant_' + (off === 0 ? 'integer_minute' : 'mid_minute')] = { battle_window_night: a, battle_window_minutes: ta, epilogue_night: b, epilogue_minutes: tb, total_night: a + b, total_minutes: ta + tb };
}
console.log(JSON.stringify(out));

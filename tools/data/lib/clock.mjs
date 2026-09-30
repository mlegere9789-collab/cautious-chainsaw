// Clock helpers used by the data rules. The site's clock is chapter 04's and is NOT decided (D-TIME); nothing here
// changes any displayed time. Two read-only models are provided:
//   linear  : the legacy files' own `tick_formula` (tick 1 of each day = 5:00 am, 5 minutes per tick)
//   warped  : the 33-anchor PROPOSAL in docs/plan/data/time-facts-anchors.csv (informational only; unsigned)
import fs from 'node:fs';

export const DAY_START_TICK = [1, 226, 451];
export const TICKS_PER_DAY = 225;

export function dayOfTick(tick) {
  return tick <= 225 ? 1 : tick <= 450 ? 2 : 3;
}

/** Minutes after 00:00 of the tick's own day under the file-declared formula. */
export function linearMinutesOfDay(tick) {
  const d = dayOfTick(tick);
  return 5 * 60 + (tick - DAY_START_TICK[d - 1]) * 5;
}

/** Absolute minutes since 00:00 July 1, 1863 under the linear formula. */
export function linearAbsMinutes(tick) {
  const d = dayOfTick(tick);
  return (d - 1) * 1440 + linearMinutesOfDay(tick);
}

/** Parse "5:00am", "12:40pm", "~10:15am", "July 1 ~10:15am". Returns {day?, minutes} or null. */
export function parseClockLabel(text) {
  if (typeof text !== 'string') return null;
  const m = text.match(/(\d{1,2}):(\d{2})\s*([ap])\.?m/i);
  if (!m) return null;
  let h = Number(m[1]);
  const mi = Number(m[2]);
  if (h < 1 || h > 12 || mi > 59) return null;
  const pm = m[3].toLowerCase() === 'p';
  if (h === 12) h = 0;
  const minutes = (h + (pm ? 12 : 0)) * 60 + mi;
  const dm = text.match(/July\s+(\d)/i);
  return { day: dm ? Number(dm[1]) : null, minutes };
}

/** Load the proposal anchors. Returns a piecewise-linear absMinutes(tick) or null if the CSV is absent. */
export function loadWarpedClock(csvPath) {
  if (!fs.existsSync(csvPath)) return null;
  const lines = fs.readFileSync(csvPath, 'utf8').split(/\r?\n/).filter(Boolean);
  const anchors = [];
  for (const line of lines.slice(1)) {
    // tick,local_time_1863,status,... ; the free-text columns may contain commas inside quotes, but the first two do not.
    const cells = line.split(',');
    const tick = Number(cells[0]);
    const lt = parseClockLabel(cells[1]);
    const dm = String(cells[1]).match(/July\s+(\d)/i);
    if (!Number.isFinite(tick) || !lt || !dm) continue;
    anchors.push({ tick, abs: (Number(dm[1]) - 1) * 1440 + lt.minutes });
  }
  anchors.sort((a, b) => a.tick - b.tick);
  if (anchors.length < 2) return null;
  const fn = (tick) => {
    if (tick <= anchors[0].tick) return anchors[0].abs + (tick - anchors[0].tick) * 5;
    for (let i = 1; i < anchors.length; i++) {
      if (tick <= anchors[i].tick) {
        const a = anchors[i - 1], b = anchors[i];
        return a.abs + ((tick - a.tick) * (b.abs - a.abs)) / (b.tick - a.tick);
      }
    }
    const l = anchors[anchors.length - 1];
    return l.abs + (tick - l.tick) * 5;
  };
  fn.anchors = anchors;
  return fn;
}

// helpers shared by the DATA fix modules and the generator
import model from '../../../src/lib/time/index.js';

/** Legacy-style clock label ("12:40pm") for a tick, computed from the canonical time module (CLOCK). Used only for the `time` field of rows whose tick moves. */
export function legacyTime(tick) {
  const s = model.tickToLabel(tick, { style: 'time' }).replace(/^about\s+/, '');
  const m = /^(\d{1,2}:\d{2})\s*(AM|PM)$/i.exec(s);
  return m ? m[1] + m[2].toLowerCase() : s;
}

/** The tick whose model time is the given ISO local time ("1863-07-02T12:45"). */
export function tickAt(iso) {
  return Math.round(model.clockToTick(iso));
}

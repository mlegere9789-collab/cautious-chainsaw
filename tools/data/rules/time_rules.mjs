// T001-T005. The clock is chapter 04's and unsigned (D-TIME). These rules only MEASURE the legacy files against
// the linear formula the files themselves declare ("Tick 1 = 5:00am, each tick = 5 minutes"). They never change a label.
import { defineRule, V } from './define.mjs';
import { fileGroups } from '../lib/load.mjs';
import { dayOfTick, linearMinutesOfDay, linearAbsMinutes, parseClockLabel } from '../lib/clock.mjs';

const fmt = (m) => {
  const h = Math.floor(m / 60) % 24, mi = Math.round(m % 60);
  const ap = h >= 12 ? 'pm' : 'am';
  return `${((h + 11) % 12) + 1}:${String(mi).padStart(2, '0')}${ap}`;
};

export const CLOCK_TOLERANCE_MIN = 30;

/** All explicit clock mentions ("7:30am", "7:30 in the morning", "4:30 PM") in a text, as minutes of day. */
export function clockMentions(text) {
  const out = [];
  const rx = /\b(\d{1,2}):(\d{2})\s*(?:(a\.?m\.?|p\.?m\.?)\b|in the (morning|afternoon|evening))/gi;
  for (const m of text.matchAll(rx)) {
    let h = Number(m[1]);
    const mi = Number(m[2]);
    let pm;
    if (m[3]) pm = /^p/i.test(m[3]);
    else pm = /afternoon|evening/i.test(m[4]);
    if (h < 1 || h > 12 || mi > 59) continue;
    if (h === 12) h = 0;
    out.push({ text: m[0], minutes: (h + (pm ? 12 : 0)) * 60 + mi });
  }
  return out;
}

const PART_OF_DAY = [
  { rx: /\bdusk\b|\bevening\b/i, lo: 17 * 60, hi: 21 * 60, name: 'evening/dusk' },
  { rx: /\bthat night\b|\bat night\b|\bmidnight\b/i, lo: 19 * 60, hi: 29 * 60, name: 'night' },
  { rx: /\bin the afternoon\b|\bafternoon\b/i, lo: 12 * 60, hi: 18 * 60, name: 'afternoon' },
  { rx: /\bin the morning\b|\bmorning\b|\bdawn\b/i, lo: 4 * 60, hi: 12 * 60, name: 'morning' },
];

export const rules = [
  defineRule({
    id: 'T001', sev: 'E', family: 'time', wp: 'WP-TIME-05', status: 'partial', dv: ['DV-08'],
    title: 'chronology `time` label is within 30 minutes of the clock for its tick (derived label, not typed)', scope: 'chronology',
    spec_baseline: 'DI: 94/137 labels differ from the file formula at all; verifier: 46 by > 30 min (34 %)',
    note: 'partial: compares against the files\' own linear formula. Chapter 04\'s signed clock replaces it; no label is changed here.',
    run(ctx) {
      const out = [];
      for (const [rel, f] of ctx.data.files) {
        if (!fileGroups.chronology(rel) || !f.json) continue;
        f.json.events.forEach((e, i) => {
          const p = parseClockLabel(e.time);
          if (!p) { out.push(V(`${rel}#${i}|unparsable`, `${rel}#${i} t${e.tick}: cannot parse label "${e.time}"`, { kind: 'unparsable', file: rel })); return; }
          const expected = linearMinutesOfDay(e.tick);
          const diff = p.minutes - expected;
          if (Math.abs(diff) > CLOCK_TOLERANCE_MIN) out.push(V(`${rel}#${i}|t${e.tick}`, `${rel}#${i} t${e.tick}: label "${e.time}" vs formula ${fmt(expected)} (${diff >= 0 ? '+' : ''}${diff} min)`, { kind: 'drift', file: rel, data: { tick: e.tick, diff } }));
        });
      }
      return out;
    },
  }),
  defineRule({
    id: 'T002', sev: 'E', family: 'time', wp: 'WP-TIME-05', status: 'partial', dv: ['DV-09', 'DV-22'],
    title: 'succession approx_time agrees with approx_tick (30 minutes) and is a clock time', scope: 'commander_successions',
    spec_baseline: '0 of 37 parseable rows within 30 minutes; 5 rows carry non-clock text',
    note: 'partial: linear clock only; the label is often historically right and the tick clock wrong (qa-ci DV-09 note), so this rule flags disagreement without saying which side is wrong.',
    run(ctx) {
      const f = ctx.file('oob/commander_successions.json');
      if (!f) return null;
      const out = [];
      for (const k of ['union_successions', 'confederate_successions']) {
        f[k].forEach((s, i) => {
          const p = parseClockLabel(s.approx_time);
          if (!p) { out.push(V(`${s.event_id}|non_clock`, `${s.event_id}: approx_time "${s.approx_time}" is not a clock time`, { kind: 'non_clock' })); return; }
          const dayM = String(s.approx_time).match(/July\s+(\d)/i);
          const abs = ((dayM ? Number(dayM[1]) : dayOfTick(s.approx_tick)) - 1) * 1440 + p.minutes;
          const diff = abs - linearAbsMinutes(s.approx_tick);
          if (Math.abs(diff) > CLOCK_TOLERANCE_MIN) out.push(V(`${s.event_id}|t${s.approx_tick}`, `${s.event_id}: "${s.approx_time}" vs tick ${s.approx_tick} (${diff >= 0 ? '+' : ''}${diff} min)`, { kind: 'drift', data: { diff, k, i } }));
        });
      }
      return out;
    },
  }),
  defineRule({
    id: 'T003', sev: 'W', family: 'time', wp: 'WP-TIME-05', status: 'partial', dv: ['DV-10'],
    title: 'clock times and parts of the day quoted in a vignette agree with its trigger tick',
    scope: 'vignettes', spec_baseline: 'DI: 11 of 24 (regex plus manual read); qa-ci DV-10: 3 of 24 (explicit times within 45 min)',
    note: 'partial: regex extraction of "H:MM am/pm" and part-of-day words from panel_summary + full_script; the historian confirms real conflicts (some scripts span hours).',
    run(ctx) {
      const out = [];
      for (const [rel, f] of ctx.data.files) {
        if (!fileGroups.vignettes(rel) || !f.json) continue;
        for (const v of f.json.vignettes) {
          const trig = linearMinutesOfDay(v.trigger_tick);
          const text = `${v.panel_summary} ${v.full_script}`;
          const ms = clockMentions(text);
          if (ms.length) {
            const best = ms.reduce((a, b) => (Math.abs(b.minutes - trig) < Math.abs(a.minutes - trig) ? b : a));
            const d = best.minutes - trig;
            if (Math.abs(d) > 60) out.push(V(`${v.vignette_id}|clock`, `${v.vignette_id} (t${v.trigger_tick} = ${fmt(trig)}): nearest quoted time "${best.text}" is ${d >= 0 ? '+' : ''}${d} min away`, { kind: 'clock_mention', file: rel, data: { diff: d } }));
          }
          const cue = PART_OF_DAY.find((c) => c.rx.test(v.panel_summary));
          if (cue) {
            const t = trig < 4 * 60 ? trig + 1440 : trig;
            if (t < cue.lo || t >= cue.hi) out.push(V(`${v.vignette_id}|part_of_day`, `${v.vignette_id} (t${v.trigger_tick} = ${fmt(trig)}): panel says ${cue.name}`, { kind: 'part_of_day', file: rel }));
          }
        }
      }
      return out;
    },
  }),
  defineRule({
    id: 'T004', sev: 'E', family: 'time', wp: 'WP-DATA-03', status: 'partial', dv: [],
    title: 'day = f(tick) is consistent within files; an explicit date field exists (v2)', scope: 'placements, chronology',
    spec_baseline: '0 (the "July 5" defect is a rendering bug in the bundle, not data)',
    note: 'partial: checks file day/tick agreement only; the v2 `date` field does not exist in legacy.',
    run(ctx) {
      const out = [];
      for (const [rel, f] of ctx.data.files) {
        if (!f.json) continue;
        if ((fileGroups.placements(rel) || fileGroups.density(rel)) && f.json.metadata.day) {
          const bad = f.json.placements.filter((r) => dayOfTick(r.tick) !== f.json.metadata.day);
          if (bad.length) out.push(V(`${rel}|day`, `${rel}: metadata.day ${f.json.metadata.day} but ${bad.length} row(s) on another day`, { file: rel, rows: bad.length }));
        }
        if (fileGroups.chronology(rel)) {
          const d = Number(rel.match(/day(\d)/)[1]);
          const bad = f.json.events.filter((e) => dayOfTick(e.tick) !== d);
          if (bad.length) out.push(V(`${rel}|day`, `${rel}: ${bad.length} event(s) outside day ${d}`, { file: rel, rows: bad.length }));
        }
      }
      return out;
    },
  }),
  defineRule({
    id: 'T005', sev: 'E', family: 'time', wp: 'WP-DATA-03', status: 'implemented', dv: ['DV-20'],
    title: 'chronology ticks strictly increase within a day (no `group` field exists in legacy)', scope: 'chronology', spec_baseline: '0',
    run(ctx) {
      const out = [];
      for (const [rel, f] of ctx.data.files) {
        if (!fileGroups.chronology(rel) || !f.json) continue;
        for (let i = 1; i < f.json.events.length; i++) {
          if (f.json.events[i].tick <= f.json.events[i - 1].tick) out.push(V(`${rel}#${i}`, `${rel}#${i}: tick ${f.json.events[i].tick} follows ${f.json.events[i - 1].tick}`, { file: rel }));
        }
      }
      return out;
    },
  }),
];

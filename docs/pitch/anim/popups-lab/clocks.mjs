// Clock labels on popups vs the app's toolbar clock vs the candidate corrected clock (tools/time/build/gtbg-time.iife.js, unsigned CANDIDATE).
import fs from 'node:fs';
import vm from 'node:vm';
const D = 'release/R1c/dist/data/';
const J = (f) => JSON.parse(fs.readFileSync(D + f, 'utf8'));
const g = {}; vm.runInNewContext(fs.readFileSync('tools/time/build/gtbg-time.iife.js', 'utf8'), { globalThis: g, window: g, self: g }, {}); const T = g.GTBGTime || (globalThis.GTBGTime);
if (!T) { console.log('no GTBGTime', Object.keys(g)); process.exit(1); }
const legacy = (x) => { const M = (x - 1) * 5, P = x <= 225 ? 1 : x <= 450 ? 2 : 3, z = P === 1 ? 0 : P === 2 ? 225 * 5 : 450 * 5, H = M - z, R = (P === 1 ? 360 : 240) + H; return { day: P, min: R }; };
const fmt = (m) => { const h = Math.floor(m / 60) % 24, mm = m % 60; return `${h % 12 || 12}:${String(mm).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; };
const parse = (s) => { const m = /^(?:about\s+)?(\d{1,2}):(\d{2})\s*([ap]m)/i.exec(s.trim()); if (!m) return null; let h = +m[1] % 12; if (/p/i.test(m[3])) h += 12; return h * 60 + +m[2]; };
const out = { sample: [], stats: {} };
const ev = [1, 2, 3].flatMap((d) => J(`chronology_day${d}.json`).events).filter((e) => e.significance !== 'low');
const diffs = [], diffsNew = [];
for (const e of ev) {
  const L = legacy(e.tick), lab = parse(e.time); if (lab == null) continue;
  const d = lab - L.min; diffs.push(d);
  let nm = null; try { nm = parse(T.f(e.tick, 'time')); } catch (er) { /* */ }
  if (nm != null) diffsNew.push(lab - nm);
  if ([28, 267, 275, 322, 548, 551].includes(e.tick)) out.sample.push({ tick: e.tick, eventCard: e.time, toolbar: `${fmt(L.min)}`, candidateClock: T.f(e.tick, 'compat') });
}
const stat = (a) => { const s = [...a].sort((x, y) => x - y); const abs = a.map(Math.abs).sort((x, y) => x - y); return { n: a.length, min: s[0], max: s[s.length - 1], medianAbsMin: abs[Math.floor(abs.length / 2)], agreeWithin5: a.filter((x) => Math.abs(x) <= 5).length, agreeWithin30: a.filter((x) => Math.abs(x) <= 30).length, over60: a.filter((x) => Math.abs(x) > 60).length, over180: a.filter((x) => Math.abs(x) > 180).length }; };
out.stats.eventCardVsToolbar = stat(diffs);
out.stats.eventCardVsCandidate = stat(diffsNew);
// tour stops: subtitle clock vs toolbar at the stop's tick
const tour = [[1, 'McPherson Ridge', 'July 1, 7:30 AM', 12], [2, 'Oak Ridge', 'July 1, 10:00 AM', 22], [3, "Barlow's Knoll", 'July 1, 2:30 PM', 62], [4, 'Seminary Ridge', 'July 1, 4:00 PM', 75], [5, 'Little Round Top', 'July 2, 4:00 PM', 264], [6, "Devil's Den", 'July 2, 4:30 PM', 268], [7, 'The Wheatfield', 'July 2, 5:00 PM', 275], [8, 'Peach Orchard', 'July 2, 6:00 PM', 270], [9, 'Cemetery Hill', 'July 2, 8:00 PM', 322], [10, "Culp's Hill", 'July 2-3 (no clock)', 380], [11, 'Cemetery Ridge', 'July 2, 7:30 PM', 315], [12, 'The Angle', 'July 3, 3:00 PM', 548], [13, 'East Cavalry Field', 'July 3, 3:00 PM', 522], [14, "Pickett's Charge", 'July 3, 3:00 PM', 540], [15, 'High Water Mark', 'July 3 (no clock)', 555], [16, 'Confederate Avenue', 'July 4-5, 1863', 610]];
out.tour = tour.map(([n, name, sub, tick]) => { const L = legacy(tick); const m = /(\d{1,2}:\d{2} [AP]M)/.exec(sub); const subMin = m ? parse(m[1]) : null; return { n, name, subtitle: sub, tick, toolbarAtTick: `July ${L.day}, ${fmt(L.min)}`, candidate: T.f(tick, 'compat'), deltaToolbarMin: subMin == null ? null : subMin - L.min, deltaCandidateMin: subMin == null ? null : subMin - (parse(T.f(tick, 'time')) ?? NaN) }; });
fs.writeFileSync('tmp/pitch-anim/popups/out/clocks.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out.stats, null, 1)); console.log(JSON.stringify(out.sample)); console.log(out.tour.map((t) => `${t.n} ${t.name} t${t.tick}: sub="${t.subtitle}" toolbar="${t.toolbarAtTick}" cand="${t.candidate}" d=${t.deltaToolbarMin} dc=${t.deltaCandidateMin}`).join('\n'));
console.log('T keys', Object.keys(T));
console.log(T.f(28,'time'), T.f(28,'compat'), T.f(28,'chip'), T.f(28,'date'), T.f(28,'long'));

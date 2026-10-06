import fs from 'node:fs';
const D = 'release/R1c/dist/data/';
const J = (f) => JSON.parse(fs.readFileSync(D + f, 'utf8'));
const out = {};
// chronology
const ev = [1, 2, 3].flatMap((d) => J(`chronology_day${d}.json`).events);
out.chron = { total: ev.length, bySig: {} };
for (const e of ev) out.chron.bySig[e.significance] = (out.chron.bySig[e.significance] || 0) + 1;
const nonLow = ev.filter((e) => e.significance !== 'low');
const byTick = {};
for (const e of nonLow) (byTick[e.tick] ||= []).push(e);
out.chron.nonLowEvents = nonLow.length;
out.chron.ticksWithNonLowCard = Object.keys(byTick).length;
out.chron.ticksWithMultiple = Object.entries(byTick).filter(([, a]) => a.length > 1).map(([t, a]) => [Number(t), a.length]);
out.chron.cardTicks = Object.keys(byTick).map(Number).sort((a, b) => a - b);
out.chron.maxEventTextLen = Math.max(...nonLow.map((e) => e.event.length));
out.chron.maxNarrLen = Math.max(...nonLow.map((e) => (e.narrative || '').length));
out.chron.withNarrative = nonLow.filter((e) => e.narrative).length;
// fields present
out.chron.fieldKeys = [...new Set(ev.flatMap((e) => Object.keys(e)))];
// vignettes
const vg = [1, 2, 3].flatMap((p) => J(`vignettes_part${p}.json`).vignettes);
out.vig = { total: vg.length, keys: [...new Set(vg.flatMap((v) => Object.keys(v)))] };
const vt = vg.map((v) => v.trigger_tick).sort((a, b) => a - b);
out.vig.triggerTicks = vt;
out.vig.distinctTicks = [...new Set(vt)].length;
// ticks shown = trigger..trigger+2
const vshown = new Set();
for (const t of vt) for (let k = 0; k <= 2; k++) vshown.add(t + k);
out.vig.ticksShowingStoryCard = vshown.size;
out.vig.nullTrigger = vg.filter((v) => !v.trigger_tick).length;
out.vig.panelSummaryLen = { max: Math.max(...vg.map((v) => (v.panel_summary || '').length)), avg: Math.round(vg.reduce((a, v) => a + (v.panel_summary || '').length, 0) / vg.length) };
out.vig.scriptLen = { max: Math.max(...vg.map((v) => (v.full_script || '').length)), avg: Math.round(vg.reduce((a, v) => a + (v.full_script || '').length, 0) / vg.length) };
out.vig.sample = { id: vg[0].vignette_id, title: vg[0].title, trigger_tick: vg[0].trigger_tick, trigger_location: vg[0].trigger_location, units_featured: vg[0].units_featured };
// coincident vignette overlaps
const vcount = {};
for (const v of vg) for (let k = 0; k <= 2; k++) vcount[v.trigger_tick + k] = (vcount[v.trigger_tick + k] || 0) + 1;
out.vig.maxStackedOnOneTick = Math.max(...Object.values(vcount));
out.vig.ticksWithStack2plus = Object.entries(vcount).filter(([, n]) => n > 1).length;
// card coincidence: ticks where story + event cards both show
const both = [...vshown].filter((t) => byTick[t]);
out.coincide = { storyAndEventSameTick: both.length, ticks: both.sort((a, b) => a - b) };
// successions
const cs = J('oob/commander_successions.json');
const succ = [...cs.union_successions, ...cs.confederate_successions];
out.succ = { total: succ.length, keys: [...new Set(succ.flatMap((s) => Object.keys(s)))], ticks: succ.map((s) => s.approx_tick).sort((a, b) => a - b) };
const sc = {};
for (const s of succ) sc[s.approx_tick] = (sc[s.approx_tick] || 0) + 1;
out.succ.maxAtOneTick = Math.max(...Object.values(sc));
out.succ.ticksWith2plus = Object.entries(sc).filter(([, n]) => n > 1).map(([t, n]) => [Number(t), n]);
out.succ.causes = {};
for (const s of succ) out.succ.causes[s.cause] = (out.succ.causes[s.cause] || 0) + 1;
out.succ.nullTick = succ.filter((s) => s.approx_tick == null).length;
// playback: expected popups per full-day at 1x
fs.writeFileSync('tmp/pitch-anim/popups/out/data-stats.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, (k, v) => (Array.isArray(v) && v.length > 40 ? `[${v.length} items]` : v), 1));

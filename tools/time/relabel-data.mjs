#!/usr/bin/env node
// WP-TIME-06 CANDIDATE: data regeneration and metadata truth. Reads the frozen legacy data (legacy/dist/data, NEVER written) and computes
// the edits that make the data files agree with the candidate clock:
//   chronology_day1-3.json  `time` derived from the model (5-minute rounding, legacy "h:mmam" shape), old value kept as `time_legacy`,
//                           `date` added where the calendar date differs from the Day tab (t160-225, t368-450), `tick_formula` -> pointer
//   placement_schema.json   per-day real_time strings from the model; "430,000+", "600-700 per tick" and "5-minute tick" corrected to what the files hold
//   placements_*.json       chunk description clock spans from the model; record_count (4,890) = the rows the file holds
//   casualty_apportionment  claimed_duration_min (parsed from the prose) and model_duration_min beside each explicit duration claim (TM-V3b input)
//   commander_successions   approx_time from the model (legacy value kept as approx_time_legacy)
// Output is a reviewable change list plus a materialiser, all under tools/time/build/candidate-data/ (own build dir). Nothing here ships:
// no clock-label change ships in Tranche 0 (D-TIME); this is a candidate for the owner and the historian, and every value derived here is only
// as good as the PROPOSED anchors.
//
//   node tools/time/relabel-data.mjs                     compute, write tools/time/build/candidate-data/{changes.json,stats.json} and docs/editorial/candidate-data-diff.md
//   node tools/time/relabel-data.mjs --write-tree <dir>  also materialise a full candidate data tree (copy of legacy/dist/data with the edits) under <dir>/data
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { P, LEGACY, readJson, readText, mdTable, writeIfChanged, parseArgs, mean, median } from './lib.mjs';
import model from '../../src/lib/time/index.js';
import { loadChronology } from './data.mjs';
import { legacyLabel as legacyLabel0, about as about0, calDate as calDate0, spanText, CLOCK_SPAN_RE } from './clocktext.mjs';

const { flags, pos } = parseArgs(process.argv.slice(2));
const treeDir = flags['write-tree'] === true ? pos[0] : flags['write-tree']; // --write-tree <dir> or --write-tree=<dir>
if (flags['write-tree'] && !treeDir) { console.error('--write-tree needs a directory'); process.exit(2); }
const D = path.join(LEGACY, 'data');
const OUT = P('tools', 'time', 'build', 'candidate-data');
const cnt = (t, f) => { let n = 0, i = 0; while ((i = t.indexOf(f, i)) !== -1) { n++; i += f.length; } return n; };

// ---------------------------------------------------------------- clock strings
const legacyLabel = (t) => legacyLabel0(model, t), about = (t) => about0(model, t), calDate = (t) => calDate0(model, t);

// ---------------------------------------------------------------- 1. chronology
const changes = [];
const textPatches = {};
const addText = (file, id, find, repl, note, expect = 1) => { (textPatches[file] ||= []).push({ id, find, repl, expect }); changes.push({ file, id, old: find, new: repl, note }); };

const chron = loadChronology();
let relabeled = 0, unchanged = 0, dated = 0;
const chronRaw = Object.fromEntries([1, 2, 3].map((d) => [d, readText(path.join(D, `chronology_day${d}.json`))]));
for (const e of chron) {
  const nu = legacyLabel(e.tick), old = e.time, needDate = calDate(e.tick) !== `July ${model.tabDay(e.tick)}`;
  const file = `chronology_day${e.day}.json`;
  if (nu === old && !needDate) { unchanged++; continue; }
  const find = `{"tick":${e.tick},"time":"${old}",`;
  const repl = `{"tick":${e.tick},"time":"${nu}",${nu !== old ? `"time_legacy":"${old}",` : ''}${needDate ? `"date":"${calDate(e.tick)}",` : ''}`;
  addText(file, `chron-t${e.tick}`, find, repl, `${old} -> ${nu}${needDate ? ` (${calDate(e.tick)}: the calendar date differs from the Day ${e.day} tab)` : ''}`);
  if (nu !== old) relabeled++; if (needDate) dated++;
}
for (const [d, text] of Object.entries(chronRaw)) {
  const m = /    "tick_formula": "([^"]*)",\n/.exec(text);
  const start = model.tabStart(+d), end = model.tabDays[d - 1][1];
  const repl = `    "tick_formula": "Tick numbers are permanent frame ids, not fixed five-minute steps. The clock is derived from data/time_anchors.json (candidate dv ${model.dv}, ${model.anchors.length} proposed anchors, unreviewed): Day ${d} = ticks ${start}-${end}, from ${about(start)} to ${about(end)} (local mean time). A Day tab is a tick range, not a calendar date.",\n`;
  addText(`chronology_day${d}.json`, `chron-meta-d${d}`, m[0], repl, 'metadata.tick_formula: 5-minute claim replaced by a pointer to the anchors');
}

// ---------------------------------------------------------------- 2. placement_schema
const schema = readText(path.join(D, 'placement_schema.json'));
const recs = []; for (const f of fs.readdirSync(D).filter((x) => /^(placements_|density_).*\.json$/.test(x))) recs.push(...(readJson(path.join(D, f)).placements || []));
const populated = new Set(recs.map((r) => r.tick)).size, nFiles = fs.readdirSync(D).filter((x) => /^(placements_|density_).*\.json$/.test(x)).length;
for (const d of [1, 2, 3]) {
  const [s, e] = model.tabDays[d - 1], old = new RegExp(`"real_time": "[^"]*"`).exec(schema.split('\n').find((l) => l.includes(`"day${d}"`)))[0];
  const line = schema.split('\n').find((l) => l.includes(`"day${d}"`));
  addText('placement_schema.json', `schema-day${d}`, old, `"real_time": "${spanText(model, s, e)}"`, `day${d}.real_time regenerated from the model`);
}
addText('placement_schema.json', 'schema-purpose', 'Defines the exact data structure for all 430,000+ unit placement records.', `Defines the data structure for the unit placement records (${recs.length.toLocaleString('en-US')} rows in ${nFiles} files, on ${populated} of 675 ticks).`, '"430,000+" corrected to the rows the files hold');
addText('placement_schema.json', 'schema-per-tick', '"expected_units_per_tick": "600-700"', `"expected_units_per_tick": "about ${(recs.length / populated).toFixed(0)} rows on a populated tick (sparse keyframes; ${675 - populated} ticks hold none)"`, '"600-700" corrected');
addText('placement_schema.json', 'schema-total', '"total_placement_records": "approximately 430000"', `"total_placement_records": "${recs.length}"`, 'total corrected');
addText('placement_schema.json', 'schema-tick-desc', '"description": "The 5-minute tick number. Tick 1 = 5:00am July 1."', `"description": "Frame number 1-675, a permanent id. The clock time comes from time_anchors.json (about ${legacyLabel(1)} on July 1 at tick 1); a tick is not a fixed five minutes."`, 'tick description');

// ---------------------------------------------------------------- 3. placements_*.json metadata
const spanRe = CLOCK_SPAN_RE;
for (const f of fs.readdirSync(D).filter((x) => /^placements_.*\.json$/.test(x))) {
  const text = readText(path.join(D, f)), j = JSON.parse(text), md = j.metadata, [a, b] = md.tick_range;
  const dm = /"description": "([^"]*)"/.exec(text)[0], m = spanRe.exec(md.description);
  if (m) {
    const nu = md.description.replace(spanRe, `${about(a)} to ${about(b)}`);
    addText(f, `desc-${f}`, dm, `"description": "${nu}"`, `clock span "${m[0]}" -> "${about(a)} to ${about(b)}" (ticks ${a}-${b})`);
  }
  if (md.record_count !== undefined && md.record_count !== j.placements.length) addText(f, `count-${f}`, `"record_count": ${md.record_count}`, `"record_count": ${j.placements.length}`, `record_count ${md.record_count} -> ${j.placements.length} (the rows the file holds)`);
}

// ---------------------------------------------------------------- 4. casualty_apportionment durations (claimed, parsed from prose; model span beside it)
const cas = readText(path.join(D, 'casualty_apportionment.json')), casJ = JSON.parse(cas);
const words = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8 };
const dur = (s) => { const m = /(\d+|one|two|three|four|five|six|seven|eight)\s*[- ]?\s*(minutes?|hours?)/i.exec(s); return m ? (words[m[1].toLowerCase()] || +m[1]) * (/hour/i.test(m[2]) ? 60 : 1) : null; };
const span = (r) => Math.round(model.tickToMinutes(r[1]) - model.tickToMinutes(r[0]));
for (const [k, v] of Object.entries(casJ.notable_intensity_notes)) {
  if (!v.tick_range || !dur(v.note)) continue;
  const tr = `"tick_range": [${v.tick_range[0]}, ${v.tick_range[1]}]\n`;
  addText('casualty_apportionment.json', `cas-${k}`, tr, `"tick_range": [${v.tick_range[0]}, ${v.tick_range[1]}],\n      "claimed_duration_min": ${dur(v.note)},\n      "model_duration_min": ${span(v.tick_range)}\n`, `${k}: prose claims ${dur(v.note)} min over ticks ${v.tick_range.join('-')}; the candidate clock spans ${span(v.tick_range)} min`);
}
for (const c of [...casJ.union_corps, ...casJ.confederate_corps]) for (const p of c.engagement_periods || []) {
  if (!p.tick_range || !p.notes || !dur(p.notes)) continue;
  const nt = `"notes": ${JSON.stringify(p.notes)}`;
  if (!cas.includes(nt)) continue;
  addText('casualty_apportionment.json', `cas-${c.corps_id}-${p.tick_range.join('-')}`, nt, `"claimed_duration_min": ${dur(p.notes)},\n          "model_duration_min": ${span(p.tick_range)},\n          ${nt}`, `${c.corps_id} day ${p.day}: prose claims ${dur(p.notes)} min over ticks ${p.tick_range.join('-')}; the candidate clock spans ${span(p.tick_range)} min`);
}

// ---------------------------------------------------------------- 5. successions (standard 2-space JSON: transform and stringify)
const succPath = path.join(D, 'oob', 'commander_successions.json'), succText = readText(succPath), succJ = JSON.parse(succText);
const succ2 = JSON.stringify(succJ, null, 2) + '\n' === succText;
const succRows = [];
const legacyMod = (t) => { const P = t <= 225 ? 1 : t <= 450 ? 2 : 3; return (5 * 60 + (t - (P === 1 ? 1 : P === 2 ? 226 : 451)) * 5) % 1440; };
const parseSucc = (s) => { const m = /^July (\d) ~?(\d{1,2}):(\d\d)([ap])m$/.exec(s); return m ? { day: +m[1], mod: ((+m[2] % 12) + (m[4] === 'p' ? 12 : 0)) * 60 + +m[3] } : null; };
let parseable = 0, agreeModel = 0, agreeLegacy = 0;
for (const list of [succJ.union_successions, succJ.confederate_successions]) for (const r of list) {
  const nu = `${calDate(r.approx_tick)} ~${legacyLabel(r.approx_tick)}`, ps = parseSucc(r.approx_time);
  if (ps) { parseable++; const dm = Math.abs(ps.mod - (Math.round(model.tickToMinutes(r.approx_tick)) % 1440)); if (dm <= 30 && calDate(r.approx_tick) === `July ${ps.day}`) agreeModel++; if (Math.abs(ps.mod - legacyMod(r.approx_tick)) <= 30) agreeLegacy++; }
  succRows.push({ id: r.event_id, tick: r.approx_tick, old: r.approx_time, nu });
}
const succTransform = (j) => { for (const list of [j.union_successions, j.confederate_successions]) for (const r of list) { const nu = `${calDate(r.approx_tick)} ~${legacyLabel(r.approx_tick)}`; const o = {}; for (const [k, v] of Object.entries(r)) { if (k === 'approx_time') { o.approx_time = nu; o.approx_time_legacy = v; } else o[k] = v; } for (const k of Object.keys(r)) delete r[k]; Object.assign(r, o); } return j; };
for (const r of succRows) changes.push({ file: 'oob/commander_successions.json', id: `succ-${r.id}`, old: r.old, new: r.nu, note: `t${r.tick}` });

// ---------------------------------------------------------------- materialise
function materialise(dir) {
  const dd = path.join(dir, 'data'); fs.rmSync(dd, { recursive: true, force: true }); fs.cpSync(D, dd, { recursive: true });
  for (const [file, ps] of Object.entries(textPatches)) {
    const p = path.join(dd, file); let t = readText(p);
    for (const q of ps) { const n = cnt(t, q.find); if (n !== q.expect) throw new Error(`${file} ${q.id}: expected ${q.expect}, found ${n}`); t = t.split(q.find).join(q.repl); }
    fs.writeFileSync(p, t);
  }
  fs.writeFileSync(path.join(dd, 'oob', 'commander_successions.json'), JSON.stringify(succTransform(JSON.parse(succText)), null, 2) + '\n');
  return dd;
}
// dry run must succeed: every find matches exactly `expect` times
const dry = path.join(os.tmpdir(), 'gtbg-relabel-dry-' + process.pid);
materialise(dry); fs.rmSync(dry, { recursive: true, force: true });

// ---------------------------------------------------------------- outputs
const stats = {
  model: model.version, dv: model.dv, chronology: { events: chron.length, relabeled, unchanged, dated, timeLegacyKept: relabeled },
  files: Object.fromEntries(Object.entries(textPatches).map(([f, ps]) => [f, ps.length])), successions: { rows: succRows.length, parseable, agreeWithModel30: agreeModel, agreeWithLegacyFormula30: agreeLegacy, byteExact2Space: succ2 },
  placementRows: recs.length, populatedTicks: populated,
};
fs.mkdirSync(OUT, { recursive: true });
writeIfChanged(path.join(OUT, 'changes.json'), JSON.stringify({ note: 'CANDIDATE data edits computed from the PROPOSED anchors (unreviewed). Legacy data is never modified. Materialise with node tools/time/relabel-data.mjs --write-tree <dir>.', textPatches, successions: succRows, stats }, null, 1) + '\n');
writeIfChanged(path.join(OUT, 'stats.json'), JSON.stringify(stats, null, 2) + '\n');
const sample = (file, n) => changes.filter((c) => c.file === file).slice(0, n);
const md = `# Candidate data regeneration (WP-TIME-06): the diff for the owner to review

> **CANDIDATE. Nothing here is approved by the owner or a historian, and nothing here ships until they approve it (D-TIME): no clock-label change ships in Tranche 0.** Generated by \`node tools/time/relabel-data.mjs\`. The legacy data (\`legacy/dist/data\`) is never modified; every value below is derived from the 33 PROPOSED anchors (version ${model.version}, dv ${model.dv}) and is only as good as they are. The full change list is \`tools/time/build/candidate-data/changes.json\`; materialise a candidate tree with \`--write-tree <dir>\`.

## Summary

${mdTable(['file', 'edits', 'what changes'], [
  ['chronology_day1-3.json', `${relabeled} of ${chron.length} labels + 3 metadata lines`, `\`time\` derived from the model (5-minute rounding, legacy "h:mmam" shape); the old value is kept as \`time_legacy\` for the 30-day compatibility window; \`date\` added on ${dated} events whose calendar date differs from the Day tab; \`tick_formula\` becomes a pointer to the anchors. ${unchanged} labels already equal the model and are untouched.`],
  ['placement_schema.json', `${textPatches['placement_schema.json'].length}`, 'per-day real_time from the model; "430,000+ records", "600-700 units per tick" and the "5-minute tick" description corrected to what the files hold'],
  ['placements_*.json', `${Object.entries(textPatches).filter(([f]) => f.startsWith('placements_')).reduce((a, [, p]) => a + p.length, 0)}`, 'chunk description clock spans from the model (ticks of the chunk); record_count corrected from 4,890 to the 100 rows the file holds'],
  ['casualty_apportionment.json', `${textPatches['casualty_apportionment.json'].length}`, 'claimed_duration_min (parsed from the prose) and model_duration_min beside each explicit duration claim, so TM-V3b needs no prose parsing'],
  ['oob/commander_successions.json', `${succRows.length}`, `approx_time from the model, legacy kept as approx_time_legacy. Of ${parseable} rows with a typed clock, ${agreeModel} agree with the candidate clock within 30 minutes and ${agreeLegacy} with the file's own 5-minute formula`],
])}

## Samples

### Chronology labels (first 25 of ${relabeled})

${mdTable(['tick', 'legacy label', 'derived', 'note'], changes.filter((c) => c.id.startsWith('chron-t')).slice(0, 25).map((c) => [c.id.slice(7), /"time":"([^"]*)"/.exec(c.old)[1], /"time":"([^"]*)"/.exec(c.new)[1], c.note]))}

The five events that need a calendar date (the Day tab says July 2 but the clock is past midnight): ${changes.filter((c) => /"date"/.test(c.new)).map((c) => `t${c.id.slice(7)} (${/"date":"([^"]*)"/.exec(c.new)[1]}, ${/"time":"([^"]*)"/.exec(c.new)[1]})`).join('; ')}.

### Metadata

${mdTable(['file', 'was', 'now'], [...sample('placement_schema.json', 8), ...changes.filter((c) => c.id.startsWith('desc-')).slice(0, 4), ...changes.filter((c) => c.id.startsWith('count-'))].map((c) => [c.file, `\`${c.old.slice(0, 140)}\``, `\`${c.new.slice(0, 200)}\``]))}

### Duration claims (TM-V3b)

${mdTable(['where', 'claimed', 'model span', 'note'], changes.filter((c) => c.file === 'casualty_apportionment.json').map((c) => [c.id, /claimed_duration_min": (\d+)/.exec(c.new)[1] + ' min', /model_duration_min": (\d+)/.exec(c.new)[1] + ' min', c.note]))}

The prose durations disagree with the candidate clock by more than 35% in most cases: they describe the fighting, while the ticks were authored as a time-lapse. Either the prose is corrected (reviewer) or the anchors around those ticks are wrong (also the reviewer's call); the model does not decide.

### Successions (first 10 of ${succRows.length})

${mdTable(['event', 'tick', 'legacy approx_time', 'derived'], succRows.slice(0, 10).map((r) => [r.id, r.tick, r.old, r.nu]))}

## Review notes

- Labels for events whose tick is wrong (12 misordered, 4 wrong-day, 9 composite) become consistent with their tick, not with the event: see the triage in \`docs/editorial/time-audit.md\`.
- Event text still contains typed clocks; this pass does not rewrite prose (WP-TIME-08).
- \`time_legacy\` is a compatibility field for 30 days; a reader that ignores it is unaffected.
- Not done here: moments registry ids (WP-TIME-05), vignette text corrections (WP-TIME-08), re-ticking (WP-TIME-07).
`;
writeIfChanged(P('docs', 'editorial', 'candidate-data-diff.md'), md);
if (treeDir) { const dd = materialise(path.resolve(String(treeDir))); console.log('candidate data tree written to ' + dd); }
console.log(`candidate data: ${Object.values(stats.files).reduce((a, b) => a + b, 0) + succRows.length} edits in ${Object.keys(stats.files).length + 1} files (chronology ${relabeled} relabeled, ${dated} dated, ${unchanged} already equal); successions ${agreeModel}/${parseable} agree with the candidate clock, ${agreeLegacy}/${parseable} with the legacy formula`);

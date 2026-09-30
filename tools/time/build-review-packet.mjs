#!/usr/bin/env node
// Builds docs/editorial/anchor-review-packet.md: the 33-anchor review packet for the historian (one page per R anchor with evidence and
// options), regenerated from data-src/time/time_anchors.json, review_options.json and the time-facts tables. CANDIDATE: nothing here is a
// finding and nothing ships until the owner and the historian approve (D-TIME, D-HIST-REVIEW).
//
// For each option the packet COMPUTES what would change (slopes, clocks, residuals of the events that sit in the affected segment, keyframe
// speeds over the caps, validity under TM-V1), so the historian sees the consequence of a choice before making it.
import fs from 'node:fs';
import { P, readJson, readText, readCsv, parseJulyClock, parseHm, mdTable, mean, median, rms, r1, writeIfChanged, isoOf } from './lib.mjs';
import { makeTimeModel, validateAnchors } from '../../src/lib/time/index.js';
import { buildContext, kinematics } from './rules.mjs';
import { loadChronology } from './data.mjs';

const doc = readJson(P('data-src', 'time', 'time_anchors.json'));
const opts = readJson(P('data-src', 'time', 'review_options.json'));
const model = makeTimeModel(doc);
const facts = Object.fromEntries(readCsv(P('docs', 'plan', 'data', 'time-facts.csv')).map((r) => [r.id, r]));
const disc = readCsv(P('docs', 'plan', 'data', 'time-facts-discrepancy.csv'));
const other = readCsv(P('docs', 'plan', 'data', 'time-facts-otherclaims.csv'));
const chron = loadChronology();
const ctx = buildContext(model, doc);
const norm = (s) => s.replace(/(\d)a$/, '$1am').replace(/(\d)p$/, '$1pm');
const hm = (min) => { const r = Math.round(min), d = Math.floor(r / 1440), m = r - d * 1440, h = Math.floor(m / 60); return `${h % 12 === 0 ? 12 : h % 12}:${String(m % 60).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}${d ? ` (+${d}d)` : ''}`; };
const clk = (mdl, t) => mdl.format(t, 'time', { roundMin: 5 });

// register rows from the specialist's report
const reportMd = readText(P('docs', 'plan', 'specialists', 'time-facts.md'));
const regStart = reportMd.indexOf('## 4. Register of inter-source disagreements'), regEnd = reportMd.indexOf('## 5. Discrepancy tables');
const register = {};
for (const line of reportMd.slice(regStart, regEnd).split(/\r?\n/)) { const m = /^\| (\d+) \| (.*?) \| (.*) \| (.*?) \|$/.exec(line); if (m) register[+m[1]] = { topic: m[2], readings: m[3], handling: m[4] }; }

const MATCHED = ['RELABEL', 'RELABEL-CONTESTED', 'TEXT-VS-LABEL'];
const matched = disc.filter((r) => MATCHED.includes(r.class)).map((r) => ({ tick: +r.site_tick, cls: r.class, real: parseJulyClock(norm(r.real_best)), id: r.real_event_id, note: r.note }));

function variant(tick, isoTime) {
  const d = JSON.parse(JSON.stringify(doc)); d.anchors.find((a) => a.tick === tick).t = isoTime;
  const rep = validateAnchors(d); if (!rep.ok) return { ok: false, errors: rep.errors.map((e) => e.msg) };
  const mdl = makeTimeModel(d);
  return { ok: true, model: mdl, kin: kinematics({ ...ctx, model: mdl }) };
}
const A = doc.anchors, idx = (t) => A.findIndex((a) => a.tick === t);
const defKin = kinematics(ctx);
const inSample = (mdl) => { const e = matched.map((r) => Math.abs(r.real - Math.round(mdl.tickToMinutes(r.tick)))); return { mean: mean(e), w30: e.filter((x) => x <= 30).length }; };
const defIn = inSample(model);

// ---------------------------------------------------------------- LOO ranking for the spot-check table
const loo = {};
for (let i = 1; i < A.length - 1; i++) { const p = model.anchors[i - 1], a = model.anchors[i], n = model.anchors[i + 1]; loo[a.tick] = a.minutes - (p.minutes + (n.minutes - p.minutes) * (a.tick - p.tick) / (n.tick - p.tick)); }

const out = [];
const push = (...s) => out.push(...s);
push(`# Anchor review packet for the historian (33 anchors)

> **Status: CANDIDATE, unreviewed. Nothing in this packet has been approved by the owner or by a historian, and nothing here ships until they approve it (D-TIME, D-HIST-REVIEW).** Every anchor below is \`state: proposed\`. The times are the time-facts specialist's proposals; the model, the residuals and the option consequences are computed by \`node tools/time/build-review-packet.mjs\` from \`data-src/time/time_anchors.json\` (version ${doc.version}, dv ${doc.dv}). The historian decides; nothing in this packet is a finding. Regenerate, do not edit.

## What is being asked

The site's clock is a piecewise-linear function of the tick through 33 anchor points (\`tick -> local mean time\`). Every tick keeps its number; only the derived clock changes. A wrong anchor shifts every tick in its two neighbouring segments, so the anchors are the highest-value review items. You are asked to:

1. **Decide the five R anchors** (t75, t90, t248, t275, t538): pick one of the offered readings or supply another time with a range and a citation (work, edition, page). Sections 3.1 to 3.5, one page each.
2. **Spot-check the anchors with weak evidence** (section 4): the four S-status anchors that rest on M-confidence rows, the four that fail the evidence rule, and the anchors next to gaps that are least predictable from their neighbours.
3. **Tell the owner what you cannot verify.** Unread sources (Pfanz, Coddington, Sears, Hessler, Wert, Gottfried, Busey and Hartwig, most Official Records reports) are listed per anchor. An honest "cannot verify" leaves the row \`proposed\` and the site keeps its "about" wording.
4. The three design anchors and the circular t5 are the **owner's** to sign (section 5), not yours.

Sign-off states and what each one changes on the site are in \`docs/editorial/sign-off-states.md\`; the role, hours and standard are in \`docs/editorial/reviewer-charter.md\`. Times are **local mean time** at Gettysburg (39.83 N, 77.23 W), not standard time (1863 had none); EST would be about nine minutes later.

## 1. All 33 anchors

Status: S solid, M medium, R needs a historian, D design (no historical event). Sigma is the plus or minus, in minutes, the model prints as "about". Flags: H historian decides, O owner signs, C circular, M an S anchor resting on an M-confidence row, E an S anchor failing the evidence rule (one Official Records report or two independent strong families), W no strong source family. "LOO" is the error of predicting this anchor from its two neighbours (true minus predicted, minutes): large values are the anchors next to gaps.

${mdTable(['tick', 'local time', 'status', 'sigma', 'accepted range', 'event', 'fact rows', 'source families', 'flags', 'LOO (min)'], A.map((a) => [a.tick, `${model.format(a.tick, 'date').replace(', 1863', '')} ${a.t.slice(11)}`, a.status + (a.effective_status ? '>' + a.effective_status : ''), a.sigma_min, a.range.join('-'), a.label, a.facts.join('/') || 'sun', a.families.join(' '), a.flags.join(' ') || '-', loo[a.tick] === undefined ? '' : (loo[a.tick] >= 0 ? '+' : '') + Math.round(loo[a.tick])]))}

Counts: S ${A.filter((a) => a.status === 'S').length}, M ${A.filter((a) => a.status === 'M').length}, R ${A.filter((a) => a.status === 'R').length}, D ${A.filter((a) => a.status === 'D').length}; ${A.filter((a) => a.flags.length).length} of 33 carry a flag and ${A.filter((a) => !a.flags.length).length} pass the mechanical checks (t${A.filter((a) => !a.flags.length).map((a) => a.tick).join(', t')}). Slopes run ${Math.min(...model.anchors.slice(1).map((a, i) => (a.minutes - model.anchors[i].minutes) / (a.tick - model.anchors[i].tick))).toFixed(2)} to ${Math.max(...model.anchors.slice(1).map((a, i) => (a.minutes - model.anchors[i].minutes) / (a.tick - model.anchors[i].tick))).toFixed(2)} minutes per tick; the lulls (over 15 min/tick) are t5-12, t226-240, t240-248 and t515-518 and are real gaps in the record.

## 2. Review order

1. **t538** (infantry step-off) and **t275** (20th Maine): the site's hero moment, tour, Turning Points and onboarding sit on them.
2. **t248** (Sickles), then **t75** and **t90**.
3. The content decisions that depend on the clock (not anchors): Colgrove's charge and vignette V-022, then Pickett's division placements.
4. The S anchors on M-confidence rows: t28, t1, t53, t515; and the evidence-rule failures t1, t36, t326, t515.
5. The rest, largest LOO error first (t518, t340, t451, t240, t568).
`);

const REVIEW_TICKS = [75, 90, 248, 275, 538];
let n = 0;
for (const t of REVIEW_TICKS) {
  n++;
  const o = opts.anchors[String(t)], a = A[idx(t)], prev = A[idx(t) - 1], next = A[idx(t) + 1];
  const ev = chron.find((e) => e.tick === t);
  push(`\n<div style="break-after:page"></div>\n\n## 3.${n} Anchor t${t}: ${o.title}\n`);
  push(`**Proposed:** ${model.format(t, 'date').replace(', 1863', '')}, ${hm(model.tickToMinutes(t) % 1440)} local mean time, sigma ${a.sigma_min} min, accepted range ${a.range.join('-')}, status ${a.status}, flags ${a.flags.join(' ')}. Neighbours: t${prev.tick} ${prev.label} (${prev.t.slice(11)}) and t${next.tick} ${next.label} (${next.t.slice(11)}). **State: proposed.**\n`);
  push(`**The question.** ${o.question}\n`);
  push(`**What the site says at this tick today.** ${ev ? `Event card label "${ev.time}" (${ev.significance}): ${ev.event.slice(0, 200)}${ev.event.length > 200 ? '...' : ''}` : 'no chronology event at this tick'}. The typed claims near it:\n`);
  const near = other.filter((r) => Math.abs(+r.site_tick - t) <= 4 && r.claimed_or_real_time);
  push(near.length ? mdTable(['kind', 'name', 'tick', 'claim', 'proposed clock at that tick'], near.map((r) => [r.kind, r.name, r.site_tick, r.site_claim, r.proposed_clock_at_tick])) : '_none within 4 ticks_');
  push(`\n**Evidence read** (rows of \`docs/plan/data/time-facts.csv\`; source keys as printed there; SS = Stone Sentinels, an uncited compilation; SRCH = a web-search summary, page not opened; LIT = recalled, not re-verified):\n`);
  push(mdTable(['row', 'date', 'range', 'best', 'conf', 'tag', 'sources', 'event', 'disagreement notes'], o.facts.map((id) => { const f = facts[id]; return [id, f.date_1863, `${f.real_start}-${f.real_end}`, f.real_best, f.confidence, f.verification_tag, f.sources, f.event.slice(0, 110), f.disagreements_notes.slice(0, 260)]; })));
  if (o.register.length) push(`\n**Disagreement register** (time-facts section 4):\n\n` + mdTable(['#', 'topic', 'readings', 'specialist\'s suggested handling'], o.register.map((k) => [k, register[k].topic, register[k].readings, register[k].handling])));
  push(`\n**Options.** Each is a reading of a source the specialist consulted; you may supply another time. "Clock" columns show the model's clock at sample ticks under that option (5-minute rounding); "slope" is minutes per tick on either side of the anchor.\n`);
  const baseDate = a.t.slice(0, 10);
  const samples = [prev.tick, Math.round((prev.tick + t) / 2), t, Math.round((t + next.tick) / 2), next.tick];
  const rows = [];
  const variants = o.options.map((op) => ({ op, v: op.default ? { ok: true, model, kin: defKin } : variant(t, `${baseDate}T${op.time}`) }));
  for (const { op, v } of variants) {
    if (!v.ok) { rows.push([op.id + (op.default ? ' (proposed)' : ''), op.time, 'INVALID', v.errors.join('; ').slice(0, 200), '', '', op.basis]); continue; }
    const mm = v.model, s1 = (mm.tickToMinutes(t) - mm.tickToMinutes(prev.tick)) / (t - prev.tick), s2 = (mm.tickToMinutes(next.tick) - mm.tickToMinutes(t)) / (next.tick - t), ins = inSample(mm);
    rows.push([op.id + (op.default ? ' (proposed)' : ''), op.time, `${s1.toFixed(1)} / ${s2.toFixed(1)}`, samples.map((x) => `t${x} ${clk(mm, x)}`).join('; '), `${r1(ins.mean)} (${ins.w30}/${matched.length})`, v.kin.proposed.length, op.basis]);
  }
  push(mdTable(['option', 'time', 'slope before / after (min per tick)', 'clock at sample ticks', 'all-102 in-sample mean abs error, min (within 30)', 'keyframe pairs over the speed caps', 'basis'], rows));
  // affected events
  const lo = prev.tick, hi = next.tick, affected = matched.filter((r) => r.tick > lo && r.tick < hi);
  if (affected.length) {
    push(`\n**Chronology events inside the two affected segments (t${lo}-${hi})**: the clock each option gives them against the specialist's real best time (residual = real minus clock, minutes; the events were used to choose the current anchors, so the proposed column flatters the proposal):\n`);
    const cols = variants.filter((x) => x.v.ok);
    push(mdTable(['tick', 'class', 'real best', ...cols.map((x) => 'option ' + x.op.id + (x.op.default ? ' (proposed)' : ''))], affected.map((r) => [r.tick, r.cls, `${hm(r.real % 1440)}`, ...cols.map((x) => Math.round(r.real - x.v.model.tickToMinutes(r.tick)))])));
    push(`\nMean abs residual on these ${affected.length} events: ` + variants.filter((x) => x.v.ok).map((x) => `option ${x.op.id} ${r1(mean(affected.map((r) => Math.abs(r.real - x.v.model.tickToMinutes(r.tick)))))} min`).join('; ') + '.');
  }
  push(`\n**Note.** ${o.note}\n`);
  push(`**Sources not yet read that would settle it:** ${o.read.join('; ')}.\n`);
  push(`**Decision record** (the historian fills this in; it becomes one line of \`decisions.jsonl\`; the developer regenerates the anchors and the golden table and bumps \`dv\`):

\`\`\`json
{ "id": "D-____", "subject": "anchor t${t}", "chosen": "option ___  or  ____-__-__T__:__", "range": ["__:__", "__:__"], "display": "about h:mm | between about h:mm and h:mm",
  "citations": [{ "work": "", "edition": "", "page": "", "kind": "primary | scholarship | compilation" }],
  "reviewer": "", "second_reader": "", "at": "____-__-__", "state": "reviewed | contested | deferred" }
\`\`\`
`);
}

// ---------------------------------------------------------------- spot checks and owner items
push(`\n<div style="break-after:page"></div>\n\n## 4. Spot-check list for the other anchors\n`);
push(`Every S and M anchor below is a reading of the fact rows in \`time-facts.csv\`; the flags say why it is weak. Ranges are the union of the linked rows.\n`);
const weak = A.filter((a) => a.status !== 'R' && a.status !== 'D' && a.flags.length);
push(mdTable(['tick', 'time', 'event', 'why it is on the list', 'range', 'sources as printed', 'evidence text'], weak.map((a) => [a.tick, a.t.slice(11), a.label, a.flags.map((f) => ({ M: 'S anchor on an M-confidence row', E: 'S anchor failing the evidence rule (needs one Official Records report or two strong families)', W: 'no strong source family', C: 'circular (from the site\'s own label)' })[f]).join('; '), a.range.join('-'), a.sources.join(', '), a.evidence])));
push(`\nThe anchors that pass the mechanical checks (t${A.filter((a) => !a.flags.length).map((a) => a.tick).join(', t')}) still rest on the specialist's reading of secondary sources; a spot check of any of them is welcome.\n`);
push(`\n## 5. For the owner: design anchors and the circular one\n`);
push(mdTable(['tick', 'time', 'what it is', 'what signing means'], [100, 226, 675, 5].map((t) => { const a = A[idx(t)]; return [t, a.t.slice(5).replace('T', ' '), opts.design_and_circular[String(t)], t === 5 ? 'keep as a design-class anchor with sigma 30, or drop it (then t1 to t12 is one 10.3 min/tick segment)' : 'accept the convention (local mean time, first light at 04:30) and the solar times; regenerated from the NOAA algorithm, not an almanac']; })));
push(`\n## 6. What a decision changes on the site\n
- **Nothing changes until an anchor is \`signed\`.** Until then every time is printed with "about" and the clock popover says the time is unreviewed. Only a signed anchor with sigma under 10 minutes may drop the word (t12 and t518 are the only two candidates).
- A changed anchor time changes the clock for every tick in its two neighbouring segments and bumps \`dv\`. Bookmarks and links keep meaning "that frame"; where a moment is re-ticked, only a link that carries the moment id follows it.
- Sensitivity, computed above: each option's slopes, the clock at sample ticks and the residuals of the events inside the segments. A historian's choice that makes a slope leave 0.75-60 minutes per tick, or breaks the strict order with a neighbour, is rejected by the validator with the message printed in the INVALID row.

## 7. Provenance and limits

- Facts, ranges, confidence and source keys: \`docs/plan/data/time-facts.csv\` (129 rows; H/M/L 18/66/45; 45 rows are confidence L). The register: \`docs/plan/specialists/time-facts.md\` section 4 (33 disagreements).
- Only seven NPS-hosted Official Records reports were read (Doubleday, Hall, Wainwright, Longstreet, Work, Cabell, Hodges). Wikipedia was read as raw wikitext; Stone Sentinels, The History Junkie and Civil War Cycling are compilations of low authority.
- Independent figures: in-sample mean absolute error ${r1(defIn.mean)} min over the 102 matched events (${defIn.w30}/102 within 30 min); off-anchor 28.8 min; leave-one-out RMS 43.8 min over 29 interior anchors. See \`docs/editorial/time-audit.md\`.
- Rights: publish facts, ranges and source keys, not paragraphs (Wikipedia text is CC BY-SA; ABT, HistoryNet and Stone Sentinels are copyrighted; NPS Official Records text is public domain).
`);

const text = out.join('\n') + '\n';
const wrote = writeIfChanged(P('docs', 'editorial', 'anchor-review-packet.md'), text);
console.log(`docs/editorial/anchor-review-packet.md ${wrote ? 'written' : 'unchanged'} (${text.length} bytes, ${REVIEW_TICKS.length} R-anchor pages)`);

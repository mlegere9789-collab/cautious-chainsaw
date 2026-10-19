#!/usr/bin/env node
// The 27 content defects of the time plan (docs/editorial/time-audit.md section 4: 4 WRONG-DAY, 12 MISORDERED, 9 COMPOSITE, 2 UNVERIFIED-QUOTE events) checked against built trees.
// A clock cannot fix them (an event sits on the wrong frame, or one card tells several events); what a tree can show is whether the event now sits on a frame whose corrected
// clock agrees with the time the sources give it. The CLOCK group changes no chronology file (the data group owns them), so on a tree with CLOCK alone the answer is "open" by
// construction; on a tree with the data group (re-ticked, re-worded events) most are closed. Both are printed, nothing is hidden.
//
//   node tools/t0/clock/defect-audit.mjs [--clock tmp/clock-integrate/clock-R1c/dist] [--stack tmp/clock-integrate/all-R1c/dist] [--out tools/t0/clock/DEFECTS-27.md]
//
// How a defect is matched: `rx` is a regular expression over the event text of the tree; the first event that matches (and, when several do, the one nearest to the sourced
// frame) is "the event". `target` is the frame the time plan suggests ("about tN": the frame whose corrected clock equals the time the sources give); the event is
// "placed" when its frame's corrected clock is within max(60 min, twice the uncertainty bound) of the clock of the target frame. WRONG-DAY and quote items use their own text test.
// The sourced times are the time plan's (R-ids of docs/plan/specialists/time-facts.md), not new research; where the adjudicated anchors (docs/time/ANCHORS-FINAL.md) cover the event
// they are the arbiter of the frame.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeOracle } from './oracle.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const O = makeOracle();
const TREES = [['R1c + CLOCK', path.resolve(ROOT, opt('clock', 'tmp/clock-integrate/clock-R1c/dist'))], ['R1c + CLOCK + MON + DATA', path.resolve(ROOT, opt('stack', 'tmp/clock-integrate/all-R1c/dist'))]];
const OUT = opt('out', null);

const D = [
  // class, old frame, what the old card said, sourced time (time plan), rx, target frame
  ['WRONG-DAY', 8, 'Hill lets Heth advance (5:35am)', 'June 30 evening, not July 1 (LIT, unverified)', /Heth.{0,40}on the road/i, null, 'text:June 30'],
  ['WRONG-DAY', 360, 'Lee and Longstreet meet (3:20pm)', 'July 3 about 04:30 (R090)', /Lee and Longstreet meet/i, 451],
  ['WRONG-DAY', 380, 'Alexander positions guns (4:20pm)', 'July 3 10:00-12:30 (R099)', /Alexander and the other artillery officers post/i, 516],
  ['WRONG-DAY', 420, 'Pickett behind Seminary Ridge (6:20pm)', 'July 3 morning, arrival about 9 AM (R094)', /Pickett.s three Virginia brigades/i, 500],
  ['MISORDERED', 243, 'Hood completes the flanking march (6:25am)', 'about 3:50 PM July 2 (R052-R077)', /McLaws.s division gets into position/i, 255],
  ['MISORDERED', 273, '16th Michigan wavers (8:55am)', 'about 5:25 PM July 2', /16th Michigan/i, 271],
  ['MISORDERED', 283, 'Kershaw in the Wheatfield (9:45am)', 'about 5:35 PM July 2', /Kershaw/i, 272],
  ['MISORDERED', 298, 'Sickles wounded (11:00am)', 'about 6:15 PM July 2', /SICKLES IS WOUNDED/i, 278],
  ['MISORDERED', 304, 'Wilcox halted (11:30am)', 'about 6:55 PM July 2', /Wilcox.s advance halted/i, 290],
  ['MISORDERED', 310, 'Stuart arrives (12:00pm)', 'July 2 12:30 (R047)', /Stuart.s command/i, 242],
  ['MISORDERED', 335, 'Willard charges Barksdale (1:55pm)', 'July 2 7:10 PM (R078)', /Willard/i, 302],
  ['MISORDERED', 400, 'Meade holds council of war (5:20pm)', 'July 2 9:30 PM (R084)', /council/i, 334],
  ['MISORDERED', 460, 'Colgrove charges (5:45am; V-022 7:30)', 'July 3 10:00-11:30 (R096; one source 6:00)', /COLGROVE.S CHARGE/i, 511],
  ['MISORDERED', 490, 'Johnson exhausted (7:35am)', 'July 3 10:30-noon (R097)', /(Culp.s Hill|Johnson).{0,80}(ends|ended|ceas|silenc|retire|withdr)/i, 515],
  ['MISORDERED', 560, 'East Cavalry Field (12:55pm, after the Angle)', 'July 3 1:30 PM (R119)', /EAST CAVALRY FIELD/i, 522],
  ['MISORDERED', 563, "Custer's charge (1:10pm, after the Angle)", 'July 3 3:00 PM (R120)', /CUSTER.S CHARGE/i, 538],
  ['COMPOSITE', 50, 'Howard, XI Corps and Barlow in one card', 'R015, R020, R023', null, null, 'split:Howard|XI Corps|Barlow'],
  ['COMPOSITE', 95, 'Birney, II Corps and Newton in one card', 'R040 20:00', null, null, 'split:Birney|Hancock|Newton'],
  ['COMPOSITE', 100, 'nightfall, Meade at ~11pm, council in one card', 'R042 about 1:00 AM, R043', null, null, 'split:nightfall|Meade|council'],
  ['COMPOSITE', 226, 'dawn, reconnaissance and orders in one card', 'R044, R045', null, null, 'split:hold their positions|reconnoit|orders'],
  ['COMPOSITE', 270, 'Vincent, Weed and O\'Rorke in one card', 'R061-R065', null, null, 'split:Vincent|Weed|O.Rorke'],
  ['COMPOSITE', 278, 'Kershaw and Barksdale in one card', 'R062, R069, R071', null, null, 'split:Kershaw|Barksdale'],
  ['COMPOSITE', 440, "Culp's lines and Hunt's order in one card", 'R099, R103, R105', null, null, 'split:dig in|lower works|Hunt'],
  ['COMPOSITE', 516, 'guns and two notes in one card', 'R127, R128-R130', null, null, 'split:post the batteries|writes'],
  ['COMPOSITE', 620, 'Lee council, Imboden and wagons in one card', 'R105, R127', null, null, 'split:retreat|Imboden|wagon'],
  ['UNVERIFIED-QUOTE', 525, '"For God\'s sake come quick" (first message)', 'R103 1:25 PM first note, R105 1:35 PM second', /For God.s sake/i, null, 'quote:come quick'],
  ['UNVERIFIED-QUOTE', 530, '"I would not make the charge now" (no source found)', 'may garble a Longstreet-to-Alexander note [U]', /would not make the charge/i, null, 'quote:would not make'],
];

const load = (root) => { const ev = []; for (const d of [1, 2, 3]) { const f = path.join(root, 'data', `chronology_day${d}.json`); for (const e of JSON.parse(fs.readFileSync(f, 'utf8')).events || []) ev.push({ ...e, day: d }); } return ev; };
const short = (e) => `t${e.tick} ${O.fmt(e.tick, 'time')}: ${String(e.event).replace(/\s+/g, ' ').slice(0, 70)}`;
function judge(row, ev) {
  const [cls, , , , rx, target, mode] = row;
  const txt = (e) => `${e.event} ${e.narrative || ''}`;
  if (mode && mode.startsWith('split:')) {
    const parts = mode.slice(6).split('|').map((p) => new RegExp(p, 'i'));
    const where = parts.map((p) => ev.filter((e) => p.test(e.event)).map((e) => e.tick));
    const owners = parts.map((p) => new Set(ev.filter((e) => p.test(e.event)).map((e) => `${e.tick}:${e.event.slice(0, 20)}`)));
    const together = ev.filter((e) => parts.filter((p) => p.test(e.event)).length >= Math.min(3, parts.length));
    return { verdict: together.length ? 'open' : (where.every((w) => w.length) ? 'closed' : 'review'), detail: together.length ? `still one card: ${short(together[0])}` : `separate events at frames ${where.map((w) => w.slice(0, 3).join('/') || 'none').join(' ; ')}` };
  }
  if (mode === 'text:June 30') {
    const e = ev.find((x) => rx.test(x.event)); if (!e) return { verdict: 'review', detail: 'the event is gone' };
    return { verdict: /June 30/.test(txt(e)) ? 'closed' : 'open', detail: short(e) };
  }
  if (mode && mode.startsWith('quote:')) {
    const q = mode.slice(6); const e = ev.find((x) => rx.test(txt(x)));
    if (!e) return { verdict: 'closed', detail: `the unsourced wording "${q}" is not in the chronology any more` };
    const cited = /\b\d{1,2}:\d{2}\s?(a|p)\.?m|OR 27|Alexander wr/i.test(txt(e));
    return { verdict: cited ? 'review' : 'open', detail: `${short(e)} (${cited ? 'carries a clock or a citation; the quotation needs the historian' : 'no clock, no citation'})` };
  }
  const cand = ev.filter((e) => rx.test(txt(e)));
  if (!cand.length) return { verdict: 'review', detail: 'no event matches (removed or re-worded beyond the match)' };
  const tgt = O.minutes(target), tol = Math.max(60, 2 * O.uncertaintyMin(target));
  cand.sort((a, b) => Math.abs(O.minutes(a.tick) - tgt) - Math.abs(O.minutes(b.tick) - tgt));
  const e = cand[0], d = Math.round(O.minutes(e.tick) - tgt);
  return { verdict: Math.abs(d) <= tol ? 'closed' : 'open', detail: `${short(e)}  [target t${target} ${O.fmt(target, 'time')}, off by ${d} min, tolerance ${Math.round(tol)}]` };
}

const results = TREES.map(([label, dir]) => { const ev = load(dir); return { label, n: ev.length, rows: D.map((r) => judge(r, ev)) }; });
let md = `# The 27 content defects of the time plan, checked against built trees\n\nGenerated by \`node tools/t0/clock/defect-audit.mjs\`. Source of the 27: docs/editorial/time-audit.md section 4 (4 WRONG-DAY, 12 MISORDERED, 9 COMPOSITE, 2 UNVERIFIED-QUOTE events); the sourced times are the time plan's, the frames are judged by the corrected clock (data-src/time/time_anchors.json).\n\n` +
  `A clock cannot move an event: the CLOCK group changes **no chronology file** (the data group owns them), so on a tree with CLOCK alone these stay as they were (the clock of the card is now right for the frame it sits on, which makes the misplacement visible). On the tree with the data group (re-ticked, re-worded, split events) the table shows what closed.\n\n`;
for (const r of results) {
  const c = { closed: 0, open: 0, review: 0 }; r.rows.forEach((x) => c[x.verdict]++);
  md += `* **${r.label}** (${r.n} chronology events): ${c.closed} closed, ${c.open} open, ${c.review} need a person (matched by words, so a re-worded event may escape the match).\n`;
}
md += `\n| class | old frame | the old card | sourced time | ${results.map((r) => r.label).join(' | ')} |\n|---|---|---|---|${results.map(() => '---|').join('')}\n`;
D.forEach((row, i) => { md += `| ${row[0]} | t${row[1]} | ${row[2].replace(/\|/g, '/')} | ${row[3].replace(/\|/g, '/')} | ${results.map((r) => `**${r.rows[i].verdict}**: ${r.rows[i].detail.replace(/\|/g, '/')}`).join(' | ')} |\n`; });
md += `\nOpen on the tree with the data group are the owners' to settle with the sources (the table names the frame, the clock and the distance); this tool never edits data.\n`;
if (OUT) { fs.writeFileSync(path.resolve(ROOT, OUT), md); console.log('wrote ' + OUT); }
for (const r of results) { const c = { closed: 0, open: 0, review: 0 }; r.rows.forEach((x) => c[x.verdict]++); console.log(`${r.label}: closed ${c.closed}, open ${c.open}, review ${c.review}`); }

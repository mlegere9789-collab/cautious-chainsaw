#!/usr/bin/env node
// time-evidence.mjs - the time-evidence table: for each of the site's 137 chronology events, the clock-time CLAIMS the Official Records make about it (who said it, in what rank, for which unit, when he wrote
// it, on which printed page and scan leaf), as PROPOSALS: a claim is attached to an event when it is about the same day and says the same kind of thing about the same unit or place. Nothing is decided here:
// the table is evidence for the time workstream (data-src/time is read nowhere and edited nowhere), with the testimony statistics it asked for (median, range) and an honest "no report time found".
//
//   node tools/historian/ingest/time-evidence.mjs [--claims historian-src/corpus/or27/time_claims.json] [--raw historian-src/raw/or27] [--out historian-src/corpus/time_evidence.json]
//
// Score of a claim for an event (the claim's day must be the event's day, read from the text: a date in the sentence, a day just named, the dispatch's dateline, or a day carried at most 1 sentence):
//   unit    4  the author IS the event's unit (its own report), or the sentence names the event's unit. A regiment of the same brigade, division or corps is not enough: every unit of the corps would match
//              every event of the corps, each about its own day (the first two versions of this table did that: about 15% of their best proposals were about the event, hand-checked on 40 and on 35)
//   place   3  the sentence names a place the event is at (the engine's own place records)
//   action  3  the sentence and the event's own words say the same kind of thing (assault / cannonade / arrival / retreat / casualty / capture), by word groups
//   same hour (tier F)  a part of the event's unit says the same kind of thing within 60 minutes of the site's own minute: a candidate that agrees with the model, listed apart (it is circular as testimony)
//   words   1  per distinctive word of the event's headline the sentence also holds (at most 2)
// A claim is a proposal at 5 or more; tier A at 9 or more (unit, action and place or two words), B at 7 (unit and action), C at 5. A claim whose time is more than 150 minutes from the site's own minute for the event is flagged
// `outlier` and never counts toward tier A or the testimony statistics (it stays listed: a real disagreement with the model is what the time workstream wants to see, but it is not a tier-A proposal).
// A claim with a clock but no minute (an hour without a meridiem) is kept apart.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tokenize, stem, STOP } from '../../../historian-src/core/text.js';
import { loadLinker } from './t1setup.mjs';
import { createOrLinker } from './link.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const COMMON = new Set(['union', 'confederate', 'division', 'brigade', 'corps', 'regiment', 'battery', 'army', 'general', 'colonel', 'major', 'captain', 'lieutenant', 'moved', 'order', 'orders', 'ordered', 'command', 'commanding', 'gettysburg', 'battle', 'enemy', 'troops', 'position', 'line', 'forward', 'artillery', 'infantry', 'cavalry', 'july', 'about', 'began', 'begin', 'with', 'from', 'that', 'this', 'were', 'which', 'their'].map(stem));
const words = (t) => [...new Set(tokenize(String(t || ''), { keepStop: false }).map(stem).filter((w) => w.length >= 5 && !COMMON.has(w) && !/^#/.test(w)))];
// the kind of thing a sentence says: a claim and an event agree when both hold a word of one group
const ACTIONS = [
  ['assault', 'attack', 'charge', 'advance', 'onset', 'counterattack', 'repulse', 'assail', 'storm'],
  ['cannonade', 'bombardment', 'artillery', 'guns', 'shell', 'shelling', 'firing', 'opened'],
  ['arrive', 'reach', 'arrival', 'came'],
  ['retreat', 'withdraw', 'withdrew', 'retire', 'collapse', 'broke', 'overwhelm', 'flank', 'routed'],
  ['wound', 'killed', 'mortally', 'fell', 'death', 'shot'],
  ['capture', 'surrender', 'prisoner', 'seize'],
  ['skirmish', 'picket', 'vedette', 'engage', 'engaged', 'fight'],
].map((g) => new Set(g.map(stem)));
const groupsOf = (stems) => ACTIONS.map((g, i) => (stems.some((s) => g.has(s)) ? i : -1)).filter((i) => i >= 0);
const median = (a) => { const s = a.slice().sort((x, y) => x - y); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };
const hm = (m) => `${Math.floor(m / 60) % 12 || 12}:${String(m % 60).padStart(2, '0')} ${m % 1440 < 720 ? 'AM' : 'PM'}`;
const OUTLIER_MIN = 150;

export async function buildTimeEvidence({ claimsFile, rawDir, out, kb = null, log = () => {} }) {
  const tbl = JSON.parse(fs.readFileSync(claimsFile, 'utf8'));
  const claims = tbl.rows.map((r) => Object.fromEntries(tbl.fields.map((f, i) => [f, r[i]])));
  const passages = new Map(); for (const l of fs.readFileSync(path.join(rawDir, 'passages.jsonl'), 'utf8').trim().split('\n')) { const p = JSON.parse(l); passages.set(p.id, p.text); }
  const T = loadLinker(); const L = createOrLinker({ idx: T.idx, link: T.link }); const R = T.idx.R;
  const byId = (id) => { for (const pre of ['', 'DIV:', 'BDE:', 'CORPS:', 'ARMY:', 'ART:', 'ABDE:']) if (T.idx.byId.has(pre + id)) return pre + id; return null; };
  const parents = (id) => { const r = T.idx.get(id); return r && r.par ? r.par : []; };
  // events and the model's own minute (read from the KB's baked clock, never from a tick)
  const events = T.site.chronology.map((e) => ({ id: e.id, day: e.day, title: String(e.event || ''), text: `${e.event} ${e.narrative || ''}`, location: e.location, units: (e.units_involved || []).map(byId).filter(Boolean), significance: e.significance }));
  const clockEv = kb && kb.facts && kb.facts.clock ? kb.facts.clock.ev : {};
  // only claims whose day is read from the text (a date in the sentence, a day just named, the dispatch's dateline) or carried one sentence are proposals: a day carried across a long passage is a guess
  const dayConfident = (c) => c.day_basis === 'same' || c.day_basis === 'rel' || c.day_basis === 'dateline' || (c.day_basis === 'carried' && c.day_age <= 1);
  const usable = claims.filter((c) => c.day && /^1863-07-0[1-3]$/.test(c.day) && c.min !== null && c.evidence !== undefined && dayConfident(c));
  // per-claim features, computed once: the sentence's words, its places, the units it names, the units it is written for
  const feat = new Map();
  usable.forEach((c, i) => {
    const text = (passages.get(c.passage) || '').slice(c.ss, c.se);
    const ms = L.mentionsOf(text, { side: c.side });
    const places = new Set(ms.filter((m) => m.tier !== 'C' && /^(?:terrain|road|structure|feature)$/.test(m.kind)).map((m) => R[m.i].id));
    const named = new Set(ms.filter((m) => m.tier !== 'C' && /^(?:regiment|brigade|division|corps|artillery|artillery-unit)$/.test(m.kind)).map((m) => R[m.i].id));
    const own = new Set((c.units || []).filter((u) => !/^P:/.test(u)));
    const stems = tokenize(text).map(stem);
    feat.set(i, { text, places, named, own, stems, groups: groupsOf(stems), words: new Set(words(text)) });
  });
  const out_events = {}; const attached = new Set();
  let withClaims = 0;
  for (const E of events) {
    const eplaces = new Set(); for (const m of L.mentionsOf(E.location || '', {})) if (/^(?:terrain|road|structure|feature)$/.test(m.kind)) eplaces.add(R[m.i].id);
    const eunits = new Set(E.units); const ew = new Set(words(E.title)); const egroups = groupsOf(tokenize(E.title).map(stem));
    const model = clockEv[E.id] ? { minute_of_day: clockEv[E.id][0] % 1440, sigma_min: clockEv[E.id][1], range: clockEv[E.id][3] || null } : null;
    const rows = [];
    usable.forEach((c, i) => {
      if (+c.day.slice(9) !== E.day) return;
      const f = feat.get(i);
      // the sentence names the event's unit, or the author IS the event's unit (its own report): a regiment of the same brigade or corps is not enough, it is about its own day
      const unitHit = [...f.named].some((u) => eunits.has(u)) || [...f.own].some((u) => eunits.has(u));
      const famHit = unitHit || [...f.own].some((u) => parents(u).some((a) => eunits.has(a)));                                  // a part of the event's unit: it reports its own day
      const placeHit = [...eplaces].some((pid) => f.places.has(pid));
      const actionHit = egroups.some((g) => f.groups.includes(g));
      let shared = 0; for (const w of ew) if (f.words.has(w)) shared++;
      const score = (unitHit ? 4 : 0) + (placeHit ? 3 : 0) + (actionHit ? 3 : 0) + Math.min(2, shared);
      const delta = model && c.min !== null ? Math.abs((c.min % 1440) - model.minute_of_day) : null;
      const sameHour = !!(famHit && actionHit && delta !== null && delta <= 60 && !unitHit);
      if (score >= 5 || sameHour) rows.push({ c, i, score, unitHit, famHit, placeHit, actionHit, shared, sameHour, outlier: delta !== null && delta > OUTLIER_MIN });
    });
    const tierOf = (r) => (r.score >= 9 && !r.outlier ? 'A' : r.score >= 7 && !r.outlier ? 'B' : r.sameHour ? 'F' : 'C');
    const rank = { A: 0, B: 1, F: 2, C: 3 };
    rows.sort((a, b) => rank[tierOf(a)] - rank[tierOf(b)] || b.score - a.score || a.c.min - b.c.min);
    const top = rows.slice(0, 14);
    top.forEach((r) => attached.add(r.i));
    const clockOnly = (r) => r.c.kind !== 'sun' && r.c.kind !== 'midnight';
    const mins = rows.filter((r) => ['A', 'B'].includes(tierOf(r)) && clockOnly(r)).map((r) => r.c.min);
    const cmins = rows.filter((r) => tierOf(r) === 'F' && clockOnly(r)).map((r) => r.c.min);
    if (rows.length) withClaims++;
    out_events[E.id] = {
      day: E.day, location: E.location, units: E.units.map((u) => T.idx.get(u).label), significance: E.significance, model,
      proposals: rows.length, tiers: { A: rows.filter((r) => tierOf(r) === 'A').length, B: rows.filter((r) => tierOf(r) === 'B').length, F: rows.filter((r) => tierOf(r) === 'F').length, C: rows.filter((r) => tierOf(r) === 'C').length }, outliers: rows.filter((r) => r.outlier).length,
      summary: mins.length ? { n: mins.length, median_min: median(mins), median_text: hm(Math.round(median(mins))), earliest: Math.min(...mins), latest: Math.max(...mins), range_text: `${hm(Math.min(...mins))} to ${hm(Math.max(...mins))}`, delta_vs_model_min: model ? Math.round(median(mins) - model.minute_of_day) : null, note: "testimony statistics over tier A and B proposals (the unit itself, or a sentence naming it) within 150 minutes of the site's own minute: reports of one event differ; this is the median of what authors wrote, not the time it happened" } : null,
      claims: top.map((r) => ({ passage: r.c.passage, s: r.c.s, e: r.c.e, text: r.c.text, min: r.c.min, tol: r.c.tol, mod: r.c.mod, kind: r.c.kind, evidence: r.c.evidence, author: r.c.author, rank_class: r.c.rank_class, unit: r.c.unit, side: r.c.side, written: r.c.written, lag_days: r.c.lag_days, page: r.c.page, leaf: r.c.leaf, day_basis: r.c.day_basis, score: r.score, tier: tierOf(r), outlier: r.outlier, why: [r.unitHit ? 'unit' : null, r.placeHit ? 'place' : null, r.actionHit ? 'action' : null, r.shared ? `${r.shared} words` : null].filter(Boolean).join(' + '), sentence: feat.get(r.i).text.replace(/\s+/g, ' ').trim().slice(0, 400) })),
      corroboration: cmins.length ? { n: cmins.length, median_text: hm(Math.round(median(cmins))), range_text: `${hm(Math.min(...cmins))} to ${hm(Math.max(...cmins))}`, note: "tier F: parts of the event's unit saying the same kind of thing within an hour of the site's own minute; about 57% of a hand-checked sample of 30 were about the event; the filter uses the site's minute, so this corroborates it and cannot test it" } : null,
      status: rows.length ? (mins.length ? 'reports found' : cmins.length ? 'only same-hour candidates' : 'only weak proposals') : 'no report time found',
    };
  }
  const ambiguous = claims.filter((c) => c.min === null && c.cand && c.day && /^1863-07-0[1-3]$/.test(c.day)).length;
  const doc = {
    schema: 'gtbg/time-evidence/1', corpus: 'Official Records, Series I, vol. 27, parts 1-3 (Union and Confederate reports; Part 3 dispatches)', status: 'PROPOSALS: nothing here is shown to a reader or applied to the time model; the time workstream decides',
    method: 'tools/historian/ingest/time-evidence.mjs (header comment)', counts: {
      events: events.length, events_with_proposals: withClaims, events_with_reports_found: Object.values(out_events).filter((e) => e.status === 'reports found').length, events_none: Object.values(out_events).filter((e) => e.status === 'no report time found').length,
      claims_total: claims.length, claims_on_battle_days_with_minute_and_confident_day: usable.length, claims_attached_to_some_event: attached.size, claims_ambiguous_meridiem_on_battle_days: ambiguous,
    }, events: out_events,
  };
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(doc));
  log(JSON.stringify(doc.counts));
  return doc;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2); const arg = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
  const { openKB, nodeFetcher } = await import('../../../historian-src/core/kb.js');
  const hx = path.resolve(root, arg('hx', 'historian-src/dist/hx'));
  const kb = await openKB(await nodeFetcher(hx));
  await buildTimeEvidence({ claimsFile: path.resolve(root, arg('claims', 'historian-src/corpus/or27/time_claims.json')), rawDir: path.resolve(root, arg('raw', 'historian-src/raw/or27')), out: path.resolve(root, arg('out', 'historian-src/corpus/time_evidence.json')), kb, log: console.log });
}

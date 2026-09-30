// atime.js - "what was going on at 3pm on July 2" answered from the time model's clock, never from a day summary.
// The baked clock (facts.clock, see tools/historian/lib/clock.mjs) gives every chronology event a real time of day. A clock question is answered with the events NEAR that time,
// each with its own approximate time, followed by an explicit statement of what was left out (the entry before the stretch and the entry after it). Earlier and later events are
// never shown as if they were happening then, which is what the old day summary did.
// Nothing is generated: every sentence is a template slot, an event's own text, or a limitation. The clock is a PROPOSAL until a historian signs it off; the answer says so.
import { helpers, lead, note } from './compose.js';
import { DAY_NAME, ucfirst, withThe, personLabel } from './format.js';
import { sentencesOf, stem, tokenize } from './text.js';
import { DAY, hm12, dateOf, modOf } from './clock.js';

const SIG_W = { critical: 4, high: 3, medium: 2, low: 1 };
const PRE = 60, POST = 45;                       // minutes before / after a clock time that still count as "around then"
const PRE_X = 180, POST_X = 90;                  // the wider stretch searched for a named unit's, person's or place's entries
const NEAR = 20;                                 // a named subject whose nearest entry is further than this from the asked time is reported as "the nearest", not as "at"
const memo = new WeakMap();

/** chronology events with a baked clock, in time order: [{ r, m, sigma, flags, range }] */
export function clockEvents(kb) {
  if (memo.has(kb)) return memo.get(kb);
  const CK = kb.facts.clock; const out = [];
  if (CK) for (const r of kb.idx.R) { const e = r.k === 'chronology' && CK.ev[r.id]; if (e) out.push({ r, m: e[0], sigma: e[1], flags: e[2], range: e[3] || null }); }
  out.sort((a, b) => a.m - b.m || (a.r.id < b.r.id ? -1 : 1));
  memo.set(kb, out);
  return out;
}

/** "about 3:15 PM"; where the anchor is contested, "about 2:30 PM (sources put it between about 12:00 and 3:30 PM)"; with the date when it is not the asked one */
export function clockLabel(e, askedDate = null) {
  const d = dateOf(e.m);
  const at = `about ${hm12(modOf(e.m))}`;
  const base = (e.flags & 2) && e.range ? `${at} (sources put it ${e.range})` : at;
  return askedDate !== null && d !== askedDate ? `${base} on ${DAY_NAME[d] || `July ${d}`}` : base;
}

/** just the time, for naming a neighbour: "about 6:00 PM" (with the date when it is not the asked one) */
export function clockAt(e, askedDate = null) {
  const d = dateOf(e.m); const at = `about ${hm12(modOf(e.m))}`;
  return askedDate !== null && d !== askedDate ? `${at} on ${DAY_NAME[d] || `July ${d}`}` : at;
}

/** a short name for an event: its heading (already cased in the title) or the first words of its text */
const shortTitle = (r) => { const t = String(r.title || '').replace(/[.…\s]+$/, ''); return t.length > 72 ? t.slice(0, 70).replace(/\s+\S*$/, '') + '…' : t; };

/** the event's own words: its heading and first sentence, or (no heading) its first sentence; capped at a word boundary */
function blurb(r) {
  const a = r.attrs || {}; const raw = String(a.text || '');
  const headed = /^[A-Z0-9'’ -]{6,}[.:]\s+/.test(raw);
  const body = raw.replace(/^[A-Z0-9'’ -]{6,}[.:]\s+/, '');
  const sents = sentencesOf(body);
  const cap = (s) => (s.length > 230 ? s.slice(0, 228).replace(/\s+\S*$/, '') + '…' : s);
  if (headed) { const first = sents[0] ? cap(sents[0]) : ''; return first ? `${ucfirst(r.title.replace(/[.\s]+$/, ''))}: ${first}` : ucfirst(r.title); }
  return cap(sents[0] || r.title);
}

/** "noon" and "midnight" read better than 12:00 PM and 12:00 AM */
const clockWords = (mod) => (mod === 720 ? 'noon' : mod === 0 || mod === DAY ? 'midnight' : hm12(mod));
const stems = (s) => tokenize(String(s || ''), { keepStop: false }).map(stem).filter((t) => !/^#/.test(t) && t.length > 2);
const theLabel = (l) => (/^The /.test(l) ? l.replace(/^The /, 'the ') : withThe(l));

export function clockAnswer(kb, S) {
  const CK = kb.facts.clock; const c = S.clock;
  if (!CK || !c || !(c.kind === 'point' || c.kind === 'window')) return null;
  const date = c.day;
  if (!(date >= 1 && date <= 3)) {
    return { mode: 'partial', limited: true, blocks: [lead([`The site’s chronology covers July 1 to 3, 1863, so it has no entry for ${date >= 4 && date <= 31 ? `July ${date}` : 'that date'}. Ask about a moment on one of those three days.`], []), note('clock-basis', 'The battle records on this site end on the evening of July 3.')], src: [] };
  }
  const evs = clockEvents(kb); if (!evs.length) return null;
  const base = (date - 1) * DAY, point = c.kind === 'point';
  const T = point ? base + c.mod : null;
  const from = point ? T - PRE : base + c.from, to = point ? T + POST : base + c.to;
  const inRange = (e, lo, hi) => e.m >= lo && e.m <= hi;

  // who or what the question is about: linked units (and the brigade, division and corps above them), a named commander (the units he led, and entries that name him), a named place
  const focusIds = new Set(); const focusNames = []; const personStems = new Set(); const placeStems = new Set();
  const addUnit = (u) => { if (!u) return; focusIds.add(u.id); for (const p of u.par || []) focusIds.add(p); };
  for (const u of S.units || []) { addUnit(u); focusNames.push(theLabel(u.label)); }
  for (const p of S.persons || []) {
    for (const ro of (p.attrs.roles || [])) if (ro.u) addUnit(kb.idx.get(ro.u));
    if (p.attrs.surname) for (const t of stems(p.attrs.surname)) personStems.add(t);
    if (!focusNames.length) focusNames.push(personLabel(p.attrs.rank, p.attrs.name));
  }
  for (const pl of S.places || []) for (const t of stems(pl.label)) placeStems.add(t);
  const hitsUnit = (e) => focusIds.size > 0 && (e.r.attrs.units || []).some((id) => focusIds.has(id));
  const hitsPerson = (e) => personStems.size > 0 && stems(`${e.r.title} ${e.r.attrs.text || ''}`).some((t) => personStems.has(t));
  const hitsPlace = (e) => placeStems.size > 0 && stems(`${e.r.attrs.location || ''} ${e.r.title} ${e.r.attrs.text || ''}`).some((t) => placeStems.has(t));
  const focusOn = focusIds.size > 0 || personStems.size > 0 || placeStems.size > 0;
  const isFocus = (e) => hitsUnit(e) || hitsPerson(e) || hitsPlace(e);

  let pool = evs.filter((e) => inRange(e, from, to));
  const inWindow = pool.length;
  let focused = false, focusMissing = false;
  if (focusOn) {
    const wide = evs.filter((e) => inRange(e, point ? T - PRE_X : from, point ? T + POST_X : to) && isFocus(e));
    const near = pool.filter(isFocus);
    if (near.length) { pool = near; focused = true; }
    else if (wide.length) { pool = wide; focused = true; }
    else focusMissing = true;
  }
  const score = (e) => (SIG_W[e.r.attrs.sig] || 1) * (point ? 1 / (1 + Math.abs(e.m - T) / 40) : 1) * (hitsUnit(e) ? 2.5 : 1) * (hitsPerson(e) ? 2 : 1) * (hitsPlace(e) ? 1.8 : 1);
  const limit = point ? (focused ? 4 : 5) : 6;
  const picked = pool.slice().sort((a, b) => score(b) - score(a) || a.m - b.m).slice(0, limit).sort((a, b) => a.m - b.m || (a.r.id < b.r.id ? -1 : 1));

  const dayName = DAY_NAME[date];
  const when = point ? `${clockWords(c.mod)} on ${dayName}`
    : c.phase === 'dawn' || c.phase === 'dusk' ? `${c.phase} on ${dayName}` : c.phase ? `the ${c.phase} of ${dayName}` : `the stretch from ${hm12(c.from)} to ${hm12(c.to)} on ${dayName}`;
  const opener = c.phase === 'dawn' || c.phase === 'dusk' ? `At ${when}` : c.phase === 'night' ? `During ${when}` : c.phase ? `On ${when}` : `In ${when}`;
  const basis = CK.model && CK.model.signed
    ? 'Clock times come from the site’s reviewed timeline and are approximate.'
    : 'Clock times come from the site’s proposed revised timeline: they are approximate, a historian has not yet reviewed them, and sources differ on many of them.';

  // nothing recorded in the stretch: say so, and name the nearest entry on each side
  if (!picked.length) {
    const before = [...evs].reverse().find((e) => e.m < from), after = evs.find((e) => e.m > to);
    const bits = [];
    if (before) bits.push(`the last entry before it is “${shortTitle(before.r)}” (${clockAt(before, date)})`);
    if (after) bits.push(`the next is “${shortTitle(after.r)}” (${clockAt(after, date)})`);
    if (!bits.length) return null;
    const ids = [before, after].filter(Boolean).map((e) => e.r.id);
    return { mode: 'partial', limited: true, rankOverride: ids, blocks: [lead([`The site’s chronology has no entry ${point ? 'at' : 'in'} ${when}; ${bits.join(' and ')}.`], ids), note('clock-basis', basis)], src: ids };
  }

  const subject = focused && focusNames.length ? ` for ${focusNames.slice(0, 2).join(' and ')}${(S.units || []).length ? ` and the units above ${focusNames.length > 1 ? 'them' : 'it'}` : ''}`
    : focused && placeStems.size ? ` near ${theLabel((S.places[0] && S.places[0].label) || 'that place')}` : '';
  const gap = focused && point ? Math.min(...picked.map((e) => Math.abs(e.m - T))) : 0;
  const more = pool.length > picked.length || (!focused && inWindow > picked.length);
  let head;
  if (focusMissing) head = `The site’s chronology has no entry ${point ? 'around' : 'for'} ${when} that names ${focusNames.length ? focusNames.slice(0, 2).join(' or ') : 'that place'}; here is what it records ${point ? 'around then' : 'in that stretch'}, in order:`;
  else if (focused && point && gap > NEAR) head = `The site’s chronology has no entry${subject} at ${when}; the nearest ones are these, in order:`;
  else if (point) head = `Around ${when}${subject}, the site’s chronology places these events, in order:`;
  else head = `${opener}${subject}, the site’s chronology records ${more ? 'these main events' : 'these events'}, in order:`;
  const items = picked.map((e) => ({ txt: `${clockLabel(e, date)}: ${blurb(e.r)}`, ent: e.r.id }));
  const blocks = [lead([head], picked.map((e) => e.r.id)), { t: 'list', title: '', items, src: picked.map((e) => e.r.id) }];

  // the exclusions, stated: the last entry before the stretch and the first entry after it, and that lesser entries inside it are not listed
  // (for a named unit, person or place the neighbours are that subject's own entries; entries about other subjects are simply not part of it)
  const lo = focused ? picked[0].m : Math.min(from, picked[0].m), hi = focused ? picked[picked.length - 1].m : Math.max(to, picked[picked.length - 1].m);
  const own = focused ? evs.filter(isFocus) : evs;
  const before = [...own].reverse().find((e) => e.m < lo && !picked.includes(e)), after = own.find((e) => e.m > hi && !picked.includes(e));
  const ex = [];
  if (focused) ex.push('Entries that do not name it are not listed.');
  if (more && !focused) ex.push('Lesser entries inside that stretch are not listed.');
  if (before) ex.push(`Earlier entries are left out; the latest is “${shortTitle(before.r)}” (${clockAt(before, date)}).`);
  if (after) ex.push(`Later entries are left out because they had not happened yet; the next is “${shortTitle(after.r)}” (${clockAt(after, date)}).`);
  if (ex.length) blocks.push(note('clock-bounds', ex.join(' ')));
  blocks.push(note('clock-basis', basis));
  // ranking for retrieval metrics: the entries nearest the asked time first
  const ordered = (point ? picked.slice().sort((a, b) => Math.abs(a.m - T) - Math.abs(b.m - T)) : picked).map((e) => e.r.id);
  return { mode: 'answer', blocks, src: ordered.slice(0, 3), rankOverride: ordered, simpleOk: true };
}

/** "The site’s proposed revised timeline places this at about 4:00 PM on July 2." for a chronology event that has a baked clock, else null */
export function whenLine(kb, r) {
  const CK = kb.facts.clock; const e = CK && r && r.k === 'chronology' && CK.ev[r.id];
  if (!e) return null;
  const ev = { m: e[0], sigma: e[1], flags: e[2], range: e[3] || null }; const d = dateOf(ev.m);
  return `The site’s proposed revised timeline places this on ${DAY_NAME[d] || `July ${d}`} at ${clockLabel(ev, d)}.`;
}

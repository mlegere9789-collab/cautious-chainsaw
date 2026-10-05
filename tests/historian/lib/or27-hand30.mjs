// or27-hand30.mjs - run the 30 hand questions (tests/historian/or27-hand30.json) against an engine and score each against the behaviour it owes (see the file's _comment for the fields of `expect`).
//   scoreHand(item, answer, claimsOf)   { pass, reasons[] }
//   runHand(ask, items, claimsOf)       [{ id, class, q, pass, reasons, mode, quotes }]
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './data.mjs';

export const HAND30 = path.join(ROOT, 'tests/historian/or27-hand30.json');
export const loadHand30 = () => JSON.parse(fs.readFileSync(HAND30, 'utf8'));

/** the clock claims of the table, by passage id: for the question "are all the clocks inside this quote of day D" */
export function claimsIndex(file = path.join(ROOT, 'historian-src/corpus/or27/time_claims.json')) {
  const t = JSON.parse(fs.readFileSync(file, 'utf8')); const by = new Map();
  for (const r of t.rows) { const c = Object.fromEntries(t.fields.map((f, i) => [f, r[i]])); if (!by.has(c.passage)) by.set(c.passage, []); by.get(c.passage).push(c); }
  return (q) => (by.get(q.passage) || []).filter((c) => c.s >= q.s && c.e <= q.e);
}

const corpusQuotes = (a) => (a.blocks || []).filter((b) => b.t === 'quote' && /^or27-/.test(String(b.passage)));

export function scoreHand(item, a, claimsOf) {
  const E = item.expect || {}; const reasons = []; const qs = corpusQuotes(a); const text = String(a.text || '');
  const re = (s) => new RegExp(s);
  if (E.mode && a.mode !== E.mode) reasons.push(`mode ${a.mode}, wanted ${E.mode}`);
  if (E.quotes) { if (E.quotes.min !== undefined && qs.length < E.quotes.min) reasons.push(`${qs.length} corpus quote(s), wanted at least ${E.quotes.min}`); if (E.quotes.max !== undefined && qs.length > E.quotes.max) reasons.push(`${qs.length} corpus quote(s), wanted at most ${E.quotes.max}`); }
  for (const r of E.quote_any || []) if (!qs.some((b) => re(r).test(b.text))) reasons.push(`no quote matches /${r}/`);
  for (const r of E.quote_all || []) { const off = qs.filter((b) => !re(r).test(b.text)); if (off.length) reasons.push(`${off.length} quote(s) do not match /${r}/`); }
  for (const r of E.no_quote || []) { const bad = qs.filter((b) => re(r).test(b.text)); if (bad.length) reasons.push(`a quote matches /${r}/: ${JSON.stringify(bad[0].text.slice(0, 80))}`); }
  for (const r of E.text || []) if (!re(r).test(text)) reasons.push(`the text does not match /${r}/`);
  for (const r of E.not_text || []) if (re(r).test(text)) reasons.push(`the text matches /${r}/`);
  if (E.clock_day && claimsOf) {
    const days = new Map(); for (const b of qs) for (const c of claimsOf(b)) days.set(c.day, (days.get(c.day) || 0) + 1);
    const other = [...days.keys()].filter((d) => d !== E.clock_day);
    if (other.length) reasons.push(`clocks of other days are quoted: ${other.join(', ')}`);
    if (!days.has(E.clock_day)) reasons.push(`no quoted clock is of ${E.clock_day}`);
  }
  return { pass: !reasons.length, reasons };
}

export async function runHand(ask, items, claimsOf) {
  const out = [];
  for (const it of items) {
    let a, err = null; try { a = await ask(it.q); } catch (e) { err = e; }
    const r = err ? { pass: false, reasons: ['threw ' + (err.message || err)] } : scoreHand(it, a, claimsOf);
    out.push({ id: it.id, class: it.class, q: it.q, pass: r.pass, reasons: r.reasons, mode: a && a.mode, quotes: a ? corpusQuotes(a).length : 0 });
  }
  return out;
}

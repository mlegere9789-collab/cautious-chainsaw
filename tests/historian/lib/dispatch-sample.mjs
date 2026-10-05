// dispatch-sample.mjs - score a build of the Official Records corpus (Part 3) against the 100-document hand-checked sample (tests/historian/fixtures/or27-dispatch-sample.json).
//
// A build is a pair of directories: the passages the build writes (historian-src/raw/or27/passages.jsonl, git-ignored) and the dispatch table (historian-src/corpus/or27/dispatches.json). Each
// true dispatch of the sample is found in the build by the first words of its body (letters and digits only, whitespace and punctuation ignored); what is then asked of the document that holds it:
//   found       some document holds the body
//   isolated    the document holds no other dispatch's body of the sample (a merged document fails this for each of its dispatches)
//   clean_end   the document does not end with the header lines of the next dispatch (a labelled "dangling" line), ends with the dispatch's own last words when the label gives them, and does not open with the tail of the previous one (a labelled "not_start")
//   date, clock the table's date and clock are the dispatch's own (clock: the table's clock is null when the label has none)
//   place, to   the table's place / addressee holds the labelled word (not asked when the label has none)
//   signer      the table's signer is the labelled name; a labelled null means no person is named as the sender
// "all" = every check that applies. Reported as counts over the sample's 112 dispatches.
import fs from 'node:fs';
import path from 'node:path';

const alnum = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const anchor = (s, n = 60) => alnum(s).slice(0, n);
const tailOf = (s, n = 24) => alnum(s).slice(-n);

/** [{ id, text, row }] for every dispatch document of a build */
export function loadDispatchDocs(rawDir, tablesDir) {
  const by = new Map();
  for (const line of fs.readFileSync(path.join(rawDir, 'passages.jsonl'), 'utf8').split('\n')) {
    if (!line) continue; const p = JSON.parse(line); if (p.part !== 3) continue;
    if (!by.has(p.doc)) by.set(p.doc, []); by.get(p.doc).push(p);
  }
  const d = JSON.parse(fs.readFileSync(path.join(tablesDir, 'dispatches.json'), 'utf8'));
  const rows = new Map(d.rows.map((r) => [r[d.fields.indexOf('id')], Object.fromEntries(d.fields.map((f, i) => [f, r[i]]))]));
  return [...by].map(([id, ps]) => ({ id, text: ps.sort((a, b) => a.seq - b.seq).map((p) => p.text).join('\n\n'), row: rows.get(id) || {} }));
}

/** the sample's truths (flattened) */
export const truths = (fixture) => fixture.items.flatMap((it) => it.dispatches.map((t, k) => ({ ...t, n: it.n, k, before_id: it.before_id })));

export function scoreSample(fixture, docs) {
  const T = truths(fixture);
  const flat = docs.map((d) => ({ d, a: alnum(d.text) }));
  const res = { dispatches: T.length, found: 0, isolated: 0, clean_end: 0, date: 0, clock: 0, place: 0, place_asked: 0, to: 0, to_asked: 0, signer: 0, all: 0, fails: [] };
  const anchors = T.map((t) => anchor(t.body));
  for (const t of T) {
    const a = anchor(t.body); let hit = flat.filter((x) => x.a.includes(a));
    // a body that opens alike in several documents ("Dispatch received."): the one with the labelled date, then sender, then addressee
    if (hit.length > 1) { const sc = (x) => (x.d.row.written === t.date ? 4 : 0) + (t.signer && alnum(x.d.row.signer).includes(alnum(t.signer)) ? 2 : 0) + (t.to && alnum(x.d.row.addressee).includes(alnum(t.to)) ? 1 : 0); hit = hit.slice().sort((p, q) => sc(q) - sc(p)); }
    const why = [];
    if (!hit.length) { res.fails.push({ n: t.n, k: t.k, why: ['not found'] }); continue; }
    res.found++;
    const x = hit[0].d, text = hit[0].a;
    const others = anchors.filter((o, i) => text.includes(o) && !(T[i].n === t.n && T[i].k === t.k) && o !== a);
    const iso = others.length === 0; if (iso) res.isolated++; else why.push('merged with ' + others.length + ' other dispatch(es)');
    let end = true;
    if (t.dangling && text.endsWith(alnum(t.dangling))) end = false;
    if (t.tail && !text.endsWith(alnum(t.tail))) end = false;
    let begin = true; if (t.not_start && text.startsWith(alnum(t.not_start))) begin = false;                      // the title line of the previous signature does not open this document
    if (end && begin) res.clean_end++; else why.push(end ? 'start: ' + JSON.stringify(x.text.slice(0, 60)) : 'end: ' + JSON.stringify(x.text.slice(-60)));
    end = end && begin;
    const r = x.row; let ok = iso && end;
    const date = r.written === t.date; if (date) res.date++; else { ok = false; why.push(`date ${r.written} != ${t.date}`); }
    const clk = t.clock === null ? !r.clock : alnum(r.clock) === alnum(t.clock); if (clk) res.clock++; else { ok = false; why.push(`clock ${r.clock} != ${t.clock}`); }
    if (t.place) { res.place_asked++; if (alnum(r.place).includes(alnum(t.place)) || alnum(x.text.slice(0, 300)).includes(alnum(t.place)) && alnum(r.place).includes(alnum(t.place).slice(0, 5))) res.place++; else { ok = false; why.push(`place ${r.place} lacks ${t.place}`); } }
    if (t.to) { res.to_asked++; if (alnum(r.addressee).includes(alnum(t.to))) res.to++; else { ok = false; why.push(`to ${r.addressee} lacks ${t.to}`); } }
    const sg = t.signer === null ? !r.signer : alnum(r.signer).includes(alnum(t.signer)); if (sg) res.signer++; else { ok = false; why.push(`signer ${r.signer} != ${t.signer}`); }
    if (ok) res.all++; else res.fails.push({ n: t.n, k: t.k, id: x.id, why });
  }
  return res;
}

export const summary = (r) => `${r.dispatches} true dispatches: found ${r.found}, isolated ${r.isolated}, clean end ${r.clean_end}, date ${r.date}, clock ${r.clock}, place ${r.place}/${r.place_asked}, addressee ${r.to}/${r.to_asked}, signer ${r.signer}; every check ${r.all}`;

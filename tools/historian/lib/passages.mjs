// passages.mjs - the retrievable units (tier T2): vignette paragraphs, chronology events and commentary, succession notes, curated placement notes and
// the bundle prose (walkthrough stops, tour stops). Each passage gets sentence boundaries (sb), a citation, a licence block, entity links and any
// clock claims found in its text (informational: the runtime never shows a tick-derived clock, and quotes them only as the site's own wording).
import crypto from 'node:crypto';
import { tokenize, splitSentences, CLOCK_RE, normalizeWs, stem } from '../../../historian-src/core/text.js';
import { cleanProse, cleanShort } from './clean.mjs';

const dayOfTick = (t) => (t <= 225 ? 1 : t <= 450 ? 2 : 3);
const sha8 = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 8);

const PERIOD_TERMS = /\b(negro(es)?|colored (troops|soldiers|regiment)|darkies|contraband)\b/i; // hook for sens[]; the current site text has none

export function sentenceBounds(text) {
  const b = splitSentences(text).map((x) => x.s);
  return b.length ? b : [0];
}

function mkPassage({ doc, rec, seq, kind, text, cite, day = null, prior, subjects = [], related = [], persp = {} }) {
  const t = normalizeWs(text).length ? text.replace(/[ \t]+/g, ' ').trim() : '';
  return { doc, rec, seq, kind, text: t, cite, day, prior, subjects, related, persp };
}

/** Curated placement notes: only notes that survive the developer-note filter, deduplicated, and attached to a known unit. */
function placementPassages(site, reg, opts) {
  const out = [];
  const resolve = (id) => (reg.byId.has(id) ? id : reg.byId.has('BDE:' + id) ? 'BDE:' + id : reg.byId.has('DIV:' + id) ? 'DIV:' + id : reg.byId.has('CORPS:' + id) ? 'CORPS:' + id : reg.byId.has('ART:' + id) ? 'ART:' + id : null);
  const seen = new Set();
  const byUnit = new Map();
  let dropped = 0, unresolved = 0;
  for (const n of site.placementNotes) {
    const uid = resolve(n.unit_id);
    if (!uid) { unresolved++; continue; }
    const text = cleanShort(n.notes, { nameOf: reg.nameOf });
    if (!text || text.split(/\s+/).length < 4) { dropped++; continue; }
    const key = uid + '|' + text.toLowerCase();
    if (seen.has(key)) continue; seen.add(key);
    (byUnit.get(uid) || byUnit.set(uid, []).get(uid)).push({ tick: n.tick, text });
  }
  for (const uid of [...byUnit.keys()].sort()) {
    const label = reg.byId.get(uid).label;
    const rows = byUnit.get(uid).sort((a, b) => a.tick - b.tick || (a.text < b.text ? -1 : 1));
    rows.forEach((r, i) => out.push(mkPassage({
      doc: `site-records:placements-${uid}`, rec: uid, seq: i, kind: 'position_note', text: r.text.replace(/\s+/g, ' '), day: dayOfTick(r.tick), prior: 0.3, subjects: [uid],
      cite: { short: `Site placement record, ${label}, Day ${dayOfTick(r.tick)}`, author_line: 'Ask the Historian site records (unit placement data)' },
    })));
  }
  opts.stats.placementDropped = dropped; opts.stats.placementUnresolved = unresolved; opts.stats.placementKept = out.length;
  return out;
}

export function buildPassages(site, reg, { bundle = null, stats = {} } = {}) {
  const P = [];
  const CP = { nameOf: reg.nameOf };
  // ---- vignettes: one passage per paragraph of full_script ------------------------------------------------------------------
  for (const v of site.vignettes) {
    const paras = cleanProse(v.full_script, CP).split(/\n{2,}/).filter((p) => p.trim());
    const day = dayOfTick(v.trigger_tick);
    const subjects = v.units_featured.map((u) => (reg.byId.has(u) ? u : reg.byId.has('BDE:' + u) ? 'BDE:' + u : reg.byId.has('DIV:' + u) ? 'DIV:' + u : reg.byId.has('CORPS:' + u) ? 'CORPS:' + u : reg.byId.has('ART:' + u) ? 'ART:' + u : null)).filter(Boolean);
    paras.forEach((p, i) => P.push(mkPassage({
      doc: `site-records:${v.id}`, rec: v.id, seq: i, kind: 'narrative', text: p, day, prior: 0.9, subjects: [v.id, ...subjects],
      cite: { short: `Site vignette “${v.title}”, paragraph ${i + 1} of ${paras.length}`, author_line: 'Ask the Historian site records (narrative vignette)' },
    })));
  }
  // ---- chronology: event text and commentary ------------------------------------------------------------------------------------
  for (const ev of site.chronology) {
    const e = reg.byId.get(ev.id);
    const text = cleanProse(ev.event, CP);
    const subjects = [ev.id, ...(e.attrs.units || [])];
    if (text) P.push(mkPassage({
      doc: `site-records:${ev.id}`, rec: ev.id, seq: 0, kind: 'chronicle', text, day: ev.day, prior: 1.0, subjects,
      cite: { short: `Site chronology, Day ${ev.day}${ev.location ? ` (${cleanShort(ev.location, CP)})` : ''}`, author_line: 'Ask the Historian site records (chronology)' },
    }));
    const nar = cleanProse(ev.narrative, CP);
    if (nar) P.push(mkPassage({
      doc: `site-records:${ev.id}`, rec: ev.id, seq: 1, kind: 'commentary', text: nar, day: ev.day, prior: 0.8, subjects,
      cite: { short: `Site chronology commentary, Day ${ev.day}`, author_line: 'Ask the Historian site records (chronology commentary)' },
    }));
  }
  // ---- successions: the record's own words plus the site's cited source -----------------------------------------------------------------
  for (const s of site.successions) {
    const e = reg.byId.get('SUCC:' + s.id);
    const cause = { KIA: 'killed in action', MW: 'mortally wounded', WIA: 'wounded' }[s.cause] || null;
    const text = [cleanShort(s.event, CP) + '.', cleanProse(s.notes, CP), cleanShort(s.approx_time, CP) ? `Reported time: ${cleanShort(s.approx_time, CP)}.` : ''].filter(Boolean).join(' ');
    P.push(mkPassage({
      doc: `site-records:SUCC:${s.id}`, rec: 'SUCC:' + s.id, seq: 0, kind: 'succession_note', text, prior: 1.0, subjects: ['SUCC:' + s.id, ...(e.par || [])],
      cite: { short: `Site commander-succession record: ${cleanShort(s.event, CP)}${s.source ? ` (the record cites ${cleanShort(s.source, CP)})` : ''}`, author_line: 'Ask the Historian site records (commander successions)', cites: cleanShort(s.source, CP) },
    }));
  }
  // ---- casualty highlights: the site's own notes on the most intense periods (one passage each, linked to the units they name) ------------------------------
  {
    const n = site.casualtyNotes;
    const rows = [['most_compressed_union', n.most_compressed_union], ['most_compressed_confederate', n.most_compressed_confederate], ['longest_sustained_action', n.longest_sustained_action]];
    rows.forEach(([key, v], i) => {
      if (!v || !v.note) return;
      const ids = [...String(v.unit || '').matchAll(/\b[UC]-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*\b/g)].map((m) => m[0]);
      const subj = ids.map((x) => (reg.byId.has(x) ? x : reg.byId.has('DIV:' + x) ? 'DIV:' + x : reg.byId.has('CORPS:' + x) ? 'CORPS:' + x : reg.byId.has('BDE:' + x) ? 'BDE:' + x : null)).filter(Boolean);
      const text = cleanShort(v.note, CP).replace(/\.?$/, '.');
      P.push(mkPassage({ doc: 'site-records:CAS', rec: 'CAS:notable_intensity_notes', seq: i, kind: 'casualty_note', text, prior: 1.0, subjects: ['CAS:notable_intensity_notes', ...subj],
        cite: { short: 'Site casualty highlights (most intense periods of the battle)', author_line: 'Ask the Historian site records (casualty apportionment)' } }));
    });
  }
  // ---- curated placement notes ------------------------------------------------------------------------------------------------------------
  P.push(...placementPassages(site, reg, { stats }));
  // ---- bundle prose -----------------------------------------------------------------------------------------------------------------------
  if (bundle) {
    for (const w of bundle.walkthrough) {
      const title = (w.title || '').trim();
      const sub = String(w.subtitle || '').replace(/\s+[—-]\s+(?:July|Nov\.?|November)[^]*$/, '').trim(); // drop the clock-bearing tail ("July 1, 7:30 AM")
      const paras = cleanProse(w.narrative, CP).split(/\n{2,}/).filter((p) => p.trim());
      const day = dayOfTick(w.tick);
      // a walkthrough stop is tied to a tick window on the map: chronology events inside that window are what the stop is about
      const related = site.chronology.filter((e) => e.day === day && Math.abs(e.tick - w.tick) <= (w.tickWindow || 6)).map((e) => e.id);
      paras.forEach((p, i) => P.push(mkPassage({
        doc: `site-bundle-prose:walkthrough-${w.id}`, rec: `WT:${w.id}`, seq: i, kind: 'walkthrough', text: p, day, prior: 0.7, subjects: [], related,
        cite: { short: `Site walkthrough stop ${w.id}, “${title}”${sub ? ` (${sub})` : ''}, paragraph ${i + 1} of ${paras.length}`, author_line: 'Ask the Historian site records (map walkthrough)' },
      })));
    }
    for (const t of bundle.tours) {
      const text = t.history.map((h) => cleanProse(String(h).replace(/<[^>]+>/g, ''), CP)).filter(Boolean);
      const dm = String(t.day || '').match(/July (\d)/);
      text.forEach((p, i) => P.push(mkPassage({
        doc: `site-bundle-prose:tour-${t.id}`, rec: `TOUR:${t.id}`, seq: i, kind: 'tour', text: p, day: dm ? +dm[1] : null, prior: 0.7, subjects: [],
        cite: { short: `Site tour stop ${t.id}, ${t.name}, paragraph ${i + 1} of ${text.length}`, author_line: 'Ask the Historian site records (battlefield tour)' },
      })));
    }
  }
  // stable order: (doc, seq)
  P.sort((a, b) => (a.doc < b.doc ? -1 : a.doc > b.doc ? 1 : a.seq - b.seq));
  return P;
}

/** Fill ids, sentence boundaries, licences, entity links and clock claims. `link(tokens)` is the shared linker. */
export function finalizePassages(P, { link, reg, idx, sourceFor }) {
  const seenIds = new Set();
  P.forEach((p, n) => {
    p.num = n;
    let id = `${p.doc}#${sha8(p.text)}`;
    if (seenIds.has(id)) id = `${p.doc}#${sha8(p.text + '|' + p.seq)}`;
    seenIds.add(id); p.id = id;
    p.sb = sentenceBounds(p.text);
    p.source_id = sourceFor(p);
    const clk = [];
    for (const { s, e } of splitSentences(p.text)) if (CLOCK_RE.test(p.text.slice(s, e))) clk.push(s);
    p.clk = clk; // sentence start offsets that contain a clock string
    p.sens = PERIOD_TERMS.test(p.text) ? ['period_racial_language'] : [];
    // ---- entity links ---------------------------------------------------------------------------------------------------------------------
    const toks = tokenize(p.text);
    const caps = new Set([...p.text.matchAll(/\b[A-Z][A-Za-z']*/g)].map((m) => stem(m[0].toLowerCase().replace(/'s$/, ''))));
    const { mentions } = link(toks, { caps });
    const ents = new Map(); // id -> {role, conf}
    const bump = (id, role, conf) => { const cur = ents.get(id); if (!cur || (role === 'subject' && cur.role !== 'subject') || conf > cur.conf) ents.set(id, { role: role === 'subject' || (cur && cur.role === 'subject') ? 'subject' : role, conf: Math.max(conf, cur ? cur.conf : 0) }); };
    for (const s of p.subjects) if (idx.byId.has(s)) bump(s, 'subject', 1);
    for (const s of p.related || []) if (idx.byId.has(s)) bump(s, 'mention', 0.9);
    for (const m of mentions) {
      if (m.kind === 'unit-miss' || !m.ids || !m.ids.length) continue;
      const conf = m.kind === 'unit' && !m.amb ? 0.95 : m.amb ? 0.6 : 0.85;
      const ids = m.kind === 'surname' && m.amb ? [] : (m.kind === 'unit' ? [m.best] : m.ids);
      for (const i of ids) {
        const r = idx.R[i];
        if (r.k === 'person') { bump(r.id, 'mention', conf); for (const ro of r.attrs.roles || []) if (ro.r === 'commander' && idx.byId.has(ro.u) && m.kind !== 'surname') bump(ro.u, 'mention', conf * 0.6); }
        else bump(r.id, 'mention', conf);
      }
    }
    p.ents = [...ents.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([id, v]) => [id, v.role === 'subject' ? 2 : 1, +v.conf.toFixed(2)]);
  });
  return P;
}

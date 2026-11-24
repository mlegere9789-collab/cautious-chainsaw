// Builds docs/battle-theatre/app/data/timeline-overlay.json, the file the viewer reads for three markers:
//   * the source catalog entries of EG-0137 and EG-0139 (what is identified from an index only, what was not located);
//   * the competing values of the timeline rows that the timeline correction files carry as scenarios, for the register entries EG-0292..EG-0299
//     (shard proposals TL09-CF-01..08), with no default chosen;
//   * per row: the audited tier (never promoted: the weakest tier the audit text names), and the delegated conflict updates (C-nnn) of the row.
//   node tools/bt/build_timeline_overlay.mjs [--check]     (--check exits 1 when the committed file differs; nothing is written)
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), BT = path.resolve(here, '../../docs/battle-theatre');
const G = path.join(BT, 'GOVERNANCE'), OUT = path.join(BT, 'app/data/timeline-overlay.json');
const TIER_ORDER = ['documented', 'inferred', 'plausible-procedural', 'open gap'];
const jl = f => fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(Boolean).map(l => JSON.parse(l));
const fields = f => { const o = {}; for (const l of fs.readFileSync(f, 'utf8').split(/\r?\n/)) { const m = /^\| ([^|]+?) \| (.*) \|$/.exec(l); if (m && !(m[1] in o)) o[m[1]] = m[2]; } return o; };
const title = f => /^# [^:]+: (.*)$/m.exec(fs.readFileSync(f, 'utf8'))[1];
// the weakest tier named in the leading words of a tier note ("inferred (fences existed...)", "plausible/inferred; no primary", "open gap / unsupported")
export function auditTier(s) {
  if (s == null) return null;
  const head = String(s).split(/[(;]/)[0].toLowerCase(), hits = [];
  if (/documented/.test(head)) hits.push('documented'); if (/inferred/.test(head)) hits.push('inferred'); if (/plausible/.test(head)) hits.push('plausible-procedural'); if (/open[ -]gap/.test(head)) hits.push('open gap');
  return hits.length ? hits.sort((a, b) => TIER_ORDER.indexOf(b) - TIER_ORDER.indexOf(a))[0] : null;
}
const CATALOG = [          // status wording is the register's own: "records disagree..." / "not located"
  { reg: 'EG-0137', title: 'OR Atlas, Gettysburg plates 28, 40, 43, 73 and 95', status: 'records disagree on whether images were viewed (plates 28, 40, 73: index only)', tail: 'Plate 95 map 1 is credited to Warren in the index; whether it reproduces Warren 1868-69 is not established. No plate is used as a geometry or Warren source.' },
  { reg: 'EG-0139', title: "Pickett's Charge Cultural Landscape Report (2024)", status: 'not located', tail: "The npshistory index shows only the Pickett's Charge Battlefield Cultural Landscapes Inventory." },
  { reg: 'EG-0139', title: 'NPS Historic Vegetation Study', status: 'not located', tail: 'Search IRMA by title for the Pickett\'s Charge CLR before any fence or field claim relies on it.' },
];
export function build() {
  const cat = CATALOG.map(c => { const f = fields(path.join(G, 'register', c.reg + '.md')); return { register: c.reg, title: c.title, status: c.status, tier: f['Confidence tier'].split(' ')[0], detail: f['Description'], note: c.tail }; });
  const corr = {}; for (const f of fs.readdirSync(path.join(G, 'timeline_corrections')).filter(n => /^tl-\d+\.jsonl$/.test(n))) for (const d of jl(path.join(G, 'timeline_corrections', f))) corr[d.id] = d;
  const updates = Object.fromEntries(jl(path.join(G, 'timeline_conflict_updates.jsonl')).map(u => [u.id, u.conflict_updates]));
  const rows = {}, conflicts = [];
  const regs = fs.readdirSync(path.join(G, 'register')).filter(n => /^EG-029[2-9]\.md$/.test(n)).sort();
  for (const r of regs) {
    const rf = fields(path.join(G, 'register', r)), cf = (/TL09-CF-\d+/.exec(rf['Proposed id (shard)']) || [])[0]; if (!cf) continue;
    const pf = path.join(G, 'register/proposed/tl-09', cf + '.md'), seedRows = fields(pf)['Seed rows'].split(/;\s*/);
    for (const id of seedRows) {
      const d = corr[id]; if (!d || !d.scenarios || !d.scenarios.length) continue;
      conflicts.push({ id: 'TL-' + id, row: id, register: r.replace('.md', ''), topic: title(path.join(G, 'register', r)), options: d.scenarios.map(s => ({ key: 's:' + s.id, label: s.id, value: s.value, basis: s.basis, tier: s.tier })) });
      (rows[id] = rows[id] || {}).conflict = 'TL-' + id; rows[id].register = r.replace('.md', '');
    }
  }
  for (const [id, d] of Object.entries(corr)) {
    const tc = d.tier_change || {}, a = auditTier(tc.corrected);
    if (a && a !== d.seed.tier) { (rows[id] = rows[id] || {}).audit = { tier: a, seed: d.seed.tier, note: tc.corrected }; }
  }
  for (const [id, ups] of Object.entries(updates)) (rows[id] = rows[id] || {}).updates = ups.map(u => ({ conflict: u.conflict, cls: u.class, tier: u.resolution_tier, label: u.default_label }));
  const sorted = Object.fromEntries(Object.keys(rows).sort().map(k => [k, rows[k]]));
  return { label: 'Timeline-row markers built from GOVERNANCE (register EG-0137, EG-0139, EG-0292..EG-0299; timeline_corrections; timeline_conflict_updates)', version: 1, catalog: cat, conflicts, rows: sorted };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const txt = JSON.stringify(build(), null, 1) + '\n';
  if (process.argv.includes('--check')) { const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : ''; if (cur !== txt) { console.error('timeline-overlay.json differs from its sources; run: node tools/bt/build_timeline_overlay.mjs'); process.exit(1); } console.log('timeline-overlay.json is current'); }
  else { fs.writeFileSync(OUT, txt); console.log('wrote', OUT); }
}

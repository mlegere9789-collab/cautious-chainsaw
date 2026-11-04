// Builds app/data/engagements.json from the clause table (tools/engagement-clauses.mjs), the PDF timeline rows and the OR27 audit of those rows, and REFUSES to write anything that does not hold:
//   * the row exists in timeline_seed.jsonl and timeline_windows.jsonl; every phrase is literally in the row (cell separators and white space normalised, nothing else folded);
//   * the window is the row's own: parse_status "range" with both ends, or (only where the clause names a printed duration) a "point" row whose text contains the duration phrase;
//   * every unit exists in history/units.json; no two clauses share an id; the file is deterministic (no timestamp).
//   node docs/battle-theatre/app/tools/build-engagements.mjs          (ENGAGEMENTS_OUT=path writes elsewhere, used by the reproducibility test)
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { CLAUSES as ALL_CLAUSES } from './engagement-clauses.mjs';
const here = path.dirname(fileURLToPath(import.meta.url)), BT = path.resolve(here, '../..');
const J = f => JSON.parse(fs.readFileSync(path.join(BT, f), 'utf8'));
const L = f => fs.readFileSync(path.join(BT, f), 'utf8').split(/\r?\n/).filter(Boolean).map(l => JSON.parse(l));
export const normRow = s => String(s).replace(/\s*\|\s*/g, ' ').replace(/\s+/g, ' ').trim();
const MIN0 = Date.UTC(1863, 5, 1);
const iso = m => new Date(MIN0 + Math.round(m) * 60000).toISOString().slice(0, 16);

export function build(CLAUSES = ALL_CLAUSES) {
  const seed = new Map(L('GOVERNANCE/timeline_seed.jsonl').map(r => [r.id, r])), win = new Map(L('GOVERNANCE/timeline_windows.jsonl').map(r => [r.id, r]));
  const audit = new Map(); for (const f of ['T1', 'T2', 'T3']) for (const r of L(`library/timeline_audit_${f}.jsonl`)) audit.set(r.id, r);
  const units = new Set(J('history/units.json').units.map(u => u.id)), errors = [], ids = new Set(), clauses = [];
  for (const c of CLAUSES) {
    const err = m => errors.push(`${c.id} (${c.row}): ${m}`);
    if (ids.has(c.id)) err('duplicate id'); ids.add(c.id);
    const s = seed.get(c.row), w = win.get(c.row); if (!s || !w) { err('row not in the timeline files'); continue; }
    const text = normRow(s.text_raw); for (const p of c.phrases) if (!text.includes(p)) err(`phrase not literally in the row: "${p}"`);
    for (const u of c.units) if (!units.has(u)) err(`unknown unit ${u}`);
    let from, to, basis;
    if (c.duration) {
      if (w.parse_status !== 'point') err(`a duration clause needs a point row, the row is ${w.parse_status}`);
      else if (!text.includes(c.duration.phrase)) err(`duration phrase not in the row: "${c.duration.phrase}"`);
      else { from = w.default; to = w.default + c.duration.minutes; basis = 'point_plus_printed_duration'; }
    } else {
      if (w.parse_status !== 'range' || w.earliest == null || w.latest == null || !(w.earliest < w.latest)) err(`the row prints no two-ended window (parse_status ${w.parse_status})`);
      else { from = w.earliest; to = w.latest; basis = 'timeline_window'; }
    }
    if (errors.length && from === undefined) continue;
    const a = audit.get(c.row);
    clauses.push({ id: c.id, row: c.row, kind: 'fight', units: c.units, phrases: c.phrases, window: { from, to, from_iso: iso(from), to_iso: iso(to), basis, raw: w.raw, ...(c.duration ? { duration_phrase: c.duration.phrase } : {}) },
      tier: 'inferred', row_status: s.status, row_tier: s.tier, weak_source_flag: !!s.weak_source_flag, or27_audit: a ? { verdict: a.verdict, differs_from_row: a.differs_from_row ?? null, ocr_uncertain: !!a.ocr_uncertain } : null, note: c.note });
  }
  if (errors.length) { console.error(errors.join('\n')); throw new Error('engagements.json does not hold: ' + errors.length + ' problem(s)'); }
  return {
    version: 1,
    _doc: 'Printed engagement windows of formations, from rows of the PDF master timeline (seeded_unverified), built by app/tools/build-engagements.mjs from app/tools/engagement-clauses.mjs. Time is minutes since 1863-06-01 00:00 LMT. A unit takes the windows of every formation above it. Nothing here is a casualty figure.',
    conventions: { time_unit: 'minutes since 1863-06-01 00:00 local mean time', window_basis: ['timeline_window', 'point_plus_printed_duration'], tier: 'inferred (rows are seeded_unverified; never documented)' },
    clauses,
  };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = process.env.ENGAGEMENTS_OUT || path.join(BT, 'app/data/engagements.json'), doc = build();
  fs.writeFileSync(out, JSON.stringify(doc, null, 1) + '\n'); console.log(`${doc.clauses.length} engagement clauses, ${new Set(doc.clauses.flatMap(c => c.units)).size} units/formations named -> ${out}`);
  const verdicts = {}; for (const c of doc.clauses) { const v = c.or27_audit ? c.or27_audit.verdict : 'NO_AUDIT'; verdicts[v] = (verdicts[v] || 0) + 1; } console.log('OR27 audit verdicts of the rows used:', JSON.stringify(verdicts));
}

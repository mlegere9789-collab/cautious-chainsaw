// Builds app/data/daypositions.json: a digest of every claim of the four troop-map files (the Bachelder 1876 sheets 1 to 3 and the hour-labelled sheet LOC 99447494),
// read by src/history/daypos.mjs. The troop-map files themselves are never edited here.
//   node docs/battle-theatre/app/tools/build-daypositions.mjs            writes data/daypositions.json
//   node docs/battle-theatre/app/tools/build-daypositions.mjs --check    exits 1 if the file on disk differs from what the sources give now
//
// The digest copies fields (nothing is computed except `nw_of_seminary`, the flag for the north-west corner, `words`, the word count of the quote, and `line_clock`, the reading of the clock printed
// beside the line as a complete clock or not: daypos.mjs parseLineClock, v7 / DEC-018). tests/daypos.test.mjs re-reads the four files and checks every digest field against its line, so the digest cannot drift from the claim.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath } from 'node:url';
import { lineClockOf } from '../src/history/daypos.mjs';
const here = path.dirname(fileURLToPath(import.meta.url)), BT = path.resolve(here, '../..');
export const OUT = 'app/data/daypositions.json';
export const SHEETS = {
  J1: { file: 'history/positions/troopmap_jul1_b1876.jsonl', date: '1863-07-01', source: 'BACH-1876-S1', label: 'Bachelder 1876, sheet 1: First day\'s battle (LOC 99447491)', day_level: true },
  J2: { file: 'history/positions/troopmap_jul2_b1876.jsonl', date: '1863-07-02', source: 'BACH-1876-S2', label: 'Bachelder 1876, sheet 2: Second day\'s battle (LOC 99447491)', day_level: true },
  J3: { file: 'history/positions/troopmap_jul3_b1876.jsonl', date: '1863-07-03', source: 'BACH-1876-S3', label: 'Bachelder 1876, sheet 3: Third day\'s battle (LOC 99447491)', day_level: true },
  H: { file: 'history/positions/troopmap_jul1_hour_loc99447494.jsonl', date: '1863-07-01', source: 'LOC-99447494', label: 'LOC 99447494: July 1, 2 to 3.30 P.M., general position of troops (author and date not stated by the Library of Congress)', day_level: false },
};
// Seminary Ridge: the gazetteer's proxy place GZ-073 (centre copied from data/gazetteer.json at build time); "north-west of the Seminary" is the quadrant with a larger latitude and a smaller longitude
const words = s => String(s || '').trim().split(/\s+/).filter(Boolean).length;
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
export function digestOf(c, sheet, seminary) {
  const g = c.geo || {}, s = c.source || {}, w = c.when || {}, p = c.place || {};
  return {
    id: c.claim_id, sheet, unit: c.unit_id, kind: c.kind, tier: c.tier, fidelity: c.fidelity_check, verified: c.claim_support_verified === true, weak_source: c.weak_source === true, single_source: c.flag_single_source === true,
    ocr_uncertain: c.ocr_uncertain === true, render_flag: c.render_flag ?? null, conflicts_with: c.conflicts_with || [],
    printed: p.printed ?? null, quote: s.quote || '', quote_words: words(s.quote), sheet_title: w.printed ?? null,
    date: w.date ?? null, t_iso: w.t_iso ?? null, t_start_iso: w.t_start_iso ?? null, t_end_iso: w.t_end_iso ?? null, approx: w.approx === true, clock_attachment: w.clock_attachment ?? null, line_state: w.line_state ?? null,
    // the line state read by eye (library/LINE-STATES-NOTES.md; v7, DEC-018): the legend state of the bar the label belongs to, the states of a mixed label, what was seen, the crop, the method tag, and the clock or time word printed beside the line (verbatim)
    line_states: Array.isArray(w.line_states) ? w.line_states.slice() : null, line_state_basis: w.line_state_basis ?? null, line_state_crop: w.line_state_crop ?? null, line_state_read: w.line_state_read ?? null, line_state_prev: w.line_state_prev ?? null,
    printed_clock_near_line: w.printed_clock_near_line ?? null, line_clock: lineClockOf(w),
    lng: g.lng, lat: g.lat, sigma_m: g.sigma_m, sigma_transform_m: g.sigma_transform_m ?? null, basis: g.basis ?? null, scan_px: g.scan_px ?? null, label_px: g.label_px ?? null, scan: g.scan ?? null,
    crop: s.crop ?? null, crop_spec: s.crop_spec ?? null, report: s.report_id ?? null,
    activity: c.activity || '',
    nw_of_seminary: (sheet === 'J2' || sheet === 'J3') && g.lat > seminary.lat && g.lng < seminary.lng,
  };
}
export function build() {
  const gaz = JSON.parse(fs.readFileSync(path.join(BT, 'app/data/gazetteer.json'), 'utf8')), sem = gaz.places.find(p => p.id === 'GZ-073');
  if (!sem) throw new Error('GZ-073 (Seminary Ridge) is not in the gazetteer');
  const seminary = { id: sem.id, name: sem.name, lng: sem.center.lng, lat: sem.center.lat }, claims = {}, sheets = {};
  for (const [k, S] of Object.entries(SHEETS)) {
    const f = path.join(BT, S.file), rows = fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(l => l.trim()).map(l => JSON.parse(l));
    sheets[k] = { file: S.file, sha256: sha(f), claims: rows.length, date: S.date, source: S.source, label: S.label, day_level: S.day_level };
    for (const c of rows) { if (claims[c.claim_id]) throw new Error('duplicate claim id ' + c.claim_id); claims[c.claim_id] = digestOf(c, k, seminary); }
  }
  return { version: 2, built_by: 'tools/build-daypositions.mjs', note: 'A digest of every claim of the four troop-map files (history/positions/troopmap_*.jsonl), with the line state of every Bachelder label read by eye (library/LINE-STATES-NOTES.md) and the reading of the clock printed beside the line. Rules that use it: src/history/daypos.mjs and app/data-contract.md contracts 1.5 and 1.7 (DEC-010, DEC-011, DEC-018).', seminary, sheets, claims };
}
const text = d => JSON.stringify(d, null, 1) + '\n';
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const doc = build(), out = path.join(BT, OUT);
  if (process.argv.includes('--check')) { const cur = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : ''; if (cur !== text(doc)) { console.error(OUT + ' is stale: run node docs/battle-theatre/app/tools/build-daypositions.mjs'); process.exit(1); } console.log(OUT + ' is current (' + Object.keys(doc.claims).length + ' claims)'); }
  else { fs.writeFileSync(out, text(doc)); console.log('wrote ' + OUT + ': ' + Object.keys(doc.claims).length + ' claims, ' + (text(doc).length / 1024).toFixed(0) + ' KB'); }
}

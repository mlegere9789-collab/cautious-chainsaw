// Reader of the five position ledgers (history/positions/positions_{A,B,C,D}.jsonl: OR27 reports; positions_E.jsonl: the state regimental volumes, history layer v8) for the claim-driven placement layer.
// The ledgers themselves are never edited here. This module decides which claims may be USED and reads their printed clocks:
//   * a claim is used only if claim_support_verified is true AND fidelity_check is passed_full_read or corrected AND its tier is documented or inferred
//     (an open-gap claim, a downgraded or not_rechecked claim, a claim whose support is not verified is never used);
//   * ledger E (history layer v8) cites a state regimental volume and a section of it (source.volume / source.section / source.work), not an OR27 report_id: the adapter below (sourceOf, digest)
//     names the source of a claim whatever the ledger, and E claims are admitted by exactly the rules above, no other;
//   * ledger B is read only after the line 'RECHECK B COMPLETE' is the LAST line of positions/RECHECK_B_NOTES.md; until then it is skipped and the notes say so.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), BT = path.resolve(here, '../..');
export const POS_DIR = path.join(BT, 'history/positions');
export const LEDGER_NAMES = { A: 'positions_A.jsonl', B: 'positions_B.jsonl', C: 'positions_C.jsonl', D: 'positions_D.jsonl', E: 'positions_E.jsonl' };
export const FIDELITY_OK = ['passed_full_read', 'corrected'];
export const TIERS_OK = ['documented', 'inferred'];

export function bStatus(dir = POS_DIR) {
  const f = path.join(dir, 'RECHECK_B_NOTES.md');
  if (!fs.existsSync(f)) return { complete: false, reason: 'positions/RECHECK_B_NOTES.md does not exist yet: ledger B is still being re-read' };
  const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(l => l.trim()), last = lines.length ? lines[lines.length - 1].trim() : '';
  return last === 'RECHECK B COMPLETE' ? { complete: true, reason: 'the last line of RECHECK_B_NOTES.md is RECHECK B COMPLETE' } : { complete: false, reason: `the last line of RECHECK_B_NOTES.md is not RECHECK B COMPLETE (it is “${last.slice(0, 60)}”): ledger B is still being re-read` };
}
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
export function loadLedgers(dir = POS_DIR) {
  const claims = [], meta = {}, b = bStatus(dir);
  for (const [L, name] of Object.entries(LEDGER_NAMES)) {
    const f = path.join(dir, name);
    if (L === 'B' && !b.complete) { meta.B = { included: false, reason: b.reason, file: 'history/positions/' + name, claims: fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(x => x.trim()).length : 0 }; continue; }
    const rows = fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(l => l.trim()).map(l => ({ ledger: L, ...JSON.parse(l) }));
    meta[L] = { included: true, file: 'history/positions/' + name, claims: rows.length, sha256: sha(f) };
    claims.push(...rows);
  }
  return { claims, meta };
}
// null when the claim may be used, else the reason it may not
export function unusable(c) {
  if (c.claim_support_verified !== true) return 'claim_support_verified is not true';
  if (!FIDELITY_OK.includes(c.fidelity_check)) return `fidelity_check is ${c.fidelity_check} (only passed_full_read and corrected are used)`;
  if (!TIERS_OK.includes(c.tier)) return `tier is ${c.tier}`;
  return null;
}
// Where a claim comes from. OR27 ledgers (A-D): source.report_id (or record_id). State regimental volumes (E): source.volume + source.section (+ source.work, source.cite). `id` is what the digest's
// `report` carries (the OR report id, or for E the section id), so every consumer that needs one string for the source keeps working; `kind` tells the card which words to print.
export function sourceOf(c) {
  const s = c.source || {};
  if (s.report_id || s.record_id) return { kind: 'or27', id: s.report_id || s.record_id };
  if (s.section) return { kind: 'statevol', id: s.section, volume: s.volume || null, work: s.work || null, cite: s.cite || null };
  return { kind: 'unknown', id: null };
}
const words = s => String(s || '').trim().split(/\s+/).filter(Boolean).length;
// compact record of a claim carried into data/placement-claims.json: only what the card and the checks need (all copied, nothing computed)
export function digest(c) {
  const s = c.source || {}, w = c.when || {}, p = c.place || {};
  return { id: c.claim_id, ledger: c.ledger, unit: c.unit_id, kind: c.kind, tier: c.tier, fidelity: c.fidelity_check, verified: c.claim_support_verified === true,
    report: sourceOf(c).id, ...(sourceOf(c).kind === 'statevol' ? { source_kind: 'statevol', volume: sourceOf(c).volume, work: sourceOf(c).work, cite: sourceOf(c).cite } : {}), author: s.author || null, page: s.printed_page ?? null, interpolated: !!s.interpolated, quote: s.quote || '', quote_words: words(s.quote),
    when: { printed: w.printed ?? null, date: w.date ?? null, t_iso: w.t_iso ?? null, approx: !!w.approx }, place: { printed: p.printed ?? null, gazetteer_ref: p.gazetteer_ref ?? null, direction_or_road: p.direction_or_road ?? null },
    conflicts_with: c.conflicts_with || [], ocr_uncertain: !!c.ocr_uncertain, activity: c.activity || '' };
}

// ---- printed clocks: src/history/claim-clock.mjs (shared with the page, which checks the same words at load)
export { printedClocks, clockAgrees, printedPeriod, PERIOD_CLOCK } from '../src/history/claim-clock.mjs';

// ---- the state of data/placement-claims.json before ledger E (history layer v7 and earlier): no v8 approach record, no stop or departure read from a state regimental volume, no documented absence.
// The tests of the older layers run on it, so that each layer is tested in the state it was written for; tests/ledgerE.test.mjs tests what v8 adds.
export function withoutV8(doc) {
  const v8 = e => e.added_in === 'v8' || e.ledger === 'E';
  return { ...doc, approach: (doc.approach || []).filter(a => !v8(a)), positions: (doc.positions || []).filter(p => !v8(p)), departures: (doc.departures || []).filter(d => !v8(d)), documented_absent: [] };
}

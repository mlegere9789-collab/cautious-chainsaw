// Rule definition helper. A rule is metadata + run(ctx) -> Violation[] | null.
//   null  = the rule could not run (input does not exist yet); it is reported as SKIPPED, never as clean.
// Violation: { key, message, file?, path?, kind?, rows?, data? }
//   key   : stable fingerprint (unique within the rule) used by the ratchet.
//   rows  : how many data rows the violation stands for (default 1); used for "N IDs / M rows" reporting.

/** Interim baseline expiry per family (proposal: aligns with the chapter-13 phases; renew only with a reason). */
export const FAMILY_EXPIRY = {
  schema: '2027-01-31',      // P0/P1
  refs: '2027-01-31',        // P1 identity (WP-06/07)
  coverage: '2027-06-30',    // P3 motion
  geometry: '2027-06-30',
  numbers: '2027-03-31',     // P2 numbers
  time: '2027-06-30',        // waits for chapter 04
  text: '2027-01-31',        // WP-09 compat drop
  provenance: '2027-06-30',
  facts: '2027-03-31',
  corpus: '2027-03-31',
  release: '2027-01-31',
  v2: '2027-06-30',
};

export function defineRule(meta) {
  const required = ['id', 'sev', 'family', 'title', 'status', 'wp', 'run'];
  for (const k of required) if (!(k in meta)) throw new Error(`rule ${meta.id ?? '?'} missing ${k}`);
  if (!['E', 'W'].includes(meta.sev)) throw new Error(`rule ${meta.id}: bad severity`);
  if (!['implemented', 'partial', 'deferred'].includes(meta.status)) throw new Error(`rule ${meta.id}: bad status`);
  return {
    dv: [],
    tier: 'core', // core (60) | v2 (8)
    spec_baseline: '',
    blocked_by: null,
    metric: false,
    expires: FAMILY_EXPIRY[meta.family],
    ...meta,
  };
}

export const V = (key, message, extra = {}) => ({ key, message, ...extra });

export const rowKey = (r) => `${r.file}#${r.idx}`;
export const rowLabel = (r) => `${r.unit_id}@${r.tick}`;

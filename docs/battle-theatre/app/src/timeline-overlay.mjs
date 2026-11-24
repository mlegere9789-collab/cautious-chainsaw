// Markers of the timeline rows and the source catalog. Pure functions of (overlay, row, choices); no DOM, no fetch. Unit-tested in node (tests/timeline-overlay.test.mjs).
// The overlay (data/timeline-overlay.json) is built by tools/bt/build_timeline_overlay.mjs from the register and the timeline correction files.
export const NO_DEFAULT = 'none', EVERY = 'range';
export const catalogOf = ov => (ov && ov.catalog) || [];
export const tlConflictsOf = ov => ((ov && ov.conflicts) || []).map(c => ({ ...c, kind: 'timeline', options: [{ key: NO_DEFAULT, label: 'No default chosen (values carried; none selected)' }, ...c.options, { key: EVERY, label: 'Show every value (no single value chosen)' }] }));
export const tlChoice = (choices, id) => (choices && choices[id]) || NO_DEFAULT;
export const rowOverlay = (ov, id) => (ov && ov.rows && ov.rows[id]) || null;
// the seeded, unverified pill belongs only to a row that is still unverified (the seed file's own status)
export const isUnverified = e => (e && e.status) !== 'verified';
// what the event card adds for a row: the audited tier (when it differs from the plan's), the competing values with their tiers, the delegated conflict updates
export function eventMarks(ov, e, choices) {
  const r = rowOverlay(ov, e.id); if (!r) return null;
  const c = r.conflict ? tlConflictsOf(ov).find(x => x.id === r.conflict) : null, cur = c ? tlChoice(choices, c.id) : null;
  return { audit: r.audit || null, register: r.register || null, updates: r.updates || [],
    conflict: c ? { id: c.id, topic: c.topic, current: cur, values: c.options.filter(o => o.key.startsWith('s:')).map(o => ({ ...o, selected: cur === o.key || cur === EVERY })) } : null };
}

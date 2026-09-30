// coverage.mjs - K001, the "every whitelisted source field is populated" rule, made structural (verifier defect V-04).
// The loader (load.mjs) reads the site data through a field whitelist. The deployed page once read fields that did not exist (chronology e.title / e.description) and printed "undefined" 137 times;
// the first K001 hand-listed eleven fields, so renaming the regiments' strength and casualties passed the build and answers went silently wrong.
// Now the field list is DERIVED from what the loader emits: every key of every record of every collection (one level of nested objects flattened, "commander.name"), and each field's
// populated count is compared with a recorded baseline (tools/historian/data/field-coverage.v1.json, written by `node tools/historian/build.mjs --record-coverage` from data that was reviewed).
//   * a field that is less populated than recorded (renamed, dropped, emptied)      -> error
//   * a field the loader emits that has no recorded coverage (a NEW whitelisted field) -> error: record it deliberately
//   * a recorded field the loader no longer emits, or a collection that shrank      -> error
// Populated means present and not null, not an empty string or array or object, not NaN; 0 is populated.

const COLLECTIONS = ['regiments', 'brigades', 'divisions', 'corps', 'armies', 'batteries', 'artUnits', 'artChiefs', 'artChiefsByCorps', 'successions', 'vignettes', 'chronology', 'locations', 'roads', 'structures', 'features', 'monuments', 'casualtyCorps', 'placementNotes'];

export const populated = (v) => v !== undefined && v !== null
  && !(typeof v === 'string' && v.trim() === '') && !(Array.isArray(v) && v.length === 0) && !(typeof v === 'number' && Number.isNaN(v))
  && !(typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0);

/** { collection: { n, fields: { name: populatedCount } } } for every collection the loader emits */
export function fieldCoverage(site) {
  const out = {};
  for (const name of COLLECTIONS) {
    const list = site[name]; if (!Array.isArray(list)) continue;
    const fields = {};
    for (const rec of list) {
      for (const [k, v] of Object.entries(rec)) {
        fields[k] = (fields[k] || 0) + (populated(v) ? 1 : 0);
        if (v && typeof v === 'object' && !Array.isArray(v)) for (const [k2, v2] of Object.entries(v)) fields[`${k}.${k2}`] = (fields[`${k}.${k2}`] || 0) + (populated(v2) ? 1 : 0);
      }
    }
    // a key that is absent from some records still counts against the records that lack it
    out[name] = { n: list.length, fields: Object.fromEntries(Object.entries(fields).sort(([a], [b]) => (a < b ? -1 : 1))) };
  }
  return out;
}

/** compare live coverage with the recorded baseline; returns [{ rule: 'K001', msg }] */
export function checkCoverage(actual, baseline, { tolerance = 0.05, minRecords = 8 } = {}) {
  const f = [];
  const add = (msg) => f.push({ rule: 'K001', msg });
  if (!baseline || !baseline.collections) return [{ rule: 'K001', msg: 'the field-coverage baseline (tools/historian/data/field-coverage.v1.json) is missing: run node tools/historian/build.mjs --record-coverage on reviewed data' }];
  for (const [name, b] of Object.entries(baseline.collections)) {
    const a = actual[name];
    if (!a) { add(`collection ${name} is no longer loaded (recorded ${b.n} records)`); continue; }
    if (a.n < b.n * 0.8) add(`collection ${name} has ${a.n} records, recorded ${b.n}: a source file or list went missing`);
    for (const [field, have] of Object.entries(b.fields)) {
      if (!(field in a.fields)) { add(`${name}.${field} is no longer loaded (recorded populated in ${have}/${b.n})`); continue; }
      const now = a.fields[field];
      if (b.n >= minRecords && a.n >= minRecords) {
        const was = have / b.n, is = now / a.n;
        const floor = was >= 0.98 ? 0.95 : Math.max(was - tolerance, was * 0.5);      // a sparse field may not lose half of its records either
        if (is < floor - 1e-9) add(`${name}.${field} is populated in ${now}/${a.n} records (${(100 * is).toFixed(0)}%), recorded ${have}/${b.n} (${(100 * was).toFixed(0)}%): the source field was renamed, dropped or emptied`);
      } else if (now < have) add(`${name}.${field} is populated in ${now}/${a.n} records, recorded ${have}/${b.n}`);
    }
    for (const field of Object.keys(a.fields)) if (!(field in b.fields)) add(`${name}.${field} is a new whitelisted field with no recorded coverage: check that it is populated, then run node tools/historian/build.mjs --record-coverage`);
  }
  for (const name of Object.keys(actual)) if (!(name in baseline.collections)) add(`collection ${name} is new and has no recorded coverage`);
  return f;
}

export const coverageBaselineDoc = (actual) => ({
  $comment: 'K001 baseline: for every collection the loader (tools/historian/lib/load.mjs) emits, the number of records and, per field (nested objects flattened), how many records populate it. Written by node tools/historian/build.mjs --record-coverage from reviewed data; tools/historian/lib/coverage.mjs compares every build against it.',
  collections: actual,
});

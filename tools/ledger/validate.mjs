// Validates data-src/ledger/conflict_ledger.json:
//   1. JSON Schema (tools/ledger/schemas), for the ledger and for visual_readings.json
//   2. every OCR quote is found on its leaf of the cached scan and its printed page equals the running head of that leaf (or, if the cache is empty,
//      the committed text window and the leaf/page it was cut from)
//   3. every image-read quote matches its page-image reading; every table is re-added (rows, columns, figure maps); the OCR variants are recorded
//   4. every number in every value is found in its quote (digits or words) and every derived figure reproduces; no averaging key anywhere
//   5. tier rules (A1 = published before 1931), link-out-only sources, status ladder, written display rules
// Usage: node tools/ledger/validate.mjs [--require-cache] [--fetch] [--json] [--strict]
//   --require-cache  an uncached source is an error (default: fall back to the committed windows)
//   --fetch          allow polite network fetches to fill the cache (default: offline, nothing is downloaded)
//   --strict         warnings become errors (site data drift)
import fs from 'node:fs';
import path from 'node:path';
import { validateLedger } from './ledger-lib.mjs';
import { loadJson, schemaErrors, isMain } from '../environment/schema-util.mjs';
export { loadJson, schemaErrors };

export async function validateAll(opts = {}) {
  const ledger = opts.ledger || loadJson('data-src/ledger/conflict_ledger.json');
  const readings = opts.readings || loadJson('data-src/ledger/visual_readings.json');
  const errors = [], warnings = [];
  schemaErrors('tools/ledger/schemas/conflict_ledger.schema.json', ledger).forEach((e) => errors.push('schema(ledger): ' + e));
  schemaErrors('tools/ledger/schemas/visual_readings.schema.json', readings).forEach((e) => errors.push('schema(readings): ' + e));
  const r = await validateLedger(ledger, { offline: !opts.fetch, requireCache: opts.requireCache, readings: readings.readings, strictSite: opts.strictSite, windows: opts.windows, weather: opts.weather });
  errors.push(...r.errors); warnings.push(...r.warnings);
  return { errors, warnings, metrics: r.metrics };
}

if (isMain(import.meta.url)) {
  const args = process.argv.slice(2);
  const res = await validateAll({ requireCache: args.includes('--require-cache'), fetch: args.includes('--fetch'), strictSite: args.includes('--strict') });
  if (args.includes('--strict')) { res.errors.push(...res.warnings); res.warnings = []; }
  if (args.includes('--json')) console.log(JSON.stringify(res, null, 1));
  else {
    for (const w of res.warnings) console.warn('warning: ' + w);
    for (const e of res.errors) console.error('ERROR: ' + e);
    console.log(`ledger: ${res.errors.length} error(s), ${res.warnings.length} warning(s); ` + JSON.stringify(res.metrics));
  }
  process.exit(res.errors.length ? 1 : 0);
}

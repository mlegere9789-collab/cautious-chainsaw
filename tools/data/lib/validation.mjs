// Programmatic entry point (used by the CLI, the report generator and the tests).
import { buildContext } from './context.mjs';
import { runRules } from './runner.mjs';
import { DEFAULT_DATA_DIR, isoDate } from './util.mjs';

/**
 * @param {object} o
 * @param {string} [o.dataDir]
 * @param {object} [o.data]        in-memory data set (seeded-defect tests)
 * @param {string[]|null} [o.only] rule ids
 * @param {boolean} [o.site]       false = skip html/bundle scans
 */
export async function runValidation({ dataDir = DEFAULT_DATA_DIR, now = isoDate(), only = null, site = true, data = null, ctxOpts = {} } = {}) {
  const ctx = buildContext({ dataDir, now, data, ...(site ? {} : { bundlePath: null, distDir: null }), ...ctxOpts });
  const { rules, results } = await runRules(ctx, { only });
  return { ctx, rules, results };
}

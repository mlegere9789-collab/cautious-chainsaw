#!/usr/bin/env node
// Emits data-src/build/facts.json (WP-DATA-19). Reads the legacy tree; writes only under data-src/build/.
//   node tools/data/facts.mjs [--check]
import fs from 'node:fs';
import path from 'node:path';
import { buildContext } from './lib/context.mjs';
import { buildRegistry, buildCrosswalk } from './lib/registry.mjs';
import { buildFacts } from './lib/facts.mjs';
import { buildNotableIntensity, buildAdjudicationRegister, buildCavalryCommanders, buildRollups, buildAliasTable } from './lib/candidates.mjs';
import { hashTree, contentHash } from './lib/manifest.mjs';
import { readJsonIfExists, PATHS } from './lib/manifest.mjs';
import { REPO_ROOT, prettyJson, isMainModule } from './lib/util.mjs';

export const FACTS_PATH = path.join(REPO_ROOT, 'data-src', 'build', 'facts.json');

export function generateFacts(ctx = buildContext({})) {
  const crosswalk = buildCrosswalk(ctx);
  const byTarget = new Map();
  for (const e of crosswalk.entries) if (e.proposed && !e.new_record) { if (!byTarget.has(e.proposed)) byTarget.set(e.proposed, []); byTarget.get(e.proposed).push(e); }
  const registry = buildRegistry(ctx, byTarget);
  const sha = ctx.data.dir === '<memory>' ? null : contentHash(hashTree(ctx.dataDir));
  const version = readJsonIfExists(PATHS.version)?.data_version ?? '0.9.0';
  return prettyJson(buildFacts(ctx, registry, crosswalk, { contentSha256: sha, dataVersion: version }));
}

/** Candidate datasets generated with the facts (WP-DATA-07 step 5, WP-DATA-08c/e). */
export function generateCandidates(ctx = buildContext({})) {
  return {
    'candidates/notable_intensity.json': prettyJson(buildNotableIntensity(ctx)),
    'candidates/adjudication_register.json': prettyJson(buildAdjudicationRegister(ctx)),
    'candidates/confederate_cavalry_commanders.json': prettyJson(buildCavalryCommanders(ctx)),
    'candidates/rollups.json': prettyJson(buildRollups(ctx)),
    'unit_aliases.json': prettyJson(buildAliasTable(buildCrosswalk(ctx))),
  };
}

if (isMainModule(import.meta.url)) {
  const ctx = buildContext({});
  const outputs = { 'facts.json': generateFacts(ctx), ...generateCandidates(ctx) };
  const build = path.join(REPO_ROOT, 'data-src', 'build');
  if (process.argv.includes('--check')) {
    let bad = 0;
    for (const [name, text] of Object.entries(outputs)) {
      const p = path.join(build, name);
      if (!fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== text) { console.error(`STALE data-src/build/${name} (run node tools/data/facts.mjs)`); bad++; }
    }
    if (bad) process.exit(1);
    console.log('facts.json and candidates up to date');
  } else {
    for (const [name, text] of Object.entries(outputs)) {
      const p = path.join(build, name);
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, text, 'utf8');
      console.log(`wrote ${path.relative(REPO_ROOT, p)} (${text.length} bytes)`);
    }
  }
}

#!/usr/bin/env node
// Emits data-src/build/facts.json (WP-DATA-19). Reads the legacy tree; writes only under data-src/build/.
//   node tools/data/facts.mjs [--check]
import fs from 'node:fs';
import path from 'node:path';
import { buildContext } from './lib/context.mjs';
import { buildRegistry, buildCrosswalk } from './lib/registry.mjs';
import { buildFacts } from './lib/facts.mjs';
import { hashTree, contentHash } from './lib/manifest.mjs';
import { readJsonIfExists, PATHS } from './lib/manifest.mjs';
import { REPO_ROOT, prettyJson } from './lib/util.mjs';

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

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
if (isMain) {
  const text = generateFacts();
  if (process.argv.includes('--check')) {
    const cur = fs.existsSync(FACTS_PATH) ? fs.readFileSync(FACTS_PATH, 'utf8') : null;
    if (cur !== text) { console.error('STALE data-src/build/facts.json (run node tools/data/facts.mjs)'); process.exit(1); }
    console.log('facts.json up to date');
  } else {
    fs.mkdirSync(path.dirname(FACTS_PATH), { recursive: true });
    fs.writeFileSync(FACTS_PATH, text, 'utf8');
    console.log(`wrote ${path.relative(REPO_ROOT, FACTS_PATH)} (${text.length} bytes)`);
  }
}

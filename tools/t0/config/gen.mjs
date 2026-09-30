#!/usr/bin/env node
// Config generation hook for train R1c (STUB; the infra/headers agent replaces this file).
//
//   node tools/t0/config/gen.mjs <distPath> '<json>'      env T0_TRAIN=R1c
//
// <json> = {"rid","entry","help","bookmark","css"} (file names inside dist/assets/).  The hook may write ONLY these paths inside
// <distPath>: _headers, _redirects, netlify.toml, _ops/**.  build.py fails the build when anything else changes.  It must be
// deterministic (same inputs -> same bytes).  It must print nothing that looks like a secret.
import fs from 'node:fs';

const [dist, json] = process.argv.slice(2);
if (!dist || !fs.existsSync(dist)) { console.error('gen.mjs: dist path missing'); process.exit(2); }
const rel = JSON.parse(json || '{}');
if (!rel.rid) { console.error('gen.mjs: release JSON missing rid'); process.exit(2); }
console.log(`config stub: nothing generated for ${process.env.T0_TRAIN || '?'} rid ${rel.rid}`);

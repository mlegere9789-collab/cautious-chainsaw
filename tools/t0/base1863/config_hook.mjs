#!/usr/bin/env node
// Config hook for scratch builds WITH the group BASE1863 (b63_build.py passes it as the builder's --config-hook).
// It runs the unmodified generator tools/t0/config/gen.mjs, then gives the versioned tile directory its cache class:
//   /tiles1863/*   Cache-Control: public, max-age=31536000, immutable
// Why that is safe: every tile set lives under /tiles1863/v1-<hash of its files>/ (stage_assets.py), so a name is never reused for other bytes, exactly like /assets/.
// gen.mjs gives an unknown top-level directory only X-Frame-Options (so the default Netlify class, max-age=0 must-revalidate, would apply to 30 MB of tiles).
// The text stays valid for the generator's own invariant (one rule per header NAME per URL): it is re-proved here with config/lib.mjs, and config-manifest.json is updated.
// Only _headers and _ops/config-manifest.json change (both are on the builder's allowed list).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseHeadersFile, resolveHeaders, checkInvariant } from '../config/lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const [dist, json] = process.argv.slice(2);
const gen = spawnSync('node', [path.join(HERE, '..', 'config', 'gen.mjs'), dist, json], { encoding: 'utf8', env: process.env });
process.stdout.write(gen.stdout || '');
process.stderr.write(gen.stderr || '');
if (gen.status !== 0) process.exit(gen.status || 1);

const hp = path.join(dist, '_headers');
let text = fs.readFileSync(hp, 'utf8');
const IMMUTABLE = 'public, max-age=31536000, immutable';
const re = /^\/tiles1863\/\*\n((?: {2}.*\n)+)/m;
const m = re.exec(text);
if (!m) {
  if (!fs.existsSync(path.join(dist, 'tiles1863'))) { console.log('base1863 config: no /tiles1863 directory in this tree, nothing added'); process.exit(0); }
  console.error('base1863 config: the generator emitted no /tiles1863/* block'); process.exit(1);
}
if (/Cache-Control/i.test(m[1])) { console.error('base1863 config: /tiles1863/* already has a Cache-Control rule'); process.exit(1); }
text = text.replace(re, (all, body) => `/tiles1863/*\n  Cache-Control: ${IMMUTABLE}\n${body}`);
fs.writeFileSync(hp, text);

// the invariant, re-proved on sample paths: every header name is produced by exactly one rule (checkInvariant), and a tile and its sibling files resolve to the immutable class
const rules = parseHeadersFile(text);
const samples = ['/tiles1863/v1-x/13/2338/3106.webp', '/tiles1863/v1-x/changed/14/4676/6211.png', '/tiles1863/v1-x/ABOUT.txt', '/tiles1863/v1-x/overlays.json'];
const problems = checkInvariant(rules, samples, { enumerated: samples });
if (problems.length) { console.error('base1863 config: header invariant violated: ' + problems.join(' | ')); process.exit(1); }
for (const p of samples) {
  const cc = resolveHeaders(rules, p).headers.get('cache-control');
  if (!cc || cc.value !== IMMUTABLE) { console.error(`base1863 config: ${p} does not resolve to the immutable class (${cc && cc.value})`); process.exit(1); }
}
const mp = path.join(dist, '_ops', 'config-manifest.json');
const man = JSON.parse(fs.readFileSync(mp, 'utf8'));
const g = man.groups.find((x) => x.path === '/tiles1863/*');
if (g) g.cache = IMMUTABLE;
man.sha256._headers = crypto.createHash('sha256').update(text).digest('hex');
man.base1863 = { note: 'tools/t0/base1863/config_hook.mjs added Cache-Control immutable to /tiles1863/* (versioned directories)' };
fs.writeFileSync(mp, JSON.stringify(man, null, 2) + '\n');
console.log('base1863 config: /tiles1863/* is immutable (versioned directories), invariant re-proved');

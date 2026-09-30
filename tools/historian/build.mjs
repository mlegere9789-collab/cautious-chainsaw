#!/usr/bin/env node
// build.mjs - Ask the Historian knowledge-base build (phases H0-H2, current corpus).
//   node tools/historian/build.mjs [--data legacy/dist/data] [--out historian-src/dist/hx] [--no-bundle] [--dry] [--quiet]
// Reads the site data lake through a field whitelist (lib/load.mjs), derives the entity registry with aliases (lib/registry.mjs), fact tables
// (lib/facts.mjs), passages + BM25 postings (lib/passages.mjs, lib/postings.mjs), validates (lib/validate.mjs) and emits content-hashed shards.
// Deterministic: a rebuild of unchanged inputs reproduces every hash (rule V12, tested).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSite } from './lib/load.mjs';
import { extractBundleProse } from './lib/bundle.mjs';
import { buildRegistry } from './lib/registry.mjs';
import { serializeT1, buildEntityIndex } from './lib/t1.mjs';
import { buildFacts } from './lib/facts.mjs';
import { buildPassages, finalizePassages } from './lib/passages.mjs';
import { buildPostings, buildEntityPostings, IX_BUCKETS, EN_BUCKETS } from './lib/postings.mjs';
import { Emitter, writeManifest, brotliSize, stable } from './lib/emit.mjs';
import { validate } from './lib/validate.mjs';
import { loadSources } from './lib/sources.mjs';
import { buildClock } from './lib/clock.mjs';
import { fieldCoverage, coverageBaselineDoc } from './lib/coverage.mjs';
import { prepareT1 } from '../../historian-src/core/entities.js';
import { createLinker } from '../../historian-src/core/linker.js';
import { encodePassage, TX_FIELDS, PER_SHARD } from '../../historian-src/core/codec.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
export const KB_VERSION = '0.1.0';
export const COVERAGE_FILE = path.join(here, 'data/field-coverage.v1.json');
export const SCHEMA = 1;

export function build({ dataDir = path.join(root, 'legacy/dist/data'), distDir = path.join(root, 'legacy/dist'), outDir = path.join(root, 'historian-src/dist/hx'), bundle = true, dry = false, log = () => {} } = {}) {
  const t0 = Date.now();
  const stats = {};
  const site = loadSite(dataDir);
  const curated = JSON.parse(fs.readFileSync(path.join(here, 'data/aliases.v1.json'), 'utf8'));
  const scopeCfg = JSON.parse(fs.readFileSync(path.join(here, 'data/scope.v1.json'), 'utf8'));
  const srcReg = loadSources();
  const bundleProse = bundle ? extractBundleProse(distDir) : null;
  if (bundle && !bundleProse.file) site.warnings.push('bundle prose not found: ' + bundleProse.warning);

  // ---- registry, T1, card index ------------------------------------------------------------------------------------------------------------------
  const reg = buildRegistry(site, { curated });
  const kbHash = site.fp.sha256.slice(0, 12);
  const t1 = serializeT1(reg, { kb: KB_VERSION });
  const entix = buildEntityIndex(reg);
  const idx = prepareT1(t1);
  const link = createLinker(idx, entix);

  // ---- passages -----------------------------------------------------------------------------------------------------------------------------------
  const sourceFor = (p) => (p.doc.startsWith('site-bundle-prose') ? 'site-bundle-prose' : 'site-records');
  const P = finalizePassages(buildPassages(site, reg, { bundle: bundleProse, stats }), { link, reg, idx, sourceFor });
  const { buckets: ixBuckets, lexicon } = buildPostings(P);
  const enBuckets = buildEntityPostings(P);
  const clock = buildClock(site);                                        // the canonical time model's clock for every chronology event (a proposal: see lib/clock.mjs)
  const facts = buildFacts(site, reg, scopeCfg, { clock });

  // ---- emit (in memory first, to size and validate) ------------------------------------------------------------------------------------------------
  const em = new Emitter(outDir);
  const tiers = {};
  tiers.entity = em.put('entity', t1);
  tiers.entix = em.put('entix', entix);
  tiers.facts = em.put('facts', facts);
  tiers.lexicon = em.put('lexicon', lexicon);
  tiers.index = { buckets: IX_BUCKETS, hash: 'fnv1a32(stem) % 128', codec: 'json-delta-impact8', scale: lexicon.scale, files: ixBuckets.map((b) => em.put(`ix/${String(b.b).padStart(3, '0')}`, b)) };
  tiers.entpost = { buckets: EN_BUCKETS, hash: 'fnv1a32(entity id) % 32', files: enBuckets.map((b) => em.put(`en/${String(b.b).padStart(2, '0')}`, b)) };
  const nShards = Math.ceil(P.length / PER_SHARD);
  const textFiles = [];
  for (let s = 0; s < nShards; s++) textFiles.push(em.put(`tx/${String(s).padStart(4, '0')}`, { h: TX_FIELDS, p: P.slice(s * PER_SHARD, (s + 1) * PER_SHARD).map(encodePassage) }));
  tiers.text = { per_shard: PER_SHARD, fields: TX_FIELDS, files: textFiles };

  const t1Bytes = ['entity', 'entix', 'facts', 'lexicon'].map((k) => em.files.get(tiers[k].path));
  const sizes = {
    t1Raw: t1Bytes.reduce((a, b) => a + b.length, 0), t1Brotli: t1Bytes.reduce((a, b) => a + brotliSize(b), 0),
    perFile: Object.fromEntries(['entity', 'entix', 'facts', 'lexicon'].map((k) => [k, { raw: em.files.get(tiers[k].path).length, brotli: brotliSize(em.files.get(tiers[k].path)) }])),
    maxShard: Math.max(...textFiles.map((f) => f.bytes)), ixTotal: tiers.index.files.reduce((a, f) => a + f.bytes, 0), textTotal: textFiles.reduce((a, f) => a + f.bytes, 0),
    maxIx: Math.max(...tiers.index.files.map((f) => f.bytes)),
  };

  // ---- validate ----------------------------------------------------------------------------------------------------------------------------------------
  const used = [...new Set(P.map((p) => p.source_id))].sort();
  const coverage = { actual: fieldCoverage(site), baseline: fs.existsSync(COVERAGE_FILE) ? JSON.parse(fs.readFileSync(COVERAGE_FILE, 'utf8')) : null };   // K001: every whitelisted field, derived from what the loader emits
  const result = validate({ site, reg, t1, entix, passages: P, facts, sources: srcReg.sources, sizes, coverage });
  const report = {
    kb_version: KB_VERSION, data_snapshot: { sha256: site.fp.sha256, files: site.fp.files }, ok: result.ok, counts: result.counts, findings: result.findings.slice(0, 200), sizes, stats,
    warnings: site.warnings, curated_unmatched: reg.curatedApplied.filter((c) => !c.targets.length).map((c) => c.canon),
    entities: Object.fromEntries(Object.entries(t1.records.reduce((m, r) => { m[r.k] = (m[r.k] || 0) + 1; return m; }, {})).sort()),
    passages: { total: P.length, byKind: P.reduce((m, p) => { m[p.kind] = (m[p.kind] || 0) + 1; return m; }, {}), words: P.reduce((a, p) => a + (p.text.match(/\S+/g) || []).length, 0), withClockClaim: P.filter((p) => p.clk.length).length },
  };
  if (!result.ok) return { ok: false, report, ms: Date.now() - t0 };
  if (dry) return { ok: true, report, ms: Date.now() - t0, dry: true };

  // ---- write ---------------------------------------------------------------------------------------------------------------------------------------------
  fs.mkdirSync(outDir, { recursive: true });
  em.flush();
  const manifest = {
    kb_version: KB_VERSION, schema: SCHEMA, kb_hash: kbHash, time_model: clock.model,
    data_snapshot: { sha256: site.fp.sha256, files: site.fp.files, dir: 'legacy/dist/data' },
    counts: { entities: t1.records.length, passages: P.length, words: report.passages.words, terms: lexicon.terms.length, units: idx.unitKeys.size },
    tiers,
    sources: used.map((id) => { const s = srcReg.sources.get(id); return { id, tier: s.tier, passages: P.filter((p) => p.source_id === id).length, license: s.license.id }; }),
    redactions: [], eval: null, semantic: { enabled: false }, ai: { enabled: false },
    bundle_prose: bundleProse ? { file: bundleProse.file, walkthrough: bundleProse.walkthrough.length, tours: bundleProse.tours.length } : null,
  };
  const mres = writeManifest(outDir, manifest);
  fs.writeFileSync(path.join(path.dirname(outDir), 'validation-report.json'), JSON.stringify(report, null, 1));
  return { ok: true, report, manifest, manifestChanged: mres.changed, removed: mres.removed, ms: Date.now() - t0 };
}

// ---- CLI ---------------------------------------------------------------------------------------------------------------------------------------------------------
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
  const quiet = process.argv.includes('--quiet');
  if (process.argv.includes('--record-coverage')) {
    const site = loadSite(path.resolve(arg('data', path.join(root, 'legacy/dist/data'))));
    fs.writeFileSync(COVERAGE_FILE, JSON.stringify(coverageBaselineDoc(fieldCoverage(site)), null, 1) + String.fromCharCode(10));
    console.log('recorded field coverage for ' + Object.keys(fieldCoverage(site)).length + ' collections in ' + path.relative(root, COVERAGE_FILE));
    process.exit(0);
  }
  const res = build({
    dataDir: path.resolve(arg('data', path.join(root, 'legacy/dist/data'))), outDir: path.resolve(arg('out', path.join(root, 'historian-src/dist/hx'))),
    bundle: !process.argv.includes('--no-bundle'), dry: process.argv.includes('--dry'),
  });
  const r = res.report;
  if (!quiet) {
    console.log(`historian build ${res.ok ? 'OK' : 'FAILED'} in ${res.ms} ms  kb ${r.kb_version}  data ${r.data_snapshot.sha256.slice(0, 12)} (${r.data_snapshot.files} files)`);
    console.log(`  entities ${Object.values(r.entities).reduce((a, b) => a + b, 0)}  passages ${r.passages.total} (${r.passages.words} words; ${r.passages.withClockClaim} carry a clock claim)`);
    console.log('  passages by kind', JSON.stringify(r.passages.byKind));
    console.log(`  T1 ${r.sizes.t1Raw} B raw / ${r.sizes.t1Brotli} B brotli; postings ${r.sizes.ixTotal} B; text ${r.sizes.textTotal} B; largest shard ${r.sizes.maxShard} B`);
    console.log('  validator', JSON.stringify(r.counts));
    if (r.stats) console.log('  stats', JSON.stringify(r.stats));
    for (const w of r.warnings) console.log('  warning:', w);
  }
  if (!res.ok) { for (const f of r.findings.filter((x) => x.level === 'error').slice(0, 40)) console.error(`  ${f.rule} ${f.msg}`); process.exit(1); }
  if (!quiet) console.log(`  manifest ${res.dry ? '(dry run, nothing written)' : res.manifestChanged ? 'written' : 'unchanged'}${res.removed ? `; ${res.removed} stale files removed` : ''}`);
}

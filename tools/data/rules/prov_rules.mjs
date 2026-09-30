// P001-P003 provenance, L001 rights-tier gate, D001 changelog/version gate.
import fs from 'node:fs';
import path from 'node:path';
import { defineRule, V, notApplicable } from './define.mjs';
import { REPO_ROOT } from '../lib/util.mjs';
import { hashTree, contentHash, PATHS, readJsonIfExists } from '../lib/manifest.mjs';
import { fileGroups } from '../lib/load.mjs';

export function loadTiers() {
  return JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'data-src', 'policy', 'source_tiers.json'), 'utf8'));
}

export function classifySource(text, tiers = loadTiers()) {
  for (const p of tiers.patterns) if (new RegExp(p.rx, 'i').test(text)) return { id: p.id, tier: p.tier, why: p.why };
  for (const b of tiers.copyrighted_books_claimed) if (new RegExp(b.rx).test(text)) return { id: b.id, tier: 'claimed_book', why: b.note };
  return null;
}

/** Row-level source claims in shipped data: overlay monuments.json + the bundle's 512-monument array. */
export function rowSourceClaims(ctx) {
  const claims = [];
  const overlay = ctx.file('monuments.json');
  if (overlay) overlay.monuments.forEach((m, i) => claims.push({ dataset: 'monuments.json', where: `monuments[${i}]`, id: m.id, name: m.name, lat: m.lat, lng: m.lng, text: m.source }));
  const emb = ctx.getEmbedded();
  emb.monuments.forEach((m) => { if (m.src) claims.push({ dataset: 'bundle:monuments', where: `no ${m.no}`, id: `MON:${String(m.no).padStart(3, '0')}`, name: m.name, lat: m.lat, lng: m.lon, text: m.src }); });
  return claims;
}

/** Distinct free-text citation strings in metadata.sources (the 29 the audit counted). */
export function metadataSources(ctx) {
  const m = new Map();
  for (const [rel, f] of ctx.data.files) {
    for (const s of f.json?.metadata?.sources || []) {
      if (!m.has(s)) m.set(s, []);
      m.get(s).push(rel);
    }
  }
  return m;
}

const RECORD_SOURCE_KEYS = ['source', 'sources', 'src', 'citation', 'citations'];
const nonEmpty = (v) => (typeof v === 'string' ? v.trim().length > 0 : Array.isArray(v) ? v.length > 0 : false);

/**
 * A record "carries a per-record source" when it has a non-empty source/sources/src/citation(s) value or a non-empty `prov.src` list
 * (the WP-DATA-04 slim block). This is a MEASUREMENT of each record: no class is assumed to be at zero, so the day a record gains a
 * source the P001 metric moves and the ratchet asks for a tighten.
 */
export function hasRecordSource(rec) {
  if (!rec || typeof rec !== 'object') return false;
  return RECORD_SOURCE_KEYS.some((k) => nonEmpty(rec[k])) || nonEmpty(rec.prov?.src);
}

export function provenanceCoverage(ctx) {
  const emb = ctx.getEmbedded();
  const c = (name, items) => ({ name, total: items.length, sourced: items.filter(hasRecordSource).length });
  const kinds = (k) => ctx.oob.list.filter((r) => r.kind === k).map((r) => r.raw);
  const overlay = ctx.file('monuments.json');
  const succ = ctx.file('oob/commander_successions.json');
  const chronology = ctx.filesWhere(fileGroups.chronology).flatMap(([, f]) => f.json?.events ?? []);
  const vignettes = ctx.filesWhere(fileGroups.vignettes).flatMap(([, f]) => f.json?.vignettes ?? []);
  const terrain = ctx.terrain;
  return [
    c('regiments', kinds('regiment')),
    c('batteries', kinds('battery')),
    c('brigades', kinds('brigade')),
    c('divisions', kinds('division')),
    c('corps', kinds('corps')),
    c('placements', ctx.rows),
    c('chronology events', chronology),
    c('vignettes', vignettes),
    c('terrain entries', terrain ? [...terrain.key_locations, ...terrain.roads, ...terrain.structures, ...terrain.terrain_features] : []),
    c('successions', succ ? [...succ.union_successions, ...succ.confederate_successions] : []),
    c('monuments.json rows', overlay ? overlay.monuments : []),
    c('bundle monuments', emb.monuments),
  ];
}

export const rules = [
  defineRule({
    id: 'P001', sev: 'W', family: 'provenance', wp: 'WP-DATA-04', status: 'partial', dv: ['DV-24'],
    title: 'published records carry at least one source that resolves in the source registry (>= 95 % per class)', scope: 'all record classes',
    spec_baseline: 'about 1 % (42 successions + 9 + 9 monuments)', metric: true,
    note: 'partial: no source registry exists yet, so "carries a per-record source string" is the measure; every such string is claimed_only (chapter 13 WP-DATA-04).',
    run(ctx) {
      const out = [];
      for (const cls of provenanceCoverage(ctx)) {
        if (cls.total === 0) continue;
        const pct = (100 * cls.sourced) / cls.total;
        if (pct < 95) out.push(V(`class|${cls.name}`, `${cls.name}: ${cls.sourced}/${cls.total} records carry a per-record source (${pct.toFixed(1)} %)`, { kind: 'coverage', metric: { value: Number(pct.toFixed(2)), better: 'higher' }, data: cls }));
      }
      return out;
    },
  }),
  defineRule({
    id: 'P002', sev: 'E', family: 'provenance', wp: 'WP-DATA-04', status: 'partial', dv: ['DV-24'],
    title: 'every source has {id, citation, edition, licence, locator where B&M/OR}; free-text metadata.sources strings do not qualify', scope: 'metadata.sources',
    spec_baseline: '0 of 29 have locators (29 distinct citation strings = 26 works)',
    note: 'partial: counts distinct free-text citation strings; the registry (sources.yaml) is WP-DATA-04/WP-HIST-02.',
    run(ctx) {
      const out = [];
      for (const [s, files] of metadataSources(ctx)) out.push(V(`source|${s}`, `unregistered citation string (no id/edition/licence/locator), used in ${files.length} file(s): ${s.slice(0, 110)}`, { kind: 'free_text_citation', data: { files } }));
      return out;
    },
  }),
  defineRule({
    id: 'P003', sev: 'W', family: 'provenance', wp: 'WP-DATA-04', status: 'partial', dv: [],
    title: 'records carry confidence in {A,B,C} and basis in {documented, reconstructed, derived, schematic}', scope: 'placements (v2 tracks)',
    spec_baseline: 'n/a (fields do not exist)', metric: true,
    note: 'partial: measures the share of placement rows carrying a basis field (0 today).',
    run(ctx) {
      const withBasis = ctx.rows.filter((r) => r.basis).length;
      if (withBasis === ctx.rows.length) return [];
      return [V('placements|basis', `${withBasis}/${ctx.rows.length} placement rows carry basis`, { kind: 'coverage', metric: { value: withBasis, better: 'higher' } })];
    },
  }),
  defineRule({
    id: 'L001', sev: 'E', family: 'provenance', wp: 'WP-DATA-04', status: 'implemented', dv: [],
    title: 'rights-tier gate: no Tier C claimed source and no Tier B without attribution on shipped rows (legacy rows must be in the retro-audit)',
    scope: 'row-level source claims (monuments.json + the bundle monument array)',
    spec_baseline: 'exactly the 18 legacy coordinates: 8 Stone Sentinels, 4 HMDB, 6 Wikipedia (WP-HIST-02 test)',
    run(ctx) {
      const tiers = loadTiers();
      const out = [];
      for (const c of rowSourceClaims(ctx)) {
        const cls = classifySource(c.text, tiers);
        if (!cls || (cls.tier !== 'C' && cls.tier !== 'B')) continue;
        out.push(V(`${c.dataset}|${c.id}`, `${c.dataset} ${c.where} (${c.name}): claimed source is Tier ${cls.tier} (${cls.id}): ${c.text.slice(0, 80)}`, { kind: `${cls.id}`, data: { tier: cls.tier, dataset: c.dataset } }));
      }
      return out;
    },
  }),
  defineRule({
    id: 'D001', sev: 'E', family: 'release', wp: 'WP-DATA-02', status: 'implemented', dv: ['DV-29'],
    title: 'a change to any served data file needs a data_version bump and a CHANGELOG entry',
    scope: 'data tree vs data-src/version.json', spec_baseline: '0 (the legacy tree is frozen)',
    run(ctx) {
      if (ctx.data.dir === '<memory>') return notApplicable('in-memory data set: there is no tree to hash');
      const ver = readJsonIfExists(PATHS.version);
      if (!ver) return null; // guard file missing => the rule did not run => the ratchet fails (VQ-02); never a silent pass
      const out = [];
      const latest = ver.history[ver.history.length - 1];
      const now = contentHash(hashTree(ctx.dataDir));
      if (now !== latest.content_sha256) out.push(V('content_changed', `data tree hash ${now.slice(0, 12)} differs from recorded ${latest.content_sha256.slice(0, 12)} for ${latest.data_version}: bump data_version, add a CHANGELOG entry, run manifest.mjs bump`, { kind: 'content_changed' }));
      const cl = fs.existsSync(PATHS.changelog) ? fs.readFileSync(PATHS.changelog, 'utf8') : '';
      for (const h of ver.history) if (!cl.includes(`## [${h.data_version}]`)) out.push(V(`changelog|${h.data_version}`, `CHANGELOG.md has no "## [${h.data_version}]" entry`, { kind: 'missing_changelog' }));
      return out;
    },
  }),
];

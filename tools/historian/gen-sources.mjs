#!/usr/bin/env node
// gen-sources.mjs - generate docs/historian/sources.yaml (the rights / licensing register skeleton) from
//   tools/historian/data/sources.head.yaml (tiers, refused identifiers, banned hosts, the two site sources) and the two source catalogs
//   docs/plan/data/hist-sources-1.catalog.json (39 entries) and hist-sources-2.catalog.json (46 entries).
// Tier assignment is conservative: where a catalog entry mixes rights, the MOST restrictive component wins (order A < B < A-pending < C).
// Nothing is fetched here. The output is a skeleton for the owner/counsel to confirm, not legal advice.
//   node tools/historian/gen-sources.mjs [--check]     (--check fails when the committed file is out of date)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dump, parse } from './lib/yaml-lite.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const head = fs.readFileSync(path.join(here, 'data/sources.head.yaml'), 'utf8');
const c1 = JSON.parse(fs.readFileSync(path.join(root, 'docs/plan/data/hist-sources-1.catalog.json'), 'utf8'));
const c2 = JSON.parse(fs.readFileSync(path.join(root, 'docs/plan/data/hist-sources-2.catalog.json'), 'utf8'));

const RANK = { A: 0, B: 1, 'A-pending': 2, C: 3 };
const worst = (a, b) => (RANK[a] >= RANK[b] ? a : b);
const clean = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
const cap = (s, n = 400) => { const t = clean(s); return t.length > n ? t.slice(0, n - 1) + '…' : t; };
const slugify = (s) => clean(s).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').split('-').slice(0, 6).join('-');

// ---- slug overrides (chapter 14 D.2 wave ids) ------------------------------------------------------------------------------------------------
const SLUG1 = { 'SRC-01': 'or27-1', 'SRC-02': 'or27-2', 'SRC-06': 'or27-3', 'SRC-03': 'nyfr', 'SRC-04': 'pa-at-gettysburg', 'SRC-05': 'fox-1889', 'SRC-07': 'battles-leaders-3', 'SRC-08': 'shsp', 'SRC-09': 'loc-bachelder-maps',
  'SRC-10': 'loc-cw-photos', 'SRC-11': 'itinerary-aop', 'SRC-12': 'clark-nc-regiments', 'SRC-13': 'jccw-1865', 'SRC-14': 'maine-at-gettysburg', 'SRC-15': 'nj-final-report', 'SRC-16': 'michigan-at-gettysburg', 'SRC-17': 'minnesota-civil-war',
  'SRC-18': 'bates-pa-volunteers', 'SRC-19': 'phisterer-ny', 'SRC-20': 'dyer-compendium-1908', 'SRC-22': 'gnmp-monument-lists', 'SRC-23': 'period-guides', 'SRC-24': 'confederate-memoirs', 'SRC-27': 'the-compiler', 'SRC-28': 'chronicling-america',
  'SRC-30': 'nara-rg77-maps', 'SRC-21': 'livermore-1901', 'SRC-25': 'confederate-military-history', 'SRC-26': 'small-state-reports', 'SRC-29': 'gettysburg-address-mss', 'SRC-31': 'gutenberg-gettysburg', 'SRC-32': 'wikimedia-commons-s1',
  'SRC-33': 'nps-history-elibrary', 'SRC-34': 'hathitrust-metadata', 'SRC-35': 'confederate-veteran', 'SRC-36': 'gardner-sketch-book', 'SRC-37': 'rumsey-maps', 'SRC-38': 'ehistory-or-transcriptions' };
// S1 catalog ids: note the catalog numbering (SRC-34 = Confederate Veteran, SRC-36 = HathiTrust) follows the source list of hist-sources-1
const SLUG1_FIX = { 'SRC-36': 'hathitrust-metadata', 'SRC-34': 'confederate-veteran' };
const SLUG2 = { 'SRC-19': 'or27-s2', 'SRC-20': 'fox-s2', 'SRC-21': 'dyer-s2', 'SRC-22': 'state-at-gettysburg-volumes', 'SRC-23': 'civilian-narratives', 'SRC-24': 'jacobs-weather-1863', 'SRC-25': 'soldiers-national-cemetery-reports',
  'SRC-09': 'cwss-website', 'SRC-10': 'cwss-bulk-snapshot', 'SRC-39': 'hmdb', 'SRC-40': 'american-battlefield-trust', 'SRC-41': 'stone-sentinels', 'SRC-42': 'gettysburg-college-achs', 'SRC-34': 'wikipedia', 'SRC-35': 'wikidata', 'SRC-36': 'wikimedia-commons',
  'SRC-38': 'openstreetmap', 'SRC-14': 'fold3-ancestry', 'SRC-44': 'ut-austin-or-corpus', 'SRC-29': 'usgs-3dep', 'SRC-30': 'usgs-topo', 'SRC-31': 'mapbox-terrain-dem' };
const WAVE = { 'or27-1': 'W1', 'or27-2': 'W1', 'or27-3': 'W1', nyfr: 'W2a', 'pa-at-gettysburg': 'W2b', 'fox-1889': 'W2c', 'maine-at-gettysburg': 'W4a', 'nj-final-report': 'W4a', 'michigan-at-gettysburg': 'W4a', 'minnesota-civil-war': 'W4a',
  'battles-leaders-3': 'W3a', 'jccw-1865': 'W3b', 'confederate-memoirs': 'W3d', shsp: 'W3c', 'clark-nc-regiments': 'W4b', 'bates-pa-volunteers': 'W4b', 'phisterer-ny': 'W4b', 'dyer-compendium-1908': 'W4b', 'itinerary-aop': 'W4b',
  'chronicling-america': 'W5', 'period-guides': 'W5', 'civilian-narratives': 'W5', 'jacobs-weather-1863': 'W5', 'wikipedia': 'W6', 'wikidata': 'W6', 'wikimedia-commons': 'W6', openstreetmap: 'W6', 'loc-cw-photos': 'W6', 'cwss-bulk-snapshot': 'rosters' };

// ---- per-entry tier decisions --------------------------------------------------------------------------------------------------------------------
function tierFromS1(e) {
  const st = clean(e.license && e.license.status).toLowerCase();
  if (/non-?commercial/.test(st)) return 'C';
  if (/unverified/.test(st)) return 'C';
  if (/^mixed/.test(st)) return 'A-pending';
  if (/^(public domain|no known restrictions|rights codes)/.test(st)) return 'A';
  if (/per-item|n\/a/.test(st)) return 'A-pending';
  return 'A-pending';
}
function tierFromS2(e) {
  const t = clean(e.rights_tier);
  if (!t || t === 'n/a') return null;
  let tier = 'A';
  if (/A-pending/.test(t)) tier = worst(tier, 'A-pending');
  if (/\bB\b/.test(t)) tier = worst(tier, 'B');
  if (/\bC\b/.test(t)) tier = worst(tier, 'C');
  if (/^A\/B/.test(t)) tier = worst(tier, 'B');
  return tier;
}
// catalog 1 lists urls as [{url, ...}], catalog 2 as {label: "https://... (note)"}
const urlList = (urls) => {
  const out = [];
  const add = (t) => { const m = String(t || '').match(/https?:\/\/[^\s)]+/); if (m) out.push({ url: m[0] }); };
  if (Array.isArray(urls)) urls.forEach((u) => add(u && u.url)); else if (urls && typeof urls === 'object') Object.values(urls).forEach(add);
  return out;
};
const hostsOf = (urls) => [...new Set(urlList(urls).map((u) => { try { return new URL(u.url).hostname.replace(/^www\./, ''); } catch { return null; } }).filter(Boolean))].sort();
const iaId = (urls) => { for (const u of urlList(urls)) { const m = String(u.url).match(/archive\.org\/details\/([A-Za-z0-9_.\-]+)/); if (m) return m[1]; } return null; };
const yearOf = (s) => { const m = String(s || '').match(/\b(1[5-9]\d\d|20\d\d)\b/); return m ? +m[1] : null; };
const proxyOf = (s) => { const m = String(s || '').match(/\b0\.\d{2,3}\b/); return m ? +m[0] : null; };
const ATTR = { wikipedia: 'Source: Wikipedia, "<title>", revision <revid>, CC BY-SA 4.0. Excerpted/condensed.', openstreetmap: '© OpenStreetMap contributors, ODbL 1.0', 'cwss-bulk-snapshot': null };
const TEXT_GENRES = /official|participant|state|regimental|testimony|reference|guides|narrative|newspaper|primary|unit|secondary|memoir|monument|statistics|addresses|clean_text/i;

function entry({ id, xref, title, tier, tierDetail, licenseId, statementText, statementUrl, imprint, affiliation, genre, ocr, archiveUrl, hosts, notes, urls }) {
  const isText = TEXT_GENRES.test(genre || '');
  return {
    id, xref, title: cap(title, 240), tier, tier_detail: cap(tierDetail, 500),
    license: { id: licenseId, statement_text: cap(statementText, 300), statement_url: statementUrl || null, verified_at: null, reviewer: null },
    imprint, author_affiliation: affiliation || null,
    attribution: tier === 'B' ? (ATTR[id] || 'Attribution required: see statement_text') : null,
    may_index: tier === 'A' || tier === 'B',
    may_redistribute: tier === 'A' || tier === 'B',
    may_send_to_llm: tier === 'A' && isText,
    genre: genre || null, scope_default: 'core', ocr, archive_url: archiveUrl || null, hosts,
    status: tier === 'C' ? 'link-out' : tier === 'A-pending' ? 'blocked-until-confirmed' : 'planned', wave: WAVE[id] || null,
    notes: cap(notes, 500),
  };
}

const seen = new Set(['site-records', 'site-bundle-prose']);
const out = [];
const uniqueId = (id) => { let x = id, i = 2; while (seen.has(x)) x = `${id}-${i++}`; seen.add(x); return x; };

for (const e of c1.sources) {
  if (e.category === 'infrastructure_api') continue; // IA access APIs are tooling, not a source
  const slug = uniqueId(SLUG1_FIX[e.id] || SLUG1[e.id] || slugify(e.name));
  const tier = tierFromS1(e);
  const ia = iaId(e.urls);
  out.push(entry({
    id: slug, xref: { hs1: e.id, hs2: null }, title: e.name, tier, tierDetail: clean(e.license && (e.license.status + ' | ' + e.license.basis)),
    licenseId: tier === 'A' ? (/US Government|17 U\.S\.C\. 105/i.test(e.license.basis) ? 'PD-US-Gov' : 'PD-pre-1931-proposed') : tier === 'C' ? 'RESTRICTED-LINK-OUT' : 'PENDING-CONFIRMATION',
    statementText: e.license && e.license.statement_text, statementUrl: e.license && e.license.statement_url,
    imprint: { year: yearOf(e.publisher_year), publisher: cap(e.publisher_year, 120), reprint: /reprint|1971|1959|1984/i.test(e.name + ' ' + (e.publisher_year || '')) && !/never|not the|original/i.test(e.name), ia_id: ia },
    affiliation: null, genre: e.category, ocr: { engine: null, proxy: proxyOf(e.ocr_quality), gate: 'accept' }, archiveUrl: ia ? `https://archive.org/details/${ia}` : (urlList(e.urls)[0] || {}).url || null,
    hosts: hostsOf(e.urls), notes: `expected records: ${cap(e.expected_records, 160)}; ${cap(e.quality_notes, 240)}`, urls: e.urls,
  }));
}
for (const e of c2.sources) {
  const tier = tierFromS2(e);
  if (!tier) continue;
  const slug = uniqueId(SLUG2[e.id] || slugify(e.name));
  const ia = iaId(e.urls);
  out.push(entry({
    id: slug, xref: { hs1: null, hs2: e.id }, title: e.name, tier, tierDetail: clean(e.rights_tier) + ' | ' + cap(e.license_rights, 260),
    licenseId: tier === 'A' ? 'PD-or-CC0-per-catalog' : tier === 'B' ? 'ATTRIBUTION-OR-SHARE-ALIKE' : tier === 'C' ? 'RESTRICTED-LINK-OUT' : 'PENDING-CONFIRMATION',
    statementText: e.license_rights, statementUrl: e.rights_statement_url,
    imprint: { year: null, publisher: cap(e.publisher, 120), reprint: false, ia_id: ia }, affiliation: /NPS|National Park Service/i.test(e.publisher || '') ? 'NPS (federal employee vs contractor to be confirmed per document)' : null,
    genre: e.category, ocr: { engine: null, proxy: null, gate: 'n/a' }, archiveUrl: ia ? `https://archive.org/details/${ia}` : (urlList(e.urls)[0] || {}).url || null, hosts: hostsOf(e.urls),
    notes: `${cap(e.risks, 260)}`, urls: e.urls,
  }));
}
// the fetcher's host ban list must cover every Tier C host
const banned = new Set(parse(head).banned_hosts || []);
for (const x of out) if (x.tier === 'C') for (const h of x.hosts) if (!banned.has(h) && !/^(archive\.org|loc\.gov)$/.test(h)) banned.add(h);

const yaml = head.replace(/\s*$/, '\n') + dump(out, 2);
const target = path.join(root, 'docs/historian/sources.yaml');
// re-write banned_hosts in the head with the union (kept sorted) so the fetch gate covers every Tier C host
const merged = yaml.replace(/banned_hosts:\n(?:  - .*\n)+/, 'banned_hosts:\n' + [...banned].sort().map((h) => `  - ${h}`).join('\n') + '\n');
if (process.argv.includes('--check')) {
  const cur = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
  if (cur !== merged) { console.error('docs/historian/sources.yaml is out of date: run node tools/historian/gen-sources.mjs'); process.exit(1); }
  console.log('sources.yaml up to date'); process.exit(0);
}
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, merged);
const tiers = {}; for (const x of out) tiers[x.tier] = (tiers[x.tier] || 0) + 1;
console.log(`wrote ${path.relative(root, target)}: ${out.length + 2} sources (site 2 + catalogs ${out.length}); tiers`, JSON.stringify(tiers), '; banned hosts', banned.size);

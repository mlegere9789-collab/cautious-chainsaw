#!/usr/bin/env node
// Rights retro-audit of ALREADY-SHIPPED rows (WP-DATA-04 step 4 / WP-DATA-05 inputs).
//   node tools/data/rights_audit.mjs            writes docs/data/rights-audit.md and data-src/build/legacy-rights-audit.csv
//   node tools/data/rights_audit.mjs --check    fails if either committed file is stale
// Facts (counts, line numbers, verbatim claimed-source strings) are MEASURED from the legacy tree and the deployed bundle.
// Tiers follow docs/plan/specialists/hist-sources-2.md section 3 and data-src/policy/source_tiers.json; `action` values are
// PROPOSALS for the owner and counsel (D-LEGAL step 3), never decisions. Nothing here is legal advice.
import fs from 'node:fs';
import path from 'node:path';
import { buildContext } from './lib/context.mjs';
import { classifySource, loadTiers, metadataSources, rowSourceClaims } from './rules/prov_rules.mjs';
import { walkStrings, REPO_ROOT } from './lib/util.mjs';
import { hashTree } from './lib/manifest.mjs';

const OUT_MD = path.join(REPO_ROOT, 'docs', 'data', 'rights-audit.md');
const OUT_CSV = path.join(REPO_ROOT, 'data-src', 'build', 'legacy-rights-audit.csv');

const esc = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const table = (h, rows) => [`| ${h.join(' | ')} |`, `|${h.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.map(esc).join(' | ')} |`)].join('\n');
const csvCell = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;

// work grouping for the 29 citation strings (26 works). Tier tags are claimed-only.
const WORKS = [
  { id: 'OR27', rx: /^OR Vol\. 27/, tier: 'A', tag: 'A (US Government work)', risk: 'low', action: 'keep; cite volume + page (P002)', note: 'Official Records, Ser. I vol. 27; the only Tier A source cited' },
  { id: 'DAWES1890', rx: /^Dawes/, tier: 'A', tag: 'A (published 1890; counsel to confirm the pre-1931 basis)', risk: 'low', action: 'keep; cite page', note: '' },
  { id: 'OATES1905', rx: /^Oates/, tier: 'A', tag: 'A (published 1905; counsel to confirm)', risk: 'low', action: 'keep; cite page', note: '' },
  { id: 'USGS', rx: /^USGS/, tier: 'A', tag: 'A (USGS: free of charge and without use restrictions per chapter 13 pagesB-36)', risk: 'low', action: 'keep; record dataset + retrieval date (WP-DATA-14)', note: 'cited without dataset, resolution or date' },
  { id: 'BM', rx: /Busey/, tier: 'claimed_book', tag: 'copyrighted compilation; facts-only + attribution (Q-DATA-3); NOT Tier A', risk: 'high', action: 'keep facts-only, attribute with edition and page, re-source Union figures from OR No. 13/15 and Fox (WP-DATA-08); counsel review before any open licence (D-LEGAL step 3)', note: 'three spellings; the 1994 edition is cited everywhere while the audit found the Confederate totals attributed to the 2005 work (edition unresolved)' },
  { id: 'GOOGLE', rx: /^Google Maps/, tier: 'C-like', tag: 'proprietary imagery; a verification claim, not a source', risk: 'medium', action: 'remove the claim or replace with 3DEP/GNIS/HABS validation; counsel packet (WP-DATA-05 step 4)', note: 'no record says which coordinates were "verified", so the claim cannot be audited' },
  { id: 'GOTTFRIED-MAPS', rx: /Maps of Gettysburg/, tier: 'claimed_book', tag: 'copyrighted atlas; claimed source for terrain positions', risk: 'medium', action: 'claimed_only; coordinates are facts; validate against DEM/HABS/GNIS and drop reliance (WP-DATA-14)', note: 'chapter 13 WP-09 records a year correction (2013 -> 2007) that was not verified here' },
  { id: 'LAINO', rx: /Laino/, tier: 'claimed_book', tag: 'copyrighted atlas; claimed source for terrain positions', risk: 'medium', action: 'as Gottfried atlas', note: '' },
  { id: 'DESJARDIN-MAP', rx: /Battlefield at Gettysburg \(Map\)/, tier: 'claimed_book', tag: 'copyrighted map; claimed source for terrain positions', risk: 'medium', action: 'as Gottfried atlas', note: '' },
];
const workOf = (s) => {
  for (const w of WORKS) if (w.rx.test(s)) return w;
  if (/Pfanz trilogy/.test(s)) return { id: 'PFANZ-TRILOGY', tier: 'claimed_book', tag: 'copyrighted books (three works under one string); bibliographic citation only', risk: 'low', action: 'split into three sources with edition and page (WP-DATA-04)', note: '"Pfanz trilogy" has no edition or page' };
  const [author, rest = ''] = s.split(' -- ');
  const title = rest.replace(/\(.*$/, '').trim().split(/\s+/).slice(0, 4).join(' ');
  return { id: `${author.split(',')[0]}: ${title}`.replace(/[^A-Za-z0-9: ]+/g, '').trim(), tier: 'claimed_book', tag: 'copyrighted book; bibliographic citation only (claimed)', risk: 'low', action: 'keep as a claimed source; never copy wording; add edition + page when a value is re-sourced', note: '' };
};

export function buildAudit(ctx = buildContext({})) {
  const emb = ctx.getEmbedded();
  const tiers = loadTiers();
  const claims = rowSourceClaims(ctx).map((c) => ({ ...c, cls: classifySource(c.text, tiers) })).filter((c) => c.cls && ['B', 'C'].includes(c.cls.tier));
  const lineOf = (c) => {
    if (c.dataset !== 'bundle:monuments') return null;
    const no = Number(c.where.replace('no ', ''));
    const idx = emb.monuments.findIndex((m) => m.no === no);
    return emb.monumentItems?.[idx]?.props?.src ?? null;
  };
  const coordRows = claims.map((c) => {
    const cls = c.cls;
    const action = cls.id === 'stone-sentinels' ? 'replace' : cls.id === 'hmdb' ? 'credit' : 'credit';
    const why = cls.id === 'stone-sentinels'
      ? 'Tier C: (c) Steve A. Hawks, no reuse licence found; coordinates are facts but the claimed derivation is a read of a copyrighted compilation. Replace with an independently corroborated value (NPS list, OSM, on-site) and keep the row `legacy` until then.'
      : cls.id === 'hmdb'
        ? 'HMdb.org copyright page allows copying with attribution for non-commercial use and requires written permission for commercial use (any compensation). Credit now ("Coordinates from HMdb.org marker <n>") and replace when corroborated; remove if the site ever sells or carries ads.'
        : 'Tier B: Wikipedia text is CC BY-SA 4.0 (attribution + share-alike); the coordinate itself is a fact. Add an attribution surface (/sources) or replace with an NPS/USGS/OSM-corroborated value.';
    return { dataset: c.dataset, where: c.where, line: lineOf(c), id: c.id, name: c.name, lat: c.lat, lng: c.lng, claimed: c.text, tier: cls.tier, tier_id: cls.id, risk: cls.tier === 'C' ? 'medium' : 'low-medium', action, why };
  });

  // Busey and Martin dependency, measured per OOB file
  const bmFiles = [];
  for (const [rel, f] of ctx.data.files) {
    if (!rel.startsWith('oob/') && rel !== 'casualty_apportionment.json' && !/^chronology_|^vignettes_|^terrain/.test(rel)) continue;
    const sources = f.json?.metadata?.sources ?? null;
    const claimsBM = (sources || []).some((s) => /Busey/.test(s));
    const recs = ctx.oob.list.filter((r) => r.file === rel);
    const numeric = recs.reduce((a, r) => a + ['strength', 'casualties', 'casualty_percentage'].filter((k) => typeof r.raw[k] === 'number').length, 0);
    bmFiles.push({ rel, declared: sources !== null, claimsBM, records: recs.length, numericFields: numeric });
  }
  const bmRegRecords = ctx.oob.list.filter((r) => (r.kind === 'regiment' || r.kind === 'battery') && ctx.file(r.file)?.metadata?.sources?.some((s) => /Busey/.test(s)));
  const undeclaredRegs = ctx.oob.list.filter((r) => (r.kind === 'regiment') && !(ctx.file(r.file)?.metadata?.sources));

  const sourceStrings = [...metadataSources(ctx)].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([s, files]) => ({ text: s, files, work: workOf(s) }));

  const yt = [];
  for (const [rel, f] of ctx.data.files) for (const [p, t] of walkStrings(f.json)) if (/YouTube/.test(t)) yt.push({ rel, path: p, text: t });

  const dataFiles = hashTree(ctx.dataDir).map((e) => {
    const f = ctx.data.files.get(e.path);
    const j = f.json;
    let records = 0;
    for (const k of ['placements', 'regiments', 'brigades', 'divisions', 'corps', 'events', 'vignettes', 'key_locations', 'monuments', 'union_corps', 'union_successions']) if (Array.isArray(j[k])) records += j[k].length;
    if (e.path.startsWith('oob/')) records = ctx.oob.list.filter((r) => r.file === e.path).length || records;
    const src = j.metadata?.sources ?? null;
    const claimsBM = (src || []).some((s) => /Busey/.test(s));
    const group = /^placements_/.test(e.path) ? 'placements' : /^density_/.test(e.path) ? 'density' : e.path.startsWith('oob/') ? 'oob' : e.path.replace(/\.json$/, '');
    let tag, risk, action;
    if (group === 'placements' || group === 'density') { tag = 'legacy-unverified: positions with no declared source; derivation of keyframes not established (Q-DATA-7)'; risk = 'high'; action = 'keep as legacy; re-source through the keyframe campaign (WP-DATA-12); exclude from any open dataset until counsel clears (D-LICENSE refinement)'; }
    else if (group === 'oob') { tag = claimsBM ? 'legacy; numeric fields claimed from Busey and Martin (facts-only)' : src ? 'legacy; claimed sources declared, B&M not named' : 'legacy-unverified: no sources declared'; risk = claimsBM || !src ? 'high' : 'medium'; action = 'keep facts-only, attribute, re-source numerics (WP-DATA-08); commander/fate prose is owner-authored'; }
    else if (group === 'terrain') { tag = 'legacy; positions claimed from copyrighted atlases + a satellite "verification"'; risk = 'medium'; action = 'credit as claimed; validate against 3DEP/GNIS/HABS (WP-DATA-14); counsel for the satellite claim'; }
    else if (group === 'monuments') { tag = 'legacy; 9 rows, all cite Wikipedia (6, Tier B) or Stone Sentinels (3, Tier C)'; risk = 'medium'; action = 'see section 1: 3 replace, 6 credit'; }
    else if (group === 'casualty_apportionment') { tag = 'legacy; cites Busey and Martin + OR; corps totals unexplained'; risk = 'high'; action = 'keep facts-only; re-base on the authority table (WP-DATA-08)'; }
    else if (group === 'placement_schema') { tag = 'documentation; not read by any page; cites "GPS accuracy" for rounded positions'; risk = 'low'; action = 'remove from the publish tree (WP-DATA-09)'; }
    else if (/^chronology/.test(group)) { tag = claimsBM || src ? 'legacy; owner-authored prose, claimed sources include Busey and Martin' : 'legacy'; risk = 'medium'; action = 'keep; source the 45 critical events first (WP-DATA-24)'; }
    else if (/^vignettes/.test(group)) { tag = 'legacy; owner-authored narrative; quotations and the "51,000" figure need adjudication'; risk = 'medium'; action = 'keep; source and review (WP-DATA-23/24)'; }
    else { tag = 'legacy'; risk = 'medium'; action = 'review'; }
    return { path: e.path, bytes: e.bytes, records, declared: src !== null, claimsBM, tag, risk, action };
  });

  const bundleSets = [
    { dataset: 'bundle:monuments (_A)', lines: `${emb.monumentsLoc.start}-${emb.monumentsLoc.end}`, records: emb.monuments.length, claimed: `${emb.monuments.filter((m) => m.src).length} rows carry a src string; ${emb.monuments.filter((m) => !m.src).length} carry none`, tier: 'legacy-unverified (origin of the 512-row list unknown, Q-DATA-7)', risk: 'medium', action: 'keep facts-only; id_src from the NPS 1907/1932 lists and coordinate validation against OSM (separate ODbL file) in WP-DATA-15; do NOT delete from the legacy bundle (not on the closed Tranche 0 list)' },
    { dataset: 'bundle:story markers (mA)', lines: `${emb.storyLoc.start}-${emb.storyLoc.end}`, records: emb.story.length, claimed: 'none', tier: 'owner-authored', risk: 'low', action: 'keep; move to data (WP-DATA-16)' },
    { dataset: 'bundle:tour stops (d2)', lines: `${emb.tourLoc.start}-${emb.tourLoc.end}`, records: emb.tour.length, claimed: 'video links to nps.gov; Street View parameters (Google)', tier: 'owner-authored text; third-party embeds', risk: 'medium', action: 'keep; Street View/Maps terms and the API key are chapter 09 / D-LEGAL' },
  ];

  return { coordRows, bmFiles, bmRegRecords: bmRegRecords.length, undeclaredRegs: undeclaredRegs.length, sourceStrings, yt, dataFiles, bundleSets, emb };
}

export function renderMarkdown(a) {
  const L = [];
  L.push('# Rights retro-audit of already-shipped data');
  L.push('');
  L.push('Generated by `tools/data/rights_audit.mjs` (WP-DATA-04 step 4, inputs to WP-DATA-05). Facts below (counts, line numbers, verbatim source strings) are measured from `legacy/dist/data` and the deployed bundle `legacy/analysis/bundle.pretty.js`. **Actions are proposals** for the owner and counsel (D-LEGAL step 3); nothing here is legal advice and no decision has been made. Regenerate with `node tools/data/rights_audit.mjs`.');
  L.push('');
  L.push('## Tier tags used');
  L.push('');
  L.push(table(['Tag', 'Meaning (register / hist-sources-2 section 3)'], [
    ['A', 'public domain, CC0 or notice-only: may be ingested and redistributed'],
    ['B', 'reusable with attribution and/or share-alike (Wikipedia CC BY-SA 4.0, OSM ODbL): separate files, per-record licence and an attribution surface'],
    ['C', 'link-out only: never fetch, store, embed or feed to a model (Stone Sentinels, HMDB bulk, ABT, Ancestry family, ACHS)'],
    ['A-pending', 'believed public, needs written confirmation'],
    ['legacy', 'shipped before the gate existed; passes rule L001 only after it is listed here with a decided action (until DG-3)'],
    ['claimed_only', 'a citation string nobody has checked against the source (chapter 13 section 2.4)'],
    ['claimed_book', 'a copyrighted book named as a source: facts-only, bibliographic citation, never its tables or wording'],
  ]));
  L.push('');
  L.push('## 1. The 18 legacy monument coordinates (rule L001)');
  L.push('');
  const by = {};
  for (const r of a.coordRows) by[r.tier_id] = (by[r.tier_id] || 0) + 1;
  L.push(`Rule L001 lists exactly ${a.coordRows.length} rows: ${by['stone-sentinels']} Stone Sentinels (Tier C), ${by.hmdb} HMDB (Tier C for bulk use), ${by.wikipedia} Wikipedia (Tier B). Sources are shown verbatim as shipped. No attribution surface exists on the site for any of them.`);
  L.push('');
  L.push(table(['#', 'Dataset', 'Where', 'Bundle line', 'Name', 'lat, lng', 'Claimed source (verbatim)', 'Tier', 'Risk', 'Proposed action'],
    a.coordRows.map((r, i) => [i + 1, r.dataset, r.where, r.line ? `:${r.line}` : '-', r.name, `${r.lat}, ${r.lng}`, r.claimed, r.tier, r.risk, r.action])));
  L.push('');
  L.push('Reasoning per source:');
  L.push('');
  for (const id of ['stone-sentinels', 'hmdb', 'wikipedia']) L.push(`- **${id}** (${by[id]} rows): ${a.coordRows.find((r) => r.tier_id === id).why}`);
  L.push('');
  L.push('Not verified here: the HMdb.org and Stone Sentinels terms were not re-read by this workstream (HMDB returns HTTP 403 to automated fetch); the statements above are those recorded in `docs/plan/specialists/hist-sources-2.md`.');
  L.push('');
  L.push('## 2. Busey and Martin dependency');
  L.push('');
  L.push(`Busey and Martin, *Regimental Strengths and Losses at Gettysburg*, is named as a source in ${a.bmFiles.filter((f) => f.claimsBM && f.rel.startsWith('oob/')).length} OOB files (chapter 13: 11) and ${a.bmFiles.filter((f) => f.claimsBM && !f.rel.startsWith('oob/')).length} other data files, in three spellings. The per-regiment figures the site shows (strength, casualties, casualty_percentage) are that book's core table content. ${a.bmRegRecords} regiment/battery records sit in files that claim it; a further ${a.undeclaredRegs} Confederate regiment records sit in three files that declare **no source at all**. Chapter 13 (hist-sources-1-04): no public-domain source exists for Confederate regimental strength, so those figures stay B&M-derived, attributed, facts-only and \`estimated\`. The register default (Q-DATA-3, owner decision pending): B&M as facts-only with attribution; the open dataset excludes B&M-derived per-regiment numbers and positions until counsel clears them (D-LEGAL step 3).`);
  L.push('');
  L.push(table(['File', 'Declares sources', 'Names B&M', 'OOB records', 'Numeric fields (strength/casualties/pct)'], a.bmFiles.map((f) => [f.rel, f.declared ? 'yes' : 'NO', f.claimsBM ? 'yes' : 'no', f.records || '-', f.numericFields || '-'])));
  L.push('');
  L.push('Proposed handling (all pending owner/counsel): keep the figures as facts with `auth/basis/edition/page`; re-base Union totals on OR No. 13/15 and Fox (WP-DATA-08); never reproduce the book\'s tables or wording; resolve the edition (site cites 1994, the audit found Confederate totals attributed to the 2005 work: `data-src/authorities/authorities.json`).');
  L.push('');
  L.push('## 3. The 29 citation strings (26 works)');
  L.push('');
  L.push('Every string is `claimed_only`: none has an id, edition, page, locator or licence (rule P002: 29 violations).');
  L.push('');
  L.push(table(['#', 'Citation string (verbatim)', 'Files', 'Work', 'Tier tag', 'Risk', 'Proposed action', 'Note'],
    a.sourceStrings.map((s, i) => [i + 1, s.text, s.files.length, s.work.id, s.work.tag, s.work.risk, s.work.action, s.work.note])));
  L.push('');
  L.push('## 4. Other mandatory rows');
  L.push('');
  L.push(table(['Item', 'Measured', 'Tier tag', 'Risk', 'Proposed action'], [
    ['Atlas-derived terrain (terrain.json cites Desjardin map, Gottfried atlas, Laino atlas)', 'terrain.json: 30 key locations, 8 roads, 8 structures, 4 features; roads have one point each', 'legacy; claimed_book x3', 'medium', 'credit as claimed; validate against 3DEP/GNIS/HABS and drop the reliance (WP-DATA-14)'],
    ['"Google Maps / satellite imagery verification" (terrain.json metadata)', 'one string; no record says what was verified', 'claimed_only; proprietary imagery', 'medium', 'remove the claim or replace with a cited validation; one counsel packet (WP-DATA-05 step 4)'],
    [`"Gettysburg Animated YouTube vignette" strings`, `${a.yt.length} strings in ${new Set(a.yt.map((y) => y.rel)).size} files: ${a.yt.map((y) => `${y.rel} ${y.path}`).join('; ')}`, 'legacy-unverified: derivation from a paid animated-map app or a video channel is an owner question (Q-DATA-7, register action 10a)', 'high', 'neutralise the wording in WP-DATA-09 regardless; if the owner says positions or text came from that source, mark those anchors for re-sourcing (WP-DATA-12); if unanswerable mark `legacy-unverified`'],
    [`Unsourced monuments (bundle array)`, `${a.emb.monuments.filter((m) => !m.src).length} of ${a.emb.monuments.length} rows have no src`, 'legacy-unverified (origin of the list unknown)', 'medium', 'id_src from NPS 1907/1932 lists where matchable; coordinate validation only against OSM (ODbL, separate file); WP-DATA-15'],
    ['Position rows (placements_*, density_*)', '1,804 rows in 47 files, none declares a source; 59 of 73 tick-1 rows are schematic staging', 'legacy-unverified', 'high', 'legacy until re-sourced; excluded from any open dataset until counsel clears (WP-DATA-05)'],
  ]));
  L.push('');
  L.push('### The "YouTube vignette" strings, verbatim');
  L.push('');
  L.push(table(['File', 'Path', 'Text'], a.yt.map((y) => [y.rel, y.path, y.text])));
  L.push('');
  L.push('## 5. Datasets embedded in the deployed bundle');
  L.push('');
  L.push(table(['Dataset', 'Bundle lines', 'Records', 'Claimed sources', 'Tier tag', 'Risk', 'Proposed action'], a.bundleSets.map((b) => [b.dataset, b.lines, b.records, b.claimed, b.tier, b.risk, b.action])));
  L.push('');
  L.push('Not audited here (not extracted this round): the tutorial steps, timeline markers and road GeoJSON named in chapter 13 WP-DATA-04; the Google Maps key constant that follows the monument array is a security item (chapter 09), not a data-rights item, and is deliberately not reproduced anywhere in this repository\'s generated files.');
  L.push('');
  L.push('## 6. One row per shipped data file');
  L.push('');
  L.push(table(['File', 'Bytes', 'Records', 'Declares sources', 'Tier tag', 'Risk', 'Proposed action'], a.dataFiles.map((d) => [d.path, d.bytes, d.records || '-', d.declared ? 'yes' : 'no', d.tag, d.risk, d.action])));
  L.push('');
  L.push('## 7. Decisions still needed (owner / counsel)');
  L.push('');
  L.push('- Q-DATA-7: were any keyframes, notes or text derived from the paid animated-map app or the YouTube channel named in the strings above? (default: `legacy-unverified` and re-source)');
  L.push('- Q-DATA-3: Busey and Martin as facts-only with attribution; edition to be opened and recorded (H-01).');
  L.push('- D-LEGAL step 3: one counsel packet for B&M-derived figures, the satellite-imagery claim and the open dataset licence.');
  L.push('- D-CWSS: roster data stays link-out (no CWSS data is shipped today).');
  L.push('');
  return L.join('\n') + '\n';
}

export function renderCsv(a) {
  const head = ['section', 'dataset', 'item', 'bundle_line', 'claimed_source', 'tier', 'risk', 'action', 'action_status', 'note'];
  const rows = [];
  for (const r of a.coordRows) rows.push(['coordinate', r.dataset, `${r.where} ${r.name} (${r.lat}, ${r.lng})`, r.line ?? '', r.claimed, r.tier, r.risk, r.action, 'proposed', r.why]);
  for (const s of a.sourceStrings) rows.push(['citation', 'metadata.sources', s.text, '', s.text, s.work.tier, s.work.risk, s.work.action, 'proposed', s.work.note]);
  for (const y of a.yt) rows.push(['derivation_string', y.rel, y.path, '', y.text, 'legacy-unverified', 'high', 'neutralise wording; owner question Q-DATA-7', 'proposed', '']);
  for (const b of a.bundleSets) rows.push(['bundle_dataset', b.dataset, `${b.records} records`, b.lines, b.claimed, b.tier, b.risk, b.action, 'proposed', '']);
  for (const d of a.dataFiles) rows.push(['data_file', d.path, `${d.records} records, ${d.bytes} bytes`, '', d.declared ? 'declares metadata.sources' : 'declares none', d.tag, d.risk, d.action, 'proposed', '']);
  return [head.join(','), ...rows.map((r) => r.map(csvCell).join(','))].join('\n') + '\n';
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
if (isMain) {
  const a = buildAudit();
  const md = renderMarkdown(a);
  const csv = renderCsv(a);
  if (process.argv.includes('--check')) {
    const bad = [];
    if (!fs.existsSync(OUT_MD) || fs.readFileSync(OUT_MD, 'utf8') !== md) bad.push('docs/data/rights-audit.md');
    if (!fs.existsSync(OUT_CSV) || fs.readFileSync(OUT_CSV, 'utf8') !== csv) bad.push('data-src/build/legacy-rights-audit.csv');
    if (bad.length) { console.error(`STALE: ${bad.join(', ')} (run node tools/data/rights_audit.mjs)`); process.exit(1); }
    console.log('rights audit up to date');
  } else {
    fs.mkdirSync(path.dirname(OUT_MD), { recursive: true });
    fs.writeFileSync(OUT_MD, md, 'utf8');
    fs.writeFileSync(OUT_CSV, csv, 'utf8');
    console.log(`wrote ${path.relative(REPO_ROOT, OUT_MD)} (${md.length} bytes) and ${path.relative(REPO_ROOT, OUT_CSV)}`);
  }
}

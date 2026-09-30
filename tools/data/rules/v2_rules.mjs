// The 8 v2 rules of chapter 13 section 5 (D002, M001, E001, U001, H001, P004 here; G007/G008 live with the geometry rules).
import fs from 'node:fs';
import path from 'node:path';
import { defineRule, V, notApplicable } from './define.mjs';
import { hashTree, PATHS, readJsonIfExists } from '../lib/manifest.mjs';
import { haversineM, REPO_ROOT } from '../lib/util.mjs';

export function monumentIssues(ctx) {
  const emb = ctx.getEmbedded();
  const ms = emb.monuments;
  const out = [];
  if (!ms.length) return out;
  const { north, south, east, west } = ctx.extent;
  const nos = new Map();
  for (const m of ms) nos.set(m.no, (nos.get(m.no) || 0) + 1);
  for (let n = 1; n <= 512; n++) if (nos.get(n) !== 1) out.push({ key: `no|${n}`, kind: 'no_not_unique', message: `monument number ${n} appears ${nos.get(n) || 0} times` });
  if (ms.length !== 512) out.push({ key: 'count', kind: 'count', message: `${ms.length} monuments, expected 512` });
  const mnSeen = new Map();
  for (const m of ms) {
    if (m.lat > north || m.lat < south || m.lon > east || m.lon < west) out.push({ key: `extent|${m.no}`, kind: 'outside_extent', message: `#${m.no} ${m.name} at ${m.lat},${m.lon} is outside map_extent` });
    if (!m.mn) out.push({ key: `mn|blank|${m.no}`, kind: 'blank_mn', message: `#${m.no} ${m.name}: mn is blank` });
    else { if (!mnSeen.has(m.mn)) mnSeen.set(m.mn, []); mnSeen.get(m.mn).push(m.no); }
    if (!m.src) out.push({ key: `id_src|${m.no}`, kind: 'no_id_src', message: `#${m.no} ${m.name}: no id_src/src` });
    if (/WGS-84|MN ID/.test(m.honors || '')) out.push({ key: `text|${m.no}`, kind: 'corrupt_text', message: `#${m.no}: honors text contains a pasted header fragment` });
  }
  for (const [mn, list] of mnSeen) if (list.length > 1) out.push({ key: `mn|dup|${mn}`, kind: 'duplicate_mn', message: `${mn} is used by #${list.join(', #')}` });
  // coordinate collisions within 3 m (identical pairs are the common case)
  const byCell = new Map();
  for (const m of ms) {
    const k = `${Math.round(m.lat * 4000)}|${Math.round(m.lon * 4000)}`;
    if (!byCell.has(k)) byCell.set(k, []);
    byCell.get(k).push(m);
  }
  const seen = new Set();
  for (const m of ms) {
    const cx = Math.round(m.lat * 4000), cy = Math.round(m.lon * 4000);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const o of byCell.get(`${cx + dx}|${cy + dy}`) || []) {
      if (o.no <= m.no) continue;
      const d = haversineM(m.lat, m.lon, o.lat, o.lon);
      const k = `${m.no}-${o.no}`;
      if (d < 3 && !seen.has(k)) { seen.add(k); out.push({ key: `close|${k}`, kind: 'within_3m', message: `#${m.no} ${m.name} and #${o.no} ${o.name} are ${d.toFixed(1)} m apart` }); }
    }
  }
  const overlay = ctx.file('monuments.json');
  if (overlay && '_note' in overlay) out.push({ key: 'overlay|_note', kind: 'note_key', message: 'monuments.json ships a _note key (developer text) to every visitor' });
  return out;
}

const UNIT_INDEX_PATH = path.join(REPO_ROOT, 'data-src', 'build', 'unit_index.json');
const UNIT_REGISTRY_PATH = path.join(REPO_ROOT, 'data-src', 'build', 'unit_registry.json');
const U001_PAGES = ['search.html', 'regiment.html', 'find-ancestor.html', 'historian.html', 'report.html'];

export const rules = [
  defineRule({
    id: 'D002', sev: 'E', family: 'release', tier: 'v2', wp: 'WP-DATA-02', status: 'implemented', dv: ['DV-29'],
    title: 'a served data name never returns with other bytes than its lock entry (name -> sha256 history)', scope: 'data tree vs data-src/data.lock.json',
    spec_baseline: '0 (lock created from the frozen tree)',
    run(ctx) {
      if (ctx.data.dir === '<memory>') return notApplicable('in-memory data set: there is no tree to hash');
      const lock = readJsonIfExists(PATHS.lock);
      if (!lock) return null; // guard file missing => the rule did not run => the ratchet fails (VQ-02); never a silent pass
      const out = [];
      for (const e of hashTree(ctx.dataDir)) {
        const hist = lock.names[e.path];
        if (!hist) out.push(V(`unlocked|${e.path}`, `${e.path} is not in data.lock.json`, { kind: 'unlocked', file: e.path }));
        else if (hist[hist.length - 1] !== e.sha256) out.push(V(`bytes|${e.path}`, `${e.path}: bytes differ from the locked hash (${hist.includes(e.sha256) ? 'an OLD version returned' : 'silent edit'})`, { kind: hist.includes(e.sha256) ? 'reverted' : 'changed', file: e.path }));
      }
      return out;
    },
  }),
  defineRule({
    id: 'M001', site: true, sev: 'E', family: 'v2', tier: 'v2', wp: 'WP-DATA-15', status: 'implemented', dv: ['DV-19'],
    title: 'monuments: 512 unique numbers, coordinates in extent, none within 3 m, mn present and unique, id_src present, no header fragments, no _note key',
    scope: 'the 512-monument array extracted from the bundle (acorn) + monuments.json',
    spec_baseline: '503 unsourced; 51 blank mn; MN 96 duplicated; 28 outside the bbox; #512 text corrupted; identical coordinate pairs',
    run(ctx) {
      const emb = ctx.getEmbedded();
      if (!emb.monuments.length) return ctx.bundleDisabled ? notApplicable('bundle extraction disabled (bundlePath: null)') : null;
      return monumentIssues(ctx).map((i) => V(i.key, i.message, { kind: i.kind }));
    },
  }),
  defineRule({
    id: 'E001', sev: 'E', family: 'v2', tier: 'v2', wp: 'WP-DATA-14', status: 'deferred', dv: [],
    title: 'stored elevation_ft within 2 ft of the USGS 3DEP sample at the stored coordinate', scope: 'terrain, anchors, monuments',
    spec_baseline: '62 ft mean error, 13/30 key locations > 50 ft (chapter 13 DQ-12)',
    blocked_by: 'needs a DEM sample per coordinate (WP-DATA-14; 3DEP EPQS is a network call, not run in the offline validator)',
    run() { return null; },
  }),
  defineRule({
    id: 'U001', site: true, sev: 'E', family: 'v2', tier: 'v2', wp: 'WP-DATA-20', status: 'implemented', dv: [],
    title: 'unit-index coverage: every registered unit is searchable (index rows == facts.units.total) and the ordinary static pages load the artillery files',
    scope: 'data-src/build/unit_index.json + 5 static pages',
    spec_baseline: '0 of 104 batteries searchable; search/regiment/find-ancestor/historian/report read only .regiments',
    run(ctx) {
      // Both halves are the rule. An input that is missing means the half that reads it did not run: the rule did not run (null), it is
      // never "ok". (Deleting unit_index.json / unit_registry.json used to skip the whole index half and leave U001 green.)
      const idx = readJsonIfExists(UNIT_INDEX_PATH);
      const reg = readJsonIfExists(UNIT_REGISTRY_PATH);
      if (!idx || !reg) return null;
      if (!Array.isArray(idx.units) || !Array.isArray(reg.units)) throw new Error('unit_index.json / unit_registry.json have no "units" array');
      if (!ctx.distText || ctx.distText.size === 0) return ctx.siteDisabled ? notApplicable('site scans disabled (distDir: null)') : null;
      if (U001_PAGES.some((page) => !ctx.distText.has(page))) return null; // a page the rule names is not in the deploy tree
      const out = [];
      const inIdx = new Set(idx.units.map((u) => u.id));
      for (const u of reg.units) if (!inIdx.has(u.id)) out.push(V(`index|${u.id}`, `${u.id} is in the registry but not in the unit index`, { kind: 'not_indexed' }));
      if (idx.units.length !== reg.units.length) out.push(V('index|count', `index has ${idx.units.length} units, registry ${reg.units.length}`, { kind: 'count' }));
      for (const page of U001_PAGES) {
        const t = ctx.distText.get(page);
        const loadsArtillery = /union_artillery\.json/.test(t) && /confederate_artillery\.json/.test(t);
        if (!loadsArtillery) out.push(V(`page|${page}`, `${page} does not load union_artillery.json / confederate_artillery.json: batteries are invisible`, { kind: 'batteries_invisible', file: page }));
      }
      return out;
    },
  }),
  defineRule({
    id: 'H001', sev: 'E', family: 'v2', tier: 'v2', wp: 'WP-DATA-23', status: 'deferred', dv: [],
    title: 'no "Reviewed" wording without a signed decision in decisions.jsonl', scope: 'site copy',
    spec_baseline: 'n/a (no reviewer, no decisions.jsonl)', blocked_by: 'needs decisions.jsonl and the review board (WP-DATA-23, D-HIST-REVIEW)',
    run() { return null; },
  }),
  defineRule({
    id: 'P004', sev: 'W', family: 'v2', tier: 'v2', wp: 'WP-DATA-04', status: 'deferred', dv: ['DV-25'],
    title: 'source links resolve and have an archive URL (nightly)', scope: 'sources registry',
    spec_baseline: 'n/a (no registry)', blocked_by: 'needs sources.yaml; network access is a nightly job, not part of the offline validator',
    run() { return null; },
  }),
];

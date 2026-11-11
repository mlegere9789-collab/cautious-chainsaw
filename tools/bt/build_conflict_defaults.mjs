// Builds docs/battle-theatre/app/data/conflict-defaults.json, the file the theatre reads, from GOVERNANCE/decisions/conflict_defaults.json.
//   node tools/bt/build_conflict_defaults.mjs [--check]
// Keeps, per conflict: the topic, the plan's recommended value, the default scenario, its tier and basis, every scenario, the rationale and the product label.
// Drops the working notes (internal row references, the preamble, the status strings). --check exits 1 when the committed file differs (no write).
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), BT = path.resolve(here, '../../docs/battle-theatre');
const SRC = path.join(BT, 'GOVERNANCE/decisions/conflict_defaults.json'), OUT = path.join(BT, 'app/data/conflict-defaults.json');
const REF = /\s*\((?:r\d{2}-\d\s+)?R\d{2}\.C-\d{3}(?:[^()]*)\)/g;               // "(R03.C-004; T1-199, ...)" row references
const clean = s => String(s).replace(/Basis declared per CLAUDE\.md\./, 'Basis declared with each figure.').replace(REF, '').replace(/^R\d{2}\.C-\d{3}(?:, [^;]*)?; /, '').replace(/\s+;/g, ';').replace(/\s{2,}/g, ' ').trim();
const SOURCE = { 'shard evidence (added, nothing deleted)': 'added from the primary record (nothing deleted)', 'delegated decision': 'default chosen under delegated authority' };
export function build(src) {
  const out = { label: src.label, conflicts: {} };
  for (const id of Object.keys(src.conflicts).sort()) {
    const c = src.conflicts[id];
    out.conflicts[id] = { topic: c.topic, pdf_recommended_default: c.pdf_recommended_default, default_scenario_id: c.default_scenario_id, default_label: c.default_label, tier: c.tier, basis: c.basis,
      scenarios: c.scenarios.map(s => ({ id: s.id, label: s.label, source: SOURCE[s.source] || s.source })), rationale: clean(c.rationale), product_label: c.product_label };
  }
  return out;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const txt = JSON.stringify(build(JSON.parse(fs.readFileSync(SRC, 'utf8'))), null, 1) + '\n';
  if (process.argv.includes('--check')) { const same = fs.existsSync(OUT) && fs.readFileSync(OUT, 'utf8') === txt; console.log(same ? 'conflict-defaults.json is current' : 'conflict-defaults.json differs'); process.exit(same ? 0 : 1); }
  fs.writeFileSync(OUT, txt); console.log('wrote', path.relative(process.cwd(), OUT), txt.length, 'bytes');
}

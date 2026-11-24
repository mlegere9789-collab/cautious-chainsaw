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
const sc = s => (s == null ? s : clean(s));
const reasonOf = r => (r && (r.text || r)) || null;
export function build(src) {
  const out = { label: src.label, version: src.version || 1, conflicts: {} };
  for (const id of Object.keys(src.conflicts).sort()) {
    const c = src.conflicts[id];
    const e = { topic: c.topic, pdf_recommended_default: c.pdf_recommended_default, default_scenario_id: c.default_scenario_id, default_label: c.default_label, tier: c.tier, basis: c.basis,
      scenarios: c.scenarios.map(s => { const o = { id: s.id, label: s.label, source: SOURCE[s.source] || s.source }; if (s.stance) o.stance = s.stance; if (s.tier) o.tier = s.tier; const rn = reasonOf(s.reason_not_chosen); if (rn) o.reason_not_chosen = sc(rn); return o; }),
      rationale: clean(c.rationale), product_label: c.product_label };
    if (c.class) {                                   // version 2: resolved by research (2026-11-16); the viewer shows the class, the window or gap, the drawn instant and every other value with its reason
      Object.assign(e, { class: c.class, mode: c.mode, event_date: c.event_date || null, window: c.window || null, drawn_text: c.drawn_text || null, source_panel_text: sc(c.source_panel_text),
        animation: c.animation ? { at: c.animation.at || null, rule: c.animation.rule || null, note: sc(c.animation.note || '') } : { at: null, rule: null, note: '' },
        holds: { pdf_default: { holds: c.holds.pdf_default.holds, note: sc(c.holds.pdf_default.note) }, first_delegated: { holds: c.holds.first_delegated.holds, note: sc(c.holds.first_delegated.note) } },
        positions: c.positions.map(p => { const o = { id: p.id, label: sc(p.label), kind: p.kind, tier: p.tier, stance: p.stance, scenario_ids: p.scenario_ids || [] }; const rn = reasonOf(p.reason_not_chosen); if (rn) o.reason_not_chosen = sc(rn); return o; }),
        previous_default: { date: c.previous_default.date, default_label: c.previous_default.default_label, tier: c.previous_default.tier },
        what_would_change_it: sc(c.what_would_change_it), failed_searches_count: c.failed_searches_count, resolution_file: c.resolution_file });
      if (c.range) e.range = c.range;
      if (c.drawn_clamped) e.drawn_clamped = c.drawn_clamped;
      if (c.owner_note) e.owner_note = sc(c.owner_note);
    }
    out.conflicts[id] = e;
  }
  return out;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const txt = JSON.stringify(build(JSON.parse(fs.readFileSync(SRC, 'utf8'))), null, 1) + '\n';
  if (process.argv.includes('--check')) { const same = fs.existsSync(OUT) && fs.readFileSync(OUT, 'utf8') === txt; console.log(same ? 'conflict-defaults.json is current' : 'conflict-defaults.json differs'); process.exit(same ? 0 : 1); }
  fs.writeFileSync(OUT, txt); console.log('wrote', path.relative(process.cwd(), OUT), txt.length, 'bytes');
}

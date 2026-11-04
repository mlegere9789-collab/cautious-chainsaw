// Builds app/data/sibling-approach.json: the MODELLED roads of approach of history layer v6 (DEC-015) and the verdict for every leaf unit that was an open gap in v5.
//   node docs/battle-theatre/app/tools/build-sibling-approach.mjs            writes data/sibling-approach.json
//   node docs/battle-theatre/app/tools/build-sibling-approach.mjs --check    exits 1 if the file on disk differs from what the rule gives now
// Inputs: the v5 layer (data/placement.json, data/placement-claims.json, data/daypositions.json: the layer is built WITHOUT the file being written), the claim rows of the audit of that layer
// (tools/approach-audit.mjs) and the hand-read classes of data/sibling-review.json. The rule itself is tools/sibling-rule.mjs.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { createRealHistory } from '../src/history/real.mjs';
import { loadRawFromDisk, terrainMeta } from './history-report.mjs';
import { approachAudit } from './approach-audit.mjs';
import { siblingRule, RULE_ID, REGISTER, SIBLING_CODES, BLOCKING_CLASSES } from './sibling-rule.mjs';
const here = path.dirname(fileURLToPath(import.meta.url)), BT = path.resolve(here, '../..');
const J = f => JSON.parse(fs.readFileSync(path.join(BT, f), 'utf8'));
export const OUT = 'app/data/sibling-approach.json', REVIEW = 'app/data/sibling-review.json', helpers = { civilDawn: m => m + 4 * 60 + 3 };

export function buildSibling({ raw = loadRawFromDisk(), T = terrainMeta(), review = J(REVIEW) } = {}) {
  const raw5 = { ...raw, siblingApproach: null }, A5 = approachAudit({ raw: raw5, T }), L5 = createRealHistory({ raw: raw5, T, helpers });
  const gateOf = id => { const e = L5.model.effective(id, {}, helpers); return e ? e.earliest : -Infinity; };
  const res = siblingRule({ L5, rows: A5.rows, review, leafReason: A5.leafReason, gateOf });
  const leaves = {}, by = new Map(L5.units.map(u => [u.id, u]));
  for (const [id, v] of [...res.verdict].sort((a, b) => L5.units.findIndex(u => u.id === a[0]) - L5.units.findIndex(u => u.id === b[0]))) {
    const ap = res.approach.find(a => a.leaves.includes(id));
    leaves[id] = v.status === 'sibling' ? { status: 'drawn', approach: ap.id, road: v.road, code: 'sibling', why: v.why } : { status: 'open', code: v.code, why: v.why, v5_code: (A5.leafReason.find(r => r.id === id) || {}).code, day_position: !!(by.get(id).day_positions && by.get(id).day_positions.days.some(d => d.status === 'single')) };
  }
  const doc = {
    version: 1, built_by: 'tools/build-sibling-approach.mjs', decision: RULE_ID, register: REGISTER,
    note: 'MODELLED roads of approach (kind sibling, tier plausible-procedural) and the verdict for every leaf unit that was an open gap in v5. Rule: tools/sibling-rule.mjs; hand-read classes: data/sibling-review.json; the loader (src/history/placement.mjs, validateSibling) recomputes the documented siblings of every record and refuses the file unless each record is complete, unanimous and crosses the loaded ground. Nothing here is a coordinate, a time or a quotation.',
    rule: [
      '1. A leaf unit with no road of approach anywhere on its line of command takes the road documented for the OTHER formations of its corps only if every documented sibling formation (an approach record of v5 attached strictly under the corps and not on the unit’s own line of command) names the same gazetteer road, that road crosses the loaded ground, and no report for the unit or any formation above it names a road the repository cannot place, another road of approach, or a road outside the loaded ground (every claim of the audit on the line of command has a class in sibling-review.json), and the reports of the line do not disagree.',
      '2. Stuart’s cavalry: the sibling rule is not applied; it is drawn only by a road documented for its own brigade or division.',
      '3. The unit must have a gate and a single-label day position (a Bachelder sheet); otherwise it is not drawn (it would only stand in a column at the edge).',
      '4. The record is attached at the highest formation below the corps all of whose leaf units are drawn by it or already have a nearer road. Tier plausible-procedural, marked modelled; it lists every sibling it rests on.'],
    codes: Object.fromEntries(SIBLING_CODES), blocking_classes: BLOCKING_CLASSES,
    approach: res.approach, leaves, reviewed_claims: res.explicit,
    counts: { open_leaves_v5: Object.keys(leaves).length, drawn: Object.values(leaves).filter(l => l.status === 'drawn').length, records: res.approach.length },
  };
  return { doc, errors: res.errors, L5, res };
}
const text = d => JSON.stringify(d, null, 1) + '\n';
if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const r = buildSibling(); if (r.errors.length) { console.error(r.errors.join('\n')); process.exit(1); }
  const out = path.join(BT, OUT);
  if (process.argv.includes('--check')) { const cur = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : ''; if (cur !== text(r.doc)) { console.error(OUT + ' is stale: run node docs/battle-theatre/app/tools/build-sibling-approach.mjs'); process.exit(1); } console.log(OUT + ' is current'); }
  else { fs.writeFileSync(out, text(r.doc)); console.log(OUT + ' written:', r.doc.counts.records, 'records,', r.doc.counts.drawn, 'of', r.doc.counts.open_leaves_v5, 'open leaves drawn'); }
}

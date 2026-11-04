// Exports what the shell draws as figures, for tools/bt/check_figures.py (the B.6.12 validator is in Python): for every DRAWN unit its figure count, the kit unit its manifests come from, the date of
// its first day on the field, its default-scenario gate, and a digest of every manifest the shell makes (so Python can check that it makes the same ones).
//   node docs/battle-theatre/app/tools/export-figures.mjs [out.json]      (prints to stdout without an argument)
import fs from 'node:fs'; import crypto from 'node:crypto';
import { loadRawFromDisk, terrainMeta } from './history-report.mjs';
import { createRealHistory } from '../src/history/real.mjs';
import { canon } from '../../sim/cache.mjs';
import { fmtShort, parts } from '../src/clock.mjs';
const sha = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 24);
export function exportFigures() {
  const L = createRealHistory({ raw: loadRawFromDisk(), T: terrainMeta(), helpers: { civilDawn: m => m + 4 * 60 + 3 } }), F = L.figures;
  if (!F) throw new Error('the layer has no figures (kit data missing)');
  const units = [];
  for (const u of L.units.filter(x => x.drawn)) {
    const e = L.enterOf(u.id), p = parts(e), date = `1863-${String(p.month).padStart(2, '0')}-${String(p.dom).padStart(2, '0')}`, ku = F.kitUnitOf(u.id), n = u.strength.drawn, ent = F.kit.units[ku.kit_unit];
    const rec = { id: u.id, name: u.name, side: u.side, arm: u.arm, figures: n, kit_unit: ku.kit_unit, how: ku.how, default: ku.default, date, earliest_min: e, earliest: fmtShort(e), earliest_iso: new Date(Date.UTC(1863, 5, 1) + Math.round(e) * 60000).toISOString().slice(0, 16), disputed: !!ent.variants, variants: ent.variants ? Object.keys(ent.variants) : null };
    const chain = []; 
    if (ent.variants) { rec.digest = null; rec.variant_digests = {}; for (const v of Object.keys(ent.variants)) { const d = []; for (let k = 0; k < n; k++) d.push(sha(canon(L.figureManifest(u.id, k, e).variants[v]))); rec.variant_digests[v] = sha(d.join('')); } }
    else { for (let k = 0; k < n; k++) chain.push(sha(canon(L.figureManifest(u.id, k, e)))); rec.digest = sha(chain.join('')); }
    units.push(rec);
  }
  const doc = { seed: 1863, soldier_id: '<history unit id>:<index, 4 digits>', rank: 'private', role: 'rifleman', units };
  doc.export_digest = sha(units.map(u => `${u.id}|${u.figures}|${u.kit_unit}|${u.date}|${u.digest}|${JSON.stringify(u.variant_digests || null)}`).join('\n'));
  return doc;
}
if (process.argv[1] && process.argv[1].endsWith('export-figures.mjs')) { const doc = exportFigures(), out = process.argv[2]; if (out) { fs.writeFileSync(out, JSON.stringify(doc, null, 1)); console.log(`${doc.units.length} drawn units, ${doc.units.reduce((a, u) => a + u.figures, 0)} figures, digest ${doc.export_digest} -> ${out}`); } else process.stdout.write(JSON.stringify(doc)); }

// DATA fixes: order-of-battle text found by the sweep after sample C -- records held one per line (rules: tools/t0/data/okey-rules.mjs).  A fragment edit is applied by the
// generator to the final value of the member, after every other module's rows (so the "Contested" suffixes and recomputed percentages other modules add are kept).
import { rowEdits } from '../okey-lib.mjs';
export const kind = 'rows';
const by = new Map();
for (const e of rowEdits) {
  const k = e.file + '|' + e.key;
  if (!by.has(k)) by.set(k, { file: 'oob/' + e.file, key: e.key, rows: [] });
  by.get(k).rows.push({ id: e.id, edit: { [e.field]: [[e.old, e.repl]] }, cls: e.cls, before: e.before, src: e.src });
}
export const groups = [...by.values()];
export default [];

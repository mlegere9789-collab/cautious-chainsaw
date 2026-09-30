// Helper of baseline_selftest.py: prints sha256 of ops/sha-list.mjs forwardModel(<source>, <rum>) for every html file of a tree, as JSON.
//   node tools/t0/tests/forward_model_js.mjs <tree dir> <rum snippet file>
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { forwardModel } from '../../../ops/sha-list.mjs';

const [tree, rumFile] = process.argv.slice(2);
const rum = fs.readFileSync(rumFile, 'utf8');
const out = {};
for (const f of fs.readdirSync(tree).filter((x) => x.endsWith('.html')).sort()) {
  try { out[f] = crypto.createHash('sha256').update(Buffer.from(forwardModel(fs.readFileSync(path.join(tree, f), 'utf8'), rum), 'utf8')).digest('hex'); }
  catch (e) { out[f] = `ERROR ${e.message}`; }
}
console.log(JSON.stringify(out));

// make-schema.mjs - writes tokens.schema.json (the JSON Schema of an exported settings object) from tokens.json.
//   node docs/pitch/anim/prototype/tokens/make-schema.mjs           write
//   node docs/pitch/anim/prototype/tokens/make-schema.mjs --check   exit 1 when the committed schema is stale
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { settingsSchema, validateDefs } from '../src/tuning/tuning.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const doc = JSON.parse(fs.readFileSync(path.join(here, 'tokens.json'), 'utf8'));
const problems = validateDefs(doc);
if (problems.length) { console.error('tokens.json is invalid:\n  ' + problems.join('\n  ')); process.exit(1); }
const out = JSON.stringify(settingsSchema(doc), null, 1) + '\n';
const file = path.join(here, 'tokens.schema.json');
if (process.argv.includes('--check')) {
  const cur = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (cur !== out) { console.error('tokens.schema.json is stale: run node docs/pitch/anim/prototype/tokens/make-schema.mjs'); process.exit(1); }
  console.log('tokens.schema.json is current');
} else { fs.writeFileSync(file, out); console.log('wrote tokens.schema.json (' + doc.tokens.length + ' tokens)'); }

// JSON Schema (draft 2020-12) helpers shared by the environment and ledger validators.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const loadJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
export function schemaErrors(schemaRel, data) {
  const ajv = new Ajv2020({ allErrors: true, strict: false, validateFormats: false });
  const validate = ajv.compile(loadJson(schemaRel));
  return validate(data) ? [] : validate.errors.map((e) => `${e.instancePath || '/'} ${e.message}${e.params && e.params.additionalProperty ? ' (' + e.params.additionalProperty + ')' : ''}`);
}
/** true when this module's file is the one node was started with (so two files both named validate.mjs cannot trigger each other) */
export const isMain = (importMetaUrl) => process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(importMetaUrl);

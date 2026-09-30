// JSON Schema (2020-12) loading and per-file validation (rules S001-S004, S006).
import fs from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import { REPO_ROOT } from './util.mjs';

export const SCHEMA_DIR = path.join(REPO_ROOT, 'data-src', 'schemas');

/** Which schema validates which legacy file. Unmapped files are reported by S001 as "no schema". */
export function schemaRefForFile(rel) {
  if (/^placements_.*\.json$/.test(rel) || /^density_.*\.json$/.test(rel)) return 'gtbg/placements.schema.json';
  if (/^chronology_day\d\.json$/.test(rel)) return 'gtbg/chronology.schema.json';
  if (/^vignettes_part\d\.json$/.test(rel)) return 'gtbg/vignettes.schema.json';
  if (rel === 'terrain.json') return 'gtbg/terrain.schema.json';
  if (rel === 'casualty_apportionment.json') return 'gtbg/casualty.schema.json';
  if (rel === 'monuments.json') return 'gtbg/monuments_overlay.schema.json';
  if (rel === 'placement_schema.json') return 'gtbg/placement_doc.schema.json';
  const oob = 'gtbg/oob.schema.json#/$defs/';
  switch (rel) {
    case 'oob/union_regiments_i_ii_corps.json':
    case 'oob/union_regiments_iii_v_corps.json':
    case 'oob/union_regiments_vi_xi_xii_corps.json':
    case 'oob/confederate_regiments_first_corps.json':
    case 'oob/confederate_regiments_second_corps.json':
    case 'oob/confederate_regiments_third_corps.json':
      return oob + 'fileRegiments';
    case 'oob/union_cavalry_artillery.json': return oob + 'fileUnionCavalryArtillery';
    case 'oob/confederate_cavalry.json': return oob + 'fileConfedCavalry';
    case 'oob/union_oob_brigades.json': return oob + 'fileBrigades';
    case 'oob/union_oob_corps_division.json': return oob + 'fileCorpsDivision';
    case 'oob/confederate_oob_corps_div_bde.json': return oob + 'fileConfedCorpsDivBde';
    case 'oob/union_artillery.json': return oob + 'fileUnionArtillery';
    case 'oob/confederate_artillery.json': return oob + 'fileConfedArtillery';
    case 'oob/commander_successions.json': return oob + 'fileSuccessions';
    default: return null;
  }
}

let cached = null;

export function loadSchemas(dir = SCHEMA_DIR) {
  if (cached && cached.dir === dir) return cached.ajv;
  const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
  for (const f of fs.readdirSync(dir).sort()) {
    if (!f.endsWith('.schema.json')) continue;
    ajv.addSchema(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
  }
  cached = { dir, ajv };
  return ajv;
}

/** Map an ajv error to the S-rule that owns it. */
export function ruleForAjvError(err) {
  switch (err.keyword) {
    case 'required': return 'S002';
    case 'type': return 'S003';
    case 'enum': case 'const': return 'S004';
    case 'additionalProperties': return 'S006';
    case 'minimum': case 'maximum': case 'minLength': case 'pattern': case 'minItems': case 'maxItems':
    case 'uniqueItems': case 'prefixItems': case 'items':
      return 'S003';
    default: return 'S003';
  }
}

/**
 * Validate one parsed file. Returns [] or a list of {rule, path, message, params}.
 * A missing schema is reported as {rule:'S001', path:'', message:'no schema for file'}.
 */
export function validateFileAgainstSchema(rel, json, ajv = loadSchemas()) {
  const ref = schemaRefForFile(rel);
  if (!ref) return [{ rule: 'S001', path: '', message: 'no schema registered for this file', params: {} }];
  const validate = ajv.getSchema(ref);
  if (!validate) return [{ rule: 'S001', path: '', message: `schema ${ref} did not compile`, params: {} }];
  if (validate(json)) return [];
  return validate.errors.map((e) => ({
    rule: ruleForAjvError(e),
    path: e.instancePath,
    message: `${e.keyword}: ${e.message}`,
    params: e.params,
  }));
}

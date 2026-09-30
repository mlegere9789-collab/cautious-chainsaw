#!/usr/bin/env node
// Generates the unit registry, ID crosswalk, collision table, VI Corps candidate brigades and the unit index
// (WP-DATA-06 / WP-DATA-07 candidate / WP-DATA-20). Reads the legacy tree; writes ONLY under data-src/build/.
//   node tools/data/unit_registry.mjs [--check]     (--check: regenerate in memory and fail if the committed files differ)
import fs from 'node:fs';
import path from 'node:path';
import { buildContext } from './lib/context.mjs';
import { buildRegistry, buildCrosswalk, buildDualMeaning, buildViCorpsCandidates } from './lib/registry.mjs';
import { buildUnitIndex, buildBatteryShim } from './lib/unit_index.mjs';
import { runRules } from './lib/runner.mjs';
import { REPO_ROOT, prettyJson } from './lib/util.mjs';

const BUILD = path.join(REPO_ROOT, 'data-src', 'build');

export async function generate({ ctx = buildContext({}) } = {}) {
  const crosswalk = buildCrosswalk(ctx);
  const byTarget = new Map();
  for (const e of crosswalk.entries) if (e.proposed && !e.new_record) { if (!byTarget.has(e.proposed)) byTarget.set(e.proposed, []); byTarget.get(e.proposed).push(e); }
  const registry = buildRegistry(ctx, byTarget);
  const { results } = await runRules(ctx, { only: ['R011'] });
  const collisions = buildDualMeaning(ctx, results.get('R011').violations);
  const vi = buildViCorpsCandidates(ctx);
  const index = buildUnitIndex(ctx, registry, crosswalk);
  const base = { generated_by: 'tools/data/unit_registry.mjs', status: 'CANDIDATE: derived from legacy/dist/data; nothing here is served or displayed' };
  return {
    'unit_registry.json': prettyJson({
      schema: 'gtbg/unit-registry/1', ...base,
      definition: 'The 569 distinct units of the legacy OOB: 465 regiments (the alias stub U-14BK excluded) + 104 batteries (the horse battery C-McClanahan-ART filed among the regiments is counted as a battery).',
      census: registry.census,
      rights_files: registry.rightsFiles,
      rights_note: "Per-unit rights.tier is legacy / claimed_only: the numeric fields descend from the claimed sources of the OOB file the unit is in (rights_files). action facts-only = keep the facts, never reproduce the book tables or wording, re-source from OR No. 13 / Fox (chapter 13 WP-DATA-05/08).",
      units: registry.units,
    }),
    'id_crosswalk.json': prettyJson({
      schema: 'gtbg/id-crosswalk/1', ...base,
      rules: [
        { id: 'wrong_side_prefix', text: 'a regiment-shaped id whose state code is Confederate-only but whose prefix is U-, where the C- twin exists: the ONLY rule that changes a side (10 ids).' },
        { id: 'own_id_prefix_extension', text: 'OOB ids that extend the placed id with a suffix (U-8IL -> U-8IL-CAV); unique candidate, same side.' },
        { id: 'type_tag_normalisation', text: '-RES -> -R (Pennsylvania Reserves), -SHRP -> -SS (sharpshooters); the target must exist.' },
        { id: 'suffix_variant', text: '<regiment id>-<tag> where the base regiment exists; high only when the tag matches a commander or nickname in the regiment\'s brigade/division chain (a single letter also needs the note to name him).' },
        { id: 'brigade_prefixed_regiment', text: '<corps>-<div>-<n><state>: the tail resolves to a regiment whose division equals the id prefix.' },
        { id: 'formation_named_in_note', text: '"<Name>\'s brigade/division" in the row note resolves to the OOB record of the same kind and side whose commander (or designation) is <Name>; one-letter surname typos allowed; never across sides.' },
        { id: 'artillery_nickname', text: 'C-ART-<Name>: the battalion or artillery brigade whose commander/designation is <Name>.' },
        { id: 'new_record_required', text: 'the 8 U-VI-* brigades: no OOB record exists; see candidates/vi_corps_brigades.json.' },
      ],
      hard_rules: ['never map a regiment-shaped id to a brigade (checked)', 'never change a side except by wrong_side_prefix (checked)', 'Regulars use UR (not implemented: no such id among the 95)', 'ambiguous matches stay none with the candidates listed'],
      counts: crosswalk.counts, wrong_side_prefix: crosswalk.wrong_side, entries: crosswalk.entries,
    }),
    'id_collisions.json': prettyJson({
      schema: 'gtbg/id-collisions/1', ...base,
      definition: 'Ids that EXIST in the OOB but are used for a second formation: a row note names another brigade/division/corps (rule R011, strict: same kind, target exists) or a row strength exceeds twice the record\'s own. A re-key changes the ROW, never the OOB record. Every entry needs the historian; atomic_group marks rows whose targets are each other\'s sources at the same tick (apply as ONE permutation with a dry-run diff).',
      count: collisions.length,
      by_detection: { note_names_other_formation: collisions.filter((c) => c.rows.length).length, strength_only: collisions.filter((c) => !c.rows.length).length },
      entries: collisions,
    }),
    'candidates/vi_corps_brigades.json': prettyJson({ schema: 'gtbg/candidate-vi-corps-brigades/1', ...base, count: vi.length, brigades: vi }),
    'unit_index.json': prettyJson(index),
    'candidates/batteries_regiment_shape.json': prettyJson(buildBatteryShim(ctx, registry)),
  };
}

async function main() {
  const check = process.argv.includes('--check');
  const files = await generate();
  let bad = 0;
  for (const [name, text] of Object.entries(files)) {
    const p = path.join(BUILD, name);
    if (check) {
      const cur = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
      if (cur !== text) { console.error(`STALE ${path.relative(REPO_ROOT, p)}`); bad++; }
    } else {
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, text, 'utf8');
      console.log(`wrote ${path.relative(REPO_ROOT, p)} (${text.length} bytes)`);
    }
  }
  if (check) { console.log(bad ? `${bad} stale` : 'registry artifacts up to date'); process.exit(bad ? 1 : 0); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))) main();

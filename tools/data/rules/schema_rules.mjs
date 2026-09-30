// S001-S008: files, schema, enums, extent, duplicates, headers.
import { defineRule, V, rowKey, rowLabel } from './define.mjs';
import { loadSchemas, validateFileAgainstSchema } from '../lib/schemas.mjs';
import { fileGroups } from '../lib/load.mjs';

function schemaViolations(ctx) {
  if (ctx._schemaViolations) return ctx._schemaViolations;
  const ajv = loadSchemas();
  const out = [];
  for (const [rel, f] of ctx.data.files) {
    if (f.error || f.json == null) continue;
    for (const e of validateFileAgainstSchema(rel, f.json, ajv)) {
      if (e.rule === 'S001') continue; // handled by S001 itself
      out.push({ rule: e.rule, rel, path: e.path, message: e.message, params: e.params });
    }
  }
  ctx._schemaViolations = out;
  return out;
}

const fromSchema = (rule) => (ctx) =>
  schemaViolations(ctx)
    .filter((v) => v.rule === rule)
    .map((v) => V(`${v.rel}${v.path}|${v.message.split(':')[0]}${v.params?.missingProperty ? '|' + v.params.missingProperty : ''}${v.params?.additionalProperty ? '|' + v.params.additionalProperty : ''}`,
      `${v.rel}${v.path}: ${v.message}`, { file: v.rel, path: v.path }));

export const rules = [
  defineRule({
    id: 'S001', sev: 'E', family: 'schema', wp: 'WP-DATA-03', status: 'implemented', dv: ['DV-00'],
    title: 'valid UTF-8 JSON, top-level shape per schema',
    scope: 'all files',
    spec_baseline: '0',
    run(ctx) {
      const out = [];
      for (const [rel, f] of ctx.data.files) {
        if (f.error) out.push(V(`${rel}|parse`, `${rel}: ${f.error}`, { file: rel }));
        else if (!validateFileAgainstSchema(rel, f.json).every((e) => e.rule !== 'S001')) {
          out.push(V(`${rel}|no-schema`, `${rel}: no schema registered`, { file: rel }));
        }
      }
      return out;
    },
  }),
  defineRule({
    id: 'S002', sev: 'E', family: 'schema', wp: 'WP-DATA-03', status: 'implemented', dv: ['DV-00', 'DV-16'],
    title: 'required fields present (JSON Schema)', scope: 'all records', spec_baseline: '0 (placements); OOB gaps are N003/R003',
    run: fromSchema('S002'),
  }),
  defineRule({
    id: 'S003', sev: 'E', family: 'schema', wp: 'WP-DATA-03', status: 'implemented', dv: ['DV-00'],
    title: 'types and ranges (int/float/string, tick 1-675, bearing 0-359, strength >= 10)', scope: 'all', spec_baseline: '0',
    run: fromSchema('S003'),
  }),
  defineRule({
    id: 'S004', sev: 'E', family: 'schema', wp: 'WP-DATA-03', status: 'implemented', dv: ['DV-15'],
    title: 'enums: disposition, side, significance, unit_type (schema $defs)', scope: 'all', spec_baseline: '0',
    run: fromSchema('S004'),
  }),
  defineRule({
    id: 'S005', sev: 'E', family: 'schema', wp: 'WP-DATA-03', status: 'implemented', dv: ['DV-02', 'DV-15'],
    title: 'lat/lng inside map_extent (legacy: terrain.json battlefield_bounds) unless off_map; bearing 0-359; tick 1-675',
    scope: 'placement rows', spec_baseline: '49 rows out of extent (42 lng < -77.29; 7 lat > 39.85)',
    run(ctx) {
      const { north, south, east, west } = ctx.extent;
      const out = [];
      for (const r of ctx.rows) {
        const why = [];
        if (r.lat > north) why.push('lat>north'); else if (r.lat < south) why.push('lat<south');
        if (r.lng > east) why.push('lng>east'); else if (r.lng < west) why.push('lng<west');
        if (why.length) out.push(V(`${rowKey(r)}|${rowLabel(r)}`, `${rowLabel(r)} outside map_extent (${why.join(',')}) at ${r.lat},${r.lng}`, { file: r.file, kind: why[0], data: { unit_id: r.unit_id, tick: r.tick, why } }));
      }
      return out;
    },
  }),
  defineRule({
    id: 'S006', sev: 'E', family: 'schema', wp: 'WP-DATA-03', status: 'implemented', dv: ['DV-00'],
    title: 'no unknown keys (additionalProperties:false)', scope: 'all',
    spec_baseline: 'not enforceable today (prose schema); the legacy schemas in data-src/schemas are closed over today\'s keys, so 0',
    run: fromSchema('S006'),
  }),
  defineRule({
    id: 'S007', sev: 'E', family: 'schema', wp: 'WP-DATA-03', status: 'implemented', dv: ['DV-06'],
    title: 'unique (unit_id, tick) across placements_* and density_*; conflicting duplicates forbidden',
    scope: 'placement rows', spec_baseline: '103 keys / 117 redundant rows / 68 conflicting',
    run(ctx) {
      const out = [];
      // "conflicting" = the drawn state differs (position, disposition or strength); bearing/notes-only differences are redundant, not conflicting
      const same = (a, b) => ['lat', 'lng', 'disposition', 'strength'].every((k) => a[k] === b[k]);
      for (const c of ctx.conflicts) {
        const conflicting = !c.rows.every((r) => same(r, c.rows[0]));
        out.push(V(c.key, `${c.key} appears ${c.rows.length}x (${c.rows.map((r) => r.file).join(', ')})${conflicting ? ' with conflicting values' : ' identically'}`,
          { kind: conflicting ? 'conflicting' : 'identical', rows: c.rows.length, data: { files: c.rows.map((r) => r.file) } }));
      }
      return out;
    },
  }),
  defineRule({
    id: 'S008', sev: 'E', family: 'schema', wp: 'WP-DATA-03', status: 'implemented', dv: ['DV-01'],
    title: 'header counts and ranges equal what the file contains (record_count, tick_range, vignette totals/range, regiment/battery totals)',
    scope: 'files', spec_baseline: '1 wrong record_count header; 3 loose tick_range headers',
    run(ctx) {
      const out = [];
      for (const [rel, f] of ctx.data.files) {
        const j = f.json;
        if (!j || !j.metadata) continue;
        const m = j.metadata;
        if (fileGroups.placements(rel) || fileGroups.density(rel)) {
          const n = j.placements.length;
          if ('record_count' in m && m.record_count !== n) out.push(V(`${rel}|record_count`, `${rel}: record_count ${m.record_count} but ${n} rows`, { file: rel, kind: 'record_count' }));
          if (Array.isArray(m.tick_range) && n) {
            const ticks = j.placements.map((r) => r.tick);
            const lo = Math.min(...ticks), hi = Math.max(...ticks);
            const [dlo, dhi] = m.tick_range;
            if (ticks.some((t) => t < dlo || t > dhi)) out.push(V(`${rel}|tick_range_outside`, `${rel}: rows outside declared tick_range ${dlo}-${dhi}`, { file: rel, kind: 'tick_range_outside' }));
            else if (lo !== dlo || hi !== dhi) out.push(V(`${rel}|tick_range_loose`, `${rel}: declared ${dlo}-${dhi}, actual ${lo}-${hi}`, { file: rel, kind: 'tick_range_loose' }));
          }
        }
        if (fileGroups.vignettes(rel)) {
          const n = j.vignettes.length;
          if (m.total_vignettes_this_file !== n) out.push(V(`${rel}|total_vignettes`, `${rel}: total_vignettes_this_file ${m.total_vignettes_this_file} but ${n}`, { file: rel, kind: 'vignette_total' }));
          const ids = j.vignettes.map((v) => v.vignette_id);
          if (m.vignette_id_range && (m.vignette_id_range[0] !== ids[0] || m.vignette_id_range[1] !== ids[ids.length - 1])) {
            out.push(V(`${rel}|vignette_id_range`, `${rel}: vignette_id_range ${m.vignette_id_range} vs ${ids[0]}..${ids[ids.length - 1]}`, { file: rel, kind: 'vignette_range' }));
          }
        }
        if (fileGroups.chronology(rel)) {
          for (const k of ['day1_tick_range', 'day2_tick_range', 'day3_tick_range']) {
            if (!m[k]) continue;
            const [lo, hi] = m[k];
            if (j.events.some((e) => e.tick < lo || e.tick > hi)) out.push(V(`${rel}|${k}`, `${rel}: events outside ${k}`, { file: rel, kind: 'chronology_range' }));
          }
        }
        if (rel.startsWith('oob/') && Array.isArray(j.regiments) && 'total_regiments' in m && m.total_regiments !== j.regiments.length) {
          out.push(V(`${rel}|total_regiments`, `${rel}: total_regiments ${m.total_regiments} but ${j.regiments.length}`, { file: rel, kind: 'total_regiments' }));
        }
        if (rel === 'oob/union_cavalry_artillery.json' && 'total_regiment_slots' in m && m.total_regiment_slots !== j.regiments.length) {
          out.push(V(`${rel}|total_regiment_slots`, `${rel}: total_regiment_slots ${m.total_regiment_slots} but ${j.regiments.length}`, { file: rel, kind: 'total_regiments' }));
        }
        if ((rel === 'oob/union_artillery.json' || rel === 'oob/confederate_artillery.json') && 'total_batteries' in m) {
          const n = ctx.oob.list.filter((r) => r.file === rel && r.kind === 'battery').length;
          if (m.total_batteries !== n) out.push(V(`${rel}|total_batteries`, `${rel}: total_batteries ${m.total_batteries} but ${n} listed`, { file: rel, kind: 'total_batteries' }));
        }
      }
      return out;
    },
  }),
];

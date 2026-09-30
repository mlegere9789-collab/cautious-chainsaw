// R001-R011: identity and referential integrity.
import { defineRule, V, rowKey, rowLabel } from './define.mjs';
import { ID_GRAMMAR } from '../lib/oob.mjs';
import { fileGroups } from '../lib/load.mjs';
import { sideOfPrefix } from '../lib/util.mjs';

const CONFEDERATE_ONLY_STATES = new Set(['AL', 'AR', 'FL', 'GA', 'LA', 'MS', 'NC', 'SC', 'TX']);
const UNION_ONLY_STATES = new Set(['CT', 'IL', 'IN', 'IA', 'KS', 'ME', 'MA', 'MI', 'MN', 'NH', 'NJ', 'NY', 'OH', 'PA', 'RI', 'VT', 'WI']);

const ID_IN_TEXT = /\b[UC]-[A-Z0-9]+(?:-[A-Za-z0-9]+)*\b/g;

export function flipPrefix(id) {
  if (id.startsWith('U-')) return 'C-' + id.slice(2);
  if (id.startsWith('C-')) return 'U-' + id.slice(2);
  return id;
}

export const resolves = (ctx, id) => ctx.oob.records.has(id) || (ctx.aliases?.has(id) ?? false);

/** Every place a unit id is used as a reference. Cached on ctx. */
export function collectRefs(ctx) {
  if (ctx._refs) return ctx._refs;
  const refs = [];
  // placements: one entry per row (aggregated by id later)
  for (const r of ctx.rows) refs.push({ where: 'placement', id: r.unit_id, at: rowKey(r), row: r });
  for (const [rel, f] of ctx.data.files) {
    if (!f.json) continue;
    if (fileGroups.chronology(rel)) {
      f.json.events.forEach((e, i) => (e.units_involved || []).forEach((id) => refs.push({ where: 'chronology', id, at: `${rel}#${i}`, tick: e.tick })));
    }
    if (fileGroups.vignettes(rel)) {
      f.json.vignettes.forEach((v, i) => (v.units_featured || []).forEach((id) => refs.push({ where: 'vignette', id, at: `${rel}#${i}`, vid: v.vignette_id })));
    }
    if (rel === 'oob/commander_successions.json') {
      for (const k of ['union_successions', 'confederate_successions']) {
        (f.json[k] || []).forEach((s, i) => refs.push({ where: 'succession', id: s.unit_id, at: `${rel}#${k}[${i}]`, event_id: s.event_id }));
      }
    }
    if (rel === 'casualty_apportionment.json') {
      for (const k of ['union_corps', 'confederate_corps']) (f.json[k] || []).forEach((c, i) => refs.push({ where: 'casualty', id: c.corps_id, at: `${rel}#${k}[${i}]` }));
      const n = f.json.notable_intensity_notes || {};
      const walkNotes = (o, p) => {
        if (o && typeof o === 'object') {
          if (typeof o.unit === 'string') for (const m of o.unit.match(ID_IN_TEXT) || []) refs.push({ where: 'casualty_note', id: m, at: `${rel}#${p}` });
          for (const [k, v] of Object.entries(o)) if (v && typeof v === 'object') walkNotes(v, `${p}.${k}`);
        }
      };
      walkNotes(n, 'notable_intensity_notes');
    }
  }
  ctx._refs = refs;
  return refs;
}

function ancestorsOfRecord(ctx, rec) {
  return rec;
}

export const rules = [
  defineRule({
    id: 'R001', sev: 'E', family: 'refs', wp: 'WP-DATA-06', status: 'implemented', dv: ['DV-03', 'DV-04'],
    title: 'every unit id used in placements, chronology, vignettes, successions and casualty notes resolves to an OOB record',
    scope: 'placements, chronology, vignettes, successions, casualty notes',
    spec_baseline: '95 IDs / 216 rows (placements); 5 chronology refs; 1 succession',
    run(ctx) {
      const out = [];
      const placed = new Map(); // id -> rows
      for (const ref of collectRefs(ctx)) {
        if (resolves(ctx, ref.id)) continue;
        if (ref.where === 'placement') {
          if (!placed.has(ref.id)) placed.set(ref.id, []);
          placed.get(ref.id).push(ref);
        } else {
          out.push(V(`${ref.where}|${ref.at}|${ref.id}`, `${ref.where} ${ref.at}: unresolved id ${ref.id}`, { kind: ref.where, data: { id: ref.id } }));
        }
      }
      for (const [id, list] of [...placed].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
        out.push(V(`placement|${id}`, `placements: unresolved id ${id} (${list.length} rows)`, { kind: 'placement', rows: list.length, data: { id, rows: list.length } }));
      }
      return out;
    },
  }),
  defineRule({
    id: 'R002', sev: 'E', family: 'refs', wp: 'WP-DATA-06', status: 'implemented', dv: [],
    title: 'side prefix agrees with the OOB record; an id whose opposite-side twin exists is a wrong-prefix defect',
    scope: 'OOB, placements, chronology, vignettes',
    spec_baseline: '10 IDs (U- prefix on Confederate regiments; each C- twin also placed)',
    run(ctx) {
      const out = [];
      const seen = new Set();
      for (const rec of ctx.oob.list) {
        if (rec.side && rec.prefix_side && rec.side !== rec.prefix_side) {
          out.push(V(`oob|${rec.id}`, `OOB ${rec.id} in ${rec.file} has prefix side ${rec.prefix_side} but file side ${rec.side}`, { kind: 'oob_prefix', file: rec.file }));
        }
      }
      const rowsById = new Map();
      for (const ref of collectRefs(ctx)) {
        if (ref.where === 'placement') rowsById.set(ref.id, (rowsById.get(ref.id) || 0) + 1);
      }
      for (const ref of collectRefs(ctx)) {
        if (resolves(ctx, ref.id)) continue;
        const twin = flipPrefix(ref.id);
        if (twin === ref.id || !resolves(ctx, twin)) continue;
        // Only regiment-shaped ids whose state code contradicts the prefix are wrong-side defects. Brigade/division-shaped
        // ids (U-I-2-3, C-CAV-2-1) exist on BOTH sides for different formations: flipping them would change the unit.
        const st = (ref.id.match(/^[UC]-\d+([A-Z]{2})(?:-|$)/) || [])[1];
        const s = sideOfPrefix(ref.id);
        const contradicts = st && ((s === 'union' && CONFEDERATE_ONLY_STATES.has(st)) || (s === 'confederate' && UNION_ONLY_STATES.has(st)));
        if (!contradicts) continue;
        const k = `${ref.where}|${ref.id}`;
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(V(k, `${ref.where}: ${ref.id} does not exist but ${twin} does (wrong side prefix)`,
          { kind: 'twin_exists', rows: ref.where === 'placement' ? rowsById.get(ref.id) : 1, data: { id: ref.id, twin, twin_placed: ctx.rowsByUnit.has(twin) } }));
      }
      return out;
    },
  }),
  defineRule({
    id: 'R003', sev: 'E', family: 'refs', wp: 'WP-DATA-07', status: 'implemented', dv: ['DV-05'],
    title: 'regiment -> brigade -> division -> corps chain resolves (parent ids and child lists)',
    scope: 'OOB', spec_baseline: '36 regiments (VI Corps) + 8 division.brigade_ids links',
    run(ctx) {
      const out = [];
      const kindOf = (id) => ctx.oob.records.get(id)?.kind;
      for (const rec of ctx.oob.list) {
        const raw = rec.raw;
        if (rec.kind === 'regiment' && raw.parent_brigade_id && kindOf(raw.parent_brigade_id) !== 'brigade') {
          out.push(V(`regiment|${rec.id}|parent_brigade_id|${raw.parent_brigade_id}`, `${rec.id}: parent_brigade_id ${raw.parent_brigade_id} does not exist`, { kind: 'regiment->brigade', file: rec.file, data: { parent: raw.parent_brigade_id } }));
        }
        if ((rec.kind === 'regiment' || rec.kind === 'brigade' || rec.kind === 'division') && raw.parent_corps_id && kindOf(raw.parent_corps_id) !== 'corps') {
          out.push(V(`${rec.kind}|${rec.id}|parent_corps_id|${raw.parent_corps_id}`, `${rec.id}: parent_corps_id ${raw.parent_corps_id} does not exist`, { kind: `${rec.kind}->corps`, file: rec.file }));
        }
        if (rec.kind === 'brigade' && raw.parent_division_id && kindOf(raw.parent_division_id) !== 'division') {
          out.push(V(`brigade|${rec.id}|parent_division_id|${raw.parent_division_id}`, `${rec.id}: parent_division_id ${raw.parent_division_id} does not exist`, { kind: 'brigade->division', file: rec.file }));
        }
        if (rec.kind === 'division') for (const b of raw.brigade_ids || []) {
          if (kindOf(b) !== 'brigade') out.push(V(`division|${rec.id}|brigade_ids|${b}`, `${rec.id}: brigade_ids lists ${b}, which does not exist`, { kind: 'division->brigade', file: rec.file, data: { brigade: b } }));
        }
        if (rec.kind === 'corps') for (const d of raw.division_ids || []) {
          if (kindOf(d) !== 'division') out.push(V(`corps|${rec.id}|division_ids|${d}`, `${rec.id}: division_ids lists ${d}, which does not exist`, { kind: 'corps->division', file: rec.file }));
        }
        if (rec.kind === 'brigade') for (const r of raw.regiment_ids || []) {
          const k = kindOf(r);
          if (k !== 'regiment' && k !== 'battery') out.push(V(`brigade|${rec.id}|regiment_ids|${r}`, `${rec.id}: regiment_ids lists ${r}, which does not exist`, { kind: 'brigade->regiment', file: rec.file }));
        }
      }
      return out;
    },
  }),
  defineRule({
    id: 'R004', sev: 'E', family: 'refs', wp: 'WP-DATA-07', status: 'implemented', dv: [],
    title: 'brigade.regiment_ids and regiment.parent_brigade_id are reciprocal',
    scope: 'OOB', spec_baseline: '36 regiments unlisted (431/467 reciprocal)',
    run(ctx) {
      const out = [];
      const listedBy = new Map(); // regiment id -> [brigade ids]
      for (const rec of ctx.oob.list) if (rec.kind === 'brigade') for (const r of rec.raw.regiment_ids || []) {
        if (!listedBy.has(r)) listedBy.set(r, []);
        listedBy.get(r).push(rec.id);
      }
      for (const rec of ctx.oob.list) {
        if (rec.kind !== 'regiment' && !(rec.kind === 'battery' && rec.filed_as === 'regiment')) continue;
        const parent = rec.raw.parent_brigade_id;
        const lists = listedBy.get(rec.id) || [];
        if (!lists.includes(parent)) {
          out.push(V(`regiment|${rec.id}`, `${rec.id}: parent_brigade_id ${parent} does not list it (listed by: ${lists.join(', ') || 'nobody'})`,
            { kind: ctx.oob.records.get(parent)?.kind === 'brigade' ? 'parent_does_not_list' : 'parent_missing', file: rec.file, data: { parent, listed_by: lists } }));
        }
      }
      for (const [rid, lists] of listedBy) {
        const rec = ctx.oob.records.get(rid);
        if (!rec) continue;
        for (const b of lists) if (rec.raw.parent_brigade_id && rec.raw.parent_brigade_id !== b) {
          out.push(V(`listed|${b}|${rid}`, `${b} lists ${rid} but its parent_brigade_id is ${rec.raw.parent_brigade_id}`, { kind: 'listed_but_not_child', file: rec.file }));
        }
      }
      return out;
    },
  }),
  defineRule({
    id: 'R005', sev: 'E', family: 'refs', wp: 'WP-DATA-06', status: 'implemented', dv: [],
    title: 'ids unique across all OOB files; a regiment is listed by at most one brigade',
    scope: 'OOB', spec_baseline: '0',
    run(ctx) {
      const out = ctx.oob.duplicates.map((d) => V(`dup|${d.id}`, `${d.id} defined in ${d.first.file} and ${d.second.file}`, { kind: 'duplicate_id' }));
      const seen = new Map();
      for (const rec of ctx.oob.list) if (rec.kind === 'brigade') for (const r of rec.raw.regiment_ids || []) {
        if (seen.has(r)) out.push(V(`multi|${r}`, `${r} listed by ${seen.get(r)} and ${rec.id}`, { kind: 'multi_parent' }));
        else seen.set(r, rec.id);
      }
      return out;
    },
  }),
  defineRule({
    id: 'R006', sev: 'E', family: 'refs', wp: 'WP-DATA-06', status: 'implemented', dv: ['DV-17'],
    title: 'alias_for resolves; alias rows are hidden (visibility:hidden); no public strength:0 row',
    scope: 'OOB regiments', spec_baseline: '1 alias visible (U-14BK)',
    run(ctx) {
      const out = [];
      for (const rec of ctx.oob.list) {
        const raw = rec.raw;
        const why = [];
        if (raw.alias_for) {
          if (!ctx.oob.records.has(raw.alias_for)) why.push('alias_for unresolved');
          if (raw.visibility !== 'hidden') why.push('alias row is not visibility:hidden');
        }
        if (rec.kind === 'regiment' && raw.strength === 0 && raw.visibility !== 'hidden') why.push('public strength 0');
        if (why.length) out.push(V(`oob|${rec.id}`, `${rec.id}: ${why.join('; ')}`, { kind: 'alias', file: rec.file, data: { why } }));
      }
      return out;
    },
  }),
  defineRule({
    id: 'R007', sev: 'E', family: 'refs', wp: 'WP-DATA-06', status: 'partial', dv: ['DV-18'],
    title: 'unit id matches the grammar for its level; regiment ids agree with their state code (side)',
    scope: 'OOB ids; unresolved placement ids',
    spec_baseline: '>= 95 non-conforming (the specialist did not publish the grammar; this rule measures its own grammar in tools/data/lib/oob.mjs)',
    note: 'partial: grammar is derived from the legacy OOB shapes; the target grammar (per unit_level, explicit side/level/arm fields) is WP-DATA-06.',
    run(ctx) {
      const out = [];
      const stateOf = (id) => (id.match(/^[UC]-\d+([A-Z]{2})(?:-|$)/) || [])[1] ?? null;
      const stateSideMismatch = (id) => {
        const st = stateOf(id);
        const s = sideOfPrefix(id);
        if (!st || !s) return false;
        return (s === 'union' && CONFEDERATE_ONLY_STATES.has(st)) || (s === 'confederate' && UNION_ONLY_STATES.has(st));
      };
      for (const rec of ctx.oob.list) {
        const g = ID_GRAMMAR[rec.kind];
        if (g && !g.test(rec.id)) out.push(V(`oob|${rec.id}`, `${rec.id} does not match the ${rec.kind} id grammar`, { kind: 'oob_grammar', file: rec.file }));
        else if ((rec.kind === 'regiment') && stateSideMismatch(rec.id)) out.push(V(`oob|${rec.id}`, `${rec.id}: state code contradicts the side prefix`, { kind: 'state_side', file: rec.file }));
      }
      const seen = new Set();
      for (const ref of collectRefs(ctx)) {
        if (ref.where !== 'placement' || resolves(ctx, ref.id) || seen.has(ref.id)) continue;
        seen.add(ref.id);
        const any = Object.values(ID_GRAMMAR).some((g) => g.test(ref.id));
        if (!any) out.push(V(`placement|${ref.id}`, `${ref.id}: no id grammar matches`, { kind: 'placement_grammar' }));
        else if (stateSideMismatch(ref.id)) out.push(V(`placement|${ref.id}`, `${ref.id}: state code contradicts the side prefix`, { kind: 'state_side' }));
      }
      return out;
    },
  }),
  defineRule({
    id: 'R009', sev: 'E', family: 'refs', wp: 'WP-DATA-03', status: 'implemented', dv: ['DV-16', 'DV-20'],
    title: 'vignette ids unique, vignette_trigger values exist, one vignette per trigger tick',
    scope: 'vignettes, placements', spec_baseline: '1 duplicate tick (556)',
    run(ctx) {
      const out = [];
      const vs = [];
      for (const [rel, f] of ctx.data.files) if (fileGroups.vignettes(rel) && f.json) for (const v of f.json.vignettes) vs.push({ ...v, file: rel });
      const ids = new Map(), ticks = new Map();
      for (const v of vs) {
        if (ids.has(v.vignette_id)) out.push(V(`dup_id|${v.vignette_id}`, `duplicate vignette id ${v.vignette_id}`, { kind: 'duplicate_id' }));
        ids.set(v.vignette_id, v);
        if (!ticks.has(v.trigger_tick)) ticks.set(v.trigger_tick, []);
        ticks.get(v.trigger_tick).push(v.vignette_id);
      }
      for (const [t, list] of ticks) if (list.length > 1) out.push(V(`dup_tick|${t}`, `trigger tick ${t} is shared by ${list.join(', ')}`, { kind: 'duplicate_trigger_tick', data: { tick: t, ids: list } }));
      for (const r of ctx.rows) if (r.vignette_trigger && !ids.has(r.vignette_trigger)) out.push(V(`trigger|${rowKey(r)}`, `${rowLabel(r)} references unknown vignette ${r.vignette_trigger}`, { kind: 'unknown_vignette' }));
      return out;
    },
  }),
  defineRule({
    id: 'R010', sev: 'W', family: 'refs', wp: 'WP-DATA-12', status: 'implemented', dv: [],
    title: 'featured units have a track sample within +-1 tick of the vignette trigger',
    scope: 'vignettes x placements',
    spec_baseline: '7 vignettes (V-001, V-007, V-015, V-017, V-019, V-023, V-024); DI section 6 prints "+-2" but its own DI-22 and chapter 13 WP-12 use +-1',
    run(ctx) {
      const out = [];
      const W = ctx.opts.r010Window ?? 1;
      for (const [rel, f] of ctx.data.files) {
        if (!fileGroups.vignettes(rel) || !f.json) continue;
        for (const v of f.json.vignettes) {
          const units = v.units_featured || [];
          const hit = units.some((u) => (ctx.rowsByUnit.get(u) || []).some((r) => Math.abs(r.tick - v.trigger_tick) <= W));
          if (!hit) out.push(V(`vignette|${v.vignette_id}`, `${v.vignette_id} (tick ${v.trigger_tick}): no featured-unit sample within +-${W} tick(s)${units.length ? '' : ' (units_featured is empty)'}`, { kind: units.length ? 'no_sample' : 'no_units', file: rel }));
        }
      }
      return out;
    },
  }),
  defineRule({
    id: 'R011', sev: 'W', family: 'refs', wp: 'WP-DATA-06', status: 'partial', dv: [],
    title: 'a formation named in a row note ("Vincent\'s brigade") belongs to the OOB unit the row is keyed to (cameo allow-list)',
    scope: 'placement notes', spec_baseline: '28 IDs / 44 rows',
    note: 'partial: heuristic surname-vs-commander-chain match; kind must agree (brigade/division/corps). Not a proof.',
    run(ctx) {
      const out = [];
      const surname = (name) => {
        const t = String(name).replace(/\(.*?\)/g, '').trim().split(/\s+/);
        return t[t.length - 1]?.replace(/[^A-Za-z'-]/g, '');
      };
      const chainNames = (c, acc = new Set()) => {
        if (!c || typeof c !== 'object') return acc;
        if (c.name) acc.add(surname(c.name));
        for (const k of ['successor', 'second_successor', 'survivor']) if (c[k]) chainNames(c[k], acc);
        return acc;
      };
      const kindsByCommander = new Map(); // `${kind}|${surname}` -> Set(ids)
      const namesOf = new Map();
      for (const rec of ctx.oob.list) {
        if (!['brigade', 'division', 'corps'].includes(rec.kind)) continue;
        const names = chainNames(rec.raw.commander);
        const des = (rec.raw.designation || '').match(/([A-Z][A-Za-z'-]+)(?:'s|s')/g) || [];
        for (const d of des) names.add(d.replace(/(?:'s|s')$/, ''));
        namesOf.set(rec.id, names);
        for (const n of names) {
          const k = `${rec.kind}|${n}`;
          if (!kindsByCommander.has(k)) kindsByCommander.set(k, new Set());
          kindsByCommander.get(k).add(rec.id);
        }
      }
      const cameo = new Set(ctx.opts.r011Cameo ?? []);
      const rx = /\b([A-Z][A-Za-z'-]+?)(?:'s|s')\s+(brigade|division|corps)\b/g;
      for (const r of ctx.rows) {
        if (!r.notes) continue;
        const rec = ctx.oob.records.get(r.unit_id);
        if (!rec || !['brigade', 'division', 'corps'].includes(rec.kind)) continue;
        for (const m of r.notes.matchAll(rx)) {
          const [, name, kind] = m;
          if (kind !== rec.kind) continue;
          if (namesOf.get(rec.id).has(name)) continue;
          const others = kindsByCommander.get(`${kind}|${name}`);
          if (!others || cameo.has(`${rowLabel(r)}|${name}`)) continue;
          out.push(V(`${rowKey(r)}|${name}`, `${rowLabel(r)} (${rec.id}, ${namesOf.get(rec.id) ? [...namesOf.get(rec.id)].join('/') : ''}) is annotated "${name}'s ${kind}", which is ${[...others].join('/')} in the OOB`,
            { kind: 'note_names_other_formation', file: r.file, data: { unit_id: r.unit_id, tick: r.tick, named: name, oob_candidates: [...others] } }));
          break;
        }
      }
      return out;
    },
  }),
  defineRule({
    id: 'R008', sev: 'E', family: 'refs', wp: 'WP-DATA-20', status: 'partial', dv: [],
    title: 'every deep link a page generates uses a query parameter the map app actually reads',
    scope: 'legacy/dist html + bundle (static text scan)',
    spec_baseline: '521 search links + 24 vignette links + share links unread (the app reads only ?ancestor)',
    note: 'partial: a static text scan of emitters vs readers. The full rule (unit has a track, tick range, vignette exists) needs the v2 unit index.',
    run(ctx) {
      if (!ctx.distText || ctx.distText.size === 0) return null;
      const emitted = new Map(); // param -> [files]
      const emitRx = /[?&](unit|tick|vignette|lat|lng|t|u|z|ll|ancestor|day|regiment)=/g;
      for (const [rel, text] of ctx.distText) {
        if (!rel.endsWith('.html')) continue;
        for (const m of text.matchAll(/(?:index\.html|['"`]\/)\?[^'"`\s)]*/g)) {
          for (const p of m[0].matchAll(/[?&]([a-z]+)=/g)) {
            if (!emitted.has(p[1])) emitted.set(p[1], new Set());
            emitted.get(p[1]).add(rel);
          }
        }
      }
      void emitRx;
      // readers: searchParams.get("x") / params.get('x') anywhere in index.html or the main bundle
      const readers = new Set();
      for (const [rel, text] of ctx.distText) {
        if (!(rel === 'index.html' || /^assets\/index-.*\.js$/.test(rel))) continue;
        for (const m of text.matchAll(/(?:searchParams|URLSearchParams\([^)]*\)|params)\s*\.get\(\s*["'`]([a-zA-Z_]+)["'`]\s*\)/g)) readers.add(m[1]);
      }
      const out = [];
      for (const [param, files] of emitted) {
        if (readers.has(param)) continue;
        for (const f of files) out.push(V(`${f}|${param}`, `${f} generates ?${param}= but the map app does not read it`, { kind: 'emitter_without_reader', file: f, data: { param, readers: [...readers] } }));
      }
      return out;
    },
  }),
];

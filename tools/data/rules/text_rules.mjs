// X001-X007: published-text quality. "Published" = every string a page can display or index, i.e. every string leaf of a served
// data file except: metadata blocks, the _note key, the prose file placement_schema.json, authoring keys, and id/enum reference fields.
import { defineRule, V } from './define.mjs';
import { walkStrings } from '../lib/util.mjs';
import { fileGroups } from '../lib/load.mjs';

/** Authoring keys: dev instructions that ship to every visitor but no page reads (chapter 13 WP-DATA-09 step 3). */
export const AUTHORING_KEYS = new Set(['flag', 'flag_notes', 'data_correction', 'chunk', 'supplements_file', 'supplements_files']);
const ID_LEAF = /(?:^|\.)(?:unit_id|regiment_id|brigade_id|division_id|corps_id|battery_id|battalion_id|army_id|event_id|vignette_id|location_id|road_id|structure_id|feature_id|id|parent_brigade_id|parent_corps_id|parent_division_id|alias_for|corps|unit_type|state|disposition|significance|side|vignette_trigger|coordinate_system|time|tick_formula)$/;
const ID_ARRAY = /(?:units_involved|units_featured|regiment_ids|brigade_ids|division_ids|corps_covered|day_relevance|vignette_id_range)\[\d+\]$/;

function leafOf(p) { return p.replace(/\[\d+\]/g, '').split('.').pop(); }

/** Iterate published prose strings: yields {rel, path, leaf, text}. */
export function* publishedStrings(ctx, { includeAuthoring = [] } = {}) {
  for (const [rel, f] of ctx.data.files) {
    if (!f.json || rel === 'placement_schema.json') continue;
    for (const [p, s] of walkStrings(f.json)) {
      if (p.startsWith('metadata') || p.startsWith('_note')) continue;
      const leaf = leafOf(p);
      if (AUTHORING_KEYS.has(leaf) && !includeAuthoring.includes(leaf)) continue;
      if (ID_LEAF.test(p.replace(/\[\d+\]/g, '')) || ID_ARRAY.test(p)) continue;
      yield { rel, path: p, leaf, text: s };
    }
  }
}

const ID_RX = /\b[UC]-[A-Z0-9]+(?:-[A-Za-z0-9]+)*\b|\b(?:CS|US)-\d{3}\b/g;

const BANNED = [
  { id: 'data_note', rx: /DATA NOTE/g },
  { id: 'todo', rx: /\bTODO\b|\bFIXME\b/g },
  { id: 'alias_for', rx: /\balias for\b/gi },
  { id: 'undefined', rx: /\bundefined\b/g },
  { id: 'null', rx: /\bnull\b/g },
  { id: 'nan', rx: /\bNaN\b/g },
  { id: 'youtube_vignette', rx: /YouTube/g },
  { id: 'animation_note', rx: /CRITICAL ANIMATION|must be (?:shown|placed)|Fix tracked/g },
];

const ORD = /\b(\d+)(st|nd|rd|th)\b/g;
const ordSuffix = (n) => (n % 100 >= 11 && n % 100 <= 13 ? 'th' : { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th');

function editDistance1(a, b) {
  if (a === b) return false;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length === b.length) { i++; j++; } else if (a.length > b.length) i++; else j++;
  }
  return edits + (a.length - i) + (b.length - j) === 1;
}

export const rules = [
  defineRule({
    id: 'X001', sev: 'E', family: 'text', wp: 'WP-DATA-09', status: 'implemented', dv: [],
    title: 'no " -- " (ASCII stand-in for an em dash) in published text', scope: 'published prose',
    spec_baseline: '1,591 (DI section 3.8 field groups; this rule\'s wider scope counts more, see the baseline report reconciliation)',
    run(ctx) {
      const out = [];
      for (const s of publishedStrings(ctx)) {
        let n = 0, idx = -1;
        while ((idx = s.text.indexOf(' -- ', idx + 1)) >= 0) out.push(V(`${s.rel}:${s.path}#${n++}`, `${s.rel} ${s.path}: " -- "`, { file: s.rel, kind: s.leaf }));
      }
      return out;
    },
  }),
  defineRule({
    id: 'X002', sev: 'E', family: 'text', wp: 'WP-DATA-17', status: 'implemented', dv: [],
    title: 'no internal ids (U-20ME, C-CAV-1, US-001, CS-016) in published text', scope: 'published prose + chronology flag',
    spec_baseline: '72 strings (DI: chronology flag) plus UI prints; this rule scans all published prose and the flag field',
    run(ctx) {
      const out = [];
      for (const s of publishedStrings(ctx, { includeAuthoring: ['flag'] })) {
        const ms = s.text.match(ID_RX);
        if (ms) out.push(V(`${s.rel}:${s.path}`, `${s.rel} ${s.path}: ${[...new Set(ms)].join(', ')}`, { file: s.rel, kind: s.leaf, data: { ids: [...new Set(ms)] } }));
      }
      return out;
    },
  }),
  defineRule({
    id: 'X003', sev: 'E', family: 'text', wp: 'WP-DATA-09', status: 'implemented', dv: [],
    title: 'no developer notes or placeholder tokens in served data (flag_notes, data_correction, DATA NOTE, alias for, undefined/null/NaN, "YouTube vignette")',
    scope: 'served data',
    spec_baseline: '60 flag_notes; "alias for" x1 (+ 4 "YouTube vignette" strings, chapter 13 s2.4)',
    run(ctx) {
      const out = [];
      for (const [rel, f] of ctx.data.files) {
        if (!f.json || rel === 'placement_schema.json') continue;
        for (const [p] of walkStrings(f.json)) {
          const leaf = leafOf(p);
          if (leaf === 'flag_notes' || leaf === 'data_correction') out.push(V(`${rel}:${p}|dev_key`, `${rel} ${p}: developer key ${leaf} ships to every visitor`, { file: rel, kind: leaf }));
        }
      }
      for (const s of publishedStrings(ctx, { includeAuthoring: ['flag'] })) {
        for (const b of BANNED) {
          if (b.id === 'data_note' && s.leaf === 'flag_notes') continue;
          if ((s.text.match(b.rx) || []).length) out.push(V(`${s.rel}:${s.path}|${b.id}`, `${s.rel} ${s.path}: banned token (${b.id})`, { file: s.rel, kind: b.id }));
        }
      }
      // authoring-key strings can also carry the YouTube provenance claim; count them once each under their own key
      for (const [rel, f] of ctx.data.files) {
        if (!f.json || rel === 'placement_schema.json') continue;
        for (const [p, t] of walkStrings(f.json)) {
          if (!/(?:^|\.)flag_notes$|\.flag_notes$|(?:^|\.)flag$/.test(p.replace(/\[\d+\]/g, ''))) continue;
          if (/YouTube/.test(t)) out.push(V(`${rel}:${p}|youtube_vignette`, `${rel} ${p}: cites a "YouTube vignette" (derivation question, chapter 13 Q-DATA-7)`, { file: rel, kind: 'youtube_vignette' }));
        }
      }
      return out;
    },
  }),
  defineRule({
    id: 'X004', sev: 'W', family: 'text', wp: 'WP-DATA-17', status: 'partial', dv: ['DV-18'],
    title: 'ordinal suffixes are correct; regiment designations start with an ordinal; brigade designations start with a spelled-out ordinal',
    scope: 'OOB designations, published prose', spec_baseline: '0 ordinal errors; 79 distinct designation shapes (no style guide exists yet)',
    note: 'partial: the docs-copy style guide that defines the target format does not exist; only mechanical checks run.',
    run(ctx) {
      const out = [];
      for (const s of publishedStrings(ctx)) {
        for (const m of s.text.matchAll(ORD)) {
          if (ordSuffix(Number(m[1])) !== m[2]) out.push(V(`${s.rel}:${s.path}|${m[0]}`, `${s.rel} ${s.path}: "${m[0]}"`, { file: s.rel, kind: 'ordinal' }));
        }
      }
      for (const rec of ctx.oob.list) {
        const d = rec.raw.designation || '';
        if (rec.kind === 'regiment' && !/^\d+(st|nd|rd|th)\b/.test(d) && !rec.alias_for) out.push(V(`regiment|${rec.id}`, `${rec.id}: designation "${d}" does not start with an ordinal`, { kind: 'regiment_designation', file: rec.file }));
        if (rec.kind === 'brigade' && !/^(First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth)\b|^[A-Z][A-Za-z.' -]+ Brigade\b/.test(d)) out.push(V(`brigade|${rec.id}`, `${rec.id}: designation "${d}"`, { kind: 'brigade_designation', file: rec.file }));
      }
      return out;
    },
  }),
  defineRule({
    id: 'X005', sev: 'W', family: 'text', wp: 'WP-DATA-17', status: 'partial', dv: [],
    title: 'spelling: no known typo variants; rare capitalised words one edit away from a frequent word are reported', scope: 'published prose',
    spec_baseline: '3 confirmed (Krzyznowski, Nichols\'s, Gulp\'s) + Brian Farm, Rose\'s Woods variants',
    note: 'partial: the corpus-derived near-miss report is heuristic (rare word count <= 2, neighbour count >= 8, length >= 6); data-src/policy/lexicon.json (WP-17) does not exist yet.',
    run(ctx) {
      const out = [];
      const KNOWN = [
        [/Krzyznowski/g, 'Krzyzanowski'], [/Nichols's/g, "Nicholls's"], [/Gulp's/g, "Culp's"], [/Brian Farm/g, 'Bryan Farm'], [/Rose's Woods/g, 'Rose Woods'],
      ];
      const counts = new Map();
      const sites = new Map();
      for (const s of publishedStrings(ctx)) {
        for (const [rx, fix] of KNOWN) if (rx.test(s.text)) { rx.lastIndex = 0; out.push(V(`${s.rel}:${s.path}|${fix}`, `${s.rel} ${s.path}: variant of "${fix}"`, { file: s.rel, kind: 'known_typo' })); }
        for (const m of s.text.matchAll(/\b[A-Z][a-z]{5,}\b/g)) {
          const w = m[0];
          counts.set(w, (counts.get(w) || 0) + 1);
          if (!sites.has(w)) sites.set(w, []);
          sites.get(w).push(`${s.rel}:${s.path}`);
        }
      }
      const frequent = [...counts].filter(([, n]) => n >= 8).map(([w]) => w);
      for (const [w, n] of counts) {
        if (n > 2) continue;
        const near = frequent.find((f) => editDistance1(w, f) && f[0] === w[0]);
        if (near) out.push(V(`near|${w}|${near}`, `"${w}" (${n}x, ${sites.get(w)[0]}) is one edit from "${near}" (${counts.get(near)}x)`, { kind: 'near_miss', data: { word: w, neighbour: near } }));
      }
      return out;
    },
  }),
  defineRule({
    id: 'X006', sev: 'W', family: 'text', wp: 'WP-DATA-17', status: 'implemented', dv: [],
    title: 'length bounds: panel_summary 40-320 chars, key_action >= 40 chars, vignette paragraph <= 900 chars', scope: 'published prose',
    spec_baseline: '169 short key_action',
    run(ctx) {
      const out = [];
      for (const rec of ctx.oob.list) {
        const k = rec.raw.key_action;
        if (typeof k === 'string' && k.length < 40) out.push(V(`key_action|${rec.id}`, `${rec.id}: key_action is ${k.length} chars ("${k}")`, { kind: `short_key_action:${rec.kind}`, file: rec.file }));
      }
      for (const [rel, f] of ctx.data.files) {
        if (!fileGroups.vignettes(rel) || !f.json) continue;
        for (const v of f.json.vignettes) {
          if (v.panel_summary.length < 40 || v.panel_summary.length > 320) out.push(V(`panel|${v.vignette_id}`, `${v.vignette_id}: panel_summary ${v.panel_summary.length} chars`, { kind: 'panel_length', file: rel }));
          v.full_script.split(/\n\n/).forEach((para, i) => { if (para.length > 900) out.push(V(`para|${v.vignette_id}#${i}`, `${v.vignette_id} paragraph ${i}: ${para.length} chars`, { kind: 'paragraph_length', file: rel })); });
        }
      }
      return out;
    },
  }),
  defineRule({
    id: 'X007', sev: 'E', family: 'text', wp: 'WP-DATA-17', status: 'implemented', dv: ['DV-16'],
    title: 'vignettes carry paragraphs[] (no "\\n\\n" paragraph breaks packed inside one string)', scope: 'vignettes',
    spec_baseline: '24 (249 packed breaks)',
    run(ctx) {
      const out = [];
      for (const [rel, f] of ctx.data.files) {
        if (!fileGroups.vignettes(rel) || !f.json) continue;
        for (const v of f.json.vignettes) {
          const n = (v.full_script.match(/\n\n/g) || []).length;
          if (n) out.push(V(`vignette|${v.vignette_id}`, `${v.vignette_id}: ${n} paragraph break(s) inside full_script`, { file: rel, kind: 'packed_breaks', data: { breaks: n } }));
        }
      }
      return out;
    },
  }),
];

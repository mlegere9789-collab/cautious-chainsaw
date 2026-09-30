// F001, F002 (facts registry) and K001 (consumer/corpus field drift).
import fs from 'node:fs';
import path from 'node:path';
import { defineRule, V } from './define.mjs';
import { REPO_ROOT, walkStrings } from '../lib/util.mjs';

const lineOf = (text, index) => text.slice(0, index).split('\n').length;

function scopeMatches(scope, rel) {
  const s = scope.split(',');
  if (rel.endsWith('.html') && s.includes('html')) return true;
  if (rel === 'manifest.json' && s.includes('manifest')) return true;
  if (/^assets\/helpmodal-.*\.js$/i.test(rel) && s.includes('helpmodal')) return true;
  return false;
}

export function retiredLiteralHits(ctx) {
  const cfg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'data-src', 'policy', 'retired_literals.json'), 'utf8'));
  const hits = [];
  for (const lit of cfg.literals) {
    const rx = new RegExp(lit.rx, 'g');
    for (const [rel, text] of ctx.distText) {
      if (rel.startsWith('assets/') && !/^assets\/helpmodal-/i.test(rel)) continue;
      if (!scopeMatches(lit.scope, rel)) continue;
      for (const m of text.matchAll(rx)) hits.push({ id: lit.id, where: rel, line: lineOf(text, m.index), literal: m[0], meaning: lit.meaning });
    }
    if (lit.scope.split(',').includes('data')) {
      for (const [rel, f] of ctx.data.files) {
        if (!f.json) continue;
        for (const [p, s] of walkStrings(f.json)) {
          if (p.startsWith('metadata')) continue;
          for (const m of s.matchAll(rx)) hits.push({ id: lit.id, where: `data/${rel}`, line: p, literal: m[0], meaning: lit.meaning });
        }
      }
    }
  }
  return hits;
}

export const rules = [
  defineRule({
    id: 'F001', sev: 'E', family: 'facts', wp: 'WP-DATA-19', status: 'implemented', dv: ['DV-11', 'DV-23'],
    title: 'retired count/total literals (467, 445+, 51,000, "467 regiments and batteries", 28,000) are not typed into pages or data',
    scope: 'legacy/dist html + manifest + Help chunk + data strings', spec_baseline: '>= 30 literal occurrences (DI section 7: 467 x10, 445+ x1, 51,000 x6 ...)',
    note: 'The banned list is data-src/policy/retired_literals.json; the values that replace them come from data-src/build/facts.json.',
    run(ctx) {
      if (!ctx.distText || ctx.distText.size === 0) return null;
      return retiredLiteralHits(ctx).map((h) => V(`${h.id}|${h.where}:${h.line}`, `${h.where}:${h.line} prints "${h.literal}" (${h.meaning})`, { kind: h.id, file: h.where }));
    },
  }),
  defineRule({
    id: 'F002', sev: 'E', family: 'facts', wp: 'WP-DATA-19', status: 'implemented', dv: [],
    title: 'every {{facts.path}} token resolves in facts.json', scope: 'legacy/dist text, data-src/**/*.{md,html,json}',
    spec_baseline: 'n/a (no tokens exist yet)',
    run(ctx) {
      const factsPath = path.join(REPO_ROOT, 'data-src', 'build', 'facts.json');
      const facts = fs.existsSync(factsPath) ? JSON.parse(fs.readFileSync(factsPath, 'utf8')) : null;
      const texts = [...(ctx.distText ?? [])];
      const walk = (dir) => {
        if (!fs.existsSync(dir)) return;
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
          const p = path.join(dir, e.name);
          if (e.isDirectory()) { if (e.name !== 'build' && e.name !== 'node_modules') walk(p); } else if (/\.(md|html|json|txt)$/.test(e.name)) texts.push([path.relative(REPO_ROOT, p).split(path.sep).join('/'), fs.readFileSync(p, 'utf8')]);
        }
      };
      walk(path.join(REPO_ROOT, 'data-src'));
      const out = [];
      for (const [rel, text] of texts) {
        for (const m of text.matchAll(/\{\{\s*facts\.([A-Za-z0-9_.]+)\s*\}\}/g)) {
          let cur = facts;
          for (const k of m[1].split('.')) cur = cur && typeof cur === 'object' ? cur[k] : undefined;
          if (cur === undefined) out.push(V(`${rel}:${lineOf(text, m.index)}|${m[1]}`, `${rel}:${lineOf(text, m.index)}: {{facts.${m[1]}}} does not resolve${facts ? '' : ' (facts.json not built)'}`, { file: rel }));
        }
      }
      return out;
    },
  }),
  defineRule({
    id: 'K001', sev: 'E', family: 'corpus', wp: 'WP-DATA-17', status: 'partial', dv: [],
    title: 'every field a page reads from a dataset exists in that dataset\'s schema (kills the chronology e.title drift)',
    scope: 'legacy/dist html (for...of loops over .regiments/.vignettes/.events/.key_locations)',
    spec_baseline: '1 (Historian chronology reads e.title/e.description; the rows have event/narrative)',
    note: 'partial: a static scan of `for (const X of (Y.<dataset> || []))` loops in the deploy html; the v2 rule checks the search-core index build.',
    run(ctx) {
      if (!ctx.distText || ctx.distText.size === 0) return null;
      const schemaDir = path.join(REPO_ROOT, 'data-src', 'schemas');
      const load = (f) => JSON.parse(fs.readFileSync(path.join(schemaDir, f), 'utf8'));
      const oob = load('oob.schema.json').$defs;
      const known = {
        regiments: new Set(Object.keys(oob.regiment.properties)),
        vignettes: new Set(Object.keys(load('vignettes.schema.json').$defs.vignette.properties)),
        events: new Set(Object.keys(load('chronology.schema.json').$defs.event.properties)),
        key_locations: new Set(Object.keys(load('terrain.schema.json').properties.key_locations.items.properties)),
      };
      const out = [];
      for (const [rel, text] of ctx.distText) {
        if (!rel.endsWith('.html')) continue;
        const rx = /for\s*\(\s*const\s+(\w+)\s+of\s+\(\s*[\w.]+\.(regiments|vignettes|events|key_locations)\s*\|\|\s*\[\]\s*\)\s*\)\s*\{/g;
        for (const m of text.matchAll(rx)) {
          const [head, v, ds] = m;
          let depth = 1, i = m.index + head.length;
          while (i < text.length && depth > 0) { if (text[i] === '{') depth++; else if (text[i] === '}') depth--; i++; }
          const body = text.slice(m.index + head.length, i);
          const reads = new Set([...body.matchAll(new RegExp(`\\b${v}\\.([A-Za-z_][A-Za-z0-9_]*)`, 'g'))].map((x) => x[1]));
          const unknown = [...reads].filter((f) => !known[ds].has(f) && !/^(toLocaleString|toLowerCase|toFixed|length|map|filter|includes|startsWith)$/.test(f));
          if (unknown.length) out.push(V(`${rel}|${ds}`, `${rel} reads ${unknown.map((f) => `${v}.${f}`).join(', ')} from ${ds}, which has no such field`, { file: rel, kind: ds, data: { fields: unknown } }));
        }
      }
      return out;
    },
  }),
];

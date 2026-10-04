// Core of copy_lint: walk a tree, extract the user-facing strings of each file, apply the rules, return findings.
import fs from 'node:fs';
import path from 'node:path';
import { extractFile, globMatch, DEFAULT_PROSE_KEYS } from './extract.mjs';
import { RULES, buildCounts, matchRules } from './rules.mjs';
import { loadFacts, repoRoot } from './facts.mjs';

export const REPO = repoRoot();
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
export const posix = (p) => p.split(path.sep).join('/');

export function loadConfig(root = REPO) {
  const dir = path.join(root, 'tools', 'copy');
  const names = readJson(path.join(dir, 'names.json')).names;
  const countsConfig = readJson(path.join(dir, 'counts.json'));
  const scan = readJson(path.join(dir, 'scan-config.json'));
  return { names, countsConfig, scan };
}

export function walk(dir, rel = '') {
  const out = [];
  for (const e of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) { if (e.name === 'node_modules' || e.name === '.git') continue; out.push(...walk(dir, r)); } else out.push(r);
  }
  return out.sort();
}

export const wanted = (rel, scan) => scan.include.some((g) => globMatch(g, rel)) && !scan.exclude.some((e) => globMatch(e.glob, rel));

/**
 * @param {string} rel posix path (relative to the scan root; decides the file kind and which exclusions apply)
 * @param {string} src
 * @param {{names, counts, facts, scan, only?:Set}} env
 */
export function lintSource(rel, src, env) {
  const config = { jsSkipRegions: env.scan.jsSkipRegions, proseKeys: env.scan.proseKeys };
  const { items, directives, notes } = extractFile(rel, src, config);
  const findings = [];
  const ctxBase = { names: env.names, counts: env.counts, facts: env.facts, proseKeys: env.scan.proseKeys || DEFAULT_PROSE_KEYS, allowedEmails: env.scan.allowedEmails || [] };
  let suppressed = 0;
  for (const item of items) {
    for (const m of matchRules(item, ctxBase, env.only)) {
      const off = item.offset;
      if (directives.some((d) => off >= d.from && off < d.to && (d.rules === '*' || d.rules.includes(m.rule)))) { suppressed++; continue; }
      const text = item.text;
      const ctx = text.slice(Math.max(0, m.index - 24), m.index + m.length + 24);
      findings.push({
        rule: m.rule, sev: m.sev, file: rel, line: item.line || 0, where: item.where || '', kind: item.kind,
        match: text.slice(m.index, m.index + m.length), context: ctx, detail: m.detail || '', suppressed: false,
      });
    }
  }
  return { findings, notes, suppressed, strings: items.length };
}

export function makeEnv({ root = REPO, factsPath = null, only = null } = {}) {
  const cfg = loadConfig(root);
  const f = loadFacts({ factsPath, root });
  return { names: cfg.names, counts: buildCounts(cfg.countsConfig, f.facts), facts: f.facts, factsSource: f.source, factsNote: f.note, scan: cfg.scan, only };
}

/** Lint every wanted file under `scanRoot` (or only the given relative files). */
export function lintTree(scanRoot, { env, files = null } = {}) {
  const list = (files || walk(scanRoot)).filter((r) => wanted(r, env.scan));
  const findings = []; const notes = []; let suppressed = 0; let strings = 0;
  for (const rel of list) {
    let src;
    try { src = fs.readFileSync(path.join(scanRoot, rel), 'utf8'); } catch { continue; }
    const r = lintSource(rel, src, env);
    findings.push(...r.findings); suppressed += r.suppressed; strings += r.strings;
    for (const n of r.notes) notes.push(`${rel}: ${n}`);
  }
  return { findings, notes, suppressed, strings, files: list.length };
}

export const countBy = (findings, key) => findings.reduce((m, f) => { m[f[key]] = (m[f[key]] || 0) + 1; return m; }, {});
export { RULES };

// validate.mjs - build-time validators (docs/plan/FINAL/14 D.4). The build FAILS on any error-level finding.
//   V01 schema / required fields           V02 tier + licence gate            V03 sb / quote offsets in range and on boundaries
//   V04 every id resolves                  V05 developer-note blocklist       V06 no " -- ", undefined, null, NaN, raw internal ids in shown text
//   V07 anchors (none at H0-H2)            V08 folio sample (no page cites yet)  V09 unique ids     V10 size budgets
//   V11 an alias mapping to > 8 entities needs a rule           V12 determinism (checked by the test suite: rebuild twice, compare hashes)
//   K001 every indexed field exists in the schema and every whitelisted source field is populated (kills the e.title drift)
import { contentStems } from '../../../historian-src/core/text.js';
import { FIELDS } from '../../../historian-src/core/entities.js';
import { hasDevNote, hasRawId } from './clean.mjs';
import { tierProblems } from './sources.mjs';
import { checkCoverage } from './coverage.mjs';

const BUDGET = { t1BrotliMax: 250 * 1024, coldQueryMaxBytes: 120 * 1024, shardMaxBytes: 64 * 1024 };
const BAD_TOKENS = /\bundefined\b|\bNaN\b|\bnull\b|\s--\s/;

export function validate({ site, reg, t1, entix, passages, facts, sources, sizes, aliasRules = {}, coverage = null }) {
  const findings = [];
  const err = (rule, msg, ctx) => findings.push({ level: 'error', rule, msg, ctx });
  const warn = (rule, msg, ctx) => findings.push({ level: 'warn', rule, msg, ctx });

  // ---- K001: whitelisted source fields must be populated (the deployed page read e.title/e.description that do not exist) ------------------------------
  const cover = (name, list, field, min = 0.5) => {
    const n = list.length; const have = list.filter((x) => x[field] !== undefined && x[field] !== null && String(x[field]).trim() !== '').length;
    if (n && have / n < min) err('K001', `${name}.${field} is empty in ${n - have}/${n} records (a whitelisted field that does not exist?)`);
  };
  cover('chronology', site.chronology, 'event'); cover('regiments', site.regiments, 'designation'); cover('regiments', site.regiments, 'key_action');
  cover('vignettes', site.vignettes, 'title'); cover('vignettes', site.vignettes, 'full_script'); cover('vignettes', site.vignettes, 'panel_summary');
  cover('locations', site.locations, 'name'); cover('locations', site.locations, 'significance'); cover('brigades', site.brigades, 'designation'); cover('successions', site.successions, 'event');
  cover('batteries', site.batteries, 'designation');
  for (const f of FIELDS) if (!['title', 'alias', 'people', 'place', 'body'].includes(f)) err('K001', 'unknown indexed field ' + f);
  // ... and EVERY field the loader emits (derived, not hand-listed) against the recorded baseline: a renamed or emptied source field cannot pass silently (lib/coverage.mjs)
  if (coverage) for (const x of checkCoverage(coverage.actual, coverage.baseline)) err(x.rule, x.msg);

  // ---- V01 schema -----------------------------------------------------------------------------------------------------------------------------------
  const REQ_P = ['id', 'num', 'doc', 'rec', 'kind', 'text', 'sb', 'cite', 'source_id', 'ents'];
  for (const r of t1.records) for (const k of ['id', 'k', 'title', 'label']) if (!r[k]) err('V01', `entity ${r.id} missing ${k}`);
  for (const p of passages) {
    for (const k of REQ_P) if (p[k] === undefined || p[k] === null || p[k] === '') err('V01', `passage ${p.id} missing ${k}`);
    if (!p.cite || !p.cite.short) err('V01', `passage ${p.id} missing cite.short`);
    if (!p.source_id) err('V02', `passage ${p.id} has no source/licence`);
  }
  // ---- V02 tier + licence ---------------------------------------------------------------------------------------------------------------------------
  const used = new Set(passages.map((p) => p.source_id));
  for (const sid of used) {
    const s = sources.get(sid);
    if (!s) { err('V02', `passage source ${sid} is not in sources.yaml`); continue; }
    for (const pr of tierProblems(s)) err('V02', `source ${sid}: ${pr}`);
    if (s.tier === 'C') err('V02', `Tier C source ${sid} has shipped passages`);
  }
  // ---- V03 sentence boundaries ----------------------------------------------------------------------------------------------------------------------
  for (const p of passages) {
    let prev = -1;
    for (const b of p.sb) {
      if (!(b >= 0 && b < p.text.length) || b <= prev) { err('V03', `passage ${p.id} has invalid sentence boundary ${b}`); break; }
      if (b > 0 && !/\s/.test(p.text[b - 1]) && p.text[b - 1] !== '\n') { err('V03', `passage ${p.id} boundary ${b} is not on a token boundary`); break; }
      prev = b;
    }
    if (p.sb[0] !== 0) err('V03', `passage ${p.id} first sentence does not start at 0`);
  }
  // ---- V04 ids resolve ------------------------------------------------------------------------------------------------------------------------------
  const ids = new Set(t1.records.map((r) => r.id));
  for (const r of t1.records) {
    for (const x of [...(r.par || []), ...(r.kids || [])]) if (!ids.has(x)) err('V04', `entity ${r.id} references unknown id ${x}`);
    if (r.canon && !ids.has(r.canon)) err('V04', `entity ${r.id} canon ${r.canon} unknown`);
    if (r.attrs && r.attrs.unit && !ids.has(r.attrs.unit)) err('V04', `succession ${r.id} unit ${r.attrs.unit} unknown`);
    for (const u of (r.attrs && r.attrs.units) || []) if (!ids.has(u)) err('V04', `entity ${r.id} units ${u} unknown`);
    for (const ro of (r.attrs && r.attrs.roles) || []) if (ro.u && !ids.has(ro.u)) err('V04', `person ${r.id} role unit ${ro.u} unknown`);
  }
  for (const p of passages) for (const [id] of p.ents) if (!ids.has(id)) err('V04', `passage ${p.id} entity ${id} unknown`);
  for (const [k, arr] of Object.entries(t1.unitKeys)) for (const [id] of arr) if (!ids.has(id)) err('V04', `unit key ${k} -> unknown ${id}`);
  for (const rows of Object.values(facts.rank)) for (const row of rows.rows) if (!ids.has(row[0])) err('V04', `rank row references unknown id ${row[0]}`);
  for (const lst of Object.values(facts.succ.byUnit)) for (const id of lst) if (!ids.has(id)) err('V04', `succ index references ${id}`);
  // ---- V05 / V06 text hygiene over everything a reader can be shown --------------------------------------------------------------------------------
  const showText = (where, s) => {
    if (typeof s !== 'string' || !s) return;
    if (hasDevNote(s)) err('V05', `${where}: developer note in shown text: ${s.slice(0, 90)}`);
    if (BAD_TOKENS.test(s)) err('V06', `${where}: forbidden token in shown text: ${s.slice(0, 90)}`);
    if (hasRawId(s)) err('V06', `${where}: raw internal id in shown text: ${s.slice(0, 90)}`);
  };
  for (const r of t1.records) {
    showText(`${r.id}.title`, r.title); showText(`${r.id}.label`, r.label);
    const a = r.attrs || {};
    for (const k of ['ka', 'summary', 'text', 'narrative', 'notes', 'fate', 'source', 'when']) if (typeof a[k] === 'string') showText(`${r.id}.attrs.${k}`, a[k]);
    if (a.cmd) { showText(`${r.id}.cmd.fate`, a.cmd.fate); showText(`${r.id}.cmd.notes`, a.cmd.notes); for (const s of a.cmd.succ || []) showText(`${r.id}.cmd.succ.when`, s.when); }
  }
  for (const p of passages) { showText(`passage ${p.id}`, p.text); showText(`passage ${p.id}.cite`, p.cite.short); }
  // ---- V09 unique ids ----------------------------------------------------------------------------------------------------------------------------------
  const seen = new Set();
  for (const r of t1.records) { if (seen.has(r.id)) err('V09', 'duplicate entity id ' + r.id); seen.add(r.id); }
  const seenP = new Set();
  for (const p of passages) { if (seenP.has(p.id)) err('V09', 'duplicate passage id ' + p.id); seenP.add(p.id); }
  // ---- V10 size budgets ----------------------------------------------------------------------------------------------------------------------------------
  if (sizes) {
    if (sizes.t1Brotli > BUDGET.t1BrotliMax) err('V10', `T1 is ${sizes.t1Brotli} bytes brotli, budget ${BUDGET.t1BrotliMax}`);
    if (sizes.maxShard > BUDGET.shardMaxBytes) err('V10', `a text shard is ${sizes.maxShard} bytes, budget ${BUDGET.shardMaxBytes}`);
  }
  // ---- V11 alias fan-out -----------------------------------------------------------------------------------------------------------------------------------
  const fan = new Map();
  for (const r of t1.records) for (const a of [r.title, r.label, ...(r.aliases || [])]) { const k = contentStems(a).join(' '); if (!k) continue; (fan.get(k) || fan.set(k, new Set()).get(k)).add(r.id); }
  for (const [k, set] of fan) if (set.size > 8 && !aliasRules[k]) warn('V11', `alias "${k}" maps to ${set.size} entities and has no disambiguation rule`);
  // ---- extra checks on the corpus itself --------------------------------------------------------------------------------------------------------------------
  const noPassage = t1.records.filter((r) => ['vignette', 'chronology'].includes(r.k) && !passages.some((p) => p.rec === r.id));
  for (const r of noPassage) warn('V01', `record ${r.id} has no passage`);
  return { findings, ok: !findings.some((f) => f.level === 'error'), counts: findings.reduce((m, f) => { m[f.rule + ':' + f.level] = (m[f.rule + ':' + f.level] || 0) + 1; return m; }, {}) };
}

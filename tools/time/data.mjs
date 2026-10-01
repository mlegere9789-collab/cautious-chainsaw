// Loads the frozen legacy data once and extracts every string that sits next to a tick (WP-TIME-20 / TM-V3).
// Read-only over legacy/dist (never written). CANDIDATE tooling.
import fs from 'node:fs';
import path from 'node:path';
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';
import { LEGACY, readJson, readText } from './lib.mjs';

export const DATA = path.join(LEGACY, 'data');

export function loadChronology(root = DATA) {
  const events = [];
  for (const d of [1, 2, 3]) {
    const j = readJson(path.join(root, `chronology_day${d}.json`));
    j.events.forEach((e, i) => events.push({ ...e, day: d, file: `chronology_day${d}.json`, idx: i }));
  }
  return events;
}
export function loadChronologyMeta(root = DATA) { return [1, 2, 3].map((d) => ({ file: `chronology_day${d}.json`, metadata: readJson(path.join(root, `chronology_day${d}.json`)).metadata })); }
export function loadVignettes(root = DATA) {
  const out = [];
  for (const n of [1, 2, 3]) for (const v of readJson(path.join(root, `vignettes_part${n}.json`)).vignettes) out.push({ ...v, file: `vignettes_part${n}.json` });
  return out;
}
export function loadSuccessions(root = DATA) { const j = readJson(path.join(root, 'oob', 'commander_successions.json')); return [...j.union_successions, ...j.confederate_successions]; }
export function loadCasualty(root = DATA) { return readJson(path.join(root, 'casualty_apportionment.json')); }
export function loadSchema(root = DATA) { return readJson(path.join(root, 'placement_schema.json')); }

/** Placement/density files in the order the app loads them (placements first, density after; a later row wins for the same unit+tick). */
export function loadPlacementFiles(root = DATA) {
  const all = fs.readdirSync(root).filter((f) => /^(placements_|density_).*\.json$/.test(f));
  const order = [...all.filter((f) => f.startsWith('placements_')), ...all.filter((f) => f.startsWith('density_'))];
  return order.map((f) => ({ file: f, json: readJson(path.join(root, f)) }));
}
export function loadPlacements(root = DATA) {
  const rows = [];
  for (const { file, json } of loadPlacementFiles(root)) for (const p of json.placements || []) rows.push({ ...p, _file: file });
  return rows;
}

// ------------------------------------------------------------------ clock expressions in prose
export const CLOCK_RE = /\b(1[0-2]|0?[1-9])(?::([0-5]\d))?\s?(a\.?m\.?|p\.?m\.?)(?![a-z])/gi;
export const APPROX_RE = /(?:approximately|about|around|roughly|~|circa|c\.|nearly|almost|by)\s*$/i;
export const DAYPART_RE = /\b(dawn|daybreak|first light|sunrise|morning|noon|midday|afternoon|evening|dusk|sunset|twilight|nightfall|night|midnight|overnight)\b/gi;

/** [{text, hour24, minute, mod, approx, index}] for every explicit clock expression in a string ("10:15am", "3 p.m."). */
export function clocksIn(str) {
  const out = []; CLOCK_RE.lastIndex = 0; let m;
  while ((m = CLOCK_RE.exec(str))) {
    const h12 = +m[1] % 12, pm = /^p/i.test(m[3]), mod = (h12 + (pm ? 12 : 0)) * 60 + (m[2] ? +m[2] : 0);
    out.push({ text: m[0], mod, approx: APPROX_RE.test(str.slice(Math.max(0, m.index - 14), m.index)), index: m.index });
  }
  return out;
}
export function dayPartsIn(str) { const out = []; DAYPART_RE.lastIndex = 0; let m; while ((m = DAYPART_RE.exec(str))) out.push({ word: m[1].toLowerCase(), index: m.index }); return out; }

// ------------------------------------------------------------------ strings next to ticks
/** Every {source, tick, field, text} the site pairs with a tick in its JSON data (excluding the chronology `time` labels, handled by TM-V4). */
export function dataTickStrings(root = DATA) {
  const out = [];
  const add = (source, tick, field, text) => { if (typeof text === 'string' && text && Number.isFinite(tick)) out.push({ source, tick, field, text }); };
  for (const e of loadChronology(root)) { add(`${e.file}#t${e.tick}`, e.tick, 'event', e.event); add(`${e.file}#t${e.tick}`, e.tick, 'narrative', e.narrative); }
  for (const v of loadVignettes(root)) { add(`${v.file}#${v.vignette_id}`, v.trigger_tick, 'panel_summary', v.panel_summary); add(`${v.file}#${v.vignette_id}`, v.trigger_tick, 'full_script', v.full_script); }
  for (const s of loadSuccessions(root)) { add(`commander_successions.json#${s.event_id}`, s.approx_tick, 'event', s.event); add(`commander_successions.json#${s.event_id}`, s.approx_tick, 'notes', s.notes); add(`commander_successions.json#${s.event_id}`, s.approx_tick, 'approx_time', s.approx_time); }
  for (const { file, json } of loadPlacementFiles(root)) for (const p of json.placements || []) add(`${file}#${p.unit_id}@${p.tick}`, p.tick, 'notes', p.notes);
  return out;
}

// ------------------------------------------------------------------ literals in JS: objects that carry a tick and a string
function objectStrings(ast, srcText, source, out) {
  walk.simple(ast, {
    ObjectExpression(n) {
      let tick = null; const strs = [];
      for (const p of n.properties) {
        if (p.type !== 'Property' || p.computed) continue;
        const key = p.key.name || p.key.value;
        if ((key === 'tick' || key === 'trigger_tick' || key === 'approx_tick') && p.value.type === 'Literal' && typeof p.value.value === 'number') tick = p.value.value;
        else if (p.value.type === 'Literal' && typeof p.value.value === 'string') strs.push([key, p.value.value, p.value.start]);
        else if (p.value.type === 'TemplateLiteral') strs.push([key, p.value.quasis.map((q) => q.value.cooked).join('${}'), p.value.start]);
      }
      if (tick !== null) for (const [key, text, at] of strs) out.push({ source, tick, field: key, text, at });
    },
  });
}

/** Tick + string literal pairs in the bundle and in the pages' inline scripts (monuments, tour stops, walkthrough, onboarding, Turning Points, Sandbox presets). */
export function literalTickStrings(files, bundleName) {
  const out = [];
  const ast = acorn.parse(files[bundleName], { ecmaVersion: 'latest', sourceType: 'module' });
  objectStrings(ast, files[bundleName], bundleName, out);
  for (const [f, text] of Object.entries(files)) {
    if (!f.endsWith('.html')) continue;
    const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g; let m;
    while ((m = re.exec(text))) {
      let a; try { a = acorn.parse(m[1], { ecmaVersion: 'latest', sourceType: 'script' }); } catch { continue; }
      objectStrings(a, m[1], f, out);
    }
  }
  return out;
}

/** script-bearing files: pages, scripts, modules, SVG (which may carry a <script>) and component sources (.astro .vue .svelte .jsx .ts .tsx; not .d.ts) */
export const CODE_EXT = /(?:\.(?:html?|xhtml|svg|m?js|cjs|jsx|mts|cts|astro|vue|svelte)|(?<!\.d)\.tsx?)$/i;
export const isCode = (f) => CODE_EXT.test(f);
/** how a code file is read by the detectors: markup (text, attributes, <script> bodies) or a script */
export const kindOf = (f) => (/\.(?:html?|xhtml|svg|astro|vue|svelte)$/i.test(f) ? 'html' : 'js');
const SKIP_DIRS = new Set(['data', 'icons', 'screenshots', 'node_modules', '.git']);
/**
 * Every file of a dist tree a rule can read: the root files (html, js, json, css) and assets/* as before, PLUS every script-bearing file in any
 * subdirectory (a shared script in js/, scripts/, assets/chunks/ ... is loaded by every page and was invisible to TM-V9/V16/V17 and the inventory).
 * Keys are posix paths relative to the tree. Symlinks are not followed; data/ holds JSON the data rules load on their own.
 */
export function loadTreeFiles(tree = LEGACY) {
  const files = {};
  const walkDir = (dir, rel, depth) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const r = rel ? rel + '/' + e.name : e.name, p = path.join(dir, e.name);
      if (e.isSymbolicLink()) continue;
      if (e.isDirectory()) { if (depth < 8 && !SKIP_DIRS.has(e.name) && !e.name.startsWith('.')) walkDir(p, r, depth + 1); continue; }
      if (!e.isFile()) continue;
      const top = !rel, inAssets = rel === 'assets';
      if (isCode(e.name) || (top && /\.(json|css)$/.test(e.name)) || (inAssets && /\.css$/.test(e.name))) files[r] = readText(p);
    }
  };
  walkDir(tree, '', 0);
  const bundleName = Object.keys(files).find((f) => /^assets\/index-[\w-]+\.js$/.test(f));
  return { files, bundleName };
}

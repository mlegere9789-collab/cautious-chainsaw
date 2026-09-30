// Unit index (WP-DATA-20): one fetchable file so Search / Regiment / Ancestor / Report / Historian can see every unit,
// including the 104 batteries the five static pages never load today. CANDIDATE data derived from the legacy tree.
import fs from 'node:fs';
import path from 'node:path';
import { chainOf, commanderChain, sortKeyOf } from './orgchain.mjs';
import { fileGroups } from './load.mjs';

const stripDesignation = (d) => String(d ?? '')
  .replace(/\s*\(.*?\)\s*/g, ' ')
  .replace(/\s+(Volunteer\s+)?(Infantry|Cavalry|Militia)\b.*$/i, (m, _v, arm) => (/cavalry/i.test(arm) ? ' Cavalry' : ''))
  .replace(/\s+/g, ' ').trim();

const LEVEL_OF = { regiment: 'regiment', battery: 'battery', brigade: 'brigade', division: 'division', corps: 'corps', battalion: 'battalion', artillery_brigade: 'artillery brigade', army: 'army' };

export function buildUnitIndex(ctx, registry, crosswalk) {
  const oob = ctx.oob;
  const vignettes = [];
  for (const [rel, f] of ctx.data.files) if (fileGroups.vignettes(rel) && f.json) for (const v of f.json.vignettes) vignettes.push(v);
  const vigFor = (ids) => vignettes.filter((v) => (v.units_featured || []).some((u) => ids.includes(u))).map((v) => v.vignette_id);
  const aliasBy = new Map();
  for (const u of registry.units) aliasBy.set(u.id, u.aliases);
  const regById = new Map(registry.units.map((u) => [u.id, u]));

  const row = (rec, regUnit) => {
    const raw = rec.raw;
    const chain = chainOf(oob, rec);
    const parents = [chain.brigade, chain.division, chain.corps, chain.artillery_parent].filter(Boolean).map((p) => ({ id: p.id, level: LEVEL_OF[p.kind], name: p.raw.designation }));
    const ancestorIds = [rec.id, ...parents.map((p) => p.id)];
    const aliases = (regUnit?.aliases ?? []).flatMap((a) => [a.id, ...(a.names ?? [])]);
    const designation = raw.designation ?? rec.id;
    const short = stripDesignation(designation);
    const own = ctx.rowsByUnit.get(rec.id)?.length ?? 0;
    const cmdr = raw.commander?.name ?? null;
    const entry = {
      id: rec.id,
      kind: rec.kind,
      level: LEVEL_OF[rec.kind],
      name: designation,
      short,
      side: rec.side,
      arm: regUnit?.arm ?? null,
      state: raw.state ?? null,
      sort_key: sortKeyOf(designation, rec.id),
      parents,
      commander: cmdr,
      aliases,
      hidden_aliases: (regUnit?.aliases ?? []).filter((a) => a.hidden).map((a) => a.id),
      has_track: own > 0,
      own_keyframes: own,
      positions_via: regUnit?.positions_via ?? (own ? 'own' : 'none'),
      guns: raw.gun_count ?? null,
      gun_type: raw.gun_type ?? null,
      strength: raw.strength ?? null,
      casualties: raw.casualties ?? null,
      monuments: [],
      vignettes: vigFor(ancestorIds),
      needs_historian: regUnit?.needs_historian ?? false,
    };
    entry.search_text = [designation, short, rec.raw.state, cmdr, raw.gun_type, rec.kind === 'battery' ? 'battery artillery' : '', rec.arm, ...aliases, rec.id.replace(/-/g, ' ')].filter(Boolean).join(' ').toLowerCase();
    return entry;
  };

  const units = [];
  for (const u of registry.units) units.push(row(oob.records.get(u.id), regById.get(u.id)));
  const formations = oob.list.filter((r) => ['brigade', 'division', 'corps', 'battalion', 'artillery_brigade'].includes(r.kind)).map((r) => row(r, null));
  units.sort((a, b) => (a.sort_key < b.sort_key ? -1 : 1));
  formations.sort((a, b) => (a.sort_key < b.sort_key ? -1 : 1));
  const counts = {
    units: units.length,
    regiments: units.filter((u) => u.kind === 'regiment').length,
    batteries: units.filter((u) => u.kind === 'battery').length,
    formations: formations.length,
    with_track: units.filter((u) => u.has_track).length,
    batteries_with_track: units.filter((u) => u.kind === 'battery' && u.has_track).length,
    with_vignette: units.filter((u) => u.vignettes.length).length,
    hidden_alias_rows: 0,
  };
  return { schema: 'gtbg/unit-index/1', status: 'CANDIDATE: derived from the legacy tree; consumed by nothing yet (WP-DATA-20 page edits are a separate release)', counts, units, formations };
}

// ---- a deliberately small reference scorer, used only by the acceptance tests (the production scorer is WP-HIST-11 / chapter 08a)
const tok = (s) => String(s).toLowerCase().replace(/[^a-z0-9. ]/g, ' ').split(/\s+/).filter(Boolean);
const norm = (t) => t.replace(/\.$/, '');

export function searchIndex(index, query, { limit = 10 } = {}) {
  const q = tok(query).map(norm);
  if (!q.length) return [];
  const scored = [];
  for (const u of [...index.units, ...index.formations]) {
    const hay = u.search_text;
    if (!q.every((t) => hay.includes(t))) continue; // no subsequence fallback: every query token must appear
    let score = 10;
    const name = u.name.toLowerCase(), short = u.short.toLowerCase();
    const phrase = q.join(' ');
    if (short === phrase) score += 100;
    else if (short.startsWith(phrase)) score += 60;
    else if (name.includes(phrase)) score += 40;
    if (u.aliases.some((a) => String(a).toLowerCase() === phrase)) score += 90; // an alias hit boosts the REAL unit, no alias row exists
    if (u.kind === 'battery' && q.includes('battery')) score += 30;
    if (u.level === 'regiment' || u.level === 'battery') score += 5;
    scored.push({ id: u.id, kind: u.kind, name: u.name, score });
  }
  scored.sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : 1));
  return scored.slice(0, limit);
}

export function writeJson(file, obj) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}
export { commanderChain };

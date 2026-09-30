// Unit registry, ID crosswalk and dual-meaning detection (WP-DATA-06; feeds WP-DATA-07/19/20).
// Everything here is a CANDIDATE derived from the legacy tree: nothing is written back to served data, sides are never guessed
// (a side is only flipped by the wrong-prefix rule, which requires a contradicting state code AND an existing twin), and every
// non-certain mapping carries needs_historian.
import { chainOf, commanderChain, sortKeyOf, surnameOf, STATE_CODES, leadingOrdinal } from './orgchain.mjs';
import { sideOfPrefix } from './util.mjs';
import { rowKey } from '../rules/define.mjs';
import { flipPrefix } from '../rules/refs_rules.mjs';

const CONF_ONLY = new Set(['AL', 'AR', 'FL', 'GA', 'LA', 'MS', 'NC', 'SC', 'TX']);

/** Facts established by reading the Official Records in this workstream (see data-src/authorities and docs/data/baseline-report.md). */
export const OR_VERIFIED = {
  '11PA': {
    text: 'OR Ser. I vol. 27 pt. 1, organization of the Army of the Potomac (I Corps, Second Division): the 11th Pennsylvania stands in Baxter\'s Second Brigade with the footnote "Transferred, in afternoon of July 1, to the First Brigade": one regiment with a time-varying assignment, not a duplicate.',
    evidence: 'IA warofrebellion271unit_djvu.txt line 17731 (printed p.156)',
  },
  '107PA': {
    text: 'OR Ser. I vol. 27 pt. 1, I Corps, Second Division, Paul\'s First Brigade lists 16th Maine, 13th Massachusetts, 94th New York, 104th New York and the 107th PENNSYLVANIA: the I Corps record U-107NY is mislabelled.',
    evidence: 'IA warofrebellion271unit_djvu.txt lines 17510-17560 (printed p.156)',
  },
  '84NY': {
    text: 'OR Ser. I vol. 27 pt. 1, I Corps, First Division, Cutler\'s Second Brigade lists "84th New York (14th Militia)": the 14th Brooklyn is the 84th New York.',
    evidence: 'IA warofrebellion271unit_djvu.txt lines 17470-17480 (printed p.155)',
  },
};

const RX = {
  regimentLike: /^[UC]-\d+[A-Z]{2}(?:-[A-Za-z0-9]+)*$/,
  brigadePrefixedRegiment: /^([UC])-((?:[IVX]+|CAV)-\d+)-(\d+)([A-Z]*)$/,
  typeTag: /^([UC]-\d+[A-Z]{2})-(RES|SHRP)$/,
  brigadeLike: /^[UC]-(?:[IVX]+|CAV)-\d+-\d+$/,
  divisionLike: /^[UC]-(?:[IVX]+|CAV)-\d+$/,
  weirdDivision: /^U-\d-[IVX]+(?:-\d)?$/,
  cavLetter: /^([UC])-CAV-(\d)-([A-Z])$/,
  artNickname: /^([UC])-ART-([A-Za-z0-9]+)(?:-(.+))?$/,
  suffixVariant: /^([UC]-\d+[A-Z]{2})-([A-Za-z]+)$/,
};

const TAG_ALIASES = { SW: ['Stonewall'], IV: ['Iverson'], W: ['Wofford'], D: ['Davis'], B: ['Barksdale'], A: ['Avery'], J: ['Jones'], EW: ['Ewell'], Law: ['Law'] };

const isRegiment = (r) => r.kind === 'regiment';

function editDistanceOne(a, b) {
  if (a === b || Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, e = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++e > 1) return false;
    if (a.length === b.length) { i++; j++; } else if (a.length > b.length) i++; else j++;
  }
  return e + (a.length - i) + (b.length - j) === 1;
}

function noteText(rows) {
  return rows.map((r) => r.notes || '').join(' | ');
}

function unitPositions(ctx, id) {
  const rows = ctx.rowsByUnit.get(id) || [];
  return { rows: rows.length, first: rows.length ? Math.min(...rows.map((r) => r.tick)) : null, last: rows.length ? Math.max(...rows.map((r) => r.tick)) : null };
}

// ---------------------------------------------------------------------------------------------------------------- registry

export function buildRegistry(ctx, crosswalkByTarget = new Map()) {
  const oob = ctx.oob;
  const units = [];
  const rightsFiles = {};
  const tierInfo = (rec) => {
    if (!rightsFiles[rec.file]) {
      const meta = ctx.file(rec.file)?.metadata ?? {};
      const sources = meta.sources ?? null;
      const claimsBM = (sources || []).some((s) => /Busey/.test(s));
      rightsFiles[rec.file] = {
        claimed_sources: sources,
        sources_declared: sources !== null,
        numbers: claimsBM ? "claimed from Busey and Martin (copyrighted compilation): facts-only, attributed, re-source from OR No. 13 / Fox (Q-DATA-3)" : sources ? "claimed sources exclude Busey and Martin" : "file declares no sources (the Confederate regiment files carry no metadata.sources)",
      };
    }
    return { tier: "legacy", basis: "claimed_only", file: rec.file, action: "facts-only" };
  };
  const combat = oob.list.filter((r) => (r.kind === 'regiment' || r.kind === 'battery') && !r.alias_for);
  for (const rec of combat) {
    const raw = rec.raw;
    const chain = chainOf(oob, rec);
    const id = rec.id;
    const own = unitPositions(ctx, id);
    const aliasEntries = crosswalkByTarget.get(id) || [];
    const aliasRows = aliasEntries.filter((e) => ['high', 'medium'].includes(e.confidence)).reduce((a, e) => a + e.rows, 0);
    const parentPlaced = (() => {
      const p = raw.parent_brigade_id ?? rec.parent_artillery_id;
      return p && ctx.rowsByUnit.has(p) ? p : null;
    })();
    const grand = chain.division && ctx.rowsByUnit.has(chain.division.id) ? chain.division.id : chain.corps && ctx.rowsByUnit.has(chain.corps.id) ? chain.corps.id : null;
    const placedVia = own.rows ? 'own' : aliasRows ? 'alias' : parentPlaced ? 'parent' : grand ? 'ancestor' : 'none';
    const chainNames = commanderChain(raw.commander);
    const arm = rec.kind === 'battery' ? (rec.horse_artillery ? 'horse_artillery' : 'artillery') : /-CAV\b|^[UC]-CAV/.test(id) || /^[UC]-CAV/.test(raw.parent_brigade_id || '') ? 'cavalry' : raw.unit_type === 'sharpshooter' ? 'sharpshooter' : 'infantry';
    const flags = [];
    if (rec.filed_as === 'regiment' && rec.kind === 'battery') flags.push({ code: 'battery_filed_as_regiment', needs_historian: true, text: 'a horse battery filed among the regiment records; confirm it is not a duplicate of a C-HAB-* battery (chapter 13 WP-07)' });
    if (chainNames.some((c) => Object.keys(STATE_CODES).some((s) => c.name.split(/\s+/).slice(0, -1).includes(s)))) flags.push({ code: 'commander_name_contains_state', needs_historian: true, text: `commander "${raw.commander.name}" contains a state name: likely a merge error (chapter 13 WP-07 names C-61VA); verify against OR Ser. I vol. 27 pt. 2 organization` });
    const dupBase = (raw.designation || '').replace(/\s*\(.*?\)\s*$/, '').trim();
    units.push({
      id,
      kind: rec.kind,
      arm,
      side: rec.side,
      prefix_side: rec.prefix_side,
      side_prefix_agrees: rec.side === rec.prefix_side,
      designation: raw.designation,
      sort_key: sortKeyOf(raw.designation, id),
      state: raw.state ?? null,
      path: {
        corps: chain.corps ? { id: chain.corps.id, designation: chain.corps.raw.designation } : null,
        division: chain.division ? { id: chain.division.id, designation: chain.division.raw.designation } : null,
        brigade: chain.brigade ? { id: chain.brigade.id, designation: chain.brigade.raw.designation } : null,
        artillery_unit: chain.artillery_parent ? { id: chain.artillery_parent.id, designation: chain.artillery_parent.raw.designation, kind: chain.artillery_parent.kind } : null,
        declared_parent_brigade_id: raw.parent_brigade_id ?? null,
        declared_parent_corps_id: raw.parent_corps_id ?? null,
        resolved: rec.kind === 'regiment' ? Boolean(chain.brigade) : Boolean(chain.artillery_parent) || rec.filed_as === 'regiment' || Boolean(rec.division_attached),
      },
      commanders: raw.commander ? chainNames.map((c) => ({ name: c.name, fate: c.fate, assumed_command: c.assumed_command })) : [],
      commander_status: raw.commander ? 'recorded' : 'unknown',
      placed: own.rows > 0 || aliasRows > 0,
      own_keyframes: own.rows,
      first_tick: own.first,
      last_tick: own.last,
      alias_keyframes: aliasRows,
      placed_via: placedVia,
      positions_via: placedVia === 'own' ? 'own' : placedVia === 'alias' ? 'crosswalked_alias' : placedVia === 'parent' ? `parent:${parentPlaced}` : placedVia === 'ancestor' ? `ancestor:${grand}` : 'none',
      oob_record: true,
      oob_file: rec.file,
      oob_path: rec.path,
      days_engaged: raw.days_engaged ?? [],
      strength: raw.strength ?? null,
      casualties: raw.casualties ?? null,
      guns: raw.gun_count ?? null,
      gun_type: raw.gun_type ?? null,
      aliases: aliasEntries.filter((e) => ['high', 'medium'].includes(e.confidence)).map((e) => ({ id: e.alias_id, source: 'crosswalk', confidence: e.confidence, status: 'proposed', rows: e.rows })),
      designation_base: dupBase,
      flags,
      rights: tierInfo(rec),
    });
  }
  // designation-base twins (same base text, different ids): possible duplicates or detachments
  const byBase = new Map();
  for (const u of units) { if (!byBase.has(u.designation_base)) byBase.set(u.designation_base, []); byBase.get(u.designation_base).push(u); }
  for (const list of byBase.values()) {
    if (list.length < 2) continue;
    for (const u of list) u.flags.push({ code: 'same_designation_base', needs_historian: true, others: list.filter((x) => x.id !== u.id).map((x) => x.id), text: `shares its designation with ${list.filter((x) => x.id !== u.id).map((x) => x.id).join(', ')}: duplicate, detachment, or a different regiment of the same number` });
  }
  // OR-verified findings (read from the Official Records text; see OR_VERIFIED)
  const byId = new Map(units.map((u) => [u.id, u]));
  const setFlag = (id, flag) => { const u = byId.get(id); if (u) { u.flags = u.flags.filter((f) => f.code !== flag.code); u.flags.push(flag); } };
  setFlag('U-11PA', { code: 'assignment_transfer', needs_historian: false, or_verified: true, others: ['U-11PA-B'], text: OR_VERIFIED['11PA'].text, evidence: OR_VERIFIED['11PA'].evidence, decision: 'one record with assignments[{parent, from_tick, to_tick}] (WP-DATA-07); the transfer tick needs the historian' });
  setFlag('U-11PA-B', { code: 'assignment_transfer', needs_historian: false, or_verified: true, others: ['U-11PA'], text: OR_VERIFIED['11PA'].text, evidence: OR_VERIFIED['11PA'].evidence, decision: 'merge into U-11PA' });
  setFlag('U-107NY', { code: 'mislabelled_regiment', needs_historian: true, or_verified: true, text: OR_VERIFIED['107PA'].text, evidence: OR_VERIFIED['107PA'].evidence, decision: 'relabel to U-107PA after the historian confirms the strength (122 men) and casualties belong to the 107th Pennsylvania' });
  const ny84 = byId.get('U-84NY');
  if (ny84) {
    ny84.aliases.push({ id: 'U-14BK', source: 'oob alias_for', confidence: 'high', status: 'decision_pending', decision: 'Q-DATA-8 (owner): search synonym, not a row', names: ['14th Brooklyn', '14th N.Y.S.M.'], hidden: true, evidence: OR_VERIFIED['84NY'].evidence, text: OR_VERIFIED['84NY'].text });
  }
  for (const u of units) u.needs_historian = u.flags.some((f) => f.needs_historian);
  units.sort((a, b) => (a.sort_key < b.sort_key ? -1 : a.sort_key > b.sort_key ? 1 : 0));
  const census = {
    total: units.length,
    regiments: units.filter((u) => u.kind === 'regiment').length,
    batteries: units.filter((u) => u.kind === 'battery').length,
    by_side: { union: units.filter((u) => u.side === 'union').length, confederate: units.filter((u) => u.side === 'confederate').length },
    regiments_by_side: { union: units.filter((u) => u.kind === 'regiment' && u.side === 'union').length, confederate: units.filter((u) => u.kind === 'regiment' && u.side === 'confederate').length },
    placed_own: units.filter((u) => u.placed_via === 'own').length,
    placed_via_alias: units.filter((u) => u.placed_via === 'alias').length,
    via_parent_or_ancestor: units.filter((u) => u.placed_via === 'parent' || u.placed_via === 'ancestor').length,
    none: units.filter((u) => u.placed_via === 'none').length,
    regiments_placed_own: units.filter((u) => u.kind === 'regiment' && u.own_keyframes > 0).length,
    batteries_placed_own: units.filter((u) => u.kind === 'battery' && u.own_keyframes > 0).length,
    needs_historian: units.filter((u) => u.needs_historian).length,
    side_prefix_mismatches: units.filter((u) => !u.side_prefix_agrees).length,
    alias_records_excluded: oob.list.filter((r) => r.alias_for).map((r) => r.id),
  };
  return { units, census, rightsFiles };
}

// ---------------------------------------------------------------------------------------------------------------- crosswalk

function makeIndexes(ctx) {
  const oob = ctx.oob;
  const byKind = (k) => oob.list.filter((r) => r.kind === k);
  const idx = { all: oob.list, regiments: byKind('regiment'), batteries: byKind('battery'), brigades: byKind('brigade'), divisions: byKind('division'), corps: byKind('corps'), battalions: byKind('battalion'), artBrigades: byKind('artillery_brigade') };
  const commanderIndex = new Map(); // `${kind}|${surname}` -> [rec]
  for (const rec of [...idx.brigades, ...idx.divisions, ...idx.corps, ...idx.battalions, ...idx.artBrigades]) {
    const names = new Set(commanderChain(rec.raw.commander).map((c) => c.surname));
    for (const m of String(rec.raw.designation || '').matchAll(/([A-Z][A-Za-z.']+?)(?:'s|s')\b/g)) names.add(m[1]);
    for (const n of names) { const k = `${rec.kind}|${n}`; if (!commanderIndex.has(k)) commanderIndex.set(k, []); commanderIndex.get(k).push(rec); }
  }
  idx.commanderIndex = commanderIndex;
  return idx;
}

function corroborate(ctx, cand, rows, note) {
  const ev = [];
  const chain = chainOf(ctx.oob, cand);
  const parentCmdr = chain.brigade ? commanderChain(chain.brigade.raw.commander).map((c) => c.surname) : [];
  const divCmdr = chain.division ? commanderChain(chain.division.raw.commander).map((c) => c.surname) : [];
  for (const s of [...parentCmdr, ...divCmdr]) if (s && new RegExp(`\\b${s}\\b`).test(note)) ev.push(`note names ${s}, commander in the candidate's chain`);
  const lo = leadingOrdinal(cand.raw.designation);
  if (lo && note) {
    const m = note.match(new RegExp(`\\b${lo.n}(?:st|nd|rd|th)\\s+([A-Za-z]+(?:\\s[A-Z][a-z]+)?)`));
    if (m && cand.raw.designation.includes(m[1].split(' ')[0])) ev.push(`note names "${m[0]}", matching the candidate's designation`);
  }
  return ev;
}

/**
 * @returns {{entries:any[], counts:any, wrong_side:any[]}}
 */
export function buildCrosswalk(ctx) {
  const idx = makeIndexes(ctx);
  const oob = ctx.oob;
  const unresolved = [...ctx.rowsByUnit].filter(([id]) => !oob.records.has(id)).sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const entries = [];

  for (const [id, rows] of unresolved) {
    const note = noteText(rows);
    const base = { alias_id: id, rows: rows.length, ticks: [...new Set(rows.map((r) => r.tick))].sort((a, b) => a - b), side_prefix: sideOfPrefix(id), note_excerpt: note.slice(0, 160), first_file: rows[0].file };
    const cand = (rec, rule, confidence, evidence, extra = {}) => ({ ...base, proposed: rec.id, proposed_kind: rec.kind, proposed_designation: rec.raw.designation, proposed_side: rec.side, rule, confidence, evidence, ...extra });
    const none = (rule, reason, extra = {}) => ({ ...base, proposed: null, rule, confidence: 'none', evidence: [], reason, ...extra });
    let entry = null;
    const noteStartsWithOrdinal = /^\s*\d+(?:st|nd|rd|th)\s+[A-Za-z]/.test(note.split(' | ')[0] || '');
    const shape = RX.regimentLike.test(id) ? 'regiment'
      : RX.brigadePrefixedRegiment.test(id) ? ((id.match(RX.brigadePrefixedRegiment)[4] || noteStartsWithOrdinal) ? 'brigade_prefixed_regiment' : 'brigade')
      : RX.brigadeLike.test(id) ? 'brigade' : RX.divisionLike.test(id) || RX.weirdDivision.test(id) ? 'division' : RX.cavLetter.test(id) ? 'cavalry_letter' : /-ART-|^U-XI-2-3$/.test(id) ? 'artillery' : 'other';
    base.shape = shape;

    // R1 wrong side prefix (the ONLY rule allowed to flip a side)
    const st = (id.match(/^[UC]-\d+([A-Z]{2})(?:-|$)/) || [])[1];
    if (RX.regimentLike.test(id) && st && sideOfPrefix(id) === 'union' && CONF_ONLY.has(st)) {
      const twin = flipPrefix(id);
      const t = oob.records.get(twin);
      if (t && isRegiment(t)) {
        entry = cand(t, 'wrong_side_prefix', 'high', [`state code ${st} is Confederate-only`, `${twin} exists in ${t.file}`, ctx.rowsByUnit.has(twin) ? `${twin} is also placed (${ctx.rowsByUnit.get(twin).length} row(s)): the U- row draws the same regiment twice, once in blue` : `${twin} is not placed elsewhere`], { side_flip: true, hard_rules: { same_shape: true, side_change_allowed_by: 'wrong_side_prefix (state code contradicts prefix, twin exists)' } });
      }
    }
    // R2 exact prefix extension: <id>-<suffix>
    if (!entry && (shape === 'regiment')) {
      const ext = idx.regiments.filter((r) => r.id.startsWith(id + '-') && r.side === sideOfPrefix(id));
      if (ext.length === 1) {
        const ev = corroborate(ctx, ext[0], rows, note);
        entry = cand(ext[0], 'own_id_prefix_extension', ev.length ? 'high' : 'medium', [`${ext[0].id} extends ${id} with a suffix`, ...ev]);
      } else if (ext.length > 1) entry = none('own_id_prefix_extension', `several OOB ids extend ${id}: ${ext.map((r) => r.id).join(', ')}`, { candidates: ext.map((r) => r.id) });
    }
    // R2b type-tag normalisation: -RES -> -R (Pennsylvania Reserves), -SHRP -> -SS (sharpshooters)
    if (!entry) {
      const tm = id.match(RX.typeTag);
      if (tm) {
        const norm = `${tm[1]}-${tm[2] === 'RES' ? 'R' : 'SS'}`;
        const t = oob.records.get(norm);
        const word = tm[2] === 'RES' ? 'Reserves' : 'Sharpshooters';
        if (t && isRegiment(t) && t.side === sideOfPrefix(id)) entry = cand(t, 'type_tag_normalisation', String(t.raw.designation).includes(word) ? 'high' : 'medium', [`"-${tm[2]}" is read as "-${tm[2] === 'RES' ? 'R' : 'SS'}"`, `${t.id} is "${t.raw.designation}"`]);
        else entry = none('type_tag_normalisation', `${tm[1]}-${tm[2]} reads as ${norm}, which is not in the OOB${tm[2] === 'SHRP' ? ' (only the 1st United States Sharpshooters is listed)' : ''}`, { new_record_needed: true });
      }
    }
    // R3 suffix variant: <regiment id>-<tag>
    if (!entry) {
      const m = id.match(RX.suffixVariant);
      if (m) {
        const baseRec = oob.records.get(m[1]);
        if (baseRec && isRegiment(baseRec) && baseRec.side === sideOfPrefix(id)) {
          const chain = chainOf(oob, baseRec);
          const tag = m[2];
          const surnames = [...(chain.brigade ? commanderChain(chain.brigade.raw.commander).map((c) => c.surname) : []), ...(chain.division ? commanderChain(chain.division.raw.commander).map((c) => c.surname) : [])];
          const names = TAG_ALIASES[tag] ?? [tag];
          const chainText = `${chain.brigade?.raw.designation ?? ''} ${chain.division?.raw.designation ?? ''}`;
          const prefixHit = names.some((n) => surnames.some((s) => s.toLowerCase().startsWith(n.toLowerCase())) || chainText.includes(n));
          // a single-letter tag is only an initial: it needs the note to name that commander
          const noteNames = surnames.some((s) => s && new RegExp(`\\b${s}\\b`).test(note));
          const strong = prefixHit && (tag.length >= 2 || noteNames);
          const ev = [`${m[1]} exists (${baseRec.raw.designation}); "${tag}" is a suffix tag`, prefixHit ? `tag "${tag}" matches a commander/nickname in the regiment's chain (${chain.brigade?.id ?? '?'} / ${chain.division?.id ?? '?'})${strong ? '' : ' but is only an initial and the note does not name that commander'}` : `tag "${tag}" does NOT match a commander in the regiment's chain (${surnames.join(', ') || 'none recorded'})`, ...corroborate(ctx, baseRec, rows, note)];
          entry = cand(baseRec, 'suffix_variant', strong ? 'high' : prefixHit ? 'medium' : 'low', ev, strong ? {} : { reason: prefixHit ? 'single-letter tag not corroborated by the note' : 'the suffix tag is not explained by the OOB chain: the regiment may belong to another brigade/division at the time (historian)' });
        }
      }
    }
    // R4 brigade-prefixed regiment id: <corps>-<div>-<n><state>
    if (!entry && shape === 'brigade_prefixed_regiment') {
      const m = id.match(RX.brigadePrefixedRegiment);
      const [, s, div, n, tail] = m;
      let code = tail;
      if (code === 'W') code = 'WI';
      if (!code) {
        const abbr = note.match(new RegExp(`\\b${n}(?:st|nd|rd|th)\\s+([A-Z]{2})\\b`));
        if (abbr) code = abbr[1];
      }
      if (!code) {
        const sm = note.match(new RegExp(`\\b${n}(?:st|nd|rd|th)\\s+(Alabama|Arkansas|Florida|Georgia|Louisiana|Mississippi|North Carolina|South Carolina|Texas|Virginia|Maryland|Tennessee)`));
        if (sm) code = STATE_CODES[sm[1]];
      }
      const cand2 = code ? oob.records.get(`${s}-${n}${code}`) : null;
      if (cand2 && isRegiment(cand2)) {
        const chain = chainOf(oob, cand2);
        const divOk = chain.division && chain.division.id === `${s}-${div}`;
        entry = cand(cand2, 'brigade_prefixed_regiment', divOk ? 'high' : 'low', [`tail "${n}${tail}" resolves to ${cand2.id} (${cand2.raw.designation})`, divOk ? `its division is ${chain.division.id}, matching the id prefix` : `its division is ${chain.division?.id ?? 'unknown'}, NOT the id prefix ${s}-${div}`, ...(tail === 'W' ? ['"W" is read as Wisconsin (WI)'] : [])], divOk ? {} : { reason: 'division in the id prefix does not match the OOB chain' });
      }
    }
    // R5a "<Name>-bde" ids
    if (!entry) {
      const bm = id.match(/^([UC])-([A-Za-z]+)-bde$/);
      if (bm) {
        const found = (idx.commanderIndex.get(`brigade|${bm[2]}`) || []).filter((r) => r.side === sideOfPrefix(id));
        if (found.length === 1) entry = cand(found[0], 'named_brigade_id', 'medium', [`"${bm[2]}" is the commander of ${found[0].id} (${found[0].raw.designation})`]);
        else if (found.length > 1) entry = none('named_brigade_id', `"${bm[2]}" matches ${found.length} brigades`, { candidates: found.map((r) => r.id) });
      }
    }
    // R5 formation name in the note ("Steuart's brigade") for brigade/division-shaped ids. Same side only: never a side flip.
    if (!entry && (['brigade', 'division', 'cavalry_letter'].includes(shape) || (shape === 'other' && !/-ART-/.test(id)))) {
      const kind = ['cavalry_letter', 'other'].includes(shape) ? null : shape;
      const named = [...note.matchAll(/\b((?:[A-Z][a-z]+ )?)([A-Z][A-Za-z'-]+?)(?:'s|s')\s+(?:[A-Za-z]+\s)?(brigade|division)\b/g)].map((m) => ({ given: m[1].trim(), name: m[2], kind: m[3] }));
      const nm = named.find((x) => !kind || x.kind === kind) ?? named[0];
      if (nm) {
        let found = idx.commanderIndex.get(`${nm.kind}|${nm.name}`) || [];
        let fuzzy = null;
        if (!found.length) {
          // one-letter typo in the surname (Nichols / Nicholls): unique same-side hit only
          const near = [...idx.commanderIndex].filter(([k, list]) => k.startsWith(`${nm.kind}|`) && editDistanceOne(k.split('|')[1], nm.name) && list.some((r) => r.side === sideOfPrefix(id)));
          if (near.length === 1) { found = near[0][1]; fuzzy = near[0][0].split('|')[1]; }
        }
        let pick = found.filter((r) => r.side === sideOfPrefix(id));
        if (pick.length > 1 && nm.given) {
          const narrowed = pick.filter((r) => commanderChain(r.raw.commander).some((c) => c.name.includes(nm.given)) || String(r.raw.designation).includes(nm.given));
          if (narrowed.length) pick = narrowed;
        }
        const conf = shape === 'other' ? 'low' : 'medium';
        if (pick.length === 1) {
          const target = pick[0];
          const collide = ctx.rowsByUnit.has(target.id) && rows.some((r) => (ctx.perKey.get(`${target.id}@${r.tick}`) || []).length > 0);
          entry = cand(target, 'formation_named_in_note', conf, [`note names "${nm.given ? nm.given + ' ' : ''}${nm.name}'s ${nm.kind}", the commander of ${target.id} (${target.raw.designation})`, ...(fuzzy ? [`surname differs by one letter from the OOB spelling "${fuzzy}" (typo)`] : []), `id shape is ${shape}; target kind ${target.kind}`, ...(collide ? [`WARNING: ${target.id} already has a row at the same tick(s): merge by (unit,tick) with the twin winning (chapter 13 WP-06 step 1)`] : [])],
            { hard_rules: { same_shape: target.kind === nm.kind } });
        } else if (pick.length > 1) entry = none('formation_named_in_note', `"${nm.given ? nm.given + ' ' : ''}${nm.name}'s ${nm.kind}" matches ${pick.length} OOB records on this side`, { candidates: pick.map((r) => r.id) });
        else if (found.length) entry = none('formation_named_in_note', `"${nm.name}'s ${nm.kind}" exists only on the other side (${found.map((r) => r.id).join(', ')}): a side change is never made by this rule`, { candidates: found.map((r) => r.id) });
      }
    }
    // R6 artillery nickname
    if (!entry && /^[UC]-ART-/.test(id)) {
      const m = id.match(RX.artNickname);
      if (m) {
        const nick = m[2].replace(/-.*$/, '');
        if (nick !== 'RES') {
          const arts = [...idx.battalions, ...idx.artBrigades].filter((r) => r.side === sideOfPrefix(id) && (new RegExp(`\\b${nick}(?:'s|s')`, 'i').test(r.raw.designation || '') || commanderChain(r.raw.commander).some((c) => c.surname === nick)));
          if (arts.length === 1) entry = cand(arts[0], 'artillery_nickname', 'medium', [`"${nick}" matches the commander/designation of ${arts[0].id} (${arts[0].raw.designation})`, `id ${id} is a nickname, not an OOB id`]);
          else if (arts.length > 1) entry = none('artillery_nickname', `"${nick}" matches ${arts.length} artillery records`, { candidates: arts.map((r) => r.id) });
        }
      }
    }
    // R7 designation tokens for the rest (legion names): whole-token matches only; INF/CAV tags select the arm
    if (!entry && !/-ART-/.test(id)) {
      const tokens = id.split('-').slice(1).filter((t) => t.length >= 3 && !/^(INF|CAV|ART|SHB|bde|bn|RES|SHRP|EH)$/.test(t));
      const armWord = /-INF$/.test(id) ? 'Infantry' : /-CAV$/.test(id) ? 'Cavalry' : null;
      const wb = (t) => new RegExp(`(^|[-\\s'])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[-\\s'])`, 'i');
      let cands = idx.regiments.filter((r) => r.side === sideOfPrefix(id) && tokens.length && tokens.every((t) => wb(t).test(r.raw.designation + ' ' + r.id)));
      if (cands.length > 1 && armWord) cands = cands.filter((r) => String(r.raw.designation).includes(armWord));
      if (cands.length === 1) entry = cand(cands[0], 'designation_token', 'low', [`id tokens ${tokens.join('/')} appear in ${cands[0].id} "${cands[0].raw.designation}"`], { reason: 'token match only; the brigade context is not corroborated' });
      else if (cands.length > 1) entry = none('designation_token', `tokens ${tokens.join('/')} match ${cands.length} regiments`, { candidates: cands.map((r) => r.id) });
    }
    // R8 same regiment number under other state codes: ambiguous, never guessed
    if (!entry) {
      const nm = id.match(/^([UC])-(\d+)([A-Z]{2})/);
      if (nm) {
        const same = idx.regiments.filter((r) => r.side === sideOfPrefix(id) && new RegExp(`^[UC]-${nm[2]}[A-Z]{2}(?:-|$)`).test(r.id));
        if (same.length) entry = none('same_number_other_state', `no ${id} in the OOB; same-side regiments numbered ${nm[2]}: ${same.slice(0, 6).map((r) => `${r.id} (${r.raw.designation})`).join('; ')}${same.length > 6 ? ` and ${same.length - 6} more` : ''}`, { candidates: same.slice(0, 12).map((r) => r.id) });
      }
    }
    // R9 batteries named in the note ("Cooper's Battery B, 1st PA") or artillery commanders named in the note
    if (!entry && /-ART-/.test(id)) {
      const bm = note.match(/Battery\s+([A-Z]),?\s+(\d+)(?:st|nd|rd|th)\s+(PA|NY|US|Pennsylvania|New York|Maine|Massachusetts|Ohio)/);
      if (bm) {
        const st2 = { Pennsylvania: 'PA', 'New York': 'NY', Maine: 'ME', Massachusetts: 'MA', Ohio: 'OH' }[bm[3]] ?? bm[3];
        const want = `Battery ${bm[1]}, ${bm[2]}`;
        const bats = idx.batteries.filter((r) => r.side === sideOfPrefix(id) && String(r.raw.designation).startsWith(want) && r.id.includes(`${bm[1]}${bm[2]}${st2}`));
        if (bats.length === 1) entry = cand(bats[0], 'battery_named_in_note', 'low', [`note names "${bm[0]}", matching ${bats[0].id} "${bats[0].raw.designation}"`, `the id itself (${id}) names a different battery letter: the id and the note disagree`], { reason: 'id and note disagree on the battery' });
      }
      if (!entry) {
        const person = (note.match(/\b([A-Z][a-z]+)(?:'s|s')\s+(?:artillery|batter)/) || [])[1];
        if (person) {
          const arts = [...idx.artBrigades, ...idx.battalions].filter((r) => r.side === sideOfPrefix(id) && commanderChain(r.raw.commander).some((c) => c.surname === person));
          if (arts.length === 1) entry = cand(arts[0], 'artillery_commander_in_note', 'low', [`note names "${person}'s artillery", the commander of ${arts[0].id} (${arts[0].raw.designation})`], { reason: `the id (${id}) is not an OOB id; the mapping rests on the note only` });
        }
      }
    }
    // U-VI-* : 8 VI Corps brigades that do not exist in the OOB
    if (!entry && /^U-VI-\d-\d$/.test(id)) entry = { ...base, proposed: id, proposed_kind: 'brigade', rule: 'new_record_required', confidence: 'medium', evidence: ['referenced by regiments and by U-VI-* division.brigade_ids, but no brigade record exists (R003)', 'candidate brigade record generated in data-src/build/candidates/vi_corps_brigades.json from the regiments that reference it'], new_record: true };
    if (!entry) entry = none('no_rule', 'no OOB record could be matched by any rule');
    // hard rules
    const warnings = [];
    if (entry.proposed && entry.confidence !== 'none') {
      const target = oob.records.get(entry.proposed);
      if (target && shape === 'regiment' && target.kind !== 'regiment') warnings.push('hard rule violated: regiment-shaped id mapped to a non-regiment');
      if (target && shape === 'brigade' && target.kind !== 'brigade') warnings.push('hard rule violated: brigade-shaped id mapped to a non-brigade');
      if (target && target.side !== sideOfPrefix(id) && entry.rule !== 'wrong_side_prefix' && shape !== 'other') warnings.push('side differs from the id prefix outside the wrong-prefix rule');
    }
    entry.hard_rule_warnings = warnings;
    entry.needs_historian = entry.confidence !== 'high' || warnings.length > 0 || Boolean(entry.evidence?.some((e) => String(e).startsWith('WARNING')));
    entries.push(entry);
  }
  const counts = {
    unresolved_ids: entries.length,
    rows: entries.reduce((a, e) => a + e.rows, 0),
    by_confidence: Object.fromEntries(['high', 'medium', 'low', 'none'].map((c) => [c, entries.filter((e) => e.confidence === c).length])),
    by_rule: entries.reduce((acc, e) => { acc[e.rule] = (acc[e.rule] || 0) + 1; return acc; }, {}),
    needs_historian: entries.filter((e) => e.needs_historian).length,
    auto_high_share: Number((entries.filter((e) => e.confidence === 'high').length / Math.max(1, entries.length)).toFixed(3)),
    auto_high_or_medium_share: Number((entries.filter((e) => ['high', 'medium'].includes(e.confidence)).length / Math.max(1, entries.length)).toFixed(3)),
  };
  const wrong_side = entries.filter((e) => e.rule === 'wrong_side_prefix').map((e) => ({ id: e.alias_id, proposed: e.proposed, rows: e.rows, ticks: e.ticks, twin_placed: ctx.rowsByUnit.has(e.proposed), evidence: e.evidence }));
  return { entries, counts, wrong_side };
}

// ---------------------------------------------------------------------------------------------------------------- dual meaning

/**
 * Rows keyed to an id that EXISTS in the OOB but whose note names another formation, or whose strength is
 * inconsistent with the record (a sign that the id is used for two formations). All are needs_historian.
 */
export function buildDualMeaning(ctx, r011Violations) {
  const byUnit = new Map();
  for (const v of r011Violations) {
    const { unit_id, tick, named, oob_candidates } = v.data;
    if (!byUnit.has(unit_id)) byUnit.set(unit_id, []);
    byUnit.get(unit_id).push({ tick, file: v.file, key: v.key, named, proposed: oob_candidates.length === 1 ? oob_candidates[0] : null, candidates: oob_candidates });
  }
  const out = [];
  for (const [unit, list] of byUnit) {
    const rec = ctx.oob.records.get(unit);
    out.push({
      unit_id: unit,
      oob_designation: rec?.raw.designation ?? null,
      oob_commander: rec?.raw.commander?.name ?? null,
      detection: 'note names another formation (rule R011)',
      rows: list.map((l) => ({ ...l, note: (ctx.perKey.get(`${unit}@${l.tick}`) || [])[0]?.notes ?? '' })),
      proposed_rekey: [...new Set(list.map((l) => l.proposed).filter(Boolean))],
      atomic_group: null,
      needs_historian: true,
    });
  }
  // strength-level suspects: a row with more than twice the record's own strength cannot be that formation
  const seen = new Set(out.map((o) => o.unit_id));
  for (const [unit, rows] of ctx.rowsByUnit) {
    const rec = ctx.oob.records.get(unit);
    if (!rec || !['brigade', 'division', 'corps'].includes(rec.kind) || !(rec.raw.strength > 0)) continue;
    const big = rows.filter((r) => r.strength > 2 * rec.raw.strength);
    if (!big.length) continue;
    const existing = out.find((o) => o.unit_id === unit);
    const info = big.map((r) => ({ tick: r.tick, strength: r.strength, file: r.file, note: r.notes ?? '' }));
    if (existing) existing.strength_suspects = info;
    else if (!seen.has(unit)) { seen.add(unit); out.push({ unit_id: unit, oob_designation: rec.raw.designation, oob_commander: rec.raw.commander?.name ?? null, detection: `row strength more than 2x the OOB strength of the ${rec.kind} (${rec.raw.strength})`, rows: [], strength_suspects: info, proposed_rekey: [], atomic_group: null, needs_historian: true }); }
  }
  // atomic permutation groups: at one tick, row A's target is row B's unit and vice versa
  const target = new Map(); // `${unit}@${tick}` -> proposed
  for (const o of out) for (const r of o.rows) if (r.proposed) target.set(`${o.unit_id}@${r.tick}`, r.proposed);
  let g = 0;
  const grouped = new Set();
  for (const [k, t] of target) {
    const tick = k.split('@')[1];
    if (grouped.has(k)) continue;
    // follow the chain of re-keys at this tick until it closes or leaves the set
    const chain = [k];
    let cur = `${t}@${tick}`;
    while (target.has(cur) && !chain.includes(cur) && chain.length < 8) { chain.push(cur); cur = `${target.get(cur)}@${tick}`; }
    if (chain.length > 1 && (cur === k || target.has(cur))) {
      g++;
      for (const c of chain) { grouped.add(c); const o = out.find((x) => x.unit_id === c.split('@')[0]); if (o) o.atomic_group = `t${tick}#${g}`; }
    }
  }
  return out.sort((a, b) => (a.unit_id < b.unit_id ? -1 : 1));
}

// ---------------------------------------------------------------------------------------------------------------- VI Corps candidates

/**
 * The Sixth Corps as printed in OR Ser. I vol. 27 pt. 1 (organization of the Army of the Potomac, printed pp.162-163), read from the
 * Internet Archive OCR (warofrebellion271unit_djvu.txt lines 18604-18760) by this workstream. Only names, ranks and regiment numbers
 * are recorded; OCR garbles in the source are noted where they affect a number ("2d" printed as "3d" in the Vermont list).
 */
export const VI_CORPS_OR = [
  { or_id: 'I-1', position: 'First Division (Wright), First Brigade', commander: 'Brig. Gen. A. T. A. Torbert', regiments: ['1st New Jersey', '2nd New Jersey', '3rd New Jersey', '15th New Jersey'] },
  { or_id: 'I-2', position: 'First Division (Wright), Second Brigade', commander: 'Brig. Gen. Joseph J. Bartlett', regiments: ['5th Maine', '121st New York', '95th Pennsylvania', '96th Pennsylvania'] },
  { or_id: 'I-3', position: 'First Division (Wright), Third Brigade', commander: 'Brig. Gen. David A. Russell', regiments: ['6th Maine', '49th Pennsylvania', '119th Pennsylvania', '5th Wisconsin'] },
  { or_id: 'II-2', position: 'Second Division (Howe), Second Brigade (the OR notes "No First Brigade in division")', commander: 'Col. Lewis A. Grant', regiments: ['2nd Vermont', '3rd Vermont', '4th Vermont', '5th Vermont', '6th Vermont'], ocr_note: 'the OCR prints the first Vermont regiment as "3d"; two 3d cannot both be right, read here as the 2nd Vermont' },
  { or_id: 'II-3', position: 'Second Division (Howe), Third Brigade', commander: 'Brig. Gen. Thomas H. Neill', regiments: ['7th Maine', '33rd New York', '43rd New York', '49th New York', '77th New York', '61st Pennsylvania'], ocr_note: 'the OCR prints "38d" and "48d" New York, read here as 33rd and 43rd' },
  { or_id: 'III-1', position: 'Third Division (Newton, then Wheaton), First Brigade', commander: 'Brig. Gen. Alexander Shaler', regiments: ['65th New York', '67th New York', '122nd New York', '23rd Pennsylvania', '82nd Pennsylvania'] },
  { or_id: 'III-2', position: 'Third Division (Newton, then Wheaton), Second Brigade', commander: 'Col. Henry L. Eustis', regiments: ['7th Massachusetts', '10th Massachusetts', '37th Massachusetts', '2nd Rhode Island'] },
  { or_id: 'III-3', position: 'Third Division (Newton, then Wheaton), Third Brigade', commander: 'Brig. Gen. Frank Wheaton (Col. David J. Nevin)', regiments: ['62nd New York', '93rd Pennsylvania', '98th Pennsylvania', '102nd Pennsylvania', '139th Pennsylvania'] },
];

const NEW_WORDS = new Set(['New', 'Rhode', 'North', 'South', 'West']);
/** "121st New York Volunteer Infantry (Birney's...)" -> "121|new york". */
export function regimentKey(text) {
  const m = String(text).replace(/\(.*?\)/g, '').match(/^\s*(\d+)(?:st|nd|rd|th|d)?\s+([A-Za-z]+)(?:\s+([A-Za-z]+))?/);
  if (!m) return null;
  return `${m[1]}|${(NEW_WORDS.has(m[2]) ? `${m[2]} ${m[3]}` : m[2]).toLowerCase()}`;
}

/**
 * Candidate brigade records for the 8 VI Corps brigade ids that regiments and divisions reference but no file defines.
 * The site's U-VI-x-y numbering is paired with an OR brigade by REGIMENT OVERLAP (never by numbering order, which differs:
 * the site's U-VI-3-2 is the OR Third Brigade and U-VI-3-3 the OR Second). Regiment lists and strength/casualty sums are
 * DERIVED from the legacy regiment records.
 */
export function buildViCorpsCandidates(ctx) {
  const missing = [...new Set(ctx.oob.list.filter((r) => r.kind === 'regiment' && /^U-VI-\d-\d$/.test(r.raw.parent_brigade_id || '') && !ctx.oob.records.has(r.raw.parent_brigade_id)).map((r) => r.raw.parent_brigade_id))].sort();
  const out = [];
  for (const bid of missing) {
    const regs = ctx.oob.list.filter((r) => r.kind === 'regiment' && r.raw.parent_brigade_id === bid);
    const div = bid.replace(/-\d$/, '');
    const divRec = ctx.oob.records.get(div);
    const legacyKeys = regs.map((r) => regimentKey(r.raw.designation));
    const scored = VI_CORPS_OR.map((o) => ({ o, hits: o.regiments.filter((x) => legacyKeys.includes(regimentKey(x))) }));
    scored.sort((a, b) => b.hits.length - a.hits.length);
    const best = scored[0];
    const tie = scored[1] && scored[1].hits.length === best.hits.length;
    const orKeys = best.o.regiments.map(regimentKey);
    const extra = regs.filter((r) => !orKeys.includes(regimentKey(r.raw.designation))).map((r) => `${r.id} (${r.raw.designation})`);
    const missingFromLegacy = best.o.regiments.filter((x) => !legacyKeys.includes(regimentKey(x)));
    const strength = regs.reduce((a, r) => a + r.raw.strength, 0);
    const casualties = regs.reduce((a, r) => a + r.raw.casualties, 0);
    out.push({
      brigade_id: bid,
      candidate: true,
      parent_division_id: div,
      parent_corps_id: 'U-VI',
      division_designation: divRec?.raw.designation ?? null,
      or_pairing: best.hits.length && !tie ? { or_position: best.o.position, commander_or: best.o.commander, method: 'regiment overlap', matched: best.hits.length, of_or_regiments: best.o.regiments.length, of_legacy_regiments: regs.length } : { method: 'regiment overlap', ambiguous: true, matched: best.hits.length },
      designation_candidate: best.hits.length && !tie ? `${best.o.position.replace(/^.*?\), /, '')}, ${divRec?.raw.designation ?? div}` : null,
      regiment_ids: regs.map((r) => r.id),
      regiments_in_legacy_data: regs.map((r) => r.raw.designation),
      regiments_listed_in_or: best.o.regiments,
      in_legacy_not_in_or_brigade: extra,
      in_or_brigade_not_in_legacy: missingFromLegacy,
      numbering_matches_or_order: (() => { const n = Number(bid.slice(-1)); const orN = Number(best.o.or_id.split('-')[1]); return n === orN; })(),
      strength_derived: strength,
      casualties_derived: casualties,
      derived_note: 'sum of the legacy regiment records (regiments with no casualties recorded contribute 0); reported_* and unlisted_* fields are WP-DATA-07 step 3',
      source: 'OR Ser. I vol. 27 pt. 1, organization of the Army of the Potomac, Sixth Corps (printed pp.162-163); IA warofrebellion271unit_djvu.txt lines 18604-18760',
      ocr_note: best.o.ocr_note ?? null,
      verification: 'OCR read by this workstream; commanders and regiment lists are as printed; the pairing of each site id with an OR brigade is by regiment overlap and needs the historian',
      needs_historian: true,
    });
  }
  return out;
}

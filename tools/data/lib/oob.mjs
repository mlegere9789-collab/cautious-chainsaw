// Order-of-battle index over the legacy oob/*.json files (WP-DATA-06 / DI-02).
// Every record gets: id, kind, side, file, path, raw, parent ids. Nothing is inferred from the ID prefix
// except where noted (`prefix_side`), so R002 (side/prefix mismatch) can compare the two.
import { sideOfPrefix } from './util.mjs';

/** kinds: regiment | battery | brigade | division | corps | battalion | artillery_brigade | army */
export function buildOobIndex(data) {
  const records = new Map();      // id -> first record
  const list = [];                // every record occurrence (including duplicates)
  const duplicates = [];          // [{id, first, second}]
  const perFile = new Map();

  const add = (rec) => {
    list.push(rec);
    perFile.set(rec.file, (perFile.get(rec.file) || 0) + 1);
    if (records.has(rec.id)) duplicates.push({ id: rec.id, first: records.get(rec.id), second: rec });
    else records.set(rec.id, rec);
  };
  const fileSide = (rel) => (rel.includes('confederate') ? 'confederate' : rel.includes('union') ? 'union' : null);

  for (const [rel, f] of data.files) {
    if (!rel.startsWith('oob/') || !f.json) continue;
    const j = f.json;
    const side = fileSide(rel);
    const mk = (id, kind, path, raw, extra = {}) => ({
      id, kind, side, file: rel, path, raw, prefix_side: sideOfPrefix(id), ...extra,
    });

    // regiments (union_regiments_*, confederate_regiments_*, *_cavalry*.regiments)
    if (Array.isArray(j.regiments)) {
      j.regiments.forEach((r, i) => {
        const horse = r.unit_type === 'horse_artillery';
        add(mk(r.regiment_id, horse ? 'battery' : 'regiment', `regiments[${i}]`, r, {
          filed_as: 'regiment',
          parent_brigade_id: r.parent_brigade_id ?? null,
          parent_corps_id: r.parent_corps_id ?? null,
          alias_for: r.alias_for ?? null,
          horse_artillery: horse,
        }));
      });
    }
    // brigades (union_oob_brigades, confederate_oob_corps_div_bde, confederate_cavalry)
    if (Array.isArray(j.brigades)) {
      j.brigades.forEach((b, i) => {
        add(mk(b.brigade_id, 'brigade', `brigades[${i}]`, b, {
          parent_division_id: b.parent_division_id ?? null,
          parent_corps_id: b.parent_corps_id ?? null,
          child_ids: b.regiment_ids ?? [],
        }));
      });
    }
    if (Array.isArray(j.divisions)) {
      j.divisions.forEach((d, i) => add(mk(d.division_id, 'division', `divisions[${i}]`, d, {
        parent_corps_id: d.parent_corps_id ?? null,
        child_ids: d.brigade_ids ?? [],
      })));
    }
    if (Array.isArray(j.corps)) {
      j.corps.forEach((c, i) => add(mk(c.corps_id, 'corps', `corps[${i}]`, c, { child_ids: c.division_ids ?? [] })));
    }
    if (j.army && j.army.army_id) add(mk(j.army.army_id, 'army', 'army', j.army, {}));

    // horse artillery batteries
    if (Array.isArray(j.horse_artillery)) {
      j.horse_artillery.forEach((b, i) => add(mk(b.battery_id, 'battery', `horse_artillery[${i}]`, b, {
        horse_artillery: true, parent_brigade_id: null, division_attached: b.division_attached ?? null,
      })));
    }
    // union artillery
    if (j.artillery_reserve && Array.isArray(j.artillery_reserve.brigades)) {
      j.artillery_reserve.brigades.forEach((ab, i) => {
        add(mk(ab.brigade_id, 'artillery_brigade', `artillery_reserve.brigades[${i}]`, ab, {
          child_ids: (ab.batteries || []).map((x) => x.battery_id), corps: 'ART-RES',
        }));
        (ab.batteries || []).forEach((b, k) => add(mk(b.battery_id, 'battery', `artillery_reserve.brigades[${i}].batteries[${k}]`, b, {
          parent_artillery_id: ab.brigade_id, parent_corps_id: null,
        })));
      });
    }
    if (Array.isArray(j.corps_artillery_brigades)) {
      j.corps_artillery_brigades.forEach((ab, i) => {
        add(mk(ab.brigade_id, 'artillery_brigade', `corps_artillery_brigades[${i}]`, ab, {
          child_ids: (ab.batteries || []).map((x) => x.battery_id), corps: ab.corps ?? null,
        }));
        (ab.batteries || []).forEach((b, k) => add(mk(b.battery_id, 'battery', `corps_artillery_brigades[${i}].batteries[${k}]`, b, {
          parent_artillery_id: ab.brigade_id, parent_corps_id: ab.corps ?? null,
        })));
      });
    }
    // confederate artillery
    for (const ck of ['first_corps_artillery', 'second_corps_artillery', 'third_corps_artillery']) {
      const c = j[ck];
      if (!c || !Array.isArray(c.battalions)) continue;
      c.battalions.forEach((bn, i) => {
        add(mk(bn.battalion_id, 'battalion', `${ck}.battalions[${i}]`, bn, {
          child_ids: (bn.batteries || []).map((x) => x.battery_id), corps: ck.split('_')[0],
        }));
        (bn.batteries || []).forEach((b, k) => add(mk(b.battery_id, 'battery', `${ck}.battalions[${i}].batteries[${k}]`, b, {
          parent_artillery_id: bn.battalion_id, parent_corps_id: null,
        })));
      });
    }
  }
  const byKind = {};
  for (const r of records.values()) byKind[r.kind] = (byKind[r.kind] || 0) + 1;
  return { records, list, duplicates, byKind, perFile };
}

/** Level used by ID-grammar rules (R007). Batteries filed as regiments keep kind=battery. */
export const levelOf = (rec) => rec.kind;

/**
 * ID grammars, derived from the shapes actually present in the legacy OOB (measured in
 * data-src/build/id_grammar.json by unit_registry.mjs) and the chapter-13 R007 rule.
 * `S` = side prefix. State codes are 2 letters (plus US, R for Regulars/Reserves are handled as suffix tokens).
 */
export const ID_GRAMMAR = {
  corps: /^[UC]-(?:[IVX]+|CAV)$/,
  division: /^[UC]-(?:[IVX]+|CAV)-\d+$/,
  brigade: /^[UC]-(?:[IVX]+|CAV)-\d+-\d+$|^C-CAV-\d+$|^U-CAV-\d+-R$/,
  regiment: /^[UC]-\d+[A-Z]{2}(?:-[A-Za-z0-9]+)*$|^[UC]-[A-Za-z]+-[A-Z]+(?:-[A-Za-z]+)*$/,
  battery: /^[UC]-(?:ART|HAB)-[A-Za-z0-9-]+$|^C-McClanahan-ART$/,
  battalion: /^C-ART-[IVX]+-\d+$/,
  artillery_brigade: /^U-ART-(?:RES-(?:\d+|REG)|[IVX]+-CORPS|CAV-?[A-Za-z0-9-]*)$/,
  army: /^[UC]-[A-Z]{3,4}$/,
};

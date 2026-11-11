// The default view of the source conflicts. Pure functions, no DOM, no fetch: unit-tested in node (tests/scenario-defaults.test.mjs).
// Each of the 47 register conflicts opens on its delegated default (data/conflict-defaults.json), labelled with its tier and "default chosen under
// delegated authority, reversible by the owner". The plan's recommended value and every other printed value stay selectable, and one control switches
// every conflict to the plan's recommended value. Option keys: 'delegated' (the default), 'recommended' (the plan's value), 'v0'.. (printed values),
// 'x:<scenario id>' (values added from the primary record), 'range' (show every value). Conflicts with no delegated default (the weather ones) keep
// 'recommended' and are unaffected.
export const DELEGATED_KEY = 'delegated', PDF_KEY = 'recommended';
export const DELEGATED_NOTE = 'Default chosen under delegated authority, reversible by the owner';
export const PDF_LABEL = 'PDF recommended, pending owner';
const norm = s => String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9:]+/g, ' ').trim();

// conflicts: the list data.mjs builds; file: data/conflict-defaults.json (or null). Adds options in place and returns the list.
export function applyDelegatedDefaults(conflicts, file) {
  const D = file && file.conflicts ? file.conflicts : {};
  for (const c of conflicts) {
    const d = D[c.id]; if (!d) continue;
    const have = new Set(c.options.flatMap(o => [norm(o.label), norm(o.text)]));
    const added = [];
    for (const s of d.scenarios || []) {
      if (s.id === d.default_scenario_id || /^PDF recommended default/i.test(s.label)) continue;       // the default and the plan's value are carried under their own keys
      const n = norm(s.label); if (have.has(n)) continue; have.add(n);
      added.push({ key: 'x:' + s.id, label: s.label, text: s.label, added: s.source || 'added from the primary record' });
    }
    const rec = c.options.find(o => o.key === PDF_KEY), range = c.options.find(o => o.key === 'range'), rest = c.options.filter(o => o !== rec && o !== range);
    c.options = [{ key: DELEGATED_KEY, label: d.default_label, text: d.default_label, delegated: true, tier: d.tier }, rec, ...rest, ...added, range].filter(Boolean);
    c.delegated = { id: d.default_scenario_id, label: d.default_label, tier: d.tier, basis: d.basis, pdf: d.pdf_recommended_default, rationale: d.rationale, note: d.product_label || DELEGATED_NOTE };
    c.status = 'DELEGATED_DEFAULT_REVERSIBLE';
  }
  return conflicts;
}
export const withDefault = conflicts => conflicts.filter(c => c.delegated);
export const defaultChoices = conflicts => Object.fromEntries(withDefault(conflicts).map(c => [c.id, DELEGATED_KEY]));
export const pdfChoices = conflicts => Object.fromEntries(withDefault(conflicts).map(c => [c.id, PDF_KEY]));
export const currentKey = (sc, c) => (sc.choices && sc.choices[c.id]) || PDF_KEY;   // an absent choice is the plan's value (the weather conflicts have no delegated default)
export function optionLabel(c, o) { return o.key === PDF_KEY ? PDF_LABEL : o.key === DELEGATED_KEY ? `${o.label} (default, ${o.tier})` : o.label; }
export function newScenario(conflicts) { return { id: 'delegated-defaults', label: 'Delegated defaults', choices: defaultChoices(conflicts) }; }
export function scenarioId(kind) { return kind === 'pdf' ? 'pdf-recommended' : kind === 'delegated' ? 'delegated-defaults' : 'custom'; }
// how a scenario differs from the delegated defaults / from the plan's values
export function scenarioKind(sc, conflicts) {
  const ch = sc.choices || {}; let dDiff = 0, pDiff = 0;
  for (const c of conflicts) { const k = ch[c.id] || PDF_KEY, base = c.delegated ? DELEGATED_KEY : PDF_KEY; if (k !== base) dDiff++; if (k !== PDF_KEY) pDiff++; }
  return { kind: dDiff === 0 ? 'delegated' : pDiff === 0 ? 'pdf' : 'custom', dDiff, pDiff };
}
export function scenarioText(sc, conflicts) {
  const k = scenarioKind(sc, conflicts);
  return k.kind === 'delegated' ? 'Delegated defaults (reversible by the owner)' : k.kind === 'pdf' ? 'PDF recommended values, pending owner' : `Custom: ${k.dDiff} choice${k.dDiff > 1 ? 's' : ''} differ${k.dDiff > 1 ? '' : 's'} from the delegated defaults`;
}
export const scenarioIsDefault = (sc, conflicts) => scenarioKind(sc, conflicts).kind === 'delegated';
// set one conflict (returns the scenario's choices object, mutated); the delegated default is stored explicitly, so 'recommended' is stored explicitly too
export function setChoice(sc, conflicts, c, key) { sc.choices = sc.choices || {}; if (!c.delegated && key === PDF_KEY) delete sc.choices[c.id]; else sc.choices[c.id] = key; sc.id = scenarioId(scenarioKind(sc, conflicts).kind); return sc; }
export function resetToDelegated(sc, conflicts) { sc.choices = defaultChoices(conflicts); sc.id = 'delegated-defaults'; return sc; }
export function switchToPdf(sc, conflicts) { sc.choices = pdfChoices(conflicts); sc.id = 'pdf-recommended'; return sc; }

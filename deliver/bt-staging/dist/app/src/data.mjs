// Read-only loaders for the governance and environment files the page shows. Nothing here writes or modifies a source file.
import { URLS } from './config.mjs';
import { isoToMin, minOf } from './clock.mjs';
import { applyDelegatedDefaults, newScenario, withDefault, scenarioText, scenarioIsDefault as isDefaultFor } from './scenario-defaults.mjs';

const getJSON = async (url) => { const r = await fetch(url); if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`); return r.json(); };
const getLines = async (url) => { const r = await fetch(url); if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`); return (await r.text()).split(/\r?\n/).filter(Boolean).map(l => JSON.parse(l)); };

// U+FFFD in the register text stands for a lost apostrophe or quotation mark in the PDF extraction; restore it for display only
export const tidy = s => String(s ?? '').replace(/(\w)�(\w)/g, '$1’$2').replace(/(^|[\s(])�/g, '$1“').replace(/�/g, '”').replace(/\s+/g, ' ').trim();

// ---- timeline rows: ids, default times and tiers from timeline_windows.jsonl; the printed row text from timeline_seed.jsonl
export async function loadTimeline() {
  const [win, seed] = await Promise.all([getLines(URLS.gov + 'timeline_windows.jsonl'), getLines(URLS.gov + 'timeline_seed.jsonl')]);
  const seedById = new Map(seed.map(s => [s.id, s]));
  const reg = new Set((await getJSON(URLS.gov + 'register_index.json')).map(r => r.id));
  const rows = win.map(w => {
    const s = seedById.get(w.id); let cells = (s?.text_raw || '').split(' | ');
    let head = cells.shift(); while (cells.length && (head.split('(').length > head.split(')').length)) head += ' ' + cells.shift();       // a time that wraps inside a bracket
    const ti = cells.findIndex(c => c.trim().toLowerCase() === w.tier), what = ti >= 0 ? cells.slice(0, ti) : cells, after = ti >= 0 ? cells.slice(ti + 1) : [];
    const text = tidy(what.join(' ')), notes = tidy(after.join(' '));
    const timed = w.default != null;
    return {
      id: w.id, tier: w.tier, raw: w.raw, date: w.date ? isoToMin(w.date) : null, t: timed ? w.default : null, earliest: w.earliest, latest: w.latest, approx: !!w.approx,
      phrase: w.phrase, band: w.band, parse: w.parse_status, alternatives: w.alternatives || [], text, notes, label: text.length > 96 ? text.slice(0, text.lastIndexOf(' ', 96)) + '...' : text,
      page: s?.page ?? null, status: s?.status || 'seeded_unverified', weak: !!s?.weak_source_flag, register: reg.has('EG-TL-' + w.id) ? 'EG-TL-' + w.id : null,
    };
  });
  rows.sort((a, b) => (a.t ?? (a.date ?? 1e9) + 0.5) - (b.t ?? (b.date ?? 1e9) + 0.5) || a.id.localeCompare(b.id));
  return rows;
}

// ---- source conflicts: C-001..C-047 (PDF B.2.5) and the weather file's carried conflicts; every printed value is carried
export async function loadConflicts() {
  const [reg, wx, defaults] = await Promise.all([getJSON(URLS.gov + 'conflict_register.json'), getJSON(URLS.env + 'weather_timeline.json'), getJSON(URLS.data + 'conflict-defaults.json').catch(e => { console.warn('delegated defaults not read, the plan\'s values are the default view:', e.message || e); return null; })]);
  const out = [];
  // six rows of the register wrap their printed columns over more than four cells; these are the same words cut at the column boundaries (checked below against the printed text)
  const COLS = {
    'C-001': ['after midnight (SS1, W-D1); about 04:00 (EPP)', 'about 01:00, then a pre-dawn inspection of the line', 'both'],
    'C-017': ['Birney; Hancock', 'Birney (corps), Hancock overseeing the sector', 'Hancock'],
    'C-018': ['Webb; Stannard; reached the crest or not', 'stopped short of the crest, attribution unresolved', 'all'],
    'C-021': ['night of Jul 2 (W-D2, PHIF); Jul 3 (SS2); marches from 06:00 Jul 2 (EPP); no order to be up by daylight Jul 3 (W-PC)', 'on the field the morning of Jul 3 (conservative: not shown before dawn Jul 3)', 'night of Jul 2'],
    'C-023': ['noon-13:00; mid-afternoon; afternoon; evening', 'Stuart himself early afternoon, brigades in the evening', 'all'],
    'C-037': ['Jul 2; Jul 3', 'Jul 2 (wounded), death Jul 2-3 shown as a range', 'Jul 3'],
  };
  for (const c of reg) {
    let cells = c.text.split(' | ').map(tidy);
    if (cells.length !== 4 && COLS[c.id] && COLS[c.id].join(' ').replace(/\s+/g, ' ') === cells.slice(1).join(' ').replace(/\s+/g, ' ')) cells = [cells[0], ...COLS[c.id]];
    const clean4 = cells.length === 4;
    const options = [{ key: 'recommended', label: 'PDF recommended, pending owner', text: clean4 ? cells[2] : cells.slice(1).join(' ') }];
    if (clean4) cells[1].split(/;\s*/).filter(Boolean).forEach((v, i) => options.push({ key: 'v' + i, label: v, text: v }));
    options.push({ key: 'range', label: 'Show every value (no single value chosen)', text: clean4 ? cells[1] : cells.slice(1).join(' ') });
    out.push({ id: c.id, kind: 'register', page: c.page, topic: tidy(c.topic), printed: clean4 ? { values: cells[1], recommended: cells[2], others: cells[3] } : { whole: cells.slice(1).join(' ') }, options, status: c.default_status });
  }
  for (const c of wx.conflicts_carried_as_ranges) {
    const options = [{ key: 'recommended', label: 'PDF recommended, pending owner', text: c.pdf_handling || '' }];
    (c.candidates || []).forEach((k, i) => options.push({ key: 'opt' + i, label: `${k.source}: ${k.value_mph != null ? k.value_mph + ' mph' : k.schedule || k.state || k.statement || k.reading}`, text: `${k.source}: ${k.value_mph != null ? k.value_mph + ' mph' : k.schedule || k.state || k.statement || k.reading}` }));
    if (c.id === 'CF-JUL2-CLOUD-2PM') { options.length = 1; options.push({ key: 'opt0', label: 'Read as 3/10 covered (mostly clear)', text: '3/10 covered' }, { key: 'opt1', label: 'Read as 7/10 covered (mostly cloud)', text: '7/10 covered' }); }
    out.push({ id: c.id, kind: 'weather', topic: c.element, printed: { values: (c.candidates || []).map(k => `${k.source}: ${k.value_mph != null ? k.value_mph + ' mph' : k.schedule || k.state || k.statement || k.reading}`).join('; '), recommended: c.pdf_handling, others: (c.agreed || []).join('; ') }, options, status: 'PDF_RECOMMENDED_DEFAULT_PENDING_OWNER_DECISION' });
  }
  applyDelegatedDefaults(out, defaults);          // the 47 delegated defaults (data/conflict-defaults.json); every other value stays selectable
  return out;
}
// the scenario the theatre opens on: every conflict on its delegated default (the plan's values when the defaults file is not there)
export const DEFAULT_SCENARIO = (conflicts = []) => withDefault(conflicts).length ? newScenario(conflicts) : { id: 'pdf-recommended', label: 'PDF recommended, pending owner', choices: {} };
export const scenarioIsDefault = (s, conflicts = []) => withDefault(conflicts).length ? isDefaultFor(s, conflicts) : Object.keys(s.choices || {}).length === 0;
export const scenarioLabel = (s, conflicts = []) => withDefault(conflicts).length ? scenarioText(s, conflicts) : (Object.keys(s.choices || {}).length ? `Custom: ${Object.keys(s.choices).length} choice${Object.keys(s.choices).length > 1 ? 's' : ''} changed` : 'PDF recommended, pending owner');

export const loadEnvironmentFiles = () => Promise.all([getJSON(URLS.env + 'ephemeris_1863.json'), getJSON(URLS.env + 'weather_timeline.json')]);
export const loadBookmarks = () => getJSON(URLS.data + 'site-bookmarks.json');
export const registerHref = id => `${URLS.gov}register/${id}.md`;
export const timelineWindowsHref = URLS.gov + 'timeline_windows.jsonl';

// ---- the real history layer's inputs (read-only). The kit file is optional: a layer without it says 'kit not available' on its cards.
export async function loadHistoryData() {
  const opt = async (url) => { try { return await getJSON(url); } catch { return null; } };
  const [placementClaims, siblingApproach, dayPositions, units, arrivals, notOnField, conflicts, gazetteer, placement, structures, works, kit, engagements, casualtySources, batteryGuns, kitWeapons, kitArtillery, kitCavalry, kitCrosswalk, figuresValidation] = await Promise.all([
    opt(URLS.data + 'placement-claims.json'), opt(URLS.data + 'sibling-approach.json'), opt(URLS.data + 'daypositions.json'), getJSON(URLS.hist + 'units.json'), getJSON(URLS.hist + 'arrivals.json'), getJSON(URLS.hist + 'not_on_field.json'), getJSON(URLS.gov + 'conflicts_structured.json'),
    getJSON(URLS.data + 'gazetteer.json'), getJSON(URLS.data + 'placement.json'), opt(URLS.structures + 'structures.json'), opt(URLS.structures + 'works_stages.json'), opt(URLS.kit + 'kit_specs.json'),
    opt(URLS.data + 'engagements.json'), opt(URLS.data + 'casualty-sources.json'), opt(URLS.data + 'battery-guns.json'), opt(URLS.kit + 'weapons.json'), opt(URLS.kit + 'artillery_batteries.json'), opt(URLS.kit + 'cavalry_units.json'), opt(URLS.data + 'kit-crosswalk.json'), opt(URLS.data + 'figures-validation.json')]);
  return { placementClaims, siblingApproach, dayPositions, units, arrivals, notOnField, conflicts, gazetteer, placement, structures, works, kit, engagements, casualtySources, batteryGuns, kitWeapons, kitArtillery, kitCavalry, kitCrosswalk, figuresValidation };
}

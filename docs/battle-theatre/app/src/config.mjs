// Paths and constants of the Battle Theatre page shell. Everything is relative to this file, so the shell works from any static root that
// contains docs/battle-theatre (the prototype renderer, GOVERNANCE, environment and this app are siblings).
const here = new URL('./', import.meta.url);
export const URLS = {
  app: new URL('../', here).href,
  proto: new URL('../../render/prototype/', here).href,          // renderer modules + terrain
  gov: new URL('../../GOVERNANCE/', here).href,
  env: new URL('../../environment/', here).href,
  data: new URL('../data/', here).href,
  hist: new URL('../../history/', here).href,                   // history/units.json, arrivals.json, not_on_field.json
  structures: new URL('../../structures/', here).href,
  kit: new URL('../../kit/', here).href,
};
export const SIM_CODE = 'bt-app-0.1';
export const SEED = 1863;
export const LABEL_PLACEHOLDER = 'Modelled placeholder';
export const TIERS = ['documented', 'inferred', 'plausible-procedural', 'open gap'];
export const TIER_STYLE = {                       // colour + shape + outline pattern, so tier never depends on colour alone
  'documented':           { color: '#6fcf97', dash: [],      glyph: 'circle',   label: 'Documented' },
  'inferred':             { color: '#e0b250', dash: [7, 4],  glyph: 'diamond',  label: 'Inferred' },
  'plausible-procedural': { color: '#b79cf2', dash: [2, 4],  glyph: 'triangle', label: 'Plausible-procedural' },
  'open gap':             { color: '#ef7d6b', dash: [10, 3, 2, 3], glyph: 'square', label: 'Open gap' },
};
export const SPEEDS = [0.25, 0.5, 1, 2, 4, 8, 15, 30, 60];
export const DEFAULTS = { nightFloor: 0.34, renderScale: 1, nearR: 40, midR: 300 };
export const GROUND_NOTE = 'The ground is the modern landscape (2022 aerial photograph and 3D Elevation Program terrain), not the 1863 landscape.';

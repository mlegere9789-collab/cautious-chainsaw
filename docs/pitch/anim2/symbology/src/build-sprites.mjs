// src/build-sprites.mjs - turn tokens + the needed set into a flat list of sprites (key, svg, geometry).  Pure: no browser.
import { SIDES, ARMS, ECHELONS, STATES, baseKey, isFormationEch } from './common.mjs';
import { LANGUAGES } from './languages.mjs';
import { renderChip, renderGauge, CHIPS } from './chips.mjs';
import { renderRing, renderAgg, renderBadge, renderTab, renderPin, ARMSETS, BADGE_SHAPES, DIV_COLOURS } from './overlays.mjs';

export const EVIDENCE_OF_GROUP = {
  base: { side: 'Documented (order of battle) / Contested (10 ids, drawn as unknown)', arm: 'Documented for regiments, batteries, battalions; none claimed for formations', ech: 'Documented (registry kind)', state: 'Computed (carried = latest keyframe 225 ticks old or more)' },
  ring: 'Design (interface state, not a claim about the battle)',
  agg: 'Computed (a count of placement records, never of men; arms present among the members)',
  chip: 'Modelled (posture and arm state are authored per keyframe); Unknown for the identity chip',
  gauge: 'Modelled (keyframe strength over reference strength, in quartiles)',
  tab: 'Design (the pill); its text is the unit designation (Documented) or its id (Unknown)',
  badge: 'Documented (circular of 21 March 1863; Union infantry only)',
  pin: 'Design (marks where the data places the unit; a tile moved off it is joined to the pin by a leader line)',
};

/** every symbol the vocabulary can say for one language (data-independent) */
export function vocabularySpecs() {
  const out = [];
  for (const side of SIDES) for (const arm of ARMS) for (const ech of ECHELONS) {
    const formation = arm === 'formation'; if (formation !== isFormationEch(ech)) continue;               // an arm needs a unit-level echelon, a formation needs a formation-level one
    if (!formation && (ech === 'brigade' || ech === 'division' || ech === 'corps' || ech === 'army')) continue;
    out.push({ side, arm, ech });
  }
  return out;
}

export function buildLanguageSprites(langId, T, needed, { all = false } = {}) {
  const lang = LANGUAGES[langId]; const specs = all ? vocabularySpecs() : needed.specs.map(({ side, arm, ech }) => ({ side, arm, ech }));
  const sprites = []; const sils = new Map(); let n = 0;
  for (const s of specs) for (const state of STATES) {
    const spec = { ...s, state }; const r = lang.base(spec, T, `${langId}${n++}`); const sil = lang.silhouette(spec, T).id;
    sprites.push({ key: baseKey(langId, spec), group: 'base', spec, sil, ...r }); if (!sils.has(sil)) sils.set(sil, spec);
  }
  for (const [sil, spec] of sils) for (const kind of ['select', 'hover']) sprites.push({ key: `${langId}/ring/${kind}/${sil}`, group: 'ring', sil, ...renderRing(kind, spec, lang, T, `${langId}r${n++}`) });
  const aggList = !all && needed.agg ? needed.agg.combos : SIDES.flatMap((side) => ARMSETS.flatMap((armset) => [2, 3].map((depth) => ({ side, armset, depth }))));
  for (const { side, armset, depth } of aggList) sprites.push({ key: `${langId}/agg/${side}/${armset}/${depth}`, group: 'agg', ...renderAgg({ side, armset, depth }, lang, T, `${langId}a${n++}`) });
  return sprites;
}

export function buildOverlaySprites(T, needed, { all = false } = {}) {
  const sprites = []; let n = 0;
  for (const c of CHIPS) sprites.push({ key: `chip/${c}`, group: 'chip', ...renderChip(c, T, `c${n++}`) });
  for (let g = 0; g <= 4; g++) sprites.push({ key: `gauge/${g}`, group: 'gauge', ...renderGauge(g, T, `g${n++}`) });
  for (const side of ['union', 'confederate', 'unknown']) sprites.push({ key: `pin/${side}`, group: 'pin', ...renderPin(side, T, `p${n++}`) });
  for (const tone of ['dark', 'light']) sprites.push({ key: `tab/${tone}`, group: 'tab', ...renderTab(tone, T, `t${n++}`) });
  const want = all ? Object.keys(BADGE_SHAPES).flatMap((c) => DIV_COLOURS.map((d) => `${c}/${d}`)) : Object.keys(needed.badges).sort();
  for (const k of want) { const [corps, div] = k.split('/'); sprites.push({ key: `badge/${corps}/${div}`, group: 'badge', ...renderBadge(corps, div, T, `b${n++}`) }); }
  return sprites;
}

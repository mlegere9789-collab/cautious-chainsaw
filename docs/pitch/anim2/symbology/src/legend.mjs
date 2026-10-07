// src/legend.mjs - the machine-readable legend: for each language, every channel value with the sentence a legend prints, its evidence label (Documented / Measured / Computed / Modelled / Contested / Unknown / Design) and the
// sprite key that draws it.  Because the legend is generated from the same specs as the atlas, it cannot say a symbol exists that the atlas does not hold (a test checks every key).
import { baseKey } from './common.mjs';
import { CHIPS, CHIP_TEXT, GAUGE_BINS } from './chips.mjs';
import { BADGE_SHAPES, BADGE_TEXT } from './overlays.mjs';

const WORDS = {
  nato: {
    side: { union: 'Union: blue rectangle frame (NATO "friend" shape)', confederate: 'Confederate: red-orange diamond frame (NATO "hostile" shape, used here only to say "the other army")', unknown: 'Side unknown: yellow quatrefoil frame (NATO "unknown" shape): the id prefix and the state code disagree (10 ids)' },
    arm: { infantry: 'Infantry: saltire X inside the frame (NATO)', cavalry: 'Cavalry: single diagonal (NATO reconnaissance / cavalry)', artillery: 'Artillery: filled circle (NATO field artillery)', horse_artillery: 'Horse artillery: filled circle over the cavalry diagonal (counter practice; NATO has no horse artillery symbol)', sharpshooter: 'Sharpshooters: saltire with a scope ring (invented here)', formation: 'Formation (brigade, division, corps): an inset outline and no arm, because the data gives a formation no arm' },
    ech: { battery: 'Battery: I above the frame', regiment: 'Regiment: III above the frame', battalion: 'Battalion: II above the frame', brigade: 'Brigade: X above the frame', division: 'Division: XX', corps: 'Corps: XXX', army: 'Army: XXXX' },
    state: 'Carried forward: a dotted ring and a calmer, greyer plate: the latest keyframe is a day or more old, so the position is carried, not a fresh report',
  },
  shield: {
    side: { union: 'Union: blue shield', confederate: 'Confederate: red-orange shield', unknown: 'Side unknown: gold shield with a dark pictogram: the id prefix and the state code disagree (10 ids)' },
    arm: { infantry: 'Infantry: double chevron', cavalry: 'Cavalry: horse head', artillery: 'Artillery: gun wheel', horse_artillery: 'Horse artillery: gun wheel over a diagonal', sharpshooter: 'Sharpshooters: target', formation: 'Formation (brigade, division, corps): three dots, composed of units; no arm, because the data gives a formation none' },
    ech: { battery: 'Battery: the base size, no mark', regiment: 'Regiment: the base size, no mark', battalion: 'Artillery battalion: II in the header band', brigade: 'Brigade: X in the header band, a larger shield', division: 'Division: XX, larger again', corps: 'Corps: XXX, larger again', army: 'Army: XXXX' },
    state: 'Carried forward: a dotted ring and a calmer, greyer shield: the latest keyframe is a day or more old, so the position is carried, not a fresh report',
  },
  minimal: {
    side: { union: 'Union: blue marker', confederate: 'Confederate: red-orange marker', unknown: 'Side unknown: gold marker: the id prefix and the state code disagree (10 ids)' },
    arm: { infantry: 'Infantry: circle', cavalry: 'Cavalry: triangle', artillery: 'Artillery: square', horse_artillery: 'Horse artillery: diamond', sharpshooter: 'Sharpshooters: circle with a centre dot', formation: 'Formation (brigade, division, corps): hexagon; no arm is claimed because the data gives a formation none' },
    ech: { battery: 'Battery: the base size', regiment: 'Regiment: the base size', battalion: 'Artillery battalion: slightly larger', brigade: 'Brigade: hexagon with one nested outline', division: 'Division: two nested outlines, larger', corps: 'Corps: three nested outlines, larger again', army: 'Army: four nested outlines' },
    state: 'Carried forward: a dotted ring and a calmer, greyer marker: the latest keyframe is a day or more old, so the position is carried, not a fresh report',
  },
};
const EVID = { side: 'Documented (order of battle); Contested for the 10 ids of unknown side', arm: 'Documented for regiments, batteries and battalions; none claimed for formations', ech: 'Documented (registry kind)', state: 'Computed', agg: 'Computed' };

export function legendFor(langId, { selectKey = null, has = () => true } = {}) {
  const W = WORDS[langId]; const rows = []; const pick = (...keys) => keys.find((k) => has(k)) || keys[0];
  for (const side of ['union', 'confederate', 'unknown']) rows.push({ channel: 'side', value: side, text: W.side[side], evidence: side === 'unknown' ? 'Contested' : 'Documented', sprite: baseKey(langId, { side, arm: 'infantry', ech: 'regiment', state: 'fresh' }) });
  for (const arm of ['infantry', 'cavalry', 'artillery', 'horse_artillery', 'sharpshooter']) rows.push({ channel: 'arm', value: arm, text: W.arm[arm], evidence: 'Documented', sprite: baseKey(langId, { side: 'union', arm, ech: arm === 'artillery' || arm === 'horse_artillery' ? 'battery' : 'regiment', state: 'fresh' }) });
  rows.push({ channel: 'arm', value: 'formation', text: W.arm.formation, evidence: 'Documented', sprite: baseKey(langId, { side: 'union', arm: 'formation', ech: 'brigade', state: 'fresh' }) });
  for (const ech of ['battery', 'regiment', 'battalion', 'brigade', 'division', 'corps']) rows.push({ channel: 'echelon', value: ech, text: W.ech[ech], evidence: 'Documented', sprite: pick(...['union', 'confederate'].map((side) => baseKey(langId, { side, arm: ech === 'brigade' || ech === 'division' || ech === 'corps' ? 'formation' : ech === 'battery' || ech === 'battalion' ? 'artillery' : 'infantry', ech, state: 'fresh' }))) });
  rows.push({ channel: 'state', value: 'carried', text: W.state, evidence: 'Computed', sprite: baseKey(langId, { side: 'union', arm: 'infantry', ech: 'regiment', state: 'carried' }) });
  rows.push({ channel: 'aggregate', value: 'agg', text: 'Aggregate mark: a stack of plates; the count is the number of placement records (never men), the row of glyphs the arms among them (I infantry, C cavalry, A artillery, F formation records); a split plate means both sides', evidence: 'Computed', sprite: `${langId}/agg/union/IA/3` });
  rows.push({ channel: 'selection', value: 'select', text: 'Selected: a light ring between two dark keylines (interface state)', evidence: 'Design', sprite: selectKey });
  for (const c of CHIPS) rows.push({ channel: c === 'idonly' ? 'identity' : 'posture', value: c, text: CHIP_TEXT[c].replace(/ \((Modelled|Unknown)\)$/, ''), evidence: c === 'idonly' ? 'Unknown' : 'Modelled', sprite: `chip/${c}` });
  for (let g = 0; g <= 4; g++) rows.push({ channel: 'strength', value: g, text: `Strength gauge ${g} of 4: keyframe strength ${GAUGE_BINS[g].text} (a placement value, not a casualty record)`, evidence: 'Modelled', sprite: `gauge/${g}` });
  for (const [c] of Object.entries(BADGE_SHAPES)) rows.push({ channel: 'corpsBadge', value: c, text: BADGE_TEXT[c] + '; colour = division (red first, white second, blue third)', evidence: 'Documented', sprite: `badge/${c}/red` });
  rows.push({ channel: 'displacement', value: 'pin', text: 'Pin and leader line: the tile was moved off its true position so that tiles do not overlap; the pin marks where the data places the unit (side-coloured), the line joins it to the tile', evidence: 'Computed', sprite: 'pin/union' });
  rows.push({ channel: 'label', value: 'tab', text: 'Label tab: the unit designation (or the id for the 95 units with no order-of-battle record)', evidence: 'Documented', sprite: 'tab/dark' });
  return rows;
}
export const EVIDENCE_LABELS = ['Documented', 'Measured', 'Computed', 'Modelled', 'Contested', 'Unknown', 'Design'];

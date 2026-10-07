// skins/semantics.mjs - THE HONEST CHANNEL LAYER shared by every skin.  A skin decides HOW a fact is drawn; this module decides WHICH facts exist, what each is called, and how
// well it is known (the site's evidence vocabulary: Documented / Measured / Computed / Modelled / Contested / Unknown).  Because the three pitched skins and the legend all read
// this one file, a skin cannot draw a channel the data does not support, and the legend cannot disagree with the drawing (04-benchmarks.md P10 and P12).
//
// Source of every rule below: docs/pitch/anim/03-data-fuel.md (the encodings table E01-E24 and section 5) and 06-layout.md (what is "vital").  In short:
//   side        Documented (order of battle / id prefix); the 10 ids whose state code contradicts the prefix are 'unknown' = Contested, never drawn as a side        (E01)
//   arm         Documented for regiments, batteries and battalions.  Brigades, divisions and corps have NO arm in the data (the loader defaults them to infantry unless the id
//               says ART/CAV), so they are drawn as FORMATIONS and make no arm claim                                                                                        (E02)
//   echelon     Documented (registry kind): regiment/battery 0, battalion 1, brigade 2, division 3, corps 4                                                                    (E03)
//   identity    the short code is derived from the id; a unit with no order-of-battle RECORD (u.inOob false) is flagged "id only" (Unknown)                                          (E06)
//   strength    Modelled: the CURRENT KEYFRAME's strength over the unit's reference strength.  A placement strength is not a casualty record (fact 5), so it is a state, not a number
//   fix age     Computed: ticks since the unit's latest keyframe.  Carried-forward tiles are not fresh reports; this is the single most important honesty channel               (E14)
//   in transit  Modelled: the tile is between two keyframes, so its position is an interpolation                                                                              (E13)
//   posture     Modelled (authored per keyframe, 28 duplicate keys disagree on it); drawn by mark, not by hue                                                                 (E11)
//   corps badge Documented for Union INFANTRY of the seven corps of the 21 March 1863 circular (and only where the order-of-battle chain documents the corps); division colour
//               red / white / blue for divisions 1 / 2 / 3.  NOT drawn for cavalry, artillery, any Confederate unit, or any unit whose parent chain is not documented        (E04)
//   corps name  Documented for Confederate units of the three corps (as TEXT, never an emblem: no source assigns Confederate badges)                                         (E05)
// NOT available to a skin, so never drawn: facing (the tile does not carry bearing, and bearing agrees with the real move 47 % of the time), speed, casualties, engaged glow
// (the shipped one is a 40-pixel screen heuristic), gun counts, weather, terrain shadows.
import { FONT_SPECS } from '../layout/text.mjs';

export const EVIDENCE = ['Documented', 'Measured', 'Computed', 'Modelled', 'Contested', 'Unknown'];
export const FONTS = FONT_SPECS;                     // every skin measures its text with the engine's own font table, so the zero-overlap guarantee holds (see kit.fitText)

/** registry kind -> echelon level drawn: 0 base (regiment, battery) .. 4 corps */
export const ECH_LEVEL = { regiment: 0, battery: 0, battalion: 1, brigade: 2, division: 3, corps: 4, army: 4 };
export const FORMATION_KINDS = new Set(['brigade', 'division', 'corps', 'army']);

export const POSTURE_OF = { 'Line of Battle': 'line', 'Charging Line': 'charge', 'Chaotic Retreat': 'retreat', 'Line of March': 'march', 'Skirmish Line': 'skirmish', Reserve: 'reserve', Bivouac: 'bivouac' };
export const ARMSTATE_OF = { 'Mounted Cavalry': 'mounted', 'Dismounted Cavalry': 'dismounted', 'Deployed Artillery': 'deployed', 'Limbered Artillery': 'limbered' };

/** Union corps badges documented by the circular of Headquarters, Army of the Potomac, 21 March 1863 (03-data-fuel.md section 5; read via civilwarnews.com, the OR scan itself was not opened) */
export const UNION_BADGE_OF = { I: 'sphere', II: 'trefoil', III: 'lozenge', V: 'maltese', VI: 'cross', XI: 'crescent', XII: 'star' };
export const BADGE_NAMES = { sphere: 'sphere', trefoil: 'trefoil', lozenge: 'lozenge', maltese: 'Maltese cross', cross: 'cross', crescent: 'crescent', star: 'star' };
export const DIV_COLOUR_OF = { 1: 'red', 2: 'white', 3: 'blue' };
const CSA_CORPS = new Set(['I', 'II', 'III']);

const corpsCache = new WeakMap();
const RE_BDE = /^[UC]-(XII|XI|X|IX|VIII|VII|VI|IV|V|III|II|I)-(\d)-\d+$/; const RE_DIV = /^[UC]-(XII|XI|X|IX|VIII|VII|VI|IV|V|III|II|I)-(\d)$/; const RE_CORPS = /^[UC]-(XII|XI|X|IX|VIII|VII|VI|IV|V|III|II|I)$/;
/** corps / division facts of a leaf unit, from its order-of-battle chain.  The registry's Union divisions hang directly under the army, so the corps (and the division number) are read from the
 *  brigade, division or corps ID of the chain: `U-II-2-1` is "First Brigade, Second Division, Second Corps" (03-data-fuel.md section 5; test/skins.test.mjs re-derives it from the designations).
 *  Pure and cached per unit. */
export function corpsFacts(u) {
  let r = corpsCache.get(u); if (r) return r;
  let roman = null; let div = null;
  for (const id of u.chain || []) {
    let m;
    if ((m = RE_BDE.exec(id)) || (m = RE_DIV.exec(id))) { if (!roman) roman = m[1]; if (div === null) div = +m[2]; }
    else if ((m = RE_CORPS.exec(id))) { if (!roman) roman = m[1]; }
  }
  const documented = !!(u.inOob && u.parentSource === 'oob');                 // the chain is the order of battle's, not an id-pattern guess
  const infantryLike = u.arm === 'infantry' || FORMATION_KINDS.has(u.kind);
  let badge = null; let csa = null;
  if (documented && roman) {
    if (u.side === 'union' && u.arm !== 'artillery' && u.arm !== 'cavalry' && infantryLike && UNION_BADGE_OF[roman]) badge = UNION_BADGE_OF[roman];
    if (u.side === 'confederate' && CSA_CORPS.has(roman)) csa = roman;
  }
  r = { roman, div, documented, badge, csa, divColour: badge && DIV_COLOUR_OF[div] ? DIV_COLOUR_OF[div] : null };
  corpsCache.set(u, r); return r;
}

const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Fix-age anchors (ticks since the unit's latest keyframe): below half a battle day (CARRIED_TICKS / 2 = 112.5) the look is the settled, inked one; between half a day and a whole day (225 ticks = 675 / 3) it blends, so nothing pops;
 *  from a whole day on it is the carried-forward look.  The 225 is the reference skin's own threshold; the blend start is this layer's choice (a design token, not a finding). */
export const CARRIED_TICKS = 225;

/** The view model of a display tile: every value a skin may draw, each a pure function of the tile.  `t` is a display tile (skins/contract.mjs). */
export function describe(t) {
  const agg = t.kind === 'agg'; const u = agg ? null : t.unit;
  const kind = agg ? t.nameKind : (u ? u.kind : 'regiment');
  const formation = !agg && FORMATION_KINDS.has(kind);
  const posture = !agg && t.disposition ? (POSTURE_OF[t.disposition] || null) : null;
  const armState = !agg && t.disposition ? (ARMSTATE_OF[t.disposition] || null) : null;
  const age = Math.max(0, t.ageMax ?? t.ageTicks ?? 0);
  const cf = !agg && u ? corpsFacts(u) : null;
  return {
    agg, n: t.n || 1, count: agg ? (t.badge || '×' + t.n) : null, scope: agg ? t.nameKind : null,
    side: t.side, sideEv: t.side === 'unknown' ? 'Contested' : t.side === 'mixed' ? 'Computed' : 'Documented',
    arm: formation ? 'formation' : t.arm, armState, armEv: agg ? 'Computed' : 'Documented',
    ech: agg ? 0 : (ECH_LEVEL[kind] ?? 0), kind,
    code: t.short, name: !agg && u ? (u.label || null) : null, idOnly: !agg && !!u && !u.inOob,
    ratio: Math.max(0, Math.min(1, t.ratio ?? 1)),
    posture, postureEv: 'Modelled',
    age, carried: ss(CARRIED_TICKS * 0.5, CARRIED_TICKS, age),
    moving: !!t.moving,
    badge: cf ? cf.badge : null, divColour: cf ? cf.divColour : null, csa: cf ? cf.csa : null,
    contested: t.side === 'unknown',
  };
}

// ---- the channel registry: what the LEGEND says -------------------------------------------------------------------------------------------------------------
// Each channel lists its values with the sentence the legend prints and the evidence label.  A skin declares which channels it draws (`channels: [...]`) and provides
// sample(channel, value, ...) that draws each value with its OWN drawing code; kit.legendOf() joins the two, so the legend cannot drift from the picture.
export const CHANNELS = {
  side: { title: 'Side', values: [
    { id: 'union', text: 'Union: blue fabric, notched (swallow-tailed) fly. From the order of battle, or the id prefix U- for ids it does not list', evidence: 'Documented' },
    { id: 'confederate', text: 'Confederate: red fabric, pointed fly. From the order of battle, or the id prefix C- for ids it does not list', evidence: 'Documented' },
    { id: 'unknown', text: 'Side not decided: gold fabric. The id prefix and the state code in the id disagree (10 ids); never drawn as a side', evidence: 'Contested' },
    { id: 'mixed', text: 'Both sides: a crowd mark whose fabric is split blue and red', evidence: 'Computed' } ] },
  arm: { title: 'Arm', values: [
    { id: 'infantry', text: 'Infantry: crossed muskets on the hoist band', evidence: 'Documented' }, { id: 'cavalry', text: 'Cavalry: a sabre', evidence: 'Documented' },
    { id: 'artillery', text: 'Artillery (battery or battalion): a gun on its wheel', evidence: 'Documented' },
    { id: 'mixed', text: 'A crowd of one side, several arms: the side word and a count', evidence: 'Computed' },
    { id: 'formation', text: 'Brigade, division or corps record: the data gives a formation no arm, so the band carries its echelon marks (X, XX, XXX) and no arm', evidence: 'Documented' } ] },
  armState: { title: 'Arm state', values: [
    { id: 'mounted', text: 'Mounted cavalry (keyframe posture)', evidence: 'Modelled' }, { id: 'dismounted', text: 'Dismounted cavalry (keyframe posture)', evidence: 'Modelled' },
    { id: 'deployed', text: 'Deployed artillery (keyframe posture)', evidence: 'Modelled' }, { id: 'limbered', text: 'Limbered artillery (keyframe posture)', evidence: 'Modelled' } ] },
  echelon: { title: 'Size of the mark', values: [
    { id: 1, text: 'Battalion: a taller banner with two bars on the hoist band (registry kind)', evidence: 'Documented' }, { id: 2, text: 'Brigade standard: larger, gilt-framed, one X (registry kind)', evidence: 'Documented' },
    { id: 3, text: 'Division standard: larger again, two X (registry kind)', evidence: 'Documented' }, { id: 4, text: 'Corps standard: the largest, three X (registry kind)', evidence: 'Documented' } ] },
  posture: { title: 'Posture', values: [
    { id: 'line', text: 'Line of Battle', evidence: 'Modelled' }, { id: 'charge', text: 'Charging Line', evidence: 'Modelled' }, { id: 'retreat', text: 'Chaotic Retreat', evidence: 'Modelled' },
    { id: 'march', text: 'Line of March', evidence: 'Modelled' }, { id: 'skirmish', text: 'Skirmish Line', evidence: 'Modelled' }, { id: 'reserve', text: 'Reserve', evidence: 'Modelled' },
    { id: 'bivouac', text: 'Bivouac', evidence: 'Modelled' } ] },
  strength: { title: 'Strength line', values: [
    { id: 1, text: "The gilt line along the lower edge: this keyframe's strength over the unit's reference strength (the larger of its registry strength and its largest keyframe strength); a full line is 100 %. A placement value, not a casualty record", evidence: 'Modelled' },
    { id: 0.4, text: 'A part-filled line (shown at 40 %)', evidence: 'Modelled' } ] },
  fix: { title: 'Last report', values: [
    { id: 'fresh', text: `Glossy fabric, bright keyline: the unit's latest keyframe is less than ${CARRIED_TICKS / 2} ticks old`, evidence: 'Computed' },
    { id: 'carried', text: `Matte, greyed fabric, quiet keyline: the latest keyframe is ${CARRIED_TICKS} ticks (a whole battle day) or more old, so the position is carried forward, not a fresh report; it fades in between`, evidence: 'Computed' } ] },
  transit: { title: 'In transit', values: [ { id: 'moving', text: 'The fly flutters while the battle plays: the unit is between two keyframes at different places, so the position is an interpolation', evidence: 'Modelled' } ] },
  idOnly: { title: 'Identity', values: [ { id: 'idOnly', text: 'A dotted rule under the code: no order-of-battle record for this id, the name comes from the id alone', evidence: 'Unknown' } ] },
  aggregate: { title: 'Crowd mark', values: [ { id: 'agg', text: 'A stack of banners with a gilt count: N placement records that cannot all stand on their true positions (records, never men). It names their formation or their side; "Both sides" when Union and Confederate records are in it, "Part contested" when one side shares it with records whose side is not decided', evidence: 'Computed' } ] },
  corpsBadge: { title: 'Corps badge', values: Object.entries(UNION_BADGE_OF).map(([r, b]) => ({ id: b, text: `${r} Corps: ${BADGE_NAMES[b]} (Union infantry only, where the order-of-battle chain documents the corps; circular of 21 March 1863)`, evidence: 'Documented' })) },
  divColour: { title: 'Division colour', values: [
    { id: 'red', text: 'Badge colour of a first division: red (circular of 21 March 1863)', evidence: 'Documented' }, { id: 'white', text: 'Badge colour of a second division: white', evidence: 'Documented' }, { id: 'blue', text: 'Badge colour of a third division: blue', evidence: 'Documented' } ] },
  corpsText: { title: 'Confederate corps', values: [ { id: 'csa', text: 'Roman numeral: the corps named in the order of battle (text only: no source assigns Confederate badges)', evidence: 'Documented' } ] },
  selection: { title: 'Selection', values: [ { id: 'selected', text: 'Gilt ring and the full name unfolded under the code: the selected unit keeps the highest placement priority (interface state, not a claim about the battle)', evidence: 'Design' } ] },
  pin: { title: 'True position', values: [ { id: 'pin', text: 'Peg and line: the true (hand-authored) position of a mark that had to stand aside', evidence: 'Modelled' } ] },
};
export const CHANNEL_IDS = Object.keys(CHANNELS);

// The artillery train of the Battle Theatre: every gun of a drawn battery that the stage does not already draw, plus the limbers, caissons, teams of horses, drivers, battery wagon and forge of
// every drawn battery. Pure data: no GPU, no clock of its own. `ArtilleryTrain.at(tMin, pose)` is a PURE FUNCTION of (time, the batteries' poses, the scenario choice, the plan), so scrubbing in any
// order gives the same lists (gate Q12); an entity of a battery exists only while the battery is on the field AND the time is not before the battery's earliest documented arrival (gate Q04):
// it arrives with the battery's march, never as a spawn.
//
// What is drawn and why (data/artillery-train.json carries every value with its tier and source; GOVERNANCE/horde/ws6-structures/proposed-register/ has the open items):
//  * guns: the stage draws the 124 pieces whose count the kit data STATES (src/world-from-units.mjs). This module draws the pieces of the other drawn batteries: the printed PDF default (Union six, Confederate
//    four; B.6.14.4/B.6.14.6) marked plausible-procedural, the four counts of the Official Records that the kit leaves as gaps (tier inferred), a joined kit entry's printed total divided evenly, and for a
//    battalion the number of batteries the kit lists times the Confederate fill. A unit with no basis for a count (Cutts's and Poague's battalions) gets none and says why. Policy `stated_only` draws no
//    extra gun (the 124 only); it is carried for the owner (Law cl.6) and is not the default.
//  * limber, caisson, teams: per the PDF Teams row (two six-horse teams per gun, three drivers riding the left horses) or, as the alternative reading, the printed manual's war establishment (two caissons
//    per gun). Both are carried (`caisson_rule`); the default is the PDF row as printed, PENDING OWNER.
//  * placement is in the battery's own frame (the frame of the stage's guns): limber 11.3 m behind the axle (documented 6 yd pole end + procedural lengths), caissons farther back (no rule: ART-FA-80),
//    wagon and forge in a rear park. The train is rigidly attached to the battery's block (the renderer has one slot layout per unit): no column on the road is modelled (ws6-EG-04).
//  * figures: drivers and the nine-man detachment of an EXTRA gun are men of the battery's own strength figure (one soldier per figure, no cap): `figures` per battery says how many the host must take
//    out of the block and whether the strength figure covers them. Horses are not soldiers and are extra.
//  * heading: the train re-faces over layout.train_turn_s (240 s) after the block turns (the stage turns a block in 25 s; a rigid 100 m train would sweep its outer vehicles at 30 m/s): gate Q05.
// Draw lists: Float32Array views, stride 8 = [x, z, heading, kind, battery (layer unit index), serial, flags, tier], valid until the next call of at() (copy to keep).
export const STRIDE = 8, KIND = { gun: 0, limber: 1, caisson: 2, wagon: 3, forge: 4, horse: 5, driver: 6 };
export const TIER_CODE = { documented: 0, inferred: 1, 'plausible-procedural': 2, 'open gap': 3 };
export const GUN_INTERVAL_M = 14;
const YD = 0.9144, tierCode = t => TIER_CODE[t] ?? 2, worse = (a, b) => (TIER_CODE[a] ?? 2) >= (TIER_CODE[b] ?? 2) ? a : b;
const CHOICES = { gun_policy: ['plausible_fill', 'stated_only'], caisson_rule: ['teams_row', 'war_establishment'] };

// ---- the plan: one record per drawn artillery leaf of the roster, from the roster, the kit gun table and data/artillery-train.json. Pure and deterministic.
export function planArtillery({ units, train, batteryGuns, arrivals = null }) {
  const arrOf = new Map((arrivals || []).map(a => [a.unit, a])), L = train.layout;
  const combined = new Map(); for (const c of batteryGuns.combined || []) for (const h of c.history || []) combined.set(h, c);
  const matched = new Map((batteryGuns.matched || []).map(m => [m.history, m]));
  const idx = new Map(units.map((u, i) => [u.id, i]));
  const out = [], gaps = [];
  units.forEach((u, i) => {
    if (u.arm !== 'artillery' || (u.children && u.children.length) || !u.drawn) return;
    const side = u.side, n = u.strength && u.strength.drawn || 0, fillN = side === 'union' ? train.gun_policies.plausible_fill.union_guns_per_battery : train.gun_policies.plausible_fill.confederate_guns_per_battery;
    const stated = u.guns && u.guns.status === 'drawn' ? u.guns.count : 0, m = matched.get(u.id), c = combined.get(u.id), bn = train.battalions[u.id], orc = train.or_counts[u.id];
    let fill = null;     // the count under the plausible_fill policy when the kit states none: { count, batteries, source, tier, basis, type_id }
    if (!stated) {
      if (orc && typeof orc === 'object') fill = { count: orc.count, batteries: 1, source: 'or_report', tier: train.or_counts.tier, basis: `Official Records, read by shard terrain-1, not re-verified here: ${orc.cite}`, type_id: orc.type_id };
      else if (c && c.total) {
        const members = (c.history || []).filter(h => idx.has(h) && units[idx.get(h)].drawn), k = members.length || 1, at = members.indexOf(u.id), share = Math.floor(c.total / k) + (at === 0 ? c.total % k : 0);
        fill = { count: share, batteries: 1, source: 'combined_entry_split', tier: 'plausible-procedural', basis: `the kit entry “${c.kit_name}” prints ${c.total} (${c.guns_printed}) for ${(c.history || []).length} roster batteries: the printed total is kept and divided evenly between the ${k} drawn ones`, type_id: (c.guns[0] || {}).type_id || null };
      } else if (bn) {
        if (bn.printed_total_guns) fill = { count: bn.printed_total_guns, batteries: bn.batteries, source: 'printed_total', tier: 'inferred', basis: bn.total_basis, type_id: null };
        else fill = { count: bn.batteries * fillN, batteries: bn.batteries, source: 'battalion_fill', tier: 'plausible-procedural', basis: `${bn.batteries} batteries listed by the kit for ${bn.formation} x ${fillN} guns (PDF default for ${side} batteries)`, type_id: null };
      } else if (u.level === 'artillery_battalion' || u.level === 'artillery_group' || u.level === 'artillery_brigade') {
        gaps.push({ unit: u.id, why: 'a battalion or group with no battery list in the kit data: the number of batteries is not in the repository, so no count is applied' });
      } else fill = { count: fillN, batteries: 1, source: 'pdf_default_fill', tier: 'plausible-procedural', basis: `PDF default for a ${side} battery (${fillN} guns), applied because the kit data states no count`, type_id: m && m.guns[0] ? m.guns[0].type_id : null };
    }
    const arr = arrOf.get(u.id);
    out.push({
      unit: i, id: u.id, name: u.name, side, kind: u.level === 'battery' ? 'battery' : 'battalion', strength: n, earliest: arr ? arr.earliest : null,
      stated, statedTier: stated ? u.guns.tier : null, statedType: stated ? ((u.guns.types || [])[0] || {}).type_id || null : null,
      fill, batteries: stated ? 1 : fill ? fill.batteries : 0, unresolved: !stated && !fill,
    });
  });
  return { batteries: out, gaps, layout: L };
}

// the pose of a battery from the stage, as a pure function of time (the stage's own reducer over the unit's events: no stage.apply is needed); h is the TRAIN heading, the block's heading eased over turnS.
// It uses three methods of the stage (_replay, _pos, _heading) and the unit's presence window; tests/structures-ws6.test.mjs pins them. A stage without them falls back to the block's last-applied pose.
const smooth = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
export function stagePoseAt(stage, ids, turnS = 240) {
  const o2 = [0, 0, 0], tw = Math.PI * 2, lerpA = (a, b, f) => { let d = (b - a) % tw; if (d > Math.PI) d -= tw; if (d < -Math.PI) d += tw; return a + d * f; };
  // the train heading is the block's heading target eased over turnS, event by event: a new heading starts from the heading the train has at that moment (continuous, never a jump)
  const trainHeading = (i, tSec) => {
    const tr = stage.track && stage.track[i]; let tgt = null, from = 0, t0 = 0;
    const val = t => (tgt == null ? 0 : lerpA(from, tgt, smooth((t - t0) / turnS)));
    if (tr) for (const e of tr) {
      if (e.t > tSec) break;
      if (e.type === 'enter') { tgt = null; continue; }
      if (e.type !== 'activity') continue;
      const nh = e.head != null ? e.head : (tgt != null ? tgt : 0);
      if (tgt == null) { tgt = nh; from = nh; t0 = e.t; } else if (nh !== tgt) { from = val(e.t); tgt = nh; t0 = e.t; }
    }
    return val(tSec);
  };
  return (i, o, tMin) => {
    if (typeof stage._replay !== 'function') { if (stage.present[i] !== 1) return false; o.x = stage.cx[i]; o.z = stage.cz[i]; o.h = stage.ch[i]; return true; }
    const tSec = tMin * 60, rec = stage._replay(i, tSec), p = stage.presence && stage.presence[ids[i]]; if (!rec || !p || tSec < p.from || (p.to != null && tSec > p.to)) return false;
    stage._pos(rec, tSec, o2); o.x = o2[0]; o.z = o2[1]; o.h = stage.track && stage.track[i] ? trainHeading(i, tSec) : (rec.head == null ? 0 : lerpA(rec.headFrom, rec.head, smooth((tSec - rec.actT) / turnS))); return true;
  };
}
const ahead = (n, G, crew) => Math.ceil(Math.max(0, n - G * crew) / 4) * 1.0 / 2 + 12;      // the stage's gun-line distance ahead of the battery's slot (world-from-units.mjs)

// ---- the train
export class ArtilleryTrain {
  constructor({ plan, train, units }) {
    this.plan = plan; this.train = train; this.units = units; this.L = train.layout; this.T = train.team;
    const maxG = plan.batteries.reduce((s, b) => s + Math.max(b.stated, b.fill ? b.fill.count : 0), 0), maxH = maxG * (2 * 18 + 2) + plan.batteries.length * 16 + 64, maxV = maxG * 3 + plan.batteries.length * 2 + 16;
    this.buf = { guns: new Float32Array(Math.max(1, maxG) * STRIDE), limbers: new Float32Array(maxV * STRIDE), caissons: new Float32Array(maxV * STRIDE), wagons: new Float32Array(Math.max(1, plan.batteries.length * 2) * STRIDE), horses: new Float32Array(maxH * STRIDE), drivers: new Float32Array(maxH * STRIDE) };
    this.choice = { gun_policy: train.scenario_defaults.gun_policy, caisson_rule: train.scenario_defaults.caisson_rule };
  }
  // the readings the viewer can choose (state.trainChoice); anything else falls back to the default, never to another reading silently
  resolve(choice) {
    const out = { ...this.choice }; for (const k of Object.keys(CHOICES)) if (choice && CHOICES[k].includes(choice[k])) out[k] = choice[k]; return out;
  }
  // the composition of one battery under a reading: pure, no time
  compose(b, choice) {
    const ch = this.resolve(choice), rule = this.train.rules[ch.caisson_rule], crew = this.L.crew_per_gun;
    const guns = ch.gun_policy === 'stated_only' ? b.stated : (b.stated || (b.fill ? b.fill.count : 0)), extra = b.stated ? 0 : guns;
    const gunTeams = guns, caissonTeams = guns * rule.caissons_per_gun, wagonTeams = guns ? 2 : 0, teams = gunTeams + caissonTeams + wagonTeams;
    const driversNeeded = teams * this.T.drivers, crewNeeded = extra * crew, statedCrew = b.stated ? b.stated * crew : 0, avail = b.strength;
    const crewDrawn = Math.min(crewNeeded, Math.max(0, avail - statedCrew)), driversDrawn = Math.min(driversNeeded, Math.max(0, avail - statedCrew - crewDrawn));
    return { ...ch, guns, statedByStage: b.stated, extra, limbers: guns, caissons: guns * rule.caissons_per_gun, wagon: guns ? 1 : 0, forge: guns ? 1 : 0, teams, horses: teams * this.T.horses, driversNeeded,
      figures: { stageCrew: statedCrew, extraCrewNeeded: crewNeeded, extraCrewDrawn: crewDrawn, driversNeeded, driversDrawn, available: avail, covered: statedCrew + crewNeeded + driversNeeded <= avail } };
  }
  // the totals under a reading, per side, against the printed inventory (a total check, never a target)
  totals(choice) {
    const t = { union: { guns: 0, stated: 0, extra: 0, batteries: 0, units: 0, limbers: 0, caissons: 0, horses: 0, drivers: 0, byBasis: {} }, confederate: { guns: 0, stated: 0, extra: 0, batteries: 0, units: 0, limbers: 0, caissons: 0, horses: 0, drivers: 0, byBasis: {} } };
    for (const b of this.plan.batteries) { const c = this.compose(b, choice), s = t[b.side]; if (!c.guns) continue; s.units++; s.batteries += b.batteries; s.guns += c.guns; s.stated += c.statedByStage; s.extra += c.extra; s.limbers += c.limbers; s.caissons += c.caissons; s.horses += c.horses; s.drivers += c.figures.driversDrawn; const k = b.stated ? 'stated' : b.fill.source; s.byBasis[k] = (s.byBasis[k] || 0) + c.guns; }
    const inv = this.train.inventory_total_check; t.union.inventory = inv.union; t.confederate.inventory = inv.confederate; return t;
  }
  describe(unitIdx, choice) {
    const b = this.plan.batteries.find(x => x.unit === unitIdx); if (!b) return null; const c = this.compose(b, choice);
    return { id: b.id, name: b.name, composition: c, count: { total: c.guns, tier: b.stated ? b.statedTier : b.fill ? b.fill.tier : 'open gap', source: b.stated ? 'kit data (stated)' : b.fill ? b.fill.source : 'none', basis: b.stated ? `stated in the kit data (data/battery-guns.json)` : b.fill ? b.fill.basis : 'no basis for a count in the repository: open gap' }, earliest: b.earliest };
  }
  // pose(i, out, tMin) -> true when the battery is on the field at tMin, filling out = {x, z, h} in the renderer's frame (h as the stage's heading: x = cx + dx cos h + dz sin h, z = cz - dx sin h + dz cos h); see stagePoseAt.
  at(tMin, pose, choice = null) {
    const ch = this.resolve(choice), rule = this.train.rules[ch.caisson_rule], L = this.L, Tm = this.T, o = { x: 0, z: 0, h: 0 }, B = this.buf, n = { guns: 0, limbers: 0, caissons: 0, wagons: 0, horses: 0, drivers: 0, present: 0 };
    const put = (list, x, z, h, kind, unit, serial, flags, tier) => { const a = B[list], k = n[list] * STRIDE; a[k] = x; a[k + 1] = z; a[k + 2] = h; a[k + 3] = kind; a[k + 4] = unit; a[k + 5] = serial; a[k + 6] = flags; a[k + 7] = tier; n[list]++; };
    for (const b of this.plan.batteries) {
      if (b.earliest == null || tMin < b.earliest) continue;                  // the arrival rule: nothing of a battery exists before its earliest documented arrival (Q04)
      const c = this.compose(b, ch); if (!c.guns) continue;
      if (!pose(b.unit, o, tMin)) continue; n.present++;
      const cs = Math.cos(o.h), sn = Math.sin(o.h), place = (dx, dz) => [o.x + dx * cs + dz * sn, o.z - dx * sn + dz * cs], rear = o.h + Math.PI;
      const dzGun = ahead(b.strength, c.guns, L.crew_per_gun), rows = b.kind === 'battalion' ? L.guns_per_row_battalion : c.guns, perRowW = Math.min(rows, c.guns) * L.gun_interval_m + L.battalion_gap_m, nRows = Math.ceil(c.guns / rows);
      const countTier = b.stated ? (b.statedTier || 'inferred') : (b.fill ? b.fill.tier : 'plausible-procedural');
      const gunTier = tierCode(countTier), limberTier = tierCode(worse(countTier, L.limber_back_tier)), vehTier = tierCode(worse(countTier, 'plausible-procedural'));
      let serial = 0;
      for (let g = 0; g < c.guns; g++, serial++) {
        const row = Math.floor(g / rows), inRow = g % rows, inThis = Math.min(rows, c.guns - row * rows);
        const dx = b.kind === 'battalion' ? (inRow - (inThis - 1) / 2) * L.gun_interval_m + (row - (nRows - 1) / 2) * perRowW : (g - (c.guns - 1) / 2) * L.gun_interval_m;
        const g0 = place(dx, dzGun);
        if (!b.stated && c.extra) put('guns', g0[0], g0[1], o.h, KIND.gun, b.unit, serial, 0, gunTier);
        const lb = dzGun - L.limber_back_from_axle_m, lp = place(dx, lb);
        put('limbers', lp[0], lp[1], rear, KIND.limber, b.unit, serial, 0, limberTier);
        const addTeam = (zv, tier, serialV) => {          // six horses in three pairs behind the vehicle, the three left horses ridden
          for (let p = 0; p < Tm.pairs; p++) for (let s = 0; s < 2; s++) {
            const hx = dx + (s === 0 ? -1 : 1) * Tm.pair_halfwidth_m, hz = zv - Tm.wheelers_from_axle_m - p * Tm.pair_spacing_m, hp = place(hx, hz), left = s === 0;
            put('horses', hp[0], hp[1], rear, KIND.horse, b.unit, serialV * 6 + p * 2 + s, left ? 1 : 0, tier);
            if (left) put('drivers', hp[0], hp[1], rear, KIND.driver, b.unit, serialV * 3 + p, 0, tier);
          }
        };
        addTeam(lb, limberTier, serial * 4);
        for (let k = 0; k < rule.caissons_per_gun; k++) {
          const cz = dzGun - L.caisson_back_from_axle_m - k * L.second_caisson_extra_back_m, cp = place(dx, cz);
          put('caissons', cp[0], cp[1], rear, KIND.caisson, b.unit, serial * 2 + k, k, vehTier); addTeam(cz, vehTier, serial * 4 + 1 + k);
        }
      }
      for (let w = 0; w < 2; w++) {                                           // battery wagon (w = 0) and forge (w = 1) in the rear park, one six-horse team each
        const dx = (w === 0 ? -1 : 1) * L.rear_park_half_gap_m, wz = dzGun - L.rear_park_back_from_axle_m, wp = place(dx, wz);
        put('wagons', wp[0], wp[1], rear, w === 0 ? KIND.wagon : KIND.forge, b.unit, w, 0, vehTier);
        for (let p = 0; p < Tm.pairs; p++) for (let s = 0; s < 2; s++) {
          const hp = place(dx + (s === 0 ? -1 : 1) * Tm.pair_halfwidth_m, wz - Tm.wheelers_from_axle_m - p * Tm.pair_spacing_m), left = s === 0;
          put('horses', hp[0], hp[1], rear, KIND.horse, b.unit, 1000 + w * 6 + p * 2 + s, left ? 1 : 0, vehTier);
          if (left) put('drivers', hp[0], hp[1], rear, KIND.driver, b.unit, 1000 + w * 3 + p, 0, vehTier);
        }
      }
    }
    const view = k => B[k].subarray(0, n[k] * STRIDE);
    return { t: tMin, choice: ch, counts: n, guns: view('guns'), limbers: view('limbers'), caissons: view('caissons'), wagons: view('wagons'), horses: view('horses'), drivers: view('drivers'), stride: STRIDE };
  }
}

// a stable text hash of a draw list (rounded to millimetres), for the purity tests
export function hashLists(d) {
  let h = 0x811c9dc5 >>> 0; const mix = v => { h = Math.imul(h ^ (v | 0), 16777619) >>> 0; };
  for (const k of ['guns', 'limbers', 'caissons', 'wagons', 'horses', 'drivers']) { const a = d[k]; mix(a.length); for (let i = 0; i < a.length; i++) mix(Math.round(a[i] * 1000)); }
  return h.toString(16).padStart(8, '0');
}
export const pdYd = YD;

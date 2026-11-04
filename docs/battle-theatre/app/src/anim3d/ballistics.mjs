// Flight time and impact for the `impact` event (FX request R-FX-1 in BT-EVENTS.md). Ranges are the PRINTED per-elevation ranges of drill/ordnance_tables.json (Gibbon 1860 appendix, Instruction for Field Artillery
// 1863 p. 43-44; the readings that the checker flags damaged are left out). Time of flight is NOT printed in any acquired text: it is derived as the flight time of the vacuum trajectory that reproduces the printed range
// at that elevation (v_eff^2 = R g / sin 2 theta, T = 2 v_eff sin theta / g). Air drag makes the real flight longer; the derived time is therefore a lower bound within roughly 10-20 percent: tier INFERRED (arithmetic on
// documented ranges), registered in ANIM3D-NOTES. The Bormann time fuze is cut to burst at the target (maximum 5.5 s, ORD-FUZE-FA); a burst earlier or later than the target by `fuzeErrorS` is the Confederate-fuze behaviour
// the plan documents for July 3 (carried as a scenario value, default 0).
const YD = 0.9144, G = 9.80665;
export const RANGE_TABLE_YD = { // elevation (degrees) -> range (yards), shot unless named
  napoleon_12pdr_m1857: { shot: [[0, 325], [1, 620], [2, 875], [3, 1200], [5, 1680]], shell: [[3.75, 1300]], case: [[3.75, 1130]], src: ['ORD-RNG-FA-LT12', 'ORD-RNG-GB-NEW12'] },
  '6pdr_field_gun': { shot: [[1, 675], [2, 870], [3, 1140], [4, 1250], [5, 1523]], src: ['ORD-RNG-FA-6', 'ORD-RNG-GB-6'] },
  '12pdr_howitzer': { shot: [[5, 1072]], src: ['ORD-RNG-GB-12HOW'] },
};
const GENERIC = 'napoleon_12pdr_m1857';
export function elevationForRange(rangeM, weaponId, round = 'shot') {
  const T = RANGE_TABLE_YD[weaponId] || RANGE_TABLE_YD[GENERIC], rows = (T[round] || T.shot).map(([e, y]) => [e, y * YD]);
  if (rangeM <= rows[0][1]) return rows[0][0]; for (let i = 1; i < rows.length; i++) if (rangeM <= rows[i][1]) { const [e0, r0] = rows[i - 1], [e1, r1] = rows[i]; return e0 + (e1 - e0) * (rangeM - r0) / (r1 - r0); }
  return NaN;                                    // beyond the printed table: no impact is invented
}
export function flightTimeS(rangeM, elevDeg) { const th = elevDeg * Math.PI / 180; if (!(th > 0) || !isFinite(th)) return NaN; const v2 = rangeM * G / Math.sin(2 * th); return 2 * Math.sqrt(v2) * Math.sin(th) / G; }
export const FUZE_MAX_S = 5.5;
// impact descriptor for one gun shot at a target point: returns null when the range is beyond the printed tables
export function gunImpact(weaponId, round, rangeM, fuzeErrorS = 0, out = {}) {
  const e = elevationForRange(rangeM, weaponId, round === 'canister' || round === 'double_canister' ? 'shot' : round === 'shell' ? 'shell' : round === 'case' ? 'case' : 'shot'); if (!isFinite(e)) return null;
  const T = flightTimeS(rangeM, e); if (!isFinite(T)) return null;
  out.elevDeg = e; out.flightS = T; out.kind = round === 'shell' ? 'shell_burst' : round === 'case' ? 'case_burst' : round === 'canister' || round === 'double_canister' ? 'canister' : 'solid_strike';
  out.fuze = round === 'shell' || round === 'case' ? 'time' : round === 'shot' ? 'none' : 'none'; out.fuzeS = out.fuze === 'time' ? Math.min(FUZE_MAX_S, Math.max(0, T + fuzeErrorS)) : 0; out.burstAtS = out.fuze === 'time' ? out.fuzeS : T; out.tier = 'inferred'; return out;
}

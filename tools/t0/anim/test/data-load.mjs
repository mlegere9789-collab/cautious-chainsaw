// data-load.mjs - the data of the app as the app loads it, for the node tests: the placement files of the three days in the app's own load order (the lists of the entry bundle: tF placements then nF density files per day),
// merged per tick exactly as the store's addPlacementsForDay does (rows in file order; a tick that already has rows is merged by unit id, the later row wins), and the order-of-battle files by name.
import fs from 'node:fs';
import path from 'node:path';
import { OOB_FILES } from '../src/host/dataset.mjs';

export const TF = {
  1: ['placements_day1_ticks1_50.json', 'placements_day1_ticks51_100.json', 'placements_day1_ticks101_225.json'],
  2: ['placements_day2_ticks226_300.json', 'placements_day2_ticks301_375.json', 'placements_day2_ticks376_450.json'],
  3: ['placements_day3_ticks451_520.json', 'placements_day3_ticks521_600.json', 'placements_day3_ticks601_675.json'],
};
export const NF = {
  1: ['density_day1_ticks1_50.json', 'density_day1_ticks51_100.json', 'density_day1_afternoon.json', 'density_artillery_positions.json', 'density_cavalry_detail.json', 'density_skirmishers.json', 'density_day1_lateafternoon.json', 'density_day1_seminary.json', 'density_day1_opening.json', 'density_day1_iverson.json', 'density_day1_railroadcut.json', 'density_day1_barlowsknoll.json', 'density_day1_ironbrigade.json'],
  2: ['density_day2_lrt.json', 'density_day2_wheatfield.json', 'density_day2_culpshill.json', 'density_day2_overnight.json', 'density_reserves.json', 'density_day2_morning.json', 'density_day2_afternoon.json', 'density_day2_bigelow.json', 'density_day2_culpshill_overnight.json', 'density_day2_cemhill.json', 'density_day2_wright.json', 'density_day2_kershaw.json', 'density_day2_15alabama.json', 'density_day2_devilsden.json'],
  3: ['density_day3_picketts_charge.json', 'density_day3_culpshill.json', 'density_day3_aftermath.json', 'density_day3_cannonade.json', 'density_day3_pettigrew.json', 'density_day3_retreat.json', 'density_day3_morning.json', 'density_day3_cavalry.json', 'density_day3_angle.json', 'density_day3_vermont.json', 'density_day3_hancock.json'],
};
// NOTE: the bundle loads day 1 first, then day 2 and day 3 lazily; rows are keyed per tick, so the cross-day order is irrelevant
// (a tick belongs to exactly one day) -- but the order inside one day matters for duplicate (unit, tick) rows.



/** @returns {{pbt: object, oob: (rel:string)=>object}} the store's placementsByTick of a tree (data/ folder) and a reader of its order-of-battle files */
export function loadData(distDir) {
  const dir = path.join(distDir, 'data'); const rd = (rel) => JSON.parse(fs.readFileSync(path.join(dir, rel), 'utf8'));
  const pbt = {};
  for (const day of [1, 2, 3]) {
    const rows = []; for (const f of [...TF[day], ...NF[day]]) { try { const d = rd(f); rows.push(...(Array.isArray(d) ? d : d.placements || [])); } catch { /* a missing file is the app's own failure case: skipped */ } }
    const P = {}; for (const z of rows) { (P[z.tick] || (P[z.tick] = [])).push(z); }
    for (const k of Object.keys(P)) { const cur = pbt[k]; if (!cur) { pbt[k] = P[k]; continue; } const seen = new Map(); cur.forEach((r) => seen.set(r.unit_id, r)); P[k].forEach((r) => seen.set(r.unit_id, r)); pbt[k] = [...seen.values()]; }
  }
  const cache = {}; const oob = (rel) => (cache[rel] ??= (() => { try { return rd(rel); } catch { return undefined; } })());
  return { pbt, oob, files: OOB_FILES.map((x) => x[1]) };
}

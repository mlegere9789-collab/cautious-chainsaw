// Loads placements exactly as the app does (tF[day] + nF[day] files per day, flatMap placements, group by tick).
import fs from 'node:fs';
import path from 'node:path';
export const REPO = 'C:/Users/mlege/gettysburg-map';
export function loadAll(dist = 'baseline/dist') {
  const D = path.join(REPO, dist, 'data');
  const tF = {
    1: ['placements_day1_ticks1_50.json', 'placements_day1_ticks51_100.json', 'placements_day1_ticks101_225.json'],
    2: ['placements_day2_ticks226_300.json', 'placements_day2_ticks301_375.json', 'placements_day2_ticks376_450.json'],
    3: ['placements_day3_ticks451_520.json', 'placements_day3_ticks521_600.json', 'placements_day3_ticks601_675.json'],
  };
  const nF = {
    1: ['density_day1_ticks1_50.json', 'density_day1_ticks51_100.json', 'density_day1_afternoon.json', 'density_artillery_positions.json', 'density_cavalry_detail.json', 'density_skirmishers.json', 'density_day1_lateafternoon.json', 'density_day1_seminary.json', 'density_day1_opening.json', 'density_day1_iverson.json', 'density_day1_railroadcut.json', 'density_day1_barlowsknoll.json', 'density_day1_ironbrigade.json'],
    2: ['density_day2_lrt.json', 'density_day2_wheatfield.json', 'density_day2_culpshill.json', 'density_day2_overnight.json', 'density_reserves.json', 'density_day2_morning.json', 'density_day2_afternoon.json', 'density_day2_bigelow.json', 'density_day2_culpshill_overnight.json', 'density_day2_cemhill.json', 'density_day2_wright.json', 'density_day2_kershaw.json', 'density_day2_15alabama.json', 'density_day2_devilsden.json'],
    3: ['density_day3_picketts_charge.json', 'density_day3_culpshill.json', 'density_day3_aftermath.json', 'density_day3_cannonade.json', 'density_day3_pettigrew.json', 'density_day3_retreat.json', 'density_day3_morning.json', 'density_day3_cavalry.json', 'density_day3_angle.json', 'density_day3_vermont.json', 'density_day3_hancock.json'],
  };
  const byTick = {}; const perFile = {}; let total = 0;
  for (const day of [1, 2, 3]) {
    const arr = [];
    for (const f of [...tF[day], ...nF[day]]) {
      let j; try { j = JSON.parse(fs.readFileSync(path.join(D, f), 'utf8')); } catch (e) { perFile[f] = { error: String(e) }; continue; }
      const pl = Array.isArray(j) ? j : Array.isArray(j.placements) ? j.placements : [];
      perFile[f] = { n: pl.length, day, kind: f.startsWith('placements') ? 'placements' : 'density' };
      for (const p of pl) arr.push({ ...p, _file: f });
    }
    // addPlacementsForDay: P[z.tick].push(z); later day-chunk overrides whole tick key (Object spread) - within a day all merged
    const P = {};
    for (const z of arr) (P[z.tick] ||= []).push(z);
    Object.assign(byTick, P); total += arr.length;
  }
  return { byTick, perFile, total };
}
if (process.argv[1] && process.argv[1].endsWith('load-data.mjs')) {
  const { byTick, perFile, total } = loadAll();
  const ticks = Object.keys(byTick).map(Number).sort((a, b) => a - b);
  console.log('records', total, 'ticks with data', ticks.length, 'first', ticks[0], 'last', ticks[ticks.length - 1]);
  console.log(JSON.stringify(perFile, null, 0).slice(0, 3000));
}

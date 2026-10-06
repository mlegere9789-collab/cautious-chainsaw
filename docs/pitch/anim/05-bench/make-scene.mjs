// Builds the benchmark scene from the REAL placement data of release/R1c/dist/data (the same 1,804 keyframes the app loads).
// Output (in memory, served as /scene.json by run.mjs): per unit its own keyframes {t, lng, lat, bearing, strength, disposition} plus side/type/label.
// Cloning (for the 570- and 900-tile stress scenes) is done in the page (page/lib.js) and is labelled as synthetic there.
import fs from 'node:fs';
import path from 'node:path';

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..', '..', '..');
const tF = { 1: ['placements_day1_ticks1_50.json', 'placements_day1_ticks51_100.json', 'placements_day1_ticks101_225.json'], 2: ['placements_day2_ticks226_300.json', 'placements_day2_ticks301_375.json', 'placements_day2_ticks376_450.json'], 3: ['placements_day3_ticks451_520.json', 'placements_day3_ticks521_600.json', 'placements_day3_ticks601_675.json'] };
const nF = { 1: ['density_day1_ticks1_50.json', 'density_day1_ticks51_100.json', 'density_day1_afternoon.json', 'density_artillery_positions.json', 'density_cavalry_detail.json', 'density_skirmishers.json', 'density_day1_lateafternoon.json', 'density_day1_seminary.json', 'density_day1_opening.json', 'density_day1_iverson.json', 'density_day1_railroadcut.json', 'density_day1_barlowsknoll.json', 'density_day1_ironbrigade.json'], 2: ['density_day2_lrt.json', 'density_day2_wheatfield.json', 'density_day2_culpshill.json', 'density_day2_overnight.json', 'density_reserves.json', 'density_day2_morning.json', 'density_day2_afternoon.json', 'density_day2_bigelow.json', 'density_day2_culpshill_overnight.json', 'density_day2_cemhill.json', 'density_day2_wright.json', 'density_day2_kershaw.json', 'density_day2_15alabama.json', 'density_day2_devilsden.json'], 3: ['density_day3_picketts_charge.json', 'density_day3_culpshill.json', 'density_day3_aftermath.json', 'density_day3_cannonade.json', 'density_day3_pettigrew.json', 'density_day3_retreat.json', 'density_day3_morning.json', 'density_day3_cavalry.json', 'density_day3_angle.json', 'density_day3_vermont.json', 'density_day3_hancock.json'] };

// same designation rule as the app's cx()
const label = (id) => { const x = (id || '').replace(/^[UC]-/, ''); const m = x.match(/^(\d+)([A-Z]{2,})$/); return m ? m[1] + ' ' + m[2] : x.includes('-') ? x.replace(/-/g, '/').slice(0, 10) : x.slice(0, 8); };
const DISP = ['Line of Battle', 'Charging Line', 'Skirmish Line', 'Chaotic Retreat', 'Line of March', 'Reserve', 'Bivouac', 'Deployed Artillery', 'Limbered Artillery', 'Mounted Cavalry', 'Dismounted Cavalry'];

export function buildScene(dist = 'release/R1c/dist') {
  const D = path.join(REPO, dist, 'data');
  const byTick = {};
  let records = 0;
  for (const day of [1, 2, 3]) {                                    // the app merges the ticks that occur in the files of several days (per unit, later wins): one list per tick, in load order
    for (const f of [...tF[day], ...nF[day]]) {
      const j = JSON.parse(fs.readFileSync(path.join(D, f), 'utf8'));
      for (const z of (Array.isArray(j) ? j : j.placements || [])) { (byTick[z.tick] ||= []).push(z); records++; }
    }
  }
  const units = new Map();
  for (const t of Object.keys(byTick).map(Number).sort((a, b) => a - b)) {
    const seen = new Map();
    for (const r of byTick[t]) seen.set(r.unit_id, r);          // last record per unit and tick wins (same as the app's carry-forward)
    for (const [id, r] of seen) {
      let u = units.get(id);
      if (!u) units.set(id, u = { id, side: id.startsWith('U-') ? 0 : 1, art: id.includes('ART'), cav: id.includes('CAV'), name: label(id), t: [], lng: [], lat: [], b: [], s: [], d: [] });
      if (r.disposition === 'Deployed Artillery' || r.disposition === 'Limbered Artillery') u.art = true;
      if (r.disposition === 'Mounted Cavalry' || r.disposition === 'Dismounted Cavalry') u.cav = true;
      u.t.push(t); u.lng.push(r.lng); u.lat.push(r.lat); u.b.push(r.bearing || 0); u.s.push(r.strength || 0); u.d.push(Math.max(0, DISP.indexOf(r.disposition)));
    }
  }
  const arr = [...units.values()].map((u) => ({ ...u, type: u.art ? 2 : u.cav ? 1 : 0 }));
  return { records, disp: DISP, units: arr };
}
if (process.argv[1] && process.argv[1].endsWith('make-scene.mjs')) {
  const s = buildScene();
  console.log('records', s.records, 'units', s.units.length, 'types', [0, 1, 2].map((k) => s.units.filter((u) => u.type === k).length), 'sides', [0, 1].map((k) => s.units.filter((u) => u.side === k).length));
}

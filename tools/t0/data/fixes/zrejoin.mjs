// DATA fixes: regiments that stay where their last recorded row put them while their brigade moves on (plan: tools/t0/data/rejoin-plan.json, made by tools/t0/data/rejoin.mjs).
// The shipped engine keeps a unit at its last state until it has a new row, so the 2nd Wisconsin would stand in Herbst Woods on July 2 and 3 and the Eleventh Corps
// regiments in the streets north of the town after their corps fell back to Cemetery Hill.  Each planned row puts the regiment with its brigade at one of the brigade's later
// rows (the regiment keeps its own last offset from the brigade, at most 150 m) and says so in its note: it is the regiment-level reading of what the brigade rows show,
// not a recorded position of the regiment.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makePos } from '../posutil.mjs';
export const kind = 'text';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const P = makePos('rejoin');
const PLAN = JSON.parse(fs.readFileSync(path.join(HERE, '..', 'rejoin-plan.json'), 'utf8'));
const OR1 = 'OR 27/1', OR2 = 'OR 27/2';
const SRC = `the brigade rows of data/placements_*.json and density_*.json at the same ticks; the sources put the regiments with their brigades after the fight: ${OR1} p.266 (Wadsworth: the First Division held a hill on the right of the cemetery on the 2d and 3d), p.696 (Howard: the Eleventh Corps was ordered back to the stronger position, Cemetery Hill), p.730 (Schurz), p.258 (Doubleday); ${OR2} p.317 (Lee), p.607 (Hill)`;
for (const r of PLAN) {
  P.addTo(r.unit, { tick: r.tick, lat: r.lat, lng: r.lng, disposition: r.disposition, bearing: 0, strength: r.strength, note: 'Shown with its brigade: no later position of this regiment is recorded' },
    'stale-position', `the unit stays where its last recorded row put it (tick ${r.tick} is a later row of its brigade ${r.parent})`, SRC, '-rejoin');
}
export default P.out;
export const zrejoinErrors = P.errors;
export const rejoinEffects = P.effects;
if (process.argv[1] && process.argv[1].endsWith('zrejoin.mjs')) { console.log('patches', P.out.length); for (const e of P.errors) console.log('ERROR', e); }

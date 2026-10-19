// Measures the 20 story stars of tools/t0/mon/stars-spec.mjs against a built tree (default: the stack R1c + CLOCK + DATA, give its dist directory):
//   the distance between the star and the linked unit as the animation draws it at the star's tick (the engine rule: the unit's last row at or before the tick),
//   the clock the corrected clock shows at that tick (tools/t0/clock/oracle.mjs, independent of the shipped module), the NPS marker nearest to the star,
//   and the difference between the star and its monument record (array _A) or OpenStreetMap node.
//   STARS_DIST=tmp/mon-stars/stack1/dist node tools/t0/mon/stars-measure.mjs [--write]      --write stores the gaps in tools/t0/mon/stars-gaps.json (read by build-mon.mjs)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SPEC } from './stars-spec.mjs';
import { stateAt, rows, m, _A } from './stars-audit.mjs';
import { makeOracle } from '../clock/oracle.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..');
const O = makeOracle();
const OSM = JSON.parse(fs.readFileSync(path.join(REPO, 'tools/t0/data/sources/osm-monuments.json'), 'utf8')).elements;
const osmById = new Map(OSM.map((e) => [e.id, e]));
export function measure() {
  return SPEC.map((s) => {
    const star = { lat: s.lat, lng: s.lng };
    const st = stateAt(s.unit_id, s.tick), rr = rows(s.unit_id);
    let mon = null;
    if (s.geo.rec != null) { const a = _A[s.geo.rec]; mon = { src: `_A[${s.geo.rec}] ${a.name}`, dM: Math.round(m(star, { lat: a.lat, lng: a.lon })) }; }
    else { const e = osmById.get(s.geo.osm); mon = { src: `OSM node ${s.geo.osm} ${e.tags.name}`, dM: Math.round(m(star, { lat: (e.center || e).lat, lng: (e.center || e).lon })) }; }
    const near = OSM.map((e) => ({ n: e.tags.name, d: Math.round(m(star, { lat: (e.center || e).lat, lng: (e.center || e).lon })) })).sort((a, b) => a.d - b.d)[0];
    return { id: s.id, unit: s.unit_id, tick: s.tick, clock: O.fmt(s.tick, 'compat'), sigma: Math.round(O.uncertaintyMin(s.tick)), row: st ? st.tick : null, firstRow: rr[0] ? rr[0].tick : null,
      gapM: st ? Math.round(m(star, st)) : null, monument: mon, nearestOSM: near };
  });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = measure();
  for (const a of r) console.log(`${a.id.padEnd(15)} ${a.unit.padEnd(11)} tick ${String(a.tick).padStart(3)} ${a.clock.padEnd(28)} +-${a.sigma} min | row ${a.row} (first ${a.firstRow}) gap ${a.gapM} m | monument ${a.monument.src} ${a.monument.dM} m | nearest OSM ${a.nearestOSM.n} ${a.nearestOSM.d} m`);
  if (process.argv.includes('--write')) {
    const out = { measuredOn: 'R1c + CLOCK + DATA', gaps: Object.fromEntries(r.map((a) => [a.id, { gapM: a.gapM, row: a.row, clock: a.clock }])) };
    fs.writeFileSync(path.join(HERE, 'stars-gaps.json'), JSON.stringify(out, null, 1) + '\n');
    console.log('stars-gaps.json written');
  }
}

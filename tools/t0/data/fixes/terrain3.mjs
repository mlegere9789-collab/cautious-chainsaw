// DATA fixes: coordinates of four key locations of data/terrain.json that lie 1.0-3.0 km from the NPS sites they name (found by the position audit, AUDIT.md section 8):
//   Oak Hill 39.8339,-77.2361 is 1.7 km south of the Eternal Light Peace Memorial that stands on it (39.8484,-77.2435; also tour stop 2 of the Virtual Walkthrough, 39.84806,-77.24384),
//   Oak Ridge 39.83,-77.2406 is 1.4 km south of the stone wall where Baxter's headquarters marker and regiments stand (39.84278,-77.24243),
//   Barlow's Knoll 39.8356,-77.2283 is 1.0 km south of the Barlow statue (39.84544,-77.22641) and headquarters marker (39.84479,-77.22670),
//   East Cavalry Field 39.8317,-77.1972 is 3.0 km west of Custer's headquarters marker (39.82669,-77.16524) and Stuart's division marker (39.83499,-77.17024).
// The sites are NPS monuments as mapped in OpenStreetMap (ODbL), fetched 2026-10-19 by tmp/data-audit/pos/ and recorded in docs/data-audit/positions.json; the unit rows drawn around
// these points move with them (fixes/zpos.mjs, section D2).  Regex patches on the pretty-printed file (CRLF or LF).
export const kind = 'text';
const BS = String.fromCharCode(92);
const SRC = 'NPS monuments as mapped in OpenStreetMap (ODbL), fetched 2026-10-19; tour stops 2 and 3 of the Virtual Walkthrough (data in the entry bundle, d2)';
const num = (x) => String(x).replace('.', BS + '.');
const L = (id, loc, name, lat0, lng0, lat1, lng1, why) => ({
  id: 'DATA-terr-xy-' + id, target: 'data/terrain.json', regex: true, expect: 1, cls: 'wrong-place', before: `${name} at ${lat0}, ${lng0}: ${why}`, src: SRC,
  find: `("location_id": "${loc}",${BS}s+"name": "${name}",${BS}s+"lat": )${num(lat0)},(${BS}s+"lng": )${num(lng0)},`,
  repl: `${BS}g<1>${lat1},${BS}g<2>${lng1},`,
});
export default [
  L('oakridge', 'LOC-014', 'Oak Ridge', 39.83, -77.2406, 39.8428, -77.2424, "1.4 km south of Baxter's headquarters marker at the stone wall"),
  L('oakhill', 'LOC-015', 'Oak Hill', 39.8339, -77.2361, 39.8485, -77.2435, '1.7 km south of the Eternal Light Peace Memorial on Oak Hill'),
  L('barlows', 'LOC-016', "Barlow's Knoll", 39.8356, -77.2283, 39.8454, -77.2264, '1.0 km south of the Barlow statue'),
  L('ecf', 'LOC-021', 'East Cavalry Field', 39.8317, -77.1972, 39.8308, -77.1677, "3.0 km west of Custer's headquarters marker and Stuart's division marker"),
];

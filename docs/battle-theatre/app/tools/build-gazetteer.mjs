// Builds app/data/gazetteer.json from files of this repository ONLY. Read-only on every source. Run:  node docs/battle-theatre/app/tools/build-gazetteer.mjs
// Every entry records the files it came from; sigma_m comes from the feature size or the spread of the features that name the place (never a point claim).
// What is NOT done here: no coordinate is typed in by hand, none comes from memory, a web page or a map the repository does not hold.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath } from 'node:url';
import { norm, distM, nearestOnLine, sliceLine } from '../src/history/gazetteer.mjs';
const here = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(here, '../../../..'), REL = p => path.relative(ROOT, p).replace(/\\/g, '/');
const F = {
  roads: 'docs/basemap1863/features/roads-rail-water/roads.geojson', waterways: 'docs/basemap1863/features/roads-rail-water/waterways.geojson', water: 'docs/basemap1863/features/roads-rail-water/water_features.geojson',
  rails: 'docs/basemap1863/features/roads-rail-water/railways.geojson', struct: 'docs/basemap1863/features/structures/structures.geojson', book: 'docs/battle-theatre/app/data/site-bookmarks.json',
  woods: 'docs/basemap1863/features/landcover/woods_1863.geojson', open: 'docs/basemap1863/features/landcover/open_cleared_1863.geojson', field: 'docs/basemap1863/features/landcover/fields_documented_1863.geojson',
  boulder: 'docs/basemap1863/features/landcover/boulder_fields_1863.geojson', orch: 'docs/basemap1863/features/landcover/orchards_1863.geojson', wet: 'docs/basemap1863/features/landcover/marsh_wetland_1863.geojson',
  bridges: 'docs/basemap1863/features/roads-rail-water/bridges.geojson', gcph: 'docs/basemap1863/maps/gcps/hopkins_county.json',
};
const J = k => JSON.parse(fs.readFileSync(path.join(ROOT, F[k]), 'utf8'));
const hash = k => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, F[k]))).digest('hex').slice(0, 16);
const NOGEOM = [];
const D = Object.fromEntries(Object.keys(F).map(k => [k, J(k)]));
const R5 = x => Math.round(x * 1e5) / 1e5, LL = ([lng, lat]) => ({ lng: R5(lng), lat: R5(lat) });
const byId = (k) => new Map(D[k].features.map(f => [f.properties.id, f]));
const feat = { bridges: byId('bridges'), roads: byId('roads'), water: byId('water'), rails: byId('rails'), struct: byId('struct'), woods: byId('woods'), open: byId('open'), field: byId('field'), boulder: byId('boulder'), orch: byId('orch'), wet: byId('wet') };

// ---- geometry reductions -------------------------------------------------------------------------------------------------------------------
const rings = g => g.type === 'Polygon' ? [g.coordinates[0]] : g.type === 'MultiPolygon' ? g.coordinates.map(p => p[0]) : [];
const lines = g => g.type === 'LineString' ? [g.coordinates] : g.type === 'MultiLineString' ? g.coordinates : [];
function polyCentroid(ring) { let a = 0, cx = 0, cy = 0; for (let i = 0; i + 1 < ring.length; i++) { const [x0, y0] = ring[i], [x1, y1] = ring[i + 1], c = x0 * y1 - x1 * y0; a += c; cx += (x0 + x1) * c; cy += (y0 + y1) * c; } if (!a) { const n = ring.length; return [ring.reduce((s, p) => s + p[0], 0) / n, ring.reduce((s, p) => s + p[1], 0) / n]; } return [cx / (3 * a), cy / (3 * a)]; }
function ringAreaM2(ring) { let a = 0; const k = 111320 * Math.cos(39.81 * Math.PI / 180), m = 110574; for (let i = 0; i + 1 < ring.length; i++) a += (ring[i][0] * k) * (ring[i + 1][1] * m) - (ring[i + 1][0] * k) * (ring[i][1] * m); return Math.abs(a) / 2; }
// a feature -> { lng, lat, r_m } : its centre and a radius (polygon: radius of the circle of equal area; point: 0)
function reduce(f) {
  const g = f.geometry; if (!g) return null;
  if (g.type === 'Point') return { ...LL(g.coordinates), r_m: 0 };
  if (g.type === 'Polygon' || g.type === 'MultiPolygon') { const rs = rings(g); let A = 0, sx = 0, sy = 0; for (const r of rs) { const a = ringAreaM2(r), c = polyCentroid(r); A += a; sx += c[0] * a; sy += c[1] * a; } return { ...LL([sx / A, sy / A]), r_m: Math.round(Math.sqrt(A / Math.PI)) }; }
  const ls = lines(g).flat(); const n = ls.length; return { ...LL([ls.reduce((s, p) => s + p[0], 0) / n, ls.reduce((s, p) => s + p[1], 0) / n]), r_m: 0 };
}
const p90 = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(0.9 * s.length))] : 0; };

// ---- member collectors ----------------------------------------------------------------------------------------------------------------------
const tourBy = id => D.book.tour.find(t => t.id === id);
const monTags = m => m.loc.split(/,|;| at | near /).map(x => x.trim()).filter(Boolean);
function members({ tags = [], tours = [], lc = [], str = [], wf = [], rail = [], monName = [] }) {
  const out = [], seen = new Set();
  const nTags = tags.map(norm);
  for (const m of D.book.monuments) if (monTags(m).some(t => nTags.includes(norm(t)))) { out.push({ file: F.book, ref: `monument ${m.no} ${m.name} (loc: ${m.loc})`, name: m.name, lng: R5(m.lng), lat: R5(m.lat), r_m: 0 }); }
  for (const id of tours) { const t = tourBy(id); out.push({ file: F.book, ref: `tour stop ${id} ${t.name}`, name: t.name, lng: R5(t.lng), lat: R5(t.lat), r_m: 0 }); }
  const take = (key, ids, file) => { for (const id of ids) { const f = feat[key].get(id); if (!f) throw new Error('missing feature ' + id); const r = reduce(f); if (!r) { NOGEOM.push({ id, name: f.properties.name, file }); continue; } if (seen.has(id)) continue; seen.add(id); out.push({ file, ref: `${id} ${f.properties.name || ''}`.trim(), name: f.properties.name || id, ...r }); } };
  for (const id of lc) { const key = id.startsWith('LC-WOOD') ? 'woods' : id.startsWith('LC-OPEN') ? 'open' : id.startsWith('LC-FIELD') ? 'field' : id.startsWith('LC-BOULD') ? 'boulder' : id.startsWith('LC-ORCH') ? 'orch' : id.startsWith('LC-WET') ? 'wet' : null; take(key, [id], F[key]); }
  take('struct', str, F.struct); take('water', wf, F.water); take('rails', rail, F.rails);
  return out;
}

// ---- place table: what each name is made from. kind sets the sigma floor (a hill or ridge is hundreds of metres, a building tens). -------------
const FLOOR = { ridge: 350, hill: 250, knoll: 200, woods: 150, field: 150, orchard: 150, farm: 80, building: 40, spring: 50, area: 300, town: 350 };
const PLACES = [
  { name: 'McPherson Ridge', kind: 'ridge', tags: ['McPherson Ridge'], tours: [1] },
  { name: "Culp's Hill", kind: 'hill', tags: ["Culp's Hill", 'south of Culps Hill'], lc: ['LC-WOOD-0001'] },
  { name: 'Cemetery Hill', kind: 'hill', tags: ['Cemetery Hill'], str: ['STR-TOWN-GATEHOUSE'] },
  { name: 'Evergreen Cemetery gatehouse', kind: 'building', str: ['STR-TOWN-GATEHOUSE'], aliases: ['Evergreen gatehouse', 'the gatehouse'] },
  { name: 'East Cemetery Hill', kind: 'hill', tags: ['East Cemetery Hill'], tours: [14] },
  { name: 'Cemetery Ridge', kind: 'ridge', tags: ['Cemetery Ridge'] },
  { name: 'The Angle', kind: 'area', tags: ['The Angle', 'north of The Angle', 'south of The Angle'], tours: [15], aliases: ['High Water Mark'] },
  { name: "Ziegler's Grove", kind: 'woods', tags: ["Ziegler's Grove"] },
  { name: 'Little Round Top', kind: 'hill', tags: ['Little Round Top', 'North slope of Little Round Top'], tours: [8], lc: ['LC-OPEN-0001'] },
  { name: 'Big Round Top', kind: 'hill', tags: ['Big Round Top', 'north side of Big Round Top', 'Northwest slope of Big Round Top'], lc: ['LC-WOOD-0002'], aliases: ['Round Top'] },
  { name: "Devil's Den", kind: 'area', tags: ["Devil's Den", "above Devil's Den"], lc: ['LC-BOULD-0001'] },
  { name: "Houck's Ridge", kind: 'ridge', tags: ["Houck's Ridge", "Houck's Ridge above Devil's Den"] },
  { name: 'The Wheatfield', kind: 'field', tags: ['Wheatfield', 'the Wheatfield', 'Excelsior Field', 'Pardee Field'], tours: [9], lc: ['LC-FIELD-0001'], aliases: ['Wheatfield'] },
  { name: 'The Peach Orchard', kind: 'orchard', tags: ['Peach Orchard', 'the Peach Orchard'], tours: [10], lc: ['LC-ORCH-0206'], aliases: ['Peach Orchard'] },
  { name: "Pitzer's Woods", kind: 'woods', tags: ['Pitzer Woods'], tours: [6], aliases: ['Pitzer Woods'] },
  { name: "Biesecker's Woods", kind: 'woods', tags: ['Biesecker Woods'], aliases: ['Biesecker Woods'] },
  { name: 'Warfield Ridge', kind: 'ridge', tours: [7] },
  { name: "Spangler's Spring", kind: 'spring', wf: ['WF-001'], tours: [13] },
  { name: "Powers' Hill", kind: 'hill', tags: ["Powers' Hill"], aliases: ['Power Hill', "Power's Hill"] },
  { name: "Barlow's Knoll", kind: 'knoll', tags: ["Barlow's Knoll"] },
  { name: "Stevens' Knoll", kind: 'knoll', tags: ["Stevens' Knoll"] },
  { name: 'Oak Ridge', kind: 'ridge', tags: ['Oak Ridge'], tours: [3] },
  { name: 'Oak Hill', kind: 'hill', tags: ['Oak Hill'] },
  { name: 'Wolf Hill', kind: 'hill', tags: ['Wolf Hill'] },
  { name: 'East Cavalry Field', kind: 'area', tags: ['East Cavalry Field', 'East Cavalry Battlefield', 'South Cavalry Field'], aliases: ['ECF'] },
  { name: "Brinkerhoff's Ridge", kind: 'ridge', tags: ["Brinkerhoff's Ridge"], aliases: ['Brinkerhoff Ridge'] },
  { name: 'Herbst Woods', kind: 'woods', tags: ['Herbst Woods'], aliases: ["Herbst's Woods", 'McPherson Woods'] },
  { name: 'Leister house', kind: 'building', str: ['STR-LEISTER-HOUSE1'], aliases: ['Leister farm', 'Leister Farm', 'Lydia Leister house'] },
  { name: 'Trostle house', kind: 'building', str: ['STR-TROSTLE-HOUSE1'], aliases: ['Trostle farm', 'Trostle Farm'] },
  { name: 'Spangler farm', kind: 'farm', str: ['STR-SPANGLER_H-HOUSE1'], aliases: ['Henry Spangler farm', 'Spangler house'] },
  { name: 'Bliss farm', kind: 'farm', tags: ['Bliss Farm', 'Bliss Barn site'], str: ['STR-BLISS-HOUSE1', 'STR-BLISS-BARN1'] },
  { name: 'Codori farm', kind: 'farm', str: ['STR-CODORI-HOUSE1'], aliases: ['Codori house'] },
  { name: 'Sherfy farm', kind: 'farm', str: ['STR-SHERFY-HOUSE1'], aliases: ['Sherfy house'] },
  { name: 'Bryan farm', kind: 'farm', str: ['STR-BRYAN-HOUSE1', 'STR-BRYAN-BARN1'], aliases: ['Bryan house', 'Brien house', 'Brien farm', 'Bryan barn'] },
  { name: 'Black Horse Tavern', kind: 'building', str: ['STR-TOWN-BLACK_HORSE_TAVERN'] },
  { name: 'Thompson house', kind: 'building', str: ['STR-TOWN-THOMPSON_HOUSE'], aliases: ["Lee's headquarters"] },
  { name: 'Granite Schoolhouse', kind: 'building', str: ['STR-LOST-GRANITE_SCHOOLHOUSE'] },
  { name: 'Schmucker Hall', kind: 'building', str: ['STR-TOWN-SCHMUCKER_HALL'], aliases: ['Lutheran Theological Seminary', 'the Seminary', 'Seminary'] },
  { name: 'Railroad Cuts', kind: 'area', rail: ['RL-002'], aliases: ['railroad embankment', 'unfinished railroad', 'railroad cut'] },
];
const places = [];
let n = 0; const EMPTY = []; const gid = () => 'GZ-' + String(++n).padStart(3, '0');
for (const P of PLACES) {
  const all = members(P); if (!all.length) { console.warn('no members with coordinates for', P.name); EMPTY.push(P.name); continue; }
  // robust centre: members farther than max(600 m, 3 x the median distance) from the median point, beyond their own radius, are set aside and listed (data defects in the name-bearing records)
  const med = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  const c0 = { lng: med(all.map(x => x.lng)), lat: med(all.map(x => x.lat)) }, d0 = all.map(x => distM(x, c0)), thr = all.length >= 5 ? Math.max(600, 3 * med(d0)) : Infinity;
  const m = all.filter((x, i) => d0[i] - x.r_m <= thr), rejected = all.filter((x, i) => d0[i] - x.r_m > thr).map(x => ({ ref: x.ref, lng: x.lng, lat: x.lat, distance_m: Math.round(distM(x, c0)) }));
  if (rejected.length) console.warn(`  ${P.name}: ${rejected.length} outlying member(s) set aside:`, rejected.map(r => r.ref.slice(0, 50) + ' ' + r.distance_m + ' m').join('; '));
  const cx = m.reduce((s, x) => s + x.lng, 0) / m.length, cy = m.reduce((s, x) => s + x.lat, 0) / m.length, c = { lng: R5(cx), lat: R5(cy) };
  const spread = p90(m.map(x => distM(x, c) + x.r_m)), sigma = Math.round(Math.max(FLOOR[P.kind] ?? 300, spread));
  places.push({ id: gid(), name: P.name, aliases: P.aliases || [], kind: P.kind, resolution: m.length > 1 ? 'aggregate' : 'exact', tier: 'inferred', center: c, sigma_m: sigma, members: m, rejected_members: rejected,
    basis: m.length > 1 ? `centre of ${m.length} repository features that carry this name (monument location tags, tour stops, named landcover or structure records); sigma_m = max(${FLOOR[P.kind] ?? 300} m for a ${P.kind}, 90th percentile distance of the members from the centre plus their own radius)` : `the one repository feature that carries this name; sigma_m = ${FLOOR[P.kind] ?? 300} m for a ${P.kind} or the feature's own size`,
    note: 'Where the named place is, not where any unit stood. The monument records are modern memorial positions used only as name-bearing points.' });
}

// ---- roads (lines), waterways (union by name), the town ---------------------------------------------------------------------------------------
const ROAD_NAMES = {
  'RD-001': ['Baltimore Pike', 'Baltimore Turnpike'], 'RD-002': ['Chambersburg Pike', 'Chambersburg Road', 'Chambersburg Turnpike'], 'RD-003': ['Emmitsburg Road'], 'RD-004': ['Taneytown Road'], 'RD-005': ['Hanover Road'],
  'RD-006': ['York Pike', 'York Road', 'York Turnpike'], 'RD-007': ['Harrisburg Road'], 'RD-008': ['Carlisle Road'], 'RD-009': ['Mummasburg Road'], 'RD-010': ['Hagerstown Road'], 'RD-011': ["Hereter's Mill Road", 'Old Mill Road'],
  'RD-012': ["Herr's Ridge Road"], 'RD-013': ['Black Horse Tavern Road', 'Black Horse Tavern road'], 'RD-014': ['Wheatfield Road'], 'RD-015': ['Millerstown Road'], 'RD-016': ['Granite Schoolhouse Lane'], 'RD-018': ["McAllister's Mill road"],
  'RD-019': ['Willoughby Run Road'], 'RD-021': ['Table Rock Road'], 'RD-022': ['Hunterstown Road'], 'RD-023': ['Low Dutch Road'], 'RD-024': ['The Diamond'], 'RD-025': ['Boyds School Road'], 'RD-017': ['Blacksmith Shop Road'], 'RD-031': ['Slyder farm lane'], 'RD-032': ['Bushman farm lane'],
};
for (const [id, names] of Object.entries(ROAD_NAMES)) {
  const f = feat.roads.get(id); const ls = lines(f.geometry);
  // MultiLineString parts are joined in file order only when each part starts near where the last ended (within 40 m); otherwise the longest part is used and the rest are listed as gaps
  const parts = ls.map(l => l.map(LL)); let line = parts[0]; const dropped = [];
  for (let i = 1; i < parts.length; i++) { const d = distM(line[line.length - 1], parts[i][0]); if (d < 40) line = line.concat(parts[i]); else dropped.push(parts[i].length); }
  places.push({ id: gid(), name: names[0], aliases: names.slice(1), kind: 'line', resolution: 'exact', tier: 'inferred', center: line[Math.floor(line.length / 2)], line, sigma_m: Math.round((f.properties.positional_error_m ?? 40) + 20),
    members: [{ file: F.roads, ref: `${id} ${f.properties.name}`, name: f.properties.name, lng: line[0].lng, lat: line[0].lat, r_m: 0 }],
    basis: `road record ${id} (${f.properties.confidence}; positional_error_m ${f.properties.positional_error_m}); sigma_m = its positional error plus 20 m for the width of the way`, note: dropped.length ? `${dropped.length} separate part(s) of the record are not joined to the line (${dropped.join(', ')} vertices)` : '' });
}
// waterways of one name, joined into one set of lines (returned as the longest chain; not needed for entry points)
for (const nm of ['Plum Run', 'Rock Creek', 'Willoughby Run', 'Marsh Creek', 'White Run', 'Stevens Run', 'Littles Run']) {
  const fs_ = D.waterways.features.filter(f => f.properties.name === nm && f.geometry); const pts = fs_.flatMap(f => lines(f.geometry).flat()).map(LL); if (!pts.length) continue;
  const c = { lng: R5(pts.reduce((s, p) => s + p.lng, 0) / pts.length), lat: R5(pts.reduce((s, p) => s + p.lat, 0) / pts.length) };
  places.push({ id: gid(), name: nm, aliases: [], kind: 'area', stream: true, resolution: 'aggregate', tier: 'inferred', center: c, sigma_m: Math.round(Math.max(300, p90(pts.map(p => distM(p, c))))),
    members: fs_.map(f => ({ file: F.waterways, ref: `${f.properties.id} ${nm}`, name: nm, ...reduce(f) })),
    basis: `centre of the ${fs_.length} waterway record(s) named ${nm} (USGS NHD modern course, flagged modern in the file); a stream is a long feature, so sigma_m is the spread of its vertices`, note: 'modern stream course' });
}
// the town: centre and spread of the borough building mass polygons
{ const bm = D.struct.features.filter(f => f.properties.subtype === 'borough_building_mass' && f.geometry).map(reduce); const c = { lng: R5(bm.reduce((s, x) => s + x.lng, 0) / bm.length), lat: R5(bm.reduce((s, x) => s + x.lat, 0) / bm.length) };
  places.push({ id: gid(), name: 'Gettysburg (the borough)', aliases: ['the town', 'town', 'Gettysburg', 'the streets', 'town streets'], kind: 'town', resolution: 'aggregate', tier: 'inferred', center: c, sigma_m: Math.round(Math.max(FLOOR.town, p90(bm.map(x => distM(x, c) + x.r_m)))),
    members: [{ file: F.struct, ref: `${bm.length} features of subtype borough_building_mass`, name: 'borough building mass', lng: c.lng, lat: c.lat, r_m: 0 }], basis: `centre of the ${bm.length} borough building-mass polygons; sigma_m = 90th percentile distance plus polygon radius, at least ${FLOOR.town} m`, note: '' }); }
// Seminary Ridge: no feature of this name exists as a line. Two repository features that NAME themselves as on Seminary Ridge give a line between them; this is a proxy and says so.
{ const a = members({ lc: ['LC-WOOD-0067'] })[0], b = members({ lc: ['LC-ORCH-0029'] })[0];
  places.push({ id: gid(), name: 'Seminary Ridge', aliases: [], kind: 'ridge', resolution: 'proxy', tier: 'inferred', center: { lng: R5((a.lng + b.lng) / 2), lat: R5((a.lat + b.lat) / 2) }, line: [{ lng: a.lng, lat: a.lat }, { lng: b.lng, lat: b.lat }],
    sigma_m: Math.round(Math.max(FLOOR.ridge, distM(a, b) / 2 + a.r_m)), members: [a, b],
    basis: `proxy: the line between two repository features whose names place them on Seminary Ridge (${a.name}; ${b.name}); sigma_m covers half the length of that line plus the first feature's radius. The ridge crest itself is not mapped in the repository`, note: 'proxy; the name Seminary Ridge is not a mapped feature' });
  const r = feat.roads.get('RD-012'); const l = lines(r.geometry); const pts = l.flat().map(LL);
  places.push({ id: gid(), name: 'Herr Ridge', aliases: ["Herr's Ridge", 'Herrs Ridge'], kind: 'ridge', resolution: 'proxy', tier: 'inferred', center: pts[Math.floor(pts.length / 2)], line: pts, sigma_m: 400,
    members: [{ file: F.roads, ref: 'RD-012 Herr\'s Ridge Road', name: r.properties.name, lng: pts[0].lng, lat: pts[0].lat, r_m: 0 }],
    basis: "proxy: the road named for the ridge (Herr's Ridge Road, RD-012) stands for the ridge line; sigma_m 400 m. The ridge crest is not mapped in the repository", note: 'proxy; the road is named for the ridge, the file does not say it follows the crest' });
}
// ---- villages: the ten village centres of the Hopkins 1858 county map control points (maps/gcps/hopkins_county.json: ground E,N in EPSG:32618 from the USGS GNIS populated-place point; the map README gives
// their accuracy: dots read to about 200 m, GNIS points are not exact village centres, leave-one-out 376 m). Only the villages a ledger cell names are entered. sigma_m 500 m = 376 m plus a village's extent.
function utm18ToLL(E, N) {                                                                 // inverse transverse Mercator, WGS84, zone 18N (central meridian 75 W), Krueger series
  const a = 6378137, f = 1 / 298.257223563, k0 = 0.9996, n = f / (2 - f), A = a / (1 + n) * (1 + n * n / 4 + n ** 4 / 64);
  const b = [n / 2 - 2 * n ** 2 / 3 + 37 * n ** 3 / 96 - n ** 4 / 360, n ** 2 / 48 + n ** 3 / 15 - 437 * n ** 4 / 1440, 17 * n ** 3 / 480 - 37 * n ** 4 / 840, 4397 * n ** 4 / 161280];
  const d = [2 * n - 2 * n ** 2 / 3 - 2 * n ** 3, 7 * n ** 2 / 3 - 8 * n ** 3 / 5, 56 * n ** 3 / 15], xp = N / (k0 * A), ep = (E - 500000) / (k0 * A);
  let xi = xp, eta = ep; b.forEach((bj, i) => { const j = 2 * (i + 1); xi -= bj * Math.sin(j * xp) * Math.cosh(j * ep); eta -= bj * Math.cos(j * xp) * Math.sinh(j * ep); });
  const chi = Math.asin(Math.sin(xi) / Math.cosh(eta)), phi = chi + d[0] * Math.sin(2 * chi) + d[1] * Math.sin(4 * chi) + d[2] * Math.sin(6 * chi), lam = -75 * Math.PI / 180 + Math.atan2(Math.sinh(eta), Math.cos(xi));
  return { lng: R5(lam * 180 / Math.PI), lat: R5(phi * 180 / Math.PI) };
}
for (const nm of ['Cashtown', 'Hunterstown', 'Heidlersburg']) {
  const g = D.gcph.gcps.find(x => x.name === nm); if (!g) throw new Error('no control point for ' + nm); const c = utm18ToLL(g.en[0], g.en[1]);
  places.push({ id: gid(), name: nm, aliases: [], kind: 'town', resolution: 'exact', tier: 'inferred', center: c, sigma_m: 500,
    members: [{ file: F.gcph, ref: `gcp ${g.id} ${nm} (E ${g.en[0]}, N ${g.en[1]}, EPSG:32618)`, name: nm, lng: c.lng, lat: c.lat, r_m: 0 }],
    basis: `the Hopkins 1858 county map control point for ${nm} (${g.kind}; GNIS populated-place point, ground E,N in EPSG:32618) converted to WGS84; sigma_m 500 m = the 376 m leave-one-out of the ten village points plus the extent of a village`, note: 'a village centre, not a position of any unit; ' + g.note });
}
// a point a printed distance along a road from a mapped crossing: "Baltimore Pike, 1 mile east of Rock Creek" (us-cav-2d night cell). The bridge BR-002 (Baltimore Pike over Rock Creek) is the crossing; the road record RD-001
// runs from the east end of the road data (s = 0) toward the town, so east is toward smaller s. The printed '1 mile' is approximate: sigma_m 400 m (a quarter of the distance) covers it and the bridge/road errors.
{ const br = feat.bridges.get('BR-002'), pike = places.find(p => p.name === 'Baltimore Pike'), bp = LL(br.geometry.coordinates), nb = nearestOnLine(pike.line, bp), MILE = 1609.344;
  if (nb.d > 60) throw new Error('BR-002 is not on RD-001'); const pt = sliceLine(pike.line, nb.s - MILE, nb.s - MILE)[0], name = 'Baltimore Pike, 1 mile east of Rock Creek';
  places.push({ id: gid(), name, aliases: [], kind: 'derived', resolution: 'derived', tier: 'inferred', center: { lng: R5(pt.lng), lat: R5(pt.lat) }, sigma_m: 400,
    members: [{ file: F.bridges, ref: `BR-002 ${br.properties.name}`, name: br.properties.name, lng: bp.lng, lat: bp.lat, r_m: 0 }, { file: F.roads, ref: 'RD-001 Baltimore Pike', name: 'Baltimore Pike', lng: pike.line[0].lng, lat: pike.line[0].lat, r_m: 0 }],
    basis: `derived: ${MILE} m (the printed 1 mile) along the mapped Baltimore Pike (RD-001) to the east of the Rock Creek bridge BR-002; sigma_m 400 m because '1 mile' is approximate`, note: 'a computed point from two repository records and a printed distance' });
}
const files = {}; for (const k of Object.keys(F)) files[F[k]] = hash(k);
const out = { _doc: 'Named places with coordinates from repository files only (tools/build-gazetteer.mjs). resolution: exact = one feature carries the name; aggregate = centre of several name-bearing features; proxy = a related named feature stands for it. tier is inferred for every entry: no position here is a documented 1863 position of anything, it is where a name sits on the map. Never a point claim: sigma_m.',
  built_by: 'docs/battle-theatre/app/tools/build-gazetteer.mjs', sources: files, counts: { places: places.length, lines: places.filter(p => p.line).length }, no_coordinates_in_repository: { names: EMPTY, features_without_geometry: NOGEOM },
  ambiguous_names: { 'Fairfield Road': ['RD-010 Hagerstown Road (Fairfield Road of the ten-road list)', 'RD-015 Fairfield Road at the Peach Orchard (modern Millerstown Road)'] }, places };
const OUT = process.env.GAZ_OUT ? path.resolve(process.env.GAZ_OUT) : path.join(ROOT, 'docs/battle-theatre/app/data/gazetteer.json');       // GAZ_OUT lets a test rebuild to a scratch path and compare
fs.writeFileSync(OUT, JSON.stringify(out));
console.log('gazetteer:', places.length, 'places;', places.filter(p => p.resolution === 'proxy').length, 'proxies;', places.filter(p => p.line).length, 'with a line;', fs.statSync(OUT).size, 'bytes');
for (const p of places.filter(x => !x.line)) console.log(' ', p.id, p.name.padEnd(28), p.resolution.padEnd(9), p.members.length, 'members', 'sigma', p.sigma_m, 'at', p.center.lat, p.center.lng);

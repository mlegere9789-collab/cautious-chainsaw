// The places of the realization harness: the names a timeline row prints (a ridge, a road, a farm, a town) -> coordinates from the repository's own files, with the distance tolerance of each kind
// of place (tolerances.json "distance"). NOTHING IS GUESSED: a name that no repository file carries is listed as unknown; a name that two entries claim is listed as ambiguous; a place
// outside the loaded ground can be resolved but no unit can be drawn there (place_off_ground).
//
// Sources, in this order:
//   1. the product gazetteer (app/data/gazetteer.json, built by app/tools/build-gazetteer.mjs from the base-map layers): its names, aliases, centre, line and sigma_m are used as the file states them;
//   2. places this harness adds from the same base-map layers where the product gazetteer holds only a centre-and-spread (a stream: the waterway lines of waterways.geojson) or holds nothing
//      (a named farmstead of structures.geojson; a named wood, orchard or field of the landcover layers; a bridge; a lane; a railway), with sigma_m by the same rule as the product's builder.
// Every entry carries `source` (file and feature ids), `kind`, `shape` (point, line, footprint), `center`, `sigma_m` and `tolerance_m` (what a check may use).
import fs from 'node:fs'; import path from 'node:path';
import { ROOT, readJSON, rel, sha256File, round } from './lib.mjs';
import { norm, distM, nearestOnLine, M_LNG, M_LAT } from '../../../docs/battle-theatre/app/src/history/gazetteer.mjs';

export { norm, distM };
// the text a place name is searched in: abbreviations the table prints are spelled out ("Emmitsburg Rd" -> "Emmitsburg Road", "Baltimore St" -> "Baltimore Street"); nothing else is changed
export const expand = t => String(t ?? '').replace(/\bRd\b\.?/g, 'Road').replace(/\b([A-Z][a-z]+) St\b\.?(?!\s*[A-Z])/g, '$1 Street');
const BASE = path.join(ROOT, 'docs/basemap1863/features'), APPDATA = path.join(ROOT, 'docs/battle-theatre/app/data');
const TERRAIN = path.join(ROOT, 'docs/battle-theatre/render/prototype/data/terrain.json');
const R5 = x => Math.round(x * 1e5) / 1e5, LL = ([lng, lat]) => ({ lng: R5(lng), lat: R5(lat) });

// the loaded ground (render/prototype/data/terrain.json meta): a place outside it can be resolved, but nothing can be drawn there
export const groundBox = () => { const t = readJSON(TERRAIN); return { lng0: t.lng0, lng1: t.lng1, lat0: t.lat0, lat1: t.lat1 }; };
export const onGround = (p, box, padM = 0) => p.lng >= box.lng0 + padM / M_LNG && p.lng <= box.lng1 - padM / M_LNG && p.lat >= box.lat0 + padM / M_LAT && p.lat <= box.lat1 - padM / M_LAT;

const lineParts = g => g.type === 'LineString' ? [g.coordinates] : g.type === 'MultiLineString' ? g.coordinates : [];
const ringsOf = g => g.type === 'Polygon' ? [g.coordinates[0]] : g.type === 'MultiPolygon' ? g.coordinates.map(p => p[0]) : [];
const ringAreaM2 = ring => { let a = 0; const k = 111320 * Math.cos(39.81 * Math.PI / 180), m = 110574; for (let i = 0; i + 1 < ring.length; i++) a += (ring[i][0] * k) * (ring[i + 1][1] * m) - (ring[i + 1][0] * k) * (ring[i][1] * m); return Math.abs(a) / 2; };
function reduce(f) {                                   // a feature -> { lng, lat, r_m }: its centre and the radius of the circle of equal area (0 for a point)
  const g = f.geometry; if (!g) return null;
  if (g.type === 'Point') return { ...LL(g.coordinates), r_m: 0 };
  if (g.type === 'Polygon' || g.type === 'MultiPolygon') { let A = 0, sx = 0, sy = 0; for (const r of ringsOf(g)) { const a = ringAreaM2(r) || 1; const n = r.length - 1 || 1; let cx = 0, cy = 0; for (let i = 0; i < n; i++) { cx += r[i][0]; cy += r[i][1]; } A += a; sx += cx / n * a; sy += cy / n * a; } return { ...LL([sx / A, sy / A]), r_m: Math.round(Math.sqrt(A / Math.PI)) }; }
  const pts = lineParts(g).flat(); if (!pts.length) return null; return { ...LL([pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length]), r_m: 0 };
}
const p90 = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(0.9 * s.length))] : 0; };
const slug = s => norm(s).replace(/ /g, '-').slice(0, 48);

// read a geojson if it exists; a missing file is recorded in `missing` (never silently skipped)
function readFeatures(rp, missing) { const p = path.join(ROOT, rp); if (!fs.existsSync(p)) { missing.push(rp); return []; } return readJSON(p).features || []; }

export function buildPlaces({ tolerances }) {
  const FLOOR = tolerances.distance.floor_m_by_kind, EXTRA = tolerances.distance.line_extra_m, DEFERR = tolerances.distance.default_positional_error_m;
  const missing = [], places = [], sources = {}, skipped = [];
  const addSource = rp => { const p = path.join(ROOT, rp); if (fs.existsSync(p)) sources[rp] = sha256File(p).slice(0, 16); };
  // ---- 1. the product gazetteer
  const gzPath = path.join(APPDATA, 'gazetteer.json'), gz = readJSON(gzPath); sources[rel(gzPath)] = sha256File(gzPath).slice(0, 16);
  for (const p of gz.places) {
    const line = p.line && p.line.length > 1 ? [p.line.map(q => ({ lng: q.lng, lat: q.lat }))] : null;
    places.push({ id: p.id, name: p.name, aliases: p.aliases || [], kind: p.kind, shape: line ? 'line' : 'point', center: { lng: p.center.lng, lat: p.center.lat }, lines: line, sigma_m: p.sigma_m, resolution: p.resolution, stream: !!p.stream, source: 'app/data/gazetteer.json', ref: p.id, tier: p.tier || 'inferred', basis: p.basis || null });
  }
  const have = new Set(); for (const p of places) for (const n of [p.name, ...p.aliases]) have.add(norm(n));
  // ---- 2a. streams: the waterway lines of the base map replace the centre-and-spread of a stream (a stream's sigma of kilometres is a spread, not a tolerance)
  const WATER = 'docs/basemap1863/features/roads-rail-water/waterways.geojson'; addSource(WATER);
  const byStream = new Map();
  for (const f of readFeatures(WATER, missing)) { const n = f.properties.name; if (!n || /^unnamed/i.test(n) || !f.geometry) continue; (byStream.get(n) || byStream.set(n, []).get(n)).push(f); }
  for (const [name, fs_] of byStream) {
    const lines = fs_.flatMap(f => lineParts(f.geometry)).map(l => l.map(LL)), all = lines.flat(), c = { lng: R5(all.reduce((s, p) => s + p.lng, 0) / all.length), lat: R5(all.reduce((s, p) => s + p.lat, 0) / all.length) };
    const err = Math.max(...fs_.map(f => f.properties.positional_error_m ?? DEFERR)), old = places.find(p => norm(p.name) === norm(name));
    const ent = { id: 'RZ-WATER-' + slug(name), name, aliases: old ? old.aliases : [], kind: 'stream', shape: 'line', center: c, lines, sigma_m: Math.round(err + EXTRA), resolution: 'lines', stream: true, source: WATER, ref: fs_.map(f => f.properties.id).join(','), tier: 'inferred', basis: `the ${fs_.length} waterway line(s) named ${name} (USGS NHD modern course, flagged modern in the file); sigma_m = the positional error stated in the file plus ${EXTRA} m` };
    if (old) { old.superseded_by = ent.id; old.shape = 'superseded'; }
    places.push(ent);
  }
  // ---- 2b. named farmsteads of the structures layer that the product gazetteer does not carry
  const STR = 'docs/basemap1863/features/structures/structures.geojson'; addSource(STR);
  const farms = new Map();
  for (const f of readFeatures(STR, missing)) { const fn = f.properties.farm_name; if (!fn || !f.geometry) continue; (farms.get(fn) || farms.set(fn, []).get(fn)).push(f); }
  for (const [fn, fs_] of farms) {
    const mem = fs_.map(f => ({ f, r: reduce(f) })).filter(x => x.r); if (!mem.length) continue;
    const c = { lng: R5(mem.reduce((s, x) => s + x.r.lng, 0) / mem.length), lat: R5(mem.reduce((s, x) => s + x.r.lat, 0) / mem.length) }, d = mem.map(x => distM(c, x.r) + x.r.r_m);
    const owner = fn.replace(/\b(farmstead|farmsteads|farm|complex|tenant|farms|the)\b/gi, ' ').replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();       // "Henry Spangler farmstead" -> "Henry Spangler"
    const surname = (owner.split(/[\s/]+/).filter(Boolean).pop() || '').replace(/[^A-Za-z']/g, '');
    const simple = !/[:]| and |\/ [A-Z]/.test(owner) && /^[A-Z]/.test(surname);      // a farm name that is one owner (or two names joined by "/": the last one is the surname); "A and B tenant farms" and "Warfield / Snyder" get no short forms
    const names = [fn]; if (simple && owner && norm(owner) !== norm(fn)) names.push(owner + ' farm', owner + ' house');
    if (simple && surname.length > 2 && !/^(Adams|County|Almshouse)$/.test(surname)) names.push(surname + ' farm', surname + ' house', surname + "'s farm", surname + "'s house");
    if (names.some(n => have.has(norm(n)))) { skipped.push({ name: fn, why: 'a name of this farmstead is already a name of an entry of the product gazetteer; that entry is used' }); continue; }
    const first = names[0];
    const aliases = names.slice(1).filter(n => !have.has(norm(n)));
    const ent = { id: 'RZ-FARM-' + slug(fn), name: first, aliases, kind: 'farm', shape: 'footprint', center: c, lines: null, sigma_m: Math.round(Math.max(FLOOR.farm, p90(d))), resolution: 'aggregate', stream: false, source: STR, ref: fs_.map(f => f.properties.id).join(','), tier: 'inferred', basis: `centre of the ${mem.length} feature(s) with farm_name "${fn}"; sigma_m = 90th percentile distance plus feature radius, at least ${FLOOR.farm} m`, surname };
    places.push(ent); for (const n of [first, ...aliases]) have.add(norm(n));
  }
  // ---- 2c. named woods, orchards, fields, bridges, lanes, railways, water features (one entry per named feature; a name two features share is carried by both and so is ambiguous, never merged)
  const LC = [['docs/basemap1863/features/landcover/woods_1863.geojson', 'woods'], ['docs/basemap1863/features/landcover/orchards_1863.geojson', 'orchard'], ['docs/basemap1863/features/landcover/fields_documented_1863.geojson', 'field'], ['docs/basemap1863/features/landcover/open_cleared_1863.geojson', 'field'], ['docs/basemap1863/features/landcover/boulder_fields_1863.geojson', 'area'], ['docs/basemap1863/features/landcover/marsh_wetland_1863.geojson', 'area'], ['docs/basemap1863/features/roads-rail-water/bridges.geojson', 'bridge'], ['docs/basemap1863/features/roads-rail-water/water_features.geojson', 'spring'], ['docs/basemap1863/features/roads-rail-water/lanes.geojson', 'lane'], ['docs/basemap1863/features/roads-rail-water/railways.geojson', 'railway']];
  for (const [rp, kind] of LC) {
    addSource(rp);
    for (const f of readFeatures(rp, missing)) {
      const n = f.properties.name; if (!n || !f.geometry) continue; const r = reduce(f); if (!r) continue;
      if (have.has(norm(n))) { skipped.push({ name: n, why: 'the name is already a name of an entry of the product gazetteer (or of a farmstead); that entry is used', ref: f.properties.id }); continue; }
      const lines = f.geometry.type.includes('LineString') ? lineParts(f.geometry).map(l => l.map(LL)) : null, err = f.properties.positional_error_m ?? DEFERR;
      const k = kind === 'spring' && f.geometry.type !== 'Point' ? 'area' : kind;
      const sigma = lines ? Math.round(err + EXTRA) : Math.round(Math.max(FLOOR[k] ?? FLOOR.area, r.r_m));
      places.push({ id: 'RZ-' + f.properties.id, name: n, aliases: [], kind: k, shape: lines ? 'line' : r.r_m ? 'footprint' : 'point', center: { lng: r.lng, lat: r.lat }, lines, sigma_m: sigma, resolution: 'feature', stream: false, source: rp, ref: f.properties.id, tier: 'inferred', basis: `the base-map feature ${f.properties.id}; sigma_m = ${lines ? `positional error ${err} m plus ${EXTRA} m` : `at least the ${k} floor of ${FLOOR[k] ?? FLOOR.area} m and the feature radius ${r.r_m} m`}` });
    }
  }
  // ---- 2d. the named buildings of the structures layer (not the borough building masses, whose names are generated): kind building
  for (const f of readFeatures(STR, missing)) {
    const pr = f.properties, n = pr.name; if (!n || !f.geometry || pr.subtype === 'borough_building_mass') continue; const r = reduce(f); if (!r) continue;
    const aliases = []; for (const part of n.split(/[(),;]/).map(x => x.trim()).filter(x => x.length >= 8 && x !== n)) aliases.push(part);
    const key = norm(n); if (have.has(key)) { skipped.push({ name: n, why: 'name already carried', ref: pr.id }); continue; }
    const al = aliases.filter(a => !have.has(norm(a))); have.add(key); for (const a of al) have.add(norm(a));
    places.push({ id: 'RZ-' + pr.id, name: n, aliases: al, kind: 'building', shape: r.r_m ? 'footprint' : 'point', center: { lng: r.lng, lat: r.lat }, lines: null, sigma_m: Math.round(Math.max(FLOOR.building, r.r_m)), resolution: 'feature', stream: false, source: STR, ref: pr.id, tier: 'inferred', basis: `the structures-layer feature ${pr.id}; sigma_m = at least the building floor of ${FLOOR.building} m and the footprint radius ${r.r_m} m` });
  }
  const box = groundBox();
  for (const p of places) {
    p.tolerance_m = p.sigma_m; p.on_ground = onGround(p.center, box);
    if (p.shape === 'line' && p.lines) p.on_ground = p.lines.some(l => l.some(q => onGround(q, box)));
  }
  return { skipped, places: places.filter(p => p.shape !== 'superseded'), superseded: places.filter(p => p.shape === 'superseded').map(p => ({ id: p.id, name: p.name, by: p.superseded_by })), sources, missing, box };
}

// distance in metres from a point {lng,lat} to a place, by the stated measure of its shape (tolerances.json distance.measure)
export function measure(place, pt) {
  if (place.shape === 'line' && place.lines) { let best = Infinity; for (const l of place.lines) { const n = nearestOnLine(l, pt); if (n && n.d < best) best = n.d; } return best; }
  return distM(place.center, pt);
}

export class Places {
  constructor(opts) {
    this.tolerances = opts.tolerances; const b = buildPlaces(opts); this.list = b.places; this.superseded = b.superseded; this.skipped = b.skipped; this.sources = b.sources; this.missing = b.missing; this.box = b.box;
    this.byKey = new Map(); this.ambiguous = new Map(); this.byId = new Map(this.list.map(p => [p.id, p]));
    for (const p of this.list) for (const n of [p.name, ...p.aliases]) { const k = norm(n); if (!k) continue; const cur = this.byKey.get(k); if (cur && cur !== p) { (this.ambiguous.get(k) || this.ambiguous.set(k, new Set([cur])).get(k)).add(p); } else this.byKey.set(k, p); }
    for (const k of this.ambiguous.keys()) this.byKey.delete(k);                   // a name two entries claim is never resolved by guessing which
    // the names in text-search order: longest first, so that "East Cemetery Hill" is found before "Cemetery Hill"
    this.keys = [...this.byKey.keys()].filter(k => k.length >= 4).sort((a, b) => b.length - a.length || (a < b ? -1 : 1));
    this._rx = new Map();
  }
  tolerance(place) { return place.tolerance_m; }
  // -> { status: 'resolved'|'ambiguous'|'unknown', place, candidates }
  resolve(name) {
    if (this.byId.has(name)) return { status: 'resolved', place: this.byId.get(name) };
    const k = norm(name); if (this.byKey.has(k)) return { status: 'resolved', place: this.byKey.get(k) };
    if (this.ambiguous.has(k)) return { status: 'ambiguous', place: null, candidates: [...this.ambiguous.get(k)].map(p => p.id + ' ' + p.name) };
    return { status: 'unknown', place: null };
  }
  // every known place named in a text, longest names first, no overlaps: [{ key, place, index }]
  findIn(text) {
    const t = ' ' + norm(expand(text)) + ' ', out = [], used = [];
    for (const k of this.keys) {
      let rx = this._rx.get(k); if (!rx) this._rx.set(k, rx = new RegExp(' ' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:s|es)? ', 'g'));
      rx.lastIndex = 0; let m; while ((m = rx.exec(t))) { const a = m.index, b = m.index + m[0].length - 1; rx.lastIndex = b; if (used.some(([x, y]) => a < y && b > x)) continue; used.push([a, b]); out.push({ key: k, place: this.byKey.get(k), index: a }); }
    }
    return out.sort((a, b) => a.index - b.index);
  }
  distance(place, pt) { return measure(place, pt); }
  within(place, pt, tolM = null) { const tol = tolM == null ? place.tolerance_m : Math.min(tolM, place.tolerance_m); return { d: measure(place, pt), tol }; }
}

// capitalised phrases that look like a place (the product's own candidate pattern, app/tools/history-report.mjs): a candidate list, not a claim. A candidate that resolves is a place; one that does
// not is listed as unknown. The pattern can miss a name; it never invents one.
const PLACE_WORDS = '(?:Ridge|Hill|Hills|Road|Rd|Pike|Turnpike|Run|Creek|Woods|Wood|Farm|Field|House|Tavern|Knoll|Top|Den|Orchard|Cemetery|Spring|Station|Lane|Church|Barn|Gap|Bridge|Mill|Ford|Junction|Camp|Pass|Heights|Cuts|Valley|Grove|Seminary|Springs|Depot|Square|Embankment|Gatehouse|Furnace|Street|St|River|Mountain|Mountains)';
const CAP = "[A-Z][A-Za-z\\u2019'\\ufffd]+";
const RE_PHRASE = new RegExp(String.raw`\b(${CAP}(?:\s+(?:of|de)?\s*${CAP})*\s+${PLACE_WORDS})\b`, 'g');
export function candidatePhrases(text) {
  const out = new Set(); const t = String(text || '').replace(/�/g, '’'); let m; RE_PHRASE.lastIndex = 0;
  while ((m = RE_PHRASE.exec(t))) { const p = m[1].replace(/’s$/, '').trim(); if (p.length >= 5) out.add(p); }
  return [...out];
}
export const mToUnits = { M_LNG, M_LAT };
export { round };

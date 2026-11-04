// Builds app/data/structures3d.json (the geometry the Battle Theatre draws for fences, buildings, markers, roads and the railway, with its sources, error bounds
// and tiers) and app/data/structures3d-inventory.json (one decision for every record of structures/structures.json and every feature of the basemap1863 layers), and writes
// the tables of app/STRUCTURES-3D-NOTES.md. Nothing is invented here: a record without georeferenced geometry in the repository is listed as not drawn, and the reason is kept.
//   node docs/battle-theatre/app/tools/build-structures3d.mjs            write the files
//   node docs/battle-theatre/app/tools/build-structures3d.mjs --check    fail if the written files are stale
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath } from 'node:url';
import { nodeTerrain, BT } from './node-terrain.mjs';
import { Gazetteer } from '../src/history/gazetteer.mjs';
import { buildObjects } from '../src/history/objects.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), APP = path.resolve(here, '..'), ROOT = path.resolve(BT, '../..');
const BM = path.join(ROOT, 'docs/basemap1863/features'), STRUCT = path.join(BT, 'structures');
const rd = (...p) => JSON.parse(fs.readFileSync(path.join(...p), 'utf8'));
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const r6 = v => Math.round(v * 1e6) / 1e6;
const check = process.argv.includes('--check');

const INPUTS = {
  'structures/structures.json': path.join(STRUCT, 'structures.json'), 'structures/state_schedule.json': path.join(STRUCT, 'state_schedule.json'), 'structures/works_stages.json': path.join(STRUCT, 'works_stages.json'), 'structures/hospitals.json': path.join(STRUCT, 'hospitals.json'),
  'basemap1863/fences.geojson': path.join(BM, 'roads-rail-water/fences.geojson'), 'basemap1863/roads.geojson': path.join(BM, 'roads-rail-water/roads.geojson'), 'basemap1863/lanes.geojson': path.join(BM, 'roads-rail-water/lanes.geojson'),
  'basemap1863/railways.geojson': path.join(BM, 'roads-rail-water/railways.geojson'), 'basemap1863/bridges.geojson': path.join(BM, 'roads-rail-water/bridges.geojson'), 'basemap1863/structures.geojson': path.join(BM, 'structures/structures.geojson'),
  'basemap1863/lanes_inventory.json': path.join(BM, 'roads-rail-water/lanes_inventory.json'), 'basemap1863/railways_no_geometry.json': path.join(BM, 'roads-rail-water/railways_no_geometry.json'),
};

const T = await nodeTerrain();
const SJ = rd(INPUTS['structures/structures.json']), SCH = rd(INPUTS['structures/state_schedule.json']), WK = rd(INPUTS['structures/works_stages.json']), HOSP = rd(INPUTS['structures/hospitals.json']);
const FEN = rd(INPUTS['basemap1863/fences.geojson']).features, ROADS = rd(INPUTS['basemap1863/roads.geojson']).features, LANES = rd(INPUTS['basemap1863/lanes.geojson']).features,
  RAIL = rd(INPUTS['basemap1863/railways.geojson']).features, BRIDGES = rd(INPUTS['basemap1863/bridges.geojson']).features, STR = rd(INPUTS['basemap1863/structures.geojson']).features,
  LANE_INV = rd(INPUTS['basemap1863/lanes_inventory.json']), RAIL_NOGEO = rd(INPUTS['basemap1863/railways_no_geometry.json']);
const GAZ = new Gazetteer(rd(APP, 'data/gazetteer.json')), OB = buildObjects({ raw: { structures: SJ, works: WK }, gaz: GAZ }), OBBY = new Map(OB.list.map(o => [o.ref, o]));
const REC = new Map(SJ.structures.map(s => [s.id, s])), STRBY = new Map(STR.map(f => [f.properties.id, f]));
const xz = c => T.xz(c[0], c[1]), inGround = ([x, z]) => Math.abs(x) <= T.W / 2 && Math.abs(z) <= T.H / 2;

// ---- source table (deduplicated; every feature points at keys)
const SRC = {};
const srcKeys = p => (p.sources || []).map(s => { const k = s.key || s.src_key || s.cite.slice(0, 40); if (!SRC[k]) SRC[k] = { cite: s.cite, type: s.type || null, url: s.url || null }; return k; }).filter((k, i, a) => a.indexOf(k) === i);
const TIER_OF_CONF = { Documented: 'documented', Estimated: 'inferred', Contested: 'inferred', Unknown: 'open gap' };
const ORDER = ['documented', 'inferred', 'plausible-procedural', 'open gap'], weaker = (a, b) => ORDER[Math.max(ORDER.indexOf(a), ORDER.indexOf(b))];

// ---- geometry helpers (metres in the terrain frame)
const dseg = (px, pz, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz; let t = l2 ? ((px - a[0]) * dx + (pz - a[1]) * dz) / l2 : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(px - a[0] - t * dx, pz - a[1] - t * dz); };
const dpoly = (p, lines) => { let m = 1e9; for (const l of lines) for (let i = 0; i < l.length - 1; i++) m = Math.min(m, dseg(p[0], p[1], l[i], l[i + 1])); return m; };
const sample = (pts, step = 10) => { const out = []; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / step)); for (let k = 0; k < n; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); } out.push(pts.at(-1)); return out; };
const linesOf = g => (g.type === 'LineString' ? [g.coordinates] : g.coordinates);
const lengthM = l => { let s = 0; for (let i = 1; i < l.length; i++) s += Math.hypot(l[i][0] - l[i - 1][0], l[i][1] - l[i - 1][1]); return s; };

// ================================================================ crosswalk: structures.json building records -> basemap structure features
// Each entry is a name identity (the same farm or building named in both catalogues; STR ids carry the farm key). Parts are the `#part` ids of structures.json.
// Where a farm has parts, only the STR feature that is that part (house, barn) takes the part's state; the rest take the farm's.
const XW = {
  'bld-schmucker-hall': { all: ['STR-TOWN-SCHMUCKER_HALL'] }, 'bld-pennsylvania-hall': { all: ['STR-TOWN-PENN_HALL'] }, 'bld-courthouse': { all: ['STR-TOWN-COURTHOUSE'] }, 'bld-rr-station': { all: ['STR-TOWN-DEPOT'] },
  'bld-evergreen-gatehouse': { all: ['STR-TOWN-GATEHOUSE'] }, 'bld-wade-house': { all: ['STR-TOWN-WADE_HOUSE'] }, 'bld-presbyterian-church': { all: ['STR-TOWN-PRESBYTERIAN_CHURCH'] }, 'bld-thompson-house': { all: ['STR-TOWN-THOMPSON_HOUSE'] },
  'bld-mcpherson-farm': { all: ['STR-MCPHERSON-OUTBUILDING1'], parts: { barn: ['STR-MCPHERSON-BARN1'], house: ['STR-MCPHERSON-HOUSE1'] } },
  'bld-mcmillan-farm': { all: ['STR-MCMILLAN-HOUSE1', 'STR-MCMILLAN-BARN1', 'STR-MCMILLAN-OUTBUILDING1'] },
  'bld-codori-farm': { all: ['STR-CODORI-HOUSE1', 'STR-CODORI-OUTBUILDING1'], parts: { barn: ['STR-CODORI-BARN1'] } },
  'bld-klingle-farm': { all: ['STR-KLINGEL-HOUSE1', 'STR-KLINGEL-BAKE_OVEN1', 'STR-KLINGEL-OUTBUILDING1'] },
  'bld-rogers-house': { all: ['STR-ROGERS-HOUSE1', 'STR-ROGERS-OUTBUILDING1', 'STR-ROGERS-OUTBUILDING2'] },
  'bld-bliss-farm': { all: [], parts: { house: ['STR-BLISS-HOUSE1'], barn: ['STR-BLISS-BARN1'] } },
  'bld-sherfy-farm': { all: ['STR-SHERFY-OUTBUILDING1'], parts: { house: ['STR-SHERFY-HOUSE1'], barn: ['STR-SHERFY-BARN1'] } },
  'bld-wentz-farm': { all: ['STR-WENTZ-HOUSE1', 'STR-WENTZ-OUTBUILDING1', 'STR-WENTZ-OUTBUILDING2'] },
  'bld-trostle-farm': { all: ['STR-TROSTLE-SUMMER_KITCHEN1', 'STR-TROSTLE-HOG_PEN1'], parts: { house: ['STR-TROSTLE-HOUSE1'], barn: ['STR-TROSTLE-BARN1'] } },
  'bld-rose-farm': { all: ['STR-ROSE-SUMMER_KITCHEN1', 'STR-ROSE-OUTBUILDING1', 'STR-ROSE-OUTBUILDING2'], parts: { house: ['STR-ROSE-HOUSE1'], barn: ['STR-ROSE-BARN1'] } },
  'bld-bushman-farm': { all: [], parts: { house: ['STR-BUSHMAN-HOUSE1'], barn: ['STR-BUSHMAN-BARN1'] } },
  'bld-warfield-house': { all: ['STR-WARFIELD_SNYDER-HOUSE1', 'STR-WARFIELD_SNYDER-OUTBUILDING1', 'STR-WARFIELD_SNYDER-OUTBUILDING2', 'STR-WARFIELD_SNYDER-OUTBUILDING3'] },
  'bld-snyder-farm': { all: ['STR-WARFIELD_SNYDER-OUTBUILDING4', 'STR-WARFIELD_SNYDER-OUTBUILDING5'] },
  'bld-slyder-farm': { all: ['STR-SLYDER-SUMMER_KITCHEN1', 'STR-SLYDER-OUTBUILDING1', 'STR-SLYDER-BARN1'], parts: { house: ['STR-SLYDER-HOUSE1'] } },
  'bld-leister-house': { all: ['STR-LEISTER-HOUSE1', 'STR-LEISTER-BARN1'] },
  'bld-weikert-farm': { all: ['STR-GWEIKERT-HOUSE1', 'STR-GWEIKERT-BARN1', 'STR-GWEIKERT-SUMMER_KITCHEN1', 'STR-GWEIKERT-SPRING_HOUSE1'] },
  'bld-hummelbaugh-farm': { all: ['STR-HUMMELBAUGH-HOUSE1', 'STR-HUMMELBAUGH-OUTBUILDING1'] },
  'bld-brian-farm': { all: ['STR-BRYAN-HOUSE1', 'STR-BRYAN-BARN1'] },
  'bld-biggs-house': { all: ['STR-LOST-BIGGS_HOUSE'] }, 'bld-granite-schoolhouse': { all: ['STR-LOST-GRANITE_SCHOOLHOUSE'] },
  'bld-spangler-farm': { all: ['STR-SPANGLER_H-HOUSE1', 'STR-SPANGLER_H-OUTBUILDING1', 'STR-SPANGLER_H-OUTBUILDING2', 'STR-SPANGLER_H-OUTBUILDING3', 'STR-SPANGLER_H-OUTBUILDING4', 'STR-SPANGLER_H-OUTBUILDING5'], parts: { barn_forebay: ['STR-SPANGLER_H-BARN1'] } },
  'bld-henry-culp-farm': { all: ['STR-CULP-HOUSE1', 'STR-CULP-OUTBUILDING1', 'STR-CULP-OUTBUILDING2', 'STR-CULP-OUTBUILDING3', 'STR-CULP-OUTBUILDING4'] },
  'bld-poorhouse-christ-lutheran-wills': { all: ['STR-ALMSHOUSE-COMPLEX_BUILDING1', 'STR-ALMSHOUSE-COMPLEX_BUILDING2', 'STR-ALMSHOUSE-COMPLEX_BUILDING3', 'STR-ALMSHOUSE-COMPLEX_BUILDING4', 'STR-ALMSHOUSE-COMPLEX_BUILDING5', 'STR-ALMSHOUSE-COMPLEX_BUILDING6', 'STR-ALMSHOUSE-COMPLEX_BUILDING7', 'STR-ALMSHOUSE-COMPLEX_BUILDING8', 'STR-ALMSHOUSE-COMPLEX_BUILDING9'], parts: { poorhouse: [], christ_lutheran_church: ['STR-TOWN-CHRIST_LUTHERAN'] } },
};
// catalogue features of the basemap that no structures.json record names (kept as drawn objects with no schedule row)
const NO_RECORD_NOTE = 'named in the basemap catalogue only; structures.json has no record for it, so no state row applies';
const strToRec = new Map();   // STR id -> { rec, part }
for (const [rec, v] of Object.entries(XW)) { for (const id of v.all || []) strToRec.set(id, { rec, part: null }); for (const [pt, ids] of Object.entries(v.parts || {})) for (const id of ids) strToRec.set(id, { rec, part: pt }); }
for (const id of strToRec.keys()) if (!STRBY.has(id)) throw new Error('crosswalk names a feature the basemap does not have: ' + id);
for (const [rec, v] of Object.entries(XW)) { if (!REC.has(rec)) throw new Error('crosswalk record missing: ' + rec); const have = new Set((REC.get(rec).parts || []).map(p => p.id.split('#')[1])); for (const pt of Object.keys(v.parts || {})) if (!have.has(pt)) throw new Error(`${rec} has no part ${pt}`); }
// the farm-level surnames both catalogues share (a sanity check that the crosswalk is a name identity, not a guess)
const SUR = { 'bld-codori-farm': 'codori', 'bld-klingle-farm': 'kling', 'bld-rogers-house': 'rogers', 'bld-bliss-farm': 'bliss', 'bld-sherfy-farm': 'sherfy', 'bld-wentz-farm': 'wentz', 'bld-trostle-farm': 'trostle', 'bld-rose-farm': 'rose', 'bld-bushman-farm': 'bushman', 'bld-warfield-house': 'warfield', 'bld-snyder-farm': 'snyder', 'bld-slyder-farm': 'slyder', 'bld-leister-house': 'leister', 'bld-weikert-farm': 'weikert', 'bld-hummelbaugh-farm': 'hummelbaugh', 'bld-brian-farm': 'bryan', 'bld-spangler-farm': 'spangler', 'bld-henry-culp-farm': 'culp', 'bld-mcmillan-farm': 'mcmillan', 'bld-mcpherson-farm': 'mcpherson' };
for (const [rec, s] of Object.entries(SUR)) for (const id of [...(XW[rec].all || []), ...Object.values(XW[rec].parts || {}).flat()]) if (!id.toLowerCase().includes(s) && !(rec === 'bld-brian-farm' && id.includes('BRYAN'))) throw new Error(`crosswalk ${rec} -> ${id}: surname ${s} not in the feature id`);

// documented storeys: only where the feature's own record says so (the builder checks the phrase is there)
const STOREYS = [
  { id: 'STR-SHERFY-HOUSE1', n: 2, from: f => f.properties.dims_documented, phrase: '2 stories', basis: 'dims_documented of STR-SHERFY-HOUSE1 ("brick Georgian, 2 stories")' },
  { id: 'STR-BRYAN-HOUSE1', n: 1.5, from: f => f.properties.dims_documented, phrase: '1.5-story', basis: 'dims_documented of STR-BRYAN-HOUSE1 ("1.5-story small frame house in 1863")' },
  { id: 'STR-KLINGEL-HOUSE1', n: 2, from: f => (f.properties.sources || []).map(s => s.quote_or_paraphrase).join(' | '), phrase: 'Two-story log house 26 x 21 ft', basis: 'NPS-CLI-EMM quotation on STR-KLINGEL-HOUSE1 ("Two-story log house 26 x 21 ft")' },
  { id: 'STR-TOWN-PENN_HALL', n: 4, from: () => REC.get('bld-pennsylvania-hall').dimensions, phrase: '4 stories', basis: 'structures.json bld-pennsylvania-hall dimensions ("150 x 45 ft, 4 stories")' },
  { id: 'STR-TOWN-COURTHOUSE', n: 2, from: () => REC.get('bld-courthouse').dimensions, phrase: 'two stories', basis: 'structures.json bld-courthouse dimensions ("about 70 ft clock tower; two stories")' },
];
const STOREY = new Map();
for (const s of STOREYS) { const f = STRBY.get(s.id); if (!f || !String(s.from(f)).includes(s.phrase)) throw new Error('documented-storeys phrase not found for ' + s.id); STOREY.set(s.id, { n: s.n, basis: s.basis }); }

const matClass = m => { const t = (m || '').toLowerCase(); if (!t) return 'unspecified'; if (/brick/.test(t)) return 'brick'; if (/stone|granite/.test(t) && !/foundation/.test(t.replace(/(brick|log|frame|wood)[^,]*(stone|granite) foundation/, ''))) return 'stone'; if (/log/.test(t)) return 'log'; if (/frame|wood|board|siding/.test(t)) return 'frame'; if (/stone|granite/.test(t)) return 'stone'; return 'unspecified'; };

// ================================================================ buildings: polygons and points
const inv = [];         // inventory rows
const buildings = [], points = [];
const stateIdOf = (rec, part) => (rec ? (part ? `${rec}#${part}` : rec) : null);
for (const f of STR) {
  const p = f.properties, g = f.geometry, link = strToRec.get(p.id) || null, conf = p.confidence || 'Unknown', gk = p.geometry_kind;
  const row = { layer: 'basemap structures', id: p.id, name: p.name, kind: p.subtype, geometry_kind: gk, err_m: p.positional_error_m ?? null, conf, record: link ? stateIdOf(link.rec, link.part) : null };
  const base = { id: p.id, name: p.name, subtype: p.subtype, err: p.positional_error_m ?? null, conf, gk, represents: p.geometry_represents || null, status: p.status || null, farm: p.farm_name || null, dims: p.dims_documented || null, mat: matClass(p.material), material_text: p.material || null, roof_text: p.roof || null, built: p.built || null, src: srcKeys(p), rec: link ? link.rec : null, part: link ? link.part : null, state_id: link ? stateIdOf(link.rec, link.part) : null, notes: p.notes || null, review: p.review_status || null, present: p.present_1863 === true };
  const recTier = link ? (REC.get(link.rec).tier || null) : null;
  base.tier = weaker(recTier || 'inferred', TIER_OF_CONF[conf] || 'inferred');
  if (!g) { row.decision = 'not drawn'; row.reason = 'no georeferenced geometry in the repository (UNKNOWN position)'; row.group = 'no geometry'; inv.push(row); continue; }
  if (!base.present) { row.decision = 'not drawn'; row.reason = 'rejected: not a building symbol (the review found no building at the point)'; row.group = 'rejected'; inv.push(row); continue; }
  if (g.type === 'Polygon') {
    const ring = g.coordinates[0], w = ring.map(xz), n = w.filter(inGround).length;
    if (n === 0) { row.decision = 'not drawn'; row.reason = 'outside the loaded ground (6.2 x 6.1 km)'; row.group = 'outside'; inv.push(row); continue; }
    const st = STOREY.get(p.id);
    buildings.push({ ...base, kind: gk === 'map_ink_mass' ? 'mass' : 'footprint', ring: ring.map(c => [r6(c[0]), r6(c[1])]), storeys: st || null });
    row.decision = 'drawn'; row.reason = gk === 'map_ink_mass' ? 'extruded as a schematic mass (extent of the drawn building symbols, not a building)' : 'extruded footprint'; row.group = gk === 'map_ink_mass' ? 'mass' : 'footprint'; row.class = 'buildings'; inv.push(row); continue;
  }
  // points
  const q = xz(g.coordinates);
  if (!inGround(q)) { row.decision = 'not drawn'; row.reason = 'outside the loaded ground (6.2 x 6.1 km)'; row.group = 'outside'; inv.push(row); continue; }
  if (p.status === 'unreviewed_machine_detection') { row.decision = 'not drawn'; row.reason = 'machine-detected plate symbol, not reviewed by hand (the basemap lists it as undrawn)'; row.group = 'unreviewed'; inv.push(row); continue; }
  points.push({ ...base, kind: gk === 'named_point' ? 'named_point' : 'building_point', pt: [r6(g.coordinates[0]), r6(g.coordinates[1])] });
  row.decision = 'marker'; row.reason = 'a point only (' + gk + '): a labelled marker, not a building'; row.group = 'point'; row.class = 'markers'; inv.push(row);
}

// ================================================================ fences
const fences = [];
// attribution of lines to structures.json fence records: only along a named road, only of a compatible style, only when most of the line lies within the road's own error
const ROAD_LINES = Object.fromEntries(ROADS.map(r => [r.properties.id, linesOf(r.geometry).map(l => l.map(xz))]));
const FEN_RULES = [
  { rec: 'FEN-emmitsburg-road', road: 'RD-003', style: 'rail', maxM: 45, minFrac: 0.7 },
  { rec: 'FEN-chambersburg-pike', road: 'RD-002', style: 'rail', maxM: 45, minFrac: 0.7 },
];
const styleOf = p => (/stone/.test(p.subtype) ? 'stone' : 'rail');
for (const f of FEN) {
  const p = f.properties, line = f.geometry.coordinates, w = line.map(xz), nIn = w.filter(inGround).length;
  const row = { layer: 'basemap fences', id: p.id, name: p.name || `OSM way ${p.osm_way_id}`, kind: p.subtype, geometry_kind: 'line (modern OSM line)', err_m: p.positional_error_m, conf: p.confidence, record: null };
  if (p.present_1863 !== true || p.draw !== true) { row.decision = 'not drawn'; row.group = 'fence not confirmed'; row.reason = (p.period_map_check && p.period_map_check.verdict === 'too_short') || /Shorter than 40 m/.test(p.notes || '') ? 'shorter than 40 m: not checked against the period sheet' : 'no continuous drawn line along it on the period sheet (a modern fence, or beyond the registration accuracy)'; inv.push(row); continue; }
  if (nIn === 0) { row.decision = 'not drawn'; row.group = 'outside'; row.reason = 'outside the loaded ground (6.2 x 6.1 km)'; inv.push(row); continue; }
  const style = styleOf(p), sm = sample(w);
  let rec = null;
  for (const rule of FEN_RULES) {
    const fr = sm.filter(q => dpoly(q, ROAD_LINES[rule.road]) <= rule.maxM).length / sm.length;
    if (fr >= rule.minFrac && style === rule.style) { rec = { id: rule.rec, rule: `${Math.round(fr * 100)}% of the line lies within ${rule.maxM} m of ${rule.road} (road error ${ROADS.find(r => r.properties.id === rule.road).properties.positional_error_m} m, fence error ${p.positional_error_m} m); style ${style} matches the record`, tier: 'inferred' }; break; }
  }
  fences.push({ id: p.id, way: p.osm_way_id, style, recStyle: rec ? (REC.get(rec.id).kind === 'fence_virginia_worm' ? 'worm' : 'rail') : null, coords: line.map(c => [r6(c[0]), r6(c[1])]), err: p.positional_error_m, conf: p.confidence, check: p.period_map_check, src: srcKeys(p), len_m: p.length_m, rec, tier: rec ? 'inferred' : 'inferred', partlyOutside: nIn < w.length });
  row.decision = 'drawn'; row.group = rec ? 'fence attributed' : 'fence'; row.class = 'fences'; row.record = rec ? rec.id : null; row.reason = `${style === 'stone' ? 'stone wall' : 'rail fence'} line confirmed on the period sheet (continuity ${p.period_map_check.continuity}); 1863 style not read from the sheet` + (nIn < w.length ? '; the part outside the loaded ground is clipped' : '') + (rec ? `; attributed to ${rec.id} (inferred): ${rec.rule}` : ''); inv.push(row);
}

// ================================================================ roads, lanes, railway, bridges
const roads = [];
const SURFACE = f => { const p = f.properties; if (/turnpike/.test(p.subtype)) return { surface: 'macadam', basis: 'NPS-TREAT-2004 p20, 22-23 (three of the roads from Gettysburg were macadamized turnpikes); which three is named only for the Baltimore and Chambersburg pikes' + (p.id === 'RD-006' ? ' (the York Pike is the third by class, not by a printed name: inferred)' : ''), tier: p.id === 'RD-006' ? 'inferred' : 'documented' }; return { surface: 'dirt', basis: 'NPS-TREAT-2004 p20 (most of the ten roads at the square were dirt); generic for a county or township road, a lane or a cart path', tier: 'plausible-procedural' }; };
const WIDTH = { turnpike: 6.5, 'county road': 5.5, 'township road': 4.5, lane: 3, 'town square': 5.5 };      // the widths the basemap draws (BUILD.md 4.3): generic, not measured
const widthOf = p => { for (const k of Object.keys(WIDTH)) if (p.subtype.startsWith(k)) return WIDTH[k]; return /lane/.test(p.subtype) ? 3 : 4.5; };
const road = (f, cls) => {
  const p = f.properties, row = { layer: 'basemap ' + (cls === 'lane' ? 'lanes' : cls.startsWith('rail') ? 'railways' : 'roads'), id: p.id, name: p.name, kind: p.subtype, geometry_kind: 'line', err_m: p.positional_error_m ?? null, conf: p.confidence, record: null };
  if (p.present_1863 !== true || p.confidence === 'Unknown') { row.decision = 'not drawn'; row.group = p.present_1863 === false ? 'post-1863' : 'unknown'; row.reason = p.present_1863 === false ? 'not in 1863 (post-1863 railway)' : 'extent unknown / confidence Unknown: the basemap does not draw it'; inv.push(row); return; }
  const lines = linesOf(f.geometry).map(l => l.map(c => [r6(c[0]), r6(c[1])])), inside = lines.filter(l => l.map(xz).some(inGround));
  if (!inside.length) { row.decision = 'not drawn'; row.group = 'outside'; row.reason = 'outside the loaded ground (6.2 x 6.1 km)'; inv.push(row); return; }
  const surf = cls === 'rail_track' ? { surface: 'rail', basis: 'the line is the railway; track gauge and ballast are not in the record (generic bed)', tier: 'plausible-procedural' } : cls === 'rail_grade' ? { surface: 'grade', basis: 'graded, no track laid (p.subtype); bed colour generic', tier: 'plausible-procedural' } : cls === 'lane' ? { surface: 'cart', basis: 'NPS-TREAT-2004 p27-28: the woodlot section is a cart path, the outer sections improved; generic', tier: 'plausible-procedural' } : SURFACE(f);
  roads.push({ id: p.id, cls, name: p.name, subtype: p.subtype, surface: surf.surface, surface_basis: surf.basis, surface_tier: surf.tier, width_m: cls === 'rail_track' ? 4 : cls === 'rail_grade' ? 5 : widthOf(p), width_basis: 'generic (the width the basemap draws, BUILD.md 4.3), not measured', err: p.positional_error_m, conf: p.confidence, lines: inside, src: srcKeys(p), period_note: p.period_note || null, tier: TIER_OF_CONF[p.confidence] });
  row.decision = 'drawn'; row.group = cls; row.class = 'roads'; row.reason = `ground ribbon, ${surf.surface} surface (${surf.tier})`; inv.push(row);
};
for (const f of ROADS) road(f, 'road');
for (const f of LANES) road(f, 'lane');
for (const f of RAIL) {
  const p = f.properties;
  if (f.geometry.type === 'Point') {
    const q = xz(f.geometry.coordinates), row = { layer: 'basemap railways', id: p.id, name: p.name, kind: p.subtype, geometry_kind: 'point', err_m: p.positional_error_m, conf: p.confidence, record: null };
    if (!inGround(q) || p.present_1863 !== true) { row.decision = 'not drawn'; row.group = 'outside'; row.reason = 'outside the loaded ground or not in 1863'; inv.push(row); continue; }
    points.push({ id: p.id, name: p.name, subtype: p.subtype, kind: p.id === 'RL-007' ? 'trestle' : 'depot', err: p.positional_error_m, conf: p.confidence, gk: 'point', represents: 'site position, not a footprint', src: srcKeys(p), rec: p.id === 'RL-007' ? 'bld-rock-creek-rr-bridge' : null, part: null, state_id: p.id === 'RL-007' ? 'bld-rock-creek-rr-bridge' : null, pt: f.geometry.coordinates.map(r6), tier: TIER_OF_CONF[p.confidence], present: true, notes: p.period_note || null });
    row.decision = 'marker'; row.group = 'point'; row.class = 'markers'; row.record = p.id === 'RL-007' ? 'bld-rock-creek-rr-bridge' : null; row.reason = 'a point only: a labelled marker'; inv.push(row); continue;
  }
  road(f, p.id === 'RL-001' ? 'rail_track' : 'rail_grade');
}
for (const f of RAIL_NOGEO) inv.push({ layer: 'basemap railways (no geometry file)', id: f.id, name: f.name, kind: f.subtype, geometry_kind: 'none', err_m: null, conf: null, record: null, decision: 'not drawn', group: 'post-1863', reason: 'not in 1863 (no geometry)' });
for (const l of LANE_INV) { if (LANES.some(f => f.properties.id.startsWith(l.id))) continue; inv.push({ layer: 'basemap lanes (inventory without geometry)', id: l.id, name: l.name, kind: 'lane', geometry_kind: 'none', err_m: null, conf: null, record: null, decision: 'not drawn', group: 'no geometry', reason: 'named lane with no traced line in the repository' }); }
for (const f of BRIDGES) {
  const p = f.properties, q = xz(f.geometry.coordinates), row = { layer: 'basemap bridges', id: p.id, name: p.name, kind: p.subtype, geometry_kind: 'point (road centreline x stream)', err_m: p.positional_error_m, conf: p.confidence, record: null };
  if (!inGround(q)) { row.decision = 'not drawn'; row.group = 'outside'; row.reason = 'outside the loaded ground (6.2 x 6.1 km)'; inv.push(row); continue; }
  const kind = /^ford/.test(p.subtype) ? 'ford' : /^crossing/.test(p.subtype) ? 'crossing' : 'bridge';
  points.push({ id: p.id, name: p.name, subtype: p.subtype, kind, err: p.positional_error_m, conf: p.confidence, gk: 'crossing point', represents: 'the crossing of the catalogued road centreline with the stream, not a structure outline', src: srcKeys(p), rec: null, part: null, state_id: null, pt: f.geometry.coordinates.map(r6), tier: TIER_OF_CONF[p.confidence], present: true, notes: p.period_note || null });
  row.decision = 'marker'; row.group = 'point'; row.class = 'markers'; row.reason = `a ${kind} at a point only: a labelled marker`; inv.push(row);
}

// ================================================================ the records of structures.json
const stateRows = new Map();   // object id (incl. parts) -> rows
for (const r of SCH.rows) for (const o of r.object_ids) (stateRows.get(o) || stateRows.set(o, []).get(o)).push(r.id);
const hospitalOf = {};         // building id -> hospitals that name it (hospitals.json structure_ids: the record's own link)
for (const h of HOSP.hospitals) for (const b of h.structure_ids || []) (hospitalOf[b] ||= []).push(h.id);
for (const k of Object.keys(hospitalOf)) hospitalOf[k].sort();
const drawnByRec = (rec) => ({ bld: buildings.filter(b => b.rec === rec).length, pts: points.filter(b => b.rec === rec).length });
const recRows = [];
for (const s of SJ.structures) {
  const id = s.id, row = { id, kind: s.kind, name: s.name, tier: s.tier || null, section: s.section, rows: s.schedule_rows || [] };
  let geom = 'none', decision, reason, err = null;
  if (id.startsWith('bld-')) {
    const names = XW[id], feats = names ? [...(names.all || []), ...Object.values(names.parts || {}).flat()].map(i => STRBY.get(i).properties) : [];
    const withGeom = feats.filter(p => p.geometry_kind !== 'none');
    geom = withGeom.length ? withGeom.map(p => `${p.id} (${p.geometry_kind}, ${p.positional_error_m} m)`).join('; ') : 'none';
    err = withGeom.length ? Math.max(...withGeom.map(p => p.positional_error_m)) : null;
    const d = drawnByRec(id);
    if (d.bld) { decision = 'drawn (extruded footprint)'; reason = `${d.bld} footprint${d.bld > 1 ? 's' : ''}${d.pts ? ` and ${d.pts} marker${d.pts > 1 ? 's' : ''}` : ''}; footprint is the 2023 outline of the surviving building (the 1863 form may be smaller); height and roof generic`; }
    else if (d.pts) { decision = 'marker only'; reason = `only a map-symbol point (${d.pts} marker${d.pts > 1 ? 's' : ''}); no footprint is invented`; }
    else if (id === 'bld-rock-creek-rr-bridge') { const m = points.find(p => p.id === 'RL-007'); decision = m ? 'marker only' : 'not drawn'; reason = m ? 'only a point (RL-007, 40 m); no trestle outline is invented' : 'outside the loaded ground'; geom = 'RL-007 (point, 40 m)'; err = 40; }
    else { decision = 'not drawn'; reason = feats.length ? 'its catalogue entries have no georeferenced geometry (UNKNOWN position)' : 'no entry in the basemap structures catalogue (named place only)'; }
  } else if (/^E-\d\d$/.test(id)) {
    const w = WK.works[id], ob = OBBY.get(id), skip = OB.skipped.find(x => x.id === id);
    if (ob && ob.at) { decision = 'ring only (2D mark at the named place)'; reason = `no line geometry in the repository; a labelled ring at ${ob.at.place} (sigma ${ob.at.sigma_m} m), built over the printed window (existing overlay)`; geom = `gazetteer place ${ob.at.place} (point, ${ob.at.sigma_m} m)`; err = ob.at.sigma_m; }
    else if (ob) { decision = 'not drawn'; reason = 'no line geometry, and the place its location text names is not in the gazetteer'; }
    else if (skip) { decision = 'not drawn'; reason = skip.reason + ', so the work is not shown (listed as an open gap)'; }
    else { decision = 'not drawn'; reason = 'no construction in the record (' + ((w && w.why_not) || s.kind) + ')'; }
  } else if (/^G-\d\d$/.test(id)) { decision = 'not drawn'; reason = 'no emplacement geometry; the guns of a battery with a stated count are drawn by the unit layer, not as an emplacement'; }
  else if (id.startsWith('P-')) {
    if (id === 'P-12') { geom = 'RL-002 (railway grade, 20 m)'; err = 20; const r = roads.find(x => x.id === 'RL-002'); decision = r ? 'drawn as the railway grade (ground ribbon)' : 'not drawn'; reason = r ? 'the unfinished railroad grade is RL-002 by name; the cut itself is part of the modern ground model, not drawn separately' : 'outside the loaded ground'; }
    else { const ob = OBBY.get(id); if (ob && ob.at) { decision = 'ring only (2D mark at the named place)'; reason = `no line geometry in the repository (the fences layer lines carry no names, and no 1863 profile is taken from the modern rebuilt walls); a labelled ring at ${ob.at.place} (sigma ${ob.at.sigma_m} m), present from the first frame (no construction)`; geom = `gazetteer place ${ob.at.place} (point, ${ob.at.sigma_m} m)`; err = ob.at.sigma_m; } else { decision = 'not drawn'; reason = 'a wall at a place the gazetteer does not hold, and no named geometry; no 1863 profile is taken from the modern rebuilt walls'; } }
  } else if (id.startsWith('FEN-')) {
    const att = fences.filter(f => f.rec && f.rec.id === id);
    if (att.length) { geom = att.map(f => `${f.id} (OSM line, ${f.err} m)`).join('; '); err = 25; decision = 'drawn (' + att.length + ' attributed line' + (att.length > 1 ? 's' : '') + ')'; reason = 'attributed by proximity to the named road (inferred); the record\'s state rows drive these lines'; }
    else if (id === 'FEN-chambersburg-pike') { decision = 'not drawn'; reason = 'the only confirmed line along the Chambersburg Pike (FN-0060) lies outside the loaded ground'; }
    else { decision = 'not drawn'; reason = 'fence of a named farm or place; no fence line in the repository is named for it (the 36 confirmed lines are unnamed), so none is attributed'; }
  } else if (id.startsWith('RD-')) {
    const map = { 'RD-turnpikes': ['RD-001', 'RD-002', 'RD-006'], 'RD-baltimore-pike': ['RD-001'], 'RD-taneytown-road': ['RD-004'], 'RD-wheatfield-road': ['RD-014'], 'RD-chambersburg-pike': ['RD-002'], 'RD-other-roads': ['RD-003', 'RD-005', 'RD-010', 'RD-015'], 'RD-gettysburg-railroad': ['RL-001'] }[id];
    if (id === 'RD-avenues') { decision = 'never drawn'; reason = 'the avenues are not in 1863 (rule RULE-04, B.8.4)'; }
    else if (map) { const have = map.filter(m => roads.some(r => r.id === m)); geom = have.join(', ') || 'none'; err = have.length ? Math.max(...have.map(m => roads.find(r => r.id === m).err)) : null; decision = have.length ? 'drawn (ground ribbon)' : 'not drawn'; reason = have.length ? `by name: ${have.join(', ')}; surface from the record, generic where not printed` : 'outside the loaded ground'; }
    else { decision = 'not drawn'; reason = 'no road geometry for this record'; }
  } else { decision = 'not drawn'; reason = id.startsWith('WS-') ? 'an epilogue state of the ground, people or sky, not a structure' : id.startsWith('ENV-') || id === 'GROUP-hospital-sites' || id.startsWith('PERSON-') ? 'an environment, group or person state, not a structure' : 'not a structure'; }
  recRows.push({ ...row, geometry: geom, err_m: err, decision, reason, hospital: hospitalOf[id] || null });
}
// hospitals
const hospRows = HOSP.hospitals.map(h => {
  const hostIds = h.structure_ids || [], drawn = hostIds.filter(k => buildings.some(b => b.rec === k) || points.some(b => b.rec === k));
  return { id: h.id, name: h.hospital, location: h.location, host: hostIds, decision: drawn.length ? 'marked on its host building' : 'not drawn', reason: drawn.length ? 'hospitals.json names ' + hostIds.join(', ') + '; drawn or marked: ' + drawn.join(', ') : (hostIds.length ? 'its host (' + hostIds.join(', ') + ') has no geometry in the repository' : 'hospitals.json names no building for it, and it has no geometry') };
});
const hospitals = HOSP.hospitals.filter(h => (h.structure_ids || []).some(k => buildings.some(b => b.rec === k) || points.some(b => b.rec === k))).map(h => ({ id: h.id, name: h.hospital, side: h.corps_or_side, location: h.location, host: h.structure_ids, setup_printed: h.setup_time_printed, closing_printed: h.closing_or_move_printed, setup_window: h.setup_window, closing_window: h.closing_window, patients_printed: h.patients_printed, src: h.source_keys, weak: h.weak_source }));

// ================================================================ write
const counts = {
  fences_drawn: fences.length, fences_attributed: fences.filter(f => f.rec).length, fences_len_m: Math.round(fences.reduce((a, f) => a + f.len_m, 0)), buildings_footprints: buildings.filter(b => b.kind === 'footprint').length, buildings_masses: buildings.filter(b => b.kind === 'mass').length,
  markers: points.length, markers_building_points: points.filter(p => p.kind === 'building_point').length, markers_bridges: points.filter(p => ['bridge', 'ford', 'crossing'].includes(p.kind)).length, roads: roads.filter(r => r.cls === 'road').length, lanes: roads.filter(r => r.cls === 'lane').length, rail: roads.filter(r => r.cls.startsWith('rail')).length,
  inventory_rows: inv.length, records: recRows.length, hospitals: hospRows.length,
};
const gmap = {};
for (const r of inv) if (r.decision === 'not drawn') { const k = r.layer + '|' + r.group + '|' + r.reason; const g = (gmap[k] ||= { layer: r.layer, group: r.group, reason: r.reason, n: 0, ids: [] }); g.n++; if (g.ids.length < 5) g.ids.push(r.id); }
const out = {
  meta: { label: 'RECONSTRUCTION from period maps and later documentation: geometry of the basemap1863 layers (not a photograph of 1863); every feature carries its sources, error and confidence', built_by: 'app/tools/build-structures3d.mjs', rules: 'no footprint, line or dimension is invented; a point is a marker; a record with no geometry is listed as not drawn',
    inputs: Object.fromEntries(Object.entries(INPUTS).map(([k, f]) => [k, { sha256: sha(f), bytes: fs.statSync(f).size }])), terrain: { W: T.W, H: T.H }, counts },
  srcTable: SRC, fences, buildings, points, roads, hospitalOf, hospitals,
  xwalk: XW,
  notDrawnGroups: Object.values(gmap),
  notDrawn: recRows.filter(r => /^not drawn|^never/.test(r.decision)).map(r => ({ id: r.id, name: r.name, reason: r.reason })),
};
const invOut = { meta: out.meta, records: recRows, hospitals: hospRows, features: inv };
const text = JSON.stringify(out), textInv = JSON.stringify(invOut, null, 0);
const tgt = [path.join(APP, 'data/structures3d.json'), path.join(APP, 'data/structures3d-inventory.json')];
if (check) {
  const cur = tgt.map(f => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null));
  if (cur[0] !== text || cur[1] !== textInv) { console.error('structures3d data is stale: run node docs/battle-theatre/app/tools/build-structures3d.mjs'); process.exit(1); }
  console.log('structures3d data is current'); process.exit(0);
}
fs.writeFileSync(tgt[0], text); fs.writeFileSync(tgt[1], textInv);
console.log(JSON.stringify(counts));
export { counts };

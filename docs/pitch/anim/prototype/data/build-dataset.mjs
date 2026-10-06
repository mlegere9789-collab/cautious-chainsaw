// build-dataset.mjs - extracts the REAL data the Battle Studio needs from the repo's data files (read-only) into one compact JSON:
//     data/dataset.json   (committed; inlined into battle-studio.html by build.mjs)
//
//     node docs/pitch/anim/prototype/data/build-dataset.mjs            write data/dataset.json
//     node docs/pitch/anim/prototype/data/build-dataset.mjs --check    exit 1 when the committed file differs from a fresh build
//
// Sources (all read-only):
//   baseline/dist/data/**                 placements_*, density_*, oob/*, chronology_*, vignettes_*  (what production serves; verified identical to live on 2026-10-05, 01-current-tiles-jitter.md)
//   legacy/dist/data/terrain.json         the frame the placements were authored in (03-data-fuel.md fact 11)
//   baseline/dist/data/terrain.json       production terrain (8 places differ from legacy by 166-733 m: computed below, not assumed)
//   data-src/time/time_anchors.json       the CANDIDATE clock (33 anchors, all "proposed", not reviewed by a historian)
//
// Honesty rules enforced here: nothing is invented; every unit row is copied from a source row; the loader's documented inferences are carried as FLAGS
// (side flags, duplicate-row conflicts, ids with no order-of-battle parent) and are never silently resolved.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { buildAll, visibleAt } from './loader.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..', '..', '..');
const DATA = path.join(REPO, 'baseline', 'dist', 'data');
const OUT = path.join(HERE, 'dataset.json');

const readText = (p) => fs.readFileSync(p, 'utf8');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const R = (v, n) => +v.toFixed(n);

function main() {
  const used = [];
  const readData = (rel) => { const p = path.join(DATA, rel); const t = readText(p); used.push({ file: 'baseline/dist/data/' + rel, bytes: Buffer.byteLength(t), sha256: sha(t) }); return JSON.parse(t); };
  const all = buildAll(readData);
  for (const f of ['chronology_day1.json', 'chronology_day2.json', 'chronology_day3.json', 'vignettes_part1.json', 'vignettes_part2.json', 'vignettes_part3.json']) readData(f);

  // ---- units ------------------------------------------------------------------------------------------------------------------------
  const dispositions = []; const dIdx = (d) => { let i = dispositions.indexOf(d); if (i < 0) { i = dispositions.length; dispositions.push(d); } return i; };
  const notes = []; const nIdx = new Map();
  const noteIdx = (s) => { if (!s) return -1; let i = nIdx.get(s); if (i === undefined) { i = notes.length; notes.push(s); nIdx.set(s, i); } return i; };
  const units = [];
  const ids = [...all.units.keys()].sort();
  for (const id of ids) {
    const u = all.units.get(id);
    // SIDE: the id prefix is what the site draws today. When the order of battle or a state suffix says otherwise the side is UNKNOWN here, not guessed (10 ids; flagged for a historian by 03-data-fuel.md T7).
    const side = u.sideFlag ? 'unknown' : u.side;
    units.push({
      id, side, prefixSide: u.prefixSide, sideGuess: u.sideFlag ? u.side : null, sideFlag: u.sideFlag, kind: u.kind, arm: u.arm, inOob: u.inOob, parentSource: u.parentSource,
      short: u.short, label: u.label, designation: u.designation, strengthRef: u.strengthRef, parent: u.chain[1] ?? null,
      kf: u.kfs.map((k) => [k.tick, R(k.lat, 6), R(k.lng, 6), k.strength, k.bearing, dIdx(k.disposition), noteIdx(k.notes)]),
    });
  }
  // ---- hierarchy ----------------------------------------------------------------------------------------------------------------------
  const nodes = [...all.nodes.values()].filter((n) => n.id !== 'ROOT').map((n) => ({ id: n.id, side: n.side, kind: n.kind, parent: n.parent, designation: n.designation || null, virtual: !!n.virtual }));

  // ---- clock (candidate) -----------------------------------------------------------------------------------------------------------------
  const tp = path.join(REPO, 'data-src', 'time', 'time_anchors.json'); const tt = readText(tp); used.push({ file: 'data-src/time/time_anchors.json', bytes: Buffer.byteLength(tt), sha256: sha(tt) });
  const ta = JSON.parse(tt);
  const clock = {
    release: ta.release, version: ta.version, notice: ta.notice, tz: ta.tz, tz_note: ta.tz_note, tickMax: ta.tick_max, tabDays: ta.tab_days, gaps: ta.gaps,
    anchors: ta.anchors.map((a) => ({ tick: a.tick, t: a.t, status: a.status, effective: a.effective_status ?? a.status, sigma: a.sigma_min, label: a.label, state: a.state, circular: !!a.circular })),
  };

  // ---- terrain: legacy frame (placements) vs production -----------------------------------------------------------------------------------
  const legacyP = path.join(REPO, 'legacy', 'dist', 'data', 'terrain.json'); const lt = readText(legacyP); used.push({ file: 'legacy/dist/data/terrain.json', bytes: Buffer.byteLength(lt), sha256: sha(lt) });
  const leg = JSON.parse(lt); const prod = readData('terrain.json');
  const prodBy = new Map(prod.key_locations.map((k) => [k.location_id, k]));
  const dist = (a, b) => Math.hypot((a.lat - b.lat) * 111195, (a.lng - b.lng) * 111195 * Math.cos(a.lat * Math.PI / 180));
  // a source spelling that is plainly wrong is shown as written with [sic], never silently corrected: the data track owns the fix
  const SOURCE_TYPOS = { 'LOC-029': "the source spells it Gulp (a typo); the significance text of the same record says Culp's Hill" };
  const locations = leg.key_locations.map((k) => {
    const p = prodBy.get(k.location_id);
    return { id: k.location_id, name: k.name, displayName: SOURCE_TYPOS[k.location_id] ? k.name + ' [sic]' : k.name, nameNote: SOURCE_TYPOS[k.location_id] || null, lat: k.lat, lng: k.lng, elevFt: k.elevation_ft ?? null, productionLat: p ? p.lat : null, productionLng: p ? p.lng : null, diffM: p ? Math.round(dist(k, p)) : null };
  });
  const features = (prod.terrain_features || []).filter((f) => f.lat != null).map((f) => ({ id: f.feature_id, name: f.name, type: f.type, lat: f.lat, lng: f.lng }));
  const structures = (prod.structures || []).map((s) => ({ id: s.structure_id, name: s.name, type: s.type, lat: s.lat, lng: s.lng }));
  const terrain = { frame: 'legacy', bounds: prod.metadata.battlefield_bounds, townCenter: prod.metadata.town_center, locations, features, structures, sources: prod.metadata.sources, disputed: locations.filter((l) => l.diffM > 100).map((l) => l.id) };

  // ---- chronology and vignettes (titles only; tick = the site's own key) ----------------------------------------------------------------------
  const events = [];
  for (const d of [1, 2, 3]) for (const e of readData(`chronology_day${d}.json`).events) events.push({ tick: e.tick, significance: e.significance, location: e.location || null, event: e.event.length > 140 ? e.event.slice(0, 137) + '...' : e.event });
  events.sort((a, b) => a.tick - b.tick);
  const vignettes = [];
  for (const p of [1, 2, 3]) for (const v of readData(`vignettes_part${p}.json`).vignettes) vignettes.push({ id: v.vignette_id, title: v.title, tick: +v.trigger_tick, place: v.trigger_location, lat: +v.trigger_lat, lng: +v.trigger_lng });
  vignettes.sort((a, b) => a.tick - b.tick);

  // ---- scenes (hotspot bookmarks): COMPUTED from the data, never typed ------------------------------------------------------------------------
  const scenes = computeScenes(all, locations);

  const counts = { units: units.length, keyframes: units.reduce((s, u) => s + u.kf.length, 0), rawRows: all.rows, duplicateKeysKept: all.rows - all.kept, populatedTicks: all.snapTicks.length, nodes: nodes.length, notes: notes.length, conflicts: all.conflicts.length, events: events.length, vignettes: vignettes.length, unknownSide: units.filter((u) => u.side === 'unknown').length, noOobParent: units.filter((u) => u.parentSource !== 'oob').length };
  const out = {
    format: 'battle-studio-dataset/1',
    provenance: {
      note: 'Every unit keyframe is copied from a placement row of the files listed in sources (load order and last-row-wins rule of the shipped bundle, see data/loader.mjs). Positions are hand-authored with no basis field: all of them are Modelled.',
      sources: used.sort((a, b) => (a.file < b.file ? -1 : 1)),
      counts,
      loaderConflicts: all.conflicts.slice(0, 200),
    },
    dispositions, notes, units, nodes, clock, terrain, events, vignettes, scenes,
  };
  return out;
}

/** Scene bookmarks, COMPUTED from the data (never typed).  Two density measures, both "most units within RADIUS metres of one unit":
 *    carry : every unit with a keyframe up to the tick, at its last position (the rule the site draws today; includes stale units)  -> the layout problem
 *    fresh : only the keyframes recorded AT that tick                                                                              -> live contact
 *  Distinct places are at least 500 m apart.  The nearest named place comes from the legacy terrain frame (the frame of the placements) and is a label, not a claim. */
function computeScenes(all, locations) {
  const RADIUS = 120; const mxs = 111195 * Math.cos(39.82 * Math.PI / 180);
  const dm = (a, b) => Math.hypot((a.lat - b.lat) * 111195, (a.lng - b.lng) * mxs);
  const densest = (pts) => { let top = { n: 0, i: -1 }; for (let i = 0; i < pts.length; i++) { let n = 0; for (let j = 0; j < pts.length; j++) if (dm(pts[i], pts[j]) <= RADIUS) n++; if (n > top.n) top = { n, i }; } return top.i < 0 ? null : { n: top.n, lat: pts[top.i].lat, lng: pts[top.i].lng }; };
  const carry = []; const fresh = []; let peak = { tick: 1, n: 0 };
  for (let t = 1; t <= 675; t++) {
    const vis = visibleAt(all, t, { rule: 'A', mode: 'hold' }); if (vis.length > peak.n) peak = { tick: t, n: vis.length };
    const d = densest(vis.map((x) => ({ lat: x.st.lat, lng: x.st.lng }))); if (d) carry.push({ tick: t, visible: vis.length, ...d });
    const snap = all.snap.get(t); if (snap) { const f = densest(snap.map(({ u, idx }) => ({ lat: u.kfs[idx].lat, lng: u.kfs[idx].lng }))); if (f) fresh.push({ tick: t, recorded: snap.length, ...f }); }
  }
  const distinct = (list, k) => { const pick = []; for (const b of [...list].sort((x, y) => y.n - x.n || x.tick - y.tick)) { if (pick.some((p) => dm(p, b) < 500)) continue; pick.push(b); if (pick.length >= k) break; } return pick; };
  const nearest = (p) => { let best = null; for (const l of locations) { const d = dm(p, l); if (!best || d < best.d) best = { name: l.name, d: Math.round(d) }; } return best; };
  const scene = (id, name, p, zoom, why, extra = {}) => ({ id, name, tick: p.tick, tick0: Math.max(1, p.tick - 8), tick1: Math.min(675, p.tick + 12), zoom, lat: R_(p.lat), lng: R_(p.lng), nearestPlace: nearest(p), why, ...extra });
  const out = [];
  distinct(carry, 3).forEach((p, i) => out.push(scene('carry' + (i + 1), 'Pile ' + 'ABC'[i] + ' (carry-forward)', p, 15, `${p.n} units within ${RADIUS} m of one unit at tick ${p.tick} under carry-forward (${p.visible} on the field); most of them have an old keyframe`, { unitsWithin: p.n, onField: p.visible, rule: 'carry-forward' })));
  distinct(fresh, 3).forEach((p, i) => out.push(scene('fresh' + (i + 1), 'Contact ' + 'ABC'[i] + ' (fresh keyframes)', p, 15.5, `${p.n} of ${p.recorded} keyframes recorded AT tick ${p.tick} lie within ${RADIUS} m of one another`, { unitsWithin: p.n, recorded: p.recorded, rule: 'fresh keyframes' })));
  const pk = peak; const all620 = visibleAt(all, pk.tick, { rule: 'A', mode: 'hold' }); const c = { tick: pk.tick, lat: all620.reduce((s, x) => s + x.st.lat, 0) / all620.length, lng: all620.reduce((s, x) => s + x.st.lng, 0) / all620.length };
  out.push(scene('field', 'Whole field (most tiles at once)', c, 13.5, `${pk.n} units on the field, the maximum over 675 ticks under carry-forward`, { onField: pk.n, rule: 'carry-forward' }));
  const e = carry[119]; out.push(scene('evening1', 'Evening of day 1 (tick 120)', e, 14, `tick 120: ${e.visible} units on the field, ${e.n} within ${RADIUS} m of one unit; the densest tick under the latest-snapshot rule per 03-data-fuel.md`, { unitsWithin: e.n, onField: e.visible, rule: 'carry-forward' }));
  return out;
}
function R_(v) { return +v.toFixed(5); }

const out = main();
const json = JSON.stringify(out);
if (process.argv.includes('--check')) {
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (cur !== json) { console.error('dataset.json is out of date: run node docs/pitch/anim/prototype/data/build-dataset.mjs'); process.exit(1); }
  console.log('dataset.json is current (' + json.length + ' bytes)');
} else {
  fs.writeFileSync(OUT, json);
  console.log('wrote', path.relative(REPO, OUT), json.length, 'bytes', JSON.stringify(out.provenance.counts));
  console.log('scenes', out.scenes.map((s) => `${s.id}@${s.tick} n=${s.unitsWithin ?? s.onField} ~${s.nearestPlace.name} ${s.nearestPlace.d}m`).join(' | '));
  console.log('disputed places', out.terrain.disputed.length, out.terrain.locations.filter((l) => l.diffM > 100).map((l) => `${l.name} ${l.diffM} m`).join(', '));
}

// Gate Q03, node side: what the application's own code says about the things the Q03 runner judges (GATE-SPEC Q03.2 to Q03.7).
//   node tools/bt/gates/q03_scene.mjs --out dump.json [--bt <docs/battle-theatre>] [--no-layer]
//   --bt        the folder that holds app/, structures/, render/ ... (default: this checkout); a test points it at a scratch copy whose app/src carries an injected defect
//   --no-layer  skip the part that needs the history layer (the artillery train and the works draw lists); a runner that needs it says so and does not pass the items that depend on it
// Nothing here judges: it reports what the product holds and does, and the python runner (q03_anachronism.py) compares it with the data.
//   flags     the national colour's star count the figure code draws (US_STARS and flagPattern), the statutory count of the app's own evidence module on every scene date, the ANV star-count scenarios
//   engine    the structure state engine (src/structures/state.mjs) read at every integer minute of the window and the epilogue days: the schedule of every record, the state series of the
//             objects the regression set and the pre-existing features name, the scenarios, and which ids the engine knows
//   model     the structures model (src/structures/model.mjs) built from the real data on the real terrain: every object drawn, its class, record and state, and what the draw buffer says of each at an hourly grid
//   ext       the added layers of src/ext (later memorials, tour stops): objects they add to the scene at every minute, and their own checks
//   train     (layer) the artillery train's draw lists read at three times: which vehicle kinds are drawn for which army; the works and pre-existing draw lists of src/structures/works3d.mjs
// No network, no DOM, no wall clock, no random number: two runs on the same tree give the same dump. Nothing is written except the file named by --out.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 && i + 1 < args.length && !args[i + 1].startsWith('--') ? args[i + 1] : d; };
const BT = path.resolve(opt('--bt', path.resolve(here, '..', '..', '..', 'docs', 'battle-theatre')));
const APP = path.join(BT, 'app');
const OUT = opt('--out', null), NO_LAYER = args.includes('--no-layer');
if (!OUT) { console.error('usage: node q03_scene.mjs --out <file.json> [--bt <docs/battle-theatre>] [--no-layer]'); process.exit(2); }
const imp = rel => import(pathToFileURL(path.join(APP, rel)).href);
const rj = rel => JSON.parse(fs.readFileSync(path.join(BT, rel), 'utf8'));
const out = { schema: 'q03-scene-dump/1', bt: path.basename(BT), node: process.version, errors: [], sections: {} };
const guard = async (name, f) => { try { out[name] = await f(); out.sections[name] = 'ok'; } catch (e) { out.errors.push(name + ': ' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')); out[name] = null; out.sections[name] = 'error'; } };

// ---------------------------------------------------------------- the scene dates of GATE-SPEC U-06 and the minute grid
const pad = n => String(n).padStart(2, '0');
const SCENE_DATES = []; for (let d = 26; d <= 30; d++) SCENE_DATES.push(`1863-06-${pad(d)}`); for (let d = 1; d <= 14; d++) SCENE_DATES.push(`1863-07-${pad(d)}`); SCENE_DATES.push('1863-11-18', '1863-11-19');
out.scene_dates = SCENE_DATES;
const { parseIso, isoOf, makeStateEngine } = await imp('src/structures/state.mjs');
const msOf = iso => parseIso(iso);
const WINDOWS = [[msOf('1863-06-26T00:00'), msOf('1863-07-14T23:59')], [msOf('1863-11-18T00:00'), msOf('1863-11-19T23:59')]];
const minuteGrid = () => { const t = []; for (const [a, b] of WINDOWS) for (let x = a; x <= b; x += 60000) t.push(x); return t; };
out.grid = { windows: WINDOWS.map(([a, b]) => [isoOf(a), isoOf(b)]), step_s: 60, minutes: WINDOWS.reduce((s, [a, b]) => s + (b - a) / 60000 + 1, 0) };

// ---------------------------------------------------------------- flags
await guard('flags', async () => {
  const fl = await imp('src/figures3d/flags.mjs'), ev = await imp('src/figures3d/evidence.mjs');
  const res = { us_stars: fl.US_STARS, flag_evidence_us_stars: (fl.FLAG_EVIDENCE && fl.FLAG_EVIDENCE.us_national && fl.FLAG_EVIDENCE.us_national.stars) ?? null,
    anv_scenarios: Object.fromEntries(Object.entries(fl.ANV_STAR_SCENARIOS || {}).map(([k, v]) => [k, v.stars])), anv_default: fl.ANV_STAR_DEFAULT ?? null,
    star_function: String(fl.flagPattern).split('{')[0].replace(/\s+/g, ' ').slice(0, 140), patterns: {}, statutory: {}, statutory_source: 'unionStarsOn of src/figures3d/evidence.mjs' };
  res.star_count_takes_a_date = /\b(date|iso|day|when)\b/i.test(res.star_function);
  for (const kind of fl.FLAG_KINDS || []) { try { const p = fl.flagPattern(kind, 'intact'); res.patterns[kind] = { ok: !!(p && p.rgba && p.rgba.length) }; } catch (e) { res.patterns[kind] = { ok: false, error: String(e.message || e).slice(0, 160) }; } }
  res.anv_patterns = {};
  for (const k of Object.keys(fl.ANV_STAR_SCENARIOS || {})) { try { const p = fl.flagPattern('anv_battle', 'intact', 256, 192, { anvScenario: k }); res.anv_patterns[k] = { ok: !!(p && p.rgba && p.rgba.length) }; } catch (e) { res.anv_patterns[k] = { ok: false, error: String(e.message || e).slice(0, 160) }; } }
  for (const d of SCENE_DATES) res.statutory[d] = ev.unionStarsOn(d);
  return res;
});

// ---------------------------------------------------------------- engine
let E = null, structures = null, sched = null, works = null, hospitals = null;
await guard('engine', async () => {
  structures = rj('structures/structures.json'); sched = rj('structures/state_schedule.json'); works = rj('structures/works_stages.json'); hospitals = rj('structures/hospitals.json');
  E = makeStateEngine({ structures, sched, works, hospitals });
  const ids = [...new Set([...structures.structures.map(s => s.id), ...structures.structures.flatMap(s => (s.parts || []).map(p => p.id)), ...hospitals.hospitals.map(h => h.id)])].sort();
  const known = {}, rows = {}, scenarios = {};
  for (const id of ids) { known[id] = E.knows(id); rows[id] = E.rowsFor(id); scenarios[id] = E.scenariosFor(id); }
  // every id that a drawn object names as its record or state (data/structures3d.json), asked of the engine as the page asks it
  const d3 = rj('app/data/structures3d.json'), asked = new Set();
  const recId = x => (x && typeof x === 'object' ? x.id : x);
  for (const k of ['buildings', 'points', 'fences', 'roads']) for (const o of d3[k] || []) { const r = recId(o.rec); if (r) asked.add(r); if (o.state_id) asked.add(o.state_id); }
  const askedKnown = {}; for (const id of [...asked].sort()) { askedKnown[id] = E.knows(id); if (!(id in rows)) rows[id] = E.rowsFor(id); }
  // series of the objects the regression set and the pre-existing features name, at every integer minute and one second either side of every window bound of their rows
  const pre = structures.structures.filter(s => /^P-\d\d$/.test(s.id)).map(s => s.id).sort();
  const reg = ['bld-mcpherson-farm', 'bld-mcpherson-farm#house', 'bld-mcpherson-farm#barn', 'bld-bliss-farm', 'bld-bliss-farm#house', 'bld-bliss-farm#barn', 'RD-avenues', 'FEN-emmitsburg-road'].filter(id => E.knows(id));
  const extra = new Set();
  const addWin = w => { for (const x of w || []) if (x) { const m = parseIso(x); for (const dm of [-1000, 0, 1000]) extra.add(m + dm); } };
  for (const r of sched.rows) { const t = r.time || {}; addWin(t.window); addWin(t.begin); addWin(t.finish); for (const sc of Object.values(r.scenarios || {})) { addWin(sc.window); addWin(sc.begin); addWin(sc.finish); addWin(sc.phase_open); } }
  const times = [...new Set([...minuteGrid(), ...[...extra].filter(t => WINDOWS.some(([a, b]) => t >= a && t <= b))])].sort((a, b) => a - b);
  const series = {};
  const run = (id, sc) => {
    const runs = []; let last = null;
    for (const t of times) {
      const r = E.stateAt(id, t, sc);
      const sig = JSON.stringify([r.state, r.status, r.present ?? null, r.stage ?? null, r.progress == null ? null : Math.round(r.progress * 1e3) / 1e3]);
      if (sig !== last) { runs.push({ iso: isoOf(t), s: t % 60000 === 0 ? 0 : 1, state: r.state, status: r.status, present: r.present ?? null, stage: r.stage ?? null, progress: r.progress ?? null, rows: r.rows || [] }); last = sig; }
    }
    return runs;
  };
  for (const id of [...pre, ...reg]) { series[id] = {}; for (const sc of E.scenariosFor(id)) series[id][sc] = run(id, sc); }
  return { ids: ids.length, known, rows, scenarios, asked_known: askedKnown, preexisting: pre, regression_ids: reg, series, times: times.length };
});

// ---------------------------------------------------------------- model (the structures drawn)
let model = null, T = null;
await guard('model', async () => {
  if (!E) throw new Error('the state engine did not load');
  T = await (await imp('tools/node-terrain.mjs')).nodeTerrain();
  const { buildModel, CLASSES, T0_MS } = await imp('src/structures/model.mjs');
  const { Gazetteer } = await imp('src/history/gazetteer.mjs'), { buildObjects } = await imp('src/history/objects.mjs');
  const data = rj('app/data/structures3d.json'), gaz = new Gazetteer(rj('app/data/gazetteer.json')), OB = buildObjects({ raw: { structures, works }, gaz });
  model = buildModel({ data, T, engine: E, workObjs: OB.list.filter(o => o.at), workProgress: OB.progress });
  const pick = (m, ks) => { const o = {}; for (const k of ks) if (m && m[k] !== undefined) o[k] = m[k]; return o; };
  const objects = model.objects.map(o => ({ oid: o.oid, id: o.id, cls: o.cls, name: o.name, tier: o.tier, state_id: o.state_id || null, rec: o.rec || null, part: o.part || null, dropped: !!o.dropped,
    geometry: o.geometry ? pick(o.geometry, ['kind', 'represents', 'err', 'conf']) : null, meta: pick(o.meta, ['subtype', 'kind', 'status', 'built', 'present', 'conf', 'represents', 'gk', 'cls', 'style', 'recStyle', 'surface', 'pre_existing', 'place']) }));
  // the draw buffer (visibility flag of every object) at an hourly grid over both windows
  const vis = {}, last = {};
  let n = 0;
  for (const [a, b] of WINDOWS) for (let t = a; t <= b; t += 3600000) {
    n++; model.update((t - T0_MS) / 60000, null, null, true);
    for (const o of model.objects) { const v = model.stateBuf[o.oid * 8]; if (last[o.oid] !== v) { (vis[o.id] = vis[o.id] || []).push([isoOf(t), v]); last[o.oid] = v; } }
  }
  return { counts: model.counts, classes: CLASSES, objects, vis_runs: vis, vis_times: n };
});

// ---------------------------------------------------------------- ext layers
await guard('ext', async () => {
  const sp = await imp('src/ext/site-places.mjs');
  const mem = rj('app/data/site-memorials.json'), tour = rj('app/data/site-tour-stops.json');
  let years = null; try { years = rj('app/data/site-memorial-years.json'); } catch { years = null; }
  const grid = minuteGrid(), T0 = Date.UTC(1863, 5, 1), nonempty = [];
  for (const t of grid) { const o = sp.sceneObjectsAt((t - T0) / 60000); if (o && o.length) { nonempty.push({ iso: isoOf(t), n: o.length }); if (nonempty.length > 20) break; } }
  const terr = T || await (await imp('tools/node-terrain.mjs')).nodeTerrain();
  return { layer: { id: sp.LAYER.id, defaultOn: sp.LAYER.defaultOn, inScene: sp.LAYER.inScene, tier: sp.LAYER.tier }, minutes_checked: grid.length, scene_objects_nonempty: nonempty, memorials: sp.checkLaterMemorials(mem, terr, years), tour: sp.checkTourBookmarks(tour, terr) };
});

// ---------------------------------------------------------------- the layer part: artillery train and works draw lists
if (NO_LAYER) { out.train = null; out.works3d = null; out.sections.train = 'skipped'; out.sections.works3d = 'skipped'; } else {
  let L = null, stage = null, both = null, LT = null;
  await guard('train', async () => {
    const lib = await import(pathToFileURL(path.join(here, 'oob_layer_lib.mjs')).href);
    const B = await lib.build({ stage: true }); L = B.layer; LT = B.T; both = L.both({});
    stage = new B.Stage({ layer: L, world: B.world, T: B.T, geo: B.geo }); stage.loadScenario({});
    const { planArtillery, ArtilleryTrain, KIND, stagePoseAt } = await imp('src/structures/artillery.mjs');
    const train = rj('app/data/artillery-train.json'), bg = rj('app/data/battery-guns.json');
    const plan = planArtillery({ units: L.units, train, batteryGuns: bg, arrivals: both.arrivals }), AT = new ArtilleryTrain({ plan, train, units: L.units });
    const pose = stagePoseAt(stage, L.units.map(u => u.id), train.layout.train_turn_s);
    const day = (d, h = 0, m = 0) => (d - 1) * 1440 + h * 60 + m + 30 * 1440, times = [day(1, 14), day(2, 12), day(3, 14)];
    const kinds = Object.fromEntries(Object.entries(KIND).map(([k, v]) => [v, k])), res = { KIND, times: times.map(t => isoOf(Date.UTC(1863, 5, 1) + t * 60000)), batteries: plan.batteries.length, counts_at: [], by_army: { union: {}, confederate: {} } };
    for (const t of times) {
      const d = AT.at(t, pose, null), per = { union: {}, confederate: {} };
      for (const list of ['guns', 'limbers', 'caissons', 'wagons', 'horses', 'drivers']) {
        const arr = d[list], n = d.counts[list] || 0;
        for (let i = 0; i < n; i++) { const k = i * 8, kind = kinds[arr[k + 3]], side = L.units[arr[k + 4]] ? L.units[arr[k + 4]].side : 'unknown'; (per[side] = per[side] || {})[kind] = (per[side][kind] || 0) + 1; }
      }
      res.counts_at.push(per);
    }
    for (const per of res.counts_at) for (const [side, m] of Object.entries(per)) for (const [k, n] of Object.entries(m)) { const a = res.by_army[side] = res.by_army[side] || {}; a[k] = Math.max(a[k] || 0, n); }
    return res;
  });
  await guard('works3d', async () => {
    if (!L) throw new Error('the history layer did not build (see the train section)');
    const { buildWorks3D } = await imp('src/structures/works3d.mjs'), { Gazetteer } = await imp('src/history/gazetteer.mjs');
    const d3w = rj('app/data/works3d.json'), gaz = new Gazetteer(rj('app/data/gazetteer.json'));
    const W = buildWorks3D({ data: d3w, inputs: { structures, sched, works, hospitals }, T: LT, gaz, units: L.units, events: both.events });
    const pre = W.preexisting();
    const preIds = new Set(structures.structures.filter(s => /^P-\d\d$/.test(s.id)).map(s => s.id));
    return { works: W.works.map(o => ({ id: o.id, alias: o.alias || [], pre_existing: W.engine && W.engine.byId.get(o.id) ? W.engine.byId.get(o.id).preexisting === true : null })), preexisting: pre.map(p => ({ id: p.id, present: p.present, construction: p.construction, progress: p.progress })),
      pre_ids_in_works: W.works.filter(o => preIds.has(o.id) || (o.alias || []).some(a => preIds.has(a))).map(o => o.id) };
  });
}

fs.writeFileSync(OUT, JSON.stringify(out));

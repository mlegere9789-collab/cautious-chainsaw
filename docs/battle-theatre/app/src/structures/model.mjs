// The 3D structures of the Battle Theatre as data: objects (roads and railway, fences and walls, buildings and borough masses, markers), their meshes and instances in the
// terrain frame, their state at a time (from the port of check_structures.state_at), culling lists and picking. No GPU here: src/structures/gpu.mjs draws what this builds.
// Nothing is invented: geometry comes only from data/structures3d.json (built from the basemap1863 layers by tools/build-structures3d.mjs); dimensions the record prints are used
// as printed, the rest are generic class defaults, carried on every object as `form` with the tier plausible-procedural.
import { extrude, railPanelMesh, wormPanelMesh, stonePanelMesh, markerMesh, panelsAlong, clipRuns, ribbon, polyArea, centroidOf, GEN } from './geom.mjs';
import { visualOf } from './visual-state.mjs';

export const T0_MS = Date.UTC(1863, 5, 1);
export const msOfMin = tMin => T0_MS + Math.round(tMin * 60000);
export const CLASSES = ['roads', 'fences', 'buildings', 'masses', 'markers'];
export const CLASS_LABEL = { works: 'Works and pre-existing walls (rings at a named place)',  roads: 'Roads, lanes and railway', fences: 'Fences and walls', buildings: 'Buildings', masses: 'Borough building masses', markers: 'Markers (point-only structures, bridges, fords)' };
export const FENCE_GEN = { rail: { len: 3.35, h: 1.52, basis: 'generic post-and-rail (rails about 11 ft, height about 5 ft): PDF B.8.3 from a non-Gettysburg source (ECW-PostRail), flagged there as generic, not site data' },
  stone: { len: 3.0, h: 0.76, basis: 'generic low field wall, 2.5 ft: the Angle wall was originally about 2-3 ft (PDF B.7.3 P-01) and a critic gives about 2 ft (B.8.3); NOT the 48-52 in. of the rebuilt park walls' } };
// generic eave heights by catalogue subtype (storeys of GEN.storeyH metres unless `eave` is given): plausible-procedural class defaults
const EAVE = { farmhouse: 2, house: 2, bank_barn: { eave: 5.2 }, barn: { eave: 4.8 }, outbuilding: 1, building: 1.5, smokehouse: 1, stable: 1.2, wagon_shed: 1, log_building: 1.5, institutional: 2.5, church: 2.5, courthouse: 2, college_building: 3, seminary_building: 3, gatehouse: 1.5, railroad_station: 1.5, tavern: 2, school: 1.5, farmstead: 1.5, mill: 2.5, covered_bridge: 1 };
const eaveOf = b => { if (b.kind === 'mass') return { storeys: 2, eave: 2 * GEN.storeyH, doc: false, basis: 'schematic mass: two storeys, flat top (generic); the extent of drawn symbols is not a building' }; if (b.storeys) return { storeys: b.storeys.n, eave: b.storeys.n * GEN.storeyH, doc: true, basis: `${b.storeys.n} storeys documented (${b.storeys.basis}); storey height ${GEN.storeyH} m generic` };
  const e = EAVE[b.subtype] ?? 1.5; return typeof e === 'object' ? { storeys: null, eave: e.eave, doc: false, basis: `generic ${b.subtype} eave height ${e.eave} m (plausible-procedural class default)` } : { storeys: e, eave: e * GEN.storeyH, doc: false, basis: `generic ${b.subtype}: ${e} storeys of ${GEN.storeyH} m (plausible-procedural class default)` }; };
const MAT = { unspecified: 0, brick: 1, stone: 2, log: 3, frame: 4 };
export const MAT_NAME = ['unspecified wall (generic colour)', 'brick', 'stone', 'log', 'frame'];
const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

export function buildModel({ data, T, engine, hospitals = data.hospitals || [], workObjs = [], workProgress = null }) {
  const objects = [], byId = new Map(), half = [T.W / 2, T.H / 2];
  const XZ = c => T.xz(c[0], c[1]), gAt = (x, z) => T.h(x, z);
  const add = o => { o.oid = objects.length; objects.push(o); byId.set(o.id, o); return o; };
  const src = keys => (keys || []).map(k => ({ key: k, ...(data.srcTable[k] || {}) }));

  // ---- buildings and masses: one static mesh
  const bv = [], bi = [];
  for (const b of data.buildings) {
    const ring = b.ring.map(XZ), e = eaveOf(b), wallMat = b.kind === 'mass' ? 8 : (MAT[b.mat] ?? 0), roofMat = b.kind === 'mass' ? 6 : 5;
    const o = add({ cls: b.kind === 'mass' ? 'masses' : 'buildings', id: b.id, name: b.name, meta: b, ring, c: centroidOf(ring), area: polyArea(ring), tier: b.tier, state_id: b.state_id, rec: b.rec, part: b.part, geometry: { kind: b.gk, represents: b.represents, err: b.err, conf: b.conf }, sources: src(b.src) });
    const m = extrude(ring, { groundAt: gAt, obj: o.oid, wallMat, roofMat, flat: b.kind === 'mass', storeys: e.storeys, eaveOverride: e.eave });
    if (!m) { o.dropped = true; continue; }
    const base = bv.length / 10; for (const v of m.verts) bv.push(v); for (const i of m.idx) bi.push(i + base);
    o.form = { ...m.info, storeys_doc: e.doc, basis: e.basis, wall: b.kind === 'mass' ? 'schematic' : MAT_NAME[MAT[b.mat] ?? 0], wall_known: b.mat !== 'unspecified' && b.kind !== 'mass', roof: b.roof_text || 'generic roof (material not recorded)', tier: e.doc ? 'inferred' : 'plausible-procedural' };
    o.r = Math.sqrt(o.area) * 0.8 + 6;
  }
  // ---- fences: panel instances sorted by chunk
  const fi = [], chunks = []; let panelCount = 0;
  const panelsByStyle = { rail: 0, stone: 0, worm: 0 };
  for (const f of data.fences) {
    const style = f.recStyle || f.style, gen = style === 'stone' ? FENCE_GEN.stone : FENCE_GEN.rail, styleId = style === 'stone' ? 1 : style === 'worm' ? 2 : 0;
    const pts = f.coords.map(XZ), runs = clipRuns(pts, half[0], half[1]);
    const o = add({ cls: 'fences', id: f.id, name: f.rec ? `${f.rec.id.replace('FEN-', 'Fence line along ')} (${f.id})` : `Fence line ${f.id}`, meta: f, tier: f.tier, state_id: f.rec ? f.rec.id : null, rec: f.rec ? f.rec.id : null, geometry: { kind: 'line (modern OSM line confirmed on the 1868-69 sheet)', err: f.err, conf: f.conf, check: f.check }, sources: src(f.src), runs, style, length_m: f.len_m,
      form: { height: gen.h, panel: gen.len, basis: gen.basis, style_basis: f.recStyle ? `style of the record ${f.rec.id}` : '1863 style not read from the sheet; drawn as ' + (style === 'stone' ? 'a stone wall (the OSM mapping says stone)' : 'a generic rail fence'), tier: 'plausible-procedural' } });
    let n = 0, bbox = [1e9, 1e9, -1e9, -1e9];
    const first = fi.length / 8; let start = first, cx = 0, cz = 0, cnt = 0, lo = [1e9, 1e9], hi = [-1e9, -1e9];
    const flush = () => { if (!cnt) return; const c = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2]; chunks.push({ cx: c[0], cz: c[1], r: Math.hypot(hi[0] - lo[0], hi[1] - lo[1]) / 2 + 4, start, count: cnt, oid: o.oid }); start += cnt; cnt = 0; lo = [1e9, 1e9]; hi = [-1e9, -1e9]; };
    for (const run of runs) for (const p of panelsAlong(run, gen.len)) {
      fi.push(p[0], p[1], p[2], p[3], o.oid, styleId, gen.h, hash(n, o.oid)); n++; cnt++; panelsByStyle[style === 'stone' ? 'stone' : style === 'worm' ? 'worm' : 'rail']++;
      lo = [Math.min(lo[0], p[0], p[2]), Math.min(lo[1], p[1], p[3])]; hi = [Math.max(hi[0], p[0], p[2]), Math.max(hi[1], p[1], p[3])]; bbox = [Math.min(bbox[0], p[0], p[2]), Math.min(bbox[1], p[1], p[3]), Math.max(bbox[2], p[0], p[2]), Math.max(bbox[3], p[1], p[3])];
      if (cnt >= 12) flush();
    }
    flush(); o.panels = n; o.bbox = bbox; panelCount += n; if (!n) o.dropped = true;
  }
  // ---- markers
  const mi = [];
  for (const p of data.points) {
    const q = XZ(p.pt), o = add({ cls: 'markers', id: p.id, name: p.name, meta: p, tier: p.tier, state_id: p.state_id, rec: p.rec, part: p.part, c: q, geometry: { kind: p.gk, represents: p.represents, err: p.err, conf: p.conf }, sources: src(p.src), form: { basis: 'a point only: the marker is a labelled pole, not a building', tier: 'plausible-procedural' } });
    mi.push(q[0], q[1], o.oid, 1, { documented: 0, inferred: 1, 'plausible-procedural': 2, 'open gap': 3 }[p.tier] ?? 1, { building_point: 0, named_point: 1, bridge: 2, ford: 3, crossing: 4, trestle: 5, depot: 6 }[p.kind] ?? 0, 0, 0);
  }
  // ---- roads: ribbons in one mesh
  const rv = [], ri = []; const MATR = { macadam: 0, dirt: 1, cart: 2, rail: 3, grade: 4 };
  for (const r of data.roads) {
    const o = add({ cls: 'roads', id: r.id, name: r.name, meta: r, tier: r.tier, state_id: r.cls === 'rail_track' ? 'RD-gettysburg-railroad' : null, rec: null, geometry: { kind: 'line', err: r.err, conf: r.conf }, sources: src(r.src), lines: [], form: { surface: r.surface, width: r.width_m, basis: `${r.surface_basis}; width ${r.width_m} m ${r.width_basis}`, tier: r.surface_tier } });
    for (const l of r.lines) for (const run of clipRuns(l.map(XZ), half[0], half[1])) { ribbon(run, r.width_m / 2, { mat: MATR[r.surface] ?? 1, obj: o.oid, verts: rv, idx: ri }); o.lines.push(run); }
    if (!o.lines.length) o.dropped = true;
  }
  // ---- works and pre-existing walls: known only to a named place (no mapped line in the repository), so a ring of the place's sigma, drawn by the 2D overlay as before; here for selection and the card
  for (const w of workObjs) {
    if (!w.at) continue; const q = XZ([w.at.lng, w.at.lat]);
    add({ cls: 'works', id: w.id, name: w.name, meta: { place: w.at.place, printed_location: w.location_printed, pre_existing: w.pre_existing, note: w.note, built: w.built }, tier: w.tier, state_id: w.ref, rec: w.ref, work: w, c: q, r: w.at.sigma_m, geometry: { kind: `named place only (${w.at.place}): a ring of the place's own uncertainty`, represents: 'where the location text puts it; no line or footprint is mapped in the repository', err: w.at.sigma_m, conf: 'n/a' }, sources: (w.sources || []).map(k => ({ key: k })),
      form: { basis: w.pre_existing ? 'a pre-existing wall or fence: present from the first frame, never given a construction animation (PDF B.7.3)' : 'a work: built on screen over its printed window, never before its start (no work is pre-placed)', tier: w.tier } });
  }
  // meshes
  const rail = railPanelMesh(FENCE_GEN.rail.h), worm = wormPanelMesh(FENCE_GEN.rail.h), stone = stonePanelMesh(FENCE_GEN.stone.h), mk = markerMesh();
  const f32 = a => new Float32Array(a), u32 = a => new Uint32Array(a);
  const mesh = {
    roads: { verts: f32(rv), idx: u32(ri) }, buildings: { verts: f32(bv), idx: u32(bi) },
    rail: { verts: f32(rail.v), idx: u32(rail.i) }, worm: { verts: f32(worm.v), idx: u32(worm.i) }, stone: { verts: f32(stone.v), idx: u32(stone.i) }, marker: { verts: f32(mk.v), idx: u32(mk.i) },
    panels: f32(fi), markers: f32(mi), chunks,
  };

  // ---- state
  const nObj = objects.length, stateBuf = new Float32Array(nObj * 8), live = new Array(nObj).fill(null);
  const kindOf = o => (o.cls === 'fences' ? 'fence' : 'building');
  const hospOf = id => (data.hospitalOf && data.hospitalOf[id]) || [];
  const hospById = new Map(hospitals.map(h => [h.id, h]));
  let lastKey = '';
  function scenarioFor(o, choice) { if (!o.state_id) return 'default'; const c = choice && (choice[o.state_id] || choice[o.state_id.split('#')[0]]); return c && engine.scenariosFor(o.state_id).includes(c) ? c : 'default'; }
  // t: minutes since 1 June 1863 00:00; the answer is a pure function of (quantized t, scenarios): the same minute gives the same buffer however it was reached
  function update(tMin, choice = null, on = null, force = false) {
    const q = Math.floor(tMin * 4) / 4, key = q + '|' + JSON.stringify(choice || {}) + '|' + (on ? CLASSES.map(c => (on[c] === false ? 0 : 1)).join('') : '11111');
    if (!force && key === lastKey) return false; lastKey = key; const ms = msOfMin(q);
    for (const o of objects) {
      const i = o.oid * 8;
      if (o.dropped) { stateBuf.fill(0, i, i + 8); live[o.oid] = null; continue; }
      let st = null, v;
      if (o.cls === 'works') { st = engine.knows(o.state_id) ? engine.stateAt(o.state_id, ms, scenarioFor(o, choice)) : null; live[o.oid] = { st, v: null }; stateBuf.fill(0, i, i + 8); continue; }
      if (o.state_id && engine.knows(o.state_id)) { const sc = scenarioFor(o, choice); st = engine.stateAt(o.state_id, ms, sc); v = visualOf(kindOf(o), st); o._sc = sc; }
      else v = { vis: 1, A: [0, 0], B: [0, 0], mix: 0, uncertain: false, text: null };
      live[o.oid] = { st, v };
      stateBuf[i] = on && on[o.cls] === false ? 0 : v.vis; stateBuf[i + 1] = v.A[0]; stateBuf[i + 2] = v.A[1]; stateBuf[i + 3] = v.mix; stateBuf[i + 4] = v.B[0]; stateBuf[i + 5] = v.B[1]; stateBuf[i + 6] = v.uncertain ? 1 : 0; stateBuf[i + 7] = o.tier === 'documented' ? 0 : o.tier === 'inferred' ? 1 : 2;
    }
    return true;
  }
  // ---- hospitals on a building at a time: 'none' | 'opening' (inside a date window) | 'open' | 'closing' | 'closed' | 'untimed'
  function hospitalState(h, tMin) {
    const ms = msOfMin(tMin), P = x => (x ? Date.parse(x + ':00Z') : null), sw = h.setup_window && h.setup_window.window, cw = h.closing_window && h.closing_window.window;
    if (!sw) return { phase: 'untimed', note: 'no setup time is printed, so no marker is timed' };
    const e = P(sw[0]), l = P(sw[1]), lEnd = l != null && sw[1].endsWith('23:59') ? l + 60000 : l; let phase = 'none';
    if (lEnd != null && ms >= lEnd) phase = 'open'; else if (e != null && ms >= e) phase = 'opening';
    const note = e == null ? `set up by ${sw[1]}; the earlier time is not printed` : (l == null ? 'only an earliest time is printed' : null);
    if (cw && phase !== 'none') { const ce = P(cw[0]), cl = P(cw[1]), clEnd = cl != null && cw[1].endsWith('23:59') ? cl + 60000 : cl; if (clEnd != null && ms >= clEnd) phase = 'closed'; else if (ce != null && ms >= ce) phase = 'closing'; }
    return { phase, note };
  }
  function hospitalsOf(o, tMin) { const ids = new Set([...(o.rec ? hospOf(o.rec) : []), ...(o.state_id && o.state_id !== o.rec ? hospOf(o.state_id) : [])]); return [...ids].map(id => ({ h: hospById.get(id), id, ...hospitalState(hospById.get(id), tMin) })).filter(x => x.h); }

  // ---- culling: fences into visible lists (full panels near, impostors mid), returns counts
  const nearD = 170, farD = 1600;
  const outNear = new Float32Array(Math.max(8, panelCount * 8)), outFar = new Float32Array(Math.max(8, panelCount * 8)), outStone = new Float32Array(Math.max(8, panelCount * 8)), outWorm = new Float32Array(Math.max(8, panelCount * 8));
  const vis = { near: 0, far: 0, stone: 0, worm: 0, chunks: 0 };
  function cullFences(cam, on = true) {
    vis.near = vis.far = vis.stone = vis.worm = vis.chunks = 0; if (!on) return vis; const pl = cam.planes, P = mesh.panels;
    for (const c of chunks) {
      const dx = c.cx - cam.x, dz = c.cz - cam.z, d = Math.max(0, Math.hypot(dx, dz, cam.y - T.h(c.cx, c.cz) - 2) - c.r); if (d > farD) continue;
      let ok = true; const cy = T.h(c.cx, c.cz) + 2; for (let k = 0; k < 24; k += 4) if (pl[k] * c.cx + pl[k + 1] * cy + pl[k + 2] * c.cz + pl[k + 3] < -c.r - 3) { ok = false; break; } if (!ok) continue;
      vis.chunks++; const seg = P.subarray(c.start * 8, (c.start + c.count) * 8), sty = P[c.start * 8 + 5];
      if (d <= nearD + 30) { if (sty === 1) { outStone.set(seg, vis.stone * 8); vis.stone += c.count; } else if (sty === 2) { outWorm.set(seg, vis.worm * 8); vis.worm += c.count; } else { outNear.set(seg, vis.near * 8); vis.near += c.count; } }
      if (d > nearD - 30) { outFar.set(seg, vis.far * 8); vis.far += c.count; }
    }
    return vis;
  }
  // ---- picking. project(x, y, z, out) -> bool (css pixels, out[2] = w). Returns { oid, d } or null
  const poly = new Float32Array(2 * 400);
  function pick(px, py, project, on, camPos) {
    const p = [0, 0, 0]; let best = null; const consider = (o, d, bonus = 0) => { if (!best || d - bonus < best.d) best = { oid: o.oid, d: d - bonus, o }; };
    for (const o of objects) {
      if (o.dropped || !on[o.cls]) continue; const cx = o.c ? o.c[0] : (o.bbox ? (o.bbox[0] + o.bbox[2]) / 2 : 0), cz = o.c ? o.c[1] : (o.bbox ? (o.bbox[1] + o.bbox[3]) / 2 : 0);
      if (o.cls !== 'roads' && camPos && Math.hypot(cx - camPos.x, cz - camPos.z) > 2600) continue;
      if (o.cls === 'buildings' || o.cls === 'masses') {
        let n = 0, ok = true; const r = o.ring; const y = o.form ? o.form.floorY + o.form.eaveH * 0.5 : T.h(cx, cz) + 3;
        for (const q of r) { if (!project(q[0], y, q[1], p)) { ok = false; break; } if (n < 400) { poly[n * 2] = p[0]; poly[n * 2 + 1] = p[1]; n++; } }
        if (ok && n >= 3) { let inside = false; for (let a = 0, b = n - 1; a < n; b = a++) { const xi = poly[a * 2], yi = poly[a * 2 + 1], xj = poly[b * 2], yj = poly[b * 2 + 1]; if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside; } if (inside) { consider(o, 0, o.cls === 'buildings' ? 2 : 0); continue; } }
        if (project(cx, y, cz, p)) { const d = Math.hypot(p[0] - px, p[1] - py); if (d < 14) consider(o, d + 3); }
      } else if (o.cls === 'markers') {
        if (project(o.c[0], T.h(o.c[0], o.c[1]) + 4.6, o.c[1], p)) { const d = Math.hypot(p[0] - px, p[1] - py); if (d < 18) consider(o, d, 8); }
      } else if (o.cls === 'works') {
        if (project(o.c[0], T.h(o.c[0], o.c[1]) + 1.5, o.c[1], p)) { const q = [0, 0, 0]; let rpx = 12; if (project(o.c[0] + o.r, T.h(o.c[0] + o.r, o.c[1]) + 1.5, o.c[1], q)) rpx = Math.max(12, Math.hypot(q[0] - p[0], q[1] - p[1])); const d = Math.hypot(p[0] - px, p[1] - py); if (d <= rpx + 6 && (!best || best.d > 90)) consider(o, 90 + d / 10); }
      } else if (o.cls === 'fences' || o.cls === 'roads') {
        const lines = o.cls === 'fences' ? o.runs : o.lines, lim = o.cls === 'fences' ? 8 : 6; let m = 1e9;
        for (const run of lines) { let prev = null; for (let k = 0; k < run.length; k += Math.max(1, Math.floor(run.length / 200))) { const q = run[k]; if (!project(q[0], T.h(q[0], q[1]) + (o.cls === 'fences' ? 0.8 : 0.1), q[1], p)) { prev = null; continue; } const cur = [p[0], p[1]]; if (prev) { const dx = cur[0] - prev[0], dy = cur[1] - prev[1], l2 = dx * dx + dy * dy; let t = l2 ? ((px - prev[0]) * dx + (py - prev[1]) * dy) / l2 : 0; t = Math.max(0, Math.min(1, t)); m = Math.min(m, Math.hypot(px - prev[0] - t * dx, py - prev[1] - t * dy)); } prev = cur; } }
        if (m < lim) consider(o, m, o.cls === 'fences' ? 1 : -6);
      }
    }
    return best;
  }
  // ---- describe: everything the card shows, as data
  function describe(oid, tMin, choice = null) {
    const o = objects[oid]; if (!o) return null; const L = live[oid], ms = msOfMin(tMin);
    const st = L && L.st, sc = o.state_id ? scenarioFor(o, choice) : 'default', fresh = o.state_id && engine.knows(o.state_id) ? engine.stateAt(o.state_id, ms, sc) : null;
    return { oid, id: o.id, cls: o.cls, name: o.name, tier: o.tier, geometry: o.geometry, form: o.form || null, sources: o.sources, record: o.rec, part: o.part, state_id: o.state_id,
      state: fresh, visual: fresh ? visualOf(kindOf(o), fresh) : null, scenario: sc, scenarios: o.state_id && engine.knows(o.state_id) ? engine.scenariosFor(o.state_id) : [], rows: fresh ? fresh.rows || [] : [],
      hospitals: o.cls === 'buildings' || o.cls === 'markers' ? hospitalsOf(o, tMin) : [], meta: o.meta, status: st && st.status, progress: o.cls === 'works' && workProgress ? workProgress(o.work, tMin) : null };
  }
  const focusOf = o => (o.c ? o.c : o.bbox ? [(o.bbox[0] + o.bbox[2]) / 2, (o.bbox[1] + o.bbox[3]) / 2] : o.lines && o.lines[0] ? o.lines[0][Math.floor(o.lines[0].length / 2)] : [0, 0]);
  const counts = { works: objects.filter(o => o.cls === 'works').length, objects: nObj, dropped: objects.filter(o => o.dropped).length, buildings: objects.filter(o => o.cls === 'buildings' && !o.dropped).length, masses: objects.filter(o => o.cls === 'masses' && !o.dropped).length, fences: objects.filter(o => o.cls === 'fences' && !o.dropped).length, panels: panelCount, panelsByStyle, markers: objects.filter(o => o.cls === 'markers').length,
    roads: objects.filter(o => o.cls === 'roads' && !o.dropped).length, roadVerts: rv.length / 6, buildingVerts: bv.length / 10, buildingTris: bi.length / 3, roadTris: ri.length / 3, chunks: chunks.length };
  return { objects, byId, mesh, stateBuf, focusOf, hospitalState, update, describe, cullFences, vis, pick, hospitalsOf, scenarioFor, counts, live, bufs: { near: outNear, far: outFar, stone: outStone, worm: outWorm }, lod: { nearD, farD }, nObj };
}

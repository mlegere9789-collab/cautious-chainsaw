// The vegetation of July 1863 in the theatre (requirement R20, gate Q21): crop, meadow and stubble fields, woodlots, orchards, thickets and single trees, with the state of each at
// the minute of the clock (standing, being cut, cut, trampled where the troops the theatre draws walked, trees stripped where the record says so), every part tagged with its tier and
// the claims that bear on it. The data is data/vegetation.json (tools/bt/vegetation); the state is the pure function of model.mjs; the drawing is gl.mjs (WebGL2 only: on WebGPU the
// panel says so and nothing is drawn). The panel (More, then Vegetation of July 1863) holds the switches, the three source conflicts as choices, a card for the ground under the
// cross-hair, a list of places to look at, the tiers and the gaps. ?veg=off keeps the whole module out of a visit.
import { VegModel, stateAt, checkVegetation, scenarioOption, isoMin, minToIso, TIERS, weakest, SEASON_SPLIT, sceneMinute } from './model.mjs';
import { buildDecals, buildTrees, LAYER } from './mesh.mjs';
import { VegGL } from './gl.mjs';
import { makeGrid, rasterMask, VisitPlanner, stageProvider } from './plan.mjs';
import { SHELL } from './shell.mjs';

export const ID = 'vegetation';
export const TITLE = 'Vegetation of July 1863';
const SHELL_DEFAULT = false;                                // the standing crop near the camera (shell.mjs): ?vegshell=on / ?vegshell=off decide a visit; this is the default
const wantShell = () => { const q = globalThis.location ? globalThis.location.search : ''; return /[?&]vegshell=on\b/.test(q) ? true : /[?&]vegshell=off\b/.test(q) ? false : SHELL_DEFAULT; };
let S = null;                                              // the state of one visit: set by init, cleared by dispose (a module object outlives a visit)

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pct = x => Math.round(100 * x) + '%';
const fm = x => (Math.round(x * 100) / 100).toFixed(2);

export async function init(ctx) {
  S = null;
  if (/[?&]veg=off\b/.test(globalThis.location ? globalThis.location.search : '')) return;           // like ?fx=off and ?crowd=off: the visit goes on without it
  const th = ctx.theatre, res = await fetch(ctx.urls.data + 'vegetation.json');
  if (!res.ok) throw new Error(`the vegetation data could not be read (HTTP ${res.status})`);
  const data = await res.json(); if (th.dead) return;
  const model = new VegModel(data), T = th.T, project = (lng, lat) => T.xz(lng, lat);
  const ground = { W: T.W, H: T.H };
  const s = S = { ctx, th, model, T, project, ground, on: true, local: {}, t: th.state.t, cam: null, tq: null, gl: null, planner: null, grid: null, ready: false, status: '', stats: {}, ac: new AbortController(), offs: [], panel: null, toggle: null, tierToggle: null, chip: null, box: null, pickT: 0, picked: null, idx: null, rings: null, planDone: false };
  s.status = ctx.host.api === 'webgl2' ? 'starting' : 'not drawn: the renderer in use is ' + ctx.host.api + '; the vegetation is drawn on WebGL2 only';
  buildIndex(s);
  s.toggle = ctx.registerLayerToggle(ID, TITLE, () => !!(S && S.on), v => setOn(!!v));
  s.tierToggle = ctx.registerLayerToggle(ID + '-tiers', 'Vegetation: show the tier on the ground', () => !!(S && S.gl && S.gl.on.overlay), v => setOverlay(!!v));
  s.shellToggle = ctx.host.api === 'webgl2' ? ctx.registerLayerToggle(ID + '-crop', 'Vegetation: standing crops near the camera', () => !!(S && S.gl && S.gl.on.shell), v => setShell(!!v)) : null;
  s.panel = ctx.registerPanel(ID, TITLE, renderPanel);
  if (ctx.host.api === 'webgl2') {
    const t0 = performance.now(), decals = buildDecals(model, project), trees = buildTrees(model, project, ground);
    addWitnessTrees(s, trees, model, project);
    s.build = { decalMs: 0, ms: Math.round(performance.now() - t0), decalTriangles: decals.triangles, trees: trees.n, notClean: decals.notClean };
    s.gl = new VegGL(ctx.host, model, decals, trees, { ground, shell: wantShell() }); s.trees = trees;
    s.hook = ctx.host.addSceneHook({ scene: (gl, R) => { if (S && S.on && S.cam) S.gl.scene(gl, R, S.cam, S.t); }, shadow: (gl, c, R) => { if (S && S.on && S.cam) S.gl.shadow(gl, c, R, S.cam); } });
    startPlanner(s);
    s.status = 'drawn on WebGL2';
  }
  s.offs.push(th.bus.on('scenario', () => { if (S) { startPlanner(S); S.tq = null; } }));
  mountChip(s);
  th.vegetation = { model, check: opts => checkVegetation(model, opts), stateAt: (id, t, choices) => stateAt(model, id, t, choices || effChoices(S)), status: () => statusOf(), setOn: v => (S ? S.toggle.set(!!v) : false), setOverlay: v => (S ? S.tierToggle.set(!!v) : false), setShell: v => (S && S.shellToggle ? S.shellToggle.set(!!v) : false), pick: (x, z) => pickUnit(S, x, z),
    whenReady: () => whenReady(), choose: (id, key) => choose(id, key), planner: () => S && S.planner, effChoices: () => effChoices(S),
    card: (id, t) => { const s = S; if (!s) return null; const u = s.model.unit(id); return u ? unitCard(s, u, t == null ? s.t : t) : null; } };
}

function whenReady() { return new Promise(res => { const tick = () => { if (!S || S.planDone || !S.planner) return res(statusOf()); setTimeout(tick, 40); }; tick(); }); }
function statusOf() {
  const s = S; if (!s) return null;
  return { on: s.on, api: s.ctx.host.api, status: s.status, units: s.model.units.length, claims: s.model.data.claims.length, trees: s.trees ? s.trees.n : 0, decalTriangles: s.gl ? s.gl.stats.decalTris : 0, treesDrawn: s.gl ? s.gl.stats.treesDrawn : 0, chunksNear: s.gl ? s.gl.stats.chunksNear : 0, chunksFar: s.gl ? s.gl.stats.chunksFar : 0,
    stateWrites: s.gl ? s.gl.stats.stateWrites : 0, shell: s.gl ? { on: s.gl.on.shell, ready: !!s.gl.shell, why: s.gl.shellWhy, chunks: s.gl.stats.shellChunks || 0, tris: s.gl.stats.shellTris || 0, cached: s.gl.shell ? s.gl.shell.cache.map.size : 0, layers: SHELL.layers, range: SHELL.range } : null, plan: s.planner ? { done: s.planner.done, steps: s.planner.steps, marked: s.planner.marked, from: minToIso(s.planner.from), to: minToIso(s.planner.to) } : null, overlay: s.gl ? s.gl.on.overlay : false, local: { ...s.local }, build: s.build, gpuBytes: s.gl ? s.gl.mem : 0 };
}

function effChoices(s) { let live = {}; try { live = { ...s.ctx.choices() }; } catch { /* the shell's choices are not there */ } return { ...live, ...s.local }; }
function choose(id, key) { const s = S; if (!s || !s.model.scenarios[id] || !s.model.scenarios[id].options[key]) return false; s.local[id] = key; s.tq = null; s.th.announce(`${s.model.scenarios[id].title}: ${s.model.scenarios[id].options[key].label}.`); if (s.panel.isOpen()) s.panel.refresh(); return true; }
function setOn(v) { const s = S; if (!s) return; s.on = v; if (s.chip) s.chip.hidden = !v; s.th.announce(v ? 'Vegetation of July 1863 shown.' : 'Vegetation of July 1863 hidden.'); }
function setShell(v) {
  const s = S; if (!s || !s.gl) return; const ok = s.gl.enableShell(v);
  s.th.announce(v ? (ok ? 'Standing crops are drawn near the camera.' : 'Standing crops could not be drawn on this graphics driver.') : 'Standing crops are no longer drawn near the camera.'); if (s.panel && s.panel.isOpen()) s.panel.refresh();
}
function setOverlay(v) { const s = S; if (!s || !s.gl) return; s.gl.on.overlay = v; s.th.announce(v ? 'The tier of every field and wood is shown on the ground.' : 'The tier is no longer shown on the ground.'); }

// ---------------------------------------------------------------------------------------------------------------------------------------------- the trees that have a name
function addWitnessTrees(s, trees, model, project) {
  const W = model.data.witness_trees || []; if (!W.length) return; const sp = model.speciesList, extra = new Float32Array(W.length * 9);
  W.forEach((w, i) => { const [x, z] = project(w.lnglat[0], w.lnglat[1]), o = i * 9; extra[o] = x; extra[o + 1] = z; extra[o + 2] = (w.h_m[0] + w.h_m[1]) / 2; extra[o + 3] = (w.r_m[0] + w.r_m[1]) / 2; extra[o + 4] = sp.indexOf(w.species); extra[o + 5] = 0.05; extra[o + 6] = 1; extra[o + 7] = 0; extra[o + 8] = model.units.length; });
  const merged = new Float32Array(trees.data.length + extra.length); merged.set(trees.data); merged.set(extra, trees.data.length);
  // each witness tree is drawn through a chunk of its own, so that the camera culls it by its own place (never thinned: seed 0.05 is below every keep value)
  W.forEach((w, i) => trees.chunks.push({ ix: -1, iz: -1, cx: extra[i * 9], cz: extra[i * 9 + 1], off: trees.n + i, n: 1, witness: true })); trees.data = merged; trees.n += W.length;
}

// ---------------------------------------------------------------------------------------------------------------------------------------------- the trample plan
function startPlanner(s) {
  const th = s.th, st = th.stage; s.planDone = false; stopPump(s);
  if (!st || !st.cache || !st.presence || !st.bbox || !st.layer || !s.gl) { s.planner = null; s.planDone = true; return; }
  if (!s.grid) { s.grid = makeGrid(s.ground.W, s.ground.H, 8); s.maskCells = rasterMask(s.model, s.project, s.grid); } else s.grid.visit.fill(1e9);
  s.planner = new VisitPlanner(s.grid, stageProvider(st), isoMin('1863-06-30T00:00'), isoMin('1863-07-08T00:00'), 8); s.uploaded = 0;
  pumpPlan(s);
}
// The plan is computed in the idle time between frames as well as in a slice of every frame: a slow frame (a phone, a software renderer) must not make the trampling wait for hundreds of
// frames. The pump only computes (pure JS, no GL call): the table is uploaded by update(), inside the frame.
function pumpPlan(s) {
  const ric = globalThis.requestIdleCallback, cic = globalThis.cancelIdleCallback, p = s.planner; if (!p || p.done) return;
  const step = dl => {
    s.pumpId = null; if (S !== s || s.planner !== p || p.done) return;
    const budget = dl && typeof dl.timeRemaining === 'function' ? Math.min(14, Math.max(3, dl.timeRemaining() - 1)) : 8;
    p.run(budget, () => performance.now()); s.planVersion = (s.planVersion || 0) + 1;
    if (!p.done) arm();
  };
  const arm = () => { s.pumpId = typeof ric === 'function' ? ric(step, { timeout: 100 }) : setTimeout(step, 20); };
  s.pumpCancel = () => { if (s.pumpId != null) { try { if (typeof ric === 'function' && typeof cic === 'function') cic(s.pumpId); else clearTimeout(s.pumpId); } catch { /* gone */ } s.pumpId = null; } };
  arm();
}
function stopPump(s) { if (s && s.pumpCancel) { s.pumpCancel(); s.pumpCancel = null; } }

// ---------------------------------------------------------------------------------------------------------------------------------------------- picking the ground under the cross-hair
function buildIndex(s) {
  const CELL = 120, W = s.ground.W, H = s.ground.H, nx = Math.ceil(W / CELL), nz = Math.ceil(H / CELL), cells = new Array(nx * nz);
  s.rings = s.model.units.map(u => { const r = u.rings[0], a = new Float32Array(r.length); for (let i = 0; i < r.length; i += 2) { const p = s.project(r[i], r[i + 1]); a[i] = p[0]; a[i + 1] = p[1]; } return a; });
  s.model.units.forEach((u, k) => { const a = s.rings[k]; let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (let i = 0; i < a.length; i += 2) { x0 = Math.min(x0, a[i]); x1 = Math.max(x1, a[i]); z0 = Math.min(z0, a[i + 1]); z1 = Math.max(z1, a[i + 1]); }
    const i0 = Math.max(0, Math.floor((x0 + W / 2) / CELL)), i1 = Math.min(nx - 1, Math.floor((x1 + W / 2) / CELL)), j0 = Math.max(0, Math.floor((z0 + H / 2) / CELL)), j1 = Math.min(nz - 1, Math.floor((z1 + H / 2) / CELL));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) (cells[j * nx + i] ||= []).push(k); });
  s.idx = { CELL, nx, nz, cells, W, H };
}
export function pickUnit(s, x, z) {
  if (!s || !s.idx) return null; const { CELL, nx, nz, cells, W, H } = s.idx, i = Math.floor((x + W / 2) / CELL), j = Math.floor((z + H / 2) / CELL); if (i < 0 || j < 0 || i >= nx || j >= nz) return null;
  const c = (cells[j * nx + i] || []).slice().sort((a, b) => (LAYER[s.model.units[b].cls] ?? 0) - (LAYER[s.model.units[a].cls] ?? 0));
  for (const k of c) { const a = s.rings[k]; let inside = false; for (let p = 0, q = a.length - 2; p < a.length; q = p, p += 2) { if ((a[p + 1] > z) !== (a[q + 1] > z) && x < (a[q] - a[p]) * (z - a[p + 1]) / (a[q + 1] - a[p + 1]) + a[p]) inside = !inside; } if (inside) return s.model.units[k]; }
  return null;
}
function target(s, cam) {          // the ground point under the centre of the picture: march along the view ray until it goes under the terrain
  const cp = Math.cos(cam.pitch), d = [Math.sin(cam.yaw) * cp, Math.sin(cam.pitch), Math.cos(cam.yaw) * cp]; let t = 4;
  for (let n = 0; n < 900; n++) { const x = cam.x + d[0] * t, y = cam.y + d[1] * t, z = cam.z + d[2] * t; if (y <= s.T.h(x, z)) return [x, z]; t += Math.max(4, t * 0.012); if (t > 9000) break; }
  return null;
}

// ---------------------------------------------------------------------------------------------------------------------------------------------- the frame
export function update(frame) {
  const s = S; if (!s) return; s.t = frame.tMin; s.cam = frame.cam;
  if (s.gl && s.on) {
    const tq = sceneMinute(s.t), ch = effChoices(s), key = JSON.stringify([ch['CF-VEG-LRT'], ch['CF-VEG-RAIN'], ch['CF-VEG-HARVEST']]), now = performance.now();
    // the state of every unit is written when the quantised minute or a choice changes; while the clock runs fast it is written at most every 90 ms (a settled or paused clock is always written at once, so the same minute always gives the same picture)
    if (frame.paused || !s.lastWrite || now - s.lastWrite > 90 || key !== s.gl.choicesKey) { if (s.gl.setTime(tq, ch, key)) s.lastWrite = now; }
    if (s.planner && !s.planner.done) { s.planner.run(4, () => performance.now()); s.planVersion = (s.planVersion || 0) + 1; }
    const p = s.planner;
    if (p) {                                                           // the table goes to the GPU every 150 steps while the plan runs, and once more when it is whole
      if (p.done ? !s.planDone : p.steps - (s.uploaded || 0) >= 150) {
        s.gl.setVisit(s.grid); s.uploaded = p.steps;
        if (p.done) { s.planDone = true; s.status = 'drawn on WebGL2; the trampling follows the troops of the theatre'; }
      }
    } else if (!s.planDone) s.planDone = true;
  }
  if (s.panel && s.panel.isOpen() && s.box && frame.tMin !== s.pickT) { s.pickT = frame.tMin; const now = performance.now(); if (!s.lastCard || now - s.lastCard > 400) { s.lastCard = now; try { paintCard(s); } catch (e) { const c = s.box && s.box.querySelector('#veg-card'); if (c) c.textContent = 'The card of this ground could not be written (' + (e && e.message) + ').'; } } }
}

// ---------------------------------------------------------------------------------------------------------------------------------------------- the notice on the picture
function mountChip(s) {
  const th = s.th, left = th.root && th.root.querySelector('#bt-left'); if (!left) return;
  const el = document.createElement('div'); el.id = 'veg-chip'; el.className = 'legend'; el.setAttribute('aria-label', 'Vegetation of July 1863 is shown'); el.style.cssText = 'margin-top:0;align-items:center';
  const c = s.model.data.meta.counts, tiers = s.model.data.meta.tiers.field_crops;
  el.innerHTML = `<span>${s.ctx.tierMark('plausible-procedural')}</span><span><b style="color:var(--text)">Vegetation of 1863 shown</b></span><span>A reconstruction: ${tiers.documented || 0} documented field, ${tiers.inferred || 0} placed by a rule and ${tiers['plausible-procedural'] || 0} drawn from the district's crop mix; every tree is placed by a seeded scatter.</span><span><button type="button" class="btn-s" data-veg="about" style="min-height:28px">About it</button> <button type="button" class="btn-s" data-veg="tiers" style="min-height:28px">Show tiers</button> <button type="button" class="btn-s" data-veg="hide" style="min-height:28px">Hide</button></span>`;
  el.addEventListener('click', e => { const b = e.target && e.target.closest ? e.target.closest('[data-veg]') : null; if (!b || !S) return; if (b.dataset.veg === 'hide') S.toggle.set(false); else if (b.dataset.veg === 'about') S.panel.open(); else if (b.dataset.veg === 'tiers') S.tierToggle.set(!(S.gl && S.gl.on.overlay)); }, { signal: s.ac.signal });
  const clock = left.querySelector('.clockface'); if (clock) clock.after(el); else left.prepend(el); s.chip = el; el.hidden = !s.on;
}

// ---------------------------------------------------------------------------------------------------------------------------------------------- the panel
const PLACES = [['The Rose Wheatfield', 'LC-FIELD-0001'], ['The Peach Orchard', 'LC-ORCH-0206'], ["Culp's Hill timber", 'LC-WOOD-0001'], ['Big Round Top forest', 'LC-WOOD-0002'], ['Herbst Woods', 'LC-WOOD-0010'], ['Little Round Top, west slope (cleared)', 'LC-OPEN-0001'], ['Little Round Top, east slope (wooded)', 'LC-WOOD-LRT-E'], ['Plum Run bottom: marsh and thicket', 'LC-WET-0001'], ['Devil\'s Den boulder ground', 'LC-BOULD-0001']];
function centroidLL(u) { const r = u.rings[0]; let x = 0, y = 0, n = 0; for (let i = 0; i < r.length; i += 2) { x += r[i]; y += r[i + 1]; n++; } return [x / n, y / n]; }
function srcLabel(s, c) { const k = c.src.split('#')[0], t = s.model.data.meta.source_titles[k] || k, l = c.loc || {}; return `${t}${l.report ? ', ' + String(l.who || l.report).replace(/^OR27-\d-R\d+\s*/, '') : ''}${l.page ? ', p. ' + l.page : l.pdf_page ? ', PDF page ' + l.pdf_page : ''}`; }
function claimHTML(s, id, role) {
  const c = s.model.claims.get(id); if (!c) return ''; const tm = s.ctx.tierMark;
  return `<li class="veg-claim"><div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">${tm(c.tier)}<span class="pill">${esc(role === 'exact' ? 'names this polygon' : role === 'nearest' ? 'placed by a rule' : 'the neighbourhood')}</span></div><blockquote style="margin:6px 0 2px;font-style:italic">“${esc(c.quote)}”</blockquote><div class="mini">${esc(srcLabel(s, c))}</div><div class="mini">${esc(c.says)}${c.note ? ' ' + esc(c.note) : ''}</div></li>`;
}
function unitCard(s, u, t) {
  const st = stateAt(s.model, u, t, effChoices(s)), tm = s.ctx.tierMark, g = st.ground, tr = st.trees, rows = [];
  const row = (k, v, tier) => rows.push(`<tr><th scope="row" style="text-align:left;padding-right:10px">${esc(k)}</th><td>${v}</td><td>${tier ? tm(tier) : ''}</td></tr>`);
  const head = u.name || ({ field: 'A field of open ground', wheatfield: 'The Rose Wheatfield', woods: 'A woodlot', scatter: 'Scattered trees', orchard: 'An orchard', marsh: 'Marshy ground', boulder: 'Boulder ground', cleared: 'Open ground on a slope' }[u.cls] || u.cls);
  if (g && g.crop !== 'forest_floor') { row('Cover', esc(g.label), st.tiers.crop); row('Stage', esc(g.stage.replace(/_/g, ' ')), st.tiers.stage); if (g.h[1] > 0.02) row('Height', `${fm(g.h[0])} to ${fm(g.h[1])} m`, st.tiers.height); if (g.cut > 0) row('Cut', pct(g.cut) + (g.cutAt != null ? ` (from ${minToIso(g.cutAt).replace('T', ' ')})` : ''), 'plausible-procedural'); if (g.trample > 0.005) row('Trampled', pct(g.trample), st.tiers.damage); if (g.lodging > 0.005) row('Laid flat by rain', pct(g.lodging), 'plausible-procedural'); }
  if (tr) { row('Leaf cover', pct(tr.leaf), st.tiers.leaf); if (tr.strip > 0.005) row('Trees stripped by fire', pct(tr.strip), st.tiers.damage); if (u.woods) { row('Trees', `${Math.round(u.woods.per_ha)} per hectare; understory ${esc(u.woods.understory)}`, 'plausible-procedural'); row('Species', esc(Object.entries(u.woods.species).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${s.model.species[k].label} ${pct(v)}`).join(', ')), st.tiers.species); } if (u.orchard) { row('Orchard', `${esc(s.model.data.orchard_classes[u.orchard.class].label)}, trees ${fm(u.orchard.spacing_m)} m apart`, u.orchard.age_tier); row('Fruit', esc(Object.entries(st.fruit).map(([k, f]) => `${k} ${f.stage.replace(/_/g, ' ')}`).join('; ')), st.tiers.fruit); } }
  if (st.scenario) row('Reading', esc(st.scenario.note), st.tiers.cover);
  row('Outline', `${u.area_ac} acres: ${esc(u.geom_note || 'from the land-cover layer of the 1863 base map (Warren survey of 1868-69, placed to 30 to 40 m)')}`, st.tiers.geometry);
  const placed = (u.claims || []).filter(([, r]) => r !== 'area'), area = (u.claims || []).filter(([, r]) => r === 'area');
  const why = u.crop_basis === 'district_mix' ? '<p class="mini">The crop of this cell is not documented: it is a seeded draw from the district\'s mix of crops (the acreages of eight farms\' damage claims).</p>' : u.crop_basis === 'farm_inventory' ? '<p class="mini">The farm\'s record names a field of this crop; which cell it was is a seeded choice among those nearest the farmstead.</p>' : '';
  const ev = (st.events || []).map(id => s.model.events.get(id)).filter(Boolean);
  return `<h3 style="margin:6px 0">${esc(head)}</h3><div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">${tm(st.tier)}<span class="pill">${esc(u.cls)}</span><span class="pill">${esc(minToIso(t).replace('T', ' '))}</span></div><table class="mini" style="border-collapse:collapse">${rows.join('')}</table>${why}`
    + (ev.length ? `<h4>Damage on the record</h4><ul class="list">${ev.map(e => `<li><b>${esc(e.label)}</b> ${tm(e.tier)} <span class="mini">${esc(e.basis)}</span></li>`).join('')}</ul>` : '')
    + (placed.length ? `<h4>What the record says here</h4><ul class="list">${placed.slice(0, 6).map(([id, r]) => claimHTML(s, id, r)).join('')}</ul>` : '<p class="mini">No claim names this ground; its state follows the calendar and the seeded draws, and says so.</p>')
    + (area.length ? `<details><summary class="mini">${area.length} more passage${area.length > 1 ? 's' : ''} about the neighbourhood</summary><ul class="list">${area.slice(0, 12).map(([id, r]) => claimHTML(s, id, r)).join('')}</ul></details>` : '');
}
function paintCard(s) {
  const box = s.box && s.box.querySelector('#veg-card'); if (!box || !s.cam) return; const p = target(s, s.cam), u = p ? pickUnit(s, p[0], p[1]) : null; s.picked = u ? u.id : null;
  box.innerHTML = u ? unitCard(s, u, s.t) : '<p class="mini">Look at a field, a wood or an orchard: the card names what is under the centre of the picture.</p>';
}
function renderPanel(box, th, sc) {
  const s = S; if (!s) { box.textContent = 'The vegetation of July 1863 is not running in this visit.'; return; } s.box = box; sc.add(() => { if (S && S.box === box) S.box = null; });
  const m = s.model, tm = s.ctx.tierMark, meta = m.data.meta, fc = meta.tiers.field_crops, gt = meta.tiers.units_geometry, c = meta.counts.by_class;
  const sce = Object.entries(m.scenarios).map(([id, sc2]) => { const cur = scenarioOption(m, effChoices(s), id); return `<fieldset style="border:0;margin:10px 0;padding:0"><legend style="font-weight:600">${esc(sc2.title)}</legend><p class="mini">${esc(sc2.why)}</p>${Object.entries(sc2.options).map(([k, o]) => `<label class="check" style="display:block;margin:3px 0"><input type="radio" name="veg-${id}" value="${esc(k)}" data-sce="${esc(id)}" ${k === cur ? 'checked' : ''}> ${esc(o.label)} ${tm(o.tier)}${k === sc2.default ? ' <span class="pill">default under delegated authority</span>' : ''}</label>`).join('')}</fieldset>`; }).join('');
  box.innerHTML = `<p class="mini">${esc(m.data.meta.title)}: what grew where, and how it looked, as far as the record allows. Everything drawn is a reconstruction and carries its tier; nothing is shown as documented that no passage names.</p>
    <label class="check"><input type="checkbox" id="veg-on" ${s.on ? 'checked' : ''}> Show the vegetation of 1863</label>
    <label class="check"><input type="checkbox" id="veg-tiers" ${s.gl && s.gl.on.overlay ? 'checked' : ''}> Show the tier on the ground (hatching and tint)</label>
    ${s.shellToggle ? `<label class="check"><input type="checkbox" id="veg-crop" ${s.gl && s.gl.on.shell ? 'checked' : ''}> Show standing crops near the camera (stacked layers, within ${SHELL.range} m: a stand-in for single plants; their height, stage, colour, cut, trampling and flattening are the state of the data)</label>${s.gl && s.gl.shellWhy ? `<p class="mini">The standing crop is not drawn on this graphics driver: ${esc(s.gl.shellWhy)}</p>` : ''}` : ''}
    <label class="check"><input type="checkbox" id="veg-visit" ${s.gl && s.gl.on.visit ? 'checked' : ''}> Trample the fields where the troops the theatre draws walked (the events of the record trample them in any case)</label>
    <p class="mini" id="veg-status">${esc(s.status)}${s.planner ? (s.planner.done ? `; the plan of the troops' walk is whole (${s.planner.steps} steps, ${s.planner.marked} cells first walked on)` : `; the plan of the troops' walk is being made (${s.planner.steps} steps)`) : ''}</p>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin:8px 0"><span class="pill">${meta.counts.units} units</span><span class="pill">${c.field + c.wheatfield} field cells</span><span class="pill">${c.woods + c.scatter} woodlots and tree clusters</span><span class="pill">${c.orchard} orchards</span><span class="pill">${s.trees ? s.trees.n.toLocaleString('en-US') : 0} trees</span><span class="pill">${meta.counts.claims} cited passages</span></div>
    <details open><summary style="cursor:pointer;font-weight:600">The ground under the cross-hair</summary><div id="veg-card"></div></details>
    <details><summary style="cursor:pointer;font-weight:600">Places to look at</summary><ul class="list">${PLACES.map(([n, lc]) => `<li><button type="button" class="btn-s" data-fly="${esc(lc)}">${esc(n)}</button></li>`).join('')}${(m.data.witness_trees || []).map(w => `<li><button type="button" class="btn-s" data-wt="${esc(w.id)}">${esc(w.name)}</button> ${tm(w.pos_tier)}</li>`).join('')}</ul></details>
    <details open><summary style="cursor:pointer;font-weight:600">Where the sources conflict or leave a range</summary>${sce}</details>
    <details><summary style="cursor:pointer;font-weight:600">How sure each part is</summary><p class="mini">Field cells, by what fixes the crop: ${fc.documented || 0} documented (the Wheatfield), ${fc.inferred || 0} inferred (a passage names the crop and the place is found by a rule), ${fc['plausible-procedural'] || 0} plausible-procedural (a seeded draw from the mix). Outlines: ${gt.documented || 0} documented (dense Warren tree symbols), ${gt.inferred || 0} inferred, ${gt['plausible-procedural'] || 0} plausible-procedural (cells cut inside a block of open ground: the cut lines are not mapped).</p>
      <p class="mini">The mix of crops in a draw: ${esc(Object.entries(meta.mix.shares).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${pct(v)}`).join(', '))}, from the damage-claim acreages of ${meta.mix.farms.filter(f => Object.keys(f.acres).length).length} farms.</p></details>
    <details><summary style="cursor:pointer;font-weight:600">What is not known (${m.gaps.length} gaps)</summary><ul class="list">${m.gaps.map(g => `<li><b>${esc(g.title)}</b> ${tm(g.tier === 'open gap' ? 'open gap' : g.tier)}<div class="mini">${esc(g.what)}</div><div class="mini">${esc(g.why)} <span class="pill">${esc(g.register)}</span></div></li>`).join('')}</ul></details>
    <p class="mini">Drawn on WebGL2 only. The ground photograph under the picture is of 2022; the field cells cover it where they are drawn, but a modern tree on a road verge or in the town stays. Grass and crop height are drawn as colour and shading, not as single plants.</p>`;
  sc.on(box, 'change', ev => {
    const t = ev.target; if (!t || !S) return;
    if (t.id === 'veg-on') Promise.resolve(S.toggle.set(t.checked)).then(() => { if (S) t.checked = S.on; });
    else if (t.id === 'veg-tiers') Promise.resolve(S.tierToggle.set(t.checked)).then(() => { if (S) t.checked = !!(S.gl && S.gl.on.overlay); });
    else if (t.id === 'veg-crop') Promise.resolve(S.shellToggle && S.shellToggle.set(t.checked)).then(() => { if (S && S.gl) t.checked = !!S.gl.on.shell; });
    else if (t.id === 'veg-visit') { if (S.gl) S.gl.on.visit = t.checked; S.th.announce(t.checked ? 'The ground is trampled where the troops walked.' : 'The ground is trampled only by the events of the record.'); }
    else if (t.dataset && t.dataset.sce) choose(t.dataset.sce, t.value);
  });
  sc.on(box, 'click', ev => {
    const b = ev.target && ev.target.closest ? ev.target.closest('[data-fly],[data-wt]') : null; if (!b || !S) return;
    if (b.dataset.fly) { const u = S.model.units.find(x => x.lc === b.dataset.fly); if (u) { const [lng, lat] = centroidLL(u); S.th.flyToLngLat(lng, lat, { dist: 420, height: 150 }); } }
    else if (b.dataset.wt) { const w = S.model.data.witness_trees.find(x => x.id === b.dataset.wt); if (w) S.th.flyToLngLat(w.lnglat[0], w.lnglat[1], { dist: 160, height: 60 }); }
  });
  th.bus.on('time', () => { if (S && S.box === box) { S.lastCard = 0; } }, sc);
  paintCard(s);
}

export function dispose() {
  const s = S; S = null; if (!s) return;
  try { s.ac.abort(); } catch { /* gone */ }
  stopPump(s);
  for (const off of s.offs || []) { try { off(); } catch { /* the bus is gone */ } }
  if (s.hook) s.hook(); if (s.gl) s.gl.destroy(); if (s.chip) s.chip.remove();
  const th = s.th; if (th && th.vegetation) delete th.vegetation;
  s.gl = s.model = s.ctx = s.th = s.T = s.planner = s.grid = s.chip = s.box = s.toggle = s.tierToggle = s.panel = s.trees = s.idx = s.rings = s.offs = null;
}

// layout-lab/lab.mjs - the browser lab: the SAME lib/*.mjs modules as the node measurements, running in Chrome on the REAL data files.
// Everything on screen (tile set, layout, overlap count, solve time) is computed in the page; nothing is precomputed.
import { buildAll, ALL_FILES, visibleAt, project } from './lib/data-core.mjs';
import { SPECS, setTextTable } from './lib/spec.mjs';
import { makeStrategy } from './lib/strategies.mjs';
import { frameLeaves, measure, pct } from './lib/metrics.mjs';
import { renderSvg, renderLegacySvg } from './lib/render.mjs';
import { legacyLayout, legacyOverlaps, legacyOrder } from './lib/legacy.mjs';
import { worldOrigin, mpp } from './lib/tiles.mjs';

const $ = (id) => document.getElementById(id);
const cache = {};
async function boot() {
  setTextTable(await (await fetch('/lab/out/text-widths.json')).json());
  await Promise.all(ALL_FILES.map(async (f) => { cache[f] = await (await fetch('/data/' + f)).json(); }));
  return buildAll((rel) => cache[rel]);
}
const all = await boot();
$('log').textContent = `data loaded: ${all.rows} rows, ${all.kept} unique (unit, tick), ${all.units.size} units, ${all.nodes.size} order-of-battle nodes`;

const S = { tick: 346, z: 14, strategy: 'hybrid', rule: 'A', spec: 'standard', dMax: 48, cx: 0, cy: 0, playing: false, strat: null, key: '', frames: 0, ovFrames: 0, last: null, lastT: 0 };
const stage = $('stage'); const view = $('view');
function size() { return { w: Math.max(480, Math.floor(view.clientWidth || stage.clientWidth - 250)), h: Math.max(320, Math.floor(window.innerHeight - 190)) }; }
function centreOn(lat, lng, z) { const [ox, oy] = worldOrigin(z); const [x, y] = project(lng, lat, z); S.cx = x - ox; S.cy = y - oy; }
centreOn(39.8189, -77.2262, S.z);

function spec() { return SPECS[S.spec]; }
function solveNow(tick, z, { cold }) {
  const key = [S.strategy, S.spec, S.dMax, S.rule].join('|');
  if (cold || key !== S.key || !S.strat) { S.strat = S.strategy === 'legacy' ? null : makeStrategy(S.strategy, all, spec(), S.strategy === 'hybrid' || S.strategy === 'displace' ? { dMax: S.dMax } : null); S.key = key; }
  const opts = { rule: S.rule, window: S.rule === 'C' ? 24 : null };
  if (S.strategy === 'legacy') {
    const vis = visibleAt(all, tick, { mode: 'hold', ...opts }); const rank = legacyOrder(all);
    vis.sort((a, b) => rank.get(a.u.id) - rank.get(b.u.id));
    const t0 = performance.now(); const L = legacyLayout(vis, z); const ms = performance.now() - t0; const ov = legacyOverlaps(L);
    return { legacy: L, ov, ms, n: vis.length };
  }
  const { leaves } = frameLeaves(all, tick, z, spec(), opts);
  const res = S.strat.step(leaves, { z, dt: 1, static: cold });
  return { res, m: measure(res, leaves, z, spec()), leaves };
}

function draw(out) {
  const { w, h } = size(); const vw = { x0: S.cx - w / 2, y0: S.cy - h / 2, w, h };
  let svg; const hud = [];
  const row = (k, v, cls = '') => hud.push(`<div class="row"><span>${k}</span><span class="${cls}">${v}</span></div>`);
  hud.push(`<b>tick ${S.tick.toFixed(1)} &middot; z${S.z.toFixed(2)} &middot; ${(mpp(S.z)).toFixed(2)} m/px &middot; ${S.strategy}</b>`);
  if (out.legacy) {
    svg = renderLegacySvg(out.legacy, vw, { title: `legacy (as shipped) tick ${Math.round(S.tick)} z${S.z.toFixed(1)}` });
    const tot = out.ov['glyph+glyph'] + out.ov['glyph+label'] + out.ov['label+label'];
    row('units on the field', out.n); row('overlapping pairs', tot, tot ? 'bad' : 'ok'); row('glyph / glyph+label / label', `${out.ov['glyph+glyph']} / ${out.ov['glyph+label']} / ${out.ov['label+label']}`);
    row('max displacement', Math.max(0, ...out.legacy.disp).toFixed(0) + ' px'); row('solve', out.ms.toFixed(1) + ' ms');
  } else {
    const m = out.m;
    svg = renderSvg(out.res, vw, { spec: spec(), title: `${S.strategy} tick ${Math.round(S.tick)} z${S.z.toFixed(1)}`, marks: S.strategy === 'raw' || S.strategy === 'disclose' || S.strategy === 'fanout' || S.strategy === 'displace', hulls: true });
    row('units on the field', m.visible); row('tiles drawn', m.tiles); row('aggregates (units in them)', `${m.aggTiles} (${m.unitsInAggs})`);
    row('overlapping pairs (verifier)', m.overlaps, m.overlaps ? 'bad' : 'ok'); row('units not represented', m.unrepresented + m.dropped > 0 ? m.dropped : 0, m.dropped ? 'bad' : 'ok');
    row('displaced tiles', m.displacedTiles); row('max displacement', `${m.maxDispPx.toFixed(0)} px = ${m.maxDispM.toFixed(0)} m`);
    row('labels shown', (m.labelFrac * 100).toFixed(0) + ' %'); row('solve', `${m.ms.toFixed(1)} ms (${m.rounds} rounds)`);
    if (S.playing) { S.frames++; if (m.overlaps) S.ovFrames++; row('frames verified', `${S.frames} (${S.ovFrames} with overlap)`, S.ovFrames ? 'bad' : 'ok'); }
  }
  view.innerHTML = svg; $('hud').innerHTML = hud.join(''); S.last = out;
}
function refresh(cold = true) { draw(solveNow(S.tick, S.z, { cold })); }

function bind() {
  const upd = () => { $('tickv').textContent = Math.round(S.tick); $('zoomv').textContent = S.z.toFixed(2); $('dmaxv').textContent = S.dMax; };
  $('tick').oninput = (e) => { S.tick = +e.target.value; upd(); refresh(true); };
  $('zoom').oninput = (e) => { const nz = +e.target.value; const [ox0, oy0] = worldOrigin(S.z); const lng_lat = null; S.cx *= 2 ** (nz - S.z); S.cy *= 2 ** (nz - S.z); S.z = nz; upd(); refresh(true); };
  for (const id of ['strategy', 'rule', 'spec']) $(id).onchange = (e) => { S[id] = e.target.value; refresh(true); };
  $('dmax').oninput = (e) => { S.dMax = +e.target.value; upd(); refresh(true); };
  document.querySelectorAll('button[data-h]').forEach((b) => { b.onclick = () => { const [t, la, lo, z] = b.dataset.h.split(',').map(Number); S.tick = t; S.z = z; $('tick').value = t; $('zoom').value = z; centreOn(la, lo, z); upd(); refresh(true); }; });
  $('play').onclick = () => { S.playing = !S.playing; $('play').textContent = S.playing ? 'pause' : 'play'; S.frames = 0; S.ovFrames = 0; S.lastT = performance.now(); S.strat = null; if (S.playing) requestAnimationFrame(loop); };
  let drag = null;
  stage.onpointerdown = (e) => { drag = { x: e.clientX, y: e.clientY, cx: S.cx, cy: S.cy }; stage.setPointerCapture(e.pointerId); stage.style.cursor = 'grabbing'; };
  stage.onpointermove = (e) => { if (!drag) return; S.cx = drag.cx - (e.clientX - drag.x); S.cy = drag.cy - (e.clientY - drag.y); if (S.last) draw(S.last); };   // pan = re-render only: the layout is pan-invariant
  stage.onpointerup = () => { drag = null; stage.style.cursor = 'grab'; };
  upd();
}
function loop(now) {
  if (!S.playing) return;
  const dt = Math.min(0.1, (now - S.lastT) / 1000); S.lastT = now; const tps = +$('speed').value;
  S.tick = Math.min(675, S.tick + tps * dt); $('tick').value = S.tick; $('tickv').textContent = Math.round(S.tick);
  draw(solveNow(S.tick, S.z, { cold: false }));
  if (S.tick >= 675) { S.playing = false; $('play').textContent = 'play'; return; }
  requestAnimationFrame(loop);
}
bind(); refresh(true);

// ---- API for the scripted browser checks (shot-lab.mjs) -------------------------------------------------------------------------------
window.__lab = {
  ready: true,
  solveOnce({ tick, z, strategy = 'hybrid', rule = 'A', specName = 'standard', opts = null }) {
    const sp = SPECS[specName]; const strat = makeStrategy(strategy, all, sp, opts);
    const { leaves } = frameLeaves(all, tick, z, sp, { rule, window: rule === 'C' ? 24 : null });
    const res = strat.step(leaves, { z, dt: 1, static: true }); const m = measure(res, leaves, z, sp);
    return { visible: m.visible, tiles: m.tiles, aggTiles: m.aggTiles, unitsInAggs: m.unitsInAggs, overlaps: m.overlaps, clearanceViolations: m.clearanceViolations, unrepresented: m.unrepresented, duplicated: m.duplicated, dropped: m.dropped, maxDispPx: m.maxDispPx, maxDispM: m.maxDispM, ms: m.ms, rounds: m.rounds };
  },
  bench({ tick, z, strategy = 'hybrid', n = 30, opts = null }) {
    const sp = SPECS.standard; const { leaves } = frameLeaves(all, tick, z, sp, {}); const ms = [];
    for (let i = 0; i < n; i++) { const strat = makeStrategy(strategy, all, sp, opts); const t0 = performance.now(); strat.step(leaves, { z, dt: 1, static: true }); ms.push(performance.now() - t0); }
    return { n, visible: leaves.length, p50: pct(ms, 0.5), p95: pct(ms, 0.95), max: Math.max(...ms), min: Math.min(...ms) };
  },
  playback({ tick0, speed, z, frames = 300, strategy = 'hybrid', opts = null }) {
    const sp = SPECS.standard; const strat = makeStrategy(strategy, all, sp, opts); let ov = 0; let ovFrames = 0; let unrep = 0; const ms = [];
    for (let f = 0; f < frames; f++) { const tau = Math.min(675, tick0 + speed * f / 60); const { leaves } = frameLeaves(all, tau, z, sp, {}); const res = strat.step(leaves, { z, dt: 1 }); const m = measure(res, leaves, z, sp); ov += m.overlaps; if (m.overlaps) ovFrames++; unrep += m.unrepresented; ms.push(res.ms); }
    return { frames, overlapPairs: ov, framesWithOverlap: ovFrames, unrepresented: unrep, msMean: ms.reduce((a, b) => a + b, 0) / ms.length, msP95: pct(ms, 0.95), msMax: Math.max(...ms) };
  },
  setView(o) { Object.assign(S, o); if (o.tick != null) $('tick').value = o.tick; if (o.z != null) $('zoom').value = o.z; if (o.centre) centreOn(o.centre[0], o.centre[1], S.z); $('tickv').textContent = Math.round(S.tick); $('zoomv').textContent = S.z.toFixed(2); $('strategy').value = S.strategy; refresh(true); },
};

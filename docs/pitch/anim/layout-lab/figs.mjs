// layout-lab/figs.mjs - the figures of 06-layout.md: strategy comparison grids, expanded aggregates, charts.   node docs/pitch/anim/layout-lab/figs.mjs
// (hotspots.mjs makes the single-panel figures; this script makes the composites, the expanded-roster figures and the charts from out/e1.json)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAll, visibleAt, project } from './lib/data.mjs';
import { SPECS } from './lib/spec.mjs';
import { makeStrategy } from './lib/strategies.mjs';
import { frameLeaves, measure } from './lib/metrics.mjs';
import { worldOrigin } from './lib/tiles.mjs';
import { renderSvg, renderLegacySvg } from './lib/render.mjs';
import { legacyLayout, legacyOverlaps, legacyOrder } from './lib/legacy.mjs';
import { expandAggregate } from './lib/expand.mjs';
import { verifyFrame } from './lib/geom.mjs';
import { svgsToPng } from './shot.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)); const FIGS = path.join(HERE, 'out', 'figs'); fs.mkdirSync(FIGS, { recursive: true });
const all = loadAll(); const spec = SPECS.standard; const jobs = []; const facts = {};
const PW = 640; const PH = 380;
const viewAt = (z, lat, lng, w, h) => { const [ox, oy] = worldOrigin(z); const [cx, cy] = project(lng, lat, z); return { x0: cx - ox - w / 2, y0: cy - oy - h / 2, w, h }; };

// ---- 1. strategy comparison grid at H1 z14 (and H3 z15) ---------------------------------------------------------------------------------
for (const [id, tick, lat, lng, z] of [['H1', 346, 39.8189, -77.2262, 14], ['H3', 556, 39.8117, -77.2347, 15]]) {
  const { leaves } = frameLeaves(all, tick, z, spec); const view = viewAt(z, lat, lng, PW, PH); const panels = [];
  { const rank = legacyOrder(all); const lv = visibleAt(all, tick, { mode: 'hold' }); lv.sort((a, b) => rank.get(a.u.id) - rank.get(b.u.id)); const L = legacyLayout(lv, z); const ov = legacyOverlaps(L); const tot = ov['glyph+glyph'] + ov['glyph+label'] + ov['label+label'];
    panels.push(renderLegacySvg(L, view, { title: `shipped canvas: ${tot} overlapping pairs on the field` })); facts[`${id}-legacy`] = { z, tick, overlapPairs: tot }; }
  for (const [s, title] of [['raw', 'true positions, new tiles'], ['disclose', '(d) disclosure only'], ['displace', '(b) displacement only'], ['aggregate', '(a) aggregation only'], ['fanout', '(c) fan-out rosters'], ['hybrid', 'certified hybrid']]) {
    const st = makeStrategy(s, all, spec); const r = st.step(leaves, { z, dt: 1, static: true }); const m = measure(r, leaves, z, spec);
    facts[`${id}-${s}`] = { z, tick, tiles: m.tiles, overlaps: m.overlaps, hidden: m.dropped, agg: m.aggTiles, unitsInAggs: m.unitsInAggs, maxDispPx: m.maxDispPx };
    panels.push(renderSvg(r, view, { spec, title: `${title}: ${m.overlaps} overlaps${m.dropped ? ', ' + m.dropped + ' units hidden' : ''}`, marks: !['hybrid', 'aggregate'].includes(s), hulls: true }));
  }
  const html = `<div style="display:grid;grid-template-columns:repeat(2,${PW}px);gap:6px;background:#05080c;width:${PW * 2 + 6}px">${panels.join('')}</div>`;
  jobs.push({ svg: html, out: path.join(FIGS, `compare-${id}-z${z}.png`), width: PW * 2 + 6, height: PH * 4 + 18 });
}

// ---- 2. expandable list: the largest aggregate of the hybrid layout is opened ---------------------------------------------------------------
for (const [id, tick, lat, lng, z] of [['H1', 346, 39.8189, -77.2262, 14], ['H3', 556, 39.8117, -77.2347, 15], ['H2', 293, 39.7994, -77.2417, 13]]) {
  const { leaves } = frameLeaves(all, tick, z, spec); const view = viewAt(z, lat, lng, 760, 440);
  const st = makeStrategy('hybrid', all, spec); const r = st.step(leaves, { z, dt: 1, static: true });
  const inV = (p) => p.chip.x1 > view.x0 && p.chip.x0 < view.x0 + view.w && p.chip.y1 > view.y0 && p.chip.y0 < view.y0 + view.h;
  const aggs = r.placed.filter((p) => p.t.kind === 'agg' && inV(p)).sort((a, b) => b.t.n - a.t.n);
  const opened = []; let drawn = false;
  for (const a of aggs.slice(0, 8)) { const e = expandAggregate(r, a.t.key, spec); opened.push({ key: a.t.key, members: a.t.n, ok: e.ok, reason: e.reason || null, overlaps: e.overlaps ?? null, displacementPx: e.displacementPx ?? null, shown: e.shown, more: e.more ?? null });
    if (e.ok && !drawn) { drawn = true; const rc = e.header; const v2 = { x0: (rc.x0 + rc.x1) / 2 - view.w / 2, y0: (rc.y0 + rc.y1) / 2 - view.h / 2 + 60, w: view.w, h: view.h }; jobs.push({ svg: renderSvg(e.res, v2, { spec, title: `${id} z${z}: aggregate ${a.t.short} ${a.t.badge} opened into a roster (${e.overlaps} overlaps)`, hulls: true }), out: path.join(FIGS, `expand-${id}-z${z}.png`), width: view.w, height: view.h }); } }
  facts[`${id}-expand`] = { z, tick, opened };
}

// ---- 2b. how often does an in-place expansion fit? (every aggregate in view, three hotspots x zoom 14/15/16 x rules A, C) ----------------------------------------------
{
  const rows = [];
  for (const [id, tick, lat, lng] of [['H1', 346, 39.8189, -77.2262], ['H2', 293, 39.7994, -77.2417], ['H3', 556, 39.8117, -77.2347]]) for (const z of [14, 15, 16]) for (const rule of ['A', 'C']) {
    const { leaves } = frameLeaves(all, tick, z, spec, { rule, window: rule === 'C' ? 24 : null }); const view = viewAt(z, lat, lng, 1440, 900);
    const st = makeStrategy('hybrid', all, spec); const r = st.step(leaves, { z, dt: 1, static: true });
    const aggs = r.placed.filter((p) => p.t.kind === 'agg' && p.chip.x1 > view.x0 && p.chip.x0 < view.x0 + view.w && p.chip.y1 > view.y0 && p.chip.y0 < view.y0 + view.h);
    let ok = 0; const reasons = {};
    for (const a of aggs) { const e = expandAggregate(r, a.t.key, spec); if (e.ok) ok++; else reasons[e.reason] = (reasons[e.reason] || 0) + 1; }
    rows.push({ id, tick, z, rule, aggregatesInView: aggs.length, expandedInPlace: ok, reasons });
  }
  facts.expansion = { viewport: '1440x900', rows, total: rows.reduce((a, r) => a + r.aggregatesInView, 0), ok: rows.reduce((a, r) => a + r.expandedInPlace, 0) };
}

// ---- 3. charts from E1 ------------------------------------------------------------------------------------------------------------------------
const e1 = JSON.parse(fs.readFileSync(path.join(HERE, 'out', 'e1.json'), 'utf8')); const Z = [11, 12, 13, 14, 15, 16, 17];
function lineChart({ title, series, yLabel, log = false, w = 760, h = 380, fmt = (v) => String(v) }) {
  const m = { l: 62, r: 150, t: 38, b: 44 }; const pw = w - m.l - m.r; const ph = h - m.t - m.b;
  const all = series.flatMap((s) => s.vals).filter((v) => v > 0 || !log); const ymax = Math.max(...all) * 1.08; const ymin = log ? Math.min(...all.filter((v) => v > 0)) * 0.8 : 0;
  const Y = (v) => { const vv = log ? Math.log10(Math.max(v, ymin)) : v; const a = log ? Math.log10(ymin) : ymin; const b = log ? Math.log10(ymax) : ymax; return m.t + ph - (vv - a) / (b - a) * ph; };
  const X = (i) => m.l + i / (Z.length - 1) * pw; const out = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" font-family="'Segoe UI',Arial,sans-serif"><rect width="${w}" height="${h}" fill="#10151c"/><text x="${m.l}" y="22" fill="#e8d5a3" font-size="14" font-weight="700">${title}</text>`);
  const ticks = log ? [1, 10, 100, 1000, 10000, 100000].filter((v) => v >= ymin / 2 && v <= ymax) : [0, 0.25, 0.5, 0.75, 1].map((f) => f * ymax);
  for (const t of ticks) out.push(`<line x1="${m.l}" y1="${Y(t)}" x2="${m.l + pw}" y2="${Y(t)}" stroke="#243142"/><text x="${m.l - 8}" y="${Y(t) + 4}" fill="#8fa1b6" font-size="11" text-anchor="end">${fmt(t)}</text>`);
  Z.forEach((z, i) => out.push(`<text x="${X(i)}" y="${h - 22}" fill="#8fa1b6" font-size="11" text-anchor="middle">z${z}</text>`));
  out.push(`<text x="${m.l + pw / 2}" y="${h - 6}" fill="#8fa1b6" font-size="11" text-anchor="middle">zoom (metres per pixel: ${Z.map((z) => (40075016.686 * Math.cos(39.8206 * Math.PI / 180) / (512 * 2 ** z)).toFixed(1)).join(' / ')})</text>`);
  out.push(`<text x="14" y="${m.t + ph / 2}" fill="#8fa1b6" font-size="11" transform="rotate(-90 14 ${m.t + ph / 2})" text-anchor="middle">${yLabel}</text>`);
  series.forEach((s, k) => { const pts = s.vals.map((v, i) => `${X(i)},${Y(v)}`).join(' '); out.push(`<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="2.2" ${s.dash ? 'stroke-dasharray="6 4"' : ''}/>`); s.vals.forEach((v, i) => out.push(`<circle cx="${X(i)}" cy="${Y(v)}" r="2.8" fill="${s.color}"/>`)); const ly = m.t + 14 + k * 18; out.push(`<line x1="${m.l + pw + 14}" y1="${ly - 4}" x2="${m.l + pw + 34}" y2="${ly - 4}" stroke="${s.color}" stroke-width="2.2" ${s.dash ? 'stroke-dasharray="6 4"' : ''}/><text x="${m.l + pw + 40}" y="${ly}" fill="#e6edf6" font-size="11">${s.name}</text>`); });
  out.push('</svg>'); return out.join('\n');
}
const A = e1.rules.A; const B = e1.rules.B; const C = e1.rules.C;
jobs.push({ svg: lineChart({ title: 'Overlapping pairs on the field, worst tick (log scale)', yLabel: 'overlapping pairs (max over 675 ticks)', log: true, series: [
  { name: 'shipped canvas', color: '#ff9944', vals: Z.map((z) => A[z].legacy.overlapsTotal.max) },
  { name: 'new tiles, raw', color: '#c43a3a', vals: Z.map((z) => A[z].strategies.raw.overlapsChipChip.max) },
  { name: 'certified hybrid', color: '#4ad28a', vals: Z.map((z) => Math.max(1, A[z].strategies.hybrid.overlaps.max)) } ] }), out: path.join(FIGS, 'chart-overlaps.png'), width: 760, height: 380 });
jobs.push({ svg: lineChart({ title: 'Share of units inside an aggregate tile (hybrid, median tick)', yLabel: '% of units on the field', fmt: (v) => v.toFixed(0) + '%', series: [
  { name: 'A carry-forward (shipped)', color: '#ff9944', vals: Z.map((z) => 100 * A[z].strategies.hybrid.unitsInAggs.p50 / Math.max(1, A[z].strategies.hybrid.visible.p50)) },
  { name: 'C 24-tick window', color: '#e8d5a3', vals: Z.map((z) => 100 * C[z].strategies.hybrid.unitsInAggs.p50 / Math.max(1, C[z].strategies.hybrid.visible.p50)) },
  { name: 'B latest snapshot', color: '#66aaff', vals: Z.map((z) => 100 * B[z].strategies.hybrid.unitsInAggs.p50 / Math.max(1, B[z].strategies.hybrid.visible.p50)) } ] }), out: path.join(FIGS, 'chart-aggshare.png'), width: 760, height: 380 });
// ---- 4. the pipeline diagram ------------------------------------------------------------------------------------------------------------------
function pipelineSvg() {
  const W = 1180; const H = 330; const o = [];
  o.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="'Segoe UI',Arial,sans-serif"><rect width="${W}" height="${H}" fill="#10151c"/>`);
  o.push(`<text x="20" y="28" fill="#e8d5a3" font-size="15" font-weight="700">Certified layout: one frame</text>`);
  const box = (x, y, w, h, title, lines, col = '#243142', tc = '#e6edf6') => { o.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="#151e2a" stroke="${col}" stroke-width="1.6"/><text x="${x + 10}" y="${y + 20}" fill="${tc}" font-size="12.5" font-weight="700">${title}</text>`); lines.forEach((l, i) => o.push(`<text x="${x + 10}" y="${y + 38 + i * 15}" fill="#9fb2c8" font-size="11">${l}</text>`)); };
  const arrow = (x1, y1, x2, y2) => o.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#6f86a0" stroke-width="1.5" marker-end="url(#a)"/>`);
  o.push('<defs><marker id="a" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8z" fill="#6f86a0"/></marker></defs>');
  box(20, 50, 170, 92, '1 Footprints', ['chip + label sizes from the', 'tile spec and MEASURED', 'text widths (Chrome)']);
  box(210, 50, 190, 92, '2 Seed', ["last frame's aggregates", '(sticky, split only after', '30 frames) + optional tier']);
  box(420, 50, 170, 92, '3 Groups', ['tiles that can interact', 'form a group; groups are', 'solved independently'], '#355a86');
  box(610, 50, 230, 92, '4 Place  (b)', ['priority order, seniority first', 'EXACT nearest-free chip, budget 48 px', 'inertia; every true position reserved'], '#3d7a5a', '#8fe0b4');
  box(860, 50, 300, 92, '5 Fail: aggregate  (a)', ['a tile with no free spot merges with its best', 'partner (deepest common ancestor, nearest)', 'count strictly drops: loop ends'], '#8a5a2a', '#ffc58f');
  arrow(190, 96, 210, 96); arrow(400, 96, 420, 96); arrow(590, 96, 610, 96); arrow(840, 96, 860, 96);
  o.push(`<path d="M1010 142 C1010 190 725 190 725 150" fill="none" stroke="#8a5a2a" stroke-width="1.5" stroke-dasharray="5 4" marker-end="url(#a)"/><text x="800" y="186" fill="#c69a6a" font-size="11">repeat until the group is placed</text>`);
  box(20, 215, 280, 92, '6 Certify across groups', ['EXACT all-pairs check of the union:', 'every chip vs every chip and every foreign', 'true position; conflicting groups merge and', 're-solve. Output only when the check passes.'], '#355a86');
  box(330, 215, 250, 92, '7 Labels + detail  (d)', ['free-space test: right, left, below, above', 'show delay 12 frames, slot memory', 'secondary: dropped first, never forced'], '#3d7a5a', '#8fe0b4');
  box(610, 215, 270, 92, '8 Emit', ['chips, labels, pins, leaders', 'expandable list = fixed-slot roster  (c)', 'independent verifier re-checks the frame'], '#243142');
  box(910, 215, 250, 92, 'Guarantee', ['0 overlaps, 0 hidden units, certified', 'by construction + exact check', 'tests: 4,000 + 300 + 1,200 scenes + mutation'], '#4ad28a', '#4ad28a');
  arrow(300, 261, 330, 261); arrow(580, 261, 610, 261); arrow(880, 261, 910, 261);
  o.push(`<path d="M505 142 C505 175 160 175 160 215" fill="none" stroke="#6f86a0" stroke-width="1.5" marker-end="url(#a)"/>`);
  o.push('</svg>'); return o.join('');
}
jobs.push({ svg: pipelineSvg(), out: path.join(FIGS, 'pipeline.png'), width: 1180, height: 330 });
await svgsToPng(jobs);
fs.writeFileSync(path.join(HERE, 'out', 'figs-facts.json'), JSON.stringify(facts, null, 1));
console.log('figures:', jobs.map((j) => path.basename(j.out)).join(', ')); console.log(JSON.stringify(facts, null, 1));

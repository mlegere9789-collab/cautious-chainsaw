// Node child of the Q23 and Q02 runners: runs the app's own marking code and reports what it does (GATE-SPEC Q23.1 to Q23.4, GATE-HOOKS.md: tierName, tierMark, tierMark.style, tierReading).
//   node tools/bt/gates/q23_app.mjs --out <file.json> [--tiers <file.json>] [--app <docs/battle-theatre/app>] [--no-layer]
//   --tiers  a JSON array of tier statements found in the data; the answer gives `tierName(statement)` for each (null = the product states no tier for it)
// No network, no DOM, no wall clock, nothing written but --out. The overlay is driven with a recording canvas: every call the code makes is logged and judged.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const APP = path.resolve(opt('--app', path.resolve(here, '../../../docs/battle-theatre/app')));
const OUT = opt('--out', null), TIERS_IN = opt('--tiers', null), NO_LAYER = args.includes('--no-layer');
if (!OUT) { console.error('usage: node q23_app.mjs --out <file.json> [--tiers <file.json>] [--app <app dir>] [--no-layer]'); process.exit(2); }
const imp = f => import(pathToFileURL(path.join(APP, f)).href);
const out = { schema: 'bt-q23-app/1', app: path.basename(APP), errors: [] };
const guard = async (name, f) => { try { out[name] = await f(); } catch (e) { out.errors.push(name + ': ' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')); out[name] = null; } };

const cfg = await imp('src/config.mjs');
const { TIERS, TIER_STYLE } = cfg;
const ext = await imp('src/ui/extensions.mjs');
const ovl = await imp('src/overlay.mjs');

// ---------------------------------------------------------------- the style table: tier never depends on colour alone
await guard('style', async () => {
  const problems = [], tiers = {};
  for (const t of TIERS) {
    const s = TIER_STYLE[t];
    if (!s) { problems.push('TIER_STYLE has no entry for the tier ' + t); continue; }
    tiers[t] = { glyph: s.glyph, dash: s.dash, color: s.color, label: s.label };
    if (!/^#[0-9a-f]{6}$/i.test(s.color || '')) problems.push(t + ': colour is not a #rrggbb value');
    if (!s.label) problems.push(t + ': no label');
  }
  const names = Object.keys(tiers);
  for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
    const a = tiers[names[i]], b = tiers[names[j]];
    if (a.glyph === b.glyph && JSON.stringify(a.dash) === JSON.stringify(b.dash)) problems.push(names[i] + ' and ' + names[j] + ' differ by colour alone (same glyph and same outline pattern)');
    if (a.color === b.color) problems.push(names[i] + ' and ' + names[j] + ' have the same colour');
  }
  const glyphs = new Set(names.map(n => tiers[n].glyph));
  if (glyphs.size !== names.length) problems.push('the glyphs of the tiers are not all different (' + names.map(n => tiers[n].glyph).join(', ') + ')');
  if (tiers.documented && tiers.documented.dash.length) problems.push('the documented tier has a broken outline: a broken outline is what marks a non-documented tier');
  for (const n of names) if (n !== 'documented' && tiers[n] && !tiers[n].dash.length) problems.push(n + ' has a solid outline, as the documented tier has');
  return { tiers, problems, tier_list: [...TIERS] };
});

// ---------------------------------------------------------------- the hooks of GATE-HOOKS.md
await guard('hooks', async () => {
  const problems = [], facts = {};
  for (const t of TIERS) {
    if (ext.tierName(t) !== t) problems.push('tierName(' + t + ') is ' + ext.tierName(t));
    const html = ext.tierMark(t);
    if (!html.includes('data-tier="' + t + '"')) problems.push('tierMark(' + t + ') carries no data-tier of that tier');
    if (!html.includes(TIER_STYLE[t].label)) problems.push('tierMark(' + t + ') does not show the label ' + TIER_STYLE[t].label);
    if (!/<svg/.test(html)) problems.push('tierMark(' + t + ') draws no glyph');
    const st = ext.tierMark.style(t);
    if (st.tier !== t || st.glyph !== TIER_STYLE[t].glyph || JSON.stringify(st.dash) !== JSON.stringify(TIER_STYLE[t].dash) || st.color !== TIER_STYLE[t].color) problems.push('tierMark.style(' + t + ') differs from TIER_STYLE');
  }
  const none = ext.tierMark(null), ns = ext.tierMark.style(null);
  if (!none.includes('data-tier="none"') || !/Tier not stated/.test(none)) problems.push('a statement with no tier is not marked "Tier not stated"');
  if (ns.tier !== null) problems.push('tierMark.style(null).tier is not null');
  facts.unknown_tier_pill = (await imp('src/ui/util.mjs')).pill('not-a-tier');
  facts.pill_documented = (await imp('src/ui/util.mjs')).pill('documented');
  facts.words = Object.keys(ext.TIER_WORDS || {});
  return { problems, facts };
});

// ---------------------------------------------------------------- the tier statements found in the data, read as the product reads them
await guard('tier_names', async () => {
  const names = {};
  if (TIERS_IN) for (const s of JSON.parse(fs.readFileSync(TIERS_IN, 'utf8'))) names[s] = ext.tierName(s);
  return names;
});

// ---------------------------------------------------------------- a recording canvas and a stand-in stage for the overlay's own draw code
function recorder() {
  const log = []; let state = { fillStyle: null, strokeStyle: null, dash: [] };
  const c = new Proxy({}, {
    get(_, k) {
      if (k === 'measureText') return s => ({ width: String(s).length * 6 });
      if (k === 'setLineDash') return a => { state.dash = Array.from(a); log.push(['setLineDash', Array.from(a)]); };
      if (k === 'getLineDash') return () => state.dash;
      if (['fillStyle', 'strokeStyle', 'lineWidth', 'font', 'globalAlpha'].includes(k)) return state[k];
      return (...a) => { log.push([String(k), a.map(x => (typeof x === 'number' ? Math.round(x * 100) / 100 : x)), JSON.stringify({ f: state.fillStyle, s: state.strokeStyle, d: state.dash })]); };
    },
    set(_, k, v) { state[k] = v; log.push(['set:' + String(k), v]); return true; },
  });
  return { c, log, state };
}
// split the log into drawn paths: a path starts at beginPath and its fill/stroke carry the colours and the dash that were set before them
function paths(log) {
  const out = []; let cur = null, fill = null, stroke = null, dash = [], lastStroke = null, lastFill = null;
  for (const e of log) {
    const op = e[0];
    if (op === 'set:fillStyle') lastFill = e[1];
    else if (op === 'set:strokeStyle') lastStroke = e[1];
    else if (op === 'setLineDash') dash = e[1];
    else if (op === 'beginPath') { if (cur && cur.ops.length) out.push(cur); cur = { ops: [], fill: null, stroke: null, dash: null }; }
    else if (cur) {
      if (['arc', 'moveTo', 'lineTo', 'closePath', 'rect'].includes(op)) cur.ops.push(op);
      if (op === 'fill') cur.fill = lastFill;
      if (op === 'stroke') { cur.stroke = lastStroke; cur.dash = dash.slice(); }
    }
  }
  if (cur && cur.ops.length) out.push(cur);
  return out;
}
const glyphOf = ops => ops.includes('arc') ? 'circle' : ops.includes('rect') ? 'square' : ops.filter(o => o === 'lineTo').length === 3 ? 'diamond' : ops.filter(o => o === 'lineTo').length === 2 ? 'triangle' : 'polygon';

let layerUnits = null, layerObjects = null, layerObjectProgress = null;
if (!NO_LAYER) {
  const { loadRawFromDisk, terrainMeta } = await imp('tools/history-report.mjs');
  const { createRealHistory } = await imp('src/history/real.mjs');
  const L = createRealHistory({ raw: loadRawFromDisk(), T: terrainMeta(), helpers: { civilDawn: m => m + 4 * 60 + 3 } });
  layerUnits = L.units; layerObjects = L.objects; layerObjectProgress = L.objectProgress;
}

// ---------------------------------------------------------------- the unit overlay: every unit of the layer, drawn by Overlay.draw, in the glyph mode (far) and the footprint mode (near)
await guard('overlay_units', async () => {
  if (!layerUnits) return { skipped: 'no layer (--no-layer)' };
  const n = layerUnits.length, res = { units: n, modes: {} };
  for (const mode of ['glyph', 'footprint']) {
    const { c, log } = recorder();
    const W = 1600, H = 1600, cols = 30, gap = 48;
    const st = { n, present: new Uint8Array(n).fill(1), cx: new Float32Array(n), cz: new Float32Array(n), sig: new Float32Array(n), footprint(i, o) { o.x = this.cx[i]; o.z = this.cz[i]; o.c = 1; o.s = 0; o.b = [-12, 12, -12, 12]; return o; } };
    for (let i = 0; i < n; i++) { st.cx[i] = (i % cols) * gap + 30; st.cz[i] = Math.floor(i / cols) * gap + 30; }
    // orthographic-like view: screen x = world x, screen y = H - world z; w (the distance the overlay compares with 2200) is 100 near, 3000 far
    const cw = mode === 'glyph' ? 3000 : 100, k = 2 / W * cw, vp = new Float32Array(16);
    vp[0] = k; vp[9] = k; vp[10] = 1; vp[15] = cw; vp[12] = -cw; vp[13] = -cw;
    const T = { h: () => 0 }, scope = { add() {} }, canvas = { getContext: () => c, width: W, height: H };
    const ov = new ovl.Overlay({ canvas, stage: st, layer: { units: layerUnits }, cam: { vp }, T, scope });
    ov.resize(W, H, 1); ov.show = true; ov.draw(0, { objects: false });
    const ps = paths(log), problems = [];
    let drawn = 0;
    for (let i = 0; i < n; i++) {
      const p = ps[i], t = layerUnits[i].tier, S = TIER_STYLE[t];
      if (!p) { problems.push(layerUnits[i].id + ': nothing drawn'); continue; }
      drawn++;
      if (!S) { problems.push(layerUnits[i].id + ': tier ' + t + ' has no style'); continue; }
      const g = mode === 'glyph' ? glyphOf(p.ops) : 'polygon';
      const wantDash = mode === 'glyph' ? (S.dash.length ? [3, 2] : []) : S.dash;
      const wantFill = S.color + (mode === 'glyph' ? '55' : '33');
      if (mode === 'glyph' && g !== S.glyph) problems.push(layerUnits[i].id + ': tier ' + t + ' drawn as ' + g + ', not the ' + S.glyph + ' of its tier');
      if (p.stroke !== S.color) problems.push(layerUnits[i].id + ': outline colour ' + p.stroke + ' is not ' + S.color + ' of tier ' + t);
      if (p.fill !== wantFill) problems.push(layerUnits[i].id + ': fill ' + p.fill + ' is not ' + wantFill);
      if (JSON.stringify(p.dash) !== JSON.stringify(wantDash)) problems.push(layerUnits[i].id + ': outline pattern ' + JSON.stringify(p.dash) + ' is not ' + JSON.stringify(wantDash));
    }
    res.modes[mode] = { drawn, paths: ps.length, problems: problems.slice(0, 40), problem_count: problems.length };
  }
  return res;
});

// ---------------------------------------------------------------- the works overlay: Overlay.drawObjects over the layer's objects
await guard('overlay_objects', async () => {
  if (!layerObjects) return { skipped: 'no layer (--no-layer)' };
  const objs = layerObjects.map(o => o), { c, log } = recorder();
  const W = 1600, H = 1600, vp = new Float32Array(16); vp[0] = 2 / W * 100; vp[9] = 2 / W * 100; vp[10] = 1; vp[15] = 100; vp[12] = -100; vp[13] = -100;
  const T = { h: () => 0 };
  const ov = new ovl.Overlay({ canvas: { getContext: () => c, width: W, height: H }, stage: { n: 0, present: new Uint8Array(0), cx: new Float32Array(0), cz: new Float32Array(0), sig: new Float32Array(0) }, layer: { units: [] }, cam: { vp }, T, scope: { add() {} } });
  ov.resize(W, H, 1);
  const geo = { xz: (lng, lat) => [(lng + 77.3) * 9000 % 1500 + 40, (lat - 39.78) * 9000 % 1500 + 40] };
  const per = [], notDrawable = [];
  const times = []; for (let m = 0; m <= 20 * 1440; m += 30) times.push(m);
  for (const o of objs) {
    const prog = (oo, t) => (layerObjectProgress ? layerObjectProgress(oo, t) : 0.5);
    const t = times.find(tt => prog(o, tt) > 0);
    if (t === undefined) { per.push({ id: o.id, tier: o.tier, pre_existing: !!o.pre_existing, has_line: !!o.line, paths: [], never_present: true }); continue; }
    if (!o.line && !(o.at && o.at.lng != null)) { notDrawable.push(o.id); per.push({ id: o.id, tier: o.tier, pre_existing: !!o.pre_existing, has_line: false, paths: [], no_place: true }); continue; }
    const before = log.length;
    ov.tMin = t;
    ov.drawObjects(c, { objects: [o], progress: prog, geo });
    const ps = paths(log.slice(before));
    per.push({ id: o.id, tier: o.tier, pre_existing: !!o.pre_existing, has_line: !!o.line, paths: ps.map(p => ({ glyph: glyphOf(p.ops), stroke: p.stroke, dash: p.dash })) });
  }
  const problems = notDrawable.map(i => i + ': the object has neither a mapped line nor a place, so the overlay draws no mark for it'), colourOnly = [];
  const sig = p => JSON.stringify([p.glyph === 'polygon' ? 'line' : p.glyph, p.dash]);
  const byTier = {};
  for (const r of per) { const S = TIER_STYLE[r.tier] || TIER_STYLE['plausible-procedural']; if (!r.paths.length) { if (!r.no_place) problems.push(r.id + (r.never_present ? ': the object is never present at the sampled times (progress 0), so no mark is drawn' : ': nothing drawn')); continue; } byTier[r.tier] ||= new Map(); for (const p of r.paths) { byTier[r.tier].set(sig(p) + (r.pre_existing ? '|pre' : '|built'), r.id); if (p.stroke !== S.color) problems.push(r.id + ': outline colour ' + p.stroke + ' is not ' + S.color + ' of tier ' + r.tier); } }
  const tiers = Object.keys(byTier);
  for (let i = 0; i < tiers.length; i++) for (let j = i + 1; j < tiers.length; j++) for (const [k1, id1] of byTier[tiers[i]]) if (byTier[tiers[j]].has(k1)) colourOnly.push(tiers[i] + ' (' + id1 + ') and ' + tiers[j] + ' (' + byTier[tiers[j]].get(k1) + ') are drawn alike apart from colour (outline pattern and glyph the same)');
  return { objects: objs.length, per, problems, colour_only: colourOnly.slice(0, 20), colour_only_count: colourOnly.length };
});

// ---------------------------------------------------------------- the sound panel (DD-14: disclosure in the panel and the provenance overlay)
await guard('audio', async () => {
  const P = await imp('src/audio3d/provenance.mjs');
  const kinds = Object.keys(P.PROVENANCE_KINDS), problems = [];
  const fam = kinds.map(k => ({ id: 'probe-' + k, name: 'probe ' + k, kind: k, tier: k === 'synthesized' ? 'plausible-procedural' : 'inferred', sources: [], gap: null, basis: null }));
  const panel = P.buildPanel(fam), pdf = P.buildPanel(fam, { mode: 'pdf' });
  if (!/modern recording/i.test(P.PANEL_DISCLOSURE) || !/synthesi/i.test(P.PANEL_DISCLOSURE) || !/reconstruction/i.test(P.PANEL_DISCLOSURE)) problems.push('the panel disclosure does not say modern recording, reconstruction and synthesized');
  if (!/No recording of the 1863 battle exists/.test(P.PANEL_DISCLOSURE)) problems.push('the panel disclosure does not say that no recording of 1863 exists');
  for (const r of panel.rows) if (!r.kindLabel || !r.tier) problems.push('panel row ' + r.id + ' lacks its provenance kind label or tier');
  for (const r of pdf.rows) if (!/modern/i.test(r.onSound || '')) problems.push('in the PDF label mode row ' + r.id + ' carries no "modern" tag on the sound');
  if (!pdf.badge || !/modern reconstruction/i.test(pdf.badge)) problems.push('in the PDF label mode the audio badge does not say modern reconstruction');
  return { mode: P.AUDIO_CONFIG.labelMode, decision: P.AUDIO_CONFIG.decision, decisionStatus: P.AUDIO_CONFIG.decisionStatus, panel_rows: panel.rows.length, disclosure: P.PANEL_DISCLOSURE.slice(0, 160), problems };
});

fs.writeFileSync(OUT, JSON.stringify(out));
console.error('q23_app: ' + (out.errors.length ? 'errors ' + out.errors.length : 'ok'));

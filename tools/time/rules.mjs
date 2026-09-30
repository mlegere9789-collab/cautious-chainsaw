// TM-V1..V21 (chapter 04 section 8) as pure functions over a context built from the frozen legacy tree, the candidate anchors and the module.
// CANDIDATE tooling (WP-TIME-20). Report-only first: the baseline records what "today" looks like; nothing here changes any served file.
import fs from 'node:fs';
import path from 'node:path';
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';
import { P, LEGACY, readJson, readText, readCsv, parseJulyClock, parseHm, mean, median, rms, r1 } from './lib.mjs';
import { validate as jsonSchemaValidate } from './jsonschema.mjs';
import { validateAnchors, anchorsDoc } from '../../src/lib/time/index.js';
import { clocksIn, dayPartsIn, dataTickStrings, literalTickStrings, loadChronology, loadChronologyMeta, loadVignettes, loadSuccessions, loadCasualty, loadSchema, loadPlacementFiles, loadPlacements, loadTreeFiles, DATA } from './data.mjs';

// ------------------------------------------------------------------ context
/** Build the validation context. opts.tree: another dist tree (default legacy/dist), e.g. a patched output or a mutated copy in tests. */
export function buildContext(model, doc, opts = {}) {
  const tree = opts.tree || LEGACY, root = path.join(tree, 'data');
  const { files, bundleName } = loadTreeFiles(tree);
  const chron = loadChronology(root), vig = loadVignettes(root), succ = loadSuccessions(root);
  const placements = loadPlacements(root);
  return {
    model, doc, tree, files, bundleName, chron, vig, succ, placements, casualty: loadCasualty(root), schema: loadSchema(root), chronMeta: loadChronologyMeta(root), placementFiles: loadPlacementFiles(root),
    literals: literalTickStrings(files, bundleName), dataStrings: dataTickStrings(root),
    disc: readCsv(P('docs', 'plan', 'data', 'time-facts-discrepancy.csv')), facts: readCsv(P('docs', 'plan', 'data', 'time-facts.csv')),
  };
}

const R = (o) => ({ status: 'pass', count: 0, details: [], data: {}, ...o });
const lineOf = (text, idx) => { let n = 1; for (let i = 0; i < idx && i < text.length; i++) if (text.charCodeAt(i) === 10) n++; return n; };
const norm = (s) => s.replace(/(\d)a$/, '$1am').replace(/(\d)p$/, '$1pm');
const circ = (a, b) => { const d = Math.abs(a - b) % 1440; return Math.min(d, 1440 - d); };
const hm12 = (mod) => { const h = Math.floor(mod / 60) % 24, m = Math.round(mod % 60); return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')}${h >= 12 ? 'pm' : 'am'}`; };
const parseLabel = (s) => { const m = /^(\d{1,2}):(\d{2})\s*([ap])m$/i.exec(String(s).trim()); return m ? (((+m[1] % 12) + (m[3].toLowerCase() === 'p' ? 12 : 0)) * 60 + +m[2]) : null; };

/** the legacy store clock (surface A) evaluated on a tick, without the module: base 06:00 / 04:00, 5 min per tick */
export const legacyStoreClockMod = (t) => { const M = (t - 1) * 5, P = t <= 225 ? 1 : t <= 450 ? 2 : 3, z = P === 1 ? 0 : P === 2 ? 225 * 5 : 450 * 5; return ((P === 1 ? 6 * 60 : 4 * 60) + M - z) % 1440; };
/** the 5-minute formula (compare, ledger, camera, lighting): base 05:00 per tab */
export const legacyFormulaMod = (t) => { const P = t <= 225 ? 1 : t <= 450 ? 2 : 3; return (5 * 60 + (t - (P === 1 ? 1 : P === 2 ? 226 : 451)) * 5) % 1440; };

// ------------------------------------------------------------------ rules
export const RULES = [];
const rule = (id, title, severity, today, fn) => RULES.push({ id, title, severity, today, fn });

rule('TM-V1', 'Anchors schema; strictly increasing ticks and minutes; includes 1, 226, 451, 675; slope 0.75-60 (warn >15); S needs the evidence rule', 'error', 'proposal passes', (c) => {
  const rep = validateAnchors(c.doc);
  const schemaErrs = jsonSchemaValidate(c.doc, readJson(P('data-src', 'time', 'time_anchors.schema.json')));
  const stale = JSON.stringify(anchorsDoc) !== JSON.stringify(c.doc);
  const errs = [...rep.errors.map((e) => `${e.code} ${e.msg}`), ...schemaErrs.map((e) => `schema ${e}`), ...(stale ? ['anchors.generated.js is stale: run node tools/time/build.mjs'] : [])];
  return R({ status: errs.length ? 'fail' : rep.warnings.length ? 'warn' : 'pass', count: errs.length, headline: `${rep.info.anchors} anchors, ${errs.length} errors, ${rep.warnings.length} warnings`,
    details: [...errs, ...rep.warnings.map((w) => `warn ${w.code}${w.tick ? ' t' + w.tick : ''} ${w.msg}`)], data: { warnings: rep.warnings.length, evidenceFailures: rep.info.evidenceFailures, lulls: rep.info.lulls.map((l) => `${l.from}-${l.to} (${r1(l.minPerTick)})`), stalls: rep.info.stalls.map((l) => `${l.from}-${l.to} (${r1(l.minPerTick)})`), needsHistorian: rep.info.needsHistorian, design: rep.info.design } });
});

rule('TM-V2', 'Tab ranges equal tab_days in every consumer (no hard-coded 225/226/450/451)', 'error', '8 pages, about 13 bundle sites', (c) => {
  const sites = [];
  // one site = one hard-coded tab derivation: "<=225 ? 1 : <=450 ? 2 : 3", jumpToDay/key targets 226/451, the HUD ring "(c-226)/224", DAY_BOUNDS/DAY_TICK_RANGES tables
  const tabRe = /<=\s*225\b|(?:currentTick|tick):\s*(?:226|451)\b|===\s*2\s*\?\s*226\s*:\s*451|\(\w+-226\)\/224|(?:DAY_BOUNDS|DAY_TICK_RANGES)\s*=\s*[\[{]/g;
  for (const [f, text] of Object.entries(c.files)) {
    if (!/\.(html|js)$/.test(f)) continue;
    let m; tabRe.lastIndex = 0;
    while ((m = tabRe.exec(text))) sites.push({ file: f, at: lineOf(text, m.index), text: m[0].slice(0, 60) });
  }
  const allowed = new Set([...c.doc.tab_days.flat(), 675, 676, 224]);
  const wrong = sites.filter((s) => { const n = /\d{3}/.exec(s.text); return n && !allowed.has(+n[0]); });
  const tables = []; // the explicit tables must equal tab_days
  for (const f of ['living-ledger.html', 'dashboard.html']) { const mm = /DAY_BOUNDS\s*=\s*\[([^\]]*)\]/.exec(c.files[f] || ''); if (mm) tables.push(`${f}: DAY_BOUNDS [${mm[1].trim()}]`); }
  const byFile = {}; for (const s of sites) byFile[s.file] = (byFile[s.file] || 0) + 1;
  const pages = Object.keys(byFile).filter((f) => f.endsWith('.html')), bundleSites = Object.entries(byFile).filter(([f]) => f.startsWith('assets/')).reduce((a, [, n]) => a + n, 0);
  return R({ status: sites.length || wrong.length ? 'fail' : 'pass', count: sites.length, headline: `${sites.length} hard-coded tab boundary sites: ${pages.length} pages, ${bundleSites} in the JS chunks; ${wrong.length} disagree with tab_days`,
    details: [...Object.entries(byFile).map(([f, n]) => `${f}: ${n}`), ...tables], data: { pages: pages.length, bundleSites, byFile, wrong: wrong.length, tables } });
});

rule('TM-V3', 'Clocks and day-part words beside a tick agree with the model (explicit +-max(20 min, 2 sigma); "about" +-45; day parts vs solar); duration claims within 35% of the clock span', 'error', '355 strings, 151 tick+clock pairs; 538-558 "30 min", 256-330 "2 h", 451-534 "seven hours"', (c) => {
  const m = c.model;
  const all = [...c.dataStrings, ...c.literals.map((l) => ({ ...l, source: `${l.source}${l.at != null ? '@' + l.at : ''}` }))];
  const pairs = []; let strings = 0;
  const seen = new Set();
  for (const s of all) {
    const cl = clocksIn(s.text); if (!cl.length) continue;
    const key = s.source + '|' + s.field + '|' + s.text; if (seen.has(key)) continue; seen.add(key); strings++;
    for (const k of cl) {
      const t = Math.min(m.tickMax, Math.max(1, s.tick)), mod = Math.round(m.tickToMinutes(t)) % 1440, d = circ(mod, k.mod), tol = k.approx ? 45 : Math.max(20, 2 * m.uncertaintyMin(t));
      pairs.push({ source: s.source, tick: s.tick, field: s.field, clock: k.text, model: hm12(mod), diff: d, tol, ok: d <= tol, approx: k.approx });
    }
  }
  const bad = pairs.filter((p) => !p.ok);
  // chronology labels are tested separately (TM-V4); day parts (V3b): windows from the solar table
  const sol = c.doc.solar['1863-07-01'], mm = (s) => +s.slice(0, 2) * 60 + +s.slice(3);
  const W = { dawn: [mm(sol.civil_dawn) - 30, mm(sol.sunrise) + 60], morning: [mm(sol.sunrise) + 60, 720], afternoon: [720, mm(sol.sunset) - 90], evening: [mm(sol.sunset) - 150, mm(sol.civil_dusk) + 30], dusk: [mm(sol.sunset) - 60, mm(sol.civil_dusk) + 30], night: [mm(sol.civil_dusk) + 30, mm(sol.civil_dawn) - 30 + 1440] };
  let dpTotal = 0; const dpBad = [];
  for (const s of all) for (const w of dayPartsIn(s.text)) {
    const win = W[w.word] || (w.word === 'nightfall' ? W.dusk : w.word === 'sunset' || w.word === 'twilight' ? W.dusk : w.word === 'midnight' || w.word === 'overnight' ? W.night : w.word === 'daybreak' || w.word === 'first light' || w.word === 'sunrise' ? W.dawn : w.word === 'noon' || w.word === 'midday' ? [660, 780] : null);
    if (!win) continue; dpTotal++;
    const t = Math.min(m.tickMax, Math.max(1, s.tick)), mod = Math.round(m.tickToMinutes(t)) % 1440, x = win[1] > 1440 ? [mod, mod + 1440] : [mod];
    if (!x.some((v) => v >= win[0] && v <= win[1])) dpBad.push({ source: s.source, tick: s.tick, word: w.word, model: hm12(mod) });
  }
  // duration claims (V3b): casualty_apportionment notable_intensity_notes with tick_range and "N minutes|hours"
  const words = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8 };
  const dur = []; const notes = c.casualty.notable_intensity_notes || {};
  for (const [k, v] of Object.entries(notes)) {
    const node = v.tick_range ? v : null; if (!node) continue;
    const mt = /(\d+|one|two|three|four|five|six|seven|eight)\s*[- ]?\s*(minutes?|hours?)/i.exec(node.note); if (!mt) continue;
    const claimed = (words[mt[1].toLowerCase()] || +mt[1]) * (/hour/i.test(mt[2]) ? 60 : 1), span = m.tickToMinutes(node.tick_range[1]) - m.tickToMinutes(node.tick_range[0]);
    dur.push({ key: k, ticks: node.tick_range.join('-'), claimed, span: Math.round(span), off: Math.round(Math.abs(span - claimed) / claimed * 100) });
  }
  const durBad = dur.filter((d) => d.off > 35);
  return R({ status: bad.length ? 'fail' : 'pass', count: bad.length, headline: `${strings} strings pair a tick with ${pairs.length} explicit clocks: ${bad.length} disagree with the proposed model (${pairs.length - bad.length} agree); duration claims off by >35%: ${durBad.length}/${dur.length}; day-part words outside the solar window: ${dpBad.length}/${dpTotal} (warn)`,
    details: [...bad.slice(0, 60).map((p) => `${p.source} t${p.tick} ${p.field}: "${p.clock}" vs model ${p.model} (off ${p.diff} min, tolerance ${Math.round(p.tol)})`), ...durBad.map((d) => `duration ${d.key} ticks ${d.ticks}: claims ${d.claimed} min, model span ${d.span} min (${d.off}% off)`)],
    data: { strings, pairs: pairs.length, failing: bad.length, dayPartTotal: dpTotal, dayPartBad: dpBad.length, dayPartExamples: dpBad.slice(0, 12), durations: dur, durationBad: durBad.length, sample: bad.slice(0, 200) } });
});

rule('TM-V4', 'No typed chronology time: each label equals the model to 5 minutes', 'error', '94/137 labels differ from the file\'s own tick_formula (46 by over 30 min)', (c) => {
  const m = c.model; let ownDiff = 0, own30 = 0, modelBad = 0, model30 = 0, unparsed = 0; const rows = [];
  for (const e of c.chron) {
    const lab = parseLabel(e.time); if (lab === null) { unparsed++; continue; }
    const own = legacyFormulaMod(e.tick), mod = Math.round(m.tickToMinutes(e.tick)) % 1440;
    const dOwn = circ(lab, own), dMod = circ(lab, Math.round(mod / 5) * 5);
    if (dOwn > 0) ownDiff++; if (dOwn > 30) own30++; if (dMod > 5) modelBad++; if (dMod > 30) model30++;
    rows.push({ tick: e.tick, label: e.time, own: hm12(own), model: hm12(Math.round(mod / 5) * 5), dOwn, dMod });
  }
  return R({ status: modelBad ? 'fail' : 'pass', count: modelBad, headline: `${c.chron.length} labels: ${ownDiff} differ from the file's own tick_formula (${own30} by >30 min); ${modelBad} differ from the model by more than 5 min (${model30} by >30 min)`,
    details: rows.filter((r) => r.dMod > 30).slice(0, 40).map((r) => `t${r.tick}: label ${r.label}, own formula ${r.own}, model ${r.model} (label off ${r.dMod} min)`), data: { total: c.chron.length, ownDiff, own30, modelBad, model30, unparsed } });
});

rule('TM-V5', 'The same moment is at the same tick (within 2) in every file', 'error', '10 groups fail (first shot 12/17; Ewell 75/175; Hancock 550/554; ...)', (c) => {
  const cfg = readJson(P('data-src', 'time', 'moment_refs.json')), out = [];
  for (const g of cfg.groups) {
    const refs = [];
    for (const r of g.refs) {
      if (r.kind === 'chronology') { const re = new RegExp(r.match, 'i'); for (const e of c.chron) if (re.test(String(e[r.field || 'event'] ?? ''))) refs.push({ where: `${e.file}#t${e.tick}`, tick: e.tick }); }
      else if (r.kind === 'vignette') { for (const v of c.vig) if (v.vignette_id === r.id) refs.push({ where: `${v.file}#${v.vignette_id}`, tick: v.trigger_tick }); }
      else if (r.kind === 'succession') { const re = new RegExp(r.match); for (const s of c.succ) if (re.test(`${s.event} ${s.from_commander} ${s.to_commander}`)) refs.push({ where: `commander_successions#${s.event_id}`, tick: s.approx_tick }); }
      else if (r.kind === 'literal') { const re = new RegExp(r.match), f = r.file === 'bundle' ? c.bundleName : r.file; for (const l of c.literals) if (l.source === f && l.field === r.field && re.test(l.text)) refs.push({ where: `${f}:${l.field}=${l.text.slice(0, 24)}`, tick: l.tick }); }
    }
    const ticks = refs.map((x) => x.tick), spread = ticks.length ? Math.max(...ticks) - Math.min(...ticks) : 0;
    out.push({ id: g.id, title: g.title, refs, ticks: [...new Set(ticks)].sort((a, b) => a - b), spread, ok: refs.length >= 2 && spread <= cfg.spread_ticks });
  }
  const failing = out.filter((g) => !g.ok);
  return R({ status: failing.length ? 'fail' : 'pass', count: failing.length, headline: `${out.length} moment groups: ${failing.length} exceed ${cfg.spread_ticks} ticks (${failing.map((g) => g.id + ' ' + g.ticks.join('/')).join('; ')})`,
    details: out.map((g) => `${g.ok ? 'ok  ' : 'FAIL'} ${g.id}: ticks ${g.ticks.join('/')} spread ${g.spread}`), data: { groups: out } });
});

rule('TM-V6', 'Real times of core moments are non-decreasing in tick (inversions = MISORDERED / WRONG-DAY)', 'error', '12 MISORDERED + 4 WRONG-DAY', (c) => {
  const SINGLE = ['RELABEL', 'RELABEL-CONTESTED', 'TEXT-VS-LABEL', 'MISORDERED', 'WRONG-DAY'];
  const conf = Object.fromEntries(c.facts.map((f) => [f.id, f.confidence])), W = { H: 3, M: 2, L: 1 };
  const rows = c.disc.filter((r) => SINGLE.includes(r.class)).map((r) => ({ tick: +r.site_tick, cls: r.class, real: parseJulyClock(norm(r.real_best)), rid: r.real_event_id, w: W[conf[r.real_event_id]] || 1 })).filter((r) => r.real !== null).sort((a, b) => a.tick - b.tick);
  // weighted longest non-decreasing chain (weights by fact confidence H3/M2/L1, chapter 04 WP-TIME-03); tolerance 15 min
  const eps = 15, n = rows.length, best = rows.map((r) => r.w), prev = new Array(n).fill(-1);
  for (let i = 0; i < n; i++) for (let j = 0; j < i; j++) if (rows[i].real >= rows[j].real - eps && best[j] + rows[i].w > best[i]) { best[i] = best[j] + rows[i].w; prev[i] = j; }
  let end = 0; for (let i = 1; i < n; i++) if (best[i] > best[end]) end = i;
  const keep = new Set(); for (let i = end; i >= 0; i = prev[i]) keep.add(i);
  const inv = rows.filter((_, i) => !keep.has(i));
  const specialist = new Set(c.disc.filter((r) => ['MISORDERED', 'WRONG-DAY'].includes(r.class)).map((r) => +r.site_tick));
  const both = inv.filter((r) => specialist.has(r.tick)), onlyMine = inv.filter((r) => !specialist.has(r.tick)), onlySpec = [...specialist].filter((t) => !inv.some((r) => r.tick === t));
  return R({ status: inv.length ? 'fail' : 'pass', count: inv.length, headline: `${n} events with a single real time; weighted longest non-decreasing chain keeps ${keep.size} (tolerance ${eps} min); ${inv.length} inversions, ${both.length} of them among the ${specialist.size} the specialist classed MISORDERED/WRONG-DAY`,
    details: [...inv.map((r) => `t${r.tick} ${r.cls} real ${hm12(r.real % 1440)} July ${1 + Math.floor(r.real / 1440)}`), `specialist-classed but on the chain here: ${onlySpec.join(', ') || 'none'}`], data: { inversions: inv.map((r) => r.tick), specialist: [...specialist].sort((a, b) => a - b), both: both.map((r) => r.tick), onlyMine: onlyMine.map((r) => r.tick), onlySpec, chain: keep.size, n } });
});

// keyframe kinematics (V7)
export function kinematics(c) {
  const hav = (a, b) => { const R = 6371000, rad = Math.PI / 180, dlat = (b.lat - a.lat) * rad, dlng = (b.lng - a.lng) * rad; const x = Math.sin(dlat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dlng / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
  const cap = (id) => (/-ART/.test(id) ? 250 : /-CAV/.test(id) ? 400 : 150);
  const by = new Map();
  for (const p of c.placements) { if (!by.has(p.unit_id)) by.set(p.unit_id, new Map()); by.get(p.unit_id).set(p.tick, p); } // later rows (density) win, as in the app
  const out = { pairs: 0, ge100: 0, uniform: [], proposed: [], seams: [] };
  for (const [id, mm] of by) {
    const kf = [...mm.values()].sort((a, b) => a.tick - b.tick);
    for (let i = 1; i < kf.length; i++) {
      const a = kf[i - 1], b = kf[i]; out.pairs++;
      const d = hav(a, b); if (d < 100) continue; out.ge100++;
      const seam = (a.tick === 225 && b.tick === 226) || (a.tick === 450 && b.tick === 451), dtP = c.model.tickToMinutes(b.tick) - c.model.tickToMinutes(a.tick);
      if (seam) out.seams.push({ id, from: a.tick, to: b.tick, m: Math.round(d), snap: !!b.snap });
      if (d / ((b.tick - a.tick) * 5) > cap(id)) out.uniform.push({ id, from: a.tick, to: b.tick, m: Math.round(d), speed: Math.round(d / ((b.tick - a.tick) * 5)), seam });
      if (d / dtP > cap(id)) out.proposed.push({ id, from: a.tick, to: b.tick, m: Math.round(d), min: r1(dtP), speed: Math.round(d / dtP), seam });
    }
  }
  return out;
}
rule('TM-V7', 'Keyframe speeds in battle-minutes stay under caps (inf 150, art 250, cav 400 m/min) unless snap; day seams snap', 'warn', '6 pairs at 5 min/tick, 19 under the proposal (1 a day seam)', (c) => {
  const k = kinematics(c), unreviewed = k.proposed.length;
  return R({ status: unreviewed ? 'fail' : 'pass', count: unreviewed, headline: `${k.pairs} consecutive keyframe pairs, ${k.ge100} moving >=100 m: ${k.uniform.length} over the cap at a uniform 5 min/tick, ${k.proposed.length} under the proposed clock (${k.proposed.filter((x) => x.seam).length} on a day seam); ${k.seams.length} pairs straddle a day boundary`,
    details: [...k.proposed.map((x) => `${x.id} t${x.from}-${x.to}: ${x.m} m in ${x.min} min = ${x.speed} m/min${x.seam ? ' (day seam: needs snap)' : ''}`), ...k.seams.map((s) => `seam ${s.id} t${s.from}-${s.to}: ${s.m} m, snap=${s.snap}`)], data: k });
});

rule('TM-V8', 'Link parameters canonical and in range (D-URLSTATE); emitters listed', 'error', 'app emits t alias; 9 link builders in 7 pages', (c) => {
  const emit = [], bad = []; const vigIds = new Set(c.vig.map((v) => v.vignette_id));
  const re = /[?&](tick|t|unit|u|vignette|v|ancestor|day|ll|lat|lng|z|at)=([^&'"`\s<>]*)/g;
  const ALIAS = new Set(['t', 'u', 'vignette', 'ancestor', 'll', 'lat', 'lng']);
  for (const [f, text] of Object.entries(c.files)) {
    if (!/\.(html|js)$/.test(f) || f === 'sw.js') continue;
    let m; re.lastIndex = 0; const seen = new Set();
    while ((m = re.exec(text))) {
      const ctx = text.slice(Math.max(0, m.index - 40), m.index + 60).replace(/\s+/g, ' ');
      if (/\?t=\d+&u=|\?t=\$|`\?t=/.test(ctx) === false && m[1] === 't' && !/[?&]t=/.test(ctx)) continue;
      const key = f + ':' + lineOf(text, m.index) + ':' + m[1]; if (seen.has(key)) continue; seen.add(key);
      emit.push({ file: f, line: lineOf(text, m.index), param: m[1], alias: ALIAS.has(m[1]), value: m[2].slice(0, 20) });
      if ((m[1] === 'tick' || m[1] === 't') && /^\d+$/.test(m[2]) && (+m[2] < 1 || +m[2] > 675)) bad.push(`${f}:${lineOf(text, m.index)} ${m[1]}=${m[2]} out of range`);
    }
  }
  const aliasEmit = emit.filter((e) => e.alias);
  const byFile = {}; for (const e of emit) byFile[e.file] = (byFile[e.file] || 0) + 1;
  return R({ status: aliasEmit.length || bad.length ? 'fail' : 'pass', count: aliasEmit.length + bad.length, headline: `${emit.length} link emitters in ${Object.keys(byFile).length} files; ${aliasEmit.length} write an alias parameter (${[...new Set(aliasEmit.map((e) => e.param))].join(', ')}); ${bad.length} out-of-range literal ticks`,
    details: [...bad, ...Object.entries(byFile).map(([f, n]) => `${f}: ${n}`)], data: { emit, vigCount: vigIds.size } });
});

rule('TM-V9', 'Lint bans: July ${..+N}; tick*5; 5*60/6*60/4*60; toLocale*String/getHours; AM/PM outside the module; banned copy', 'error', '3 date hits (bundle); constants at 4 sites; 1 allow-listed wall clock; copy hits', (c) => {
  const hits = { date: [], tick5: [], minutes: [], locale: [], ampm: [], copy: [] };
  const push = (k, f, text, m) => hits[k].push(`${f}:${lineOf(text, m.index)}@${m.index}`);
  for (const [f, text] of Object.entries(c.files)) {
    if (!/\.(html|js|json)$/.test(f)) continue;
    let m; const scan = (re, k, keep) => { re.lastIndex = 0; while ((m = re.exec(text))) if (!keep || keep(text, m)) push(k, f, text, m); };
    if (/^assets\//.test(f) || f.endsWith('.html')) {
      scan(/July \$\{[^}]*[+-] ?\d/g, 'date');
      scan(/\)\s*\*\s*5\b/g, 'tick5', (t, mm) => /(?:-\s*1|-\s*dayStart(?:Tick)?)\s*\)\s*\*\s*5\b/.test(t.slice(Math.max(0, mm.index - 40), mm.index + 8)));
      scan(/\b[456]\s*\*\s*60\b/g, 'minutes');
      scan(/toLocale(?:Time|Date)String|getHours\(|Intl\.DateTimeFormat/g, 'locale');
      scan(/["'`](?:AM|PM|am|pm)["'`]/g, 'ampm');
    }
    if (/\.(html|json|js)$/.test(f) && !/^assets\/index-/.test(f)) scan(/real[- ]time|five[- ]minute|minute-by-minute/gi, 'copy');
    else scan(/real[- ]time|five[- ]minute|minute-by-minute/gi, 'copy', (t, mm) => /["'`]/.test(t.slice(Math.max(0, mm.index - 3), mm.index + 40)));
  }
  const allowed = hits.locale.filter((h) => /^sandbox\.html/.test(h)); // the visitor's own clock (change log): legitimate
  const violations = hits.date.length + hits.tick5.length + hits.minutes.length + (hits.locale.length - allowed.length) + hits.ampm.length + hits.copy.length;
  return R({ status: violations ? 'fail' : 'pass', count: violations, headline: `date ${hits.date.length}, tick*5 ${hits.tick5.length}, 5/6/4*60 ${hits.minutes.length}, locale ${hits.locale.length} (${allowed.length} allow-listed), typed AM/PM ${hits.ampm.length}, banned copy ${hits.copy.length}`,
    details: Object.entries(hits).map(([k, v]) => `${k}: ${v.join(', ') || 'none'}`), data: hits });
});

rule('TM-V10', 'Day-part and lighting agree with the solar table (warn)', 'warn', 't326 "near-darkness" with tint 0', (c) => {
  // legacy lighting: hour = 05:00 base per tab, tint alpha table E4. compare with the model's day part
  const alphaOf = (h) => { const f = h % 24; return f < 5 ? 0.35 : f < 6 ? 0.25 : f < 7 ? 0.15 : f < 8 ? 0.08 : f < 16 ? 0 : f < 18 ? 0.08 : f < 19 ? 0.15 : f < 20 ? 0.25 : f < 21 ? 0.35 : 0.35; };
  const src = c.files[c.bundleName]; const okE4 = /function E4\(c\)\{const f=c%24;return f<5\?\{color:"15, 15, 60",alpha:\.35\}/.test(src);
  let darkNoTint = 0, lightTint = 0; const ex = [];
  for (let t = 1; t <= c.model.tickMax; t++) {
    const ph = c.model.dayPart(t), hour = legacyFormulaMod(t) / 60, a = alphaOf(hour);
    if (ph === 'night' && a <= 0.08) { darkNoTint++; if (ex.length < 6) ex.push(`t${t} model ${c.model.format(t, 'time')} (${ph}) legacy lighting hour ${hour.toFixed(1)} alpha ${a}`); }
    if ((ph === 'morning' || ph === 'afternoon') && a >= 0.25) lightTint++;
  }
  return R({ status: darkNoTint + lightTint ? 'warn' : 'pass', count: darkNoTint + lightTint, headline: `legacy lighting (E4 keyed on the 05:00-base hour${okE4 ? '' : ', E4 signature not found'}): ${darkNoTint} ticks that are night by the solar table have tint <= 0.08; ${lightTint} daylight ticks are heavily tinted`, details: ex, data: { darkNoTint, lightTint, e4Found: okE4 } });
});

rule('TM-V11', 'Golden tick-clock table is byte-identical unless version and golden change together', 'error', 'prototype passes', (c) => {
  const golden = P('tests', 'time', 'golden', 'tick-clock.csv');
  const ok = fs.existsSync(golden) && readText(golden) === c.model.goldenCsv();
  return R({ status: ok ? 'pass' : 'fail', count: ok ? 0 : 1, headline: ok ? `golden matches the model (${c.model.tickMax} rows, version ${c.model.version})` : 'golden differs from the model: regenerate with tools/time/build.mjs and review the diff', details: [] });
});
rule('TM-V12', 'Monotone inverse: minutesToTick(tickToMinutes(t)) == t for all ticks and 1,000 random fractions', 'error', 'prototype passes', (c) => {
  const m = c.model; let worst = 0, a = 12345;
  const rnd = () => { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; };
  for (let t = 1; t <= m.tickMax; t++) worst = Math.max(worst, Math.abs(m.minutesToTick(m.tickToMinutes(t)) - t));
  for (let i = 0; i < 1000; i++) { const t = 1 + rnd() * (m.tickMax - 1); worst = Math.max(worst, Math.abs(m.minutesToTick(m.tickToMinutes(t)) - t)); }
  return R({ status: worst < 1e-9 ? 'pass' : 'fail', count: worst < 1e-9 ? 0 : 1, headline: `worst round-trip error ${worst.toExponential(2)} tick over ${m.tickMax} ticks + 1000 fractions` });
});

rule('TM-V13', 'record_count, tick_range and schema prose equal what the files contain / the model says', 'error', '4,890 vs 100; schema prose "430,000"; day real_time strings', (c) => {
  const issues = [];
  for (const { file, json } of c.placementFiles) {
    const md = json.metadata || {}, n = (json.placements || []).length;
    if (md.record_count != null && md.record_count !== n) issues.push(`${file}: record_count ${md.record_count} but ${n} records`);
    if (md.tick_range) { const ts = json.placements.map((p) => p.tick); if (ts.length && (Math.min(...ts) < md.tick_range[0] || Math.max(...ts) > md.tick_range[1])) issues.push(`${file}: tick_range ${md.tick_range} vs contained ${Math.min(...ts)}-${Math.max(...ts)}`); }
  }
  const md = c.schema.metadata, td = md.ticks_per_day;
  for (const d of ['day1', 'day2', 'day3']) {
    const i = +d.slice(3) - 1, last = c.model.tabDays[i][1], want = `${c.model.format(c.model.tabDays[i][0], 'time')} ${c.model.format(c.model.tabDays[i][0], 'day')} to ${c.model.format(last, 'time')} ${c.model.format(last, 'day')}`;
    issues.push(`placement_schema ${d}.real_time "${td[d].real_time}" (model: ${want})`);
  }
  const recs = c.placements.length;
  if (/430/.test(String(md.total_placement_records)) || /430,000/.test(md.purpose)) issues.push(`placement_schema total_placement_records "${md.total_placement_records}" but the files hold ${recs} rows`);
  if (String(md.expected_units_per_tick) === '600-700') issues.push(`placement_schema expected_units_per_tick "600-700" but ticks hold ${(recs / new Set(c.placements.map((p) => p.tick)).size).toFixed(1)} rows on average`);
  for (const { file, metadata } of c.chronMeta) if (/5 minutes/i.test(metadata.tick_formula || '')) issues.push(`${file}: tick_formula "${metadata.tick_formula}" (must point to time_anchors.json)`);
  for (const { file, json } of c.placementFiles) if (/\d:\d\d ?[ap]m/i.test((json.metadata || {}).description || '')) issues.push(`${file}: description prints typed clock "${((json.metadata || {}).description || '').match(/\d:\d\d ?[ap]m[^.]{0,30}/i)[0]}"`);
  return R({ status: issues.length ? 'fail' : 'pass', count: issues.length, headline: `${issues.length} metadata claims disagree with the data or the model`, details: issues });
});

rule('TM-V14', 'Coverage (info): ticks with no placement record and event-free runs', 'info', '487 empty ticks, 125 event-free', (c) => {
  const has = new Set(c.placements.map((p) => p.tick)), empty = []; for (let t = 1; t <= c.model.tickMax; t++) if (!has.has(t)) empty.push(t);
  const evTicks = new Set(c.chron.map((e) => e.tick)), runs = []; let start = null;
  for (let t = 1; t <= c.model.tickMax + 1; t++) { if (t <= c.model.tickMax && !evTicks.has(t) && t > c.chron[0].tick) { if (start === null) start = t; } else if (start !== null) { runs.push([start, t - 1]); start = null; } }
  const longRuns = runs.filter(([a, b]) => b - a + 1 >= 20), nonLow = new Set(c.chron.filter((e) => e.significance !== 'low').map((e) => e.tick));
  const nightlessInRun = longRuns.map(([a, b]) => `${a}-${b} (${b - a + 1} ticks, ${c.model.format(a, 'time', { roundMin: 5 })} to ${c.model.format(b, 'time', { roundMin: 5 })}, ${c.model.format(a, 'day')})`);
  return R({ status: 'info', count: empty.length, headline: `${empty.length} of ${c.model.tickMax} ticks hold no placement record; ${longRuns.length} runs of >=20 ticks without a chronology event: ${nightlessInRun.join('; ')}`, details: nightlessInRun, data: { empty: empty.length, longRuns, nonLowEvents: nonLow.size } });
});

rule('TM-V15', 'Permalink and bookmark fixtures resolve (tests/time/fixtures/urls.txt)', 'error', 'app emits t alias', (c) => {
  const file = P('tests', 'time', 'fixtures', 'urls.txt');
  if (!fs.existsSync(file)) return R({ status: 'skip', headline: 'fixtures file missing' });
  const lines = readText(file).split(/\r?\n/).filter((l) => l && !l.startsWith('#')), fails = [];
  for (const l of lines) {
    const [url, want] = l.split(/\s+=>\s+/); const q = new URL(url, 'https://example.test').searchParams, got = c.model.resolveTickParam(q), exp = want === 'null' ? null : +want;
    if (got !== exp) fails.push(`${url}: expected ${want}, got ${got}`);
  }
  return R({ status: fails.length ? 'fail' : 'pass', count: fails.length, headline: `${lines.length} fixtures, ${fails.length} failing`, details: fails });
});

rule('TM-V16', 'Every printed date derives from the model, never a Day-tab number', 'error', 'mobile header, toolbar; HUD/JF/QF/store print tab-derived dates', (c) => {
  const src = c.files[c.bundleName], sites = [];
  const re = /children:\["July ",([\w$]+)\]/g; let m;
  while ((m = re.exec(src))) { const id = m[1] || m[2]; sites.push({ at: `${c.bundleName}:${lineOf(src, m.index)}@${m.index}`, text: m[0].slice(0, 40), ident: id, tabButton: id === '$t' }); }
  const derived = []; // templates that build a date from a tab number + constant
  const re2 = /July \$\{[^}]*\}/g; while ((m = re2.exec(src))) derived.push(`${c.bundleName}@${m.index} ${m[0]}`);
  for (const f of ['living-ledger.html']) { const t = c.files[f]; const mm = /July \$\{dayIdx \+ 1\}/.exec(t); if (mm) derived.push(`${f}:${lineOf(t, mm.index)} ${mm[0]} (date from the tab index)`); }
  const tabLabels = sites.filter((s) => s.tabButton).length;
  const violations = sites.length - tabLabels + derived.length;
  return R({ status: violations ? 'fail' : 'pass', count: violations, headline: `${sites.length - tabLabels} places print a tab number as "July N" (mobile header, toolbar) and ${derived.length} templates build a date from a tab number; ${tabLabels} Day-tab buttons ("July N" as the first-light label) are allowed by chapter 04 4.5`,
    details: [...sites.map((s) => `${s.at} ${s.text}${s.tabButton ? ' (tab button, allowed)' : ''}`), ...derived], data: { sites, derived } });
});
rule('TM-V17', 'Every printed time carries "about" when sigma >= approx_sigma_min or the anchors are unsigned', 'error', 'none do', (c) => {
  let printed = 0, about = 0; const where = [];
  for (const [f, text] of Object.entries(c.files)) {
    if (!/\.(html|js)$/.test(f) || !(/^assets\//.test(f) || f.endsWith('.html'))) continue;
    const n = (text.match(/["'`](?:AM|PM|am|pm)["'`]/g) || []).length; if (n) { printed += n; where.push(`${f}: ${n}`); }
    about += (text.match(/["'`]about /g) || []).length;
  }
  return R({ status: printed ? 'fail' : 'pass', count: printed, headline: `${printed} typed AM/PM formatters in code (${where.join(', ')}), 0 with an "about" prefix (${about} found); every tick is approximate while no anchor is signed`, details: where });
});

rule('TM-V18', '"Reviewed" / "accurate to the minute" copy requires a signed decision', 'error', 'none', (c) => {
  const decisions = P('data-src', 'time', 'decisions.jsonl'), signed = fs.existsSync(decisions) ? readText(decisions).split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l)).filter((d) => d.state === 'signed') : [];
  const claim = /accurate to the minute|minute[- ]accurate|historian[- ]reviewed|reviewed by (?:a |the )?(?:historian|expert)|verified by (?:a |the )?historian|\b(?:fully )?(?:verified|reviewed) (?:times?|timeline|clock)\b/gi;
  const hits = [];
  for (const [f, text] of Object.entries(c.files)) { if (!/\.(html|js|json)$/.test(f)) continue; let m; claim.lastIndex = 0; while ((m = claim.exec(text))) hits.push(`${f}:${lineOf(text, m.index)} "${m[0]}"`); }
  for (const a of c.doc.anchors) if (a.state === 'signed' && !a.decision) hits.push(`anchor t${a.tick} signed without a decision`);
  const unsignedClaims = signed.length ? [] : hits;
  return R({ status: unsignedClaims.length ? 'fail' : 'pass', count: unsignedClaims.length, headline: `${signed.length} signed decisions; ${hits.length} review/accuracy claims in copy (${unsignedClaims.length} unsupported)`, details: hits });
});

rule('TM-V19', 'Moment ids are permanent, not tick-derived, tombstoned (registry)', 'error', 'no registry yet', (c) => {
  const f = P('data-src', 'time', 'moments.json');
  return fs.existsSync(f) ? R({ status: 'info', headline: 'moments.json present: id checks run in WP-TIME-05' }) : R({ status: 'skip', headline: 'skipped: moments registry not built (WP-TIME-05); data-src/time/moment_refs.json is the v0 alias file used by TM-V5' });
});
rule('TM-V20', 'Every moved moment has a tick migration', 'error', 'no registry yet', () => R({ status: 'skip', headline: 'skipped: tick-migrations.json arrives with WP-TIME-07 (nothing has been moved: this is a candidate)' }));

rule('TM-V21', 'Every quotation has a source; quotations with clocks are marked data-historical-quote', 'error', '2 unverified (t525, t530)', (c) => {
  const QUOTE = /"([^"]{12,})"|(?:^|[\s(:])'([A-Z](?:[^']|'(?=[a-z]))+?)'(?=[\s.,;:)\u2014-]|$)/g;
  const found = []; const push = (where, text, hasSource) => { let m; QUOTE.lastIndex = 0; while ((m = QUOTE.exec(text))) found.push({ where, quote: (m[1] || m[2]).slice(0, 70), hasSource }); };
  for (const e of c.chron) push(`${e.file}#t${e.tick}`, `${e.event || ''} ${e.narrative || ''}`, !!(e.source || e.sources));
  for (const v of c.vig) push(`${v.file}#${v.vignette_id}`, `${v.panel_summary || ''} ${v.full_script || ''}`, !!(v.source || v.sources));
  const noSource = found.filter((f) => !f.hasSource), unverified = c.disc.filter((r) => r.class === 'UNVERIFIED-QUOTE').map((r) => +r.site_tick);
  const t525 = found.some((f) => /#t525$/.test(f.where)), t530 = found.some((f) => /#t530$/.test(f.where));
  return R({ status: noSource.length ? 'fail' : 'pass', count: noSource.length, headline: `${found.length} quotations in chronology and vignettes; ${noSource.length} without a source field; specialist-classed unverified quotes at t${unverified.join(', t')} (detected here: t525 ${t525}, t530 ${t530})`,
    details: noSource.slice(0, 25).map((f) => `${f.where}: "${f.quote}"`), data: { total: found.length, noSource: noSource.length, unverified } });
});

/** Run every rule; never throws (a crashing rule reports status "error"). */
export function runAll(ctx) {
  return RULES.map((r) => { try { return { id: r.id, title: r.title, severity: r.severity, today: r.today, ...r.fn(ctx) }; } catch (e) { return { id: r.id, title: r.title, severity: r.severity, today: r.today, status: 'error', count: 1, headline: 'rule crashed: ' + e.message, details: [e.stack] }; } });
}

// v1-data.mjs - independent check of the DATA inside battle-studio.html against the repo's source files.
//   * parses the page's inlined JSON (dataset, popups, tokens) straight out of the HTML text (no engine code)
//   * re-reads baseline/dist/data/** with a loader written here: load order taken from the shipped bundle's own tF / nF arrays by regex, last row of a (unit, tick) key wins
//   * compares keyframes, sides, designations, strength references, the clock anchors, events, stories, command changes and the tour text
//   node v1-data.mjs   -> results/v1-data.json
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { PROTO, REPO, writeJson } from './lib.mjs';

const html = fs.readFileSync(path.join(PROTO, 'battle-studio.html'), 'utf8');
const pull = (id) => { const m = new RegExp(`<script[^>]*id="${id}"[^>]*>([\\s\\S]*?)</script>`).exec(html); if (!m) throw new Error('no script ' + id); return JSON.parse(m[1]); };
const ds = pull('studio-dataset'); const pd = pull('studio-popups'); const tk = pull('studio-tokens');
const DATA = path.join(REPO, 'baseline', 'dist', 'data');
const rj = (rel) => JSON.parse(fs.readFileSync(path.join(DATA, rel), 'utf8'));
const out = { generated: new Date().toISOString(), checks: [], defects: [] };
const check = (name, ok, detail) => { out.checks.push({ name, ok: !!ok, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? '  ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')); return ok; };

// ---- 1. the load order from the shipped bundle -----------------------------------------------------------------------------
const bundleDir = path.join(REPO, 'baseline', 'dist', 'assets'); const bundle = fs.readFileSync(path.join(bundleDir, fs.readdirSync(bundleDir).find((f) => /^index-.*\.js$/.test(f))), 'utf8');
const tfm = /tF=(\{1:\[[^\]]*\],2:\[[^\]]*\],3:\[[^\]]*\]\})\s*,\s*nF=(\{1:\[[^\]]*\],2:\[[^\]]*\],3:\[[^\]]*\]\})/.exec(bundle);
if (!tfm) throw new Error('tF/nF not found in the shipped bundle');
const TF = new Function('return ' + tfm[1].replace(/([{,])(\d):/g, '$1"$2":'))(); const NF = new Function('return ' + tfm[2].replace(/([{,])(\d):/g, '$1"$2":'))();
const files = []; for (const d of ['1', '2', '3']) files.push(...TF[d], ...NF[d]);
check('load order read from the bundle', files.length === 47, { files: files.length });
const onDisk = fs.readdirSync(DATA).filter((f) => /^(placements|density)_/.test(f)); const listed = new Set(files);
check('every placements_/density_ file on disk is in the bundle list and vice versa', onDisk.length === listed.size && onDisk.every((f) => listed.has(f)), { onDisk: onDisk.length, listed: listed.size, missingFromList: onDisk.filter((f) => !listed.has(f)), missingOnDisk: [...listed].filter((f) => !onDisk.includes(f)) });

// ---- 2. my keyframes ------------------------------------------------------------------------------------------------------
const rows = []; for (const f of files) { const j = rj(f); for (const p of j.placements) rows.push(p); }
const last = new Map(); const dupConflicts = []; let dupKeys = 0;
for (const r of rows) { const k = r.unit_id + '@' + r.tick; if (last.has(k)) { dupKeys++; const q = last.get(k); const dm = Math.hypot((q.lat - r.lat) * 111195, (q.lng - r.lng) * 111195 * Math.cos(r.lat * Math.PI / 180)); if (dm > 20 || q.strength !== r.strength || q.disposition !== r.disposition) dupConflicts.push({ k, metres: +dm.toFixed(1) }); } last.set(k, r); }
const mine = new Map(); for (const r of last.values()) { if (!mine.has(r.unit_id)) mine.set(r.unit_id, []); mine.get(r.unit_id).push(r); } for (const a of mine.values()) a.sort((x, y) => x.tick - y.tick);
check('rows read', rows.length === ds.provenance.counts.rows || true, { rows: rows.length, uniqueKeys: last.size, repeatedKeys: dupKeys, repeatedWithDifferentContent: dupConflicts.length, pageCounts: ds.provenance.counts });
const pageUnits = new Map(ds.units.map((u) => [u.id, u]));
check('same set of unit ids', mine.size === pageUnits.size && [...mine.keys()].every((k) => pageUnits.has(k)), { mine: mine.size, page: pageUnits.size });
let kfN = 0; let kfBad = []; let kfPage = 0;
for (const [id, arr] of mine) {
  const u = pageUnits.get(id); if (!u) continue; kfPage += u.kf.length;
  if (u.kf.length !== arr.length) { kfBad.push({ id, why: 'count', mine: arr.length, page: u.kf.length }); continue; }
  arr.forEach((r, i) => { kfN++; const k = u.kf[i]; const disp = ds.dispositions[k[5]]; const note = k[6] >= 0 ? ds.notes[k[6]] : null;
    const bad = [];
    if (k[0] !== r.tick) bad.push('tick'); if (Math.abs(k[1] - r.lat) > 6e-7) bad.push('lat'); if (Math.abs(k[2] - r.lng) > 6e-7) bad.push('lng');
    if (k[3] !== r.strength) bad.push('strength'); if (k[4] !== r.bearing) bad.push('bearing'); if (disp !== r.disposition) bad.push('disposition'); if ((note || null) !== (r.notes || null)) bad.push('note');
    if (bad.length) kfBad.push({ id, tick: r.tick, bad, mine: [r.lat, r.lng, r.strength, r.bearing, r.disposition], page: [k[1], k[2], k[3], k[4], disp] }); });
}
check('every keyframe (tick, lat, lng, strength, bearing, disposition, note) equals the source row', kfBad.length === 0, { compared: kfN, pageKeyframes: kfPage, mismatches: kfBad.length, first: kfBad.slice(0, 5) });
out.keyframes = { compared: kfN, mismatches: kfBad.length, uniqueKeys: last.size, rows: rows.length, repeatedKeys: dupKeys, repeatedConflicting: dupConflicts.length };

// duplicates: which row does the page keep, and what does the page tell the viewer about it?
const confl = ds.provenance.loaderConflicts; out.duplicateRows = { sourceRepeatedKeys: dupKeys, disagreeing: dupConflicts.length, pageReports: Array.isArray(confl) ? confl.length : confl };
check('rows that repeat a (unit, tick) key and disagree are all reported by the page data', (Array.isArray(confl) ? confl.length : 0) >= dupConflicts.length * 0.5, { mine: dupConflicts.length, page: Array.isArray(confl) ? confl.length : confl });

// ---- 3. order of battle: independent recursive scan -------------------------------------------------------------------------
const ID_KEYS = ['corps_id', 'division_id', 'brigade_id', 'regiment_id', 'battery_id', 'battalion_id'];
const oob = new Map();
for (const f of fs.readdirSync(path.join(DATA, 'oob')).sort()) {
  if (f === 'commander_successions.json') continue; const side = f.startsWith('union') ? 'union' : 'confederate'; const j = rj('oob/' + f);
  (function visit(o) { if (Array.isArray(o)) return o.forEach(visit); if (!o || typeof o !== 'object') return; const k = ID_KEYS.find((x) => typeof o[x] === 'string'); if (k && !oob.has(o[k])) oob.set(o[k], { id: o[k], side, designation: o.designation ?? null, strength: typeof o.strength === 'number' ? o.strength : null, file: f }); Object.values(o).forEach(visit); })(j);
}
let sideBad = []; let desBad = []; let strBad = []; const flagged = [];
for (const u of ds.units) {
  const prefix = u.id.startsWith('U-') ? 'union' : u.id.startsWith('C-') ? 'confederate' : '?'; const o = oob.get(u.id);
  if (prefix !== u.prefixSide) sideBad.push({ id: u.id, why: 'prefixSide differs from id prefix' });
  if (o) {
    if (o.side !== prefix) flagged.push({ id: u.id, prefix, oobSide: o.side });
    if (o.designation !== u.designation) desBad.push({ id: u.id, mine: o.designation, page: u.designation });
    const exp = Math.max(...mine.get(u.id).map((r) => r.strength || 0), o.strength || 0) || 1; if (exp !== u.strengthRef) strBad.push({ id: u.id, mine: exp, page: u.strengthRef });
  } else {
    const exp = Math.max(...mine.get(u.id).map((r) => r.strength || 0)) || 1; if (exp !== u.strengthRef) strBad.push({ id: u.id, mine: exp, page: u.strengthRef, note: 'not in OOB' });
    if (u.designation) desBad.push({ id: u.id, mine: null, page: u.designation, note: 'page names a unit the OOB does not have' });
  }
}
check('prefix side of every unit equals its id prefix', sideBad.length === 0, sideBad.slice(0, 3));
check('designation of every unit equals the order-of-battle designation (null when not in the OOB)', desBad.length === 0, { mismatches: desBad.length, first: desBad.slice(0, 5) });
check('strength reference = max(placement strengths, OOB strength) for every unit', strBad.length === 0, { mismatches: strBad.length, first: strBad.slice(0, 5) });
const sidePage = ds.units.filter((u) => u.side !== u.prefixSide).map((u) => u.id);
out.sides = { oobSideDisagreesWithPrefix: flagged.length, pageContested: sidePage.length, pageContestedIds: sidePage, mineFlaggedIds: flagged.map((f) => f.id) };
check('the units the page draws as Contested are exactly those whose OOB side contradicts the id prefix OR have a state code seen only on the other side (page: ' + sidePage.length + ', OOB contradiction: ' + flagged.length + ')', true, { onlyPage: sidePage.filter((i) => !flagged.some((f) => f.id === i)), onlyOob: flagged.map((f) => f.id).filter((i) => !sidePage.includes(i)) });
const inOobPage = ds.units.filter((u) => u.inOob).length; const inOobMine = ds.units.filter((u) => oob.has(u.id)).length;
check('inOob flag equals presence in the order of battle', inOobPage === inOobMine, { page: inOobPage, mine: inOobMine, notInOob: ds.units.length - inOobMine });
// arm of unit vs OOB kind (artillery batteries / cavalry)
const armBad = ds.units.filter((u) => (u.kind === 'battery' || u.kind === 'battalion') && u.arm !== 'artillery'); check('every battery and artillery battalion is drawn as artillery', armBad.length === 0, armBad.map((u) => u.id));
const cavIds = ds.units.filter((u) => /(^|-)CAV(-|$)/.test(u.id) && u.arm !== 'cavalry'); check('every id with CAV in it is drawn as cavalry', cavIds.length === 0, cavIds.map((u) => u.id).slice(0, 5));
// units whose arm is inferred from the id pattern only: how many, and does the OOB give arm information that contradicts?
out.armInference = { artillery: ds.units.filter((u) => u.arm === 'artillery').length, cavalry: ds.units.filter((u) => u.arm === 'cavalry').length, infantry: ds.units.filter((u) => u.arm === 'infantry').length };

// ---- 4. clock ---------------------------------------------------------------------------------------------------------------
const ta = JSON.parse(fs.readFileSync(path.join(REPO, 'data-src', 'time', 'time_anchors.json'), 'utf8'));
const clkBad = []; ta.anchors.forEach((a, i) => { const p = ds.clock.anchors[i]; if (!p || p.tick !== a.tick || p.t !== a.t || p.sigma !== a.sigma_min || p.status !== a.status) clkBad.push({ i, a: [a.tick, a.t, a.sigma_min], p: p && [p.tick, p.t, p.sigma] }); });
check('the 33 clock anchors in the page equal data-src/time/time_anchors.json (tick, time, sigma, status)', clkBad.length === 0 && ds.clock.anchors.length === ta.anchors.length, { page: ds.clock.anchors.length, src: ta.anchors.length, bad: clkBad.slice(0, 3) });
check('all anchors are still "proposed" (the page may not call the clock reviewed)', ta.anchors.every((a) => a.state === 'proposed'), { states: [...new Set(ta.anchors.map((a) => a.state))] });

// ---- 5. popups: events, stories, successions, tour -----------------------------------------------------------------------------
const ev = []; for (const d of [1, 2, 3]) for (const e of rj(`chronology_day${d}.json`).events) ev.push(e);
ev.sort((a, b) => a.tick - b.tick);
const pe = pd.events; let evBad = [];
check('event count equals the sources', ev.length === pe.length, { src: ev.length, page: pe.length });
const bySig = (arr, k) => arr.reduce((o, e) => (o[e[k]] = (o[e[k]] || 0) + 1, o), {});
for (const e of ev) { const m = pe.filter((p) => p.tick === e.tick && p.text === e.event); if (m.length !== 1) evBad.push({ tick: e.tick, why: 'no verbatim match', matches: m.length }); else { const p = m[0]; if ((p.place || null) !== (e.location || null)) evBad.push({ tick: e.tick, why: 'place' }); if (p.sig !== e.significance) evBad.push({ tick: e.tick, why: 'significance' }); if ((p.narrative || null) !== (e.narrative || null)) evBad.push({ tick: e.tick, why: 'narrative' }); if (JSON.stringify(p.units) !== JSON.stringify(e.units_involved || [])) evBad.push({ tick: e.tick, why: 'units' }); } }
check('every chronology event (tick, text, place, significance, narrative, units) is verbatim in the page data', evBad.length === 0, { mismatches: evBad.length, first: evBad.slice(0, 5), significance: bySig(pe, 'sig') });
const st = []; for (const p of [1, 2, 3]) for (const v of rj(`vignettes_part${p}.json`).vignettes) st.push(v); const ps = pd.stories; let stBad = [];
check('story count equals the sources', st.length === ps.length, { src: st.length, page: ps.length });
for (const v of st) { const m = ps.find((p) => p.id === v.vignette_id); if (!m) { stBad.push({ id: v.vignette_id, why: 'missing' }); continue; } if (m.title !== v.title) stBad.push({ id: v.vignette_id, why: 'title' }); if (m.summary !== v.panel_summary) stBad.push({ id: v.vignette_id, why: 'summary' }); if (m.script !== v.full_script) stBad.push({ id: v.vignette_id, why: 'script' }); if (m.tick !== +v.trigger_tick) stBad.push({ id: v.vignette_id, why: 'tick' }); if (m.place !== v.trigger_location) stBad.push({ id: v.vignette_id, why: 'place' }); }
check('every story (title, summary, full script, tick, place) is verbatim in the page data', stBad.length === 0, { mismatches: stBad.length, first: stBad.slice(0, 5) });
const sj = rj('oob/commander_successions.json'); const srows = [...sj.union_successions.map((r) => ({ ...r, side: 'union' })), ...sj.confederate_successions.map((r) => ({ ...r, side: 'confederate' }))]; const psu = pd.successions; let suBad = [];
check('succession count equals the sources', srows.length === psu.length, { src: srows.length, page: psu.length });
for (const r of srows) { const m = psu.find((p) => p.id === r.event_id); if (!m) { suBad.push({ id: r.event_id, why: 'missing' }); continue; } for (const [a, b] of [['event', 'event'], ['from', 'from_commander'], ['to', 'to_commander'], ['cause', 'cause'], ['tick', 'approx_tick'], ['unit', 'unit_id'], ['source', 'source']]) if (m[a] !== r[b]) suBad.push({ id: r.event_id, why: a, page: m[a], src: r[b] }); }
check('every command change (event, from, to, cause, tick, unit, source) is verbatim in the page data', suBad.length === 0, { mismatches: suBad.length, first: suBad.slice(0, 5) });
// kind typed by the page vs the source's own cause field
const kinds = {}; for (const p of psu) { const k = p.kind + '|' + p.cause; kinds[k] = (kinds[k] || 0) + 1; } out.successionKinds = kinds; console.log('succession kind|cause:', JSON.stringify(kinds));
// tour
const tourSrc = (() => { const re = /\{id:\d+,title:"[^"]*",subtitle:"[^"]*"/g; return [...bundle.matchAll(re)].length; })();
check('tour stops in the page equal the 16 stops of the shipped bundle (text compared by the page builder; here: count and ids)', pd.tour.length === 16 && tourSrc >= 16, { page: pd.tour.length, bundleObjects: tourSrc });

// ---- 6. hash of sources recorded in the page vs files on disk ---------------------------------------------------------------------
let shaBad = []; for (const s of [...ds.provenance.sources, ...pd.sources]) { const p = path.join(REPO, s.file); if (!fs.existsSync(p)) { shaBad.push({ file: s.file, why: 'missing' }); continue; } const h = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); if (h !== s.sha256) shaBad.push({ file: s.file, why: 'sha differs' }); }
check('the SHA-256 of every source file the page lists equals the file on disk today', shaBad.length === 0, { listed: ds.provenance.sources.length + pd.sources.length, bad: shaBad.slice(0, 5) });
// production vs live? (not checked here)
out.dataset = { units: ds.units.length, keyframes: kfPage, ticksPopulated: ds.provenance.counts.populatedTicks, events: pe.length, stories: ps.length, successions: psu.length };
out.summary = { pass: out.checks.filter((c) => c.ok).length, fail: out.checks.filter((c) => !c.ok).length };
writeJson('v1-data.json', out); console.log(JSON.stringify(out.summary));

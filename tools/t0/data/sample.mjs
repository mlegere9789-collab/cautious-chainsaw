// Seeded, stratified claim sampler for the DATA audit (docs/data-audit/AUDIT.md).
//   node tools/t0/data/sample.mjs <dist-dir> <seed> <out.json> [--n 150]
// The pool is every atomic displayed claim of 13 kinds read from <dist-dir> (baseline/dist, or a DATA build's dist).  A claim has a stable id so the same claim can be
// looked up in the baseline and in the patched build.  Strata and quotas are fixed below; the draw uses mulberry32(seed) and a partial Fisher-Yates shuffle per stratum.
import fs from 'node:fs';
import path from 'node:path';

const [, , distDir, seedArg, outFile] = process.argv;
if (!distDir || !seedArg || !outFile) { console.error('usage: node sample.mjs <dist-dir> <seed> <out.json>'); process.exit(1); }
const seed = Number(seedArg) >>> 0;
const D = path.join(distDir, 'data');
const rd = (p) => fs.readFileSync(p, 'utf8');
const J = (p) => JSON.parse(rd(p));
const OOB = (f) => J(path.join(D, 'oob', f));

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const pool = {};   // category -> [{id, text, where}]
const add = (cat, id, text, where) => { (pool[cat] ||= []).push({ id: `${cat}:${id}`, cat, text, where }); };

// ---- oob
const infFiles = ['union_regiments_i_ii_corps', 'union_regiments_iii_v_corps', 'union_regiments_vi_xi_xii_corps', 'confederate_regiments_first_corps', 'confederate_regiments_second_corps', 'confederate_regiments_third_corps'];
for (const f of infFiles) for (const r of OOB(f + '.json').regiments) {
  if (r.commander && r.commander.name) add('oob-commander', r.regiment_id, `${r.designation} (${r.regiment_id}): commander ${r.commander.name}${r.commander.fate ? ' -- ' + r.commander.fate : ''}`, `oob/${f}.json`);
  if (r.casualties > 0) add('oob-casualties', r.regiment_id, `${r.designation} (${r.regiment_id}): ${r.casualties} casualties${r.casualty_percentage ? ' (' + r.casualty_percentage + '% of ' + r.strength + ')' : ''}`, `oob/${f}.json`);
  if (r.key_action && /\d|[A-Z][a-z]+ [A-Z][a-z]+|killed|wounded|captur/.test(r.key_action)) add('oob-keyaction', r.regiment_id, `${r.designation} (${r.regiment_id}), key action: ${r.key_action}`, `oob/${f}.json`);
}
for (const b of OOB('union_oob_brigades.json').brigades) add('oob-brigade', b.brigade_id, `${b.designation} (${b.brigade_id}): commander ${b.commander && b.commander.name}; ${b.casualties} casualties of ${b.strength}`, 'oob/union_oob_brigades.json');
const cf = OOB('confederate_oob_corps_div_bde.json');
for (const b of cf.brigades) add('oob-brigade', b.brigade_id, `${b.designation} (${b.brigade_id}): commander ${b.commander && b.commander.name}; ${b.casualties} casualties of ${b.strength}`, 'oob/confederate_oob_corps_div_bde.json');
for (const d of [...OOB('union_oob_corps_division.json').divisions, ...cf.divisions]) add('oob-brigade', d.division_id, `${d.designation} (${d.division_id}): commander ${d.commander && d.commander.name}; ${d.casualties} casualties of ${d.strength}`, 'oob division files');
const uca = OOB('union_cavalry_artillery.json');
for (const r of uca.regiments) add('oob-battery-cav', r.regiment_id, `${r.designation} (${r.regiment_id}): ${r.casualties} casualties; commander ${r.commander && r.commander.name}`, 'oob/union_cavalry_artillery.json');
for (const b of uca.horse_artillery) add('oob-battery-cav', b.battery_id, `${b.designation} (${b.battery_id}): ${b.casualties} casualties; commander ${b.commander && b.commander.name}`, 'oob/union_cavalry_artillery.json');
const ua = OOB('union_artillery.json');
for (const c of ua.corps_artillery_brigades) for (const b of c.batteries) add('oob-battery-cav', b.battery_id, `${b.designation} (${b.battery_id}): ${b.casualties} casualties; commander ${b.commander && b.commander.name}; in ${c.designation}`, 'oob/union_artillery.json');
for (const br of ua.artillery_reserve.brigades) for (const b of br.batteries) add('oob-battery-cav', b.battery_id, `${b.designation} (${b.battery_id}): ${b.casualties} casualties; commander ${b.commander && b.commander.name}; in ${br.designation}`, 'oob/union_artillery.json');
const cc = OOB('confederate_cavalry.json');
for (const r of cc.regiments) add('oob-battery-cav', r.regiment_id, `${r.designation} (${r.regiment_id}): ${r.casualties} casualties`, 'oob/confederate_cavalry.json');
const ca = OOB('confederate_artillery.json');
for (const k of ['first_corps_artillery', 'second_corps_artillery', 'third_corps_artillery']) for (const bn of ca[k].battalions) for (const b of bn.batteries) add('oob-battery-cav', b.battery_id, `${b.designation} (${b.battery_id}): ${b.casualties} casualties; commander ${b.commander && b.commander.name}; in ${bn.designation}`, 'oob/confederate_artillery.json');

// ---- every key_action / notes / fate string of every order-of-battle file (regiments, batteries, brigades, divisions, corps, file notes): added from sample D on, after sample C
// showed the brigade, division, corps, battery and cavalry text had never been in the pool
const textWalk = (o, f, ctx) => {
  if (Array.isArray(o)) { o.forEach((x) => textWalk(x, f, ctx)); return; }
  if (!o || typeof o !== 'object') return;
  const id = o.regiment_id || o.battery_id || o.brigade_id || o.division_id || o.corps_id || ctx;
  for (const [k, v] of Object.entries(o)) {
    if (typeof v === 'string' && /^(key_action|notes|fate)$/.test(k) && v.length > 25 && !/^Survived/.test(v)) add('oob-text', `${f}|${id || 'file'}|${k}|${v.slice(0, 24)}`, `${id || f} [${k}]: ${v}`, `oob/${f}.json`);
    else if (v && typeof v === 'object') textWalk(v, f, id);
  }
};
for (const f of fs.readdirSync(path.join(D, 'oob')).filter((x) => /\.json$/.test(x) && !/commander_successions/.test(x))) textWalk(OOB(f), f.replace('.json', ''), '');

// ---- successions
const sc = OOB('commander_successions.json');
for (const s of [...sc.union_successions, ...sc.confederate_successions]) add('succession', s.event_id, `${s.event_id} (${s.unit_id}): ${s.event}; ${s.from_commander} -> ${s.to_commander}; ${s.approx_time}; tick ${s.approx_tick}`, 'oob/commander_successions.json');

// ---- chronology
for (const d of [1, 2, 3]) {
  const ev = J(path.join(D, `chronology_day${d}.json`)).events;
  ev.forEach((e) => { if (e.significance !== 'low') add('chronology', `d${d}t${e.tick}`, `Day ${d}, tick ${e.tick} (${e.time}): ${e.event}${e.narrative ? ' // ' + e.narrative : ''}`, `chronology_day${d}.json`); });
}

// ---- vignettes
for (const f of ['vignettes_part1.json', 'vignettes_part2.json', 'vignettes_part3.json']) for (const v of J(path.join(D, f)).vignettes) add('vignette', v.vignette_id, `${v.vignette_id} "${v.title}" (tick ${v.trigger_tick}): ${v.panel_summary}`, f);

// ---- terrain
const t = J(path.join(D, 'terrain.json'));
for (const k of t.key_locations) add('terrain', k.location_id, `${k.name}: ${k.significance} (elevation ${k.elevation_ft} ft)`, 'terrain.json');
for (const k of t.structures) add('terrain', k.structure_id, `${k.name}: ${k.significance}`, 'terrain.json');
for (const k of t.terrain_features) add('terrain', k.feature_id, `${k.name}: ${k.significance}`, 'terrain.json');
for (const k of t.roads) add('terrain', k.road_id, `${k.name}: ${k.significance}`, 'terrain.json');

// ---- placement notes
for (const f of fs.readdirSync(D).filter((x) => /^(placements_|density_).*\.json$/.test(x)).sort()) {
  const text = rd(path.join(D, f));
  let lined = 0;
  for (const l of text.split('\n')) {
    const m = /^\s*\{"unit_id":"([^"]+)","tick":(\d+),.*?"notes":"((?:[^"\\]|\\.)*)"/.exec(l);
    if (m) { lined++; add('position-note', `${f.replace('.json', '')}|${m[1]}|${m[2]}`, `${m[1]} at tick ${m[2]}: ${JSON.parse('"' + m[3] + '"')}`, f); }
  }
  // pretty-printed files (density_day3_cavalry.json) are read as JSON; samples A and B were drawn before the sampler read them (found by the unit-count check, see AUDIT.md)
  if (!lined) for (const r of (JSON.parse(text).placements || [])) if (r.unit_id && r.notes) add('position-note', `${f.replace('.json', '')}|${r.unit_id}|${r.tick}`, `${r.unit_id} at tick ${r.tick}: ${r.notes}`, f);
}

// ---- bundle strings: story markers, tour stops, popup alerts
const assets = fs.readdirSync(path.join(distDir, 'assets')).filter((x) => /^index-.*\.js$/.test(x));
const bundle = assets.map((a) => rd(path.join(distDir, 'assets', a))).join('\n');
{
  const i = bundle.indexOf('mA=[');
  const seg = bundle.slice(i, bundle.indexOf('];', i));
  for (const m of seg.matchAll(/\{id:"([^"]+)",name:"[^"]*",unit_id:"[^"]*",lat:[\d.-]+,lng:[\d.-]+,tick:(\d+),day:\d,label:"((?:[^"\\]|\\.)*)"/g)) add('marker-tour-popup', `mA:${m[1]}`, `Story marker "${m[3]}" (tick ${m[2]})`, 'bundle mA');
  const j = bundle.indexOf('th=[');
  const seg2 = bundle.slice(j, j + 40000);
  for (const m of seg2.matchAll(/\{id:(\d+),title:"([^"]*)",subtitle:"([^"]*)",lat:[\d.-]+,lng:[\d.-]+,zoom:[\d.]+,tick:(\d+),tickWindow:\d+,narrative:`([^`]*)`/g)) add('marker-tour-popup', `th:${m[1]}`, `Tour stop ${m[1]} "${m[2]}" (${m[3]}; tick ${m[4]}): ${m[5].replace(/\s+/g, ' ').slice(0, 700)}`, 'bundle th');
  for (const m of bundle.matchAll(/"(★[^"]{8,})"/g)) add('marker-tour-popup', `alert:${m[1].slice(0, 40)}`, `Unit-panel alert: ${m[1]}`, 'bundle popup');
}

// ---- page text sentences with figures
const pages = ['index.html', 'terms.html', 'ground-remembers.html', 'turning-points.html', 'dashboard.html', 'living-ledger.html', 'aftermath.html', 'find-ancestor.html', 'education.html', 'documentary.html', 'historian.html'];
for (const p of pages) {
  const fp = path.join(distDir, p);
  if (!fs.existsSync(fp)) continue;
  const h = rd(fp).replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, '\n').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#?\w+;/g, ' ');
  const lines = h.split('\n').map((s) => s.trim()).filter((s) => s.length > 30);
  for (const l of lines) for (const sent of l.split(/(?<=[.!?])\s+(?=[A-Z])/)) if (/\d/.test(sent) && sent.length > 30 && sent.length < 420) add('page-figure', `${p}|${sent.slice(0, 60)}`, `${p}: ${sent}`, p);
}

// ---- casualty file and dashboard
const ca2 = J(path.join(D, 'casualty_apportionment.json'));
for (const side of ['union_corps', 'confederate_corps']) for (const c of ca2[side]) add('casualty-file', `${side}|${c.corps_id}`, `${side} ${c.corps_id}: initial strength ${c.initial_strength}, total casualties ${c.total_casualties}, rate ${c.overall_rate}%; periods ${(c.engagement_periods || []).map((p) => 'day ' + p.day + ': ' + p.casualties + ' (' + p.rate + '%) ' + (p.notes || '')).join(' | ')}`.slice(0, 700), 'casualty_apportionment.json');
for (const [k, v] of Object.entries(ca2.notable_intensity_notes || {})) add('casualty-file', 'note-' + k, `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`.slice(0, 400), 'casualty_apportionment.json');

if (process.env.POOL_OUT) fs.writeFileSync(process.env.POOL_OUT, JSON.stringify(Object.values(pool).flat()));
// ---- draw
const QUOTA = { 'oob-commander': 10, 'oob-casualties': 12, 'oob-keyaction': 6, 'oob-brigade': 8, 'oob-battery-cav': 6, 'oob-text': 22, succession: 6, chronology: 14, vignette: 8, terrain: 8, 'position-note': 26, 'marker-tour-popup': 10, 'page-figure': 6, 'casualty-file': 8 };   // samples A to C used the quota of commit history (150 claims in 13 kinds, no oob-text)
const N = Number((process.argv.find((a) => a === '--n') && process.argv[process.argv.indexOf('--n') + 1]) || 0) || Object.values(QUOTA).reduce((a, b) => a + b, 0);
const rnd = mulberry32(seed);
const out = [];
for (const [cat, q] of Object.entries(QUOTA)) {
  const arr = [...(pool[cat] || [])].sort((a, b) => (a.id < b.id ? -1 : 1));
  for (let i = 0; i < Math.min(q, arr.length); i++) { const j = i + Math.floor(rnd() * (arr.length - i)); [arr[i], arr[j]] = [arr[j], arr[i]]; out.push(arr[i]); }
}
fs.writeFileSync(outFile, JSON.stringify({ seed, dist: distDir, n: out.length, poolSizes: Object.fromEntries(Object.entries(pool).map(([k, v]) => [k, v.length])), quota: QUOTA, claims: out }, null, 1));
console.log(`seed ${seed}: ${out.length} claims from a pool of ${Object.values(pool).reduce((a, v) => a + v.length, 0)} (${Object.entries(pool).map(([k, v]) => k + ' ' + v.length).join(', ')}) -> ${outFile}`);

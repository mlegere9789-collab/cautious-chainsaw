// Red-first proof for tests/t0/walkthrough-guard.spec.mjs: the guard must FAIL when the Walkthrough or the Monuments tab is broken.
// Each mutant is a scratch copy (tmp/walkthrough-guard/mutants/<id>/dist) of baseline/dist (or of a built R1c snapshot for the R1c-only features) with ONE deliberate
// defect injected into the entry bundle, index.html or a data file; the spec then runs on it with a filter and every test listed in `red` must fail.
// legacy/, baseline/ and release/ are only read.
//
//   node tests/t0/walkthrough-guard.mutants.mjs                       all mutants (about 8 minutes, up to 75 Mapbox requests each, 1 to 3 Mapbox loads per mutant)
//   node tests/t0/walkthrough-guard.mutants.mjs --only M04,M06        some of them
//   node tests/t0/walkthrough-guard.mutants.mjs --r1c <dist>          the R1c tree to mutate for R01/R02 (default: the snapshot tmp/walkthrough-guard/trains/R1c/dist when it exists, else release/R1c/dist; only read)
//   node tests/t0/walkthrough-guard.mutants.mjs --list
process.env.T0_AGENT ??= 'walkthrough-guard';
process.env.T0_PORT_BASE ??= '8920';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : dflt; };
const BASE = path.join(REPO, 'baseline', 'dist');
const R1C = path.resolve(REPO, String(opt('r1c', fs.existsSync(path.join(REPO, 'tmp/walkthrough-guard/trains/R1c/dist')) ? 'tmp/walkthrough-guard/trains/R1c/dist' : 'release/R1c/dist')));
const OUT = path.join(REPO, 'tmp', process.env.T0_AGENT, 'mutants');
const ONLY = opt('only', null) ? String(opt('only')).split(',') : null;
const ENTRY = 'assets/index-Cg8FAMXN.js';

/** replace `from` by `to` in a file of the copy; the number of occurrences must be exactly `n` (the mutant is meaningless if the anchor moved) */
const edit = (dist, file, from, to, n = 1) => {
  const f = path.join(dist, file); let s = fs.readFileSync(f, 'utf8'); const c = s.split(from).length - 1;
  if (c !== n) throw new Error(`mutant anchor found ${c} times in ${file}, want ${n}: ${from.slice(0, 80)}`);
  fs.writeFileSync(f, s.split(from).join(to));
};
const r1cEntry = () => fs.readdirSync(path.join(R1C, 'assets')).find((x) => /^index-[0-9a-f]{8}\.js$/.test(x));

const MUTANTS = [
  { id: 'M01', what: 'stop 8 (Little Round Top) moved 55 m', base: BASE, filter: 'WG-0[145]', red: ['T0-WG-01', 'T0-WG-04', 'T0-WG-05'],
    apply: (d) => edit(d, ENTRY, 'lat:39.791,lng:-77.2362', 'lat:39.7915,lng:-77.2362') },
  { id: 'M02', what: 'stop 3 renamed "Oak Hill"', base: BASE, filter: 'WG-0[13]', red: ['T0-WG-01', 'T0-WG-03'],
    apply: (d) => edit(d, ENTRY, 'name:"Oak Ridge",label:"Tour Stop 3"', 'name:"Oak Hill",label:"Tour Stop 3"') },
  { id: 'M03', what: 'the stop list shows 15 stops instead of 16 (desktop and phone branch)', base: BASE, filter: 'WG-03', red: ['T0-WG-03'],
    apply: (d) => edit(d, ENTRY, 'd2.map(pe=>V.jsxs("button",{onClick:()=>xe(pe)', 'd2.slice(0,15).map(pe=>V.jsxs("button",{onClick:()=>xe(pe)', 2) },
  { id: 'M04', what: 'the Monuments list is capped at 50 instead of 100 (desktop)', base: BASE, filter: 'WG-06', red: ['T0-WG-06'],
    apply: (d) => edit(d, ENTRY, 'kt.slice(0,100).map(pe=>V.jsx(vA,{m:pe,onClick:Pe=>{Pe.lat', 'kt.slice(0,50).map(pe=>V.jsx(vA,{m:pe,onClick:Pe=>{Pe.lat') },
  { id: 'M05', what: 'the monument search looks at names only (not "honors")', base: BASE, filter: 'WG-06', red: ['T0-WG-06'],
    apply: (d) => edit(d, ENTRY, 'return pe.name.toLowerCase().includes(Pe)||pe.honors.toLowerCase().includes(Pe)', 'return pe.name.toLowerCase().includes(Pe)') },
  { id: 'M06', what: 'the Walkthrough map is not removed when it closes (leaked WebGL context)', base: BASE, filter: 'WG-07', red: ['T0-WG-07'],
    apply: (d) => edit(d, ENTRY, 'if(M.current){M.current.remove();M.current=null;}', 'if(M.current){M.current=null;}') },
  { id: 'M07', what: 'the Back button does nothing', base: BASE, filter: 'WG-0[67]', red: ['T0-WG-07'],
    apply: (d) => edit(d, ENTRY, 'V.jsx("button",{onClick:c,style:Tn.backBtn,', 'V.jsx("button",{onClick:function(){},style:Tn.backBtn,') },
  { id: 'M08', what: 'selecting a stop no longer flies the map', base: BASE, filter: 'WG-05', red: ['T0-WG-05'],
    apply: (d) => edit(d, ENTRY, 'M.current&&M.current.flyTo({center:[pe.lng,pe.lat],zoom:14})', 'void 0') },
  { id: 'M09', what: 'the Street View iframe points to /maps/embed/v1/place', base: BASE, filter: 'WG-0[23]', red: ['T0-WG-02', 'T0-WG-03'],
    apply: (d) => edit(d, ENTRY, 'https://www.google.com/maps/embed/v1/streetview?key=${mO}&', 'https://www.google.com/maps/embed/v1/place?key=${mO}&') },
  { id: 'M10', what: 'a fixed layer covers the Back button (like a pill that floats over the page)', base: BASE, filter: 'WG-03', red: ['T0-WG-03'],
    apply: (d) => edit(d, 'index.html', '</body>', '<div style="position:fixed;right:0;top:0;width:260px;height:60px;z-index:99999"></div></body>') },
  { id: 'M11', what: 'data/monuments.json (the star data) loses a coordinate digit', base: BASE, filter: 'WG-02', red: ['T0-WG-02'],
    apply: (d) => edit(d, 'data/monuments.json', '"lat": 39.807778', '"lat": 39.80778') },
  { id: 'M12', what: 'monument 1 renamed "Alabama State Memorial"', base: BASE, filter: 'WG-0[16]', red: ['T0-WG-01', 'T0-WG-06'],
    apply: (d) => edit(d, ENTRY, '_A=[{no:1,name:"Alabama State Monument"', '_A=[{no:1,name:"Alabama State Memorial"') },
  { id: 'M13', what: 'a console.error is logged whenever the Walkthrough opens', base: BASE, filter: 'WG-03', red: ['T0-WG-03'],
    apply: (d) => edit(d, 'index.html', '</body>', "<script>new MutationObserver(function(){if(!window.__b&&Array.prototype.some.call(document.querySelectorAll('h2'),function(h){return h.textContent==='McPherson Ridge'})){window.__b=1;console.error('walkthrough boom')}}).observe(document.body,{childList:true,subtree:true})</script></body>") },
  { id: 'M14', what: 'the visible narration of stop 1 loses a word', base: BASE, filter: 'WG-0[13]|WG-16', red: ['T0-WG-01', 'T0-WG-03', 'T0-WG-16'],
    apply: (d) => edit(d, ENTRY, 'The battle opened here.</span> On the morning', 'The battle opened here.</span> In the morning') },
  { id: 'S1', what: 'legacy\'s screen-fixed star script put back on the baseline (the stars appear, but they do not follow the map and a resize with the Walkthrough open displaces them)', base: BASE, filter: 'WG-1[345]', red: ['T0-WG-14', 'T0-WG-15'], green: ['T0-WG-13'],
    apply: (d) => {
      const leg = fs.readFileSync(path.join(REPO, 'legacy', 'dist', 'index.html'), 'utf8');
      const a = leg.indexOf('<script>\n    // Wires the app\'s own real "Monuments" toolbar button'); const b = leg.indexOf('</script>', a) + '</script>'.length;
      if (a < 0 || b < a) throw new Error('legacy star script not found');
      edit(d, 'index.html', '<div id="root">', `${leg.slice(a, b).replace(/\n/g, '\r\n')}\r\n\r\n  <div id="root">`);
    } },
  { id: 'R01', what: 'R1c: the phone Tools tile "Virtual Walkthrough" is gone', base: R1C, filter: 'WG-09', red: ['T0-WG-09'],
    apply: (d) => edit(d, `assets/${r1cEntry()}`, '{icon:"🗺",label:"Virtual Walkthrough",action:()=>{oW&&oW(),vi(!1)}}', '{icon:"🗺",label:"Map tour",action:()=>{oW&&oW(),vi(!1)}}') },
  { id: 'R02', what: 'R1c: the Street View iframe lost its allow attribute', base: R1C, filter: 'WG-03', red: ['T0-WG-03'],
    apply: (d) => edit(d, `assets/${r1cEntry()}`, 'allowFullScreen:!0,allow:"accelerometer; gyroscope",title:c.name})', 'allowFullScreen:!0,title:c.name})') },
];

if (opt('list', false)) { for (const m of MUTANTS) console.log(`${m.id}  ${m.what}  [filter ${m.filter}] must fail: ${m.red.join(', ')}${m.green ? `; must pass: ${m.green.join(', ')}` : ''}`); process.exit(0); }
fs.mkdirSync(OUT, { recursive: true });
const rows = [];
for (const m of MUTANTS) {
  if (ONLY && !ONLY.includes(m.id)) continue;
  const dir = path.join(OUT, m.id); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const dist = path.join(dir, 'dist'); fs.cpSync(m.base, dist, { recursive: true });
  m.apply(dist);
  const outFile = path.join(dir, 'result.json');
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [path.join(REPO, 'tests/t0/walkthrough-guard.spec.mjs'), '--dist', dist, '--filter', m.filter, '--no-real-google', '--label', m.id, '--out', outFile], { cwd: REPO, encoding: 'utf8', env: process.env, timeout: 600000 });
  let res = null; try { res = JSON.parse(fs.readFileSync(outFile, 'utf8')); } catch { /* no result */ }
  const failed = res ? res.results.filter((x) => x.status === 'fail').map((x) => x.id) : [];
  const missing = m.red.filter((id) => !failed.includes(id));
  const passed = res ? res.results.filter((x) => x.status === 'pass').map((x) => x.id) : [];
  const notGreen = (m.green || []).filter((id) => !passed.includes(id));
  rows.push({ id: m.id, what: m.what, mustFail: m.red, mustPass: m.green || [], failed, missing, notGreen, ok: !!res && missing.length === 0 && notGreen.length === 0, seconds: Math.round((Date.now() - t0) / 1000), spawnStatus: r.status });
  console.log(`${rows.at(-1).ok ? 'RED (as required)' : 'NOT RED'}  ${m.id}  ${m.what}\n      must fail ${m.red.join(', ')}${m.green ? `; must pass ${m.green.join(', ')}` : ''}; failed ${failed.join(', ') || 'none'}${missing.length ? `; STILL GREEN: ${missing.join(', ')}` : ''}${notGreen.length ? `; NOT GREEN: ${notGreen.join(', ')}` : ''}  (${rows.at(-1).seconds} s)`);
  if (!res) console.log(`      no result file: ${String(r.stderr || r.stdout).slice(-600)}`);
  fs.rmSync(dist, { recursive: true, force: true });                              // keep the result, drop the copy
}
const bad = rows.filter((x) => !x.ok);
fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify({ when: new Date().toISOString(), rows }, null, 2));
console.log(`${rows.length - bad.length} of ${rows.length} mutants turned the guard red${bad.length ? `; SURVIVORS: ${bad.map((x) => x.id).join(', ')}` : ''}`);
process.exit(bad.length ? 1 : 0);

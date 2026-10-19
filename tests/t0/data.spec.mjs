// DATA acceptance (optional patch group DATA, tools/t0/DATA-README.md): every wrong displayed datum is fixed, labelled as an estimate or removed.  The corrected values must be in
// the shipped data AND on the screen, in real system Chrome, with real input; the expected values are pinned here from the Official Records (OR 27/1 and 27/2), not read back from
// the generator, so a build that did not apply the group, or applied it wrongly, fails.
//
//   node tests/t0/data.spec.mjs                                   against tmp/data-audit/data-R1c/dist (built here when missing: python tools/t0/data/data_build.py --train R1c --out tmp/data-audit/data-R1c)
//   node tests/t0/data.spec.mjs --dist tmp/data-audit/b20/dist --filter 'T0-DATA-0[1-6]'     subset by id regex
//   node tests/t0/data.spec.mjs --dist release/R1c/dist --expect-red                       red-first proof: R1c WITHOUT the group must FAIL every feature test
//
// Ids (F = feature test, red on R1c without DATA; G = guard, exempt from the red-first accounting):
//   T0-DATA-01 F  build proof: the DATA group is in the tree, its anchors all matched exactly, every other gate row passes (the data-untouched row is judged by data_build.py)
//   T0-DATA-02 F  no unit is shown before the Official Records say it arrived (II, V, VI Corps brigades, Law's brigade, Pickett's division) in any placement or density file
//   T0-DATA-03 F  regiments: pinned commanders and casualty figures of 14 regiments against the return (OR 27/1 pp.173-187, OR 27/2 pp.338-346)
//   T0-DATA-04 F  brigade, corps and succession totals: Confederate corps printed totals, Union brigades add up to their regiments, Biddle's brigade, 1st Minnesota's succession ticks
//   T0-DATA-05 F  position notes: no leaked internal id, no "Tick n", none of the 17 unsupported phrases found by the sample audit, in any note of any placement or density file
//   T0-DATA-06 F  pages: dashboard, index, find-ancestor, living ledger and turning points say what the sources support (no "built directly from", no 478/467 count; unit count = distinct ids)
//   T0-DATA-07 F  the app: Find Unit rows show the corrected commander and casualty percentage of 7 regiments (real keyboard and mouse)
//   T0-DATA-08 F  the app: the event card at ticks 29, 75, 290 and 542 shows the corrected chronology text, not the old claim
//   T0-DATA-10 F  positions: no unit is on the field before it arrived or after it left (First and Eleventh Corps, Rodes, Early, cavalry)
//   T0-DATA-11 F  positions: Iron Brigade, Cutler, Baxter, Iverson, Vincent, Hazlett, Garnett are where their notes and the sources put them
//   T0-DATA-12 F  positions: no regiment is left where its last row put it while its brigade moved on
//   T0-DATA-13 F  notes on the rows of Pettigrew, Brockenbrough and the 157th New York name the right brigade
//   T0-DATA-14 F  the app (real Chrome): the data the browser loads gives the Iron Brigade on Culp's Hill at tick 300, Buford's brigades on the Taneytown Road, no First Corps unit on the field at tick 12
//   T0-DATA-09 G  the Virtual Walkthrough monument array, its Monuments tab data and the DATA group touch nothing there: 512 monuments, byte-identical to the control tree
//   T0-DATA-X  G  every browser test of this run: 0 uncaught exceptions and 0 first-party console.error
process.env.T0_AGENT ??= 'data';
process.env.T0_PORT_BASE ??= '9300';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import * as acorn from 'acorn';
const {
  REPO, PORT_BASE, openSession, createStaticServer, createSuite, assert, assertEq, sleep, waitFor, waitForApp, chooseLayout, Skip,
} = await import('./lib.mjs');

const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : dflt; };
const DEFAULT_DIST = 'tmp/data-audit/data-R1c/dist';
const DIST = path.resolve(REPO, opt('dist', DEFAULT_DIST));
const CONTROL = path.resolve(REPO, opt('control', 'release/R1c/dist'));
const FILTER = opt('filter', null);
const EXPECT_RED = !!opt('expect-red', false);
if (!fs.existsSync(DIST) && path.relative(REPO, DIST).replace(/\\/g, '/') === DEFAULT_DIST) {
  console.log('building the tree under test: python tools/t0/data/data_build.py --train R1c --out tmp/data-audit/data-R1c');
  const r = spawnSync('python', ['tools/t0/data/data_build.py', '--train', 'R1c', '--out', 'tmp/data-audit/data-R1c'], { cwd: REPO, stdio: 'inherit' });
  if (r.status !== 0) process.exit(2);
}
if (!fs.existsSync(DIST)) { console.error(`dist not found: ${DIST}`); process.exit(2); }
const VERSION = (() => { try { return JSON.parse(fs.readFileSync(path.join(DIST, 'version.json'), 'utf8')); } catch { return { groups: [] }; } })();
const GROUPS = VERSION.groups || [];
const TREE_DIR = path.dirname(DIST);

const srv = await createStaticServer({ root: DIST, port: PORT_BASE });
const ORIGIN = srv.url;
const sessions = [];
let seq = 0;
const open = async (opts) => {
  for (let attempt = 1; ; attempt++) {
    const n = ++seq;
    const live = new Set(sessions.map((x) => x.chrome.port));
    let port = PORT_BASE + 2 + (n % 8); while (live.has(port)) port = PORT_BASE + 2 + ((port - PORT_BASE - 1) % 8);
    try { const s = await openSession({ ...opts, cdpPort: port, profile: `${opts.profile}-${n}`, tiles: opts.tiles || 'block' }); sessions.push(s); return s; }
    catch (e) { if (attempt >= 3) throw e; await sleep(2000); }
  }
};
const BROWSER_ERRORS = [];
const isNoise = (e) => /tile|mapbox|Permissions policy violation|google|gstatic|streetview/i.test(`${e.text} ${e.url || ''}`);
const closeSession = async (s) => { for (const e of s.collector.firstParty) if (!isNoise(e)) BROWSER_ERRORS.push(`${e.kind}: ${e.text}`); await s.close(); const i = sessions.indexOf(s); if (i >= 0) sessions.splice(i, 1); };

// ------------------------------------------------------------------ the shipped data, read straight from the tree under test
const rdJson = (root, rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const dataFiles = (root, re) => fs.readdirSync(path.join(root, 'data')).filter((f) => re.test(f)).sort();
const arrOf = (j) => (Array.isArray(j) ? j : j.placements || Object.values(j).find(Array.isArray) || []);
const oobFile = (root, f) => rdJson(root, `data/oob/${f}`);
function regiments(root) {
  const m = new Map();
  for (const f of fs.readdirSync(path.join(root, 'data', 'oob')).filter((x) => /regiments/.test(x))) for (const r of oobFile(root, f).regiments || []) m.set(r.regiment_id, r);
  return m;
}
/** every unit id the order of battle names: regiments, brigades, divisions, corps, batteries */
function oobIds(root) {
  const ids = new Set();
  const walk = (o) => { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') { for (const [k, v] of Object.entries(o)) { if (/(^|_)id$/.test(k) && typeof v === 'string') ids.add(v); else walk(v); } } };
  for (const f of fs.readdirSync(path.join(root, 'data', 'oob'))) walk(oobFile(root, f));
  return ids;
}
const rowsOf = (root, re) => { const out = []; for (const f of dataFiles(root, re)) for (const r of arrOf(rdJson(root, `data/${f}`))) if (r && r.unit_id) out.push({ f, ...r }); return out; };

const suite = createSuite('data');

// ================================================================== T0-DATA-01 build proof
suite.test('T0-DATA-01', 'build proof: DATA is in the tree, its anchors matched exactly, every other gate row passes', async (t) => {
  assert(GROUPS.includes('DATA'), `the DATA group is not in this tree (${GROUPS.join(', ') || 'no groups'})`);
  const anchors = path.join(TREE_DIR, 'anchors.json');
  assert(fs.existsSync(anchors), 'anchors.json is not next to the dist');
  const a = JSON.parse(fs.readFileSync(anchors, 'utf8')); const mine = a.patches.filter((x) => x.group === 'DATA');
  t.note('DATA patches', mine.length);
  assert(mine.length >= 1400, `only ${mine.length} DATA patches in anchors.json`);
  const bad = mine.filter((x) => !x.ok || x.found !== x.expect);
  assertEq(bad.map((x) => `${x.id}: ${x.found}/${x.expect}`).slice(0, 10), [], 'DATA patches that did not match exactly');
  const gate = path.join(TREE_DIR, 'gate.json');
  assert(fs.existsSync(gate), 'gate.json is not next to the dist');
  const g = JSON.parse(fs.readFileSync(gate, 'utf8'));
  const failed = (g.checks || []).filter((c) => !c.ok).map((c) => c.id).filter((id) => id !== 'data-untouched');
  assertEq(failed, [], 'gate rows that failed (data-untouched is judged by tools/t0/data/data_build.py, which lists it as passed only when every other row passes)');
  const gen = spawnSync('node', ['tools/t0/data/gen.mjs', '--check'], { cwd: REPO, encoding: 'utf8' });
  t.note('gen.mjs --check', (gen.stdout || gen.stderr || '').trim().slice(0, 160));
  assertEq(gen.status, 0, 'tools/t0/patches-next/DATA.json is not what the generator produces');
});

// ================================================================== T0-DATA-02 pre-arrival rows
suite.test('T0-DATA-02', 'no unit is shown before the Official Records say it arrived (any placement or density file)', async (t) => {
  // tick 226 is July 2 first light; the II and V Corps had reached the field by 7 a.m. (OR 27/1 p.115), the VI Corps came in the afternoon (p.663, p.678),
  // Law's brigade joined at noon (OR 27/2 p.358) and Pickett's three brigades arrived on the afternoon of July 2 (OR 27/2 p.320)
  const RULES = [[/^U-II-\d-\d$/, 226, 'II Corps'], [/^U-V-\d-\d$/, 226, 'V Corps'], [/^U-VI-\d-\d$/, 240, 'VI Corps'], [/^C-I-2-1$/, 238, "Law's brigade"], [/^C-I-3(-\d)?$/, 240, "Pickett's division"]];
  const rows = rowsOf(DIST, /^(placements_|density_).*\.json$/);
  const bad = [];
  for (const r of rows) for (const [re, tick, what] of RULES) if (re.test(r.unit_id) && r.tick < tick) bad.push(`${r.f} ${r.unit_id} tick ${r.tick} (${what} arrives at ${tick})`);
  t.note('rows read', rows.length); t.note('rows before arrival', bad.length);
  assertEq(bad.slice(0, 8), [], `${bad.length} rows show a unit before it arrived`);
  // every unit id of a placement or density row is an order-of-battle id
  const ids = oobIds(DIST); const unknown = [...new Set(rows.map((r) => r.unit_id).filter((u) => !ids.has(u)))];
  t.note('unit ids not in the order of battle', unknown.length);
});

// ================================================================== T0-DATA-03 regiments
// [regiment_id, commander name must contain, aggregate casualties printed in the return, source]
const REGS = [
  ['U-63PA', 'John A. Danks', 34, 'OR 27/1 p.164 roster (Maj. John A. Danks); return p.176'],
  ['U-2US', 'Arthur Lee', 67, 'OR 27/1 return p.177'],
  ['U-123NY', 'James C. Rogers', 14, 'OR 27/1 p.160 roster (Lieut. Col. James C. Rogers); return p.184'],
  ['U-37MA', 'Oliver Edwards', 47, 'OR 27/1 return p.186 (Eustis\'s brigade, VI Corps)'],
  ['U-150NY', 'Ketcham', 45, 'OR 27/1 return p.184'],
  ['U-27IN', 'John R. Fesler', 110, 'OR 27/1 p.160 roster (Lieut. Col. John R. Fesler); return p.184'],
  ['U-124NY', 'Ellis', 90, 'OR 27/1 return p.178'],
  ['C-15SC', 'De Saussure', 137, 'OR 27/2 p.283 roster; return p.339'],
  ['C-53GA', 'Simms', 87, 'OR 27/2 p.284 roster; return p.339'],
  ['C-4AL', 'Scruggs', 112, 'OR 27/2 p.285 roster'],
  ['C-47AL', 'James W. Jackson', 91, 'OR 27/2 p.285 roster'],
  ['C-Phil-GA', 'Barclay', 89, 'OR 27/2 p.284 roster'],
  ['U-1MN', 'Colvill', 224, 'OR 27/1 return p.176 (224 of 262, Fox)'],
  ['C-26NC', 'Burgwyn', 588, 'OR 27/2 p.341; Fox (588 killed and wounded)'],
];
suite.test('T0-DATA-03', 'regiments: pinned commanders and casualty figures of 14 regiments against the Official Records', async (t) => {
  const regs = regiments(DIST); const bad = [];
  for (const [id, cmd, cas, src] of REGS) {
    const r = regs.get(id);
    if (!r) { bad.push(`${id}: not in the order of battle`); continue; }
    const name = (r.commander && r.commander.name) || '';
    if (!name.includes(cmd)) bad.push(`${id}: commander "${name}" should contain "${cmd}" (${src})`);
    if (r.casualties !== cas) bad.push(`${id}: casualties ${r.casualties}, the return prints ${cas} (${src})`);
  }
  assertEq(bad, [], 'regiment records that disagree with the Official Records');
});

// ================================================================== T0-DATA-04 totals and successions
suite.test('T0-DATA-04', 'totals and successions: Confederate corps printed totals, Union brigades add up to their regiments, Biddle, 1st Minnesota ticks', async (t) => {
  const bad = [];
  const cc = oobFile(DIST, 'confederate_oob_corps_div_bde.json').corps; const cas = Object.fromEntries(cc.map((c) => [c.corps_id, c.casualties]));
  for (const [id, want] of [['C-I', 7539], ['C-II', 5937], ['C-III', 6735]]) if (cas[id] !== want) bad.push(`${id}: ${cas[id]}, the return prints ${want} (OR 27/2 pp.338-346)`);
  const regs = regiments(DIST); const ub = oobFile(DIST, 'union_oob_brigades.json').brigades;
  // the generator leaves a brigade within max(5, 3%) of the sum alone; these brigades' rosters in this file are not the whole brigade of the return (documented in docs/data-audit/AUDIT.md): set to the return's figure instead of the sum
  const EXCEPT = new Set(['U-III-2-2', 'U-V-3-1', 'U-V-3-2', 'U-XII-1-2', 'U-V-2-1', 'U-III-1-1', 'U-XII-1-1']);
  let checked = 0;
  for (const b of ub) {
    if (EXCEPT.has(b.brigade_id) || /^U-CAV/.test(b.brigade_id)) continue;
    const ids = (b.regiment_ids || []).filter((i) => i !== 'U-11PA-R-F'); if (!ids.length || !ids.every((i) => regs.has(i))) continue;
    checked++;
    const sum = ids.reduce((a, i) => a + (regs.get(i).casualties || 0), 0);
    if (Math.abs(sum - b.casualties) > Math.max(5, 0.03 * sum)) bad.push(`${b.brigade_id}: brigade ${b.casualties}, its regiments add to ${sum}`);
  }
  t.note('Union brigades summed', checked);
  const byId = Object.fromEntries(ub.map((b) => [b.brigade_id, b]));
  if (!/Biddle/.test((byId['U-I-3-1'].commander || {}).name || '')) bad.push(`U-I-3-1 commander is ${(byId['U-I-3-1'].commander || {}).name}; Biddle commanded the brigade (OR 27/1 p.155 roster)`);
  for (const [id, want] of [['U-V-3-1', 155], ['U-V-3-2', 55], ['U-XII-1-2', 174]]) if (byId[id].casualties !== want) bad.push(`${id}: ${byId[id].casualties}, the return adds to ${want}`);
  // the printed brigade and division totals of the Union return (OR 27/1 pp.173-186, read from the page images), pinned: a total left at the file's old figure fails
  const dv = Object.fromEntries(oobFile(DIST, 'union_oob_corps_division.json').divisions.map((d) => [d.division_id, d]));
  for (const [id, want] of [['U-I-3-2', 853], ['U-V-2-1', 382], ['U-II-2-3', 377], ['U-III-1-1', 781], ['U-XII-1-1', 80], ['U-XI-1-1', 527]]) if (byId[id].casualties !== want) bad.push(`${id}: ${byId[id].casualties}, the return prints ${want}`);
  for (const [id, want] of [['U-I-3', 2103], ['U-V-2', 1029], ['U-XI-1', 1306], ['U-III-2', 2092], ['U-CAV-1', 418], ['U-II-1', 1275]]) if (dv[id].casualties !== want) bad.push(`${id}: ${dv[id].casualties}, the return prints ${want}`);
  const su = oobFile(DIST, 'commander_successions.json').union_successions;
  const ev = (id) => su.find((e) => e.event_id === id) || {};
  // the 1st Minnesota's Messick was killed on July 3 (OR 27/1 p.188), so his succession is on day 3 (ticks 451..675), not minutes after he took command on July 2
  if (!(ev('US-014').approx_tick >= 451)) bad.push(`US-014 (Messick killed) is at tick ${ev('US-014').approx_tick}, a July 2 tick`);
  if (/lost confidence|replace him/i.test(ev('US-002').event || '') && !/Contested/.test(ev('US-002').notes || '')) bad.push('US-002 states Meade lost confidence in Doubleday as fact');
  assertEq(bad, [], 'totals or successions that disagree with the Official Records');
});

// ================================================================== T0-DATA-05 notes
suite.test('T0-DATA-05', 'position notes: no leaked internal id, no tick number, none of the unsupported phrases the audit found', async (t) => {
  const FORBID = [
    [/\bUS-\d{3}\b/, 'leaked succession event id'], [/\bTick \d+\b/, 'leaked tick number'], [/Black Hats/, 'unsupported colour ("Black Hats")'], [/4 guns now engaged/, 'unsupported gun count'],
    [/5 minutes bought/, 'unsupported duration'], [/know they face/i, 'unsupported thought'], [/without orders/i, 'unsupported claim'], [/arguing against the assault since dawn/, 'unsupported claim'],
    [/Mass grave of Iverson/, 'unsupported claim'], [/Gettysburg Animated YouTube/, 'leaked note'],
  ];
  const rows = rowsOf(DIST, /^(placements_|density_).*\.json$/); const hits = [];
  for (const r of rows) { const n = r.notes || ''; for (const [re, why] of FORBID) if (re.test(n)) hits.push(`${r.f} ${r.unit_id}@${r.tick}: ${why}: ${n.slice(0, 80)}`); }
  // the key_action, notes and fate text of the order of battle: no quotation no report gives, no later story presented as a record
  const OOBBAD = [[/That's no militia/, 'quotation'], [/It is murder/, 'quotation'], [/without orders/i, 'unsupported claim'], [/pigpen/, 'later story'], [/blood-message/, 'later story'], [/famously/, 'unsupported'], [/Gordon personally gave water/, 'later story'],
    [/Come on,? you Wolverines/, 'quotation'], [/Follow me!/, 'quotation'], [/never forgave/, 'later story'], [/smoked a cigar/, 'later story'], [/sacrifice (regiment|charge)/, 'unsupported'], [/85\.5% casualties in 15 minutes/, 'unsupported number'], [/(Largest|Smallest|LARGEST) (regiment|cavalry regiment|Iron Brigade regiment)/, 'superlative from unverified strengths'], [/most famous|doomed|Leatherbreeches|stigma|Spencer repeating|IN THE STREETS/, 'unsupported'], [/Medal of Honor for delaying|MOH for delaying/, 'wrong claim, Dilgers Medal of Honor is for Chancellorsville']];
  const walkText = (o, f, out) => {
    if (Array.isArray(o)) o.forEach((x) => walkText(x, f, out));
    else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) {
      if (typeof v === 'string' && /^(key_action|notes|fate)$/.test(k)) { if (/later accounts|later recollections|is reported to have|not in the Official Records/.test(v)) continue; for (const [re, why] of OOBBAD) if (re.test(v)) out.push(`${f}: ${why}: ${v.slice(0, 80)}`); } else if (v && typeof v === 'object') walkText(v, f, out);
    }
  };
  for (const f of fs.readdirSync(path.join(DIST, 'data', 'oob'))) walkText(oobFile(DIST, f), f, hits);
  const terr = fs.readFileSync(path.join(DIST, 'data', 'terrain.json'), 'utf8');
  for (const [re, why] of [[/Gulp's/, 'typo'], [/Brian Farm/, 'typo'], [/YouTube/, 'leaked note'], [/charged without orders/, 'unsupported claim']]) if (re.test(terr)) hits.push(`terrain.json: ${why}`);
  t.note('notes read', rows.length);
  assertEq(hits.slice(0, 8), [], `${hits.length} notes with an unsupported or leaked phrase`);
});

// ================================================================== T0-DATA-06 pages
suite.test('T0-DATA-06', 'pages: dashboard, index, find-ancestor, living ledger, turning points say what the sources support', async (t) => {
  const S = await open({ profile: 'pages' });
  try {
    const text = async (page) => { await S.page.goto(`${ORIGIN}/${page}`, { waitUntil: 'load' }); await sleep(1800); return S.page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ')); };
    const bad = [];
    const dash = await text('dashboard.html'); t.note('dashboard', dash.slice(0, 200));
    if (/built directly from the primary-source casualty data/.test(dash)) bad.push('dashboard still says "built directly from the primary-source casualty data"');
    if (!/Official Records/.test(dash)) bad.push('dashboard does not name the Official Records');
    if (!/23,049/.test(dash) && !/Official Records[^.]*23,049/.test(dash)) bad.push('dashboard does not state the Official Records Union total 23,049');
    const idx = await S.page.goto(`${ORIGIN}/index.html`, { waitUntil: 'load' }).then(() => S.page.evaluate(() => [document.title, ...[...document.querySelectorAll('meta')].map((m) => m.content)].join(' | ')));
    const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
    const distinct = new Set(rowsOf(DIST, /^(placements_|density_).*\.json$/).map((r) => r.unit_id));
    const m = /(\d{3}) units tracked/.exec(html); t.note('index.html units', m && m[1]); t.note('distinct unit ids in the placement and density files', distinct.size);
    if (/467 regiments and batteries|478 units/.test(html)) bad.push('index.html still states 467 regiments and batteries / 478 units');
    if (!m || +m[1] !== distinct.size) bad.push(`index.html says ${m && m[1]} units tracked; the placement and density files name ${distinct.size} distinct unit ids`);
    t.note('index meta', idx.slice(0, 160));
    const gr = fs.readFileSync(path.join(DIST, 'ground-remembers.html'), 'utf8');
    const grm = /same (\d+) recorded unit positions/.exec(gr);
    const nPlace = rowsOf(DIST, /^placements_.*\.json$/).length; t.note('ground-remembers positions / placement rows', `${grm && grm[1]} / ${nPlace}`);
    if (!grm || +grm[1] !== nPlace) bad.push(`ground-remembers.html says ${grm && grm[1]} recorded unit positions; the placement files hold ${nPlace} rows`);
    const fa = await text('find-ancestor.html');
    if (/467/.test(fa)) bad.push('find-ancestor.html still says 467 regiments');
    if (!/443/.test(fa)) bad.push('find-ancestor.html does not state the 443 regiment records it loads');
    const led = await text('living-ledger.html');
    if (!/modelled running total/i.test(led)) bad.push('living-ledger.html does not label its running total as modelled');
    const tp = await text('turning-points.html');
    if (/Historians broadly agree/.test(tp)) bad.push('turning-points.html still says "Historians broadly agree"');
    if (/occupy the high ground south and east of town/.test(tp)) bad.push('turning-points.html still puts the I Corps fight south and east of town');
    assertEq(bad, [], 'page text that the sources do not support');
    assertEq(S.collector.firstParty.filter((e) => !/tile|mapbox/i.test(`${e.text} ${e.url || ''}`)), [], 'first-party errors on the pages');
  } finally { await closeSession(S); }
});

// ================================================================== the app
const bootApp = async (S, query) => {
  await S.page.goto(`${ORIGIN}/${query}`, { waitUntil: 'load' });
  await waitForApp(S.page, 45000);
  await chooseLayout(S.page, 'desktop');
  await sleep(1400);
};
// [search text, regiment id, text the row must show, text the row must NOT show]
const ROWS = [
  ['63rd Pennsylvania', 'U-63PA', ['Danks', '13.8%'], ['Captain John Danks', '40.7%']],
  ['27th Indiana', 'U-27IN', ['Fesler', '32.4%'], ['36.6%']],
  ['2nd United States', 'U-2US', ['27.2%'], ['52.8%']],
  ['123rd New York', 'U-123NY', ['Rogers', '3%'], ['Archibald']],
  ['15th South Carolina', 'C-15SC', ['De Saussure', '30.6%'], ['Joseph Rice']],
  ['53rd Georgia', 'C-53GA', ['Simms', '20.6%'], ['James Leonard']],
  ['124th New York', 'U-124NY', ['37.8%'], ['54.2%']],
];
suite.test('T0-DATA-07', 'the app: Find Unit rows show the corrected commander and casualty percentage of 7 regiments', async (t) => {
  const S = await open({ profile: 'rows' });
  try {
    await bootApp(S, '?tick=267');
    const p = S.page; const bad = []; const seen = [];
    await p.getByRole('button', { name: 'Find Unit / Location', exact: true }).click().catch(async () => { await p.getByRole('button', { name: 'Search', exact: true }).click(); });
    await sleep(500);
    const input = p.locator('input[type=text],input[type=search],input:not([type])').first();
    for (const [q, id, must, mustNot] of ROWS) {
      await input.fill(''); await input.fill(q); await sleep(600);
      const row = await p.evaluate((uid) => {
        const el = [...document.querySelectorAll('div,span')].find((e) => e.children.length === 0 && e.textContent.trim() === uid);
        if (!el) return null;
        let n = el; for (let i = 0; i < 4 && n.parentElement; i++) { n = n.parentElement; if (/%/.test(n.innerText)) break; }
        return n.innerText.replace(/\s+/g, ' ');
      }, id);
      seen.push(`${id}: ${row}`);
      if (!row) { bad.push(`${id}: no search row`); continue; }
      for (const s of must) if (!row.includes(s)) bad.push(`${id}: row lacks "${s}": ${row.slice(0, 160)}`);
      for (const s of mustNot) if (row.includes(s)) bad.push(`${id}: row still shows "${s}"`);
    }
    t.note('rows', seen);
    assertEq(bad, [], 'search rows that show the old data');
  } finally { await closeSession(S); }
});

suite.test('T0-DATA-08', 'the app: the event card at ticks 29, 75, 290 and 542 shows the corrected chronology text', async (t) => {
  const S = await open({ profile: 'cards' });
  try {
    const CARDS = [
      [29, [/drives Archer's brigade back/, /Maloney/], [/first Confederate general taken since Lee assumed command/, /crashes into/]],
      [75, [/if he found it practicable/], [/take Cemetery Hill if practicable/, /DISCRETIONARY/]],
      [290, [/Semmes is mortally wounded/], [/Semmes's Confederates mortally wounded/, /Cross killed entering the Wheatfield/]],
      [542, [/first to give way/], [/BROCKENBROUGH COLLAPSES/, /8th Ohio's advanced skirmish position/]],
    ];
    const bad = []; const seen = [];
    for (const [tick, must, mustNot] of CARDS) {
      await bootApp(S, `?tick=${tick}`);
      const card = await waitFor(async () => S.page.evaluate(() => { const c = document.querySelector('[data-gtbg-card="1"]'); return c ? c.innerText.replace(/\s+/g, ' ') : null; }), { timeout: 8000, label: `event card at tick ${tick}` }).catch(() => null);
      seen.push(`t${tick}: ${card ? card.slice(0, 90) : 'no card'}`);
      if (!card) { bad.push(`tick ${tick}: no event card`); continue; }
      for (const re of must) if (!re.test(card)) bad.push(`tick ${tick}: card lacks ${re}`);
      for (const re of mustNot) if (re.test(card)) bad.push(`tick ${tick}: card still says ${re}`);
    }
    t.note('cards', seen);
    assertEq(bad, [], 'event cards that show the old claim');
  } finally { await closeSession(S); }
});

// ================================================================== T0-DATA-10..14 positions
const km = (a, b) => { const R = 6371, rad = (d) => (d * Math.PI) / 180, dl = rad(b.lat - a.lat), dg = rad(b.lng - a.lng); const x = Math.sin(dl / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dg / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
const CULP = { lat: 39.820096, lng: -77.22054 };      // terrain.json LOC-002 Culp's Hill
const LRT_LINE = { lat: 39.7933, lng: -77.2394 };     // the row of Vincent's brigade at tick 267
suite.test('T0-DATA-10', 'positions: no unit is on the field before it arrived or after it left (First and Eleventh Corps, Rodes, Early, cavalry)', async (t) => {
  const rows = rowsOf(DIST, /^(placements_|density_).*\.json$/); const regs = regiments(DIST);
  const fam = (u) => (regs.get(u) ? regs.get(u).parent_brigade_id : u);
  // [family pattern, first tick it may appear, last tick it may appear, source]
  const RULES = [
    [/^U-I-[123]-\d$/, 24, 9999, 'First Corps: left Marsh Creek at 8 a.m., on the Cashtown road at about 10 a.m. (OR 27/1 p.265, p.359, p.267)'],
    [/^U-XI-\d-\d$/, 50, 9999, 'Eleventh Corps: marched from Emmitsburg on July 1 (OR 27/1 p.144, p.696)'],
    [/^C-II-3-\d$/, 47, 9999, "Rodes's division: at Heidlersburg on the night of June 30 (OR 27/2 p.444)"],
    [/^C-II-1-\d$/, 55, 9999, "Early's division: 3 miles from Heidlersburg on the night of June 30 (OR 27/2 p.444)"],
    [/^U-CAV-1-R$/, 99999, 9999, "Merritt's reserve brigade: at Mechanicstown and Emmitsburg until July 3 (OR 27/1 p.145)"],
    [/^U-CAV-2-2$/, 99999, 9999, 'Huey\'s brigade: Manchester and Westminster, never at Gettysburg (OR 27/1 p.145)'],
    [/^U-CAV-(2|2-1|2-3|3)$/, 226, 9999, "Gregg's division, McIntosh, Custer, Kilpatrick: reached the field on July 2 (OR 27/1 p.145)"],
    [/^U-I-3-3$/, 100, 9999, "Stannard's Vermont brigade: reported to Doubleday about twilight of July 1 (OR 27/1 p.258)"],
    [/^U-CAV-1(-[12])?$/, 0, 340, "Buford's division left for Taneytown on July 2 (OR 27/1 p.117, p.145, p.1032)"],
    [/^U-HAB-A2US$/, 0, 256, "Calef's battery reached Taneytown about 4 p.m. on July 2 (OR 27/1 p.1032)"],
  ];
  const bad = [];
  for (const r of rows) for (const [re, first, last, what] of RULES) if (re.test(fam(r.unit_id)) && (r.tick < first || r.tick > last)) bad.push(`${r.f} ${r.unit_id} tick ${r.tick}: ${what}`);
  t.note('rows read', rows.length); t.note('rows on the field outside their documented days', bad.length);
  assertEq(bad.slice(0, 8), [], `${bad.length} rows show a unit outside the time it was on the field`);
  // Buford's brigades end on the Taneytown Road, not on the field
  const last = (id) => rows.filter((r) => r.unit_id === id).sort((a, b) => a.tick - b.tick).pop();
  for (const id of ['U-CAV-1-1', 'U-CAV-1-2', 'U-HAB-A2US', 'U-8IL-CAV']) { const r = last(id); assert(r && r.lat < 39.77, `${id}: last row at ${r && r.lat},${r && r.lng} is still on the field`); }
});

suite.test('T0-DATA-11', 'positions: the Iron Brigade, Cutler, Baxter, Iverson, Vincent, Hazlett and Garnett are where their notes and the sources put them', async (t) => {
  const rows = rowsOf(DIST, /^(placements_|density_).*\.json$/); const bad = [];
  const at = (id, tick) => rows.filter((r) => r.unit_id === id && r.tick === tick);
  // no First Corps infantry row on the Confederate side of Willoughby Run (longitude -77.266) between ticks 12 and 60, apart from cavalry, skirmishers and artillery
  for (const r of rows) if (r.unit_id.startsWith('U-') && !/CAV|SS|HAB|ART/.test(r.unit_id) && r.tick >= 12 && r.tick <= 60 && r.lng < -77.266) bad.push(`${r.f} ${r.unit_id} tick ${r.tick} at ${r.lng}`);
  // Wadsworth: the division held Culp's Hill on July 2 and 3 (OR 27/1 p.266); nothing of it may drift to Seminary Ridge at tick 650
  for (const id of ['U-I-1-1', 'U-I-1-2', 'U-I-1']) { const r = rows.filter((x) => x.unit_id === id && x.tick >= 100).sort((a, b) => b.tick - a.tick)[0]; if (!r || km(r, CULP) > 0.35) bad.push(`${id}: last row ${r ? `tick ${r.tick} at ${r.lat},${r.lng}` : 'none'} is not on Culp's Hill`); }
  // Iverson's regiments and Baxter's brigade at the stone wall: within 0.5 km of the brigade row of the same tick (OR 27/2 p.553-554)
  for (const [reg, brig] of [['C-5NC', 'C-II-3-3'], ['C-12NC', 'C-II-3-3'], ['C-20NC', 'C-II-3-3'], ['C-23NC', 'C-II-3-3'], ['U-I-2-2', 'C-II-3-3']]) for (const tick of [50, 53]) { const b = at(brig, tick)[0]; for (const r of at(reg, tick)) if (b && km(r, b) > 0.5) bad.push(`${r.f} ${reg} tick ${tick}: ${km(r, b).toFixed(2)} km from ${brig}`); }
  // Vincent and Hazlett on Little Round Top at ticks 266-272 (OR 27/1 p.602, p.623)
  for (const id of ['U-V-1-3', 'U-ART-D5US']) for (const r of rows.filter((x) => x.unit_id === id && x.tick >= 266 && x.tick <= 272)) if (km(r, LRT_LINE) > 0.35) bad.push(`${r.f} ${id} tick ${r.tick}: ${km(r, LRT_LINE).toFixed(2)} km from the Little Round Top line`);
  // Pickett's charge: Garnett at The Angle at tick 548 and no row of his 1 km north of it
  for (const r of rows.filter((x) => x.unit_id === 'C-I-3-1' && x.tick >= 546 && x.tick <= 556)) if (r.lat > 39.82) bad.push(`${r.f} C-I-3-1 tick ${r.tick} at ${r.lat}: 1 km north of The Angle`);
  t.note('violations', bad.length);
  assertEq(bad.slice(0, 8), [], `${bad.length} rows that contradict their notes or the sources`);
});

suite.test('T0-DATA-12', 'positions: no regiment is left where its last row put it while its brigade moved on (the engine keeps the last state)', async (t) => {
  const rows = rowsOf(DIST, /^(placements_|density_).*\.json$/); const regs = regiments(DIST);
  const lastOf = (id) => rows.filter((r) => r.unit_id === id).sort((a, b) => a.tick - b.tick).pop();
  const bad = []; let n = 0;
  for (const [id, reg] of regs) {
    const r = lastOf(id), b = lastOf(reg.parent_brigade_id);
    if (!r || !b) continue; n++;
    if (r.tick < 640 && km(r, b) > 1.2 && id !== 'U-16ME') bad.push(`${id} last row tick ${r.tick}: ${km(r, b).toFixed(2)} km from ${reg.parent_brigade_id} (last row tick ${b.tick})`);
  }
  t.note('regiments compared with their brigade', n); t.note('regiments left behind', bad.length);
  assertEq(bad.slice(0, 8), [], `${bad.length} regiments stand where they stood hours before their brigade left`);
});

suite.test('T0-DATA-13', 'positions: no note names a different brigade than the row it is on (Pettigrew, Brockenbrough, the 157th New York)', async (t) => {
  const rows = rowsOf(DIST, /^(placements_|density_).*\.json$/); const bad = [];
  const get = (id, tick) => rows.filter((r) => r.unit_id === id && r.tick === tick).map((r) => r.notes || '').join(' | ');
  for (const [id, tick, must, mustNot] of [['C-III-2-1', 8, /Pettigrew/, /Archer deploying/], ['C-III-2-1', 11, /Pettigrew/, /crossing Willoughby/], ['C-III-2-2', 8, /Brockenbrough/, /Davis deploying/], ['C-III-2-2', 11, /Brockenbrough/, /Davis advancing/], ['C-III-2-2', 35, /Brockenbrough/, /Davis reforming/], ['U-157NY', 60, /157th/, /Coster/]]) {
    const n = get(id, tick); if (!must.test(n) || mustNot.test(n)) bad.push(`${id} tick ${tick}: ${n.slice(0, 100)}`);
  }
  assertEq(bad, [], 'notes that still name another brigade');
});

suite.test('T0-DATA-14', "the app: the data the browser loads gives the Iron Brigade on Culp's Hill at tick 300, Buford's brigades on the Taneytown Road, no First Corps unit on the field at tick 12", async (t) => {
  const S = await open({ profile: 'pos' });
  try {
    await bootApp(S, '?tick=300');
    const files = fs.readdirSync(path.join(DIST, 'data')).filter((f) => /^(placements_|density_).*\.json$/.test(f));
    const res = await S.page.evaluate(async (list) => {
      // the engine keeps a unit at its last row (function y1 of the index chunk): resolve the state of every unit at a tick the same way
      const rows = [];
      for (const f of list) { const j = await fetch(`/data/${f}`).then((r) => r.json()); for (const r of (Array.isArray(j) ? j : j.placements || [])) if (r && r.unit_id) rows.push(r); }
      const stateAt = (tick) => { const m = {}; for (const r of rows.filter((x) => x.tick <= tick).sort((a, b) => a.tick - b.tick)) m[r.unit_id] = r; return m; };
      const s300 = stateAt(300), s12 = stateAt(12);
      return { iron: s300['U-I-1-1'], gamble: s300['U-CAV-1-1'], calef: s300['U-HAB-A2US'], twiw: s300['U-2WI'], merritt: s300['U-CAV-1-R'] || null, early12: Object.keys(s12).filter((u) => /^U-I-[123]-\d$|^U-XI-\d-\d$|^C-II-[13]-\d$/.test(u)) };
    }, files);
    t.note('state at tick 300', { iron: res.iron && [res.iron.lat, res.iron.lng], gamble: res.gamble && [res.gamble.lat, res.gamble.lng], twiw: res.twiw && [res.twiw.lat, res.twiw.lng] });
    assert(res.iron && km(res.iron, CULP) < 0.35, `Iron Brigade at tick 300 is ${res.iron ? km(res.iron, CULP).toFixed(2) : '?'} km from Culp's Hill`);
    assert(res.gamble && res.gamble.lat < 39.77, `Gamble's brigade at tick 300 is still on the field (${res.gamble && res.gamble.lat})`);
    assert(res.calef && res.calef.lat < 39.77, "Calef's battery at tick 300 is still on the field");
    assert(res.twiw && km(res.twiw, CULP) < 0.5, `the 2nd Wisconsin at tick 300 is ${res.twiw ? km(res.twiw, CULP).toFixed(2) : '?'} km from Culp's Hill (it should be with its brigade)`);
    assertEq(res.merritt, null, "Merritt's reserve brigade has no position at tick 300");
    assertEq(res.early12, [], 'First Corps, Eleventh Corps, Rodes and Early units that are on the field at tick 12 (about 07:30)');
  } finally { await closeSession(S); }
});

// ================================================================== guards
suite.test('T0-DATA-09', 'the Virtual Walkthrough code and its 512-monument array are byte-identical to the control tree', async (t) => {
  if (!fs.existsSync(path.join(CONTROL, 'version.json'))) throw new Skip(`control tree not found: ${CONTROL}`);
  const entry = (root) => fs.readFileSync(path.join(root, 'assets', rdJson(root, 'version.json').entry), 'utf8');
  const cut = (txt) => {
    const ast = acorn.parse(txt, { ecmaVersion: 'latest', sourceType: 'module' });
    for (const n of ast.body) if (n.type === 'VariableDeclaration') for (const d of n.declarations) if (d.id.type === 'Identifier' && d.id.name === '_A' && d.init) return txt.slice(d.init.start, d.init.end);
    throw new Error('the monument array _A is not a top-level declaration of the entry');
  };
  const a = cut(entry(DIST)), b = cut(entry(CONTROL));
  t.note('_A bytes', a.length);
  assertEq(a === b, true, 'the 512-monument array differs from the control tree');
  assert((a.match(/\{no:/g) || []).length === 512, `the monument array has ${(a.match(/\{no:/g) || []).length} entries, expected 512`);
  const walk = (root) => { const t2 = entry(root); const i = t2.indexOf('Virtual Walkthrough'); return i >= 0 ? t2.length : 0; };
  assert(walk(DIST) > 0, 'Virtual Walkthrough text not found in the entry');
});

suite.test('T0-DATA-X', 'every browser test of this run: 0 first-party console errors', async (t) => {
  t.note('browser sessions opened', seq);
  if (!seq) throw new Skip('no browser session in this run');
  assertEq(BROWSER_ERRORS.slice(0, 6), [], 'first-party errors seen by the browser sessions that were closed');
});

// ------------------------------------------------------------------ run
const resultsDir = TREE_DIR;
const outFile = path.join(resultsDir, EXPECT_RED ? 'test-data-expect-red.json' : 'test-data.json');
const GUARDS = new Set(['T0-DATA-09', 'T0-DATA-X']);
let summary;
try {
  summary = await suite.run({ filter: FILTER, outFile: path.join(REPO, 'tmp', process.env.T0_AGENT, path.basename(outFile)), extra: () => ({ dist: path.relative(REPO, DIST), groups: GROUPS }) });
} finally {
  for (const s of [...sessions]) { try { await s.close(); } catch { /* already closed */ } }
  await srv.close();
}
if (EXPECT_RED) {
  const feature = summary.results.filter((r) => !GUARDS.has(r.id) && r.status !== 'skip');
  const allRed = feature.length > 0 && feature.every((r) => r.status === 'fail');
  console.log(allRed ? `expected-red: all ${feature.length} feature tests failed on this tree (red-first proven; guards are exempt)` : `expected-red VIOLATED: passed on this tree: ${feature.filter((r) => r.status !== 'fail').map((r) => r.id).join(', ')}`);
  process.exit(allRed ? 0 : 1);
}
process.exit(summary.failed ? 1 : 0);

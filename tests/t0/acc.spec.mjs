// T0-ACC suite (release R1e, group ACC + page part PG-zacc): no casualty rate above 100 percent is printed as fact.
//
// Found by acceptance check 6 on R1d: /regiment and /report print losses / strength, and two records of the order of battle gave 135.2 % (107th Pennsylvania: 165 losses over the
// strength 122 of the 107th New York, whose record it had been) and 107.1 % (6th US Cavalry: the 242 losses of Fairfield over a strength of 226). A rate above 100 % is impossible;
// the records now carry the sourced strength (255, MacThomson's report, OR 27/1 p.304) or no rate with the reason (the 6th US Cavalry), and the pages never print a rate above 100 %.
//
//   ACC-01  the ACC patches apply to the text they anchor on (only when no --dist is given: the tree under test is then R1d plus the two patch files)
//   ACC-02  data: no record of data/oob/*.json has casualties above its strength, and none carries a casualty_percentage above 100 (node only)
//   ACC-03  data: the 107th Pennsylvania is 255 men, 165 losses, 64.7 % with its sources named; the 6th US Cavalry has no rate and says why
//   ACC-04  rendered /regiment: 64.7 % for the 107th Pennsylvania; a dash with the reason in the tooltip for the 6th US Cavalry
//   ACC-05  rendered /report: the same two records
//   ACC-06  the guard itself: a record that says 135.2 % (or that has 140 losses over 100 men and no rate) prints no rate on either page, whatever the data says
//
//   node tests/t0/acc.spec.mjs                                          R1d dist + the ACC patch files (tmp), as the next train will build it
//   node tests/t0/acc.spec.mjs --dist release/R1e/dist                  any built tree (as is)
//   node tests/t0/acc.spec.mjs --dist release/R1d/dist --expect-red     red-first: every test above fails on R1d as published
//   node tests/t0/acc.spec.mjs --no-browser                              ACC-01..03 only
//
// Env: T0_AGENT (scratch dir, default acc), T0_PORT_BASE (lab server = base, base+1; Chrome CDP = base+2..)
import fs from 'node:fs';
import path from 'node:path';

process.env.T0_AGENT ??= 'acc';
process.env.T0_PORT_BASE ??= '8460';
const { REPO, TMP, PORT_BASE, openSession, createStaticServer, createSuite, assert, assertEq, sleep, waitFor } = await import('./lib.mjs');

const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : dflt; };
const FILTER = opt('filter', null);
const EXPECT_RED = !!opt('expect-red', false);
const NO_BROWSER = !!opt('no-browser', false);
const GIVEN = opt('dist', null);
const R1D = path.join(REPO, 'release', 'R1d', 'dist');
const BASE = path.resolve(REPO, GIVEN || path.relative(REPO, R1D));
if (!fs.existsSync(BASE)) { console.error(`dist not found: ${BASE}`); process.exit(2); }

const isPureCrlf = (t) => t.includes('\r\n') && !t.replace(/\r\n/g, '').includes('\n');
const eolAdapt = (t, s) => (s.includes('\n') && !s.includes('\r\n') && isPureCrlf(t) ? s.replace(/\n/g, '\r\n') : s);
const readDist = (rel) => fs.readFileSync(path.join(BASE, rel), 'utf8');

// ---------------------------------------------------------------- the tree under test: --dist as it is, or R1d with the two patch files applied to the four files they target
const WORK = path.join(TMP, 'tree'); fs.rmSync(WORK, { recursive: true, force: true });
const overrides = {};   // url path -> file under WORK
const applyLog = [];
if (!GIVEN) {
  const patches = [];
  for (const f of ['ACC.json', 'PG-zacc.json']) patches.push(...JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 't0', 'patches-next', f), 'utf8')).patches);
  const texts = new Map();
  for (const p of patches) {
    let t = texts.get(p.target) ?? readDist(p.target);
    const find = eolAdapt(t, p.find), repl = eolAdapt(t, p.repl);
    const n = t.split(find).length - 1;
    applyLog.push({ id: p.id, target: p.target, expect: p.expect, found: n });
    if (n === p.expect) { t = t.split(find).join(repl); texts.set(p.target, t); }
  }
  for (const [target, text] of texts) {
    const out = path.join(WORK, target); fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, text);
    overrides['/' + target.replace(/\.html$/, '') ] = out; overrides['/' + target] = out;
  }
}
const effective = (rel) => { const o = overrides['/' + rel]; return fs.readFileSync(o || path.join(BASE, rel), 'utf8'); };
const OOB = fs.readdirSync(path.join(BASE, 'data', 'oob')).filter((f) => f.endsWith('.json'));
const oobJson = (f) => JSON.parse(effective('data/oob/' + f));
const findRegiment = (id) => { for (const f of OOB) { const d = oobJson(f); const r = (d.regiments || []).find((x) => x.regiment_id === id); if (r) return r; } return null; };

const suite = createSuite('acc');
const RED = new Set();
const test = (id, title, fn, { red = true } = {}) => { if (red) RED.add(id); suite.test(id, title, fn); };

test('T0-ACC-01', 'the ACC patches apply to the text they anchor on, exactly as often as they say', async () => {
  if (GIVEN) return;   // a built tree has them applied already: ACC-02..06 judge the result
  const bad = applyLog.filter((a) => a.found !== a.expect);
  assert(applyLog.length === 4, `expected 4 patches (2 data, 2 page), found ${applyLog.length}`);
  assert(!bad.length, `patches that do not apply: ${JSON.stringify(bad)}`);
}, { red: false });

test('T0-ACC-02', 'no record of the order of battle has more casualties than men unless it is flagged as a gap (no rate, the reason in words), and none carries a casualty_percentage above 100', async (t) => {
  const over = []; let checked = 0;
  for (const f of OOB) {
    const walk = (o, where) => {
      if (Array.isArray(o)) return o.forEach((v, i) => walk(v, where));
      if (!o || typeof o !== 'object') return;
      const id = o.regiment_id || o.brigade_id || o.division_id || o.corps_id || o.battery_id || o.id;
      if (typeof o.strength === 'number' && o.strength > 0 && typeof o.casualties === 'number') {
        checked++;
        // losses above the men engaged are allowed only as a FLAGGED gap: no rate in the record, and the record says in words that none is given (the 6th US Cavalry: Fairfield's losses over a strength not for that action)
        if (o.casualties > o.strength && !(!('casualty_percentage' in o) && /No casualty rate is given/.test(o.key_action || ''))) over.push(`${f} ${id}: ${o.casualties} casualties of ${o.strength} (${(100 * o.casualties / o.strength).toFixed(1)} %) and no flag`);
      }
      if (typeof o.casualty_percentage === 'number' && o.casualty_percentage > 100) over.push(`${f} ${id}: casualty_percentage ${o.casualty_percentage}`);
      for (const v of Object.values(o)) walk(v, where);
    };
    walk(oobJson(f), f);
  }
  t.note('records with strength and casualties checked', checked);
  assert(checked > 500, `only ${checked} records checked: the scan did not find the order of battle`);
  assertEq(over, [], 'a rate above 100 % is impossible');
});

test('T0-ACC-03', '107th Pennsylvania: 255 men from the commander\'s report, 165 losses from the return, 64.7 %; 6th US Cavalry: no rate and the reason', async () => {
  const a = findRegiment('U-107PA');
  assert(a, 'U-107PA missing');
  assertEq([a.strength, a.casualties, a.casualty_percentage], [255, 165, 64.7], '107th Pennsylvania strength, casualties, rate');
  assert(Math.abs(a.casualty_percentage - Math.round(1000 * a.casualties / a.strength) / 10) < 1e-9, 'the rate is losses / strength');
  assert(/OR 27\/1 p\.304/.test(a.key_action) && /OR 27\/1 p\.173/.test(a.key_action), `key action names both sources: ${a.key_action}`);
  const b = findRegiment('U-6US-CAV');
  assert(b, 'U-6US-CAV missing');
  assert(!('casualty_percentage' in b), 'the 6th US Cavalry carries no rate');
  assert(/No casualty rate is given/.test(b.key_action) && /Fairfield/.test(b.key_action) && /p\.948/.test(b.key_action), `key action says why: ${b.key_action}`);
}, {});

// ---------------------------------------------------------------- rendered
let srv = null, srvSynth = null, S = null;
const GUARD_TITLE = /No rate is given/;
async function page() { const p = await S.newPage(); return p; }

if (!NO_BROWSER) {
  srv = await createStaticServer({ root: BASE, port: PORT_BASE, overrides });
  // synthetic data for ACC-06: the same tree with two records the way a bad source would write them
  const synth = {};
  const oobFile = 'union_regiments_i_ii_corps.json';
  const doc = JSON.parse(effective('data/oob/' + oobFile));
  const r107 = doc.regiments.find((r) => r.regiment_id === 'U-107PA'); r107.casualty_percentage = 135.2;
  const r11 = doc.regiments.find((r) => r.regiment_id === 'U-11PA'); r11.strength = 100; r11.casualties = 140; delete r11.casualty_percentage;
  const sf = path.join(WORK, 'synthetic', oobFile); fs.mkdirSync(path.dirname(sf), { recursive: true }); fs.writeFileSync(sf, JSON.stringify(doc));
  synth['/data/oob/' + oobFile] = sf;
  for (const rel of ['regiment.html', 'report.html']) { synth['/' + rel] = overrides['/' + rel] || path.join(BASE, rel); synth['/' + rel.replace(/\.html$/, '')] = synth['/' + rel]; }
  srvSynth = await createStaticServer({ root: BASE, port: PORT_BASE + 1, overrides: { ...overrides, ...synth } });
  S = await openSession({ profile: 'acc', cdpPort: PORT_BASE + 2, tiles: 'block', onboarded: false, viewport: { width: 1280, height: 800, dpr: 1, mobile: false } });
}
const regimentRate = async (origin, id) => {
  const p = await page();
  try {
    await p.goto(`${origin}/regiment?unit=${id}`, { waitUntil: 'load' });
    await waitFor(async () => (await p.evaluate(() => document.getElementById('b-strength') && document.getElementById('b-strength').textContent)) !== '—' , { timeout: 15000, label: 'regiment page filled' });
    await sleep(200);
    return await p.evaluate(() => ({ rate: document.getElementById('b-rate').textContent, title: document.getElementById('b-rate').title || '', strength: document.getElementById('b-strength').textContent, casualties: document.getElementById('b-casualties').textContent, name: (document.getElementById('b-name') || document.querySelector('h2,h1') || {}).textContent }));
  } finally { await p.close().catch(() => {}); }
};
const reportRow = async (origin, query, designation) => {
  const p = await page();
  try {
    await p.goto(`${origin}/report`, { waitUntil: 'load' });
    await waitFor(() => p.evaluate(() => !!document.getElementById('report-search')), { timeout: 15000, label: 'report page' });
    await sleep(800);
    await p.fill('#report-search', query);
    await waitFor(() => p.evaluate((d) => [...document.querySelectorAll('#matches .match')].some((m) => m.textContent === d), designation), { timeout: 15000, label: 'match listed: ' + designation });
    await p.evaluate((d) => { [...document.querySelectorAll('#matches .match')].find((m) => m.textContent === d).click(); }, designation);
    await sleep(200);
    return await p.evaluate(() => { const el = document.getElementById('r-rate'); return { text: el.textContent, hidden: !!el.parentElement && el.parentElement.style.display === 'none', title: document.getElementById('r-title').textContent, casualties: document.getElementById('r-casualties').textContent, strength: document.getElementById('r-strength').textContent, action: document.getElementById('r-action').textContent }; });
  } finally { await p.close().catch(() => {}); }
};

if (!NO_BROWSER) {
  test('T0-ACC-04', '/regiment: 64.7 % for the 107th Pennsylvania, a dash with the reason for the 6th US Cavalry', async (t) => {
    const a = await regimentRate(srv.url, 'U-107PA');
    assertEq([a.strength, a.casualties, a.rate], ['255', '165', '64.7%'], '107th Pennsylvania on /regiment');
    const b = await regimentRate(srv.url, 'U-6US-CAV');
    assertEq(b.rate, '—', '6th US Cavalry on /regiment prints no rate');
    assert(GUARD_TITLE.test(b.title) || /No casualty rate is given/.test(await (async () => { const p = await page(); try { await p.goto(`${srv.url}/regiment?unit=U-6US-CAV`, { waitUntil: 'load' }); await waitFor(() => p.evaluate(() => document.getElementById('b-action').textContent.length > 20), { timeout: 15000 }); return await p.evaluate(() => document.getElementById('b-action').textContent); } finally { await p.close().catch(() => {}); } })()), 'the page says why (tooltip or key action)');
    t.note('6th US Cavalry', { strength: b.strength, casualties: b.casualties, title: b.title.slice(0, 60) });
  });
  test('T0-ACC-05', '/report: 64.7 % for the 107th Pennsylvania, no rate row for the 6th US Cavalry', async () => {
    const a = await reportRow(srv.url, '107th Pennsylvania', '107th Pennsylvania Volunteer Infantry');
    assertEq([a.strength, a.casualties, a.text, a.hidden], ['255', '165', '64.7%', false], '107th Pennsylvania on /report');
    const b = await reportRow(srv.url, '6th United States Cav', '6th United States Cavalry');
    assert(b.hidden && b.text === '', `the 6th US Cavalry prints no rate row: ${JSON.stringify(b)}`);
    assert(/No casualty rate is given/.test(b.action), 'the key action row says why');
  });
  test('T0-ACC-06', 'the guard: a record that says 135.2 %, or has 140 losses over 100 men and no rate, prints no rate on either page', async () => {
    const a = await regimentRate(srvSynth.url, 'U-107PA');
    assertEq(a.rate, '—', 'recorded 135.2 % is not printed on /regiment');
    assert(GUARD_TITLE.test(a.title), `the tooltip says why: ${JSON.stringify(a.title)}`);
    const b = await regimentRate(srvSynth.url, 'U-11PA');
    assertEq([b.strength, b.casualties, b.rate], ['100', '140', '—'], '140 losses over 100 men on /regiment');
    const c = await reportRow(srvSynth.url, '107th Pennsylvania', '107th Pennsylvania Volunteer Infantry');
    assert(c.hidden && c.text === '', `recorded 135.2 % is not printed on /report: ${JSON.stringify(c)}`);
    const d = await reportRow(srvSynth.url, '11th Pennsylvania', '11th Pennsylvania Volunteer Infantry');
    assert(d.hidden && d.text === '', `140/100 is not printed on /report: ${JSON.stringify(d)}`);
    // the guard leaves a sound record alone
    const e = await regimentRate(srvSynth.url, 'U-16ME');
    assert(/^\d+(\.\d)?%$/.test(e.rate) && parseFloat(e.rate) <= 100, `a record below 100 % still prints its rate: ${JSON.stringify(e)}`);
  });
}

let summary;
try {
  const ids = [...RED];
  const filter = EXPECT_RED ? `^(${ids.filter((i) => !FILTER || new RegExp(FILTER, 'i').test(i)).join('|')})$` : FILTER;
  summary = await suite.run({ filter, outFile: path.join(TMP, 'test-acc.json'), extra: () => ({ dist: path.relative(REPO, BASE), patchesApplied: GIVEN ? 'as built' : applyLog }) });
} finally {
  if (S) { try { await S.close(); } catch { /* closed */ } }
  if (srv) await srv.close();
  if (srvSynth) await srvSynth.close();
}
if (EXPECT_RED) {
  const allRed = summary.results.length > 0 && summary.results.every((r) => r.status === 'fail');
  console.log(allRed ? 'expected-red: every selected test failed on this tree (red-first proven)' : `expected-red VIOLATED: passed on this tree: ${summary.results.filter((r) => r.status !== 'fail').map((r) => r.id)}`);
  process.exit(allRed ? 0 : 1);
}
process.exit(summary.failed ? 1 : 0);

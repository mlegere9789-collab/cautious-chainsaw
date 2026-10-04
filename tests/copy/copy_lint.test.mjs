// Tests for tools/copy/copy_lint.mjs: every rule catches its seeded violations and leaves clean text alone, the extractor reads
// what a visitor reads, and the ratchet fails on new, stale and expired entries.
//   node --test "tests/copy/*.test.mjs"
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { RULES } from '../../tools/copy/lib/rules.mjs';
import { makeEnv, lintSource, lintTree, REPO } from '../../tools/copy/lib/lint.mjs';
import { scanJsStrings, unescapeJs } from '../../tools/copy/lib/jsstrings.mjs';
import { extractHtml, isUserFacingString, decodeEntities, parseDirectives } from '../../tools/copy/lib/extract.mjs';
import { buildBaseline, evaluateRatchet, tightenBaseline, baselineShapeProblems, groupFindings } from '../../tools/copy/lib/ratchet.mjs';
import { main as lintMain, EXPIRIES } from '../../tools/copy/copy_lint.mjs';

const fixtures = JSON.parse(fs.readFileSync(new URL('./fixtures/rules.json', import.meta.url), 'utf8'));
const env = makeEnv({ root: REPO });
const run = (rel, src) => lintSource(rel, src, env).findings;
const ext = { html: 'page.html', js: 'app.js', json: 'data.json', md: 'doc.md', text: 'doc.txt' };

test('every rule has a fixture, and every fixture names a rule', () => {
  for (const r of RULES) assert.ok(fixtures[r.id], `rule ${r.id} has no fixture in tests/copy/fixtures/rules.json`);
  for (const id of Object.keys(fixtures)) if (!id.startsWith('_')) assert.ok(RULES.some((r) => r.id === id), `fixture for unknown rule ${id}`);
});

for (const rule of RULES) {
  test(`${rule.id}: catches every seeded violation`, () => {
    const fx = fixtures[rule.id];
    assert.ok(fx.bad.length >= 1, 'at least one seeded violation');
    for (const src of fx.bad) {
      const hits = run(ext[fx.kind], src).filter((f) => f.rule === rule.id);
      assert.ok(hits.length >= 1, `${rule.id} did not flag: ${src}`);
    }
  });
  test(`${rule.id}: does not flag clean text`, () => {
    const fx = fixtures[rule.id];
    assert.ok(fx.good.length >= 1, 'at least one clean sample');
    for (const src of fx.good) {
      const hits = run(ext[fx.kind], src).filter((f) => f.rule === rule.id);
      assert.deepEqual(hits.map((h) => h.match), [], `${rule.id} flagged clean text: ${src}`);
    }
  });
}

test('a rule documents why and how to fix, and has an expiry family', () => {
  for (const r of RULES) { assert.ok(r.title && r.why && r.fix && r.guide, r.id); assert.ok(['E', 'W'].includes(r.sev)); assert.ok(EXPIRIES[r.id] || EXPIRIES.default); }
});

// ---- extraction
test('entities decode before the rules run: a curly apostrophe typed as &rsquo; is not a straight quote', () => {
  assert.equal(decodeEntities('Culp&rsquo;s &mdash; Hill &#8211; &#x2013;'), 'Culp’s — Hill – –');
  assert.equal(run('a.html', '<p>Culp&rsquo;s Hill &mdash; Day 2</p>').length, 0);
});
test('inline tags join the text of a paragraph, block tags separate it', () => {
  const items = extractHtml('<p>Watch it in <b>real</b> <em>time</em> now.</p><p>Second</p>').filter((i) => i.kind === 'html-text');
  assert.equal(items[0].text, 'Watch it in real time now.');
  assert.ok(run('a.html', '<p>Watch it in <b>real</b> <em>time</em> now.</p>').some((f) => f.rule === 'REALTIME'));
});
test('attributes a visitor reads are linted: alt, title, aria-label, placeholder, meta description, mailto links', () => {
  const src = '<meta name="description" content="Fought minute-by-minute"><img src="a.png" alt="Tick marks"><input placeholder="Enter 7:30am"><a href="mailto:a@gmail.com" title="x">Hi</a>';
  const rules = new Set(run('a.html', src).map((f) => f.rule));
  for (const id of ['REALTIME', 'TICK', 'TIMEFMT', 'PERSONAL_EMAIL']) assert.ok(rules.has(id), id);
});
test('script and style bodies are not text; inline script strings are', () => {
  const src = '<style>.a{content:"7:30am tick"}</style><script>var x = 1; var y = "Real time playback of ticks";</script><p>ok</p>';
  const f = run('a.html', src);
  assert.ok(f.some((x) => x.rule === 'REALTIME' && x.kind === 'js-string'));
  assert.ok(!f.some((x) => x.kind === 'html-text' && x.rule === 'TIMEFMT'));
});
test('code, pre and kbd are not prose', () => {
  assert.equal(run('a.html', '<pre>a -- b</pre><code>tick -- undefined</code><kbd>7:30am</kbd>').length, 0);
});
test('JSON-LD and JSON data: strings are linted, ids and urls are not', () => {
  const ld = '<script type="application/ld+json">{"@context":"https://schema.org","description":"Follow 467 regiments","url":"https://x.org/tick -- a"}</script>';
  assert.ok(run('a.html', ld).some((f) => f.rule === 'COUNT'));
  assert.ok(!run('a.html', ld).some((f) => f.match.includes('x.org')));
  const data = JSON.stringify({ unit_id: 'U-84NY', event: 'Shot -- in the head KIA', units_involved: ['U-84NY'], metadata: { note: 'tick -- tock' } });
  const f = run('data.json', data);
  assert.ok(f.some((x) => x.rule === 'DASH' && x.where === '/event'));
  assert.ok(f.some((x) => x.rule === 'CASUALTY'));
  assert.ok(!f.some((x) => x.rule === 'IDLEAK'), 'a bare id as a whole data value is a reference, not copy');
  assert.ok(!f.some((x) => x.where.includes('metadata')), 'metadata subtrees are not rendered');
});
test('QUOTES in JSON only judges prose keys (identity fields stay ASCII)', () => {
  assert.equal(run('d.json', JSON.stringify({ designation: "Culp's Hill battery", event: 'Culp’s Hill' })).filter((f) => f.rule === 'QUOTES').length, 0);
  assert.equal(run('d.json', JSON.stringify({ event: "Culp's Hill fell" })).filter((f) => f.rule === 'QUOTES').length, 1);
});
test('manifest.json is read through a whitelist of text fields', () => {
  const m = JSON.stringify({ name: 'Animated Battlefield Map', start_url: '/tick -- x', icons: [{ src: '/a.png', sizes: '192x192' }], description: 'Follow 467 regiments' });
  const rules = run('manifest.json', m).map((f) => f.rule);
  assert.ok(rules.includes('NAME') && rules.includes('COUNT') && !rules.includes('DASH'));
});

// ---- JS scanning
test('scanJsStrings: quotes, escapes, templates, comments and regular expressions', () => {
  const src = [
    'var a = "He said \\"hi\\" at 7:30am"; // not "this"',
    "var b = 'It\\u2019s fine'; /* \"nor this\" */",
    'var c = `Tick ${n + "inner"} of ${total}`;',
    'var re = /["\']tick["\']/g; var d = x / 2 + "after regex";',
    'var e = a ? "yes" : "no";',
  ].join('\n');
  const vals = scanJsStrings(src).map((s) => s.value);
  assert.ok(vals.includes('He said "hi" at 7:30am'));
  assert.ok(vals.includes('It’s fine'));
  assert.ok(vals.includes('Tick '), 'static template chunk');
  assert.ok(vals.includes('inner') && vals.includes(' of '));
  assert.ok(vals.includes('after regex'), 'the string after a regex literal is found');
  assert.ok(!vals.some((v) => v.includes('this') || v.includes('nor this')), 'comments are skipped');
  assert.ok(vals.includes('yes') && vals.includes('no'));
  assert.equal(unescapeJs('a\\u{1F600}b\\x41\\n'), 'a\u{1F600}bA\n');
});
test('isUserFacingString keeps sentences and drops css, class lists, paths and code', () => {
  for (const ok of ['Loading the battlefield', 'Skip intro now', 'Jump to July 1, dawn']) assert.ok(isUserFacingString(ok), ok);
  for (const no of ['position:fixed;left:0', 'mapboxgl-popup mapboxgl-popup-tip', '/data/oob/file.json', 'https://example.org/a b', 'x', 'flex center-row item-2', 'rgba(200, 168, 74, 0.25)']) assert.ok(!isUserFacingString(no), no);
});
test('JS strings that hold markup are read as text (innerHTML templates)', () => {
  const src = '<script>el.innerHTML = \'<div class="x">Don&rsquo;t miss <b>real</b> time here</div>\';</script>';
  const f = run('a.html', src);
  assert.ok(f.some((x) => x.rule === 'REALTIME'));
  assert.ok(!f.some((x) => x.rule === 'QUOTES'), '&rsquo; inside a JS string is typographic');
});
test('bundle skip regions leave library strings out and say so when a marker is missing', () => {
  const lib = 'var Ok={exports:{}};(function(c,f){ var m = "Failed to initialize WebGL, tick undefined"; })(Ok);var R4=Ok.exports;';
  const app = 'var t = "Tick 538/675";';
  const cfg = { ...env, scan: { ...env.scan, jsSkipRegions: [{ glob: 'assets/index-*.js', from: 'var Ok={exports:{}};(function(c,f){', to: ')(Ok);var R4=Ok.exports;', note: 'mapbox' }] } };
  const r = lintSource('assets/index-abc.js', lib + app, cfg);
  assert.deepEqual(r.findings.map((f) => f.rule), ['TICK']);
  const miss = lintSource('assets/index-abc.js', app, cfg);
  assert.ok(miss.notes.length === 1 && /not found/.test(miss.notes[0]));
});

// ---- suppression
test('copy-lint-disable regions and data-lint-allow suppress named rules only', () => {
  assert.equal(run('a.html', '<!-- copy-lint-disable NAME --><p>Open Extra Features</p><!-- copy-lint-enable NAME --><p>Tick 5 of 9</p>').filter((f) => f.rule === 'NAME').length, 0);
  assert.equal(run('a.html', '<!-- copy-lint-disable NAME --><p>Open Extra Features and tick</p><!-- copy-lint-enable NAME -->').filter((f) => f.rule === 'TICK').length, 1);
  assert.equal(run('a.html', '<p data-lint-allow="NAME">The menu is called Extra Features in this release.</p>').length, 0);
  assert.equal(run('a.html', '<p data-lint-allow="NAME">The menu is called Extra Features and shows ticks.</p>').filter((f) => f.rule === 'TICK').length, 1);
  const s = 'x copy-lint-disable A,B y copy-lint-enable A';
  const d = parseDirectives(s);
  assert.equal(d.length, 2);
  assert.deepEqual(d.map((x) => x.rules).sort(), [['A'], ['B']]);
});

// ---- COUNT and facts
test('COUNT reads data-src/build/facts.json and falls back to legacy/dist/data when it is absent', () => {
  assert.equal(env.facts.units.regiments, 465);
  assert.ok(run('a.html', '<p>Follow 466 regiments here</p>').some((x) => x.rule === 'COUNT' && /465/.test(x.detail)));
  const fb = makeEnv({ root: REPO, factsPath: 'none' });
  assert.match(fb.factsSource, /fallback/);
  const r = lintSource('a.html', '<p>All 25 stories and 137 events and 30 places</p>', fb).findings.filter((x) => x.rule === 'COUNT');
  assert.equal(r.length, 1, 'only the wrong story count is flagged under the fallback: ' + JSON.stringify(r));
  assert.match(r[0].match, /25 stories/);
});

// ---- ratchet
const mkTree = (files) => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'copy-lint-')); for (const [k, v] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(d, k)), { recursive: true }); fs.writeFileSync(path.join(d, k), v); } return d; };
const quiet = () => { const out = []; return { out, log: (s) => out.push(s), err: (s) => out.push('ERR ' + s) }; };

test('ratchet: a baseline of today passes; a new violation fails; a fixed one is stale until tightened; expiry fails after its date', () => {
  const dir = mkTree({ 'a.html': '<p>Tick one -- two.</p><p>Fine text here.</p>' });
  const bl = path.join(mkTree({}), 'baseline.json');
  const base = ['--root', dir, '--baseline', bl, '--now', '2026-10-04'];
  let c = quiet();
  assert.equal(lintMain([dir, '--init-baseline', ...base], c), 0);
  const b = JSON.parse(fs.readFileSync(bl, 'utf8'));
  assert.equal(b.schema, 'gtbg/copy-baseline/1');
  assert.equal(b.rules.DASH.count, 1); assert.equal(b.rules.TICK.count, 1);
  assert.ok(Array.isArray(b.catalogue) && b.catalogue.length === RULES.length);
  c = quiet(); assert.equal(lintMain([dir, ...base], c), 0, c.out.join('\n'));
  // new violation
  fs.writeFileSync(path.join(dir, 'a.html'), '<p>Tick one -- two.</p><p>Fine text here.</p><p>Another tick appears.</p>');
  c = quiet(); assert.equal(lintMain([dir, ...base], c), 1); assert.ok(c.out.join('\n').includes('new violation'));
  // fix one: the old entry is stale
  fs.writeFileSync(path.join(dir, 'a.html'), '<p>Tick one and two.</p><p>Fine text here.</p>');
  c = quiet(); assert.equal(lintMain([dir, ...base], c), 1); assert.ok(c.out.join('\n').includes('no longer occur'));
  c = quiet(); assert.equal(lintMain([dir, '--tighten', ...base], c), 0);
  c = quiet(); assert.equal(lintMain([dir, ...base], c), 0, c.out.join('\n'));
  assert.ok(!JSON.parse(fs.readFileSync(bl, 'utf8')).rules.DASH);
  // expiry
  const exp = JSON.parse(fs.readFileSync(bl, 'utf8')).rules.TICK.expires;
  const day = (s, n) => new Date(Date.parse(s) + n * 864e5).toISOString().slice(0, 10);
  c = quiet(); assert.equal(lintMain([dir, '--root', dir, '--baseline', bl, '--now', exp], c), 0, 'still valid on the expiry day');
  c = quiet(); assert.equal(lintMain([dir, '--root', dir, '--baseline', bl, '--now', day(exp, 1)], c), 1); assert.ok(c.out.join('\n').includes('expired'));
  // renew is logged and bounded
  c = quiet(); assert.equal(lintMain([dir, '--renew', 'TICK', '--until', day(exp, 90), '--reason', 'data pack late', ...base], c), 0);
  const nb = JSON.parse(fs.readFileSync(bl, 'utf8')); assert.equal(nb.rules.TICK.expires, day(exp, 90)); assert.equal(nb.history.at(-1).action, 'renew');
  c = quiet(); assert.equal(lintMain([dir, '--renew', 'TICK', '--until', '2040-01-01', '--reason', 'x', ...base], c), 2);
  c = quiet(); assert.equal(lintMain([dir, '--renew', 'TICK', '--until', day(exp, 90), ...base], c), 2, 'a renewal needs a reason');
});
test('ratchet: guards against a vanished or lowered rule and a malformed baseline', () => {
  const findings = [];
  const mk = (rules, extra) => ({ schema: 'gtbg/copy-baseline/1', generated: '2026-10-04', target: { root: 'x' }, catalogue: [...RULES.map((r) => r.id), ...(extra || [])], rule_state: Object.fromEntries(RULES.map((r) => [r.id, { sev: r.sev }])), history: [], rules });
  let v = evaluateRatchet(findings, mk({}, ['GONE']), { now: '2026-10-04', ruleDefs: RULES });
  assert.ok(v.failures.some((f) => f.type === 'rule_vanished'));
  const b = mk({}); b.rule_state.DASH = { sev: 'E' };
  const lowered = RULES.map((r) => (r.id === 'DASH' ? { ...r, sev: 'W' } : r));
  v = evaluateRatchet(findings, b, { now: '2026-10-04', ruleDefs: lowered });
  assert.ok(v.failures.some((f) => f.type === 'rule_lowered'));
  const bad = mk({}); delete bad.catalogue; delete bad.rule_state;
  assert.ok(baselineShapeProblems(bad).length >= 2);
  v = evaluateRatchet(findings, bad, { now: '2026-10-04', ruleDefs: RULES });
  assert.ok(v.failures.some((f) => f.type === 'baseline_malformed'));
  const noExp = mk({ DASH: { sev: 'E', count: 0, files: {} } });
  assert.ok(baselineShapeProblems(noExp).some((m) => /expires/.test(m)));
});
test('ratchet: warnings (W) fail only with --strict; duplicate findings are counted as a multiset', () => {
  const dir = mkTree({ 'a.html': "<p>Culp's Hill and Barlow's Knoll</p>" });
  let c = quiet(); assert.equal(lintMain([dir, '--no-baseline', '--rules', 'QUOTES'], c), 0, 'W only: pass');
  c = quiet(); assert.equal(lintMain([dir, '--no-baseline', '--rules', 'QUOTES', '--strict'], c), 1);
  const fs1 = lintTree(dir, { env }).findings;
  const g = groupFindings([...fs1, ...fs1]);
  assert.equal(Object.values(g.QUOTES['a.html']).flat().length, 4);
  assert.ok(g.QUOTES['a.html'].some((k) => k.endsWith('.2')));
});
test('CLI: usage errors exit 2; an unknown rule, a missing path and a baseline for another target are refused', () => {
  let c = quiet(); assert.equal(lintMain(['--rules', 'NOPE', '--no-baseline'], c), 2);
  c = quiet(); assert.equal(lintMain(['no/such/dir', '--no-baseline'], c), 2);
  c = quiet(); assert.equal(lintMain(['--now', 'tomorrow'], c), 2);
  const dir = mkTree({ 'a.html': '<p>fine words here</p>' });
  c = quiet(); assert.equal(lintMain([dir], c), 2, 'the committed baseline is for baseline/dist, not for this tree');
  assert.ok(c.out.join('\n').includes('baseline/dist'));
});

// ---- the committed baseline against the locked production tree
test('baseline/dist passes against tools/copy/baseline.json (COUNT is judged by its own test: facts.json moves with the data work)', { skip: !fs.existsSync(path.join(REPO, 'baseline', 'dist', 'index.html')) }, () => {
  const rules = RULES.map((r) => r.id).filter((id) => id !== 'COUNT').join(',');
  const c = quiet();
  assert.equal(lintMain(['baseline/dist', '--now', '2026-10-04', '--rules', rules], c), 0, c.out.join('\n'));
});
test('the committed baseline is well formed, has real expiries and was not born expired', () => {
  const b = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'copy', 'baseline.json'), 'utf8'));
  assert.deepEqual(baselineShapeProblems(b), []);
  assert.equal(b.target.root, 'baseline/dist');
  for (const [id, e] of Object.entries(b.rules)) { assert.ok(e.expires > b.generated, id); assert.equal(e.count, Object.values(e.files).reduce((a, v) => a + v.length, 0), id); }
  assert.deepEqual([...b.catalogue].sort(), RULES.map((r) => r.id).sort());
});
test('the date gate works on the real baseline: once an entry expires the run fails', { skip: !fs.existsSync(path.join(REPO, 'baseline', 'dist', 'index.html')) }, () => {
  const c = quiet();
  assert.equal(lintMain(['baseline/dist', '--now', '2028-01-01', '--rules', 'TICK'], c), 1);
  assert.ok(c.out.join('\n').includes('expired'));
});
test('tightenBaseline never adds entries', () => {
  const dir = mkTree({ 'a.html': '<p>Tick here -- now.</p>' });
  const f1 = lintTree(dir, { env }).findings;
  const b = buildBaseline(f1, { generated: '2026-10-04', target: { root: 'x', files: 1 }, ruleDefs: RULES, expiries: EXPIRIES });
  fs.writeFileSync(path.join(dir, 'a.html'), '<p>Tick here -- now and tick again.</p>');
  const f2 = lintTree(dir, { env }).findings;
  const { baseline: nb, removed } = tightenBaseline(f2, b, { ruleDefs: RULES });
  assert.equal(removed, 0);
  assert.equal(nb.rules.TICK.count, b.rules.TICK.count);
});

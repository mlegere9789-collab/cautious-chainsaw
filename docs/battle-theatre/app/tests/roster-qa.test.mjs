// Node tests of the independent sample of the stored roster lines (work item roster-qa): rosters/data2/qa, the pointer file, the closure texts and CLOSED.json.
//   node --test docs/battle-theatre/app/tests/roster-qa.test.mjs
// No browser, no network, no source text and no page image: the verdicts of the sample reader are plain JSON, and what is checked here is that they are consistent with
// themselves, with the draw, with the statistics and decisions computed from them (the ladder of rosters/PLAN.md 4.4, never lowered), with the second sitting's addenda,
// with the pointer file (bytes and sha256 equal the manifest where the manifest is on disk; the public-domain basis only where the year allows it) and with the closure texts.
// It does not re-read a page: that is the sample reader's work and is not repeated by a test.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROSTERS = path.resolve(HERE, '..', '..', 'rosters');
const QA = path.join(ROSTERS, 'data2', 'qa'), PAGES = path.join(QA, 'pages');
const GOV = path.resolve(ROSTERS, '..', 'GOVERNANCE'), WS = path.join(GOV, 'horde', 'ws-rosters');
const ROOT = path.resolve(ROSTERS, '..', '..', '..');
const jl = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

const KINDS = new Set(['name-char', 'name-cut', 'name-nonperson', 'rank', 'company', 'rem-char', 'rem-date', 'rem-missing', 'rem-extra', 'rem-bound', 'rem-order', 'rem-ditto', 'merge', 'split']);
const G1 = ['name-char', 'name-cut', 'name-nonperson'], G2 = ['rem-date'], G3A = ['rank', 'company', 'merge', 'split'], G3B = ['rem-char', 'rem-missing', 'rem-extra', 'rem-bound', 'rem-order', 'rem-ditto'];
const LADDER = [[299, 0], [473, 1], [628, 2], [773, 3]];
const GATES = ['R-G1', 'R-G2', 'R-G3a', 'R-G3b'];

// one-sided 95 percent Clopper-Pearson upper bound by bisection on the binomial CDF (log factorials, n up to a few thousand)
function cpUpper(k, n, conf = 0.95) {
  if (n <= 0) return null; if (k >= n) return 1;
  const lf = [0]; for (let i = 1; i <= n; i++) lf[i] = lf[i - 1] + Math.log(i);
  const cdf = (p) => { let s = 0; for (let i = 0; i <= k; i++) s += Math.exp(lf[n] - lf[i] - lf[n - i] + i * Math.log(p) + (n - i) * Math.log(1 - p)); return s; };
  let lo = k / n, hi = 1; for (let it = 0; it < 200; it++) { const mid = (lo + hi) / 2; if (cdf(mid) > 1 - conf) lo = mid; else hi = mid; } return (lo + hi) / 2;
}
function decide(n, k) { if (n === 0) return 'NOT LOOKED AT'; for (const [nn, kk] of LADDER) if (n >= nn && k <= kk) return 'PASS'; return k >= 4 ? 'FAIL' : 'OPEN'; }

// the merge of qa_lib.merge_addendum: the first verdict plus the second sitting's addendum
function merge(v, a) {
  const m = JSON.parse(JSON.stringify(v));
  if (!a) return m;
  m.levels = [...'NDR'].filter((c) => m.levels.includes(c) || (a.levels_added || '').includes(c)).join('');
  const by = new Map(m.errors.map((e) => [e.i, e]));
  for (const e of a.errors_added || []) {
    if (by.has(e.i)) { const old = by.get(e.i); for (const k of e.kinds) if (!old.kinds.includes(k)) old.kinds.push(k); old.gates = [...new Set([...(old.gates || []), ...(e.gates || [])])]; } else { m.errors.push(JSON.parse(JSON.stringify(e))); by.set(e.i, m.errors[m.errors.length - 1]); }
  }
  m.errors.sort((x, y) => x.i - y.i); const rows = new Set(m.errors.map((e) => e.i)), unv = new Set(m.unverifiable.map((u) => u.i));
  m.rows_in_error = rows.size; m.rows_ok = m.rows_checked - [...rows].filter((i) => !unv.has(i)).length;
  m.missed_lines = [...m.missed_lines, ...(a.missed_lines_added || [])];
  return m;
}
const verdictFiles = fs.readdirSync(PAGES).filter((f) => f.endsWith('.verdict.json')).sort();
const first = verdictFiles.map((f) => jl(path.join(PAGES, f)));
const addenda = new Map(fs.readdirSync(PAGES).filter((f) => f.endsWith('.addendum.json')).map((f) => { const a = jl(path.join(PAGES, f)); return [a.page, a]; }));
const verdicts = first.map((v) => merge(v, addenda.get(v.page)));
const frame = jl(path.join(QA, 'frame.json')), draw = jl(path.join(QA, 'draw.json')), stats = jl(path.join(QA, 'stats.json'));
const framePages = new Map(frame.pages.map((p) => [p.id, p]));

test('the ladder of PLAN.md 4.4 gives an upper bound of 1.0 percent at each rung and more one row short of it', () => {
  for (const [n, k] of LADDER) { assert.ok(cpUpper(k, n) <= 0.010003, `rung ${n}/${k}`); assert.ok(cpUpper(k, n - 1) > 0.01, `one row short of ${n}/${k}`); }
  assert.equal(decide(299, 0), 'PASS'); assert.equal(decide(298, 0), 'OPEN'); assert.equal(decide(773, 3), 'PASS'); assert.equal(decide(100, 4), 'FAIL'); assert.equal(decide(0, 0), 'NOT LOOKED AT');
});

test('every verdict is for a page of the frame and of the draw order of its stratum, at the position it states', () => {
  assert.ok(verdicts.length >= 34);
  assert.equal(new Set(verdicts.map((v) => v.page)).size, verdicts.length, 'one verdict per page');
  for (const v of verdicts) {
    const p = framePages.get(v.page); assert.ok(p, 'frame page ' + v.page); assert.equal(p.stratum, v.stratum);
    const order = draw.strata[v.stratum].order; assert.equal(order.indexOf(v.page) + 1, v.draw_position, 'draw position of ' + v.page);
    assert.equal(v.in_lowest_decile, draw.strata[v.stratum].decile.includes(v.page));
  }
});

test('in every stratum the pages looked at are a prefix of the draw order', () => {
  const by = new Map(); for (const v of verdicts) by.set(v.stratum, [...(by.get(v.stratum) || []), v.draw_position]);
  for (const [s, pos] of by) { pos.sort((a, b) => a - b); assert.deepEqual(pos, pos.map((_, i) => i + 1), 'positions looked at in ' + s); }
  // every prefix of m pages holds at least m/3 pages of the lowest decile (PLAN.md 4.4), checked on the draw order itself
  for (const [s, d] of Object.entries(draw.strata)) { const dec = new Set(d.decile); d.order.slice(0, 12).forEach((_, i) => { const m = i + 1, c = d.order.slice(0, m).filter((x) => dec.has(x)).length; if (dec.size >= Math.ceil(m / 3)) assert.ok(c >= Math.ceil(m / 3), `${s}: prefix ${m} holds ${c} decile pages`); }); }
});

test('a verdict lists the lines it compared and its errors point at them with known kinds and the gates that follow', () => {
  for (const v of verdicts) {
    assert.equal(v.rows_listed.length, v.rows_stored, v.page); assert.ok(v.rows_checked <= v.rows_stored); assert.ok(/^N?D?R?$/.test(v.levels) && v.levels.includes('N'), 'levels ' + v.levels);
    const seen = new Set();
    for (const e of v.errors) {
      assert.ok(Number.isInteger(e.i) && e.i >= 0 && e.i < v.rows_stored, `row ${e.i} of ${v.page}`); seen.add(e.i);      // a row can have two entries (one E line per kind): the rows are counted once
      assert.ok(e.kinds.length > 0 && e.kinds.every((k) => KINDS.has(k)), 'kinds ' + e.kinds);
      const gates = new Set(e.kinds.map((k) => (G1.includes(k) ? 'R-G1' : G2.includes(k) ? 'R-G2' : 'R-G3'))); assert.deepEqual(new Set(e.gates), gates, `gates of row ${e.i} of ${v.page}`);
      assert.equal(e.rid, v.rows_listed[e.i].rid, 'the error names the listed row');
    }
    assert.equal(v.rows_in_error, seen.size, 'rows in error of ' + v.page); assert.equal(v.rows_ok, v.rows_checked - [...seen].filter((i) => !v.unverifiable.some((u) => u.i === i)).length);
    if (!v.levels.includes('D')) assert.ok(v.errors.every((e) => !e.kinds.includes('rem-date')), 'no date error on a page whose dates were not compared: ' + v.page);
    if (!v.levels.includes('R')) assert.ok(v.errors.every((e) => !e.kinds.some((k) => G3B.includes(k))), 'no remark error on a page whose remarks were not compared: ' + v.page);
  }
});

test('stats.json equals the counts recomputed from the verdicts and the addenda, and every decision follows the ladder', () => {
  assert.equal(stats.pages_looked_at, verdicts.length); assert.equal(stats.rows_looked_at, verdicts.reduce((a, v) => a + v.rows_checked, 0));
  for (const [s, d] of Object.entries(stats.strata)) {
    const pv = verdicts.filter((v) => v.stratum === s); assert.equal(d.pages_looked_at, pv.length, s);
    const cnt = Object.fromEntries(GATES.map((g) => [g, [0, 0]]));
    for (const v of pv) {
      const rows = (kinds) => new Set(v.errors.filter((e) => e.kinds.some((k) => kinds.includes(k))).map((e) => e.i)).size;
      cnt['R-G1'][0] += v.rows_checked; cnt['R-G1'][1] += rows(G1); cnt['R-G3a'][0] += v.rows_checked; cnt['R-G3a'][1] += rows(G3A);
      if (v.levels.includes('D')) { cnt['R-G2'][0] += v.rows_checked; cnt['R-G2'][1] += rows(G2); }
      if (v.levels.includes('R')) { cnt['R-G3b'][0] += v.rows_checked; cnt['R-G3b'][1] += rows(G3B); }
    }
    for (const g of GATES) {
      const x = d.gates[g]; assert.equal(x.rows, cnt[g][0], `${s} ${g} rows`); assert.equal(x.errors, cnt[g][1], `${s} ${g} errors`);
      assert.notEqual(pv.length, d.pages_in_stratum, 'no stratum is a census'); assert.equal(x.decision, decide(cnt[g][0], cnt[g][1]), `${s} ${g} decision`);
      if (x.decision === 'PASS') assert.ok(LADDER.some(([nn, kk]) => x.rows >= nn && x.errors <= kk), `${s} ${g}: a pass needs a rung of the ladder`);
      if (x.rows) assert.ok(Math.abs(x.upper95_percent - 100 * cpUpper(x.errors, x.rows)) < 0.011, `${s} ${g} upper bound`);
    }
  }
});

test('the addenda of the second sitting confirm rows of the first verdict, add errors only at levels they add, and never rewrite a first verdict', () => {
  assert.ok(addenda.size >= 1);
  for (const [pg, a] of addenda) {
    const v = first.find((x) => x.page === pg); assert.ok(v, 'first verdict of ' + pg); const firstErr = new Set(v.errors.map((e) => e.i));
    assert.ok(a.confirmed_rows.every((i) => firstErr.has(i)), 'confirmed rows are errors of the first verdict'); assert.ok(a.not_confirmed_rows.every((i) => firstErr.has(i)));
    assert.equal(new Set([...a.confirmed_rows, ...a.not_confirmed_rows]).size, firstErr.size, 'every error row of the first verdict is confirmed or not confirmed: ' + pg);
    assert.ok(/^D?R?$/.test(a.levels_added) && [...a.levels_added].every((c) => !v.levels.includes(c)), 'levels added are levels the first verdict lacks');
    for (const e of a.errors_added) {
      assert.ok(e.i >= 0 && e.i < v.rows_stored); assert.equal(e.rid, v.rows_listed[e.i].rid);
      if (e.kinds.includes('rem-date')) assert.ok(a.levels_added.includes('D') || v.levels.includes('D'), 'a date error needs the level D'); if (e.kinds.some((k) => G3B.includes(k))) assert.ok(a.levels_added.includes('R') || v.levels.includes('R'));
    }
    assert.ok(a.sitting_utc >= v.verdict_utc.slice(0, 10), 'the second sitting is not before the first'); assert.ok(a.read.pdf_sha256 === v.read.pdf_sha256, 'the same PDF');
  }
});

test('the verdicts describe the stored lines as they are now (qa_current.py), and no unit file was changed by the sample', () => {
  const c = jl(path.join(QA, 'verdicts-vs-files.json'));
  assert.equal(c.summary.pages, verdictFiles.length); assert.equal(c.summary.identical, c.summary.pages); assert.equal(c.summary.different, 0); assert.equal(c.summary.files_missing_now, 0);
  assert.equal(c.summary.lines_in_verdicts, verdicts.reduce((a, v) => a + v.rows_stored, 0));
});

test('the pointer file lists identifier, title, year, url, bytes and sha256 of every source, agrees with the manifest, and gives the public-domain basis only where the year allows it', () => {
  const p = jl(path.join(ROSTERS, 'sources', 'roster-qa.json')); assert.equal(p.format, 'roster2-sources-pointer/1'); assert.equal(p.work_item, 'roster-qa'); assert.equal(p.sources.length, 8);
  const mpath = path.join(ROOT, 'tmp', 'library', 'rosters', 'MANIFEST-roster-qa.json'); const man = fs.existsSync(mpath) ? jl(mpath) : null;
  for (const s of p.sources) {
    for (const k of ['identifier', 'title', 'year', 'url', 'bytes', 'sha256']) assert.ok(s[k], `${s.identifier} lacks ${k}`);
    assert.match(s.sha256, /^[0-9a-f]{64}$/); assert.ok(s.url.startsWith('https://archive.org/cors/'), 'only the cors endpoint');
    const pd = s.rights.basis === 'public domain (United States publication before 1929)';
    if (s.year >= 1929) assert.ok(!pd, `${s.identifier} (${s.year}) must not carry the pre-1929 basis`); else assert.ok(pd, `${s.identifier} (${s.year}) is pre-1929`);
    if (man) for (const f of s.files) { const m = man.files.find((x) => x.identifier === s.identifier && x.role === f.role); assert.ok(m, 'manifest entry'); assert.equal(m.sha256, f.sha256); assert.equal(m.bytes, f.bytes); }
  }
  assert.deepEqual(p.blocked, []);
});

test('the lines recovered by a second reading carry their own locator and are never rows of a unit file', () => {
  const led = jl(path.join(QA, 'pageread-ledger.json'));
  for (const item of ['union-vt', 'union-me']) {
    const d = jl(path.join(QA, 'recovered', item + '.json')); assert.equal(d.f, 'roster-qa-recovered/1');
    for (const r of d.rows.filter((x) => (x.status || '').startsWith('recovered'))) {
      assert.ok(r.text_id.startsWith('QA-PAGEREAD.') && led.texts[r.text_id], 'derived text ' + r.text_id); assert.ok(Number.isInteger(r.off) && r.off >= 0); assert.ok(r.name.length > 0);
      assert.equal(r.checks.V1_name_tokens_at_offset, true); assert.equal(r.checks.V2_remark_tokens_follow, true);
    }
  }
  const chk = jl(path.join(QA, 'recovered', 'second-sitting-check.json')); assert.equal(chk.summary.lines, chk.rows.length); assert.equal(chk.summary.agree, chk.rows.filter((r) => r.agrees).length);
  const nrec = ['union-vt', 'union-me'].reduce((a, it) => a + jl(path.join(QA, 'recovered', it + '.json')).rows.filter((x) => (x.status || '').startsWith('recovered')).length, 0); assert.equal(chk.summary.lines, nrec, 'every recovered line was checked by the second sitting');
  const bad = []; const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (f.name.endsWith('.gz')) bad.push(p); } }; walk(QA);
  assert.deepEqual(bad, [], 'no .gz under data2/qa (verify_unit.py --all globs every .jsonl.gz under data2)');
  const idx = fs.readFileSync(path.join(ROSTERS, 'data2', 'INDEX.json'), 'utf8'); assert.ok(!/data2\/qa|"qa\//.test(idx) && !idx.includes('pageread'), 'the roster index does not load the work area');
});

test('the closure texts exist: gap lines, proposed register entries, decisions, request note', () => {
  const gaps = fs.readFileSync(path.join(ROSTERS, 'GAPS.md'), 'utf8'); for (let i = 1; i <= 6; i++) assert.ok(gaps.includes(`| G-QA0${i} |`), 'G-QA0' + i);
  for (let i = 1; i <= 5; i++) { const f = path.join(WS, 'proposed-register', `roster-qa-EG-ROS-QA-0${i}.md`); assert.ok(fs.existsSync(f), f); assert.ok(fs.readFileSync(f, 'utf8').includes(`| ID | EG-ROS-QA-0${i} |`)); }
  const dd = fs.readFileSync(path.join(GOV, 'decisions', 'DELEGATED-DECISIONS-2026-11-11.md'), 'utf8'); for (let i = 1; i <= 5; i++) assert.ok(dd.includes(`| DD-ROS-QA-0${i} |`), 'DD-ROS-QA-0' + i);
  assert.ok(fs.existsSync(path.join(GOV, 'horde', 'requests', 'bt-rosters-roster-qa-work-files.md')));
});

test('CLOSED.json has the form of open_groups.py and covers the four items that were sampled', () => {
  const c = jl(path.join(WS, 'roster-qa', 'CLOSED.json'));
  assert.equal(c.f, 'roster2-closed/1'); assert.equal(c.work_item, 'roster-qa'); assert.equal(c.round, 1); assert.deepEqual([...c.covers].sort(), ['union-ma', 'union-me', 'union-nh', 'union-vt']);
  assert.deepEqual(c.units_without_file, []); assert.equal(c.verify.v1_defects, 0); assert.equal(c.verify.v3_defects, 0); assert.ok(c.verify.files >= 54);
});

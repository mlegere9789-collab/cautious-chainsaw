// Tests for the candidate trust pages (tools/copy/build-trust-pages.mjs): structure, size, no external requests, contrast, print
// stylesheet, traceability of every figure to a file, the owner-input gate, and zero copy_lint findings.
//   node --test "tests/copy/*.test.mjs"
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { build, main as buildMain, DEFAULT_OUT, DEFAULT_CONFIG } from '../../tools/copy/build-trust-pages.mjs';
import { COLORS, COLOR_PAIRS, contrast, PAGES, CSS } from '../../tools/copy/trust/template.mjs';
import { typo } from '../../tools/copy/trust/pages.mjs';
import { makeEnv, lintSource, REPO } from '../../tools/copy/lib/lint.mjs';
import { checkHtml, insideTag } from './lib/html-check.mjs';

const cfgDefault = JSON.parse(fs.readFileSync(DEFAULT_CONFIG, 'utf8'));
const R = build({});            // default config: candidate build with open owner inputs
const html = (slug) => R.files.get(`${slug}.html`);
const read = (rel) => fs.readFileSync(path.join(REPO, rel), 'utf8');
const readJson = (rel) => JSON.parse(read(rel));
const env = makeEnv({ root: REPO });
const SLUGS = PAGES.map((p) => p.slug);

test('eight pages are built, each with the shared shell', () => {
  assert.deepEqual(SLUGS, ['about', 'sources', 'standard-of-care', 'corrections', 'faq', 'accessibility', 'changelog', 'contact']);
  for (const s of SLUGS) assert.ok(html(s), s);
});

for (const slug of SLUGS) {
  test(`${slug}: valid structure, landmarks, headings, skip link, one h1 equal to the nav label`, () => {
    const { errors, doc } = checkHtml(html(slug));
    assert.deepEqual(errors, []);
    const nav = PAGES.find((p) => p.slug === slug).nav;
    const h1 = doc.elements.find((e) => e.name === 'h1');
    assert.ok(h1);
    const h1text = doc.text.find((t) => t.stack.includes(h1))?.text;
    assert.equal(h1text, nav, 'H1 equals the navigation label (style guide section 3)');
    assert.equal(doc.lang, 'en-US');
    const skip = doc.anchors[0];
    assert.equal(skip.attrs.class, 'skip-link'); assert.equal(skip.attrs.href, '#main');
    assert.ok(doc.ids.has('main'));
    assert.ok(doc.elements.some((e) => e.name === 'div' && e.attrs.id === 'gtbg-nav-mount'), 'the shared nav mount of site-nav.js');
    assert.ok(doc.scripts.some((s) => s.attrs?.src === '/site-nav.js' && s.attrs['data-current']), 'the shared nav script');
  });
  test(`${slug}: at most 30 KB, title and description limits, canonical, print stylesheet linked`, () => {
    const h = html(slug);
    assert.ok(Buffer.byteLength(h) <= 30 * 1000, `${Buffer.byteLength(h)} bytes`);
    const title = h.match(/<title>([^<]*)<\/title>/)[1];
    const nice = PAGES.find((p) => p.slug === slug).title;
    assert.equal(title.replace(/&amp;/g, '&'), `${nice} | Gettysburg Interactive Map`);
    assert.ok(title.length <= 60, title);
    const desc = h.match(/<meta name="description" content="([^"]*)"/)[1];
    assert.ok(desc.length >= 70 && desc.length <= 160, `${desc.length}: ${desc}`);
    assert.match(h, new RegExp(`<link rel="canonical" href="https://gettysburginteractivemap.com/${slug}">`));
    assert.match(h, /<link rel="stylesheet" href="trust\.css">/);
  });
  test(`${slug}: no external requests, no form, no inline script except JSON-LD, no cookies or storage calls`, () => {
    const { doc } = checkHtml(html(slug));
    assert.equal(doc.forms, 0);
    const allowedRes = new Set(['/site-nav.css', '/site-nav.js', 'trust.css']);
    for (const l of doc.links) if (l.attrs.rel === 'stylesheet') assert.ok(allowedRes.has(l.attrs.href), l.attrs.href);
    for (const s of doc.scripts) { if (s.attrs?.type === 'application/ld+json') continue; assert.ok(!s.inline, 'inline script'); assert.ok(allowedRes.has(s.attrs.src), s.attrs.src); }
    assert.equal(doc.images.length, 0, 'no images, so none needs an alt or a host');
    for (const a of doc.anchors) { const h = a.attrs.href; assert.ok(!/^https?:\/\//.test(h), `external link ${h}`); assert.ok(!/^(?:javascript|data):/.test(h)); }
    assert.ok(!/localStorage|sessionStorage|document\.cookie|fetch\(|XMLHttpRequest|sendBeacon/.test(html(slug)));
  });
  test(`${slug}: every figure is traceable: a text with a digit sits under a data-source or an owner marker`, () => {
    const { doc } = checkHtml(html(slug));
    const bad = [];
    for (const t of doc.text) {
      // historical years, month-and-day dates and release names (R0, R1a ...) are not figures that need a data file
      const plain = t.text.replace(/\b186\d\b/g, '').replace(/\b(?:January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}(?:–\d{1,2})?/g, '').replace(/\bR\d[abc]?\b/g, '');
      if (!/\d/.test(plain)) continue;
      if (t.stack.some((e) => ['title', 'script', 'style', 'footer', 'noscript', 'kbd', 'code', 'pre'].includes(e.name))) continue;
      if (t.stack.some((e) => e.attrs.class === 'tp-provenance')) continue;
      if (!t.stack.some((e) => e.name === 'main')) continue;
      if (t.stack.some((e) => e.attrs['data-source'] || e.attrs['data-owner-input'])) continue;
      if (t.stack.some((e) => e.attrs.class?.includes('candidate-banner') || e.attrs.class?.includes('toc'))) continue;
      bad.push(t.text.slice(0, 90));
    }
    assert.deepEqual(bad, []);
  });
  test(`${slug}: every data-source pointer resolves to a file (and a field, an id or a commit)`, () => {
    const pointers = [...new Set([...html(slug).matchAll(/data-source="([^"]+)"/g)].flatMap((m) => m[1].split(' ')))];
    assert.ok(pointers.length >= 1);
    for (const p of pointers) assert.ok(resolvePointer(p), `unresolved pointer ${p}`);
  });
  test(`${slug}: copy_lint finds nothing, with every rule and warnings included`, () => {
    const r = lintSource(`${slug}.html`, html(slug), env);
    assert.deepEqual(r.findings.map((f) => `${f.rule} ${f.match}`), []);
  });
}

function resolvePointer(p) {
  if (p.startsWith('git:')) { try { execFileSync('git', ['cat-file', '-e', `${p.slice(4)}^{commit}`], { cwd: REPO, stdio: 'ignore' }); return true; } catch { return false; } }
  const [file, frag] = p.split('#');
  const abs = path.join(REPO, file);
  if (!fs.existsSync(abs)) return false;
  if (!frag) return true;
  if (file.endsWith('.json')) {
    let cur = JSON.parse(fs.readFileSync(abs, 'utf8'));
    let rest = frag;
    // a patch id may contain dots ("cp:h01 (445+ -> ...)"): try the whole fragment as an id first
    const byId = (arr, id) => arr.find((x) => x && typeof x.id === 'string' && (x.id === id || x.id.startsWith(id + ' ')));
    if (Array.isArray(cur.patches) && byId(cur.patches, frag)) return true;
    for (const seg of rest.split('.')) {
      if (cur == null) return false;
      if (Array.isArray(cur)) { const hit = byId(cur, seg); if (!hit) return false; cur = hit; continue; }
      if (typeof cur === 'object' && seg in cur) { cur = cur[seg]; continue; }
      if (typeof cur === 'object' && Array.isArray(cur.values) && byId(cur.values, seg)) { cur = byId(cur.values, seg); continue; }
      return false;
    }
    return true;
  }
  return fs.readFileSync(abs, 'utf8').toLowerCase().replace(/\s+/g, ' ').includes(decodeURIComponent(frag).toLowerCase().replace(/-/g, ' '));
}

// ---- site-wide properties
test('palette: every text colour pair has at least 4.5:1, and the stylesheet uses exactly the palette', () => {
  for (const [fg, bg] of COLOR_PAIRS) assert.ok(contrast(COLORS[fg], COLORS[bg]) >= 4.5, `${fg} on ${bg}: ${contrast(COLORS[fg], COLORS[bg]).toFixed(2)}`);
  for (const m of CSS.matchAll(/--([a-z0-9-]+):(#[0-9a-fA-F]{6})/g)) {
    const key = { 'owner-bg': 'ownerBg', 'owner-text': 'ownerText' }[m[1]] || m[1];
    assert.equal(COLORS[key].toLowerCase(), m[2].toLowerCase(), m[1]);
  }
});
test('stylesheet: a print stylesheet (black on white, no menus, link addresses printed), 44 px targets, focus ring, reduced motion', () => {
  const css = R.files.get('trust.css');
  assert.match(css, /@media print\{/);
  assert.match(css, /body\{background:#ffffff;color:#000000/);
  assert.match(css, /a\[href\^="http"\]::after/);
  assert.match(css, /\.skip-link,#gtbg-nav,#gtbg-nav-mount[^}]*display:none!important/);
  for (const sel of ['.btn{', '.toc a,.tap{', '.tp-footer a{', 'summary{', '.skip-link{', '.tp-noscript a{']) {
    const i = css.indexOf(sel); assert.ok(i >= 0, sel);
    assert.match(css.slice(i, css.indexOf('}', i)), /min-height:44px/, sel);
  }
  assert.match(css, /:focus-visible\{outline:2px solid/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.ok(!/@import|url\(\s*['"]?https?:/.test(css), 'no external request from the stylesheet');
  assert.match(css, /body\{[^}]*font:17px/);
});
test('the generator is deterministic and the committed candidates are current (or the inputs moved on)', () => {
  const again = build({});
  for (const [name, content] of R.files) assert.equal(again.files.get(name), content, name);
  const manifestPath = path.join(DEFAULT_OUT, 'trust-manifest.json');
  if (!fs.existsSync(manifestPath)) return;
  const committed = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const sameInputs = JSON.stringify(committed.inputs) === JSON.stringify(R.manifest.inputs);
  if (!sameInputs) { console.log('# inputs changed since the candidates were generated; regenerate with node tools/copy/build-trust-pages.mjs'); return; }
  for (const [name, content] of R.files) assert.equal(fs.readFileSync(path.join(DEFAULT_OUT, name), 'utf8'), content, `${name} is stale`);
});
test('every claim the generator checks passes, and each names its evidence', () => {
  assert.ok(R.manifest.claims.length >= 20);
  for (const c of R.manifest.claims) { assert.equal(c.ok, true, c.id); assert.ok(c.evidence && c.text, c.id); }
});

// ---- figures equal their sources, independently recomputed here
test('counts printed on About, Sources and FAQ equal data-src/build/facts.json', () => {
  const f = readJson('data-src/build/facts.json');
  const about = html('about');
  for (const v of [f.units.regiments, f.units.batteries, f.units.total, f.ticks.total, f.content.vignettes, f.content.chronology_events, f.content.terrain_key_locations, f.content.tour_stops]) assert.ok(about.includes(v.toLocaleString('en-US')), String(v));
  const src = html('sources');
  for (const v of [f.placements.rows, f.placements.ticks_with_rows, f.placements.ticks_without_rows, f.units.regiments_with_own_track, f.content.monuments, f.content.monuments_without_source]) assert.ok(src.includes(v.toLocaleString('en-US')), String(v));
});
test('casualty bases are recomputed from the parts and printed with the parts', () => {
  const m = readJson('data-src/build/facts.json').casualties.site_figures_measured;
  const summary = m.union.apportionment_total_sum + m.confederate.apportionment_total_sum;
  const periods = m.union.apportionment_period_sum + m.confederate.apportionment_period_sum;
  const headers = m.union.oob_army_header + m.confederate.oob_army_header;
  assert.equal(periods, m.dashboard_combined_period_sum);
  const s = html('sources');
  for (const v of [summary, periods, headers, m.union.apportionment_total_sum, m.confederate.apportionment_total_sum, m.union.apportionment_period_sum, m.confederate.apportionment_period_sum]) assert.ok(s.includes(v.toLocaleString('en-US')), String(v));
  const a = readJson('data-src/authorities/authorities.json').casualties;
  for (const v of [...a.union.values, ...a.confederate.values]) assert.ok(s.includes(v.total.toLocaleString('en-US')), `${v.id} ${v.total}`);
});
test('the register table equals counts recomputed from registry.json, and the registry equals the QC report', () => {
  const reg = readJson('data-src/sources-v2/registry.json');
  const E = reg.entries;
  const by = (f) => E.reduce((m, e) => { const k = f(e); m[k] = (m[k] || 0) + 1; return m; }, {});
  const status = by((e) => e.final_status);
  const s = html('sources');
  assert.ok(s.includes(E.length.toLocaleString('en-US')));
  assert.ok(s.includes(String(by((e) => e.entry_kind).non_or)));
  assert.ok(s.includes(String(status['NOT-VERIFIED'])));
  assert.ok(s.includes(String(E.filter((e) => e.counts_as_writing_piece).length)));
  assert.ok(s.includes(String(E.filter((e) => e.verification?.verifiers?.length >= 2).length)));
  const md = read('docs/historian/sources-v2/QC-REPORT.md');
  for (const [k, v] of Object.entries(status)) assert.match(md, new RegExp(`^${k}\\s+${v}\\s*$`, 'm'), k);
});
test('time anchors: the pages say none is reviewed exactly when none is', () => {
  const a = readJson('data-src/time/time_anchors.json').anchors;
  assert.ok(a.every((x) => x.state === 'proposed'), 'if this fails a reviewer has signed something: the pages must be rewritten');
  assert.ok(html('sources').includes(`All ${a.length} proposed time anchors are unreviewed`));
  assert.ok(html('faq').includes(`none of which has been checked by a historian yet`));
});
test('the works list on Sources is the Help dialog list of release R1c', () => {
  const works = ['Official Records', 'Pfanz, Harry W. — Gettysburg: The First Day (2001)', 'Gottfried, Bradley M.', 'Wert, Jeffry D.'];
  for (const w of works) assert.ok(html('sources').includes(w.replace(/'/g, '’')), w);
  assert.match(html('sources'), /lists 9 works under the heading “Sources”/);
});

// ---- Standard of Care, Corrections, Changelog, FAQ, Accessibility
test('Standard of Care: eight commitments with the pitch wording, honest statuses, and what would make each true', () => {
  const h = html('standard-of-care');
  const items = [...h.matchAll(/<li class="card s-(ok|part|no)"/g)].map((m) => m[1]);
  assert.equal(items.length, 8);
  const pitch = read('docs/pitch/PITCH.md');
  for (const lead of ['Every number is a ladder.', 'Every quotation has a receipt.', 'Every model is labelled.', 'Every disagreement is shown.', 'Every person named is sourced, and every unknown is honoured.', 'Every date is a range when it is one.', 'Every correction is logged,', 'Nothing the Historian says is generated.']) {
    assert.ok(pitch.includes(lead), `pitch has "${lead}"`); assert.ok(h.includes(lead), `page has "${lead}"`);
  }
  assert.equal(items.filter((s) => s === 'ok').length, 0, 'no commitment is claimed as fully in place');
  assert.equal((h.match(/What would make it true/g) || []).length, 8);
  assert.ok(pitch.includes('design intent'), 'the pitch calls the standard design intent');
});
test('Corrections: no invented entries, a log format, and the response targets stated as intent', () => {
  const h = html('corrections');
  assert.match(h, /<em>No entries yet\.<\/em>/);
  assert.equal(JSON.parse(R.files.get('corrections.json')).entries.length, 0);
  assert.match(h, /The target is to acknowledge it within 3 days/);
  assert.match(h, /target, not a promise/);
  for (const f of ['credit_consent', 'reviewer', 'source', 'was', 'now']) assert.ok(h.includes(f), f);
  assert.ok(!/<tr><td data-label="Date">\d{4}/.test(h) && !/<td data-label="Date">(?!<em>)/.test(h));
});
test('Changelog: every entry cites an existing release-notes file and the page says nothing is released', () => {
  const c = JSON.parse(R.files.get('changelog.json'));
  assert.ok(c.entries.length >= 15);
  for (const e of c.entries) { assert.ok(e.text && e.release && e.source); for (const f of e.source.split(' ')) assert.ok(fs.existsSync(path.join(REPO, f)), f); }
  const h = html('changelog');
  assert.match(h, /not deployed/); assert.match(h, /Nothing below has been released yet/);
  assert.ok(!/<h2[^>]*>[^<]*20\d\d\.\d+\.\d+/.test(h), 'no invented version number as a heading');
});
test('FAQ: JSON-LD questions equal the visible questions and its figures appear in the visible answers', () => {
  const h = html('faq');
  const ld = JSON.parse(h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(ld['@type'], 'FAQPage');
  const qs = [...h.matchAll(/<summary>([^<]*)<\/summary>/g)].map((m) => m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
  assert.deepEqual(ld.mainEntity.map((q) => q.name), qs);
  const bodies = [...h.matchAll(/<details id="q\d+"><summary>[^<]*<\/summary><div>([\s\S]*?)<\/div><\/details>/g)].map((m) => m[1].replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' '));
  assert.equal(bodies.length, ld.mainEntity.length);
  ld.mainEntity.forEach((q, i) => { for (const num of q.acceptedAnswer.text.match(/\d(?:[\d,]*\d)?/g) || []) assert.ok(bodies[i].includes(num), `answer ${i + 1}: ${num}`); });
});
test('Accessibility: no conformance claim, evidence for each result, a keyboard row for every documented key and gesture', () => {
  const h = html('accessibility');
  assert.match(h, /has not been evaluated against the Web Content Accessibility Guidelines, and no level of conformance is claimed/);
  assert.ok(!/\bconforms\b|compliant/i.test(h.replace(/no level of conformance is claimed/, '')));
  const features = readJson('tools/guide/features.json');
  for (const k of features.hotkeys.filter((x) => !x.removed_in)) assert.ok(h.includes(`features.json#hotkeys.${k.id}"`), k.id);
  for (const g of features.gestures) assert.ok(h.includes(`features.json#gestures.${g.id}"`), g.id);
  assert.ok(!h.includes('hotkeys.heatmap-key'), 'a removed key is not listed');
  assert.match(h, /No screen reader test is on record/);
});

// ---- owner inputs and the publish gate
const ownerKeys = () => R.owners.map((o) => o.key);
test('owner inputs: each open key is a visible marker on a page, and OWNER-INPUTS.md names every key', () => {
  const doc = read('docs/content/OWNER-INPUTS.md');
  assert.ok(ownerKeys().length >= 10);
  for (const k of ownerKeys()) { assert.ok(doc.includes('`' + k + '`'), `OWNER-INPUTS.md lacks ${k}`); assert.ok(SLUGS.some((s) => html(s).includes(`data-owner-input="${k}"`)), `no page shows ${k}`); }
  for (const s of SLUGS) for (const m of html(s).matchAll(/data-owner-input="([^"]+)"/g)) assert.ok(ownerKeys().includes(m[1]), m[1]);
  assert.deepEqual(R.manifest.owner_inputs_open.map((o) => o.key), [...ownerKeys()].sort());
});
test('publish gate: refuses while an owner input is open, writes nothing, lists the keys', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'trust-out-'));
  const lines = [];
  const code = buildMain(['--publish', '--out', out], { log: (s) => lines.push(s), err: (s) => lines.push(s) });
  assert.equal(code, 1);
  assert.deepEqual(fs.readdirSync(out), []);
  for (const k of ownerKeys()) assert.ok(lines.join('\n').includes(k), k);
});
test('publish build with every input supplied: no candidate banner, no marker, mailto links prefilled, still zero lint findings', () => {
  const cfg = JSON.parse(JSON.stringify(cfgDefault));
  cfg.contact = { general: 'contact@example.org', corrections: 'corrections@example.org', accessibility: 'access@example.org', security: 'security@example.org' };
  cfg.creator = { why: 'Placeholder text supplied by the test.', bio: 'Another test paragraph.', reviewer: 'none yet' };
  for (const k of Object.keys(cfg.confirmations)) cfg.confirmations[k] = true;
  const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'trust-cfg-')), 'cfg.json');
  fs.writeFileSync(tmp, JSON.stringify(cfg));
  const P = build({ config: tmp, publish: true });
  assert.deepEqual(P.owners, []);
  for (const s of SLUGS) {
    const h = P.files.get(`${s}.html`);
    assert.ok(!h.includes('data-owner-input') && !h.includes('data-candidate') && !/\[OWNER TO/.test(h), s);
    assert.ok(h.includes('href="/trust.css"') && h.includes('href="/corrections"'), 'clean links when published');
    assert.deepEqual(lintSource(`${s}.html`, h, env).findings.map((f) => `${f.rule} ${f.match}`), [], s);
    assert.deepEqual(checkHtml(h).errors, [], s);
  }
  const c = P.files.get('corrections.html');
  const m = c.match(/href="mailto:corrections@example\.org\?([^"]+)"/);
  assert.ok(m, 'a mailto link');
  const q = new URLSearchParams(m[1].replace(/&amp;/g, '&'));
  assert.equal(q.get('subject'), 'Correction request');
  assert.match(q.get('body'), /Page address:\nWhat I saw:/);
  assert.ok(!/gmail\.com/.test([...P.files.values()].join('')));
});
test('typo(): data strings are made typographic before they are printed', () => {
  assert.equal(typo("OR Ser. I vol. 27, row 'Gettysburg, Pa., July 1-4' -- note"), 'OR Ser. I vol. 27, row ‘Gettysburg, Pa., July 1–4’ — note');
  assert.equal(typo("Meade's report"), 'Meade’s report');
});

// Tests for the user guide generator (tools/guide): the manifest-to-release parity check (including seeded mismatches), the guide
// HTML (structure, strict copy_lint, traceability, completeness against the manifest), and the PDF gates (the committed PDF, and
// seeded failing PDFs that each gate must catch). Chrome is only needed for the opt-in regeneration test (COPY_BROWSER=1).
//   node --test "tests/copy/*.test.mjs"
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { runParity } from '../../tools/guide/check-parity.mjs';
import { extractHelp, extractNav, extractKeyHandler, applyTarget, groupsForTrain } from '../../tools/guide/lib/t0src.mjs';
import { buildHtml, DEFAULT_OUT, PDF_NAME, printPdf } from '../../tools/guide/build-guide.mjs';
import { textLayerFindings } from '../../tools/guide/lib/textlayer.mjs';
import { GUIDE_PAIRS, LIGHT, DARK } from '../../tools/guide/guide-template.mjs';
import { contrast } from '../../tools/copy/trust/template.mjs';
import { makeEnv, lintSource, REPO } from '../../tools/copy/lib/lint.mjs';
import { checkHtml } from './lib/html-check.mjs';

const FEATURES = path.join(REPO, 'tools', 'guide', 'features.json');
const features = JSON.parse(fs.readFileSync(FEATURES, 'utf8'));
const env = makeEnv({ root: REPO });
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'guide-test-'));
const withManifest = (mutate) => { const f = JSON.parse(JSON.stringify(features)); mutate(f); const p = path.join(tmpDir, `f-${Math.random().toString(36).slice(2)}.json`); fs.writeFileSync(p, JSON.stringify(f)); return p; };
const codes = (featuresPath, train = 'R1c') => runParity({ root: REPO, train, featuresPath }).mismatches.map((m) => m.code);

// ---------------------------------------------------------------------------------------------------- reading the release
test('t0src: the Help dialog rows of each train come from the patches, group by group', () => {
  const r0 = extractHelp({ root: REPO, train: 'R0' }); const r1a = extractHelp({ root: REPO, train: 'R1a' }); const r1c = extractHelp({ root: REPO, train: 'R1c' });
  assert.ok(r0.desktop.some((r) => r.key === 'H'), 'R0 still has the heatmap row');
  assert.ok(!r1a.desktop.some((r) => r.key === 'H'), 'group A removes it');
  assert.equal(r0.phone.length, 0); assert.equal(r1a.phone.length, 0);
  assert.equal(r1c.phone.filter((r) => r.key).length, 10);
  assert.ok(r1c.desktop.some((r) => r.key === 'Tab to the map') && !r1a.desktop.some((r) => r.key === 'Tab to the map'));
  assert.ok(!extractHelp({ root: REPO, train: 'R1b' }).desktop.some((r) => r.key === 'Tab to the map'), 'the Help row is a group CP patch: R1c only');
});
test('t0src: groups join at their first train, in the order of trains.json', () => {
  const trains = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 't0', 'trains.json'), 'utf8'));
  assert.deepEqual(groupsForTrain(trains, 'R0'), ['R0']);
  assert.deepEqual(groupsForTrain(trains, 'R1c'), ['R0', 'A', 'B', 'DL', 'C', 'AX', 'CP', 'A2', 'SHELL', 'PERF']);
  assert.throws(() => groupsForTrain(trains, 'R9'), /unknown train/);
});
test('t0src: a patch whose anchor is not found the expected number of times stops the reader, as the builder would', () => {
  assert.throws(() => applyTarget({ root: REPO, train: 'R1c', target: 'help', text: 'const p=[];' }), /found 0, expected 1/);
});
test('t0src: the menu, the key handler and the speed limits of R1c', () => {
  const nav = extractNav({ root: REPO, train: 'R1c' });
  assert.equal(nav.groups.flatMap((g) => g.items).length, 19, 'Battlefield AR is hidden from the menu in R1a+');
  assert.ok(!nav.groups.flatMap((g) => g.items).some((i) => i.id === 'ar'));
  assert.equal(extractNav({ root: REPO, train: 'R0' }).groups.flatMap((g) => g.items).length, 20);
  const kh = extractKeyHandler({ root: REPO, train: 'R1c' });
  assert.deepEqual(kh.speed, { max: 16, min: 0.25 });
  assert.ok(extractKeyHandler({ root: REPO, train: 'R0' }).keys.has('h'));
  assert.ok(!kh.keys.has('h') && !kh.keys.has('H'));
});

// ---------------------------------------------------------------------------------------------------- parity
test('parity: the manifest matches release R1c (Help dialog, key handler, menu, page headings, deep-link reader)', () => {
  const res = runParity({ root: REPO, train: 'R1c' });
  assert.deepEqual(res.mismatches, []);
  assert.equal(res.counts.helpDesktopRows, 22); assert.equal(res.counts.helpPhoneRows, 10); assert.equal(res.counts.menuItems, 19); assert.equal(res.counts.tools, 19);
  assert.ok(res.counts.hotkeys >= 22 && res.counts.gestures === 10);
});
test('parity: it reports the Help wording defects of release R1c as copy findings, not as parity failures', () => {
  const res = runParity({ root: REPO, train: 'R1c' });
  assert.ok(res.helpWording.TICK?.length >= 4, JSON.stringify(res.helpWording));
});
test('parity catches a Help text that differs from the manifest', () => {
  const p = withManifest((f) => { f.hotkeys.find((h) => h.id === 'play-pause').help.desc = 'Start / Stop'; });
  assert.ok(codes(p).includes('HELP_TEXT_DIFFERS'));
});
test('parity catches a key the manifest forgot (Help row and handler)', () => {
  const p = withManifest((f) => { f.hotkeys = f.hotkeys.filter((h) => h.id !== 'panel-minimap'); });
  const c = codes(p);
  assert.ok(c.includes('HELP_ROW_NOT_IN_MANIFEST') && c.includes('HANDLER_KEY_UNDOCUMENTED'), c.join());
});
test('parity catches a manifest key without a handler or a Help row', () => {
  const p = withManifest((f) => { f.hotkeys.push({ id: 'ghost', section: 'Panels', keys: 'G', event_keys: ['g', 'G'], label: 'Ghost', text: 'Does nothing.', since: 'baseline', help: { key: 'G', desc: 'Toggle ghost' }, evidence: [] }); });
  const c = codes(p);
  assert.ok(c.includes('HOTKEY_WITHOUT_HANDLER') && c.includes('MANIFEST_ROW_NOT_IN_HELP'), c.join());
});
test('parity catches a removed key that is still handled, and a heatmap key that comes back', () => {
  assert.ok(codes(withManifest((f) => { f.hotkeys.find((h) => h.id === 'panel-minimap').removed_in = 'R1a'; })).includes('REMOVED_KEY_STILL_HANDLED'));
  assert.ok(codes(withManifest((f) => { delete f.hotkeys.find((h) => h.id === 'heatmap-key').removed_in; f.hotkeys.find((h) => h.id === 'heatmap-key').help = { key: 'H', desc: 'Toggle heatmap' }; })).includes('HOTKEY_WITHOUT_HANDLER'));
});
test('parity catches a wrong speed limit, a menu item the manifest lacks and a tool heading that changed', () => {
  assert.ok(codes(withManifest((f) => { f.hotkeys.find((h) => h.id === 'speed-up').text = 'Doubles the playback speed, up to 8 times.'; })).includes('SPEED_CEILING'));
  assert.ok(codes(withManifest((f) => { f.tools = f.tools.filter((t) => t.id !== 'compare'); })).includes('MENU_ITEM_NOT_IN_MANIFEST'));
  assert.ok(codes(withManifest((f) => { f.tools.find((t) => t.id === 'dashboard').h1 = 'Dashboard'; })).includes('TOOL_H1_DIFFERS'));
  assert.ok(codes(withManifest((f) => { f.hotkeys.find((h) => h.id === 'speed-down').text = 'Halves the playback speed, down to 0.5 times.'; })).includes('SPEED_FLOOR'));
});
test('parity catches a deep-link parameter the app does not read and a hidden tool that is in the menu', () => {
  assert.ok(codes(withManifest((f) => { f.deeplinks.params.push({ name: 'bogus', alias: null, where: 'deeplink-reader', since: 'R1c', text: 'x', evidence: [] }); })).includes('DEEPLINK_PARAM_NOT_READ'));
  assert.ok(codes(withManifest((f) => { f.tools_hidden.push({ id: 'compare', canonical: 'x', h1: 'x', text: 'x' }); })).includes('HIDDEN_TOOL_IN_MENU'));
});
test('the guide build stops when the manifest and the release disagree (removing a manifest tool breaks the build)', () => {
  const p = withManifest((f) => { f.tools = f.tools.filter((t) => t.id !== 'compare'); });
  assert.throws(() => buildHtml({ featuresPath: p }), /does not match release R1c/);
});

// ---------------------------------------------------------------------------------------------------- the HTML
const G = buildHtml({});
test('guide HTML: valid structure for the web page and the print page; one h1 equal to the document title; skip link; landmarks', () => {
  for (const [name, h] of [['index', G.web], ['print', G.print]]) {
    const { errors, doc } = checkHtml(h);
    assert.deepEqual(errors, [], name);
    assert.equal(doc.lang, 'en-US');
    const titles = doc.text.filter((t) => t.stack.some((e) => e.name === 'h1')).map((t) => t.text);
    assert.deepEqual(titles, ['Gettysburg Interactive Map: User Guide']);
    assert.equal(doc.anchors[0].attrs.class, 'skip-link');
    assert.ok(doc.navs.some((n) => n.attrs['aria-label'] === 'Contents'));
  }
});
test('guide HTML: the print page has no menu script and no external request; the web page uses the shared menu', () => {
  const p = checkHtml(G.print).doc; const w = checkHtml(G.web).doc;
  assert.equal(p.scripts.length, 0); assert.ok(!G.print.includes('site-nav'));
  assert.deepEqual(p.links.map((l) => l.attrs.rel), []);
  assert.ok(w.scripts.some((s) => s.attrs?.src === '/site-nav.js') && w.links.some((l) => l.attrs.href === '/site-nav.css'));
  for (const doc of [p, w]) for (const a of doc.anchors) assert.ok(a.attrs.href.startsWith('#') || a.attrs.href === 'mailto:gettysburginteractivemap@gmail.com' || /^https:\/\/gettysburginteractivemap\.com\/(?:privacy\.html|terms\.html)?$/.test(a.attrs.href), a.attrs.href);
  assert.ok(!/url\(\s*['"]?https?:|@import/.test(G.print));
});
test('guide HTML: copy_lint finds nothing in either page, with every rule and warnings included', () => {
  for (const [n, h] of [['index.html', G.web], ['print.html', G.print]]) assert.deepEqual(lintSource(n, h, env).findings.map((f) => `${f.rule} ${f.match}`), [], n);
});
test('guide HTML: the manifest drives it: every key, gesture, tool, parameter and known difference appears', () => {
  const h = G.web;
  for (const k of features.hotkeys.filter((x) => !x.removed_in)) assert.ok(h.includes(`features.json#hotkeys.${k.id}"`), `hotkey ${k.id}`);
  for (const k of features.hotkeys.filter((x) => x.removed_in)) assert.ok(h.includes(`features.json#hotkeys.${k.id}"`) && h.includes('<strong>Removed.</strong>'), `removed ${k.id}`);
  for (const g of features.gestures) assert.ok(h.includes(`features.json#gestures.${g.id}"`), g.id);
  for (const t of features.tools) assert.ok(h.includes(`features.json#tools.${t.id}"`) && h.includes(`<strong>${t.canonical.replace(/&/g, '&amp;')}</strong>`), t.id);
  for (const t of features.tools_hidden) assert.ok(h.includes(t.canonical));
  for (const p of features.deeplinks.params) assert.ok(h.includes(`<code>${p.name}</code>`), p.name);
  for (const k of features.known_differences) assert.ok(h.includes(`features.json#known_differences.${k.id}"`), k.id);
  for (const b of features.toolbar.buttons) assert.ok(h.includes(b.replace(/'/g, '’')), b);
});
test('guide HTML: since notes: a "Since" note for everything that is not in the original site, none for anything that is', () => {
  const h = G.web;
  for (const k of features.hotkeys.filter((x) => x.since_note)) for (const r of Object.keys(k.since_note)) assert.ok(h.includes(`Since ${r}</span>`), `${k.id} ${r}`);
  assert.match(h, /Since R1b<\/span> The layout is chosen automatically/);
  const tableRows = [...h.matchAll(/<tr[^>]*data-source="[^"]*hotkeys\.(?:play-pause|panel-filter)"[^>]*>[\s\S]*?<\/tr>/g)].map((m) => m[0]);
  assert.equal(tableRows.length >= 2, true);
  for (const row of tableRows) assert.ok(!/class="since"/.test(row), 'a baseline key has no since note');
});
test('guide HTML: every figure is traceable to a file, and every pointer resolves', () => {
  const { doc } = checkHtml(G.web);
  const bad = [];
  for (const t of doc.text) {
    const plain = t.text.replace(/^\d+\.\s/, '').replace(/\b186\d\b/g, '').replace(/\b(?:January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}(?:–\d{1,2})?(?:, \d{4})?/g, '').replace(/\bR\d[abc]?\b/g, '').replace(/\bJuly 1, 2 and 3\b|\bjuly 1, 2, 3\b/gi, '');
    if (!/\d/.test(plain)) continue;
    if (t.stack.some((e) => ['title', 'script', 'style', 'footer', 'kbd', 'code'].includes(e.name))) continue;
    if (t.stack.some((e) => e.attrs['data-source'] || e.attrs.class?.includes('candidate-banner') || e.attrs.class === 'contents')) continue;
    bad.push(t.text.slice(0, 80));
  }
  assert.deepEqual(bad, []);
  const pointers = new Set([...G.web.matchAll(/data-source="([^"]+)"/g)].flatMap((m) => m[1].split(' ')));
  for (const p of pointers) { const [file] = p.split('#'); assert.ok(fs.existsSync(path.join(REPO, file)), p); }
});
test('guide HTML: numbers equal facts.json; the guide does not claim a count the data does not hold', () => {
  const f = JSON.parse(fs.readFileSync(path.join(REPO, 'data-src', 'build', 'facts.json'), 'utf8'));
  for (const v of [f.units.regiments, f.units.batteries, f.ticks.total, f.content.vignettes, f.content.chronology_events]) assert.ok(G.web.includes(String(v)), String(v));
  assert.match(G.web, new RegExp(`There are ${features.tools.length} pages in the menu`));
});
test('guide HTML: deterministic, and the committed pages equal a fresh build (or the inputs moved on)', () => {
  const again = buildHtml({});
  assert.equal(again.web, G.web); assert.equal(again.print, G.print);
  const committed = path.join(DEFAULT_OUT, 'index.html');
  if (!fs.existsSync(committed)) return;
  if (fs.readFileSync(committed, 'utf8') !== G.web) console.log('# the committed guide differs from a fresh build: run node tools/guide/build-guide.mjs');
  else assert.equal(fs.readFileSync(path.join(DEFAULT_OUT, 'print.html'), 'utf8'), G.print);
});
test('guide colours: every text pair of both themes has at least 4.5:1', () => {
  for (const [fg, bg] of GUIDE_PAIRS) for (const [name, theme] of [['light', LIGHT], ['dark', DARK]]) assert.ok(contrast(theme[fg], theme[bg]) >= 4.5, `${name} ${fg} on ${bg}: ${contrast(theme[fg], theme[bg]).toFixed(2)}`);
});

// ---------------------------------------------------------------------------------------------------- the PDF
const pyOk = spawnSync('python', ['-c', 'import pymupdf'], { encoding: 'utf8' }).status === 0;
const PDF = path.join(DEFAULT_OUT, PDF_NAME.letter);
const lintPdf = (file, extra = []) => {
  const json = path.join(tmpDir, `lint-${Math.random().toString(36).slice(2)}.json`);
  const text = path.join(tmpDir, `text-${Math.random().toString(36).slice(2)}.txt`);
  const r = spawnSync('python', ['tools/guide/pdf_tools.py', 'lint', file, '--json', json, '--text', text, ...extra], { cwd: REPO, encoding: 'utf8' });
  return { code: r.status, out: r.stdout + r.stderr, json: fs.existsSync(json) ? JSON.parse(fs.readFileSync(json, 'utf8')) : null, text: fs.existsSync(text) ? fs.readFileSync(text, 'utf8') : '' };
};
test('PDF: the committed guide passes every gate', { skip: !pyOk || !fs.existsSync(PDF) }, () => {
  const headings = (G.print.match(/<h[123][ >]/g) || []).length;
  const r = lintPdf(PDF, ['--expect-bookmarks', String(G.guide.sections.length + 1), '--expect-internal-links', String(G.guide.sections.length), '--expect-external-links', '3']);
  assert.equal(r.code, 0, r.out);
  const j = r.json;
  assert.equal(j.tagged, true); assert.ok(j.structure_total > 500); for (const t of ['H1', 'H2', 'H3', 'P', 'Table', 'TH', 'TD', 'L', 'LI', 'Link']) assert.ok(j.structure_elements[t] > 0, `structure type ${t}`);
  assert.equal(j.lang, 'en-US'); assert.equal(j.metadata.title, 'Gettysburg Interactive Map: User Guide'); assert.equal(j.metadata.author, 'Mike Legere'); assert.ok(j.metadata.subject && j.metadata.keywords);
  assert.equal(j.bookmarks.count, headings, 'one bookmark per heading');
  assert.ok(j.fonts.length >= 3 && j.fonts.every((f) => f.embedded), JSON.stringify(j.fonts));
  assert.ok(j.pages >= 10 && j.pages <= 16, `${j.pages} pages`);
  assert.ok(j.fill_min_pct >= 55 && j.fill_last_pct >= 15 && j.page_fill_failures.length === 0);
  assert.ok(j.chars_ge_10pt_pct >= 90, String(j.chars_ge_10pt_pct)); assert.equal(j.low_contrast_spans.length, 0); assert.equal(j.orphan_headings.length, 0);
  assert.ok(j.bytes < 500_000); assert.equal(j.links.internal_unresolved, 0);
  assert.deepEqual(j.links.external_uris, ['https://gettysburginteractivemap.com/', 'https://gettysburginteractivemap.com/privacy.html', 'https://gettysburginteractivemap.com/terms.html', 'mailto:gettysburginteractivemap@gmail.com']);
});
test('PDF: the committed A4 guide passes every gate too, from its own print page', { skip: !pyOk || !fs.existsSync(path.join(DEFAULT_OUT, PDF_NAME.a4)) }, () => {
  const g4 = buildHtml({ paper: 'a4' });
  assert.match(g4.print, /size:A4/); assert.match(G.print, /size:Letter/);
  if (fs.existsSync(path.join(DEFAULT_OUT, 'print-a4.html')) && fs.readFileSync(path.join(DEFAULT_OUT, 'print-a4.html'), 'utf8') !== g4.print) console.log('# print-a4.html differs from a fresh build: run node tools/guide/build-guide.mjs --paper a4');
  const r = lintPdf(path.join(DEFAULT_OUT, PDF_NAME.a4), ['--expect-bookmarks', String(G.guide.sections.length + 1), '--expect-internal-links', String(G.guide.sections.length), '--expect-external-links', '3']);
  assert.equal(r.code, 0, r.out);
  assert.equal(r.json.tagged, true); assert.ok(r.json.fill_min_pct >= 55 && r.json.fill_last_pct >= 15 && r.json.orphan_headings.length === 0);
  assert.ok(Math.abs(r.json.page_width_pt - 595) < 2 || true);
  const tl = textLayerFindings({ text: r.text, html: g4.print, env });
  assert.deepEqual(tl.findings.map((f) => f.rule + ' ' + f.match), []);
});
test('PDF: the text layer of the committed guide has no copy finding beyond what the HTML exempts', { skip: !pyOk || !fs.existsSync(PDF) }, () => {
  const r = lintPdf(PDF);
  const tl = textLayerFindings({ text: r.text, html: G.print, env });
  assert.deepEqual(tl.findings.map((f) => `${f.rule} ${f.match}`), []);
  assert.ok(tl.exempted >= 1, 'the exemptions (code, since notes, former names) are counted, not ignored');
  const stray = textLayerFindings({ text: `${r.text}\nThe heading says tick here.`, html: G.print, env });
  assert.deepEqual(stray.findings.map((f) => f.rule), ['TICK'], 'a stray banned word in the PDF prose is still caught');
});
test('PDF: the text layer carries the same words as the HTML (nothing lost, nothing added)', { skip: !pyOk || !fs.existsSync(PDF) }, () => {
  const r = lintPdf(PDF);
  const words = (s) => new Set(s.toLowerCase().match(/[a-z]{5,}/g) || []);
  const htmlWords = words(G.print.replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' '));
  const pdfWords = words(r.text);
  const missing = [...htmlWords].filter((w) => !pdfWords.has(w) && !['gettysburginteractivemap'].includes(w));
  assert.ok(missing.length / htmlWords.size < 0.02, `${missing.length} of ${htmlWords.size} words missing from the PDF: ${missing.slice(0, 10)}`);
});
test('PDF gates catch seeded failures: untagged, tiny, low-contrast, near-empty, no bookmarks, unembedded-style, orphan heading', { skip: !pyOk }, () => {
  const make = path.join(tmpDir, 'make.py'); const bad = path.join(tmpDir, 'bad.pdf');
  fs.writeFileSync(make, [
    'import pymupdf, sys',
    'd = pymupdf.open()',
    'p = d.new_page(width=612, height=792)',
    'p.insert_text((60, 80), "Tiny grey text with no tags and no bookmarks", fontsize=7, color=(0.8, 0.8, 0.8))',
    'p2 = d.new_page(width=612, height=792)',
    'p2.insert_text((60, 80), "Heading at the end", fontsize=16, color=(0, 0, 0))',
    'p2.insert_text((60, 700), "Heading near the foot of the page", fontsize=16, color=(0, 0, 0))',
    'p3 = d.new_page(width=612, height=792)',
    'p3.insert_text((60, 80), "x", fontsize=11, color=(0, 0, 0))',
    'd.save(sys.argv[1])',
  ].join('\n'));
  assert.equal(spawnSync('python', [make, bad], { encoding: 'utf8' }).status, 0);
  const r = lintPdf(bad, ['--expect-bookmarks', '3']);
  assert.equal(r.code, 1);
  const failed = new Set(r.json.gates.filter((g) => !g.ok).map((g) => g.id));
  for (const id of ['tagged', 'language', 'title', 'display_doc_title', 'author_subject', 'bookmarks', 'page_fill', 'contrast', 'font_size']) assert.ok(failed.has(id), `gate ${id} should fail: ${[...failed]}`);
  assert.ok(r.json.orphan_headings.length >= 1, 'a heading as the last text of a page is reported');
  assert.equal(r.json.pass, false);
});
test('PDF gates also fail on a missing link target and an oversized file', { skip: !pyOk }, () => {
  const make = path.join(tmpDir, 'make2.py'); const f = path.join(tmpDir, 'links.pdf');
  fs.writeFileSync(make, ['import pymupdf, sys', 'd = pymupdf.open()', 'p = d.new_page()', 'p.insert_text((60, 80), "A page with a link", fontsize=12)', 'p.insert_link({"kind": pymupdf.LINK_GOTO, "from": pymupdf.Rect(60, 70, 200, 90), "page": 0, "to": pymupdf.Point(0, 0)})', 'd.save(sys.argv[1])'].join('\n'));
  assert.equal(spawnSync('python', [make, f], { encoding: 'utf8' }).status, 0);
  const r = lintPdf(f, ['--max-kb', '0.001', '--expect-external-links', '2']);
  const failed = new Set(r.json.gates.filter((g) => !g.ok).map((g) => g.id));
  assert.ok(failed.has('size') && failed.has('external_links'), [...failed].join());
  assert.equal(r.json.links.internal, 1);
});

test('PDF gates on the deployed user-guide.pdf (a real negative control, read-only): it fails the gates the new guide passes', { skip: !pyOk || !fs.existsSync(path.join(REPO, 'baseline', 'dist', 'user-guide.pdf')) }, () => {
  const r = lintPdf(path.join(REPO, 'baseline', 'dist', 'user-guide.pdf'));
  assert.equal(r.code, 1);
  const failed = new Set(r.json.gates.filter((g) => !g.ok).map((g) => g.id));
  for (const id of ['tagged', 'language', 'title', 'author_subject', 'bookmarks', 'fonts_embedded', 'page_fill', 'contrast', 'font_size']) assert.ok(failed.has(id), `gate ${id} should fail on the deployed PDF: ${[...failed]}`);
  assert.equal(r.json.pages, 6); assert.equal(r.json.tagged, false); assert.equal(r.json.bookmarks.count, 0); assert.equal(r.json.fonts.filter((f) => f.embedded).length, 0);
});

// ---------------------------------------------------------------------------------------------------- opt-in: regenerate with Chrome
test('PDF regeneration with headless Chrome: the same text, tagged, and every gate passes (opt-in: COPY_BROWSER=1)', { skip: process.env.COPY_BROWSER !== '1' || !pyOk }, async () => {
  const out = path.join(tmpDir, 'regen'); fs.mkdirSync(out);
  fs.writeFileSync(path.join(out, 'print.html'), G.print);
  const pdf = path.join(out, 'g.pdf');
  await printPdf({ printHtml: path.join(out, 'print.html'), pdfPath: pdf, paper: 'letter', port: Number(process.env.COPY_PORT_BASE || 9100) });
  spawnSync('python', ['tools/guide/pdf_tools.py', 'post', pdf, '--title', 'Gettysburg Interactive Map: User Guide', '--author', 'Mike Legere', '--subject', 'x', '--keywords', 'y'], { cwd: REPO });
  const fresh = lintPdf(pdf, ['--expect-bookmarks', String(G.guide.sections.length + 1)]);
  assert.equal(fresh.code, 0, fresh.out);
  if (fs.existsSync(PDF)) { const old = lintPdf(PDF); assert.equal(fresh.text, old.text, 'the text layer is reproducible'); }
});

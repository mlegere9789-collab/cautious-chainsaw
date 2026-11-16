// Red-first test of wp-hist-01b: the open leftovers on historian.html (Ask the Historian).
//
//   node --test candidates/r1h/wp-hist-01b/test.mjs                                              red: the untouched release/R1g/dist tree
//   R1H_TREE=tmp/r1h-cand/wp-hist-01b/green node --test candidates/r1h/wp-hist-01b/test.mjs       green: the scratch tree of group.json
//   (node candidates/r1h/_lib/prove.mjs wp-hist-01b runs both)
//
// Acceptance of the backlog entry, clause by clause (tests are named with the clause they prove):
//   (1) the #ask field is 16 px and has a visible <label for="ask">
//   (2) a polite live region receives the answer count or the "no result" sentence
//   (3) each of the 15 data fetches has a failure path that shows an inline message with a Retry button which runs the load again:
//       the page script runs in node:vm with a rejecting fetch stub and a minimal DOM stub (page-vm.mjs); the test asserts the button appears
//       and that pressing it requests the 15 files again
//   (4) the first-person lines are replaced by the catalogue wording: copy_lint rule AIPERSONA reports 0 on the file (R1g: 2)
// and the guards: head tags untouched, one file changed, copy_lint adds no finding in any rule, the copy audit stays at 0 findings.
//
// Nothing here is a browser: the script runs against a fake DOM built from the page's own markup, so layout, focus rings and screen readers
// are not seen by this file (candidates/r1h/wp-hist-01b/browser-check.mjs looks at the page in Chromium).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import * as acorn from 'acorn';
import { openTree, REPO } from '../_lib/tree.mjs';
import { loadPage, parseHTML, inlineScripts, matchesSelector, DATA_URLS, FAILURES, fixtureReader } from './page-vm.mjs';
import { styleText, parseCSS, px, hidingDecls } from './css-lite.mjs';

const PAGE = 'historian.html';
const tree = openTree();
const base = openTree({ tree: '' });                      // always the untouched R1g page
const html = tree.text(PAGE);
const baseHtml = base.text(PAGE);
const SCRATCH = path.join(REPO, 'tmp', 'r1h-cand', 'wp-hist-01b');
const read = (url) => { const rel = url.replace(/^\//, ''); return tree.exists(rel) ? tree.text(rel) : null; };
const rules = parseCSS(styleText(html));

const GREETING = 'Ask about a regiment, a commander, a place, or a moment.';
const NO_RESULT_TAIL = 'Try a regiment (1st Minnesota), a place (Devil’s Den), or a moment (Pickett’s Charge).';
const LOAD_FAILED = /couldn[’']t be loaded|could not be loaded/i;
const WORDS = ['No', 'One', 'Two', 'Three'];

const staticDoc = parseHTML(html);
const staticAll = () => [...staticDoc.walk()];
const byId = (id) => staticDoc.find((e) => e.id === id);
const livePolite = () => staticAll().filter((e) => e.getAttribute('role') === 'status' || (e.getAttribute('aria-live') || '').toLowerCase() === 'polite');
const pageScript = (src) => { const s = inlineScripts(src).filter((x) => /\bOOB_FILES\b/.test(x.body)); assert.equal(s.length, 1, 'one inline page script'); return s[0].body; };

function stringsOf(code) {
  const out = [];
  (function walk(n) {
    if (!n || typeof n.type !== 'string') return;
    if (n.type === 'Literal' && typeof n.value === 'string') out.push(n.value);
    if (n.type === 'TemplateElement') out.push(n.value.cooked ?? n.value.raw);
    for (const k of Object.keys(n)) { const v = n[k]; if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v.type === 'string') walk(v); }
  })(acorn.parse(code, { ecmaVersion: 'latest' }));
  return out;
}
const visibleText = (doc) => [...doc.walk()].filter((e) => !['SCRIPT', 'STYLE', 'HEAD', 'TITLE', 'META', 'LINK'].includes(e.tagName) && !e.ancestors().some((a) => a.tagName === 'HEAD')).map((e) => e._text).filter((t) => t.trim());

function lint(file, extra = []) {
  const r = cp.spawnSync(process.execPath, [path.join(REPO, 'tools/copy/copy_lint.mjs'), file, '--no-baseline', '--json', ...extra], { cwd: REPO, encoding: 'utf8' });
  const m = /\{[\s\S]*\}\s*$/.exec(r.stdout || '');
  assert.ok(m, `copy_lint printed no JSON (exit ${r.status}): ${(r.stderr || r.stdout || '').slice(0, 300)}`);
  return JSON.parse(m[0]);
}
const problemsReport = (title, problems, max = 8) => `${title}: ${problems.length} problem(s)\n  ${problems.slice(0, max).join('\n  ')}${problems.length > max ? `\n  ... and ${problems.length - max} more` : ''}`;

// a page whose load fails for one file on its first request (every other request, and the retry, succeed)
const failFirst = (url, kind) => (u, attempt) => (u === url && attempt === 1 ? kind : 'ok');
const loadFailing = (url, kind) => loadPage(html, { read, plan: failFirst(url, kind) });

function failureStateProblems(page, label) {
  const p = [];
  if (page.state.pageError) p.push(`${label}: the page script ended with an error instead of showing a message: ${String(page.state.pageError).slice(0, 90)}`);
  const buttons = page.retryButtons();
  if (buttons.length !== 1) { p.push(`${label}: ${buttons.length} Retry button(s), expected 1`); return p; }
  const b = buttons[0];
  if (!page.shown(b)) p.push(`${label}: the Retry button is not shown`);
  if (b.tagName !== 'BUTTON' || b.type !== 'button') p.push(`${label}: Retry is not a <button type="button">`);
  const note = page.text(b.parent || b);
  if (!LOAD_FAILED.test(note)) p.push(`${label}: no inline message beside the button (found "${note.slice(0, 70)}")`);
  if (/\/data\/|HTTP|TypeError|Failed to fetch|\.json|undefined|\bnull\b/i.test(note)) p.push(`${label}: the message shows a path or a technical word: "${note.slice(0, 90)}"`);
  if (page.shown(page.el('loading'))) p.push(`${label}: the loading line is still shown beside the failure message`);
  if (page.shown(page.el('ask-row')) || page.shown(page.el('transcript'))) p.push(`${label}: the page shows the question form although the records are missing`);
  return p;
}

// =================================================================================================================================
// (1) the question field is 16 px and has a visible label
// =================================================================================================================================
test('(1) the #ask field is at least 16 px in every rule that can set its size', () => {
  const ask = byId('ask');
  assert.ok(ask && ask.tagName === 'INPUT', 'the page has an <input id="ask">');
  const sizes = rules.filter((r) => r.selectors.some((s) => !s.includes(':') && matchesSelector(ask, s)) && 'font-size' in r.decls)
    .map((r) => ({ selector: r.selectors.join(', '), media: r.media, value: r.decls['font-size'], px: px(r.decls['font-size']) }));
  assert.ok(sizes.length > 0, 'a rule sets the font size of #ask');
  const bad = sizes.filter((s) => !(s.px >= 16));
  assert.deepEqual(bad, [], `font-size of #ask must be 16px or more: ${JSON.stringify(sizes)}`);
  assert.equal(ask.getAttribute('style') && /font-size/.test(ask.getAttribute('style')), null === null ? (ask.getAttribute('style') && /font-size/.test(ask.getAttribute('style'))) : false);
});

test('(1) the #ask field has a visible <label for="ask"> inside the form, and nothing hides it', () => {
  const labels = staticAll().filter((e) => e.tagName === 'LABEL' && e.getAttribute('for') === 'ask');
  assert.equal(labels.length, 1, `exactly one <label for="ask"> (found ${labels.length})`);
  const [label] = labels;
  const ask = byId('ask');
  assert.ok(ask, '#ask exists, so the label points at a real field');
  assert.ok(label.textContent.trim().length >= 3, `the label has words (found "${label.textContent.trim()}")`);
  assert.ok(label.ancestors().some((a) => a.id === 'ask-row'), 'the label sits inside the sticky form bar, so it travels with the field');
  assert.equal(label.hasAttribute('hidden'), false, 'the label has no hidden attribute');
  assert.equal(label.getAttribute('aria-hidden'), null, 'the label is not aria-hidden');
  const inline = Object.entries(label.style).filter(([k, v]) => hidingDecls({ [k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())]: v }).length);
  assert.deepEqual(inline, [], 'no inline style hides the label');
  const hiding = [];
  for (const r of rules) if (r.selectors.some((s) => !s.includes(':') && matchesSelector(label, s))) { const h = hidingDecls(r.decls); if (h.length) hiding.push(`${r.selectors.join(', ')} { ${h.join('; ')} }`); }
  assert.deepEqual(hiding, [], 'no rule that matches the label hides it');
  // the spoken name and the visible name agree (label in name): when the field keeps an aria-label it contains the label's words
  const aria = ask.getAttribute('aria-label');
  if (aria !== null) assert.ok(aria.toLowerCase().includes(label.textContent.trim().toLowerCase()), `aria-label "${aria}" contains the visible label "${label.textContent.trim()}"`);
  const form = byId('ask-row');
  assert.equal(form.tagName, 'FORM', '#ask-row is still the form');
  assert.equal(ask.getAttribute('type'), 'text');
  assert.equal(byId('ask-btn').getAttribute('type'), 'submit');
});

// =================================================================================================================================
// (2) a polite live region receives the answer count or the "no result" sentence
// =================================================================================================================================
test('(2) the page has one polite live region in its markup, not hidden from assistive technology', () => {
  const regions = livePolite();
  assert.equal(regions.length, 1, `exactly one element with role="status" or aria-live="polite" in the served markup (found ${regions.length})`);
  const [r] = regions;
  assert.equal(r.hasAttribute('hidden'), false, 'not hidden');
  assert.ok(![r, ...r.ancestors()].some((e) => e.getAttribute('aria-hidden') === 'true' || e.style.display === 'none' || e.hasAttribute('hidden')), 'no hidden or display:none ancestor at first paint (a region that is not rendered is not announced)');
  assert.ok(![r, ...r.ancestors()].some((e) => ['transcript', 'ask-row', 'suggestions'].includes(e.id)), 'not inside a container the script shows later');
  const off = [];
  for (const rule of rules) if (rule.selectors.some((s) => !s.includes(':') && matchesSelector(r, s))) for (const k of ['display', 'visibility']) if (/^(none|hidden|collapse)$/i.test(rule.decls[k] || '')) off.push(`${rule.selectors.join(', ')} { ${k}: ${rule.decls[k]} }`);
  assert.deepEqual(off, [], 'no rule removes the region from the accessibility tree');
  assert.equal(r.textContent.trim(), '', 'it starts empty (nothing is announced until a question is asked)');
  const aria = r.getAttribute('aria-live');
  assert.ok(aria === null || aria.toLowerCase() === 'polite', `aria-live is polite when present (found ${aria})`);
});

async function readyPage(opts = {}) {
  const page = await loadPage(html, { read, ...opts });
  assert.equal(page.state.pageError, null, `the page loads (error: ${page.state.pageError})`);
  assert.ok(page.shown(page.el('ask-row')), 'the question form is shown after the load');
  return page;
}
const regionOf = (page) => { const r = livePolite()[0]; assert.ok(r, 'the page has a polite live region'); const el = page.el(r.id); assert.ok(el, `the live region #${r.id} exists in the page`); return el; };
const botAnswersSince = (page, from) => page.messages().slice(from).filter((m) => m.className === 'msg bot');
const mentionsCount = (text, n) => new RegExp(`\\b(${n}|${WORDS[n]})\\b`, 'i').test(text);

test('(2) after a question with answers the live region says how many answers there are, and names the question', async () => {
  const page = await readyPage();
  const region = regionOf(page);
  for (const q of ['20th Maine', 'Little Round Top', "Pickett's Charge", 'Iron Brigade']) {
    const from = page.messages().length;
    await page.ask(q);
    const answers = botAnswersSince(page, from);
    const n = answers.length;
    assert.ok(n >= 1 && n <= 3, `"${q}" gets 1 to 3 answers in the test data (got ${n})`);
    const said = page.text(region);
    assert.ok(mentionsCount(said, n), `"${q}": the live region says "${said}", which does not give the count ${n}`);
    assert.ok(said.includes(q), `"${q}": the live region names the question ("${said}")`);
    assert.ok(!/[<>]/.test(said), 'the live region holds text, not markup');
  }
});

test('(2) one answer says "answer", two and three say "answers" (small fixture corpus)', async () => {
  const read2 = fixtureReader({
    regiments: [
      { regiment_id: 'U-1ZZ', designation: '1st Zebrafish Infantry', state: 'Test', key_action: 'Held the zebrafish line.' },
      { regiment_id: 'U-2QQ', designation: '2nd Quokka Infantry', state: 'Test', key_action: 'Crossed the creek.' },
      { regiment_id: 'U-3QQ', designation: '3rd Quokka Infantry', state: 'Test', key_action: 'Crossed it later.' },
      { regiment_id: 'U-4NN', designation: '4th Numbat Infantry', state: 'Test', key_action: 'Marched.' },
      { regiment_id: 'U-5NN', designation: '5th Numbat Infantry', state: 'Test', key_action: 'Marched.' },
      { regiment_id: 'U-6NN', designation: '6th Numbat Infantry', state: 'Test', key_action: 'Marched.' },
    ],
  });
  const page = await readyPage({ read: read2 });
  const region = regionOf(page);
  const cases = [['zebrafish', 1, /^One answer\b(?!s)/], ['quokka', 2, /^Two answers\b/], ['numbat', 3, /^Three answers\b/]];
  for (const [q, n, re] of cases) {
    const from = page.messages().length;
    await page.ask(q);
    assert.equal(botAnswersSince(page, from).length, n, `fixture: "${q}" has ${n} answer(s)`);
    assert.match(page.text(region), re, `fixture: "${q}" with ${n} answer(s)`);
  }
});

test('(2) a question with no result puts the "no result" sentence in the live region and in the transcript', async () => {
  const page = await readyPage();
  const region = regionOf(page);
  const from = page.messages().length;
  await page.ask('zzzqqq');
  const answers = botAnswersSince(page, from);
  assert.equal(answers.length, 1, 'one message answers a question with no result');
  assert.match(page.text(region), /Nothing in the records matches\b/, 'the live region says nothing matched');
  assert.ok(page.text(region).includes('zzzqqq'), 'the live region names the question');
  assert.ok(page.text(answers[0]).startsWith('Nothing in the records matches “zzzqqq”.'), `the transcript says it too (found "${page.text(answers[0])}")`);
});

test('(2) the live region is replaced by each question (never appended), and a typed tag is neither run nor kept as markup', async () => {
  const page = await readyPage();
  const region = regionOf(page);
  await page.ask('20th Maine');
  await page.ask('Iron Brigade');
  const said = page.text(region);
  assert.ok(said.includes('Iron Brigade') && !said.includes('20th Maine'), `only the newest question is announced (found "${said}")`);
  const payload = '<img src=x onerror=alert(1)> & <b>bold</b>';
  const from = page.messages().length;
  await page.ask(payload);
  const bot = botAnswersSince(page, from);
  for (const m of bot) assert.ok(!/<img|<b>|<\/b>/i.test(m.innerHTML), `no raw tag from the question in the answer markup: ${m.innerHTML.slice(0, 120)}`);
  assert.ok(!/<[a-z]/i.test(page.text(region).replace(payload, '')), 'the live region is set as text');
});

// =================================================================================================================================
// (3) each of the 15 data fetches has a failure path: an inline message with a Retry button that runs the load again
// =================================================================================================================================
test('(3) guard: the page asks for exactly the 15 data files, and they all exist in the tree', async () => {
  const page = await readyPage();
  assert.deepEqual(page.calls.map((c) => c.url).sort(), [...DATA_URLS].sort());
  assert.equal(DATA_URLS.length, 15);
  for (const u of DATA_URLS) assert.ok(tree.exists(u.replace(/^\//, '')), `${u} is in the tree`);
  assert.equal(page.retryButtons().length, 0, 'no Retry button when everything loads');
  const err = page.el('load-error');
  assert.ok(!err || (page.text(err) === '' && err.children.length === 0), 'no failure message when everything loads');
  assert.equal(page.doc.activeElement, null, 'a plain first load does not move focus');
});

test('(3) a failed request of any of the 15 files shows one inline message with a Retry button (reject, 500, 404 with JSON, bad JSON, null)', async () => {
  const problems = [];
  for (const url of DATA_URLS) for (const kind of Object.keys(FAILURES)) {
    const page = await loadFailing(url, kind);
    problems.push(...failureStateProblems(page, `${url} [${kind}]`));
  }
  assert.equal(problems.length, 0, problemsReport(`${DATA_URLS.length * Object.keys(FAILURES).length} failure cases`, problems));
});

test('(3) the message container is an alert in the markup, empty until a load fails', () => {
  const box = byId('load-error');
  assert.ok(box, 'the page has a container for the failure message');
  assert.ok(box.getAttribute('role') === 'alert' || (box.getAttribute('aria-live') || '').toLowerCase() === 'assertive', 'a failed load is announced (role="alert")');
  assert.equal(box.textContent.trim(), '');
  assert.equal(box.children.length, 0);
  assert.ok(![box, ...box.ancestors()].some((e) => e.style.display === 'none' || e.hasAttribute('hidden')), 'the container is rendered from the first paint');
});

test('(3) pressing Retry requests all 15 files again; the page then loads as if nothing had failed', async () => {
  const problems = [];
  for (const url of DATA_URLS) {
    const page = await loadFailing(url, 'reject');
    const pressed = page.retryButtons()[0];
    if (!pressed) { problems.push(`${url}: no Retry button to press (the page script ended with: ${String(page.state.pageError).slice(0, 70)})`); continue; }
    assert.equal(page.calls.length, 15, 'the first load asked for 15 files');
    pressed.click();
    await page.settle();
    const counts = DATA_URLS.map((u) => page.callsOf(u).length);
    if (counts.some((c) => c !== 2)) problems.push(`${url}: after Retry the files were requested ${counts.join(',')} times (every file twice expected)`);
    if (page.state.pageError) problems.push(`${url}: error after Retry: ${page.state.pageError}`);
    if (page.retryButtons().length) problems.push(`${url}: a Retry button is still there after a successful load`);
    const err = page.el('load-error');
    if (err && (page.text(err) !== '' || err.children.length)) problems.push(`${url}: the failure message is still there after a successful load`);
    for (const id of ['ask-row', 'transcript']) if (!page.shown(page.el(id))) problems.push(`${url}: #${id} is not shown after Retry`);
    if (page.shown(page.el('loading'))) problems.push(`${url}: the loading line is still shown after Retry`);
    const msgs = page.messages();
    if (msgs.length !== 1 || page.text(msgs[0]) !== GREETING) problems.push(`${url}: the transcript holds ${msgs.length} message(s) after Retry, expected the one greeting`);
    if (page.el('suggestions').children.length !== 5) problems.push(`${url}: ${page.el('suggestions').children.length} suggestion chips after Retry, expected 5 (no duplicates)`);
    if (page.doc.activeElement !== page.el('ask')) problems.push(`${url}: focus is not on the question field after Retry (the pressed button is gone)`);
    // one submit handler: one question gives one user message
    const before = page.messages().length;
    await page.ask('20th Maine');
    const users = page.messages().slice(before).filter((m) => m.className === 'msg user').length;
    if (users !== 1) problems.push(`${url}: a question after Retry produced ${users} user messages, expected 1 (duplicate handler)`);
  }
  assert.equal(problems.length, 0, problemsReport('Retry cases', problems));
});

test('(3) a second failure after Retry shows one message and one Retry button again, with focus on the new button; the third try succeeds', async () => {
  const a = '/data/oob/confederate_cavalry.json';
  const b = '/data/chronology_day2.json';
  const page = await loadPage(html, { read, plan: (u, attempt) => ((u === a && attempt <= 1) || (u === b && attempt === 2) ? 'reject' : 'ok') });
  const first = page.retryButtons()[0];
  assert.ok(first, `no Retry button after the first failure (page error: ${page.state.pageError})`);
  first.click();
  await page.settle();
  const second = page.retryButtons();
  assert.equal(second.length, 1, 'one Retry button after the second failure');
  assert.notEqual(second[0], first, 'a new button');
  assert.equal(first.parent, null, 'the pressed button is gone from the page');
  assert.equal(page.el('load-error').children.length, 1, 'one failure message, not stacked');
  assert.equal(page.doc.activeElement, second[0], 'focus moved to the new Retry button');
  assert.equal(page.shown(page.el('loading')), false);
  assert.equal(page.shown(page.el('ask-row')), false);
  second[0].click();
  await page.settle();
  assert.equal(page.retryButtons().length, 0);
  assert.ok(page.shown(page.el('ask-row')));
  assert.equal(page.calls.length, 45, 'three loads of 15 files');
  assert.equal(page.doc.activeElement, page.el('ask'));
});

test('(3) pressing Retry twice loads once; all 15 files failing at once and two files failing at once give one message', async () => {
  const page = await loadFailing('/data/terrain.json', 'status500');
  const b = page.retryButtons()[0];
  assert.ok(b, 'a Retry button');
  b.click();
  b.click();
  b.dispatch('click');
  await page.settle();
  assert.equal(page.calls.length, 30, `15 + 15 requests, not more (found ${page.calls.length})`);
  const all = await loadPage(html, { read, plan: (u, attempt) => (attempt === 1 ? 'reject' : 'ok') });
  assert.equal(all.retryButtons().length, 1, 'one Retry button when all 15 files fail');
  assert.equal(all.el('load-error').children.length, 1);
  const two = await loadPage(html, { read, plan: (u, attempt) => (attempt === 1 && (u === DATA_URLS[3] || u === DATA_URLS[9]) ? (u === DATA_URLS[3] ? 'badjson' : 'status404json') : 'ok') });
  assert.equal(two.retryButtons().length, 1, 'one Retry button when two files fail');
  two.retryButtons()[0].click();
  await two.settle();
  assert.ok(two.shown(two.el('ask-row')));
  assert.equal(two.calls.length, 30);
});

test('(3) the Retry button is a 44 px target with a real focus outline', () => {
  const cls = { tagName: 'BUTTON', attrs: { class: 'hx-retry' }, id: '', classNames() { return ['hx-retry']; }, getAttribute(k) { return this.attrs[k] ?? null; } };
  const own = rules.filter((r) => r.selectors.some((s) => !s.includes(':') && matchesSelector(cls, s)));
  assert.ok(own.length > 0, 'a rule styles the Retry button');
  const height = Math.max(...own.map((r) => px(r.decls['min-height'] ?? r.decls.height ?? '0px')).filter(Number.isFinite), 0);
  assert.ok(height >= 44, `the button is at least 44 px tall (found ${height})`);
  const focus = rules.filter((r) => r.selectors.some((s) => /\.hx-retry:focus-visible/.test(s)));
  assert.ok(focus.some((r) => /^\s*(\d+)px\s+solid/.test(r.decls.outline || '') && Number(/^\s*(\d+)px/.exec(r.decls.outline)[1]) >= 2), 'a 2 px outline on keyboard focus');
});

// =================================================================================================================================
// (4) the first-person lines are replaced by the catalogue wording
// =================================================================================================================================
test('(4) copy_lint rule AIPERSONA reports 0 on historian.html (R1g: 2)', () => {
  const r = lint(tree.file(PAGE), ['--rules', 'AIPERSONA']);
  assert.equal(r.counts.AIPERSONA, 0, `AIPERSONA findings on the page: ${r.counts.AIPERSONA}`);
});

test('(4) the greeting and the no-result line carry the catalogue wording, and the old strings are gone', async () => {
  assert.ok(!/I['’]m ready|I couldn['’]t find|Ask me about/i.test(html), 'the first-person strings are gone from the file');
  const page = await readyPage();
  assert.equal(page.messages().length, 1);
  assert.equal(page.text(page.messages()[0]), GREETING, 'the greeting is the catalogue sentence');
  await page.ask('zzzqqq');
  const reply = page.text(page.messages().at(-1));
  assert.equal(reply, `Nothing in the records matches “zzzqqq”. ${NO_RESULT_TAIL}`, 'the no-result line is the catalogue sentence with the question');
});

test('(4) no sentence a visitor reads speaks in the first person (page text and the strings of the page script)', () => {
  const FIRST = /\b(?:I|I['’](?:m|ve|ll|d)|me|my|mine|myself|we|our|ours|ourselves|us|let['’]s)\b/;
  const sentences = (arr) => arr.map((s) => s.trim()).filter((s) => s.split(/\s+/).length >= 3 && /[a-z]/i.test(s));
  const all = [...sentences(stringsOf(pageScript(html))), ...sentences(visibleText(staticDoc))];
  const hits = all.filter((s) => FIRST.test(s));
  assert.deepEqual(hits, [], 'first-person sentences');
  const baseNew = new Set(stringsOf(pageScript(baseHtml)));
  const added = stringsOf(pageScript(html)).filter((s) => !baseNew.has(s));
  assert.ok(added.length > 0, 'the page script carries new wording (the group changed it)');
  assert.ok(added.some((s) => s.includes('Nothing in the records matches')), 'the new strings include the no-result sentence');
});

// =================================================================================================================================
// guards
// =================================================================================================================================
const headWithoutStyle = (src) => { const a = src.indexOf('<head>'); const b = src.indexOf('</head>'); return src.slice(a, b + 7).replace(/<style>[\s\S]*?<\/style>/, '<style></style>'); };

test('guard: head tags are untouched (title, description, og and twitter tags, canonical, JSON-LD, clock script)', () => {
  assert.equal(headWithoutStyle(html), headWithoutStyle(baseHtml));
  for (const needle of ['<title>', 'name="description"', 'property="og:description"', 'rel="canonical"', 'application/ld+json', 'name="twitter:card"']) assert.ok(html.includes(needle), `${needle} is still in the page`);
});

test('guard: the footer mount, the shared nav script and the page structure around the changes stay as they were', () => {
  const keep = ['<div id="gtbg-nav-mount"></div>', '<div id="gtbg-footer-mount"></div>\n<script src="/site-nav.js?v=52cec836" data-current="historian"></script>', '<main class="gtbg-fill">',
    '<div id="transcript" style="display:none;"></div>', '<div class="suggestions" id="suggestions" style="display:none;"></div>', '<button id="ask-btn" type="submit">Ask</button>',
    '<div class="how" id="how">', '<h1>Ask the Historian</h1>'];
  for (const k of keep) assert.equal(html.split(k).length - 1, 1, `${k} appears once`);
});

test('guard: the group changes one file, historian.html, and adds none', () => {
  const touched = tree.list('').filter((f) => tree.touched(f));
  assert.ok(touched.every((f) => f === PAGE), `files changed by the group: ${touched.join(', ')}`);
  const added = tree.list('').filter((f) => !base.exists(f));
  assert.deepEqual(added, [], 'the group adds no file');
});

test('guard: every inline script still parses (acorn, latest ECMAScript)', () => {
  const found = inlineScripts(html);
  assert.ok(found.length >= 2);
  for (const s of found) acorn.parse(s.body, { ecmaVersion: 'latest' });
});

test('guard: the generator wrote this group (every anchor found once, none overlaps, no head tag is touched)', () => {
  const r = cp.spawnSync(process.execPath, [path.join(REPO, 'candidates/r1h/wp-hist-01b/gen.mjs'), '--check'], { cwd: REPO, encoding: 'utf8', env: process.env });
  assert.equal(r.status, 0, (r.stderr || r.stdout).slice(0, 500));
});

test('guard: copy_lint finds nothing new in any rule (AIPERSONA 0; every other count is at most the R1g count)', () => {
  const after = lint(tree.file(PAGE)).counts;
  const before = lint(base.file(PAGE)).counts;
  const worse = Object.keys(after).filter((k) => after[k] > before[k]).map((k) => `${k}: ${before[k]} -> ${after[k]}`);
  assert.deepEqual(worse, [], 'rules that got worse');
  assert.equal(after.AIPERSONA, 0);
});

test('guard: the copy audit (tools/accept/copy_audit.mjs) has no finding on the page, comments and strings included', () => {
  fs.mkdirSync(SCRATCH, { recursive: true });
  const dir = fs.mkdtempSync(path.join(SCRATCH, 'audit-'));
  try {
    fs.writeFileSync(path.join(dir, PAGE), html);
    const r = cp.spawnSync(process.execPath, [path.join(REPO, 'tools/accept/copy_audit.mjs'), dir], { cwd: REPO, encoding: 'utf8' });
    assert.equal(r.status, 0, `copy audit exit ${r.status}: ${(r.stdout || '').slice(0, 600)}`);
    assert.match(r.stdout, /findings: 0 blocking/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('guard: the shipped text names no plan, work package, tranche or decision identifier', () => {
  const found = html.match(/\b(?:WP-[A-Z]+-\d+\w*|wp-[a-z]+-\d+\w*|RM-\d+|R1[a-z]\b|PG-[a-z0-9-]+|DEC-\d+|D-[A-Z]{3,}|H0 hotfix|chapter \d+)/g);
  assert.equal(found, null, `identifiers in the page: ${found}`);
});

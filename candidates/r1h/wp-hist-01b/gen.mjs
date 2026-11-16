#!/usr/bin/env node
// Writes candidates/r1h/wp-hist-01b/group.json: the page group PG-r1h-wp-hist-01b for historian.html (Ask the Historian).
//
//   node candidates/r1h/wp-hist-01b/gen.mjs            write group.json
//   node candidates/r1h/wp-hist-01b/gen.mjs --check    regenerate in memory; fail unless group.json is byte-identical, every anchor is found exactly
//                                                      once in release/R1g/dist/historian.html (R1H_BASE changes the base), no two anchors overlap,
//                                                      and no anchor touches a head tag
//
// What the group does (backlog wp-hist-01b, chapter 14 WP-HIST-01 "H0 hotfix", catalogue rows 9 and 10 of chapter 11 Appendix A):
//   1. the question field is 16 px and has a visible label (<label for="ask">)             patches css-row, css-input, css-new, html-label
//   2. a polite live region receives the answer count or the no-result sentence            patches css-new, html-regions, js-helpers, js-answers
//   3. a failed load of any of the 15 data files shows an inline message with a Retry
//      button; the button reads all 15 files again                                          patches css-new, html-regions, js-load, js-greeting
//   4. the first-person lines are replaced by the catalogue wording                         patches js-answers (no result), js-greeting
//
// Rules this file keeps (copy audit and the style guide apply to everything the repl strings contain, comments included):
//   * no word of the copy audit (AI, assistant, agent, prompt, generated, ...), no plan or work-package identifier, no mention of how the page was made;
//   * typographic quotes and apostrophes in every sentence a visitor reads; a single character for an ellipsis; no first person;
//   * the head of the page (title, description, og and twitter tags, canonical, JSON-LD, the clock script) is not touched: the only head element
//     any anchor may fall inside is the <style> block (the field size and the new rules live there, as every earlier page group did).
// Anchors are exact strings of release/R1g/dist/historian.html and stay clear of the text that wp-seo-04b (head meta tags) and wp-seo-11b
// (the footer mount line) change, so the three groups can be applied in either order.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(HERE, '..', '..', '..');
export const BASE_DIR = process.env.R1H_BASE || 'release/R1g/dist';
export const BASE_PAGE = path.join(REPO, BASE_DIR, 'historian.html');
export const GROUP_FILE = path.join(HERE, 'group.json');
export const GROUP_NAME = 'PG-r1h-wp-hist-01b';
const ID = (s) => `r1h-wp-hist-01b-${s}`;

// ---------------------------------------------------------------------------------------------------------------------------------
// Written with String.raw so every backslash is the one that lands in the page.  No block below holds a backtick or a ${ sequence.
const P = [];
const add = (id, find, repl, expect, note) => P.push({ id: ID(id), target: 'historian.html', find, repl, expect, note });

// ---- 1. field size, wrapping row, new rules ------------------------------------------------------------------------------------
add('css-row',
  String.raw`#ask-row { position: sticky; bottom: 0; display: flex; gap: 10px;`,
  String.raw`#ask-row { position: sticky; bottom: 0; display: flex; flex-wrap: wrap; gap: 6px 10px;`,
  1,
  'the sticky bar (line 82) wraps so the label takes its own line above the field and the Ask button; the row gap is 6 px, the column gap stays 10 px');

add('css-input',
  String.raw`#ask { flex: 1; padding: 14px 18px; font-size: 15px;`,
  String.raw`#ask { flex: 1; min-width: 0; padding: 14px 18px; font-size: 16px;`,
  1,
  'the field (line 83) is 16 px (no zoom on focus in iOS Safari); min-width 0 lets it share the second line with the button on a 320 px screen');

add('css-new',
  '  #loading { font-family: sans-serif; color: var(--muted); padding: 20px 0; }\n',
  '  #loading { font-family: sans-serif; color: var(--muted); padding: 20px 0; }\n' +
  String.raw`  .hx-label { flex: 0 0 100%; font-family: sans-serif; font-size: 13px; line-height: 1.4; color: var(--muted); }
  .hx-sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; border: 0; overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; }
  .hx-fail { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 16px; margin: 20px 0; padding: 14px 18px; background: var(--panel); border: 1px solid var(--line); border-left: 3px solid var(--gold); border-radius: 10px; font-family: sans-serif; font-size: 14px; line-height: 1.6; color: var(--ink); }
  .hx-fail p { flex: 1 1 240px; margin: 0; }
  .hx-retry { min-width: 44px; min-height: 44px; padding: 0 22px; border: none; border-radius: 10px; background: var(--gold); color: #0a0a14; font-family: sans-serif; font-size: 14px; font-weight: bold; cursor: pointer; }
  .hx-retry:focus-visible { outline: 2px solid #c9a24b; outline-offset: 2px; }
`,
  1,
  'new rules after the #loading rule (line 86): the visible label, the visually hidden live region, the failure box and the Retry button (44 px target, 2 px focus outline)');

// ---- 2. markup -------------------------------------------------------------------------------------------------------------------
add('html-regions',
  '  <div id="loading">Loading the battle\'s records&hellip;</div>\n',
  '  <div id="loading">Loading the battle\'s records&hellip;</div>\n' +
  '  <div id="load-error" role="alert"></div>\n' +
  '  <div id="hx-status" class="hx-sr" role="status" aria-live="polite" aria-atomic="true"></div>\n',
  1,
  'line 106: the container of the failure message (an alert, empty until a load fails) and the polite live region (visually hidden, present from the first paint so that a screen reader watches it)');

add('html-label',
  String.raw`    <input id="ask" type="text" aria-label="Ask the Historian a question" placeholder=`,
  '    <label class="hx-label" for="ask">Ask the Historian a question</label>\n' +
  String.raw`    <input id="ask" type="text" placeholder=`,
  1,
  'line 110: the visible label carries the words of the old aria-label, which goes (the label names the field; the visible and the spoken name are the same)');

// ---- 3. the load: one place reads the 15 files, a failure waits for Retry -------------------------------------------------------------
const LOAD_FIND = String.raw`  const [oobResults, vigResults, chronResults, terrain] = await Promise.all([
    Promise.all(OOB_FILES.map(f => fetch('/data/oob/' + f).then(r => r.json()))),
    Promise.all(VIGNETTE_FILES.map(f => fetch('/data/' + f).then(r => r.json()))),
    Promise.all(CHRON_FILES.map((f, i) => fetch('/data/' + f).then(r => r.json()).then(d => ({ day: i + 1, ...d, events: (d.events || []).map(e => (e && e.tick ? { ...e, time: GTBGTime.f(e.tick, 'compat') } : e)) })))),
    fetch('/data/terrain.json').then(r => r.json()),
  ]);
`;
const LOAD_REPL = String.raw`  // The 15 data files are read through getJSON(), so a failed request, an error status or a file that is not a JSON object ends the load in
  // one place.  The page then shows a message with a Retry button; pressing it reads all the files again.
  const loadingEl = document.getElementById('loading');
  const errorEl = document.getElementById('load-error');
  const statusEl = document.getElementById('hx-status');
  function getJSON(url) {
    return fetch(url).then(r => {
      if (!r.ok) throw new Error(url + ': HTTP ' + r.status);
      return r.json();
    }).then(d => {
      if (d === null || typeof d !== 'object') throw new Error(url + ': not a JSON object');
      return d;
    });
  }
  function loadRecords() {
    return Promise.all([
      Promise.all(OOB_FILES.map(f => getJSON('/data/oob/' + f))),
      Promise.all(VIGNETTE_FILES.map(f => getJSON('/data/' + f))),
      Promise.all(CHRON_FILES.map((f, i) => getJSON('/data/' + f).then(d => ({ day: i + 1, ...d, events: (d.events || []).map(e => (e && e.tick ? { ...e, time: GTBGTime.f(e.tick, 'compat') } : e)) })))),
      getJSON('/data/terrain.json'),
    ]);
  }
  // Shows the failure message where the loading line was and settles when Retry is pressed (once: the button is disabled at the first press).
  // After a press the new button takes focus, because the one that was pressed is gone.
  function waitForRetry(refocus) {
    return new Promise(resolve => {
      const box = document.createElement('div');
      box.className = 'hx-fail';
      const note = document.createElement('p');
      note.textContent = 'The battle’s records couldn’t be loaded. Check your connection and try again.';
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'hx-retry';
      retry.textContent = 'Retry';
      retry.addEventListener('click', () => {
        if (retry.disabled) return;
        retry.disabled = true;
        errorEl.textContent = '';
        loadingEl.style.display = '';
        resolve();
      });
      box.appendChild(note);
      box.appendChild(retry);
      loadingEl.style.display = 'none';
      errorEl.textContent = '';
      errorEl.appendChild(box);
      if (refocus) retry.focus();
    });
  }
  let records = null, retried = false;
  while (!records) {
    try { records = await loadRecords(); }
    catch (err) { await waitForRetry(retried); retried = true; }
  }
  const [oobResults, vigResults, chronResults, terrain] = records;
`;
add('js-load', LOAD_FIND, LOAD_REPL, 1,
  'lines 131-136: the one Promise.all of the 15 fetches becomes getJSON + loadRecords inside a retry loop; every later line of the script is unchanged and still sees oobResults, vigResults, chronResults and terrain');

// ---- 2 again. the live region -------------------------------------------------------------------------------------------------------
add('js-helpers',
  '  function ask(query) {\n',
  String.raw`  // The polite live region (#hx-status) gets one short sentence per question: how many answers, or that nothing matched.
  const COUNT_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  function say(text) {
    if (statusEl) statusEl.textContent = text;
  }
  function brief(text) {
    return text.length > 60 ? text.slice(0, 59).trim() + '…' : text;
  }

  function ask(query) {
`,
  1,
  'line 244: say(), brief() and the count words, placed before ask()');

// ---- 4. the no-result wording (catalogue row 10) and the count ------------------------------------------------------------------------------
add('js-answers-none',
  String.raw`      addMsg('bot', "I couldn't find anything specific about that in the regimental records, stories, chronology, or terrain data. Try a regiment name (e.g. \"1st Minnesota\"), a place (\"Devil's Den\"), or a moment (\"Pickett's Charge\").");
`,
  String.raw`      addMsg('bot', 'Nothing in the records matches “' + esc(query) + '”. Try a regiment (1st Minnesota), a place (Devil’s Den), or a moment (Pickett’s Charge).');
      say('Nothing in the records matches “' + brief(query) + '”.');
`,
  1,
  'line 253: the first-person no-result line becomes the catalogue sentence (row 10); the question is escaped; the live region gets the sentence without the advice');

add('js-answers-count',
  String.raw`    for (const { e } of ranked) {
      const out = e.render();
      addMsg('bot', out.html, out);
    }
    settle(asked);
  }
`,
  String.raw`    for (const { e } of ranked) {
      const out = e.render();
      addMsg('bot', out.html, out);
    }
    say((COUNT_WORDS[ranked.length] || ranked.length) + (ranked.length === 1 ? ' answer' : ' answers') + ' for “' + brief(query) + '”, above the question box.');
    settle(asked);
  }
`,
  1,
  'lines 257-262: after the answers are in the transcript the live region says how many there are');

add('js-greeting',
  String.raw`  addMsg('bot', "I'm ready. Ask me about a regiment, a commander, a place on the battlefield, or a specific moment.");
})();`,
  String.raw`  addMsg('bot', 'Ask about a regiment, a commander, a place, or a moment.');
  if (retried) askEl.focus({ preventScroll: true });
})();`,
  1,
  'lines 274-275: the first-person greeting becomes the catalogue sentence (row 10); after a successful Retry the question field takes focus, because the pressed button is gone');

// ---------------------------------------------------------------------------------------------------------------------------------
export const GROUP = {
  group: GROUP_NAME,
  train: 'R1h',
  optional: true,
  description: 'Ask the Historian page (historian.html), backlog wp-hist-01b: the question field is 16 px with a visible label; a polite live region receives the answer count or the no-result sentence; a failed load of any of the 15 data files shows an inline message with a Retry button that reads them all again; the first-person lines carry the catalogue wording (rows 9 and 10 of chapter 11, Appendix A). Head tags are not touched. Superseded when the candidate page of WP-HIST-11 ships.',
  patches: P,
};

export function render() { return JSON.stringify(GROUP, null, 1) + '\n'; }

// ---------------------------------------------------------------------------------------------------------------------------------
// checks (the builder's own applier asserts the counts again when the group is applied)
function headParts(html) {
  const a = html.indexOf('<head>'), b = html.indexOf('</head>');
  if (a < 0 || b < 0) throw new Error('page has no <head> block');
  return { start: a, end: b + '</head>'.length, styleStart: html.indexOf('<style>'), styleEnd: html.indexOf('</style>') + '</style>'.length };
}

export function check(html) {
  const problems = [];
  const spans = [];
  for (const p of GROUP.patches) {
    const n = html.split(p.find).length - 1;
    if (n !== p.expect) problems.push(`${p.id}: found ${n} time(s), expected ${p.expect}`);
    if (n === 1) spans.push({ id: p.id, from: html.indexOf(p.find), to: html.indexOf(p.find) + p.find.length });
  }
  spans.sort((x, y) => x.from - y.from);
  for (let i = 1; i < spans.length; i++) if (spans[i].from < spans[i - 1].to) problems.push(`anchors overlap: ${spans[i - 1].id} and ${spans[i].id}`);
  const h = headParts(html);
  for (const s of spans) {
    const inHead = s.from >= h.start && s.to <= h.end;
    const straddles = (s.from < h.start && s.to > h.start) || (s.from < h.end && s.to > h.end);
    if (straddles) problems.push(`${s.id}: the anchor crosses the <head> boundary`);
    if (inHead && !(s.from >= h.styleStart && s.to <= h.styleEnd)) problems.push(`${s.id}: the anchor lies in the head outside the <style> block`);
  }
  for (const p of GROUP.patches) {
    if (/\{\{[A-Z_]+\}\}/.test(p.repl)) problems.push(`${p.id}: repl holds a {{PLACEHOLDER}} sequence`);
    if (!/^r1h-wp-hist-01b-[a-z0-9-]+$/.test(p.id)) problems.push(`${p.id}: bad patch id`);
  }
  return problems;
}

function main(argv) {
  const html = fs.readFileSync(BASE_PAGE, 'utf8');
  const problems = check(html);
  if (argv.includes('--check')) {
    let disk = '';
    try { disk = fs.readFileSync(GROUP_FILE, 'utf8'); } catch { problems.push('group.json does not exist'); }
    if (disk && disk !== render()) problems.push('group.json is not what gen.mjs writes (run gen.mjs)');
    if (problems.length) { console.error(problems.map((x) => '  ' + x).join('\n')); console.error(`FAIL: ${problems.length} problem(s)`); return 1; }
    console.log(`ok: ${GROUP.patches.length} patches, every anchor found once in ${path.relative(REPO, BASE_PAGE)}, none overlaps, no head tag is touched, group.json is current`);
    return 0;
  }
  if (problems.length) { console.error(problems.map((x) => '  ' + x).join('\n')); console.error(`FAIL: ${problems.length} problem(s); group.json not written`); return 1; }
  fs.writeFileSync(GROUP_FILE, render());
  console.log(`wrote ${path.relative(REPO, GROUP_FILE)}: ${GROUP.patches.length} patches`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(main(process.argv.slice(2)));

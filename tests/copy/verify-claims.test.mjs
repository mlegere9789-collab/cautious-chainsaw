// Adversarial verifier tests for the trust pages and the guide: statements that go beyond, or against, the evidence in the repository.
// Each test FAILS today (defects found by an independent read, see tmp/verify-copy/) and goes green when the text or the evidence is fixed.
//   node --test "tests/copy/verify-*.test.mjs"
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { REPO } from '../../tools/copy/lib/lint.mjs';

const read = (p) => fs.readFileSync(path.join(REPO, p), 'utf8');
const textOf = (html) => html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&rsquo;|&#8217;/g, '’').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const trust = (n) => read(`candidates/trust-pages/${n}.html`);

test('VER-CLAIM-01: Esc closes the cards in the order the patches build (tour first, then the story card, then the event card), not the reverse', () => {
  // evidence: tools/t0/patches/A2.json: rank 1 event card, rank 2 story card, rank 3 tour panel; GtbgEsc sorts by rank DESCENDING and clicks the first close button.
  const a2 = JSON.parse(read('tools/t0/patches/A2.json'));
  const rank = (id) => Number(/rank (\d)/.exec(a2.patches.find((p) => p.id === id).note)[1]);
  const ranks = { event: rank('A2-event-card-esc'), story: rank('A2-story-card-esc'), tour: rank('A2-tour-panel-esc') };
  const helpers = a2.patches.find((p) => p.id === 'A2-helpers').repl;
  assert.match(helpers, /sort\(\(p,q\)=>Number\(q\.getAttribute\("data-gtbg-card"\)\)-Number\(p\.getAttribute\("data-gtbg-card"\)\)\)/, 'the Esc handler no longer sorts descending: re-derive the expected order');
  const expected = Object.entries(ranks).sort((a, b) => b[1] - a[1]).map(([k]) => k);   // tour, story, event
  assert.deepEqual(expected, ['tour', 'story', 'event']);
  const orderIn = (text) => {
    const s = /Esc closes the topmost one first:([^.]*)\./.exec(text);
    assert.ok(s, 'the Esc sentence was not found');
    const idx = { event: s[1].indexOf('event card'), story: s[1].indexOf('story card'), tour: s[1].indexOf('tour') };
    return Object.entries(idx).sort((a, b) => a[1] - b[1]).map(([k]) => k);
  };
  const features = JSON.parse(read('tools/guide/features.json')).hotkeys.find((h) => h.id === 'escape').text;
  assert.deepEqual(orderIn(features), expected, `features.json escape.text says: ${features}`);
  assert.deepEqual(orderIn(textOf(trust('accessibility'))), expected, 'the Accessibility Statement keyboard table');
  assert.deepEqual(orderIn(textOf(read('candidates/user-guide/index.html'))), expected, 'the user guide');
});

test('VER-CLAIM-02: Corrections does not state as current practice what Standard of Care marks "Not yet in place" (every disagreement is shown)', () => {
  const soc = textOf(trust('standard-of-care'));
  assert.match(soc, /Every disagreement is shown\. Not yet in place/, 'card 4 changed status: re-check this test');
  const corr = textOf(trust('corrections'));
  assert.ok(!/the page shows the range and the sources instead of picking a winner/i.test(corr), 'Corrections: "Where historians disagree, the page shows the range and the sources instead of picking a winner" is a present-tense practice the Standard of Care says is not in place');
});

test('VER-CLAIM-03: Contact does not promise "no tracking" or "the only script" while production injects the Netlify RUM script into every page', () => {
  const drift = read('docs/baseline-drift.md');
  assert.match(drift, /netlify-rum-container/, 'evidence moved: docs/baseline-drift.md section 2 records the injected script');
  const privacy = textOf(read('baseline/dist/privacy.html'));
  assert.match(privacy, /Real User Monitoring \(Netlify\)/);
  const contact = textOf(trust('contact'));
  assert.ok(!/no tracking/i.test(contact), 'Contact says "no tracking"');
  assert.ok(!/(?:only script it loads|nothing from other sites)/i.test(contact), 'Contact says the shared menu is the only script it loads / it loads nothing from other sites');
});

test('VER-CLAIM-04: a statement labelled "Documented" has its page and scan recorded (the page defines the label that way, STYLEGUIDE section 9 requires it)', () => {
  const sources = textOf(trust('sources'));
  assert.match(sources, /Documented A verbatim passage or a figure printed in a named source, with page and scan\./);
  const row = /Documented The Union total of 23,049[^]*?Computed/.exec(sources)[0];
  assert.ok(!/still to be confirmed/.test(row), `the only "Documented" example says: "${row.slice(0, 220)}..."`);
});

test('VER-CLAIM-05: the FAQ says what the Historian page says (search-and-synthesis tool, not a live AI model), without dropping "synthesis"', () => {
  const hist = textOf(read('baseline/dist/historian.html'));
  const said = /([^.]*not a live AI model[^.]*)\./.exec(hist)[1];
  assert.match(said, /search-and-synthesis/);
  const faq = textOf(trust('faq'));
  const q3 = /Does Ask the Historian use AI\?([^]*?)Can I|Does Ask the Historian use AI\?([^]*?)How exact/.exec(faq)[0];
  assert.ok(!/its page says it is a search of the site’s records, not an AI/.test(q3), `FAQ Q3 paraphrases the page as: ${q3.slice(0, 260)}`);
});

test('VER-CLAIM-06: the Changelog page does not talk about "this guide" or "the style guide" (copied from the guide)', () => {
  const t = textOf(trust('changelog'));
  assert.ok(!/\bthis guide\b/i.test(t), 'Changelog: "Everything in this guide was checked..." / "This guide uses the names..."');
  assert.ok(!/\bstyle guide\b/i.test(t), 'Changelog mentions the internal style guide to visitors');
});

test('VER-CLAIM-07: Standard of Care headings are whole phrases (commitment 7 is split across the heading and the next paragraph)', () => {
  const heads = [...trust('standard-of-care').matchAll(/<h2>([\s\S]*?)<\/h2>/g)].map((m) => textOf(m[1]).replace(/\s*(Not yet in place|Partly in place|In place)\s*$/, ''));
  for (const h of heads) assert.ok(!/[,;:]$/.test(h), `heading ends mid-sentence: "${h}"`);
});

test('VER-CLAIM-08: "Today ... the Casualty Dashboard says its curves are modelled" is true of release R1c only; the live dashboard has no such note, so the sentence must say R1c', () => {
  assert.ok(!/modell?ed/i.test(read('baseline/dist/dashboard.html')), 'evidence moved: the live dashboard now carries a model note');
  const soc = textOf(trust('standard-of-care'));
  const s = /Today\. Several pages carry a plain-language note:[^.]*\./.exec(soc)[0];
  assert.match(s, /R1c/, `the sentence is not qualified: ${s}`);
});

test('VER-CLAIM-09: the keyboard reference does not say B or S "closes" a panel that, in release R1c, only Esc (or the close button) closes', () => {
  // evidence: the R1c key handler returns early for every key but Escape while a [role=dialog][aria-modal=true] is open, and S types into the
  // Search field it just focused; measured in Chrome on the built release (tmp/verify-copy/keys-verify2.mjs): a second B leaves Bookmarks open.
  const f = JSON.parse(read('tools/guide/features.json')).hotkeys;
  const text = (id) => f.find((h) => h.id === id).text;
  assert.ok(!/closes/.test(text('panel-bookmarks')), `B: "${text('panel-bookmarks')}"`);
  assert.ok(!/closes/.test(text('panel-search')), `S: "${text('panel-search')}"`);
});

test('VER-CLAIM-10: About does not say "Nothing on this site asks to be taken on trust" while Standard of Care says 0 of 8 commitments hold and no position row records its source', () => {
  const soc = textOf(trust('standard-of-care'));
  assert.match(soc, /Today, 0 of the 8 hold fully/, 'Standard of Care changed: re-check this test');
  const about = textOf(trust('about'));
  assert.ok(!/Nothing on this site asks to be taken on trust/i.test(about), 'About states as fact the design intent of the pitch ("It does not ask visitors to trust the site"), which the Standard of Care page says is not in place');
});

test('VER-CLAIM-11: a promise about how the owner will treat visitors’ email addresses is sourced or waits for the owner’s confirmation like the response targets do', () => {
  const html = trust('contact');
  const p = /<p([^>]*)>Your email address is used only to reply\./.exec(html);
  assert.ok(p, 'the sentence moved: re-check this test');
  assert.ok(/data-source=|data-owner-input=/.test(p[1]) || /\[OWNER TO CONFIRM:[^\]]*email address/.test(html), 'Contact: "Your email address is used only to reply. A correction is credited to you only if you say you agree." has no source and no [OWNER TO CONFIRM] marker');
});

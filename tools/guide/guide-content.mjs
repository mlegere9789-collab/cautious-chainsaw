// Content of the user guide. Everything about the app comes from tools/guide/features.json (checked against release train R1c by
// check-parity.mjs before a build); the explanatory text is written here, in the voice of docs/content/STYLEGUIDE.md, and the
// whole output is linted strictly (copy_lint, zero findings, warnings included).
import { esc, num, src, table, longDate } from '../copy/trust/template.mjs';
// a short table is kept whole on one page (the PDF would otherwise leave its header row alone at the foot of a page)
const T = (o) => table({ keep: o.rows.length <= 3, ...o });
import { typo } from '../copy/trust/pages.mjs';

const F = 'data-src/build/facts.json';
const FEAT = 'tools/guide/features.json';
const NOTES = 'ops/release-notes/R1c.md';

const SINCE_LABEL = (s) => (s && s !== 'baseline' ? `<span class="since" data-source="${FEAT}#since">Since ${esc(s)}</span>` : '');
const sinceNote = (obj) => Object.entries(obj || {}).map(([k, v]) => `<span class="since" data-source="${FEAT}#since">Since ${esc(k)}</span> ${esc(typo(v))}`).join(' ');
const fmt = (t) => esc(typo(t)).replace(/\{([a-z]+)\}/g, '<code>$1</code>');
const allowAttr = (list) => (list && list.length ? ` data-lint-allow="${esc(list.join(','))}"` : '');

/** the group titles the R1c menu shows, mapped to the style guide's wording */
const GROUP_TITLE = { Explore: 'Explore', Learn: 'Learn', 'Data & Records': 'Data and Records', 'Experience It': 'Experience It', Share: 'Share' };

export function buildGuide({ features, facts, cfg, nav, anchors }) {
  const f = (p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), facts);
  const n = (p) => num(f(p));
  const rel = features.release;
  const hot = features.hotkeys.filter((h) => !h.removed_in);
  const removed = features.hotkeys.filter((h) => h.removed_in);
  const sections = [];
  const add = (id, title, html) => sections.push({ id, title, html });
  const keyTable = (items, caption, withSection) => T({
    caption, headers: ['Key', 'What it does', 'Since'],
    rows: items.map((k) => [`<kbd>${esc(k.keys)}</kbd>`, `<span${src(FEAT + '#hotkeys.' + k.id)}>${esc(typo(k.text))}${k.since_note ? ' ' + sinceNote(k.since_note) : ''}</span>`, k.since === 'baseline' ? 'Original site' : esc(k.since === 'R1a' && k.help_since ? `${k.since} (Help row ${k.help_since})` : k.since)]),
    stack: false,
  });
  const section = (name) => hot.filter((h) => h.section === name);

  // ---------------------------------------------------------------------------------------------------------------- 1
  add('about-guide', 'About this guide', `
<p data-source="${FEAT}#release">This guide describes release R1c of the Gettysburg Interactive Map, the build the project calls Tranche 0. That release has not been released: ${esc(rel.status.replace(/^built and tested locally, not deployed \(.*\)$/, 'it is built and tested locally and is not deployed'))}. The guide documents what that release does, not what is planned.</p>
<p>The map follows the Battle of Gettysburg, July 1–3, 1863. It places <span${src(F + '#units.regiments', F + '#units.batteries')}>${n('units.regiments')} regiments and ${n('units.batteries')} batteries</span> on the field and moves them through <span${src(F + '#ticks.total')}>${n('ticks.total')} moments</span>, with <span${src(F + '#content.vignettes')}>${n('content.vignettes')} written stories</span> and a chronology of <span${src(F + '#content.chronology_events')}>${n('content.chronology_events')} events</span>.</p>
<h3>Since-version notes</h3>
<p>Some behaviour is newer than the site that was live on September 30, 2026. Each such item carries a note that says when it arrived:</p>
${T({ keep: true, caption: 'What the since notes mean', headers: ['Note', 'Meaning'], rows: Object.entries(features.since).map(([k, v]) => [k === 'baseline' ? 'No note' : `<span class="since">Since ${esc(k)}</span>`, `<span data-source="${FEAT}#since">${esc(typo(v))}</span>`]), stack: false })}
<h3>How this guide was checked</h3>
<ul>
<li data-source="tools/guide/check-parity.mjs">Every key and gesture in this guide is compared, by a script, with the Help dialog that release R1c shows, with the key handler of the app, with the site menu and with the heading of each page. A difference stops the build of this guide.</li>
<li data-source="${NOTES}">${esc(typo(features.known_differences.find((k) => k.id === 'kd-testing').text))}</li>
</ul>`);

  // ---------------------------------------------------------------------------------------------------------------- 2
  add('start', 'Start here', `
<p data-source="tools/t0/patches/C.json#mob:HF-5a ${FEAT}#deeplinks.params.layout">Open the map in a web browser. On a computer you see the whole toolbar and the playback bar. On a phone or a touch tablet up to 834 pixels wide, and on a phone held sideways, you see the phone layout instead. <span data-source="${FEAT}#deeplinks.params.layout">${sinceNote({ R1b: 'The layout is chosen automatically. Add ?layout=desktop or ?layout=mobile to the address to force one.' })}</span></p>
<ol>
<li><strong>Play.</strong> Press Space on a computer, or the play button on a phone. The map plays through time and the units move.</li>
<li><strong>Pause.</strong> Press Space again, or the play button.</li>
<li><strong>Step.</strong> Press the Right arrow to move forward one moment and the Left arrow to move back one. On a phone use the two step buttons.</li>
<li data-source="${FEAT}#hotkeys.day-1 ${FEAT}#gestures.g-days"><strong>Jump to a day.</strong> Press 1, 2 or 3 to go to the start of July 1, 2 or 3. On a phone use the three day buttons.</li>
<li><strong>Look at a unit.</strong> Click it, or tap it, to see its details.</li>
</ol>
<p>The Help panel lists the keys. Press ? on a computer, or open Help from the toolbar or the Tools sheet.</p>
<p><strong>A moment is not a fixed length of time.</strong> The map has <span${src(F + '#ticks.total')}>${n('ticks.total')} moments</span>. They are steps through the story, and the time between two moments is not the same everywhere. The section About the clock explains what that means for the times you see.</p>`);

  // ---------------------------------------------------------------------------------------------------------------- 3
  add('time', 'Move through time', `
<p>These keys work on a computer, also after you click or drag on the map: a press on the map hands keyboard focus back to the page. A key that is typed into a text field goes to the field instead.</p>
${keyTable(section('Time'), 'Keys for time')}
${keyTable(section('Speed'), 'Keys for speed')}
<p data-source="${FEAT}#hotkeys.speed-reset">The speed starts at 1 times. The speed label reads 1x (base speed) <span class="since">Since R1c</span>; it no longer describes the speed as a clock rate, because the playback is a time-lapse.</p>
<h3>On a phone</h3>
${T({ caption: 'Controls of the phone layout', headers: ['Control', 'What it does', 'Since'], rows: features.gestures.filter((g) => g.section === 'Time').map((g) => [esc(g.keys), `<span${src(FEAT + '#gestures.' + g.id)}>${esc(typo(g.text))}</span>`, esc(g.since)]), stack: false })}
<p data-source="${FEAT}#hotkeys.hour-forward"><strong>12 moments are not always one hour.</strong> The Help panel calls the Shift and arrow keys one hour. They move 12 moments. Because the moments are not evenly spaced in time, that is not one hour of battle time everywhere.</p>`);

  // ---------------------------------------------------------------------------------------------------------------- 4
  add('explore', 'Explore the map', `
<h3>Move and select</h3>
${keyTable(section('Map'), 'Mouse and keys for the map')}
<p data-source="${FEAT}#hotkeys.map-keyboard">If you use only the keyboard, press Tab until the map has focus. The arrow keys then pan the map instead of stepping through time, plus and minus zoom, and Shift with an arrow rotates and tilts. Esc gives the keys back. <span class="since">Since R1a</span></p>
<h3>Panels</h3>
${keyTable(section('Panels'), 'Keys that open panels')}
${removed.map((r) => `<p data-source="${FEAT}#hotkeys.${r.id}"><strong>Removed.</strong> ${esc(typo(r.text))}</p>`).join('')}
<h3>The toolbar on a computer</h3>
<p data-source="${FEAT}#toolbar">The toolbar buttons, in order, are named below as they read in release R1c. This guide describes the ones whose behaviour the Help text, the release notes or a test establishes; the others are named and not described.</p>
${T({ caption: 'Toolbar buttons', headers: ['Button', 'What it does'], rows: features.toolbar.buttons.map((b) => [`<span data-lint-allow="NAME">${esc(typo(b))}</span>`, esc(typo(features.toolbar.documented[b] || 'Not described in this guide.'))]), stack: false })}
<h3>On a phone</h3>
${T({ caption: 'Other controls of the phone layout', headers: ['Control', 'What it does', 'Since'], rows: features.gestures.filter((g) => g.section !== 'Time').map((g) => [esc(g.keys), `<span${src(FEAT + '#gestures.' + g.id)}>${esc(typo(g.text))}</span>`, esc(g.since)]), stack: false })}`);

  // ---------------------------------------------------------------------------------------------------------------- 5
  const groups = [...new Set(nav.groups.map((g) => g.name))];
  const toolRows = (gname) => features.tools.filter((t) => t.group === gname).map((t) => {
    const item = nav.groups.flatMap((g) => g.items).find((i) => i.id === t.id);
    const differs = item && item.label !== t.canonical;
    return [`<strong>${esc(t.canonical)}</strong>${differs ? ` <span class="onscreen" data-lint-allow="NAME">(on screen: ${esc(typo(item.label))})</span>` : ''}`, `<span${src(FEAT + '#tools.' + t.id)}>${esc(typo(t.text))}</span>`];
  });
  add('more', 'More to Explore', `
<p><span data-lint-allow="NAME">The menu that lists these pages is called Extra Features on screen in release R1c</span>; the style guide settles on More to Explore. On a computer the button is at the top right of the map. On a phone the pages are in the Tools sheet. Each page has a link back to the map.</p>
<p data-source="${FEAT}#tools">There are ${features.tools.length} pages in the menu in release R1c.</p>
${groups.map((g) => `<h3>${esc(GROUP_TITLE[g] || g)}</h3>${T({ caption: `Pages in the group ${esc(GROUP_TITLE[g] || g)}`, headers: ['Page', 'What it does'], rows: toolRows(g), stack: false })}`).join('\n')}
${features.tools_hidden.map((t) => `<p data-source="${FEAT}#tools_hidden"><strong>${esc(t.canonical)}.</strong> ${esc(typo(t.text))} ${esc(typo(t.since_note))}</p>`).join('')}`);

  // ---------------------------------------------------------------------------------------------------------------- 6
  const dl = features.deeplinks;
  add('share', 'Share a place and time', `
<p>The address of the map can carry a moment, a unit and a view, so that a link opens exactly there. Copy the address from the browser, or use the Copy link button where you see one.</p>
${T({ caption: 'What an address can say', headers: ['Parameter', 'What it does', 'Since'], rows: dl.params.map((p) => [`<code>${esc(p.name)}</code>${p.alias ? ` or <code>${esc(p.alias)}</code>` : ''}`, `<span${src(FEAT + '#deeplinks.params.' + p.name)}>${fmt(p.text)}</span>`, esc(p.since)]), stack: false })}
<p data-source="${FEAT}#deeplinks.note">${fmt(dl.note)}</p>
${T({ caption: 'Examples (add them to the address of the map)', headers: ['Ending', 'Result'], rows: dl.examples.map((e) => [`<code>${esc(e.query)}</code>`, `<span${src(FEAT + '#deeplinks.examples')}>${esc(typo(e.text))}</span>`]), stack: false })}`);

  // ---------------------------------------------------------------------------------------------------------------- 7
  add('clock', 'About the clock', `
<p>The map plays as a time-lapse. It covers quiet stretches faster and the fighting more slowly, so one moment is not a fixed number of minutes.</p>
<ul>
<li data-source="${F}#ticks.time_model">The map has <span>${n('ticks.total')}</span> moments. The data files declare that each moment is five minutes; an audit measured that declaration as wrong.</li>
<li data-source="data-src/time/time_anchors.json#anchors">The clock the project proposes rests on ${anchors.total} time anchors. All ${anchors.proposed} are unreviewed: no historian has checked them yet.</li>
<li data-source="${NOTES}">Release R1c changes only the date. Times can be hours off in places. Use the order of events, and the text of a story, rather than the clock.</li>
<li>Times are approximate. Sources disagree by half an hour or more, and the map plays as a time-lapse.</li>
</ul>
<p data-source="data-src/time/time_anchors.json#tz_note">There were no standard time zones in 1863. The proposed clock uses local mean time at Gettysburg.</p>`);

  // ---------------------------------------------------------------------------------------------------------------- 8
  const deskAll = hot;
  add('reference', 'Keyboard reference', `
<p>Every key of release R1c on one page. The Help panel shows the same keys.</p>
${T({ caption: 'Keys on a computer', headers: ['Key', 'What it does', 'Since'], rows: deskAll.map((k) => [`<kbd>${esc(k.keys)}</kbd>`, `<span${src(FEAT + '#hotkeys.' + k.id)}>${esc(typo(k.label))}</span>`, k.since === 'baseline' ? 'Original site' : esc(k.since)]), stack: false })}
${T({ caption: 'Controls on a phone', headers: ['Control', 'What it does', 'Since'], rows: features.gestures.map((g) => [esc(g.keys), `<span${src(FEAT + '#gestures.' + g.id)}>${esc(typo(g.label))}</span>`, esc(g.since)]), stack: false })}`);

  // ---------------------------------------------------------------------------------------------------------------- 9
  add('limits', 'Known differences and limits', `
<p>These are the places where release R1c and its own text disagree, or where something is missing. They are listed so that you are not surprised.</p>
<ul>${features.known_differences.map((k) => `<li${src(FEAT + '#known_differences.' + k.id)}${allowAttr(k.allow)}>${esc(typo(k.text))}</li>`).join('')}</ul>`);

  // ---------------------------------------------------------------------------------------------------------------- 10
  add('access', 'Using the map with a keyboard or a screen reader', `
<ul>
<li data-source="${NOTES}">Release R1b added a skip link, landmarks, labelled controls, a timeline that works as a slider with its value in words, and dialogs that keep keyboard focus. These are a bridge, not a claim of conformance to the Web Content Accessibility Guidelines.</li>
<li data-source="${FEAT}#hotkeys.select-unit">To choose a unit by keyboard, open Search with S, type in the field, press Down arrow to move into the list and Enter to choose a unit. Focus then moves to the unit’s details.</li>
<li data-source="${FEAT}#hotkeys.escape">Esc closes the topmost panel or card first.</li>
<li data-source="${FEAT}#hotkeys.play-pause">Space pauses the playback.</li>
</ul>
<p>The Accessibility Statement lists what was tested, the results and the known gaps, including that no screen reader test is on record.</p>`);

  // ---------------------------------------------------------------------------------------------------------------- 11
  add('help', 'Get help or report a mistake', `
<p>The Corrections page explains how to report a mistake in the history or the data. The Contact page has the addresses for questions, accessibility barriers and security reports. Both are written as candidate pages and are not published yet.</p>
<p>The site itself is at <a href="https://gettysburginteractivemap.com/">gettysburginteractivemap.com</a>. Its <a href="https://gettysburginteractivemap.com/privacy.html">Privacy</a> and <a href="https://gettysburginteractivemap.com/terms.html">Terms</a> pages describe what the site collects and how it may be used.</p>`);

  // ---------------------------------------------------------------------------------------------------------------- 12
  add('glossary', 'Glossary', `
${T({ caption: 'Terms this guide uses', headers: ['Term', 'Meaning'], rows: [
  ['moment', 'a point in the battle you can view on the map'],
  ['story', 'one of the written accounts of a key event'],
  ['event', 'one entry of the chronology shown on event cards'],
  ['turning point', 'a decision historians still debate'],
  ['regiment, battery', 'an infantry or cavalry regiment; an artillery battery'],
  ['order of battle', 'the list of every unit on the field and how it is organised'],
  ['casualties', 'men killed, wounded, and captured or missing, added together'],
  ['reconstruction', 'a position or time worked out from sources, not recorded directly'],
  ['time-lapse', 'the playback: faster through quiet hours, slower during the fighting'],
].map(([a, b]) => [`<strong>${esc(a)}</strong>`, esc(b)]), stack: false })}`);

  return { sections, title: 'Gettysburg Interactive Map: User Guide', subtitle: `User guide for release ${rel.train}`, asOf: cfg.asOf };
}

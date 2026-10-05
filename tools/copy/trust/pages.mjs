// Content of the eight candidate trust pages. Rules for this file (docs/content/STYLEGUIDE.md and the task brief):
//   * every number comes from the inputs (inputs.mjs) and the element that prints it carries data-source;
//   * every statement about the site is one of the checked claims of inputs.mjs, or a statement about the pitch or the plan with its file;
//   * what the owner must supply is an owner placeholder, never an invented fact;
//   * no first person plural, no clock claims, no "reviewed" claims, no developer words (copy_lint runs on the output with zero findings).
import { esc, num, src, table, longDate } from './template.mjs';

const F = 'data-src/build/facts.json';
const REG = 'data-src/sources-v2/registry.json';
const QC = 'docs/historian/sources-v2/QC-REPORT.md';
const PITCH = 'docs/pitch/PITCH.md';
const NOTES = 'ops/release-notes/R1c.md';

/** typographic clean-up of strings that come out of data files */
export function typo(s) {
  return String(s)
    .replace(/\b((?:Jan|Feb|Mar|Apr|May|June?|July?|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?) (\d{1,2})-(\d{1,2})\b/g, '$1 $2–$3')
    .replace(/ -- /g, ' — ')
    .replace(/(\w)'(\w)/g, '$1’$2')
    .replace(/(^|[\s(])'([^']+)'/g, '$1‘$2’')
    .replace(/(^|[\s(])"([^"]+)"/g, '$1“$2”')
    .replace(/\.\.\./g, '…');
}

export function buildPages({ I, cfg, publish }) {
  const { facts, reg, timeInfo, cas, help, features } = I;
  const unresolved = [];

  // ---- owner placeholders
  const ownerValue = (key) => key.split('.').reduce((a, k) => (a == null ? a : a[k]), cfg);
  const owner = (key, label) => {
    const v = ownerValue(key);
    if (typeof v === 'string' && v.trim()) return esc(v.trim());
    unresolved.push({ key, label, kind: 'provide' });
    return `<span class="owner-input" data-owner-input="${esc(key)}">[OWNER TO PROVIDE: ${esc(label)}]</span>`;
  };
  const confirmedFlag = (key) => ownerValue(`confirmations.${key}`) === true;
  const confirm = (key, label, html = '') => {
    if (ownerValue(`confirmations.${key}`) === true) return html;
    unresolved.push({ key: `confirmations.${key}`, label, kind: 'confirm' });
    return `${html} <span class="owner-input" data-owner-input="confirmations.${esc(key)}">[OWNER TO CONFIRM: ${esc(label)}]</span>`;
  };
  const mail = (key, subject, bodyLines, label) => {
    const addr = ownerValue(`contact.${key}`);
    if (typeof addr === 'string' && addr.trim()) {
      const q = `subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join('\n'))}`;
      return `<a class="btn" href="mailto:${esc(addr.trim())}?${esc(q)}">${esc(label)}</a> <span class="tp-meta">(opens your email program; the address is ${esc(addr.trim())})</span>`;
    }
    unresolved.push({ key: `contact.${key}`, label: `${key} address`, kind: 'provide' });
    return `<span class="owner-input" data-owner-input="contact.${esc(key)}">[OWNER TO PROVIDE: ${esc(key)} email address]</span>`;
  };
  const ack = cfg.targets.acknowledgeDays; const fixDays = cfg.targets.fixOrExplainDays;
  const intent = (html) => confirm('responseTargets', 'the response targets (acknowledge in 3 days, fix or explain in 30 days) are the ones you will keep', `<span${src('tools/copy/trust-config.json#targets')}>${html}</span>`);

  const n = (path) => num(I.getFact(path));
  const usedProv = new Set();
  const prov = (...rows) => rows.map(([path, note]) => { usedProv.add(path); return { path, note, sha: I.sha(path) }; });
  const J = (o) => o;
  const pages = {};

  const template = [
    'Page address:', 'What I saw:', 'What I think is wrong, and why:', 'My source (author, title, page), if I have one:', 'May I be credited in the corrections log? (yes or no)',
  ];

  // =====================================================================================================================
  // About
  pages.about = {
    slug: 'about', title: 'About', h1: 'About',
    description: `An interactive map of the Battle of Gettysburg, July 1–3, 1863: ${n('units.regiments')} regiments and ${n('units.batteries')} batteries, ${n('content.vignettes')} stories, and the sources behind them.`,
    jsonld: J({ '@context': 'https://schema.org', '@type': 'AboutPage', name: 'About the Gettysburg Interactive Map', inLanguage: 'en-US', about: { '@type': 'Event', name: 'Battle of Gettysburg', startDate: '1863-07-01', endDate: '1863-07-03' }, creator: { '@type': 'Person', name: 'Mike Legere' } }),
    provenance: prov([F, 'unit, moment, story and event counts'], ['data-src/time/time_anchors.json', 'state of the time anchors'], ['tools/t0/patches/CP.json', 'the credit line “Created by Mike Legere”'], ['docs/content/APPROVED-BIO.md', 'the creator text, owner-approved on 2026-10-04 and used as written'], ['docs/decisions/OWNER-DECISIONS-2026-10-04.md', 'owner decision 5: the creator text and the public contact address'], ['docs/content/STYLEGUIDE.md', 'the disclaimers used on this page']),
    body: `
<p class="lede"${src(F + '#units.regiments', F + '#units.batteries', F + '#ticks.total')}>The Gettysburg Interactive Map follows the Battle of Gettysburg, July 1–3, 1863, on a map. It places ${n('units.regiments')} regiments and ${n('units.batteries')} batteries (${n('units.total')} units) on the field and moves them through ${n('ticks.total')} moments across the three days.</p>
<ul class="toc"><li><a href="#what" class="tap">What it holds</a></li><li><a href="#not" class="tap">What it is not</a></li><li><a href="#who" class="tap">Who made it</a></li><li><a href="#check" class="tap">How to check it</a></li></ul>
<h2 id="what">What it holds</h2>
<p${src(F + '#content.vignettes', F + '#content.chronology_events', F + '#content.terrain_key_locations', F + '#content.tour_stops')}>Beside the units, the map holds ${n('content.vignettes')} written stories, a chronology of ${n('content.chronology_events')} events, ${n('content.terrain_key_locations')} named places on the ground, and a ${n('content.tour_stops')}-stop guided tour. Extra pages let you search the records, compare two moments, read the casualty figures corps by corps, and ask questions of the site’s own records.</p>
<h2 id="not">What it is not</h2>
<p${src(F + '#placements.rows', F + '#placements.ticks_with_rows', F + '#units.regiments_with_own_track', F + '#units.regiments')}>It is a reconstruction. Positions are reconstructed from published sources. Where a regiment’s exact place at a given time is not recorded, the map shows the best-supported position. In the data behind the map, ${n('placements.rows')} position rows cover ${n('placements.ticks_with_rows')} of the ${n('ticks.total')} moments, and ${n('units.regiments_with_own_track')} of the ${n('units.regiments')} regiments have positions of their own. The Sources and Methods page says what each kind of statement rests on.</p>
<p${src('data-src/time/time_anchors.json#anchors')}>Times are approximate. Sources disagree by half an hour or more, and the map plays as a time-lapse. The proposed clock rests on ${timeInfo.total} time anchors; none of them has yet been checked by a historian.</p>
<p>${confirm('nonAffiliation', 'the sentence that this is an independent project is true', 'This is an independent project. It is not affiliated with or endorsed by the National Park Service, the Gettysburg Foundation, the American Battlefield Trust, Mapbox or Google.')}</p>
<p>It lists regiments, not individual soldiers. To find a soldier by name, search the National Park Service’s Soldiers and Sailors System.</p>
<h2 id="who">Who made it</h2>
<p${src('tools/t0/patches/CP.json#cp:mobile-tools-footer')}>The site’s credit line reads “Created by Mike Legere.”</p>
<p class="bio"${src('docs/content/APPROVED-BIO.md', 'docs/decisions/OWNER-DECISIONS-2026-10-04.md#creator-bio-approved')}>${esc(typo(I.bio)).replace(I.publicContact, `<a href="mailto:${I.publicContact}">${I.publicContact}</a>`)}</p>
<p>Historian reviewer: ${owner('creator.reviewer', 'the name and credit of the historian who reviews the reconstruction, or the words “none yet”')}</p>
<h2 id="check">How to check it</h2>
<p>Nothing on this site asks to be taken on trust. These pages show what the map rests on and how to challenge it.</p>
<ul>
<li><a href="sources.html">Sources and Methods</a>: what the data holds, which works it names, where the sources disagree.</li>
<li><a href="standard-of-care.html">Standard of Care</a>: eight commitments the project is working toward, and which of them hold today.</li>
<li><a href="corrections.html">Corrections</a>: how to report a mistake and where corrections are logged.</li>
<li><a href="accessibility.html">Accessibility Statement</a>: what was tested, the results and the gaps.</li>
</ul>`,
  };

  // =====================================================================================================================
  // Sources and Methods
  const unionRows = cas.unionAuthorities.map((v) => [typo(v.label), num(v.total), statusWords(v.status), v.id]);
  const confRows = cas.confederateAuthorities.map((v) => [typo(v.label), num(v.total), statusWords(v.status), v.id]);
  function statusWords(s) {
    return ({
      verified_ocr: 'Checked against the OCR text of the scan; the page is still to be confirmed on the scan.',
      verified_ocr_scrambled: 'Numbers found in a scrambled OCR table; which one is killed, wounded or missing is inferred, not read.',
      secondary_unverified: 'Quoted from a secondary source; the original was not opened.',
      chapter_verified_not_rechecked: 'Checked once during planning; not checked again.',
    })[s] || typo(s);
  }
  const badgeRows = [
    ['Documented', 'A verbatim passage or a figure printed in a named source, with page and scan.'],
    ['Measured', 'A reading by an instrument or an official return.'],
    ['Computed', 'Arithmetic from documented inputs that anyone can re-run.'],
    ['Modelled', 'A stated model with stated assumptions.'],
    ['Contested', 'Sources disagree. All values are shown, ranked, with reasons.'],
    ['Unknown', 'No source in the collection says. The page says so, and says what source would.'],
  ];
  pages.sources = {
    slug: 'sources', title: 'Sources and Methods', h1: 'Sources and Methods',
    description: `What the map's data holds, which works it names, what is documented, derived or contested, and how positions, the clock and casualty figures are made.`,
    jsonld: J({ '@context': 'https://schema.org', '@type': 'WebPage', name: 'Sources and Methods', inLanguage: 'en-US', description: 'What the map’s data holds, which works it names, and how positions, the clock and casualty figures are made.' }),
    provenance: prov([F, 'counts of units, moments, stories, events and position rows; casualty bases; the statement about the time model'], ['data-src/build/data-quality-report.json', 'how many records carry a source string'], ['data-src/time/time_anchors.json', 'state of the time anchors'], ['data-src/authorities/authorities.json', 'the casualty figures listed by authority, with their status'], [REG, 'counts of the Gettysburg Sources v2 register (computed)'], [QC, 'findings of the register review'], ['tools/t0/patches/CP.json', 'the nine works the Help dialog lists (patch cp:h03 on the Help chunk)'], [PITCH, 'the six evidence labels'], [NOTES, 'how release R1c draws units between recorded positions'], ['docs/historian/CORPUS.md', 'the state of the Official Records text index']),
    body: `
<p class="lede">This page says what the map rests on. It separates what is documented from what is derived, what is contested and what is unknown, and it names the works the map cites.</p>
<ul class="toc"><li><a href="#labels" class="tap">Evidence labels</a></li><li><a href="#holds" class="tap">What the data holds</a></li><li><a href="#works" class="tap">Works named</a></li><li><a href="#kinds" class="tap">Documented, derived, contested</a></li><li><a href="#ladder" class="tap">Casualty figures</a></li><li><a href="#method" class="tap">Methods</a></li><li><a href="#register" class="tap">Source register</a></li></ul>
<h2 id="labels">Evidence labels</h2>
<p${src(PITCH + '#six-evidence-badges')}>This page uses six labels, taken from the project’s proposal for a visible evidence vocabulary. The map itself does not yet show them; they describe the data here.</p>
${table({ caption: 'The six evidence labels', headers: ['Label', 'What it promises'], rows: badgeRows.map(([a, b]) => [`<span class="badge">${a}</span>`, b]) })}
<h2 id="holds">What the data holds</h2>
${table({ caption: 'What the data files of the map hold (data version ' + esc(I.dataVersion.data_version) + ')', captionSrc: ['data-src/version.json#data_version'], headers: ['Item', 'Count', 'Note'], numeric: [1], rows: [
  [`<span${src(F + '#units.regiments')}>Regiments</span>`, `<span${src(F + '#units.regiments')}>${n('units.regiments')}</span>`, 'Alias records are not counted.'],
  [`<span${src(F + '#units.batteries')}>Batteries</span>`, `<span${src(F + '#units.batteries')}>${n('units.batteries')}</span>`, 'Horse artillery is counted as batteries.'],
  [`<span${src(F + '#units.total')}>Units in all</span>`, `<span${src(F + '#units.total')}>${n('units.total')}</span>`, `${n('units.regiments')} regiments and ${n('units.batteries')} batteries.`],
  [`<span${src(F + '#ticks.total')}>Moments</span>`, `<span${src(F + '#ticks.total')}>${n('ticks.total')}</span>`, 'Days run from moments 1, 226 and 451.'],
  [`<span${src(F + '#placements.rows')}>Position rows</span>`, `<span${src(F + '#placements.rows')}>${n('placements.rows')}</span>`, `Found on ${n('placements.ticks_with_rows')} moments; ${n('placements.ticks_without_rows')} moments have none.`],
  [`<span${src(F + '#units.regiments_with_own_track')}>Regiments with positions of their own</span>`, `<span${src(F + '#units.regiments_with_own_track')}>${n('units.regiments_with_own_track')}</span>`, `Out of ${n('units.regiments')} regiments.`],
  [`<span${src(F + '#content.vignettes')}>Stories</span>`, `<span${src(F + '#content.vignettes')}>${n('content.vignettes')}</span>`, 'Written accounts of key events.'],
  [`<span${src(F + '#content.chronology_events')}>Chronology events</span>`, `<span${src(F + '#content.chronology_events')}>${n('content.chronology_events')}</span>`, 'Shown on event cards.'],
  [`<span${src(F + '#content.terrain_key_locations')}>Named places</span>`, `<span${src(F + '#content.terrain_key_locations')}>${n('content.terrain_key_locations')}</span>`, 'Terrain key locations.'],
  [`<span${src(F + '#content.monuments', F + '#content.monuments_without_source')}>Monument records</span>`, `<span${src(F + '#content.monuments')}>${n('content.monuments')}</span>`, `${n('content.monuments_without_source')} of them carry no source.`],
] })}
<p${src('data-src/build/data-quality-report.json#provenance')} data-lint-allow="COUNT">Of the ${num(I.quality.provenance.records)} records in the data files, ${num(I.quality.provenance.with_source_string)} carry a source string (${I.quality.provenance.percent_with_source_string}%). None of the ${n('placements.rows')} position rows records where its position comes from. That gap in the evidence trail is the main reason every position is called a reconstruction.</p>
<h2 id="works">Works the map names</h2>
<p${src('tools/t0/patches/CP.json#cp:h03')}>The About tab of the Help dialog in release R1c lists ${help.works.length} works under the heading “${esc(help.heading)}”:</p>
<ol${src('tools/t0/patches/CP.json#cp:h03', 'baseline/dist/assets/HelpModal-CFV9T0zH.js')}>${help.works.map((w) => `<li>${esc(typo(w))}</li>`).join('')}</ol>
<p data-source="docs/plan/FINAL/11-copy-docs-content.md#9-works">Two of the nine are primary sources: the Official Records and Alexander’s recollections (in a 1989 edition). The others are modern books. The Help dialog does not say which work supports which statement; that link is not yet recorded in the data.</p>
<h2 id="kinds">Documented, derived, contested, unknown</h2>
${table({ caption: 'Examples of each kind of statement in the map today', headers: ['Label', 'Example', 'Why it has that label'], rows: [
  [`<span class="badge">Documented</span>`, `<span${src('data-src/authorities/authorities.json#casualties.union')}>The Union total of ${num(cas.unionAuthorities[0].total)} in the Official Records return of casualties.</span>`, 'A figure printed in a named source. The page in the scan is still to be confirmed.'],
  [`<span class="badge">Computed</span>`, `<span${src(F + '#casualties.site_figures_measured')}>The dashboard total of ${num(cas.engagementPeriods.total)}.</span>`, `It is the sum of each corps’ engagement periods: ${num(cas.engagementPeriods.union)} Union and ${num(cas.engagementPeriods.confederate)} Confederate.`],
  [`<span class="badge">Modelled</span>`, 'The strength curves of the Casualty Dashboard.', 'The page says they are modelled from each corps’ recorded engagement periods and show when losses concentrated, not observed strength.'],
  [`<span class="badge">Contested</span>`, `<span${src('data-src/authorities/authorities.json#casualties.confederate')}>The Confederate total: ${cas.confederateAuthorities.map((v) => num(v.total)).join(', ')}.</span>`, 'The sources listed in the data disagree, and none has been chosen.'],
  [`<span class="badge">Unknown</span>`, `<span${src('data-src/time/time_anchors.json#anchors')}>The exact clock time of most moments.</span>`, `All ${timeInfo.total} proposed time anchors are unreviewed, and ${timeInfo.needDecision} of them are marked as needing a historian’s decision.`],
] })}
<h2 id="ladder">Casualty figures: who said what</h2>
<p${src('docs/content/STYLEGUIDE.md#6')}>Casualties are men killed, wounded, and captured or missing, added together. The data holds more than one total, and the site has not yet decided which to headline. The figures below are listed with the source and what is known about each; none is chosen.</p>
${table({ caption: 'Union totals listed in the project’s authorities file (as of ' + esc(cas.authoritiesAsOf) + ')', captionSrc: ['data-src/authorities/authorities.json#as_of'], headers: ['Figure and source', 'Total', 'Status in the file'], numeric: [1], rows: unionRows.map(([l, t, s, id]) => [`<span${src('data-src/authorities/authorities.json#casualties.union.values.' + id)}>${esc(l)}</span>`, t, esc(s)]) })}
${table({ caption: 'Confederate totals listed in the same file', headers: ['Figure and source', 'Total', 'Status in the file'], numeric: [1], rows: confRows.map(([l, t, s, id]) => [`<span${src('data-src/authorities/authorities.json#casualties.confederate.values.' + id)}>${esc(l)}</span>`, t, esc(s)]) })}
<p${src('data-src/authorities/authorities.json#status')}>The authorities file is a candidate: nothing in it is displayed on the site yet.</p>
<p>Three bases for the combined total sit inside the site’s own data. They do not agree, and a visitor can meet each of them:</p>
${table({ caption: 'Combined totals computed from the site’s own data files', headers: ['Basis', 'Union', 'Confederate', 'Combined'], numeric: [1, 2, 3], rows: [
  [`<span${src(F + '#casualties.site_figures_measured')}>Summary fields of the casualty file</span>`, num(cas.summaryFields.union), num(cas.summaryFields.confederate), num(cas.summaryFields.total)],
  [`<span${src(F + '#casualties.site_figures_measured')}>Engagement periods (used by the Casualty Dashboard)</span>`, num(cas.engagementPeriods.union), num(cas.engagementPeriods.confederate), num(cas.engagementPeriods.total)],
  [`<span${src(F + '#casualties.site_figures_measured')}>Army totals in the order of battle</span>`, num(cas.armyHeaders.union), num(cas.armyHeaders.confederate), num(cas.armyHeaders.total)],
] })}
<h2 id="method">Methods</h2>
<h3>How positions are made</h3>
<ul>
<li${src(F + '#placements.rows', F + '#placements.ticks_with_rows')}>The order of battle lists the units. Position rows give a place at a moment for some of them: ${n('placements.rows')} rows on ${n('placements.ticks_with_rows')} of ${n('ticks.total')} moments.</li>
<li${src(NOTES)}>Between recorded positions, release R1c shows a unit at its latest recorded position at or before the moment you view. It does not move a unit smoothly between two recorded places.</li>
<li${src('tools/t0/patches/CP.json#cp:b44')}>A regiment with no positions of its own is shown with its brigade where the data has one. The release R1c text says: “This regiment has no recorded positions. It moves with its brigade.”</li>
<li>Positions are reconstructed from published sources. Where a regiment’s exact place at a given time is not recorded, the map shows the best-supported position.</li>
</ul>
<h3>How the clock works</h3>
<ul>
<li${src(F + '#ticks.time_model')}>The map has ${n('ticks.total')} moments. The data files declare that each moment is five minutes; an audit measured that declaration as wrong, so this project’s facts file carries no step length.</li>
<li${src('data-src/time/time_anchors.json#anchors', 'docs/editorial/sign-off-states.md')}>A proposed clock ties the moments to ${timeInfo.total} anchors. All ${timeInfo.total} are in the state “proposed”: not reviewed, confirmed or signed by a historian. ${timeInfo.needDecision} are marked as needing a decision.</li>
<li${src(NOTES)}>The release R1c notes record that clock labels are hours off in places, and that release changes only the date.</li>
<li>Times are approximate. Sources disagree by half an hour or more, and the map plays as a time-lapse.</li>
</ul>
<h3>How casualties are counted</h3>
<p>Casualties are men killed, wounded, and captured or missing, added together. A rate is casualties divided by the men who went into the battle, to one decimal.</p>
<h2 id="register">The source register behind Ask the Historian</h2>
<p${src(REG + '#meta.counts', QC)}>The project holds a register of ${num(reg.entries)} entries from a list called Gettysburg Sources v2 (generated ${esc(longDate(reg.date))}). The numbers are computed from the register file and agree with its review report. They are about what a list can add to Ask the Historian; they are not a bibliography of the map.</p>
${table({ caption: 'The Gettysburg Sources v2 register', captionSrc: [REG + '#meta'], headers: ['Question', 'Number'], numeric: [1], rows: [
  [`Entries in the list`, `<span${src(REG + '#entries')}>${num(reg.entries)}</span>`],
  ['Official Records report entries', `<span${src(REG + '#entries')}>${num(reg.orReports)}</span>`],
  ['Official Records page pointers', `<span${src(REG + '#entries')}>${num(reg.orPages)}</span>`],
  ['All other entries', `<span${src(REG + '#entries')}>${num(reg.nonOr)}</span>`],
  ['Distinct writings (entries counted as one writing)', `<span${src(REG + '#entries')}>${num(reg.writings)}</span>`],
  ['Other works approved (quote corpus or link-out only)', `<span${src(REG + '#entries')}>${num(reg.approvedOther)}</span>`],
  ['Entries reviewed by two independent verifiers', `<span${src(REG + '#entries')}>${num(reg.twoVerifiers)}</span>`],
  ['Entries not verified by anyone', `<span${src(REG + '#entries')}>${num(reg.notVerified)}</span>`],
  ['Entries waiting for a human decision', `<span${src(REG + '#entries')}>${num(reg.needsHuman)}</span>`],
] })}
<p${src(REG + '#entries')}>${(((reg.orReports + reg.orPages) / reg.entries) * 100).toFixed(1)}% of the list is the Official Records, which the project’s own text index already holds. Those entries add an independent index and links, not new text.</p>
<p${src(QC, 'docs/historian/CORPUS.md')}>The project’s text index of Official Records volume 27 holds 588 of the 589 numbered reports and 8,232 citable passages. It is built and tested and is not part of the live site.</p>
<p${src(QC)}>The review report found that 1,940 of 2,046 links in the list go to two hosts that refuse automated clients (94.8%). Those links were not opened; they were checked only by shape against the Internet Archive scans.</p>
<h2 id="limits">Limits of this page</h2>
<ul>
<li${src('data-src/version.json#data_version', NOTES)}>It describes data version ${esc(I.dataVersion.data_version)} and release train R1c, which is built and tested and has not been released.</li>
<li>No historian has reviewed the reconstruction. ${owner('creator.reviewer', 'the name and credit of the historian reviewer, or “none yet”')}</li>
<li>A fuller register of disagreements between sources, with citations and pages, is not built yet.</li>
<li>Third-party rights (map imagery, National Park Service media, Google Maps) are not described here until the owner answers the rights questions.</li>
</ul>`,
  };

  // =====================================================================================================================
  // Standard of Care
  const soc = [
    { n: 1, lead: 'Every number is a ladder.', rest: 'The page shows who said what, and when, and why one value is shown first.', status: 'no',
      today: `The Casualty Dashboard shows one total, ${num(cas.engagementPeriods.total)}, while the site’s own data holds three bases (${num(cas.summaryFields.total)}, ${num(cas.engagementPeriods.total)} and ${num(cas.armyHeaders.total)}). The ladder exists on the Sources and Methods page, not on the map.`, src: [F + '#casualties.site_figures_measured'], need: 'The same ladder behind every figure on the map, with the evidence labels visible.' },
    { n: 2, lead: 'Every quotation has a receipt.', rest: 'The page, the scan, the highlight.', status: 'no',
      today: 'Story records carry no citation field: each story file lists the works it drew on once, at file level, with no page. The plan records zero citations in the Historian today. A text index of the Official Records, with page and scan citations on every passage, is built and tested and not live.', src: ['docs/plan/FINAL/00-README.md', 'docs/historian/CORPUS.md', 'baseline/dist/data/vignettes_part1.json'], need: 'The index live, its citations checked against the scans, and every quotation in a story linked to its page.' },
    { n: 3, lead: 'Every model is labelled.', rest: 'Documented, measured, computed, modelled, contested or unknown.', status: 'part',
      today: 'Several pages carry a plain-language note: the Casualty Dashboard says its curves are modelled, the What-If Sandbox says it is not history, and Aftermath says it is an overview. The six labels themselves are not shown anywhere on the map.', src: ['tools/t0/patches/PG-core.json', PITCH + '#six-evidence-badges'], need: 'The six labels on every card, number and answer.' },
    { n: 4, lead: 'Every disagreement is shown.', rest: 'Nothing is quietly averaged or hidden.', status: 'no',
      today: `The Terms say discrepancies are noted rather than silently resolved, yet the Casualty Dashboard shows one casualty total although the data holds three. The Sources and Methods page shows the disagreements it can compute: casualty figures and the time anchors.`, src: ['baseline/dist/terms.html', F + '#casualties.site_figures_measured'], need: 'A register of disagreements with every value, its source and the reason one is shown first.' },
    { n: 5, lead: 'Every person named is sourced, and every unknown is honoured.', rest: 'The dead are named, and the page says how many cannot be.', status: 'no',
      today: `The site lists regiments, not individual soldiers. Of ${num(I.quality.provenance.records)} data records, ${num(I.quality.provenance.with_source_string)} carry a source string.`, src: ['data-src/build/data-quality-report.json#provenance'], need: 'A source on every named person and a count of the unknown.' },
    { n: 6, lead: 'Every date is a range when it is one.', rest: 'Photographs, reports and newspapers are never made more precise than their evidence.', status: 'no',
      today: `Moments print as clock times. All ${timeInfo.total} proposed time anchors are unreviewed, and release R1c notes record that clock labels are hours off in places.`, src: ['data-src/time/time_anchors.json#anchors', NOTES], need: 'Times shown as “about”, ranges where sources disagree, and a historian’s signed decision behind any exact time.' },
    { n: 7, lead: 'Every correction is logged,', rest: 'publicly, with a date and a reason.', status: 'no',
      today: 'The Corrections page and its log format are drafted. The log has no entries: an entry is written only after a correction is live.', src: ['tools/copy/trust-config.json'], need: 'The Corrections page published, with a working address and a first logged entry.' },
    { n: 8, lead: 'Nothing the Historian says is generated.', rest: 'Every sentence is a quotation, a template over a sourced row, or a stated limitation.', status: 'part',
      today: 'The first half holds: Ask the Historian runs in the browser and reads only this site’s own data files; it calls no model. The second half does not yet hold: answers are not all quotations with sources, templates over sourced rows, or stated limitations.', src: ['baseline/dist/historian.html'], need: 'Every answer type built from a cited quotation, a sourced template or a stated limit, checked on every build.' },
  ];
  const chip = { ok: ['ok', 'In place'], part: ['part', 'Partly in place'], no: ['no', 'Not yet in place'] };
  const socCounts = { ok: soc.filter((s) => s.status === 'ok').length, part: soc.filter((s) => s.status === 'part').length, no: soc.filter((s) => s.status === 'no').length };
  pages['standard-of-care'] = {
    slug: 'standard-of-care', title: 'Standard of Care', h1: 'Standard of Care',
    description: 'Eight commitments the Gettysburg Interactive Map is working toward, and for each one what holds today and what does not yet.',
    jsonld: J({ '@context': 'https://schema.org', '@type': 'WebPage', name: 'The Standard of Care', inLanguage: 'en-US' }),
    provenance: prov([PITCH, 'the eight commitments, as proposed in the pitch'], [F, 'casualty bases'], ['data-src/time/time_anchors.json', 'state of the time anchors'], ['data-src/build/data-quality-report.json', 'records with a source string'], [NOTES, 'release R1c notes'], ['baseline/dist/historian.html', 'what the Historian page reads'], ['docs/historian/CORPUS.md', 'state of the Official Records text index']),
    body: `
<p class="lede">These are eight commitments the project proposes to make to every visitor. They are a goal, not a description of the site today. Under each one, this page says what holds now and what does not.</p>
<p${src(PITCH + '#the-standard-of-care')}>The wording follows the proposal in <code>docs/pitch/PITCH.md</code> (“The Standard of Care”, marked there as design intent), with the first person plural changed to the neutral voice.</p>
<p data-source="${PITCH}#the-standard-of-care">Today, ${socCounts.ok} of the 8 hold fully, ${socCounts.part} hold in part and ${socCounts.no} do not yet hold.</p>
<ol class="cards">${soc.map((s) => `<li class="card s-${s.status}"${src(...s.src)}>
<h2>${s.n}. ${esc(s.lead)} <span class="chip ${chip[s.status][0]}">${chip[s.status][1]}</span></h2>
<p>${esc(s.rest)}</p>
<p><strong>Today.</strong> ${esc(s.today)}</p>
<p><strong>What would make it true.</strong> ${esc(s.need)}</p>
</li>`).join('')}</ol>
<h2 id="how">How this page is kept honest</h2>
<p>A commitment moves to “In place” only when the evidence for it exists in the project and a test or a file shows it. It moves back if the evidence is withdrawn. The proposal does not ask visitors to trust the site; it gives them what they need to check it.</p>`,
  };

  // =====================================================================================================================
  // Corrections
  pages.corrections = {
    slug: 'corrections', title: 'Corrections', h1: 'Corrections',
    description: 'How to report a mistake in the Gettysburg Interactive Map, what happens to a report, and the public log of corrections.',
    jsonld: J({ '@context': 'https://schema.org', '@type': 'WebPage', name: 'Corrections', inLanguage: 'en-US' }),
    provenance: prov(['tools/copy/trust-config.json', 'the response targets and the contact address'], ['docs/plan/FINAL/11-copy-docs-content.md', 'the log format of WP-CONTENT-16'], [PITCH, 'the commitment that every correction is logged'], ['data-src/version.json', 'the data version']),
    body: `
<p class="lede">The map reconstructs three days of 1863 from published sources, so it will contain mistakes. When one is found, it is corrected in the open: the date, what the page said, what it says now, and the source.</p>
<ul class="toc"><li><a href="#report" class="tap">Report a mistake</a></li><li><a href="#next" class="tap">What happens next</a></li><li><a href="#count" class="tap">What counts</a></li><li><a href="#log" class="tap">The log</a></li></ul>
<h2 id="report">Report a mistake</h2>
<p>Write to the project address. You do not need to give your name. Say where you saw it, what you think is wrong, and your source (author, title, page) if you have one.</p>
<p>${mail('corrections', 'Correction request', template, 'Write a correction request')}</p>
<p>If your email program does not open, copy this template into a message:</p>
<pre class="template">${template.map(esc).join('\n')}</pre>
<h2 id="next">What happens next</h2>
<ol>
<li>The report is received at the corrections address.</li>
<li>${intent(`The target is to acknowledge it within ${ack} days. This is a target, not a promise.`)}</li>
<li>The claim is checked against the sources. A historical correction is checked by a named historical reviewer once one is named; until then it is marked “Unreviewed reconstruction”.</li>
<li>${intent(`The target is to fix the mistake, or explain why it stands, within ${fixDays} days.`)}</li>
<li>A fix that is live is entered in the log below.</li>
</ol>
<p>Where historians disagree, the page shows the range and the sources instead of picking a winner. The <a href="sources.html">Sources and Methods</a> page shows the disagreements that are known today.</p>
<h2 id="count">What counts as a correction</h2>
<ul>
<li>A wrong fact: a unit, a place, a date, a time, a figure, a quotation or a name.</li>
<li>A missing or wrong source.</li>
<li>Text that says more than the evidence shows.</li>
<li>A broken link or a page that prints a code word instead of text.</li>
</ul>
<p>An accessibility barrier is not a correction; report it through the <a href="accessibility.html">Accessibility Statement</a> page, which uses the same address and the same targets.</p>
<h2 id="log">The public log</h2>
<p>The log is newest first. Each entry has these fields, and the same fields are kept in a machine-readable file next to this page (<code>corrections.json</code>).</p>
${table({ caption: 'Fields of a log entry', headers: ['Field', 'Meaning'], rows: [
  ['id', 'A stable number for the entry.'], ['date', 'The day the correction went live: year first in the file, month name first on the page.'], ['where', 'The page, moment or record that was wrong.'], ['was', 'What it said, quoted.'], ['now', 'What it says now, quoted.'], ['source', 'Author, title, edition and page for the change.'], ['reviewer', 'Who checked the historical part, or “unreviewed”.'], ['credit_consent', 'Whether the person who reported it agreed to be credited.'],
] })}
${table({ caption: 'Corrections log', headers: ['Date', 'Where', 'Was', 'Now', 'Source', 'Reviewed by'], rows: [['<em>No entries yet.</em>', '', '', '', '', '']] })}
<p>The log opens with the first correction that has been made live. Nothing has been entered in advance, and an entry is never written before its fix is live. A feed of the log is planned and does not exist yet.</p>
<h2 id="versions">Data versions</h2>
<p${src('data-src/version.json#history')}>The data behind the map is at version ${esc(I.dataVersion.data_version)}, the baseline of record: ${esc(I.dataVersion.history[0].label)}. Corrections to the data will be listed here with the version that carries them.</p>`,
  };

  // =====================================================================================================================
  // FAQ
  const faq = [
    ['What is the Gettysburg Interactive Map?', `<p${src(F + '#units.total', F + '#ticks.total')}>An interactive map of the Battle of Gettysburg, July 1–3, 1863. It places ${n('units.total')} units on the field and moves them through ${n('ticks.total')} moments, with written stories and a chronology. The <a href="about.html">About</a> page has more.</p>`, 'An interactive map of the Battle of Gettysburg, July 1–3, 1863, with units, stories and a chronology.'],
    ['Is it free, and do I need an account?', `<p${src('baseline/dist/privacy.html')}>It is free, there is no account system, and there is no payment of any kind, according to the site’s Privacy page.</p>`, 'It is free, there is no account system, and there is no payment of any kind, according to the site’s Privacy page.'],
    ['Does Ask the Historian use AI?', `<p${src('baseline/dist/historian.html')}>No. Ask the Historian runs in your browser and looks up text in this site’s own data files. It does not call an AI model, and its page says it is a search of the site’s records, not an AI.</p>`, 'No. Ask the Historian runs in your browser and looks up text in this site’s own data files. It does not call an AI model.'],
    ['How exact are the positions?', `<p${src(F + '#placements.rows', F + '#placements.ticks_with_rows', F + '#units.regiments_with_own_track')}>Positions are reconstructed from published sources. Where a regiment’s exact place at a given time is not recorded, the map shows the best-supported position. The data holds ${n('placements.rows')} position rows on ${n('placements.ticks_with_rows')} of ${n('ticks.total')} moments, and ${n('units.regiments_with_own_track')} of ${n('units.regiments')} regiments have positions of their own.</p>`, `Positions are reconstructed from published sources. The data holds ${n('placements.rows')} position rows on ${n('placements.ticks_with_rows')} of ${n('ticks.total')} moments.`],
    ['How exact are the times?', `<p${src('data-src/time/time_anchors.json#anchors', F + '#ticks.time_model')}>Times are approximate. Sources disagree by half an hour or more, and the map plays as a time-lapse. The moments are not five minutes apart everywhere, and the proposed clock rests on ${timeInfo.total} time anchors, none of which has been checked by a historian yet.</p>`, `Times are approximate. The proposed clock rests on ${timeInfo.total} time anchors, none of which has been checked by a historian yet.`],
    ['Why do casualty totals differ between pages?', `<p${src(F + '#casualties.site_figures_measured')}>The site’s own data holds three bases for the combined total: ${num(cas.summaryFields.total)}, ${num(cas.engagementPeriods.total)} and ${num(cas.armyHeaders.total)}. Casualties are men killed, wounded, and captured or missing, added together. The <a href="sources.html#ladder">Sources and Methods</a> page lists the figures by source.</p>`, `The site’s own data holds three bases for the combined total: ${num(cas.summaryFields.total)}, ${num(cas.engagementPeriods.total)} and ${num(cas.armyHeaders.total)}.`],
    ['Can I find an individual soldier or ancestor?', `<p${src('baseline/dist/find-ancestor.html')}>Not here. This site lists regiments, not individual soldiers. Find Your Ancestor searches regiments by state or commander. To find a soldier by name, search the National Park Service’s Soldiers and Sailors System.</p>`, 'Not here. This site lists regiments, not individual soldiers. To find a soldier by name, search the National Park Service’s Soldiers and Sailors System.'],
    ['Which browsers and devices work?', `<p${src(NOTES)}>Every test of release R1c ran in Chrome on a desktop computer, and touch was emulated there. Safari, Firefox, Samsung Internet and real phones have not been tested. A phone layout exists from release R1b.</p>`, 'Every test of release R1c ran in Chrome on a desktop computer. Safari, Firefox, Samsung Internet and real phones have not been tested.'],
    ['Can I use it with a keyboard or a screen reader?', `<p${src(NOTES, 'tools/guide/features.json')}>The map has keyboard shortcuts, listed on the <a href="accessibility.html#keys">Accessibility Statement</a> page. Automated checks pass on the map page in release R1c. No conformance to WCAG is claimed, and no test with a screen reader is on record.</p>`, 'The map has keyboard shortcuts. Automated checks pass on the map page in release R1c. No conformance to WCAG is claimed.'],
    ['Can I use the content in class, on my own site or in print?', `<p${src('baseline/dist/terms.html')}>The site’s Terms welcome personal, educational and classroom use, including linking to the site, embedding its widget and citing it in student work, and they ask that the data files not be republished as someone else’s dataset. No open licence for the text, code or data has been published. ${confirm('licenseWording', 'the licence wording you want shown here, if any')}</p>`, 'The Terms welcome personal, educational and classroom use and ask that the data files not be republished as someone else’s dataset. No open licence has been published.'],
    ['What do “Documented”, “Computed” and the other labels mean?', `<p${src(PITCH + '#six-evidence-badges')}>They are the six evidence labels used on the <a href="sources.html#labels">Sources and Methods</a> page: documented, measured, computed, modelled, contested and unknown. The map itself does not show them yet.</p>`, 'They are the six evidence labels used on the Sources and Methods page. The map itself does not show them yet.'],
    ['Who checked the history?', `<p${src('data-src/time/time_anchors.json#anchors')}>No historian has reviewed the reconstruction yet. See the <a href="about.html#who">About</a> page for the reviewer’s credit once there is one.</p>`, 'No historian has reviewed the reconstruction yet.'],
    ['Who made the map?', `<p${src('docs/content/APPROVED-BIO.md')}>Mike Legere built the map for the love of history, in his own words, and maintains it on his own. The <a href="about.html#who">About</a> page has his own text.</p>`, 'Mike Legere built the map for the love of history, in his own words, and maintains it on his own. The About page has his own text.'],
    ['How do I report a mistake?', `<p>Use the <a href="corrections.html">Corrections</a> page. The <a href="contact.html">Contact</a> page has the address.</p>`, 'Use the Corrections page, which explains how to report a mistake.'],
    ['Is this affiliated with the National Park Service?', `<p>${confirm('nonAffiliation', 'the sentence that this is an independent project is true', 'This is an independent project. It is not affiliated with or endorsed by the National Park Service, the Gettysburg Foundation, the American Battlefield Trust, Mapbox or Google.')}</p>`, (confirmedFlag('nonAffiliation') ? '' : '[OWNER TO CONFIRM: the sentence that this is an independent project is true] ') + 'This is an independent project. It is not affiliated with or endorsed by the National Park Service, the Gettysburg Foundation, the American Battlefield Trust, Mapbox or Google.'],
  ];
  pages.faq = {
    slug: 'faq', title: 'FAQ', h1: 'FAQ',
    description: 'Answers about the Gettysburg Interactive Map: what it is, how exact it is, casualty figures, devices, accessibility and how to report a mistake.',
    jsonld: J({ '@context': 'https://schema.org', '@type': 'FAQPage', inLanguage: 'en-US', mainEntity: faq.map(([q, , plain]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: plain } })) }),
    provenance: prov([F, 'counts and casualty bases'], ['data-src/time/time_anchors.json', 'state of the time anchors'], ['baseline/dist/privacy.html', 'the live Privacy page'], ['baseline/dist/terms.html', 'the live Terms'], ['baseline/dist/historian.html', 'what the Historian page reads'], ['baseline/dist/find-ancestor.html', 'the Find Your Ancestor page text'], [NOTES, 'test conditions of release R1c'], [PITCH, 'the six evidence labels']),
    body: `
<p class="lede">Frequently asked questions. Each answer is checked against a file of this project. Where the answer is “not yet” or “not known”, it says so.</p>
${faq.map(([q, a], i) => `<details id="q${i + 1}"><summary>${esc(q)}</summary><div>${a}</div></details>`).join('\n')}`,
  };

  // =====================================================================================================================
  // Accessibility
  const keys = features.hotkeys.filter((h) => !h.removed_in);
  const gestures = features.gestures;
  const SINCE = (s) => (s === 'baseline' ? 'Original site' : `Since ${s}`);
  pages.accessibility = {
    slug: 'accessibility', title: 'Accessibility Statement', h1: 'Accessibility Statement',
    description: 'What was tested for accessibility in the Gettysburg Interactive Map, the results, the known gaps, the keyboard keys, and how to report a barrier.',
    jsonld: J({ '@context': 'https://schema.org', '@type': 'WebPage', name: 'Accessibility Statement', inLanguage: 'en-US' }),
    provenance: prov([NOTES, 'test results and conditions of release R1c'], ['tools/guide/features.json', 'the keyboard and gesture reference (matches the Help dialog of R1c: node tools/guide/check-parity.mjs)'], ['tools/t0/README.md', 'what a release train is'], ['docs/plan/FINAL/00-README.md', 'the planned rebuild']),
    body: `
<p class="lede">The Gettysburg Interactive Map has not been evaluated against the Web Content Accessibility Guidelines, and no level of conformance is claimed. This page says what has been tested, what the results were, and what is known to be missing.</p>
<ul class="toc"><li><a href="#status" class="tap">Status</a></li><li><a href="#tested" class="tap">What was tested</a></li><li><a href="#gaps" class="tap">Known gaps</a></li><li><a href="#keys" class="tap">Keyboard</a></li><li><a href="#touch" class="tap">Phone</a></li><li><a href="#report" class="tap">Report a barrier</a></li></ul>
<h2 id="status">Status</h2>
<p${src(NOTES, 'tools/t0/README.md', 'docs/baseline-drift.md')}>The work so far is a bridge. Release trains R0 to R1c change the existing built site with scripted, checked patches; a full rebuild is planned (<code>docs/plan/FINAL/00-README.md</code>). Release R1c is built and tested and has not been released. The live site is the build of September 30, 2026; it differs from the original build of September 9 only in the map page’s inline script and one data file, and the original build fails the same tests (see below).</p>
<p>Automated tools find only part of the barriers a person meets. A passing automated test is not a statement that the site is accessible.</p>
<h2 id="tested">What was tested, and the results</h2>
${table({ caption: 'Accessibility tests and their results (all automated; all in Chrome)', headers: ['Test', 'Result', 'Where it is recorded'], rowSources: [['git:838b311'], ['git:f348b34', NOTES], ['git:f348b34'], [NOTES], [NOTES], ['git:838b311']], rows: [
  ['axe-core on 25 sub-pages at widths 1440, 375, 320, 412 and 768 px', '0 serious or critical violations', '<code>git commit 838b311</code>'],
  ['Lighthouse 13.5 accessibility score on the map page, release R1b and R1c, phone and desktop, with and without map tiles', '100', `<code>${esc(NOTES)}</code> and <code>git commit f348b34</code>`],
  ['The same Lighthouse test on releases R0 and R1a (without the accessibility changes)', '90', '<code>git commit f348b34</code>'],
  ['Accessibility suite on release R1c', '15 passed, 1 skipped by design; the real-tile test passed 1 of 1', `<code>${esc(NOTES)}</code>`],
  ['The same suite on the original build', 'Fails: axe finds serious or critical violations and failing contrast', `<code>${esc(NOTES)}</code>`],
  ['Target size and text size on the sub-pages', '44 px targets for touch, 24 px for a mouse; no text under 12 px', '<code>git commit 838b311</code>'],
] })}
<p${src(NOTES)}>Conditions: headless Chrome 153 on Windows against a local server. Touch was emulated. No Safari, Firefox, Samsung Internet or real phone has run these tests.</p>
<h2 id="gaps">Known gaps, and what to do instead</h2>
<ul>
<li${src(NOTES)}><strong>No screen reader test is on record.</strong> No test with NVDA, JAWS, VoiceOver or TalkBack is in the project’s records. ${confirm('noScreenReaderTestOnRecord', 'whether any manual test with a screen reader was done, and by whom')}</li>
<li${src('docs/plan/FINAL/00-README.md')}><strong>The battlefield is drawn on a canvas.</strong> Units are not announced one by one. A keyboard user can pick a unit through Search (Enter in the field, Down arrow into the list, Enter on a result) and read its details panel. A text or table view of the whole battlefield is part of the planned rebuild; the release R1c notes do not list one.</li>
<li${src('tools/guide/features.json#known_differences')}><strong>The clock.</strong> Clock labels can be hours off. Read the moment as a place in the story and use the story text for the order of events.</li>
<li><strong>Colour.</strong> The eleven states of a unit are told apart by colour. The audit that preceded this work found that the legend colours do not all match the colours drawn on the map; that audit finding has not been re-measured here.</li>
<li${src('tools/guide/features.json#hotkeys')}><strong>Motion.</strong> The playback is an animation. Space pauses it, and the speed keys slow it down.</li>
<li><strong>Other people’s content.</strong> Street View opens in Google Maps in a new tab and is Google’s content. Captions of National Park Service videos have not been checked.</li>
<li><strong>The user guide.</strong> A candidate guide is built as a tagged PDF and as a web page. Only this project’s own checks have been run on the PDF; no independent PDF accessibility check has.</li>
<li><strong>Language.</strong> The site is in English only.</li>
</ul>
<h2 id="keys">Keyboard reference</h2>
<p${src('tools/guide/features.json#hotkeys')}>This table is generated from the same file as the user guide and is compared with the Help dialog of release R1c by a script; a difference fails that script. Keys marked with a release name are not in the original site.</p>
${table({ caption: 'Keys on a computer, release R1c', headers: ['Key', 'What it does', 'Available'], rows: keys.map((k) => [`<kbd>${esc(k.keys)}</kbd>`, `<span${src('tools/guide/features.json#hotkeys.' + k.id)}>${esc(typo(k.text))}</span>`, esc(SINCE(k.since))]) })}
<h2 id="touch">Phone and touch controls</h2>
${table({ caption: 'Controls of the phone layout, release R1c', headers: ['Control', 'What it does', 'Available'], rows: gestures.map((g) => [esc(g.keys), `<span${src('tools/guide/features.json#gestures.' + g.id)}>${esc(typo(g.text))}</span>`, esc(SINCE(g.since))]) })}
<h2 id="report">Report a barrier</h2>
<p>If something on this site is hard or impossible to use, tell the project. Say what you were trying to do, which page, and what got in the way. Mention the browser and any assistive technology if you can.</p>
<p>${mail('accessibility', 'Accessibility barrier', ['Page address:', 'What I was trying to do:', 'What got in the way:', 'Browser and assistive technology, if known:'], 'Report an accessibility barrier')}</p>
<p>${intent(`The target is to acknowledge a report within ${ack} days. This is a target, not a promise.`)}</p>
<h2 id="review">Review</h2>
<p>This statement is reviewed with every release. Its last review date is at the top of the page.</p>`,
  };

  // =====================================================================================================================
  // Changelog
  const cl = changelogEntries();
  pages.changelog = {
    slug: 'changelog', title: 'Changelog', h1: 'Changelog',
    description: 'What changed in the Gettysburg Interactive Map, what was fixed, what was removed, the data version, and the known issues of the next release.',
    jsonld: J({ '@context': 'https://schema.org', '@type': 'WebPage', name: 'Changelog', inLanguage: 'en-US' }),
    provenance: prov([NOTES, 'release R1c and what it adds to R1b'], ['ops/release-notes/R1b.md', 'release R1b'], ['ops/release-notes/R1a.md', 'release R1a'], ['ops/release-notes/R0.md', 'release R0'], ['data-src/version.json', 'the data version'], ['tools/guide/features.json', 'known differences']),
    body: `
<p class="lede">What has changed, in sentences a visitor can use. Nothing below has been released yet: it describes release trains R0 to R1c, which are built and tested and waiting for the owner.</p>
<p${src(NOTES)}>Status of release R1c: built and tested locally; not deployed. The live site is still the build of September 30, 2026. Version numbers are not assigned yet; the project’s plan proposes calendar versions such as 2026.11.0, which have not been adopted.</p>
<h2 id="unreleased">Next release (R0 to R1c)</h2>
${cl.groups.map((g) => `<h3>${esc(g.title)}</h3><ul>${g.items.map((it) => `<li${src(it.src)}>${esc(it.text)}</li>`).join('')}</ul>`).join('\n')}
<h2 id="data">Data</h2>
<p${src('data-src/version.json#history', 'docs/baseline-drift.md')}>The data is at version ${esc(I.dataVersion.data_version)}: the 71 files of the September 9, 2026 deploy, unchanged by the release trains, which do not edit data files. One file differs on the live site from that baseline: the terrain file, which production corrected after the deploy. Release R1c adds one new file, a list that turns a story id into its moment, used by share links.</p>
<h2 id="known">Known issues in release R1c</h2>
<ul>${features.known_differences.map((k) => `<li${src('tools/guide/features.json#known_differences.' + k.id)}${k.allow ? ` data-lint-allow="${esc(k.allow.join(','))}"` : ''}>${esc(typo(k.text))}</li>`).join('')}</ul>
<h2 id="earlier">Earlier</h2>
<p>No earlier changelog exists. Versions of the site before release R0 are not described here.</p>`,
    changelog: cl,
  };

  // =====================================================================================================================
  // Contact
  pages.contact = {
    slug: 'contact', title: 'Contact and Report a Problem', h1: 'Contact',
    description: 'How to contact the Gettysburg Interactive Map, report a mistake, report an accessibility barrier or report a security problem. Email only; no form.',
    jsonld: J({ '@context': 'https://schema.org', '@type': 'WebPage', name: 'Contact and report a problem', inLanguage: 'en-US' }),
    provenance: prov(['tools/copy/trust-config.json', 'the contact addresses and the response targets'], ['docs/plan/FINAL/11-copy-docs-content.md', 'the contact plan (role addresses, no form, no tracking)']),
    body: `
<p class="lede">Contact and report a problem. Contact is by email only, to one address (${typeof ownerValue('contact.general') === 'string' && ownerValue('contact.general') ? `<a href="mailto:${esc(ownerValue('contact.general'))}">${esc(ownerValue('contact.general'))}</a>` : owner('contact.general', 'the project email address')}). This page has no form, and it loads nothing from other sites.</p>
<ul class="toc"><li><a href="#general" class="tap">General</a></li><li><a href="#mistake" class="tap">A mistake</a></li><li><a href="#barrier" class="tap">A barrier</a></li><li><a href="#security" class="tap">Security</a></li></ul>
<h2 id="general">General questions</h2>
<p>${mail('general', 'Question about the Gettysburg Interactive Map', ['Page address (if it is about a page):', 'My question:'], 'Write a general message')}</p>
<h2 id="mistake">A mistake in the history or the data</h2>
<p>Use the project address, and read <a href="corrections.html">how corrections work</a> first. Include the page address, what you think is wrong and your source.</p>
<p>${mail('corrections', 'Correction request', template, 'Write a correction request')}</p>
<h2 id="barrier">An accessibility barrier</h2>
<p>Say what you were trying to do, which page and what got in the way. See the <a href="accessibility.html">Accessibility Statement</a>.</p>
<p>${mail('accessibility', 'Accessibility barrier', ['Page address:', 'What I was trying to do:', 'What got in the way:', 'Browser and assistive technology, if known:'], 'Report an accessibility barrier')}</p>
<h2 id="security">A security problem</h2>
<p>If you believe you have found a way to harm visitors or the site, write to the project address and do not publish the details first.</p>
<p>${mail('security', 'Security report', ['What I found:', 'How to reproduce it:', 'Page address:'], 'Write a security report')}</p>
<h2 id="expect">What to expect</h2>
<p>${intent(`The targets are to acknowledge a message about a mistake or an accessibility barrier within ${ack} days, and to fix the problem, or explain why it stands, within ${fixDays} days. These are targets, not promises.`)}</p>
<p>Your email address is used only to reply. A correction is credited to you only if you say you agree.</p>
<h2 id="privacy">Privacy of this page</h2>
<p>This page has no form, no tracking and no script of its own. The shared site menu is the only script it loads. See the site’s <a href="/privacy.html">Privacy</a> page for the rest of the site.</p>`,
  };

  return { pages, unresolved, template, provenancePaths: [...usedProv].sort() };
}

// ---------------------------------------------------------------------------------------------------------------------
function changelogEntries() {
  const N1 = 'ops/release-notes/R1c.md'; const N2 = 'ops/release-notes/R1b.md'; const N3 = 'ops/release-notes/R1a.md'; const N0 = 'ops/release-notes/R0.md';
  const groups = [
    { title: 'Added', items: [
      { text: 'A phone layout, chosen automatically on phones and touch tablets up to 834 px wide and on phones held sideways. The address ending ?layout=mobile or ?layout=desktop forces one.', src: N2, release: 'R1b' },
      { text: 'Accessibility changes to the map page: a skip link, one main heading, landmarks, labelled controls, a timeline that works as a slider with its value in words, and dialogs that keep keyboard focus. These are a bridge, not a claim of conformance.', src: N2, release: 'R1b' },
      { text: 'Share links: the map reads moment, day, unit, story, regiment, zoom and centre from the address and opens there.', src: N1, release: 'R1c' },
      { text: 'A Help row for moving the map from the keyboard (release R1c), and Help text for the phone layout (release R1b).', src: N1 + ' ' + N2, release: 'R1c' },
    ] },
    { title: 'Changed', items: [
      { text: 'The 3.5-second introduction is gone: the map appears at once.', src: N0, release: 'R0' },
      { text: 'Dates read July 1, 2 and 3 instead of dates up to July 9.', src: N1, release: 'R1c' },
      { text: 'A press on the map no longer leaves keyboard focus on it, so the arrow keys step through time after a click or a drag. Space no longer starts the playback while a toolbar button has focus, and S no longer types an “s”.', src: N3 + ' ' + N2, release: 'R1a' },
      { text: 'Help wording: the speed label reads 1x (base speed) and no longer implies that the map plays at the pace of the battle, the Help panel says hundreds of regiments and batteries instead of 445+, and its list of works is headed Sources.', src: N1 + ' tools/t0/patches/CP.json', release: 'R1c' },
      { text: 'Turning Points links now land on the moment each decision belongs to.', src: N1, release: 'R1c' },
    ] },
    { title: 'Fixed', items: [
      { text: 'The map can be dragged and zoomed with a mouse again.', src: N3, release: 'R1a' },
      { text: 'Jumping to a day loads that day’s positions, and the map shows each unit at its latest recorded position at any moment.', src: N1, release: 'R1c' },
      { text: 'Several pages no longer print a code word where text belongs: the dashboard, the unit reports and Ask the Historian.', src: N3, release: 'R1a' },
      { text: 'Watch Together no longer shows imported tour text as page markup.', src: N3, release: 'R1a' },
      { text: 'The Casualty Dashboard no longer shows a note meant for the developer.', src: N3, release: 'R1a' },
      { text: 'Map attribution is no longer hidden under the playback bar on desktop.', src: N3 + ' tools/t0/patches/A2.json', release: 'R1a' },
    ] },
    { title: 'Removed', items: [
      { text: 'The heatmap key and its Help row, and the sound button inside the map. Immersive Mode is the page that plays sound.', src: N3, release: 'R1a' },
      { text: 'Battlefield AR is no longer listed in the menus or the sitemap and is hidden from search engines while it is tested.', src: N3, release: 'R1a' },
      { text: 'Two developer pages are deleted from the site.', src: N3, release: 'R1a' },
    ] },
  ];
  return { groups, entries: groups.flatMap((g) => g.items.map((it) => ({ type: g.title, release: it.release, text: it.text, source: it.src }))) };
}

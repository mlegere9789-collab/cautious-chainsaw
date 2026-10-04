// Read-only inputs of the trust pages. Every number the pages print comes from here, with the file it came from, and every
// claim about the site that the pages make is checked here against the tree and recorded (claims[]), so a page cannot say more
// than the repository shows.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { REPO } from '../lib/lint.mjs';
import { extractHelpSources } from '../../guide/lib/t0src.mjs';
import { runParity } from '../../guide/check-parity.mjs';

const read = (rel) => fs.readFileSync(path.join(REPO, rel), 'utf8');
const readJson = (rel) => JSON.parse(read(rel));
export const sha256 = (rel) => crypto.createHash('sha256').update(fs.readFileSync(path.join(REPO, rel))).digest('hex');
const getPath = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);

export const INPUT_FILES = {
  facts: 'data-src/build/facts.json',
  registry: 'data-src/sources-v2/registry.json',
  qc: 'docs/historian/sources-v2/QC-REPORT.md',
  quality: 'data-src/build/data-quality-report.json',
  anchors: 'data-src/time/time_anchors.json',
  authorities: 'data-src/authorities/authorities.json',
  dataVersion: 'data-src/version.json',
  notesR1c: 'ops/release-notes/R1c.md',
  notesR1b: 'ops/release-notes/R1b.md',
  notesR1a: 'ops/release-notes/R1a.md',
  notesR0: 'ops/release-notes/R0.md',
  features: 'tools/guide/features.json',
  pitch: 'docs/pitch/PITCH.md',
  historianPage: 'baseline/dist/historian.html',
  privacyPage: 'baseline/dist/privacy.html',
  termsPage: 'baseline/dist/terms.html',
  findAncestor: 'baseline/dist/find-ancestor.html',
  corpusDoc: 'docs/historian/CORPUS.md',
  driftDoc: 'docs/baseline-drift.md',
  decisions: 'docs/decisions/OWNER-DECISIONS-2026-10-04.md',
  bio: 'docs/content/APPROVED-BIO.md',
};

/** parse "NAME   1234" lines of the QC report's closing count block */
export function parseQcCounts(md) {
  const block = md.split('Counts at the time of writing:')[1] || '';
  const out = {};
  for (const m of block.matchAll(/^([A-Z-]+)\s+(\d[\d,]*)\s*$/gm)) out[m[1]] = Number(m[2].replace(/,/g, ''));
  return out;
}

export function loadInputs({ asOf }) {
  const facts = readJson(INPUT_FILES.facts);
  const registry = readJson(INPUT_FILES.registry);
  const quality = readJson(INPUT_FILES.quality);
  const anchors = readJson(INPUT_FILES.anchors);
  const authorities = readJson(INPUT_FILES.authorities);
  const dataVersion = readJson(INPUT_FILES.dataVersion);
  const features = readJson(INPUT_FILES.features);
  const qcMd = read(INPUT_FILES.qc);
  const claims = [];
  const claim = (id, text, ok, evidence) => { claims.push({ id, text, ok: Boolean(ok), evidence }); if (!ok) throw new Error(`claim ${id} failed: ${text} (${evidence})`); };

  // ---- registry: computed, then cross-checked against the QC report
  const E = registry.entries;
  const countBy = (f) => E.reduce((m, e) => { const k = f(e); m[k] = (m[k] || 0) + 1; return m; }, {});
  const byStatus = countBy((e) => e.final_status);
  const byKind = countBy((e) => e.entry_kind);
  const byTier = countBy((e) => e.tier ?? 'not assessed');
  const twoVerifiers = E.filter((e) => e.verification && Array.isArray(e.verification.verifiers) && e.verification.verifiers.length >= 2).length;
  const writings = E.filter((e) => e.counts_as_writing_piece).length;
  const nonOr = byKind.non_or || 0;
  const reg = {
    date: registry.meta.date, entries: E.length, byStatus, byKind, byTier, twoVerifiers, writings, nonOr,
    approvedOther: (byStatus.APPROVED || 0) + (byStatus['APPROVED-LINKOUT-ONLY'] || 0),
    notVerified: byStatus['NOT-VERIFIED'] || 0,
    needsHuman: byStatus['NEEDS-HUMAN-REVIEW'] || 0,
    duplicates: byStatus.DUPLICATE || 0,
    rejected: byStatus.REJECTED || 0,
    pointers: byStatus['APPROVED-POINTER'] || 0,
    crosswalk: byStatus['APPROVED-CROSSWALK'] || 0,
    orReports: byKind.or_report || 0,
    orPages: byKind.or_page || 0,
    sourceSha: registry.meta.source_sha256,
  };
  const qc = parseQcCounts(qcMd);
  claim('registry-matches-qc-report', 'the registry status counts equal the counts printed in QC-REPORT.md', Object.entries(qc).every(([k, v]) => k === 'TOTAL' ? v === reg.entries : (byStatus[k] || 0) === v), `${INPUT_FILES.registry} vs ${INPUT_FILES.qc}`);

  // ---- time anchors
  const anchorStates = anchors.anchors.reduce((m, a) => { m[a.state] = (m[a.state] || 0) + 1; return m; }, {});
  const anchorStatus = anchors.anchors.reduce((m, a) => { m[a.status] = (m[a.status] || 0) + 1; return m; }, {});
  const timeInfo = { total: anchors.anchors.length, states: anchorStates, status: anchorStatus, proposed: anchorStates.proposed || 0, needDecision: anchorStatus.R || 0, notice: anchors.notice };
  claim('no-anchor-is-reviewed', 'every one of the time anchors is in state proposed (none reviewed, confirmed or signed)', timeInfo.proposed === timeInfo.total, INPUT_FILES.anchors);

  // ---- casualties: the bases inside the site's own data, and the authorities listed (not chosen)
  const m = facts.casualties.site_figures_measured;
  const cas = {
    summaryFields: { total: m.union.apportionment_total_sum + m.confederate.apportionment_total_sum, union: m.union.apportionment_total_sum, confederate: m.confederate.apportionment_total_sum },
    engagementPeriods: { total: m.dashboard_combined_period_sum, union: m.union.apportionment_period_sum, confederate: m.confederate.apportionment_period_sum },
    armyHeaders: { total: m.union.oob_army_header + m.confederate.oob_army_header, union: m.union.oob_army_header, confederate: m.confederate.oob_army_header },
    unionAuthorities: authorities.casualties.union.values,
    confederateAuthorities: authorities.casualties.confederate.values,
    authoritiesAsOf: authorities.as_of,
    authoritiesStatus: authorities.status,
  };
  claim('casualty-bases-add-up', 'the three bases equal the sums of their parts and the dashboard figure', cas.engagementPeriods.total === m.dashboard_combined_period_sum && cas.engagementPeriods.union + cas.engagementPeriods.confederate === cas.engagementPeriods.total, INPUT_FILES.facts);

  // ---- Help dialog works list (R1c) and parity of the keyboard reference
  const help = extractHelpSources({ root: REPO, train: 'R1c' });
  claim('help-lists-nine-works', 'the Help dialog of release R1c lists nine works under the heading "Sources"', help.works.length === 9 && help.heading === 'Sources', 'tools/t0/patches CP.json cp:h03 applied to the baseline Help chunk');
  const parity = runParity({ root: REPO, train: 'R1c' });
  claim('keyboard-reference-matches-help', 'the keyboard reference is generated from tools/guide/features.json, which matches the R1c Help dialog, key handler and menu without mismatch', parity.mismatches.length === 0, 'node tools/guide/check-parity.mjs');

  // ---- claims about the site that FAQ, About and Standard of Care make
  const hist = read(INPUT_FILES.historianPage);
  const fetches = [...hist.matchAll(/fetch\(\s*([^)]*)\)/g)].map((x) => x[1]);
  claim('historian-reads-only-data-files', 'every fetch() call in historian.html reads a /data/ file of this site (no model or API call)', fetches.length > 0 && fetches.every((f) => /^['"]\/data\//.test(f.trim())) && !/openai|anthropic|api\.[a-z]+\.com|generativelanguage/i.test(hist), `${INPUT_FILES.historianPage}: ${fetches.length} fetch calls`);
  claim('historian-page-says-not-ai', 'the Historian page of the live site says it is not a live AI model', /not a live AI model/.test(hist), INPUT_FILES.historianPage);
  const privacy = read(INPUT_FILES.privacyPage);
  claim('privacy-says-no-account', 'the live Privacy page says there is no account system and no payment', /no account system, no payment of any kind/.test(privacy), INPUT_FILES.privacyPage);
  claim('privacy-says-no-own-cookies', 'the live Privacy page says the site does not set its own cookies', /does not set its own cookies/.test(privacy), INPUT_FILES.privacyPage);
  const terms = read(INPUT_FILES.termsPage);
  claim('terms-welcome-classroom-use', 'the live Terms welcome personal, educational and classroom use, linking, embedding and citing', /personal, educational, or classroom purposes/.test(terms) && /citing it in student work/.test(terms), INPUT_FILES.termsPage);
  claim('terms-ask-no-scraping', 'the live Terms ask that the data files not be republished as someone else\'s dataset', /scrape the underlying data files for republication/.test(terms), INPUT_FILES.termsPage);
  const fa = read(INPUT_FILES.findAncestor);
  claim('find-ancestor-lists-regiments-not-soldiers', 'the Find Your Ancestor page says individual soldiers are not part of the dataset and points to the National Park Service system', /individual soldiers who fought here aren.t part of this site.s dataset/.test(fa) && /Civil War Soldiers and Sailors System/.test(fa), INPUT_FILES.findAncestor);
  const notes = read(INPUT_FILES.notesR1c);
  claim('r1c-not-deployed', 'the R1c release notes say the release is built and tested locally and not deployed', /NOT DEPLOYED/.test(notes), INPUT_FILES.notesR1c);
  claim('r1c-chrome-only', 'the R1c release notes say every test ran in headless Chrome on Windows against localhost and that no iOS, Firefox or Samsung browser has run it', /headless Chrome 153 on Windows against localhost/.test(notes) && /iOS\/WebKit, Firefox or Samsung Internet/.test(notes), INPUT_FILES.notesR1c);
  claim('r1c-lighthouse-a11y-100', 'the R1c release notes record Lighthouse accessibility 100', /accessibility 100/.test(notes), INPUT_FILES.notesR1c);
  const corpus = read(INPUT_FILES.corpusDoc);
  claim('corpus-not-shipped', 'CORPUS.md says the Official Records corpus is built and tested and not shipped', /built and tested, \*\*not shipped\*\*/.test(corpus), INPUT_FILES.corpusDoc);
  const credit = read('tools/t0/patches/CP.json').includes('Created by Mike Legere');
  claim('site-credits-creator', 'the site credit line reads "Created by Mike Legere" (patch cp:mobile-tools-footer) and the baseline bundle names him', credit && fs.readFileSync(path.join(REPO, 'baseline/dist/assets/index-Cg8FAMXN.js'), 'utf8').includes('Mike Legere'), 'tools/t0/patches/CP.json; baseline/dist/assets/index-Cg8FAMXN.js');

  // ---- owner decision 5 (2026-10-04): the approved creator bio, used verbatim, and the one public contact address
  const decisions = read(INPUT_FILES.decisions);
  const bioMd = read(INPUT_FILES.bio);
  const ADDRESS = 'gettysburginteractivemap@gmail.com';
  claim('owner-decision-5', 'the owner approved the creator bio (Option 2, first person) and named the project address as the only public contact', decisions.includes('Creator bio approved:') && decisions.includes(`Public contact is ${ADDRESS} only`), INPUT_FILES.decisions);
  const bioMatch = bioMd.match(/## Text[^\n]*\n\n([^\n]+)\n/);
  claim('approved-bio-present', 'docs/content/APPROVED-BIO.md holds one approved paragraph that names the author and the project address', Boolean(bioMatch) && bioMatch[1].includes('Mike Legere') && bioMatch[1].includes(ADDRESS), INPUT_FILES.bio);
  const bio = bioMatch[1].trim();
  claim('contact-config-is-the-approved-address', 'every contact key of tools/copy/trust-config.json is the approved public address (or empty)', Object.values(JSON.parse(read('tools/copy/trust-config.json')).contact).every((v) => !v || v === ADDRESS), 'tools/copy/trust-config.json');
  const gitMsg = (rev) => { try { return execFileSync('git', ['show', '-s', '--format=%B', rev], { cwd: REPO, encoding: 'utf8' }); } catch { return ''; } };
  const g1 = gitMsg('838b311'); const g2 = gitMsg('f348b34');
  claim('git-838b311-axe-and-targets', 'commit 838b311 records: sub-pages pass axe with 0 serious or critical violations on 25 pages at 1440, 375, 320, 412 and 768 px; 44 px (touch) and 24 px (mouse) targets; no text under 12 px', g1.includes('0 serious/critical, 25 pages, 1440/375/320/412/768') && g1.includes('44 px (touch) / 24 px (mouse) targets') && g1.includes('no text under 12 px'), 'git show 838b311');
  claim('git-f348b34-lighthouse', 'commit f348b34 records: Lighthouse 13.5 accessibility 100 on / for R1b and R1c, mobile and desktop, with and without tiles; R0 and R1a stay 90', g2.includes('Lighthouse 13.5 accessibility 100 on / for R1b and R1c, mobile and desktop, with and without tiles (R0/R1a stay 90'), 'git show f348b34');
  claim('qc-link-claims', 'QC-REPORT.md says 1,940 of 2,046 links (94.8%) go to hosts that refuse automated clients', qcMd.includes('1,940 of 2,046 links (94.8%)'), INPUT_FILES.qc);
  claim('corpus-numbers', 'CORPUS.md says 588 of the 589 reports are found and 8,232 passages', /588 of the 589 numbered reports are found/.test(corpus) && /8,232 citable passages/.test(corpus), INPUT_FILES.corpusDoc);
  const hashes = Object.fromEntries(Object.entries(INPUT_FILES).map(([k, rel]) => [rel, sha256(rel).slice(0, 16)]));
  const sha = (rel) => (fs.existsSync(path.join(REPO, rel)) && fs.statSync(path.join(REPO, rel)).isFile() ? sha256(rel).slice(0, 16) : null);
  return { asOf, sha, bio, publicContact: ADDRESS, facts, reg, qcCounts: qc, timeInfo, cas, help, features, parity, dataVersion, quality, hashes, claims, getFact: (p) => getPath(facts, p) };
}

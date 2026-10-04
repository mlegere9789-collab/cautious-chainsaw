#!/usr/bin/env node
// Builds the CANDIDATE user guide: candidates/user-guide/index.html (web), print.html (what the PDF is printed from), the tagged
// PDF, and guide-manifest.json (what was checked and the PDF metrics). Inert: not wired into any release.
//
//   node tools/guide/build-guide.mjs                  HTML + PDF (Letter) + PDF lint gates (one headless Chrome, port from COPY_PORT_BASE or 9100)
//   node tools/guide/build-guide.mjs --no-pdf         HTML only (no browser needed)
//   node tools/guide/build-guide.mjs --paper a4       an A4 PDF (gettysburg-user-guide-a4.pdf)
//   node tools/guide/build-guide.mjs --check          HTML only: compare with the committed files (exit 1 when they differ)
//   options: --out DIR  --features FILE  --allow-parity-mismatch  --no-gates
//
// The guide is driven by tools/guide/features.json. Before anything is written the manifest is compared with release train R1c
// (tools/guide/check-parity.mjs); a mismatch stops the build. The output is linted strictly with tools/copy/copy_lint.mjs rules
// (HTML, and the text layer of the PDF) and the build fails on any finding.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { REPO, makeEnv, lintSource } from '../copy/lib/lint.mjs';
import { runParity } from './check-parity.mjs';
import { extractNav } from './lib/t0src.mjs';
import { buildGuide } from './guide-content.mjs';
import { textLayerFindings } from './lib/textlayer.mjs';
import { renderGuide } from './guide-template.mjs';

export const DEFAULT_OUT = path.join(REPO, 'candidates', 'user-guide');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(REPO, rel), 'utf8'));

export const PDF_NAME = { letter: 'gettysburg-user-guide.pdf', a4: 'gettysburg-user-guide-a4.pdf' };

export function buildHtml({ featuresPath = path.join(REPO, 'tools', 'guide', 'features.json'), allowMismatch = false, paper = 'letter', publish = false } = {}) {
  const parity = runParity({ root: REPO, train: 'R1c', featuresPath });
  if (parity.mismatches.length && !allowMismatch) {
    const e = new Error(`the manifest does not match release R1c (${parity.mismatches.length} mismatch(es)): ${parity.mismatches.slice(0, 5).map((m) => m.code).join(', ')}`);
    e.parity = parity; throw e;
  }
  const features = JSON.parse(fs.readFileSync(featuresPath, 'utf8'));
  const facts = readJson('data-src/build/facts.json');
  const cfg = readJson('tools/copy/trust-config.json');
  const anchorsFile = readJson('data-src/time/time_anchors.json');
  const anchors = { total: anchorsFile.anchors.length, proposed: anchorsFile.anchors.filter((a) => a.state === 'proposed').length };
  if (anchors.proposed !== anchors.total) throw new Error('a time anchor is no longer in state proposed: the guide text about the clock must be rewritten');
  const nav = extractNav({ root: REPO, train: 'R1c' });
  const guide = buildGuide({ features, facts, cfg, nav, anchors });
  const base = { guide, paper, publish, release: features.release.train, author: 'Mike Legere', description: 'How to use the Gettysburg Interactive Map: keys and gestures, the pages in the menu, share links, the clock, known differences and accessibility, for release R1c.' };
  return { web: renderGuide({ ...base, mode: 'web' }), print: renderGuide({ ...base, mode: 'print' }), guide, features, parity, anchors };
}

function runPython(args) {
  try { return { code: 0, out: execFileSync('python', args, { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }; } catch (e) { return { code: e.status ?? 1, out: `${e.stdout || ''}${e.stderr || ''}` }; }
}

export async function printPdf({ printHtml, pdfPath, paper, port }) {
  const { withChrome } = await import('./lib/chrome.mjs');
  await withChrome(async ({ page, cdp }) => {
    await page.goto(pathToFileURL(printHtml).href, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const r = await cdp.send('Page.printToPDF', { generateTaggedPDF: true, generateDocumentOutline: true, preferCSSPageSize: true, printBackground: true, displayHeaderFooter: false });
    fs.writeFileSync(pdfPath, Buffer.from(r.data, 'base64'));
  }, { port, profile: `chrome-profile-guide-${paper}`, colorScheme: 'light' });
}

export async function build({ out = DEFAULT_OUT, featuresPath, paper = 'letter', pdf = true, gates = true, allowMismatch = false, log = console.log } = {}) {
  const r = buildHtml({ featuresPath, allowMismatch, paper });
  const env = makeEnv({ root: REPO });
  const printName = paper === 'a4' ? 'print-a4.html' : 'print.html';
  const pages = paper === 'a4' ? [[printName, r.print]] : [['index.html', r.web], [printName, r.print]];
  for (const [name, html] of pages) {
    const f = lintSource(name, html, env).findings;
    if (f.length) throw new Error(`copy_lint found ${f.length} finding(s) in the guide ${name}: ${f.slice(0, 5).map((x) => `${x.rule} "${x.match}"`).join(', ')}`);
  }
  fs.mkdirSync(out, { recursive: true });
  for (const [name, html] of pages) fs.writeFileSync(path.join(out, name), html);
  const mp = path.join(out, 'guide-manifest.json');
  const old = fs.existsSync(mp) ? JSON.parse(fs.readFileSync(mp, 'utf8')) : { files: {}, pdfs: {} };
  const manifest = { schema: 'gtbg/user-guide-manifest/1', status: 'CANDIDATE: inert, not wired into any release', as_of: r.guide.asOf, generator: 'node tools/guide/build-guide.mjs', release: r.features.release, parity: { mismatches: r.parity.mismatches.length, counts: r.parity.counts, help_wording_findings: r.parity.helpWording }, sections: r.guide.sections.map((s) => s.id), files: { ...(old.files || {}) }, pdfs: { ...(old.pdfs || {}) } };
  for (const [name, html] of pages) manifest.files[name] = { bytes: Buffer.byteLength(html), sha256: sha(html) };
  let lintResult = null;
  if (pdf) {
    const pdfPath = path.join(out, PDF_NAME[paper]);
    const port = Number(process.env.COPY_PORT_BASE || 9100);
    await printPdf({ printHtml: path.join(out, printName), pdfPath, paper, port });
    const post = runPython(['tools/guide/pdf_tools.py', 'post', pdfPath, '--title', r.guide.title, '--author', 'Mike Legere', '--subject', `User guide for release ${r.features.release.train} of the Gettysburg Interactive Map`, '--keywords', 'Gettysburg, Battle of Gettysburg, interactive map, user guide, keyboard shortcuts, accessibility', '--date', r.guide.asOf]);
    if (post.code) throw new Error(`pdf_tools post failed: ${post.out}`);
    const textPath = path.join(REPO, 'tmp', 'copy-trust-guide', `guide-${paper}.txt`);
    fs.mkdirSync(path.dirname(textPath), { recursive: true });
    const jsonPath = path.join(path.dirname(textPath), `guide-${paper}-lint.json`);
    const headings = (r.web.match(/<h[23][ >]/g) || []).length;
    const linkCounts = { internal: (r.print.match(/href="#/g) || []).length, external: new Set([...r.print.matchAll(/href="(https:[^"]+)"/g)].map((m) => m[1])).size };
    const lint = runPython(['tools/guide/pdf_tools.py', 'lint', pdfPath, '--json', jsonPath, '--text', textPath, '--expect-bookmarks', String(r.guide.sections.length + 1), '--expect-internal-links', String(r.guide.sections.length), '--expect-external-links', String(linkCounts.external)]);
    lintResult = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    log(lint.out.trim());
    const tl = textLayerFindings({ text: fs.readFileSync(textPath, 'utf8'), html: r.print, env });
    const textFindings = tl.findings;
    lintResult.copy_lint_text_layer = { findings: textFindings.map((x) => `${x.rule} "${x.match}"`), exempted_by_the_html: tl.exempted };
    manifest.files[PDF_NAME[paper]] = { bytes: fs.statSync(pdfPath).size, sha256: sha(fs.readFileSync(pdfPath)) };
    manifest.pdfs[paper] = { print_page: printName, headings_in_html: headings, metrics: summarise(lintResult), gates: lintResult.gates.map((g) => ({ id: g.id, ok: g.ok, value: g.value, need: g.need })), copy_lint_text_layer_findings: textFindings.length, copy_lint_text_layer_exempted_by_html: tl.exempted };
    if (gates && (!lintResult.pass || textFindings.length)) { fs.writeFileSync(mp, `${JSON.stringify(manifest, null, 1)}\n`); throw new Error(`the ${paper} PDF failed its gates: ${lintResult.gates.filter((g) => !g.ok).map((g) => g.id).join(', ') || 'copy_lint on the text layer'}`); }
  }
  fs.writeFileSync(mp, `${JSON.stringify(manifest, null, 1)}\n`);
  fs.writeFileSync(path.join(out, 'README.md'), readme());
  return { out, manifest, lint: lintResult, html: r };
}

export function summarise(l) {
  return { pages: l.pages, kilobytes: Math.round(l.bytes / 100) / 10, tagged: l.tagged, structure_elements: l.structure_total, structure_by_type: l.structure_elements, language: l.lang, title: l.metadata.title, author: l.metadata.author, bookmarks: l.bookmarks.count, fonts: l.fonts.map((f) => `${f.name} (${f.embedded ? 'embedded' : 'NOT embedded'})`), fill_min_pct: l.fill_min_pct, fill_median_pct: l.fill_median_pct, fill_last_pct: l.fill_last_pct, chars_ge_10pt_pct: l.chars_ge_10pt_pct, min_font_pt: l.min_font_pt, low_contrast_spans: l.low_contrast_spans.length, orphan_headings: l.orphan_headings.length, links: l.links.internal + l.links.external, links_external: l.links.external, links_internal: l.links.internal };
}

function readme() {
  return `# Candidate user guide

Status: CANDIDATE. Inert. Nothing in a release tree, \`tools/t0/trains.json\` or a patch refers to these files.

Generated by \`node tools/guide/build-guide.mjs\` from \`tools/guide/features.json\`, after \`node tools/guide/check-parity.mjs\` has compared that manifest with release train R1c (Help dialog, key handler, site menu, page headings, deep-link reader). \`print.html\` is the exact page the PDF is printed from (headless Chrome, \`Page.printToPDF\` with \`generateTaggedPDF\` and \`generateDocumentOutline\`); \`index.html\` is the same text as a web page. \`guide-manifest.json\` records the parity result and the PDF measurements and gates.

Preview the web page with \`node tools/copy/preview-server.mjs --dir candidates/user-guide\`.
`;
}

async function main(argv = process.argv.slice(2)) {
  const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
  const out = opt('out') ? path.resolve(opt('out')) : DEFAULT_OUT;
  const paper = opt('paper', 'letter');
  if (!PDF_NAME[paper]) { console.error('--paper must be letter or a4'); return 2; }
  const featuresPath = opt('features') ? path.resolve(opt('features')) : undefined;
  if (argv.includes('--check')) {
    let r; try { r = buildHtml({ featuresPath, paper }); } catch (e) { console.error(e.message); return 1; }
    const list = [['index.html', r.web], ['print.html', r.print]];
    if (fs.existsSync(path.join(out, 'print-a4.html'))) list.push(['print-a4.html', buildHtml({ featuresPath, paper: 'a4' }).print]);
    const diffs = list.filter(([n, c]) => !fs.existsSync(path.join(out, n)) || fs.readFileSync(path.join(out, n), 'utf8') !== c).map(([n]) => n);
    if (diffs.length) { console.error(`out of date: ${diffs.join(', ')}`); return 1; }
    console.log(`up to date: ${list.map(([n]) => n).join(', ')}`); return 0;
  }
  try {
    const r = await build({ out, featuresPath, paper, pdf: !argv.includes('--no-pdf'), gates: !argv.includes('--no-gates'), allowMismatch: argv.includes('--allow-parity-mismatch') });
    console.log(`wrote ${path.relative(REPO, r.out)}: ${Object.keys(r.manifest.files).join(', ')}`);
    return 0;
  } catch (e) { console.error(`cannot build: ${e.message}`); return 1; }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().then((c) => process.exit(c));
export { main };

#!/usr/bin/env node
// Builds docs/guide/out/user-guide.pdf from docs/guide/content.json and the screenshots in docs/guide/shots/.
//
//   node tools/guide/build.mjs [--html-only] [--png]
//
//   1. render docs/guide/src/guide.html from the content (tools/guide/lib/render.mjs)
//   2. print it with headless Chrome (Letter, tagged PDF, outline, embedded web fonts), read where every chapter landed
//   3. render again with the page numbers filled into the contents list and print again (the layout does not move: checked)
//   4. replace the file's metadata (tools/guide/lib/post.py) and write docs/guide/out/user-guide.pdf + build-report.json
//   --png   also write one PNG per page to tmp/guide/pages/ for visual review
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { GUIDE, TMP, REPO, loadContent, readJson } from './lib/site.mjs';
import { renderGuide } from './lib/render.mjs';
import { printPdf, py } from './lib/pdf.mjs';

const argv = process.argv.slice(2);
const content = loadContent();
const shotsFile = path.join(GUIDE, 'shots', 'shots.json');
if (!fs.existsSync(shotsFile)) { console.error('no screenshots yet: run node tools/guide/shots.mjs first'); process.exit(2); }
const shots = readJson(shotsFile);
const norm = (t) => String(t).replace(/\s+/g, '').toLowerCase();
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

const htmlPath = path.join(GUIDE, 'src', 'guide.html');
const outDir = path.join(GUIDE, 'out');
fs.mkdirSync(outDir, { recursive: true }); fs.mkdirSync(TMP, { recursive: true });

const write = (tocPages) => { const html = renderGuide({ content, shots, tocPages }); fs.writeFileSync(htmlPath, html); return html; };

write({});
if (argv.includes('--html-only')) { console.log(`wrote ${path.relative(REPO, htmlPath)}`); process.exit(0); }

const pass1 = path.join(TMP, 'guide-pass1.pdf');
const pass2 = path.join(TMP, 'guide-pass2.pdf');
await printPdf(pass1);
const i1 = py('pdfinfo.py', [pass1]);
const tocPages = {};
for (const c of content.chapters) {
  const hit = i1.outline.find((o) => o.level === 1 && norm(o.title) === norm(c.title));
  if (!hit) throw new Error(`chapter "${c.title}" is not in the outline of the printed PDF`);
  tocPages[`ch-${c.no}`] = hit.page;
}
write(tocPages);
const { fonts } = await printPdf(pass2);
const i2 = py('pdfinfo.py', [pass2]);
if (i2.pageCount !== i1.pageCount) throw new Error(`page count moved between passes (${i1.pageCount} -> ${i2.pageCount})`);
for (const c of content.chapters) {
  const hit = i2.outline.find((o) => o.level === 1 && norm(o.title) === norm(c.title));
  if (!hit || hit.page !== tocPages[`ch-${c.no}`]) throw new Error(`chapter "${c.title}" moved between passes`);
}

const metaFile = path.join(TMP, 'meta.json');
fs.writeFileSync(metaFile, JSON.stringify({ ...content.meta, creator: content.meta.author, date: content.release.date }));
const finalPdf = path.join(outDir, 'user-guide.pdf');
const r = spawnSync('python', ['-I', path.join(REPO, 'tools', 'guide', 'lib', 'post.py'), pass2, finalPdf, metaFile], { encoding: 'utf8' });
if (r.status !== 0) throw new Error('metadata step failed:\n' + r.stderr);

const bytes = fs.readFileSync(finalPdf);
const report = {
  schema: 'gtbg/guide-build/1',
  release: content.release.train, build: content.release.build, siteBuild: shots.build,
  pages: i2.pageCount, bytes: bytes.length, sha256: sha(bytes),
  contentSha256: sha(fs.readFileSync(path.join(GUIDE, 'content.json'))),
  shotsCaptured: shots.captured,
  chapters: tocPages,
  webFontsLoaded: fonts,
};
fs.writeFileSync(path.join(outDir, 'build-report.json'), JSON.stringify(report, null, 1) + '\n');
console.log(`wrote ${path.relative(REPO, finalPdf)}: ${report.pages} pages, ${(bytes.length / 1024).toFixed(0)} KB`);

if (argv.includes('--png')) {
  const dir = path.join(TMP, 'pages'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const rr = spawnSync('python', ['-I', '-c', `
import pymupdf,sys
d=pymupdf.open(sys.argv[1])
for i,p in enumerate(d):
    p.get_pixmap(dpi=110).save(sys.argv[2]+'/p%02d.png'%(i+1))
`, finalPdf, dir], { encoding: 'utf8' });
  if (rr.status !== 0) throw new Error(rr.stderr);
  console.log(`page images in ${path.relative(REPO, dir)}`);
}

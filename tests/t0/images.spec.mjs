// T0-RIMG-* : the site uses ONLY actual images of Gettysburg (optional patch group IMG, tools/t0/images/, licence ledger docs/basemap1863/site-images/LEDGER.md).
// Static checks of every image the built site serves or references (HTTP 200 through the Netlify-like lab server, byte-level decode of PNG / JPEG / ICO / SVG, the ledger,
// alt text and provenance captions, social cards, manifest and icons, hot-linked images, the user-guide PDF) plus a real-Chrome pass (every image decodes, the three
// captioned photographs render at 1440, 375 and 320 px without overflow, caption contrast).  No Mapbox request leaves the machine (tiles 'block').
//
//   python tools/t0/images/img_build.py --train R1c --out tmp/b1863/images/img-R1c       build R1c with IMG (scratch directory, trains.json untouched)
//   node tests/t0/images.spec.mjs --dist tmp/b1863/images/img-R1c/dist                    all tests
//   node tests/t0/images.spec.mjs --dist <tree> --filter 'IMG-0[3-5]'                     subset by id regex
//   node tests/t0/images.spec.mjs --dist release/R1c/dist --expect-red                    red-first proof: every F test must FAIL on a tree without the group (G tests are exempt)
//   node tests/t0/images.spec.mjs --dist <tree> --no-browser                              skip the two Chrome tests (IMG-02, IMG-10)
//
// Ids (F = feature test, red on a tree without IMG; G = guard, true on any good tree; IMG-01 and IMG-08 also catch the audit's corrupt og image on baseline/dist):
//   T0-RIMG-01 G  every image file the tree contains or any page / manifest / stylesheet / script references: exists, HTTP 200, image/* content type, decodes at byte level
//   T0-RIMG-02 G  real Chrome decodes every raster and the ICO/SVG (img.decode, natural size equals the byte-level size)
//   T0-RIMG-03 F  ledger: every image file of the tree is a row of LEDGER.md with the same sha256 (or a listed UI-glyph file), every row has a source id, a licence and a derivation, LEDGER.md and ledger.json agree
//   T0-RIMG-04 F  only real images of Gettysburg: no generic art left (card-r1.png, screenshots/*, icons/icon-*.png), every raster is a REAL-IMAGE-OF-GETTYSBURG row, sources are public-domain hosts / licences
//   T0-RIMG-05 F  alt and captions: every <img> has alt text, size attributes and sits in a <figure> whose <figcaption> links its source record and names its licence; every og/twitter image has alt text
//   T0-RIMG-06 F  social cards: og:image / twitter:image on every page name one existing JPEG/PNG, 1200x630, under 300 KB, with width/height/type/alt tags that match
//   T0-RIMG-07 F  manifest and icons: icon files exist with the declared sizes and types, a 512 any and a 512 maskable icon, no "screenshots" that are not real, favicon.ico 16/32, apple-touch-icon 180
//   T0-RIMG-08 G  no hot-linked images (every image URL in pages, styles and scripts is on this site), the user guide PDF embeds no picture, inline SVG is UI glyphs/charts only
//   T0-RIMG-09 G  ledger.json sources: id, creator, date, repository, record URL, licence, sha256, record type; licences from the allow-list; no Google/Bing/Maxar/Mapbox host
//   T0-RIMG-10 F  Chrome render: the captioned photographs load (naturalWidth > 0), captions are visible with contrast >= 4.5, no horizontal overflow at 375 and 320 px
//   T0-RIMG-11 G  reproducible: tools/t0/images/build_images.py --check (the committed derivatives and ledger are what the verified sources give); skipped if the sources are not fetched
//   T0-RIMG-12 G  Chrome reads the manifest without errors and reports no icon / manifest installability error (Page.getAppManifest, Page.getInstallabilityErrors); manifest icons decode at their declared size
//   T0-RIMG-X  G  the Chrome pass: 0 uncaught exceptions and 0 first-party console errors
process.env.T0_AGENT ??= 'b1863/images';
process.env.T0_PORT_BASE ??= '9740';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
const { REPO, TMP, PORT_BASE, openSession, createStaticServer, createSuite, assert, Skip, emulateViewport, cdpFor } = await import('./lib.mjs');

const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : dflt; };
const DIST = path.resolve(REPO, opt('dist', 'release/R1c/dist'));
const FILTER = opt('filter', null);
const EXPECT_RED = !!opt('expect-red', false);
const NO_BROWSER = !!opt('no-browser', false);
if (!fs.existsSync(DIST)) { console.error(`dist not found: ${DIST}\nbuild it first: python tools/t0/images/img_build.py --train R1c --out tmp/b1863/images/img-R1c`); process.exit(2); }
const SITE = 'https://gettysburginteractivemap.com';
const LEDGER_DIR = path.join(REPO, 'docs', 'basemap1863', 'site-images');
const IMG_EXT = /\.(png|jpe?g|gif|webp|avif|ico|svg|bmp|tiff?)$/i;
const RASTER_EXT = /\.(png|jpe?g|gif|webp|avif|ico|bmp|tiff?)$/i;

// ------------------------------------------------------------------ helpers
const walk = (dir, base = dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, base, out); else out.push(path.relative(base, p).split(path.sep).join('/'));
  }
  return out;
};
const FILES = walk(DIST);
const read = (rel) => fs.readFileSync(path.join(DIST, rel));
const readText = (rel) => fs.readFileSync(path.join(DIST, rel), 'utf8');
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const AXE = fs.readFileSync(path.join(REPO, 'node_modules', 'axe-core', 'axe.min.js'), 'utf8');
const HTML = FILES.filter((f) => f.endsWith('.html'));
const IMAGE_FILES = FILES.filter((f) => IMG_EXT.test(f) && !f.startsWith('_ops/'));

/** byte-level decoders: return {fmt, w, h} or throw */
function decodePng(b) {
  if (b.length < 45 || b.readUInt32BE(0) !== 0x89504e47 || b.readUInt32BE(4) !== 0x0d0a1a0a) throw new Error('not a PNG (bad signature)');
  let off = 8, w = 0, h = 0, bd = 0, ct = 0, il = 0, sawEnd = false; const idat = [];
  while (off + 12 <= b.length) {
    const len = b.readUInt32BE(off); const type = b.toString('latin1', off + 4, off + 8);
    if (off + 12 + len > b.length) throw new Error(`PNG chunk ${type} runs past the end of the file (truncated)`);
    const data = b.subarray(off + 8, off + 8 + len); const crc = b.readUInt32BE(off + 8 + len);
    if ((zlib.crc32(b.subarray(off + 4, off + 8 + len)) >>> 0) !== crc) throw new Error(`PNG chunk ${type} CRC mismatch`);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); bd = data[8]; ct = data[9]; il = data[12]; }
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') { sawEnd = true; off += 12 + len; break; }
    off += 12 + len;
  }
  if (!w || !h) throw new Error('PNG without IHDR'); if (!sawEnd) throw new Error('PNG without IEND'); if (!idat.length) throw new Error('PNG without IDAT');
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const ch = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ct]; if (!ch) throw new Error(`PNG colour type ${ct}`);
  if (!il) { const want = h * (1 + Math.ceil((w * ch * bd) / 8)); if (raw.length !== want) throw new Error(`PNG pixel data is ${raw.length} bytes, expected ${want}`); }
  return { fmt: 'png', w, h };
}
function decodeJpeg(b) {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) throw new Error('not a JPEG (no SOI)');
  let off = 2, w = 0, h = 0, sos = false;
  while (off + 4 <= b.length) {
    if (b[off] !== 0xff) throw new Error(`JPEG marker expected at ${off}`);
    const m = b[off + 1]; if (m === 0xff) { off++; continue; }
    if (m === 0xd9) break;
    if (m === 0xd8 || (m >= 0xd0 && m <= 0xd7) || m === 0x01) { off += 2; continue; }
    const len = b.readUInt16BE(off + 2);
    if ((m >= 0xc0 && m <= 0xcf) && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) { h = b.readUInt16BE(off + 5); w = b.readUInt16BE(off + 7); }
    if (m === 0xda) { sos = true; break; }
    off += 2 + len;
  }
  if (!w || !h) throw new Error('JPEG without a frame header'); if (!sos) throw new Error('JPEG without a scan');
  let e = b.length; while (e > 2 && b[e - 1] === 0) e--;
  if (!(b[e - 2] === 0xff && b[e - 1] === 0xd9)) throw new Error('JPEG without EOI (truncated)');
  return { fmt: 'jpeg', w, h };
}
function decodeIco(b) {
  if (b.length < 22 || b.readUInt16LE(0) !== 0 || b.readUInt16LE(2) !== 1) throw new Error('not an ICO');
  const n = b.readUInt16LE(4); if (!n) throw new Error('ICO without images'); const sizes = [];
  for (let i = 0; i < n; i++) {
    const o = 6 + i * 16; const w = b[o] || 256, h = b[o + 1] || 256, size = b.readUInt32LE(o + 8), off = b.readUInt32LE(o + 12);
    if (off + size > b.length) throw new Error('ICO entry runs past the end of the file');
    const e = b.subarray(off, off + size);
    if (e.readUInt32BE(0) === 0x89504e47) decodePng(e); else if (e.readUInt32LE(0) !== 40) throw new Error('ICO entry is neither PNG nor BMP');
    sizes.push([w, h]);
  }
  return { fmt: 'ico', w: Math.max(...sizes.map((s) => s[0])), h: Math.max(...sizes.map((s) => s[1])), sizes };
}
function decodeSvg(b) {
  const t = b.toString('utf8'); if (!/<svg[\s>]/.test(t) || !/<\/svg>\s*$/.test(t)) throw new Error('SVG is not a complete <svg> document');
  return { fmt: 'svg', w: 0, h: 0 };
}
function decode(rel) {
  const b = read(rel);
  if (/\.png$/i.test(rel)) return decodePng(b);
  if (/\.jpe?g$/i.test(rel)) return decodeJpeg(b);
  if (/\.ico$/i.test(rel)) return decodeIco(b);
  if (/\.svg$/i.test(rel)) return decodeSvg(b);
  throw new Error(`no decoder for ${rel} (a format the site should not ship)`);
}
const sniff = (b) => (b.readUInt32BE(0) === 0x89504e47 ? 'image/png' : b[0] === 0xff && b[1] === 0xd8 ? 'image/jpeg' : null);

// ---- tiny HTML attribute reader (no DOM library in the repo)
const attrsOf = (tag) => { const o = {}; for (const m of tag.matchAll(/([a-zA-Z_:][-\w:.]*)\s*=\s*("([^"]*)"|'([^']*)')/g)) o[m[1].toLowerCase()] = m[3] ?? m[4]; return o; };
const tagsOf = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map((m) => ({ raw: m[0], a: attrsOf(m[0]), index: m.index }));
const unesc = (s) => String(s ?? '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;|&apos;/g, "'");
const localPath = (u, pageRel = '') => {   // a URL as found in a page -> dist-relative path, or null when it is on another host / a data: URI
  u = unesc(u).trim(); if (!u || u.startsWith('data:') || u.startsWith('#') || u.startsWith('blob:')) return null;
  if (u.startsWith(SITE)) u = u.slice(SITE.length); else if (/^[a-z][a-z0-9+.-]*:|^\/\//i.test(u)) return null;
  u = u.split('#')[0].split('?')[0];
  if (u.startsWith('/')) return decodeURIComponent(u.slice(1));
  return decodeURIComponent(path.posix.normalize(path.posix.join(path.posix.dirname(pageRel), u)));
};
const isExternal = (u) => { u = unesc(u).trim(); return /^https?:\/\//i.test(u) && !u.startsWith(SITE); };

/** every image reference in the tree: {from, kind, url, local, external} */
function collectRefs() {
  const refs = [];
  const add = (from, kind, url) => { if (url == null || !String(url).trim()) return; const u = String(url).trim(); refs.push({ from, kind, url: u, local: localPath(u, from), external: isExternal(u) }); };
  for (const page of HTML) {
    const html = readText(page);
    for (const t of tagsOf(html, 'img')) { add(page, 'img', t.a.src); for (const s of String(t.a.srcset || '').split(',')) add(page, 'img-srcset', s.trim().split(/\s+/)[0]); }
    for (const t of tagsOf(html, 'source')) { add(page, 'source', t.a.src); for (const s of String(t.a.srcset || '').split(',')) add(page, 'source-srcset', s.trim().split(/\s+/)[0]); }
    for (const t of tagsOf(html, 'video')) add(page, 'video-poster', t.a.poster);
    for (const t of tagsOf(html, 'input')) if ((t.a.type || '').toLowerCase() === 'image') add(page, 'input-image', t.a.src);
    for (const t of tagsOf(html, 'link')) { const rel = (t.a.rel || '').toLowerCase(); if (/\b(icon|apple-touch-icon|apple-touch-icon-precomposed|mask-icon|image_src|apple-touch-startup-image)\b/.test(rel)) add(page, `link-${rel}`, t.a.href); }
    for (const t of tagsOf(html, 'meta')) { const k = (t.a.property || t.a.name || '').toLowerCase(); if (/^(og:image|og:image:url|og:image:secure_url|twitter:image|twitter:image:src)$/.test(k)) add(page, `meta-${k}`, t.a.content); if (k === 'msapplication-tileimage') add(page, `meta-${k}`, t.a.content); }
    for (const m of html.matchAll(/url\(\s*(['"]?)([^)'"]+)\1\s*\)/g)) { const u = m[2].trim(); if (u.startsWith('#') || u.startsWith('%23') || u.startsWith('data:')) continue; add(page, 'css-url', u); }
  }
  for (const f of FILES.filter((x) => /\.css$/.test(x))) for (const m of readText(f).matchAll(/url\(\s*(['"]?)([^)'"]+)\1\s*\)/g)) { const u = m[2].trim(); if (u.startsWith('#') || u.startsWith('%23') || u.startsWith('data:')) continue; add(f, 'css-url', u); }
  if (FILES.includes('manifest.json')) {
    const mf = JSON.parse(readText('manifest.json'));
    for (const i of mf.icons || []) add('manifest.json', 'manifest-icon', i.src);
    for (const i of mf.screenshots || []) add('manifest.json', 'manifest-screenshot', i.src);
    for (const s of mf.shortcuts || []) for (const i of s.icons || []) add('manifest.json', 'manifest-shortcut-icon', i.src);
  }
  const jsFiles = FILES.filter((x) => /\.(js|mjs)$/.test(x) && !x.startsWith('_ops/'));
  for (const f of jsFiles) for (const m of readText(f).matchAll(/["'`]((?:https?:\/\/[A-Za-z0-9._~:/?#@!$&()*+,;=%-]*|\/[A-Za-z0-9._~%/-]*)\.(?:png|jpe?g|gif|webp|avif|ico|svg))(?:\?[^"'`]*)?["'`]/g)) {
    if (/mapbox\.com\/(?:mapbox-gl-js|help|api)/.test(m[1])) continue; add(f, 'js-string', m[1]);
  }
  return refs;
}
let REFS = null; const refs = () => (REFS ??= collectRefs());

// ---- ledger
const ledgerJson = () => JSON.parse(fs.readFileSync(path.join(LEDGER_DIR, 'ledger.json'), 'utf8'));
function ledgerMd() {
  const txt = fs.readFileSync(path.join(LEDGER_DIR, 'LEDGER.md'), 'utf8');
  const rows = []; let section = '';
  for (const line of txt.split(/\r?\n/)) {
    if (/^## /.test(line)) section = line.slice(3).trim();
    const m = /^\| `([^`]+)` \|(.*)\|\s*`([0-9a-f]{64})`\s*\|\s*$/.exec(line);
    if (m && /^Shipped images/.test(section)) rows.push({ path: m[1], sha256: m[3], cells: m[2] });
    const u = /^\| `([^`]+)` \| (UI-GLYPH)\s*\|/.exec(line);
    if (u) rows.push({ path: u[1], ui: true });
  }
  return { rows, text: txt };
}

// ------------------------------------------------------------------ the suite
const suite = createSuite('images');
const F = new Set();            // feature-test ids (red on a tree without IMG)
const feature = (id, title, fn) => { F.add(id); suite.test(id, title, fn); };
const guard = (id, title, fn) => suite.test(id, title, fn);
let lab = null;
const getLab = async () => (lab ??= await createStaticServer({ root: DIST, port: PORT_BASE }));

guard('T0-RIMG-01', 'every image file and every referenced image: exists, HTTP 200, image content type, decodes at byte level', async (ctx) => {
  const lab = await getLab();
  const wanted = new Set(IMAGE_FILES);
  for (const r of refs()) if (r.local && IMG_EXT.test(r.local)) wanted.add(r.local);
  const bad = [];
  let n = 0;
  for (const rel of [...wanted].sort()) {
    n++;
    if (!FILES.includes(rel)) { bad.push(`${rel}: referenced but not in the tree`); continue; }
    try { decode(rel); } catch (e) { bad.push(`${rel}: ${e.message}`); continue; }
    const r = await fetch(`${lab.url}/${rel.split('/').map(encodeURIComponent).join('/')}`);
    const ct = r.headers.get('content-type') || ''; const body = Buffer.from(await r.arrayBuffer());
    if (r.status !== 200) bad.push(`${rel}: HTTP ${r.status}`); else if (!/^image\//.test(ct)) bad.push(`${rel}: content-type ${ct}`); else if (!body.equals(read(rel))) bad.push(`${rel}: served bytes differ from the file`);
  }
  const og = refs().filter((r) => /og:image|twitter:image/.test(r.kind));
  ctx.note('images', n); ctx.note('og/twitter references', og.length);
  assert(!bad.length, `${bad.length} problem(s): ${bad.join(' | ')}`);
  assert(og.length > 0, 'no og:image / twitter:image reference found at all');
});

guard('T0-RIMG-02', 'real Chrome decodes every raster, the ICO and the SVG (natural size equals the byte-level size)', async (ctx) => {
  if (NO_BROWSER) throw new Skip('--no-browser');
  const lab = await getLab();
  const s = await session();
  const page = await s.newPage();
  try {
    await page.goto(`${lab.url}/privacy.html`, { waitUntil: 'domcontentloaded' });
    const out = await page.evaluate(async (list) => {
      const res = [];
      for (const u of list) {
        try {
          if (/\.svg$/i.test(u)) { const t = await (await fetch(u)).text(); const d = new DOMParser().parseFromString(t, 'image/svg+xml'); res.push({ u, ok: true, w: 0, h: 0, xmlWellFormed: !d.querySelector('parsererror') }); continue; }   // a sprite is not a standalone image: reported, not failed (icons.svg has '--' inside its comment, so it is not well-formed XML; no page references it)
          const im = new Image(); im.src = u; await im.decode(); res.push({ u, ok: true, w: im.naturalWidth, h: im.naturalHeight });
        } catch (e) { res.push({ u, ok: false, err: String(e) }); }
      }
      return res;
    }, IMAGE_FILES.map((f) => `/${f}`));
    const bad = [];
    for (const r of out) {
      if (!r.ok) { bad.push(`${r.u}: ${r.err}`); continue; }
      const d = decode(r.u.slice(1));
      if (d.fmt !== 'svg' && d.fmt !== 'ico' && (r.w !== d.w || r.h !== d.h)) bad.push(`${r.u}: Chrome ${r.w}x${r.h}, bytes ${d.w}x${d.h}`);
    }
    ctx.note('decoded in Chrome', out.length);
    for (const r of out) if (r.xmlWellFormed === false) ctx.note(`${r.u} is not well-formed XML (kept: unreferenced UI sprite)`, true);
    assert(!bad.length, bad.join(' | '));
  } finally { await page.close(); }
});

feature('T0-RIMG-03', 'ledger: every image of the tree is a row of LEDGER.md with the same sha256; every row has a source, licence and derivation; md and json agree', async (ctx) => {
  const { rows, text } = ledgerMd(); const led = ledgerJson();
  const byPath = new Map(rows.filter((r) => !r.ui).map((r) => [r.path, r])); const ui = new Set(rows.filter((r) => r.ui).map((r) => r.path));
  const bad = [];
  for (const rel of IMAGE_FILES) {
    if (ui.has(rel)) continue;
    const row = byPath.get(rel);
    if (!row) { bad.push(`${rel}: not in LEDGER.md`); continue; }
    if (sha256(read(rel)) !== row.sha256) bad.push(`${rel}: sha256 differs from LEDGER.md`);
  }
  for (const p of byPath.keys()) if (!FILES.includes(p)) bad.push(`${p}: ledger row without a file in the tree`);
  for (const p of ui) if (!FILES.includes(p)) bad.push(`${p}: UI-glyph row without a file in the tree`);
  const jrows = new Map(led.rows.map((r) => [r.path, r]));
  for (const [p, r] of byPath) { const j = jrows.get(p); if (!j) bad.push(`${p}: in LEDGER.md but not in ledger.json`); else if (j.sha256 !== r.sha256) bad.push(`${p}: md and json sha256 differ`); }
  for (const j of led.rows) {
    if (!byPath.has(j.path)) bad.push(`${j.path}: in ledger.json but not in LEDGER.md`);
    for (const k of ['source', 'derivation', 'shows', 'place_date', 'attribution']) if (!j[k] || (typeof j[k] === 'object' && !Object.keys(j[k]).length)) bad.push(`${j.path}: empty ${k}`);
    if (!j.source?.licence || !j.source?.record_url || !j.source?.id) bad.push(`${j.path}: source without id/licence/record URL`);
    if (!text.includes(j.source?.id || '@@')) bad.push(`${j.path}: source ${j.source?.id} not described in LEDGER.md`);
  }
  ctx.note('image files in tree', IMAGE_FILES.length); ctx.note('ledger rows', byPath.size);
  assert(!bad.length, `${bad.length} problem(s): ${bad.slice(0, 12).join(' | ')}`);
});

feature('T0-RIMG-04', 'only real images of Gettysburg: no generic art left, every raster is a REAL-IMAGE-OF-GETTYSBURG row from a public-domain source', async (ctx) => {
  const led = ledgerJson(); const by = new Map(led.rows.map((r) => [r.path, r]));
  const bad = [];
  for (const old of ['og/card-r1.png', 'screenshots/day1.png', 'screenshots/day3.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-192.png', 'icons/icon-maskable-512.png']) if (FILES.includes(old)) bad.push(`${old}: generic / generated art is still served`);
  for (const rel of IMAGE_FILES.filter((f) => RASTER_EXT.test(f))) { const r = by.get(rel); if (!r) bad.push(`${rel}: raster without a ledger row`); else if (r.klass !== 'REAL-IMAGE-OF-GETTYSBURG' || r.status !== 'OK') bad.push(`${rel}: class ${r.klass}/${r.status}`); }
  for (const r of refs()) if (r.local && RASTER_EXT.test(r.local) && !by.has(r.local)) bad.push(`${r.from} -> ${r.local} (${r.kind}): referenced raster without a ledger row`);
  const BAD_HOST = /google\.|gstatic|googleusercontent|bing\.|maxar|digitalglobe|mapbox|arcgis|esri\.com|apple\.com\/maps/i;
  const GOOD_HOST = /^(images\.metmuseum\.org|upload\.wikimedia\.org|cdn\.loc\.gov|tile\.loc\.gov|www\.loc\.gov|catalog\.archives\.gov|www\.metmuseum\.org|commons\.wikimedia\.org)$/;
  for (const r of led.rows) { const h = new URL(r.source.file_url).hostname; if (BAD_HOST.test(h) || !GOOD_HOST.test(h)) bad.push(`${r.path}: source host ${h} is not on the public-domain allow-list`); }
  ctx.note('rasters', IMAGE_FILES.filter((f) => RASTER_EXT.test(f)).length);
  assert(!bad.length, `${bad.length} problem(s): ${bad.slice(0, 12).join(' | ')}`);
});

feature('T0-RIMG-05', 'alt text and provenance captions: every <img> and every social image', async (ctx) => {
  const led = ledgerJson(); const by = new Map(led.rows.map((r) => [r.path, r]));
  const bad = []; let imgs = 0, withOg = 0;
  for (const page of HTML) {
    const html = readText(page);
    for (const t of tagsOf(html, 'img')) {
      imgs++;
      const src = localPath(t.a.src || '', page); const alt = unesc(t.a.alt || '').trim();
      if (!src) { bad.push(`${page}: <img> without a local src (${t.a.src})`); continue; }
      if (alt.length < 25) bad.push(`${page}: ${src}: alt text missing or too short (${alt.length} characters)`);
      if (!t.a.width || !t.a.height) bad.push(`${page}: ${src}: width/height attributes missing (layout shift)`);
      if (!by.has(src)) bad.push(`${page}: ${src}: not in the ledger`);
      const figs = [...html.matchAll(/<figure\b[^>]*>([\s\S]*?)<\/figure>/gi)].filter((m) => m.index < t.index && m.index + m[0].length > t.index);
      if (!figs.length) { bad.push(`${page}: ${src}: not inside a <figure>`); continue; }
      const cap = /<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i.exec(figs[0][1]);
      if (!cap) { bad.push(`${page}: ${src}: figure without a <figcaption>`); continue; }
      if (!/href="https:\/\/(www\.metmuseum\.org|catalog\.archives\.gov|www\.loc\.gov)\//.test(cap[1])) bad.push(`${page}: ${src}: caption does not link the source record`);
      if (!/(public domain|cc0|no known restrictions)/i.test(cap[1])) bad.push(`${page}: ${src}: caption does not name the licence`);
      if (!/(19|18)\d\d/.test(cap[1])) bad.push(`${page}: ${src}: caption gives no date`);
    }
    const metas = tagsOf(html, 'meta').map((t) => t.a);
    const og = metas.find((a) => a.property === 'og:image'), tw = metas.find((a) => a.name === 'twitter:image');
    if (og) { withOg++; const alt = metas.find((a) => a.property === 'og:image:alt'); if (!alt || unesc(alt.content).trim().length < 40) bad.push(`${page}: og:image without og:image:alt`); }
    if (tw) { const alt = metas.find((a) => a.name === 'twitter:image:alt'); if (!alt || unesc(alt.content).trim().length < 40) bad.push(`${page}: twitter:image without twitter:image:alt`); }
  }
  ctx.note('<img> elements', imgs); ctx.note('pages with og:image', withOg);
  assert(withOg > 0, 'no page has an og:image');
  assert(!bad.length, `${bad.length} problem(s): ${bad.slice(0, 10).join(' | ')}`);
});

feature('T0-RIMG-06', 'social cards: one existing JPEG/PNG of exactly 1200x630 under 300 KB on every page, tags match the pixels', async (ctx) => {
  const bad = []; const urls = new Set(); let pages = 0;
  for (const page of HTML) {
    const html = readText(page);
    const metas = tagsOf(html, 'meta').map((t) => t.a);
    const og = metas.find((a) => a.property === 'og:image'), tw = metas.find((a) => a.name === 'twitter:image');
    if (!og && !tw) continue; pages++;
    if (!og) { bad.push(`${page}: twitter:image without og:image`); continue; }
    if (!og.content.startsWith(`${SITE}/`)) bad.push(`${page}: og:image is not an absolute URL on ${SITE}`);
    urls.add(og.content); if (tw && tw.content !== og.content) bad.push(`${page}: twitter:image differs from og:image`);
    const rel = localPath(og.content); if (!rel || !FILES.includes(rel)) { bad.push(`${page}: og:image ${og.content} does not exist in the tree`); continue; }
    let d; try { d = decode(rel); } catch (e) { bad.push(`${page}: ${rel}: ${e.message}`); continue; }
    if (d.w !== 1200 || d.h !== 630) bad.push(`${page}: ${rel} is ${d.w}x${d.h}, want 1200x630`);
    const size = read(rel).length; if (size > 300000) bad.push(`${page}: ${rel} is ${size} bytes (> 300000)`);
    const w = metas.find((a) => a.property === 'og:image:width'), h = metas.find((a) => a.property === 'og:image:height'), t = metas.find((a) => a.property === 'og:image:type');
    if (!w || +w.content !== d.w) bad.push(`${page}: og:image:width missing or not ${d.w}`);
    if (!h || +h.content !== d.h) bad.push(`${page}: og:image:height missing or not ${d.h}`);
    if (!t || t.content !== sniff(read(rel))) bad.push(`${page}: og:image:type missing or not ${sniff(read(rel))}`);
  }
  ctx.note('pages', pages); ctx.note('distinct og:image URLs', [...urls]);
  assert(pages >= 20, `only ${pages} pages carry a social image`);
  assert(urls.size === 1, `${urls.size} different og:image files (want one real card): ${[...urls].join(', ')}`);
  assert(!bad.length, `${bad.length} problem(s): ${bad.slice(0, 10).join(' | ')}`);
});

feature('T0-RIMG-07', 'manifest and icons: declared sizes and types are true, 512 any + 512 maskable, no unreal screenshots, favicon 16/32, apple-touch-icon 180', async (ctx) => {
  const bad = [];
  const mf = JSON.parse(readText('manifest.json')); const led = ledgerJson(); const by = new Map(led.rows.map((r) => [r.path, r]));
  const icons = mf.icons || [];
  for (const i of icons) {
    const rel = localPath(i.src, 'manifest.json'); if (!rel || !FILES.includes(rel)) { bad.push(`manifest icon ${i.src}: file missing`); continue; }
    let d; try { d = decode(rel); } catch (e) { bad.push(`${rel}: ${e.message}`); continue; }
    if (i.sizes !== `${d.w}x${d.h}`) bad.push(`${rel}: manifest says ${i.sizes}, file is ${d.w}x${d.h}`);
    if (i.type !== sniff(read(rel))) bad.push(`${rel}: manifest type ${i.type}, file is ${sniff(read(rel))}`);
    if (!by.has(rel)) bad.push(`${rel}: manifest icon not in the ledger`);
  }
  if (!icons.some((i) => i.purpose === 'any' && /^512x512$/.test(i.sizes))) bad.push('no 512x512 icon with purpose any');
  if (!icons.some((i) => i.purpose === 'maskable' && /^512x512$/.test(i.sizes))) bad.push('no 512x512 maskable icon');
  for (const s of mf.screenshots || []) { const rel = localPath(s.src, 'manifest.json'); if (!rel || !FILES.includes(rel)) bad.push(`manifest screenshot ${s.src}: file missing`); else if (!by.has(rel)) bad.push(`${rel}: manifest "screenshot" is not a real image in the ledger (a screenshot must show the app)`); }
  const fav = decodeIco(read('favicon.ico')); if (!fav.sizes.some((s) => s[0] === 16) || !fav.sizes.some((s) => s[0] === 32)) bad.push(`favicon.ico has sizes ${JSON.stringify(fav.sizes)}, want 16 and 32`);
  for (const f of ['apple-touch-icon.png', 'apple-touch-icon-precomposed.png']) { const d = decodePng(read(f)); if (d.w !== 180 || d.h !== 180) bad.push(`${f} is ${d.w}x${d.h}, want 180x180`); }
  const idx = readText('index.html');
  const links = tagsOf(idx, 'link').map((t) => t.a).filter((a) => /icon/i.test(a.rel || ''));
  if (!links.length) bad.push('index.html has no icon link');
  for (const l of links) { const rel = localPath(l.href, 'index.html'); if (!rel || !FILES.includes(rel)) bad.push(`index.html icon link ${l.href}: file missing`); else if (!by.has(rel)) bad.push(`index.html icon link ${l.href}: not in the ledger`); }
  ctx.note('manifest icons', icons.length); ctx.note('manifest screenshots', (mf.screenshots || []).length);
  assert(!bad.length, `${bad.length} problem(s): ${bad.slice(0, 10).join(' | ')}`);
});

guard('T0-RIMG-08', 'no hot-linked images; the user guide PDF embeds no picture; inline SVG is UI glyphs or charts only', async (ctx) => {
  const bad = [];
  for (const r of refs()) if (r.external) bad.push(`${r.from} (${r.kind}): ${r.url}`);
  const pdf = read('user-guide.pdf').toString('latin1');
  if (/\/Subtype\s*\/Image\b/.test(pdf)) bad.push('user-guide.pdf embeds an image XObject');
  if (/\/XObject\b/.test(pdf)) bad.push('user-guide.pdf has XObjects');
  let svgs = 0;
  for (const page of HTML) { const html = readText(page); for (const m of html.matchAll(/<svg\b[^>]*>/gi)) { svgs++; if (/<image\b/i.test(html.slice(m.index, html.indexOf('</svg>', m.index)))) bad.push(`${page}: an inline <svg> embeds an <image>`); } }
  for (const f of FILES.filter((x) => x === 'icons.svg')) if (/<image\b/i.test(readText(f))) bad.push(`${f} embeds an <image>`);
  ctx.note('inline svg', svgs);
  assert(!bad.length, `${bad.length} problem(s): ${bad.slice(0, 10).join(' | ')}`);
});

guard('T0-RIMG-09', 'ledger.json sources: complete records, licences on the allow-list, no Google/Bing/Maxar/Mapbox', async (ctx) => {
  const led = ledgerJson(); const bad = [];
  const LIC = /(public domain|cc0|no known restrictions)/i;
  for (const s of led.sources) {
    for (const k of ['id', 'title', 'creator', 'date', 'repository', 'record_url', 'file_url', 'licence', 'licence_url', 'sha256', 'type', 'verified', 'uncertain']) if (!s[k]) bad.push(`${s.id || '?'}: missing ${k}`);
    if (!LIC.test(s.licence || '')) bad.push(`${s.id}: licence ${s.licence}`);
    if (!/^[0-9a-f]{64}$/.test(s.sha256 || '')) bad.push(`${s.id}: sha256`);
    if (!['A1', 'A2', 'B'].includes(s.type)) bad.push(`${s.id}: record type ${s.type}`);
    for (const k of ['record_url', 'file_url', 'licence_url']) if (/google|bing\.|maxar|mapbox|digitalglobe/i.test(s[k] || '')) bad.push(`${s.id}: ${k} on a forbidden host`);
  }
  const used = new Set(led.rows.map((r) => r.source.id)); for (const s of led.sources) if (!used.has(s.id)) bad.push(`${s.id}: source that no shipped file uses`);
  ctx.note('sources', led.sources.length); ctx.note('shipped rows', led.rows.length);
  assert(led.sources.length >= 1 && !bad.length, `${bad.length} problem(s): ${bad.join(' | ')}`);
});

feature('T0-RIMG-10', 'Chrome render: the captioned photographs load, captions are visible with contrast >= 4.5, no horizontal overflow at 375 and 320 px', async (ctx) => {
  if (NO_BROWSER) throw new Skip('--no-browser');
  const led = ledgerJson(); const lab = await getLab();
  const figs = led.rows.map((r) => ({ path: r.path, page: (/figure on (\S+\.html)/.exec(r.use) || [])[1] })).filter((x) => x.page);
  assert(figs.length >= 1, 'the ledger names no figure page');
  const s = await session(); const bad = []; const shots = path.join(TMP, 'shots'); fs.mkdirSync(shots, { recursive: true });
  for (const f of figs) {
    for (const [w, h, label] of [[1440, 900, 'd'], [375, 812, 'p'], [320, 568, 's']]) {
      const page = await s.newPage();
      try {
        await emulateViewport(page, { width: w, height: h, dpr: w < 800 ? 2 : 1, mobile: w < 800, touch: w < 800 });
        await page.goto(`${lab.url}/${f.page}`, { waitUntil: 'load' });
        await page.evaluate(() => { for (const i of document.images) i.loading = 'eager'; });
        await page.waitForTimeout(400);
        const r = await page.evaluate((src) => {
          const img = [...document.images].find((i) => i.getAttribute('src') === src); if (!img) return { missing: true };
          img.scrollIntoView({ block: 'center' });
          const cap = img.closest('figure')?.querySelector('figcaption'); const cs = cap && getComputedStyle(cap);
          const lum = (c) => { const m = c.match(/[\d.]+/g).map(Number); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
          let bg = null; for (let e = cap; e; e = e.parentElement) { const b = getComputedStyle(e).backgroundColor; if (b && !/rgba?\(\s*0,\s*0,\s*0,\s*0\)|transparent/.test(b)) { bg = b; break; } }
          bg ||= getComputedStyle(document.body).backgroundColor;
          const l1 = lum(cs.color), l2 = lum(bg); const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
          const rect = img.getBoundingClientRect(); const cr = cap.getBoundingClientRect();
          return { nat: [img.naturalWidth, img.naturalHeight], complete: img.complete, shown: [Math.round(rect.width), Math.round(rect.height)], capVisible: cr.width > 0 && cr.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none',
            capFont: parseFloat(cs.fontSize), ratio: Math.round(ratio * 100) / 100, overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth, alt: img.alt.length };
        }, `/${f.path}`);
        if (r.missing) { bad.push(`${f.page}@${w}: <img src=/${f.path}> not in the page`); continue; }
        if (!r.complete || !r.nat[0]) bad.push(`${f.page}@${w}: image did not load`);
        if (r.shown[0] < Math.min(260, w - 40)) bad.push(`${f.page}@${w}: image drawn only ${r.shown[0]} px wide`);
        if (!r.capVisible) bad.push(`${f.page}@${w}: caption not visible`);
        if (r.ratio < 4.5) bad.push(`${f.page}@${w}: caption contrast ${r.ratio}`);
        if (r.capFont < 12) bad.push(`${f.page}@${w}: caption font ${r.capFont}px`);
        if (r.overflowX > 0) bad.push(`${f.page}@${w}: horizontal overflow ${r.overflowX}px`);
        if (w === 1440) {   // axe-core on the figure itself: alt text, link name, contrast, no violations of any impact
          await page.evaluate(AXE);
          const v = await page.evaluate(async () => (await window.axe.run({ include: [['figure.gtbg-photo']] })).violations.map((x) => `${x.id}(${x.impact})`));
          if (v.length) bad.push(`${f.page}: axe violations in the figure: ${v.join(', ')}`);
        }
        if (w === 375 || w === 1440) await page.screenshot({ path: path.join(shots, `${f.page.replace('.html', '')}-${label}.png`) });
        ctx.note(`${f.page}@${w}`, `${r.shown.join('x')} contrast ${r.ratio}`);
      } finally { await page.close(); }
    }
  }
  assert(!bad.length, `${bad.length} problem(s): ${bad.slice(0, 10).join(' | ')}`);
});

guard('T0-RIMG-12', 'Chrome: the manifest parses without errors, no icon/manifest installability error, every manifest icon decodes at its declared size', async (ctx) => {
  if (NO_BROWSER) throw new Skip('--no-browser');
  const lab = await getLab(); const s = await session();
  const probe = path.join(TMP, 'manifest-probe.html'); fs.mkdirSync(path.dirname(probe), { recursive: true });
  fs.writeFileSync(probe, '<!doctype html><meta charset=utf-8><title>probe</title><link rel="manifest" href="/manifest.json"><body>probe</body>');
  lab.setOverrides({ '/__manifest-probe.html': probe });
  const page = await s.newPage();
  try {
    await page.goto(`${lab.url}/__manifest-probe.html`, { waitUntil: 'load' });
    const cdp = await cdpFor(page); await cdp.send('Page.enable');
    const man = await cdp.send('Page.getAppManifest'); const errors = (man.errors || []).map((e) => e.message);
    const parsed = JSON.parse(man.data); const inst = await cdp.send('Page.getInstallabilityErrors');
    ctx.note('manifest parse errors', errors); ctx.note('installability errors', (inst.installabilityErrors || []).map((e) => e.errorId));
    assert(!errors.length, `manifest parse errors: ${errors.join(' | ')}`);
    const bad = (inst.installabilityErrors || []).filter((e) => /icon|manifest/i.test(e.errorId));
    assert(!bad.length, `manifest/icon installability errors: ${bad.map((e) => e.errorId).join(', ')}`);
    const list = [...(parsed.icons || []), ...(parsed.screenshots || [])];
    const out = await page.evaluate(async (l) => Promise.all(l.map(async (i) => { const im = new Image(); im.src = i.src; try { await im.decode(); return { src: i.src, sizes: i.sizes, w: im.naturalWidth, h: im.naturalHeight }; } catch (e) { return { src: i.src, sizes: i.sizes, w: 0, h: 0 }; } })), list.map((i) => ({ src: i.src, sizes: i.sizes })));
    const wrong = out.filter((o) => o.sizes !== `${o.w}x${o.h}`);
    assert(!wrong.length, `Chrome-decoded size differs from the manifest: ${JSON.stringify(wrong)}`);
  } finally { lab.setOverrides({}); await page.close(); }
});

guard('T0-RIMG-11', 'reproducible: build_images.py --check (committed derivatives and ledger equal what the verified sources give)', async () => {
  const src = path.join(REPO, 'tmp', 'b1863', 'images', 'sources');
  if (!fs.existsSync(src) || !fs.readdirSync(src).length) throw new Skip('sources not fetched (python tools/t0/images/fetch_sources.py)');
  const r = spawnSync('python', [path.join(REPO, 'tools', 't0', 'images', 'build_images.py'), '--check'], { encoding: 'utf8' });
  assert(r.status === 0, `build_images.py --check exit ${r.status}: ${(r.stdout + r.stderr).slice(0, 400)}`);
  const g = spawnSync('python', [path.join(REPO, 'tools', 't0', 'images', 'gen_patches.py'), '--check'], { encoding: 'utf8' });
  assert(g.status === 0, `gen_patches.py --check exit ${g.status}: ${(g.stdout + g.stderr).slice(0, 400)}`);
});

// ------------------------------------------------------------------ chrome session (shared by IMG-02 and IMG-10), console errors for IMG-X
let sess = null; const errors = [];
async function session() {
  if (sess) return sess;
  await getLab();
  sess = await openSession({ profile: 'spec', cdpPort: PORT_BASE + 1, tiles: 'block', onboarded: true, viewport: { width: 1440, height: 900, dpr: 1, mobile: false, touch: false } });
  const origNew = sess.newPage.bind(sess);
  sess.newPage = async () => { const p = await origNew(); p.on('pageerror', (e) => errors.push(`pageerror ${e.message}`)); p.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error ${m.text()}`.slice(0, 300)); }); return p; };
  return sess;
}
guard('T0-RIMG-X', 'the Chrome pass had 0 uncaught exceptions and 0 first-party console errors', async () => {
  if (!sess) throw new Skip('no browser test ran');
  const own = errors.filter((e) => !/mapbox|ERR_BLOCKED_BY_CLIENT|Failed to load resource/i.test(e));
  assert(!own.length, own.slice(0, 5).join(' | '));
});

const outFile = path.join(TMP, EXPECT_RED ? 'results-red.json' : 'results.json');
const summary = await suite.run({ filter: FILTER, outFile, extra: () => ({ dist: path.relative(REPO, DIST).split(path.sep).join('/') }) });
try { if (sess) await sess.close(); } catch { /* closing */ }
try { if (lab) await lab.close(); } catch { /* closing */ }
let code = summary.failed ? 1 : 0;
if (EXPECT_RED) {
  const notRed = summary.results.filter((r) => F.has(r.id) && r.status !== 'fail' && r.status !== 'skip');
  const green = summary.results.filter((r) => F.has(r.id) && r.status === 'fail').length;
  console.log(`red-first: ${green} of ${F.size} feature tests fail on ${path.relative(REPO, DIST)}${notRed.length ? `; NOT RED: ${notRed.map((r) => r.id).join(', ')}` : ''}`);
  code = notRed.length ? 1 : 0;
}
process.exit(code);

// SEO round (group PG-zseo, tools/t0/seo/gen_zseo.py): static checks of every shipped page. No browser, no network, no build; about 1 s.
//
//   node tests/t0/seo.spec.mjs                      reads release/R1e/dist, REPLAYS tools/t0/patches-next/PG-zseo.json on it in memory (the anchors are asserted, expect 1) and checks the result
//   node tests/t0/seo.spec.mjs --dist <dist>        a built tree that already contains the group (e.g. release/R1f/dist): nothing is replayed
//   node tests/t0/seo.spec.mjs --no-patch           the unpatched tree as it is (the patched-only tests then fail on purpose: they are the proof that the group does something)
//
// What is asserted: title length, one h1 (outside <noscript>), canonical self-reference, valid JSON-LD (and no invented rating, review, address, author, date, price),
// sitemap URLs exist in the dist and agree with their canonicals, robots.txt, no noindex on a production page (except ar, embed, 404, which are meant to be noindex),
// no X-Robots-Tag in _headers, Open Graph and Twitter tags, image attributes, every internal link resolves, every sitemap page reachable from the home page through STATIC links,
// and no mention of AI, Claude, Anthropic or how the site was built in a shipped file.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : d; };
const DIST = path.resolve(REPO, opt('dist', 'release/R1e/dist'));
const REPLAY = !opt('dist', false) && !opt('no-patch', false);
const GROUP = path.join(REPO, 'tools/t0/patches-next/PG-zseo.json');
const SITE = 'https://gettysburginteractivemap.com';
const NOINDEX_OK = new Set(['ar.html', 'embed.html', '404.html']);
const SKIP_HTML = new Set(['google0dca4879c9657741.html']);

const files = new Map();   // posix relative path -> string (text files only)
const walk = (d, rel = '') => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? (['tiles1863', 'screenshots'].includes(e.name) && !rel ? [] : walk(path.join(d, e.name), rel + e.name + '/')) : [rel + e.name]);
const ALL = walk(DIST);
const TEXT = /\.(html|css|js|json|xml|txt|svg|webmanifest)$|^_headers$|^_redirects$/;
for (const f of ALL) if (TEXT.test(f) || f === '_headers' || f === '_redirects') files.set(f, fs.readFileSync(path.join(DIST, f), 'utf8'));
const exists = (f) => ALL.includes(f);

const problems = [];   // replay problems are reported as the first test
if (REPLAY) {
  const g = JSON.parse(fs.readFileSync(GROUP, 'utf8'));
  for (const p of g.patches) {
    const t = files.get(p.target);
    if (t === undefined) { problems.push(`${p.id}: target ${p.target} not in the dist`); continue; }
    const n = t.split(p.find).length - 1;
    if (n !== p.expect) { problems.push(`${p.id}: find matches ${n} times, expect ${p.expect}`); continue; }
    files.set(p.target, t.split(p.find).join(p.repl));
  }
}

const meta = (t, key) => { const m = new RegExp('<meta\\s+(?:name|property)="' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"\\s+content="([^"]*)"', 'i').exec(t); return m ? m[1] : null; };
const unesc = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const noScript = (t) => t.replace(/<noscript[\s\S]*?<\/noscript>/gi, '').replace(/<script[\s\S]*?<\/script>/gi, '');
const ldBlocks = (t) => [...t.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const htmls = [...files.keys()].filter((f) => /^[^/]+\.html$/.test(f) && !SKIP_HTML.has(f));
const sitemapLocs = [...(files.get('sitemap.xml') || '').matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
const pageOf = (url) => { const u = url.replace(SITE, ''); return u === '/' ? 'index.html' : u.replace(/^\//, ''); };
const sitemapPages = sitemapLocs.map(pageOf);

const results = [];
const test = (id, name, fn) => { try { const r = fn(); const bad = Array.isArray(r) ? r : (r ? [String(r)] : []); results.push({ id, name, bad }); } catch (e) { results.push({ id, name, bad: ['threw: ' + e.message] }); } };

test('T0-SEO-00', REPLAY ? 'PG-zseo replays on the dist (every anchor found exactly expect times)' : 'dist used as given', () => problems);

test('T0-SEO-01', 'title present, 10 to 75 characters, on every page', () => htmls.filter((f) => !NOINDEX_OK.has(f)).flatMap((f) => {
  const m = /<title>([\s\S]*?)<\/title>/.exec(files.get(f)); const t = m && unesc(m[1].trim());
  return !t ? [`${f}: no <title>`] : (t.length < 10 || t.length > 75 ? [`${f}: title is ${t.length} characters`] : []);
}));
test('T0-SEO-01b', 'titles are unique', () => { const seen = {}; const out = []; for (const f of htmls.filter((x) => !NOINDEX_OK.has(x))) { const t = /<title>([\s\S]*?)<\/title>/.exec(files.get(f))?.[1]; if (seen[t]) out.push(`${f} repeats the title of ${seen[t]}`); seen[t] = f; } return out; });
test('T0-SEO-02', 'one h1 outside <noscript> on every indexable page', () => htmls.filter((f) => !NOINDEX_OK.has(f)).flatMap((f) => {
  const n = (noScript(files.get(f)).match(/<h1[\s>]/g) || []).length; return n === 1 ? [] : [`${f}: ${n} h1`];
}));
test('T0-SEO-03', 'meta description present, 60 to 200 characters, unique', () => { const seen = {}; const out = []; for (const f of htmls.filter((x) => !NOINDEX_OK.has(x))) { const d = meta(files.get(f), 'description'); if (!d) { out.push(`${f}: no description`); continue; } const u = unesc(d); if (u.length < 60 || u.length > 200) out.push(`${f}: description is ${u.length} characters`); if (seen[u] && !['privacy.html', 'terms.html'].includes(f)) out.push(`${f} repeats the description of ${seen[u]}`); seen[u] = f; } return out; });
test('T0-SEO-04', 'canonical present and self-referencing, and the file exists, on every indexable page', () => htmls.filter((f) => !NOINDEX_OK.has(f)).flatMap((f) => {
  const m = /<link rel="canonical" href="([^"]+)"/.exec(files.get(f)); if (!m) return [`${f}: no canonical`];
  const want = f === 'index.html' ? SITE + '/' : SITE + '/' + f; return m[1] === want ? [] : [`${f}: canonical ${m[1]} (want ${want})`];
}));
test('T0-SEO-05', 'no noindex on a production page (meta robots, X-Robots-Tag in _headers)', () => {
  const out = [];
  for (const f of htmls) { const r = meta(files.get(f), 'robots'); if (r && /noindex/i.test(r) && !NOINDEX_OK.has(f)) out.push(`${f}: meta robots "${r}"`); if (NOINDEX_OK.has(f) && f !== 'ar.html' && f !== 'embed.html' && f !== '404.html') out.push(f); }
  for (const f of ['ar.html', 'embed.html', '404.html']) { const r = meta(files.get(f) || '', 'robots'); if (!r || !/noindex/i.test(r)) out.push(`${f}: should be noindex, is "${r}"`); }
  if (/x-robots-tag/i.test(files.get('_headers') || '')) out.push('_headers contains X-Robots-Tag (the staging variant must not be shipped to production)');
  return out;
});
test('T0-SEO-06', 'sitemap.xml: absolute https URLs on the site, no duplicates, each file exists, indexable, canonical equals loc, no invented lastmod', () => {
  const out = []; const s = files.get('sitemap.xml'); if (!s) return ['no sitemap.xml'];
  if (new Set(sitemapLocs).size !== sitemapLocs.length) out.push('duplicate <loc>');
  for (const u of sitemapLocs) {
    if (!u.startsWith(SITE + '/')) { out.push(`${u}: not on ${SITE}`); continue; }
    const f = pageOf(u); if (!exists(f)) { out.push(`${u}: ${f} is not in the dist`); continue; }
    const t = files.get(f); const c = /<link rel="canonical" href="([^"]+)"/.exec(t)?.[1];
    if (c !== u) out.push(`${u}: canonical is ${c}`);
    const r = meta(t, 'robots'); if (r && /noindex/i.test(r)) out.push(`${u}: noindex page in the sitemap`);
  }
  for (const m of s.matchAll(/<lastmod>([^<]*)<\/lastmod>/g)) if (!/^\d{4}-\d{2}-\d{2}(T[\d:.+Z-]+)?$/.test(m[1]) || new Date(m[1]) > new Date()) out.push(`bad lastmod ${m[1]}`);
  for (const f of htmls.filter((x) => !NOINDEX_OK.has(x) && !['privacy.html', 'terms.html'].includes(x))) if (!sitemapPages.includes(f)) out.push(`${f}: indexable page missing from the sitemap`);
  return out;
});
test('T0-SEO-07', 'robots.txt allows the site and names the sitemap', () => { const r = files.get('robots.txt') || ''; const out = []; if (/^\s*Disallow:\s*\/\s*$/mi.test(r)) out.push('Disallow: /'); if (!/^Sitemap:\s*https:\/\/gettysburginteractivemap\.com\/sitemap\.xml\s*$/mi.test(r)) out.push('no Sitemap line'); return out; });
test('T0-SEO-08', 'every JSON-LD block parses and states nothing invented (no rating, review, address, phone, price, author or date other than the existing ones)', () => {
  const out = []; const BAD = /"(aggregateRating|ratingValue|reviewCount|review|address|telephone|email|offers|price|datePublished|dateModified|dateCreated)"/;
  for (const f of htmls) for (const b of ldBlocks(files.get(f))) {
    let j; try { j = JSON.parse(b); } catch (e) { out.push(`${f}: invalid JSON-LD (${e.message})`); continue; }
    if (BAD.test(b)) out.push(`${f}: JSON-LD has a property the site cannot state (${BAD.exec(b)[1]})`);
    if (j['@context'] !== 'https://schema.org') out.push(`${f}: @context`);
  }
  return out;
});
test('T0-SEO-09', 'PATCHED: every sitemap page has WebPage + BreadcrumbList JSON-LD that agrees with its canonical, title and description (home: WebApplication + WebSite)', () => {
  const out = [];
  for (const f of sitemapPages) {
    const t = files.get(f); const blocks = ldBlocks(t).map((b) => JSON.parse(b));
    const nodes = blocks.flatMap((b) => b['@graph'] || [b]); const type = (x) => nodes.filter((n) => n['@type'] === x);
    if (f === 'index.html') { if (!type('WebApplication').length) out.push('index: WebApplication missing'); if (!type('WebSite').length) out.push('index: WebSite missing'); continue; }
    const w = type('WebPage')[0], b = type('BreadcrumbList')[0];
    if (!w || !b) { out.push(`${f}: WebPage/BreadcrumbList missing`); continue; }
    const canon = /<link rel="canonical" href="([^"]+)"/.exec(t)[1];
    if (w.url !== canon) out.push(`${f}: WebPage.url ${w.url}`);
    if (w.name !== unesc(/<title>([\s\S]*?)<\/title>/.exec(t)[1].trim())) out.push(`${f}: WebPage.name differs from <title>`);
    if (w.description !== unesc(meta(t, 'description'))) out.push(`${f}: WebPage.description differs from the meta description`);
    const items = b.itemListElement; if (items.length !== 2 || items[0].item !== SITE + '/' || items[1].item !== canon || items[0].position !== 1 || items[1].position !== 2) out.push(`${f}: breadcrumb is not Home > page`);
  }
  return out;
});
test('T0-SEO-10', 'Open Graph (title, description, type, url, image that exists) and twitter:card on every indexable page', () => htmls.filter((f) => !NOINDEX_OK.has(f) && !['privacy.html', 'terms.html'].includes(f)).flatMap((f) => {
  const t = files.get(f); const out = [];
  for (const k of ['og:title', 'og:description', 'og:type', 'og:url', 'og:image']) if (!meta(t, k)) out.push(`${f}: no ${k}`);
  const img = meta(t, 'og:image'); if (img && (!img.startsWith(SITE + '/') || !exists(img.slice(SITE.length + 1)))) out.push(`${f}: og:image ${img} is not a file of the dist`);
  if (!meta(t, 'twitter:card')) out.push(`${f}: no twitter:card`);
  return out;
}));
test('T0-SEO-11', 'every <img> has alt, width and height', () => htmls.flatMap((f) => (files.get(f).match(/<img\b[^>]*>/g) || []).flatMap((i) => ['alt=', 'width=', 'height='].filter((a) => !i.includes(a)).map((a) => `${f}: <img> without ${a}`))));
test('T0-SEO-12', 'every internal href of a static page resolves to a file of the dist', () => {
  const out = []; const hasDeep = (f) => exists(f) || ['', '/'].includes(f);
  for (const f of htmls) for (const m of noScript(files.get(f)).matchAll(/<a\b[^>]*\shref="(\/[^"#?]*)/g)) { const p = m[1].replace(/^\//, ''); if (p && !exists(p) && !exists(p + '.html')) out.push(`${f}: link to ${m[1]}`); }
  return out;
});
test('T0-SEO-13', 'PATCHED: every sitemap page, the privacy page and the terms page is reachable from the home page through static links (what a crawler without JavaScript sees)', () => {
  const seen = new Set(['index.html']); const q = ['index.html'];
  while (q.length) { const f = q.shift(); const t = files.get(f); if (!t) continue; for (const m of t.matchAll(/<a\b[^>]*\shref="(\/[^"#?]*)/g)) { let p = m[1].replace(/^\//, '') || 'index.html'; if (!p.endsWith('.html') && exists(p + '.html')) p += '.html'; if (p.endsWith('.html') && !seen.has(p)) { seen.add(p); q.push(p); } } }
  const home = noScript(files.get('index.html')); const staticFromHome = new Set([...home.matchAll(/<a\b[^>]*\shref="\/([^"#?]*)/g)].map((m) => m[1]));
  const want = [...sitemapPages.filter((p) => p !== 'index.html'), 'privacy.html', 'terms.html'];
  return want.filter((p) => !staticFromHome.has(p)).map((p) => `${p}: no static link from the home page`);
});
test('T0-SEO-14', 'no mention of AI, Claude, Anthropic or how the site was built in a shipped text file', () => {
  const out = []; const RE = /\b(Claude|Anthropic|ChatGPT|OpenAI|artificial intelligence|language model|AI[- ](?:generated|assisted|powered|built)|generated by AI|built with AI|vibe[- ]cod)/i, AIW = /(^|[^A-Za-z0-9])AI([^A-Za-z0-9]|$)/;
  for (const [f, t] of files) {
    if (/^assets\/index-.*\.js$/.test(f)) { if (RE.test(t)) out.push(`${f}: ${RE.exec(t)[0]}`); continue; }   // the bundle: the explicit phrases only (vendor code holds the letters "AI" in identifiers)
    if (/^(tiles1863|data)\//.test(f)) continue;
    if (RE.test(t) || (/\.(html|json|xml|txt)$/.test(f) && AIW.test(t))) out.push(`${f}: ${(RE.exec(t) || AIW.exec(t))[0].trim()}`);
  }
  return out;
});
test('T0-SEO-15', 'no production page restricts following or snippets with a robots meta', () => htmls.filter((f) => !NOINDEX_OK.has(f)).flatMap((f) => { const r = meta(files.get(f), 'robots'); return r && /(nofollow|none|nosnippet|max-snippet:0)/i.test(r) ? [`${f}: robots "${r}"`] : []; }));

let bad = 0;
for (const r of results) { const ok = r.bad.length === 0; if (!ok) bad++; console.log(`${ok ? 'PASS' : 'FAIL'} ${r.id} ${r.name}`); for (const b of r.bad.slice(0, 12)) console.log('       ' + b); if (r.bad.length > 12) console.log(`       ... ${r.bad.length - 12} more`); }
console.log(`${results.length - bad}/${results.length} passed (${REPLAY ? 'PG-zseo replayed in memory on ' : ''}${path.relative(REPO, DIST).split(path.sep).join('/')})`);
process.exit(bad ? 1 : 0);

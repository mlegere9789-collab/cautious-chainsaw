#!/usr/bin/env node
// docs/accept/triage/assert_waivers.mjs
//
// Evaluates the automated assertions of docs/accept/triage/regression_waivers.proposed.json against a candidate build.
// A proposed waiver is only valid while ALL of its assertions pass: each one proves that the intentional replacement
// EXISTS in the candidate (so a waiver cannot hide a different break), and the `ledger` / `lines` / `controls` assertions
// prove that nothing else changed on that surface (a new patch id, a new missing line or a new missing control fails them).
//
//   node docs/accept/triage/assert_waivers.mjs [--candidate <zip|dir>]            default deliver/gettysburg-R1c-2531699e-PRODUCTION.zip
//        [--baseline baseline/dist] [--anchors release/R1c/anchors.json]          patch ledger of the candidate's build (release/<train>/anchors.json)
//        [--waivers <file>] [--pass docs/accept/dryrun/pass-1.json]               a run_pass.mjs report, for the screenshot-budget assertions
//        [--only W01,W07]  [--no-browser]  [--json out.json]
//
// Exit 0: every assertion passed.  Exit 1: at least one failed (the waiver does not apply; the printed detail is the finding).
// Exit 3: some assertions were skipped (no --pass / --no-browser) and none failed.
// Nothing here writes outside tmp/triage/ (scratch extraction, Chrome profiles) and the optional --json file.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractZip, walk, sha256File, readJson, parseArgs } from '../../../tools/accept/lib/util.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..');
const args = parseArgs(process.argv.slice(2), { 'no-browser': 'bool' });
const abs = (p) => (path.isAbsolute(p) ? p : path.resolve(REPO, p));
const waiverFile = abs(args.waivers || path.join(HERE, 'regression_waivers.proposed.json'));
const candidateArg = abs(args.candidate || 'deliver/gettysburg-R1c-2531699e-PRODUCTION.zip');
const baseDir = abs(args.baseline || 'baseline/dist');
const anchorsPath = abs(args.anchors || 'release/R1c/anchors.json');
const passPath = args.pass ? abs(args.pass) : null;
const noBrowser = !!args['no-browser'];
const only = args.only ? String(args.only).split(',') : null;
const W = readJson(waiverFile);

// ------------------------------------------------------------------ candidate tree
const SCRATCH = path.join(REPO, 'tmp', 'triage', 'assert-run');
let candDir = candidateArg;
if (fs.statSync(candidateArg).isFile()) {
  candDir = path.join(SCRATCH, 'cand');
  fs.rmSync(candDir, { recursive: true, force: true });
  fs.mkdirSync(candDir, { recursive: true });
  extractZip(candidateArg, candDir);
}
const rd = (dir, f) => fs.readFileSync(path.join(dir, f), 'utf8');
const exists = (dir, f) => fs.existsSync(path.join(dir, f));
const anchors = fs.existsSync(anchorsPath) ? readJson(anchorsPath) : null;
const pass = passPath && fs.existsSync(passPath) ? readJson(passPath) : null;
const re = (s, flags = '') => new RegExp(s, flags);
const lit = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const matchesAny = (line, list) => list.some((p) => (p.startsWith('re:') ? re(p.slice(3)).test(line) : p === line));

// ------------------------------------------------------------------ browser plumbing (lazy)
let B = null;
async function browser() {
  if (B) return B;
  process.env.T0_AGENT = 'triage/assert-chrome-' + String(args['port-base'] || 9100);   // one scratch dir (and Chrome profile) per port base: two runs may go side by side
  process.env.T0_PORT_BASE = String(args['port-base'] || 9100);
  process.env.T0_TILE_CAP = String(args['tile-cap'] || 2500);
  const lib = await import(pathToUrl(path.join(REPO, 'tests', 't0', 'lib.mjs')));
  const { startNetlifyServer } = await import(pathToUrl(path.join(REPO, 'tools', 'accept', 'lib', 'netlify_server.mjs')));
  const { settle } = await import(pathToUrl(path.join(REPO, 'tools', 'accept', 'lib', 'browser.mjs')));
  const base = await startNetlifyServer({ root: baseDir, honour: false });
  const cand = await startNetlifyServer({ root: candDir, honour: true });
  const session = await lib.openSession({ profile: 'assert', reset: true, cdpPort: Number(args['port-base'] || 9100) + 1, headless: true, onboarded: true, tiles: 'inject' });
  B = { lib, settle, base, cand, session, cache: new Map() };
  return B;
}
function pathToUrl(p) { return 'file:///' + p.replace(/\\/g, '/'); }
async function closeBrowser() { if (!B) return; try { await B.session.close(); await B.base.close(); await B.cand.close(); } catch { /* closing */ } }

async function openPage(origin, vp) {
  const b = await browser();
  const page = await b.session.newPage();
  await b.lib.emulateViewport(page, { width: vp[0], height: vp[1], dpr: 1, mobile: vp[0] < 500 });
  return page;
}
const MAPPAGES = new Set(['camera', 'cinematic-export', 'compare', 'ground-remembers', 'immersive', 'sandbox', 'viewshed', 'watch-together']);
const PAGE_INFO = () => {
  const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const names = (el) => { const l = []; const add = (v) => { v = (v || '').replace(/\s+/g, ' ').trim().slice(0, 80); if (v && !l.includes(v)) l.push(v); };
    add(el.getAttribute('aria-label')); add(el.innerText); add(el.getAttribute('title')); add(el.getAttribute('alt')); add(el.getAttribute('placeholder')); add(el.value);
    const im = el.querySelector && el.querySelector('img[alt]'); if (im) add(im.alt);
    const lb = el.getAttribute('aria-labelledby'); if (lb) add(lb.split(/\s+/).map((i) => (document.getElementById(i) || {}).innerText).join(' '));
    if (el.labels && el.labels.length) add([...el.labels].map((x) => x.innerText).join(' ')); return l; };
  const controls = [...document.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=link],[role=tab],[role=menuitem],[role=checkbox],[role=switch],[role=slider]')].filter(vis)
    .map((el) => { const n = names(el); return { tag: el.tagName.toLowerCase(), role: el.getAttribute('role') || '', primary: n[0] || '', names: n }; });
  const lines = document.body.innerText.split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter((l) => l.length > 1);
  return { lines, controls, scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth };
};
/** one capture of a route in the baseline ('base') or the candidate ('cand'); the baseline app first shows its intro and the layout chooser (cleared here, which tools/accept/checks/c3 does not do) */
async function capture(which, route, vp) {
  const b = await browser(); const key = `${which}|${route}|${vp[0]}`;
  if (b.cache.has(key)) return b.cache.get(key);
  const origin = which === 'base' ? b.base.url : b.cand.url;
  const page = await openPage(origin, vp);
  try {
    await page.goto(origin + route, { waitUntil: 'load', timeout: 60000 });
    const name = route === '/' ? 'index' : route.slice(1);
    if (route === '/') {
      await b.lib.waitForApp(page, 60000);
      if (which === 'base') {
        const chooser = page.getByText('Choose Your Experience');
        await chooser.first().waitFor({ state: 'visible', timeout: 25000 });
        await page.getByText(vp[0] < 500 ? 'Select Mobile' : 'Select Desktop').first().click();
        await chooser.first().waitFor({ state: 'detached', timeout: 10000 });
      }
      await b.settle(page, 6000);
    } else await b.settle(page, MAPPAGES.has(name) ? 9000 : 2500);
    const info = await page.evaluate(PAGE_INFO);
    b.cache.set(key, info);
    return info;
  } finally { await page.close(); }
}


/** patches of groups with a recorded decision (allowGroups) that touch a route's files in the candidate's ledger */
const groupsOnRoute = (route) => {
  if (!anchors) return [];
  const files = route === '/' ? ['index.html', 'js', 'help', 'book', 'css'] : [route.slice(1) + '.html'];
  const groups = W.allowGroups || {};
  const g = new Set(anchors.patches.filter((p) => files.includes(p.target) && p.group in groups && p.group !== 'R0M').map((p) => p.group));
  // every page reads the data files: when the ledger has DATA patches on data/*, DATA explains data-driven text on any route
  if ('DATA' in groups && anchors.patches.some((p) => p.group === 'DATA' && /^data\//.test(p.target))) g.add('DATA');
  return [...g];
};
// ------------------------------------------------------------------ assertion types
const T = {};
T['file-absent'] = (a) => ({ ok: !exists(candDir, a.file), detail: `${a.file} ${exists(candDir, a.file) ? 'IS' : 'is not'} in the candidate` });
T['file-present'] = (a) => ({ ok: exists(candDir, a.file), detail: `${a.file} ${exists(candDir, a.file) ? 'is' : 'is NOT'} in the candidate` });
T['baseline-file-sha'] = (a) => { const h = exists(baseDir, a.file) ? sha256File(path.join(baseDir, a.file)) : null; return { ok: h === a.sha256, detail: `baseline ${a.file} sha256 ${h}` }; };
T['unreferenced'] = (a) => {
  // `token` (a file name, or a part of it) is named by no text file of the baseline (except the file itself) and no text file of the candidate (except the ledger of used names)
  const hits = (dir, skip) => walk(dir).filter((f) => !skip(f) && /\.(m?js|css|html|json|xml|txt|webmanifest|tsv|toml)$|^_headers$|^_redirects$/.test(f) && rd(dir, f).includes(a.token));
  const bh = hits(baseDir, (f) => f === a.file), ch = hits(candDir, (f) => f === '_ops/used-names.txt');
  return { ok: bh.length === 0 && ch.length === 0, detail: `token "${a.token}" named by baseline files: [${bh.join(', ')}], candidate files: [${ch.join(', ')}]` };
};
T['no-same-origin-worker'] = (a) => {
  // an app Worker would be created from a string literal URL; Mapbox's own workers are created from a variable (blob/worker url)
  const bad = []; const hits = (dir, f) => { const t = rd(dir, f); return (t.match(/new Worker\(\s*["'`][^"'`]+["'`]/g) || []); };
  for (const [dir, label] of [[baseDir, 'baseline'], [candDir, 'candidate']]) for (const f of walk(dir).filter((x) => /\.(m?js|html)$/.test(x))) { const m = hits(dir, f); if (m.length) bad.push(`${label}:${f}:${m[0]}`); }
  return { ok: bad.length === 0, detail: bad.length ? 'literal-URL Workers: ' + bad.join('; ') : 'no `new Worker("<literal url>")` in the baseline or the candidate: the published app never starts that script' };
};
T['contains'] = (a) => {
  const dir = a.in === 'baseline' ? baseDir : candDir; if (!exists(dir, a.file)) return { ok: false, detail: `${a.file} missing` };
  const t = rd(dir, a.file); const ok = a.regex ? re(a.regex, a.flags || '').test(t) : t.includes(a.text);
  return { ok, detail: `${a.in || 'candidate'} ${a.file} ${ok ? 'contains' : 'does NOT contain'} ${a.regex ? '/' + a.regex + '/' : JSON.stringify(a.text.slice(0, 70))}` };
};
T['not-contains'] = (a) => {
  const dir = a.in === 'baseline' ? baseDir : candDir; if (!exists(dir, a.file)) return { ok: true, detail: `${a.file} absent` };
  const t = rd(dir, a.file); const found = a.regex ? re(a.regex, a.flags || '').test(t) : t.includes(a.text);
  return { ok: !found, detail: `${a.in || 'candidate'} ${a.file} ${found ? 'STILL contains' : 'does not contain'} ${a.regex ? '/' + a.regex + '/' : JSON.stringify(a.text.slice(0, 70))}` };
};
T['manifest'] = (a = {}) => {
  const m = readJson(path.join(candDir, 'manifest.json')); const mb = readJson(path.join(baseDir, 'manifest.json')); const bad = [];
  if ('orientation' in m) bad.push('orientation still present');
  if (mb.orientation !== 'landscape') bad.push(`baseline orientation is ${mb.orientation}, not landscape (the triage premise changed)`);
  if (m.id !== '/') bad.push(`id is ${m.id}`);
  if (m.start_url !== mb.start_url || m.display !== mb.display || m.name !== mb.name || m.short_name !== mb.short_name) bad.push('start_url/display/name/short_name differ from the published manifest');
  const png = (f) => { const b = fs.readFileSync(path.join(candDir, f.replace(/^\//, ''))); return b.readUInt32BE(0) === 0x89504e47 ? [b.readUInt32BE(16), b.readUInt32BE(20)] : null; };
  for (const i of [...m.icons, ...(m.screenshots || [])]) {
    const f = i.src.replace(/^\//, ''); if (!exists(candDir, f)) { bad.push(`${i.src} missing`); continue; }
    const d = png(f); const want = String(i.sizes).split('x').map(Number); if (!d || d[0] !== want[0] || d[1] !== want[1]) bad.push(`${i.src} is ${d && d.join('x')} not ${i.sizes}`);
  }
  if (!m.icons.some((i) => i.purpose === 'maskable')) bad.push('no maskable icon');
  if (!m.icons.some((i) => /\bany\b/.test(i.purpose || 'any') && i.sizes === '512x512')) bad.push('no 512 any icon');
  const removedKeys = Object.keys(mb).filter((k) => !(k in m));
  const okRemoved = new Set(['orientation', ...(a.allowRemovedKeys || [])]);
  if (removedKeys.some((k) => !okRemoved.has(k))) bad.push('other keys removed: ' + removedKeys.filter((k) => !okRemoved.has(k)).join(','));
  return { ok: bad.length === 0, detail: bad.length ? bad.join('; ') : `orientation removed (was "${mb.orientation}"), id "/", ${m.icons.length} icons + ${(m.screenshots || []).length} screenshots decode at their declared sizes, a maskable icon exists, only ${[...okRemoved].map((k) => '"' + k + '"').join(', ')} removed` };
};
T['ledger'] = (a) => {
  if (!anchors) return { ok: false, skip: true, detail: `no patch ledger at ${path.relative(REPO, anchorsPath)} (pass --anchors)` };
  const files = new Set(a.files); const rows = anchors.patches.filter((p) => files.has(p.target));
  const allowIds = new Set(a.allowIds || []), groups = W.allowGroups || {};
  const unknown = rows.filter((p) => !allowIds.has(p.id) && !(p.group in groups));
  const failed = rows.filter((p) => !p.ok);
  const missing = (a.requireIds || []).filter((id) => !rows.some((p) => p.id === id && p.ok));
  const viaGroups = [...new Set(rows.filter((p) => !allowIds.has(p.id) && p.group in groups).map((p) => p.group))];
  const ok = !unknown.length && !failed.length && !missing.length;
  return { ok, detail: ok ? `${rows.length} patch(es) on ${a.files.join(', ')}: all listed${viaGroups.length ? '; further groups with a recorded decision: ' + viaGroups.join(', ') : ''}; required replacements present` : `unlisted patch(es): [${unknown.map((p) => p.id + '[' + p.group + ']').join(', ')}] failed: [${failed.map((p) => p.id).join(', ')}] required but missing: [${missing.join(', ')}]` };
};
T['data-dashboard-no-mismatch'] = () => {
  const j = readJson(path.join(candDir, 'data', 'casualty_apportionment.json')); const bad = [];
  for (const c of [...j.union_corps, ...j.confederate_corps]) { const s = c.engagement_periods.reduce((x, p) => x + p.casualties, 0); if (s !== c.total_casualties) bad.push(`${c.corps_id}: periods sum ${s} but total_casualties ${c.total_casualties} (${(s / c.initial_strength * 100).toFixed(1)}%)`); }
  const html = rd(candDir, 'dashboard.html'); const flagged = /hasDataMismatch/.test(html) && /&#9888;/.test(html);
  return { ok: bad.length === 0 && !flagged, detail: bad.length ? 'the corps the published dashboard flagged with a warning glyph are STILL inconsistent in the data, and the candidate no longer flags them: ' + bad.join('; ') : `every corps' engagement periods sum to its total_casualties, so the warning glyph the published page printed has nothing left to flag${flagged ? ' (but the page still carries the glyph code)' : ''}` };
};
T['data-changes-accounted'] = (a) => {
  // every data/*.json the candidate changes against the published build must be the work of patches (of a group with a recorded decision) in the candidate's ledger
  const changed = walk(candDir).filter((f) => /^data\/.*\.(json|geojson)$/.test(f) && exists(baseDir, f) && sha256File(path.join(candDir, f)) !== sha256File(path.join(baseDir, f)));
  const added = walk(candDir).filter((f) => /^data\/.*\.(json|geojson)$/.test(f) && !exists(baseDir, f));
  if (!changed.length && !added.length) return { ok: true, detail: 'no data file differs from the published build' };
  if (!anchors) return { ok: false, skip: true, detail: `${changed.length} data file(s) differ; no patch ledger given (--anchors)` };
  const groups = W.allowGroups || {}; const bad = [];
  for (const f of changed) { const rows = anchors.patches.filter((p) => p.target === f); if (!rows.length) bad.push(`${f}: changed with no patch in the ledger`); else if (rows.some((p) => !(p.group in groups))) bad.push(`${f}: patch of a group without a recorded decision (${[...new Set(rows.map((p) => p.group))].join(',')})`); }
  const nots = added.filter((f) => !anchors.patches.some((p) => p.target === f) && !(a.allowAdded || []).includes(f));
  if (nots.length) bad.push('added without a patch: ' + nots.join(', '));
  return { ok: bad.length === 0, detail: bad.length ? bad.join('; ') : `${changed.length} published data file(s) differ${changed.length ? '; every one is covered by ledger patches of groups with a recorded decision (' + [...new Set(anchors.patches.filter((p) => changed.includes(p.target)).map((p) => p.group))].join(', ') + ')' : ''}; ${added.length} data file(s) added (${added.join(', ') || '-'}; allowed: ${(a.allowAdded || []).join(', ') || '-'})` };
};
T['lines'] = async (a) => {
  const [b, c] = [await capture('base', a.route, a.vp), await capture('cand', a.route, a.vp)];
  const cl = new Set(c.lines), bl = new Set(b.lines);
  const lost = b.lines.filter((l) => !cl.has(l)), gained = c.lines.filter((l) => !bl.has(l));
  const unexpected = lost.filter((l) => !matchesAny(l, a.lostAllowed || []));
  const missingNew = (a.gainedRequired || []).filter((p) => !c.lines.some((l) => matchesAny(l, [p])));
  const viaGroups = unexpected.length ? groupsOnRoute(a.route) : [];
  // composite builds: lines changed by a group with a recorded decision (CLOCK, DATA, POLISH ...) are accepted when each is SUBSTITUTED (as many new lines as lost ones); the list goes to the review field
  const composite = unexpected.length > 0 && viaGroups.length > 0 && gained.length >= unexpected.length && !missingNew.length;
  const ok = (!unexpected.length || composite) && !missingNew.length;
  return { ok, review: composite ? { route: a.route, vp: a.vp[0], groups: viaGroups, lost: unexpected, gained } : undefined,
    detail: ok ? `${a.route}@${a.vp[0]}: ${lost.length} published line(s) gone; ${composite ? `${unexpected.length} of them changed by ${viaGroups.join('+')} and substituted (REVIEW LIST in --json)` : 'all documented'}; ${(a.gainedRequired || []).length} replacement line(s) present` : `${a.route}@${a.vp[0]}: UNDOCUMENTED lost line(s): ${JSON.stringify(unexpected.map((l) => l.slice(0, 90)))}${viaGroups.length ? ` (page touched by ${viaGroups.join('+')} but ${gained.length} new line(s) < ${unexpected.length} lost: deleted, not substituted)` : ''}; replacement(s) not found: ${JSON.stringify(missingNew)}` };
};
T['controls'] = async (a) => {
  const [b, c] = [await capture('base', a.route, a.vp), await capture('cand', a.route, a.vp)];
  const pool = c.controls.map((x) => ({ ...x, used: false })); const lost = [];
  for (const x of b.controls) { const h = pool.find((y) => !y.used && y.tag === x.tag && (y.names.includes(x.primary) || (!x.primary && !y.primary))); if (h) h.used = true; else lost.push(x); }
  const unexpected = lost.filter((x) => !matchesAny(`${x.tag}|${x.primary}`, a.lostAllowed || []));
  const added = pool.filter((x) => !x.used);
  const missingNew = (a.candidateHas || []).filter((p) => !c.controls.some((x) => matchesAny(`${x.tag}|${x.primary}`, [p]) || x.names.some((n) => matchesAny(`${x.tag}|${n}`, [p]))));
  const viaGroups = unexpected.length ? groupsOnRoute(a.route) : [];
  const composite = unexpected.length > 0 && viaGroups.length > 0 && added.length >= unexpected.length && !missingNew.length;
  const ok = (!unexpected.length || composite) && !missingNew.length;
  return { ok, review: composite ? { route: a.route, vp: a.vp[0], groups: viaGroups, lost: unexpected.map((x) => `${x.tag}|${x.primary}`), added: added.map((x) => `${x.tag}|${x.primary}`) } : undefined,
    detail: ok ? `${a.route}@${a.vp[0]}: ${lost.length} published control(s) without a same-name counterpart; ${composite ? `${unexpected.length} changed by ${viaGroups.join('+')} and re-named/moved (REVIEW LIST in --json)` : 'all documented'}; replacements present` : `${a.route}@${a.vp[0]}: UNDOCUMENTED lost control(s): ${JSON.stringify(unexpected.map((x) => x.tag + '|' + x.primary))}${viaGroups.length ? ` (page touched by ${viaGroups.join('+')} but only ${added.length} new control(s) for ${unexpected.length} lost)` : ''}; replacement(s) not found: ${JSON.stringify(missingNew)}` };
};
T['overflow'] = async (a) => {
  const c = await capture('cand', a.route, a.vp);
  return { ok: c.scrollWidth <= a.vp[0], detail: `${a.route}@${a.vp[0]}: document scrollWidth ${c.scrollWidth} (limit ${a.vp[0]})` };
};
T['screens-budget'] = (a) => {
  if (!pass) return { ok: false, skip: true, detail: 'no --pass report given' };
  const c3 = pass.checks.find((c) => c.id === '3'); const s = (c3.raw.screens || []).find((x) => x.tag === a.tag);
  if (!s) return { ok: true, detail: `${a.tag}: no screenshot difference reported in this pass` };
  const dh = s.cand[1] - s.base[1];
  const ok = s.diffRatio * 100 <= a.maxRatioPercent && (a.maxHeightDelta == null || Math.abs(dh) <= a.maxHeightDelta);
  return { ok, detail: `${a.tag}: ${(s.diffRatio * 100).toFixed(3)} % differ (budget ${a.maxRatioPercent} %), page height ${s.base[1]} -> ${s.cand[1]} (${dh >= 0 ? '+' : ''}${dh}; budget +-${a.maxHeightDelta})` };
};

// ------------------------------------------------------------------ named browser checks
const C = {};
C['no-chooser'] = async () => {
  const b = await browser(); const bad = []; const seen = [];
  for (const [vp, layout] of [[[1440, 900], 'desktop'], [[390, 844], 'mobile']]) {
    const page = await openPage(b.cand.url, vp);
    try {
      await page.goto(b.cand.url + '/', { waitUntil: 'load', timeout: 60000 }); await b.lib.waitForApp(page, 60000); await b.settle(page, 8000);
      const r = await page.evaluate(() => ({ chooser: /Choose Your Experience/.test(document.body.innerText), layout: document.documentElement.getAttribute('data-layout') }));
      seen.push(`${vp[0]}px -> ${r.layout}`);
      if (r.chooser) bad.push(`${vp[0]}px: the chooser is shown`); if (r.layout !== layout) bad.push(`${vp[0]}px: data-layout is ${r.layout}, expected ${layout}`);
    } finally { await page.close(); }
  }
  // the override and the way back
  const page = await openPage(b.cand.url, [390, 844]);
  try {
    await page.goto(b.cand.url + '/?layout=desktop', { waitUntil: 'load', timeout: 60000 }); await b.lib.waitForApp(page, 60000); await b.settle(page, 5000);
    const r = await page.evaluate(() => { const bt = document.getElementById('ef-layout'); return { layout: document.documentElement.getAttribute('data-layout'), phoneBtn: !!bt && getComputedStyle(bt).display !== 'none' }; });
    seen.push(`390px ?layout=desktop -> ${r.layout}, Phone view control ${r.phoneBtn ? 'visible' : 'HIDDEN'}`);
    if (r.layout !== 'desktop') bad.push('?layout=desktop not honoured'); if (!r.phoneBtn) bad.push('no Phone view control on the desktop layout of a phone');
    await page.locator('#ef-layout').click(); await b.settle(page, 2500);
    const back = await page.evaluate(() => document.documentElement.getAttribute('data-layout')); seen.push(`after Phone view -> ${back}`); if (back !== 'mobile') bad.push('Phone view does not return to the phone layout');
  } finally { await page.close(); }
  return { ok: bad.length === 0, detail: bad.length ? bad.join('; ') : 'no chooser at 1440 (layout desktop) and 390 (layout mobile); ?layout=desktop works and Phone view returns: ' + seen.join('; ') };
};
C['index-desktop'] = async () => {
  const b = await browser(); const bad = []; const seen = [];
  const read = async (origin, which) => {
    const page = await openPage(origin, [1440, 900]);
    try {
      await page.goto(origin + '/', { waitUntil: 'load', timeout: 60000 }); await b.lib.waitForApp(page, 60000);
      if (which === 'base') { const ch = page.getByText('Choose Your Experience'); await ch.first().waitFor({ state: 'visible', timeout: 25000 }); await page.getByText('Select Desktop').first().click(); await ch.first().waitFor({ state: 'detached', timeout: 10000 }); }
      await b.settle(page, 6000);
      return await page.evaluate(() => {
        const g = [...document.querySelectorAll('a[href]')].find((a) => /user-guide\.pdf$/.test(a.getAttribute('href')) && /PDF/.test(a.innerText));
        const r = document.querySelector('input[type=range]');
        return { text: document.body.innerText, guide: g && { href: g.getAttribute('href'), text: g.innerText.trim(), download: g.hasAttribute('download') }, range: r && { label: r.getAttribute('aria-label'), min: r.min, max: r.max, vt: r.getAttribute('aria-valuetext'), box: [Math.round(r.getBoundingClientRect().width), Math.round(r.getBoundingClientRect().height)] }, sound: [...document.querySelectorAll('button')].filter((x) => /cannon sound|^🔇$|^🔊$/.test((x.title || '') + (x.innerText || '') + (x.getAttribute('aria-label') || ''))).length };
      });
    } finally { await page.close(); }
  };
  const bs = await read(b.base.url, 'base'), cs = await read(b.cand.url, 'cand');
  if (!/July 3, 1863/.test(bs.text)) bad.push('premise: the published HUD no longer says July 3, 1863 at tick 1');
  if (!/July 1, 1863/.test(cs.text) || /July 3, 1863/.test(cs.text)) bad.push('candidate HUD at tick 1 does not read July 1, 1863'); else seen.push('HUD July 3, 1863 -> July 1, 1863');
  const um = /(\d+) units . (tick 1|about [0-9:]+ [AP]M)/.exec(cs.text); if (!um) bad.push('no "N units . <moment>" minimap caption'); else seen.push(`minimap ${um[1]} units at the first moment (published ${(/(\d+) units . tick 1/.exec(bs.text) || [])[1]})`);
  if (!cs.guide || cs.guide.href !== '/user-guide.pdf' || !cs.guide.download || bs.guide?.href !== cs.guide.href) bad.push(`guide link: ${JSON.stringify(cs.guide)} vs published ${JSON.stringify(bs.guide)}`); else seen.push(`guide link "${bs.guide.text}" -> "${cs.guide.text}", same href and download`);
  if (!cs.range || cs.range.label !== 'Battle time' || cs.range.min !== '1' || cs.range.max !== '675' || !cs.range.vt) bad.push('timeline slider is not the named 1..675 range: ' + JSON.stringify(cs.range)); else seen.push(`timeline slider named "${cs.range.label}" ${cs.range.min}..${cs.range.max}, valuetext "${cs.range.vt}" (published: unnamed "0")`);
  if (cs.sound) bad.push('a sound control is still present'); else seen.push('no sound button');
  if (!/1x \(base speed\)/.test(cs.text) || /real time/.test(cs.text)) bad.push('speed label is not "1x (base speed)"'); else seen.push('"1x (real time)" -> "1x (base speed)"');
  return { ok: bad.length === 0, detail: bad.length ? bad.join('; ') : seen.join('; ') };
};
C['phone-shell'] = async (a) => {
  const b = await browser(); const bad = []; const seen = [];
  const open = async () => { const page = await openPage(b.cand.url, [390, 844]); await page.goto(b.cand.url + '/', { waitUntil: 'load', timeout: 60000 }); await b.lib.waitForApp(page, 60000); await b.settle(page, 3500); return page; };
  // 1. the Extra Features pill is hidden by design on the phone layout and its menu is the "More tools" part of the Tools sheet
  const p = await open();
  try {
    const pill = await p.evaluate(() => { const e = document.getElementById('extra-features'); return e ? getComputedStyle(e).display : 'absent'; });
    if (pill !== 'none') bad.push(`#extra-features is ${pill} on the phone layout (expected hidden: its menu lives in the Tools sheet)`);
    await p.getByRole('button', { name: /Tools/ }).first().click(); await b.settle(p, 900);
    const labels = await p.evaluate(() => [...document.querySelectorAll('button')].filter((x) => x.offsetParent).map((x) => x.innerText.replace(/\s+/g, ' ').trim()));
    const missing = (a.tiles || []).filter((t) => !labels.some((l) => l.endsWith(t)));
    if (missing.length) bad.push('Tools tiles missing: ' + missing.join(', ')); else seen.push(`${(a.tiles || []).length} Tools tiles present`);
    const more = await p.evaluate(() => [...document.querySelectorAll('.gtbg-mp-more a[href]')].map((x) => x.getAttribute('href')).sort());
    const d = await openPage(b.cand.url, [1440, 900]);
    let desk = [];
    try { await d.goto(b.cand.url + '/', { waitUntil: 'load', timeout: 60000 }); await b.lib.waitForApp(d, 60000); await b.settle(d, 3000); await d.locator('#extra-features button', { hasText: /Extra Features|More to Explore/ }).first().click(); await b.settle(d, 800); desk = await d.evaluate(() => [...document.querySelectorAll('#ef-menu a[href]')].map((x) => x.getAttribute('href')).sort()); } finally { await d.close(); }
    const pages = (l) => [...new Set(l.filter((h) => /\.html$/.test(h)))].sort();   // page links only: later groups add the guide and units entries to the desktop menu
    const dp = pages(desk), mp = pages(more);
    const onlyDesk = dp.filter((h) => !mp.includes(h)), onlyPhone = mp.filter((h) => !dp.includes(h));
    if (!mp.length || !dp.length || onlyDesk.length || onlyPhone.length) bad.push(`More tools page links (${mp.length}) != desktop menu page links (${dp.length}): only desktop [${onlyDesk}], only phone [${onlyPhone}]`); else seen.push(`More tools page links == desktop Extra Features menu page links (${mp.length} links)`);
  } finally { await p.close(); }
  // 2. what each tile opens
  for (const [label, exp] of Object.entries(a.opens || {})) {
    const page = await open();
    try {
      await page.getByRole('button', { name: /Tools/ }).first().click(); await b.settle(page, 700);
      await page.locator('button', { hasText: label }).first().click(); await b.settle(page, 2000);
      const r = await page.evaluate(() => ({ url: location.pathname, text: document.body.innerText.replace(/\s+/g, ' '), dialogs: [...document.querySelectorAll('[role=dialog],[aria-modal=true]')].length, inputs: [...document.querySelectorAll('input')].filter((i) => i.offsetParent).length }));
      const ok = (!exp.url || r.url.endsWith(exp.url)) && (!exp.text || re(exp.text).test(r.text)) && (!exp.dialog || r.dialogs > 0) && (!exp.input || r.inputs > 0);
      if (!ok) bad.push(`tile "${label}" did not open ${JSON.stringify(exp)} (url ${r.url}, dialogs ${r.dialogs}, inputs ${r.inputs})`); else seen.push(`"${label}" opens ${exp.url || exp.text || (exp.dialog ? 'a dialog' : 'a panel')}`);
    } finally { await page.close(); }
  }
  return { ok: bad.length === 0, detail: bad.length ? bad.join('; ') : seen.join('; ') };
};
C['historian'] = async () => {
  const b = await browser(); const bad = []; const seen = [];
  const page = await openPage(b.cand.url, [1440, 900]);
  try {
    await page.goto(b.cand.url + '/historian', { waitUntil: 'load', timeout: 60000 }); await b.settle(page, 3000);
    const how = await page.evaluate(() => document.getElementById('how').innerText);
    const m = /\((\d+) regiments, (\d+) stories, (\d+) events, (\d+) places\)/.exec(how);
    if (!m) bad.push('the "how" sentence carries no computed counts: ' + how);
    else {
      // the counts are computed from the data the page loads; recompute them from the files
      const oobDir = path.join(candDir, 'data', 'oob'); let regs = 0;
      for (const f of fs.readdirSync(oobDir)) { try { const j = JSON.parse(fs.readFileSync(path.join(oobDir, f), 'utf8')); regs += (j.regiments || []).filter((r) => !r.alias_for).length; } catch { /* not an order-of-battle file */ } }
      const vig = ['vignettes_part1', 'vignettes_part2', 'vignettes_part3'].reduce((n, f) => n + (readJson(path.join(candDir, 'data', f + '.json')).vignettes || []).length, 0);
      const chr = [1, 2, 3].reduce((n, d) => n + (readJson(path.join(candDir, 'data', `chronology_day${d}.json`)).events || []).length, 0);
      const ter = (readJson(path.join(candDir, 'data', 'terrain.json')).key_locations || []).length;
      const want = [regs, vig, chr, ter].join('/'), got = [m[1], m[2], m[3], m[4]].join('/');
      if (want !== got) bad.push(`displayed counts ${got} != counts recomputed from data ${want}`); else seen.push(`displayed counts ${got} match the data files`);
    }
    // a chronology answer names its source (the published sentence promised a source link under every answer)
    await page.fill('#ask', 'What happened at the Peach Orchard on July 2?'); await page.keyboard.press('Enter'); await b.settle(page, 1500);
    const ans = await page.evaluate(() => document.querySelector('#transcript, .transcript, main') ? document.body.innerText : '');
    seen.push('asked one question: ' + (/Source:|→|&rarr;/.test(ans) ? 'answer carries a source line/link' : 'NO source line in the answer'));
    if (!/Source:|→/.test(ans)) bad.push('an answer carries no source line or link');
    const html = rd(candDir, 'historian.html'); const ext = [...html.matchAll(/fetch\(\s*['"`]https?:/g)];
    if (ext.length) bad.push('the page fetches an external URL: the "runs entirely in your browser" property was lost'); else seen.push('no external fetch: still runs entirely in the browser');
  } finally { await page.close(); }
  return { ok: bad.length === 0, detail: bad.length ? bad.join('; ') : seen.join('; ') };
};
C['viewshed'] = async () => {
  const b = await browser(); const page = await openPage(b.cand.url, [1440, 900]);
  try {
    await page.goto(b.cand.url + '/viewshed', { waitUntil: 'load', timeout: 60000 }); await b.settle(page, 9000);
    const r = await page.evaluate(() => ({ cav: (document.querySelector('.caveat') || {}).innerText || '', rows: document.querySelectorAll('#ranking > div').length }));
    const feats = readJson(path.join(candDir, 'data', 'terrain.json')); const n = (feats.key_locations || []).length;
    const ok = /Elevation only/.test(r.cav) && /30 places/.test(r.cav) && r.rows === 30 && n === 30;
    return { ok, detail: `caveat "${r.cav.slice(0, 60)}...", ranking rows ${r.rows}, terrain features ${n} (the caveat says 30 places)` };
  } finally { await page.close(); }
};
C['dashboard-dom'] = async () => {
  const b = await browser(); const page = await openPage(b.cand.url, [1440, 900]);
  try {
    await page.goto(b.cand.url + '/dashboard', { waitUntil: 'load', timeout: 60000 }); await b.settle(page, 3500);
    const r = await page.evaluate(() => ({ text: document.body.innerText, cards: document.querySelectorAll('.stat-card').length, svgId: !!document.getElementById('strength-chart'), legend: document.querySelectorAll('#legend .legend-item').length, w: document.documentElement.scrollWidth }));
    const bad = [];
    if (/undefined|highest_single_regiment_rate|[^\n]*_[a-z]+_[a-z]+/.test(r.text.replace(/https?:\S+/g, '')) && /undefined|highest_single/.test(r.text)) bad.push('raw key or "undefined" printed');
    if (!/These curves are modeled/.test(r.text)) bad.push('the "modeled, not observed" note is missing');
    if (r.cards < 6) bad.push(`only ${r.cards} stat cards`); if (r.legend < 10) bad.push(`only ${r.legend} legend entries`); if (!r.svgId) bad.push('no #strength-chart');
    return { ok: bad.length === 0, detail: bad.length ? bad.join('; ') : `${r.cards} titled stat cards, ${r.legend} legend entries, no raw key / "undefined", model note present` };
  } finally { await page.close(); }
};
C['ar-hidden'] = async () => {
  const nav = rd(candDir, 'site-nav.js'); const ar = rd(candDir, 'ar.html'); const sm = rd(candDir, 'sitemap.xml'); const bad = [];
  if (/ar\.html|['"]\/ar['"]/.test(nav.replace(/\/\/.*$/gm, '').replace(/ar\.html['"]?\s*\)\s*===/g, '')) && /href:\s*['"]\/ar/.test(nav)) bad.push('site-nav.js still links /ar');
  if (!/<meta name="robots" content="noindex"/.test(ar)) bad.push('ar.html has no noindex'); if (/ar\.html|\/ar</.test(sm)) bad.push('sitemap still lists ar');
  if (!/getUserMedia/.test(ar) || !/geolocation/.test(ar)) bad.push('the AR page lost its camera/location code'); if (!/<b>Beta\.<\/b>/.test(ar)) bad.push('the Beta notice is missing');
  return { ok: bad.length === 0, detail: bad.length ? bad.join('; ') : 'ar.html is still served with its camera/location code, carries the Beta notice and noindex, and is out of the menus and the sitemap' };
};

// ------------------------------------------------------------------ run
const results = []; let failed = 0, skipped = 0, ran = 0;
const wanted = (w) => !only || only.includes(w.id) || (w.defects || []).some((d) => only.includes(d));
const ALL = [...(W.supportingChecks || []), ...W.waivers, ...(W.predictedForFinalBuild || [])];   // supportingChecks: shared layer; predictedForFinalBuild: data waiver that has no defect in the R1c dry run
for (const w of ALL.filter(wanted)) {
  for (const a of w.assertions || []) {
    let r;
    try {
      if (a.type === 'browser') { if (noBrowser) r = { skip: true, detail: 'browser assertion skipped (--no-browser)' }; else r = await C[a.check](a); }
      else if (['lines', 'controls', 'overflow'].includes(a.type) && noBrowser) r = { skip: true, detail: 'skipped (--no-browser)' };
      else if (!T[a.type]) r = { ok: false, detail: `unknown assertion type ${a.type}` };
      else r = await T[a.type](a);
    } catch (e) { r = { ok: false, detail: 'assertion threw: ' + String(e.message).split('\n')[0] }; }
    const status = r.skip ? 'SKIP' : r.ok ? 'PASS' : 'FAIL';
    if (status === 'FAIL') failed++; else if (status === 'SKIP') skipped++; else ran++;
    results.push({ waiver: w.id, defects: w.defects, assertion: a.id, type: a.type + (a.check ? ':' + a.check : ''), status, detail: r.detail, ...(r.review ? { review: r.review } : {}) });
    if (!args.quiet || status === 'FAIL') console.log(`${status}  ${w.id} ${(a.id || '').padEnd(28)} ${r.detail}`);
  }
}
await closeBrowser();
const byWaiver = {}; for (const r of results) { (byWaiver[r.waiver] ||= { pass: 0, fail: 0, skip: 0 })[r.status.toLowerCase()]++; }
const own = (k) => byWaiver[k] && !byWaiver[k].fail && !byWaiver[k].skip;
const depsOk = (k) => ((ALL.find((w) => w.id === k) || {}).dependsOn || []).every((d) => !byWaiver[d] || own(d));
const valid = Object.keys(byWaiver).filter((k) => own(k) && depsOk(k)), invalid = Object.keys(byWaiver).filter((k) => byWaiver[k].fail || !depsOk(k));
console.log(`\n${ran} passed, ${failed} failed, ${skipped} skipped.  Waivers whose assertions all passed (${valid.length}): ${valid.join(' ') || '-'}.  Waivers NOT valid on this candidate (${invalid.length}): ${invalid.join(' ') || '-'}`);
if (args.json) fs.writeFileSync(abs(args.json), JSON.stringify({ candidate: path.relative(REPO, candidateArg), ran, failed, skipped, validWaivers: valid, invalidWaivers: invalid, results }, null, 1));
process.exit(failed ? 1 : skipped ? 3 : 0);

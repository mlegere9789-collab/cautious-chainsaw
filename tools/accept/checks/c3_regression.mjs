// Check 3: regression against the CURRENT PUBLISHED build (--baseline, baseline/dist = production deploy 6abd6d62).
// A: file list and data files (parsed and compared structurally), B: routes (both spellings answer 200), C: per-route screenshots (pixelmatch-style diff,
// regions reported) + visible text + control inventory for every route at desktop and phone.  Anything missing or worse is a defect unless an owner-approved
// entry in tools/accept/regression_waivers.json explains it (then it is a note with the reason).
import fs from 'node:fs';
import path from 'node:path';
import { Check, walk, readJson, ACCEPT, sha256File, round } from '../lib/util.mjs';
import { settle } from '../lib/browser.mjs';
import { diffPngs } from '../lib/imgdiff.mjs';

const globRe = (g) => new RegExp('^' + g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0000/g, '.*') + '$');
const CONFIG_FILES = /^(netlify\.toml|_headers|_redirects|version\.json)$|^_ops\//;
const unhash = (f) => f.replace(/-[A-Za-z0-9_-]{8}(\.(?:m?js|css))$/, '-HASH$1');

function regressions(a, b, p = '', out = [], depth = 0) {
  if (out.length > 40 || depth > 6) return out;
  if (Array.isArray(a)) {
    if (!Array.isArray(b)) { out.push(`${p || '/'}: was an array of ${a.length}, is ${typeof b}`); return out; }
    if (b.length < a.length) out.push(`${p || '/'}: array shrank ${a.length} -> ${b.length}`);
    for (let i = 0; i < Math.min(a.length, b.length, 50); i++) regressions(a[i], b[i], `${p}[${i}]`, out, depth + 1);
  } else if (a && typeof a === 'object') {
    if (!b || typeof b !== 'object') { out.push(`${p || '/'}: was an object, is ${b === null ? 'null' : typeof b}`); return out; }
    for (const k of Object.keys(a)) { if (!(k in b)) out.push(`${p}/${k}: key removed`); else regressions(a[k], b[k], `${p}/${k}`, out, depth + 1); }
  } else if (a !== b && typeof a === typeof b && typeof a === 'number') { /* numeric change: reported as changed, not as regression */ }
  return out;
}

export async function run(ctx) {
  const c = new Check('3', 'Regression against the published build');
  if (!ctx.base) return c.notRun('no --baseline directory given (or it does not exist); the published-build comparison cannot run').finish();
  const lib = ctx.lib;
  const wj = fs.existsSync(path.join(ACCEPT, 'regression_waivers.json')) ? readJson(path.join(ACCEPT, 'regression_waivers.json')) : { waivers: [] };
  const waivers = wj.waivers.map((w) => ({ ...w, re: globRe(w.target) }));
  const waived = (kind, target) => waivers.find((w) => w.kind === kind && w.re.test(target));
  const report = (kind, code, where, detail, target = where) => { const w = waived(kind, target); if (w) c.note(`waived:${code}`, where, `${detail} -- WAIVED: ${w.reason} (${w.approvedBy || 'no approver'}, ${w.date || 'no date'})`); else c.defect(code, where, detail, { waiverKey: { kind, target } }); };
  c.metrics.waiversLoaded = waivers.length;

  // ---------------------------------------------------------------- A. files and data
  const bFiles = walk(ctx.baselineDir).filter((f) => !CONFIG_FILES.test(f)), cFiles = ctx.files.filter((f) => !CONFIG_FILES.test(f));
  const cNorm = new Map(cFiles.map((f) => [unhash(f), f]));
  const missing = [], changed = [], same = [];
  for (const f of bFiles) {
    const norm = unhash(f); const cf = cNorm.get(norm) || (cFiles.includes(f) ? f : null);
    if (!cf) { missing.push(f); report('file', 'file-missing', f, `${f} is on the published build and not in the candidate`); continue; }
    const hb = sha256File(path.join(ctx.baselineDir, f)), hc = sha256File(path.join(ctx.dist, cf));
    (hb === hc ? same : changed).push(f);
  }
  const added = cFiles.filter((f) => !bFiles.includes(f) && ![...bFiles].some((b) => unhash(b) === unhash(f)));
  c.metrics.files = { baseline: bFiles.length, candidate: cFiles.length, identical: same.length, changed: changed.length, missing: missing.length, added: added.length };
  c.note('files-added', '-', added.join(', ') || 'none');
  c.raw.filesChanged = changed;
  let dataChanged = 0, dataRegressed = 0;
  for (const f of changed.filter((x) => /\.(json|geojson)$/.test(x))) {
    try {
      const a = JSON.parse(fs.readFileSync(path.join(ctx.baselineDir, f), 'utf8')); const b = JSON.parse(fs.readFileSync(path.join(ctx.dist, f), 'utf8'));
      dataChanged++; const reg = regressions(a, b);
      if (reg.length) { dataRegressed++; report('data', 'data-regressed', f, `${reg.length} regression(s): ${reg.slice(0, 5).join('; ')}`); }
      else c.note('data-changed-not-worse', f, 'content differs, nothing removed or shrunk');
    } catch (e) { report('data', 'data-unreadable', f, e.message); }
  }
  c.metrics.data = { changed: dataChanged, regressed: dataRegressed };

  // ---------------------------------------------------------------- B. routes
  const baseRoutes = walk(ctx.baselineDir).filter((f) => f.endsWith('.html') && !f.includes('/') && !/^google/.test(f)).map((f) => f.replace(/\.html$/, ''));
  const candRoutes = new Set(ctx.routes.map((r) => r.path));
  const routeStatus = [];
  for (const name of baseRoutes) {
    const p = name === 'index' ? '/' : '/' + name;
    if (!candRoutes.has(p)) { report('route', 'route-missing', p, `route ${p} exists on the published build and not in the candidate`); continue; }
    for (const spelling of name === 'index' ? ['/', '/index.html'] : [p, p + '.html']) {
      const [rb, rc] = await Promise.all([fetch(ctx.base.url + spelling), fetch(ctx.cand.url + spelling)]);
      routeStatus.push([spelling, rb.status, rc.status]);
      if (rb.status === 200 && rc.status !== 200) report('route', 'route-status-worse', spelling, `published: 200, candidate: ${rc.status}`, p);
    }
  }
  c.metrics.routeStatusChecked = routeStatus.length;
  const bothRoutes = ctx.routes.filter((r) => r.path !== '/404' && baseRoutes.includes(r.path === '/' ? 'index' : r.path.slice(1)));
  c.metrics.routesCompared = bothRoutes.length;

  // ---------------------------------------------------------------- C. screenshots, text, controls
  const T = ctx.thresholds.regression;
  const outDir = path.join(ctx.artDir, 'regression'); fs.mkdirSync(outDir, { recursive: true });
  const capture = async (session, origin, r, vp, mode) => {
    const page = await session.newPage();
    try {
      await lib.emulateViewport(page, { width: vp[0], height: vp[1], dpr: 1, mobile: vp[0] < 500 });
      await page.goto(origin + r.url, { waitUntil: 'load', timeout: 45000 });
      if (r.app) {
        await lib.waitForApp(page, 45000);
        if (mode === 'inject' && origin === ctx.base.url) {
          // the PUBLISHED app shows its 'Choose Your Experience' screen only after a ~3.5 s intro: wait for it and click through, so the baseline is the app and not the chooser (triage 7.1)
          const ch = page.getByText('Choose Your Experience');
          await ch.first().waitFor({ state: 'visible', timeout: 25000 });
          await page.getByText(vp[0] < 500 ? 'Select Mobile' : 'Select Desktop').first().click();
          await ch.first().waitFor({ state: 'detached', timeout: 10000 });
        } else await lib.chooseLayout(page, vp[0] < 500 ? 'mobile' : 'desktop');
        await settle(page, 6000);
      }
      else await settle(page, mode === 'inject' ? 5000 : 1500);
      await page.addStyleTag({ content: '.mapboxgl-canvas{visibility:hidden!important}.mapboxgl-ctrl-logo,.mapboxgl-ctrl-attrib{visibility:hidden!important}*{caret-color:transparent!important}' });
      const png = await page.screenshot({ fullPage: !r.app, animations: 'disabled', caret: 'hide', timeout: 30000 });
      const info = await page.evaluate(() => {
        const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
        const names = (el) => { const l = []; const add = (v) => { v = (v || '').replace(/\s+/g, ' ').trim().slice(0, 80); if (v && !l.includes(v)) l.push(v); };
          add(el.getAttribute('aria-label')); add(el.innerText); add(el.getAttribute('title')); add(el.getAttribute('alt')); add(el.getAttribute('placeholder')); add(el.value);
          const im = el.querySelector && el.querySelector('img[alt]'); if (im) add(im.alt);
          const lb = el.getAttribute('aria-labelledby'); if (lb) add(lb.split(/\s+/).map((i) => (document.getElementById(i) || {}).innerText).join(' '));
          if (el.labels && el.labels.length) add([...el.labels].map((x) => x.innerText).join(' ')); return l; };
        const controls = [...document.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=link],[role=tab],[role=menuitem],[role=checkbox],[role=switch],[role=slider]')].filter(vis)
          .map((el) => { const n = names(el); return { tag: el.tagName.toLowerCase(), role: el.getAttribute('role') || '', primary: n[0] || '', names: n }; });
        const lines = document.body.innerText.split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter((l) => l.length > 1);
        return { title: document.title, desc: (document.querySelector('meta[name=description]') || {}).content || '', lines, controls, imgs: document.images.length, h1: [...document.querySelectorAll('h1')].map((h) => h.innerText.trim()) };
      });
      return { png, info };
    } finally { await page.close(); }
  };
  const runSet = async (set, mode, vpsFor) => {
    if (!set.length) return;
    const session = await ctx.sessions.create({ profile: `reg-${mode}`, tiles: mode, onboarded: true });
    const diffPage = await session.newPage();
    c.metrics.chrome = session.chromeVersion;
    try {
      for (const r of set) {
        for (const vp of vpsFor(r)) {
          const tag = `${r.path === '/' ? 'index' : r.path.slice(1)}@${vp[0]}`;
          if (mode === 'inject' && lib.tileBudget.used > lib.tileBudget.cap - 80) { c.defect('regression-not-run-budget', r.path, `tile budget spent (${lib.tileBudget.used}/${lib.tileBudget.cap}); ${tag} was NOT compared; raise --tile-cap`); continue; }
          let b, k;
          try { b = await capture(session, ctx.base.url, r, vp, mode); } catch (e) { c.defect('baseline-capture-failed', tag, e.message); continue; }
          try { k = await capture(session, ctx.cand.url, r, vp, mode); } catch (e) { c.defect('candidate-capture-failed', tag, e.message); continue; }
          // text
          const kLines = new Set(k.info.lines), bLines = new Set(b.info.lines);
          const lost = b.info.lines.filter((l) => !kLines.has(l)), gained = k.info.lines.filter((l) => !bLines.has(l));
          if (lost.length) report('text', 'text-missing', tag, `${lost.length} visible text line(s) of the published build are not in the candidate: ${lost.slice(0, 6).map((l) => JSON.stringify(l.slice(0, 80))).join(', ')}`, r.path);
          if (gained.length) c.note('text-added', tag, `${gained.length} new line(s): ${gained.slice(0, 4).map((l) => JSON.stringify(l.slice(0, 60))).join(', ')}`);
          if (b.info.title !== k.info.title) c.note('title-changed', tag, `"${b.info.title}" -> "${k.info.title}"`);
          if (b.info.desc && b.info.desc !== k.info.desc) c.note('description-changed', tag, `"${b.info.desc.slice(0, 80)}" -> "${k.info.desc.slice(0, 80)}"`);
          // controls: every control of the published build must have a counterpart (same tag, and its name among the counterpart's names: aria-label, text, title, placeholder, value, label)
          const pool = k.info.controls.map((x) => ({ ...x, used: false })); const lostC = [];
          for (const x of b.info.controls) {
            const hit = pool.find((y) => !y.used && y.tag === x.tag && (y.names.includes(x.primary) || (!x.primary && !y.primary)));
            if (hit) hit.used = true; else lostC.push(`${x.tag}|${x.role}|${x.primary}`);
          }
          if (lostC.length) report('controls', 'control-missing', tag, `${lostC.length} control(s) of the published build have no counterpart in the candidate: ${lostC.slice(0, 6).map((l) => JSON.stringify(l)).join(', ')}`, r.path);
          // pixels
          const d = await diffPngs(diffPage, b.png, k.png, { threshold: T.pixelColorThreshold, grid: T.regionGrid, makeDiff: true });
          const sizeDiffers = d.widthA !== d.widthB || d.heightA !== d.heightB;
          const row = { tag, base: [d.widthA, d.heightA], cand: [d.widthB, d.heightB], diffPixels: d.diffPixels, diffRatio: round(d.diffRatio, 5), bbox: d.bbox, regions: d.regions.slice(0, 3).map((x) => x.box) };
          (c.raw.screens ||= []).push(row);
          const bad = d.diffRatio > T.maxDiffRatio || sizeDiffers;
          if (bad) {
            const base = path.join(outDir, tag.replace(/[^\w@.-]/g, '_'));
            fs.writeFileSync(base + '.baseline.png', b.png); fs.writeFileSync(base + '.candidate.png', k.png); if (d.diffPng) fs.writeFileSync(base + '.diff.png', Buffer.from(d.diffPng, 'base64'));
            report('screenshot', 'screenshot-differs', tag, `${(d.diffRatio * 100).toFixed(3)}% of pixels differ (limit ${(T.maxDiffRatio * 100).toFixed(2)}%)${sizeDiffers ? `; page size ${d.widthA}x${d.heightA} -> ${d.widthB}x${d.heightB}` : ''}; bbox ${JSON.stringify(d.bbox)}; worst regions ${JSON.stringify(d.regions.slice(0, 3).map((x) => x.box))}; images: ${path.relative(ctx.repoRoot, base)}.{baseline,candidate,diff}.png`, r.path);
          }
        }
      }
    } finally { await session.close(); }
  };
  const vpsFor = (r) => (r.hasMapbox && !r.app ? [T.viewports[0]] : T.viewports);
  await runSet(bothRoutes.filter((r) => !r.hasMapbox && !r.app), 'block', vpsFor);
  await runSet(bothRoutes.filter((r) => r.hasMapbox || r.app), 'inject', vpsFor);
  c.note('screenshot-method', '-', `viewport ${T.viewports.map((v) => v.join('x')).join(', ')} (map pages: first only); Mapbox canvases are hidden before the shot (tile paint time is not deterministic), animations disabled; pixel threshold ${T.pixelColorThreshold}, max differing ratio ${T.maxDiffRatio}`);
  return c.finish();
}

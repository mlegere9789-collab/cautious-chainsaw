// Check 7: visual QA of every route at 360, 390, 768, 1024, 1440 and 1920 px: screenshots, horizontal overflow, clipped text, overlapping and covered
// elements, contrast (axe color-contrast), tap targets, missing alt text, layout shift, tiny text, placeholder text, default-browser styling leaks.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { Check, REPO, round } from '../lib/util.mjs';
import { settle, watchPage, watchDefects } from '../lib/browser.mjs';

const require = createRequire(import.meta.url);
const AXE = path.join(REPO, 'node_modules', 'axe-core', 'axe.min.js');
const AXE_RULES = ['color-contrast', 'image-alt', 'role-img-alt', 'svg-img-alt', 'input-image-alt', 'area-alt', 'object-alt', 'button-name', 'link-name', 'label', 'document-title', 'html-has-lang', 'meta-viewport', 'aria-allowed-attr', 'aria-valid-attr-value', 'aria-required-attr', 'duplicate-id-aria', 'frame-title', 'tabindex'];

/** runs inside the page: returns every measured problem (plain data) */
const ANALYSE = `(opts) => {
  const out = { overflow: [], clipped: [], truncated: [], overlaps: [], covered: [], smallTargets: [], alt: [], smallText: [], placeholders: [], defaultStyle: [], brokenImages: [], misc: [] };
  const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
  const sel = (el) => { let s = el.tagName.toLowerCase(); if (el.id) s += '#' + el.id; else if (el.className && typeof el.className === 'string') s += '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.'); return s; };
  const txt = (el) => (el.innerText || el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 70);
  const visible = (el) => { const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false; const r = el.getBoundingClientRect(); if (r.width <= 0 || r.height <= 0) return false; let p = el; while (p && p !== document.body) { const c = getComputedStyle(p); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity === 0 || p.hasAttribute('hidden') || p.getAttribute('aria-hidden') === 'true' && false) return false; p = p.parentElement; } return true; };
  const srOnly = (el) => { for (let p = el; p && p !== document.body; p = p.parentElement) if (/(^|[\\s_-])(sr-only|visually-hidden|screen-reader|gt-sr-only|sr_only)([\\s_-]|$)/i.test(typeof p.className === 'string' ? p.className : '')) return true; const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); if (r.bottom <= 0 || r.right <= 0) return true; return (r.width <= 2 && r.height <= 2) || (cs.position === 'absolute' && (r.right < 0 || r.bottom < 0 || r.left > vw + 200)) || cs.clip === 'rect(0px, 0px, 0px, 0px)' || /inset\\(50%\\)/.test(cs.clipPath || ''); };
  const all = [...document.body.querySelectorAll('*')].filter((el) => !['SCRIPT', 'STYLE', 'NOSCRIPT', 'LINK', 'META', 'TEMPLATE', 'BR', 'PATH', 'DEFS', 'G', 'CIRCLE', 'RECT', 'LINE', 'POLYGON', 'POLYLINE', 'USE', 'SYMBOL', 'CLIPPATH', 'STOP', 'LINEARGRADIENT'].includes(el.tagName.toUpperCase()));
  const inClosedDetails = (el) => { const d = el.closest('details:not([open])'); if (!d) return false; const sum = el.closest('summary'); return !(sum && sum.parentElement === d); };
  const vis = all.filter((el) => visible(el) && !inClosedDetails(el));

  // 1 horizontal overflow
  const de = document.documentElement;
  if (de.scrollWidth > de.clientWidth + opts.overflowTol || document.body.scrollWidth > de.clientWidth + opts.overflowTol) {
    const off = [];
    for (const el of vis) { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); if (cs.position === 'fixed' || srOnly(el)) continue; if (r.right > de.clientWidth + opts.overflowTol + 1 && r.width > 0) off.push({ el: sel(el), right: Math.round(r.right), text: txt(el).slice(0, 40) }); }
    out.overflow.push({ scrollWidth: de.scrollWidth, clientWidth: de.clientWidth, bodyScrollWidth: document.body.scrollWidth, offenders: off.slice(0, 6), offenderCount: off.length });
  }

  // 2 clipped text (text rect outside a clipping ancestor) and ellipsised text
  const textEls = vis.filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0) && !inClosedDetails(el));
  for (const el of textEls) {
    if (srOnly(el)) continue;
    const range = document.createRange(); range.selectNodeContents(el); const tr = range.getBoundingClientRect(); if (tr.width < 1 || tr.height < 1) continue;
    const cs = getComputedStyle(el);
    if ((cs.overflow === 'hidden' || cs.overflowX === 'hidden') && cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) { out.truncated.push({ el: sel(el), text: txt(el), full: el.scrollWidth, shown: el.clientWidth }); continue; }
    if (cs.webkitLineClamp && cs.webkitLineClamp !== 'none' && el.scrollHeight > el.clientHeight + 1) { out.truncated.push({ el: sel(el), text: txt(el), clampedLines: cs.webkitLineClamp }); continue; }
    let p = el;
    while (p && p !== document.documentElement) {
      const pc = getComputedStyle(p);
      const clipX = pc.overflowX === 'hidden' || pc.overflowX === 'clip', clipY = pc.overflowY === 'hidden' || pc.overflowY === 'clip';
      if (clipX || clipY) {
        const pr = p.getBoundingClientRect();
        const cutX = clipX && (tr.right > pr.right + 1.5 || tr.left < pr.left - 1.5), cutY = clipY && (tr.bottom > pr.bottom + 1.5 || tr.top < pr.top - 1.5);
        // a hidden panel that is animated off-screen on purpose is excluded by the visibility test above; text whose box starts inside the clip and ends outside is cut
        if ((cutX || cutY) && pr.width > 0 && pr.height > 0 && p.getAttribute('aria-hidden') !== 'true') { out.clipped.push({ el: sel(el), clippedBy: sel(p), text: txt(el), text_rect: [Math.round(tr.left), Math.round(tr.top), Math.round(tr.right), Math.round(tr.bottom)], clip_rect: [Math.round(pr.left), Math.round(pr.top), Math.round(pr.right), Math.round(pr.bottom)] }); break; }
      }
      p = p.parentElement;
    }
  }

  // 3 interactive elements: tap targets, covered controls, overlaps
  const interactive = vis.filter((el) => el.matches('a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=link],[role=tab],[role=menuitem],[role=checkbox],[role=switch],[role=slider],[role=option],[tabindex]:not([tabindex="-1"])') && !el.disabled && el.getAttribute('aria-disabled') !== 'true' && !srOnly(el));
  const inlineInText = (el) => { if (el.tagName !== 'A') return false; const cs = getComputedStyle(el); if (cs.display !== 'inline') return false; const par = el.parentElement; if (!par) return false; const own = [...par.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim().length > 3); return own.length > 0; };
  for (const el of interactive) {
    const r = el.getBoundingClientRect();
    if (r.right < 0 || r.bottom < 0 || r.left > vw || r.top > vh * 6) continue;
    const min = opts.width <= opts.tapAppliesUpTo ? opts.tapMin : opts.pointerMin;
    if (el.closest('.mapboxgl-ctrl-attrib,.mapboxgl-ctrl-logo')) { if (r.width < min - 0.5 || r.height < min - 0.5) (out.thirdParty = out.thirdParty || []).push({ el: sel(el), w: Math.round(r.width), h: Math.round(r.height) }); }
    else if (!inlineInText(el) && (r.width < min - 0.5 || r.height < min - 0.5)) {
      // a label-wrapped checkbox/radio hit area counts as the label
      const lab = el.labels && el.labels[0] && el.labels[0].getBoundingClientRect(); const eff = lab ? { w: Math.max(r.width, lab.width), h: Math.max(r.height, lab.height) } : { w: r.width, h: r.height };
      if (eff.w < min - 0.5 || eff.h < min - 0.5) out.smallTargets.push({ el: sel(el), text: txt(el) || el.getAttribute('aria-label') || '', w: Math.round(r.width), h: Math.round(r.height), min });
    }
    // covered: the topmost element at the centre (inside the viewport) is neither the control nor related to it
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (!opts.modal && cx >= 0 && cy >= 0 && cx <= vw && cy <= vh) {
      const top = document.elementFromPoint(cx, cy);
      if (top && top !== el && !el.contains(top) && !top.contains(el) && !(el.labels && [...el.labels].some((l) => l.contains(top)))) {
        const tcs = getComputedStyle(top);
        if (tcs.pointerEvents !== 'none') out.covered.push({ el: sel(el), text: txt(el).slice(0, 30), coveredBy: sel(top), coverText: txt(top).slice(0, 30) });
      }
    }
  }
  // a full-viewport fixed overlay that carries its own button (sound gate, onboarding, consent) is a modal by design: controls behind it are not covered, they are not available yet
  const overlay = vis.find((e) => { const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); return (cs.position === 'fixed' || (cs.position === 'absolute' && parseInt(cs.zIndex, 10) > 0)) && r.width * r.height >= vw * vh * 0.5 && e.querySelector('button,a[href],input') && e.tagName !== 'CANVAS' && !e.matches('.mapboxgl-map,.mapboxgl-canvas-container'); });
  if (overlay) { out.covered.length = 0; out.misc.push('full-viewport overlay ' + sel(overlay) + ': covered/overlap checks skipped'); }
  const items = interactive.map((el) => ({ el, r: el.getBoundingClientRect(), k: 'ui' }));
  for (const el of textEls) { if (srOnly(el) || el.closest('.mapboxgl-map,.mapboxgl-ctrl') ) continue; if (interactive.some((i) => i === el || i.contains(el))) continue; const range = document.createRange(); range.selectNodeContents(el); items.push({ el, r: range.getBoundingClientRect(), k: 'text' }); }
  let pairs = 0; if (opts.modal || overlay) pairs = 99;
  for (let i = 0; i < items.length && pairs < 12; i++) for (let j = i + 1; j < items.length && pairs < 12; j++) {
    const a = items[i], b = items[j]; if (a.k === 'text' && b.k === 'text') continue;
    if (a.el.tagName === 'CANVAS' || b.el.tagName === 'CANVAS' || a.el.closest('.mapboxgl-canvas-container') && a.el.tagName === 'CANVAS') continue;
    if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
    const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left), h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
    if (w <= 2 || h <= 2) continue;
    const area = w * h, small = Math.min(a.r.width * a.r.height, b.r.width * b.r.height);
    if (area < 25 || area < small * 0.2) continue;
    // elements stacked on purpose (dialog over page) are not collisions: ignore when one is in a dialog and the other is not
    const dlg = (e) => !!e.closest('[role=dialog],[aria-modal=true],dialog');
    if (dlg(a.el) !== dlg(b.el)) continue;
    out.overlaps.push({ a: sel(a.el) + ' "' + txt(a.el).slice(0, 25) + '"', b: sel(b.el) + ' "' + txt(b.el).slice(0, 25) + '"', overlapPx: [Math.round(w), Math.round(h)] }); pairs++;
  }

  // 4 alt text
  for (const img of document.images) {
    const r = img.getBoundingClientRect(); const hidden = !visible(img);
    if (!img.hasAttribute('alt')) out.alt.push({ el: sel(img), src: (img.getAttribute('src') || '').slice(-60), problem: 'img without alt attribute' });
    else if (!hidden && (/\\.(png|jpe?g|gif|svg|webp)$/i.test(img.alt.trim()) || /^(image|photo|picture|img|graphic)$/i.test(img.alt.trim()))) out.alt.push({ el: sel(img), src: (img.getAttribute('src') || '').slice(-60), problem: 'alt text is a file name or generic word: ' + img.alt });
    if (!hidden && img.complete && img.naturalWidth === 0) out.brokenImages.push({ src: img.currentSrc || img.src });
  }
  for (const el of document.querySelectorAll('[role=img]')) if (visible(el) && !(el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.getAttribute('title') || el.querySelector('title'))) out.alt.push({ el: sel(el), problem: 'role=img without an accessible name' });
  for (const el of document.querySelectorAll('svg')) if (visible(el) && el.getAttribute('aria-hidden') !== 'true' && !el.getAttribute('role') && !el.closest('button,a,[role=button]') && el.getBoundingClientRect().width > 24 && !(el.querySelector('title') || el.getAttribute('aria-label'))) out.alt.push({ el: sel(el), problem: 'inline svg that is not hidden from assistive tech and has no name or role' });
  for (const el of document.querySelectorAll('input[type=image],area')) if (!el.getAttribute('alt')) out.alt.push({ el: sel(el), problem: el.tagName + ' without alt' });

  // 5 text size, placeholder text, default styling
  for (const el of textEls) {
    if (srOnly(el)) continue; const cs = getComputedStyle(el); const fs = parseFloat(cs.fontSize);
    if (fs < opts.minText - 0.01) out.smallText.push({ el: sel(el), text: txt(el).slice(0, 40), px: fs });
  }
  const body = document.body.innerText;
  for (const re of [/lorem ipsum/i, /\\bTODO\\b|\\bFIXME\\b|\\bXXX\\b/, /\\bundefined\\b/, /\\bNaN\\b/, /\\[object Object\\]/, /\\{\\{[^}]*\\}\\}/, /OWNER TO CONFIRM/i, /\\bnull\\b(?!\\s+(?:and|or|hypothesis))/i, /placeholder text|coming soon|tbd\\b|work in progress/i]) { const m = re.exec(body); if (m) out.placeholders.push({ match: m[0], context: body.slice(Math.max(0, m.index - 40), m.index + 60).replace(/\\s+/g, ' ') }); }
  { let total = 0, times = 0; for (const el of textEls) { if (srOnly(el)) continue; const n = [...el.childNodes].filter((x) => x.nodeType === 3).map((x) => x.textContent.trim().length).reduce((a, b) => a + b, 0); total += n; if (/^"?times( new roman)?"?(,|$)/i.test(getComputedStyle(el).fontFamily)) times += n; }
    if (total && times / total > 0.5) out.defaultStyle.push({ el: 'text', problem: Math.round(100 * times / total) + '% of the visible text is set in the browser default serif (Times New Roman): no font-family reached it' }); }
  for (const el of vis.filter((e) => e.matches('button,input[type=button],input[type=submit],select,input[type=text],input[type=search],textarea'))) {
    const cs = getComputedStyle(el);
    if (el.matches('button,input[type=button],input[type=submit]') && cs.backgroundColor === 'rgb(239, 239, 239)' && /outset|solid/.test(cs.borderTopStyle) && cs.borderTopWidth === '2px' && cs.borderTopColor === 'rgb(118, 118, 118)') out.defaultStyle.push({ el: sel(el), problem: 'unstyled browser button (buttonface, 2px outset)' });
    if (el.matches('input[type=text],input[type=search],textarea') && cs.borderTopStyle === 'inset' ) out.defaultStyle.push({ el: sel(el), problem: 'unstyled browser text field (inset border)' });
    if (el.matches('select') && cs.appearance === 'auto' && cs.backgroundColor === 'rgb(255, 255, 255)' && cs.borderTopColor === 'rgb(118, 118, 118)') out.defaultStyle.push({ el: sel(el), problem: 'unstyled browser select' });
  }
  out.counts = { elements: vis.length, interactive: interactive.length, textEls: textEls.length, images: document.images.length };
  return out;
}`;

export async function run(ctx) {
  const c = new Check('7', 'Visual QA at six widths');
  const V = ctx.thresholds.visual; const lib = ctx.lib;
  const shotDir = path.join(ctx.artDir, 'visual'); fs.mkdirSync(shotDir, { recursive: true });
  const jobs = [];
  for (const r of ctx.routes) for (const w of V.widths) jobs.push({ r, w, firstVisit: false });
  const app = ctx.routes.find((r) => r.app);
  if (app) for (const w of [V.widths[0], V.widths[4]]) jobs.push({ r: { ...app, path: '/ (first visit, onboarding modal)' }, w, firstVisit: true });
  const rows = [];
  let tilesSkipped = 0;
  const sessionBlock = await ctx.sessions.create({ profile: 'vis-block', tiles: 'block', onboarded: true });
  const sessionMap = await ctx.sessions.create({ profile: 'vis-map', tiles: 'inject', onboarded: true });
  const sessionFirst = await ctx.sessions.create({ profile: 'vis-first', tiles: 'inject', onboarded: false });
  c.metrics.chrome = sessionBlock.chromeVersion;
  try {
    for (const job of jobs) {
      const { r, w } = job; const h = V.heights[String(w)] || 900;
      const needMap = r.hasMapbox || r.app;
      const session = job.firstVisit ? sessionFirst : needMap ? sessionMap : sessionBlock;
      const mode = needMap ? 'inject' : 'block';
      if (needMap && lib.tileBudget.used > lib.tileBudget.cap - 60) { tilesSkipped++; c.defect('visual-not-run-budget', `${r.path} @${w}`, `tile budget spent (${lib.tileBudget.used}/${lib.tileBudget.cap}); this width was NOT checked; raise --tile-cap`); continue; }
      const page = await session.newPage();
      const watch = watchPage(page, lib, { expectStatus: r.expectStatus ? { [r.url]: r.expectStatus } : {}, getTileMode: () => mode, capped: () => session.tileStats.capBlocked > 0 });
      const where = `${r.path} @${w}px`;
      try {
        await page.addInitScript(() => { window.__accCls = []; try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__accCls.push({ v: e.value, t: Math.round(e.startTime), src: (e.sources || []).slice(0, 2).map((s) => (s.node && s.node.nodeName) || '?') }); }).observe({ type: 'layout-shift', buffered: true }); } catch (e) { /* unsupported */ } });
        await lib.emulateViewport(page, { width: w, height: h, dpr: 1, mobile: w <= V.tapTargetAppliesUpToWidth });
        await page.goto(ctx.cand.url + r.url, { waitUntil: 'load', timeout: 45000 });
        if (r.app) await lib.waitForApp(page, 45000).catch((e) => c.defect('app-did-not-mount', where, e.message));
        await settle(page, r.app || needMap ? 4000 : 1500);
        const analysis = await page.evaluate(`(${ANALYSE})(${JSON.stringify({ modal: !!job.firstVisit, width: w, tapMin: V.tapTargetMinPx, tapAppliesUpTo: V.tapTargetAppliesUpToWidth, pointerMin: V.pointerTargetMinPx, minText: V.minTextPx, overflowTol: V.horizontalOverflowTolerancePx })})`);
        const cls = await page.evaluate(() => (window.__accCls || []));
        const clsSum = cls.reduce((a, b) => a + b.v, 0);
        await page.addScriptTag({ path: AXE });
        const axe = await page.evaluate(async (rules) => { const res = await axe.run(document, { runOnly: { type: 'rule', values: rules }, resultTypes: ['violations', 'incomplete'] }); return { violations: res.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 5).map((n) => ({ target: n.target.join(' '), summary: (n.failureSummary || '').split('\n').slice(1, 3).join(' ').slice(0, 220) })), count: v.nodes.length })), incomplete: res.incomplete.map((v) => ({ id: v.id, count: v.nodes.length })) }; }, AXE_RULES);
        const shot = path.join(shotDir, `${(r.path === '/' ? 'index' : r.path.replace(/[^\w-]+/g, '_').replace(/^_/, ''))}-${w}${job.firstVisit ? '-first' : ''}.jpg`);
        await page.screenshot({ path: shot, type: 'jpeg', quality: 55, fullPage: !r.app, timeout: 30000 }).catch((e) => c.note('screenshot-failed', where, e.message));

        // ---- defects
        for (const o of analysis.overflow) c.defect('horizontal-overflow', where, `page scrolls horizontally (scrollWidth ${o.scrollWidth} > ${o.clientWidth}); ${o.offenderCount} element(s) stick out, e.g. ${o.offenders.map((x) => `${x.el} right=${x.right} "${x.text}"`).join('; ')}`);
        for (const x of analysis.clipped.slice(0, 8)) c.defect('clipped-text', where, `${x.el} "${x.text}" is cut by ${x.clippedBy} (text ${JSON.stringify(x.text_rect)} vs clip ${JSON.stringify(x.clip_rect)})`);
        if (analysis.clipped.length > 8) c.defect('clipped-text', where, `... and ${analysis.clipped.length - 8} more clipped text element(s)`);
        if (analysis.thirdParty && analysis.thirdParty.length) c.note('third-party-small-target', where, `${analysis.thirdParty.length} Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): ${analysis.thirdParty.slice(0, 3).map((x) => `${x.el} ${x.w}x${x.h}`).join(', ')}`);
        for (const x of analysis.truncated.slice(0, 6)) c.note('text-truncated', where, `${x.el} "${x.text}" ellipsised/line-clamped`);
        for (const x of analysis.overlaps) c.defect('overlapping-elements', where, `${x.a} overlaps ${x.b} by ${x.overlapPx.join('x')} px`);
        for (const x of analysis.covered.slice(0, 8)) c.defect('control-covered', where, `${x.el} "${x.text}" is covered at its centre by ${x.coveredBy} "${x.coverText}"`);
        for (const x of analysis.smallTargets.slice(0, 12)) c.defect('small-tap-target', where, `${x.el} "${String(x.text).slice(0, 30)}" is ${x.w}x${x.h}px (minimum ${x.min})`);
        if (analysis.smallTargets.length > 12) c.defect('small-tap-target', where, `... and ${analysis.smallTargets.length - 12} more targets under ${analysis.smallTargets[0].min} px`);
        for (const x of analysis.alt) c.defect('missing-or-poor-alt-text', where, `${x.el} ${x.src || ''}: ${x.problem}`);
        for (const x of analysis.brokenImages) c.defect('broken-image', where, x.src);
        for (const x of analysis.smallText.slice(0, 6)) c.defect('text-too-small', where, `${x.el} "${x.text}" is ${x.px}px (minimum ${V.minTextPx})`);
        for (const x of analysis.placeholders) c.defect('placeholder-text-visible', where, `${JSON.stringify(x.match)} in "${x.context}"`);
        for (const x of analysis.defaultStyle) c.defect('default-browser-style', where, `${x.el}: ${x.problem}`);
        if (clsSum > V.layoutShiftMax) c.defect('layout-shift', where, `CLS ${round(clsSum, 4)} > ${V.layoutShiftMax} (${cls.slice(0, 4).map((e) => `${e.v.toFixed(3)}@${e.t}ms ${e.src.join('/')}`).join(', ')})`);
        else if (clsSum > 0) c.note('layout-shift-below-limit', where, `CLS ${round(clsSum, 4)}`);
        for (const v of axe.violations) c.defect(`axe:${v.id}`, where, `${v.impact || ''} ${v.help} (${v.count} node${v.count > 1 ? 's' : ''}): ${v.nodes.slice(0, 3).map((n) => `${n.target} -- ${n.summary}`).join(' | ')}`);
        for (const v of axe.incomplete.filter((x) => x.id === 'color-contrast')) c.note('axe-contrast-incomplete', where, `${v.count} node(s) axe could not decide (background image/gradient/overlap)`);
        for (const d of watchDefects(watch)) c.defect(`visual-load-${d.code}`, where, d.detail);
        rows.push({ route: r.path, width: w, firstVisit: job.firstVisit, counts: analysis.counts, cls: round(clsSum, 4), axeViolations: axe.violations.length, overflow: analysis.overflow.length, clipped: analysis.clipped.length, smallTargets: analysis.smallTargets.length, covered: analysis.covered.length, overlaps: analysis.overlaps.length, shot: path.relative(ctx.repoRoot, shot) });
      } catch (e) { c.defect('visual-check-error', where, e.message); }
      await page.close().catch(() => {});
    }
  } finally { await sessionBlock.close(); await sessionMap.close(); await sessionFirst.close(); }
  c.metrics.pagesAnalysed = rows.length; c.metrics.widths = V.widths; c.metrics.tilesSkipped = tilesSkipped;
  c.metrics.thresholdsUsed = { tapTargetMinPx: V.tapTargetMinPx, appliesUpToWidth: V.tapTargetAppliesUpToWidth, pointerTargetMinPx: V.pointerTargetMinPx, minTextPx: V.minTextPx, layoutShiftMax: V.layoutShiftMax };
  c.raw.rows = rows;
  c.note('method', '-', 'Mapbox canvases are not inspected pixel-wise; contrast is axe color-contrast on DOM text only (text drawn on the map canvas is not covered); screenshots (JPEG q55) are in the pass artifacts folder for human review. Widths <= 1024 px are emulated with touch + mobile viewport (the application layout switch is at 834 px with a coarse pointer), which is why the 44 px tap rule applies there.');
  return c.finish();
}

// tools/accept/lib/interact.mjs - input-matrix machinery: accessibility-tree control enumeration (CDP Accessibility.getFullAXTree), real input
// (CDP mouse / touch / keyboard), response-latency and long-task measurement, keyboard Tab walk with focus-visibility test.
import { sleep, round, percentile } from './util.mjs';

/** installed with page.addInitScript BEFORE any page script runs */
export const INIT_SCRIPT = `(() => {
  if (window.__acc) return;
  const s = { ev: [], lt: [], mut: 0, inputTs: [], moveTs: [], mark: 0, firstMut: null, firstPaint: null, frames: [], sampling: false, shifts: [] };
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) s.ev.push({ n: e.name, s: e.startTime, d: e.duration, p: e.processingStart, id: e.interactionId || 0 }); }).observe({ type: 'event', durationThreshold: 16, buffered: true }); } catch (e) {}
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) s.lt.push({ s: e.startTime, d: e.duration }); }).observe({ type: 'longtask', buffered: true }); } catch (e) {}
  // diagnostics only (no rule reads them): the animation frames longer than 50 ms with the scripts that ran in them, printed next to a long-task defect so the cause can be found
  s.loaf = [];
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) s.loaf.push({ s: e.startTime, d: e.duration, b: e.blockingDuration || 0, r: e.renderStart - e.startTime, sc: (e.scripts || []).slice(0, 4).map((x) => (x.invoker + ' ' + Math.round(x.duration) + 'ms ' + String(x.sourceURL || '').split('/').slice(-1)[0].slice(0, 40) + ':' + (x.sourceFunctionName || '') + '@' + x.sourceCharPosition)) }); }).observe({ type: 'long-animation-frame', buffered: true }); } catch (e) {}
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) s.shifts.push({ v: e.value, t: e.startTime }); }).observe({ type: 'layout-shift', buffered: true }); } catch (e) {}
  try {
    new MutationObserver(() => {
      s.mut++;
      if (s.firstMut == null && s.armed && s.inputTs.length) { s.firstMut = performance.now(); requestAnimationFrame(() => requestAnimationFrame(() => { if (s.firstPaint == null) s.firstPaint = performance.now(); })); }
    }).observe(document, { subtree: true, childList: true, attributes: true, characterData: true });
  } catch (e) {}
  // movement events are kept apart from the input events: for a drag or pinch they are what the map reacts to (t = the browser's time stamp of the event, a = when the page's handler received it), see check 4 part C
  for (const t of ['touchmove', 'pointermove', 'mousemove']) addEventListener(t, (e) => { if (s.armed) s.moveTs.push({ t: e.timeStamp, a: performance.now(), type: t }); }, { capture: true, passive: true });
  for (const t of ['pointerdown', 'mousedown', 'touchstart', 'touchend', 'pointerup', 'mouseup', 'keydown', 'keyup', 'wheel', 'click', 'input', 'change']) addEventListener(t, (e) => { if (s.armed) s.inputTs.push({ t: e.timeStamp, type: t }); }, true);
  s.reset = () => { s.ev.length = 0; s.lt.length = 0; s.inputTs.length = 0; s.moveTs.length = 0; s.mut = 0; s.firstMut = null; s.firstPaint = null; s.mark = performance.now(); s.armed = true; };
  s.startFrames = () => { s.frames = []; s.sampling = true; let last = performance.now(); const tick = (t) => { if (!s.sampling) return; s.frames.push(t - last); last = t; requestAnimationFrame(tick); }; requestAnimationFrame((t) => { last = t; requestAnimationFrame(tick); }); };
  s.stopFrames = () => { s.sampling = false; return s.frames; };
  window.__acc = s;
})();`;

const INTERACTIVE_ROLES = new Set(['button', 'link', 'textbox', 'searchbox', 'combobox', 'checkbox', 'radio', 'switch', 'slider', 'spinbutton', 'tab', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'option', 'treeitem', 'DisclosureTriangle', 'PopUpButton', 'ComboBoxSelect', 'ComboBoxGrouping', 'ListBoxOption', 'TextField', 'SearchBox', 'ToggleButton', 'SpinButton']);
const NEEDS_NAME = new Set(['button', 'link', 'textbox', 'searchbox', 'combobox', 'checkbox', 'radio', 'switch', 'slider', 'spinbutton', 'tab', 'menuitem', 'ToggleButton', 'PopUpButton']);

export async function enumerateControls(page, lib) {
  const cdp = await lib.cdpFor(page);
  await cdp.send('DOM.enable').catch(() => {}); await cdp.send('Accessibility.enable').catch(() => {});
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  const out = []; const counts = {};
  for (const n of nodes) {
    const role = n.role && n.role.value; if (!INTERACTIVE_ROLES.has(role) || n.ignored || !n.backendDOMNodeId) continue;
    const props = Object.fromEntries((n.properties || []).map((p) => [p.name, p.value && p.value.value]));
    const name = ((n.name && n.name.value) || '').trim();
    let info = null; let objectId = null;
    try {
      const r = await cdp.send('DOM.resolveNode', { backendNodeId: n.backendDOMNodeId }); objectId = r.object.objectId;
      const res = await cdp.send('Runtime.callFunctionOn', { objectId, returnByValue: true, functionDeclaration: `function () {
        const el = this; const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
        const vis = r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0;
        let inert = false; for (let p = el; p; p = p.parentElement) if (p.inert || p.hasAttribute('inert')) inert = true;
        return { tag: el.tagName.toLowerCase(), id: el.id || '', type: el.getAttribute('type') || '', href: el.getAttribute('href'), target: el.getAttribute('target') || '', download: el.hasAttribute('download'), disabled: !!el.disabled || el.getAttribute('aria-disabled') === 'true', tabindex: el.getAttribute('tabindex'), rect: [r.left, r.top, r.width, r.height], visible: vis, inert, text: (el.innerText || '').trim().slice(0, 60), connected: el.isConnected, inDialog: !!el.closest('[role=dialog],[aria-modal=true],dialog') };
      }` });
      info = res.result.value;
    } catch { /* node vanished */ }
    finally { if (objectId) cdp.send('Runtime.releaseObject', { objectId }).catch(() => {}); }
    if (!info) continue;
    const key0 = `${role}|${name}`; counts[key0] = (counts[key0] || 0) + 1;
    out.push({ role, name, key: `${key0}|${counts[key0]}`, backendNodeId: n.backendDOMNodeId, focusable: !!props.focusable, ...info, nameMissing: NEEDS_NAME.has(role) && !name });
  }
  return out;
}

/** re-find a control by its key after the DOM changed */
export async function refind(page, lib, key) { const all = await enumerateControls(page, lib); return all.find((c) => c.key === key) || null; }

const sigOf = async (page) => { try { const b = await page.screenshot({ type: 'jpeg', quality: 35, timeout: 8000 }); let h = 5381; for (let i = 0; i < b.length; i += 7) h = ((h << 5) + h + b[i]) | 0; return `${b.length}:${h}`; } catch { return null; } };

/** run `action()` while measuring: DOM response, paint latency, Event Timing duration, long tasks, URL/focus/scroll change */
export async function measure(page, action, { window: windowMs = 450, wantPixelFallback = true } = {}) {
  const before = await page.evaluate(() => ({ url: location.href, active: document.activeElement && (document.activeElement.id || document.activeElement.tagName), sx: scrollX, sy: scrollY })).catch(() => ({}));
  const sig0 = wantPixelFallback ? await sigOf(page) : null;
  await page.evaluate(() => window.__acc && window.__acc.reset()).catch(() => {});
  let err = null; const t0 = Date.now();
  try { await action(); } catch (e) { err = e.message; }
  await sleep(windowMs);
  const readAfter = () => page.evaluate(() => {
    const s = window.__acc; if (!s) return null;
    const first = s.inputTs.length ? s.inputTs[0].t : s.mark;
    // the event that ACTIVATED the control: the last input event at or before the first DOM change (a tap's touchend / a Space key's keyup / a click), not the touchstart that began a 50 ms hold
    const before = s.firstMut != null ? s.inputTs.filter((x) => x.t <= s.firstMut + 1) : [];
    const input = before.length ? before[before.length - 1].t : first;
    const long = s.lt.filter((l) => l.s >= first - 5 && l.s <= first + 1000);
    const evs = s.ev.filter((e) => e.s >= first - 5);
    return { url: location.href, active: document.activeElement && (document.activeElement.id || document.activeElement.tagName), sx: scrollX, sy: scrollY, mut: s.mut, clicks: s.inputTs.filter((x) => x.type === 'click').length, nav: (() => { const n = performance.getEntriesByType('navigation')[0]; const f = performance.getEntriesByType('paint').find((p) => p.name === 'first-contentful-paint'); return { fcp: f ? f.startTime : null, dcl: n ? n.domContentLoadedEventEnd : null, load: n ? n.loadEventEnd : null }; })(), domMs: s.firstMut != null ? s.firstMut - input : null, paintMs: s.firstPaint != null ? s.firstPaint - input : null, eventMs: evs.length ? Math.max(...evs.map((e) => e.d)) : null, eventNames: [...new Set(evs.map((e) => e.n))], longTasks: long.map((l) => Math.round(l.d)), loaf: (s.loaf || []).filter((l) => l.s >= first - 80 && l.s <= first + 1000).map((l) => ({ at: Math.round(l.s - first), d: Math.round(l.d), blocking: Math.round(l.b), beforeRender: Math.round(l.r), scripts: l.sc })), inputs: s.inputTs.length };
  });
  // a control that navigates can be read while the new document is being created ("Execution context was destroyed"): one more read after the load event; a page that really does not answer still fails here
  let after = await readAfter().catch(() => null);
  if (!after) { await page.waitForLoadState('load', { timeout: 15000 }).catch(() => {}); await sleep(300); after = await readAfter().catch(() => null); }
  if (!after) return { error: err || 'page not responding', navigated: true };
  const changed = after.url !== before.url || after.mut > 0 || after.active !== before.active || after.sx !== before.sx || after.sy !== before.sy;
  let pixel = null;
  if (!changed && wantPixelFallback) { const sig1 = await sigOf(page); pixel = sig0 !== null && sig1 !== null && sig0 !== sig1; }
  const navigated = after.url !== before.url && after.url.split('#')[0] !== before.url.split('#')[0];
  const latency = navigated ? null : (after.paintMs ?? after.domMs ?? after.eventMs);
  if (navigated) { after.longTasks = []; }
  return { ...after, navigated, navFcpMs: navigated && after.nav ? round(after.nav.fcp, 0) : null, error: err, urlChanged: after.url !== before.url, responded: changed || pixel === true, pixelOnly: !changed && pixel === true, latencyMs: latency != null ? round(latency, 1) : null, wallMs: Date.now() - t0 };
}

// ------------------------------------------------------------------ activation
export async function focusControl(page, lib, c) {
  const cdp = await lib.cdpFor(page);
  await cdp.send('DOM.scrollIntoViewIfNeeded', { backendNodeId: c.backendNodeId }).catch(() => {});
  await cdp.send('DOM.focus', { backendNodeId: c.backendNodeId });
}
export async function centre(page, lib, c) {
  const cdp = await lib.cdpFor(page);
  await cdp.send('DOM.scrollIntoViewIfNeeded', { backendNodeId: c.backendNodeId }).catch(() => {});
  const r = await cdp.send('DOM.resolveNode', { backendNodeId: c.backendNodeId });
  const res = await cdp.send('Runtime.callFunctionOn', { objectId: r.object.objectId, returnByValue: true, functionDeclaration: `function () {
    { const q = this.getBoundingClientRect(); const t0 = document.elementFromPoint(Math.min(Math.max(q.left + q.width / 2, 0), innerWidth - 1), Math.min(Math.max(q.top + q.height / 2, 0), innerHeight - 1)); if (t0 && t0 !== this && !this.contains(t0) && !t0.contains(this)) { try { this.scrollIntoView({ block: 'center', inline: 'center' }); } catch (e) {} } }
    const r = this.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const top = document.elementFromPoint(x, y);
    return { x, y, w: r.width, h: r.height, hit: !!top && (top === this || this.contains(top) || top.contains(this)), by: top ? top.tagName.toLowerCase() + (top.id ? '#' + top.id : '') + (typeof top.className === 'string' && top.className ? '.' + top.className.trim().split(/\\s+/).slice(0, 3).join('.') : '') + (top.innerText ? ' "' + top.innerText.trim().slice(0, 24) + '"' : '') : null, inView: x >= 0 && y >= 0 && x <= innerWidth && y <= innerHeight, shown: r.width > 0 && r.height > 0 && getComputedStyle(this).visibility !== 'hidden' && getComputedStyle(this).display !== 'none' && this.isConnected };
  }` });
  cdp.send('Runtime.releaseObject', { objectId: r.object.objectId }).catch(() => {});
  return res.result.value;
}
export const MODES_BY_ROLE = {
  desktop: { button: ['click', 'enter', 'space'], link: ['click', 'enter'], checkbox: ['click', 'space'], radio: ['click', 'space'], switch: ['click', 'space', 'enter'], tab: ['click', 'enter'], menuitem: ['click', 'enter'], option: ['click'], textbox: ['click+type'], searchbox: ['click+type'], combobox: ['click', 'arrow'], slider: ['click', 'arrow'], spinbutton: ['click+type', 'arrow'], DisclosureTriangle: ['click', 'enter', 'space'], treeitem: ['click'], menuitemcheckbox: ['click', 'space'], menuitemradio: ['click', 'space'], PopUpButton: ['click', 'arrow'], ToggleButton: ['click', 'enter', 'space'] },
  phone: { button: ['tap', 'enter'], link: ['tap', 'enter'], checkbox: ['tap'], radio: ['tap'], switch: ['tap'], tab: ['tap'], menuitem: ['tap'], option: ['tap'], textbox: ['tap+type'], searchbox: ['tap+type'], combobox: ['tap'], slider: ['tap', 'arrow'], spinbutton: ['tap+type'], DisclosureTriangle: ['tap'], treeitem: ['tap'], menuitemcheckbox: ['tap'], menuitemradio: ['tap'], PopUpButton: ['tap'], ToggleButton: ['tap'] },
};
export async function doMode(page, lib, c, mode) {
  if (mode === 'click' || mode === 'tap' || mode === 'click+type' || mode === 'tap+type') {
    const p = await centre(page, lib, c);
    if (!p.inView || !p.hit) throw Object.assign(new Error(`not hittable: ${p.inView ? 'covered by ' + p.by : 'outside the viewport'}`), { code: 'not-hittable', by: p.by });
    if (mode.startsWith('click')) await page.mouse.click(p.x, p.y); else await lib.touchTap(page, p.x, p.y);
    if (mode.endsWith('+type')) { await page.keyboard.type('a'); await page.keyboard.press('Backspace'); }
  } else if (mode === 'enter') { await focusControl(page, lib, c); await page.keyboard.press('Enter'); }
  else if (mode === 'space') { await focusControl(page, lib, c); await page.keyboard.press('Space'); }
  else if (mode === 'arrow') { await focusControl(page, lib, c); await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowUp'); }
  else throw new Error(`unknown mode ${mode}`);
}

// ------------------------------------------------------------------ keyboard Tab walk
/** press Tab through the page; returns {stops:[...], cycled, reachedBody}. Each stop: key info + focus-visibility verdict */
export async function tabWalk(page, lib, { max = 300 } = {}) {
  await page.evaluate(() => { window.__accSeen = new WeakSet(); document.activeElement && document.activeElement.blur && document.activeElement.blur(); window.scrollTo(0, 0); });
  const cdp = await lib.cdpFor(page);
  const stops = []; const seen = new Map(); let cycled = false;
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    const st = await page.evaluate(() => {
      const el = document.activeElement; if (!el || el === document.body || el === document.documentElement) return { body: true };
      const seenSet = (window.__accSeen = window.__accSeen || new WeakSet()); const repeat = seenSet.has(el); seenSet.add(el); el.setAttribute('data-acc-tabbed', '1');
      const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      const top = document.elementFromPoint(Math.min(Math.max(r.left + r.width / 2, 0), innerWidth - 1), Math.min(Math.max(r.top + r.height / 2, 0), innerHeight - 1));
      const outline = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 && !/rgba\(\d+, \d+, \d+, 0\)/.test(cs.outlineColor);
      const shadow = cs.boxShadow && cs.boxShadow !== 'none';
      const sel = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
      const path = []; for (let p = el; p && p !== document.body && path.length < 6; p = p.parentElement) path.unshift(p.tagName.toLowerCase() + (p.id ? '#' + p.id : ''));
      return { repeat, sel, path: path.join('>'), text: (el.getAttribute('aria-label') || el.innerText || el.value || el.getAttribute('title') || '').trim().slice(0, 40), rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], hasOutline: outline, hasShadow: !!shadow, focusVisible: el.matches(':focus-visible'), tabindex: el.getAttribute('tabindex'), covered: !!top && !(top === el || el.contains(top) || top.contains(el)), coveredBy: top ? top.tagName.toLowerCase() + (top.id ? '#' + top.id : '') : null, offscreen: r.width === 0 || r.height === 0 || r.bottom < 0 || r.right < 0 || r.top > innerHeight || r.left > innerWidth, inShadow: false };
    });
    if (st.body) { stops.push({ body: true }); if (stops.filter((x) => x.body).length > 1) break; continue; }
    if (st.repeat) { cycled = true; break; }
    seen.set(i, i);
    // visible focus indicator: outline / shadow, else compare pixels of the element's box focused vs blurred
    if (!st.hasOutline && !st.hasShadow) {
      const clip = { x: Math.max(0, st.rect[0] - 6), y: Math.max(0, st.rect[1] - 6), width: Math.max(2, Math.min(st.rect[2] + 12, 1200)), height: Math.max(2, Math.min(st.rect[3] + 12, 600)) };
      try {
        const a = await page.screenshot({ clip, type: 'png', timeout: 5000 });
        await page.evaluate(() => { window.__accFocused = document.activeElement; document.activeElement.blur(); });
        const b = await page.screenshot({ clip, type: 'png', timeout: 5000 });
        st.pixelFocusDiff = !a.equals(b);
        // restore focus on the same element (Chrome keeps the keyboard modality, so :focus-visible still applies)
        await page.evaluate(() => { if (window.__accFocused) { window.__accFocused.focus({ preventScroll: true }); window.__accFocused = null; } });
      } catch { st.pixelFocusDiff = null; }
    }
    st.visibleFocus = st.hasOutline || st.hasShadow || st.pixelFocusDiff === true;
    stops.push(st);
  }
  return { stops, cycled };
}

export async function isTabbed(page, lib, c) {
  const cdp = await lib.cdpFor(page);
  try {
    const r = await cdp.send('DOM.resolveNode', { backendNodeId: c.backendNodeId });
    const res = await cdp.send('Runtime.callFunctionOn', { objectId: r.object.objectId, returnByValue: true, functionDeclaration: 'function () { return this.hasAttribute("data-acc-tabbed"); }' });
    cdp.send('Runtime.releaseObject', { objectId: r.object.objectId }).catch(() => {});
    return !!res.result.value;
  } catch { return false; }
}

export function summarizeFrames(frames) {
  const f = frames.filter((x) => x > 0).sort((a, b) => a - b);
  if (!f.length) return null;
  return { n: f.length, p50: round(percentile(f, 50), 2), p95: round(percentile(f, 95), 2), p99: round(percentile(f, 99), 2), max: round(f[f.length - 1], 1), over50: f.filter((x) => x > 50).length, over100: f.filter((x) => x > 100).length, fps: round(1000 / (f.reduce((a, b) => a + b, 0) / f.length), 1) };
}

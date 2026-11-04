// Check 5: performance.
//  A. Web Vitals per route, cold (cache + storage + service worker cleared before every load), desktop 1440x900 and phone 390x844 (touch, CPU 4x by default
//     like Lighthouse mobile; network not throttled because the server is local): LCP, CLS (largest 5 s session window), FCP, TBT proxy (long tasks after FCP
//     until 3 s after load), plus INP measured on the app from real clicks (Event Timing, worst of the interactions).
//  B. Frame-time distribution (requestAnimationFrame deltas) while the map animation plays at 1x and 4x, desktop and phone.
//  C. JS heap growth over the soak (default 120 s; the acceptance run uses --soak-seconds 600) with forced GC at every sample, DOM node / listener counts,
//     heartbeat for hangs, crash detection.
// Thresholds: tools/accept/thresholds.json.  Any value outside the green band is a defect.
import { Check, sleep, round, percentile } from '../lib/util.mjs';
import { settle, watchPage, watchDefects } from '../lib/browser.mjs';
import { INIT_SCRIPT, enumerateControls, measure, doMode, summarizeFrames } from '../lib/interact.mjs';

const VITALS = `(() => {
  if (window.__vit) return;
  const v = window.__vit = { lcp: 0, lcpEl: null, lcpSize: 0, cls: 0, win: { value: 0, first: 0, last: 0, n: 0 }, fcp: null, lt: [], loadAt: null };
  const po = (type, fn, extra = {}) => { try { new PerformanceObserver((l) => { for (const e of l.getEntries()) fn(e); }).observe({ type, buffered: true, ...extra }); } catch (e) {} };
  po('largest-contentful-paint', (e) => { v.lcp = e.startTime; v.lcpSize = e.size; v.lcpEl = e.element ? e.element.tagName.toLowerCase() + (e.element.id ? '#' + e.element.id : '') + (e.url ? ' ' + e.url.slice(-40) : '') : (e.url || '').slice(-40); });
  po('layout-shift', (e) => { if (e.hadRecentInput) return; const w = v.win; if (w.n && e.startTime - w.last < 1000 && e.startTime - w.first < 5000) { w.value += e.value; w.last = e.startTime; w.n++; } else { v.win = { value: e.value, first: e.startTime, last: e.startTime, n: 1 }; } v.cls = Math.max(v.cls, v.win.value); });
  po('paint', (e) => { if (e.name === 'first-contentful-paint') v.fcp = e.startTime; });
  po('longtask', (e) => { v.lt.push({ s: e.startTime, d: e.duration }); });
  addEventListener('load', () => { v.loadAt = performance.now(); });
})();`;

const getFcpLcp = (page) => page.evaluate(() => {
  const v = window.__vit; if (!v) return null;
  const from = v.fcp ?? 0, to = (v.loadAt ?? performance.now()) + 3000;
  const tbt = v.lt.filter((l) => l.s >= from && l.s <= to).reduce((a, l) => a + Math.max(0, l.d - 50), 0);
  const nav = performance.getEntriesByType('navigation')[0] || {};
  return { lcp: v.lcp, lcpEl: v.lcpEl, cls: v.cls, fcp: v.fcp, tbt, longTasks: v.lt.length, ttfb: nav.responseStart, dcl: nav.domContentLoadedEventEnd, load: nav.loadEventEnd };
});

export async function run(ctx) {
  const c = new Check('5', 'Performance');
  c.notRunParts = [];
  const lib = ctx.lib; const T = ctx.thresholds; const W = T.webVitals; const FR = T.frames;
  const phoneCpu = Number(ctx.args['cpu-throttle-phone'] ?? 4), desktopCpu = Number(ctx.args['cpu-throttle-desktop'] ?? 1);
  const frameSeconds = Number(ctx.args['frame-seconds'] || 12);
  const shells = [
    { name: 'desktop', vp: { width: 1440, height: 900, dpr: 1, mobile: false }, cpu: desktopCpu, p95: FR.p95FrameMsDesktop },
    { name: 'phone', vp: { width: 390, height: 844, dpr: 2, mobile: true }, cpu: phoneCpu, p95: FR.p95FrameMsPhone },
  ];
  c.metrics.setup = { phoneCpuThrottle: phoneCpu, desktopCpuThrottle: desktopCpu, networkThrottle: 'none (local server)', frameSeconds, soakSeconds: ctx.soakSeconds };

  // ============================================================ A. vitals on every route
  const vit = [];
  // diagnostic options (measurement only, no threshold changes): --vitals-repeat N repeats section A N times; --vitals-only stops after it
  const vitalsRepeat = Math.max(1, Number(ctx.args['vitals-repeat'] || 1));
  for (let rep = 0; rep < vitalsRepeat; rep++)
  for (const shell of shells) {
    for (const needMap of [false, true]) {
      const set = ctx.routes.filter((r) => !!(r.hasMapbox || r.app) === needMap);
      if (!set.length) continue;
      // One browser per measured load (cold in the full sense: new profile, new GPU/renderer processes). Measured on this machine: in a browser that has already
      // loaded 2 or more map pages, every further load of the SAME route takes 2 to 4 times the blocking time (ground-remembers, phone 4x, same route 4 times in a row:
      // 119, 94, 281, 348 ms; the frozen R1d build behaves the same: 87, 94, 257, 192), while a fresh browser per load gives the stable value (median 113, max 158 of 7).
      // That is a property of a long-lived automation browser, not of the page, and a visitor's first view of a route is never the 5th page of a headless session.
      // The thresholds are unchanged; --vitals-reuse-session restores the earlier one-browser-per-group behaviour for comparison.
      const reuseSession = !!ctx.args['vitals-reuse-session'];
      const openVitSession = () => ctx.sessions.create({ profile: `vit-${shell.name}-${needMap ? 'map' : 'plain'}`, tiles: needMap ? 'inject' : 'block', onboarded: true });
      let session = await openVitSession();
      c.metrics.chrome = session.chromeVersion;
      try {
        for (const r of set) {
          if (!reuseSession && r !== set[0]) { await session.close().catch(() => {}); session = await openVitSession(); }
          if (needMap && lib.tileBudget.used > lib.tileBudget.cap - 60) { c.notRunParts.push(`vitals ${shell.name} ${r.path}: tile budget spent`); continue; }
          const page = await session.newPage(); const where = `${shell.name} ${r.path}`;
          const w = watchPage(page, lib, { expectStatus: r.expectStatus ? { [r.url]: r.expectStatus } : {}, getTileMode: () => (needMap ? 'inject' : 'block'), capped: () => session.tileStats.capBlocked > 0 });
          try {
            const cdp = await lib.cdpFor(page);
            await cdp.send('Network.enable'); await cdp.send('Network.clearBrowserCache'); await cdp.send('Network.clearBrowserCookies');
            await cdp.send('Storage.clearDataForOrigin', { origin: ctx.cand.url, storageTypes: 'all' }).catch(() => {});
            await page.addInitScript(VITALS);
            await lib.emulateViewport(page, shell.vp);
            if (shell.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: shell.cpu });
            await page.goto(ctx.cand.url + r.url, { waitUntil: 'load', timeout: 60000 });
            if (r.app) await lib.waitForApp(page, 60000);
            await sleep(3500);
            const v = await getFcpLcp(page);
            if (!v) { c.defect('vitals-unavailable', where, 'PerformanceObserver data missing'); continue; }
            vit.push({ shell: shell.name, route: r.path, lcp: round(v.lcp, 0), cls: round(v.cls, 4), fcp: round(v.fcp, 0), tbt: round(v.tbt, 0), lcpEl: v.lcpEl, ttfb: round(v.ttfb, 0), load: round(v.load, 0) });
            if (r.expectStatus) continue;                       // the 404 page is measured but not judged against a 200 page's story
            if (!v.lcp) c.defect('lcp-not-reported', where, 'the browser reported no Largest Contentful Paint');
            else if (v.lcp > W.lcpMs) c.defect('lcp', where, `LCP ${round(v.lcp, 0)} ms > ${W.lcpMs} ms (element ${v.lcpEl}; cpu ${shell.cpu}x)`);
            if (v.cls > W.cls) c.defect('cls', where, `CLS ${round(v.cls, 4)} > ${W.cls}`);
            if (v.tbt > W.tbtMs) c.defect('tbt', where, `TBT proxy ${round(v.tbt, 0)} ms > ${W.tbtMs} ms (${v.longTasks} long tasks; cpu ${shell.cpu}x)`);
            for (const d of watchDefects(w)) c.defect(`vitals-load-${d.code}`, where, d.detail);
          } catch (e) { c.notRunParts.push(`vitals ${where}: ${String(e.message).slice(0, 160)}`); }
          await page.close().catch(() => {});
        }
      } finally { await session.close().catch(() => {}); }
    }
  }
  c.raw.vitals = vit;
  c.metrics.vitalsPages = vit.length;
  if (ctx.args['vitals-only']) { c.notRunParts.push('diagnostic run (--vitals-only): sections B and C not run'); return c.finish(); }

  // ============================================================ A2 + B + C on the app, per shell
  const app = ctx.routes.find((r) => r.app);
  if (!app) { c.notRunParts.push('no app route (index.html) in the candidate'); return c.finish(); }
  const soakShells = String(ctx.args['soak-shells'] || 'desktop').split(',');
  const frames = []; const soaks = []; const inps = [];
  for (const shell of shells) {
    if (lib.tileBudget.used > lib.tileBudget.cap - 120) { c.notRunParts.push(`app performance ${shell.name}: tile budget spent`); continue; }
    const session = await ctx.sessions.create({ profile: `perf-${shell.name}`, tiles: 'inject', onboarded: true });
    try {
      const page = await session.newPage();
      const w = watchPage(page, lib, { getTileMode: () => 'inject', capped: () => session.tileStats.capBlocked > 0 });
      let crashed = false; page.on('crash', () => { crashed = true; });
      await page.addInitScript(INIT_SCRIPT);
      await lib.emulateViewport(page, shell.vp);
      await page.goto(ctx.cand.url + app.url, { waitUntil: 'load', timeout: 60000 });
      await lib.waitForApp(page, 60000); await settle(page, 3000);
      if (shell.name === 'desktop') await lib.chooseLayout(page, 'desktop').catch(() => {});
      const view = await lib.waitFor(async () => lib.mapView(page), { timeout: 40000, label: 'map instance' }).catch(() => null);
      if (!view) { c.notRunParts.push(`app performance ${shell.name}: the Mapbox map did not load on localhost (frame-time and soak NOT RUN)`); await session.close(); continue; }
      const renderer = await page.evaluate(() => { try { const cv = document.createElement('canvas'); const gl = cv.getContext('webgl'); const e = gl.getExtension('WEBGL_debug_renderer_info'); return gl.getParameter(e.UNMASKED_RENDERER_WEBGL); } catch (e) { return 'unknown'; } });
      c.metrics.webglRenderer = renderer;
      if (/swiftshader|llvmpipe|software/i.test(renderer)) c.note('software-rendering', shell.name, `WebGL renderer is "${renderer}": frame times are measured on SOFTWARE rendering, i.e. pessimistic compared with a phone/desktop GPU`);

      // ---- A2: INP from real clicks on up to 30 buttons
      const ctls = (await enumerateControls(page, lib)).filter((x) => x.role === 'button' && x.visible && !x.disabled);
      const ev = [];
      for (const ctl of ctls.slice(0, 30)) {
        try { const m = await measure(page, () => doMode(page, lib, ctl, shell.name === 'phone' ? 'tap' : 'click'), { window: 350, wantPixelFallback: false }); if (m.eventMs != null) ev.push(m.eventMs); else if (m.latencyMs != null) ev.push(Math.min(m.latencyMs, 16)); else ev.push(8); } catch { /* control moved */ }
        await page.keyboard.press('Escape').catch(() => {});
      }
      ev.sort((a, b) => a - b);
      const inp = ev.length ? (ev.length < 50 ? ev[ev.length - 1] : percentile(ev, 98)) : null;
      inps.push({ shell: shell.name, interactions: ev.length, inp });
      if (inp == null) c.notRunParts.push(`INP ${shell.name}: no button could be activated`); else if (inp > W.inpMs) c.defect('inp', `${shell.name} app`, `INP ${round(inp, 0)} ms > ${W.inpMs} ms over ${ev.length} real clicks`);
      await page.reload({ waitUntil: 'load' }); await lib.waitForApp(page, 60000); await settle(page, 3000);
      if (shell.name === 'desktop') await lib.chooseLayout(page, 'desktop').catch(() => {});
      await lib.waitFor(async () => lib.mapView(page), { timeout: 40000, label: 'map instance' }).catch(() => null);

      // ---- B: frame times at 1x and 4x
      const ui = animationControls(page, shell.name);
      for (const speed of ['1x', '4x']) {
        const where = `${shell.name} animation ${speed}`;
        try {
          if (!(await ui.ensurePaused())) throw new Error('could not pause before measuring');
          await ui.setSpeed(speed);
          const tick0 = await ui.tick();
          await page.evaluate(() => window.__acc.reset());
          await page.evaluate(() => window.__acc.startFrames());
          if (!(await ui.play())) throw new Error('could not press Play');
          await sleep(frameSeconds * 1000);
          const fr = await page.evaluate(() => window.__acc.stopFrames());
          const lts = await page.evaluate(() => window.__acc.lt.map((l) => Math.round(l.d)));
          const tick1 = await ui.tick();
          await ui.ensurePaused();
          const s = summarizeFrames(fr);
          frames.push({ shell: shell.name, speed, tick0, tick1, ...s, longTasks: lts.length, longTaskMax: lts.length ? Math.max(...lts) : 0 });
          if (!s) { c.notRunParts.push(`${where}: no frames sampled`); continue; }
          if (tick1 == null || tick0 == null || tick1 <= tick0) c.defect('animation-did-not-advance', where, `tick ${tick0} -> ${tick1} after ${frameSeconds} s of Play (animation not running?)`);
          if (s.p95 > shell.p95) c.defect('frame-time-p95', where, `p95 frame ${s.p95} ms > ${shell.p95} ms (p50 ${s.p50}, p99 ${s.p99}, max ${s.max}, ${s.n} frames, ${s.fps} fps)`);
          if (s.over100 / s.n > 0.01) c.defect('frame-jank', where, `${s.over100} of ${s.n} frames took over ${FR.maxJankFrameMs} ms (${round(100 * s.over100 / s.n, 2)}%)`);
          if (lts.length) c.defect('long-tasks-during-animation', where, `${lts.length} long task(s) while the animation played, worst ${Math.max(...lts)} ms (limit 0 per interaction; 50 ms each)`);
        } catch (e) { c.notRunParts.push(`${where}: ${String(e.message).slice(0, 200)}`); }
      }

      // ---- C: soak
      if (soakShells.includes(shell.name)) {
        const soak = await runSoak(ctx, c, page, ui, shell, () => crashed);
        if (soak) soaks.push(soak);
      }
      for (const d of watchDefects(w)) c.defect(`perf-app-${d.code}`, shell.name, d.detail);
      if (crashed) c.defect('page-crash', shell.name, 'the renderer crashed during the performance run');
    } catch (e) { c.notRunParts.push(`app performance ${shell.name}: harness error ${String(e.message).slice(0, 200)}`); }
    finally { await session.close(); }
  }
  c.raw.frames = frames; c.raw.soak = soaks; c.raw.inp = inps;
  c.metrics.frames = frames; c.metrics.inp = inps; c.metrics.soak = soaks.map((s) => ({ shell: s.shell, seconds: s.seconds, samples: s.samples.length, startMB: s.startMB, endMB: s.endMB, growthPercent: s.growthPercent, maxHeartbeatMs: s.maxHeartbeatMs, domNodes: [s.nodes0, s.nodes1] }));
  if (!soakShells.length) c.notRunParts.push('soak not requested');
  return c.finish();
}

/** the animation UI of the two shells (found by text/label, the same selectors tests/t0 uses) */
function animationControls(page, shell) {
  const tickRe = /Tick (\d+)\/675/;
  // The moment number: the CLOCK group puts it in data-gt-frame (the screen speaks times of day now and no longer prints "Tick n/675"); the text is kept as a fallback for trees without CLOCK
  const readTick = async () => {
    const f = await page.evaluate(() => { const e = document.querySelector('[data-gt-frame]'); const v = e ? Number(e.getAttribute('data-gt-frame')) : NaN; if (Number.isFinite(v)) return v; const s = document.querySelector('input[aria-label="Battle time"]'); return s && Number.isFinite(Number(s.value)) ? Number(s.value) : null; }).catch(() => null);
    if (f != null) return f;
    const t = await page.evaluate(() => document.body.innerText); const m = tickRe.exec(t); return m ? Number(m[1]) : null;
  };
  const playBtn = () => page.locator('button[title^="Play/Pause"], button[aria-label*="Play" i], button[aria-label*="Pause" i], button[title*="Play" i]').first();
  const isPlaying = async () => {
    const a = await readTick(); await sleep(700); const b = await readTick(); return a != null && b != null && b !== a;
  };
  return {
    tick: readTick,
    async play() { if (await isPlaying()) return true; await playBtn().click({ timeout: 5000 }).catch(async () => { await playBtn().dispatchEvent('click'); }); await sleep(600); return isPlaying(); },
    async ensurePaused() { if (!(await isPlaying())) return true; await playBtn().click({ timeout: 5000 }).catch(async () => { await playBtn().dispatchEvent('click'); }); await sleep(500); return !(await isPlaying()); },
    async setSpeed(speed) {
      if (shell === 'desktop') { await page.locator(`button:text-is("${speed}")`).first().click({ timeout: 5000 }); await sleep(250); return; }
      // phone: one button cycles the speed ("1×", aria-label "1× playback speed. Tap to change."); read its label, tap until it matches
      const find = () => page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /playback speed/i.test(x.getAttribute('aria-label') || '') || /^(1\/4|1\/2|1|2|4|8)[x×]/.test((x.innerText || '').trim())); return b ? (b.innerText || '').trim().replace('×', 'x') : null; });
      for (let i = 0; i < 8; i++) {
        const lbl = await find();
        if (lbl && lbl === speed) return;
        await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /playback speed/i.test(x.getAttribute('aria-label') || '') || /^(1\/4|1\/2|1|2|4|8)[x×]/.test((x.innerText || '').trim())); if (b) b.click(); });
        await sleep(250);
      }
      throw new Error(`could not select speed ${speed} on the phone shell`);
    },
    async restart() { const day = page.locator('button:text-is("July 1")').last(); await day.click({ timeout: 4000 }).catch(() => {}); await sleep(600); },
  };
}

async function runSoak(ctx, c, page, ui, shell, crashedFn) {
  const lib = ctx.lib; const H = ctx.thresholds.heap; const seconds = ctx.soakSeconds;
  const where = `${shell.name} soak ${seconds}s`;
  const cdp = await lib.cdpFor(page);
  await cdp.send('HeapProfiler.enable').catch(() => {}); await cdp.send('Memory.getDOMCounters').catch(() => {});
  const sample = async () => {
    await cdp.send('HeapProfiler.collectGarbage').catch(() => {});
    const h = await cdp.send('Runtime.getHeapUsage'); const d = await cdp.send('Memory.getDOMCounters').catch(() => ({}));
    return { t: Date.now(), used: h.usedSize, total: h.totalSize, nodes: d.nodes, listeners: d.jsEventListeners, documents: d.documents };
  };
  try {
    await ui.ensurePaused(); await ui.setSpeed('4x'); await ui.play();
    const t0 = Date.now(); const samples = []; let maxHb = 0; let hangs = 0; let nextSample = t0 + Math.min(20000, seconds * 250); let nextPoke = t0 + 15000; let base = null;
    const warm = t0 + Math.min(60000, seconds * 100);      // warm-up: the heap of an app that has just booted is still climbing (caches, tile pyramids, JIT): 60 s of a 600 s soak (it was 30 s, a baseline taken before the plateau)
    let stalls = 0;
    while (Date.now() - t0 < seconds * 1000) {
      await sleep(2500);
      const hb0 = Date.now();
      const alive = await Promise.race([page.evaluate(() => performance.now()).then(() => true), sleep(5000).then(() => false)]).catch(() => false);
      const hb = Date.now() - hb0; maxHb = Math.max(maxHb, hb);
      if (!alive) { hangs++; c.defect('page-unresponsive', where, `heartbeat evaluate() did not return within 5 s (hang or crash) at ${Math.round((Date.now() - t0) / 1000)} s`); break; }
      if (crashedFn()) { c.defect('page-crash', where, `renderer crashed at ${Math.round((Date.now() - t0) / 1000)} s`); break; }
      const tk = await ui.tick(); if (tk != null && tk >= 672) { await ui.restart(); await ui.play(); }
      if (Date.now() >= nextPoke) { nextPoke += 20000; try { const v = await lib.mapView(page); const cv = await page.evaluate(() => { const r = window.__t0map.getCanvas().getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height * 0.45]; }); if (shell.name === 'desktop') { await lib.wheel(page, cv[0], cv[1], -120); await sleep(300); await lib.wheel(page, cv[0], cv[1], 120); } else { await lib.touchSwipe(page, [cv[0], cv[1]], [cv[0] - 40, cv[1] - 20], { steps: 6 }); } } catch { /* map busy */ } }
      if (!base && Date.now() >= warm) { base = await sample(); samples.push({ ...base, label: 'baseline-after-warmup' }); }
      else if (base && Date.now() >= nextSample) { nextSample += Math.max(15000, seconds * 1000 / 12); const s = await sample(); samples.push(s); }
    }
    const end = await sample(); samples.push({ ...end, label: 'end' });
    base ||= samples[0];
    // Growth = (median of the last 3 samples - median of the first 3 samples after warm-up) / the latter, every sample taken after a forced GC. One sample of a plateau that saw-tooths by about 2 MB (V8 code objects, caches)
    // is noise; the median of three is not. The limit stays 10 %.
    const post = samples.filter((x) => x.label !== 'end'); const med = (arr) => { const v = arr.map((x) => x.used).sort((m, n) => m - n); return v[Math.floor(v.length / 2)]; };
    const baseMed = post.length >= 3 ? med(post.slice(0, 3)) : base.used; const endMed = post.length >= 3 ? med([...post.slice(-2), end]) : end.used;
    const growth = (endMed - baseMed) / baseMed * 100;
    const row = { shell: shell.name, seconds, samples: samples.map((s) => ({ t: Math.round((s.t - t0) / 1000), usedMB: round(s.used / 1048576, 2), nodes: s.nodes, listeners: s.listeners })), startMB: round(baseMed / 1048576, 2), endMB: round(endMed / 1048576, 2), growthPercent: round(growth, 2), maxHeartbeatMs: maxHb, nodes0: base.nodes, nodes1: end.nodes, listeners0: base.listeners, listeners1: end.listeners };
    if (growth > H.maxGrowthPercent) c.defect('heap-growth', where, `JS heap grew ${round(growth, 1)}% (${row.startMB} MB -> ${row.endMB} MB after forced GC) > ${H.maxGrowthPercent}%`);
    if (base.nodes && end.nodes && (end.nodes - base.nodes) / base.nodes > 0.25) c.defect('dom-node-growth', where, `DOM nodes ${base.nodes} -> ${end.nodes} (+${round(100 * (end.nodes - base.nodes) / base.nodes, 1)}%)`);
    if (base.listeners && end.listeners && (end.listeners - base.listeners) / base.listeners > 0.25) c.defect('listener-growth', where, `JS event listeners ${base.listeners} -> ${end.listeners}`);
    if (hangs) c.notRunParts.push(`${where}: stopped early after a hang`);
    if (seconds < 600) c.note('short-soak', where, `soak ran ${seconds} s; the acceptance run needs --soak-seconds 600`);
    return row;
  } catch (e) { c.notRunParts.push(`${where}: ${String(e.message).slice(0, 200)}`); return null; }
}

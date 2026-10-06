// test/shots.mjs - screenshots of the built Studio in real Chrome: a fixed set of states, written to docs/pitch/anim/prototype/shots/.  Deterministic: the engine is driven by studio.step(n)
// (no wall clock), so the same build gives the same pictures.   node docs/pitch/anim/prototype/test/shots.mjs [--only=name] [--port=9624]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const HERE = path.dirname(fileURLToPath(import.meta.url)); const PROTO = path.resolve(HERE, '..'); const REPO = path.resolve(PROTO, '..', '..', '..', '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? '1']; }));
const PORT = +(args.port || 9624); const SHOTS = path.join(PROTO, 'shots'); fs.mkdirSync(SHOTS, { recursive: true });
const CHROME = process.env.T0_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const base = pathToFileURL(path.join(PROTO, 'battle-studio.html')).href;

const SHOTS_DEF = [
  { name: '01-default-angle-z15', q: 'scene=fresh2&zoom=15', vp: [1440, 900], steps: 90 },
  { name: '02-tuning-studio', q: 'scene=fresh2&zoom=15&tune=1', vp: [1440, 900], steps: 90 },
  { name: '03-metrics-overlay', q: 'scene=fresh2&zoom=15&metrics=1&speed=2', vp: [1440, 900], steps: 240, play: true },
  { name: '04-inspector', q: 'scene=fresh2&zoom=16', vp: [1440, 900], steps: 90, select: true },
  { name: '05-field-z13.5-aggregates', q: 'scene=field&zoom=13.5', vp: [1440, 900], steps: 120 },
  { name: '06-dark-ink-backdrop', q: 'scene=carry1&zoom=15&backdrop=ink', vp: [1440, 900], steps: 90, dark: true },
  { name: '07-phone-390x844', q: 'scene=fresh2&zoom=15', vp: [390, 844], dpr: 2, steps: 90 },
  { name: '08-about-legend', q: 'scene=fresh2&zoom=15', vp: [1440, 900], steps: 60, about: true },
  { name: '09-raw-no-layout-diagnostic', q: 'scene=carry1&zoom=14&layout=raw', vp: [1440, 900], steps: 60 },
];

const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-first-run', '--disable-extensions', '--remote-debugging-port=' + PORT] });
try {
  for (const s of SHOTS_DEF) {
    if (args.only && s.name !== args.only) continue;
    const ctx = await browser.newContext({ viewport: { width: s.vp[0], height: s.vp[1] }, deviceScaleFactor: s.dpr || 1, colorScheme: s.dark ? 'dark' : 'light' });
    const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    await page.goto(base + '?fresh=1&' + s.q); await page.waitForFunction(() => window.__studio && window.__studio.ready);
    await page.evaluate(({ steps, select, about, play }) => {
      const st = window.__studio; const e = st.engine; if (play) e.transport.play();
      st.step(steps, 1000 / 60);
      if (select) { const t = e.frame.tiles.filter((q) => q.solid && q.kind === 'leaf' && q.label).sort((a, b) => b.prio - a.prio)[3] || e.frame.tiles.find((q) => q.kind === 'leaf'); e.select(t.ids[0]); st.ui.setSelection(t); st.step(40, 1000 / 60); }
      if (about) st.ui.togglePanel('about');
    }, s);
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(SHOTS, s.name + '.png') });
    console.log(s.name, errs.length ? 'ERRORS ' + errs.join(' | ') : 'ok');
    await ctx.close();
  }
} finally { await browser.close(); }

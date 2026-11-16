// A real-browser pass over the Live Sync controls of a scratch full tree (release/R1g/dist with the group applied), run through the machine lock:
//
//   tools/horde/bench.sh node candidates/r1h/wp-infra-28b/browser-check.mjs --tree tmp/r1h-cand/wp-infra-28b/dist --base release/R1g/dist --out tmp/r1h-cand/wp-infra-28b/browser-check.json
//
// Chromium (software rendering, no GPU) loads the page from a local static server.  mapboxgl and Peer are stand-ins defined before the page runs
// (so there is no network, no tile and no WebRTC): what is checked is the page script and its markup in a real DOM.
//   * the join input takes 6 typed characters and not a 7th; its placeholder fits (measured, against the placeholder of the base tree)
//   * the host's code is 6 characters of the 28; a host keeps 20 of 25 incoming connections and closes the rest
//   * a guest ignores the fuzz payloads (built in the page's realm) without an error, a dialog or an injected element, and follows a valid message
// Not checked here, and not claimed: real PeerJS traffic between two browsers, the Mapbox map, any GPU or timing figure.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { createStaticServer } from '../../../tools/t0/serve.mjs';
import { FUZZ_20, FUZZ_MORE, VALID } from './fuzz.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const TREE = path.resolve(REPO, opt('--tree', 'tmp/r1h-cand/wp-infra-28b/dist'));
const BASE = path.resolve(REPO, opt('--base', 'release/R1g/dist'));
const OUT = path.resolve(REPO, opt('--out', 'tmp/r1h-cand/wp-infra-28b/browser-check.json'));
const SHOTS = path.resolve(REPO, opt('--shots', 'tmp/r1h-cand/wp-infra-28b/shots'));
const ALPHABET = 'BCDFGHJKMNPQRSTVWXYZ23456789';

const STUB = `(() => {
  window.__maps = []; window.__peers = [];
  class FakeMap {
    constructor(o) { this.h = {}; this.src = {}; this.fit = 0; window.__maps.push(this); }
    addControl() {} once(e, f) { (this.h[e] ||= []).push(f); } on(e, f) { (this.h[e] ||= []).push(f); }
    emit(e) { for (const f of (this.h[e] || []).slice()) f(); }
    addSource(id) { this.src[id] = { calls: 0, setData(x) { this.calls++; this.last = x; } }; }
    getSource(id) { return this.src[id]; } addLayer() {} fitBounds() { this.fit++; }
  }
  window.mapboxgl = { accessToken: '', prewarm() {}, NavigationControl: class {}, Map: FakeMap };
  window.__Conn = class {
    constructor(p) { this.peer = p; this.h = {}; this.open = false; this.sent = []; this.closed = 0; this.ons = 0; }
    on(e, f) { this.ons++; (this.h[e] ||= []).push(f); }
    emit(e, ...a) { if (e === 'open') this.open = true; for (const f of (this.h[e] || []).slice()) f(...a); }
    send(m) { this.sent.push(m); } close() { this.closed++; this.open = false; }
  };
  window.Peer = class {
    constructor(id) { this.id = id; this.h = {}; this.open = false; this.destroyed = false; this.disconnected = false; this.connects = []; window.__peers.push(this); }
    on(e, f) { (this.h[e] ||= []).push(f); }
    emit(e, ...a) { if (e === 'open') this.open = true; for (const f of (this.h[e] || []).slice()) f(...a); }
    destroy() { this.destroyed = true; this.open = false; }
    connect(id) { const c = new window.__Conn(id); this.connects.push(c); return c; }
  };
})();`;

const results = { when: new Date().toISOString(), tree: path.relative(REPO, TREE), base: path.relative(REPO, BASE), checks: [], measures: {}, problems: [] };
const check = (name, ok, detail) => { results.checks.push({ name, ok: !!ok, detail }); if (!ok) results.problems.push(`${name}: ${detail ?? ''}`); };

async function openPage(browser, root, viewport) {
  const srv = await createStaticServer({ root, port: 0 });
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [], dialogs = [], external = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text().slice(0, 200)); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + String(e.message).slice(0, 200)));
  page.on('dialog', async (d) => { dialogs.push(d.message()); await d.dismiss(); });
  await ctx.addInitScript(STUB);
  await ctx.route((url) => !/^(127\.0\.0\.1|localhost)$/.test(url.hostname), (route) => { external.push(route.request().url().slice(0, 80)); return route.abort(); });
  await page.goto(`${srv.url}/watch-together.html`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__maps.length > 0 && !!document.getElementById('stops'), null, { timeout: 30000 });
  await page.evaluate(() => window.__maps.forEach((m) => m.emit('load')));
  return { page, errors, dialogs, external, async close() { await ctx.close(); await srv.close(); } };
}

const measure = (page) => page.evaluate(() => {
  const input = document.getElementById('join-code');
  const cs = getComputedStyle(input);
  const inner = input.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const w = (text, family) => { const c = document.createElement('canvas').getContext('2d'); c.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${family}`; return +c.measureText(text).width.toFixed(1); };
  const families = { page: cs.fontFamily, Inter: 'Inter', 'Liberation Sans (Arial, Helvetica)': '"Liberation Sans"', 'DejaVu Sans (widest here)': '"DejaVu Sans"' };
  const out = { placeholder: input.placeholder, maxlength: input.maxLength, clientWidth: input.clientWidth, innerWidth: +inner.toFixed(1), fontSize: cs.fontSize, fontFamily: cs.fontFamily, widths: {} };
  for (const [k, f] of Object.entries(families)) out.widths[k] = w(input.placeholder, f);
  return out;
});

const browser = await chromium.launch({ executablePath: process.env.T0_CHROME || '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--disable-gpu'] });
try {
  fs.mkdirSync(SHOTS, { recursive: true });
  const VIEWPORTS = [['desktop', { width: 1280, height: 900 }], ['phone', { width: 390, height: 844 }]];
  // ---- the base tree and the patched tree: how the join input looks (measured, and a picture of the row to look at)
  for (const [which, root] of [['base', BASE], ['tree', TREE]]) {
    for (const [label, vp] of VIEWPORTS) {
      const b = await openPage(browser, root, vp);
      results.measures[`${which}-${label}`] = await measure(b.page);
      await b.page.locator('#sync-controls').screenshot({ path: path.join(SHOTS, `${which}-${label}.png`) });
      await b.close();
    }
  }
  // ---- the patched tree, desktop: typing, host, cap, guest
  const P = await openPage(browser, TREE, VIEWPORTS[0][1]);
  const { page } = P;
  await page.locator('#join-code').pressSequentially('bcdfghjk');
  check('join input holds 6 typed characters, not 8', (await page.inputValue('#join-code')) === 'bcdfgh', await page.inputValue('#join-code'));
  check('join input is marked maxlength 6', (await page.getAttribute('#join-code', 'maxlength')) === '6');
  await page.fill('#join-code', 'bcdfg');
  await page.click('#join-btn');
  check('a code of 5 is refused with the 6-character message', (await page.textContent('#sync-status')) === 'enter the 6-character code first', await page.textContent('#sync-status'));
  check('a refused code makes no Peer', (await page.evaluate(() => window.__peers.length)) === 0);

  await page.click('#host-btn');
  await page.waitForFunction(() => window.__peers.length === 1, null, { timeout: 10000 });
  const hostId = await page.evaluate(() => window.__peers[0].id);
  const code = hostId.replace(/^gtbg-wt-/, '');
  check('the host code is 6 characters of the 28', code.length === 6 && [...code].every((c) => ALPHABET.includes(c)), hostId);
  await page.evaluate(() => { const p = window.__peers[0]; p.emit('open', p.id); });
  check('the code is shown on the page', (await page.textContent('#sync-code')) === code, await page.textContent('#sync-code'));
  const cap = await page.evaluate(() => {
    const p = window.__peers[0]; const conns = (window.__conns = []);
    for (let i = 0; i < 25; i++) { const c = new window.__Conn('guest-' + i); conns.push(c); p.emit('connection', c); }
    for (const c of conns) c.emit('open');
    return { closed: conns.map((c) => c.closed), ons: conns.map((c) => c.ons), status: document.getElementById('sync-status').textContent };
  });
  check('connections 1..20 stay open and 21..25 are closed once', cap.closed.slice(0, 20).every((n) => n === 0) && cap.closed.slice(20).every((n) => n === 1), JSON.stringify(cap.closed));
  check('refused connections were never given handlers', cap.ons.slice(20).every((n) => n === 0), JSON.stringify(cap.ons));
  check('the host says 20 connected', cap.status === 'hosting · 20 connected', cap.status);
  await page.fill('#new-tick', '100');
  await page.fill('#new-note', 'Cap check <b>x</b>');
  await page.click('#add-stop');
  const sent = await page.evaluate(() => window.__conns.map((c) => c.sent.map((m) => JSON.stringify(m))));
  check('every kept connection got one message and no refused one got any', sent.slice(0, 20).every((a) => a.length === 1) && sent.slice(20).every((a) => a.length === 0), JSON.stringify(sent.map((a) => a.length)));
  check('the host sent the moment, and the note that starts a tag as an empty note', sent[0][0] === '{"type":"goto","tick":100,"note":""}', sent[0][0]);
  await page.fill('#new-tick', '101');
  await page.fill('#new-note', 'plain note');
  await page.click('#add-stop');
  const sent2 = await page.evaluate(() => window.__conns[0].sent.map((m) => JSON.stringify(m)));
  check('a plain note is sent as it is', sent2[1] === '{"type":"goto","tick":101,"note":"plain note"}', sent2[1]);

  const G = await openPage(browser, TREE, VIEWPORTS[0][1]);
  const gp = G.page;
  await gp.fill('#join-code', 'bcdfgh');
  await gp.click('#join-btn');
  await gp.waitForFunction(() => window.__peers.length === 1, null, { timeout: 10000 });
  await gp.evaluate(() => { const p = window.__peers[0]; p.emit('open', 'g'); p.connects[0].emit('open'); });
  check('a typed code of 6 joins gtbg-wt-BCDFGH', (await gp.evaluate(() => window.__peers[0].connects[0].peer)) === 'gtbg-wt-BCDFGH');
  const caption = () => gp.evaluate(() => ({ text: document.getElementById('caption-bar').textContent, kids: document.querySelectorAll('#caption-bar *').length, calls: window.__maps[0].src['wt-units'] ? window.__maps[0].src['wt-units'].calls : -1 }));
  const send = (expr) => gp.evaluate((e) => { const c = window.__peers[0].connects[0]; const payload = (0, eval)('(' + e + ')'); c.emit('data', payload); return true; }, expr);
  await send(VALID[3].expr);
  const afterValid = await caption();
  check('a valid message moves the caption and shows its note as text', afterValid.text.includes(VALID[3].note) && afterValid.kids === 0, JSON.stringify(afterValid));
  const bad = [];
  for (const f of [...FUZZ_20, ...FUZZ_MORE]) {
    const before = await caption();
    try { await send(f.expr); } catch (e) { bad.push(`${f.id} threw ${String(e.message).slice(0, 80)}`); continue; }
    const after = await caption();
    if (after.text !== before.text || after.calls !== before.calls || after.kids !== 0) bad.push(`${f.id} ${f.what}: changed the page`);
  }
  check(`all ${FUZZ_20.length + FUZZ_MORE.length} fuzz payloads are ignored in a real DOM`, bad.length === 0, bad.join(' | '));
  await send(`{ type: 'goto', tick: 7, note: '<img src=x onerror=window.__pwn=1>' }`);
  await gp.waitForTimeout(300);
  check('a note with an img onerror runs nothing and adds nothing', (await gp.evaluate(() => window.__pwn === undefined && document.querySelectorAll('img').length === 0)) === true);
  check('no dialog opened', G.dialogs.length === 0 && P.dialogs.length === 0, [...G.dialogs, ...P.dialogs].join('|'));
  check('no console error or page error on the guest page', G.errors.length === 0, G.errors.join(' | '));
  check('no console error or page error on the host page', P.errors.length === 0, P.errors.join(' | '));
  results.externalAborted = [...new Set([...P.external, ...G.external])];
  await G.close();
  await P.close();
} finally { await browser.close(); }

// the placeholder: does it fit as well as the old one did?
const fitNote = [];
for (const label of ['desktop', 'phone']) {
  const b = results.measures[`base-${label}`], t = results.measures[`tree-${label}`];
  if (!b || !t) continue;
  for (const fam of Object.keys(t.widths)) {
    const oldFits = b.widths[fam] <= b.innerWidth, newFits = t.widths[fam] <= t.innerWidth;
    fitNote.push({ viewport: label, font: fam, oldWidth: b.widths[fam], oldInner: b.innerWidth, oldFits, newWidth: t.widths[fam], newInner: t.innerWidth, newFits });
    check(`placeholder fit (${label}, ${fam}): the new one fits where the old one fitted`, newFits || !oldFits, `old ${b.widths[fam]}/${b.innerWidth} px ${oldFits ? 'fits' : 'overflows'}, new ${t.widths[fam]}/${t.innerWidth} px ${newFits ? 'fits' : 'overflows'}`);
  }
}
results.placeholderFit = fitNote;
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(results, null, 1) + '\n');
console.log(`${results.checks.filter((c) => c.ok).length} of ${results.checks.length} checks passed; problems: ${results.problems.length}`);
for (const p of results.problems) console.log('  PROBLEM ' + p);
process.exit(results.problems.length ? 1 : 0);

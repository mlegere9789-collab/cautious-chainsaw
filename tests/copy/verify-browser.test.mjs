// Adversarial verifier browser tests (one headless Chrome at a time, own profile under tmp/verify-copy/, ports from base 9180, Mapbox blocked):
//   VER-BROWSER-01  the FAQ prints with its answers (collapsed <details> print as bare questions today)
//   VER-BROWSER-02  B opens AND closes the bookmarks panel as the guide says (release R1c: a second B does nothing; Esc closes it)
//   VER-BROWSER-03  Esc closes the story card before the event card, as the patches build it (the guide says the reverse)
// They skip when system Chrome, python with PyMuPDF or release/R1c/dist is missing.
//   node --test "tests/copy/verify-*.test.mjs"
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { REPO } from '../../tools/copy/lib/lint.mjs';

process.env.T0_AGENT = 'verify-copy';
process.env.T0_PORT_BASE = process.env.T0_PORT_BASE || '9180';
const CHROME = process.env.T0_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const haveChrome = fs.existsSync(CHROME);
const DIST = path.join(REPO, 'release', 'R1c', 'dist');
const haveDist = fs.existsSync(path.join(DIST, 'index.html'));
const fitzProbe = spawnSync('python', ['-c', 'import pymupdf'], { encoding: 'utf8' });
const haveFitz = fitzProbe.status === 0 || spawnSync('python', ['-c', 'import fitz'], { encoding: 'utf8' }).status === 0;
const lib = haveChrome ? await import('./../t0/lib.mjs') : null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = Number(process.env.T0_PORT_BASE);

test('VER-BROWSER-01: the FAQ prints with its answers', { skip: !haveChrome ? 'no Chrome' : !haveFitz ? 'no PyMuPDF' : false, timeout: 120000 }, async () => {
  const dir = path.join(REPO, 'candidates', 'trust-pages');
  const server = http.createServer((req, res) => { const f = path.join(dir, decodeURIComponent(req.url.split('?')[0])); if (fs.existsSync(f) && fs.statSync(f).isFile()) { res.writeHead(200, { 'content-type': f.endsWith('.css') ? 'text/css' : 'text/html; charset=utf-8' }); return res.end(fs.readFileSync(f)); } res.writeHead(404); res.end(); });
  await new Promise((r) => server.listen(BASE + 2, '127.0.0.1', r));
  const S = await lib.openSession({ profile: 'ver-faq', cdpPort: BASE + 1, tiles: 'block' });
  const out = path.join(REPO, 'tmp', 'verify-copy', 'faq-print.pdf');
  try {
    await S.page.goto(`http://127.0.0.1:${BASE + 2}/faq.html`, { waitUntil: 'load' });
    await S.page.emulateMedia({ media: 'print' });
    await S.page.pdf({ path: out, format: 'Letter', printBackground: true });
  } finally { await S.close(); server.close(); }
  const py = 'import sys\ntry:\n import pymupdf as fitz\nexcept ImportError:\n import fitz\nprint(" ".join(p.get_text() for p in fitz.open(sys.argv[1])))';
  const r = spawnSync('python', ['-c', py, out], { encoding: 'utf8' });
  const text = r.stdout.replace(/\s+/g, ' ');
  for (const phrase of ['It is free, there is no account system', 'does not call an AI model', '1,804 position rows', 'Not here. This site lists regiments, not individual soldiers']) {
    assert.ok(text.includes(phrase), `the printed FAQ lacks the answer text "${phrase}" (closed <details> are not printed; open them for print)`);
  }
});

async function openApp(url) {
  const srv = await lib.createStaticServer({ root: DIST, port: BASE + 3 });
  const S = await lib.openSession({ profile: 'ver-keys', cdpPort: BASE + 1, tiles: 'block' });
  await S.page.goto(`${srv.url}/${url}`, { waitUntil: 'load' });
  await lib.waitForApp(S.page, 45000); await lib.chooseLayout(S.page, 'desktop'); await sleep(3000);
  await S.page.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());
  return { S, srv };
}

test('VER-BROWSER-02: B opens and closes the bookmarks panel (guide: "Opens or closes the bookmarks panel")', { skip: !haveChrome ? 'no Chrome' : !haveDist ? 'no release/R1c/dist' : false, timeout: 150000 }, async () => {
  const { S, srv } = await openApp('');
  try {
    const dialogs = () => S.page.evaluate(() => document.querySelectorAll('[role="dialog"][aria-label*="Bookmarks"]').length);
    assert.equal(await dialogs(), 0);
    await S.page.keyboard.press('b'); await sleep(900);
    assert.equal(await dialogs(), 1, 'B did not open the bookmarks panel');
    await S.page.keyboard.press('b'); await sleep(900);
    assert.equal(await dialogs(), 0, 'a second B did not close the bookmarks panel (only Esc does)');
  } finally { await S.close(); srv.close && srv.close(); }
});

test('VER-BROWSER-03: Esc dismisses the story card before the event card', { skip: !haveChrome ? 'no Chrome' : !haveDist ? 'no release/R1c/dist' : false, timeout: 150000 }, async () => {
  const { S, srv } = await openApp('?t=14');
  try {
    const cards = () => S.page.evaluate(() => [...document.querySelectorAll('[data-gtbg-card]')].map((e) => e.getAttribute('data-gtbg-card')));
    assert.deepEqual((await cards()).sort(), ['1', '2'], 'tick 14 should show the story card (2) and the event card (1)');
    await S.page.keyboard.press('Escape'); await sleep(500);
    assert.deepEqual(await cards(), ['1'], 'the first Esc should close the story card (rank 2) and leave the event card');
    await S.page.keyboard.press('Escape'); await sleep(500);
    assert.deepEqual(await cards(), []);
  } finally { await S.close(); srv.close && srv.close(); }
});

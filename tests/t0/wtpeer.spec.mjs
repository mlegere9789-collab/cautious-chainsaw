// T0-WTP suite: page group PG-zfix (tools/t0/r1f/gen_zfix.py): /watch-together never closes a Live Sync connection while it is still being opened.
//
//   node tests/t0/wtpeer.spec.mjs --dist release/R1f/dist
//   node tests/t0/wtpeer.spec.mjs --dist <tree> --expect-red     red-first proof: on a tree without PG-zfix the browser tests must FAIL (exit 0 when they do)
//
// The page's Peer is replaced by a stand-in that records what is done to it (an init script defines window.Peer, so the page never fetches PeerJS and no network is used).  A real PeerJS
// peer logs "WebSocket is closed before the connection is established" when destroy() is called while its socket is still connecting; the stand-in counts exactly those calls.
process.env.T0_AGENT ||= 'wtp';
process.env.T0_PORT_BASE ||= '9900';
process.env.T0_TILE_CAP ||= '20000';
const L = await import('./lib.mjs');
const fs = await import('node:fs');
const path = await import('node:path');
const cp = await import('node:child_process');
const { REPO, TMP, PORT_BASE, openSession, createStaticServer, createSuite, sleep, emulateViewport, assert } = L;

const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : dflt; };
const DIST = path.resolve(REPO, opt('dist', 'release/R1f/dist'));
const EXPECT_RED = !!opt('expect-red', false);
const OUT = path.resolve(REPO, opt('out', path.join(TMP, 'wtpeer.json')));
if (!fs.existsSync(DIST)) { console.error(`dist not found: ${DIST}`); process.exit(2); }
let portN = 0;

const STUB = `(() => {
  window.__peers = []; window.__closedWhileConnecting = 0;
  window.Peer = class {
    constructor(id) { this.id = id; this.open = false; this.destroyed = false; this.disconnected = false; this._h = {}; window.__peers.push(this); }
    on(n, f) { (this._h[n] = this._h[n] || []).push(f); }
    emit(n, ...a) { if (n === 'error') this.failed = true; for (const f of (this._h[n] || []).slice()) f(...a); }
    destroy() { if (!this.open && !this.destroyed && !this.failed) window.__closedWhileConnecting++; this.destroyed = true; this.open = false; }
    connect() { const c = { open: false, on() {}, send() {} }; return c; }
    __open() { this.open = true; this.emit('open', this.id); }
  };
})();`;

async function session(url) {
  const k = portN++;
  const srv = await createStaticServer({ root: DIST, port: PORT_BASE + k * 2 });
  const S = await openSession({ profile: `wtp-${PORT_BASE + k * 2}-${Date.now() % 100000}`, cdpPort: PORT_BASE + k * 2 + 1, tiles: 'inject', onboarded: true, initScripts: [STUB] });
  const page = S.page; const warnings = [];
  page.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') warnings.push(`${m.type()}: ${m.text().slice(0, 200)}`); });
  page.on('pageerror', (e) => warnings.push(`pageerror: ${String(e.message).slice(0, 200)}`));
  await emulateViewport(page, { width: 390, height: 844, dpr: 2, mobile: true });
  await page.goto(`${srv.url}${url}`, { waitUntil: 'load' });
  await sleep(800);
  return { page, warnings, async close() { await S.close(); await srv.close(); } };
}
const state = (page) => page.evaluate(() => ({ peers: window.__peers.length, destroyed: window.__peers.map((p) => p.destroyed), closedWhileConnecting: window.__closedWhileConnecting, status: document.getElementById('sync-status').textContent, code: document.getElementById('sync-code').textContent }));

const suite = createSuite('wtpeer');

suite.test('T0-WTP-01', 'Host pressed twice while the first connection is still opening: no connecting peer is destroyed; the first one is retired when it has opened and the page shows only the newest', async (t) => {
  const S = await session('/watch-together');
  try {
    await S.page.evaluate(() => document.getElementById('host-btn').click());
    await sleep(300);
    await S.page.evaluate(() => document.getElementById('host-btn').click());
    await sleep(500);
    let s = await state(S.page);
    t.note('two activations, nothing opened yet', s);
    assert(s.peers === 2, `expected two peers, got ${s.peers}`);
    assert(s.closedWhileConnecting === 0, `${s.closedWhileConnecting} peer(s) destroyed while their connection was still opening`);
    assert(/connecting/.test(s.status), `status "${s.status}" while nothing has opened`);
    await S.page.evaluate(() => window.__peers[1].__open());
    await sleep(100);
    s = await state(S.page);
    t.note('newest opened', s);
    assert(/hosting/.test(s.status) && s.code.length === 5, `after the newest opened: status "${s.status}", code "${s.code}"`);
    const code1 = s.code;
    await S.page.evaluate(() => window.__peers[0].__open());
    await sleep(100);
    s = await state(S.page);
    t.note('retired peer opened late', s);
    assert(s.destroyed[0] === true, 'the first peer was not destroyed once it had opened');
    assert(s.closedWhileConnecting === 0, `${s.closedWhileConnecting} peer(s) destroyed while connecting`);
    assert(s.code === code1 && /hosting/.test(s.status), `a retired peer changed the page: status "${s.status}", code "${s.code}" (was ${code1})`);
    assert(!S.warnings.length, `console: ${S.warnings.slice(0, 3).join(' | ')}`);
  } finally { await S.close(); }
});

suite.test('T0-WTP-02', 'Host after the first peer has opened destroys it at once (as before); a retired peer that fails reports no error on the page', async (t) => {
  const S = await session('/watch-together');
  try {
    await S.page.evaluate(() => document.getElementById('host-btn').click());
    await sleep(400);
    await S.page.evaluate(() => window.__peers[0].__open());
    await sleep(100);
    await S.page.evaluate(() => document.getElementById('host-btn').click());
    await sleep(400);
    let s = await state(S.page);
    t.note('second Host after the first opened', s);
    assert(s.peers === 2 && s.destroyed[0] === true, `the opened peer was not destroyed at once: ${JSON.stringify(s.destroyed)}`);
    assert(s.closedWhileConnecting === 0, 'an opened peer counted as destroyed while connecting');
    // a third activation while the second is still connecting, then the second fails: the status must belong to the third
    await S.page.evaluate(() => document.getElementById('host-btn').click());
    await sleep(400);
    await S.page.evaluate(() => window.__peers[1].emit('error', new Error('x')));
    await sleep(100);
    s = await state(S.page);
    t.note('retired peer failed', s);
    assert(/connecting/.test(s.status), `a retired peer's error changed the status to "${s.status}"`);
    assert(s.closedWhileConnecting === 0, `${s.closedWhileConnecting} peer(s) destroyed while connecting`);
  } finally { await S.close(); }
});

suite.test('T0-WTP-03', 'Join pressed twice with a code: same rule as Host (no connecting peer destroyed)', async (t) => {
  const S = await session('/watch-together');
  try {
    await S.page.evaluate(() => { document.getElementById('join-code').value = 'ABCDE'; document.getElementById('join-btn').click(); });
    await sleep(300);
    await S.page.evaluate(() => document.getElementById('join-btn').click());
    await sleep(500);
    const s = await state(S.page);
    t.note('two joins', s);
    assert(s.peers === 2, `expected two peers, got ${s.peers}`);
    assert(s.closedWhileConnecting === 0, `${s.closedWhileConnecting} peer(s) destroyed while their connection was still opening`);
    assert(!S.warnings.length, `console: ${S.warnings.slice(0, 3).join(' | ')}`);
  } finally { await S.close(); }
});

suite.test('T0-WTP-04', 'the page group is generated from its script and registered copies are in step', async () => {
  const gen = cp.spawnSync('python', [path.join(REPO, 'tools/t0/r1f/gen_zfix.py'), '--check'], { cwd: REPO, encoding: 'utf8' });
  assert(gen.status === 0, `gen_zfix --check: ${gen.stdout}${gen.stderr}`);
  const sync = cp.spawnSync('python', [path.join(REPO, 'tools/t0/r1f_sync.py'), '--check'], { cwd: REPO, encoding: 'utf8' });
  assert(sync.status === 0, `r1f_sync --check: ${sync.stdout}${sync.stderr}`);
});

const t0 = Date.now();
const summary = await suite.run({ outFile: OUT, extra: () => ({ dist: path.relative(REPO, DIST), minutes: +((Date.now() - t0) / 60000).toFixed(1) }) });
// T0-WTP-04 is about the files, not about the tree under test
if (EXPECT_RED) { const ran = summary.results.filter((r) => r.id !== 'T0-WTP-04'); const pass = ran.filter((r) => r.status === 'pass'); console.log(`expect-red: ${ran.length - pass.length} of ${ran.length} browser tests failed as required`); process.exit(pass.length ? 1 : 0); }
process.exit(summary.failed ? 1 : 0);

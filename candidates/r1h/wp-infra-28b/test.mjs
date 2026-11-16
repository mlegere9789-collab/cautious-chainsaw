// Red-first test of wp-infra-28b: Watch Together Live Sync hardening (unguessable room codes, connection cap, guest message validation).
//
//   node --test candidates/r1h/wp-infra-28b/test.mjs                                            red: the untouched release/R1g/dist tree
//   R1H_TREE=tmp/r1h-cand/wp-infra-28b/green node --test candidates/r1h/wp-infra-28b/test.mjs  green: the scratch tree of group.json
//   (node candidates/r1h/_lib/prove.mjs wp-infra-28b runs both)
//
// The page script of watch-together.html runs in node:vm against a fake DOM, a fake mapboxgl, a fake PeerJS and a clock the test controls
// (page-vm.mjs).  goToTick is private to the page, so "reaches goToTick" is read from its effects: the caption bar text, the data given to
// the map source and the map's fitBounds calls (a fake placement exists for every moment 1..675 and its coordinates carry the moment).
// Nothing here is a browser: a real-browser run of tests/t0/wtpeer.spec.mjs is for the release workstream (request note
// docs/battle-theatre/GOVERNANCE/horde/requests/main-site-wp-infra-28b.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import * as acorn from 'acorn';
import { openTree, REPO } from '../_lib/tree.mjs';
import { loadPage, liveSyncScript, inlineScripts, FakeConn } from './page-vm.mjs';
import { FUZZ_20, FUZZ_MORE, VALID } from './fuzz.mjs';
import { PARAM_SETS } from './gen.mjs';

const PAGE = 'watch-together.html';
const tree = openTree();
const html = tree.text(PAGE);
const SCRATCH = path.join(REPO, 'tmp', 'r1h-cand', 'wp-infra-28b');

// The sets of the acceptance, written out here on purpose (not read from the page and not from gen.mjs).
//   later   (selected by row C08): 6 characters of a 28-character alphabet without vowels, L, 0 and 1; 20 guests; notes of at most 280
//   earlier (superseded, kept selectable by row C08): 31 characters (no I, L, O, 0, 1); notes of at most 140
const LATER = { alphabet: 'BCDFGHJKMNPQRSTVWXYZ23456789', codeLength: 6, maxGuests: 20, noteMax: 280, tickMax: 675 };
const EARLIER = { alphabet: 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', codeLength: 6, maxGuests: 20, noteMax: 140, tickMax: 675 };
const ID_PREFIX = 'gtbg-wt-';
const FUNNY = /[\u0000-\u001f\u007f-\u009f]/;

const range = (n) => Array.from({ length: n }, (_, i) => i);
const codeOf = (peer) => peer.id.slice(ID_PREFIX.length);
const inAlphabet = (code, P) => [...code].every((ch) => P.alphabet.includes(ch));
const staticTag = (src, id) => { const m = new RegExp(`<[a-z]+\\b[^>]*\\bid="${id}"[^>]*>`).exec(src); assert.ok(m, `no element with id ${id}`); return m[0]; };
const chiSquare = (counts, total, k) => counts.reduce((s, c) => s + ((c - total / k) ** 2) / (total / k), 0);

async function hostCodes(pageHtml, n) {
  const page = await loadPage(pageHtml);
  try {
    const codes = [];
    for (let i = 0; i < n; i++) codes.push(codeOf(await page.hostStart()));
    return { codes, page: { random: page.mathRandomCalls(), crypto: page.cryptoSpy.calls, sizes: new Set(page.cryptoSpy.sizes) } };
  } finally { page.close(); }
}
// the code a guest types is as long as the join input of the page under test takes (5 on release/R1g/dist, 6 with the group), so that the guest
// tests reach the guest handler on both trees and fail for their own reason on R1g
const joinCode = (src) => 'BCDFGHJK'.slice(0, Number(/maxlength="(\d+)"/.exec(staticTag(src, 'join-code'))[1]));
async function guestPage(pageHtml) {
  const page = await loadPage(pageHtml, { allowMathRandom: true });
  page.mapLoaded();
  const conn = await page.joinAs(joinCode(pageHtml));
  return { page, conn };
}
/** sends one payload (built in the page realm) to the guest; returns what happened */
function send(page, conn, expr) {
  const before = page.effects();
  const payload = page.build(expr);
  let threw = null;
  try { conn.emit('data', payload); } catch (e) { threw = e; }
  return { reached: !page.sameEffects(before, page.effects()), threw, shown: page.lastShown() };
}

// ------------------------------------------------------------------------------------------------------------- (1) room codes
test('room codes: the table of this test is the acceptance (28 distinct characters, no vowel, L, 0 or 1) and gen.mjs carries the same sets', () => {
  assert.equal(LATER.alphabet.length, 28);
  assert.equal(new Set(LATER.alphabet).size, 28);
  for (const ch of 'AEIOUL01') assert.ok(!LATER.alphabet.includes(ch), `${ch} must not be in the alphabet`);
  assert.equal(EARLIER.alphabet.length, 31);
  assert.equal(new Set(EARLIER.alphabet).size, 31);
  for (const ch of 'IL01O') assert.ok(!EARLIER.alphabet.includes(ch));
  for (const k of Object.keys(LATER)) assert.equal(PARAM_SETS.later[k], LATER[k], `gen.mjs later.${k}`);
  for (const k of Object.keys(EARLIER)) assert.equal(PARAM_SETS.earlier[k], EARLIER[k], `gen.mjs earlier.${k}`);
});

test('room codes: the page code draws with crypto.getRandomValues and no Math.random is left in the Live Sync script', () => {
  const src = liveSyncScript(html);
  assert.ok(!/Math\.random/.test(src), 'Math.random is still in the Live Sync script');
  const fn = /function randomCode\(\) \{([\s\S]*?)\n  \}\n/.exec(src);
  assert.ok(fn, 'randomCode() not found');
  assert.match(fn[1], /crypto\.getRandomValues\(/, 'randomCode does not call crypto.getRandomValues');
  assert.ok(!/Math\./.test(fn[1]), 'randomCode uses Math');
});

test('room codes: the constants of the page are the listed set (6 characters, 28-character alphabet, 20 guests, notes of 280, moments to 675)', () => {
  const src = liveSyncScript(html);
  const block = /const WT = \{([\s\S]*?)\n  \};/.exec(src);
  assert.ok(block, 'the constant block WT is missing');
  const get = (k) => { const m = new RegExp(`\\b${k}:\\s*('([^']*)'|\\d+)`).exec(block[1]); assert.ok(m, `WT.${k} missing`); return m[2] !== undefined ? m[2] : Number(m[1]); };
  assert.equal(get('alphabet'), LATER.alphabet);
  for (const k of ['codeLength', 'maxGuests', 'noteMax', 'tickMax']) assert.equal(get(k), LATER[k], `WT.${k}`);
});

test('room codes: 2,000 hosts get 2,000 valid codes (6 characters of the 28), all distinct but a handful at most, none from Math.random', async (t) => {
  const { codes, page } = await hostCodes(html, 2000);
  assert.equal(codes.length, 2000);
  const bad = codes.filter((c) => c.length !== LATER.codeLength || !inAlphabet(c, LATER));
  assert.deepEqual(bad.slice(0, 5), [], `${bad.length} invalid codes`);
  const distinct = new Set(codes).size;
  t.diagnostic(`2000 codes, ${distinct} distinct; crypto.getRandomValues called ${page.crypto} times (typed arrays of ${[...page.sizes].join('/')} elements); Math.random called ${page.random} times`);
  assert.ok(distinct >= 1990, `only ${distinct} distinct codes of 2000`);
  assert.equal(page.random, 0, 'Math.random was called');
  assert.ok(page.crypto >= 2000, `crypto.getRandomValues was called ${page.crypto} times for 2000 codes`);
  // every character of the alphabet occurs, about equally often (12,000 draws: 428.6 each; chi-square of 27 degrees of freedom stays far below 90)
  const counts = [...LATER.alphabet].map((ch) => codes.reduce((n, c) => n + [...c].filter((x) => x === ch).length, 0));
  assert.ok(counts.every((n) => n > 0), 'a character of the alphabet never occurs');
  const chi = chiSquare(counts, 12000, 28);
  t.diagnostic(`chi-square of the character counts: ${chi.toFixed(1)} (27 degrees of freedom)`);
  assert.ok(chi < 90, `character counts are not uniform: chi-square ${chi.toFixed(1)}`);
});

test('room codes: every character is equally likely (a byte at or above the largest multiple of 28 is skipped, never folded)', async () => {
  const LIMIT = 256 - (256 % LATER.alphabet.length);
  assert.equal(LIMIT, 252);
  const SEQ = [255, 254, 253, 252, 0, 1, 2, 251, 3, 27, 4, 5, 6, 7, 8, 9];
  let pos = 0;
  const feed = (arr) => { for (let i = 0; i < arr.length; i++) arr[i] = SEQ[pos++ % SEQ.length]; return arr; };
  const page = await loadPage(html, { getRandomValues: feed });
  try {
    const peer = await page.hostStart();
    const want = SEQ.filter((b) => b < LIMIT).slice(0, 6).map((b) => LATER.alphabet[b % 28]).join('');
    assert.equal(want, 'BCD9F9');
    assert.equal(codeOf(peer), want, 'the first code must be made of the first six bytes below 252 only');
  } finally { page.close(); }
});

test('room codes: with no usable crypto.getRandomValues no session starts, a message says so, and Math.random is not used instead', async () => {
  const stuck = (arr) => { arr.fill(255); return arr; };    // a source that only ever gives bytes the code cannot use must not hang the page
  for (const [label, opts] of [['no crypto object', { noCrypto: true }], ['getRandomValues throws', { getRandomValues: () => { throw new Error('no entropy'); } }], ['a source of 255 only', { getRandomValues: stuck }]]) {
    const page = await loadPage(html, opts);
    try {
      await page.hostStart();
      assert.equal(page.peers.length, 0, `${label}: a Peer was made`);
      assert.match(page.status().text, /could not make a safe session code/, `${label}: status "${page.status().text}"`);
      assert.match(page.status().cls, /\berror\b/, `${label}: status class "${page.status().cls}"`);
      assert.equal(page.mathRandomCalls(), 0, `${label}: Math.random was called`);
    } finally { page.close(); }
  }
});

// ------------------------------------------------------------------------------------------------------------- (2) host cap
test('host cap: of 25 incoming connections the first 20 are kept and 21..25 are closed and never added to the list', async () => {
  const page = await loadPage(html, { allowMathRandom: true });
  try {
    page.mapLoaded();
    const peer = await page.hostOpen();
    assert.equal(page.status().text, 'hosting · 0 connected');
    assert.equal(page.el('sync-code').textContent, codeOf(peer), 'the code on the page is the code of the peer');
    const conns = range(25).map((i) => new FakeConn(`guest-${i + 1}`));
    for (const c of conns) peer.emit('connection', c);
    for (const c of conns) c.emit('open');     // even a connection that was closed could still report open: the host must not talk to it
    const kept = conns.slice(0, 20), refused = conns.slice(20);
    assert.deepEqual(kept.map((c) => c.closeCalls), kept.map(() => 0), 'a connection among the first 20 was closed');
    assert.deepEqual(refused.map((c) => c.closeCalls), refused.map(() => 1), 'connections 21..25 must each be closed exactly once');
    assert.deepEqual(refused.map((c) => c.onCalls), refused.map(() => 0), 'a refused connection was given handlers, so it was added');
    assert.equal(page.status().text, 'hosting · 20 connected');
    page.addStop(100, 'Cap check');
    assert.deepEqual(kept.map((c) => c.sent.length), kept.map(() => 1), 'every kept connection gets the host\'s moment');
    assert.deepEqual(refused.map((c) => c.sent.length), refused.map(() => 0), 'a refused connection was sent something');
  } finally { page.close(); }
});

test('host cap: the cap counts live connections: a closed one frees its place, the 21st live one is still refused', async () => {
  const page = await loadPage(html, { allowMathRandom: true });
  try {
    const peer = await page.hostOpen();
    const conns = range(20).map((i) => new FakeConn(`guest-${i + 1}`));
    for (const c of conns) { peer.emit('connection', c); c.emit('open'); }
    assert.equal(page.status().text, 'hosting · 20 connected');
    conns[0].emit('close');
    assert.equal(page.status().text, 'hosting · 19 connected');
    const extra = new FakeConn('guest-21'); peer.emit('connection', extra); extra.emit('open');
    assert.equal(extra.closeCalls, 0, 'a free place was refused');
    assert.equal(page.status().text, 'hosting · 20 connected');
    const over = new FakeConn('guest-22'); peer.emit('connection', over); over.emit('open');
    assert.equal(over.closeCalls, 1, 'a connection over the cap was kept');
    assert.equal(page.status().text, 'hosting · 20 connected');
  } finally { page.close(); }
});

// ------------------------------------------------------------------------------------------------------------- (3) guest messages
test('guest: the 20 fuzz payloads never reach goToTick and none makes the handler throw', async () => {
  assert.equal(FUZZ_20.length, 20);
  const { page, conn } = await guestPage(html);
  try {
    const first = send(page, conn, VALID[0].expr);
    assert.ok(first.reached, 'a valid message does not reach goToTick: the observation would prove nothing');
    const problems = [];
    for (const f of FUZZ_20) {
      const r = send(page, conn, f.expr);
      if (r.threw) problems.push(`${f.id} ${f.what}: the handler threw ${r.threw.message}`);
      else if (r.reached) problems.push(`${f.id} ${f.what}: reached goToTick (${JSON.stringify(r.shown).slice(0, 100)})`);
    }
    assert.deepEqual(problems, [], `${problems.length} of 20 payloads got through`);
  } finally { page.close(); }
});

test('guest: forty further malformed shapes never reach goToTick either', async () => {
  assert.equal(FUZZ_MORE.length, 40);
  const { page, conn } = await guestPage(html);
  try {
    const problems = [];
    for (const f of FUZZ_MORE) {
      const r = send(page, conn, f.expr);
      if (r.threw) problems.push(`${f.id} ${f.what}: the handler threw ${r.threw.message}`);
      else if (r.reached) problems.push(`${f.id} ${f.what}: reached goToTick (${JSON.stringify(r.shown).slice(0, 100)})`);
    }
    assert.deepEqual(problems, [], `${problems.length} of 40 shapes got through`);
  } finally { page.close(); }
});

test('guest: a valid message reaches goToTick with its moment and its note (control characters stripped), shown as text only', async () => {
  const { page, conn } = await guestPage(html);
  try {
    const problems = [];
    for (const v of VALID) {
      const r = send(page, conn, v.expr);
      if (r.threw) { problems.push(`${v.id} ${v.what}: threw ${r.threw.message}`); continue; }
      if (!r.reached) { problems.push(`${v.id} ${v.what}: did not reach goToTick`); continue; }
      if (r.shown.tick !== v.tick) problems.push(`${v.id} ${v.what}: moment ${r.shown.tick}, wanted ${v.tick}`);
      if (FUNNY.test(r.shown.caption)) problems.push(`${v.id} ${v.what}: a control character is in the caption`);
      if (v.note && !r.shown.caption.endsWith(v.note)) problems.push(`${v.id} ${v.what}: caption "${r.shown.caption.slice(0, 60)}" does not end with the note`);
    }
    assert.deepEqual(problems, []);
    // text only: nothing the page wrote with innerHTML holds a note
    const notes = VALID.map((v) => v.note).filter((n) => n.length > 4);
    for (const el of page.elements()) for (const h of el.htmlLog) for (const n of notes) assert.ok(!h.includes(n), `a note was written with innerHTML into #${el.id}`);
    assert.ok(page.el('caption-bar').htmlLog.length === 0, 'the caption bar was written with innerHTML');
  } finally { page.close(); }
});

test('guest: a note of 280 characters is accepted and one of 281 is not; moments 1 and 675 are accepted, 0 and 676 are not', async () => {
  const { page, conn } = await guestPage(html);
  try {
    const ok = (expr) => send(page, conn, expr).reached;
    assert.ok(ok("{ type: 'goto', tick: 1, note: 'x'.repeat(280) }"), '1 / 280');
    assert.ok(ok("{ type: 'goto', tick: 675, note: 'x'.repeat(280) }"), '675 / 280');
    assert.ok(!ok("{ type: 'goto', tick: 5, note: 'x'.repeat(281) }"), '281 characters');
    assert.ok(!ok("{ type: 'goto', tick: 0, note: '' }"), 'moment 0');
    assert.ok(!ok("{ type: 'goto', tick: 676, note: '' }"), 'moment 676');
  } finally { page.close(); }
});

test('guest: a rejected message leaves the moment on the screen as it was', async () => {
  const { page, conn } = await guestPage(html);
  try {
    assert.ok(send(page, conn, "{ type: 'goto', tick: 42, note: 'stays' }").reached);
    const shown = page.lastShown();
    for (const f of [...FUZZ_20, ...FUZZ_MORE].slice(0, 30)) send(page, conn, f.expr);
    assert.deepEqual(page.lastShown(), shown);
  } finally { page.close(); }
});

test('host to guest: what the host sends passes the guests check (a note that starts a tag goes out empty; the late joiner gets the current moment)', async () => {
  const host = await loadPage(html, { allowMathRandom: true });
  const { page: guest, conn: gconn } = await guestPage(html);
  try {
    host.mapLoaded();
    const peer = await host.hostOpen();
    const c1 = new FakeConn('guest-1'); peer.emit('connection', c1); c1.emit('open');
    host.addStop(5, 'a plain note');
    host.addStop(6, '<b>bold</b> and <img src=x onerror=alert(1)>');
    host.addStop(7, '');
    host.addStop(8, 'x'.repeat(400));
    const c2 = new FakeConn('guest-2'); peer.emit('connection', c2); c2.emit('open');
    const wire = [...c1.sent, ...c2.sent].map((m) => JSON.stringify(m));
    assert.equal(c1.sent.length, 4);
    assert.equal(c2.sent.length, 1, 'the late joiner gets the current moment once');
    assert.deepEqual(c1.sent.map((m) => m.tick), [5, 6, 7, 8]);
    assert.equal(c1.sent[0].note, 'a plain note');
    assert.equal(c1.sent[1].note, '', 'a note that starts a tag must not be sent');
    assert.equal(c1.sent[3].note.length, 280, 'a note of 280 characters is sent whole');
    for (const w of wire) {
      const r = send(guest, gconn, w);       // the JSON text is evaluated in the guest realm: it is what a wire message is
      assert.ok(r.reached && !r.threw, `a message of the host did not reach goToTick: ${w.slice(0, 80)}`);
    }
  } finally { host.close(); guest.close(); }
});

// ------------------------------------------------------------------------------------------------------------- (4) length 6 everywhere
test('code length: the join input takes 6 characters and says so; nothing in the page still says or enforces 5', () => {
  const tag = staticTag(html, 'join-code');
  assert.match(tag, /maxlength="6"/, tag);
  assert.match(tag, /placeholder="Enter 6-character code"/, tag);
  assert.ok(!/maxlength="5"/.test(html), 'maxlength="5" is still in the page');
  assert.ok(!/5-letter|five-letter|5 letter/i.test(html), 'the page still speaks of a 5-letter code');
  const src = liveSyncScript(html);
  assert.ok(!/code\.length !== 5/.test(src), 'the join check still enforces 5');
  assert.ok(!/i < 5; i\+\+/.test(src), 'the generator loop still counts to 5');
  assert.match(src, /code\.length !== WT\.codeLength/);
});

test('code length: the Live Sync sentence names the 6-character code and no longer says "in real time"', () => {
  const m = /<div class="status-note today">([\s\S]*?)<\/div>/.exec(html);
  assert.ok(m, 'the Live Sync sentence block is missing');
  const text = m[1].replace(/<[^>]+>/g, '').replace(/&#10003;/g, '').replace(/\s+/g, ' ');
  assert.match(text, /shares a 6-character code; anyone who enters it sees the same moment move on their own screen/);
  assert.doesNotMatch(text, /real[- ]time/i);
  assert.doesNotMatch(text, /5-letter/);
});

test('code length: a code of 5 is refused with the 6-character message and starts nothing; a typed code of 6 (lower case, padded) joins gtbg-wt-<CODE>', async () => {
  const page = await loadPage(html);
  try {
    for (const bad of ['ABCDE', 'BCDFGHJ', '', '     ']) {
      await page.join(bad);
      assert.equal(page.peers.length, 0, `"${bad}": a Peer was made`);
      assert.equal(page.status().text, 'enter the 6-character code first', `"${bad}"`);
      assert.match(page.status().cls, /\berror\b/);
    }
    const peer = await page.join('  bcdfgh ');
    assert.ok(peer, 'a code of 6 was refused');
    assert.equal(page.status().text, 'connecting…');
    peer.emit('open', 'guest-id');
    assert.deepEqual(peer.connectCalls.map((c) => c[0]), ['gtbg-wt-BCDFGH']);
  } finally { page.close(); }
});

// ------------------------------------------------------------------------------------------------------------- copy and group
test('copy: the group adds no finding of any rule that applies to this page and the REALTIME hit of the Live Sync sentence is gone', () => {
  const rules = 'REALTIME,TICK,UNDEFINED,WE,DASH,QUOTES,EMOJI,NAME,TODO,IDLEAK,DEVLOG,AIPERSONA,CLAIM';
  const counts = (file) => {
    const r = cp.spawnSync(process.execPath, ['tools/copy/copy_lint.mjs', file, '--no-baseline', '--json', '--rules', rules], { cwd: REPO, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    const j = JSON.parse(r.stdout);
    return j.counts;
  };
  const base = counts(path.join(tree.baseDir, PAGE));
  const now = counts(tree.file(PAGE));
  for (const rule of rules.split(',')) assert.ok(now[rule] <= base[rule], `${rule}: ${now[rule]} findings against ${base[rule]} on release/R1g/dist`);
  assert.ok(now.REALTIME <= base.REALTIME - 1, `REALTIME: ${now.REALTIME} against ${base.REALTIME}: the hit of the Live Sync sentence must be gone`);
});

test('group: group.json is what gen.mjs writes and each of its anchors is found once in release/R1g/dist', () => {
  const r = cp.spawnSync(process.execPath, [path.join(REPO, 'candidates', 'r1h', 'wp-infra-28b', 'gen.mjs'), '--check'], { cwd: REPO, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test('group: the earlier parameter set (31 characters, notes of 140) stays selectable: gen.mjs --set earlier gives a group that applies and behaves by its constants', async () => {
  assert.ok(tree.patched, 'the tree under test is the untouched R1g tree: there is no group to take the sets from');
  fs.mkdirSync(SCRATCH, { recursive: true });
  const groupEarlier = path.join(SCRATCH, 'group-earlier.json');
  const outDir = path.join(SCRATCH, 'earlier');
  const report = path.join(SCRATCH, 'report-earlier.json');
  try {
    let r = cp.spawnSync(process.execPath, [path.join(REPO, 'candidates', 'r1h', 'wp-infra-28b', 'gen.mjs'), '--set', 'earlier', '--out', path.relative(REPO, groupEarlier)], { cwd: REPO, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    r = cp.spawnSync('python3', ['candidates/r1h/_lib/apply_group.py', 'wp-infra-28b', '--base', path.relative(REPO, tree.baseDir), '--group', path.relative(REPO, groupEarlier),
      '--out', path.relative(REPO, outDir), '--report', path.relative(REPO, report)], { cwd: REPO, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const rep = JSON.parse(fs.readFileSync(report, 'utf8'));
    assert.ok(rep.ok && rep.patches === 9, `the earlier set's group applies with every anchor asserted: ${JSON.stringify(rep.failed)}`);
    const earlierHtml = fs.readFileSync(path.join(outDir, PAGE), 'utf8');
    const block = /const WT = \{([\s\S]*?)\n  \};/.exec(liveSyncScript(earlierHtml))[1];
    assert.ok(block.includes(`'${EARLIER.alphabet}'`), 'the 31-character alphabet is not in the page');
    assert.match(block, /noteMax: 140\b/);
    // behaviour by the constants of the earlier set: codes of its alphabet, every character used, notes of 140
    const { codes } = await hostCodes(earlierHtml, 300);
    assert.ok(codes.every((c) => c.length === 6 && inAlphabet(c, EARLIER)), 'a code is outside the 31-character alphabet');
    assert.equal(new Set(codes.join('')).size, 31, 'not every character of the 31-character alphabet was drawn');
    const { page, conn } = await guestPage(earlierHtml);
    try {
      assert.ok(send(page, conn, "{ type: 'goto', tick: 5, note: 'x'.repeat(140) }").reached, 'a note of 140');
      assert.ok(!send(page, conn, "{ type: 'goto', tick: 5, note: 'x'.repeat(141) }").reached, 'a note of 141');
    } finally { page.close(); }
    // and the host of that set cuts a longer note of its own to what its guests accept
    const host = await loadPage(earlierHtml);
    try {
      const peer = await host.hostOpen();
      const c = new FakeConn('guest-1'); peer.emit('connection', c); c.emit('open');
      host.addStop(9, 'y'.repeat(200));
      assert.equal(c.sent.length, 1);
      assert.equal(c.sent[0].note.length, 140, 'the note is cut to 140 for the guests of the earlier set');
    } finally { host.close(); }
  } finally { fs.rmSync(groupEarlier, { force: true }); fs.rmSync(report, { force: true }); fs.rmSync(outDir, { recursive: true, force: true }); }
});

test('page: every inline script parses with acorn, the parser of the build gate (tools/t0/gate.mjs: ecmaVersion latest, script)', () => {
  const scripts = inlineScripts(html);
  assert.ok(scripts.length >= 4);
  for (const s of scripts) assert.doesNotThrow(() => acorn.parse(s.body, { ecmaVersion: 'latest', sourceType: 'script' }), `an inline script does not parse: ${s.body.slice(0, 60)}`);
});

test('page: the page still parses and builds its Live Sync controls (the unchanged parts are not disturbed)', async () => {
  assert.equal(inlineScripts(html).filter((s) => /function withPeerJs\(/.test(s.body)).length, 1);
  const page = await loadPage(html, { allowMathRandom: true });
  try {
    page.mapLoaded();
    assert.equal(page.maps.length, 1);
    assert.ok(page.unitsSource(), 'the units layer source was not made on load');
    page.addStop(226, 'Second day begins');
    assert.equal(page.lastShown().tick, 226);
    assert.equal(page.el('stop-count').textContent, '1');
  } finally { page.close(); }
});

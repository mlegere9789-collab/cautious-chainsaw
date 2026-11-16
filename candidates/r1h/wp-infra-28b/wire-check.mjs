// The messages of the page, through the REAL serializer of the PeerJS file that the page pins (peerjs@1.5.4, SRI of the page).
//
//   node candidates/r1h/wp-infra-28b/wire-check.mjs [--tree tmp/r1h-cand/wp-infra-28b/green] [--out candidates/r1h/wp-infra-28b/evidence/wire-check.json]
//
// Why: the guest handler accepts only a plain object whose prototype is Object.prototype or null.  test.mjs hands it objects built in its own
// realm; this script hands it what PeerJS's own unpack makes (binary serialization, the library default), so that a check which is too strict
// for real messages, or too lax for a hostile one, cannot hide behind the fake.  It fetches the pinned file once (cdn.jsdelivr.net, one request),
// verifies it against the sha384 pin written in the page, and keeps it under tmp/ (deleted by the caller).  A failed fetch is reported as failed.
//   host page --hostMessage--> real pack (host realm) --bytes--> real unpack (guest realm) --> guest handler --> goToTick
//   the payloads of fuzz.mjs that the serializer can carry --> real pack --> real unpack --> guest handler: it must agree with an independent
//   reference of the rule (written below); a payload that the serializer itself turns into a plain valid message (a class instance, a symbol
//   key, a non-enumerable key) is valid after the wire and is listed as such, the others must not reach goToTick
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import cp from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { openTree, REPO } from '../_lib/tree.mjs';
import { loadPage, FakeConn } from './page-vm.mjs';
import { FUZZ_20, FUZZ_MORE, VALID } from './fuzz.mjs';

const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const OUT = path.resolve(REPO, opt('--out', 'candidates/r1h/wp-infra-28b/evidence/wire-check.json'));
const CACHE = path.join(REPO, 'tmp', 'r1h-cand', 'wp-infra-28b', 'peerjs-min', 'peerjs.min.js');
const tree = openTree({ tree: opt('--tree', 'tmp/r1h-cand/wp-infra-28b/green') });
const html = tree.text('watch-together.html');

const pin = /PEERJS_SRC = '([^']+)'/.exec(html)?.[1], sri = /PEERJS_SRI = '(sha384-[^']+)'/.exec(html)?.[1];
if (!pin || !sri) { console.error('the page has no PEERJS_SRC / PEERJS_SRI'); process.exit(2); }
if (!fs.existsSync(CACHE)) {
  fs.mkdirSync(path.dirname(CACHE), { recursive: true });
  const r = cp.spawnSync('curl', ['-sS', '-m', '60', '-o', CACHE, '-w', '%{http_code}', pin], { encoding: 'utf8' });
  if (r.status !== 0 || r.stdout.trim() !== '200') { console.error(`fetch of ${pin} FAILED: ${r.stdout} ${r.stderr}`); fs.rmSync(CACHE, { force: true }); process.exit(3); }
}
const lib = fs.readFileSync(CACHE);
const actual = 'sha384-' + crypto.createHash('sha384').update(lib).digest('base64');
if (actual !== sri) { console.error(`the file does not match the SRI pin of the page: ${actual} against ${sri}`); process.exit(3); }

const extras = { TextEncoder, TextDecoder, location: { protocol: 'https:' } };
const opts = { allowMathRandom: true, preload: [{ code: lib.toString('utf8'), filename: 'peerjs.min.js' }], sandbox: extras };
const results = { when: new Date().toISOString(), library: pin, sri, sriMatches: true, tree: path.relative(REPO, tree.treeDir || tree.baseDir), hostToGuest: [], hostile: [], problems: [] };
const problem = (m) => { results.problems.push(m); console.log('  PROBLEM ' + m); };

// ---- host page: what it sends
const host = await loadPage(html, opts);
host.mapLoaded();
const peer = await host.hostOpen();
const c1 = new FakeConn('guest-1'); peer.emit('connection', c1); c1.emit('open');
const stops = [[5, 'a plain note'], [6, '<b>bold</b> <img src=x onerror=alert(1)>'], [7, ''], [8, 'x'.repeat(400)], [226, 'Spangler’s Spring — 🌿'], [675, 'last moment']];
for (const [t, n] of stops) host.addStop(t, n);
const c2 = new FakeConn('guest-2'); peer.emit('connection', c2); c2.emit('open');   // the late joiner snapshot
const messages = [...c1.sent, ...c2.sent];
const hostUtil = host.build('peerjs.util');

// ---- guest page: with the same library in its realm
const guest = await loadPage(html, opts);
guest.mapLoaded();
const gconn = await guest.joinAs('BCDFGH');
const util = guest.build('peerjs.util');
const viaWire = (obj) => util.unpack(util.pack(obj));
const reach = (payload) => { const before = guest.effects(); gconn.emit('data', payload); return !guest.sameEffects(before, guest.effects()); };
const GUEST_OBJECT_PROTOTYPE = guest.build('Object.prototype');
// an independent statement of the rule (plain object, fields type/tick/note only, goto, integer 1..675, note of at most 280 without a tag opening)
const oracle = (un) => {
  if (un === null || typeof un !== 'object') return false;
  const proto = Object.getPrototypeOf(un);
  if (proto !== GUEST_OBJECT_PROTOTYPE && proto !== null) return false;
  if (Reflect.ownKeys(un).some((k) => !['type', 'tick', 'note'].includes(k))) return false;
  if (un.type !== 'goto' || typeof un.tick !== 'number' || !Number.isInteger(un.tick) || un.tick < 1 || un.tick > 675) return false;
  if (un.note !== undefined && (typeof un.note !== 'string' || un.note.length > 280 || /<[A-Za-z!/?\u0000-\u001f]/.test(un.note))) return false;
  return true;
};

for (const m of messages) {
  let packed, un, proto;
  try { packed = hostUtil.pack(m); un = util.unpack(packed); proto = Object.getPrototypeOf(un); } catch (e) { problem(`host message ${JSON.stringify(m).slice(0, 60)} could not go through pack/unpack: ${e.message}`); continue; }
  const protoOk = proto === guest.build('Object.prototype');
  const ok = reach(un);
  results.hostToGuest.push({ tick: m.tick, noteLength: m.note.length, bytes: packed.byteLength, protoIsObjectPrototype: protoOk, reachedGoToTick: ok, shownTick: ok ? guest.lastShown().tick : null });
  if (!protoOk) problem(`the unpacked host message ${m.tick} has another prototype than Object.prototype`);
  if (!ok) problem(`the host message ${m.tick} did not reach goToTick on the guest`);
  else if (guest.lastShown().tick !== m.tick) problem(`the host message ${m.tick} showed moment ${guest.lastShown().tick}`);
}
if (messages.length !== 7) problem(`expected 7 host messages (6 broadcasts, 1 snapshot), got ${messages.length}`);

// ---- hostile payloads through the same serializer
for (const f of [...FUZZ_20, ...FUZZ_MORE]) {
  let payload;
  try { payload = guest.build(f.expr); } catch (e) { results.hostile.push({ id: f.id, skipped: `the expression could not be built: ${e.message}` }); continue; }
  let un;
  try { un = viaWire(payload); } catch (e) { results.hostile.push({ id: f.id, what: f.what, skipped: `the serializer cannot carry it: ${String(e.message).slice(0, 60)}` }); continue; }
  let reached;
  try { reached = reach(un); } catch (e) { problem(`${f.id} ${f.what}: the handler threw ${e.message}`); continue; }
  const validAfterWire = oracle(un);
  results.hostile.push({ id: f.id, what: f.what, carried: true, validAfterTheWire: validAfterWire, reachedGoToTick: reached });
  if (reached !== validAfterWire) problem(`${f.id} ${f.what}: ${reached ? 'reached' : 'did not reach'} goToTick but the reference says ${validAfterWire ? 'valid' : 'invalid'} after the wire`);
}
// the prototype case is made the way a hostile host makes it on the wire: a key named __proto__ whose value is an object
{
  const wire = viaWire(guest.build(`JSON.parse('{"type":"goto","tick":5,"note":"x","__proto__":{"type":"goto","tick":6,"note":"y"}}')`));
  const protoIsForeign = Object.getPrototypeOf(wire) !== guest.build('Object.prototype') && Object.getPrototypeOf(wire) !== null;
  const reached = reach(wire);
  results.protoKey = { unpackedPrototypeIsForeign: protoIsForeign, ownKeys: Reflect.ownKeys(wire), reachedGoToTick: reached };
  if (!protoIsForeign) problem('unpack no longer gives an object with a foreign prototype for a __proto__ key: this check needs a second look');
  if (reached) problem('a __proto__ key whose value is an object reached goToTick');
}
// the valid ones through the wire
for (const v of VALID) {
  let un;
  try { un = viaWire(guest.build(v.expr)); } catch (e) { results.hostile.push({ id: v.id, what: v.what, valid: true, skipped: `the serializer cannot carry it: ${String(e.message).slice(0, 60)}` }); continue; }
  const ok = reach(un);
  results.hostile.push({ id: v.id, what: v.what, valid: true, reachedGoToTick: ok });
  if (!ok) problem(`${v.id} ${v.what}: a valid message did not reach goToTick after the real serializer`);
  else if (guest.lastShown().tick !== v.tick) problem(`${v.id} ${v.what}: moment ${guest.lastShown().tick}, wanted ${v.tick}`);
}
host.close(); guest.close();

const carried = results.hostile.filter((r) => r.carried).length, skipped = results.hostile.filter((r) => r.skipped && !r.valid).length, validSkipped = results.hostile.filter((r) => r.skipped && r.valid).map((r) => r.id);
const normalized = results.hostile.filter((r) => r.carried && r.validAfterTheWire).map((r) => r.id);
results.summary = { hostMessages: results.hostToGuest.length, hostileCarried: carried, hostileNotCarried: skipped, madeValidByTheSerializer: normalized, valid: VALID.length, validNotCarried: validSkipped };
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(results, null, 1) + '\n');
console.log(`wire check against ${pin} (sha384 pin matches): ${results.hostToGuest.length} host messages through pack/unpack, reached the guest map: ${results.hostToGuest.filter((r) => r.reachedGoToTick).length}; ${carried} of the ${FUZZ_20.length + FUZZ_MORE.length} fuzz payloads are carried by the serializer (${skipped} are not), ${normalized.length} of them (${normalized.join(', ')}) are plain valid messages after the wire, the rest were all refused; ${VALID.length} valid payloads; problems: ${results.problems.length}`);
process.exit(results.problems.length ? 1 : 0);

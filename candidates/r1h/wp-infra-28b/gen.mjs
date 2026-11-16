#!/usr/bin/env node
// Writes candidates/r1h/wp-infra-28b/group.json: the page group PG-r1h-wp-infra-28b for watch-together.html (Live Sync hardening).
//
//   node candidates/r1h/wp-infra-28b/gen.mjs                    write group.json (parameter set "later", the one the delegated row C08 selects)
//   node candidates/r1h/wp-infra-28b/gen.mjs --check            regenerate in memory; fail unless group.json is byte-identical and every anchor
//                                                               is found exactly `expect` times in release/R1g/dist/watch-together.html
//   node candidates/r1h/wp-infra-28b/gen.mjs --set earlier --out tmp/r1h-cand/wp-infra-28b/group-earlier.json
//                                                               the same group with the earlier parameter set (a set other than "later" is
//                                                               only ever written to an explicit --out under tmp/, never over group.json)
//
// Parameter sets (row C08 of docs/decisions/DELEGATED-DECISIONS-MAIN-SITE.md): where the plan gives two sets, the later one that the plan
// itself says supersedes the first is used; the earlier one stays selectable as constants here.  The page carries ONE constant block (WT),
// so a set is a swap of that block, nothing else.
//
// Nine patches, one per place that says or enforces the old behaviour; every anchor is a short exact string of release/R1g/dist and is
// asserted once by the builder's applier.  Anchors stay clear of the text that wp-content-09b (the TICK labels and the other REALTIME hit)
// and wp-seo-04b / wp-seo-11b (head tags, footer mount) change.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(HERE, '..', '..', '..');
export const BASE_PAGE = 'release/R1g/dist/watch-together.html';
export const GROUP_FILE = path.join(HERE, 'group.json');
export const GROUP_NAME = 'PG-r1h-wp-infra-28b';
const ID = (s) => `r1h-wp-infra-28b-${s}`;

export const PARAM_SETS = {
  later: {
    what: 'later set: WP-PAGEC-15 (note of at most 280 characters) and WP-PAGEC-17 (28-character alphabet, about 481 million codes); selected by row C08',
    codeLength: 6,
    alphabet: 'BCDFGHJKMNPQRSTVWXYZ23456789',
    alphabetNote: 'no vowels and none of I, L, O, 0, 1: a code is read aloud without confusion and cannot spell a word',
    maxGuests: 20,
    noteMax: 280,
    tickMax: 675,
  },
  earlier: {
    what: 'earlier set of WP-INFRA-28 Part A: 31-character alphabet (about 887 million codes), note of at most 140 characters; superseded, kept selectable (row C08)',
    codeLength: 6,
    alphabet: 'ABCDEFGHJKMNPQRSTUVWXYZ23456789',
    alphabetNote: 'none of I, L, O, 0, 1 (the plan states the size 31 and the word unambiguous; this is the set of that size without the look-alikes)',
    maxGuests: 20,
    noteMax: 140,
    tickMax: 675,
  },
};

// ---------------------------------------------------------------------------------------------------------------------------------
// The page code that replaces the old randomCode() block (one block: constants, the code generator, the message check, the host message).
// Written with String.raw so every backslash is the one that lands in the page.  {{NAME}} markers are filled from the parameter set below
// and none may remain.  No string literal of this block may hold the word tick or the words undefined, we, our or us (the copy lint reads
// string literals of inline scripts), and no apostrophe or typewriter dash: it is code, not copy.
const CORE = String.raw`  // Live Sync limits, in one place so that a whole parameter set can be swapped.
  const WT = {
    codeLength: {{CODE_LENGTH}},
    // {{ALPHABET_LEN}} characters; {{ALPHABET_NOTE}}
    alphabet: '{{ALPHABET}}',
    // connections a host keeps; a further one is closed at once and never kept
    maxGuests: {{MAX_GUESTS}},
    // longest note (in characters) a guest accepts
    noteMax: {{NOTE_MAX}},
    // last moment number
    tickMax: {{TICK_MAX}}
  };
  const WT_FIELDS = { type: 1, tick: 1, note: 1 };   // the only fields a message from the host may carry

  // A session code names a peer on a public broker, so it must not be guessable: every character comes from crypto.getRandomValues, and
  // bytes at or above the largest multiple of the alphabet size are skipped, so every character is equally likely.  There is no fallback:
  // a browser without crypto.getRandomValues starts no session.
  function randomCode() {
    const chars = WT.alphabet;
    const limit = 256 - (256 % chars.length);
    const bytes = new Uint8Array(32);
    let s = '';
    for (let round = 0; s.length < WT.codeLength; round++) {
      if (round >= 16) throw new Error('no usable random bytes');   // a broken source cannot hang the page
      crypto.getRandomValues(bytes);
      for (let i = 0; i < bytes.length && s.length < WT.codeLength; i++) if (bytes[i] < limit) s += chars[bytes[i] % chars.length];
    }
    return s;
  }

  // A message from the host is untrusted data.  Only a plain object { type: 'goto', tick: integer 1..{{TICK_MAX}}, note: text } is accepted: the
  // note has at most {{NOTE_MAX}} characters and does not start a tag (a < followed by a letter, !, /, ? or a control character).  The result is
  // a new object built from the checked values (control characters of the note become spaces).  Everything else (null, arrays,
  // strings, buffers, extra or inherited fields, wrong types, numbers out of range, oversized text, markup) is dropped at once.
  function parseGoto(data) {
    try {
      if (data === null || typeof data !== 'object') return null;
      const proto = Object.getPrototypeOf(data);
      if (proto !== Object.prototype && proto !== null) return null;
      for (const key of Reflect.ownKeys(data)) if (!Object.prototype.hasOwnProperty.call(WT_FIELDS, key)) return null;
      const type = data.type, tick = data.tick, note = data.note;
      if (type !== 'goto') return null;
      if (typeof tick !== 'number' || !Number.isInteger(tick) || tick < 1 || tick > WT.tickMax) return null;
      let text = '';
      if (note !== undefined) {
        if (typeof note !== 'string' || note.length > WT.noteMax || /<[A-Za-z!\/?\u0000-\u001f]/.test(note)) return null;
        text = note.replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ').trim();
      }
      return { type: 'goto', tick, note: text };
    } catch (e) { return null; }
  }

  // What the host sends has to pass the same check on the guests' side: a note that a guest would drop (it starts a tag) goes out as an
  // empty note, so the guests still follow the host to the moment.
  function hostMessage(tick, note) {
    return parseGoto({ type: 'goto', tick, note: typeof note === 'string' ? note : '' }) || { type: 'goto', tick, note: '' };
  }
`;

// ---------------------------------------------------------------------------------------------------------------------------------
// Anchors (release/R1g/dist/watch-together.html) and what replaces them.  `find` is exact text of the R1g page, LF line ends.
const PATCHES = (P) => {
  const fill = (s) => s
    .replaceAll('{{CODE_LENGTH}}', String(P.codeLength))
    .replaceAll('{{ALPHABET}}', P.alphabet)
    .replaceAll('{{ALPHABET_LEN}}', String(P.alphabet.length))
    .replaceAll('{{ALPHABET_NOTE}}', P.alphabetNote)
    .replaceAll('{{MAX_GUESTS}}', String(P.maxGuests))
    .replaceAll('{{NOTE_MAX}}', String(P.noteMax))
    .replaceAll('{{TICK_MAX}}', String(P.tickMax));
  return [
    {
      id: ID('sentence'), target: 'watch-together.html',
      find: 'shares a 5-letter code; anyone who enters it sees the same moment move on their own screen in real time.',
      repl: fill('shares a {{CODE_LENGTH}}-character code; anyone who enters it sees the same moment move on their own screen as the host plays or jumps.'),
      expect: 1,
      note: 'Live Sync sentence (line 126): the code length, and "in real time" goes (REALTIME hit of line 126). The other REALTIME hit (the span after "Share this code") is wp-content-09b.',
    },
    {
      id: ID('join-input'), target: 'watch-together.html',
      find: 'placeholder="Enter a 5-letter code" maxlength="5"',
      repl: fill('placeholder="Enter a {{CODE_LENGTH}}-character code" maxlength="{{CODE_LENGTH}}"'),
      expect: 1,
      note: 'join input (line 160): a code of the new length can be typed',
    },
    {
      id: ID('core'), target: 'watch-together.html',
      find: [
        '  function randomCode() {',
        "    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I/O to avoid confusion with 1/0",
        "    let s = '';",
        '    for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)];',
        '    return s;',
        '  }',
        '',
      ].join('\n'),
      repl: fill(CORE),
      expect: 1,
      note: 'randomCode (lines 298-303): constants, crypto.getRandomValues code, message check parseGoto, host message hostMessage',
    },
    {
      id: ID('broadcast'), target: 'watch-together.html',
      find: "connections.forEach(c => { if (c.open) { try { c.send({ type: 'goto', tick, note }); } catch (e) {} } });",
      repl: "connections.forEach(c => { if (c.open) { try { c.send(hostMessage(tick, note)); } catch (e) {} } });",
      expect: 1,
      note: 'host broadcast (line 295): the message goes through hostMessage',
    },
    {
      id: ID('host-code'), target: 'watch-together.html',
      find: '    const code = randomCode();\n',
      repl: "    let code;\n    try { code = randomCode(); } catch (e) { setSyncStatus('could not make a safe session code in this browser', 'error'); return; }\n",
      expect: 1,
      note: 'startHost (line 346): without crypto.getRandomValues no session starts and the status says so',
    },
    {
      id: ID('host-cap'), target: 'watch-together.html',
      find: "    peer.on('connection', (conn) => {\n      connections.push(conn);\n",
      repl: "    peer.on('connection', (conn) => {\n      if (connections.length >= WT.maxGuests) { try { conn.close(); } catch (e) {} return; }   // full: closed at once, never kept\n      connections.push(conn);\n",
      expect: 1,
      note: 'host connection cap (lines 354-355): connections beyond maxGuests are closed and never added to the list',
    },
    {
      id: ID('host-snapshot'), target: 'watch-together.html',
      find: "if (currentTick != null) conn.send({ type: 'goto', tick: currentTick, note: currentNote });",
      repl: 'if (currentTick != null) conn.send(hostMessage(currentTick, currentNote));',
      expect: 1,
      note: 'late joiner snapshot (line 358): same message check as the broadcast',
    },
    {
      id: ID('join-check'), target: 'watch-together.html',
      find: "    if (code.length !== 5) { setSyncStatus('enter the 5-letter code first', 'error'); return; }\n",
      repl: "    if (code.length !== WT.codeLength) { setSyncStatus('enter the ' + WT.codeLength + '-character code first', 'error'); return; }\n",
      expect: 1,
      note: 'join check (line 370): the code length and its message',
    },
    {
      id: ID('guest-data'), target: 'watch-together.html',
      find: "      conn.on('data', (data) => {\n        if (data && data.type === 'goto') goToTick(data.tick, data.note, true);\n      });\n",
      repl: "      conn.on('data', (data) => {\n        const msg = parseGoto(data);   // untrusted: only a checked { goto, tick, note } reaches the map\n        if (msg) goToTick(msg.tick, msg.note, true);\n      });\n",
      expect: 1,
      note: 'guest handler (lines 384-386): conn.on("data") passes only a validated message to goToTick',
    },
  ];
};

export function buildGroup(setName = 'later') {
  const P = PARAM_SETS[setName];
  if (!P) throw new Error(`unknown parameter set ${setName}; known: ${Object.keys(PARAM_SETS).join(', ')}`);
  const patches = PATCHES(P);
  for (const p of patches) {
    for (const k of ['find', 'repl']) if (/\{\{[A-Z_]+\}\}/.test(p[k])) throw new Error(`${p.id}: unfilled {{marker}} in ${k}`);
  }
  return {
    group: GROUP_NAME,
    train: 'R1h',
    optional: true,
    description: `Watch Together Live Sync hardening (WP-INFRA-28 Part A, backlog wp-infra-28b): unguessable room codes (${P.codeLength} characters of a ${P.alphabet.length}-character alphabet from crypto.getRandomValues), a cap of ${P.maxGuests} connections on the host, and a check of every message a guest receives (only goto, an integer moment 1..${P.tickMax}, a note of at most ${P.noteMax} characters). Parameter set: ${P.what}.`,
    patches,
  };
}

export const render = (g) => JSON.stringify(g, null, 1) + '\n';

function check() {
  const problems = [];
  const want = render(buildGroup('later'));
  let have = '';
  try { have = fs.readFileSync(GROUP_FILE, 'utf8'); } catch { problems.push('group.json is missing'); }
  if (have && have !== want) problems.push('group.json differs from what gen.mjs writes: run node candidates/r1h/wp-infra-28b/gen.mjs');
  const page = fs.readFileSync(path.join(REPO, BASE_PAGE), 'utf8');
  for (const p of buildGroup('later').patches) {
    const n = page.split(p.find).length - 1;
    if (n !== p.expect) problems.push(`${p.id}: anchor found ${n} times in ${BASE_PAGE}, expected ${p.expect}`);
  }
  // the anchors must not overlap each other (each one is counted against the text the earlier ones left)
  const spans = buildGroup('later').patches.map((p) => { const i = page.indexOf(p.find); return { id: p.id, a: i, b: i + p.find.length }; }).sort((x, y) => x.a - y.a);
  for (let i = 1; i < spans.length; i++) if (spans[i].a < spans[i - 1].b) problems.push(`anchors overlap: ${spans[i - 1].id} and ${spans[i].id}`);
  return problems;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
  if (argv.includes('--check')) {
    const problems = check();
    if (problems.length) { console.error(problems.map((x) => '  ' + x).join('\n')); console.error(`gen.mjs --check: ${problems.length} problem(s)`); process.exit(1); }
    console.log(`gen.mjs --check: group.json is what gen.mjs writes; ${buildGroup('later').patches.length} anchors found once each in ${BASE_PAGE}, none overlapping`);
    process.exit(0);
  }
  const setName = opt('--set', 'later');
  const out = opt('--out', null);
  if (setName !== 'later' && !out) { console.error('a parameter set other than "later" is written only to an explicit --out (never over group.json)'); process.exit(2); }
  const target = out ? path.resolve(REPO, out) : GROUP_FILE;
  if (out && !target.startsWith(path.join(REPO, 'tmp') + path.sep) && target !== GROUP_FILE) { console.error('--out must be under tmp/'); process.exit(2); }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, render(buildGroup(setName)));
  console.log(`wrote ${path.relative(REPO, target)} (parameter set ${setName}, ${buildGroup(setName).patches.length} patches)`);
}

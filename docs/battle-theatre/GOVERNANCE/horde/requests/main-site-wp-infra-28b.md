# Request from main-site: bring the Watch Together specs in step with the Live Sync hardening group (wp-infra-28b)

Workstream: main-site (item wp-infra-28b, "Watch Together hardening: unguessable room codes, connection cap, guest message validation"). Target owner: the release workstream, because `tests/t0/**` and `tools/t0/**` are outside the main-site ownership. The group itself is finished and proved in `candidates/r1h/wp-infra-28b/` (see its `HANDOFF.md` and `STATUS.json`); this note asks for the two things that only the release workstream can do: change two existing specs that pin the old 5-character code, and add three browser cases to `tests/t0/wtpeer.spec.mjs`. **The group is not to be registered in a train before those spec changes are in place and the new cases have run** (the backlog entry says so, and without the changes T0-WTP-01, T0-WTP-03 and PG-05b of the existing suites fail on a train that holds the group).

What the group changes in `watch-together.html` (nine anchors, all on text of `release/R1g/dist`, each found once): the room code is 6 characters of the 28-character alphabet `BCDFGHJKMNPQRSTVWXYZ23456789` drawn with `crypto.getRandomValues` (no `Math.random` is left in the page script; no fallback: a browser without it starts no session and the status says so); a host keeps at most 20 connections and closes the 21st and later at once (`conn.close()`, never added to the list); the guest handler (`conn.on('data')`) passes to `goToTick` only a plain object `{type: 'goto', tick: integer 1..675, note: text of at most 280 characters, control characters stripped}`, built from checked values, everything else dropped; the host sends the same shape (a note that starts a tag goes out empty, so guests still follow); the join input, the join check and the Live Sync sentence say and enforce 6 characters, and the sentence no longer says "in real time".

## 1. Two existing specs pin the old code length: change these four lines (they fail with the group until then)

| File and line | Now | Change to |
|---|---|---|
| `tests/t0/wtpeer.spec.mjs:69` (T0-WTP-01) | `s.code.length === 5` | `s.code.length === 6` |
| `tests/t0/wtpeer.spec.mjs:110` (T0-WTP-03) | `document.getElementById('join-code').value = 'ABCDE'` | `'BCDFGH'` (a code of the new alphabet; any 6 characters pass the join check) |
| `tests/t0/pages-maps.spec.mjs:397` (PG-05b) | `'enter the 5-letter code first'` | `'enter the 6-character code first'` |
| `tests/t0/pages-maps.spec.mjs:398` (PG-05b) | `await page.fill('#join-code', 'abcde');` | `await page.fill('#join-code', 'bcdfgh');` |

Line 395 of the same spec (`fill('#join-code', 'ab')`) stays: two characters are short on either length. No other file under `tests` pins the code length (searched on 2026-11-16 over `tests`, `tools/t0`, `tools/accept`, `tools/ship` and `tools/horde`: `grep -rIn "5-letter\|ABCDE\|abcde\|enter the 5\|Enter a 5"`); `tools/t0/assets-src/gen_pg_maps.mjs` and `tools/t0/patches/PG-maps.json` still hold `code.length !== 5`, and they stay as they are: they build the R1g text that this group patches on top of. The placeholder is now "Enter 6-character code" with `maxlength="6"` (shorter than "Enter a 6-character code" on purpose: at 14 px that text is as wide as the 174 px content box of the input in the widest font measured, DejaVu Sans, so it would touch the edge).

## 2. Three new cases for `tests/t0/wtpeer.spec.mjs` (T0-WTP-05 to 07)

The stub of that spec needs two changes (the stub is an init script that defines `window.Peer`): `connect()` must return a recording connection, and a connection class must be available to the cases. Replace the `connect()` line of the class and add `__Conn` (nothing else of the stub changes):

```js
  window.__Conn = class {
    constructor(p) { this.peer = p; this.h = {}; this.open = false; this.sent = []; this.closed = 0; this.ons = 0; }
    on(e, f) { this.ons++; (this.h[e] = this.h[e] || []).push(f); }
    emit(e, ...a) { if (e === 'open') this.open = true; for (const f of (this.h[e] || []).slice()) f(...a); }
    send(m) { this.sent.push(m); } close() { this.closed++; this.open = false; }
  };
  // in class Peer:   connect(id) { const c = new window.__Conn(id); (this.connects = this.connects || []).push(c); return c; }
```

**T0-WTP-05, the host keeps 20 of 25.** Click `#host-btn`, wait 400 ms, `window.__peers[0].__open()`, then in the page: make 25 `new window.__Conn('guest-' + i)`, `peer.emit('connection', c)` for each, then `c.emit('open')` for each. Expected: `closed` of connections 1..20 is 0 and of 21..25 is 1 (called once, not twice); `ons` (handlers registered) of 21..25 is 0 (they were not added to the list); `#sync-status` reads `hosting · 20 connected`. Then fill `#new-tick` with `100`, click `#add-stop`: every one of connections 1..20 holds exactly one sent message `{type:'goto', tick:100, note:''}` and 21..25 hold none. Then `conns[0].emit('close')` makes the status `hosting · 19 connected`, a 26th connection is kept (`closed` 0) and a 27th is closed. Without the group: connections 21..25 are not closed, so the case fails.

**T0-WTP-06, a guest ignores the 20 payloads and follows a valid message.** Fill `#join-code` with `BCDFGH`, click `#join-btn`, wait for `window.__peers[0]`, `p.emit('open', 'g')`, `p.connects[0].emit('open')`. The 20 payloads below are JavaScript expressions that must be evaluated INSIDE the page (`(0, eval)('(' + expr + ')')`), because a real browser delivers objects of the page's own realm; each is delivered with `p.connects[0].emit('data', payload)`. First deliver a valid message (`{ type: 'goto', tick: 226, note: 'Second day begins' }`) and record `#caption-bar` text. Expected after EACH of the 20: `#caption-bar` text unchanged, `#caption-bar` has no child element, no dialog, no `pageerror`, no console warning or error; expected after the valid message: the caption holds the note as text. Without the group 13 of the 20 move the caption.

| id | payload (expression) |
|---|---|
| F01 | `null` |
| F02 | `[{ type: 'goto', tick: 5, note: 'x' }]` |
| F03 | `'{"type":"goto","tick":5,"note":"x"}'` |
| F04 | `42` |
| F05 | `{ type: 'goto', tick: 5, note: 'x', admin: true }` |
| F06 | `JSON.parse('{"type":"goto","tick":5,"note":"x","__proto__":{"polluted":true}}')` |
| F07 | `{ type: 'goto', tick: 0, note: '' }` |
| F08 | `{ type: 'goto', tick: 676, note: '' }` |
| F09 | `{ type: 'goto', tick: 1.5, note: '' }` |
| F10 | `{ type: 'goto', tick: '5', note: '' }` |
| F11 | `{ type: 'goto', tick: NaN, note: '' }` |
| F12 | `{ type: 'goto', tick: Infinity, note: '' }` |
| F13 | `{ type: 'goto', tick: 5, note: 'x'.repeat(281) }` |
| F14 | `{ type: 'goto', tick: 5, note: '<img src=x onerror=window.__pwn=1>' }` (also check `window.__pwn === undefined` and no `img` in the page) |
| F15 | `{ type: 'goto', tick: { n: 5 }, note: { html: '<b>x</b>' } }` |
| F16 | `'x'.repeat(10 * 1024 * 1024)` |
| F17 | `{ type: 'goto', tick: 5, note: 'a'.repeat(10 * 1024 * 1024) }` |
| F18 | `{ tick: 5, note: 'x' }` |
| F19 | `{ type: 'GOTO', tick: 5, note: 'x' }` |
| F20 | `{ type: 'goto', tick: -5, note: 'x' }` |

The same twenty, with forty more shapes and nine valid messages, are in `candidates/r1h/wp-infra-28b/fuzz.mjs` as `FUZZ_20`, `FUZZ_MORE` and `VALID` (each entry is `{ id, what, expr }`); the spec may import that file or copy the table.

**T0-WTP-07, codes.** Add an init script that counts `crypto.getRandomValues` calls (`const o = crypto.getRandomValues.bind(crypto); window.__rv = 0; crypto.getRandomValues = (a) => { window.__rv++; return o(a); };`). Click `#host-btn` 30 times with 150 ms between clicks (each click retires the previous peer). Expected: 30 peers whose `id` matches `^gtbg-wt-[BCDFGHJKMNPQRSTVWXYZ2-9]{6}$`, 30 distinct ids, `window.__rv >= 30`; and the page's Live Sync script holds no `Math.random` (fetch the page text, take the script that defines `function randomCode`, assert `!/Math\.random/.test(script)`). Without the group the ids have 5 letters from `Math.random`.

## 3. Order of work and what to expect

1. Make the four edits of section 1 and add T0-WTP-05 to 07 and the stub change (one commit with the registration below, because the edited cases fail on a train without the group).
2. Red first: run the edited spec on `release/R1g/dist`, a train without the group: `node tests/t0/wtpeer.spec.mjs --dist release/R1g/dist`. T0-WTP-01, 03, 05, 06 and 07 must fail (05, 06 and 07 for the reasons above, 01 and 03 because the code has 5 characters); T0-WTP-02 passes, because it does not touch the code length. The spec's own `--expect-red` flag is for the PG-zfix proof and needs every browser case red, so it does not fit here: read the per-case result.
3. Register: copy `candidates/r1h/wp-infra-28b/group.json` to `tools/t0/patches/PG-r1h-wp-infra-28b.json` (the file name equals the group name, as the loader requires); the group is `"train": "R1h"` and `"optional": true`, so it enters a train only with `--with PG-r1h-wp-infra-28b` or when the release workstream removes `optional` for R1h. PG groups are applied in file-name order after the bundle groups; the anchors are written against the finished text of `release/R1g/dist` and are disjoint from the text the plan gives to wp-content-09b (the other REALTIME hit and every TICK label), wp-seo-04b (head tags) and wp-seo-11b (footer mount): `candidates/r1h/wp-infra-28b/coordination-check.mjs` checks that and applies every sibling group that is on disk at the time it is run.
4. Full run on the train that holds the group: `node tests/t0/wtpeer.spec.mjs --dist release/R1h/dist` (the real-browser pass that the item names as owed), then `pages-maps.spec.mjs` (PG-05a to 05c) and `pages-core.spec.mjs` (T0-PGC-19 to 21, the stored-tour cases) through the machine lock. Expected `anchors.json` delta: nine rows `r1h-wp-infra-28b-*` of group `PG-r1h-wp-infra-28b`, each expect 1, found 1. No line of the identity file is needed: the group changes no title, description, og or twitter tag, canonical or JSON-LD.

## 4. What was and was not run

Run by main-site (all on `release/R1g/dist` and a scratch tree made from it with the builder's applier, nothing deployed): `candidates/r1h/wp-infra-28b/test.mjs` (the page script in node:vm with a fake DOM and a fake PeerJS: red on R1g, green with the group), a mutation run of that test, the real PeerJS 1.5.4 file (the page's pin, sha384 checked) used as the wire between a host page and a guest page, and one real Chromium pass with stand-ins for Peer and mapboxgl (`browser-check.mjs`). Not run: any real PeerJS traffic between two browsers over the public broker (needs the owner's network and is the owed check), any GPU or timing figure, any train build. The existing specs named above were read, not run.

# wp-infra-28b HANDOFF: Watch Together hardening (room codes, connection cap, guest message validation)

Route: candidate-group, train R1h (cumulative on R1g, release id 52cec836). The group `PG-r1h-wp-infra-28b` changes one shipped file, `watch-together.html`, in nine places. It is `"optional": true` and sits in no train: nothing is registered and nothing is deployed. The group adds no new file, so there is no `overlay/` folder.

## What changed

Nine patches on text of `release/R1g/dist/watch-together.html` (each anchor found once; the builder's own applier asserted all nine):

| Patch id (`r1h-wp-infra-28b-...`) | Lines on R1g | What it does |
|---|---|---|
| `sentence` | 126 | the Live Sync sentence says "a 6-character code" and ends "as the host plays or jumps" instead of "in real time" (the REALTIME hit of line 126 is this group's; the other one, in the span after "Share this code", stays wp-content-09b's) |
| `join-input` | 160 | `placeholder="Enter 6-character code" maxlength="6"` |
| `core` | 298-303 | replaces `randomCode()` with: the constant block `WT` (code length 6, the 28-character alphabet, 20 guests, notes of 280, moments to 675), `randomCode()` from `crypto.getRandomValues`, `parseGoto()` (the message check) and `hostMessage()` (what the host sends) |
| `broadcast` | 295 | the host's broadcast goes through `hostMessage()` |
| `host-code` | 346 | `randomCode()` is called inside try/catch: with no usable `crypto.getRandomValues` no session starts and the status reads "could not make a safe session code in this browser" |
| `host-cap` | 354-355 | a host keeps at most 20 connections; the 21st and later are closed at once (`conn.close()`) and never added to the list |
| `host-snapshot` | 358 | the late joiner's snapshot goes through `hostMessage()` |
| `join-check` | 370 | `code.length !== WT.codeLength` and the message "enter the 6-character code first" |
| `guest-data` | 384-386 | `conn.on('data')` passes to `goToTick` only what `parseGoto()` returns |

Behaviour in short:
- **Codes**: 6 characters of `BCDFGHJKMNPQRSTVWXYZ23456789` (28 characters, no vowel and none of L, 0, 1; 28^6 = 481,890,304 codes), every character from `crypto.getRandomValues` with bytes at or above 252 skipped (no modulo bias), a loop guard (16 rounds of 32 bytes), no fallback. No `Math.random` is left in the page's Live Sync script.
- **Cap**: the 21st and later incoming connections are closed and never kept or given handlers; the cap counts live connections (a closed one frees its place).
- **Guest**: a message is accepted only if it is a plain object (prototype `Object.prototype` or null) whose own fields are among `type`, `tick`, `note`, with `type === 'goto'`, an integer `tick` 1..675 and (if present) a string `note` of at most 280 characters that does not start a tag. `goToTick` is called with values copied from the checked object (control characters of the note become spaces, the note is trimmed). Everything else is dropped without an error. The caption is still written with `textContent` only.
- **Host**: sends the same shape; a note longer than the guests accept is cut, and a note a guest would drop (it starts a tag) goes out as an empty note, so guests still follow the host to the moment.
- **Parameter sets** (delegated row C08): the later set above is shipped. The earlier set of the plan (31 characters, notes of 140) stays selectable: `node candidates/r1h/wp-infra-28b/gen.mjs --set earlier --out tmp/r1h-cand/wp-infra-28b/group-earlier.json` writes its group (a set other than "later" is only written to an explicit `--out` under `tmp/`); `test.mjs` applies that group and checks its behaviour. Only the constant block `WT` differs.

Files in this folder: `group.json` (written by `gen.mjs`, never edited by hand), `gen.mjs`, `test.mjs`, `page-vm.mjs` (the fake page), `fuzz.mjs` (the payloads), `browser-check.mjs`, `wire-check.mjs`, `mutants.mjs`, `coordination-check.mjs`, `evidence/` (their outputs), `STATUS.json` (written by `prove.mjs`, then extended with the notes and evidence below), this file. Request note for files outside this workstream: `docs/battle-theatre/GOVERNANCE/horde/requests/main-site-wp-infra-28b.md`.

## How it was verified

@@VERIFIED@@

## How the release workstream registers it

Nothing goes into a train until the spec changes of the request note are in place (item 1 of the note: four lines in two existing specs, which fail with the group otherwise, and three new cases T0-WTP-05 to 07 in `tests/t0/wtpeer.spec.mjs`). Then:

1. Copy `candidates/r1h/wp-infra-28b/group.json` to `tools/t0/patches/PG-r1h-wp-infra-28b.json` (the file name must equal the group name). It is a page group with `"train": "R1h"` and `"optional": true`: it enters a train with `--with PG-r1h-wp-infra-28b`, or when `optional` is dropped for R1h. PG groups are applied in file-name order after the bundle groups; the anchors are written against the finished R1g text, so the group applies after every R1g group, as the builder does.
2. Order against the other R1h page groups that touch this file: wp-content-09b (`PG-r1h-wp-content-09b`, applied before this one by file name) owns every TICK label and the REALTIME hit of the span after "Share this code"; wp-seo-04b (head tags) and wp-seo-11b (footer mount) come after. The anchors are disjoint from that text (`coordination-check.mjs`; at the time of the run no other group file existed on disk, so no sibling was applied: run `node candidates/r1h/wp-infra-28b/coordination-check.mjs` again when they exist; it applies every group on disk that patches this page, in builder order). Of the two REALTIME hits of this page this group owns the Live Sync sentence of line 126 only.
3. Expected `anchors.json` delta: nine rows, group `PG-r1h-wp-infra-28b`, ids `r1h-wp-infra-28b-*`, each `expect 1`, `found 1`. Identity file: no line is needed (no title, description, og or twitter tag, canonical or JSON-LD changes); the gate `parse` reads the inline scripts with acorn and they parse (checked here with the same options).
4. Run `node tests/t0/wtpeer.spec.mjs --dist release/R1h/dist` (the real-browser check the entry lists as owed: two browsers hosting and joining over PeerJS stand-ins on the full train), `pages-maps.spec.mjs` PG-05a to 05c and `pages-core.spec.mjs` T0-PGC-19 to 21 through the machine lock.
5. Re-run the record of this item at any time: `node candidates/r1h/_lib/prove.mjs wp-infra-28b --check` (what `check_backlog.py --rerun wp-infra-28b` does).

## Decisions taken (delegated; rows W28B-1 to W28B-4 in docs/decisions/DELEGATED-DECISIONS-MAIN-SITE.md, row C08 applied)

- A guest drops a note that starts a tag (`<` followed by a letter, `!`, `/`, `?` or a control character) and the host sends such a note as an empty note. The acceptance lists "a note with <img onerror>" among the payloads that never reach goToTick; its rule for a note names only length and control characters. Way back: delete the tag test from `parseGoto` (one expression in `gen.mjs`).
- The earlier parameter set is spelled as A to Z without I, L, O plus 2 to 9 (23 + 8 = 31): the plan gives only its size and the word "unambiguous".
- The copy says "6-character" (the alphabet holds digits). The join check enforces the length only, so any six characters join.
- No code without `crypto.getRandomValues`: no session, a visible message, no `Math.random` fallback.

## Not run, owner-side, and what remains open

- Not run: real PeerJS traffic between two browsers over the public broker (needs the network of the owner or of the release workstream; it is the check the entry lists as owed); any GPU, timing or train-build figure; the existing specs named in the request note (read, not run); a browser on a phone or on another engine than Chromium (the real-browser pass here is Chromium with software rendering and stand-ins for Mapbox and PeerJS).
- Owner-only: nothing in this item (no account, licence, payment, contact or deployment).
- Residual risks, none of them closed by this group (the plan's optional host approval of joiners and the privacy disclosures are other items): a hostile peer that knows the code can occupy the 20 places, and a half-open connection also takes a place until it closes; a hostile host can still send valid messages at any rate, each one moves the map; PeerJS's own handling of large or chunked messages happens inside the library before the page sees a message; guessing: arithmetic only, not measured, with 100 probes a second one specific live code is hit with probability about 0.075 % per hour (360,000 of 481,890,304).
- Visitors with a cached older page (5-letter codes) cannot join a session of the new page and the reverse; `_headers` serves the page `no-cache, must-revalidate`, so the new page arrives on the next load.

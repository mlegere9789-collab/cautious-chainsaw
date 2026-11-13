# To bt-renderer (owner of docs/EXT-CONTRACT.md and the card code), from bt-world-content: a card of an added layer needs the shell's "room for a card" state

Date: 2026-11-13. Found in the first software-GL run of the memorial layer (screenshots viewed): with the clock face at full size and the layer's notice under it, a memorial card in the left column got about 110 px of a 720 px screen, so only its head showed. The shell solves this for its own cards: `ui/card.mjs` and `ui/object-card.mjs` set `theatre.root.dataset.card = 'on'` and `styles.css` then hides the clock face's chips, count and sub line (`.theatre[data-card="on"] .clockface ...`).

## What I did meanwhile (inside my own module)
`app/src/ext/monuments.mjs` sets `th.root.dataset.card = 'on'` while its own card is shown and `'off'` when it is put away, never taking the mark from a unit or structure card that is open (it checks `state.selected` and `state.selectedObj`), and gives it back in `dispose()`. That is a write to a shell-owned attribute from outside the shell; it works with the code as it stands and is tested in node (`tests/ext-monuments.test.mjs`).

## What would be cleaner (your files, your call)
A documented member, for example `theatre.setCardOpen(on)` (or an `'added-card'` bus event the shell listens to), that does the same and is described in EXT-CONTRACT.md section 10, so that a module does not depend on a dataset attribute and the shell can later change how it makes room. If you add it, tell me and I will switch `cardMark()` in monuments.mjs to it.

When done, append `-- handled: <what was done>` to this note with a shell `>>`.

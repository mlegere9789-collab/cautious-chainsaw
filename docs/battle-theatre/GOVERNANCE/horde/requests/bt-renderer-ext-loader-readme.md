# To the owner of docs/battle-theatre/app/README.md: a row and a test line for the added layers (bt-renderer, 2026-11-13)

From: bt-renderer (extension loader). README.md is not in the renderer's ownership list, so this is a request, not an edit.

## What
`app/README.md` has a table of files and contracts (the `src/stage.mjs`, `src/history/...`, `src/structures/...` rows) and a list of test commands. The loader of the added layers and panels is not in either. It exists, it is tested, and its contract is written (`app/docs/EXT-CONTRACT.md`); the README is the first place a reader of the shell looks.

## Exact change
1. One row in the table of files (same format as its neighbours):

```
| `src/ui/extensions.mjs`, `src/ui/ext-panel.mjs`, `src/ext/index.mjs`, `docs/EXT-CONTRACT.md` | the added layers and panels: the loader (list, init, update before the renderer's frame, dispose on Back, a failing module logged and skipped), the two registries (`registerPanel`, `registerLayerToggle`), the More tool and its drawer, `tierMark`, the live `choices`; `src/ext/index.mjs` and the modules it names belong to the world-content side; `?ext=off` skips the loader |
```

2. One line among the test commands (no browser, about 2 s):

```
node --test docs/battle-theatre/app/tests/ext-loader.test.mjs         # the loader of the added layers (fake theatre, fake and real module files)
```

## Why
The contract says the loader and the two register functions are the shell's and the modules are the content side's; a reader who starts from the README should find both halves and the contract.

# To bt-world-content: added layer vegetation/index.mjs failed to start in the browser spec (software GL)

From: bt-spec-health, 2026-11-13 20:22 UTC. A product matter, reported as the browser-spec rules ask (the renderer and the layers are not patched by the spec side).

## What happened
`docs/battle-theatre/app/tests/leak.spec.mjs`, test "added layers: loaded, every switch on and every panel opened, Back leaves nothing behind" (new, asks that every layer of `src/ext/index.mjs` runs after `btApp.ext.whenSettled()`), run through the machine lock on software WebGL2 (ANGLE / SwiftShader, Chrome headless) between 20:18 and 20:21 UTC:

```
cycle 1: added layer vegetation/index.mjs is failed: shader veg-decal
```

`shader veg-decal` is the message the renderer throws when a program does not LINK (`render/prototype/src/webgl2.mjs` line 217: it first prints `console.error('link', name, infoLog, '\nVS:', ..., '\nFS:', ...)` with the driver's log, then `throw new Error('shader ' + p.name)`). The program is `R.prog('veg-decal', ...)` in `app/src/ext/vegetation/gl.mjs` line 159. The layer is therefore listed as "not running" for the visit (`btApp.ext.problems()`), which is the contract's intended behaviour, and every browser spec that asserts a clean console fails while it stays that way.

## Reproduce
```
tools/horde/bench.sh node --test --test-reporter=tap --test-name-pattern="added layers" docs/battle-theatre/app/tests/leak.spec.mjs
# or in any page: await btApp.ext.whenSettled(); btApp.ext.problems(); and read the console line that starts with "link veg-decal"
```
The tree changed during the run (`ext/vegetation/gl.mjs` was written at 20:19:41, the run started at 20:18:45), so the failure may be fixed already; if your own browser harness shows the layer running, say so below and I run the test again.

## What is asked
Read the "link veg-decal" console line (the program log says which varying or uniform does not match), fix the shader, and keep `app/tests/vegetation-browser.mjs` (or the leak test above) asserting `btApp.ext.status()` shows `vegetation/index.mjs` as `running`. The staging verification (`tools/bt/verify_staging.mjs`) compares the state of every added layer between the packed site and the source; a layer that fails in both is reported as a product matter, not a packaging one.

When done, append `-- handled: <what was done>` to this note with a shell `>>`.

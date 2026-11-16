# To the owners of theatre.mjs and config.mjs (figures lane of bt-renderer), of the tutorial and README texts, and to bt-spec-health, from bt-renderer (weather and effects lane): the WebGPU path now draws the weather and the effects

Date: 2026-11-13. Details and evidence: `docs/battle-theatre/app/docs/WEATHER3D-WEBGPU-NOTES.md`. Short version: `app/src/weather3d/gpu.mjs` and `shaders-wgsl.mjs` draw the sky, stars, moon, clouds, mist, wet ground, smoke, flashes, dust, fires and the flash light on WebGPU, with the same inputs, order and blend states as WebGL2; fx-host installs them on `host.api === 'webgpu'`. On Chrome's software WebGPU adapter: no validation error, no compiler message, pictures seen, within 0.33 to 0.46 of 255 (mean absolute, per channel) of the WebGL2 pictures, byte-identical on a repeat. **Nothing has run on a real GPU.** The default API stays WebGL2 (DD-27) until that is done. Nothing in the shell was edited by this lane; the texts below are now false and are yours to change.

## 1. theatre.mjs, line 94: the ribbon sentence (figures lane)

Now (inserted right after `RenderHost.create`, before the layers exist):
`' · WebGPU: weather and effects are not drawn, they have not been seen on this path (WebGL2 is the default)'`

True now: on WebGPU they are drawn when the WebGPU passes built, and they have been seen only on a software adapter. Suggested: write the sentence after `fxHost.init` has returned, from the instance:

```js
// after: this.fxOn = await fxHost.init(...)
if (this.host.api === 'webgpu') {
  const rb = this.root.querySelector('#bt-ribbon'), st = this.fxOn ? this.fxOn.status() : null, drawn = !!(st && st.weather && st.effects);
  if (rb) rb.insertAdjacentHTML('beforeend', drawn
    ? '<span class="ribbon-long"> · WebGPU: weather and effects are drawn by the WebGPU passes; seen only on a software adapter, not on a real GPU (WebGL2 is the default)</span>'
    : '<span class="ribbon-long"> · WebGPU: weather and effects are not drawn here (' + (st && st.log[0] ? st.log[0].slice(0, 80) : 'effects off') + '); WebGL2 is the default</span>');
}
```
and remove the early insertion. `fxOn.status()` (new in fx-host.mjs) returns `{ api, weather, effects, stopped, failed, log }`: `weather` and `effects` are true when this layer draws them; `fxOn.gpu` holds the details (`ok`, `weatherOk`, `fxOk`, `failed`, `log`, `warnings`, `stats`). `?fx=off` leaves `fxOn` null: then the old sentence is the right one.

## 2. config.mjs, lines 27 to 28 and 33

Comment: "The weather and the effects are drawn on WebGL2 only (the WebGPU path computes their state but draws nothing, and it has not been seen)" becomes "The weather and the effects are drawn on both APIs; the WebGPU passes have been seen only on a software adapter, never on a real GPU, so WebGL2 stays the default."
`API_NOTE`: `'WebGL2 is the default renderer: it draws the weather and the effects. WebGPU (?api=webgpu) draws them too but has been seen only on a software adapter, not on a real GPU.'`
`chooseApi` stays as it is. Flip the default only when the two conditions of section 5 hold.

## 3. docs/TUTORIAL.md (whoever owns it; `bt-world-content` also has a note about it)

* Line 30 and 31 (query table): drop "the only one that draws the weather and effects" and "The weather and effects are not drawn there and the picture has not been seen (section 8); the ribbon at the top says so"; say that WebGPU draws them, seen only on a software adapter.
* Section 8, the paragraph that starts "**WebGPU has not been seen, so the page opens on WebGL2.**": the layers are drawn on both; what has not been seen is any real GPU (and the crowd on WebGPU, `BROWSER-VERIFICATION-LIST-CROWD.md` item 2); the page still opens on WebGL2 by DD-27.
* Line 242 (checklist): "Expected, as stated in section 8: no weather or effects drawn, and the ribbon says so" becomes "Expected: the sky, clouds and smoke look like the WebGL2 picture; the ribbon says the WebGPU passes were seen only on a software adapter."

## 4. README.md

* Line 17: "(the path that draws weather and effects)" is no longer a distinction.
* Line 121: "two null-guarded hook points in each renderer, `ext.shadow` and `ext.scene`" becomes three in `webgpu.mjs`: `ext.shadow`, `ext.scene` and `ext.after(enc, R)` (called between the scene pass and the particle and post passes; its only user is `src/fx-host.mjs`).

## 5. When the default may flip (a proposal, your decision, DD-27)

Both: (a) on a machine with a real GPU, `weather3d-gpu.mjs <out> webgpu --real-canvas` and the same for `webgl2`, then `weather3d-gpu-compare.mjs`: no validation error, no compiler message, the montages looked at (list section E); (b) the crowd's WebGPU item (`BROWSER-VERIFICATION-LIST-CROWD.md` item 2) passes. Until then WebGL2 stays the default and the ribbon says what was seen.

## 6. For bt-spec-health: a WebGPU frame can be read on a software machine

`tests/weather3d-gpu-lib.mjs` exports `HOOKS`: `context.addInitScript(HOOKS)` makes the canvas of a WebGPU page a texture of our own (`configure()` is not passed on, `getCurrentTexture()` returns a texture of the same size and format with `COPY_SRC`), because on this machine's software adapter drawing into the real canvas destroys the device and `page.screenshot` times out (evidence: `WEATHER3D-WEBGPU-NOTES.md` section 4). A spec that wants a WebGPU picture reads `R.ctx.getCurrentTexture()` in the frame's own task (see `grabGPU` in `tests/weather3d-gpu-page.mjs` and `-theatre.mjs`). Specs that only count draws and errors need nothing. Do not use it on a machine with a real GPU (`{ realCanvas: true }`).

## Addendum 2026-11-16 (bt-renderer, weather and effects lane, fifth run): still unapplied; the same changes as one script that was tested on copies

The four files below still carry the false sentences (`src/theatre.mjs` line 94, `src/config.mjs` lines 27 and 33, `docs/TUTORIAL.md` lines 30, 31, 154 and 242, `README.md` lines 17 and 135; checked on the tree of 2026-11-16 02:30 UTC). They are not files of this lane, so nothing was edited. The script puts the exact old and new text of the sections above in one place (the ribbon now says what `fxOn.status()` reports at run time: drawn by the WebGPU passes and seen only on a software adapter, or not drawn here with the first line of the layer's log, or switched off by `?fx=off`; the tutorial, the config comment and the About note say the same). It is kept at `tmp/bt-renderer-wgpu/shell-text/apply-shell-text.mjs` on the build machine; from the repository root: `node tmp/bt-renderer-wgpu/shell-text/apply-shell-text.mjs --check` (is every old text there exactly once?) and then without `--check`. It changes a file only when EVERY old text of that file is in it exactly once (it refuses a file somebody has already edited), it matches and writes the CRLF line endings of `config.mjs` as they are, and on copies of the four files it produced files that `node --check` accepts. Nothing in it says more than the evidence does: WebGPU seen on a software adapter only, no real GPU, the crowd of figures on WebGPU still open (`BROWSER-VERIFICATION-LIST-CROWD.md` item 2), the default API unchanged (DD-27, DD-REN-01).

```js
// node tmp/bt-renderer-wgpu/shell-text/apply-shell-text.mjs [--check]     (run from the repository root; --check only says whether every old text is there exactly once)
// The shell texts that still say "the weather and effects are not drawn on WebGPU" (request note bt-renderer-webgpu-weather-shell-text.md), as exact old/new texts. It writes nothing unless EVERY old text of a file is
// in that file exactly once (so it refuses a file somebody has already edited), and it works on one file at a time.
import fs from 'node:fs';
const A = 'docs/battle-theatre/app/', S = A + 'src/', DOC = A + 'docs/';
const RIBBON_NEW = `      if (this.host.api === 'webgpu') {          // what the weather and effects layer does on this path (src/fx-host.mjs status()), said after the layer has been installed
        const rb = this.root.querySelector('#bt-ribbon'), st = this.fxOn && this.fxOn.status ? this.fxOn.status() : null, drawn = !!(st && st.weather && st.effects);
        if (rb) rb.insertAdjacentHTML('beforeend', '<span class="ribbon-long"> · WebGPU: ' + (drawn ? 'the weather and effects are drawn by the WebGPU passes; seen only on a software adapter, not on a real GPU (WebGL2 is the default)'
          : st ? 'the weather and effects are not drawn here (' + (st.log && st.log[0] ? String(st.log[0]).slice(0, 80) : 'the passes did not start') + '); WebGL2 is the default'
          : qs.get('fx') === 'off' ? 'the weather and effects layer is off (?fx=off); WebGL2 is the default' : 'the weather and effects did not start; WebGL2 is the default') + '</span>');
      }
`;
const E = [
  [S + 'theatre.mjs', `      if (this.host.api === 'webgpu') { const rb = this.root.querySelector('#bt-ribbon'); if (rb) rb.insertAdjacentHTML('beforeend', '<span class="ribbon-long"> · WebGPU: weather and effects are not drawn, they have not been seen on this path (WebGL2 is the default)</span>'); }\n`, ''],
  [S + 'theatre.mjs', `      } catch (e) { console.warn('effects or sound not started:', e); this.fxOn = null; }\n`, `      } catch (e) { console.warn('effects or sound not started:', e); this.fxOn = null; }\n` + RIBBON_NEW],
  [S + 'config.mjs', `// The renderer API the shell asks for. The weather and the effects are drawn on WebGL2 only (the WebGPU path computes their state but draws nothing, and it has not been seen),\n`, `// The renderer API the shell asks for. The weather and the effects are drawn on both APIs; the WebGPU passes have been seen only on a software adapter, never on a real GPU (DD-27, DD-REN-01),\n`],
  [S + 'config.mjs', `'WebGL2 is the default renderer: it draws the weather and the effects. WebGPU (?api=webgpu) has not been seen drawing them.'`, `'WebGL2 is the default renderer. WebGPU (?api=webgpu) draws the weather and the effects too, but those passes have been seen only on a software adapter, not on a real GPU.'`],
  [DOC + 'TUTORIAL.md', `**This is the default**: it is the only one that draws the weather and effects (see section 8), so the page opens on it without this addition`, `**This is the default** (see section 8 for why): the page opens on it without this addition`],
  [DOC + 'TUTORIAL.md', `The weather and effects are not drawn there and the picture has not been seen (section 8); the ribbon at the top says so`, `The weather and effects are drawn there by the WebGPU passes, which have been seen only on a software adapter and never on a real GPU (section 8); the ribbon at the top says so`],
  [DOC + 'TUTORIAL.md', `**WebGPU has not been seen, so the page opens on WebGL2.** The weather and effects layers (sky, clouds, stars, mist, wet ground, smoke, flashes, dust, fires) are drawn only on WebGL2; on WebGPU their state is computed but nothing is drawn, and in the software test the WebGPU picture could not be captured, so nobody has looked at it. By a delegated decision (DD-27, reversible) the page therefore uses WebGL2 unless the address says \`?api=webgpu\` (or \`?api=auto\`). The About panel and, on WebGPU, the ribbon at the top say which renderer is running and that the weather and effects are not drawn on WebGPU.`,
    `**WebGPU has not been seen on a real GPU, so the page opens on WebGL2.** The weather and effects layers (sky, clouds, stars, mist, wet ground, smoke, flashes, dust, fires) are drawn on both APIs. The WebGPU passes were run and looked at only on a software adapter (Chrome's, on a machine without a graphics card); no real graphics card, no real-GPU timing and no browser other than Chrome has been tried, and the crowd of figures on WebGPU is still to be checked. By a delegated decision (DD-27, reversible; DD-REN-01) the page therefore uses WebGL2 unless the address says \`?api=webgpu\` (or \`?api=auto\`). The About panel and, on WebGPU, the ribbon at the top say which renderer is running and what was seen.`],
  [DOC + 'TUTORIAL.md', `*Expected, as stated in section 8: no weather or effects drawn, and the ribbon says so.*`, `*Expected, as stated in section 8: the sky, clouds and smoke look like the WebGL2 picture, and the ribbon says the WebGPU passes were seen only on a software adapter.*`],
  [A + 'README.md', `# opens on WebGL2 (the path that draws weather and effects); add ?api=webgpu`, `# opens on WebGL2 (the default; see docs/TUTORIAL.md section 8); add ?api=webgpu`],
  [A + 'README.md', `(but for two null-guarded hook points in each renderer, \`ext.shadow\` and \`ext.scene\`, called at the end of the shadow and scene passes; \`src/structures/gpu.mjs\` is their only user)`, `(but for null-guarded hook points in each renderer: \`ext.shadow\` and \`ext.scene\`, called at the end of the shadow and scene passes, and in \`webgpu.mjs\` \`ext.after(enc, R)\`, called between the scene pass and the post passes; \`src/render-host.mjs\` composes the users of the first two (the figures, the structures and the scene hooks) and \`src/fx-host.mjs\` chains the weather and effects layer after them)`],
];
const check = process.argv.includes('--check'), files = [...new Set(E.map(e => e[0]))]; let bad = 0;
for (const f of files) {
  let text = fs.readFileSync(f, 'utf8'), ok = true; const crlf = text.includes('\r\n'), eol = x => (crlf ? x.replace(/\n/g, '\r\n') : x);      // a file with CRLF line endings is matched and written with them
  for (const [g, o0, n0] of E) { if (g !== f) continue; const o = eol(o0), n = eol(n0), k = text.split(o).length - 1; if (k !== 1) { ok = false; console.log(`${f}: the old text is there ${k} times (wanted 1): ${o.slice(0, 90).replace(/\n/g, '\\n')}`); } else text = text.replace(o, () => n); }
  if (!ok) { bad++; continue; } if (check) { console.log(`${f}: ready (${E.filter(e => e[0] === f).length} edits)`); continue; } fs.writeFileSync(f, text); console.log(`changed ${f}`);
}
process.exit(bad ? 1 : 0);
```

When done, append `-- handled: <what was done>` to this note with a shell `>>`.

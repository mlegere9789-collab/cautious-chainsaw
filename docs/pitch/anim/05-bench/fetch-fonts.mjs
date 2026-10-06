// One-off: fetch the Mapbox glyph range 0-255 of the app's label font stack THROUGH THE HARNESS (Referer injection, counted against the tile budget; 1 request)
// so the Mapbox symbol-layer benchmark can shape real text offline.  The token is read from the R1c bundle at run time and is never written to disk or printed.
process.env.T0_AGENT = 'pitch-anim/arch';
process.env.T0_PORT_BASE = process.env.T0_PORT_BASE || '9580';
const { openSession, tileBudget } = await import('../../../../tests/t0/lib.mjs');
import fs from 'node:fs';
import path from 'node:path';

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..', '..', '..');
const entry = fs.readdirSync(path.join(REPO, 'release/R1c/dist/assets')).find((f) => /^index-[0-9a-f]+\.js$/.test(f));
const token = /pk\.eyJ[\w.-]+/.exec(fs.readFileSync(path.join(REPO, 'release/R1c/dist/assets', entry), 'utf8'))[0];
const stack = 'DIN Pro Medium';
const s = await openSession({ profile: 'fonts', cdpPort: Number(process.env.T0_PORT_BASE) + 2, tiles: 'inject' });
try {
  await s.page.goto('about:blank');
  const b64 = await s.page.evaluate(async ({ url }) => {
    const r = await fetch(url); if (!r.ok) throw new Error('HTTP ' + r.status);
    const buf = new Uint8Array(await r.arrayBuffer()); let bin = ''; for (const x of buf) bin += String.fromCharCode(x); return btoa(bin);
  }, { url: `https://api.mapbox.com/fonts/v1/mapbox/${encodeURIComponent(stack)}/0-255.pbf?access_token=${token}` });
  const out = path.join(REPO, 'tmp/pitch-anim/arch/vendor/fonts', stack, '0-255.pbf');
  fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, Buffer.from(b64, 'base64'));
  console.log('saved', out, fs.statSync(out).size, 'bytes; harness tile budget used', tileBudget.used);
} finally { await s.close(); }

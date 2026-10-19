// headless.mjs - build the core on the real dataset (docs/pitch/anim2/release-look/data/dataset.json, the dataset of the approved look) and run a playback; prints the smoothness metrics.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCore } from '../src/engine/core.mjs';
import { STANDARDS } from '../src/engine/skins/standards.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..', '..');
const ds = JSON.parse(fs.readFileSync(path.join(REPO, 'docs/pitch/anim2/release-look/data/dataset.json'), 'utf8'));
const tokens = JSON.parse(fs.readFileSync(path.join(HERE, '..', 'tokens', 'anim.tokens.json'), 'utf8'));
const text = JSON.parse(fs.readFileSync(path.join(HERE, '..', 'data', 'text-widths.json'), 'utf8'));
export function make(settings = {}) { return createCore({ dataset: ds, tokens, textTable: text, skins: STANDARDS, settings: { 'skin.id': 'standards', ...settings } }); }
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const zoom = +(process.argv[2] || 13.5); const tick0 = +(process.argv[3] || 295); const speed = +(process.argv[4] || 4); const sec = +(process.argv[5] || 10);
  const E = make(); const cam = { lng: -77.2377, lat: 39.8206 - 0.003, zoom, w: 1440, h: 800 };
  let tau = tick0; const dt = 1000 / 60; const t0 = performance.now();
  for (let i = 0; i < sec * 60; i++) { tau += speed * 2 * dt / 1000; E.step({ dtMs: dt, tau, cam }); }
  const s = E.metrics.summary(); console.log('wall ms', (performance.now() - t0).toFixed(0), JSON.stringify(s, null, 1));
}

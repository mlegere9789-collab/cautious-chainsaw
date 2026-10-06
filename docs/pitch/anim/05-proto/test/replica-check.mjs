// Fidelity check of the replay in test/legacy-replica.mjs against the REAL y1 / F4 of the built bundle, in real Chrome.
//   node docs/pitch/anim/05-proto/test/replica-check.mjs --dist tmp/pitch-anim/arch/anim-R1c-control/dist
// The dist is copied to tmp/pitch-anim/arch/probe-R1c and ONE line is appended to its entry bundle (window.__probe = { y1, yn }) so the real functions can be called; nothing else changes.
// No Mapbox request is made (tiles blocked: the store and the data load without a map).  For ~370 frames of the 8x playback sequence it compares the units y1 returns with the replay.
process.env.T0_AGENT = 'pitch-anim/arch';
process.env.T0_PORT_BASE = process.env.T0_PORT_BASE || '9580';
const lib = await import('../../../../../tests/t0/lib.mjs');
const { openSession, createStaticServer, waitForApp, chooseLayout, sleep, PORT_BASE } = lib;
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadByTick } from '../../../../../tmp/pitch-anim/arch/data-load.mjs';
import { makeReplica } from './legacy-replica.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..', '..', '..');
const argv = process.argv.slice(2); const arg = (k, d) => { const i = argv.indexOf('--' + k); return i < 0 ? d : argv[i + 1]; };
const SRC = path.resolve(arg('dist')), PROBE = path.join(REPO, 'tmp', 'pitch-anim', 'arch', 'probe-R1c', 'dist');
fs.rmSync(path.dirname(PROBE), { recursive: true, force: true }); fs.cpSync(SRC, PROBE, { recursive: true });
const entry = fs.readdirSync(path.join(PROBE, 'assets')).find((f) => /^index-[0-9a-f]+\.js$/.test(f)); const ep = path.join(PROBE, 'assets', entry);
fs.appendFileSync(ep, '\n;window.__probe={y1:y1,yn:yn};\n');
const { byTick } = loadByTick(); const rep = makeReplica(byTick);
const frames = [...rep.shippedFrames()]; const sample = frames.filter((f, i) => i % 7 === 0 || (i && frames[i - 1].st !== f.st && i % 2 === 0));
const server = await createStaticServer({ root: PROBE, port: PORT_BASE });
const s = await openSession({ profile: 'replica', cdpPort: PORT_BASE + 1, tiles: 'block', viewport: { width: 1440, height: 900, dpr: 1 } });
const out = { dist: path.relative(REPO, SRC), frames: sample.length };
try {
  await s.page.goto(`http://127.0.0.1:${PORT_BASE}/`); await waitForApp(s.page, 40000).catch(() => { }); await chooseLayout(s.page, 'desktop').catch(() => { });
  await s.page.waitForFunction(() => !!window.__probe, null, { timeout: 40000 });
  await s.page.evaluate(() => window.__probe.yn.getState().setTick(675));                // loads days 1..3
  await s.page.waitForFunction(() => Object.keys(window.__probe.yn.getState().placementsByTick).length >= 180, null, { timeout: 40000 });
  await s.page.evaluate(() => window.__probe.yn.setState({ currentTick: 1 }));
  const real = await s.page.evaluate((fr) => { const pbt = window.__probe.yn.getState().placementsByTick; return fr.map(([st, ut]) => { const r = {}; for (const u of window.__probe.y1(pbt, st, ut)) r[u.unit_id] = [u.lng, u.lat]; return r; }); }, sample.map((f) => [f.st, f.ut]));
  let units = 0, mism = 0, presence = 0, maxErr = 0; const examples = [];
  const allIds = new Set(); for (const t of Object.keys(byTick)) for (const r of byTick[t]) allIds.add(r.unit_id);
  sample.forEach((f, i) => {
    const R = real[i];
    for (const id of allIds) {
      const a = R[id] || null, b = rep.legacyPos(id, f.st, f.ut); units++;
      if (!!a !== !!b) { presence++; if (examples.length < 5) examples.push({ id, st: f.st, ut: +f.ut.toFixed(3), real: a, replica: b }); continue; }
      if (a) { const e = Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1])); if (e > maxErr) maxErr = e; if (e > 1e-9) { mism++; if (examples.length < 5) examples.push({ id, st: f.st, ut: +f.ut.toFixed(3), real: a, replica: b }); } }
    }
  });
  Object.assign(out, { unitFrameComparisons: units, positionMismatches: mism, presenceMismatches: presence, maxAbsErrorDeg: maxErr, examples, pass: mism === 0 && presence === 0 });
} finally { await s.close(); await server.close(); }
fs.mkdirSync(path.join(HERE, '..', 'results'), { recursive: true });
fs.writeFileSync(path.join(HERE, '..', 'results', 'replica-check.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
process.exit(out.pass ? 0 : 1);

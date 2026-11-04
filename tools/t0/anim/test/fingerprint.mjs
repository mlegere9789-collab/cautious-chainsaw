// fingerprint.mjs - the deterministic fingerprint of the engine's output on the real data of a tree: a change that is only about speed must not move a single mark by a hundredth of a pixel.
//
//   node tools/t0/anim/test/fingerprint.mjs [--dist <tree>] [--record <file>] [--check <file>]
//
// Scenes: the opening camera and a close one on the desktop and the phone at the engine's three working modes (a solve every frame; a solve every third frame with the solved marks carried between; the governor of the phone with the sliced cold
// start), each driven through cuts, jumps in time, fast play and a selection (1,600 frames), plus the phone at 8x playback (900 frames, the scene of T0-ANIM-B11).  The clock is replaced by a counter while it runs (the budgets of the sliced work
// then do not depend on the machine), so the hashes are exact.  `dataDigest` identifies the data the hashes were made from: when it differs the hashes mean nothing and a check says so instead of failing.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createCore } from '../src/engine/core.mjs';
import { STANDARDS } from '../src/engine/skins/standards.mjs';
import { MINIMAL } from '../src/engine/skins/minimal.mjs';
import * as H from './headless.mjs';

const SCENES = [
  { name: 'phone13.5', cam: [13.5, 39.812, -77.235, 390, 700], settings: {}, extra: {}, kind: 'tour' },
  { name: 'desk15', cam: [15, 39.8, -77.25, 1440, 800], settings: {}, extra: {}, kind: 'tour' },
  { name: 'phone13.5/c3', cam: [13.5, 39.812, -77.235, 390, 700], settings: { 'layout.solveEvery': '3' }, extra: {}, kind: 'tour' },
  { name: 'desk13.5/sliced', cam: [13.5, 39.812, -77.235, 1440, 800], settings: {}, extra: { sliceMs: 5, autoQuality: true }, kind: 'tour' },
  { name: 'phone8x/c3@300', cam: [13.2, 39.812, -77.2373, 375, 812], settings: { 'layout.solveEvery': '3' }, extra: {}, kind: 'play8', tick: 300 },
  { name: 'phone8x/sliced@420', cam: [13.2, 39.812, -77.2373, 375, 812], settings: {}, extra: { sliceMs: 5, autoQuality: true }, kind: 'play8', tick: 420 },
];
const FULL_JUMPS = [226, 300, 450, 600, 120, 380];

const line = (t) => `${t.key}|${t.kind}|${t.x.toFixed(2)}|${t.y.toFixed(2)}|${t.w.toFixed(2)}|${t.h.toFixed(2)}|${t.opacity.toFixed(3)}|${t.n}|${t.fname || ''}|${t.short || ''}\n`;

/** @returns {{dataDigest:string, scenes:Record<string,{frames:number,tiles:number,hash:string}>}} */
export function fingerprint(dist, { jumps = FULL_JUMPS } = {}) {
  const { ds } = H.dataset(dist);
  const dataDigest = crypto.createHash('sha1').update(JSON.stringify(ds.units.map((u) => [u.id, u.kf ? u.kf.length : (u.keyframes || []).length]))).update(JSON.stringify(ds.units.slice(0, 40))).digest('hex');
  const out = {}; const realNow = performance.now.bind(performance); let n = 0;
  performance.now = () => (n++) * 0.0005;
  try {
    for (const sc of SCENES) {
      const E = createCore({ dataset: ds, tokens: H.tokens, textTable: H.textTable, skins: [...STANDARDS, MINIMAL], settings: { 'skin.id': 'standards', ...sc.settings }, ...sc.extra });
      const cam = H.camera(...sc.cam); const h = crypto.createHash('sha1'); let frames = 0; let tiles = 0;
      const feed = (F) => { frames++; tiles += F.tiles.length; for (const t of F.tiles) h.update(line(t)); h.update(`#${F.overlaps}|${F.unrepresented}|${F.rounds}\n`); };
      if (sc.kind === 'tour') {
        let tau = 20;
        const run = (k, cutFirst, dtau, sel) => { for (let i = 0; i < k; i++) feed(E.step({ dtMs: 16.667, tau: (tau += dtau), cam, cut: cutFirst && i === 0, selectedId: sel || null })); };
        run(40, true, 0); run(120, false, 0.05); run(60, false, 0);
        for (const j of jumps) { tau = j; run(30, true, 0); run(100, false, 0.08); run(80, false, 0); }
        run(60, false, 0.5);
        const some = E.frame.tiles.find((t) => t.kind === 'leaf'); if (some) run(60, false, 0, some.ids[0]);
      } else {
        let tau = sc.tick;
        for (let i = 0; i < 900; i++) { tau += 8 * 2 * 16.667 / 1000; feed(E.step({ dtMs: 16.667, rawDtMs: i % 7 === 3 ? 33 : 16.667, tau, cam, cut: i === 0 })); }
      }
      out[sc.name] = { frames, tiles, hash: h.digest('hex') };
    }
  } finally { performance.now = realNow; }
  return { dataDigest, scenes: out };
}

/** compare a fingerprint with a recorded one: { ok, skipped, differ[] } (skipped = made from other data) */
export function compare(fp, rec) {
  if (!rec || rec.dataDigest !== fp.dataDigest) return { ok: true, skipped: true, differ: [] };
  const differ = Object.keys(rec.scenes).filter((k) => !fp.scenes[k] || fp.scenes[k].hash !== rec.scenes[k].hash || fp.scenes[k].frames !== rec.scenes[k].frames);
  return { ok: differ.length === 0, skipped: false, differ };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = (n) => { const i = process.argv.indexOf('--' + n); return i >= 0 ? process.argv[i + 1] : null; };
  const dist = path.resolve(arg('dist') || path.join(H.REPO, 'release', 'R1e', 'dist'));
  const t0 = Date.now(); const fp = fingerprint(dist);
  if (arg('record')) { fs.writeFileSync(arg('record'), JSON.stringify(fp, null, 1) + '\n'); console.log('recorded', arg('record'), Object.keys(fp.scenes).length, 'scenes', ((Date.now() - t0) / 1000).toFixed(1), 's'); }
  else if (arg('check')) { const r = compare(fp, JSON.parse(fs.readFileSync(arg('check'), 'utf8'))); console.log(r.skipped ? 'SKIPPED: the data differ from the data of the recording' : r.ok ? 'IDENTICAL' : 'DIFFERENT: ' + r.differ.join(', ')); process.exit(r.ok ? 0 : 1); }
  else console.log(JSON.stringify(fp, null, 1));
}

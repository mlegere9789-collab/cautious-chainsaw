// Harness (not a gate): writes the WGSL of the OTHER renderers' passes (the prototype's eleven modules, the crowd's, the structures') as the browser compiles it, for the compile-only check on a second compiler
// (tests/weather3d-gpu-replay.py --extra-wgsl <dir>). The shader constants and options are the prototype's (render/prototype/src/webgpu.mjs buildPipelines); the imposter atlas sizes (W, H) are stand-ins (the real ones come from the
// baked atlas, which a node run does not build), so a compile here says the text is valid WGSL on that compiler, nothing about the pipelines or the pictures. Software-only harness, no browser.
//   node docs/battle-theatre/app/tests/weather3d-gpu-wgsl-other.mjs <outDir>
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const BT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), out = path.resolve(process.argv[2] || 'wgsl-other');
const S = await import(path.join(BT, 'render/prototype/src/shaders.mjs')), CH = await import(path.join(BT, 'render/prototype/src/characters.mjs'));
const K = { frames: 32, frow: [0, 1, 2, 3, 4, 5, 6].map(i => i * 32 + '.0').join(','), hrow: [0, 1, 2].map(i => i * 32 + '.0').join(',') }, NBF = CH.FOOT_RIG.n, NBM = CH.HORSE_RIG.n;
const impF = { views: 8, frames: 8, cw: 32, ch: 48, W: 256, H: 384, qh: 2.03, qw: 1.354, midy: 1.0, nclips: 7 }, impM = { views: 8, frames: 8, cw: 64, ch: 64, W: 512, H: 512, qh: 2.81, qw: 2.81, midy: 1.35, nclips: 3 }, common = S.common(K);
const crowd = await import(path.join(BT, 'app/src/crowd/shaders-wgsl.mjs')), structures = await import(path.join(BT, 'app/src/structures/shaders.mjs'));
const mods = { 'proto-terrain': S.terrainWGSL(K), 'proto-sky': S.skyWGSL(K), 'proto-midBone': S.midBoneWGSL(K), 'proto-nearFoot': S.nearWGSL(K, NBF), 'proto-nearMnt': S.nearWGSL(K, NBM), 'proto-mid': S.midWGSL(K), 'proto-gun': S.gunWGSL(K),
  'proto-impFoot': S.impWGSL(K, impF), 'proto-impMnt': S.impWGSL(K, impM), 'proto-part': S.partWGSL(K), 'proto-post': S.postWGSL(K), 'crowd': crowd.wgsl(common), 'structures': structures.wgsl(common) };
fs.mkdirSync(out, { recursive: true }); for (const [n, c] of Object.entries(mods)) fs.writeFileSync(path.join(out, n + '.wgsl'), c); console.log(Object.keys(mods).length + ' modules written to ' + out);

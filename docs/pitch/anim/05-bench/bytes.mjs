// Bundle-size accounting: minified (terser compress + mangle) raw / gzip -9 / brotli q11 bytes of the benchmark candidates' code and of the prototype engine, module by module.
//   node docs/pitch/anim/05-bench/bytes.mjs  > results/bytes.json
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { minify } from '../../../../node_modules/terser/main.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PAGE = path.join(HERE, 'page');
const ENG = path.join(HERE, '..', '05-proto', 'src');
const rd = (f) => fs.readFileSync(f, 'utf8');
async function size(code, { module = false } = {}) {
  const r = await minify(code, { compress: { passes: 2 }, mangle: true, module, format: { comments: false } });
  if (r.error) throw r.error;
  const b = Buffer.from(r.code);
  return { raw: b.length, gzip: zlib.gzipSync(b, { level: 9 }).length, brotli: zlib.brotliCompressSync(b, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }).length };
}
// strip ES-module syntax so that a file can be minified on its own: imports become globals, exports are dropped
const strip = (s) => s.replace(/^import .*$/gm, '').replace(/^export (async )?/gm, '$1');
const out = { note: 'terser compress(passes 2)+mangle, then gzip -9 / brotli q11; prototype code, not the shipped build', candidates: {}, engine: {} };

const lib = strip(rd(path.join(PAGE, 'lib.js'))), tiles = strip(rd(path.join(PAGE, 'tiles.js'))), gls = strip(rd(path.join(PAGE, 'glsprites.js')));
const c2d = strip(rd(path.join(PAGE, 'cand-2d.js'))), cgl = strip(rd(path.join(PAGE, 'cand-gl.js'))), mbx = strip(rd(path.join(PAGE, 'cand-mbx.js')));
out.candidates['c2d-atlas (atlas + tile sprites + draw loop; no scene/timeline)'] = await size(lib.slice(lib.indexOf('// ---------------------------------------------------------------- tile design')) + tiles + c2d.replace(/import .*/g, ''));
out.candidates['gl-overlay (instanced sprite renderer + atlas + draw loop)'] = await size(lib.slice(lib.indexOf('// ---------------------------------------------------------------- tile design')) + tiles + gls + cgl);
const customStart = mbx.indexOf('function custom('), symStart = mbx.indexOf('function symbols('), fsStart = mbx.indexOf('// feature-state alone');
const common = lib.slice(lib.indexOf('// ---------------------------------------------------------------- tile design')) + tiles + gls;
out.candidates['GLSprites alone (shader, buffers, atlas upload, draw call: the reusable WebGL part of B1/B2)'] = await size(gls);
out.candidates['mbx-custom (custom layer: sprite renderer + atlas + layer glue)'] = await size(common + '{' + mbx.slice(0, mbx.indexOf('export async function create')) + mbx.slice(customStart, symStart) + '}');
out.candidates['mbx-symbol (symbol layers: images, sources, 3 layers, per-frame feature build)'] = await size(lib.slice(lib.indexOf('// ---------------------------------------------------------------- tile design')) + '{' + mbx.slice(0, mbx.indexOf('export async function create')) + mbx.slice(symStart, fsStart) + '}');

// the prototype engine: all modules, and per module
const files = fs.readdirSync(ENG).filter((f) => /^\d\d-.*\.js$/.test(f)).sort();
const all = files.map((f) => rd(path.join(ENG, f))).join('\n');
out.engine['ALL modules (inserted into the entry bundle as one closure)'] = await size(`const GTANIM=(function(){"use strict";${all}\nreturn G;})();`, { module: false });
for (const f of files) {
  const wrap = `var G={register(){},mods:{},T:{params:{}},m:{ms:{}},P(){},get(){},cur(){},clock:{},host:{},dirty(){},measure(){}};var S={};${rd(path.join(ENG, f))}`;
  try { out.engine[f] = await size(wrap, { module: false }); } catch (e) { out.engine[f] = { error: String(e.message).slice(0, 80) }; }
}
const groups = { 'DOM-free core (core, timeline, motion, clock)': ['00-core.js', '10-timeline.js', '20-motion.js', '30-clock.js'], 'layout + fx': ['40-layout.js', '50-fx.js'], 'atlas + skins': ['60-atlas.js', '70-skins.js'], 'renderer + glue': ['80-render.js', '90-glue.js'], 'tuning studio (lazy-loadable)': ['85-studio.js'] };
out.engineByGroup = {};
for (const [name, fs_] of Object.entries(groups)) out.engineByGroup[name] = await size(`var G={};var S={};var C={};${fs_.map((f) => rd(path.join(ENG, f))).join('\n')}`, { module: false }).catch((e) => ({ error: String(e.message).slice(0, 100) }));
console.log(JSON.stringify(out, null, 1));

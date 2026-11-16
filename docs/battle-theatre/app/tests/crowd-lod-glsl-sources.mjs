// The GLSL ES 3.00 text of the crowd's figure pass the way GLRenderer.prog() assembles it, for the native tools (crowd-lod-glsl-dump.mjs, crowd-lod-native-record.mjs): the prototype's preamble PRE (webgl2.mjs does not export it, so it is
// read as text and evaluated; an error stops the tool when the template is not where this file expects it) with the crowd's text appended, and the same added line break after the version line.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const BT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..') + path.sep;
const src = fs.readFileSync(BT + 'render/prototype/src/webgl2.mjs', 'utf8'), tag = 'const PRE = (K) => `', a = src.indexOf(tag), b = src.indexOf('const NOFS', a), e = src.lastIndexOf('`;', b);
if (a < 0 || b < 0 || e < a) throw new Error('webgl2.mjs: the PRE template is not where tests/crowd-lod-glsl-sources.mjs expects it');
export const TW = Number((/const FU_BYTES = \d+, TW = (\d+);/.exec(src) || [])[1]); if (!(TW > 0)) throw new Error('webgl2.mjs: TW not found');
const PREF = new Function('K', 'TW', 'return `' + src.slice(a + tag.length, e) + '`;');
export const K = { frames: 32, frow: '0.0,32.0,64.0,96.0,128.0,160.0,192.0', hrow: '0.0,32.0,64.0' };         // the rows of the baked clips: seven for a man, three for a horse (the preamble declares arrays of that size)
export const pre = PREF(K, TW).replace('#version 300 es', '#version 300 es\n');
if (!pre.startsWith('#version 300 es')) throw new Error('PRE does not start with the version line');
export const assemble = (vs, fs_) => ({ vs: pre + vs, fs: fs_.startsWith('#version') ? fs_ : pre + fs_ });

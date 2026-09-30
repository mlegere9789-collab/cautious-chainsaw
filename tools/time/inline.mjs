// Builds the classic-script / inlined form of the module (the bridge): src/lib/time/core.js + bridge.js, pruned to what the bridge calls,
// minified with terser (pinned exact in package.json: the output is byte-stable for a given lockfile, and build.mjs --check compares it).
//
//   1. strip: import/export syntax is removed (the two files become one script scope);
//   2. prune: every property of makeCore's returned object that the bridge does not call is dropped (parts, gapAt, floorTick, _ ...), and
//      terser's dead-code pass then removes the helpers only those properties used;
//   3. text regions between /*@strip ... */ and /*@endstrip*/ are removed (load-time validation and the ISO parser: the inlined document
//      is validated by validateAnchors/makeTimeModel at build time and carries pre-parsed minutes, so the shipped copy does not re-check it);
//   4. terser (compress passes 3, mangle) on `var G=(function(){...})();`, then `var G=` and the final `;` are cut off, leaving the expression
//      `(function(){...})()` that tools/t0/patches-next/CLOCK.json assigns to `var GTBGT=` (wrap_iife keeps the parentheses).
// tools/time/check-patches.mjs re-proves the result against src/lib/time on all 675 ticks x 9 styles, hour steps, hour of day and hostile input.
import zlib from 'node:zlib';
import * as acorn from 'acorn';
import { minify as terser } from 'terser';
import { P, readText } from './lib.mjs';
import { inlineDoc } from './slim.mjs';

/** the makeCore members the bridge (src/lib/time/bridge.js) calls; everything else is pruned from the inlined copy */
export const KEEP = ['version', 'dv', 'tickMax', 'tickToMinutes', 'minutesToTick', 'tabDay', 'tabStart', 'format', 'tickToLabel', 'isApprox', 'tickAfterMinutes', 'dayPart', 'hour'];

const stripModule = (s) => s.replace(/^import .*$/gm, '').replace(/^export (class|function|const|let|var) /gm, '$1 ').replace(/^export \{[^}]*\}.*$/gm, '').replace(/^export default .*$/gm, '');

/** text between `/*@strip` ... `*\/` and `/*@endstrip*\/` markers (inclusive) is removed; throws when there is nothing to remove */
export function stripRegions(src) {
  let n = 0;
  const out = src.replace(/\/\*@strip[^*]*\*\/[\s\S]*?\/\*@endstrip\*\//g, () => { n++; return ''; });
  if (!n) throw new Error('no /*@strip*/ region found: the inline build expects the load-time validation to be marked');
  return out;
}

/** Drop the properties of makeCore's returned object literal whose key is not in `keep`. Throws if a kept name does not exist. */
export function pruneReturn(src, keep = KEEP, fnName = 'makeCore') {
  const ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script' });
  const fn = ast.body.find((n) => n.type === 'FunctionDeclaration' && n.id.name === fnName);
  if (!fn) throw new Error(`function ${fnName} not found`);
  const ret = [...fn.body.body].reverse().find((n) => n.type === 'ReturnStatement');
  if (!ret || ret.argument.type !== 'ObjectExpression') throw new Error(`${fnName} must end with return { ... }`);
  const props = ret.argument.properties, name = (p) => p.key.name || p.key.value;
  const missing = keep.filter((k) => !props.some((p) => name(p) === k));
  if (missing.length) throw new Error(`${fnName} no longer returns: ${missing.join(', ')}`);
  let out = src;
  for (const p of props.filter((q) => !keep.includes(name(q))).reverse()) {
    let end = p.end; const m = /^\s*,/.exec(out.slice(end)); if (m) end += m[0].length;
    out = out.slice(0, p.start) + out.slice(end);
  }
  return out;
}

const brotli = (buf) => zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }).length;
export const sizeOf = (text) => { const buf = Buffer.from(text); return { raw: buf.length, gzip: zlib.gzipSync(buf, { level: 9 }).length, brotli: brotli(buf) }; };

/** -> { inline: "(function(){...})()", body, doc } */
export async function buildInline(doc) {
  const core = pruneReturn(stripRegions(stripModule(readText(P('src', 'lib', 'time', 'core.js')))));
  const bridge = stripModule(readText(P('src', 'lib', 'time', 'bridge.js')));
  const slim = inlineDoc(doc);
  const body = `${core}\n${bridge}\nreturn makeBridge(makeCore(${JSON.stringify(slim)}));`;
  const r = await terser('var G=(function(){' + body + '})();', { ecma: 2015, compress: { passes: 3, pure_getters: true }, mangle: true, format: { wrap_iife: true, comments: false } });
  const m = /^var G=(\(function\(\)\{[\s\S]*\}\)\(\));$/.exec(r.code);
  if (!m) throw new Error('unexpected terser output shape: ' + r.code.slice(0, 80) + ' ... ' + r.code.slice(-40));
  return { inline: m[1], body, doc: slim };
}

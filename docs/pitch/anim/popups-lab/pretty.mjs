// Prettify an entry bundle so that the line numbers quoted in 02-popups.md can be found again:
//   node docs/pitch/anim/popups-lab/pretty.mjs release/R1c/dist/assets/index-2531699e.js (a terser-prettified copy of the entry bundle)
import { minify } from '../../../../node_modules/terser/main.js';
import fs from 'fs';
const [inp, out] = process.argv.slice(2);
const r = await minify(fs.readFileSync(inp, 'utf8'), { compress: false, mangle: false, format: { beautify: true, comments: false }, module: true });
fs.writeFileSync(out, r.code);
console.log(out, r.code.split('\n').length, 'lines');

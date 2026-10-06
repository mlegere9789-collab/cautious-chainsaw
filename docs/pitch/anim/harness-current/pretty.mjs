import { minify } from '../../../node_modules/terser/main.js';
import fs from 'fs';
const R = 'C:/Users/mlege/gettysburg-map/';
for (const [inp,out] of [['baseline/dist/assets/index-Cg8FAMXN.js','tmp/pitch-anim/a1/base.pretty.js'],['release/R1c/dist/assets/index-2531699e.js','tmp/pitch-anim/a1/r1c.pretty.js']]) {
  const code = fs.readFileSync(R+inp,'utf8');
  const r = await minify(code, {compress:false, mangle:false, format:{beautify:true, comments:false}, module:true});
  fs.writeFileSync(R+out, r.code);
  console.log(out, r.code.split('\n').length);
}

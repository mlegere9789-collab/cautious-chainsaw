import fs from 'node:fs';
import crypto from 'node:crypto';
const R = 'C:/Users/mlege/gettysburg-map/';
const files = { baseline: R + 'baseline/dist/assets/index-Cg8FAMXN.js', r1c: R + 'release/R1c/dist/assets/index-2531699e.js' };
const names = ['function F4(', 'function y1(', 'function lS(', 'function Ed(', 'function Gk(', 'function e1(', 'function dA(', 'function cA(', 'function uF(', 'function lA(', 'function Y4(', 'function X4(', 'function cx(', 'function aT(', 'function Xx(', 'function gF(', 'function CF(', 'function LF(', 'function qF(', 'function nO(', 'function MF(', 'function VF(', 'function tO(', 'function J4(', 'function K4(', 'function GtbgRepaint(', 'const cF = 500', 'cF=500', 'eO=3500', 'function _F(', 'function I4(', 'function A4(', 'function fF('];
const out = {};
for (const [k, f] of Object.entries(files)) {
  const src = fs.readFileSync(f, 'utf8'); const lines = src.split('\n');
  const loc = (needle) => { const i = src.indexOf(needle); if (i < 0) return null; const before = src.slice(0, i); const line = before.split('\n').length; const col = i - before.lastIndexOf('\n'); return `${line}:${col}`; };
  out[k] = { file: f.replace(R, ''), bytes: src.length, md5: crypto.createHash('md5').update(fs.readFileSync(f)).digest('hex'), lines: lines.length, where: Object.fromEntries(names.map((n) => [n, loc(n)]).filter(([, v]) => v)) };
}
fs.writeFileSync('locate.json', JSON.stringify(out, null, 2)); console.log(JSON.stringify(out, null, 1));

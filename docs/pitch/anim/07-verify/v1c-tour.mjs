// v1c-tour.mjs - the 16 auto-tour stops in the page data against the shipped bundle: the array literal (objects carrying tickWindow) is cut out of the minified bundle by bracket matching and evaluated;
// every field the page shows (title, subtitle, narrative, lat, lng, zoom, tick, tickWindow, videoUrl) is compared.
import fs from 'node:fs';
import path from 'node:path';
import { PROTO, writeJson } from './lib.mjs';
import { bundle } from './srcdata.mjs';

const pd = JSON.parse(fs.readFileSync(path.join(PROTO, 'data', 'popup-data.json'), 'utf8'));
const i0 = bundle.indexOf('tickWindow:'); const a = bundle.lastIndexOf('[{', i0);
let depth = 0; let j = a; let inStr = null; const BS = String.fromCharCode(92);
for (; j < bundle.length; j++) {
  const c = bundle[j];
  if (inStr) { if (c === BS) { j++; continue; } if (c === inStr) inStr = null; continue; }
  if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
  if (c === '[') depth++; else if (c === ']') { depth--; if (depth === 0) break; }
}
const arr = new Function('return ' + bundle.slice(a, j + 1))();
const res = { bundleStops: arr.length, pageStops: pd.tour.length, mismatches: [] };
arr.forEach((s, i) => {
  const p = pd.tour[i];
  for (const k of ['id', 'title', 'subtitle', 'lat', 'lng', 'zoom', 'tick', 'tickWindow', 'narrative']) if (!p || p[k] !== s[k]) res.mismatches.push({ stop: s.id, field: k });
  if (((p && p.videoUrl) || null) !== (s.videoUrl || null)) res.mismatches.push({ stop: s.id, field: 'videoUrl' });
});
console.log(JSON.stringify(res)); writeJson('v1c-tour.json', res);

// Visual-check helper: fetch the page image of an IA leaf and crop the band that contains a text line (found in the djvu.xml word boxes),
// so a reader can look at the printed figures themselves instead of trusting the OCR. Used to produce data-src/*/visual_readings.json.
//   node tools/environment/ia-crop.mjs <ia-id> <leaf> <regex> [out.jpg] [padPx=260]
// The image comes from archive.org's BookReader image endpoint (the leaf index equals the djvu.xml page index, see ia-pages.mjs) and is cached
// in tmp/env-cache/. Nothing is committed except the readings made from it.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fetchCached, CACHE_DIR } from './fetch.mjs';

export async function lineBoxes(id, leaf) {
  const xml = fs.readFileSync(path.join(CACHE_DIR, `ia-${id}-djvu.xml`), 'utf8');
  let idx = -1, pos = 0, start = -1, end = -1, w = 0, h = 0;
  const re = /<OBJECT [^>]*?width="(\d+)" height="(\d+)">/g;
  let m;
  while ((m = re.exec(xml))) { idx++; if (idx === leaf) { start = m.index; w = +m[1]; h = +m[2]; } else if (idx === leaf + 1) { end = m.index; break; } }
  if (start < 0) throw new Error('leaf not found');
  const body = xml.slice(start, end < 0 ? undefined : end);
  const lines = [];
  for (const lm of body.matchAll(/<LINE>([\s\S]*?)<\/LINE>/g)) {
    const words = [...lm[1].matchAll(/<WORD coords="(\d+),(\d+),(\d+),(\d+)"[^>]*>([^<]*)<\/WORD>/g)];
    if (!words.length) continue;
    const text = words.map((x) => x[5]).join(' ').replace(/\s+/g, ' ').trim();
    const ys = words.flatMap((x) => [+x[2], +x[4]]);
    lines.push({ text, top: Math.min(...ys), bottom: Math.max(...ys) });
  }
  return { w, h, lines };
}

export async function cropForLine(id, leaf, pattern, out, pad = 260) {
  const { w, h, lines } = await lineBoxes(id, leaf);
  const re = new RegExp(pattern, 'i');
  const hit = lines.filter((l) => re.test(l.text));
  if (!hit.length) throw new Error('no line matches ' + pattern + '; first lines: ' + lines.slice(0, 5).map((l) => l.text).join(' / '));
  const top = Math.max(0, Math.min(...hit.map((l) => l.top)) - pad), bottom = Math.min(h, Math.max(...hit.map((l) => l.bottom)) + pad);
  const img = await fetchCached(`https://archive.org/download/${id}/page/n${leaf}_w1400.jpg`, { name: `${id}-n${leaf}.jpg` });
  const outFile = out || path.join(CACHE_DIR, `_crop-${id}-n${leaf}.jpg`);
  const py = `from PIL import Image\nim=Image.open(r'${img.file}'); W,H=im.size; s=W/${w}\nim.crop((0,int(${top}*s),W,int(${bottom}*s))).save(r'${outFile}')\nprint(W,H,int(${top}*s),int(${bottom}*s))`;
  const r = spawnSync('python', ['-c', py], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr);
  return { outFile, sha256: img.meta.sha256, bytes: img.meta.bytes, info: r.stdout.trim(), matched: hit.map((l) => l.text) };
}

if (process.argv[1] && path.basename(process.argv[1]) === 'ia-crop.mjs') {
  const [id, leaf, pattern, out, pad] = process.argv.slice(2);
  cropForLine(id, +leaf, pattern, out, pad ? +pad : 260).then((r) => console.log(JSON.stringify(r, null, 1))).catch((e) => { console.error(e.message); process.exit(1); });
}

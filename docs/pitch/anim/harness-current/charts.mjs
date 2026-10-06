// Three small SVG charts from the measured data (no libraries).
import fs from 'node:fs';
const W = 'C:/Users/mlege/gettysburg-map/tmp/pitch-anim/a1/';
const OUT = 'C:/Users/mlege/gettysburg-map/docs/pitch/anim/shots/current/';
const J = (f) => JSON.parse(fs.readFileSync(W + f, 'utf8'));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const head = (w, h, title) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" font-family="Segoe UI, Arial, sans-serif" font-size="12"><title>${esc(title)}</title><rect width="${w}" height="${h}" fill="#ffffff"/>`;
// ---------------------------------------------------------------- F1: exemplar unit steps per frame
{
  const e = J('exemplar-trace.json'); const w = 900, h = 380, l = 60, r = 20, t = 50, b = 60;
  const frames = e.stepsPx.map((v, i) => ({ i, v })).filter((x) => x.i >= 26 && x.i <= 66);
  const sq = (v) => Math.sqrt(v); const maxV = 520; const y = (v) => h - b - (sq(v) / sq(maxV)) * (h - t - b);
  const bw = (w - l - r) / frames.length;
  let s = head(w, h, 'Per-frame movement of unit C-I-3-3 across a tick boundary') + `<text x="${l}" y="22" font-size="15" font-weight="600">One unit, frame by frame: C-I-3-3 (Charging Line), 1x, 60 fps, zoom 15</text><text x="${l}" y="40" fill="#555">distance moved since the previous frame, in screen pixels (square-root axis); ticks 549 to 551 of the shipped playback loop</text>`;
  for (const v of [0, 10, 50, 100, 250, 500]) s += `<line x1="${l}" x2="${w - r}" y1="${y(v)}" y2="${y(v)}" stroke="#e5e5e5"/><text x="${l - 6}" y="${y(v) + 4}" text-anchor="end" fill="#555">${v}</text>`;
  frames.forEach((f, k) => { const x = l + k * bw; const col = f.v > 300 ? '#c43a3a' : '#3a6bc4'; s += `<rect x="${x + 1}" y="${y(f.v)}" width="${bw - 2}" height="${h - b - y(f.v)}" fill="${col}"/>`; if (k % 4 === 0) s += `<text x="${x + bw / 2}" y="${h - b + 16}" text-anchor="middle" fill="#555">${f.i}</text>`; });
  const note = (frame, text, dy = -8) => { const k = frames.findIndex((f) => f.i === frame); const x = l + k * bw + bw / 2; s += `<text x="${x}" y="${y(e.stepsPx[frame]) + dy}" text-anchor="middle" font-weight="600" fill="#222">${esc(text)}</text>`; };
  note(31, 'hop 435 px'); { const k = frames.findIndex((f) => f.i === 60); s += `<text x="${l + k * bw + bw / 2 - 8}" y="${y(504) + 14}" text-anchor="end" font-weight="600" fill="#222">snap-back 504 px (frame 60)</text><text x="${l + (k + 1) * bw + bw / 2 + 6}" y="${y(506) - 8}" text-anchor="start" font-weight="600" fill="#222">forward 506 px</text>`; }
  s += `<text x="${l + 12 * bw}" y="${y(60)}" fill="#3a6bc4">eased move 2.7 to 33 px per frame</text>`;
  s += `<text x="${l}" y="${h - 30}" fill="#555">frame number (16.7 ms each). Before frame 31 the unit holds still although its tick is running; its keyframe then arrives as one jump (frame 31);</text><text x="${l}" y="${h - 14}" fill="#555">the next tick (frame 60) draws the unit back at the start of the segment for one frame, then jumps it to the end (frame 61).</text></svg>`;
  fs.writeFileSync(OUT + 'fig-01-one-unit-frame-by-frame.svg', s);
}
// ---------------------------------------------------------------- F2: frame interval classes
{
  const runs = [['production, same ticks (smaller, wrong tile set)', 'runs-baseline-timing-desktop.json', 'timing-1x-dense-z13.5'], ['R1c, dense (tick 520-560, 1x)', 'runs-r1c-timing-desktop.json', 'timing-1x-dense-z13.5'], ['R1c, dense, 4x speed', 'runs-r1c-timing-desktop.json', 'timing-4x-dense-z13.5'], ['R1c, sparse (tick 60-100, 1x)', 'runs-r1c-timing-desktop.json', 'timing-1x-sparse-z13.5'], ['R1c, dense, CPU throttled 4x', 'runs-r1c-timing-desktop.json', 'timing-1x-cpu4-dense-z13.5']];
  const bins = [['16.7 ms (60 fps)', 0, 20], ['33 ms (30 fps)', 20, 40], ['50 ms', 40, 60], ['67-100 ms', 60, 110], ['over 110 ms', 110, 1e9]];
  const cols = ['#9bbf9b', '#e0b84a', '#e08a4a', '#c43a3a', '#7a1a1a'];
  const w = 900, h = 400, l = 230, r = 20, t = 60, b = 40; const rowH = (h - t - b) / runs.length;
  let s = head(w, h, 'Share of page frames by interval') + `<text x="20" y="22" font-size="15" font-weight="600">How long each page frame took (real Chrome, headless=new, Intel Arc GPU)</text><text x="20" y="40" fill="#555">share of frames by interval, 20 s per run (15 s when CPU throttled)</text>`;
  runs.forEach(([label, file, run], k) => {
    const d = J(file).runs.find((x) => x.label === run); const dts = []; for (let i = 1; i < d.raf.length; i++) dts.push(d.raf[i] - d.raf[i - 1]);
    let x = l; const yy = t + k * rowH + 8; s += `<text x="${l - 8}" y="${yy + 18}" text-anchor="end">${esc(label)}</text>`;
    bins.forEach(([n, lo, hi], j) => { const c = dts.filter((v) => v >= lo && v < hi).length / dts.length; const bw = c * (w - l - r); if (bw > 0.5) s += `<rect x="${x}" y="${yy}" width="${bw}" height="${rowH - 16}" fill="${cols[j]}"/>`; if (bw > 34) s += `<text x="${x + bw / 2}" y="${yy + 18}" text-anchor="middle" font-size="11" fill="#111">${Math.round(c * 100)}%</text>`; x += bw; });
  });
  bins.forEach(([n], j) => { s += `<rect x="${l + j * 130}" y="${h - 26}" width="12" height="12" fill="${cols[j]}"/><text x="${l + j * 130 + 16}" y="${h - 16}">${esc(n)}</text>`; });
  fs.writeFileSync(OUT + 'fig-02-frame-intervals.svg', s + '</svg>');
}
// ---------------------------------------------------------------- F3: overlap vs zoom (desktop default centre)
{
  const m = J('overlap-summary.json'); const rows = Object.values(m).filter((v) => v.mode === 'view'); const w = 900, h = 400, l = 70, r = 30, t = 60, b = 60;
  const x = (i) => l + (i + 0.5) * ((w - l - r) / rows.length); const y = (p) => h - b - p * (h - t - b);
  let s = head(w, h, 'Overlap of unit tiles by zoom') + `<text x="20" y="22" font-size="15" font-weight="600">Share of drawn tiles that touch another tile or are at least half hidden</text><text x="20" y="40" fill="#555">1440 x 852 map, default centre, current tile size, mean over all 675 ticks (R1c carry-forward display); zoom 12 and below is below the desktop minimum of 12.04</text>`;
  for (const p of [0, 0.25, 0.5, 0.75, 1]) s += `<line x1="${l}" x2="${w - r}" y1="${y(p)}" y2="${y(p)}" stroke="#e5e5e5"/><text x="${l - 6}" y="${y(p) + 4}" text-anchor="end" fill="#555">${p * 100}%</text>`;
  const series = [['touch another tile', (v) => v.tilesTouchingAnotherTile.mean / v.tilesDrawn.mean, '#3a6bc4'], ['half or more hidden', (v) => v.tilesHalfOrMoreHidden.mean / v.tilesDrawn.mean, '#c43a3a']];
  const bwid = 26;
  rows.forEach((v, i) => series.forEach(([n, f, c], k) => { const val = f(v); s += `<rect x="${x(i) - bwid + k * bwid}" y="${y(val)}" width="${bwid - 2}" height="${h - b - y(val)}" fill="${c}"/><text x="${x(i) - bwid + k * bwid + bwid / 2 - 1}" y="${y(val) - 4}" text-anchor="middle" font-size="11">${Math.round(val * 100)}</text>`; }));
  rows.forEach((v, i) => { s += `<text x="${x(i)}" y="${h - b + 18}" text-anchor="middle">z${v.zoom}</text><text x="${x(i)}" y="${h - b + 34}" text-anchor="middle" fill="#555" font-size="11">${Math.round(v.tilesDrawn.mean)} tiles</text>`; });
  series.forEach(([n, , c], k) => { s += `<rect x="${w - 330 + k * 160}" y="12" width="12" height="12" fill="${c}"/><text x="${w - 314 + k * 160}" y="23">${esc(n)}</text>`; });
  fs.writeFileSync(OUT + 'fig-03-overlap-by-zoom.svg', s + '</svg>');
}
console.log('charts written');

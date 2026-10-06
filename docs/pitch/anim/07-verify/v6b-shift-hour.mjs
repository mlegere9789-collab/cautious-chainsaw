// v6b-shift-hour.mjs - "Shift steps an hour": Shift + arrow moves 12 ticks (app.mjs).  How long is 12 ticks on the candidate clock?  Computed from the 33 anchors of data-src/time/time_anchors.json (piecewise linear).
import fs from 'node:fs';
import path from 'node:path';
import { REPO, writeJson } from './lib.mjs';
const doc = JSON.parse(fs.readFileSync(path.join(REPO, 'data-src', 'time', 'time_anchors.json'), 'utf8'));
const A = doc.anchors.map((a) => { const m = /^1863-07-(\d\d)T(\d\d):(\d\d)$/.exec(a.t); return { tick: a.tick, min: (+m[1] - 1) * 1440 + +m[2] * 60 + +m[3] }; });
const mn = (t) => { let i = 0; while (i < A.length - 2 && A[i + 1].tick <= t) i++; return A[i].min + (A[i + 1].min - A[i].min) * (t - A[i].tick) / (A[i + 1].tick - A[i].tick); };
const d = []; for (let t = 1; t <= 663; t++) d.push(mn(t + 12) - mn(t)); d.sort((a, b) => a - b); const q = (p) => d[Math.floor(p * (d.length - 1))];
const res = { positions: d.length, minMinutes: +d[0].toFixed(1), p10: +q(0.1).toFixed(1), median: +q(0.5).toFixed(1), p90: +q(0.9).toFixed(1), maxMinutes: +d[d.length - 1].toFixed(1), shareWithin60pm10: +(100 * d.filter((x) => Math.abs(x - 60) <= 10).length / d.length).toFixed(1), shareUnder30: +(100 * d.filter((x) => x < 30).length / d.length).toFixed(1), shareOver120: +(100 * d.filter((x) => x > 120).length / d.length).toFixed(1) };
console.log(JSON.stringify(res)); writeJson('v6b-shift-hour.json', res);

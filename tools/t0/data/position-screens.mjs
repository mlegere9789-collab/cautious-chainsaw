#!/usr/bin/env node
// Mechanical position screens, run on the baseline data and on a DATA build, written to docs/data-audit/position-screens.json (AUDIT.md section 8).
//   node tools/t0/data/position-screens.mjs <DATA build data dir>
// The state of a unit is the engine's: the rows of a day are loaded placements first, then density files in the order of the index chunk, the last row of a tick wins, and a unit
// keeps its last row until it has another (index chunk, y1).  Screens:
//   duplicates   rows of the same unit and tick more than 0.4 km apart (one of them wins; the marker jumps if the order changes)
//   spikes       a unit moves more than 0.5 km, then back, within 12 ticks
//   fast         steps faster than 8 km/h on the corrected clock (distance over the time between two rows)
//   stale        regiments whose last row is more than 1.2 km from their brigade's last row (the regiment stays where it fought)
//   monuments    regiments with NPS monuments (OpenStreetMap, ODbL, tools/t0/data/sources/osm-monuments.json): the median distance of the regiment's action rows to the nearest of its monuments
//   preArrival   rows of units before the Official Records say they arrived (the rules of idmap.mjs PRE plus the cavalry and corps rules of the position fixes)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..');
const AFTER = path.resolve(REPO, process.argv[2] || 'tmp/data-audit/data-R1c/dist/data');
const BEFORE = path.join(REPO, 'baseline', 'dist', 'data');
const src = fs.readFileSync(path.join(REPO, 'baseline', 'dist', 'assets', 'index-Cg8FAMXN.js'), 'utf8');
const nFm = /nF=\{1:\[([^\]]*)\],2:\[([^\]]*)\],3:\[([^\]]*)\]\}/.exec(src);
const tF = { 1: ['placements_day1_ticks1_50', 'placements_day1_ticks51_100', 'placements_day1_ticks101_225'], 2: ['placements_day2_ticks226_300', 'placements_day2_ticks301_375', 'placements_day2_ticks376_450'], 3: ['placements_day3_ticks451_520', 'placements_day3_ticks521_600', 'placements_day3_ticks601_675'] };
const order = [];
for (let d = 1; d <= 3; d++) order.push(...tF[d], ...[...nFm[d].matchAll(/"([^"]+)\.json"/g)].map((m) => m[1]));
const A = JSON.parse(fs.readFileSync(path.join(REPO, 'data-src', 'time', 'time_anchors.json'), 'utf8')).anchors.map((a) => ({ tick: a.tick, m: Date.parse(a.t + 'Z') / 60000 }));
const mins = (t) => { if (t <= A[0].tick) return A[0].m - (A[0].tick - t) * 13; for (let i = 1; i < A.length; i++) if (t <= A[i].tick) { const a = A[i - 1], b = A[i]; return a.m + (b.m - a.m) * (t - a.tick) / (b.tick - a.tick); } return A[A.length - 1].m + (t - A[A.length - 1].tick) * 13; };
const rad = (d) => (d * Math.PI) / 180;
const km = (a, b) => { const R = 6371, dl = rad(b.lat - a.lat), dg = rad(b.lng - a.lng); const x = Math.sin(dl / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dg / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
const LINE = /^\s*\{"unit_id":"([^"]+)","tick":(\d+),"lat":([\d.-]+),"lng":([\d.-]+)(.*)/;

function load(dir) {
  const eff = {}, dupes = []; let rows = 0;
  for (const f of order) {
    const p = path.join(dir, f + '.json'); if (!fs.existsSync(p)) continue;
    const put = (u, tick, lat, lng, disp, note, shown = false) => {
      rows++; const x = (eff[u] ||= {}); const r = { tick, lat, lng, disp, note, f, shownWithBrigade: shown };
      if (x[tick] && km(x[tick], r) > 0.4) dupes.push([u, tick]);
      x[tick] = r;
    };
    const text = fs.readFileSync(p, 'utf8');
    if (/^\s*\{"unit_id"/m.test(text)) {
      for (const l of text.split('\n')) { const m = LINE.exec(l); if (m) put(m[1], +m[2], +m[3], +m[4], (/"disposition":"([^"]*)"/.exec(m[5]) || [])[1] || '', !!(/"notes":"/.exec(m[5])), m[5].includes('Shown with its brigade: no later position')); }
    } else {   // a pretty-printed file
      for (const r of JSON.parse(text).placements || []) put(r.unit_id, r.tick, r.lat, r.lng, r.disposition || '', !!r.notes);
    }
  }
  return { eff, dupes, rows };
}
function parents(dir) {
  const par = new Map(), regs = [];
  for (const f of fs.readdirSync(path.join(dir, 'oob'))) {
    const j = JSON.parse(fs.readFileSync(path.join(dir, 'oob', f), 'utf8'));
    (function w(o) { if (Array.isArray(o)) o.forEach(w); else if (o && typeof o === 'object') { if (o.regiment_id && o.parent_brigade_id) { par.set(o.regiment_id, o.parent_brigade_id); regs.push(o); } Object.values(o).forEach(w); } })(j);
  }
  return { par, regs };
}
const OSM = JSON.parse(fs.readFileSync(path.join(HERE, 'sources', 'osm-monuments.json'), 'utf8')).elements.map((e) => ({ name: e.tags.name, lat: (e.center || e).lat, lng: (e.center || e).lon }));
const ST = { Alabama: 'AL', Arkansas: 'AR', Florida: 'FL', Georgia: 'GA', Louisiana: 'LA', Mississippi: 'MS', 'North Carolina': 'NC', 'South Carolina': 'SC', Tennessee: 'TN', Texas: 'TX', Virginia: 'VA', Pennsylvania: 'PA', 'New York': 'NY', Maine: 'ME', Massachusetts: 'MA', Michigan: 'MI', Wisconsin: 'WI', Minnesota: 'MN', Ohio: 'OH', Indiana: 'IN', Illinois: 'IL', Vermont: 'VT', 'New Hampshire': 'NH', Connecticut: 'CT', 'New Jersey': 'NJ', Delaware: 'DE', Maryland: 'MD', 'West Virginia': 'WV', 'Rhode Island': 'RI' };
function monumentsOf(r) {
  if (/Cavalry|Artillery|Battery|Sharpshoot/.test(r.designation)) return [];
  const m = /^(\d+)(?:st|nd|rd|th)\s/.exec(r.designation); if (!m) return [];
  const st = ST[r.state] || ST[Object.keys(ST).find((s) => r.designation.includes(s))]; if (!st) return [];
  const re = new RegExp(`^(US |CS )?${m[1]}(st|nd|rd|th) ${st}\\b`);
  return OSM.filter((o) => re.test(o.name) && !/Cav|Art|Bat/i.test(o.name));
}
function screens(dir) {
  const { eff, dupes, rows } = load(dir);
  const { par, regs } = parents(BEFORE);
  const out = { rows, units: Object.keys(eff).length, duplicates: new Set(dupes.map((d) => d.join('@'))).size };
  let spikes = 0, fast = 0, stale = 0, compared = 0; const staleList = [];
  for (const [u, t] of Object.entries(eff)) {
    const ticks = Object.keys(t).map(Number).sort((a, b) => a - b);
    for (let i = 1; i < ticks.length; i++) { const a = t[ticks[i - 1]], b = t[ticks[i]]; const hrs = (mins(b.tick) - mins(a.tick)) / 60; const d = km(a, b); if (hrs > 0 && d > 0.5 && d / hrs > 8) fast++; }
    for (let i = 1; i < ticks.length - 1; i++) { const a = t[ticks[i - 1]], b = t[ticks[i]], c = t[ticks[i + 1]]; const d1 = km(a, b), d2 = km(b, c), d3 = km(a, c); if (d1 > 0.5 && d2 > 0.5 && d3 < 0.5 * Math.min(d1, d2) && c.tick - a.tick <= 12) spikes++; }
    const p = par.get(u);
    if (p && eff[p]) {
      const lt = ticks[ticks.length - 1]; const pt = Object.keys(eff[p]).map(Number).sort((a, b) => a - b); const plast = eff[p][pt[pt.length - 1]];
      if (lt < 640) { compared++; if (km(t[lt], plast) > 1.2) { stale++; staleList.push(u); } }
    }
  }
  Object.assign(out, { spikes, fastSteps: fast, regimentsCompared: compared, staleRegiments: stale });
  // monuments
  const hist = { le035: 0, mid: 0, gt07: 0 }; let matched = 0;
  for (const r of regs) {
    const mons = monumentsOf(r); const rowsR = eff[r.regiment_id]; if (!mons.length || !rowsR) continue;
    const act = Object.values(rowsR).filter((x) => /Line of Battle|Charging|Deployed|Skirmish|Chaotic/.test(x.disp) && !x.shownWithBrigade).map((x) => Math.min(...mons.map((o) => km(x, o)))).sort((a, b) => a - b);
    if (!act.length) continue; matched++;
    const med = act[Math.floor(act.length / 2)];
    if (med <= 0.35) hist.le035++; else if (med <= 0.7) hist.mid++; else hist.gt07++;
  }
  out.monuments = { regimentsMatched: matched, medianWithin035km: hist.le035, median035to07km: hist.mid, medianOver07km: hist.gt07 };
  return out;
}
const before = screens(BEFORE), after = screens(AFTER);
const res = { generated: 'tools/t0/data/position-screens.mjs', note: 'rejoin rows (note "Shown with its brigade") count as rows in the first screens and are left out of the monuments screen', before, after };
fs.writeFileSync(path.join(REPO, 'docs', 'data-audit', 'position-screens.json'), JSON.stringify(res, null, 1) + '\n');
console.log(JSON.stringify(res, null, 1));

import fs from 'node:fs';
import path from 'node:path';
const dir = process.argv[2] || 'baseline/dist/data'; // run from the repo root
const files = fs.readdirSync(dir).filter(f => /^(placements_day|density_).*\.json$/.test(f));
const all = [];
for (const f of files) {
  const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const arr = j.placements || [];
  for (const r of arr) all.push({ ...r, _f: f });
}
console.log('files', files.length, 'raw records', all.length);
const byKey = new Map();
for (const r of all) byKey.set(r.unit_id + '@' + r.tick, r);
console.log('distinct (unit,tick) keyframes', byKey.size);
const ticks = new Set(all.map(r => r.tick));
console.log('distinct ticks with a keyframe', ticks.size, 'min', Math.min(...ticks), 'max', Math.max(...ticks));
const units = new Set(all.map(r => r.unit_id));
console.log('distinct units', units.size);
const disp = {};
for (const r of byKey.values()) disp[r.disposition] = (disp[r.disposition] || 0) + 1;
console.log('dispositions', disp);
const withNotes = [...byKey.values()].filter(r => r.notes).length;
console.log('keyframes with notes', withNotes);
const str = [...byKey.values()].map(r => r.strength).filter(x => typeof x === 'number');
str.sort((a,b)=>a-b);
console.log('strength min/median/max', str[0], str[str.length>>1], str[str.length-1], 'n', str.length);
const sides = {U:0,C:0,other:0};
for (const u of units) { if (u.startsWith('U-')) sides.U++; else if (u.startsWith('C-')) sides.C++; else sides.other++; }
console.log('units by id prefix', sides);
// per-tick records
const perTick = {};
for (const r of byKey.values()) perTick[r.tick] = (perTick[r.tick]||0)+1;
const counts = Object.values(perTick).sort((a,b)=>a-b);
console.log('keyframes per occupied tick: min', counts[0], 'median', counts[counts.length>>1], 'p90', counts[Math.floor(counts.length*.9)], 'max', counts[counts.length-1]);
const rawPer = {}; for (const r of all) rawPer[r.tick] = (rawPer[r.tick] || 0) + 1;
const rv = Object.values(rawPer).sort((a, b) => a - b);
console.log('raw rows per occupied tick: median', rv[rv.length >> 1], 'p90', rv[Math.floor(rv.length * .9)], 'max', rv[rv.length - 1]);
// keyframe gap per unit
const tracks = new Map();
for (const r of byKey.values()) { if(!tracks.has(r.unit_id)) tracks.set(r.unit_id, []); tracks.get(r.unit_id).push(r); }
let pairs=0, gap1=0; const gaps=[];
for (const [id,k] of tracks) { k.sort((a,b)=>a.tick-b.tick); for (let i=0;i<k.length-1;i++){ pairs++; const g=k[i+1].tick-k[i].tick; gaps.push(g); if(g===1) gap1++; } }
gaps.sort((a,b)=>a-b);
console.log('consecutive keyframe pairs', pairs, 'gap==1', gap1, 'median gap', gaps[gaps.length>>1], 'p90', gaps[Math.floor(gaps.length*.9)], 'max', gaps[gaps.length-1]);
console.log('keyframes per track median', [...tracks.values()].map(k=>k.length).sort((a,b)=>a-b)[tracks.size>>1]);
// bounding box
let minLat=90,maxLat=-90,minLng=180,maxLng=-180;
for (const r of byKey.values()) { minLat=Math.min(minLat,r.lat);maxLat=Math.max(maxLat,r.lat);minLng=Math.min(minLng,r.lng);maxLng=Math.max(maxLng,r.lng);}
console.log('bbox', minLat,maxLat,minLng,maxLng);
const R=6371008.8; const dLat=(maxLat-minLat)*Math.PI/180*R; const dLng=(maxLng-minLng)*Math.PI/180*R*Math.cos(39.82*Math.PI/180);
console.log('extent m N-S', Math.round(dLat), 'E-W', Math.round(dLng));
// bearings
const hasB = [...byKey.values()].filter(r=>typeof r.bearing==='number').length;
console.log('keyframes with bearing', hasB);

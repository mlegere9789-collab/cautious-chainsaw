import fs from 'node:fs';
import path from 'node:path';
const dir = process.argv[2] || 'baseline/dist/data'; // run from the repo root
const files = fs.readdirSync(dir).filter(f => /^(placements_day|density_).*\.json$/.test(f)).sort();
const byKey = new Map();
for (const f of files) for (const r of JSON.parse(fs.readFileSync(path.join(dir,f),'utf8')).placements||[]) byKey.set(r.unit_id+'@'+r.tick, r);
const tracks = new Map();
for (const r of byKey.values()) { if(!tracks.has(r.unit_id)) tracks.set(r.unit_id, []); tracks.get(r.unit_id).push(r); }
for (const k of tracks.values()) k.sort((a,b)=>a.tick-b.tick);
const mLat=111132, mLng=111320*Math.cos(39.82*Math.PI/180);
function stateAt(t){ const out=[]; for (const [id,k] of tracks){ if(t<k[0].tick) continue; let i=0; while(i<k.length-1 && k[i+1].tick<=t) i++; const a=k[i], b=k[i+1]; if(!b){out.push({id,x:a.lng*mLng,y:a.lat*mLat,lastTick:a.tick,d:a.disposition,s:a.strength}); continue;} const f=(t-a.tick)/(b.tick-a.tick); out.push({id,x:(a.lng+(b.lng-a.lng)*f)*mLng,y:(a.lat+(b.lat-a.lat)*f)*mLat,lastTick:a.tick,d:a.disposition,s:a.strength}); } return out; }
const s=stateAt(548);
const groups=new Map();
for(const u of s){ const k=Math.round(u.x)+','+Math.round(u.y); if(!groups.has(k)) groups.set(k,[]); groups.get(k).push(u); }
let n=0, sizes={};
for(const g of groups.values()){ if(g.length>1){ sizes[g.length]=(sizes[g.length]||0)+1; if(n<12){ console.log(g.map(u=>u.id+'('+u.d+',last kf '+u.lastTick+')').join('  |  ')); n++; } } }
console.log('group sizes at tick 548 (stack size -> count)',sizes);
// how many units are carried by hold-forward from a keyframe more than 100 ticks old at tick 548
const stale=s.filter(u=>548-u.lastTick>100).length;
console.log('units at 548 whose last keyframe is >100 ticks old (held)',stale,'of',s.length);
const dn = new Set(s.map(u=>u.id)); 
console.log('unit id kinds:', [...tracks.keys()].filter(k=>k.startsWith('U-ART')||k.startsWith('U-HAB')||k.includes('CAV')).length);

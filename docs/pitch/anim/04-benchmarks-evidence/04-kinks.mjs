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
const mpp=z=>78271.51696*Math.cos(39.82*Math.PI/180)/Math.pow(2,z);
let interior=0, kink1=0, kink3=0, tracks3=0; const dvs=[];
for (const [id,k] of tracks){ if(k.length<3) continue; tracks3++; for(let i=1;i<k.length-1;i++){ const a=k[i-1],b=k[i],c=k[i+1]; const vin=[(b.lng-a.lng)*mLng/(b.tick-a.tick),(b.lat-a.lat)*mLat/(b.tick-a.tick)]; const vout=[(c.lng-b.lng)*mLng/(c.tick-b.tick),(c.lat-b.lat)*mLat/(c.tick-b.tick)]; const dv=Math.hypot(vout[0]-vin[0],vout[1]-vin[1]); // m/tick
  const pxf=dv*2/mpp(15)/60; // z15, 1x, 60Hz
  interior++; dvs.push(pxf); if(pxf>1) kink1++; if(pxf>3) kink3++; } }
dvs.sort((a,b)=>a-b);
const q=p=>dvs[Math.floor(p*(dvs.length-1))];
console.log('tracks with >=3 keyframes',tracks3,'interior keyframes',interior);
console.log('speed discontinuity at a keyframe under piecewise-linear interpolation, px/frame at z15, 1x, 60 Hz: median',q(.5).toFixed(2),'p90',q(.9).toFixed(2),'max',dvs[dvs.length-1].toFixed(1));
console.log('keyframes with a speed step > 1 px/frame:',kink1,'('+(kink1/interior*100).toFixed(0)+'%); > 3 px/frame:',kink3,'('+(kink3/interior*100).toFixed(0)+'%)');
console.log('A C1 spline (Catmull-Rom / monotone Hermite) has zero step by construction; a critically damped follower converts any step into a smooth ramp over ~4/omega.');

// Splits the keyframe velocity step into a scalar speed change and a heading change (run from the repo root).
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
let n=0, moving2=0; const turns=[]; const dsp=[];
for (const k of tracks.values()) { for (let i=1;i<k.length-1;i++){ const a=k[i-1],b=k[i],c=k[i+1]; n++;
  const vin=[(b.lng-a.lng)*mLng/(b.tick-a.tick),(b.lat-a.lat)*mLat/(b.tick-a.tick)];
  const vout=[(c.lng-b.lng)*mLng/(c.tick-b.tick),(c.lat-b.lat)*mLat/(c.tick-b.tick)];
  const si=Math.hypot(...vin), so=Math.hypot(...vout);
  dsp.push(Math.abs(so-si)*2/mpp(15)/60);   // scalar speed step, px/frame at z15, 1x, 60 Hz
  if (si>0.5 && so>0.5) { moving2++; let t=Math.abs(Math.atan2(vout[1],vout[0])-Math.atan2(vin[1],vin[0]))*180/Math.PI; if(t>180) t=360-t; turns.push(t); } } }
turns.sort((a,b)=>a-b); dsp.sort((a,b)=>a-b);
const q=(arr,p)=>arr[Math.floor(p*(arr.length-1))];
console.log('interior keyframes',n,'| both adjacent segments moving (>0.5 m/tick):',moving2);
console.log('heading change at those keyframes (deg): median',q(turns,.5).toFixed(0),'p90',q(turns,.9).toFixed(0),'| share >45 deg',(turns.filter(t=>t>45).length/turns.length*100).toFixed(0)+'%','| share >90 deg',(turns.filter(t=>t>90).length/turns.length*100).toFixed(0)+'%');
console.log('scalar speed step at interior keyframes, px/frame at z15 1x 60Hz: median',q(dsp,.5).toFixed(2),'p90',q(dsp,.9).toFixed(2),'| share >1 px/frame',(dsp.filter(x=>x>1).length/dsp.length*100).toFixed(0)+'%');

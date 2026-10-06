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
function stateAt(t){ const out=[]; for (const [id,k] of tracks){ if(t<k[0].tick) continue; let i=0; while(i<k.length-1 && k[i+1].tick<=t) i++; const a=k[i], b=k[i+1]; if(!b){out.push({id,x:a.lng*mLng,y:a.lat*mLat}); continue;} const f=(t-a.tick)/(b.tick-a.tick); out.push({id,x:(a.lng+(b.lng-a.lng)*f)*mLng,y:(a.lat+(b.lat-a.lat)*f)*mLat}); } return out; }
// nearest-neighbour distance distribution at several ticks
function nn(s){ const d=[]; for(let i=0;i<s.length;i++){ let m=1e9; for(let j=0;j<s.length;j++){ if(i===j)continue; const dx=s[i].x-s[j].x, dy=s[i].y-s[j].y; const q=Math.hypot(dx,dy); if(q<m)m=q;} d.push(m);} return d.sort((a,b)=>a-b); }
for (const t of [60,330,548,610,653]) {
  const s=stateAt(t); const d=nn(s); const q=p=>d[Math.floor(p*(d.length-1))];
  const co=d.filter(x=>x<1).length, lt10=d.filter(x=>x<10).length, lt30=d.filter(x=>x<30).length, lt100=d.filter(x=>x<100).length;
  console.log('tick',t,'n',s.length,'nearest-neighbour m: p10',q(.1).toFixed(1),'median',q(.5).toFixed(1),'p90',q(.9).toFixed(1),'| units with a neighbour <1m:',co,'<10m:',lt10,'<30m:',lt30,'<100m:',lt100);
}
// coincident keyframes (same lat/lng, same tick, different unit) in raw data
const pos=new Map();
for (const r of byKey.values()){ const k=r.tick+'|'+r.lat+'|'+r.lng; if(!pos.has(k)) pos.set(k,[]); pos.get(k).push(r.unit_id);} 
let groups=0, units=0, big=0; for (const v of pos.values()){ if(v.length>1){groups++; units+=v.length; if(v.length>big) big=v.length;} }
console.log('keyframe positions shared by >1 unit at the same tick: groups',groups,'units involved',units,'largest stack',big);

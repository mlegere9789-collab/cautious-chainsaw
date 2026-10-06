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
function stateAt(t){ const out=[]; for (const [id,k] of tracks){ if(t<k[0].tick) continue; let i=0; while(i<k.length-1 && k[i+1].tick<=t) i++; const a=k[i], b=k[i+1]; let lat=a.lat,lng=a.lng; if(b){const f=(t-a.tick)/(b.tick-a.tick); lat=a.lat+(b.lat-a.lat)*f; lng=a.lng+(b.lng-a.lng)*f;} out.push({id,x:lng*mLng,y:lat*mLat,age:t-a.tick}); } return out; }
function comps(s,wm,hm){ const p=s.map((_,i)=>i); const find=i=>{while(p[i]!==i){p[i]=p[p[i]];i=p[i];}return i;}; for(let i=0;i<s.length;i++)for(let j=i+1;j<s.length;j++){ if(Math.abs(s[i].x-s[j].x)<wm&&Math.abs(s[i].y-s[j].y)<hm){const a=find(i),b=find(j); if(a!==b)p[a]=b;} } const sz=new Map(); for(let i=0;i<s.length;i++){const r=find(i); sz.set(r,(sz.get(r)||0)+1);} return [...sz.values()].sort((a,b)=>b-a); }
for (const t of [330,548,653]) {
  const s=stateAt(t);
  for (const z of [14,15,16,17]) {
    for (const [W,H,name] of [[24,16,'24x16 frame'],[96,18,'96x18 label+frame']]) {
      const c=comps(s,W*mpp(z),H*mpp(z));
      const multi=c.filter(x=>x>1);
      console.log('tick',t,'z'+z,name,': units',s.length,'| clusters of >=2:',multi.length,'| units inside them:',multi.reduce((a,b)=>a+b,0),'| largest cluster',c[0],'| clusters >=6:',c.filter(x=>x>=6).length);
    }
  }
}
// stale fix age
for (const t of [100,330,548,653]) { const s=stateAt(t); const ages=s.map(u=>u.age).sort((a,b)=>a-b); const q=p=>ages[Math.floor(p*(ages.length-1))]; console.log('tick',t,'age since last keyframe (ticks): median',q(.5),'p90',q(.9),'max',ages[ages.length-1],'| share with age>50 ticks',(ages.filter(a=>a>50).length/ages.length*100).toFixed(0)+'%'); }

import fs from 'node:fs';
import path from 'node:path';
const dir = process.argv[2] || 'baseline/dist/data'; // run from the repo root
const files = fs.readdirSync(dir).filter(f => /^(placements_day|density_).*\.json$/.test(f)).sort();
const byKey = new Map();
for (const f of files) for (const r of JSON.parse(fs.readFileSync(path.join(dir,f),'utf8')).placements||[]) byKey.set(r.unit_id+'@'+r.tick, r);
const tracks = new Map();
for (const r of byKey.values()) { if(!tracks.has(r.unit_id)) tracks.set(r.unit_id, []); tracks.get(r.unit_id).push(r); }
for (const k of tracks.values()) k.sort((a,b)=>a.tick-b.tick);
const LAT0 = 39.82;
function mpp(z){ return 78271.51696 * Math.cos(LAT0*Math.PI/180) / Math.pow(2,z); } // Mapbox GL 512-px tile world
const mPerDegLat = 111132, mPerDegLng = 111320*Math.cos(LAT0*Math.PI/180);
function stateAt(t){ const out=[]; for (const [id,k] of tracks){ if(t<k[0].tick) continue; let i=0; while(i<k.length-1 && k[i+1].tick<=t) i++; const a=k[i], b=k[i+1]; if(!b){out.push({id,x:a.lng*mPerDegLng,y:a.lat*mPerDegLat,d:a.disposition}); continue;} const f=(t-a.tick)/(b.tick-a.tick); out.push({id,x:(a.lng+(b.lng-a.lng)*f)*mPerDegLng,y:(a.lat+(b.lat-a.lat)*f)*mPerDegLat,d:a.disposition}); } return out; }
const W=24,H=16; // candidate tile px
const zs=[12,13,14,15,16,17];
const res={}; for(const z of zs) res[z]={ticksWithOverlap:0, maxPairs:0, maxPairsTick:0, sumOverlapUnits:0};
const onField=[];
for (let t=1;t<=675;t++){
  const s=stateAt(t); onField.push(s.length);
  for(const z of zs){ const m=mpp(z); const wm=W*m, hm=H*m; let pairs=0; const inO=new Set();
    // sort by x for sweep
    const arr=s.slice().sort((a,b)=>a.x-b.x);
    for(let i=0;i<arr.length;i++){ for(let j=i+1;j<arr.length && arr[j].x-arr[i].x<wm;j++){ if(Math.abs(arr[j].y-arr[i].y)<hm){pairs++;inO.add(arr[i].id);inO.add(arr[j].id);} } }
    if(pairs>0) res[z].ticksWithOverlap++;
    if(pairs>res[z].maxPairs){res[z].maxPairs=pairs;res[z].maxPairsTick=t;}
    res[z].sumOverlapUnits+=inO.size;
  }
}
onField.sort((a,b)=>a-b);
console.log('units on field per tick: min',onField[0],'median',onField[337],'max',onField[674]);
for(const z of zs) console.log('z'+z,'m/px',mpp(z).toFixed(2),'24x16 tile = ',(W*mpp(z)).toFixed(0)+'m x '+(H*mpp(z)).toFixed(0)+'m','ticks with >=1 overlapping pair',res[z].ticksWithOverlap,'/675','max pairs',res[z].maxPairs,'at tick',res[z].maxPairsTick,'mean units in overlap per tick',(res[z].sumOverlapUnits/675).toFixed(1));
// sample: tick 548 and 546, count of units
for (const t of [100,226,330,548]) { const s=stateAt(t); console.log('tick',t,'units on field',s.length); }

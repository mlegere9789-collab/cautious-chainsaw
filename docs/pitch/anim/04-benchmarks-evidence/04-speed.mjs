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
const pairs=[];
for (const [id,k] of tracks) for (let i=0;i<k.length-1;i++){ const a=k[i],b=k[i+1]; const d=Math.hypot((b.lng-a.lng)*mLng,(b.lat-a.lat)*mLat); pairs.push({id,g:b.tick-a.tick,d,a,b}); }
const moving=pairs.filter(p=>p.d>1);
console.log('pairs',pairs.length,'with displacement >1 m',moving.length,'stationary (<=1 m)',pairs.length-moving.length);
const q=(arr,p)=>arr[Math.min(arr.length-1,Math.floor(p*(arr.length-1)))];
// speed per tick in metres
const mpt=moving.map(p=>p.d/p.g).sort((a,b)=>a-b);
console.log('moving pairs: metres per tick p10/median/p90/max', q(mpt,.1).toFixed(2), q(mpt,.5).toFixed(2), q(mpt,.9).toFixed(1), mpt[mpt.length-1].toFixed(0));
for (const z of [13,14,15,16]) {
  // at 1x: 2 ticks/s ; at 8x: 16 ticks/s. px per 60 Hz frame
  const f1=moving.map(p=>(p.d/p.g)*2/mpp(z)/60).sort((a,b)=>a-b);
  const f8=moving.map(p=>(p.d/p.g)*16/mpp(z)/60).sort((a,b)=>a-b);
  const sub1=f1.filter(x=>x<1).length/f1.length, sub8=f8.filter(x=>x<1).length/f8.length;
  console.log('z'+z,'1x px/frame median',q(f1,.5).toFixed(3),'p90',q(f1,.9).toFixed(2),'share <1 px/frame',(sub1*100).toFixed(0)+'%','| 8x median',q(f8,.5).toFixed(3),'share <1 px/frame',(sub8*100).toFixed(0)+'%');
}
// the current hold-then-jump behaviour: jump size when the gap is long
const jump=moving.filter(p=>p.g>1).map(p=>p.d).sort((a,b)=>a-b);
console.log('keyframe-to-keyframe displacement (m) among moving pairs with gap>1: median',q(jump,.5).toFixed(0),'p90',q(jump,.9).toFixed(0),'max',jump[jump.length-1].toFixed(0));
for (const z of [14,15,16]) console.log('  as a jump on screen at z'+z+': median',(q(jump,.5)/mpp(z)).toFixed(0),'px; p90',(q(jump,.9)/mpp(z)).toFixed(0),'px');
// share of pairs with gap >=10 ticks
console.log('pairs with gap >=10 ticks',(pairs.filter(p=>p.g>=10).length),'of',pairs.length,'; >=50 ticks',pairs.filter(p=>p.g>=50).length);
// disposition changes at keyframes (posture pops)
let dchg=0; for(const p of pairs) if(p.a.disposition!==p.b.disposition) dchg++;
console.log('pairs where the disposition changes between keyframes',dchg,'of',pairs.length);
// strength changes
let sch=0, sdrop=0; for(const p of pairs){ if(p.a.strength!==p.b.strength){sch++; if(p.b.strength<p.a.strength) sdrop++;} }
console.log('pairs where strength changes',sch,'(drops',sdrop+')');
// bearing change magnitude
const bch=pairs.map(p=>{let d=Math.abs(p.b.bearing-p.a.bearing)%360; return d>180?360-d:d;}).sort((a,b)=>a-b);
console.log('bearing change between keyframes: median',q(bch,.5),'p90',q(bch,.9),'share >90 deg',(bch.filter(x=>x>90).length/bch.length*100).toFixed(0)+'%');

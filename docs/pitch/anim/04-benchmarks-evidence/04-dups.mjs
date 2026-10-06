import fs from 'node:fs';
import path from 'node:path';
const dir = process.argv[2] || 'baseline/dist/data'; // run from the repo root
const files = fs.readdirSync(dir).filter(f => /^(placements_day|density_).*\.json$/.test(f)).sort();
const groups = new Map();
for (const f of files) for (const r of JSON.parse(fs.readFileSync(path.join(dir,f),'utf8')).placements||[]) { const k=r.unit_id+'@'+r.tick; if(!groups.has(k)) groups.set(k,[]); groups.get(k).push({...r,_f:f}); }
let dupKeys=0, rowsInDup=0, identical=0, conflictPos=0, conflictDisp=0, conflictStr=0;
for (const g of groups.values()) { if(g.length<2) continue; dupKeys++; rowsInDup+=g.length; const a=g[0]; let samePos=true, sameDisp=true, sameStr=true; for(const b of g.slice(1)){ if(b.lat!==a.lat||b.lng!==a.lng) samePos=false; if(b.disposition!==a.disposition) sameDisp=false; if(b.strength!==a.strength) sameStr=false; } if(samePos&&sameDisp&&sameStr) identical++; if(!samePos) conflictPos++; if(!sameDisp) conflictDisp++; if(!sameStr) conflictStr++; }
console.log('keys with >1 row:',dupKeys,'rows in them:',rowsInDup,'| fully identical (pos,disp,strength):',identical,'| differing position:',conflictPos,'| differing disposition:',conflictDisp,'| differing strength:',conflictStr);
const mLat=111132, mLng=111320*Math.cos(39.82*Math.PI/180);
const dists=[]; const ex=[];
for (const [k,g] of groups) { if(g.length<2) continue; let m=0; for(let i=0;i<g.length;i++)for(let j=i+1;j<g.length;j++){ m=Math.max(m,Math.hypot((g[i].lng-g[j].lng)*mLng,(g[i].lat-g[j].lat)*mLat)); } if(m>0) { dists.push(m); ex.push([k,Math.round(m),g.map(x=>x._f).join(' | ')]); } }
dists.sort((a,b)=>a-b);
console.log('conflicting-position duplicate keys:',dists.length,'distance between rows (m): median',dists[dists.length>>1].toFixed(0),'p90',dists[Math.floor(dists.length*.9)].toFixed(0),'max',dists[dists.length-1].toFixed(0));
ex.sort((a,b)=>b[1]-a[1]); console.log(JSON.stringify(ex.slice(0,3)));

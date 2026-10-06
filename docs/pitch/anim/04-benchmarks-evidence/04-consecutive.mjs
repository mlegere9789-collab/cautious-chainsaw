// Where do consecutive-tick fixes occur (the only pairs production can glide between)? Run from the repo root.
import fs from 'node:fs'; import path from 'node:path';
const dir='baseline/dist/data';
const files=fs.readdirSync(dir).filter(f=>/^(placements_day|density_).*\.json$/.test(f)).sort();
const byKey=new Map(); for(const f of files) for(const r of JSON.parse(fs.readFileSync(path.join(dir,f),'utf8')).placements||[]) byKey.set(r.unit_id+'@'+r.tick,r);
const tr=new Map(); for(const r of byKey.values()){ if(!tr.has(r.unit_id)) tr.set(r.unit_id,[]); tr.get(r.unit_id).push(r);} for(const k of tr.values()) k.sort((a,b)=>a.tick-b.tick);
const ticks=[]; const units=new Set(); for(const [id,k] of tr) for(let i=0;i<k.length-1;i++) if(k[i+1].tick-k[i].tick===1){ticks.push(k[i].tick);units.add(id);}
ticks.sort((a,b)=>a-b); console.log('gap-1 pairs',ticks.length,'units',units.size,'ticks min/max',ticks[0],ticks[ticks.length-1]);
const bins={}; for(const t of ticks){const b=Math.floor((t-1)/25)*25+1; bins[b]=(bins[b]||0)+1;} console.log(JSON.stringify(bins));
// longest runs of consecutive-tick fixes per unit
let best=[]; for(const [id,k] of tr){ let run=1; for(let i=1;i<k.length;i++){ if(k[i].tick-k[i-1].tick===1){run++;} else { if(run>=3) best.push([id,run,k[i-1].tick]); run=1;} } if(run>=3) best.push([id,run,k[k.length-1].tick]); }
best.sort((a,b)=>b[1]-a[1]); console.log('runs of >=3 consecutive-tick fixes:',best.length, JSON.stringify(best.slice(0,5)));

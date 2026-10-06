import fs from 'node:fs';
import path from 'node:path';
const dir = process.argv[2] || 'baseline/dist/data'; // run from the repo root
const files = fs.readdirSync(dir).filter(f => /^(placements_day|density_).*\.json$/.test(f)).sort();
let n=0, le4=0, dec={}; const byKey=new Map();
for (const f of files) { const txt=fs.readFileSync(path.join(dir,f),'utf8'); for (const m of txt.matchAll(/"lat":(-?[0-9.]+),"lng":(-?[0-9.]+)/g)) { n++; const d=(m[1].split('.')[1]||'').length; dec[d]=(dec[d]||0)+1; if(d<=4) le4++; } }
console.log('lat/lng pairs parsed by regex',n,'decimals of lat:',dec,'share <=4 decimals',(le4/n*100).toFixed(1)+'%');
console.log('1e-4 degree =', (1e-4*111132).toFixed(1),'m north-south and', (1e-4*111320*Math.cos(39.82*Math.PI/180)).toFixed(1),'m east-west at 39.82 N');

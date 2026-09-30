const fs=require('fs');
let src=fs.readFileSync('C:/Users/mlege/AppData/Roaming/Claude/scratch-workspaces/fe20000a-2144-4d85-ac4c-4e19e62f5823/1fb796a8-22ef-47aa-b6e3-227d4048a221/scratch-2026-09-30-719300/plan-work/tmp-app-bugs/tranche0-validate.js','utf8');
const a=src.indexOf("const patches = [];"), b=src.indexOf("const report = [];");
const body=src.slice(a,b);
const fn=new Function(body+"; return patches;");
const patches=fn();
fs.writeFileSync('bugs_patches.json',JSON.stringify(patches));
console.log('bugs patches',patches.length);

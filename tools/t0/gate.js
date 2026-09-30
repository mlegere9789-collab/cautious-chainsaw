const fs=require('fs');
const acorn=require('acorn');const escope=require('eslint-scope');
function analyze(file){
  const s=fs.readFileSync(file,'utf8');
  let ast;
  try{ast=acorn.parse(s,{ecmaVersion:'latest',sourceType:'module',ranges:true,locations:true});}catch(e){return {parse:'FAIL '+e.message+' @'+(e.loc&&e.loc.line)+':'+(e.loc&&e.loc.column)};}
  const sm=escope.analyze(ast,{ecmaVersion:2022,sourceType:'module'});
  return {parse:'ok',bytes:s.length,through:new Set(sm.globalScope.through.map(r=>r.identifier.name))};
}
const base=analyze('C:/Users/mlege/AppData/Roaming/Claude/scratch-workspaces/fe20000a-2144-4d85-ac4c-4e19e62f5823/1fb796a8-22ef-47aa-b6e3-227d4048a221/scratch-2026-09-30-719300/plan-work/bundle.min.js');
for(const f of process.argv.slice(2)){
  const r=analyze(f);
  if(r.parse!=='ok'){console.log(f,r.parse);continue;}
  const added=[...r.through].filter(n=>!base.through.has(n));
  const removed=[...base.through].filter(n=>!r.through.has(n)&&['setGoldUnit','clearGoldTrail','drawGoldTrailSegment','CanvasRenderer'].includes(n));
  console.log(f.split('/').slice(-2).join('/'),'parse ok bytes',r.bytes,'| new unresolved:',JSON.stringify(added),'| fixed:',JSON.stringify(removed));
}

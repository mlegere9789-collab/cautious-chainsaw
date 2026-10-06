// Builds the prototype patch group ANIM-proto from the readable sources in ./src (docs/pitch/anim/05-architecture.md, section "Patch strategy").
//   node docs/pitch/anim/05-proto/build-anim-proto.mjs                write 05-proto/dist/ANIM-proto.json (the patch group) and 05-proto/dist/engine.dev.js (unminified, for the Node tests)
//   node docs/pitch/anim/05-proto/build-anim-proto.mjs --check        exit 1 when dist/ANIM-proto.json is not what the sources produce
// Same pattern as tools/t0/mon/build-mon.mjs: the runtime is stripped with terser (compress and mangle OFF, ASCII only, deterministic), then wrapped into asserted patches (`expect: 1`)
// written against the text of the entry bundle AFTER groups A..CP, A2, SHELL, PERF and MON.  The group touches nothing but the entry bundle.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { minify } from '../../../../node_modules/terser/main.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, 'src');
const OUT = path.join(HERE, 'dist');
const CHECK = process.argv.includes('--check');

const files = fs.readdirSync(SRC).filter((f) => /^\d\d-.*\.js$/.test(f)).sort();
// the example modules of ./skins (a skin and an effect, each under 50 lines) are part of the prototype build: adding a module is registering one more file
const EXAMPLES = fs.readdirSync(path.join(HERE, 'skins')).filter((f) => f.endsWith('.js')).sort();
const parts = files.map((f) => ({ name: f, code: fs.readFileSync(path.join(SRC, f), 'utf8') }));
const glueAt = parts.findIndex((p) => p.name.startsWith('90-'));
parts.splice(glueAt, 0, ...EXAMPLES.map((f) => ({ name: 'skins/' + f, code: fs.readFileSync(path.join(HERE, 'skins', f), 'utf8') })));
const body = parts.map((p) => `// ==== ${p.name}\n` + p.code).join('\n');
const dev = `const GTANIM = (function () {\n"use strict";\n${body}\nreturn G;\n})();\n`;
const min = await minify(dev, { compress: false, mangle: false, format: { comments: false, ascii_only: true, semicolons: true } });
if (min.error) throw min.error;
const ENGINE = min.code.replace(/;$/, '') + ';';

// the one line of glue between the engine and the bundle's own names: yn (the zustand store), Qx (the casualty-flash map), N4/jk (sound flag / cannon sound), Vk (trails on/off)
const BIND = 'GTANIM.bind({store:yn,flash:Qx,sound:{on:N4,play:jk},reduced:()=>!!window.__gtbgReduceMotion,trails:()=>Vk});';
const patches = [
  {
    id: 'ANIM:engine+e1', target: 'js', expect: 1,
    find: 'function e1(c,f,x,M,P,z,H){const l=y1(x,M,0);lS(c,f,l,P,z,H,Qx,performance.now())}',
    repl: ENGINE + BIND + 'function e1(c,f,x,M,P,z,H){if(GTANIM.on()&&GTANIM.paused(c,f,x,M,P,z,H))return;const l=y1(x,M,0);lS(c,f,l,P,z,H,Qx,performance.now())}',
    note: 'engine + bind; the paused / repaint entry (e1 is called with the canvas, the map, the placements, the tick, selection, pin and filters) goes to the engine, the shipped body stays as the fallback',
  },
  {
    id: 'ANIM:Ed-tail', target: 'js', expect: 1,
    find: 'const xe=y1(he,st,ut),pe=dA(xe,P);cA(pe),lS(M,P,xe,Se,Ie,Ee,Qx,c),Fp=requestAnimationFrame(Pe=>Ed(Pe,f,x,M,P))}',
    repl: 'if(!(GTANIM.on()&&GTANIM.playing(M,P,he,st,ut,Se,Ie,Ee))){const xe=y1(he,st,ut),pe=dA(xe,P);cA(pe),lS(M,P,xe,Se,Ie,Ee,Qx,c)}Fp=requestAnimationFrame(Pe=>Ed(Pe,f,x,M,P))}',
    note: 'the playing frame: the shipped loop keeps the clock (tick accumulator, store writes, data prefetch, casualty flash); drawing goes to the engine, which draws in the map render event',
  },
  {
    id: 'ANIM:Ed-end', target: 'js', expect: 1,
    find: 'const Xe=he[s2]||[],xt=dA(Xe,P);cA(xt),lS(M,P,Xe,Se,Ie,Ee,Qx,c);return',
    repl: 'if(!(GTANIM.on()&&GTANIM.paused(M,P,he,s2,Se,Ie,Ee))){const Xe=he[s2]||[],xt=dA(Xe,P);cA(xt),lS(M,P,Xe,Se,Ie,Ee,Qx,c)}return',
    note: 'end of the battle: the final frame',
  },
  {
    id: 'ANIM:Ed-mobile-cap', target: 'js', expect: 1,
    find: 'if(M&&M.width<500){if(Ed._lastMobileMs||',
    repl: 'if(M&&M.width<500&&!GTANIM.on()){if(Ed._lastMobileMs||',
    note: 'the 30 fps cap of the shipped phone path is not applied to the engine (it adapts itself)',
  },
  {
    id: 'ANIM:y1', target: 'js', expect: 1,
    find: 'function y1(c,f,x){if(c!==i2c||f<i2t){',
    repl: 'function y1(c,f,x){if(GTANIM.on()){const gtu=GTANIM.units(c,f,x);if(gtu)return gtu}if(c!==i2c||f<i2t){',
    note: 'every other consumer of y1 (minimap, picker index, fly-to) sees the same continuous positions the engine draws',
  },
  {
    id: 'ANIM:pick-desktop', target: 'js', expect: 1,
    find: 'const ht=pt.useCallback(Xe=>{const xt=M.current;if(!xt||!P.current)return;',
    repl: 'const ht=pt.useCallback(Xe=>{const gtp=GTANIM.on()&&GTANIM.pick(Xe.clientX,Xe.clientY);if(gtp){kt(gtp.id),xe(gtp.id);return}const xt=M.current;if(!xt||!P.current)return;',
    note: 'desktop pick: the tile under the pointer as drawn (selectUnit + pinUnit), empty ground deselects',
  },
  {
    id: 'ANIM:pick-mobile', target: 'js', expect: 1,
    find: '$t.on("click",nr=>{if(!ki.current)return;',
    repl: '$t.on("click",nr=>{const gtp=GTANIM.on()&&nr.originalEvent&&GTANIM.pick(nr.originalEvent.clientX,nr.originalEvent.clientY);if(gtp){const ur=yn.getState();if(!gtp.id){ur.selectUnit(null),ur.pinUnit(null),Wo(null);return}Wo({...gtp.rec,oob:ur.oobData[gtp.id]}),ur.selectUnit(gtp.id),ur.pinUnit(gtp.id),Br(null);return}if(!ki.current)return;',
    note: 'phone pick, same contract as the shipped handler (selection popup record, select, pin)',
  },
  {
    id: 'ANIM:mon-units', target: 'js', expect: 1,
    find: 'function unitsNow(){var st=yn.getState(),pbt=st.placementsByTick||{},t=st.currentTick,u={},k,a,j;',
    repl: 'function unitsNow(){var st=yn.getState(),pbt=st.placementsByTick||{},t=st.currentTick,u={},k,a,j;if(GTANIM.on()){var gtd=GTANIM.drawn();if(gtd)return gtd}',
    note: 'ONLY with MON (the anchor lies in the MON runtime): the Monuments click arbitration asks which unit is nearest to the pointer; it must use the positions the engine drew, not the latest keyframe. In the registered design the one line lives in the MON source itself.',
  },
  {
    id: 'ANIM:resize-guard', target: 'js', expect: 1,
    find: 'g&&(cv.width!==g.clientWidth||cv.height!==g.clientHeight)&&(cv.width=g.clientWidth,cv.height=g.clientHeight);e1(cv,m,s.placementsByTick,s.currentTick,s.selectedUnitId,s.pinnedUnitId,s.filters)',
    repl: '!GTANIM.on()&&g&&(cv.width!==g.clientWidth||cv.height!==g.clientHeight)&&(cv.width=g.clientWidth,cv.height=g.clientHeight);e1(cv,m,s.placementsByTick,s.currentTick,s.selectedUnitId,s.pinnedUnitId,s.filters)',
    note: 'GtbgRepaint (every map move while paused) must not reset the backing store the engine sized for the device pixel ratio',
  },
];

const json = JSON.stringify({ group: 'ANIM', patches }, null, 1) + '\n';
fs.mkdirSync(OUT, { recursive: true });
if (CHECK) {
  const cur = fs.existsSync(path.join(OUT, 'ANIM-proto.json')) ? fs.readFileSync(path.join(OUT, 'ANIM-proto.json'), 'utf8') : '';
  if (cur !== json) { console.error('ANIM-proto.json is not what the sources produce'); process.exit(1); }
  console.log('ok: ANIM-proto.json matches the sources'); process.exit(0);
}
fs.writeFileSync(path.join(OUT, 'ANIM-proto.json'), json);
fs.writeFileSync(path.join(OUT, 'engine.dev.js'), dev);
console.log('sources', files.length, 'files +', EXAMPLES.length, 'example modules,', body.length, 'chars; engine minified', ENGINE.length, 'chars;', patches.length, 'patches ->', path.relative(process.cwd(), path.join(OUT, 'ANIM-proto.json')));

// usage: node render.mjs <glb> <out.png> [views: front,side,back]
import { chromium } from 'playwright';
import fs from 'node:fs'; import http from 'node:http'; import path from 'node:path';
const [,, glb, out, ...views] = process.argv; const V = views.length ? views : ['front'];
const THREE = process.env.THREE || 'node_modules/three';   // THREE=<dir of the unpacked three@0.160.0 npm package>
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]);
  if (p === '/') { r.setHeader('content-type','text/html'); return r.end(`<!doctype html><body style="margin:0;background:#8899aa"><canvas id=c width=${400*V.length} height=700></canvas><script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script><script type=module>
import * as T from 'three'; import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const cv=document.getElementById('c'); const ren=new T.WebGLRenderer({canvas:cv,antialias:true,preserveDrawingBuffer:true}); ren.setSize(cv.width,cv.height,false);
ren.setScissorTest(true); const sc=new T.Scene(); sc.background=new T.Color(0x8899aa); sc.add(new T.HemisphereLight(0xffffff,0x555555,2.2)); const dl=new T.DirectionalLight(0xffffff,1.5); dl.position.set(2,3,4); sc.add(dl);
const g=await new GLTFLoader().loadAsync('/m.glb'); sc.add(g.scene); const box=new T.Box3().setFromObject(g.scene); const c=box.getCenter(new T.Vector3()), s=box.getSize(new T.Vector3());
const views=${JSON.stringify(V)}; const R=Math.max(s.y,s.x,s.z)*1.15;
views.forEach((v,i)=>{ const cam=new T.PerspectiveCamera(30,400/700,0.1,100); const d=R*2.6; const a={front:0,side:Math.PI/2,back:Math.PI,left:-Math.PI/2}[v]; cam.position.set(c.x+Math.sin(a)*d,c.y,c.z+Math.cos(a)*d); cam.lookAt(c);
 ren.setViewport(i*400,0,400,700); ren.setScissor(i*400,0,400,700); ren.render(sc,cam); });
window.done=true;</script>`); }
  if (p === '/m.glb') return fs.createReadStream(glb).pipe(r);
  if (p.startsWith('/three/')) return fs.createReadStream(path.join(THREE, p.slice(7))).on('error',()=>{r.statusCode=404;r.end()}).pipe(r.setHeader('content-type', p.endsWith('.js')?'text/javascript':'application/octet-stream')||r);
  r.statusCode=404; r.end(); }).listen(0);
const port = srv.address().port;
const b = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 400*V.length, height: 700 } }); pg.on('console', m => console.log('console:', m.text())); pg.on('pageerror', e => console.log('pageerror', e.message));
await pg.goto(`http://127.0.0.1:${port}/`); await pg.waitForFunction('window.done===true',null,{timeout:60000});
await pg.locator('#c').screenshot({ path: out }); await b.close(); srv.close();

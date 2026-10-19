import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(process.argv[2] || '..'); const port = +process.argv[3] || 10760;
const mime = {'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.fbx':'application/octet-stream','.glb':'model/gltf-binary','.gltf':'model/gltf+json','.bin':'application/octet-stream'};
http.createServer((q,r)=>{ const p=path.join(root,decodeURIComponent(q.url.split('?')[0])); if(!p.startsWith(root)){r.writeHead(403);return r.end();}
 fs.readFile(p,(e,d)=>{ if(e){r.writeHead(404);return r.end('nf');} r.writeHead(200,{'content-type':mime[path.extname(p)]||'application/octet-stream','cache-control':'no-store'}); r.end(d);});
}).listen(port,'127.0.0.1',()=>console.log('serving',root,port));

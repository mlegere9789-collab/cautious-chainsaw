import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib';
const root = path.resolve(process.argv[2] || '.'); const port = +process.argv[3] || 10740;
const T = { '.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript', '.json':'application/json', '.jpg':'image/jpeg', '.png':'image/png', '.bin':'application/octet-stream', '.avif':'image/avif', '.webp':'image/webp', '.wgsl':'text/plain' };
http.createServer((q, s) => {
  let u = decodeURIComponent(q.url.split('?')[0]); if (u.endsWith('/')) u += 'index.html';
  const f = path.join(root, u); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); return s.end('nf'); }
  const ext = path.extname(f); const h = { 'content-type': T[ext] || 'application/octet-stream', 'cache-control': 'no-store' };
  let b = fs.readFileSync(f);
  if (/gzip/.test(q.headers['accept-encoding']||'') && ['.html','.js','.mjs','.json','.bin'].includes(ext)) { b = zlib.gzipSync(b); h['content-encoding'] = 'gzip'; }
  h['content-length'] = b.length; s.writeHead(200, h); s.end(b);
}).listen(port, '127.0.0.1', () => console.log('serving', root, port));

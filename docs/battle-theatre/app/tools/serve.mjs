// Static server for the page shell and the files it reads (docs/battle-theatre as the root). node app/tools/serve.mjs [port]
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..'), port = +process.argv[2] || 10760;
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.jsonl': 'application/x-ndjson', '.md': 'text/markdown; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.bin': 'application/octet-stream' };
export function serve(p = port) {
  const srv = http.createServer((q, s) => {
    let u = decodeURIComponent(q.url.split('?')[0]); if (u.endsWith('/')) u += 'index.html';
    const f = path.join(root, u); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404, { 'content-type': 'text/plain' }); return s.end('not found'); }
    const ext = path.extname(f), h = { 'content-type': MIME[ext] || 'application/octet-stream', 'cache-control': 'no-store' }; let b = fs.readFileSync(f);
    if (/gzip/.test(q.headers['accept-encoding'] || '') && ['.html', '.css', '.js', '.mjs', '.json', '.jsonl', '.bin', '.md'].includes(ext)) { b = zlib.gzipSync(b, { level: 1 }); h['content-encoding'] = 'gzip'; }
    h['content-length'] = b.length; s.writeHead(200, h); s.end(b);
  });
  return new Promise(res => srv.listen(p, '127.0.0.1', () => res(srv)));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) serve().then(() => console.log('Battle Theatre shell: http://127.0.0.1:' + port + '/app/index.html'));

// tools/serve.mjs - a tiny static file server for the demo and the preview shots (own port; nothing else).  node tools/serve.mjs [port=9800]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.avif': 'image/avif', '.webp': 'image/webp', '.png': 'image/png', '.css': 'text/css',
};

export function serve(port = 9800) {
  const srv = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]);
    const f = path.join(ROOT, u === '/' ? 'demo/index.html' : u);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise((ok) => srv.listen(port, '127.0.0.1', () => ok(srv)));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const p = +process.argv[2] || 9800;
  serve(p).then(() => console.log('serving', ROOT, 'on http://127.0.0.1:' + p));
}

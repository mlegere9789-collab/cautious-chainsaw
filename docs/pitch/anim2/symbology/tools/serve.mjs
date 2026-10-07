// tools/serve.mjs - a tiny static server for the demo (read-only, localhost only):  node tools/serve.mjs [port]   then open http://localhost:<port>/demo/index.html
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { ROOT } from './chrome.mjs';
const port = +(process.argv[2] || 9820);
const TYPES = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
export function serve(p = port) {
  const srv = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (rel === '/favicon.ico') { res.writeHead(204); res.end(); return; } const f = path.join(ROOT, rel === '/' ? 'demo/index.html' : rel);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }); fs.createReadStream(f).pipe(res);
  });
  return new Promise((ok) => srv.listen(p, '127.0.0.1', () => ok(srv)));
}
if (import.meta.url === new URL(process.argv[1], 'file:///').href || process.argv[1].endsWith('serve.mjs')) { serve(port).then(() => console.log(`serving ${ROOT} on http://localhost:${port}/`)); }

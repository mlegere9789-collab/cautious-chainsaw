// tools/serve.mjs - a tiny static server for the page and the basemap's tile files (both live under docs/pitch/anim2/).  node tools/serve.mjs [port]   (default 9840)
// The page is then http://127.0.0.1:<port>/d1-quiet-cartographer/quiet-cartographer.html and finds its tiles at ../basemap/assets/ by itself.  Only 127.0.0.1 is bound.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.css': 'text/css', '.woff': 'font/woff' };
export function serve(port = 10020) {
  const srv = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]); const f = path.normalize(path.join(ROOT, u));
    if (!f.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }); res.end(d); } });
  });
  return new Promise((ok) => srv.listen(port, '127.0.0.1', () => ok(srv)));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) { const port = +(process.argv[2] || 10020); serve(port).then(() => console.log('serving', ROOT, 'on http://127.0.0.1:' + port)); }

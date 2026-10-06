// layout-lab/serve-lab.mjs - a tiny read-only static server for the browser lab.  127.0.0.1 only.
//   /lab/**   -> docs/pitch/anim/layout-lab/**        (the lab page, lib/*.mjs, out/text-widths.json)
//   /data/**  -> baseline/dist/data/**                (the REAL placement and order-of-battle files, read-only)
//   node docs/pitch/anim/layout-lab/serve-lab.mjs [port]      default port 9600
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { REPO, DATA_DIR } from './lib/data.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TYPES = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.css': 'text/css' };
export function startServer(port = 9600) {
  const srv = http.createServer((req, res) => {
    const u = decodeURIComponent((req.url || '/').split('?')[0]);
    let file = null;
    if (u.startsWith('/lab/')) file = path.join(HERE, u.slice(5));
    else if (u.startsWith('/data/')) file = path.join(DATA_DIR, u.slice(6));
    if (!file || !path.resolve(file).startsWith(path.resolve(u.startsWith('/lab/') ? HERE : DATA_DIR))) { res.writeHead(404); res.end('not found'); return; }
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404); res.end('not found'); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(buf);
    });
  });
  return new Promise((resolve) => srv.listen(port, '127.0.0.1', () => resolve(srv)));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.argv[2]) || 9600;
  await startServer(port); console.log(`layout lab on http://127.0.0.1:${port}/lab/lab.html  (repo ${REPO})`);
}

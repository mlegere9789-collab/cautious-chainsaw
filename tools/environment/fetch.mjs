// Polite, cached, read-only fetcher shared by tools/environment and tools/ledger.
//   - honest User-Agent with a contact address, at most one request per second per host (file-stamped across processes),
//   - robots.txt is read once per host and obeyed (a 404/403-less robots file means no restrictions),
//   - responses are cached under tmp/env-cache/ (git-ignored) and never re-fetched while the cache entry exists,
//   - nothing here follows a challenge page, solves a CAPTCHA or retries after a block (a 403/429 is reported and kept as the answer).
// Usage as a module: import { fetchCached, sha256 } from './fetch.mjs'.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const CACHE_DIR = process.env.GETTYSBURG_CACHE_DIR ? path.resolve(process.env.GETTYSBURG_CACHE_DIR) : path.join(ROOT, 'tmp', 'env-cache'); // the override lets tests simulate an empty cache
export const USER_AGENT = 'Gettysburg-QC/1.0 (read-only polite fetch; contact mlegere9789@gmail.com)';
const MIN_GAP_MS = 1200;

export const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(CACHE_DIR, { recursive: true });

const crawlDelay = new Map(); // host -> ms, from robots.txt Crawl-delay (honoured as given)
async function throttle(host) {
  const stamp = path.join(CACHE_DIR, `.last-${host}`);
  for (;;) {
    let last = 0;
    try { last = Number(fs.readFileSync(stamp, 'utf8')) || 0; } catch { /* first request */ }
    const wait = last + Math.max(MIN_GAP_MS, crawlDelay.get(host) || 0) - Date.now();
    if (wait <= 0) break;
    await sleep(wait + Math.floor(Math.random() * 200));
  }
  fs.writeFileSync(stamp, String(Date.now()));
}

const robotsCache = new Map();
async function robotsAllows(u) {
  const host = u.host;
  if (!robotsCache.has(host)) {
    const rules = [];
    try {
      await throttle(host);
      const r = await fetch(`${u.protocol}//${host}/robots.txt`, { headers: { 'User-Agent': USER_AGENT } });
      if (r.ok) {
        let applies = false;
        for (const raw of (await r.text()).split(/\r?\n/)) {
          const line = raw.replace(/#.*/, '').trim();
          const m = /^([A-Za-z-]+):\s*(.*)$/.exec(line);
          if (!m) continue;
          const k = m[1].toLowerCase();
          if (k === 'user-agent') applies = m[2] === '*' || /gettysburg-qc/i.test(m[2]);
          else if (k === 'disallow' && applies && m[2]) rules.push(m[2]);
          else if (k === 'crawl-delay' && applies && Number(m[2]) > 0) crawlDelay.set(host, Number(m[2]) * 1000);
        }
      }
    } catch { /* unreachable robots: treat as no rules; the real request will fail on its own */ }
    robotsCache.set(host, rules);
  }
  return !robotsCache.get(host).some((p) => (u.pathname + u.search).startsWith(p));
}

/** Cache file name for a URL: tmp/env-cache/<name or sha1(url)>. Returns { file, meta } with meta = { url, status, bytes, sha256, retrieved, contentType }. */
export function cachePaths(url, name) {
  const base = name || crypto.createHash('sha1').update(url).digest('hex').slice(0, 16);
  return { file: path.join(CACHE_DIR, base), metaFile: path.join(CACHE_DIR, base + '.meta.json') };
}

export class NotCachedError extends Error { constructor(m) { super(m); this.name = 'NotCachedError'; } }
/** offline: never touch the network; throw NotCachedError when the cache entry is missing (validators and tests use this) */
export async function fetchCached(url, { name, force = false, offline = false } = {}) {
  const { file, metaFile } = cachePaths(url, name);
  if (!force && fs.existsSync(file) && fs.existsSync(metaFile)) return { file, meta: JSON.parse(fs.readFileSync(metaFile, 'utf8')), cached: true };
  if (offline) throw new NotCachedError(`not cached: ${name || url} (run the builder or set GETTYSBURG_FETCH=1 to fetch politely)`);
  const u = new URL(url);
  if (!(await robotsAllows(u))) throw new Error(`robots.txt of ${u.host} disallows ${u.pathname}`);
  await throttle(u.host);
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: '*/*' }, redirect: 'follow' });
  const buf = Buffer.from(await res.arrayBuffer());
  const meta = { url, finalUrl: res.url, status: res.status, bytes: buf.length, sha256: sha256(buf), retrieved: new Date().toISOString(), contentType: res.headers.get('content-type') };
  if (!res.ok) { // keep the failure visible, do not cache it as content
    throw Object.assign(new Error(`HTTP ${res.status} for ${url}`), { meta });
  }
  fs.writeFileSync(file, buf);
  fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2));
  return { file, meta, cached: false };
}

export const readCached = (file) => fs.readFileSync(file, 'utf8');

if (process.argv[1] && path.basename(process.argv[1]) === 'fetch.mjs') {
  const [url, name] = process.argv.slice(2);
  if (url) fetchCached(url, { name }).then((r) => console.log(JSON.stringify(r.meta))).catch((e) => { console.error(e.message); process.exit(1); });
}

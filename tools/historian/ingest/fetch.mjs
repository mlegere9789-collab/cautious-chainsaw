// fetch.mjs - polite, cached, rights-gated fetcher for ingestion sources (chapter 14 D.5 stage S1).
//   * Rights gate FIRST: the URL must pass sources.mjs fetchAllowed (banned Tier C hosts, refused identifiers) and, for archive.org, its identifier must be
//     REGISTERED in docs/historian/sources.yaml as a Tier A or B source (unregistered identifiers are refused).
//   * Politeness: per-host sequential queue with a minimum interval (archive.org 1 request/second, loc.gov 12/minute, Wikimedia 60/minute, nps.gov 500/hour, default 1/s),
//     Retry-After honoured, exponential backoff on 429/5xx, HARD STOP on 403 (the host is blocked for the rest of the process).
//   * Cache: every response body is stored under tmp/historian-cache/<sha1(url|range)>.body with a .meta.json; a re-run downloads 0 bytes (proved by tests and by the
//     lock file sources.lock.json: url, range, sha256, bytes, fetched_at).
//   * Range requests supported (bytes=0-2097151) so a pipeline test can use the first 2 MB of a 4 MB OCR volume.
// Downloaded source texts are NEVER committed: the cache lives in tmp/ (git-ignored) and raw outputs in historian-src/raw/ (git-ignored).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { loadSources, fetchAllowed, tierProblems, normHost } from '../lib/sources.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
export const DEFAULT_CACHE = path.join(root, 'tmp/historian-cache');
export const USER_AGENT = 'GettysburgHistorianIngest/0.1 (read-only research build for a non-commercial history site; respects robots and rate limits)';

/** minimum milliseconds between two requests to one host */
export const HOST_INTERVAL_MS = { 'archive.org': 1000, 'loc.gov': 5000, 'wikimedia.org': 1000, 'wikipedia.org': 1000, 'nps.gov': 7200, default: 1000 };
export const intervalFor = (host) => { for (const [k, v] of Object.entries(HOST_INTERVAL_MS)) if (k !== 'default' && (host === k || host.endsWith('.' + k))) return v; return HOST_INTERVAL_MS.default; };

export class HardStop extends Error { constructor(host, status) { super(`hard stop: ${host} answered ${status}; not retrying`); this.name = 'HardStop'; this.host = host; this.status = status; } }
export class RightsRefusal extends Error { constructor(reason, url) { super(`refused by the rights gate: ${reason} (${url})`); this.name = 'RightsRefusal'; this.reason = reason; this.url = url; } }

const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const sha1 = (s) => crypto.createHash('sha1').update(s).digest('hex');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Which registered source does this URL belong to? archive.org URLs are matched by identifier; other hosts by hostname. */
export function sourceForUrl(registry, url) {
  const u = new URL(url);
  const host = normHost(u.hostname).replace(/^www\./, '');
  const m = u.pathname.match(/^\/(?:\d+\/)?(?:details|download|stream|metadata|items)\/([^/]+)/);
  for (const s of registry.sources.values()) {
    if (m && s.imprint && s.imprint.ia_id === m[1]) return s;
  }
  if (!m) for (const s of registry.sources.values()) if ((s.hosts || []).includes(host) && !/archive\.org$/.test(host)) return s;
  return null;
}

export function createFetcher({ userAgent = USER_AGENT, cacheDir = DEFAULT_CACHE, registry = loadSources(), lockFile = null, fetchImpl = globalThis.fetch, now = () => Date.now(), sleepImpl = sleep, log = () => {}, timeoutMs = 60000, maxRetries = 3 } = {}) {
  fs.mkdirSync(cacheDir, { recursive: true });
  const lockPath = lockFile || path.join(cacheDir, 'sources.lock.json');
  const lock = fs.existsSync(lockPath) ? JSON.parse(fs.readFileSync(lockPath, 'utf8')) : {};
  const last = new Map();      // host -> time of the last request start
  const queue = new Map();     // host -> promise chain (sequential per host)
  const blocked = new Set();   // hosts that answered 403
  const stats = { requests: 0, cacheHits: 0, bytesDownloaded: 0, bytesFromCache: 0, refusals: 0 };

  const keyOf = (url, range) => sha1(`${url}|${range || ''}`);
  const save = () => fs.writeFileSync(lockPath, JSON.stringify(lock, null, 1));

  function gate(url, { allowUnregistered = false } = {}) {
    const g = fetchAllowed(registry, url);
    if (!g.ok) { stats.refusals++; throw new RightsRefusal(g.reason, url); }
    const src = sourceForUrl(registry, url);
    if (!src) {
      if (allowUnregistered) return null;
      stats.refusals++; throw new RightsRefusal('the identifier or host is not registered in docs/historian/sources.yaml', url);
    }
    const problems = tierProblems(src);
    if (src.tier === 'C' || src.tier === 'A-pending' || problems.length) { stats.refusals++; throw new RightsRefusal(`source ${src.id} is ${src.tier}${problems.length ? ': ' + problems.join('; ') : ''}`, url); }
    return src;
  }

  /** a redirect target: the ban list and refused identifiers always; when its path names an archive.org item, registration and tier too (exactly the first request's gate) */
  function hopGate(url, allowUnregistered) {
    const named = /^\/(?:\d+\/)?(?:details|download|stream|metadata|items)\/[^/]+/.test(new URL(url).pathname);
    if (named) return gate(url, { allowUnregistered });
    const g = fetchAllowed(registry, url);
    if (!g.ok) { stats.refusals++; throw new RightsRefusal(g.reason, url); }
    return null;
  }

  async function polite(host, fn) {
    const prev = queue.get(host) || Promise.resolve();
    const run = prev.catch(() => {}).then(async () => {
      if (blocked.has(host)) throw new HardStop(host, 403);
      const wait = (last.get(host) || 0) + intervalFor(host) - now();
      if (wait > 0) await sleepImpl(wait);
      last.set(host, now());
      return fn();
    });
    queue.set(host, run.catch(() => {}));
    return run;
  }

  /** returns { body: Buffer, cached: boolean, status, url, range, sha256, bytes } */
  async function get(url, { range = null, allowUnregistered = false, refresh = false } = {}) {
    gate(url, { allowUnregistered });
    const key = keyOf(url, range);
    const bodyPath = path.join(cacheDir, key + '.body'), metaPath = path.join(cacheDir, key + '.meta.json');
    if (!refresh && fs.existsSync(bodyPath) && fs.existsSync(metaPath)) {
      const body = fs.readFileSync(bodyPath);
      stats.cacheHits++; stats.bytesFromCache += body.length;
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      return { body, cached: true, status: meta.status, url, range, sha256: meta.sha256, bytes: body.length, meta };
    }
    const host = normHost(new URL(url).hostname).replace(/^www\./, '');
    let attempt = 0;
    for (;;) {
      attempt++;
      // redirects are followed by hand so that EVERY hop passes the rights gate: a registered URL that redirects to a Tier C host or a refused identifier is refused, not fetched
      let res = null, cur = url;
      for (let hop = 0; ; hop++) {
        const curHost = normHost(new URL(cur).hostname).replace(/^www\./, '');
        res = await polite(curHost, async () => {
          stats.requests++;
          const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), timeoutMs);
          try { return await fetchImpl(cur, { headers: { 'User-Agent': userAgent, ...(range ? { Range: `bytes=${range}` } : {}) }, redirect: 'manual', signal: ctl.signal }); }
          finally { clearTimeout(timer); }
        });
        if (![301, 302, 303, 307, 308].includes(res.status)) break;
        const loc = res.headers && res.headers.get ? res.headers.get('location') : null;
        if (!loc) throw new Error(`HTTP ${res.status} without a Location header for ${cur}`);
        if (hop >= 5) throw new Error(`too many redirects for ${url}`);
        const next = new URL(loc, cur).toString();
        try { hopGate(next, allowUnregistered); } catch (e) { if (e instanceof RightsRefusal) throw new RightsRefusal(`redirect target refused: ${e.reason}`, next); throw e; }
        const nh = normHost(new URL(next).hostname);
        const same = (a, b) => a === b || a.endsWith('.' + b) || b.endsWith('.' + a);
        const rootOf = (h) => h.split('.').slice(-2).join('.');
        if (!same(nh, normHost(new URL(url).hostname)) && rootOf(nh) !== rootOf(normHost(new URL(url).hostname))) { stats.refusals++; throw new RightsRefusal('redirect target leaves the registered source\'s domain', next); }
        cur = next;
      }
      if (res.status === 403) { blocked.add(host); throw new HardStop(host, 403); }
      if ((res.status === 429 || res.status >= 500) && attempt <= maxRetries) {
        const ra = Number(res.headers && res.headers.get && res.headers.get('retry-after'));
        await sleepImpl(Number.isFinite(ra) && ra > 0 ? ra * 1000 : 2000 * 2 ** (attempt - 1));
        continue;
      }
      if (!(res.status === 200 || res.status === 206)) throw new Error(`HTTP ${res.status} for ${url}`);
      const body = Buffer.from(await res.arrayBuffer());
      stats.bytesDownloaded += body.length;
      const meta = { url, range, status: res.status, sha256: sha256(body), bytes: body.length, fetched_at: new Date(now()).toISOString(), content_type: res.headers && res.headers.get ? res.headers.get('content-type') : null,
        content_range: res.headers && res.headers.get ? res.headers.get('content-range') : null };
      fs.writeFileSync(bodyPath, body); fs.writeFileSync(metaPath, JSON.stringify(meta, null, 1));
      lock[key] = { url, range, sha256: meta.sha256, bytes: meta.bytes, fetched_at: meta.fetched_at }; save();
      return { body, cached: false, status: res.status, url, range, sha256: meta.sha256, bytes: body.length, meta };
    }
  }
  const text = async (url, o) => { const r = await get(url, o); return { ...r, text: r.body.toString('utf8') }; };
  const json = async (url, o) => { const r = await get(url, o); return { ...r, json: JSON.parse(r.body.toString('utf8')) }; };
  return { get, text, json, stats, gate, lock, blocked, cacheDir };
}

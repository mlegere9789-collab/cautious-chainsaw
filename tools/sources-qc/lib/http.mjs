// Polite, cached, resumable HTTP for the sources QC.
//
// Rules enforced here (not left to callers):
//  * honest User-Agent with a contact address
//  * at most one request per second per host (more, if robots.txt Crawl-delay asks for it)
//  * robots.txt is read once per host and obeyed (a Disallow means: do not fetch, record why)
//  * hosts classified 'blocked' (bot protection known) are never fetched beyond a single probe
//  * every response (and every failure) is cached under tmp/sources-v2/cache so re-runs cost nothing
//  * redirects are followed by hand so every hop is rate-limited, robots-checked and logged
//  * bodies are capped; nothing is executed or rendered

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const CACHE_DIR = join(ROOT, 'tmp', 'sources-v2', 'cache');
export const UA = 'Gettysburg-sources-QC/1.0 (contact mlegere9789@gmail.com; read-only link verification, 1 req/s/host)';

const sha1 = (s) => createHash('sha1').update(s).digest('hex');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------------------------
// robots.txt
// ---------------------------------------------------------------------------------------------
export function parseRobots(text) {
  // returns groups: [{agents:[...], allow:[...], disallow:[...], crawlDelay}]
  const groups = [];
  let cur = null;
  let lastWasAgent = false;
  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;
    const i = line.indexOf(':');
    if (i < 0) continue;
    const k = line.slice(0, i).trim().toLowerCase();
    const v = line.slice(i + 1).trim();
    if (k === 'user-agent') {
      if (!cur || !lastWasAgent) { cur = { agents: [], allow: [], disallow: [], crawlDelay: null }; groups.push(cur); }
      cur.agents.push(v.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!cur) continue;
    if (k === 'disallow') cur.disallow.push(v);
    else if (k === 'allow') cur.allow.push(v);
    else if (k === 'crawl-delay') cur.crawlDelay = Number(v) || null;
  }
  return groups;
}

function robotsRulesFor(groups, ua) {
  const name = ua.toLowerCase();
  const specific = groups.filter((g) => g.agents.some((a) => a !== '*' && name.includes(a)));
  const pick = specific.length ? specific : groups.filter((g) => g.agents.includes('*'));
  return {
    allow: pick.flatMap((g) => g.allow),
    disallow: pick.flatMap((g) => g.disallow),
    crawlDelay: pick.map((g) => g.crawlDelay).find((x) => x != null) ?? null,
    matched: specific.length ? 'specific' : pick.length ? '*' : 'none',
  };
}

function patternToRegex(p) {
  const esc = p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp('^' + esc.replace(/\\\$$/, '$'));
}

/** Longest matching rule wins; Allow beats Disallow on a tie (RFC 9309). */
export function robotsAllows(groups, ua, pathAndQuery) {
  const r = robotsRulesFor(groups, ua);
  let best = { len: -1, allow: true, rule: null };
  for (const d of r.disallow) {
    if (!d) continue;
    if (patternToRegex(d).test(pathAndQuery) && d.length > best.len) best = { len: d.length, allow: false, rule: 'Disallow: ' + d };
  }
  for (const a of r.allow) {
    if (!a) continue;
    if (patternToRegex(a).test(pathAndQuery) && a.length >= best.len) best = { len: a.length, allow: true, rule: 'Allow: ' + a };
  }
  return { allowed: best.allow, rule: best.rule, crawlDelay: r.crawlDelay, matched: r.matched };
}

// ---------------------------------------------------------------------------------------------
// host policy
// ---------------------------------------------------------------------------------------------
/** blocked = known bot protection: one probe then stop. api_only = only documented API endpoints. */
export const HOST_POLICY = {
  'ehistory.osu.edu': { policy: 'blocked', reason: 'HTTP 403 to automated fetches (known, owner-confirmed)', probe: 1 },
  'babel.hathitrust.org': { policy: 'blocked', reason: 'Cloudflare 403 to scripted clients; robots.txt Disallow: /cgi/', probe: 1 },
  'hdl.handle.net': { policy: 'blocked', reason: 'resolves to babel.hathitrust.org (blocked)', probe: 0 },
  'catalog.hathitrust.org': { policy: 'api_only', reason: 'catalog Bib API only (api/volumes/brief|full/htid/<id>.json)' },
};

export function hostPolicy(host) {
  return HOST_POLICY[host] ?? { policy: 'fetch', reason: 'default: polite fetch' };
}

// ---------------------------------------------------------------------------------------------
// the client
// ---------------------------------------------------------------------------------------------
export class PoliteClient {
  constructor({ cacheDir = CACHE_DIR, ua = UA, minGapMs = 1000, timeoutMs = 25000, maxBytes = 6 * 1024 * 1024, maxRedirects = 6, offline = false, log = () => {} } = {}) {
    this.cacheDir = cacheDir;
    this.ua = ua;
    this.minGapMs = minGapMs;
    this.timeoutMs = timeoutMs;
    this.maxBytes = maxBytes;
    this.maxRedirects = maxRedirects;
    this.offline = offline;
    this.log = log;
    this.nextSlot = new Map(); // host -> epoch ms when the next request may start
    this.robots = new Map(); // host -> {groups, status, fetchedAt}
    this.counts = new Map(); // host -> requests actually sent
    this.chain = Promise.resolve();
    mkdirSync(join(cacheDir, 'http'), { recursive: true });
  }

  cachePaths(key) {
    const h = sha1(key);
    const dir = join(this.cacheDir, 'http', h.slice(0, 2));
    return { dir, meta: join(dir, h + '.json'), body: join(dir, h + '.body') };
  }

  readCache(key) {
    const p = this.cachePaths(key);
    if (!existsSync(p.meta)) return null;
    try {
      const meta = JSON.parse(readFileSync(p.meta, 'utf8'));
      meta.body = existsSync(p.body) ? readFileSync(p.body) : null;
      return meta;
    } catch { return null; }
  }

  writeCache(key, meta, body) {
    const p = this.cachePaths(key);
    mkdirSync(p.dir, { recursive: true });
    if (body) writeFileSync(p.body, body);
    writeFileSync(p.meta, JSON.stringify(meta, null, 1));
  }

  async waitSlot(host, crawlDelaySec) {
    const gap = Math.max(this.minGapMs, (crawlDelaySec ?? 0) * 1000);
    const now = Date.now();
    const at = Math.max(now, this.nextSlot.get(host) ?? 0);
    this.nextSlot.set(host, at + gap);
    if (at > now) await sleep(at - now);
  }

  async rawGet(url, { headers = {}, method = 'GET', range = null } = {}) {
    const host = new URL(url).hostname.toLowerCase();
    this.counts.set(host, (this.counts.get(host) ?? 0) + 1);
    const h = { 'user-agent': this.ua, accept: '*/*', 'accept-language': 'en', ...headers };
    if (range) h.range = range;
    const t0 = Date.now();
    const res = await fetch(url, { method, redirect: 'manual', headers: h, signal: AbortSignal.timeout(this.timeoutMs) });
    let body = Buffer.alloc(0);
    let truncated = false;
    if (method !== 'HEAD' && res.body) {
      const chunks = [];
      let n = 0;
      const reader = res.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(Buffer.from(value));
        n += value.length;
        if (n > this.maxBytes) { truncated = true; try { await reader.cancel(); } catch { /* ignore */ } break; }
      }
      body = Buffer.concat(chunks);
      if (body.length > this.maxBytes) body = body.subarray(0, this.maxBytes);
    }
    const hd = {};
    for (const k of ['content-type', 'content-length', 'content-range', 'location', 'last-modified', 'etag', 'server', 'x-robots-tag', 'content-language', 'content-disposition', 'retry-after', 'cf-mitigated', 'x-frame-options']) {
      const v = res.headers.get(k);
      if (v != null) hd[k] = v;
    }
    return { status: res.status, headers: hd, body, truncated, ms: Date.now() - t0 };
  }

  async getRobots(host, scheme = 'https') {
    if (this.robots.has(host)) return this.robots.get(host);
    const url = `${scheme}://${host}/robots.txt`;
    const key = 'GET ' + url;
    let rec = this.readCache(key);
    if (!rec && !this.offline) {
      await this.waitSlot(host, 0);
      try {
        const r = await this.rawGet(url);
        rec = { url, status: r.status, content_type: r.headers['content-type'] ?? null, fetched_at: new Date().toISOString(), bytes: r.body.length, headers: r.headers };
        this.writeCache(key, rec, r.body);
        rec.body = r.body;
      } catch (e) {
        rec = { url, status: 0, error: String(e?.cause?.code ?? e?.message ?? e), fetched_at: new Date().toISOString() };
        this.writeCache(key, rec, null);
      }
    }
    const out = { url, status: rec?.status ?? 0, error: rec?.error ?? null, groups: [], text: null };
    if (rec && rec.status >= 200 && rec.status < 300 && rec.body && /text|plain|octet/i.test(rec.content_type ?? 'text/plain')) {
      out.text = rec.body.toString('utf8');
      out.groups = parseRobots(out.text);
    }
    // 4xx for robots.txt = no restrictions (RFC 9309); 5xx / network failure = unreachable: be conservative only for 5xx
    out.unreachable = out.status >= 500 || out.status === 0;
    this.robots.set(host, out);
    return out;
  }

  /**
   * GET with caching, robots, politeness and manual redirects.
   * Returns {url, final_url, status, redirects:[{url,status,location}], content_type, bytes, headers, body(Buffer|null),
   *          cached, skipped:null|{why,detail}, error}
   */
  async get(url, { range = null, method = 'GET', refresh = false, honorRobots = true, probeOnly = false } = {}) {
    const hops = [];
    let cur = url;
    let cached = true;
    for (let i = 0; i <= this.maxRedirects; i++) {
      const u = new URL(cur);
      const host = u.hostname.toLowerCase();
      const pol = hostPolicy(host.replace(/^www\./, ''));
      const key = `${method} ${cur}${range ? ' range=' + range : ''}`;
      if (pol.policy === 'blocked' && !probeOnly) {
        return { url, final_url: cur, status: null, redirects: hops, skipped: { why: 'blocked_host', detail: pol.reason }, cached, body: null };
      }
      const hit = !refresh ? this.readCache(key) : null;
      let meta = hit;
      if (!meta) {
        cached = false;
        if (this.offline) return { url, final_url: cur, status: null, redirects: hops, skipped: { why: 'offline_cache_miss', detail: key }, cached, body: null };
        let rob = null;
        if (honorRobots) {
          rob = await this.getRobots(host, u.protocol.replace(':', ''));
          if (rob.unreachable) {
            // do not hammer a host whose robots.txt cannot be read (5xx / timeout)
            return { url, final_url: cur, status: null, redirects: hops, skipped: { why: 'robots_unreadable', detail: `robots.txt status ${rob.status} ${rob.error ?? ''}`.trim() }, cached, body: null };
          }
          const a = robotsAllows(rob.groups, this.ua, u.pathname + u.search);
          if (!a.allowed) {
            return { url, final_url: cur, status: null, redirects: hops, skipped: { why: 'robots_disallow', detail: a.rule }, cached, body: null };
          }
        }
        await this.waitSlot(host, rob ? robotsRulesFor(rob.groups, this.ua).crawlDelay : null);
        try {
          const r = await this.rawGet(cur, { method, range });
          meta = {
            url: cur, method, range, status: r.status, headers: r.headers, bytes: r.body.length, truncated: r.truncated,
            content_type: r.headers['content-type'] ?? null, fetched_at: new Date().toISOString(), ms: r.ms,
            sha256: createHash('sha256').update(r.body).digest('hex'),
          };
          this.writeCache(key, meta, r.body);
          meta.body = r.body;
        } catch (e) {
          const code = e?.cause?.code ?? e?.code ?? null;
          meta = { url: cur, method, range, status: 0, error: String(e?.name === 'TimeoutError' ? 'timeout' : (code ?? e?.message ?? e)), error_detail: String(e?.cause?.message ?? e?.message ?? e).slice(0, 300), fetched_at: new Date().toISOString() };
          this.writeCache(key, meta, null);
          meta.body = null;
        }
      }
      if (meta.status === 0) return { url, final_url: cur, status: 0, error: meta.error, error_detail: meta.error_detail, redirects: hops, cached, body: null, skipped: null };
      if ([301, 302, 303, 307, 308].includes(meta.status) && meta.headers?.location) {
        const next = new URL(meta.headers.location, cur).toString();
        hops.push({ url: cur, status: meta.status, location: next });
        if (probeOnly) return { url, final_url: cur, status: meta.status, redirects: hops, headers: meta.headers, content_type: meta.content_type ?? null, bytes: meta.bytes ?? 0, body: meta.body ?? null, cached, skipped: null };
        cur = next;
        continue;
      }
      return {
        url, final_url: cur, status: meta.status, redirects: hops, headers: meta.headers ?? {}, content_type: meta.content_type ?? null,
        bytes: meta.bytes ?? 0, truncated: !!meta.truncated, body: meta.body ?? null, cached, skipped: null, sha256: meta.sha256 ?? null, fetched_at: meta.fetched_at,
      };
    }
    return { url, final_url: cur, status: null, redirects: hops, skipped: { why: 'too_many_redirects', detail: String(this.maxRedirects) }, cached, body: null };
  }
}

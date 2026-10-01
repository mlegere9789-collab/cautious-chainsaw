#!/usr/bin/env node
// Polite, cached, read-only probe of the non-OR links of Gettysburg_Sources_v2.docx that no reviewer has looked at.
//
//   node tools/sources-qc/probe-links.mjs [--out data-src/sources-v2/qc/link-probe.json] [--only 544,545] [--offline]
//
// What it does NOT do: fetch ehistory.osu.edu or babel.hathitrust.org / hdl.handle.net (403 to automated clients:
// recorded as blocked_to_bots, never retried or circumvented), fetch URLs a robots.txt disallows (recorded as
// robots_disallowed), or send more than one request per second to any host (see lib/http.mjs; every response is cached
// under tmp/sources-v2/cache so a re-run costs nothing).
//
// Identity evidence it gathers where an API exists: Internet Archive /metadata/<id>, HathiTrust catalog
// api/volumes/brief/htid/<id>.json, the <title> of an HTML page, a Content-Type, a Gutenberg header. None of this
// verifies a document; it says what the host itself says about the URL that was listed.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PoliteClient, UA, hostPolicy } from './lib/http.mjs';
import { archiveIdOf, hathiIdOf, hostOf } from './lib/urlnorm.mjs';
import { titleOverlap } from './lib/structural.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const OUT = resolve(ROOT, arg('--out', 'data-src/sources-v2/qc/link-probe.json'));
const OFFLINE = argv.includes('--offline');
const ONLY = arg('--only', null)?.split(',').map(Number);
/** entries two reviewers have already examined in full: their link status comes from the review files */
const REVIEWED = new Set([586, 587, 588, 589, 590, 591, 592, 593, 594, 595, 596, 597]);

const BLOCKED = new Set(['ehistory.osu.edu', 'babel.hathitrust.org', 'hdl.handle.net']);

const titleOf = (html) => {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return m ? m[1].replace(/\s+/g, ' ').trim().slice(0, 240) : null;
};
const metaOf = (html, name) => {
  const m = new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']*)["']`, 'i').exec(html);
  return m ? m[1].trim().slice(0, 300) : null;
};

/** Google Books: robots.txt disallows the dq= and pg= parameters, so only the bare book id page is fetched. */
function bareGoogleBooks(url) {
  const u = new URL(url);
  const id = u.searchParams.get('id');
  return id ? `https://books.google.com/books?id=${id}` : null;
}

function classify(r, originalUrl) {
  if (r.skipped) {
    if (r.skipped.why === 'blocked_host') return 'blocked_to_bots';
    if (r.skipped.why === 'robots_disallow') return 'robots_disallowed';
    return `not_fetched_${r.skipped.why}`;
  }
  if (r.status === 0 || r.status == null) return /timeout/i.test(r.error ?? '') ? 'timeout' : 'network_error';
  if (r.status === 403 || r.status === 429 || r.status === 401) return 'blocked_to_bots';
  if (r.status === 404 || r.status === 410) return 'dead';
  if (r.status >= 500) return 'server_error';
  if (r.status >= 200 && r.status < 300) {
    if (!r.redirects?.length) return 'live';
    // a redirect that lands on a site root or a generic guide is a dead link in disguise: say so for a human to look at
    const fin = new URL(r.final_url);
    const orig = new URL(originalUrl);
    const sameHostFamily = fin.hostname.replace(/^www\./, '') === orig.hostname.replace(/^www\./, '');
    const generic = fin.pathname === '/' || fin.pathname.split('/').filter(Boolean).length < Math.max(1, orig.pathname.split('/').filter(Boolean).length - 2);
    if (generic) return 'redirected_to_generic_page';
    return sameHostFamily ? 'redirected' : 'redirected_other_host';
  }
  return `http_${r.status}`;
}

async function main() {
  const entries = JSON.parse(readFileSync(join(ROOT, 'data-src/sources-v2/entries.json'), 'utf8')).entries;
  const targets = entries.filter((e) => e.kind === 'non_or' && !REVIEWED.has(e.n) && (!ONLY || ONLY.includes(e.n)));
  const client = new PoliteClient({ offline: OFFLINE, minGapMs: 1200, timeoutMs: 25000, maxBytes: 3 * 1024 * 1024, log: () => {} });
  const t0 = Date.now();

  // ---------------------------------------------------------------- phase 1: documented APIs
  const api = { archive_org_metadata: {}, hathi_catalog: {} };
  const iaIds = new Set();
  const hathiIds = new Set();
  for (const e of entries.filter((x) => x.kind === 'non_or' || x.kind === 'or_report')) {
    for (const l of e.links) {
      const ia = archiveIdOf(l.url);
      if (ia && e.kind === 'non_or' && !REVIEWED.has(e.n)) iaIds.add(ia);
      const h = hathiIdOf(l.url);
      if (h?.id) hathiIds.add(h.id);
    }
  }
  // items the two reviewers named as the place to take the text from: confirm each identifier exists and read its own metadata
  const normPath = join(ROOT, 'data-src/sources-v2/qc/review-norm.json');
  const reviewerIa = existsSync(normPath) ? (JSON.parse(readFileSync(normPath, 'utf8')).ia_ids_to_verify ?? []) : [];
  for (const id of reviewerIa) iaIds.add(id);
  for (const id of [...iaIds].sort()) {
    const url = `https://archive.org/metadata/${id}`;
    const r = await client.get(url);
    let md = null;
    if (r.status === 200 && r.body) {
      try {
        const j = JSON.parse(r.body.toString('utf8'));
        const m = j.metadata ?? {};
        md = {
          title: m.title ?? null, creator: m.creator ?? null, date: m.date ?? null, year: m.year ?? null, publisher: m.publisher ?? null,
          mediatype: m.mediatype ?? null, collection: m.collection ?? null, licenseurl: m.licenseurl ?? null,
          possible_copyright_status: m['possible-copyright-status'] ?? null, copyright_evidence: m['copyright-evidence'] ?? null,
          imagecount: m.imagecount ?? null, scanner: m.scanner ?? null, sponsor: m.sponsor ?? null, ocr: m.ocr ?? null,
          is_dark: j.is_dark ?? null, item_last_updated: j.item_last_updated ?? null, files_count: (j.files ?? []).length,
          has_djvu_txt: (j.files ?? []).some((f) => /_djvu\.txt$/.test(f.name)),
          has_page_numbers: (j.files ?? []).some((f) => /_page_numbers\.json$/.test(f.name)),
        };
      } catch { md = { parse_error: true }; }
    }
    api.archive_org_metadata[id] = { url, status: r.status ?? null, skipped: r.skipped ?? null, error: r.error ?? null, cached: r.cached, sha256: r.sha256 ?? null, fetched_at: r.fetched_at ?? null, metadata: md };
  }
  for (const id of [...hathiIds].sort()) {
    const url = `https://catalog.hathitrust.org/api/volumes/brief/htid/${id}.json`;
    const r = await client.get(url);
    let rec = null;
    if (r.status === 200 && r.body) {
      try {
        const j = JSON.parse(r.body.toString('utf8'));
        const recs = Object.values(j.records ?? {});
        const items = j.items ?? [];
        rec = {
          titles: recs.map((x) => x.titles).flat(), publish_dates: recs.map((x) => x.publishDates).flat(), record_urls: recs.map((x) => x.recordURL),
          items_in_record: items.length, items: items.filter((i) => i.htid === id).map((i) => ({ htid: i.htid, rights: i.usRightsString ?? null, orig: i.orig ?? null, from_record: i.fromRecord ?? null, enumcron: i.enumcron ?? null, last_update: i.lastUpdate ?? null })),
        };
      } catch { rec = { parse_error: true }; }
    }
    api.hathi_catalog[id] = { url, status: r.status ?? null, skipped: r.skipped ?? null, error: r.error ?? null, cached: r.cached, sha256: r.sha256 ?? null, fetched_at: r.fetched_at ?? null, record: rec };
  }

  // ---------------------------------------------------------------- phase 2: the listed links
  client.maxBytes = 320 * 1024;
  const results = {};
  const queue = [];
  for (const e of targets) {
    for (const l of e.links) queue.push({ e, l });
  }
  const one = async ({ e, l }) => {
    const host = hostOf(l.url);
    const rec = { n: e.n, url: l.url, host, link_kind: l.kind, insecure_http: /^http:/i.test(l.url) };
    if (BLOCKED.has(host)) {
      Object.assign(rec, { link_class: 'blocked_to_bots', how: 'host policy: known 403 to automated clients (task brief); not probed, not circumvented', policy: hostPolicy(host) });
      return rec;
    }
    const ia = archiveIdOf(l.url);
    if (ia && host === 'archive.org') {
      const m = api.archive_org_metadata[ia];
      rec.how = 'archive.org /metadata API (the item page itself is not fetched)';
      rec.ia_id = ia;
      if (m?.status === 200 && m.metadata && !m.metadata.parse_error && Object.keys(m.metadata).length) {
        rec.link_class = m.metadata.is_dark ? 'dead' : 'live';
        rec.title = m.metadata.title;
      } else rec.link_class = m?.status === 200 ? 'dead' : (m?.status === 404 ? 'dead' : 'unknown');
      rec.status = m?.status ?? null;
      return rec;
    }
    let url = l.normal ?? l.url;
    if (host === 'books.google.com') {
      const bare = bareGoogleBooks(url);
      rec.how = 'bare book id page only: robots.txt disallows the dq= and pg= parameters of the listed URL';
      rec.page_anchor_not_checked = true;
      if (bare) url = bare;
    }
    const r = await client.get(url);
    rec.fetched_url = url;
    rec.status = r.status ?? null;
    rec.final_url = r.final_url ?? null;
    rec.redirects = (r.redirects ?? []).map((h) => ({ status: h.status, to: h.location }));
    rec.content_type = r.content_type ?? null;
    rec.bytes = r.bytes ?? null;
    rec.truncated = !!r.truncated;
    rec.cached = !!r.cached;
    rec.sha256 = r.sha256 ?? null;
    rec.fetched_at = r.fetched_at ?? null;
    if (r.skipped) rec.skipped = r.skipped;
    if (r.error) rec.error = r.error;
    if (r.body && /html|xml/i.test(r.content_type ?? '')) {
      const html = r.body.toString('utf8');
      rec.title = titleOf(html);
      rec.og_title = metaOf(html, 'og:title');
      rec.meta_description = metaOf(html, 'description');
      rec.copyright_hint = (/(?:©|&copy;|copyright)\s*[^<\n]{0,90}/i.exec(html) ?? [null])[0];
      rec.license_hint = (/(creative commons[^<\n]{0,80}|CC[ -]BY[^<\n]{0,40}|all rights reserved)/i.exec(html) ?? [null])[0];
    }
    if (host === 'books.google.com' && r.body) {
      const t = r.body.toString('utf8');
      const wrap = t.indexOf('class="bookinfo_sectionwrap">');
      const info = wrap >= 0 ? t.slice(wrap, wrap + 700).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').replace(/^class="bookinfo_sectionwrap">\s*/, '').replace(/<.*$/, '').trim() : null;
      rec.gb_bookinfo = info ? info.slice(0, 200) : null;
      rec.gb_viewability = /Full view/i.test(t) ? 'full_view' : /Limited preview/i.test(t) ? 'limited_preview' : /Snippet view/i.test(t) ? 'snippet_view' : /No preview/i.test(t) ? 'no_preview' : 'unknown';
      rec.gb_years_on_page = [...new Set((t.match(/\b(1[6-9]\d\d|20[0-2]\d)\b/g) ?? []))].slice(0, 8);
    }
    if (host === 'gutenberg.org' && r.body) rec.gutenberg_head = r.body.toString('utf8').slice(0, 1200).replace(/\s+/g, ' ');
    rec.link_class = classify(r, l.url);
    return rec;
  };
  // hosts in parallel, each host serialised and rate limited by the client
  const byHost = new Map();
  for (const q of queue) {
    const h = hostOf(q.l.url);
    if (!byHost.has(h)) byHost.set(h, []);
    byHost.get(h).push(q);
  }
  await Promise.all([...byHost.values()].map(async (list) => {
    for (const q of list) {
      try { results[q.e.n] = await one(q); } catch (err) { results[q.e.n] = { n: q.e.n, url: q.l.url, link_class: 'probe_error', error: String(err?.message ?? err) }; }
    }
  }));

  // ---------------------------------------------------------------- phase 3: Wayback Machine lookup for links that are gone
  // The availability API names the capture closest to 2024; the capture's page title is compared with the entry's title.
  // A capture whose title matches is evidence that the page existed and said what the entry says. It is not a review.
  for (const r of Object.values(results)) {
    if (!['dead', 'redirected_to_generic_page'].includes(r.link_class) || BLOCKED.has(r.host)) continue;
    const e = entries[r.n - 1];
    const api = `https://archive.org/wayback/available?url=${encodeURIComponent(r.url)}&timestamp=20240101`;
    const a = await client.get(api);
    const wb = { lookup: api, status: a.status ?? null, available: false };
    try {
      const j = a.body ? JSON.parse(a.body.toString('utf8')) : null;
      const snap = j?.archived_snapshots?.closest;
      if (snap?.available && snap.url) {
        wb.available = true;
        wb.timestamp = snap.timestamp;
        wb.snapshot_url = snap.url.replace(/^http:/, 'https:');
        const c = await client.get(wb.snapshot_url);
        wb.snapshot_status = c.status ?? null;
        wb.snapshot_bytes = c.bytes ?? null;
        wb.snapshot_sha256 = c.sha256 ?? null;
        if (c.body && /html/i.test(c.content_type ?? '')) {
          const html = c.body.toString('utf8');
          wb.snapshot_title = titleOf(html);
          const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1]?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          wb.snapshot_h1 = h1 ? h1.slice(0, 200) : null;
          wb.title_overlap = titleOverlap(e.title, `${wb.snapshot_title ?? ''} ${wb.snapshot_h1 ?? ''}`);
        } else if (c.body) {
          wb.snapshot_content_type = c.content_type ?? null;
        }
      }
    } catch { wb.parse_error = true; }
    r.wayback = wb;
  }

  const tally = {};
  for (const r of Object.values(results)) tally[r.link_class] = (tally[r.link_class] ?? 0) + 1;
  const reqCounts = Object.fromEntries([...client.counts.entries()].sort());
  const out = {
    meta: {
      schema: 'sources-v2-link-probe/1',
      generator: 'tools/sources-qc/probe-links.mjs',
      user_agent: UA,
      run_started: new Date(t0).toISOString(),
      run_seconds: Math.round((Date.now() - t0) / 1000),
      politeness: 'at most 1 request/second/host (1.2 s gap), robots.txt honoured, ehistory/hathitrust never fetched, every response cached under tmp/sources-v2/cache/http',
      entries_probed: targets.length,
      excluded_already_reviewed_twice: [...REVIEWED],
      link_class_tally: tally,
      requests_actually_sent_by_host: reqCounts,
      note: 'link_class describes the URL as listed. Nothing here verifies the document.',
    },
    api,
    results: Object.fromEntries(Object.entries(results).sort((a, b) => Number(a[0]) - Number(b[0]))),
  };
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
  console.log(JSON.stringify({ tally, requests: reqCounts, seconds: out.meta.run_seconds }, null, 1));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((e) => { console.error(e); process.exit(1); });
}

#!/usr/bin/env node
// Independent check of the Internet Archive items the reviewers named as the place to take a text from.
//
//   node tools/sources-qc/verify-ia.mjs [--out data-src/sources-v2/qc/ia-verify.json] [--offline]
//
// For every archive.org item that any reviewer of an other-works entry (544-657) named as a text source, this reads the
// item's own metadata record (https://archive.org/metadata/<id>, a documented API) and keeps the fields the rights and
// identity claims rest on: title, creator, date/year, publisher, possible-copyright-status, licence, image count, whether an
// OCR text file and a page-number file exist. It confirms that the identifier exists and says what the Archive says about
// it; it does not verify a document. Polite: honest User-Agent, one request per second per host, robots.txt read first,
// every response cached under tmp/sources-v2/cache so a re-run costs nothing. Nothing else is fetched.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildVocab, deriveReview } from './lib/derive.mjs';
import { PoliteClient, UA } from './lib/http.mjs';
import { loadReviews, makeReader } from './lib/reviews.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const OUT = resolve(ROOT, arg('--out', 'data-src/sources-v2/qc/ia-verify.json'));
const OFFLINE = argv.includes('--offline');

/** the archive.org item ids named by the reviewers of entries 544-657, with the entries and reviewers that name them */
export function namedIaItems(root = ROOT) {
  const { reviews } = loadReviews(makeReader(root));
  const entries = JSON.parse(readFileSync(join(root, 'data-src/sources-v2/entries.json'), 'utf8')).entries;
  const nonor = reviews.filter((r) => r.n >= 544 && r.n <= 657);
  const vocab = buildVocab(nonor.flatMap((r) => [r.item.replacement_url, r.item.extraction_notes]));
  const ids = new Map();
  for (const r of nonor) {
    const d = deriveReview(r, entries[r.n - 1], vocab);
    for (const s of [...d.source.text_ids, ...(d.source.listed_id ? [{ id: d.source.listed_id }] : [])]) {
      if (!s.id.startsWith('ia:')) continue;
      const id = s.id.slice(3);
      if (!ids.has(id)) ids.set(id, { entries: new Set(), reviewers: new Set() });
      ids.get(id).entries.add(r.n);
      ids.get(id).reviewers.add(r.id);
    }
  }
  return ids;
}

async function main() {
  const named = namedIaItems();
  const client = new PoliteClient({ offline: OFFLINE, minGapMs: 1200, timeoutMs: 25000, maxBytes: 3 * 1024 * 1024, log: () => {} });
  const t0 = Date.now();
  const items = {};
  for (const id of [...named.keys()].sort()) {
    const url = `https://archive.org/metadata/${id}`;
    const r = await client.get(url);
    let md = null;
    if (r.status === 200 && r.body) {
      try {
        const j = JSON.parse(r.body.toString('utf8'));
        const m = j.metadata ?? {};
        md = {
          title: m.title ?? null, creator: m.creator ?? null, date: m.date ?? null, year: m.year ?? null, publisher: m.publisher ?? null,
          volume: m.volume ?? null, mediatype: m.mediatype ?? null, collection: m.collection ?? null, licenseurl: m.licenseurl ?? null,
          possible_copyright_status: m['possible-copyright-status'] ?? null, copyright_evidence: m['copyright-evidence'] ?? null,
          imagecount: m.imagecount ?? null, scanner: m.scanner ?? null, sponsor: m.sponsor ?? null, contributor: m.contributor ?? null,
          is_dark: j.is_dark ?? null, item_last_updated: j.item_last_updated ?? null, files_count: (j.files ?? []).length,
          has_djvu_txt: (j.files ?? []).some((f) => /_djvu\.txt$/.test(f.name)),
          has_page_numbers: (j.files ?? []).some((f) => /_page_numbers\.json$/.test(f.name)),
        };
      } catch { md = { parse_error: true }; }
    }
    items[id] = {
      url, status: r.status ?? null, skipped: r.skipped ?? null, error: r.error ?? null, cached: r.cached, sha256: r.sha256 ?? null, fetched_at: r.fetched_at ?? null,
      named_by_entries: [...named.get(id).entries].sort((a, b) => a - b),
      named_by_reviewers: [...named.get(id).reviewers].sort(),
      metadata: md,
    };
  }
  const tally = {};
  for (const v of Object.values(items)) { const k = v.skipped ? `skipped:${v.skipped.why}` : String(v.status); tally[k] = (tally[k] ?? 0) + 1; }
  const doc = {
    schema: 'sources-v2-ia-verify/1',
    generator: 'tools/sources-qc/verify-ia.mjs',
    user_agent: UA,
    run_seconds: Math.round((Date.now() - t0) / 1000),
    politeness: 'honest User-Agent, one request per second per host (1.2 s gap), robots.txt read first, responses cached under tmp/sources-v2/cache; only the documented metadata API of archive.org was requested, nothing else',
    items_checked: Object.keys(items).length,
    status_tally: tally,
    note: 'Each record is what archive.org says about an identifier a reviewer named. It confirms the item exists and carries OCR text; it does not verify the document, and a date field is sometimes the start year of a series (the reviewers noticed this and read the title page instead).',
    items,
  };
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(doc, null, 1) + '\n');
  console.log(JSON.stringify({ items_checked: doc.items_checked, status_tally: tally, run_seconds: doc.run_seconds }, null, 1));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main().catch((e) => { console.error(e); process.exit(1); });

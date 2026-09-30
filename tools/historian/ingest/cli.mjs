#!/usr/bin/env node
// cli.mjs - ingestion command line (chapter 14 stages S1-S3, first slice).
//
//   node tools/historian/ingest/cli.mjs fetch   or27-1 [--sample | --range 0-2097151]
//   node tools/historian/ingest/cli.mjs segment or27-1 [--sample | --range a-b] [--out historian-src/raw/or27-1] [--no-repair]
//   node tools/historian/ingest/cli.mjs list
//
// fetch     downloads one registered Tier A/B source through the polite, rights-gated, cached fetcher (tmp/historian-cache; a second run downloads 0 bytes).
// segment   fetches (or reads the cache), normalises the OCR, parses the contents list, segments the reports, chunks passages and writes
//             <out>/report.json, <out>/documents.jsonl, <out>/passages.jsonl, <out>/normalized.txt
//           <out> defaults to historian-src/raw/<source id>/ which is git-ignored: source texts are never committed.
// --sample  is the first 2 MB of the volume (bytes=0-2097151), what the tests and the report figures in docs/historian/PIPELINE.md were produced from.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSources } from '../lib/sources.mjs';
import { createFetcher } from './fetch.mjs';
import { ingestOr27 } from './or27.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
export const SAMPLE_RANGE = '0-2097151';

const parseArgs = (argv) => {
  const a = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t.startsWith('--')) { const k = t.slice(2); const next = argv[i + 1]; if (next !== undefined && !next.startsWith('--') && ['range', 'out'].includes(k)) { a.flags[k] = next; i++; } else a.flags[k] = true; } else a._.push(t);
  }
  return a;
};

export function textUrlFor(source) {
  const id = source.imprint && source.imprint.ia_id;
  if (!id) throw new Error(`source ${source.id} has no Internet Archive identifier; this slice only ingests djvu.txt OCR`);
  return `https://archive.org/download/${id}/${id}_djvu.txt`;
}

export async function run(argv = process.argv.slice(2), { out = console.log, fetcher = null } = {}) {
  const args = parseArgs(argv);
  const [cmd, sid] = args._;
  const registry = loadSources();
  if (cmd === 'list') { for (const s of registry.sources.values()) if (s.imprint && s.imprint.ia_id) out(`${s.id}\t${s.tier}\t${s.imprint.ia_id}`); return 0; }
  if (!['fetch', 'segment'].includes(cmd) || !sid) { out('usage: cli.mjs fetch|segment <source id> [--sample | --range a-b] [--out dir] | list'); return 2; }
  const source = registry.sources.get(sid);
  if (!source) { out(`unknown source ${sid} (see: cli.mjs list)`); return 2; }
  const range = args.flags.range || (args.flags.sample ? SAMPLE_RANGE : null);
  const f = fetcher || createFetcher({ registry, log: out });
  const url = textUrlFor(source);
  const res = await f.text(url, { range });
  out(`${res.cached ? 'cache hit' : 'downloaded'}: ${url}${range ? ' bytes=' + range : ''} -> ${res.bytes} bytes, sha256 ${res.sha256.slice(0, 16)}...  (network bytes this run: ${f.stats.bytesDownloaded})`);
  if (cmd === 'fetch') return 0;
  if (!/^or27-/.test(sid)) { out('the segmenter in this slice knows the Official Records volume 27 layout only'); return 2; }
  const r = ingestOr27(res.text, { repair: !args.flags['no-repair'] });
  const dir = path.resolve(root, args.flags.out || `historian-src/raw/${sid}`);
  const rel = path.relative(root, dir).replace(/\\/g, '/');
  if (!/^(historian-src\/raw|tmp)\//.test(rel)) { out(`refusing to write outside historian-src/raw/ or tmp/: ${rel}`); return 2; }
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify({ source: sid, url, range, sha256: res.sha256, ...r.report }, null, 1));
  fs.writeFileSync(path.join(dir, 'normalized.txt'), r.norm.text);
  fs.writeFileSync(path.join(dir, 'documents.jsonl'), r.docs.map((d) => JSON.stringify({ ...d, text: undefined, chars: d.text.length })).join('\n') + '\n');
  fs.writeFileSync(path.join(dir, 'passages.jsonl'), r.passages.map((p) => JSON.stringify(p)).join('\n') + '\n');
  out(`wrote ${rel}/: ${r.docs.length} reports (of ${r.report.toc_entries} contents entries), ${r.passages.length} passages, mean ${r.report.passage_words.mean} words, ${r.report.edits} logged edits`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run().then((c) => process.exit(c), (e) => { console.error(e.message); process.exit(1); });
}

// Copy audit of the files of the conf-nc work item, with the rules of the packer (tools/bt/pack_theatre.mjs: audit(), AUDIT_RE, AUDIT_CS_RE, AUDIT_ALLOW; delegated decision DD-STG-02).
//
//   node docs/battle-theatre/rosters/pipeline2/conf_nc/nc_audit.mjs        writes GOVERNANCE/horde/ws-rosters/conf-nc/copy-audit.json
//
// 1. A scratch copy of what ships of this item (the 41 unit files and their flag files, the source ledger NC-MOORE-1882.json) and of the pointer file is put under
//    tmp/library/rosters/_nc_audit_dist/ at the same relative paths, and the packer's own audit() runs on it: every gzip file is opened and its text is audited.  Hits that no reviewed
//    allowance covers are listed as "hits" (a printed given name in the NAME field of a row, or in the normalised-name list of a flag file, is the allowance of DD-STG-02 and is not a hit).
// 2. Every printed word that the audit rules match is counted by field (name, rank, remarks of a row; normalised name of a flag file) so that the report can list them whether or not the
//    allowance covers them.  Nothing in a file is altered: a printed word stays as printed (Law 1 and 4).
// Standard library only; the scratch copy is deleted at the end.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(here, '../../../../..');
const BT = path.join(REPO, 'docs', 'battle-theatre');
const WS = path.join(BT, 'GOVERNANCE', 'horde', 'ws-rosters', 'conf-nc');
const NC = path.join(BT, 'rosters', 'data2', 'confederate', 'nc');
const DIST = path.join(REPO, 'tmp', 'library', 'rosters', '_nc_audit_dist');

const packer = await import(pathToFileURL(path.join(REPO, 'tools', 'bt', 'pack_theatre.mjs')).href);
const { audit, AUDIT_RE, AUDIT_CS_RE } = packer;

fs.rmSync(DIST, { recursive: true, force: true });
const copy = (src, rel) => { const d = path.join(DIST, rel); fs.mkdirSync(path.dirname(d), { recursive: true }); fs.copyFileSync(src, d); };
const unitFiles = fs.readdirSync(NC).filter(f => f.endsWith('.jsonl.gz') || f.endsWith('.flags.json.gz')).sort();
for (const f of unitFiles) copy(path.join(NC, f), 'rosters/data2/confederate/nc/' + f);
copy(path.join(BT, 'rosters', 'data2', 'sources', 'NC-MOORE-1882.json'), 'rosters/data2/sources/NC-MOORE-1882.json');
copy(path.join(BT, 'rosters', 'sources', 'conf-nc.json'), 'rosters/sources/conf-nc.json');

const hits = audit(DIST);

// printed words by field
const re = new RegExp(AUDIT_RE.source, 'gi'), cs = new RegExp(AUDIT_CS_RE.source, 'g');
const words = [];
const matchAll = (s) => {
  const out = [];
  for (const r of [re, cs]) { r.lastIndex = 0; let m; while ((m = r.exec(s))) { if (m[0] === '') { r.lastIndex++; continue; } out.push((m[1] && m[0].length <= 4 ? m[1] : m[0]).trim()); } }
  return out;
};
let rowsRead = 0, flagsRead = 0, bytes = 0;
for (const f of unitFiles) {
  const buf = zlib.gunzipSync(fs.readFileSync(path.join(NC, f)));
  bytes += buf.length;
  const unit = f.replace(/\.(flags\.json|jsonl)\.gz$/, '');
  if (f.endsWith('.jsonl.gz')) {
    const lines = buf.toString('utf8').split('\n').filter(Boolean);
    let rowNo = -1;
    for (const ln of lines) {
      const o = JSON.parse(ln);
      if (Array.isArray(o)) {
        rowNo++; rowsRead++;
        for (const [fi, field] of [[1, 'name'], [2, 'rank'], [3, 'remarks']]) for (const w of matchAll(String(o[fi] ?? ''))) words.push({ unit, row: rowNo, field, word: w, text: String(o[fi]).slice(0, 90) });
      } else {
        for (const w of matchAll(ln)) words.push({ unit, row: null, field: 'header', word: w, text: ln.slice(0, 90) });
      }
    }
  } else {
    flagsRead++;
    const o = JSON.parse(buf.toString('utf8'));
    (o.normalised_names || []).forEach((n, i) => { for (const w of matchAll(String(n))) words.push({ unit, row: i, field: 'normalised_name', word: w, text: String(n).slice(0, 90) }); });
    const rest = { ...o, normalised_names: undefined };
    for (const w of matchAll(JSON.stringify(rest))) words.push({ unit, row: null, field: 'flag-file-other', word: w, text: '' });
  }
}
const byField = {};
for (const w of words) { const k = w.field + ' | ' + w.word.toLowerCase(); byField[k] = (byField[k] || 0) + 1; }

const out = {
  format: 'conf-nc-copy-audit/1',
  about: "The packer's audit (tools/bt/pack_theatre.mjs audit(), rules AUDIT_RE, AUDIT_CS_RE, allowances AUDIT_ALLOW; DD-STG-02) run on a scratch copy of the shipped files of this item; plus a count of every printed word the rules match, by field.",
  files_audited: unitFiles.length + 2, unit_files: unitFiles.filter(f => f.endsWith('.jsonl.gz')).length, flag_files: unitFiles.filter(f => f.endsWith('.flags.json.gz')).length,
  rows_read: rowsRead, flag_files_read: flagsRead, raw_bytes_of_gzip_files: bytes,
  hits,
  printed_words: { by_field_and_word: byField, total: words.length, listing: words },
};
fs.writeFileSync(path.join(WS, 'copy-audit.json'), JSON.stringify(out, null, 1));
fs.rmSync(DIST, { recursive: true, force: true });
console.log('files audited', out.files_audited, '| rows', rowsRead, '| hits', hits.length, '| printed words matched by the rules', words.length, JSON.stringify(byField));
for (const h of hits.slice(0, 20)) console.log('HIT', JSON.stringify(h).slice(0, 300));

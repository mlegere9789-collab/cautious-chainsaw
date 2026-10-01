// emit.mjs - deterministic JSON, content hashing, writing hx/ artifacts, manifest rotation (keep the previous two versions).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';

/** JSON with recursively sorted object keys and no whitespace: byte-identical for identical content. */
export function stable(obj) {
  const seen = (v) => {
    if (Array.isArray(v)) return v.map(seen);
    if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v).sort()) o[k] = seen(v[k]); return o; }
    return v;
  };
  return JSON.stringify(seen(obj));
}
export const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
export const brotliSize = (buf) => zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }).length;
export const gzipSize = (buf) => zlib.gzipSync(buf, { level: 9 }).length;

export class Emitter {
  constructor(outDir) { this.out = outDir; this.files = new Map(); }
  /** Write a content-hashed file under f/ and return its manifest entry. name like "entity" or "ix/007". */
  put(name, obj, { raw = null } = {}) {
    const buf = raw ? Buffer.from(raw) : Buffer.from(stable(obj), 'utf8');
    const h = sha256(buf).slice(0, 8);
    const rel = `f/${name}.${h}.json`;
    this.files.set(rel, buf);
    return { path: rel, bytes: buf.length, sha: h };
  }
  /** Write everything to disk; returns the set of relative paths written. */
  flush() {
    for (const [rel, buf] of this.files) {
      const p = path.join(this.out, rel);
      fs.mkdirSync(path.dirname(p), { recursive: true });
      if (!fs.existsSync(p) || !fs.readFileSync(p).equals(buf)) fs.writeFileSync(p, buf);
    }
    return [...this.files.keys()];
  }
}

const refsOf = (manifest) => {
  const out = new Set();
  const walk = (v) => { if (!v) return; if (typeof v === 'string' && /^f\//.test(v)) out.add(v); else if (Array.isArray(v)) v.forEach(walk); else if (typeof v === 'object') Object.values(v).forEach(walk); };
  walk(manifest.tiers); walk(manifest.corpora);
  return out;
};

/** Write manifest.json; rotate the previous two manifests; garbage-collect hashed files that no kept manifest references. */
export function writeManifest(outDir, manifest) {
  const cur = path.join(outDir, 'manifest.json');
  const p1 = path.join(outDir, 'manifest.prev1.json'), p2 = path.join(outDir, 'manifest.prev2.json');
  const next = stable(manifest);
  let changed = true;
  if (fs.existsSync(cur)) {
    const old = fs.readFileSync(cur, 'utf8');
    if (old === next) changed = false;
    else {
      if (fs.existsSync(p1)) fs.copyFileSync(p1, p2);
      fs.copyFileSync(cur, p1);
    }
  }
  if (changed) fs.writeFileSync(cur, next);
  const keep = new Set();
  for (const f of [cur, p1, p2]) if (fs.existsSync(f)) for (const r of refsOf(JSON.parse(fs.readFileSync(f, 'utf8')))) keep.add(r);
  let removed = 0;
  const walk = (d) => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)])) : [];
  for (const f of walk(path.join(outDir, 'f'))) {
    const rel = path.relative(outDir, f).split(path.sep).join('/');
    if (!keep.has(rel)) { fs.unlinkSync(f); removed++; }
  }
  return { changed, removed };
}

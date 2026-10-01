// Minimal, dependency-free .docx reader for the Gettysburg_Sources_v2.docx QC.
// A .docx is a ZIP of XML parts. We read the ZIP central directory ourselves
// (stored or deflate entries only) and extract paragraphs, their style ids,
// their text, and hyperlink runs together with the relationship target of each
// hyperlink (the TARGET of the link can differ from its DISPLAYED text).

import { readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';

export function readZip(buf) {
  // End Of Central Directory record: scan backwards for the signature.
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 70000); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('not a zip: no end-of-central-directory record');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const files = new Map();
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('bad central directory entry');
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const usize = buf.readUInt32LE(p + 24);
    const nlen = buf.readUInt16LE(p + 28);
    const elen = buf.readUInt16LE(p + 30);
    const clen = buf.readUInt16LE(p + 32);
    const lho = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nlen);
    files.set(name, { method, csize, usize, lho });
    p += 46 + nlen + elen + clen;
  }
  return {
    names: [...files.keys()],
    read(name) {
      const f = files.get(name);
      if (!f) throw new Error('zip entry not found: ' + name);
      const nlen = buf.readUInt16LE(f.lho + 26);
      const elen = buf.readUInt16LE(f.lho + 28);
      const start = f.lho + 30 + nlen + elen;
      const raw = buf.subarray(start, start + f.csize);
      let out;
      if (f.method === 0) out = raw;
      else if (f.method === 8) out = inflateRawSync(raw);
      else throw new Error('unsupported zip method ' + f.method);
      if (out.length !== f.usize) throw new Error(`zip size mismatch for ${name}: ${out.length} != ${f.usize}`);
      return out;
    },
  };
}

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
export function decodeXml(s) {
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, (m, e) => {
    if (e[0] === '#') {
      const cp = e[1] === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return String.fromCodePoint(cp);
    }
    return ENT[e];
  });
}

function textOf(xml) {
  let out = '';
  const re = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br\/>/g;
  let m;
  while ((m = re.exec(xml))) {
    if (m[0].startsWith('<w:t>') || m[0].startsWith('<w:t ')) out += decodeXml(m[1]);
    else if (m[0] === '<w:tab/>') out += '\t';
    else out += '\n';
  }
  return out;
}

/** Returns { paragraphs:[{index, style, text, bold, segments:[{text, href|null, rid|null}]}], rels:Map, relCount } */
export function parseDocx(path) {
  const zip = readZip(readFileSync(path));
  const doc = zip.read('word/document.xml').toString('utf8');
  const relsXml = zip.read('word/_rels/document.xml.rels').toString('utf8');
  const rels = new Map();
  for (const m of relsXml.matchAll(/<Relationship\s+([^>]*?)\/>/g)) {
    const a = m[1];
    const id = /Id="([^"]*)"/.exec(a)?.[1];
    const target = /Target="([^"]*)"/.exec(a)?.[1];
    const type = /Type="([^"]*)"/.exec(a)?.[1];
    if (id) rels.set(id, { target: target == null ? null : decodeXml(target), type, external: /TargetMode="External"/.test(a) });
  }
  const paragraphs = [];
  const pre = /<w:p>([\s\S]*?)<\/w:p>|<w:p\s[^>]*>([\s\S]*?)<\/w:p>/g;
  let pm;
  let index = 0;
  while ((pm = pre.exec(doc))) {
    const body = pm[1] ?? pm[2];
    const style = /<w:pStyle w:val="([^"]+)"/.exec(body)?.[1] ?? null;
    const segments = [];
    // split the paragraph into hyperlink and non-hyperlink parts, in order
    const hre = /<w:hyperlink\b([^>]*)>([\s\S]*?)<\/w:hyperlink>/g;
    let last = 0;
    let hm;
    while ((hm = hre.exec(body))) {
      const before = textOf(body.slice(last, hm.index));
      if (before) segments.push({ text: before, href: null, rid: null });
      const rid = /r:id="([^"]+)"/.exec(hm[1])?.[1] ?? null;
      segments.push({ text: textOf(hm[2]), href: rid && rels.has(rid) ? rels.get(rid).target : null, rid });
      last = hm.index + hm[0].length;
    }
    const tail = textOf(body.slice(last));
    if (tail) segments.push({ text: tail, href: null, rid: null });
    const text = segments.map((s) => s.text).join('');
    paragraphs.push({ index: index++, style, text, bold: /<w:b\/>/.test(body), segments });
  }
  return { paragraphs, rels, relCount: rels.size, zipNames: zip.names };
}

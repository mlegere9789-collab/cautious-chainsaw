// Byte-exact JSON editing: locate the [start,end) span of the value at a JSON pointer WITHOUT re-serialising the document,
// so a value-only patch changes only the bytes of that value (WP-DATA-01 legacy-compat emitter, WP-DATA-09 value-only drops).

const decodeKey = (raw) => JSON.parse(raw);

export function parsePointer(pointer) {
  if (pointer === '' || pointer === '/') return [];
  if (!pointer.startsWith('/')) throw new Error(`bad JSON pointer ${pointer}`);
  return pointer.slice(1).split('/').map((s) => s.replace(/~1/g, '/').replace(/~0/g, '~'));
}

/** @returns {[number, number]} start (inclusive) and end (exclusive) of the value at `pointer` */
export function findSpan(text, pointer) {
  const segs = parsePointer(pointer);
  let i = 0;
  const ws = () => { while (i < text.length && /\s/.test(text[i])) i++; };
  const fail = (m) => { throw new Error(`${m} at byte ${i}`); };
  const skipString = () => {
    if (text[i] !== '"') fail('expected string');
    i++;
    while (i < text.length && text[i] !== '"') i += text[i] === '\\' ? 2 : 1;
    if (text[i] !== '"') fail('unterminated string');
    i++;
  };
  const skipValue = () => {
    ws();
    const c = text[i];
    if (c === '"') { skipString(); return; }
    if (c === '{') {
      i++; ws();
      if (text[i] === '}') { i++; return; }
      for (;;) { ws(); skipString(); ws(); if (text[i] !== ':') fail('expected :'); i++; skipValue(); ws(); if (text[i] === ',') { i++; continue; } if (text[i] === '}') { i++; return; } fail('expected , or }'); }
    }
    if (c === '[') {
      i++; ws();
      if (text[i] === ']') { i++; return; }
      for (;;) { skipValue(); ws(); if (text[i] === ',') { i++; continue; } if (text[i] === ']') { i++; return; } fail('expected , or ]'); }
    }
    const m = /^(?:-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)/.exec(text.slice(i, i + 40));
    if (!m) fail('bad value');
    i += m[0].length;
  };
  const locate = (k) => {
    ws();
    if (k === segs.length) { const start = i; skipValue(); return [start, i]; }
    const seg = segs[k];
    if (text[i] === '{') {
      i++;
      for (;;) {
        ws();
        if (text[i] === '}') throw new Error(`pointer ${pointer}: no member "${seg}"`);
        const ks = i; skipString(); const key = decodeKey(text.slice(ks, i));
        ws(); if (text[i] !== ':') fail('expected :'); i++;
        if (key === seg) return locate(k + 1);
        skipValue(); ws();
        if (text[i] === ',') { i++; continue; }
        throw new Error(`pointer ${pointer}: no member "${seg}"`);
      }
    }
    if (text[i] === '[') {
      i++;
      const want = Number(seg);
      for (let idx = 0; ; idx++) {
        ws();
        if (text[i] === ']') throw new Error(`pointer ${pointer}: index ${want} out of range`);
        if (idx === want) return locate(k + 1);
        skipValue(); ws();
        if (text[i] === ',') { i++; continue; }
        throw new Error(`pointer ${pointer}: index ${want} out of range`);
      }
    }
    fail(`pointer ${pointer}: cannot descend into a scalar`);
  };
  return locate(0);
}

/** Value at pointer in a parsed document. */
export function getAt(doc, pointer) {
  let cur = doc;
  for (const s of parsePointer(pointer)) cur = cur?.[s];
  return cur;
}

export function setAt(doc, pointer, value) {
  const segs = parsePointer(pointer);
  let cur = doc;
  for (const s of segs.slice(0, -1)) cur = cur[s];
  cur[segs[segs.length - 1]] = value;
}

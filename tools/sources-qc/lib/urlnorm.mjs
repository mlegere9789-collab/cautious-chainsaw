// URL syntax checks, normalisation and canonical keys for the Gettysburg sources QC.
//
// Three different things are produced from one raw URL:
//   syntax   - problems with the raw string as written in the document
//   normal   - a cleaned, still-fetchable URL (lowercase host, no fragment, no default port)
//   key      - a host-aware canonical identity used ONLY to detect duplicates
//              (two different URLs that open the same page share a key)

const TRAILING_JUNK = /[)\].,;:'"”’>]+$/;

/** Parse a query string that may use '&' or ';' as the separator (HathiTrust uses both). */
export function parseQuery(search) {
  const out = [];
  const s = search.startsWith('?') ? search.slice(1) : search;
  if (!s) return out;
  for (const part of s.split(/[&;]/)) {
    if (!part) continue;
    const i = part.indexOf('=');
    const k = i < 0 ? part : part.slice(0, i);
    const v = i < 0 ? '' : part.slice(i + 1);
    let kd = k, vd = v;
    try { kd = decodeURIComponent(k.replace(/\+/g, ' ')); } catch { /* keep raw */ }
    try { vd = decodeURIComponent(v.replace(/\+/g, ' ')); } catch { /* keep raw */ }
    out.push([kd, vd]);
  }
  return out;
}

export function urlSyntax(raw) {
  const problems = [];
  const s = String(raw ?? '');
  if (!s.trim()) return { ok: false, problems: ['empty'], url: null };
  if (s !== s.trim()) problems.push('leading_or_trailing_space');
  if (/\s/.test(s.trim())) problems.push('internal_whitespace');
  if (/&amp;/i.test(s)) problems.push('html_entity_in_url');
  if (TRAILING_JUNK.test(s.trim())) problems.push('trailing_punctuation');
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(s)) problems.push('control_character');
  if (/[^\x00-\x7f]/.test(s)) problems.push('non_ascii');
  let u = null;
  try { u = new URL(s.trim()); } catch { problems.push('unparseable'); }
  if (u) {
    if (!/^https?:$/.test(u.protocol)) problems.push('scheme_not_http');
    if (u.protocol === 'http:') problems.push('insecure_http');
    if (/[A-Z]/.test(s.trim().replace(/^[a-zA-Z]+:\/\//, '').split(/[/?#]/)[0])) problems.push('uppercase_host');
    if (!u.hostname.includes('.')) problems.push('host_without_dot');
    if (u.username || u.password) problems.push('credentials_in_url');
    if (u.hash) problems.push('has_fragment');
  }
  // 'insecure_http', 'has_fragment', 'uppercase_host' and 'non_ascii' are notes, the rest are defects
  const notes = new Set(['insecure_http', 'has_fragment', 'uppercase_host', 'non_ascii']);
  const defects = problems.filter((p) => !notes.has(p));
  return { ok: defects.length === 0 && !!u, problems, defects, url: u };
}

export function hostOf(raw) {
  try { return new URL(String(raw).trim()).hostname.toLowerCase().replace(/^www\./, ''); } catch { return null; }
}

/** Fetchable normal form: trims, fixes &amp;, drops the fragment (never sent to servers), lowercase host, default port. */
export function normalizeUrl(raw) {
  let s = String(raw ?? '').trim().replace(/&amp;/gi, '&');
  // strip trailing prose punctuation; keep a closing bracket only if its opener is inside the URL
  for (;;) {
    const c = s[s.length - 1];
    if (c && /[.,;:'"”’>]/.test(c)) { s = s.slice(0, -1); continue; }
    if (c === ')' && !s.includes('(')) { s = s.slice(0, -1); continue; }
    if (c === ']' && !s.includes('[')) { s = s.slice(0, -1); continue; }
    break;
  }
  let u;
  try { u = new URL(s); } catch { return null; }
  u.hash = '';
  if ((u.protocol === 'http:' && u.port === '80') || (u.protocol === 'https:' && u.port === '443')) u.port = '';
  return u.toString();
}

/** Canonical identity for duplicate detection. Different forms of the same page get the same key. */
export function canonicalKey(raw) {
  const normal = normalizeUrl(raw);
  if (!normal) return null;
  const u = new URL(normal);
  const host = u.hostname.toLowerCase().replace(/^www\./, '');
  const q = parseQuery(u.search);
  const get = (k) => q.find(([kk]) => kk === k)?.[1];
  let m;
  // HathiTrust page: id + seq (the 'view' parameter and separators do not change the page)
  if (host === 'babel.hathitrust.org' && get('id')) return `hathi:${get('id')}#seq=${get('seq') ?? ''}`;
  if (host === 'hdl.handle.net' && (m = /^\/2027\/(.+)$/.exec(u.pathname))) return `hathi:${decodeURIComponent(m[1])}#seq=`;
  // eHistory: path only
  if (host === 'ehistory.osu.edu') return `ehistory:${u.pathname.replace(/\/+$/, '')}`;
  // Perseus Hopper: the doc parameter, with %3A / : and %3D / = equivalent
  if (host === 'perseus.tufts.edu' && get('doc')) return `perseus:${get('doc')}`;
  // Google Books: book id + page
  if (host === 'books.google.com' && get('id')) return `gbooks:${get('id')}#pg=${get('pg') ?? ''}`;
  // Internet Archive: details/stream/download/embed all identify the same item
  if (host === 'archive.org' && (m = /^\/(?:details|stream|download|embed|metadata)\/([^/]+)/.exec(u.pathname))) {
    const rest = u.pathname.slice(m[0].length);
    const pg = /\/page\/([^/]+)/.exec(rest)?.[1] ?? /#page\/(\d+)/.exec(String(raw))?.[1] ?? '';
    return `ia:${m[1]}#${pg}`;
  }
  // Project Gutenberg: files/<n>/ or ebooks/<n>
  if (host === 'gutenberg.org' && (m = /^\/(?:files|ebooks|cache\/epub)\/(\d+)/.exec(u.pathname))) return `gutenberg:${m[1]}`;
  // Generic: https-ified host + path without trailing slash + sorted query
  const sorted = [...q].sort((a, b) => (a[0] + a[1]).localeCompare(b[0] + b[1])).map(([k, v]) => `${k}=${v}`).join('&');
  return `url:${host}${u.pathname.replace(/\/+$/, '') || '/'}${sorted ? '?' + sorted : ''}`;
}

/** Extract identifiers from the URLs this list uses. */
export function hathiIdOf(raw) {
  try {
    const u = new URL(normalizeUrl(raw));
    if (u.hostname === 'babel.hathitrust.org') {
      const q = parseQuery(u.search);
      const id = q.find(([k]) => k === 'id')?.[1];
      const seq = q.find(([k]) => k === 'seq')?.[1];
      return id ? { id, seq: seq ? Number(seq) : null } : null;
    }
    if (u.hostname === 'hdl.handle.net') {
      const m = /^\/2027\/(.+)$/.exec(u.pathname);
      return m ? { id: decodeURIComponent(m[1]), seq: null } : null;
    }
  } catch { /* fallthrough */ }
  return null;
}

export function ehistoryOf(raw) {
  const m = /^https?:\/\/ehistory\.osu\.edu\/books\/official-records\/(\d{3})(?:\/(\d{4}))?\/?$/.exec(String(raw).trim());
  return m ? { serial: Number(m[1]), page: m[2] ? Number(m[2]) : null } : null;
}

export function archiveIdOf(raw) {
  const m = /^https?:\/\/(?:www\.)?archive\.org\/(?:details|stream|download|embed)\/([^/?#]+)/.exec(String(raw).trim());
  return m ? m[1] : null;
}

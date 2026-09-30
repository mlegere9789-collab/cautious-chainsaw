"""The Netlify post-processing model (measured on production 2026-09-30, see docs/baseline-drift.md section 2).

What Netlify does to a deployed file before serving it, as far as it was observable on gettysburginteractivemap.com:

* non-HTML files (js, css, json, png, xml, txt, ...) are served byte-for-byte (90 of 91 of the legacy non-HTML files matched; the 91st,
  data/terrain.json, is real drift, not processing);
* every HTML file gets the Real User Metrics snippet inserted immediately before the first ``</body>``:
  ``"\\n" + <script async id="netlify-rum-container" ...></script> + "\\n"`` (the same 525 bytes on every page of one deploy; its
  ``data-netlify-cwv-token`` is a JWT that names the deploy, so it changes with every deploy);
* "pretty URLs": an ``<a ...>`` start tag (outside script/style) whose ``href`` is a local path ending in ``.html`` is rewritten and
  re-serialized: ``.html`` is dropped (``/index.html`` becomes ``/``), the attributes are emitted sorted by name, each single-quoted:
  ``<a class="back" href="/index.html">`` -> ``<a class='back' href='/'>``.  Tags that are not rewritten (``href="/"``, absolute urls,
  ``mailto:``) and every other tag stay byte-exact; line endings (CRLF or LF) are kept.

The functions here are a MODEL: :func:`forward` applies it to a source file, :func:`inverse` undoes it.  ``baseline.py prove`` shows
``forward(baseline source) == bytes served`` for every html page, which is what makes the reconstruction of a source file from a served
file trustworthy.  Anything the model has no evidence for (an ``<a href="x.html#frag">``, a bare attribute, an ``&`` inside a rewritten
tag) raises :class:`Unmodelled` instead of guessing, so a mismatch is loud.
"""
import re
from html.parser import HTMLParser

RUM_RE = re.compile(r'\n(<script async id="netlify-rum-container"[^>]*></script>)\n')
TOKEN_RE = re.compile(r'data-netlify-cwv-token="([^"]+)"')
# a single-quoted, sorted-attribute <a> tag as Netlify emits it
SERIALIZED_A_RE = re.compile(r"^<a((?: [a-z][a-z0-9-]*='[^']*')+)>$")
PRETTY_HREF_RE = re.compile(r'^/(?:[A-Za-z0-9_-]+(?:/[A-Za-z0-9_-]+)*)?$')
LOCAL_HTML_HREF_RE = re.compile(r'^/(?:[^/?#\s]+/)*[^/?#\s]+\.html$')
ATTR_RE = re.compile(r"""([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?""")


class Unmodelled(Exception):
    """The file contains something the post-processing model has no evidence for."""


def _line_starts(text):
    starts = [0]
    for m in re.finditer('\n', text):
        starts.append(m.end())
    return starts


class _TagFinder(HTMLParser):
    """Collects the start tags of one element name with their absolute offsets (script/style bodies and comments are skipped by the parser)."""

    def __init__(self, text, tagname):
        super().__init__(convert_charrefs=False)
        self._starts = _line_starts(text)
        self._tag = tagname
        self.found = []          # (offset, raw_text)

    def handle_starttag(self, tag, attrs):
        if tag == self._tag:
            line, col = self.getpos()
            self.found.append((self._starts[line - 1] + col, self.get_starttag_text()))

    handle_startendtag = handle_starttag


def find_tags(text, tagname='a'):
    p = _TagFinder(text, tagname)
    p.feed(text)
    p.close()
    for off, raw in p.found:
        if text[off:off + len(raw)] != raw:
            raise Unmodelled('internal: tag offset mismatch at %d' % off)
    return p.found


def parse_attrs(raw):
    """(name, value) pairs of a raw start tag, in source order (names lower-cased).  Raises Unmodelled for a bare or repeated attribute."""
    m = re.match(r'<[A-Za-z][A-Za-z0-9-]*(.*?)/?>$', raw, re.S)
    if not m:
        raise Unmodelled('cannot parse tag %r' % raw[:80])
    body = m.group(1)
    out, pos = [], 0
    for am in ATTR_RE.finditer(body):
        name = am.group(1).lower()
        if am.group(2) is None and am.group(3) is None and am.group(4) is None:
            raise Unmodelled('bare attribute %r in %r' % (name, raw[:80]))
        val = am.group(2) if am.group(2) is not None else am.group(3) if am.group(3) is not None else am.group(4)
        out.append((name, val))
    if len({n for n, _ in out}) != len(out):
        raise Unmodelled('repeated attribute in %r' % raw[:80])
    return out


def rewrite_tag(raw):
    """Forward model for ONE start tag text: returns the Netlify form, or None when Netlify leaves the tag alone."""
    attrs = parse_attrs(raw)
    d = dict(attrs)
    href = d.get('href')
    if href is None:
        return None
    if re.match(r'^/[^?#\s]*\.html[?#]', href) or (LOCAL_HTML_HREF_RE.match(href) is None and re.match(r'^[^/:?#\s]+\.html$', href)):
        raise Unmodelled('no evidence how Netlify rewrites a local .html href like %r (query, fragment or relative path)' % href)
    if not LOCAL_HTML_HREF_RE.match(href):
        return None
    pretty = href[:-len('/index.html')] + '/' if href.endswith('/index.html') else href[:-len('.html')]
    for n, v in attrs:
        if any(c in v for c in '&\'"<>'):
            raise Unmodelled('no evidence how Netlify escapes %r in attribute %s of %r' % (v, n, raw[:80]))
    return '<a' + ''.join(" %s='%s'" % (n, pretty if n == 'href' else v) for n, v in sorted(attrs)) + '>'


def forward_a_tags(text):
    """Apply the pretty-URL rewrite to every <a> start tag of an html text.  Returns (new_text, number_rewritten)."""
    out, last, n = [], 0, 0
    for off, raw in find_tags(text, 'a'):
        new = rewrite_tag(raw)
        if new is None:
            continue
        out.append(text[last:off])
        out.append(new)
        last = off + len(raw)
        n += 1
    out.append(text[last:])
    return ''.join(out), n


def forward(source_bytes, rum=None):
    """Model of what Netlify serves for an uploaded HTML file.  `rum` = the snippet element (``<script async id="netlify-rum-container" ...></script>``)
    or None for a site without Real User Metrics."""
    text = source_bytes.decode('utf-8')
    text, _ = forward_a_tags(text)
    if rum is not None:
        if text.count('</body>') != 1:
            raise Unmodelled('expected exactly one </body> for the RUM snippet, found %d' % text.count('</body>'))
        text = text.replace('</body>', '\n' + rum + '\n</body>')
    return text.encode('utf-8')


def extract_rum(served_bytes):
    """The RUM snippet element of a served page, or None."""
    text = served_bytes.decode('utf-8')
    found = RUM_RE.findall(text)
    if len(found) > 1:
        raise Unmodelled('%d RUM snippets in one page' % len(found))
    return found[0] if found else None


def deploy_id(rum):
    """The deploy id inside the snippet's cwv token (a JWT payload; public, served on every page), or None."""
    import base64
    import json
    m = TOKEN_RE.search(rum or '')
    if not m:
        return None
    try:
        part = m.group(1).split('.')[1]
        payload = json.loads(base64.urlsafe_b64decode(part + '=' * (-len(part) % 4)))
        return payload.get('deploy_id')
    except Exception:          # noqa: BLE001 - informational only
        return None


RUM_TOLERANT_RE = re.compile(r'\n?(<script async id="netlify-rum-container"[^>]*></script>)\n?')


def strip_rum(served_bytes, tolerant=False):
    """Remove the injected snippet exactly (the inverse of the insertion).  `tolerant` accepts a snippet with a missing newline on either
    side (Netlify changed its injection format) - only for diagnosing drift, never for reconstruction.  Returns (bytes, snippet or None)."""
    text = served_bytes.decode('utf-8')
    found = RUM_RE.findall(text)
    if len(found) > 1:
        raise Unmodelled('%d RUM snippets in one page' % len(found))
    if found:
        return RUM_RE.sub('', text, count=1).encode('utf-8'), found[0]
    if tolerant:
        found = RUM_TOLERANT_RE.findall(text)
        if len(found) == 1:
            return RUM_TOLERANT_RE.sub('', text, count=1).encode('utf-8'), found[0]
    return served_bytes, None


def inverse(served_bytes, reference_bytes=None, tolerant=False):
    """Undo the post-processing of a served HTML page.  Returns (source_bytes, info).

    The RUM snippet is removed exactly.  Rewritten ``<a>`` tags are restored from `reference_bytes` (a source file of the same page: a
    tag whose forward image equals the served tag is taken verbatim, so attribute order, quoting and ``.html`` are known facts); a
    rewritten-looking tag with no reference counterpart is INFERRED (double quotes, sorted attributes, ``.html`` restored) and listed in
    ``info['inferred']`` - the forward model still reproduces it, but the source form is a guess."""
    stripped, rum = strip_rum(served_bytes, tolerant)
    text = stripped.decode('utf-8')
    refs = []
    if reference_bytes is not None:
        for _, raw in find_tags(reference_bytes.decode('utf-8'), 'a'):
            fw = rewrite_tag(raw)
            if fw is not None:
                refs.append([raw, fw, False])
    out, last, inferred, matched = [], 0, [], 0
    for off, raw in find_tags(text, 'a'):
        m = SERIALIZED_A_RE.match(raw)
        if not m:
            continue
        try:
            attrs = parse_attrs(raw)
        except Unmodelled:
            continue
        href = dict(attrs).get('href')
        if href is None or not PRETTY_HREF_RE.match(href) or [n for n, _ in attrs] != sorted(n for n, _ in attrs):
            continue
        hit = next((r for r in refs if not r[2] and r[1] == raw), None)
        if hit is not None:
            hit[2] = True
            new = hit[0]
            matched += 1
        else:
            src_href = '/index.html' if href == '/' else href + '.html'
            new = '<a' + ''.join(' %s="%s"' % (n, src_href if n == 'href' else v) for n, v in attrs) + '>'
            inferred.append({'offset': off, 'served': raw, 'source_guess': new})
        out.append(text[last:off])
        out.append(new)
        last = off + len(raw)
    out.append(text[last:])
    return ''.join(out).encode('utf-8'), {'rum': rum, 'reference_matched': matched, 'inferred': inferred}

#!/usr/bin/env python3
"""Independent check of the newspaper evidence lines (web-newspapers.jsonl in timeline_corrections and evidence_corrections).

Does NOT use build_lines.py: it re-reads the saved files itself.
For every citation of every line (citation + more_citations):
  1. the saved reading text exists, its sha256 equals text_sha256, its length equals page_chars;
  2. the ALTO file (gzip, kept beside the text) decompresses to bytes whose sha256 equals alto_sha256, and the
     page manifest (pages.jsonl) names the same alto_url / alto_sha256 / text_sha256;
  3. the quote occurs in the page text (whitespace collapsed; line-end hyphens joined when text_variant says so) at quote_offset;
  4. url, newspaper, lccn, issue_date, image_seq, place_of_printing, retrieved, reprint.status are present and consistent
     with the page id of local_path;
  5. when an image check is recorded, the saved crop exists and its sha256 equals ocr_check.image_sha256;
  6. every double-quoted fragment of 30+ characters in sub_claim occurs (letters and digits only, case-insensitive) in the quote of a
     citation of the line or in its ocr_check.reading (what the print reads), otherwise it is listed as UNMATCHED;
  7. (id, xid) is unique inside a file; lookup lines carry patterns, window, pages_searched.
Usage: python3 -I verify_lines.py [--quiet]      exit code 0 = no problem, 1 = problems listed
"""
import gzip, hashlib, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, *(['..'] * 7)))
GOV = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE')
FILES = [os.path.join(GOV, 'timeline_corrections', 'web-newspapers.jsonl'), os.path.join(GOV, 'evidence_corrections', 'web-newspapers.jsonl')]
MANIFEST = os.path.join(GOV, 'horde', 'ws-web', 'ca', 'pages.jsonl')
IMAGES = os.path.join(GOV, 'horde', 'ws-web', 'ca', 'images.jsonl')


def sha_bytes(b):
    return hashlib.sha256(b).hexdigest()


def sha_file(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for c in iter(lambda: f.read(1 << 20), b''):
            h.update(c)
    return h.hexdigest()


def norm(s, dehyphen=False):
    if dehyphen:
        s = re.sub(r'(?<=\w)-\s*\n\s*(?=\w)', '', s)
    return re.sub(r'\s+', ' ', s).strip()


def alnum(s):
    return re.sub(r'[^a-z0-9]+', '', s.lower().replace('’', "'").replace('‘', "'"))


def main():
    quiet = '--quiet' in sys.argv
    problems, notes = [], []
    man = {}
    for l in open(MANIFEST, encoding='utf-8'):
        if l.strip():
            d = json.loads(l)
            man[d['page_id']] = d
    imgs = {}
    if os.path.exists(IMAGES):
        for l in open(IMAGES, encoding='utf-8'):
            if l.strip():
                d = json.loads(l)
                imgs[(d['page_id'], d['tag'])] = d
    img_by_sha = {d['sha256']: d for d in imgs.values()}
    text_cache, alto_ok = {}, {}
    total_cites = 0
    nlines = 0
    pages_cited = set()
    for path in FILES:
        seen = set()
        for ln, l in enumerate(open(path, encoding='utf-8'), 1):
            if not l.strip():
                continue
            nlines += 1
            d = json.loads(l)
            tag = '%s:%d %s %s' % (os.path.basename(os.path.dirname(path)), ln, d.get('id'), d.get('xid'))
            k = (d.get('id'), d.get('xid'))
            if k in seen:
                problems.append('%s duplicate (id, xid)' % tag)
            seen.add(k)
            for key in ('id', 'shard', 'xid', 'kind', 'sub_claim', 'verdict'):
                if not d.get(key):
                    problems.append('%s missing %s' % (tag, key))
            if str(d.get('kind', '')).startswith('lookup'):
                lk = d.get('lookup') or {}
                for key in ('patterns', 'window', 'pages_searched', 'hits', 'searched_on'):
                    if lk.get(key) in (None, ''):
                        problems.append('%s lookup lacks %s' % (tag, key))
                continue
            if d.get('tier') not in ('documented', 'inferred', 'plausible-procedural'):
                problems.append('%s bad tier %r' % (tag, d.get('tier')))
            cites = [d.get('citation')] + list(d.get('more_citations') or [])
            if not cites[0]:
                problems.append('%s no citation' % tag)
                continue
            readings, quotes = [], []
            for c in cites:
                total_cites += 1
                lp = c.get('local_path')
                full = os.path.join(ROOT, lp or '')
                m = re.match(r'^tmp/library/web/ca/pages/(sn\d+)/(\d{4}-\d\d-\d\d)/ed-(\d+)/seq-(\d+)\.txt$', lp or '')
                if not m:
                    problems.append('%s bad local_path %r' % (tag, lp))
                    continue
                pid = '%s/%s/ed-%s/seq-%s' % m.groups()
                pages_cited.add(pid)
                if (c.get('lccn'), c.get('issue_date'), str(c.get('edition')), str(c.get('image_seq'))) != (m.group(1), m.group(2), m.group(3), m.group(4)):
                    problems.append('%s citation fields disagree with the page id %s' % (tag, pid))
                if not os.path.exists(full):
                    problems.append('%s text file missing %s' % (tag, lp))
                    continue
                if pid not in text_cache:
                    raw = open(full, encoding='utf-8').read()
                    text_cache[pid] = (raw, sha_file(full))
                raw, h = text_cache[pid]
                if h != c.get('text_sha256'):
                    problems.append('%s text sha256 differs for %s' % (tag, pid))
                if len(raw) != c.get('page_chars'):
                    problems.append('%s page_chars differs for %s (%d vs %s)' % (tag, pid, len(raw), c.get('page_chars')))
                mm = man.get(pid)
                if not mm:
                    problems.append('%s page %s not in pages.jsonl' % (tag, pid))
                else:
                    for a, b in (('alto_url', 'alto_url'), ('alto_sha256', 'alto_sha256'), ('text_sha256', 'text_sha256')):
                        if mm.get(a) != c.get(b):
                            problems.append('%s manifest %s differs for %s' % (tag, a, pid))
                    if pid not in alto_ok:
                        gz = os.path.join(ROOT, mm['alto_gz_path'])
                        if not os.path.exists(gz):
                            alto_ok[pid] = 'ALTO file missing'
                        else:
                            with gzip.open(gz, 'rb') as f:
                                alto_ok[pid] = None if sha_bytes(f.read()) == mm['alto_sha256'] else 'ALTO sha256 differs'
                    if alto_ok[pid]:
                        problems.append('%s %s %s' % (tag, pid, alto_ok[pid]))
                variant = c.get('text_variant') or ''
                dehy = 'line-end hyphens joined' in variant
                t = norm(raw, dehyphen=dehy)
                q = c.get('quote') or ''
                off = c.get('quote_offset')
                if norm(q) != q:
                    problems.append('%s quote not in collapsed form' % tag)
                if t[off:off + len(q)] != q:
                    # tolerate a different variant only if it is found at all
                    if q not in norm(raw) and q not in norm(raw, dehyphen=True):
                        problems.append('%s QUOTE NOT FOUND in %s: %s' % (tag, pid, q[:80]))
                    else:
                        problems.append('%s quote_offset wrong in %s' % (tag, pid))
                quotes.append(q)
                for dk in ('dateline', 'attribution'):
                    if c.get(dk) and norm(c[dk]) not in norm(raw) and norm(c[dk]) not in norm(raw, dehyphen=True):
                        problems.append('%s %s not found on %s: %s' % (tag, dk, pid, c[dk][:60]))
                for key in ('url', 'newspaper', 'place_of_printing', 'retrieved', 'source_id', 'title'):
                    if not c.get(key):
                        problems.append('%s citation lacks %s (%s)' % (tag, key, pid))
                if (c.get('reprint') or {}).get('status') not in ('original', 'reprint', 'wire', 'unknown'):
                    problems.append('%s reprint status missing/invalid (%s)' % (tag, pid))
                oc = c.get('ocr_check') or {}
                if oc.get('reading'):
                    readings.append(oc['reading'])
                    ish = oc.get('image_sha256')
                    im = img_by_sha.get(ish)
                    if not im:
                        problems.append('%s image sha256 not in images.jsonl (%s)' % (tag, pid))
                    else:
                        p = os.path.join(ROOT, im['local_path'])
                        if not os.path.exists(p) or sha_file(p) != ish:
                            problems.append('%s saved crop missing or sha256 differs (%s)' % (tag, im['local_path']))
            blob = [alnum(x) for x in quotes + readings]
            for fr in re.findall(r'"([^"]{30,})"', d.get('sub_claim') or ''):
                a = alnum(fr)
                if a and not any(a in b for b in blob):
                    # try without a leading/trailing ellipsis fragments
                    parts = [alnum(x) for x in re.split(r'\.\.\.|…', fr) if len(alnum(x)) >= 15]
                    if not parts or not all(any(p in b for b in blob) for p in parts):
                        notes.append('UNMATCHED fragment in sub_claim of %s: "%s"' % (tag, fr[:110]))
    print('lines %d, citations %d, distinct pages cited %d' % (nlines, total_cites, len(pages_cited)))
    print('problems: %d, unmatched sub_claim fragments: %d' % (len(problems), len(notes)))
    if not quiet:
        for p in problems:
            print('PROBLEM', p)
        for n in notes:
            print(n)
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main())

#!/usr/bin/env python3
"""Build the extract records from the definition files (extracts/src/*.xdef).

A definition line names a source, a PDF page and the first and last words of a passage; the
quote itself is CUT from the saved source text by this script, so a quote can never be
retyped or paraphrased. A passage that is not found exactly once on the named page stops
the build.

Definition file format (UTF-8):
  @ <SOURCE-ID>                    following lines belong to this source
  # comment
  <pdf page> | <topic> | <feature> | <keys> | <state date> | <certainty> | <claim> | <anchor>
    topic      one of TOPICS below
    keys       ids of this repository the feature concerns (comma separated) or '-'
    state date the date the described feature state refers to (e.g. 1863-07, pre-1863,
               1868, 2006 reconstruction, modern 2024)
    certainty  stated | hedged | conflict   (hedged: the source itself says probably, may,
               likely, appears; conflict: the source itself reports contradictory evidence)
    anchor     'first words >>> last words' (quote runs from the first to the last, inclusive)
               or the whole short quote. Matching is whitespace-insensitive, otherwise exact.
               A trailing ' ~L' uses the layout text of the page instead of the reading-order text.
               A trailing ' ~#k' takes the k-th occurrence of a passage that repeats on the page.

Outputs (next to this script's parent folder):
  extracts/extracts.jsonl          one record per extract
  extracts/<topic file>.md         per-topic extract sheets
Run:  python3 -I build_extracts.py
"""
import glob, hashlib, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
NPS = os.path.dirname(HERE)
ROOT = os.path.abspath(os.path.join(NPS, '..', '..', '..', '..', '..', '..'))
LIB = os.path.join(ROOT, 'tmp', 'library', 'web', 'nps')
RETRIEVED = '2026-11-13'

TOPICS = {
    'fields': 'fields-woodlots', 'woodlots': 'fields-woodlots', 'orchards': 'fields-woodlots',
    'fences': 'fences',
    'buildings': 'farm-buildings',
    'hospitals': 'hospitals',
    'monuments': 'monuments-later', 'avenues': 'monuments-later', 'later': 'monuments-later',
    'earthworks': 'other-landscape', 'roads': 'other-landscape', 'burials': 'other-landscape',
    'general': 'other-landscape', 'cemetery': 'other-landscape', 'damage': 'other-landscape',
}
TOPIC_TITLES = {
    'fields-woodlots': 'Field crops, orchards and woodlots',
    'fences': 'Fence types and fence lines',
    'farm-buildings': 'Farm buildings and their 1863 state',
    'hospitals': 'Hospital sites',
    'monuments-later': 'Monuments, avenues and other features placed after the battle',
    'other-landscape': 'Other landscape evidence (earthworks, roads, burials, battle damage, cemetery)',
}


def norm(s):
    return re.sub(r'\s+', ' ', s).strip()


def sha256_file(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for c in iter(lambda: f.read(1 << 20), b''):
            h.update(c)
    return h.hexdigest()


_cache = {}


def text_path(sid, layout=False):
    for base in (LIB, os.path.join(LIB, 'pages')):
        p = os.path.join(base, sid, sid + ('.layout.txt' if layout else '.txt'))
        if os.path.exists(p):
            return p
    raise SystemExit('no saved text for source ' + sid)


def pages(sid, layout=False):
    k = (sid, layout)
    if k not in _cache:
        p = text_path(sid, layout)
        txt = open(p, encoding='utf-8').read()
        parts = re.split(r'^=== PAGE (\d+) ===\n', txt, flags=re.M)
        _cache[k] = ({int(parts[i]): parts[i + 1] for i in range(1, len(parts), 2)}, sha256_file(p), os.path.relpath(p, ROOT))
    return _cache[k]


def printed_page(page_text):
    """Printed page number where the page itself shows one in a recognisable footer."""
    flat = norm(page_text)
    m = re.search(r'Cultural Landscapes Inventory Page (\d+) of (\d+)', flat)
    if m:
        return 'Page %s of %s' % (m.group(1), m.group(2))
    return None


def cut(page_text, anchor):
    flat = norm(page_text)
    occ = None
    m = re.search(r' ~#(\d+)$', anchor)
    if m:
        # the passage repeats on the page (boilerplate): take the k-th occurrence, 1-based
        occ, anchor = int(m.group(1)), anchor[:m.start()]
    if '>>>' in anchor:
        a, b = [norm(x) for x in anchor.split('>>>', 1)]
        starts = [m.start() for m in re.finditer(re.escape(a), flat)]
        if occ is None and len(starts) != 1:
            return None, 'start anchor found %d times: %r' % (len(starts), a)
        if occ is not None and not (1 <= occ <= len(starts)):
            return None, 'occurrence %d of start anchor not present (%d found): %r' % (occ, len(starts), a)
        st = starts[(occ or 1) - 1]
        e = flat.find(b, st + len(a) - min(len(a), len(b)))
        if e < 0:
            return None, 'end anchor not found after start: %r' % b
        return flat[st:e + len(b)], None
    a = norm(anchor)
    n = flat.count(a)
    if occ is None and n != 1:
        return None, 'quote found %d times: %r' % (n, a[:80])
    if occ is not None and not (1 <= occ <= n):
        return None, 'occurrence %d not present (%d found): %r' % (occ, n, a[:80])
    return a, None


def use_for_1863(sdate):
    """How a consumer may use the passage for the July 1863 scene.
    direct   the passage states a condition of 1863 or earlier that held in July 1863
    indirect a later, modern, reconstructed or replanted state: only as a marked inference, never as an 1863 profile
    none     a feature that did not exist in July 1863 (later building, monument, avenue): never drawn in the 1863 scene
    A leading '!' in the state date forces none, a leading '~' forces indirect."""
    if sdate.startswith('!'):
        return 'none', sdate[1:]
    if sdate.startswith('~'):
        return 'indirect', sdate[1:]
    low = sdate.lower()
    if re.match(r'(pre-1863|1863|18[0-5]\d|17\d\d|1860|1861|1862)', low) and not re.search(r'modern|reconstruct|replant|survey|replacement|rebuilt', low.split(';')[0]):
        return 'direct', sdate
    if re.search(r'modern|reconstruct|replant|survey|replacement|rebuilt|rehabilit|restor', low):
        return 'indirect', sdate
    return 'none', sdate


def load_sources():
    src = json.load(open(os.path.join(NPS, 'sources.json')))
    return {s['id']: s for s in src['sources']}


def main():
    sources = load_sources()
    recs, errors = [], []
    for f in sorted(glob.glob(os.path.join(NPS, 'extracts', 'src', '*.xdef'))):
        sid = None
        seq = {}
        for ln, line in enumerate(open(f, encoding='utf-8'), 1):
            line = line.rstrip('\n')
            if not line.strip() or line.lstrip().startswith('#'):
                continue
            if line.startswith('@'):
                sid = line[1:].strip()
                if sid not in sources:
                    errors.append('%s:%d unknown source %s' % (os.path.basename(f), ln, sid))
                continue
            parts = [x.strip() for x in line.split(' | ')]
            if len(parts) != 8:
                errors.append('%s:%d expected 8 fields, got %d' % (os.path.basename(f), ln, len(parts)))
                continue
            pg, topic, feature, keys, sdate, cert, claim, anchor = parts
            layout = False
            if anchor.endswith(' ~L'):
                layout, anchor = True, anchor[:-3]
            mo = re.search(r' ~#\d+$', anchor)
            if mo and anchor[:mo.start()].endswith(' ~L'):
                layout, anchor = True, anchor[:mo.start() - 3] + anchor[mo.start():]
            if topic not in TOPICS:
                errors.append('%s:%d unknown topic %s' % (os.path.basename(f), ln, topic)); continue
            if cert not in ('stated', 'hedged', 'conflict'):
                errors.append('%s:%d bad certainty %s' % (os.path.basename(f), ln, cert)); continue
            try:
                pgs, tsha, tpath = pages(sid, layout)
            except SystemExit as ex:
                errors.append('%s:%d %s' % (os.path.basename(f), ln, ex)); continue
            p = int(pg)
            if p not in pgs:
                errors.append('%s:%d page %d not in %s' % (os.path.basename(f), ln, p, sid)); continue
            q, err = cut(pgs[p], anchor)
            if err:
                errors.append('%s:%d p.%d %s' % (os.path.basename(f), ln, p, err)); continue
            seq[p] = seq.get(p, 0) + 1
            s = sources.get(sid, {})
            use, sdate = use_for_1863(sdate)
            recs.append({
                'xid': 'NPSX-%s-p%03d-%02d' % (sid.replace('NPS-', '').replace('NPSGOV-', 'WEB-'), p, seq[p]),
                'topic': TOPICS[topic], 'subtopic': topic,
                'feature': feature,
                'repo_keys': [] if keys in ('-', '') else [k.strip() for k in keys.split(',')],
                'state_date': sdate,
                'use_for_1863': use,
                'source_certainty': cert,
                'claim': claim,
                'quote': q,
                'source_id': sid,
                'source_title': s.get('title'), 'source_date': s.get('date'), 'source_author': s.get('author'),
                'url': s.get('url'),
                'pdf_page': p, 'printed_page': printed_page(pgs[p]),
                'text_variant': 'layout' if layout else 'reading-order',
                'text_path': tpath, 'text_sha256': tsha,
                'retrieved': RETRIEVED,
                'source_kind': s.get('kind', 'official secondary (National Park Service report)'),
                'tier_proposed': {'stated': 'documented', 'hedged': 'inferred', 'conflict': 'inferred'}[cert],
                'tier_basis': {'stated': 'official secondary source states it as fact; the 1863 basis is whatever the report cites (see quote and the report page)',
                               'hedged': "the source's own wording is hedged (probably / may / likely); carry as inferred",
                               'conflict': 'the source itself reports contradictory evidence; carry every reading as a scenario'}[cert],
            })
    if errors:
        print('\n'.join(errors))
        print('%d error(s); nothing written' % len(errors))
        sys.exit(1)
    out = os.path.join(NPS, 'extracts', 'extracts.jsonl')
    with open(out, 'w', encoding='utf-8') as f:
        for r in recs:
            f.write(json.dumps(r, ensure_ascii=False, sort_keys=True) + '\n')
    # per-topic sheets
    by = {}
    for r in recs:
        by.setdefault(r['topic'], []).append(r)
    for t, title in TOPIC_TITLES.items():
        rows = by.get(t, [])
        p = os.path.join(NPS, 'extracts', t + '.md')
        with open(p, 'w', encoding='utf-8') as f:
            f.write('# %s\n\n' % title)
            f.write('Extracts from National Park Service reports (United States government works), generated by `scripts/build_extracts.py` from `extracts/src/*.xdef`; do not edit by hand. '
                    'Every quote is cut from the saved source text and is found again by `scripts/verify_extracts.py`. '
                    '"State date" is the date the described feature state refers to: a modern survey describes modern or reconstructed features unless the passage itself says otherwise, '
                    'and nothing dated later than July 1863 may be used as an 1863 profile. '
                    'Page numbers are PDF page indexes of the file as served (printed page in brackets where the page shows one). '
                    'Use for the July 1863 scene: `direct` = the passage states an 1863 (or earlier, still standing) condition; `indirect` = a later, modern, reconstructed or replanted state, usable only as a marked inference; `none` = a feature that did not exist in July 1863 and must never be drawn in the 1863 scene. '
                    'Tier: `documented` = the report states it as fact (official secondary source; its own 1863 basis is given where the passage names it); `inferred` = the report itself hedges or reports conflicting evidence.\n\n')
            f.write('%d extracts.\n\n' % len(rows))
            cur = None
            for r in sorted(rows, key=lambda r: (r['source_id'], r['pdf_page'], r['xid'])):
                if r['source_id'] != cur:
                    cur = r['source_id']
                    f.write('\n## %s\n\n%s (%s). %s\n\n' % (cur, r['source_title'] or '', r['source_date'] or 'date: see INDEX.md', r['url'] or ''))
                pp = 'PDF p. %d' % r['pdf_page'] + (' [%s]' % r['printed_page'] if r['printed_page'] else '')
                f.write('- **%s** (`%s`)\n' % (r['feature'], r['xid']))
                f.write('  - State date: **%s** | use for the July 1863 scene: **%s** | tier proposed: %s (source wording: %s) | %s\n' % (r['state_date'], r['use_for_1863'], r['tier_proposed'], r['source_certainty'], pp))
                if r['repo_keys']:
                    f.write('  - Repository ids: %s\n' % ', '.join('`%s`' % k for k in r['repo_keys']))
                f.write('  - Claim: %s\n' % r['claim'])
                f.write('  - Quote: "%s"\n' % r['quote'])
    print('%d extracts written; by topic: %s' % (len(recs), {t: len(v) for t, v in sorted(by.items())}))


if __name__ == '__main__':
    main()

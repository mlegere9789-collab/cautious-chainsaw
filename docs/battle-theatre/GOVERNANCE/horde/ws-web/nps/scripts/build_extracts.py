#!/usr/bin/env python3
"""Build the extract records from the definition files (extracts/src/*.xdef).

A definition line names a source, a PDF page and the first and last words of a passage; the
quote itself is CUT from the saved source text by this script, so a quote can never be
retyped or paraphrased. A passage that is not found exactly once on the named page stops
the build.

Definition file format (UTF-8):
  @ <SOURCE-ID>                    following lines belong to this source
  %basis <text>                    the records the report itself names as the basis of the following passages
                                   (e.g. '1860 census; NARA Damage Claims, RG 92'); '%basis -' clears it
  %images <pages>                  PDF pages of this source whose page image the engineer has looked at (e.g. '13, 20-23, 106');
                                   an extract whose quote page (and context page) are all listed carries page_image_viewed true;
                                   no other extract claims a visual check
  # comment
  <pdf page> | <topic> | <feature> | <keys> | <state date> | <certainty> | <claim> | <anchor> [| <context anchor>]
    topic      one of TOPICS below
    keys       ids of this repository the feature concerns (comma separated) or '-'
    state date the date the described feature state refers to (e.g. 1863-07, pre-1863,
               1868, 2006 reconstruction, modern 2024)
    certainty  stated | hedged | conflict   (hedged: the source itself says probably, may,
               likely, appears; conflict: the source itself reports contradictory evidence)
    anchor     '#s12' or '#s12-14' (sentences 12 to 14 of the page as numbered by `kwic.py page`;
               the quote is those sentences cut from the page text, nothing retyped), or
               'first words >>> last words' (quote runs from the first to the last, inclusive),
               or the whole short quote. Matching is whitespace-insensitive, otherwise exact.
               '=<quote>' is for a text layer with OCR damage (letters broken apart by spaces, stray
               marks, dropped punctuation): the quote is typed with the damage repaired and must
               contain exactly the letters and digits of ONE passage of the page (case-insensitive,
               spacing and punctuation ignored; for a source flagged text_defect=ligature the groups
               ti tt tf ft tl ff are ignored on both sides because the text layer lost those glyphs;
               for text_defect=fi-ligature every f with the letters f, i, l after it is ignored on both sides because the text layer
               kept only the f of fi, fl and ff).
               At the first or last word of a quote one letter may be given up where a lost-glyph group spans the quote boundary
               on the page (find_cleaned). The builder stores the raw text-layer excerpt next to the repaired quote.
               An OCR letter error is corrected explicitly with {{saved|fixed}}: matching uses `saved` (exactly as the
               text layer reads), the quote shows `fixed`, and the record lists every pair in ocr_corrections.
               A trailing ' ~L' uses the layout text of the page, ' ~R' the content-stream-order text (line-end
               hyphenation repaired), ' ~O' the OCR text made by scripts/ocr.py (tesseract; line-end hyphenation repaired),
               ' ~S' the standard reading-order text, instead of the source's default variant.
               A trailing ' ~#k' takes the k-th occurrence of a passage that repeats on the page.
    context    optional 9th field, an anchor of the same kinds (no trailing flags) that is cut from the same page
               (or, written '@<pdf page>: <anchor>', from another page of the same source) and kept next to the quote
               as `context_quote` (with `context_pdf_page`): it carries a date, a name or a number that the claim
               needs but that stands in another sentence (a list heading, the entry heading, the page before). The
               claim is supported by the quote and the context quote together; both are verbatim page text.

Outputs (next to this script's parent folder):
  extracts/extracts.jsonl          one record per extract
  extracts/<topic file>.md         per-topic extract sheets
Run:  python3 -I build_extracts.py
"""
import glob, hashlib, json, os, re, sys, unicodedata

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


_COMPOUND_HEADS = set('''mid post pre non self well two three four five six seven eight nine ten one half north south east west northeast northwest southeast southwest
upper lower long short high low old new free full large small multi semi anti co ex vice inter over under out up down back front fire cross'''.split())


def dehyphenate(text):
    """Repair line-end hyphenation of a content-stream-order text: 'McPher-\nson' -> 'McPherson'.
    A real compound broken at the line end ('post-\nand-rail') keeps its hyphen: decided from the document's own
    intact tokens (the joined word, or the hyphenated word, appears elsewhere in the same text) and a short list of compound heads."""
    flat_tokens = set(re.findall(r"[A-Za-z][A-Za-z'\u2019-]*[A-Za-z]", re.sub(r'-\n', '\x00', text).replace('\n', ' ')))
    low = {t.lower() for t in flat_tokens if '\x00' not in t}

    def rep(m):
        a, b = m.group(1), m.group(2)
        joined, hy = (a + b).lower(), (a + '-' + b).lower()
        if joined in low:
            return a + b
        if hy in low or a.lower() in _COMPOUND_HEADS:
            return a + '-' + b
        return a + b
    return re.sub(r'([A-Za-z]+)-\n([a-z]+)', rep, text)


def text_path(sid, variant=None):
    name = {None: '.txt', 'layout': '.layout.txt', 'raw': '.raw.txt', 'ocr': '.ocr.txt'}[variant]
    for base in (LIB, os.path.join(LIB, 'pages')):
        p = os.path.join(base, sid, sid + name)
        if os.path.exists(p):
            return p
    raise SystemExit('no saved %s text for source %s' % (variant or 'reading-order', sid))


def pages(sid, variant=None):
    """variant: None (reading order), 'layout', 'raw' (content-stream order) or 'ocr' (scripts/ocr.py); raw and ocr have line-end hyphenation repaired."""
    if variant is True:
        variant = 'layout'
    k = (sid, variant)
    if k not in _cache:
        p = text_path(sid, variant)
        txt = open(p, encoding='utf-8').read()
        if variant in ('raw', 'ocr'):
            txt = dehyphenate(txt)
        parts = re.split(r'^=== PAGE (\d+) ===\n', txt, flags=re.M)
        _cache[k] = ({int(parts[i]): parts[i + 1] for i in range(1, len(parts), 2)}, sha256_file(p), os.path.relpath(p, ROOT))
    return _cache[k]


def printed_page(page_text, variant=None):
    """Printed page number where the page itself shows one in a recognisable footer or running head."""
    if variant == 'raw':
        lines = [l.strip() for l in page_text.split('\n') if l.strip()]
        for l in lines[:4] + lines[-3:]:
            if re.fullmatch(r'\d{1,3}', l):
                return l
            m = re.match(r'(\d{1,3}) (Site His|Existing|Analysis|Treatment|Cultural|References|Appendi)', l, re.I)
            if m:
                return m.group(1)
        return None
    flat = norm(page_text)
    m = re.search(r'Cultural Landscapes Inventory Page (\d+) of (\d+)', flat)
    if m:
        return 'Page %s of %s' % (m.group(1), m.group(2))
    m = re.search(r'Cultural Landscapes Inventory (?:Part \w+ )?Page (\d+)', flat)
    if m:
        return 'Page %s' % m.group(1)
    return None


_ABBR = set('''mr mrs ms dr st gen col maj capt lt sgt pvt cpl co vs etc no nos rev jr sr hon gov pa md va n.y d.c u.s ave rd ft mt ca approx fig figs
pp p ed eds vol vols inc ltd bros e.g i.e cf sec brig adj bvt hdqrs regt div dept a.m p.m mass conn n.j n.c s.c w.va ga ala miss tenn ky mo ill ind wis mich
minn corp cav art inf bn bde mil pk bldg bldgs esq messrs supt jan feb mar apr jun jul aug sept sep oct nov dec ibid op cit prop sq yd in lb lbs oz ch chs hdq
al wm geo chas thos jas jos robt benj sam'l fred'k abm h.r s.r'''.split())


def split_sentences(flat):
    """Deterministic sentence split of a whitespace-normalised page text (used for the '#s' anchors and by kwic.py)."""
    out, start = [], 0
    for m in re.finditer(r'[.!?][\"\u201d\u2019)\]]*\s+', flat):
        end = m.end()
        if end >= len(flat):
            break
        w = re.search(r'(\S+)$', flat[start:m.start()])
        tok = (w.group(1) if w else '').lower().lstrip('(\"\u201c\u2018[')
        if m.group(0)[0] == '.':
            if tok in _ABBR or (len(tok) == 1 and tok.isalpha()) or re.fullmatch(r'[a-z]\.[a-z]', tok) or re.search(r'[-/][a-z]$', tok):
                continue
        nxt = flat[end]
        if nxt.islower():
            continue
        out.append(flat[start:m.start() + len(m.group(0).rstrip())])
        start = end
    if start < len(flat):
        out.append(flat[start:])
    return out


_LIG = re.compile(r'tti|tt|ti|tf|ft|tl|ff')
_LIG_FI = re.compile(r'f[fil]*')


def _alnum_map(flat, lig):
    """Letters and digits of flat (lower case) with, for each, its index in flat; ligature groups removed when lig."""
    chars, idx = [], []
    for i, c in enumerate(flat):
        # compatibility forms (the fi, fl, ff ligature code points of a PDF text layer) count as their letters
        for d in unicodedata.normalize('NFKC', c):
            if d.isalnum():
                chars.append(d.lower()); idx.append(i)
    key = ''.join(chars)
    if not lig:
        return key, idx
    out, oidx, pos = [], [], 0
    for m in (_LIG_FI if lig == 'fi' else _LIG).finditer(key):
        out.append(key[pos:m.start()]); oidx.extend(idx[pos:m.start()]); pos = m.end()
    out.append(key[pos:]); oidx.extend(idx[pos:])
    return ''.join(out), oidx


_CORR = re.compile(r'\{\{(.*?)\|(.*?)\}\}')


def find_cleaned(key, qkey, lig):
    """Position of the quote's letters (qkey) in the letters of the page (key): (start, length, None) of the single
    occurrence, or (None, None, reason).
    A quote that starts or ends next to a lost-glyph group can lose its first or last letter to a group that spans the
    quote boundary on the page side: on the page 'distant. Towards' reads 'distan' + removed 'tt' + 'owards', so a quote
    ending in 'distant' or starting with 'Towards' has one letter more than the page key. Only for a source flagged with a
    lost-glyph defect, and only then, one such boundary letter is given up (start: t, i, f or l; end: t or f); the
    quote must still occur exactly once. verify_extracts.py applies the same rule."""
    tries = [(0, 0)] + ([(1, 0), (0, 1), (1, 1)] if lig else [])
    for lead, trail in tries:
        if lead and qkey[:1] not in 'tilf':
            continue
        if trail and qkey[-1:] not in 'tf':
            continue
        q = qkey[lead:len(qkey) - trail]
        if len(q) < 20:
            continue
        n = key.count(q)
        if n == 1:
            return key.find(q), len(q), None
        if n > 1 and (lead, trail) == (0, 0):
            return None, None, 'letters found %d times' % n
    return None, None, 'letters not found'


def cut_cleaned(page_text, quote, lig=False):
    """quote may contain {{saved|fixed}} marks: the text layer reads `saved` (an OCR letter error) and the quote shows `fixed`.
    Matching uses `saved`; the pairs are returned so that the record shows every correction made."""
    flat = norm(page_text)
    corrections = [(a, b) for a, b in _CORR.findall(quote)]
    match_form = _CORR.sub(lambda m: m.group(1), quote)
    shown = _CORR.sub(lambda m: m.group(2), quote)
    key, idx = _alnum_map(flat, lig)
    qkey, _ = _alnum_map(norm(match_form), lig)
    if len(qkey) < 25:
        return None, 'cleaned quote too short to identify a passage', None
    st, ln, why = find_cleaned(key, qkey, lig)
    if st is None:
        k = len(qkey)
        while k > 12 and key.count(qkey[:k]) == 0:
            k -= 1
        return None, 'cleaned quote: %s (longest matching prefix %d of %d letters: %r)' % (why, k, len(qkey), norm(match_form)[:60]), None
    a, b = idx[st], idx[st + ln - 1]
    return (norm(shown), corrections, norm(quote)), None, flat[a:b + 1]


def cut(page_text, anchor):
    flat = norm(page_text)
    ms = re.fullmatch(r'#s(\d+)(?:-(\d+))?', anchor.strip())
    if ms:
        a = int(ms.group(1)); b = int(ms.group(2) or a)
        sents = split_sentences(flat)
        if not (1 <= a <= b <= len(sents)):
            return None, 'sentence range %d-%d outside 1-%d' % (a, b, len(sents))
        return ' '.join(sents[a - 1:b]), None
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


def resolve(page_text, anchor, td):
    """Cut one anchor from a page: returns (record-part dict, error). Used for the quote and for the optional context."""
    if anchor.startswith('='):
        q, err, excerpt = cut_cleaned(page_text, anchor[1:], 'fi' if td == 'fi-ligature' else (td == 'ligature'))
        if err:
            return None, err
        q, corrections, template = q
        return {'quote': q, 'mode': 'cleaned', 'excerpt': excerpt, 'template': template, 'corrections': corrections}, None
    q, err = cut(page_text, anchor)
    if err:
        return None, err
    return {'quote': q, 'mode': 'sentences' if anchor.startswith('#s') else 'anchors', 'excerpt': None, 'template': None, 'corrections': None}, None


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
    seq = {}
    for f in sorted(glob.glob(os.path.join(NPS, 'extracts', 'src', '*.xdef'))):
        sid = None
        basis = None
        viewed = set()
        for ln, line in enumerate(open(f, encoding='utf-8'), 1):
            line = line.rstrip('\n')
            if not line.strip() or line.lstrip().startswith('#'):
                continue
            if line.startswith('%basis'):
                basis = line[6:].strip() or None
                if basis == '-':
                    basis = None
                continue
            if line.startswith('%images'):
                viewed = set()
                for tok in re.split(r'[,\s]+', line[7:].strip()):
                    if not tok or tok == '-':
                        continue
                    a_, _, b_ = tok.partition('-')
                    viewed.update(range(int(a_), int(b_ or a_) + 1))
                continue
            if line.startswith('@'):
                basis = None
                viewed = set()
                sid = line[1:].strip()
                if sid not in sources:
                    errors.append('%s:%d unknown source %s' % (os.path.basename(f), ln, sid))
                continue
            parts = [x.strip() for x in line.split(' | ')]
            if len(parts) not in (8, 9):
                errors.append('%s:%d expected 8 or 9 fields, got %d' % (os.path.basename(f), ln, len(parts)))
                continue
            pg, topic, feature, keys, sdate, cert, claim, anchor = parts[:8]
            ctx_anchor = parts[8] if len(parts) == 9 else None
            variant = sources.get(sid, {}).get('default_variant')
            occ = ''
            while True:
                mo = re.search(r' ~(L|R|O|S|#\d+)$', anchor)
                if not mo:
                    break
                flag, anchor = mo.group(1), anchor[:mo.start()]
                if flag == 'L': variant = 'layout'
                elif flag == 'R': variant = 'raw'
                elif flag == 'O': variant = 'ocr'
                elif flag == 'S': variant = None
                else: occ = ' ~' + flag
            anchor += occ
            if topic not in TOPICS:
                errors.append('%s:%d unknown topic %s' % (os.path.basename(f), ln, topic)); continue
            if cert not in ('stated', 'hedged', 'conflict'):
                errors.append('%s:%d bad certainty %s' % (os.path.basename(f), ln, cert)); continue
            try:
                pgs, tsha, tpath = pages(sid, variant)
            except SystemExit as ex:
                errors.append('%s:%d %s' % (os.path.basename(f), ln, ex)); continue
            mp = re.fullmatch(r'(\d+)(?:/(.+))?', pg)
            if not mp:
                errors.append('%s:%d bad page field %r' % (os.path.basename(f), ln, pg)); continue
            p, printed_given = int(mp.group(1)), mp.group(2)
            if p not in pgs:
                errors.append('%s:%d page %d not in %s' % (os.path.basename(f), ln, p, sid)); continue
            td = sources.get(sid, {}).get('text_defect')
            got, err = resolve(pgs[p], anchor, td)
            if err:
                errors.append('%s:%d p.%d %s' % (os.path.basename(f), ln, p, err)); continue
            q, mode, excerpt, template, corrections = got['quote'], got['mode'], got['excerpt'], got['template'], got['corrections']
            ctx, ctx_page = None, p
            if ctx_anchor:
                mc = re.match(r'@(\d+):\s*(.*)$', ctx_anchor)
                if mc:
                    ctx_page, ctx_anchor = int(mc.group(1)), mc.group(2)
                if ctx_page not in pgs:
                    errors.append('%s:%d context page %d not in %s' % (os.path.basename(f), ln, ctx_page, sid)); continue
                ctx, err = resolve(pgs[ctx_page], ctx_anchor, td)
                if err:
                    errors.append('%s:%d p.%d context (p.%d): %s' % (os.path.basename(f), ln, p, ctx_page, err)); continue
            seq[(sid, p)] = seq.get((sid, p), 0) + 1
            s = sources.get(sid, {})
            use, sdate = use_for_1863(sdate)
            rec = {
                'xid': 'NPSX-%s-p%03d-%02d' % (sid.replace('NPS-', '').replace('NPSGOV-', 'WEB-'), p, seq[(sid, p)]),
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
                'pdf_page': p, 'printed_page': printed_given or printed_page(pgs[p], variant),
                'quote_mode': mode, 'source_text_excerpt': excerpt,
                'quote_template': template, 'ocr_corrections': [list(c) for c in corrections] if corrections else None,
                'context_quote': ctx['quote'] if ctx else None, 'context_pdf_page': ctx_page if ctx else None, 'context_mode': ctx['mode'] if ctx else None,
                'context_excerpt': ctx['excerpt'] if ctx else None, 'context_template': ctx['template'] if ctx else None,
                'context_corrections': [list(c) for c in ctx['corrections']] if ctx and ctx['corrections'] else None,
                'basis_named': basis,
                'text_defect': s.get('text_defect'),
                'text_variant': variant or 'reading-order',
                'text_path': tpath, 'text_sha256': tsha,
                'retrieved': RETRIEVED,
                'source_kind': s.get('kind', 'official secondary (National Park Service report)'),
                'tier_proposed': {'stated': 'documented', 'hedged': 'inferred', 'conflict': 'inferred'}[cert],
                'tier_basis': {'stated': 'official secondary source states it as fact; the 1863 basis is whatever the report cites (see quote and the report page)',
                               'hedged': "the source's own wording is hedged (probably / may / likely); carry as inferred",
                               'conflict': 'the source itself reports contradictory evidence; carry every reading as a scenario'}[cert],
            }
            if p in viewed and ctx_page in viewed:
                rec['page_image_viewed'] = True
            if variant == 'ocr':
                rec['ocr_engine'] = s.get('ocr_engine')
            recs.append(rec)
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
                if r.get('context_quote'):
                    f.write('  - Context (PDF p. %s): "%s"\n' % (r.get('context_pdf_page') or r['pdf_page'], r['context_quote']))
    print('%d extracts written; by topic: %s' % (len(recs), {t: len(v) for t, v in sorted(by.items())}))


if __name__ == '__main__':
    main()

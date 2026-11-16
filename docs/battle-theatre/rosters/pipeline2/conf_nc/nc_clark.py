"""Clark (1901) notes of the conf-nc work item: locate every statement of nc_clark_spec.py in the pinned OCR text, assert it, compare it with the second scan, write it into the ledger.

    python3 -I nc_clark.py --check     resolve and assert every note and print the table; writes nothing
    python3 -I nc_clark.py --write     the same, then writes  data2/sources/NC-CLARK-1901.json  (members notes, notes_format, notes_scope, notes_units) and
                                       GOVERNANCE/horde/ws-rosters/conf-nc/clark-notes-check.json  (the scan counts per unit and the second-scan comparison)

The statements are NOTES in the source ledger, not roster rows (work item first task 2).  Every note carries the quotation exactly as the text layer prints it (white space joined),
its character offset and end in the pinned text, the printed page of the leaf, the chapter and the author named in Clark's table of contents, the figures as printed with a reading of
each as a number, and the result of looking for the same statement in the second scan (Emory copy) of the volume: whether each printed figure stands there too.  A note is a
statement of the named author or of the person he quotes: tier "documented" here means "the quotation exists at that place", never "the figure is true".
Standard library only.
"""
import os, sys, re, json, bisect, hashlib, collections

HERE = os.path.dirname(os.path.abspath(__file__))
P2 = os.path.abspath(os.path.join(HERE, '..'))
sys.path.insert(0, HERE)
sys.path.insert(0, P2)
import r2lib as R
import verify_unit as V
import nc_clark_spec as SP

ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..', '..'))
D2 = os.path.join(ROOT, 'docs', 'battle-theatre', 'rosters', 'data2')
LEDGER = os.path.join(D2, 'sources', 'NC-CLARK-1901.json')
WS = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'horde', 'ws-rosters', 'conf-nc')
SRC = 'NC-CLARK-1901'

# ------------------------------------------------------------------ the scan (the procedure written in nc_clark_spec.py)
NW = r'(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|half|score|dozen|handful)'
QTY = re.compile(r'(?i)(?<![A-Za-z])(?:\d[\d,\.]*\d|\d{1,2}(?![\d])|' + NW + r'(?:-' + NW + r')?)(?![A-Za-z])')
GZ = re.compile(r'(?i)gett?y?s?-?\s*b|gettys|cemetery\s+(?:hill|ridge)|first\s+day|second\s+day|third\s+day|july\s+[123]\b|[123]\s+july|pettigrew|culp|seminary|falling\s+waters')
CONT = re.compile(r'(?i)\b(men|officers|company|companies|regiment|brigade|muskets|killed|wounded|missing|prisoners|captured|lost|loss|strong|reduced|present|duty|carried|took|went|survivors|rank|effective|numbered|aggregate|left)\b')
DATEONLY = re.compile(r'(?i)^(?:on|in|at)?\s*(?:the\s+)?\d{1,2}\s*(?:st|nd|rd|th)?\s+(?:of\s+)?(?:jan|feb|mar|apr|may|june|july|aug|sep|oct|nov|dec)')
Q = r'(?:\d[\d,\.]*\d|\d{1,3}|' + NW + r'(?:[- ]+(?:and\s+)?' + NW + r')*)'
FIG = re.compile(r'(?i)(?<![A-Za-z])' + Q + r'\s+(?:(?:rank\s+and\s+file|enlisted|private|commissioned|able|brave|gallant|noble|effective|fighting|wounded|killed|dead|musketeers?)\s+)?'
                 r'(?:men|officers|muskets|privates|killed|wounded|missing|prisoners|captured|strong|present|aggregate|musicians|guns|horses|carried|survivors|rank|effectives?|souls|boys|heroes)\b|'
                 r'\b(?:killed|wounded|lost|loss|numbered|aggregate|total|strength|reduced\s+to|with|only|about|nearly|over|some)\s+(?:of\s+)?(?:about\s+|only\s+|nearly\s+|over\s+|some\s+)?' + Q + r'(?![A-Za-z\d])')
ABBREV = {'col', 'capt', 'lieut', 'lt', 'gen', 'maj', 'sergt', 'sgt', 'adjt', 'wm', 'thos', 'jas', 'geo', 'chas', 'benj', 'jno', 'jos', 'hon', 'rev', 'dr', 'mr', 'mrs', 'co', 'cos', 'no', 'st', 'jr', 'sr', 'vs', 'ft',
          'asst', 'regt', 'vol', 'pa', 'va', 'md', 'n.c', 'c.s.a'}
SPLIT = re.compile(r'(?<=[\.\?\!])\s+(?=[A-Z"“‘\'\[])')


def norm(x):
    """hyphenation at a line end joined ("thir- ty" -> "thirty"), white space collapsed"""
    x = re.sub(r'(?<=[A-Za-z])-\s+(?=[a-z])', '', x)
    return re.sub(r'\s+', ' ', x)


def collapse(x):
    return ' '.join(x.split())


_cache = {}


def volume(tid):
    """text, PageMap, ledger entry, sentence spans [(s, e)], normalised sentences, collapsed sentences (the whole volume, split once)"""
    if tid in _cache:
        return _cache[tid]
    text, pm, ent = V.load_source(SRC, tid)
    spans, p = [], 0
    for m in SPLIT.finditer(text):
        before = text[max(0, m.start() - 8):m.start()]          # the word that ends with the full stop: an initial or an abbreviation does not end a sentence
        tok = re.split(r'[\s(\[]', before)[-1]
        if (len(tok) == 2 and tok[0].isupper() and tok[1] == '.') or tok.rstrip('.').lower() in ABBREV:
            continue
        spans.append((p, m.start()))
        p = m.end()
    spans.append((p, len(text)))
    ns = [norm(text[s:e]) for s, e in spans]
    cs = [collapse(text[s:e]) for s, e in spans]
    starts = [s for s, e in spans]
    _cache[tid] = (text, pm, ent, spans, ns, cs, starts)
    return _cache[tid]


def page_of(tid, off):
    text, pm = volume(tid)[:2]
    leaf = pm.leaf(off)
    return (None if leaf is None else pm.printed(leaf)), leaf


def scan_counts(tid, a, b, win=2):
    """sentences of the chapter, sentences in the Gettysburg zone with a figure and a content word, those of them with a figure that names men, officers, guns or losses"""
    text, pm, ent, spans, ns, cs, starts = volume(tid)
    i0 = bisect.bisect_left(starts, a)
    i1 = bisect.bisect_left(starts, b)
    idx = list(range(i0, i1))
    gz = [i for i in idx if GZ.search(ns[i])]
    zone = set()
    for i in gz:
        for j in range(max(i0, i - win), min(i1, i + win + 1)):
            zone.add(j)
    c4, c5 = 0, 0
    for i in sorted(zone):
        x = ns[i]
        if QTY.search(x) and CONT.search(x) and len(x) < 1500 and not DATEONLY.match(x):
            y = re.sub(r'(?i)\b(?:jan|feb|mar|apr|may|june?|july?|aug|sept?|oct|nov|dec)[a-z]*\.?,?\s*\d{1,2}(?:,?\s*18\d\d)?|\b\d{1,2}\s+(?:jan|feb|mar|apr|may|june?|july?|aug|sept?|oct|nov|dec)[a-z]*\.?,?\s*(?:18\d\d)?|\b18\d\d\b', '', x)
            if QTY.search(y):
                c4 += 1
                if FIG.search(x):
                    c5 += 1
    return {'sentences': len(idx), 'gettysburg_zone_sentences': len(zone), 'figure_sentences': c4, 'figure_sentences_with_men_or_losses': c5}


# ------------------------------------------------------------------ resolving a note
def chapter_label(note, off):
    if note.get('source') in SP.EXTRA:
        v, a, b, lab = SP.EXTRA[note['source']]
        if v != note['vol'] or not (a <= off < b):
            raise ValueError('offset %d of volume %s is outside the chapter %r' % (off, note['vol'], note['source']))
        return lab
    for u in ([note['chap']] if note.get('chap') else note['units']):
        for v, a, b, lab in SP.CHAPTERS.get(u, []):
            if v == note['vol'] and a <= off < b:
                return lab
    return None


def resolve(note):
    tid = SP.TEXT[note['vol']]
    text, pm, ent, spans, ns, cs, starts = volume(tid)
    ph = note['phrase']
    hits = [i for i in range(len(spans)) if (ph in ns[i] or ph in cs[i]) and all(m in cs[i] or m in cs[min(len(cs) - 1, i + note['n'] - 1)] or m in ns[i] for m in note.get('must', []))]
    if len(hits) != 1:
        raise ValueError('phrase %r in volume %s: %d sentences (%s)' % (ph, note['vol'], len(hits), [spans[i][0] for i in hits][:6]))
    i = hits[0]
    j = i + note['n'] - 1
    s, e = spans[i][0], spans[j][1]
    quote = collapse(text[s:e])
    for printed, value, what in note['figures']:
        if printed not in quote and printed not in norm(quote):
            raise ValueError('figure %r is not in the quotation of %r: %s' % (printed, ph, quote[:200]))
    pg, leaf = page_of(tid, s)
    lab = chapter_label(note, s)
    if lab is None:
        raise ValueError('no chapter holds offset %d of volume %s for %s' % (s, note['vol'], note['units']))
    return {'t': tid, 'off': s, 'end': e, 'pg': pg, 'leaf': leaf, 'quote': quote, 'chapter': lab}


def squash(x):
    return re.sub(r'[^A-Za-z0-9]', '', x).lower()


def second_scan(note, r):
    """Look for the same statement in the Emory copy of the volume.  Candidate sentences are those that contain a run of three plain words of the quotation (any non-letters between the
    words); the candidate that is most like the first sentence of the quotation (difflib ratio at least 0.5) and stands on the same printed page (or a neighbour) is taken; then every
    printed figure is looked for in the n sentences from there, ignoring blanks, hyphens and case ("twenty- three" is "twenty-three")."""
    import difflib
    tb = SP.TEXT_B[note['vol']]
    text, pm, ent, spans, ns, cs, starts = volume(tb)
    store = volume.__dict__.setdefault('big', {})
    if tb not in store:
        offs, p = [], 0
        for x in ns:
            offs.append(p)
            p += len(x) + 1
        store[tb] = ('\n'.join(ns), offs)
    big, offs = store[tb]
    first = norm(r['quote'])
    words = [w for w in re.findall(r"[A-Za-z']+", first) if len(w) >= 3]
    cand = set()
    k = 3
    for a in sorted(set([0, len(words) // 4, len(words) // 2, (3 * len(words)) // 4, max(0, len(words) - k)])):
        if a + k > len(words):
            continue
        pat = r'[^A-Za-z]+'.join(re.escape(w) for w in words[a:a + k])
        for m in re.finditer(pat, big):
            cand.add(bisect.bisect_right(offs, m.start()) - 1)
    best, bestr = None, 0.0
    pa = r['pg']
    for i in sorted(cand):
        pb = page_of(tb, spans[i][0])[0]
        if isinstance(pa, int) and isinstance(pb, int) and abs(pa - pb) > 1:
            continue
        # the first sentence of the quotation is the sentence that holds the phrase; compare with every sentence of the candidate window
        ratio = difflib.SequenceMatcher(None, first[:300].lower(), ' '.join(ns[i:i + note['n']])[:300].lower()).ratio()
        if ratio > bestr:
            best, bestr = i, ratio
    if best is None or bestr < 0.5:
        return {'t': tb, 'found': False, 'agrees': None, 'reason': 'no sentence of the second scan on the same page is like the quotation (best ratio %.2f)' % bestr}
    i = best
    j = i + note['n'] - 1
    q2 = ' '.join(cs[i:j + 1])
    n2 = squash(q2)
    found = {}
    for printed, value, what in note['figures']:
        found[printed] = squash(printed) in n2
    return {'t': tb, 'found': True, 'similarity': round(bestr, 2), 'off': spans[i][0], 'end': spans[j][1], 'pg': page_of(tb, spans[i][0])[0], 'quote': q2, 'figures_found': found,
            'agrees': all(found.values())}


def build():
    out, errors = [], []
    for n, note in enumerate(SP.NOTES, 1):
        try:
            r = resolve(note)
        except ValueError as e:
            errors.append('note %d: %s' % (n, e))
            continue
        sec = second_scan(note, r)
        units = [SP.UNITS[u] for u in note['units']]
        rec = {'id': 'CL-%03d' % n, 'units': units, 'subject': note['subject'], 'kind': note['kind'], 'when': note['when'], 'claim': note['claim'], 'strength_figure': note.get('strength'),
               'figures': [{'printed': p, 'value': v, 'what': w} for p, v, w in note['figures']],
               'quote': r['quote'], 't': r['t'], 'off': r['off'], 'end': r['end'], 'pg': r['pg'], 'leaf': r['leaf'], 'chapter': r['chapter'], 'second_scan': sec,
               'tier': 'documented: the quotation stands at this place of the pinned text and says what the claim says; the figure is the statement of the named author, not a muster'}
        if note['phrase'] in SP.IMAGE:
            rec['page_image_check'] = SP.IMAGE[note['phrase']]
        out.append(rec)
    if errors:
        print('\n'.join(errors))
        raise SystemExit('%d notes do not resolve' % len(errors))
    return out


def coverage(notes):
    cov = {}
    for u, chs in SP.CHAPTERS.items():
        key = SP.UNITS[u]
        tot = collections.Counter()
        for v, a, b, lab in chs:
            c = scan_counts(SP.TEXT[v], a, b)
            for k, x in c.items():
                tot[k] += x
        mine = [n for n in notes if key in n['units']]
        cov[key] = {'chapters': [{'label': lab, 'text': SP.TEXT[v], 'from': a, 'to': b} for v, a, b, lab in chs], 'scan': dict(tot), 'notes': len(mine),
                    'notes_by_kind': dict(collections.Counter(n['kind'] for n in mine))}
    return cov


def main(argv):
    notes = build()
    cov = coverage(notes)
    bad = [n for n in notes if n['second_scan'].get('agrees') is False]
    nf = [n for n in notes if not n['second_scan'].get('found')]
    print('%d notes; second scan: agrees %d, a printed figure not in it %d, statement not found %d' % (len(notes), sum(1 for n in notes if n['second_scan'].get('agrees')), len(bad), len(nf)))
    for n in bad:
        print('  DISAGREE', n['id'], n['units'][0][5:], n['figures_found'] if 'figures_found' in n else n['second_scan']['figures_found'], '|', n['second_scan']['quote'][:200])
    for n in nf:
        print('  NOT FOUND', n['id'], n['units'][0][5:], n['quote'][:80])
    if '--write' not in argv:
        return 0
    led = json.load(open(LEDGER, encoding='utf-8'))
    led['notes_format'] = 'roster2-notes/1'
    led['notes_scope'] = ('Statements of strength, number present for duty, number taken into action, number left and losses of the units of the work item conf-nc at Gettysburg (1-3 July 1863) and in the campaign, '
                          'taken from Clark, Histories of the Several Regiments and Battalions from North Carolina in the Great War, 1861-65 (1901), as the text layer prints them; a note is a statement '
                          'of the author named in the chapter label or of the person he quotes, not a muster; the list is a floor (pipeline2/conf_nc/nc_clark_spec.py says how it was made) and not a count of '
                          'everything Clark prints; no note is a roster row')
    led['notes'] = notes
    led['notes_units'] = cov
    with open(LEDGER, 'w', encoding='utf-8') as f:
        json.dump(led, f, ensure_ascii=False, indent=1)
        f.write('\n')
    with open(os.path.join(WS, 'clark-notes-check.json'), 'w', encoding='utf-8') as f:
        json.dump({'format': 'conf-nc-clark-check/1', 'notes': len(notes), 'second_scan_agrees': [n['id'] for n in notes if n['second_scan'].get('agrees')],
                   'second_scan_disagrees': [n['id'] for n in bad], 'second_scan_not_found': [n['id'] for n in nf], 'coverage': cov}, f, ensure_ascii=False, indent=1)
        f.write('\n')
    print('wrote', os.path.relpath(LEDGER, ROOT))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))

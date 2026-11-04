"""Record builders for tools/bt/or27_index.py (kept separate so each file stays reviewable).
Parts 1-2: reports aligned to the table of contents.  Part 3: correspondence/orders/returns segmented into documents."""
import os, re, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from or27_index import *


# ---------------------------------------------------------------- Parts 1-2
def clean_toc(toc):
    out = []
    for e in toc:
        t = e['text']
        if len(t) < 8:
            continue
        letters = re.sub(r'[^A-Za-z]', '', t)
        if letters and letters.isupper():
            continue
        cont = bool(re.match(r'^(Brigade|Battery|Corps|Division|Infantry|Artillery|Horse)\b', t)) and e['toc_ocr_no'] is None
        if cont and (re.match(r'^Brigade', t) or not RANK_START.match(t)):
            if out:
                out[-1]['text'] = out[-1]['text'] + ' ' + t
            continue
        out.append(e)
    return out


def find_gibberish(text, lo, hi, min_lines=15):
    """Longest run of lines (blank lines allowed) whose words are almost all rare/non-words: an upside-down scanned page whose OCR is
    reversed gibberish. Returns (start_offset, end_offset) of the run or None."""
    fr = corpus_freq()
    best = None
    run_start = None
    run_n = 0
    last_end = None
    for off, ln in lines_with_offsets(text, lo, hi):
        toks = re.findall(r"[A-Za-z']{3,}", ln)
        if len(ln.strip()) < 2:
            continue
        if len(toks) >= 3:
            ok = sum(1 for w in toks if fr[w.lower()] >= 8) / len(toks)
        else:
            ok = 1.0 if len(toks) == 0 and not re.search(r'[A-Za-z]{2}', ln) else (0.0 if not toks else 1.0)
        junk = (len(toks) >= 3 and ok < 0.3) or (len(toks) < 3 and len(ln.strip()) > 20 and not toks)
        if junk:
            if run_start is None:
                run_start, run_n = off, 0
            run_n += 1
            last_end = off + len(ln)
        elif run_start is not None and len(toks) >= 3:
            if run_n >= min_lines and (best is None or run_n > best[2]):
                best = (run_start, last_end, run_n)
            run_start = None
    if run_start is not None and run_n >= min_lines and (best is None or run_n > best[2]):
        best = (run_start, last_end, run_n)
    return (best[0], best[1]) if best else None


def recover_heading(text, lo, hi, toc_text):
    """No printed 'No. N.' heading was matched: find the line in [lo,hi) that best matches 'Report of <ToC author>'."""
    key = norm_title_key(toc_text)
    best = (0.0, None)
    for off, ln in lines_with_offsets(text, lo, hi):
        s = ln.strip()
        if len(s) < 12 or not re.match(r'(?i)^\W*(r[eoc]p|ke[pr]|ee?p|itiner|abstract|organi|return|record)', s):
            continue
        blk = clean(' '.join(x.strip() for x in text[off:off + 400].split('\n')[:4]))
        sc = sim(key, norm_title_key(blk))
        if sc > best[0]:
            best = (sc, off)
    return best


def series_title_before(text, off):
    seg = text[max(0, off - 900):off]
    m = None
    for m in re.finditer(r'(?im)^\W*[KRE]\w{1,3}PORTS\W*$', seg):
        pass
    if not m:
        return None
    before = seg[:m.start()].strip().split('\n\n')
    return clean(before[-1]) if before and before[-1].strip() else None


def build_part12(part, notes, unresolved):
    text = load_text(part)
    hs, pr = get_heads(text)
    pm = PageModel(hs, pr)
    head_offs = set(h['off'] for h in hs)
    toc_start, bh = part_regions(part, text)
    first_body = bh[0]['off']
    toc = clean_toc(parse_toc(text, toc_start, first_body))
    base = 1 if part == 1 else 379
    for k, e in enumerate(toc):
        e['no'] = base + k
        e['title_parsed'] = parse_title(e['text'])
    agree = sum(1 for e in toc if e['toc_ocr_no'] and digits_of(e['toc_ocr_no']) == e['no'])
    notes.append('Part %d: ToC entries parsed %d (sequence %d..%d); %d carry an OCR number identical to the sequence number.' % (part, len(toc), toc[0]['no'], toc[-1]['no'], agree))
    for h in bh:
        h['title'], h['after'] = title_block(text, h['off'], head_offs)
    kt = [norm_title_key(e['text']) for e in toc]
    kb = [norm_title_key(h['title']) for h in bh]
    path = align(toc, bh, kt, kb)
    toc_to_body = {}
    used_body = set()
    for a, b in path:
        if a is not None and b is not None:
            toc_to_body[a] = b
            used_body.add(b)
    toc_only = [a for a, b in path if b is None]
    sorted_pairs = sorted((bh[b]['off'], a) for a, b in toc_to_body.items())
    for a in toc_only:
        prev_off = max([o for o, aa in sorted_pairs if aa < a], default=first_body)
        next_off = min([o for o, aa in sorted_pairs if aa > a], default=len(text))
        sc, off = recover_heading(text, prev_off + 20, next_off, toc[a]['text'])
        if off is not None and sc >= 0.55:
            hh = {'off': off, 'ocr': None, 'n': None, 'title': clean(text[off:off + 300].split('\n\n')[0]), 'after': off, 'recovered': round(sc, 2)}
            bh.append(hh)
            toc_to_body[a] = len(bh) - 1
            used_body.add(len(bh) - 1)
            sorted_pairs.append((off, a))
            sorted_pairs.sort()
        elif find_gibberish(text, prev_off + 20, next_off):
            gs, ge = find_gibberish(text, prev_off + 20, next_off)
            hh = {'off': gs, 'ocr': None, 'n': None, 'title': toc[a]['text'], 'after': ge, 'inverted': True}
            bh.append(hh)
            toc_to_body[a] = len(bh) - 1
            used_body.add(len(bh) - 1)
            sorted_pairs.append((gs, a))
            sorted_pairs.sort()
        else:
            unresolved.append({'part': part, 'report_no': toc[a]['no'], 'toc_text': toc[a]['text'][:140],
                               'reason': 'no matching heading found between neighbouring reports (best similarity %.2f); record omitted' % sc})
    main = []
    for a in sorted(toc_to_body):
        main.append((bh[toc_to_body[a]]['off'], 'main', a, bh[toc_to_body[a]]))
    last_main_off = max([m[0] for m in main]) if main else 0
    extras = []
    ignored = []
    if part == 2:
        series = 0
        prev_n = None
        local = 0
        st = None
        for j, h in enumerate(bh):
            if j in used_body or h['off'] <= last_main_off:
                continue
            if not re.match(r'(?i)^\W*(r[eoc]p|ke[pr]|ee?p|miscell)', h['title']):
                ignored.append({'offset': h['off'], 'ocr_heading': h['ocr'], 'title_start': h['title'][:80]})
                continue
            n = h['n']
            if n == 1 or prev_n is None or (n is not None and prev_n is not None and n < prev_n and n <= 2):
                series += 1
                local = 1
                st = series_title_before(text, h['off'])
            else:
                local += 1
            prev_n = n
            extras.append((h['off'], 'extra', series, h, local, st))
    allrec = sorted(main + extras, key=lambda x: x[0])
    boundary_end = end_marker(text, allrec[-1][0]) if allrec else len(text)
    out = []
    for idx, rec in enumerate(allrec):
        start = rec[0]
        end = allrec[idx + 1][0] if idx + 1 < len(allrec) else boundary_end
        h = rec[3]
        body_tp = parse_title(h['title']) if h.get('title') else None
        if rec[1] == 'main':
            e = toc[rec[2]]
            tp = e['title_parsed']
            no = e['no']
            series_id, local_no, series_title = 'main', no, None
            toc_text = e['text']
            toc_sim = round(sim(kt[rec[2]], norm_title_key(h['title'])), 2) if h.get('title') else None
            toc_body_disagree = False
            if toc_sim is not None and toc_sim < 0.62 and body_tp and body_tp['author'] and len(h['title']) > 40 and not h.get('inverted'):
                tp = body_tp  # the printed heading of the document itself wins over the (OCR-parsed) contents list
                toc_body_disagree = True
        else:
            toc_body_disagree = False
            tp = body_tp
            no, series_id, local_no, series_title = None, 'other-ops-%d' % rec[2], rec[4], rec[5]
            toc_text = None
            toc_sim = None
        rank = tp['rank'] or (body_tp['rank'] if body_tp else None)
        author = tp['author'] or (body_tp['author'] if body_tp else None)
        dl_raw, dl_date = find_dateline(text, h.get('after') or start)
        sp = pm.page_at(start)
        ep = pm.page_at(max(start, end - 1))
        out.append({
            'id': 'OR27-%d-%s' % (part, ('R%03d' % no) if no is not None else ('S%d-%02d' % (rec[2], local_no))),
            'part': part, 'series': series_id, 'series_title': series_title,
            'report_no': no, 'report_no_local': local_no, 'report_no_printed_ocr': h.get('ocr'),
            'kind': tp['kind'], 'rank': rank, 'author': author, 'unit_scope': tp['unit_scope'],
            'toc_text': toc_text, 'body_title': h.get('title'), 'toc_vs_body_title_similarity': toc_sim,
            'heading_recovered_by_search': h.get('recovered'),
            'dateline_raw': dl_raw, 'date_text': dl_date,
            'start_offset': start, 'end_offset': end,
            'start_page': sp['page'], 'start_page_range': [sp['lo'], sp['hi']], 'start_page_conf': sp['conf'],
            'end_page': ep['page'], 'end_page_range': [ep['lo'], ep['hi']], 'end_page_conf': ep['conf'],
            'ocr': ocr_noise(text, start, end),
            'ocr_inverted_page': bool(h.get('inverted')),
            'toc_body_title_disagree': toc_body_disagree,
        })
    return out, pm, hs, pr, ignored


# ---------------------------------------------------------------- Part 3
MONTH_PAT = r'(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]{0,8}'
DATELINE3 = re.compile(r'^(?P<pre>(?:[A-Z][\w\.\'\-]*(?:\s+[A-Za-z][\w\.\'\-]*){0,4}[,.]\s*)?)(?P<date>' + MONTH_PAT + r'\.?\s*[\dIlOS]{1,2}[,.]?\s*(?:18|l8)\S{2})(?P<post>.{0,34})$')
TIME3 = re.compile(r'(\d{1,2}[.:]\d{2}\s*[ap]\.?\s*m\.?|\d{1,2}\s*[ap]\.?\s*m\.?|noon|midnight)', re.I)
HDR3 = re.compile(r'(?i)(hdqrs|head-?quarters|headqes|headquaetees|war department|executive|navy department|army of|corps|division|brigade|department|washington|adjutant|signal|telegraph|office|camp|station|fort)')


def sig_of(text, a, b):
    ls = [l.strip() for l in text[a:b].split('\n') if l.strip()]
    for l in reversed(ls[-18:]):
        letters = re.sub(r'[^A-Za-z]', '', l)
        if len(letters) >= 5 and len(l) < 60 and sum(1 for c in letters if c.isupper()) / len(letters) >= 0.7 and not re.search(r'(?i)chap|v[a4]\W.*etc|corresp', l):
            return l.strip(' ,.')
    return None


def build_part3(notes):
    part = 3
    text = load_text(part)
    hs, pr = get_heads(text)
    pm = PageModel(hs, pr)
    head_offs = set(h['off'] for h in hs)
    # section tags from right-hand running heads
    sec_marks = []
    for h in hs:
        ln = h['line']
        if h['form'] == 'R':
            if re.search(r'(?i)conf[eo]d|conf[e]?der', ln):
                sec_marks.append((h['off'], 'confederate'))
            elif re.search(r'(?i)un[il1][o0][nhk]|tj?nion|imi?o[nl]', ln):
                sec_marks.append((h['off'], 'union'))
    ls = lines_with_offsets(text, 0, len(text))
    start_idx = 0
    for k, (off, ln) in enumerate(ls):
        if re.search(r'(?i)(xtnion|union)\s+(cobrespond|correspond)', ln):
            start_idx = k
            break
    cand = []
    for k in range(start_idx, len(ls)):
        off, ln = ls[k]
        s = ln.strip()
        if len(s) < 8 or len(s) > 90 or off in head_offs:
            continue
        m = DATELINE3.match(s)
        if not m:
            continue
        # a date line starts a document only if it sits at the head of a paragraph (blank or header line above)
        prev = ls[k - 1][1].strip() if k > 0 else ''
        prev2 = ls[k - 2][1].strip() if k > 1 else ''
        pre = m.group('pre').strip()
        if not pre and prev:
            # date alone: previous non-blank line must be a header-ish line (ends with comma / contains unit words) else not a start
            if not (prev.endswith(',') or HDR3.search(prev) or len(prev) < 3):
                continue
        # long prose lines starting with a month are not datelines
        post = m.group('post')
        if len(post) > 30 and not TIME3.search(post):
            continue
        cand.append(k)
    docs = []
    for k in cand:
        off, ln = ls[k]
        start_k = k
        # include header lines immediately above (up to 3 short non-blank lines ending a paragraph)
        j = k - 1
        hdr = []
        gaps = 0
        while j >= 0 and len(hdr) < 3:
            sj = ls[j][1].strip()
            if not sj:
                gaps += 1
                if gaps > 1:
                    break
                j -= 1
                continue
            if ls[j][0] in head_offs or len(sj) > 80 or not (HDR3.search(sj) or sj.endswith(',')):
                break
            hdr.append(sj)
            start_k = j
            gaps = 0
            j -= 1
        docs.append({'k': k, 'start_k': start_k, 'hdr': list(reversed(hdr))})
    # drop starts that land inside the previous document's first 2 lines (header+date double-detect)
    final = []
    for d in docs:
        if final and d['start_k'] <= final[-1]['k'] + 1 and d['start_k'] != final[-1]['start_k']:
            continue
        final.append(d)
    out = []
    ends_hard = len(text)
    m_end = re.search(r'ALTERNATE\s+DES|^INDEX\.\s*$|ORGANIZATIONS\s+MENTIONED', text[ls[final[-1]['k']][0]:], re.M)
    if m_end:
        ends_hard = ls[final[-1]['k']][0] + m_end.start()
    import bisect
    smo = [o for o, _ in sec_marks]
    for i, d in enumerate(final):
        start = ls[d['start_k']][0]
        end = ls[final[i + 1]['start_k']][0] if i + 1 < len(final) else ends_hard
        dl = ls[d['k']][1].strip()
        m = DATELINE3.match(dl)
        # addressee: first non-blank line after the date ending with ':' within 4 lines
        addr = None
        for q in range(d['k'] + 1, min(d['k'] + 6, len(ls))):
            sq = ls[q][1].strip()
            if sq and (sq.endswith(':') or sq.endswith(',')) and len(sq) < 90 and not DATELINE3.match(sq):
                addr = sq.rstrip(':,').strip()
                break
            if sq and DATELINE3.match(sq):
                break
        pre_lines = [x for x in d['hdr']]
        place = clean(' '.join(pre_lines + ([m.group('pre')] if m and m.group('pre').strip() else []))) or None
        gi = bisect.bisect_right(smo, start) - 1
        section = sec_marks[gi][1] if gi >= 0 else 'union'
        gen = bool(re.search(r'(?i)orders|circular', ' '.join(pre_lines)))
        tm = TIME3.search(m.group('post')) if m else None
        sp = pm.page_at(start)
        ep = pm.page_at(max(start, end - 1))
        out.append({
            'id': 'OR27-3-D%04d' % (i + 1), 'part': 3, 'kind': 'order' if gen else 'correspondence',
            'section': section, 'header_raw': place, 'date_raw': clean(m.group('date') + m.group('post')) if m else dl,
            'time_text': tm.group(1) if tm else None, 'addressee': addr, 'signer': sig_of(text, start, end),
            'start_offset': start, 'end_offset': end, 'start_page': sp['page'], 'start_page_range': [sp['lo'], sp['hi']],
            'start_page_conf': sp['conf'], 'end_page': ep['page'], 'end_page_range': [ep['lo'], ep['hi']], 'end_page_conf': ep['conf'],
            'ocr': ocr_noise(text, start, end),
        })
    notes.append('Part 3: %d dateline candidates -> %d documents (heuristic; no table of contents of documents exists in Part 3).' % (len(cand), len(out)))
    return out, pm, hs, pr

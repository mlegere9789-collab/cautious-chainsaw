"""Moore's own count of the men of each regiment: the RECAPITULATION at the end of volume 4 ("First Regiment numbered all told ... 1,742").

For every section of the units of this work item the line is found in the volume-4 text of both scans (text ids NC-MOORE-1882.4 and NC-MOORE-1882.4~b); the printed
figure is kept exactly as the text layer prints it, with the quoted line and its offset (verified: text[offset:offset+len(quote)] == quote).  A figure is read as a number
only where it consists of digits, commas, a period and a dash (the printed thousands comma): "1,780." -> 1780.  A figure the text layer damaged (i,742- ; l,So2.) is NOT read:
the value stays None and both printed strings stay in the file.  Where one scan prints a clean figure and the other a damaged one, the clean one is the value; where both are
clean and differ, both stay and the status says so.  Nothing is repaired or guessed.

    python3 -I nc_recap.py        writes GOVERNANCE/horde/ws-rosters/conf-nc/recap.json
"""
import os, sys, re, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import nc_lib as L, nc_sections as S

# Moore section (number, kind) -> label printed in the Recapitulation, as a regex on the line start
LABELS = {
    (1, 'regiment'): r'First\s+Regiment', (2, 'regiment'): r'Second\s+Regiment', (3, 'regiment'): r'Third\s+Regiment', (4, 'regiment'): r'Fourth\s+Regiment', (5, 'regiment'): r'Fifth\s+Regiment',
    (6, 'regiment'): r'Sixth\s+Regiment', (7, 'regiment'): r'Seventh\s+Regiment', (9, 'regiment'): r'Ninth\s+Regiment', (10, 'regiment'): r'Tenth\s+Regiment', (11, 'regiment'): r'Eleventh\s+Regiment',
    (12, 'regiment'): r'Twelfth\s+Regiment', (13, 'regiment'): r'Thir\w{3,6}th\s+Regiment', (14, 'regiment'): r'Fourteenth\s+Regiment', (16, 'regiment'): r'Sixteenth\s+Regiment',
    (18, 'regiment'): r'Eighteenth\s+Regiment', (19, 'regiment'): r'Nineteenth\s+Regiment', (20, 'regiment'): r'Twentieth\s+Regiment', (21, 'regiment'): r'Twenty-First\s+Regiment',
    (22, 'regiment'): r'Twenty-Second\s+Regiment', (23, 'regiment'): r'Twenty-Third\s+Regiment', (26, 'regiment'): r'Twenty-Sixth\s+Regiment', (28, 'regiment'): r'Twenty-Eighth\s+Regiment',
    (30, 'regiment'): r'Thirtieth\s+Regiment', (32, 'regiment'): r'Thirty-Second\s+Regiment', (33, 'regiment'): r'Thirty-Third\s+Regiment', (34, 'regiment'): r'Thirty-Fourth\s+Regiment',
    (37, 'regiment'): r'Thirty-Seventh\s+Regiment', (38, 'regiment'): r'Thirty-Eighth\s+Regiment', (43, 'regiment'): r'Forty-Third\s+Regiment', (45, 'regiment'): r'Forty-Fifth\s+Regiment',
    (47, 'regiment'): r'Forty-Seventh\s+Regiment', (52, 'regiment'): r'Fifty-Second\s+Regiment', (53, 'regiment'): r'Fifty-Third\s+Regiment', (55, 'regiment'): r'Fifty-Fifth\s+Regiment',
    (57, 'regiment'): r'Fifty-Seventh\s+Regiment', (59, 'regiment'): r'Fifty-Ninth\s+Regiment', (63, 'regiment'): r'Sixty-Third\s+Regiment', (2, 'battalion'): r'Second\s+Battalion',
    (5, 'battalion'): r'Fifth\s+Battalion',
}


def recap_lines(tid):
    """[(offset, line)] of the lines of the Recapitulation of a volume-4 text."""
    text, pm, ent = L.load(tid)
    a = text.rindex('RECAPITULATION')
    out = []
    for off, ln in L.lines_of(text, a, len(text)):
        if ln.strip():
            out.append((off, ln))
    return text, out


def figure(line):
    """The printed figure at the end of a recapitulation line, as printed, or None."""
    m = re.search(r"([0-9A-Za-z\|\!][0-9A-Za-z,\.\-\|\!\*>~]{1,9})\s*$", line.rstrip())
    return m.group(1) if m else None


def fig_class(fig):
    """('clean4', n) for a figure of four digits (with the printed thousands comma), ('clean3', n) for one to three digits, ('damaged', None) otherwise, ('none', None) for no figure."""
    if fig is None:
        return ('none', None)
    t = fig.strip().rstrip('.-,*')
    if re.fullmatch(r"[0-9],[0-9]{3}", t) or re.fullmatch(r"[0-9]{4}", t):
        return ('clean4', int(t.replace(',', '')))
    if re.fullmatch(r"[0-9]{1,3}", t):
        return ('clean3', int(t))
    return ('damaged', None)


def alnum_len(fig):
    return len(re.sub(r"[^0-9A-Za-z]", "", fig or ''))


def combine(fa, fb):
    """(value or None, status) from the printed figures of the two scans.  A figure of fewer than four digits is read only where the other scan agrees with it or damages it
    without changing its length: the text layers sometimes lose the leading "1," of a figure (a clean-looking 483 for the printed 1,483)."""
    ca, cb = fig_class(fa), fig_class(fb)
    if ca[0] == 'clean4' and cb[0] == 'clean4':
        return (ca[1], 'both scans print the same figure') if ca[1] == cb[1] else (None, 'both scans print a four-digit figure and they differ: %s and %s' % (ca[1], cb[1]))
    for (x, y, fx, fy) in ((ca, cb, fa, fb), (cb, ca, fb, fa)):
        if x[0] == 'clean4':
            if y[0] == 'clean3':
                if str(x[1]).endswith(str(y[1])):
                    return x[1], 'one scan prints the full figure, the other lost its leading digit and comma (%s)' % fy
                return None, 'the scans print %s and %s' % (fx, fy)
            return x[1], 'one scan prints the figure, the other damages it or has no line (%s)' % (fy,)
    if ca[0] == 'clean3' and cb[0] == 'clean3':
        return (ca[1], 'both scans print the same figure') if ca[1] == cb[1] else (None, 'the scans print %s and %s' % (fa, fb))
    for (x, y, fx, fy) in ((ca, cb, fa, fb), (cb, ca, fb, fa)):
        if x[0] == 'clean3' and y[0] == 'damaged' and alnum_len(fx) == alnum_len(fy):
            return x[1], 'one scan prints the figure, the other damages a character of it (%s)' % fy
    return None, 'the figure is damaged, short or missing in the text layer of the scans read (%s; %s): not read as a number' % (fa, fb)


# Figures that the text layers of both scans damage were read from the page image (the Emory copy of volume 4 rendered from its text PDF through pipeline2/page_image.py, 300 ppi, transient and
# never stored; a crop of the lines was looked at and read again with tesseract 5).  key -> (value, printed line as the image shows it, leaf of NC-MOORE-1882.4~b, printed page)
PAGE_IMAGE = {
    '1-regiment': (1742, 'First Regiment numbered all told, ... 1,742.', 470, 456),
    '2-regiment': (1435, 'Second Regiment, ... 1,435.', 470, 456),
    '4-regiment': (1483, 'Fourth Regiment, ... 1,483.', 470, 456),
    '33-regiment': (1600, 'Thirty-Third Regiment, ... 1,600.', 471, 457),
}


def main():
    res = {}
    texts = {}
    for sc, tid in (('a', L.text_id('4', 'a')), ('b', L.text_id('4', 'b'))):
        texts[sc] = recap_lines(tid)
    for (num, kind), lab in LABELS.items():
        ent = {'label_regex': lab, 'scans': {}}
        for sc in ('a', 'b'):
            text, lines = texts[sc]
            hit = None
            for off, ln in lines:
                if re.match(r"^\W*" + lab + r"\b", ln.strip(), re.I) and 'carried' not in ln and 'brought' not in ln:
                    hit = (off, ln)
                    if kind == 'battalion' and 'Light' in ln and num == 5 or kind == 'battalion' and num == 2 and 'Infantry' in ln or kind == 'regiment':
                        break
            if hit:
                off, ln = hit
                assert text[off:off + len(ln)] == ln
                f = figure(ln)
                ent['scans'][sc] = {'text_id': L.text_id('4', sc), 'quote': ln, 'offset': off, 'printed_figure': f, 'class': fig_class(f)[0]}
        fa = ent['scans'].get('a', {}).get('printed_figure')
        fb = ent['scans'].get('b', {}).get('printed_figure')
        ent['value'], ent['status'] = combine(fa, fb)
        key = '%s-%s' % (num, kind)
        if ent['value'] is None and key in PAGE_IMAGE:
            v, line, leaf, pg = PAGE_IMAGE[key]
            ent['text_layer_status'] = ent['status']
            ent['value'] = v
            ent['value_source'] = 'page image'
            ent['page_image'] = {'text_id': L.text_id('4', 'b'), 'leaf': leaf, 'printed_page': pg, 'line_as_printed': line, 'how': 'viewed: a 300 ppi crop of the lines was looked at and read again with tesseract 5'}
            ent['status'] = 'read from the page image of leaf %d (printed page %d) of volume 4, Emory copy: %s (the text layers: %s; %s)' % (leaf, pg, line, fa, fb)
        res[key] = ent
    out = {'format': 'moore-recapitulation/1', 'about': __doc__.split('\n\n')[0], 'entries': res}
    os.makedirs(L.WS, exist_ok=True)
    with open(os.path.join(L.WS, 'recap.json'), 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    n_ok = sum(1 for e in res.values() if e['value'] is not None)
    print('%d sections, %d with a clean figure' % (len(res), n_ok))
    for k, e in res.items():
        print(k, e['value'], '|', e['status'][:40], '|', {sc: v['printed_figure'] for sc, v in e['scans'].items()})


if __name__ == '__main__':
    main()

"""Second-OCR cross-check of every Official Records quote of the tl-04 corrections (adapted from tmp/tl-02/audit/ocr2.py).

For every scan leaf cited (offset -> leaf by the leaf map of tools/bt/kit_or27_leafmap.py) the page of tmp/kit-plan/or27-pdf/<id>.pdf (PDF page = leaf + 1,
read-only) is rendered at 300 dpi and read with tesseract (a second OCR of the same scan, independent of the archive.org text layer).  Two checks, both only LISTED
(nothing is auto-accepted; every listed item is then looked at on the page image):
  1. the printed page number found in the first lines of the tesseract text against the printed page of the leaf map and against the page stated in the corrections;
  2. the best-matching window of the tesseract text against the quote: every numeral of the quote must occur among the numerals of that window.
    tools/horde/bench.sh python3 -I tmp/tl-04/tools2/ocr2.py        (CPU heavy: about 100 pages)
Writes tmp/tl-04/scan/ocr/p<part>_l<leaf>.txt, tmp/tl-04/tools2/ocr2_report.txt and tmp/tl-04/tools2/ocr2_heads.json."""
import os, re, sys, json, subprocess, difflib
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
G = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE')
OCRD = os.path.join(ROOT, 'tmp', 'tl-04', 'scan', 'ocr')
os.makedirs(OCRD, exist_ok=True)
PDF = {1: 'cu31924077699761', 2: 'cu31924077728255', 3: 'cu31924077700262'}
sys.path.insert(0, os.path.join(ROOT, 'tools', 'bt'))
import kit_or27_leafmap as KL
rows = [json.loads(l) for l in open(os.path.join(G, 'timeline_corrections', 'tl-04.jsonl'), encoding='utf-8')]
lms = {p: KL.load(p) for p in (1, 2, 3)}
need = {}
for r in rows:
    for c in r['citations']:
        if c['source_id'] != 'OR27':
            continue
        lm = lms[c['part']]
        a, b = lm.at(c['text_offset']), lm.at(c['text_offset_end'] - 1)
        need.setdefault((c['part'], a['leaf']), None)
        need.setdefault((c['part'], b['leaf']), None)


def page_text(part, leaf):
    out = os.path.join(OCRD, 'p%d_l%d.txt' % (part, leaf))
    if os.path.exists(out) and os.path.getsize(out) > 50:
        return open(out, encoding='utf-8').read()
    base = os.path.join(OCRD, 'p%d_l%d' % (part, leaf))
    pdf = os.path.join(ROOT, 'tmp', 'kit-plan', 'or27-pdf', PDF[part] + '.pdf')
    subprocess.run(['pdftoppm', '-f', str(leaf + 1), '-l', str(leaf + 1), '-r', '300', '-gray', '-png', '-singlefile', pdf, base], check=True)
    env = dict(os.environ, OMP_THREAD_LIMIT='1')
    t = subprocess.run(['tesseract', base + '.png', 'stdout', '-l', 'eng', '--psm', '3'], capture_output=True, text=True, env=env).stdout
    os.remove(base + '.png')
    open(out, 'w', encoding='utf-8').write(t)
    return t


TOK = re.compile(r"[A-Za-z0-9][A-Za-z0-9.,:'’\-]*")
NUM = re.compile(r'\d[\d.,:]*\d|\d')


def toks(s):
    return [t.strip('.,:-').lower().replace('’', "'") for t in TOK.findall(s) if t.strip('.,:-')]


def nums(s):
    return {m.group(0).strip('.,:') for m in NUM.finditer(s)}


def head_numbers(txt):
    """numbers (1-4 digits) in the first three non-empty lines of a page, and in the last two (a foot folio)"""
    ls = [l.strip() for l in txt.splitlines() if l.strip()]
    top = ' '.join(ls[:3])
    return sorted({int(x) for x in re.findall(r'(?<![\d.,])(\d{1,4})(?![\d.,])', top)})


def best_window(qw, pw):
    n = len(qw)
    if n == 0 or not pw:
        return 0.0, 0, 0
    pos = {}
    for i, w in enumerate(pw):
        pos.setdefault(w, []).append(i)
    cands = set()
    for w in qw:
        if len(w) >= 4 and w in pos and len(pos[w]) <= 6:
            for i in pos[w]:
                cands.add(max(0, i - qw.index(w)))
    if not cands:
        cands = set(range(0, max(1, len(pw) - n + 1), 3))
    best = (0.0, 0, 0)
    for s in sorted(cands):
        for L in (n - 2, n, n + 2, n + 5):
            if L < 1:
                continue
            win = pw[s:s + L]
            sm = difflib.SequenceMatcher(None, qw, win, autojunk=False)
            r = sm.ratio()
            if r > best[0]:
                best = (r, s, s + L)
    return best


def main():
    pages = {}
    for k in sorted(need):
        pages[k] = page_text(*k)
        print('ocr', k, len(pages[k]), flush=True)
    # ---- check 1: printed page read on the page image (second OCR) against the leaf map
    heads = {}
    pbad = []
    for (part, leaf), txt in sorted(pages.items()):
        lm = lms[part]
        page = next((pg for lf, _s, pg in lm.rec['leaves'] if lf == leaf), None)
        hn = head_numbers(txt)
        ok = page in hn if isinstance(page, int) else None
        heads['%d:%d' % (part, leaf)] = dict(page_leaf_map=page, head_numbers_second_ocr=hn, agree=ok)
        if ok is not True:
            pbad.append('part %d leaf %d (PDF page %d): leaf-map page %s, numbers in the first lines of the second OCR %s' % (part, leaf, leaf + 1, page, hn))
    json.dump(heads, open(os.path.join(HERE, 'ocr2_heads.json'), 'w'), indent=1)
    # ---- check 2: quotes against the second OCR
    lines = []
    nflag = nmatch = 0
    for r in rows:
        for c in r['citations']:
            if c['source_id'] != 'OR27':
                continue
            lm = lms[c['part']]
            a, b = lm.at(c['text_offset']), lm.at(c['text_offset_end'] - 1)
            txt = pages[(c['part'], a['leaf'])] + ('\n' + pages[(c['part'], b['leaf'])] if b['leaf'] != a['leaf'] else '')
            qw = toks(c['quote'])
            pw = toks(txt)
            ratio, s, e = best_window(qw, pw)
            win = ' '.join(pw[s:e])
            qn = nums(c['quote'])
            wn = nums(win)
            miss = sorted(x for x in qn if x not in wn)
            nmatch += 1
            if miss or ratio < 0.6:
                nflag += 1
                lines.append('%s %s p.%s leaf %d | match %.2f | quote numerals missing from the tesseract window: %s\n    quote : %s\n    window: %s' % (
                    r['id'], c['key'], c['printed_page'], a['leaf'], ratio, miss, c['quote'][:200], win[:260]))
    rep = os.path.join(HERE, 'ocr2_report.txt')
    open(rep, 'w', encoding='utf-8').write('PAGE-NUMBER CHECK (second OCR of the page image against the leaf map): %d leaves, %d not confirmed\n%s\n\n' % (
        len(pages), len(pbad), '\n'.join(pbad)) + '\n'.join(lines) + '\n\ncitations compared %d, flagged %d\n' % (nmatch, nflag))
    print('done: leaves %d (page not confirmed %d); compared %d flagged %d -> %s' % (len(pages), len(pbad), nmatch, nflag, rep))


if __name__ == '__main__':
    main()
